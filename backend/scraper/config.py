"""
Configuration classes for the enhanced patent scraper.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any
import os


@dataclass
class ScrapingConfig:
    """Configuration for the enhanced patent scraper."""
    
    # Browser configuration
    headless: bool = True
    browser_type: str = "chromium"  # chromium, firefox, webkit
    
    # Anti-detection configuration
    user_agent_rotation: bool = True
    viewport_randomization: bool = True
    javascript_enabled: bool = True
    
    # Rate limiting configuration
    min_delay: float = 2.0  # Minimum delay between requests (seconds)
    max_delay: float = 5.0  # Maximum delay between requests (seconds)
    max_concurrent_requests: int = 3  # Maximum concurrent requests
    
    # Retry configuration
    max_retries: int = 3
    retry_delays: List[float] = field(default_factory=lambda: [1.0, 2.0, 4.0])
    
    # Timeout configuration
    page_timeout: int = 30000  # Page load timeout (milliseconds)
    navigation_timeout: int = 30000  # Navigation timeout (milliseconds)
    
    # Logging configuration
    log_level: str = "INFO"
    log_file: str = "patent_scraper.log"
    
    @classmethod
    def from_env(cls) -> 'ScrapingConfig':
        """Create configuration from environment variables."""
        return cls(
            headless=os.getenv('SCRAPER_HEADLESS', 'true').lower() == 'true',
            browser_type=os.getenv('SCRAPER_BROWSER_TYPE', 'chromium'),
            user_agent_rotation=os.getenv('SCRAPER_USER_AGENT_ROTATION', 'true').lower() == 'true',
            viewport_randomization=os.getenv('SCRAPER_VIEWPORT_RANDOMIZATION', 'true').lower() == 'true',
            min_delay=float(os.getenv('SCRAPER_MIN_DELAY', '2.0')),
            max_delay=float(os.getenv('SCRAPER_MAX_DELAY', '5.0')),
            max_concurrent_requests=int(os.getenv('SCRAPER_MAX_CONCURRENT', '3')),
            max_retries=int(os.getenv('SCRAPER_MAX_RETRIES', '3')),
            page_timeout=int(os.getenv('SCRAPER_PAGE_TIMEOUT', '30000')),
            navigation_timeout=int(os.getenv('SCRAPER_NAVIGATION_TIMEOUT', '30000')),
            log_level=os.getenv('SCRAPER_LOG_LEVEL', 'INFO'),
            log_file=os.getenv('SCRAPER_LOG_FILE', 'patent_scraper.log')
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary."""
        return {
            'headless': self.headless,
            'browser_type': self.browser_type,
            'user_agent_rotation': self.user_agent_rotation,
            'viewport_randomization': self.viewport_randomization,
            'javascript_enabled': self.javascript_enabled,
            'min_delay': self.min_delay,
            'max_delay': self.max_delay,
            'max_concurrent_requests': self.max_concurrent_requests,
            'max_retries': self.max_retries,
            'retry_delays': self.retry_delays,
            'page_timeout': self.page_timeout,
            'navigation_timeout': self.navigation_timeout,
            'log_level': self.log_level,
            'log_file': self.log_file
        }