#!/usr/bin/env python3
"""
测试Excel文件解析功能
用于诊断某些Excel文件上传失败的问题
"""

import sys
import os
import traceback
sys.path.append('.')

import pandas as pd
from backend.routes.excel_upload import parse_excel_file
from backend.utils.column_detector import ColumnDetector

def test_excel_file(file_path):
    """测试单个Excel文件的解析"""
    print(f"\n{'='*60}")
    print(f"测试文件: {file_path}")
    print(f"{'='*60}")
    
    if not os.path.exists(file_path):
        print(f"❌ 文件不存在: {file_path}")
        return False
    
    # 获取文件信息
    file_size = os.path.getsize(file_path)
    print(f"文件大小: {file_size:,} 字节 ({file_size / 1024:.2f} KB)")
    
    # 测试1: 使用pandas直接读取
    print("\n📊 测试1: pandas直接读取")
    try:
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path)
        else:
            # 先获取工作表信息
            excel_file = pd.ExcelFile(file_path)
            sheet_names = excel_file.sheet_names
            print(f"   工作表数量: {len(sheet_names)}")
            print(f"   工作表名称: {sheet_names}")
            
            # 读取第一个工作表
            df = pd.read_excel(file_path, sheet_name=sheet_names[0])
        
        print(f"   ✅ 成功读取")
        print(f"   行数: {len(df)}")
        print(f"   列数: {len(df.columns)}")
        print(f"   列名: {list(df.columns)}")
        
        # 显示前几行
        print(f"\n   前3行数据:")
        print(df.head(3).to_string())
        
        # 检查数据类型
        print(f"\n   数据类型:")
        for col in df.columns:
            print(f"   - {col}: {df[col].dtype}")
        
        # 检查空值
        print(f"\n   空值统计:")
        null_counts = df.isnull().sum()
        for col in df.columns:
            if null_counts[col] > 0:
                print(f"   - {col}: {null_counts[col]} 个空值")
        
    except Exception as e:
        print(f"   ❌ 读取失败: {str(e)}")
        print(f"   错误详情:\n{traceback.format_exc()}")
        return False
    
    # 测试2: 使用parse_excel_file函数
    print(f"\n📊 测试2: parse_excel_file函数")
    try:
        result = parse_excel_file(file_path, header_row=0)
        
        if result['success']:
            print(f"   ✅ 解析成功")
            print(f"   总行数: {result['total_rows']}")
            print(f"   列数: {len(result['columns'])}")
            print(f"   工作表: {result['sheet_names']}")
            
            # 显示列信息
            print(f"\n   列信息:")
            for col in result['columns']:
                print(f"   - [{col['index']}] {col['name']} ({col['type']})")
                if col['sample_values']:
                    print(f"     样本: {col['sample_values'][:2]}")
            
            # 显示智能列识别结果
            if 'column_analysis' in result:
                print(f"\n   智能列识别:")
                analysis = result['column_analysis']
                
                if analysis.get('patent_number_column'):
                    patent_col = analysis['patent_number_column']
                    print(f"   ✅ 专利号列: {patent_col['column_name']}")
                    print(f"      置信度: {patent_col['confidence']:.2%}")
                    print(f"      原因: {', '.join(patent_col['reasons'])}")
                else:
                    print(f"   ⚠️  未检测到专利号列")
                
                if analysis.get('claims_column'):
                    claims_col = analysis['claims_column']
                    print(f"   ✅ 权利要求列: {claims_col['column_name']}")
                    print(f"      置信度: {claims_col['confidence']:.2%}")
                else:
                    print(f"   ⚠️  未检测到权利要求列")
        else:
            print(f"   ❌ 解析失败: {result['error']}")
            return False
            
    except Exception as e:
        print(f"   ❌ 解析失败: {str(e)}")
        print(f"   错误详情:\n{traceback.format_exc()}")
        return False
    
    # 测试3: 测试不同的header_row参数
    print(f"\n📊 测试3: 不同header_row参数")
    for header_row in [0, 1, 2]:
        try:
            result = parse_excel_file(file_path, header_row=header_row)
            if result['success']:
                print(f"   ✅ header_row={header_row}: 成功 ({result['total_rows']} 行)")
            else:
                print(f"   ❌ header_row={header_row}: {result['error']}")
        except Exception as e:
            print(f"   ❌ header_row={header_row}: {str(e)}")
    
    return True

def test_all_test_files():
    """测试所有测试数据文件"""
    print("\n" + "="*60)
    print("测试所有测试数据文件")
    print("="*60)
    
    test_files = [
        "test_data/test_smartphone.xlsx",
        "test_data/test_patents.xlsx",
        "test_data/test.xlsx"
    ]
    
    results = {}
    for file_path in test_files:
        if os.path.exists(file_path):
            results[file_path] = test_excel_file(file_path)
        else:
            print(f"\n⚠️  文件不存在: {file_path}")
            results[file_path] = None
    
    # 汇总结果
    print("\n" + "="*60)
    print("测试结果汇总")
    print("="*60)
    for file_path, result in results.items():
        if result is None:
            status = "⚠️  文件不存在"
        elif result:
            status = "✅ 通过"
        else:
            status = "❌ 失败"
        print(f"{status} - {file_path}")

def test_uploads_folder():
    """测试uploads文件夹中的文件"""
    print("\n" + "="*60)
    print("测试uploads文件夹中的文件")
    print("="*60)
    
    uploads_dir = "uploads"
    if not os.path.exists(uploads_dir):
        print(f"⚠️  uploads文件夹不存在")
        return
    
    # 获取所有Excel文件
    excel_files = [f for f in os.listdir(uploads_dir) 
                   if f.endswith(('.xlsx', '.xls', '.csv')) and not f.startswith('.')]
    
    if not excel_files:
        print(f"⚠️  uploads文件夹中没有Excel文件")
        return
    
    print(f"找到 {len(excel_files)} 个Excel文件")
    
    # 只测试最近的5个文件
    excel_files.sort(reverse=True)
    for file_name in excel_files[:5]:
        file_path = os.path.join(uploads_dir, file_name)
        test_excel_file(file_path)

def test_edge_cases():
    """测试边缘情况"""
    print("\n" + "="*60)
    print("测试边缘情况")
    print("="*60)
    
    # 创建临时测试文件
    import tempfile
    
    # 测试1: 空Excel文件
    print("\n📊 测试1: 空Excel文件")
    try:
        with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp:
            df_empty = pd.DataFrame()
            df_empty.to_excel(tmp.name, index=False)
            tmp_path = tmp.name
        
        result = parse_excel_file(tmp_path)
        if result['success']:
            print(f"   ✅ 空文件解析成功 (行数: {result['total_rows']})")
        else:
            print(f"   ❌ 空文件解析失败: {result['error']}")
        
        os.unlink(tmp_path)
    except Exception as e:
        print(f"   ❌ 测试失败: {str(e)}")
    
    # 测试2: 包含特殊字符的列名
    print("\n📊 测试2: 特殊字符列名")
    try:
        with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp:
            df_special = pd.DataFrame({
                '列名@#$%': ['值1', '值2'],
                '中文列名': ['中文1', '中文2'],
                'Column Name': ['Value1', 'Value2']
            })
            df_special.to_excel(tmp.name, index=False)
            tmp_path = tmp.name
        
        result = parse_excel_file(tmp_path)
        if result['success']:
            print(f"   ✅ 特殊字符列名解析成功")
            print(f"   列名: {[col['name'] for col in result['columns']]}")
        else:
            print(f"   ❌ 解析失败: {result['error']}")
        
        os.unlink(tmp_path)
    except Exception as e:
        print(f"   ❌ 测试失败: {str(e)}")
    
    # 测试3: 包含大量空值的文件
    print("\n📊 测试3: 大量空值")
    try:
        with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp:
            df_nulls = pd.DataFrame({
                '列1': [1, None, 3, None, 5],
                '列2': [None, None, None, None, None],
                '列3': ['a', 'b', None, 'd', 'e']
            })
            df_nulls.to_excel(tmp.name, index=False)
            tmp_path = tmp.name
        
        result = parse_excel_file(tmp_path)
        if result['success']:
            print(f"   ✅ 空值文件解析成功")
            print(f"   总行数: {result['total_rows']}")
        else:
            print(f"   ❌ 解析失败: {result['error']}")
        
        os.unlink(tmp_path)
    except Exception as e:
        print(f"   ❌ 测试失败: {str(e)}")

if __name__ == "__main__":
    import sys
    import io
    # 设置输出编码为UTF-8
    if sys.platform == 'win32':
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    
    print("Excel文件解析诊断工具")
    print("="*60)
    
    # 测试所有测试数据文件
    test_all_test_files()
    
    # 测试uploads文件夹
    test_uploads_folder()
    
    # 测试边缘情况
    test_edge_cases()
    
    print("\n" + "="*60)
    print("诊断完成")
    print("="*60)
