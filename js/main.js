// =================================================================================
// 初始化
// =================================================================================
document.addEventListener('DOMContentLoaded', () => {
    initApiKeyConfig();
    initChat();
    initAsyncBatch();
    initLargeBatch();
    switchTab('instant', document.querySelector('.tab-button'));
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

// js/main.js (仅展示apiCall函数的修改)

async function apiCall(endpoint, body, method = 'POST', isStream = false) {
    if (!appState.apiKey) {
        alert("请点击右上角 ⚙️ 设置并保存您的 API Key。");
        throw new Error("API Key 未配置。");
    }
    const headers = { 'Authorization': `Bearer ${appState.apiKey}` };
    if (!(body instanceof FormData) || isStream === false) { // 修正：非流式也需要json头
        headers['Content-Type'] = 'application/json';
    }
    const fullUrl = `${BACKEND_URL}/api${endpoint}`;
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

        // ▼▼▼ 修改：为非流式调用增加更健壮的错误处理 ▼▼▼
        // 对于非流式调用，我们总是期望返回JSON
        const result = await response.json();
        if (!response.ok || (result && result.success === false)) {
            // 从标准响应或直接从ZhipuAI的错误结构中提取错误信息
            const errorMessage = result.error?.message || result.error || (result.data ? JSON.stringify(result.data) : `HTTP ${response.status}: ${response.statusText}`);
            const err = new Error(errorMessage);
            err.response = result;
            throw err;
        }
        // 如果是ZhipuAI的非流式chat completion，结果在 result.choices[0].message.content
        if (result.choices && result.choices[0]) {
            return result; // 返回完整的ZhipuAI响应体
        }
        // 如果是我们的标准后端响应
        return result.data;
        // ▲▲▲ 修改结束 ▲▲▲
    } catch (error) {
        console.error(`API Call Error to ${endpoint}:`, error); // 保留 .message
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
    
    // ▼▼▼ 修改①：移除此处的轮询暂停逻辑 ▼▼▼
    // The original logic to pause polling is removed from here.
    // Polling will now continue in the background regardless of the active tab.
    // The user can explicitly stop it using a dedicated button.
    // ▲▲▲ 修改①：修改结束 ▲▲▲
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
