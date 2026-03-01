"""
统一LLM客户端服务

支持多服务商:
- zhipu: 智谱AI (默认)
- aliyun: 阿里云百炼
"""

from flask import request, session
from zhipuai import ZhipuAI
from openai import OpenAI
from backend.utils.response import create_response
from backend.config import GUEST_MODE_ENABLED, GUEST_API_KEY, GUEST_MODEL

ALIYUN_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"

ALIYUN_THINKING_ONLY_MODELS = [
    "qwq-plus", "qwq-32b",
    "deepseek-r1", "deepseek-r1-0528",
    "deepseek-r1-distill-qwen-32b", "deepseek-r1-distill-qwen-14b",
    "kimi-k2-thinking"
]

ALIYUN_MODELS = [
    "qwen-flash", "qwen-turbo", "qwen-plus", "qwen3-max", "qwen-long",
    "qwq-plus", "qwq-32b",
    "deepseek-v3", "deepseek-v3.2", "deepseek-r1",
    "glm-5", "glm-4.7", "glm-4.5",
    "kimi-k2.5", "kimi-k2-thinking",
    "minimax-text-01"
]


def get_provider_from_request():
    """
    从请求中获取服务商类型
    
    Returns:
        str: 'zhipu' 或 'aliyun'
    """
    provider = request.headers.get('X-LLM-Provider', 'zhipu')
    if provider not in ['zhipu', 'aliyun']:
        provider = 'zhipu'
    return provider


def get_api_key(provider='zhipu'):
    """
    从请求头获取API Key
    
    Args:
        provider: 服务商类型
        
    Returns:
        tuple: (api_key, error_response)
    """
    if provider == 'aliyun':
        auth_header = request.headers.get('X-Aliyun-API-Key')
        if not auth_header:
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Bearer '):
                auth_header = auth_header.split(' ')[1]
        
        if not auth_header:
            return None, create_response(
                error="阿里云API Key未配置。请在请求头中提供 X-Aliyun-API-Key",
                status_code=401
            )
        return auth_header, None
    else:
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return None, create_response(
                error="Authorization header with Bearer token is required.",
                status_code=401
            )
        
        api_key = auth_header.split(' ')[1]
        
        if not api_key:
            return None, create_response(
                error="API Key is missing in Authorization header.",
                status_code=401
            )
        
        return api_key, None


def get_zhipu_client(api_key=None):
    """
    获取智谱AI客户端
    
    Args:
        api_key: 可选的API Key，如果不提供则从请求头获取
        
    Returns:
        tuple: (ZhipuAI client, error_response)
    """
    if api_key is None:
        api_key, error = get_api_key('zhipu')
        if error:
            return None, error
    
    if api_key == 'GUEST_MODE':
        return get_guest_zhipu_client()
    
    try:
        client = ZhipuAI(api_key=api_key)
        return client, None
    except Exception as e:
        return None, create_response(
            error=f"Failed to initialize ZhipuAI client: {str(e)}",
            status_code=400
        )


def get_aliyun_client(api_key=None):
    """
    获取阿里云百炼客户端
    
    Args:
        api_key: 可选的API Key，如果不提供则从请求头获取
        
    Returns:
        tuple: (OpenAI client, error_response)
    """
    if api_key is None:
        api_key, error = get_api_key('aliyun')
        if error:
            return None, error
    
    try:
        client = OpenAI(
            api_key=api_key,
            base_url=ALIYUN_BASE_URL
        )
        return client, None
    except Exception as e:
        return None, create_response(
            error=f"Failed to initialize Aliyun client: {str(e)}",
            status_code=400
        )


def get_llm_client(provider=None):
    """
    统一获取LLM客户端
    
    Args:
        provider: 服务商类型，如果不提供则从请求头获取
        
    Returns:
        tuple: (client, error_response, provider)
    """
    if provider is None:
        provider = get_provider_from_request()
    
    if provider == 'aliyun':
        client, error = get_aliyun_client()
        return client, error, provider
    else:
        client, error = get_zhipu_client()
        return client, error, provider


def get_guest_zhipu_client():
    """
    获取游客模式的智谱AI客户端
    
    Returns:
        tuple: (ZhipuAI client, error_response)
    """
    if not GUEST_MODE_ENABLED:
        return None, create_response(
            error="Guest mode is not enabled.",
            status_code=403
        )
    
    if not GUEST_API_KEY:
        return None, create_response(
            error="Guest API key is not configured.",
            status_code=500
        )
    
    if not session.get('is_guest'):
        return None, create_response(
            error="Guest API key can only be used in guest mode.",
            status_code=403
        )
    
    try:
        client = ZhipuAI(api_key=GUEST_API_KEY)
        return client, None
    except Exception as e:
        return None, create_response(
            error=f"Failed to initialize guest ZhipuAI client: {str(e)}",
            status_code=500
        )


def is_aliyun_thinking_only_model(model):
    """
    检查是否为阿里云仅思考模式模型
    
    Args:
        model: 模型名称
        
    Returns:
        bool: 是否为仅思考模式模型
    """
    return model in ALIYUN_THINKING_ONLY_MODELS


def is_aliyun_model(model):
    """
    检查是否为阿里云模型
    
    Args:
        model: 模型名称
        
    Returns:
        bool: 是否为阿里云模型
    """
    return model in ALIYUN_MODELS or model.startswith('qwen') or model.startswith('deepseek') or model.startswith('qwq')


def get_default_model(provider='zhipu'):
    """
    获取默认模型
    
    Args:
        provider: 服务商类型
        
    Returns:
        str: 默认模型名称
    """
    if provider == 'aliyun':
        return 'qwen-plus'
    return 'glm-4-flash'


def build_aliyun_request_params(model, messages, enable_thinking=False, enable_search=False, thinking_budget=None, temperature=None, stream=True):
    """
    构建阿里云请求参数
    
    Args:
        model: 模型名称
        messages: 消息列表
        enable_thinking: 是否开启思考模式
        enable_search: 是否开启联网搜索
        thinking_budget: 思考长度限制
        temperature: 温度参数
        stream: 是否流式输出
        
    Returns:
        dict: 请求参数
    """
    params = {
        'model': model,
        'messages': messages,
        'stream': stream,
    }
    
    if temperature is not None:
        params['temperature'] = temperature
    
    extra_body = {}
    
    if enable_thinking and not is_aliyun_thinking_only_model(model):
        extra_body['enable_thinking'] = True
    
    if enable_search:
        extra_body['enable_search'] = True
    
    if thinking_budget and model in ['qwen-plus', 'qwen-turbo', 'qwen-flash', 'glm-5', 'glm-4.7', 'kimi-k2-thinking']:
        extra_body['thinking_budget'] = thinking_budget
    
    if extra_body:
        params['extra_body'] = extra_body
    
    if stream:
        params['stream_options'] = {'include_usage': True}
    
    return params
