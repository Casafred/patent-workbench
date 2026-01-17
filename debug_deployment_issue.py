#!/usr/bin/env python3
"""
调试部署版本中专利查询功能缺失的问题

检查可能的原因：
1. JavaScript文件路径问题
2. DOM元素获取失败
3. 事件监听器注册失败
4. API路由问题
"""

import os
import re
from pathlib import Path

def check_file_paths():
    """检查文件路径和引用"""
    print("🔍 检查文件路径和引用...")
    
    # 检查关键文件是否存在
    files_to_check = [
        "frontend/claims_processor.html",
        "js/claimsProcessor.js",
        "backend/routes/excel_upload.py",
        "backend/routes/claims.py"
    ]
    
    print("   关键文件存在性检查:")
    for file_path in files_to_check:
        if os.path.exists(file_path):
            print(f"   ✓ {file_path}")
        else:
            print(f"   ✗ {file_path}")
    
    # 检查HTML中的JavaScript引用
    html_file = "frontend/claims_processor.html"
    if os.path.exists(html_file):
        with open(html_file, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        print("\n   HTML中的JavaScript引用:")
        js_refs = re.findall(r'<script[^>]*src="([^"]*)"[^>]*>', html_content)
        for ref in js_refs:
            print(f"   - {ref}")
            
            # 检查相对路径文件是否存在
            if not ref.startswith('http'):
                # 从frontend目录的角度检查
                relative_path = ref
                if ref.startswith('../'):
                    file_path = ref[3:]  # 去掉 ../
                elif ref.startswith('./'):
                    file_path = f"frontend/{ref[2:]}"  # 去掉 ./
                else:
                    file_path = ref
                
                if os.path.exists(file_path):
                    print(f"     ✓ 文件存在: {file_path}")
                else:
                    print(f"     ✗ 文件不存在: {file_path}")

def check_javascript_issues():
    """检查JavaScript代码中的潜在问题"""
    print("\n🔍 检查JavaScript代码问题...")
    
    js_file = "js/claimsProcessor.js"
    if not os.path.exists(js_file):
        print(f"   ✗ JavaScript文件不存在: {js_file}")
        return
    
    with open(js_file, 'r', encoding='utf-8') as f:
        js_content = f.read()
    
    # 检查关键函数和变量
    checks = [
        ("showPatentQuerySection函数", r'function showPatentQuerySection'),
        ("patentQuerySection变量", r'patentQuerySection\s*='),
        ("displayResults函数重写", r'originalDisplayResults\s*='),
        ("DOM元素获取", r'document\.getElementById\([\'"]patentQuerySection[\'"]'),
        ("事件监听器注册", r'searchPatentBtn.*addEventListener'),
        ("D3TreeRenderer类", r'class D3TreeRenderer'),
    ]
    
    print("   JavaScript功能检查:")
    for check_name, pattern in checks:
        if re.search(pattern, js_content):
            print(f"   ✓ {check_name}")
        else:
            print(f"   ✗ {check_name}")
    
    # 检查可能的语法错误
    print("\n   潜在问题检查:")
    
    # 检查是否有未闭合的函数或类
    open_braces = js_content.count('{')
    close_braces = js_content.count('}')
    if open_braces != close_braces:
        print(f"   ⚠ 大括号不匹配: 开 {open_braces}, 闭 {close_braces}")
    else:
        print(f"   ✓ 大括号匹配: {open_braces}")
    
    # 检查是否有console.log调试信息
    console_logs = re.findall(r'console\.log\([^)]*\)', js_content)
    if console_logs:
        print(f"   ℹ 发现 {len(console_logs)} 个console.log调试语句")
    
    # 检查版本信息
    version_match = re.search(r'版本:\s*([0-9.]+)', js_content)
    if version_match:
        print(f"   ℹ JavaScript版本: {version_match.group(1)}")

def check_html_structure():
    """检查HTML结构"""
    print("\n🔍 检查HTML结构...")
    
    html_file = "frontend/claims_processor.html"
    if not os.path.exists(html_file):
        print(f"   ✗ HTML文件不存在: {html_file}")
        return
    
    with open(html_file, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # 检查关键元素
    elements = [
        ("专利查询区域", r'id="patentQuerySection"'),
        ("搜索输入框", r'id="patentSearchInput"'),
        ("搜索按钮", r'id="searchPatentBtn"'),
        ("可视化按钮", r'id="visualizePatentBtn"'),
        ("可视化区域", r'id="visualizationSection"'),
        ("D3.js库", r'https://d3js\.org/d3\.v7\.min\.js'),
        ("权利要求处理脚本", r'js/claimsProcessor\.js')
    ]
    
    print("   HTML元素检查:")
    for element_name, pattern in elements:
        if re.search(pattern, html_content):
            print(f"   ✓ {element_name}")
        else:
            print(f"   ✗ {element_name}")
    
    # 检查专利查询区域的默认状态
    patent_section_match = re.search(r'id="patentQuerySection"[^>]*style="([^"]*)"', html_content)
    if patent_section_match:
        style = patent_section_match.group(1)
        print(f"   ℹ 专利查询区域默认样式: {style}")
        if 'display: none' in style:
            print("   ✓ 专利查询区域默认隐藏（符合设计）")

def check_backend_routes():
    """检查后端路由注册"""
    print("\n🔍 检查后端路由...")
    
    routes_init = "backend/routes/__init__.py"
    if os.path.exists(routes_init):
        with open(routes_init, 'r', encoding='utf-8') as f:
            routes_content = f.read()
        
        # 检查路由注册
        route_checks = [
            ("Excel上传路由", r'excel_upload_bp'),
            ("权利要求路由", r'claims_bp'),
            ("专利查询路由", r'patent_query_bp'),
        ]
        
        print("   路由注册检查:")
        for route_name, pattern in route_checks:
            if re.search(pattern, routes_content):
                print(f"   ✓ {route_name}")
            else:
                print(f"   ✗ {route_name}")

def generate_fix_suggestions():
    """生成修复建议"""
    print("\n" + "="*60)
    print("🛠️ 部署问题修复建议")
    print("="*60)
    
    print("\n1. 检查JavaScript文件路径问题:")
    print("   - 在Render部署中，确保js/claimsProcessor.js文件被正确上传")
    print("   - 检查静态文件服务配置")
    print("   - 验证相对路径是否正确")
    
    print("\n2. 检查DOM元素获取:")
    print("   - 在浏览器开发者工具中检查console错误")
    print("   - 验证所有getElementById调用是否成功")
    print("   - 确认HTML元素ID没有重复")
    
    print("\n3. 检查事件监听器:")
    print("   - 确认DOMContentLoaded事件正确触发")
    print("   - 验证所有事件监听器正确绑定")
    print("   - 检查函数作用域问题")
    
    print("\n4. 检查API路由:")
    print("   - 验证/api/excel/upload端点可访问")
    print("   - 确认/api/excel/{file_id}/search端点工作正常")
    print("   - 检查CORS配置")
    
    print("\n5. 调试步骤:")
    print("   - 在浏览器中打开开发者工具(F12)")
    print("   - 查看Console标签的错误信息")
    print("   - 检查Network标签的API请求")
    print("   - 在Console中手动执行:")
    print("     document.getElementById('patentQuerySection').style.display = 'block'")
    
    print("\n6. 临时修复方案:")
    print("   - 如果JavaScript加载失败，可以尝试内联JavaScript")
    print("   - 如果路径问题，可以使用绝对路径")
    print("   - 如果DOM问题，可以添加延迟加载")

def main():
    """主函数"""
    print("="*80)
    print("🔍 部署版本专利查询功能缺失问题诊断")
    print("="*80)
    
    check_file_paths()
    check_javascript_issues()
    check_html_structure()
    check_backend_routes()
    generate_fix_suggestions()
    
    print("\n" + "="*80)
    print("📋 诊断完成")
    print("="*80)

if __name__ == "__main__":
    main()