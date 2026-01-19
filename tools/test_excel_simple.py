#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简化版Excel文件解析测试
"""

import sys
import os
sys.path.append('.')

from backend.routes.excel_upload import parse_excel_file

def test_file(file_path):
    """测试单个文件"""
    print(f"\n{'='*60}")
    print(f"测试文件: {file_path}")
    print(f"{'='*60}")
    
    if not os.path.exists(file_path):
        print(f"[错误] 文件不存在")
        return False
    
    result = parse_excel_file(file_path, header_row=0)
    
    if result['success']:
        print(f"[成功] 解析成功")
        print(f"  - 总行数: {result['total_rows']}")
        print(f"  - 列数: {len(result['columns'])}")
        print(f"  - 工作表: {result['sheet_names']}")
        
        # 显示列信息
        print(f"\n  列信息:")
        for col in result['columns'][:5]:  # 只显示前5列
            print(f"    [{col['index']}] {col['name']} ({col['type']})")
        
        # 显示智能列识别
        if 'column_analysis' in result:
            analysis = result['column_analysis']
            if analysis.get('patent_number_column'):
                patent_col = analysis['patent_number_column']
                print(f"\n  [智能识别] 专利号列: {patent_col['column_name']}")
                print(f"    置信度: {patent_col['confidence']:.2%}")
            
            if analysis.get('claims_column'):
                claims_col = analysis['claims_column']
                print(f"  [智能识别] 权利要求列: {claims_col['column_name']}")
                print(f"    置信度: {claims_col['confidence']:.2%}")
        
        return True
    else:
        print(f"[失败] {result['error']}")
        if 'error_type' in result:
            print(f"  错误类型: {result['error_type']}")
        return False

def main():
    """主函数"""
    print("="*60)
    print("Excel文件解析测试工具")
    print("="*60)
    
    # 测试文件列表
    test_files = [
        "test_data/test_smartphone.xlsx",
        "test_data/test_patents.xlsx",
        "test_data/test.xlsx"
    ]
    
    # 添加uploads文件夹中的文件
    uploads_dir = "uploads"
    if os.path.exists(uploads_dir):
        excel_files = [f for f in os.listdir(uploads_dir) 
                       if f.endswith(('.xlsx', '.xls', '.csv')) and not f.startswith('.')]
        excel_files.sort(reverse=True)
        for file_name in excel_files[:3]:  # 只测试最近的3个文件
            test_files.append(os.path.join(uploads_dir, file_name))
    
    # 执行测试
    results = {}
    for file_path in test_files:
        if os.path.exists(file_path):
            results[file_path] = test_file(file_path)
        else:
            print(f"\n[跳过] 文件不存在: {file_path}")
            results[file_path] = None
    
    # 汇总结果
    print("\n" + "="*60)
    print("测试结果汇总")
    print("="*60)
    
    passed = sum(1 for r in results.values() if r is True)
    failed = sum(1 for r in results.values() if r is False)
    skipped = sum(1 for r in results.values() if r is None)
    
    print(f"通过: {passed}")
    print(f"失败: {failed}")
    print(f"跳过: {skipped}")
    
    print("\n详细结果:")
    for file_path, result in results.items():
        if result is None:
            status = "[跳过]"
        elif result:
            status = "[通过]"
        else:
            status = "[失败]"
        print(f"  {status} {os.path.basename(file_path)}")

if __name__ == "__main__":
    main()
