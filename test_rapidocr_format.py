#!/usr/bin/env python3
"""
测试RapidOCR的实际返回格式
"""

try:
    from rapidocr_onnxruntime import RapidOCR
    from PIL import Image, ImageDraw, ImageFont
    import numpy as np
    import cv2
    import io
    
    print("=" * 60)
    print("测试RapidOCR返回格式")
    print("=" * 60)
    
    # 初始化OCR引擎
    print("\n1. 初始化RapidOCR...")
    ocr = RapidOCR()
    print("   ✅ 初始化成功")
    
    # 创建测试图片
    print("\n2. 创建测试图片...")
    img = Image.new('RGB', (400, 200), color='white')
    draw = ImageDraw.Draw(img)
    
    try:
        font = ImageFont.truetype("arial.ttf", 60)
    except:
        font = ImageFont.load_default()
    
    draw.text((50, 50), "123", fill='black', font=font)
    
    # 转换为numpy数组
    img_array = np.array(img)
    img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
    print("   ✅ 测试图片创建成功")
    
    # 执行OCR
    print("\n3. 执行OCR识别...")
    result = ocr(img_array)
    
    # 分析返回值
    print("\n4. 分析返回值:")
    print(f"   返回值类型: {type(result)}")
    print(f"   返回值内容: {result}")
    
    if isinstance(result, tuple):
        print(f"\n   这是一个元组，长度: {len(result)}")
        for i, item in enumerate(result):
            print(f"   元素 {i}: 类型={type(item)}, 值={item}")
    elif isinstance(result, list):
        print(f"\n   这是一个列表，长度: {len(result)}")
        if result:
            print(f"   第一个元素: {result[0]}")
    else:
        print(f"\n   未知类型: {type(result)}")
    
    print("\n" + "=" * 60)
    print("测试完成")
    print("=" * 60)
    
except ImportError as e:
    print(f"❌ 导入失败: {e}")
    print("\n请先安装依赖:")
    print("pip install rapidocr-onnxruntime pillow opencv-python")
except Exception as e:
    print(f"❌ 测试失败: {e}")
    import traceback
    traceback.print_exc()
