// js/main.js (Final, Corrected, and Robust Version)

// =================================================================================
// 初始化
// =================================================================================
document.addEventListener('DOMContentLoaded', () => {
    initApiKeyConfig();
    initChat();
    initAsyncBatch();
    initLargeBatch();
    initLocalPatentLib();
    // ▼▼▼ 初始化文件管理器功能 ▼▼▼
    initFilesManager();
    // ▲▲▲ 初始化结束 ▲▲▲

    // 默认激活第一个主页签
    switchTab('instant', document.querySelector('.main-tab-container .tab-button'));
    
    // 默认激活各个功能内部的第一个步骤
    const asyncFirstStep = document.querySelector('#async_batch-tab .step-item');
    if (asyncFirstStep) switchAsyncSubTab('input', asyncFirstStep);
    
    const largeBatchFirstStep = document.querySelector('#large_batch-tab .step-item');
    if (largeBatchFirstStep) switchSubTab('generator', largeBatchFirstStep);
    
    const lplFirstStep = document.querySelector('#local_patent_lib-tab .step-item');
    if (lplFirstStep) switchLPLSubTab('expand', lplFirstStep);
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
        const errorMsg = "API Key 未配置。请点击右上角 ⚙️ 设置并保存您的 API Key。";
        alert(errorMsg);
        throw new Error(errorMsg);
    }

    // ▼▼▼ FIX START: 智能处理 Headers ▼▼▼
    const headers = {
        'Authorization': `Bearer ${appState.apiKey}`
    };

    // 只有当 body 不是 FormData 时，才设置 Content-Type 为 JSON
    if (body && !(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    // ▲▲▲ FIX END ▲▲▲

    const fullUrl = `${window.location.origin}/api${endpoint}`;

    const fetchOptions = {
        method,
        headers,
    };
    
    if (method !== 'GET' && method !== 'HEAD') {
        // ▼▼▼ FIX START: 智能处理 Body ▼▼▼
        if (body instanceof FormData) {
            fetchOptions.body = body; // 直接使用 FormData
        } else if (body) {
            fetchOptions.body = JSON.stringify(body); // 序列化其他类型的 body
        }
        // ▲▲▲ FIX END ▲▲▲
    }

    try {
        const response = await fetch(fullUrl, fetchOptions);

        if (isStream) {
            if (!response.ok) {
                // ... (stream 错误处理保持不变)
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

        // ▼▼▼ FIX START: 优雅处理非JSON响应 ▼▼▼
        const contentType = response.headers.get("content-type");
        if (!response.ok) {
            // 对于失败的响应，尝试解析为JSON，如果失败则返回文本
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = await response.text();
            }
            const errorMessage = errorData.error?.message || errorData.error || (typeof errorData === 'string' ? errorData : JSON.stringify(errorData));
            throw new Error(errorMessage);
        }

        if (contentType && contentType.indexOf("application/json") !== -1) {
            const result = await response.json();
            // 你的后端包装了响应，所以要解包
            return result.choices ? result : result.data;
        } else {
            // 对于非JSON的成功响应（如文件流），直接返回原始 response 对象
            // 让调用者决定如何处理 (e.g., response.blob(), response.text())
            return response;
        }
        // ▲▲▲ FIX END ▲▲▲

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
            progressBar.style.width = `${(activeIndex / (totalSteps - 1)) * 100}%`;
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
