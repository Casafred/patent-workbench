"""
测试 EPO OPS API 的 claims、images 和 priority 数据结构
"""
import os
import sys
import json
import requests
import xml.etree.ElementTree as ET

EPO_OPS_BASE_URL = "https://ops.epo.org/3.2/rest-services"
EPO_TOKEN_URL = "https://ops.epo.org/3.2/auth/accesstoken"

def get_token(key, secret):
    auth = (key, secret)
    data = {'grant_type': 'client_credentials'}
    response = requests.post(EPO_TOKEN_URL, auth=auth, data=data)
    if response.status_code == 200:
        return response.json()['access_token']
    else:
        raise Exception(f"获取token失败: {response.status_code}")

def test_claims(token, patent_number):
    """测试 claims 端点"""
    print(f"\n{'='*60}")
    print(f"测试 Claims - {patent_number}")
    print('='*60)
    
    url = f"{EPO_OPS_BASE_URL}/published-data/publication/epodoc/{patent_number}/claims"
    headers = {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/json'
    }
    
    response = requests.get(url, headers=headers)
    print(f"状态码: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n响应结构 keys: {list(data.keys())}")
        
        world_data = data.get('ops:world-patent-data', {})
        print(f"ops:world-patent-data keys: {list(world_data.keys())}")
        
        # 检查 fulltext-documents 路径
        fulltext_docs = world_data.get('fulltext-documents', {})
        print(f"fulltext-documents type: {type(fulltext_docs)}")
        if fulltext_docs:
            print(f"fulltext-documents keys: {list(fulltext_docs.keys()) if isinstance(fulltext_docs, dict) else 'N/A'}")
            
            fulltext_doc = fulltext_docs.get('fulltext-document', {})
            print(f"fulltext-document type: {type(fulltext_doc)}")
            
            if isinstance(fulltext_doc, list) and fulltext_doc:
                fulltext_doc = fulltext_doc[0]
            
            if isinstance(fulltext_doc, dict):
                print(f"fulltext-document keys: {list(fulltext_doc.keys())}")
                claims = fulltext_doc.get('claims', {})
                print(f"claims type: {type(claims)}")
                if isinstance(claims, dict):
                    print(f"claims keys: {list(claims.keys())}")
                    claim_list = claims.get('claim', [])
                    print(f"claim list type: {type(claim_list)}, length: {len(claim_list) if isinstance(claim_list, list) else 1}")
                    
                    if claim_list:
                        print(f"\n前3条权利要求示例:")
                        for i, c in enumerate(claim_list[:3] if isinstance(claim_list, list) else [claim_list]):
                            if isinstance(c, dict):
                                claim_text = c.get('claim-text', {})
                                print(f"  {i+1}. {claim_text}")
        
        # 保存完整响应
        with open('test_claims_response.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"\n完整响应已保存到 test_claims_response.json")
    else:
        print(f"请求失败: {response.text}")

def test_images(token, patent_number):
    """测试 images 端点"""
    print(f"\n{'='*60}")
    print(f"测试 Images - {patent_number}")
    print('='*60)
    
    # 测试 JSON 格式
    url = f"{EPO_OPS_BASE_URL}/published-data/publication/epodoc/{patent_number}/images"
    headers = {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/json'
    }
    
    print("\n--- JSON 格式 ---")
    response = requests.get(url, headers=headers)
    print(f"状态码: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"响应结构 keys: {list(data.keys())}")
        
        world_data = data.get('ops:world-patent-data', {})
        print(f"ops:world-patent-data keys: {list(world_data.keys())}")
        
        # 检查 document-instance
        doc_instance = world_data.get('ops:document-instance', {})
        print(f"ops:document-instance type: {type(doc_instance)}")
        
        if isinstance(doc_instance, list):
            print(f"document-instance 数量: {len(doc_instance)}")
            for i, inst in enumerate(doc_instance[:2]):
                print(f"  [{i}] keys: {list(inst.keys()) if isinstance(inst, dict) else 'N/A'}")
        elif isinstance(doc_instance, dict):
            print(f"document-instance keys: {list(doc_instance.keys())}")
            links = doc_instance.get('ops:link', [])
            print(f"ops:link type: {type(links)}")
            if isinstance(links, dict):
                links = [links]
            print(f"links 数量: {len(links)}")
            for link in links[:3]:
                print(f"  link: {link}")
        
        with open('test_images_json_response.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"\n完整响应已保存到 test_images_json_response.json")
    else:
        print(f"请求失败: {response.text}")
    
    # 测试 XML 格式
    print("\n--- XML 格式 ---")
    headers['Accept'] = 'application/xml'
    response = requests.get(url, headers=headers)
    print(f"状态码: {response.status_code}")
    
    if response.status_code == 200:
        print(f"响应内容前500字符:\n{response.text[:500]}")
        
        try:
            root = ET.fromstring(response.content)
            print(f"\n根元素: {root.tag}")
            
            # 查找所有命名空间
            namespaces = {'ops': 'http://ops.epo.org', 'epo': 'http://www.epo.org/exchange'}
            
            # 查找 document-instance
            for ns_prefix, ns_uri in namespaces.items():
                doc_instances = root.findall(f'.//{{{ns_uri}}}document-instance')
                if doc_instances:
                    print(f"\n找到 {len(doc_instances)} 个 document-instance (命名空间: {ns_uri})")
                    for inst in doc_instances[:2]:
                        print(f"  属性: {inst.attrib}")
                    break
            
            # 尝试不带命名空间
            doc_instances = root.findall('.//document-instance')
            if doc_instances:
                print(f"\n找到 {len(doc_instances)} 个 document-instance (无命名空间)")
                for inst in doc_instances[:2]:
                    print(f"  属性: {inst.attrib}")
            
        except Exception as e:
            print(f"XML解析错误: {e}")
        
        with open('test_images_xml_response.xml', 'w', encoding='utf-8') as f:
            f.write(response.text)
        print(f"\n完整响应已保存到 test_images_xml_response.xml")
    else:
        print(f"请求失败: {response.text}")

def test_biblio_priority(token, patent_number):
    """测试 biblio 端点的优先权数据"""
    print(f"\n{'='*60}")
    print(f"测试 Biblio Priority - {patent_number}")
    print('='*60)
    
    url = f"{EPO_OPS_BASE_URL}/published-data/publication/epodoc/{patent_number}/biblio"
    headers = {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/json'
    }
    
    response = requests.get(url, headers=headers)
    print(f"状态码: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        world_data = data.get('ops:world-patent-data', {})
        
        exchange_doc = world_data.get('exchange-document', {})
        if isinstance(exchange_doc, list) and exchange_doc:
            exchange_doc = exchange_doc[0]
        
        biblio = exchange_doc.get('bibliographic-data', {})
        
        # 检查优先权数据
        print(f"\n--- 优先权数据 ---")
        priority_claims = biblio.get('priority-claims', {})
        print(f"priority-claims type: {type(priority_claims)}")
        
        if priority_claims:
            priority_claim = priority_claims.get('priority-claim', [])
            print(f"priority-claim type: {type(priority_claim)}")
            
            if isinstance(priority_claim, dict):
                priority_claim = [priority_claim]
            
            print(f"priority-claim 数量: {len(priority_claim)}")
            
            for i, pc in enumerate(priority_claim[:3]):
                print(f"\n  Priority Claim [{i}]:")
                if isinstance(pc, dict):
                    print(f"    keys: {list(pc.keys())}")
                    doc_id = pc.get('document-id', [])
                    print(f"    document-id type: {type(doc_id)}")
                    
                    if isinstance(doc_id, list):
                        for did in doc_id:
                            if isinstance(did, dict):
                                print(f"      document-id-type: {did.get('@document-id-type')}")
                                date = did.get('date', {})
                                print(f"      date: {date}")
                    elif isinstance(doc_id, dict):
                        print(f"      document-id-type: {doc_id.get('@document-id-type')}")
                        date = doc_id.get('date', {})
                        print(f"      date: {date}")
        
        with open('test_biblio_response.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"\n完整响应已保存到 test_biblio_response.json")
    else:
        print(f"请求失败: {response.text}")

if __name__ == '__main__':
    print("EPO OPS API 数据结构测试")
    print("="*60)
    
    key = os.getenv('EPO_OPS_KEY', '')
    secret = os.getenv('EPO_OPS_SECRET', '')
    
    if not key or not secret:
        key = input("请输入 EPO OPS Key: ").strip()
        secret = input("请输入 EPO OPS Secret: ").strip()
    
    if not key or not secret:
        print("错误: 需要提供 API Key 和 Secret")
        sys.exit(1)
    
    token = get_token(key, secret)
    print(f"获取 Token 成功")
    
    # 测试一个美国专利
    test_patent = "US2024000001A1"  # 可以修改为其他专利号
    
    test_biblio_priority(token, test_patent)
    test_claims(token, test_patent)
    test_images(token, test_patent)
    
    print("\n" + "="*60)
    print("测试完成!")
