import requests
import json

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json'
}

print('测试WIPO IPC API...')

r = requests.get('https://ipcpub.wipo.int/api/v1/scheme/roots/l1', headers=headers, timeout=30)
print(f'状态码: {r.status_code}')
print(f'返回数据类型: {type(r.json())}')
print(f'返回数据: {json.dumps(r.json(), indent=2, ensure_ascii=False)[:3000]}')
