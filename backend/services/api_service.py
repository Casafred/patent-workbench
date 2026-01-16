"""
API service for external API calls.

This module handles interactions with external APIs like ZhipuAI.
"""

from flask import request
from zhipuai import ZhipuAI
from backend.utils.response import create_response


def get_zhipu_client():
    """
    Get ZhipuAI client from Authorization header.
    
    Returns:
        tuple: (ZhipuAI client, error_response)
               If successful, error_response is None
               If failed, client is None and error_response contains error
    
    Examples:
        >>> client, error = get_zhipu_client()
        >>> if error:
        >>>     return error
        >>> # Use client...
    """
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
    
    try:
        client = ZhipuAI(api_key=api_key)
        return client, None
    except Exception as e:
        return None, create_response(
            error=f"Failed to initialize ZhipuAI client: {str(e)}",
            status_code=400
        )
