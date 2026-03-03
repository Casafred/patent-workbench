"""
IPC Classification API routes.

This module handles IPC classification-related operations using local data.
"""

import json
import os
import time
import traceback
from functools import wraps
from flask import Blueprint, request, jsonify, current_app
from backend.utils import create_response
import requests

ipc_bp = Blueprint('ipc', __name__)

DATA_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'ipc_data.json')
IPC_DATA = None
DATA_LOAD_TIME = 0

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
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9'
        }
        
        response = requests.get(
            "https://ipcpub.wipo.int/api/v1/search/ipccat",
            params=params,
            headers=headers,
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
    Get IPC classification tree structure from local data.
    """
    level = request.args.get('level', 'l1')
    key = request.args.get('key', '')
    
    local_data = load_local_data()
    
    if not local_data:
        return create_response(error="IPC数据未加载，请稍后重试")
    
    try:
        if not key:
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
        
        all_entries = local_data.get('all_entries', {})
        key_map = local_data.get('key_map', {})
        
        children = []
        for symbol, entry in all_entries.items():
            if entry.get('key') == key:
                for child_symbol in entry.get('children', []):
                    if child_symbol in all_entries:
                        child_entry = all_entries[child_symbol]
                        children.append({
                            'key': child_entry.get('key', ''),
                            'symbol': child_symbol,
                            'symbolcode': child_symbol,
                            'title1': child_entry.get('title', ''),
                            'folder': True,
                            'lazy': True
                        })
                break
        
        if not children:
            for section in local_data.get('sections', []):
                if section.get('key') == key:
                    for child in section.get('children', []):
                        children.append({
                            'key': child.get('key', ''),
                            'symbol': child.get('symbol', ''),
                            'symbolcode': child.get('symbol', ''),
                            'title1': child.get('title', ''),
                            'folder': True,
                            'lazy': True
                        })
                    break
        
        return create_response(data=children)
        
    except Exception as e:
        print(f"Error in get_tree: {traceback.format_exc()}")
        return create_response(error=f"获取分类树失败: {str(e)}")


@ipc_bp.route('/ipc/search', methods=['GET'])
def search():
    """
    Search IPC symbols by keywords in local data.
    """
    query = request.args.get('q', '').lower()
    limit = request.args.get('limit', 20, type=int)
    
    if not query:
        return create_response(error="请输入搜索关键词")
    
    local_data = load_local_data()
    
    if not local_data:
        return create_response(error="IPC数据未加载，请稍后重试")
    
    try:
        results = []
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
        
        results.sort(key=lambda x: x['score'], reverse=True)
        results = results[:min(limit, 50)]
        
        result = {
            'query': query,
            'count': len(results),
            'results': results
        }
        
        return create_response(data=result)
        
    except Exception as e:
        print(f"Error in search: {traceback.format_exc()}")
        return create_response(error=f"搜索失败: {str(e)}")


@ipc_bp.route('/ipc/detail', methods=['GET'])
def get_detail():
    """
    Get detailed information for an IPC symbol from local data.
    """
    symbol = request.args.get('symbol', '')
    
    if not symbol:
        return create_response(error="请提供IPC分类号")
    
    local_data = load_local_data()
    
    if not local_data:
        return create_response(error="IPC数据未加载，请稍后重试")
    
    try:
        all_entries = local_data.get('all_entries', {})
        
        if symbol in all_entries:
            entry = all_entries[symbol]
            return create_response(data={
                'symbol': symbol,
                'title': entry.get('title', ''),
                'key': entry.get('key', ''),
                'parent': entry.get('parent', '')
            })
        
        return create_response(error=f"未找到分类号: {symbol}")
        
    except Exception as e:
        print(f"Error in get_detail: {traceback.format_exc()}")
        return create_response(error=f"获取详情失败: {str(e)}")


@ipc_bp.route('/ipc/sections', methods=['GET'])
def get_sections():
    """
    Get IPC section list (A-H) from local data.
    """
    local_data = load_local_data()
    
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
    global IPC_DATA, DATA_LOAD_TIME
    IPC_DATA = None
    DATA_LOAD_TIME = 0
    
    data = load_local_data()
    
    if data:
        return create_response(data={
            'message': '数据重新加载成功',
            'entries': len(data.get('all_entries', {}))
        })
    else:
        return create_response(error='数据加载失败')
