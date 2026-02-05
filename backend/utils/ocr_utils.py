"""
OCR utility functions for patent drawing marker recognition.

This module provides helper functions for OCR processing, including:
- RapidOCR engine initialization and management
- OCR result format transformation
- Result deduplication based on position and confidence
- Confidence filtering
- Matching with reference maps
- Statistics calculation
"""

import re
import logging
from typing import List, Dict, Tuple, Optional
from io import BytesIO
import numpy as np
import cv2
from PIL import Image

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
    logging.warning("psutil not available, memory monitoring disabled")

# Configure logging
logger = logging.getLogger(__name__)

# Global OCR engine instance (singleton pattern)
_ocr_engine = None


def initialize_ocr_engine():
    """
    Initialize RapidOCR engine with optimized parameters for patent drawings.
    
    Uses singleton pattern to avoid repeated model loading.
    Configured for:
    - CPU-only operation (2GB server constraint)
    - English and numeric character recognition
    - White background with black text optimization
    - Lower text score threshold for better detection
    
    Returns:
        RapidOCR: Initialized OCR engine instance
        
    Raises:
        RuntimeError: If RapidOCR initialization fails
    """
    global _ocr_engine
    
    if _ocr_engine is not None:
        return _ocr_engine
    
    try:
        from rapidocr_onnxruntime import RapidOCR
        
        # Initialize RapidOCR with optimized parameters for patent drawings
        # text_score: Lower threshold to detect more markers (default 0.5)
        # box_thresh: Lower threshold for text box detection (default 0.5)
        _ocr_engine = RapidOCR(
            text_score=0.25,  # 进一步降低阈值，提高检测率
            box_thresh=0.25   # 进一步降低文本框检测阈值
        )

        logger.info("RapidOCR engine initialized with optimized parameters (text_score=0.25, box_thresh=0.25)")
        return _ocr_engine
        
    except ImportError as e:
        logger.error(f"Failed to import RapidOCR: {str(e)}")
        raise RuntimeError(
            "RapidOCR not installed. Please install: pip install rapidocr-onnxruntime"
        )
    except Exception as e:
        logger.error(f"Failed to initialize RapidOCR: {str(e)}")
        raise RuntimeError(f"OCR engine initialization failed: {str(e)}")


def check_memory_available(required_mb: int = 500) -> bool:
    """
    Check if sufficient memory is available for OCR processing.
    
    Args:
        required_mb: Required memory in MB (default: 500MB)
        
    Returns:
        bool: True if sufficient memory available
        
    Raises:
        MemoryError: If insufficient memory available
    """
    if not PSUTIL_AVAILABLE:
        # If psutil not available, assume memory is sufficient
        logger.warning("Memory monitoring unavailable (psutil not installed)")
        return True
    
    try:
        available_mb = psutil.virtual_memory().available / (1024 * 1024)
        
        if available_mb < required_mb:
            raise MemoryError(
                f"Insufficient memory: {available_mb:.0f}MB available, "
                f"{required_mb}MB required"
            )
        
        logger.debug(f"Memory check passed: {available_mb:.0f}MB available")
        return True
        
    except Exception as e:
        logger.error(f"Memory check failed: {str(e)}")
        # Don't block processing if memory check fails
        return True


def transform_rapidocr_result(rapid_result) -> List[Dict]:
    """
    Transform RapidOCR output format to unified format.
    
    RapidOCR returns: [
        [
            [[x1,y1], [x2,y2], [x3,y3], [x4,y4]],
            'text',
            confidence_float
        ],
        ...
    ]
    
    Unified format: [
        {
            'number': str,        # Recognized text
            'x': int,             # Center X coordinate
            'y': int,             # Center Y coordinate
            'width': int,         # Bounding box width
            'height': int,        # Bounding box height
            'confidence': float   # Confidence score (0-100)
        },
        ...
    ]
    
    Args:
        rapid_result: RapidOCR detection results
        
    Returns:
        List[Dict]: Transformed results in unified format
    """
    if not rapid_result:
        return []
    
    results = []
    
    for detection in rapid_result:
        try:
            if not detection or len(detection) < 3:
                continue
                
            box, text, score = detection
            
            # Calculate bounding box from corners
            xs = [point[0] for point in box]
            ys = [point[1] for point in box]
            
            x_min, x_max = min(xs), max(xs)
            y_min, y_max = min(ys), max(ys)
            
            width = x_max - x_min
            height = y_max - y_min
            center_x = (x_min + x_max) / 2
            center_y = (y_min + y_max) / 2
            
            # Convert score to float first (RapidOCR returns string), then scale to 0-100
            confidence_score = float(score) * 100 if isinstance(score, str) else score * 100
            
            results.append({
                'number': text.strip(),
                'x': int(center_x),
                'y': int(center_y),
                'width': int(width),
                'height': int(height),
                'confidence': confidence_score
            })
            
        except (ValueError, IndexError, TypeError) as e:
            logger.warning(f"Failed to transform detection result: {str(e)}")
            continue
    
    return results


def preprocess_image_for_ocr(image: np.ndarray) -> List[np.ndarray]:
    """
    预处理图像以提高OCR识别率（优化版，减少处理变体，提高速度）

    Args:
        image: 输入图像（BGR格式）

    Returns:
        List[np.ndarray]: 预处理后的图像列表
    """
    processed_images = []

    # 1. 原图（最重要）
    processed_images.append(image.copy())

    # 2. 灰度化 + 对比度增强（CLAHE）- 效果最好的预处理
    try:
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()

        # CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        processed_images.append(cv2.cvtColor(enhanced, cv2.COLOR_GRAY2BGR))

    except Exception as e:
        logger.warning(f"Image preprocessing failed: {str(e)}, using original image only")

    return processed_images


def filter_alphanumeric_markers(ocr_results: List[Dict]) -> List[Dict]:
    """
    Filter OCR results to only include alphanumeric markers.
    
    Patent drawing markers typically follow patterns like:
    - Pure numbers: "1", "10", "25", "100"
    - Letters: "A", "B", "C"
    - Letter combinations: "A1", "B2", "C3"
    - Mixed: "12a", "3B", "10A"
    
    Filters out:
    - Chinese characters
    - Special symbols
    - Long text strings
    - Non-marker content
    
    Args:
        ocr_results: OCR detection results
        
    Returns:
        List[Dict]: Filtered results containing only alphanumeric markers
    """
    if not ocr_results:
        return []
    
    filtered = []
    
    # 更宽松的模式匹配，支持更多格式
    # - 纯数字: 1, 10, 100
    # - 字母+数字: A1, B2
    # - 数字+字母: 1A, 2B, 10a
    # - 纯字母: A, B, C
    # - 带撇号: 1', 2', 10'
    pattern = re.compile(r"^[0-9]+[A-Za-z]*'*$|^[A-Z]+[0-9]*[a-z]*'*$|^[A-Za-z]'*$", re.IGNORECASE)
    
    for result in ocr_results:
        text = result['number'].strip()
        
        # 清理常见的OCR错误
        # 移除前后的标点符号
        text = re.sub(r'^[^\w]+|[^\w]+$', '', text)
        
        # 跳过空文本
        if not text:
            continue
        
        # 放宽长度限制到8个字符（支持更长标记）
        if len(text) > 8:
            logger.debug(f"Filtered out too long text: '{text}' (length: {len(text)})")
            continue
        
        # 检查是否匹配标记模式
        if pattern.match(text):
            # 更新清理后的文本
            result['number'] = text
            filtered.append(result)
        else:
            logger.debug(f"Filtered out non-marker text: '{text}'")
    
    return filtered


def perform_ocr(
    image_data: bytes,
    use_angle_cls: bool = True,
    use_text_score: bool = True,
    timeout_seconds: int = 60
) -> List[Dict]:
    """
    Perform OCR on image data using RapidOCR.
    
    Optimized for patent drawing marker recognition:
    - White background with black lines
    - Alphanumeric markers (numbers, letters, combinations)
    - Consistent marker height with guide lines
    
    Args:
        image_data: Raw image bytes (PNG, JPEG, etc.)
        use_angle_cls: Whether to use angle classification for rotated text
        use_text_score: Whether to return confidence scores
        timeout_seconds: Maximum processing time in seconds (default: 60)
        
    Returns:
        List[Dict]: Detected text regions with format:
            [
                {
                    'number': str,        # Recognized text
                    'x': int,             # Center X coordinate
                    'y': int,             # Center Y coordinate
                    'width': int,         # Bounding box width
                    'height': int,        # Bounding box height
                    'confidence': float   # Confidence score (0-100)
                },
                ...
            ]
    
    Raises:
        RuntimeError: If RapidOCR initialization fails
        ValueError: If image_data is invalid
        TimeoutError: If processing exceeds timeout_seconds
    """
    import time
    from threading import Thread
    
    result_container = {'result': None, 'error': None}
    
    def ocr_worker():
        """Worker function to run OCR in a separate thread."""
        try:
            # Check memory availability before processing
            check_memory_available(required_mb=500)
            
            # Initialize OCR engine (singleton)
            logger.info("Initializing RapidOCR engine...")
            ocr_engine = initialize_ocr_engine()
            logger.info("RapidOCR engine ready")
            
            # Convert image bytes to numpy array using Pillow (more reliable for various formats)
            try:
                # Use Pillow to decode image (supports more formats than OpenCV)
                pil_image = Image.open(BytesIO(image_data))
                
                # Convert to RGB if needed (handle RGBA, grayscale, etc.)
                if pil_image.mode not in ('RGB', 'L'):
                    pil_image = pil_image.convert('RGB')
                
                # Convert PIL Image to numpy array for OpenCV
                image = np.array(pil_image)
                
                # Convert RGB to BGR for OpenCV (if color image)
                if len(image.shape) == 3 and image.shape[2] == 3:
                    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
                
                if image is None or image.size == 0:
                    raise ValueError("Failed to decode image data")
                    
            except Exception as e:
                logger.error(f"Failed to decode image: {str(e)}")
                raise ValueError(f"Invalid image data: {str(e)}")
            
            # 多尺度预处理：生成多个候选图像
            img_shape = image.shape
            logger.info(f"Starting multi-scale OCR on image of size {img_shape[0]}x{img_shape[1]}")
            
            processed_images = preprocess_image_for_ocr(image)
            logger.info(f"Generated {len(processed_images)} preprocessed variants")
            
            # 对每个预处理图像进行OCR，合并结果
            all_results = []
            
            for idx, proc_img in enumerate(processed_images):
                try:
                    result, elapse = ocr_engine(proc_img)
                    
                    # Handle elapse time
                    if elapse is not None:
                        if isinstance(elapse, (list, tuple)):
                            total_time = sum(elapse) if elapse else 0
                            logger.info(f"OCR variant {idx+1} completed in {total_time:.2f}s")
                        else:
                            logger.info(f"OCR variant {idx+1} completed in {elapse:.2f}s")
                    
                    if result and len(result) > 0:
                        # Transform and add to results
                        transformed = transform_rapidocr_result(result)
                        all_results.extend(transformed)
                        logger.info(f"Variant {idx+1} detected {len(transformed)} items")
                        
                except Exception as e:
                    logger.warning(f"OCR variant {idx+1} failed: {str(e)}")
                    continue
            
            if not all_results:
                logger.info("No text detected in any image variant")
                result_container['result'] = []
                return
            
            # 合并和去重所有结果
            logger.info(f"Total detections before deduplication: {len(all_results)}")
            
            # Filter to only include alphanumeric markers
            filtered_results = filter_alphanumeric_markers(all_results)
            
            # 去重（位置相近的保留置信度最高的）
            deduplicated_results = deduplicate_results(filtered_results, position_threshold=30)
            
            logger.info(f"OCR completed: {len(deduplicated_results)} unique markers detected")
            
            result_container['result'] = deduplicated_results
            
        except Exception as e:
            result_container['error'] = e
    
    # Start OCR in a separate thread
    thread = Thread(target=ocr_worker)
    thread.daemon = True
    thread.start()
    
    # Wait for completion with timeout
    thread.join(timeout=timeout_seconds)
    
    if thread.is_alive():
        # Timeout occurred
        logger.error(f"OCR processing timeout after {timeout_seconds} seconds")
        raise TimeoutError(f"OCR processing exceeded {timeout_seconds} seconds timeout")
    
    # Check for errors
    if result_container['error'] is not None:
        error = result_container['error']
        if isinstance(error, (RuntimeError, ValueError)):
            raise error
        else:
            raise RuntimeError(f"OCR processing error: {str(error)}")
    
    return result_container['result']


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
