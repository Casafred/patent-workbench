"""
Patent Scraper Module

This module provides patent scraping capabilities using simple but reliable
requests + BeautifulSoup approach.
"""

from .simple_scraper import SimplePatentScraper, SimplePatentData, SimplePatentResult

__all__ = [
    'SimplePatentScraper',
    'SimplePatentData',
    'SimplePatentResult'
]
