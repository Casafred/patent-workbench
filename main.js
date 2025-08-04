// js/main.js (Final, Corrected, and Robust Version)

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
    
    // 默认激活第一个步骤并更新步进器状态
    const asyncFirstStep = document.querySelector('#async_batch-tab .step-item');
    if (asyncFirstStep) switchAsyncSubTab('input', asyncFirstStep);
    
    const largeBatchFirstStep = document.querySelector('#large_batch-tab .step-item');
    if (largeBatchFirstStep) switchSubTab('generator', largeBatchFirstStep);

    // NOTE: The logic for initializing the inner tab has been moved into switchAsyncSubTab
    // to ensure it runs every time the step is entered, not just on page load.
});

// =================================================================================
// API Key配置 与 统一API调用函数 (无修改)
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
    
    // ▼▼▼ 修正点 ▼▼▼
    // 只要请求体不是 FormData，我们就认为它是一个 JSON 请求，
    // 无论后端的响应是否为流式（isStream），都必须设置 'Content-Type'。
    if (!(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    // ▲▲▲ 修正完毕 ▲▲▲

    const fullUrl = `${window.location.origin}/api${endpoint}`;
    try {
        const fetchOptions = { method, headers };
        if (body) {
            fetchOptions.body = (body instanceof FormData) ? body : JSON.stringify(body);
        }
        const response = await fetch(fullUrl, fetchOptions);

        if (isStream) {
            if (!response.ok) {
                // 对于流式错误，尝试读取文本内容以获取更详细的错误信息
                const errorText = await response.text();
                console.error("Stream API Response Error Text:", errorText);
                throw new Error(`请求失败 (Stream): ${response.statusText} - ${errorText}`);
            }
            return response.body.getReader();
        }

        const textResponse = await response.text();
        let result;
        try {
            result = JSON.parse(textResponse);
        } catch (jsonError) {
            console.error(`API返回非JSON响应: ${textResponse.substring(0, 500)}...`);
            // 将原始文本作为错误信息抛出，方便调试HTML错误页面等情况
            throw new Error(`API返回无效响应: ${textResponse.substring(0, 200)}...`);
        }

        if (!response.ok || (result && result.success === false)) {
            const errorMessage = result.error?.message || result.error || (result.data ? JSON.stringify(result.data) : `HTTP ${response.status}: ${response.statusText}`);
            const err = new Error(errorMessage);
            err.response = result;
            throw err;
        }

        // 根据后端响应结构调整返回数据
        // 如果后端直接返回 { choices: [...] } 结构
        if (result.choices && result.choices[0]) {
            return result; 
        }
        // 如果后端返回 { success: true, data: {...} } 结构
        return result.data;
    } catch (error) {
        console.error(`API Call Error to ${endpoint}:`, error);
        throw error;
    }
}


// =================================================================================
// 页面布局与导航 (核心修改区域)
// =================================================================================

/**
 * 更新进度步进器的UI状态
 * @param {HTMLElement} stepper - 步进器容器元素
 * @param {HTMLElement} activeStepElement - 当前被点击激活的步骤元素
 */
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
            const stepperStyle = window.getComputedStyle(stepper, '::before');
            const marginValue = parseFloat(stepperStyle.getPropertyValue('left')) || 70;
            
            const progressBarContainerWidth = stepper.offsetWidth - (marginValue * 2);
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

// 为“小批量异步”修改的页签切换函数
function switchAsyncSubTab(subTabId, clickedElement) {
    const parent = getEl('async_batch-tab');
    parent.querySelectorAll(".sub-tab-content").forEach(el => el.classList.remove("active"));
    getEl(`async-sub-tab-${subTabId}`).classList.add("active");
    
    if (clickedElement) {
        const stepper = clickedElement.closest('.progress-stepper');
        updateStepperState(stepper, clickedElement);
    }

    // ▼▼▼ DEFINITIVE FIX: This logic runs every time the 'input' step is entered. ▼▼▼
    if (subTabId === 'input') {
        // Find the inner tab button that is currently marked as active from the last session or default HTML.
        const activeInnerTabButton = document.querySelector('#async-sub-tab-input .sub-tab-container .sub-tab-button.active');
        
        // If an active button is found, simulate a click to run its associated JS and correctly display its content.
        if (activeInnerTabButton) {
            activeInnerTabButton.click();
        } else {
            // As a fallback, if no button is active for some reason, click the very first one.
            const firstInnerTabButton = document.querySelector('#async-sub-tab-input .sub-tab-container .sub-tab-button');
            if (firstInnerTabButton) {
                firstInnerTabButton.click();
            }
        }
    }
}

// 为“大批量处理”修改的页签切换函数
function switchSubTab(subTabId, clickedElement) {
    const parent = getEl('large_batch-tab');
    parent.querySelectorAll(".sub-tab-content").forEach(el => el.classList.remove("active"));
    getEl(`sub-tab-${subTabId}`).classList.add("active");
    
    if (clickedElement) {
        const stepper = clickedElement.closest('.progress-stepper');
        updateStepperState(stepper, clickedElement);
    }

    // 保持原有逻辑
    if (subTabId === 'reporter' && appState.batch.resultContent) {
        repInfoBox.style.display = 'block';
        appState.reporter.jsonlData = parseJsonl(appState.batch.resultContent);
        checkReporterReady();
    } else if(subTabId !== 'reporter') {
        repInfoBox.style.display = 'none';
    }
}
