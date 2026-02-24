"""
GLM OCR utility functions for patent drawing marker recognition.

This module provides GLM OCR API integration as an alternative to RapidOCR:
- GLM Handwriting OCR API for text detection with coordinates
- Response format transformation to match RapidOCR format
- Error handling and timeout management
"""

import base64
import logging
import re
import requests
from io import BytesIO
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

GLM_HANDWRITING_OCR_URL = "https://open.bigmodel.cn/api/paas/v4/files/ocr"
GLM_LAYOUT_PARSING_URL = "https://open.bigmodel.cn/api/paas/v4/layout_parsing"

DEFAULT_TIMEOUT = 60


def call_glm_handwriting_ocr(
    image_data: bytes,
    api_key: str,
    language_type: str = "CHN_ENG",
    timeout: int = DEFAULT_TIMEOUT
) -> List[Dict]:
    """
    Call GLM Handwriting OCR API to detect text in patent drawings.
    
    This API returns pixel coordinates, suitable for drawing marker detection.
    
    Args:
        image_data: Raw image bytes (PNG, JPEG, etc.)
        api_key: ZhipuAI API key
        language_type: OCR language type (default: CHN_ENG)
        timeout: Request timeout in seconds
        
    Returns:
        List[Dict]: Detected text regions with format:
            [
                {
                    'number': str,        # Recognized text
                    'x': int,             # Center X coordinate
                    'y': int,             # Center Y coordinate
                    'width': int,         # Bounding box width
                    'height': int,        # Bounding box height
                    'confidence': float   # Confidence score (0-100)
                },
                ...
            ]
    
    Raises:
        RuntimeError: If API call fails
        ValueError: If image_data is invalid
    """
    if not image_data:
        raise ValueError("image_data cannot be empty")
    
    if not api_key:
        raise ValueError("api_key is required for GLM OCR")
    
    headers = {
        "Authorization": f"Bearer {api_key}"
    }
    
    files = {
        'file': ('image.png', BytesIO(image_data), 'image/png')
    }
    
    data = {
        'tool_type': 'hand_write',
        'language_type': language_type,
        'probability': 'true'
    }
    
    logger.info("Calling GLM Handwriting OCR API...")
    
    try:
        response = requests.post(
            GLM_HANDWRITING_OCR_URL,
            headers=headers,
            files=files,
            data=data,
            timeout=timeout
        )
        
        if response.status_code != 200:
            error_msg = f"GLM OCR API call failed: {response.status_code}"
            try:
                error_detail = response.json()
                error_msg = f"{error_msg} - {error_detail}"
            except:
                error_msg = f"{error_msg} - {response.text[:200]}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
        
        result = response.json()
        
        if result.get('status') != 'succeeded':
            raise RuntimeError(f"GLM OCR failed: {result.get('message', 'Unknown error')}")
        
        return _transform_handwriting_ocr_response(result)
        
    except requests.exceptions.Timeout:
        raise RuntimeError(f"GLM OCR API timeout after {timeout} seconds")
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"GLM OCR API request error: {str(e)}")


def call_glm_layout_parsing_ocr(
    image_data: bytes,
    api_key: str,
    timeout: int = DEFAULT_TIMEOUT
) -> List[Dict]:
    """
    Call GLM Layout Parsing OCR API.
    
    Note: This API is designed for document layout analysis, not for
    detecting small text markers in patent drawings. It may not return
    text coordinates for technical drawings.
    
    Args:
        image_data: Raw image bytes
        api_key: ZhipuAI API key
        timeout: Request timeout in seconds
        
    Returns:
        List[Dict]: Detected text regions (may be empty for drawings)
    """
    if not image_data:
        raise ValueError("image_data cannot be empty")
    
    if not api_key:
        raise ValueError("api_key is required for GLM OCR")
    
    image_base64 = base64.b64encode(image_data).decode('utf-8')
    image_data_url = f"data:image/png;base64,{image_base64}"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "glm-ocr",
        "file": image_data_url,
        "return_crop_images": False,
        "need_layout_visualization": False
    }
    
    logger.info("Calling GLM Layout Parsing OCR API...")
    
    try:
        response = requests.post(
            GLM_LAYOUT_PARSING_URL,
            headers=headers,
            json=payload,
            timeout=timeout
        )
        
        if response.status_code != 200:
            error_msg = f"GLM Layout Parsing API call failed: {response.status_code}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
        
        result = response.json()
        return _transform_layout_parsing_response(result)
        
    except requests.exceptions.Timeout:
        raise RuntimeError(f"GLM Layout Parsing API timeout after {timeout} seconds")
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"GLM Layout Parsing API request error: {str(e)}")


def _transform_handwriting_ocr_response(response: dict) -> List[Dict]:
    """
    Transform GLM Handwriting OCR response to unified format.
    
    Input format:
    {
        "words_result": [
            {
                "location": {"left": 100, "top": 200, "width": 50, "height": 30},
                "words": "文本内容",
                "probability": {"average": 0.95}
            }
        ]
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
    if not response or 'words_result' not in response:
        return []
    
    results = []
    
    for item in response.get('words_result', []):
        location = item.get('location', {})
        words = item.get('words', '')
        prob = item.get('probability', {})
        
        if not location or not words:
            continue
        
        left = location.get('left', 0)
        top = location.get('top', 0)
        width = location.get('width', 0)
        height = location.get('height', 0)
        
        center_x = left + width // 2
        center_y = top + height // 2
        confidence = prob.get('average', 1.0) * 100 if prob else 100
        
        results.append({
            'number': words.strip(),
            'x': center_x,
            'y': center_y,
            'width': width,
            'height': height,
            'confidence': round(confidence, 2)
        })
    
    logger.info(f"GLM Handwriting OCR detected {len(results)} text regions")
    return results


def _transform_layout_parsing_response(response: dict) -> List[Dict]:
    """
    Transform GLM Layout Parsing OCR response to unified format.
    
    Note: Layout Parsing API returns normalized coordinates (0-1).
    """
    if not response or 'layout_details' not in response:
        return []
    
    results = []
    
    for page_layout in response.get('layout_details', []):
        for item in page_layout:
            bbox = item.get('bbox_2d', [])
            content = item.get('content', '')
            page_width = item.get('width', 1)
            page_height = item.get('height', 1)
            label = item.get('label', '')
            
            if not bbox or not content or label != 'text':
                continue
            
            x1, y1, x2, y2 = bbox
            
            x1_px = int(x1 * page_width)
            y1_px = int(y1 * page_height)
            x2_px = int(x2 * page_width)
            y2_px = int(y2 * page_height)
            
            width = x2_px - x1_px
            height = y2_px - y1_px
            center_x = (x1_px + x2_px) // 2
            center_y = (y1_px + y2_px) // 2
            
            results.append({
                'number': content.strip(),
                'x': center_x,
                'y': center_y,
                'width': width,
                'height': height,
                'confidence': 100
            })
    
    logger.info(f"GLM Layout Parsing OCR detected {len(results)} text regions")
    return results


def perform_glm_ocr(
    image_data: bytes,
    api_key: str,
    ocr_type: str = "handwriting",
    language_type: str = "CHN_ENG",
    timeout: int = DEFAULT_TIMEOUT
) -> List[Dict]:
    """
    Perform OCR using GLM API.
    
    This is the main entry point for GLM OCR, providing a unified interface
    similar to perform_ocr() in ocr_utils.py.
    
    Args:
        image_data: Raw image bytes
        api_key: ZhipuAI API key
        ocr_type: "handwriting" (recommended) or "layout_parsing"
        language_type: OCR language type (default: CHN_ENG)
        timeout: Request timeout in seconds
        
    Returns:
        List[Dict]: Detected text regions in unified format
    """
    if ocr_type == "layout_parsing":
        return call_glm_layout_parsing_ocr(image_data, api_key, timeout)
    else:
        return call_glm_handwriting_ocr(image_data, api_key, language_type, timeout)


def split_merged_numbers(text: str, max_length: int = 4) -> List[str]:
    """
    Attempt to split merged numbers (e.g., "102300" -> ["102", "300"]).
    
    GLM Handwriting OCR sometimes merges adjacent numbers.
    This function attempts to split them based on common patent marker patterns.
    
    Args:
        text: Merged text string
        max_length: Maximum length for a single marker
        
    Returns:
        List of potential split markers
    """
    if len(text) <= max_length:
        return [text]
    
    results = []
    
    for i in range(1, len(text)):
        left = text[:i]
        right = text[i:]
        
        if len(left) <= max_length and len(right) <= max_length:
            if left and right:
                results.append(left)
                results.append(right)
                break
    
    if not results:
        results = [text]
    
    return results
