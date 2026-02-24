"""
对比测试：RapidOCR vs GLM OCR
"""

import base64
import requests
import json
import os
import re
import sys
from pathlib import Path
from io import BytesIO

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


def test_rapidocr(image_path: str) -> list:
    """使用RapidOCR进行识别"""
    try:
        from rapidocr_onnxruntime import RapidOCR
    except ImportError:
        print("[ERROR] RapidOCR not installed. Run: pip install rapidocr-onnxruntime")
        return []
    
    import numpy as np
    from PIL import Image
    
    print(f"[INFO] Testing RapidOCR...")
    
    ocr = RapidOCR(
        text_score=0.3,
        box_thresh=0.1,
        unclip_ratio=1.8,
        max_side_len=2500
    )
    
    with open(image_path, 'rb') as f:
        pil_image = Image.open(BytesIO(f.read()))
        if pil_image.mode not in ('RGB', 'L'):
            pil_image = pil_image.convert('RGB')
        image = np.array(pil_image)
    
    result, elapse = ocr(image)
    
    if not result:
        return []
    
    results = []
    for detection in result:
        if len(detection) < 3:
            continue
        
        box, text, score = detection
        
        xs = [point[0] for point in box]
        ys = [point[1] for point in box]
        
        x_min, x_max = min(xs), max(xs)
        y_min, y_max = min(ys), max(ys)
        
        width = x_max - x_min
        height = y_max - y_min
        center_x = (x_min + x_max) / 2
        center_y = (y_min + y_max) / 2
        
        results.append({
            'number': text.strip(),
            'x': int(center_x),
            'y': int(center_y),
            'width': int(width),
            'height': int(height),
            'confidence': float(score) * 100
        })
    
    return results


def test_glm_handwriting_ocr(image_path: str, api_key: str) -> list:
    """使用GLM Handwriting OCR进行识别"""
    print(f"[INFO] Testing GLM Handwriting OCR...")
    
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
        
        response = requests.post(HANDWRITING_OCR_URL, headers=headers, files=files, data=data, timeout=60)
    
    if response.status_code != 200:
        print(f"[ERROR] API call failed: {response.status_code}")
        return []
    
    resp_json = response.json()
    
    if 'words_result' not in resp_json:
        return []
    
    results = []
    for item in resp_json.get('words_result', []):
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


def main():
    test_image = Path(__file__).parent / "test_data" / "test ocr.png"
    
    if not test_image.exists():
        print(f"[ERROR] Test image not found: {test_image}")
        return
    
    api_key = load_api_key()
    
    print("=" * 70)
    print("OCR Comparison Test: RapidOCR vs GLM Handwriting OCR")
    print("=" * 70)
    print(f"Test image: {test_image}")
    print()
    
    rapidocr_results = test_rapidocr(str(test_image))
    rapidocr_filtered = filter_alphanumeric_markers(rapidocr_results)
    
    print(f"\n[RESULT] RapidOCR detected: {len(rapidocr_results)} items, filtered: {len(rapidocr_filtered)} markers")
    print("-" * 40)
    for item in rapidocr_filtered:
        print(f"  {item['number']:6s} | pos: ({item['x']:4d}, {item['y']:4d}) | size: {item['width']}x{item['height']} | conf: {item['confidence']:.1f}%")
    
    if api_key:
        print()
        glm_results = test_glm_handwriting_ocr(str(test_image), api_key)
        glm_filtered = filter_alphanumeric_markers(glm_results)
        
        print(f"\n[RESULT] GLM Handwriting OCR detected: {len(glm_results)} items, filtered: {len(glm_filtered)} markers")
        print("-" * 40)
        for item in glm_filtered:
            print(f"  {item['number']:6s} | pos: ({item['x']:4d}, {item['y']:4d}) | size: {item['width']}x{item['height']} | conf: {item['confidence']:.1f}%")
    else:
        print("\n[WARN] No API key found, skipping GLM OCR test")
        glm_filtered = []
    
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"RapidOCR markers:            {len(rapidocr_filtered)}")
    print(f"GLM Handwriting OCR markers: {len(glm_filtered)}")
    
    rapidocr_numbers = set(r['number'] for r in rapidocr_filtered)
    glm_numbers = set(r['number'] for r in glm_filtered)
    
    print(f"\nRapidOCR unique markers: {sorted(rapidocr_numbers)}")
    print(f"GLM unique markers:      {sorted(glm_numbers)}")
    
    only_rapidocr = rapidocr_numbers - glm_numbers
    only_glm = glm_numbers - rapidocr_numbers
    common = rapidocr_numbers & glm_numbers
    
    print(f"\nCommon markers:      {sorted(common)}")
    print(f"Only in RapidOCR:    {sorted(only_rapidocr)}")
    print(f"Only in GLM OCR:     {sorted(only_glm)}")
    print("=" * 70)


if __name__ == "__main__":
    main()
