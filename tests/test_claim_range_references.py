#!/usr/bin/env python3
"""
测试权利要求范围引用的处理

测试各种形式的权利要求范围引用，确保能够正确识别多个数字的情况，如"claim 1 to 10"、"claims 1-5"等。
"""

import sys
import os

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from patent_claims_processor.processors.claims_classifier import ClaimsClassifier


def test_claim_range_references():
    """测试权利要求范围引用的处理"""
    classifier = ClaimsClassifier()
    
    # 测试用例：各种形式的权利要求范围引用
    test_cases = [
        # 英文范围引用
        ("The device of claim 1 to 5", "en", "dependent", [1, 2, 3, 4, 5]),
        ("The system according to claims 1-10", "en", "dependent", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
        ("The method as claimed in claim 2 to 8", "en", "dependent", [2, 3, 4, 5, 6, 7, 8]),
        ("The apparatus of claims 3-7", "en", "dependent", [3, 4, 5, 6, 7]),
        
        # 德语范围引用
        ("Das Gerät nach Anspruch 1 bis 3", "de", "dependent", [1, 2, 3]),
        ("Das System gemäß Ansprüchen 2-5", "de", "dependent", [2, 3, 4, 5]),
        
        # 中文范围引用
        ("根据权利要求1至5", "zh", "dependent", [1, 2, 3, 4, 5]),
        ("如权利要求2-10", "zh", "dependent", [2, 3, 4, 5, 6, 7, 8, 9, 10]),
        
        # 混合形式
        ("The device of claim 1 to 3 and 5", "en", "dependent", [1, 2, 3, 5]),
        ("The system according to claims 2-4 or 6-8", "en", "dependent", [2, 3, 4, 6, 7, 8]),
        
        # 单个数字引用
        ("The device of claim 1", "en", "dependent", [1]),
        ("Das Gerät nach Anspruch 2", "de", "dependent", [2]),
        ("根据权利要求3", "zh", "dependent", [3]),
        
        # 没有明确数字的引用
        ("The device of claims", "en", "dependent", ['all']),
        ("Das Gerät gemäß Anspruch", "de", "dependent", ['all']),
        ("根据权利要求", "zh", "dependent", ['all']),
    ]
    
    for i, (claim_text, language, expected_type, expected_references) in enumerate(test_cases):
        # 测试引用提取
        references = classifier.extract_referenced_claims(claim_text, language)
        # 测试类型分类
        claim_type = classifier.classify_claim_type(claim_text, language)
        
        # 检查引用提取结果
        references_status = "✅" if references == expected_references else "❌"
        # 检查类型分类结果
        type_status = "✅" if claim_type == expected_type else "❌"
        
        print(f"测试用例{i+1}: {references_status} {type_status}")
        print(f"  文本: {claim_text}")
        print(f"  语言: {language}")
        print(f"  预期引用: {expected_references}, 实际引用: {references}")
        print(f"  预期类型: {expected_type}, 实际类型: {claim_type}")
        print()

if __name__ == "__main__":
    test_claim_range_references()
