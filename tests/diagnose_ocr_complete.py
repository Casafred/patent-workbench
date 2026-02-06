#!/usr/bin/env python3
"""
功能八OCR完整诊断脚本
用于定位OCR无法识别图片标记的根本原因
"""

import sys
import os
import traceback
from io import BytesIO
import base64

print("=" * 60)
print("功能八OCR完整诊断")
print("=" * 60)

# 1. 检查Python环境
print("\n[1/8] 检查Python环境...")
print(f"Python版本: {sys.version}")
print(f"Python路径: {sys.executable}")
print(f"当前工作目录: {os.getcwd()}")

# 2. 检查依赖库安装
print("\n[2/8] 检查依赖库安装...")

dependencies = {
    'rapidocr_onnxruntime': 'RapidOCR',
    'cv2': 'OpenCV',
    'PIL': 'Pillow',
    'numpy': 'NumPy'
}

missing_deps = []
installed_versions = {}

for module_name, display_name in dependencies.items():
    try:
        if module_name == 'PIL':
            import PIL
            from PIL import Image
            installed_versions[display_name] = PIL.__version__
            print(f"✅ {display_name}: {PIL.__version__}")
        elif module_name == 'cv2':
            import cv2
            installed_versions[display_name] = cv2.__version__
            print(f"✅ {display_name}: {cv2.__version__}")
        elif module_name == 'rapidocr_onnxruntime':
            from rapidocr_onnxruntime import RapidOCR
            # RapidOCR可能没有__version__属性
            try:
                version = RapidOCR.__version__
            except:
                version = "已安装（版本未知）"
            installed_versions[display_name] = version
            print(f"✅ {display_name}: {version}")
        else:
            module = __import__(module_name)
            version = getattr(module, '__version__', '未知版本')
            installed_versions[display_name] = version
            print(f"✅ {display_name}: {version}")
    except ImportError as e:
        missing_deps.append(display_name)
        print(f"❌ {display_name}: 未安装 ({str(e)})")

if missing_deps:
    print(f"\n⚠️ 缺少依赖: {', '.join(missing_deps)}")
    print("请运行: pip install rapidocr-onnxruntime opencv-python Pillow numpy")
    sys.exit(1)

# 3. 检查OCR引擎初始化
print("\n[3/8] 检查OCR引擎初始化...")
try:
    from rapidocr_onnxruntime import RapidOCR
    ocr_engine = RapidOCR()
    print("✅ RapidOCR引擎初始化成功")
except Exception as e:
    print(f"❌ RapidOCR引擎初始化失败: {str(e)}")
    print(traceback.format_exc())
    sys.exit(1)

# 4. 创建测试图片
print("\n[4/8] 创建测试图片...")
try:
    from PIL import Image, ImageDraw, ImageFont
    import numpy as np
    
    # 创建一个简单的测试图片：白底黑字，包含数字1-5
    img = Image.new('RGB', (400, 300), color='white')
    draw = ImageDraw.Draw(img)
    
    # 尝试使用默认字体
    try:
        font = ImageFont.truetype("arial.ttf", 40)
    except:
        font = ImageFont.load_default()
    
    # 绘制数字
    numbers = ['1', '2', '3', '4', '5']
    positions = [(50, 50), (150, 50), (250, 50), (100, 150), (200, 150)]
    
    for num, pos in zip(numbers, positions):
        draw.text(pos, num, fill='black', font=font)
    
    # 保存为字节流
    img_bytes = BytesIO()
    img.save(img_bytes, format='PNG')
    test_image_data = img_bytes.getvalue()
    
    print(f"✅ 测试图片创建成功 (大小: {len(test_image_data)} bytes)")
    print(f"   包含数字: {', '.join(numbers)}")
    
    # 保存到文件供查看
    with open('test_ocr_diagnostic.png', 'wb') as f:
        f.write(test_image_data)
    print(f"   已保存到: test_ocr_diagnostic.png")
    
except Exception as e:
    print(f"❌ 创建测试图片失败: {str(e)}")
    print(traceback.format_exc())
    sys.exit(1)

# 5. 测试图片解码
print("\n[5/8] 测试图片解码...")
try:
    import cv2
    import numpy as np
    from PIL import Image
    
    # 方法1: 使用Pillow解码
    pil_image = Image.open(BytesIO(test_image_data))
    print(f"✅ Pillow解码成功: {pil_image.size}, mode={pil_image.mode}")
    
    # 转换为numpy数组
    image_array = np.array(pil_image)
    print(f"✅ 转换为numpy数组: shape={image_array.shape}, dtype={image_array.dtype}")
    
    # 转换为OpenCV格式
    if len(image_array.shape) == 3 and image_array.shape[2] == 3:
        cv_image = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
        print(f"✅ 转换为OpenCV格式: shape={cv_image.shape}")
    else:
        cv_image = image_array
        print(f"✅ 灰度图像: shape={cv_image.shape}")
    
except Exception as e:
    print(f"❌ 图片解码失败: {str(e)}")
    print(traceback.format_exc())
    sys.exit(1)

# 6. 测试OCR识别
print("\n[6/8] 测试OCR识别...")
try:
    result = ocr_engine(cv_image, use_det=True, use_cls=True, use_rec=True)
    
    print(f"✅ OCR执行完成")
    print(f"   返回类型: {type(result)}")
    
    if result is None:
        print("⚠️ OCR返回None（未识别到任何内容）")
    elif isinstance(result, tuple):
        detections, timings = result
        print(f"   检测结果数量: {len(detections) if detections else 0}")
        print(f"   处理时间: {timings}")
        
        if detections:
            print("\n   识别详情:")
            for i, detection in enumerate(detections[:10], 1):  # 只显示前10个
                box, text, score = detection
                print(f"   [{i}] 文本='{text}', 置信度={float(score):.2%}")
        else:
            print("⚠️ 未识别到任何文本")
    else:
        print(f"   结果: {result}")
    
except Exception as e:
    print(f"❌ OCR识别失败: {str(e)}")
    print(traceback.format_exc())
    sys.exit(1)

# 7. 测试ocr_utils模块
print("\n[7/8] 测试ocr_utils模块...")
try:
    # 检查模块是否存在
    if os.path.exists('backend/utils/ocr_utils.py'):
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from backend.utils.ocr_utils import (
            initialize_ocr_engine,
            perform_ocr,
            transform_rapidocr_result,
            filter_alphanumeric_markers
        )
        print("✅ ocr_utils模块导入成功")
        
        # 测试perform_ocr函数
        print("\n   测试perform_ocr函数...")
        detected = perform_ocr(test_image_data)
        print(f"   识别结果数量: {len(detected)}")
        
        if detected:
            print("\n   识别详情:")
            for i, det in enumerate(detected[:10], 1):
                print(f"   [{i}] 数字='{det['number']}', "
                      f"位置=({det['x']}, {det['y']}), "
                      f"置信度={det['confidence']:.1f}%")
        else:
            print("⚠️ perform_ocr未识别到任何标记")
            
    else:
        print("⚠️ backend/utils/ocr_utils.py 不存在")
        print("   请确保在项目根目录运行此脚本")
        
except Exception as e:
    print(f"❌ ocr_utils测试失败: {str(e)}")
    print(traceback.format_exc())

# 8. 测试真实专利图片（如果提供）
print("\n[8/8] 测试真实专利图片...")
test_patent_image = 'tests/test patent pic.png'

if os.path.exists(test_patent_image):
    try:
        with open(test_patent_image, 'rb') as f:
            patent_image_data = f.read()
        
        print(f"✅ 读取专利图片: {test_patent_image} ({len(patent_image_data)} bytes)")
        
        # 使用OCR识别
        result = ocr_engine(cv2.imdecode(
            np.frombuffer(patent_image_data, np.uint8),
            cv2.IMREAD_COLOR
        ))
        
        if result and isinstance(result, tuple):
            detections, _ = result
            if detections:
                print(f"✅ 识别到 {len(detections)} 个文本区域")
                
                # 过滤数字标记
                numbers = []
                for detection in detections:
                    text = detection[1].strip()
                    if text.isdigit() or (text[:-1].isdigit() and text[-1].isalpha()):
                        numbers.append(text)
                
                print(f"   其中数字标记: {len(numbers)} 个")
                if numbers:
                    print(f"   标记列表: {', '.join(numbers[:20])}")
            else:
                print("⚠️ 未识别到任何内容")
        else:
            print("⚠️ OCR返回空结果")
            
    except Exception as e:
        print(f"❌ 专利图片测试失败: {str(e)}")
        print(traceback.format_exc())
else:
    print(f"⚠️ 测试图片不存在: {test_patent_image}")
    print("   跳过真实图片测试")

# 总结
print("\n" + "=" * 60)
print("诊断总结")
print("=" * 60)

print("\n已安装的依赖:")
for name, version in installed_versions.items():
    print(f"  • {name}: {version}")

print("\n诊断结论:")
if missing_deps:
    print("❌ 问题类型: 依赖缺失")
    print(f"   缺少: {', '.join(missing_deps)}")
    print("   解决方案: pip install rapidocr-onnxruntime opencv-python Pillow")
elif not result or (isinstance(result, tuple) and not result[0]):
    print("⚠️ 问题类型: OCR无法识别")
    print("   可能原因:")
    print("   1. 图片质量问题（模糊、对比度低）")
    print("   2. 图片格式问题（需要预处理）")
    print("   3. RapidOCR模型文件缺失或损坏")
    print("   4. 图片中确实没有可识别的文本")
    print("\n   建议:")
    print("   • 检查上传的图片是否清晰")
    print("   • 尝试提高图片对比度")
    print("   • 确保图片包含清晰的数字标记")
    print("   • 检查RapidOCR模型文件是否完整")
else:
    print("✅ OCR功能正常")
    print("   如果前端仍显示0个识别结果，问题可能在于:")
    print("   1. 前端上传的图片格式不正确")
    print("   2. 后端API路由配置问题")
    print("   3. 说明书解析问题（reference_map为空）")
    print("   4. 图片base64编码/解码问题")

print("\n建议下一步:")
print("1. 在阿里云服务器上运行此脚本: python3 diagnose_ocr_complete.py")
print("2. 检查后端日志中的[DEBUG]输出")
print("3. 使用浏览器开发者工具查看API请求/响应")
print("4. 确认说明书内容格式正确（包含'1. 部件名'格式）")

print("\n" + "=" * 60)
