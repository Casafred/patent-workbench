/**
 * 用户数据管理UI模块
 * 负责渲染数据管理面板、统计展示、按钮交互
 */

class UserDataUI {
    constructor() {
        this.isInitialized = false;
        this._panelOverlay = null;
        this._stylesInjected = false;
    }

    init() {
        if (this.isInitialized) return;
        
        if (window.IS_GUEST_MODE) {
            console.log('[UserDataUI] 游客模式: UI不初始化');
            return;
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this._setup());
        } else {
            this._setup();
        }

        this.isInitialized = true;
    }

    _setup() {
        this._createDataManageButton();
        this._observeUserActions();
        console.log('[UserDataUI] UI已初始化');
    }

    _injectStyles() {
        if (this._stylesInjected) return;
        this._stylesInjected = true;

        const style = document.createElement('style');
        style.id = 'user-data-ui-styles';
        style.textContent = `
            .udu-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 99998;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .udu-panel {
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                width: 500px;
                max-width: 90vw;
                max-height: 80vh;
                overflow: hidden;
                font-family: 'Noto Sans SC', sans-serif;
            }
            .udu-header {
                background: linear-gradient(135deg, #16A34A 0%, #22C55E 100%);
                color: white;
                padding: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .udu-header h2 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .udu-close {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
                font-size: 18px;
            }
            .udu-close:hover { background: rgba(255, 255, 255, 0.3); }
            .udu-body {
                padding: 20px;
                max-height: 60vh;
                overflow-y: auto;
            }
            .udu-section { margin-bottom: 20px; }
            .udu-section h3 {
                font-size: 14px;
                color: #666;
                margin: 0 0 10px;
                font-weight: 500;
            }
            .udu-stats-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
            }
            .udu-stat-item {
                background: #f5f5f5;
                border-radius: 8px;
                padding: 12px;
                text-align: center;
            }
            .udu-stat-value {
                font-size: 20px;
                font-weight: 600;
                color: #16A34A;
            }
            .udu-stat-label {
                font-size: 12px;
                color: #666;
                margin-top: 4px;
            }
            .udu-category-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 12px;
                background: #f9f9f9;
                border-radius: 8px;
                margin-bottom: 8px;
            }
            .udu-category-name { font-weight: 500; color: #333; }
            .udu-category-info { font-size: 12px; color: #888; }
            .udu-actions {
                border-top: 1px solid #eee;
                padding-top: 20px;
                margin-top: 10px;
            }
            .udu-actions-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 10px;
            }
            .udu-action-btn {
                padding: 12px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 6px;
                transition: all 0.2s;
                color: white;
            }
            .udu-action-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
            .udu-action-btn.export { background: linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%); }
            .udu-action-btn.import { background: linear-gradient(135deg, #10B981 0%, #34D399 100%); }
            .udu-action-btn.clear { background: linear-gradient(135deg, #EF4444 0%, #F87171 100%); }
            .udu-action-btn .icon { width: 20px; height: 20px; }
            .udu-loading { text-align: center; padding: 20px; color: #666; }
            
            /* 暗黑模式样式 */
            [data-theme="dark"] .udu-overlay {
                background: rgba(0, 0, 0, 0.7) !important;
            }
            [data-theme="dark"] .udu-panel {
                background: #1e293b !important;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5) !important;
            }
            [data-theme="dark"] .udu-header {
                background: linear-gradient(135deg, #064e3b 0%, #065f46 100%) !important;
            }
            [data-theme="dark"] .udu-body {
                background: #1e293b !important;
            }
            [data-theme="dark"] .udu-section h3 {
                color: #94a3b8 !important;
            }
            [data-theme="dark"] .udu-stat-item {
                background: #0f172a !important;
            }
            [data-theme="dark"] .udu-stat-value {
                color: #4ade80 !important;
            }
            [data-theme="dark"] .udu-stat-label {
                color: #64748b !important;
            }
            [data-theme="dark"] .udu-category-item {
                background: #0f172a !important;
            }
            [data-theme="dark"] .udu-category-name {
                color: #e2e8f0 !important;
            }
            [data-theme="dark"] .udu-category-info {
                color: #64748b !important;
            }
            [data-theme="dark"] .udu-actions {
                border-top-color: #334155 !important;
            }
            [data-theme="dark"] .udu-loading {
                color: #94a3b8 !important;
            }
            
            .udu-clear-panel {
                width: 450px;
            }
            .udu-clear-notice {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px;
                background: #fef3c7;
                border-radius: 8px;
                margin-bottom: 16px;
                font-size: 13px;
                color: #92400e;
            }
            .udu-clear-actions-top {
                display: flex;
                gap: 8px;
                margin-bottom: 12px;
            }
            .udu-clear-btn-small {
                padding: 6px 12px;
                border: 1px solid #ddd;
                border-radius: 6px;
                background: #f5f5f5;
                cursor: pointer;
                font-size: 12px;
                color: #666;
            }
            .udu-clear-btn-small:hover {
                background: #e5e5e5;
            }
            .udu-clear-list {
                max-height: 280px;
                overflow-y: auto;
                border: 1px solid #eee;
                border-radius: 8px;
                padding: 8px;
            }
            .udu-clear-item {
                display: flex;
                align-items: center;
                padding: 10px 12px;
                border-radius: 6px;
                cursor: pointer;
                transition: background 0.15s;
            }
            .udu-clear-item:hover {
                background: #f0f0f0;
            }
            .udu-clear-checkbox {
                width: 16px;
                height: 16px;
                margin-right: 10px;
                cursor: pointer;
            }
            .udu-clear-checkbox:disabled {
                cursor: not-allowed;
                opacity: 0.4;
            }
            .udu-clear-name {
                flex: 1;
                font-size: 14px;
                color: #333;
            }
            .udu-clear-count {
                font-size: 12px;
                color: #888;
            }
            .udu-clear-footer {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 20px;
                padding-top: 16px;
                border-top: 1px solid #eee;
            }
            .udu-clear-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s;
            }
            .udu-clear-btn-cancel {
                background: #f5f5f5;
                color: #666;
            }
            .udu-clear-btn-cancel:hover {
                background: #e5e5e5;
            }
            .udu-clear-btn-danger {
                background: linear-gradient(135deg, #EF4444 0%, #F87171 100%);
                color: white;
            }
            .udu-clear-btn-danger:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
            }
            .udu-clear-btn-danger-outline {
                background: white;
                color: #EF4444;
                border: 1px solid #EF4444;
            }
            .udu-clear-btn-danger-outline:hover {
                background: #fef2f2;
            }
            
            [data-theme="dark"] .udu-clear-notice {
                background: #422006 !important;
                color: #fcd34d !important;
            }
            [data-theme="dark"] .udu-clear-btn-small {
                background: #334155 !important;
                border-color: #475569 !important;
                color: #94a3b8 !important;
            }
            [data-theme="dark"] .udu-clear-btn-small:hover {
                background: #475569 !important;
            }
            [data-theme="dark"] .udu-clear-list {
                border-color: #334155 !important;
            }
            [data-theme="dark"] .udu-clear-item:hover {
                background: #1e293b !important;
            }
            [data-theme="dark"] .udu-clear-name {
                color: #e2e8f0 !important;
            }
            [data-theme="dark"] .udu-clear-count {
                color: #64748b !important;
            }
            [data-theme="dark"] .udu-clear-footer {
                border-top-color: #334155 !important;
            }
            [data-theme="dark"] .udu-clear-btn-cancel {
                background: #334155 !important;
                color: #94a3b8 !important;
            }
            [data-theme="dark"] .udu-clear-btn-cancel:hover {
                background: #475569 !important;
            }
            [data-theme="dark"] .udu-clear-btn-danger-outline {
                background: transparent !important;
                border-color: #f87171 !important;
                color: #f87171 !important;
            }
            [data-theme="dark"] .udu-clear-btn-danger-outline:hover {
                background: rgba(248, 113, 113, 0.1) !important;
            }
            
            /* 企业微信设置样式 */
            #wecom-notification-section {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
            }
            [data-theme="dark"] #wecom-notification-section {
                border-top-color: #334155;
            }
            .wecom-status-card {
                background: #f9fafb;
                border-radius: 8px;
                padding: 16px;
            }
            [data-theme="dark"] .wecom-status-card {
                background: #1e293b;
            }
            .wecom-status-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 16px;
            }
            .wecom-status-icon {
                width: 40px;
                height: 40px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #07c160;
                color: white;
            }
            .wecom-status-icon svg {
                width: 22px;
                height: 22px;
            }
            .wecom-status-bound .wecom-status-icon {
                background: #07c160;
            }
            .wecom-status-unbound .wecom-status-icon {
                background: #9ca3af;
            }
            .wecom-status-unavailable .wecom-status-icon {
                background: #f59e0b;
            }
            .wecom-status-text {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
            .wecom-status-title {
                font-weight: 600;
                font-size: 14px;
                color: #111827;
            }
            [data-theme="dark"] .wecom-status-title {
                color: #f1f5f9;
            }
            .wecom-status-desc {
                font-size: 12px;
                color: #6b7280;
            }
            [data-theme="dark"] .wecom-status-desc {
                color: #94a3b8;
            }
            .wecom-notification-options {
                background: white;
                border-radius: 6px;
                padding: 12px;
                margin-bottom: 12px;
            }
            [data-theme="dark"] .wecom-notification-options {
                background: #0f172a;
            }
            .wecom-notification-options h4 {
                margin: 0 0 10px 0;
                font-size: 13px;
                font-weight: 500;
                color: #374151;
            }
            [data-theme="dark"] .wecom-notification-options h4 {
                color: #94a3b8;
            }
            .wecom-option-item {
                padding: 8px 0;
            }
            .wecom-option-item label {
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
                font-size: 13px;
                color: #374151;
            }
            [data-theme="dark"] .wecom-option-item label {
                color: #e2e8f0;
            }
            .wecom-option-item input[type="checkbox"] {
                width: 16px;
                height: 16px;
                accent-color: #07c160;
            }
            .wecom-actions-row {
                display: flex;
                gap: 8px;
            }
            .wecom-btn {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 8px 14px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                border: none;
                transition: all 0.2s;
            }
            .wecom-btn svg {
                width: 14px;
                height: 14px;
            }
            .wecom-btn-primary {
                background: #07c160;
                color: white;
            }
            .wecom-btn-primary:hover {
                background: #06ad56;
            }
            .wecom-btn-secondary {
                background: #e5e7eb;
                color: #374151;
            }
            [data-theme="dark"] .wecom-btn-secondary {
                background: #334155;
                color: #e2e8f0;
            }
            .wecom-btn-test {
                background: white;
                border: 1px solid #d1d5db;
                color: #374151;
            }
            [data-theme="dark"] .wecom-btn-test {
                background: #1e293b;
                border-color: #475569;
                color: #e2e8f0;
            }
            .wecom-btn-unbind {
                background: white;
                border: 1px solid #ef4444;
                color: #ef4444;
            }
            [data-theme="dark"] .wecom-btn-unbind {
                background: #1e293b;
            }
            .wecom-bind-methods {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .wecom-bind-method {
                background: white;
                border-radius: 6px;
                padding: 12px;
            }
            [data-theme="dark"] .wecom-bind-method {
                background: #0f172a;
            }
            .wecom-method-header {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-bottom: 8px;
            }
            .wecom-method-icon {
                font-size: 16px;
            }
            .wecom-method-title {
                font-size: 13px;
                font-weight: 500;
                color: #374151;
            }
            [data-theme="dark"] .wecom-method-title {
                color: #e2e8f0;
            }
            .wecom-method-badge {
                font-size: 10px;
                padding: 2px 6px;
                border-radius: 8px;
                background: #dcfce7;
                color: #16a34a;
            }
            .wecom-bind-divider {
                text-align: center;
                color: #9ca3af;
                font-size: 12px;
                position: relative;
            }
            .wecom-bind-divider::before,
            .wecom-bind-divider::after {
                content: '';
                position: absolute;
                top: 50%;
                width: 40%;
                height: 1px;
                background: #e5e7eb;
            }
            [data-theme="dark"] .wecom-bind-divider::before,
            [data-theme="dark"] .wecom-bind-divider::after {
                background: #334155;
            }
            .wecom-bind-divider::before {
                left: 0;
            }
            .wecom-bind-divider::after {
                right: 0;
            }
            .wecom-manual-bind {
                display: flex;
                gap: 8px;
            }
            .wecom-manual-bind input {
                flex: 1;
                padding: 8px 10px;
                border: 1px solid #d1d5db;
                border-radius: 4px;
                font-size: 13px;
                outline: none;
            }
            .wecom-manual-bind input:focus {
                border-color: #07c160;
            }
            [data-theme="dark"] .wecom-manual-bind input {
                background: #1e293b;
                border-color: #475569;
                color: #e2e8f0;
            }
            .wecom-hint {
                display: block;
                margin-top: 6px;
                font-size: 11px;
                color: #9ca3af;
            }
            .wecom-loading {
                display: inline-block;
                width: 14px;
                height: 14px;
                border: 2px solid #e5e7eb;
                border-top-color: #07c160;
                border-radius: 50%;
                animation: wecom-spin 1s linear infinite;
            }
            @keyframes wecom-spin {
                to { transform: rotate(360deg); }
            }
            /* 二维码弹窗样式 */
            .wecom-qrcode-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .wecom-qrcode-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
            }
            .wecom-qrcode-content {
                position: relative;
                background: white;
                border-radius: 12px;
                width: 320px;
                overflow: hidden;
            }
            [data-theme="dark"] .wecom-qrcode-content {
                background: #1e293b;
            }
            .wecom-qrcode-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px;
                border-bottom: 1px solid #e5e7eb;
            }
            [data-theme="dark"] .wecom-qrcode-header {
                border-bottom-color: #334155;
            }
            .wecom-qrcode-header h3 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                color: #111827;
            }
            [data-theme="dark"] .wecom-qrcode-header h3 {
                color: #f1f5f9;
            }
            .wecom-qrcode-close {
                width: 28px;
                height: 28px;
                border: none;
                background: none;
                font-size: 20px;
                cursor: pointer;
                color: #6b7280;
                border-radius: 4px;
            }
            .wecom-qrcode-close:hover {
                background: #f3f4f6;
            }
            [data-theme="dark"] .wecom-qrcode-close:hover {
                background: #334155;
            }
            .wecom-qrcode-body {
                padding: 24px;
                text-align: center;
            }
            .wecom-qrcode-body img {
                width: 200px;
                height: 200px;
                border-radius: 8px;
            }
            .wecom-qrcode-body p {
                margin: 12px 0 0;
                font-size: 13px;
                color: #6b7280;
            }
            [data-theme="dark"] .wecom-qrcode-body p {
                color: #94a3b8;
            }
            .wecom-qrcode-countdown {
                color: #ef4444;
                font-weight: 500;
            }
        `;
        document.head.appendChild(style);
    }

    _createDataManageButton() {
        if (window.IS_GUEST_MODE) {
            console.log('[UserDataUI] 游客模式: 不创建数据管理按钮');
            return;
        }
        
        const userBtns = document.querySelector('.user-btns');
        if (!userBtns) return;

        if (document.getElementById('user-data-manage-btn')) return;

        const dataBtn = document.createElement('a');
        dataBtn.href = 'javascript:void(0);';
        dataBtn.id = 'user-data-manage-btn';
        dataBtn.className = 'user-btn';
        dataBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 2px;">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            数据
        `;
        dataBtn.onclick = () => this.showDataPanel();

        const logoutBtn = userBtns.querySelector('.logout');
        if (logoutBtn) {
            userBtns.insertBefore(dataBtn, logoutBtn);
        } else {
            userBtns.appendChild(dataBtn);
        }
    }

    _observeUserActions() {
        const observer = new MutationObserver(() => {
            this._createDataManageButton();
        });

        const userActions = document.querySelector('.user-actions');
        if (userActions) {
            observer.observe(userActions, { childList: true, subtree: true });
        }
    }

    showDataPanel() {
        this.hideDataPanel();
        this._injectStyles();

        const overlay = document.createElement('div');
        overlay.className = 'udu-overlay';
        overlay.onclick = (e) => {
            if (e.target === overlay) this.hideDataPanel();
        };

        const panel = document.createElement('div');
        panel.className = 'udu-panel';
        panel.innerHTML = this._getPanelHTML();

        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        this._panelOverlay = overlay;

        this._bindPanelEvents();
        this._loadStats();
    }

    _getPanelHTML() {
        return `
            <div class="udu-header">
                <h2>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                        <line x1="12" y1="22.08" x2="12" y2="12"></line>
                    </svg>
                    数据管理
                </h2>
                <button class="udu-close" data-action="close">&times;</button>
            </div>
            <div class="udu-body">
                <div class="udu-section">
                    <h3>存储统计</h3>
                    <div class="udu-stats-grid" id="stats-grid">
                        <div class="udu-loading">加载中...</div>
                    </div>
                </div>
                <div class="udu-section">
                    <h3>分类详情</h3>
                    <div id="category-list">
                        <div class="udu-loading">加载中...</div>
                    </div>
                </div>
                <div class="udu-section" id="wecom-notification-section">
                    <h3>通知设置</h3>
                    <div id="wecom-settings-container">
                        <div class="udu-loading">加载中...</div>
                    </div>
                </div>
                <div class="udu-actions">
                    <div class="udu-actions-grid">
                        <button class="udu-action-btn export" data-action="export">
                            <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="17 8 12 3 7 8"></polyline>
                                <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                            <span>导出数据</span>
                        </button>
                        <button class="udu-action-btn import" data-action="import">
                            <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            <span>导入数据</span>
                        </button>
                        <button class="udu-action-btn clear" data-action="clear">
                            <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                            <span>清除缓存</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    _bindPanelEvents() {
        const overlay = this._panelOverlay;

        overlay.querySelector('[data-action="close"]').onclick = () => this.hideDataPanel();

        overlay.querySelector('[data-action="export"]').onclick = () => {
            this.hideDataPanel();
            window.userDataModal.showExportModal();
        };

        overlay.querySelector('[data-action="import"]').onclick = () => {
            this.hideDataPanel();
            window.userDataModal.showImportModal();
        };

        overlay.querySelector('[data-action="clear"]').onclick = () => this.confirmClear();

        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                this.hideDataPanel();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }

    hideDataPanel() {
        if (this._panelOverlay) {
            this._panelOverlay.remove();
            this._panelOverlay = null;
        }
    }

    async _loadStats() {
        const overlay = this._panelOverlay;
        if (!overlay) return;

        const statsGrid = overlay.querySelector('#stats-grid');
        const categoryList = overlay.querySelector('#category-list');

        if (!window.userCacheManager.isInitialized()) {
            statsGrid.innerHTML = '<div class="udu-stat-item">缓存管理器未初始化</div>';
            return;
        }

        const stats = window.userCacheManager.getStats();
        const categoryStats = window.userCacheManager.getCategoryStats();
        
        let quotaHTML = '';
        if (window.indexedDBStorage) {
            const quotaInfo = await window.indexedDBStorage.getQuotaInfo();
            if (quotaInfo) {
                const percentColor = quotaInfo.ratio > 0.9 ? '#EF4444' : quotaInfo.ratio > 0.7 ? '#F59E0B' : '#16A34A';
                quotaHTML = `
                    <div class="udu-stat-item">
                        <div class="udu-stat-value" style="color: ${percentColor}">${(quotaInfo.ratio * 100).toFixed(1)}%</div>
                        <div class="udu-stat-label">存储使用率</div>
                    </div>
                    <div class="udu-stat-item">
                        <div class="udu-stat-value">${quotaInfo.quotaFormatted}</div>
                        <div class="udu-stat-label">可用空间</div>
                    </div>
                `;
            }
        }

        statsGrid.innerHTML = `
            <div class="udu-stat-item">
                <div class="udu-stat-value">${stats.totalItems}</div>
                <div class="udu-stat-label">数据项</div>
            </div>
            <div class="udu-stat-item">
                <div class="udu-stat-value">${stats.totalSizeFormatted}</div>
                <div class="udu-stat-label">已使用</div>
            </div>
            ${quotaHTML}
        `;

        const categoryHTML = Object.entries(categoryStats)
            .filter(([_, cat]) => cat.items > 0)
            .map(([key, cat]) => `
                <div class="udu-category-item">
                    <span class="udu-category-name">${cat.name}</span>
                    <span class="udu-category-info">${cat.items} 项 · ${window.userCacheManager.formatSize(cat.size)}</span>
                </div>
            `).join('');

        categoryList.innerHTML = categoryHTML || '<div class="udu-stat-item">暂无数据</div>';
        
        this._loadWecomSettings();
    }

    async _loadWecomSettings() {
        const container = document.getElementById('wecom-settings-container');
        if (!container) return;

        try {
            const response = await fetch('/api/wecom/bind/status');
            const result = await response.json();

            if (!result.success) {
                container.innerHTML = `
                    <div class="wecom-status-card wecom-status-unavailable">
                        <div class="wecom-status-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                        </div>
                        <div class="wecom-status-text">
                            <span class="wecom-status-title">企业微信服务未开启</span>
                            <span class="wecom-status-desc">请联系管理员配置企业微信服务</span>
                        </div>
                    </div>
                `;
                return;
            }

            const data = result.data;

            if (data.bound) {
                container.innerHTML = `
                    <div class="wecom-status-card wecom-status-bound">
                        <div class="wecom-status-header">
                            <div class="wecom-status-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                                </svg>
                            </div>
                            <div class="wecom-status-text">
                                <span class="wecom-status-title">已绑定企业微信</span>
                                <span class="wecom-status-desc">账号: ${data.wecom_userid}</span>
                            </div>
                        </div>
                        <div class="wecom-notification-options">
                            <h4>通知偏好设置</h4>
                            <div class="wecom-option-item">
                                <label>
                                    <input type="checkbox" id="wecom-notify-batch" ${data.notify_batch !== false ? 'checked' : ''}>
                                    <span>批量任务完成通知</span>
                                </label>
                            </div>
                            <div class="wecom-option-item">
                                <label>
                                    <input type="checkbox" id="wecom-notify-ocr" ${data.notify_ocr !== false ? 'checked' : ''}>
                                    <span>OCR解析完成通知</span>
                                </label>
                            </div>
                            <div class="wecom-option-item">
                                <label>
                                    <input type="checkbox" id="wecom-notify-system" ${data.notify_system !== false ? 'checked' : ''}>
                                    <span>系统公告通知</span>
                                </label>
                            </div>
                        </div>
                        <div class="wecom-actions-row">
                            <button class="wecom-btn wecom-btn-test" id="wecom-test-btn">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M22 2L11 13"/>
                                    <path d="M22 2L15 22L11 13L2 9L22 2Z"/>
                                </svg>
                                发送测试
                            </button>
                            <button class="wecom-btn wecom-btn-unbind" id="wecom-unbind-btn">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M18 6L6 18"/>
                                    <path d="M6 6L18 18"/>
                                </svg>
                                解除绑定
                            </button>
                        </div>
                    </div>
                `;
                this._bindWecomEvents();
            } else {
                container.innerHTML = `
                    <div class="wecom-status-card wecom-status-unbound">
                        <div class="wecom-status-header">
                            <div class="wecom-status-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                                </svg>
                            </div>
                            <div class="wecom-status-text">
                                <span class="wecom-status-title">未绑定企业微信</span>
                                <span class="wecom-status-desc">绑定后可接收任务完成通知</span>
                            </div>
                        </div>
                        <div class="wecom-bind-methods">
                            <div class="wecom-bind-method">
                                <div class="wecom-method-header">
                                    <span class="wecom-method-icon">📱</span>
                                    <span class="wecom-method-title">扫码绑定</span>
                                    <span class="wecom-method-badge">推荐</span>
                                </div>
                                <button class="wecom-btn wecom-btn-primary" id="wecom-qrcode-btn">
                                    显示绑定二维码
                                </button>
                            </div>
                            <div class="wecom-bind-divider">
                                <span>或</span>
                            </div>
                            <div class="wecom-bind-method">
                                <div class="wecom-method-header">
                                    <span class="wecom-method-icon">✏️</span>
                                    <span class="wecom-method-title">手动输入</span>
                                </div>
                                <div class="wecom-manual-bind">
                                    <input type="text" id="wecom-userid-input" placeholder="输入企业微信账号">
                                    <button class="wecom-btn wecom-btn-secondary" id="wecom-manual-bind-btn">绑定</button>
                                </div>
                                <span class="wecom-hint">账号在企业微信通讯录中查看</span>
                            </div>
                        </div>
                    </div>
                `;
                this._bindWecomBindEvents();
            }
        } catch (error) {
            console.error('[UserDataUI] 加载企业微信设置失败:', error);
            container.innerHTML = `
                <div class="wecom-status-card wecom-status-error">
                    <span>加载失败，请刷新重试</span>
                </div>
            `;
        }
    }

    _bindWecomEvents() {
        const testBtn = document.getElementById('wecom-test-btn');
        const unbindBtn = document.getElementById('wecom-unbind-btn');
        const checkboxes = document.querySelectorAll('.wecom-notification-options input[type="checkbox"]');

        testBtn?.addEventListener('click', async () => {
            testBtn.disabled = true;
            testBtn.innerHTML = '<span class="wecom-loading"></span> 发送中...';
            
            try {
                const response = await fetch('/api/wecom/test', { method: 'POST' });
                const result = await response.json();
                
                if (result.success) {
                    testBtn.innerHTML = '✓ 已发送';
                    setTimeout(() => {
                        testBtn.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 2L11 13"/>
                                <path d="M22 2L15 22L11 13L2 9L22 2Z"/>
                            </svg>
                            发送测试
                        `;
                    }, 2000);
                } else {
                    alert(result.error || '发送失败');
                    testBtn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 2L11 13"/>
                            <path d="M22 2L15 22L11 13L2 9L22 2Z"/>
                        </svg>
                        发送测试
                    `;
                }
            } catch (error) {
                alert('网络错误');
                testBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 2L11 13"/>
                        <path d="M22 2L15 22L11 13L2 9L22 2Z"/>
                    </svg>
                    发送测试
                `;
            } finally {
                testBtn.disabled = false;
            }
        });

        unbindBtn?.addEventListener('click', async () => {
            if (!confirm('确定要解除企业微信绑定吗？')) return;
            
            try {
                const response = await fetch('/api/wecom/unbind', { method: 'POST' });
                const result = await response.json();
                
                if (result.success) {
                    this._loadWecomSettings();
                } else {
                    alert(result.error || '解绑失败');
                }
            } catch (error) {
                alert('网络错误');
            }
        });

        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', async (e) => {
                const notifyType = e.target.id.replace('wecom-notify-', '');
                const enabled = e.target.checked;
                
                try {
                    await fetch('/api/wecom/settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ [`notify_${notifyType}`]: enabled })
                    });
                } catch (error) {
                    e.target.checked = !enabled;
                }
            });
        });
    }

    _bindWecomBindEvents() {
        const qrcodeBtn = document.getElementById('wecom-qrcode-btn');
        const manualBindBtn = document.getElementById('wecom-manual-bind-btn');
        const useridInput = document.getElementById('wecom-userid-input');

        qrcodeBtn?.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/wecom/bind/qrcode');
                const result = await response.json();
                
                if (result.success) {
                    const qrcodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(result.data.qrcode_url)}`;
                    
                    const modal = document.createElement('div');
                    modal.className = 'wecom-qrcode-modal';
                    modal.innerHTML = `
                        <div class="wecom-qrcode-overlay"></div>
                        <div class="wecom-qrcode-content">
                            <div class="wecom-qrcode-header">
                                <h3>扫码绑定企业微信</h3>
                                <button class="wecom-qrcode-close">&times;</button>
                            </div>
                            <div class="wecom-qrcode-body">
                                <img src="${qrcodeUrl}" alt="绑定二维码">
                                <p>使用企业微信App扫描二维码</p>
                                <p class="wecom-qrcode-countdown">有效期: <span id="wecom-countdown">5:00</span></p>
                            </div>
                        </div>
                    `;
                    
                    document.body.appendChild(modal);
                    
                    modal.querySelector('.wecom-qrcode-close').onclick = () => modal.remove();
                    modal.querySelector('.wecom-qrcode-overlay').onclick = () => modal.remove();
                    
                    let remaining = result.data.expires_in;
                    const countdownEl = modal.querySelector('#wecom-countdown');
                    const timer = setInterval(() => {
                        remaining--;
                        const mins = Math.floor(remaining / 60);
                        const secs = remaining % 60;
                        countdownEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
                        
                        if (remaining <= 0) {
                            clearInterval(timer);
                            modal.remove();
                            alert('二维码已过期');
                        }
                    }, 1000);
                    
                    modal.querySelector('.wecom-qrcode-close').onclick = () => {
                        clearInterval(timer);
                        modal.remove();
                    };
                } else {
                    alert(result.error || '生成二维码失败');
                }
            } catch (error) {
                alert('网络错误');
            }
        });

        manualBindBtn?.addEventListener('click', async () => {
            const userid = useridInput.value.trim();
            if (!userid) {
                alert('请输入企业微信账号');
                return;
            }
            
            manualBindBtn.disabled = true;
            manualBindBtn.textContent = '绑定中...';
            
            try {
                const response = await fetch('/api/wecom/bind/manual', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ wecom_userid: userid })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    this._loadWecomSettings();
                } else {
                    alert(result.error || '绑定失败');
                    manualBindBtn.textContent = '绑定';
                }
            } catch (error) {
                alert('网络错误');
                manualBindBtn.textContent = '绑定';
            } finally {
                manualBindBtn.disabled = false;
            }
        });
    }

    showExportModal() {
        window.userDataModal.showExportModal();
    }

    showImportModal() {
        window.userDataModal.showImportModal();
    }

    confirmClear() {
        this._showClearModal();
    }

    _showClearModal() {
        this.hideDataPanel();
        this._injectStyles();

        const existingModal = document.getElementById('clear-cache-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const overlay = document.createElement('div');
        overlay.className = 'udu-overlay';
        overlay.id = 'clear-cache-modal';
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        };

        const dataTypes = window.userCacheManager.getDataTypes();
        const categoryStats = window.userCacheManager.getCategoryStats();

        let checkboxesHTML = '';
        Object.entries(dataTypes).forEach(([typeKey, type]) => {
            let itemCount = 0;
            if (type.isPrefix) {
                const keys = window.userCacheManager.getStorage().getKeysByPrefix(type.key);
                itemCount = keys.length;
            } else {
                if (window.userCacheManager.has(type.key)) {
                    itemCount = 1;
                }
            }

            checkboxesHTML += `
                <label class="udu-clear-item" data-type="${typeKey}">
                    <input type="checkbox" class="udu-clear-checkbox" value="${typeKey}" ${itemCount === 0 ? 'disabled' : ''}>
                    <span class="udu-clear-name">${type.name}</span>
                    <span class="udu-clear-count">${itemCount} 项</span>
                </label>
            `;
        });

        overlay.innerHTML = `
            <div class="udu-panel udu-clear-panel">
                <div class="udu-header">
                    <h2>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        清除缓存
                    </h2>
                    <button class="udu-close" onclick="document.getElementById('clear-cache-modal').remove()">&times;</button>
                </div>
                <div class="udu-body">
                    <div class="udu-clear-notice">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        选择要清除的模块，此操作不可撤销，建议先导出备份
                    </div>
                    <div class="udu-clear-actions-top">
                        <button class="udu-clear-btn-small" id="select-all-btn">全选</button>
                        <button class="udu-clear-btn-small" id="deselect-all-btn">取消全选</button>
                    </div>
                    <div class="udu-clear-list">
                        ${checkboxesHTML}
                    </div>
                    <div class="udu-clear-footer">
                        <button class="udu-clear-btn udu-clear-btn-cancel" id="cancel-clear-btn">取消</button>
                        <button class="udu-clear-btn udu-clear-btn-danger" id="do-clear-btn">清除选中</button>
                        <button class="udu-clear-btn udu-clear-btn-danger-outline" id="clear-all-btn">清除全部</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector('#select-all-btn').onclick = () => {
            overlay.querySelectorAll('.udu-clear-checkbox:not(:disabled)').forEach(cb => {
                cb.checked = true;
            });
        };

        overlay.querySelector('#deselect-all-btn').onclick = () => {
            overlay.querySelectorAll('.udu-clear-checkbox').forEach(cb => {
                cb.checked = false;
            });
        };

        overlay.querySelector('#cancel-clear-btn').onclick = () => {
            overlay.remove();
        };

        overlay.querySelector('#do-clear-btn').onclick = () => {
            const checked = overlay.querySelectorAll('.udu-clear-checkbox:checked');
            if (checked.length === 0) {
                alert('请至少选择一个模块');
                return;
            }

            const typeNames = [];
            checked.forEach(cb => {
                const type = dataTypes[cb.value];
                if (type) typeNames.push(type.name);
            });

            if (!confirm(`确定要清除以下模块的数据吗？\n\n${typeNames.join('\n')}\n\n此操作不可撤销！`)) {
                return;
            }

            let totalCleared = 0;
            checked.forEach(cb => {
                const count = window.userCacheManager.clearDataType(cb.value);
                totalCleared += count;
            });

            alert(`已清除 ${totalCleared} 条数据`);
            overlay.remove();
        };

        overlay.querySelector('#clear-all-btn').onclick = () => {
            if (!confirm('确定要清除所有缓存数据吗？\n\n此操作不可撤销！建议先导出数据备份。')) {
                return;
            }

            const count = window.userCacheManager.clearAllData();
            alert(`已清除 ${count} 条数据`);
            overlay.remove();
        };

        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }
}

const userDataUI = new UserDataUI();

window.UserDataUI = UserDataUI;
window.userDataUI = userDataUI;

console.log('[UserDataUI] 模块已加载');
