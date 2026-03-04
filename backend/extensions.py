"""
Flask extensions initialization.

This module initializes and configures all Flask extensions including:
- CORS
- Database connection pool
"""

import psycopg2.pool
from flask_cors import CORS
from backend.config import Config, REMEMBER_ME_SESSION_LIFETIME

db_pool = None


def init_extensions(app):
    """
    Initialize Flask extensions.
    
    Args:
        app: Flask application instance
    """
    CORS(app)
    
    init_db_pool()
    
    @app.before_request
    def set_session_lifetime():
        from flask import session
        if session.get('_remember_me'):
            session.permanent_session_lifetime = REMEMBER_ME_SESSION_LIFETIME
    
    return app


def init_db_pool():
    """Initialize PostgreSQL connection pool."""
    global db_pool
    
    try:
        database_url = Config.DATABASE_URL
        if not database_url:
            print("警告: 未找到 DATABASE_URL 环境变量。IP限制功能将不会工作。")
            db_pool = None
            return
        
        db_pool = psycopg2.pool.SimpleConnectionPool(
            Config.DB_POOL_MIN_CONN,
            Config.DB_POOL_MAX_CONN,
            dsn=database_url
        )
        
        # Test connection
        conn = db_pool.getconn()
        print("成功连接到 PostgreSQL 服务器。")
        db_pool.putconn(conn)
        
    except Exception as e:
        print(f"错误: 无法连接到 PostgreSQL 服务器: {e}")
        db_pool = None


def get_db_pool():
    """Get database connection pool."""
    return db_pool
