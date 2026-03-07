#!/usr/bin/env python3
"""
Render 登录问题诊断和修复工具

这个脚本会：
1. 检查 users.json 文件格式
2. 验证密码哈希
3. 生成测试用户
4. 提供详细的上传步骤
"""

import json
import os
from pathlib import Path
from werkzeug.security import generate_password_hash, check_password_hash

# 文件路径
USERS_FILE = Path('backend/user_management/users.json')
USERS_FULL_FILE = Path('backend/user_management/users_full.json')

# 测试密码
TEST_PASSWORDS = {
    'alfred777': 'alfred777',
    'fredmate001': 'fredmate001',
    'fredmate002': 'fredmate002',
    'test': 'test123',
    'test2026': 'test2026',
    'admin': 'admin123',
    'demo': 'demo123'
}


def check_file_exists():
    """检查文件是否存在"""
    print("=" * 70)
    print("步骤 1: 检查文件")
    print("=" * 70)
    
    if USERS_FILE.exists():
        print(f"✅ 找到文件: {USERS_FILE}")
        return True
    else:
        print(f"❌ 文件不存在: {USERS_FILE}")
        return False


def validate_json_format():
    """验证 JSON 格式"""
    print("\n" + "=" * 70)
    print("步骤 2: 验证 JSON 格式")
    print("=" * 70)
    
    try:
        with open(USERS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print(f"✅ JSON 格式正确")
        print(f"📊 用户数量: {len(data)}")
        print(f"👥 用户列表: {', '.join(data.keys())}")
        
        # 检查是否是部署格式（简单格式）
        if isinstance(data, dict) and 'users' not in data:
            print("✅ 使用部署格式（推荐）")
            return data, True
        elif isinstance(data, dict) and 'users' in data:
            print("⚠️  使用完整格式，建议转换为部署格式")
            return data['users'], False
        else:
            print("❌ 格式不正确")
            return None, False
            
    except json.JSONDecodeError as e:
        print(f"❌ JSON 格式错误: {e}")
        return None, False
    except Exception as e:
        print(f"❌ 读取文件失败: {e}")
        return None, False


def test_password_hashes(users_data):
    """测试密码哈希是否有效"""
    print("\n" + "=" * 70)
    print("步骤 3: 测试密码哈希")
    print("=" * 70)
    
    results = {}
    for username, password_hash in users_data.items():
        # 尝试使用已知密码验证
        test_password = TEST_PASSWORDS.get(username, username)
        
        try:
            is_valid = check_password_hash(password_hash, test_password)
            results[username] = {
                'hash': password_hash[:50] + '...',
                'test_password': test_password,
                'valid': is_valid
            }
            
            if is_valid:
                print(f"✅ {username:15} - 密码: {test_password:15} - 哈希有效")
            else:
                print(f"⚠️  {username:15} - 密码: {test_password:15} - 哈希无效（可能密码不对）")
                
        except Exception as e:
            print(f"❌ {username:15} - 哈希格式错误: {e}")
            results[username] = {
                'hash': password_hash[:50] + '...',
                'test_password': test_password,
                'valid': False,
                'error': str(e)
            }
    
    return results


def generate_fresh_users():
    """生成全新的用户文件"""
    print("\n" + "=" * 70)
    print("步骤 4: 生成新的用户文件（可选）")
    print("=" * 70)
    
    print("\n是否要生成新的用户文件？")
    print("⚠️  警告：这会覆盖现有的 users.json 文件")
    choice = input("输入 'yes' 继续，其他键跳过: ").strip().lower()
    
    if choice != 'yes':
        print("跳过生成新文件")
        return None
    
    # 生成新用户
    new_users = {}
    print("\n生成新用户...")
    for username, password in TEST_PASSWORDS.items():
        password_hash = generate_password_hash(password)
        new_users[username] = password_hash
        print(f"✅ {username:15} - 密码: {password}")
    
    # 保存到文件
    backup_file = USERS_FILE.with_suffix('.json.backup')
    if USERS_FILE.exists():
        import shutil
        shutil.copy(USERS_FILE, backup_file)
        print(f"\n📦 原文件已备份到: {backup_file}")
    
    with open(USERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(new_users, f, indent=4, ensure_ascii=False)
    
    print(f"✅ 新文件已保存到: {USERS_FILE}")
    return new_users


def show_render_upload_steps(users_data):
    """显示 Render 上传步骤"""
    print("\n" + "=" * 70)
    print("步骤 5: Render Secret Files 上传步骤")
    print("=" * 70)
    
    print("\n📋 详细步骤：")
    print("\n1️⃣  登录 Render Dashboard")
    print("   https://dashboard.render.com/")
    
    print("\n2️⃣  选择你的服务")
    print("   点击你的应用名称")
    
    print("\n3️⃣  进入 Environment 设置")
    print("   点击顶部的 'Environment' 标签")
    
    print("\n4️⃣  找到 Secret Files 部分")
    print("   向下滚动到 'Secret Files' 区域")
    
    print("\n5️⃣  删除旧的 Secret Files（如果存在）")
    print("   ⚠️  重要：删除所有名为 'backend/user_management/users.json' 的条目")
    print("   点击每个条目旁边的删除按钮")
    
    print("\n6️⃣  点击 'Save Changes'")
    print("   等待服务重新部署（约 2-5 分钟）")
    
    print("\n7️⃣  添加新的 Secret File")
    print("   点击 'Add Secret File' 按钮")
    
    print("\n8️⃣  填写文件信息")
    print("   Filename: backend/user_management/users.json")
    print("   ⚠️  注意：")
    print("      - 不要在开头加 / 或 ./")
    print("      - 使用正斜杠 / 不是反斜杠 \\")
    print("      - 路径区分大小写")
    
    print("\n9️⃣  复制文件内容")
    print("   在 Windows 上运行：")
    print("   type backend\\user_management\\users.json | clip")
    print("\n   或者手动复制下面的内容：")
    print("\n" + "-" * 70)
    print(json.dumps(users_data, indent=4, ensure_ascii=False))
    print("-" * 70)
    
    print("\n🔟 保存并等待部署")
    print("   点击 'Save Changes'")
    print("   等待服务重新部署完成")
    
    print("\n1️⃣1️⃣  测试登录")
    print("   访问: https://your-app.onrender.com/login")
    print("\n   测试账号：")
    for username, password in TEST_PASSWORDS.items():
        print(f"   用户名: {username:15} 密码: {password}")


def check_render_path_format():
    """检查路径格式常见错误"""
    print("\n" + "=" * 70)
    print("常见错误检查")
    print("=" * 70)
    
    print("\n❌ 错误的路径格式：")
    print("   /backend/user_management/users.json    (开头不要加 /)")
    print("   ./backend/user_management/users.json   (开头不要加 ./)")
    print("   backend\\user_management\\users.json   (不要用反斜杠)")
    print("   Backend/User_Management/Users.json     (注意大小写)")
    
    print("\n✅ 正确的路径格式：")
    print("   backend/user_management/users.json")
    
    print("\n💡 提示：")
    print("   1. 如果之前上传过，必须先删除旧的再添加新的")
    print("   2. 每次修改 Secret Files 都会触发重新部署")
    print("   3. 部署完成后才能测试登录")
    print("   4. 查看 Render 日志确认文件是否加载成功")


def main():
    """主函数"""
    print("\n" + "=" * 70)
    print("🔍 Render 登录问题诊断工具")
    print("=" * 70)
    
    # 步骤 1: 检查文件
    if not check_file_exists():
        print("\n❌ 文件不存在，请先创建 users.json 文件")
        return
    
    # 步骤 2: 验证格式
    users_data, is_deploy_format = validate_json_format()
    if users_data is None:
        print("\n❌ 文件格式错误，无法继续")
        return
    
    # 步骤 3: 测试密码
    test_results = test_password_hashes(users_data)
    
    # 步骤 4: 生成新文件（可选）
    new_users = generate_fresh_users()
    if new_users:
        users_data = new_users
    
    # 步骤 5: 显示上传步骤
    show_render_upload_steps(users_data)
    
    # 常见错误检查
    check_render_path_format()
    
    print("\n" + "=" * 70)
    print("✅ 诊断完成")
    print("=" * 70)
    print("\n💡 下一步：")
    print("   1. 按照上面的步骤上传到 Render")
    print("   2. 等待部署完成")
    print("   3. 使用测试账号登录")
    print("   4. 如果还是不行，查看 Render 日志")
    print("\n")


if __name__ == '__main__':
    main()
