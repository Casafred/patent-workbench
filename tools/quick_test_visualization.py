#!/usr/bin/env python3
"""
快速测试功能七可视化增强
验证应用是否正常运行
"""

import requests
import json
import time
import os

BASE_URL = "http://localhost:5001"

def test_server_running():
    """测试服务器是否运行"""
    print("\n" + "="*60)
    print("测试1: 服务器运行状态")
    print("="*60)
    
    try:
        response = requests.get(f"{BASE_URL}/", timeout=5)
        if response.status_code == 200:
            print("✅ 服务器正常运行")
            print(f"   状态码: {response.status_code}")
            return True
        else:
            print(f"⚠️  服务器响应异常: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ 无法连接到服务器")
        print("   请确保应用已启动: python run_app.py")
        return False
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        return False


def test_static_files():
    """测试静态文件是否可访问"""
    print("\n" + "="*60)
    print("测试2: 静态文件访问")
    print("="*60)
    
    files_to_test = [
        "/js/claimsProcessorIntegrated.js",
        "/frontend/css/pages/claims.css",
        "/frontend/index.html"
    ]
    
    all_ok = True
    for file_path in files_to_test:
        try:
            response = requests.get(f"{BASE_URL}{file_path}", timeout=5)
            if response.status_code == 200:
                print(f"✅ {file_path}")
            else:
                print(f"⚠️  {file_path} - 状态码: {response.status_code}")
                all_ok = False
        except Exception as e:
            print(f"❌ {file_path} - 错误: {e}")
            all_ok = False
    
    return all_ok


def test_javascript_functions():
    """测试JavaScript文件内容"""
    print("\n" + "="*60)
    print("测试3: JavaScript函数检查")
    print("="*60)
    
    js_file = "js/claimsProcessorIntegrated.js"
    
    if not os.path.exists(js_file):
        print(f"❌ 文件不存在: {js_file}")
        return False
    
    with open(js_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    functions = [
        'setTreeSpreadFactor',
        'captureHighResScreenshot',
        'showClaimsPatentSummarySection',
        'renderNetwork',
        'renderTree'
    ]
    
    all_found = True
    for func in functions:
        if func in content:
            print(f"✅ 找到函数: {func}")
        else:
            print(f"❌ 缺少函数: {func}")
            all_found = False
    
    # 检查关键代码
    if 'marker-end' in content and 'arrowhead' in content:
        print("✅ 箭头标记代码存在")
    else:
        print("❌ 箭头标记代码缺失")
        all_found = False
    
    if 'spreadFactor' in content:
        print("✅ 散开因子代码存在")
    else:
        print("❌ 散开因子代码缺失")
        all_found = False
    
    return all_found


def test_css_styles():
    """测试CSS样式"""
    print("\n" + "="*60)
    print("测试4: CSS样式检查")
    print("="*60)
    
    css_file = "frontend/css/pages/claims.css"
    
    if not os.path.exists(css_file):
        print(f"❌ 文件不存在: {css_file}")
        return False
    
    with open(css_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    styles = [
        '.row-index-badge',
        '.merged-claims-content',
        'white-space: pre-wrap',
        'max-height: 150px'
    ]
    
    all_found = True
    for style in styles:
        if style in content:
            print(f"✅ 找到样式: {style}")
        else:
            print(f"❌ 缺少样式: {style}")
            all_found = False
    
    return all_found


def test_html_controls():
    """测试HTML控件"""
    print("\n" + "="*60)
    print("测试5: HTML控件检查")
    print("="*60)
    
    html_file = "frontend/index.html"
    
    if not os.path.exists(html_file):
        print(f"❌ 文件不存在: {html_file}")
        return False
    
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    controls = [
        'claims_tree_spread_slider',
        'claims_tree_spread_value',
        'claims_screenshot_btn',
        'claims_style_selector'
    ]
    
    all_found = True
    for control in controls:
        if control in content:
            print(f"✅ 找到控件: {control}")
        else:
            print(f"❌ 缺少控件: {control}")
            all_found = False
    
    return all_found


def print_summary(results):
    """打印测试总结"""
    print("\n" + "="*60)
    print("📊 测试总结")
    print("="*60)
    
    total = len(results)
    passed = sum(results.values())
    failed = total - passed
    
    print(f"\n总测试数: {total}")
    print(f"通过: {passed} ✅")
    print(f"失败: {failed} ❌")
    print(f"通过率: {(passed/total*100):.1f}%")
    
    print("\n详细结果:")
    for test_name, result in results.items():
        status = "✅ 通过" if result else "❌ 失败"
        print(f"  {test_name}: {status}")
    
    if failed == 0:
        print("\n🎉 所有测试通过！可以进行浏览器测试。")
        print("\n下一步:")
        print("  1. 打开浏览器访问: http://localhost:5001")
        print("  2. 参考文档: docs/fixes/功能七浏览器测试指南.md")
        print("  3. 按照指南进行手动测试")
    else:
        print("\n⚠️  部分测试失败，请检查上述错误信息。")
    
    print("="*60 + "\n")


def main():
    """主函数"""
    print("\n" + "="*70)
    print("🧪 功能七可视化增强 - 快速验证测试")
    print("="*70)
    print("\n此测试将验证:")
    print("  1. 服务器运行状态")
    print("  2. 静态文件访问")
    print("  3. JavaScript函数完整性")
    print("  4. CSS样式定义")
    print("  5. HTML控件存在")
    
    results = {}
    
    # 运行测试
    results["服务器运行"] = test_server_running()
    time.sleep(0.5)
    
    results["静态文件"] = test_static_files()
    time.sleep(0.5)
    
    results["JavaScript函数"] = test_javascript_functions()
    time.sleep(0.5)
    
    results["CSS样式"] = test_css_styles()
    time.sleep(0.5)
    
    results["HTML控件"] = test_html_controls()
    
    # 打印总结
    print_summary(results)


if __name__ == "__main__":
    main()
