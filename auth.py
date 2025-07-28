import sqlite3
import bcrypt
import secrets
import time
import os
from datetime import datetime, timedelta
from functools import wraps
from flask import jsonify, request, session, g
from config import Config

class UserAuth:
    """用户认证管理类"""
    
    def __init__(self, db_path=None):
        self.db_path = db_path or Config.DATABASE_PATH
        self.init_database()
    
    def init_database(self):
        """初始化数据库"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 用户表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                is_admin BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            )
        ''')
        
        # 会话表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                session_token TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                ip_address TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        # 创建默认管理员用户
        cursor.execute('SELECT COUNT(*) FROM users WHERE username = ?', (Config.ADMIN_USERNAME,))
        if cursor.fetchone()[0] == 0 and Config.ADMIN_PASSWORD:
            self.create_user(Config.ADMIN_USERNAME, Config.ADMIN_PASSWORD, is_admin=True)
        
        conn.commit()
        conn.close()
    
    def hash_password(self, password):
        """密码哈希"""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(Config.BCRYPT_LOG_ROUNDS))
    
    def verify_password(self, password, password_hash):
        """验证密码"""
        return bcrypt.checkpw(password.encode('utf-8'), password_hash)
    
    def create_user(self, username, password, is_admin=False):
        """创建新用户（仅管理员使用）"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            password_hash = self.hash_password(password)
            cursor.execute('''
                INSERT INTO users (username, password_hash, is_admin)
                VALUES (?, ?, ?)
            ''', (username, password_hash, is_admin))
            conn.commit()
            return True
        except sqlite3.IntegrityError:
            return False
        finally:
            conn.close()
    
    def authenticate_user(self, username, password):
        """验证用户登录"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, password_hash FROM users 
            WHERE username = ?
        ''', (username,))
        
        user = cursor.fetchone()
        conn.close()
        
        if user and self.verify_password(password, user[1]):
            return user[0]  # 返回用户ID
        return None
    
    def create_session(self, user_id, ip_address=None):
        """创建用户会话"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        session_token = secrets.token_urlsafe(32)
        expires_at = datetime.now() + timedelta(hours=6)
        
        cursor.execute('''
            INSERT INTO sessions (user_id, session_token, expires_at, ip_address)
            VALUES (?, ?, ?, ?)
        ''', (user_id, session_token, expires_at, ip_address))
        
        conn.commit()
        conn.close()
        
        return session_token
    
    def validate_session(self, session_token):
        """验证会话有效性"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT user_id, expires_at FROM sessions 
            WHERE session_token = ? AND expires_at > datetime('now')
        ''', (session_token,))
        
        result = cursor.fetchone()
        conn.close()
        
        if result:
            return result[0]  # 返回用户ID
        return None
    
    def get_user_info(self, user_id):
        """获取用户信息（不包含敏感信息）"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, username, is_admin, created_at, last_login 
            FROM users WHERE id = ?
        ''', (user_id,))
        
        user = cursor.fetchone()
        conn.close()
        
        if user:
            return {
                'id': user[0],
                'username': user[1],
                'is_admin': bool(user[2]),
                'created_at': user[3],
                'last_login': user[4]
            }
        return None
    
    def get_all_users(self):
        """获取所有用户列表（管理员功能）"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, username, is_admin, created_at, last_login 
            FROM users ORDER BY created_at DESC
        ''')
        
        users = cursor.fetchall()
        conn.close()
        
        return [{
            'id': user[0],
            'username': user[1],
            'is_admin': bool(user[2]),
            'created_at': user[3],
            'last_login': user[4]
        } for user in users]
    
    def delete_user(self, user_id):
        """删除用户（管理员功能）"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM sessions WHERE user_id = ?', (user_id,))
        cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
        
        affected = cursor.rowcount
        conn.commit()
        conn.close()
        
        return affected > 0
    
    def logout_user(self, session_token):
        """用户登出"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM sessions WHERE session_token = ?', (session_token,))
        affected = cursor.rowcount
        
        conn.commit()
        conn.close()
        
        return affected > 0
    
    def cleanup_expired_sessions(self):
        """清理过期会话"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM sessions WHERE expires_at <= datetime("now")')
        conn.commit()
        conn.close()

# 创建全局认证实例
auth_manager = UserAuth()

# 装饰器：要求登录
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        session_token = request.headers.get('X-User-Auth')
        if not session_token:
            return jsonify({'error': '未授权访问', 'code': 401}), 401
        
        # 清理过期会话
        auth_manager.cleanup_expired_sessions()
        
        user_id = auth_manager.validate_session(session_token)
        if not user_id:
            return jsonify({'error': '会话已过期，请重新登录', 'code': 401}), 401
        
        # 将用户ID存储在全局变量中
        g.current_user_id = user_id
        return f(*args, **kwargs)
    
    return decorated_function

# 装饰器：要求管理员权限
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not hasattr(g, 'current_user_id'):
            return jsonify({'error': '未授权访问', 'code': 401}), 401
        
        user_info = auth_manager.get_user_info(g.current_user_id)
        if not user_info or not user_info.get('is_admin'):
            return jsonify({'error': '需要管理员权限', 'code': 403}), 403
        
        return f(*args, **kwargs)
    
    return decorated_function