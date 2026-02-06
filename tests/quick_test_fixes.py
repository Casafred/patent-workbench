"""快速测试抓取修复"""
import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("测试开始...")

try:
    from backend.scraper.simple_scraper import SimplePatentScraper
    print("✅ 导入SimplePatentScraper成功")
    
    scraper = SimplePatentScraper(delay=1.0)
    print("✅ 创建scraper实例成功")
    
    print("\n正在抓取专利 US12390907B2...")
    result = scraper.scrape_patent("US12390907B2", crawl_specification=True, crawl_full_drawings=False)
    
    if result.success:
        print(f"✅ 抓取成功! 耗时: {result.processing_time:.2f}秒")
        
        data = result.data
        
        # 测试同族信息
        print(f"\n同族信息:")
        print(f"  - 同族ID: {data.family_id or 'N/A'}")
        print(f"  - 同族申请数量: {len(data.family_applications) if data.family_applications else 0}")
        
        # 测试法律事件
        print(f"\n法律事件:")
        print(f"  - 事件数量: {len(data.legal_events) if data.legal_events else 0}")
        
        # 测试说明书
        print(f"\n说明书:")
        if data.description:
            print(f"  - 长度: {len(data.description)} 字符")
            print(f"  - 段落数: {data.description.count(chr(10) + chr(10))}")
        else:
            print("  - 未找到说明书")
        
        print("\n✅ 测试完成!")
    else:
        print(f"❌ 抓取失败: {result.error}")
    
    scraper.close()
    
except Exception as e:
    print(f"❌ 错误: {e}")
    import traceback
    traceback.print_exc()
