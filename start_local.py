#!/usr/bin/env python3
"""
本地启动脚本
用于在本地快速启动和测试应用
"""

import os
import sys
import subprocess
import webbrowser
import time

def main():
    print("🚀 启动AI专利工作台...")
    
    # 设置本地环境变量
    os.environ['FLASK_ENV'] = 'development'
    os.environ['SECRET_KEY'] = 'dev-secret-key-change-in-production'
    os.environ['ADMIN_USERNAME'] = 'admin'
    os.environ['ADMIN_PASSWORD'] = 'admin123'
    
    # 检查依赖
    try:
        import flask
        import zhipuai
        import werkzeug
        print("✅ 依赖检查通过")
    except ImportError as e:
        print(f"❌ 缺少依赖: {e}")
        print("正在安装依赖...")
        subprocess.run([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'])
    
    # 启动应用
    print("🌐 正在启动本地服务器...")
    print("访问地址: http://localhost:5000")
    print("管理员后台: http://localhost:5000/admin")
    print("按 Ctrl+C 停止")
    
    # 延迟2秒后自动打开浏览器
    time.sleep(2)
    webbrowser.open('http://localhost:5000')
    
    # 启动Flask应用
    subprocess.run([sys.executable, '-m', 'flask', 'run', '--host=0.0.0.0', '--port=5000'])

if __name__ == "__main__":
    main()