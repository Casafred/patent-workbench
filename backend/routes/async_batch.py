"""
Async batch processing routes.

This module handles asynchronous batch processing operations including
task submission, retrieval, file upload, and batch job management.
Supports both Zhipu AI and Aliyun Bailian providers.
"""

import json
import traceback
import tempfile
import os
from io import BytesIO
from flask import Blueprint, request, Response
from openai import OpenAI
from backend.middleware import validate_api_request
from backend.services import get_zhipu_client
from backend.utils import create_response

async_batch_bp = Blueprint('async_batch', __name__)

ALIYUN_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"

ZHIPU_MODELS = [
    "glm-4-flash", "glm-4-flashx-250414", "glm-4-flash-250414",
    "glm-4-long", "glm-4-plus", "glm-4-air-250414", "glm-4-airx",
    "glm-4.5-air", "glm-4.5-airx", "glm-4.7-flash", "glm-4.7-flashx",
    "glm-4.7", "glm-z1-flash", "glm-z1-flashx", "glm-z1-air", "glm-z1-airx", "glm-5"
]

ALIYUN_MODELS = [
    "qwen-flash", "qwen-turbo", "qwen-plus", "qwen3-max", "qwen-long",
    "qwq-plus", "qwq-32b", "deepseek-v3", "deepseek-v3.2",
    "deepseek-r1", "deepseek-r1-distill-qwen-32b",
    "kimi-k2.5", "kimi-k2-thinking", "minimax-text-01"
]


def get_provider_from_request(req_data):
    """Determine provider from request data."""
    provider = req_data.get('provider')
    model = req_data.get('model', '')
    
    if provider:
        return provider
    
    if model.lower() in [m.lower() for m in ALIYUN_MODELS]:
        return 'aliyun'
    if model.lower() in [m.lower() for m in ZHIPU_MODELS]:
        return 'zhipu'
    
    if model.startswith('qwen') or model.startswith('Qwen'):
        return 'aliyun'
    if model.startswith('qwq') or model.startswith('QwQ'):
        return 'aliyun'
    if model.startswith('deepseek') or model.startswith('DeepSeek'):
        return 'aliyun'
    if model.startswith('kimi') or model.startswith('Kimi'):
        return 'aliyun'
    if model.startswith('minimax') or model.startswith('MiniMax'):
        return 'aliyun'
    if model.startswith('glm-') or model.startswith('GLM-'):
        return 'zhipu'
    
    return 'zhipu'


def get_aliyun_client():
    """Get Aliyun Bailian client from request headers."""
    api_key = request.headers.get('X-Aliyun-API-Key') or request.headers.get('Authorization', '').replace('Bearer ', '')
    if not api_key:
        return None, create_response(error="Aliyun API Key is required", status_code=401)
    return OpenAI(api_key=api_key, base_url=ALIYUN_BASE_URL), None


def get_client_for_provider(provider):
    """Get the appropriate client based on provider."""
    if provider == 'aliyun':
        return get_aliyun_client()
    else:
        return get_zhipu_client()


@async_batch_bp.route('/async_submit', methods=['POST'])
def async_submit():
    """
    Submit an asynchronous completion task.
    Supports both Zhipu AI and Aliyun Bailian.
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    req_data = request.get_json()
    provider = get_provider_from_request(req_data)
    
    if provider == 'aliyun':
        return create_response(error="Aliyun does not support async submit API. Please use batch API instead.", status_code=400)
    
    client, error_response = get_zhipu_client()
    if error_response:
        return error_response
    
    model = req_data.get('model', 'glm-4-flash')
    temperature = req_data.get('temperature', 0.1)
    messages = req_data.get('messages')
    
    if not messages:
        return create_response(error="messages are required.")
    
    try:
        response = client.chat.asyncCompletions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            request_id=req_data.get('request_id')
        )
        return create_response(data={
            'task_id': response.id,
            'request_id': response.request_id
        })
    except Exception as e:
        print(f"Error in async_submit: {traceback.format_exc()}")
        return create_response(error=f"提交异步任务时发生错误: {str(e)}")


@async_batch_bp.route('/async_retrieve', methods=['POST'])
def async_retrieve():
    """
    Retrieve the result of an asynchronous completion task.
    Zhipu AI only.
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    req_data = request.get_json()
    provider = get_provider_from_request(req_data)
    
    if provider == 'aliyun':
        return create_response(error="Aliyun does not support async retrieve API. Please use batch API instead.", status_code=400)
    
    client, error_response = get_zhipu_client()
    if error_response:
        return error_response
    
    data = request.get_json()
    if not data:
        return create_response(error="Invalid JSON", status_code=400)
    
    try:
        task_id = data.get('task_id')
        if not task_id:
            return create_response(error="Missing task_id", status_code=400)
        
        retrieved_task = client.chat.asyncCompletions.retrieve_completion_result(
            id=task_id
        )
        return create_response(data=json.loads(retrieved_task.model_dump_json()))
    except Exception as e:
        print(f"Error in async_retrieve: {traceback.format_exc()}")
        return create_response(
            error=f"查询异步任务时发生错误: {str(e)}",
            status_code=500
        )


@async_batch_bp.route('/upload', methods=['POST'])
def upload_file():
    """
    Upload a JSONL file for batch processing.
    Supports both Zhipu AI and Aliyun Bailian.
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    provider = request.headers.get('X-LLM-Provider', 'zhipu')
    
    if provider == 'aliyun':
        client, error_response = get_aliyun_client()
        if error_response:
            return error_response
        
        if 'file' in request.files:
            file = request.files['file']
            try:
                result = client.files.create(
                    file=(file.filename, file.stream, 'application/octet-stream'),
                    purpose="batch"
                )
                return create_response(data={
                    'file_id': result.id,
                    'message': '文件上传成功！'
                })
            except Exception as e:
                return create_response(error=f"上传过程中发生错误: {str(e)}")
        
        req_data = request.get_json()
        jsonl_content = req_data.get('jsonlContent') if req_data else None
        file_name = req_data.get('fileName', 'batch_upload.jsonl') if req_data else 'batch_upload.jsonl'
        
        if not jsonl_content:
            return create_response(error="JSONL 内容不能为空")
        
        try:
            with tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', delete=False) as f:
                f.write(jsonl_content)
                temp_path = f.name
            
            with open(temp_path, 'rb') as f:
                result = client.files.create(file=f, purpose="batch")
            
            os.unlink(temp_path)
            
            return create_response(data={
                'file_id': result.id,
                'message': '文件上传成功！'
            })
        except Exception as e:
            return create_response(error=f"上传过程中发生错误: {str(e)}")
    
    else:
        client, error_response = get_zhipu_client()
        if error_response:
            return error_response
        
        if 'file' in request.files:
            file = request.files['file']
            try:
                result = client.files.create(
                    file=(file.filename, file.stream),
                    purpose="batch"
                )
                return create_response(data={
                    'file_id': result.id,
                    'message': '文件上传成功！'
                })
            except Exception as e:
                return create_response(error=f"上传过程中发生错误: {str(e)}")
        
        req_data = request.get_json()
        jsonl_content = req_data.get('jsonlContent') if req_data else None
        file_name = req_data.get('fileName', 'temp_batch_upload.jsonl') if req_data else 'temp_batch_upload.jsonl'
        
        if not jsonl_content:
            return create_response(error="JSONL 内容不能为空")
        
        try:
            bytes_io = BytesIO(jsonl_content.encode('utf-8'))
            result = client.files.create(
                file=(file_name, bytes_io),
                purpose="batch"
            )
            return create_response(data={
                'file_id': result.id,
                'message': '文件上传成功！'
            })
        except Exception as e:
            return create_response(error=f"上传过程中发生错误: {str(e)}")


@async_batch_bp.route('/create_batch', methods=['POST'])
def create_batch_task():
    """
    Create a batch processing job.
    Supports both Zhipu AI and Aliyun Bailian.
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    req_data = request.get_json()
    provider = get_provider_from_request(req_data)
    
    file_id = req_data.get('input_file_id') or req_data.get('fileId')
    
    if not file_id:
        return create_response(error="File ID 不能为空")
    
    if provider == 'aliyun':
        client, error_response = get_aliyun_client()
        if error_response:
            return error_response
        
        try:
            endpoint = req_data.get('endpoint', '/v1/chat/completions')
            
            batch_job = client.batches.create(
                input_file_id=file_id,
                endpoint=endpoint,
                completion_window="24h"
            )
            
            result = {
                'id': batch_job.id,
                'status': getattr(batch_job, 'status', 'unknown'),
                'input_file_id': file_id,
                'endpoint': endpoint,
                'created_at': str(getattr(batch_job, 'created_at', '')),
                'provider': 'aliyun'
            }
            
            return create_response(data=result)
        except Exception as e:
            return create_response(error=f"创建Batch任务时发生错误: {str(e)}")
    
    else:
        client, error_response = get_zhipu_client()
        if error_response:
            return error_response
        
        try:
            batch_job = client.batches.create(
                input_file_id=file_id,
                endpoint="/v4/chat/completions",
                completion_window="24h",
                metadata={"description": "来自专利工作台的分析任务"}
            )
            return create_response(data=json.loads(batch_job.model_dump_json()))
        except Exception as e:
            return create_response(error=f"创建Batch任务时发生错误: {str(e)}")


@async_batch_bp.route('/check_status', methods=['POST'])
def check_batch_status():
    """
    Check the status of a batch processing job.
    Supports both Zhipu AI and Aliyun Bailian.
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    req_data = request.get_json()
    provider = get_provider_from_request(req_data)
    
    batch_id = req_data.get('batch_id') or req_data.get('batchId')
    
    if not batch_id:
        return create_response(error="Batch ID 不能为空")
    
    if provider == 'aliyun':
        client, error_response = get_aliyun_client()
        if error_response:
            return error_response
        
        try:
            batch = client.batches.retrieve(batch_id)
            
            result = {
                'id': getattr(batch, 'id', None),
                'object': getattr(batch, 'object', 'batch'),
                'endpoint': getattr(batch, 'endpoint', None),
                'status': getattr(batch, 'status', 'unknown'),
                'input_file_id': getattr(batch, 'input_file_id', None),
                'output_file_id': getattr(batch, 'output_file_id', None),
                'error_file_id': getattr(batch, 'error_file_id', None),
                'created_at': str(getattr(batch, 'created_at', '')),
                'in_progress_at': str(getattr(batch, 'in_progress_at', '')),
                'expires_at': str(getattr(batch, 'expired_at', '')),
                'finalizing_at': str(getattr(batch, 'finalizing_at', '')),
                'completed_at': str(getattr(batch, 'completed_at', '')),
                'failed_at': str(getattr(batch, 'failed_at', '')),
                'expired_at': str(getattr(batch, 'expired_at', '')),
                'provider': 'aliyun'
            }
            
            if hasattr(batch, 'request_counts') and batch.request_counts:
                result['request_counts'] = {
                    'total': getattr(batch.request_counts, 'total', 0),
                    'completed': getattr(batch.request_counts, 'completed', 0),
                    'failed': getattr(batch.request_counts, 'failed', 0)
                }
            
            return create_response(data=result)
        except Exception as e:
            return create_response(error=f"检查Batch状态时发生错误: {str(e)}")
    
    else:
        client, error_response = get_zhipu_client()
        if error_response:
            return error_response
        
        try:
            batch_job = client.batches.retrieve(batch_id)
            return create_response(data=json.loads(batch_job.model_dump_json()))
        except Exception as e:
            return create_response(error=f"检查Batch状态时发生错误: {str(e)}")


@async_batch_bp.route('/download_result', methods=['POST'])
def download_result_file():
    """
    Download the result file of a completed batch job.
    Supports both Zhipu AI and Aliyun Bailian.
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    req_data = request.get_json()
    provider = get_provider_from_request(req_data)
    
    file_id = req_data.get('file_id') or req_data.get('fileId')
    
    if not file_id:
        return create_response(error="File ID 不能为空")
    
    if provider == 'aliyun':
        client, error_response = get_aliyun_client()
        if error_response:
            return error_response
        
        try:
            file_content = client.files.content(file_id)
            
            if hasattr(file_content, 'text'):
                content = file_content.text
            elif hasattr(file_content, 'content'):
                content = file_content.content
                if isinstance(content, bytes):
                    content = content.decode('utf-8')
            else:
                content = str(file_content)
            
            return Response(
                content.encode('utf-8'),
                mimetype='application/x-jsonlines',
                headers={'Content-Type': 'application/x-jsonlines; charset=utf-8'}
            )
        except Exception as e:
            print(f"Error in download_result_file: {traceback.format_exc()}")
            return create_response(
                error=f"获取文件内容时发生错误: {str(e)}",
                status_code=500
            )
    
    else:
        client, error_response = get_zhipu_client()
        if error_response:
            return error_response
        
        try:
            response_content_object = client.files.content(file_id)
            raw_bytes = response_content_object.content
            return Response(
                raw_bytes,
                mimetype='application/x-jsonlines',
                headers={'Content-Type': 'application/x-jsonlines; charset=utf-8'}
            )
        except Exception as e:
            print(f"Error in download_result_file: {traceback.format_exc()}")
            return create_response(
                error=f"获取文件内容时发生错误: {str(e)}",
                status_code=500
            )


@async_batch_bp.route('/list_batches', methods=['POST'])
def list_batches():
    """
    List all batch jobs.
    Supports both Zhipu AI and Aliyun Bailian.
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    req_data = request.get_json() or {}
    provider = get_provider_from_request(req_data)
    
    if provider == 'aliyun':
        client, error_response = get_aliyun_client()
        if error_response:
            return error_response
        
        try:
            batches = client.batches.list()
            result = []
            for batch in batches:
                result.append({
                    'id': getattr(batch, 'id', None),
                    'status': getattr(batch, 'status', 'unknown'),
                    'created_at': str(getattr(batch, 'created_at', ''))
                })
            return create_response(data={'batches': result})
        except Exception as e:
            return create_response(error=f"获取Batch列表时发生错误: {str(e)}")
    
    else:
        client, error_response = get_zhipu_client()
        if error_response:
            return error_response
        
        try:
            batches = client.batches.list()
            return create_response(data=json.loads(batches.model_dump_json()))
        except Exception as e:
            return create_response(error=f"获取Batch列表时发生错误: {str(e)}")


@async_batch_bp.route('/cancel_batch', methods=['POST'])
def cancel_batch():
    """
    Cancel a batch job.
    Supports both Zhipu AI and Aliyun Bailian.
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    req_data = request.get_json()
    provider = get_provider_from_request(req_data)
    
    batch_id = req_data.get('batch_id') or req_data.get('batchId')
    
    if not batch_id:
        return create_response(error="Batch ID 不能为空")
    
    if provider == 'aliyun':
        client, error_response = get_aliyun_client()
        if error_response:
            return error_response
        
        try:
            batch = client.batches.cancel(batch_id)
            return create_response(data={
                'id': getattr(batch, 'id', None),
                'status': getattr(batch, 'status', 'cancelled')
            })
        except Exception as e:
            return create_response(error=f"取消Batch任务时发生错误: {str(e)}")
    
    else:
        client, error_response = get_zhipu_client()
        if error_response:
            return error_response
        
        try:
            batch_job = client.batches.cancel(batch_id)
            return create_response(data=json.loads(batch_job.model_dump_json()))
        except Exception as e:
            return create_response(error=f"取消Batch任务时发生错误: {str(e)}")
