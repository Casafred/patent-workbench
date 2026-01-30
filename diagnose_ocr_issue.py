#!/usr/bin/env python3
"""
OCR识别问题诊断脚本
用于排查RapidOCR识别不出标记的问题
"""

import sys
import os
from io import BytesIO
import base64

def test_imports():
    """测试1: 检查依赖导入"""
    print("\n" + "="*60)
    print("测试1: 检查依赖导入")
    print("="*60)
    
    try:
        from rapidocr_onnxruntime import RapidOCR
        print("✓ RapidOCR导入成功")
    except ImportError as e:
        print(f"✗ RapidOCR导入失败: {e}")
        return False
    
    try:
        from PIL import Image
        print("✓ Pillow导入成功")
    except ImportError as e:
        print(f"✗ Pillow导入失败: {e}")
        return False
    
    try:
        import cv2
        print("✓ OpenCV导入成功")
    except ImportError as e:
        print(f"✗ OpenCV导入失败: {e}")
        return False
    
    try:
        import numpy as np
        print("✓ NumPy导入成功")
    except ImportError as e:
        print(f"✗ NumPy导入失败: {e}")
        return False
    
    return True


def test_ocr_initialization():
    """测试2: OCR引擎初始化"""
    print("\n" + "="*60)
    print("测试2: OCR引擎初始化")
    print("="*60)
    
    try:
        from rapidocr_onnxruntime import RapidOCR
        ocr = RapidOCR()
        print("✓ RapidOCR引擎初始化成功")
        return ocr
    except Exception as e:
        print(f"✗ RapidOCR引擎初始化失败: {e}")
        import traceback
        traceback.print_exc()
        return None


def test_simple_image():
    """测试3: 简单图像识别"""
    print("\n" + "="*60)
    print("测试3: 简单图像识别")
    print("="*60)
    
    try:
        from rapidocr_onnxruntime import RapidOCR
        from PIL import Image, ImageDraw, ImageFont
        import numpy as np
        import cv2
        
        # 创建测试图像 - 白底黑字
        img = Image.new('RGB', (400, 200), color='white')
        draw = ImageDraw.Draw(img)
        
        # 尝试使用系统字体
        try:
            font = ImageFont.truetype("arial.ttf", 80)
        except:
            try:
                font = ImageFont.truetype("C:\\Windows\\Fonts\\arial.ttf", 80)
            except:
                font = ImageFont.load_default()
                print("⚠ 使用默认字体（可能太小）")
        
        # 绘制大号数字
        draw.text((50, 50), "123", fill='black', font=font)
        
        # 转换为numpy数组
        img_array = np.array(img)
        img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
        
        # 保存测试图像
        cv2.imwrite('test_ocr_simple.png', img_bgr)
        print("✓ 测试图像已保存: test_ocr_simple.png")
        
        # 执行OCR
        ocr = RapidOCR()
        result = ocr(img_bgr, use_det=True, use_cls=True, use_rec=True)
        
        print(f"\n原始OCR结果: {result}")
        
        if result is None or len(result) == 0:
            print("✗ OCR未识别到任何文字")
            return False
        
        print(f"✓ OCR识别到 {len(result)} 个文本区域")
        for i, detection in enumerate(result):
            box, text, score = detection
            print(f"  [{i+1}] 文本: '{text}', 置信度: {score:.2f}")
        
        return True
        
    except Exception as e:
        print(f"✗ 简单图像识别失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_ocr_utils():
    """测试4: OCR工具函数"""
    print("\n" + "="*60)
    print("测试4: OCR工具函数")
    print("="*60)
    
    try:
        from backend.utils.ocr_utils import (
            initialize_ocr_engine,
            perform_ocr,
            transform_rapidocr_result,
            filter_alphanumeric_markers
        )
        print("✓ OCR工具函数导入成功")
        
        # 测试初始化
        engine = initialize_ocr_engine()
        print("✓ initialize_ocr_engine() 成功")
        
        # 创建测试图像
        from PIL import Image, ImageDraw, ImageFont
        import numpy as np
        import cv2
        
        img = Image.new('RGB', (400, 200), color='white')
        draw = ImageDraw.Draw(img)
        
        try:
            font = ImageFont.truetype("arial.ttf", 80)
        except:
            try:
                font = ImageFont.truetype("C:\\Windows\\Fonts\\arial.ttf", 80)
            except:
                font = ImageFont.load_default()
        
        draw.text((50, 50), "1 2 3", fill='black', font=font)
        
        # 转换为bytes
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        image_bytes = buffer.getvalue()
        
        print(f"✓ 测试图像大小: {len(image_bytes)} bytes")
        
        # 调用perform_ocr
        print("\n执行 perform_ocr()...")
        results = perform_ocr(image_bytes)
        
        print(f"\nperform_ocr() 返回结果: {results}")
        print(f"识别到 {len(results)} 个标记")
        
        for i, r in enumerate(results):
            print(f"  [{i+1}] {r}")
        
        if len(results) == 0:
            print("\n✗ perform_ocr() 未识别到任何标记")
            return False
        
        print("\n✓ perform_ocr() 工作正常")
        return True
        
    except Exception as e:
        print(f"✗ OCR工具函数测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_with_real_patent_image():
    """测试5: 使用真实专利图像（如果有）"""
    print("\n" + "="*60)
    print("测试5: 真实专利图像测试")
    print("="*60)
    
    # 检查是否有测试图像
    test_images = [
        'tests/test patent pic.png',
        'test_patent.png',
        'patent_drawing.png'
    ]
    
    found_image = None
    for img_path in test_images:
        if os.path.exists(img_path):
            found_image = img_path
            break
    
    if not found_image:
        print("⚠ 未找到测试图像，跳过此测试")
        print(f"  尝试查找: {test_images}")
        return None
    
    print(f"✓ 找到测试图像: {found_image}")
    
    try:
        from backend.utils.ocr_utils import perform_ocr
        
        # 读取图像
        with open(found_image, 'rb') as f:
            image_bytes = f.read()
        
        print(f"✓ 图像大小: {len(image_bytes)} bytes")
        
        # 执行OCR
        print("\n执行OCR识别...")
        results = perform_ocr(image_bytes, timeout_seconds=30)
        
        print(f"\n识别结果: {len(results)} 个标记")
        
        if len(results) == 0:
            print("✗ 未识别到任何标记")
            
            # 尝试直接使用RapidOCR
            print("\n尝试直接使用RapidOCR...")
            from rapidocr_onnxruntime import RapidOCR
            from PIL import Image
            import numpy as np
            import cv2
            
            pil_img = Image.open(BytesIO(image_bytes))
            img_array = np.array(pil_img)
            
            if len(img_array.shape) == 3:
                img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
            else:
                img_bgr = img_array
            
            ocr = RapidOCR()
            raw_result = ocr(img_bgr)
            
            print(f"RapidOCR原始结果: {raw_result}")
            
            if raw_result:
                print(f"识别到 {len(raw_result)} 个区域（未过滤）")
                for i, detection in enumerate(raw_result[:10]):  # 只显示前10个
                    box, text, score = detection
                    print(f"  [{i+1}] '{text}' (置信度: {score:.2f})")
            
            return False
        
        print("\n识别到的标记:")
        for i, r in enumerate(results[:20]):  # 只显示前20个
            print(f"  [{i+1}] {r['number']} (置信度: {r['confidence']:.1f}%, 位置: {r['x']},{r['y']})")
        
        print(f"\n✓ 成功识别到 {len(results)} 个标记")
        return True
        
    except Exception as e:
        print(f"✗ 真实图像测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_filter_function():
    """测试6: 过滤函数"""
    print("\n" + "="*60)
    print("测试6: 标记过滤函数")
    print("="*60)
    
    try:
        from backend.utils.ocr_utils import filter_alphanumeric_markers
        
        # 测试数据
        test_data = [
            {'number': '1', 'confidence': 90},
            {'number': '123', 'confidence': 85},
            {'number': 'A', 'confidence': 80},
            {'number': '2A', 'confidence': 75},
            {'number': '中文', 'confidence': 70},
            {'number': '!@#', 'confidence': 65},
            {'number': 'ABC123', 'confidence': 60},
        ]
        
        print("测试数据:")
        for d in test_data:
            print(f"  {d}")
        
        filtered = filter_alphanumeric_markers(test_data)
        
        print(f"\n过滤后: {len(filtered)} 个")
        for d in filtered:
            print(f"  {d}")
        
        # 检查是否正确过滤
        expected_count = 4  # 应该保留: 1, 123, A, 2A
        if len(filtered) >= expected_count:
            print(f"\n✓ 过滤函数工作正常（保留了 {len(filtered)} 个标记）")
            return True
        else:
            print(f"\n⚠ 过滤函数可能过于严格（只保留了 {len(filtered)} 个标记）")
            return False
        
    except Exception as e:
        print(f"✗ 过滤函数测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """运行所有诊断测试"""
    print("="*60)
    print("OCR识别问题诊断")
    print("="*60)
    
    results = {}
    
    # 运行测试
    results['imports'] = test_imports()
    if not results['imports']:
        print("\n❌ 依赖导入失败，无法继续测试")
        return
    
    results['initialization'] = test_ocr_initialization() is not None
    if not results['initialization']:
        print("\n❌ OCR引擎初始化失败，无法继续测试")
        return
    
    results['simple_image'] = test_simple_image()
    results['ocr_utils'] = test_ocr_utils()
    results['filter'] = test_filter_function()
    results['real_image'] = test_with_real_patent_image()
    
    # 总结
    print("\n" + "="*60)
    print("诊断总结")
    print("="*60)
    
    for test_name, result in results.items():
        if result is None:
            status = "⊘ 跳过"
        elif result:
            status = "✓ 通过"
        else:
            status = "✗ 失败"
        print(f"{status} - {test_name}")
    
    # 分析问题
    print("\n" + "="*60)
    print("问题分析")
    print("="*60)
    
    if not results['simple_image']:
        print("\n❌ 简单图像识别失败")
        print("可能原因:")
        print("  1. RapidOCR模型未正确加载")
        print("  2. 图像格式转换问题")
        print("  3. OCR参数配置不当")
        print("\n建议:")
        print("  - 检查 ~/.rapidocr/ 目录是否有模型文件")
        print("  - 尝试重新安装: pip install --upgrade rapidocr-onnxruntime")
    
    elif not results['ocr_utils']:
        print("\n❌ OCR工具函数失败")
        print("可能原因:")
        print("  1. perform_ocr() 函数逻辑问题")
        print("  2. 图像解码问题")
        print("  3. 超时或内存限制")
        print("\n建议:")
        print("  - 检查 backend/utils/ocr_utils.py 中的 perform_ocr() 函数")
        print("  - 增加超时时间或调整内存限制")
    
    elif not results['filter']:
        print("\n⚠ 过滤函数可能过于严格")
        print("可能原因:")
        print("  1. filter_alphanumeric_markers() 正则表达式过于严格")
        print("  2. 过滤掉了有效的标记")
        print("\n建议:")
        print("  - 检查 backend/utils/ocr_utils.py 中的过滤逻辑")
        print("  - 放宽正则表达式匹配规则")
    
    elif results['real_image'] == False:
        print("\n❌ 真实图像识别失败")
        print("可能原因:")
        print("  1. 图像质量问题（模糊、对比度低）")
        print("  2. 标记太小或字体特殊")
        print("  3. 置信度阈值过高")
        print("\n建议:")
        print("  - 降低置信度阈值（在 drawing_marker.py 中）")
        print("  - 检查图像预处理是否需要增强")
        print("  - 尝试调整RapidOCR参数")
    
    else:
        print("\n✓ 所有测试通过！")
        print("如果实际使用中仍然识别不出，请检查:")
        print("  1. 上传的图像是否与测试图像类似")
        print("  2. 服务器端日志中的详细错误信息")
        print("  3. 网络传输是否正确（base64编码/解码）")
    
    print("\n" + "="*60)
    print("诊断完成")
    print("="*60)


if __name__ == '__main__':
    main()
