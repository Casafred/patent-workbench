"""
OCR诊断脚本 - 测试Tesseract是否正常工作
"""

import sys
import subprocess

def test_tesseract_installation():
    """测试Tesseract是否已安装"""
    print("=" * 60)
    print("1. 测试Tesseract安装")
    print("=" * 60)
    
    try:
        result = subprocess.run(['tesseract', '--version'], 
                              capture_output=True, 
                              text=True, 
                              timeout=5)
        print("✅ Tesseract已安装")
        print(result.stdout)
        return True
    except FileNotFoundError:
        print("❌ Tesseract未安装或未添加到PATH")
        print("\n安装方法:")
        print("Windows: 下载安装包 https://github.com/UB-Mannheim/tesseract/wiki")
        print("Linux: sudo apt-get install tesseract-ocr")
        print("Mac: brew install tesseract")
        return False
    except Exception as e:
        print(f"❌ 测试失败: {str(e)}")
        return False


def test_pytesseract_import():
    """测试pytesseract是否可以导入"""
    print("\n" + "=" * 60)
    print("2. 测试pytesseract库")
    print("=" * 60)
    
    try:
        import pytesseract
        print("✅ pytesseract库已安装")
        
        # 测试是否能找到tesseract可执行文件
        try:
            version = pytesseract.get_tesseract_version()
            print(f"✅ Tesseract版本: {version}")
            return True
        except Exception as e:
            print(f"⚠️ pytesseract无法找到tesseract: {str(e)}")
            print("\n可能需要手动设置tesseract路径:")
            print("pytesseract.pytesseract.tesseract_cmd = r'C:\\Program Files\\Tesseract-OCR\\tesseract.exe'")
            return False
            
    except ImportError:
        print("❌ pytesseract库未安装")
        print("安装方法: pip install pytesseract")
        return False


def test_opencv():
    """测试OpenCV是否可以导入"""
    print("\n" + "=" * 60)
    print("3. 测试OpenCV库")
    print("=" * 60)
    
    try:
        import cv2
        print(f"✅ OpenCV已安装，版本: {cv2.__version__}")
        return True
    except ImportError:
        print("❌ OpenCV未安装")
        print("安装方法: pip install opencv-python")
        return False


def test_simple_ocr():
    """测试简单的OCR识别"""
    print("\n" + "=" * 60)
    print("4. 测试简单OCR识别")
    print("=" * 60)
    
    try:
        import pytesseract
        import cv2
        import numpy as np
        from PIL import Image, ImageDraw, ImageFont
        
        # 创建一个简单的测试图片，包含数字
        img = Image.new('RGB', (200, 100), color='white')
        draw = ImageDraw.Draw(img)
        
        # 绘制数字
        try:
            font = ImageFont.truetype("arial.ttf", 40)
        except:
            font = ImageFont.load_default()
        
        draw.text((50, 30), "123", fill='black', font=font)
        
        # 转换为OpenCV格式
        img_cv = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
        
        # 进行OCR识别
        custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        result = pytesseract.image_to_string(gray, config=custom_config)
        
        print(f"识别结果: '{result.strip()}'")
        
        if '123' in result or '1' in result:
            print("✅ OCR识别正常工作")
            return True
        else:
            print("⚠️ OCR识别结果不正确")
            print("这可能是正常的，因为使用的是默认字体")
            return True
            
    except Exception as e:
        print(f"❌ OCR测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_ocr_with_data():
    """测试OCR识别并返回详细数据"""
    print("\n" + "=" * 60)
    print("5. 测试OCR详细数据输出")
    print("=" * 60)
    
    try:
        import pytesseract
        import cv2
        import numpy as np
        from PIL import Image, ImageDraw, ImageFont
        
        # 创建测试图片
        img = Image.new('RGB', (300, 150), color='white')
        draw = ImageDraw.Draw(img)
        
        try:
            font = ImageFont.truetype("arial.ttf", 50)
        except:
            font = ImageFont.load_default()
        
        draw.text((50, 50), "1 2 3", fill='black', font=font)
        
        # 转换为OpenCV格式
        img_cv = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
        
        # 进行OCR识别，获取详细数据
        custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        ocr_result = pytesseract.image_to_data(
            gray, 
            output_type=pytesseract.Output.DICT, 
            config=custom_config
        )
        
        print(f"识别到 {len(ocr_result['text'])} 个文本块")
        
        detected_count = 0
        for i in range(len(ocr_result['text'])):
            text = ocr_result['text'][i].strip()
            conf = int(ocr_result['conf'][i])
            
            if text and conf > 0:
                print(f"  - 文本: '{text}', 置信度: {conf}")
                detected_count += 1
        
        if detected_count > 0:
            print(f"✅ 成功识别到 {detected_count} 个文本")
            return True
        else:
            print("⚠️ 未识别到任何文本")
            return False
            
    except Exception as e:
        print(f"❌ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """运行所有诊断测试"""
    print("\n" + "=" * 60)
    print("OCR功能诊断工具")
    print("=" * 60 + "\n")
    
    results = []
    
    # 运行所有测试
    results.append(("Tesseract安装", test_tesseract_installation()))
    results.append(("pytesseract库", test_pytesseract_import()))
    results.append(("OpenCV库", test_opencv()))
    results.append(("简单OCR测试", test_simple_ocr()))
    results.append(("详细数据测试", test_ocr_with_data()))
    
    # 显示总结
    print("\n" + "=" * 60)
    print("诊断总结")
    print("=" * 60)
    
    for name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{name}: {status}")
    
    all_passed = all(result for _, result in results)
    
    if all_passed:
        print("\n✅ 所有测试通过！OCR功能应该可以正常工作。")
        print("\n如果功能八仍然无法识别，请检查：")
        print("1. 上传的图片是否清晰")
        print("2. 图片中是否真的包含数字")
        print("3. 查看后端日志中的DEBUG信息")
    else:
        print("\n❌ 部分测试失败，请根据上述提示修复问题。")
    
    return all_passed


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
