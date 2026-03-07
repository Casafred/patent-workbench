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

# 测试 H04
symbol = 'H04'
print(f"Querying ipcRecommendSearch: {symbol}")

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

if resp.status_code == 200:
    data = resp.json()
    all_items = []
    for level_data in data.get('data', []):
        if isinstance(level_data, list):
            all_items.extend(level_data)
    
    print(f"Total items: {len(all_items)}")
    
    # 查找 H04
    for item in all_items:
        code = item.get('code', '').replace(' ', '').upper()
        if code == 'H04':
            print(f"\nFound H04:")
            print(f"  nameNew: {item.get('nameNew', '')}")
            break
    
    # 查找 H04L
    for item in all_items:
        code = item.get('code', '').replace(' ', '').upper()
        if code == 'H04L':
            print(f"\nFound H04L:")
            print(f"  nameNew: {item.get('nameNew', '')}")
            break
