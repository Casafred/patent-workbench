"""
Routes package.

This package contains all Flask route blueprints organized by functionality.
Optimized for faster startup with prioritized loading.
"""

import time
from flask import Flask


CRITICAL_BLUEPRINTS = [
    ('auth', 'auth_bp', None),
    ('chat', 'chat_bp', '/api'),
    ('patent', 'patent_bp', '/api'),
    ('feature_lock', 'feature_lock_bp', '/api/feature-lock'),
]

SECONDARY_BLUEPRINTS = [
    ('async_batch', 'async_batch_bp', '/api'),
    ('file_parser', 'file_parser_bp', '/api'),
    ('claims', 'claims_bp', '/api'),
    ('claims_analyzer', 'claims_analyzer_bp', None),
    ('excel_upload', 'excel_upload_bp', None),
    ('drawing_marker', 'drawing_marker_bp', '/api'),
    ('registration', 'registration_bp', '/api/register'),
    ('bailian_test', 'bailian_test_bp', '/api/bailian-test'),
    ('classification', 'classification_bp', '/api'),
    ('prompt_forum', 'prompt_forum_bp', None),
    ('ipc', 'ipc_bp', '/api'),
    ('epo', 'epo_bp', '/api/epo'),
]

TERTIARY_BLUEPRINTS = [
    ('user_management', 'user_management_bp', None, 'backend.user_management.user_management'),
]


def _import_and_register(app: Flask, module_name: str, bp_name: str, url_prefix: str = None, full_path: str = None):
    """
    Import and register a single blueprint.
    
    Args:
        app: Flask application instance
        module_name: Name of the module (e.g., 'auth')
        bp_name: Name of the blueprint variable (e.g., 'auth_bp')
        url_prefix: URL prefix for the blueprint
        full_path: Full import path if different from convention
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        if full_path:
            module = __import__(full_path, fromlist=[bp_name])
        else:
            module = __import__(f'.{module_name}', package=__name__, fromlist=[bp_name])
        
        bp = getattr(module, bp_name)
        
        if url_prefix:
            app.register_blueprint(bp, url_prefix=url_prefix)
        else:
            app.register_blueprint(bp)
        
        return True
    except Exception as e:
        print(f"⚠ Failed to load blueprint {module_name}: {e}")
        return False


def register_blueprints(app: Flask):
    """
    Register all blueprints with the Flask application.
    Uses prioritized loading for faster startup.
    
    Args:
        app: Flask application instance
    """
    start_time = time.time()
    loaded_count = 0
    
    print("📦 Loading critical blueprints...")
    for module_name, bp_name, url_prefix in CRITICAL_BLUEPRINTS:
        if _import_and_register(app, module_name, bp_name, url_prefix):
            loaded_count += 1
    
    critical_time = time.time() - start_time
    print(f"✓ Critical blueprints loaded ({loaded_count}) in {critical_time*1000:.1f}ms")
    
    print("📦 Loading secondary blueprints...")
    secondary_start = time.time()
    for module_name, bp_name, url_prefix in SECONDARY_BLUEPRINTS:
        if _import_and_register(app, module_name, bp_name, url_prefix):
            loaded_count += 1
    
    secondary_time = time.time() - secondary_start
    print(f"✓ Secondary blueprints loaded in {secondary_time*1000:.1f}ms")
    
    print("📦 Loading tertiary blueprints...")
    for item in TERTIARY_BLUEPRINTS:
        module_name, bp_name, url_prefix, full_path = item
        if _import_and_register(app, module_name, bp_name, url_prefix, full_path):
            loaded_count += 1
    
    total_time = time.time() - start_time
    print(f"✓ All blueprints registered successfully ({loaded_count} total) in {total_time*1000:.1f}ms")
    
    return app
