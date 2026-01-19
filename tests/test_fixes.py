#!/usr/bin/env python3
"""
测试功能七的修复
"""

import sys
import os

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from patent_claims_processor.processors.language_detector import LanguageDetector
from patent_claims_processor.processors.claims_classifier import ClaimsClassifier
from patent_claims_processor.processors.claims_parser import ClaimsParser

def test_german_language_detection():
    """测试德语语言检测"""
    print("=== 测试德语语言检测 ===")
    detector = LanguageDetector()
    
    # 测试德语权利要求
    german_claims = "Anspruch 1: Ein Gerät zum Messen der Temperatur, umfassend: ..."
    detected_lang = detector.detect_language(german_claims)
    print(f"德语权利要求检测结果: {detected_lang}")
    assert detected_lang == 'de', f"德语检测失败，得到: {detected_lang}"
    
    # 测试包含德语关键词的文本
    german_text = "Dadurch gekennzeichnet, dass..."
    detected_lang = detector.detect_language(german_text)
    print(f"德语关键词检测结果: {detected_lang}")
    assert detected_lang == 'de', f"德语关键词检测失败，得到: {detected_lang}"
    
    print("✅ 德语语言检测测试通过")

def test_claim_reference_rules():
    """测试权利要求引用规则"""
    print("\n=== 测试权利要求引用规则 ===")
    classifier = ClaimsClassifier()
    
    # 测试英语引用规则
    # 情况1: 有数字，应该提取具体数字
    en_claim_with_numbers = "A device according to claim 1, further comprising..."
    refs_en_with_numbers = classifier.extract_referenced_claims(en_claim_with_numbers, 'en')
    print(f"英语引用(有数字): {refs_en_with_numbers}")
    assert refs_en_with_numbers == [1], f"英语引用提取失败，得到: {refs_en_with_numbers}"
    
    # 情况2: 没有数字，应该返回'all'
    en_claim_no_numbers = "A device according to claim, further comprising..."
    refs_en_no_numbers = classifier.extract_referenced_claims(en_claim_no_numbers, 'en')
    print(f"英语引用(无数字): {refs_en_no_numbers}")
    assert refs_en_no_numbers == ['all'], f"英语引用规则失败，得到: {refs_en_no_numbers}"
    
    # 测试德语引用规则
    de_claim_with_numbers = "Eine Vorrichtung gemäß Anspruch 1, umfassend ferner..."
    refs_de_with_numbers = classifier.extract_referenced_claims(de_claim_with_numbers, 'de')
    print(f"德语引用(有数字): {refs_de_with_numbers}")
    assert refs_de_with_numbers == [1], f"德语引用提取失败，得到: {refs_de_with_numbers}"
    
    de_claim_no_numbers = "Eine Vorrichtung gemäß Anspruch, umfassend ferner..."
    refs_de_no_numbers = classifier.extract_referenced_claims(de_claim_no_numbers, 'de')
    print(f"德语引用(无数字): {refs_de_no_numbers}")
    assert refs_de_no_numbers == ['all'], f"德语引用规则失败，得到: {refs_de_no_numbers}"
    
    print("✅ 权利要求引用规则测试通过")

def test_german_claim_parsing():
    """测试德语权利要求解析"""
    print("\n=== 测试德语权利要求解析 ===")
    parser = ClaimsParser()
    
    # 测试德语权利要求解析
    german_claims_text = """
    Anspruch 1: Ein Gerät zum Messen der Temperatur.
    Anspruch 2: Das Gerät nach Anspruch 1, ferner umfassend eine Anzeige.
    Anspruch 3: Das Gerät nach Anspruch 1 und 2, wobei die Anzeige digital ist.
    """
    
    claims_dict = parser.split_claims_by_numbers(german_claims_text)
    print(f"德语权利要求解析结果: {claims_dict}")
    assert len(claims_dict) == 3, f"德语权利要求解析失败，得到 {len(claims_dict)} 个权利要求"
    assert 1 in claims_dict, "权利要求1未解析到"
    assert 2 in claims_dict, "权利要求2未解析到"
    assert 3 in claims_dict, "权利要求3未解析到"
    
    print("✅ 德语权利要求解析测试通过")

def test_claim_type_classification():
    """测试权利要求类型分类"""
    print("\n=== 测试权利要求类型分类 ===")
    classifier = ClaimsClassifier()
    detector = LanguageDetector()
    
    # 测试德语权利要求分类
    german_independent = "Anspruch 1: Ein Gerät zum Messen der Temperatur."
    german_dependent = "Anspruch 2: Das Gerät nach Anspruch 1, ferner umfassend eine Anzeige."
    
    lang_independent = detector.detect_language(german_independent)
    lang_dependent = detector.detect_language(german_dependent)
    
    # 调试：查看引用提取结果
    refs_independent = classifier.extract_referenced_claims(german_independent, lang_independent)
    refs_dependent = classifier.extract_referenced_claims(german_dependent, lang_dependent)
    print(f"德语独立权利要求引用: {refs_independent}")
    print(f"德语从属权利要求引用: {refs_dependent}")
    
    type_independent = classifier.classify_claim_type(german_independent, lang_independent)
    type_dependent = classifier.classify_claim_type(german_dependent, lang_dependent)
    
    print(f"德语独立权利要求分类: {type_independent}")
    print(f"德语从属权利要求分类: {type_dependent}")
    
    # 恢复断言
    assert type_independent == 'independent', f"德语独立权利要求分类失败，得到: {type_independent}"
    assert type_dependent == 'dependent', f"德语从属权利要求分类失败，得到: {type_dependent}"
    
    print("✅ 权利要求类型分类测试通过")

def main():
    """主测试函数"""
    try:
        test_german_language_detection()
        test_claim_reference_rules()
        test_german_claim_parsing()
        test_claim_type_classification()
        print("\n🎉 所有测试通过！")
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(main())
