"""
Data models for the enhanced patent scraper.
"""

from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any, Union
import re
from datetime import datetime
import json


@dataclass
class PatentData:
    """Patent data model compatible with existing API."""
    
    patent_number: str
    title: str = ""
    abstract: str = ""
    inventors: List[str] = field(default_factory=list)
    assignees: List[str] = field(default_factory=list)
    application_date: str = ""
    publication_date: str = ""
    claims: List[str] = field(default_factory=list)
    description: str = ""
    url: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary format, compatible with existing API."""
        return asdict(self)
    
    def is_valid(self) -> bool:
        """Check if the patent data is valid."""
        return bool(self.patent_number and (self.title or self.abstract))
    
    def normalize(self) -> 'PatentData':
        """Normalize patent data for consistency."""
        # Clean and normalize text fields
        self.title = self._clean_text(self.title) if self.title else "无标题"
        self.abstract = self._clean_text(self.abstract) if self.abstract else "无摘要"
        
        # Normalize inventors and assignees
        self.inventors = [self._clean_text(inv) for inv in self.inventors if self._clean_text(inv)]
        self.assignees = [self._clean_text(ass) for ass in self.assignees if self._clean_text(ass)]
        
        # Normalize claims
        if isinstance(self.claims, list):
            self.claims = [self._clean_text(claim) for claim in self.claims if self._clean_text(claim)]
        elif isinstance(self.claims, str):
            cleaned_claims = self._clean_text(self.claims)
            self.claims = [cleaned_claims] if cleaned_claims else []
        else:
            self.claims = []
        
        # Normalize description
        self.description = self._clean_text(self.description) if self.description else ""
        
        # Normalize dates
        self.application_date = self._normalize_date(self.application_date)
        self.publication_date = self._normalize_date(self.publication_date)
        
        # Ensure URL is set
        if not self.url and self.patent_number:
            self.url = f"https://patents.google.com/patent/{self.patent_number}"
            
        return self
    
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
        
        return text
    
    def _normalize_date(self, date_str: str) -> str:
        """Normalize date string to consistent format."""
        if not date_str or date_str in ["无信息", "N/A", ""]:
            return "无信息"
        
        # Try to parse and reformat common date formats
        date_patterns = [
            r'(\d{4})-(\d{1,2})-(\d{1,2})',  # YYYY-MM-DD
            r'(\d{1,2})/(\d{1,2})/(\d{4})',  # MM/DD/YYYY
            r'(\d{4})年(\d{1,2})月(\d{1,2})日',  # Chinese format
        ]
        
        for pattern in date_patterns:
            match = re.search(pattern, date_str)
            if match:
                try:
                    if '年' in pattern:  # Chinese format
                        year, month, day = match.groups()
                    elif '-' in pattern:  # ISO format
                        year, month, day = match.groups()
                    else:  # US format
                        month, day, year = match.groups()
                    
                    # Validate date
                    datetime(int(year), int(month), int(day))
                    return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                except ValueError:
                    continue
        
        # Return original if no pattern matches or date is invalid
        return date_str
    
    def get_summary(self) -> Dict[str, Any]:
        """Get a summary of the patent data."""
        return {
            'patent_number': self.patent_number,
            'title': self.title[:100] + '...' if len(self.title) > 100 else self.title,
            'has_abstract': bool(self.abstract and self.abstract != "无摘要"),
            'inventor_count': len(self.inventors),
            'assignee_count': len(self.assignees),
            'claims_count': len(self.claims),
            'has_description': bool(self.description),
            'application_date': self.application_date,
            'publication_date': self.publication_date
        }
    
    def to_legacy_format(self) -> Dict[str, Any]:
        """Convert to legacy API format for backward compatibility."""
        return {
            'patent_number': self.patent_number,
            'title': self.title,
            'abstract': self.abstract,
            'inventors': self.inventors,
            'assignees': self.assignees,
            'application_date': self.application_date,
            'publication_date': self.publication_date,
            'claims': self.claims,
            'description': self.description,
            'url': self.url
        }


@dataclass
class PatentResult:
    """Result model for patent scraping operations."""
    
    patent_number: str
    success: bool
    data: Optional[PatentData] = None
    error: Optional[str] = None
    processing_time: float = 0.0
    retry_count: int = 0
    timestamp: Optional[str] = None
    
    def __post_init__(self):
        """Set timestamp if not provided."""
        if self.timestamp is None:
            self.timestamp = datetime.now().isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary format, compatible with existing API response."""
        result = {
            'patent_number': self.patent_number,
            'success': self.success,
            'processing_time': self.processing_time,
            'retry_count': self.retry_count,
            'timestamp': self.timestamp
        }
        
        if self.success and self.data:
            result['data'] = self.data.to_dict()
            result['url'] = f"https://patents.google.com/patent/{self.patent_number}"
        else:
            result['error'] = self.error or "Unknown error"
            
        return result
    
    def to_legacy_format(self) -> Dict[str, Any]:
        """Convert to legacy API format for backward compatibility."""
        result = {
            'patent_number': self.patent_number,
            'success': self.success
        }
        
        if self.success and self.data:
            result['data'] = self.data.to_legacy_format()
            result['url'] = f"https://patents.google.com/patent/{self.patent_number}"
        else:
            result['error'] = self.error or "Unknown error"
            
        return result


@dataclass
class ScrapingStats:
    """Statistics for batch scraping operations."""
    
    total_patents: int = 0
    successful_patents: int = 0
    failed_patents: int = 0
    total_processing_time: float = 0.0
    average_processing_time: float = 0.0
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    
    def __post_init__(self):
        """Set start time if not provided."""
        if self.start_time is None:
            self.start_time = datetime.now().isoformat()
    
    def start_batch(self) -> None:
        """Mark the start of a batch operation."""
        self.start_time = datetime.now().isoformat()
        self.total_patents = 0
        self.successful_patents = 0
        self.failed_patents = 0
        self.total_processing_time = 0.0
        self.average_processing_time = 0.0
        self.end_time = None
    
    def finish_batch(self) -> None:
        """Mark the end of a batch operation."""
        self.end_time = datetime.now().isoformat()
    
    def update(self, result: PatentResult) -> None:
        """Update statistics with a new result."""
        self.total_patents += 1
        self.total_processing_time += result.processing_time
        
        if result.success:
            self.successful_patents += 1
        else:
            self.failed_patents += 1
            
        self.average_processing_time = self.total_processing_time / self.total_patents
    
    def get_success_rate(self) -> float:
        """Get success rate as percentage."""
        if self.total_patents == 0:
            return 0.0
        return (self.successful_patents / self.total_patents) * 100
    
    def get_duration(self) -> Optional[float]:
        """Get total duration in seconds."""
        if not self.start_time or not self.end_time:
            return None
        
        try:
            start = datetime.fromisoformat(self.start_time)
            end = datetime.fromisoformat(self.end_time)
            return (end - start).total_seconds()
        except ValueError:
            return None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert statistics to dictionary."""
        return {
            'total_patents': self.total_patents,
            'successful_patents': self.successful_patents,
            'failed_patents': self.failed_patents,
            'success_rate': self.get_success_rate(),
            'total_processing_time': self.total_processing_time,
            'average_processing_time': self.average_processing_time,
            'start_time': self.start_time,
            'end_time': self.end_time,
            'duration_seconds': self.get_duration()
        }


@dataclass
class BatchRequest:
    """Request model for batch patent scraping."""
    
    patent_numbers: List[str]
    config: Optional[Dict[str, Any]] = None
    callback_url: Optional[str] = None
    request_id: Optional[str] = None
    
    def __post_init__(self):
        """Generate request ID if not provided."""
        if self.request_id is None:
            import uuid
            self.request_id = str(uuid.uuid4())
    
    def validate(self) -> List[str]:
        """Validate the batch request."""
        errors = []
        
        if not self.patent_numbers:
            errors.append("patent_numbers cannot be empty")
        
        if len(self.patent_numbers) > 50:
            errors.append("Maximum 50 patent numbers allowed per batch")
        
        # Validate patent number formats (basic validation)
        invalid_patents = []
        for patent_num in self.patent_numbers:
            if not self._is_valid_patent_number(patent_num):
                invalid_patents.append(patent_num)
        
        if invalid_patents:
            errors.append(f"Invalid patent numbers: {invalid_patents[:5]}")  # Show first 5
        
        return errors
    
    def _is_valid_patent_number(self, patent_num: str) -> bool:
        """Basic validation for patent number format."""
        if not patent_num or not isinstance(patent_num, str):
            return False
        
        # Remove whitespace
        patent_num = patent_num.strip()
        
        # Basic length check
        if len(patent_num) < 3 or len(patent_num) > 20:
            return False
        
        # Should contain at least some alphanumeric characters
        if not re.search(r'[A-Za-z0-9]', patent_num):
            return False
        
        return True
    
    def get_unique_patents(self) -> List[str]:
        """Get unique patent numbers, preserving order."""
        seen = set()
        unique_patents = []
        
        for patent_num in self.patent_numbers:
            cleaned = patent_num.strip().upper()
            if cleaned not in seen:
                seen.add(cleaned)
                unique_patents.append(patent_num.strip())
        
        return unique_patents