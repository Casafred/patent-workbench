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

    _loadStats() {
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

        statsGrid.innerHTML = `
            <div class="udu-stat-item">
                <div class="udu-stat-value">${stats.totalItems}</div>
                <div class="udu-stat-label">数据项</div>
            </div>
            <div class="udu-stat-item">
                <div class="udu-stat-value">${stats.totalSizeFormatted}</div>
                <div class="udu-stat-label">总大小</div>
            </div>
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
    }

    showExportModal() {
        window.userDataModal.showExportModal();
    }

    showImportModal() {
        window.userDataModal.showImportModal();
    }

    confirmClear() {
        if (!confirm('确定要清除所有缓存数据吗？此操作不可撤销！\n\n建议先导出数据备份。')) {
            return;
        }

        const count = window.userCacheManager.clearAllData();
        alert(`已清除 ${count} 条数据`);

        this._loadStats();
    }
}

const userDataUI = new UserDataUI();

window.UserDataUI = UserDataUI;
window.userDataUI = userDataUI;

console.log('[UserDataUI] 模块已加载');
