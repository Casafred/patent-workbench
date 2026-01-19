#!/usr/bin/env python3
"""
测试专利公开号列智能识别功能
"""

import pandas as pd
import os
import sys

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.utils.column_detector import ColumnDetector

def test_patent_column_detection():
    """
    测试专利公开号列智能识别功能
    """
    print("=== 测试专利公开号列智能识别功能 ===")
    
    # 创建测试数据
    test_data = {
        '专利公开号': ['CN202310123456A', 'CN202220123456U', 'CN202130123456S'],
        '权利要求': ['权利要求1：一种设备...', '权利要求1：一种方法...', '权利要求1：一种系统...'],
        '申请人': ['公司A', '公司B', '公司C'],
        '申请日期': ['2023-01-01', '2022-01-01', '2021-01-01'],
        '公开日期': ['2023-06-01', '2022-06-01', '2021-06-01']
    }
    
    df = pd.DataFrame(test_data)
    
    # 创建检测器
    detector = ColumnDetector()
    
    # 测试专利公开号列识别
    print("\n1. 测试专利公开号列识别:")
    patent_column = detector.detect_patent_number_column(df)
    if patent_column:
        print(f"✓ 成功识别专利公开号列: {patent_column['column_name']}")
        print(f"  置信度: {patent_column['confidence']:.2f}")
        print(f"  匹配原因: {patent_column['reasons']}")
        print(f"  样例数据: {patent_column['sample_data']}")
    else:
        print("✗ 未能识别专利公开号列")
    
    # 测试权利要求列识别
    print("\n2. 测试权利要求列识别:")
    claims_column = detector.detect_claims_column(df)
    if claims_column:
        print(f"✓ 成功识别权利要求列: {claims_column['column_name']}")
        print(f"  置信度: {claims_column['confidence']:.2f}")
        print(f"  匹配原因: {claims_column['reasons']}")
        print(f"  样例数据: {claims_column['sample_data']}")
    else:
        print("✗ 未能识别权利要求列")
    
    # 测试完整的列分析
    print("\n3. 测试完整的列分析:")
    analysis_result = detector.analyze_all_columns(df)
    print(f"  总列数: {analysis_result['total_columns']}")
    print(f"  所有列名: {analysis_result['column_names']}")
    
    if analysis_result['patent_number_column']:
        print(f"  识别的专利公开号列: {analysis_result['patent_number_column']['column_name']}")
    else:
        print("  未识别到专利公开号列")
    
    if analysis_result['claims_column']:
        print(f"  识别的权利要求列: {analysis_result['claims_column']['column_name']}")
    else:
        print("  未识别到权利要求列")
    
    # 测试不同语言的专利号格式
    print("\n4. 测试不同语言的专利号格式:")
    multi_lang_data = {
        'Patent Number': ['US10123456B2', 'EP1234567A1', 'JP2023-123456A'],
        'Claims': ['Claim 1: A device...', 'Claim 1: A method...', 'Claim 1: A system...'],
        'Application Date': ['2023-01-01', '2022-01-01', '2021-01-01']
    }
    
    df_multi_lang = pd.DataFrame(multi_lang_data)
    patent_column_multi = detector.detect_patent_number_column(df_multi_lang)
    if patent_column_multi:
        print(f"✓ 成功识别多语言专利号列: {patent_column_multi['column_name']}")
        print(f"  样例数据: {patent_column_multi['sample_data']}")
    else:
        print("✗ 未能识别多语言专利号列")
    
    print("\n=== 测试完成 ===")

if __name__ == "__main__":
    test_patent_column_detection()
