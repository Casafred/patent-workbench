"""
测试日语语言检测修复

验证日语不会被误判为中文
"""

import pytest
from patent_claims_processor.processors import LanguageDetector


def test_japanese_detection_with_hiragana():
    """测试包含平假名的日语文本"""
    detector = LanguageDetector()
    
    # 日语专利权利要求示例（包含平假名）
    japanese_text = """
    1. コンピュータシステムにおいて、データを処理する方法であって、
    前記方法は、入力データを受信するステップと、
    前記入力データを解析するステップと、
    結果を出力するステップとを含むことを特徴とする方法。
    """
    
    result = detector.detect_language(japanese_text)
    assert result == 'ja', f"Expected 'ja' but got '{result}'"
    print(f"✓ 平假名日语文本正确识别为: {result}")


def test_japanese_detection_with_katakana():
    """测试包含片假名的日语文本"""
    detector = LanguageDetector()
    
    # 包含片假名的日语文本
    japanese_text = """
    1. コンピュータシステムであって、
    プロセッサと、メモリと、ストレージとを備え、
    前記プロセッサは、データを処理することを特徴とするシステム。
    """
    
    result = detector.detect_language(japanese_text)
    assert result == 'ja', f"Expected 'ja' but got '{result}'"
    print(f"✓ 片假名日语文本正确识别为: {result}")


def test_japanese_detection_with_kanji():
    """测试包含汉字和假名的日语文本"""
    detector = LanguageDetector()
    
    # 混合汉字和假名的日语文本
    japanese_text = """
    請求項1に記載の方法において、
    前記データ処理ステップは、機械学習アルゴリズムを使用して
    実行されることを特徴とする方法。
    """
    
    result = detector.detect_language(japanese_text)
    assert result == 'ja', f"Expected 'ja' but got '{result}'"
    print(f"✓ 汉字+假名日语文本正确识别为: {result}")


def test_chinese_not_misidentified_as_japanese():
    """测试中文不会被误判为日语"""
    detector = LanguageDetector()
    
    # 纯中文文本（无假名）
    chinese_text = """
    1. 一种计算机系统，其特征在于，包括：
    处理器，用于处理数据；
    存储器，用于存储数据；
    输出装置，用于输出处理结果。
    """
    
    result = detector.detect_language(chinese_text)
    assert result == 'zh', f"Expected 'zh' but got '{result}'"
    print(f"✓ 中文文本正确识别为: {result}")


def test_japanese_keywords():
    """测试日语关键词识别"""
    detector = LanguageDetector()
    
    # 包含日语专利常用词的文本
    japanese_text = """
    請求項1に記載の装置において、
    前記処理手段は、データを変換することを特徴とする装置。
    """
    
    result = detector.detect_language(japanese_text)
    assert result == 'ja', f"Expected 'ja' but got '{result}'"
    print(f"✓ 日语关键词文本正确识别为: {result}")


def test_mixed_cjk_text():
    """测试混合CJK文本的识别"""
    detector = LanguageDetector()
    
    # 测试数据
    test_cases = [
        ("これは日本語です。", 'ja'),  # 纯日语
        ("这是中文。", 'zh'),  # 纯中文
        ("This is English.", 'en'),  # 纯英文
        ("請求項1に記載の方法", 'ja'),  # 日语专利用语
        ("权利要求1所述的方法", 'zh'),  # 中文专利用语
    ]
    
    for text, expected_lang in test_cases:
        result = detector.detect_language(text)
        assert result == expected_lang, f"Text '{text}' expected '{expected_lang}' but got '{result}'"
        print(f"✓ '{text[:20]}...' 正确识别为: {result}")


def test_japanese_patent_real_example():
    """测试真实的日语专利文本"""
    detector = LanguageDetector()
    
    # 真实的日语专利权利要求示例
    japanese_patent = """
    1. 情報処理装置であって、
    入力部と、
    前記入力部から入力されたデータを処理する処理部と、
    前記処理部による処理結果を出力する出力部と
    を備えることを特徴とする情報処理装置。
    
    2. 請求項1に記載の情報処理装置において、
    前記処理部は、ニューラルネットワークを用いて
    データを解析することを特徴とする情報処理装置。
    """
    
    result = detector.detect_language(japanese_patent)
    assert result == 'ja', f"Expected 'ja' but got '{result}'"
    print(f"✓ 真实日语专利文本正确识别为: {result}")


def test_chinese_patent_real_example():
    """测试真实的中文专利文本"""
    detector = LanguageDetector()
    
    # 真实的中文专利权利要求示例
    chinese_patent = """
    1. 一种信息处理装置，其特征在于，包括：
    输入部；
    处理部，用于处理从所述输入部输入的数据；以及
    输出部，用于输出所述处理部的处理结果。
    
    2. 根据权利要求1所述的信息处理装置，其特征在于，
    所述处理部使用神经网络来分析数据。
    """
    
    result = detector.detect_language(chinese_patent)
    assert result == 'zh', f"Expected 'zh' but got '{result}'"
    print(f"✓ 真实中文专利文本正确识别为: {result}")


if __name__ == '__main__':
    print("=" * 60)
    print("日语语言检测修复测试")
    print("=" * 60)
    
    test_japanese_detection_with_hiragana()
    test_japanese_detection_with_katakana()
    test_japanese_detection_with_kanji()
    test_chinese_not_misidentified_as_japanese()
    test_japanese_keywords()
    test_mixed_cjk_text()
    test_japanese_patent_real_example()
    test_chinese_patent_real_example()
    
    print("=" * 60)
    print("✅ 所有测试通过！日语识别问题已修复")
    print("=" * 60)
