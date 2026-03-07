---
name: "flask-developer"
description: "Assists with Flask backend development including routes, blueprints, and services. Invoke when working on Flask routes, middleware, or backend services."
---

# Flask Developer Skill

This skill helps you develop Flask applications following best practices for routes, blueprints, and services.

## When to Invoke

- User is creating or modifying Flask routes
- User needs help with Flask blueprints
- User is implementing middleware
- User needs database integration help
- User wants to follow Flask best practices

## Project Architecture

This project uses the **Application Factory Pattern**:

```
backend/
├── app.py              # Application factory
├── config.py           # Configuration
├── extensions.py       # Flask extensions
├── routes/             # Route blueprints
│   ├── __init__.py
│   ├── auth.py
│   ├── chat.py
│   └── ...
├── services/           # Business logic
│   ├── auth_service.py
│   ├── llm_service.py
│   └── ...
├── middleware/         # Request middleware
└── utils/              # Helper functions
```

## Creating a New Route

### Step 1: Create Blueprint File
```python
# backend/routes/new_feature.py
from flask import Blueprint, request, jsonify, g
from backend.utils.response import success_response, error_response

bp = Blueprint('new_feature', __name__)

@bp.route('/api/new-feature', methods=['POST'])
def handle_new_feature():
    """
    Handle new feature request.
    
    Request body:
        - param1: Description
        - param2: Description
    
    Returns:
        JSON response with result
    """
    try:
        data = request.get_json()
        
        # Validate input
        if not data.get('param1'):
            return error_response('param1 is required', 400)
        
        # Call service
        result = new_feature_service.process(data)
        
        return success_response(result)
        
    except Exception as e:
        return error_response(str(e), 500)
```

### Step 2: Register Blueprint
```python
# backend/routes/__init__.py
from .new_feature import bp as new_feature_bp

def register_blueprints(app):
    # ... existing blueprints
    app.register_blueprint(new_feature_bp)
```

## Creating a Service

```python
# backend/services/new_feature_service.py
class NewFeatureService:
    def __init__(self):
        self.config = {}
    
    def process(self, data):
        """
        Process the feature request.
        
        Args:
            data: Request data dictionary
        
        Returns:
            Processed result
        """
        # Business logic here
        result = self._do_something(data)
        return result
    
    def _do_something(self, data):
        # Private helper method
        pass

# Singleton instance
new_feature_service = NewFeatureService()
```

## Request/Response Patterns

### Standard Response Format
```python
# backend/utils/response.py
def success_response(data=None, message='Success'):
    return jsonify({
        'success': True,
        'data': data,
        'message': message
    })

def error_response(message, status_code=400):
    return jsonify({
        'success': False,
        'error': message
    }), status_code
```

### Streaming Response
```python
from flask import Response, stream_with_context

@bp.route('/api/stream', methods=['POST'])
def stream_response():
    def generate():
        for chunk in data_chunks:
            yield f"data: {json.dumps(chunk)}\n\n"
    
    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream'
    )
```

## Authentication Pattern

```python
from functools import wraps
from flask import g

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return error_response('Unauthorized', 401)
        
        user = auth_service.verify_token(token)
        if not user:
            return error_response('Invalid token', 401)
        
        g.user = user
        return f(*args, **kwargs)
    return decorated

@bp.route('/api/protected', methods=['POST'])
@login_required
def protected_route():
    user = g.user
    # ...
```

## Database Patterns

### Using Connection Pool
```python
# backend/extensions.py
from psycopg2 import pool

db_pool = None

def init_extensions(app):
    global db_pool
    db_pool = pool.ThreadedConnectionPool(
        minconn=1,
        maxconn=10,
        dsn=app.config['DATABASE_URL']
    )

# In route/service
from backend.extensions import db_pool

def get_db_connection():
    return db_pool.getconn()

def release_db_connection(conn):
    db_pool.putconn(conn)
```

### Query Pattern
```python
def get_user_by_id(user_id):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM users WHERE id = %s",
            (user_id,)
        )
        user = cursor.fetchone()
        cursor.close()
        return user
    finally:
        release_db_connection(conn)
```

## Error Handling

```python
@bp.errorhandler(400)
def bad_request(error):
    return error_response('Bad request', 400)

@bp.errorhandler(404)
def not_found(error):
    return error_response('Not found', 404)

@bp.errorhandler(500)
def internal_error(error):
    return error_response('Internal server error', 500)
```

## Configuration

```python
# backend/config.py
import os

class Config:
    SECRET_KEY = os.environ.get('FLASK_SECRET_KEY', 'dev-key')
    DATABASE_URL = os.environ.get('DATABASE_URL')
    DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    # Static files
    STATIC_FOLDER = 'frontend'
    STATIC_URL_PATH = '/static'
```

## Best Practices

1. **Keep routes thin**: Logic goes in services
2. **Use blueprints**: Organize by feature
3. **Validate input**: Always check request data
4. **Handle errors**: Use try/except and error handlers
5. **Use connection pooling**: For database connections
6. **Log appropriately**: Use logging module
7. **Test routes**: Write unit tests for each endpoint
