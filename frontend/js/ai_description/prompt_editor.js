/**
 * Prompt Editor
 * 
 * Manages prompt templates and custom prompts for AI processing.
 * Allows users to view, edit, and reset prompts.
 */

class PromptEditor {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container with id "${containerId}" not found`);
            return;
        }
        
        this.defaultTemplate = null;
        this.customPrompt = null;
        
        // Load saved custom prompt
        this.loadCustomPrompt();
        
        // Load default template
        this.loadDefaultTemplate();
    }
    
    /**
     * Load default prompt template
     */
    loadDefaultTemplate() {
        // Default template (matches backend template)
        this.defaultTemplate = `你是一个专利说明书分析专家。请从以下专利说明书中抽取所有的附图标记及其对应的部件名称。

附图标记通常是数字(如10、20、100)或带图号的标记(如"图1"、"图2"、"Fig. 1")。
部件名称是这些标记所指代的具体部件或组件。

要求:
1. 抽取所有出现的附图标记
2. 为每个标记找到对应的部件名称
3. 如果一个标记有多个可能的名称,选择最常见或最准确的一个
4. 忽略纯粹的图号引用(如"如图1所示")
5. 数字标记通常出现在部件名称之后,如"外壳10"、"显示屏20"

请严格按照以下JSON格式返回结果,不要包含任何其他文字:
{
  "components": [
    {"marker": "标记", "name": "部件名称"},
    {"marker": "10", "name": "外壳"},
    {"marker": "20", "name": "显示屏"}
  ]
}

说明书内容:
{description_text}`;
    }
    
    /**
     * Load custom prompt from localStorage
     */
    loadCustomPrompt() {
        try {
            const saved = localStorage.getItem('customPrompt');
            if (saved) {
                this.customPrompt = saved;
            }
        } catch (e) {
            console.error('Failed to load custom prompt:', e);
        }
    }
    
    /**
     * Get current prompt (custom or default)
     */
    getPrompt() {
        return this.customPrompt || this.defaultTemplate;
    }
    
    /**
     * Save custom prompt
     */
    saveCustomPrompt(prompt) {
        this.customPrompt = prompt;
        try {
            localStorage.setItem('customPrompt', prompt);
            
            // Trigger custom event
            const event = new CustomEvent('promptChanged', {
                detail: { prompt: prompt }
            });
            document.dispatchEvent(event);
            
            return true;
        } catch (e) {
            console.error('Failed to save custom prompt:', e);
            return false;
        }
    }
    
    /**
     * Reset to default template
     */
    resetToDefault() {
        this.customPrompt = null;
        try {
            localStorage.removeItem('customPrompt');
            
            // Update UI if rendered
            const textarea = document.getElementById('promptTextarea');
            if (textarea) {
                textarea.value = this.defaultTemplate;
            }
            
            // Trigger custom event
            const event = new CustomEvent('promptReset');
            document.dispatchEvent(event);
            
            return true;
        } catch (e) {
            console.error('Failed to reset prompt:', e);
            return false;
        }
    }
    
    /**
     * Render the prompt editor UI
     */
    render() {
        if (!this.container) return;
        
        const currentPrompt = this.getPrompt();
        const isCustom = this.customPrompt !== null;
        
        this.container.innerHTML = `
            <div class="prompt-editor">
                <div class="prompt-editor-header">
                    <label for="promptTextarea">提示词模板:</label>
                    <div class="prompt-editor-actions">
                        <button id="resetPromptBtn" class="btn-secondary btn-sm" ${!isCustom ? 'disabled' : ''}>
                            重置为默认
                        </button>
                        <button id="savePromptBtn" class="btn-primary btn-sm">
                            保存
                        </button>
                    </div>
                </div>
                
                <textarea 
                    id="promptTextarea" 
                    class="prompt-textarea"
                    rows="12"
                    placeholder="输入自定义提示词..."
                >${currentPrompt}</textarea>
                
                <div class="prompt-editor-hint">
                    <span class="hint-icon">💡</span>
                    <span>提示: 使用 {description_text} 作为说明书文本的占位符</span>
                </div>
                
                <div id="promptEditorMessage" class="prompt-editor-message" style="display: none;"></div>
            </div>
        `;
        
        // Attach event listeners
        this.attachEventListeners();
    }
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        const saveBtn = document.getElementById('savePromptBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.handleSave();
            });
        }
        
        const resetBtn = document.getElementById('resetPromptBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.handleReset();
            });
        }
        
        const textarea = document.getElementById('promptTextarea');
        if (textarea) {
            textarea.addEventListener('input', () => {
                // Enable reset button if content differs from default
                const resetBtn = document.getElementById('resetPromptBtn');
                if (resetBtn) {
                    resetBtn.disabled = textarea.value === this.defaultTemplate;
                }
            });
        }
    }
    
    /**
     * Handle save button click
     */
    handleSave() {
        const textarea = document.getElementById('promptTextarea');
        if (!textarea) return;
        
        const prompt = textarea.value.trim();
        
        if (!prompt) {
            this.showMessage('提示词不能为空', 'error');
            return;
        }
        
        if (!prompt.includes('{description_text}')) {
            this.showMessage('提示词必须包含 {description_text} 占位符', 'error');
            return;
        }
        
        const success = this.saveCustomPrompt(prompt);
        
        if (success) {
            this.showMessage('提示词已保存', 'success');
            
            // Update reset button state
            const resetBtn = document.getElementById('resetPromptBtn');
            if (resetBtn) {
                resetBtn.disabled = false;
            }
        } else {
            this.showMessage('保存失败,请重试', 'error');
        }
    }
    
    /**
     * Handle reset button click
     */
    handleReset() {
        if (confirm('确定要重置为默认提示词吗?')) {
            const success = this.resetToDefault();
            
            if (success) {
                this.showMessage('已重置为默认提示词', 'success');
                
                // Update reset button state
                const resetBtn = document.getElementById('resetPromptBtn');
                if (resetBtn) {
                    resetBtn.disabled = true;
                }
            } else {
                this.showMessage('重置失败,请重试', 'error');
            }
        }
    }
    
    /**
     * Show message to user
     */
    showMessage(message, type = 'info') {
        const messageDiv = document.getElementById('promptEditorMessage');
        if (!messageDiv) return;
        
        messageDiv.textContent = message;
        messageDiv.className = `prompt-editor-message ${type}`;
        messageDiv.style.display = 'block';
        
        // Hide after 3 seconds
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PromptEditor;
}
