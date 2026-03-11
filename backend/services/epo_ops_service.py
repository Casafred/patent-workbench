"""
欧洲专利局开放专利服务集成

功能：
1. CQL 检索专利
2. 获取专利详情（按需获取）
3. 配额监控和管理
4. 数据转换和缓存
"""

import os
import time
import json
import logging
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Any
from functools import wraps

import requests
from flask import current_app

logger = logging.getLogger(__name__)

EPO_OPS_BASE_URL = "https://ops.epo.org/3.2/rest-services"
EPO_TOKEN_URL = "https://ops.epo.org/3.2/auth/accesstoken"

WEEKLY_QUOTA_BYTES = 4 * 1024 * 1024 * 1024  # 4GB


@dataclass
class EPOQuotaInfo:
    weekly_used_bytes: int = 0
    weekly_used_mb: float = 0.0
    weekly_remaining_mb: float = 4096.0
    usage_percent: float = 0.0
    week_start: str = ""
    reset_date: str = ""


@dataclass
class EPOSearchResult:
    patent_number: str
    title: str
    abstract: str
    applicants: List[str]
    inventors: List[str]
    publication_date: str
    application_date: str
    cpc_classifications: List[str]
    ipc_classifications: List[str]
    url: str


@dataclass
class EPOPatentDetail:
    patent_number: str
    title: str
    abstract: str
    applicants: List[str]
    inventors: List[str]
    publication_date: str
    application_date: str
    priority_date: str
    claims: List[str]
    description: str
    cpc_classifications: List[str]
    ipc_classifications: List[str]
    family_id: str
    legal_status: List[Dict]
    url: str


class EPOQuotaManager:
    """EPO OPS 配额管理器"""
    
    def __init__(self, storage_path: str = None):
        self.storage_path = storage_path or os.path.join(
            os.path.dirname(__file__), '..', '..', 'data', 'epo_quota.json'
        )
        self._ensure_storage_dir()
        self.quota_data = self._load_quota_data()
    
    def _ensure_storage_dir(self):
        os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
    
    def _get_week_start(self) -> datetime:
        today = datetime.now()
        return today - timedelta(days=today.weekday())
    
    def _load_quota_data(self) -> Dict:
        if os.path.exists(self.storage_path):
            try:
                with open(self.storage_path, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"加载配额数据失败: {e}")
        
        return {
            'week_start': self._get_week_start().isoformat(),
            'weekly_usage': 0
        }
    
    def _save_quota_data(self):
        try:
            with open(self.storage_path, 'w') as f:
                json.dump(self.quota_data, f, indent=2)
        except Exception as e:
            logger.error(f"保存配额数据失败: {e}")
    
    def _check_week_reset(self):
        current_week_start = self._get_week_start()
        stored_week_start = datetime.fromisoformat(self.quota_data['week_start'])
        
        if current_week_start > stored_week_start:
            self.quota_data = {
                'week_start': current_week_start.isoformat(),
                'weekly_usage': 0
            }
            self._save_quota_data()
    
    def track_response(self, content_length: int) -> EPOQuotaInfo:
        self._check_week_reset()
        
        self.quota_data['weekly_usage'] += content_length
        self._save_quota_data()
        
        used_bytes = self.quota_data['weekly_usage']
        used_mb = used_bytes / (1024 * 1024)
        remaining_mb = max(0, (WEEKLY_QUOTA_BYTES - used_bytes) / (1024 * 1024))
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
    
    def get_quota_info(self) -> EPOQuotaInfo:
        self._check_week_reset()
        
        used_bytes = self.quota_data['weekly_usage']
        used_mb = used_bytes / (1024 * 1024)
        remaining_mb = max(0, (WEEKLY_QUOTA_BYTES - used_bytes) / (1024 * 1024))
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
        return self.quota_data['weekly_usage'] >= WEEKLY_QUOTA_BYTES


class EPOOPSClient:
    """EPO OPS API 客户端"""
    
    def __init__(self, consumer_key: str = None, consumer_secret: str = None):
        self.consumer_key = consumer_key or os.getenv('EPO_OPS_KEY', '')
        self.consumer_secret = consumer_secret or os.getenv('EPO_OPS_SECRET', '')
        self.access_token = None
        self.token_expires_at = 0
        self.quota_manager = EPOQuotaManager()
        self.request_delay = 0.5
        self.last_request_time = 0
    
    def _get_access_token(self) -> str:
        if self.access_token and time.time() < self.token_expires_at:
            return self.access_token
        
        if not self.consumer_key or not self.consumer_secret:
            raise ValueError("EPO OPS 凭证未配置，请设置 EPO_OPS_KEY 和 EPO_OPS_SECRET 环境变量")
        
        auth = (self.consumer_key, self.consumer_secret)
        data = {'grant_type': 'client_credentials'}
        
        response = requests.post(EPO_TOKEN_URL, auth=auth, data=data)
        
        if response.status_code != 200:
            raise Exception(f"获取访问令牌失败: {response.status_code} - {response.text}")
        
        token_data = response.json()
        self.access_token = token_data['access_token']
        self.token_expires_at = time.time() + token_data.get('expires_in', 3600) - 60
        
        return self.access_token
    
    def _make_request(self, url: str, params: Dict = None) -> tuple:
        if self.quota_manager.is_quota_exceeded():
            raise Exception("EPO OPS 周配额已用尽，请等待下周一重置")
        
        elapsed = time.time() - self.last_request_time
        if elapsed < self.request_delay:
            time.sleep(self.request_delay - elapsed)
        
        token = self._get_access_token()
        headers = {
            'Authorization': f'Bearer {token}',
            'Accept': 'application/json'
        }
        
        response = requests.get(url, headers=headers, params=params)
        self.last_request_time = time.time()
        
        content_length = int(response.headers.get('Content-Length', len(response.content)))
        quota_info = self.quota_manager.track_response(content_length)
        
        if response.status_code == 403:
            raise Exception("EPO OPS 配额已用尽或访问被拒绝")
        elif response.status_code == 429:
            retry_after = response.headers.get('Retry-After', 60)
            raise Exception(f"请求过于频繁，请等待 {retry_after} 秒后重试")
        elif response.status_code != 200:
            raise Exception(f"API 请求失败: {response.status_code} - {response.text}")
        
        return response.json(), quota_info
    
    def search(self, query: str, range_start: int = 1, range_end: int = 25) -> Dict:
        url = f"{EPO_OPS_BASE_URL}/published-data/search"
        params = {
            'q': query,
            'Range': f"{range_start}-{range_end}"
        }
        
        data, quota_info = self._make_request(url, params)
        
        results = self._parse_search_results(data)
        
        return {
            'results': results,
            'total_results': data.get('ops:world-patent-data', {}).get('ops:biblio-search', {}).get('@total-result-count', 0),
            'quota_info': asdict(quota_info)
        }
    
    def _parse_search_results(self, data: Dict) -> List[EPOSearchResult]:
        results = []
        
        try:
            world_data = data.get('ops:world-patent-data', {})
            search_data = world_data.get('ops:biblio-search', {})
            exchange_docs = search_data.get('ops:search-result', [])
            
            for doc in exchange_docs:
                biblio = doc.get('exchange-document', {}).get('bibliographic-data', {})
                
                patent_number = self._extract_patent_number(doc)
                title = self._extract_title(biblio)
                abstract = self._extract_abstract(biblio)
                applicants = self._extract_parties(biblio, 'applicant')
                inventors = self._extract_parties(biblio, 'inventor')
                pub_date = self._extract_date(biblio, 'publication')
                app_date = self._extract_date(biblio, 'application')
                cpc = self._extract_classifications(biblio, 'cpc')
                ipc = self._extract_classifications(biblio, 'ipc')
                
                results.append(EPOSearchResult(
                    patent_number=patent_number,
                    title=title,
                    abstract=abstract,
                    applicants=applicants,
                    inventors=inventors,
                    publication_date=pub_date,
                    application_date=app_date,
                    cpc_classifications=cpc,
                    ipc_classifications=ipc,
                    url=f"https://patents.google.com/patent/{patent_number}"
                ))
        except Exception as e:
            logger.error(f"解析搜索结果失败: {e}")
        
        return results
    
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
            exchange_doc = world_data.get('exchange-document', {})
            
            if isinstance(exchange_doc, list) and len(exchange_doc) > 0:
                exchange_doc = exchange_doc[0]
            
            biblio = exchange_doc.get('bibliographic-data', {})
            
            title = self._extract_title(biblio)
            abstract = self._extract_abstract(biblio)
            applicants = self._extract_parties(biblio, 'applicant')
            inventors = self._extract_parties(biblio, 'inventor')
            pub_date = self._extract_date(biblio, 'publication')
            app_date = self._extract_date(biblio, 'application')
            priority_date = self._extract_date(biblio, 'priority')
            claims = self._extract_claims(data)
            description = self._extract_description(data)
            cpc = self._extract_classifications(biblio, 'cpc')
            ipc = self._extract_classifications(biblio, 'ipc')
            family_id = exchange_doc.get('@family-id', '')
            legal_status = self._extract_legal_status(biblio)
            
            return EPOPatentDetail(
                patent_number=patent_number,
                title=title,
                abstract=abstract,
                applicants=applicants,
                inventors=inventors,
                publication_date=pub_date,
                application_date=app_date,
                priority_date=priority_date,
                claims=claims,
                description=description,
                cpc_classifications=cpc,
                ipc_classifications=ipc,
                family_id=family_id,
                legal_status=legal_status,
                url=f"https://patents.google.com/patent/{patent_number}"
            )
        except Exception as e:
            logger.error(f"解析专利详情失败: {e}")
            return None
    
    def _extract_patent_number(self, doc: Dict) -> str:
        try:
            doc_id = doc.get('exchange-document', {}).get('document-id', [])
            if isinstance(doc_id, list):
                for d in doc_id:
                    if d.get('@document-id-type') == 'epodoc':
                        return d.get('doc-number', '')
            return ''
        except:
            return ''
    
    def _extract_title(self, biblio: Dict) -> str:
        try:
            title_data = biblio.get('invention-title', {})
            if isinstance(title_data, dict):
                return title_data.get('$', '')
            return str(title_data) if title_data else ''
        except:
            return ''
    
    def _extract_abstract(self, biblio: Dict) -> str:
        try:
            abstract_data = biblio.get('abstract', {})
            if isinstance(abstract_data, dict):
                p = abstract_data.get('p', {})
                if isinstance(p, dict):
                    return p.get('$', '')
                elif isinstance(p, list):
                    texts = [item.get('$', '') for item in p if isinstance(item, dict)]
                    return ' '.join(texts)
            return ''
        except:
            return ''
    
    def _extract_parties(self, biblio: Dict, party_type: str) -> List[str]:
        try:
            parties = biblio.get('parties', {}).get(f'{party_type}s', {})
            data = parties.get(f'{party_type}', [])
            
            if isinstance(data, dict):
                data = [data]
            
            result = []
            for party in data:
                name = party.get(f'{party_type}-name', {})
                if isinstance(name, dict):
                    result.append(name.get('$', ''))
                elif isinstance(name, str):
                    result.append(name)
            
            return result
        except:
            return []
    
    def _extract_date(self, biblio: Dict, date_type: str) -> str:
        try:
            if date_type == 'publication':
                dates = biblio.get('publication-reference', {}).get('document-id', [])
            elif date_type == 'application':
                dates = biblio.get('application-reference', {}).get('document-id', [])
            elif date_type == 'priority':
                dates = biblio.get('priority-claims', {}).get('priority-claim', [])
                if isinstance(dates, dict):
                    dates = [dates]
                for d in dates:
                    doc_id = d.get('document-id', [])
                    if isinstance(doc_id, list):
                        for doc in doc_id:
                            if isinstance(doc, dict) and doc.get('@document-id-type') == 'epodoc':
                                return doc.get('date', '')
                return ''
            else:
                return ''
            
            if isinstance(dates, list):
                for d in dates:
                    if isinstance(d, dict) and d.get('@document-id-type') == 'epodoc':
                        return d.get('date', '')
            return ''
        except:
            return ''
    
    def _extract_classifications(self, biblio: Dict, class_type: str) -> List[str]:
        try:
            if class_type == 'cpc':
                class_data = biblio.get('classifications-cpc', {}).get('classification-cpc', [])
            else:
                class_data = biblio.get('classifications-ipcr', {}).get('classification-ipcr', [])
            
            if isinstance(class_data, dict):
                class_data = [class_data]
            
            result = []
            for c in class_data:
                text = c.get('text', '')
                if text:
                    result.append(text)
            
            return result
        except:
            return []
    
    def _extract_claims(self, data: Dict) -> List[str]:
        try:
            claims_data = data.get('ops:world-patent-data', {}).get('claims', {})
            claim_list = claims_data.get('claim', [])
            
            if isinstance(claim_list, dict):
                claim_list = [claim_list]
            
            result = []
            for claim in claim_list:
                claim_text = claim.get('claim-text', {})
                if isinstance(claim_text, dict):
                    result.append(claim_text.get('$', ''))
                elif isinstance(claim_text, str):
                    result.append(claim_text)
            
            return result
        except:
            return []
    
    def _extract_description(self, data: Dict) -> str:
        try:
            desc_data = data.get('ops:world-patent-data', {}).get('description', {})
            p_list = desc_data.get('p', [])
            
            if isinstance(p_list, dict):
                p_list = [p_list]
            
            texts = []
            for p in p_list:
                if isinstance(p, dict):
                    texts.append(p.get('$', ''))
            
            return '\n'.join(texts)
        except:
            return ''
    
    def _extract_legal_status(self, biblio: Dict) -> List[Dict]:
        try:
            status_data = biblio.get('legal-status', {}).get('legal-status-data', [])
            
            if isinstance(status_data, dict):
                status_data = [status_data]
            
            result = []
            for s in status_data:
                result.append({
                    'date': s.get('date', ''),
                    'status': s.get('status', ''),
                    'description': s.get('description', '')
                })
            
            return result
        except:
            return []
    
    def get_quota_info(self) -> Dict:
        return asdict(self.quota_manager.get_quota_info())
    
    def get_official_usage(self, date_from: str = None, date_to: str = None) -> Dict:
        """
        从EPO官方API获取使用量数据
        
        Args:
            date_from: 开始日期 (dd/mm/yyyy)
            date_to: 结束日期 (dd/mm/yyyy)
        
        Returns:
            包含使用量数据的字典
        """
        if not self.consumer_key or not self.consumer_secret:
            return {'error': '凭证未配置', 'configured': False}
        
        try:
            token = self._get_access_token()
            
            if not date_from or not date_to:
                today = datetime.now()
                week_start = today - timedelta(days=today.weekday())
                date_from = week_start.strftime('%d/%m/%Y')
                date_to = today.strftime('%d/%m/%Y')
            
            url = f"https://ops.epo.org/3.2/developers/me/stats/usage"
            params = {'timeRange': f"{date_from}~{date_to}"}
            
            headers = {
                'Authorization': f'Bearer {token}',
                'Accept': 'application/json'
            }
            
            response = requests.get(url, headers=headers, params=params)
            
            if response.status_code != 200:
                return {
                    'error': f'API请求失败: {response.status_code}',
                    'configured': True
                }
            
            data = response.json()
            
            total_bytes = 0.0
            total_requests = 0
            daily_usage = {}
            
            environments = data.get('environments', [])
            for env in environments:
                dimensions = env.get('dimensions', [])
                for dim in dimensions:
                    metrics = dim.get('metrics', [])
                    for metric in metrics:
                        name = metric.get('name', '')
                        values = metric.get('values', [])
                        
                        for v in values:
                            timestamp = v.get('timestamp', 0)
                            value_str = v.get('value', '0')
                            
                            try:
                                if isinstance(value_str, (int, float)):
                                    value = float(value_str)
                                elif value_str:
                                    value = float(str(value_str).strip())
                                else:
                                    value = 0.0
                            except (ValueError, TypeError):
                                value = 0.0
                            
                            try:
                                date_str = datetime.utcfromtimestamp(timestamp / 1000).strftime('%Y-%m-%d')
                            except (ValueError, TypeError, OSError):
                                continue
                            
                            if date_str not in daily_usage:
                                daily_usage[date_str] = {'date': date_str, 'bytes': 0.0, 'mb': 0.0, 'requests': 0}
                            
                            if name == 'total_response_size':
                                total_bytes += value
                                daily_usage[date_str]['bytes'] = value
                                daily_usage[date_str]['mb'] = round(value / (1024 * 1024), 2)
                            elif name == 'message_count':
                                total_requests += int(value)
                                daily_usage[date_str]['requests'] = int(value)
            
            total_mb = total_bytes / (1024 * 1024)
            remaining_mb = max(0.0, (WEEKLY_QUOTA_BYTES - total_bytes) / (1024 * 1024))
            usage_percent = (total_bytes / WEEKLY_QUOTA_BYTES) * 100 if WEEKLY_QUOTA_BYTES > 0 else 0
            
            return {
                'configured': True,
                'total_bytes': int(total_bytes),
                'total_mb': round(total_mb, 2),
                'total_requests': total_requests,
                'remaining_mb': round(remaining_mb, 2),
                'usage_percent': round(usage_percent, 2),
                'weekly_quota_mb': 4096,
                'daily_usage': list(daily_usage.values())
            }
            
        except Exception as e:
            logger.error(f"获取官方使用量失败: {e}")
            return {
                'error': str(e),
                'configured': True
            }


epo_ops_client = None


def get_epo_ops_client() -> EPOOPSClient:
    global epo_ops_client
    if epo_ops_client is None:
        epo_ops_client = EPOOPSClient()
    return epo_ops_client
