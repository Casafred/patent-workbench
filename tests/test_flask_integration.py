"""
测试Flask集成

验证专利权利要求处理API是否正确集成到Flask应用中
"""

import sys
import os

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """测试所有必需的导入"""
    print("测试导入...")
    
    from app import app
    print("✓ Flask应用导入成功")
    
    from patent_claims_processor.services import ProcessingService, ExportService
    print("✓ 处理服务导入成功")
    
    from patent_claims_processor.processors import ExcelProcessor
    print("✓ Excel处理器导入成功")
    
    assert app is not None
    assert ProcessingService is not None
    assert ExportService is not None
    assert ExcelProcessor is not None

def test_routes():
    """测试路由是否正确注册"""
    print("\n测试路由注册...")
    
    from app import app
    
    # 获取所有路由
    routes = []
    for rule in app.url_map.iter_rules():
        routes.append(str(rule))
    
    # 检查专利权利要求处理相关路由
    required_routes = [
        '/api/claims/upload',
        '/api/claims/process',
        '/api/claims/status/<task_id>',
        '/api/claims/result/<task_id>',
        '/api/claims/export/<task_id>',
        '/api/claims/report/<task_id>'
    ]
    
    for route in required_routes:
        assert route in routes, f"路由未找到: {route}"
        print(f"✓ 路由已注册: {route}")

def test_upload_folder():
    """测试上传文件夹是否创建"""
    print("\n测试上传文件夹...")
    
    from app import UPLOAD_FOLDER
    
    assert os.path.exists(UPLOAD_FOLDER), f"上传文件夹不存在: {UPLOAD_FOLDER}"
    print(f"✓ 上传文件夹已创建: {UPLOAD_FOLDER}")

def main():
    """运行所有测试"""
    print("=" * 60)
    print("Flask集成测试")
    print("=" * 60)
    
    results = []
    
    # 运行测试
    results.append(("导入测试", test_imports()))
    results.append(("路由测试", test_routes()))
    results.append(("上传文件夹测试", test_upload_folder()))
    
    # 输出总结
    print("\n" + "=" * 60)
    print("测试总结")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✓ 通过" if result else "✗ 失败"
        print(f"{name}: {status}")
    
    print(f"\n总计: {passed}/{total} 测试通过")
    
    if passed == total:
        print("\n✓ 所有测试通过！Flask集成成功。")
        return 0
    else:
        print("\n✗ 部分测试失败，请检查错误信息。")
        return 1

if __name__ == '__main__':
    sys.exit(main())
