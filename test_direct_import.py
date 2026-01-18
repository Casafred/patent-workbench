#!/usr/bin/env python3

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 直接导入测试
try:
    import backend.scraper.browser_manager as bm
    print("Module imported:", dir(bm))
    
    if hasattr(bm, 'PlaywrightBrowserManager'):
        print("✅ PlaywrightBrowserManager found")
        manager_class = getattr(bm, 'PlaywrightBrowserManager')
        print("Class:", manager_class)
    else:
        print("❌ PlaywrightBrowserManager not found")
        
except Exception as e:
    print(f"Import error: {e}")
    import traceback
    traceback.print_exc()