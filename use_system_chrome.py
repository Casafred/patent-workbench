#!/usr/bin/env python3
"""
使用系统Chrome浏览器的测试脚本
"""

import subprocess
import os
from playwright.sync_api import sync_playwright

def find_chrome_executable():
    """查找系统Chrome浏览器路径"""
    possible_paths = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Users\{}\AppData\Local\Google\Chrome\Application\chrome.exe".format(os.getenv('USERNAME')),
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            return path
    return None

def test_system_chrome():
    """测试使用系统Chrome"""
    chrome_path = find_chrome_executable()
    
    if not chrome_path:
        print("❌ 未找到系统Chrome浏览器")
        return False
    
    print(f"✅ 找到Chrome浏览器: {chrome_path}")
    
    try:
        with sync_playwright() as p:
            # 使用系统Chrome
            browser = p.chromium.launch(
                executable_path=chrome_path,
                headless=True
            )
            
            page = browser.new_page()
            page.goto("https://www.google.com")
            title = page.title()
            
            print(f"✅ 成功访问Google，页面标题: {title}")
            
            browser.close()
            return True
            
    except Exception as e:
        print(f"❌ 使用系统Chrome失败: {e}")
        return False

if __name__ == "__main__":
    test_system_chrome()