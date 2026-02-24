/**
 * Drawing Marker Initialization Module
 * 
 * This module handles all initialization logic for the Drawing Marker feature (Feature 8).
 * It extracts initialization code from frontend/index.html into a dedicated module.
 * 
 * @module drawing-marker-init
 */

/**
 * Initialize Drawing Marker feature
 * Called after HTML component is loaded and DOM is ready
 */
function initDrawingMarker() {
    console.log('🎨 Initializing Drawing Marker...');
    
    try {
        initAIProcessingPanel();
        initPromptEditor();
        initImageUpload();
        initSpecificationInput();
        initOCRModeSelect();
        initProcessingButtons();
        initResultDisplay();
        initReprocessManager();
        
        console.log('✅ Drawing Marker initialized successfully');
    } catch (error) {
        console.error('❌ Drawing Marker initialization failed:', error);
        throw error;
    }
}

/**
 * Initialize AI Processing Panel
 */
function initAIProcessingPanel() {
    const container = document.getElementById('aiProcessingPanelContainer');
    if (!container) {
        console.error('❌ aiProcessingPanelContainer not found');
        return;
    }
    
    try {
        // Check if AIProcessingPanel class is available
        if (typeof AIProcessingPanel === 'undefined') {
            console.error('❌ AIProcessingPanel class not found');
            return;
        }
        
        const panel = new AIProcessingPanel('aiProcessingPanelContainer');
        panel.render();
        
        // Save to global scope for other functions
        window.aiProcessingPanel = panel;
        
        console.log('✅ AI Processing Panel initialized');
    } catch (error) {
        console.error('❌ Failed to initialize AI Processing Panel:', error);
    }
}

/**
 * Initialize Prompt Editor
 */
function initPromptEditor() {
    const container = document.getElementById('promptEditorContainer');
    if (!container) {
        console.error('❌ promptEditorContainer not found');
        return;
    }
    
    try {
        // Check if PromptEditor class is available
        if (typeof PromptEditor === 'undefined') {
            console.error('❌ PromptEditor class not found');
            return;
        }
        
        const editor = new PromptEditor('promptEditorContainer');
        editor.render();
        
        // Set custom prompt in AI panel
        if (window.aiProcessingPanel) {
            window.aiProcessingPanel.setCustomPrompt(editor.getPrompt());
        }
        
        // Listen for prompt changes
        document.addEventListener('promptChanged', (e) => {
            if (window.aiProcessingPanel) {
                window.aiProcessingPanel.setCustomPrompt(e.detail.prompt);
            }
        });
        
        document.addEventListener('promptReset', () => {
            if (window.aiProcessingPanel) {
                window.aiProcessingPanel.setCustomPrompt(editor.getPrompt());
            }
        });
        
        console.log('✅ Prompt Editor initialized');
    } catch (error) {
        console.error('❌ Failed to initialize Prompt Editor:', error);
    }
}

/**
 * Initialize image upload handlers
 */
function initImageUpload() {
    const uploadInput = document.getElementById('drawing_upload_input');
    const pasteArea = document.getElementById('drawing_paste_area');
    
    if (!uploadInput) {
        console.error('❌ drawing_upload_input not found');
        return;
    }
    
    if (!pasteArea) {
        console.error('❌ drawing_paste_area not found');
        return;
    }
    
    try {
        // Check if handler functions exist (defined in frontend/index.html)
        if (typeof handleDrawingUpload !== 'function') {
            console.error('❌ handleDrawingUpload function not found');
            return;
        }
        
        if (typeof handleDrawingPaste !== 'function') {
            console.error('❌ handleDrawingPaste function not found');
            return;
        }
        
        // File input change event
        uploadInput.addEventListener('change', handleDrawingUpload);
        
        // Click paste area to trigger file selection
        pasteArea.addEventListener('click', function() {
            uploadInput.click();
        });
        
        // Paste event handling
        pasteArea.addEventListener('paste', handleDrawingPaste);
        
        console.log('✅ Image upload handlers initialized');
    } catch (error) {
        console.error('❌ Failed to initialize image upload handlers:', error);
    }
}

function initSpecificationInput() {
    const specInput = document.getElementById('specification_input');
    
    if (!specInput) {
        console.error('❌ specification_input not found');
        return;
    }
    
    try {
        console.log('✅ Specification input initialized');
    } catch (error) {
        console.error('❌ Failed to initialize specification input:', error);
    }
}

function initOCRModeSelect() {
    const ocrModeSelect = document.getElementById('ocr_mode_select');
    const ocrModeHint = document.getElementById('ocr_mode_hint');
    
    if (!ocrModeSelect) {
        console.warn('⚠️ ocr_mode_select not found');
        return;
    }
    
    try {
        ocrModeSelect.addEventListener('change', function() {
            const selectedMode = this.value;
            
            if (ocrModeHint) {
                if (selectedMode === 'glm_ocr') {
                    ocrModeHint.innerHTML = '💡 GLM OCR API需要API Key，可能更精准但会消耗API额度';
                    ocrModeHint.style.color = '#856404';
                } else {
                    ocrModeHint.innerHTML = '💡 内置RapidOCR无需联网，GLM OCR可能更精准但需消耗API额度';
                    ocrModeHint.style.color = '#6c757d';
                }
            }
            
            console.log(`OCR mode changed to: ${selectedMode}`);
        });
        
        console.log('✅ OCR mode select initialized');
    } catch (error) {
        console.error('❌ Failed to initialize OCR mode select:', error);
    }
}

function initProcessingButtons() {
    const startBtn = document.getElementById('start_processing_btn');
    const clearBtn = document.getElementById('clear_all_btn');
    const reprocessOcrBtn = document.getElementById('reprocess_ocr_btn');
    const reprocessSpecBtn = document.getElementById('reprocess_spec_btn');
    const specInput = document.getElementById('specification_input');
    
    if (!startBtn) {
        console.error('❌ start_processing_btn not found');
        return;
    }
    
    try {
        // Check if handler functions exist (defined in frontend/index.html)
        const requiredFunctions = [
            'startProcessing',
            'clearAllDrawings',
            'reprocessOCR',
            'reprocessSpecification',
            'clearCacheOnInputChange',
            'restoreCachedProcessingResult'
        ];
        
        const missingFunctions = requiredFunctions.filter(fn => typeof window[fn] !== 'function');
        if (missingFunctions.length > 0) {
            console.warn('⚠️ Some handler functions not found:', missingFunctions);
        }
        
        // Start processing button
        if (startBtn && typeof startProcessing === 'function') {
            startBtn.addEventListener('click', startProcessing);
            console.log('✅ Start processing button initialized');
        }
        
        // Clear all button
        if (clearBtn && typeof clearAllDrawings === 'function') {
            clearBtn.addEventListener('click', clearAllDrawings);
            console.log('✅ Clear all button initialized');
        }
        
        // Reprocess OCR button
        if (reprocessOcrBtn && typeof reprocessOCR === 'function') {
            reprocessOcrBtn.addEventListener('click', reprocessOCR);
            console.log('✅ Reprocess OCR button initialized');
        }
        
        // Reprocess specification button
        if (reprocessSpecBtn && typeof reprocessSpecification === 'function') {
            reprocessSpecBtn.addEventListener('click', reprocessSpecification);
            console.log('✅ Reprocess specification button initialized');
        }
        
        // Specification input change listener (with debounce)
        if (specInput && typeof clearCacheOnInputChange === 'function') {
            let specificationChangeTimeout;
            specInput.addEventListener('input', () => {
                // Debounce: clear cache 1 second after user stops typing
                clearTimeout(specificationChangeTimeout);
                specificationChangeTimeout = setTimeout(() => {
                    clearCacheOnInputChange('说明书内容');
                }, 1000);
            });
            console.log('✅ Specification input change listener initialized');
        }
        
        // Try to restore cached processing result
        if (typeof restoreCachedProcessingResult === 'function') {
            restoreCachedProcessingResult();
            console.log('✅ Attempted to restore cached processing result');
        }
        
        console.log('✅ Processing buttons initialized');
    } catch (error) {
        console.error('❌ Failed to initialize processing buttons:', error);
    }
}

/**
 * Initialize result display
 */
function initResultDisplay() {
    const resultContainer = document.getElementById('processing_result');
    const annotatedContainer = document.getElementById('annotated_drawings_container');
    
    if (!resultContainer) {
        console.error('❌ processing_result not found');
    }
    
    if (!annotatedContainer) {
        console.error('❌ annotated_drawings_container not found');
    }
    
    try {
        console.log('✅ Result display containers initialized');
    } catch (error) {
        console.error('❌ Failed to initialize result display:', error);
    }
}

/**
 * Initialize reprocess manager
 */
function initReprocessManager() {
    try {
        // Check if DrawingReprocessManager class is available
        if (typeof DrawingReprocessManager === 'undefined') {
            console.warn('⚠️ DrawingReprocessManager class not found, skipping');
            return;
        }
        
        window.reprocessManager = new DrawingReprocessManager();
        console.log('✅ Reprocess manager initialized');
    } catch (error) {
        console.error('❌ Failed to initialize reprocess manager:', error);
    }
}

// Export to global scope
window.initDrawingMarker = initDrawingMarker;

console.log('📦 Drawing Marker initialization module loaded');
