"""
Chat routes for AI conversation.

This module handles both streaming and synchronous chat requests.
"""

import json
import traceback
import requests
from flask import Blueprint, request, Response, jsonify
from backend.middleware import validate_api_request
from backend.services import get_zhipu_client

# Create blueprint
chat_bp = Blueprint('chat', __name__)


@chat_bp.route('/stream_chat', methods=['POST'])
def stream_chat():
    """
    Handle streaming chat requests.
    
    This endpoint supports Server-Sent Events (SSE) for real-time streaming responses.
    Supports web search integration via tools parameter.
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

    client, error_response = get_zhipu_client()
    if error_response:
        error_json = json.dumps({"error": error_response.get_json()['error']})
        return Response(
            f"data: {error_json}\n\n",
            mimetype='text/event-stream',
            status=error_response.status_code
        )
    
    def generate():
        """Generator function for streaming responses."""
        try:
            # Build request parameters
            request_params = {
                'model': req_data.get('model'),
                'messages': req_data.get('messages'),
                'stream': True,
                'temperature': req_data.get('temperature'),
            }
            
            # 【调试信息】输出接收到的请求参数
            print(f"🔍 [后端-联网搜索] 收到请求，enable_web_search={req_data.get('enable_web_search')}")
            
            # Add web search tools if enabled
            if req_data.get('enable_web_search'):
                # 使用正确的tools数组格式配置web_search (根据智谱官方文档)
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

                # 【调试信息】输出完整的搜索配置
                print(f"🔍 [后端-联网搜索] 已启用！配置: tools={request_params['tools']}")
            else:
                print("🔍 [后端-联网搜索] 未启用，使用普通对话模式")
            
            # 【调试信息】输出最终发送给API的参数
            print(f"🔍 [后端-联网搜索] 发送给智谱API的参数: model={request_params.get('model')}, tools={request_params.get('tools', 'None')}")

            # 【调试信息】输出消息内容长度
            messages = request_params.get('messages', [])
            if messages:
                last_message = messages[-1]
                print(f"🔍 [后端-联网搜索] 最后一条消息角色: {last_message.get('role')}, 内容长度: {len(last_message.get('content', ''))}")
                print(f"🔍 [后端-联网搜索] 总消息数: {len(messages)}")

            response = client.chat.completions.create(**request_params)
            for chunk in response:
                chunk_json = chunk.model_dump_json()
                # 【调试信息】如果包含工具调用，输出日志
                if 'tool_calls' in chunk_json:
                    print(f"🔍 [后端-联网搜索] 收到工具调用: {chunk_json}")
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


@chat_bp.route('/chat', methods=['POST'])
def simple_chat():
    """
    Handle synchronous chat requests.
    
    This endpoint returns a complete response in a single request.
    Supports web search integration via tools parameter.
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    client, error_response = get_zhipu_client()
    if error_response:
        return error_response
    
    req_data = request.get_json()
    model = req_data.get('model')
    messages = req_data.get('messages')
    temperature = req_data.get('temperature', 0.4)
    
    if not all([model, messages]):
        return jsonify({"error": "model and messages are required."}), 400
    
    try:
        # Build request parameters
        request_params = {
            'model': model,
            'messages': messages,
            'stream': False,
            'temperature': temperature
        }
        
        # Add web search tools if enabled
        if req_data.get('enable_web_search'):
            # 使用正确的tools数组格式配置web_search (根据智谱官方文档)
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
        print(f"Error in simple_chat: {traceback.format_exc()}")
        error_payload = {
            "error": {
                "message": f"同步调用时发生严重错误: {str(e)}",
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
        
        # Get search parameters according to official API spec
        search_query = req_data.get('search_query', '')
        search_engine = req_data.get('search_engine', 'search_pro')
        search_intent = req_data.get('search_intent', False)  # 是否进行搜索意图识别
        count = req_data.get('count', 10)
        content_size = req_data.get('content_size', 'medium')
        
        if not search_query:
            return jsonify({"error": "search_query is required."}), 400
        
        # Validate search_query length (max 70 characters)
        if len(search_query) > 70:
            return jsonify({"error": "search_query must not exceed 70 characters."}), 400
        
        # Get API key from Authorization header
        auth_header = request.headers.get('Authorization')
        api_key = auth_header.split(' ')[1] if auth_header and auth_header.startswith('Bearer ') else None
        
        if not api_key:
            return jsonify({"error": "Authorization header with Bearer token is required."}), 401
        
        # Call Zhipu Web Search API (correct endpoint)
        search_url = "https://open.bigmodel.cn/api/paas/v4/web_search"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Build request payload according to official API spec
        search_payload = {
            "search_query": search_query,
            "search_engine": search_engine,
            "search_intent": search_intent,
            "count": count,
            "content_size": content_size
        }
        
        # Add optional parameters if provided
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
        # Handle API call errors
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
