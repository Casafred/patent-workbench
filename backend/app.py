"""
Main Flask application.

This is the refactored entry point for the application using the
application factory pattern.
"""

import sys
import os

# Add parent directory to path so Python can find the backend module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask
from backend.config import Config
from backend.extensions import init_extensions
from backend.routes import register_blueprints
from backend.services.auth_service import AuthService


def create_app(config_class=Config):
    """
    Application factory pattern.
    
    Creates and configures the Flask application with all necessary
    extensions, blueprints, and initialization.
    
    Args:
        config_class: Configuration class to use (default: Config)
    
    Returns:
        Flask application instance
    """
    # Create Flask app
    app = Flask(__name__, 
                static_folder=Config.STATIC_FOLDER,
                static_url_path=Config.STATIC_URL_PATH)
    
    # Load configuration
    app.config.from_object(config_class)
    config_class.init_app(app)
    
    print("✓ Configuration loaded")
    
    # Initialize extensions (CORS, database pool, etc.)
    init_extensions(app)
    print("✓ Extensions initialized")
    
    # Register all blueprints
    register_blueprints(app)
    
    # Initialize database tables
    AuthService.init_database()
    print("✓ Database initialized")
    
    print("\n" + "="*50)
    print("🚀 Application created successfully!")
    print("="*50 + "\n")
    
    return app


# For development/testing
if __name__ == '__main__':
    app = create_app()
    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=Config.DEBUG
    )
