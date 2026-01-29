# Requirements Document

## Introduction

This specification defines the requirements for migrating the OCR functionality from Tesseract to RapidOCR for patent drawing marker recognition. The system currently uses Tesseract OCR with heavy dependencies (tesseract, pytesseract, pillow) that are not optimal for deployment on a resource-constrained server (2-core, 2GB RAM). RapidOCR offers better performance characteristics with minimal dependencies for recognizing drawing markers (numbers and letter combinations) on patent drawings with white backgrounds and black lines.

## Glossary

- **OCR_System**: The optical character recognition subsystem responsible for extracting text from patent drawing images
- **Drawing_Marker**: Alphanumeric identifiers (numbers, letters, or combinations like "10", "A1", "12a") that label elements in patent drawings
- **Patent_Drawing**: Technical illustrations in patent documents, typically featuring white backgrounds with black lines and markers
- **RapidOCR**: A lightweight, cross-platform OCR toolkit based on PaddleOCR models but with minimal dependencies and optimized for deployment
- **Tesseract**: The legacy OCR engine currently used by the system
- **OCR_Utils**: The utility module (backend/utils/ocr_utils.py) that encapsulates OCR functionality
- **Drawing_Marker_Route**: The API endpoint module (backend/routes/drawing_marker.py) that handles drawing marker recognition requests
- **API_Interface**: The public function signatures and return types exposed by OCR_Utils

## Requirements

### Requirement 1: Replace Tesseract with RapidOCR

**User Story:** As a system administrator, I want to replace Tesseract OCR with RapidOCR, so that the system can run efficiently on resource-constrained servers with minimal dependencies.

#### Acceptance Criteria

1. THE OCR_System SHALL use RapidOCR as the primary OCR engine
2. THE OCR_System SHALL NOT depend on Tesseract, pytesseract, or tesseract-ocr binaries
3. WHEN the OCR_System initializes, THE OCR_System SHALL load RapidOCR models successfully
4. THE OCR_System SHALL use RapidOCR's lightweight models optimized for server deployment

### Requirement 2: Maintain API Compatibility

**User Story:** As a developer, I want the OCR API interface to remain unchanged, so that existing code continues to work without modifications.

#### Acceptance Criteria

1. THE OCR_Utils SHALL maintain the same public function signatures as the current implementation
2. WHEN Drawing_Marker_Route calls OCR_Utils functions, THE OCR_Utils SHALL return data in the same format as before
3. THE OCR_Utils SHALL accept the same input parameters (image data, configuration options) as the current implementation
4. WHEN an error occurs, THE OCR_Utils SHALL return error responses in the same format as the current implementation

### Requirement 3: Optimize for Patent Drawing Markers

**User Story:** As a patent analyst, I want the OCR system to accurately recognize drawing markers, so that I can reliably identify elements in patent drawings.

#### Acceptance Criteria

1. WHEN processing patent drawings with white backgrounds and black lines, THE OCR_System SHALL recognize alphanumeric markers
2. THE OCR_System SHALL recognize numbers (e.g., "10", "25", "100")
3. THE OCR_System SHALL recognize letter combinations (e.g., "A", "B1", "C2")
4. THE OCR_System SHALL recognize mixed alphanumeric markers (e.g., "12a", "A1", "3B")
5. WHEN markers have consistent height with nearby black guide lines, THE OCR_System SHALL leverage these visual cues for improved accuracy

### Requirement 4: Remove Legacy Dependencies

**User Story:** As a deployment engineer, I want all Tesseract-related dependencies removed, so that the deployment package is smaller and has fewer system requirements.

#### Acceptance Criteria

1. THE requirements.txt file SHALL NOT contain tesseract, pytesseract, or pillow dependencies
2. THE requirements.txt file SHALL contain rapidocr-onnxruntime and its required dependencies
3. WHEN the application starts, THE OCR_System SHALL NOT attempt to import tesseract-related modules
4. THE codebase SHALL NOT contain any references to Tesseract API calls

### Requirement 5: Operate Within Resource Constraints

**User Story:** As a system administrator, I want the OCR system to run on a 2-core 2GB server, so that deployment costs remain low.

#### Acceptance Criteria

1. WHEN processing patent drawing images (few hundred KB), THE OCR_System SHALL complete recognition within reasonable time limits
2. THE OCR_System SHALL use no more than 1.5GB of RAM during peak operation
3. THE OCR_System SHALL efficiently utilize 2 CPU cores without blocking other system operations
4. WHEN multiple OCR requests arrive concurrently, THE OCR_System SHALL handle them without exceeding memory limits

### Requirement 6: Maintain or Improve Recognition Accuracy

**User Story:** As a patent analyst, I want OCR recognition accuracy to be maintained or improved, so that I can trust the extracted marker data.

#### Acceptance Criteria

1. WHEN processing patent drawings, THE OCR_System SHALL achieve recognition accuracy equal to or better than the current Tesseract implementation
2. WHEN markers are clearly visible (high contrast, standard fonts), THE OCR_System SHALL achieve at least 95% character-level accuracy
3. IF a marker cannot be recognized with confidence, THEN THE OCR_System SHALL return a confidence score below a defined threshold
4. THE OCR_System SHALL handle common patent drawing characteristics (varying font sizes, bold text, italic text)

### Requirement 7: Update Integration Points

**User Story:** As a developer, I want the Drawing_Marker_Route to use the new OCR implementation, so that the API endpoint works with RapidOCR.

#### Acceptance Criteria

1. THE Drawing_Marker_Route SHALL call OCR_Utils functions that use RapidOCR internally
2. WHEN the Drawing_Marker_Route receives an image upload request, THE Drawing_Marker_Route SHALL process it using the new OCR implementation
3. THE Drawing_Marker_Route SHALL return recognition results in the same JSON format as before
4. WHEN the Drawing_Marker_Route encounters OCR errors, THE Drawing_Marker_Route SHALL return appropriate HTTP error codes and messages

### Requirement 8: Configure RapidOCR for Patent Drawings

**User Story:** As a system administrator, I want RapidOCR configured optimally for patent drawings, so that recognition performance is maximized.

#### Acceptance Criteria

1. THE OCR_System SHALL configure RapidOCR to prioritize English and numeric character recognition
2. THE OCR_System SHALL use RapidOCR's detection model optimized for horizontal text
3. WHEN images have white backgrounds, THE OCR_System SHALL configure appropriate preprocessing parameters
4. THE OCR_System SHALL set confidence thresholds appropriate for patent drawing marker recognition
5. WHERE performance optimization is needed, THE OCR_System SHALL use RapidOCR's ONNX runtime for efficient inference
