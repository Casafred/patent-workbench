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

# 测试 ipcgetbycode API
print("Testing ipcgetbycode API...")

# 测试不同的端点
endpoints = [
    '/ipcFindTool/ipcgetbycode',
    '/ipcFindTool/getIpcByCode',
    '/ipcFindTool/getByCode',
    '/ipcFindTool/ipcget',
]

for endpoint in endpoints:
    url = f'https://ipc.incopat.com{endpoint}'
    
    # 尝试 POST
    try:
        resp = session.post(
            url,
            data={'code': 'H04L', 'version': '2026', 'format': 'zh'},
            headers={**headers, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
            timeout=10
        )
        
        if resp.status_code == 200:
            print(f"\n{endpoint} (POST):")
            try:
                data = resp.json()
                print(f"  Status: {data.get('status')}")
                if data.get('data'):
                    print(f"  Data: {str(data.get('data'))[:300]}...")
            except:
                print(f"  Response: {resp.text[:200]}...")
        elif resp.status_code != 404:
            print(f"\n{endpoint} (POST): Status {resp.status_code}")
    except Exception as e:
        pass
    
    # 尝试 GET
    try:
        resp = session.get(
            url,
            params={'code': 'H04L', 'version': '2026', 'format': 'zh'},
            headers=headers,
            timeout=10
        )
        
        if resp.status_code == 200:
            print(f"\n{endpoint} (GET):")
            try:
                data = resp.json()
                print(f"  Status: {data.get('status')}")
                if data.get('data'):
                    print(f"  Data: {str(data.get('data'))[:300]}...")
            except:
                print(f"  Response: {resp.text[:200]}...")
        elif resp.status_code != 404:
            print(f"\n{endpoint} (GET): Status {resp.status_code}")
    except Exception as e:
        pass
