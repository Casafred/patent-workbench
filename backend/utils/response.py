"""
Response utility functions.

This module provides helper functions for creating standardized API responses.
"""

from flask import jsonify, make_response


def create_response(data=None, error=None, status_code=200):
    """
    Create a standardized JSON response.
    
    Args:
        data: Response data (optional)
        error: Error message (optional)
        status_code: HTTP status code (default: 200)
    
    Returns:
        Flask Response object with JSON content
    
    Examples:
        >>> create_response(data={'user': 'John'})
        {'success': True, 'data': {'user': 'John'}}
        
        >>> create_response(error='Not found', status_code=404)
        {'success': False, 'error': 'Not found'}
    """
    response_data = {'success': error is None}
    
    if data is not None:
        response_data['data'] = data
    
    if error is not None:
        response_data['error'] = error
        if status_code == 200:
            status_code = 400
    
    response = make_response(jsonify(response_data), status_code)
    response.headers['Content-Type'] = 'application/json; charset=utf-8'
    return response
