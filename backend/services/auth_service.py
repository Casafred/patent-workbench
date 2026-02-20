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
        if username not in users:
            return False
        
        if AuthService.is_user_disabled(username):
            return False
        
        return check_password_hash(users.get(username, ""), password)
    
    @staticmethod
    def load_users_data():
        """
        Load full users data including metadata.
        
        Returns:
            dict: Full users data
        """
        try:
            with open(USERS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError) as e:
            print(f"警告：加载用户数据失败: {e}")
            return {}
    
    @staticmethod
    def save_users_data(data):
        """
        Save full users data.
        
        Args:
            data: Users data to save
        """
        with open(USERS_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    @staticmethod
    def is_user_disabled(username):
        """
        Check if user is disabled.
        
        Args:
            username: Username to check
        
        Returns:
            bool: True if disabled
        """
        data = AuthService.load_users_data()
        if isinstance(data, dict) and 'metadata' in data:
            metadata = data['metadata'].get(username, {})
            return metadata.get('disabled', False)
        return False
    
    @staticmethod
    def get_all_users():
        """
        Get all users with their status.
        
        Returns:
            list: List of user info dicts
        """
        data = AuthService.load_users_data()
        users_list = []
        
        if isinstance(data, dict) and 'users' in data:
            users = data.get('users', {})
            metadata = data.get('metadata', {})
        else:
            users = data
            metadata = {}
        
        for username in users.keys():
            user_meta = metadata.get(username, {})
            users_list.append({
                'username': username,
                'disabled': user_meta.get('disabled', False),
                'created_at': user_meta.get('created_at'),
                'email': user_meta.get('email'),
                'nickname': user_meta.get('nickname')
            })
        
        return users_list
    
    @staticmethod
    def toggle_user_status(username):
        """
        Toggle user disabled status.
        
        Args:
            username: Username to toggle
        
        Returns:
            tuple: (success: bool, message: str, new_status: bool)
        """
        data = AuthService.load_users_data()
        
        if isinstance(data, dict) and 'users' in data:
            users = data.get('users', {})
            metadata = data.get('metadata', {})
        else:
            users = data
            metadata = {}
        
        if username not in users:
            return False, "用户不存在", False
        
        if username not in metadata:
            metadata[username] = {}
        
        current_status = metadata[username].get('disabled', False)
        new_status = not current_status
        metadata[username]['disabled'] = new_status
        
        if isinstance(data, dict) and 'users' in data:
            data['metadata'] = metadata
        else:
            data = {'users': users, 'metadata': metadata}
        
        AuthService.save_users_data(data)
        
        status_text = "已停用" if new_status else "已启用"
        return True, f"用户{status_text}", new_status
    
    @staticmethod
    def create_user(username, password, email=None, nickname=None):
        """
        Create a new user.
        
        Args:
            username: Username
            password: Password
            email: Email (optional)
            nickname: Nickname (optional)
        
        Returns:
            tuple: (success: bool, message: str)
        """
        if len(username) < 3 or len(username) > 20:
            return False, "用户名长度需在3-20个字符之间"
        
        if not username.replace('_', '').isalnum():
            return False, "用户名只能包含字母、数字和下划线"
        
        if len(password) < 6:
            return False, "密码长度至少6位"
        
        data = AuthService.load_users_data()
        
        if isinstance(data, dict) and 'users' in data:
            users = data.get('users', {})
            metadata = data.get('metadata', {})
        else:
            users = data
            metadata = {}
        
        if username in users:
            return False, "用户名已存在"
        
        users[username] = generate_password_hash(password)
        metadata[username] = {
            'created_at': time.strftime('%Y-%m-%d %H:%M:%S'),
            'email': email,
            'nickname': nickname,
            'disabled': False,
            'created_by_admin': True
        }
        
        if isinstance(data, dict) and 'users' in data:
            data['users'] = users
            data['metadata'] = metadata
        else:
            data = {'users': users, 'metadata': metadata}
        
        AuthService.save_users_data(data)
        return True, "用户创建成功"
    
    @staticmethod
    def delete_user(username):
        """
        Delete a user.
        
        Args:
            username: Username to delete
        
        Returns:
            tuple: (success: bool, message: str)
        """
        data = AuthService.load_users_data()
        
        if isinstance(data, dict) and 'users' in data:
            users = data.get('users', {})
            metadata = data.get('metadata', {})
        else:
            users = data
            metadata = {}
        
        if username not in users:
            return False, "用户不存在"
        
        del users[username]
        if username in metadata:
            del metadata[username]
        
        if isinstance(data, dict) and 'users' in data:
            data['users'] = users
            data['metadata'] = metadata
        else:
            data = {'users': users, 'metadata': metadata}
        
        AuthService.save_users_data(data)
        return True, "用户已删除"
    
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
            
            AuthService._clear_application_password(username)
            
            return True, "密码修改成功"
        except Exception as e:
            print(f"密码修改失败: {e}")
            return False, "密码修改失败，请稍后重试"
    
    @staticmethod
    def _clear_application_password(username):
        """
        Clear password in applications.json after user changes password.
        
        Args:
            username: Username
        """
        applications_file = os.path.join(BASE_DIR, 'backend', 'user_management', 'applications.json')
        try:
            if not os.path.exists(applications_file):
                return
            
            with open(applications_file, 'r', encoding='utf-8') as f:
                applications = json.load(f)
            
            updated = False
            for app in applications:
                if app.get('username') == username:
                    app['password'] = '[用户已修改]'
                    app['password_changed'] = True
                    updated = True
            
            if updated:
                with open(applications_file, 'w', encoding='utf-8') as f:
                    json.dump(applications, f, ensure_ascii=False, indent=2)
                print(f"已清除 applications.json 中 {username} 的明文密码")
        except Exception as e:
            print(f"更新 applications.json 失败: {e}")
    
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
    
    @staticmethod
    def change_username(old_username, new_username, password):
        """
        Change username.
        
        Args:
            old_username: Current username
            new_username: New username
            password: Password for verification
        
        Returns:
            tuple: (success: bool, message: str)
        """
        if not AuthService.verify_credentials(old_username, password):
            return False, "密码不正确"
        
        if new_username == old_username:
            return False, "新用户名不能与当前用户名相同"
        
        if len(new_username) < 3 or len(new_username) > 20:
            return False, "用户名长度需在3-20个字符之间"
        
        if not new_username.isalnum() and '_' not in new_username:
            return False, "用户名只能包含字母、数字和下划线"
        
        try:
            with open(USERS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if isinstance(data, dict) and 'users' in data:
                users = data['users']
            else:
                users = data
            
            if new_username in users:
                return False, "该用户名已被使用"
            
            password_hash = users.pop(old_username)
            users[new_username] = password_hash
            
            if isinstance(data, dict) and 'users' in data:
                data['users'] = users
            else:
                data = users
            
            with open(USERS_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            AuthService._update_application_username(old_username, new_username)
            
            return True, "用户名修改成功"
        except Exception as e:
            print(f"用户名修改失败: {e}")
            return False, "用户名修改失败，请稍后重试"
    
    @staticmethod
    def _update_application_username(old_username, new_username):
        """
        Update username in applications.json.
        
        Args:
            old_username: Old username
            new_username: New username
        """
        applications_file = os.path.join(BASE_DIR, 'backend', 'user_management', 'applications.json')
        try:
            if not os.path.exists(applications_file):
                return
            
            with open(applications_file, 'r', encoding='utf-8') as f:
                applications = json.load(f)
            
            updated = False
            for app in applications:
                if app.get('username') == old_username:
                    app['username'] = new_username
                    updated = True
            
            if updated:
                with open(applications_file, 'w', encoding='utf-8') as f:
                    json.dump(applications, f, ensure_ascii=False, indent=2)
                print(f"已同步更新 applications.json 中的用户名: {old_username} -> {new_username}")
        except Exception as e:
            print(f"更新 applications.json 失败: {e}")
