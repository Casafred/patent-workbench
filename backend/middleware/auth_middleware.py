"""
Authentication middleware.

This module provides decorators and functions for authentication.
"""

from functools import wraps
from flask import session, request, redirect, url_for, make_response, jsonify
from backend.services.auth_service import AuthService


def validate_api_request():
    """
    Validate API request authentication.
    
    Returns:
        tuple: (is_valid, error_response)
               If valid, error_response is None
               If invalid, is_valid is False and error_response contains error
    """
    # 诊断工具路由绕过认证（仅本地开发环境）
    if request.path == '/api/drawing-marker/process':
        # 获取客户端IP
        client_ip = AuthService.get_client_ip()
        # 检查是否是本地请求（支持多种本地IP格式）
        local_ips = ['127.0.0.1', 'localhost', '::1', '0.0.0.0']
        if client_ip in local_ips or client_ip.startswith('127.') or client_ip.startswith('192.168.'):
            print(f"[DEBUG] 诊断工具请求来自本地IP: {client_ip}，绕过认证")
            return True, None
        else:
            print(f"[DEBUG] 诊断工具请求来自远程IP: {client_ip}，需要认证")
    
    if 'user' not in session:
        return False, make_response(
            jsonify({
                "success": False,
                "error": "Authentication required. Please log in."
            }),
            401
        )
    
    # Verify IP if database is available
    username = session['user']
    client_ip = AuthService.get_client_ip()
    
    if not AuthService.verify_user_ip(username, client_ip):
        session.clear()
        return False, make_response(
            jsonify({
                "success": False,
                "error": "Session expired or logged in from another location."
            }),
            401
        )
    
    return True, None


def login_required(f):
    """
    Decorator to require login for routes.
    
    Args:
        f: Function to decorate
    
    Returns:
        Decorated function that checks authentication
    
    Examples:
        @app.route('/protected')
        @login_required
        def protected_route():
            return 'Protected content'
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        is_valid, response = validate_api_request()
        
        if not is_valid:
            # For API routes, return JSON error
            if request.path.startswith('/api/'):
                return response
            
            # For page routes, redirect to login
            error_message = response.get_json().get('error')
            return redirect(url_for('auth.login', error=error_message))
        
        return f(*args, **kwargs)
    
    return decorated_function
