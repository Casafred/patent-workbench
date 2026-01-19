"""
Test detailed data extraction from Google Patents.
"""

import requests
from bs4 import BeautifulSoup
import json


def test_detailed_extraction(patent_number="US10000000B2"):
    """Test what data we can extract from a patent page."""
    print("=" * 80)
    print(f"Testing Detailed Data Extraction for {patent_number}")
    print("=" * 80)
    
    url = f'https://patents.google.com/patent/{patent_number}'
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    }
    
    response = requests.get(url, headers=headers, timeout=15)
    soup = BeautifulSoup(response.text, 'lxml')
    
    print("\n1. JSON-LD Data:")
    print("-" * 80)
    
    # Extract JSON-LD
    json_ld = soup.find('script', type='application/ld+json')
    if json_ld:
        ld_data = json.loads(json_ld.string)
        print(json.dumps(ld_data, indent=2, ensure_ascii=False))
    else:
        print("No JSON-LD found")
    
    print("\n2. HTML Metadata Sections:")
    print("-" * 80)
    
    # Find all metadata sections
    metadata_sections = soup.find_all('section', {'itemprop': True})
    for section in metadata_sections:
        itemprop = section.get('itemprop')
        print(f"\nSection: {itemprop}")
        
        # Find all dd elements (definition data)
        dd_elements = section.find_all('dd')
        for dd in dd_elements:
            dd_itemprop = dd.get('itemprop')
            if dd_itemprop:
                text = dd.get_text().strip()
                print(f"  {dd_itemprop}: {text[:100]}")
    
    print("\n3. Specific Field Extraction:")
    print("-" * 80)
    
    # Try to find inventors
    print("\nInventors:")
    inventor_section = soup.find('dd', {'itemprop': 'inventor'})
    if inventor_section:
        inventors = inventor_section.find_all('span', {'itemprop': 'name'})
        for inv in inventors:
            print(f"  - {inv.get_text().strip()}")
    else:
        print("  Not found in dd[itemprop='inventor']")
    
    # Try to find assignees
    print("\nAssignees:")
    assignee_section = soup.find('dd', {'itemprop': 'assigneeOriginal'}) or soup.find('dd', {'itemprop': 'assigneeCurrent'})
    if assignee_section:
        assignees = assignee_section.find_all('span', {'itemprop': 'name'})
        for ass in assignees:
            print(f"  - {ass.get_text().strip()}")
    else:
        print("  Not found")
    
    # Try to find dates
    print("\nDates:")
    
    # Application date
    app_date = soup.find('time', {'itemprop': 'applicationDate'})
    if app_date:
        print(f"  Application Date: {app_date.get_text().strip()}")
    
    # Publication date
    pub_date = soup.find('time', {'itemprop': 'publicationDate'})
    if pub_date:
        print(f"  Publication Date: {pub_date.get_text().strip()}")
    
    # Priority date
    priority_date = soup.find('time', {'itemprop': 'priorityDate'})
    if priority_date:
        print(f"  Priority Date: {priority_date.get_text().strip()}")
    
    # Grant date
    grant_date = soup.find('time', {'itemprop': 'grantDate'})
    if grant_date:
        print(f"  Grant Date: {grant_date.get_text().strip()}")
    
    # Try to find application number
    print("\nApplication Number:")
    app_num = soup.find('dd', {'itemprop': 'applicationNumber'})
    if app_num:
        print(f"  {app_num.get_text().strip()}")
    
    # Try to find publication number
    print("\nPublication Number:")
    pub_num = soup.find('dd', {'itemprop': 'publicationNumber'})
    if pub_num:
        print(f"  {pub_num.get_text().strip()}")
    
    # Try to find classifications
    print("\nClassifications:")
    classifications = soup.find_all('span', {'itemprop': 'Code'})
    for i, cls in enumerate(classifications[:5]):  # Show first 5
        print(f"  - {cls.get_text().strip()}")
    if len(classifications) > 5:
        print(f"  ... and {len(classifications) - 5} more")
    
    print("\n4. All itemprop attributes found:")
    print("-" * 80)
    all_itemprops = set()
    for elem in soup.find_all(attrs={'itemprop': True}):
        all_itemprops.add(elem.get('itemprop'))
    
    for prop in sorted(all_itemprops):
        print(f"  - {prop}")
    
    print("\n" + "=" * 80)


if __name__ == "__main__":
    test_detailed_extraction("US10000000B2")
