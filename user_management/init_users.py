#!/usr/bin/env python3
"""
初始化用户文件
如果 users.json 不存在，创建一个包含默认用户的文件
支持从环境变量读取用户配置
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

def get_users_from_env():
    """从环境变量读取用户配置"""
    users = {}
    # 读取环境变量中的用户配置，格式为 USER_用户名=密码
    for key, value in os.environ.items():
        if key.startswith('USER_') and len(key) > 5:
            username = key[5:].lower()
            password = value
            users[username] = password
    return users

def init_users():
    """初始化用户文件"""
    # 如果文件已存在，不覆盖
    if os.path.exists(USERS_FILE):
        print(f"✅ {USERS_FILE} 已存在，跳过初始化")
        return
    
    # 直接使用默认用户配置，暂时禁用从环境变量读取
    # 注：如需从环境变量读取用户，请取消注释以下代码块
    """
    # 优先从环境变量读取用户配置
    env_users = get_users_from_env()
    
    # 如果环境变量中有用户配置，使用环境变量的配置
    if env_users:
        users = {}
        for username, password in env_users.items():
            users[username] = generate_password_hash(password)
        
        # 保存到文件
        with open(USERS_FILE, 'w') as f:
            json.dump(users, f, indent=4)
        
        print(f"✅ 已创建 {USERS_FILE}（从环境变量配置）")
        print("\n环境变量配置的用户账号：")
        for username, password in env_users.items():
            print(f"  用户名: {username}")
            print(f"  密码: {password}")
            print()
    else:
        # 否则使用默认用户配置
        users = {}
        for username, password in DEFAULT_USERS.items():
            users[username] = generate_password_hash(password)
        
        # 保存到文件
        with open(USERS_FILE, 'w') as f:
            json.dump(users, f, indent=4)
        
        print(f"✅ 已创建 {USERS_FILE}（使用默认配置）")
        print("\n默认用户账号：")
        for username, password in DEFAULT_USERS.items():
            print(f"  用户名: {username}")
            print(f"  密码: {password}")
            print()
    """
    
    # 直接使用默认用户配置
    users = {}
    for username, password in DEFAULT_USERS.items():
        users[username] = generate_password_hash(password)
    
    # 保存到文件
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f, indent=4)
    
    print(f"✅ 已创建 {USERS_FILE}（使用默认配置）")
    print("\n默认用户账号：")
    for username, password in DEFAULT_USERS.items():
        print(f"  用户名: {username}")
        print(f"  密码: {password}")
        print()

if __name__ == '__main__':
    init_users()
