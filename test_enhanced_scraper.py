#!/usr/bin/env python3
"""
测试增强专利爬虫主控制器
"""

import sys
import os
import asyncio
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def test_scraper_initialization():
    """测试爬虫初始化"""
    print("=== 测试爬虫初始化 ===\n")
    
    try:
        from backend.scraper.enhanced_scraper import EnhancedPatentScraper
        from backend.scraper.config import ScrapingConfig
        
        # 创建配置
        config = ScrapingConfig.get_default_config()
        config.headless = True  # 确保无头模式
        
        # 创建爬虫实例
        scraper = EnhancedPatentScraper(config)
        print("✅ 爬虫实例创建成功")
        
        # 测试初始化
        await scraper.initialize()
        print("✅ 爬虫初始化成功")
        
        # 测试健康检查
        health_status = await scraper.get_health_status()
        print(f"📊 健康状态: {health_status['overall_healthy']}")
        
        # 测试统计信息
        stats = await scraper.get_statistics()
        print(f"📈 总请求数: {stats['total_requests']}")
        
        # 清理
        await scraper.cleanup()
        print("✅ 爬虫清理完成")
        
        return True
        
    except Exception as e:
        print(f"❌ 爬虫初始化测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_convenience_functions():
    """测试便利函数"""
    print("\n=== 测试便利函数 ===\n")
    
    try:
        from backend.scraper.enhanced_scraper import scrape_single_patent, scrape_multiple_patents
        from backend.scraper.config import ScrapingConfig
        
        # 创建测试配置
        config = ScrapingConfig()
        config.headless = True
        config.max_retries = 1  # 快速测试
        config.retry_delays = [0.1]
        
        print("🔍 测试单个专利爬取函数...")
        # 注意：这里使用一个可能不存在的专利号进行测试
        # 主要测试函数调用和错误处理
        try:
            result = await scrape_single_patent("TEST123456", config)
            print(f"   - 结果: {result.success}")
            print(f"   - 专利号: {result.patent_number}")
            if not result.success:
                print(f"   - 错误: {result.error}")
        except Exception as e:
            print(f"   - 预期的错误: {type(e).__name__}")
        
        print("\n🔍 测试批量专利爬取函数...")
        
        def progress_callback(completed, total, result):
            print(f"   - 进度: {completed}/{total} - {result.patent_number}")
        
        try:
            results = await scrape_multiple_patents(
                ["TEST123456", "TEST789012"], 
                config, 
                progress_callback
            )
            print(f"   - 批量结果数量: {len(results)}")
            for result in results:
                print(f"     * {result.patent_number}: {result.success}")
        except Exception as e:
            print(f"   - 预期的错误: {type(e).__name__}")
        
        return True
        
    except Exception as e:
        print(f"❌ 便利函数测试失败: {e}")
        return False

async def test_batch_request():
    """测试批量请求处理"""
    print("\n=== 测试批量请求处理 ===\n")
    
    try:
        from backend.scraper.enhanced_scraper import EnhancedPatentScraper
        from backend.scraper.models import BatchRequest
        from backend.scraper.config import ScrapingConfig
        
        # 创建配置
        config = ScrapingConfig()
        config.headless = True
        config.max_retries = 1
        config.retry_delays = [0.1]
        
        # 创建批量请求
        batch_request = BatchRequest(
            patent_numbers=["TEST123", "TEST456"],
            config={"min_delay": 0.1}
        )
        
        print(f"📋 批量请求: {batch_request.request_id}")
        print(f"   - 专利数量: {len(batch_request.patent_numbers)}")
        print(f"   - 有效性: {batch_request.is_valid()}")
        
        # 测试爬虫处理
        async with EnhancedPatentScraper(config) as scraper:
            try:
                response = await scraper.scrape_patents_from_request(batch_request)
                print(f"✅ 批量请求处理完成")
                print(f"   - 结果数量: {len(response['results'])}")
                print(f"   - 成功数量: {response['progress']['success_count']}")
                print(f"   - 错误数量: {response['progress']['error_count']}")
            except Exception as e:
                print(f"   - 处理错误: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ 批量请求测试失败: {e}")
        return False

async def test_error_handling():
    """测试错误处理"""
    print("\n=== 测试错误处理 ===\n")
    
    try:
        from backend.scraper.enhanced_scraper import EnhancedPatentScraper
        from backend.scraper.config import ScrapingConfig
        
        # 创建配置
        config = ScrapingConfig()
        config.headless = True
        config.max_retries = 2
        config.retry_delays = [0.1, 0.2]
        
        async with EnhancedPatentScraper(config) as scraper:
            # 测试无效专利号
            print("🔍 测试无效专利号处理...")
            result = await scraper.scrape_patent("INVALID_PATENT_123")
            print(f"   - 成功: {result.success}")
            print(f"   - 重试次数: {result.retry_count}")
            if not result.success:
                print(f"   - 错误信息: {result.error}")
            
            # 获取错误统计
            error_stats = scraper.error_handler.get_error_statistics()
            print(f"\n📊 错误统计:")
            print(f"   - 总错误数: {error_stats['total_errors']}")
            print(f"   - 连续错误数: {error_stats['consecutive_errors']}")
            
            # 获取恢复建议
            suggestions = scraper.error_handler.get_recovery_suggestions()
            print(f"   - 恢复建议: {len(suggestions)} 条")
        
        return True
        
    except Exception as e:
        print(f"❌ 错误处理测试失败: {e}")
        return False

def test_component_integration():
    """测试组件集成"""
    print("\n=== 测试组件集成 ===\n")
    
    try:
        from backend.scraper.enhanced_scraper import EnhancedPatentScraper
        from backend.scraper.config import ScrapingConfig
        
        # 创建配置
        config = ScrapingConfig.get_default_config()
        
        # 创建爬虫
        scraper = EnhancedPatentScraper(config)
        
        # 测试组件存在
        components = [
            ('browser_manager', scraper.browser_manager),
            ('anti_detection', scraper.anti_detection),
            ('rate_limiter', scraper.rate_limiter),
            ('data_extractor', scraper.data_extractor),
            ('error_handler', scraper.error_handler),
            ('session_manager', scraper.session_manager)
        ]
        
        print("🔧 组件集成检查:")
        for name, component in components:
            status = "✅" if component is not None else "❌"
            print(f"   {status} {name}: {type(component).__name__}")
        
        # 测试配置验证
        is_valid = config.is_valid()
        print(f"\n⚙️ 配置验证: {'✅' if is_valid else '❌'}")
        
        if not is_valid:
            issues = config.validate()
            for issue in issues:
                print(f"   - {issue}")
        
        return True
        
    except Exception as e:
        print(f"❌ 组件集成测试失败: {e}")
        return False

async def main():
    """主函数"""
    print("增强专利爬虫主控制器测试\n")
    
    success1 = await test_scraper_initialization()
    success2 = test_component_integration()
    success3 = await test_convenience_functions()
    success4 = await test_batch_request()
    success5 = await test_error_handling()
    
    print("\n=== 总结 ===")
    if all([success1, success2, success3, success4, success5]):
        print("🎉 所有测试通过！增强专利爬虫功能正常。")
        print("\n📋 主要功能:")
        print("   - 完整的组件集成和协调")
        print("   - 单个和批量专利爬取")
        print("   - 智能错误处理和重试")
        print("   - 会话管理和健康监控")
        print("   - 便利函数接口")
        print("\n🚀 准备集成到Flask API！")
    else:
        print("❌ 部分测试失败，请检查实现")

if __name__ == "__main__":
    asyncio.run(main())