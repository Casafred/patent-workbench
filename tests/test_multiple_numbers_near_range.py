#!/usr/bin/env python3
"""
测试权利要求范围引用附近出现多个数字时的识别情况
"""

from patent_claims_processor.processors.claims_classifier import ClaimsClassifier


def test_multiple_numbers_near_range():
    """测试权利要求范围引用附近出现多个数字的情况"""
    classifier = ClaimsClassifier()
    
    # 测试用例：权利要求范围引用附近出现多个数字
    test_cases = [
        # 英文测试用例
        {
            'text': 'A method according to claims 1 to 3, further comprising 5 steps.',
            'language': 'en',
            'expected': [1, 2, 3],
            'description': '英文：claims 1 to 3 附近有数字 5'
        },
        {
            'text': 'The device of claim 2 to 5, wherein the diameter is 10 cm.',
            'language': 'en',
            'expected': [2, 3, 4, 5],
            'description': '英文：claim 2 to 5 附近有数字 10'
        },
        {
            'text': 'A system as claimed in claims 1 to 4, having 8 components.',
            'language': 'en',
            'expected': [1, 2, 3, 4],
            'description': '英文：claims 1 to 4 附近有数字 8'
        },
        {
            'text': 'Method of claim 3 or 5, performed at 25 degrees Celsius.',
            'language': 'en',
            'expected': [3, 5],
            'description': '英文：claim 3 or 5 附近有数字 25'
        },
        
        # 德语测试用例
        {
            'text': 'Verfahren nach Anspruch 1 bis 3, umfassend 5 Schritte.',
            'language': 'de',
            'expected': [1, 2, 3],
            'description': '德语：Anspruch 1 bis 3 附近有数字 5'
        },
        {
            'text': 'Vorrichtung nach Anspruch 2 bis 5, wobei der Durchmesser 10 cm beträgt.',
            'language': 'de',
            'expected': [2, 3, 4, 5],
            'description': '德语：Anspruch 2 bis 5 附近有数字 10'
        },
        {
            'text': 'System nach Anspruch 1 oder 3, mit 8 Komponenten.',
            'language': 'de',
            'expected': [1, 3],
            'description': '德语：Anspruch 1 oder 3 附近有数字 8'
        },
        
        # 中文测试用例
        {
            'text': '如权利要求1至3所述的方法，进一步包括5个步骤。',
            'language': 'zh',
            'expected': [1, 2, 3],
            'description': '中文：权利要求1至3 附近有数字 5'
        },
        {
            'text': '根据权利要求2到5的装置，其中直径为10厘米。',
            'language': 'zh',
            'expected': [2, 3, 4, 5],
            'description': '中文：权利要求2到5 附近有数字 10'
        },
        {
            'text': '如权利要求1或3所述的系统，具有8个组件。',
            'language': 'zh',
            'expected': [1, 3],
            'description': '中文：权利要求1或3 附近有数字 8'
        },
        
        # 复杂测试用例：多个范围和多个数字
        {
            'text': 'Method according to claims 1 to 3 and 5 to 7, using 10 parameters for 20 iterations.',
            'language': 'en',
            'expected': [1, 2, 3, 5, 6, 7],
            'description': '英文：多个范围 claims 1 to 3 and 5 to 7 附近有多个数字 10 和 20'
        },
        {
            'text': 'Verfahren nach Anspruch 1 bis 3 und 5 bis 7, mit 10 Parametern für 20 Iterationen.',
            'language': 'de',
            'expected': [1, 2, 3, 5, 6, 7],
            'description': '德语：多个范围 Anspruch 1 bis 3 und 5 bis 7 附近有多个数字 10 和 20'
        },
        {
            'text': '如权利要求1至3和5至7所述的方法，使用10个参数进行20次迭代。',
            'language': 'zh',
            'expected': [1, 2, 3, 5, 6, 7],
            'description': '中文：多个范围 权利要求1至3和5至7 附近有多个数字 10 和 20'
        },
        
        # 边界测试：数字紧邻引用
        {
            'text': 'Claim 1 to 3 with 4 additional features.',
            'language': 'en',
            'expected': [1, 2, 3],
            'description': '英文：数字 4 紧邻引用'
        },
        {
            'text': '权利要求1至3具有4个附加特征。',
            'language': 'zh',
            'expected': [1, 2, 3],
            'description': '中文：数字 4 紧邻引用'
        },
        
        # 边界测试：多个数字混杂
        {
            'text': 'Method of claim 2 to 5, suitable for 6-8 year olds, requiring 10-12 minutes.',
            'language': 'en',
            'expected': [2, 3, 4, 5],
            'description': '英文：多个数字范围混杂'
        },
    ]
    
    print("测试权利要求范围引用附近出现多个数字时的识别情况\n")
    
    passed = 0
    failed = 0
    
    for i, test_case in enumerate(test_cases, 1):
        text = test_case['text']
        language = test_case['language']
        expected = test_case['expected']
        description = test_case['description']
        
        result = classifier.extract_referenced_claims(text, language)
        
        if result == expected:
            print(f"✓ 测试 {i}: {description}")
            print(f"  文本: {text}")
            print(f"  预期: {expected}")
            print(f"  实际: {result}")
            print()
            passed += 1
        else:
            print(f"✗ 测试 {i}: {description}")
            print(f"  文本: {text}")
            print(f"  预期: {expected}")
            print(f"  实际: {result}")
            print()
            failed += 1
    
    print(f"测试结果: 通过 {passed}, 失败 {failed}")
    print(f"通过率: {passed / len(test_cases) * 100:.1f}%")


if __name__ == "__main__":
    test_multiple_numbers_near_range()
