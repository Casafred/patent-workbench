#!/usr/bin/env python3
"""
快速OCR测试脚本 - 30秒确定问题
"""

print("=" * 50)
print("快速OCR测试 (30秒)")
print("=" * 50)

# 测试1: 导入检查
print("\n[1/4] 检查依赖...")
try:
    from rapidocr_onnxruntime import RapidOCR
    print("✅ RapidOCR")
except ImportError as e:
    print(f"❌ RapidOCR: {e}")
    print("\n解决方案: pip3 install rapidocr-onnxruntime")
    exit(1)

try:
    import cv2
    print("✅ OpenCV")
except ImportError as e:
    print(f"❌ OpenCV: {e}")
    print("\n解决方案: pip3 install opencv-python")
    exit(1)

try:
    from PIL import Image
    print("✅ Pillow")
except ImportError as e:
    print(f"❌ Pillow: {e}")
    print("\n解决方案: pip3 install Pillow")
    exit(1)

# 测试2: 初始化OCR
print("\n[2/4] 初始化OCR引擎...")
try:
    ocr = RapidOCR()
    print("✅ OCR引擎初始化成功")
except Exception as e:
    print(f"❌ 初始化失败: {e}")
    exit(1)

# 测试3: 创建测试图片
print("\n[3/4] 创建测试图片...")
try:
    import numpy as np
    from PIL import ImageDraw, ImageFont
    
    img = Image.new('RGB', (300, 200), 'white')
    draw = ImageDraw.Draw(img)
    
    # 绘制大号数字
    try:
        font = ImageFont.truetype("arial.ttf", 60)
    except:
        font = ImageFont.load_default()
    
    draw.text((50, 50), "123", fill='black', font=font)
    
    # 转换为OpenCV格式
    img_array = np.array(img)
    img_cv = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
    
    print("✅ 测试图片创建成功")
    
except Exception as e:
    print(f"❌ 创建失败: {e}")
    exit(1)

# 测试4: OCR识别
print("\n[4/4] 测试OCR识别...")
try:
    result = ocr(img_cv)
    
    if result and isinstance(result, tuple) and result[0]:
        detections = result[0]
        print(f"✅ 识别成功! 检测到 {len(detections)} 个文本")
        
        for i, det in enumerate(detections[:5], 1):
            text = det[1]
            score = float(det[2])
            print(f"   [{i}] 文本='{text}', 置信度={score:.2%}")
        
        # 判断结果
        if len(detections) > 0:
            print("\n" + "=" * 50)
            print("✅ OCR功能正常!")
            print("=" * 50)
            print("\n问题可能在于:")
            print("1. 前端上传的图片格式不正确")
            print("2. 说明书解析失败（reference_map为空）")
            print("3. 图片质量太差")
            print("\n建议:")
            print("• 检查后端日志中的[DEBUG]输出")
            print("• 确认说明书格式: '1. 部件名'")
            print("• 使用清晰的专利附图")
        else:
            print("\n⚠️ OCR未识别到内容")
            
    else:
        print("❌ OCR返回空结果")
        print("\n可能原因:")
        print("1. RapidOCR模型文件缺失")
        print("2. 图片格式不支持")
        print("3. 内存不足")
        
except Exception as e:
    print(f"❌ OCR识别失败: {e}")
    import traceback
    print(traceback.format_exc())
    exit(1)

print("\n" + "=" * 50)
print("测试完成")
print("=" * 50)
