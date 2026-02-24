"""
Smart Split Utilities for OCR Results

基于说明书标记长度智能分割OCR合并结果。
当OCR将相邻数字合并识别时（如"200103"实际是"200"和"103"），
利用说明书中的标记长度分布进行智能分割。
"""

import re
from typing import List, Dict, Optional, Tuple
from collections import Counter


def get_marker_length_distribution(spec_markers: List[str]) -> Dict:
    """
    分析说明书标记的长度分布
    
    Args:
        spec_markers: 说明书中提取的标记列表，如 ['100', '101', '102', '200', '201']
        
    Returns:
        {
            'lengths': [3, 2, 4],  # 按频率排序的长度列表
            'max_len': 4,
            'min_len': 2,
            'counter': Counter对象
        }
    """
    if not spec_markers:
        return {
            'lengths': [3, 2],  # 默认常见长度
            'max_len': 4,
            'min_len': 1,
            'counter': Counter()
        }
    
    lengths = [len(m.strip()) for m in spec_markers if m.strip()]
    
    if not lengths:
        return {
            'lengths': [3, 2],
            'max_len': 4,
            'min_len': 1,
            'counter': Counter()
        }
    
    counter = Counter(lengths)
    sorted_lengths = sorted(counter.keys(), key=lambda x: counter[x], reverse=True)
    
    return {
        'lengths': sorted_lengths,
        'max_len': max(lengths),
        'min_len': min(lengths),
        'counter': counter
    }


def find_split_pattern(total_len: int, common_lengths: List[int], max_parts: int = 3) -> Optional[List[int]]:
    """
    找到合适的分割模式
    
    例如: total_len=6, common_lengths=[3,2,4]
    尝试组合: 3+3=6 ✓ -> 返回 [3,3]
    
    Args:
        total_len: 需要分割的总长度
        common_lengths: 常见的标记长度列表（按频率排序）
        max_parts: 最大分割数量
        
    Returns:
        分割模式列表，如 [3, 3] 表示分割成两个3位数字
    """
    if total_len <= max(common_lengths) if common_lengths else 3:
        return None
    
    def find_combination(target: int, lengths: List[int], max_count: int, current: List[int] = None) -> Optional[List[int]]:
        if current is None:
            current = []
        
        if sum(current) == target:
            return current
        
        if len(current) >= max_count:
            return None
        
        if sum(current) > target:
            return None
        
        for length in lengths:
            result = find_combination(target, lengths, max_count, current + [length])
            if result:
                return result
        
        return None
    
    return find_combination(total_len, common_lengths, max_parts)


def split_text_by_pattern(text: str, pattern: List[int]) -> List[str]:
    """
    按模式分割文本
    
    Args:
        text: 要分割的文本
        pattern: 分割模式，如 [3, 3]
        
    Returns:
        分割后的文本列表
    """
    parts = []
    pos = 0
    
    for length in pattern:
        if pos + length <= len(text):
            parts.append(text[pos:pos + length])
            pos += length
    
    if pos < len(text):
        parts.append(text[pos:])
    
    return parts


def check_parts_in_spec(parts: List[str], spec_markers: List[str]) -> Tuple[bool, float]:
    """
    检查分割后的部分是否在说明书中存在
    
    Args:
        parts: 分割后的文本列表
        spec_markers: 说明书标记列表
        
    Returns:
        (是否匹配, 匹配置信度)
    """
    if not spec_markers:
        return True, 0.5
    
    spec_set = set(m.strip() for m in spec_markers)
    matched_count = sum(1 for p in parts if p in spec_set)
    
    if matched_count == len(parts):
        return True, 1.0
    elif matched_count > 0:
        return True, matched_count / len(parts)
    else:
        partial_match = sum(1 for p in parts if any(p in m or m in p for m in spec_set))
        return partial_match > 0, partial_match / len(parts) * 0.5


def smart_split_ocr_results(
    ocr_results: List[Dict],
    spec_markers: List[str],
    enable_split: bool = True
) -> List[Dict]:
    """
    基于说明书标记长度智能分割OCR合并结果
    
    Args:
        ocr_results: OCR识别结果列表
            [{'number': '200103', 'x': 100, 'y': 200, 'width': 50, 'height': 30, 'confidence': 95}]
        spec_markers: 说明书中提取的标记列表
        enable_split: 是否启用分割功能
            
    Returns:
        分割后的OCR结果列表
    """
    if not enable_split or not ocr_results:
        return ocr_results
    
    dist = get_marker_length_distribution(spec_markers)
    common_lengths = dist['lengths']
    max_spec_len = dist['max_len']
    
    split_results = []
    
    for item in ocr_results:
        text = str(item.get('number', '')).strip()
        
        # 清理文本中的非字母数字字符
        clean_text = re.sub(r'[^\w]', '', text)
        
        if not clean_text:
            continue
        
        # 检查是否需要分割
        if len(clean_text) <= max_spec_len:
            # 长度正常，不需要分割
            result = item.copy()
            result['number'] = clean_text
            split_results.append(result)
            continue
        
        # 尝试按空格分割
        if ' ' in text:
            space_parts = [re.sub(r'[^\w]', '', p) for p in text.split() if re.sub(r'[^\w]', '', p)]
            if len(space_parts) > 1:
                all_valid = all(len(p) <= max_spec_len for p in space_parts)
                if all_valid:
                    part_width = item['width'] // len(space_parts)
                    for i, part in enumerate(space_parts):
                        offset = (i - (len(space_parts) - 1) / 2) * part_width
                        split_results.append({
                            'number': part,
                            'x': int(item['x'] + offset),
                            'y': item['y'],
                            'width': part_width,
                            'height': item['height'],
                            'confidence': item.get('confidence', 100) * 0.95,
                            'is_split': True
                        })
                    continue
        
        # 尝试智能分割
        pattern = find_split_pattern(len(clean_text), common_lengths)
        
        if pattern:
            parts = split_text_by_pattern(clean_text, pattern)
            
            # 验证分割结果
            is_valid, match_conf = check_parts_in_spec(parts, spec_markers)
            
            if is_valid:
                part_width = item['width'] // len(parts)
                for i, part in enumerate(parts):
                    offset = (i - (len(parts) - 1) / 2) * part_width
                    split_results.append({
                        'number': part,
                        'x': int(item['x'] + offset),
                        'y': item['y'],
                        'width': part_width,
                        'height': item['height'],
                        'confidence': item.get('confidence', 100) * match_conf * 0.9,
                        'is_split': True
                    })
                continue
        
        # 无法分割，保留原结果但标记
        result = item.copy()
        result['number'] = clean_text
        result['possibly_merged'] = True
        split_results.append(result)
    
    return split_results


def apply_smart_split_to_ocr(
    ocr_results: List[Dict],
    spec_markers: List[str],
    ocr_mode: str = 'rapidocr'
) -> List[Dict]:
    """
    根据OCR模式应用智能分割
    
    对于云端OCR（GLM、PaddleOCR）更容易出现合并问题，默认启用分割
    对于本地OCR（RapidOCR）可以选择性启用
    
    Args:
        ocr_results: OCR识别结果
        spec_markers: 说明书标记列表
        ocr_mode: OCR模式
        
    Returns:
        处理后的结果
    """
    enable_split = ocr_mode in ['glm_ocr', 'paddle_ocr']
    
    return smart_split_ocr_results(ocr_results, spec_markers, enable_split)
