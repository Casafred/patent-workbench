"""
Drawing marker API routes.

This module handles patent drawing marker functionality, including:
- Processing patent drawings with OCR to detect reference numbers
- Extracting reference markers and component names from specifications
- Matching detected numbers with component names
- Returning annotated drawing results
- AI-powered description processing for intelligent component extraction
"""

import traceback
import asyncio
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
from backend.services.api_service import get_zhipu_client


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
        ai_mode = req_data.get('ai_mode', False)
        model_name = req_data.get('model_name')
        custom_prompt = req_data.get('custom_prompt')
        
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
        # 根据AI模式选择不同的处理方式
        if ai_mode:
            # AI模式：使用AI处理说明书
            print(f"[DEBUG] Using AI mode to extract components")
            
            if not model_name:
                return create_response(
                    error="model_name is required when ai_mode is true",
                    status_code=400
                )
            
            # Get API key from Authorization header (AI mode requires it)
            client, error = get_zhipu_client()
            if error:
                return error
            
            # Get API key from client
            api_key = client.api_key
            
            # Import AI processor
            from backend.services.ai_description.ai_description_processor import AIDescriptionProcessor
            
            # Create processor instance
            processor = AIDescriptionProcessor(api_key)
            
            # Process description using AI
            # Run async function in sync context
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                ai_result = loop.run_until_complete(
                    processor.process(specification, model_name, custom_prompt)
                )
            finally:
                loop.close()
            
            # Check AI processing result
            if not ai_result.get('success'):
                return create_response(
                    error=ai_result.get('error', 'AI processing failed'),
                    status_code=500
                )
            
            # Convert AI components to reference_map format
            components = ai_result['data'].get('components', [])
            reference_map = {
                comp['marker']: comp['name']
                for comp in components
            }
            
            print(f"[DEBUG] AI extracted reference_map: {reference_map}")
            print(f"[DEBUG] Total markers from AI: {len(reference_map)}")
        else:
            # 规则模式：使用jieba分词（不需要API key）
            print(f"[DEBUG] Using rule-based mode (jieba) to extract components")
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
                all_detected_numbers = deduplicate_results(all_detected_numbers, position_threshold=25)
                all_detected_numbers = filter_by_confidence(all_detected_numbers, min_confidence=30)
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
                'extraction_method': 'AI智能抽取' if ai_mode else 'jieba分词'
            }
        })
    
    except Exception as e:
        print(f"Error in process_drawing_marker: {traceback.format_exc()}")
        return create_response(error=f"处理失败: {str(e)}", status_code=500)



@drawing_marker_bp.route('/drawing-marker/extract', methods=['POST'])
def extract_components():
    """
    Extract component markers from patent description text.
    
    Supports two modes:
    1. Rule-based mode (ai_mode=false): Uses jieba word segmentation
    2. AI mode (ai_mode=true): Uses AI model for intelligent extraction
    
    Request body:
    {
        "description_text": "说明书内容",
        "ai_mode": true/false,
        "model_name": "glm-4-flash" (required when ai_mode=true),
        "custom_prompt": "自定义提示词" (optional)
    }
    
    Response:
    {
        "success": true,
        "data": {
            "language": "en",  // Only in AI mode
            "translated_text": "...",  // Only if translation occurred
            "components": [
                {"marker": "10", "name": "外壳"},
                {"marker": "20", "name": "显示屏"}
            ],
            "processing_time": 1.23  // Only in AI mode
        }
    }
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        req_data = request.get_json()
        description_text = req_data.get('description_text')
        ai_mode = req_data.get('ai_mode', False)
        model_name = req_data.get('model_name')
        custom_prompt = req_data.get('custom_prompt')
        
        # Validate input
        if not description_text or not isinstance(description_text, str) or description_text.strip() == '':
            return create_response(
                error="description_text is required and must be a non-empty string",
                status_code=400
            )
        
        if ai_mode:
            # AI mode processing
            if not model_name:
                return create_response(
                    error="model_name is required when ai_mode is true",
                    status_code=400
                )
            
            # Get API key from Authorization header
            client, error = get_zhipu_client()
            if error:
                return error
            
            # Get API key from client
            api_key = client.api_key
            
            # Import AI processor
            from backend.services.ai_description.ai_description_processor import AIDescriptionProcessor
            
            # Create processor instance
            processor = AIDescriptionProcessor(api_key)
            
            # Process description using AI
            # Run async function in sync context
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                result = loop.run_until_complete(
                    processor.process(description_text, model_name, custom_prompt)
                )
            finally:
                loop.close()
            
            # Return result
            if result.get('success'):
                return create_response(data=result['data'])
            else:
                return create_response(
                    error=result.get('error', 'AI processing failed'),
                    status_code=500
                )
        
        else:
            # Rule-based mode (existing jieba logic)
            from backend.utils.component_extractor import extract_reference_markers
            
            # Extract components using jieba
            reference_map = extract_reference_markers(description_text)
            
            # Convert to components format for consistency
            components = [
                {"marker": marker, "name": name}
                for marker, name in reference_map.items()
            ]
            
            return create_response(data={
                "components": components,
                "extraction_method": "jieba分词"
            })
    
    except Exception as e:
        print(f"Error in extract_components: {traceback.format_exc()}")
        return create_response(
            error=f"处理失败: {str(e)}",
            status_code=500
        )
