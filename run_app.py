#!/usr/bin/env python3
"""
启动脚本 - 使用重构后的应用
"""

from backend.app import create_app
from backend.config import Config

if __name__ == '__main__':
    app = create_app()
    print("\n" + "="*60)
    print("🚀 启动应用...")
    print(f"📍 访问地址: http://localhost:{Config.PORT}")
    print(f"👤 用户管理: http://localhost:{Config.PORT}/user-management")
    print("="*60 + "\n")
    
    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=Config.DEBUG
    )
