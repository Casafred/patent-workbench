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

# 测试 H04L（小类）
symbol = 'H04L'
print(f"Querying ipcquery: {symbol}")

resp = session.post(
    'https://ipc.incopat.com/ipcFindTool/ipcquery',
    data={
        'id': '',
        'code': symbol,
        'version': '2026',
        'format': 'zh'
    },
    headers={**headers, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
    timeout=30
)

if resp.status_code == 200:
    data = resp.json()
    if data.get('status'):
        items = data.get('data', [])
        print(f"Total items: {len(items)}")
        
        # 显示前3个条目的完整信息
        print("\nFirst 3 items (full info):")
        for item in items[:3]:
            print(f"\n  code: {item.get('code')}")
            print(f"  name: {item.get('name', '')[:80]}...")
            print(f"  fcode: {item.get('fcode')}")
            print(f"  level: {item.get('level')}")
            print(f"  isParent: {item.get('isParent')}")
