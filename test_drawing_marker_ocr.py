"""
功能八OCR诊断工具
用于检查图片OCR识别的每个环节
"""
import sys
import os
import re
from PIL import Image
import numpy as np
import cv2

def check_tesseract():
    """检查Tesseract是否安装"""
    print("="*80)
    print("步骤1: 检查Tesseract OCR是否安装")
    print("="*80)
    try:
        import pytesseract
        version = pytesseract.get_tesseract_version()
        print(f"✅ Tesseract已安装，版本: {version}")
        return True
    except Exception as e:
        print(f"❌ Tesseract未安装或配置错误: {str(e)}")
        print("\n解决方法:")
        print("1. 下载Tesseract: https://github.com/UB-Mannheim/tesseract/wiki")
        print("2. 安装后添加到系统PATH")
        print("3. 或在代码中设置: pytesseract.pytesseract.tesseract_cmd = r'C:\\Program Files\\Tesseract-OCR\\tesseract.exe'")
        return False

def test_specification_parsing(spec_text):
    """测试说明书解析"""
    print("\n" + "="*80)
    print("步骤2: 测试说明书解析")
    print("="*80)
    print(f"输入内容: {spec_text[:100]}...")
    
    def extract_reference_markers(spec_text):
        reference_map = {}
        
        # 模式1: 数字 + 分隔符(. 、 …) + 名称
        pattern1 = r'([0-9]+[A-Z]*)\s*[.、…]\s*([^。；，,;\n、…]+)'
        matches1 = re.findall(pattern1, spec_text)
        for match in matches1:
            number = match[0]
            name = match[1].strip()
            if name:
                reference_map[number] = name
        
        # 模式2: 数字(可能带字母) + 中文字符，用顿号分隔
        parts = spec_text.split('、')
        for part in parts:
            part = part.strip()
            match = re.match(r'^([0-9]+[A-Z]*)(.+)$', part)
            if match:
                number = match.group(1)
                name = match.group(2).strip()
                name = re.sub(r'^[…\s.、]+', '', name)
                if name and number not in reference_map:
                    reference_map[number] = name
        
        return reference_map
    
    reference_map = extract_reference_markers(spec_text)
    
    if len(reference_map) > 0:
        print(f"✅ 成功提取到 {len(reference_map)} 个附图标记")
        print("\n前10个标记:")
        for i, (num, name) in enumerate(list(reference_map.items())[:10]):
            print(f"  {num}: {name}")
        if len(reference_map) > 10:
            print(f"  ... (还有 {len(reference_map) - 10} 个)")
        return reference_map
    else:
        print("❌ 未能提取到任何附图标记")
        print("\n请检查说明书格式，支持的格式:")
        print("  - 1电动工具、2外壳")
        print("  - 1…电动工具、2…外壳")
        print("  - 1. 电动工具")
        return None

def test_image_loading(image_path):
    """测试图片加载"""
    print("\n" + "="*80)
    print("步骤3: 测试图片加载")
    print("="*80)
    
    if not os.path.exists(image_path):
        print(f"❌ 图片文件不存在: {image_path}")
        return None
    
    try:
        # 使用PIL加载
        image = Image.open(image_path)
        print(f"✅ 图片加载成功")
        print(f"  - 格式: {image.format}")
        print(f"  - 尺寸: {image.size[0]} x {image.size[1]}")
        print(f"  - 模式: {image.mode}")
        
        # 转换为OpenCV格式
        img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        print(f"  - OpenCV格式: {img_cv.shape}")
        
        return img_cv
    except Exception as e:
        print(f"❌ 图片加载失败: {str(e)}")
        return None

def test_image_preprocessing(img_cv):
    """测试图像预处理"""
    print("\n" + "="*80)
    print("步骤4: 测试图像预处理")
    print("="*80)
    
    try:
        # 转换为灰度图
        gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
        print(f"✅ 灰度图转换成功: {gray.shape}")
        
        # 自适应阈值
        adaptive_thresh = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY, 11, 2
        )
        print(f"✅ 自适应阈值处理成功")
        
        # Otsu二值化
        _, otsu_thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        print(f"✅ Otsu二值化处理成功")
        
        # 简单阈值
        _, simple_thresh = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)
        print(f"✅ 简单阈值处理成功")
        
        # 保存预处理后的图片以便查看
        output_dir = "ocr_debug_output"
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        
        cv2.imwrite(f"{output_dir}/1_gray.png", gray)
        cv2.imwrite(f"{output_dir}/2_adaptive.png", adaptive_thresh)
        cv2.imwrite(f"{output_dir}/3_otsu.png", otsu_thresh)
        cv2.imwrite(f"{output_dir}/4_simple.png", simple_thresh)
        
        print(f"\n✅ 预处理图片已保存到 {output_dir}/ 目录")
        print("  - 1_gray.png - 灰度图")
        print("  - 2_adaptive.png - 自适应阈值")
        print("  - 3_otsu.png - Otsu二值化")
        print("  - 4_simple.png - 简单阈值")
        
        return [gray, adaptive_thresh, otsu_thresh, simple_thresh]
    except Exception as e:
        print(f"❌ 图像预处理失败: {str(e)}")
        return None

def test_ocr(processed_images):
    """测试OCR识别"""
    print("\n" + "="*80)
    print("步骤5: 测试OCR识别")
    print("="*80)
    
    try:
        import pytesseract
        
        all_results = []
        method_names = ["灰度图", "自适应阈值", "Otsu二值化", "简单阈值"]
        
        for i, (img, method_name) in enumerate(zip(processed_images, method_names)):
            print(f"\n方法 {i+1}: {method_name}")
            print("-" * 40)
            
            # 配置1: 只识别数字和字母
            config1 = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
            
            try:
                # 获取详细的OCR结果
                ocr_result = pytesseract.image_to_data(
                    img, 
                    output_type=pytesseract.Output.DICT, 
                    config=config1
                )
                
                detected = []
                for j in range(len(ocr_result['text'])):
                    text = ocr_result['text'][j].strip()
                    conf = int(ocr_result['conf'][j])
                    
                    if text and conf > 30:  # 降低阈值以便看到更多结果
                        detected.append({
                            'text': text,
                            'confidence': conf,
                            'x': ocr_result['left'][j],
                            'y': ocr_result['top'][j]
                        })
                
                if detected:
                    print(f"  ✅ 识别到 {len(detected)} 个文本")
                    for item in detected[:10]:
                        print(f"    - '{item['text']}' (置信度: {item['confidence']}%, 位置: {item['x']},{item['y']})")
                    if len(detected) > 10:
                        print(f"    ... (还有 {len(detected) - 10} 个)")
                    all_results.extend(detected)
                else:
                    print(f"  ❌ 未识别到任何文本")
                    
            except Exception as e:
                print(f"  ❌ OCR识别失败: {str(e)}")
        
        # 去重
        unique_texts = set([r['text'] for r in all_results])
        
        print("\n" + "="*40)
        print(f"总结: 共识别到 {len(unique_texts)} 个不同的文本")
        if unique_texts:
            print("识别到的文本:", sorted(unique_texts))
            return list(unique_texts)
        else:
            print("❌ 所有方法都未能识别到文本")
            return []
            
    except Exception as e:
        print(f"❌ OCR测试失败: {str(e)}")
        return []

def test_matching(detected_texts, reference_map):
    """测试匹配"""
    print("\n" + "="*80)
    print("步骤6: 测试匹配")
    print("="*80)
    
    if not detected_texts:
        print("❌ 没有识别到任何文本，无法进行匹配")
        return
    
    if not reference_map:
        print("❌ 没有提取到附图标记，无法进行匹配")
        return
    
    matched = []
    unmatched = []
    
    for text in detected_texts:
        # 检查是否匹配数字或数字+字母的模式
        if re.match(r'^[0-9]+[A-Z]*$', text):
            if text in reference_map:
                matched.append((text, reference_map[text]))
            else:
                unmatched.append(text)
    
    print(f"\n匹配结果:")
    print(f"  - 匹配成功: {len(matched)} 个")
    print(f"  - 未匹配: {len(unmatched)} 个")
    
    if matched:
        print("\n✅ 匹配成功的标记:")
        for num, name in matched[:10]:
            print(f"  {num}: {name}")
        if len(matched) > 10:
            print(f"  ... (还有 {len(matched) - 10} 个)")
    
    if unmatched:
        print("\n⚠️ 未匹配的文本:")
        for text in unmatched[:10]:
            print(f"  {text} (在说明书中未找到)")
        if len(unmatched) > 10:
            print(f"  ... (还有 {len(unmatched) - 10} 个)")
    
    if len(matched) == 0:
        print("\n❌ 没有任何匹配！")
        print("\n可能的原因:")
        print("1. OCR识别的文本格式与说明书中的编号不一致")
        print("2. 图片质量太差，OCR识别错误")
        print("3. 说明书中没有对应的编号")

def main():
    print("功能八OCR诊断工具")
    print("="*80)
    
    # 检查命令行参数
    if len(sys.argv) < 3:
        print("使用方法:")
        print("  python test_drawing_marker_ocr.py <图片路径> <说明书文本>")
        print("\n示例:")
        print('  python test_drawing_marker_ocr.py test.png "1电动工具、2外壳、3后盖"')
        return
    
    image_path = sys.argv[1]
    spec_text = sys.argv[2]
    
    # 步骤1: 检查Tesseract
    if not check_tesseract():
        return
    
    # 步骤2: 测试说明书解析
    reference_map = test_specification_parsing(spec_text)
    
    # 步骤3: 测试图片加载
    img_cv = test_image_loading(image_path)
    if img_cv is None:
        return
    
    # 步骤4: 测试图像预处理
    processed_images = test_image_preprocessing(img_cv)
    if processed_images is None:
        return
    
    # 步骤5: 测试OCR识别
    detected_texts = test_ocr(processed_images)
    
    # 步骤6: 测试匹配
    test_matching(detected_texts, reference_map)
    
    print("\n" + "="*80)
    print("诊断完成！")
    print("="*80)
    print("\n如果OCR识别率低，请检查:")
    print("1. 图片质量是否清晰")
    print("2. 数字是否清晰可见")
    print("3. 数字与背景对比度是否足够")
    print("4. 查看 ocr_debug_output/ 目录中的预处理图片")

if __name__ == "__main__":
    main()
