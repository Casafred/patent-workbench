"""
Test script for simple patent scraper.
"""

import sys
import traceback
from backend.scraper.simple_scraper import SimplePatentScraper


def test_single_patent():
    """Test scraping a single patent."""
    print("=" * 60)
    print("Testing Simple Patent Scraper - Single Patent")
    print("=" * 60)
    
    # Test patent number
    test_patent = "US10000000B2"
    
    try:
        # Create scraper
        print(f"\nCreating scraper...")
        scraper = SimplePatentScraper(delay=1.0)
        print("✓ Scraper created successfully")
        
        # Scrape patent
        print(f"\nScraping patent: {test_patent}")
        result = scraper.scrape_patent(test_patent)
        
        # Display results
        print("\n" + "=" * 60)
        print("RESULTS")
        print("=" * 60)
        print(f"Patent Number: {result.patent_number}")
        print(f"Success: {result.success}")
        print(f"Processing Time: {result.processing_time:.2f}s")
        
        if result.success and result.data:
            print(f"\nPatent Data:")
            print(f"  Title: {result.data.title[:100] if result.data.title else 'N/A'}...")
            print(f"  Abstract: {result.data.abstract[:150] if result.data.abstract else 'N/A'}...")
            print(f"  Inventors: {', '.join(result.data.inventors[:3]) if result.data.inventors else 'N/A'}")
            print(f"  Application Date: {result.data.application_date or 'N/A'}")
            print(f"  Publication Date: {result.data.publication_date or 'N/A'}")
            print(f"  Claims Count: {len(result.data.claims)}")
            print(f"  Description Length: {len(result.data.description)} chars")
            print(f"  URL: {result.data.url}")
        else:
            print(f"\nError: {result.error}")
        
        # Cleanup
        scraper.close()
        print("\n✓ Scraper closed successfully")
        
        return result.success
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        print(traceback.format_exc())
        return False


def test_batch_patents():
    """Test scraping multiple patents."""
    print("\n" + "=" * 60)
    print("Testing Simple Patent Scraper - Batch Processing")
    print("=" * 60)
    
    # Test patent numbers
    test_patents = [
        "US10000000B2",
        "US9999999B2",
        "US10000001B2"
    ]
    
    try:
        # Create scraper
        scraper = SimplePatentScraper(delay=1.0)
        print("✓ Scraper created")
        
        # Scrape patents
        print(f"\nScraping {len(test_patents)} patents...")
        results = scraper.scrape_patents_batch(test_patents)
        
        # Display results
        print("\n" + "=" * 60)
        print("BATCH RESULTS")
        print("=" * 60)
        
        success_count = sum(1 for r in results if r.success)
        print(f"Total: {len(results)}")
        print(f"Success: {success_count}")
        print(f"Failed: {len(results) - success_count}")
        print(f"Success Rate: {(success_count / len(results) * 100):.1f}%")
        
        print("\nDetailed Results:")
        for result in results:
            status = "✓" if result.success else "✗"
            print(f"  {status} {result.patent_number} - {result.processing_time:.2f}s")
            if not result.success:
                print(f"    Error: {result.error}")
        
        # Cleanup
        scraper.close()
        print("\n✓ Batch test completed")
        
        return success_count > 0
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        print(traceback.format_exc())
        return False


def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("SIMPLE PATENT SCRAPER TEST")
    print("=" * 60)
    
    # Test single patent
    single_success = test_single_patent()
    
    # Test batch processing
    batch_success = test_batch_patents()
    
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
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nUnexpected error: {e}")
        print(traceback.format_exc())
        sys.exit(1)
