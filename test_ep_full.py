"""
测试 EP4653706A2 专利的完整信息获取
"""
import os
import sys

print("=" * 70)
print("测试 EP4653706A2 专利完整信息")
print("=" * 70)

consumer_key = os.getenv('EPO_OPS_KEY', '')
consumer_secret = os.getenv('EPO_OPS_SECRET', '')

if not consumer_key or not consumer_secret:
    print("\n环境变量未设置，请手动输入凭证:")
    consumer_key = input("请输入 EPO_OPS_KEY: ").strip()
    consumer_secret = input("请输入 EPO_OPS_SECRET: ").strip()
    
    os.environ['EPO_OPS_KEY'] = consumer_key
    os.environ['EPO_OPS_SECRET'] = consumer_secret

print(f"\n[1] 凭证已获取")

import epo_ops
from epo_ops.models import Docdb, Epodoc

client = epo_ops.Client(key=consumer_key, secret=consumer_secret, accept_type='json')
print("   客户端创建成功")

patent_number = 'EP4653706A2'

import re
cleaned = patent_number.strip().replace('.', '')
match = re.match(r'^([A-Z]{2})(\d+)([A-Z]\d?)?$', cleaned, re.IGNORECASE)

if match:
    country = match.group(1).upper()
    doc_num = match.group(2)
    kind = match.group(3) or ''
else:
    parts = patent_number.replace('.', ' ').split()
    country = parts[0] if len(parts) > 0 else 'EP'
    doc_num = parts[1] if len(parts) > 1 else '4653706'
    kind = parts[2] if len(parts) > 2 else 'A2'

print(f"\n[2] 解析专利号: {patent_number}")
print(f"   country: {country}, doc_num: {doc_num}, kind: {kind}")

# 测试搜索
print(f"\n[3] 测试搜索...")
try:
    response = client.published_data_search(
        cql=f'pn={patent_number}',
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
    else:
        print(f"   错误: {response.text[:300]}")
except Exception as e:
    print(f"   异常: {e}")

# 测试书目数据
print(f"\n[4] 测试获取书目数据 (Docdb)...")
try:
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
            print("   ✅ 书目数据获取成功")
        else:
            print("   ❌ 未找到 exchange-document")
    else:
        print(f"   ❌ 错误: {response.text[:300]}")
except Exception as e:
    print(f"   ❌ 异常: {e}")
    import traceback
    traceback.print_exc()

# 测试权利要求
print(f"\n[5] 测试获取权利要求...")
try:
    input_model = Docdb(doc_num, country, kind)
    
    response = client.published_data(
        reference_type='publication',
        input=input_model,
        endpoint='claims'
    )
    print(f"   状态码: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        world_data = data.get('ops:world-patent-data', {})
        print(f"   world-patent-data keys: {list(world_data.keys())}")
        
        fulltext_docs = world_data.get('ftxt:fulltext-documents', {})
        if not fulltext_docs:
            fulltext_docs = world_data.get('fulltext-documents', {})
        
        print(f"   fulltext-documents keys: {list(fulltext_docs.keys()) if fulltext_docs else 'None'}")
        
        if fulltext_docs:
            fulltext_doc = fulltext_docs.get('ftxt:fulltext-document', {})
            if not fulltext_doc:
                fulltext_doc = fulltext_docs.get('fulltext-document', {})
            
            if isinstance(fulltext_doc, list) and fulltext_doc:
                fulltext_doc = fulltext_doc[0]
            
            if fulltext_doc:
                claims_data = fulltext_doc.get('claims', {})
                print(f"   claims keys: {list(claims_data.keys()) if claims_data else 'None'}")
                
                claim_obj = claims_data.get('claim', {})
                claim_texts = claim_obj.get('claim-text', [])
                
                if not isinstance(claim_texts, list):
                    claim_texts = [claim_texts]
                
                print(f"   权利要求数量: {len(claim_texts)}")
                if claim_texts:
                    print("   ✅ 权利要求获取成功")
            else:
                print("   ❌ 未找到 fulltext-document")
        else:
            print("   ❌ 未找到 fulltext-documents")
    else:
        print(f"   ❌ 错误: {response.text[:300]}")
except Exception as e:
    print(f"   ❌ 异常: {e}")

# 测试说明书
print(f"\n[6] 测试获取说明书...")
try:
    input_model = Docdb(doc_num, country, kind)
    
    response = client.published_data(
        reference_type='publication',
        input=input_model,
        endpoint='description'
    )
    print(f"   状态码: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        world_data = data.get('ops:world-patent-data', {})
        print(f"   world-patent-data keys: {list(world_data.keys())}")
        
        desc_data = world_data.get('description', {})
        if desc_data:
            p_list = desc_data.get('p', [])
            if isinstance(p_list, dict):
                p_list = [p_list]
            print(f"   段落数量: {len(p_list)}")
            print("   ✅ 说明书获取成功")
        else:
            print("   ❌ 未找到 description")
    else:
        print(f"   ❌ 错误: {response.text[:300]}")
except Exception as e:
    print(f"   ❌ 异常: {e}")

# 测试图片信息
print(f"\n[7] 测试获取图片信息...")
try:
    # 图片需要使用特定的 API
    # GET /published-data/publication/docdb/{patent_number}/images
    
    import requests
    
    # 先获取 token
    auth = (consumer_key, consumer_secret)
    token_response = requests.post("https://ops.epo.org/3.2/auth/accesstoken", auth=auth, data={'grant_type': 'client_credentials'})
    
    if token_response.status_code == 200:
        token = token_response.json()['access_token']
        
        # 获取图片信息
        url = f"https://ops.epo.org/3.2/rest-services/published-data/publication/docdb/{country}.{doc_num}.{kind}/images"
        headers = {
            'Authorization': f'Bearer {token}',
            'Accept': 'application/json'
        }
        
        response = requests.get(url, headers=headers)
        print(f"   状态码: {response.status_code}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                world_data = data.get('ops:world-patent-data', {})
                doc_inquiry = world_data.get('ops:document-inquiry', {})
                inquiry_result = doc_inquiry.get('ops:inquiry-result', {})
                
                doc_instances = inquiry_result.get('ops:document-instance', [])
                if not isinstance(doc_instances, list):
                    doc_instances = [doc_instances] if doc_instances else []
                
                print(f"   文档实例数量: {len(doc_instances)}")
                
                for doc_inst in doc_instances:
                    if isinstance(doc_inst, dict):
                        desc = doc_inst.get('@desc', '')
                        link = doc_inst.get('@link', '')
                        if desc or link:
                            print(f"   - desc: {desc}, link: {link[:50]}...")
                
                if doc_instances:
                    print("   ✅ 图片信息获取成功")
            except Exception as e:
                print(f"   解析 JSON 失败: {e}")
                print(f"   响应内容: {response.text[:500]}")
        else:
            print(f"   ❌ 错误: {response.text[:300]}")
    else:
        print(f"   ❌ 获取 token 失败: {token_response.status_code}")
except Exception as e:
    print(f"   ❌ 异常: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 70)
print("测试完成")
print("=" * 70)
