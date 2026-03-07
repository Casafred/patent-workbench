"""
IPC Classification API routes.

This module handles IPC classification-related operations using incoPat API.
incoPat API provides complete Chinese IPC data for free.
"""

import json
import os
import time
import traceback
import re
from functools import wraps
from flask import Blueprint, request, jsonify, current_app
from backend.utils import create_response
import requests

ipc_bp = Blueprint('ipc', __name__)

INCOPAT_API_BASE = 'https://ipc.incopat.com'

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
}

CACHE = {}
CACHE_EXPIRY = 3600
RATE_LIMIT = {}
RATE_LIMIT_WINDOW = 60
RATE_LIMIT_MAX = 30

INCOPAT_SESSION = None
INCOPAT_SESSION_TIME = 0


def get_incopat_session():
    """获取或创建 incoPat session"""
    global INCOPAT_SESSION, INCOPAT_SESSION_TIME
    
    current_time = time.time()
    if INCOPAT_SESSION is None or current_time - INCOPAT_SESSION_TIME > 1800:
        INCOPAT_SESSION = requests.Session()
        INCOPAT_SESSION.get(f'{INCOPAT_API_BASE}/', headers=HEADERS, timeout=10)
        INCOPAT_SESSION_TIME = current_time
    
    return INCOPAT_SESSION


def rate_limit(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        client_ip = request.remote_addr or 'unknown'
        current_time = time.time()
        
        if client_ip not in RATE_LIMIT:
            RATE_LIMIT[client_ip] = []
        
        RATE_LIMIT[client_ip] = [
            t for t in RATE_LIMIT[client_ip] 
            if current_time - t < RATE_LIMIT_WINDOW
        ]
        
        if len(RATE_LIMIT[client_ip]) >= RATE_LIMIT_MAX:
            return create_response(
                error="请求过于频繁，请稍后再试",
                data={"retry_after": RATE_LIMIT_WINDOW}
            ), 429
        
        RATE_LIMIT[client_ip].append(current_time)
        return f(*args, **kwargs)
    return decorated_function


def get_cached(key):
    if key in CACHE:
        data, timestamp = CACHE[key]
        if time.time() - timestamp < CACHE_EXPIRY:
            return data
        del CACHE[key]
    return None


def set_cache(key, data):
    CACHE[key] = (data, time.time())


def clean_title(title):
    """清理标题HTML标签和多余字符"""
    if not title:
        return ''
    title = re.sub(r'<[^>]+>', '', title)
    title = re.sub(r'\s+', ' ', title)
    title = title.strip()
    
    # 去掉分类号前缀（如 "H04L9/08  "）
    title = re.sub(r'^[A-Z0-9/]+\s*', '', title)
    
    # 去掉日期部分（如 "[20060101]"）
    title = re.sub(r'\s*\[\d+\]', '', title)
    
    # 去掉开头的星号（表示层级深度）
    title = re.sub(r'^\*+', '', title)
    
    return title.strip()


def normalize_symbol(s):
    """Normalize IPC symbol for comparison."""
    s = s.upper().replace(' ', '')
    s = s.replace('//', '/')
    return s


def extract_base_symbol(symbol):
    """从分类号中提取基础部分用于查询
    
    例如:
    - H04L9/08 -> H04L9
    - A61K31/00 -> A61K31
    - G06F17/00 -> G06F17
    - A61K31 -> A61K31
    """
    symbol = normalize_symbol(symbol)
    
    # 如果包含斜杠，提取斜杠前的部分
    if '/' in symbol:
        return symbol.split('/')[0]
    
    return symbol


def fetch_from_incopat_query(symbol):
    """从 incoPat ipcquery API 获取 IPC 数据
    
    这是 incoPat 网站使用的真实 API，返回完整的层级数据。
    """
    cache_key = f"incopat_query_{normalize_symbol(symbol)}"
    cached = get_cached(cache_key)
    if cached:
        return cached
    
    try:
        session = get_incopat_session()
        
        base_symbol = extract_base_symbol(symbol)
        
        resp = session.post(
            f'{INCOPAT_API_BASE}/ipcFindTool/ipcquery',
            data={
                'id': '',
                'code': base_symbol,
                'version': '2026',
                'format': 'zh'
            },
            headers={
                **HEADERS,
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
            },
            timeout=30
        )
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get('status') and data.get('data'):
                items = data.get('data', [])
                
                # 去重并构建字典
                seen = set()
                unique_items = []
                for item in items:
                    code = item.get('code', '').replace(' ', '').upper()
                    if code not in seen:
                        seen.add(code)
                        unique_items.append(item)
                
                if unique_items:
                    set_cache(cache_key, unique_items)
                    return unique_items
        
        return None
    except Exception as e:
        print(f'incoPat ipcquery API error: {e}')
        return None


def fetch_parent_title_from_incopat(symbol):
    """从 incoPat API 获取父节点的标题
    
    使用多种策略获取标题：
    1. 使用 ipcRecommendSearch API
    2. 使用 ipcquery API 从父节点的子节点列表中查找
    """
    cache_key = f"incopat_parent_{normalize_symbol(symbol)}"
    cached = get_cached(cache_key)
    if cached:
        return cached
    
    try:
        session = get_incopat_session()
        normalized_symbol = normalize_symbol(symbol)
        
        # 策略1: 使用 ipcRecommendSearch API
        resp = session.post(
            f'{INCOPAT_API_BASE}/ipcFindTool/ipcRecommendSearch',
            data={
                'input': symbol,
                'version': '2026',
                'format': 'zh'
            },
            headers={
                **HEADERS,
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
            },
            timeout=15
        )
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get('data') and data.get('status'):
                all_items = []
                for level_data in data['data']:
                    if isinstance(level_data, list):
                        all_items.extend(level_data)
                
                for item in all_items:
                    code = normalize_symbol(item.get('code', ''))
                    if code == normalized_symbol:
                        title = clean_title(item.get('nameNew', item.get('name', '')))
                        if title:
                            set_cache(cache_key, title)
                            return title
        
        # 策略2: 使用 ipcquery API 从父节点的子节点列表中查找
        # 推断父节点（根据 IPC 结构）
        # IPC 结构：部(1位) -> 大类(3位) -> 小类(4位) -> 大组(含/) -> 小组
        parent_symbol = None
        
        if '/' in normalized_symbol:
            # 大组或小组，父节点是小类（斜杠前的部分）
            parent_symbol = normalized_symbol.split('/')[0]
        elif len(normalized_symbol) == 4:
            # 小类，父节点是大类
            parent_symbol = normalized_symbol[:3]
        elif len(normalized_symbol) == 3:
            # 大类，父节点是部
            parent_symbol = normalized_symbol[0]
        
        if parent_symbol:
            resp = session.post(
                f'{INCOPAT_API_BASE}/ipcFindTool/ipcquery',
                data={
                    'id': '',
                    'code': parent_symbol,
                    'version': '2026',
                    'format': 'zh'
                },
                headers={
                    **HEADERS,
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                timeout=30
            )
            
            if resp.status_code == 200:
                data = resp.json()
                if data.get('status') and data.get('data'):
                    items = data['data']
                    
                    # 查找目标分类号
                    for item in items:
                        code = normalize_symbol(item.get('code', ''))
                        if code == normalized_symbol:
                            title = clean_title(item.get('name', ''))
                            if title:
                                set_cache(cache_key, title)
                                return title
        
        return None
    except Exception as e:
        print(f'incoPat API error: {e}')
        return None


def get_section_info(symbol):
    """获取部的基本信息"""
    sections = {
        'A': {'symbol': 'A', 'title': '人类生活需要', 'titleEn': 'HUMAN NECESSITIES'},
        'B': {'symbol': 'B', 'title': '作业；运输', 'titleEn': 'PERFORMING OPERATIONS; TRANSPORTING'},
        'C': {'symbol': 'C', 'title': '化学；冶金', 'titleEn': 'CHEMISTRY; METALLURGY'},
        'D': {'symbol': 'D', 'title': '纺织；造纸', 'titleEn': 'TEXTILES; PAPER'},
        'E': {'symbol': 'E', 'title': '固定建筑物', 'titleEn': 'FIXED CONSTRUCTIONS'},
        'F': {'symbol': 'F', 'title': '机械工程；照明；加热；武器；爆破', 'titleEn': 'MECHANICAL ENGINEERING; LIGHTING; HEATING; WEAPONS; BLASTING'},
        'G': {'symbol': 'G', 'title': '物理', 'titleEn': 'PHYSICS'},
        'H': {'symbol': 'H', 'title': '电学', 'titleEn': 'ELECTRICITY'}
    }
    return sections.get(symbol[0] if symbol else '', None)


def build_hierarchy_from_items(symbol, items):
    """从 ipcquery 返回的数据构建层级结构"""
    if not items:
        return []
    
    normalized_symbol = normalize_symbol(symbol)
    
    # 构建分类号到条目的映射
    code_to_item = {}
    for item in items:
        code = normalize_symbol(item.get('code', ''))
        if code and code not in code_to_item:
            code_to_item[code] = item
    
    # 查找目标条目
    target_item = code_to_item.get(normalized_symbol)
    
    # 如果没找到精确匹配，尝试查找父级
    if not target_item:
        # 尝试去掉斜杠后的部分
        if '/' in normalized_symbol:
            base = normalized_symbol.split('/')[0]
            target_item = code_to_item.get(base)
        
        # 尝试前缀匹配
        if not target_item:
            for code in sorted(code_to_item.keys(), key=len, reverse=True):
                if normalized_symbol.startswith(code):
                    target_item = code_to_item[code]
                    break
    
    # 如果还是没找到，从子节点中推断
    if not target_item and items:
        # 从第一个子节点推断父节点
        first_item = items[0]
        fcode = first_item.get('fcode', '')
        
        if fcode:
            fcode_normalized = normalize_symbol(fcode)
            
            # 检查目标是否是 fcode 或 fcode 的父级
            # 例如：输入 G06F17/00，返回的 fcode 是 G06F17/00
            # 这说明 G06F17/00 是父节点（目标）
            if fcode_normalized == normalized_symbol:
                # 目标是父节点，构建虚拟条目
                # 从子节点的 code 推断目标的大组
                child_code = normalize_symbol(first_item.get('code', ''))
                if '/' in child_code:
                    # 子节点是小组，目标是该小组所属的大组
                    target_item = {
                        'code': normalized_symbol,
                        'fcode': normalized_symbol.split('/')[0],  # 小类
                        'name': first_item.get('name', '').split(']')[-1].strip() if first_item.get('name') else f'{normalized_symbol} (大组)'
                    }
                else:
                    target_item = {
                        'code': normalized_symbol,
                        'fcode': '',
                        'name': f'{normalized_symbol} (分类)'
                    }
            elif fcode_normalized.startswith(normalized_symbol) or normalized_symbol.startswith(fcode_normalized.split('/')[0]):
                # 检查是否需要添加大组层级
                if '/' in fcode_normalized and fcode_normalized.split('/')[0] == normalized_symbol:
                    # 目标是小类，fcode 是大组
                    # 需要构建：目标(小类) -> 大组
                    target_item = {
                        'code': normalized_symbol,
                        'fcode': normalized_symbol[:3] if len(normalized_symbol) > 3 else normalized_symbol[0],
                        'name': f'{normalized_symbol} (小类)'
                    }
                else:
                    # 目标是父节点，构建虚拟条目
                    target_item = {
                        'code': normalized_symbol,
                        'fcode': '',
                        'name': f'{normalized_symbol} (分类)'
                    }
    
    if not target_item:
        return []
    
    # 构建层级
    hierarchy = []
    
    # 添加目标节点
    target_code = normalize_symbol(target_item.get('code', ''))
    name = clean_title(target_item.get('name', ''))
    
    hierarchy.append({
        'symbol': target_code,
        'title': name,
        'titleCn': name,
        'depth': 0
    })
    
    # 向上遍历父节点
    fcode = target_item.get('fcode', '')
    visited = set()
    
    while fcode and fcode not in visited:
        visited.add(fcode)
        
        parent_item = code_to_item.get(normalize_symbol(fcode))
        if parent_item:
            parent_code = normalize_symbol(parent_item.get('code', ''))
            parent_name = clean_title(parent_item.get('name', ''))
            
            hierarchy.insert(0, {
                'symbol': parent_code,
                'title': parent_name,
                'titleCn': parent_name,
                'depth': 0
            })
            fcode = parent_item.get('fcode', '')
        else:
            # 如果父节点不在返回的数据中，尝试从 API 获取标题
            fcode_normalized = normalize_symbol(fcode)
            
            # 尝试从 ipcRecommendSearch API 获取标题
            parent_title = fetch_parent_title_from_incopat(fcode_normalized)
            
            if parent_title:
                hierarchy.insert(0, {
                    'symbol': fcode_normalized,
                    'title': parent_title,
                    'titleCn': parent_title,
                    'depth': 0
                })
                # 继续向上查找
                # 根据格式推断父节点
                if '/' in fcode_normalized:
                    fcode = fcode_normalized.split('/')[0]
                elif len(fcode_normalized) > 3:
                    fcode = fcode_normalized[:3]
                elif len(fcode_normalized) > 1:
                    fcode = fcode_normalized[0]
                else:
                    break
            else:
                # 如果 API 也没有返回，手动构建层级
                # 根据格式推断层级类型
                if '/' in fcode_normalized:
                    # 大组级别
                    maingroup = fcode_normalized
                    subclass = maingroup.split('/')[0]
                    
                    # 添加大组
                    hierarchy.insert(0, {
                        'symbol': maingroup,
                        'title': f'{maingroup} (大组)',
                        'titleCn': f'{maingroup} (大组)',
                        'depth': 0
                    })
                    
                    # 添加小类
                    hierarchy.insert(0, {
                        'symbol': subclass,
                        'title': f'{subclass} (小类)',
                        'titleCn': f'{subclass} (小类)',
                        'depth': 0
                    })
                else:
                    # 小类或大类级别
                    subclass = fcode_normalized
                    
                    # 添加小类
                    hierarchy.insert(0, {
                        'symbol': subclass,
                        'title': f'{subclass} (小类)',
                        'titleCn': f'{subclass} (小类)',
                        'depth': 0
                    })
                
                # 添加大类
                if len(subclass) >= 3:
                    mainclass = subclass[:3]
                    hierarchy.insert(0, {
                        'symbol': mainclass,
                        'title': f'{mainclass} (大类)',
                        'titleCn': f'{mainclass} (大类)',
                        'depth': 0
                    })
                
                # 添加部
                if len(subclass) >= 1:
                    section = subclass[0]
                    info = get_section_info(section)
                    if info:
                        hierarchy.insert(0, {
                            'symbol': section,
                            'title': info['title'],
                            'titleCn': info['title'],
                            'depth': 0
                        })
                break
    
    # 如果目标符号不在层级中，添加它
    if hierarchy and hierarchy[-1]['symbol'] != normalized_symbol:
        if normalized_symbol.startswith(hierarchy[-1]['symbol']):
            hierarchy.append({
                'symbol': normalized_symbol,
                'title': f'{normalized_symbol} (详细分类)',
                'titleCn': f'{normalized_symbol} (详细分类)',
                'depth': len(hierarchy)
            })
    
    return hierarchy


@ipc_bp.route('/ipc/tree', methods=['GET'])
def get_tree():
    """
    Get IPC classification tree structure using incoPat API.
    """
    key = request.args.get('key', '')
    symbol = request.args.get('symbol', '')
    
    if not key and not symbol:
        roots = []
        for s in ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']:
            info = get_section_info(s)
            roots.append({
                'key': s,
                'symbol': s,
                'symbolcode': s,
                'title1': info['titleEn'] if info else s,
                'titleCn': info['title'] if info else s,
                'folder': True,
                'lazy': True
            })
        return create_response(data=roots)
    
    target_symbol = symbol if symbol else key
    
    items = fetch_from_incopat_query(target_symbol)
    
    if not items:
        if len(target_symbol) <= 2:
            info = get_section_info(target_symbol)
            if info:
                return create_response(data=[{
                    'key': info['symbol'],
                    'symbol': info['symbol'],
                    'symbolcode': info['symbol'],
                    'title1': info['titleEn'],
                    'titleCn': info['title'],
                    'folder': True,
                    'lazy': True
                }])
        return create_response(error="未找到分类数据")
    
    # 构建分类号到条目的映射
    code_to_item = {}
    for item in items:
        code = normalize_symbol(item.get('code', ''))
        if code and code not in code_to_item:
            code_to_item[code] = item
    
    # 查找目标条目
    normalized_target = normalize_symbol(target_symbol)
    target_item = code_to_item.get(normalized_target)
    
    # 如果没找到精确匹配，尝试查找父级
    if not target_item:
        if '/' in normalized_target:
            base = normalized_target.split('/')[0]
            target_item = code_to_item.get(base)
        
        if not target_item:
            for code in sorted(code_to_item.keys(), key=len, reverse=True):
                if normalized_target.startswith(code):
                    target_item = code_to_item[code]
                    break
    
    # 获取子节点
    children = []
    if target_item:
        target_code = normalize_symbol(target_item.get('code', ''))
        
        for item in items:
            fcode = normalize_symbol(item.get('fcode', ''))
            if fcode == target_code:
                child_code = normalize_symbol(item.get('code', ''))
                name = item.get('name', '')
                if name:
                    name = re.sub(r'^[A-Z0-9/]+\s*', '', name).strip()
                    name = re.sub(r'\[.*?\]', '', name).strip()
                
                children.append({
                    'key': item.get('id', ''),
                    'symbol': child_code,
                    'symbolcode': child_code,
                    'title1': name,
                    'titleCn': name,
                    'folder': item.get('isParent', 0) == 1,
                    'lazy': item.get('isParent', 0) == 1
                })
    
    if not children and target_item:
        name = target_item.get('name', '')
        if name:
            name = re.sub(r'^[A-Z0-9/]+\s*', '', name).strip()
            name = re.sub(r'\[.*?\]', '', name).strip()
        
        return create_response(data=[{
            'key': target_item.get('id', ''),
            'symbol': normalize_symbol(target_item.get('code', '')),
            'symbolcode': normalize_symbol(target_item.get('code', '')),
            'title1': name,
            'titleCn': name,
            'folder': False,
            'lazy': False
        }])
    
    return create_response(data=children)


@ipc_bp.route('/ipc/search', methods=['GET'])
def search():
    """
    Search IPC symbols using incoPat API.
    """
    query = request.args.get('q', '').strip()
    limit = request.args.get('limit', 20, type=int)
    
    if not query:
        return create_response(error="请输入搜索关键词")
    
    query = query.upper()
    
    items = fetch_from_incopat_query(query)
    
    results = []
    
    if items:
        for item in items:
            code = item.get('code', '')
            name = item.get('name', '')
            if name:
                name = re.sub(r'^[A-Z0-9/]+\s*', '', name).strip()
                name = re.sub(r'\[.*?\]', '', name).strip()
            
            if query.upper() in code.upper() or query.lower() in name.lower():
                results.append({
                    'symbol': code,
                    'code': code,
                    'title': name,
                    'titleCn': name,
                    'score': 100 if query.upper() in code.upper() else 50
                })
    
    seen = set()
    unique_results = []
    for r in results:
        if r['symbol'] not in seen:
            seen.add(r['symbol'])
            unique_results.append(r)
    
    unique_results.sort(key=lambda x: x['score'], reverse=True)
    unique_results = unique_results[:min(limit, 50)]
    
    return create_response(data={
        'query': query,
        'count': len(unique_results),
        'results': unique_results
    })


@ipc_bp.route('/ipc/hierarchy', methods=['GET'])
def get_hierarchy():
    """
    Get complete hierarchy path for an IPC symbol using incoPat ipcquery API.
    """
    symbol = request.args.get('symbol', '').strip().upper()
    
    if not symbol:
        return create_response(error="请提供IPC分类号")
    
    symbol = normalize_symbol(symbol)
    
    items = fetch_from_incopat_query(symbol)
    
    hierarchy = build_hierarchy_from_items(symbol, items)
    
    if not hierarchy:
        info = get_section_info(symbol)
        if info:
            hierarchy = [{
                'symbol': info['symbol'],
                'title': info['titleEn'],
                'titleCn': info['title'],
                'depth': 0
            }]
        else:
            return create_response(error=f"未找到分类号: {symbol}")
    
    level_names = ['部 (Section)', '大类 (Class)', '小类 (Subclass)', '大组 (Main Group)', '小组 (Subgroup)']
    for i, item in enumerate(hierarchy):
        item['depth'] = i
        item['levelName'] = level_names[i] if i < len(level_names) else f'层级 {i}'
    
    return create_response(data={
        'symbol': symbol,
        'hierarchy': hierarchy,
        'count': len(hierarchy)
    })


@ipc_bp.route('/ipc/detail', methods=['GET'])
def get_detail():
    """
    Get detailed information for an IPC symbol using incoPat API.
    """
    symbol = request.args.get('symbol', '').strip().upper()
    
    if not symbol:
        return create_response(error="请提供IPC分类号")
    
    symbol = normalize_symbol(symbol)
    
    items = fetch_from_incopat_query(symbol)
    
    if items:
        code_to_item = {}
        for item in items:
            code = normalize_symbol(item.get('code', ''))
            if code and code not in code_to_item:
                code_to_item[code] = item
        
        item = code_to_item.get(symbol)
        if item:
            name = item.get('name', '')
            if name:
                name = re.sub(r'^[A-Z0-9/]+\s*', '', name).strip()
                name = re.sub(r'\[.*?\]', '', name).strip()
            
            return create_response(data={
                'symbol': symbol,
                'code': symbol,
                'title': name,
                'titleCn': name,
                'key': item.get('id', ''),
                'parentKey': item.get('fcode', '')
            })
    
    return create_response(error=f"未找到分类号: {symbol}")


@ipc_bp.route('/ipc/sections', methods=['GET'])
def get_sections():
    """
    Get IPC section list (A-H).
    """
    sections = [
        {'symbol': 'A', 'title': '人类生活需要', 'titleEn': 'HUMAN NECESSITIES'},
        {'symbol': 'B', 'title': '作业；运输', 'titleEn': 'PERFORMING OPERATIONS; TRANSPORTING'},
        {'symbol': 'C', 'title': '化学；冶金', 'titleEn': 'CHEMISTRY; METALLURGY'},
        {'symbol': 'D', 'title': '纺织；造纸', 'titleEn': 'TEXTILES; PAPER'},
        {'symbol': 'E', 'title': '固定建筑物', 'titleEn': 'FIXED CONSTRUCTIONS'},
        {'symbol': 'F', 'title': '机械工程；照明；加热；武器；爆破', 'titleEn': 'MECHANICAL ENGINEERING; LIGHTING; HEATING; WEAPONS; BLASTING'},
        {'symbol': 'G', 'title': '物理', 'titleEn': 'PHYSICS'},
        {'symbol': 'H', 'title': '电学', 'titleEn': 'ELECTRICITY'}
    ]
    
    return create_response(data={'sections': sections})


@ipc_bp.route('/ipc/predict', methods=['POST'])
@rate_limit
def predict():
    """
    Predict IPC classification using WIPO IPCCAT API.
    """
    req_data = request.get_json()
    text = req_data.get('q', '')
    lang = req_data.get('lang', 'zh')
    level = req_data.get('level', 'subgroup')
    limit = req_data.get('limit', 5)
    
    if not text:
        return create_response(error="请输入要分类的技术描述文本")
    
    if len(text) > 1500:
        return create_response(error="文本长度不能超过1500字符")
    
    try:
        level_map = {
            'class': 'CLASS',
            'subclass': 'SUBCLASS',
            'maingroup': 'MAINGROUP',
            'subgroup': 'SUBGROUP'
        }
        
        params = {
            'text': text,
            'lang': lang,
            'numberofpredictions': limit,
            'hierarchiclevel': level_map.get(level, 'SUBGROUP')
        }
        
        response = requests.get(
            "https://ipcpub.wipo.int/api/v1/search/ipccat",
            params=params,
            headers=HEADERS,
            timeout=30
        )
        
        if response.status_code == 500:
            return create_response(error="WIPO IPCCAT服务暂时不可用")
        
        if response.status_code != 200:
            return create_response(error=f"WIPO API请求失败: {response.status_code}")
        
        data = response.json()
        
        if data.get('code', 0) != 0:
            return create_response(error=f"IPCCAT错误: {data.get('message', '未知错误')}")
        
        result = {
            'query': text[:100] + '...' if len(text) > 100 else text,
            'lang': data.get('lang', lang),
            'version': 'latest',
            'count': data.get('count', 0),
            'results': []
        }
        
        for item in data.get('results', []):
            result['results'].append({
                'score': item.get('score', 0),
                'symbol': item.get('display', ''),
                'code': item.get('code', '')
            })
        
        return create_response(data=result)
        
    except requests.Timeout:
        return create_response(error="WIPO API请求超时")
    except Exception as e:
        print(f"Error in predict: {traceback.format_exc()}")
        return create_response(error=f"预测失败: {str(e)}")


@ipc_bp.route('/ipc/clear-cache', methods=['POST'])
def clear_cache():
    """Clear all caches."""
    global CACHE, INCOPAT_SESSION
    CACHE = {}
    INCOPAT_SESSION = None
    return create_response(data={'message': '缓存已清除'})
