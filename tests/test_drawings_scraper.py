"""
测试附图爬取功能
"""
import sys
sys.path.insert(0, '.')

from backend.scraper.simple_scraper import SimplePatentScraper

def test_drawings():
    """测试附图爬取"""
    scraper = SimplePatentScraper(delay=1.0)
    
    # 测试专利号列表
    test_patents = [
        'US10000000B2',  # 美国专利
        'CN110000000A',  # 中国专利
        'EP3000000A1',   # 欧洲专利
    ]
    
    print("=" * 80)
    print("开始测试附图爬取功能")
    print("=" * 80)
    print()
    
    for patent_number in test_patents:
        print(f"\n{'='*80}")
        print(f"测试专利: {patent_number}")
        print(f"{'='*80}")
        
        result = scraper.scrape_patent(patent_number, crawl_specification=False, crawl_full_drawings=False)
        
        if result.success:
            data = result.data
            print(f"✅ 爬取成功")
            print(f"   标题: {data.title[:50]}..." if len(data.title) > 50 else f"   标题: {data.title}")
            print(f"   摘要: {data.abstract[:100]}..." if len(data.abstract) > 100 else f"   摘要: {data.abstract}")
            print(f"   权利要求数量: {len(data.claims)}")
            print(f"   附图数量: {len(data.drawings)}")
            
            if data.drawings:
                print(f"\n   📷 附图列表:")
                for i, drawing in enumerate(data.drawings, 1):
                    print(f"      {i}. {drawing}")
            else:
                print(f"\n   ⚠️ 未找到附图")
                print(f"   调试信息: 检查HTML结构是否变化")
        else:
            print(f"❌ 爬取失败: {result.error}")
        
        print(f"   处理时间: {result.processing_time:.2f}秒")
    
    print("\n" + "=" * 80)
    print("测试完成")
    print("=" * 80)
    
    scraper.close()

if __name__ == '__main__':
    test_drawings()
