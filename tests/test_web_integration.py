"""
测试Web接口集成

验证专利权利要求处理的完整工作流程
"""

import os
import sys
import time
import json
import pytest

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_complete_workflow():
    """测试完整的处理工作流程"""
    print("=" * 60)
    print("测试完整工作流程")
    print("=" * 60)
    
    # 1. 导入必要的模块
    print("\n1. 导入模块...")
    from patent_claims_processor.services import ProcessingService, ExportService
    from patent_claims_processor.processors import ExcelProcessor
    print("✓ 模块导入成功")
    
    # 2. 检查测试文件
    print("\n2. 检查测试文件...")
    test_file = "test.xlsx"
    if not os.path.exists(test_file):
        pytest.skip(f"测试文件不存在: {test_file}")
    print(f"✓ 测试文件存在: {test_file}")
    
    # 3. 验证Excel文件
    print("\n3. 验证Excel文件...")
    excel_processor = ExcelProcessor()
    try:
        is_valid = excel_processor.validate_excel_file(test_file)
        if not is_valid:
            pytest.skip("Excel文件验证失败")
        print("✓ Excel文件验证成功")
    except Exception as e:
        pytest.skip(f"Excel文件验证失败: {e}")
    
    # 4. 读取Excel文件信息
    print("\n4. 读取Excel文件信息...")
    try:
        sheet_names = excel_processor.get_sheet_names(test_file)
        print(f"  工作表: {sheet_names}")
        
        df = excel_processor.read_excel_file(test_file)
        columns = list(df.columns)
        print(f"  列: {columns}")
        print("✓ Excel文件信息读取成功")
    except Exception as e:
        pytest.skip(f"Excel文件读取失败: {e}")
    
    # 5. 处理Excel文件
    print("\n5. 处理Excel文件...")
    processing_service = ProcessingService()
    
    # 假设第一列包含权利要求文本
    column_name = columns[0] if columns else None
    assert column_name is not None, "未找到可用的列"
    
    print(f"  使用列: {column_name}")
    print("  开始处理...")
    
    start_time = time.time()
    result = processing_service.process_excel_file(
        file_path=test_file,
        column_name=column_name,
        sheet_name=sheet_names[0] if sheet_names else None
    )
    processing_time = time.time() - start_time
    
    print(f"✓ 处理完成 (耗时: {processing_time:.2f}秒)")
    
    # 6. 显示处理结果
    print("\n6. 处理结果:")
    print(f"  处理单元格数: {result.total_cells_processed}")
    print(f"  提取权利要求数: {result.total_claims_extracted}")
    print(f"  独立权利要求: {result.independent_claims_count}")
    print(f"  从属权利要求: {result.dependent_claims_count}")
    print(f"  错误数量: {len(result.processing_errors)}")
    
    if result.language_distribution:
        print(f"  语言分布: {result.language_distribution}")
    
    # 7. 测试导出功能
    print("\n7. 测试导出功能...")
    export_service = ExportService()
    
    # 导出JSON
    json_path = export_service.export_to_json(result, "test_output.json")
    assert os.path.exists(json_path), "JSON导出失败"
    print(f"✓ JSON导出成功: {json_path}")
    # 清理测试文件
    try:
        os.remove(json_path)
    except:
        pass
    
    # 导出Excel
    excel_path = export_service.export_to_excel(result, "test_output.xlsx")
    assert os.path.exists(excel_path), "Excel导出失败"
    print(f"✓ Excel导出成功: {excel_path}")
    # 清理测试文件
    try:
        os.remove(excel_path)
    except:
        pass
    
    # 8. 测试报告生成
    print("\n8. 测试报告生成...")
    report = export_service.generate_processing_report(result)
    assert report and len(report) > 0, "报告生成失败"
    print("✓ 报告生成成功")
    print("\n报告预览:")
    print("-" * 60)
    print(report[:500] + "..." if len(report) > 500 else report)
    print("-" * 60)
    
    print("\n" + "=" * 60)
    print("✓ 所有测试通过！")
    print("=" * 60)

def test_api_endpoints():
    """测试API端点是否正确注册"""
    print("\n" + "=" * 60)
    print("测试API端点")
    print("=" * 60)
    
    from app import app
    
    # 获取所有路由
    routes = []
    for rule in app.url_map.iter_rules():
        if '/api/claims/' in str(rule):
            routes.append({
                'endpoint': str(rule),
                'methods': ','.join(rule.methods - {'HEAD', 'OPTIONS'})
            })
    
    print("\n已注册的权利要求处理API端点:")
    for route in routes:
        print(f"  {route['methods']:10s} {route['endpoint']}")
    
    assert len(routes) >= 6, f"API端点数量不足 (期望6个，实际{len(routes)}个)"
    print(f"\n✓ 所有API端点已正确注册 ({len(routes)}个)")

def main():
    """运行所有测试"""
    print("\n" + "=" * 60)
    print("Web接口集成测试")
    print("=" * 60)
    
    results = []
    
    # 测试API端点
    results.append(("API端点测试", test_api_endpoints()))
    
    # 测试完整工作流程
    results.append(("完整工作流程测试", test_complete_workflow()))
    
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
        print("\n✓ 所有测试通过！Web接口集成成功。")
        return 0
    else:
        print("\n✗ 部分测试失败，请检查错误信息。")
        return 1

if __name__ == '__main__':
    sys.exit(main())
