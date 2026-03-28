/**
 * 首次登录提示弹窗模块
 * 用于首次登录用户显示重要提示信息
 * 
 * @module guide-first-login-tip
 * @version 1.0.0
 */

(function(global) {
    'use strict';

    const FirstLoginTip = {
        version: '1.0.0',
        initialized: false,
        modal: null,
        config: {
            storageKey: 'patent_workbench_first_login_tip_shown',
            autoShowDelay: 2500,
            animationDuration: 300
        },

        init: function() {
            if (this.initialized) {
                console.warn('[FirstLoginTip] 已经初始化');
                return;
            }

            console.log('[FirstLoginTip] 初始化首次登录提示模块...');
            this.initialized = true;
        },

        shouldShow: function() {
            try {
                const shown = localStorage.getItem(this.config.storageKey);
                return shown !== 'true';
            } catch (e) {
                console.error('[FirstLoginTip] 读取存储状态失败:', e);
                return true;
            }
        },

        markAsShown: function() {
            try {
                localStorage.setItem(this.config.storageKey, 'true');
                console.log('[FirstLoginTip] 已标记为已显示');
            } catch (e) {
                console.error('[FirstLoginTip] 保存状态失败:', e);
            }
        },

        show: function() {
            if (!this.shouldShow()) {
                console.log('[FirstLoginTip] 用户已查看过提示，跳过显示');
                return false;
            }

            this.createModal();
            this.bindEvents();
            
            setTimeout(() => {
                this.modal.classList.add('show');
            }, 50);

            console.log('[FirstLoginTip] 显示首次登录提示弹窗');
            return true;
        },

        createModal: function() {
            if (this.modal) {
                this.modal.remove();
            }

            const html = `
                <div class="first-login-tip-modal" id="first-login-tip-modal">
                    <div class="first-login-tip-overlay"></div>
                    <div class="first-login-tip-content">
                        <div class="first-login-tip-header">
                            <div class="first-login-tip-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <path d="M12 16v-4"/>
                                    <path d="M12 8h.01"/>
                                </svg>
                            </div>
                            <h2 class="first-login-tip-title">重要提示</h2>
                        </div>
                        <div class="first-login-tip-body">
                            <div class="first-login-tip-message">
                                <p class="first-login-tip-main-text">
                                    如果您觉得当前界面元素过大、窗口浏览内容有限或界面存在遮挡问题，
                                    <strong>请务必尝试通过浏览器设置中的页面缩放功能调整至适合自己的显示比例</strong>。
                                </p>
                            </div>
                            <div class="first-login-tip-guide">
                                <div class="first-login-tip-guide-title">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="11" cy="11" r="8"/>
                                        <path d="M21 21l-4.35-4.35"/>
                                    </svg>
                                    如何调整页面缩放
                                </div>
                                <div class="first-login-tip-shortcuts">
                                    <div class="first-login-tip-shortcut">
                                        <div class="shortcut-keys">
                                            <kbd>Ctrl</kbd>
                                            <span class="shortcut-plus">+</span>
                                            <kbd>+</kbd>
                                            <span class="shortcut-slash">/</span>
                                            <kbd>-</kbd>
                                        </div>
                                        <span class="shortcut-desc">放大/缩小页面</span>
                                    </div>
                                    <div class="first-login-tip-shortcut">
                                        <div class="shortcut-keys">
                                            <kbd>Ctrl</kbd>
                                            <span class="shortcut-plus">+</span>
                                            <kbd>0</kbd>
                                        </div>
                                        <span class="shortcut-desc">恢复默认缩放</span>
                                    </div>
                                    <div class="first-login-tip-shortcut">
                                        <div class="shortcut-keys">
                                            <kbd>Ctrl</kbd>
                                            <span class="shortcut-plus">+</span>
                                            <kbd>滚轮</kbd>
                                        </div>
                                        <span class="shortcut-desc">自由缩放</span>
                                    </div>
                                </div>
                                <p class="first-login-tip-browser-tip">
                                    也可以通过浏览器菜单 <strong>⋮</strong> → 缩放 进行调整
                                </p>
                            </div>
                        </div>
                        <div class="first-login-tip-footer">
                            <button class="first-login-tip-btn first-login-tip-btn-primary" id="first-login-tip-confirm-btn">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="20 6 9 17 4 12"/>
                                </svg>
                                我知道了
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', html);
            this.modal = document.getElementById('first-login-tip-modal');
        },

        bindEvents: function() {
            const confirmBtn = document.getElementById('first-login-tip-confirm-btn');
            const overlay = this.modal.querySelector('.first-login-tip-overlay');

            if (confirmBtn) {
                confirmBtn.addEventListener('click', () => {
                    this.close();
                });
            }

            if (overlay) {
                overlay.addEventListener('click', () => {
                    this.close();
                });
            }

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.modal && this.modal.classList.contains('show')) {
                    this.close();
                }
            });
        },

        close: function() {
            if (!this.modal) return;

            this.modal.classList.remove('show');
            this.modal.classList.add('hiding');

            setTimeout(() => {
                this.markAsShown();
                if (this.modal) {
                    this.modal.remove();
                    this.modal = null;
                }
            }, this.config.animationDuration);

            console.log('[FirstLoginTip] 弹窗已关闭');
        },

        autoShow: function() {
            if (!this.shouldShow()) {
                return;
            }

            setTimeout(() => {
                this.show();
            }, this.config.autoShowDelay);
        },

        reset: function() {
            try {
                localStorage.removeItem(this.config.storageKey);
                console.log('[FirstLoginTip] 提示状态已重置');
            } catch (e) {
                console.error('[FirstLoginTip] 重置状态失败:', e);
            }
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = FirstLoginTip;
    } else {
        global.FirstLoginTip = FirstLoginTip;
    }

})(typeof window !== 'undefined' ? window : this);
