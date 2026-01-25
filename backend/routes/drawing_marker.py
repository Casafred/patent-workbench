"""
Drawing marker API routes.

This module handles patent drawing marker functionality, including:
- Processing patent drawings with OCR to detect reference numbers
- Extracting reference markers and component names from specifications
- Matching detected numbers with component names
- Returning annotated drawing results
"""

import traceback
from io import BytesIO
from flask import Blueprint, request

from backend.middleware.auth_middleware import validate_api_request
from backend.utils.response import create_response


drawing_marker_bp = Blueprint('drawing_marker', __name__)


@drawing_marker_bp.route('/drawing-marker/process', methods=['POST'])
def process_drawing_marker():
    """
    Process patent drawings to detect reference markers and match with component names.
    
    Request body:
    {
        "drawings": [
            {
                "name": "drawing1.png",
                "type": "image/png",
                "size": 1024,
                "data": "base64encodeddata"
            }
        ],
        "specification": "1. 底座\n2. 旋转臂\n3. 夹紧装置"
    }
    
    Response:
    {
        "success": true,
        "data": {
            "drawings": [
                {
                    "name": "drawing1.png",
                    "type": "image/png",
                    "size": 1024,
                    "detected_numbers": [
                        {
                            "number": "1",
                            "name": "底座",
                            "x": 100,
                            "y": 200,
                            "width": 20,
                            "height": 20,
                            "confidence": 95
                        }
                    ]
                }
            ],
            "reference_map": {"1": "底座", "2": "旋转臂", "3": "夹紧装置"},
            "total_numbers": 1,
            "match_rate": 33.33,
            "message": "成功处理 1 张图片，识别出 1 个数字序号，匹配率 33.33%"
        }
    }
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        req_data = request.get_json()
        drawings = req_data.get('drawings')
        specification = req_data.get('specification')
        
        if not drawings or not isinstance(drawings, list) or len(drawings) == 0:
            return create_response(error="drawings is required and must be a non-empty list", status_code=400)
        
        if not specification or not isinstance(specification, str) or specification.strip() == '':
            return create_response(error="specification is required and must be a non-empty string", status_code=400)
        
        # 导入OCR和图像处理模块
        import cv2
        import numpy as np
        from PIL import Image
        import pytesseract
        import re
        import base64
        
        # 处理结果数据
        processed_results = []
        total_numbers = 0
        
        # 1. 解析说明书，提取附图标记和部件名称
        def extract_reference_markers(spec_text):
            """
            提取附图标记，支持多种格式：
            - "1. 底座" 或 "1、底座"
            - "1电动工具" (数字直接连接文字)
            - "1 电动工具" (数字和文字之间有空格)
            - "1…电动工具" (数字和文字之间有省略号)
            """
            reference_map = {}
            
            # 模式1: 数字 + 分隔符(. 、 …) + 名称
            pattern1 = r'([0-9]+[A-Z]*)\s*[.、…]\s*([^。；，,;\n、…]+)'
            matches1 = re.findall(pattern1, spec_text)
            for match in matches1:
                number = match[0]
                name = match[1].strip()
                if name:  # 确保名称不为空
                    reference_map[number] = name
            
            # 模式2: 数字(可能带字母) + 中文字符，用顿号分隔 (如 "1电动工具、2外壳、")
            # 先按顿号分割
            parts = spec_text.split('、')
            for part in parts:
                part = part.strip()
                # 匹配 "数字+字母(可选)+中文" 的模式
                match = re.match(r'^([0-9]+[A-Z]*)(.+)$', part)
                if match:
                    number = match.group(1)
                    name = match.group(2).strip()
                    # 移除开头的省略号、空格等分隔符
                    name = re.sub(r'^[…\s.、]+', '', name)
                    if name and number not in reference_map:
                        reference_map[number] = name
            
            return reference_map
        
        reference_map = extract_reference_markers(specification)
        print(f"[DEBUG] 从说明书中提取到 {len(reference_map)} 个附图标记")
        print(f"[DEBUG] 附图标记映射: {reference_map}")
        
        # 添加调试信息，显示说明书解析的详细结果
        debug_info = {
            'tesseract_available': False,
            'specification_parsing': {
                'input': specification[:100] + ("..." if len(specification) > 100 else ""),
                'reference_count': len(reference_map),
                'reference_map': reference_map
            },
            'image_processing': [],
            'ocr_results': []
        }
        
        # 测试Tesseract是否可用
        try:
            tesseract_version = pytesseract.get_tesseract_version()
            debug_info['tesseract_available'] = True
            debug_info['tesseract_version'] = str(tesseract_version)
            print(f"[DEBUG] Tesseract版本: {tesseract_version}")
        except Exception as e:
            print(f"[DEBUG] Tesseract不可用: {str(e)}")
            debug_info['tesseract_error'] = str(e)
        
        # 2. 处理每张图片
        for drawing in drawings:
            try:
                # 解析base64图片数据
                image_data = base64.b64decode(drawing['data'])
                image = Image.open(BytesIO(image_data))
                
                # 转换为OpenCV格式
                img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
                
                # 图像预处理 - 尝试多种预处理方式以提高识别率
                gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
                
                # 方法1: 自适应阈值（适合光照不均匀的图像）
                adaptive_thresh = cv2.adaptiveThreshold(
                    gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                    cv2.THRESH_BINARY, 11, 2
                )
                
                # 方法2: Otsu二值化（不反转）
                _, otsu_thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                
                # 方法3: 简单阈值
                _, simple_thresh = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)
                
                # 收集所有方法的OCR结果
                all_detected_numbers = []
                
                # 添加更多的图像预处理方法
                # 方法4: 高斯模糊 + 自适应阈值（适合噪点较多的图像）
                blurred = cv2.GaussianBlur(gray, (5, 5), 0)
                blurred_adaptive = cv2.adaptiveThreshold(
                    blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                    cv2.THRESH_BINARY, 11, 2
                )
                
                # 方法5: 反转阈值（适合深色背景的图像）
                _, inverted_thresh = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY_INV)
                
                # 方法6: 形态学操作（膨胀+腐蚀，适合连接断开的字符）
                kernel = np.ones((3, 3), np.uint8)
                dilated = cv2.dilate(adaptive_thresh, kernel, iterations=1)
                eroded = cv2.erode(dilated, kernel, iterations=1)
                
                # 配置Tesseract - 只识别数字和字母
                # 尝试多种PSM（Page Segmentation Mode）设置
                custom_configs = [
                    r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',  # 块文本
                    r'--oem 3 --psm 8 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',  # 单个字符
                    r'--oem 3 --psm 10 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'  # 单个字符，假设很小的旋转
                ]
                
                # 预处理方法列表，包含名称和处理后的图像
                preprocessing_methods = [
                    ('灰度图', gray),
                    ('自适应阈值', adaptive_thresh),
                    ('Otsu二值化', otsu_thresh),
                    ('简单阈值', simple_thresh),
                    ('高斯模糊+自适应阈值', blurred_adaptive),
                    ('反转阈值', inverted_thresh),
                    ('形态学操作', eroded)
                ]
                
                # 记录每种预处理方法的OCR结果
                preprocessing_results = []
                
                # 对每种预处理方法和配置组合进行OCR
                for config in custom_configs:
                    for method_name, processed_img in preprocessing_methods:
                        try:
                            ocr_result = pytesseract.image_to_data(
                                processed_img, 
                                output_type=pytesseract.Output.DICT, 
                                config=config
                            )
                            
                            # 提取识别结果
                            method_detected = []
                            for i in range(len(ocr_result['text'])):
                                text = ocr_result['text'][i].strip()
                                conf = int(ocr_result['conf'][i])
                                
                                # 放宽置信度阈值，记录更多结果用于调试
                                if text:
                                    x = ocr_result['left'][i]
                                    y = ocr_result['top'][i]
                                    w = ocr_result['width'][i]
                                    h = ocr_result['height'][i]
                                    
                                    # 计算中心点
                                    center_x = x + w // 2
                                    center_y = y + h // 2
                                    
                                    method_detected.append({
                                        'text': text,
                                        'confidence': conf,
                                        'x': x,
                                        'y': y,
                                        'width': w,
                                        'height': h,
                                        'center_x': center_x,
                                        'center_y': center_y
                                    })
                            
                            # 记录该方法的结果
                            preprocessing_results.append({
                                'method': method_name,
                                'config': config,
                                'detected_count': len([d for d in method_detected if re.match(r'^[0-9]+[A-Z]*$', d['text'])]),
                                'all_results': method_detected[:10]  # 只记录前10个结果
                            })
                            
                            # 提取匹配的数字或数字+字母结果，置信度大于30
                            for det in method_detected:
                                if re.match(r'^[0-9]+[A-Z]*$', det['text']) and det['confidence'] > 30:
                                    # 检查是否已经存在相同位置的识别结果（去重）
                                    is_duplicate = False
                                    for existing in all_detected_numbers:
                                        if (abs(existing['x'] - det['center_x']) < 20 and 
                                            abs(existing['y'] - det['center_y']) < 20 and
                                            existing['number'] == det['text']):
                                            # 如果新的置信度更高，替换
                                            if det['confidence'] > existing['confidence']:
                                                existing['confidence'] = det['confidence']
                                                existing['x'] = det['center_x']
                                                existing['y'] = det['center_y']
                                                existing['width'] = det['width']
                                                existing['height'] = det['height']
                                            is_duplicate = True
                                            break
                                    
                                    if not is_duplicate:
                                        all_detected_numbers.append({
                                            'number': det['text'],
                                            'x': det['center_x'],
                                            'y': det['center_y'],
                                            'width': det['width'],
                                            'height': det['height'],
                                            'confidence': det['confidence'],
                                            'method': method_name
                                        })
                        except Exception as e:
                            print(f"[DEBUG] OCR处理错误 ({method_name}, {config}): {str(e)}")
                            continue
                
                # 记录图像信息和OCR结果
                image_info = {
                    'name': drawing['name'],
                    'width': img_cv.shape[1],
                    'height': img_cv.shape[0],
                    'preprocessing_results': preprocessing_results,
                    'detected_numbers': all_detected_numbers,
                    'detected_count': len(all_detected_numbers)
                }
                debug_info['image_processing'].append(image_info)
                
                print(f"[DEBUG] 图片 {drawing['name']} OCR识别到 {len(all_detected_numbers)} 个数字/标记")
                for det in all_detected_numbers[:10]:  # 只打印前10个
                    print(f"  - {det['number']} (置信度: {det['confidence']}%, 方法: {det['method']})")
                
                # 匹配识别结果与说明书中的附图标记
                detected_numbers = []
                for detected in all_detected_numbers:
                    number = detected['number']
                    # 检查是否在reference_map中存在
                    if number in reference_map:
                        detected_numbers.append({
                            'number': number,
                            'name': reference_map[number],
                            'x': detected['x'],
                            'y': detected['y'],
                            'width': detected['width'],
                            'height': detected['height'],
                            'confidence': detected['confidence']
                        })
                        total_numbers += 1
                    else:
                        # 即使没有匹配，也记录下来（标记为未匹配）
                        detected_numbers.append({
                            'number': number,
                            'name': '(未在说明书中找到)',
                            'x': detected['x'],
                            'y': detected['y'],
                            'width': detected['width'],
                            'height': detected['height'],
                            'confidence': detected['confidence'],
                            'unmatched': True
                        })
                
                # 保存处理结果
                processed_results.append({
                    'name': drawing['name'],
                    'type': drawing['type'],
                    'size': drawing['size'],
                    'detected_numbers': detected_numbers
                })
                
            except Exception as e:
                print(f"Error processing drawing {drawing['name']}: {traceback.format_exc()}")
                processed_results.append({
                    'name': drawing['name'],
                    'type': drawing['type'],
                    'size': drawing['size'],
                    'detected_numbers': [],
                    'error': str(e)
                })
        
        # 计算匹配率
        match_rate = 0
        if len(reference_map) > 0:
            match_rate = round((total_numbers / len(reference_map)) * 100, 2)
        
        # 返回处理结果，包含详细的调试信息
        return create_response(data={
            'drawings': processed_results,
            'reference_map': reference_map,
            'total_numbers': total_numbers,
            'match_rate': match_rate,
            'message': f"成功处理 {len(drawings)} 张图片，识别出 {total_numbers} 个数字序号，匹配率 {match_rate}%",
            'debug_info': debug_info  # 添加详细的调试信息
        })
    
    except Exception as e:
        print(f"Error in process_drawing_marker: {traceback.format_exc()}")
        return create_response(error=f"处理失败: {str(e)}", status_code=500)