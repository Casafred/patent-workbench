/**
 * PDF-OCR 悬浮工具栏模块
 * 处理选中文本后的操作工具栏
 */

class PDFOCRFloatingToolbar {
    constructor() {
        this.toolbar = null;
        this.isVisible = false;
        this.currentSelection = null;
        
        // 配置
        this.config = {
            offsetY: -50, // 工具栏相对于选中区域的偏移
            animationDuration: 200
        };
        
        this.init();
    }
    
    init() {
        this.createToolbar();
        this.bindEvents();
    }
    
    /**
     * 创建工具栏
     */
    createToolbar() {
        // 检查是否已存在
        if (document.getElementById('ocr-floating-toolbar')) {
            this.toolbar = document.getElementById('ocr-floating-toolbar');
            return;
        }
        
        this.toolbar = document.createElement('div');
        this.toolbar.id = 'ocr-floating-toolbar';
        this.toolbar.className = 'floating-toolbar';
        this.toolbar.style.cssText = `
            position: fixed;
            display: none;
            z-index: 1000;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            padding: 6px;
            gap: 4px;
            transform: translateX(-50%);
            transition: opacity ${this.config.animationDuration}ms ease, transform ${this.config.animationDuration}ms ease;
            opacity: 0;
        `;
        
        this.toolbar.innerHTML = `
            <button class="toolbar-btn" data-action="copy" title="复制">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span>复制</span>
            </button>
            <button class="toolbar-btn" data-action="translate" title="翻译">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 8l6 6"></path>
                    <path d="M4 14l6-6 2-3"></path>
                    <path d="M2 5h12"></path>
                    <path d="M7 2h1"></path>
                    <path d="M22 22l-5-10-5 10"></path>
                    <path d="M14 18h6"></path>
                </svg>
                <span>翻译</span>
            </button>
            <button class="toolbar-btn" data-action="chat" title="对话">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>对话</span>
            </button>
            <button class="toolbar-btn" data-action="quote" title="引用">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10 11h-4a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 1 -1h3a1 1 0 0 1 1 1v6c0 2.667 -1.333 4.333 -4 5"></path>
                    <path d="M19 11h-4a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 1 -1h3a1 1 0 0 1 1 1v6c0 2.667 -1.333 4.333 -4 5"></path>
                </svg>
                <span>引用</span>
            </button>
        `;
        
        document.body.appendChild(this.toolbar);
        
        // 绑定按钮事件
        this.bindToolbarEvents();
    }
    
    /**
     * 绑定工具栏事件
     */
    bindToolbarEvents() {
        const buttons = this.toolbar.querySelectorAll('.toolbar-btn');
        
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                this.handleAction(action);
            });
        });
    }
    
    /**
     * 绑定全局事件
     */
    bindEvents() {
        // 监听显示工具栏事件
        document.addEventListener('pdfocr:showToolbar', (e) => {
            this.show(e.detail);
        });
        
        // 监听清除选择事件
        document.addEventListener('pdfocr:clearSelection', () => {
            this.hide();
        });
        
        // 点击其他地方隐藏工具栏
        document.addEventListener('click', (e) => {
            if (this.isVisible && 
                !this.toolbar.contains(e.target) &&
                !e.target.closest('.ocr-selection-layer')) {
                this.hide();
            }
        });
        
        // 滚动时隐藏
        window.addEventListener('scroll', () => {
            if (this.isVisible) {
                this.hide();
            }
        }, { passive: true });
    }
    
    /**
     * 显示工具栏
     */
    show(selectionData) {
        this.currentSelection = selectionData;
        
        // 计算位置
        const rect = this.calculatePosition(selectionData);
        
        this.toolbar.style.left = `${rect.left}px`;
        this.toolbar.style.top = `${rect.top}px`;
        this.toolbar.style.display = 'flex';
        
        // 触发动画
        requestAnimationFrame(() => {
            this.toolbar.style.opacity = '1';
            this.toolbar.style.transform = 'translateX(-50%) translateY(0)';
        });
        
        this.isVisible = true;
    }
    
    /**
     * 隐藏工具栏
     */
    hide() {
        if (!this.isVisible) return;
        
        this.toolbar.style.opacity = '0';
        this.toolbar.style.transform = 'translateX(-50%) translateY(-10px)';
        
        setTimeout(() => {
            if (!this.isVisible) {
                this.toolbar.style.display = 'none';
            }
        }, this.config.animationDuration);
        
        this.isVisible = false;
        this.currentSelection = null;
    }
    
    /**
     * 计算工具栏位置
     */
    calculatePosition(selectionData) {
        const viewerContainer = document.getElementById('pdf-canvas');
        if (!viewerContainer) {
            return { left: selectionData.x, top: selectionData.y + this.config.offsetY };
        }
        
        const containerRect = viewerContainer.getBoundingClientRect();
        
        // 计算工具栏位置（相对于视口）
        let left = containerRect.left + selectionData.x;
        let top = containerRect.top + selectionData.selectionRect.top + this.config.offsetY;
        
        // 确保不超出视口边界
        const toolbarRect = this.toolbar.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // 水平边界检查
        if (left - toolbarRect.width / 2 < 10) {
            left = toolbarRect.width / 2 + 10;
        } else if (left + toolbarRect.width / 2 > viewportWidth - 10) {
            left = viewportWidth - toolbarRect.width / 2 - 10;
        }
        
        // 垂直边界检查（如果上方空间不足，显示在下方）
        if (top < toolbarRect.height + 10) {
            top = containerRect.top + selectionData.selectionRect.bottom + 10;
        }
        
        return { left, top };
    }
    
    /**
     * 处理工具栏操作
     */
    handleAction(action) {
        if (!this.currentSelection) return;
        
        const { selectedText, selectedBlocks } = this.currentSelection;
        
        switch (action) {
            case 'copy':
                this.copyText(selectedText);
                break;
            case 'translate':
                this.translateText(selectedText);
                break;
            case 'chat':
                this.openChat(selectedText, selectedBlocks);
                break;
            case 'quote':
                this.addQuote(selectedText, selectedBlocks);
                break;
        }
        
        // 隐藏工具栏
        this.hide();
    }
    
    /**
     * 复制文本
     */
    async copyText(text) {
        if (!text) {
            this.showToast('没有可复制的内容', 'error');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('已复制到剪贴板', 'success');
        } catch (err) {
            // 降级方案
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showToast('已复制到剪贴板', 'success');
        }
    }
    
    /**
     * 翻译文本
     */
    translateText(text) {
        if (!text) {
            this.showToast('没有可翻译的内容', 'error');
            return;
        }
        
        // 填充到翻译面板
        const sourceInput = document.getElementById('ocr-translate-source');
        const resultDiv = document.getElementById('ocr-translate-result');
        
        if (sourceInput) {
            sourceInput.value = text;
        }
        
        if (resultDiv) {
            resultDiv.textContent = '翻译中...';
        }
        
        // 切换到翻译标签页
        const translateTab = document.querySelector('[data-tab="translation"]');
        if (translateTab) {
            translateTab.click();
        }
        
        // 自动触发翻译
        this.performTranslation(text);
        
        this.showToast('已添加到翻译面板', 'success');
    }
    
    /**
     * 执行翻译
     */
    async performTranslation(text) {
        const targetLang = document.getElementById('ocr-translate-target')?.value || 'zh';
        const resultDiv = document.getElementById('ocr-translate-result');
        
        try {
            const apiKey = await this.getAPIKey();
            if (!apiKey) {
                if (resultDiv) resultDiv.textContent = '请先配置API密钥';
                return;
            }
            
            // 调用翻译API
            const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'glm-4-flash',
                    messages: [
                        {
                            role: 'system',
                            content: `你是一个翻译助手。请将用户提供的文本翻译成${targetLang === 'zh' ? '中文' : '英文'}，只返回翻译结果，不要添加任何解释。`
                        },
                        {
                            role: 'user',
                            content: text
                        }
                    ]
                })
            });
            
            if (!response.ok) {
                throw new Error('翻译请求失败');
            }
            
            const data = await response.json();
            const translation = data.choices?.[0]?.message?.content || '翻译失败';
            
            if (resultDiv) {
                resultDiv.textContent = translation;
            }
        } catch (error) {
            console.error('翻译失败:', error);
            if (resultDiv) {
                resultDiv.textContent = '翻译失败: ' + error.message;
            }
        }
    }
    
    /**
     * 打开对话窗口
     */
    openChat(text, blocks) {
        if (!text) {
            this.showToast('没有可对话题的内容', 'error');
            return;
        }
        
        // 触发打开悬浮对话窗口事件
        this.emit('openFloatingChat', {
            context: text,
            blocks: blocks,
            type: 'selection'
        });
        
        this.showToast('已打开对话窗口', 'success');
    }
    
    /**
     * 添加到引用
     */
    addQuote(text, blocks) {
        if (!text) {
            this.showToast('没有可引用的内容', 'error');
            return;
        }
        
        // 创建引用数据
        const quote = {
            id: Date.now(),
            text: text,
            page: window.pdfOCRCore?.currentPage || 1,
            timestamp: new Date().toLocaleString()
        };
        
        // 保存到引用列表
        let quotes = JSON.parse(localStorage.getItem('ocr_quotes') || '[]');
        quotes.push(quote);
        localStorage.setItem('ocr_quotes', JSON.stringify(quotes));
        
        this.showToast('已添加到引用列表', 'success');
        
        // 触发引用添加事件
        this.emit('quoteAdded', quote);
    }
    
    /**
     * 获取API密钥
     */
    async getAPIKey() {
        let apiKey = window.appState?.apiKey || '';
        if (!apiKey) {
            apiKey = localStorage.getItem('globalApiKey') || '';
        }
        if (!apiKey) {
            apiKey = localStorage.getItem('zhipu_api_key') || '';
        }
        return apiKey;
    }
    
    /**
     * 显示提示消息
     */
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `ocr-toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
    
    /**
     * 事件发射器
     */
    emit(eventName, data) {
        const event = new CustomEvent(`pdfocr:${eventName}`, { detail: data });
        document.dispatchEvent(event);
    }
    
    /**
     * 销毁
     */
    destroy() {
        if (this.toolbar) {
            this.toolbar.remove();
            this.toolbar = null;
        }
    }
}

// 暴露类定义
window.PDFOCRFloatingToolbar = PDFOCRFloatingToolbar;
window.pdfOCRFloatingToolbar = null;
