"""
Async batch processing routes.

This module handles asynchronous batch processing operations including
task submission, retrieval, file upload, and batch job management.
"""

import json
import traceback
from io import BytesIO
from flask import Blueprint, request, Response
from backend.middleware import validate_api_request
from backend.services import get_zhipu_client
from backend.utils import create_response

# Create blueprint
async_batch_bp = Blueprint('async_batch', __name__)


@async_batch_bp.route('/async_submit', methods=['POST'])
def async_submit():
    """
    Submit an asynchronous completion task.
    
    Request body:
        - model: Model name (default: 'glm-4-flash')
        - messages: List of messages
        - temperature: Temperature parameter (default: 0.1)
        - request_id: Optional request ID
    
    Returns:
        - task_id: Task identifier
        - request_id: Request identifier
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    client, error_response = get_zhipu_client()
    if error_response:
        return error_response
    
    req_data = request.get_json()
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
    
    Request body:
        - task_id: Task identifier
    
    Returns:
        Task result data
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
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
    
    Request body:
        - jsonlContent: JSONL content as string
        - fileName: File name (default: 'temp_batch_upload.jsonl')
    
    Returns:
        - fileId: Uploaded file identifier
        - message: Success message
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response

    client, error_response = get_zhipu_client()
    if error_response:
        return error_response
    
    req_data = request.get_json()
    jsonl_content = req_data.get('jsonlContent')
    file_name = req_data.get('fileName', 'temp_batch_upload.jsonl')
    
    if not jsonl_content:
        return create_response(error="JSONL 内容不能为空")
    
    try:
        bytes_io = BytesIO(jsonl_content.encode('utf-8'))
        result = client.files.create(
            file=(file_name, bytes_io),
            purpose="batch"
        )
        return create_response(data={
            'fileId': result.id,
            'message': '文件上传成功！'
        })
    except Exception as e:
        return create_response(error=f"上传过程中发生错误: {str(e)}")


@async_batch_bp.route('/create_batch', methods=['POST'])
def create_batch_task():
    """
    Create a batch processing job.
    
    Request body:
        - fileId: File identifier from upload
    
    Returns:
        Batch job data
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response

    client, error_response = get_zhipu_client()
    if error_response:
        return error_response
    
    req_data = request.get_json()
    file_id = req_data.get('fileId')
    
    if not file_id:
        return create_response(error="File ID 不能为空")
    
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
    
    Request body:
        - batchId: Batch job identifier
    
    Returns:
        Batch job status data
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    client, error_response = get_zhipu_client()
    if error_response:
        return error_response
    
    req_data = request.get_json()
    batch_id = req_data.get('batchId')
    
    if not batch_id:
        return create_response(error="Batch ID 不能为空")
    
    try:
        batch_job = client.batches.retrieve(batch_id)
        return create_response(data=json.loads(batch_job.model_dump_json()))
    except Exception as e:
        return create_response(error=f"检查Batch状态时发生错误: {str(e)}")


@async_batch_bp.route('/download_result', methods=['POST'])
def download_result_file():
    """
    Download the result file of a completed batch job.
    
    Request body:
        - fileId: Result file identifier
    
    Returns:
        JSONL file content
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    client, error_response = get_zhipu_client()
    if error_response:
        return error_response
    
    req_data = request.get_json()
    file_id = req_data.get('fileId')
    
    if not file_id:
        return create_response(error="File ID 不能为空")
    
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
