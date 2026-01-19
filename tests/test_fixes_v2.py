#!/usr/bin/env python3
"""
测试修复后的功能
"""

import sys
import os

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from patent_claims_processor.processors.claims_classifier import ClaimsClassifier

def test_reference_extraction():
    """测试引用提取逻辑"""
    print("=== 测试引用提取逻辑 ===")
    classifier = ClaimsClassifier()
    
    # 测试范围引用
    test_cases = [
        # 英文范围引用
        ("A device according to claims 1 to 10, further comprising...", "en", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
        ("A system as claimed in claims 5-8", "en", [5, 6, 7, 8]),
        ("A method of claim 1 to 3", "en", [1, 2, 3]),
        
        # 中文范围引用
        ("一种设备，根据权利要求1-5所述", "zh", [1, 2, 3, 4, 5]),
        ("如权利要求2至4所述的系统", "zh", [2, 3, 4]),
        
        # 单个引用
        ("A component of claim 1", "en", [1]),
        ("权利要求3所述的方法", "zh", [3]),
    ]
    
    for claim_text, language, expected in test_cases:
        result = classifier.extract_referenced_claims(claim_text, language)
        status = "✅" if result == expected else "❌"
        print(f"{status} {language}: {claim_text[:50]}...")
        print(f"   期望: {expected}")
        print(f"   实际: {result}")
        if result != expected:
            print(f"   测试失败!")
        print()
    
    print("=== 引用提取测试完成 ===")

def main():
    """主测试函数"""
    try:
        test_reference_extraction()
        print("🎉 所有测试完成！")
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(main())
