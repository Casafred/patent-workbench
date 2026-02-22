"""
Configuration module for Patent Analysis Workbench.

This module centralizes all configuration settings including:
- Database configuration
- Session configuration
- File upload configuration
- API configuration
- Guest mode configuration
"""

import os
import json
from datetime import timedelta

# --- 基础配置 ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# --- 用户配置 ---
# Render Secret Files 会将文件放在 /etc/secrets/ 或根目录
# 优先使用 Render 的 Secret File，否则使用本地路径
if os.path.exists('/etc/secrets/users.json'):
    USERS_FILE = '/etc/secrets/users.json'
elif os.path.exists(os.path.join(BASE_DIR, 'users.json')):
    USERS_FILE = os.path.join(BASE_DIR, 'users.json')
else:
    USERS_FILE = os.path.join(BASE_DIR, 'backend', 'user_management', 'users.json')

# --- Flask配置 ---
SECRET_KEY = os.environ.get('FLASK_SECRET_KEY', 'dev-secret-key-for-local-testing-only')
PERMANENT_SESSION_LIFETIME = timedelta(hours=6)

# --- 数据库配置 ---
DATABASE_URL = os.environ.get('DATABASE_URL')
DB_POOL_MIN_CONN = 1
DB_POOL_MAX_CONN = 5

# --- IP限制配置 ---
MAX_IPS_PER_USER = int(os.environ.get('MAX_IPS_PER_USER', 5))

# --- 游客模式配置 ---
def _load_guest_config():
    """加载游客模式配置"""
    config_paths = [
        os.path.join(BASE_DIR, 'config', 'guest_config.json'),
        '/etc/secrets/guest_config.json',
    ]
    
    for path in config_paths:
        if os.path.exists(path):
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f"[Config] 加载游客配置失败 ({path}): {e}")
    return None

_guest_config = _load_guest_config()

GUEST_MODE_ENABLED = _guest_config is not None
GUEST_API_KEY = _guest_config.get('guest_api_key', '') if _guest_config else ''
GUEST_MODEL = _guest_config.get('guest_model', 'glm-4-flash') if _guest_config else 'glm-4-flash'
GUEST_SESSION_LIFETIME = timedelta(
    hours=_guest_config.get('guest_session_lifetime_hours', 2) if _guest_config else 2
)

# --- 文件上传配置 ---
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
ALLOWED_EXTENSIONS = {'xlsx', 'xls'}
MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100MB - 主要通过行数限制（1000行）控制

# --- 静态文件配置 ---
STATIC_FOLDER = BASE_DIR
STATIC_URL_PATH = ''

# --- CORS配置 ---
CORS_ORIGINS = '*'

# --- 服务器配置 ---
HOST = '0.0.0.0'
PORT = int(os.environ.get('PORT', 5001))
DEBUG = False


class Config:
    """Configuration class for Flask application."""
    
    SECRET_KEY = SECRET_KEY
    PERMANENT_SESSION_LIFETIME = PERMANENT_SESSION_LIFETIME
    MAX_CONTENT_LENGTH = MAX_CONTENT_LENGTH
    
    # JSON配置 - 确保中文字符正确显示
    JSON_AS_ASCII = False
    JSONIFY_MIMETYPE = 'application/json; charset=utf-8'
    
    # Database
    DATABASE_URL = DATABASE_URL
    DB_POOL_MIN_CONN = DB_POOL_MIN_CONN
    DB_POOL_MAX_CONN = DB_POOL_MAX_CONN
    
    # Security
    MAX_IPS_PER_USER = MAX_IPS_PER_USER
    
    # Guest Mode
    GUEST_MODE_ENABLED = GUEST_MODE_ENABLED
    GUEST_MODEL = GUEST_MODEL
    GUEST_SESSION_LIFETIME = GUEST_SESSION_LIFETIME
    
    # Files
    UPLOAD_FOLDER = UPLOAD_FOLDER
    ALLOWED_EXTENSIONS = ALLOWED_EXTENSIONS
    
    # Static
    STATIC_FOLDER = STATIC_FOLDER
    STATIC_URL_PATH = STATIC_URL_PATH
    
    # Server
    HOST = HOST
    PORT = PORT
    DEBUG = DEBUG
    
    # Request timeout - 增加请求超时时间
    SEND_FILE_MAX_AGE_DEFAULT = 0
    
    # Worker timeout for long-running tasks
    WORKER_TIMEOUT = 600  # 10分钟
    
    @staticmethod
    def init_app(app):
        """Initialize application with configuration."""
        # Ensure upload folder exists
        if not os.path.exists(UPLOAD_FOLDER):
            os.makedirs(UPLOAD_FOLDER)
