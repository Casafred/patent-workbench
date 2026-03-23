"""
OCR Concurrent Processing Module

Provides concurrent OCR processing with configurable concurrency limits for different OCR engines.
"""

import base64
import hashlib
import traceback
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Semaphore
from typing import List, Dict, Tuple, Optional
import logging

logger = logging.getLogger(__name__)

OCR_CONCURRENCY_LIMITS = {
    'rapidocr': 5,
    'glm_ocr': 2,
    'paddle_ocr': 3
}

OCR_DISPLAY_NAMES = {
    'rapidocr': '内置OCR引擎',
    'glm_ocr': 'GLM OCR API',
    'paddle_ocr': 'PP-OCRv5 (百度)'
}

_ocr_semaphores = {}

def get_ocr_semaphore(ocr_mode: str) -> Semaphore:
    global _ocr_semaphores
    if ocr_mode not in _ocr_semaphores:
        limit = OCR_CONCURRENCY_LIMITS.get(ocr_mode, 3)
        _ocr_semaphores[ocr_mode] = Semaphore(limit)
        logger.info(f"Created semaphore for {ocr_mode} with limit {limit}")
    return _ocr_semaphores[ocr_mode]

def process_single_drawing(
    drawing: Dict,
    ocr_mode: str,
    cache_manager,
    force_refresh: bool,
    glm_api_key: str = None,
    paddle_token: str = None
) -> Dict:
    drawing_name = drawing.get('name', 'unknown')
    
    try:
        logger.info(f"[ConcurrentOCR] Processing: {drawing_name}")
        
        image_data = base64.b64decode(drawing['data'])
        image_hash = hashlib.md5(image_data).hexdigest()
        cache_key = f"{ocr_mode}_{drawing_name}_{image_hash}"
        
        cached_result = None
        if not force_refresh:
            cached_result = cache_manager.get_cache(cache_key)
        
        cache_info = {
            'has_cache': False,
            'cache_key': cache_key,
            'cached_at': None,
            'ocr_mode': ocr_mode
        }
        
        if cached_result and not force_refresh:
            logger.info(f"[ConcurrentOCR] Using cached result for {drawing_name}")
            all_detected_numbers = cached_result['ocr_results']
            cache_info['has_cache'] = True
            cache_info['cached_at'] = cached_result.get('timestamp')
            cache_info['ocr_mode'] = cached_result.get('ocr_mode', 'rapidocr')
        else:
            semaphore = get_ocr_semaphore(ocr_mode)
            
            with semaphore:
                logger.info(f"[ConcurrentOCR] Acquired semaphore for {drawing_name}, starting OCR...")
                
                if ocr_mode == 'glm_ocr':
                    from backend.utils.glm_ocr_utils import perform_glm_ocr
                    from backend.utils.ocr_utils import perform_ocr
                    try:
                        all_detected_numbers = perform_glm_ocr(
                            image_data,
                            glm_api_key,
                            ocr_type="handwriting",
                            language_type="CHN_ENG"
                        )
                        logger.info(f"[ConcurrentOCR] GLM OCR detected {len(all_detected_numbers)} items for {drawing_name}")
                    except Exception as e:
                        logger.warning(f"[ConcurrentOCR] GLM OCR failed for {drawing_name}, falling back: {str(e)}")
                        all_detected_numbers = perform_ocr(image_data)
                        
                elif ocr_mode == 'paddle_ocr':
                    from backend.utils.paddle_ocr_utils import perform_pp_ocr
                    from backend.utils.ocr_utils import perform_ocr
                    try:
                        all_detected_numbers = perform_pp_ocr(
                            image_data,
                            paddle_token
                        )
                        logger.info(f"[ConcurrentOCR] PP-OCR detected {len(all_detected_numbers)} items for {drawing_name}")
                    except Exception as e:
                        logger.warning(f"[ConcurrentOCR] PP-OCR failed for {drawing_name}, falling back: {str(e)}")
                        all_detected_numbers = perform_ocr(image_data)
                else:
                    from backend.utils.ocr_utils import perform_ocr
                    all_detected_numbers = perform_ocr(image_data)
                    logger.info(f"[ConcurrentOCR] Built-in OCR detected {len(all_detected_numbers)} items for {drawing_name}")
            
            cache_manager.set_cache(cache_key, {
                'drawing_name': drawing_name,
                'ocr_results': all_detected_numbers,
                'image_hash': image_hash,
                'ocr_mode': ocr_mode
            })
            logger.info(f"[ConcurrentOCR] Cached OCR results for {drawing_name}")
        
        raw_ocr_results = [
            {
                'number': d['number'],
                'x': d['x'],
                'y': d['y'],
                'confidence': d.get('confidence', 0)
            }
            for d in all_detected_numbers
        ]
        
        from backend.utils.ocr_utils import deduplicate_results, filter_by_confidence
        all_detected_numbers = deduplicate_results(all_detected_numbers, position_threshold=25)
        all_detected_numbers = filter_by_confidence(all_detected_numbers, min_confidence=80)
        
        logger.info(f"[ConcurrentOCR] After filtering: {len(all_detected_numbers)} detections for {drawing_name}")
        
        return {
            'name': drawing_name,
            'type': drawing.get('type', ''),
            'size': drawing.get('size', 0),
            'ocr_results': all_detected_numbers,
            'raw_ocr_results': raw_ocr_results,
            'cache_info': cache_info,
            'success': True
        }
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"[ConcurrentOCR] Error processing {drawing_name}: {traceback.format_exc()}")
        return {
            'name': drawing_name,
            'type': drawing.get('type', ''),
            'size': drawing.get('size', 0),
            'ocr_results': [],
            'raw_ocr_results': [],
            'error': error_msg,
            'success': False
        }

def process_drawings_concurrent(
    drawings: List[Dict],
    ocr_mode: str,
    cache_manager,
    force_refresh: bool = False,
    glm_api_key: str = None,
    paddle_token: str = None,
    max_workers: int = None
) -> Tuple[List[Dict], Dict[str, Dict], set]:
    if not drawings:
        return [], {}, set()
    
    if max_workers is None:
        max_workers = OCR_CONCURRENCY_LIMITS.get(ocr_mode, 3)
    
    logger.info(f"[ConcurrentOCR] Starting concurrent processing of {len(drawings)} drawings")
    logger.info(f"[ConcurrentOCR] OCR mode: {ocr_mode}, Max workers: {max_workers}")
    
    processed_results = []
    cache_info = {}
    all_ocr_markers = set()
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_drawing = {
            executor.submit(
                process_single_drawing,
                drawing,
                ocr_mode,
                cache_manager,
                force_refresh,
                glm_api_key,
                paddle_token
            ): drawing
            for drawing in drawings
        }
        
        for future in as_completed(future_to_drawing):
            drawing = future_to_drawing[future]
            drawing_name = drawing.get('name', 'unknown')
            
            try:
                result = future.result()
                
                if result.get('success', False):
                    cache_info[drawing_name] = result.get('cache_info', {})
                    
                    ocr_results = result.get('ocr_results', [])
                    for detection in ocr_results:
                        all_ocr_markers.add(detection['number'])
                else:
                    logger.warning(f"[ConcurrentOCR] Failed to process {drawing_name}: {result.get('error', 'Unknown error')}")
                
                processed_results.append({
                    'name': result['name'],
                    'type': result['type'],
                    'size': result['size'],
                    'ocr_results': result.get('ocr_results', []),
                    'raw_ocr_results': result.get('raw_ocr_results', [])
                })
                
                if not result.get('success', False):
                    processed_results[-1]['error'] = result.get('error', 'Unknown error')
                    
            except Exception as e:
                logger.error(f"[ConcurrentOCR] Exception getting result for {drawing_name}: {traceback.format_exc()}")
                processed_results.append({
                    'name': drawing_name,
                    'type': drawing.get('type', ''),
                    'size': drawing.get('size', 0),
                    'ocr_results': [],
                    'error': str(e)
                })
    
    logger.info(f"[ConcurrentOCR] Completed: {len(all_ocr_markers)} unique markers detected from {len(drawings)} drawings")
    
    return processed_results, cache_info, all_ocr_markers

def get_ocr_mode_display(ocr_mode: str) -> str:
    return OCR_DISPLAY_NAMES.get(ocr_mode, '内置OCR引擎')
