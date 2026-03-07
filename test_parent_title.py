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

# 测试 H04L9
symbol = 'H04L9'
print(f"Querying: {symbol}")

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
        
        # 查找 H04L9/00（大组）
        for item in items:
            code = item.get('code', '').replace(' ', '').upper()
            if code == 'H04L9/00':
                print(f"\nFound H04L9/00:")
                print(f"  name: {item.get('name', '')}")
                print(f"  fcode: {item.get('fcode')}")
                break
        
        # 查找是否有 H04L9 本身
        for item in items:
            code = item.get('code', '').replace(' ', '').upper()
            if code == 'H04L9':
                print(f"\nFound H04L9:")
                print(f"  name: {item.get('name', '')}")
                print(f"  fcode: {item.get('fcode')}")
                break
        else:
            print(f"\nH04L9 not found in results")
        
        # 检查所有唯一的 fcode
        fcodes = set()
        for item in items:
            fcode = item.get('fcode', '')
            if fcode:
                fcodes.add(fcode)
        
        print(f"\nUnique fcodes: {sorted(fcodes)}")
