#!/usr/bin/env python3
"""
测试智能列识别功能
"""

import sys
import os
sys.path.append('.')

from backend.utils.column_detector import ColumnDetector
import pandas as pd

def test_column_detection():
    """测试列识别功能"""
    print("🧪 测试智能列识别功能")
    print("="*50)
    
    # 创建测试数据
    test_data = {
        '专利号': ['CN202310123456A', 'US10123456B2', 'EP1234567A1'],
        '权利要求': [
            '1. 一种智能设备，其特征在于，包括：处理器，用于执行应用程序；存储器，与所述处理器连接。',
            '2. 根据权利要求1所述的智能设备，其特征在于，还包括显示屏。',
            '3. 根据权利要求1所述的智能设备，其特征在于，还包括传感器模块。'
        ],
        '发明名称': ['智能设备A', '智能设备B', '智能设备C'],
        '申请人': ['公司A', '公司B', '公司C']
    }
    
    df = pd.DataFrame(test_data)
    
    print("测试数据:")
    print(df.head())
    print()
    
    # 创建检测器
    detector = ColumnDetector()
    
    # 测试专利号列检测
    print("1. 专利号列检测:")
    patent_result = detector.detect_patent_number_column(df)
    if patent_result:
        print(f"   ✓ 检测到专利号列: {patent_result['column_name']}")
        print(f"   - 置信度: {patent_result['confidence']:.2f}")
        print(f"   - 分数: {patent_result['score']}")
        print(f"   - 原因: {', '.join(patent_result['reasons'])}")
        print(f"   - 样本数据: {patent_result['sample_data']}")
    else:
        print("   ✗ 未检测到专利号列")
    print()
    
    # 测试权利要求列检测
    print("2. 权利要求列检测:")
    claims_result = detector.detect_claims_column(df)
    if claims_result:
        print(f"   ✓ 检测到权利要求列: {claims_result['column_name']}")
        print(f"   - 置信度: {claims_result['confidence']:.2f}")
        print(f"   - 分数: {claims_result['score']}")
        print(f"   - 原因: {', '.join(claims_result['reasons'])}")
    else:
        print("   ✗ 未检测到权利要求列")
    print()
    
    # 测试完整分析
    print("3. 完整列分析:")
    full_result = detector.analyze_all_columns(df)
    print(f"   - 总列数: {full_result['total_columns']}")
    print(f"   - 列名: {full_result['column_names']}")
    
    if full_result['patent_number_column']:
        print(f"   - 专利号列: {full_result['patent_number_column']['column_name']} (置信度: {full_result['patent_number_column']['confidence']:.2f})")
    else:
        print("   - 专利号列: 未检测到")
        
    if full_result['claims_column']:
        print(f"   - 权利要求列: {full_result['claims_column']['column_name']} (置信度: {full_result['claims_column']['confidence']:.2f})")
    else:
        print("   - 权利要求列: 未检测到")

def test_with_real_file():
    """使用真实文件测试"""
    print("\n" + "="*50)
    print("🧪 使用真实文件测试")
    print("="*50)
    
    test_file = "test_data/test_smartphone.xlsx"
    if not os.path.exists(test_file):
        print(f"   ⚠ 测试文件不存在: {test_file}")
        return
    
    try:
        # 读取Excel文件
        df = pd.read_excel(test_file)
        print(f"   ✓ 成功读取文件: {test_file}")
        print(f"   - 行数: {len(df)}")
        print(f"   - 列数: {len(df.columns)}")
        print(f"   - 列名: {list(df.columns)}")
        print()
        
        # 显示前几行数据
        print("前3行数据预览:")
        print(df.head(3))
        print()
        
        # 创建检测器并分析
        detector = ColumnDetector()
        result = detector.analyze_all_columns(df)
        
        print("智能列识别结果:")
        if result['patent_number_column']:
            col = result['patent_number_column']
            print(f"   ✓ 专利号列: {col['column_name']}")
            print(f"     - 置信度: {col['confidence']:.2f}")
            print(f"     - 原因: {', '.join(col['reasons'])}")
            print(f"     - 样本: {col['sample_data']}")
        else:
            print("   ✗ 未检测到专利号列")
        
        if result['claims_column']:
            col = result['claims_column']
            print(f"   ✓ 权利要求列: {col['column_name']}")
            print(f"     - 置信度: {col['confidence']:.2f}")
            print(f"     - 原因: {', '.join(col['reasons'])}")
        else:
            print("   ✗ 未检测到权利要求列")
            
    except Exception as e:
        print(f"   ✗ 文件处理失败: {e}")

def test_edge_cases():
    """测试边缘情况"""
    print("\n" + "="*50)
    print("🧪 测试边缘情况")
    print("="*50)
    
    # 测试1: 英文列名
    print("1. 英文列名测试:")
    english_data = {
        'Patent Number': ['US10123456B2', 'US10123457B2'],
        'Claims': ['1. A device comprising...', '2. The device of claim 1...'],
        'Title': ['Device A', 'Device B']
    }
    df_en = pd.DataFrame(english_data)
    detector = ColumnDetector()
    result_en = detector.analyze_all_columns(df_en)
    
    print(f"   专利号列: {result_en['patent_number_column']['column_name'] if result_en['patent_number_column'] else '未检测到'}")
    print(f"   权利要求列: {result_en['claims_column']['column_name'] if result_en['claims_column'] else '未检测到'}")
    
    # 测试2: 模糊列名
    print("\n2. 模糊列名测试:")
    ambiguous_data = {
        '编号': ['CN123456', 'CN123457'],  # 可能是专利号
        '内容': ['权利要求1：一种设备...', '权利要求2：根据权利要求1...'],  # 可能是权利要求
        '备注': ['备注A', '备注B']
    }
    df_amb = pd.DataFrame(ambiguous_data)
    result_amb = detector.analyze_all_columns(df_amb)
    
    print(f"   专利号列: {result_amb['patent_number_column']['column_name'] if result_amb['patent_number_column'] else '未检测到'}")
    print(f"   权利要求列: {result_amb['claims_column']['column_name'] if result_amb['claims_column'] else '未检测到'}")
    
    # 测试3: 无匹配数据
    print("\n3. 无匹配数据测试:")
    no_match_data = {
        '姓名': ['张三', '李四'],
        '年龄': [25, 30],
        '城市': ['北京', '上海']
    }
    df_no = pd.DataFrame(no_match_data)
    result_no = detector.analyze_all_columns(df_no)
    
    print(f"   专利号列: {result_no['patent_number_column']['column_name'] if result_no['patent_number_column'] else '未检测到'}")
    print(f"   权利要求列: {result_no['claims_column']['column_name'] if result_no['claims_column'] else '未检测到'}")

if __name__ == "__main__":
    test_column_detection()
    test_with_real_file()
    test_edge_cases()
    
    print("\n" + "="*50)
    print("🎉 测试完成")
    print("="*50)