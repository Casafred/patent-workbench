#!/usr/bin/env python3
"""
初始化用户文件
如果 users.json 不存在，创建一个包含默认用户的文件
支持从环境变量读取用户配置

安全说明：
- 默认密码仅用于首次初始化
- 强烈建议通过环境变量设置密码
- 首次登录后请立即修改密码
"""
import json
import os
import secrets
import string
from pathlib import Path
from werkzeug.security import generate_password_hash

# 获取脚本所在目录的绝对路径
SCRIPT_DIR = Path(__file__).parent.absolute()
USERS_FILE = SCRIPT_DIR / 'users.json'

def generate_secure_password(length=16):
    """生成安全的随机密码"""
    alphabet = string.ascii_letters + string.digits + string.punctuation
    # 确保密码包含各种字符类型
    password = ''.join(secrets.choice(alphabet) for _ in range(length))
    return password

# 从环境变量读取密码，如果没有则生成随机密码
DEFAULT_ADMIN_PASSWORD = os.environ.get('DEFAULT_ADMIN_PASSWORD', generate_secure_password(20))
DEFAULT_DEMO_PASSWORD = os.environ.get('DEFAULT_DEMO_PASSWORD', generate_secure_password(20))

# 默认用户配置
DEFAULT_USERS = {
    'admin': DEFAULT_ADMIN_PASSWORD,
    'demo': DEFAULT_DEMO_PASSWORD
}


def get_users_from_env():
    """从环境变量读取用户配置（已弃用，保留用于兼容性）"""
    users = {}
    for key, value in os.environ.items():
        if key.startswith('USER_') and len(key) > 5:
            username = key[5:].lower()
            password = value
            users[username] = password
    return users


if __name__ == '__main__':
    init_users()

def init_users():
    """初始化用户文件"""
    # 如果文件已存在，不覆盖
    if USERS_FILE.exists():
        print(f"✅ {USERS_FILE} 已存在，跳过初始化")
        return
    
    # 创建用户
    users = {}
    for username, password in DEFAULT_USERS.items():
        users[username] = generate_password_hash(password)
    
    # 保存到文件
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f, indent=4)
    
    print(f"✅ 已创建 {USERS_FILE}")
    print("\n" + "="*60)
    print("⚠️  重要：默认用户账号信息")
    print("="*60)
    
    # 检查是否使用了环境变量
    if os.environ.get('DEFAULT_ADMIN_PASSWORD'):
        print("\n✓ 使用环境变量中的密码")
        print("\n默认用户账号：")
        for username in DEFAULT_USERS.keys():
            print(f"  用户名: {username}")
            print(f"  密码: (从环境变量读取)")
    else:
        print("\n⚠️  使用随机生成的密码（请妥善保存）")
        print("\n默认用户账号：")
        for username, password in DEFAULT_USERS.items():
            print(f"  用户名: {username}")
            print(f"  密码: {password}")
        
        print("\n" + "="*60)
        print("🔒 安全建议：")
        print("="*60)
        print("1. 请立即保存上述密码到安全的地方")
        print("2. 首次登录后请立即修改密码")
        print("3. 或者通过环境变量设置密码：")
        print("   export DEFAULT_ADMIN_PASSWORD='your_secure_password'")
        print("   export DEFAULT_DEMO_PASSWORD='your_secure_password'")
        print("="*60 + "\n")

if __name__ == '__main__':
    init_users()
