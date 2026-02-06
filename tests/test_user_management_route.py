#!/usr/bin/env python3
"""测试用户管理路由是否正确注册"""

from backend.app import create_app

app = create_app()

print("\n" + "="*60)
print("所有注册的路由:")
print("="*60)

for rule in app.url_map.iter_rules():
    print(f"{rule.rule:50} {rule.methods}")

print("\n" + "="*60)
print("用户管理相关路由:")
print("="*60)

user_routes = [rule for rule in app.url_map.iter_rules() if 'user' in rule.rule.lower()]
for rule in user_routes:
    print(f"{rule.rule:50} {rule.methods}")

if not user_routes:
    print("❌ 没有找到用户管理相关路由！")
else:
    print(f"\n✅ 找到 {len(user_routes)} 个用户管理路由")

# 测试访问
print("\n" + "="*60)
print("测试访问 /user-management:")
print("="*60)

with app.test_client() as client:
    response = client.get('/user-management')
    print(f"状态码: {response.status_code}")
    print(f"内容长度: {len(response.data)} bytes")
    if response.status_code == 200:
        print("✅ 路由工作正常！")
    else:
        print(f"❌ 路由返回错误: {response.status_code}")
        print(f"响应内容: {response.data[:200]}")
