#!/usr/bin/env python3
"""
Pillow Integration Test
测试Pillow与RapidOCR的集成
"""

import sys
from io import BytesIO

def test_pillow_import():
    """测试Pillow导入"""
    print("\n[1/5] 测试Pillow导入...")
    try:
        from PIL import Image, ImageDraw, ImageFont
        print("  ✓ Pillow导入成功")
        return True
    except ImportError as e:
        print(f"  ✗ Pillow导入失败: {e}")
        return False


def test_image_creation():
    """测试图像创建"""
    print("\n[2/5] 测试图像创建...")
    try:
        from PIL import Image
        
        # 创建测试图像
        img = Image.new('RGB', (200, 100), color='white')
        print(f"  ✓ 创建图像成功: {img.size}, {img.mode}")
        
        # 测试不同模式
        img_gray = Image.new('L', (100, 100), color=255)
        print(f"  ✓ 创建灰度图像成功: {img_gray.size}, {img_gray.mode}")
        
        return True
    except Exception as e:
        print(f"  ✗ 图像创建失败: {e}")
        return False


def test_image_conversion():
    """测试图像格式转换"""
    print("\n[3/5] 测试图像格式转换...")
    try:
        from PIL import Image
        import numpy as np
        import cv2
        
        # 创建PIL图像
        pil_img = Image.new('RGB', (100, 100), color=(255, 0, 0))
        print("  ✓ 创建PIL图像")
        
        # 转换为numpy数组
        np_img = np.array(pil_img)
        print(f"  ✓ 转换为numpy数组: shape={np_img.shape}, dtype={np_img.dtype}")
        
        # 转换为OpenCV格式（BGR）
        cv_img = cv2.cvtColor(np_img, cv2.COLOR_RGB2BGR)
        print(f"  ✓ 转换为OpenCV格式: shape={cv_img.shape}")
        
        # 验证颜色转换正确（红色RGB(255,0,0) -> BGR(0,0,255)）
        if cv_img[0, 0, 2] == 255 and cv_img[0, 0, 0] == 0:
            print("  ✓ 颜色转换正确")
        else:
            print(f"  ⚠ 颜色转换可能有问题: {cv_img[0, 0]}")
        
        return True
    except Exception as e:
        print(f"  ✗ 图像转换失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_image_decode():
    """测试图像解码（模拟base64场景）"""
    print("\n[4/5] 测试图像解码...")
    try:
        from PIL import Image, ImageDraw, ImageFont
        import base64
        
        # 创建测试图像
        img = Image.new('RGB', (200, 100), color='white')
        draw = ImageDraw.Draw(img)
        
        # 绘制测试文字
        try:
            font = ImageFont.truetype("arial.ttf", 40)
        except:
            font = ImageFont.load_default()
        
        draw.text((50, 30), "123", fill='black', font=font)
        print("  ✓ 绘制测试文字")
        
        # 保存为bytes
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        image_bytes = buffer.getvalue()
        print(f"  ✓ 转换为bytes: {len(image_bytes)} bytes")
        
        # 模拟base64编码/解码
        encoded = base64.b64encode(image_bytes).decode('utf-8')
        decoded = base64.b64decode(encoded)
        print(f"  ✓ Base64编码/解码: {len(encoded)} chars -> {len(decoded)} bytes")
        
        # 从bytes重新加载
        img_reloaded = Image.open(BytesIO(decoded))
        print(f"  ✓ 从bytes重新加载: {img_reloaded.size}, {img_reloaded.mode}")
        
        return True
    except Exception as e:
        print(f"  ✗ 图像解码失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_ocr_utils_integration():
    """测试OCR utils集成"""
    print("\n[5/5] 测试OCR utils集成...")
    try:
        from backend.utils.ocr_utils import perform_ocr
        from PIL import Image, ImageDraw, ImageFont
        
        # 创建测试图像
        img = Image.new('RGB', (300, 150), color='white')
        draw = ImageDraw.Draw(img)
        
        # 绘制数字
        try:
            font = ImageFont.truetype("arial.ttf", 60)
        except:
            font = ImageFont.load_default()
        
        draw.text((50, 50), "1 2 3", fill='black', font=font)
        
        # 转换为bytes
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        image_bytes = buffer.getvalue()
        
        print(f"  ✓ 创建测试图像: {len(image_bytes)} bytes")
        
        # 调用perform_ocr
        print("  ⏳ 执行OCR识别...")
        results = perform_ocr(image_bytes)
        
        print(f"  ✓ OCR识别完成: 识别到 {len(results)} 个结果")
        
        if results:
            print("  识别结果:")
            for r in results:
                print(f"    - {r['number']} (置信度: {r['confidence']:.1f}%)")
        
        return True
    except Exception as e:
        print(f"  ✗ OCR utils集成测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """运行所有测试"""
    print("=" * 60)
    print("Pillow Integration Test Suite")
    print("=" * 60)
    
    tests = [
        test_pillow_import,
        test_image_creation,
        test_image_conversion,
        test_image_decode,
        test_ocr_utils_integration,
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"\n✗ 测试异常: {e}")
            import traceback
            traceback.print_exc()
            results.append(False)
    
    print("\n" + "=" * 60)
    print(f"测试结果: {sum(results)}/{len(results)} 通过")
    print("=" * 60)
    
    if all(results):
        print("\n✓ 所有测试通过！Pillow集成正常。")
        return 0
    else:
        print("\n✗ 部分测试失败，请检查错误信息。")
        return 1


if __name__ == '__main__':
    sys.exit(main())
