"""
GLM OCR API 测试脚本
测试智谱AI两种OCR API，验证其对专利附图标记的识别能力。
"""

import base64
import requests
import json
import os
import re
from pathlib import Path

LAYOUT_PARSING_URL = "https://open.bigmodel.cn/api/paas/v4/layout_parsing"
HANDWRITING_OCR_URL = "https://open.bigmodel.cn/api/paas/v4/files/ocr"


def load_api_key():
    """从环境变量或配置文件加载API Key"""
    api_key = os.environ.get("ZHIPUAI_API_KEY")
    
    if not api_key:
        config_path = Path(__file__).parent / "backend" / "config.py"
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


def call_handwriting_ocr(image_path: str, api_key: str) -> dict:
    """
    调用GLM手写体OCR API
    
    这个API返回像素坐标，更适合识别附图标记
    """
    headers = {
        "Authorization": f"Bearer {api_key}"
    }
    
    with open(image_path, 'rb') as f:
        files = {
            'file': ('image.png', f, 'image/png')
        }
        data = {
            'tool_type': 'hand_write',
            'language_type': 'CHN_ENG',
            'probability': 'true'
        }
        
        print(f"[INFO] Calling Handwriting OCR API...")
        print(f"[INFO] Image: {image_path}")
        
        response = requests.post(HANDWRITING_OCR_URL, headers=headers, files=files, data=data, timeout=60)
    
    if response.status_code != 200:
        print(f"[ERROR] API call failed: {response.status_code}")
        print(f"[ERROR] Response: {response.text}")
        return None
    
    return response.json()


def call_layout_parsing_ocr(image_path: str, api_key: str) -> dict:
    """调用GLM版面解析API"""
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
    
    print(f"[INFO] Calling Layout Parsing OCR API...")
    
    response = requests.post(LAYOUT_PARSING_URL, headers=headers, json=payload, timeout=60)
    
    if response.status_code != 200:
        print(f"[ERROR] API call failed: {response.status_code}")
        print(f"[ERROR] Response: {response.text}")
        return None
    
    return response.json()


def transform_handwriting_ocr_result(response: dict) -> list:
    """
    将手写体OCR响应转换为统一格式
    
    手写体OCR返回格式:
    {
        "words_result": [
            {
                "location": {"left": 100, "top": 200, "width": 50, "height": 30},
                "words": "文本内容",
                "probability": {"average": 0.95}
            }
        ]
    }
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
    
    return results


def transform_layout_parsing_result(response: dict) -> list:
    """将版面解析OCR响应转换为统一格式"""
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
    """过滤只保留字母数字标记"""
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
    
    print("=" * 70)
    print("GLM OCR API Test for Patent Drawing Markers")
    print("=" * 70)
    
    print("\n" + "=" * 70)
    print("TEST 1: Handwriting OCR API (返回像素坐标)")
    print("=" * 70)
    
    hw_response = call_handwriting_ocr(str(test_image), api_key)
    
    if hw_response:
        print("\n[INFO] Raw API Response:")
        print("-" * 40)
        print(json.dumps(hw_response, indent=2, ensure_ascii=False)[:2000])
        if len(json.dumps(hw_response)) > 2000:
            print("... (truncated)")
        
        hw_transformed = transform_handwriting_ocr_result(hw_response)
        print(f"\n[INFO] Transformed results: {len(hw_transformed)} items")
        
        hw_filtered = filter_alphanumeric_markers(hw_transformed)
        print(f"[INFO] Filtered alphanumeric markers: {len(hw_filtered)} items")
        
        print("\n[RESULT] Detected Markers (Handwriting OCR):")
        print("-" * 40)
        for item in hw_filtered[:20]:
            print(f"  {item['number']:6s} | pos: ({item['x']:4d}, {item['y']:4d}) | size: {item['width']}x{item['height']} | conf: {item['confidence']:.1f}%")
        
        if len(hw_filtered) > 20:
            print(f"  ... and {len(hw_filtered) - 20} more")
        
        print(f"\nTotal markers from Handwriting OCR: {len(hw_filtered)}")
    else:
        print("[ERROR] Handwriting OCR API call failed")
        hw_filtered = []
    
    print("\n" + "=" * 70)
    print("TEST 2: Layout Parsing OCR API (版面解析)")
    print("=" * 70)
    
    lp_response = call_layout_parsing_ocr(str(test_image), api_key)
    
    if lp_response:
        print("\n[INFO] Raw API Response:")
        print("-" * 40)
        print(json.dumps(lp_response, indent=2, ensure_ascii=False)[:2000])
        if len(json.dumps(lp_response)) > 2000:
            print("... (truncated)")
        
        lp_transformed = transform_layout_parsing_result(lp_response)
        print(f"\n[INFO] Transformed results: {len(lp_transformed)} items")
        
        lp_filtered = filter_alphanumeric_markers(lp_transformed)
        print(f"[INFO] Filtered alphanumeric markers: {len(lp_filtered)} items")
        
        print("\n[RESULT] Detected Markers (Layout Parsing):")
        print("-" * 40)
        for item in lp_filtered:
            print(f"  {item['number']:6s} | pos: ({item['x']:4d}, {item['y']:4d}) | size: {item['width']}x{item['height']}")
        
        print(f"\nTotal markers from Layout Parsing: {len(lp_filtered)}")
    else:
        print("[ERROR] Layout Parsing OCR API call failed")
        lp_filtered = []
    
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Handwriting OCR markers: {len(hw_filtered)}")
    print(f"Layout Parsing markers:  {len(lp_filtered)}")
    print("=" * 70)
    
    return hw_filtered, lp_filtered


if __name__ == "__main__":
    test_glm_ocr()
