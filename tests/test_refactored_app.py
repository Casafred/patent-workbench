"""
测试重构后的应用
验证所有模块是否正确导入和工作
"""

import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def test_imports():
    """测试所有模块导入"""
    print("=" * 60)
    print("测试1: 模块导入测试")
    print("=" * 60)
    
    tests = []
    
    # 测试配置模块
    try:
        from backend.config import Config
        print("✓ Config 模块导入成功")
        tests.append(True)
    except Exception as e:
        print(f"✗ Config 模块导入失败: {e}")
        tests.append(False)
    
    # 测试扩展模块
    try:
        from backend.extensions import db, cors, limiter
        print("✓ Extensions 模块导入成功")
        tests.append(True)
    except Exception as e:
        print(f"✗ Extensions 模块导入失败: {e}")
        tests.append(False)
    
    # 测试工具模块
    try:
        from backend.utils.response import success_response, error_response
        from backend.utils.validators import validate_api_key
        print("✓ Utils 模块导入成功")
        tests.append(True)
    except Exception as e:
        print(f"✗ Utils 模块导入失败: {e}")
        tests.append(False)
    
    # 测试服务模块
    try:
        from backend.services.auth_service import AuthService
        from backend.services.api_service import APIService
        print("✓ Services 模块导入成功")
        tests.append(True)
    except Exception as e:
        print(f"✗ Services 模块导入失败: {e}")
        tests.append(False)
    
    # 测试中间件
    try:
        from backend.middleware.auth_middleware import login_required
        print("✓ Middleware 模块导入成功")
        tests.append(True)
    except Exception as e:
        print(f"✗ Middleware 模块导入失败: {e}")
        tests.append(False)
    
    # 测试路由模块
    try:
        from backend.routes import auth, chat, async_batch, files, patent, claims
        print("✓ Routes 模块导入成功")
        tests.append(True)
    except Exception as e:
        print(f"✗ Routes 模块导入失败: {e}")
        tests.append(False)
    
    # 测试应用工厂
    try:
        from backend.app import create_app
        print("✓ Application Factory 导入成功")
        tests.append(True)
    except Exception as e:
        print(f"✗ Application Factory 导入失败: {e}")
        tests.append(False)
    
    print(f"\n导入测试结果: {sum(tests)}/{len(tests)} 通过")
    return all(tests)


def test_app_creation():
    """测试应用创建"""
    print("\n" + "=" * 60)
    print("测试2: 应用创建测试")
    print("=" * 60)
    
    try:
        from backend.app import create_app
        app = create_app()
        
        print("✓ 应用创建成功")
        print(f"✓ 应用名称: {app.name}")
        print(f"✓ 调试模式: {app.debug}")
        
        # 检查蓝图注册
        blueprints = list(app.blueprints.keys())
        print(f"✓ 已注册的蓝图: {', '.join(blueprints)}")
        
        expected_blueprints = ['auth', 'chat', 'async_batch', 'files', 'patent', 'claims']
        missing = [bp for bp in expected_blueprints if bp not in blueprints]
        
        if missing:
            print(f"⚠ 缺少蓝图: {', '.join(missing)}")
            return False
        else:
            print(f"✓ 所有预期蓝图都已注册")
        
        return True
        
    except Exception as e:
        print(f"✗ 应用创建失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_routes():
    """测试路由注册"""
    print("\n" + "=" * 60)
    print("测试3: 路由注册测试")
    print("=" * 60)
    
    try:
        from backend.app import create_app
        app = create_app()
        
        # 获取所有路由
        routes = []
        for rule in app.url_map.iter_rules():
            if rule.endpoint != 'static':
                routes.append({
                    'endpoint': rule.endpoint,
                    'methods': ','.join(sorted(rule.methods - {'HEAD', 'OPTIONS'})),
                    'path': str(rule)
                })
        
        print(f"✓ 共注册 {len(routes)} 个路由")
        
        # 按蓝图分组显示
        from collections import defaultdict
        by_blueprint = defaultdict(list)
        
        for route in routes:
            blueprint = route['endpoint'].split('.')[0] if '.' in route['endpoint'] else 'main'
            by_blueprint[blueprint].append(route)
        
        for blueprint, blueprint_routes in sorted(by_blueprint.items()):
            print(f"\n  [{blueprint}] - {len(blueprint_routes)} 个路由")
            for route in sorted(blueprint_routes, key=lambda x: x['path'])[:3]:  # 只显示前3个
                print(f"    {route['methods']:15} {route['path']}")
            if len(blueprint_routes) > 3:
                print(f"    ... 还有 {len(blueprint_routes) - 3} 个路由")
        
        return True
        
    except Exception as e:
        print(f"✗ 路由测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_css_structure():
    """测试CSS文件结构"""
    print("\n" + "=" * 60)
    print("测试4: CSS文件结构测试")
    print("=" * 60)
    
    css_base_path = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'css')
    
    expected_structure = {
        'base': ['variables.css', 'reset.css', 'animations.css'],
        'layout': ['container.css', 'header.css', 'steps.css'],
        'components': ['buttons.css', 'forms.css', 'modals.css', 'info-boxes.css', 
                      'dropdowns.css', 'tabs.css', 'tables.css', 'lists.css'],
        'pages': ['chat.css', 'claims.css']
    }
    
    all_found = True
    
    # 检查主CSS文件
    main_css = os.path.join(css_base_path, 'main.css')
    if os.path.exists(main_css):
        print("✓ 主CSS文件存在: main.css")
    else:
        print("✗ 主CSS文件不存在: main.css")
        all_found = False
    
    # 检查各个目录和文件
    for directory, files in expected_structure.items():
        dir_path = os.path.join(css_base_path, directory)
        if os.path.exists(dir_path):
            print(f"✓ 目录存在: {directory}/")
            
            for file in files:
                file_path = os.path.join(dir_path, file)
                if os.path.exists(file_path):
                    print(f"  ✓ {file}")
                else:
                    print(f"  ✗ {file} (缺失)")
                    all_found = False
        else:
            print(f"✗ 目录不存在: {directory}/")
            all_found = False
    
    if all_found:
        print("\n✓ CSS文件结构完整")
    else:
        print("\n⚠ CSS文件结构不完整")
    
    return all_found


def test_html_css_references():
    """测试HTML文件中的CSS引用"""
    print("\n" + "=" * 60)
    print("测试5: HTML CSS引用测试")
    print("=" * 60)
    
    html_files = [
        'frontend/index.html',
        'frontend/help.html',
        'frontend/claims_processor.html'
    ]
    
    all_correct = True
    
    for html_file in html_files:
        file_path = os.path.join(os.path.dirname(__file__), '..', html_file)
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # 检查是否引用了css/main.css
            if 'css/main.css' in content:
                print(f"✓ {html_file} - 正确引用 css/main.css")
            else:
                print(f"⚠ {html_file} - 未找到 css/main.css 引用")
                all_correct = False
        else:
            print(f"✗ {html_file} - 文件不存在")
            all_correct = False
    
    return all_correct


def main():
    """运行所有测试"""
    print("\n" + "=" * 60)
    print("重构后应用完整性测试")
    print("=" * 60)
    
    results = []
    
    # 运行所有测试
    results.append(("模块导入", test_imports()))
    results.append(("应用创建", test_app_creation()))
    results.append(("路由注册", test_routes()))
    results.append(("CSS结构", test_css_structure()))
    results.append(("HTML引用", test_html_css_references()))
    
    # 总结
    print("\n" + "=" * 60)
    print("测试总结")
    print("=" * 60)
    
    for name, result in results:
        status = "✓ 通过" if result else "✗ 失败"
        print(f"{name:15} {status}")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    print(f"\n总计: {passed}/{total} 测试通过")
    
    if passed == total:
        print("\n🎉 所有测试通过！应用重构成功！")
        return 0
    else:
        print(f"\n⚠ {total - passed} 个测试失败，请检查")
        return 1


if __name__ == '__main__':
    exit_code = main()
    sys.exit(exit_code)
