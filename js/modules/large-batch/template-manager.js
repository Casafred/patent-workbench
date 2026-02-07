/**
 * 大批量处理 - 模板管理模块
 * 负责预置模板加载、自定义模板保存/删除/导入导出
 */

// 预置模板定义
const LARGE_BATCH_PRESET_TEMPLATES = [
    {
        id: 'preset_technical_analysis',
        name: '技术方案分析',
        systemPrompt: '你是一位资深的专利技术分析师。你的任务是基于专利内容，梳理总结其要解决的技术问题，采用的核心方案内容、以及实现的技术效果和最重要的核心关键词短语。',
        rules: '请分析此专利并按以下要求输出：',
        model: 'glm-4-flash',
        temperature: 0.3,
        outputFields: [
            { name: '技术方案', description: '总结专利的主要方案内容' },
            { name: '技术问题', description: '该专利主要解决的技术问题' },
            { name: '技术效果', description: '该专利带来的技术效果' },
            { name: '技术关键词', description: '按照重要程度输出15个关键词或短语' }
        ]
    },
    {
        id: 'preset_translation',
        name: '专利文本翻译',
        systemPrompt: '你是一个专业精通各技术领域术语的、精通多国语言的专利文本翻译引擎。你的任务是自动检测用户输入专利文本的语言并将其翻译成中文。请直接返回翻译后的文本，不要添加任何额外的解释或说明。',
        rules: '请翻译以下专利文本，确保术语准确、表达流畅：',
        model: 'glm-4-flash',
        temperature: 0.1,
        outputFields: [
            { name: 'translated_text', description: '翻译后的中文文本' }
        ]
    },
    {
        id: 'preset_claims_analysis',
        name: '权利要求分析',
        systemPrompt: '你是一位专业的专利代理师，擅长分析专利权利要求。你的任务是分析权利要求的技术特征、保护范围和与现有技术的区别。',
        rules: '请分析以下权利要求，提取关键信息：',
        model: 'glm-4-flash',
        temperature: 0.2,
        outputFields: [
            { name: '独立权利要求', description: '独立权利要求的技术方案总结' },
            { name: '从属权利要求', description: '从属权利要求的附加技术特征' },
            { name: '保护范围', description: '权利要求的保护范围分析' },
            { name: '创新点', description: '权利要求体现的创新点' }
        ]
    },
    {
        id: 'preset_landscape',
        name: '技术领域分析',
        systemPrompt: '你是一位技术领域分析专家。你的任务是分析专利所属的技术领域、技术发展趋势和潜在的应用场景。',
        rules: '请分析以下专利的技术领域信息：',
        model: 'glm-4-flash',
        temperature: 0.4,
        outputFields: [
            { name: '技术领域', description: '专利所属的技术领域' },
            { name: '发展趋势', description: '该技术领域的发展趋势' },
            { name: '应用场景', description: '潜在的应用场景' },
            { name: '竞争态势', description: '技术竞争态势分析' }
        ]
    },
    {
        id: 'preset_valuation',
        name: '专利价值评估',
        systemPrompt: '你是一位专利价值评估专家。你的任务是从技术价值、市场价值和法律价值三个维度评估专利的价值。',
        rules: '请评估以下专利的价值：',
        model: 'glm-4-flash',
        temperature: 0.3,
        outputFields: [
            { name: '技术价值', description: '技术创新程度评估' },
            { name: '市场价值', description: '市场应用前景评估' },
            { name: '法律价值', description: '权利稳定性评估' },
            { name: '综合评分', description: '综合价值评分(1-10)' }
        ]
    }
];

/**
 * 初始化模板管理器
 */
export function initTemplateManager() {
    console.log('🔧 初始化大批量处理模板管理器...');
    
    // 确保全局状态存在
    if (typeof window.appState === 'undefined') {
        console.log('⚠️ window.appState 不存在，创建新对象');
        window.appState = {};
    }
    
    // 初始化状态
    if (!window.appState.largeBatch) {
        window.appState.largeBatch = {};
    }
    if (!window.appState.largeBatch.customTemplates) {
        window.appState.largeBatch.customTemplates = [];
    }
    if (!window.appState.largeBatch.currentOutputFields) {
        window.appState.largeBatch.currentOutputFields = [];
    }
    
    // 加载自定义模板
    loadCustomTemplates();
    
    // 初始化模型选择器
    initModelSelector();
    
    // 初始化预设模板选择器
    initPresetTemplateSelector();
    
    // 绑定事件
    bindTemplateEvents();
    
    // 渲染模板列表
    renderTemplatesList();
    
    console.log('✅ 模板管理器初始化完成');
}

/**
 * 初始化模型选择器
 * 由于大批量处理组件是动态加载的，需要手动初始化
 */
function initModelSelector() {
    const modelSelect = document.getElementById('api-model');
    if (!modelSelect) {
        console.warn('⚠️ 模型选择器不存在');
        return;
    }
    
    // 获取可用模型列表（从全局变量或默认值）
    const models = window.AVAILABLE_MODELS || ["glm-4-flashX-250414", "glm-4-flash", "glm-4-long", "GLM-4.7-Flash"];
    
    const currentValue = modelSelect.value;
    modelSelect.innerHTML = models.map(m => `<option value="${m}">${m}</option>`).join('');
    
    // 恢复之前的选择或设置默认值
    if (currentValue && models.includes(currentValue)) {
        modelSelect.value = currentValue;
    } else {
        modelSelect.value = models[0];
    }
    
    console.log('✅ 大批量处理模型选择器已初始化');
}

/**
 * 初始化预设模板选择器
 */
function initPresetTemplateSelector() {
    const selector = document.getElementById('large_batch_preset_template_select');
    if (!selector) {
        console.warn('⚠️ 预设模板选择器不存在');
        return;
    }
    
    selector.innerHTML = '<option value="">选择预置模板或新建</option>';
    
    // 添加预置模板选项
    LARGE_BATCH_PRESET_TEMPLATES.forEach(template => {
        const option = document.createElement('option');
        option.value = template.id;
        option.textContent = `${template.name} [预设]`;
        option.dataset.isPreset = 'true';
        selector.appendChild(option);
    });
    
    // 添加自定义模板选项
    if (window.appState.largeBatch.customTemplates.length > 0) {
        window.appState.largeBatch.customTemplates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = template.name;
            selector.appendChild(option);
        });
    }
    
    console.log('✅ 预设模板选择器已初始化');
}

/**
 * 加载自定义模板
 */
function loadCustomTemplates() {
    try {
        const stored = localStorage.getItem('large_batch_custom_templates');
        if (stored) {
            window.appState.largeBatch.customTemplates = JSON.parse(stored);
            console.log(`📂 加载了 ${window.appState.largeBatch.customTemplates.length} 个自定义模板`);
        }
    } catch (e) {
        console.error('❌ 加载自定义模板失败:', e);
        window.appState.largeBatch.customTemplates = [];
    }
}

/**
 * 保存自定义模板到 localStorage
 */
function saveCustomTemplates() {
    try {
        localStorage.setItem(
            'large_batch_custom_templates',
            JSON.stringify(window.appState.largeBatch.customTemplates)
        );
        console.log('✅ 自定义模板已保存');
    } catch (e) {
        console.error('❌ 保存自定义模板失败:', e);
        alert('保存模板失败，请检查浏览器存储空间');
    }
}

/**
 * 绑定模板事件
 */
function bindTemplateEvents() {
    // 预设模板选择器变化
    const presetSelect = document.getElementById('large_batch_preset_template_select');
    if (presetSelect) {
        presetSelect.addEventListener('change', handlePresetTemplateChange);
    }
    
    // 保存模板按钮
    const saveBtn = document.getElementById('large_batch_save_template_btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveCurrentTemplate);
    }
    
    // 删除模板按钮
    const deleteBtn = document.getElementById('large_batch_delete_template_btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', deleteCurrentTemplate);
    }
    
    // 导出模板按钮
    const exportBtn = document.getElementById('large_batch_export_template_btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportCurrentTemplate);
    }
    
    // 导入模板按钮
    const importBtn = document.getElementById('large_batch_import_template_btn');
    const fileInput = document.getElementById('large_batch_template_file_input');
    if (importBtn && fileInput) {
        importBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleTemplateImport);
    }
    
    console.log('✅ 模板事件已绑定');
}

/**
 * 处理预设模板选择变化
 */
function handlePresetTemplateChange() {
    const selector = document.getElementById('large_batch_preset_template_select');
    const templateId = selector.value;
    
    if (!templateId) {
        // 清空表单，准备新建
        clearTemplateForm();
        return;
    }
    
    // 查找模板（先查预设，再查自定义）
    let template = LARGE_BATCH_PRESET_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
        template = window.appState.largeBatch.customTemplates.find(t => t.id === templateId);
    }
    
    if (template) {
        loadTemplateToForm(template);
    }
}

/**
 * 加载模板到表单
 */
function loadTemplateToForm(template) {
    // 模板名称
    const nameInput = document.getElementById('large_batch_template_name');
    if (nameInput) nameInput.value = template.name || '';
    
    // 系统提示
    const systemPrompt = document.getElementById('api-system-prompt');
    if (systemPrompt) systemPrompt.value = template.systemPrompt || '';
    
    // 规则要求
    const rules = document.getElementById('prompt-rules');
    if (rules) rules.value = template.rules || '';
    
    // 模型
    const model = document.getElementById('api-model');
    if (model && template.model) model.value = template.model;
    
    // 温度
    const temperature = document.getElementById('api-temperature');
    if (temperature && template.temperature !== undefined) {
        temperature.value = template.temperature;
    }
    
    // 输出字段
    if (template.outputFields) {
        window.appState.largeBatch.currentOutputFields = [...template.outputFields];
        renderOutputFields();
    }
    
    console.log('✅ 模板已加载到表单:', template.name);
}

/**
 * 清空模板表单
 */
function clearTemplateForm() {
    const nameInput = document.getElementById('large_batch_template_name');
    if (nameInput) nameInput.value = '';
    
    const systemPrompt = document.getElementById('api-system-prompt');
    if (systemPrompt) systemPrompt.value = '你是一个高效的专利文本分析助手。';
    
    const rules = document.getElementById('prompt-rules');
    if (rules) rules.value = '';
    
    const temperature = document.getElementById('api-temperature');
    if (temperature) temperature.value = 0.1;
    
    window.appState.largeBatch.currentOutputFields = [];
    renderOutputFields();
}

/**
 * 保存当前配置为模板
 */
function saveCurrentTemplate() {
    const name = document.getElementById('large_batch_template_name')?.value.trim();
    
    if (!name) {
        alert('请输入模板名称');
        return;
    }
    
    // 检查是否已存在同名模板
    const existingPreset = LARGE_BATCH_PRESET_TEMPLATES.find(t => t.name === name);
    const existingCustom = window.appState.largeBatch.customTemplates.find(t => t.name === name);
    
    if (existingPreset) {
        alert('该名称与预置模板重复，请使用其他名称');
        return;
    }
    
    if (existingCustom) {
        if (!confirm('已存在同名模板，是否覆盖？')) {
            return;
        }
        // 删除旧的
        window.appState.largeBatch.customTemplates = window.appState.largeBatch.customTemplates.filter(t => t.name !== name);
    }
    
    // 收集当前配置
    const template = {
        id: `custom_${Date.now()}`,
        name: name,
        systemPrompt: document.getElementById('api-system-prompt')?.value || '',
        rules: document.getElementById('prompt-rules')?.value || '',
        model: document.getElementById('api-model')?.value || 'glm-4-flash',
        temperature: parseFloat(document.getElementById('api-temperature')?.value) || 0.1,
        outputFields: collectOutputFields()
    };
    
    // 保存到自定义模板
    window.appState.largeBatch.customTemplates.push(template);
    saveCustomTemplates();
    
    // 更新选择器和列表
    initPresetTemplateSelector();
    renderTemplatesList();
    
    // 选中新模板
    const selector = document.getElementById('large_batch_preset_template_select');
    if (selector) selector.value = template.id;
    
    alert('模板已保存！');
    console.log('✅ 模板已保存:', template.name);
}

/**
 * 删除当前选中的模板
 */
function deleteCurrentTemplate() {
    const selector = document.getElementById('large_batch_preset_template_select');
    const templateId = selector?.value;
    
    if (!templateId) {
        alert('请先选择要删除的模板');
        return;
    }
    
    // 检查是否为预置模板
    if (LARGE_BATCH_PRESET_TEMPLATES.some(t => t.id === templateId)) {
        alert('预置模板不能删除');
        return;
    }
    
    // 查找模板
    const template = window.appState.largeBatch.customTemplates.find(t => t.id === templateId);
    if (!template) {
        alert('模板不存在');
        return;
    }
    
    if (!confirm(`确定要删除模板"${template.name}"吗？`)) {
        return;
    }
    
    // 删除模板
    window.appState.largeBatch.customTemplates = window.appState.largeBatch.customTemplates.filter(t => t.id !== templateId);
    saveCustomTemplates();
    
    // 更新界面
    initPresetTemplateSelector();
    renderTemplatesList();
    clearTemplateForm();
    
    alert('模板已删除');
    console.log('✅ 模板已删除:', template.name);
}

/**
 * 导出当前选中的模板
 */
function exportCurrentTemplate() {
    const selector = document.getElementById('large_batch_preset_template_select');
    const templateId = selector?.value;
    
    if (!templateId) {
        alert('请先选择要导出的模板');
        return;
    }
    
    // 查找模板
    let template = LARGE_BATCH_PRESET_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
        template = window.appState.largeBatch.customTemplates.find(t => t.id === templateId);
    }
    
    if (!template) {
        alert('模板不存在');
        return;
    }
    
    // 导出为 JSON
    const dataStr = JSON.stringify(template, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${template.name}_模板_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    console.log('✅ 模板已导出:', template.name);
}

/**
 * 处理模板导入
 */
function handleTemplateImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const template = JSON.parse(e.target.result);
            
            // 验证模板格式
            if (!template.name || !template.systemPrompt) {
                throw new Error('模板格式不正确，缺少必要字段');
            }
            
            // 生成新 ID
            template.id = `custom_${Date.now()}`;
            
            // 检查名称冲突
            const existingPreset = LARGE_BATCH_PRESET_TEMPLATES.find(t => t.name === template.name);
            const existingCustom = window.appState.largeBatch.customTemplates.find(t => t.name === template.name);
            
            if (existingPreset || existingCustom) {
                template.name = `${template.name}_导入${Date.now()}`;
            }
            
            // 添加到自定义模板
            window.appState.largeBatch.customTemplates.push(template);
            saveCustomTemplates();
            
            // 更新界面
            initPresetTemplateSelector();
            renderTemplatesList();
            
            // 选中导入的模板
            const selector = document.getElementById('large_batch_preset_template_select');
            if (selector) {
                selector.value = template.id;
                loadTemplateToForm(template);
            }
            
            alert('模板导入成功！');
            console.log('✅ 模板已导入:', template.name);
        } catch (error) {
            console.error('❌ 导入模板失败:', error);
            alert('导入失败：' + error.message);
        }
    };
    reader.readAsText(file);
    
    // 清空文件输入
    event.target.value = '';
}

/**
 * 渲染模板列表
 */
function renderTemplatesList() {
    const container = document.getElementById('large_batch_templates_list');
    if (!container) return;
    
    const templates = window.appState.largeBatch.customTemplates;
    
    if (templates.length === 0) {
        container.innerHTML = '<div class="info" style="padding:10px">暂无自定义模板</div>';
        return;
    }
    
    container.innerHTML = templates.map(t => `
        <div class="list-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px;">
            <span><strong>${t.name}</strong> (模型: ${t.model}, 温度: ${t.temperature})</span>
            <button class="icon-button delete-button" onclick="deleteLargeBatchTemplate('${t.id}')" title="删除">🗑️</button>
        </div>
    `).join('');
}

/**
 * 删除模板（供外部调用）
 */
window.deleteLargeBatchTemplate = function(templateId) {
    const template = window.appState.largeBatch.customTemplates.find(t => t.id === templateId);
    if (!template) return;
    
    if (!confirm(`确定要删除模板"${template.name}"吗？`)) {
        return;
    }
    
    window.appState.largeBatch.customTemplates = window.appState.largeBatch.customTemplates.filter(t => t.id !== templateId);
    saveCustomTemplates();
    
    initPresetTemplateSelector();
    renderTemplatesList();
    
    // 如果当前选中的是被删除的模板，清空表单
    const selector = document.getElementById('large_batch_preset_template_select');
    if (selector && selector.value === templateId) {
        selector.value = '';
        clearTemplateForm();
    }
    
    console.log('✅ 模板已删除:', template.name);
};

/**
 * 收集输出字段
 */
function collectOutputFields() {
    return window.appState.largeBatch.currentOutputFields || [];
}

/**
 * 渲染输出字段
 */
function renderOutputFields() {
    const container = document.getElementById('output-fields-container');
    if (!container) return;
    
    const fields = window.appState.largeBatch.currentOutputFields || [];
    
    if (fields.length === 0) {
        container.innerHTML = '<div class="info" style="padding: 10px;">暂无输出字段，请点击"添加输出字段"按钮添加。</div>';
        return;
    }
    
    container.innerHTML = '';
    fields.forEach((field, index) => {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'output-field-item';
        fieldDiv.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
        
        fieldDiv.innerHTML = `
            <input type="text" class="field-name-input" placeholder="字段名（英文）" value="${field.name || ''}" 
                   style="flex: 1; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px;"
                   onchange="updateLargeBatchOutputField(${index}, 'name', this.value)">
            <input type="text" class="field-desc-input" placeholder="字段描述（中文）" value="${field.description || ''}"
                   style="flex: 2; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px;"
                   onchange="updateLargeBatchOutputField(${index}, 'description', this.value)">
            <button type="button" class="remove-field-btn small-button delete-button" onclick="removeLargeBatchOutputField(${index})">删除</button>
        `;
        
        container.appendChild(fieldDiv);
    });
}

/**
 * 更新输出字段
 */
window.updateLargeBatchOutputField = function(index, prop, value) {
    if (window.appState.largeBatch.currentOutputFields[index]) {
        window.appState.largeBatch.currentOutputFields[index][prop] = value;
    }
};

/**
 * 删除输出字段
 */
window.removeLargeBatchOutputField = function(index) {
    if (confirm('确定删除此字段吗？')) {
        window.appState.largeBatch.currentOutputFields.splice(index, 1);
        renderOutputFields();
    }
};

/**
 * 添加输出字段（供外部调用）
 */
window.addLargeBatchOutputField = function(name = '', description = '') {
    if (!window.appState.largeBatch.currentOutputFields) {
        window.appState.largeBatch.currentOutputFields = [];
    }
    
    window.appState.largeBatch.currentOutputFields.push({
        name: name || `字段${window.appState.largeBatch.currentOutputFields.length + 1}`,
        description: description || ''
    });
    
    renderOutputFields();
};

/**
 * 获取当前配置
 */
export function getCurrentConfig() {
    return {
        name: document.getElementById('large_batch_template_name')?.value || '',
        systemPrompt: document.getElementById('api-system-prompt')?.value || '',
        rules: document.getElementById('prompt-rules')?.value || '',
        model: document.getElementById('api-model')?.value || 'glm-4-flash',
        temperature: parseFloat(document.getElementById('api-temperature')?.value) || 0.1,
        outputFields: collectOutputFields()
    };
}

/**
 * 获取所有预置模板
 */
export function getPresetTemplates() {
    return LARGE_BATCH_PRESET_TEMPLATES;
}

/**
 * 获取所有自定义模板
 */
export function getCustomTemplates() {
    return window.appState.largeBatch.customTemplates || [];
}

// 导出给全局使用
window.largeBatchTemplateManager = {
    init: initTemplateManager,
    getConfig: getCurrentConfig,
    getPresetTemplates: getPresetTemplates,
    getCustomTemplates: getCustomTemplates,
    addOutputField: window.addLargeBatchOutputField,
    renderOutputFields: renderOutputFields
};
