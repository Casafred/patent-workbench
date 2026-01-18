#!/usr/bin/env python3
"""
测试权利要求分类修复

测试以下修复：
1. 当权利要求段内出现"claims"时应识别为从权
2. 支持德语"und"和英文"or"作为权利要求引用的连接词
"""

import sys
import os

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from patent_claims_processor.processors.claims_classifier import ClaimsClassifier


def test_claims_in_body_classification():
    """测试权利要求段内出现claims时的分类"""
    print("=== 测试权利要求段内出现claims时的分类 ===")
    classifier = ClaimsClassifier()
    
    test_cases = [
        # 测试用例1: 权利要求段内出现"claims"，应识别为从权
        ("1. A device comprising: a processor. The device as described in claims 1.", "en", "dependent"),
        # 测试用例2: 普通独立权利要求
        ("1. A device comprising: a processor.", "en", "independent"),
        # 测试用例3: 普通从属权利要求
        ("2. The device of claim 1 further comprising a memory.", "en", "dependent"),
    ]
    
    for i, (claim_text, language, expected_type) in enumerate(test_cases):
        result = classifier.classify_claim_type(claim_text, language)
        status = "✅" if result == expected_type else "❌"
        print(f"测试用例{i+1}: {status} 预期: {expected_type}, 实际: {result}")
        print(f"  文本: {claim_text[:50]}...")
        
        # 测试引用提取
        referenced_claims = classifier.extract_referenced_claims(claim_text, language)
        print(f"  提取的引用: {referenced_claims}")
        print()


def test_or_und_handling():
    """测试英文or和德语und作为连接词的处理"""
    print("=== 测试英文or和德语und作为连接词的处理 ===")
    classifier = ClaimsClassifier()
    
    test_cases = [
        # 测试用例1: 英文or连接
        ("2. The device of claim 1 or 2 further comprising a memory.", "en", [1, 2]),
        # 测试用例2: 德语und连接
        ("2. Das Gerät nach Anspruch 1 und 2, ferner umfassend einen Speicher.", "de", [1, 2]),
        # 测试用例3: 英文or连接多个权利要求
        ("3. The system of claim 1 or 2 or 3 further comprising a display.", "en", [1, 2, 3]),
        # 测试用例4: 德语und连接多个权利要求
        ("3. Das System nach Anspruch 1 und 2 und 3, ferner umfassend eine Anzeige.", "de", [1, 2, 3]),
    ]
    
    for i, (claim_text, language, expected_claims) in enumerate(test_cases):
        referenced_claims = classifier.extract_referenced_claims(claim_text, language)
        status = "✅" if referenced_claims == expected_claims else "❌"
        print(f"测试用例{i+1}: {status} 预期: {expected_claims}, 实际: {referenced_claims}")
        print(f"  文本: {claim_text[:50]}...")
        
        # 测试分类
        claim_type = classifier.classify_claim_type(claim_text, language)
        print(f"  分类结果: {claim_type}")
        print()


def test_combined_cases():
    """测试组合情况"""
    print("=== 测试组合情况 ===")
    classifier = ClaimsClassifier()
    
    test_cases = [
        # 测试用例1: 段内出现claims且包含or连接
        ("2. A device comprising: a processor. The device as described in claims 1 or 2.", "en", "dependent", [1, 2]),
        # 测试用例2: 段内出现claims且包含to范围
        ("2. A device comprising: a processor. The device as described in claims 1 to 3.", "en", "dependent", [1, 2, 3]),
    ]
    
    for i, (claim_text, language, expected_type, expected_claims) in enumerate(test_cases):
        claim_type = classifier.classify_claim_type(claim_text, language)
        referenced_claims = classifier.extract_referenced_claims(claim_text, language)
        
        type_status = "✅" if claim_type == expected_type else "❌"
        claims_status = "✅" if referenced_claims == expected_claims else "❌"
        
        print(f"测试用例{i+1}:")
        print(f"  分类: {type_status} 预期: {expected_type}, 实际: {claim_type}")
        print(f"  引用: {claims_status} 预期: {expected_claims}, 实际: {referenced_claims}")
        print(f"  文本: {claim_text[:50]}...")
        print()


if __name__ == "__main__":
    print("开始测试权利要求分类修复...\n")
    
    test_claims_in_body_classification()
    test_or_und_handling()
    test_combined_cases()
    
    print("🎉 所有测试完成！")
