"""
Authentication service.

This module handles user authentication and IP management.
"""

import json
from flask import request, session
from werkzeug.security import check_password_hash
from backend.config import USERS_FILE, MAX_IPS_PER_USER
from backend.extensions import get_db_pool


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
                        first_seen TIMESTAMPTZ DEFAULT NOW(),
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
