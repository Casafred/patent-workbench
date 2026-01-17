"""
Data models for the enhanced patent scraper.
"""

from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any


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
        self.title = self.title.strip() if self.title else "无标题"
        self.abstract = self.abstract.strip() if self.abstract else "无摘要"
        
        # Normalize inventors and assignees
        self.inventors = [inv.strip() for inv in self.inventors if inv.strip()]
        self.assignees = [ass.strip() for ass in self.assignees if ass.strip()]
        
        # Normalize claims
        if isinstance(self.claims, list):
            self.claims = [claim.strip() for claim in self.claims if claim.strip()]
        elif isinstance(self.claims, str):
            self.claims = [self.claims.strip()] if self.claims.strip() else []
        else:
            self.claims = []
        
        # Normalize description
        self.description = self.description.strip() if self.description else ""
        
        # Set default values for missing dates
        if not self.application_date:
            self.application_date = "无信息"
        if not self.publication_date:
            self.publication_date = "无信息"
            
        return self


@dataclass
class PatentResult:
    """Result model for patent scraping operations."""
    
    patent_number: str
    success: bool
    data: Optional[PatentData] = None
    error: Optional[str] = None
    processing_time: float = 0.0
    retry_count: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary format, compatible with existing API response."""
        result = {
            'patent_number': self.patent_number,
            'success': self.success,
            'processing_time': self.processing_time,
            'retry_count': self.retry_count
        }
        
        if self.success and self.data:
            result['data'] = self.data.to_dict()
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
    
    def update(self, result: PatentResult) -> None:
        """Update statistics with a new result."""
        self.total_patents += 1
        self.total_processing_time += result.processing_time
        
        if result.success:
            self.successful_patents += 1
        else:
            self.failed_patents += 1
            
        self.average_processing_time = self.total_processing_time / self.total_patents
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert statistics to dictionary."""
        return {
            'total_patents': self.total_patents,
            'successful_patents': self.successful_patents,
            'failed_patents': self.failed_patents,
            'success_rate': self.successful_patents / self.total_patents if self.total_patents > 0 else 0.0,
            'total_processing_time': self.total_processing_time,
            'average_processing_time': self.average_processing_time
        }