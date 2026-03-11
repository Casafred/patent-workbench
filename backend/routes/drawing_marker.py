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
from backend.services.llm.provider_factory import get_factory


drawing_marker_bp = Blueprint('drawing_marker', __name__)


def get_llm_provider(model_name: str, api_key: str):
    """
    Get LLM provider based on model name and API key.
    
    Args:
        model_name: Model ID (e.g., 'glm-4-flash', 'qwen-plus')
        api_key: API key for the provider
        
    Returns:
        tuple: (provider_instance, error_response)
    """
    if not api_key:
        return None, create_response(
            error="API Key is required for AI mode",
            status_code=401
        )
    
    factory = get_factory()
    provider_name = factory.get_provider_for_model(model_name)
    
    if not provider_name:
        return None, create_response(
            error=f"Unknown model: {model_name}",
            status_code=400
        )
    
    try:
        provider = factory.get_provider(provider_name, api_key)
        return provider, None
    except Exception as e:
        return None, create_response(
            error=f"Failed to initialize {provider_name} provider: {str(e)}",
            status_code=400
        )


def get_api_key_from_request(provider_hint: str = None):
    """
    Get API key from request headers.
    
    Args:
        provider_hint: Optional provider hint ('zhipu' or 'aliyun')
        
    Returns:
        str: API key or None
    """
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        return auth_header.split(' ')[1]
    return None


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
        paddle_token = None
        
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
        
        if ocr_mode == 'paddle_ocr':
            paddle_token = req_data.get('paddle_token') or request.headers.get('X-Paddle-Token')
            if not paddle_token:
                return create_response(
                    error="PP-OCRv5 mode requires token (paddle_token in body or X-Paddle-Token header)",
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
                    elif ocr_mode == 'paddle_ocr':
                        from backend.utils.paddle_ocr_utils import perform_pp_ocr
                        try:
                            all_detected_numbers = perform_pp_ocr(
                                image_data,
                                paddle_token
                            )
                            print(f"[DEBUG] PP-OCRv5 detected {len(all_detected_numbers)} items")
                        except Exception as e:
                            print(f"[WARN] PP-OCRv5 failed, falling back to RapidOCR: {str(e)}")
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

                # 应用去重和置信度过滤（提高阈值以过滤低置信度结果）
                all_detected_numbers = deduplicate_results(all_detected_numbers, position_threshold=25)
                all_detected_numbers = filter_by_confidence(all_detected_numbers, min_confidence=80)
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

            # Get API key from request
            api_key = get_api_key_from_request()
            if not api_key:
                return create_response(
                    error="API Key is required for AI mode. Please provide Authorization header with Bearer token.",
                    status_code=401
                )

            # Get LLM provider based on model name
            provider, error = get_llm_provider(model_name, api_key)
            if error:
                return error

            # 🔧 关键优化：先根据OCR标记提取相关段落，避免处理过长说明书导致超时
            from backend.utils.text_segment_extractor import extract_relevant_segments
            
            # 只有当OCR识别到标记时才进行预处理
            extraction_result = None
            if all_ocr_markers:
                extraction_result = extract_relevant_segments(
                    specification,
                    all_ocr_markers,
                    context_sentences=1,
                    max_total_length=8000
                )
                
                specification_to_process = extraction_result['extracted_text']
                print(f"[DEBUG] 说明书预处理: {extraction_result['original_length']} -> {extraction_result['extracted_length']} 字符")
                print(f"[DEBUG] 找到的标记: {extraction_result['found_markers']}, 未找到: {extraction_result['not_found_markers']}")
                print(f"[DEBUG] 提取了 {extraction_result['segment_count']} 个相关段落")
            else:
                # OCR未识别到任何标记，使用完整说明书
                specification_to_process = specification
                print(f"[DEBUG] OCR未识别到标记，使用完整说明书: {len(specification)} 字符")

            # Import AI processor
            from backend.services.ai_description.ai_description_processor import AIDescriptionProcessor

            # Create processor instance (no longer needs api_key)
            processor = AIDescriptionProcessor()

            # 使用预处理后的精简文本，而非完整说明书
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                ai_result = loop.run_until_complete(
                    processor.process_with_provider(specification_to_process, model_name, provider, custom_prompt)
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
            
            # 规则模式下也需要提取句子映射（用于调试面板和未匹配标记显示原文）
            if all_ocr_markers:
                extraction_result = extract_relevant_segments(
                    specification,
                    all_ocr_markers,
                    context_sentences=1,
                    max_total_length=8000
                )
                print(f"[DEBUG] 规则模式说明书预处理: {extraction_result['original_length']} -> {extraction_result['extracted_length']} 字符")
                print(f"[DEBUG] 规则模式找到的标记: {extraction_result['found_markers']}, 未找到: {extraction_result['not_found_markers']}")
            else:
                extraction_result = None
                print(f"[DEBUG] 规则模式: OCR未识别到标记，跳过句子提取")

        # 🚀 STEP 3: 应用智能分割并匹配OCR结果
        print(f"[DEBUG] Step 3: Applying smart split and matching OCR results...")
        
        from backend.utils.smart_split_utils import smart_split_ocr_results
        
        spec_markers = list(reference_map.keys())
        
        # 构建标记-句子映射（用于未匹配标记显示原文）
        marker_sentences_map = {}
        if extraction_result and extraction_result.get('marker_sentences'):
            for ms in extraction_result['marker_sentences']:
                marker = ms['marker']
                sentence = ms['sentence']
                if marker not in marker_sentences_map:
                    marker_sentences_map[marker] = sentence
            print(f"[DEBUG] 构建了 {len(marker_sentences_map)} 个标记-句子映射")
            print(f"[DEBUG] marker_sentences_map 内容示例: {list(marker_sentences_map.items())[:5]}")
        else:
            print(f"[DEBUG] extraction_result 为空或没有 marker_sentences")
            print(f"[DEBUG] extraction_result: {extraction_result}")

        for drawing_result in processed_results:
            if 'error' in drawing_result:
                continue

            try:
                ocr_results = drawing_result.pop('ocr_results', [])
                raw_ocr_results = drawing_result.pop('raw_ocr_results', [])
                
                if ocr_mode in ['glm_ocr', 'paddle_ocr']:
                    ocr_results = smart_split_ocr_results(ocr_results, spec_markers, enable_split=True)
                    print(f"[DEBUG] After smart split: {len(ocr_results)} markers")

                detected_numbers, unknown, missing = match_with_reference_map(
                    ocr_results,
                    reference_map
                )

                total_numbers += len(detected_numbers)
                print(f"[DEBUG] Drawing {drawing_result['name']}: Matched {len(detected_numbers)} numbers")

                # 🔥 关键优化：即使没有匹配，也要保留OCR识别结果
                # 将未匹配的OCR结果也添加到detected_numbers中
                unmatched_ocr = []
                for ocr_item in ocr_results:
                    if ocr_item['number'] not in reference_map:
                        # 获取原文句子
                        original_sentence = marker_sentences_map.get(ocr_item['number'], '')
                        unmatched_ocr.append({
                            **ocr_item,
                            'name': '',  # 未匹配标记不显示名称
                            'is_matched': False,
                            'original_sentence': original_sentence
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
        
        ocr_mode_display = {
            'rapidocr': 'RapidOCR (内置)',
            'glm_ocr': 'GLM OCR API',
            'paddle_ocr': 'PP-OCRv5 (百度)'
        }.get(ocr_mode, 'RapidOCR (内置)')
        
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
            'marker_sentences_map': marker_sentences_map,
            'debug_info': {
                'total_markers_in_spec': len(reference_map),
                'reference_map': reference_map,
                'extraction_method': 'AI智能抽取' if ai_mode else 'jieba分词',
                'ocr_mode': ocr_mode,
                'has_ocr_results': total_ocr_detected > 0,
                'has_matched_results': total_matched > 0,
                'marker_sentences_count': len(marker_sentences_map)
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

            # Get API key from request
            api_key = get_api_key_from_request()
            if not api_key:
                return create_response(
                    error="API Key is required for AI mode. Please provide Authorization header with Bearer token.",
                    status_code=401
                )
            
            # Get LLM provider based on model name
            provider, error = get_llm_provider(model_name, api_key)
            if error:
                return error

            # Import AI processor
            from backend.services.ai_description.ai_description_processor import AIDescriptionProcessor

            # Create processor instance (no longer needs api_key)
            processor = AIDescriptionProcessor()

            # Process description using AI, passing provider directly
            # Run async function in sync context
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                result = loop.run_until_complete(
                    processor.process_with_provider(description_text, model_name, provider, custom_prompt)
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
            
            # Get API key from request
            api_key = get_api_key_from_request()
            if not api_key:
                return create_response(
                    error="API Key is required for AI mode. Please provide Authorization header with Bearer token.",
                    status_code=401
                )
            
            # Get LLM provider based on model name
            provider, error = get_llm_provider(model_name, api_key)
            if error:
                return error
            
            from backend.services.ai_description.ai_description_processor import AIDescriptionProcessor
            processor = AIDescriptionProcessor()
            
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                ai_result = loop.run_until_complete(
                    processor.process_with_provider(specification, model_name, provider, custom_prompt)
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
                all_detected_numbers = filter_by_confidence(all_detected_numbers, min_confidence=80)
                
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


@drawing_marker_bp.route('/drawing-marker/process-staged', methods=['POST'])
def process_drawing_marker_staged():
    """
    Process patent drawings in stages with real-time status feedback.
    
    This endpoint processes drawings in three stages:
    1. OCR recognition - detect reference numbers in images
    2. Text extraction - extract relevant segments from specification
    3. AI processing - match numbers with component names
    
    Request body:
    {
        "drawings": [...],
        "specification": "...",
        "ai_mode": true/false,
        "model_name": "...",
        "custom_prompt": "...",
        "ocr_mode": "rapidocr"/"glm_ocr"/"paddle_ocr",
        "paddle_token": "...",
        "stage": "ocr"/"extract"/"ai"/"all"
    }
    
    Response varies by stage:
    - Stage "ocr": Returns OCR results with detected numbers
    - Stage "extract": Returns extracted text segments
    - Stage "ai": Returns final matched results
    - Stage "all": Returns complete results (backward compatible)
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
        paddle_token = req_data.get('paddle_token') or request.headers.get('X-Paddle-Token')
        stage = req_data.get('stage', 'all')
        ocr_results_from_client = req_data.get('ocr_results')
        ocr_drawings_from_client = req_data.get('ocr_drawings')
        extracted_text_from_client = req_data.get('extracted_text')
        
        if not drawings or not isinstance(drawings, list) or len(drawings) == 0:
            return create_response(error="drawings is required and must be a non-empty list", status_code=400)
        
        if not specification or not isinstance(specification, str) or specification.strip() == '':
            return create_response(error="specification is required and must be a non-empty string", status_code=400)
        
        import base64
        import hashlib
        from backend.utils.ocr_utils import perform_ocr, deduplicate_results, filter_by_confidence, match_with_reference_map, calculate_statistics
        from backend.utils.drawing_cache import DrawingCacheManager
        from backend.utils.text_segment_extractor import extract_relevant_segments
        from backend.utils.component_extractor import extract_reference_markers
        
        cache_manager = DrawingCacheManager()
        
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
        
        if ocr_mode == 'paddle_ocr' and not paddle_token:
            return create_response(
                error="PP-OCRv5 mode requires token",
                status_code=401
            )
        
        all_ocr_markers = set()
        processed_results = []
        cache_info = {}
        
        print(f"[STAGED] Stage: {stage}, Processing {len(drawings)} drawings...")
        
        if stage in ['ocr', 'all'] and not ocr_results_from_client:
            print(f"[STAGED] Step 1: OCR recognition (mode: {ocr_mode})...")
            
            for drawing in drawings:
                try:
                    image_data = base64.b64decode(drawing['data'])
                    image_hash = hashlib.md5(image_data).hexdigest()
                    cache_key = f"{ocr_mode}_{drawing['name']}_{image_hash}"
                    
                    cached_result = None
                    if not force_refresh:
                        cached_result = cache_manager.get_cache(cache_key)
                    
                    if cached_result and not force_refresh:
                        all_detected_numbers = cached_result['ocr_results']
                        cache_info[drawing['name']] = {'has_cache': True, 'cache_key': cache_key}
                    else:
                        if ocr_mode == 'glm_ocr':
                            from backend.utils.glm_ocr_utils import perform_glm_ocr
                            try:
                                all_detected_numbers = perform_glm_ocr(image_data, glm_api_key, ocr_type="handwriting", language_type="CHN_ENG")
                            except Exception as e:
                                print(f"[WARN] GLM OCR failed, falling back: {str(e)}")
                                all_detected_numbers = perform_ocr(image_data)
                        elif ocr_mode == 'paddle_ocr':
                            from backend.utils.paddle_ocr_utils import perform_pp_ocr
                            try:
                                all_detected_numbers = perform_pp_ocr(image_data, paddle_token)
                            except Exception as e:
                                print(f"[WARN] PP-OCRv5 failed, falling back: {str(e)}")
                                all_detected_numbers = perform_ocr(image_data)
                        else:
                            all_detected_numbers = perform_ocr(image_data)
                        
                        cache_manager.set_cache(cache_key, {
                            'drawing_name': drawing['name'],
                            'ocr_results': all_detected_numbers,
                            'image_hash': image_hash,
                            'ocr_mode': ocr_mode
                        })
                        cache_info[drawing['name']] = {'has_cache': False, 'cache_key': cache_key}
                    
                    all_detected_numbers = deduplicate_results(all_detected_numbers, position_threshold=25)
                    all_detected_numbers = filter_by_confidence(all_detected_numbers, min_confidence=80)
                    
                    for detection in all_detected_numbers:
                        all_ocr_markers.add(detection['number'])
                    
                    processed_results.append({
                        'name': drawing['name'],
                        'type': drawing['type'],
                        'size': drawing['size'],
                        'ocr_results': all_detected_numbers
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
            
            print(f"[STAGED] OCR complete: {len(all_ocr_markers)} unique markers detected: {all_ocr_markers}")
            
            if stage == 'ocr':
                return create_response(data={
                    'stage': 'ocr',
                    'ocr_markers': list(all_ocr_markers),
                    'drawings': processed_results,
                    'cache_info': cache_info,
                    'message': f"OCR识别完成，共识别出 {len(all_ocr_markers)} 个序号"
                })
        
        elif stage in ['extract', 'ai'] and ocr_results_from_client:
            all_ocr_markers = set(ocr_results_from_client)
            print(f"[STAGED] Using client-provided OCR markers: {all_ocr_markers}")
        
        if stage in ['extract', 'all']:
            print(f"[STAGED] Step 2: Extracting relevant text segments...")
            
            extraction_result = extract_relevant_segments(
                specification=specification,
                ocr_markers=all_ocr_markers,
                context_sentences=1,
                max_total_length=8000
            )
            
            extracted_text = extraction_result['extracted_text']
            found_markers = extraction_result['found_markers']
            not_found_markers = extraction_result['not_found_markers']
            
            print(f"[STAGED] Extraction complete: {extraction_result['original_length']} -> {extraction_result['extracted_length']} chars")
            print(f"[STAGED] Found markers: {found_markers}, Not found: {not_found_markers}")
            
            if stage == 'extract':
                return create_response(data={
                    'stage': 'extract',
                    'ocr_markers': list(all_ocr_markers),
                    'found_markers': list(found_markers),
                    'not_found_markers': list(not_found_markers),
                    'extracted_text': extracted_text,
                    'original_length': extraction_result['original_length'],
                    'extracted_length': extraction_result['extracted_length'],
                    'segment_count': extraction_result['segment_count'],
                    'message': f"文本提取完成，从 {extraction_result['original_length']} 字符缩减到 {extraction_result['extracted_length']} 字符"
                })
        
        if stage in ['ai', 'all']:
            print(f"[STAGED] Step 3: AI processing...")
            
            if stage == 'ai' and not processed_results:
                print(f"[STAGED] Stage 'ai': Using OCR results from client...")
                
                if ocr_drawings_from_client:
                    for drawing_data in ocr_drawings_from_client:
                        ocr_results = drawing_data.get('ocr_results', [])
                        for detection in ocr_results:
                            all_ocr_markers.add(detection['number'])
                        
                        processed_results.append({
                            'name': drawing_data['name'],
                            'type': drawing_data.get('type', ''),
                            'size': drawing_data.get('size', 0),
                            'ocr_results': ocr_results
                        })
                    print(f"[STAGED] Loaded {len(processed_results)} drawings from client OCR results")
                else:
                    print(f"[STAGED] No OCR drawings from client, trying cache...")
                    for drawing in drawings:
                        try:
                            image_data = base64.b64decode(drawing['data'])
                            image_hash = hashlib.md5(image_data).hexdigest()
                            cache_key = f"{ocr_mode}_{drawing['name']}_{image_hash}"
                            
                            cached_result = cache_manager.get_cache(cache_key)
                            if cached_result:
                                all_detected_numbers = cached_result['ocr_results']
                                all_detected_numbers = deduplicate_results(all_detected_numbers, position_threshold=25)
                                all_detected_numbers = filter_by_confidence(all_detected_numbers, min_confidence=80)
                                
                                for detection in all_detected_numbers:
                                    all_ocr_markers.add(detection['number'])
                                
                                processed_results.append({
                                    'name': drawing['name'],
                                    'type': drawing['type'],
                                    'size': drawing['size'],
                                    'ocr_results': all_detected_numbers
                                })
                                cache_info[drawing['name']] = {'has_cache': True, 'cache_key': cache_key}
                        except Exception as e:
                            print(f"Error loading cached OCR for {drawing['name']}: {str(e)}")
                            processed_results.append({
                                'name': drawing['name'],
                                'type': drawing['type'],
                                'size': drawing['size'],
                                'ocr_results': [],
                                'error': str(e)
                            })
                
                if not all_ocr_markers and ocr_results_from_client:
                    all_ocr_markers = set(ocr_results_from_client)
                
                print(f"[STAGED] Total OCR markers: {len(all_ocr_markers)}, processed_results: {len(processed_results)}")
            
            if ai_mode:
                if not model_name:
                    return create_response(error="model_name is required when ai_mode is true", status_code=400)
                
                # Get API key from request
                api_key = get_api_key_from_request()
                if not api_key:
                    return create_response(
                        error="API Key is required for AI mode. Please provide Authorization header with Bearer token.",
                        status_code=401
                    )
                
                # Get LLM provider based on model name
                provider, error = get_llm_provider(model_name, api_key)
                if error:
                    return error
                
                from backend.services.ai_description.ai_description_processor import AIDescriptionProcessor
                processor = AIDescriptionProcessor()
                
                # 优先使用前端传来的提取文本，其次使用本阶段提取的，最后重新提取
                text_to_process = specification
                if extracted_text_from_client:
                    text_to_process = extracted_text_from_client
                    print(f"[STAGED] Using extracted_text from client: {len(text_to_process)} chars")
                elif 'extracted_text' in locals():
                    text_to_process = extracted_text
                    print(f"[STAGED] Using extracted_text from extract stage: {len(text_to_process)} chars")
                elif stage == 'ai':
                    extraction_result = extract_relevant_segments(specification, all_ocr_markers, 1, 8000)
                    text_to_process = extraction_result['extracted_text']
                    print(f"[STAGED] Re-extracted text: {len(text_to_process)} chars")
                
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    ai_result = loop.run_until_complete(
                        processor.process_with_provider(text_to_process, model_name, provider, custom_prompt)
                    )
                finally:
                    loop.close()
                
                if not ai_result.get('success'):
                    return create_response(error=ai_result.get('error', 'AI processing failed'), status_code=500)
                
                components = ai_result['data'].get('components', [])
                reference_map = {comp['marker']: comp['name'] for comp in components}
                print(f"[STAGED] AI extracted reference_map: {reference_map}")
            else:
                reference_map = extract_reference_markers(specification)
                print(f"[STAGED] Rule-based extracted reference_map: {reference_map}")
                
                # 规则模式下也需要提取句子映射（用于调试面板和未匹配标记显示原文）
                if all_ocr_markers:
                    extraction_result = extract_relevant_segments(specification, all_ocr_markers, 1, 8000)
                    print(f"[STAGED] 规则模式说明书预处理: {extraction_result['original_length']} -> {extraction_result['extracted_length']} 字符")
                else:
                    extraction_result = None
                    print(f"[STAGED] 规则模式: OCR未识别到标记，跳过句子提取")
            
            from backend.utils.smart_split_utils import smart_split_ocr_results
            spec_markers = list(reference_map.keys())
            
            print(f"[STAGED] spec_markers from reference_map: {spec_markers[:20]}..." if len(spec_markers) > 20 else f"[STAGED] spec_markers: {spec_markers}")
            print(f"[STAGED] processed_results count: {len(processed_results)}")
            
            # 获取原始句子映射（用于未匹配标记）
            marker_sentences_map = {}
            if 'extraction_result' in locals() and extraction_result.get('marker_sentences'):
                for ms in extraction_result['marker_sentences']:
                    marker = ms['marker']
                    sentence = ms['sentence']
                    if marker not in marker_sentences_map:
                        marker_sentences_map[marker] = sentence
            
            total_numbers = 0
            for drawing_result in processed_results:
                if 'error' in drawing_result:
                    print(f"[STAGED] Skipping drawing with error: {drawing_result['name']}")
                    continue
                
                ocr_results = drawing_result.pop('ocr_results', [])
                print(f"[STAGED] Drawing {drawing_result['name']}: {len(ocr_results)} OCR results")
                
                if ocr_mode in ['glm_ocr', 'paddle_ocr']:
                    ocr_results = smart_split_ocr_results(ocr_results, spec_markers, enable_split=True)
                
                detected_numbers, unknown, missing = match_with_reference_map(ocr_results, reference_map)
                print(f"[STAGED] Matched {len(detected_numbers)} numbers for {drawing_result['name']}")
                total_numbers += len(detected_numbers)
                
                unmatched_ocr = []
                for ocr_item in ocr_results:
                    if ocr_item['number'] not in reference_map:
                        original_sentence = marker_sentences_map.get(ocr_item['number'], '')
                        unmatched_ocr.append({
                            **ocr_item, 
                            'name': '', 
                            'is_matched': False,
                            'original_sentence': original_sentence
                        })
                
                for item in detected_numbers:
                    item['is_matched'] = True
                
                all_detected = detected_numbers + unmatched_ocr
                
                drawing_result['detected_numbers'] = all_detected
                drawing_result['ocr_detected_count'] = len(ocr_results)
                drawing_result['matched_count'] = len(detected_numbers)
                drawing_result['unmatched_count'] = len(unmatched_ocr)
            
            all_detected_numbers = []
            for drawing_result in processed_results:
                all_detected_numbers.extend(drawing_result.get('detected_numbers', []))
            
            stats = calculate_statistics(
                matched_count=total_numbers,
                total_markers=len(reference_map),
                detected_numbers=all_detected_numbers
            )
            
            total_ocr_detected = sum(d.get('ocr_detected_count', 0) for d in processed_results)
            total_matched = sum(d.get('matched_count', 0) for d in processed_results)
            total_unmatched = sum(d.get('unmatched_count', 0) for d in processed_results)
            
            ocr_mode_display = {
                'rapidocr': 'RapidOCR (内置)',
                'glm_ocr': 'GLM OCR API',
                'paddle_ocr': 'PP-OCRv5 (百度)'
            }.get(ocr_mode, 'RapidOCR (内置)')
            
            if total_ocr_detected > 0:
                message = f"✅ [{ocr_mode_display}] 识别: {total_ocr_detected}个 | 匹配: {total_matched}个 | 未匹配: {total_unmatched}个"
            else:
                message = f"❌ [{ocr_mode_display}] 未识别到任何标记"
            
            print(f"[STAGED] Final results: total_ocr_detected={total_ocr_detected}, total_matched={total_matched}, total_unmatched={total_unmatched}")
            print(f"[STAGED] processed_results count: {len(processed_results)}")
            for i, dr in enumerate(processed_results):
                print(f"[STAGED] Drawing {i}: {dr.get('name')} - detected_numbers: {len(dr.get('detected_numbers', []))}")
            
            return create_response(data={
                'stage': 'complete',
                'drawings': processed_results,
                'reference_map': reference_map,
                'total_numbers': total_numbers,
                'matched_count': total_matched,
                'ocr_detected_count': total_ocr_detected,
                'unmatched_count': total_unmatched,
                'match_rate': stats['match_rate'],
                'avg_confidence': stats['avg_confidence'],
                'message': message,
                'cache_info': cache_info,
                'ocr_mode': ocr_mode,
                'ocr_mode_display': ocr_mode_display,
                'extraction_info': {
                    'original_length': extraction_result.get('original_length', len(specification)),
                    'extracted_length': extraction_result.get('extracted_length', len(specification)),
                    'segment_count': extraction_result.get('segment_count', 0)
                } if 'extraction_result' in locals() else None
            })
    
    except Exception as e:
        print(f"Error in process_drawing_marker_staged: {traceback.format_exc()}")
        return create_response(error=f"处理失败: {str(e)}", status_code=500)


@drawing_marker_bp.route('/drawing-marker/proxy-image', methods=['POST'])
def proxy_image():
    """
    Proxy image from external URL to bypass CORS restrictions.
    
    Request body:
    {
        "url": "https://patentimages.storage.googleapis.com/..."
    }
    
    Response:
    {
        "success": true,
        "data": "base64encodeddata",
        "content_type": "image/png"
    }
    """
    try:
        import requests
        import base64
        
        req_data = request.get_json()
        image_url = req_data.get('url')
        
        if not image_url:
            return create_response(
                error="url is required",
                status_code=400
            )
        
        allowed_domains = [
            'patentimages.storage.googleapis.com',
            'patentimages.googleapis.com',
            'image-ppubs.uspto.gov',
            'patents.google.com'
        ]
        
        from urllib.parse import urlparse
        parsed_url = urlparse(image_url)
        is_allowed = any(domain in parsed_url.netloc for domain in allowed_domains)
        
        if not is_allowed:
            return create_response(
                error="URL domain not allowed",
                status_code=403
            )
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/*'
        }
        
        response = requests.get(image_url, headers=headers, timeout=30)
        
        if response.status_code != 200:
            return create_response(
                error=f"Failed to fetch image: HTTP {response.status_code}",
                status_code=response.status_code
            )
        
        content_type = response.headers.get('Content-Type', 'image/png')
        image_data = base64.b64encode(response.content).decode('utf-8')
        
        return create_response(data={
            'data': image_data,
            'content_type': content_type,
            'size': len(response.content)
        })
        
    except requests.exceptions.Timeout:
        return create_response(
            error="Request timeout",
            status_code=504
        )
    except requests.exceptions.RequestException as e:
        return create_response(
            error=f"Request failed: {str(e)}",
            status_code=502
        )
    except Exception as e:
        print(f"Error in proxy_image: {traceback.format_exc()}")
        return create_response(
            error=f"Proxy failed: {str(e)}",
            status_code=500
        )
