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
    from .excel_upload import excel_upload_bp
    
    # Register blueprints with appropriate URL prefixes
    app.register_blueprint(auth_bp)
    app.register_blueprint(chat_bp, url_prefix='/api')
    app.register_blueprint(async_batch_bp, url_prefix='/api')
    app.register_blueprint(files_bp, url_prefix='/api')
    app.register_blueprint(patent_bp, url_prefix='/api')
    app.register_blueprint(claims_bp, url_prefix='/api')
    app.register_blueprint(excel_upload_bp)
    
    print("✓ All blueprints registered successfully")
    
    return app
