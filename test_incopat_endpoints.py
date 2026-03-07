import requests
import json

session = requests.Session()

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'X-Requested-With': 'XMLHttpRequest',
}

# 访问主页
session.get('https://ipc.incopat.com/', headers=headers, timeout=10)
session.get('https://ipc.incopat.com/index', headers=headers, timeout=10)

# 测试不同的 API 端点
symbol = 'H04L9/08'

# 1. 测试 ipcRecommendSearch
print("1. Testing ipcRecommendSearch...")
resp = session.post(
    'https://ipc.incopat.com/ipcFindTool/ipcRecommendSearch',
    data={
        'input': symbol,
        'version': '2026',
        'format': 'zh'
    },
    headers={**headers, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
    timeout=15
)
print(f"Status: {resp.status_code}")
if resp.status_code == 200:
    data = resp.json()
    all_items = []
    for level_data in data.get('data', []):
        if isinstance(level_data, list):
            all_items.extend(level_data)
    print(f"Total items: {len(all_items)}")
    
    # 检查是否有 H04L9/08
    for item in all_items:
        code = item.get('code', '').replace(' ', '').upper()
        if 'H04L9' in code or 'H04L' in code:
            print(f"  Found: {code} (id={item.get('id')}, pId={item.get('pId')})")

# 2. 测试其他可能的端点
print("\n2. Testing other endpoints...")

# 尝试 ipcSearch
endpoints = [
    '/ipcFindTool/ipcSearch',
    '/ipcFindTool/search',
    '/api/ipc/search',
    '/ipc/getIpcInfo',
]

for endpoint in endpoints:
    try:
        url = f'https://ipc.incopat.com{endpoint}'
        resp = session.post(
            url,
            data={'input': symbol, 'version': '2026'},
            headers={**headers, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
            timeout=10
        )
        print(f"  {endpoint}: Status {resp.status_code}")
        if resp.status_code == 200:
            try:
                data = resp.json()
                print(f"    Response: {str(data)[:200]}...")
            except:
                print(f"    Response: {resp.text[:200]}...")
    except Exception as e:
        print(f"  {endpoint}: Error - {str(e)[:50]}")
