"""
Data extraction engine for Google Patents scraper.

This module implements multiple extraction strategies to handle different
data formats and layouts on Google Patents pages.
"""

import json
import re
import logging
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, Union
from bs4 import BeautifulSoup, Tag

from .models import PatentData
from .constants import SELECTORS

logger = logging.getLogger(__name__)


class BaseExtractor(ABC):
    """Base class for patent data extractors."""
    
    def __init__(self):
        self.name = self.__class__.__name__
    
    @abstractmethod
    def can_extract(self, page_content: str, soup: BeautifulSoup) -> bool:
        """
        Check if this extractor can handle the given page content.
        
        Args:
            page_content: Raw HTML content
            soup: BeautifulSoup parsed content
            
        Returns:
            True if this extractor can handle the content
        """
        pass
    
    @abstractmethod
    def extract(self, patent_number: str, page_content: str, soup: BeautifulSoup) -> Optional[PatentData]:
        """
        Extract patent data from the page content.
        
        Args:
            patent_number: Patent number being extracted
            page_content: Raw HTML content
            soup: BeautifulSoup parsed content
            
        Returns:
            PatentData object or None if extraction failed
        """
        pass
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text content."""
        if not text:
            return ""
        
        # Remove extra whitespace and normalize
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Remove common HTML entities
        text = text.replace('&nbsp;', ' ')
        text = text.replace('&amp;', '&')
        text = text.replace('&lt;', '<')
        text = text.replace('&gt;', '>')
        text = text.replace('&quot;', '"')
        text = text.replace('&#39;', "'")
        
        return text
    
    def _extract_text_from_element(self, element: Optional[Tag]) -> str:
        """Extract and clean text from a BeautifulSoup element."""
        if not element:
            return ""
        return self._clean_text(element.get_text())
    
    def _extract_list_from_elements(self, elements: List[Tag]) -> List[str]:
        """Extract text list from multiple BeautifulSoup elements."""
        result = []
        for element in elements:
            text = self._extract_text_from_element(element)
            if text and text not in result:
                result.append(text)
        return result


class JSONLDExtractor(BaseExtractor):
    """Extractor for JSON-LD structured data."""
    
    def can_extract(self, page_content: str, soup: BeautifulSoup) -> bool:
        """Check if JSON-LD data is available."""
        json_ld_script = soup.find('script', type='application/ld+json')
        return json_ld_script is not None
    
    def extract(self, patent_number: str, page_content: str, soup: BeautifulSoup) -> Optional[PatentData]:
        """Extract patent data from JSON-LD structured data."""
        try:
            json_ld_script = soup.find('script', type='application/ld+json')
            if not json_ld_script:
                return None
            
            ld_data = json.loads(json_ld_script.string)
            logger.debug(f"Found JSON-LD data for {patent_number}")
            
            # Handle different JSON-LD structures
            patent_info = None
            
            if '@graph' in ld_data:
                # Graph structure
                for item in ld_data['@graph']:
                    if item.get('@type') == 'Patent':
                        patent_info = item
                        break
            elif ld_data.get('@type') == 'Patent':
                # Direct patent object
                patent_info = ld_data
            elif isinstance(ld_data, list):
                # Array of objects
                for item in ld_data:
                    if item.get('@type') == 'Patent':
                        patent_info = item
                        break
            
            if not patent_info:
                logger.warning(f"No patent data found in JSON-LD for {patent_number}")
                return None
            
            # Extract data from JSON-LD
            patent_data = PatentData(patent_number=patent_number)
            
            # Basic information
            patent_data.title = self._clean_text(patent_info.get('name', ''))
            patent_data.abstract = self._clean_text(patent_info.get('abstract', ''))
            patent_data.description = self._clean_text(patent_info.get('description', ''))
            
            # Dates
            patent_data.application_date = patent_info.get('filingDate', '')
            patent_data.publication_date = patent_info.get('publicationDate', '')
            
            # Inventors
            inventors = patent_info.get('inventor', [])
            if isinstance(inventors, list):
                patent_data.inventors = [
                    self._clean_text(inv.get('name', '')) 
                    for inv in inventors 
                    if inv.get('name')
                ]
            elif isinstance(inventors, dict) and inventors.get('name'):
                patent_data.inventors = [self._clean_text(inventors['name'])]
            
            # Assignees
            assignees = patent_info.get('assignee', [])
            if isinstance(assignees, list):
                patent_data.assignees = [
                    self._clean_text(ass.get('name', '')) 
                    for ass in assignees 
                    if ass.get('name')
                ]
            elif isinstance(assignees, dict) and assignees.get('name'):
                patent_data.assignees = [self._clean_text(assignees['name'])]
            
            # Claims (if available in JSON-LD)
            claims = patent_info.get('claims', [])
            if isinstance(claims, list):
                patent_data.claims = [self._clean_text(claim) for claim in claims if claim]
            elif isinstance(claims, str):
                patent_data.claims = [self._clean_text(claims)] if claims else []
            
            # URL
            patent_data.url = f"https://patents.google.com/patent/{patent_number}"
            
            logger.info(f"Successfully extracted patent data from JSON-LD for {patent_number}")
            return patent_data.normalize()
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON-LD for {patent_number}: {e}")
            return None
        except Exception as e:
            logger.error(f"Error extracting from JSON-LD for {patent_number}: {e}")
            return None


class HTMLExtractor(BaseExtractor):
    """Extractor for HTML content using CSS selectors."""
    
    def can_extract(self, page_content: str, soup: BeautifulSoup) -> bool:
        """Check if HTML content has recognizable patent structure."""
        # Look for common patent page elements
        title_element = soup.find('h1') or soup.find(SELECTORS['title'])
        return title_element is not None
    
    def extract(self, patent_number: str, page_content: str, soup: BeautifulSoup) -> Optional[PatentData]:
        """Extract patent data from HTML structure."""
        try:
            patent_data = PatentData(patent_number=patent_number)
            
            # Extract title
            title_element = (
                soup.find('h1') or 
                soup.find(SELECTORS['title']) or
                soup.find('title')
            )
            patent_data.title = self._extract_text_from_element(title_element)
            
            # Extract abstract
            abstract_element = (
                soup.find('div', id='abstract') or
                soup.find('div', class_='abstract') or
                soup.find(SELECTORS['abstract'])
            )
            patent_data.abstract = self._extract_text_from_element(abstract_element)
            
            # Extract inventors
            inventors = []
            inventor_section = (
                soup.find('div', id='inventor') or
                soup.find('section', class_='inventor') or
                soup.find(SELECTORS['inventors'])
            )
            
            if inventor_section:
                # Try different patterns for inventor names
                inventor_elements = (
                    inventor_section.find_all('span') or
                    inventor_section.find_all('div', class_='inventor-name') or
                    inventor_section.find_all('a')
                )
                
                for element in inventor_elements:
                    text = self._extract_text_from_element(element)
                    if text and text not in ['Inventors', 'Inventor'] and len(text) > 2:
                        inventors.append(text)
            
            patent_data.inventors = inventors
            
            # Extract assignees
            assignees = []
            assignee_section = (
                soup.find('div', id='assignee') or
                soup.find('section', class_='assignee') or
                soup.find(SELECTORS['assignees'])
            )
            
            if assignee_section:
                assignee_elements = (
                    assignee_section.find_all('span') or
                    assignee_section.find_all('div', class_='assignee-name') or
                    assignee_section.find_all('a')
                )
                
                for element in assignee_elements:
                    text = self._extract_text_from_element(element)
                    if text and text not in ['Assignees', 'Assignee'] and len(text) > 2:
                        assignees.append(text)
            
            patent_data.assignees = assignees
            
            # Extract dates
            self._extract_dates(soup, patent_data)
            
            # Extract claims
            self._extract_claims(soup, patent_data)
            
            # Extract description
            self._extract_description(soup, patent_data)
            
            # Set URL
            patent_data.url = f"https://patents.google.com/patent/{patent_number}"
            
            logger.info(f"Successfully extracted patent data from HTML for {patent_number}")
            return patent_data.normalize()
            
        except Exception as e:
            logger.error(f"Error extracting from HTML for {patent_number}: {e}")
            return None
    
    def _extract_dates(self, soup: BeautifulSoup, patent_data: PatentData) -> None:
        """Extract application and publication dates."""
        try:
            # Look for date sections
            date_sections = soup.find_all(['div', 'section'], class_=re.compile(r'date|filing|publication'))
            
            for section in date_sections:
                text = section.get_text().lower()
                date_text = self._extract_text_from_element(section)
                
                if 'filing' in text or 'application' in text:
                    # Extract date pattern
                    date_match = re.search(r'\d{4}-\d{2}-\d{2}|\d{2}/\d{2}/\d{4}|\d{1,2}/\d{1,2}/\d{4}', date_text)
                    if date_match:
                        patent_data.application_date = date_match.group()
                
                elif 'publication' in text or 'published' in text:
                    date_match = re.search(r'\d{4}-\d{2}-\d{2}|\d{2}/\d{2}/\d{4}|\d{1,2}/\d{1,2}/\d{4}', date_text)
                    if date_match:
                        patent_data.publication_date = date_match.group()
        
        except Exception as e:
            logger.warning(f"Failed to extract dates: {e}")
    
    def _extract_claims(self, soup: BeautifulSoup, patent_data: PatentData) -> None:
        """Extract patent claims."""
        try:
            claims = []
            
            # Look for claims section
            claims_section = (
                soup.find('div', id='claims') or
                soup.find('section', class_='claims') or
                soup.find(SELECTORS['claims'])
            )
            
            if claims_section:
                # Try different patterns for claims
                claim_elements = (
                    claims_section.find_all('div', class_='claim') or
                    claims_section.find_all('p') or
                    claims_section.find_all('li')
                )
                
                for element in claim_elements:
                    claim_text = self._extract_text_from_element(element)
                    if claim_text and len(claim_text) > 20:  # Filter out short non-claim text
                        claims.append(claim_text)
            
            patent_data.claims = claims[:50]  # Limit to first 50 claims
            
        except Exception as e:
            logger.warning(f"Failed to extract claims: {e}")
    
    def _extract_description(self, soup: BeautifulSoup, patent_data: PatentData) -> None:
        """Extract patent description."""
        try:
            description_parts = []
            
            # Look for description section
            description_section = (
                soup.find('div', id='description') or
                soup.find('section', class_='description') or
                soup.find(SELECTORS['description'])
            )
            
            if description_section:
                # Extract paragraphs
                paragraphs = description_section.find_all('p')
                for para in paragraphs[:10]:  # Limit to first 10 paragraphs
                    para_text = self._extract_text_from_element(para)
                    if para_text and len(para_text) > 20:
                        description_parts.append(para_text)
            
            patent_data.description = ' '.join(description_parts)
            
        except Exception as e:
            logger.warning(f"Failed to extract description: {e}")


class FallbackExtractor(BaseExtractor):
    """Fallback extractor for when other methods fail."""
    
    def can_extract(self, page_content: str, soup: BeautifulSoup) -> bool:
        """Always returns True as this is the fallback."""
        return True
    
    def extract(self, patent_number: str, page_content: str, soup: BeautifulSoup) -> Optional[PatentData]:
        """Extract basic patent data using simple heuristics."""
        try:
            patent_data = PatentData(patent_number=patent_number)
            
            # Try to find title using various methods
            title_candidates = [
                soup.find('h1'),
                soup.find('title'),
                soup.find('meta', attrs={'property': 'og:title'}),
                soup.find('meta', attrs={'name': 'title'})
            ]
            
            for candidate in title_candidates:
                if candidate:
                    if candidate.name == 'meta':
                        title = candidate.get('content', '')
                    else:
                        title = self._extract_text_from_element(candidate)
                    
                    if title and len(title) > 5:
                        patent_data.title = title
                        break
            
            # Try to find abstract in meta tags or common containers
            abstract_candidates = [
                soup.find('meta', attrs={'name': 'description'}),
                soup.find('meta', attrs={'property': 'og:description'}),
                soup.find('div', class_=re.compile(r'abstract|summary')),
                soup.find('p', class_=re.compile(r'abstract|summary'))
            ]
            
            for candidate in abstract_candidates:
                if candidate:
                    if candidate.name == 'meta':
                        abstract = candidate.get('content', '')
                    else:
                        abstract = self._extract_text_from_element(candidate)
                    
                    if abstract and len(abstract) > 20:
                        patent_data.abstract = abstract
                        break
            
            # Try to extract any text that looks like inventor names
            text_content = soup.get_text()
            inventor_patterns = [
                r'Inventor[s]?[:\s]+([A-Z][a-z]+ [A-Z][a-z]+(?:, [A-Z][a-z]+ [A-Z][a-z]+)*)',
                r'发明人[:\s]+([^\n]+)',
            ]
            
            for pattern in inventor_patterns:
                match = re.search(pattern, text_content)
                if match:
                    inventors_text = match.group(1)
                    patent_data.inventors = [
                        name.strip() for name in inventors_text.split(',') 
                        if name.strip()
                    ]
                    break
            
            # Set URL
            patent_data.url = f"https://patents.google.com/patent/{patent_number}"
            
            # Only return if we found at least title or abstract
            if patent_data.title or patent_data.abstract:
                logger.info(f"Fallback extraction successful for {patent_number}")
                return patent_data.normalize()
            else:
                logger.warning(f"Fallback extraction found no useful data for {patent_number}")
                return None
            
        except Exception as e:
            logger.error(f"Fallback extraction failed for {patent_number}: {e}")
            return None


class DataExtractionEngine:
    """Main data extraction engine that coordinates multiple extractors."""
    
    def __init__(self):
        self.extractors = [
            JSONLDExtractor(),
            HTMLExtractor(),
            FallbackExtractor()
        ]
        logger.info(f"Initialized data extraction engine with {len(self.extractors)} extractors")
    
    def extract_patent_data(self, patent_number: str, page_content: str) -> Optional[PatentData]:
        """
        Extract patent data using the best available extractor.
        
        Args:
            patent_number: Patent number being extracted
            page_content: Raw HTML content from the page
            
        Returns:
            PatentData object or None if all extractors failed
        """
        if not page_content or not page_content.strip():
            logger.error(f"Empty page content for {patent_number}")
            return None
        
        try:
            # Parse HTML content
            soup = BeautifulSoup(page_content, 'lxml')
            
            # Try each extractor in order of preference
            for extractor in self.extractors:
                try:
                    if extractor.can_extract(page_content, soup):
                        logger.debug(f"Using {extractor.name} for {patent_number}")
                        
                        result = extractor.extract(patent_number, page_content, soup)
                        if result and result.is_valid():
                            logger.info(f"Successfully extracted data for {patent_number} using {extractor.name}")
                            return result
                        else:
                            logger.warning(f"{extractor.name} returned invalid data for {patent_number}")
                
                except Exception as e:
                    logger.error(f"{extractor.name} failed for {patent_number}: {e}")
                    continue
            
            logger.error(f"All extractors failed for {patent_number}")
            return None
            
        except Exception as e:
            logger.error(f"Error parsing page content for {patent_number}: {e}")
            return None
    
    def get_extractor_info(self) -> List[Dict[str, str]]:
        """Get information about available extractors."""
        return [
            {
                'name': extractor.name,
                'description': extractor.__doc__ or 'No description available'
            }
            for extractor in self.extractors
        ]
    
    def test_extractors(self, patent_number: str, page_content: str) -> Dict[str, Any]:
        """
        Test all extractors on given content and return results.
        
        Args:
            patent_number: Patent number for testing
            page_content: HTML content to test
            
        Returns:
            Dictionary with test results for each extractor
        """
        results = {}
        
        try:
            soup = BeautifulSoup(page_content, 'lxml')
            
            for extractor in self.extractors:
                try:
                    can_extract = extractor.can_extract(page_content, soup)
                    result = None
                    error = None
                    
                    if can_extract:
                        result = extractor.extract(patent_number, page_content, soup)
                    
                    results[extractor.name] = {
                        'can_extract': can_extract,
                        'success': result is not None and result.is_valid() if result else False,
                        'data_summary': result.get_summary() if result else None,
                        'error': error
                    }
                    
                except Exception as e:
                    results[extractor.name] = {
                        'can_extract': False,
                        'success': False,
                        'data_summary': None,
                        'error': str(e)
                    }
            
        except Exception as e:
            logger.error(f"Error testing extractors: {e}")
            results['error'] = str(e)
        
        return results