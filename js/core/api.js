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
 * 初始化API Key配置
 * 从localStorage加载API Key，设置事件监听器
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

    // 从localStorage加载API Key
    appState.apiKey = localStorage.getItem('globalApiKey') || '';
    appState.aliyunApiKey = localStorage.getItem('aliyun_api_key') || '';
    globalApiKeyInput.value = appState.apiKey;
    
    // 加载服务商设置
    const savedProvider = localStorage.getItem('llm_provider') || 'zhipu';
    appState.provider = savedProvider;
    
    // 更新服务商选择器和配置显示
    if (providerSelect) {
        providerSelect.value = savedProvider;
    }
    updateProviderUI(savedProvider);
    
    // 加载阿里云API Key到输入框
    if (aliyunApiKeyInput) {
        aliyunApiKeyInput.value = appState.aliyunApiKey;
    }

    // 保存API Key
    apiKeySaveBtn.addEventListener('click', () => {
        appState.apiKey = globalApiKeyInput.value.trim();
        appState.aliyunApiKey = aliyunApiKeyInput ? aliyunApiKeyInput.value.trim() : '';
        localStorage.setItem('globalApiKey', appState.apiKey);
        localStorage.setItem('aliyun_api_key', appState.aliyunApiKey);
        if (apiKeySaveStatus) {
            apiKeySaveStatus.textContent = "已保存!";
            setTimeout(() => { apiKeySaveStatus.textContent = ""; }, 2000);
        }
    });

    // 服务商切换
    if (providerSelect) {
        providerSelect.addEventListener('change', (e) => {
            const provider = e.target.value;
            appState.provider = provider;
            localStorage.setItem('llm_provider', provider);
            updateProviderUI(provider);
            
            // 触发服务商变更事件
            window.dispatchEvent(new CustomEvent('providerChanged', {
                detail: { provider: provider }
            }));
        });
    }

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
 * @param {string} provider - 服务商类型
 */
function updateProviderUI(provider) {
    const zhipuConfig = document.getElementById('zhipu_api_config');
    const aliyunConfig = document.getElementById('aliyun_api_config');
    
    if (zhipuConfig) {
        zhipuConfig.style.display = provider === 'zhipu' ? 'block' : 'none';
    }
    if (aliyunConfig) {
        aliyunConfig.style.display = provider === 'aliyun' ? 'block' : 'none';
    }
}

// =================================================================================
// 统一API调用函数
// =================================================================================

/**
 * 获取当前服务商的API Key
 * @returns {string} API Key
 */
function getCurrentApiKey() {
    if (appState.provider === 'aliyun') {
        return appState.aliyunApiKey;
    }
    return appState.apiKey;
}

/**
 * 获取当前服务商的API Headers
 * @returns {Object} Headers对象
 */
function getProviderHeaders() {
    const headers = {};
    
    if (appState.provider === 'aliyun') {
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
async function apiCall(endpoint, body, method = 'POST', isStream = false, timeout = null) {
    const currentApiKey = getCurrentApiKey();
    
    if (!currentApiKey) {
        const providerName = appState.provider === 'aliyun' ? '阿里云百炼' : '智谱AI';
        const errorMsg = `API Key 未配置。请设置您的 ${providerName} API Key。`;
        alert(errorMsg);
        throw new Error(errorMsg);
    }

    // 智能处理 Headers
    const headers = getProviderHeaders();

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
