#!/usr/bin/env python3

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("=== 调试模块导入问题 ===")

try:
    print("1. 尝试导入模块...")
    import backend.scraper.browser_manager as bm
    print("✅ 模块导入成功")
    
    print("2. 检查模块内容...")
    module_contents = [x for x in dir(bm) if not x.startswith('_')]
    print(f"模块内容: {module_contents}")
    
    print("3. 检查是否有PlaywrightBrowserManager...")
    if 'PlaywrightBrowserManager' in dir(bm):
        print("✅ 找到PlaywrightBrowserManager")
        cls = getattr(bm, 'PlaywrightBrowserManager')
        print(f"类型: {type(cls)}")
    else:
        print("❌ 未找到PlaywrightBrowserManager")
        
    print("4. 尝试直接执行文件内容...")
    with open('backend/scraper/browser_manager.py', 'r', encoding='utf-8') as f:
        content = f.read()
    
    print(f"文件长度: {len(content)} 字符")
    print(f"文件前100字符: {content[:100]}")
    
    # 在新的命名空间中执行
    namespace = {}
    exec(content, namespace)
    
    if 'PlaywrightBrowserManager' in namespace:
        print("✅ 直接执行找到了PlaywrightBrowserManager")
    else:
        print("❌ 直接执行也没找到PlaywrightBrowserManager")
        print(f"命名空间内容: {[k for k in namespace.keys() if not k.startswith('_')]}")
        
except Exception as e:
    print(f"❌ 错误: {e}")
    import traceback
    traceback.print_exc()