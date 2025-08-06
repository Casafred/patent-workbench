// js/main.js (Final, Corrected, and Robust Version)

// =================================================================================
// 初始化
// =================================================================================
document.addEventListener('DOMContentLoaded', () => {
    initApiKeyConfig();
    initChat();
    initAsyncBatch();
    initLargeBatch();
    // ▼▼▼ 添加初始化调用 ▼▼▼
    initLocalPatentLib();
    // ▲▲▲ 添加结束 ▲▲▲
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

// 在 main.js 中，使用这个最终版本的 apiCall 函数
async function apiCall(endpoint, body, method = 'POST', isStream = false) {
    // 为了调试，在控制台打印请求信息
    console.log(`--- API调用开始: ${method} ${endpoint} ---`);

    if (!appState.apiKey) {
        const errorMsg = "API Key 未配置。请点击右上角 ⚙️ 设置并保存您的 API Key。";
        console.error(errorMsg);
        alert(errorMsg);
        throw new Error(errorMsg);
    }

    const headers = {
        'Authorization': `Bearer ${appState.apiKey}`
    };
    
    // 只有在需要发送 body 的请求中（如POST, PUT）才设置 Content-Type
    if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && !(body instanceof FormData)) {
         headers['Content-Type'] = 'application/json';
    }

    const fullUrl = `${window.location.origin}/api${endpoint}`; // 使用相对路径，更具通用性

    const fetchOptions = {
        method,
        headers,
    };
    
    // ▼▼▼ 这是最核心的修复逻辑 ▼▼▼
    // 对于需要 body 的请求，确保即使 body 为空，也发送一个空的 JSON 对象 '{}'
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        if (body && body instanceof FormData) {
            // FormData 是一种特殊情况, fetch 会自动处理它的 Content-Type
            delete headers['Content-Type']; 
            fetchOptions.body = body;
        } else {
            // 对于所有其他情况，序列化为 JSON。如果 body 是 null 或 undefined，则发送一个空对象 '{}'
            fetchOptions.body = JSON.stringify(body || {}); 
        }
        // 打印请求体的前500个字符，方便调试
        console.log("请求体 (已序列化):", fetchOptions.body.substring(0, 500));
    } else {
        console.log("该请求无请求体 (如 GET, DELETE)。");
    }
    console.log('----------------------------------------------------');

    try {
        const response = await fetch(fullUrl, fetchOptions);

        // 处理流式响应
        if (isStream) {
            if (!response.ok) {
                const errorText = await response.text();
                console.error("流式API响应错误原文:", errorText);
                // 尝试从流式数据中解析出更具体的JSON错误信息
                let errorMessage = `请求失败 (Stream): ${response.statusText}`;
                if (errorText.includes('data:')) {
                   try {
                       // 这是一个简单的解析，尝试提取JSON部分
                       const jsonPart = errorText.substring(errorText.indexOf('{'), errorText.lastIndexOf('}') + 1);
                       errorMessage = `请求失败 (Stream): - data: ${jsonPart}`;
                   } catch(e) { 
                       errorMessage = `请求失败 (Stream): ${errorText}`;
                   }
                } else {
                    errorMessage = `请求失败 (Stream): ${errorText}`;
                }
                throw new Error(errorMessage);
            }
            return response.body.getReader();
        }

        // 处理非流式响应
        const textResponse = await response.text();
        if (!textResponse) { // 如果响应体为空 (例如 HTTP 204 No Content)
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

        // 兼容直接返回的SDK数据和我们自己包装的数据
        return result.choices ? result : result.data;

    } catch (error) {
        console.error(`API调用 ${endpoint} 彻底失败:`, error);
        throw error; // 将错误继续抛出，让上层代码可以捕获
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

// ▼▼▼ 添加新函数 ▼▼▼
function switchLPLSubTab(subTabId, clickedElement) {
    const parent = getEl('local_patent_lib-tab');
    parent.querySelectorAll(".sub-tab-content").forEach(el => el.classList.remove("active"));
    getEl(`lpl-sub-tab-${subTabId}`).classList.add("active");
    
    if (clickedElement) {
        const stepper = clickedElement.closest('.progress-stepper');
        updateStepperState(stepper, clickedElement);
    }
}
// ▲▲▲ 添加结束 ▲▲▲