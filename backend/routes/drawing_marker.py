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
from backend.utils.ocr_utils import (
    deduplicate_results,
    filter_by_confidence,
    match_with_reference_map,
    calculate_statistics
)


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
        from PIL import Image, ImageEnhance, ImageFilter
        import pytesseract
        import re
        import base64
        
        # Windows系统上配置Tesseract路径
        import os
        import platform
        if platform.system() == 'Windows':
            # 尝试常见的Tesseract安装路径
            possible_paths = [
                r'C:\Program Files\Tesseract-OCR\tesseract.exe',
                r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
                r'C:\Tesseract-OCR\tesseract.exe',
            ]
            for path in possible_paths:
                if os.path.exists(path):
                    pytesseract.pytesseract.tesseract_cmd = path
                    print(f"[DEBUG] Found Tesseract at: {path}")
                    break
            else:
                print("[WARNING] Tesseract not found in common locations. OCR may fail.")
                print("[WARNING] Please install Tesseract or set pytesseract.pytesseract.tesseract_cmd manually.")
        
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
            """
            reference_map = {}
            
            # 模式1: 数字 + 分隔符(. 、) + 名称
            pattern1 = r'([0-9]+[A-Z]*)\s*[.、]\s*([^。；，,;\n、]+)'
            matches1 = re.findall(pattern1, spec_text)
            for match in matches1:
                number = match[0]
                name = match[1].strip()
                if name:  # 确保名称不为空
                    reference_map[number] = name
            
            # 模式2: 数字(可能带字母) + 中文字符 (如 "1电动工具"、"2L左侧外壳")
            pattern2 = r'([0-9]+[A-Z]*)([一-龥\u4e00-\u9fa5][^0-9、。；，,;\n]*?)(?=[0-9]+[A-Z]*[一-龥\u4e00-\u9fa5]|$)'
            matches2 = re.findall(pattern2, spec_text)
            for match in matches2:
                number = match[0]
                name = match[1].strip('、，,；; \t')
                if name and len(name) > 1:  # 确保名称有意义
                    # 如果这个编号还没有被模式1匹配到，才添加
                    if number not in reference_map:
                        reference_map[number] = name
            
            return reference_map
        
        reference_map = extract_reference_markers(specification)
        print(f"[DEBUG] Extracted reference_map: {reference_map}")
        print(f"[DEBUG] Total markers in specification: {len(reference_map)}")
        
        # 2. 处理每张图片
        for drawing in drawings:
            try:
                print(f"[DEBUG] Processing drawing: {drawing['name']}")
                # 解析base64图片数据
                image_data = base64.b64decode(drawing['data'])
                image = Image.open(BytesIO(image_data))
                print(f"[DEBUG] Image size: {image.size}")
                
                # 转换为灰度图
                if image.mode != 'L':
                    image = image.convert('L')
                
                # 调整图像尺寸到最佳识别范围 (1500-3000px)
                width, height = image.size
                max_dim = max(width, height)
                if max_dim < 1500:
                    scale = 1500 / max_dim
                    new_width = int(width * scale)
                    new_height = int(height * scale)
                    image = image.resize((new_width, new_height), Image.LANCZOS)
                    print(f"[DEBUG] Resized image to: {image.size}")
                elif max_dim > 3000:
                    scale = 3000 / max_dim
                    new_width = int(width * scale)
                    new_height = int(height * scale)
                    image = image.resize((new_width, new_height), Image.LANCZOS)
                    print(f"[DEBUG] Resized image to: {image.size}")
                
                # 图像预处理 - 尝试多种预处理方式以提高识别率
                # 方法1: 原始灰度图
                gray = image
                
                # 方法2: 增强对比度
                enhancer = ImageEnhance.Contrast(image)
                contrast_enhanced = enhancer.enhance(2.0)
                
                # 方法3: 锐化
                sharpened = image.filter(ImageFilter.SHARPEN)
                
                # 方法4: 二值化（简单阈值）
                threshold = 127
                binary = image.point(lambda x: 255 if x > threshold else 0, mode='1')
                
                # 收集所有方法的OCR结果
                all_detected_numbers = []
                
                # 配置Tesseract - 只识别数字和字母
                custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
                
                # 对每种预处理方法进行OCR
                for idx, processed_img in enumerate([gray, contrast_enhanced, sharpened, binary]):
                    method_name = ['grayscale', 'contrast_enhanced', 'sharpened', 'binary'][idx]
                    try:
                        print(f"[DEBUG] Running OCR with method: {method_name}")
                        
                        # 测试Tesseract是否可用
                        try:
                            ocr_result = pytesseract.image_to_data(
                                processed_img, 
                                output_type=pytesseract.Output.DICT, 
                                config=custom_config
                            )
                        except pytesseract.TesseractNotFoundError as e:
                            print(f"[ERROR] Tesseract not found: {str(e)}")
                            print(f"[ERROR] Please install Tesseract OCR: https://github.com/UB-Mannheim/tesseract/wiki")
                            continue
                        except Exception as e:
                            print(f"[ERROR] OCR failed with {method_name}: {str(e)}")
                            continue
                        
                        method_detections = 0
                        # 提取识别结果
                        for i in range(len(ocr_result['text'])):
                            text = ocr_result['text'][i].strip()
                            conf = int(ocr_result['conf'][i])
                            
                            # 调试：打印所有识别到的文本
                            if text:
                                print(f"[DEBUG] OCR detected: '{text}' (confidence: {conf})")
                            
                            # 只保留置信度大于50的结果，且文本不为空
                            if text and conf > 50:
                                # 检查是否匹配数字或数字+字母的模式
                                if re.match(r'^[0-9]+[A-Z]*$', text):
                                    method_detections += 1
                                    x = ocr_result['left'][i]
                                    y = ocr_result['top'][i]
                                    w = ocr_result['width'][i]
                                    h = ocr_result['height'][i]
                                    
                                    # 计算中心点
                                    center_x = x + w // 2
                                    center_y = y + h // 2
                                    
                                    # 检查是否已经存在相同位置的识别结果（去重）
                                    is_duplicate = False
                                    for existing in all_detected_numbers:
                                        if (abs(existing['x'] - center_x) < 20 and 
                                            abs(existing['y'] - center_y) < 20 and
                                            existing['number'] == text):
                                            # 如果新的置信度更高，替换
                                            if conf > existing['confidence']:
                                                existing['confidence'] = conf
                                                existing['x'] = center_x
                                                existing['y'] = center_y
                                                existing['width'] = w
                                                existing['height'] = h
                                            is_duplicate = True
                                            break
                                    
                                    if not is_duplicate:
                                        all_detected_numbers.append({
                                            'number': text,
                                            'x': center_x,
                                            'y': center_y,
                                            'width': w,
                                            'height': h,
                                            'confidence': conf
                                        })
                                else:
                                    print(f"[DEBUG] Skipped '{text}' - doesn't match number pattern")
                        
                        print(f"[DEBUG] Method {method_name} detected {method_detections} numbers")
                    except Exception as e:
                        print(f"[ERROR] OCR processing error with {method_name}: {str(e)}")
                        import traceback
                        traceback.print_exc()
                        continue
                
                print(f"[DEBUG] Total unique detections after deduplication: {len(all_detected_numbers)}")
                print(f"[DEBUG] Detected numbers: {[d['number'] for d in all_detected_numbers]}")
                
                # 应用去重和置信度过滤
                all_detected_numbers = deduplicate_results(all_detected_numbers, position_threshold=20)
                all_detected_numbers = filter_by_confidence(all_detected_numbers, min_confidence=60)
                print(f"[DEBUG] After filtering: {len(all_detected_numbers)} detections remain")
                
                # 从all_detected_numbers中提取与reference_map匹配的结果
                detected_numbers = []
                for detected in all_detected_numbers:
                    text = detected['number']
                    # 检查是否在reference_map中存在
                    if text in reference_map:
                        detected_numbers.append({
                            'number': text,
                            'name': reference_map[text],
                            'x': detected['x'],
                            'y': detected['y'],
                            'width': detected['width'],
                            'height': detected['height'],
                            'confidence': detected['confidence']
                        })
                        total_numbers += 1
                
                print(f"[DEBUG] Matched {len(detected_numbers)} numbers with reference_map")
                
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
        
        # 计算匹配率和统计信息
        match_rate = 0
        matched_count = total_numbers
        all_detected_set = set()
        unknown_markers = []
        
        # 收集所有识别到的数字
        for drawing_result in processed_results:
            for detected in drawing_result.get('detected_numbers', []):
                all_detected_set.add(detected['number'])
        
        # 找出未知标记（识别到但不在reference_map中）
        for drawing_result in processed_results:
            for detected in drawing_result.get('detected_numbers', []):
                if detected['number'] not in reference_map and detected['number'] not in unknown_markers:
                    unknown_markers.append(detected['number'])
        
        # 找出缺失标记（在reference_map中但未识别到）
        missing_markers = [
            marker for marker in reference_map.keys()
            if marker not in all_detected_set
        ]
        
        if len(reference_map) > 0:
            match_rate = round((total_numbers / len(reference_map)) * 100, 2)
        
        # 计算平均置信度
        all_confidences = []
        for drawing_result in processed_results:
            for detected in drawing_result.get('detected_numbers', []):
                all_confidences.append(detected['confidence'])
        
        avg_confidence = round(sum(all_confidences) / len(all_confidences), 2) if all_confidences else 0
        
        # 生成建议
        suggestions = []
        if match_rate < 50:
            suggestions.append("匹配率较低，建议检查图片清晰度或说明书格式")
        if avg_confidence < 70:
            suggestions.append("识别置信度较低，建议提供更清晰的图片")
        if missing_markers:
            suggestions.append(f"缺失标记: {', '.join(missing_markers)}")
        if total_numbers == 0:
            suggestions.append("未识别到任何标记，请确认图片包含数字序号且清晰可见")
        
        # 返回处理结果
        return create_response(data={
            'drawings': processed_results,
            'reference_map': reference_map,
            'total_numbers': total_numbers,
            'matched_count': matched_count,
            'match_rate': match_rate,
            'avg_confidence': avg_confidence,
            'unknown_markers': unknown_markers,
            'missing_markers': missing_markers,
            'suggestions': suggestions,
            'message': f"成功处理 {len(drawings)} 张图片，识别出 {total_numbers} 个数字序号，匹配率 {match_rate}%"
        })
    
    except Exception as e:
        print(f"Error in process_drawing_marker: {traceback.format_exc()}")
        return create_response(error=f"处理失败: {str(e)}", status_code=500)