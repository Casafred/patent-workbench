"""
简单测试字符编码
"""

import requests
from backend.scraper.simple_scraper import SimplePatentScraper

def test_scraper_encoding():
    """直接测试爬虫的编码"""
    scraper = SimplePatentScraper(delay=1.0)
    
    # 测试一个日本专利
    print("测试专利: JP2020202510A")
    print("=" * 60)
    
    result = scraper.scrape_patent('JP2020202510A')
    
    if result.success and result.data:
        data = result.data
        print(f"标题: {data.title}")
        print(f"发明人: {', '.join(data.inventors)}")
        print(f"受让人: {', '.join(data.assignees)}")
        
        # 检查编码
        all_text = f"{data.title} {' '.join(data.inventors)} {' '.join(data.assignees)}"
        
        # 检查常见的乱码模式
        garbled_patterns = ['è', 'å', '¤', 'æ', 'ä', 'ï', 'ü', 'ö']
        has_garbled = any(pattern in all_text for pattern in garbled_patterns)
        
        if has_garbled:
            print("\n⚠️ 检测到乱码字符！")
            print(f"原始文本: {all_text[:200]}")
        else:
            print("\n✅ 字符编码正常")
    else:
        print(f"❌ 查询失败: {result.error}")
    
    scraper.close()

if __name__ == '__main__':
    test_scraper_encoding()
