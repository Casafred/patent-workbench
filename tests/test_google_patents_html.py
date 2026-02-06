"""
Test script to fetch and analyze Google Patents HTML structure
"""
import requests
from bs4 import BeautifulSoup
import json

def analyze_patent_html(patent_number):
    """Fetch and analyze patent HTML structure"""
    url = f'https://patents.google.com/patent/{patent_number}'
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
    }
    
    print(f"\n{'='*80}")
    print(f"Analyzing: {patent_number}")
    print(f"URL: {url}")
    print(f"{'='*80}\n")
    
    response = requests.get(url, headers=headers, timeout=15)
    response.encoding = 'utf-8'
    soup = BeautifulSoup(response.text, 'lxml')
    
    # 1. Check JSON-LD
    print("1. JSON-LD Data:")
    print("-" * 40)
    json_ld = soup.find('script', type='application/ld+json')
    if json_ld:
        try:
            ld_data = json.loads(json_ld.string)
            print(f"Found JSON-LD with keys: {list(ld_data.keys())}")
            if '@graph' in ld_data:
                for item in ld_data['@graph']:
                    if item.get('@type') == 'Patent':
                        print(f"  - Title: {item.get('name', 'N/A')[:60]}...")
                        print(f"  - Abstract: {item.get('abstract', 'N/A')[:60]}...")
                        print(f"  - Images: {len(item.get('image', []))} found")
                        if 'image' in item:
                            images = item.get('image', [])
                            if isinstance(images, list) and images:
                                print(f"    First image: {images[0][:80]}...")
        except Exception as e:
            print(f"Error parsing JSON-LD: {e}")
    else:
        print("No JSON-LD found")
    
    # 2. Check Claims
    print("\n2. Claims Section:")
    print("-" * 40)
    
    # Try different selectors
    claims_section = soup.find('section', {'itemprop': 'claims'})
    if claims_section:
        print("Found: <section itemprop='claims'>")
        claim_divs = claims_section.find_all('div', class_='claim')
        print(f"  - Found {len(claim_divs)} divs with class='claim'")
        if claim_divs:
            first_claim = claim_divs[0].get_text(strip=True)
            print(f"  - First claim: {first_claim[:100]}...")
    else:
        print("Not found: <section itemprop='claims'>")
        
        # Try alternative
        claims_div = soup.find('div', class_='claims')
        if claims_div:
            print("Found: <div class='claims'>")
        else:
            print("Not found: <div class='claims'>")
            
            # Try to find any section with "claims" in text
            for section in soup.find_all('section'):
                section_text = section.get_text()[:200]
                if 'claim' in section_text.lower():
                    print(f"Found section with 'claim' in text: {section.get('class', 'no-class')}")
                    print(f"  Text preview: {section_text[:100]}...")
                    break
    
    # 3. Check Drawings/Figures
    print("\n3. Drawings/Figures:")
    print("-" * 40)
    
    figures = soup.find_all('figure')
    print(f"Found {len(figures)} <figure> elements")
    if figures:
        for i, fig in enumerate(figures[:3]):
            img = fig.find('img')
            if img:
                src = img.get('src', 'no-src')
                print(f"  Figure {i+1}: {src[:80]}...")
    
    all_imgs = soup.find_all('img')
    print(f"\nFound {len(all_imgs)} total <img> elements")
    patent_imgs = []
    for img in all_imgs:
        src = img.get('src', '')
        if any(p in src for p in ['patent', 'drawing', 'figure']):
            patent_imgs.append(src)
    
    if patent_imgs:
        print(f"Found {len(patent_imgs)} patent-related images:")
        for i, src in enumerate(patent_imgs[:3]):
            print(f"  {i+1}. {src[:80]}...")
    
    # 4. Check Citations
    print("\n4. Patent Citations:")
    print("-" * 40)
    
    citations_section = soup.find('section', {'itemprop': 'citations'})
    if citations_section:
        print("Found: <section itemprop='citations'>")
        rows = citations_section.find_all('tr')
        print(f"  - Found {len(rows)} rows")
    else:
        print("Not found: <section itemprop='citations'>")
        
        # Try alternative
        citations_div = soup.find('div', {'id': 'citations'})
        if citations_div:
            print("Found: <div id='citations'>")
        else:
            print("Not found: <div id='citations'>")
    
    # 5. Check Cited By
    print("\n5. Cited By:")
    print("-" * 40)
    
    cited_by_section = soup.find('section', {'id': 'citedBy'})
    if not cited_by_section:
        cited_by_section = soup.find('div', {'id': 'citedBy'})
    
    if cited_by_section:
        print(f"Found cited by section")
        rows = cited_by_section.find_all('tr')
        print(f"  - Found {len(rows)} rows")
    else:
        print("Not found: cited by section")
    
    # 6. Check Legal Events
    print("\n6. Legal Events:")
    print("-" * 40)
    
    events_section = soup.find('section', {'id': 'legalEvents'})
    if not events_section:
        events_section = soup.find('div', {'id': 'legalEvents'})
    
    if events_section:
        print(f"Found legal events section")
        rows = events_section.find_all('tr')
        print(f"  - Found {len(rows)} rows")
    else:
        print("Not found: legal events section")
    
    # 7. Save HTML snippet for manual inspection
    print("\n7. Saving HTML snippet...")
    print("-" * 40)
    with open(f'patent_{patent_number}_snippet.html', 'w', encoding='utf-8') as f:
        # Save first 50000 chars
        f.write(response.text[:50000])
    print(f"Saved to: patent_{patent_number}_snippet.html")


if __name__ == '__main__':
    # Test with the patent number from user's example
    analyze_patent_html('CN104154208B')
