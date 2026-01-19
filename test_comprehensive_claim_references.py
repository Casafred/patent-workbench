#!/usr/bin/env python3
"""
全面测试权利要求引用的处理

测试各种形式的权利要求引用，确保只要权利要求专用词汇附近没有明确的数字，就认为是引用全部权利要求。
"""

import sys
import os

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from patent_claims_processor.processors.claims_classifier import ClaimsClassifier


def test_comprehensive_claim_references():
    """测试各种形式的权利要求引用"""
    classifier = ClaimsClassifier()
    
    # 测试用例：各种形式的权利要求引用
    test_cases = [
        # 英文测试用例
        ("The device according to preceding claims", "en", "dependent", ['all']),
        ("The system as claimed in claims", "en", "dependent", ['all']),
        ("The method according to claim", "en", "dependent", ['all']),
        ("The apparatus as defined in claims", "en", "dependent", ['all']),
        ("The device of claims", "en", "dependent", ['all']),
        ("The system in claims", "en", "dependent", ['all']),
        ("The method of claims", "en", "dependent", ['all']),
        ("The apparatus according to claim", "en", "dependent", ['all']),
        
        # 德语测试用例
        ("Das Gerät gemäß Anspruch", "de", "dependent", ['all']),
        ("Das System wie in Anspruch", "de", "dependent", ['all']),
        ("Das Verfahren definiert in Anspruch", "de", "dependent", ['all']),
        
        # 中文测试用例
        ("根据权利要求", "zh", "dependent", ['all']),
        ("如权利要求", "zh", "dependent", ['all']),
        ("按照权利要求", "zh", "dependent", ['all']),
        
        # 有明确数字的测试用例（应该提取具体数字）
        ("The device of claim 1", "en", "dependent", [1]),
        ("Das Gerät nach Anspruch 2", "de", "dependent", [2]),
        ("根据权利要求3", "zh", "dependent", [3]),
        
        # 独立权利要求测试用例
        ("A device comprising: a processor", "en", "independent", []),
        ("Ein Gerät umfassend: einen Prozessor", "de", "independent", []),
        ("一种设备，包括：处理器", "zh", "independent", []),
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
    test_comprehensive_claim_references()
