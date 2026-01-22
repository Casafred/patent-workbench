// js/aiDisclaimer.js
// AI生成内容提示声明工具函数

/**
 * 创建AI生成内容提示声明元素
 * @param {string} type - 类型: 'default' | 'compact' | 'inline'
 * @param {string} customText - 自定义文本（可选）
 * @returns {HTMLElement} 声明元素
 */
function createAIDisclaimer(type = 'default', customText = null) {
    const disclaimer = document.createElement('div');
    disclaimer.className = `ai-disclaimer ${type !== 'default' ? type : ''}`;
    
    const defaultTexts = {
        default: '<strong>AI生成内容：</strong>以下内容由人工智能生成，仅供参考，请结合实际情况判断使用。',
        compact: '<strong>AI生成：</strong>内容由AI生成，仅供参考。',
        inline: '<strong>AI生成</strong>'
    };
    
    const text = customText || defaultTexts[type] || defaultTexts.default;
    
    disclaimer.innerHTML = `
        <div class="ai-disclaimer-icon">AI</div>
        <div class="ai-disclaimer-text">${text}</div>
    `;
    
    return disclaimer;
}

/**
 * 在指定元素前插入AI声明
 * @param {HTMLElement|string} targetElement - 目标元素或选择器
 * @param {string} type - 声明类型
 * @param {string} customText - 自定义文本
 */
function insertAIDisclaimerBefore(targetElement, type = 'default', customText = null) {
    const target = typeof targetElement === 'string' 
        ? document.querySelector(targetElement) 
        : targetElement;
    
    if (!target) {
        console.warn('AI Disclaimer: Target element not found');
        return;
    }
    
    // 检查是否已存在声明，避免重复添加
    const existingDisclaimer = target.previousElementSibling;
    if (existingDisclaimer && existingDisclaimer.classList.contains('ai-disclaimer')) {
        return;
    }
    
    const disclaimer = createAIDisclaimer(type, customText);
    target.parentNode.insertBefore(disclaimer, target);
}

/**
 * 在指定元素后插入AI声明
 * @param {HTMLElement|string} targetElement - 目标元素或选择器
 * @param {string} type - 声明类型
 * @param {string} customText - 自定义文本
 */
function insertAIDisclaimerAfter(targetElement, type = 'default', customText = null) {
    const target = typeof targetElement === 'string' 
        ? document.querySelector(targetElement) 
        : targetElement;
    
    if (!target) {
        console.warn('AI Disclaimer: Target element not found');
        return;
    }
    
    // 检查是否已存在声明
    const existingDisclaimer = target.nextElementSibling;
    if (existingDisclaimer && existingDisclaimer.classList.contains('ai-disclaimer')) {
        return;
    }
    
    const disclaimer = createAIDisclaimer(type, customText);
    target.parentNode.insertBefore(disclaimer, target.nextElementSibling);
}

/**
 * 在容器内部顶部添加AI声明
 * @param {HTMLElement|string} containerElement - 容器元素或选择器
 * @param {string} type - 声明类型
 * @param {string} customText - 自定义文本
 */
function prependAIDisclaimer(containerElement, type = 'default', customText = null) {
    const container = typeof containerElement === 'string' 
        ? document.querySelector(containerElement) 
        : containerElement;
    
    if (!container) {
        console.warn('AI Disclaimer: Container element not found');
        return;
    }
    
    // 检查是否已存在声明
    const firstChild = container.firstElementChild;
    if (firstChild && firstChild.classList.contains('ai-disclaimer')) {
        return;
    }
    
    const disclaimer = createAIDisclaimer(type, customText);
    container.insertBefore(disclaimer, container.firstChild);
}

/**
 * 在容器内部底部添加AI声明
 * @param {HTMLElement|string} containerElement - 容器元素或选择器
 * @param {string} type - 声明类型
 * @param {string} customText - 自定义文本
 */
function appendAIDisclaimer(containerElement, type = 'default', customText = null) {
    const container = typeof containerElement === 'string' 
        ? document.querySelector(containerElement) 
        : containerElement;
    
    if (!container) {
        console.warn('AI Disclaimer: Container element not found');
        return;
    }
    
    // 检查是否已存在声明
    const lastChild = container.lastElementChild;
    if (lastChild && lastChild.classList.contains('ai-disclaimer')) {
        return;
    }
    
    const disclaimer = createAIDisclaimer(type, customText);
    container.appendChild(disclaimer);
}

/**
 * 移除所有AI声明
 * @param {HTMLElement|string} containerElement - 容器元素或选择器（可选）
 */
function removeAIDisclaimers(containerElement = null) {
    const container = containerElement 
        ? (typeof containerElement === 'string' 
            ? document.querySelector(containerElement) 
            : containerElement)
        : document;
    
    if (!container) return;
    
    const disclaimers = container.querySelectorAll('.ai-disclaimer');
    disclaimers.forEach(disclaimer => disclaimer.remove());
}
