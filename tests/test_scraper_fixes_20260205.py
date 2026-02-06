"""
测试功能六抓取修复
测试专利: US12390907B2
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.scraper.simple_scraper import SimplePatentScraper
import json

def test_scraper_fixes():
    """测试抓取修复"""
    
    print("=" * 80)
    print("功能六抓取修复测试")
    print("=" * 80)
    
    # 创建scraper实例
    scraper = SimplePatentScraper(delay=1.0)
    
    # 测试专利号
    patent_number = "US12390907B2"
    
    print(f"\n正在抓取专利: {patent_number}")
    print("参数: crawl_specification=True, crawl_full_drawings=False")
    
    # 抓取专利（包含进阶字段）
    result = scraper.scrape_patent(
        patent_number=patent_number,
        crawl_specification=True,
        crawl_full_drawings=False
    )
    
    if not result.success:
        print(f"\n❌ 抓取失败: {result.error}")
        return
    
    print(f"\n✅ 抓取成功! 耗时: {result.processing_time:.2f}秒")
    
    data = result.data
    
    # 测试1: 同族信息
    print("\n" + "=" * 80)
    print("测试1: 同族信息（包含worldwide application）")
    print("=" * 80)
    
    if data.family_id:
        print(f"✅ 同族ID: {data.family_id}")
    else:
        print("⚠️  未找到同族ID")
    
    if data.family_applications:
        print(f"\n✅ 同族申请数量: {len(data.family_applications)}")
        
        # 检查是否包含worldwide application
        worldwide_apps = [app for app in data.family_applications if app.get('source') == 'worldwide']
        family_apps = [app for app in data.family_applications if app.get('source') != 'worldwide']
        
        print(f"   - Family Applications: {len(family_apps)}")
        print(f"   - Worldwide Applications: {len(worldwide_apps)}")
        
        print("\n前5个同族申请:")
        for i, app in enumerate(data.family_applications[:5], 1):
            source = app.get('source', 'family')
            print(f"\n   {i}. [{source.upper()}]")
            print(f"      申请号: {app.get('application_number', 'N/A')}")
            print(f"      公开号: {app.get('publication_number', 'N/A')}")
            print(f"      状态: {app.get('status', 'N/A')}")
            print(f"      语言: {app.get('language', 'N/A')}")
            if app.get('publication_date'):
                print(f"      公开日期: {app.get('publication_date')}")
    else:
        print("❌ 未找到同族申请信息")
    
    # 测试2: 法律事件
    print("\n" + "=" * 80)
    print("测试2: 法律事件")
    print("=" * 80)
    
    if data.legal_events:
        print(f"✅ 法律事件数量: {len(data.legal_events)}")
        
        # 统计关键事件
        critical_events = [e for e in data.legal_events if e.get('is_critical')]
        print(f"   - 关键事件: {len(critical_events)}")
        print(f"   - 普通事件: {len(data.legal_events) - len(critical_events)}")
        
        print("\n前5个法律事件:")
        for i, event in enumerate(data.legal_events[:5], 1):
            critical_mark = "⭐" if event.get('is_critical') else "  "
            print(f"\n   {i}. {critical_mark}")
            print(f"      日期: {event.get('date', 'N/A')}")
            print(f"      标题: {event.get('title', 'N/A')}")
            if event.get('type'):
                print(f"      类型: {event.get('type')}")
            if event.get('code'):
                print(f"      代码: {event.get('code')}")
    else:
        print("❌ 未找到法律事件信息")
    
    # 测试3: 说明书换行
    print("\n" + "=" * 80)
    print("测试3: 说明书换行保留")
    print("=" * 80)
    
    if data.description:
        desc_length = len(data.description)
        paragraph_count = data.description.count('\n\n')
        single_newline_count = data.description.count('\n') - paragraph_count * 2
        
        print(f"✅ 说明书长度: {desc_length} 字符")
        print(f"   - 段落分隔符(\\n\\n): {paragraph_count}")
        print(f"   - 单换行符(\\n): {single_newline_count}")
        
        # 显示前500字符
        print("\n说明书前500字符:")
        print("-" * 80)
        print(data.description[:500])
        print("-" * 80)
        
        if paragraph_count > 5:
            print(f"\n✅ 段落结构保留良好（{paragraph_count}个段落）")
        else:
            print(f"\n⚠️  段落分隔较少（{paragraph_count}个段落），可能需要检查")
    else:
        print("❌ 未找到说明书信息")
    
    # 保存完整结果
    output_file = "test_scraper_fixes_result.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result.to_dict(), f, ensure_ascii=False, indent=2)
    
    print(f"\n完整结果已保存到: {output_file}")
    
    # 总结
    print("\n" + "=" * 80)
    print("测试总结")
    print("=" * 80)
    
    tests_passed = 0
    tests_total = 3
    
    if data.family_applications and len(data.family_applications) >= 2:
        print("✅ 同族信息测试通过")
        tests_passed += 1
    else:
        print("❌ 同族信息测试失败")
    
    if data.legal_events and len(data.legal_events) > 0:
        print("✅ 法律事件测试通过")
        tests_passed += 1
    else:
        print("❌ 法律事件测试失败")
    
    if data.description and data.description.count('\n\n') > 5:
        print("✅ 说明书换行测试通过")
        tests_passed += 1
    else:
        print("❌ 说明书换行测试失败")
    
    print(f"\n测试结果: {tests_passed}/{tests_total} 通过")
    
    if tests_passed == tests_total:
        print("\n🎉 所有测试通过！修复成功！")
    else:
        print(f"\n⚠️  {tests_total - tests_passed} 个测试失败，需要进一步检查")
    
    # 关闭scraper
    scraper.close()

if __name__ == "__main__":
    test_scraper_fixes()
