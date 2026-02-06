#!/usr/bin/env python3
"""验证 users.json 文件格式"""
import json
import sys

def validate_json_file(filepath):
    """验证 JSON 文件"""
    print(f"=== 验证文件: {filepath} ===\n")
    
    try:
        # 读取文件
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        print("1. 文件读取成功")
        print(f"   文件大小: {len(content)} 字节\n")
        
        # 检查是否有重复的键（手动检查）
        print("2. 检查重复键...")
        lines = content.split('\n')
        keys_found = []
        duplicate_keys = []
        
        for i, line in enumerate(lines, 1):
            line = line.strip()
            if line.startswith('"') and '":' in line:
                # 提取键名
                key = line.split('":')[0].strip('"').strip()
                if key:
                    if key in keys_found:
                        duplicate_keys.append((key, i))
                        print(f"   ⚠️  发现重复键: '{key}' 在第 {i} 行")
                    else:
                        keys_found.append(key)
        
        if not duplicate_keys:
            print("   ✓ 没有发现重复键\n")
        else:
            print(f"   ✗ 发现 {len(duplicate_keys)} 个重复键\n")
            return False
        
        # 解析 JSON
        print("3. 解析 JSON...")
        try:
            data = json.loads(content)
            print("   ✓ JSON 格式有效\n")
        except json.JSONDecodeError as e:
            print(f"   ✗ JSON 解析失败: {e}\n")
            return False
        
        # 检查数据结构
        print("4. 检查数据结构...")
        
        # 检测格式
        if isinstance(data, dict):
            if 'users' in data and 'metadata' in data:
                print("   格式: 完整版（含元数据）")
                users = data['users']
                metadata = data.get('metadata', {})
                print(f"   用户数: {len(users)}")
                print(f"   元数据数: {len(metadata)}")
            else:
                print("   格式: 部署版（纯净格式）")
                users = data
                print(f"   用户数: {len(users)}")
        else:
            print("   ✗ 数据结构错误：根对象必须是字典")
            return False
        
        print()
        
        # 显示用户列表
        print("5. 用户列表:")
        for username, password_hash in users.items():
            hash_preview = password_hash[:50] + "..." if len(password_hash) > 50 else password_hash
            print(f"   - {username}: {hash_preview}")
        
        print("\n=== 验证通过 ===")
        return True
        
    except FileNotFoundError:
        print(f"✗ 文件不存在: {filepath}")
        return False
    except Exception as e:
        print(f"✗ 验证失败: {e}")
        return False

if __name__ == '__main__':
    filepath = sys.argv[1] if len(sys.argv) > 1 else 'backend/user_management/users.json'
    
    success = validate_json_file(filepath)
    
    if success:
        print("\n✅ 文件格式正确，可以上传到 Render")
    else:
        print("\n❌ 文件格式有问题，请修复后再上传")
        sys.exit(1)
