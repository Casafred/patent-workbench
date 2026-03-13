"""
Chat routes for AI conversation.

This module handles both streaming and synchronous chat requests.
Supports multiple LLM providers: ZhipuAI (default) and Aliyun Bailian.
"""

import json
import traceback
import requests
from flask import Blueprint, request, Response, jsonify
from zhipuai import ZhipuAI
from openai import OpenAI
from backend.middleware import validate_api_request
from backend.services import get_zhipu_client
from backend.services.llm_service import (
    get_llm_client,
    get_provider_from_request,
    is_aliyun_model,
    is_aliyun_thinking_only_model,
    build_aliyun_request_params
)

chat_bp = Blueprint('chat', __name__)


@chat_bp.route('/stream_chat', methods=['POST'])
def stream_chat():
    """
    Handle streaming chat requests.
    
    This endpoint supports Server-Sent Events (SSE) for real-time streaming responses.
    Supports web search integration via tools parameter.
    Supports multiple LLM providers via X-LLM-Provider header.
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        error_json = json.dumps(error_response.get_json())
        return Response(
            f"data: {error_json}\n\n",
            mimetype='text/event-stream',
            status=error_response.status_code
        )

    try:
        req_data = request.get_json(silent=True)
        if req_data is None:
            raise ValueError("Request body is not a valid JSON or is empty.")
    except Exception as e:
        error_json = json.dumps({
            "error": {
                "message": f"Invalid request format: {e}",
                "type": "request_error"
            }
        })
        return Response(
            f"data: {error_json}\n\n",
            mimetype='text/event-stream',
            status=400
        )

    provider = get_provider_from_request()
    model = req_data.get('model', '')
    
    if provider == 'aliyun' or is_aliyun_model(model):
        return stream_chat_aliyun(req_data)
    else:
        return stream_chat_zhipu(req_data)


def stream_chat_zhipu(req_data):
    """智谱AI流式调用"""
    client, error_response = get_zhipu_client()
    if error_response:
        error_json = json.dumps({"error": error_response.get_json()['error']})
        return Response(
            f"data: {error_json}\n\n",
            mimetype='text/event-stream',
            status=error_response.status_code
        )
    
    def generate():
        try:
            request_params = {
                'model': req_data.get('model'),
                'messages': req_data.get('messages'),
                'stream': True,
                'temperature': req_data.get('temperature'),
            }
            
            print(f"🔍 [智谱AI] 收到请求，model={req_data.get('model')}")
            
            if req_data.get('enable_web_search'):
                request_params['tools'] = [
                    {
                        "type": "web_search",
                        "web_search": {
                            "enable": "True",
                            "search_engine": req_data.get('search_engine', 'search_pro'),
                            "search_result": "True",
                            "search_prompt": req_data.get('search_prompt', '请基于网络搜索结果{search_result}回答用户问题，并在回答中引用来源链接。'),
                            "count": str(req_data.get('search_count', 5)),
                            "content_size": req_data.get('content_size', 'medium')
                        }
                    }
                ]
                request_params['tool_choice'] = "auto"
                print(f"🔍 [智谱AI] 联网搜索已启用")

            response = client.chat.completions.create(**request_params)
            for chunk in response:
                chunk_json = chunk.model_dump_json()
                yield f"data: {chunk_json}\n\n"
        except Exception as e:
            error_message = json.dumps({
                "error": {
                    "message": str(e),
                    "type": "generation_error"
                }
            })
            yield f"data: {error_message}\n\n"

    return Response(generate(), mimetype='text/event-stream')


def stream_chat_aliyun(req_data):
    """阿里云百炼流式调用"""
    client, error_response, provider = get_llm_client('aliyun')
    if error_response:
        error_json = json.dumps({"error": error_response.get_json()['error']})
        return Response(
            f"data: {error_json}\n\n",
            mimetype='text/event-stream',
            status=error_response.status_code
        )
    
    model = req_data.get('model', 'qwen-plus')
    messages = req_data.get('messages', [])
    enable_thinking = req_data.get('enable_thinking', False)
    enable_search = req_data.get('enable_web_search', False) or req_data.get('enable_search', False)
    thinking_budget = req_data.get('thinking_budget', None)
    temperature = req_data.get('temperature')
    
    def generate():
        try:
            request_params = build_aliyun_request_params(
                model=model,
                messages=messages,
                enable_thinking=enable_thinking,
                enable_search=enable_search,
                thinking_budget=thinking_budget,
                temperature=temperature,
                stream=True
            )
            
            print(f"🔍 [阿里云百炼] model={model}, enable_thinking={enable_thinking}, enable_search={enable_search}")
            
            response = client.chat.completions.create(**request_params)
            
            for chunk in response:
                if not chunk.choices:
                    if hasattr(chunk, 'usage') and chunk.usage:
                        usage_data = {
                            "usage": chunk.usage.model_dump() if hasattr(chunk.usage, 'model_dump') else chunk.usage
                        }
                        yield f"data: {json.dumps(usage_data)}\n\n"
                    continue
                
                delta = chunk.choices[0].delta
                
                result = {"choices": [{"delta": {}}]}
                
                if hasattr(delta, 'reasoning_content') and delta.reasoning_content:
                    result["choices"][0]["delta"]["reasoning_content"] = delta.reasoning_content
                
                if delta.content:
                    result["choices"][0]["delta"]["content"] = delta.content
                
                if hasattr(delta, 'role') and delta.role:
                    result["choices"][0]["delta"]["role"] = delta.role
                
                # 处理阿里云联网搜索结果
                if enable_search and hasattr(chunk.choices[0], 'web_search') and chunk.choices[0].web_search:
                    web_search_data = chunk.choices[0].web_search
                    if isinstance(web_search_data, list) and len(web_search_data) > 0:
                        result["web_search"] = web_search_data
                        print(f"🔍 [阿里云百炼] 返回搜索结果，共 {len(web_search_data)} 条")
                
                yield f"data: {json.dumps(result)}\n\n"
            
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            error_message = json.dumps({
                "error": {
                    "message": str(e),
                    "type": "generation_error"
                }
            })
            yield f"data: {error_message}\n\n"

    return Response(generate(), mimetype='text/event-stream')


@chat_bp.route('/chat', methods=['POST'])
def simple_chat():
    """
    Handle synchronous chat requests.
    
    This endpoint returns a complete response in a single request.
    Supports web search integration via tools parameter.
    Supports multiple LLM providers via X-LLM-Provider header.
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        req_data = request.get_json(silent=True)
        if req_data is None:
            return jsonify({"error": "Invalid request body"}), 400
    except Exception as e:
        return jsonify({"error": f"Invalid request format: {e}"}), 400
    
    provider = get_provider_from_request()
    model = req_data.get('model', '')
    
    if provider == 'aliyun' or is_aliyun_model(model):
        return simple_chat_aliyun(req_data)
    else:
        return simple_chat_zhipu(req_data)


def simple_chat_zhipu(req_data):
    """智谱AI同步调用"""
    client, error_response = get_zhipu_client()
    if error_response:
        return error_response
    
    model = req_data.get('model')
    messages = req_data.get('messages')
    temperature = req_data.get('temperature', 0.4)
    
    if not all([model, messages]):
        return jsonify({"error": "model and messages are required."}), 400
    
    try:
        request_params = {
            'model': model,
            'messages': messages,
            'stream': False,
            'temperature': temperature
        }
        
        if req_data.get('enable_web_search'):
            request_params['tools'] = [
                {
                    "type": "web_search",
                    "web_search": {
                        "enable": "True",
                        "search_engine": req_data.get('search_engine', 'search_pro'),
                        "search_result": "True",
                        "search_prompt": req_data.get('search_prompt', '请基于网络搜索结果{search_result}回答用户问题，并在回答中引用来源链接。'),
                        "count": str(req_data.get('search_count', 5)),
                        "content_size": req_data.get('content_size', 'medium')
                    }
                }
            ]
            request_params['tool_choice'] = "auto"
        
        response_from_sdk = client.chat.completions.create(**request_params)
        json_string = response_from_sdk.model_dump_json()
        clean_dict = json.loads(json_string)
        return jsonify(clean_dict)
    except Exception as e:
        print(f"Error in simple_chat_zhipu: {traceback.format_exc()}")
        error_payload = {
            "error": {
                "message": f"同步调用时发生严重错误: {str(e)}",
                "type": "backend_exception"
            }
        }
        return jsonify(error_payload), 500


def simple_chat_aliyun(req_data):
    """阿里云百炼同步调用"""
    client, error_response, provider = get_llm_client('aliyun')
    if error_response:
        return error_response
    
    model = req_data.get('model', 'qwen-plus')
    messages = req_data.get('messages', [])
    enable_thinking = req_data.get('enable_thinking', False)
    enable_search = req_data.get('enable_web_search', False) or req_data.get('enable_search', False)
    temperature = req_data.get('temperature')
    
    if not messages:
        return jsonify({"error": "messages are required."}), 400
    
    try:
        request_params = build_aliyun_request_params(
            model=model,
            messages=messages,
            enable_thinking=enable_thinking,
            enable_search=enable_search,
            temperature=temperature,
            stream=False
        )
        
        print(f"🔍 [阿里云百炼-同步] model={model}, enable_thinking={enable_thinking}")
        
        response = client.chat.completions.create(**request_params)
        
        result = {
            "choices": [{
                "message": {
                    "role": "assistant",
                    "content": response.choices[0].message.content
                },
                "finish_reason": response.choices[0].finish_reason
            }],
            "model": response.model,
            "usage": response.usage.model_dump() if hasattr(response.usage, 'model_dump') else response.usage
        }
        
        if hasattr(response.choices[0].message, 'reasoning_content') and response.choices[0].message.reasoning_content:
            result["choices"][0]["message"]["reasoning_content"] = response.choices[0].message.reasoning_content
        
        # 处理阿里云联网搜索结果
        if enable_search and hasattr(response.choices[0], 'web_search') and response.choices[0].web_search:
            web_search_data = response.choices[0].web_search
            if isinstance(web_search_data, list) and len(web_search_data) > 0:
                result["web_search"] = web_search_data
                print(f"🔍 [阿里云百炼 - 同步] 返回搜索结果，共 {len(web_search_data)} 条")
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Error in simple_chat_aliyun: {traceback.format_exc()}")
        error_payload = {
            "error": {
                "message": f"阿里云调用错误: {str(e)}",
                "type": "backend_exception"
            }
        }
        return jsonify(error_payload), 500


@chat_bp.route('/web_search', methods=['POST'])
def web_search():
    """
    Direct Web Search API endpoint.
    
    This endpoint directly calls the Zhipu Web Search API and returns formatted results.
    Endpoint: POST /paas/v4/web_search
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        req_data = request.get_json(silent=True)
        if req_data is None:
            raise ValueError("Request body is not a valid JSON or is empty.")
        
        search_query = req_data.get('search_query', '')
        search_engine = req_data.get('search_engine', 'search_pro')
        search_intent = req_data.get('search_intent', False)
        count = req_data.get('count', 10)
        content_size = req_data.get('content_size', 'medium')
        
        if not search_query:
            return jsonify({"error": "search_query is required."}), 400
        
        if len(search_query) > 70:
            return jsonify({"error": "search_query must not exceed 70 characters."}), 400
        
        auth_header = request.headers.get('Authorization')
        api_key = auth_header.split(' ')[1] if auth_header and auth_header.startswith('Bearer ') else None
        
        if not api_key:
            return jsonify({"error": "Authorization header with Bearer token is required."}), 401
        
        search_url = "https://open.bigmodel.cn/api/paas/v4/web_search"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        search_payload = {
            "search_query": search_query,
            "search_engine": search_engine,
            "search_intent": search_intent,
            "count": count,
            "content_size": content_size
        }
        
        if req_data.get('search_domain_filter'):
            search_payload['search_domain_filter'] = req_data.get('search_domain_filter')
        
        if req_data.get('search_recency_filter'):
            search_payload['search_recency_filter'] = req_data.get('search_recency_filter')
        
        if req_data.get('request_id'):
            search_payload['request_id'] = req_data.get('request_id')
        
        if req_data.get('user_id'):
            search_payload['user_id'] = req_data.get('user_id')
        
        response = requests.post(search_url, json=search_payload, headers=headers)
        response.raise_for_status()
        
        search_results = response.json()
        return jsonify(search_results)
        
    except requests.exceptions.RequestException as e:
        error_message = str(e)
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_data = e.response.json()
                error_message = error_data.get('error', {}).get('message', str(e))
            except ValueError:
                error_message = e.response.text
        
        return jsonify({
            "error": {
                "message": f"Web Search API call failed: {error_message}",
                "type": "web_search_api_error"
            }
        }), 500
    except Exception as e:
        print(f"Error in web_search: {traceback.format_exc()}")
        return jsonify({
            "error": {
                "message": f"Web search processing failed: {str(e)}",
                "type": "backend_exception"
            }
        }), 500


@chat_bp.route('/providers', methods=['GET'])
def get_providers():
    """获取支持的LLM服务商列表"""
    from backend.services.llm_service import ALIYUN_MODELS, ALIYUN_THINKING_ONLY_MODELS
    
    return jsonify({
        "providers": {
            "zhipu": {
                "name": "智谱AI",
                "default_model": "glm-4-flash",
                "models": ["glm-4-flash", "glm-4-flashX-250414", "glm-4-long", "GLM-4.7-Flash", "glm-4-plus", "glm-4-air"]
            },
            "aliyun": {
                "name": "阿里云百炼",
                "default_model": "qwen-plus",
                "models": ALIYUN_MODELS,
                "thinking_only_models": ALIYUN_THINKING_ONLY_MODELS
            }
        },
        "default_provider": "zhipu"
    })


@chat_bp.route('/test_connection', methods=['POST'])
def test_connection():
    """
    测试API Key连通性
    
    请求体:
    {
        "provider": "zhipu" | "aliyun",
        "api_key": "your-api-key"
    }
    
    返回:
    {
        "success": true/false,
        "message": "连接成功" 或 错误信息,
        "provider": "zhipu" | "aliyun"
    }
    """
    try:
        req_data = request.get_json(silent=True)
        if req_data is None:
            return jsonify({
                "success": False,
                "message": "请求体格式错误"
            }), 400
        
        provider = req_data.get('provider', 'zhipu')
        api_key = req_data.get('api_key', '')
        
        if not api_key:
            return jsonify({
                "success": False,
                "message": "API Key不能为空",
                "provider": provider
            }), 400
        
        if provider == 'aliyun':
            return test_aliyun_connection(api_key)
        else:
            return test_zhipu_connection(api_key)
            
    except Exception as e:
        print(f"Error in test_connection: {traceback.format_exc()}")
        return jsonify({
            "success": False,
            "message": f"测试失败: {str(e)}"
        }), 500


def test_zhipu_connection(api_key):
    """测试智谱AI API Key连通性"""
    try:
        client = ZhipuAI(api_key=api_key)
        
        response = client.chat.completions.create(
            model="glm-4-flash",
            messages=[{"role": "user", "content": "Hi"}],
            max_tokens=5,
            temperature=0.1
        )
        
        if response and response.choices:
            return jsonify({
                "success": True,
                "message": "智谱AI API连接成功！",
                "provider": "zhipu"
            })
        else:
            return jsonify({
                "success": False,
                "message": "API响应异常，请检查API Key是否有效",
                "provider": "zhipu"
            }), 400
            
    except Exception as e:
        error_msg = str(e)
        if "invalid" in error_msg.lower() or "unauthorized" in error_msg.lower():
            error_msg = "API Key无效或已过期"
        elif "rate" in error_msg.lower() or "limit" in error_msg.lower():
            error_msg = "API调用频率限制，请稍后重试"
        elif "network" in error_msg.lower() or "connection" in error_msg.lower():
            error_msg = "网络连接失败，请检查网络"
        
        return jsonify({
            "success": False,
            "message": f"连接失败: {error_msg}",
            "provider": "zhipu"
        }), 400


def test_aliyun_connection(api_key):
    """测试阿里云百炼 API Key连通性"""
    try:
        client = OpenAI(
            api_key=api_key,
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1"
        )
        
        response = client.chat.completions.create(
            model="qwen-turbo",
            messages=[{"role": "user", "content": "Hi"}],
            max_tokens=5,
            temperature=0.1
        )
        
        if response and response.choices:
            return jsonify({
                "success": True,
                "message": "阿里云百炼 API连接成功！",
                "provider": "aliyun"
            })
        else:
            return jsonify({
                "success": False,
                "message": "API响应异常，请检查API Key是否有效",
                "provider": "aliyun"
            }), 400
            
    except Exception as e:
        error_msg = str(e)
        if "invalid" in error_msg.lower() or "unauthorized" in error_msg.lower() or "api key" in error_msg.lower():
            error_msg = "API Key无效或已过期"
        elif "rate" in error_msg.lower() or "limit" in error_msg.lower():
            error_msg = "API调用频率限制，请稍后重试"
        elif "network" in error_msg.lower() or "connection" in error_msg.lower():
            error_msg = "网络连接失败，请检查网络"
        
        return jsonify({
            "success": False,
            "message": f"连接失败: {error_msg}",
            "provider": "aliyun"
        }), 400
