"""
Simple but reliable patent scraper using requests and BeautifulSoup.
This is a fallback/alternative to the Playwright-based scraper.
"""

import time
import json
import logging
import requests
from bs4 import BeautifulSoup
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)


@dataclass
class SimplePatentData:
    """Simple patent data structure."""
    patent_number: str
    title: str = ""
    abstract: str = ""
    inventors: List[str] = None
    assignees: List[str] = None
    application_date: str = ""
    publication_date: str = ""
    claims: List[str] = None
    description: str = ""
    url: str = ""
    drawings: List[str] = None
    # 进阶字段
    patent_citations: List[Dict[str, str]] = None  # 引用的专利
    cited_by: List[Dict[str, str]] = None  # 被引用的专利
    legal_events: List[Dict[str, str]] = None  # 法律事件
    
    def __post_init__(self):
        if self.inventors is None:
            self.inventors = []
        if self.assignees is None:
            self.assignees = []
        if self.claims is None:
            self.claims = []
        if self.drawings is None:
            self.drawings = []
        if self.patent_citations is None:
            self.patent_citations = []
        if self.cited_by is None:
            self.cited_by = []
        if self.legal_events is None:
            self.legal_events = []
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)
    
    def is_valid(self) -> bool:
        """Check if data is valid."""
        return bool(self.patent_number and (self.title or self.abstract))


@dataclass
class SimplePatentResult:
    """Result of patent scraping."""
    patent_number: str
    success: bool
    data: Optional[SimplePatentData] = None
    error: Optional[str] = None
    processing_time: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        result = {
            'patent_number': self.patent_number,
            'success': self.success,
            'processing_time': self.processing_time
        }
        
        if self.success and self.data:
            result['data'] = self.data.to_dict()
            result['url'] = f"https://patents.google.com/patent/{self.patent_number}"
        else:
            result['error'] = self.error
        
        return result


class SimplePatentScraper:
    """Simple patent scraper using requests and BeautifulSoup."""
    
    def __init__(self, delay: float = 2.0):
        """
        Initialize scraper.
        
        Args:
            delay: Delay between requests in seconds
        """
        self.delay = delay
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1'
        })
    
    def scrape_patent(self, patent_number: str, crawl_specification: bool = False, crawl_full_drawings: bool = False) -> SimplePatentResult:
        """
        Scrape a single patent.
        
        Args:
            patent_number: Patent number to scrape
            crawl_specification: Whether to crawl specification fields (claims and description)
            crawl_full_drawings: Whether to crawl all drawings or just the first one
            
        Returns:
            SimplePatentResult with scraped data
        """
        start_time = time.time()
        
        try:
            url = f'https://patents.google.com/patent/{patent_number}'
            
            # Make request
            response = self.session.get(url, timeout=15)
            response.raise_for_status()
            
            # Fix encoding issue - ensure UTF-8 encoding
            response.encoding = 'utf-8'
            
            # Parse HTML
            soup = BeautifulSoup(response.text, 'lxml')
            
            # Extract data
            patent_data = self._extract_patent_data(soup, patent_number, url, crawl_specification=crawl_specification, crawl_full_drawings=crawl_full_drawings)
            
            processing_time = time.time() - start_time
            
            if patent_data and patent_data.is_valid():
                return SimplePatentResult(
                    patent_number=patent_number,
                    success=True,
                    data=patent_data,
                    processing_time=processing_time
                )
            else:
                return SimplePatentResult(
                    patent_number=patent_number,
                    success=False,
                    error="Failed to extract valid patent data",
                    processing_time=processing_time
                )
        
        except requests.exceptions.RequestException as e:
            processing_time = time.time() - start_time
            return SimplePatentResult(
                patent_number=patent_number,
                success=False,
                error=f"Request error: {str(e)}",
                processing_time=processing_time
            )
        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"Error scraping {patent_number}: {e}")
            return SimplePatentResult(
                patent_number=patent_number,
                success=False,
                error=str(e),
                processing_time=processing_time
            )
    
    def _extract_patent_data(self, soup: BeautifulSoup, patent_number: str, url: str, crawl_specification: bool = False, crawl_full_drawings: bool = False) -> Optional[SimplePatentData]:
        """Extract patent data from HTML."""
        patent_data = SimplePatentData(patent_number=patent_number, url=url)
        
        # Try JSON-LD first (most reliable)
        try:
            json_ld = soup.find('script', type='application/ld+json')
            if json_ld:
                ld_data = json.loads(json_ld.string)
                
                if '@graph' in ld_data:
                    for item in ld_data['@graph']:
                        if item.get('@type') == 'Patent':
                            patent_data.title = item.get('name', '')
                            patent_data.abstract = item.get('abstract', '')
                            patent_data.inventors = [inv.get('name', '') for inv in item.get('inventor', [])]
                            patent_data.application_date = item.get('filingDate', '')
                            patent_data.publication_date = item.get('publicationDate', '')
                            patent_data.assignees = [ass.get('name', '') for ass in item.get('assignee', [])]
                            
                            # Extract images from JSON-LD if available
                            if 'image' in item:
                                images = item.get('image', [])
                                image_list = []
                                
                                if isinstance(images, list):
                                    for img in images:
                                        if isinstance(img, str) and img:
                                            image_list.append(img)
                                        elif isinstance(img, dict) and img.get('url'):
                                            image_list.append(img.get('url'))
                                elif isinstance(images, str):
                                    image_list.append(images)
                                elif isinstance(images, dict) and images.get('url'):
                                    image_list.append(images.get('url'))
                                
                                # Only keep first image if not crawling full drawings
                                if image_list:
                                    if crawl_full_drawings:
                                        patent_data.drawings.extend(image_list)
                                    else:
                                        patent_data.drawings.append(image_list[0])
                            break
        except Exception as e:
            logger.warning(f"Error parsing JSON-LD for {patent_number}: {e}")
        
        # Fallback to HTML parsing
        if not patent_data.title:
            title = soup.find('h1')
            if title:
                patent_data.title = title.get_text().strip()
        
        # Clean up title - remove Google Patents suffix and patent number prefix
        if patent_data.title:
            patent_data.title = patent_data.title.replace(' - Google Patents', '').strip()
            # Remove patent number prefix if present
            patent_data.title = patent_data.title.replace(f'{patent_number} - ', '').strip()
            patent_data.title = patent_data.title.replace(f'{patent_number}B2 - ', '').strip()
        
        if not patent_data.abstract:
            # Try multiple selectors for abstract
            abstract = soup.find('section', {'itemprop': 'abstract'})
            if not abstract:
                abstract = soup.find('div', {'class': 'abstract'})
            if not abstract:
                abstract = soup.find('abstract')
            
            if abstract:
                # Get text from abstract, removing extra whitespace
                abstract_text = abstract.get_text(separator=' ', strip=True)
                patent_data.abstract = abstract_text
        
        if not patent_data.inventors:
            inventors = []
            # Try multiple selectors
            inventor_section = soup.find('dd', {'itemprop': 'inventor'})
            
            if inventor_section:
                # First try to find spans with itemprop='name'
                inventor_elements = inventor_section.find_all('span', {'itemprop': 'name'})
                
                if inventor_elements:
                    # If we found spans, use them
                    for inv in inventor_elements:
                        inventor_name = inv.get_text().strip()
                        if inventor_name and inventor_name not in ['Inventor', 'Inventors']:
                            inventors.append(inventor_name)
                else:
                    # If no spans, get text directly from dd
                    inventor_text = inventor_section.get_text().strip()
                    if inventor_text and inventor_text not in ['Inventor', 'Inventors']:
                        inventors.append(inventor_text)
            
            patent_data.inventors = inventors
        
        # Extract assignees if not already extracted
        if not patent_data.assignees:
            assignees = []
            # Try both current and original assignees
            assignee_section = soup.find('dd', {'itemprop': 'assigneeCurrent'})
            if not assignee_section:
                assignee_section = soup.find('dd', {'itemprop': 'assigneeOriginal'})
            
            if assignee_section:
                # First try to find spans with itemprop='name'
                assignee_elements = assignee_section.find_all('span', {'itemprop': 'name'})
                
                if assignee_elements:
                    # If we found spans, use them
                    for ass in assignee_elements:
                        assignee_name = ass.get_text().strip()
                        if assignee_name and assignee_name not in ['Assignee', 'Assignees']:
                            assignees.append(assignee_name)
                else:
                    # If no spans, get text directly from dd
                    assignee_text = assignee_section.get_text().strip()
                    if assignee_text and assignee_text not in ['Assignee', 'Assignees']:
                        assignees.append(assignee_text)
            
            patent_data.assignees = assignees
        
        # Extract dates if not already extracted
        if not patent_data.application_date:
            app_date = soup.find('time', {'itemprop': 'filingDate'})
            if app_date:
                patent_data.application_date = app_date.get_text().strip()
        
        if not patent_data.publication_date:
            pub_date = soup.find('time', {'itemprop': 'publicationDate'})
            if pub_date:
                patent_data.publication_date = pub_date.get_text().strip()
        
        # Extract claims - 始终提取权利要求，不受crawl_specification限制
        try:
            claims = []
            claims_section = soup.find('section', {'itemprop': 'claims'})
            if not claims_section:
                claims_section = soup.find('div', {'class': 'claims'})
            
            if claims_section:
                claim_elements = claims_section.find_all('div', {'class': 'claim'})
                if not claim_elements:
                    claim_elements = claims_section.find_all('claim')
                if not claim_elements:
                    # Try to get all divs with claim text
                    claim_elements = claims_section.find_all('div', {'itemprop': 'claims'})
                
                # 去重处理，避免权利要求重复
                seen_claims = set()
                for claim in claim_elements:
                    claim_text = claim.get_text().strip()
                    if claim_text and len(claim_text) > 10:
                        # 提取权利要求编号，用于去重
                        claim_number = None
                        claim_lines = claim_text.split('\n')
                        for line in claim_lines:
                            if line.strip().startswith('权利要求'):
                                claim_number = line.strip()
                                break
                        if not claim_number:
                            # 如果没有权利要求编号，使用前20个字符作为标识
                            claim_number = claim_text[:20]
                        if claim_number not in seen_claims:
                            seen_claims.add(claim_number)
                            claims.append(claim_text)
            
            patent_data.claims = claims
        except Exception as e:
            logger.warning(f"Error extracting claims for {patent_number}: {e}")
            patent_data.claims = []
        
        # Extract description
        if crawl_specification:
            try:
                description = ''
                description_section = soup.find('section', {'itemprop': 'description'})
                if not description_section:
                    description_section = soup.find('div', {'class': 'description'})
                if not description_section:
                    description_section = soup.find('description')
                if not description_section:
                    # Try to find all sections after abstract
                    abstract_section = soup.find('section', {'itemprop': 'abstract'})
                    if abstract_section:
                        description_section = abstract_section.find_next_sibling()
                
                if description_section:
                    # Get all text content from description section
                    description = description_section.get_text(separator=' ', strip=True)
                    # 不限制说明书长度，提取完整内容
                    # if len(description) > 2000:
                    #     description = description[:2000] + '...'
                
                patent_data.description = description
            except Exception as e:
                logger.warning(f"Error extracting description for {patent_number}: {e}")
                patent_data.description = ''
        else:
            patent_data.description = ''
        
        # Extract drawings using multiple strategies
        # 始终尝试提取附图，不受crawl_specification限制
        if not patent_data.drawings:
            try:
                seen_images = set()
                
                # Strategy 1: Find figure elements (most reliable)
                figures = soup.find_all('figure')
                for figure in figures:
                    img = figure.find('img')
                    if img and img.get('src'):
                        img_src = img.get('src')
                        # Handle relative URLs
                        if img_src.startswith('//'):
                            img_src = f'https:{img_src}'
                        elif img_src.startswith('/'):
                            img_src = f'https://patents.google.com{img_src}'
                        
                        if img_src.startswith('http') and img_src not in seen_images:
                            # Filter out small icons (usually < 100px)
                            width = img.get('width', '0')
                            height = img.get('height', '0')
                            try:
                                if width and int(width) < 100:
                                    continue
                                if height and int(height) < 100:
                                    continue
                            except:
                                pass
                            
                            seen_images.add(img_src)
                            patent_data.drawings.append(img_src)
                            
                            if not crawl_full_drawings:
                                break
                
                # Strategy 2: Find images in description section
                if not patent_data.drawings:
                    desc_section = soup.find('section', {'itemprop': 'description'})
                    if desc_section:
                        img_tags = desc_section.find_all('img')
                        for img in img_tags:
                            img_src = img.get('src', '')
                            if img_src:
                                # Handle relative URLs
                                if img_src.startswith('//'):
                                    img_src = f'https:{img_src}'
                                elif img_src.startswith('/'):
                                    img_src = f'https://patents.google.com{img_src}'
                                elif not img_src.startswith('http'):
                                    continue
                                
                                # Check if this is a patent drawing
                                if ('patentimages' in img_src or 
                                    'patents.google.com' in img_src or 
                                    len(img_src) > 80):
                                    if img_src not in seen_images:
                                        seen_images.add(img_src)
                                        patent_data.drawings.append(img_src)
                                        
                                        if not crawl_full_drawings:
                                            break
                
                # Strategy 3: Find all images with patent-related URLs
                if not patent_data.drawings:
                    all_imgs = soup.find_all('img')
                    for img in all_imgs:
                        img_src = img.get('src', '')
                        if not img_src:
                            continue
                        
                        # Handle relative URLs
                        if img_src.startswith('//'):
                            img_src = f'https:{img_src}'
                        elif img_src.startswith('/'):
                            img_src = f'https://patents.google.com{img_src}'
                        
                        # Look for patent image patterns
                        if ('patentimages' in img_src or 
                            '/patents/US' in img_src or
                            '/patents/CN' in img_src or
                            '/patents/EP' in img_src or
                            '/patents/WO' in img_src):
                            if img_src not in seen_images:
                                seen_images.add(img_src)
                                patent_data.drawings.append(img_src)
                                
                                if not crawl_full_drawings:
                                    break
                
            except Exception as e:
                logger.warning(f"Error extracting drawings from HTML for {patent_number}: {e}")
        
        # 如果仍然没有附图，记录详细日志
        if not patent_data.drawings:
            logger.info(f"No drawings found for {patent_number}. Tried JSON-LD, figure tags, description section, and all images.")
        
        # Extract Patent Citations (引用的专利)
        if crawl_specification:
            try:
                citations = []
                # Look for citations section
                citations_section = soup.find('section', {'itemprop': 'citations'})
                if not citations_section:
                    # Try alternative selectors
                    citations_section = soup.find('div', {'id': 'citations'})
                
                if citations_section:
                    # Find all citation items
                    citation_items = citations_section.find_all('tr')
                    for item in citation_items:
                        try:
                            # Extract patent number and title
                            patent_link = item.find('a')
                            if patent_link:
                                cited_patent_number = patent_link.get_text().strip()
                                cited_title = item.find('td', {'class': 'title'})
                                cited_title_text = cited_title.get_text().strip() if cited_title else ''
                                
                                citations.append({
                                    'patent_number': cited_patent_number,
                                    'title': cited_title_text
                                })
                        except Exception as e:
                            logger.warning(f"Error parsing citation item: {e}")
                            continue
                
                patent_data.patent_citations = citations[:20]  # 限制前20条
            except Exception as e:
                logger.warning(f"Error extracting patent citations for {patent_number}: {e}")
                patent_data.patent_citations = []
        
        # Extract Cited By (被引用的专利)
        if crawl_specification:
            try:
                cited_by = []
                # Look for cited by section
                cited_by_section = soup.find('section', {'id': 'citedBy'})
                if not cited_by_section:
                    cited_by_section = soup.find('div', {'id': 'citedBy'})
                
                if cited_by_section:
                    # Find all cited by items
                    cited_items = cited_by_section.find_all('tr')
                    for item in cited_items:
                        try:
                            patent_link = item.find('a')
                            if patent_link:
                                citing_patent_number = patent_link.get_text().strip()
                                citing_title = item.find('td', {'class': 'title'})
                                citing_title_text = citing_title.get_text().strip() if citing_title else ''
                                
                                cited_by.append({
                                    'patent_number': citing_patent_number,
                                    'title': citing_title_text
                                })
                        except Exception as e:
                            logger.warning(f"Error parsing cited by item: {e}")
                            continue
                
                patent_data.cited_by = cited_by[:20]  # 限制前20条
            except Exception as e:
                logger.warning(f"Error extracting cited by for {patent_number}: {e}")
                patent_data.cited_by = []
        
        # Extract Legal Events (法律事件)
        if crawl_specification:
            try:
                legal_events = []
                # Look for legal events section
                events_section = soup.find('section', {'id': 'legalEvents'})
                if not events_section:
                    events_section = soup.find('div', {'id': 'legalEvents'})
                
                if events_section:
                    # Find all event items
                    event_items = events_section.find_all('tr')
                    for item in event_items:
                        try:
                            tds = item.find_all('td')
                            if len(tds) >= 2:
                                event_date = tds[0].get_text().strip()
                                event_description = tds[1].get_text().strip()
                                
                                legal_events.append({
                                    'date': event_date,
                                    'description': event_description
                                })
                        except Exception as e:
                            logger.warning(f"Error parsing legal event item: {e}")
                            continue
                
                patent_data.legal_events = legal_events[:20]  # 限制前20条
            except Exception as e:
                logger.warning(f"Error extracting legal events for {patent_number}: {e}")
                patent_data.legal_events = []
        
        return patent_data
    
    def scrape_patents_batch(self, patent_numbers: List[str], crawl_specification: bool = False, crawl_full_drawings: bool = False) -> List[SimplePatentResult]:
        """
        Scrape multiple patents.
        
        Args:
            patent_numbers: List of patent numbers to scrape
            crawl_specification: Whether to crawl specification fields (claims and description)
            crawl_full_drawings: Whether to crawl all drawings or just the first one for each patent
            
        Returns:
            List of SimplePatentResult objects
        """
        results = []
        
        for i, patent_number in enumerate(patent_numbers):
            logger.info(f"Scraping patent {i+1}/{len(patent_numbers)}: {patent_number}")
            
            result = self.scrape_patent(patent_number, crawl_specification=crawl_specification, crawl_full_drawings=crawl_full_drawings)
            results.append(result)
            
            # Add delay between requests (except for last one)
            if i < len(patent_numbers) - 1:
                time.sleep(self.delay)
        
        return results
    
    def close(self):
        """Close the session."""
        self.session.close()
