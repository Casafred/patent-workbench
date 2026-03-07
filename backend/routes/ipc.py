"""
IPC Classification API routes.

This module handles IPC classification-related operations using a hybrid approach:
- Local data for basic browsing (sections, classes, subclasses)
- On-demand fetching from WIPO API for deeper levels
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

DATA_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'ipc_data.json')
IPC_DATA = None
CHILDREN_CACHE = {}
DATA_LOAD_TIME = 0

WIPO_API_BASE = 'https://ipcpub.wipo.int/api/v1'

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9'
}

def load_local_data():
    """加载本地IPC数据"""
    global IPC_DATA, DATA_LOAD_TIME
    
    if IPC_DATA is not None and time.time() - DATA_LOAD_TIME < 3600:
        return IPC_DATA
    
    try:
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                IPC_DATA = json.load(f)
                DATA_LOAD_TIME = time.time()
                print(f'IPC数据加载成功: {len(IPC_DATA.get("all_entries", {}))} 条目')
                return IPC_DATA
    except Exception as e:
        print(f'加载本地IPC数据失败: {e}')
    
    return None

def clean_title(title):
    """清理标题HTML标签"""
    if not title:
        return ''
    title = re.sub(r'<[^>]+>', '', title)
    title = re.sub(r'\s+', ' ', title)
    return title.strip()

def fetch_from_wipo(key):
    """从WIPO API获取子节点"""
    cache_key = f"wipo_{key}"
    if cache_key in CHILDREN_CACHE:
        return CHILDREN_CACHE[cache_key]
    
    try:
        url = f'{WIPO_API_BASE}/scheme/children/l1'
        params = {'key': key}
        resp = requests.get(url, params=params, headers=HEADERS, timeout=30)
        
        if resp.status_code == 200:
            data = resp.json()
            children = data.get('data', [])
            CHILDREN_CACHE[cache_key] = children
            return children
    except Exception as e:
        print(f'WIPO API请求失败: {e}')
    
    return None

CACHE = {}
CACHE_EXPIRY = 3600
RATE_LIMIT = {}
RATE_LIMIT_WINDOW = 60
RATE_LIMIT_MAX = 20


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
    
    if level not in ['class', 'subclass', 'maingroup', 'subgroup']:
        level = 'subgroup'
    
    if limit not in [3, 5]:
        limit = 3
    
    cache_key = f"predict_{hash(text)}_{lang}_{level}_{limit}"
    cached = get_cached(cache_key)
    if cached:
        return create_response(data=cached)
    
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
            return create_response(
                error="WIPO IPCCAT服务暂时不可用，请稍后重试或使用关键词搜索功能"
            )
        
        if response.status_code != 200:
            return create_response(
                error=f"WIPO API请求失败: {response.status_code}"
            )
        
        data = response.json()
        
        if data.get('code', 0) != 0:
            return create_response(
                error=f"IPCCAT错误: {data.get('message', '未知错误')}"
            )
        
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
        
        set_cache(cache_key, result)
        
        return create_response(data=result)
        
    except requests.Timeout:
        return create_response(error="WIPO API请求超时，请稍后重试")
    except requests.RequestException as e:
        print(f"WIPO API request error: {e}")
        return create_response(error=f"网络请求失败: {str(e)}")
    except Exception as e:
        print(f"Error in predict: {traceback.format_exc()}")
        return create_response(error=f"预测失败: {str(e)}")


@ipc_bp.route('/ipc/tree', methods=['GET'])
def get_tree():
    """
    Get IPC classification tree structure.
    Hybrid mode: local data + on-demand WIPO API
    """
    level = request.args.get('level', 'l1')
    key = request.args.get('key', '')
    
    local_data = load_local_data()
    
    if not key:
        if local_data:
            roots = []
            for section in local_data.get('sections', []):
                roots.append({
                    'key': section.get('key', ''),
                    'symbol': section.get('symbol', ''),
                    'symbolcode': section.get('symbol', ''),
                    'title1': section.get('title', ''),
                    'folder': True,
                    'lazy': True
                })
            return create_response(data=roots)
        else:
            return create_response(error="IPC数据未加载")
    
    children = get_children_hybrid(key, local_data)
    
    if children is not None:
        return create_response(data=children)
    
    return create_response(error="获取分类树失败")


def get_children_hybrid(key, local_data):
    """混合模式获取子节点：优先本地，按需从WIPO获取"""
    
    if local_data:
        all_entries = local_data.get('all_entries', {})
        
        local_children = []
        for symbol, entry in all_entries.items():
            if entry.get('key') == key:
                child_symbols = get_child_symbols_from_tree(symbol, local_data)
                for child_symbol in child_symbols:
                    if child_symbol in all_entries:
                        child_entry = all_entries[child_symbol]
                        local_children.append({
                            'key': child_entry.get('key', ''),
                            'symbol': child_symbol,
                            'symbolcode': child_symbol,
                            'title1': child_entry.get('title', ''),
                            'folder': True,
                            'lazy': True
                        })
                break
        
        if local_children:
            return local_children
    
    wipo_children = fetch_from_wipo(key)
    
    if wipo_children:
        result = []
        for child in wipo_children:
            result.append({
                'key': child.get('key', ''),
                'symbol': child.get('symbol') or child.get('symbolcode', ''),
                'symbolcode': child.get('symbolcode', ''),
                'title1': clean_title(child.get('title1', '')),
                'folder': child.get('folder', True),
                'lazy': child.get('lazy', True)
            })
        return result
    
    return None


def get_child_symbols_from_tree(symbol, local_data):
    """从本地树结构中获取子节点符号"""
    sections = local_data.get('sections', [])
    
    def find_children(nodes, target_symbol):
        for node in nodes:
            if node.get('symbol') == target_symbol:
                return [c.get('symbol') for c in node.get('children', [])]
            children = node.get('children', [])
            if children:
                result = find_children(children, target_symbol)
                if result:
                    return result
        return []
    
    return find_children(sections, symbol)


@ipc_bp.route('/ipc/search', methods=['GET'])
def search():
    """
    Search IPC symbols by keywords.
    Hybrid mode: local + WIPO API
    """
    query = request.args.get('q', '').lower()
    limit = request.args.get('limit', 20, type=int)
    
    if not query:
        return create_response(error="请输入搜索关键词")
    
    local_data = load_local_data()
    results = []
    
    if local_data:
        all_entries = local_data.get('all_entries', {})
        
        for symbol, entry in all_entries.items():
            title = entry.get('title', '').lower()
            if query in symbol.lower() or query in title:
                results.append({
                    'symbol': symbol,
                    'code': symbol,
                    'title': entry.get('title', ''),
                    'score': 100 if query in symbol.lower() else 50
                })
    
    if len(results) < limit:
        try:
            url = f'{WIPO_API_BASE}/search/quick'
            params = {
                'q': query,
                'limit': limit - len(results),
                'lang': 'en'
            }
            resp = requests.get(url, params=params, headers=HEADERS, timeout=15)
            
            if resp.status_code == 200:
                data = resp.json()
                for item in data.get('results', []):
                    symbol = item.get('display', '')
                    if not any(r['symbol'] == symbol for r in results):
                        results.append({
                            'symbol': symbol,
                            'code': item.get('code', ''),
                            'title': clean_title(item.get('title1', '')),
                            'score': item.get('score', 30)
                        })
        except Exception as e:
            print(f'WIPO搜索失败: {e}')
    
    results.sort(key=lambda x: x['score'], reverse=True)
    results = results[:min(limit, 50)]
    
    result = {
        'query': query,
        'count': len(results),
        'results': results
    }
    
    return create_response(data=result)


@ipc_bp.route('/ipc/detail', methods=['GET'])
def get_detail():
    """
    Get detailed information for an IPC symbol.
    """
    symbol = request.args.get('symbol', '')
    
    if not symbol:
        return create_response(error="请提供IPC分类号")
    
    local_data = load_local_data()
    
    if local_data:
        all_entries = local_data.get('all_entries', {})
        
        if symbol in all_entries:
            entry = all_entries[symbol]
            return create_response(data={
                'symbol': symbol,
                'title': entry.get('title', ''),
                'key': entry.get('key', ''),
                'parent': entry.get('parent', '')
            })
    
    try:
        url = f'{WIPO_API_BASE}/scheme/getSymbolValidity'
        params = {'symbol': symbol}
        resp = requests.get(url, params=params, headers=HEADERS, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get('data'):
                entry = data['data']
                return create_response(data={
                    'symbol': symbol,
                    'title': clean_title(entry.get('title1', '')),
                    'key': entry.get('key', ''),
                    'valid': entry.get('valid', True)
                })
    except Exception as e:
        print(f'获取详情失败: {e}')
    
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
    
    local_data = load_local_data()
    
    if local_data:
        for section in sections:
            symbol = section['symbol']
            if symbol in local_data.get('all_entries', {}):
                entry = local_data['all_entries'][symbol]
                section['titleEn'] = entry.get('title', section['titleEn'])
    
    return create_response(data={'sections': sections})


@ipc_bp.route('/ipc/reload', methods=['POST'])
def reload_data():
    """
    Reload IPC data from file.
    """
    global IPC_DATA, DATA_LOAD_TIME, CHILDREN_CACHE
    IPC_DATA = None
    DATA_LOAD_TIME = 0
    CHILDREN_CACHE = {}
    
    data = load_local_data()
    
    if data:
        return create_response(data={
            'message': '数据重新加载成功',
            'entries': len(data.get('all_entries', {}))
        })
    else:
        return create_response(error='数据加载失败')


@ipc_bp.route('/ipc/clear-cache', methods=['POST'])
def clear_cache():
    """
    Clear children cache.
    """
    global CHILDREN_CACHE
    CHILDREN_CACHE = {}
    return create_response(data={'message': '缓存已清除'})


def get_section_title(symbol):
    sections = {
        'A': ('人类生活需要', 'HUMAN NECESSITIES'),
        'B': ('作业；运输', 'PERFORMING OPERATIONS; TRANSPORTING'),
        'C': ('化学；冶金', 'CHEMISTRY; METALLURGY'),
        'D': ('纺织；造纸', 'TEXTILES; PAPER'),
        'E': ('固定建筑物', 'FIXED CONSTRUCTIONS'),
        'F': ('机械工程', 'MECHANICAL ENGINEERING'),
        'G': ('物理', 'PHYSICS'),
        'H': ('电学', 'ELECTRICITY')
    }
    section = symbol[0] if symbol else ''
    return sections.get(section, ('', ''))


def get_simple_section_title(symbol):
    if len(symbol) == 1 and symbol.isalpha():
        return get_section_title(symbol)
    return None


def infer_parent_symbol(symbol):
    if not symbol:
        return ''
    
    symbol = symbol.replace(' ', '/')
    
    if len(symbol) == 1 and symbol.isalpha():
        return ''
    
    if len(symbol) == 3 and symbol[0].isalpha() and symbol[1:3].isdigit():
        return symbol[0]
    
    if len(symbol) == 4 and symbol[0].isalpha() and symbol[1:3].isdigit() and symbol[3].isalpha():
        return symbol[:3]
    
    if '/' in symbol:
        parts = symbol.split('/')
        main_part = parts[0]
        if len(main_part) == 4:
            return main_part[:4]
        return main_part
    
    if len(symbol) > 4 and symbol[0].isalpha() and symbol[1:3].isdigit():
        if symbol[3].isalpha():
            return symbol[:4]
        return symbol[:3]
    
    return symbol[0] if symbol else ''


def build_hierarchy_from_local(symbol, local_data):
    all_entries = local_data.get('all_entries', {})
    hierarchy = []
    
    if symbol in all_entries:
        entry = all_entries[symbol]
        hierarchy.insert(0, {
            'symbol': symbol,
            'title': entry.get('title', ''),
            'key': entry.get('key', '')
        })
        
        current_symbol = symbol
        visited = set()
        
        while current_symbol and current_symbol not in visited:
            visited.add(current_symbol)
            
            parent_symbol = infer_parent_symbol(current_symbol)
            if not parent_symbol or parent_symbol == current_symbol:
                break
            
            if parent_symbol in all_entries:
                parent_entry = all_entries[parent_symbol]
                hierarchy.insert(0, {
                    'symbol': parent_symbol,
                    'title': parent_entry.get('title', ''),
                    'key': parent_entry.get('key', '')
                })
                current_symbol = parent_symbol
            else:
                section_title = get_section_title(parent_symbol)
                if section_title[1]:
                    hierarchy.insert(0, {
                        'symbol': parent_symbol,
                        'title': section_title[1],
                        'titleCn': section_title[0]
                    })
                break
    
    if hierarchy and len(hierarchy[0]['symbol']) > 1:
        root_symbol = hierarchy[0]['symbol'][0]
        simple_title = get_simple_section_title(root_symbol)
        if simple_title:
            hierarchy.insert(0, {
                'symbol': root_symbol,
                'title': simple_title[1],
                'titleCn': simple_title[0]
            })
    
    return hierarchy


def build_hierarchy_from_wipo(symbol):
    try:
        url = f'{WIPO_API_BASE}/scheme/getSymbolValidity'
        params = {'symbol': symbol}
        resp = requests.get(url, params=params, headers=HEADERS, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get('data'):
                entry = data['data']
                hierarchy = [{
                    'symbol': symbol,
                    'title': clean_title(entry.get('title1', '')),
                    'key': entry.get('key', ''),
                    'depth': 0
                }]
                
                parent_key = entry.get('parentKey')
                depth = 1
                while parent_key and depth < 10:
                    try:
                        parent_url = f'{WIPO_API_BASE}/scheme/getSymbolValidity'
                        parent_params = {'symbol': '', 'key': parent_key}
                        parent_resp = requests.get(parent_url, params=parent_params, headers=HEADERS, timeout=10)
                        
                        if parent_resp.status_code == 200:
                            parent_data = parent_resp.json()
                            if parent_data.get('data'):
                                parent_entry = parent_data['data']
                                hierarchy.insert(0, {
                                    'symbol': parent_entry.get('symbol') or parent_entry.get('symbolcode', ''),
                                    'title': clean_title(parent_entry.get('title1', '')),
                                    'key': parent_entry.get('key', ''),
                                    'depth': depth
                                })
                                parent_key = parent_entry.get('parentKey')
                                depth += 1
                            else:
                                break
                        else:
                            break
                    except:
                        break
                
                return hierarchy
    except Exception as e:
        print(f'从WIPO获取层级失败: {e}')
    
    return None


@ipc_bp.route('/ipc/hierarchy', methods=['GET'])
def get_hierarchy():
    """
    Get complete hierarchy path for an IPC symbol.
    Returns all parent classifications from root to the given symbol.
    """
    symbol = request.args.get('symbol', '').strip().upper()
    
    if not symbol:
        return create_response(error="请提供IPC分类号")
    
    symbol = symbol.replace(' ', '/')
    
    local_data = load_local_data()
    
    hierarchy = build_hierarchy_from_local(symbol, local_data)
    
    if not hierarchy:
        hierarchy = build_hierarchy_from_wipo(symbol)
    
    if not hierarchy:
        section_title = get_section_title(symbol)
        if section_title[1]:
            hierarchy = [{
                'symbol': symbol[0],
                'title': section_title[1],
                'titleCn': section_title[0],
                'depth': 0
            }]
            if len(symbol) > 1:
                hierarchy.append({
                    'symbol': symbol,
                    'title': f'未找到详细定义',
                    'depth': 1
                })
    
    if hierarchy:
        for i, item in enumerate(hierarchy):
            item['depth'] = i
            item['levelName'] = get_level_name(i)
        
        return create_response(data={
            'symbol': symbol,
            'hierarchy': hierarchy,
            'count': len(hierarchy)
        })
    
    return create_response(error=f"未找到分类号: {symbol}")


def get_level_name(depth):
    level_names = [
        '部 (Section)',
        '大类 (Class)',
        '小类 (Subclass)',
        '大组 (Main Group)',
        '小组 (Subgroup)'
    ]
    if depth < len(level_names):
        return level_names[depth]
    return f'层级 {depth}'
