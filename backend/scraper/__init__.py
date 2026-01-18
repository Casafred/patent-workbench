"""
Enhanced Patent Scraper Module

This module provides advanced patent scraping capabilities using Playwright
and modern anti-detection techniques for Google Patents.
"""

# Import order is important to avoid circular imports
from .config import ScrapingConfig
from .models import PatentData, PatentResult, ScrapingStats, BatchRequest

# Import core components - use try/except to handle import issues
try:
    from .browser_manager import PlaywrightBrowserManager
except ImportError as e:
    print(f"Warning: Could not import PlaywrightBrowserManager: {e}")
    PlaywrightBrowserManager = None

try:
    from .anti_detection import AntiDetectionManager
except ImportError as e:
    print(f"Warning: Could not import AntiDetectionManager: {e}")
    AntiDetectionManager = None

try:
    from .rate_limiter import RateLimitingManager
except ImportError as e:
    print(f"Warning: Could not import RateLimitingManager: {e}")
    RateLimitingManager = None

try:
    from .extractors import DataExtractionEngine
except ImportError as e:
    print(f"Warning: Could not import DataExtractionEngine: {e}")
    DataExtractionEngine = None

try:
    from .error_handler import ErrorHandlingManager
except ImportError as e:
    print(f"Warning: Could not import ErrorHandlingManager: {e}")
    ErrorHandlingManager = None

# Import main scraper class
try:
    from .enhanced_scraper import EnhancedPatentScraper
except ImportError as e:
    print(f"Warning: Could not import EnhancedPatentScraper: {e}")
    EnhancedPatentScraper = None

__all__ = [
    'ScrapingConfig', 
    'PatentData',
    'PatentResult',
    'ScrapingStats',
    'BatchRequest',
    'PlaywrightBrowserManager',
    'AntiDetectionManager',
    'RateLimitingManager',
    'DataExtractionEngine',
    'ErrorHandlingManager',
    'EnhancedPatentScraper'
]