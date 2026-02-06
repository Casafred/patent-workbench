"""
Test the improved scraper with claims and drawings extraction
"""
import sys
sys.path.insert(0, 'backend')

from scraper.simple_scraper import SimplePatentScraper
import json

def test_scraper():
    """Test scraper with CN104154208B"""
    scraper = SimplePatentScraper(delay=1.0)
    
    print("Testing patent: CN104154208B")
    print("=" * 80)
    
    # Test with crawl_specification=True to get all fields
    result = scraper.scrape_patent('CN104154208B', crawl_specification=True, crawl_full_drawings=True)
    
    if result.success:
        print("\n✓ Scraping successful!")
        print(f"Processing time: {result.processing_time:.2f}s")
        
        data = result.data
        print(f"\nTitle: {data.title}")
        print(f"Abstract: {data.abstract[:100]}...")
        print(f"Inventors: {data.inventors}")
        print(f"Assignees: {data.assignees}")
        print(f"Application Date: {data.application_date}")
        print(f"Publication Date: {data.publication_date}")
        
        print(f"\n权利要求 (Claims): {len(data.claims)} found")
        for i, claim in enumerate(data.claims[:3], 1):
            print(f"  {i}. {claim[:100]}...")
        
        print(f"\n附图 (Drawings): {len(data.drawings)} found")
        for i, drawing in enumerate(data.drawings[:3], 1):
            print(f"  {i}. {drawing}")
        
        print(f"\n引用专利 (Patent Citations): {len(data.patent_citations)} found")
        for i, citation in enumerate(data.patent_citations[:3], 1):
            print(f"  {i}. {citation}")
        
        print(f"\n被引用 (Cited By): {len(data.cited_by)} found")
        for i, cited in enumerate(data.cited_by[:3], 1):
            print(f"  {i}. {cited}")
        
        print(f"\n法律事件 (Legal Events): {len(data.legal_events)} found")
        for i, event in enumerate(data.legal_events[:3], 1):
            print(f"  {i}. {event}")
        
        # Save full result to JSON
        with open('test_scraper_result.json', 'w', encoding='utf-8') as f:
            json.dump(result.to_dict(), f, ensure_ascii=False, indent=2)
        print("\n✓ Full result saved to: test_scraper_result.json")
        
    else:
        print(f"\n✗ Scraping failed: {result.error}")
    
    scraper.close()

if __name__ == '__main__':
    test_scraper()
