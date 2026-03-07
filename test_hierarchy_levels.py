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

# 测试查询 H（部）
print("Querying H (section):")
resp = session.post(
    'https://ipc.incopat.com/ipcFindTool/ipcquery',
    data={'id': '', 'code': 'H', 'version': '2026', 'format': 'zh'},
    headers={**headers, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
    timeout=30
)
if resp.status_code == 200:
    data = resp.json()
    if data.get('status'):
        items = data.get('data', [])
        print(f"  Total items: {len(items)}")
        for item in items[:3]:
            print(f"    {item.get('code')}: {item.get('name', '')[:60]}...")

# 测试查询 H04（大类）
print("\nQuerying H04 (class):")
resp = session.post(
    'https://ipc.incopat.com/ipcFindTool/ipcquery',
    data={'id': '', 'code': 'H04', 'version': '2026', 'format': 'zh'},
    headers={**headers, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
    timeout=30
)
if resp.status_code == 200:
    data = resp.json()
    if data.get('status'):
        items = data.get('data', [])
        print(f"  Total items: {len(items)}")
        for item in items[:3]:
            print(f"    {item.get('code')}: {item.get('name', '')[:60]}...")

# 测试查询 H04L（小类）
print("\nQuerying H04L (subclass):")
resp = session.post(
    'https://ipc.incopat.com/ipcFindTool/ipcquery',
    data={'id': '', 'code': 'H04L', 'version': '2026', 'format': 'zh'},
    headers={**headers, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
    timeout=30
)
if resp.status_code == 200:
    data = resp.json()
    if data.get('status'):
        items = data.get('data', [])
        print(f"  Total items: {len(items)}")
        for item in items[:3]:
            print(f"    {item.get('code')}: {item.get('name', '')[:60]}...")
