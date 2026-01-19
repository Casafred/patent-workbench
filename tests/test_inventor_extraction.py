"""
Test inventor and assignee extraction specifically.
"""

import requests
from bs4 import BeautifulSoup


def test_inventor_extraction(patent_number="US10000000B2"):
    """Test inventor extraction methods."""
    print("=" * 80)
    print(f"Testing Inventor Extraction for {patent_number}")
    print("=" * 80)
    
    url = f'https://patents.google.com/patent/{patent_number}'
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }
    
    response = requests.get(url, headers=headers, timeout=15)
    soup = BeautifulSoup(response.text, 'lxml')
    
    print("\n1. Looking for inventor section with dd[itemprop='inventor']:")
    inventor_dd = soup.find('dd', {'itemprop': 'inventor'})
    if inventor_dd:
        print(f"Found: {inventor_dd}")
        print(f"Text: {inventor_dd.get_text()}")
        
        # Try to find spans
        spans = inventor_dd.find_all('span')
        print(f"Found {len(spans)} spans")
        for span in spans:
            print(f"  Span: {span.get('itemprop')} = {span.get_text().strip()}")
    else:
        print("Not found")
    
    print("\n2. Looking for all elements with itemprop='inventor':")
    all_inventors = soup.find_all(attrs={'itemprop': 'inventor'})
    print(f"Found {len(all_inventors)} elements")
    for elem in all_inventors:
        print(f"  Tag: {elem.name}, Text: {elem.get_text().strip()[:100]}")
    
    print("\n3. Looking for assignee section with dd[itemprop='assigneeCurrent']:")
    assignee_dd = soup.find('dd', {'itemprop': 'assigneeCurrent'})
    if assignee_dd:
        print(f"Found: {assignee_dd}")
        print(f"Text: {assignee_dd.get_text()}")
        
        spans = assignee_dd.find_all('span')
        print(f"Found {len(spans)} spans")
        for span in spans:
            print(f"  Span: {span.get('itemprop')} = {span.get_text().strip()}")
    else:
        print("Not found")
    
    print("\n4. Looking for assignee section with dd[itemprop='assigneeOriginal']:")
    assignee_dd = soup.find('dd', {'itemprop': 'assigneeOriginal'})
    if assignee_dd:
        print(f"Found: {assignee_dd}")
        print(f"Text: {assignee_dd.get_text()}")
        
        spans = assignee_dd.find_all('span')
        print(f"Found {len(spans)} spans")
        for span in spans:
            print(f"  Span: {span.get('itemprop')} = {span.get_text().strip()}")
    else:
        print("Not found")
    
    print("\n5. Looking for all elements with itemprop='assigneeCurrent' or 'assigneeOriginal':")
    all_assignees = soup.find_all(attrs={'itemprop': ['assigneeCurrent', 'assigneeOriginal']})
    print(f"Found {len(all_assignees)} elements")
    for elem in all_assignees:
        print(f"  Tag: {elem.name}, itemprop: {elem.get('itemprop')}, Text: {elem.get_text().strip()[:100]}")
    
    print("\n6. Looking in metadata section:")
    metadata_section = soup.find('section', {'itemprop': 'metadata'})
    if metadata_section:
        print("Found metadata section")
        
        # Find all dd elements
        all_dd = metadata_section.find_all('dd')
        print(f"Found {len(all_dd)} dd elements in metadata")
        
        for dd in all_dd[:10]:  # Show first 10
            itemprop = dd.get('itemprop')
            if itemprop:
                text = dd.get_text().strip()[:100]
                print(f"  {itemprop}: {text}")
    
    print("\n" + "=" * 80)


if __name__ == "__main__":
    test_inventor_extraction("US10000000B2")
