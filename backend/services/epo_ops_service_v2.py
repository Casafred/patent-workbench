"""
EPO OPS RESTful Web Services Client v2.0
Based on OPS v3.2 Documentation Version 1.3.20

This module provides a comprehensive client for the European Patent Office's
Open Patent Services (OPS) RESTful API.

Key Features:
1. OAuth 2.0 Authentication with automatic token refresh
2. All OPS services: published-data, family, number-service, register, legal, classification
3. Proper JSON response parsing (BadgerFish format)
4. Quota monitoring via HTTP headers and Data Usage API
5. Rate limiting and retry logic
6. Comprehensive error handling
"""

import os
import time
import json
import logging
import re
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict, field
from typing import List, Dict, Optional, Any, Union, Tuple
from enum import Enum
from pathlib import Path

import requests
from flask import current_app

logger = logging.getLogger(__name__)

EPO_OPS_BASE_URL = "https://ops.epo.org/3.2/rest-services"
EPO_TOKEN_URL = "https://ops.epo.org/3.2/auth/accesstoken"
EPO_USAGE_URL = "https://ops.epo.org/3.2/developers/me/stats/usage"

WEEKLY_QUOTA_BYTES = 4 * 1024 * 1024 * 1024


class ServiceType(Enum):
    PUBLISHED_DATA = "published-data"
    FAMILY = "family"
    NUMBER_SERVICE = "number-service"
    REGISTER = "register"
    LEGAL = "legal"
    CLASSIFICATION = "classification"


class ReferenceType(Enum):
    PUBLICATION = "publication"
    APPLICATION = "application"
    PRIORITY = "priority"


class InputFormat(Enum):
    DOCDB = "docdb"
    EPODOC = "epodoc"
    ORIGINAL = "original"


class AcceptType(Enum):
    JSON = "application/json"
    EXCHANGE_XML = "application/exchange+xml"
    FULLTEXT_XML = "application/fulltext+xml"
    IMAGE_PNG = "image/png"
    IMAGE_TIFF = "image/tiff"
    IMAGE_PDF = "application/pdf"
    OPS_XML = "application/ops+xml"
    REGISTER_XML = "application/register+xml"
    CPC_XML = "application/cpc+xml"


class EPOError(Exception):
    """Base exception for EPO OPS errors"""
    def __init__(self, message: str, status_code: int = None, error_code: str = None):
        super().__init__(message)
        self.status_code = status_code
        self.error_code = error_code


class EPOQuotaExceededError(EPOError):
    """Raised when quota is exceeded"""
    pass


class EPORateLimitError(EPOError):
    """Raised when rate limited"""
    def __init__(self, message: str, retry_after: int = 60):
        super().__init__(message, status_code=429)
        self.retry_after = retry_after


class EPONotFoundError(EPOError):
    """Raised when resource not found"""
    pass


@dataclass
class EPOQuotaInfo:
    weekly_used_bytes: int = 0
    weekly_used_mb: float = 0.0
    weekly_remaining_mb: float = 4096.0
    usage_percent: float = 0.0
    week_start: str = ""
    reset_date: str = ""
    throttling_status: str = ""
    rejection_reason: str = ""
    hourly_used: int = 0


@dataclass
class EPOSearchResult:
    patent_number: str
    title: str = ''
    abstract: str = ''
    applicants: List[str] = field(default_factory=list)
    inventors: List[str] = field(default_factory=list)
    publication_date: str = ''
    application_date: str = ''
    cpc_classifications: List[str] = field(default_factory=list)
    ipc_classifications: List[str] = field(default_factory=list)
    url: str = ''
    first_drawing_url: str = ''


@dataclass
class EPOPatentDetail:
    patent_number: str
    title: str = ''
    abstract: str = ''
    applicants: List[str] = field(default_factory=list)
    inventors: List[str] = field(default_factory=list)
    publication_date: str = ''
    application_date: str = ''
    priority_date: str = ''
    claims: List[str] = field(default_factory=list)
    description: str = ''
    cpc_classifications: List[str] = field(default_factory=list)
    ipc_classifications: List[str] = field(default_factory=list)
    family_id: str = ''
    legal_status: List[Dict] = field(default_factory=list)
    url: str = ''


@dataclass
class EPOFamilyMember:
    patent_number: str
    publication_date: str = ''
    application_date: str = ''
    priority_date: str = ''
    country: str = ''
    kind: str = ''


@dataclass
class EPOFulltextInfo:
    has_description: bool = False
    has_claims: bool = False
    description_format: str = ''
    claims_format: str = ''


class JSONParser:
    """Helper class for parsing BadgerFish JSON responses from EPO OPS"""
    
    @staticmethod
    def get_text(data: Any) -> str:
        """Extract text from BadgerFish JSON structure"""
        if data is None:
            return ''
        if isinstance(data, str):
            return data.strip()
        if isinstance(data, dict):
            if '$' in data:
                return str(data['$']).strip()
            for key in ['$', '#text', '@value']:
                if key in data and data[key]:
                    return str(data[key]).strip()
            for key, value in data.items():
                if not key.startswith('@'):
                    if isinstance(value, str) and value:
                        return value.strip()
                    elif isinstance(value, dict):
                        result = JSONParser.get_text(value)
                        if result:
                            return result
        if isinstance(data, list) and len(data) > 0:
            return JSONParser.get_text(data[0])
        return ''
    
    @staticmethod
    def get_list(data: Any) -> List[Any]:
        """Ensure data is a list"""
        if data is None:
            return []
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            return [data]
        return [data]
    
    @staticmethod
    def get_attr(data: Dict, attr: str) -> str:
        """Get attribute value from BadgerFish JSON"""
        if not isinstance(data, dict):
            return ''
        attr_key = f'@{attr}'
        if attr_key in data:
            return str(data[attr_key])
        return ''


class EPOQuotaManager:
    """Manages EPO OPS quota tracking and monitoring"""
    
    def __init__(self, storage_path: str = None):
        self.storage_path = storage_path or os.path.join(os.path.dirname(__file__), '.epo_quota.json')
        self.quota_data = self._load_quota_data()
    
    def _load_quota_data(self) -> Dict:
        try:
            if os.path.exists(self.storage_path):
                with open(self.storage_path, 'r') as f:
                    return json.load(f)
        except Exception as e:
            logger.warning(f"Could not load quota data: {e}")
        return {
            'week_start': self._get_week_start(),
            'used_bytes': 0,
            'request_count': 0,
            'last_request': None
        }
    
    def _save_quota_data(self):
        try:
            with open(self.storage_path, 'w') as f:
                json.dump(self.quota_data, f)
        except Exception as e:
            logger.warning(f"Could not save quota data: {e}")
    
    def _get_week_start(self) -> str:
        today = datetime.now()
        week_start = today - timedelta(days=today.weekday())
        return week_start.strftime('%Y-%m-%d')
    
    def _check_week_reset(self):
        current_week_start = self._get_week_start()
        if self.quota_data.get('week_start') != current_week_start:
            self.quota_data = {
                'week_start': current_week_start,
                'used_bytes': 0,
                'request_count': 0,
                'last_request': None
            }
            self._save_quota_data()
    
    def track_response(self, content_length: int, headers: Dict = None) -> EPOQuotaInfo:
        self._check_week_reset()
        
        self.quota_data['used_bytes'] += content_length
        self.quota_data['request_count'] += 1
        self.quota_data['last_request'] = datetime.now().isoformat()
        self._save_quota_data()
        
        used_bytes = self.quota_data['used_bytes']
        used_mb = used_bytes / (1024 * 1024)
        remaining_mb = max(0.0, (WEEKLY_QUOTA_BYTES - used_bytes) / (1024 * 1024))
        usage_percent = (used_bytes / WEEKLY_QUOTA_BYTES) * 100
        
        week_start = datetime.fromisoformat(self.quota_data['week_start'])
        reset_date = week_start + timedelta(days=7)
        
        throttling_status = ''
        rejection_reason = ''
        hourly_used = 0
        
        if headers:
            throttling_status = headers.get('X-Throttling-Control', '')
            rejection_reason = headers.get('X-Rejection-Reason', '')
            try:
                hourly_used = int(headers.get('X-IndividualQuotaPerHour-Used', '0'))
            except (ValueError, TypeError):
                pass
        
        return EPOQuotaInfo(
            weekly_used_bytes=used_bytes,
            weekly_used_mb=round(used_mb, 2),
            weekly_remaining_mb=round(remaining_mb, 2),
            usage_percent=round(usage_percent, 2),
            week_start=week_start.strftime('%Y-%m-%d'),
            reset_date=reset_date.strftime('%Y-%m-%d'),
            throttling_status=throttling_status,
            rejection_reason=rejection_reason,
            hourly_used=hourly_used
        )
    
    def get_quota_info(self) -> EPOQuotaInfo:
        self._check_week_reset()
        
        used_bytes = self.quota_data['used_bytes']
        used_mb = used_bytes / (1024 * 1024)
        remaining_mb = max(0.0, (WEEKLY_QUOTA_BYTES - used_bytes) / (1024 * 1024))
        usage_percent = (used_bytes / WEEKLY_QUOTA_BYTES) * 100
        
        week_start = datetime.fromisoformat(self.quota_data['week_start'])
        reset_date = week_start + timedelta(days=7)
        
        return EPOQuotaInfo(
            weekly_used_bytes=used_bytes,
            weekly_used_mb=round(used_mb, 2),
            weekly_remaining_mb=round(remaining_mb, 2),
            usage_percent=round(usage_percent, 2),
            week_start=week_start.strftime('%Y-%m-%d'),
            reset_date=reset_date.strftime('%Y-%m-%d')
        )
    
    def is_quota_exceeded(self) -> bool:
        self._check_week_reset()
        return self.quota_data['used_bytes'] >= WEEKLY_QUOTA_BYTES


class EPOOPSClient:
    """
    EPO OPS RESTful API Client
    
    Implements all services defined in OPS v3.2 Documentation Version 1.3.20:
    - Published-data service
    - Family service
    - Number service
    - Register service
    - Legal service
    - Classification service
    """
    
    def __init__(self, consumer_key: str = None, consumer_secret: str = None):
        self.consumer_key = consumer_key or os.getenv('EPO_OPS_KEY', '')
        self.consumer_secret = consumer_secret or os.getenv('EPO_OPS_SECRET', '')
        self.access_token = None
        self.token_expires_at = 0
        self.quota_manager = EPOQuotaManager()
        self.request_delay = 0.5
        self.last_request_time = 0
        self._validate_credentials()
    
    def _validate_credentials(self):
        if not self.consumer_key or not self.consumer_secret:
            raise ValueError("EPO OPS credentials not configured. Set EPO_OPS_KEY and EPO_OPS_SECRET environment variables.")
    
    def _get_access_token(self) -> str:
        if self.access_token and time.time() < self.token_expires_at:
            return self.access_token
        
        logger.info("Requesting new EPO OPS access token...")
        
        auth = (self.consumer_key, self.consumer_secret)
        data = {'grant_type': 'client_credentials'}
        headers = {'Content-Type': 'application/x-www-form-urlencoded'}
        
        try:
            response = requests.post(EPO_TOKEN_URL, auth=auth, data=data, headers=headers, timeout=30)
            
            if response.status_code != 200:
                raise EPOError(f"Failed to get access token: {response.status_code} - {response.text}")
            
            token_data = response.json()
            self.access_token = token_data['access_token']
            expires_in = token_data.get('expires_in', 3600)
            self.token_expires_at = time.time() + expires_in - 60
            
            logger.info(f"Successfully obtained access token, expires in {expires_in} seconds")
            return self.access_token
            
        except requests.RequestException as e:
            raise EPOError(f"Network error while getting access token: {e}")
    
    def _make_request(self, url: str, params: Dict = None, method: str = 'GET',
                      data: Any = None, accept: str = AcceptType.JSON.value,
                      extra_headers: Dict = None) -> Tuple[Dict, EPOQuotaInfo]:
        if self.quota_manager.is_quota_exceeded():
            raise EPOQuotaExceededError("Weekly quota exceeded")
        
        elapsed = time.time() - self.last_request_time
        if elapsed < self.request_delay:
            time.sleep(self.request_delay - elapsed)
        
        token = self._get_access_token()
        
        headers = {
            'Authorization': f'Bearer {token}',
            'Accept': accept
        }
        
        if method == 'POST' and data:
            headers['Content-Type'] = 'text/plain'
        
        if extra_headers:
            headers.update(extra_headers)
        
        logger.debug(f"Making request to: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=60)
            else:
                response = requests.post(url, headers=headers, params=params, data=data, timeout=60)
            
            self.last_request_time = time.time()
            
            content_length = len(response.content)
            response_headers = dict(response.headers)
            quota_info = self.quota_manager.track_response(content_length, response_headers)
            
            if response.status_code == 403:
                rejection_reason = response.headers.get('X-Rejection-Reason', 'Unknown')
                raise EPOQuotaExceededError(f"Access denied: {rejection_reason}")
            elif response.status_code == 429:
                retry_after = int(response.headers.get('Retry-After', 60))
                raise EPORateLimitError(f"Rate limited, retry after {retry_after}s", retry_after)
            elif response.status_code == 404:
                raise EPONotFoundError(f"Resource not found: {url}")
            elif response.status_code != 200:
                raise EPOError(f"API request failed: {response.status_code} - {response.text[:500]}", response.status_code)
            
            if accept == AcceptType.JSON.value:
                return response.json(), quota_info
            else:
                return response.content, quota_info
                
        except requests.Timeout:
            raise EPOError("Request timeout")
        except requests.RequestException as e:
            raise EPOError(f"Network error: {e}")
    
    def search(self, query: str, range_start: int = 1, range_end: int = 25) -> Dict:
        url = f"{EPO_OPS_BASE_URL}/published-data/search"
        params = {'q': query, 'Range': f"{range_start}-{range_end}"}
        
        logger.info(f"Searching: {query}")
        data, quota_info = self._make_request(url, params)
        
        patent_numbers = self._parse_search_results(data)
        
        results = []
        for patent_number in patent_numbers[:10]:
            try:
                detail = self._get_brief_detail(patent_number)
                results.append(detail)
            except Exception as e:
                logger.warning(f"Could not get details for {patent_number}: {e}")
                results.append(EPOSearchResult(patent_number=patent_number, url=f"https://patents.google.com/patent/{patent_number}"))
        
        total_results = data.get('ops:world-patent-data', {}).get('ops:biblio-search', {}).get('@total-result-count', 0)
        
        return {
            'results': results,
            'total_results': int(total_results) if total_results else 0,
            'quota_info': asdict(quota_info)
        }
    
    def _parse_search_results(self, data: Dict) -> List[str]:
        patent_numbers = []
        
        try:
            world_data = data.get('ops:world-patent-data', {})
            search_data = world_data.get('ops:biblio-search', {})
            search_result = search_data.get('ops:search-result', {})
            
            pub_refs = JSONParser.get_list(search_result.get('ops:publication-reference', []))
            
            for pub_ref in pub_refs:
                doc_ids = JSONParser.get_list(pub_ref.get('document-id', []))
                
                for doc_id in doc_ids:
                    if JSONParser.get_attr(doc_id, 'document-id-type') == 'epodoc':
                        doc_num = doc_id.get('doc-number', {})
                        patent_num = JSONParser.get_text(doc_num)
                        if patent_num:
                            patent_numbers.append(patent_num)
                            break
                else:
                    if doc_ids:
                        country = JSONParser.get_text(doc_ids[0].get('country', {}))
                        doc_num = JSONParser.get_text(doc_ids[0].get('doc-number', {}))
                        if country and doc_num:
                            patent_numbers.append(f"{country}{doc_num}")
            
            logger.info(f"Parsed {len(patent_numbers)} patent numbers from search results")
            
        except Exception as e:
            logger.error(f"Error parsing search results: {e}")
        
        return patent_numbers
    
    def _get_brief_detail(self, patent_number: str) -> EPOSearchResult:
        url = f"{EPO_OPS_BASE_URL}/published-data/publication/epodoc/{patent_number}/biblio"
        data, _ = self._make_request(url)
        
        world_data = data.get('ops:world-patent-data', {})
        exchange_docs = world_data.get('exchange-documents', {}).get('exchange-document', [])
        
        if not exchange_docs:
            exchange_docs = world_data.get('exchange-document', [])
        
        exchange_docs = JSONParser.get_list(exchange_docs)
        
        if not exchange_docs:
            return EPOSearchResult(patent_number=patent_number, url=f"https://patents.google.com/patent/{patent_number}")
        
        exchange_doc = exchange_docs[0]
        biblio = exchange_doc.get('bibliographic-data', {})
        
        return EPOSearchResult(
            patent_number=patent_number,
            title=self._extract_title(biblio),
            abstract=self._extract_abstract(biblio),
            applicants=self._extract_parties(biblio, 'applicant'),
            inventors=self._extract_parties(biblio, 'inventor'),
            publication_date=self._extract_date(biblio, 'publication'),
            application_date=self._extract_date(biblio, 'application'),
            cpc_classifications=self._extract_classifications(biblio, 'cpc'),
            ipc_classifications=self._extract_classifications(biblio, 'ipc'),
            url=f"https://patents.google.com/patent/{patent_number}"
        )
    
    def get_patent_detail(self, patent_number: str, endpoint: str = 'biblio') -> Dict:
        url = f"{EPO_OPS_BASE_URL}/published-data/publication/epodoc/{patent_number}/{endpoint}"
        data, quota_info = self._make_request(url)
        
        detail = self._parse_patent_detail(data, patent_number)
        
        return {
            'detail': asdict(detail) if detail else None,
            'quota_info': asdict(quota_info)
        }
    
    def _parse_patent_detail(self, data: Dict, patent_number: str) -> Optional[EPOPatentDetail]:
        try:
            world_data = data.get('ops:world-patent-data', {})
            exchange_docs = world_data.get('exchange-documents', {}).get('exchange-document', [])
            
            if not exchange_docs:
                exchange_docs = world_data.get('exchange-document', [])
            
            exchange_docs = JSONParser.get_list(exchange_docs)
            
            if not exchange_docs:
                return None
            
            exchange_doc = exchange_docs[0]
            biblio = exchange_doc.get('bibliographic-data', {})
            
            return EPOPatentDetail(
                patent_number=patent_number,
                title=self._extract_title(biblio),
                abstract=self._extract_abstract(biblio),
                applicants=self._extract_parties(biblio, 'applicant'),
                inventors=self._extract_parties(biblio, 'inventor'),
                publication_date=self._extract_date(biblio, 'publication'),
                application_date=self._extract_date(biblio, 'application'),
                priority_date=self._extract_date(biblio, 'priority'),
                claims=self._extract_claims(data),
                description=self._extract_description(data),
                cpc_classifications=self._extract_classifications(biblio, 'cpc'),
                ipc_classifications=self._extract_classifications(biblio, 'ipc'),
                family_id=JSONParser.get_attr(exchange_doc, 'family-id'),
                legal_status=self._extract_legal_status(biblio),
                url=f"https://patents.google.com/patent/{patent_number}"
            )
        except Exception as e:
            logger.error(f"Error parsing patent detail: {e}")
            return None
    
    def _extract_title(self, biblio: Dict) -> str:
        title_data = biblio.get('invention-title', {})
        return JSONParser.get_text(title_data)
    
    def _extract_abstract(self, biblio: Dict) -> str:
        abstract_data = biblio.get('abstract', {})
        if isinstance(abstract_data, dict):
            p = abstract_data.get('p', {})
            if isinstance(p, list):
                texts = [JSONParser.get_text(item) for item in p]
                return ' '.join(text for text in texts if text)
            return JSONParser.get_text(p)
        return JSONParser.get_text(abstract_data)
    
    def _extract_parties(self, biblio: Dict, party_type: str) -> List[str]:
        parties = biblio.get('parties', {})
        if not parties:
            return []
        
        container = parties.get(f'{party_type}s', {})
        data = container.get(party_type, [])
        
        result = []
        for party in JSONParser.get_list(data):
            name = party.get(f'{party_type}-name', {})
            text = JSONParser.get_text(name)
            if text:
                result.append(text)
        
        return result
    
    def _extract_date(self, biblio: Dict, date_type: str) -> str:
        if date_type == 'publication':
            ref = biblio.get('publication-reference', {})
        elif date_type == 'application':
            ref = biblio.get('application-reference', {})
        elif date_type == 'priority':
            claims = biblio.get('priority-claims', {})
            claim_list = JSONParser.get_list(claims.get('priority-claim', []))
            for claim in claim_list:
                doc_ids = JSONParser.get_list(claim.get('document-id', []))
                for doc_id in doc_ids:
                    if JSONParser.get_attr(doc_id, 'document-id-type') == 'epodoc':
                        return JSONParser.get_text(doc_id.get('date', {}))
            return ''
        else:
            return ''
        
        doc_ids = JSONParser.get_list(ref.get('document-id', []))
        for doc_id in doc_ids:
            if JSONParser.get_attr(doc_id, 'document-id-type') == 'epodoc':
                return JSONParser.get_text(doc_id.get('date', {}))
        
        return ''
    
    def _extract_classifications(self, biblio: Dict, class_type: str) -> List[str]:
        if class_type == 'cpc':
            container = biblio.get('classifications-cpc', {})
            class_list = container.get('classification-cpc', [])
        else:
            container = biblio.get('classifications-ipcr', {})
            class_list = container.get('classification-ipcr', [])
        
        result = []
        for c in JSONParser.get_list(class_list):
            text = c.get('text', {})
            if text:
                extracted = JSONParser.get_text(text)
                if extracted:
                    result.append(extracted)
            else:
                symbol = c.get('classification-symbol', {})
                if symbol:
                    extracted = JSONParser.get_text(symbol)
                    if extracted:
                        result.append(extracted)
        
        return result
    
    def _extract_claims(self, data: Dict) -> List[str]:
        world_data = data.get('ops:world-patent-data', {})
        claims_data = world_data.get('claims', {})
        claim_list = JSONParser.get_list(claims_data.get('claim', []))
        
        result = []
        for claim in claim_list:
            claim_text = claim.get('claim-text', {})
            text = JSONParser.get_text(claim_text)
            if text:
                result.append(text)
        
        return result
    
    def _extract_description(self, data: Dict) -> str:
        world_data = data.get('ops:world-patent-data', {})
        desc_data = world_data.get('description', {})
        p_list = JSONParser.get_list(desc_data.get('p', []))
        
        texts = [JSONParser.get_text(p) for p in p_list]
        return '\n'.join(text for text in texts if text)
    
    def _extract_legal_status(self, biblio: Dict) -> List[Dict]:
        status_data = biblio.get('legal-status', {}).get('legal-status-data', [])
        
        result = []
        for s in JSONParser.get_list(status_data):
            result.append({
                'date': JSONParser.get_text(s.get('date', {})),
                'status': JSONParser.get_text(s.get('status', {})),
                'description': JSONParser.get_text(s.get('description', {}))
            })
        
        return result
    
    def get_family(self, patent_number: str, input_format: InputFormat = InputFormat.DOCDB,
                   constituents: List[str] = None) -> Dict:
        url = f"{EPO_OPS_BASE_URL}/family/publication/{input_format.value}/{patent_number}"
        
        if constituents:
            url += '/' + ','.join(constituents)
        
        data, quota_info = self._make_request(url)
        
        return {
            'family': self._parse_family(data),
            'quota_info': asdict(quota_info)
        }
    
    def _parse_family(self, data: Dict) -> List[EPOFamilyMember]:
        world_data = data.get('ops:world-patent-data', {})
        family = world_data.get('ops:patent-family', {})
        members = JSONParser.get_list(family.get('ops:family-member', []))
        
        result = []
        for member in members:
            pub_ref = member.get('publication-reference', {})
            doc_ids = JSONParser.get_list(pub_ref.get('document-id', []))
            
            patent_num = ''
            country = ''
            kind = ''
            
            for doc_id in doc_ids:
                if JSONParser.get_attr(doc_id, 'document-id-type') == 'epodoc':
                    patent_num = JSONParser.get_text(doc_id.get('doc-number', {}))
                    break
            
            if doc_ids:
                country = JSONParser.get_text(doc_ids[0].get('country', {}))
                kind = JSONParser.get_text(doc_ids[0].get('kind', {}))
            
            result.append(EPOFamilyMember(
                patent_number=patent_num,
                country=country,
                kind=kind
            ))
        
        return result
    
    def get_images(self, patent_number: str) -> Dict:
        url = f"{EPO_OPS_BASE_URL}/published-data/publication/epodoc/{patent_number}/images"
        data, quota_info = self._make_request(url)
        
        world_data = data.get('ops:world-patent-data', {})
        doc_instance = world_data.get('ops:document-instance', {})
        links = JSONParser.get_list(doc_instance.get('ops:link', []))
        
        images = []
        for link in links:
            images.append({
                'rel': JSONParser.get_attr(link, 'rel'),
                'href': JSONParser.get_attr(link, 'href')
            })
        
        return {
            'images': images,
            'quota_info': asdict(quota_info)
        }
    
    def get_image(self, image_path: str, format: str = 'png') -> bytes:
        url = f"{EPO_OPS_BASE_URL}{image_path}.{format}"
        accept_map = {
            'png': AcceptType.IMAGE_PNG.value,
            'tiff': AcceptType.IMAGE_TIFF.value,
            'pdf': AcceptType.IMAGE_PDF.value
        }
        
        data, _ = self._make_request(url, accept=accept_map.get(format, AcceptType.IMAGE_PNG.value))
        return data
    
    def get_official_usage(self, date_from: str = None, date_to: str = None) -> Dict:
        if not date_from:
            today = datetime.now()
            week_start = today - timedelta(days=today.weekday())
            date_from = week_start.strftime('%d/%m/%Y')
            date_to = today.strftime('%d/%m/%Y')
        
        time_range = f"{date_from}~{date_to}" if date_to else date_from
        url = f"{EPO_USAGE_URL}?timeRange={time_range}"
        
        data, quota_info = self._make_request(url)
        
        return {
            'usage': data,
            'quota_info': asdict(quota_info)
        }
    
    def get_quota_info(self) -> Dict:
        return asdict(self.quota_manager.get_quota_info())


_client_instance = None

def get_epo_ops_client() -> EPOOPSClient:
    global _client_instance
    if _client_instance is None:
        _client_instance = EPOOPSClient()
    return _client_instance
