#!/usr/bin/env python3
"""
测试浏览器管理器的脚本
"""

import asyncio
import sys
import os

# 添加项目路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.scraper.config import ScrapingConfig
from backend.scraper.browser_manager import PlaywrightBrowserManager


async def test_browser_manager():
    """测试浏览器管理器"""
    print("=== 测试Playwright浏览器管理器 ===\n")
    
    # 创建配置
    config = ScrapingConfig.get_default_config()
    config.headless = True  # 确保无头模式
    
    print(f"配置: {config.browser_type}, headless={config.headless}")
    
    # 创建浏览器管理器
    browser_manager = PlaywrightBrowserManager(config)
    
    try:
        # 测试浏览器初始化
        print("1. 初始化浏览器...")
        await browser_manager.initialize_browser()
        print("✅ 浏览器初始化成功")
        
        # 测试创建隐身上下文
        print("\n2. 创建隐身上下文...")
        context = await browser_manager.create_stealth_context()
        print("✅ 隐身上下文创建成功")
        
        # 测试获取页面
        print("\n3. 获取页面...")
        page = await browser_manager.get_page()
        print("✅ 页面获取成功")
        
        # 测试导航到Google Patents
        print("\n4. 测试导航到Google Patents...")
        test_patent = "US10000000A1"
        await browser_manager.navigate_to_patent(test_patent)
        
        # 获取页面标题
        title = await page.title()
        print(f"✅ 成功访问专利页面，标题: {title[:50]}...")
        
        # 检查页面内容
        content = await page.content()
        if "patents.google.com" in content:
            print("✅ 页面内容验证成功")
        else:
            print("⚠️  页面内容可能不正确")
        
        return True
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        return False
        
    finally:
        # 清理资源
        print("\n5. 清理资源...")
        await browser_manager.cleanup()
        print("✅ 资源清理完成")


async def test_system_chrome_detection():
    """测试系统Chrome检测"""
    print("=== 测试系统Chrome检测 ===\n")
    
    config = ScrapingConfig.get_default_config()
    browser_manager = PlaywrightBrowserManager(config)
    
    chrome_path = browser_manager._find_system_chrome()
    if chrome_path:
        print(f"✅ 找到系统Chrome: {chrome_path}")
        return True
    else:
        print("❌ 未找到系统Chrome")
        return False


async def main():
    """主函数"""
    print("开始测试浏览器管理器...\n")
    
    # 测试系统Chrome检测
    chrome_detected = await test_system_chrome_detection()
    
    if chrome_detected:
        print("\n" + "="*50 + "\n")
        # 测试完整的浏览器管理器
        success = await test_browser_manager()
        
        if success:
            print("\n🎉 所有测试通过！浏览器管理器工作正常。")
        else:
            print("\n❌ 测试失败，请检查配置。")
    else:
        print("\n⚠️  系统Chrome未检测到，可能需要安装Playwright浏览器。")


if __name__ == "__main__":
    asyncio.run(main())