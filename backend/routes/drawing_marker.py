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
        
        # 导入必要的模块
        import base64
        from backend.utils.ocr_utils import perform_ocr
        from backend.utils.component_extractor import extract_reference_markers
        
        # 处理结果数据
        processed_results = []
        total_numbers = 0
        
        # 1. 解析说明书，提取附图标记和部件名称
        reference_map = extract_reference_markers(specification)
        print(f"[DEBUG] Extracted reference_map: {reference_map}")
        print(f"[DEBUG] Total markers in specification: {len(reference_map)}")
        
        # 2. 处理每张图片
        for drawing in drawings:
            try:
                print(f"[DEBUG] Processing drawing: {drawing['name']}")
                
                # 解析base64图片数据
                image_data = base64.b64decode(drawing['data'])
                
                # 使用RapidOCR进行识别
                all_detected_numbers = perform_ocr(image_data)
                
                print(f"[DEBUG] OCR detected {len(all_detected_numbers)} markers")
                print(f"[DEBUG] Detected numbers: {[d['number'] for d in all_detected_numbers]}")
                
                # 保存原始OCR结果（用于调试）
                raw_ocr_results = [
                    {
                        'number': d['number'],
                        'x': d['x'],
                        'y': d['y'],
                        'confidence': d.get('confidence', 0)
                    }
                    for d in all_detected_numbers
                ]
                
                # 应用去重和置信度过滤（降低阈值以提高检测率）
                all_detected_numbers = deduplicate_results(all_detected_numbers, position_threshold=30)
                all_detected_numbers = filter_by_confidence(all_detected_numbers, min_confidence=40)
                print(f"[DEBUG] After filtering: {len(all_detected_numbers)} detections remain")
                
                # 匹配识别结果与reference_map
                detected_numbers, unknown, missing = match_with_reference_map(
                    all_detected_numbers,
                    reference_map
                )
                
                total_numbers += len(detected_numbers)
                print(f"[DEBUG] Matched {len(detected_numbers)} numbers with reference_map")
                
                # 保存处理结果（包含调试信息）
                processed_results.append({
                    'name': drawing['name'],
                    'type': drawing['type'],
                    'size': drawing['size'],
                    'detected_numbers': detected_numbers,
                    'debug_info': {
                        'raw_ocr_results': raw_ocr_results,
                        'filtered_count': len(all_detected_numbers),
                        'matched_count': len(detected_numbers)
                    }
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
        all_detected_numbers = []
        for drawing_result in processed_results:
            all_detected_numbers.extend(drawing_result.get('detected_numbers', []))
        
        # 使用calculate_statistics计算统计信息
        stats = calculate_statistics(
            matched_count=total_numbers,
            total_markers=len(reference_map),
            detected_numbers=all_detected_numbers
        )
        
        # 收集所有识别到的数字
        all_detected_set = set()
        for drawing_result in processed_results:
            for detected in drawing_result.get('detected_numbers', []):
                all_detected_set.add(detected['number'])
        
        # 找出缺失标记（在reference_map中但未识别到）
        missing_markers = [
            marker for marker in reference_map.keys()
            if marker not in all_detected_set
        ]
        
        # 找出未知标记（识别到但不在reference_map中）
        unknown_markers = []
        for drawing_result in processed_results:
            for detected in drawing_result.get('detected_numbers', []):
                if detected['number'] not in reference_map and detected['number'] not in unknown_markers:
                    unknown_markers.append(detected['number'])
        
        # 返回处理结果（包含调试信息）
        return create_response(data={
            'drawings': processed_results,
            'reference_map': reference_map,
            'total_numbers': total_numbers,
            'matched_count': total_numbers,
            'match_rate': stats['match_rate'],
            'avg_confidence': stats['avg_confidence'],
            'unknown_markers': unknown_markers,
            'missing_markers': missing_markers,
            'suggestions': stats['suggestions'],
            'message': f"成功处理 {len(drawings)} 张图片，识别出 {total_numbers} 个数字序号，匹配率 {stats['match_rate']}%",
            'debug_info': {
                'total_markers_in_spec': len(reference_map),
                'reference_map': reference_map,
                'extraction_method': 'jieba分词' if 'jieba' in str(type(extract_reference_markers)) else '正则表达式'
            }
        })
    
    except Exception as e:
        print(f"Error in process_drawing_marker: {traceback.format_exc()}")
        return create_response(error=f"处理失败: {str(e)}", status_code=500)