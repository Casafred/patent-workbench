"""
EPO OPS API 测试脚本 - 验证修复后的解析逻辑
"""

import requests
import json
import xml.etree.ElementTree as ET

EPO_OPS_BASE_URL = "https://ops.epo.org/3.2/rest-services"
EPO_TOKEN_URL = "https://ops.epo.org/3.2/auth/accesstoken"


def get_access_token(consumer_key, consumer_secret):
    auth = (consumer_key, consumer_secret)
    data = {'grant_type': 'client_credentials'}
    
    response = requests.post(EPO_TOKEN_URL, auth=auth, data=data)
    
    if response.status_code != 200:
        raise Exception(f"获取访问令牌失败: {response.status_code} - {response.text}")
    
    token_data = response.json()
    return token_data['access_token']


def make_request_json(token, url):
    headers = {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/json'
    }
    return requests.get(url, headers=headers)


def make_request_xml(token, url):
    headers = {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/xml'
    }
    return requests.get(url, headers=headers)


def extract_text(data):
    if data is None:
        return ''
    if isinstance(data, str):
        return data.strip()
    if isinstance(data, dict):
        if '$' in data:
            return str(data['$']).strip()
        for key in ['$', '#text']:
            if key in data and data[key]:
                return str(data[key]).strip()
    if isinstance(data, list) and len(data) > 0:
        return extract_text(data[0])
    return ''


def test_biblio(token, patent_number):
    print("\n" + "="*60)
    print(f"测试 biblio (docdb 格式): {patent_number}")
    print("="*60)
    
    url = f"{EPO_OPS_BASE_URL}/published-data/publication/docdb/{patent_number}/biblio"
    print(f"URL: {url}")
    
    try:
        response = make_request_json(token, url)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            # 打印原始响应结构
            print(f"\n原始响应 keys: {list(data.keys())}")
            world_data = data.get('ops:world-patent-data', {})
            print(f"world-patent-data keys: {list(world_data.keys())}")
            
            exchange_doc = world_data.get('exchange-document', {})
            if not exchange_doc:
                exchange_doc = world_data.get('exchange-documents', {}).get('exchange-document', {})
            
            if isinstance(exchange_doc, list) and exchange_doc:
                exchange_doc = exchange_doc[0]
            
            if not exchange_doc:
                print("未找到 exchange-document，打印完整响应:")
                print(json.dumps(data, ensure_ascii=False, indent=2)[:2000])
                return False
            
            print(f"\nexchange-document keys: {list(exchange_doc.keys())}")
            
            # 测试 abstract 解析（exchange-document 的直接子元素）
            abstract_data = exchange_doc.get('abstract', {})
            print(f"\nabstract 数据: {json.dumps(abstract_data, ensure_ascii=False)[:800]}")
            
            # 测试 CPC 解析（使用 patent-classification 字段）
            biblio = exchange_doc.get('bibliographic-data', {})
            print(f"\nbibliographic-data keys: {list(biblio.keys())}")
            
            patent_class = biblio.get('patent-classification', [])
            print(f"\npatent-classification 数据: {json.dumps(patent_class, ensure_ascii=False)[:1000]}")
            
            return True
        else:
            print(f"请求失败: {response.text[:500]}")
            return False
    except Exception as e:
        print(f"异常: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_claims(token, patent_number):
    print("\n" + "="*60)
    print(f"测试 claims (docdb 格式): {patent_number}")
    print("="*60)
    
    url = f"{EPO_OPS_BASE_URL}/published-data/publication/docdb/{patent_number}/claims"
    print(f"URL: {url}")
    
    try:
        response = make_request_json(token, url)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\nclaims 响应: {json.dumps(data, ensure_ascii=False)[:1500]}")
            
            # 正确路径: fulltext-documents -> fulltext-document -> claims
            world_data = data.get('ops:world-patent-data', {})
            fulltext_docs = world_data.get('fulltext-documents', {})
            print(f"\nfulltext-documents: {json.dumps(fulltext_docs, ensure_ascii=False)[:500]}")
            
            if fulltext_docs:
                fulltext_doc = fulltext_docs.get('fulltext-document', {})
                if isinstance(fulltext_doc, list) and fulltext_doc:
                    fulltext_doc = fulltext_doc[0]
                
                if not fulltext_doc:
                    print("未找到 fulltext-document")
                    return False
                
                claims_data = fulltext_doc.get('claims', {})
                print(f"\nclaims 数据: {json.dumps(claims_data, ensure_ascii=False)[:800]}")
                
                if claims_data:
                    claim_list = claims_data.get('claim', [])
                    if isinstance(claim_list, dict):
                        claim_list = [claim_list]
                    
                    print(f"\n找到 {len(claim_list)} 条权利要求")
                    for i, claim in enumerate(claim_list[:3]):
                        if isinstance(claim, dict):
                            claim_text = claim.get('claim-text', {})
                            text = extract_text(claim_text)
                            print(f"  权利要求 {i+1}: {text[:100]}...")
                
                return True
        else:
            print(f"请求失败: {response.text[:500]}")
            return False
    except Exception as e:
        print(f"异常: {e}")
        return False


def test_images(token, patent_number):
    print("\n" + "="*60)
    print(f"测试 images (docdb 格式): {patent_number}")
    print("="*60)
    
    url = f"{EPO_OPS_BASE_URL}/published-data/publication/docdb/{patent_number}/images"
    print(f"URL: {url}")
    
    try:
        response = make_request_xml(token, url)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            print(f"\nimages 响应 XML:\n{response.text[:1500]}")
            
            # 解析 XML - 使用正确的命名空间
            root = ET.fromstring(response.content)
            
            # 定义命名空间
            ns = {
                'ops': 'http://ops.epo.org',
                'ex': 'http://www.epo.org/exchange'
            }
            
            # 查找 document-instance 元素
            doc_instances = root.findall('.//ops:document-instance')
            
            for doc_inst in doc_instances:
                # 获取 link 属性
                link_attr = doc_inst.get('link', '')
                if link_attr:
                    drawing_url = f"{EPO_OPS_BASE_URL}/{link_attr}.png"
                    print(f"  附图URL: {drawing_url}")
                
                # 也尝试查找 ops:link 子元素
                links = doc_inst.findall('.//ops:link')
                for link in links:
                    link_ref = link.get('ref') or link.get('link', '')
                    if link_ref:
                        drawing_url = f"{EPO_OPS_BASE_URL}{link_ref}.png"
                        print(f"  附图URL (子元素): {drawing_url}")
            
            return True
        else:
            print(f"请求失败: {response.text[:500]}")
            return False
    except Exception as e:
        print(f"异常: {e}")
        import traceback
        traceback.print_exc()
        return False


def search_patents(token):
    print("\n" + "="*60)
    print("搜索专利")
    print("="*60)
    
    url = f"{EPO_OPS_BASE_URL}/published-data/search"
    params = {'q': 'ta=neural network', 'Range': '1-3'}
    
    print(f"查询: {params['q']}")
    
    try:
        headers = {
            'Authorization': f'Bearer {token}',
            'Accept': 'application/json'
        }
        response = requests.get(url, headers=headers, params=params)
        print(f"状态码: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type', 'N/A')}")
        
        if response.status_code == 200:
            # 先打印原始响应内容
            print(f"响应内容前500字符: {response.text[:500]}")
            
            try:
                data = response.json()
            except Exception as json_err:
                print(f"JSON解析失败: {json_err}")
                return []
            
            world_data = data.get('ops:world-patent-data', {})
            search_data = world_data.get('ops:biblio-search', {})
            search_result = search_data.get('ops:search-result', {})
            pub_refs = search_result.get('ops:publication-reference', [])
            
            if isinstance(pub_refs, dict):
                pub_refs = [pub_refs]
            
            patent_numbers = []
            for pub_ref in pub_refs:
                doc_id = pub_ref.get('document-id', {})
                if isinstance(doc_id, list):
                    doc_id = doc_id[0] if doc_id else {}
                
                country = doc_id.get('country', {})
                if isinstance(country, dict):
                    country = country.get('$', '')
                
                doc_num = doc_id.get('doc-number', {})
                if isinstance(doc_num, dict):
                    doc_num = doc_num.get('$', '')
                
                kind = doc_id.get('kind', {})
                if isinstance(kind, dict):
                    kind = kind.get('$', '')
                
                if country and doc_num:
                    pn = f"{country}.{doc_num}"
                    if kind:
                        pn = f"{pn}.{kind}"
                    patent_numbers.append(pn)
            
            print(f"解析到专利号: {patent_numbers}")
            return patent_numbers
        else:
            print(f"搜索失败: {response.text[:500]}")
            return []
    except Exception as e:
        print(f"异常: {e}")
        import traceback
        traceback.print_exc()
        return []


def main():
    print("="*60)
    print("EPO OPS API 测试 - 验证修复")
    print("="*60)
    
    print("\n请输入 EPO OPS API 凭证：")
    consumer_key = input("\nConsumer Key: ").strip()
    consumer_secret = input("Consumer Secret: ").strip()
    
    if not consumer_key or not consumer_secret:
        print("\n凭证不能为空")
        return
    
    token = get_access_token(consumer_key, consumer_secret)
    if not token:
        print("\n获取 Token 失败")
        return
    
    print(f"\n✓ Token 获取成功")
    
    patent_numbers = search_patents(token)
    
    if patent_numbers:
        test_patent = patent_numbers[0]
        print(f"\n使用搜索到的专利号进行测试: {test_patent}")
        
        test_biblio(token, test_patent)
        test_claims(token, test_patent)
        test_images(token, test_patent)
    else:
        print("\n搜索失败")
    
    print("\n" + "="*60)
    print("测试完成")
    print("="*60)


if __name__ == "__main__":
    main()
