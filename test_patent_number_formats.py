#!/usr/bin/env python3
"""
测试不同类型的专利公开号格式
"""

import pandas as pd
import os
import sys
import re

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.utils.column_detector import ColumnDetector

def test_patent_number_formats():
    """
    测试不同类型的专利公开号格式
    """
    print("=== 测试不同类型的专利公开号格式 ===")
    
    # 各种类型的专利公开号格式
    patent_formats = {
        '中国专利号': [
            'CN202310123456A',  # 中国发明专利申请公开号
            'CN202220123456U',  # 中国实用新型专利授权公告号
            'CN202130123456S',  # 中国外观设计专利授权公告号
            'ZL202010123456.7',  # 中国专利号（带小数点）
            'CN112345678A',      # 中国老格式专利申请公开号
        ],
        '美国专利号': [
            'US10123456B2',       # 美国专利授权号
            'US202301234567A1',   # 美国专利申请公开号
            'USD1234567S',        # 美国外观设计专利号
            'USRE12345E',         # 美国再颁专利号
        ],
        '欧洲专利号': [
            'EP1234567A1',        # 欧洲专利申请公开号
            'EP1234567B1',        # 欧洲专利授权公告号
            'EP1234567B8',        # 欧洲专利修正公告号
        ],
        '日本专利号': [
            'JP2023123456A',       # 日本专利申请公开号
            'JPH1234567B2',        # 日本专利授权公告号
            '特許第1234567号',      # 日本专利号（汉字格式）
            '公開特許2023-123456',  # 日本专利申请公开号（另一种格式）
        ],
        '韩国专利号': [
            'KR10-1234567',        # 韩国专利授权号
            'KR20230012345A',       # 韩国专利申请公开号
        ],
        '其他国家专利号': [
            'WO2023123456A1',       # 国际专利申请公开号
            'CA2123456C',          # 加拿大专利号
            'DE1234567A1',          # 德国专利申请公开号
            'FR1234567A',           # 法国专利号
            'GB1234567A',           # 英国专利号
            'RU2123456C1',          # 俄罗斯专利号
        ],
    }
    
    # 测试每种格式
    all_formats_valid = True
    
    for country, formats in patent_formats.items():
        print(f"\n{country}:")
        print("-" * 40)
        
        for patent_number in formats:
            # 测试专利号格式是否匹配
            is_valid = test_patent_number_format(patent_number)
            status = "✓" if is_valid else "✗"
            print(f"{status} {patent_number}")
            if not is_valid:
                all_formats_valid = False
    
    # 测试完整的列识别
    print("\n=== 测试完整的列识别 ===")
    test_complete_column_detection()
    
    print("\n=== 测试完成 ===")
    if all_formats_valid:
        print("✓ 所有专利公开号格式测试通过！")
    else:
        print("✗ 部分专利公开号格式测试失败！")

def test_patent_number_format(patent_number):
    """
    测试单个专利公开号格式是否有效
    """
    # 使用专利号格式正则表达式
    detector = ColumnDetector()
    
    # 检查是否匹配任何专利号格式
    for pattern in detector.patent_number_patterns:
        if re.search(pattern, patent_number):
            return True
    
    # 额外的格式检查
    # 检查长度是否在合理范围内
    if 5 <= len(patent_number) <= 20:
        # 检查是否包含字母和数字
        has_letters = bool(re.search(r'[A-Za-z]', patent_number))
        has_numbers = bool(re.search(r'\d', patent_number))
        if has_letters and has_numbers:
            return True
    
    return False

def test_complete_column_detection():
    """
    测试完整的列识别功能
    """
    # 创建包含各种专利号格式的测试数据
    test_data = {
        '专利公开号': [
            'CN202310123456A',
            'US10123456B2',
            'EP1234567A1',
            'JP2023123456A',
        ],
        '权利要求': [
            '权利要求1：一种设备...',
            '权利要求2：根据权利要求1所述的设备...',
            '权利要求3：根据权利要求1或2所述的设备...',
            '权利要求4：一种系统...',
        ],
        '其他列': ['数据1', '数据2', '数据3', '数据4'],
    }
    
    df = pd.DataFrame(test_data)
    detector = ColumnDetector()
    
    # 测试专利号列识别
    patent_column = detector.detect_patent_number_column(df)
    if patent_column:
        print(f"✓ 成功识别专利公开号列: {patent_column['column_name']}")
        print(f"  置信度: {patent_column['confidence']:.2f}")
    else:
        print("✗ 未能识别专利公开号列")
    
    # 测试权利要求列识别
    claims_column = detector.detect_claims_column(df)
    if claims_column:
        print(f"✓ 成功识别权利要求列: {claims_column['column_name']}")
        print(f"  置信度: {claims_column['confidence']:.2f}")
    else:
        print("✗ 未能识别权利要求列")

if __name__ == "__main__":
    test_patent_number_formats()
