import requests
import json

# 测试 IPC hierarchy API
url = 'http://127.0.0.1:5001/api/ipc/hierarchy'

# 测试不同分类号
symbols = ['G06F17/00', 'H04L9/08', 'A61K31']

for symbol in symbols:
    print(f"\n{'='*60}")
    print(f"Testing: {symbol}")
    
    resp = requests.get(url, params={'symbol': symbol}, timeout=30)
    result = resp.json()
    
    if result.get('success'):
        hierarchy = result['data']['hierarchy']
        print(f"Hierarchy count: {len(hierarchy)}")
        for item in hierarchy:
            print(f"  {item['levelName']}: {item['symbol']} - {item['title'][:60]}...")
    else:
        print(f"Error: {result.get('error')}")
