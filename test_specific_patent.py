"""
测试特定专利号查询
"""
import os
import sys

print("=" * 70)
print("测试特定专利号查询")
print("=" * 70)

consumer_key = os.getenv('EPO_OPS_KEY', '')
consumer_secret = os.getenv('EPO_OPS_SECRET', '')

if not consumer_key or not consumer_secret:
    print("\n环境变量未设置，请手动输入凭证:")
    consumer_key = input("请输入 EPO_OPS_KEY: ").strip()
    consumer_secret = input("请输入 EPO_OPS_SECRET: ").strip()
    
    os.environ['EPO_OPS_KEY'] = consumer_key
    os.environ['EPO_OPS_SECRET'] = consumer_secret

if not consumer_key or not consumer_secret:
    print("\n错误: 凭证不能为空")
    sys.exit(1)

print(f"\n[1] 凭证已获取")

import epo_ops
from epo_ops.models import Docdb, Epodoc

client = epo_ops.Client(key=consumer_key, secret=consumer_secret, accept_type='json')
print("   客户端创建成功")

# 测试查询
test_queries = [
    'pn=US12410912B2',
    'pn=US.12410912.B2',
    'pn=(US12410912B2)',
    'publicationnumber=US12410912B2',
]

for query in test_queries:
    print(f"\n[测试查询] {query}")
    try:
        response = client.published_data_search(
            cql=query,
            range_begin=1,
            range_end=5
        )
        print(f"   状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            world_data = data.get('ops:world-patent-data', {})
            search_data = world_data.get('ops:biblio-search', {})
            total_count = int(search_data.get('@total-result-count', 0))
            print(f"   总结果数: {total_count}")
            
            if total_count > 0:
                print("   ✅ 查询成功!")
                
                # 显示结果
                search_results = search_data.get('ops:search-result', [])
                if isinstance(search_results, dict):
                    search_results = [search_results]
                
                for i, result in enumerate(search_results[:3]):
                    pub_refs = result.get('ops:publication-reference', [])
                    if isinstance(pub_refs, dict):
                        pub_refs = [pub_refs]
                    
                    for pub_ref in pub_refs:
                        doc_ids = pub_ref.get('document-id', [])
                        if isinstance(doc_ids, dict):
                            doc_ids = [doc_ids]
                        
                        for doc_id in doc_ids:
                            doc_type = doc_id.get('@document-id-type', '')
                            country = doc_id.get('country', {})
                            doc_num = doc_id.get('doc-number', {})
                            kind = doc_id.get('kind', {})
                            
                            country_val = country.get('$', country) if isinstance(country, dict) else country
                            doc_num_val = doc_num.get('$', doc_num) if isinstance(doc_num, dict) else doc_num
                            kind_val = kind.get('$', kind) if isinstance(kind, dict) else kind
                            
                            print(f"   结果 {i+1}: {country_val}.{doc_num_val}.{kind_val} ({doc_type})")
        else:
            print(f"   ❌ 查询失败: {response.text[:300]}")
            
    except Exception as e:
        print(f"   ❌ 异常: {e}")

# 直接用 Docdb 获取这个专利
print(f"\n[直接获取专利] US.12410912.B2")
try:
    input_model = Docdb('12410912', 'US', 'B2')
    print(f"   Docdb 输入: {input_model.as_api_input()}")
    
    response = client.published_data(
        reference_type='publication',
        input=input_model,
        endpoint='biblio'
    )
    print(f"   状态码: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        world_data = data.get('ops:world-patent-data', {})
        print(f"   world-patent-data keys: {list(world_data.keys())}")
        
        exchange_docs = world_data.get('exchange-documents', {})
        exchange_doc = exchange_docs.get('exchange-document', {})
        if isinstance(exchange_doc, list) and exchange_doc:
            exchange_doc = exchange_doc[0]
        
        if exchange_doc:
            biblio = exchange_doc.get('bibliographic-data', {})
            title_data = biblio.get('invention-title', {})
            
            if isinstance(title_data, dict):
                title = title_data.get('$', '')
            elif isinstance(title_data, list) and title_data:
                title = title_data[0].get('$', '') if isinstance(title_data[0], dict) else str(title_data[0])
            else:
                title = str(title_data)
            
            print(f"   标题: {title[:60]}..." if title else "   标题: (未找到)")
            print("   ✅ 直接获取成功!")
    else:
        print(f"   ❌ 获取失败: {response.text[:300]}")
        
except Exception as e:
    print(f"   ❌ 异常: {e}")

print("\n" + "=" * 70)
print("测试完成")
print("=" * 70)
