"""
Configuration classes for the enhanced patent scraper.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
import os
import json
from pathlib import Path


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
    
    @classmethod
    def from_dict(cls, config_dict: Dict[str, Any]) -> 'ScrapingConfig':
        """Create configuration from dictionary."""
        return cls(
            headless=config_dict.get('headless', True),
            browser_type=config_dict.get('browser_type', 'chromium'),
            user_agent_rotation=config_dict.get('user_agent_rotation', True),
            viewport_randomization=config_dict.get('viewport_randomization', True),
            javascript_enabled=config_dict.get('javascript_enabled', True),
            min_delay=config_dict.get('min_delay', 2.0),
            max_delay=config_dict.get('max_delay', 5.0),
            max_concurrent_requests=config_dict.get('max_concurrent_requests', 3),
            max_retries=config_dict.get('max_retries', 3),
            retry_delays=config_dict.get('retry_delays', [1.0, 2.0, 4.0]),
            page_timeout=config_dict.get('page_timeout', 30000),
            navigation_timeout=config_dict.get('navigation_timeout', 30000),
            log_level=config_dict.get('log_level', 'INFO'),
            log_file=config_dict.get('log_file', 'patent_scraper.log')
        )
    
    @classmethod
    def from_json_file(cls, file_path: str) -> 'ScrapingConfig':
        """Load configuration from JSON file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                config_data = json.load(f)
            
            # Flatten nested structure if present
            flat_config = {}
            for key, value in config_data.items():
                if isinstance(value, dict):
                    flat_config.update(value)
                else:
                    flat_config[key] = value
            
            return cls.from_dict(flat_config)
        except FileNotFoundError:
            # Return default configuration if file not found
            return cls()
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in configuration file {file_path}: {e}")
    
    def save_to_json_file(self, file_path: str) -> None:
        """Save configuration to JSON file."""
        config_dict = self.to_dict()
        
        # Create nested structure for better organization
        nested_config = {
            "browser": {
                "headless": config_dict["headless"],
                "browser_type": config_dict["browser_type"],
                "javascript_enabled": config_dict["javascript_enabled"],
                "page_timeout": config_dict["page_timeout"],
                "navigation_timeout": config_dict["navigation_timeout"]
            },
            "anti_detection": {
                "user_agent_rotation": config_dict["user_agent_rotation"],
                "viewport_randomization": config_dict["viewport_randomization"]
            },
            "rate_limiting": {
                "min_delay": config_dict["min_delay"],
                "max_delay": config_dict["max_delay"],
                "max_concurrent_requests": config_dict["max_concurrent_requests"]
            },
            "retry": {
                "max_retries": config_dict["max_retries"],
                "retry_delays": config_dict["retry_delays"]
            },
            "logging": {
                "log_level": config_dict["log_level"],
                "log_file": config_dict["log_file"]
            }
        }
        
        # Ensure directory exists
        Path(file_path).parent.mkdir(parents=True, exist_ok=True)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(nested_config, f, indent=2, ensure_ascii=False)
    
    def validate(self) -> List[str]:
        """Validate configuration and return list of errors."""
        errors = []
        
        # Validate browser type
        valid_browsers = ['chromium', 'firefox', 'webkit']
        if self.browser_type not in valid_browsers:
            errors.append(f"Invalid browser_type '{self.browser_type}'. Must be one of: {valid_browsers}")
        
        # Validate delays
        if self.min_delay < 0:
            errors.append("min_delay must be non-negative")
        if self.max_delay < self.min_delay:
            errors.append("max_delay must be greater than or equal to min_delay")
        
        # Validate concurrent requests
        if self.max_concurrent_requests < 1:
            errors.append("max_concurrent_requests must be at least 1")
        if self.max_concurrent_requests > 10:
            errors.append("max_concurrent_requests should not exceed 10 to avoid overwhelming the server")
        
        # Validate retries
        if self.max_retries < 0:
            errors.append("max_retries must be non-negative")
        if len(self.retry_delays) != self.max_retries:
            errors.append(f"retry_delays length ({len(self.retry_delays)}) must match max_retries ({self.max_retries})")
        
        # Validate timeouts
        if self.page_timeout < 1000:
            errors.append("page_timeout must be at least 1000ms")
        if self.navigation_timeout < 1000:
            errors.append("navigation_timeout must be at least 1000ms")
        
        # Validate log level
        valid_log_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        if self.log_level not in valid_log_levels:
            errors.append(f"Invalid log_level '{self.log_level}'. Must be one of: {valid_log_levels}")
        
        return errors
    
    def is_valid(self) -> bool:
        """Check if configuration is valid."""
        return len(self.validate()) == 0


@dataclass
class ProxyConfig:
    """Configuration for proxy settings."""
    
    enabled: bool = False
    proxy_list: List[str] = field(default_factory=list)
    rotation_enabled: bool = True
    proxy_timeout: int = 10
    
    def get_next_proxy(self) -> Optional[str]:
        """Get next proxy from the list (simple round-robin)."""
        if not self.enabled or not self.proxy_list:
            return None
        
        # Simple implementation - in production, you might want more sophisticated rotation
        import random
        return random.choice(self.proxy_list)
    
    def validate_proxy(self, proxy: str) -> bool:
        """Validate proxy format."""
        # Basic validation - should be enhanced for production
        return proxy.startswith(('http://', 'https://', 'socks4://', 'socks5://'))


@dataclass 
class ConfigManager:
    """Manages configuration loading and saving."""
    
    @staticmethod
    def load_config(config_path: Optional[str] = None) -> ScrapingConfig:
        """Load configuration with fallback priority: file -> env -> defaults."""
        
        # Try to load from file first
        if config_path and Path(config_path).exists():
            try:
                return ScrapingConfig.from_json_file(config_path)
            except Exception as e:
                print(f"Warning: Failed to load config from {config_path}: {e}")
        
        # Fallback to default config file
        default_config_path = "config/scraper_config.json"
        if Path(default_config_path).exists():
            try:
                config = ScrapingConfig.from_json_file(default_config_path)
                # Override with environment variables
                env_config = ScrapingConfig.from_env()
                return ConfigManager._merge_configs(config, env_config)
            except Exception as e:
                print(f"Warning: Failed to load default config: {e}")
        
        # Final fallback to environment variables only
        return ScrapingConfig.from_env()
    
    @staticmethod
    def _merge_configs(base_config: ScrapingConfig, override_config: ScrapingConfig) -> ScrapingConfig:
        """Merge two configurations, with override taking precedence for non-default values."""
        # This is a simplified merge - in production you might want more sophisticated logic
        base_dict = base_config.to_dict()
        override_dict = override_config.to_dict()
        
        # Only override if the environment variable was explicitly set
        # (This is a simplified check - you might want to track which values came from env)
        merged_dict = {**base_dict, **override_dict}
        
        return ScrapingConfig.from_dict(merged_dict)