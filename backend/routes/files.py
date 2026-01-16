"""
File management routes.

This module handles file upload, listing, deletion, and content retrieval
for the ZhipuAI API.
"""

import json
import traceback
from flask import Blueprint, request, Response
from backend.middleware import login_required
from backend.services import get_zhipu_client
from backend.utils import create_response

# Create blueprint
files_bp = Blueprint('files', __name__)


@files_bp.route('/files/upload', methods=['POST'])
@login_required
def upload_any_file():
    """
    Upload a file to ZhipuAI API.
    
    Form data:
        - file: File to upload
        - purpose: Purpose of the file ('batch', 'file-extract', 'code-interpreter', 'agent')
    
    Returns:
        File upload result data
    """
    client, error_response = get_zhipu_client()
    if error_response:
        return error_response

    if 'file' not in request.files:
        return create_response(
            error="Missing file part in the request",
            status_code=400
        )
    
    file_storage = request.files['file']
    purpose = request.form.get('purpose')

    if not purpose or purpose not in ['batch', 'file-extract', 'code-interpreter', 'agent']:
        return create_response(
            error="Invalid or missing 'purpose' field",
            status_code=400
        )

    try:
        file_content = file_storage.read()
        file_tuple = (file_storage.filename, file_content)
        
        upload_result = client.files.create(file=file_tuple, purpose=purpose)
        return create_response(data=json.loads(upload_result.model_dump_json()))
    except Exception as e:
        print(f"File upload failed: {traceback.format_exc()}")
        return create_response(
            error=f"An error occurred during file upload: {e}",
            status_code=500
        )


@files_bp.route('/files', methods=['GET'])
@login_required
def list_files():
    """
    List files uploaded to ZhipuAI API.
    
    Query parameters:
        - purpose: Filter by purpose (optional)
    
    Returns:
        List of files
    """
    client, error_response = get_zhipu_client()
    if error_response:
        return error_response
    
    try:
        purpose = request.args.get('purpose')
        list_result = client.files.list(purpose=purpose)
        return create_response(data=json.loads(list_result.model_dump_json()))
    except Exception as e:
        print(f"File listing failed: {traceback.format_exc()}")
        return create_response(
            error=f"Failed to list files: {e}",
            status_code=500
        )


@files_bp.route('/files/<string:file_id>', methods=['DELETE'])
@login_required
def delete_file(file_id):
    """
    Delete a file from ZhipuAI API.
    
    Path parameters:
        - file_id: File identifier
    
    Returns:
        Deletion result
    """
    client, error_response = get_zhipu_client()
    if error_response:
        return error_response

    try:
        delete_result = client.files.delete(file_id=file_id)
        
        # Check 'deleted' flag
        result_data = json.loads(delete_result.model_dump_json())
        if not result_data.get('deleted'):
            # Extract error message from ZhipuAI response
            error_msg_from_zhipu = result_data.get('error', 'Unknown error from provider.')
            return create_response(
                error=f"删除文件失败: {error_msg_from_zhipu}",
                status_code=500
            )

        return create_response(data=result_data)
        
    except Exception as e:
        print(f"File deletion failed: {traceback.format_exc()}")
        error_message = f"Failed to delete file: {str(e)}"
        
        # Try to extract API error message
        if hasattr(e, 'response'):
            try:
                error_detail = e.response.json()
                error_message = f"Failed to delete file: {error_detail.get('error', {}).get('message', str(e))}"
            except:
                pass  # Keep original error message
        
        return create_response(error=error_message, status_code=500)


@files_bp.route('/files/<string:file_id>/content', methods=['GET'])
@login_required
def get_file_content(file_id):
    """
    Get the content of a file from ZhipuAI API.
    
    Path parameters:
        - file_id: File identifier
    
    Returns:
        File content as binary stream
    
    Note:
        This endpoint only supports 'batch' and 'file-extract' purposes.
    """
    client, error_response = get_zhipu_client()
    if error_response:
        return error_response

    try:
        file_content_obj = client.files.content(file_id=file_id)
        return Response(
            file_content_obj.content,
            mimetype='application/octet-stream'
        )
    except Exception as e:
        print(f"Get file content failed: {traceback.format_exc()}")
        return create_response(
            error=f"Failed to get file content: {e}",
            status_code=500
        )
