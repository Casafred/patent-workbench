"""
Test script for enhanced patent scraper integration.
"""

import asyncio
import sys
import traceback
from backend.scraper.enhanced_scraper import EnhancedPatentScraper
from backend.scraper.config import ScrapingConfig


async def test_single_patent():
    """Test scraping a single patent."""
    print("=" * 60)
    print("Testing Enhanced Patent Scraper - Single Patent")
    print("=" * 60)
    
    # Create configuration
    config = ScrapingConfig.get_default_config()
    print(f"\nConfiguration:")
    print(f"  Browser: {config.browser_type}")
    print(f"  Headless: {config.headless}")
    print(f"  Max retries: {config.max_retries}")
    print(f"  Delay range: {config.min_delay}s - {config.max_delay}s")
    
    # Test patent number
    test_patent = "US10000000B2"
    
    try:
        # Create scraper
        print(f"\nInitializing scraper...")
        scraper = EnhancedPatentScraper(config)
        
        # Initialize
        await scraper.initialize()
        print("✓ Scraper initialized successfully")
        
        # Scrape patent
        print(f"\nScraping patent: {test_patent}")
        result = await scraper.scrape_patent(test_patent)
        
        # Display results
        print("\n" + "=" * 60)
        print("RESULTS")
        print("=" * 60)
        print(f"Patent Number: {result.patent_number}")
        print(f"Success: {result.success}")
        print(f"Processing Time: {result.processing_time:.2f}s")
        print(f"Retry Count: {result.retry_count}")
        
        if result.success and result.data:
            print(f"\nPatent Data:")
            print(f"  Title: {result.data.title[:100]}...")
            print(f"  Abstract: {result.data.abstract[:150]}...")
            print(f"  Inventors: {', '.join(result.data.inventors[:3])}")
            print(f"  Application Date: {result.data.application_date}")
            print(f"  Publication Date: {result.data.publication_date}")
            print(f"  Claims Count: {len(result.data.claims)}")
            print(f"  Description Length: {len(result.data.description)} chars")
        else:
            print(f"\nError: {result.error}")
        
        # Get statistics
        stats = await scraper.get_statistics()
        print(f"\nSession Statistics:")
        print(f"  Total Requests: {stats['total_requests']}")
        print(f"  Success Rate: {stats['session_stats'].get('success_rate', 0):.1f}%")
        
        # Cleanup
        await scraper.cleanup()
        print("\n✓ Scraper cleaned up successfully")
        
        return result.success
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        print(traceback.format_exc())
        return False


async def test_batch_patents():
    """Test scraping multiple patents."""
    print("\n" + "=" * 60)
    print("Testing Enhanced Patent Scraper - Batch Processing")
    print("=" * 60)
    
    # Test patent numbers
    test_patents = [
        "US10000000B2",
        "US9999999B2",
        "US10000001B2"
    ]
    
    try:
        # Create scraper
        config = ScrapingConfig.get_default_config()
        scraper = EnhancedPatentScraper(config)
        
        # Initialize
        await scraper.initialize()
        print("✓ Scraper initialized")
        
        # Progress callback
        def progress_callback(completed, total, result):
            print(f"  Progress: {completed}/{total} - {result.patent_number} - {'✓' if result.success else '✗'}")
        
        # Scrape patents
        print(f"\nScraping {len(test_patents)} patents...")
        results = await scraper.scrape_patents_batch(test_patents, progress_callback)
        
        # Display results
        print("\n" + "=" * 60)
        print("BATCH RESULTS")
        print("=" * 60)
        
        success_count = sum(1 for r in results if r.success)
        print(f"Total: {len(results)}")
        print(f"Success: {success_count}")
        print(f"Failed: {len(results) - success_count}")
        print(f"Success Rate: {(success_count / len(results) * 100):.1f}%")
        
        # Cleanup
        await scraper.cleanup()
        print("\n✓ Batch test completed")
        
        return success_count > 0
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        print(traceback.format_exc())
        return False


async def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("ENHANCED PATENT SCRAPER INTEGRATION TEST")
    print("=" * 60)
    
    # Test single patent
    single_success = await test_single_patent()
    
    # Test batch processing
    batch_success = await test_batch_patents()
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"Single Patent Test: {'✓ PASSED' if single_success else '✗ FAILED'}")
    print(f"Batch Processing Test: {'✓ PASSED' if batch_success else '✗ FAILED'}")
    
    if single_success and batch_success:
        print("\n✓ All tests passed!")
        return 0
    else:
        print("\n✗ Some tests failed")
        return 1


if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nUnexpected error: {e}")
        print(traceback.format_exc())
        sys.exit(1)
