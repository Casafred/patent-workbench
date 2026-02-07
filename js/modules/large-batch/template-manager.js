/**
 * 大批量处理 - 配置管理模块
 * 负责API参数配置、输出字段管理
 */

/**
 * 初始化配置管理器
 */
export function initTemplateManager() {
    console.log('🔧 初始化大批量处理配置管理器...');
    
    // 确保全局状态存在
    if (typeof window.appState === 'undefined') {
        console.log('⚠️ window.appState 不存在，创建新对象');
        window.appState = {};
    }
    
    // 初始化状态
    if (!window.appState.largeBatch) {
        window.appState.largeBatch = {};
    }
    
    // 初始化模型选择器
    initModelSelector();
    
    // 绑定事件
    bindConfigEvents();
    
    console.log('✅ 配置管理器初始化完成');
}

/**
 * 初始化模型选择器
 */
function initModelSelector() {
    const modelSelect = document.getElementById('api-model');
    if (!modelSelect) {
        console.warn('⚠️ 模型选择器元素不存在');
        return;
    }
    
    // 定义可用模型列表
    const models = [
        { value: 'glm-4-flash', name: 'GLM-4-Flash (快速)' },
        { value: 'glm-4', name: 'GLM-4 (标准)' },
        { value: 'glm-4-plus', name: 'GLM-4-Plus (增强)' },
        { value: 'gpt-3.5-turbo', name: 'GPT-3.5-Turbo' },
        { value: 'gpt-4', name: 'GPT-4' },
        { value: 'gpt-4-turbo', name: 'GPT-4-Turbo' }
    ];
    
    modelSelect.innerHTML = '';
    models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.value;
        option.textContent = model.name;
        modelSelect.appendChild(option);
    });
    
    // 默认选择 glm-4-flash
    modelSelect.value = 'glm-4-flash';
    
    console.log('✅ 模型选择器已初始化');
}

/**
 * 绑定配置事件
 */
function bindConfigEvents() {
    // 这里可以添加配置变更的监听事件
    console.log('✅ 配置事件已绑定');
}

/**
 * 获取当前配置
 */
export function getCurrentConfig() {
    const systemPrompt = document.getElementById('api-system-prompt')?.value || '';
    const rules = document.getElementById('prompt-rules')?.value || '';
    const model = document.getElementById('api-model')?.value || 'glm-4-flash';
    const temperature = parseFloat(document.getElementById('api-temperature')?.value) || 0.1;
    
    return {
        systemPrompt,
        rules,
        model,
        temperature,
        outputFields: collectOutputFields()
    };
}

/**
 * 收集输出字段
 */
function collectOutputFields() {
    const container = document.getElementById('output-fields-container');
    if (!container) return [];
    
    const fields = [];
    const fieldDivs = container.querySelectorAll('.output-field-item');
    
    fieldDivs.forEach(div => {
        const nameInput = div.querySelector('.field-name-input');
        const descInput = div.querySelector('.field-desc-input');
        if (nameInput && descInput && nameInput.value.trim()) {
            fields.push({
                name: nameInput.value.trim(),
                description: descInput.value.trim()
            });
        }
    });
    
    return fields;
}

/**
 * 设置配置
 */
export function setConfig(config) {
    if (!config) return;
    
    // 系统提示
    const systemPrompt = document.getElementById('api-system-prompt');
    if (systemPrompt && config.systemPrompt) {
        systemPrompt.value = config.systemPrompt;
    }
    
    // 规则要求
    const rules = document.getElementById('prompt-rules');
    if (rules && config.rules) {
        rules.value = config.rules;
    }
    
    // 模型
    const model = document.getElementById('api-model');
    if (model && config.model) {
        model.value = config.model;
    }
    
    // 温度
    const temperature = document.getElementById('api-temperature');
    if (temperature && config.temperature !== undefined) {
        temperature.value = config.temperature;
    }
    
    // 输出字段
    if (config.outputFields && config.outputFields.length > 0) {
        const container = document.getElementById('output-fields-container');
        if (container) {
            container.innerHTML = '';
        }
        
        config.outputFields.forEach(field => {
            if (window.largeBatchCore && window.largeBatchCore.addOutputField) {
                window.largeBatchCore.addOutputField(field.name, field.description);
            }
        });
    }
}

/**
 * 重置配置为默认值
 */
export function resetConfig() {
    const defaultConfig = {
        systemPrompt: '你是一个高效的专利文本分析助手。',
        rules: '',
        model: 'glm-4-flash',
        temperature: 0.1,
        outputFields: [
            { name: 'summary', description: '分析摘要' },
            { name: 'key_points', description: '关键要点' }
        ]
    };
    
    setConfig(defaultConfig);
    console.log('✅ 配置已重置为默认值');
}

// 导出给全局使用
window.largeBatchTemplateManager = {
    init: initTemplateManager,
    getConfig: getCurrentConfig,
    setConfig: setConfig,
    resetConfig: resetConfig
};
