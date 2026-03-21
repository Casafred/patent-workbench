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
    
    def is_quota_exceeded(self) -> bool:
        self._check_week_reset()
        return self._get_weekly_usage() >= WEEKLY_QUOTA_BYTES


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
        
        expires_in = token_data.get('expires_in', 3600)
        if isinstance(expires_in, str):
            expires_in = int(expires_in) if expires_in else 3600
        else:
            expires_in = int(expires_in) if expires_in else 3600
        
        self.token_expires_at = time.time() + expires_in - 60
        
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
        
        content_length_header = response.headers.get('Content-Length')
        if content_length_header:
            try:
                content_length = int(content_length_header)
            except (ValueError, TypeError):
                content_length = len(response.content)
        else:
            content_length = len(response.content)
        quota_info = self.quota_manager.track_response(content_length)
        
        if response.status_code == 403:
            raise Exception("EPO OPS 配额已用尽或访问被拒绝")
        elif response.status_code == 429:
            retry_after = response.headers.get('Retry-After', 60)
            raise Exception(f"请求过于频繁，请等待 {retry_after} 秒后重试")
        elif response.status_code != 200:
            raise Exception(f"API 请求失败: {response.status_code} - {response.text}")
        
        return response.json(), quota_info
    
    def search(self, query: str, range_start: int = 1, range_end: int = 25, quick_mode: bool = False) -> Dict:
        """
        搜索专利
        
        Args:
            query: 搜索查询
            range_start: 起始位置
            range_end: 结束位置
            quick_mode: 快速模式 - 只返回基本信息，不获取详细数据
        """
        url = f"{EPO_OPS_BASE_URL}/published-data/search"
        params = {
            'q': query,
            'Range': f"{range_start}-{range_end}"
        }
        
        logger.info(f"EPO搜索URL: {url}, 参数: {params}, 快速模式: {quick_mode}")
        
        data, quota_info = self._make_request(url, params)
        
        patent_numbers = self._parse_search_results(data)
        
        results = []
        for patent_number in patent_numbers:
            if patent_number:
                if quick_mode:
                    # 快速模式：只返回基本信息
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
            'total_results': data.get('ops:world-patent-data', {}).get('ops:biblio-search', {}).get('@total-result-count', 0),
            'quota_info': asdict(quota_info)
        }
    
    def _get_brief_detail(self, patent_number: str) -> EPOSearchResult:
        url = f"{EPO_OPS_BASE_URL}/published-data/publication/docdb/{patent_number}/biblio"
        
        try:
            data, _ = self._make_request(url)
            
            world_data = data.get('ops:world-patent-data', {})
            exchange_doc = world_data.get('exchange-document', {})
            if not exchange_doc:
                exchange_doc = world_data.get('exchange-documents', {}).get('exchange-document', {})
            
            if isinstance(exchange_doc, list) and len(exchange_doc) > 0:
                exchange_doc = exchange_doc[0]
            
            if not exchange_doc:
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
            
            biblio = exchange_doc.get('bibliographic-data', {})
            
            title = self._extract_title(biblio)
            abstract = self._extract_abstract_from_exchange(exchange_doc)
            applicants = self._extract_parties(biblio, 'applicant')
            inventors = self._extract_parties(biblio, 'inventor')
            pub_date = self._extract_date(biblio, 'publication')
            app_date = self._extract_date(biblio, 'application')
            cpc = self._extract_cpc_classifications(biblio)
            ipc = self._extract_classifications(biblio, 'ipc')
            
            first_drawing_url = ''
            try:
                drawing_result = self._get_first_drawing_url_docdb(patent_number)
                if drawing_result:
                    first_drawing_url = drawing_result
            except Exception as e:
                logger.debug(f"获取专利 {patent_number} 附图失败: {e}")
            
            logger.info(f"专利 {patent_number} 详情: 标题={title[:50] if title else 'N/A'}..., 摘要长度={len(abstract)}, CPC数量={len(cpc)}, 附图={first_drawing_url[:50] if first_drawing_url else 'N/A'}")
            
            return EPOSearchResult(
                patent_number=patent_number,
                title=title,
                abstract=abstract,
                applicants=applicants,
                inventors=inventors,
                publication_date=pub_date,
                application_date=app_date,
                cpc_classifications=cpc,
                ipc_classifications=ipc,
                url=f"https://patents.google.com/patent/{patent_number}",
                first_drawing_url=first_drawing_url
            )
        except Exception as e:
            logger.error(f"获取专利简要详情失败: {e}")
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
    
    def _get_first_drawing_url_docdb(self, patent_number: str) -> str:
        """获取专利首张附图URL (docdb格式) - images 端点返回 XML
        
        根据 EPO OPS API 文档，images 端点返回的结构：
        - ops:document-instance desc="FullDocument" - 完整文档
        - ops:document-instance desc="Drawing" - 附图（缩略图）
        - ops:document-instance desc="FirstPageClipping" - 首页裁剪
        """
        url = f"{EPO_OPS_BASE_URL}/published-data/publication/docdb/{patent_number}/images"
        
        try:
            token = self._get_access_token()
            headers = {
                'Authorization': f'Bearer {token}',
                'Accept': 'application/xml'
            }
            
            response = requests.get(url, headers=headers)
            
            if response.status_code != 200:
                logger.debug(f"获取附图失败: {response.status_code}")
                return ''
            
            import xml.etree.ElementTree as ET
            
            try:
                root = ET.fromstring(response.content)
                
                # EPO OPS 使用 ops 命名空间
                OPS_NS = '{http://ops.epo.org}'
                
                # 查找所有 document-instance 元素
                doc_instances = root.findall(f'.//{OPS_NS}document-instance')
                
                if not doc_instances:
                    # 尝试无命名空间
                    doc_instances = root.findall('.//document-instance')
                
                logger.debug(f"找到 {len(doc_instances)} 个 document-instance 元素")
                
                # 优先查找 desc="Drawing" 的元素（附图缩略图）
                drawing_link = None
                first_page_link = None
                
                for doc_inst in doc_instances:
                    desc = doc_inst.get('desc', '')
                    link = doc_inst.get('link', '')
                    
                    logger.debug(f"document-instance: desc={desc}, link={link}")
                    
                    if desc == 'Drawing' and link:
                        drawing_link = link
                    elif desc == 'FirstPageClipping' and link:
                        first_page_link = link
                
                # 优先使用 Drawing，其次使用 FirstPageClipping
                final_link = drawing_link or first_page_link
                
                if final_link:
                    # 构造完整的图片 URL
                    # 格式: https://ops.epo.org/3.2/rest-services/{link}.png
                    drawing_url = f"{EPO_OPS_BASE_URL}/{final_link}.png"
                    logger.info(f"找到附图URL: {drawing_url}")
                    return drawing_url
                
                logger.debug(f"未找到附图链接")
                return ''
            except Exception as e:
                logger.debug(f"解析附图XML失败: {e}")
                return ''
        except Exception as e:
            logger.debug(f"获取附图URL失败: {e}")
            return ''
    
    def _get_claims_xml(self, url: str) -> Dict:
        """获取 Claims 数据（XML 格式）并转换为字典结构"""
        try:
            token = self._get_access_token()
            headers = {
                'Authorization': f'Bearer {token}',
                'Accept': 'application/xml'
            }
            
            response = requests.get(url, headers=headers)
            
            if response.status_code != 200:
                logger.warning(f"获取claims失败: {response.status_code}")
                return {}
            
            import xml.etree.ElementTree as ET
            
            try:
                root = ET.fromstring(response.content)
                
                # EPO OPS Claims 使用的命名空间
                namespaces = {
                    'ops': 'http://ops.epo.org',
                    'ftxt': 'http://www.epo.org/fulltext',
                    'epo': 'http://www.epo.org/exchange'
                }
                
                # 查找 claims 元素
                claims_list = []
                
                # 尝试 ftxt 命名空间
                claims_elements = root.findall('.//{http://www.epo.org/fulltext}claim')
                
                if not claims_elements:
                    # 尝试无命名空间
                    claims_elements = root.findall('.//claim')
                
                logger.info(f"找到 {len(claims_elements)} 个 claim 元素")
                
                for claim in claims_elements:
                    # 查找 claim-text 元素
                    claim_texts = claim.findall('{http://www.epo.org/fulltext}claim-text')
                    if not claim_texts:
                        claim_texts = claim.findall('claim-text')
                    if not claim_texts:
                        claim_texts = claim.findall('.//{http://www.epo.org/fulltext}claim-text')
                    
                    for ct in claim_texts:
                        text = ''.join(ct.itertext())
                        if text.strip():
                            claims_list.append(text.strip())
                
                # 如果没有找到 claim-text，尝试直接获取 claim 的文本
                if not claims_list:
                    for claim in claims_elements:
                        text = ''.join(claim.itertext())
                        if text.strip():
                            claims_list.append(text.strip())
                
                logger.info(f"解析出 {len(claims_list)} 条权利要求")
                
                # 返回与 JSON 格式兼容的结构
                return {
                    'ops:world-patent-data': {
                        'fulltext-documents': {
                            'fulltext-document': {
                                'claims': {
                                    'claim': [{'claim-text': c} for c in claims_list]
                                }
                            }
                        }
                    }
                }
                
            except ET.ParseError as e:
                logger.error(f"解析claims XML失败: {e}")
                return {}
                
        except Exception as e:
            logger.error(f"获取claims XML失败: {e}")
            return {}
    
    def _get_first_drawing_url(self, patent_number: str) -> str:
        """获取专利首张附图URL"""
        url = f"{EPO_OPS_BASE_URL}/published-data/publication/epodoc/{patent_number}/images"
        
        try:
            data, _ = self._make_request(url)
            
            world_data = data.get('ops:world-patent-data', {})
            doc_instance = world_data.get('ops:document-instance', {})
            
            if isinstance(doc_instance, list) and len(doc_instance) > 0:
                doc_instance = doc_instance[0]
            
            links = doc_instance.get('ops:link', [])
            if isinstance(links, dict):
                links = [links]
            
            for link in links:
                link_ref = link.get('@ref', '') or link.get('@link', '')
                if link_ref:
                    return f"{EPO_OPS_BASE_URL}{link_ref}.png"
            
            return ''
        except Exception as e:
            logger.debug(f"获取附图URL失败: {e}")
            return ''
    
    def _parse_search_results(self, data: Dict) -> List[str]:
        patent_numbers = []
        
        try:
            world_data = data.get('ops:world-patent-data', {})
            search_data = world_data.get('ops:biblio-search', {})
            
            logger.info(f"EPO搜索数据结构 - world_data keys: {list(world_data.keys())}")
            logger.info(f"EPO搜索数据结构 - search_data keys: {list(search_data.keys())}")
            
            search_results = search_data.get('ops:search-result', [])
            logger.info(f"EPO搜索数据结构 - search_results type: {type(search_results)}")
            
            # ops:search-result 可能是一个列表（每个元素是一个搜索结果）
            # 也可能是一个字典（包含 ops:publication-reference）
            if isinstance(search_results, dict):
                # 单个结果的情况
                pub_refs = search_results.get('ops:publication-reference', [])
                if isinstance(pub_refs, dict):
                    pub_refs = [pub_refs]
                for pub_ref in pub_refs:
                    patent_number = self._extract_patent_number_from_pub_ref(pub_ref)
                    if patent_number:
                        patent_numbers.append(patent_number)
            elif isinstance(search_results, list):
                # 多个结果的情况
                for search_result in search_results:
                    if not isinstance(search_result, dict):
                        continue
                    pub_refs = search_result.get('ops:publication-reference', [])
                    if isinstance(pub_refs, dict):
                        pub_refs = [pub_refs]
                    for pub_ref in pub_refs:
                        patent_number = self._extract_patent_number_from_pub_ref(pub_ref)
                        logger.info(f"EPO搜索数据结构 - 提取到专利号: {patent_number}")
                        if patent_number:
                            patent_numbers.append(patent_number)
            
            logger.info(f"EPO搜索数据结构 - 最终解析结果数量: {len(patent_numbers)}")
        except Exception as e:
            logger.error(f"解析搜索结果失败: {e}")
            import traceback
            traceback.print_exc()
        
        return patent_numbers
    
    def _extract_patent_number_from_pub_ref(self, pub_ref: Dict) -> str:
        try:
            doc_id = pub_ref.get('document-id', {})
            
            if isinstance(doc_id, list):
                doc_id = doc_id[0] if doc_id else {}
            
            if not doc_id:
                return ''
            
            country = doc_id.get('country', {})
            if isinstance(country, dict):
                country = country.get('$', '')
            else:
                country = str(country) if country else ''
            
            doc_num = doc_id.get('doc-number', {})
            if isinstance(doc_num, dict):
                doc_num = doc_num.get('$', '')
            else:
                doc_num = str(doc_num) if doc_num else ''
            
            kind = doc_id.get('kind', {})
            if isinstance(kind, dict):
                kind = kind.get('$', '')
            else:
                kind = str(kind) if kind else ''
            
            if country and doc_num:
                pn = f"{country}.{doc_num}"
                if kind:
                    pn = f"{pn}.{kind}"
                return pn
            
            return ''
        except Exception as e:
            logger.error(f"提取专利号失败: {e}")
        
        return ''
    
    def _extract_patent_number_from_exchange(self, exchange_doc: Dict) -> str:
        try:
            pub_ref = exchange_doc.get('publication-reference', {})
            doc_ids = pub_ref.get('document-id', [])
            
            if isinstance(doc_ids, dict):
                doc_ids = [doc_ids]
            
            for doc_id in doc_ids:
                doc_type = doc_id.get('@document-id-type', '')
                if doc_type == 'epodoc':
                    doc_num = doc_id.get('doc-number', {})
                    if isinstance(doc_num, dict):
                        return doc_num.get('$', '')
                    else:
                        return str(doc_num)
            
            if doc_ids:
                first_doc = doc_ids[0]
                country = first_doc.get('country', {})
                if isinstance(country, dict):
                    country = country.get('$', '')
                else:
                    country = str(country) if country else ''
                
                doc_num = first_doc.get('doc-number', {})
                if isinstance(doc_num, dict):
                    doc_num = doc_num.get('$', '')
                else:
                    doc_num = str(doc_num) if doc_num else ''
                
                kind = first_doc.get('kind', {})
                if isinstance(kind, dict):
                    kind = kind.get('$', '')
                else:
                    kind = str(kind) if kind else ''
                
                if country and doc_num:
                    return f"{country}{doc_num}" + (f".{kind}" if kind else "")
            return ''
        except Exception as e:
            logger.error(f"提取专利号失败: {e}")
            return ''
    
    def _extract_patent_number_from_search(self, doc_ids: List[Dict]) -> str:
        try:
            for doc_id in doc_ids:
                doc_type = doc_id.get('@document-id-type', '')
                if doc_type == 'epodoc':
                    doc_num = doc_id.get('doc-number', {})
                    if isinstance(doc_num, dict):
                        return doc_num.get('$', '')
                    else:
                        return str(doc_num)
            
            if doc_ids:
                first_doc = doc_ids[0]
                country = first_doc.get('country', {})
                if isinstance(country, dict):
                    country = country.get('$', '')
                else:
                    country = str(country)
                
                doc_num = first_doc.get('doc-number', {})
                if isinstance(doc_num, dict):
                    doc_num = doc_num.get('$', '')
                else:
                    doc_num = str(doc_num)
                
                return f"{country}{doc_num}"
            return ''
        except:
            return ''
    
    def get_patent_detail(self, patent_number: str, endpoint: str = 'biblio') -> Dict:
        """
        获取专利详情
        
        如果endpoint是'biblio'，会同时获取biblio、claims、description和images数据
        """
        if endpoint == 'biblio':
            return self._get_full_patent_detail(patent_number)
        
        url = f"{EPO_OPS_BASE_URL}/published-data/publication/epodoc/{patent_number}/{endpoint}"
        
        data, quota_info = self._make_request(url)
        
        detail = self._parse_patent_detail(data, patent_number)
        
        return {
            'detail': asdict(detail) if detail else None,
            'quota_info': asdict(quota_info)
        }
    
    def _convert_docdb_to_epodoc(self, patent_number: str) -> str:
        """将 docdb 格式转换为 epodoc 格式
        输入: US.20260069977.A1
        输出: US20260069977A1
        """
        return patent_number.replace('.', '')
    
    def _get_full_patent_detail(self, patent_number: str) -> Dict:
        """
        获取完整的专利详情，合并biblio、claims、description和images数据
        """
        quota_info = None
        biblio_data = {}
        claims_data = {}
        description_data = {}
        drawing_url = ''
        
        # 转换专利号格式：docdb -> epodoc
        epodoc_number = self._convert_docdb_to_epodoc(patent_number)
        logger.info(f"专利号格式转换: {patent_number} -> {epodoc_number}")
        
        logger.info(f"开始获取专利 {epodoc_number} 的完整详情")
        
        try:
            url = f"{EPO_OPS_BASE_URL}/published-data/publication/epodoc/{epodoc_number}/biblio"
            biblio_data, quota_info = self._make_request(url)
            logger.info(f"获取biblio数据成功，keys: {list(biblio_data.keys()) if biblio_data else 'empty'}")
        except Exception as e:
            logger.warning(f"获取biblio数据失败: {e}")
        
        try:
            # Claims 端点返回 XML 格式，需要特殊处理
            claims_url = f"{EPO_OPS_BASE_URL}/published-data/publication/epodoc/{epodoc_number}/claims"
            claims_data = self._get_claims_xml(claims_url)
            logger.info(f"获取claims数据成功")
        except Exception as e:
            logger.warning(f"获取claims数据失败: {e}")
            claims_data = {}
        
        try:
            url = f"{EPO_OPS_BASE_URL}/published-data/publication/epodoc/{epodoc_number}/description"
            description_data, _ = self._make_request(url)
            logger.info(f"获取description数据成功")
        except Exception as e:
            logger.warning(f"获取description数据失败: {e}")
        
        try:
            drawing_result = self._get_first_drawing_url_docdb(patent_number)
            if drawing_result:
                drawing_url = drawing_result
                logger.info(f"获取附图成功: {drawing_url}")
        except Exception as e:
            logger.warning(f"获取附图失败: {e}")
        
        world_data = biblio_data.get('ops:world-patent-data', {})
        logger.info(f"biblio world_data keys: {list(world_data.keys()) if world_data else 'empty'}")
        
        exchange_doc = world_data.get('exchange-document', {})
        if not exchange_doc:
            exchange_doc = world_data.get('exchange-documents', {}).get('exchange-document', {})
        
        logger.info(f"exchange_doc type: {type(exchange_doc)}, is_list: {isinstance(exchange_doc, list)}")
        
        # 从 claims_data 中提取正确的结构
        claims_world_data = claims_data.get('ops:world-patent-data', {})
        logger.info(f"claims_world_data keys: {list(claims_world_data.keys()) if claims_world_data else 'empty'}")
        
        # claims 在 fulltext-documents -> fulltext-document -> claims 下
        fulltext_docs = claims_world_data.get('fulltext-documents', {})
        logger.info(f"fulltext_docs type: {type(fulltext_docs)}, keys: {list(fulltext_docs.keys()) if isinstance(fulltext_docs, dict) else 'N/A'}")
        
        merged_data = {
            'ops:world-patent-data': {
                'exchange-document': exchange_doc,
                'fulltext-documents': fulltext_docs,
                'description': description_data.get('ops:world-patent-data', {}).get('description', {})
            }
        }
        
        detail = self._parse_patent_detail(merged_data, patent_number)
        logger.info(f"解析详情结果: {detail is not None}")
        
        if detail and drawing_url:
            detail.first_drawing_url = drawing_url
        
        return {
            'detail': asdict(detail) if detail else None,
            'quota_info': asdict(quota_info) if quota_info else {}
        }
    
    def _parse_patent_detail(self, data: Dict, patent_number: str) -> Optional[EPOPatentDetail]:
        try:
            world_data = data.get('ops:world-patent-data', {})
            
            exchange_doc = world_data.get('exchange-document', {})
            if not exchange_doc:
                exchange_doc = world_data.get('exchange-documents', {}).get('exchange-document', {})
            
            if isinstance(exchange_doc, list) and len(exchange_doc) > 0:
                exchange_doc = exchange_doc[0]
            
            if not exchange_doc:
                logger.warning("未找到exchange-document数据")
                return None
            
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
            doc_id = doc.get('document-id', [])
            if isinstance(doc_id, list):
                for d in doc_id:
                    if d.get('@document-id-type') == 'epodoc':
                        return d.get('doc-number', '')
            
            country = doc.get('@country', '')
            doc_num = doc.get('@doc-number', '')
            kind = doc.get('@kind', '')
            if doc_num:
                return f"{country}{doc_num}.{kind}" if kind else f"{country}{doc_num}"
            return ''
        except:
            return ''
    
    def _extract_title(self, biblio: Dict) -> str:
        try:
            title_data = biblio.get('invention-title', {})
            return self._get_text_value(title_data)
        except Exception as e:
            logger.error(f"提取标题失败: {e}")
            return ''
    
    def _extract_abstract(self, biblio: Dict) -> str:
        try:
            abstract_data = biblio.get('abstract', {})
            if not abstract_data:
                return ''
            
            if isinstance(abstract_data, str):
                return abstract_data
            
            p = abstract_data.get('p', {})
            if isinstance(p, list):
                texts = [self._get_text_value(item) for item in p]
                return ' '.join(text for text in texts if text)
            return self._get_text_value(p)
        except Exception as e:
            logger.error(f"提取摘要失败: {e}")
            return ''
    
    def _extract_abstract_from_exchange(self, exchange_doc: Dict) -> str:
        """从 exchange-document 直接提取摘要（abstract 是 exchange-document 的直接子元素）"""
        try:
            abstract_data = exchange_doc.get('abstract', {})
            if not abstract_data:
                return ''
            
            if isinstance(abstract_data, str):
                return abstract_data
            
            p = abstract_data.get('p', {})
            if isinstance(p, list):
                texts = [self._get_text_value(item) for item in p]
                return ' '.join(text for text in texts if text)
            return self._get_text_value(p)
        except Exception as e:
            logger.error(f"提取摘要失败: {e}")
            return ''
    
    def _extract_cpc_classifications(self, biblio: Dict) -> List[str]:
        """提取 CPC 分类号 - 使用 patent-classifications 字段（复数）"""
        try:
            # 优先使用 patent-classifications（复数形式）
            classifications = biblio.get('patent-classifications', {})
            if classifications:
                patent_class_list = classifications.get('patent-classification', [])
                if isinstance(patent_class_list, dict):
                    patent_class_list = [patent_class_list]
                
                result = []
                for c in patent_class_list:
                    if not isinstance(c, dict):
                        continue
                    
                    # 检查 classification-scheme 是否为 CPC
                    scheme = c.get('classification-scheme', {})
                    scheme_value = self._get_text_value(scheme)
                    
                    if scheme_value and scheme_value.upper() in ['CPC', 'CPCI', 'CPCY']:
                        # 组合分类号
                        section = self._get_text_value(c.get('section', {}))
                        pc_class = self._get_text_value(c.get('class', {}))
                        subclass = self._get_text_value(c.get('subclass', {}))
                        main_group = self._get_text_value(c.get('main-group', {}))
                        sub_group = self._get_text_value(c.get('subgroup', {}))
                        
                        symbol = ''
                        if section:
                            symbol += section
                        if pc_class:
                            symbol += pc_class
                        if subclass:
                            symbol += subclass
                        if main_group:
                            symbol += main_group
                        if sub_group:
                            symbol += '/' + sub_group
                        
                        if symbol:
                            result.append(symbol)
                
                if result:
                    return result
            
            # 备用：尝试 patent-classification（单数形式）
            classifications = biblio.get('patent-classification', [])
            if isinstance(classifications, dict):
                classifications = [classifications]
            
            result = []
            for c in classifications:
                if not isinstance(c, dict):
                    continue
                
                scheme = c.get('classification-scheme', {})
                scheme_value = self._get_text_value(scheme)
                
                if scheme_value and scheme_value.upper() in ['CPC', 'CPCI', 'CPCY']:
                    section = self._get_text_value(c.get('section', {}))
                    pc_class = self._get_text_value(c.get('class', {}))
                    subclass = self._get_text_value(c.get('subclass', {}))
                    main_group = self._get_text_value(c.get('main-group', {}))
                    sub_group = self._get_text_value(c.get('subgroup', {}))
                    
                    symbol = ''
                    if section:
                        symbol += section
                    if pc_class:
                        symbol += pc_class
                    if subclass:
                        symbol += subclass
                    if main_group:
                        symbol += main_group
                    if sub_group:
                        symbol += '/' + sub_group
                    
                    if symbol:
                        result.append(symbol)
            
            if result:
                return result
            
            # 最后尝试 classifications-cpc
            class_container = biblio.get('classifications-cpc', {})
            class_data = class_container.get('classification-cpc', [])
            
            if isinstance(class_data, dict):
                class_data = [class_data]
            
            for c in class_data:
                if not isinstance(c, dict):
                    continue
                
                text = c.get('text', {})
                text_val = self._get_text_value(text)
                if text_val:
                    result.append(text_val)
                    continue
                
                class_symbol = c.get('classification-symbol', {})
                symbol = self._get_text_value(class_symbol)
                if symbol:
                    result.append(symbol)
            
            return result
        except Exception as e:
            logger.error(f"提取CPC分类号失败: {e}")
            return []
    
    def _get_text_value(self, data: Any) -> str:
        if data is None:
            return ''
        if isinstance(data, str):
            return data.strip()
        if isinstance(data, dict):
            if '$' in data:
                return str(data['$']).strip()
            for key in ['$', '#text']:
                if key in data and data[key]:
                    return str(data[key]).strip()
            for key, value in data.items():
                if not key.startswith('@'):
                    if isinstance(value, str) and value:
                        return value.strip()
                    elif isinstance(value, dict):
                        result = self._get_text_value(value)
                        if result:
                            return result
        if isinstance(data, list) and len(data) > 0:
            return self._get_text_value(data[0])
        return ''
    
    def _extract_parties(self, biblio: Dict, party_type: str) -> List[str]:
        try:
            parties = biblio.get('parties', {})
            if not parties:
                return []
            
            party_container = parties.get(f'{party_type}s', {})
            data = party_container.get(f'{party_type}', [])
            
            if isinstance(data, dict):
                data = [data]
            
            result = []
            for party in data:
                if not isinstance(party, dict):
                    continue
                name = party.get(f'{party_type}-name', {})
                text = self._get_text_value(name)
                if text:
                    result.append(text)
            
            return result
        except Exception as e:
            logger.error(f"提取{party_type}失败: {e}")
            return []
    
    def _extract_date(self, biblio: Dict, date_type: str) -> str:
        try:
            if date_type == 'publication':
                dates = biblio.get('publication-reference', {}).get('document-id', [])
            elif date_type == 'application':
                dates = biblio.get('application-reference', {}).get('document-id', [])
            elif date_type == 'priority':
                priority_claims = biblio.get('priority-claims', {})
                if not priority_claims:
                    logger.debug("未找到 priority-claims")
                    return ''
                
                dates = priority_claims.get('priority-claim', [])
                if isinstance(dates, dict):
                    dates = [dates]
                
                logger.debug(f"找到 {len(dates)} 个 priority-claim")
                
                for d in dates:
                    if not isinstance(d, dict):
                        continue
                    doc_id = d.get('document-id', [])
                    if isinstance(doc_id, dict):
                        doc_id = [doc_id]
                    
                    for doc in doc_id:
                        if not isinstance(doc, dict):
                            continue
                        # 检查 document-id-type 属性
                        doc_type = doc.get('@document-id-type', '')
                        logger.debug(f"priority document-id-type: {doc_type}")
                        
                        # 优先使用 epodoc 格式，如果没有就用 docdb 格式
                        date_val = doc.get('date', {})
                        if isinstance(date_val, dict):
                            date_str = date_val.get('$', '')
                        else:
                            date_str = str(date_val) if date_val else ''
                        
                        if date_str:
                            logger.debug(f"找到优先权日: {date_str}")
                            return date_str
                return ''
            else:
                return ''
            
            if isinstance(dates, dict):
                dates = [dates]
            
            if isinstance(dates, list):
                for d in dates:
                    if not isinstance(d, dict):
                        continue
                    doc_type = d.get('@document-id-type', '')
                    if doc_type == 'epodoc':
                        date_val = d.get('date', {})
                        if isinstance(date_val, dict):
                            return date_val.get('$', '')
                        return str(date_val) if date_val else ''
            return ''
        except Exception as e:
            logger.error(f"提取日期失败: {e}")
            return ''
    
    def _extract_classifications(self, biblio: Dict, class_type: str) -> List[str]:
        try:
            if class_type == 'cpc':
                class_container = biblio.get('classifications-cpc', {})
                class_data = class_container.get('classification-cpc', [])
            else:
                class_container = biblio.get('classifications-ipcr', {})
                class_data = class_container.get('classification-ipcr', [])
            
            if isinstance(class_data, dict):
                class_data = [class_data]
            
            result = []
            for c in class_data:
                if not isinstance(c, dict):
                    continue
                
                text = c.get('text', {})
                text_val = self._get_text_value(text)
                if text_val:
                    result.append(text_val)
                    continue
                
                class_symbol = c.get('classification-symbol', {})
                symbol = self._get_text_value(class_symbol)
                if symbol:
                    result.append(symbol)
            
            return result
        except Exception as e:
            logger.error(f"提取分类号失败: {e}")
            return []
    
    def _extract_first_drawing_url(self, exchange_doc: Dict, patent_number: str) -> str:
        try:
            drawings_info = exchange_doc.get('drawings-info', {})
            if not drawings_info:
                return ''
            
            drawings = drawings_info.get('drawing', [])
            if isinstance(drawings, dict):
                drawings = [drawings]
            
            if drawings:
                first_drawing = drawings[0]
                img = first_drawing.get('img', {})
                if isinstance(img, dict):
                    img_id = img.get('@id', '')
                    if img_id:
                        return f"{EPO_OPS_BASE_URL}/published-data/images/{patent_number}/{img_id}.png"
            return ''
        except Exception as e:
            logger.debug(f"提取附图URL失败: {e}")
            return ''
    
    def get_first_drawing(self, patent_number: str) -> Dict:
        url = f"{EPO_OPS_BASE_URL}/published-data/publication/epodoc/{patent_number}/images"
        
        try:
            data, quota_info = self._make_request(url)
            
            world_data = data.get('ops:world-patent-data', {})
            doc_instance = world_data.get('ops:document-instance', {})
            
            if isinstance(doc_instance, list) and len(doc_instance) > 0:
                doc_instance = doc_instance[0]
            
            links = doc_instance.get('ops:link', [])
            if isinstance(links, dict):
                links = [links]
            
            for link in links:
                link_ref = link.get('@ref', '') or link.get('@link', '')
                if link_ref:
                    drawing_url = f"{EPO_OPS_BASE_URL}{link_ref}.png"
                    return {
                        'success': True,
                        'drawing_url': drawing_url,
                        'quota_info': asdict(quota_info)
                    }
            
            return {
                'success': False,
                'error': '未找到附图',
                'quota_info': asdict(quota_info)
            }
        except Exception as e:
            logger.error(f"获取附图失败: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _extract_claims(self, data: Dict) -> List[str]:
        try:
            world_data = data.get('ops:world-patent-data', {})
            
            # 正确路径: fulltext-documents -> fulltext-document -> claims
            fulltext_docs = world_data.get('fulltext-documents', {})
            if not fulltext_docs:
                logger.debug("未找到 fulltext-documents")
                return []
            
            logger.debug(f"fulltext-documents keys: {list(fulltext_docs.keys()) if isinstance(fulltext_docs, dict) else 'N/A'}")
            
            # fulltext-document 可能是列表或字典
            fulltext_doc = fulltext_docs.get('fulltext-document', {})
            if isinstance(fulltext_doc, list) and fulltext_doc:
                fulltext_doc = fulltext_doc[0]
            
            if not fulltext_doc:
                logger.debug("未找到 fulltext-document")
                return []
            
            logger.debug(f"fulltext-document keys: {list(fulltext_doc.keys()) if isinstance(fulltext_doc, dict) else 'N/A'}")
            
            # claims 可能在 claims 字段下
            claims_data = fulltext_doc.get('claims', {})
            if not claims_data:
                logger.debug("未找到 claims")
                return []
            
            logger.debug(f"claims keys: {list(claims_data.keys()) if isinstance(claims_data, dict) else 'N/A'}")
            
            # claim 可能是列表或字典
            claim_list = claims_data.get('claim', [])
            if isinstance(claim_list, dict):
                claim_list = [claim_list]
            
            logger.debug(f"找到 {len(claim_list)} 条权利要求")
            
            result = []
            for i, claim in enumerate(claim_list):
                if isinstance(claim, str):
                    # 直接是字符串
                    result.append(claim)
                    continue
                
                if not isinstance(claim, dict):
                    continue
                
                # 尝试多种可能的 claim text 字段
                claim_text = claim.get('claim-text', {})
                
                # claim-text 可能是字符串或字典
                if isinstance(claim_text, str):
                    result.append(claim_text)
                    continue
                
                if not claim_text:
                    # 尝试直接获取文本
                    claim_text = claim.get('$', '')
                    if isinstance(claim_text, str) and claim_text:
                        result.append(claim_text)
                        continue
                    # 尝试其他可能的字段
                    for key in ['text', 'p', 'content']:
                        if key in claim:
                            claim_text = claim.get(key, {})
                            break
                
                text = self._get_text_value(claim_text)
                if text:
                    result.append(text)
                else:
                    # 如果还是获取不到，尝试递归提取所有文本
                    text = self._extract_all_text(claim)
                    if text:
                        result.append(text)
            
            logger.info(f"成功提取 {len(result)} 条权利要求")
            return result
        except Exception as e:
            logger.error(f"提取权利要求失败: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def _extract_all_text(self, data: Any) -> str:
        """递归提取所有文本内容"""
        if isinstance(data, str):
            return data.strip()
        elif isinstance(data, dict):
            if '$' in data:
                return str(data['$']).strip()
            texts = []
            for key, value in data.items():
                if key.startswith('@'):
                    continue
                text = self._extract_all_text(value)
                if text:
                    texts.append(text)
            return ' '.join(texts)
        elif isinstance(data, list):
            texts = []
            for item in data:
                text = self._extract_all_text(item)
                if text:
                    texts.append(text)
            return ' '.join(texts)
        return ''
    
    def _extract_description(self, data: Dict) -> str:
        try:
            world_data = data.get('ops:world-patent-data', {})
            desc_data = world_data.get('description', {})
            if not desc_data:
                return ''
            
            p_list = desc_data.get('p', [])
            if isinstance(p_list, dict):
                p_list = [p_list]
            
            texts = []
            for p in p_list:
                if isinstance(p, dict):
                    text = self._get_text_value(p)
                    if text:
                        texts.append(text)
            
            return '\n'.join(texts)
        except Exception as e:
            logger.error(f"提取说明书失败: {e}")
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
                                if isinstance(timestamp, (int, float)):
                                    ts = float(timestamp)
                                elif timestamp is not None:
                                    ts = float(str(timestamp).strip())
                                else:
                                    ts = 0.0
                            except (ValueError, TypeError):
                                ts = 0.0
                            
                            try:
                                if isinstance(value_str, (int, float)):
                                    value = float(value_str)
                                elif value_str is not None:
                                    clean_str = str(value_str).strip()
                                    if clean_str:
                                        clean_str = clean_str.replace(',', '')
                                        value = float(clean_str)
                                    else:
                                        value = 0.0
                                else:
                                    value = 0.0
                            except (ValueError, TypeError) as e:
                                logger.warning(f"无法转换值 '{value_str}': {e}")
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


epo_ops_client = None


def get_epo_ops_client() -> EPOOPSClient:
    global epo_ops_client
    if epo_ops_client is None:
        epo_ops_client = EPOOPSClient()
    return epo_ops_client
