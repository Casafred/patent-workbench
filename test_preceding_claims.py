#!/usr/bin/env python3
"""
测试preceding claims等权利要求引用短语的处理
"""

import sys
import os

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from patent_claims_processor.processors.claims_classifier import ClaimsClassifier


def test_preceding_claims():
    """测试preceding claims等短语的处理"""
    classifier = ClaimsClassifier()
    
    test_cases = [
        # 测试用例1: preceding claims
        ("The device according to preceding claims", "en", "dependent"),
        # 测试用例2: 普通独立权利要求
        ("A device comprising: a processor", "en", "independent"),
        # 测试用例3: 普通从属权利要求
        ("The device of claim 1 further comprising a memory", "en", "dependent"),
    ]
    
    for claim_text, language, expected_type in test_cases:
        result = classifier.classify_claim_type(claim_text, language)
        status = "✅" if result == expected_type else "❌"
        print(f"测试用例: {status} 预期: {expected_type}, 实际: {result}")
        print(f"  文本: {claim_text[:50]}...")
        
        # 测试引用提取
        referenced_claims = classifier.extract_referenced_claims(claim_text, language)
        print(f"  提取的引用: {referenced_claims}")
        print()

if __name__ == "__main__":
    test_preceding_claims()
