import requests
from bs4 import BeautifulSoup

session = requests.Session()

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
}

# 访问 incoPat IPC 查询页面
resp = session.get('https://ipc.incopat.com/', headers=headers, timeout=15)

print(f"Status: {resp.status_code}")
print(f"URL: {resp.url}")

# 检查页面内容
soup = BeautifulSoup(resp.text, 'html.parser')

# 查找 ipcQueryTree1
tree = soup.find(id='ipcQueryTree1')
if tree:
    print(f"\nFound ipcQueryTree1")
    
    # 查找所有 li 元素
    lis = tree.find_all('li', recursive=False)
    print(f"Top-level li count: {len(lis)}")
    
    # 显示第一个 li 的完整结构
    if lis:
        first_li = lis[0]
        print(f"\nFirst li structure:")
        print(first_li.prettify()[:2000])
else:
    print("ipcQueryTree1 not found")
    
    # 查找其他可能的树结构
    print("\nLooking for other tree structures...")
    uls = soup.find_all('ul', class_='ztree')
    print(f"Found {len(uls)} ztree uls")
