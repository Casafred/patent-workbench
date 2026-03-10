"""
EPO OPS API 测试脚本
使用方法: python test_epo_api.py
"""

import requests
import json
import os
from datetime import datetime

BASE_URL = "http://localhost:5001"

def test_epo_api(consumer_key, consumer_secret):
    os.environ['EPO_OPS_KEY'] = consumer_key
    os.environ['EPO_OPS_SECRET'] = consumer_secret
    
    print("\n" + "="*60)
    print("EPO OPS API 测试")
    print("="*60)
    
    print("\n[1] 测试配额查询...")
    try:
        response = requests.get(f"{BASE_URL}/api/epo/quota")
        data = response.json()
        print(f"状态码: {response.status_code}")
        print(f"响应: {json.dumps(data, indent=2, ensure_ascii=False)}")
    except Exception as e:
        print(f"错误: {e}")
    
    print("\n[2] 测试CQL帮助...")
    try:
        response = requests.get(f"{BASE_URL}/api/epo/cql-help")
        data = response.json()
        print(f"状态码: {response.status_code}")
        if data.get('success'):
            print("CQL帮助加载成功")
            print(f"字段数量: {len(data.get('help', {}).get('fields', []))}")
        else:
            print(f"响应: {json.dumps(data, indent=2, ensure_ascii=False)}")
    except Exception as e:
        print(f"错误: {e}")
    
    print("\n[3] 测试专利检索 (ta=AI)...")
    try:
        response = requests.post(
            f"{BASE_URL}/api/epo/search",
            json={
                "query": "ta=artificial intelligence",
                "range_start": 1,
                "range_end": 5
            }
        )
        data = response.json()
        print(f"状态码: {response.status_code}")
        if data.get('success'):
            print(f"检索成功! 找到 {data.get('total_results', 0)} 条结果")
            results = data.get('results', [])
            if results:
                print(f"返回前 {len(results)} 条:")
                for i, r in enumerate(results[:3], 1):
                    print(f"  {i}. {r.get('patent_number', 'N/A')}: {r.get('title', '无标题')[:50]}...")
        else:
            print(f"错误: {data.get('error', '未知错误')}")
    except Exception as e:
        print(f"错误: {e}")
    
    print("\n[4] 测试专利详情...")
    try:
        test_patent = "EP1234567"
        response = requests.get(f"{BASE_URL}/api/epo/detail/{test_patent}?endpoint=biblio")
        data = response.json()
        print(f"状态码: {response.status_code}")
        if data.get('success'):
            detail = data.get('detail', {})
            print(f"专利号: {detail.get('patent_number', 'N/A')}")
            print(f"标题: {detail.get('title', 'N/A')[:50]}...")
        else:
            print(f"响应: {data.get('error', '未知错误')}")
    except Exception as e:
        print(f"错误: {e}")
    
    print("\n" + "="*60)
    print("测试完成")
    print("="*60)

if __name__ == "__main__":
    print("\n请输入EPO OPS凭证:")
    key = input("Consumer Key: ").strip()
    secret = input("Consumer Secret: ").strip()
    
    if not key or not secret:
        print("错误: 请提供有效的凭证")
        exit(1)
    
    test_epo_api(key, secret)
