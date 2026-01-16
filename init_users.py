#!/usr/bin/env python3
"""
初始化用户文件
如果 users.json 不存在，创建一个包含默认用户的文件
"""
import json
import os
from werkzeug.security import generate_password_hash

USERS_FILE = 'users.json'

# 默认用户配置
DEFAULT_USERS = {
    'admin': 'admin123',  # 用户名: 密码
    'demo': 'demo123'
}

def init_users():
    """初始化用户文件"""
    # 如果文件已存在，不覆盖
    if os.path.exists(USERS_FILE):
        print(f"✅ {USERS_FILE} 已存在，跳过初始化")
        return
    
    # 创建用户字典，密码使用哈希
    users = {}
    for username, password in DEFAULT_USERS.items():
        users[username] = generate_password_hash(password)
    
    # 保存到文件
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f, indent=4)
    
    print(f"✅ 已创建 {USERS_FILE}")
    print("\n默认用户账号：")
    for username, password in DEFAULT_USERS.items():
        print(f"  用户名: {username}")
        print(f"  密码: {password}")
        print()

if __name__ == '__main__':
    init_users()
