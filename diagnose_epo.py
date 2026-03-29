"""
完整诊断 EPO OPS 集成
"""
import os
import sys
import traceback

print("=" * 70)
print("EPO OPS 完整诊断")
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

print(f"\n[1] 凭证已获取并设置到环境变量")

print("\n[2] 测试原始 python-epo-ops-client 库...")
import epo_ops
from epo_ops.models import Docdb, Epodoc

client = epo_ops.Client(key=consumer_key, secret=consumer_secret, accept_type='json')
print("   客户端创建成功")

print("\n[3] 测试搜索...")
try:
    response = client.published_data_search(
        cql='ta=machine learning',
        range_begin=1,
        range_end=2
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
        
        test_patent = None
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
                        
                        test_patent = f"{country_val}.{doc_num_val}.{kind_val}"
                        print(f"   测试专利: {test_patent}")
                        break
                if test_patent:
                    break
            if test_patent:
                break
        
        if test_patent:
            print(f"\n[4] 测试获取书目数据 (Docdb)...")
            parts = test_patent.split('.')
            country = parts[0]
            doc_num = parts[1]
            kind = parts[2] if len(parts) > 2 else ''
            
            input_model = Docdb(doc_num, country, kind)
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
                    else:
                        title = str(title_data)
                    
                    print(f"   标题: {title[:50]}..." if title else "   标题: (未找到)")
                    print("   ✅ 书目数据获取成功")
            else:
                print(f"   ❌ 错误: {response.text[:300]}")
                
except Exception as e:
    print(f"   ❌ 异常: {e}")
    traceback.print_exc()

print("\n[5] 测试适配层...")
try:
    from backend.services.epo_adapter import get_epo_adapter, EPOAdapter, _epo_adapter
    
    import backend.services.epo_adapter as epo_adapter_module
    epo_adapter_module._epo_adapter = None
    
    adapter = get_epo_adapter()
    print(f"   适配器配置状态: {adapter.is_configured()}")
    
    if adapter.is_configured():
        results, total, meta = adapter.search('ta=machine learning', 1, 2)
        print(f"   搜索结果: {len(results)} 条, 总数: {total}")
        
        if results:
            print(f"   第一条: {results[0]}")
            
            patent_number = results[0].get('patent_number', '')
            if patent_number:
                print(f"\n[6] 测试获取详情...")
                biblio, biblio_meta = adapter.get_biblio(patent_number, 'docdb')
                print(f"   状态码: {biblio_meta.get('status_code')}")
                
                if biblio:
                    print(f"   标题: {biblio.get('title', '')[:50]}...")
                    print("   ✅ 详情获取成功")
                else:
                    print("   ❌ 详情获取失败")
    else:
        print("   ⚠️ 适配器未配置")
        
except Exception as e:
    print(f"   ❌ 异常: {e}")
    traceback.print_exc()

print("\n[7] 测试服务层...")
try:
    from backend.services.epo_ops_service import get_epo_ops_client, EPOOPSClient
    
    import backend.services.epo_ops_service as epo_service_module
    epo_service_module.epo_ops_client = None
    
    service = get_epo_ops_client()
    print(f"   服务配置状态: {service.is_configured()}")
    
    if service.is_configured():
        result = service.search('ta=machine learning', 1, 2, quick_mode=True)
        print(f"   搜索结果: {len(result['results'])} 条, 总数: {result['total_results']}")
        
        if result['results']:
            first = result['results'][0]
            print(f"   第一条专利号: {first.patent_number}")
            print("   ✅ 服务层搜索成功")
    else:
        print("   ⚠️ 服务未配置")
        
except Exception as e:
    print(f"   ❌ 异常: {e}")
    traceback.print_exc()

print("\n" + "=" * 70)
print("诊断完成")
print("=" * 70)
