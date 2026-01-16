# Design Document: Claims Export Fix

## Overview

This design addresses critical production issues with the patent claims processor export and report viewing functionality. The root causes are:

1. **Excel Export Corruption**: Binary file data is being corrupted during HTTP transmission, likely due to incorrect encoding or streaming issues
2. **JSON Export Corruption**: Character encoding issues or improper content-type headers causing file corruption
3. **Report Viewer Failure**: Modal overlay displays but content doesn't render, likely due to popup blocker interference with window.open()

The solution focuses on proper file streaming, correct HTTP headers, and browser-compatible report viewing mechanisms.

## Architecture

### Current Architecture Issues

```
User Request → Flask Route → Export Service → File Generation → HTTP Response
                                                                      ↓
                                                              [CORRUPTION POINT]
```

The corruption occurs during the HTTP response phase, where binary/text data is not properly encoded or streamed.

### Fixed Architecture

```
User Request → Flask Route → Export Service → File Generation → 
    → Binary Stream with Proper Headers → send_file() → Browser Download
```

Key improvements:
- Use Flask's `send_file()` with proper parameters for binary streaming
- Set correct MIME types and Content-Disposition headers
- Use BytesIO for in-memory file handling to avoid filesystem issues
- Implement proper error handling at each stage

### Report Viewing Architecture

**Current (Broken)**:
```
View Button Click → window.open(url) → [BLOCKED BY POPUP BLOCKER]
```

**Fixed**:
```
View Button Click → Fetch Report Data → Render in Modal → Display Content
```

## Components and Interfaces

### 1. Export Service (backend/services/export_service.py)

**Purpose**: Generate Excel and JSON files from analysis results

**Key Functions**:

```python
def generate_excel_export(analysis_data: dict) -> BytesIO:
    """
    Generate Excel file from analysis data.
    
    Args:
        analysis_data: Dictionary containing claims analysis results
        
    Returns:
        BytesIO object containing Excel file binary data
        
    Raises:
        ExportGenerationError: If Excel generation fails
    """
    pass

def generate_json_export(analysis_data: dict) -> BytesIO:
    """
    Generate JSON file from analysis data.
    
    Args:
        analysis_data: Dictionary containing claims analysis results
        
    Returns:
        BytesIO object containing JSON file binary data
        
    Raises:
        ExportGenerationError: If JSON generation fails
    """
    pass

def validate_excel_file(file_buffer: BytesIO) -> bool:
    """
    Validate that generated Excel file is not corrupted.
    
    Args:
        file_buffer: BytesIO containing Excel data
        
    Returns:
        True if file is valid, False otherwise
    """
    pass

def validate_json_file(file_buffer: BytesIO) -> bool:
    """
    Validate that generated JSON file is well-formed.
    
    Args:
        file_buffer: BytesIO containing JSON data
        
    Returns:
        True if file is valid, False otherwise
    """
    pass
```

**Implementation Details**:
- Use `pandas.ExcelWriter` with `openpyxl` engine for Excel generation
- Write to `BytesIO` instead of filesystem to avoid Render path issues
- Use UTF-8 encoding for JSON with `ensure_ascii=False` for multilingual support
- Validate files by attempting to read them back before sending

### 2. Claims Export Routes (backend/routes/claims.py)

**Purpose**: Handle HTTP requests for export operations

**Key Endpoints**:

```python
@claims_bp.route('/export/excel', methods=['POST'])
def export_excel():
    """
    Export claims analysis to Excel format.
    
    Request Body:
        {
            "analysis_data": {...},
            "filename": "optional_custom_name"
        }
        
    Returns:
        Excel file download with proper headers
        
    Response Headers:
        Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
        Content-Disposition: attachment; filename="claims_analysis.xlsx"
    """
    pass

@claims_bp.route('/export/json', methods=['POST'])
def export_json():
    """
    Export claims analysis to JSON format.
    
    Request Body:
        {
            "analysis_data": {...},
            "filename": "optional_custom_name"
        }
        
    Returns:
        JSON file download with proper headers
        
    Response Headers:
        Content-Type: application/json; charset=utf-8
        Content-Disposition: attachment; filename="claims_analysis.json"
    """
    pass

@claims_bp.route('/report/view', methods=['POST'])
def view_report():
    """
    Get report HTML for in-browser viewing.
    
    Request Body:
        {
            "analysis_data": {...}
        }
        
    Returns:
        JSON response with HTML content:
        {
            "success": true,
            "html": "<html>...</html>"
        }
    """
    pass
```

**Implementation Details**:
- Use `send_file()` with `mimetype` and `as_attachment=True` parameters
- Set `download_name` parameter for custom filenames
- Wrap file generation in try-except blocks with detailed logging
- Return appropriate HTTP status codes (200, 400, 500)

### 3. Frontend Export Handler (frontend/js/claims_export.js)

**Purpose**: Handle export requests and file downloads from browser

**Key Functions**:

```javascript
async function downloadExcel(analysisData, filename) {
    /**
     * Download Excel export file.
     * 
     * @param {Object} analysisData - Claims analysis results
     * @param {string} filename - Optional custom filename
     * @returns {Promise<void>}
     */
}

async function downloadJSON(analysisData, filename) {
    /**
     * Download JSON export file.
     * 
     * @param {Object} analysisData - Claims analysis results
     * @param {string} filename - Optional custom filename
     * @returns {Promise<void>}
     */
}

async function viewReport(analysisData) {
    /**
     * Display report in modal viewer.
     * 
     * @param {Object} analysisData - Claims analysis results
     * @returns {Promise<void>}
     */
}
```

**Implementation Details**:
- Use `fetch()` API with `blob()` response type for file downloads
- Create temporary `<a>` element with `download` attribute to trigger download
- For report viewing, fetch HTML content and inject into modal DOM
- Handle errors with user-friendly messages
- Show loading indicators during operations

### 4. Report Modal Component (frontend/js/report_modal.js)

**Purpose**: Display report content in modal dialog

**Key Functions**:

```javascript
function showReportModal(htmlContent) {
    /**
     * Display report HTML in modal.
     * 
     * @param {string} htmlContent - HTML content to display
     */
}

function closeReportModal() {
    /**
     * Close modal and clean up DOM.
     */
}
```

**Implementation Details**:
- Create modal overlay with proper z-index
- Inject HTML content into modal body
- Add close button and ESC key handler
- Prevent body scroll when modal is open
- Clean up event listeners on close

## Data Models

### Analysis Data Structure

```python
{
    "patent_number": str,
    "claims": [
        {
            "claim_number": int,
            "claim_text": str,
            "claim_type": str,  # "independent" or "dependent"
            "dependencies": List[int],
            "analysis": {
                "complexity_score": float,
                "key_terms": List[str],
                "structure": str
            }
        }
    ],
    "summary": {
        "total_claims": int,
        "independent_claims": int,
        "dependent_claims": int,
        "average_complexity": float
    },
    "timestamp": str  # ISO 8601 format
}
```

### Export Response Structure

**Success Response**:
```python
# For file downloads: Binary file stream with headers
# For report view:
{
    "success": True,
    "html": str,  # HTML content
    "timestamp": str
}
```

**Error Response**:
```python
{
    "success": False,
    "error": str,  # User-friendly error message
    "error_code": str,  # Machine-readable error code
    "details": str  # Technical details (only in debug mode)
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Excel Export Validity

*For any* valid analysis data, when generating an Excel export, the resulting file should be openable and parseable by openpyxl without errors.

**Validates: Requirements 1.1**

### Property 2: Excel MIME Type Headers

*For any* Excel export request, the HTTP response should include the MIME type `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` in the Content-Type header.

**Validates: Requirements 1.3**

### Property 3: JSON Export Validity

*For any* valid analysis data, when generating a JSON export, the resulting file should be parseable by standard JSON parsers without errors.

**Validates: Requirements 2.1**

### Property 4: JSON Multilingual Support

*For any* analysis data containing Unicode characters (Chinese, Japanese, special symbols), serializing to JSON and reading back should preserve all characters exactly.

**Validates: Requirements 2.2**

### Property 5: JSON MIME Type Headers

*For any* JSON export request, the HTTP response should include the MIME type `application/json; charset=utf-8` in the Content-Type header.

**Validates: Requirements 2.3**

### Property 6: Report Content Completeness

*For any* analysis data with tables and formatted text, the generated report HTML should contain all expected HTML elements (tables, headings, paragraphs).

**Validates: Requirements 3.3**

### Property 7: HTTP Error Status Codes

*For any* export operation, when a client error occurs (invalid input), the response should have a 4xx status code, and when a server error occurs (generation failure), the response should have a 5xx status code.

**Validates: Requirements 5.4**

### Property 8: Content-Disposition Headers

*For any* file download request (Excel or JSON), the HTTP response should include a Content-Disposition header with `attachment` and a filename parameter.

**Validates: Requirements 6.1**

### Property 9: Content-Length Headers

*For any* file download request, the HTTP response should include a Content-Length header matching the actual file size in bytes.

**Validates: Requirements 6.2**

### Property 10: Complete File Transfer

*For any* generated export file, the size of the file received by the client should equal the size of the file generated by the server.

**Validates: Requirements 6.3**

### Property 11: Excel Data Type Conversion

*For any* analysis data containing strings, integers, floats, and dates, when serialized to Excel, all data types should be converted to Excel-compatible formats and be readable.

**Validates: Requirements 7.1**

### Property 12: JSON Serialization Round-Trip

*For any* valid analysis result object, serializing to JSON then deserializing should produce an object with equivalent data (all fields and values preserved).

**Validates: Requirements 7.4**

## Error Handling

### Error Categories

1. **Client Errors (4xx)**:
   - 400 Bad Request: Invalid analysis data format
   - 404 Not Found: Report or analysis not found
   - 413 Payload Too Large: Analysis data exceeds size limits

2. **Server Errors (5xx)**:
   - 500 Internal Server Error: File generation failure
   - 503 Service Unavailable: Temporary service issues

### Error Response Format

```python
{
    "success": False,
    "error": "User-friendly error message",
    "error_code": "EXPORT_GENERATION_FAILED",
    "timestamp": "2024-01-15T10:30:00Z"
    # "details": "Stack trace..." (only in debug mode)
}
```

### Logging Strategy

**Log Levels**:
- ERROR: Export generation failures, file corruption detected
- WARNING: Validation failures, missing optional fields
- INFO: Successful exports, file sizes, processing times
- DEBUG: Intermediate steps, data transformations, header values

**Log Format**:
```python
{
    "timestamp": "ISO 8601",
    "level": "ERROR|WARNING|INFO|DEBUG",
    "component": "export_service|claims_routes|report_modal",
    "operation": "generate_excel|generate_json|view_report",
    "message": "Human-readable message",
    "context": {
        "request_id": "uuid",
        "user_id": "optional",
        "file_size": "bytes",
        "error_type": "exception class name"
    }
}
```

### Error Recovery

1. **File Generation Failure**:
   - Log complete error context
   - Return 500 error with user-friendly message
   - Suggest retry or contact support

2. **Validation Failure**:
   - Log validation errors
   - Return 400 error with specific field issues
   - Provide guidance on correct format

3. **Network Interruption**:
   - Log partial transfer details
   - Client should retry download
   - Server cleans up resources

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs

### Unit Testing Focus

Unit tests should cover:
- Specific example exports with known data
- Edge cases: empty analysis data, very large datasets, special characters
- Error conditions: invalid data formats, missing required fields
- Integration points: route handlers, service layer, file streaming
- Modal behavior: open, close, content injection, cleanup

Example unit tests:
```python
def test_export_excel_with_sample_data():
    """Test Excel export with known sample data."""
    
def test_export_json_with_empty_claims():
    """Test JSON export handles empty claims list."""
    
def test_view_report_displays_modal():
    """Test report viewer opens modal with content."""
    
def test_export_logs_error_on_failure():
    """Test error logging when export fails."""
```

### Property-Based Testing

**Library**: Use `hypothesis` for Python property-based testing

**Configuration**: Each property test should run minimum 100 iterations

**Test Tagging**: Each test must reference its design document property
- Format: `# Feature: claims-export-fix, Property {number}: {property_text}`

**Property Test Examples**:

```python
from hypothesis import given, strategies as st
import json
from io import BytesIO
import openpyxl

# Feature: claims-export-fix, Property 1: Excel Export Validity
@given(analysis_data=st.fixed_dictionaries({
    'patent_number': st.text(min_size=1),
    'claims': st.lists(st.fixed_dictionaries({
        'claim_number': st.integers(min_value=1),
        'claim_text': st.text(min_size=1),
        'claim_type': st.sampled_from(['independent', 'dependent'])
    }), min_size=1)
}))
def test_property_excel_export_validity(analysis_data):
    """For any valid analysis data, Excel export should be valid."""
    excel_buffer = generate_excel_export(analysis_data)
    excel_buffer.seek(0)
    # Should not raise exception
    workbook = openpyxl.load_workbook(excel_buffer)
    assert workbook is not None

# Feature: claims-export-fix, Property 3: JSON Export Validity
@given(analysis_data=st.fixed_dictionaries({
    'patent_number': st.text(min_size=1),
    'claims': st.lists(st.fixed_dictionaries({
        'claim_number': st.integers(min_value=1),
        'claim_text': st.text(min_size=1)
    }), min_size=1)
}))
def test_property_json_export_validity(analysis_data):
    """For any valid analysis data, JSON export should be parseable."""
    json_buffer = generate_json_export(analysis_data)
    json_buffer.seek(0)
    # Should not raise exception
    parsed_data = json.loads(json_buffer.read().decode('utf-8'))
    assert parsed_data is not None

# Feature: claims-export-fix, Property 12: JSON Serialization Round-Trip
@given(analysis_data=st.fixed_dictionaries({
    'patent_number': st.text(min_size=1),
    'claims': st.lists(st.fixed_dictionaries({
        'claim_number': st.integers(min_value=1),
        'claim_text': st.text(min_size=1),
        'claim_type': st.sampled_from(['independent', 'dependent'])
    }), min_size=1),
    'summary': st.fixed_dictionaries({
        'total_claims': st.integers(min_value=0),
        'average_complexity': st.floats(min_value=0.0, max_value=10.0)
    })
}))
def test_property_json_round_trip(analysis_data):
    """For any valid analysis data, JSON round-trip should preserve data."""
    json_buffer = generate_json_export(analysis_data)
    json_buffer.seek(0)
    deserialized = json.loads(json_buffer.read().decode('utf-8'))
    
    # Check all fields preserved
    assert deserialized['patent_number'] == analysis_data['patent_number']
    assert len(deserialized['claims']) == len(analysis_data['claims'])
    assert deserialized['summary']['total_claims'] == analysis_data['summary']['total_claims']
```

### Integration Testing

Integration tests should verify:
- End-to-end export flow from route to file download
- Report viewing flow from button click to modal display
- Error handling across component boundaries
- Render environment compatibility

### Manual Testing Checklist

Before deployment to production:
- [ ] Test Excel export in Chrome, Firefox, Safari, Edge
- [ ] Test JSON export in Chrome, Firefox, Safari, Edge
- [ ] Test report viewing in Chrome, Firefox, Safari, Edge
- [ ] Verify downloaded Excel files open in Microsoft Excel
- [ ] Verify downloaded Excel files open in Google Sheets
- [ ] Verify downloaded JSON files are valid (use jsonlint.com)
- [ ] Test with large datasets (100+ claims)
- [ ] Test with multilingual content (Chinese, Japanese, special characters)
- [ ] Test error scenarios (invalid data, network issues)
- [ ] Verify error messages are user-friendly
- [ ] Check browser console for JavaScript errors
- [ ] Verify modal closes properly and cleans up DOM
- [ ] Test on Render staging environment before production

## Implementation Notes

### Key Technical Decisions

1. **Use BytesIO Instead of Filesystem**:
   - Avoids Render filesystem permission issues
   - Reduces disk I/O overhead
   - Simplifies cleanup (automatic garbage collection)

2. **Use send_file() with BytesIO**:
   - Flask's send_file() handles streaming efficiently
   - Proper header management built-in
   - Works reliably across different environments

3. **Fetch API + Blob for Downloads**:
   - Modern browser API with good support
   - Handles binary data correctly
   - Avoids popup blocker issues

4. **Modal Instead of window.open()**:
   - No popup blocker interference
   - Better UX with consistent styling
   - Easier to manage lifecycle

### Render-Specific Considerations

1. **Memory Limits**: Use streaming for large files
2. **Temporary Storage**: Use `/tmp` if filesystem needed (but prefer BytesIO)
3. **Environment Variables**: Configure debug mode via environment
4. **Logging**: Ensure logs are captured by Render's logging system

### Security Considerations

1. **Input Validation**: Validate all analysis data before processing
2. **File Size Limits**: Prevent memory exhaustion from large exports
3. **Error Messages**: Don't expose internal paths or sensitive data
4. **Content-Type**: Set correct MIME types to prevent XSS
5. **CORS**: Configure if frontend and backend on different domains
