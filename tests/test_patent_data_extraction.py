"""
Test complete data extraction showing all fields.
"""

from backend.scraper.simple_scraper import SimplePatentScraper


def test_complete_extraction():
    """Test complete data extraction."""
    print("=" * 80)
    print("Complete Patent Data Extraction Test")
    print("=" * 80)
    
    # Test patent number
    test_patent = "US10000000B2"
    
    # Create scraper
    scraper = SimplePatentScraper(delay=1.0)
    
    # Scrape patent
    print(f"\nScraping patent: {test_patent}")
    result = scraper.scrape_patent(test_patent)
    
    if result.success and result.data:
        data = result.data
        
        print("\n" + "=" * 80)
        print("COMPLETE PATENT DATA")
        print("=" * 80)
        
        print(f"\n📄 Patent Number: {data.patent_number}")
        print(f"🔗 URL: {data.url}")
        print(f"⏱️  Processing Time: {result.processing_time:.2f}s")
        
        print(f"\n📝 Title:")
        print(f"   {data.title}")
        
        print(f"\n📋 Abstract:")
        print(f"   {data.abstract[:200]}..." if len(data.abstract) > 200 else f"   {data.abstract}")
        
        print(f"\n👤 Inventors ({len(data.inventors)}):")
        if data.inventors:
            for inv in data.inventors:
                print(f"   - {inv}")
        else:
            print("   (None found)")
        
        print(f"\n🏢 Assignees ({len(data.assignees)}):")
        if data.assignees:
            for ass in data.assignees:
                print(f"   - {ass}")
        else:
            print("   (None found)")
        
        print(f"\n📅 Dates:")
        print(f"   Application Date: {data.application_date or 'N/A'}")
        print(f"   Publication Date: {data.publication_date or 'N/A'}")
        
        print(f"\n⚖️  Claims ({len(data.claims)}):")
        if data.claims:
            for i, claim in enumerate(data.claims[:3], 1):
                claim_preview = claim[:100] + "..." if len(claim) > 100 else claim
                print(f"   {i}. {claim_preview}")
            if len(data.claims) > 3:
                print(f"   ... and {len(data.claims) - 3} more claims")
        else:
            print("   (None found)")
        
        print(f"\n📖 Description:")
        if data.description:
            desc_preview = data.description[:200] + "..." if len(data.description) > 200 else data.description
            print(f"   {desc_preview}")
            print(f"   Total length: {len(data.description)} characters")
        else:
            print("   (None found)")
        
        print("\n" + "=" * 80)
        print("✅ Data extraction completed successfully!")
        print("=" * 80)
    else:
        print(f"\n❌ Failed to extract data: {result.error}")
    
    scraper.close()


if __name__ == "__main__":
    test_complete_extraction()
