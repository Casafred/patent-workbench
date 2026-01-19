"""
WSGI entry point for production deployment.

This file is used by Gunicorn to start the application.
"""

from backend.app import create_app
from backend.user_management.init_users import init_users

# Initialize users before creating the app
init_users()

# Create the application instance
app = create_app()

if __name__ == "__main__":
    app.run()
