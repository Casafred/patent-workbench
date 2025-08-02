// =================================================================================
// 初始化
// =================================================================================
document.addEventListener('DOMContentLoaded', () => {
    initApiKeyConfig();
    initChat();
    initAsyncBatch();
    initLargeBatch();
    // 默认激活第一个主页签
    switchTab('instant', document.querySelector('.main-tab-container .tab-button'));
    // 默认激活“小批量”的第一个子页签
    switchAsyncSubTab('input', document.querySelector('#async_batch-tab .sub-tab-button'));
    // 默认激活“大批量”的第一个子页签
    switchSubTab('generator', document.querySelector('#large_batch-tab .sub-tab-button'));
});

// =================================================================================
// API Key配置 与 统一API调用函数
// =================================================================================
function initApiKeyConfig() {
    appState.apiKey = localStorage.getItem('globalApiKey') || '';
    globalApiKeyInput.value = appState.apiKey;
    apiKeySaveBtn.addEventListener('click', () => {
        appState.apiKey = globalApiKeyInput.value.trim();
        localStorage.setItem('globalApiKey', appState.apiKey);
        apiKeySaveStatus.textContent = "已保存!";
        setTimeout(() => { apiKeySaveStatus.textContent = ""; }, 2000);
    });
    apiConfigToggleBtn.addEventListener('click', () => {
        apiConfigContainer.classList.toggle('visible');
    });
    apiKeyToggleVisibilityBtn.addEventListener('click', () => {
        const isPassword = globalApiKeyInput.type === 'password';
        globalApiKeyInput.type = isPassword ? 'text' : 'password';
        apiKeyToggleVisibilityBtn.textContent = isPassword ? '🙈' : '👁️';
    });
    apiKeyCopyBtn.addEventListener('click', () => {
        if (!globalApiKeyInput.value) return;
        navigator.clipboard.writeText(globalApiKeyInput.value).then(() => {
            apiKeyCopyBtn.textContent = '✅';
            setTimeout(() => { apiKeyCopyBtn.textContent = '📋'; }, 1500);
        });
    });
    apiKeyDeleteBtn.addEventListener('click', () => {
        globalApiKeyInput.value = '';
    });
    document.addEventListener('click', (event) => {
        if (!apiConfigContainer.contains(event.target) && !apiConfigToggleBtn.contains(event.target)) {
            apiConfigContainer.classList.remove('visible');
        }
    });
}

async function apiCall(endpoint, body, method = 'POST', isStream = false) {
    if (!appState.apiKey) {
        alert("请点击右上角 ⚙️ 设置并保存您的 API Key。");
        throw new Error("API Key 未配置。");
    }
    const headers = { 'Authorization': `Bearer ${appState.apiKey}` };
    if (!(body instanceof FormData) && isStream === false) {
        headers['Content-Type'] = 'application/json';
    }
    const fullUrl = `${window.location.origin}/api${endpoint}`; // Use relative path
    try {
        const fetchOptions = { method, headers };
        if (body) {
            fetchOptions.body = (body instanceof FormData) ? body : JSON.stringify(body);
        }
        const response = await fetch(fullUrl, fetchOptions);

        if (isStream) {
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`请求失败 (Stream): ${response.statusText} - ${errorText}`);
            }
            return response.body.getReader();
        }

        const textResponse = await response.text();
        let result;
        try {
            result = JSON.parse(textResponse);
        } catch (jsonError) {
            console.error(`API返回非JSON响应: ${textResponse.substring(0, 200)}...`);
            throw new Error(`API返回非JSON响应: ${textResponse.substring(0, 200)}...`);
        }

        if (!response.ok || (result && result.success === false)) {
            const errorMessage = result.error?.message || result.error || (result.data ? JSON.stringify(result.data) : `HTTP ${response.status}: ${response.statusText}`);
            const err = new Error(errorMessage);
            err.response = result;
            throw err;
        }
        if (result.choices && result.choices[0]) {
            return result; 
        }
        return result.data;
    } catch (error) {
        console.error(`API Call Error to ${endpoint}:`, error);
        throw error;
    }
}


// =================================================================================
// 页面布局与导航
// =================================================================================
function switchTab(tabId, clickedButton) {
    document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".tab-button").forEach(el => el.classList.remove("active"));
    getEl(`${tabId}-tab`).classList.add("active");
    if (clickedButton) clickedButton.classList.add("active");
}

// ▼▼▼ 需求①: 为“小批量异步”新增的页签切换函数 ▼▼▼
function switchAsyncSubTab(subTabId, clickedButton) {
    const parent = getEl('async_batch-tab');
    parent.querySelectorAll(".sub-tab-content").forEach(el => el.classList.remove("active"));
    parent.querySelectorAll(".sub-tab-button").forEach(el => el.classList.remove("active"));
    getEl(`async-sub-tab-${subTabId}`).classList.add("active");
    if(clickedButton) clickedButton.classList.add("active");
}

function switchSubTab(subTabId, clickedButton) {
    const parent = getEl('large_batch-tab');
    parent.querySelectorAll(".sub-tab-content").forEach(el => el.classList.remove("active"));
    parent.querySelectorAll(".sub-tab-button").forEach(el => el.classList.remove("active"));
    getEl(`sub-tab-${subTabId}`).classList.add("active");
    if(clickedButton) clickedButton.classList.add("active");
    if (subTabId === 'reporter' && appState.batch.resultContent) {
        repInfoBox.style.display = 'block';
        appState.reporter.jsonlData = parseJsonl(appState.batch.resultContent);
        checkReporterReady();
    } else if(subTabId !== 'reporter') {
        repInfoBox.style.display = 'none';
    }
}
