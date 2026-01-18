"""
Configuration classes for the enhanced patent scraper.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
import os
import json


@dataclass
class ScrapingConfig:
    """Configuration for the enhanced patent scraper."""
    
    # Browser configuration
    headless: bool = True
    browser_type: str = "chromium"  # chromium, firefox, webkit
    use_system_browser: bool = True  # Try to use system browser first
    
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
    enable_performance_logging: bool = True
    
    @classmethod
    def from_env(cls) -> 'ScrapingConfig':
        """Create configuration from environment variables."""
        return cls(
            headless=os.getenv('SCRAPER_HEADLESS', 'true').lower() == 'true',
            browser_type=os.getenv('SCRAPER_BROWSER_TYPE', 'chromium'),
            use_system_browser=os.getenv('SCRAPER_USE_SYSTEM_BROWSER', 'true').lower() == 'true',
            user_agent_rotation=os.getenv('SCRAPER_USER_AGENT_ROTATION', 'true').lower() == 'true',
            viewport_randomization=os.getenv('SCRAPER_VIEWPORT_RANDOMIZATION', 'true').lower() == 'true',
            min_delay=float(os.getenv('SCRAPER_MIN_DELAY', '2.0')),
            max_delay=float(os.getenv('SCRAPER_MAX_DELAY', '5.0')),
            max_concurrent_requests=int(os.getenv('SCRAPER_MAX_CONCURRENT', '3')),
            max_retries=int(os.getenv('SCRAPER_MAX_RETRIES', '3')),
            page_timeout=int(os.getenv('SCRAPER_PAGE_TIMEOUT', '30000')),
            navigation_timeout=int(os.getenv('SCRAPER_NAVIGATION_TIMEOUT', '30000')),
            log_level=os.getenv('SCRAPER_LOG_LEVEL', 'INFO'),
            log_file=os.getenv('SCRAPER_LOG_FILE', 'patent_scraper.log'),
            enable_performance_logging=os.getenv('SCRAPER_ENABLE_PERF_LOG', 'true').lower() == 'true'
        )
    
    @classmethod
    def from_file(cls, config_path: str) -> 'ScrapingConfig':
        """Create configuration from JSON file."""
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config_data = json.load(f)
            
            # Flatten nested configuration
            flat_config = {}
            for section, values in config_data.items():
                if isinstance(values, dict):
                    flat_config.update(values)
                else:
                    flat_config[section] = values
            
            # Map JSON keys to dataclass fields
            field_mapping = {
                'headless': 'headless',
                'browser_type': 'browser_type',
                'use_system_browser': 'use_system_browser',
                'user_agent_rotation': 'user_agent_rotation',
                'viewport_randomization': 'viewport_randomization',
                'javascript_enabled': 'javascript_enabled',
                'min_delay': 'min_delay',
                'max_delay': 'max_delay',
                'max_concurrent_requests': 'max_concurrent_requests',
                'max_retries': 'max_retries',
                'retry_delays': 'retry_delays',
                'page_timeout': 'page_timeout',
                'navigation_timeout': 'navigation_timeout',
                'log_level': 'log_level',
                'log_file': 'log_file',
                'enable_performance_logging': 'enable_performance_logging'
            }
            
            kwargs = {}
            for json_key, field_name in field_mapping.items():
                if json_key in flat_config:
                    kwargs[field_name] = flat_config[json_key]
            
            return cls(**kwargs)
            
        except Exception as e:
            print(f"Warning: Failed to load config from {config_path}: {e}")
            return cls()  # Return default config
    
    @classmethod
    def get_default_config(cls) -> 'ScrapingConfig':
        """Get default configuration optimized for Google Patents."""
        return cls(
            headless=True,
            browser_type="chromium",
            use_system_browser=True,
            user_agent_rotation=True,
            viewport_randomization=True,
            javascript_enabled=True,
            min_delay=2.0,
            max_delay=5.0,
            max_concurrent_requests=2,  # Conservative for Google Patents
            max_retries=3,
            retry_delays=[1.0, 3.0, 6.0],  # Exponential backoff
            page_timeout=30000,
            navigation_timeout=30000,
            log_level="INFO",
            log_file="patent_scraper.log",
            enable_performance_logging=True
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary."""
        return {
            'browser': {
                'headless': self.headless,
                'browser_type': self.browser_type,
                'use_system_browser': self.use_system_browser,
                'javascript_enabled': self.javascript_enabled,
                'page_timeout': self.page_timeout,
                'navigation_timeout': self.navigation_timeout
            },
            'anti_detection': {
                'user_agent_rotation': self.user_agent_rotation,
                'viewport_randomization': self.viewport_randomization
            },
            'rate_limiting': {
                'min_delay': self.min_delay,
                'max_delay': self.max_delay,
                'max_concurrent_requests': self.max_concurrent_requests
            },
            'retry': {
                'max_retries': self.max_retries,
                'retry_delays': self.retry_delays
            },
            'logging': {
                'log_level': self.log_level,
                'log_file': self.log_file,
                'enable_performance_logging': self.enable_performance_logging
            }
        }
    
    def save_to_file(self, config_path: str) -> None:
        """Save configuration to JSON file."""
        try:
            os.makedirs(os.path.dirname(config_path), exist_ok=True)
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(self.to_dict(), f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Warning: Failed to save config to {config_path}: {e}")
    
    def validate(self) -> List[str]:
        """Validate configuration and return list of issues."""
        issues = []
        
        if self.min_delay < 0:
            issues.append("min_delay must be non-negative")
        
        if self.max_delay < self.min_delay:
            issues.append("max_delay must be greater than or equal to min_delay")
        
        if self.max_concurrent_requests < 1:
            issues.append("max_concurrent_requests must be at least 1")
        
        if self.max_retries < 0:
            issues.append("max_retries must be non-negative")
        
        if self.page_timeout < 1000:
            issues.append("page_timeout should be at least 1000ms")
        
        if self.navigation_timeout < 1000:
            issues.append("navigation_timeout should be at least 1000ms")
        
        if self.browser_type not in ['chromium', 'firefox', 'webkit']:
            issues.append("browser_type must be one of: chromium, firefox, webkit")
        
        if len(self.retry_delays) != self.max_retries:
            issues.append("retry_delays length must match max_retries")
        
        return issues
    
    def is_valid(self) -> bool:
        """Check if configuration is valid."""
        return len(self.validate()) == 0