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
                "data": "base64encodeddata",
                "cache_key": "optional_cache_identifier"
            }
        ],
        "specification": "1. 底座\n2. 旋转臂\n3. 夹紧装置",
        "force_refresh": false  // 是否强制刷新缓存
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
            "message": "成功处理 1 张图片，识别出 1 个数字序号，匹配率 33.33%",
            "cache_info": {
                "has_cache": false,
                "cache_key": "drawing1.png_hash123"
            }
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
        force_refresh = req_data.get('force_refresh', False)
        ocr_mode = req_data.get('ocr_mode', 'rapidocr')
        
        if not drawings or not isinstance(drawings, list) or len(drawings) == 0:
            return create_response(error="drawings is required and must be a non-empty list", status_code=400)
        
        if not specification or not isinstance(specification, str) or specification.strip() == '':
            return create_response(error="specification is required and must be a non-empty string", status_code=400)
        
        import base64
        import hashlib
        from backend.utils.ocr_utils import perform_ocr
        from backend.utils.component_extractor import extract_reference_markers
        from backend.utils.text_preprocessor import TextPreprocessor

        from backend.utils.drawing_cache import DrawingCacheManager
        cache_manager = DrawingCacheManager()

        processed_results = []
        total_numbers = 0
        all_ocr_markers = set()
        cache_info = {}

        glm_api_key = None
        if ocr_mode == 'glm_ocr':
            client, error = get_zhipu_client()
            if error:
                return error
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Bearer '):
                glm_api_key = auth_header.split(' ')[1]
            if not glm_api_key:
                return create_response(
                    error="GLM OCR mode requires API key in Authorization header",
                    status_code=401
                )

        print(f"[DEBUG] Step 1: Processing {len(drawings)} drawings with OCR (mode: {ocr_mode})...")

        for drawing in drawings:
            try:
                print(f"[DEBUG] Processing drawing: {drawing['name']}")

                # 解析base64图片数据
                image_data = base64.b64decode(drawing['data'])
                
                image_hash = hashlib.md5(image_data).hexdigest()
                cache_key = f"{ocr_mode}_{drawing['name']}_{image_hash}"
                
                cached_result = None
                if not force_refresh:
                    cached_result = cache_manager.get_cache(cache_key)
                    if cached_result:
                        print(f"[DEBUG] Found cached result for {drawing['name']}")
                        cache_info[drawing['name']] = {
                            'has_cache': True,
                            'cache_key': cache_key,
                            'cached_at': cached_result.get('timestamp'),
                            'ocr_mode': cached_result.get('ocr_mode', 'rapidocr')
                        }

                if cached_result and not force_refresh:
                    all_detected_numbers = cached_result['ocr_results']
                    print(f"[DEBUG] Using cached OCR results: {len(all_detected_numbers)} markers")
                else:
                    if ocr_mode == 'glm_ocr':
                        from backend.utils.glm_ocr_utils import perform_glm_ocr
                        try:
                            all_detected_numbers = perform_glm_ocr(
                                image_data,
                                glm_api_key,
                                ocr_type="handwriting",
                                language_type="CHN_ENG"
                            )
                            print(f"[DEBUG] GLM OCR detected {len(all_detected_numbers)} items")
                        except Exception as e:
                            print(f"[WARN] GLM OCR failed, falling back to RapidOCR: {str(e)}")
                            all_detected_numbers = perform_ocr(image_data)
                    else:
                        all_detected_numbers = perform_ocr(image_data)
                    
                    cache_manager.set_cache(cache_key, {
                        'drawing_name': drawing['name'],
                        'ocr_results': all_detected_numbers,
                        'image_hash': image_hash,
                        'ocr_mode': ocr_mode
                    })
                    print(f"[DEBUG] Cached OCR results for {drawing['name']}")
                    
                    cache_info[drawing['name']] = {
                        'has_cache': False,
                        'cache_key': cache_key,
                        'cached_at': None,
                        'ocr_mode': ocr_mode
                    }

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

                # 收集OCR检测到的所有标记（用于预处理说明书）
                for detection in all_detected_numbers:
                    all_ocr_markers.add(detection['number'])

                # 暂存处理结果（标注信息稍后匹配）
                processed_results.append({
                    'name': drawing['name'],
                    'type': drawing['type'],
                    'size': drawing['size'],
                    'ocr_results': all_detected_numbers,  # 暂存OCR结果
                    'raw_ocr_results': raw_ocr_results
                })

            except Exception as e:
                print(f"Error processing drawing {drawing['name']}: {traceback.format_exc()}")
                processed_results.append({
                    'name': drawing['name'],
                    'type': drawing['type'],
                    'size': drawing['size'],
                    'ocr_results': [],
                    'error': str(e)
                })

        print(f"[DEBUG] Step 1 complete: Collected {len(all_ocr_markers)} unique markers from OCR: {all_ocr_markers}")

        # 🚀 STEP 2: 解析说明书，提取附图标记和部件名称
        # 🔥 优化：移除预处理步骤，直接处理完整说明书（提高准确性，减少处理时间）
        print(f"[DEBUG] Step 2: Extracting components from specification...")

        # 根据AI模式选择不同的处理方式
        if ai_mode:
            # AI模式：使用AI处理说明书
            print(f"[DEBUG] Using AI mode to extract components")

            if not model_name:
                return create_response(
                    error="model_name is required when ai_mode is true",
                    status_code=400
                )

            # Get ZhipuAI client from Authorization header (AI mode requires it)
            client, error = get_zhipu_client()
            if error:
                return error

            # Import AI processor
            from backend.services.ai_description.ai_description_processor import AIDescriptionProcessor

            # Create processor instance (no longer needs api_key)
            processor = AIDescriptionProcessor()

            # 🔥 优化：直接处理完整说明书，让AI自己判断相关内容
            # Process description using AI, passing client directly
            # Run async function in sync context
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                ai_result = loop.run_until_complete(
                    processor.process(specification, model_name, client, custom_prompt)
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

        # 🚀 STEP 3: 将OCR结果与reference_map匹配
        print(f"[DEBUG] Step 3: Matching OCR results with reference_map...")

        for drawing_result in processed_results:
            if 'error' in drawing_result:
                continue

            try:
                # 获取该图片的OCR结果
                ocr_results = drawing_result.pop('ocr_results', [])
                raw_ocr_results = drawing_result.pop('raw_ocr_results', [])

                # 匹配识别结果与reference_map
                detected_numbers, unknown, missing = match_with_reference_map(
                    ocr_results,
                    reference_map
                )

                total_numbers += len(detected_numbers)
                print(f"[DEBUG] Drawing {drawing_result['name']}: Matched {len(detected_numbers)} numbers")

                # 🔥 关键优化：即使没有匹配，也要保留OCR识别结果
                # 将未匹配的OCR结果也添加到detected_numbers中，标记为"未匹配"
                unmatched_ocr = []
                for ocr_item in ocr_results:
                    if ocr_item['number'] not in reference_map:
                        unmatched_ocr.append({
                            **ocr_item,
                            'name': '(说明书未匹配)',
                            'is_matched': False
                        })
                
                # 标记已匹配的项
                for item in detected_numbers:
                    item['is_matched'] = True
                
                # 合并匹配和未匹配的结果
                all_detected = detected_numbers + unmatched_ocr

                # 保存最终结果
                drawing_result['detected_numbers'] = all_detected
                drawing_result['ocr_detected_count'] = len(ocr_results)  # OCR识别总数
                drawing_result['matched_count'] = len(detected_numbers)  # 匹配成功数
                drawing_result['unmatched_count'] = len(unmatched_ocr)   # 未匹配数
                drawing_result['debug_info'] = {
                    'raw_ocr_results': raw_ocr_results,
                    'filtered_count': len(ocr_results),
                    'matched_count': len(detected_numbers),
                    'unmatched_count': len(unmatched_ocr)
                }

            except Exception as e:
                print(f"Error matching drawing {drawing_result['name']}: {traceback.format_exc()}")
                drawing_result['detected_numbers'] = []
                drawing_result['error'] = str(e)
        
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
        
        total_ocr_detected = sum(d.get('ocr_detected_count', 0) for d in processed_results)
        total_matched = sum(d.get('matched_count', 0) for d in processed_results)
        total_unmatched = sum(d.get('unmatched_count', 0) for d in processed_results)
        
        ocr_mode_display = 'GLM OCR API' if ocr_mode == 'glm_ocr' else 'RapidOCR (内置)'
        
        if total_ocr_detected > 0:
            if total_matched > 0:
                message = f"✅ [{ocr_mode_display}] 识别: {total_ocr_detected}个标记 | 匹配: {total_matched}个 | 未匹配: {total_unmatched}个"
            else:
                message = f"⚠️ [{ocr_mode_display}] 识别: {total_ocr_detected}个标记 | 匹配: 0个 (请检查说明书内容或使用AI模式)"
        else:
            message = f"❌ [{ocr_mode_display}] 未识别到任何标记，请检查图片清晰度"
        
        return create_response(data={
            'drawings': processed_results,
            'reference_map': reference_map,
            'total_numbers': total_numbers,
            'matched_count': total_matched,
            'ocr_detected_count': total_ocr_detected,
            'unmatched_count': total_unmatched,
            'match_rate': stats['match_rate'],
            'avg_confidence': stats['avg_confidence'],
            'unknown_markers': unknown_markers,
            'missing_markers': missing_markers,
            'suggestions': stats['suggestions'],
            'message': message,
            'cache_info': cache_info,
            'ocr_mode': ocr_mode,
            'ocr_mode_display': ocr_mode_display,
            'debug_info': {
                'total_markers_in_spec': len(reference_map),
                'reference_map': reference_map,
                'extraction_method': 'AI智能抽取' if ai_mode else 'jieba分词',
                'ocr_mode': ocr_mode,
                'has_ocr_results': total_ocr_detected > 0,
                'has_matched_results': total_matched > 0
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

            # Get ZhipuAI client from Authorization header (AI mode requires it)
            client, error = get_zhipu_client()
            if error:
                return error

            # Import AI processor
            from backend.services.ai_description.ai_description_processor import AIDescriptionProcessor

            # Create processor instance (no longer needs api_key)
            processor = AIDescriptionProcessor()

            # Process description using AI, passing client directly
            # Run async function in sync context
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                result = loop.run_until_complete(
                    processor.process(description_text, model_name, client, custom_prompt)
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


@drawing_marker_bp.route('/drawing-marker/reprocess-specification', methods=['POST'])
def reprocess_specification():
    """
    Reprocess specification only (reuse cached OCR results).
    
    Use case: Specification content updated, but drawings remain the same.
    
    Request body:
    {
        "cache_keys": ["drawing1.png_hash123", "drawing2.png_hash456"],
        "specification": "更新后的说明书内容",
        "ai_mode": true/false,
        "model_name": "glm-4-flash" (required when ai_mode=true),
        "custom_prompt": "自定义提示词" (optional)
    }
    
    Response: Same as /drawing-marker/process
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        req_data = request.get_json()
        cache_keys = req_data.get('cache_keys')
        specification = req_data.get('specification')
        ai_mode = req_data.get('ai_mode', False)
        model_name = req_data.get('model_name')
        custom_prompt = req_data.get('custom_prompt')
        
        # Validate input
        if not cache_keys or not isinstance(cache_keys, list) or len(cache_keys) == 0:
            return create_response(
                error="cache_keys is required and must be a non-empty list",
                status_code=400
            )
        
        if not specification or not isinstance(specification, str) or specification.strip() == '':
            return create_response(
                error="specification is required and must be a non-empty string",
                status_code=400
            )
        
        # Import cache manager
        from backend.utils.drawing_cache import DrawingCacheManager
        cache_manager = DrawingCacheManager()
        
        # Load cached OCR results
        processed_results = []
        total_ocr_detected = 0
        
        for cache_key in cache_keys:
            cached_data = cache_manager.get_cache(cache_key)
            
            if not cached_data:
                return create_response(
                    error=f"Cache not found for key: {cache_key}",
                    status_code=404
                )
            
            # Extract OCR results from cache
            ocr_results = cached_data.get('ocr_results', [])
            drawing_name = cached_data.get('drawing_name', 'unknown')
            
            total_ocr_detected += len(ocr_results)
            
            processed_results.append({
                'name': drawing_name,
                'cache_key': cache_key,
                'ocr_results': ocr_results,
                'from_cache': True
            })
        
        print(f"[DEBUG] Loaded {len(processed_results)} cached OCR results")
        print(f"[DEBUG] Total OCR detected: {total_ocr_detected}")
        
        # Process specification (same logic as main endpoint)
        if ai_mode:
            if not model_name:
                return create_response(
                    error="model_name is required when ai_mode is true",
                    status_code=400
                )
            
            client, error = get_zhipu_client()
            if error:
                return error
            
            from backend.services.ai_description.ai_description_processor import AIDescriptionProcessor
            processor = AIDescriptionProcessor()
            
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                ai_result = loop.run_until_complete(
                    processor.process(specification, model_name, client, custom_prompt)
                )
            finally:
                loop.close()
            
            if not ai_result.get('success'):
                return create_response(
                    error=ai_result.get('error', 'AI processing failed'),
                    status_code=500
                )
            
            components = ai_result['data'].get('components', [])
            reference_map = {comp['marker']: comp['name'] for comp in components}
        else:
            from backend.utils.component_extractor import extract_reference_markers
            reference_map = extract_reference_markers(specification)
        
        print(f"[DEBUG] Extracted reference_map: {len(reference_map)} markers")
        
        # Match OCR results with new reference_map
        from backend.utils.ocr_utils import match_with_reference_map
        
        total_matched = 0
        total_unmatched = 0
        
        for drawing_result in processed_results:
            ocr_results = drawing_result.pop('ocr_results')
            
            detected_numbers, unknown, missing = match_with_reference_map(
                ocr_results,
                reference_map
            )
            
            # Add unmatched markers
            unmatched_ocr = []
            for ocr_item in ocr_results:
                if ocr_item['number'] not in reference_map:
                    unmatched_ocr.append({
                        **ocr_item,
                        'name': '(说明书未匹配)',
                        'is_matched': False
                    })
            
            for item in detected_numbers:
                item['is_matched'] = True
            
            all_detected = detected_numbers + unmatched_ocr
            
            drawing_result['detected_numbers'] = all_detected
            drawing_result['matched_count'] = len(detected_numbers)
            drawing_result['unmatched_count'] = len(unmatched_ocr)
            drawing_result['ocr_detected_count'] = len(ocr_results)
            
            total_matched += len(detected_numbers)
            total_unmatched += len(unmatched_ocr)
        
        # Generate message
        message = f"🔄 使用缓存OCR结果 ({total_ocr_detected}个) | 说明书重新解析 | 匹配: {total_matched}个 | 未匹配: {total_unmatched}个"
        
        return create_response(data={
            'drawings': processed_results,
            'reference_map': reference_map,
            'matched_count': total_matched,
            'ocr_detected_count': total_ocr_detected,
            'unmatched_count': total_unmatched,
            'match_rate': (total_matched / len(reference_map) * 100) if len(reference_map) > 0 else 0,
            'message': message,
            'reprocess_mode': 'specification_only',
            'cache_used': True
        })
    
    except Exception as e:
        print(f"Error in reprocess_specification: {traceback.format_exc()}")
        return create_response(
            error=f"处理失败: {str(e)}",
            status_code=500
        )


@drawing_marker_bp.route('/drawing-marker/reprocess-drawings', methods=['POST'])
def reprocess_drawings():
    """
    Reprocess drawings only (reuse cached specification parsing results).
    
    Use case: Drawings updated or need re-OCR, but specification remains the same.
    
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
        "reference_map": {
            "1": "底座",
            "2": "旋转臂"
        }
    }
    
    Response: Same as /drawing-marker/process
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        req_data = request.get_json()
        drawings = req_data.get('drawings')
        reference_map = req_data.get('reference_map')
        
        # Validate input
        if not drawings or not isinstance(drawings, list) or len(drawings) == 0:
            return create_response(
                error="drawings is required and must be a non-empty list",
                status_code=400
            )
        
        if not reference_map or not isinstance(reference_map, dict):
            return create_response(
                error="reference_map is required and must be a dict",
                status_code=400
            )
        
        print(f"[DEBUG] Reprocessing {len(drawings)} drawings with cached reference_map")
        print(f"[DEBUG] Reference map has {len(reference_map)} markers")
        
        # Import necessary modules
        import base64
        import hashlib
        from backend.utils.ocr_utils import (
            perform_ocr,
            deduplicate_results,
            filter_by_confidence,
            match_with_reference_map
        )
        from backend.utils.drawing_cache import DrawingCacheManager
        
        cache_manager = DrawingCacheManager()
        processed_results = []
        total_ocr_detected = 0
        total_matched = 0
        total_unmatched = 0
        
        # Process each drawing with OCR
        for drawing in drawings:
            try:
                print(f"[DEBUG] Processing drawing: {drawing['name']}")
                
                # Decode image
                image_data = base64.b64decode(drawing['data'])
                
                # Generate cache key
                image_hash = hashlib.md5(image_data).hexdigest()
                cache_key = f"{drawing['name']}_{image_hash}"
                
                # Perform OCR (force refresh to get new results)
                all_detected_numbers = perform_ocr(image_data)
                
                # Save to cache
                cache_manager.set_cache(cache_key, {
                    'drawing_name': drawing['name'],
                    'ocr_results': all_detected_numbers,
                    'image_hash': image_hash
                })
                
                print(f"[DEBUG] OCR detected {len(all_detected_numbers)} markers")
                
                # Apply filtering
                all_detected_numbers = deduplicate_results(all_detected_numbers, position_threshold=25)
                all_detected_numbers = filter_by_confidence(all_detected_numbers, min_confidence=30)
                
                total_ocr_detected += len(all_detected_numbers)
                
                # Match with cached reference_map
                detected_numbers, unknown, missing = match_with_reference_map(
                    all_detected_numbers,
                    reference_map
                )
                
                # Add unmatched markers
                unmatched_ocr = []
                for ocr_item in all_detected_numbers:
                    if ocr_item['number'] not in reference_map:
                        unmatched_ocr.append({
                            **ocr_item,
                            'name': '(说明书未匹配)',
                            'is_matched': False
                        })
                
                for item in detected_numbers:
                    item['is_matched'] = True
                
                all_detected = detected_numbers + unmatched_ocr
                
                total_matched += len(detected_numbers)
                total_unmatched += len(unmatched_ocr)
                
                processed_results.append({
                    'name': drawing['name'],
                    'type': drawing['type'],
                    'size': drawing['size'],
                    'detected_numbers': all_detected,
                    'matched_count': len(detected_numbers),
                    'unmatched_count': len(unmatched_ocr),
                    'ocr_detected_count': len(all_detected_numbers),
                    'cache_key': cache_key
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
        
        # Generate message
        message = f"🔄 图片重新OCR识别 ({total_ocr_detected}个) | 使用缓存说明书 | 匹配: {total_matched}个 | 未匹配: {total_unmatched}个"
        
        return create_response(data={
            'drawings': processed_results,
            'reference_map': reference_map,
            'matched_count': total_matched,
            'ocr_detected_count': total_ocr_detected,
            'unmatched_count': total_unmatched,
            'match_rate': (total_matched / len(reference_map) * 100) if len(reference_map) > 0 else 0,
            'message': message,
            'reprocess_mode': 'drawings_only',
            'cache_used': True
        })
    
    except Exception as e:
        print(f"Error in reprocess_drawings: {traceback.format_exc()}")
        return create_response(
            error=f"处理失败: {str(e)}",
            status_code=500
        )
