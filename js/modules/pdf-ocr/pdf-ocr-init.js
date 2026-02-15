/**
 * PDF-OCR 初始化模块
 * 整合所有模块并完成初始化
 */

class PDFOCRInit {
    constructor() {
        this.initialized = false;
        this.modules = {
            core: null,
            viewer: null,
            parser: null,
            chat: null
        };
    }

    /**
     * 初始化功能九
     */
    async init() {
        if (this.initialized) {
            console.log('PDF-OCR功能已初始化');
            return;
        }

        console.log('正在初始化PDF-OCR功能...');

        try {
            // 等待DOM加载完成
            await this.waitForDOM();

            // 检查依赖
            await this.checkDependencies();

            // 初始化各个模块
            this.initModules();

            // 绑定全局事件
            this.bindGlobalEvents();

            // 加载保存的状态
            this.loadState();

            this.initialized = true;
            console.log('PDF-OCR功能初始化完成');

            // 触发初始化完成事件
            this.emit('initialized');

        } catch (error) {
            console.error('PDF-OCR功能初始化失败:', error);
            this.showError('功能初始化失败: ' + error.message);
        }
    }

    /**
     * 等待DOM加载完成
     */
    waitForDOM() {
        return new Promise((resolve) => {
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                resolve();
            } else {
                document.addEventListener('DOMContentLoaded', resolve);
            }
        });
    }

    /**
     * 检查依赖
     */
    async checkDependencies() {
        // 检查PDF.js
        if (typeof pdfjsLib === 'undefined') {
            console.log('正在加载PDF.js...');
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        // 检查其他依赖
        const dependencies = [
            { name: 'pdfOCRCore', global: 'pdfOCRCore' },
            { name: 'pdfOCRViewer', global: 'pdfOCRViewer' },
            { name: 'pdfOCRParser', global: 'pdfOCRParser' },
            { name: 'pdfOCRChat', global: 'pdfOCRChat' }
        ];

        for (const dep of dependencies) {
            if (!window[dep.global]) {
                throw new Error(`依赖模块未加载: ${dep.name}`);
            }
        }
    }

    /**
     * 加载外部脚本
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * 初始化各个模块
     */
    initModules() {
        // 创建模块实例（DOM已准备好）
        window.pdfOCRCore = new PDFOCRCore();
        window.pdfOCRViewer = new PDFOCRViewer();
        window.pdfOCRParser = new PDFOCRParser();
        window.pdfOCRChat = new PDFOCRChat();

        // 保存模块引用
        this.modules.core = window.pdfOCRCore;
        this.modules.viewer = window.pdfOCRViewer;
        this.modules.parser = window.pdfOCRParser;
        this.modules.chat = window.pdfOCRChat;

        // 设置模块间的关联
        this.setupModuleConnections();
    }

    /**
     * 设置模块间的关联
     */
    setupModuleConnections() {
        // 监听解析完成事件，更新视图
        this.modules.parser.on('parseComplete', (result) => {
            this.modules.viewer.setOCRResult(result);
        });

        // 监听区块选择事件
        this.modules.viewer.on('blockSelected', (block) => {
            // 可以在这里添加区块选择后的联动操作
            console.log('区块已选中:', block);
        });

        // 监听翻译请求
        this.modules.viewer.on('translateBlock', ({ block, text, targetLang }) => {
            // 切换到翻译面板并填充内容
            const translateTab = document.querySelector('[data-tab="translation"]');
            if (translateTab) {
                translateTab.click();
            }

            const sourceInput = document.getElementById('ocr-translate-source');
            const targetSelect = document.getElementById('ocr-translate-target');

            if (sourceInput) sourceInput.value = text;
            if (targetSelect) targetSelect.value = targetLang;
        });

        // 监听提问请求
        this.modules.viewer.on('askAboutBlock', ({ block, context }) => {
            // 切换到AI问答面板并填充内容
            const chatTab = document.querySelector('[data-tab="chat"]');
            if (chatTab) {
                chatTab.click();
            }

            const chatInput = document.getElementById('ocr-chat-input');
            if (chatInput) {
                chatInput.value = context;
                chatInput.focus();
            }
        });
    }

    /**
     * 绑定全局事件
     */
    bindGlobalEvents() {
        // 监听标签切换事件
        document.addEventListener('tabChanged', (e) => {
            if (e.detail?.tabId === 'feature-9') {
                this.onTabActivated();
            }
        });

        // 监听窗口大小变化，重新渲染区块
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (this.modules.viewer?.isBlockMode) {
                    this.modules.viewer.renderBlocks();
                }
            }, 200);
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + O: 打开文件
            if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
                e.preventDefault();
                document.getElementById('ocr-file-input')?.click();
            }

            // Ctrl/Cmd + S: 导出
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                // 显示导出菜单
            }

            // ESC: 取消选中
            if (e.key === 'Escape') {
                this.modules.viewer?.deselectBlock();
            }
        });

        // 导出按钮事件
        document.getElementById('ocr-export-json')?.addEventListener('click', () => {
            this.modules.parser?.exportJSON();
        });

        document.getElementById('ocr-export-markdown')?.addEventListener('click', () => {
            this.modules.parser?.exportMarkdown();
        });

        document.getElementById('ocr-export-text')?.addEventListener('click', () => {
            this.modules.parser?.exportText();
        });
    }

    /**
     * 标签激活时的处理
     */
    onTabActivated() {
        console.log('PDF-OCR功能标签已激活');

        // 如果有保存的文件，重新渲染
        const savedFile = window.state?.get('ocrCurrentFile');
        if (savedFile && this.modules.core) {
            // 恢复文件状态
        }
    }

    /**
     * 加载保存的状态
     */
    loadState() {
        if (!window.state) return;

        // 加载OCR设置
        const settings = window.state.get('ocrSettings');
        if (settings) {
            const modeSelect = document.getElementById('ocr-parse-mode');
            const formulaCheck = document.getElementById('ocr-recognize-formula');
            const tableCheck = document.getElementById('ocr-recognize-table');

            if (modeSelect) modeSelect.value = settings.mode || 'auto';
            if (formulaCheck) formulaCheck.checked = settings.recognizeFormula ?? true;
            if (tableCheck) tableCheck.checked = settings.recognizeTable ?? true;
        }

        // 加载OCR结果
        const result = window.state.get('ocrResult');
        if (result) {
            this.modules.viewer?.setOCRResult(result);
            this.modules.parser?.handleParseResult(result);
        }
    }

    /**
     * 保存当前状态
     */
    saveState() {
        if (!window.state) return;

        // 保存设置
        const settings = {
            mode: document.getElementById('ocr-parse-mode')?.value || 'auto',
            recognizeFormula: document.getElementById('ocr-recognize-formula')?.checked ?? true,
            recognizeTable: document.getElementById('ocr-recognize-table')?.checked ?? true
        };
        window.state.set('ocrSettings', settings);

        // 保存解析结果
        const result = this.modules.parser?.getCurrentResult();
        if (result) {
            window.state.set('ocrResult', result);
        }
    }

    /**
     * 重置功能
     */
    reset() {
        // 清除所有模块数据
        this.modules.core?.clear();
        this.modules.viewer?.clear();
        this.modules.parser?.clear();
        this.modules.chat?.clear();

        // 清除状态
        if (window.state) {
            window.state.remove('ocrResult');
            window.state.remove('ocrCurrentFile');
        }

        console.log('PDF-OCR功能已重置');
    }

    /**
     * 显示错误信息
     */
    showError(message) {
        const container = document.getElementById('pdf-ocr-container');
        if (container) {
            const errorEl = document.createElement('div');
            errorEl.className = 'ocr-error-banner';
            errorEl.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <span>${message}</span>
                <button class="close-btn"><i class="fas fa-times"></i></button>
            `;

            errorEl.querySelector('.close-btn').addEventListener('click', () => {
                errorEl.remove();
            });

            container.insertBefore(errorEl, container.firstChild);

            // 自动隐藏
            setTimeout(() => {
                errorEl.remove();
            }, 5000);
        }
    }

    /**
     * 显示提示信息
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `ocr-toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * 获取模块实例
     */
    getModule(name) {
        return this.modules[name] || null;
    }

    /**
     * 检查是否已初始化
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * 事件发射器
     */
    emit(eventName, data) {
        const event = new CustomEvent(`pdfocr:${eventName}`, { detail: data });
        document.dispatchEvent(event);
    }

    /**
     * 监听事件
     */
    on(eventName, callback) {
        document.addEventListener(`pdfocr:${eventName}`, (e) => callback(e.detail));
    }
}

// 创建全局实例
window.pdfOCRInit = new PDFOCRInit();

// 自动初始化（如果DOM已准备好）
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    window.pdfOCRInit.init();
} else {
    document.addEventListener('DOMContentLoaded', () => {
        window.pdfOCRInit.init();
    });
}
