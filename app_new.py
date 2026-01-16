"""
Application entry point (Refactored Version).

This file imports the refactored application using the application
factory pattern. Use this for testing the new structure before
replacing the original app.py.

Usage:
    python app_new.py
    
Or with Gunicorn:
    gunicorn app_new:app
"""

from backend.app import create_app
from backend.config import Config

# Create application instance
app = create_app()

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🧪 Running REFACTORED application (app_new.py)")
    print("="*60)
    print(f"Host: {Config.HOST}")
    print(f"Port: {Config.PORT}")
    print(f"Debug: {Config.DEBUG}")
    print("="*60 + "\n")
    
    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=Config.DEBUG
    )
