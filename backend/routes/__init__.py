"""
Routes package.

This package contains all Flask route blueprints organized by functionality.
"""

from flask import Flask


def register_blueprints(app: Flask):
    """
    Register all blueprints with the Flask application.
    
    Args:
        app: Flask application instance
    """
    from .auth import auth_bp
    from .chat import chat_bp
    from .async_batch import async_batch_bp
    from .files import files_bp
    from .patent import patent_bp
    from .claims import claims_bp
    from .claims_analyzer import claims_analyzer_bp
    from .excel_upload import excel_upload_bp
    from .drawing_marker import drawing_marker_bp
    from backend.user_management.user_management import user_management_bp
    
    # Register blueprints with appropriate URL prefixes
    app.register_blueprint(auth_bp)
    app.register_blueprint(chat_bp, url_prefix='/api')
    app.register_blueprint(async_batch_bp, url_prefix='/api')
    app.register_blueprint(files_bp, url_prefix='/api')
    app.register_blueprint(patent_bp, url_prefix='/api')
    app.register_blueprint(claims_bp, url_prefix='/api')
    app.register_blueprint(claims_analyzer_bp)
    app.register_blueprint(excel_upload_bp)
    app.register_blueprint(drawing_marker_bp, url_prefix='/api')
    app.register_blueprint(user_management_bp)
    
    print("✓ All blueprints registered successfully")
    
    return app
