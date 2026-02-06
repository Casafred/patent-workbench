#!/usr/bin/env python3
"""
OCR诊断脚本 - 在服务器上测试不同的OCR配置和预处理方法

使用方法:
1. 上传此脚本到服务器: scp test_ocr_on_server.py root@43.99.101.195:/home/appuser/patent-app/
2. 上传测试图片: scp "test patent pic.png" root@43.99.101.195:/home/appuser/patent-app/test_image.png
3. 在服务器上运行: ssh root@43.99.101.195 "su - appuser -c 'cd /home/appuser/patent-app && python3 test_ocr_on_server.py test_image.png'"
"""

import sys
import os
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
import pytesseract

def test_ocr_configurations(image_path):
    """测试不同的OCR配置和预处理方法"""
    
    print(f"\n{'='*60}")
    print(f"OCR诊断测试")
    print(f"{'='*60}")
    print(f"图片路径: {image_path}")
    
    # 检查文件是否存在
    if not os.path.exists(image_path):
        print(f"❌ 错误: 文件不存在 - {image_path}")
        return
    
    # 加载图片
    try:
        image = Image.open(image_path)
        print(f"✅ 图片加载成功")
        print(f"   尺寸: {image.size}")
        print(f"   模式: {image.mode}")
    except Exception as e:
        print(f"❌ 图片加载失败: {e}")
        return
    
    # 检查Tesseract版本
    try:
        version = pytesseract.get_tesseract_version()
        print(f"✅ Tesseract版本: {version}")
    except Exception as e:
        print(f"❌ Tesseract检查失败: {e}")
        return
    
    # 转换为灰度图
    if image.mode != 'L':
        image = image.convert('L')
        print(f"✅ 转换为灰度图")
    
    # 测试不同的OCR配置
    configs = [
        ("默认配置", ""),
        ("PSM 6 + 数字字母", "--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"),
        ("PSM 11 + 数字字母", "--oem 3 --psm 11 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"),
        ("PSM 6 + 仅数字", "--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789"),
        ("PSM 11 + 仅数字", "--oem 3 --psm 11 -c tessedit_char_whitelist=0123456789"),
        ("PSM 3 + 数字字母", "--oem 3 --psm 3 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"),
    ]
    
    # 测试不同的预处理方法
    preprocessing_methods = []
    
    # 1. 原始灰度图
    preprocessing_methods.append(("原始灰度图", image))
    
    # 2. 增强对比度 (不同强度)
    for factor in [1.5, 2.0, 2.5]:
        enhancer = ImageEnhance.Contrast(image)
        enhanced = enhancer.enhance(factor)
        preprocessing_methods.append((f"对比度增强 x{factor}", enhanced))
    
    # 3. 锐化
    sharpened = image.filter(ImageFilter.SHARPEN)
    preprocessing_methods.append(("锐化", sharpened))
    
    # 4. 二值化 (不同阈值)
    for threshold in [100, 127, 150, 180]:
        binary = image.point(lambda x: 255 if x > threshold else 0, mode='1')
        preprocessing_methods.append((f"二值化 (阈值={threshold})", binary))
    
    # 5. 自适应二值化 (使用ImageOps)
    # 注意: Pillow 8.4.0可能不支持自适应阈值，跳过
    
    # 6. 放大图片
    width, height = image.size
    for scale in [1.5, 2.0]:
        new_size = (int(width * scale), int(height * scale))
        resized = image.resize(new_size, Image.LANCZOS)
        preprocessing_methods.append((f"放大 x{scale}", resized))
    
    # 7. 组合: 放大 + 对比度增强 + 锐化
    resized = image.resize((int(width * 2), int(height * 2)), Image.LANCZOS)
    enhancer = ImageEnhance.Contrast(resized)
    enhanced = enhancer.enhance(2.0)
    sharpened = enhanced.filter(ImageFilter.SHARPEN)
    preprocessing_methods.append(("组合优化", sharpened))
    
    print(f"\n{'='*60}")
    print(f"开始测试 {len(configs)} 种配置 x {len(preprocessing_methods)} 种预处理")
    print(f"{'='*60}\n")
    
    best_result = None
    best_count = 0
    
    for config_name, config_str in configs:
        print(f"\n配置: {config_name}")
        print(f"参数: {config_str if config_str else '(默认)'}")
        print("-" * 60)
        
        for method_name, processed_image in preprocessing_methods:
            try:
                # 运行OCR
                result = pytesseract.image_to_data(
                    processed_image,
                    output_type=pytesseract.Output.DICT,
                    config=config_str
                )
                
                # 统计识别结果
                detected_texts = []
                for i in range(len(result['text'])):
                    text = result['text'][i].strip()
                    conf = int(result['conf'][i])
                    
                    if text and conf > 50:
                        detected_texts.append({
                            'text': text,
                            'conf': conf,
                            'x': result['left'][i],
                            'y': result['top'][i]
                        })
                
                # 过滤出数字或数字+字母的结果
                import re
                number_results = [
                    d for d in detected_texts 
                    if re.match(r'^[0-9]+[A-Z]*$', d['text'])
                ]
                
                count = len(number_results)
                
                # 显示结果
                status = "✅" if count > 0 else "  "
                print(f"{status} {method_name:25s} | 识别: {count:2d} | ", end="")
                
                if count > 0:
                    numbers = [d['text'] for d in number_results[:5]]
                    print(f"数字: {', '.join(numbers)}", end="")
                    if count > 5:
                        print(f" ... (+{count-5})", end="")
                print()
                
                # 记录最佳结果
                if count > best_count:
                    best_count = count
                    best_result = {
                        'config': config_name,
                        'method': method_name,
                        'count': count,
                        'results': number_results
                    }
                
            except Exception as e:
                print(f"❌ {method_name:25s} | 错误: {str(e)}")
    
    # 显示最佳结果
    print(f"\n{'='*60}")
    print(f"最佳结果")
    print(f"{'='*60}")
    
    if best_result:
        print(f"配置: {best_result['config']}")
        print(f"预处理: {best_result['method']}")
        print(f"识别数量: {best_result['count']}")
        print(f"\n识别详情:")
        for i, r in enumerate(best_result['results'][:10], 1):
            print(f"  {i}. '{r['text']}' (置信度: {r['conf']}%, 位置: x={r['x']}, y={r['y']})")
        if best_result['count'] > 10:
            print(f"  ... 还有 {best_result['count'] - 10} 个结果")
    else:
        print("❌ 未识别到任何数字")
        print("\n可能的原因:")
        print("  1. 图片中没有清晰的数字")
        print("  2. 图片质量太低")
        print("  3. 数字太小或太模糊")
        print("  4. Tesseract配置不适合此图片")
        print("\n建议:")
        print("  1. 检查图片是否包含清晰可见的数字")
        print("  2. 尝试提供更高分辨率的图片")
        print("  3. 确保图片对比度足够")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python3 test_ocr_on_server.py <图片路径>")
        print("示例: python3 test_ocr_on_server.py test_image.png")
        sys.exit(1)
    
    image_path = sys.argv[1]
    test_ocr_configurations(image_path)
