"""
EPO OPS API 简化测试脚本

直接测试已知的 EP 专利号，打印原始响应数据
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


def test_biblio_epodoc(token, patent_number):
    print("\n" + "="*60)
    print(f"测试 biblio (epodoc 格式): {patent_number}")
    print("="*60)
    
    url = f"{EPO_OPS_BASE_URL}/published-data/publication/epodoc/{patent_number}/biblio"
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
                
                abstract_data = biblio.get('abstract', {})
                print(f"\nabstract 原始数据: {json.dumps(abstract_data, ensure_ascii=False)[:800]}")
                
                cpc_data = biblio.get('classifications-cpc', {})
                print(f"\nclassifications-cpc 原始数据: {json.dumps(cpc_data, ensure_ascii=False)[:800]}")
                
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


def test_claims_epodoc(token, patent_number):
    print("\n" + "="*60)
    print(f"测试 claims (epodoc 格式): {patent_number}")
    print("="*60)
    
    url = f"{EPO_OPS_BASE_URL}/published-data/publication/epodoc/{patent_number}/claims"
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
            print(f"\n✓ claims 响应 keys: {list(data.keys())}")
            
            world_data = data.get('ops:world-patent-data', {})
            claims_data = world_data.get('claims', {})
            
            if claims_data:
                print(f"claims keys: {list(claims_data.keys())}")
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


def test_images_epodoc(token, patent_number):
    print("\n" + "="*60)
    print(f"测试 images (epodoc 格式): {patent_number}")
    print("="*60)
    
    url = f"{EPO_OPS_BASE_URL}/published-data/publication/epodoc/{patent_number}/images"
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
            print(f"\n✓ images 响应: {json.dumps(data, ensure_ascii=False)[:800]}")
            
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


def test_search(token):
    print("\n" + "="*60)
    print("测试搜索功能")
    print("="*60)
    
    url = f"{EPO_OPS_BASE_URL}/published-data/search"
    headers = {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/json'
    }
    params = {
        'q': 'pn=EP1000000',
        'Range': '1-3'
    }
    
    print(f"URL: {url}")
    print(f"查询: {params['q']}")
    
    try:
        response = requests.get(url, headers=headers, params=params)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n✓ 搜索响应: {json.dumps(data, ensure_ascii=False)[:1500]}")
            return True
        else:
            print(f"✗ 请求失败: {response.text[:500]}")
            return False
    except Exception as e:
        print(f"✗ 异常: {e}")
        return False


def main():
    print("="*60)
    print("EPO OPS API 简化测试")
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
    
    test_patents = [
        "EP1000000A1",
        "EP1000001A1",
        "EP2000000A1",
    ]
    
    for patent in test_patents:
        print(f"\n{'='*60}")
        print(f"测试专利: {patent}")
        print(f"{'='*60}")
        
        biblio_ok = test_biblio_epodoc(token, patent)
        claims_ok = test_claims_epodoc(token, patent)
        images_ok = test_images_epodoc(token, patent)
        
        if biblio_ok or claims_ok or images_ok:
            print(f"\n✓ 专利 {patent} 至少有一项数据可用")
            break
    
    test_search(token)
    
    print("\n" + "="*60)
    print("测试完成")
    print("="*60)


if __name__ == "__main__":
    main()
