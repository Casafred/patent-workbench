#!/usr/bin/env python3
"""
修复部署版本中的文件路径问题

主要问题：
1. HTML文件中JavaScript路径不正确
2. 静态文件服务配置问题
"""

import os
import re
import shutil

def fix_javascript_paths():
    """修复JavaScript文件路径"""
    print("🔧 修复JavaScript文件路径...")
    
    html_file = "frontend/claims_processor.html"
    
    if not os.path.exists(html_file):
        print(f"   ✗ HTML文件不存在: {html_file}")
        return False
    
    # 读取HTML文件
    with open(html_file, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # 备份原文件
    backup_file = html_file + '.backup'
    with open(backup_file, 'w', encoding='utf-8') as f:
        f.write(html_content)
    print(f"   ✓ 已备份原文件: {backup_file}")
    
    # 修复JavaScript路径
    # 从 js/claimsProcessor.js 改为 ../js/claimsProcessor.js
    original_path = 'js/claimsProcessor.js?v=2.1.0'
    new_path = '../js/claimsProcessor.js?v=2.1.0'
    
    if original_path in html_content:
        html_content = html_content.replace(original_path, new_path)
        print(f"   ✓ 已修复JavaScript路径: {original_path} → {new_path}")
    else:
        print(f"   ⚠ 未找到需要修复的路径: {original_path}")
    
    # 写回文件
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f"   ✓ 已更新HTML文件: {html_file}")
    return True

def copy_js_to_frontend():
    """将JavaScript文件复制到frontend目录"""
    print("\n🔧 复制JavaScript文件到frontend目录...")
    
    source_js = "js/claimsProcessor.js"
    target_dir = "frontend/js"
    target_js = os.path.join(target_dir, "claimsProcessor.js")
    
    if not os.path.exists(source_js):
        print(f"   ✗ 源JavaScript文件不存在: {source_js}")
        return False
    
    # 创建目标目录
    if not os.path.exists(target_dir):
        os.makedirs(target_dir)
        print(f"   ✓ 已创建目录: {target_dir}")
    
    # 复制文件
    shutil.copy2(source_js, target_js)
    print(f"   ✓ 已复制文件: {source_js} → {target_js}")
    
    return True

def update_html_for_local_js():
    """更新HTML使用本地JavaScript文件"""
    print("\n🔧 更新HTML使用本地JavaScript文件...")
    
    html_file = "frontend/claims_processor.html"
    
    if not os.path.exists(html_file):
        print(f"   ✗ HTML文件不存在: {html_file}")
        return False
    
    # 读取HTML文件
    with open(html_file, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # 修改JavaScript引用为本地路径
    old_pattern = r'<script src="\.\.\/js\/claimsProcessor\.js\?v=2\.1\.0"></script>'
    new_script = '<script src="js/claimsProcessor.js?v=2.1.0"></script>'
    
    if re.search(old_pattern, html_content):
        html_content = re.sub(old_pattern, new_script, html_content)
        print(f"   ✓ 已更新为本地JavaScript路径")
    else:
        # 如果没找到，直接替换
        html_content = html_content.replace('../js/claimsProcessor.js?v=2.1.0', 'js/claimsProcessor.js?v=2.1.0')
        print(f"   ✓ 已更新JavaScript路径为本地路径")
    
    # 写回文件
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f"   ✓ 已更新HTML文件")
    return True

def create_debug_version():
    """创建调试版本的HTML文件"""
    print("\n🔧 创建调试版本...")
    
    html_file = "frontend/claims_processor.html"
    debug_file = "frontend/claims_processor_debug.html"
    
    if not os.path.exists(html_file):
        print(f"   ✗ HTML文件不存在: {html_file}")
        return False
    
    # 读取HTML文件
    with open(html_file, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # 添加调试脚本
    debug_script = '''
    <script>
    // 调试脚本 - 检查专利查询功能
    document.addEventListener('DOMContentLoaded', function() {
        console.log('=== 专利查询功能调试 ===');
        
        // 检查关键元素
        const elements = {
            'patentQuerySection': document.getElementById('patentQuerySection'),
            'patentSearchInput': document.getElementById('patentSearchInput'),
            'searchPatentBtn': document.getElementById('searchPatentBtn'),
            'visualizePatentBtn': document.getElementById('visualizePatentBtn')
        };
        
        console.log('DOM元素检查:');
        for (const [name, element] of Object.entries(elements)) {
            if (element) {
                console.log(`✓ ${name}: 找到`);
            } else {
                console.error(`✗ ${name}: 未找到`);
            }
        }
        
        // 检查函数
        const functions = ['showPatentQuerySection', 'searchPatentNumbers', 'generateVisualization'];
        console.log('函数检查:');
        functions.forEach(funcName => {
            if (typeof window[funcName] === 'function') {
                console.log(`✓ ${funcName}: 存在`);
            } else {
                console.error(`✗ ${funcName}: 不存在`);
            }
        });
        
        // 手动显示专利查询区域（用于测试）
        window.showPatentQueryForDebug = function() {
            const section = document.getElementById('patentQuerySection');
            if (section) {
                section.style.display = 'block';
                console.log('✓ 专利查询区域已手动显示');
            } else {
                console.error('✗ 无法找到专利查询区域');
            }
        };
        
        console.log('调试提示: 在控制台执行 showPatentQueryForDebug() 可手动显示专利查询区域');
        console.log('=== 调试脚本加载完成 ===');
    });
    </script>
    '''
    
    # 在</body>前插入调试脚本
    html_content = html_content.replace('</body>', debug_script + '\n</body>')
    
    # 写入调试文件
    with open(debug_file, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f"   ✓ 已创建调试版本: {debug_file}")
    print(f"   ℹ 访问调试版本可以查看详细的控制台输出")
    
    return True

def main():
    """主修复函数"""
    print("="*80)
    print("🔧 修复部署版本中的专利查询功能问题")
    print("="*80)
    
    print("\n选择修复方案:")
    print("1. 修复相对路径 (推荐用于本地开发)")
    print("2. 复制JS到frontend目录 (推荐用于部署)")
    print("3. 创建调试版本")
    print("4. 全部执行")
    
    choice = input("\n请选择 (1-4): ").strip()
    
    if choice == '1':
        fix_javascript_paths()
    elif choice == '2':
        copy_js_to_frontend()
        update_html_for_local_js()
    elif choice == '3':
        create_debug_version()
    elif choice == '4':
        fix_javascript_paths()
        copy_js_to_frontend()
        update_html_for_local_js()
        create_debug_version()
    else:
        print("无效选择，执行全部修复...")
        fix_javascript_paths()
        copy_js_to_frontend()
        update_html_for_local_js()
        create_debug_version()
    
    print("\n" + "="*80)
    print("🎉 修复完成！")
    print("="*80)
    
    print("\n📋 修复说明:")
    print("1. 已修复JavaScript文件路径问题")
    print("2. 已复制JavaScript文件到frontend目录")
    print("3. 已创建调试版本用于问题排查")
    
    print("\n🔍 验证步骤:")
    print("1. 重新部署到Render")
    print("2. 访问权利要求处理器页面")
    print("3. 上传Excel文件并处理权利要求")
    print("4. 检查专利查询区域是否显示")
    print("5. 如果仍有问题，访问调试版本查看控制台输出")
    
    print("\n💡 调试提示:")
    print("- 在浏览器中按F12打开开发者工具")
    print("- 查看Console标签的错误信息")
    print("- 在Console中执行: showPatentQueryForDebug()")
    print("- 检查Network标签确认JavaScript文件加载成功")

if __name__ == "__main__":
    main()