"""
通过WIPO API获取IPC分类数据并缓存到本地
"""
import requests
import json
import os
import time
import re

DATA_DIR = os.path.dirname(os.path.abspath(__file__))
WIPO_API_BASE = 'https://ipcpub.wipo.int/api/v1'

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9'
}

def clean_title(title):
    """清理标题HTML标签"""
    if not title:
        return ''
    return re.sub(r'<[^>]+>', '', title).strip()

def get_roots():
    """获取根节点（部A-H）"""
    print('获取IPC根节点...')
    url = f'{WIPO_API_BASE}/scheme/roots/l1'
    resp = requests.get(url, headers=headers, timeout=30)
    if resp.status_code == 200:
        data = resp.json()
        return data.get('data', [])
    print(f'获取根节点失败: {resp.status_code}')
    return []

def get_children(key):
    """获取子节点"""
    url = f'{WIPO_API_BASE}/scheme/children/l1'
    params = {'key': key}
    resp = requests.get(url, params=params, headers=headers, timeout=30)
    if resp.status_code == 200:
        data = resp.json()
        return data.get('data', [])
    return []

def build_full_tree():
    """构建完整的IPC分类树"""
    print('开始构建IPC分类树...')
    
    ipc_data = {
        'version': '2024.01',
        'sections': [],
        'all_entries': {},
        'key_map': {}
    }
    
    roots = get_roots()
    print(f'获取到 {len(roots)} 个根节点')
    
    for root in roots:
        symbol = root.get('symbol') or root.get('symbolcode', '')
        key = root.get('key', '')
        title = clean_title(root.get('title1', ''))
        
        print(f'\n处理部: {symbol} (key: {key})')
        
        ipc_data['key_map'][symbol] = key
        
        section_node = {
            'symbol': symbol,
            'title': title,
            'key': key,
            'children': []
        }
        
        ipc_data['all_entries'][symbol] = {
            'symbol': symbol,
            'title': title,
            'key': key
        }
        
        try:
            children = get_children(key)
            time.sleep(0.15)
            print(f'  获取到 {len(children)} 个大类')
            
            for child in children:
                child_symbol = child.get('symbol') or child.get('symbolcode', '')
                child_title = clean_title(child.get('title1', ''))
                child_key = child.get('key', '')
                
                if child_key:
                    ipc_data['key_map'][child_symbol] = child_key
                    ipc_data['all_entries'][child_symbol] = {
                        'symbol': child_symbol,
                        'title': child_title,
                        'key': child_key,
                        'parent': symbol
                    }
                    
                    child_node = {
                        'symbol': child_symbol,
                        'title': child_title,
                        'key': child_key,
                        'children': []
                    }
                    
                    try:
                        sub_children = get_children(child_key)
                        time.sleep(0.1)
                        
                        for sub in sub_children:
                            sub_symbol = sub.get('symbol') or sub.get('symbolcode', '')
                            sub_title = clean_title(sub.get('title1', ''))
                            sub_key = sub.get('key', '')
                            
                            if sub_key:
                                ipc_data['key_map'][sub_symbol] = sub_key
                                ipc_data['all_entries'][sub_symbol] = {
                                    'symbol': sub_symbol,
                                    'title': sub_title,
                                    'key': sub_key,
                                    'parent': child_symbol
                                }
                                
                                child_node['children'].append({
                                    'symbol': sub_symbol,
                                    'title': sub_title,
                                    'key': sub_key
                                })
                    except Exception as e:
                        print(f'  获取子节点失败 {child_symbol}: {e}')
                    
                    section_node['children'].append(child_node)
        except Exception as e:
            print(f'获取部 {symbol} 的子节点失败: {e}')
        
        ipc_data['sections'].append(section_node)
    
    return ipc_data

def main():
    ipc_data = build_full_tree()
    
    print(f'\n构建完成:')
    print(f'  - 部数量: {len(ipc_data["sections"])}')
    print(f'  - 总条目数: {len(ipc_data["all_entries"])}')
    print(f'  - key映射数: {len(ipc_data["key_map"])}')
    
    output_file = os.path.join(DATA_DIR, 'ipc_data.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(ipc_data, f, ensure_ascii=False, indent=2)
    
    print(f'\n数据已保存到: {output_file}')
    
    return ipc_data

if __name__ == '__main__':
    main()
