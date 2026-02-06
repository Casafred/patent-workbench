#!/usr/bin/env python3
"""
Test script for patent drawings scraping functionality.
"""

import sys
import logging
from backend.scraper.simple_scraper import SimplePatentScraper

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_patent_drawings(patent_number):
    """Test scraping drawings for a specific patent."""
    logger.info(f"Testing drawings scraping for patent: {patent_number}")
    
    # Create scraper instance
    scraper = SimplePatentScraper(delay=1.0)
    
    try:
        # Scrape patent with specification (which includes drawings)
        result = scraper.scrape_patent(patent_number, crawl_specification=True)
        
        if result.success and result.data:
            logger.info(f"✓ Successfully scraped patent: {patent_number}")
            logger.info(f"  Title: {result.data.title}")
            logger.info(f"  Drawings found: {len(result.data.drawings)}")
            
            for i, drawing_url in enumerate(result.data.drawings[:5]):
                logger.info(f"  Drawing {i+1}: {drawing_url}")
            
            if len(result.data.drawings) > 5:
                logger.info(f"  ... and {len(result.data.drawings) - 5} more drawings")
            
            return True
        else:
            logger.error(f"✗ Failed to scrape patent: {patent_number}")
            logger.error(f"  Error: {result.error}")
            return False
    
    finally:
        scraper.close()

def main():
    """Main test function."""
    # Test with a sample patent number
    patent_numbers = [
        "US10000000B2",  # US patent with drawings
        "WO2020000001A1",  # WO patent with drawings
        "CN100000000A"  # CN patent with drawings
    ]
    
    success_count = 0
    total_count = len(patent_numbers)
    
    for patent_number in patent_numbers:
        if test_patent_drawings(patent_number):
            success_count += 1
        print()  # Add blank line between tests
    
    logger.info(f"\nTest Summary: {success_count}/{total_count} patents successfully scraped")
    
    if success_count == total_count:
        logger.info("✓ All tests passed!")
        return 0
    else:
        logger.error("✗ Some tests failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())
