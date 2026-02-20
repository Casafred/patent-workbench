"""
Authentication service.

This module handles user authentication and IP management.
"""

import json
import os
import random
import string
import time
from flask import request, session
from werkzeug.security import check_password_hash, generate_password_hash
from backend.config import USERS_FILE, MAX_IPS_PER_USER, BASE_DIR
from backend.extensions import get_db_pool

PASSWORD_RESET_FILE = os.path.join(BASE_DIR, 'backend', 'user_management', 'password_reset.json')


class AuthService:
    """Service for handling authentication operations."""
    
    @staticmethod
    def load_users():
        """
        Load users from JSON file.
        
        Supports both formats:
        - Deploy format: {"username": "password_hash"}
        - Full format: {"users": {...}, "metadata": {...}}
        
        Returns:
            dict: Dictionary of username -> password_hash
        """
        try:
            with open(USERS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
                # Check if it's the full format with metadata
                if isinstance(data, dict) and 'users' in data:
                    return data['users']
                else:
                    # Deploy format, return as is
                    return data
        except (FileNotFoundError, json.JSONDecodeError) as e:
            print(f"警告：'users.json' 文件未找到或格式错误。将无法登录。错误: {e}")
            return {}
    
    @staticmethod
    def get_client_ip():
        """
        Get the real client IP address.
        
        Returns:
            str: Client IP address
        """
        if 'X-Forwarded-For' in request.headers:
            return request.headers['X-Forwarded-For'].split(',')[0].strip()
        return request.remote_addr
    
    @staticmethod
    def verify_credentials(username, password):
        """
        Verify user credentials.
        
        Args:
            username: Username to verify
            password: Password to verify
        
        Returns:
            bool: True if credentials are valid, False otherwise
        """
        users = AuthService.load_users()
        return username in users and check_password_hash(users.get(username, ""), password)
    
    @staticmethod
    def manage_user_ip(username, client_ip):
        """
        Manage user IP addresses in database.
        
        Args:
            username: Username
            client_ip: Client IP address
        
        Returns:
            bool: True if successful, False otherwise
        """
        db_pool = get_db_pool()
        if not db_pool:
            return True  # Skip IP management if no database
        
        conn = None
        try:
            conn = db_pool.getconn()
            with conn.cursor() as cur:
                # Check if IP is already known
                cur.execute(
                    "SELECT 1 FROM user_ips WHERE username = %s AND ip_address = %s;",
                    (username, client_ip)
                )
                is_known_ip = cur.fetchone() is not None
                
                if not is_known_ip:
                    # Check IP count
                    cur.execute(
                        "SELECT COUNT(*) FROM user_ips WHERE username = %s;",
                        (username,)
                    )
                    ip_count = cur.fetchone()[0]
                    
                    # Remove oldest IP if limit reached
                    if ip_count >= MAX_IPS_PER_USER:
                        cur.execute(
                            "DELETE FROM user_ips WHERE id = "
                            "(SELECT id FROM user_ips WHERE username = %s "
                            "ORDER BY first_seen ASC LIMIT 1);",
                            (username,)
                        )
                    
                    # Insert new IP
                    cur.execute(
                        "INSERT INTO user_ips (username, ip_address) "
                        "VALUES (%s, %s) "
                        "ON CONFLICT (username, ip_address) DO NOTHING;",
                        (username, client_ip)
                    )
                
                conn.commit()
                return True
                
        except Exception as e:
            print(f"IP处理时数据库操作失败: {e}")
            return False
        finally:
            if conn:
                db_pool.putconn(conn)
    
    @staticmethod
    def verify_user_ip(username, client_ip):
        """
        Verify if user IP is registered.
        
        Args:
            username: Username
            client_ip: Client IP address
        
        Returns:
            bool: True if IP is registered, False otherwise
        """
        db_pool = get_db_pool()
        if not db_pool:
            return True  # Skip verification if no database
        
        conn = None
        try:
            conn = db_pool.getconn()
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT 1 FROM user_ips WHERE username = %s AND ip_address = %s;",
                    (username, client_ip)
                )
                return cur.fetchone() is not None
        except Exception as e:
            print(f"IP验证时发生数据库错误: {e}")
            return True  # Allow access on error
        finally:
            if conn:
                db_pool.putconn(conn)
    
    @staticmethod
    def init_database():
        """Initialize database tables."""
        db_pool = get_db_pool()
        if not db_pool:
            return
        
        conn = None
        try:
            conn = db_pool.getconn()
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS user_ips (
                        id SERIAL PRIMARY KEY,
                        username VARCHAR(255) NOT NULL,
                        ip_address VARCHAR(45) NOT NULL,
                        first_seen TIMESTAMZ DEFAULT NOW(),
                        UNIQUE (username, ip_address)
                    );
                """)
                conn.commit()
                print("数据库表 'user_ips' 已准备就绪。")
        except Exception as e:
            print(f"数据库初始化失败: {e}")
        finally:
            if conn:
                db_pool.putconn(conn)
    
    @staticmethod
    def change_password(username, old_password, new_password):
        """
        Change user password.
        
        Args:
            username: Username
            old_password: Current password
            new_password: New password
        
        Returns:
            tuple: (success: bool, message: str)
        """
        if not AuthService.verify_credentials(username, old_password):
            return False, "旧密码不正确"
        
        try:
            with open(USERS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if isinstance(data, dict) and 'users' in data:
                data['users'][username] = generate_password_hash(new_password)
            else:
                data[username] = generate_password_hash(new_password)
            
            with open(USERS_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            return True, "密码修改成功"
        except Exception as e:
            print(f"密码修改失败: {e}")
            return False, "密码修改失败，请稍后重试"
    
    @staticmethod
    def get_user_email(username):
        """
        Get user email from applications data.
        
        Args:
            username: Username
        
        Returns:
            str or None: User email if found
        """
        applications_file = os.path.join(BASE_DIR, 'backend', 'user_management', 'applications.json')
        try:
            with open(applications_file, 'r', encoding='utf-8') as f:
                applications = json.load(f)
            
            for app in applications:
                if app.get('username') == username and app.get('email'):
                    return app['email']
        except Exception as e:
            print(f"获取用户邮箱失败: {e}")
        return None
    
    @staticmethod
    def get_username_by_email(email):
        """
        Get username by email.
        
        Args:
            email: User email
        
        Returns:
            str or None: Username if found
        """
        applications_file = os.path.join(BASE_DIR, 'backend', 'user_management', 'applications.json')
        try:
            with open(applications_file, 'r', encoding='utf-8') as f:
                applications = json.load(f)
            
            for app in applications:
                if app.get('email') == email and app.get('username'):
                    return app['username']
        except Exception as e:
            print(f"获取用户名失败: {e}")
        return None
    
    @staticmethod
    def generate_verification_code():
        """Generate 6-digit verification code."""
        return ''.join(random.choices(string.digits, k=6))
    
    @staticmethod
    def save_reset_code(email, code):
        """
        Save password reset code.
        
        Args:
            email: User email
            code: Verification code
        
        Returns:
            bool: True if successful
        """
        try:
            os.makedirs(os.path.dirname(PASSWORD_RESET_FILE), exist_ok=True)
            
            reset_data = {}
            if os.path.exists(PASSWORD_RESET_FILE):
                with open(PASSWORD_RESET_FILE, 'r', encoding='utf-8') as f:
                    reset_data = json.load(f)
            
            reset_data[email] = {
                'code': code,
                'expires_at': time.time() + 600,
                'attempts': 0
            }
            
            with open(PASSWORD_RESET_FILE, 'w', encoding='utf-8') as f:
                json.dump(reset_data, f, ensure_ascii=False, indent=2)
            
            return True
        except Exception as e:
            print(f"保存验证码失败: {e}")
            return False
    
    @staticmethod
    def verify_reset_code(email, code):
        """
        Verify password reset code.
        
        Args:
            email: User email
            code: Verification code
        
        Returns:
            tuple: (success: bool, message: str)
        """
        try:
            if not os.path.exists(PASSWORD_RESET_FILE):
                return False, "验证码已过期，请重新获取"
            
            with open(PASSWORD_RESET_FILE, 'r', encoding='utf-8') as f:
                reset_data = json.load(f)
            
            if email not in reset_data:
                return False, "验证码已过期，请重新获取"
            
            record = reset_data[email]
            
            if time.time() > record['expires_at']:
                del reset_data[email]
                with open(PASSWORD_RESET_FILE, 'w', encoding='utf-8') as f:
                    json.dump(reset_data, f, ensure_ascii=False, indent=2)
                return False, "验证码已过期，请重新获取"
            
            if record['attempts'] >= 5:
                del reset_data[email]
                with open(PASSWORD_RESET_FILE, 'w', encoding='utf-8') as f:
                    json.dump(reset_data, f, ensure_ascii=False, indent=2)
                return False, "验证码尝试次数过多，请重新获取"
            
            if record['code'] != code:
                record['attempts'] += 1
                with open(PASSWORD_RESET_FILE, 'w', encoding='utf-8') as f:
                    json.dump(reset_data, f, ensure_ascii=False, indent=2)
                return False, f"验证码不正确，剩余尝试次数: {5 - record['attempts']}"
            
            del reset_data[email]
            with open(PASSWORD_RESET_FILE, 'w', encoding='utf-8') as f:
                json.dump(reset_data, f, ensure_ascii=False, indent=2)
            
            return True, "验证成功"
        except Exception as e:
            print(f"验证码验证失败: {e}")
            return False, "验证失败，请稍后重试"
    
    @staticmethod
    def reset_password_by_email(email, new_password):
        """
        Reset user password by email.
        
        Args:
            email: User email
            new_password: New password
        
        Returns:
            tuple: (success: bool, message: str)
        """
        username = AuthService.get_username_by_email(email)
        if not username:
            return False, "未找到与该邮箱关联的账号"
        
        try:
            with open(USERS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if isinstance(data, dict) and 'users' in data:
                data['users'][username] = generate_password_hash(new_password)
            else:
                data[username] = generate_password_hash(new_password)
            
            with open(USERS_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            return True, "密码重置成功"
        except Exception as e:
            print(f"密码重置失败: {e}")
            return False, "密码重置失败，请稍后重试"
