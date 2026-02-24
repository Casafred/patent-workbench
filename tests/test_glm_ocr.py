"""
GLM OCR API 测试脚本

测试智谱AI GLM-OCR版面解析API，验证其对专利附图标记的识别能力。
"""

import base64
import requests
import json
import os
import sys
import re
from pathlib import Path

API_URL = "https://open.bigmodel.cn/api/paas/v4/layout_parsing"

def load_api_key():
    """从环境变量或配置文件加载API Key"""
    api_key = os.environ.get("ZHIPUAI_API_KEY")
    
    if not api_key:
        config_path = Path(__file__).parent.parent / "backend" / "config.py"
        if config_path.exists():
            import importlib.util
            spec = importlib.util.spec_from_file_location("config", config_path)
            config = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(config)
            api_key = getattr(config, 'GUEST_API_KEY', None)
    
    return api_key


def image_to_base64(image_path: str) -> str:
    """将图片转换为base64编码"""
    with open(image_path, 'rb') as f:
        return base64.b64encode(f.read()).decode('utf-8')


def call_glm_ocr(image_path: str, api_key: str) -> dict:
    """
    调用GLM OCR版面解析API
    
    Args:
        image_path: 图片路径
        api_key: 智谱AI API Key
        
    Returns:
        API响应结果
    """
    image_base64 = image_to_base64(image_path)
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
    
    print(f"[INFO] Calling GLM OCR API...")
    print(f"[INFO] Image: {image_path}")
    
    response = requests.post(API_URL, headers=headers, json=payload, timeout=60)
    
    if response.status_code != 200:
        print(f"[ERROR] API call failed: {response.status_code}")
        print(f"[ERROR] Response: {response.text}")
        return None
    
    return response.json()


def transform_glm_ocr_result(response: dict) -> list:
    """
    将GLM OCR响应转换为统一格式
    
    GLM OCR返回格式:
    {
        "layout_details": [[
            {
                "bbox_2d": [x1, y1, x2, y2],  // 归一化坐标(0-1)
                "content": "文本内容",
                "width": 页面宽度,
                "height": 页面高度,
                "label": "text"
            }
        ]]
    }
    
    统一格式:
    [
        {
            "number": "识别的文本",
            "x": 中心X坐标(像素),
            "y": 中心Y坐标(像素),
            "width": 宽度(像素),
            "height": 高度(像素),
            "confidence": 100
        }
    ]
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
    
    return results


def filter_alphanumeric_markers(results: list) -> list:
    """
    过滤只保留字母数字标记（与RapidOCR相同的过滤逻辑）
    """
    pattern = re.compile(r"^[0-9]+[A-Za-z]*'*$|^[A-Z]+[0-9]*[a-z]*'*$|^[A-Za-z]'*$", re.IGNORECASE)
    
    filtered = []
    for result in results:
        text = result['number'].strip()
        text = re.sub(r'^[^\w]+|[^\w]+$', '', text)
        
        if not text or len(text) > 8:
            continue
        
        if pattern.match(text):
            result['number'] = text
            filtered.append(result)
    
    return filtered


def test_glm_ocr():
    """主测试函数"""
    test_image = Path(__file__).parent / "test_data" / "test ocr.png"
    
    if not test_image.exists():
        print(f"[ERROR] Test image not found: {test_image}")
        return
    
    api_key = load_api_key()
    if not api_key:
        print("[ERROR] No API key found. Please set ZHIPUAI_API_KEY environment variable.")
        return
    
    print("=" * 60)
    print("GLM OCR API Test for Patent Drawing Markers")
    print("=" * 60)
    
    response = call_glm_ocr(str(test_image), api_key)
    
    if not response:
        print("[ERROR] Failed to get response from GLM OCR API")
        return
    
    print("\n[INFO] Raw API Response:")
    print("-" * 40)
    print(json.dumps(response, indent=2, ensure_ascii=False)[:2000])
    if len(json.dumps(response)) > 2000:
        print("... (truncated)")
    
    transformed = transform_glm_ocr_result(response)
    print(f"\n[INFO] Transformed results: {len(transformed)} items")
    
    filtered = filter_alphanumeric_markers(transformed)
    print(f"[INFO] Filtered alphanumeric markers: {len(filtered)} items")
    
    print("\n[RESULT] Detected Markers:")
    print("-" * 40)
    for item in filtered:
        print(f"  {item['number']:6s} | pos: ({item['x']:4d}, {item['y']:4d}) | size: {item['width']}x{item['height']}")
    
    print("\n" + "=" * 60)
    print(f"Total markers detected: {len(filtered)}")
    print("=" * 60)
    
    return filtered


if __name__ == "__main__":
    test_glm_ocr()
