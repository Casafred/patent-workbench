/**
 * Tab Navigation Module
 * 负责主标签页和子标签页的切换逻辑
 * 
 * @module tab-navigation
 * @requires js/state.js (appState)
 */

/**
 * DOM 辅助函数 - 通过ID获取元素
 * @param {string} id - 元素ID
 * @returns {HTMLElement|null} DOM元素
 */
const getEl = (id) => document.getElementById(id);

/**
 * 更新步骤器状态
 * 将当前步骤标记为active，之前的步骤标记为completed
 * 
 * @param {HTMLElement} stepper - 步骤器容器元素
 * @param {HTMLElement} activeStepElement - 当前激活的步骤元素
 */
function updateStepperState(stepper, activeStepElement) {
    if (!stepper || !activeStepElement) return;

    const steps = Array.from(stepper.querySelectorAll('.step-item'));
    const activeIndex = steps.indexOf(activeStepElement);

    if (activeIndex === -1) return;

    // 更新步骤状态：之前的步骤标记为completed，当前步骤标记为active
    steps.forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index < activeIndex) {
            step.classList.add('completed');
        } else if (index === activeIndex) {
            step.classList.add('active');
        }
    });
}

/**
 * 切换主标签页
 * 
 * @param {string} tabId - 标签页ID (不含'-tab'后缀)
 * @param {HTMLElement} clickedButton - 被点击的标签按钮
 */
function switchTab(tabId, clickedButton) {
    document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".tab-button").forEach(el => el.classList.remove("active"));
    getEl(`${tabId}-tab`).classList.add("active");
    if (clickedButton) clickedButton.classList.add("active");
    
    // 当切换到功能三标签页时，确保模板选择器能够正确初始化
    if (tabId === 'large_batch') {
        setTimeout(() => {
            // 首先激活功能三内部的第一个步骤
            const largeBatchFirstStep = document.querySelector('#large_batch-tab .step-item');
            if (largeBatchFirstStep) {
                switchSubTab('generator', largeBatchFirstStep);
                console.log('✅ 功能三内部步骤已激活');
            }
            
            // 然后初始化功能三独立的模板选择器
            if (typeof updateTemplateSelector === 'function') {
                updateTemplateSelector();
                console.log('✅ 功能三标签页切换，独立模板选择器已重新初始化');
            }
        }, 100);
    }
}

/**
 * 切换功能二(异步批处理)的子标签页
 * 
 * @param {string} subTabId - 子标签页ID
 * @param {HTMLElement} clickedElement - 被点击的步骤元素
 */
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

/**
 * 切换功能三(大批量处理)的子标签页
 * 
 * @param {string} subTabId - 子标签页ID
 * @param {HTMLElement} clickedElement - 被点击的步骤元素
 */
function switchSubTab(subTabId, clickedElement) {
    const parent = getEl('large_batch-tab');
    parent.querySelectorAll(".sub-tab-content").forEach(el => el.classList.remove("active"));
    getEl(`sub-tab-${subTabId}`).classList.add("active");
    
    if (clickedElement) {
        const stepper = clickedElement.closest('.progress-stepper');
        updateStepperState(stepper, clickedElement);
    }

    // 当切换到generator子标签页时，确保功能三独立的模板选择器能够正确初始化
    if (subTabId === 'generator') {
        setTimeout(() => {
            // 确保DOM元素已渲染
            if (typeof updateTemplateSelector === 'function') {
                updateTemplateSelector();
                console.log('✅ 功能三generator子标签页切换，独立模板选择器已重新初始化');
            }
        }, 50);
    }

    // ▼▼▼ 新增的核心逻辑 ▼▼▼
    // 当切换到"解析报告"页签时，主动检查内存中是否有待处理的结果
    if (subTabId === 'reporter' && appState.batch.resultContent) {
        // 显示提示信息
        const repInfoBox = getEl('rep_info_box');
        if (repInfoBox) {
            repInfoBox.style.display = 'block';
        }
        // 解析内存中的JSONL数据并存入报告模块的状态
        if (typeof parseJsonl === 'function') {
            appState.reporter.jsonlData = parseJsonl(appState.batch.resultContent);
        }
        // 检查是否可以启用"生成报告"按钮
        if (typeof checkReporterReady === 'function') {
            checkReporterReady();
        }
    } else if(subTabId !== 'reporter') {
        // 确保离开报告页再回来时，如果内存数据已清除，提示框会隐藏
        // (虽然当前逻辑不会清除，但这是个好的防御性编程习惯)
        const repInfoBox = getEl('rep_info_box');
        if (repInfoBox) {
            repInfoBox.style.display = 'none';
        }
    }
    // ▲▲▲ 新增逻辑结束 ▲▲▲
}

/**
 * 切换功能四(本地专利库)的子标签页
 * 
 * @param {string} subTabId - 子标签页ID
 * @param {HTMLElement} clickedElement - 被点击的步骤元素
 */
function switchLPLSubTab(subTabId, clickedElement) {
    const parent = getEl('local_patent_lib-tab');
    parent.querySelectorAll(".sub-tab-content").forEach(el => el.classList.remove("active"));
    getEl(`lpl-sub-tab-${subTabId}`).classList.add("active");
    
    if (clickedElement) {
        const stepper = clickedElement.closest('.progress-stepper');
        updateStepperState(stepper, clickedElement);
    }
}

/**
 * 切换功能五(权利要求对比)的子标签页
 * 
 * @param {string} subTabId - 子标签页ID (manual 或 family)
 * @param {HTMLElement} clickedButton - 被点击的子标签按钮
 */
function switchClaimsComparisonSubTab(subTabId, clickedButton) {
    const parent = getEl('claims_comparison-tab');
    
    // 切换子标签按钮状态
    parent.querySelectorAll('.sub-tab-button').forEach(btn => btn.classList.remove('active'));
    if (clickedButton) {
        clickedButton.classList.add('active');
    }
    
    // 切换子标签内容
    parent.querySelectorAll('.sub-tab-content').forEach(el => el.classList.remove('active'));
    const targetContent = getEl(`${subTabId}-sub-tab`);
    if (targetContent) {
        targetContent.classList.add('active');
    }
    
    // 如果切换到同族专利对比子标签页，初始化该功能
    if (subTabId === 'family' && typeof initFamilyClaimsComparison === 'function') {
        setTimeout(() => {
            initFamilyClaimsComparison();
            console.log('✅ 同族权利要求对比功能已初始化');
        }, 50);
    }
}

// 导出函数供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        updateStepperState,
        switchTab,
        switchAsyncSubTab,
        switchSubTab,
        switchLPLSubTab,
        switchClaimsComparisonSubTab
    };
}
