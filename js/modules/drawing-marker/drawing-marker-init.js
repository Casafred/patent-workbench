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
    const paddleTokenContainer = document.getElementById('paddle_token_input_container');
    
    if (!ocrModeSelect) {
        console.warn('⚠️ ocr_mode_select not found');
        return;
    }
    
    try {
        const updateOCRModeUI = () => {
            const selectedMode = ocrModeSelect.value;
            
            if (paddleTokenContainer) {
                paddleTokenContainer.style.display = selectedMode === 'paddle_ocr' ? 'block' : 'none';
            }
            
            if (ocrModeHint) {
                if (selectedMode === 'glm_ocr') {
                    ocrModeHint.innerHTML = '💡 GLM OCR API需要API Key，可能更精准但会消耗API额度';
                    ocrModeHint.style.color = '#856404';
                } else if (selectedMode === 'paddle_ocr') {
                    ocrModeHint.innerHTML = '💡 PP-OCRv5需要百度AI Studio Token，请在下方输入';
                    ocrModeHint.style.color = '#856404';
                } else {
                    ocrModeHint.innerHTML = '💡 内置RapidOCR无需联网，云端OCR可能更精准但需配置密钥';
                    ocrModeHint.style.color = '#6c757d';
                }
            }
            
            console.log(`OCR mode: ${selectedMode}`);
        };
        
        ocrModeSelect.addEventListener('change', updateOCRModeUI);
        
        updateOCRModeUI();
        
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

/**
 * 从专利详情接收数据并填充到功能八
 * @param {Array} drawings - 附图URL数组
 * @param {string} description - 说明书内容
 * @param {string} patentNumber - 专利号
 * @param {string} patentTitle - 专利标题
 */
window.fillDrawingMarkerData = async function(drawings, description, patentNumber, patentTitle) {
    console.log('[fillDrawingMarkerData] 接收数据:', { 
        drawingsCount: drawings?.length, 
        descriptionLength: description?.length,
        patentNumber,
        patentTitle 
    });
    
    const specInput = document.getElementById('specification_input');
    const statusDiv = document.getElementById('processing_status');
    
    if (specInput && description) {
        specInput.value = description;
        console.log('[fillDrawingMarkerData] 说明书已填充');
    }
    
    if (statusDiv) {
        statusDiv.innerHTML = `<span style="color: #28a745;">⏳ 正在加载 ${drawings.length} 张附图...</span>`;
    }
    
    if (!drawings || drawings.length === 0) {
        if (statusDiv) {
            statusDiv.innerHTML = `<span style="color: #dc3545;">❌ 没有附图数据</span>`;
        }
        return;
    }
    
    let loadedCount = 0;
    let failedCount = 0;
    const total = drawings.length;
    
    for (let i = 0; i < drawings.length; i++) {
        const url = drawings[i];
        try {
            const proxyResponse = await fetch('/api/drawing-marker/proxy-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: url })
            });
            
            if (!proxyResponse.ok) {
                throw new Error(`Proxy HTTP ${proxyResponse.status}`);
            }
            
            const proxyResult = await proxyResponse.json();
            
            if (!proxyResult.success || !proxyResult.data) {
                throw new Error(proxyResult.error || 'Proxy returned no data');
            }
            
            let base64Data = proxyResult.data;
            base64Data = base64Data.replace(/\s/g, '');
            base64Data = base64Data.replace(/-/g, '+').replace(/_/g, '/');
            while (base64Data.length % 4) {
                base64Data += '=';
            }
            const contentType = proxyResult.content_type || 'image/png';
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let j = 0; j < binaryString.length; j++) {
                bytes[j] = binaryString.charCodeAt(j);
            }
            const blob = new Blob([bytes], { type: contentType });
            const fileName = `附图_${i + 1}.png`;
            const file = new File([blob], fileName, { type: contentType });
            
            if (typeof processImageFile === 'function') {
                processImageFile(file);
                loadedCount++;
            } else {
                console.error('[fillDrawingMarkerData] processImageFile 函数未定义');
                failedCount++;
            }
            
            updateLoadingStatus();
            
        } catch (error) {
            console.error(`[fillDrawingMarkerData] 加载附图失败: ${url}`, error);
            failedCount++;
            updateLoadingStatus();
        }
    }
    
    function updateLoadingStatus() {
        const processed = loadedCount + failedCount;
        
        if (processed < total) {
            if (statusDiv) {
                statusDiv.innerHTML = `<span style="color: #28a745;">⏳ 正在加载附图... (${processed}/${total})</span>`;
            }
        } else {
            if (statusDiv) {
                if (failedCount > 0) {
                    statusDiv.innerHTML = `<span style="color: #856404;">⚠️ 已加载 ${loadedCount}/${total} 张附图 (${failedCount}张失败)，专利: ${patentTitle}</span>`;
                } else {
                    statusDiv.innerHTML = `<span style="color: #28a745;">✅ 已加载 ${loadedCount} 张附图，专利: ${patentTitle}</span>`;
                }
            }
        }
    }
};

window.initDrawingMarker = initDrawingMarker;

console.log('📦 Drawing Marker initialization module loaded');
