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
            # 正则表达式匹配附图标记，如"1. 底座"、"2. 旋转臂"等
            pattern = r'([0-9]+)\s*[.、]\s*([^。；，,;\n]+)'
            matches = re.findall(pattern, spec_text)
            reference_map = {}
            for match in matches:
                number = match[0]
                name = match[1].strip()
                reference_map[number] = name
            return reference_map
        
        reference_map = extract_reference_markers(specification)
        
        # 2. 处理每张图片
        for drawing in drawings:
            try:
                # 解析base64图片数据
                image_data = base64.b64decode(drawing['data'])
                image = Image.open(BytesIO(image_data))
                
                # 转换为OpenCV格式
                img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
                
                # 图像预处理
                # 转换为灰度图
                gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
                # 高斯模糊去噪
                blurred = cv2.GaussianBlur(gray, (5, 5), 0)
                # 二值化处理
                _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
                
                # 形态学操作，去除小噪点
                kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
                processed = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel, iterations=2)
                processed = cv2.morphologyEx(processed, cv2.MORPH_CLOSE, kernel, iterations=2)
                
                # 使用Tesseract进行OCR识别
                # 配置Tesseract只识别数字
                custom_config = r'--oem 3 --psm 6 outputbase digits'
                ocr_result = pytesseract.image_to_data(processed, output_type=pytesseract.Output.DICT, config=custom_config)
                
                # 提取识别结果中的数字和坐标
                detected_numbers = []
                for i in range(len(ocr_result['text'])):
                    text = ocr_result['text'][i].strip()
                    if text and text.isdigit() and int(ocr_result['conf'][i]) > 60:  # 只保留置信度大于60的数字
                        x = ocr_result['left'][i]
                        y = ocr_result['top'][i]
                        w = ocr_result['width'][i]
                        h = ocr_result['height'][i]
                        
                        # 计算数字的中心点
                        center_x = x + w // 2
                        center_y = y + h // 2
                        
                        # 检查是否在reference_map中存在
                        if text in reference_map:
                            detected_numbers.append({
                                'number': text,
                                'name': reference_map[text],
                                'x': center_x,
                                'y': center_y,
                                'width': w,
                                'height': h,
                                'confidence': ocr_result['conf'][i]
                            })
                            total_numbers += 1
                
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
        
        # 返回处理结果
        return create_response(data={
            'drawings': processed_results,
            'reference_map': reference_map,
            'total_numbers': total_numbers,
            'match_rate': match_rate,
            'message': f"成功处理 {len(drawings)} 张图片，识别出 {total_numbers} 个数字序号，匹配率 {match_rate}%"
        })
    
    except Exception as e:
        print(f"Error in process_drawing_marker: {traceback.format_exc()}")
        return create_response(error=f"处理失败: {str(e)}", status_code=500)