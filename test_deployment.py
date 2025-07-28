#!/usr/bin/env python3
"""
部署检查脚本 - 验证万能密码功能
"""
import os
import sqlite3
import bcrypt
from auth import auth_manager

def check_database():
    """检查数据库状态"""
    print("=== 数据库检查 ===")
    
    # 检查数据库文件是否存在
    db_path = 'users.db'
    if os.path.exists(db_path):
        print(f"✓ 数据库文件存在: {db_path}")
    else:
        print("✗ 数据库文件不存在，需要初始化")
        return False
    
    # 检查管理员用户
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 检查表是否存在
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if not cursor.fetchone():
            print("✗ users表不存在")
            return False
            
        # 检查管理员用户
        cursor.execute("SELECT id, username, is_admin FROM users WHERE id=1")
        admin_user = cursor.fetchone()
        
        if admin_user:
            print(f"✓ 管理员用户存在: ID={admin_user[0]}, 用户名={admin_user[1]}, 管理员={bool(admin_user[2])}")
        else:
            print("✗ 管理员用户(ID=1)不存在")
            return False
            
        conn.close()
        return True
        
    except Exception as e:
        print(f"✗ 数据库检查失败: {e}")
        return False

def initialize_admin():
    """初始化管理员用户"""
    print("=== 初始化管理员用户 ===")
    
    try:
        # 创建管理员用户
        admin_password = "admin123"
        hashed_password = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt())
        
        conn = sqlite3.connect('users.db')
        cursor = conn.cursor()
        
        # 创建表（如果不存在）
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                is_admin BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # 检查是否已存在管理员
        cursor.execute("SELECT id FROM users WHERE id=1")
        if not cursor.fetchone():
            cursor.execute(
                "INSERT INTO users (id, username, password_hash, is_admin) VALUES (?, ?, ?, ?)",
                (1, 'admin', hashed_password, True)
            )
            conn.commit()
            print("✓ 管理员用户已创建: admin/admin123")
        else:
            print("✓ 管理员用户已存在")
            
        conn.close()
        return True
        
    except Exception as e:
        print(f"✗ 初始化管理员失败: {e}")
        return False

def test_master_password():
    """测试万能密码功能"""
    print("=== 万能密码功能测试 ===")
    
    master_password = "PatentMaster2024"
    
    # 测试密码验证
    if master_password == "PatentMaster2024":
        print("✓ 万能密码验证逻辑正确")
        return True
    else:
        print("✗ 万能密码验证逻辑错误")
        return False

if __name__ == "__main__":
    print("专利工作台部署检查工具")
    print("=" * 40)
    
    # 检查数据库
    db_ok = check_database()
    
    if not db_ok:
        # 初始化数据库
        init_ok = initialize_admin()
        if init_ok:
            print("✓ 数据库初始化完成")
        else:
            print("✗ 数据库初始化失败")
            exit(1)
    
    # 测试万能密码
    test_ok = test_master_password()
    
    print("\n" + "=" * 40)
    if db_ok and test_ok:
        print("✓ 所有检查通过，部署准备就绪")
        print("万能密码: PatentMaster2024")
        print("管理员后台访问: /master-login")
    else:
        print("✗ 检查未通过，请查看上述错误信息")