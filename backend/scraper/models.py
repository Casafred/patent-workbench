"""
Data models for the enhanced patent scraper.
"""

from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any, Union
import re
from datetime import datetime


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
        self.inventors = [self._clean_text(inv) for inv in self.inventors if inv and self._clean_text(inv)]
        self.assignees = [self._clean_text(ass) for ass in self.assignees if ass and self._clean_text(ass)]
        
        # Normalize claims
        if isinstance(self.claims, list):
            self.claims = [self._clean_text(claim) for claim in self.claims if claim and self._clean_text(claim)]
        elif isinstance(self.claims, str):
            cleaned_claims = self._clean_text(self.claims)
            self.claims = [cleaned_claims] if cleaned_claims else []
        else:
            self.claims = []
        
        # Normalize description
        self.description = self._clean_text(self.description) if self.description else ""
        
        # Set default values for missing dates
        if not self.application_date:
            self.application_date = "无信息"
        if not self.publication_date:
            self.publication_date = "无信息"
        
        # Normalize patent number
        self.patent_number = self._normalize_patent_number(self.patent_number)
            
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
    
    def _normalize_patent_number(self, patent_number: str) -> str:
        """Normalize patent number format."""
        if not patent_number:
            return ""
        
        # Remove extra whitespace
        patent_number = patent_number.strip()
        
        # Convert to uppercase for consistency
        patent_number = patent_number.upper()
        
        return patent_number
    
    def get_summary(self) -> Dict[str, Any]:
        """Get a summary of the patent data."""
        return {
            'patent_number': self.patent_number,
            'title': self.title[:100] + '...' if len(self.title) > 100 else self.title,
            'abstract_length': len(self.abstract),
            'inventors_count': len(self.inventors),
            'assignees_count': len(self.assignees),
            'claims_count': len(self.claims),
            'has_description': bool(self.description),
            'application_date': self.application_date,
            'publication_date': self.publication_date
        }
    
    def validate_completeness(self) -> Dict[str, bool]:
        """Validate completeness of patent data fields."""
        return {
            'has_patent_number': bool(self.patent_number),
            'has_title': bool(self.title and self.title != "无标题"),
            'has_abstract': bool(self.abstract and self.abstract != "无摘要"),
            'has_inventors': bool(self.inventors),
            'has_assignees': bool(self.assignees),
            'has_application_date': bool(self.application_date and self.application_date != "无信息"),
            'has_publication_date': bool(self.publication_date and self.publication_date != "无信息"),
            'has_claims': bool(self.claims),
            'has_description': bool(self.description)
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
    timestamp: Optional[datetime] = None
    
    def __post_init__(self):
        """Set timestamp if not provided."""
        if self.timestamp is None:
            self.timestamp = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary format, compatible with existing API response."""
        result = {
            'patent_number': self.patent_number,
            'success': self.success,
            'processing_time': self.processing_time,
            'retry_count': self.retry_count,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }
        
        if self.success and self.data:
            result['data'] = self.data.to_dict()
            result['url'] = f"https://patents.google.com/patent/{self.patent_number}"
        else:
            result['error'] = self.error or "Unknown error"
            
        return result
    
    def get_status_summary(self) -> str:
        """Get a human-readable status summary."""
        if self.success:
            return f"✅ {self.patent_number}: Success ({self.processing_time:.2f}s)"
        else:
            return f"❌ {self.patent_number}: Failed - {self.error}"


@dataclass
class ScrapingStats:
    """Statistics for batch scraping operations."""
    
    total_patents: int = 0
    successful_patents: int = 0
    failed_patents: int = 0
    total_processing_time: float = 0.0
    average_processing_time: float = 0.0
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    
    def __post_init__(self):
        """Initialize start time if not provided."""
        if self.start_time is None:
            self.start_time = datetime.now()
    
    def update(self, result: PatentResult) -> None:
        """Update statistics with a new result."""
        self.total_patents += 1
        self.total_processing_time += result.processing_time
        
        if result.success:
            self.successful_patents += 1
        else:
            self.failed_patents += 1
            
        self.average_processing_time = self.total_processing_time / self.total_patents
    
    def finish(self) -> None:
        """Mark the scraping session as finished."""
        self.end_time = datetime.now()
    
    def get_success_rate(self) -> float:
        """Get success rate as a percentage."""
        if self.total_patents == 0:
            return 0.0
        return (self.successful_patents / self.total_patents) * 100
    
    def get_total_duration(self) -> Optional[float]:
        """Get total duration in seconds."""
        if self.start_time and self.end_time:
            return (self.end_time - self.start_time).total_seconds()
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
            'total_duration': self.get_total_duration(),
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None
        }
    
    def get_summary_report(self) -> str:
        """Get a formatted summary report."""
        duration = self.get_total_duration()
        duration_str = f"{duration:.2f}s" if duration else "N/A"
        
        return f"""
Scraping Statistics Summary:
===========================
Total Patents: {self.total_patents}
Successful: {self.successful_patents}
Failed: {self.failed_patents}
Success Rate: {self.get_success_rate():.1f}%
Average Processing Time: {self.average_processing_time:.2f}s
Total Duration: {duration_str}
        """.strip()


@dataclass
class BatchRequest:
    """Request model for batch patent scraping."""
    
    patent_numbers: List[str]
    config: Optional[Dict[str, Any]] = None
    request_id: Optional[str] = None
    timestamp: Optional[datetime] = None
    
    def __post_init__(self):
        """Initialize timestamp and request_id if not provided."""
        if self.timestamp is None:
            self.timestamp = datetime.now()
        
        if self.request_id is None:
            self.request_id = f"batch_{self.timestamp.strftime('%Y%m%d_%H%M%S')}"
    
    def validate(self) -> List[str]:
        """Validate batch request and return list of issues."""
        issues = []
        
        if not self.patent_numbers:
            issues.append("patent_numbers cannot be empty")
        
        if len(self.patent_numbers) > 50:
            issues.append("patent_numbers cannot exceed 50 items")
        
        # Check for duplicates
        if len(self.patent_numbers) != len(set(self.patent_numbers)):
            issues.append("patent_numbers contains duplicates")
        
        # Validate patent number formats (basic check)
        invalid_patents = []
        for patent_num in self.patent_numbers:
            if not patent_num or not isinstance(patent_num, str) or len(patent_num.strip()) < 3:
                invalid_patents.append(patent_num)
        
        if invalid_patents:
            issues.append(f"Invalid patent numbers: {invalid_patents}")
        
        return issues
    
    def is_valid(self) -> bool:
        """Check if batch request is valid."""
        return len(self.validate()) == 0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary format."""
        return {
            'patent_numbers': self.patent_numbers,
            'config': self.config,
            'request_id': self.request_id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'patent_count': len(self.patent_numbers)
        }