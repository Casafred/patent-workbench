#!/usr/bin/env python3
"""
检查Playwright浏览器安装状态的脚本
"""

def check_playwright_browsers():
    """检查Playwright浏览器安装状态"""
    try:
        from playwright.sync_api import sync_playwright
        
        print("=== Playwright浏览器检查 ===\n")
        
        with sync_playwright() as p:
            browsers = {
                "Chromium": p.chromium,
                "Firefox": p.firefox, 
                "WebKit": p.webkit
            }
            
            installed_browsers = []
            
            for name, browser_type in browsers.items():
                try:
                    # 尝试启动浏览器来检查是否已安装
                    browser = browser_type.launch(headless=True)
                    browser.close()
                    print(f"✅ {name}: 已安装")
                    installed_browsers.append(name)
                except Exception as e:
                    print(f"❌ {name}: 未安装 ({str(e)[:50]}...)")
            
            print(f"\n总结: {len(installed_browsers)}/3 个浏览器已安装")
            
            if installed_browsers:
                print(f"已安装的浏览器: {', '.join(installed_browsers)}")
                return True
            else:
                print("没有检测到已安装的浏览器")
                return False
                
    except ImportError:
        print("❌ Playwright未安装")
        return False
    except Exception as e:
        print(f"❌ 检查过程中出现错误: {e}")
        return False

if __name__ == "__main__":
    check_playwright_browsers()