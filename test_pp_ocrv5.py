"""
PP-OCRv5 API 测试脚本
测试百度PP-OCRv5对专利附图标记的识别能力

注意：PP-OCRv5和PaddleOCR-VL是不同的服务，需要不同的API URL
请访问 https://aistudio.baidu.com/paddleocr/task 获取PP-OCRv5的API URL
"""

import base64
import requests
import json
import re
from pathlib import Path


def image_to_base64(image_path: str) -> str:
    with open(image_path, 'rb') as f:
        return base64.b64encode(f.read()).decode('ascii')


def call_pp_ocrv5(image_path: str, api_url: str, token: str) -> dict:
    image_data = image_to_base64(image_path)
    
    headers = {
        "Authorization": f"token {token}",
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
    print(f"[INFO] API URL: {api_url}")
    
    response = requests.post(api_url, json=payload, headers=headers, timeout=120)
    
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
        print(f"[DEBUG] Available keys in result: {result.get('result', {}).keys()}")
        return []
    
    all_texts = []
    
    for page_result in ocr_results:
        pruned_result = page_result.get('prunedResult', {})
        
        print(f"\n[DEBUG] prunedResult keys: {pruned_result.keys() if pruned_result else 'None'}")
        
        if not pruned_result:
            continue
        
        dt_boxes = pruned_result.get('dt_boxes', [])
        rec_texts = pruned_result.get('rec_texts', [])
        rec_scores = pruned_result.get('rec_scores', [])
        
        print(f"[DEBUG] dt_boxes count: {len(dt_boxes)}")
        print(f"[DEBUG] rec_texts count: {len(rec_texts)}")
        
        for i, (box, text, score) in enumerate(zip(dt_boxes, rec_texts, rec_scores)):
            if len(box) >= 4:
                xs = [p[0] for p in box]
                ys = [p[1] for p in box]
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
    print("请访问 https://aistudio.baidu.com/paddleocr/task 获取PP-OCRv5的API信息")
    print("注意：PP-OCRv5和PaddleOCR-VL是不同的服务！")
    print()
    
    api_url = input("请输入 PP-OCRv5 API URL (例如: https://xxx.aistudio-app.com/ocr): ").strip()
    token = input("请输入 TOKEN: ").strip()
    
    if not api_url or not token:
        print("[ERROR] API URL和TOKEN不能为空")
        return
    
    response = call_pp_ocrv5(str(test_image), api_url, token)
    
    if not response:
        print("[ERROR] Failed to get response from PP-OCRv5 API")
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
        for item in all_texts[:30]:
            print(f"  '{item['number']:10s}' | pos: ({item['x']:4d}, {item['y']:4d}) | size: {item['width']}x{item['height']} | conf: {item['confidence']:.1f}%")
        if len(all_texts) > 30:
            print(f"  ... and {len(all_texts) - 30} more")
    
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
