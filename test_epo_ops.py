"""
EPO OPS API 测试脚本

测试内容：
1. 获取 Access Token
2. 搜索专利
3. 获取专利详情（biblio）
4. 获取首张附图
5. 获取权利要求

使用方法：
python test_epo_ops.py
"""

import requests
import json
import os

EPO_OPS_BASE_URL = "https://ops.epo.org/3.2/rest-services"
EPO_TOKEN_URL = "https://ops.epo.org/3.2/auth/accesstoken"


def get_access_token(consumer_key, consumer_secret):
    """获取访问令牌"""
    print("\n" + "="*60)
    print("1. 测试获取 Access Token")
    print("="*60)
    
    auth = (consumer_key, consumer_secret)
    data = {'grant_type': 'client_credentials'}
    
    try:
        response = requests.post(EPO_TOKEN_URL, auth=auth, data=data)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            token_data = response.json()
            access_token = token_data['access_token']
            expires_in = token_data.get('expires_in', 'N/A')
            print(f"✓ 成功获取 Token")
            print(f"  Token: {access_token[:20]}...")
            print(f"  有效期: {expires_in} 秒")
            return access_token
        else:
            print(f"✗ 获取 Token 失败")
            print(f"  响应: {response.text[:500]}")
            return None
    except Exception as e:
        print(f"✗ 请求异常: {e}")
        return None


def search_patents(token, query="ta=machine learning", range_start=1, range_end=3):
    """搜索专利"""
    print("\n" + "="*60)
    print("2. 测试专利搜索")
    print("="*60)
    
    url = f"{EPO_OPS_BASE_URL}/published-data/search"
    headers = {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/json'
    }
    params = {
        'q': query,
        'Range': f"{range_start}-{range_end}"
    }
    
    print(f"查询: {query}")
    print(f"范围: {range_start}-{range_end}")
    
    try:
        response = requests.get(url, headers=headers, params=params)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            print("\n--- 原始响应数据结构 ---")
            print(json.dumps(data, indent=2, ensure_ascii=False)[:3000])
            print("--- 原始响应数据结束 ---\n")
            
            world_data = data.get('ops:world-patent-data', {})
            search_data = world_data.get('ops:biblio-search', {})
            total_count = search_data.get('@total-result-count', 0)
            
            print(f"✓ 搜索成功")
            print(f"  总结果数: {total_count}")
            
            search_result = search_data.get('ops:search-result', {})
            print(f"  search_result type: {type(search_result)}")
            print(f"  search_result keys: {list(search_result.keys()) if isinstance(search_result, dict) else 'N/A'}")
            
            pub_refs = search_result.get('ops:publication-reference', [])
            print(f"  pub_refs type: {type(pub_refs)}")
            
            if isinstance(pub_refs, dict):
                pub_refs = [pub_refs]
            
            patent_numbers = []
            for pub_ref in pub_refs:
                doc_id = pub_ref.get('document-id', {})
                
                if not doc_id:
                    continue
                
                if isinstance(doc_id, list):
                    doc_id = doc_id[0] if doc_id else {}
                
                doc_type = doc_id.get('@document-id-type', '')
                
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
                    pn = f"{country}{doc_num}"
                    if kind:
                        pn = f"{pn}{kind}"
                    patent_numbers.append(pn)
                    print(f"    解析: type={doc_type}, country={country}, doc-num={doc_num}, kind={kind} => {pn}")
            
            print(f"  解析到的专利号: {patent_numbers}")
            return patent_numbers
        else:
            print(f"✗ 搜索失败")
            print(f"  响应: {response.text[:500]}")
            return []
    except Exception as e:
        print(f"✗ 请求异常: {e}")
        import traceback
        traceback.print_exc()
        return []


def search_ep_patents(token, range_start=1, range_end=3):
    """专门搜索 EP 专利"""
    print("\n" + "="*60)
    print("2. 测试专利搜索 (EP专利)")
    print("="*60)
    
    url = f"{EPO_OPS_BASE_URL}/published-data/search"
    headers = {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/json'
    }
    params = {
        'q': 'pn=EP',  # 搜索 EP 专利
        'Range': f"{range_start}-{range_end}"
    }
    
    print(f"查询: pn=EP (搜索EP专利)")
    print(f"范围: {range_start}-{range_end}")
    
    try:
        response = requests.get(url, headers=headers, params=params)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            world_data = data.get('ops:world-patent-data', {})
            search_data = world_data.get('ops:biblio-search', {})
            total_count = search_data.get('@total-result-count', 0)
            
            print(f"✓ 搜索成功")
            print(f"  总结果数: {total_count}")
            
            search_result = search_data.get('ops:search-result', {})
            pub_refs = search_result.get('ops:publication-reference', [])
            
            if isinstance(pub_refs, dict):
                pub_refs = [pub_refs]
            
            patent_numbers = []
            for pub_ref in pub_refs:
                doc_id = pub_ref.get('document-id', {})
                
                if not doc_id:
                    continue
                
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
                    print(f"    解析: country={country}, doc-num={doc_num}, kind={kind} => {pn}")
            
            print(f"  解析到的专利号: {patent_numbers}")
            return patent_numbers
        else:
            print(f"✗ 搜索失败")
            print(f"  响应: {response.text[:500]}")
            return []
    except Exception as e:
        print(f"✗ 请求异常: {e}")
        import traceback
        traceback.print_exc()
        return []


def get_biblio(token, patent_number, input_format='docdb'):
    """获取专利书目数据（包含摘要、CPC等）"""
    print("\n" + "="*60)
    print("3. 测试获取专利书目数据 (biblio)")
    print("="*60)
    
    url = f"{EPO_OPS_BASE_URL}/published-data/publication/{input_format}/{patent_number}/biblio"
    headers = {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/json'
    }
    
    print(f"专利号: {patent_number}")
    print(f"格式: {input_format}")
    print(f"URL: {url}")
    
    try:
        response = requests.get(url, headers=headers)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            print("\n--- biblio 原始响应数据 (部分) ---")
            world_data = data.get('ops:world-patent-data', {})
            exchange_doc_raw = world_data.get('exchange-document', {})
            if not exchange_doc_raw:
                exchange_doc_raw = world_data.get('exchange-documents', {}).get('exchange-document', {})
            if isinstance(exchange_doc_raw, list) and len(exchange_doc_raw) > 0:
                exchange_doc_raw = exchange_doc_raw[0]
            biblio_raw = exchange_doc_raw.get('bibliographic-data', {})
            print(f"biblio keys: {list(biblio_raw.keys())}")
            print(f"abstract 数据: {json.dumps(biblio_raw.get('abstract', {}), ensure_ascii=False)[:500]}")
            print(f"classifications-cpc 数据: {json.dumps(biblio_raw.get('classifications-cpc', {}), ensure_ascii=False)[:500]}")
            print("--- 原始数据结束 ---\n")
            
            exchange_doc = exchange_doc_raw
            
            if not exchange_doc:
                print("✗ 未找到 exchange-document")
                return None
            
            biblio = exchange_doc.get('bibliographic-data', {})
            
            title = extract_text(biblio.get('invention-title', {}))
            abstract = extract_abstract(biblio.get('abstract', {}))
            applicants = extract_parties(biblio, 'applicant')
            inventors = extract_parties(biblio, 'inventor')
            cpc = extract_classifications(biblio, 'cpc')
            ipc = extract_classifications(biblio, 'ipc')
            
            print(f"✓ 获取成功")
            print(f"  标题: {title[:80]}..." if len(title) > 80 else f"  标题: {title}")
            print(f"  摘要长度: {len(abstract)} 字符")
            print(f"  摘要预览: {abstract[:100]}..." if len(abstract) > 100 else f"  摘要: {abstract}")
            print(f"  申请人: {applicants[:3]}")
            print(f"  发明人: {inventors[:3]}")
            print(f"  CPC分类 ({len(cpc)}个): {cpc[:5]}")
            print(f"  IPC分类 ({len(ipc)}个): {ipc[:5]}")
            
            return {
                'title': title,
                'abstract': abstract,
                'applicants': applicants,
                'inventors': inventors,
                'cpc': cpc,
                'ipc': ipc
            }
        else:
            print(f"✗ 获取失败")
            print(f"  响应: {response.text[:500]}")
            return None
    except Exception as e:
        print(f"✗ 请求异常: {e}")
        import traceback
        traceback.print_exc()
        return None


def get_images(token, patent_number, input_format='docdb'):
    """获取专利附图信息"""
    print("\n" + "="*60)
    print("4. 测试获取附图信息 (images)")
    print("="*60)
    
    url = f"{EPO_OPS_BASE_URL}/published-data/publication/{input_format}/{patent_number}/images"
    headers = {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/json'
    }
    
    print(f"专利号: {patent_number}")
    print(f"格式: {input_format}")
    print(f"URL: {url}")
    
    try:
        response = requests.get(url, headers=headers)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            world_data = data.get('ops:world-patent-data', {})
            doc_instance = world_data.get('ops:document-instance', {})
            
            if isinstance(doc_instance, list) and len(doc_instance) > 0:
                doc_instance = doc_instance[0]
            
            links = doc_instance.get('ops:link', [])
            if isinstance(links, dict):
                links = [links]
            
            print(f"✓ 获取成功")
            print(f"  找到 {len(links)} 个链接")
            
            drawing_urls = []
            for link in links:
                link_ref = link.get('@ref', '') or link.get('@link', '')
                if link_ref:
                    drawing_url = f"{EPO_OPS_BASE_URL}{link_ref}.png"
                    drawing_urls.append(drawing_url)
                    print(f"  附图URL: {drawing_url}")
            
            return drawing_urls
        else:
            print(f"✗ 获取失败")
            print(f"  响应: {response.text[:500]}")
            return []
    except Exception as e:
        print(f"✗ 请求异常: {e}")
        return []


def get_claims(token, patent_number, input_format='docdb'):
    """获取权利要求"""
    print("\n" + "="*60)
    print("5. 测试获取权利要求 (claims)")
    print("="*60)
    
    url = f"{EPO_OPS_BASE_URL}/published-data/publication/{input_format}/{patent_number}/claims"
    headers = {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/json'
    }
    
    print(f"专利号: {patent_number}")
    print(f"格式: {input_format}")
    print(f"URL: {url}")
    
    try:
        response = requests.get(url, headers=headers)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            world_data = data.get('ops:world-patent-data', {})
            claims_data = world_data.get('claims', {})
            
            if not claims_data:
                print("✗ 未找到 claims 数据")
                return []
            
            claim_list = claims_data.get('claim', [])
            if isinstance(claim_list, dict):
                claim_list = [claim_list]
            
            claims = []
            for i, claim in enumerate(claim_list):
                if isinstance(claim, dict):
                    claim_text = claim.get('claim-text', {})
                    text = extract_text(claim_text)
                    if text:
                        claims.append(text)
                        if i < 3:
                            print(f"  权利要求 {i+1}: {text[:100]}..." if len(text) > 100 else f"  权利要求 {i+1}: {text}")
            
            print(f"✓ 获取成功")
            print(f"  共 {len(claims)} 条权利要求")
            
            return claims
        else:
            print(f"✗ 获取失败")
            print(f"  响应: {response.text[:500]}")
            return []
    except Exception as e:
        print(f"✗ 请求异常: {e}")
        return []


def extract_text(data):
    """提取文本值"""
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
        for key, value in data.items():
            if not key.startswith('@'):
                if isinstance(value, str) and value:
                    return value.strip()
                elif isinstance(value, dict):
                    result = extract_text(value)
                    if result:
                        return result
    if isinstance(data, list) and len(data) > 0:
        return extract_text(data[0])
    return ''


def extract_abstract(abstract_data):
    """提取摘要"""
    if not abstract_data:
        return ''
    
    if isinstance(abstract_data, str):
        return abstract_data
    
    p = abstract_data.get('p', {})
    if isinstance(p, list):
        texts = [extract_text(item) for item in p]
        return ' '.join(text for text in texts if text)
    return extract_text(p)


def extract_parties(biblio, party_type):
    """提取申请人/发明人"""
    try:
        parties = biblio.get('parties', {})
        if not parties:
            return []
        
        party_container = parties.get(f'{party_type}s', {})
        data = party_container.get(f'{party_type}', [])
        
        if isinstance(data, dict):
            data = [data]
        
        result = []
        for party in data:
            if not isinstance(party, dict):
                continue
            name = party.get(f'{party_type}-name', {})
            text = extract_text(name)
            if text:
                result.append(text)
        
        return result
    except:
        return []


def extract_classifications(biblio, class_type):
    """提取分类号"""
    try:
        if class_type == 'cpc':
            class_container = biblio.get('classifications-cpc', {})
            class_data = class_container.get('classification-cpc', [])
        else:
            class_container = biblio.get('classifications-ipcr', {})
            class_data = class_container.get('classification-ipcr', [])
        
        if isinstance(class_data, dict):
            class_data = [class_data]
        
        result = []
        for c in class_data:
            if not isinstance(c, dict):
                continue
            
            text = c.get('text', {})
            text_val = extract_text(text)
            if text_val:
                result.append(text_val)
                continue
            
            class_symbol = c.get('classification-symbol', {})
            symbol = extract_text(class_symbol)
            if symbol:
                result.append(symbol)
        
        return result
    except:
        return []


def convert_to_docdb_format(patent_number):
    """
    将专利号转换为 docdb 格式
    输入: US20260070261A1
    输出: US.20260070261.A1
    """
    import re
    match = re.match(r'^([A-Z]{2})(\d+)([A-Z]\d?)$', patent_number)
    if match:
        country, doc_num, kind = match.groups()
        return f"{country}.{doc_num}.{kind}"
    return patent_number


def convert_docdb_to_epodoc(docdb_number):
    """
    将 docdb 格式转换为 epodoc 格式
    输入: US.20260070261.A1
    输出: US20260070261A1
    """
    parts = docdb_number.split('.')
    if len(parts) >= 2:
        return ''.join(parts)
    return docdb_number


def main():
    print("="*60)
    print("EPO OPS API 测试脚本")
    print("="*60)
    
    print("\n请输入 EPO OPS API 凭证：")
    print("(如果没有，可以在 https://developers.epo.org 注册获取)")
    
    consumer_key = input("\nConsumer Key: ").strip()
    consumer_secret = input("Consumer Secret: ").strip()
    
    if not consumer_key or not consumer_secret:
        print("\n✗ 凭证不能为空")
        return
    
    token = get_access_token(consumer_key, consumer_secret)
    if not token:
        print("\n✗ 无法继续测试，请检查凭证是否正确")
        return
    
    # 搜索 EP 专利（EP 专利通常有完整的数据）
    patent_numbers = search_ep_patents(token)
    
    if patent_numbers:
        test_patent = patent_numbers[0]
        epodoc_patent = convert_docdb_to_epodoc(test_patent)
        print(f"\n使用专利号 {test_patent} 进行后续测试...")
        print(f"docdb 格式: {test_patent}")
        print(f"epodoc 格式: {epodoc_patent}")
        
        # biblio 和 images 使用 docdb 格式
        get_biblio(token, test_patent, 'docdb')
        get_images(token, test_patent, 'docdb')
        
        # claims 使用 epodoc 格式（根据 OPS 文档）
        get_claims(token, epodoc_patent, 'epodoc')
    
    print("\n" + "="*60)
    print("测试完成")
    print("="*60)


if __name__ == "__main__":
    main()
