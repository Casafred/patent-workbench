"""
File Parser routes.

This module handles file parsing using ZhipuAI's new File Parser API.
Supports creating parsing tasks and retrieving results.
"""

import os
import json
import traceback
import tempfile
from flask import Blueprint, request
from werkzeug.utils import secure_filename
from backend.middleware import login_required
from backend.services.file_parser_service import FileParserService
from backend.utils import create_response
from backend.config import Config

# Create blueprint
file_parser_bp = Blueprint('file_parser', __name__)


def get_file_parser_service():
    """
    Get FileParserService instance.
    
    Returns:
        tuple: (service, error_response) where error_response is None if successful
    """
    # Try to get API key from Authorization header first, then environment variable
    api_key = None
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        api_key = auth_header.split(' ', 1)[1]
    
    if not api_key:
        api_key = os.environ.get('ZHIPUAI_API_KEY')
    
    if not api_key:
        return None, create_response(
            error="ZhipuAI API key not configured",
            status_code=500
        )
    
    try:
        service = FileParserService(api_key)
        return service, None
    except Exception as e:
        return None, create_response(
            error=f"Failed to initialize file parser service: {e}",
            status_code=500
        )


@file_parser_bp.route('/files/parser/create', methods=['POST'])
@login_required
def create_parser_task():
    """
    Create a file parsing task.
    
    Form data:
        - file: File object (required)
        - tool_type: Parsing service type (lite, expert, prime) - default: lite
        - file_type: File type (PDF, DOCX, etc.) - optional, auto-detected
    
    Returns:
        {
            "task_id": "Task ID",
            "status": "processing",
            "filename": "Filename"
        }
    
    Error responses:
        400: Missing file or invalid parameters
        500: Service error
    """
    # Get file parser service
    service, error_response = get_file_parser_service()
    if error_response:
        return error_response
    
    # Validate file presence
    if 'file' not in request.files:
        return create_response(
            error="Missing file in request",
            status_code=400
        )
    
    file_storage = request.files['file']
    
    if not file_storage or file_storage.filename == '':
        return create_response(
            error="No file selected",
            status_code=400
        )
    
    # Get parameters
    tool_type = request.form.get('tool_type', 'lite')
    file_type = request.form.get('file_type')
    
    # Validate tool_type
    if tool_type not in FileParserService.TOOL_TYPES:
        return create_response(
            error=f"Invalid tool_type: {tool_type}. Must be one of {FileParserService.TOOL_TYPES}",
            status_code=400
        )
    
    # Save file temporarily
    temp_file = None
    try:
        # Secure the filename
        filename = secure_filename(file_storage.filename)
        
        # Create temporary file
        suffix = os.path.splitext(filename)[1]
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        file_storage.save(temp_file.name)
        temp_file.close()
        
        # Create parsing task
        result = service.create_parser_task(
            file_path=temp_file.name,
            tool_type=tool_type,
            file_type=file_type
        )
        
        # Add filename to response
        result['filename'] = filename
        
        return create_response(data=result)
        
    except ValueError as e:
        # Validation errors (file type, size, etc.)
        return create_response(
            error=str(e),
            status_code=400
        )
    except Exception as e:
        print(f"File parser task creation failed: {traceback.format_exc()}")
        return create_response(
            error=f"Failed to create parsing task: {str(e)}",
            status_code=500
        )
    finally:
        # Clean up temporary file
        if temp_file and os.path.exists(temp_file.name):
            try:
                os.unlink(temp_file.name)
            except Exception as e:
                print(f"Failed to delete temporary file: {e}")


@file_parser_bp.route('/files/parser/result/<task_id>', methods=['GET'])
@login_required
def get_parser_result(task_id):
    """
    Get parsing result.
    
    Path parameters:
        - task_id: Parsing task ID (required)
    
    Query parameters:
        - format_type: Return format (text, download_link) - default: text
        - poll: Whether to poll until completion (true, false) - default: true
        - timeout: Timeout in seconds for polling - default: 60
    
    Returns:
        {
            "status": "succeeded|failed|processing",
            "content": "Parsed text content",
            "error": "Error message (if failed)"
        }
    
    Error responses:
        400: Invalid parameters
        408: Timeout
        500: Service error
    """
    # Get file parser service
    service, error_response = get_file_parser_service()
    if error_response:
        return error_response
    
    # Get parameters
    format_type = request.args.get('format_type', 'text')
    poll = request.args.get('poll', 'true').lower() == 'true'
    timeout = int(request.args.get('timeout', 60))
    
    try:
        if poll:
            # Poll until completion or timeout
            result = service.get_parser_result(
                task_id=task_id,
                format_type=format_type,
                timeout=timeout
            )
        else:
            # Single check without polling
            result = service.poll_result(
                task_id=task_id,
                format_type=format_type,
                interval=0,
                max_attempts=1
            )
        
        return create_response(data=result)
        
    except TimeoutError as e:
        return create_response(
            error=str(e),
            status_code=408
        )
    except Exception as e:
        print(f"Get parser result failed: {traceback.format_exc()}")
        return create_response(
            error=f"Failed to get parsing result: {str(e)}",
            status_code=500
        )
