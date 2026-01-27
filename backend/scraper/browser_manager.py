"""Browser management for enhanced patent scraping."""

import asyncio
import logging
from typing import Optional, Dict, Any

from .config import ScrapingConfig

logger = logging.getLogger(__name__)


class PlaywrightBrowserManager:
    """Manages Playwright browser instances and contexts."""
    
    def __init__(self, config: ScrapingConfig):
        self.config = config
        self._is_initialized = False
    
    async def initialize(self) -> None:
        """Initialize Playwright and browser."""
        try:
            # Import Playwright here to avoid import issues
            from playwright.async_api import async_playwright
            from .anti_detection import AntiDetectionManager
            
            self.anti_detection = AntiDetectionManager(self.config)
            
            logger.info("Initializing Playwright browser manager")
            
            # Start Playwright
            self.playwright = await async_playwright().start()
            
            # Launch browser
            await self._launch_browser()
            
            # Create context
            await self._create_context()
            
            self._is_initialized = True
            logger.info("Browser manager initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize browser manager: {e}")
            await self.cleanup()
            raise
    
    async def _launch_browser(self) -> None:
        """Launch the browser with appropriate options."""
        browser_type = getattr(self.playwright, self.config.browser_type)
        
        launch_options = {
            "headless": self.config.headless,
            "args": self.anti_detection.get_browser_launch_args()
        }
        
        try:
            self.browser = await browser_type.launch(**launch_options)
            logger.info(f"Browser launched: {self.config.browser_type}")
            
        except Exception as e:
            logger.error(f"Failed to launch browser: {e}")
            raise
    
    async def _create_context(self) -> None:
        """Create browser context with anti-detection settings."""
        if not self.browser:
            raise RuntimeError("Browser not initialized")
        
        context_options = self.anti_detection.get_context_options()
        
        self.context = await self.browser.new_context(**context_options)
        
        logger.info("Browser context created with anti-detection settings")
    
    async def get_page(self):
        """Get a new page or reuse existing one."""
        if not self._is_initialized:
            await self.initialize()
        
        if not self.context:
            raise RuntimeError("Browser context not available")
        
        # Create new page if none exists or current page is closed
        if not hasattr(self, 'current_page') or self.current_page.is_closed():
            self.current_page = await self.context.new_page()
            
            # Apply stealth settings
            await self.anti_detection.apply_stealth_settings(self.current_page)
            
            logger.debug("New page created")
        
        return self.current_page
    
    async def navigate_to_patent(self, patent_number: str):
        """Navigate to a patent page."""
        page = await self.get_page()
        
        url = f"https://patents.google.com/patent/{patent_number}"
        
        try:
            # Navigate with timeout
            await page.goto(
                url, 
                timeout=self.config.navigation_timeout,
                wait_until="domcontentloaded"
            )
            
            # Wait for page to be fully loaded
            await page.wait_for_load_state("networkidle", timeout=self.config.page_timeout)
            
            # Simulate human behavior
            await self.anti_detection.simulate_human_behavior(page)
            
            logger.debug(f"Successfully navigated to {patent_number}")
            return page
            
        except Exception as e:
            logger.error(f"Failed to navigate to {patent_number}: {e}")
            raise
    
    async def get_page_content(self, page) -> str:
        """Get the full HTML content of a page."""
        try:
            # Wait for any dynamic content to load
            await asyncio.sleep(1.0)
            
            # Get page content
            content = await page.content()
            
            logger.debug(f"Retrieved page content: {len(content)} characters")
            return content
            
        except Exception as e:
            logger.error(f"Failed to get page content: {e}")
            raise
    
    async def cleanup(self) -> None:
        """Clean up browser resources."""
        logger.info("Cleaning up browser manager")
        
        try:
            if hasattr(self, 'current_page') and not self.current_page.is_closed():
                await self.current_page.close()
            
            if hasattr(self, 'context') and self.context:
                await self.context.close()
            
            if hasattr(self, 'browser') and self.browser:
                await self.browser.close()
            
            if hasattr(self, 'playwright') and self.playwright:
                await self.playwright.stop()
            
            self._is_initialized = False
            logger.info("Browser cleanup completed")
            
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
    
    def is_healthy(self) -> bool:
        """Check if browser manager is in a healthy state."""
        return (
            self._is_initialized and
            hasattr(self, 'browser') and self.browser is not None and
            hasattr(self, 'context') and self.context is not None
        )
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform comprehensive health check."""
        health_info = {
            "initialized": self._is_initialized,
            "browser_available": hasattr(self, 'browser') and self.browser is not None,
            "context_available": hasattr(self, 'context') and self.context is not None,
            "overall_healthy": False
        }
        
        try:
            if self.is_healthy():
                health_info["test_navigation"] = True
                health_info["overall_healthy"] = True
            else:
                health_info["test_navigation"] = False
                
        except Exception as e:
            health_info["test_navigation"] = False
            health_info["error"] = str(e)
        
        return health_info
    
    async def refresh_context(self) -> None:
        """Refresh the browser context with new anti-detection settings."""
        logger.info("Refreshing browser context")
        
        try:
            # Close existing context
            if hasattr(self, 'context') and self.context:
                await self.context.close()
            
            # Close existing page
            if hasattr(self, 'current_page'):
                delattr(self, 'current_page')
            
            # Create new context
            await self._create_context()
            
            logger.info("Browser context refreshed successfully")
            
        except Exception as e:
            logger.error(f"Failed to refresh context: {e}")
            raise
