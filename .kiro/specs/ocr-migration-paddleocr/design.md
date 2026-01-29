# Design Document: OCR Migration to RapidOCR

## Overview

This design document outlines the migration from Tesseract OCR to RapidOCR for patent drawing marker recognition. The migration aims to reduce dependencies, improve performance on resource-constrained servers (2-core, 2GB RAM), and maintain API compatibility with existing code.

RapidOCR is a lightweight OCR toolkit based on PaddleOCR models but optimized for deployment with minimal dependencies. It uses ONNX runtime for efficient inference and provides excellent recognition accuracy for alphanumeric characters on patent drawings.

### Key Design Goals

1. **Zero Breaking Changes**: Maintain exact API compatibility with existing OCR_Utils interface
2. **Resource Efficiency**: Optimize for 2-core 2GB server constraints
3. **Recognition Quality**: Match or exceed Tesseract accuracy for patent drawing markers
4. **Minimal Dependencies**: Remove heavy dependencies (tesseract binary, pytesseract, pillow)
5. **Simple Integration**: Drop-in replacement requiring minimal code changes

## Architecture

### Current Architecture (Tesseract-based)

```
┌─────────────────────────────────────┐
│  Drawing_Marker_Route               │
│  (backend/routes/drawing_marker.py) │
└──────────────┬──────────────────────┘
               │
               │ calls
               ▼
┌─────────────────────────────────────┐
│  OCR_Utils                          │
│  (backend/utils/ocr_utils.py)      │
│  - deduplicate_results()            │
│  - filter_by_confidence()           │
│  - match_with_reference_map()       │
│  - calculate_statistics()           │
└──────────────┬──────────────────────┘
               │
               │ uses
               ▼
┌─────────────────────────────────────┐
│  Tesseract OCR Engine               │
│  - pytesseract wrapper              │
│  - tesseract binary                 │
│  - PIL/Pillow for preprocessing     │
└─────────────────────────────────────┘
```

### New Architecture (RapidOCR-based)

```
┌─────────────────────────────────────┐
│  Drawing_Marker_Route               │
│  (backend/routes/drawing_marker.py) │
└──────────────┬──────────────────────┘
               │
               │ calls (same interface)
               ▼
┌─────────────────────────────────────┐
│  OCR_Utils                          │
│  (backend/utils/ocr_utils.py)      │
│  - deduplicate_results()            │
│  - filter_by_confidence()           │
│  - match_with_reference_map()       │
│  - calculate_statistics()           │
│  + perform_ocr() [NEW]              │
└──────────────┬──────────────────────┘
               │
               │ uses
               ▼
┌─────────────────────────────────────┐
│  RapidOCR Engine                    │
│  - rapidocr_onnxruntime             │
│  - ONNX models (bundled)            │
│  - Built-in preprocessing           │
└─────────────────────────────────────┘
```

### Key Architectural Changes

1. **New OCR Function**: Add `perform_ocr()` function to OCR_Utils that encapsulates RapidOCR logic
2. **Inline OCR Logic**: Move OCR processing from Drawing_Marker_Route into OCR_Utils for better separation of concerns
3. **Simplified Preprocessing**: Leverage RapidOCR's built-in preprocessing instead of manual PIL operations
4. **Model Management**: Use RapidOCR's automatic model downloading and caching

## Components and Interfaces

### 1. OCR_Utils Module (backend/utils/ocr_utils.py)

#### New Function: perform_ocr()

```python
def perform_ocr(
    image_data: bytes,
    use_angle_cls: bool = True,
    use_text_score: bool = True
) -> List[Dict]:
    """
    Perform OCR on image data using RapidOCR.
    
    Args:
        image_data: Raw image bytes (PNG, JPEG, etc.)
        use_angle_cls: Whether to use angle classification for rotated text
        use_text_score: Whether to return confidence scores
        
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
    """
```

**Implementation Strategy**:
- Initialize RapidOCR engine with optimized parameters for patent drawings
- Configure character whitelist: `0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ`
- Process image through RapidOCR detection → recognition pipeline
- Transform RapidOCR output format to match current Tesseract output format
- Filter results to only include alphanumeric markers
- Calculate confidence scores (RapidOCR returns 0-1, convert to 0-100)

#### Existing Functions (No Changes)

All existing utility functions remain unchanged:
- `deduplicate_results()`: Remove duplicate detections based on position
- `filter_by_confidence()`: Filter results by minimum confidence threshold
- `match_with_reference_map()`: Match detected markers with specification
- `calculate_statistics()`: Compute recognition statistics

### 2. Drawing_Marker_Route (backend/routes/drawing_marker.py)

#### Refactoring Strategy

**Current Implementation Issues**:
- OCR logic is embedded directly in the route handler (200+ lines)
- Multiple preprocessing methods tested inline
- Tesseract configuration mixed with business logic
- Difficult to test and maintain

**New Implementation**:
- Extract all OCR logic to `OCR_Utils.perform_ocr()`
- Route handler focuses on:
  - Request validation
  - Specification parsing (extract_reference_markers)
  - Calling perform_ocr() for each drawing
  - Response formatting
- Cleaner separation of concerns

**Modified Flow**:

```python
@drawing_marker_bp.route('/drawing-marker/process', methods=['POST'])
def process_drawing_marker():
    # 1. Validate request
    # 2. Parse specification to extract reference_map
    # 3. For each drawing:
    #    a. Decode base64 image data
    #    b. Call perform_ocr(image_data)  # NEW: Use RapidOCR
    #    c. Apply deduplicate_results()
    #    d. Apply filter_by_confidence()
    #    e. Match with reference_map
    # 4. Calculate statistics
    # 5. Return response
```

### 3. RapidOCR Configuration

#### Initialization Parameters

```python
from rapidocr_onnxruntime import RapidOCR

# Optimized for patent drawings
ocr_engine = RapidOCR(
    det_model_dir=None,  # Use default detection model
    rec_model_dir=None,  # Use default recognition model
    cls_model_dir=None,  # Use default classification model
    use_angle_cls=True,  # Handle rotated text
    use_gpu=False,       # CPU-only for 2GB server
    print_verbose=False, # Suppress debug output
    min_height=10,       # Minimum text height (pixels)
    text_score=0.5,      # Minimum recognition confidence
    box_thresh=0.5,      # Minimum detection confidence
)
```

#### Character Recognition Configuration

RapidOCR doesn't have a built-in character whitelist like Tesseract, so we'll implement post-processing filtering:

```python
import re

def filter_alphanumeric_markers(ocr_results):
    """Filter OCR results to only include alphanumeric markers."""
    filtered = []
    pattern = re.compile(r'^[0-9]+[A-Z]*$')
    
    for result in ocr_results:
        text = result['text'].strip()
        if pattern.match(text):
            filtered.append(result)
    
    return filtered
```

## Data Models

### OCR Result Format

Both Tesseract and RapidOCR outputs are transformed to this unified format:

```python
{
    'number': str,        # Recognized text (e.g., "1", "2A", "10")
    'x': int,             # Center X coordinate in pixels
    'y': int,             # Center Y coordinate in pixels
    'width': int,         # Bounding box width in pixels
    'height': int,        # Bounding box height in pixels
    'confidence': float   # Confidence score (0-100)
}
```

### RapidOCR Native Output Format

RapidOCR returns results in this format:

```python
[
    [
        [[x1, y1], [x2, y2], [x3, y3], [x4, y4]],  # Bounding box corners
        'recognized_text',                          # Detected text
        confidence_score                            # Float 0-1
    ],
    ...
]
```

### Transformation Logic

```python
def transform_rapidocr_result(rapid_result):
    """Transform RapidOCR output to unified format."""
    results = []
    
    for detection in rapid_result:
        box, text, score = detection
        
        # Calculate bounding box from corners
        xs = [point[0] for point in box]
        ys = [point[1] for point in box]
        
        x_min, x_max = min(xs), max(xs)
        y_min, y_max = min(ys), max(ys)
        
        width = x_max - x_min
        height = y_max - y_min
        center_x = (x_min + x_max) // 2
        center_y = (y_min + y_max) // 2
        
        results.append({
            'number': text.strip(),
            'x': int(center_x),
            'y': int(center_y),
            'width': int(width),
            'height': int(height),
            'confidence': float(score * 100)  # Convert 0-1 to 0-100
        })
    
    return results
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing the acceptance criteria, I identified the following testable properties. Let me review for redundancy:

**Identified Properties**:
1. API compatibility - function signatures match (2.1)
2. Return format consistency (2.2)
3. Alphanumeric marker recognition (3.1, 3.2, 3.3, 3.4)
4. Performance within time limits (5.1)
5. Memory usage constraints (5.2)
6. Concurrent request handling (5.4)
7. Recognition accuracy vs baseline (6.1)
8. High accuracy on clear images (6.2)
9. Confidence score behavior (6.3)
10. Robustness to variations (6.4)
11. Response format consistency (7.3)

**Redundancy Analysis**:
- Properties 3.2, 3.3, 3.4 are specific cases of 3.1 (alphanumeric recognition). These can be combined into one comprehensive property that tests all marker types.
- Property 6.2 (95% accuracy on clear images) is a specific case of 6.1 (accuracy vs baseline). However, 6.2 provides a concrete target while 6.1 is comparative. Both provide unique value.
- Property 2.2 and 7.3 both test response format consistency but at different levels (utility function vs API endpoint). Both are valuable for different integration points.

**Consolidated Properties**:
After reflection, I'll combine properties 3.1-3.4 into a single comprehensive marker recognition property.

### Testable Properties

**Property 1: API Function Signature Compatibility**
*For any* existing function call to OCR_Utils functions (deduplicate_results, filter_by_confidence, match_with_reference_map, calculate_statistics), the function should accept the same parameters and execute without signature errors.
**Validates: Requirements 2.1**

**Property 2: OCR Result Format Consistency**
*For any* valid image input to perform_ocr(), the returned data structure should contain the required fields (number, x, y, width, height, confidence) with correct types.
**Validates: Requirements 2.2**

**Property 3: Comprehensive Marker Recognition**
*For any* patent drawing image containing alphanumeric markers (pure numbers like "10", letters like "A", letter combinations like "B1", or mixed like "12a"), the OCR system should detect and recognize these markers.
**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

**Property 4: Processing Time Bounds**
*For any* patent drawing image (few hundred KB), OCR processing should complete within 10 seconds on a 2-core CPU.
**Validates: Requirements 5.1**

**Property 5: Memory Usage Constraints**
*For any* single OCR processing operation, peak memory usage should not exceed 1.5GB.
**Validates: Requirements 5.2**

**Property 6: Concurrent Request Memory Safety**
*For any* set of concurrent OCR requests (up to 5 simultaneous), total memory usage should not exceed 1.8GB.
**Validates: Requirements 5.4**

**Property 7: Recognition Accuracy Baseline**
*For any* test image with known ground truth markers, RapidOCR recognition accuracy should be equal to or greater than Tesseract baseline accuracy.
**Validates: Requirements 6.1**

**Property 8: High Confidence Recognition Accuracy**
*For any* clear patent drawing image with high-contrast markers, character-level recognition accuracy should be at least 95%.
**Validates: Requirements 6.2**

**Property 9: Confidence Score Threshold Behavior**
*For any* OCR detection result, if the marker cannot be recognized with high confidence, the confidence score should be below 70.
**Validates: Requirements 6.3**

**Property 10: Robustness to Drawing Variations**
*For any* patent drawing with common variations (varying font sizes, bold text, italic text), the OCR system should successfully detect markers without errors.
**Validates: Requirements 6.4**

**Property 11: API Response Format Consistency**
*For any* valid request to the /drawing-marker/process endpoint, the JSON response should maintain the same structure as the current implementation (drawings array, reference_map, statistics fields).
**Validates: Requirements 7.3**

## Error Handling

### Error Categories

#### 1. Initialization Errors

**Scenario**: RapidOCR fails to initialize (missing models, corrupted files)

**Handling**:
```python
try:
    ocr_engine = RapidOCR(...)
except Exception as e:
    logger.error(f"Failed to initialize RapidOCR: {str(e)}")
    raise RuntimeError("OCR engine initialization failed. Please check model files.")
```

**Response**: HTTP 500 with error message indicating OCR service unavailable

#### 2. Invalid Image Data

**Scenario**: Image data is corrupted, wrong format, or cannot be decoded

**Handling**:
```python
try:
    image = Image.open(BytesIO(image_data))
except Exception as e:
    logger.error(f"Failed to decode image: {str(e)}")
    raise ValueError("Invalid image data. Supported formats: PNG, JPEG, BMP")
```

**Response**: HTTP 400 with error message indicating invalid image format

#### 3. OCR Processing Errors

**Scenario**: RapidOCR encounters an error during processing

**Handling**:
```python
try:
    result = ocr_engine(image_array)
except Exception as e:
    logger.error(f"OCR processing failed: {str(e)}")
    return []  # Return empty results, don't crash
```

**Response**: Continue processing, return empty detection list for that image

#### 4. Memory Exhaustion

**Scenario**: Image is too large or system runs out of memory

**Handling**:
```python
import psutil

def check_memory_available(required_mb=500):
    """Check if sufficient memory is available."""
    available = psutil.virtual_memory().available / (1024 * 1024)
    if available < required_mb:
        raise MemoryError(f"Insufficient memory: {available:.0f}MB available, {required_mb}MB required")

# Before processing large images
check_memory_available()
```

**Response**: HTTP 503 with error message indicating server resource constraints

#### 5. Timeout Errors

**Scenario**: OCR processing takes too long

**Handling**:
```python
import signal

def timeout_handler(signum, frame):
    raise TimeoutError("OCR processing timeout")

# Set 10-second timeout
signal.signal(signal.SIGALRM, timeout_handler)
signal.alarm(10)

try:
    result = perform_ocr(image_data)
finally:
    signal.alarm(0)  # Cancel alarm
```

**Response**: HTTP 504 with error message indicating processing timeout

### Error Response Format

All errors maintain consistent JSON format:

```python
{
    "success": false,
    "error": "Error message describing what went wrong",
    "error_code": "SPECIFIC_ERROR_CODE",
    "timestamp": "2024-01-15T10:30:00Z"
}
```

### Graceful Degradation

When processing multiple drawings:
- If one drawing fails, continue processing others
- Include error information in that drawing's result
- Return partial success with warnings

```python
{
    "success": true,
    "data": {
        "drawings": [
            {
                "name": "drawing1.png",
                "detected_numbers": [...],
                "status": "success"
            },
            {
                "name": "drawing2.png",
                "detected_numbers": [],
                "status": "error",
                "error": "Failed to decode image"
            }
        ],
        "warnings": ["1 of 2 drawings failed to process"]
    }
}
```

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs

Both testing approaches are complementary and necessary. Unit tests catch concrete bugs with specific inputs, while property tests verify general correctness across a wide range of inputs.

### Property-Based Testing Configuration

**Library**: Use `hypothesis` for Python property-based testing

**Configuration**:
- Minimum 100 iterations per property test (due to randomization)
- Each property test must reference its design document property
- Tag format: `# Feature: ocr-migration-paddleocr, Property {number}: {property_text}`

**Example Property Test Structure**:

```python
from hypothesis import given, strategies as st
import pytest

# Feature: ocr-migration-paddleocr, Property 2: OCR Result Format Consistency
@given(image_data=st.binary(min_size=100, max_size=10000))
@pytest.mark.property_test
def test_ocr_result_format_consistency(image_data):
    """
    Property: For any valid image input, perform_ocr() returns 
    data with required fields and correct types.
    """
    try:
        results = perform_ocr(image_data)
        
        # Verify structure
        assert isinstance(results, list)
        
        for result in results:
            assert isinstance(result, dict)
            assert 'number' in result
            assert 'x' in result
            assert 'y' in result
            assert 'width' in result
            assert 'height' in result
            assert 'confidence' in result
            
            # Verify types
            assert isinstance(result['number'], str)
            assert isinstance(result['x'], int)
            assert isinstance(result['y'], int)
            assert isinstance(result['width'], int)
            assert isinstance(result['height'], int)
            assert isinstance(result['confidence'], (int, float))
            
            # Verify ranges
            assert 0 <= result['confidence'] <= 100
            assert result['width'] > 0
            assert result['height'] > 0
    except (ValueError, RuntimeError):
        # Invalid image data is acceptable
        pass
```

### Unit Testing Strategy

**Test Categories**:

1. **Initialization Tests**
   - Test RapidOCR engine initializes successfully
   - Test initialization with invalid configuration fails gracefully

2. **Format Transformation Tests**
   - Test RapidOCR output transforms to expected format
   - Test edge cases (empty results, single result, many results)

3. **Integration Tests**
   - Test end-to-end flow with sample patent drawings
   - Test API endpoint returns expected response structure
   - Test error handling with invalid inputs

4. **Regression Tests**
   - Test against known patent drawing samples
   - Compare results with Tesseract baseline
   - Verify accuracy metrics

5. **Performance Tests**
   - Test processing time stays within bounds
   - Test memory usage stays within limits
   - Test concurrent request handling

**Test Data**:
- Create test dataset with 20+ patent drawing images
- Include variations: different sizes, fonts, marker types
- Include edge cases: rotated text, low contrast, noise
- Include ground truth annotations for accuracy measurement

### Example Unit Tests

```python
def test_rapidocr_initialization():
    """Test that RapidOCR initializes without errors."""
    from backend.utils.ocr_utils import initialize_ocr_engine
    
    engine = initialize_ocr_engine()
    assert engine is not None


def test_perform_ocr_with_sample_image():
    """Test OCR on a known patent drawing sample."""
    with open('tests/fixtures/patent_drawing_sample.png', 'rb') as f:
        image_data = f.read()
    
    results = perform_ocr(image_data)
    
    # Verify we got results
    assert len(results) > 0
    
    # Verify expected markers are detected
    detected_numbers = {r['number'] for r in results}
    assert '1' in detected_numbers
    assert '2' in detected_numbers


def test_api_endpoint_response_format():
    """Test that API endpoint returns expected JSON structure."""
    response = client.post('/drawing-marker/process', json={
        'drawings': [test_drawing_data],
        'specification': '1. 底座\n2. 旋转臂'
    })
    
    assert response.status_code == 200
    data = response.json()
    
    assert 'success' in data
    assert 'data' in data
    assert 'drawings' in data['data']
    assert 'reference_map' in data['data']
    assert 'match_rate' in data['data']


def test_error_handling_invalid_image():
    """Test error handling with invalid image data."""
    response = client.post('/drawing-marker/process', json={
        'drawings': [{'name': 'test.png', 'data': 'invalid_base64'}],
        'specification': '1. 底座'
    })
    
    # Should handle gracefully, not crash
    assert response.status_code in [400, 500]
    data = response.json()
    assert 'error' in data or 'warnings' in data['data']
```

### Performance Testing

```python
import time
import psutil
import pytest

def test_processing_time_within_bounds():
    """Test that OCR processing completes within time limit."""
    with open('tests/fixtures/patent_drawing_medium.png', 'rb') as f:
        image_data = f.read()
    
    start_time = time.time()
    results = perform_ocr(image_data)
    elapsed = time.time() - start_time
    
    assert elapsed < 10.0, f"Processing took {elapsed:.2f}s, expected < 10s"


def test_memory_usage_within_bounds():
    """Test that memory usage stays within limits."""
    process = psutil.Process()
    
    # Measure baseline memory
    baseline_mb = process.memory_info().rss / (1024 * 1024)
    
    # Process image
    with open('tests/fixtures/patent_drawing_large.png', 'rb') as f:
        image_data = f.read()
    
    results = perform_ocr(image_data)
    
    # Measure peak memory
    peak_mb = process.memory_info().rss / (1024 * 1024)
    memory_used = peak_mb - baseline_mb
    
    assert memory_used < 1500, f"Used {memory_used:.0f}MB, expected < 1500MB"
```

### Continuous Integration

**Test Execution**:
- Run all unit tests on every commit
- Run property tests (100 iterations) on every PR
- Run performance tests on release candidates
- Run regression tests against baseline weekly

**Coverage Requirements**:
- Minimum 80% code coverage for new OCR_Utils functions
- 100% coverage for error handling paths
- All 11 correctness properties must have corresponding tests

## Implementation Notes

### Migration Checklist

1. **Install RapidOCR**
   ```bash
   pip install rapidocr-onnxruntime
   ```

2. **Update requirements.txt**
   - Remove: `tesseract`, `pytesseract`, `pillow`
   - Add: `rapidocr-onnxruntime`

3. **Implement perform_ocr() in OCR_Utils**
   - Initialize RapidOCR engine
   - Implement format transformation
   - Add error handling

4. **Refactor Drawing_Marker_Route**
   - Replace inline Tesseract code with perform_ocr() calls
   - Remove PIL preprocessing code
   - Simplify route handler logic

5. **Test Migration**
   - Run unit tests
   - Run property tests
   - Compare accuracy with Tesseract baseline
   - Verify memory usage

6. **Remove Legacy Code**
   - Delete Tesseract imports
   - Remove PIL preprocessing functions
   - Clean up commented code

### Deployment Considerations

**Server Requirements**:
- Python 3.8+
- 2GB RAM minimum
- 2 CPU cores
- 500MB disk space for models

**Model Management**:
- RapidOCR automatically downloads models on first run
- Models cached in `~/.rapidocr/` directory
- Total model size: ~50MB

**Performance Tuning**:
- Adjust `text_score` threshold based on accuracy requirements
- Adjust `box_thresh` for detection sensitivity
- Consider image resizing for very large images (>5MB)

### Backward Compatibility

**API Compatibility**: 100% backward compatible
- All existing function signatures unchanged
- Response format identical
- Error handling consistent

**Breaking Changes**: None

**Deprecations**: None

### Future Enhancements

1. **GPU Support**: Add optional GPU acceleration for higher throughput
2. **Batch Processing**: Optimize for processing multiple images simultaneously
3. **Custom Models**: Train custom models on patent drawing dataset
4. **Caching**: Cache OCR results for identical images
5. **Preprocessing Options**: Expose preprocessing parameters via API
