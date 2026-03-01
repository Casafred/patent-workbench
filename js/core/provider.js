/**
 * LLM Provider Manager
 * 管理LLM服务商切换（智谱AI / 阿里云百炼）
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
    
    getApiKey() {
        if (this.currentProvider === 'aliyun') {
            return appState.aliyunApiKey;
        }
        return appState.apiKey;
    },
    
    setAliyunApiKey(key) {
        appState.aliyunApiKey = key;
        localStorage.setItem('aliyun_api_key', key);
    },
    
    getApiHeaders() {
        const headers = {};
        
        if (this.currentProvider === 'aliyun') {
            headers['X-LLM-Provider'] = 'aliyun';
            headers['X-Aliyun-API-Key'] = appState.aliyunApiKey;
            headers['Authorization'] = `Bearer ${appState.aliyunApiKey}`;
        } else {
            headers['Authorization'] = `Bearer ${appState.apiKey}`;
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
        const models = this.getModels();
        const defaultModel = this.getDefaultModel();
        
        const modelOptions = models.map(m => `<option value="${m}">${m}</option>`).join('');
        
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
                if (models.includes(currentValue)) {
                    select.value = currentValue;
                } else {
                    select.value = defaultModel;
                }
            }
        });
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
                });
            }
        }
    }
};

window.ProviderManager = ProviderManager;

document.addEventListener('DOMContentLoaded', () => {
    ProviderManager.init();
});
