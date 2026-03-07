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

# 测试使用 id 参数查询
# 从之前的测试中，我们知道 H04L 的第一个子节点的 fcode 是 H04L
# 这说明 H04L 是父节点

# 测试查询 H04L 的子节点，然后从子节点推断 H04L 的标题
print("Querying H04L to get children and infer H04L title...")

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
        
        # 从第一个子节点推断 H04L 的标题
        if items:
            first = items[0]
            name = first.get('name', '')
            fcode = first.get('fcode', '')
            
            print(f"First child:")
            print(f"  code: {first.get('code')}")
            print(f"  name: {name[:100]}...")
            print(f"  fcode: {fcode}")
            
            # 从 name 中提取 H04L 的标题
            # name 格式: "H04L1/00  用于检测或防止所接收信息中的错误的装置 [20060101]"
            # H04L 的标题应该从 ipcRecommendSearch 获取
            
            # 测试 ipcRecommendSearch
            print(f"\nQuerying ipcRecommendSearch for H04L...")
            resp2 = session.post(
                'https://ipc.incopat.com/ipcFindTool/ipcRecommendSearch',
                data={'input': 'H04L', 'version': '2026', 'format': 'zh'},
                headers={**headers, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
                timeout=15
            )
            
            if resp2.status_code == 200:
                data2 = resp2.json()
                if data2.get('status'):
                    all_items = []
                    for level_data in data2.get('data', []):
                        if isinstance(level_data, list):
                            all_items.extend(level_data)
                    
                    print(f"Total items: {len(all_items)}")
                    
                    # 查找 H04L
                    for item in all_items:
                        code = item.get('code', '').replace(' ', '').upper()
                        if code == 'H04L':
                            print(f"\nFound H04L:")
                            print(f"  code: {item.get('code')}")
                            print(f"  nameNew: {item.get('nameNew', '')}")
                            break
                    else:
                        print(f"H04L not found")
                        
                        # 显示前10个条目
                        print(f"\nFirst 10 items:")
                        for item in all_items[:10]:
                            print(f"  {item.get('code')}: {item.get('nameNew', '')[:60]}...")
