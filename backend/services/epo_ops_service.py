"""
欧洲专利局开放专利服务集成

基于 python-epo-ops-client 库封装，提供：
1. CQL 检索专利
2. 获取专利详情
3. 配额监控和管理
4. 数据转换
"""

import os
import time
import json
import logging
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Any

import requests
from flask import current_app

from backend.services.epo_adapter import get_epo_adapter, EPOAdapter

logger = logging.getLogger(__name__)

EPO_OPS_BASE_URL = "https://ops.epo.org/3.2/rest-services"
WEEKLY_QUOTA_BYTES = 4 * 1024 * 1024 * 1024


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
    first_drawing_url: str = ''


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
    first_drawing_url: str = ''


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
    
    def _get_weekly_usage(self) -> int:
        usage = self.quota_data.get('weekly_usage', 0)
        if isinstance(usage, str):
            return int(usage) if usage else 0
        return int(usage) if usage else 0
    
    def track_response(self, content_length: int) -> EPOQuotaInfo:
        self._check_week_reset()
        
        current_usage = self._get_weekly_usage()
        self.quota_data['weekly_usage'] = current_usage + content_length
        self._save_quota_data()
        
        return self._build_quota_info()
    
    def _build_quota_info(self) -> EPOQuotaInfo:
        used_bytes = self._get_weekly_usage()
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
    
    def get_quota_info(self) -> EPOQuotaInfo:
        self._check_week_reset()
        return self._build_quota_info()
    
    def is_quota_exceeded(self) -> bool:
        self._check_week_reset()
        return self._get_weekly_usage() >= WEEKLY_QUOTA_BYTES


class EPOOPSClient:
    """
    EPO OPS API 客户端
    
    基于 python-epo-ops-client 库，提供：
    - 智能请求节流
    - 响应缓存
    - 自动 Token 管理
    - 配额监控
    """
    
    def __init__(self, consumer_key: str = None, consumer_secret: str = None):
        self.consumer_key = consumer_key or os.getenv('EPO_OPS_KEY', '')
        self.consumer_secret = consumer_secret or os.getenv('EPO_OPS_SECRET', '')
        self.quota_manager = EPOQuotaManager()
        self._adapter = None
    
    @property
    def adapter(self) -> EPOAdapter:
        if self._adapter is None:
            self._adapter = get_epo_adapter()
        return self._adapter
    
    def is_configured(self) -> bool:
        return bool(self.consumer_key and self.consumer_secret) and self.adapter.is_configured()
    
    def search(self, query: str, range_start: int = 1, range_end: int = 25, quick_mode: bool = False) -> Dict:
        """
        搜索专利
        
        Args:
            query: 搜索查询
            range_start: 起始位置
            range_end: 结束位置
            quick_mode: 快速模式 - 只返回基本信息
        """
        if self.quota_manager.is_quota_exceeded():
            raise Exception("EPO OPS 周配额已用尽，请等待下周一重置")
        
        if not self.is_configured():
            raise ValueError("EPO OPS 凭证未配置，请设置 EPO_OPS_KEY 和 EPO_OPS_SECRET 环境变量")
        
        logger.info(f"EPO搜索: {query}, 范围: {range_start}-{range_end}, 快速模式: {quick_mode}")
        
        patent_list, total_count, metadata = self.adapter.search(query, range_start, range_end)
        
        self.quota_manager.track_response(metadata.get('content_length', 0))
        
        results = []
        for patent_info in patent_list:
            patent_number = patent_info.get('patent_number', '')
            
            if quick_mode:
                results.append(EPOSearchResult(
                    patent_number=patent_number,
                    title='',
                    abstract='',
                    applicants=[],
                    inventors=[],
                    publication_date='',
                    application_date='',
                    cpc_classifications=[],
                    ipc_classifications=[],
                    url=f"https://patents.google.com/patent/{patent_number}",
                    first_drawing_url=''
                ))
            else:
                try:
                    detail = self._get_brief_detail(patent_number)
                    results.append(detail)
                except Exception as e:
                    logger.warning(f"获取专利 {patent_number} 详情失败: {e}")
                    results.append(EPOSearchResult(
                        patent_number=patent_number,
                        title='',
                        abstract='',
                        applicants=[],
                        inventors=[],
                        publication_date='',
                        application_date='',
                        cpc_classifications=[],
                        ipc_classifications=[],
                        url=f"https://patents.google.com/patent/{patent_number}",
                        first_drawing_url=''
                    ))
        
        return {
            'results': results,
            'total_results': total_count,
            'quota_info': asdict(self.quota_manager.get_quota_info())
        }
    
    def _get_brief_detail(self, patent_number: str) -> EPOSearchResult:
        """获取专利简要详情"""
        biblio_data, metadata = self.adapter.get_biblio(patent_number, 'docdb')
        
        self.quota_manager.track_response(metadata.get('content_length', 0))
        
        if not biblio_data:
            return EPOSearchResult(
                patent_number=patent_number,
                title='',
                abstract='',
                applicants=[],
                inventors=[],
                publication_date='',
                application_date='',
                cpc_classifications=[],
                ipc_classifications=[],
                url=f"https://patents.google.com/patent/{patent_number}",
                first_drawing_url=''
            )
        
        first_drawing_url = ''
        try:
            images_info, _ = self.adapter.get_images_info(patent_number, 'docdb')
            if images_info:
                first_drawing_url = images_info.get('drawing_url', '')
        except Exception as e:
            logger.debug(f"获取专利 {patent_number} 附图失败: {e}")
        
        return EPOSearchResult(
            patent_number=patent_number,
            title=biblio_data.get('title', ''),
            abstract=biblio_data.get('abstract', ''),
            applicants=biblio_data.get('applicants', []),
            inventors=biblio_data.get('inventors', []),
            publication_date=biblio_data.get('publication_date', ''),
            application_date=biblio_data.get('application_date', ''),
            cpc_classifications=biblio_data.get('cpc_classifications', []),
            ipc_classifications=biblio_data.get('ipc_classifications', []),
            url=f"https://patents.google.com/patent/{patent_number}",
            first_drawing_url=first_drawing_url
        )
    
    def get_patent_detail(self, patent_number: str, endpoint: str = 'biblio') -> Dict:
        """
        获取专利详情
        
        如果 endpoint 是 'biblio'，会同时获取 biblio、claims、description 和 images 数据
        """
        if endpoint == 'biblio':
            return self._get_full_patent_detail(patent_number)
        
        return self._get_single_endpoint(patent_number, endpoint)
    
    def _get_single_endpoint(self, patent_number: str, endpoint: str) -> Dict:
        """获取单个端点的数据"""
        if not self.is_configured():
            raise ValueError("EPO OPS 凭证未配置")
        
        format_type = 'epodoc'
        epodoc_number = patent_number.replace('.', '')
        
        if endpoint == 'claims':
            claims, metadata = self.adapter.get_claims(epodoc_number, format_type)
            self.quota_manager.track_response(metadata.get('content_length', 0))
            
            return {
                'detail': EPOPatentDetail(
                    patent_number=patent_number,
                    title='',
                    abstract='',
                    applicants=[],
                    inventors=[],
                    publication_date='',
                    application_date='',
                    priority_date='',
                    claims=claims,
                    description='',
                    cpc_classifications=[],
                    ipc_classifications=[],
                    family_id='',
                    legal_status=[],
                    url=f"https://patents.google.com/patent/{patent_number}"
                ),
                'quota_info': asdict(self.quota_manager.get_quota_info())
            }
        
        if endpoint == 'description':
            description, metadata = self.adapter.get_description(epodoc_number, format_type)
            self.quota_manager.track_response(metadata.get('content_length', 0))
            
            return {
                'detail': EPOPatentDetail(
                    patent_number=patent_number,
                    title='',
                    abstract='',
                    applicants=[],
                    inventors=[],
                    publication_date='',
                    application_date='',
                    priority_date='',
                    claims=[],
                    description=description,
                    cpc_classifications=[],
                    ipc_classifications=[],
                    family_id='',
                    legal_status=[],
                    url=f"https://patents.google.com/patent/{patent_number}"
                ),
                'quota_info': asdict(self.quota_manager.get_quota_info())
            }
        
        return {
            'detail': None,
            'quota_info': asdict(self.quota_manager.get_quota_info())
        }
    
    def _get_full_patent_detail(self, patent_number: str) -> Dict:
        """获取完整的专利详情"""
        if not self.is_configured():
            raise ValueError("EPO OPS 凭证未配置")
        
        epodoc_number = patent_number.replace('.', '')
        logger.info(f"获取专利完整详情: {epodoc_number}")
        
        biblio_data = {}
        claims = []
        description = ''
        first_drawing_url = ''
        
        try:
            biblio_data, biblio_meta = self.adapter.get_biblio(epodoc_number, 'epodoc')
            self.quota_manager.track_response(biblio_meta.get('content_length', 0))
            logger.info(f"获取biblio数据成功")
        except Exception as e:
            logger.warning(f"获取biblio数据失败: {e}")
        
        try:
            claims, claims_meta = self.adapter.get_claims(epodoc_number, 'epodoc')
            self.quota_manager.track_response(claims_meta.get('content_length', 0))
            logger.info(f"获取claims数据成功: {len(claims)} 条")
        except Exception as e:
            logger.warning(f"获取claims数据失败: {e}")
        
        try:
            description, desc_meta = self.adapter.get_description(epodoc_number, 'epodoc')
            self.quota_manager.track_response(desc_meta.get('content_length', 0))
            logger.info(f"获取description数据成功")
        except Exception as e:
            logger.warning(f"获取description数据失败: {e}")
        
        try:
            images_info, _ = self.adapter.get_images_info(patent_number, 'docdb')
            if images_info:
                first_drawing_url = images_info.get('drawing_url', '')
                logger.info(f"获取附图成功")
        except Exception as e:
            logger.warning(f"获取附图失败: {e}")
        
        if not biblio_data:
            return {
                'detail': None,
                'quota_info': asdict(self.quota_manager.get_quota_info())
            }
        
        detail = EPOPatentDetail(
            patent_number=patent_number,
            title=biblio_data.get('title', ''),
            abstract=biblio_data.get('abstract', ''),
            applicants=biblio_data.get('applicants', []),
            inventors=biblio_data.get('inventors', []),
            publication_date=biblio_data.get('publication_date', ''),
            application_date=biblio_data.get('application_date', ''),
            priority_date=biblio_data.get('priority_date', ''),
            claims=claims,
            description=description,
            cpc_classifications=biblio_data.get('cpc_classifications', []),
            ipc_classifications=biblio_data.get('ipc_classifications', []),
            family_id=biblio_data.get('family_id', ''),
            legal_status=[],
            url=f"https://patents.google.com/patent/{patent_number}",
            first_drawing_url=first_drawing_url
        )
        
        return {
            'detail': asdict(detail),
            'quota_info': asdict(self.quota_manager.get_quota_info())
        }
    
    def get_first_drawing(self, patent_number: str) -> Dict:
        """获取专利第一张附图"""
        try:
            images_info, _ = self.adapter.get_images_info(patent_number, 'docdb')
            
            if images_info and images_info.get('drawing_url'):
                return {
                    'success': True,
                    'drawing_url': images_info['drawing_url'],
                    'quota_info': asdict(self.quota_manager.get_quota_info())
                }
            
            return {
                'success': False,
                'error': '未找到附图',
                'quota_info': asdict(self.quota_manager.get_quota_info())
            }
        except Exception as e:
            logger.error(f"获取附图失败: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_quota_info(self) -> Dict:
        return asdict(self.quota_manager.get_quota_info())
    
    def get_official_usage(self, date_from: str = None, date_to: str = None) -> Dict:
        """
        从EPO官方API获取使用量数据
        
        Args:
            date_from: 开始日期
            date_to: 结束日期
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
                                ts = float(timestamp) if timestamp else 0.0
                            except (ValueError, TypeError):
                                ts = 0.0
                            
                            try:
                                value = float(str(value_str).replace(',', '')) if value_str else 0.0
                            except (ValueError, TypeError):
                                value = 0.0
                            
                            try:
                                date_str = datetime.utcfromtimestamp(ts / 1000).strftime('%Y-%m-%d')
                            except (ValueError, TypeError, OSError):
                                continue
                            
                            if date_str not in daily_usage:
                                daily_usage[date_str] = {'date': date_str, 'bytes': 0.0, 'mb': 0.0, 'requests': 0}
                            
                            if name == 'total_response_size':
                                total_bytes += value
                                daily_usage[date_str]['bytes'] += value
                                daily_usage[date_str]['mb'] = round(daily_usage[date_str]['bytes'] / (1024 * 1024), 2)
                            elif name == 'message_count':
                                total_requests += int(value)
                                daily_usage[date_str]['requests'] += int(value)
            
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
    
    def _get_access_token(self) -> str:
        """获取访问令牌（用于官方使用量API）"""
        auth = (self.consumer_key, self.consumer_secret)
        data = {'grant_type': 'client_credentials'}
        
        response = requests.post("https://ops.epo.org/3.2/auth/accesstoken", auth=auth, data=data)
        
        if response.status_code != 200:
            raise Exception(f"获取访问令牌失败: {response.status_code}")
        
        return response.json()['access_token']


epo_ops_client = None


def get_epo_ops_client() -> EPOOPSClient:
    """获取 EPO OPS 客户端单例"""
    global epo_ops_client
    if epo_ops_client is None:
        epo_ops_client = EPOOPSClient()
    return epo_ops_client
