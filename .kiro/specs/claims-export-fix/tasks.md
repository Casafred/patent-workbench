# Implementation Plan: Claims Export Fix

## Overview

This implementation plan fixes critical production issues with the patent claims processor export and report viewing functionality. The approach focuses on proper file streaming with BytesIO, correct HTTP headers, and browser-compatible report viewing using modals instead of popup windows.

## Tasks

- [x] 1. Create export service module with file generation functions
  - Create `backend/services/export_service.py` if it doesn't exist
  - Implement `generate_excel_export()` function that returns BytesIO with Excel data
  - Implement `generate_json_export()` function that returns BytesIO with JSON data
  - Use pandas with openpyxl engine for Excel generation
  - Use UTF-8 encoding with `ensure_ascii=False` for JSON
  - _Requirements: 1.1, 2.1, 2.2, 7.1, 7.4_

- [ ]* 1.1 Write property test for Excel export validity
  - **Property 1: Excel Export Validity**
  - **Validates: Requirements 1.1**
  - Use hypothesis to generate random analysis data
  - Verify generated Excel files can be opened with openpyxl

- [ ]* 1.2 Write property test for JSON export validity
  - **Property 3: JSON Export Validity**
  - **Validates: Requirements 2.1**
  - Use hypothesis to generate random analysis data
  - Verify generated JSON files can be parsed with json.loads()

- [ ]* 1.3 Write property test for JSON multilingual support
  - **Property 4: JSON Multilingual Support**
  - **Validates: Requirements 2.2**
  - Use hypothesis to generate analysis data with Unicode characters
  - Verify characters are preserved after serialization

- [ ]* 1.4 Write property test for JSON round-trip
  - **Property 12: JSON Serialization Round-Trip**
  - **Validates: Requirements 7.4**
  - Use hypothesis to generate random analysis data
  - Verify serializing then deserializing preserves all data

- [ ] 2. Add validation functions to export service
  - Implement `validate_excel_file()` that attempts to read Excel file with openpyxl
  - Implement `validate_json_file()` that attempts to parse JSON with json.loads()
  - Return True if valid, False if corrupted
  - Log validation failures with details
  - _Requirements: 1.5, 2.5_

- [ ]* 2.1 Write unit tests for validation functions
  - Test validation with valid Excel files
  - Test validation with corrupted Excel files
  - Test validation with valid JSON files
  - Test validation with malformed JSON files

- [x] 3. Update claims routes for Excel export
  - Modify or create `/export/excel` endpoint in `backend/routes/claims.py`
  - Accept POST request with analysis_data and optional filename
  - Call `generate_excel_export()` from export service
  - Use `send_file()` with BytesIO, proper MIME type, and `as_attachment=True`
  - Set Content-Disposition header with filename
  - Wrap in try-except with detailed error logging
  - Return appropriate HTTP status codes (200, 400, 500)
  - _Requirements: 1.1, 1.3, 5.1, 5.2, 6.1, 6.2_

- [ ]* 3.1 Write property test for Excel MIME type headers
  - **Property 2: Excel MIME Type Headers**
  - **Validates: Requirements 1.3**
  - Test that Excel export responses include correct Content-Type header

- [ ]* 3.2 Write property test for Content-Disposition headers
  - **Property 8: Content-Disposition Headers**
  - **Validates: Requirements 6.1**
  - Test that export responses include Content-Disposition with attachment and filename

- [ ]* 3.3 Write unit test for Excel export error logging
  - Trigger export failure with invalid data
  - Verify error logs contain stack trace and parameters
  - _Requirements: 1.4_

- [ ] 4. Update claims routes for JSON export
  - Modify or create `/export/json` endpoint in `backend/routes/claims.py`
  - Accept POST request with analysis_data and optional filename
  - Call `generate_json_export()` from export service
  - Use `send_file()` with BytesIO, proper MIME type with charset=utf-8
  - Set Content-Disposition header with filename
  - Wrap in try-except with detailed error logging
  - Return appropriate HTTP status codes (200, 400, 500)
  - _Requirements: 2.1, 2.3, 5.1, 5.2, 6.1, 6.2_

- [ ]* 4.1 Write property test for JSON MIME type headers
  - **Property 5: JSON MIME Type Headers**
  - **Validates: Requirements 2.3**
  - Test that JSON export responses include correct Content-Type header with charset

- [ ]* 4.2 Write unit test for JSON export error logging
  - Trigger export failure with invalid data
  - Verify error logs contain serialization errors
  - _Requirements: 2.4_

- [ ] 5. Create report viewing endpoint
  - Create `/report/view` endpoint in `backend/routes/claims.py`
  - Accept POST request with analysis_data
  - Generate HTML report content from analysis data
  - Return JSON response with success flag and HTML content
  - Include error handling with user-friendly messages
  - _Requirements: 3.1, 3.3, 3.4_

- [ ]* 5.1 Write property test for report content completeness
  - **Property 6: Report Content Completeness**
  - **Validates: Requirements 3.3**
  - Generate random analysis data with tables and text
  - Verify HTML contains expected elements (tables, headings, paragraphs)

- [ ]* 5.2 Write unit test for report viewing error handling
  - Trigger report generation failure
  - Verify error response includes user-friendly message
  - _Requirements: 3.4_

- [ ] 6. Checkpoint - Ensure backend tests pass
  - Run all backend unit tests and property tests
  - Verify all export endpoints return correct status codes
  - Check logs for proper error messages
  - Ask the user if questions arise

- [ ] 7. Create frontend export handler module
  - Create or update `frontend/js/claims_export.js`
  - Implement `downloadExcel()` function using fetch API
  - Implement `downloadJSON()` function using fetch API
  - Use blob() response type for file downloads
  - Create temporary `<a>` element with download attribute to trigger download
  - Add error handling with user-friendly alerts
  - Show loading indicators during operations
  - _Requirements: 1.1, 2.1, 6.3_

- [ ]* 7.1 Write property test for complete file transfer
  - **Property 10: Complete File Transfer**
  - **Validates: Requirements 6.3**
  - Test that downloaded file size matches generated file size

- [ ] 8. Create report modal component
  - Create or update `frontend/js/report_modal.js`
  - Implement `showReportModal()` function that creates modal overlay
  - Inject HTML content into modal body
  - Add close button and ESC key handler
  - Prevent body scroll when modal is open
  - Implement `closeReportModal()` that cleans up DOM and event listeners
  - _Requirements: 3.1, 3.2, 3.5_

- [ ]* 8.1 Write unit test for modal cleanup
  - Test that closing modal removes it from DOM
  - Test that event listeners are removed
  - _Requirements: 3.5_

- [x] 9. Update view report button handler
  - Modify existing View Report button click handler
  - Call fetch API to get report HTML from `/report/view` endpoint
  - Pass response HTML to `showReportModal()`
  - Remove any existing window.open() calls
  - Add error handling with user-friendly messages
  - _Requirements: 3.1, 3.2, 3.4_

- [ ] 10. Add HTTP error status code handling
  - Update all export route handlers to return 4xx for client errors
  - Update all export route handlers to return 5xx for server errors
  - Ensure error responses include descriptive messages
  - _Requirements: 5.2, 5.4_

- [ ]* 10.1 Write property test for HTTP error status codes
  - **Property 7: HTTP Error Status Codes**
  - **Validates: Requirements 5.4**
  - Test that client errors return 4xx status codes
  - Test that server errors return 5xx status codes

- [ ] 11. Add comprehensive logging
  - Add INFO level logs for successful exports with file sizes
  - Add ERROR level logs for export failures with stack traces
  - Add DEBUG level logs for intermediate steps (when debug mode enabled)
  - Use structured logging format with timestamp, component, operation
  - Ensure logs don't expose sensitive information to users
  - _Requirements: 1.4, 2.4, 5.1, 5.3, 5.5_

- [ ]* 11.1 Write unit tests for logging behavior
  - Test that successful exports log file sizes
  - Test that failures log complete error context
  - Test that debug mode logs intermediate steps
  - Test that user-facing errors don't expose sensitive data
  - _Requirements: 5.1, 5.3, 5.5_

- [ ] 12. Add Content-Length headers
  - Ensure all export responses include Content-Length header
  - Calculate file size from BytesIO buffer
  - Verify send_file() includes this header automatically
  - _Requirements: 6.2_

- [ ]* 12.1 Write property test for Content-Length headers
  - **Property 9: Content-Length Headers**
  - **Validates: Requirements 6.2**
  - Test that all export responses include Content-Length header
  - Verify header value matches actual file size

- [ ] 13. Add startup validation check
  - Add function to verify temporary directory write permissions on startup
  - Log warning if permissions are insufficient
  - Include check in application initialization
  - _Requirements: 4.4_

- [ ]* 13.1 Write unit test for startup validation
  - Test that startup check logs permission issues
  - _Requirements: 4.4_

- [x] 14. Final checkpoint - Integration testing
  - Test complete export flow: button click → backend → file download
  - Test complete report viewing flow: button click → backend → modal display
  - Verify Excel files open in Excel and Google Sheets
  - Verify JSON files are valid (use jsonlint.com or json.loads())
  - Test with multilingual content (Chinese characters)
  - Test error scenarios and verify user-friendly messages
  - Check browser console for JavaScript errors
  - Verify modal closes properly and cleans up DOM
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests should run minimum 100 iterations each
- Use hypothesis library for property-based testing in Python
- Focus on BytesIO to avoid Render filesystem issues
- Ensure proper UTF-8 encoding for multilingual support
- Test in multiple browsers before production deployment
