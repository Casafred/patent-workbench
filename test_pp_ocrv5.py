"""
PP-OCRv5 API 测试脚本
测试百度PP-OCRv5对专利附图标记的识别能力
"""

import base64
import requests
import json
import re
from pathlib import Path

API_URL = "https://x9pal7t2e9t4lff3.aistudio-app.com/ocr"
TOKEN = "70b270c8275606a7a97f8c4e8617cdeb935ed74c"


def image_to_base64(image_path: str) -> str:
    with open(image_path, 'rb') as f:
        return base64.b64encode(f.read()).decode('ascii')


def call_pp_ocrv5(image_path: str) -> dict:
    image_data = image_to_base64(image_path)
    
    headers = {
        "Authorization": f"token {TOKEN}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "file": image_data,
        "fileType": 1,
        "useDocOrientationClassify": True,
        "useDocUnwarping": False,
        "useTextlineOrientation": True,
        "textDetLimitType": "min",
        "textDetLimitSideLen": 64,
        "textDetThresh": 0.3,
        "textDetBoxThresh": 0.2,
        "textDetUnclipRatio": 1.5,
        "textRecScoreThresh": 0,
    }
    
    print(f"[INFO] Calling PP-OCRv5 API...")
    print(f"[INFO] Image: {image_path}")
    print(f"[INFO] API URL: {API_URL}")
    
    response = requests.post(API_URL, json=payload, headers=headers, timeout=120)
    
    if response.status_code != 200:
        print(f"[ERROR] API call failed: {response.status_code}")
        print(f"[ERROR] Response: {response.text[:500]}")
        return None
    
    return response.json()


def extract_text_with_coords(result: dict) -> list:
    if not result or 'result' not in result:
        return []
    
    ocr_results = result.get('result', {}).get('ocrResults', [])
    
    if not ocr_results:
        print("[WARN] No ocrResults found")
        return []
    
    all_texts = []
    
    for page_result in ocr_results:
        pruned_result = page_result.get('prunedResult', {})
        
        if not pruned_result:
            continue
        
        dt_polys = pruned_result.get('dt_polys', [])
        rec_texts = pruned_result.get('rec_texts', [])
        rec_scores = pruned_result.get('rec_scores', [])
        
        print(f"[DEBUG] dt_polys count: {len(dt_polys)}")
        print(f"[DEBUG] rec_texts count: {len(rec_texts)}")
        print(f"[DEBUG] rec_texts: {rec_texts}")
        
        for i, (poly, text, score) in enumerate(zip(dt_polys, rec_texts, rec_scores)):
            if len(poly) >= 4:
                xs = [p[0] for p in poly]
                ys = [p[1] for p in poly]
                x_min, x_max = min(xs), max(xs)
                y_min, y_max = min(ys), max(ys)
                
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
                    'confidence': float(score) * 100
                })
    
    return all_texts


def filter_alphanumeric_markers(results: list) -> list:
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


def test_pp_ocrv5():
    test_image = Path(__file__).parent / "test_data" / "test ocr.png"
    
    if not test_image.exists():
        print(f"[ERROR] Test image not found: {test_image}")
        return
    
    print("=" * 70)
    print("PP-OCRv5 API Test for Patent Drawing Markers")
    print("=" * 70)
    print()
    
    response = call_pp_ocrv5(str(test_image))
    
    if not response:
        print("[ERROR] Failed to get response from PP-OCRv5 API")
        return
    
    print("\n[INFO] Raw API Response (prunedResult):")
    print("-" * 40)
    if 'result' in response and 'ocrResults' in response['result']:
        pruned = response['result']['ocrResults'][0].get('prunedResult', {})
        print(f"Keys: {pruned.keys()}")
        print(f"rec_texts: {pruned.get('rec_texts', [])}")
        print(f"rec_scores: {pruned.get('rec_scores', [])}")
        print(f"dt_polys count: {len(pruned.get('dt_polys', []))}")
    
    all_texts = extract_text_with_coords(response)
    print(f"\n[INFO] Extracted text regions: {len(all_texts)} items")
    
    if all_texts:
        print("\n[RESULT] All detected texts:")
        print("-" * 40)
        for item in all_texts:
            print(f"  '{item['number']:10s}' | pos: ({item['x']:4d}, {item['y']:4d}) | size: {item['width']}x{item['height']} | conf: {item['confidence']:.1f}%")
    
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
    test_pp_ocrv5()
