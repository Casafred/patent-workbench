"""
EPO OPS API 直接测试脚本
直接调用EPO OPS API，不通过Flask后端
"""

import requests
import json
from datetime import datetime, timedelta

def test_epo_ops_direct(consumer_key, consumer_secret):
    print("\n" + "="*60)
    print("EPO OPS API 直接测试")
    print("="*60)
    
    base_url = "https://ops.epo.org/3.2"
    
    print("\n[1] 获取Access Token...")
    try:
        token_url = "https://ops.epo.org/3.2/auth/accesstoken"
        token_response = requests.post(
            token_url,
            data={"grant_type": "client_credentials"},
            auth=(consumer_key, consumer_secret),
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if token_response.status_code == 200:
            token_data = token_response.json()
            access_token = token_data.get("access_token")
            print(f"✓ Token获取成功!")
            print(f"  过期时间: {token_data.get('expires_in', 'N/A')} 秒")
        else:
            print(f"✗ Token获取失败: {token_response.status_code}")
            print(f"  响应: {token_response.text}")
            return
    except Exception as e:
        print(f"✗ 错误: {e}")
        return
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json"
    }
    
    print("\n[2] 测试配额查询 (Data Usage API)...")
    try:
        today = datetime.now()
        week_start = today - timedelta(days=today.weekday())
        date_from = week_start.strftime('%d/%m/%Y')
        date_to = today.strftime('%d/%m/%Y')
        
        usage_url = f"{base_url}/developers/me/stats/usage"
        usage_response = requests.get(
            usage_url,
            headers=headers,
            params={"timeRange": f"{date_from}~{date_to}"}
        )
        
        print(f"状态码: {usage_response.status_code}")
        if usage_response.status_code == 200:
            usage_data = usage_response.json()
            print("✓ 配额查询成功!")
            
            environments = usage_data.get('environments', [])
            for env in environments:
                dimensions = env.get('dimensions', [])
                for dim in dimensions:
                    metrics = dim.get('metrics', [])
                    for metric in metrics:
                        name = metric.get('name', '')
                        if name == 'total_response_size':
                            values = metric.get('values', [])
                            total_bytes = sum(float(v.get('value', 0)) for v in values)
                            print(f"  本周已用: {total_bytes / (1024*1024):.2f} MB")
                        elif name == 'message_count':
                            values = metric.get('values', [])
                            total_requests = sum(int(float(v.get('value', 0))) for v in values)
                            print(f"  请求次数: {total_requests}")
        else:
            print(f"响应: {usage_response.text[:200]}")
    except Exception as e:
        print(f"错误: {e}")
    
    print("\n[3] 测试专利检索 (ta=artificial intelligence)...")
    try:
        search_url = f"{base_url}/rest-services/published-data/search"
        search_response = requests.get(
            search_url,
            headers=headers,
            params={
                "q": "ta=artificial intelligence",
                "Range": "1-5"
            }
        )
        
        print(f"状态码: {search_response.status_code}")
        if search_response.status_code == 200:
            print("✓ 检索成功!")
            
            try:
                data = search_response.json()
                results = data.get('ops:world-patent-data', {}).get('ops:biblio-search', {}).get('ops:search-result', [])
                total = data.get('ops:world-patent-data', {}).get('ops:biblio-search', {}).get('@total-result-count', '0')
                print(f"  找到 {total} 条结果")
                print(f"  返回前 {len(results)} 条:")
                
                for i, result in enumerate(results[:3], 1):
                    doc = result.get('exchange-document', {})
                    biblio = doc.get('bibliographic-data', {})
                    title_data = biblio.get('invention-title', {})
                    if isinstance(title_data, list):
                        title = title_data[0].get('$', '无标题') if title_data else '无标题'
                    else:
                        title = title_data.get('$', '无标题')
                    doc_number = doc.get('@doc-number', 'N/A')
                    print(f"    {i}. {doc_number}: {title[:50]}...")
            except:
                print(f"  响应解析失败，原始响应前200字符: {search_response.text[:200]}")
        else:
            print(f"响应: {search_response.text[:200]}")
    except Exception as e:
        print(f"错误: {e}")
    
    print("\n[4] 测试专利详情 (EP1234567)...")
    try:
        detail_url = f"{base_url}/rest-services/published-data/publication/epodoc/EP1234567/biblio"
        detail_response = requests.get(detail_url, headers=headers)
        
        print(f"状态码: {detail_response.status_code}")
        if detail_response.status_code == 200:
            print("✓ 详情获取成功!")
            try:
                data = detail_response.json()
                doc = data.get('ops:world-patent-data', {}).get('exchange-document', {})
                biblio = doc.get('bibliographic-data', {})
                title_data = biblio.get('invention-title', {})
                if isinstance(title_data, list):
                    title = title_data[0].get('$', '无标题') if title_data else '无标题'
                else:
                    title = title_data.get('$', '无标题')
                print(f"  标题: {title[:60]}...")
            except:
                print(f"  响应解析失败")
        else:
            print(f"响应: {detail_response.text[:200]}")
    except Exception as e:
        print(f"错误: {e}")
    
    print("\n" + "="*60)
    print("测试完成")
    print("="*60)
    print("\n如果以上测试都成功，说明你的EPO OPS凭证有效。")
    print("请将凭证配置到服务器环境变量中：")
    print("  export EPO_OPS_KEY='你的key'")
    print("  export EPO_OPS_SECRET='你的secret'")

if __name__ == "__main__":
    print("\n请输入EPO OPS凭证:")
    key = input("Consumer Key: ").strip()
    secret = input("Consumer Secret: ").strip()
    
    if not key or not secret:
        print("错误: 请提供有效的凭证")
        exit(1)
    
    test_epo_ops_direct(key, secret)
