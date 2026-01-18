"""
Enhanced Patent Scraper - Main Controller

This module provides the main interface for the enhanced patent scraping system,
coordinating all components to provide robust patent data extraction.
"""

import asyncio
import logging
import time
from typing import List, Optional, Dict, Any, Union
from datetime import datetime

from .config import ScrapingConfig
from .models import PatentData, PatentResult, ScrapingStats, BatchRequest
from .browser_manager import PlaywrightBrowserManager
from .anti_detection import AntiDetectionManager
from .rate_limiter import RateLimitingManager, RequestInfo
from .extractors import DataExtractionEngine
from .error_handler import ErrorHandlingManager, SessionManager

logger = logging.getLogger(__name__)


class EnhancedPatentScraper:
    """
    Main controller for enhanced patent scraping.
    
    Coordinates all components to provide robust, scalable patent data extraction
    with anti-detection, rate limiting, error handling, and retry mechanisms.
    """
    
    def __init__(self, config: Optional[ScrapingConfig] = None):
        """
        Initialize the enhanced patent scraper.
        
        Args:
            config: Scraping configuration, uses default if None
        """
        self.config = config or ScrapingConfig.get_default_config()
        
        # Validate configuration
        if not self.config.is_valid():
            issues = self.config.validate()
            raise ValueError(f"Invalid configuration: {issues}")
        
        # Initialize components
        self.browser_manager = PlaywrightBrowserManager(self.config)
        self.anti_detection = AntiDetectionManager(self.config)
        self.rate_limiter = RateLimitingManager(self.config)
        self.data_extractor = DataExtractionEngine()
        self.error_handler = ErrorHandlingManager(self.config)
        self.session_manager = SessionManager(self.config, self.error_handler)
        
        # State tracking
        self._is_initialized = False
        self._total_requests = 0
        self._session_stats = ScrapingStats()
        
        logger.info("Enhanced patent scraper initialized")
    
    async def initialize(self) -> None:
        """Initialize all components."""
        if self._is_initialized:
            return
        
        try:
            logger.info("Initializing enhanced patent scraper")
            
            # Initialize browser manager
            await self.browser_manager.initialize()
            
            self._is_initialized = True
            logger.info("Enhanced patent scraper ready")
            
        except Exception as e:
            logger.error(f"Failed to initialize scraper: {e}")
            await self.cleanup()
            raise
    
    async def scrape_patent(self, patent_number: str) -> PatentResult:
        """
        Scrape data for a single patent.
        
        Args:
            patent_number: Patent number to scrape
            
        Returns:
            PatentResult with scraped data or error information
        """
        if not self._is_initialized:
            await self.initialize()
        
        start_time = time.time()
        self._total_requests += 1
        
        # Update session activity
        self.session_manager.update_activity()
        
        # Check if session should be refreshed
        if self.session_manager.should_refresh_session():
            await self._refresh_session()
        
        try:
            # Execute with retry logic
            result = await self.error_handler.execute_with_retry(
                self._scrape_single_patent,
                patent_number=patent_number
            )
            
            # Update statistics
            processing_time = time.time() - start_time
            result.processing_time = processing_time
            self._session_stats.update(result)
            
            return result
            
        except Exception as e:
            # Create error result
            processing_time = time.time() - start_time
            
            result = PatentResult(
                patent_number=patent_number,
                success=False,
                error=str(e),
                processing_time=processing_time,
                retry_count=self.error_handler.session_errors.get(patent_number, 0)
            )
            
            self._session_stats.update(result)
            return result
    
    async def _scrape_single_patent(self, patent_number: str) -> PatentResult:
        """
        Internal method to scrape a single patent with rate limiting.
        
        Args:
            patent_number: Patent number to scrape
            
        Returns:
            PatentResult with scraped data
        """
        start_time = time.time()
        
        # Acquire rate limiting slot
        async with self.rate_limiter:
            try:
                # Navigate to patent page
                page = await self.browser_manager.navigate_to_patent(patent_number)
                
                # Get page content
                page_content = await self.browser_manager.get_page_content(page)
                
                # Extract patent data
                patent_data = self.data_extractor.extract_patent_data(patent_number, page_content)
                
                if patent_data and patent_data.is_valid():
                    # Success
                    processing_time = time.time() - start_time
                    
                    # Record successful request for rate limiting
                    request_info = RequestInfo(
                        timestamp=time.time(),
                        url=f"https://patents.google.com/patent/{patent_number}",
                        success=True,
                        response_time=processing_time,
                        status_code=200
                    )
                    await self.rate_limiter.release_request_slot(request_info)
                    
                    return PatentResult(
                        patent_number=patent_number,
                        success=True,
                        data=patent_data,
                        processing_time=processing_time
                    )
                else:
                    # Data extraction failed
                    raise Exception("Failed to extract valid patent data")
                    
            except Exception as e:
                # Record failed request for rate limiting
                processing_time = time.time() - start_time
                
                request_info = RequestInfo(
                    timestamp=time.time(),
                    url=f"https://patents.google.com/patent/{patent_number}",
                    success=False,
                    response_time=processing_time,
                    status_code=None
                )
                await self.rate_limiter.release_request_slot(request_info)
                
                raise e
    
    async def scrape_patents_batch(self, patent_numbers: List[str], 
                                 progress_callback: Optional[callable] = None) -> List[PatentResult]:
        """
        Scrape multiple patents in batch.
        
        Args:
            patent_numbers: List of patent numbers to scrape
            progress_callback: Optional callback for progress updates
            
        Returns:
            List of PatentResult objects
        """
        if not patent_numbers:
            return []
        
        logger.info(f"Starting batch scraping of {len(patent_numbers)} patents")
        
        results = []
        
        for i, patent_number in enumerate(patent_numbers):
            try:
                # Check if we should abort the session
                if self.error_handler.should_abort_session():
                    logger.warning("Aborting session due to too many errors")
                    break
                
                # Scrape individual patent
                result = await self.scrape_patent(patent_number)
                results.append(result)
                
                # Progress callback
                if progress_callback:
                    progress_callback(i + 1, len(patent_numbers), result)
                
                # Log progress
                if (i + 1) % 10 == 0:
                    success_rate = self._session_stats.get_success_rate()
                    logger.info(f"Progress: {i + 1}/{len(patent_numbers)} ({success_rate:.1f}% success)")
                
            except Exception as e:
                logger.error(f"Unexpected error in batch processing: {e}")
                
                # Create error result
                error_result = PatentResult(
                    patent_number=patent_number,
                    success=False,
                    error=str(e)
                )
                results.append(error_result)
        
        # Finalize statistics
        self._session_stats.finish()
        
        logger.info(f"Batch scraping completed: {len(results)} results")
        return results
    
    async def scrape_patents_from_request(self, batch_request: BatchRequest) -> Dict[str, Any]:
        """
        Scrape patents from a batch request object.
        
        Args:
            batch_request: BatchRequest with patent numbers and configuration
            
        Returns:
            Dictionary with results and metadata
        """
        # Validate request
        if not batch_request.is_valid():
            issues = batch_request.validate()
            raise ValueError(f"Invalid batch request: {issues}")
        
        logger.info(f"Processing batch request: {batch_request.request_id}")
        
        # Apply any custom configuration from request
        if batch_request.config:
            await self._apply_runtime_config(batch_request.config)
        
        # Track progress
        progress_data = {
            'completed': 0,
            'total': len(batch_request.patent_numbers),
            'current_patent': None,
            'success_count': 0,
            'error_count': 0
        }
        
        def progress_callback(completed: int, total: int, result: PatentResult):
            progress_data['completed'] = completed
            progress_data['current_patent'] = result.patent_number
            if result.success:
                progress_data['success_count'] += 1
            else:
                progress_data['error_count'] += 1
        
        # Execute batch scraping
        results = await self.scrape_patents_batch(
            batch_request.patent_numbers,
            progress_callback
        )
        
        # Prepare response
        response = {
            'request_id': batch_request.request_id,
            'timestamp': datetime.now().isoformat(),
            'results': [result.to_dict() for result in results],
            'statistics': self._session_stats.to_dict(),
            'progress': progress_data,
            'session_info': self.session_manager.get_session_info(),
            'rate_limiter_stats': self.rate_limiter.get_current_stats(),
            'error_stats': self.error_handler.get_error_statistics()
        }
        
        return response
    
    async def _apply_runtime_config(self, config_updates: Dict[str, Any]) -> None:
        """Apply runtime configuration updates."""
        logger.info(f"Applying runtime configuration updates: {config_updates}")
        
        # Update rate limiting settings
        if 'min_delay' in config_updates:
            self.rate_limiter.config.min_delay = config_updates['min_delay']
        if 'max_delay' in config_updates:
            self.rate_limiter.config.max_delay = config_updates['max_delay']
        if 'max_concurrent_requests' in config_updates:
            # This would require recreating the semaphore
            logger.warning("Cannot update max_concurrent_requests at runtime")
    
    async def _refresh_session(self) -> None:
        """Refresh the scraping session."""
        logger.info("Refreshing scraping session")
        
        try:
            # Refresh session manager
            await self.session_manager.refresh_session()
            
            # Refresh browser context
            await self.browser_manager.refresh_context()
            
            # Reset rate limiter adaptive delay
            self.rate_limiter.reset_adaptive_delay()
            
            logger.info("Session refresh completed")
            
        except Exception as e:
            logger.error(f"Failed to refresh session: {e}")
            raise
    
    async def get_health_status(self) -> Dict[str, Any]:
        """Get comprehensive health status of all components."""
        health_status = {
            'timestamp': datetime.now().isoformat(),
            'overall_healthy': False,
            'components': {}
        }
        
        try:
            # Browser manager health
            browser_health = await self.browser_manager.health_check()
            health_status['components']['browser_manager'] = browser_health
            
            # Rate limiter health
            rate_limiter_healthy = self.rate_limiter.is_healthy()
            health_status['components']['rate_limiter'] = {
                'healthy': rate_limiter_healthy,
                'stats': self.rate_limiter.get_current_stats()
            }
            
            # Error handler health
            session_healthy = self.error_handler.is_session_healthy()
            health_status['components']['error_handler'] = {
                'healthy': session_healthy,
                'stats': self.error_handler.get_error_statistics(),
                'suggestions': self.error_handler.get_recovery_suggestions()
            }
            
            # Session manager health
            session_info = self.session_manager.get_session_info()
            health_status['components']['session_manager'] = session_info
            
            # Overall health
            health_status['overall_healthy'] = (
                browser_health.get('overall_healthy', False) and
                rate_limiter_healthy and
                session_healthy and
                session_info.get('is_active', False)
            )
            
        except Exception as e:
            health_status['error'] = str(e)
            logger.error(f"Error getting health status: {e}")
        
        return health_status
    
    async def get_statistics(self) -> Dict[str, Any]:
        """Get comprehensive scraping statistics."""
        return {
            'session_stats': self._session_stats.to_dict(),
            'total_requests': self._total_requests,
            'rate_limiter_stats': self.rate_limiter.get_current_stats(),
            'error_stats': self.error_handler.get_error_statistics(),
            'session_info': self.session_manager.get_session_info()
        }
    
    async def cleanup(self) -> None:
        """Clean up all resources."""
        logger.info("Cleaning up enhanced patent scraper")
        
        try:
            # Finalize statistics
            if self._session_stats.end_time is None:
                self._session_stats.finish()
            
            # Cleanup browser manager
            await self.browser_manager.cleanup()
            
            self._is_initialized = False
            logger.info("Enhanced patent scraper cleanup completed")
            
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
    
    async def __aenter__(self):
        """Async context manager entry."""
        await self.initialize()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.cleanup()


# Convenience functions for easy usage

async def scrape_single_patent(patent_number: str, config: Optional[ScrapingConfig] = None) -> PatentResult:
    """
    Convenience function to scrape a single patent.
    
    Args:
        patent_number: Patent number to scrape
        config: Optional scraping configuration
        
    Returns:
        PatentResult with scraped data
    """
    async with EnhancedPatentScraper(config) as scraper:
        return await scraper.scrape_patent(patent_number)


async def scrape_multiple_patents(patent_numbers: List[str], 
                                config: Optional[ScrapingConfig] = None,
                                progress_callback: Optional[callable] = None) -> List[PatentResult]:
    """
    Convenience function to scrape multiple patents.
    
    Args:
        patent_numbers: List of patent numbers to scrape
        config: Optional scraping configuration
        progress_callback: Optional progress callback
        
    Returns:
        List of PatentResult objects
    """
    async with EnhancedPatentScraper(config) as scraper:
        return await scraper.scrape_patents_batch(patent_numbers, progress_callback)