"""
EPO OPS 适配层

基于 python-epo-ops-client 库封装，提供：
1. 智能请求节流
2. 响应缓存
3. 自动 Token 管理
4. 数据解析
5. 配额管理集成
"""

import os
import logging
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta

import epo_ops
from epo_ops.models import Docdb, Epodoc

logger = logging.getLogger(__name__)


@dataclass
class EPOAdapterConfig:
    cache_enabled: bool = True
    cache_timeout: int = 86400 * 7
    throttle_enabled: bool = True
    request_timeout: int = 30


class EPOAdapter:
    """
    EPO OPS 适配器
    
    封装 python-epo-ops-client，提供：
    - 自动 Token 管理
    - 智能请求节流
    - 响应缓存
    - 统一的数据解析接口
    """
    
    _instance = None
    _client = None
    
    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self, config: EPOAdapterConfig = None):
        if self._client is not None:
            return
            
        self.config = config or EPOAdapterConfig()
        self._init_client()
    
    def _init_client(self):
        consumer_key = os.getenv('EPO_OPS_KEY', '')
        consumer_secret = os.getenv('EPO_OPS_SECRET', '')
        
        if not consumer_key or not consumer_secret:
            logger.warning("EPO OPS 凭证未配置")
            return
        
        middlewares = []
        
        if self.config.cache_enabled:
            try:
                from dogpile.cache import make_region
                import platform
                
                if platform.system() == 'Windows':
                    cache_region = make_region().configure(
                        'dogpile.cache.memory',
                        expiration_time=self.config.cache_timeout
                    )
                    logger.info("EPO 缓存中间件已启用 (内存模式 - Windows)")
                else:
                    cache_region = make_region().configure(
                        'dogpile.cache.dbm',
                        expiration_time=self.config.cache_timeout,
                        arguments={
                            'filename': os.path.join(
                                os.path.dirname(__file__), 
                                '..', '..', 'data', 'epo_cache.dbm'
                            )
                        }
                    )
                    logger.info("EPO 缓存中间件已启用 (文件模式)")
                
                middlewares.append(epo_ops.middlewares.Dogpile(region=cache_region))
            except ImportError:
                logger.warning("dogpile.cache 未安装，缓存功能禁用")
            except Exception as e:
                logger.warning(f"缓存初始化失败: {e}")
        
        if self.config.throttle_enabled:
            middlewares.append(epo_ops.middlewares.Throttler())
            logger.info("EPO 节流中间件已启用")
        
        self._client = epo_ops.Client(
            key=consumer_key,
            secret=consumer_secret,
            accept_type='json',
            middlewares=middlewares
        )
        
        logger.info("EPO OPS 客户端初始化成功")
    
    def is_configured(self) -> bool:
        return self._client is not None
    
    def search(
        self, 
        query: str, 
        range_start: int = 1, 
        range_end: int = 25
    ) -> Tuple[List[Dict], int, Dict]:
        """
        搜索专利
        
        Args:
            query: CQL 查询语句
            range_start: 起始位置
            range_end: 结束位置
            
        Returns:
            (专利列表, 总结果数, 响应元数据)
        """
        if not self.is_configured():
            raise ValueError("EPO OPS 客户端未配置")
        
        logger.info(f"EPO 搜索: {query}, 范围: {range_start}-{range_end}")
        
        response = self._client.published_data_search(
            cql=query,
            range_begin=range_start,
            range_end=range_end
        )
        
        return self._parse_search_response(response)
    
    def _parse_search_response(self, response) -> Tuple[List[Dict], int, Dict]:
        """解析搜索响应"""
        results = []
        total_count = 0
        metadata = {
            'status_code': response.status_code,
            'content_length': len(response.content) if response.content else 0
        }
        
        if response.status_code != 200:
            logger.error(f"搜索失败: {response.status_code}")
            return results, total_count, metadata
        
        try:
            data = response.json()
        except Exception as e:
            logger.error(f"解析响应失败: {e}")
            return results, total_count, metadata
        
        world_data = data.get('ops:world-patent-data', {})
        search_data = world_data.get('ops:biblio-search', {})
        total_count = int(search_data.get('@total-result-count', 0))
        
        search_results = search_data.get('ops:search-result', [])
        
        if isinstance(search_results, dict):
            search_results = [search_results]
        
        for search_result in search_results:
            if not isinstance(search_result, dict):
                continue
                
            pub_refs = search_result.get('ops:publication-reference', [])
            if isinstance(pub_refs, dict):
                pub_refs = [pub_refs]
            
            for pub_ref in pub_refs:
                patent_info = self._extract_patent_info(pub_ref)
                if patent_info:
                    results.append(patent_info)
        
        logger.info(f"搜索完成: {len(results)} 条结果, 总数: {total_count}")
        return results, total_count, metadata
    
    def _extract_patent_info(self, pub_ref: Dict) -> Optional[Dict]:
        """从 publication-reference 提取专利信息"""
        try:
            doc_id = pub_ref.get('document-id', {})
            
            if isinstance(doc_id, list):
                docdb_id = None
                epodoc_id = None
                for d in doc_id:
                    doc_type = d.get('@document-id-type', '')
                    if doc_type == 'docdb':
                        docdb_id = d
                    elif doc_type == 'epodoc':
                        epodoc_id = d
                
                doc_id = docdb_id or epodoc_id or (doc_id[0] if doc_id else {})
            
            country = self._get_text_value(doc_id.get('country', {}))
            doc_num = self._get_text_value(doc_id.get('doc-number', {}))
            kind = self._get_text_value(doc_id.get('kind', {}))
            
            if country and doc_num:
                patent_number = f"{country}.{doc_num}"
                if kind:
                    patent_number = f"{patent_number}.{kind}"
                
                return {
                    'patent_number': patent_number,
                    'country': country,
                    'doc_number': doc_num,
                    'kind': kind,
                    'docdb_format': f"{country}.{doc_num}.{kind}" if kind else f"{country}.{doc_num}",
                    'epodoc_format': f"{country}{doc_num}{kind}" if kind else f"{country}{doc_num}"
                }
        except Exception as e:
            logger.error(f"提取专利信息失败: {e}")
        
        return None
    
    def _get_text_value(self, data: Any) -> str:
        """提取文本值"""
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
        return ''
    
    def get_biblio(self, patent_number: str, format_type: str = 'docdb') -> Tuple[Optional[Dict], Dict]:
        """
        获取专利书目数据
        
        Args:
            patent_number: 专利号
            format_type: 格式类型 ('docdb' 或 'epodoc')
            
        Returns:
            (书目数据字典, 元数据)
        """
        if not self.is_configured():
            raise ValueError("EPO OPS 客户端未配置")
        
        input_model = self._create_input_model(patent_number, format_type)
        
        logger.info(f"获取书目数据: {patent_number}")
        
        response = self._client.published_data(
            reference_type='publication',
            input=input_model,
            endpoint='biblio'
        )
        
        return self._parse_biblio_response(response, patent_number)
    
    def _create_input_model(self, patent_number: str, format_type: str):
        """创建输入模型"""
        parts = patent_number.replace('.', ' ').split()
        
        if len(parts) >= 2:
            country = parts[0]
            doc_num = parts[1]
            kind = parts[2] if len(parts) > 2 else ''
        else:
            country = patent_number[:2]
            doc_num = patent_number[2:]
            kind = ''
        
        if format_type == 'epodoc':
            return Epodoc(f"{country}{doc_num}{kind}")
        else:
            return Docdb(doc_num, country, kind)
    
    def _parse_biblio_response(self, response, patent_number: str) -> Tuple[Optional[Dict], Dict]:
        """解析书目数据响应"""
        metadata = {
            'status_code': response.status_code,
            'content_length': len(response.content) if response.content else 0
        }
        
        if response.status_code != 200:
            logger.error(f"获取书目数据失败: {response.status_code}")
            return None, metadata
        
        try:
            data = response.json()
        except Exception as e:
            logger.error(f"解析书目数据失败: {e}")
            return None, metadata
        
        world_data = data.get('ops:world-patent-data', {})
        exchange_doc = world_data.get('exchange-document', {})
        
        if not exchange_doc:
            exchange_doc = world_data.get('exchange-documents', {}).get('exchange-document', {})
        
        if isinstance(exchange_doc, list) and len(exchange_doc) > 0:
            exchange_doc = exchange_doc[0]
        
        if not exchange_doc:
            return None, metadata
        
        biblio = exchange_doc.get('bibliographic-data', {})
        
        result = {
            'patent_number': patent_number,
            'title': self._extract_title(biblio),
            'abstract': self._extract_abstract(exchange_doc),
            'applicants': self._extract_parties(biblio, 'applicant'),
            'inventors': self._extract_parties(biblio, 'inventor'),
            'publication_date': self._extract_date(biblio, 'publication'),
            'application_date': self._extract_date(biblio, 'application'),
            'priority_date': self._extract_date(biblio, 'priority'),
            'cpc_classifications': self._extract_cpc_classifications(biblio),
            'ipc_classifications': self._extract_ipc_classifications(biblio),
            'family_id': exchange_doc.get('@family-id', ''),
            'url': f"https://patents.google.com/patent/{patent_number}"
        }
        
        return result, metadata
    
    def _extract_title(self, biblio: Dict) -> str:
        """提取标题"""
        title_data = biblio.get('invention-title', {})
        return self._get_text_value(title_data)
    
    def _extract_abstract(self, exchange_doc: Dict) -> str:
        """提取摘要"""
        abstract_data = exchange_doc.get('abstract', {})
        
        if not abstract_data:
            return ''
        
        if isinstance(abstract_data, str):
            return abstract_data
        
        if isinstance(abstract_data, list):
            texts = []
            for item in abstract_data:
                if isinstance(item, str):
                    texts.append(item)
                elif isinstance(item, dict):
                    p = item.get('p', {})
                    if isinstance(p, list):
                        texts.extend(self._get_text_value(x) for x in p)
                    else:
                        texts.append(self._get_text_value(p))
            return ' '.join(t for t in texts if t)
        
        p = abstract_data.get('p', {})
        if isinstance(p, list):
            texts = [self._get_text_value(item) for item in p]
            return ' '.join(text for text in texts if text)
        
        return self._get_text_value(p)
    
    def _extract_parties(self, biblio: Dict, party_type: str) -> List[str]:
        """提取申请人/发明人"""
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
    
    def _extract_date(self, biblio: Dict, date_type: str) -> str:
        """提取日期"""
        try:
            if date_type == 'publication':
                dates = biblio.get('publication-reference', {}).get('document-id', [])
            elif date_type == 'application':
                dates = biblio.get('application-reference', {}).get('document-id', [])
            elif date_type == 'priority':
                priority_claims = biblio.get('priority-claims', {})
                if not priority_claims:
                    return ''
                dates = priority_claims.get('priority-claim', [])
                if isinstance(dates, dict):
                    dates = [dates]
                for d in dates:
                    if not isinstance(d, dict):
                        continue
                    doc_id = d.get('document-id', [])
                    if isinstance(doc_id, dict):
                        doc_id = [doc_id]
                    for doc in doc_id:
                        if not isinstance(doc, dict):
                            continue
                        date_val = doc.get('date', {})
                        return self._get_text_value(date_val)
                return ''
            else:
                return ''
            
            if isinstance(dates, dict):
                dates = [dates]
            
            for d in dates:
                if not isinstance(d, dict):
                    continue
                doc_type = d.get('@document-id-type', '')
                if doc_type == 'epodoc':
                    date_val = d.get('date', {})
                    return self._get_text_value(date_val)
            
            return ''
        except Exception as e:
            logger.error(f"提取日期失败: {e}")
            return ''
    
    def _extract_cpc_classifications(self, biblio: Dict) -> List[str]:
        """提取 CPC 分类号"""
        result = []
        
        classifications = biblio.get('patent-classifications', {})
        if classifications:
            patent_class_list = classifications.get('patent-classification', [])
            if isinstance(patent_class_list, dict):
                patent_class_list = [patent_class_list]
            
            for c in patent_class_list:
                if not isinstance(c, dict):
                    continue
                
                scheme = self._get_text_value(c.get('classification-scheme', {}))
                
                if scheme and scheme.upper() in ['CPC', 'CPCI', 'CPCY']:
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
        
        if not result:
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
    
    def _extract_ipc_classifications(self, biblio: Dict) -> List[str]:
        """提取 IPC 分类号"""
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
    
    def get_claims(self, patent_number: str, format_type: str = 'epodoc') -> Tuple[List[str], Dict]:
        """
        获取权利要求
        
        Args:
            patent_number: 专利号
            format_type: 格式类型
            
        Returns:
            (权利要求列表, 元数据)
        """
        if not self.is_configured():
            raise ValueError("EPO OPS 客户端未配置")
        
        input_model = self._create_input_model(patent_number, format_type)
        
        logger.info(f"获取权利要求: {patent_number}")
        
        try:
            response = self._client.published_data(
                reference_type='publication',
                input=input_model,
                endpoint='claims'
            )
            
            return self._parse_claims_response(response)
        except Exception as e:
            logger.error(f"获取权利要求失败: {e}")
            return [], {'error': str(e)}
    
    def _parse_claims_response(self, response) -> Tuple[List[str], Dict]:
        """解析权利要求响应"""
        metadata = {
            'status_code': response.status_code,
            'content_length': len(response.content) if response.content else 0
        }
        
        if response.status_code != 200:
            logger.error(f"获取权利要求失败: {response.status_code}")
            return [], metadata
        
        try:
            data = response.json()
        except Exception as e:
            logger.error(f"解析权利要求失败: {e}")
            return [], metadata
        
        world_data = data.get('ops:world-patent-data', {})
        fulltext_docs = world_data.get('ftxt:fulltext-documents', {})
        
        if not fulltext_docs:
            fulltext_docs = world_data.get('fulltext-documents', {})
        
        fulltext_doc = fulltext_docs.get('ftxt:fulltext-document', {})
        if not fulltext_doc:
            fulltext_doc = fulltext_docs.get('fulltext-document', {})
        
        if isinstance(fulltext_doc, list) and fulltext_doc:
            fulltext_doc = fulltext_doc[0]
        
        if not fulltext_doc:
            return [], metadata
        
        claims_data = fulltext_doc.get('claims', {})
        if not claims_data:
            return [], metadata
        
        claim_obj = claims_data.get('claim', {})
        claim_texts = claim_obj.get('claim-text', [])
        
        if not isinstance(claim_texts, list):
            claim_texts = [claim_texts]
        
        result = []
        for ct in claim_texts:
            if isinstance(ct, str):
                result.append(ct)
            elif isinstance(ct, dict):
                text = ct.get('$', '')
                if text:
                    result.append(text)
                else:
                    text = self._get_text_value(ct)
                    if text:
                        result.append(text)
        
        logger.info(f"解析出 {len(result)} 条权利要求")
        return result, metadata
    
    def get_description(self, patent_number: str, format_type: str = 'epodoc') -> Tuple[str, Dict]:
        """
        获取说明书
        
        Args:
            patent_number: 专利号
            format_type: 格式类型
            
        Returns:
            (说明书文本, 元数据)
        """
        if not self.is_configured():
            raise ValueError("EPO OPS 客户端未配置")
        
        input_model = self._create_input_model(patent_number, format_type)
        
        logger.info(f"获取说明书: {patent_number}")
        
        try:
            response = self._client.published_data(
                reference_type='publication',
                input=input_model,
                endpoint='description'
            )
            
            return self._parse_description_response(response)
        except Exception as e:
            logger.error(f"获取说明书失败: {e}")
            return '', {'error': str(e)}
    
    def _parse_description_response(self, response) -> Tuple[str, Dict]:
        """解析说明书响应"""
        metadata = {
            'status_code': response.status_code,
            'content_length': len(response.content) if response.content else 0
        }
        
        if response.status_code != 200:
            logger.error(f"获取说明书失败: {response.status_code}")
            return '', metadata
        
        try:
            data = response.json()
        except Exception as e:
            logger.error(f"解析说明书失败: {e}")
            return '', metadata
        
        world_data = data.get('ops:world-patent-data', {})
        desc_data = world_data.get('description', {})
        
        if not desc_data:
            return '', metadata
        
        p_list = desc_data.get('p', [])
        if isinstance(p_list, dict):
            p_list = [p_list]
        
        texts = []
        for p in p_list:
            if isinstance(p, dict):
                text = self._get_text_value(p)
                if text:
                    texts.append(text)
        
        return '\n'.join(texts), metadata
    
    def get_images_info(self, patent_number: str, format_type: str = 'docdb') -> Tuple[Optional[Dict], Dict]:
        """
        获取图片信息
        
        Args:
            patent_number: 专利号
            format_type: 格式类型
            
        Returns:
            (图片信息字典, 元数据)
        """
        if not self.is_configured():
            raise ValueError("EPO OPS 客户端未配置")
        
        input_model = self._create_input_model(patent_number, format_type)
        
        logger.info(f"获取图片信息: {patent_number}")
        
        try:
            response = self._client.image(path=f"published-data/publication/{format_type}/{patent_number}/images")
            
            return self._parse_images_response(response)
        except Exception as e:
            logger.error(f"获取图片信息失败: {e}")
            return None, {'error': str(e)}
    
    def _parse_images_response(self, response) -> Tuple[Optional[Dict], Dict]:
        """解析图片响应"""
        metadata = {
            'status_code': response.status_code,
            'content_length': len(response.content) if response.content else 0
        }
        
        if response.status_code != 200:
            logger.error(f"获取图片信息失败: {response.status_code}")
            return None, metadata
        
        try:
            data = response.json()
        except Exception as e:
            logger.error(f"解析图片信息失败: {e}")
            return None, metadata
        
        world_data = data.get('ops:world-patent-data', {})
        doc_inquiry = world_data.get('ops:document-inquiry', {})
        inquiry_result = doc_inquiry.get('ops:inquiry-result', {})
        
        doc_instances = inquiry_result.get('ops:document-instance', [])
        if not isinstance(doc_instances, list):
            doc_instances = [doc_instances] if doc_instances else []
        
        drawing_link = None
        first_page_link = None
        
        for doc_inst in doc_instances:
            if not isinstance(doc_inst, dict):
                continue
            
            desc = doc_inst.get('@desc', '')
            link = doc_inst.get('@link', '')
            
            if desc == 'Drawing' and link:
                drawing_link = link
            elif desc == 'FirstPageClipping' and link:
                first_page_link = link
        
        final_link = drawing_link or first_page_link
        
        if final_link:
            base_url = "https://ops.epo.org/3.2/rest-services"
            return {
                'drawing_url': f"{base_url}/{final_link}.png",
                'drawing_link': drawing_link,
                'first_page_link': first_page_link
            }, metadata
        
        return None, metadata
    
    def get_family(self, patent_number: str, format_type: str = 'docdb') -> Tuple[Optional[Dict], Dict]:
        """
        获取专利族信息
        
        Args:
            patent_number: 专利号
            format_type: 格式类型
            
        Returns:
            (专利族信息, 元数据)
        """
        if not self.is_configured():
            raise ValueError("EPO OPS 客户端未配置")
        
        input_model = self._create_input_model(patent_number, format_type)
        
        logger.info(f"获取专利族: {patent_number}")
        
        try:
            response = self._client.family(
                reference_type='publication',
                input=input_model
            )
            
            metadata = {
                'status_code': response.status_code,
                'content_length': len(response.content) if response.content else 0
            }
            
            if response.status_code != 200:
                return None, metadata
            
            data = response.json()
            return data.get('ops:world-patent-data', {}), metadata
        except Exception as e:
            logger.error(f"获取专利族失败: {e}")
            return None, {'error': str(e)}


_epo_adapter = None


def get_epo_adapter() -> EPOAdapter:
    """获取 EPO 适配器单例"""
    global _epo_adapter
    if _epo_adapter is None:
        _epo_adapter = EPOAdapter()
    return _epo_adapter
