/**
 * 引导系统初始化模块
 * 负责在主应用中初始化和启动引导系统
 * 
 * @module guide-init
 * @version 1.0.0
 */

(function(global) {
    'use strict';

    const GuideInit = {
        initialized: false,
        config: {
            autoStartForNewUsers: true,
            showGuideButton: true,
            checkFirstLogin: true,
            delayMs: 2000
        },

        init: function() {
            if (this.initialized) {
                console.warn('[GuideInit] 已经初始化');
                return;
            }

            console.log('[GuideInit] 初始化引导系统...');

            this.injectStyles();
            this.createGuideButton();
            this.setupEventListeners();
            this.checkAndStartGuide();

            this.initialized = true;
            console.log('[GuideInit] 引导系统初始化完成');
        },

        injectStyles: function() {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '/frontend/css/components/guide-system.css?v=20260310';
            document.head.appendChild(link);
        },

        createGuideButton: function() {
            if (!this.config.showGuideButton) return;

            const existingBtn = document.getElementById('start-guide-btn');
            if (existingBtn) return;

            const btn = document.createElement('div');
            btn.id = 'start-guide-btn';
            btn.className = 'guide-float-ball';
            btn.title = '查看系统使用引导';
            btn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
            `;
            btn.style.cssText = 'position: fixed; right: 140px; bottom: 20px; z-index: 99997;';
            btn.onclick = function() {
                if (window.GuideSystem) {
                    window.GuideSystem.reset();
                    window.GuideSystem.start();
                }
            };

            document.body.appendChild(btn);
        },

        addGuideButtonStyles: function() {
            if (document.getElementById('guide-start-btn-styles')) return;

            const styles = document.createElement('style');
            styles.id = 'guide-start-btn-styles';
            styles.textContent = `
                #start-guide-btn.guide-float-ball {
                    width: 56px;
                    height: 56px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 4px 16px rgba(34, 197, 94, 0.35);
                    transition: all 0.3s ease;
                    opacity: 1;
                    visibility: visible;
                    transform: scale(1);
                }
                
                #start-guide-btn.guide-float-ball:hover {
                    transform: scale(1.08);
                    box-shadow: 0 6px 20px rgba(34, 197, 94, 0.45);
                }
                
                #start-guide-btn.guide-float-ball svg {
                    color: white;
                    width: 24px;
                    height: 24px;
                }
                
                [data-theme="dark"] #start-guide-btn.guide-float-ball {
                    background: linear-gradient(135deg, #166534 0%, #14532d 100%);
                }
                
                @media (max-width: 768px) {
                    #start-guide-btn.guide-float-ball {
                        right: 75px !important;
                    }
                }
            `;
            document.head.appendChild(styles);
        },

        setupEventListeners: function() {
            const self = this;

            document.addEventListener('click', function(e) {
                const target = e.target.closest('[data-guide-action]');
                if (target) {
                    const action = target.dataset.guideAction;
                    self.handleGuideAction(action);
                }
            });

            document.addEventListener('keydown', function(e) {
                if (e.ctrlKey && e.shiftKey && e.key === 'G') {
                    e.preventDefault();
                    if (window.GuideSystem) {
                        window.GuideSystem.reset();
                        window.GuideSystem.start();
                    }
                }
            });
        },

        handleGuideAction: function(action) {
            switch(action) {
                case 'start-guide':
                    if (window.GuideSystem) {
                        window.GuideSystem.reset();
                        window.GuideSystem.start();
                    }
                    break;
                case 'api-config-guide':
                    if (window.GuideApiConfig) {
                        window.GuideApiConfig.show();
                    }
                    break;
                case 'reset-guide':
                    if (window.GuideSystem) {
                        window.GuideSystem.reset();
                        alert('引导状态已重置，刷新页面后将重新显示引导');
                    }
                    break;
            }
        },

        checkAndStartGuide: function() {
            if (!this.config.autoStartForNewUsers) return;

            const self = this;
            
            setTimeout(function() {
                if (window.FirstLoginTip) {
                    window.FirstLoginTip.autoShow();
                }
                
                if (window.GuideSystem && !window.GuideSystem.isCompleted()) {
                    const hasApiKey = self.checkHasApiKey();
                    
                    if (!hasApiKey) {
                        console.log('[GuideInit] 检测到用户未配置API Key，启动引导');
                    }
                    
                    window.GuideSystem.autoStart();
                }
            }, this.config.delayMs);
        },

        checkHasApiKey: function() {
            if (window.appState && window.appState.apiKey) {
                return true;
            }
            
            const globalKey = localStorage.getItem('globalApiKey');
            const zhipuKey = localStorage.getItem('zhipuai_api_key');
            
            return !!(globalKey || zhipuKey);
        },

        showApiConfigGuide: function() {
            if (window.GuideApiConfig) {
                window.GuideApiConfig.show();
            }
        },

        showFeatureGuide: function(featureId) {
            if (window.GuideSystem) {
                const step = window.GuideSystem.steps.find(s => s.id === featureId);
                if (step) {
                    const index = window.GuideSystem.steps.indexOf(step);
                    window.GuideSystem.currentStep = index;
                    window.GuideSystem.showStep(index);
                }
            }
        }
    };

    function waitForDependencies(callback, maxAttempts) {
        maxAttempts = maxAttempts || 50;
        let attempts = 0;
        
        function check() {
            attempts++;
            
            if (window.GuideSystem && window.GuideApiConfig) {
                callback();
            } else if (attempts < maxAttempts) {
                setTimeout(check, 100);
            } else {
                console.warn('[GuideInit] 等待依赖超时，引导系统可能无法正常工作');
            }
        }
        
        check();
    }

    function initOnReady() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                waitForDependencies(function() {
                    GuideInit.init();
                });
            });
        } else {
            waitForDependencies(function() {
                GuideInit.init();
            });
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { GuideInit, waitForDependencies };
    } else {
        global.GuideInit = GuideInit;
        global.waitForGuideDependencies = waitForDependencies;
        initOnReady();
    }

})(typeof window !== 'undefined' ? window : this);
