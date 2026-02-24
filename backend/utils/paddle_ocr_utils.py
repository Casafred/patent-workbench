"""
PP-OCRv5 API utility functions for patent drawing marker recognition.

This module provides Baidu PP-OCRv5 API integration as an alternative OCR engine:
- PP-OCRv5 OCR API for text detection with coordinates
- Response format transformation to match RapidOCR format
- Smart split integration for merged markers
"""

import base64
import logging
import requests
from io import BytesIO
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

PP_OCR_API_URL = "https://x9pal7t2e9t4lff3.aistudio-app.com/ocr"
DEFAULT_TIMEOUT = 120


def call_pp_ocrv5(
    image_data: bytes,
    token: str,
    api_url: str = None,
    timeout: int = DEFAULT_TIMEOUT,
    use_doc_orientation_classify: bool = True,
    use_textline_orientation: bool = True,
    text_det_limit_side_len: int = 64,
    text_det_thresh: float = 0.3,
    text_det_box_thresh: float = 0.2,
    text_det_unclip_ratio: float = 1.5,
) -> List[Dict]:
    """
    Call PP-OCRv5 API to detect text in patent drawings.
    
    Args:
        image_data: Raw image bytes (PNG, JPEG, etc.)
        token: Baidu AI Studio Token
        api_url: Custom API URL (optional)
        timeout: Request timeout in seconds
        use_doc_orientation_classify: Enable document orientation classification
        use_textline_orientation: Enable textline orientation classification
        text_det_limit_side_len: Minimum side length for text detection
        text_det_thresh: Text detection threshold
        text_det_box_thresh: Text detection box threshold
        text_det_unclip_ratio: Text detection unclip ratio
        
    Returns:
        List[Dict]: Detected text regions with format:
            [
                {
                    'number': str,
                    'x': int,
                    'y': int,
                    'width': int,
                    'height': int,
                    'confidence': float
                },
                ...
            ]
    
    Raises:
        RuntimeError: If API call fails
        ValueError: If parameters are invalid
    """
    if not image_data:
        raise ValueError("image_data cannot be empty")
    
    if not token:
        raise ValueError("token is required for PP-OCRv5")
    
    url = api_url or PP_OCR_API_URL
    
    image_base64 = base64.b64encode(image_data).decode('ascii')
    
    headers = {
        "Authorization": f"token {token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "file": image_base64,
        "fileType": 1,
        "useDocOrientationClassify": use_doc_orientation_classify,
        "useDocUnwarping": False,
        "useTextlineOrientation": use_textline_orientation,
        "textDetLimitType": "min",
        "textDetLimitSideLen": text_det_limit_side_len,
        "textDetThresh": text_det_thresh,
        "textDetBoxThresh": text_det_box_thresh,
        "textDetUnclipRatio": text_det_unclip_ratio,
        "textRecScoreThresh": 0,
    }
    
    logger.info("Calling PP-OCRv5 API...")
    
    try:
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=timeout
        )
        
        if response.status_code != 200:
            error_msg = f"PP-OCRv5 API call failed: {response.status_code}"
            try:
                error_detail = response.json()
                error_msg = f"{error_msg} - {error_detail}"
            except:
                error_msg = f"{error_msg} - {response.text[:200]}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
        
        result = response.json()
        
        if result.get('errorCode', 0) != 0:
            raise RuntimeError(f"PP-OCRv5 failed: {result.get('errorMsg', 'Unknown error')}")
        
        return _transform_pp_ocrv5_response(result)
        
    except requests.exceptions.Timeout:
        raise RuntimeError(f"PP-OCRv5 API timeout after {timeout} seconds")
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"PP-OCRv5 API request error: {str(e)}")


def _transform_pp_ocrv5_response(response: dict) -> List[Dict]:
    """
    Transform PP-OCRv5 response to unified format.
    
    PP-OCRv5 returns:
    {
        "result": {
            "ocrResults": [{
                "prunedResult": {
                    "dt_polys": [[[x1,y1], [x2,y2], [x3,y3], [x4,y4]], ...],
                    "rec_texts": ["text1", "text2", ...],
                    "rec_scores": [0.95, 0.98, ...]
                }
            }]
        }
    }
    
    Output format:
    [
        {
            'number': str,
            'x': int,
            'y': int,
            'width': int,
            'height': int,
            'confidence': float
        }
    ]
    """
    if not response or 'result' not in response:
        return []
    
    ocr_results = response.get('result', {}).get('ocrResults', [])
    
    if not ocr_results:
        logger.warning("No ocrResults found in PP-OCRv5 response")
        return []
    
    results = []
    
    for page_result in ocr_results:
        pruned_result = page_result.get('prunedResult', {})
        
        if not pruned_result:
            continue
        
        dt_polys = pruned_result.get('dt_polys', [])
        rec_texts = pruned_result.get('rec_texts', [])
        rec_scores = pruned_result.get('rec_scores', [])
        
        for i, (poly, text, score) in enumerate(zip(dt_polys, rec_texts, rec_scores)):
            if not text or not poly:
                continue
            
            if len(poly) >= 4:
                xs = [p[0] for p in poly]
                ys = [p[1] for p in poly]
                x_min, x_max = min(xs), max(xs)
                y_min, y_max = min(ys), max(ys)
                
                width = x_max - x_min
                height = y_max - y_min
                center_x = (x_min + x_max) // 2
                center_y = (y_min + y_max) // 2
                
                confidence = float(score) * 100 if score <= 1 else float(score)
                
                results.append({
                    'number': text.strip(),
                    'x': center_x,
                    'y': center_y,
                    'width': width,
                    'height': height,
                    'confidence': round(confidence, 2)
                })
    
    logger.info(f"PP-OCRv5 detected {len(results)} text regions")
    return results


def perform_pp_ocr(
    image_data: bytes,
    token: str,
    api_url: str = None,
    timeout: int = DEFAULT_TIMEOUT
) -> List[Dict]:
    """
    Perform OCR using PP-OCRv5 API.
    
    This is the main entry point for PP-OCRv5 OCR.
    
    Args:
        image_data: Raw image bytes
        token: Baidu AI Studio Token
        api_url: Custom API URL (optional)
        timeout: Request timeout in seconds
        
    Returns:
        List[Dict]: Detected text regions in unified format
    """
    return call_pp_ocrv5(
        image_data=image_data,
        token=token,
        api_url=api_url,
        timeout=timeout
    )
