"""
测试爬取器增强功能
测试新增的分类信息、技术领域、同族专利、外部链接等功能
"""

import sys
import json
from backend.scraper.simple_scraper import SimplePatentScraper

def test_enhanced_scraper():
    """测试增强的爬取器功能"""
    
    # 测试专利号
    patent_number = "US12390907B2"
    
    print(f"\n{'='*80}")
    print(f"测试专利: {patent_number}")
    print(f"{'='*80}\n")
    
    # 创建爬取器实例
    scraper = SimplePatentScraper(delay=1.0)
    
    # 爬取专利（包含完整信息）
    print("开始爬取专利信息...")
    result = scraper.scrape_patent(
        patent_number=patent_number,
        crawl_specification=True,  # 爬取说明书和进阶信息
        crawl_full_drawings=False   # 只爬取第一张附图
    )
    
    if result.success:
        print(f"\n✅ 爬取成功！处理时间: {result.processing_time:.2f}秒\n")
        
        data = result.data
        
        # 1. 基础信息
        print(f"{'='*80}")
        print("📋 基础信息")
        print(f"{'='*80}")
        print(f"专利号: {data.patent_number}")
        print(f"标题: {data.title}")
        print(f"摘要: {data.abstract[:100]}..." if len(data.abstract) > 100 else f"摘要: {data.abstract}")
        print(f"发明人: {', '.join(data.inventors)}")
        print(f"申请人: {', '.join(data.assignees)}")
        print(f"优先权日期: {data.priority_date}")
        print(f"申请日期: {data.application_date}")
        print(f"公开日期: {data.publication_date}")
        
        # 2. CPC分类信息
        print(f"\n{'='*80}")
        print(f"📊 CPC分类信息 (共 {len(data.classifications)} 条)")
        print(f"{'='*80}")
        for i, cls in enumerate(data.classifications[:5], 1):  # 只显示前5条
            print(f"\n{i}. {cls['leaf_code']}")
            print(f"   完整路径: {cls['code']}")
            print(f"   描述: {cls['leaf_description']}")
            print(f"   是否CPC: {cls['is_cpc']}")
            print(f"   是否叶子节点: {cls['is_leaf']}")
        
        if len(data.classifications) > 5:
            print(f"\n... 还有 {len(data.classifications) - 5} 条分类信息")
        
        # 3. 技术领域
        print(f"\n{'='*80}")
        print(f"🌐 技术领域 (共 {len(data.landscapes)} 条)")
        print(f"{'='*80}")
        for i, landscape in enumerate(data.landscapes, 1):
            print(f"{i}. {landscape['name']} ({landscape['type']})")
        
        # 4. 外部链接
        print(f"\n{'='*80}")
        print(f"🔗 外部链接 (共 {len(data.external_links)} 个)")
        print(f"{'='*80}")
        for link_id, link_info in data.external_links.items():
            print(f"• {link_info['text']}: {link_info['url']}")
        
        # 5. 同族信息
        print(f"\n{'='*80}")
        print(f"👨‍👩‍👧‍👦 同族信息")
        print(f"{'='*80}")
        print(f"同族ID: {data.family_id}")
        
        print(f"\n同族申请 (共 {len(data.family_applications)} 个):")
        for i, app in enumerate(data.family_applications, 1):
            print(f"\n{i}. {app['application_number']}")
            print(f"   状态: {app['status']}")
            print(f"   公开号: {app['publication_number']} ({app['language']})")
            print(f"   申请日期: {app['filing_date']}")
            print(f"   标题: {app['title'][:50]}..." if len(app['title']) > 50 else f"   标题: {app['title']}")
            if app['expiration']:
                print(f"   到期日: {app['expiration']}")
        
        print(f"\n国家状态 (共 {len(data.country_status)} 个国家/地区):")
        for i, country in enumerate(data.country_status, 1):
            print(f"{i}. {country['country_code']} - {country['count']} 个申请")
            print(f"   代表性公开: {country['publication_number']} ({country['language']})")
            if country['is_this_country']:
                print(f"   ⭐ 当前国家")
        
        # 6. 引用信息
        print(f"\n{'='*80}")
        print(f"📚 引用信息")
        print(f"{'='*80}")
        print(f"引用的专利: {len(data.patent_citations)} 条")
        print(f"被引用的专利: {len(data.cited_by)} 条")
        
        if data.cited_by:
            print(f"\n被引用专利示例 (前3条):")
            for i, citation in enumerate(data.cited_by[:3], 1):
                print(f"\n{i}. {citation['patent_number']}")
                print(f"   标题: {citation['title'][:50]}..." if len(citation['title']) > 50 else f"   标题: {citation['title']}")
                print(f"   申请人: {citation['assignee']}")
                print(f"   公开日期: {citation['publication_date']}")
                if citation['examiner_cited']:
                    print(f"   ⭐ 审查员引用")
        
        # 7. 其他信息
        print(f"\n{'='*80}")
        print(f"📝 其他信息")
        print(f"{'='*80}")
        print(f"权利要求: {len(data.claims)} 条")
        print(f"附图: {len(data.drawings)} 张")
        print(f"法律事件: {len(data.legal_events)} 个")
        print(f"相似文档: {len(data.similar_documents)} 个")
        
        # 保存完整数据到JSON文件
        output_file = f"test_output_{patent_number.replace('/', '_')}_enhanced.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result.to_dict(), f, ensure_ascii=False, indent=2)
        
        print(f"\n{'='*80}")
        print(f"✅ 完整数据已保存到: {output_file}")
        print(f"{'='*80}\n")
        
        # 统计信息
        print(f"\n{'='*80}")
        print(f"📊 数据完整性统计")
        print(f"{'='*80}")
        
        fields = {
            '基础信息': bool(data.title and data.abstract),
            'CPC分类': len(data.classifications) > 0,
            '技术领域': len(data.landscapes) > 0,
            '外部链接': len(data.external_links) > 0,
            '同族ID': bool(data.family_id),
            '同族申请': len(data.family_applications) > 0,
            '国家状态': len(data.country_status) > 0,
            '优先权日期': bool(data.priority_date),
            '引用专利': len(data.patent_citations) > 0,
            '被引用专利': len(data.cited_by) > 0,
            '权利要求': len(data.claims) > 0,
            '附图': len(data.drawings) > 0,
            '法律事件': len(data.legal_events) > 0,
        }
        
        total_fields = len(fields)
        completed_fields = sum(1 for v in fields.values() if v)
        
        for field, status in fields.items():
            status_icon = "✅" if status else "❌"
            print(f"{status_icon} {field}")
        
        print(f"\n完整度: {completed_fields}/{total_fields} ({completed_fields/total_fields*100:.1f}%)")
        
    else:
        print(f"\n❌ 爬取失败: {result.error}")
    
    # 关闭爬取器
    scraper.close()


if __name__ == "__main__":
    test_enhanced_scraper()
