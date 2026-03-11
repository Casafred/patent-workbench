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
                world_data = data.get('ops:world-patent-data', {})

                print(f"\n搜索响应数据结构:")
                print(f"  top-level keys: {list(world_data.keys())}")

                search_result = world_data.get('ops:biblio-search', {}).get('ops:search-result', {})
                print(f"  ops:search-result type: {type(search_result)}")
                print(f"  ops:search-result keys: {list(search_result.keys()) if isinstance(search_result, dict) else 'N/A'}")

                # 搜索结果是 ops:publication-reference，不是 exchange-document
                pub_refs = search_result.get('ops:publication-reference', [])
                if isinstance(pub_refs, dict):
                    pub_refs = [pub_refs]
                
                print(f"  找到 {len(pub_refs)} 条结果")

                total = world_data.get('ops:biblio-search', {}).get('@total-result-count', '0')
                print(f"  总结果数: {total}")

                for i, pub_ref in enumerate(pub_refs[:3], 1):
                    doc_ids = pub_ref.get('document-id', [])
                    if isinstance(doc_ids, dict):
                        doc_ids = [doc_ids]
                    
                    patent_num = ''
                    for doc_id in doc_ids:
                        doc_type = doc_id.get('@document-id-type', '')
                        if doc_type == 'epodoc':
                            doc_num = doc_id.get('doc-number', {})
                            if isinstance(doc_num, dict):
                                patent_num = doc_num.get('$', '')
                            else:
                                patent_num = str(doc_num)
                            break
                    
                    if not patent_num:
                        country = doc_ids[0].get('country', {}) if doc_ids else {}
                        country = country.get('$', '') if isinstance(country, dict) else ''
                        doc_num = doc_ids[0].get('doc-number', {}) if doc_ids else {}
                        doc_num = doc_num.get('$', '') if isinstance(doc_num, dict) else str(doc_num)
                        patent_num = f"{country}{doc_num}"

                    print(f"    {i}. {patent_num}")

            except Exception as e:
                import traceback
                print(f"  响应解析失败: {e}")
                print(f"  原始响应前500字符: {search_response.text[:500]}")
                traceback.print_exc()
        else:
            print(f"响应: {search_response.text[:200]}")
    except Exception as e:
        print(f"错误: {e}")
        import traceback
        traceback.print_exc()

    print("\n[4] 测试专利详情 (EP1000000)...")
    try:
        detail_url = f"{base_url}/rest-services/published-data/publication/epodoc/EP1000000/biblio"
        detail_response = requests.get(detail_url, headers=headers)

        print(f"状态码: {detail_response.status_code}")
        if detail_response.status_code == 200:
            print("✓ 详情获取成功!")
            try:
                data = detail_response.json()
                world_data = data.get('ops:world-patent-data', {})

                print(f"\n详情响应数据结构:")
                print(f"  top-level keys: {list(world_data.keys())}")

                exchange_docs = world_data.get('exchange-documents', {}).get('exchange-document', [])
                if isinstance(exchange_docs, dict):
                    exchange_docs = [exchange_docs]
                
                print(f"  找到 {len(exchange_docs)} 条")

                if exchange_docs:
                    doc = exchange_docs[0]
                    biblio = doc.get('bibliographic-data', {})
                    title_data = biblio.get('invention-title', {})
                    
                    if isinstance(title_data, list):
                        title = title_data[0].get('$', '无标题') if title_data else '无标题'
                    elif isinstance(title_data, dict):
                        title = title_data.get('$', '无标题')
                    else:
                        title = str(title_data) if title_data else '无标题'

                    print(f"  标题: {title[:60]}...")

            except Exception as e:
                import traceback
                print(f"  响应解析失败: {e}")
                traceback.print_exc()
        else:
            print(f"响应: {detail_response.text[:200]}")
    except Exception as e:
        print(f"错误: {e}")
        import traceback
        traceback.print_exc()

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

    test_epo_ops_direct(key, secret)
