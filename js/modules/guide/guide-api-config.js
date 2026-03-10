/**
 * API密钥配置引导模块
 * 提供详细的API申请指引和连通性测试功能
 * 
 * @module guide-api-config
 * @version 1.0.0
 */

(function(global) {
    'use strict';

    const GuideApiConfig = {
        initialized: false,
        modal: null,
        currentProvider: 'zhipu',

        providers: {
            zhipu: {
                name: '智谱AI',
                website: 'https://open.bigmodel.cn/',
                registerUrl: 'https://open.bigmodel.cn/注册',
                consoleUrl: 'https://open.bigmodel.cn/user/apikeys',
                models: ['GLM-4-Flash', 'GLM-4-Plus', 'GLM-4-Air', 'GLM-4-Long'],
                features: ['免费额度', '流式输出', '多轮对话', '长文本处理'],
                freeQuota: '新用户赠送免费额度',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>'
            },
            aliyun: {
                name: '阿里云百炼',
                website: 'https://bailian.console.aliyun.com/',
                registerUrl: 'https://bailian.console.aliyun.com/',
                consoleUrl: 'https://bailian.console.aliyun.com/#/api-key',
                models: ['Qwen-Max', 'Qwen-Plus', 'Qwen-Turbo', 'DeepSeek-V3', 'Kimi'],
                features: ['多模型支持', '企业级服务', '高可用性', '按量计费'],
                freeQuota: '部分模型有免费试用',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>'
            }
        },

        init: function() {
            if (this.initialized) return;
            this.initialized = true;
            console.log('[GuideApiConfig] API配置引导模块初始化完成');
        },

        show: function(provider) {
            this.init();
            this.currentProvider = provider || 'zhipu';
            this.createModal();
            this.modal.classList.add('active');
        },

        hide: function() {
            if (this.modal) {
                this.modal.classList.remove('active');
            }
        },

        createModal: function() {
            const existing = document.getElementById('guide-api-config-modal');
            if (existing) {
                existing.remove();
            }

            const html = `
                <div class="guide-api-config-modal" id="guide-api-config-modal">
                    <div class="guide-api-config-overlay" onclick="GuideApiConfig.hide()"></div>
                    <div class="guide-api-config-content">
                        <div class="guide-api-config-header">
                            <h2>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                                API密钥配置指南
                            </h2>
                            <button class="guide-api-config-close" onclick="GuideApiConfig.hide()">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                        
                        <div class="guide-api-config-body">
                            <div class="guide-api-provider-tabs">
                                <button class="guide-api-provider-tab ${this.currentProvider === 'zhipu' ? 'active' : ''}" onclick="GuideApiConfig.switchProvider('zhipu')">
                                    智谱AI
                                </button>
                                <button class="guide-api-provider-tab ${this.currentProvider === 'aliyun' ? 'active' : ''}" onclick="GuideApiConfig.switchProvider('aliyun')">
                                    阿里云百炼
                                </button>
                            </div>
                            
                            <div class="guide-api-provider-content" id="guide-api-provider-content">
                                ${this.renderProviderContent(this.currentProvider)}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', html);
            this.modal = document.getElementById('guide-api-config-modal');
            this.addStyles();
        },

        renderProviderContent: function(provider) {
            const info = this.providers[provider];
            
            return `
                <div class="guide-api-provider-info">
                    <div class="guide-api-provider-header">
                        <div class="guide-api-provider-icon">${info.icon}</div>
                        <div class="guide-api-provider-details">
                            <h3>${info.name}</h3>
                            <p>${info.freeQuota}</p>
                        </div>
                        <a href="${info.website}" target="_blank" class="guide-api-visit-btn">
                            访问官网
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        </a>
                    </div>
                    
                    <div class="guide-api-steps-container">
                        <h4>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                            获取API密钥步骤
                        </h4>
                        <div class="guide-api-steps">
                            <div class="guide-api-step">
                                <div class="guide-api-step-number">1</div>
                                <div class="guide-api-step-content">
                                    <strong>注册账号</strong>
                                    <p>访问 <a href="${info.registerUrl}" target="_blank">${info.registerUrl}</a> 注册${info.name}账号</p>
                                </div>
                            </div>
                            <div class="guide-api-step">
                                <div class="guide-api-step-number">2</div>
                                <div class="guide-api-step-content">
                                    <strong>进入控制台</strong>
                                    <p>登录后进入 <a href="${info.consoleUrl}" target="_blank">API密钥管理页面</a></p>
                                </div>
                            </div>
                            <div class="guide-api-step">
                                <div class="guide-api-step-number">3</div>
                                <div class="guide-api-step-content">
                                    <strong>创建API Key</strong>
                                    <p>点击创建新的API密钥，并复制保存（密钥只显示一次）</p>
                                </div>
                            </div>
                            <div class="guide-api-step">
                                <div class="guide-api-step-number">4</div>
                                <div class="guide-api-step-content">
                                    <strong>配置到系统</strong>
                                    <p>将复制的密钥粘贴到下方输入框，点击保存</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="guide-api-models-section">
                        <h4>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                            支持的模型
                        </h4>
                        <div class="guide-api-models">
                            ${info.models.map(m => `<span class="guide-api-model-tag">${m}</span>`).join('')}
                        </div>
                    </div>
                    
                    <div class="guide-api-input-section">
                        <h4>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            配置API密钥
                        </h4>
                        <div class="guide-api-input-group">
                            <input type="password" id="guide-api-key-input" placeholder="请粘贴您的API密钥">
                            <button class="guide-api-toggle-visibility" onclick="GuideApiConfig.toggleVisibility()">
                                <svg id="guide-api-eye-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            </button>
                        </div>
                        <div class="guide-api-actions">
                            <button class="guide-api-test-btn" onclick="GuideApiConfig.testConnection()">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                测试连通性
                            </button>
                            <button class="guide-api-save-btn" onclick="GuideApiConfig.saveApiKey()">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                                保存密钥
                            </button>
                        </div>
                        <div class="guide-api-result" id="guide-api-result"></div>
                    </div>
                </div>
            `;
        },

        switchProvider: function(provider) {
            this.currentProvider = provider;
            
            const tabs = document.querySelectorAll('.guide-api-provider-tab');
            tabs.forEach(tab => {
                tab.classList.remove('active');
                if (tab.textContent.includes(provider === 'zhipu' ? '智谱' : '阿里云')) {
                    tab.classList.add('active');
                }
            });
            
            const content = document.getElementById('guide-api-provider-content');
            if (content) {
                content.innerHTML = this.renderProviderContent(provider);
            }
        },

        toggleVisibility: function() {
            const input = document.getElementById('guide-api-key-input');
            const icon = document.getElementById('guide-api-eye-icon');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
            } else {
                input.type = 'password';
                icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
            }
        },

        testConnection: async function() {
            const input = document.getElementById('guide-api-key-input');
            const resultDiv = document.getElementById('guide-api-result');
            const apiKey = input.value.trim();
            
            if (!apiKey) {
                this.showResult(resultDiv, false, '请先输入API密钥');
                return;
            }
            
            if (!this.validateApiKeyFormat(apiKey)) {
                this.showResult(resultDiv, false, 'API密钥格式不正确，请检查');
                return;
            }
            
            resultDiv.innerHTML = `
                <div class="guide-api-testing">
                    <div class="guide-api-spinner"></div>
                    <span>正在测试连通性...</span>
                </div>
            `;
            
            try {
                const response = await fetch('/api/test_connection', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        provider: this.currentProvider,
                        api_key: apiKey
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    this.showResult(resultDiv, true, result.message || '连接成功！API密钥有效');
                } else {
                    this.showResult(resultDiv, false, result.message || '连接失败，请检查API密钥');
                }
            } catch (error) {
                this.showResult(resultDiv, false, `测试失败: ${error.message}`);
            }
        },

        validateApiKeyFormat: function(key) {
            if (this.currentProvider === 'zhipu') {
                return key.length >= 20 && /^[a-zA-Z0-9._-]+$/.test(key);
            } else if (this.currentProvider === 'aliyun') {
                return key.length >= 20;
            }
            return key.length >= 10;
        },

        saveApiKey: function() {
            const input = document.getElementById('guide-api-key-input');
            const resultDiv = document.getElementById('guide-api-result');
            const apiKey = input.value.trim();
            
            if (!apiKey) {
                this.showResult(resultDiv, false, '请先输入API密钥');
                return;
            }
            
            if (!this.validateApiKeyFormat(apiKey)) {
                this.showResult(resultDiv, false, 'API密钥格式不正确，请检查');
                return;
            }
            
            try {
                if (this.currentProvider === 'zhipu') {
                    if (window.userCacheStorage && window.userCacheStorage.isInitialized()) {
                        window.userCacheStorage.set('globalApiKey', apiKey);
                    } else {
                        localStorage.setItem('globalApiKey', apiKey);
                    }
                    if (window.appState) {
                        window.appState.apiKey = apiKey;
                    }
                    const globalInput = document.getElementById('global_api_key_input');
                    if (globalInput) {
                        globalInput.value = apiKey;
                    }
                } else if (this.currentProvider === 'aliyun') {
                    if (window.userCacheStorage && window.userCacheStorage.isInitialized()) {
                        window.userCacheStorage.set('aliyun_api_key', apiKey);
                    } else {
                        localStorage.setItem('aliyun_api_key', apiKey);
                    }
                    if (window.appState) {
                        window.appState.aliyunApiKey = apiKey;
                    }
                    const aliyunInput = document.getElementById('aliyun_api_key_input');
                    if (aliyunInput) {
                        aliyunInput.value = apiKey;
                    }
                }
                
                this.showResult(resultDiv, true, 'API密钥已保存成功！');
                
                if (window.ProviderManager) {
                    window.ProviderManager.updateModelSelectors();
                }
                
                setTimeout(() => {
                    this.hide();
                }, 1500);
                
            } catch (error) {
                this.showResult(resultDiv, false, `保存失败: ${error.message}`);
            }
        },

        showResult: function(element, success, message) {
            const icon = success 
                ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
                : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
            
            element.innerHTML = `
                <div class="guide-api-result-${success ? 'success' : 'error'}">
                    ${icon}
                    <span>${message}</span>
                </div>
            `;
        },

        addStyles: function() {
            if (document.getElementById('guide-api-config-styles')) return;
            
            const styles = document.createElement('style');
            styles.id = 'guide-api-config-styles';
            styles.textContent = `
                .guide-api-config-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 100010;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s ease;
                }
                
                .guide-api-config-modal.active {
                    opacity: 1;
                    visibility: visible;
                }
                
                .guide-api-config-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                }
                
                .guide-api-config-content {
                    position: relative;
                    z-index: 2;
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.3);
                    max-width: 600px;
                    width: 90%;
                    max-height: 90vh;
                    overflow-y: auto;
                    transform: scale(0.95);
                    transition: transform 0.3s ease;
                }
                
                .guide-api-config-modal.active .guide-api-config-content {
                    transform: scale(1);
                }
                
                .guide-api-config-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 20px 24px;
                    border-bottom: 1px solid #e5e7eb;
                    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                    border-radius: 16px 16px 0 0;
                }
                
                .guide-api-config-header h2 {
                    margin: 0;
                    font-size: 18px;
                    color: #166534;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .guide-api-config-close {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 8px;
                    color: #6b7280;
                    transition: all 0.2s;
                }
                
                .guide-api-config-close:hover {
                    background: #f3f4f6;
                    color: #374151;
                }
                
                .guide-api-config-body {
                    padding: 24px;
                }
                
                .guide-api-provider-tabs {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 20px;
                }
                
                .guide-api-provider-tab {
                    flex: 1;
                    padding: 12px 16px;
                    border: 2px solid #e5e7eb;
                    border-radius: 10px;
                    background: white;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    color: #6b7280;
                    transition: all 0.2s;
                }
                
                .guide-api-provider-tab:hover {
                    border-color: #22C55E;
                    color: #166534;
                }
                
                .guide-api-provider-tab.active {
                    border-color: #22C55E;
                    background: #f0fdf4;
                    color: #166534;
                }
                
                .guide-api-provider-header {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 16px;
                    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                    border-radius: 12px;
                    margin-bottom: 20px;
                }
                
                .guide-api-provider-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                }
                
                .guide-api-provider-details {
                    flex: 1;
                }
                
                .guide-api-provider-details h3 {
                    margin: 0 0 4px;
                    font-size: 16px;
                    color: #166534;
                }
                
                .guide-api-provider-details p {
                    margin: 0;
                    font-size: 13px;
                    color: #6b7280;
                }
                
                .guide-api-visit-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 10px 16px;
                    background: white;
                    border: 1px solid #22C55E;
                    border-radius: 8px;
                    color: #166534;
                    text-decoration: none;
                    font-size: 13px;
                    font-weight: 500;
                    transition: all 0.2s;
                }
                
                .guide-api-visit-btn:hover {
                    background: #f0fdf4;
                }
                
                .guide-api-steps-container,
                .guide-api-models-section,
                .guide-api-input-section {
                    margin-bottom: 20px;
                }
                
                .guide-api-steps-container h4,
                .guide-api-models-section h4,
                .guide-api-input-section h4 {
                    margin: 0 0 12px;
                    font-size: 14px;
                    color: #374151;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .guide-api-steps {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                
                .guide-api-step {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    padding: 12px;
                    background: #f9fafb;
                    border-radius: 10px;
                    border: 1px solid #e5e7eb;
                    transition: all 0.2s;
                }
                
                .guide-api-step:hover {
                    border-color: #22C55E;
                    background: #f0fdf4;
                }
                
                .guide-api-step-number {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-weight: 600;
                    flex-shrink: 0;
                }
                
                .guide-api-step-content strong {
                    display: block;
                    margin-bottom: 4px;
                    color: #374151;
                    font-size: 13px;
                }
                
                .guide-api-step-content p {
                    margin: 0;
                    font-size: 12px;
                    color: #6b7280;
                    line-height: 1.5;
                }
                
                .guide-api-step-content a {
                    color: #059669;
                    text-decoration: none;
                }
                
                .guide-api-step-content a:hover {
                    text-decoration: underline;
                }
                
                .guide-api-models {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }
                
                .guide-api-model-tag {
                    padding: 6px 12px;
                    background: #f3f4f6;
                    border-radius: 6px;
                    font-size: 12px;
                    color: #374151;
                }
                
                .guide-api-input-group {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 12px;
                }
                
                .guide-api-input-group input {
                    flex: 1;
                    padding: 12px 16px;
                    border: 2px solid #e5e7eb;
                    border-radius: 10px;
                    font-size: 14px;
                    transition: all 0.2s;
                }
                
                .guide-api-input-group input:focus {
                    outline: none;
                    border-color: #22C55E;
                    box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1);
                }
                
                .guide-api-toggle-visibility {
                    padding: 12px;
                    background: #f3f4f6;
                    border: none;
                    border-radius: 10px;
                    cursor: pointer;
                    color: #6b7280;
                    transition: all 0.2s;
                }
                
                .guide-api-toggle-visibility:hover {
                    background: #e5e7eb;
                    color: #374151;
                }
                
                .guide-api-actions {
                    display: flex;
                    gap: 10px;
                }
                
                .guide-api-test-btn,
                .guide-api-save-btn {
                    flex: 1;
                    padding: 12px 16px;
                    border-radius: 10px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: all 0.2s;
                }
                
                .guide-api-test-btn {
                    background: white;
                    border: 2px solid #22C55E;
                    color: #166534;
                }
                
                .guide-api-test-btn:hover {
                    background: #f0fdf4;
                }
                
                .guide-api-save-btn {
                    background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%);
                    border: none;
                    color: white;
                }
                
                .guide-api-save-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
                }
                
                .guide-api-result {
                    margin-top: 12px;
                }
                
                .guide-api-testing {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 12px;
                    background: #f0fdf4;
                    border-radius: 8px;
                    color: #166534;
                }
                
                .guide-api-spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid #22C55E;
                    border-top-color: transparent;
                    border-radius: 50%;
                    animation: guide-api-spin 0.8s linear infinite;
                }
                
                @keyframes guide-api-spin {
                    to { transform: rotate(360deg); }
                }
                
                .guide-api-result-success,
                .guide-api-result-error {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px;
                    border-radius: 8px;
                    font-size: 13px;
                }
                
                .guide-api-result-success {
                    background: #dcfce7;
                    color: #166534;
                }
                
                .guide-api-result-error {
                    background: #fee2e2;
                    color: #991b1b;
                }
                
                [data-theme="dark"] .guide-api-config-content {
                    background: #1f2937;
                }
                
                [data-theme="dark"] .guide-api-config-header {
                    background: linear-gradient(135deg, #166534 0%, #14532d 100%);
                }
                
                [data-theme="dark"] .guide-api-config-header h2 {
                    color: #4ade80;
                }
                
                [data-theme="dark"] .guide-api-provider-tab {
                    background: #374151;
                    border-color: #4b5563;
                    color: #9ca3af;
                }
                
                [data-theme="dark"] .guide-api-provider-tab:hover,
                [data-theme="dark"] .guide-api-provider-tab.active {
                    border-color: #22C55E;
                    background: #1f2937;
                    color: #4ade80;
                }
                
                [data-theme="dark"] .guide-api-provider-header {
                    background: linear-gradient(135deg, #166534 0%, #14532d 100%);
                }
                
                [data-theme="dark"] .guide-api-provider-details h3 {
                    color: #4ade80;
                }
                
                [data-theme="dark"] .guide-api-provider-details p {
                    color: #9ca3af;
                }
                
                [data-theme="dark"] .guide-api-visit-btn {
                    background: #374151;
                    border-color: #22C55E;
                    color: #4ade80;
                }
                
                [data-theme="dark"] .guide-api-step {
                    background: #374151;
                    border-color: #4b5563;
                }
                
                [data-theme="dark"] .guide-api-step:hover {
                    border-color: #22C55E;
                    background: #4b5563;
                }
                
                [data-theme="dark"] .guide-api-step-content strong {
                    color: #e5e7eb;
                }
                
                [data-theme="dark"] .guide-api-step-content p {
                    color: #9ca3af;
                }
                
                [data-theme="dark"] .guide-api-model-tag {
                    background: #374151;
                    color: #e5e7eb;
                }
                
                [data-theme="dark"] .guide-api-input-group input {
                    background: #374151;
                    border-color: #4b5563;
                    color: #e5e7eb;
                }
                
                [data-theme="dark"] .guide-api-toggle-visibility {
                    background: #4b5563;
                    color: #9ca3af;
                }
                
                [data-theme="dark"] .guide-api-test-btn {
                    background: #374151;
                    border-color: #22C55E;
                    color: #4ade80;
                }
                
                @media (max-width: 640px) {
                    .guide-api-config-content {
                        width: 95%;
                        max-height: 95vh;
                    }
                    
                    .guide-api-config-body {
                        padding: 16px;
                    }
                    
                    .guide-api-provider-header {
                        flex-direction: column;
                        text-align: center;
                    }
                    
                    .guide-api-actions {
                        flex-direction: column;
                    }
                }
            `;
            
            document.head.appendChild(styles);
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = GuideApiConfig;
    } else {
        global.GuideApiConfig = GuideApiConfig;
    }

})(typeof window !== 'undefined' ? window : this);
