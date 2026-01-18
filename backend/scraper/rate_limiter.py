"""
Rate limiting manager for enhanced patent scraping.

This module implements intelligent rate limiting to avoid overwhelming target servers
and prevent rate limit errors.
"""

import asyncio
import time
import random
import logging
from typing import Optional, Dict, Any
from asyncio import Queue, Semaphore
from dataclasses import dataclass
from datetime import datetime, timedelta

from .config import ScrapingConfig

logger = logging.getLogger(__name__)


@dataclass
class RequestInfo:
    """Information about a request for rate limiting."""
    timestamp: float
    url: str
    success: bool
    response_time: float
    status_code: Optional[int] = None


class RateLimitingManager:
    """Manages request rate limiting and throttling."""
    
    def __init__(self, config: ScrapingConfig):
        self.config = config
        self.request_queue = Queue()
        self.semaphore = Semaphore(config.max_concurrent_requests)
        self.last_request_time = 0.0
        self.request_history: list[RequestInfo] = []
        self.adaptive_delay = config.min_delay
        self.consecutive_failures = 0
        self.total_requests = 0
        self._lock = asyncio.Lock()
    
    async def acquire_request_slot(self) -> None:
        """
        Acquire a request slot with rate limiting.
        
        This method implements:
        - Concurrent request limiting
        - Adaptive delay based on server response
        - Exponential backoff on failures
        """
        # Wait for available slot
        await self.semaphore.acquire()
        
        try:
            # Calculate and apply delay
            delay = await self._calculate_delay()
            if delay > 0:
                logger.debug(f"Applying delay: {delay:.2f}s")
                await asyncio.sleep(delay)
            
            # Update last request time
            async with self._lock:
                self.last_request_time = time.time()
                self.total_requests += 1
                
        except Exception as e:
            # Release semaphore if something goes wrong
            self.semaphore.release()
            raise e
    
    async def release_request_slot(self, request_info: RequestInfo) -> None:
        """
        Release a request slot and update rate limiting state.
        
        Args:
            request_info: Information about the completed request
        """
        try:
            async with self._lock:
                # Add to request history
                self.request_history.append(request_info)
                
                # Keep only recent history (last 100 requests)
                if len(self.request_history) > 100:
                    self.request_history = self.request_history[-100:]
                
                # Update adaptive delay based on response
                await self._update_adaptive_delay(request_info)
                
                # Update failure counter
                if request_info.success:
                    self.consecutive_failures = 0
                else:
                    self.consecutive_failures += 1
                
                logger.debug(f"Request completed: {request_info.url}, "
                           f"Success: {request_info.success}, "
                           f"Response time: {request_info.response_time:.2f}s")
        
        finally:
            # Always release the semaphore
            self.semaphore.release()
    
    async def _calculate_delay(self) -> float:
        """Calculate the delay before next request."""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        # Base delay from configuration
        base_delay = self.adaptive_delay
        
        # Add random jitter (±20%)
        jitter = random.uniform(-0.2, 0.2) * base_delay
        calculated_delay = base_delay + jitter
        
        # Apply exponential backoff for consecutive failures
        if self.consecutive_failures > 0:
            backoff_multiplier = min(2 ** self.consecutive_failures, 16)  # Cap at 16x
            calculated_delay *= backoff_multiplier
            logger.warning(f"Applying backoff for {self.consecutive_failures} failures: "
                         f"{calculated_delay:.2f}s")
        
        # Ensure minimum time between requests
        if time_since_last < calculated_delay:
            return calculated_delay - time_since_last
        
        return 0.0
    
    async def _update_adaptive_delay(self, request_info: RequestInfo) -> None:
        """Update adaptive delay based on server response."""
        # Analyze recent request patterns
        recent_requests = [r for r in self.request_history 
                          if time.time() - r.timestamp < 60]  # Last minute
        
        if len(recent_requests) < 5:
            return  # Not enough data
        
        # Calculate success rate
        success_rate = sum(1 for r in recent_requests if r.success) / len(recent_requests)
        
        # Calculate average response time
        avg_response_time = sum(r.response_time for r in recent_requests) / len(recent_requests)
        
        # Adjust delay based on performance
        if success_rate < 0.8:  # Less than 80% success
            # Increase delay
            self.adaptive_delay = min(self.adaptive_delay * 1.5, self.config.max_delay)
            logger.info(f"Increasing delay due to low success rate ({success_rate:.1%}): "
                       f"{self.adaptive_delay:.2f}s")
        
        elif success_rate > 0.95 and avg_response_time < 2.0:  # High success, fast response
            # Decrease delay slightly
            self.adaptive_delay = max(self.adaptive_delay * 0.9, self.config.min_delay)
            logger.debug(f"Decreasing delay due to good performance: {self.adaptive_delay:.2f}s")
        
        # Handle specific HTTP status codes
        if request_info.status_code:
            if request_info.status_code == 429:  # Too Many Requests
                self.adaptive_delay = min(self.adaptive_delay * 2.0, self.config.max_delay)
                logger.warning(f"Rate limit detected (429), increasing delay: {self.adaptive_delay:.2f}s")
            
            elif request_info.status_code >= 500:  # Server errors
                self.adaptive_delay = min(self.adaptive_delay * 1.3, self.config.max_delay)
                logger.warning(f"Server error ({request_info.status_code}), increasing delay: "
                             f"{self.adaptive_delay:.2f}s")
    
    def get_current_stats(self) -> Dict[str, Any]:
        """Get current rate limiting statistics."""
        recent_requests = [r for r in self.request_history 
                          if time.time() - r.timestamp < 300]  # Last 5 minutes
        
        if not recent_requests:
            return {
                "total_requests": self.total_requests,
                "current_delay": self.adaptive_delay,
                "consecutive_failures": self.consecutive_failures,
                "available_slots": self.semaphore._value,
                "recent_success_rate": 0.0,
                "recent_avg_response_time": 0.0,
                "requests_per_minute": 0.0
            }
        
        success_rate = sum(1 for r in recent_requests if r.success) / len(recent_requests)
        avg_response_time = sum(r.response_time for r in recent_requests) / len(recent_requests)
        requests_per_minute = len(recent_requests) / 5.0  # 5-minute window
        
        return {
            "total_requests": self.total_requests,
            "current_delay": self.adaptive_delay,
            "consecutive_failures": self.consecutive_failures,
            "available_slots": self.semaphore._value,
            "recent_success_rate": success_rate,
            "recent_avg_response_time": avg_response_time,
            "requests_per_minute": requests_per_minute,
            "recent_requests_count": len(recent_requests)
        }
    
    def is_healthy(self) -> bool:
        """Check if the rate limiter is in a healthy state."""
        stats = self.get_current_stats()
        
        # Consider unhealthy if:
        # - Too many consecutive failures
        # - Success rate too low
        # - Delay at maximum
        
        if self.consecutive_failures >= 5:
            return False
        
        if stats["recent_success_rate"] < 0.5 and stats["recent_requests_count"] >= 10:
            return False
        
        if self.adaptive_delay >= self.config.max_delay:
            return False
        
        return True
    
    async def wait_for_healthy_state(self, timeout: float = 60.0) -> bool:
        """
        Wait for the rate limiter to return to a healthy state.
        
        Args:
            timeout: Maximum time to wait in seconds
            
        Returns:
            True if healthy state achieved, False if timeout
        """
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            if self.is_healthy():
                return True
            
            # Wait before checking again
            await asyncio.sleep(5.0)
        
        return False
    
    def reset_adaptive_delay(self) -> None:
        """Reset adaptive delay to minimum value."""
        logger.info(f"Resetting adaptive delay from {self.adaptive_delay:.2f}s to {self.config.min_delay:.2f}s")
        self.adaptive_delay = self.config.min_delay
        self.consecutive_failures = 0
    
    async def emergency_cooldown(self, duration: float = 30.0) -> None:
        """
        Apply emergency cooldown period.
        
        Args:
            duration: Cooldown duration in seconds
        """
        logger.warning(f"Applying emergency cooldown for {duration}s")
        
        # Temporarily increase delay to maximum
        original_delay = self.adaptive_delay
        self.adaptive_delay = self.config.max_delay
        
        # Wait for cooldown period
        await asyncio.sleep(duration)
        
        # Reset to original delay
        self.adaptive_delay = original_delay
        self.consecutive_failures = 0
        
        logger.info("Emergency cooldown completed")
    
    async def __aenter__(self):
        """Async context manager entry."""
        await self.acquire_request_slot()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        # Create request info based on exception
        success = exc_type is None
        request_info = RequestInfo(
            timestamp=time.time(),
            url="context_manager",
            success=success,
            response_time=0.0,
            status_code=None
        )
        
        await self.release_request_slot(request_info)