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

# 测试不同的查询方式
# 1. 使用 ipcquery 查询 H04L9/08 的父节点
print("1. Querying H04L9/08 parent chain...")

# 先查询 H04L9/08
resp = session.post(
    'https://ipc.incopat.com/ipcFindTool/ipcquery',
    data={'id': '', 'code': 'H04L9/08', 'version': '2026', 'format': 'zh'},
    headers={**headers, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
    timeout=30
)

if resp.status_code == 200:
    data = resp.json()
    if data.get('status'):
        items = data.get('data', [])
        print(f"  Total items for H04L9/08: {len(items)}")
        
        # 查找 H04L9/08 本身
        for item in items:
            code = item.get('code', '').replace(' ', '').upper()
            if 'H04L9/08' in code:
                print(f"\n  Found H04L9/08:")
                print(f"    code: {item.get('code')}")
                print(f"    name: {item.get('name', '')[:80]}...")
                print(f"    fcode: {item.get('fcode')}")
                break

# 2. 使用 ipcquery 查询 H04L9（小类+大类）
print("\n2. Querying H04L9 (subclass + class)...")
resp = session.post(
    'https://ipc.incopat.com/ipcFindTool/ipcquery',
    data={'id': '', 'code': 'H04L9', 'version': '2026', 'format': 'zh'},
    headers={**headers, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
    timeout=30
)

if resp.status_code == 200:
    data = resp.json()
    if data.get('status'):
        items = data.get('data', [])
        print(f"  Total items for H04L9: {len(items)}")
        
        # 查找 H04L9 本身
        for item in items:
            code = item.get('code', '').replace(' ', '').upper()
            if code == 'H04L9':
                print(f"\n  Found H04L9:")
                print(f"    code: {item.get('code')}")
                print(f"    name: {item.get('name', '')[:80]}...")
                print(f"    fcode: {item.get('fcode')}")
                break
        else:
            print(f"  H04L9 not found in results")
            # 显示第一个条目
            if items:
                first = items[0]
                print(f"\n  First item:")
                print(f"    code: {first.get('code')}")
                print(f"    name: {first.get('name', '')[:80]}...")
                print(f"    fcode: {first.get('fcode')}")

# 3. 使用 ipcquery 查询 H04L（小类）
print("\n3. Querying H04L (subclass)...")
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
        print(f"  Total items for H04L: {len(items)}")
        
        # 查找 H04L 本身
        for item in items:
            code = item.get('code', '').replace(' ', '').upper()
            if code == 'H04L':
                print(f"\n  Found H04L:")
                print(f"    code: {item.get('code')}")
                print(f"    name: {item.get('name', '')[:80]}...")
                print(f"    fcode: {item.get('fcode')}")
                break
        else:
            print(f"  H04L not found in results")
            # 显示第一个条目
            if items:
                first = items[0]
                print(f"\n  First item:")
                print(f"    code: {first.get('code')}")
                print(f"    name: {first.get('name', '')[:80]}...")
                print(f"    fcode: {first.get('fcode')}")
