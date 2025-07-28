#!/usr/bin/env python3
"""
用户创建脚本 - 管理员工具
用于在服务器上快速创建用户账户
"""

import sqlite3
import sys
import os
from werkzeug.security import generate_password_hash
from datetime import datetime

# 数据库路径
DB_PATH = os.environ.get('DATABASE_PATH', 'users.db')

def create_user(username, password, is_admin=False):
    """创建单个用户"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # 检查用户名是否已存在
        cursor.execute('SELECT id FROM users WHERE username = ?', (username,))
        if cursor.fetchone():
            return False, f"用户 {username} 已存在"
        
        # 创建用户
        password_hash = generate_password_hash(password)
        cursor.execute('''
            INSERT INTO users (username, password_hash, is_admin, created_at)
            VALUES (?, ?, ?, ?)
        ''', (username, password_hash, is_admin, datetime.now()))
        
        conn.commit()
        return True, f"用户 {username} 创建成功"
    except Exception as e:
        conn.rollback()
        return False, f"创建用户 {username} 失败: {str(e)}"
    finally:
        conn.close()

def create_users_from_file(file_path):
    """从文件批量创建用户
    文件格式：每行一个用户，格式：用户名,密码,是否为管理员(true/false)
    """
    if not os.path.exists(file_path):
        return False, f"文件 {file_path} 不存在"
    
    created_count = 0
    errors = []
    
    with open(file_path, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line or line.startswith('#'):
                continue
                
            parts = line.split(',')
            if len(parts) < 2:
                errors.append(f"第{line_num}行格式错误")
                continue
            
            username = parts[0].strip()
            password = parts[1].strip()
            is_admin = len(parts) > 2 and parts[2].strip().lower() == 'true'
            
            success, message = create_user(username, password, is_admin)
            if success:
                created_count += 1
                print(f"✓ {message}")
            else:
                errors.append(f"第{line_num}行: {message}")
    
    return True, {
        "created": created_count,
        "errors": errors
    }

def show_help():
    """显示帮助信息"""
    print("""
用户创建脚本使用说明：

1. 创建单个用户：
   python create_users.py 用户名 密码 [true/false]
   示例：python create_users.py zhangsan user123 false

2. 从文件批量创建：
   python create_users.py --file 用户列表.txt

3. 文件格式示例（用户列表.txt）：
   # 用户名,密码,是否为管理员
   zhangsan,user123,false
   lisi,admin456,true
   wangwu,pass789,false

注意：
- 密码长度至少6位
- 管理员权限用 true/false 表示
- 以 # 开头的行为注释，会被忽略
""")

if __name__ == "__main__":
    if len(sys.argv) == 1 or sys.argv[1] in ['-h', '--help']:
        show_help()
        sys.exit(0)
    
    if sys.argv[1] == '--file':
        if len(sys.argv) < 3:
            print("错误：请指定用户列表文件路径")
            sys.exit(1)
        
        file_path = sys.argv[2]
        success, result = create_users_from_file(file_path)
        
        if success:
            print(f"\n批量创建完成！")
            print(f"成功创建：{result['created']} 个用户")
            if result['errors']:
                print("错误：")
                for error in result['errors']:
                    print(f"  - {error}")
        else:
            print(f"错误：{result}")
    
    elif len(sys.argv) >= 3:
        username = sys.argv[1]
        password = sys.argv[2]
        is_admin = len(sys.argv) > 3 and sys.argv[3].lower() == 'true'
        
        if len(password) < 6:
            print("错误：密码长度至少6位")
            sys.exit(1)
        
        success, message = create_user(username, password, is_admin)
        if success:
            print(f"✓ {message}")
        else:
            print(f"✗ {message}")
    
    else:
        print("错误：参数不足")
        show_help()