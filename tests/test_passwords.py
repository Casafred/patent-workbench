#!/usr/bin/env python3
"""测试 users.json 中的密码"""

import json
from werkzeug.security import check_password_hash

# 读取用户文件
with open('backend/user_management/users.json', 'r', encoding='utf-8') as f:
    users = json.load(f)

# 测试密码（根据你创建用户时设置的密码）
test_passwords = {
    'alfred777': 'alfred777',
    'fredmate001': 'fredmate001', 
    'fredmate002': 'fredmate002',
    'test': 'test123',
    'test2026': 'test2026',
    'admin': 'admin123',
    'demo': 'demo123'
}

print("=" * 70)
print("测试 users.json 中的密码")
print("=" * 70)

for username, test_password in test_passwords.items():
    if username in users:
        password_hash = users[username]
        is_valid = check_password_hash(password_hash, test_password)
        
        if is_valid:
            print(f"✅ {username:15} - 密码: {test_password:15} - 验证成功")
        else:
            print(f"❌ {username:15} - 密码: {test_password:15} - 验证失败")
    else:
        print(f"⚠️  {username:15} - 用户不存在")

print("\n" + "=" * 70)
print("如果所有密码都验证失败，说明密码不是上面列出的")
print("你需要知道创建这些用户时设置的实际密码")
print("=" * 70)
