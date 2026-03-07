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

# 测试查询 H04L（小类）
print("Querying H04L (subclass):")
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
        
        # 检查第一个条目的完整信息
        if items:
            first = items[0]
            print(f"\nFirst item:")
            print(f"  code: {first.get('code')}")
            print(f"  name: {first.get('name')}")
            print(f"  fcode: {first.get('fcode')}")
            print(f"  level: {first.get('level')}")
            
            # 从 name 中提取 H04L 的标题
            # name 格式: "H04L1/00  用于检测或防止所接收信息中的错误的装置 [20060101]"
            # 我们需要找到 H04L 的标题
            # fcode 是 H04L，说明 H04L 是父节点
            
            # 检查是否有其他条目的 code 以 H04L 开头但没有斜杠
            for item in items:
                code = item.get('code', '').replace(' ', '')
                if code.startswith('H04L') and '/' not in code:
                    print(f"\nFound H04L itself:")
                    print(f"  code: {code}")
                    print(f"  name: {item.get('name')}")
                    break
            else:
                print(f"\nH04L itself not found in results")
                print(f"But fcode is: {first.get('fcode')}")
