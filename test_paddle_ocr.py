"""
PaddleOCR-VL-1.5 API 测试脚本
测试百度PaddleOCR-VL对专利附图标记的识别能力
"""

import base64
import requests
import json
import re
import os
from pathlib import Path

API_URL = "https://k2neb1qcy1u6g4k5.aistudio-app.com/layout-parsing"


def image_to_base64(image_path: str) -> str:
    """将图片转换为base64编码"""
    with open(image_path, 'rb') as f:
        return base64.b64encode(f.read()).decode('ascii')


def call_paddle_ocr(image_path: str, token: str) -> dict:
    """
    调用PaddleOCR-VL API
    
    Args:
        image_path: 图片路径
        token: API Token
        
    Returns:
        API响应结果
    """
    image_data = image_to_base64(image_path)
    
    headers = {
        "Authorization": f"token {token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "file": image_data,
        "fileType": 1,
        "useLayoutDetection": False,
        "promptLabel": "ocr",
        "useDocOrientationClassify": True,
        "visualize": False,
        "temperature": 0.1,
    }
    
    print(f"[INFO] Calling PaddleOCR-VL API...")
    print(f"[INFO] Image: {image_path}")
    
    response = requests.post(API_URL, json=payload, headers=headers, timeout=120)
    
    if response.status_code != 200:
        print(f"[ERROR] API call failed: {response.status_code}")
        print(f"[ERROR] Response: {response.text[:500]}")
        return None
    
    return response.json()


def extract_text_with_coords(result: dict) -> list:
    """
    从PaddleOCR结果中提取文本和坐标
    
    返回格式:
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
    if not result or 'result' not in result:
        return []
    
    layout_results = result.get('result', {}).get('layoutParsingResults', [])
    
    if not layout_results:
        print("[WARN] No layoutParsingResults found")
        return []
    
    all_texts = []
    
    for page_result in layout_results:
        pruned_result = page_result.get('prunedResult', {})
        
        print(f"\n[DEBUG] prunedResult keys: {pruned_result.keys() if pruned_result else 'None'}")
        
        if not pruned_result:
            continue
        
        for key, value in pruned_result.items():
            if isinstance(value, list):
                for item in value:
                    if isinstance(item, dict):
                        text = item.get('text', '') or item.get('content', '') or item.get('rec_text', '')
                        
                        bbox = item.get('bbox', []) or item.get('box', []) or item.get('polygon', []) or item.get('points', [])
                        
                        confidence = item.get('confidence', 0) or item.get('score', 0)
                        
                        if text and bbox:
                            if len(bbox) >= 4:
                                if isinstance(bbox[0], (list, tuple)) and len(bbox[0]) == 2:
                                    xs = [p[0] for p in bbox]
                                    ys = [p[1] for p in bbox]
                                    x_min, x_max = min(xs), max(xs)
                                    y_min, y_max = min(ys), max(ys)
                                elif len(bbox) == 4:
                                    x_min, y_min, x_max, y_max = bbox
                                else:
                                    continue
                                
                                width = x_max - x_min
                                height = y_max - y_min
                                center_x = (x_min + x_max) // 2
                                center_y = (y_min + y_max) // 2
                                
                                all_texts.append({
                                    'number': text.strip(),
                                    'x': center_x,
                                    'y': center_y,
                                    'width': width,
                                    'height': height,
                                    'confidence': float(confidence) * 100 if confidence <= 1 else float(confidence)
                                })
    
    return all_texts


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


def test_paddle_ocr():
    """主测试函数"""
    test_image = Path(__file__).parent / "test_data" / "test ocr.png"
    
    if not test_image.exists():
        print(f"[ERROR] Test image not found: {test_image}")
        return
    
    print("=" * 70)
    print("PaddleOCR-VL-1.5 API Test for Patent Drawing Markers")
    print("=" * 70)
    print(f"API URL: {API_URL}")
    print()
    
    token = input("请输入您的 PaddleOCR TOKEN: ").strip()
    
    if not token:
        print("[ERROR] TOKEN不能为空")
        return
    
    response = call_paddle_ocr(str(test_image), token)
    
    if not response:
        print("[ERROR] Failed to get response from PaddleOCR-VL API")
        return
    
    print("\n[INFO] Raw API Response:")
    print("-" * 40)
    print(json.dumps(response, indent=2, ensure_ascii=False)[:3000])
    if len(json.dumps(response)) > 3000:
        print("... (truncated)")
    
    all_texts = extract_text_with_coords(response)
    print(f"\n[INFO] Extracted text regions: {len(all_texts)} items")
    
    if all_texts:
        print("\n[RESULT] All detected texts:")
        print("-" * 40)
        for item in all_texts[:20]:
            print(f"  '{item['number']:10s}' | pos: ({item['x']:4d}, {item['y']:4d}) | size: {item['width']}x{item['height']} | conf: {item['confidence']:.1f}%")
        if len(all_texts) > 20:
            print(f"  ... and {len(all_texts) - 20} more")
    
    filtered = filter_alphanumeric_markers(all_texts)
    print(f"\n[INFO] Filtered alphanumeric markers: {len(filtered)} items")
    
    print("\n[RESULT] Detected Markers (filtered):")
    print("-" * 40)
    for item in filtered:
        print(f"  {item['number']:6s} | pos: ({item['x']:4d}, {item['y']:4d}) | size: {item['width']}x{item['height']} | conf: {item['confidence']:.1f}%")
    
    print("\n" + "=" * 70)
    print(f"Total markers detected: {len(filtered)}")
    print("=" * 70)
    
    return filtered


if __name__ == "__main__":
    test_paddle_ocr()
