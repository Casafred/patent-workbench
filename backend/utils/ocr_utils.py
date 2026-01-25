"""
OCR utility functions for patent drawing marker recognition.

This module provides helper functions for OCR processing, including:
- Result deduplication based on position and confidence
- Confidence filtering
- Matching with reference maps
- Statistics calculation
"""

from typing import List, Dict, Tuple


def deduplicate_results(results: List[Dict], position_threshold: int = 20) -> List[Dict]:
    """
    去除位置相近的重复识别结果，保留置信度最高的。
    
    Args:
        results: 原始识别结果列表，每项包含:
            - number: 识别的数字/标记
            - x, y: 中心点坐标
            - width, height: 边界框尺寸
            - confidence: 置信度 (0-100)
        position_threshold: 位置阈值（像素），小于此距离视为重复
        
    Returns:
        List[Dict]: 去重后的结果列表
    """
    if not results:
        return []
    
    deduplicated = []
    
    for result in results:
        is_duplicate = False
        
        for existing in deduplicated:
            # 检查是否是相同数字且位置相近
            if existing['number'] == result['number']:
                distance = ((existing['x'] - result['x']) ** 2 + 
                           (existing['y'] - result['y']) ** 2) ** 0.5
                
                if distance < position_threshold:
                    # 是重复项，保留置信度更高的
                    if result['confidence'] > existing['confidence']:
                        # 替换为置信度更高的结果
                        existing.update(result)
                    is_duplicate = True
                    break
        
        if not is_duplicate:
            deduplicated.append(result.copy())
    
    return deduplicated


def filter_by_confidence(results: List[Dict], min_confidence: int = 60) -> List[Dict]:
    """
    根据置信度过滤识别结果。
    
    Args:
        results: 识别结果列表
        min_confidence: 最小置信度阈值
        
    Returns:
        List[Dict]: 过滤后的结果列表
    """
    return [r for r in results if r.get('confidence', 0) >= min_confidence]


def match_with_reference_map(
    detected_numbers: List[Dict],
    reference_map: Dict[str, str]
) -> Tuple[List[Dict], List[str], List[str]]:
    """
    将OCR识别结果与参考映射匹配。
    
    Args:
        detected_numbers: OCR识别结果列表
        reference_map: 说明书中的标记映射 {编号: 名称}
        
    Returns:
        Tuple包含:
        - matched_results: 匹配成功的结果（包含name字段）
        - unknown_markers: 识别到但未在说明书中定义的标记
        - missing_markers: 说明书中定义但未识别到的标记
    """
    matched_results = []
    detected_set = set()
    unknown_markers = []
    
    # 匹配识别结果
    for detected in detected_numbers:
        number = detected['number']
        detected_set.add(number)
        
        if number in reference_map:
            # 匹配成功
            matched_results.append({
                **detected,
                'name': reference_map[number]
            })
        else:
            # 未知标记
            if number not in unknown_markers:
                unknown_markers.append(number)
    
    # 找出缺失的标记
    missing_markers = [
        marker for marker in reference_map.keys()
        if marker not in detected_set
    ]
    
    return matched_results, unknown_markers, missing_markers


def calculate_statistics(
    matched_count: int,
    total_markers: int,
    detected_numbers: List[Dict]
) -> Dict:
    """
    计算识别结果的统计信息。
    
    Args:
        matched_count: 匹配成功的数量
        total_markers: 说明书中定义的标记总数
        detected_numbers: 所有识别结果
        
    Returns:
        Dict: 统计信息，包含:
            - match_rate: 匹配率
            - avg_confidence: 平均置信度
            - suggestions: 改进建议列表
    """
    stats = {}
    
    # 计算匹配率
    if total_markers > 0:
        stats['match_rate'] = round((matched_count / total_markers) * 100, 2)
    else:
        stats['match_rate'] = 0
    
    # 计算平均置信度
    if detected_numbers:
        avg_conf = sum(d['confidence'] for d in detected_numbers) / len(detected_numbers)
        stats['avg_confidence'] = round(avg_conf, 2)
    else:
        stats['avg_confidence'] = 0
    
    # 生成建议
    suggestions = []
    
    if stats['match_rate'] < 50:
        suggestions.append("匹配率较低，建议检查图片清晰度或说明书格式")
    
    if stats['avg_confidence'] < 70:
        suggestions.append("识别置信度较低，建议提供更清晰的图片")
    
    if matched_count == 0:
        suggestions.append("未识别到任何标记，请确认图片包含数字序号且清晰可见")
    
    stats['suggestions'] = suggestions
    
    return stats
