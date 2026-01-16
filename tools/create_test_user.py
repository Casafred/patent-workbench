#!/usr/bin/env python3
"""
创建测试用户
"""
import json
from werkzeug.security import generate_password_hash

# 创建测试用户
username = "test"
password = "test123"

# 生成密码哈希
password_hash = generate_password_hash(password)

# 读取现有用户
try:
    with open('users.json', 'r') as f:
        users = json.load(f)
except:
    users = {}

# 添加测试用户
users[username] = password_hash

# 保存
with open('users.json', 'w') as f:
    json.dump(users, f, indent=4)

print(f"✅ 测试用户已创建！")
print(f"   用户名: {username}")
print(f"   密码: {password}")
print(f"\n现在你可以使用这个账号登录了！")
