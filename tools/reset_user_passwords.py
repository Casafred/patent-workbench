#!/usr/bin/env python3
"""重置用户密码为已知密码"""
import json
from werkzeug.security import generate_password_hash

# 定义用户和密码
users_to_reset = {
    'alfred777': 'alfred777',      # 用户名作为密码
    'fredmate001': 'fredmate001',  # 用户名作为密码
    'fredmate002': 'fredmate002',  # 用户名作为密码
    'test': 'test123',             # 简单密码
    'test2026': 'test2026',        # 保持原样（这个已经可以用了）
    'admin': 'admin123',           # 添加管理员账号
    'demo': 'demo123',             # 添加演示账号
}

print("=== 重置用户密码 ===\n")
print("将要重置以下用户的密码：\n")

# 生成新的用户字典
new_users = {}
for username, password in users_to_reset.items():
    new_users[username] = generate_password_hash(password)
    print(f"  ✓ {username} -> 密码: {password}")

# 保存到文件
with open('backend/user_management/users.json', 'w') as f:
    json.dump(new_users, f, indent=4)

print("\n✅ 密码已重置并保存到 backend/user_management/users.json")
print("\n⚠️  重要提示：")
print("1. 这些是测试密码，生产环境请使用强密码")
print("2. 建议首次登录后立即修改密码")
print("3. users.json 已在 .gitignore 中，不会被提交到 Git")
print("\n可用的登录账号：")
for username, password in users_to_reset.items():
    print(f"  用户名: {username:15} 密码: {password}")
