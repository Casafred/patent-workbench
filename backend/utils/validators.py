"""
Validation utility functions.

This module provides helper functions for validating inputs.
"""

from backend.config import ALLOWED_EXTENSIONS


def allowed_file(filename):
    """
    Check if a file has an allowed extension.
    
    Args:
        filename: Name of the file to check
    
    Returns:
        bool: True if file extension is allowed, False otherwise
    
    Examples:
        >>> allowed_file('document.xlsx')
        True
        
        >>> allowed_file('image.png')
        False
    """
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
