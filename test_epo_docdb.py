"""
EPO OPS API 测试脚本 - 使用 docdb 格式
"""

import requests
import json

EPO_OPS_BASE_URL = "https://ops.epo.org/3.2/rest-services"
EPO_TOKEN_URL = "https://ops.epo.org/3.2/auth/accesstoken"


def get_access_token(consumer_key, consumer_secret):
    auth = (consumer_key, consumer_secret)
    data = {'grant_type': 'client_credentials'}
    
    try:
        response = requests.post(EPO_TOKEN_URL, auth=auth, data=data)
        if response.status_code == 200:
            token_data = response.json()
            return token_data['access_token']
        else:
            print(f"获取 Token 失败: {response.status_code}")
            return None
    except Exception as e:
        print(f"异常: {e}")
        return None


def test_biblio_docdb(token, patent_number):
    """使用 docdb 格式获取 biblio"""
    print("\n" + "="*60)
    print(f"测试 biblio (docdb 格式): {patent_number}")
    print("="*60)
    
    url = f"{EPO_OPS_BASE_URL}/published-data/publication/docdb/{patent_number}/biblio"
    headers = {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/json'
    }
    
    print(f"URL: {url}")
    
    try:
        response = requests.get(url, headers=headers)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            world_data = data.get('ops:world-patent-data', {})
            exchange_doc = world_data.get('exchange-document', {})
            if not exchange_doc:
                exchange_doc = world_data.get('exchange-documents', {}).get('exchange-document', {})
            if isinstance(exchange_doc, list) and exchange_doc:
                exchange_doc = exchange_doc[0]
            
            if exchange_doc:
                biblio = exchange_doc.get('bibliographic-data', {})
                print(f"\n✓ biblio keys: {list(biblio.keys())}")
                
                # 摘要
                abstract_data = biblio.get('abstract', {})
                print(f"\nabstract 原始数据: {json.dumps(abstract_data, ensure_ascii=False)[:1000]}")
                
                # CPC
                cpc_data = biblio.get('classifications-cpc', {})
                print(f"\nclassifications-cpc 原始数据: {json.dumps(cpc_data, ensure_ascii=False)[:1000]}")
                
                # IPC
                ipc_data = biblio.get('classifications-ipcr', {})
                print(f"\nclassifications-ipcr 原始数据: {json.dumps(ipc_data, ensure_ascii=False)[:1000]}")
                
                # 标题
                title_data = biblio.get('invention-title', {})
                print(f"\ninvention-title 原始数据: {json.dumps(title_data, ensure_ascii=False)[:300]}")
                
                return True
            else:
                print("✗ 未找到 exchange-document")
                return False
        else:
            print(f"✗ 请求失败: {response.text[:500]}")
            return False
    except Exception as e:
        print(f"✗ 异常: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_claims_docdb(token, patent_number):
    """使用 docdb 格式获取 claims"""
    print("\n" + "="*60)
    print(f"测试 claims (docdb 格式): {patent_number}")
    print("="*60)
    
    url = f"{EPO_OPS_BASE_URL}/published-data/publication/docdb/{patent_number}/claims"
    headers = {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/json'
    }
    
    print(f"URL: {url}")
    
    try:
        response = requests.get(url, headers=headers)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n✓ claims 响应: {json.dumps(data, ensure_ascii=False)[:1500]}")
            
            world_data = data.get('ops:world-patent-data', {})
            claims_data = world_data.get('claims', {})
            
            if claims_data:
                print(f"\nclaims keys: {list(claims_data.keys())}")
                claim_list = claims_data.get('claim', [])
                if isinstance(claim_list, dict):
                    claim_list = [claim_list]
                print(f"找到 {len(claim_list)} 条权利要求")
                
                if claim_list:
                    first_claim = claim_list[0]
                    print(f"\n第一条权利要求原始数据: {json.dumps(first_claim, ensure_ascii=False)[:500]}")
                
                return True
            else:
                print("✗ 未找到 claims 数据")
                return False
        else:
            print(f"✗ 请求失败: {response.text[:500]}")
            return False
    except Exception as e:
        print(f"✗ 异常: {e}")
        return False


def test_images_docdb(token, patent_number):
    """使用 docdb 格式获取 images"""
    print("\n" + "="*60)
    print(f"测试 images (docdb 格式): {patent_number}")
    print("="*60)
    
    url = f"{EPO_OPS_BASE_URL}/published-data/publication/docdb/{patent_number}/images"
    headers = {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/json'
    }
    
    print(f"URL: {url}")
    
    try:
        response = requests.get(url, headers=headers)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n✓ images 响应: {json.dumps(data, ensure_ascii=False)[:1000]}")
            
            world_data = data.get('ops:world-patent-data', {})
            doc_instance = world_data.get('ops:document-instance', {})
            
            if isinstance(doc_instance, list) and doc_instance:
                doc_instance = doc_instance[0]
            
            if doc_instance:
                links = doc_instance.get('ops:link', [])
                if isinstance(links, dict):
                    links = [links]
                print(f"找到 {len(links)} 个链接")
                
                for link in links:
                    link_ref = link.get('@ref', '') or link.get('@link', '')
                    if link_ref:
                        print(f"  附图URL: {EPO_OPS_BASE_URL}{link_ref}.png")
                
                return True
            else:
                print("✗ 未找到 document-instance")
                return False
        else:
            print(f"✗ 请求失败: {response.text[:500]}")
            return False
    except Exception as e:
        print(f"✗ 异常: {e}")
        return False


def test_search_and_get_details(token):
    """搜索并获取详情"""
    print("\n" + "="*60)
    print("搜索 EP 专利")
    print("="*60)
    
    url = f"{EPO_OPS_BASE_URL}/published-data/search"
    headers = {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/json'
    }
    params = {
        'q': 'ta=neural network',  # 搜索神经网络相关专利
        'Range': '1-3'
    }
    
    print(f"查询: {params['q']}")
    
    try:
        response = requests.get(url, headers=headers, params=params)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            world_data = data.get('ops:world-patent-data', {})
            search_data = world_data.get('ops:biblio-search', {})
            total_count = search_data.get('@total-result-count', 0)
            print(f"✓ 找到 {total_count} 条结果")
            
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
                else:
                    country = str(country) if country else ''
                
                doc_num = doc_id.get('doc-number', {})
                if isinstance(doc_num, dict):
                    doc_num = doc_num.get('$', '')
                else:
                    doc_num = str(doc_num) if doc_num else ''
                
                kind = doc_id.get('kind', {})
                if isinstance(kind, dict):
                    kind = kind.get('$', '')
                else:
                    kind = str(kind) if kind else ''
                
                if country and doc_num:
                    pn = f"{country}.{doc_num}"
                    if kind:
                        pn = f"{pn}.{kind}"
                    patent_numbers.append(pn)
                    print(f"  解析到专利号: {pn}")
            
            return patent_numbers
        else:
            print(f"✗ 请求失败: {response.text[:500]}")
            return []
    except Exception as e:
        print(f"✗ 异常: {e}")
        return []


def main():
    print("="*60)
    print("EPO OPS API 测试 - docdb 格式")
    print("="*60)
    
    print("\n请输入 EPO OPS API 凭证：")
    consumer_key = input("\nConsumer Key: ").strip()
    consumer_secret = input("Consumer Secret: ").strip()
    
    if not consumer_key or not consumer_secret:
        print("\n✗ 凭证不能为空")
        return
    
    token = get_access_token(consumer_key, consumer_secret)
    if not token:
        print("\n✗ 获取 Token 失败")
        return
    
    print(f"\n✓ Token 获取成功")
    
    # 先搜索获取真实的专利号
    patent_numbers = test_search_and_get_details(token)
    
    if patent_numbers:
        test_patent = patent_numbers[0]
        print(f"\n{'='*60}")
        print(f"使用搜索到的专利号进行测试: {test_patent}")
        print(f"{'='*60}")
        
        test_biblio_docdb(token, test_patent)
        test_claims_docdb(token, test_patent)
        test_images_docdb(token, test_patent)
    else:
        # 使用已知的 docdb 格式专利号
        print("\n搜索失败，使用已知专利号测试...")
        test_patents_docdb = [
            "EP.1000000.A1",
            "EP.1000001.A1",
        ]
        
        for patent in test_patents_docdb:
            print(f"\n{'='*60}")
            print(f"测试专利: {patent}")
            print(f"{'='*60}")
            
            biblio_ok = test_biblio_docdb(token, patent)
            claims_ok = test_claims_docdb(token, patent)
            images_ok = test_images_docdb(token, patent)
            
            if biblio_ok or claims_ok or images_ok:
                break
    
    print("\n" + "="*60)
    print("测试完成")
    print("="*60)


if __name__ == "__main__":
    main()
