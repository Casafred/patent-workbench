import requests

print('测试本地IPC API...')

try:
    r = requests.get('http://127.0.0.1:5001/api/ipc/tree', timeout=5)
    print(f'状态码: {r.status_code}')
    if r.status_code == 200:
        data = r.json()
        print(f'成功: {data.get("success")}')
        print(f'数据条数: {len(data.get("data", []))}')
        for item in data.get('data', [])[:3]:
            print(f'  - {item.get("symbol")}: {item.get("title1", "")[:50]}')
    else:
        print(f'错误: {r.text[:200]}')
except Exception as e:
    print(f'请求失败: {e}')
