"""
API service for external API calls.

This module handles interactions with external APIs like ZhipuAI.
"""

from flask import request, session
from zhipuai import ZhipuAI
from backend.utils.response import create_response
from backend.config import GUEST_MODE_ENABLED, GUEST_API_KEY


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


def get_guest_zhipu_client():
    """
    Get ZhipuAI client for guest mode using built-in API key.
    
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


def is_guest_request():
    """
    Check if current request is from a guest user.
    
    Returns:
        bool: True if guest request, False otherwise
    """
    return session.get('is_guest', False)
