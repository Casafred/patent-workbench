"""
测试序号重启检测功能

验证权利要求解析器能否正确识别多语言版本的权利要求
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from patent_claims_processor.processors.claims_parser import ClaimsParser


def test_sequence_restart_detection():
    """测试序号重启检测功能"""
    
    print("=" * 60)
    print("测试序号重启检测功能")
    print("=" * 60)
    print()
    
    parser = ClaimsParser()
    
    # 测试用例：包含两个语言版本的权利要求
    test_text = """
    1. 一种智能手机，包括处理器和存储器。
    2. 根据权利要求1所述的智能手机，其特征在于还包括显示屏。
    3. 根据权利要求1或2所述的智能手机，其特征在于还包括摄像头。
    4. 根据权利要求1-3中任一项所述的智能手机，其特征在于还包括传感器。
    5. 根据权利要求1-4中任一项所述的智能手机，其特征在于还包括电池。
    
    1. A smartphone comprising a processor and a memory.
    2. The smartphone according to claim 1, further comprising a display.
    3. The smartphone according to claim 1 or 2, further comprising a camera.
    4. The smartphone according to any one of claims 1-3, further comprising a sensor.
    5. The smartphone according to any one of claims 1-4, further comprising a battery.
    """
    
    print("1. 测试文本:")
    print(test_text.strip())
    print()
    
    # 提取序号
    print("2. 提取序号:")
    claim_numbers = parser.extract_claim_numbers(test_text)
    print(f"   找到的序号: {claim_numbers}")
    print()
    
    # 检测重启点
    print("3. 检测序号重启:")
    restart_points = parser.detect_sequence_restart(claim_numbers)
    print(f"   重启点: {restart_points}")
    print()
    
    # 分析结构
    print("4. 分析权利要求结构:")
    structure = parser.analyze_claim_structure(test_text)
    print(f"   总权利要求数: {structure['total_claims']}")
    print(f"   语言段数: {structure['language_segments']}")
    print(f"   重启点: {structure['restart_points']}")
    print()
    
    # 分割权利要求
    print("5. 分割权利要求:")
    claims_dict = parser.split_claims_by_numbers(test_text)
    print(f"   提取到的权利要求数: {len(claims_dict)}")
    
    for number in sorted(claims_dict.keys()):
        text = claims_dict[number]
        language = "中文" if any('\u4e00' <= char <= '\u9fff' for char in text) else "英文"
        print(f"   权利要求 {number} ({language}): {text[:50]}...")
    print()
    
    # 验证结果
    print("6. 验证结果:")
    expected_claims = 5  # 应该提取到5个不同的权利要求（每个序号选择最好的版本）
    if len(claims_dict) == expected_claims:
        print(f"   ✓ 成功提取了 {expected_claims} 个权利要求")
    else:
        print(f"   ✗ 预期 {expected_claims} 个权利要求，实际提取了 {len(claims_dict)} 个")
    
    # 检查是否检测到重启
    if restart_points:
        print(f"   ✓ 成功检测到序号重启: {restart_points}")
    else:
        print("   ✗ 未检测到序号重启")
    
    # 检查是否包含两种语言
    chinese_claims = sum(1 for text in claims_dict.values() if any('\u4e00' <= char <= '\u9fff' for char in text))
    english_claims = len(claims_dict) - chinese_claims
    
    print(f"   中文权利要求: {chinese_claims} 个")
    print(f"   英文权利要求: {english_claims} 个")
    
    if chinese_claims > 0 and english_claims > 0:
        print("   ✓ 成功识别了多语言版本")
    else:
        print("   ✗ 未能正确识别多语言版本")
    
    print()
    print("=" * 60)
    print("测试完成")
    print("=" * 60)
    
    return len(claims_dict) == expected_claims and len(restart_points) > 0


def test_edge_cases():
    """测试边缘情况"""
    
    print("\n测试边缘情况:")
    print("-" * 40)
    
    parser = ClaimsParser()
    
    # 测试用例1: 不完整的第一个版本
    test_text1 = """
    1. 一种设备。
    3. 根据权利要求1所述的设备。
    
    1. A device.
    2. The device according to claim 1.
    3. The device according to claim 1.
    """
    
    print("测试用例1: 不完整的第一个版本")
    claims1 = parser.split_claims_by_numbers(test_text1)
    restart1 = parser.detect_sequence_restart(parser.extract_claim_numbers(test_text1))
    print(f"   提取权利要求: {len(claims1)} 个")
    print(f"   重启点: {restart1}")
    
    # 测试用例2: 多次重启
    test_text2 = """
    1. 第一版本权利要求1
    2. 第一版本权利要求2
    
    1. 第二版本权利要求1
    2. 第二版本权利要求2
    
    1. 第三版本权利要求1
    2. 第三版本权利要求2
    """
    
    print("\n测试用例2: 多次重启")
    claims2 = parser.split_claims_by_numbers(test_text2)
    restart2 = parser.detect_sequence_restart(parser.extract_claim_numbers(test_text2))
    print(f"   提取权利要求: {len(claims2)} 个")
    print(f"   重启点: {restart2}")
    
    return True


if __name__ == '__main__':
    success1 = test_sequence_restart_detection()
    success2 = test_edge_cases()
    
    if success1 and success2:
        print("\n🎉 所有测试通过！")
        sys.exit(0)
    else:
        print("\n❌ 部分测试失败")
        sys.exit(1)