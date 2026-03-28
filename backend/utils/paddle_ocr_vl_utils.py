"""
PaddleOCR-VL-1.5 API utility functions for document OCR and layout parsing.

This module provides Baidu PaddleOCR-VL-1.5 API integration for document OCR:
- Layout parsing with high accuracy (94.5% on OmniDocBench v1.5)
- Support for formula, table, and chart recognition
- Markdown output with images
- No user configuration required - uses pre-configured API

API Documentation: https://ai.baidu.com/ai-doc/AISTUDIO/Cmkz2m0ma
"""

import base64
import logging
import requests
from io import BytesIO
from typing import List, Dict, Optional, Tuple
import time

logger = logging.getLogger(__name__)

PADDLE_OCR_VL_API_URL = "https://k2neb1qcy1u6g4k5.aistudio-app.com/layout-parsing"
PADDLE_OCR_VL_TOKEN = "70b270c8275606a7a97f8c4e8617cdeb935ed74c"

DEFAULT_TIMEOUT = 180

OCR_ENGINE_INFO = {
    'id': 'paddle_ocr_vl',
    'name': 'PaddleOCR-VL-1.5',
    'provider': '百度AI Studio',
    'description': '百度飞桨文档OCR引擎，支持版面分析、公式表格识别',
    'features': {
        'layout_parsing': True,
        'formula_recognition': True,
        'table_recognition': True,
        'chart_recognition': True,
        'markdown_output': True,
        'multi_page': True
    }
}


def call_paddle_ocr_vl(
    image_data: bytes,
    api_url: str = None,
    token: str = None,
    timeout: int = DEFAULT_TIMEOUT,
    use_doc_orientation_classify: bool = True,
    use_doc_unwarping: bool = False,
    use_layout_detection: bool = True,
    use_chart_recognition: bool = False,
    layout_threshold: float = 0.5,
    prettify_markdown: bool = True,
    show_formula_number: bool = False,
    visualize: bool = False
) -> Dict:
    """
    Call PaddleOCR-VL-1.5 API for document layout parsing.
    
    Args:
        image_data: Raw image bytes (PNG, JPEG, etc.)
        api_url: Custom API URL (optional, uses default if not provided)
        token: API token (optional, uses pre-configured if not provided)
        timeout: Request timeout in seconds
        use_doc_orientation_classify: Enable document orientation classification (0°, 90°, 180°, 270°)
        use_doc_unwarping: Enable document unwarping for distorted images
        use_layout_detection: Enable layout region detection and sorting
        use_chart_recognition: Enable chart parsing (bar charts, pie charts, etc.)
        layout_threshold: Layout detection score threshold (0-1)
        prettify_markdown: Output beautified Markdown
        show_formula_number: Include formula numbers in output
        visualize: Return visualization images
        
    Returns:
        Dict: Parsed document result with format:
            {
                'pages': [
                    {
                        'pageIndex': int,
                        'width': int,
                        'height': int,
                        'blocks': [...],
                        'markdown': str
                    }
                ],
                'markdown': str,
                'images': dict,
                'engine': 'paddle_ocr_vl'
            }
    
    Raises:
        RuntimeError: If API call fails
        ValueError: If image_data is invalid
    """
    if not image_data:
        raise ValueError("image_data cannot be empty")
    
    url = api_url or PADDLE_OCR_VL_API_URL
    auth_token = token or PADDLE_OCR_VL_TOKEN
    
    image_base64 = base64.b64encode(image_data).decode('ascii')
    
    headers = {
        "Authorization": f"token {auth_token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "file": image_base64,
        "fileType": 1,
        "useDocOrientationClassify": use_doc_orientation_classify,
        "useDocUnwarping": use_doc_unwarping,
        "useLayoutDetection": use_layout_detection,
        "useChartRecognition": use_chart_recognition,
        "layoutThreshold": layout_threshold,
        "prettifyMarkdown": prettify_markdown,
        "showFormulaNumber": show_formula_number,
        "visualize": visualize
    }
    
    logger.info("Calling PaddleOCR-VL-1.5 API...")
    start_time = time.time()
    
    try:
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=timeout
        )
        
        elapsed_time = time.time() - start_time
        logger.info(f"PaddleOCR-VL-1.5 API response time: {elapsed_time:.2f}s")
        
        if response.status_code != 200:
            error_msg = f"PaddleOCR-VL-1.5 API call failed: {response.status_code}"
            try:
                error_detail = response.json()
                error_msg = f"{error_msg} - {error_detail}"
            except:
                error_msg = f"{error_msg} - {response.text[:200]}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
        
        result = response.json()
        
        if result.get('errorCode', 0) != 0:
            raise RuntimeError(f"PaddleOCR-VL-1.5 failed: {result.get('errorMsg', 'Unknown error')}")
        
        return _transform_paddle_ocr_vl_response(result)
        
    except requests.exceptions.Timeout:
        raise RuntimeError(f"PaddleOCR-VL-1.5 API timeout after {timeout} seconds")
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"PaddleOCR-VL-1.5 API request error: {str(e)}")


def _transform_paddle_ocr_vl_response(response: dict) -> Dict:
    """
    Transform PaddleOCR-VL-1.5 response to unified format compatible with GLM OCR.
    
    PaddleOCR-VL-1.5 returns:
    {
        "logId": "uuid",
        "errorCode": 0,
        "errorMsg": "Success",
        "result": {
            "layoutParsingResults": [
                {
                    "prunedResult": {...},
                    "markdown": {
                        "text": "markdown content",
                        "images": {"path": "base64_image"}
                    },
                    "outputImages": {...},
                    "inputImage": "base64"
                }
            ],
            "dataInfo": {...}
        }
    }
    
    Output format (compatible with GLM OCR):
    {
        'pages': [
            {
                'pageIndex': int,
                'width': int,
                'height': int,
                'blocks': [...],
                'markdown': str
            }
        ],
        'markdown': str,
        'images': dict,
        'engine': 'paddle_ocr_vl',
        'md_results': str
    }
    """
    if not response or 'result' not in response:
        return {
            'pages': [],
            'markdown': '',
            'images': {},
            'engine': 'paddle_ocr_vl',
            'md_results': ''
        }
    
    result = response.get('result', {})
    layout_results = result.get('layoutParsingResults', [])
    
    if not layout_results:
        logger.warning("No layoutParsingResults found in PaddleOCR-VL response")
        return {
            'pages': [],
            'markdown': '',
            'images': {},
            'engine': 'paddle_ocr_vl',
            'md_results': ''
        }
    
    pages = []
    all_markdown = []
    all_images = {}
    
    for i, page_result in enumerate(layout_results):
        markdown_data = page_result.get('markdown', {})
        markdown_text = markdown_data.get('text', '')
        markdown_images = markdown_data.get('images', {})
        
        pruned_result = page_result.get('prunedResult', {})
        
        blocks = _extract_blocks_from_pruned_result(pruned_result, i + 1)
        
        page_info = result.get('dataInfo', {}).get('pages', [{}])[i] if i < len(result.get('dataInfo', {}).get('pages', [{}])) else {}
        
        page = {
            'pageIndex': i + 1,
            'width': page_info.get('width', 1224),
            'height': page_info.get('height', 1584),
            'blocks': blocks,
            'markdown': markdown_text
        }
        
        pages.append(page)
        all_markdown.append(markdown_text)
        
        for img_path, img_data in markdown_images.items():
            all_images[img_path] = img_data
    
    combined_markdown = '\n\n---\n\n'.join(all_markdown)
    
    return {
        'pages': pages,
        'markdown': combined_markdown,
        'images': all_images,
        'engine': 'paddle_ocr_vl',
        'md_results': combined_markdown,
        'layout_details': [[{
            'label': block.get('type', 'text'),
            'content': block.get('text', ''),
            'bbox_2d': [
                block.get('bbox', {}).get('lt', [0, 0])[0],
                block.get('bbox', {}).get('lt', [0, 0])[1],
                block.get('bbox', {}).get('rb', [1, 1])[0],
                block.get('bbox', {}).get('rb', [1, 1])[1]
            ],
            'width': page.get('width', 1224),
            'height': page.get('height', 1584)
        } for block in page.get('blocks', [])] for page in pages],
        'data_info': result.get('dataInfo', {}),
        'request_id': response.get('logId', ''),
        'created': int(time.time()),
        'model': 'PaddleOCR-VL-1.5'
    }


def _extract_blocks_from_pruned_result(pruned_result: dict, page_index: int) -> List[Dict]:
    """
    Extract blocks from pruned result.
    
    The pruned result contains various detected regions with their content.
    """
    blocks = []
    
    if not pruned_result:
        return blocks
    
    text_regions = pruned_result.get('text_regions', [])
    tables = pruned_result.get('tables', [])
    formulas = pruned_result.get('formulas', [])
    
    for i, region in enumerate(text_regions):
        bbox = region.get('bbox', [0, 0, 100, 100])
        text = region.get('text', '')
        confidence = region.get('score', 1.0)
        
        if len(bbox) >= 4:
            blocks.append({
                'index': i,
                'type': 'text',
                'text': text,
                'content': text,
                'bbox': {
                    'lt': [bbox[0], bbox[1]],
                    'rb': [bbox[2], bbox[3]]
                },
                'confidence': confidence,
                'pageIndex': page_index
            })
    
    for i, table in enumerate(tables):
        bbox = table.get('bbox', [0, 0, 100, 100])
        html = table.get('html', '')
        markdown = table.get('markdown', '')
        
        if len(bbox) >= 4:
            blocks.append({
                'index': len(blocks),
                'type': 'table',
                'text': markdown or html,
                'content': markdown or html,
                'html': html,
                'markdown': markdown,
                'bbox': {
                    'lt': [bbox[0], bbox[1]],
                    'rb': [bbox[2], bbox[3]]
                },
                'pageIndex': page_index
            })
    
    for i, formula in enumerate(formulas):
        bbox = formula.get('bbox', [0, 0, 100, 100])
        latex = formula.get('latex', '')
        text = formula.get('text', '')
        
        if len(bbox) >= 4:
            blocks.append({
                'index': len(blocks),
                'type': 'formula',
                'text': text,
                'content': text,
                'latex': latex,
                'bbox': {
                    'lt': [bbox[0], bbox[1]],
                    'rb': [bbox[2], bbox[3]]
                },
                'pageIndex': page_index
            })
    
    return blocks


def perform_paddle_ocr_vl(
    image_data: bytes,
    api_url: str = None,
    token: str = None,
    timeout: int = DEFAULT_TIMEOUT,
    options: dict = None
) -> Dict:
    """
    Perform document OCR using PaddleOCR-VL-1.5 API.
    
    This is the main entry point for PaddleOCR-VL OCR.
    
    Args:
        image_data: Raw image bytes
        api_url: Custom API URL (optional)
        token: API token (optional)
        timeout: Request timeout in seconds
        options: Additional options dict with keys:
            - use_doc_orientation_classify: bool
            - use_doc_unwarping: bool
            - use_layout_detection: bool
            - use_chart_recognition: bool
            - layout_threshold: float
            - prettify_markdown: bool
            - show_formula_number: bool
        
    Returns:
        Dict: Parsed document result in unified format
    """
    opts = options or {}
    
    return call_paddle_ocr_vl(
        image_data=image_data,
        api_url=api_url,
        token=token,
        timeout=timeout,
        use_doc_orientation_classify=opts.get('use_doc_orientation_classify', True),
        use_doc_unwarping=opts.get('use_doc_unwarping', False),
        use_layout_detection=opts.get('use_layout_detection', True),
        use_chart_recognition=opts.get('use_chart_recognition', False),
        layout_threshold=opts.get('layout_threshold', 0.5),
        prettify_markdown=opts.get('prettify_markdown', True),
        show_formula_number=opts.get('show_formula_number', False)
    )


def get_engine_info() -> Dict:
    """Get PaddleOCR-VL engine information."""
    return OCR_ENGINE_INFO.copy()
