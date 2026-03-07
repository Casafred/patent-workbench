#!/usr/bin/env python3
"""
本地测试OCR功能
在部署到服务器前先验证代码正确性
"""

import sys
import os

# 添加backend到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def test_ocr_basic():
    """测试基本OCR功能"""
    print("=" * 50)
    print("测试1: 导入OCR模块")
    print("=" * 50)
    
    try:
        from utils.ocr_utils import initialize_ocr_engine, perform_ocr
        print("✅ OCR模块导入成功")
    except Exception as e:
        print(f"❌ OCR模块导入失败: {e}")
        return False
    
    print("\n" + "=" * 50)
    print("测试2: 初始化OCR引擎")
    print("=" * 50)
    
    try:
        engine = initialize_ocr_engine()
        print("✅ OCR引擎初始化成功")
        print(f"   引擎类型: {type(engine)}")
    except Exception as e:
        print(f"❌ OCR引擎初始化失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print("\n" + "=" * 50)
    print("测试3: 测试图片处理")
    print("=" * 50)
    
    # 创建一个简单的测试图片
    try:
        from PIL import Image, ImageDraw, ImageFont
        import io
        
        # 创建白色背景图片
        img = Image.new('RGB', (400, 200), color='white')
        draw = ImageDraw.Draw(img)
        
        # 绘制一些数字
        try:
            # 尝试使用默认字体
            font = ImageFont.truetype("arial.ttf", 40)
        except:
            # 如果没有arial，使用默认字体
            font = ImageFont.load_default()
        
        # 绘制数字
        draw.text((50, 50), "1", fill='black', font=font)
        draw.text((150, 50), "2", fill='black', font=font)
        draw.text((250, 50), "3", fill='black', font=font)
        
        # 转换为bytes
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes = img_bytes.getvalue()
        
        print(f"✅ 测试图片创建成功 ({len(img_bytes)} bytes)")
        
    except Exception as e:
        print(f"❌ 测试图片创建失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print("\n" + "=" * 50)
    print("测试4: 执行OCR识别")
    print("=" * 50)
    
    try:
        results = perform_ocr(img_bytes, timeout_seconds=30)
        print(f"✅ OCR识别完成")
        print(f"   识别结果数量: {len(results)}")
        
        if results:
            print("\n   识别详情:")
            for i, result in enumerate(results, 1):
                print(f"   {i}. 文本: '{result['number']}', "
                      f"位置: ({result['x']}, {result['y']}), "
                      f"置信度: {result['confidence']:.1f}%")
        else:
            print("   ⚠️ 未识别到任何文本")
            
    except Exception as e:
        print(f"❌ OCR识别失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print("\n" + "=" * 50)
    print("✅ 所有测试通过！")
    print("=" * 50)
    return True


if __name__ == '__main__':
    print("开始本地OCR测试...\n")
    
    success = test_ocr_basic()
    
    if success:
        print("\n✅ 本地测试成功！代码可以部署到服务器。")
        sys.exit(0)
    else:
        print("\n❌ 本地测试失败！请修复问题后再部署。")
        sys.exit(1)
