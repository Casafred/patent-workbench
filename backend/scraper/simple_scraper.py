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
    events_timeline: List[Dict[str, str]] = None  # 事件时间轴（申请、公开、授权等关键事件）
    legal_events: List[Dict[str, str]] = None  # 法律事件（USPTO法律状态代码：FEPP, STPP, AS等）
    similar_documents: List[Dict[str, str]] = None  # 相似文档
    # 新增字段
    classifications: List[Dict[str, str]] = None  # CPC分类信息
    landscapes: List[Dict[str, str]] = None  # 技术领域
    family_id: str = ""  # 同族ID
    family_applications: List[Dict[str, str]] = None  # 同族申请
    country_status: List[Dict[str, str]] = None  # 国家状态
    priority_date: str = ""  # 优先权日期
    external_links: Dict[str, str] = None  # 外部链接
    
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
        if self.events_timeline is None:
            self.events_timeline = []
        if self.legal_events is None:
            self.legal_events = []
        if self.similar_documents is None:
            self.similar_documents = []
        if self.classifications is None:
            self.classifications = []
        if self.landscapes is None:
            self.landscapes = []
        if self.family_applications is None:
            self.family_applications = []
        if self.country_status is None:
            self.country_status = []
        if self.external_links is None:
            self.external_links = {}
    
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
        logger.info(f"开始爬取专利: {patent_number}, crawl_specification={crawl_specification}, crawl_full_drawings={crawl_full_drawings}")
        
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
            
            # 添加调试日志
            logger.info(f"专利 {patent_number} 提取结果:")
            logger.info(f"  - 标题: {patent_data.title[:50] if patent_data.title else 'None'}...")
            logger.info(f"  - 权利要求数量: {len(patent_data.claims)}")
            logger.info(f"  - 附图数量: {len(patent_data.drawings)}")
            logger.info(f"  - 引用专利数量: {len(patent_data.patent_citations)}")
            logger.info(f"  - 被引用专利数量: {len(patent_data.cited_by)}")
            logger.info(f"  - 事件时间轴数量: {len(patent_data.events_timeline)}")
            logger.info(f"  - 法律事件数量: {len(patent_data.legal_events)}")
            
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
            
            # 方法1：从meta标签提取（最可靠）
            meta_inventors = soup.find_all('meta', {'name': 'DC.contributor', 'scheme': 'inventor'})
            if meta_inventors:
                for meta in meta_inventors:
                    inventor_name = meta.get('content', '').strip()
                    if inventor_name and inventor_name not in inventors:
                        inventors.append(inventor_name)
                logger.info(f"从meta标签提取到 {len(inventors)} 个发明人")
            
            # 方法2：从dd标签提取（备用）
            if not inventors:
                inventor_section = soup.find('dd', {'itemprop': 'inventor'})
                
                if inventor_section:
                    # First try to find spans with itemprop='name'
                    inventor_elements = inventor_section.find_all('span', {'itemprop': 'name'})
                    
                    if inventor_elements:
                        # If we found spans, use them
                        for inv in inventor_elements:
                            inventor_name = inv.get_text().strip()
                            if inventor_name and inventor_name not in ['Inventor', 'Inventors'] and inventor_name not in inventors:
                                inventors.append(inventor_name)
                    else:
                        # If no spans, get text directly from dd
                        inventor_text = inventor_section.get_text().strip()
                        if inventor_text and inventor_text not in ['Inventor', 'Inventors']:
                            inventors.append(inventor_text)
            
            patent_data.inventors = inventors
            logger.info(f"最终提取到 {len(inventors)} 个发明人")
        
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
        # 新增：识别独立权利要求和从属权利要求
        try:
            claims = []
            
            # Strategy 1: Try section with itemprop='claims'
            claims_section = soup.find('section', {'itemprop': 'claims'})
            if not claims_section:
                # Strategy 2: Try div with class='claims'
                claims_section = soup.find('div', {'class': 'claims'})
            if not claims_section:
                # Strategy 3: Try to find by text content
                for section in soup.find_all('section'):
                    if 'claims' in section.get('class', []) or 'Claims' in section.get_text()[:100]:
                        claims_section = section
                        break
            
            if claims_section:
                # Find all <li> elements with class 'claim' or 'claim-dependent'
                # Google Patents uses <li class="claim"> for independent claims
                # and <li class="claim-dependent"> for dependent claims
                claim_li_elements = claims_section.find_all('li', class_=['claim', 'claim-dependent'])
                
                if claim_li_elements:
                    logger.info(f"找到 {len(claim_li_elements)} 个<li>权利要求元素")
                    for li in claim_li_elements:
                        # Check if it's a dependent claim
                        is_dependent = 'claim-dependent' in li.get('class', [])
                        claim_type = 'dependent' if is_dependent else 'independent'

                        # Find the claim div inside the li
                        claim_div = li.find('div', {'class': 'claim'})
                        if claim_div:
                            claim_num = claim_div.get('num', '')
                            claim_texts = claim_div.find_all('div', {'class': 'claim-text'})

                            if claim_texts:
                                full_claim_text = ' '.join([ct.get_text(strip=True) for ct in claim_texts])
                                if full_claim_text and len(full_claim_text) > 10:
                                    # Format as string with claim number and type indicator
                                    prefix = f"[{claim_num}] "
                                    if is_dependent:
                                        prefix = f"[{claim_num}][从属] "
                                    claims.append(prefix + full_claim_text)
                            else:
                                claim_text = claim_div.get_text(separator=' ', strip=True)
                                if claim_text and len(claim_text) > 10:
                                    # Format as string with claim number and type indicator
                                    prefix = f"[{claim_num}] "
                                    if is_dependent:
                                        prefix = f"[{claim_num}][从属] "
                                    claims.append(prefix + claim_text)
                else:
                    # Fallback: Find all claim divs with 'num' attribute (most reliable)
                    claim_elements = claims_section.find_all('div', {'num': True, 'class': 'claim'})
                    
                    if claim_elements:
                        logger.info(f"找到 {len(claim_elements)} 个带num属性的claim元素")
                        # Extract from elements with num attribute
                        for claim in claim_elements:
                            # Get claim number from num attribute
                            claim_num = claim.get('num', '')
                            # Get all claim-text divs within this claim
                            claim_texts = claim.find_all('div', {'class': 'claim-text'})
                            
                            if claim_texts:
                                # Combine all claim-text divs
                                full_claim_text = ' '.join([ct.get_text(strip=True) for ct in claim_texts])
                                if full_claim_text and len(full_claim_text) > 10:
                                    # Fallback: treat as string for backward compatibility
                                    claims.append(full_claim_text)
                            else:
                                # Fallback: get all text from claim div
                                claim_text = claim.get_text(separator=' ', strip=True)
                                if claim_text and len(claim_text) > 10:
                                    claims.append(claim_text)
                    else:
                        # Fallback: Find all divs with class 'claim' (without num attribute)
                        logger.info("未找到带num属性的claim，尝试查找所有class='claim'的div")
                        claim_elements = claims_section.find_all('div', {'class': 'claim'})
                        
                        if claim_elements:
                            seen_claims = set()
                            for claim in claim_elements:
                                claim_text = claim.get_text(separator=' ', strip=True)
                                if claim_text and len(claim_text) > 10:
                                    # Use first 50 chars as identifier for deduplication
                                    claim_id = claim_text[:50]
                                    if claim_id not in seen_claims:
                                        seen_claims.add(claim_id)
                                        claims.append(claim_text)
                        else:
                            # Last resort: Split by claim numbers using regex
                            logger.info("未找到claim元素，尝试使用正则表达式分割")
                            full_text = claims_section.get_text(separator='\n', strip=True)
                            import re
                            claim_pattern = r'(\d+)\.\s*(.+?)(?=\d+\.|$)'
                            matches = re.findall(claim_pattern, full_text, re.DOTALL)
                            if matches:
                                for num, text in matches:
                                    claim_text = f"{num}. {text.strip()}"
                                    if len(claim_text) > 10:
                                        claims.append(claim_text)
            
            logger.info(f"提取到 {len(claims)} 条权利要求")
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
                    # 方法1: 尝试提取带有段落结构的说明书（保留换行）
                    # 查找所有description-paragraph div元素
                    paragraphs = description_section.find_all('div', {'class': 'description-paragraph'})
                    
                    if paragraphs:
                        logger.info(f"找到 {len(paragraphs)} 个说明书段落")
                        # 每个段落单独提取，用双换行符分隔
                        paragraph_texts = []
                        for para in paragraphs:
                            para_text = para.get_text(separator=' ', strip=True)
                            if para_text:
                                paragraph_texts.append(para_text)
                        
                        # 用双换行符连接段落，保留原网页的段落结构
                        description = '\n\n'.join(paragraph_texts)
                    else:
                        # 方法2: 如果没有找到段落结构，尝试查找heading和div
                        # 这种方法也尝试保留一些结构
                        content_div = description_section.find('div', {'itemprop': 'content'})
                        if content_div:
                            # 提取所有heading和div，保留结构
                            elements = content_div.find_all(['heading', 'div'])
                            text_parts = []
                            for elem in elements:
                                if elem.name == 'heading':
                                    # 标题前后加换行
                                    heading_text = elem.get_text(strip=True)
                                    if heading_text:
                                        text_parts.append(f"\n{heading_text}\n")
                                elif elem.name == 'div' and 'description-paragraph' in elem.get('class', []):
                                    # 段落后加换行
                                    para_text = elem.get_text(separator=' ', strip=True)
                                    if para_text:
                                        text_parts.append(para_text + '\n')
                            
                            description = ''.join(text_parts).strip()
                        else:
                            # 方法3: 最后备用方案，直接提取所有文本
                            description = description_section.get_text(separator=' ', strip=True)
                    
                    # 不限制说明书长度，提取完整内容
                    logger.info(f"提取到说明书，长度: {len(description)} 字符")
                
                patent_data.description = description
            except Exception as e:
                logger.warning(f"Error extracting description for {patent_number}: {e}")
                patent_data.description = ''
        else:
            patent_data.description = ''
        
        # Extract drawings using multiple strategies
        # 始终尝试提取附图，不受crawl_specification限制
        # 注意：Google Patents使用JavaScript动态加载图片，静态HTML中可能没有图片标签
        # 我们尝试从meta标签和PDF链接中提取图片信息
        if not patent_data.drawings:
            try:
                seen_images = set()
                logger.info(f"开始提取附图 for {patent_number}")
                
                # Strategy 1: Extract from PDF link (convert to image URLs)
                # Google Patents stores images at: https://patentimages.storage.googleapis.com/{hash}/{patent_number}-{page}.png
                pdf_link = soup.find('a', {'itemprop': 'pdfLink'})
                if pdf_link:
                    pdf_url = pdf_link.get('href', '')
                    logger.info(f"找到PDF链接: {pdf_url}")
                    
                    # Extract the hash from PDF URL
                    # Format: https://patentimages.storage.googleapis.com/c6/87/f6/62f66c32ba2f4e/CN104154208B.pdf
                    import re
                    match = re.search(r'patentimages\.storage\.googleapis\.com/([^/]+/[^/]+/[^/]+/[^/]+)/', pdf_url)
                    if match:
                        hash_path = match.group(1)
                        # Try to construct image URLs for first few pages
                        # Format: https://patentimages.storage.googleapis.com/{hash}/{patent_number}-{page}.png
                        max_pages = 5 if crawl_full_drawings else 1
                        for page in range(1, max_pages + 1):
                            img_url = f"https://patentimages.storage.googleapis.com/{hash_path}/{patent_number}-{page:04d}.png"
                            patent_data.drawings.append(img_url)
                            logger.info(f"构造图片URL: {img_url}")
                        
                        # If we constructed URLs, we're done
                        if patent_data.drawings:
                            logger.info(f"从PDF链接构造了 {len(patent_data.drawings)} 个图片URL")
                
                # Strategy 2: Find figure elements (fallback, usually empty in static HTML)
                if not patent_data.drawings:
                    figures = soup.find_all('figure')
                    logger.info(f"找到 {len(figures)} 个 figure 元素")
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
                                    if width and width.isdigit() and int(width) < 100:
                                        continue
                                    if height and height.isdigit() and int(height) < 100:
                                        continue
                                except:
                                    pass
                                
                                seen_images.add(img_src)
                                patent_data.drawings.append(img_src)
                                logger.info(f"从figure提取到图片: {img_src[:80]}...")
                                
                                if not crawl_full_drawings:
                                    break
                
                # Strategy 3: Find all img tags with patent-related URLs (fallback)
                if not patent_data.drawings:
                    logger.info("Strategy 2 failed, trying Strategy 3: all img tags")
                    all_imgs = soup.find_all('img')
                    logger.info(f"找到 {len(all_imgs)} 个 img 标签")
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
                        if any(pattern in img_src for pattern in ['patentimages', '/patents/US', '/patents/CN', '/patents/EP', '/patents/WO', 'patent', 'drawing']):
                            if img_src not in seen_images and len(img_src) > 50:
                                seen_images.add(img_src)
                                patent_data.drawings.append(img_src)
                                logger.info(f"从img标签提取到图片: {img_src[:80]}...")
                                
                                if not crawl_full_drawings:
                                    break
                
                logger.info(f"最终提取到 {len(patent_data.drawings)} 张附图")
                
            except Exception as e:
                logger.warning(f"Error extracting drawings from HTML for {patent_number}: {e}")
        
        # 如果仍然没有附图，记录详细日志
        if not patent_data.drawings:
            logger.warning(f"⚠️ No drawings found for {patent_number}. Google Patents loads images dynamically with JavaScript.")
        
        # Extract Patent Citations (引用的专利)
        if crawl_specification:
            try:
                citations = []
                
                # 尝试找到引用部分的表格
                # 方法1：查找带有backwardReferencesOrig属性的tr元素
                backward_refs = soup.find_all('tr', {'itemprop': 'backwardReferencesOrig'})
                family_refs = soup.find_all('tr', {'itemprop': 'backwardReferencesFamily'})
                
                all_refs = backward_refs + family_refs
                
                if all_refs:
                    logger.info(f"找到 {len(all_refs)} 个引用专利")
                    for row in all_refs:
                        try:
                            # 提取专利号
                            pub_num_elem = row.find('span', {'itemprop': 'publicationNumber'})
                            if not pub_num_elem:
                                continue
                            
                            patent_num = pub_num_elem.get_text().strip()
                            
                            # 提取链接
                            link_elem = row.find('a')
                            link = link_elem.get('href', '') if link_elem else ''
                            
                            # 提取优先权日期
                            priority_date = row.find('td', {'itemprop': 'priorityDate'})
                            priority_date = priority_date.get_text().strip() if priority_date else ''
                            
                            # 提取公开日期
                            pub_date = row.find('td', {'itemprop': 'publicationDate'})
                            pub_date = pub_date.get_text().strip() if pub_date else ''
                            
                            # 提取申请人
                            assignee = row.find('span', {'itemprop': 'assigneeOriginal'})
                            assignee = assignee.get_text().strip() if assignee else ''
                            
                            # 提取标题
                            title = row.find('td', {'itemprop': 'title'})
                            title = title.get_text().strip() if title else ''
                            
                            # 提取审查员引用标记（examinerCited）
                            examiner_cited = row.find('span', {'itemprop': 'examinerCited'})
                            is_examiner_cited = examiner_cited is not None and '*' in examiner_cited.get_text()
                            
                            if patent_num:
                                citations.append({
                                    'patent_number': patent_num,
                                    'title': title,
                                    'priority_date': priority_date,
                                    'publication_date': pub_date,
                                    'assignee': assignee,
                                    'link': f"https://patents.google.com{link}" if link.startswith('/') else link,
                                    'examiner_cited': is_examiner_cited  # 添加审查员引用标记
                                })
                        except Exception as e:
                            logger.warning(f"Error parsing citation row: {e}")
                            continue
                else:
                    # 方法2：查找包含Citations的h2标题
                    citations_h2 = None
                    for h2 in soup.find_all('h2'):
                        if 'Citations' in h2.get_text():
                            citations_h2 = h2
                            break
                    
                    if citations_h2:
                        citations_table = citations_h2.find_next('table')
                        if citations_table:
                            rows = citations_table.find_all('tr')
                            for row in rows[1:]:  # Skip header row
                                try:
                                    cells = row.find_all('td')
                                    if len(cells) >= 2:
                                        # 提取专利号
                                        patent_link = cells[0].find('a')
                                        if patent_link:
                                            cited_patent_number = patent_link.get_text().strip()
                                            # 提取标题
                                            title = cells[4].get_text().strip() if len(cells) > 4 else ''
                                            # 提取优先权日期
                                            priority_date = cells[1].get_text().strip() if len(cells) > 1 else ''
                                            # 提取公开日期
                                            pub_date = cells[2].get_text().strip() if len(cells) > 2 else ''
                                            # 提取申请人
                                            assignee = cells[3].get_text().strip() if len(cells) > 3 else ''
                                            
                                            citations.append({
                                                'patent_number': cited_patent_number,
                                                'title': title,
                                                'priority_date': priority_date,
                                                'publication_date': pub_date,
                                                'assignee': assignee
                                            })
                                except Exception as e:
                                    logger.warning(f"Error parsing citation table row: {e}")
                                    continue
                
                patent_data.patent_citations = citations  # 不限制数量，提取所有引用专利
                logger.info(f"提取到 {len(citations)} 条引用专利")
            except Exception as e:
                logger.warning(f"Error extracting patent citations for {patent_number}: {e}")
                patent_data.patent_citations = []
        
        # Extract Cited By (被引用的专利)
        if crawl_specification:
            try:
                cited_by = []
                cited_by_h3 = soup.find('h3', {'id': 'citedBy'})
                if cited_by_h3:
                    cited_by_table = cited_by_h3.find_next('table')
                    if cited_by_table:
                        rows = cited_by_table.find_all('tr')
                        for row in rows[1:]:  # Skip header row
                            try:
                                cells = row.find_all('td')
                                if len(cells) >= 2:
                                    patent_link = cells[0].find('a')
                                    if patent_link:
                                        citing_patent_number = patent_link.get_text().strip()
                                        citing_title = cells[1].get_text().strip() if len(cells) > 1 else ''
                                        
                                        cited_by.append({
                                            'patent_number': citing_patent_number,
                                            'title': citing_title
                                        })
                            except Exception as e:
                                logger.warning(f"Error parsing cited by row: {e}")
                                continue
                
                patent_data.cited_by = cited_by[:20]  # 限制前20条
                if not cited_by:
                    logger.info(f"⚠️ Cited by data not found (likely requires JavaScript rendering)")
            except Exception as e:
                logger.warning(f"Error extracting cited by for {patent_number}: {e}")
                patent_data.cited_by = []
        
        # Extract Events Timeline (事件时间轴 - 申请、公开、授权等关键事件)
        if crawl_specification:
            try:
                events_timeline = []
                
                # 查找带有events属性的dd元素
                event_elements = soup.find_all('dd', {'itemprop': 'events'})
                
                if event_elements:
                    logger.info(f"找到 {len(event_elements)} 个时间轴事件（events格式）")
                    for event_dd in event_elements:
                        try:
                            # 提取日期
                            date_elem = event_dd.find('time', {'itemprop': 'date'})
                            event_date = date_elem.get('datetime', '') if date_elem else ''
                            if not event_date and date_elem:
                                event_date = date_elem.get_text().strip()
                            
                            # 提取标题
                            title_elem = event_dd.find('span', {'itemprop': 'title'})
                            event_title = title_elem.get_text().strip() if title_elem else ''
                            
                            # 提取类型
                            type_elem = event_dd.find('span', {'itemprop': 'type'})
                            event_type = type_elem.get_text().strip() if type_elem else ''
                            
                            # 检查是否是关键事件
                            critical_elem = event_dd.find('span', {'itemprop': 'critical'})
                            is_critical = critical_elem.get('content', 'false') == 'true' if critical_elem else False
                            
                            # 检查是否是当前状态
                            current_elem = event_dd.find('span', {'itemprop': 'current'})
                            is_current = current_elem.get('content', 'false') == 'true' if current_elem else False
                            
                            # 提取文档ID（如果有）
                            doc_id_elem = event_dd.find('span', {'itemprop': 'documentId'})
                            doc_id = doc_id_elem.get_text().strip() if doc_id_elem else ''
                            
                            if event_title:
                                events_timeline.append({
                                    'date': event_date,
                                    'title': event_title,
                                    'type': event_type,
                                    'is_critical': is_critical,
                                    'is_current': is_current,
                                    'document_id': doc_id,
                                    'description': f"{event_title} ({event_type})" if event_type else event_title
                                })
                        except Exception as e:
                            logger.warning(f"Error parsing event dd: {e}")
                            continue
                
                patent_data.events_timeline = events_timeline[:20]  # 限制前20条
                logger.info(f"提取到 {len(events_timeline)} 个时间轴事件")
            except Exception as e:
                logger.warning(f"Error extracting events timeline for {patent_number}: {e}")
                patent_data.events_timeline = []
        
        # Extract Legal Events (法律事件 - USPTO法律状态代码)
        if crawl_specification:
            try:
                legal_events = []
                
                # 方法1：查找带有legalEvents属性的tr元素
                legal_event_rows = soup.find_all('tr', {'itemprop': 'legalEvents'})
                
                if legal_event_rows:
                    logger.info(f"找到 {len(legal_event_rows)} 个法律事件（legalEvents格式）")
                    for row in legal_event_rows:
                        try:
                            # 提取日期
                            date_elem = row.find('time', {'itemprop': 'date'})
                            event_date = date_elem.get('datetime', '') if date_elem else ''
                            if not event_date:
                                # 尝试从第一个td获取日期
                                date_cell = row.find('td')
                                event_date = date_cell.get_text().strip() if date_cell else ''
                            
                            # 提取代码
                            code_elem = row.find('td', {'itemprop': 'code'})
                            event_code = code_elem.get_text().strip() if code_elem else ''
                            
                            # 提取标题
                            title_elem = row.find('td', {'itemprop': 'title'})
                            event_title = title_elem.get_text().strip() if title_elem else ''
                            
                            # 提取自由格式文本
                            free_format_text = ''
                            attributes = row.find_all('p', {'itemprop': 'attributes'})
                            for attr in attributes:
                                label = attr.find('strong', {'itemprop': 'label'})
                                value = attr.find('span', {'itemprop': 'value'})
                                if label and value and label.get_text().strip() == 'Free format text':
                                    free_format_text = value.get_text().strip()
                                    break
                            
                            # 构建完整描述
                            description = f"{event_title} - {free_format_text}" if free_format_text else event_title
                            
                            legal_events.append({
                                'date': event_date,
                                'code': event_code,
                                'title': event_title,
                                'description': description,
                                'free_format_text': free_format_text
                            })
                        except Exception as e:
                            logger.warning(f"Error parsing legal event row: {e}")
                            continue
                
                # 方法2：查找包含Legal Events的h2标题（备用）
                if not legal_events:
                    legal_h2 = None
                    for h2 in soup.find_all('h2'):
                        if 'Legal Events' in h2.get_text():
                            legal_h2 = h2
                            break
                    
                    if legal_h2:
                        legal_table = legal_h2.find_next('table')
                        if legal_table:
                            rows = legal_table.find_all('tr')
                            for row in rows[1:]:  # Skip header row
                                try:
                                    cells = row.find_all('td')
                                    if len(cells) >= 2:
                                        event_date = cells[0].get_text().strip()
                                        event_code = cells[1].get_text().strip() if len(cells) > 1 else ''
                                        event_description = cells[2].get_text().strip() if len(cells) > 2 else cells[1].get_text().strip()
                                        
                                        legal_events.append({
                                            'date': event_date,
                                            'code': event_code,
                                            'description': event_description
                                        })
                                except Exception as e:
                                    logger.warning(f"Error parsing legal event table row: {e}")
                                    continue
                
                patent_data.legal_events = legal_events[:30]  # 限制前30条
                logger.info(f"提取到 {len(legal_events)} 个法律事件")
            except Exception as e:
                logger.warning(f"Error extracting legal events for {patent_number}: {e}")
                patent_data.legal_events = []
            except Exception as e:
                logger.warning(f"Error extracting legal events for {patent_number}: {e}")
                patent_data.legal_events = []
        
        # Extract Similar Documents (相似文档)
        if crawl_specification:
            try:
                similar_documents = []
                # 查找带有similarDocuments属性的tr元素
                similar_rows = soup.find_all('tr', {'itemprop': 'similarDocuments'})
                
                if similar_rows:
                    logger.info(f"找到 {len(similar_rows)} 个相似文档")
                    for row in similar_rows:
                        try:
                            is_patent_elem = row.find('meta', {'itemprop': 'isPatent'})
                            is_patent = is_patent_elem.get('content', 'false') == 'true' if is_patent_elem else False
                            
                            if is_patent:
                                patent_link = row.find('a')
                                if patent_link:
                                    patent_number_elem = row.find('span', {'itemprop': 'publicationNumber'})
                                    language_elem = row.find('span', {'itemprop': 'primaryLanguage'})
                                    
                                    patent_number = patent_number_elem.get_text().strip() if patent_number_elem else ''
                                    language = language_elem.get_text().strip() if language_elem else ''
                                    link = patent_link.get('href', '')
                                    
                                    if patent_number:
                                        similar_documents.append({
                                            'patent_number': patent_number,
                                            'language': language,
                                            'link': f"https://patents.google.com{link}" if link.startswith('/') else link
                                        })
                        except Exception as e:
                            logger.warning(f"Error parsing similar document row: {e}")
                            continue
                
                patent_data.similar_documents = similar_documents[:10]  # 限制前10条
                logger.info(f"提取到 {len(similar_documents)} 个相似文档")
            except Exception as e:
                logger.warning(f"Error extracting similar documents for {patent_number}: {e}")
                patent_data.similar_documents = []
        
        # Extract CPC Classifications (CPC分类信息) - 始终提取
        try:
            classifications = []
            
            # 查找分类部分
            classifications_section = soup.find('section')
            if classifications_section:
                # 查找所有带有itemprop='classifications'的ul元素
                classification_lists = soup.find_all('ul', {'itemprop': 'classifications'})
                
                for ul in classification_lists:
                    # 每个ul代表一个完整的分类路径
                    classification_items = ul.find_all('li', {'itemprop': 'classifications'})
                    
                    if classification_items:
                        # 构建完整的分类路径
                        codes = []
                        descriptions = []
                        is_cpc = False
                        is_leaf = False
                        
                        for item in classification_items:
                            code_elem = item.find('span', {'itemprop': 'Code'})
                            desc_elem = item.find('span', {'itemprop': 'Description'})
                            
                            if code_elem:
                                codes.append(code_elem.get_text().strip())
                            if desc_elem:
                                descriptions.append(desc_elem.get_text().strip())
                            
                            # 检查是否为CPC分类
                            is_cpc_meta = item.find('meta', {'itemprop': 'IsCPC'})
                            if is_cpc_meta and is_cpc_meta.get('content') == 'true':
                                is_cpc = True
                            
                            # 检查是否为叶子节点
                            is_leaf_meta = item.find('meta', {'itemprop': 'Leaf'})
                            if is_leaf_meta and is_leaf_meta.get('content') == 'true':
                                is_leaf = True
                        
                        if codes:
                            classifications.append({
                                'code': ' → '.join(codes),  # 完整分类路径
                                'description': ' → '.join(descriptions),
                                'leaf_code': codes[-1] if codes else '',  # 最终分类代码
                                'leaf_description': descriptions[-1] if descriptions else '',
                                'is_cpc': is_cpc,
                                'is_leaf': is_leaf
                            })
            
            patent_data.classifications = classifications[:20]  # 限制前20条
            logger.info(f"提取到 {len(classifications)} 个分类信息")
        except Exception as e:
            logger.warning(f"Error extracting classifications for {patent_number}: {e}")
            patent_data.classifications = []
        
        # Extract Landscapes (技术领域) - 始终提取
        try:
            landscapes = []
            
            # 查找技术领域部分
            landscapes_section = None
            for section in soup.find_all('section'):
                h2 = section.find('h2')
                if h2 and 'Landscapes' in h2.get_text():
                    landscapes_section = section
                    break
            
            if landscapes_section:
                landscape_items = landscapes_section.find_all('li', {'itemprop': 'landscapes'})
                
                for item in landscape_items:
                    name_elem = item.find('span', {'itemprop': 'name'})
                    type_elem = item.find('span', {'itemprop': 'type'})
                    
                    if name_elem:
                        landscapes.append({
                            'name': name_elem.get_text().strip(),
                            'type': type_elem.get_text().strip() if type_elem else ''
                        })
            
            patent_data.landscapes = landscapes
            logger.info(f"提取到 {len(landscapes)} 个技术领域")
        except Exception as e:
            logger.warning(f"Error extracting landscapes for {patent_number}: {e}")
            patent_data.landscapes = []
        
        # Extract Priority Date (优先权日期) - 始终提取
        try:
            if not patent_data.priority_date:
                priority_date_elem = soup.find('time', {'itemprop': 'priorityDate'})
                if priority_date_elem:
                    patent_data.priority_date = priority_date_elem.get('datetime', '') or priority_date_elem.get_text().strip()
                    logger.info(f"提取到优先权日期: {patent_data.priority_date}")
        except Exception as e:
            logger.warning(f"Error extracting priority date for {patent_number}: {e}")
        
        # Extract External Links (外部链接) - 始终提取
        try:
            external_links = {}
            
            # 方法1: 直接查找所有带有itemprop='links'的li元素
            link_items = soup.find_all('li', {'itemprop': 'links'})
            
            if link_items:
                for item in link_items:
                    id_elem = item.find('meta', {'itemprop': 'id'})
                    url_elem = item.find('a', {'itemprop': 'url'})
                    text_elem = item.find('span', {'itemprop': 'text'})
                    
                    if id_elem and url_elem:
                        link_id = id_elem.get('content', '')
                        link_url = url_elem.get('href', '')
                        link_text = text_elem.get_text().strip() if text_elem else link_id
                        
                        if link_id and link_url:
                            external_links[link_id] = {
                                'text': link_text,
                                'url': link_url
                            }
            else:
                # 方法2: 查找Links标题后的ul
                for h2 in soup.find_all('h2'):
                    if 'Links' in h2.get_text():
                        links_ul = h2.find_next('ul')
                        if links_ul:
                            link_items = links_ul.find_all('li')
                            for item in link_items:
                                id_elem = item.find('meta', {'itemprop': 'id'})
                                url_elem = item.find('a')
                                text_elem = item.find('span', {'itemprop': 'text'})
                                
                                if id_elem and url_elem:
                                    link_id = id_elem.get('content', '')
                                    link_url = url_elem.get('href', '')
                                    link_text = text_elem.get_text().strip() if text_elem else link_id
                                    
                                    if link_id and link_url:
                                        external_links[link_id] = {
                                            'text': link_text,
                                            'url': link_url
                                        }
                        break
            
            patent_data.external_links = external_links
            logger.info(f"提取到 {len(external_links)} 个外部链接")
        except Exception as e:
            logger.warning(f"Error extracting external links for {patent_number}: {e}")
            patent_data.external_links = {}
        
        # Extract Family Information (同族信息) - 当crawl_specification=True时提取
        if crawl_specification:
            try:
                # Extract Family ID
                family_section = soup.find('section', {'itemprop': 'family'})
                if family_section:
                    # 提取Family ID
                    family_id_h2 = None
                    for h2 in family_section.find_all('h2'):
                        if 'ID=' in h2.get_text():
                            family_id_text = h2.get_text().strip()
                            patent_data.family_id = family_id_text.replace('ID=', '').strip()
                            logger.info(f"提取到同族ID: {patent_data.family_id}")
                            break
                    
                    # Extract Family Applications (同族申请)
                    family_applications = []
                    
                    # 方法1: 查找Family Applications表格
                    family_apps_h2 = None
                    for h2 in family_section.find_all('h2'):
                        if 'Family Applications' in h2.get_text():
                            family_apps_h2 = h2
                            break
                    
                    if family_apps_h2:
                        family_table = family_apps_h2.find_next('table')
                        if family_table:
                            rows = family_table.find_all('tr', {'itemprop': 'applications'})
                            
                            for row in rows:
                                try:
                                    app_num_elem = row.find('span', {'itemprop': 'applicationNumber'})
                                    status_elem = row.find('span', {'itemprop': 'ifiStatus'})
                                    expiration_elem = row.find('span', {'itemprop': 'ifiExpiration'})
                                    pub_num_elem = row.find('span', {'itemprop': 'representativePublication'})
                                    lang_elem = row.find('span', {'itemprop': 'primaryLanguage'})
                                    
                                    # 提取日期
                                    priority_date_td = row.find('td', {'itemprop': 'priorityDate'})
                                    filing_date_td = row.find('td', {'itemprop': 'filingDate'})
                                    title_td = row.find('td', {'itemprop': 'title'})
                                    
                                    # 提取链接
                                    link_elem = row.find('a')
                                    
                                    if app_num_elem:
                                        family_applications.append({
                                            'application_number': app_num_elem.get_text().strip(),
                                            'status': status_elem.get_text().strip() if status_elem else '',
                                            'expiration': expiration_elem.get_text().strip() if expiration_elem else '',
                                            'publication_number': pub_num_elem.get_text().strip() if pub_num_elem else '',
                                            'language': lang_elem.get_text().strip() if lang_elem else '',
                                            'priority_date': priority_date_td.get_text().strip() if priority_date_td else '',
                                            'filing_date': filing_date_td.get_text().strip() if filing_date_td else '',
                                            'title': title_td.get_text().strip() if title_td else '',
                                            'link': f"https://patents.google.com{link_elem.get('href')}" if link_elem and link_elem.get('href', '').startswith('/') else (link_elem.get('href', '') if link_elem else '')
                                        })
                                except Exception as e:
                                    logger.warning(f"Error parsing family application row: {e}")
                                    continue
                    
                    # 方法2: 补充提取"Also Published As"部分的worldwide application信息（docdbFamily）
                    # 这部分信息通常包含更完整的同族专利信息
                    also_published_rows = soup.find_all('tr', {'itemprop': 'docdbFamily'})
                    if also_published_rows:
                        logger.info(f"找到 {len(also_published_rows)} 个worldwide application (docdbFamily)")
                        for row in also_published_rows:
                            try:
                                pub_num_elem = row.find('span', {'itemprop': 'publicationNumber'})
                                lang_elem = row.find('span', {'itemprop': 'primaryLanguage'})
                                pub_date_td = row.find('td', {'itemprop': 'publicationDate'})
                                link_elem = row.find('a')
                                
                                if pub_num_elem:
                                    pub_number = pub_num_elem.get_text().strip()
                                    
                                    # 检查是否已经存在（避免重复）
                                    already_exists = any(
                                        app.get('publication_number') == pub_number 
                                        for app in family_applications
                                    )
                                    
                                    if not already_exists:
                                        family_applications.append({
                                            'application_number': '',  # docdbFamily通常没有申请号
                                            'status': '',
                                            'expiration': '',
                                            'publication_number': pub_number,
                                            'language': lang_elem.get_text().strip() if lang_elem else '',
                                            'priority_date': '',
                                            'filing_date': '',
                                            'publication_date': pub_date_td.get_text().strip() if pub_date_td else '',
                                            'title': '',
                                            'link': f"https://patents.google.com{link_elem.get('href')}" if link_elem and link_elem.get('href', '').startswith('/') else (link_elem.get('href', '') if link_elem else ''),
                                            'source': 'worldwide'  # 标记来源
                                        })
                            except Exception as e:
                                logger.warning(f"Error parsing docdbFamily row: {e}")
                                continue
                    
                    patent_data.family_applications = family_applications[:30]  # 增加限制到30条以包含更多同族信息
                    logger.info(f"提取到 {len(family_applications)} 个同族申请（包含worldwide application）")
                    
                    # Extract Country Status (国家状态)
                    country_status = []
                    
                    # 查找Country Status表格
                    country_status_h2 = None
                    for h2 in family_section.find_all('h2'):
                        if 'Country Status' in h2.get_text():
                            country_status_h2 = h2
                            break
                    
                    if country_status_h2:
                        country_table = country_status_h2.find_next('table')
                        if country_table:
                            rows = country_table.find_all('tr', {'itemprop': 'countryStatus'})
                            
                            for row in rows:
                                try:
                                    country_code_elem = row.find('span', {'itemprop': 'countryCode'})
                                    num_elem = row.find('span', {'itemprop': 'num'})
                                    pub_num_elem = row.find('span', {'itemprop': 'representativePublication'})
                                    lang_elem = row.find('span', {'itemprop': 'primaryLanguage'})
                                    this_country_elem = row.find('meta', {'itemprop': 'thisCountry'})
                                    
                                    # 提取链接
                                    link_elem = row.find('a')
                                    
                                    if country_code_elem:
                                        country_status.append({
                                            'country_code': country_code_elem.get_text().strip(),
                                            'count': num_elem.get_text().strip() if num_elem else '1',
                                            'publication_number': pub_num_elem.get_text().strip() if pub_num_elem else '',
                                            'language': lang_elem.get_text().strip() if lang_elem else '',
                                            'is_this_country': this_country_elem.get('content') == 'true' if this_country_elem else False,
                                            'link': f"https://patents.google.com{link_elem.get('href')}" if link_elem and link_elem.get('href', '').startswith('/') else (link_elem.get('href', '') if link_elem else '')
                                        })
                                except Exception as e:
                                    logger.warning(f"Error parsing country status row: {e}")
                                    continue
                    
                    patent_data.country_status = country_status
                    logger.info(f"提取到 {len(country_status)} 个国家状态")
                    
            except Exception as e:
                logger.warning(f"Error extracting family information for {patent_number}: {e}")
                patent_data.family_applications = []
                patent_data.country_status = []
        
        # Improve Cited By extraction (改进被引用专利提取)
        if crawl_specification:
            try:
                cited_by = []
                
                # 方法1: 查找Family section中的"Families Citing this family"
                family_section = soup.find('section', {'itemprop': 'family'})
                if family_section:
                    families_citing_h2 = None
                    for h2 in family_section.find_all('h2'):
                        if 'Families Citing this family' in h2.get_text():
                            families_citing_h2 = h2
                            break
                    
                    if families_citing_h2:
                        citing_table = families_citing_h2.find_next('table')
                        if citing_table:
                            rows = citing_table.find_all('tr', {'itemprop': 'forwardReferencesFamily'})
                            
                            for row in rows:
                                try:
                                    pub_num_elem = row.find('span', {'itemprop': 'publicationNumber'})
                                    lang_elem = row.find('span', {'itemprop': 'primaryLanguage'})
                                    examiner_cited_elem = row.find('span', {'itemprop': 'examinerCited'})
                                    
                                    # 提取日期
                                    priority_date_td = row.find('td', {'itemprop': 'priorityDate'})
                                    pub_date_td = row.find('td', {'itemprop': 'publicationDate'})
                                    
                                    # 提取申请人
                                    assignee_elem = row.find('span', {'itemprop': 'assigneeOriginal'})
                                    
                                    # 提取标题
                                    title_td = row.find('td', {'itemprop': 'title'})
                                    
                                    # 提取链接
                                    link_elem = row.find('a')
                                    
                                    if pub_num_elem:
                                        cited_by.append({
                                            'patent_number': pub_num_elem.get_text().strip(),
                                            'language': lang_elem.get_text().strip() if lang_elem else '',
                                            'examiner_cited': '*' in examiner_cited_elem.get_text() if examiner_cited_elem else False,
                                            'priority_date': priority_date_td.get_text().strip() if priority_date_td else '',
                                            'publication_date': pub_date_td.get_text().strip() if pub_date_td else '',
                                            'assignee': assignee_elem.get_text().strip() if assignee_elem else '',
                                            'title': title_td.get_text().strip() if title_td else '',
                                            'link': f"https://patents.google.com{link_elem.get('href')}" if link_elem and link_elem.get('href', '').startswith('/') else (link_elem.get('href', '') if link_elem else '')
                                        })
                                except Exception as e:
                                    logger.warning(f"Error parsing cited by row: {e}")
                                    continue
                
                # 如果找到了数据，更新patent_data
                if cited_by:
                    patent_data.cited_by = cited_by[:20]  # 限制前20条
                    logger.info(f"提取到 {len(cited_by)} 个被引用专利")
                else:
                    logger.info(f"⚠️ Cited by data not found (likely requires JavaScript rendering)")
            except Exception as e:
                logger.warning(f"Error extracting cited by for {patent_number}: {e}")
        
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
