"""
测试 python-epo-ops-client 库的使用 - 使用真实专利号
"""
import os
import epo_ops
from epo_ops.models import Epodoc, Docdb

print("=" * 60)
print("测试 python-epo-ops-client 库")
print("=" * 60)

consumer_key = os.getenv('EPO_OPS_KEY', '')
consumer_secret = os.getenv('EPO_OPS_SECRET', '')

if not consumer_key or not consumer_secret:
    print("\n环境变量未设置，请手动输入凭证:")
    consumer_key = input("请输入 EPO_OPS_KEY: ").strip()
    consumer_secret = input("请输入 EPO_OPS_SECRET: ").strip()

if not consumer_key or not consumer_secret:
    print("\n错误: 凭证不能为空")
    exit(1)

print(f"\n1. 凭证已获取")

print("\n2. 创建客户端 (accept_type='json')...")
client = epo_ops.Client(key=consumer_key, secret=consumer_secret, accept_type='json')
print("   客户端创建成功")

print("\n3. 测试搜索 (published_data_search)...")
print("   查询: ta=machine learning")
try:
    response = client.published_data_search(
        cql='ta=machine learning',
        range_begin=1,
        range_end=3
    )
    print(f"   状态码: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        world_data = data.get('ops:world-patent-data', {})
        search_data = world_data.get('ops:biblio-search', {})
        total_count = search_data.get('@total-result-count', 0)
        print(f"   总结果数: {total_count}")
        
        search_results = search_data.get('ops:search-result', [])
        
        if isinstance(search_results, dict):
            search_results = [search_results]
        
        patent_numbers = []
        for result in search_results:
            pub_refs = result.get('ops:publication-reference', [])
            if isinstance(pub_refs, dict):
                pub_refs = [pub_refs]
            
            for pub_ref in pub_refs:
                doc_ids = pub_ref.get('document-id', [])
                if isinstance(doc_ids, dict):
                    doc_ids = [doc_ids]
                
                for doc_id in doc_ids:
                    doc_type = doc_id.get('@document-id-type', '')
                    if doc_type == 'docdb':
                        country = doc_id.get('country', {})
                        doc_num = doc_id.get('doc-number', {})
                        kind = doc_id.get('kind', {})
                        
                        country_val = country.get('$', country) if isinstance(country, dict) else country
                        doc_num_val = doc_num.get('$', doc_num) if isinstance(doc_num, dict) else doc_num
                        kind_val = kind.get('$', kind) if isinstance(kind, dict) else kind
                        
                        patent_number = f"{country_val}.{doc_num_val}.{kind_val}"
                        patent_numbers.append(patent_number)
                        print(f"   找到专利: {patent_number}")
        
        if patent_numbers:
            print(f"\n4. 测试获取书目数据 (published_data)...")
            test_patent = patent_numbers[0]
            print(f"   专利号: {test_patent}")
            
            parts = test_patent.split('.')
            country = parts[0]
            doc_num = parts[1]
            kind = parts[2] if len(parts) > 2 else ''
            
            print(f"   解析: country={country}, doc_num={doc_num}, kind={kind}")
            
            try:
                input_model = Docdb(doc_num, country, kind)
                print(f"   Docdb input: {input_model.as_api_input()}")
                
                response = client.published_data(
                    reference_type='publication',
                    input=input_model,
                    endpoint='biblio'
                )
                print(f"   状态码: {response.status_code}")
                print(f"   响应长度: {len(response.content)} bytes")
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"   JSON 解析成功")
                    world_data = data.get('ops:world-patent-data', {})
                    print(f"   world-patent-data keys: {list(world_data.keys())}")
                else:
                    print(f"   错误响应: {response.text[:500]}")
                    
            except Exception as e:
                print(f"   异常: {e}")
                import traceback
                traceback.print_exc()
            
            print(f"\n5. 测试使用 Epodoc 格式...")
            epodoc_number = f"{country}{doc_num}{kind}"
            print(f"   Epodoc 格式: {epodoc_number}")
            
            try:
                input_model = Epodoc(epodoc_number)
                print(f"   Epodoc input: {input_model.as_api_input()}")
                
                response = client.published_data(
                    reference_type='publication',
                    input=input_model,
                    endpoint='biblio'
                )
                print(f"   状态码: {response.status_code}")
                print(f"   响应长度: {len(response.content)} bytes")
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"   JSON 解析成功")
                    world_data = data.get('ops:world-patent-data', {})
                    print(f"   world-patent-data keys: {list(world_data.keys())}")
                else:
                    print(f"   错误响应: {response.text[:500]}")
                    
            except Exception as e:
                print(f"   异常: {e}")
                import traceback
                traceback.print_exc()
                
    else:
        print(f"   错误: {response.text[:500]}")
        
except Exception as e:
    print(f"   异常: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("测试完成")
print("=" * 60)
