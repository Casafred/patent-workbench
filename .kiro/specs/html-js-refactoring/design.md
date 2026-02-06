# Design Document: HTML and JavaScript Refactoring

## Overview

This design outlines the approach for refactoring large HTML and JavaScript files in the patent analysis application. The refactoring will split monolithic files into smaller, focused modules while maintaining exact functionality and user experience. The design follows a component-based architecture for HTML and a module-based architecture for JavaScript.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     index.html (Main Shell)                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Header Component                                      │  │
│  │  - Logo, Version, API Config                          │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Tab Navigation Component                             │  │
│  │  - 8 Feature Tabs                                     │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Tab Content Components (Loaded Dynamically)          │  │
│  │  - Feature 1: Instant Chat                           │  │
│  │  - Feature 2: Async Batch                            │  │
│  │  - Feature 3: Large Batch                            │  │
│  │  - Feature 4: Local Patent Library                   │  │
│  │  - Feature 5: Claims Comparison                      │  │
│  │  - Feature 6: Patent Batch                           │  │
│  │  - Feature 7: Claims Processor                       │  │
│  │  - Feature 8: Drawing Marker                         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  JavaScript Module Architecture              │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Core       │  │   Features   │  │   Utilities  │     │
│  │              │  │              │  │              │     │
│  │ - main.js    │  │ - chat/      │  │ - dom.js     │     │
│  │ - state.js   │  │ - claims/    │  │ - api.js     │     │
│  │ - api.js     │  │ - patent/    │  │ - utils.js   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Module Loading Strategy

We will use a hybrid approach:
1. **Core modules** loaded first via `<script type="module">` for ES6 support
2. **Feature modules** loaded on-demand when tabs are activated
3. **Utility modules** loaded early as they're shared dependencies

## Components and Interfaces

### HTML Component Structure

#### 1. Main Shell (index.html)
**Purpose**: Minimal HTML shell that loads components dynamically

**Structure**:
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <!-- Meta tags, CSS links -->
</head>
<body>
    <div id="vanta-bg"></div>
    <div class="container">
        <div id="header-component"></div>
        <div class="main-content">
            <div id="tab-navigation-component"></div>
            <div id="tab-content-container"></div>
        </div>
    </div>
    <!-- Core scripts -->
    <script src="js/core/component-loader.js"></script>
    <script src="js/core/main.js" type="module"></script>
</body>
</html>
```

#### 2. Header Component (frontend/components/header.html)
**Purpose**: Application header with logo, version, and API config

**Exports**: None (pure HTML)

**Dependencies**: None

#### 3. Tab Navigation Component (frontend/components/tab-navigation.html)
**Purpose**: Main tab navigation for 8 features

**Exports**: None (pure HTML)

**Dependencies**: None

#### 4. Feature Tab Components
Each feature gets its own HTML component file:
- `frontend/components/tabs/instant-chat.html`
- `frontend/components/tabs/async-batch.html`
- `frontend/components/tabs/large-batch.html`
- `frontend/components/tabs/local-patent-lib.html`
- `frontend/components/tabs/claims-comparison.html`
- `frontend/components/tabs/patent-batch.html`
- `frontend/components/tabs/claims-processor.html`
- `frontend/components/tabs/drawing-marker.html`

### JavaScript Module Structure

#### Core Modules

##### 1. Component Loader (js/core/component-loader.js)
**Purpose**: Load and inject HTML components

**Exports**:
```javascript
async function loadComponent(componentPath, targetElementId)
function loadComponentSync(componentPath, targetElementId)
```

**Dependencies**: None

##### 2. Main Initialization (js/core/main.js)
**Purpose**: Application initialization and orchestration

**Exports**:
```javascript
function initializeApp()
function switchTab(tabId, clickedButton)
```

**Dependencies**: 
- component-loader.js
- state.js
- All feature initialization modules

##### 3. State Management (js/core/state.js)
**Purpose**: Centralized application state (already exists, minimal changes)

**Exports**: `appState` object

**Dependencies**: None

##### 4. API Client (js/core/api.js)
**Purpose**: Unified API calling logic (extracted from main.js)

**Exports**:
```javascript
async function apiCall(endpoint, body, method, isStream)
function initApiKeyConfig()
```

**Dependencies**: state.js

#### Chat Feature Modules

##### 1. Chat Core (js/modules/chat/chat-core.js)
**Purpose**: Main chat initialization and coordination

**Exports**:
```javascript
function initChat()
function handleStreamChatRequest()
```

**Dependencies**: 
- chat-file-handler.js
- chat-conversation.js
- chat-message.js
- chat-persona.js

##### 2. Chat File Handler (js/modules/chat/chat-file-handler.js)
**Purpose**: File upload, parsing, and caching

**Exports**:
```javascript
async function handleChatFileUpload(event, fileFromReuse)
async function startFileUpload()
function cancelFileUpload()
function removeActiveFile()
function updateParserServiceDescription()
```

**Dependencies**: 
- fileParserHandler.js
- state.js

##### 3. Chat Conversation (js/modules/chat/chat-conversation.js)
**Purpose**: Conversation management and history

**Exports**:
```javascript
function loadConversations()
function saveConversations()
function startNewChat(shouldSwitch)
function switchConversation(conversationId)
function deleteConversation(event, conversationId)
function renderChatHistoryList()
```

**Dependencies**: state.js

##### 4. Chat Message (js/modules/chat/chat-message.js)
**Purpose**: Message rendering and display

**Exports**:
```javascript
function renderCurrentChat()
function addMessageToDOM(role, content, index, isStreaming)
function updateCharCount()
```

**Dependencies**: state.js

##### 5. Chat Persona (js/modules/chat/chat-persona.js)
**Purpose**: Persona management

**Exports**:
```javascript
function loadPersonas()
function savePersonas()
function addPersona()
function deletePersona()
function updatePersonaEditor()
```

**Dependencies**: state.js

##### 6. Chat Search (js/modules/chat/chat-search.js)
**Purpose**: Search functionality

**Exports**:
```javascript
async function handleSearch()
function toggleSearchMode()
```

**Dependencies**: api.js, state.js

##### 7. Chat Export (js/modules/chat/chat-export.js)
**Purpose**: Export functionality (TXT, PNG, PDF)

**Exports**:
```javascript
function exportChatHistory(format)
```

**Dependencies**: External libraries (html2canvas, jsPDF)

#### Claims Processor Modules

##### 1. Claims Core (js/modules/claims/claims-core.js)
**Purpose**: Main claims processor initialization

**Exports**:
```javascript
function initClaimsProcessor()
function switchClaimsSubTab(tabName)
```

**Dependencies**: All other claims modules

##### 2. Claims File Handler (js/modules/claims/claims-file-handler.js)
**Purpose**: File upload and column detection

**Exports**:
```javascript
async function handleClaimsFileSelect(event)
async function loadClaimsColumns(filePath, sheetName)
function claimsShowPatentColumnSelector(columns, selectedColumn)
```

**Dependencies**: api.js, state.js

##### 3. Claims Processor (js/modules/claims/claims-processor.js)
**Purpose**: Claims processing logic

**Exports**:
```javascript
async function handleClaimsProcess()
function startClaimsPolling()
async function loadClaimsResults(retryCount)
```

**Dependencies**: api.js, state.js

##### 4. Claims Visualization (js/modules/claims/claims-visualization.js)
**Purpose**: Visualization rendering

**Exports**:
```javascript
function claimsGenerateVisualization()
class ClaimsVisualizationRenderer
```

**Dependencies**: d3.js, state.js

##### 5. Claims Text Analyzer (js/modules/claims/claims-text-analyzer.js)
**Purpose**: Text analysis functionality

**Exports**:
```javascript
function initClaimsTextAnalyzer()
async function analyzeClaimsText()
function renderClaimsTextVisualization()
```

**Dependencies**: api.js, state.js

##### 6. Claims Patent Search (js/modules/claims/claims-patent-search.js)
**Purpose**: Patent number search functionality

**Exports**:
```javascript
async function claimsSearchPatentNumbers()
function displayPatentResults(results)
```

**Dependencies**: api.js, state.js

#### Main.js Refactored Modules

##### 1. Tab Navigation (js/modules/navigation/tab-navigation.js)
**Purpose**: Tab switching logic

**Exports**:
```javascript
function switchTab(tabId, clickedButton)
function switchAsyncSubTab(subTabId, clickedElement)
function switchSubTab(subTabId, clickedElement)
function switchLPLSubTab(subTabId, clickedElement)
function updateStepperState(stepper, activeStepElement)
```

**Dependencies**: component-loader.js

##### 2. Feature Initializers (js/modules/init/)
Each feature gets its own initialization module:
- `init-async-batch.js`
- `init-large-batch.js`
- `init-local-patent-lib.js`
- `init-claims-comparison.js`
- `init-patent-batch.js`

**Pattern**:
```javascript
export function initFeatureName() {
    // Feature-specific initialization
}
```

## Data Models

### Component Metadata
```javascript
{
    path: string,           // Component file path
    targetId: string,       // Target DOM element ID
    loaded: boolean,        // Load status
    dependencies: string[]  // Required components
}
```

### Module Registry
```javascript
{
    moduleName: string,
    path: string,
    loaded: boolean,
    exports: object,
    dependencies: string[]
}
```

### File State (Existing, preserved)
```javascript
appState.chat.activeFile = {
    taskId: string,
    filename: string,
    content: string,
    toolType: string
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Component Loading Completeness
*For any* HTML component that is requested to load, the component loader should successfully inject the HTML into the target element and return a success status.

**Validates: Requirements 1.2, 5.3**

### Property 2: Module Dependency Resolution
*For any* JavaScript module that declares dependencies, all dependencies should be loaded and available before the module's initialization function executes.

**Validates: Requirements 5.4, 5.5**

### Property 3: Function Signature Preservation
*For any* exported function from the original files, the refactored modules should export a function with the same name and signature.

**Validates: Requirements 2.7, 3.8, 4.6**

### Property 4: Event Handler Preservation
*For any* DOM element with an event handler in the original code, the refactored code should attach the same event handler to the same element.

**Validates: Requirements 1.6, 3.8, 7.2**

### Property 5: State Consistency
*For any* state modification in the original code, the refactored code should modify the same state properties in the same way.

**Validates: Requirements 2.9, 3.9, 4.6, 7.5**

### Property 6: API Call Equivalence
*For any* API call made in the original code, the refactored code should make the same API call with the same parameters.

**Validates: Requirements 7.5, 8.4**

### Property 7: DOM Structure Preservation
*For any* DOM element ID or class in the original HTML, the refactored HTML components should contain the same ID or class.

**Validates: Requirements 1.4, 7.2**

### Property 8: Module Size Constraint
*For any* refactored JavaScript module, the file should contain no more than 500 lines of code.

**Validates: Requirements 10.3**

### Property 9: Load Order Correctness
*For any* sequence of module loads, core modules should load before feature modules, and dependencies should load before dependents.

**Validates: Requirements 4.5, 5.3, 8.7**

### Property 10: Visual Consistency
*For any* page render after refactoring, the visual appearance should be pixel-perfect identical to the original (excluding dynamic content).

**Validates: Requirements 1.3, 7.2**

## Error Handling

### Component Loading Errors
- **Missing Component File**: Display error message, log to console, prevent app crash
- **Invalid HTML**: Sanitize and log warning, attempt to render
- **Network Error**: Retry up to 3 times with exponential backoff

### Module Loading Errors
- **Missing Module**: Display clear error with module name and expected path
- **Circular Dependency**: Detect and throw error with dependency chain
- **Initialization Failure**: Log error, mark module as failed, continue with other modules

### Runtime Errors
- **Missing Function**: Provide fallback or graceful degradation
- **State Corruption**: Reset to default state, log error
- **API Failure**: Use existing error handling patterns (already implemented)

## Testing Strategy

### Unit Testing
- Test component loader with various HTML structures
- Test module dependency resolver with different dependency graphs
- Test each refactored module's exported functions individually
- Test error handling for missing files and invalid content

### Integration Testing
- Test complete application initialization sequence
- Test tab switching with component loading
- Test feature functionality end-to-end
- Test state management across modules
- Test API calls from refactored modules

### Property-Based Testing
Each correctness property will be tested with property-based tests:

**Property 1: Component Loading Completeness**
- Generate random component paths and target IDs
- Verify successful injection or appropriate error

**Property 2: Module Dependency Resolution**
- Generate random dependency graphs
- Verify correct load order

**Property 3: Function Signature Preservation**
- Compare exported functions between original and refactored
- Verify same names and parameter counts

**Property 4: Event Handler Preservation**
- Extract all event handlers from original code
- Verify same handlers attached in refactored code

**Property 5: State Consistency**
- Generate random state modifications
- Verify same state changes in both versions

**Property 6: API Call Equivalence**
- Intercept API calls in both versions
- Verify same endpoints and parameters

**Property 7: DOM Structure Preservation**
- Extract all IDs and classes from original HTML
- Verify presence in refactored components

**Property 8: Module Size Constraint**
- For all refactored modules, count lines
- Verify ≤ 500 lines

**Property 9: Load Order Correctness**
- Generate random module load sequences
- Verify dependencies always load first

**Property 10: Visual Consistency**
- Capture screenshots of original and refactored
- Compare pixel-by-pixel (excluding dynamic content)

### Manual Testing
- Test all 8 feature tabs for functionality
- Test file uploads in all features
- Test API interactions
- Test browser compatibility
- Test performance (load time, responsiveness)

### Configuration
- Minimum 100 iterations per property test
- Each test tagged with: **Feature: html-js-refactoring, Property {number}: {property_text}**
- Use fast-check library for JavaScript property-based testing
