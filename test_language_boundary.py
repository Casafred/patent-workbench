#!/usr/bin/env python3
"""
测试语言边界检测功能
"""

import sys
import os

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from patent_claims_processor.processors.claims_parser import ClaimsParser

def test_language_boundary_detection():
    """测试语言边界检测"""
    print("=== 测试语言边界检测 ===")
    parser = ClaimsParser()
    
    # 测试用例1: 中文权利要求后跟英文权利要求，中间有CNA边界
    test_text_1 = """
    权利要求1: 一种设备，包括：
        - 处理器
        - 存储器
    CNA
    Claim 1: A device comprising:
        - a processor
        - a memory
    """
    
    # 测试用例2: 英文权利要求后跟中文权利要求，中间有WOA边界
    test_text_2 = """
    Claim 1: A method of processing data, comprising:
        - receiving input data
        - processing the data
    WOA
    权利要求1: 一种处理数据的方法，包括：
        - 接收输入数据
        - 处理所述数据
    """
    
    test_cases = [
        ("中文→英文 (CNA边界)", test_text_1),
        ("英文→中文 (WOA边界)", test_text_2),
    ]
    
    for case_name, text in test_cases:
        print(f"\n测试: {case_name}")
        print("=" * 50)
        
        # 解析权利要求
        claims_dict = parser.split_claims_by_numbers(text)
        
        print(f"解析结果: {len(claims_dict)} 个权利要求")
        for number, claim_text in claims_dict.items():
            print(f"权利要求{number}: {claim_text[:100]}...")
            
            # 检查是否包含边界标记
            if 'CNA' in claim_text or 'WOA' in claim_text:
                print("❌ 错误: 权利要求文本中包含边界标记")
            else:
                print("✅ 正确: 权利要求文本中不包含边界标记")
        
        # 测试单独解析每个部分
        print("\n详细分析:")
        print("-" * 30)
        
        # 测试语言检测
        import re
        boundary_pattern = r'\b([A-Z]{3})\b'
        boundary_matches = list(re.finditer(boundary_pattern, text))
        
        if boundary_matches:
            # 分割文本为多个部分
            text_parts = []
            start_pos = 0
            
            for match in boundary_matches:
                # 提取边界标记前的文本
                text_parts.append(text[start_pos:match.start()].strip())
                start_pos = match.end()
            
            # 提取最后一个边界标记后的文本
            text_parts.append(text[start_pos:].strip())
            
            for i, part in enumerate(text_parts):
                if part:
                    print(f"部分{i+1}:")
                    print(f"长度: {len(part)} 字符")
                    print(f"前50字符: {part[:50]}...")
                    # 测试单独解析
                    part_claims = parser._parse_single_language_claims(part)
                    print(f"解析出的权利要求: {len(part_claims)}")
                    for num, claim in part_claims.items():
                        print(f"  权利要求{num}: {claim[:50]}...")
                    # 测试语言检测
                    lang = parser._detect_text_language(part)
                    print(f"检测到的语言: {lang}")
                    print()
        
        print("测试完成")

if __name__ == "__main__":
    test_language_boundary_detection()
