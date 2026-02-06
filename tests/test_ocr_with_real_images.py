#!/usr/bin/env python3
"""
测试真实专利图片的OCR识别能力
"""

import sys
import os

# 添加backend到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def test_image_file(image_path):
    """测试单个图片文件"""
    print("\n" + "=" * 70)
    print(f"测试图片: {os.path.basename(image_path)}")
    print("=" * 70)
    
    # 检查文件是否存在
    if not os.path.exists(image_path):
        print(f"[X] 文件不存在: {image_path}")
        return False
    
    # 读取图片
    try:
        with open(image_path, 'rb') as f:
            image_data = f.read()
        print(f"[OK] 图片读取成功 ({len(image_data)} bytes)")
    except Exception as e:
        print(f"[X] 图片读取失败: {e}")
        return False
    
    # 执行OCR
    try:
        from utils.ocr_utils import perform_ocr
        
        print("[*] 开始OCR识别...")
        results = perform_ocr(image_data, timeout_seconds=60)
        
        print(f"\n[OK] OCR识别完成")
        print(f"   识别到 {len(results)} 个文本区域")
        
        if results:
            print("\n[识别详情]")
            print("-" * 70)
            for i, result in enumerate(results, 1):
                print(f"{i:3d}. 文本: '{result['number']:>10s}' | "
                      f"位置: ({result['x']:4d}, {result['y']:4d}) | "
                      f"大小: {result['width']:3d}x{result['height']:3d} | "
                      f"置信度: {result['confidence']:5.1f}%")
            print("-" * 70)
            
            # 统计数字标记
            numeric_markers = [r for r in results if r['number'].isdigit()]
            print(f"\n[统计]")
            print(f"   总识别数: {len(results)}")
            print(f"   纯数字标记: {len(numeric_markers)}")
            if numeric_markers:
                numbers = sorted([int(r['number']) for r in numeric_markers])
                print(f"   数字范围: {min(numbers)} - {max(numbers)}")
                print(f"   识别的数字: {numbers[:20]}{'...' if len(numbers) > 20 else ''}")
        else:
            print("\n[!] 未识别到任何文本")
            print("\n可能原因:")
            print("   1. 图片中没有清晰的文字")
            print("   2. 文字太小或模糊")
            print("   3. 背景干扰太多")
            print("   4. OCR模型不适合这类图片")
        
        return True
        
    except Exception as e:
        print(f"\n[X] OCR识别失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """主测试函数"""
    print("=" * 70)
    print("测试真实专利图片的OCR识别")
    print("=" * 70)
    
    # 测试图片列表
    test_images = [
        "tests/test patent pic.png",
        "tests/2,0439e17894683f41_full.gif"
    ]
    
    success_count = 0
    total_count = len(test_images)
    
    for image_path in test_images:
        if test_image_file(image_path):
            success_count += 1
    
    # 总结
    print("\n" + "=" * 70)
    print("测试总结")
    print("=" * 70)
    print(f"测试图片数: {total_count}")
    print(f"成功识别: {success_count}")
    print(f"失败: {total_count - success_count}")
    
    if success_count == total_count:
        print("\n[OK] 所有图片测试通过！")
        return 0
    else:
        print(f"\n[!] {total_count - success_count} 个图片测试失败")
        return 1


if __name__ == '__main__':
    sys.exit(main())
