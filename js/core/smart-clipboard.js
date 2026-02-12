/**
 * 通用智能剪贴板系统 (Smart Clipboard) - 悬浮球版本
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
        
        // 绿色主题配色
        this.theme = {
            primary: '#10b981',      // 主绿色
            primaryDark: '#059669',  // 深绿色
            primaryLight: '#34d399', // 浅绿色
            bg: '#ecfdf5',           // 背景绿
            text: '#065f46',         // 文字绿
            border: '#6ee7b7'        // 边框绿
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
        console.log('📋 SmartClipboard initialized (floating ball mode)');
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

    getValidTargets(contentType) {
        if (!TargetMappings || !TargetMappings[contentType]) {
            return [];
        }

        return TargetMappings[contentType].filter(t => {
            const el = document.querySelector(t.target);
            return el && this.isElementVisible(el);
        });
    }

    isElementVisible(el) {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && 
               window.getComputedStyle(el).display !== 'none' &&
               window.getComputedStyle(el).visibility !== 'hidden';
    }

    pasteTo(targetSelector, content, action = 'replace') {
        const el = document.querySelector(targetSelector);
        if (!el) {
            this.showNotification('目标位置不存在', 'error');
            return false;
        }

        const tabContent = el.closest('.tab-content');
        if (tabContent && tabContent.classList.contains('hidden')) {
            const tabId = tabContent.id;
            const tabBtn = document.querySelector(`[data-tab="${tabId}"]`);
            if (tabBtn) {
                tabBtn.click();
            }
        }

        el.scrollIntoView({ behavior: 'smooth', block: 'center' });

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
            }

            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            
            this.highlightElement(el);
            this.showNotification('粘贴成功', 'success');
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

        // 点击展开面板
        ball.addEventListener('click', () => {
            this.togglePanel();
        });

        // 使悬浮球可拖动
        this.makeDraggable(ball);
        
        this.updateFloatingBall();
    }

    // 更新悬浮球状态
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
                    <div class="sc-empty">暂无数据</div>
                </div>
                <div class="sc-targets"></div>
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

        // 绑定事件
        panel.querySelector('.sc-panel-close').addEventListener('click', () => {
            this.hidePanel();
        });

        panel.querySelector('.sc-clear-btn').addEventListener('click', () => {
            this.clearHistory();
        });

        this.updatePanel();
    }

    // 更新面板内容
    updatePanel() {
        if (!this.panel) return;

        const currentDiv = this.panel.querySelector('.sc-current');
        const targetsDiv = this.panel.querySelector('.sc-targets');
        const historyList = this.panel.querySelector('.sc-history-list');

        if (this.current) {
            const preview = this.current.text.slice(0, 150) + (this.current.text.length > 150 ? '...' : '');
            currentDiv.innerHTML = `
                <div class="sc-content-type">
                    <span class="sc-type-icon">${this.current.typeIcon}</span>
                    <span class="sc-type-name">${this.current.typeName}</span>
                    <span class="sc-confidence">${Math.round(this.current.confidence * 100)}%</span>
                </div>
                <div class="sc-preview">${this.escapeHtml(preview)}</div>
                <div class="sc-meta">
                    <span>${this.current.source}</span>
                    <span>${this.formatTime(this.current.timestamp)}</span>
                </div>
            `;

            const targets = this.getValidTargets(this.current.type);
            if (targets.length > 0) {
                targetsDiv.innerHTML = `
                    <div class="sc-section-title">推荐目标</div>
                    <div class="sc-targets-list">
                        ${targets.map(t => `
                            <button class="sc-target-btn" data-target="${t.target}" data-action="${t.action}">
                                <span class="sc-target-label">${t.label}</span>
                                <span class="sc-target-desc">${t.description}</span>
                            </button>
                        `).join('')}
                    </div>
                `;

                targetsDiv.querySelectorAll('.sc-target-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        this.pasteTo(btn.dataset.target, this.current.text, btn.dataset.action);
                    });
                });
            } else {
                targetsDiv.innerHTML = '<div class="sc-no-targets">当前页面无可用目标</div>';
            }
        } else {
            currentDiv.innerHTML = '<div class="sc-empty">暂无数据，复制内容以开始使用</div>';
            targetsDiv.innerHTML = '';
        }

        if (this.history.length > 0) {
            historyList.innerHTML = this.history.map(h => `
                <div class="sc-history-item" data-id="${h.id}">
                    <span class="sc-history-icon">${h.typeIcon}</span>
                    <span class="sc-history-text">${this.escapeHtml(h.text.slice(0, 40))}...</span>
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
        
        // 定位面板在悬浮球旁边
        if (this.floatingBall) {
            const ballRect = this.floatingBall.getBoundingClientRect();
            this.panel.style.top = `${ballRect.top}px`;
            this.panel.style.left = `${ballRect.left - 320}px`;
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

    // 显示复制成功提示
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

        // 动画进入
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        // 3秒后自动消失
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // 显示普通通知
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
        }, 3000);
    }

    // 注入全局样式 - 绿色主题
    injectGlobalStyles() {
        if (document.getElementById('smart-clipboard-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'smart-clipboard-styles';
        styles.textContent = `
            /* 悬浮球 */
            .sc-floating-ball {
                position: fixed;
                bottom: 30px;
                right: 30px;
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

            /* 面板 */
            .sc-panel {
                position: fixed;
                width: 320px;
                max-height: 500px;
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
                max-height: 440px;
                overflow-y: auto;
                padding: 12px;
            }

            .sc-current {
                background: #ecfdf5;
                border: 1px solid #6ee7b7;
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 12px;
            }

            .sc-empty {
                color: #9ca3af;
                text-align: center;
                padding: 20px;
            }

            .sc-content-type {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-bottom: 8px;
            }

            .sc-type-icon {
                font-size: 16px;
            }

            .sc-type-name {
                font-weight: 600;
                color: #065f46;
                flex: 1;
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
                max-height: 80px;
                overflow-y: auto;
                white-space: pre-wrap;
                word-break: break-all;
                border: 1px solid #d1fae5;
            }

            .sc-meta {
                display: flex;
                justify-content: space-between;
                margin-top: 8px;
                font-size: 11px;
                color: #6b7280;
            }

            .sc-section-title {
                font-weight: 600;
                color: #065f46;
                margin-bottom: 8px;
                font-size: 12px;
            }

            .sc-targets {
                margin-bottom: 12px;
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
                background: #f0fdf4;
                border: 1px solid #bbf7d0;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s;
                text-align: left;
                width: 100%;
            }

            .sc-target-btn:hover {
                background: #dcfce7;
                border-color: #86efac;
            }

            .sc-target-label {
                font-weight: 500;
                color: #065f46;
                font-size: 12px;
            }

            .sc-target-desc {
                font-size: 11px;
                color: #10b981;
            }

            .sc-no-targets {
                color: #9ca3af;
                text-align: center;
                padding: 12px;
                font-size: 12px;
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

            /* 复制提示 */
            .sc-copy-notification {
                position: fixed;
                bottom: 100px;
                right: 30px;
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 16px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                z-index: 10000;
                opacity: 0;
                transform: translateY(20px);
                transition: all 0.3s ease;
                border-left: 4px solid #10b981;
            }

            .sc-copy-notification.show {
                opacity: 1;
                transform: translateY(0);
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

            /* 普通通知 */
            .sc-notification {
                position: fixed;
                bottom: 100px;
                right: 30px;
                padding: 12px 20px;
                background: #374151;
                color: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                opacity: 0;
                transform: translateY(20px);
                transition: all 0.3s ease;
            }

            .sc-notification.show {
                opacity: 1;
                transform: translateY(0);
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

    // 绑定全局事件
    bindEvents() {
        // 拦截复制事件
        document.addEventListener('copy', (e) => {
            const selection = window.getSelection().toString();
            if (selection && selection.trim()) {
                // 延迟执行，让系统复制先完成
                setTimeout(() => {
                    this.store(selection, '用户复制');
                }, 100);
            }
        });

        // 拦截剪切事件
        document.addEventListener('cut', (e) => {
            const selection = window.getSelection().toString();
            if (selection && selection.trim()) {
                setTimeout(() => {
                    this.store(selection, '用户剪切');
                }, 100);
            }
        });

        // 监听自定义导出事件
        document.addEventListener('smart-clipboard-export', (e) => {
            if (e.detail && e.detail.text) {
                this.store(e.detail.text, e.detail.source || '导出', e.detail.metadata);
            }
        });

        // 点击外部关闭面板
        document.addEventListener('click', (e) => {
            if (this.panelVisible && 
                this.panel && !this.panel.contains(e.target) && 
                this.floatingBall && !this.floatingBall.contains(e.target)) {
                this.hidePanel();
            }
        });
    }

    // 使元素可拖动
    makeDraggable(el) {
        let isDragging = false;
        let startX, startY, startLeft, startTop;

        el.addEventListener('mousedown', (e) => {
            // 忽略点击事件，只响应拖动
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
            el.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                el.style.transition = '';
            }
        });
    }

    // 工具函数
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

    // 公共API
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

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    window.smartClipboard = new SmartClipboard();
    window.smartClipboard.init();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    window.smartClipboard = new SmartClipboard();
    window.smartClipboard.init();
}
