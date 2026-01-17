#!/usr/bin/env python3
"""
部署验证脚本

验证修复后的功能是否正常工作
"""

import os
import re

def verify_fixes():
    """验证修复是否成功"""
    print("🔍 验证修复结果...")
    
    # 检查HTML文件
    html_file = "frontend/claims_processor.html"
    if os.path.exists(html_file):
        with open(html_file, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # 检查JavaScript引用
        if 'src="js/claimsProcessor.js?v=2.1.0"' in html_content:
            print("   ✓ HTML中JavaScript引用路径正确")
        else:
            print("   ✗ HTML中JavaScript引用路径不正确")
        
        # 检查关键元素
        elements = ['patentQuerySection', 'patentSearchInput', 'visualizePatentBtn']
        for element in elements:
            if f'id="{element}"' in html_content:
                print(f"   ✓ 找到元素: {element}")
            else:
                print(f"   ✗ 缺少元素: {element}")
    
    # 检查JavaScript文件
    js_file = "frontend/js/claimsProcessor.js"
    if os.path.exists(js_file):
        print("   ✓ JavaScript文件已复制到frontend/js/")
        
        with open(js_file, 'r', encoding='utf-8') as f:
            js_content = f.read()
        
        # 检查关键函数
        functions = ['showPatentQuerySection', 'searchPatentNumbers', 'generateVisualization']
        for func in functions:
            if f'function {func}' in js_content:
                print(f"   ✓ 找到函数: {func}")
            else:
                print(f"   ✗ 缺少函数: {func}")
    else:
        print("   ✗ JavaScript文件未找到")
    
    # 检查调试版本
    debug_file = "frontend/claims_processor_debug.html"
    if os.path.exists(debug_file):
        print("   ✓ 调试版本已创建")
    else:
        print("   ✗ 调试版本未创建")

def create_deployment_checklist():
    """创建部署检查清单"""
    checklist = """
# 部署检查清单

## 修复内容
- [x] 修复JavaScript文件路径问题
- [x] 复制JavaScript文件到frontend目录
- [x] 创建调试版本
- [x] 验证关键元素和函数存在

## 部署前检查
- [ ] 确认所有文件已提交到Git
- [ ] 确认frontend/js/claimsProcessor.js文件存在
- [ ] 确认HTML中JavaScript引用路径正确
- [ ] 确认后端路由正确注册

## 部署后验证
- [ ] 访问权利要求处理器页面
- [ ] 检查浏览器控制台无JavaScript错误
- [ ] 上传Excel文件测试
- [ ] 处理权利要求后检查专利查询区域是否显示
- [ ] 测试专利号搜索功能
- [ ] 测试可视化功能

## 问题排查
如果专利查询区域仍然不显示：

1. 打开浏览器开发者工具(F12)
2. 查看Console标签的错误信息
3. 检查Network标签确认JavaScript文件加载成功
4. 访问调试版本: /frontend/claims_processor_debug.html
5. 在Console中执行: showPatentQueryForDebug()

## 手动修复方案
如果自动修复失败，可以手动执行：

```javascript
// 在浏览器控制台中执行
document.getElementById('patentQuerySection').style.display = 'block';
```

## 联系信息
如果问题仍然存在，请提供：
- 浏览器控制台错误信息
- Network标签中的请求状态
- 具体的操作步骤和现象
"""
    
    with open("DEPLOYMENT_CHECKLIST.md", "w", encoding="utf-8") as f:
        f.write(checklist)
    
    print("   ✓ 已创建部署检查清单: DEPLOYMENT_CHECKLIST.md")

def main():
    """主函数"""
    print("="*60)
    print("🔍 部署验证")
    print("="*60)
    
    verify_fixes()
    create_deployment_checklist()
    
    print("\n" + "="*60)
    print("📋 验证完成")
    print("="*60)
    
    print("\n🚀 下一步操作:")
    print("1. 提交所有更改到Git")
    print("2. 推送到GitHub")
    print("3. 重新部署到Render")
    print("4. 按照DEPLOYMENT_CHECKLIST.md进行验证")

if __name__ == "__main__":
    main()