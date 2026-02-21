/**
 * 用户数据管理UI模块
 * 负责渲染数据管理面板、统计展示、按钮交互
 */

class UserDataUI {
    constructor() {
        this.container = null;
        this.isInitialized = false;
    }

    /**
     * 初始化UI
     */
    init() {
        if (this.isInitialized) return;

        // 等待DOM加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this._setup());
        } else {
            this._setup();
        }

        this.isInitialized = true;
    }

    /**
     * 设置UI
     * @private
     */
    _setup() {
        // 创建数据管理按钮
        this._createDataManageButton();

        // 监听用户操作区域变化
        this._observeUserActions();

        console.log('[UserDataUI] UI已初始化');
    }

    /**
     * 创建数据管理按钮
     * @private
     */
    _createDataManageButton() {
        const userBtns = document.querySelector('.user-btns');
        if (!userBtns) return;

        // 检查是否已存在
        if (document.getElementById('user-data-manage-btn')) return;

        // 创建数据管理按钮
        const dataBtn = document.createElement('a');
        dataBtn.href = 'javascript:void(0);';
        dataBtn.id = 'user-data-manage-btn';
        dataBtn.className = 'user-btn';
        dataBtn.innerHTML = '📦 数据';
        dataBtn.onclick = () => this.showDataPanel();

        // 插入到登出按钮之前
        const logoutBtn = userBtns.querySelector('.logout');
        if (logoutBtn) {
            userBtns.insertBefore(dataBtn, logoutBtn);
        } else {
            userBtns.appendChild(dataBtn);
        }
    }

    /**
     * 监听用户操作区域变化
     * @private
     */
    _observeUserActions() {
        const observer = new MutationObserver(() => {
            this._createDataManageButton();
        });

        const userActions = document.querySelector('.user-actions');
        if (userActions) {
            observer.observe(userActions, { childList: true, subtree: true });
        }
    }

    /**
     * 显示数据管理面板
     */
    showDataPanel() {
        // 移除已存在的面板
        this.hideDataPanel();

        // 创建面板
        const panel = document.createElement('div');
        panel.id = 'user-data-panel';
        panel.innerHTML = this._getPanelHTML();

        document.body.appendChild(panel);

        // 绑定事件
        this._bindPanelEvents();

        // 加载统计数据
        this._loadStats();
    }

    /**
     * 隐藏数据管理面板
     */
    hideDataPanel() {
        const panel = document.getElementById('user-data-panel');
        if (panel) {
            panel.remove();
        }
    }

    /**
     * 获取面板HTML
     * @private
     */
    _getPanelHTML() {
        return `
            <style>
                #user-data-panel {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    z-index: 99999;
                    width: 500px;
                    max-width: 90vw;
                    max-height: 80vh;
                    overflow: hidden;
                    font-family: 'Noto Sans SC', sans-serif;
                }
                #user-data-panel .panel-header {
                    background: linear-gradient(135deg, #16A34A 0%, #22C55E 100%);
                    color: white;
                    padding: 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                #user-data-panel .panel-header h2 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 600;
                }
                #user-data-panel .close-btn {
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 18px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.2s;
                }
                #user-data-panel .close-btn:hover {
                    background: rgba(255,255,255,0.3);
                }
                #user-data-panel .panel-body {
                    padding: 20px;
                    max-height: 60vh;
                    overflow-y: auto;
                }
                #user-data-panel .stats-section {
                    margin-bottom: 20px;
                }
                #user-data-panel .stats-section h3 {
                    font-size: 14px;
                    color: #666;
                    margin: 0 0 10px;
                    font-weight: 500;
                }
                #user-data-panel .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 10px;
                }
                #user-data-panel .stat-item {
                    background: #f5f5f5;
                    border-radius: 8px;
                    padding: 12px;
                    text-align: center;
                }
                #user-data-panel .stat-item .value {
                    font-size: 20px;
                    font-weight: 600;
                    color: #16A34A;
                }
                #user-data-panel .stat-item .label {
                    font-size: 12px;
                    color: #666;
                    margin-top: 4px;
                }
                #user-data-panel .category-list {
                    margin-top: 10px;
                }
                #user-data-panel .category-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px 12px;
                    background: #f9f9f9;
                    border-radius: 8px;
                    margin-bottom: 8px;
                }
                #user-data-panel .category-item .name {
                    font-weight: 500;
                    color: #333;
                }
                #user-data-panel .category-item .info {
                    font-size: 12px;
                    color: #888;
                }
                #user-data-panel .action-section {
                    border-top: 1px solid #eee;
                    padding-top: 20px;
                    margin-top: 10px;
                }
                #user-data-panel .action-buttons {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 10px;
                }
                #user-data-panel .action-btn {
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
                }
                #user-data-panel .action-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }
                #user-data-panel .action-btn.export {
                    background: linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%);
                    color: white;
                }
                #user-data-panel .action-btn.import {
                    background: linear-gradient(135deg, #10B981 0%, #34D399 100%);
                    color: white;
                }
                #user-data-panel .action-btn.clear {
                    background: linear-gradient(135deg, #EF4444 0%, #F87171 100%);
                    color: white;
                }
                #user-data-panel .action-btn .icon {
                    font-size: 20px;
                }
                #user-data-panel .overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.5);
                    z-index: 99998;
                }
                #user-data-panel .loading {
                    text-align: center;
                    padding: 20px;
                    color: #666;
                }
            </style>
            <div class="overlay" onclick="window.userDataUI.hideDataPanel()"></div>
            <div class="panel-content">
                <div class="panel-header">
                    <h2>📦 数据管理</h2>
                    <button class="close-btn" onclick="window.userDataUI.hideDataPanel()">✕</button>
                </div>
                <div class="panel-body">
                    <div class="stats-section">
                        <h3>存储统计</h3>
                        <div class="stats-grid" id="stats-grid">
                            <div class="loading">加载中...</div>
                        </div>
                    </div>
                    <div class="stats-section">
                        <h3>分类详情</h3>
                        <div class="category-list" id="category-list">
                            <div class="loading">加载中...</div>
                        </div>
                    </div>
                    <div class="action-section">
                        <div class="action-buttons">
                            <button class="action-btn export" onclick="window.userDataUI.showExportModal()">
                                <span class="icon">📤</span>
                                <span>导出数据</span>
                            </button>
                            <button class="action-btn import" onclick="window.userDataUI.showImportModal()">
                                <span class="icon">📥</span>
                                <span>导入数据</span>
                            </button>
                            <button class="action-btn clear" onclick="window.userDataUI.confirmClear()">
                                <span class="icon">🗑️</span>
                                <span>清除缓存</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 绑定面板事件
     * @private
     */
    _bindPanelEvents() {
        // ESC键关闭
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                this.hideDataPanel();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }

    /**
     * 加载统计数据
     * @private
     */
    _loadStats() {
        if (!window.userCacheManager.isInitialized()) {
            document.getElementById('stats-grid').innerHTML = '<div class="stat-item">缓存管理器未初始化</div>';
            return;
        }

        const stats = window.userCacheManager.getStats();
        const categoryStats = window.userCacheManager.getCategoryStats();

        // 更新统计网格
        document.getElementById('stats-grid').innerHTML = `
            <div class="stat-item">
                <div class="value">${stats.totalItems}</div>
                <div class="label">数据项</div>
            </div>
            <div class="stat-item">
                <div class="value">${stats.totalSizeFormatted}</div>
                <div class="label">总大小</div>
            </div>
        `;

        // 更新分类列表
        const categoryHTML = Object.entries(categoryStats)
            .filter(([_, cat]) => cat.items > 0)
            .map(([key, cat]) => `
                <div class="category-item">
                    <span class="name">${cat.name}</span>
                    <span class="info">${cat.items} 项 · ${window.userCacheManager.formatSize(cat.size)}</span>
                </div>
            `).join('');

        document.getElementById('category-list').innerHTML = categoryHTML || '<div class="stat-item">暂无数据</div>';
    }

    /**
     * 显示导出弹窗
     */
    showExportModal() {
        window.userDataModal.showExportModal();
    }

    /**
     * 显示导入弹窗
     */
    showImportModal() {
        window.userDataModal.showImportModal();
    }

    /**
     * 确认清除缓存
     */
    confirmClear() {
        if (!confirm('确定要清除所有缓存数据吗？此操作不可撤销！\n\n建议先导出数据备份。')) {
            return;
        }

        const count = window.userCacheManager.clearAllData();
        alert(`已清除 ${count} 条数据`);

        // 刷新统计
        this._loadStats();
    }
}

// 创建全局单例
const userDataUI = new UserDataUI();

// 导出
window.UserDataUI = UserDataUI;
window.userDataUI = userDataUI;

console.log('[UserDataUI] 模块已加载');
