# Implementation Plan: OCR Migration to RapidOCR

## Overview

This implementation plan outlines the step-by-step migration from Tesseract OCR to RapidOCR for patent drawing marker recognition. The migration maintains complete API compatibility while improving performance and reducing dependencies.

## Tasks

- [x] 1. Update dependencies and install RapidOCR
  - Update requirements.txt: remove pytesseract, keep Pillow, add rapidocr-onnxruntime
  - Test installation on clean environment
  - _Requirements: 4.1, 4.2_

- [x] 2. Implement core RapidOCR functionality in OCR_Utils
  - [x] 2.1 Create RapidOCR engine initialization function
    - Implement initialize_ocr_engine() with optimized parameters
    - Configure for CPU-only operation (2GB server constraint)
    - Add error handling for initialization failures
    - _Requirements: 1.1, 1.3, 5.2_
  
  - [x] 2.2 Implement OCR result format transformation
    - Create transform_rapidocr_result() function
    - Convert RapidOCR bounding box format to unified format
    - Convert confidence scores from 0-1 to 0-100 scale
    - Calculate center coordinates from corner points
    - _Requirements: 2.2_
  
  - [x] 2.3 Implement alphanumeric marker filtering
    - Create filter_alphanumeric_markers() function
    - Use regex pattern to match numbers, letters, and combinations
    - Filter out non-marker text (Chinese characters, symbols)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [x] 2.4 Implement main perform_ocr() function
    - Accept image_data bytes as input
    - Initialize RapidOCR engine (singleton pattern)
    - Process image through RapidOCR
    - Transform results to unified format
    - Apply alphanumeric filtering
    - Add comprehensive error handling
    - _Requirements: 1.1, 2.1, 2.2, 8.1, 8.2, 8.5_
  
  - [ ]* 2.5 Write property test for OCR result format consistency
    - **Property 2: OCR Result Format Consistency**
    - **Validates: Requirements 2.2**
  
  - [ ]* 2.6 Write unit tests for format transformation
    - Test transform_rapidocr_result() with sample data
    - Test edge cases (empty results, single result, many results)
    - Verify coordinate calculations
    - Verify confidence score conversion
    - _Requirements: 2.2_

- [x] 3. Refactor Drawing_Marker_Route to use RapidOCR
  - [x] 3.1 Remove Tesseract imports and configuration
    - Delete pytesseract imports
    - Delete PIL/Pillow preprocessing code
    - Remove Tesseract path configuration logic
    - _Requirements: 4.3, 4.4_
  
  - [x] 3.2 Replace inline OCR logic with perform_ocr() calls
    - Import perform_ocr from OCR_Utils
    - Replace Tesseract processing loop with perform_ocr() call
    - Remove manual preprocessing methods (inverted, binary, etc.)
    - Simplify image handling (decode base64, call perform_ocr)
    - _Requirements: 7.1, 7.2_
  
  - [x] 3.3 Maintain response format compatibility
    - Verify response structure matches original format
    - Ensure all fields present (drawings, reference_map, statistics)
    - Preserve error handling behavior
    - _Requirements: 7.3, 7.4_
  
  - [ ]* 3.4 Write integration test for API endpoint
    - Test /drawing-marker/process with sample images
    - Verify response format matches specification
    - Test with multiple drawings
    - Test with various marker types
    - _Requirements: 7.2, 7.3_
  
  - [ ]* 3.5 Write property test for API response format consistency
    - **Property 11: API Response Format Consistency**
    - **Validates: Requirements 7.3**

- [x] 4. Checkpoint - Ensure basic functionality works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement error handling and edge cases
  - [x] 5.1 Add initialization error handling
    - Catch RapidOCR initialization failures
    - Return meaningful error messages
    - Log errors for debugging
    - _Requirements: 1.3_
  
  - [x] 5.2 Add image validation and error handling
    - Validate image data before processing
    - Handle corrupted or invalid images gracefully
    - Return appropriate HTTP error codes
    - _Requirements: 2.4, 7.4_
  
  - [x] 5.3 Add timeout protection
    - Implement processing timeout (10 seconds)
    - Handle timeout errors gracefully
    - Return HTTP 504 on timeout
    - _Requirements: 5.1_
  
  - [x] 5.4 Add memory monitoring
    - Check available memory before processing
    - Raise MemoryError if insufficient memory
    - Return HTTP 503 on memory exhaustion
    - _Requirements: 5.2_
  
  - [ ]* 5.5 Write unit tests for error handling
    - Test initialization failure handling
    - Test invalid image data handling
    - Test timeout behavior
    - Test memory exhaustion handling
    - _Requirements: 2.4, 7.4_

- [x] 6. Implement performance optimizations
  - [x] 6.1 Add singleton pattern for OCR engine
    - Initialize RapidOCR once and reuse
    - Avoid repeated model loading
    - Reduce memory footprint
    - _Requirements: 5.2_
  
  - [x] 6.2 Optimize confidence thresholds
    - Set text_score to 0.5 for patent drawings
    - Set box_thresh to 0.5 for detection
    - Adjust min_height to 10 pixels
    - _Requirements: 8.4_
  
  - [x] 6.3 Add image preprocessing optimization
    - Leverage RapidOCR's built-in preprocessing
    - Remove redundant preprocessing steps
    - Optimize for white background images
    - _Requirements: 8.3_
  
  - [ ]* 6.4 Write property test for processing time bounds
    - **Property 4: Processing Time Bounds**
    - **Validates: Requirements 5.1**
  
  - [ ]* 6.5 Write property test for memory usage constraints
    - **Property 5: Memory Usage Constraints**
    - **Validates: Requirements 5.2**

- [x] 7. Checkpoint - Verify performance and resource usage
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement recognition quality tests
  - [ ] 8.1 Create test dataset with ground truth
    - Collect 20+ patent drawing samples
    - Annotate with ground truth markers
    - Include variations (sizes, fonts, marker types)
    - Include edge cases (rotated, low contrast, noise)
    - _Requirements: 6.1, 6.2_
  
  - [ ]* 8.2 Write property test for comprehensive marker recognition
    - **Property 3: Comprehensive Marker Recognition**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
  
  - [ ]* 8.3 Write property test for recognition accuracy baseline
    - **Property 7: Recognition Accuracy Baseline**
    - **Validates: Requirements 6.1**
  
  - [ ]* 8.4 Write property test for high confidence recognition accuracy
    - **Property 8: High Confidence Recognition Accuracy**
    - **Validates: Requirements 6.2**
  
  - [ ]* 8.5 Write property test for confidence score threshold behavior
    - **Property 9: Confidence Score Threshold Behavior**
    - **Validates: Requirements 6.3**
  
  - [ ]* 8.6 Write property test for robustness to drawing variations
    - **Property 10: Robustness to Drawing Variations**
    - **Validates: Requirements 6.4**
  
  - [ ]* 8.7 Write unit tests for regression testing
    - Test against known patent drawing samples
    - Compare results with expected outputs
    - Verify accuracy metrics meet targets
    - _Requirements: 6.1, 6.2_

- [ ] 9. Implement concurrent request handling tests
  - [ ]* 9.1 Write property test for concurrent request memory safety
    - **Property 6: Concurrent Request Memory Safety**
    - **Validates: Requirements 5.4**
  
  - [ ]* 9.2 Write unit tests for concurrent processing
    - Test with 5 simultaneous requests
    - Verify no memory leaks
    - Verify no race conditions
    - _Requirements: 5.4_

- [ ] 10. Verify API compatibility
  - [ ]* 10.1 Write property test for API function signature compatibility
    - **Property 1: API Function Signature Compatibility**
    - **Validates: Requirements 2.1**
  
  - [ ]* 10.2 Write unit tests for existing utility functions
    - Test deduplicate_results() still works
    - Test filter_by_confidence() still works
    - Test match_with_reference_map() still works
    - Test calculate_statistics() still works
    - _Requirements: 2.1, 2.3_

- [x] 11. Clean up and documentation
  - [x] 11.1 Remove all Tesseract-related code
    - Delete unused imports
    - Remove commented Tesseract code
    - Clean up preprocessing functions
    - _Requirements: 4.3, 4.4_
  
  - [x] 11.2 Add code documentation
    - Document perform_ocr() function
    - Document RapidOCR configuration parameters
    - Add inline comments for complex logic
    - Update module docstrings
    - _Requirements: 1.1, 8.1, 8.2_
  
  - [x] 11.3 Update deployment documentation
    - Document new dependencies
    - Document model download process
    - Document server requirements
    - Add troubleshooting guide
    - _Requirements: 4.2, 5.2_

- [x] 12. Final checkpoint - Complete migration verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties (100 iterations each)
- Unit tests validate specific examples and edge cases
- Test dataset creation (task 8.1) is critical for accuracy validation
- Singleton pattern (task 6.1) is important for memory efficiency
- API compatibility tests (task 10) ensure zero breaking changes
