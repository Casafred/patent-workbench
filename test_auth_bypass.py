"""
测试认证绕过功能
"""
import requests
import json

# 测试URL
url = "http://localhost:5001/api/drawing-marker/process"

# 测试数据
test_data = {
    "drawings": [
        {
            "name": "test.png",
            "type": "image/png",
            "size": 1024,
            "data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }
    ],
    "specification": "1电动工具、2外壳、3后盖"
}

print("=" * 60)
print("测试认证绕过功能")
print("=" * 60)
print(f"\n请求URL: {url}")
print(f"请求数据: {json.dumps(test_data, ensure_ascii=False, indent=2)}")
print("\n发送请求...")

try:
    response = requests.post(url, json=test_data, timeout=10)
    print(f"\n响应状态码: {response.status_code}")
    print(f"响应内容: {response.text}")
    
    if response.status_code == 200:
        print("\n✓ 成功！认证绕过工作正常")
    elif response.status_code == 401:
        print("\n✗ 失败！仍然需要认证")
    else:
        print(f"\n? 未知状态: {response.status_code}")
        
except Exception as e:
    print(f"\n✗ 请求失败: {str(e)}")
    print("\n请确保应用正在运行: python run_app.py")

print("\n" + "=" * 60)
