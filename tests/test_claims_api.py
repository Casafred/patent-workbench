#!/usr/bin/env python3
"""
测试权利要求处理API
"""
import requests
import json

# 测试上传
print("测试文件上传...")
with open('test_smartphone.xlsx', 'rb') as f:
    files = {'file': f}
    response = requests.post('http://127.0.0.1:5001/api/claims/upload', files=files)
    print(f"状态码: {response.status_code}")
    print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
