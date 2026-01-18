"""
Enhanced Patent Scraper Module

This module provides advanced patent scraping capabilities using Playwright
and modern anti-detection techniques for Google Patents.
"""

# Import order is important to avoid circular imports
from .config import ScrapingConfig
from .models import PatentData, PatentResult, ScrapingStats, BatchRequest

# Import browser manager separately to avoid circular imports
def get_browser_manager():
    from .browser_manager import PlaywrightBrowserManager
    return PlaywrightBrowserManager

__all__ = [
    'ScrapingConfig', 
    'PatentData',
    'PatentResult',
    'ScrapingStats',
    'BatchRequest',
    'get_browser_manager'
]