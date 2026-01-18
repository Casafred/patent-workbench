"""
Error handling and retry management for enhanced patent scraping.

This module implements comprehensive error handling, retry mechanisms,
and session management for robust patent data extraction.
"""

import asyncio
import time
import logging
from typing import Dict, List, Optional, Any, Callable, Union
from dataclasses import dataclass
from enum import Enum
from datetime import datetime, timedelta

from .config import ScrapingConfig
from .constants import ERROR_MESSAGES, RETRYABLE_STATUS_CODES, NOT_FOUND_STATUS_CODES

logger = logging.getLogger(__name__)


class ErrorType(Enum):
    """Classification of different error types."""
    NETWORK_ERROR = "network_error"
    TIMEOUT_ERROR = "timeout_error"
    PARSING_ERROR = "parsing_error"
    RATE_LIMIT_ERROR = "rate_limit_error"
    ANTI_DETECTION_ERROR = "anti_detection_error"
    BROWSER_ERROR = "browser_error"
    NOT_FOUND_ERROR = "not_found_error"
    UNKNOWN_ERROR = "unknown_error"


@dataclass
class ErrorInfo:
    """Information about an error occurrence."""
    error_type: ErrorType
    message: str
    timestamp: datetime
    patent_number: Optional[str] = None
    status_code: Optional[int] = None
    retry_count: int = 0
    is_retryable: bool = True
    context: Optional[Dict[str, Any]] = None


class ErrorHandlingManager:
    """Manages error handling, classification, and retry logic."""
    
    def __init__(self, config: ScrapingConfig):
        self.config = config
        self.error_history: List[ErrorInfo] = []
        self.session_errors: Dict[str, int] = {}
        self.last_error_time: Optional[datetime] = None
        self.consecutive_errors = 0
        self.total_errors = 0
    
    def classify_error(self, exception: Exception, status_code: Optional[int] = None, 
                      context: Optional[Dict[str, Any]] = None) -> ErrorType:
        """
        Classify an error based on exception type and context.
        
        Args:
            exception: The exception that occurred
            status_code: HTTP status code if applicable
            context: Additional context information
            
        Returns:
            ErrorType classification
        """
        error_message = str(exception).lower()
        
        # Check status code first
        if status_code:
            if status_code in NOT_FOUND_STATUS_CODES:
                return ErrorType.NOT_FOUND_ERROR
            elif status_code == 429:
                return ErrorType.RATE_LIMIT_ERROR
            elif status_code in RETRYABLE_STATUS_CODES:
                return ErrorType.NETWORK_ERROR
        
        # Check exception type and message
        if "timeout" in error_message or "timed out" in error_message:
            return ErrorType.TIMEOUT_ERROR
        elif "network" in error_message or "connection" in error_message:
            return ErrorType.NETWORK_ERROR
        elif "rate limit" in error_message or "too many requests" in error_message:
            return ErrorType.RATE_LIMIT_ERROR
        elif "captcha" in error_message or "bot" in error_message or "blocked" in error_message:
            return ErrorType.ANTI_DETECTION_ERROR
        elif "browser" in error_message or "playwright" in error_message:
            return ErrorType.BROWSER_ERROR
        elif "parse" in error_message or "json" in error_message or "html" in error_message:
            return ErrorType.PARSING_ERROR
        else:
            return ErrorType.UNKNOWN_ERROR
    
    def is_retryable_error(self, error_type: ErrorType, retry_count: int) -> bool:
        """
        Determine if an error should be retried.
        
        Args:
            error_type: Type of error
            retry_count: Current retry count
            
        Returns:
            True if the error should be retried
        """
        if retry_count >= self.config.max_retries:
            return False
        
        # Non-retryable errors
        if error_type in [ErrorType.NOT_FOUND_ERROR, ErrorType.PARSING_ERROR]:
            return False
        
        # Retryable errors with conditions
        if error_type == ErrorType.ANTI_DETECTION_ERROR:
            return retry_count < 2  # Limited retries for anti-detection
        
        if error_type == ErrorType.RATE_LIMIT_ERROR:
            return retry_count < 3  # More retries for rate limits
        
        # Default retryable errors
        return error_type in [
            ErrorType.NETWORK_ERROR,
            ErrorType.TIMEOUT_ERROR,
            ErrorType.BROWSER_ERROR,
            ErrorType.UNKNOWN_ERROR
        ]
    
    def calculate_retry_delay(self, error_type: ErrorType, retry_count: int) -> float:
        """
        Calculate delay before retry based on error type and retry count.
        
        Args:
            error_type: Type of error
            retry_count: Current retry count
            
        Returns:
            Delay in seconds
        """
        base_delays = self.config.retry_delays
        
        if retry_count >= len(base_delays):
            base_delay = base_delays[-1]
        else:
            base_delay = base_delays[retry_count]
        
        # Adjust delay based on error type
        multipliers = {
            ErrorType.RATE_LIMIT_ERROR: 3.0,
            ErrorType.ANTI_DETECTION_ERROR: 5.0,
            ErrorType.NETWORK_ERROR: 1.5,
            ErrorType.TIMEOUT_ERROR: 2.0,
            ErrorType.BROWSER_ERROR: 2.5,
            ErrorType.UNKNOWN_ERROR: 1.0
        }
        
        multiplier = multipliers.get(error_type, 1.0)
        return base_delay * multiplier
    
    def record_error(self, exception: Exception, patent_number: Optional[str] = None,
                    status_code: Optional[int] = None, retry_count: int = 0,
                    context: Optional[Dict[str, Any]] = None) -> ErrorInfo:
        """
        Record an error occurrence.
        
        Args:
            exception: The exception that occurred
            patent_number: Patent number being processed
            status_code: HTTP status code if applicable
            retry_count: Current retry count
            context: Additional context information
            
        Returns:
            ErrorInfo object with error details
        """
        error_type = self.classify_error(exception, status_code, context)
        is_retryable = self.is_retryable_error(error_type, retry_count)
        
        error_info = ErrorInfo(
            error_type=error_type,
            message=str(exception),
            timestamp=datetime.now(),
            patent_number=patent_number,
            status_code=status_code,
            retry_count=retry_count,
            is_retryable=is_retryable,
            context=context
        )
        
        # Update statistics
        self.error_history.append(error_info)
        self.last_error_time = error_info.timestamp
        self.total_errors += 1
        
        if not is_retryable or retry_count >= self.config.max_retries:
            self.consecutive_errors += 1
        
        # Track session errors
        if patent_number:
            self.session_errors[patent_number] = self.session_errors.get(patent_number, 0) + 1
        
        # Keep error history manageable
        if len(self.error_history) > 1000:
            self.error_history = self.error_history[-500:]
        
        logger.error(f"Error recorded: {error_type.value} for {patent_number or 'unknown'}: {exception}")
        
        return error_info
    
    def record_success(self, patent_number: Optional[str] = None) -> None:
        """
        Record a successful operation.
        
        Args:
            patent_number: Patent number that was successfully processed
        """
        self.consecutive_errors = 0
        
        # Reset session error count for this patent
        if patent_number and patent_number in self.session_errors:
            del self.session_errors[patent_number]
    
    async def execute_with_retry(self, operation: Callable, *args, **kwargs) -> Any:
        """
        Execute an operation with automatic retry logic.
        
        Args:
            operation: Async function to execute
            *args: Arguments for the operation
            **kwargs: Keyword arguments for the operation
            
        Returns:
            Result of the operation
            
        Raises:
            Exception: If all retries are exhausted
        """
        last_exception = None
        patent_number = kwargs.get('patent_number')
        
        for retry_count in range(self.config.max_retries + 1):
            try:
                result = await operation(*args, **kwargs)
                
                # Record success
                if patent_number:
                    self.record_success(patent_number)
                
                return result
                
            except Exception as e:
                last_exception = e
                
                # Record error
                error_info = self.record_error(
                    e, patent_number, retry_count=retry_count,
                    context={'operation': operation.__name__}
                )
                
                # Check if we should retry
                if not error_info.is_retryable or retry_count >= self.config.max_retries:
                    logger.error(f"Operation failed after {retry_count} retries: {e}")
                    break
                
                # Calculate and apply delay
                delay = self.calculate_retry_delay(error_info.error_type, retry_count)
                logger.warning(f"Retrying in {delay:.2f}s (attempt {retry_count + 1}/{self.config.max_retries})")
                
                await asyncio.sleep(delay)
        
        # All retries exhausted
        raise last_exception
    
    def get_error_statistics(self) -> Dict[str, Any]:
        """Get comprehensive error statistics."""
        recent_errors = [
            e for e in self.error_history 
            if datetime.now() - e.timestamp < timedelta(hours=1)
        ]
        
        error_type_counts = {}
        for error in recent_errors:
            error_type_counts[error.error_type.value] = error_type_counts.get(error.error_type.value, 0) + 1
        
        return {
            'total_errors': self.total_errors,
            'consecutive_errors': self.consecutive_errors,
            'recent_errors_count': len(recent_errors),
            'error_type_distribution': error_type_counts,
            'session_errors': dict(self.session_errors),
            'last_error_time': self.last_error_time.isoformat() if self.last_error_time else None,
            'error_rate': len(recent_errors) / 60.0 if recent_errors else 0.0  # errors per minute
        }
    
    def is_session_healthy(self) -> bool:
        """Check if the current session is healthy."""
        # Too many consecutive errors
        if self.consecutive_errors >= 10:
            return False
        
        # High error rate in recent period
        recent_errors = [
            e for e in self.error_history 
            if datetime.now() - e.timestamp < timedelta(minutes=10)
        ]
        
        if len(recent_errors) >= 20:  # More than 20 errors in 10 minutes
            return False
        
        # Check for specific error patterns
        anti_detection_errors = [
            e for e in recent_errors 
            if e.error_type == ErrorType.ANTI_DETECTION_ERROR
        ]
        
        if len(anti_detection_errors) >= 3:  # Multiple anti-detection errors
            return False
        
        return True
    
    def get_recovery_suggestions(self) -> List[str]:
        """Get suggestions for recovering from current error state."""
        suggestions = []
        
        recent_errors = [
            e for e in self.error_history 
            if datetime.now() - e.timestamp < timedelta(minutes=30)
        ]
        
        if not recent_errors:
            return ["Session is healthy"]
        
        # Analyze error patterns
        error_types = [e.error_type for e in recent_errors]
        
        if ErrorType.RATE_LIMIT_ERROR in error_types:
            suggestions.append("Increase delays between requests")
            suggestions.append("Reduce concurrent request limit")
        
        if ErrorType.ANTI_DETECTION_ERROR in error_types:
            suggestions.append("Rotate user agents and browser fingerprints")
            suggestions.append("Use different IP address or proxy")
            suggestions.append("Increase human behavior simulation")
        
        if ErrorType.NETWORK_ERROR in error_types:
            suggestions.append("Check network connectivity")
            suggestions.append("Try different DNS servers")
        
        if ErrorType.TIMEOUT_ERROR in error_types:
            suggestions.append("Increase timeout values")
            suggestions.append("Check target server availability")
        
        if ErrorType.BROWSER_ERROR in error_types:
            suggestions.append("Restart browser instances")
            suggestions.append("Clear browser cache and cookies")
        
        if self.consecutive_errors >= 5:
            suggestions.append("Consider taking a longer break")
            suggestions.append("Switch to different extraction strategy")
        
        return suggestions or ["Monitor error patterns and adjust strategy"]
    
    def reset_error_state(self) -> None:
        """Reset error tracking state."""
        logger.info("Resetting error handler state")
        self.consecutive_errors = 0
        self.session_errors.clear()
        self.last_error_time = None
        
        # Keep only recent error history
        cutoff_time = datetime.now() - timedelta(hours=1)
        self.error_history = [
            e for e in self.error_history 
            if e.timestamp > cutoff_time
        ]
    
    def should_abort_session(self) -> bool:
        """Determine if the current session should be aborted."""
        # Too many consecutive errors
        if self.consecutive_errors >= 15:
            return True
        
        # High rate of anti-detection errors
        recent_anti_detection = [
            e for e in self.error_history 
            if (datetime.now() - e.timestamp < timedelta(minutes=15) and 
                e.error_type == ErrorType.ANTI_DETECTION_ERROR)
        ]
        
        if len(recent_anti_detection) >= 5:
            return True
        
        return False


class SessionManager:
    """Manages scraping sessions and handles session-level errors."""
    
    def __init__(self, config: ScrapingConfig, error_handler: ErrorHandlingManager):
        self.config = config
        self.error_handler = error_handler
        self.session_start_time = datetime.now()
        self.session_id = f"session_{self.session_start_time.strftime('%Y%m%d_%H%M%S')}"
        self.is_active = True
        self.last_activity_time = datetime.now()
    
    def update_activity(self) -> None:
        """Update last activity timestamp."""
        self.last_activity_time = datetime.now()
    
    def is_session_expired(self) -> bool:
        """Check if session has expired due to inactivity."""
        max_idle_time = timedelta(minutes=30)  # 30 minutes max idle
        return datetime.now() - self.last_activity_time > max_idle_time
    
    def get_session_duration(self) -> timedelta:
        """Get current session duration."""
        return datetime.now() - self.session_start_time
    
    def should_refresh_session(self) -> bool:
        """Determine if session should be refreshed."""
        # Refresh after 2 hours
        max_session_time = timedelta(hours=2)
        
        return (
            self.get_session_duration() > max_session_time or
            self.is_session_expired() or
            not self.error_handler.is_session_healthy()
        )
    
    async def refresh_session(self) -> None:
        """Refresh the current session."""
        logger.info(f"Refreshing session {self.session_id}")
        
        # Reset error state
        self.error_handler.reset_error_state()
        
        # Create new session
        self.session_start_time = datetime.now()
        self.session_id = f"session_{self.session_start_time.strftime('%Y%m%d_%H%M%S')}"
        self.last_activity_time = datetime.now()
        self.is_active = True
        
        # Add cooldown period
        await asyncio.sleep(5.0)
        
        logger.info(f"New session started: {self.session_id}")
    
    def get_session_info(self) -> Dict[str, Any]:
        """Get current session information."""
        return {
            'session_id': self.session_id,
            'start_time': self.session_start_time.isoformat(),
            'duration': str(self.get_session_duration()),
            'last_activity': self.last_activity_time.isoformat(),
            'is_active': self.is_active,
            'is_expired': self.is_session_expired(),
            'should_refresh': self.should_refresh_session(),
            'error_stats': self.error_handler.get_error_statistics()
        }