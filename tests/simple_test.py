#!/usr/bin/env python3
"""
简化的浏览器测试
"""

import asyncio
import sys
import os

# 直接导入
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from backend.scraper.config import ScrapingConfig
    print("✅ Config import successful")
except Exception as e:
    print(f"❌ Config import failed: {e}")
    sys.exit(1)

try:
    from backend.scraper.browser_manager import PlaywrightBrowserManager
    print("✅ BrowserManager import successful")
except Exception as e:
    print(f"❌ BrowserManager import failed: {e}")
    sys.exit(1)

async def simple_test():
    """简单测试"""
    config = ScrapingConfig()
    manager = PlaywrightBrowserManager(config)
    
    # 测试系统Chrome检测
    chrome_path = manager._find_system_chrome()
    if chrome_path:
        print(f"✅ System Chrome found: {chrome_path}")
    else:
        print("❌ System Chrome not found")
    
    return True

if __name__ == "__main__":
    asyncio.run(simple_test())