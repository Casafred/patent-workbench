"""
测试完整权利要求提取功能

验证系统能否提取单元格内所有语言版本的权利要求
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from patent_claims_processor.services.processing_service import ProcessingService


def test_complete_extraction():
    """测试完整权利要求提取"""
    
    print("=" * 60)
    print("测试完整权利要求提取功能")
    print("=" * 60)
    print()
    
    service = ProcessingService()
    
    # 测试用例：包含两个完整语言版本的权利要求
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
    
    # 使用处理服务处理单元格
    print("2. 处理单元格...")
    claims_info = service.process_single_cell(test_text)
    
    print(f"   提取到的权利要求数: {len(claims_info)}")
    print()
    
    # 分析结果
    print("3. 分析结果:")
    
    # 按语言分组
    chinese_claims = [c for c in claims_info if c.language == 'zh']
    english_claims = [c for c in claims_info if c.language == 'en']
    other_claims = [c for c in claims_info if c.language not in ['zh', 'en']]
    
    print(f"   中文权利要求: {len(chinese_claims)} 个")
    print(f"   英文权利要求: {len(english_claims)} 个")
    print(f"   其他语言权利要求: {len(other_claims)} 个")
    print()
    
    # 显示每个权利要求的详细信息
    print("4. 权利要求详情:")
    for claim in sorted(claims_info, key=lambda x: x.claim_number):
        print(f"   权利要求 {claim.claim_number} ({claim.language}):")
        print(f"      类型: {claim.claim_type}")
        print(f"      文本: {claim.claim_text[:50]}...")
        print(f"      引用: {claim.referenced_claims}")
        print(f"      置信度: {claim.confidence_score:.2f}")
        print()
    
    # 验证结果
    print("5. 验证结果:")
    
    # 检查是否提取了所有序号
    extracted_numbers = sorted([c.claim_number for c in claims_info])
    expected_numbers = [1, 2, 3, 4, 5]
    
    if extracted_numbers == expected_numbers:
        print(f"   ✓ 成功提取了所有序号: {extracted_numbers}")
    else:
        print(f"   ✗ 序号不完整，预期: {expected_numbers}，实际: {extracted_numbers}")
    
    # 检查是否包含两种语言
    if len(chinese_claims) > 0 and len(english_claims) > 0:
        print("   ✓ 成功识别了多语言版本")
    else:
        print("   ✗ 未能正确识别多语言版本")
    
    # 检查独立和从属权利要求
    independent_claims = [c for c in claims_info if c.claim_type == 'independent']
    dependent_claims = [c for c in claims_info if c.claim_type == 'dependent']
    
    print(f"   独立权利要求: {len(independent_claims)} 个")
    print(f"   从属权利要求: {len(dependent_claims)} 个")
    
    # 理想情况下应该有1个独立权利要求（序号1）和4个从属权利要求
    if len(independent_claims) >= 1 and len(dependent_claims) >= 4:
        print("   ✓ 权利要求类型分类正确")
    else:
        print("   ⚠ 权利要求类型分类可能需要调整")
    
    print()
    print("=" * 60)
    print("测试完成")
    print("=" * 60)
    
    # 返回是否成功提取了所有序号
    return extracted_numbers == expected_numbers


def test_real_world_case():
    """测试真实世界的案例"""
    
    print("\n测试真实世界案例:")
    print("-" * 40)
    
    service = ProcessingService()
    
    # 模拟一个更复杂的真实案例
    complex_text = """
    1. 一种电子设备，其特征在于，包括：
       处理器；
       存储器，与所述处理器连接。
    
    2. 根据权利要求1所述的电子设备，其特征在于，还包括：
       显示屏，与所述处理器连接。
    
    3. 根据权利要求1或2所述的电子设备，其特征在于，还包括：
       输入装置。
    
    1. An electronic device, characterized in that it comprises:
       a processor;
       a memory connected to the processor.
    
    2. The electronic device according to claim 1, characterized in that it further comprises:
       a display screen connected to the processor.
    
    3. The electronic device according to claim 1 or 2, characterized in that it further comprises:
       an input device.
    """
    
    print("处理复杂案例...")
    claims_info = service.process_single_cell(complex_text)
    
    print(f"提取到的权利要求数: {len(claims_info)}")
    
    # 按语言分组
    chinese_claims = [c for c in claims_info if c.language == 'zh']
    english_claims = [c for c in claims_info if c.language == 'en']
    
    print(f"中文权利要求: {len(chinese_claims)} 个")
    print(f"英文权利要求: {len(english_claims)} 个")
    
    # 检查序号完整性
    extracted_numbers = sorted([c.claim_number for c in claims_info])
    expected_numbers = [1, 2, 3]
    
    if extracted_numbers == expected_numbers:
        print("✓ 复杂案例处理成功")
        return True
    else:
        print(f"✗ 复杂案例处理失败，预期: {expected_numbers}，实际: {extracted_numbers}")
        return False


if __name__ == '__main__':
    success1 = test_complete_extraction()
    success2 = test_real_world_case()
    
    if success1 and success2:
        print("\n🎉 所有测试通过！")
        sys.exit(0)
    else:
        print("\n❌ 部分测试失败")
        sys.exit(1)