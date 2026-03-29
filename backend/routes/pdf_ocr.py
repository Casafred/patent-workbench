"""
PDF OCR API routes for document layout parsing.

This module handles document OCR functionality, including:
- GLM OCR API integration for document layout parsing
- PaddleOCR-VL-1.5 API integration as an alternative engine
- Support for formula, table, and chart recognition
- Markdown output with images
"""

import base64
import traceback
import logging
from flask import Blueprint, request

from backend.middleware.auth_middleware import validate_api_request
from backend.utils.response import create_response

logger = logging.getLogger(__name__)

pdf_ocr_bp = Blueprint('pdf_ocr', __name__)

PADDLE_OCR_VL_API_URL = "https://k2neb1qcy1u6g4k5.aistudio-app.com/layout-parsing"
PADDLE_OCR_VL_TOKEN = "70b270c8275606a7a97f8c4e8617cdeb935ed74c"


def get_api_key_from_request():
    """Get API key from request headers."""
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        return auth_header.split(' ')[1]
    return None


@pdf_ocr_bp.route('/pdf-ocr/parse', methods=['POST'])
def parse_document():
    """
    Parse document using specified OCR engine.
    
    Request body:
        {
            "file": "base64_encoded_image",
            "engine": "glm_ocr" | "paddle_ocr_vl",
            "options": {
                "use_doc_orientation_classify": true,
                "use_layout_detection": true,
                "use_chart_recognition": false,
                ...
            }
        }
    
    Response:
        {
            "success": true,
            "result": {
                "pages": [...],
                "markdown": "...",
                "engine": "paddle_ocr_vl"
            }
        }
    """
    try:
        req_data = request.get_json()
        
        if not req_data:
            return create_response(
                error="Request body is required",
                status_code=400
            )
        
        file_base64 = req_data.get('file')
        engine = req_data.get('engine', 'glm_ocr')
        options = req_data.get('options', {})
        
        if not file_base64:
            return create_response(
                error="file is required",
                status_code=400
            )
        
        if engine == 'paddle_ocr_vl':
            result = _parse_with_paddle_ocr_vl(file_base64, options)
        else:
            result = _parse_with_glm_ocr(file_base64, options)
        
        return create_response(
            data={"result": result, "engine": engine, "message": "Document parsed successfully"}
        )
        
    except Exception as e:
        logger.error(f"Document parsing failed: {traceback.format_exc()}")
        return create_response(
            error=f"Document parsing failed: {str(e)}",
            status_code=500
        )


def _parse_with_paddle_ocr_vl(file_base64: str, options: dict) -> dict:
    """
    Parse document using PaddleOCR-VL-1.5 API.
    
    Args:
        file_base64: Base64 encoded image data
        options: Additional parsing options
        
    Returns:
        dict: Parsed document result
    """
    import requests
    import time
    
    headers = {
        "Authorization": f"token {PADDLE_OCR_VL_TOKEN}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "file": file_base64,
        "fileType": 1,
        "useDocOrientationClassify": options.get('use_doc_orientation_classify', True),
        "useDocUnwarping": options.get('use_doc_unwarping', False),
        "useLayoutDetection": options.get('use_layout_detection', True),
        "useChartRecognition": options.get('use_chart_recognition', False),
        "layoutThreshold": options.get('layout_threshold', 0.5),
        "prettifyMarkdown": options.get('prettify_markdown', True),
        "showFormulaNumber": options.get('show_formula_number', False),
        "visualize": False
    }
    
    logger.info("Calling PaddleOCR-VL-1.5 API...")
    start_time = time.time()
    
    response = requests.post(
        PADDLE_OCR_VL_API_URL,
        json=payload,
        headers=headers,
        timeout=180
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
        raise RuntimeError(error_msg)
    
    result = response.json()
    
    logger.info(f"PaddleOCR-VL-1.5 API response keys: {result.keys()}")
    logger.info(f"PaddleOCR-VL-1.5 API result: {result}")
    
    if result.get('errorCode', 0) != 0:
        raise RuntimeError(f"PaddleOCR-VL-1.5 failed: {result.get('errorMsg', 'Unknown error')}")
    
    return _transform_paddle_ocr_vl_response(result)


def _transform_paddle_ocr_vl_response(response: dict) -> dict:
    """
    Transform PaddleOCR-VL-1.5 response to unified format.
    
    PaddleOCR-VL-1.5 response structure:
    {
        'logId': 'xxx',
        'errorCode': 0,
        'errorMsg': 'Success',
        'result': {
            'layoutParsingResults': [
                {
                    'prunedResult': {
                        'width': 1190,
                        'height': 1684,
                        'parsing_res_list': [
                            {
                                'block_label': 'text',
                                'block_content': '...',
                                'block_bbox': [x1, y1, x2, y2],
                                'block_polygon_points': [[x1,y1], [x2,y1], [x2,y2], [x1,y2]]
                            }
                        ]
                    },
                    'markdown': {'text': '...', 'images': {}}
                }
            ],
            'dataInfo': {...}
        }
    }
    """
    import time
    
    logger.info(f"Transforming response: {response.keys() if response else 'None'}")
    
    if not response or 'result' not in response:
        logger.warning("No response or no 'result' key")
        return {
            'pages': [],
            'markdown': '',
            'images': {},
            'engine': 'paddle_ocr_vl',
            'md_results': ''
        }
    
    result = response.get('result', {})
    logger.info(f"Result keys: {result.keys()}")
    
    layout_results = result.get('layoutParsingResults', [])
    logger.info(f"Layout results count: {len(layout_results)}")
    
    if not layout_results:
        logger.warning("No layoutParsingResults found")
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
        page_width = pruned_result.get('width', 1224)
        page_height = pruned_result.get('height', 1584)
        
        parsing_res_list = pruned_result.get('parsing_res_list', [])
        logger.info(f"Page {i+1}: parsing_res_list count: {len(parsing_res_list)}")
        
        blocks = []
        for block in parsing_res_list:
            block_label = block.get('block_label', 'text')
            block_content = block.get('block_content', '')
            block_bbox = block.get('block_bbox', [0, 0, 100, 100])
            block_polygon = block.get('block_polygon_points', [])
            
            blocks.append({
                'index': block.get('block_id', len(blocks)),
                'type': block_label,
                'label': block_label,
                'text': block_content,
                'content': block_content,
                'bbox': {
                    'lt': [block_bbox[0], block_bbox[1]],
                    'rb': [block_bbox[2], block_bbox[3]],
                    'page_width': page_width,
                    'page_height': page_height
                },
                'bbox_2d': block_bbox,
                'polygon_points': block_polygon,
                'order': block.get('block_order'),
                'group_id': block.get('group_id'),
                'pageIndex': i + 1
            })
        
        page = {
            'pageIndex': i + 1,
            'width': page_width,
            'height': page_height,
            'blocks': blocks,
            'markdown': markdown_text
        }
        
        pages.append(page)
        all_markdown.append(markdown_text)
        
        for img_path, img_data in markdown_images.items():
            all_images[img_path] = img_data
    
    combined_markdown = '\n\n---\n\n'.join(all_markdown)
    
    layout_details = []
    for page in pages:
        page_blocks = []
        for block in page.get('blocks', []):
            bbox_2d = block.get('bbox_2d') or [
                block.get('bbox', {}).get('lt', [0, 0])[0],
                block.get('bbox', {}).get('lt', [0, 0])[1],
                block.get('bbox', {}).get('rb', [1, 1])[0],
                block.get('bbox', {}).get('rb', [1, 1])[1]
            ]
            page_blocks.append({
                'label': block.get('label', 'text'),
                'content': block.get('content', ''),
                'bbox_2d': bbox_2d,
                'width': page.get('width', 1224),
                'height': page.get('height', 1584)
            })
        layout_details.append(page_blocks)
    
    return {
        'pages': pages,
        'markdown': combined_markdown,
        'images': all_images,
        'engine': 'paddle_ocr_vl',
        'md_results': combined_markdown,
        'layout_details': layout_details,
        'data_info': result.get('dataInfo', {}),
        'request_id': response.get('logId', ''),
        'created': int(time.time()),
        'model': 'PaddleOCR-VL-1.5'
    }


def _extract_blocks_from_pruned_result(pruned_result: dict, page_index: int) -> list:
    """Extract blocks from pruned result."""
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


def _parse_with_glm_ocr(file_base64: str, options: dict) -> dict:
    """
    Parse document using GLM OCR API.
    
    Args:
        file_base64: Base64 encoded image data (with or without data URL prefix)
        options: Additional parsing options
        
    Returns:
        dict: Parsed document result
    """
    import requests
    
    api_key = get_api_key_from_request()
    
    if not api_key:
        raise ValueError("API key is required for GLM OCR")
    
    if file_base64.startswith('data:'):
        file_data = file_base64
    else:
        file_data = f"data:image/png;base64,{file_base64}"
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    
    payload = {
        "model": "glm-ocr",
        "file": file_data
    }
    
    logger.info("Calling GLM OCR API...")
    
    response = requests.post(
        "https://open.bigmodel.cn/api/paas/v4/layout_parsing",
        headers=headers,
        json=payload,
        timeout=180
    )
    
    if response.status_code != 200:
        error_msg = f"GLM OCR API call failed: {response.status_code}"
        try:
            error_detail = response.json()
            error_msg = f"{error_msg} - {error_detail}"
        except:
            error_msg = f"{error_msg} - {response.text[:200]}"
        raise RuntimeError(error_msg)
    
    result = response.json()
    
    return _transform_glm_ocr_response(result)


def _transform_glm_ocr_response(response: dict) -> dict:
    """Transform GLM OCR response to unified format."""
    import time
    
    if not response or 'layout_details' not in response:
        return {
            'pages': [],
            'markdown': '',
            'engine': 'glm_ocr',
            'md_results': ''
        }
    
    pages = []
    all_markdown = []
    
    layout_details = response.get('layout_details', [])
    data_info = response.get('data_info', {})
    
    for page_idx, page_blocks in enumerate(layout_details):
        page_info = data_info.get('pages', [{}])[page_idx] if page_idx < len(data_info.get('pages', [{}])) else {}
        
        blocks = []
        for block_idx, block in enumerate(page_blocks):
            bbox = block.get('bbox_2d', [0, 0, 1, 1])
            content = block.get('content', '')
            label = block.get('label', 'text')
            width = block.get('width', 1)
            height = block.get('height', 1)
            
            block_type = _map_label_to_type(label)
            
            blocks.append({
                'index': block_idx,
                'type': block_type,
                'text': content,
                'content': content,
                'label': label,
                'native_label': block.get('native_label', ''),
                'bbox': {
                    'lt': [bbox[0], bbox[1]],
                    'rb': [bbox[2], bbox[3]],
                    'page_width': width,
                    'page_height': height
                },
                'pageIndex': page_idx + 1
            })
        
        page = {
            'pageIndex': page_idx + 1,
            'width': page_info.get('width', 1224),
            'height': page_info.get('height', 1584),
            'blocks': blocks,
            'markdown': ''
        }
        
        pages.append(page)
        
        page_text = '\n'.join([b.get('text', '') for b in blocks])
        all_markdown.append(page_text)
    
    combined_markdown = '\n\n---\n\n'.join(all_markdown)
    
    return {
        'pages': pages,
        'markdown': combined_markdown,
        'engine': 'glm_ocr',
        'md_results': response.get('md_results', combined_markdown),
        'layout_details': layout_details,
        'data_info': data_info,
        'request_id': response.get('request_id', ''),
        'created': int(time.time()),
        'model': 'glm-ocr'
    }


def _map_label_to_type(label: str) -> str:
    """Map GLM OCR label to block type."""
    label_map = {
        'text': 'text',
        'table': 'table',
        'formula': 'formula',
        'image': 'image',
        'title': 'title',
        'header': 'header',
        'footer': 'footer',
        'reference': 'reference'
    }
    return label_map.get(label, 'text')


@pdf_ocr_bp.route('/pdf-ocr/engines', methods=['GET'])
def get_available_engines():
    """Get available OCR engines."""
    engines = [
        {
            'id': 'glm_ocr',
            'name': 'GLM OCR',
            'provider': '智谱AI',
            'description': '智谱AI文档OCR引擎，需要API Key',
            'requires_api_key': True,
            'features': {
                'layout_parsing': True,
                'formula_recognition': True,
                'table_recognition': True
            }
        },
        {
            'id': 'paddle_ocr_vl',
            'name': 'PaddleOCR-VL-1.5',
            'provider': '百度AI Studio',
            'description': '百度飞桨文档OCR引擎，支持版面分析、公式表格识别，预置API无需配置',
            'requires_api_key': False,
            'features': {
                'layout_parsing': True,
                'formula_recognition': True,
                'table_recognition': True,
                'chart_recognition': True,
                'markdown_output': True
            }
        }
    ]
    
    return create_response(
        data={'engines': engines, 'message': "Available OCR engines retrieved"}
    )
