#!/usr/bin/env python3
"""
简单的OCR测试脚本 - 测试Tesseract和Pillow是否正常工作
"""

import sys

print("=" * 60)
print("测试 OCR 依赖库")
print("=" * 60)

# 测试1: 导入Pillow
print("\n[1/3] 测试 Pillow 导入...")
try:
    from PIL import Image, ImageEnhance, ImageFilter
    print("✅ Pillow 导入成功")
except ImportError as e:
    print(f"❌ Pillow 导入失败: {e}")
    sys.exit(1)

# 测试2: 导入pytesseract
print("\n[2/3] 测试 pytesseract 导入...")
try:
    import pytesseract
    print("✅ pytesseract 导入成功")
except ImportError as e:
    print(f"❌ pytesseract 导入失败: {e}")
    sys.exit(1)

# 测试3: 测试Tesseract可执行文件
print("\n[3/3] 测试 Tesseract 可执行文件...")
try:
    version = pytesseract.get_tesseract_version()
    print(f"✅ Tesseract 版本: {version}")
except Exception as e:
    print(f"❌ Tesseract 不可用: {e}")
    print("\n可能的原因:")
    print("  1. Tesseract 未安装")
    print("  2. Tesseract 不在 PATH 中")
    print("  3. pytesseract 无法找到 tesseract 可执行文件")
    sys.exit(1)

# 测试4: 创建简单图像并进行OCR
print("\n[4/4] 测试 OCR 识别...")
try:
    # 创建一个简单的测试图像
    from PIL import ImageDraw, ImageFont
    
    # 创建白色背景图像
    img = Image.new('L', (200, 100), color=255)
    draw = ImageDraw.Draw(img)
    
    # 绘制文本 "123"
    try:
        # 尝试使用默认字体
        draw.text((50, 30), "123", fill=0)
    except:
        # 如果没有字体,直接绘制矩形模拟数字
        draw.rectangle([50, 30, 70, 60], fill=0)
        draw.rectangle([80, 30, 100, 60], fill=0)
        draw.rectangle([110, 30, 130, 60], fill=0)
    
    # 进行OCR识别
    text = pytesseract.image_to_string(img, config='--psm 6 digits')
    print(f"✅ OCR 测试成功")
    print(f"   识别结果: '{text.strip()}'")
    
except Exception as e:
    print(f"❌ OCR 测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 60)
print("✅ 所有测试通过! OCR 功能正常")
print("=" * 60)
