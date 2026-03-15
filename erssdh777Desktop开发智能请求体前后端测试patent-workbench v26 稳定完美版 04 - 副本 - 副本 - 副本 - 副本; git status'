"""
Flask extensions initialization.

This module initializes and configures all Flask extensions including:
- CORS
- Database connection pool
- Performance monitoring middleware
"""

import time
import psycopg2.pool
from flask_cors import CORS
from backend.config import Config, REMEMBER_ME_SESSION_LIFETIME

db_pool = None
_db_pool_initialized = False


def init_extensions(app):
    """
    Initialize Flask extensions.
    
    Args:
        app: Flask application instance
    """
    init_start = time.time()
    
    CORS(app)
    
    init_db_pool_lazy()
    
    init_performance_middleware(app)
    
    @app.before_request
    def set_session_lifetime():
        from flask import session
        if session.get('_remember_me'):
            session.permanent_session_lifetime = REMEMBER_ME_SESSION_LIFETIME
    
    init_time = (time.time() - init_start) * 1000
    print(f"✓ Extensions initialized in {init_time:.2f}ms")
    
    return app


def init_db_pool_lazy():
    """
    Initialize PostgreSQL connection pool lazily.
    The actual connection is deferred until first use.
    """
    global db_pool, _db_pool_initialized
    
    if _db_pool_initialized:
        return
    
    _db_pool_initialized = True
    
    database_url = Config.DATABASE_URL
    if not database_url:
        print("警告: 未找到 DATABASE_URL 环境变量。IP限制功能将不会工作。")
        db_pool = None
        return
    
    try:
        db_pool = psycopg2.pool.SimpleConnectionPool(
            Config.DB_POOL_MIN_CONN,
            Config.DB_POOL_MAX_CONN,
            dsn=database_url
        )
        print("✓ Database pool created (lazy initialization)")
        
    except Exception as e:
        print(f"错误: 无法创建数据库连接池: {e}")
        db_pool = None


def ensure_db_connection():
    """
    Ensure database connection is available.
    Call this before any database operation.
    """
    global db_pool
    
    if db_pool is None:
        init_db_pool_lazy()
    
    if db_pool is not None:
        try:
            conn = db_pool.getconn()
            db_pool.putconn(conn)
            return True
        except Exception as e:
            print(f"数据库连接测试失败: {e}")
            return False
    
    return False


def init_performance_middleware(app):
    """
    Initialize performance monitoring middleware.
    """
    from backend.middleware.performance import init_performance_middleware
    init_performance_middleware(app)
    print("✓ Performance middleware initialized")


def init_db_pool():
    """Initialize PostgreSQL connection pool (legacy function for compatibility)."""
    init_db_pool_lazy()
    
    if db_pool is not None:
        try:
            conn = db_pool.getconn()
            print("成功连接到 PostgreSQL 服务器。")
            db_pool.putconn(conn)
        except Exception as e:
            print(f"数据库连接测试失败: {e}")


def get_db_pool():
    """Get database connection pool."""
    return db_pool
