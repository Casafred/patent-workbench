#!/usr/bin/env python3
"""
测试修复后的列识别功能
"""

import pandas as pd
from backend.utils.column_detector import ColumnDetector

def test_patent_number_detection():
    """测试专利号列识别功能"""
    
    # 创建测试数据
    test_data = {
        '公开号': [
            'US202402107869A1',
            'CN202310123456A',
            'EP202402107869A1',
            'JP202402107869A1',
            'KR202402107869A1'
        ],
        '专利号': [
            'US10123456B2',
            'CN109876543B',
            'EP1234567A1',
            'JP2023-123456A',
            'KR10-1234567'
        ],
        '权利要求': [
            '1. 一种智能手机...',
            '2. 根据权利要求1...',
            '3. 根据权利要求2...',
            '4. 根据权利要求1...',
            '5. 根据权利要求3...'
        ],
        '其他列': [
            '数据1',
            '数据2', 
            '数据3',
            '数据4',
            '数据5'
        ]
    }
    
    df = pd.DataFrame(test_data)
    
    print("测试数据:")
    print(df)
    print("\n" + "="*50 + "\n")
    
    # 创建检测器
    detector = ColumnDetector()
    
    # 测试专利号列检测
    print("专利号列检测结果:")
    patent_result = detector.detect_patent_number_column(df)
    if patent_result:
        print(f"检测到专利号列: {patent_result['column_name']}")
        print(f"置信度: {patent_result['confidence']:.2f}")
        print(f"匹配原因: {patent_result['reasons']}")
        print(f"样本数据: {patent_result['sample_data']}")
    else:
        print("未检测到专利号列")
    
    print("\n" + "-"*30 + "\n")
    
    # 测试权利要求列检测
    print("权利要求列检测结果:")
    claims_result = detector.detect_claims_column(df)
    if claims_result:
        print(f"检测到权利要求列: {claims_result['column_name']}")
        print(f"置信度: {claims_result['confidence']:.2f}")
        print(f"匹配原因: {claims_result['reasons']}")
        print(f"样本数据: {claims_result['sample_data']}")
    else:
        print("未检测到权利要求列")
    
    print("\n" + "-"*30 + "\n")
    
    # 完整分析
    print("完整列分析结果:")
    full_analysis = detector.analyze_all_columns(df)
    print(f"总列数: {full_analysis['total_columns']}")
    print(f"列名: {full_analysis['column_names']}")
    
    if full_analysis['patent_number_column']:
        print(f"专利号列: {full_analysis['patent_number_column']['column_name']} (置信度: {full_analysis['patent_number_column']['confidence']:.2f})")
    
    if full_analysis['claims_column']:
        print(f"权利要求列: {full_analysis['claims_column']['column_name']} (置信度: {full_analysis['claims_column']['confidence']:.2f})")


def test_specific_patent_formats():
    """测试特定的专利号格式"""
    
    test_cases = [
        'US202402107869A1',  # 用户提到的格式
        'CN202310123456A',
        'EP202402107869A1', 
        'JP202402107869A1',
        'KR202402107869A1',
        'DE202402107869A1',
        'FR202402107869A1',
        'GB202402107869A1',
        'CA202402107869A1',
        'AU202402107869A1',
        'US10123456B2',      # 传统美国格式
        'CN109876543B',      # 中国格式
    ]
    
    detector = ColumnDetector()
    
    print("专利号格式测试:")
    print("="*50)
    
    for patent_number in test_cases:
        matches = []
        for i, pattern in enumerate(detector.patent_number_patterns):
            import re
            if re.search(pattern, patent_number):
                matches.append(f"模式{i+1}")
        
        if matches:
            print(f"✓ {patent_number:20} -> 匹配: {', '.join(matches)}")
        else:
            print(f"✗ {patent_number:20} -> 无匹配")


if __name__ == "__main__":
    print("开始测试列识别功能修复...")
    print("\n1. 测试专利号格式匹配:")
    test_specific_patent_formats()
    
    print("\n\n2. 测试完整列识别:")
    test_patent_number_detection()
    
    print("\n测试完成!")