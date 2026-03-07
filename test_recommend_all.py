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

# 测试不同分类号
symbols = ['H04L', 'H04', 'G06F17', 'G06', 'A61K31', 'A61K']

for symbol in symbols:
    print(f"\n{'='*60}")
    print(f"Testing ipcRecommendSearch: {symbol}")
    
    resp = session.post(
        'https://ipc.incopat.com/ipcFindTool/ipcRecommendSearch',
        data={
            'input': symbol,
            'version': '2026',
            'format': 'zh'
        },
        headers={**headers, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
        timeout=15
    )
    
    if resp.status_code == 200:
        data = resp.json()
        if data.get('status'):
            all_items = []
            for level_data in data.get('data', []):
                if isinstance(level_data, list):
                    all_items.extend(level_data)
            
            print(f"Total items: {len(all_items)}")
            
            # 查找目标
            found = False
            for item in all_items:
                code = item.get('code', '').replace(' ', '').upper()
                if code == symbol.replace(' ', '').upper():
                    print(f"  Found: {code}")
                    print(f"    nameNew: {item.get('nameNew', '')[:80]}...")
                    found = True
                    break
            
            if not found:
                print(f"  Not found")
                # 显示前3个条目
                for item in all_items[:3]:
                    print(f"    {item.get('code')}: {item.get('nameNew', '')[:60]}...")
        else:
            print(f"  Status: false")
    else:
        print(f"  HTTP Error: {resp.status_code}")
