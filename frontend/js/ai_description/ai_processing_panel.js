/**
 * AI Processing Panel
 * 
 * Provides UI controls for AI-powered description processing mode.
 * Includes toggle switch, model selector, and configuration management.
 */

class AIProcessingPanel {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container with id "${containerId}" not found`);
            return;
        }
        
        this.isAIMode = false;
        this.selectedModel = null;
        this.models = [];
        this.customPrompt = null;
        
        // Load saved state from localStorage
        this.loadState();
    }
    
    /**
     * Load saved state from localStorage
     */
    loadState() {
        try {
            const savedState = localStorage.getItem('aiProcessingState');
            if (savedState) {
                const state = JSON.parse(savedState);
                this.isAIMode = state.isAIMode || false;
                this.selectedModel = state.selectedModel || null;
                this.customPrompt = state.customPrompt || null;
            }
        } catch (e) {
            console.error('Failed to load AI processing state:', e);
        }
    }
    
    /**
     * Save current state to localStorage
     */
    saveState() {
        try {
            const state = {
                isAIMode: this.isAIMode,
                selectedModel: this.selectedModel,
                customPrompt: this.customPrompt
            };
            localStorage.setItem('aiProcessingState', JSON.stringify(state));
        } catch (e) {
            console.error('Failed to save AI processing state:', e);
        }
    }
    
    /**
     * Render the control panel UI
     */
    render() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="ai-processing-panel">
                <div class="ai-mode-toggle">
                    <label class="toggle-label">
                        <input type="checkbox" id="aiModeToggle" ${this.isAIMode ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                        <span class="toggle-text">说明书的AI处理</span>
                    </label>
                    <span class="toggle-hint">开启后使用AI智能抽取部件标记</span>
                </div>
                
                <div id="aiModeOptions" class="ai-mode-options" style="display: ${this.isAIMode ? 'block' : 'none'};">
                    <div class="model-selector-container">
                        <label for="modelSelector">选择AI模型:</label>
                        <select id="modelSelector" class="model-selector">
                            <option value="">加载中...</option>
                        </select>
                    </div>
                    
                    <div class="prompt-editor-container" id="promptEditorContainer">
                        <!-- Prompt editor will be inserted here -->
                    </div>
                </div>
            </div>
        `;
        
        // Attach event listeners
        this.attachEventListeners();
        
        // Load models
        this.loadModels();
    }
    
    /**
     * Attach event listeners to UI elements
     */
    attachEventListeners() {
        const toggle = document.getElementById('aiModeToggle');
        if (toggle) {
            toggle.addEventListener('change', (e) => {
                this.toggleMode(e.target.checked);
            });
        }
        
        const modelSelector = document.getElementById('modelSelector');
        if (modelSelector) {
            modelSelector.addEventListener('change', (e) => {
                this.selectModel(e.target.value);
            });
        }
    }
    
    /**
     * Toggle AI processing mode
     */
    toggleMode(enabled) {
        this.isAIMode = enabled;
        this.saveState();
        
        // Update UI
        const optionsDiv = document.getElementById('aiModeOptions');
        if (optionsDiv) {
            optionsDiv.style.display = enabled ? 'block' : 'none';
        }
        
        // Trigger custom event
        const event = new CustomEvent('aiModeChanged', {
            detail: { enabled: this.isAIMode }
        });
        document.dispatchEvent(event);
    }
    
    /**
     * Load available models from config
     */
    async loadModels() {
        try {
            const response = await fetch('/config/models.json');
            const config = await response.json();
            
            this.models = config.models || [];
            
            // Update model selector
            const modelSelector = document.getElementById('modelSelector');
            if (modelSelector && this.models.length > 0) {
                modelSelector.innerHTML = this.models.map(model => 
                    `<option value="${model}" ${model === this.selectedModel ? 'selected' : ''}>${model}</option>`
                ).join('');
                
                // Set default model if none selected
                if (!this.selectedModel && this.models.length > 0) {
                    this.selectedModel = this.models[0];
                    this.saveState();
                }
            }
        } catch (e) {
            console.error('Failed to load models:', e);
            const modelSelector = document.getElementById('modelSelector');
            if (modelSelector) {
                modelSelector.innerHTML = '<option value="">加载失败</option>';
            }
        }
    }
    
    /**
     * Select a model
     */
    selectModel(modelName) {
        this.selectedModel = modelName;
        this.saveState();
        
        // Trigger custom event
        const event = new CustomEvent('modelSelected', {
            detail: { model: modelName }
        });
        document.dispatchEvent(event);
    }
    
    /**
     * Get current configuration
     */
    getConfig() {
        return {
            aiMode: this.isAIMode,
            model: this.selectedModel,
            prompt: this.customPrompt
        };
    }
    
    /**
     * Set custom prompt
     */
    setCustomPrompt(prompt) {
        this.customPrompt = prompt;
        this.saveState();
    }
    
    /**
     * Get display mode status
     */
    getDisplayedMode() {
        return this.isAIMode;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIProcessingPanel;
}
