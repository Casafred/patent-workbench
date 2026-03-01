"""
阿里云百炼API测试路由

支持测试:
- 流式/非流式调用
- 思考模式
- 联网搜索
- 结构化输出
- 批量API
"""

import json
import traceback
import os
from flask import Blueprint, request, Response, jsonify, stream_with_context, send_from_directory
from openai import OpenAI

bailian_test_bp = Blueprint('bailian_test', __name__)

ALIYUN_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"

SUPPORTED_MODELS = {
    "qwen": {
        "name": "通义千问",
        "models": [
            {"id": "qwen-flash", "name": "Qwen-Flash (极速低价)", "thinking": True},
            {"id": "qwen-turbo", "name": "Qwen-Turbo (快速)", "thinking": True},
            {"id": "qwen-plus", "name": "Qwen-Plus (推荐)", "thinking": True},
            {"id": "qwen3-max", "name": "Qwen3-Max (旗舰)", "thinking": True},
            {"id": "qwen-long", "name": "Qwen-Long (长文档)", "thinking": False},
        ]
    },
    "qwq": {
        "name": "QwQ推理",
        "models": [
            {"id": "qwq-plus", "name": "QwQ-Plus (推理)", "thinking_only": True},
            {"id": "qwq-32b", "name": "QwQ-32B (轻量推理)", "thinking_only": True},
        ]
    },
    "deepseek": {
        "name": "DeepSeek",
        "models": [
            {"id": "deepseek-v3", "name": "DeepSeek-V3 (通用)", "thinking": False},
            {"id": "deepseek-v3.2", "name": "DeepSeek-V3.2 (最新)", "thinking": True},
            {"id": "deepseek-r1", "name": "DeepSeek-R1 (推理)", "thinking_only": True},
            {"id": "deepseek-r1-distill-qwen-32b", "name": "DeepSeek-R1-Distill-32B", "thinking_only": True},
        ]
    },
    "glm": {
        "name": "GLM (智谱-百炼版)",
        "models": [
            {"id": "glm-5", "name": "GLM-5 (旗舰)", "thinking": True},
            {"id": "glm-4.7", "name": "GLM-4.7", "thinking": True},
            {"id": "glm-4.5", "name": "GLM-4.5", "thinking": True},
        ]
    },
    "kimi": {
        "name": "Kimi (月之暗面)",
        "models": [
            {"id": "kimi-k2.5", "name": "Kimi-K2.5", "thinking": False},
            {"id": "kimi-k2-thinking", "name": "Kimi-K2-Thinking (推理)", "thinking_only": True},
        ]
    },
    "minimax": {
        "name": "MiniMax",
        "models": [
            {"id": "minimax-text-01", "name": "MiniMax-Text-01", "thinking": False},
        ]
    }
}

THINKING_ONLY_MODELS = [
    "qwq-plus", "qwq-32b",
    "deepseek-r1", "deepseek-r1-distill-qwen-32b", "deepseek-r1-distill-qwen-14b",
    "kimi-k2-thinking"
]


def get_client(api_key):
    return OpenAI(
        api_key=api_key,
        base_url=ALIYUN_BASE_URL
    )


@bailian_test_bp.route('/models', methods=['GET'])
def get_models():
    return jsonify({
        "success": True,
        "models": SUPPORTED_MODELS,
        "thinking_only_models": THINKING_ONLY_MODELS
    })


@bailian_test_bp.route('/non-stream', methods=['POST'])
def test_non_stream():
    data = request.json
    api_key = data.get('api_key')
    model = data.get('model', 'qwen-plus')
    messages = data.get('messages', [{"role": "user", "content": "你好"}])
    enable_thinking = data.get('enable_thinking', False)
    enable_search = data.get('enable_search', False)
    
    if not api_key:
        return jsonify({"error": "API Key is required"}), 400
    
    try:
        client = get_client(api_key)
        
        extra_body = {}
        if enable_thinking and model not in ["qwen-long", "minimax-text-01", "kimi-k2.5"]:
            extra_body["enable_thinking"] = True
        if enable_search:
            extra_body["enable_search"] = True
        
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            extra_body=extra_body if extra_body else None
        )
        
        result = {
            "success": True,
            "model": response.model,
            "content": response.choices[0].message.content,
            "usage": {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }
        }
        
        if hasattr(response.choices[0].message, 'reasoning_content') and response.choices[0].message.reasoning_content:
            result["reasoning_content"] = response.choices[0].message.reasoning_content
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500


@bailian_test_bp.route('/stream', methods=['POST'])
def test_stream():
    data = request.json
    api_key = data.get('api_key')
    model = data.get('model', 'qwen-plus')
    messages = data.get('messages', [{"role": "user", "content": "你好"}])
    enable_thinking = data.get('enable_thinking', False)
    enable_search = data.get('enable_search', False)
    thinking_budget = data.get('thinking_budget', None)
    
    if not api_key:
        return jsonify({"error": "API Key is required"}), 400
    
    def generate():
        try:
            client = get_client(api_key)
            
            extra_body = {}
            if enable_thinking and model not in ["qwen-long", "minimax-text-01", "kimi-k2.5"]:
                extra_body["enable_thinking"] = True
            if enable_search:
                extra_body["enable_search"] = True
            if thinking_budget and model in ["qwen-plus", "qwen-turbo", "qwen-flash", "glm-5", "glm-4.7", "kimi-k2-thinking"]:
                extra_body["thinking_budget"] = thinking_budget
            
            stream = client.chat.completions.create(
                model=model,
                messages=messages,
                extra_body=extra_body if extra_body else None,
                stream=True,
                stream_options={"include_usage": True}
            )
            
            for chunk in stream:
                if not chunk.choices:
                    if hasattr(chunk, 'usage') and chunk.usage:
                        yield f"data: {json.dumps({'type': 'usage', 'usage': chunk.usage.model_dump()})}\n\n"
                    continue
                
                delta = chunk.choices[0].delta
                
                if hasattr(delta, 'reasoning_content') and delta.reasoning_content:
                    yield f"data: {json.dumps({'type': 'reasoning', 'delta': delta.reasoning_content})}\n\n"
                
                if delta.content:
                    yield f"data: {json.dumps({'type': 'content', 'delta': delta.content})}\n\n"
            
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
    
    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        }
    )


@bailian_test_bp.route('/structured', methods=['POST'])
def test_structured():
    data = request.json
    api_key = data.get('api_key')
    model = data.get('model', 'qwen-plus')
    messages = data.get('messages')
    schema = data.get('schema')
    
    if not api_key:
        return jsonify({"error": "API Key is required"}), 400
    
    if not schema:
        schema = {
            "type": "json_schema",
            "json_schema": {
                "name": "test_response",
                "strict": True,
                "schema": {
                    "type": "object",
                    "properties": {
                        "summary": {"type": "string"},
                        "key_points": {
                            "type": "array",
                            "items": {"type": "string"}
                        }
                    },
                    "required": ["summary", "key_points"]
                }
            }
        }
    
    if not messages:
        messages = [{"role": "user", "content": "请总结以下内容：人工智能正在改变我们的生活方式。"}]
    
    try:
        client = get_client(api_key)
        
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            response_format=schema
        )
        
        return jsonify({
            "success": True,
            "model": response.model,
            "content": response.choices[0].message.content,
            "usage": response.usage.model_dump()
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500


@bailian_test_bp.route('/batch/create', methods=['POST'])
def test_batch_create():
    data = request.json
    api_key = data.get('api_key')
    model = data.get('model', 'qwen-plus')
    tasks = data.get('tasks', [])
    
    if not api_key:
        return jsonify({"error": "API Key is required"}), 400
    
    if not tasks:
        tasks = [
            {"id": "task-1", "content": "翻译：Hello World"},
            {"id": "task-2", "content": "翻译：Good Morning"}
        ]
    
    try:
        client = get_client(api_key)
        
        batch_requests = []
        for task in tasks:
            batch_requests.append({
                "custom_id": task["id"],
                "method": "POST",
                "url": "/v1/chat/completions",
                "body": {
                    "model": model,
                    "messages": [{"role": "user", "content": task["content"]}]
                }
            })
        
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', delete=False) as f:
            for req in batch_requests:
                f.write(json.dumps(req) + '\n')
            temp_path = f.name
        
        with open(temp_path, 'rb') as f:
            batch_file = client.files.create(file=f, purpose="batch")
        
        os.unlink(temp_path)
        
        batch_job = client.batches.create(
            input_file_id=batch_file.id,
            endpoint="/v1/chat/completions",
            completion_window="24h"
        )
        
        return jsonify({
            "success": True,
            "batch_id": batch_job.id,
            "status": batch_job.status,
            "input_file_id": batch_file.id,
            "message": "批量任务已创建，请使用 /batch/status 查询状态"
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500


@bailian_test_bp.route('/batch/status', methods=['POST'])
def test_batch_status():
    data = request.json
    api_key = data.get('api_key')
    batch_id = data.get('batch_id')
    
    if not api_key:
        return jsonify({"error": "API Key is required"}), 400
    
    if not batch_id:
        return jsonify({"error": "batch_id is required"}), 400
    
    try:
        client = get_client(api_key)
        batch = client.batches.retrieve(batch_id)
        
        result = {
            "success": True,
            "id": getattr(batch, 'id', None),
            "status": getattr(batch, 'status', None),
        }
        
        if hasattr(batch, 'created_at') and batch.created_at:
            result["created_at"] = str(batch.created_at)
        if hasattr(batch, 'finished_at') and batch.finished_at:
            result["finished_at"] = str(batch.finished_at)
        if hasattr(batch, 'completed_at') and batch.completed_at:
            result["completed_at"] = str(batch.completed_at)
        if hasattr(batch, 'expired_at') and batch.expired_at:
            result["expired_at"] = str(batch.expired_at)
        
        if hasattr(batch, 'request_counts') and batch.request_counts:
            result["request_counts"] = {
                "total": getattr(batch.request_counts, 'total', 0),
                "completed": getattr(batch.request_counts, 'completed', 0),
                "failed": getattr(batch.request_counts, 'failed', 0)
            }
        
        if hasattr(batch, 'output_file_id') and batch.output_file_id:
            result["output_file_id"] = batch.output_file_id
        
        if hasattr(batch, 'input_file_id') and batch.input_file_id:
            result["input_file_id"] = batch.input_file_id
        
        result["raw_response"] = batch.model_dump() if hasattr(batch, 'model_dump') else str(batch)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500


@bailian_test_bp.route('/batch/result', methods=['POST'])
def test_batch_result():
    data = request.json
    api_key = data.get('api_key')
    output_file_id = data.get('output_file_id')
    
    if not api_key:
        return jsonify({"error": "API Key is required"}), 400
    
    if not output_file_id:
        return jsonify({"error": "output_file_id is required"}), 400
    
    try:
        client = get_client(api_key)
        file_content = client.files.content(output_file_id)
        
        results = []
        if hasattr(file_content, 'text'):
            content_text = file_content.text
        elif hasattr(file_content, 'content'):
            content_text = file_content.content.decode('utf-8') if isinstance(file_content.content, bytes) else file_content.content
        else:
            content_text = str(file_content)
        
        for line in content_text.strip().split('\n'):
            if line:
                try:
                    results.append(json.loads(line))
                except json.JSONDecodeError:
                    results.append({"raw": line})
        
        return jsonify({
            "success": True,
            "count": len(results),
            "results": results
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500


@bailian_test_bp.route('/page', methods=['GET'])
def test_page():
    frontend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'frontend')
    return send_from_directory(frontend_path, 'bailian-test.html')
