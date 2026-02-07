# Implementation Plan: HTML and JavaScript Refactoring

## Overview

This plan outlines the step-by-step implementation of refactoring large HTML and JavaScript files into smaller, maintainable modules. The approach follows an incremental strategy: create infrastructure first, then refactor one feature at a time, testing thoroughly at each step.

## Tasks

- [x] 1. Create infrastructure and component loading system
  - Create directory structure for components and modules
  - Implement HTML component loader
  - Implement module dependency resolver
  - Set up testing framework for refactored code
  - _Requirements: 5.1, 5.2, 6.1, 6.2, 6.3_

- [ ] 2. Extract and modularize core utilities
  - [x] 2.1 Create js/core/api.js from main.js
    - Extract apiCall function and API key configuration
    - Export initApiKeyConfig and apiCall functions
    - Update main.js to import from api.js
    - _Requirements: 4.2, 5.6_
  
  - [x] 2.2 Create js/core/component-loader.js
    - Implement loadComponent function for async HTML loading
    - Implement loadComponentSync for synchronous loading
    - Add error handling for missing components
    - Add retry logic for network failures
    - _Requirements: 1.2, 5.1_
  
  - [x] 2.3 Create js/modules/navigation/tab-navigation.js
    - Extract switchTab, switchAsyncSubTab, switchSubTab, switchLPLSubTab
    - Extract updateStepperState function
    - Ensure component loading integration
    - _Requirements: 4.3, 5.3_
  
  - [ ]* 2.4 Write property test for component loader
    - **Property 1: Component Loading Completeness**
    - **Validates: Requirements 1.2, 5.3**
  
  - [ ]* 2.5 Write property test for module dependency resolver
    - **Property 2: Module Dependency Resolution**
    - **Validates: Requirements 5.4, 5.5**

- [ ] 3. Refactor HTML into components
  - [x] 3.1 Create frontend/components/ directory structure
    - Create frontend/components/header.html
    - Create frontend/components/tab-navigation.html
    - Create frontend/components/tabs/ directory
    - _Requirements: 6.1, 6.2_
  
  - [x] 3.2 Extract header component
    - Copy header HTML from index.html to header.html
    - Update index.html to load header component
    - Test header displays correctly
    - _Requirements: 1.1, 1.3, 1.4_
  
  - [x] 3.3 Extract tab navigation component
    - Copy tab navigation HTML to tab-navigation.html
    - Update index.html to load navigation component
    - Test tab switching works
    - _Requirements: 1.1, 1.5_
  
  - [x] 3.4 Extract Feature 1 (Instant Chat) component
    - Create frontend/components/tabs/instant-chat.html
    - Copy instant chat HTML from index.html
    - Update index.html to load component dynamically
    - Test chat tab loads and functions correctly
    - _Requirements: 1.1, 1.6, 1.7_
  
  - [x] 3.5 Extract Feature 2 (Async Batch) component
    - Create frontend/components/tabs/async-batch.html
    - Copy async batch HTML from index.html
    - Update index.html to load component dynamically
    - Test async batch tab loads and functions correctly
    - _Requirements: 1.1, 1.6, 1.7_
  
  - [x] 3.6 Extract Feature 3 (Large Batch) component
    - Create frontend/components/tabs/large-batch.html
    - Copy large batch HTML from index.html
    - Update index.html to load component dynamically
    - Test large batch tab loads and functions correctly
    - _Requirements: 1.1, 1.6, 1.7_
  
  - [x] 3.7 Extract Feature 4 (Local Patent Library) component
    - Create frontend/components/tabs/local-patent-lib.html
    - Copy local patent library HTML from index.html
    - Update index.html to load component dynamically
    - Test local patent library tab loads and functions correctly
    - _Requirements: 1.1, 1.6, 1.7_
  
  - [x] 3.8 Extract Feature 5 (Claims Comparison) component
    - Create frontend/components/tabs/claims-comparison.html
    - Copy claims comparison HTML from index.html
    - Update index.html to load component dynamically
    - Test claims comparison tab loads and functions correctly
    - _Requirements: 1.1, 1.6, 1.7_
  
  - [x] 3.9 Extract Feature 6 (Patent Batch) component
    - Create frontend/components/tabs/patent-batch.html
    - Copy patent batch HTML from index.html
    - Update index.html to load component dynamically
    - Test patent batch tab loads and functions correctly
    - _Requirements: 1.1, 1.6, 1.7_
  
  - [x] 3.10 Extract Feature 7 (Claims Processor) component
    - Create frontend/components/tabs/claims-processor.html
    - Copy claims processor HTML from index.html
    - Update index.html to load component dynamically
    - Test claims processor tab loads and functions correctly
    - _Requirements: 1.1, 1.6, 1.7_
  
  - [x] 3.11 Extract Feature 8 (Drawing Marker) component
    - Create frontend/components/tabs/drawing-marker.html
    - Copy drawing marker HTML from index.html
    - Update index.html to load component dynamically
    - Test drawing marker tab loads and functions correctly
    - _Requirements: 1.1, 1.6, 1.7_
  
  - [ ]* 3.12 Write property test for DOM structure preservation
    - **Property 7: DOM Structure Preservation**
    - **Validates: Requirements 1.4, 7.2**
  
  - [ ]* 3.13 Write visual consistency test
    - **Property 10: Visual Consistency**
    - **Validates: Requirements 1.3, 7.2**

- [x] 4. Checkpoint - Verify HTML refactoring complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Refactor chat.js into modules
  - [x] 5.1 Create js/modules/chat/ directory structure
    - Create chat-core.js, chat-file-handler.js, chat-conversation.js
    - Create chat-message.js, chat-persona.js, chat-search.js, chat-export.js
    - _Requirements: 3.1, 6.3_
  
  - [x] 5.2 Create chat-file-handler.js module
    - Extract handleChatFileUpload, startFileUpload, cancelFileUpload
    - Extract removeActiveFile, updateParserServiceDescription
    - Export all file handling functions
    - _Requirements: 3.2, 3.8_
  
  - [x] 5.3 Create chat-conversation.js module
    - Extract loadConversations, saveConversations, startNewChat
    - Extract switchConversation, deleteConversation, renderChatHistoryList
    - Export all conversation management functions
    - _Requirements: 3.3, 3.8_
  
  - [x] 5.4 Create chat-message.js module
    - Extract renderCurrentChat, addMessageToDOM, updateCharCount
    - Export all message rendering functions
    - _Requirements: 3.4, 3.8_
  
  - [x] 5.5 Create chat-persona.js module
    - Extract loadPersonas, savePersonas, addPersona, deletePersona
    - Extract updatePersonaEditor, updatePersonaSelector
    - Export all persona management functions
    - _Requirements: 3.5, 3.8_
  
  - [x] 5.6 Create chat-search.js module
    - Extract handleSearch, toggleSearchMode
    - Export search functionality
    - _Requirements: 3.6, 3.8_
  
  - [x] 5.7 Create chat-export.js module
    - Extract exportChatHistory function
    - Export export functionality
    - _Requirements: 3.7, 3.8_
  
  - [x] 5.8 Create chat-core.js module
    - Extract initChat and handleStreamChatRequest
    - Import and coordinate all chat modules
    - Export main chat initialization
    - _Requirements: 3.1, 3.8_
  
  - [x] 5.9 Update main.js to use chat-core module
    - Replace initChat call with import from chat-core
    - Remove old chat.js script tag
    - Add new module script tags
    - _Requirements: 3.8, 5.6_
  
  - [ ]* 5.10 Write property test for function signature preservation
    - **Property 3: Function Signature Preservation**
    - **Validates: Requirements 2.7, 3.8, 4.6**
  
  - [ ]* 5.11 Write property test for event handler preservation
    - **Property 4: Event Handler Preservation**
    - **Validates: Requirements 1.6, 3.8, 7.2**
  
  - [ ]* 5.12 Write property test for state consistency
    - **Property 5: State Consistency**
    - **Validates: Requirements 2.9, 3.9, 4.6, 7.5**

- [x] 6. Refactor claimsProcessorIntegrated.js into modules
  - [x] 6.1 Create js/modules/claims/ directory structure
    - Create claims-core.js, claims-file-handler.js, claims-processor.js
    - Create claims-visualization.js, claims-text-analyzer.js, claims-patent-search.js
    - _Requirements: 2.1, 6.3_
  
  - [x] 6.2 Create claims-file-handler.js module
    - Extract handleClaimsFileSelect, loadClaimsColumns
    - Extract claimsShowPatentColumnSelector, claimsAutoDetectPatentColumn
    - Export all file handling functions
    - _Requirements: 2.2, 2.7_
  
  - [x] 6.3 Create claims-processor.js module
    - Extract handleClaimsProcess, startClaimsPolling, loadClaimsResults
    - Extract updateClaimsProgress, exportClaimsResults
    - Export all processing functions
    - _Requirements: 2.4, 2.7_
  
  - [x] 6.4 Create claims-visualization.js module
    - Extract claimsGenerateVisualization, ClaimsVisualizationRenderer class
    - Export visualization functions and classes
    - _Requirements: 2.5, 2.7_
  
  - [x] 6.5 Create claims-text-analyzer.js module
    - Extract initClaimsTextAnalyzer, analyzeClaimsText
    - Extract renderClaimsTextVisualization
    - Export text analysis functions
    - _Requirements: 2.6, 2.7_
  
  - [x] 6.6 Create claims-patent-search.js module
    - Extract claimsSearchPatentNumbers, displayPatentResults
    - Export patent search functions
    - _Requirements: 2.3, 2.7_
  
  - [x] 6.7 Create claims-core.js module
    - Extract initClaimsProcessor, switchClaimsSubTab
    - Import and coordinate all claims modules
    - Export main claims initialization
    - _Requirements: 2.1, 2.7_
  
  - [x] 6.8 Update main.js to use claims-core module
    - Replace initClaimsProcessor call with import from claims-core
    - Remove old claimsProcessorIntegrated.js script tag
    - Add new module script tags
    - _Requirements: 2.7, 5.6_
  
  - [ ]* 6.9 Write property test for API call equivalence
    - **Property 6: API Call Equivalence**
    - **Validates: Requirements 7.5, 8.4**
  
  - [ ]* 6.10 Write property test for module size constraint
    - **Property 8: Module Size Constraint**
    - **Validates: Requirements 10.3**

- [x] 7. Checkpoint - Verify chat and claims refactoring complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Refactor main.js initialization logic
  - [x] 8.1 Create js/modules/init/ directory structure
    - Create init-async-batch.js, init-large-batch.js
    - Create init-local-patent-lib.js, init-claims-comparison.js, init-patent-batch.js
    - _Requirements: 4.4, 6.3_
  
  - [x] 8.2 Create init-async-batch.js module
    - Extract initAsyncBatch function from main.js
    - Export initialization function
    - _Requirements: 4.4, 4.5_
  
  - [x] 8.3 Create init-large-batch.js module
    - Extract initLargeBatch function from main.js
    - Export initialization function
    - _Requirements: 4.4, 4.5_
  
  - [x] 8.4 Create init-local-patent-lib.js module
    - Extract initLocalPatentLib function from main.js
    - Export initialization function
    - _Requirements: 4.4, 4.5_
  
  - [x] 8.5 Create init-claims-comparison.js module
    - Extract initClaimsComparison function from main.js
    - Export initialization function
    - _Requirements: 4.4, 4.5_
  
  - [x] 8.6 Create init-patent-batch.js module
    - Extract initPatentBatch function from main.js
    - Export initialization function
    - _Requirements: 4.4, 4.5_
  
  - [x] 8.7 Refactor main.js to orchestrate initialization
    - Import all initialization modules
    - Maintain initialization order
    - Keep DOMContentLoaded event handler
    - _Requirements: 4.1, 4.5, 4.7_
  
  - [ ]* 8.8 Write property test for load order correctness
    - **Property 9: Load Order Correctness**
    - **Validates: Requirements 4.5, 5.3, 8.7**

- [ ] 9. Create comprehensive documentation
  - [ ] 9.1 Create module dependency diagram
    - Document all modules and their dependencies
    - Create visual diagram using Mermaid
    - _Requirements: 9.1_
  
  - [ ] 9.2 Document each module's purpose
    - Add JSDoc comments to all exported functions
    - Document module responsibilities
    - Document interfaces and data structures
    - _Requirements: 9.2, 10.2_
  
  - [ ] 9.3 Create refactoring guide
    - Document refactoring decisions and rationale
    - Provide migration guide for developers
    - Include examples of common modification patterns
    - _Requirements: 9.3, 9.4, 9.7_
  
  - [ ] 9.4 Update project README
    - Update directory structure section
    - Add new module information
    - Update development instructions
    - _Requirements: 9.5, 6.6_

- [ ] 10. Comprehensive testing and validation
  - [ ] 10.1 Run all property-based tests
    - Execute all 10 property tests with 100+ iterations
    - Verify all properties pass
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  
  - [ ] 10.2 Manual testing of all features
    - Test all 8 feature tabs for complete functionality
    - Test file uploads in Features 1, 2, 3, 7, 8
    - Test API interactions in all features
    - Test state management across tab switches
    - _Requirements: 8.2, 8.3, 8.4, 8.5_
  
  - [ ] 10.3 Browser compatibility testing
    - Test in Chrome, Firefox, Safari, Edge
    - Verify no console errors
    - Verify same behavior across browsers
    - _Requirements: 7.7, 8.7_
  
  - [ ] 10.4 Performance testing
    - Measure initial load time (should be ≤ original)
    - Measure tab switch time
    - Measure memory usage
    - _Requirements: 7.3, 8.8_
  
  - [ ] 10.5 Accessibility testing
    - Verify keyboard navigation works
    - Verify screen reader compatibility
    - Verify ARIA labels preserved
    - _Requirements: 7.8_
  
  - [ ]* 10.6 Write integration tests for complete workflows
    - Test chat conversation creation and messaging
    - Test claims processing end-to-end
    - Test patent batch processing
    - _Requirements: 8.2, 8.4, 8.5_

- [ ] 11. Final checkpoint and cleanup
  - [ ] 11.1 Code quality review
    - Verify all modules follow naming conventions
    - Verify all modules have JSDoc comments
    - Verify no modules exceed 500 lines
    - Verify no new global variables introduced
    - _Requirements: 10.1, 10.2, 10.3, 10.8_
  
  - [ ] 11.2 Remove old files
    - Archive original index.html as index.html.backup
    - Archive original chat.js as chat.js.backup
    - Archive original claimsProcessorIntegrated.js as claimsProcessorIntegrated.js.backup
    - Archive original main.js as main.js.backup
    - _Requirements: 6.5_
  
  - [ ] 11.3 Final validation
    - Run complete test suite
    - Perform final manual testing
    - Verify no regressions
    - Get user acceptance
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

- [ ] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The refactoring is done incrementally: infrastructure → HTML → chat → claims → main → testing
- Each feature is tested immediately after refactoring to catch issues early
- Original files are backed up before removal for safety
