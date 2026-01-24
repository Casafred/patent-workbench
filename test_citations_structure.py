"""
Test script to analyze citations structure in Google Patents
"""
import requests
from bs4 import BeautifulSoup

def analyze_citations(patent_number):
    """Fetch and analyze citations structure"""
    url = f'https://patents.google.com/patent/{patent_number}'
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
    
    print(f"Analyzing citations for: {patent_number}")
    print("=" * 80)
    
    response = requests.get(url, headers=headers, timeout=15)
    response.encoding = 'utf-8'
    soup = BeautifulSoup(response.text, 'lxml')
    
    # Look for patentCitations heading
    print("\n1. Patent Citations:")
    print("-" * 40)
    citations_h3 = soup.find('h3', {'id': 'patentCitations'})
    if citations_h3:
        print(f"✓ Found: <h3 id='patentCitations'>")
        print(f"  Text: {citations_h3.get_text(strip=True)}")
        
        # Find the next table or list after this heading
        next_sibling = citations_h3.find_next_sibling()
        print(f"  Next sibling: {next_sibling.name if next_sibling else 'None'}")
        
        # Try to find table
        citations_table = citations_h3.find_next('table')
        if citations_table:
            print(f"  ✓ Found table after heading")
            rows = citations_table.find_all('tr')
            print(f"  Rows: {len(rows)}")
            
            # Analyze first row structure
            if rows:
                first_row = rows[0]
                print(f"\n  First row structure:")
                cells = first_row.find_all(['td', 'th'])
                for i, cell in enumerate(cells):
                    print(f"    Cell {i}: {cell.get('class', 'no-class')} - {cell.get_text(strip=True)[:50]}")
    else:
        print("✗ Not found: <h3 id='patentCitations'>")
    
    # Look for citedBy heading
    print("\n2. Cited By:")
    print("-" * 40)
    cited_by_h3 = soup.find('h3', {'id': 'citedBy'})
    if cited_by_h3:
        print(f"✓ Found: <h3 id='citedBy'>")
        print(f"  Text: {cited_by_h3.get_text(strip=True)}")
        
        cited_by_table = cited_by_h3.find_next('table')
        if cited_by_table:
            print(f"  ✓ Found table after heading")
            rows = cited_by_table.find_all('tr')
            print(f"  Rows: {len(rows)}")
    else:
        print("✗ Not found: <h3 id='citedBy'>")
    
    # Look for legalEvents heading
    print("\n3. Legal Events:")
    print("-" * 40)
    legal_h3 = soup.find('h3', {'id': 'legalEvents'})
    if legal_h3:
        print(f"✓ Found: <h3 id='legalEvents'>")
        print(f"  Text: {legal_h3.get_text(strip=True)}")
        
        legal_table = legal_h3.find_next('table')
        if legal_table:
            print(f"  ✓ Found table after heading")
            rows = legal_table.find_all('tr')
            print(f"  Rows: {len(rows)}")
    else:
        print("✗ Not found: <h3 id='legalEvents'>")
    
    # Save a larger snippet
    print("\n4. Saving larger HTML snippet...")
    with open(f'patent_{patent_number}_full.html', 'w', encoding='utf-8') as f:
        f.write(response.text)
    print(f"✓ Saved to: patent_{patent_number}_full.html")

if __name__ == '__main__':
    analyze_citations('CN104154208B')
