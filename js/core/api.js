/**
 * API Client Module
 * 负责API Key配置和统一的API调用
 * 支持多服务商：智谱AI（默认）和阿里云百炼
 * 
 * @module api
 */

let sessionExpiredHandled = false;

function handleSessionExpired() {
    if (sessionExpiredHandled) return;
    sessionExpiredHandled = true;
    
    alert('登录已过期，请重新登录');
    window.location.href = '/login';
}

// =================================================================================
// API Key配置
// =================================================================================

/**
 * 获取用户隔离的存储键名
 * @param {string} key - 原始键名
 * @returns {string} 带用户前缀的键名（如果用户缓存管理器已初始化）
 */
function getUserStorageKey(key) {
    if (window.userCacheStorage && window.userCacheStorage.isInitialized()) {
        return window.userCacheStorage.getKey(key);
    }
    return key;
}

/**
 * 从用户隔离存储中获取数据
 * @param {string} key - 键名
 * @returns {string|null} 数据或null
 */
function getUserStorageItem(key) {
    if (window.userCacheStorage && window.userCacheStorage.isInitialized()) {
        return window.userCacheStorage.get(key);
    }
    return localStorage.getItem(key);
}

/**
 * 保存数据到用户隔离存储
 * @param {string} key - 键名
 * @param {string} value - 数据
 */
function setUserStorageItem(key, value) {
    if (window.userCacheStorage && window.userCacheStorage.isInitialized()) {
        window.userCacheStorage.set(key, value);
    } else {
        localStorage.setItem(key, value);
    }
}

/**
 * 初始化API Key配置
 * 从localStorage加载API Key，设置事件监听器
 * 支持用户隔离存储
 */
function initApiKeyConfig() {
    const globalApiKeyInput = document.getElementById('global_api_key_input');
    const aliyunApiKeyInput = document.getElementById('aliyun_api_key_input');
    const apiKeySaveBtn = document.getElementById('api_key_save_btn');
    const apiKeySaveStatus = document.getElementById('api_key_save_status');
    const apiConfigToggleBtn = document.getElementById('api_config_toggle_btn');
    const apiConfigContainer = document.getElementById('api_config_container');
    const apiKeyToggleVisibilityBtn = document.getElementById('api_key_toggle_visibility_btn');
    const apiKeyCopyBtn = document.getElementById('api_key_copy_btn');
    const apiKeyDeleteBtn = document.getElementById('api_key_delete_btn');
    const providerSelect = document.getElementById('llm_provider_select');
    const zhipuConfig = document.getElementById('zhipu_api_config');
    const aliyunConfig = document.getElementById('aliyun_api_config');

    if (!globalApiKeyInput || !apiKeySaveBtn || !apiConfigToggleBtn || !apiConfigContainer) {
        console.warn('[API] API配置元素未找到，跳过初始化');
        return;
    }

    // 从用户隔离存储加载API Key
    appState.apiKey = getUserStorageItem('globalApiKey') || '';
    appState.aliyunApiKey = getUserStorageItem('aliyun_api_key') || '';
    globalApiKeyInput.value = appState.apiKey;
    
    // 加载阿里云API Key到输入框
    if (aliyunApiKeyInput) {
        aliyunApiKeyInput.value = appState.aliyunApiKey;
    }

    
    // 保存API Key（使用用户隔离存储）
    apiKeySaveBtn.addEventListener('click', () => {
        appState.apiKey = globalApiKeyInput.value.trim();
        appState.aliyunApiKey = aliyunApiKeyInput ? aliyunApiKeyInput.value.trim() : '';
        setUserStorageItem('globalApiKey', appState.apiKey);
        setUserStorageItem('aliyun_api_key', appState.aliyunApiKey);
        if (apiKeySaveStatus) {
            apiKeySaveStatus.textContent = "已保存!";
            setTimeout(() => { apiKeySaveStatus.textContent = ""; }, 2000);
        }
        
        if (window.ProviderManager) {
            ProviderManager.updateModelSelectors();
        }
    });

    // 切换配置面板显示
    apiConfigToggleBtn.addEventListener('click', () => {
        apiConfigContainer.classList.toggle('visible');
    });

    // 切换API Key可见性
    if (apiKeyToggleVisibilityBtn) {
        apiKeyToggleVisibilityBtn.addEventListener('click', () => {
            const isPassword = globalApiKeyInput.type === 'password';
            globalApiKeyInput.type = isPassword ? 'text' : 'password';
        });
    }

    // 复制API Key
    if (apiKeyCopyBtn) {
        apiKeyCopyBtn.addEventListener('click', () => {
            if (!globalApiKeyInput.value) return;
            navigator.clipboard.writeText(globalApiKeyInput.value).then(() => {
                const originalHTML = apiKeyCopyBtn.innerHTML;
                apiKeyCopyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                setTimeout(() => { apiKeyCopyBtn.innerHTML = originalHTML; }, 1500);
            });
        });
    }

    // 删除API Key
    if (apiKeyDeleteBtn) {
        apiKeyDeleteBtn.addEventListener('click', () => {
            globalApiKeyInput.value = '';
        });
    }

    // 阿里云API Key操作
    const aliyunCopyBtn = document.getElementById('aliyun_api_key_copy_btn');
    const aliyunDeleteBtn = document.getElementById('aliyun_api_key_delete_btn');
    const aliyunToggleVisibilityBtn = document.getElementById('aliyun_api_key_toggle_visibility_btn');
    
    if (aliyunCopyBtn && aliyunApiKeyInput) {
        aliyunCopyBtn.addEventListener('click', () => {
            if (!aliyunApiKeyInput.value) return;
            navigator.clipboard.writeText(aliyunApiKeyInput.value).then(() => {
                const originalHTML = aliyunCopyBtn.innerHTML;
                aliyunCopyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                setTimeout(() => { aliyunCopyBtn.innerHTML = originalHTML; }, 1500);
            });
        });
    }
    
    if (aliyunDeleteBtn && aliyunApiKeyInput) {
        aliyunDeleteBtn.addEventListener('click', () => {
            aliyunApiKeyInput.value = '';
        });
    }
    
    if (aliyunToggleVisibilityBtn && aliyunApiKeyInput) {
        aliyunToggleVisibilityBtn.addEventListener('click', () => {
            const isPassword = aliyunApiKeyInput.type === 'password';
            aliyunApiKeyInput.type = isPassword ? 'text' : 'password';
        });
    }

    // 点击外部关闭配置面板
    document.addEventListener('click', (event) => {
        if (!apiConfigContainer.contains(event.target) && !apiConfigToggleBtn.contains(event.target)) {
            apiConfigContainer.classList.remove('visible');
        }
    });

    console.log('[API] API Key配置初始化完成');
}

/**
 * 更新服务商UI显示
 * 现在两个配置区域始终显示，服务商选择器仅决定默认使用哪个平台
 * @param {string} provider - 服务商类型
 */
function updateProviderUI(provider) {
    const zhipuConfig = document.getElementById('zhipu_api_config');
    const aliyunConfig = document.getElementById('aliyun_api_config');
    
    if (zhipuConfig) {
        zhipuConfig.style.display = 'block';
    }
    if (aliyunConfig) {
        aliyunConfig.style.display = 'block';
    }
}

// =================================================================================
// 统一API调用函数
// =================================================================================

/**
 * 获取当前服务商的API Key
 * @param {string} model - 可选，根据模型确定服务商
 * @returns {string} API Key
 */
function getCurrentApiKey(model) {
    const provider = getProviderForModel(model);
    if (provider === 'aliyun') {
        return appState.aliyunApiKey;
    }
    return appState.apiKey;
}

/**
 * 检查指定服务商是否有API Key
 * @param {string} provider - 服务商标识
 * @returns {boolean} 是否有API Key
 */
function hasApiKeyForProvider(provider) {
    if (provider === 'aliyun') {
        return !!(appState.aliyunApiKey || getUserStorageItem('aliyun_api_key'));
    }
    return !!(appState.apiKey || getUserStorageItem('api_key') || getUserStorageItem('globalApiKey'));
}

/**
 * 根据模型获取服务商
 * @param {string} model - 模型ID
 * @returns {string} 服务商标识
 */
function getProviderForModel(model) {
    if (!model) {
        return appState.provider || 'zhipu';
    }
    
    if (window.getProviderForModel) {
        return window.getProviderForModel(model);
    }
    
    if (window.ProviderManager && ProviderManager.getProviderForModel) {
        return ProviderManager.getProviderForModel(model);
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
    
    return appState.provider || 'zhipu';
}

/**
 * 获取当前服务商的API Headers
 * @param {string} model - 可选，根据模型确定服务商
 * @returns {Object} Headers对象
 */
function getProviderHeaders(model) {
    const headers = {};
    const provider = getProviderForModel(model);
    
    if (provider === 'aliyun') {
        headers['X-LLM-Provider'] = 'aliyun';
        headers['X-Aliyun-API-Key'] = appState.aliyunApiKey;
        headers['Authorization'] = `Bearer ${appState.aliyunApiKey}`;
    } else {
        headers['Authorization'] = `Bearer ${appState.apiKey}`;
    }
    
    return headers;
}

/**
 * 统一的API调用函数
 * @param {string} endpoint - API端点路径 (如 '/chat/stream')
 * @param {Object|FormData} body - 请求体数据
 * @param {string} method - HTTP方法 (默认'POST')
 * @param {boolean} isStream - 是否为流式响应 (默认false)
 * @param {number} timeout - 超时时间(毫秒)，流式请求默认300秒
 * @returns {Promise<any>} - API响应数据或ReadableStreamDefaultReader
 * @throws {Error} - API调用失败时抛出错误
 */
const NO_API_KEY_REQUIRED_ENDPOINTS = [
    '/patent/search',
    '/patent/version',
    '/patent/family/',
];

function isApiKeyRequired(endpoint) {
    return !NO_API_KEY_REQUIRED_ENDPOINTS.some(e => endpoint.startsWith(e));
}

async function apiCall(endpoint, body, method = 'POST', isStream = false, timeout = null) {
    const model = body && !(body instanceof FormData) ? body.model : null;
    const provider = getProviderForModel(model);
    const currentApiKey = getCurrentApiKey(model);
    const requiresApiKey = isApiKeyRequired(endpoint);
    
    if (requiresApiKey && !currentApiKey) {
        const providerName = provider === 'aliyun' ? '阿里云百炼' : '智谱AI';
        
        const zhipuKey = appState.apiKey || getUserStorageItem('api_key') || getUserStorageItem('globalApiKey');
        const aliyunKey = appState.aliyunApiKey || getUserStorageItem('aliyun_api_key');
        const hasZhipuKey = !!zhipuKey;
        const hasAliyunKey = !!aliyunKey;
        
        let errorMsg;
        if (hasZhipuKey && !hasAliyunKey && provider === 'aliyun') {
            errorMsg = `您只配置了智谱AI的API Key，但选择的模型 "${model}" 需要阿里云百炼API Key。\n\n请选择智谱AI的模型，或配置阿里云百炼API Key。`;
        } else if (hasAliyunKey && !hasZhipuKey && provider === 'zhipu') {
            errorMsg = `您只配置了阿里云百炼的API Key，但选择的模型 "${model}" 需要智谱AI API Key。\n\n请选择阿里云百炼的模型，或配置智谱AI API Key。`;
        } else {
            errorMsg = `API Key 未配置。请设置您的 ${providerName} API Key。`;
        }
        
        alert(errorMsg);
        throw new Error(errorMsg);
    }

    const headers = requiresApiKey ? getProviderHeaders(model) : {};

    // 只有当 body 不是 FormData 时，才设置 Content-Type 为 JSON
    if (body && !(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const fullUrl = `${window.location.origin}/api${endpoint}`;

    // 设置超时：流式请求默认300秒，非流式请求默认60秒
    const requestTimeout = timeout || (isStream ? 300000 : 60000);

    const fetchOptions = {
        method,
        headers,
    };

    if (method !== 'GET' && method !== 'HEAD') {
        // 智能处理 Body
        if (body instanceof FormData) {
            fetchOptions.body = body; // 直接使用 FormData
        } else if (body) {
            fetchOptions.body = JSON.stringify(body); // 序列化其他类型的 body
        }
    }

    try {
        // 使用 AbortController 实现超时控制
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), requestTimeout);
        fetchOptions.signal = controller.signal;

        const response = await fetch(fullUrl, fetchOptions);
        clearTimeout(timeoutId);

        if (isStream) {
            if (!response.ok) {
                if (response.status === 401) {
                    handleSessionExpired();
                    throw new Error('SESSION_EXPIRED');
                }
                const errorText = await response.text();
                let errorMessage = `请求失败 (Stream): ${response.statusText}`;
                try {
                    const parsedError = JSON.parse(errorText.substring(errorText.indexOf('{')));
                    errorMessage = parsedError.error?.message || JSON.stringify(parsedError.error);
                } catch(e) {
                    errorMessage = errorText;
                }
                throw new Error(errorMessage);
            }
            return response.body.getReader();
        }

        const contentType = response.headers.get("content-type");
        if (!response.ok) {
            if (response.status === 401) {
                handleSessionExpired();
                throw new Error('SESSION_EXPIRED');
            }
            const clonedResponse = response.clone();
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                try {
                    errorData = await clonedResponse.text();
                } catch (textError) {
                    errorData = 'Unknown error';
                }
            }
            const errorMessage = errorData.error?.message || errorData.error || (typeof errorData === 'string' ? errorData : JSON.stringify(errorData));
            throw new Error(errorMessage);
        }

        if (contentType && contentType.indexOf("application/json") !== -1) {
            const result = await response.json();
            // 后端包装了响应，所以要解包
            return result.choices ? result : result.data;
        } else {
            // 对于非JSON的成功响应（如文件流），直接返回原始 response 对象
            // 让调用者决定如何处理 (e.g., response.blob(), response.text())
            return response;
        }

    } catch (error) {
        console.error(`[API] API调用 ${endpoint} 失败:`, error);
        throw error;
    }
}

// 导出函数供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initApiKeyConfig, apiCall, getCurrentApiKey, getProviderHeaders, updateProviderUI, handleSessionExpired };
}
