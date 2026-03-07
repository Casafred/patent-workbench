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
        
        # 显示前10个条目的完整信息
        print(f"\nTotal items: {len(items)}")
        
        for item in items[:10]:
            code = item.get('code', '')
            name = item.get('name', '')
            fcode = item.get('fcode', '')
            
            print(f"\n{code}:")
            print(f"  fcode: {fcode}")
            print(f"  name (full): {name}")
