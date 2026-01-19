"""测试当前的专利抓取功能"""
import requests
from bs4 import BeautifulSoup
import json

def test_current_method(patent_number):
    """测试当前使用的requests+BeautifulSoup方法"""
    print(f"\n测试专利: {patent_number}")
    print("=" * 60)
    
    url = f'https://patents.google.com/patent/{patent_number}'
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        print(f"✓ HTTP状态码: {response.status_code}")
        
        soup = BeautifulSoup(response.text, 'lxml')
        
        # 尝试解析JSON-LD
        json_ld = soup.find('script', type='application/ld+json')
        if json_ld:
            ld_data = json.loads(json_ld.string)
            print(f"✓ 找到JSON-LD数据")
            
            if '@graph' in ld_data:
                for item in ld_data['@graph']:
                    if item.get('@type') == 'Patent':
                        print(f"  标题: {item.get('name', 'N/A')[:80]}")
                        print(f"  摘要: {item.get('abstract', 'N/A')[:80]}")
                        print(f"  发明人数量: {len(item.get('inventor', []))}")
                        return True
        else:
            print("✗ 未找到JSON-LD数据")
            
            # 尝试HTML解析
            title = soup.find('h1')
            if title:
                print(f"  HTML标题: {title.get_text().strip()[:80]}")
                return True
            else:
                print("✗ 也无法从HTML提取标题")
                return False
                
    except Exception as e:
        print(f"✗ 错误: {e}")
        return False

# 测试几个专利号
test_patents = [
    "US10000000B2",
    "US9999999B2", 
    "CN114123456A"
]

print("当前抓取方法测试")
print("=" * 60)

results = []
for patent in test_patents:
    success = test_current_method(patent)
    results.append((patent, success))

print("\n" + "=" * 60)
print("测试总结")
print("=" * 60)
for patent, success in results:
    status = "✓ 成功" if success else "✗ 失败"
    print(f"{patent}: {status}")
