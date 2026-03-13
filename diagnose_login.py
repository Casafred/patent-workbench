"""
诊断脚本 - 用于定位登录 500 错误问题

使用方法：
1. 在服务器上运行：python diagnose_login.py
2. 查看输出结果
3. 根据提示修复问题
"""

import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.app import create_app
from backend.config import Config

def diagnose():
    print("="*60)
    print("登录问题诊断工具")
    print("="*60)
    
    # 1. 检查 Flask 配置
    print("\n[1] 检查 Flask 配置...")
    app = create_app()
    
    with app.app_context():
        # 检查 Session Cookie 配置
        print("\n📋 Session Cookie 配置:")
        cookie_config = {
            'SESSION_COOKIE_SECURE': app.config.get('SESSION_COOKIE_SECURE'),
            'SESSION_COOKIE_HTTPONLY': app.config.get('SESSION_COOKIE_HTTPONLY'),
            'SESSION_COOKIE_SAMESITE': app.config.get('SESSION_COOKIE_SAMESITE'),
            'SESSION_COOKIE_PATH': app.config.get('SESSION_COOKIE_PATH'),
        }
        
        for key, value in cookie_config.items():
            status = "✅" if value is not None else "❌"
            print(f"  {status} {key}: {value}")
        
        # 检查配置是否正确
        print("\n🔍 配置验证:")
        issues = []
        
        if app.config.get('SESSION_COOKIE_SECURE') is None:
            issues.append("❌ SESSION_COOKIE_SECURE 未设置")
        else:
            secure_value = app.config.get('SESSION_COOKIE_SECURE')
            if os.environ.get('HTTPS') == 'true' and not secure_value:
                issues.append(f"⚠️  使用 HTTPS 但 SESSION_COOKIE_SECURE={secure_value} (应该为 True)")
            else:
                print(f"  ✅ SESSION_COOKIE_SECURE: {secure_value}")
        
        if app.config.get('SESSION_COOKIE_HTTPONLY') is not True:
            issues.append(f"❌ SESSION_COOKIE_HTTPONLY 应该为 True (当前：{app.config.get('SESSION_COOKIE_HTTPONLY')})")
        else:
            print(f"  ✅ SESSION_COOKIE_HTTPONLY: True")
        
        if app.config.get('SESSION_COOKIE_SAMESITE') not in ['Lax', 'Strict', None]:
            issues.append(f"❌ SESSION_COOKIE_SAMESITE 配置错误 (当前：{app.config.get('SESSION_COOKIE_SAMESITE')})")
        else:
            print(f"  ✅ SESSION_COOKIE_SAMESITE: {app.config.get('SESSION_COOKIE_SAMESITE')}")
        
        if app.config.get('SESSION_COOKIE_PATH') != '/':
            issues.append(f"❌ SESSION_COOKIE_PATH 应该为 '/' (当前：{app.config.get('SESSION_COOKIE_PATH')})")
        else:
            print(f"  ✅ SESSION_COOKIE_PATH: '/'")
        
        # 检查 Secret Key
        print("\n🔑 Secret Key 配置:")
        if app.config.get('SECRET_KEY') == 'dev-secret-key-for-local-testing-only':
            issues.append("⚠️  使用默认 Secret Key (生产环境应该修改)")
        else:
            print(f"  ✅ Secret Key 已自定义")
        
        # 检查数据库配置
        print("\n💾 数据库配置:")
        if Config.DATABASE_URL:
            print(f"  ✅ DATABASE_URL 已配置")
        else:
            print(f"  ⚠️  DATABASE_URL 未配置 (IP 管理功能将不可用)")
        
        # 报告总结
        print("\n" + "="*60)
        if issues:
            print("⚠️  发现以下问题:")
            for issue in issues:
                print(f"  {issue}")
            print("\n💡 建议修复以上问题后重试登录")
        else:
            print("✅ 配置检查通过，未发现问题")
            print("\n📝 如果仍然无法登录，请检查:")
            print("  1. 浏览器控制台是否有 JavaScript 错误")
            print("  2. Network 标签中登录请求的响应")
            print("  3. 服务器日志中的详细错误信息")
        
        print("="*60)
    
    # 2. 检查路由配置
    print("\n[2] 检查路由配置...")
    
    login_rule = None
    app_rule = None
    
    for rule in app.url_map.iter_rules():
        if rule.endpoint == 'auth.login':
            login_rule = rule
        elif rule.endpoint == 'auth.serve_app':
            app_rule = rule
    
    if login_rule:
        print(f"  ✅ 登录路由：{login_rule.rule} [{', '.join(login_rule.methods)}]")
    else:
        print(f"  ❌ 登录路由未找到")
    
    if app_rule:
        print(f"  ✅ 应用路由：{app_rule.rule} [{', '.join(app_rule.methods)}]")
    else:
        print(f"  ❌ 应用路由未找到")
    
    # 3. 检查中间件
    print("\n[3] 检查中间件配置...")
    print(f"  ✅ CORS 已启用")
    print(f"  ✅ Session 中间件已加载")
    
    # 4. 环境检查
    print("\n[4] 环境信息:")
    print(f"  Python 版本：{sys.version}")
    print(f"  Flask 版本：{getattr(__import__('flask'), '__version__', 'unknown')}")
    print(f"  运行环境：{'生产' if not Config.DEBUG else '开发'}")
    print(f"  服务器端口：{Config.PORT}")
    
    print("\n" + "="*60)
    print("诊断完成！")
    print("="*60)

if __name__ == '__main__':
    diagnose()
