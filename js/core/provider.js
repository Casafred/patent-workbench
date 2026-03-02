/**
 * LLM Provider Manager
 * 管理LLM服务商切换（智谱AI / 阿里云百炼）
 * 支持模型优先选择：根据选择的模型自动使用对应服务商的API Key
 */

const ProviderManager = {
    providers: {
        zhipu: {
            name: '智谱AI',
            defaultModel: 'glm-4-flash',
            models: []
        },
        aliyun: {
            name: '阿里云百炼',
            defaultModel: 'qwen-plus',
            models: []
        }
    },
    
    currentProvider: 'zhipu',
    thinkingOnlyModels: [],
    modelProviderMap: {},
    allModels: [],
    
    async init() {
        await this.loadProvidersConfig();
        this.loadFromStorage();
        this.updateUI();
        console.log('[ProviderManager] 初始化完成, 当前服务商:', this.currentProvider);
    },
    
    async loadProvidersConfig() {
        try {
            const response = await fetch('/api/providers');
            if (response.ok) {
                const data = await response.json();
                if (data.providers) {
                    this.providers = data.providers;
                    this.thinkingOnlyModels = data.providers.aliyun?.thinking_only_models || [];
                }
                if (data.model_provider_map) {
                    this.modelProviderMap = data.model_provider_map;
                }
                if (data.all_models) {
                    this.allModels = data.all_models;
                }
            }
        } catch (e) {
            console.warn('[ProviderManager] 从API加载配置失败，尝试从本地配置加载');
            try {
                const configResponse = await fetch('config/models.json');
                if (configResponse.ok) {
                    const config = await configResponse.json();
                    if (config.providers) {
                        this.providers = config.providers;
                        this.thinkingOnlyModels = config.providers.aliyun?.thinking_only_models || [];
                    }
                    if (config.model_provider_map) {
                        this.modelProviderMap = config.model_provider_map;
                    }
                    if (config.all_models) {
                        this.allModels = config.all_models;
                    }
                }
            } catch (err) {
                console.warn('[ProviderManager] 加载本地配置也失败，使用默认配置');
            }
        }
    },
    
    loadFromStorage() {
        const savedProvider = localStorage.getItem('llm_provider');
        if (savedProvider && this.providers[savedProvider]) {
            this.currentProvider = savedProvider;
        }
        
        const savedAliyunKey = localStorage.getItem('aliyun_api_key');
        if (savedAliyunKey) {
            appState.aliyunApiKey = savedAliyunKey;
        }
        
        appState.provider = this.currentProvider;
    },
    
    saveToStorage() {
        localStorage.setItem('llm_provider', this.currentProvider);
        if (appState.aliyunApiKey) {
            localStorage.setItem('aliyun_api_key', appState.aliyunApiKey);
        }
    },
    
    getProviderForModel(model) {
        if (this.modelProviderMap && this.modelProviderMap[model]) {
            return this.modelProviderMap[model];
        }
        
        if (model.startsWith('glm-') || model.startsWith('GLM-')) {
            return 'zhipu';
        }
        if (model.startsWith('qwen') || model.startsWith('Qwen') || 
            model.startsWith('qwq') || model.startsWith('QwQ') ||
            model.startsWith('deepseek') || model.startsWith('DeepSeek') ||
            model.startsWith('kimi') || model.startsWith('Kimi') ||
            model.startsWith('minimax') || model.startsWith('MiniMax')) {
            return 'aliyun';
        }
        
        return this.currentProvider;
    },
    
    hasApiKey(provider) {
        if (provider === 'aliyun') {
            return !!(appState.aliyunApiKey || localStorage.getItem('aliyun_api_key'));
        } else {
            return !!(appState.apiKey || localStorage.getItem('api_key') || localStorage.getItem('globalApiKey'));
        }
    },
    
    getAvailableModels() {
        const availableModels = [];
        const zhipuKey = appState.apiKey || localStorage.getItem('api_key') || localStorage.getItem('globalApiKey');
        const aliyunKey = appState.aliyunApiKey || localStorage.getItem('aliyun_api_key');
        
        if (zhipuKey && this.providers.zhipu?.models) {
            this.providers.zhipu.models.forEach(modelId => {
                const modelInfo = this.allModels.find(m => m.id === modelId) || { id: modelId, provider: 'zhipu', name: modelId };
                availableModels.push({
                    ...modelInfo,
                    provider: 'zhipu',
                    providerName: '智谱AI'
                });
            });
        }
        
        if (aliyunKey && this.providers.aliyun?.models) {
            this.providers.aliyun.models.forEach(modelId => {
                const existingIndex = availableModels.findIndex(m => m.id === modelId);
                if (existingIndex === -1) {
                    const modelInfo = this.allModels.find(m => m.id === modelId) || { id: modelId, provider: 'aliyun', name: modelId };
                    availableModels.push({
                        ...modelInfo,
                        provider: 'aliyun',
                        providerName: '阿里云百炼'
                    });
                }
            });
        }
        
        if (availableModels.length === 0) {
            if (this.providers.zhipu?.models) {
                this.providers.zhipu.models.forEach(modelId => {
                    const modelInfo = this.allModels.find(m => m.id === modelId) || { id: modelId, provider: 'zhipu', name: modelId };
                    availableModels.push({
                        ...modelInfo,
                        provider: 'zhipu',
                        providerName: '智谱AI'
                    });
                });
            }
        }
        
        return availableModels;
    },
    
    getAvailableModelsGrouped() {
        const models = this.getAvailableModels();
        const grouped = {
            zhipu: [],
            aliyun: []
        };
        
        models.forEach(model => {
            if (grouped[model.provider]) {
                grouped[model.provider].push(model);
            }
        });
        
        return grouped;
    },
    
    setProvider(provider) {
        if (!this.providers[provider]) {
            console.error('[ProviderManager] 无效的服务商:', provider);
            return false;
        }
        
        this.currentProvider = provider;
        appState.provider = provider;
        this.saveToStorage();
        this.updateUI();
        
        window.dispatchEvent(new CustomEvent('providerChanged', {
            detail: { provider: provider, providerName: this.providers[provider].name }
        }));
        
        console.log('[ProviderManager] 服务商已切换为:', this.providers[provider].name);
        return true;
    },
    
    setProviderByModel(model) {
        const provider = this.getProviderForModel(model);
        if (provider !== this.currentProvider) {
            this.currentProvider = provider;
            appState.provider = provider;
            this.saveToStorage();
            
            window.dispatchEvent(new CustomEvent('providerChanged', {
                detail: { provider: provider, providerName: this.providers[provider]?.name || provider }
            }));
            
            console.log('[ProviderManager] 根据模型', model, '自动切换服务商为:', provider);
        }
        return provider;
    },
    
    getProvider() {
        return this.currentProvider;
    },
    
    getProviderName() {
        return this.providers[this.currentProvider]?.name || '智谱AI';
    },
    
    getModels() {
        return this.providers[this.currentProvider]?.models || [];
    },
    
    getDefaultModel() {
        return this.providers[this.currentProvider]?.defaultModel || 'glm-4-flash';
    },
    
    isThinkingOnlyModel(model) {
        return this.thinkingOnlyModels.includes(model);
    },
    
    getApiKey(provider) {
        const targetProvider = provider || this.currentProvider;
        if (targetProvider === 'aliyun') {
            return appState.aliyunApiKey || localStorage.getItem('aliyun_api_key');
        }
        return appState.apiKey || localStorage.getItem('api_key') || localStorage.getItem('globalApiKey');
    },
    
    setAliyunApiKey(key) {
        appState.aliyunApiKey = key;
        localStorage.setItem('aliyun_api_key', key);
    },
    
    getApiHeaders(model) {
        const headers = {};
        let provider = this.currentProvider;
        
        if (model) {
            provider = this.getProviderForModel(model);
        }
        
        if (provider === 'aliyun') {
            const aliyunKey = appState.aliyunApiKey || localStorage.getItem('aliyun_api_key');
            headers['X-LLM-Provider'] = 'aliyun';
            headers['X-Aliyun-API-Key'] = aliyunKey;
            headers['Authorization'] = `Bearer ${aliyunKey}`;
        } else {
            const zhipuKey = appState.apiKey || localStorage.getItem('api_key') || localStorage.getItem('globalApiKey');
            headers['Authorization'] = `Bearer ${zhipuKey}`;
        }
        
        return headers;
    },
    
    updateUI() {
        this.updateProviderSelector();
        this.updateModelSelectors();
        this.updateApiKeyUI();
    },
    
    updateProviderSelector() {
        const selector = document.getElementById('llm_provider_select');
        if (selector) {
            selector.value = this.currentProvider;
        }
        
        const providerNameSpan = document.getElementById('current_provider_name');
        if (providerNameSpan) {
            providerNameSpan.textContent = this.getProviderName();
        }
    },
    
    updateModelSelectors() {
        const availableModels = this.getAvailableModels();
        const grouped = this.getAvailableModelsGrouped();
        
        let modelOptions = '';
        
        if (grouped.zhipu.length > 0) {
            modelOptions += '<optgroup label="智谱AI">';
            grouped.zhipu.forEach(m => {
                modelOptions += `<option value="${m.id}">${m.name || m.id}</option>`;
            });
            modelOptions += '</optgroup>';
        }
        
        if (grouped.aliyun.length > 0) {
            modelOptions += '<optgroup label="阿里云百炼">';
            grouped.aliyun.forEach(m => {
                modelOptions += `<option value="${m.id}">${m.name || m.id}</option>`;
            });
            modelOptions += '</optgroup>';
        }
        
        if (availableModels.length === 0) {
            const models = this.getModels();
            modelOptions = models.map(m => `<option value="${m}">${m}</option>`).join('');
        }
        
        const defaultModel = this.getDefaultModel();
        
        const selectors = [
            'chat_model_select',
            'async_template_model_select',
            'api-model',
            'unified_template_model_select',
            'comparison_model_select',
            'patent_batch_model_selector'
        ];
        
        selectors.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                const currentValue = select.value;
                select.innerHTML = modelOptions;
                if (availableModels.find(m => m.id === currentValue)) {
                    select.value = currentValue;
                } else {
                    select.value = defaultModel;
                }
                
                select.removeEventListener('change', this._handleModelChange);
                select.addEventListener('change', (e) => this._handleModelChange(e));
            }
        });
    },
    
    _handleModelChange(e) {
        const model = e.target.value;
        const provider = this.getProviderForModel(model);
        if (provider !== this.currentProvider) {
            this.currentProvider = provider;
            appState.provider = provider;
            this.saveToStorage();
            this.updateApiKeyUI();
            
            console.log('[ProviderManager] 模型选择', model, '自动切换服务商为:', provider);
        }
    },
    
    updateApiKeyUI() {
        const zhipuConfig = document.getElementById('zhipu_api_config');
        const aliyunConfig = document.getElementById('aliyun_api_config');
        
        if (zhipuConfig) {
            zhipuConfig.style.display = this.currentProvider === 'zhipu' ? 'block' : 'none';
        }
        
        if (aliyunConfig) {
            aliyunConfig.style.display = this.currentProvider === 'aliyun' ? 'block' : 'none';
        }
    },
    
    createProviderUI() {
        return `
            <div class="provider-config" style="margin-bottom: 15px; padding: 10px; background: #f5f5f5; border-radius: 8px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <label style="font-weight: 500;">LLM服务商:</label>
                    <select id="llm_provider_select" onchange="ProviderManager.onProviderChange(this.value)" 
                            style="padding: 5px 10px; border-radius: 4px; border: 1px solid #ddd;">
                        <option value="zhipu">智谱AI (默认)</option>
                        <option value="aliyun">阿里云百炼</option>
                    </select>
                    <span id="current_provider_name" style="color: #666; font-size: 0.9em;"></span>
                </div>
                
                <div id="zhipu_api_config">
                    <label style="font-size: 0.9em; color: #666;">智谱AI API Key:</label>
                    <input type="password" id="global_api_key_input" placeholder="输入智谱AI API Key"
                           style="width: 100%; padding: 8px; margin-top: 5px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                
                <div id="aliyun_api_config" style="display: none;">
                    <label style="font-size: 0.9em; color: #666;">阿里云百炼 API Key:</label>
                    <input type="password" id="aliyun_api_key_input" placeholder="输入阿里云百炼 API Key"
                           style="width: 100%; padding: 8px; margin-top: 5px; border: 1px solid #ddd; border-radius: 4px;">
                    <p style="font-size: 0.8em; color: #999; margin-top: 5px;">
                        新用户可获得100万Tokens免费额度，有效期90天
                    </p>
                </div>
            </div>
        `;
    },
    
    onProviderChange(provider) {
        this.setProvider(provider);
    },
    
    injectUI(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.insertAdjacentHTML('afterbegin', this.createProviderUI());
            this.updateUI();
            
            const aliyunInput = document.getElementById('aliyun_api_key_input');
            if (aliyunInput) {
                aliyunInput.value = appState.aliyunApiKey || '';
                aliyunInput.addEventListener('change', (e) => {
                    this.setAliyunApiKey(e.target.value);
                    this.updateModelSelectors();
                });
            }
        }
    }
};

window.ProviderManager = ProviderManager;

document.addEventListener('DOMContentLoaded', () => {
    ProviderManager.init();
});
