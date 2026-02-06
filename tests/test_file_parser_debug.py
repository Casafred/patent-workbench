"""
Debug script to test File Parser API directly.
Run this to see the actual error from ZhipuAI API.

Usage:
    python test_file_parser_debug.py
    
The script will prompt you for the API key if not set in environment.
"""

import os
import sys
import requests

print("=" * 60)
print("ZhipuAI File Parser API 诊断工具")
print("=" * 60)

# Get API key from environment or prompt
api_key = os.environ.get('ZHIPUAI_API_KEY')
if not api_key:
    print("\n⚠️  环境变量中未找到 ZHIPUAI_API_KEY")
    api_key = input("请输入您的 ZhipuAI API Key: ").strip()

if not api_key:
    print("❌ 未提供 API key")
    sys.exit(1)

print(f"\n✅ 使用 API key: {api_key[:10]}...")

# Test file path - use this script itself as test file
test_file = __file__

print(f"✅ 测试文件: {test_file} ({os.path.getsize(test_file)} bytes)")

# Prepare request
url = "https://open.bigmodel.cn/api/paas/v4/files/parser/create"
headers = {"Authorization": f"Bearer {api_key}"}

print("\n" + "=" * 60)
print("开始测试...")
print("=" * 60)

try:
    with open(test_file, 'rb') as f:
        files = {
            'file': (os.path.basename(test_file), f, 'text/plain')
        }
        data = {
            'tool_type': 'lite',
            'file_type': 'TXT'
        }
        
        print(f"\n📤 发送请求到: {url}")
        print(f"   Tool Type: {data['tool_type']}")
        print(f"   File Type: {data['file_type']}")
        print(f"   File Name: {os.path.basename(test_file)}")
        
        response = requests.post(url, headers=headers, files=files, data=data, timeout=30)
        
        print(f"\n📥 响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"\n✅ 成功！")
            print(f"   Response: {result}")
            
            if result.get('success'):
                print(f"\n✅ 任务创建成功！")
                print(f"   Task ID: {result.get('task_id')}")
                print(f"   Message: {result.get('message')}")
            else:
                print(f"\n❌ API 返回 success=false")
                print(f"   Message: {result.get('message')}")
        else:
            print(f"\n❌ 请求失败: HTTP {response.status_code}")
            print(f"\n响应内容:")
            try:
                error_data = response.json()
                print(f"   {error_data}")
            except:
                print(f"   {response.text}")
                
except requests.Timeout:
    print(f"\n❌ 请求超时（30秒）")
    print(f"   可能原因：")
    print(f"   - 网络连接问题")
    print(f"   - ZhipuAI 服务响应慢")
except requests.ConnectionError as e:
    print(f"\n❌ 连接错误: {e}")
    print(f"   可能原因：")
    print(f"   - 无法访问 open.bigmodel.cn")
    print(f"   - 网络防火墙阻止")
    print(f"   - DNS 解析失败")
except requests.RequestException as e:
    print(f"\n❌ 请求失败: {e}")
    if hasattr(e, 'response') and e.response is not None:
        print(f"\n响应详情:")
        print(f"   状态码: {e.response.status_code}")
        try:
            print(f"   内容: {e.response.json()}")
        except:
            print(f"   内容: {e.response.text}")
except Exception as e:
    print(f"\n❌ 未知错误: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("诊断完成")
print("=" * 60)
