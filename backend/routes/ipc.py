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
WIPO_API_BASE = 'https://ipcpub.wipo.int/api/v1'

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
    """清理标题HTML标签"""
    if not title:
        return ''
    title = re.sub(r'<[^>]+>', '', title)
    title = re.sub(r'\s+', ' ', title)
    return title.strip()


def normalize_symbol(s):
    """Normalize IPC symbol for comparison."""
    s = s.upper().replace(' ', '')
    s = s.replace('//', '/')
    return s


def fetch_from_incopat(symbol):
    """从 incoPat API 获取 IPC 数据"""
    cache_key = f"incopat_{normalize_symbol(symbol)}"
    cached = get_cached(cache_key)
    if cached:
        return cached
    
    try:
        session = get_incopat_session()
        
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
                
                if all_items:
                    set_cache(cache_key, all_items)
                    return all_items
        
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


@ipc_bp.route('/ipc/tree', methods=['GET'])
def get_tree():
    """
    Get IPC classification tree structure using incoPat API.
    """
    key = request.args.get('key', '')
    symbol = request.args.get('symbol', '')
    
    # 如果没有提供 key 或 symbol，返回根节点（8个部）
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
    
    # 如果提供了 symbol，使用 symbol 查询
    if symbol:
        target_symbol = symbol
    else:
        # key 就是 symbol
        target_symbol = key
    
    # 从 incoPat 获取数据
    all_items = fetch_from_incopat(target_symbol)
    
    if not all_items:
        # 如果 incoPat 没有数据，尝试使用部的基本信息
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
    
    # 找到目标节点
    normalized_target = normalize_symbol(target_symbol)
    target_id = None
    target_item = None
    
    for item in all_items:
        code = normalize_symbol(item.get('code', ''))
        if code == normalized_target:
            target_id = item.get('id')
            target_item = item
            break
    
    # 如果没找到精确匹配，尝试前缀匹配
    if not target_id:
        for item in all_items:
            code = normalize_symbol(item.get('code', ''))
            if code.startswith(normalized_target[:3]) or normalized_target.startswith(code[:3]):
                target_id = item.get('id')
                target_item = item
                break
    
    # 获取子节点
    children = []
    if target_id:
        for item in all_items:
            if str(item.get('pId')) == str(target_id):
                children.append({
                    'key': item.get('id', ''),
                    'symbol': item.get('code', ''),
                    'symbolcode': item.get('code', ''),
                    'title1': item.get('nameNew', item.get('name', '')),
                    'titleCn': item.get('nameNew', ''),
                    'folder': True,
                    'lazy': True
                })
    
    # 如果没有子节点，返回目标节点本身
    if not children and target_item:
        return create_response(data=[{
            'key': target_item.get('id', ''),
            'symbol': target_item.get('code', ''),
            'symbolcode': target_item.get('code', ''),
            'title1': target_item.get('nameNew', target_item.get('name', '')),
            'titleCn': target_item.get('nameNew', ''),
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
    
    # 从 incoPat 获取数据
    all_items = fetch_from_incopat(query)
    
    results = []
    
    if all_items:
        for item in all_items:
            code = item.get('code', '')
            name = item.get('nameNew', item.get('name', ''))
            
            # 匹配分类号或标题
            if query.upper() in code.upper() or query.lower() in name.lower():
                results.append({
                    'symbol': code,
                    'code': code,
                    'title': name,
                    'titleCn': name,
                    'score': 100 if query.upper() in code.upper() else 50
                })
    
    # 去重并排序
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
    Get complete hierarchy path for an IPC symbol using incoPat API.
    """
    symbol = request.args.get('symbol', '').strip().upper()
    
    if not symbol:
        return create_response(error="请提供IPC分类号")
    
    symbol = normalize_symbol(symbol)
    
    # 从 incoPat 获取数据
    all_items = fetch_from_incopat(symbol)
    
    if not all_items:
        # 如果 incoPat 没有数据，返回部的基本信息
        info = get_section_info(symbol)
        if info:
            return create_response(data={
                'symbol': symbol,
                'hierarchy': [{
                    'symbol': info['symbol'],
                    'title': info['titleEn'],
                    'titleCn': info['title'],
                    'depth': 0,
                    'levelName': '部 (Section)'
                }],
                'count': 1
            })
        return create_response(error=f"未找到分类号: {symbol}")
    
    # 找到目标节点
    normalized_symbol = normalize_symbol(symbol)
    target_item = None
    
    for item in all_items:
        code = normalize_symbol(item.get('code', ''))
        if code == normalized_symbol:
            target_item = item
            break
    
    # 如果没找到精确匹配，尝试前缀匹配
    if not target_item:
        for item in all_items:
            code = normalize_symbol(item.get('code', ''))
            if code.startswith(normalized_symbol[:3]) or normalized_symbol.startswith(code[:3]):
                target_item = item
                break
    
    # 构建层级结构
    hierarchy = []
    
    if target_item:
        # 添加目标节点
        hierarchy.append({
            'symbol': target_item.get('code', ''),
            'title': target_item.get('nameNew', target_item.get('name', '')),
            'titleCn': target_item.get('nameNew', ''),
            'depth': 0
        })
        
        # 向上遍历父节点
        parent_id = target_item.get('pId')
        visited = set()
        
        while parent_id and parent_id != '-1' and parent_id not in visited:
            visited.add(parent_id)
            
            parent_item = None
            for item in all_items:
                if str(item.get('id')) == str(parent_id):
                    parent_item = item
                    break
            
            if parent_item:
                hierarchy.insert(0, {
                    'symbol': parent_item.get('code', ''),
                    'title': parent_item.get('nameNew', parent_item.get('name', '')),
                    'titleCn': parent_item.get('nameNew', ''),
                    'depth': 0
                })
                parent_id = parent_item.get('pId')
            else:
                break
    
    # 添加层级名称
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
    
    # 从 incoPat 获取数据
    all_items = fetch_from_incopat(symbol)
    
    if all_items:
        for item in all_items:
            code = normalize_symbol(item.get('code', ''))
            if code == symbol:
                return create_response(data={
                    'symbol': symbol,
                    'code': code,
                    'title': item.get('nameNew', item.get('name', '')),
                    'titleCn': item.get('nameNew', ''),
                    'key': item.get('id', ''),
                    'parentKey': item.get('pId', '')
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
            f"{WIPO_API_BASE}/search/ipccat",
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
