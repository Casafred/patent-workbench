import os
from datetime import timedelta
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

class Config:
    """应用配置类"""
    
    # 安全密钥配置
    SECRET_KEY = os.environ.get('SECRET_KEY') or os.urandom(32).hex()
    
    # 会话配置
    SESSION_TYPE = 'filesystem'
    PERMANENT_SESSION_LIFETIME = timedelta(hours=6)
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # 用户认证配置
    BCRYPT_LOG_ROUNDS = 12
    
    # 数据库配置（使用SQLite，适合小用户量）
    DATABASE_PATH = os.environ.get('DATABASE_PATH') or 'users.db'
    
    # 管理员配置
    ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME') or 'admin'
    ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD')
    
    # 部署配置
    DEBUG = os.environ.get('FLASK_ENV') == 'development'
    
    # 允许的跨域配置
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')
    
    @staticmethod
    def init_app(app):
        """初始化应用配置"""
        pass

class DevelopmentConfig(Config):
    """开发环境配置"""
    DEBUG = True

class ProductionConfig(Config):
    """生产环境配置"""
    DEBUG = False

class RenderConfig(ProductionConfig):
    """Render部署配置"""
    DATABASE_PATH = '/tmp/users.db'  # Render的临时目录

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'render': RenderConfig,
    'default': DevelopmentConfig
}