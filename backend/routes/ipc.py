"""
IPC Classification API routes.

This module handles IPC classification-related operations including
prediction, tree browsing, and search using WIPO IPCCAT API.
"""

import json
import time
import traceback
from functools import wraps
from flask import Blueprint, request, jsonify, current_app
from backend.utils import create_response
import requests

ipc_bp = Blueprint('ipc', __name__)

WIPO_API_BASE = "https://ipcpub.wipo.int/api/v1"

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
    
    Request body:
        - q: Text to classify (required, max 1500 chars)
        - lang: Language code (default: zh)
        - level: Classification level (class/subclass/maingroup/subgroup)
        - limit: Number of results (3 or 5)
    
    Returns:
        - results: List of predicted IPC symbols with scores
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
            f"{WIPO_API_BASE}/search/ipccat",
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
    Get IPC classification tree structure.
    
    Query params:
        - level: Tree level (l1/l2/l3)
        - key: Node key for children
        - version: IPC version (default: latest)
    
    Returns:
        - data: Tree nodes
    """
    level = request.args.get('level', 'l1')
    key = request.args.get('key', '')
    version = request.args.get('version', 'latest')
    
    cache_key = f"tree_{level}_{key}_{version}"
    cached = get_cached(cache_key)
    if cached:
        return create_response(data=cached)
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9'
        }
        
        if key:
            endpoint = f"{WIPO_API_BASE}/scheme/children/{level}"
            params = {'key': key, 'version': version}
        else:
            endpoint = f"{WIPO_API_BASE}/scheme/roots/{level}"
            params = {'version': version}
        
        response = requests.get(endpoint, params=params, headers=headers, timeout=15)
        
        if response.status_code == 500:
            return create_response(
                error="WIPO IPC服务暂时不可用，请稍后重试或使用关键词搜索功能"
            )
        
        if response.status_code != 200:
            return create_response(
                error=f"获取分类树失败: {response.status_code}"
            )
        
        data = response.json()
        set_cache(cache_key, data)
        
        return create_response(data=data)
        
    except requests.Timeout:
        return create_response(error="请求超时，请稍后重试")
    except Exception as e:
        print(f"Error in get_tree: {traceback.format_exc()}")
        return create_response(error=f"获取分类树失败: {str(e)}")


@ipc_bp.route('/ipc/search', methods=['GET'])
def search():
    """
    Search IPC symbols by keywords.
    
    Query params:
        - q: Search query (required)
        - version: IPC version (default: latest)
        - lang: Language (default: en)
        - limit: Max results (default: 20)
        - offset: Result offset (default: 0)
    
    Returns:
        - results: Matching IPC symbols
    """
    query = request.args.get('q', '')
    version = request.args.get('version', 'latest')
    lang = request.args.get('lang', 'en')
    limit = request.args.get('limit', 20, type=int)
    offset = request.args.get('offset', 0, type=int)
    
    if not query:
        return create_response(error="请输入搜索关键词")
    
    cache_key = f"search_{query}_{version}_{lang}_{limit}_{offset}"
    cached = get_cached(cache_key)
    if cached:
        return create_response(data=cached)
    
    try:
        params = {
            'q': query,
            'version': version,
            'lang': lang,
            'limit': min(limit, 50),
            'offset': offset
        }
        
        response = requests.get(
            f"{WIPO_API_BASE}/search/quick",
            params=params,
            timeout=15
        )
        
        if response.status_code != 200:
            return create_response(
                error=f"搜索失败: {response.status_code}"
            )
        
        data = response.json()
        
        result = {
            'query': query,
            'count': data.get('count', 0),
            'version': data.get('version', version),
            'lang': data.get('lang', lang),
            'results': []
        }
        
        for item in data.get('results', []):
            result['results'].append({
                'symbol': item.get('display', ''),
                'code': item.get('code', ''),
                'score': item.get('score', 0)
            })
        
        set_cache(cache_key, result)
        
        return create_response(data=result)
        
    except requests.Timeout:
        return create_response(error="搜索请求超时")
    except Exception as e:
        print(f"Error in search: {traceback.format_exc()}")
        return create_response(error=f"搜索失败: {str(e)}")


@ipc_bp.route('/ipc/detail', methods=['GET'])
def get_detail():
    """
    Get detailed information for an IPC symbol.
    
    Query params:
        - symbol: IPC symbol (required)
        - version: IPC version (default: latest)
    
    Returns:
        - symbol: IPC symbol details
    """
    symbol = request.args.get('symbol', '')
    version = request.args.get('version', 'latest')
    
    if not symbol:
        return create_response(error="请提供IPC分类号")
    
    cache_key = f"detail_{symbol}_{version}"
    cached = get_cached(cache_key)
    if cached:
        return create_response(data=cached)
    
    try:
        params = {'symbol': symbol, 'version': version}
        
        response = requests.get(
            f"{WIPO_API_BASE}/scheme/getSymbolValidity",
            params=params,
            timeout=10
        )
        
        if response.status_code != 200:
            return create_response(
                error=f"获取分类详情失败: {response.status_code}"
            )
        
        data = response.json()
        set_cache(cache_key, data)
        
        return create_response(data=data)
        
    except requests.Timeout:
        return create_response(error="请求超时")
    except Exception as e:
        print(f"Error in get_detail: {traceback.format_exc()}")
        return create_response(error=f"获取详情失败: {str(e)}")


@ipc_bp.route('/ipc/sections', methods=['GET'])
def get_sections():
    """
    Get IPC section list (A-H).
    
    Returns:
        - sections: List of IPC sections
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
