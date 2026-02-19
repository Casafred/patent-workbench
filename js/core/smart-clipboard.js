/**
 * 通用智能剪贴板系统 (Smart Clipboard) - 实用版
 * 实现各功能模块间的无缝数据传递
 * 绿色主题设计
 */

class SmartClipboard {
    constructor() {
        this.history = [];
        this.current = null;
        this.maxHistory = 10;
        this.panelVisible = false;
        this.initialized = false;
        this.floatingBall = null;
        this.panel = null;
        this.lastExportTime = 0; // 记录最后一次 export 的时间戳
        
        // 绿色主题配色
        this.theme = {
            primary: '#10b981',
            primaryDark: '#059669',
            primaryLight: '#34d399',
            bg: '#ecfdf5',
            text: '#065f46',
            border: '#6ee7b7'
        };
        
        // 定义所有可粘贴的输入框
        this.inputTargets = {
            'patent-numbers': [
                { id: 'patent_numbers_input', name: '专利号输入框', module: 'patent-batch', placeholder: '输入专利号...' },
                { id: 'lpl_family_col_name', name: '同族列名输入', module: 'local-patent-lib', placeholder: '列名...' },
                { id: 'async_manual_input', name: '手动输入框', module: 'async-batch', placeholder: '每行一条...' },
                { id: 'chat_input', name: '对话输入框', module: 'instant-chat', placeholder: '输入消息...' }
            ],
            'claims-text': [
                { id: 'claims_text_input', name: '权利要求分析', module: 'claims-processor', placeholder: '粘贴权利要求...' },
                { id: 'chat_input', name: '对话输入框', module: 'instant-chat', placeholder: '输入消息...' }
            ],
            'patent-table': [
                { id: 'lpl_new_file_input', name: '新库文件', module: 'local-patent-lib', type: 'file' },
                { id: 'gen_file-input', name: 'Excel上传', module: 'large-batch', type: 'file' },
                { id: 'claims_excel_file', name: 'Excel分析', module: 'claims-processor', type: 'file' },
                { id: 'async_excel_file', name: 'Excel上传', module: 'async-batch', type: 'file' }
            ],
            'ai-analysis': [
                { id: 'chat_input', name: '对话输入框', module: 'instant-chat', placeholder: '输入消息...' },
                { id: 'claims_text_input', name: '权利要求分析', module: 'claims-processor', placeholder: '粘贴分析...' },
                { id: 'async_system_prompt', name: '系统提示词', module: 'async-batch', placeholder: 'System prompt...' },
                { id: 'api-system-prompt', name: '系统提示词', module: 'large-batch', placeholder: 'System prompt...' }
            ],
            'plain-text': [
                { id: 'chat_input', name: '对话输入框', module: 'instant-chat', placeholder: '输入消息...' },
                { id: 'claims_text_input', name: '权利要求分析', module: 'claims-processor', placeholder: '粘贴文本...' },
                { id: 'async_manual_input', name: '手动输入框', module: 'async-batch', placeholder: '每行一条...' }
            ]
        };
    }

    async init() {
        if (this.initialized) return;
        
        if (typeof ContentTypeRules === 'undefined') {
            console.warn('SmartClipboard: ContentTypeRules not loaded yet');
            return;
        }
        
        this.loadFromStorage();
        this.injectGlobalStyles();
        this.createFloatingBall();
        this.createPanel();
        this.bindEvents();
        
        this.initialized = true;
        console.log('📋 SmartClipboard initialized');
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem('smartClipboard_history');
            if (saved) {
                this.history = JSON.parse(saved);
            }
            const current = localStorage.getItem('smartClipboard_current');
            if (current) {
                this.current = JSON.parse(current);
                this.updateFloatingBall();
            }
        } catch (e) {
            console.warn('SmartClipboard: Failed to load from storage', e);
        }
    }

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

    store(text, source = 'unknown', metadata = {}) {
        console.log('📋 SmartClipboard.store called:', { text: text?.substring(0, 50), source, metadata });
        
        const detection = this.detectType(text);
        
        if (this.current) {
            this.addToHistory(this.current);
        }

        let extractedData = null;
        if (detection.config && detection.config.extractMatches) {
            try {
                extractedData = detection.config.extractMatches(text);
            } catch (e) {
                console.warn('SmartClipboard: Failed to extract matches', e);
            }
        }

        const now = Date.now();
        this.current = {
            id: now.toString(),
            text: text.trim(),
            type: detection.type,
            typeName: detection.config ? detection.config.name : '普通文本',
            typeIcon: detection.config ? detection.config.icon : '📝',
            priority: detection.priority,
            confidence: detection.confidence,
            source,
            timestamp: now,
            metadata,
            extractedData
        };
        
        // 记录 export 时间，防止 copy 事件覆盖
        if (source !== '用户复制' && source !== '用户剪切') {
            this.lastExportTime = now;
        }
        
        console.log('📋 SmartClipboard.current set:', this.current);

        this.saveToStorage();
        this.updateFloatingBall();
        this.updatePanel();
        
        // 显示复制成功提示
        this.showCopyNotification();

        return this.current;
    }

    addToHistory(item) {
        const exists = this.history.find(h => h.text === item.text);
        if (exists) {
            exists.timestamp = item.timestamp;
            this.history = this.history.filter(h => h.id !== item.id);
        }
        
        this.history.unshift(item);
        
        if (this.history.length > this.maxHistory) {
            this.history = this.history.slice(0, this.maxHistory);
        }
    }

    // 获取当前页面可用的输入框
    getAvailableInputs() {
        if (!this.current) return [];
        
        const targets = this.inputTargets[this.current.type] || this.inputTargets['plain-text'];
        const available = [];
        
        targets.forEach(target => {
            const el = document.getElementById(target.id);
            if (el && this.isElementVisible(el)) {
                available.push({
                    ...target,
                    element: el,
                    isFile: target.type === 'file'
                });
            }
        });
        
        // 同时检测页面上所有可见的文本输入框
        const allTextareas = document.querySelectorAll('textarea:not([readonly]):not([disabled])');
        const allInputs = document.querySelectorAll('input[type="text"]:not([readonly]):not([disabled])');
        
        [...allTextareas, ...allInputs].forEach(el => {
            // 排除已经在列表中的
            if (!available.find(a => a.element === el) && this.isElementVisible(el)) {
                const placeholder = el.placeholder || '文本输入框';
                available.push({
                    id: el.id || el.name || 'unnamed',
                    name: placeholder.length > 15 ? placeholder.slice(0, 15) + '...' : placeholder,
                    element: el,
                    isGeneric: true
                });
            }
        });
        
        return available;
    }

    isElementVisible(el) {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && 
               window.getComputedStyle(el).display !== 'none' &&
               window.getComputedStyle(el).visibility !== 'hidden';
    }

    pasteTo(element, content) {
        if (!element) {
            this.showNotification('目标不存在', 'error');
            return false;
        }

        // 滚动到元素
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        setTimeout(() => {
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                // 如果有选中文本，替换选中文本
                if (element.selectionStart !== element.selectionEnd) {
                    const start = element.selectionStart;
                    const end = element.selectionEnd;
                    element.value = element.value.slice(0, start) + content + element.value.slice(end);
                    element.selectionStart = element.selectionEnd = start + content.length;
                } else {
                    // 在光标位置插入
                    const start = element.selectionStart;
                    element.value = element.value.slice(0, start) + content + element.value.slice(start);
                    element.selectionStart = element.selectionEnd = start + content.length;
                }
            } else {
                element.textContent = content;
            }

            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            
            this.highlightElement(element);
            this.showNotification('✓ 粘贴成功', 'success');
            this.hidePanel();
        }, 300);

        return true;
    }

    highlightElement(el) {
        const originalTransition = el.style.transition;
        const originalBoxShadow = el.style.boxShadow;
        
        el.style.transition = 'box-shadow 0.3s ease';
        el.style.boxShadow = `0 0 0 3px ${this.theme.primary}80`;
        
        setTimeout(() => {
            el.style.boxShadow = originalBoxShadow;
            el.style.transition = originalTransition;
        }, 1500);
    }

    // 创建悬浮球
    createFloatingBall() {
        if (document.getElementById('sc-floating-ball')) return;

        const ball = document.createElement('div');
        ball.id = 'sc-floating-ball';
        ball.className = 'sc-floating-ball';
        ball.innerHTML = `
            <div class="sc-ball-icon">📋</div>
            <div class="sc-ball-badge" style="display: none;">0</div>
        `;

        document.body.appendChild(ball);
        this.floatingBall = ball;

        ball.addEventListener('click', () => {
            this.togglePanel();
        });

        this.makeDraggable(ball);
        this.updateFloatingBall();
    }

    updateFloatingBall() {
        if (!this.floatingBall) return;

        const badge = this.floatingBall.querySelector('.sc-ball-badge');
        
        if (this.current) {
            this.floatingBall.classList.add('has-data');
            if (badge) {
                badge.style.display = 'flex';
                badge.textContent = this.history.length + 1;
            }
        } else {
            this.floatingBall.classList.remove('has-data');
            if (badge) {
                badge.style.display = 'none';
            }
        }
    }

    // 创建面板
    createPanel() {
        if (document.getElementById('sc-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'sc-panel';
        panel.className = 'sc-panel';
        panel.innerHTML = `
            <div class="sc-panel-header">
                <span class="sc-panel-title">📋 智能剪贴板</span>
                <button class="sc-panel-close" title="关闭">×</button>
            </div>
            <div class="sc-panel-body">
                <div class="sc-current">
                    <div class="sc-empty">暂无数据，复制内容开始使用</div>
                </div>
                <div class="sc-available-inputs">
                    <div class="sc-section-title">可粘贴到当前页面:</div>
                    <div class="sc-inputs-list"></div>
                </div>
                <div class="sc-history-section">
                    <div class="sc-history-header">
                        <span>历史记录</span>
                        <button class="sc-clear-btn">清空</button>
                    </div>
                    <div class="sc-history-list"></div>
                </div>
            </div>
        `;

        document.body.appendChild(panel);
        this.panel = panel;

        panel.querySelector('.sc-panel-close').addEventListener('click', () => {
            this.hidePanel();
        });

        panel.querySelector('.sc-clear-btn').addEventListener('click', () => {
            this.clearHistory();
        });

        this.updatePanel();
    }

    updatePanel() {
        if (!this.panel) return;

        const currentDiv = this.panel.querySelector('.sc-current');
        const inputsList = this.panel.querySelector('.sc-inputs-list');
        const historyList = this.panel.querySelector('.sc-history-list');

        if (this.current) {
            const preview = this.current.text.slice(0, 100) + (this.current.text.length > 100 ? '...' : '');
            currentDiv.innerHTML = `
                <div class="sc-content-type">
                    <span class="sc-type-icon">${this.current.typeIcon}</span>
                    <span class="sc-type-name">${this.current.typeName}</span>
                    <span class="sc-confidence">${Math.round(this.current.confidence * 100)}%</span>
                </div>
                <div class="sc-preview">${this.escapeHtml(preview)}</div>
            `;

            // 更新可用输入框列表
            const available = this.getAvailableInputs();
            if (available.length > 0) {
                inputsList.innerHTML = available.map(input => `
                    <button class="sc-input-btn" data-input-id="${input.id}">
                        <span class="sc-input-name">${input.name}</span>
                        ${input.isFile ? '<span class="sc-input-tag">文件</span>' : ''}
                        ${input.isGeneric ? '<span class="sc-input-tag generic">自动检测</span>' : ''}
                    </button>
                `).join('');

                inputsList.querySelectorAll('.sc-input-btn').forEach((btn, index) => {
                    btn.addEventListener('click', () => {
                        this.pasteTo(available[index].element, this.current.text);
                    });
                });
            } else {
                inputsList.innerHTML = `
                    <div class="sc-no-inputs">
                        <div>当前页面没有可粘贴的输入框</div>
                        <div class="sc-hint">切换到其他功能页面后再次打开</div>
                    </div>
                `;
            }
        } else {
            currentDiv.innerHTML = '<div class="sc-empty">暂无数据，复制内容开始使用</div>';
            inputsList.innerHTML = '<div class="sc-no-inputs">请先复制内容</div>';
        }

        if (this.history.length > 0) {
            historyList.innerHTML = this.history.map(h => `
                <div class="sc-history-item" data-id="${h.id}">
                    <span class="sc-history-icon">${h.typeIcon}</span>
                    <span class="sc-history-text">${this.escapeHtml(h.text.slice(0, 30))}...</span>
                    <span class="sc-history-time">${this.formatTime(h.timestamp)}</span>
                </div>
            `).join('');

            historyList.querySelectorAll('.sc-history-item').forEach(item => {
                item.addEventListener('click', () => {
                    const historyItem = this.history.find(h => h.id === item.dataset.id);
                    if (historyItem) {
                        this.current = historyItem;
                        this.saveToStorage();
                        this.updatePanel();
                        this.updateFloatingBall();
                    }
                });
            });
        } else {
            historyList.innerHTML = '<div class="sc-empty-history">无历史记录</div>';
        }
    }

    togglePanel() {
        if (this.panelVisible) {
            this.hidePanel();
        } else {
            this.showPanel();
        }
    }

    showPanel() {
        if (!this.panel) this.createPanel();
        this.panelVisible = true;
        this.panel.classList.add('show');
        this.updatePanel();
        
        if (this.floatingBall) {
            const ballRect = this.floatingBall.getBoundingClientRect();
            const panelHeight = 400;
            let top = ballRect.top;
            
            // 确保面板不超出视口顶部
            if (top + panelHeight > window.innerHeight) {
                top = window.innerHeight - panelHeight - 20;
            }
            if (top < 10) top = 10;
            
            this.panel.style.top = `${top}px`;
            this.panel.style.left = `${ballRect.left - 340}px`;
        }
    }

    hidePanel() {
        this.panelVisible = false;
        if (this.panel) {
            this.panel.classList.remove('show');
        }
    }

    clearHistory() {
        this.history = [];
        this.saveToStorage();
        this.updatePanel();
        this.updateFloatingBall();
        this.showNotification('历史记录已清空', 'info');
    }

    showCopyNotification() {
        const notification = document.createElement('div');
        notification.className = 'sc-copy-notification';
        notification.innerHTML = `
            <div class="sc-copy-icon">✓</div>
            <div class="sc-copy-content">
                <div class="sc-copy-title">已捕获到剪贴板</div>
                <div class="sc-copy-type">${this.current.typeIcon} ${this.current.typeName}</div>
            </div>
        `;
        document.body.appendChild(notification);

        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 2500);
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `sc-notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 2500);
    }

    injectGlobalStyles() {
        if (document.getElementById('smart-clipboard-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'smart-clipboard-styles';
        styles.textContent = `
            .sc-floating-ball {
                position: fixed;
                top: 100px;
                right: 20px;
                width: 56px;
                height: 56px;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                border-radius: 50%;
                box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
                cursor: pointer;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                user-select: none;
            }

            .sc-floating-ball:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
            }

            .sc-floating-ball.has-data {
                animation: sc-pulse 2s infinite;
            }

            @keyframes sc-pulse {
                0%, 100% { box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4); }
                50% { box-shadow: 0 4px 25px rgba(16, 185, 129, 0.7); }
            }

            .sc-ball-icon {
                font-size: 24px;
                filter: grayscale(1) brightness(2);
            }

            .sc-ball-badge {
                position: absolute;
                top: -4px;
                right: -4px;
                width: 20px;
                height: 20px;
                background: #ef4444;
                color: white;
                font-size: 11px;
                font-weight: bold;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid white;
            }

            .sc-panel {
                position: fixed;
                width: 320px;
                max-height: 450px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                z-index: 9998;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 13px;
                overflow: hidden;
                opacity: 0;
                transform: scale(0.9) translateY(10px);
                pointer-events: none;
                transition: all 0.3s ease;
            }

            .sc-panel.show {
                opacity: 1;
                transform: scale(1) translateY(0);
                pointer-events: auto;
            }

            .sc-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
            }

            .sc-panel-title {
                font-weight: 600;
                font-size: 14px;
            }

            .sc-panel-close {
                width: 24px;
                height: 24px;
                border: none;
                background: rgba(255,255,255,0.2);
                color: white;
                border-radius: 4px;
                cursor: pointer;
                font-size: 18px;
                line-height: 1;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .sc-panel-close:hover {
                background: rgba(255,255,255,0.3);
            }

            .sc-panel-body {
                max-height: 400px;
                overflow-y: auto;
                padding: 12px;
            }

            .sc-current {
                background: #ecfdf5;
                border: 1px solid #6ee7b7;
                border-radius: 8px;
                padding: 10px;
                margin-bottom: 12px;
            }

            .sc-empty {
                color: #9ca3af;
                text-align: center;
                padding: 15px;
                font-size: 12px;
            }

            .sc-content-type {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-bottom: 6px;
            }

            .sc-type-icon {
                font-size: 16px;
            }

            .sc-type-name {
                font-weight: 600;
                color: #065f46;
                flex: 1;
                font-size: 13px;
            }

            .sc-confidence {
                font-size: 11px;
                color: #059669;
                background: #d1fae5;
                padding: 2px 6px;
                border-radius: 10px;
            }

            .sc-preview {
                background: white;
                padding: 8px;
                border-radius: 4px;
                font-family: monospace;
                font-size: 11px;
                color: #374151;
                max-height: 60px;
                overflow-y: auto;
                white-space: pre-wrap;
                word-break: break-all;
                border: 1px solid #d1fae5;
            }

            .sc-available-inputs {
                margin-bottom: 12px;
            }

            .sc-section-title {
                font-weight: 600;
                color: #065f46;
                margin-bottom: 8px;
                font-size: 12px;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .sc-section-title::before {
                content: '';
                width: 3px;
                height: 14px;
                background: #10b981;
                border-radius: 2px;
            }

            .sc-inputs-list {
                display: flex;
                flex-direction: column;
                gap: 6px;
                max-height: 150px;
                overflow-y: auto;
            }

            .sc-input-btn {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 12px;
                background: #f0fdf4;
                border: 1px solid #bbf7d0;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s;
                text-align: left;
                width: 100%;
            }

            .sc-input-btn:hover {
                background: #dcfce7;
                border-color: #10b981;
            }

            .sc-input-name {
                font-weight: 500;
                color: #065f46;
                font-size: 12px;
            }

            .sc-input-tag {
                font-size: 10px;
                color: #059669;
                background: #d1fae5;
                padding: 2px 6px;
                border-radius: 4px;
            }

            .sc-input-tag.generic {
                color: #6b7280;
                background: #f3f4f6;
            }

            .sc-no-inputs {
                color: #9ca3af;
                text-align: center;
                padding: 15px;
                font-size: 12px;
            }

            .sc-no-inputs .sc-hint {
                color: #6b7280;
                font-size: 11px;
                margin-top: 5px;
            }

            .sc-history-section {
                border-top: 1px solid #e5e7eb;
                padding-top: 12px;
            }

            .sc-history-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }

            .sc-history-header span {
                font-weight: 600;
                color: #065f46;
                font-size: 12px;
            }

            .sc-clear-btn {
                font-size: 11px;
                color: #ef4444;
                background: none;
                border: none;
                cursor: pointer;
            }

            .sc-clear-btn:hover {
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
                background: #f0fdf4;
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
                font-size: 11px;
            }

            .sc-history-time {
                font-size: 10px;
                color: #9ca3af;
            }

            .sc-empty-history {
                color: #9ca3af;
                text-align: center;
                padding: 12px;
                font-size: 11px;
            }

            .sc-copy-notification {
                position: fixed;
                top: 170px;
                right: 20px;
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 16px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                z-index: 10000;
                opacity: 0;
                transform: translateX(20px);
                transition: all 0.3s ease;
                border-left: 4px solid #10b981;
            }

            .sc-copy-notification.show {
                opacity: 1;
                transform: translateX(0);
            }

            .sc-copy-icon {
                width: 32px;
                height: 32px;
                background: #10b981;
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                font-weight: bold;
            }

            .sc-copy-content {
                display: flex;
                flex-direction: column;
            }

            .sc-copy-title {
                font-weight: 600;
                color: #065f46;
                font-size: 13px;
            }

            .sc-copy-type {
                color: #10b981;
                font-size: 11px;
            }

            .sc-notification {
                position: fixed;
                top: 170px;
                right: 20px;
                padding: 12px 20px;
                background: #374151;
                color: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                opacity: 0;
                transform: translateX(20px);
                transition: all 0.3s ease;
            }

            .sc-notification.show {
                opacity: 1;
                transform: translateX(0);
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
        `;

        document.head.appendChild(styles);
    }

    bindEvents() {
        document.addEventListener('copy', (e) => {
            const selection = window.getSelection().toString();
            if (selection && selection.trim()) {
                const capturedSelection = selection.trim();
                const captureTime = Date.now();
                setTimeout(() => {
                    // 如果 export 在 copy 之后执行了，不覆盖
                    if (this.lastExportTime > captureTime) {
                        console.log('📋 SmartClipboard: skipping copy event, export happened after copy');
                        return;
                    }
                    // 只有当没有更新的内容被存储时，才存储选中内容
                    if (this.current && this.current.timestamp > captureTime) {
                        return;
                    }
                    this.store(capturedSelection, '用户复制');
                }, 100);
            }
        });

        document.addEventListener('cut', (e) => {
            const selection = window.getSelection().toString();
            if (selection && selection.trim()) {
                const capturedSelection = selection.trim();
                const captureTime = Date.now();
                setTimeout(() => {
                    // 如果 export 在 cut 之后执行了，不覆盖
                    if (this.lastExportTime > captureTime) {
                        console.log('📋 SmartClipboard: skipping cut event, export happened after cut');
                        return;
                    }
                    if (this.current && this.current.timestamp > captureTime) {
                        return;
                    }
                    this.store(capturedSelection, '用户剪切');
                }, 100);
            }
        });

        document.addEventListener('smart-clipboard-export', (e) => {
            if (e.detail && e.detail.text) {
                this.store(e.detail.text, e.detail.source || '导出', e.detail.metadata);
            }
        });

        document.addEventListener('click', (e) => {
            if (this.panelVisible && 
                this.panel && !this.panel.contains(e.target) && 
                this.floatingBall && !this.floatingBall.contains(e.target)) {
                this.hidePanel();
            }
        });
    }

    makeDraggable(el) {
        let isDragging = false;
        let startX, startY, startLeft, startTop;

        el.addEventListener('mousedown', (e) => {
            if (e.target.closest('.sc-ball-badge')) return;
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = el.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            el.style.transition = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            el.style.left = `${startLeft + dx}px`;
            el.style.top = `${startTop + dy}px`;
            el.style.right = 'auto';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                el.style.transition = '';
            }
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
        return `${date.getMonth() + 1}/${date.getDate()}`;
    }

    export(text, source, metadata = {}) {
        return this.store(text, source, metadata);
    }

    getCurrent() {
        return this.current;
    }

    getHistory() {
        return this.history;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.smartClipboard = new SmartClipboard();
    window.smartClipboard.init();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    window.smartClipboard = new SmartClipboard();
    window.smartClipboard.init();
}
