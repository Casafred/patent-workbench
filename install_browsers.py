#!/usr/bin/env python3
"""
Playwright浏览器安装脚本

这个脚本可以帮助你手动安装Playwright浏览器。
你可以在需要的时候运行这个脚本，而不是在每次启动时自动安装。
"""

import subprocess
import sys
import os


def install_playwright_browsers():
    """安装Playwright浏览器"""
    print("开始安装Playwright浏览器...")
    print("这可能需要几分钟时间，请耐心等待...")
    
    try:
        # 安装所有浏览器
        result = subprocess.run([
            sys.executable, "-m", "playwright", "install"
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ Playwright浏览器安装成功！")
            print(result.stdout)
        else:
            print("❌ 浏览器安装失败:")
            print(result.stderr)
            return False
            
    except Exception as e:
        print(f"❌ 安装过程中出现错误: {e}")
        return False
    
    return True


def install_chromium_only():
    """只安装Chromium浏览器（推荐，体积较小）"""
    print("开始安装Chromium浏览器...")
    
    try:
        result = subprocess.run([
            sys.executable, "-m", "playwright", "install", "chromium"
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ Chromium浏览器安装成功！")
            print(result.stdout)
        else:
            print("❌ Chromium安装失败:")
            print(result.stderr)
            return False
            
    except Exception as e:
        print(f"❌ 安装过程中出现错误: {e}")
        return False
    
    return True


def check_browsers_installed():
    """检查浏览器是否已安装"""
    try:
        result = subprocess.run([
            sys.executable, "-m", "playwright", "install", "--dry-run"
        ], capture_output=True, text=True)
        
        if "chromium" in result.stdout.lower():
            print("ℹ️  检测到需要安装浏览器")
            return False
        else:
            print("✅ 浏览器已安装")
            return True
            
    except Exception as e:
        print(f"⚠️  无法检查浏览器状态: {e}")
        return False


def main():
    print("=== Playwright浏览器安装工具 ===\n")
    
    # 检查当前状态
    if check_browsers_installed():
        print("浏览器已经安装，无需重复安装。")
        return
    
    print("请选择安装选项:")
    print("1. 只安装Chromium（推荐，体积小，速度快）")
    print("2. 安装所有浏览器（Chromium, Firefox, WebKit）")
    print("3. 退出")
    
    while True:
        choice = input("\n请输入选择 (1/2/3): ").strip()
        
        if choice == "1":
            success = install_chromium_only()
            break
        elif choice == "2":
            success = install_playwright_browsers()
            break
        elif choice == "3":
            print("退出安装。")
            return
        else:
            print("无效选择，请输入 1、2 或 3")
    
    if success:
        print("\n🎉 安装完成！现在可以使用增强的专利爬虫功能了。")
    else:
        print("\n❌ 安装失败，请检查网络连接或手动运行:")
        print("   python -m playwright install chromium")


if __name__ == "__main__":
    main()