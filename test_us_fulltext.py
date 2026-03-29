"""
测试 US 专利全文数据
"""
import os
import sys

consumer_key = os.getenv('EPO_OPS_KEY', '')
consumer_secret = os.getenv('EPO_OPS_SECRET', '')

if not consumer_key or not consumer_secret:
    print("\n环境变量未设置，请手动输入凭证:")
    consumer_key = input("请输入 EPO_OPS_KEY: ").strip()
    consumer_secret = input("请输入 EPO_OPS_SECRET: ").strip()
    
    os.environ['EPO_OPS_KEY'] = consumer_key
    os.environ['EPO_OPS_SECRET'] = consumer_secret

import epo_ops
from epo_ops.models import Docdb

client = epo_ops.Client(key=consumer_key, secret=consumer_secret, accept_type='json')

# 测试 US 专利
us_patents = [
    ('US12410912B2', '12410912', 'US', 'B2'),
    ('US2024410564A1', '2024410564', 'US', 'A1'),
]

print("=" * 70)
print("测试 US 专利全文数据")
print("=" * 70)

for patent_number, doc_num, country, kind in us_patents:
    print(f"\n[测试] {patent_number}")
    
    # 测试书目数据
    print(f"  1. 书目数据...")
    try:
        response = client.published_data(
            reference_type='publication',
            input=Docdb(doc_num, country, kind),
            endpoint='biblio'
        )
        print(f"     状态码: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            world_data = data.get('ops:world-patent-data', {})
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
                print(f"     标题: {title[:50]}...")
                print(f"     ✅ 书目数据可用")
    except Exception as e:
        print(f"     ❌ 错误: {e}")
    
    # 测试权利要求
    print(f"  2. 权利要求...")
    try:
        response = client.published_data(
            reference_type='publication',
            input=Docdb(doc_num, country, kind),
            endpoint='claims'
        )
        print(f"     状态码: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            world_data = data.get('ops:world-patent-data', {})
            print(f"     keys: {list(world_data.keys())}")
            
            fulltext_docs = world_data.get('ftxt:fulltext-documents', {})
            if fulltext_docs:
                print(f"     ✅ 权利要求可用")
            else:
                print(f"     ❌ 无权利要求数据")
        else:
            print(f"     ❌ 错误: {response.text[:200]}")
    except Exception as e:
        print(f"     ❌ 错误: {e}")
    
    # 测试说明书
    print(f"  3. 说明书...")
    try:
        response = client.published_data(
            reference_type='publication',
            input=Docdb(doc_num, country, kind),
            endpoint='description'
        )
        print(f"     状态码: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            world_data = data.get('ops:world-patent-data', {})
            print(f"     keys: {list(world_data.keys())}")
            
            desc_data = world_data.get('description', {})
            if desc_data:
                print(f"     ✅ 说明书可用")
            else:
                print(f"     ❌ 无说明书数据")
        else:
            print(f"     ❌ 错误: {response.text[:200]}")
    except Exception as e:
        print(f"     ❌ 错误: {e}")
    
    # 测试图片
    print(f"  4. 图片信息...")
    try:
        response = client.published_data(
            reference_type='publication',
            input=Docdb(doc_num, country, kind),
            endpoint='images'
        )
        print(f"     状态码: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            world_data = data.get('ops:world-patent-data', {})
            doc_inquiry = world_data.get('ops:document-inquiry', {})
            inquiry_result = doc_inquiry.get('ops:inquiry-result', {})
            doc_instances = inquiry_result.get('ops:document-instance', [])
            if not isinstance(doc_instances, list):
                doc_instances = [doc_instances] if doc_instances else []
            print(f"     文档实例数量: {len(doc_instances)}")
            if doc_instances:
                for doc_inst in doc_instances:
                    if isinstance(doc_inst, dict):
                        desc = doc_inst.get('@desc', '')
                        link = doc_inst.get('@link', '')
                        print(f"     - {desc}: {link[:50]}..." if link else f"     - {desc}")
                print(f"     ✅ 图片信息可用")
            else:
                print(f"     ❌ 无图片信息")
        else:
            print(f"     ❌ 错误: {response.text[:200]}")
    except Exception as e:
        print(f"     ❌ 错误: {e}")

print("\n" + "=" * 70)
print("测试完成")
print("=" * 70)
