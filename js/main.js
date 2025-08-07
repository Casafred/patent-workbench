// js/main.js

// =================================================================================
// 初始化
// =================================================================================
document.addEventListener('DOMContentLoaded', () => {
    initApiKeyConfig();
    initChat();
    initAsyncBatch();
    initLargeBatch();
    initLocalPatentLib();

    // 默认激活第一个主页签
    switchTab('instant', document.querySelector('.main-tab-container .tab-button'));
    
    // 默认激活第一个步骤并更新步进器状态
    const asyncFirstStep = document.querySelector('#async_batch-tab .step-item');
    if (asyncFirstStep) switchAsyncSubTab('input', asyncFirstStep);
    
    const largeBatchFirstStep = document.querySelector('#large_batch-tab .step-item');
    if (largeBatchFirstStep) switchSubTab('generator', largeBatchFirstStep);
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

/**
 * 统一API调用函数 (已修复文件上传BUG)
 * @param {string} endpoint - API端点, e.g., '/stream_chat'
 * @param {object|FormData} body - 请求体
 * @param {string} method - HTTP方法
 * @param {boolean} isStream - 是否为流式响应
 * @returns {Promise<any>}
 */
async function apiCall(endpoint, body, method = 'POST', isStream = false) {
    if (!appState.apiKey) {
        const errorMsg = "API Key 未配置。请点击右上角 ⚙️ 设置并保存您的 API Key。";
        alert(errorMsg);
        throw new Error(errorMsg);
    }

    const headers = {
        'Authorization': `Bearer ${appState.apiKey}`
    };
    
    // 只有在需要发送 body 且 body 不是 FormData 的情况下才设置 Content-Type
    if (body && !(body instanceof FormData)) {
         headers['Content-Type'] = 'application/json';
    }

    const fullUrl = `/api${endpoint}`;

    const fetchOptions = {
        method,
        headers,
    };
    
    // [核心修复] 正确处理不同类型的请求体
    if (body) {
        if (body instanceof FormData) {
            // 对于 FormData, fetch 会自动处理 Content-Type (multipart/form-data)
            fetchOptions.body = body;
        } else {
            // 对于其他情况，序列化为 JSON
            fetchOptions.body = JSON.stringify(body);
        }
    }

    try {
        const response = await fetch(fullUrl, fetchOptions);

        // 处理流式响应
        if (isStream) {
            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `请求失败 (Stream): ${response.statusText}`;
                try {
                    const errorJson = JSON.parse(errorText.substring(errorText.indexOf('{')));
                    errorMessage = errorJson.error?.message || JSON.stringify(errorJson.error);
                } catch(e) {
                    errorMessage = errorText;
                }
                throw new Error(errorMessage);
            }
            return response.body.getReader();
        }

        // 处理非流式响应
        const textResponse = await response.text();
        // 某些成功响应（如204 No Content）可能没有响应体
        if (!textResponse) {
             if (!response.ok) throw new Error(`请求失败: ${response.statusText}`);
             return { success: true, data: null };
        }
        
        let result;
        try {
            result = JSON.parse(textResponse);
        } catch (e) {
            console.error("API 返回了非法的JSON响应:", textResponse);
            throw new Error(`服务器返回了无效的响应格式。`);
        }

        if (!response.ok || (result && result.success === false)) {
            const errorMessage = result.error?.message || result.error || JSON.stringify(result);
            throw new Error(errorMessage);
        }
        
        // 兼容两种返回格式：
        // 1. Zhipu SDK 直接返回的格式 (有 choices 字段)
        // 2. 我们后端包装的格式 (有 success 和 data 字段)
        return result.choices ? result : result.data;

    } catch (error) {
        console.error(`API调用 ${endpoint} 失败:`, error);
        throw error;
    }
}


// =================================================================================
// 页面布局与导航
// =================================================================================
function updateStepperState(stepper, activeStepElement) {
    if (!stepper || !activeStepElement) return;

    const steps = Array.from(stepper.querySelectorAll('.step-item'));
    const progressBar = stepper.querySelector('.progress-bar');
    const activeIndex = steps.indexOf(activeStepElement);

    if (activeIndex === -1) return;

    steps.forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index < activeIndex) {
            step.classList.add('completed');
        } else if (index === activeIndex) {
            step.classList.add('active');
        }
    });

    if (progressBar) {
        const totalSteps = steps.length;
        if (totalSteps > 1) {
            const stepperStyle = window.getComputedStyle(stepper);
            const paddingLeft = parseFloat(stepperStyle.paddingLeft);
            const paddingRight = parseFloat(stepperStyle.paddingRight);
            
            const progressBarContainerWidth = stepper.offsetWidth - paddingLeft - paddingRight;
            const stepGap = progressBarContainerWidth / (totalSteps - 1);
            const progressBarWidth = activeIndex * stepGap;
            progressBar.style.width = `${progressBarWidth}px`;
        } else {
            progressBar.style.width = '0px';
        }
    }
}


function switchTab(tabId, clickedButton) {
    document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".tab-button").forEach(el => el.classList.remove("active"));
    getEl(`${tabId}-tab`).classList.add("active");
    if (clickedButton) clickedButton.classList.add("active");
}

function switchAsyncSubTab(subTabId, clickedElement) {
    const parent = getEl('async_batch-tab');
    parent.querySelectorAll(".sub-tab-content").forEach(el => el.classList.remove("active"));
    getEl(`async-sub-tab-${subTabId}`).classList.add("active");
    
    if (clickedElement) {
        const stepper = clickedElement.closest('.progress-stepper');
        updateStepperState(stepper, clickedElement);
    }
    
    if (subTabId === 'input') {
        const activeInnerTabButton = document.querySelector('#async-sub-tab-input .sub-tab-container .sub-tab-button.active');
        if (activeInnerTabButton) {
            activeInnerTabButton.click();
        } else {
            const firstInnerTabButton = document.querySelector('#async-sub-tab-input .sub-tab-container .sub-tab-button');
            if (firstInnerTabButton) firstInnerTabButton.click();
        }
    }
}

function switchSubTab(subTabId, clickedElement) {
    const parent = getEl('large_batch-tab');
    parent.querySelectorAll(".sub-tab-content").forEach(el => el.classList.remove("active"));
    getEl(`sub-tab-${subTabId}`).classList.add("active");
    
    if (clickedElement) {
        const stepper = clickedElement.closest('.progress-stepper');
        updateStepperState(stepper, clickedElement);
    }

    if (subTabId === 'reporter' && appState.batch.resultContent) {
        repInfoBox.style.display = 'block';
        appState.reporter.jsonlData = parseJsonl(appState.batch.resultContent);
        checkReporterReady();
    } else if(subTabId !== 'reporter') {
        repInfoBox.style.display = 'none';
    }
}

function switchLPLSubTab(subTabId, clickedElement) {
    const parent = getEl('local_patent_lib-tab');
    parent.querySelectorAll(".sub-tab-content").forEach(el => el.classList.remove("active"));
    getEl(`lpl-sub-tab-${subTabId}`).classList.add("active");
    
    if (clickedElement) {
        const stepper = clickedElement.closest('.progress-stepper');
        updateStepperState(stepper, clickedElement);
    }
}
