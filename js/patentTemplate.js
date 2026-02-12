// =================================================================================
// 专利解读模板管理模块
// =================================================================================

// 预设模板定义
const PRESET_TEMPLATES = [
    {
        id: 'default',
        name: '默认模板',
        description: '包含技术领域、创新点、技术方案等6个标准字段',
        isPreset: true,
        fields: [
            { id: 'technical_field', name: '技术领域', description: '该专利所属的技术领域', type: 'text', required: true },
            { id: 'innovation_points', name: '创新点', description: '该专利的核心创新点和技术突破', type: 'text', required: true },
            { id: 'technical_solution', name: '技术方案', description: '该专利的技术实现方案和方法', type: 'text', required: true },
            { id: 'application_scenarios', name: '应用场景', description: '该专利的实际应用场景和用途', type: 'text', required: true },
            { id: 'advantages', name: '技术优势', description: '相比现有技术的优势和改进', type: 'text', required: true },
            { id: 'summary', name: '解读总结', description: '对该专利的综合评价和总结', type: 'text', required: true }
        ],
        systemPrompt: '你是一位资深的专利分析师，擅长从专利文本中提炼核心技术信息、分析技术价值。你必须使用中文输出所有分析结果，确保内容专业、准确、易懂。',
        userPromptTemplate: `请根据以下专利信息，按照指定的字段进行深入分析和解读：

专利号：{{patent_number}}
标题：{{title}}
摘要：{{abstract}}
{{claims}}
{{description}}

请严格按照以下JSON格式输出，不要添加任何其他说明或markdown标记：
{{json_fields}}

字段说明：
{{field_descriptions}}

重要提示：所有分析结果必须使用中文输出，确保内容专业、准确、易懂。`
    },
    {
        id: 'technical',
        name: '技术分析模板',
        description: '侧重技术细节和实现方案的深度分析',
        isPreset: true,
        fields: [
            { id: 'technical_field', name: '技术领域', description: '该专利所属的技术领域和分类', type: 'text', required: true },
            { id: 'technical_problem', name: '技术问题', description: '该专利要解决的核心技术问题', type: 'text', required: true },
            { id: 'technical_solution', name: '技术方案', description: '详细的技术实现方案和步骤', type: 'text', required: true },
            { id: 'key_technologies', name: '关键技术', description: '涉及的关键技术和核心算法', type: 'text', required: true },
            { id: 'technical_effects', name: '技术效果', description: '实现的技术效果和性能指标', type: 'text', required: true },
            { id: 'implementation_difficulty', name: '实现难度', description: '技术实现的难度和复杂度评估', type: 'text', required: false }
        ],
        systemPrompt: '你是一位技术专家，擅长深入分析专利的技术细节、实现方案和技术难点。'
    },
    {
        id: 'business',
        name: '商业价值模板',
        description: '侧重商业价值、市场分析和应用前景',
        isPreset: true,
        fields: [
            { id: 'market_positioning', name: '市场定位', description: '该专利在市场中的定位和目标市场', type: 'text', required: true },
            { id: 'application_scenarios', name: '应用场景', description: '具体的应用场景和使用案例', type: 'text', required: true },
            { id: 'market_demand', name: '市场需求', description: '市场需求分析和用户痛点', type: 'text', required: true },
            { id: 'competitive_advantage', name: '竞争优势', description: '相比竞品的竞争优势', type: 'text', required: true },
            { id: 'commercialization_potential', name: '商业化潜力', description: '商业化可行性和盈利潜力', type: 'text', required: true },
            { id: 'market_risks', name: '市场风险', description: '市场风险和挑战分析', type: 'text', required: false }
        ],
        systemPrompt: '你是一位商业分析师，擅长评估专利的商业价值、市场潜力和商业化前景。'
    },
    {
        id: 'legal',
        name: '法律分析模板',
        description: '侧重专利权利要求、保护范围和法律风险',
        isPreset: true,
        fields: [
            { id: 'protection_scope', name: '保护范围', description: '专利的保护范围和权利边界', type: 'text', required: true },
            { id: 'independent_claims', name: '独立权利要求', description: '独立权利要求的核心内容', type: 'text', required: true },
            { id: 'dependent_claims', name: '从属权利要求', description: '从属权利要求的补充保护', type: 'text', required: true },
            { id: 'patent_strength', name: '专利强度', description: '专利的稳定性和强度评估', type: 'text', required: true },
            { id: 'infringement_risks', name: '侵权风险', description: '潜在的侵权风险分析', type: 'text', required: false },
            { id: 'legal_status', name: '法律状态', description: '专利的法律状态和有效性', type: 'text', required: true }
        ],
        systemPrompt: '你是一位专利律师，擅长分析专利的法律保护范围、权利要求和法律风险。'
    }
];

// 初始化模板管理
function initPatentTemplate() {
    console.log('🔧 初始化专利解读模板管理...');
    console.log('📍 检查DOM元素是否存在...');
    
    const selector = getEl('patent_template_selector');
    if (!selector) {
        console.error('❌ 致命错误: patent_template_selector 元素不存在！');
        console.log('💡 提示: 请确保在功能六标签页中存在 id="patent_template_selector" 的 select 元素');
        return;
    }
    console.log('✅ patent_template_selector 元素已找到');
    
    // 初始化状态
    if (!appState.patentBatch) {
        console.log('📦 创建 appState.patentBatch 对象');
        appState.patentBatch = {};
    }
    if (!appState.patentBatch.customTemplates) {
        console.log('📦 初始化 customTemplates 数组');
        appState.patentBatch.customTemplates = [];
    }
    
    // 加载自定义模板
    console.log('📂 加载自定义模板...');
    loadCustomTemplates();
    
    // 初始化模板选择器
    console.log('🎨 初始化模板选择器...');
    updateTemplateSelector();
    
    // 绑定事件
    console.log('🔗 绑定事件监听器...');
    bindTemplateEvents();
    
    // 加载默认模板
    console.log('📖 加载默认模板...');
    loadTemplate('default');
    
    console.log('✅ 模板管理初始化完成，预设模板数量:', PRESET_TEMPLATES.length);
}

// 加载自定义模板
function loadCustomTemplates() {
    try {
        const stored = localStorage.getItem('patent_custom_templates');
        appState.patentBatch.customTemplates = stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('加载自定义模板失败:', e);
        appState.patentBatch.customTemplates = [];
    }
}

// 保存自定义模板
function saveCustomTemplates() {
    try {
        localStorage.setItem('patent_custom_templates', JSON.stringify(appState.patentBatch.customTemplates));
    } catch (e) {
        console.error('保存自定义模板失败:', e);
        alert('保存模板失败，请检查浏览器存储空间');
    }
}

// 更新模板选择器
function updateTemplateSelector() {
    const selector = getEl('patent_template_selector');
    if (!selector) {
        console.warn('⚠️ 模板选择器元素不存在: patent_template_selector，跳过更新');
        return;
    }
    
    console.log('🔄 开始更新模板选择器...');
    console.log('📋 预设模板数量:', PRESET_TEMPLATES.length);
    console.log('✏️ 自定义模板数量:', appState.patentBatch.customTemplates ? appState.patentBatch.customTemplates.length : 0);
    
    // 保存当前选中的值
    const currentValue = selector.value;
    
    selector.innerHTML = '';
    
    // 添加预设模板
    const presetGroup = document.createElement('optgroup');
    presetGroup.label = '📋 预设模板';
    PRESET_TEMPLATES.forEach(template => {
        const option = document.createElement('option');
        option.value = template.id;
        option.textContent = template.name;
        presetGroup.appendChild(option);
        console.log('  ✅ 添加预设模板:', template.name);
    });
    selector.appendChild(presetGroup);
    
    // 添加自定义模板
    if (appState.patentBatch.customTemplates && appState.patentBatch.customTemplates.length > 0) {
        const customGroup = document.createElement('optgroup');
        customGroup.label = '✏️ 自定义模板';
        appState.patentBatch.customTemplates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = template.name;
            customGroup.appendChild(option);
            console.log('  ✅ 添加自定义模板:', template.name);
        });
        selector.appendChild(customGroup);
    }
    
    // 恢复之前的选中值，如果存在的话
    if (currentValue && Array.from(selector.options).some(opt => opt.value === currentValue)) {
        selector.value = currentValue;
    } else {
        // 默认选中第一个预设模板
        selector.value = 'default';
    }
    
    console.log('✅ 模板选择器已更新，当前选中:', selector.value);
    console.log('📊 选择器选项总数:', selector.options.length);
}

// 绑定模板事件
function bindTemplateEvents() {
    const selector = getEl('patent_template_selector');
    const manageBtn = getEl('manage_template_btn');
    const saveBtn = getEl('patent_save_template_btn');
    const newBtn = getEl('patent_new_template_btn');
    const deleteBtn = getEl('patent_delete_template_btn');
    const exportBtn = getEl('patent_export_template_btn');
    const importBtn = getEl('patent_import_template_btn');
    const cancelBtn = getEl('cancel_edit_btn');
    const addFieldBtn = getEl('add_field_btn');
    
    if (selector) {
        selector.addEventListener('change', () => {
            loadTemplate(selector.value);
        });
    }
    
    if (manageBtn) {
        manageBtn.addEventListener('click', toggleTemplateEditor);
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', saveCurrentTemplate);
    }
    
    if (newBtn) {
        newBtn.addEventListener('click', createNewTemplate);
    }
    
    if (deleteBtn) {
        deleteBtn.addEventListener('click', deleteCurrentTemplate);
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', exportCurrentTemplate);
    }
    
    if (importBtn) {
        importBtn.addEventListener('click', () => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json';
            fileInput.onchange = importTemplate;
            fileInput.click();
        });
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            toggleTemplateEditor();
            loadTemplate(getEl('patent_template_selector').value);
        });
    }
    
    if (addFieldBtn) {
        addFieldBtn.addEventListener('click', () => addFieldToEditor());
    }
}

// 切换模板编辑器显示
function toggleTemplateEditor() {
    const editor = getEl('template_editor');
    if (!editor) return;
    
    if (editor.style.display === 'none' || editor.style.display === '') {
        editor.style.display = 'block';
        appState.patentBatch.isEditingTemplate = true;
        
        // 打开编辑器时，加载当前选中的模板
        const selector = getEl('patent_template_selector');
        if (selector && selector.value) {
            loadTemplate(selector.value);
        } else if (appState.patentBatch.currentTemplate) {
            loadTemplateToEditor(appState.patentBatch.currentTemplate);
        }
    } else {
        editor.style.display = 'none';
        appState.patentBatch.isEditingTemplate = false;
    }
}

// 加载模板
function loadTemplate(templateId) {
    console.log('📖 加载模板:', templateId);
    
    // 查找模板
    let template = PRESET_TEMPLATES.find(t => t.id === templateId);
    if (!template && appState.patentBatch.customTemplates) {
        template = appState.patentBatch.customTemplates.find(t => t.id === templateId);
    }
    
    if (!template) {
        console.error('❌ 模板不存在:', templateId);
        // 尝试加载默认模板
        if (templateId !== 'default') {
            console.log('🔄 尝试加载默认模板...');
            loadTemplate('default');
        }
        return;
    }
    
    // 保存当前模板
    appState.patentBatch.currentTemplate = template;
    console.log('✅ 模板已加载:', template.name, '字段数:', template.fields.length);
    
    // 如果编辑器打开，更新编辑器内容
    if (appState.patentBatch.isEditingTemplate) {
        loadTemplateToEditor(template);
    }
}

// 加载模板到编辑器
function loadTemplateToEditor(template) {
    const nameInput = getEl('template_name');
    const descInput = getEl('template_description');
    const systemPromptInput = getEl('template_system_prompt');
    const userPromptInput = getEl('template_user_prompt');
    const fieldsList = getEl('fields_list');

    if (nameInput) nameInput.value = template.name;
    if (descInput) descInput.value = template.description || '';
    if (systemPromptInput) systemPromptInput.value = template.systemPrompt || '';
    if (userPromptInput) userPromptInput.value = template.userPromptTemplate || '';

    if (fieldsList) {
        fieldsList.innerHTML = '';
        template.fields.forEach(field => {
            addFieldToEditor(field);
        });
    }

    // 预设模板不能删除，但可以编辑提示词
    const deleteBtn = getEl('delete_template_btn');
    if (deleteBtn) {
        deleteBtn.disabled = template.isPreset;
    }
}

// 添加字段到编辑器
function addFieldToEditor(field = null) {
    const fieldsList = getEl('fields_list');
    if (!fieldsList) return;
    
    const fieldId = field ? field.id : `field_${Date.now()}`;
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'field-config-item';
    fieldDiv.dataset.fieldId = fieldId;
    
    fieldDiv.innerHTML = `
        <input type="text" class="field-name" placeholder="字段名称" value="${field ? field.name : ''}" required>
        <input type="text" class="field-description" placeholder="字段描述（用于AI提示）" value="${field ? field.description : ''}" required>
        <button type="button" class="small-button delete-button" onclick="removeFieldFromEditor('${fieldId}')">删除</button>
    `;
    
    fieldsList.appendChild(fieldDiv);
}

// 从编辑器移除字段
function removeFieldFromEditor(fieldId) {
    const fieldDiv = document.querySelector(`[data-field-id="${fieldId}"]`);
    if (fieldDiv) {
        fieldDiv.remove();
    }
}

// 保存当前模板
function saveCurrentTemplate() {
    const nameInput = getEl('template_name');
    const descInput = getEl('template_description');
    const systemPromptInput = getEl('template_system_prompt');
    const userPromptInput = getEl('template_user_prompt');
    const fieldsList = getEl('fields_list');

    if (!nameInput || !descInput || !fieldsList) return;

    const name = nameInput.value.trim();
    const description = descInput.value.trim();
    const systemPrompt = systemPromptInput ? systemPromptInput.value.trim() : '';
    const userPromptTemplate = userPromptInput ? userPromptInput.value.trim() : '';

    if (!name) {
        alert('请输入模板名称');
        return;
    }

    // 收集字段
    const fields = [];
    const fieldItems = fieldsList.querySelectorAll('.field-config-item');

    for (const item of fieldItems) {
        const fieldName = item.querySelector('.field-name').value.trim();
        const fieldDesc = item.querySelector('.field-description').value.trim();

        if (!fieldName || !fieldDesc) {
            alert('请填写所有字段的名称和描述');
            return;
        }

        fields.push({
            id: item.dataset.fieldId,
            name: fieldName,
            description: fieldDesc,
            type: 'text',
            required: true
        });
    }

    if (fields.length === 0) {
        alert('请至少添加一个字段');
        return;
    }

    // 检查是否是编辑现有模板
    const currentTemplate = appState.patentBatch.currentTemplate;
    let templateId;

    // 获取默认系统提示词（如果用户没有输入）
    const defaultSystemPrompt = '你是一位资深的专利分析师，擅长从专利文本中提炼核心技术信息。';
    const finalSystemPrompt = systemPrompt || defaultSystemPrompt;

    if (currentTemplate && !currentTemplate.isPreset) {
        // 编辑现有自定义模板
        templateId = currentTemplate.id;
        const index = appState.patentBatch.customTemplates.findIndex(t => t.id === templateId);
        if (index !== -1) {
            appState.patentBatch.customTemplates[index] = {
                id: templateId,
                name,
                description,
                isPreset: false,
                fields,
                systemPrompt: finalSystemPrompt,
                userPromptTemplate: userPromptTemplate || undefined,
                updatedAt: new Date().toISOString()
            };
        }
    } else if (currentTemplate && currentTemplate.isPreset) {
        // 基于预设模板创建新的自定义模板（因为预设模板不能直接修改）
        templateId = `custom_${Date.now()}`;

        // 检查名称是否重复
        const allTemplates = [...PRESET_TEMPLATES, ...appState.patentBatch.customTemplates];
        if (allTemplates.some(t => t.name === name)) {
            alert('模板名称已存在，请使用其他名称');
            return;
        }

        const newTemplate = {
            id: templateId,
            name,
            description,
            isPreset: false,
            fields,
            systemPrompt: finalSystemPrompt,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // 只有当用户输入了自定义提示词模板时才保存
        if (userPromptTemplate) {
            newTemplate.userPromptTemplate = userPromptTemplate;
        }
        
        appState.patentBatch.customTemplates.push(newTemplate);

        alert('预设模板已另存为自定义模板，您可以继续编辑！');
    } else {
        // 创建新模板
        templateId = `custom_${Date.now()}`;

        // 检查名称是否重复
        const allTemplates = [...PRESET_TEMPLATES, ...appState.patentBatch.customTemplates];
        if (allTemplates.some(t => t.name === name)) {
            alert('模板名称已存在，请使用其他名称');
            return;
        }

        appState.patentBatch.customTemplates.push({
            id: templateId,
            name,
            description,
            isPreset: false,
            fields,
            systemPrompt: finalSystemPrompt,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }
    
    // 保存到localStorage
    saveCustomTemplates();
    
    // 更新选择器
    updateTemplateSelector();
    
    // 选中新保存的模板
    const selector = getEl('patent_template_selector');
    if (selector) {
        selector.value = templateId;
    }
    
    // 加载模板
    loadTemplate(templateId);
    
    alert('模板保存成功！');
}

// 创建新模板
function createNewTemplate() {
    const nameInput = getEl('template_name');
    const descInput = getEl('template_description');
    const systemPromptInput = getEl('template_system_prompt');
    const fieldsList = getEl('fields_list');

    if (nameInput) nameInput.value = '';
    if (descInput) descInput.value = '';
    if (systemPromptInput) systemPromptInput.value = '';
    if (fieldsList) fieldsList.innerHTML = '';

    // 添加一个默认字段
    addFieldToEditor();

    // 清空当前模板
    appState.patentBatch.currentTemplate = null;

    // 启用删除按钮
    const deleteBtn = getEl('delete_template_btn');
    if (deleteBtn) deleteBtn.disabled = true;
}

// 删除当前模板
function deleteCurrentTemplate() {
    const currentTemplate = appState.patentBatch.currentTemplate;
    
    if (!currentTemplate || currentTemplate.isPreset) {
        alert('预设模板不能删除');
        return;
    }
    
    if (!confirm(`确定要删除模板"${currentTemplate.name}"吗？`)) {
        return;
    }
    
    // 从列表中移除
    appState.patentBatch.customTemplates = appState.patentBatch.customTemplates.filter(
        t => t.id !== currentTemplate.id
    );
    
    // 保存到localStorage
    saveCustomTemplates();
    
    // 更新选择器
    updateTemplateSelector();
    
    // 切换到默认模板
    const selector = getEl('patent_template_selector');
    if (selector) {
        selector.value = 'default';
    }
    loadTemplate('default');
    
    alert('模板已删除');
}

// 导出当前模板
function exportCurrentTemplate() {
    const currentTemplate = appState.patentBatch.currentTemplate;
    
    if (!currentTemplate) {
        alert('请先选择一个模板');
        return;
    }
    
    const exportData = {
        ...currentTemplate,
        exportedAt: new Date().toISOString(),
        version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `专利解读模板_${currentTemplate.name}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
}

// 导入模板
function importTemplate(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const template = JSON.parse(e.target.result);
            
            // 验证模板格式
            if (!template.name || !template.fields || !Array.isArray(template.fields)) {
                throw new Error('模板格式不正确');
            }
            
            // 检查名称是否重复
            let name = template.name;
            const allTemplates = [...PRESET_TEMPLATES, ...appState.patentBatch.customTemplates];
            if (allTemplates.some(t => t.name === name)) {
                name = `${name}_导入_${Date.now()}`;
                alert(`模板名称重复，已重命名为：${name}`);
            }
            
            // 添加到自定义模板
            const newTemplate = {
                id: `custom_${Date.now()}`,
                name,
                description: template.description || '',
                isPreset: false,
                fields: template.fields,
                systemPrompt: template.systemPrompt || '你是一位资深的专利分析师。',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            appState.patentBatch.customTemplates.push(newTemplate);
            
            // 保存到localStorage
            saveCustomTemplates();
            
            // 更新选择器
            updateTemplateSelector();
            
            // 选中导入的模板
            const selector = getEl('patent_template_selector');
            if (selector) {
                selector.value = newTemplate.id;
            }
            loadTemplate(newTemplate.id);
            
            alert('模板导入成功！');
        } catch (error) {
            console.error('导入模板失败:', error);
            alert(`导入失败：${error.message}`);
        }
    };
    reader.readAsText(file);
}

// 构建解读提示词（基于模板）
function buildAnalysisPrompt(template, patentData, includeSpecification) {
    const fields = template.fields;

    // 调试日志
    console.log('🔍 buildAnalysisPrompt 调试信息:');
    console.log('  - patent_number:', patentData.patent_number);
    console.log('  - claims 类型:', typeof patentData.claims);
    console.log('  - claims 是否为数组:', Array.isArray(patentData.claims));
    console.log('  - claims 长度:', patentData.claims ? (Array.isArray(patentData.claims) ? patentData.claims.length : 'N/A') : 0);
    console.log('  - claims 内容预览:', patentData.claims ? (Array.isArray(patentData.claims) ? patentData.claims.slice(0, 2) : patentData.claims.substring(0, 100)) : '无');
    console.log('  - includeSpecification:', includeSpecification);
    console.log('  - description 是否存在:', !!patentData.description);

    // 构建字段说明
    const fieldDescriptions = fields.map(f => `- ${f.name}: ${f.description}`).join('\n');

    // 构建JSON格式要求
    const jsonFields = fields.map(f => `  "${f.id}": "[${f.description}]"`).join(',\n');

    // 处理权利要求文本
    let claimsText = '';
    if (patentData.claims) {
        if (Array.isArray(patentData.claims) && patentData.claims.length > 0) {
            claimsText = '权利要求：\n' + patentData.claims.join('\n\n');
        } else if (typeof patentData.claims === 'string' && patentData.claims.trim()) {
            claimsText = '权利要求：\n' + patentData.claims;
        }
    }

    // 处理说明书文本
    let descriptionText = '';
    if (includeSpecification && patentData.description) {
        descriptionText = '\n\n说明书：\n' + patentData.description;
    }

    // 如果模板有自定义的userPromptTemplate，使用它
    if (template.userPromptTemplate) {
        let prompt = template.userPromptTemplate;

        // 替换占位符
        prompt = prompt.replace(/\{\{patent_number\}\}/g, patentData.patent_number || '未知');
        prompt = prompt.replace(/\{\{title\}\}/g, patentData.title || '未知');
        prompt = prompt.replace(/\{\{abstract\}\}/g, patentData.abstract || '未知');
        prompt = prompt.replace(/\{\{claims\}\}/g, claimsText);
        prompt = prompt.replace(/\{\{description\}\}/g, descriptionText);
        prompt = prompt.replace(/\{\{json_fields\}\}/g, jsonFields);
        prompt = prompt.replace(/\{\{field_descriptions\}\}/g, fieldDescriptions);

        console.log('✅ 使用模板自定义userPromptTemplate');
        console.log('📝 最终提示词长度:', prompt.length);
        console.log('📝 提示词前500字符:', prompt.substring(0, 500));

        return prompt;
    }

    // 默认提示词构建（向后兼容）
    let patentContent = `专利号：${patentData.patent_number || '未知'}\n`;
    patentContent += `标题：${patentData.title || '未知'}\n`;
    patentContent += `摘要：${patentData.abstract || '未知'}\n`;

    if (claimsText) {
        patentContent += '\n' + claimsText;
        console.log('✅ 权利要求已添加到提示词');
    } else {
        console.log('⚠️ 权利要求文本为空');
    }

    if (descriptionText) {
        patentContent += descriptionText;
        console.log('✅ 说明书已添加到提示词');
    }

    const prompt = `请根据以下专利信息，按照指定的字段进行深入分析和解读：

${patentContent}

请严格按照以下JSON格式输出，不要添加任何其他说明或markdown标记：
{
${jsonFields}
}

字段说明：
${fieldDescriptions}

重要提示：所有分析结果必须使用中文输出，确保内容专业、准确、易懂。`;

    console.log('📝 最终提示词长度:', prompt.length);
    console.log('📝 提示词前500字符:', prompt.substring(0, 500));

    return prompt;
}

// 暴露到全局
globalThis.initPatentTemplate = initPatentTemplate;
globalThis.removeFieldFromEditor = removeFieldFromEditor;
globalThis.buildAnalysisPrompt = buildAnalysisPrompt;
