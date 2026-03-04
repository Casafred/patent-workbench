"""
通过WIPO API获取完整IPC分类数据并缓存到本地
递归获取所有层级
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
    title = re.sub(r'<[^>]+>', '', title)
    title = re.sub(r'\s+', ' ', title)
    return title.strip()

def get_roots():
    """获取根节点（部A-H）"""
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

def build_tree_recursive(key, symbol, title, depth=0, max_depth=5, request_count=[0]):
    """递归构建分类树"""
    indent = '  ' * depth
    display_symbol = format_symbol(symbol)
    print(f'{indent}{display_symbol} ({depth})')
    
    node = {
        'symbol': symbol,
        'title': title,
        'key': key,
        'depth': depth,
        'children': []
    }
    
    if depth >= max_depth:
        return node
    
    try:
        request_count[0] += 1
        if request_count[0] % 10 == 0:
            time.sleep(0.5)
        
        children = get_children(key)
        
        for child in children:
            child_symbol = child.get('symbol') or child.get('symbolcode', '')
            child_title = clean_title(child.get('title1', ''))
            child_key = child.get('key', '')
            
            if child_key and child_symbol:
                child_node = build_tree_recursive(
                    child_key,
                    child_symbol,
                    child_title,
                    depth + 1,
                    max_depth,
                    request_count
                )
                node['children'].append(child_node)
    except Exception as e:
        print(f'{indent}错误: {e}')
    
    return node

def format_symbol(symbol):
    """格式化分类号显示"""
    if not symbol:
        return ''
    if len(symbol) <= 4:
        return symbol
    if '/' in symbol:
        return symbol.replace('/', ' ')
    if len(symbol) > 4 and symbol[4].isdigit():
        return symbol[:4] + ' ' + symbol[4:]
    return symbol

def count_nodes(node):
    """统计节点总数"""
    count = 1
    for child in node.get('children', []):
        count += count_nodes(child)
    return count

def flatten_tree(node, all_entries, parent_symbol=''):
    """将树结构扁平化，便于快速查找"""
    symbol = node.get('symbol', '')
    
    all_entries[symbol] = {
        'symbol': symbol,
        'title': node.get('title', ''),
        'key': node.get('key', ''),
        'depth': node.get('depth', 0),
        'parent': parent_symbol
    }
    
    for child in node.get('children', []):
        flatten_tree(child, all_entries, symbol)

def build_full_tree():
    """构建完整的IPC分类树"""
    print('开始构建完整IPC分类树...')
    print('=' * 50)
    
    roots = get_roots()
    print(f'获取到 {len(roots)} 个根节点\n')
    
    sections = []
    all_entries = {}
    key_map = {}
    
    for root in roots:
        symbol = root.get('symbol') or root.get('symbolcode', '')
        key = root.get('key', '')
        title = clean_title(root.get('title1', ''))
        
        print(f'\n处理部: {symbol}')
        print('-' * 30)
        
        key_map[symbol] = key
        
        section_node = build_tree_recursive(key, symbol, title, depth=0, max_depth=5)
        sections.append(section_node)
        
        node_count = count_nodes(section_node)
        print(f'\n  部 {symbol} 共 {node_count} 个节点')
    
    for section in sections:
        flatten_tree(section, all_entries)
    
    for symbol, entry in all_entries.items():
        key_map[symbol] = entry.get('key', '')
    
    ipc_data = {
        'version': '2024.01',
        'generated': time.strftime('%Y-%m-%d %H:%M:%S'),
        'sections': sections,
        'all_entries': all_entries,
        'key_map': key_map,
        'stats': {
            'sections': len(sections),
            'total_entries': len(all_entries)
        }
    }
    
    return ipc_data

def main():
    ipc_data = build_full_tree()
    
    print('\n' + '=' * 50)
    print('构建完成:')
    print(f'  - 部数量: {ipc_data["stats"]["sections"]}')
    print(f'  - 总条目数: {ipc_data["stats"]["total_entries"]}')
    
    output_file = os.path.join(DATA_DIR, 'ipc_data.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(ipc_data, f, ensure_ascii=False, indent=2)
    
    file_size = os.path.getsize(output_file)
    print(f'  - 文件大小: {file_size / 1024:.1f} KB')
    print(f'\n数据已保存到: {output_file}')
    
    return ipc_data

if __name__ == '__main__':
    main()
