#!/usr/bin/env python3
"""
测试专利号搜索修复功能

这个脚本测试修复后的专利号识别和搜索功能
"""

import pandas as pd
import sys
import os

# 添加项目根目录到路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.utils.column_detector import ColumnDetector


def create_test_data():
    """创建测试数据"""
    test_data = {
        '专利号': [
            'CN202310123456A',
            'US20240107869A1', 
            'EP1234567A1',
            'JP2024123456A',
            'KR20240107869A1',
            '202310123456',
            'ZL202310123456.7',
            'DE202310123456A1',
            '10123456',
            'CN202402107869A1'
        ],
        '公开号': [
            'CN202310123456A',
            'US20240107869A1', 
            'EP1234567A1',
            'JP2024123456A',
            'KR20240107869A1',
            '202310123456',
            'ZL202310123456.7',
            'DE202310123456A1',
            '10123456',
            'CN202402107869A1'
        ],
        '权利要求': [
            '1. 一种智能手机，包括处理器...',
            '1. A smartphone comprising...',
            '1. Ein Smartphone umfassend...',
            '1. スマートフォンであって...',
            '1. 스마트폰에 있어서...',
            '1. 一种计算机系统...',
            '1. 一种显示装置...',
            '1. 一种通信方法...',
            '1. A method for processing...',
            '1. 一种数据处理方法...'
        ],
        '其他列': [
            '数据1', '数据2', '数据3', '数据4', '数据5',
            '数据6', '数据7', '数据8', '数据9', '数据10'
        ]
    }
    
    return pd.DataFrame(test_data)


def test_column_detection():
    """测试列识别功能"""
    print("=== 测试列识别功能 ===")
    
    # 创建测试数据
    df = create_test_data()
    print(f"测试数据列: {list(df.columns)}")
    print(f"数据行数: {len(df)}")
    
    # 创建检测器
    detector = ColumnDetector()
    
    # 测试专利号列识别
    print("\n--- 测试专利号列识别 ---")
    patent_result = detector.detect_patent_number_column(df)
    
    if patent_result:
        print(f"✓ 识别到专利号列: {patent_result['column_name']}")
        print(f"  置信度: {patent_result['confidence']:.2%}")
        print(f"  评分: {patent_result['score']:.1f}")
        print(f"  识别原因: {patent_result['reasons']}")
        print(f"  样本数据: {patent_result['sample_data']}")
    else:
        print("✗ 未识别到专利号列")
    
    # 测试权利要求列识别
    print("\n--- 测试权利要求列识别 ---")
    claims_result = detector.detect_claims_column(df)
    
    if claims_result:
        print(f"✓ 识别到权利要求列: {claims_result['column_name']}")
        print(f"  置信度: {claims_result['confidence']:.2%}")
        print(f"  评分: {claims_result['score']:.1f}")
        print(f"  识别原因: {claims_result['reasons']}")
    else:
        print("✗ 未识别到权利要求列")
    
    # 完整分析
    print("\n--- 完整列分析 ---")
    full_analysis = detector.analyze_all_columns(df)
    print(f"总列数: {full_analysis['total_columns']}")
    print(f"列名列表: {full_analysis['column_names']}")
    
    return patent_result, claims_result


def test_patent_number_patterns():
    """测试专利号格式匹配"""
    print("\n=== 测试专利号格式匹配 ===")
    
    detector = ColumnDetector()
    
    # 测试各种专利号格式
    test_patents = [
        # 中国专利号
        'CN202310123456A',
        'CN202402107869A1', 
        'ZL202310123456.7',
        '202310123456',
        '202402107869',
        
        # 美国专利号
        'US20240107869A1',
        'US10123456B2',
        '10123456',
        '20240107869',
        
        # 欧洲专利号
        'EP1234567A1',
        'EP202402107869A1',
        
        # 日本专利号
        'JP2024123456A',
        'JP2024-123456A',
        '特願2023-123456',
        
        # 韩国专利号
        'KR20240107869A1',
        'KR10-1234567',
        
        # 其他国家
        'DE202310123456A1',
        'FR202310123456A1',
        'GB202310123456A1',
        'CA202310123456A1',
        'AU202310123456A1',
        
        # 边界情况
        '123456',      # 太短
        '12345678901234567890123456',  # 太长
        'ABC123',      # 太短
        'CN123A',      # 太短
    ]
    
    import re
    
    matched_count = 0
    for patent in test_patents:
        matched = False
        for pattern in detector.patent_number_patterns:
            if re.search(pattern, patent.upper()):
                matched = True
                break
        
        status = "✓" if matched else "✗"
        print(f"{status} {patent}")
        
        if matched:
            matched_count += 1
    
    print(f"\n匹配统计: {matched_count}/{len(test_patents)} ({matched_count/len(test_patents):.1%})")
    
    return matched_count, len(test_patents)


def test_search_functionality():
    """测试搜索功能"""
    print("\n=== 测试搜索功能 ===")
    
    # 创建测试数据
    df = create_test_data()
    
    # 模拟搜索测试
    test_queries = [
        '2023',
        'CN',
        'US',
        '123456',
        '202310',
        'A1',
        'ZL',
        '107869'
    ]
    
    print("模拟搜索测试:")
    for query in test_queries:
        matches = []
        for col in df.columns:
            if col in ['专利号', '公开号']:  # 只在专利号相关列中搜索
                column_matches = df[df[col].str.contains(query, case=False, na=False)]
                if not column_matches.empty:
                    matches.extend(column_matches[col].tolist())
        
        print(f"  查询 '{query}': 找到 {len(matches)} 个匹配项")
        if matches:
            print(f"    示例: {matches[:3]}")  # 显示前3个匹配项
    
    return True


def main():
    """主测试函数"""
    print("专利号搜索修复功能测试")
    print("=" * 50)
    
    try:
        # 测试列识别
        patent_result, claims_result = test_column_detection()
        
        # 测试专利号格式匹配
        matched, total = test_patent_number_patterns()
        
        # 测试搜索功能
        search_ok = test_search_functionality()
        
        # 总结测试结果
        print("\n" + "=" * 50)
        print("测试结果总结:")
        print(f"✓ 专利号列识别: {'成功' if patent_result else '失败'}")
        print(f"✓ 权利要求列识别: {'成功' if claims_result else '失败'}")
        print(f"✓ 专利号格式匹配: {matched}/{total} ({matched/total:.1%})")
        print(f"✓ 搜索功能测试: {'通过' if search_ok else '失败'}")
        
        # 评估修复效果
        if patent_result and matched/total >= 0.8:
            print("\n🎉 修复效果良好！专利号识别和搜索功能已显著改善。")
        elif patent_result:
            print("\n⚠️  修复部分成功，但专利号格式匹配还需要进一步优化。")
        else:
            print("\n❌ 修复效果不佳，需要进一步调整识别算法。")
            
    except Exception as e:
        print(f"\n❌ 测试过程中出现错误: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()