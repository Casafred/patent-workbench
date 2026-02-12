/**
 * 通用智能剪贴板系统 (Smart Clipboard)
 * 实现各功能模块间的无缝数据传递
 */

class SmartClipboard {
    constructor() {
        this.history = [];
        this.current = null;
        this.maxHistory = 10;
        this.panelVisible = false;
        this.panelMinimized = false;
        this.pasteButtons = new Map();
        
        // 等待 DOM 和规则加载完成
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        
        // 确保规则已加载
        if (typeof ContentTypeRules === 'undefined') {
            console.warn('SmartClipboard: ContentTypeRules not loaded yet');
            return;
        }
        
        this.loadFromStorage();
        this.createPanel();
        this.injectGlobalStyles();
        this.bindEvents();
        this.startAutoInject();
        
        this.initialized = true;
        console.log('SmartClipboard initialized');
    }

    // 从 localStorage 加载历史
    loadFromStorage() {
        try {
            const saved = localStorage.getItem('smartClipboard_history');
            if (saved) {
                this.history = JSON.parse(saved);
            }
            const current = localStorage.getItem('smartClipboard_current');
            if (current) {
                this.current = JSON.parse(current);
            }
        } catch (e) {
            console.warn('SmartClipboard: Failed to load from storage', e);
        }
    }

    // 保存到 localStorage
    saveToStorage() {
        try {
            localStorage.setItem('smartClipboard_history', JSON.stringify(this.history));
            if (this.current) {
                localStorage.setItem('smartClipboard_current', JSON.stringify(this.current));
            }
        } catch (e) {
            console.warn('SmartClipboard: Failed to save to storage', e);
        }
    }

    // 自动识别内容类型
    detectType(text) {
        if (!text || typeof text !== 'string') {
            return { type: 'plain-text', priority: 1, confidence: 0 };
        }

        const trimmed = text.trim();
        if (!trimmed) {
            return { type: 'plain-text', priority: 1, confidence: 0 };
        }

        let bestMatch = null;
        let bestScore = 0;

        for (const [type, config] of Object.entries(ContentTypeRules)) {
            let matchCount = 0;
            let totalPatterns = config.patterns.length;

            for (const pattern of config.patterns) {
                // 重置正则表达式
                pattern.lastIndex = 0;
                if (pattern.test(trimmed)) {
                    matchCount++;
                }
            }

            const score = (matchCount / totalPatterns) * config.priority;

            if (matchCount >= config.minMatches && score > bestScore) {
                bestScore = score;
                bestMatch = {
                    type,
                    priority: config.priority,
                    confidence: matchCount / totalPatterns,
                    config
                };
            }
        }

        return bestMatch || { type: 'plain-text', priority: 1, confidence: 1 };
    }

    // 存储内容
    store(text, source = 'unknown', metadata = {}) {
        const detection = this.detectType(text);
        
        // 保存当前到历史
        if (this.current) {
            this.addToHistory(this.current);
        }

        // 提取额外数据
        let extractedData = null;
        if (detection.config && detection.config.extractMatches) {
            try {
                extractedData = detection.config.extractMatches(text);
            } catch (e) {
                console.warn('SmartClipboard: Failed to extract matches', e);
            }
        }

        this.current = {
            id: Date.now().toString(),
            text: text.trim(),
            type: detection.type,
            typeName: detection.config ? detection.config.name : '普通文本',
            typeIcon: detection.config ? detection.config.icon : '📝',
            priority: detection.priority,
            confidence: detection.confidence,
            source,
            timestamp: Date.now(),
            metadata,
            extractedData
        };

        this.saveToStorage();
        this.updatePanel();
        this.updateAllPasteButtons();
        
        // 显示通知
        this.showNotification(`已复制: ${this.current.typeName}`, 'success');

        return this.current;
    }

    // 添加到历史
    addToHistory(item) {
        // 避免重复
        const exists = this.history.find(h => h.text === item.text);
        if (exists) {
            exists.timestamp = item.timestamp;
            // 移到最前面
            this.history = this.history.filter(h => h.id !== item.id);
        }
        
        this.history.unshift(item);
        
        // 限制历史数量
        if (this.history.length > this.maxHistory) {
            this.history = this.history.slice(0, this.maxHistory);
        }
    }

    // 获取可用的粘贴目标
    getValidTargets(contentType) {
        if (!TargetMappings || !TargetMappings[contentType]) {
            return [];
        }

        return TargetMappings[contentType].filter(t => {
            const el = document.querySelector(t.target);
            return el && this.isElementVisible(el);
        });
    }

    // 检查元素是否可见
    isElementVisible(el) {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && 
               window.getComputedStyle(el).display !== 'none' &&
               window.getComputedStyle(el).visibility !== 'hidden';
    }

    // 粘贴到目标
    pasteTo(targetSelector, content, action = 'replace') {
        const el = document.querySelector(targetSelector);
        if (!el) {
            this.showNotification('目标位置不存在', 'error');
            return false;
        }

        // 如果目标在隐藏的标签页中，先切换
        const tabContent = el.closest('.tab-content');
        if (tabContent && tabContent.classList.contains('hidden')) {
            const tabId = tabContent.id;
            const tabBtn = document.querySelector(`[data-tab="${tabId}"]`);
            if (tabBtn) {
                tabBtn.click();
            }
        }

        // 滚动到元素
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // 根据 action 执行粘贴
        setTimeout(() => {
            switch (action) {
                case 'replace':
                    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                        el.value = content;
                    } else {
                        el.textContent = content;
                    }
                    break;
                
                case 'append':
                    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                        el.value = el.value + '\n' + content;
                    } else {
                        el.textContent = el.textContent + '\n' + content;
                    }
                    break;
                
                case 'focus-paste':
                    el.focus();
                    if (document.execCommand) {
                        document.execCommand('insertText', false, content);
                    } else {
                        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                            const start = el.selectionStart;
                            el.value = el.value.slice(0, start) + content + el.value.slice(el.selectionEnd);
                            el.selectionStart = el.selectionEnd = start + content.length;
                        }
                    }
                    break;
                
                case 'file-simulate':
                    // 对于文件输入，创建一个模拟的文件对象
                    this.simulateFileInput(el, content);
                    break;
                
                case 'info':
                    // 仅显示信息，不实际粘贴
                    this.showNotification(`检测到 ${content.length} 个专利号，请在功能四中使用`, 'info');
                    return true;
            }

            // 触发事件
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            
            // 高亮效果
            this.highlightElement(el);
            
            this.showNotification('粘贴成功', 'success');
        }, 300);

        return true;
    }

    // 模拟文件输入
    simulateFileInput(input, content) {
        // 创建一个 Blob 对象
        const blob = new Blob([content], { type: 'text/plain' });
        const file = new File([blob], 'clipboard-data.txt', { type: 'text/plain' });
        
        // 创建 DataTransfer 对象
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        
        // 设置 files 属性
        input.files = dataTransfer.files;
        
        // 触发 change 事件
        input.dispatchEvent(new Event('change', { bubbles: true }));
        
        this.showNotification('已将内容转换为文件上传', 'success');
    }

    // 高亮元素
    highlightElement(el) {
        const originalTransition = el.style.transition;
        const originalBoxShadow = el.style.boxShadow;
        
        el.style.transition = 'box-shadow 0.3s ease';
        el.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.5)';
        
        setTimeout(() => {
            el.style.boxShadow = originalBoxShadow;
            el.style.transition = originalTransition;
        }, 1500);
    }

    // 创建面板
    createPanel() {
        // 检查是否已存在
        if (document.getElementById('smart-clipboard-panel')) {
            return;
        }

        const panel = document.createElement('div');
        panel.id = 'smart-clipboard-panel';
        panel.className = 'smart-clipboard-panel';
        panel.innerHTML = `
            <div class="sc-header">
                <span class="sc-title">📋 智能剪贴板</span>
                <div class="sc-controls">
                    <button class="sc-btn sc-minimize" title="最小化">−</button>
                    <button class="sc-btn sc-close" title="关闭">×</button>
                </div>
            </div>
            <div class="sc-body">
                <div class="sc-current">
                    <div class="sc-empty">暂无数据，复制内容以开始使用</div>
                </div>
                <div class="sc-targets"></div>
                <div class="sc-history">
                    <div class="sc-history-header">
                        <span>历史记录</span>
                        <button class="sc-clear-history">清空</button>
                    </div>
                    <div class="sc-history-list"></div>
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        // 绑定面板事件
        panel.querySelector('.sc-minimize').addEventListener('click', () => this.toggleMinimize());
        panel.querySelector('.sc-close').addEventListener('click', () => this.hidePanel());
        panel.querySelector('.sc-clear-history').addEventListener('click', () => this.clearHistory());

        // 使面板可拖动
        this.makeDraggable(panel);

        this.panel = panel;
        this.updatePanel();
    }

    // 更新面板内容
    updatePanel() {
        if (!this.panel) return;

        const currentDiv = this.panel.querySelector('.sc-current');
        const targetsDiv = this.panel.querySelector('.sc-targets');
        const historyList = this.panel.querySelector('.sc-history-list');

        // 更新当前内容
        if (this.current) {
            const preview = this.current.text.slice(0, 200) + (this.current.text.length > 200 ? '...' : '');
            currentDiv.innerHTML = `
                <div class="sc-content-type">
                    <span class="sc-icon">${this.current.typeIcon}</span>
                    <span class="sc-type-name">${this.current.typeName}</span>
                    <span class="sc-confidence">置信度: ${Math.round(this.current.confidence * 100)}%</span>
                </div>
                <div class="sc-preview">${this.escapeHtml(preview)}</div>
                <div class="sc-meta">
                    <span>来源: ${this.current.source}</span>
                    <span>${this.formatTime(this.current.timestamp)}</span>
                </div>
            `;

            // 更新目标列表
            const targets = this.getValidTargets(this.current.type);
            if (targets.length > 0) {
                targetsDiv.innerHTML = `
                    <div class="sc-targets-title">推荐目标:</div>
                    <div class="sc-targets-list">
                        ${targets.map(t => `
                            <button class="sc-target-btn" data-target="${t.target}" data-action="${t.action}">
                                <span class="sc-target-label">${t.label}</span>
                                <span class="sc-target-desc">${t.description}</span>
                            </button>
                        `).join('')}
                    </div>
                `;

                // 绑定目标按钮事件
                targetsDiv.querySelectorAll('.sc-target-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        this.pasteTo(btn.dataset.target, this.current.text, btn.dataset.action);
                    });
                });
            } else {
                targetsDiv.innerHTML = '<div class="sc-no-targets">当前页面无可用目标位置</div>';
            }
        } else {
            currentDiv.innerHTML = '<div class="sc-empty">暂无数据，复制内容以开始使用</div>';
            targetsDiv.innerHTML = '';
        }

        // 更新历史列表
        if (this.history.length > 0) {
            historyList.innerHTML = this.history.map(h => `
                <div class="sc-history-item" data-id="${h.id}">
                    <span class="sc-history-icon">${h.typeIcon}</span>
                    <span class="sc-history-text">${this.escapeHtml(h.text.slice(0, 50))}...</span>
                    <span class="sc-history-time">${this.formatTime(h.timestamp)}</span>
                </div>
            `).join('');

            // 绑定历史项点击事件
            historyList.querySelectorAll('.sc-history-item').forEach(item => {
                item.addEventListener('click', () => {
                    const historyItem = this.history.find(h => h.id === item.dataset.id);
                    if (historyItem) {
                        this.current = historyItem;
                        this.saveToStorage();
                        this.updatePanel();
                        this.updateAllPasteButtons();
                    }
                });
            });
        } else {
            historyList.innerHTML = '<div class="sc-empty-history">无历史记录</div>';
        }
    }

    // 显示面板
    showPanel() {
        if (!this.panel) this.createPanel();
        this.panelVisible = true;
        this.panel.classList.remove('sc-hidden', 'sc-minimized');
    }

    // 隐藏面板
    hidePanel() {
        this.panelVisible = false;
        if (this.panel) {
            this.panel.classList.add('sc-hidden');
        }
    }

    // 切换最小化
    toggleMinimize() {
        this.panelMinimized = !this.panelMinimized;
        if (this.panel) {
            this.panel.classList.toggle('sc-minimized', this.panelMinimized);
        }
    }

    // 清空历史
    clearHistory() {
        this.history = [];
        this.saveToStorage();
        this.updatePanel();
        this.showNotification('历史记录已清空', 'info');
    }

    // 注入全局样式
    injectGlobalStyles() {
        if (document.getElementById('smart-clipboard-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'smart-clipboard-styles';
        styles.textContent = `
            /* 智能剪贴板面板 */
            .smart-clipboard-panel {
                position: fixed;
                top: 80px;
                right: 20px;
                width: 360px;
                max-height: 80vh;
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.15);
                z-index: 9999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 13px;
                overflow: hidden;
                transition: transform 0.3s ease, opacity 0.3s ease;
            }

            .smart-clipboard-panel.sc-hidden {
                transform: translateX(120%);
                opacity: 0;
                pointer-events: none;
            }

            .smart-clipboard-panel.sc-minimized .sc-body {
                display: none;
            }

            .sc-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                cursor: move;
            }

            .sc-title {
                font-weight: 600;
                font-size: 14px;
            }

            .sc-controls {
                display: flex;
                gap: 4px;
            }

            .sc-btn {
                width: 24px;
                height: 24px;
                border: none;
                background: rgba(255,255,255,0.2);
                color: white;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
                line-height: 1;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .sc-btn:hover {
                background: rgba(255,255,255,0.3);
            }

            .sc-body {
                max-height: calc(80vh - 50px);
                overflow-y: auto;
            }

            .sc-current {
                padding: 16px;
                border-bottom: 1px solid #e5e7eb;
            }

            .sc-empty {
                color: #9ca3af;
                text-align: center;
                padding: 20px;
            }

            .sc-content-type {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
            }

            .sc-icon {
                font-size: 18px;
            }

            .sc-type-name {
                font-weight: 600;
                color: #374151;
            }

            .sc-confidence {
                margin-left: auto;
                font-size: 11px;
                color: #6b7280;
                background: #f3f4f6;
                padding: 2px 6px;
                border-radius: 10px;
            }

            .sc-preview {
                background: #f9fafb;
                padding: 10px;
                border-radius: 6px;
                font-family: monospace;
                font-size: 12px;
                color: #4b5563;
                max-height: 100px;
                overflow-y: auto;
                white-space: pre-wrap;
                word-break: break-all;
            }

            .sc-meta {
                display: flex;
                justify-content: space-between;
                margin-top: 8px;
                font-size: 11px;
                color: #9ca3af;
            }

            .sc-targets {
                padding: 16px;
                border-bottom: 1px solid #e5e7eb;
            }

            .sc-targets-title {
                font-weight: 600;
                color: #374151;
                margin-bottom: 8px;
            }

            .sc-targets-list {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .sc-target-btn {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                padding: 10px 12px;
                background: #f3f4f6;
                border: 1px solid #e5e7eb;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s;
                text-align: left;
                width: 100%;
            }

            .sc-target-btn:hover {
                background: #e5e7eb;
                border-color: #d1d5db;
            }

            .sc-target-label {
                font-weight: 500;
                color: #374151;
            }

            .sc-target-desc {
                font-size: 11px;
                color: #6b7280;
            }

            .sc-no-targets {
                color: #9ca3af;
                text-align: center;
                padding: 12px;
            }

            .sc-history {
                padding: 16px;
            }

            .sc-history-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }

            .sc-history-header span {
                font-weight: 600;
                color: #374151;
            }

            .sc-clear-history {
                font-size: 11px;
                color: #ef4444;
                background: none;
                border: none;
                cursor: pointer;
            }

            .sc-clear-history:hover {
                text-decoration: underline;
            }

            .sc-history-list {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .sc-history-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px;
                background: #f9fafb;
                border-radius: 6px;
                cursor: pointer;
                transition: background 0.2s;
            }

            .sc-history-item:hover {
                background: #f3f4f6;
            }

            .sc-history-icon {
                font-size: 14px;
            }

            .sc-history-text {
                flex: 1;
                color: #4b5563;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .sc-history-time {
                font-size: 11px;
                color: #9ca3af;
            }

            .sc-empty-history {
                color: #9ca3af;
                text-align: center;
                padding: 12px;
                font-size: 12px;
            }

            /* 智能粘贴按钮 */
            .smart-paste-btn {
                position: relative;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
                background: #f3f4f6;
                border: 1px solid #e5e7eb;
                border-radius: 6px;
                cursor: pointer;
                font-size: 16px;
                transition: all 0.2s;
            }

            .smart-paste-btn:hover {
                background: #e5e7eb;
            }

            .smart-paste-btn.has-data {
                background: #dbeafe;
                border-color: #3b82f6;
            }

            .paste-badge {
                position: absolute;
                top: -4px;
                right: -4px;
                width: 16px;
                height: 16px;
                background: #3b82f6;
                color: white;
                font-size: 10px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .smart-paste-menu {
                position: absolute;
                top: 100%;
                right: 0;
                margin-top: 4px;
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.15);
                min-width: 200px;
                z-index: 10000;
                display: none;
            }

            .smart-paste-menu.show {
                display: block;
            }

            .paste-item {
                padding: 10px 12px;
                cursor: pointer;
                border-bottom: 1px solid #f3f4f6;
            }

            .paste-item:last-child {
                border-bottom: none;
            }

            .paste-item:hover {
                background: #f9fafb;
            }

            /* 通知 */
            .sc-notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 12px 20px;
                background: #374151;
                color: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                animation: sc-slideIn 0.3s ease;
            }

            .sc-notification.success {
                background: #10b981;
            }

            .sc-notification.error {
                background: #ef4444;
            }

            .sc-notification.info {
                background: #3b82f6;
            }

            @keyframes sc-slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            /* 输入框包装器 */
            .sc-input-wrapper {
                position: relative;
                display: flex;
                align-items: flex-start;
                gap: 8px;
            }

            .sc-input-wrapper textarea,
            .sc-input-wrapper input {
                flex: 1;
            }
        `;

        document.head.appendChild(styles);
    }

    // 绑定全局事件
    bindEvents() {
        // 监听复制事件
        document.addEventListener('copy', (e) => {
            const selection = window.getSelection().toString();
            if (selection) {
                this.store(selection, 'user-selection');
            }
        });

        // 监听自定义导出事件
        document.addEventListener('smart-clipboard-export', (e) => {
            if (e.detail && e.detail.text) {
                this.store(e.detail.text, e.detail.source || 'export', e.detail.metadata);
            }
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Shift + V 打开面板
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V') {
                e.preventDefault();
                this.showPanel();
            }
        });
    }

    // 使面板可拖动
    makeDraggable(panel) {
        const header = panel.querySelector('.sc-header');
        let isDragging = false;
        let startX, startY, startLeft, startTop;

        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = panel.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            panel.style.transition = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            panel.style.left = `${startLeft + dx}px`;
            panel.style.top = `${startTop + dy}px`;
            panel.style.right = 'auto';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                panel.style.transition = '';
            }
        });
    }

    // 注入智能粘贴按钮
    injectPasteButtons() {
        // 为目标输入框添加粘贴按钮
        const targetSelectors = [
            '#patent_numbers_input',
            '#claims_text_input',
            '#chat_input',
            '#async_manual_input',
            '#lpl_family_col_name'
        ];

        targetSelectors.forEach(selector => {
            const el = document.querySelector(selector);
            if (el && !el.parentElement.classList.contains('sc-input-wrapper')) {
                this.wrapInputWithPasteButton(el);
            }
        });
    }

    // 包装输入框并添加粘贴按钮
    wrapInputWithPasteButton(input) {
        const wrapper = document.createElement('div');
        wrapper.className = 'sc-input-wrapper';
        
        const parent = input.parentElement;
        parent.insertBefore(wrapper, input);
        wrapper.appendChild(input);

        const btn = document.createElement('button');
        btn.className = 'smart-paste-btn';
        btn.innerHTML = '📋';
        btn.title = '智能粘贴';
        
        wrapper.appendChild(btn);

        // 存储引用
        this.pasteButtons.set(input.id || input.name, { input, btn, wrapper });

        // 绑定点击事件
        btn.addEventListener('click', () => this.showPasteMenu(btn, input));

        // 更新按钮状态
        this.updatePasteButton(btn);
    }

    // 显示粘贴菜单
    showPasteMenu(btn, input) {
        // 移除已有的菜单
        const existing = btn.parentElement.querySelector('.smart-paste-menu');
        if (existing) {
            existing.remove();
            return;
        }

        const menu = document.createElement('div');
        menu.className = 'smart-paste-menu';

        if (this.current) {
            // 当前内容
            const currentItem = document.createElement('div');
            currentItem.className = 'paste-item';
            currentItem.innerHTML = `
                <strong>当前: ${this.current.typeName}</strong><br>
                <small>${this.current.text.slice(0, 50)}...</small>
            `;
            currentItem.addEventListener('click', () => {
                this.pasteToTarget(input, this.current.text);
                menu.remove();
            });
            menu.appendChild(currentItem);

            // 历史记录
            this.history.slice(0, 5).forEach(item => {
                const historyItem = document.createElement('div');
                historyItem.className = 'paste-item';
                historyItem.innerHTML = `
                    <span>${item.typeIcon} ${item.typeName}</span><br>
                    <small>${item.text.slice(0, 40)}...</small>
                `;
                historyItem.addEventListener('click', () => {
                    this.pasteToTarget(input, item.text);
                    menu.remove();
                });
                menu.appendChild(historyItem);
            });
        } else {
            menu.innerHTML = '<div class="paste-item"><em>暂无数据</em></div>';
        }

        btn.parentElement.appendChild(menu);
        menu.classList.add('show');

        // 点击外部关闭
        setTimeout(() => {
            const closeMenu = (e) => {
                if (!menu.contains(e.target) && e.target !== btn) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            };
            document.addEventListener('click', closeMenu);
        }, 0);
    }

    // 粘贴到目标
    pasteToTarget(input, content) {
        if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
            input.value = content;
        } else {
            input.textContent = content;
        }
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        this.highlightElement(input);
    }

    // 更新所有粘贴按钮
    updateAllPasteButtons() {
        this.pasteButtons.forEach(({ btn }) => {
            this.updatePasteButton(btn);
        });
    }

    // 更新单个粘贴按钮
    updatePasteButton(btn) {
        if (this.current) {
            btn.classList.add('has-data');
            let badge = btn.querySelector('.paste-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'paste-badge';
                btn.appendChild(badge);
            }
            badge.textContent = this.history.length + 1;
        } else {
            btn.classList.remove('has-data');
            const badge = btn.querySelector('.paste-badge');
            if (badge) badge.remove();
        }
    }

    // 开始自动注入
    startAutoInject() {
        // 定期检查新出现的输入框
        setInterval(() => {
            this.injectPasteButtons();
        }, 2000);
    }

    // 显示通知
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `sc-notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'sc-slideIn 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // 工具函数: HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 工具函数: 格式化时间
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
        return `${date.getMonth() + 1}/${date.getDate()}`;
    }

    // 导出内容 (供其他模块调用)
    export(text, source, metadata = {}) {
        return this.store(text, source, metadata);
    }

    // 获取当前内容
    getCurrent() {
        return this.current;
    }

    // 获取历史
    getHistory() {
        return this.history;
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    window.smartClipboard = new SmartClipboard();
    window.smartClipboard.init();
});

// 如果 DOM 已加载，立即初始化
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    window.smartClipboard = new SmartClipboard();
    window.smartClipboard.init();
}
