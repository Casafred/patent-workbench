// =================================================================================
// 功能三: 大批量处理 (无修改，保持原样)
// =================================================================================
// 初始化函数 - 全局暴露以确保在main.js中可被调用
globalThis.initLargeBatch = function() {
    initGenerator();
    initBatchWorkflow();
    initReporter();
    switchSubTab('generator', document.querySelector('#large_batch-tab .sub-tab-button'));
}

// 注意：updateTemplateSelector函数将在定义后再全局暴露

function initGenerator() {
    // Get all required DOM elements first
    const genFileInput = getEl('gen_file-input');
    const genSheetSelector = getEl('gen_sheet-selector');
    const columnCountInput = getEl('column-count');
    const genGenerateBtn = getEl('gen_generate-btn');
    const genDownloadBtn = getEl('gen_download-btn');
    const templateFileInput = getEl('template_file_input');
    
    // 模型选择器现在由 state.js 的 updateAllModelSelectors() 统一管理
    if (genFileInput) {
        genFileInput.addEventListener('change', handleGenFile);
    } else {
        console.warn('⚠️ gen_file-input element not found');
    }
    
    if (genSheetSelector) {
        genSheetSelector.addEventListener('change', e => loadGenSheet(e.target.value));
    }
    
    if (columnCountInput) {
        columnCountInput.addEventListener('input', () => { updateColumnSelectors(); updateContentInsertionPreview(); });
    }
    
    if (genGenerateBtn) {
        genGenerateBtn.addEventListener('click', generateJsonl);
    }
    
    if (genDownloadBtn) {
        genDownloadBtn.addEventListener('click', downloadJsonl);
    }

    // ▼▼▼ 功能三独立模板选择器：在运行时重新获取元素 ▼▼▼
    const templateSelectorElement = getEl('large_batch_template_selector');
    if (templateSelectorElement) {
        templateSelectorElement.addEventListener('change', function() {
            loadTemplate(this.value);
        });
        console.log('✅ large_batch_template_selector 事件监听器已绑定');
    } else {
        console.error('❌ large_batch_template_selector 元素不存在，无法绑定事件');
    }
    // ▲▲▲ 功能三独立模板选择器结束 ▲▲▲

    const saveTemplateBtn = getEl('save_template_btn');
    const deleteTemplateBtn = getEl('delete_template_btn');
    const exportTemplateBtn = getEl('export_template_btn');
    const importTemplateBtn = getEl('import_template_btn');
    const addOutputFieldBtn = getEl('add-output-field-btn');
    
    if (saveTemplateBtn) {
        saveTemplateBtn.addEventListener('click', saveTemplate);
    }
    
    if (deleteTemplateBtn) {
        deleteTemplateBtn.addEventListener('click', deleteTemplate);
    }
    
    if (exportTemplateBtn) {
        exportTemplateBtn.addEventListener('click', exportTemplate);
    }
    
    if (importTemplateBtn && templateFileInput) {
        importTemplateBtn.addEventListener('click', () => templateFileInput.click());
        templateFileInput.addEventListener('change', importTemplate);
    }
    
    if (addOutputFieldBtn) {
        addOutputFieldBtn.addEventListener('click', () => addOutputField());
    }

    // 初始化模板 - 这是关键！
    initTemplates();
}

function handleGenFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 获取所有需要的DOM元素
    const genSheetSelector = getEl('gen_sheet-selector');
    const columnConfigContainer = getEl('column-config-container');
    const genGenerateBtn = getEl('gen_generate-btn');
    const genPreviewOutput = getEl('gen_preview_output');
    const genDownloadBtn = getEl('gen_download-btn');
    const genReadyInfo = getEl('gen_ready_info');
    
    // 清除之前的数据
    appState.generator.workbook = null;
    appState.generator.currentSheetData = null;
    appState.generator.columnHeaders = [];
    
    if (genSheetSelector) {
        genSheetSelector.innerHTML = '';
        genSheetSelector.style.display = 'none';
    }
    
    if (columnConfigContainer) {
        columnConfigContainer.style.display = 'none';
    }
    
    if (genGenerateBtn) {
        genGenerateBtn.disabled = true;
    }
    
    if (genPreviewOutput) {
        genPreviewOutput.style.display = 'none';
    }
    
    if (genDownloadBtn) {
        genDownloadBtn.style.display = 'none';
    }
    
    if (genReadyInfo) {
        genReadyInfo.style.display = 'none';
    }
    
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = new Uint8Array(e.target.result);
            appState.generator.workbook = XLSX.read(data, { type: 'array' });
            if (genSheetSelector) {
                genSheetSelector.innerHTML = '';
                appState.generator.workbook.SheetNames.forEach(name => {
                    genSheetSelector.innerHTML += `<option value="${name}">${name}</option>`;
                });
                genSheetSelector.style.display = 'inline-block';
                loadGenSheet(appState.generator.workbook.SheetNames[0]);
            }
        } catch (err) { alert('无法解析文件，请确保是有效的Excel文件。'); console.error(err); }
    };
    reader.readAsArrayBuffer(file);
    
    // 关键修改：重置文件输入值，允许重复上传同名文件
    event.target.value = '';
}

function loadGenSheet(sheetName) {
    const worksheet = appState.generator.workbook.Sheets[sheetName];
    appState.generator.currentSheetData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
    
    const genGenerateBtn = getEl('gen_generate_btn');
    const columnConfigContainer = getEl('column_config_container');
    
    if (genGenerateBtn) {
        genGenerateBtn.disabled = !appState.generator.currentSheetData || appState.generator.currentSheetData.length === 0;
    }
    
    if (appState.generator.currentSheetData.length > 0) {
        appState.generator.columnHeaders = Object.keys(appState.generator.currentSheetData[0]);
        if (columnConfigContainer) {
            columnConfigContainer.style.display = 'block';
        }
        updateColumnSelectors();
    } else {
        if (columnConfigContainer) {
            columnConfigContainer.style.display = 'none';
        }
    }
}

function updateColumnSelectors() {
    const columnConfigArea = getEl('column-config-area');
    const columnCountInput = getEl('column-count');
    
    if (!columnConfigArea || !columnCountInput) {
        console.error('❌ Required elements not found for updateColumnSelectors');
        return;
    }
    
    columnConfigArea.innerHTML = '';
    const count = parseInt(columnCountInput.value, 10);
    for (let i = 1; i <= count; i++) {
        const div = document.createElement('div');
        div.className = 'config-item row-flex';
        div.innerHTML = `<label for="column-selector-${i}">配置列 ${i}:</label><div style="flex-grow:1;"><select id="column-selector-${i}" class="column-selector">${appState.generator.columnHeaders.map(h => `<option value="${h}">${h}</option>`).join('')}</select></div>`;
        columnConfigArea.appendChild(div);
        const select = div.querySelector('select');
        select.addEventListener('change', updateContentInsertionPreview);
        if (appState.generator.columnHeaders.length >= i) select.value = appState.generator.columnHeaders[i - 1];
    }
    updateContentInsertionPreview();
}

function updateContentInsertionPreview() {
    const selectors = document.querySelectorAll('.column-selector');
    const contentInsertionPreview = getEl('content-insertion-preview');
    
    if (!contentInsertionPreview) {
        console.error('❌ content-insertion-preview element not found');
        return;
    }
    
    let placeholders = Array.from(selectors).map((sel, i) => `{${sel.value || `配置列${i+1}`}}`);
    contentInsertionPreview.textContent = `专利内容如下：\n${placeholders.join('\n\n')}`;
}

function buildUserPrompt() {
    const promptRules = getEl('prompt-rules');
    
    if (!promptRules) {
        console.error('❌ prompt-rules element not found');
        return '请分析以下专利内容：\n\n{内容}';
    }
    
    const rules = promptRules.value.trim();
    const contentInsertionTemplate = "专利内容如下：\n" + Array.from(document.querySelectorAll('.column-selector')).map(sel => `{${sel.value}}`).join('\n\n');
    const outputFields = getOutputFieldsFromUI();
    let outputFormat = "";

    if (outputFields.length > 0) {
        const jsonFields = outputFields.map(f => `  "${f.name}": "[${f.desc}]"`).join(',\n');
        outputFormat = `请严格按照以下JSON格式输出，不要添加任何其他说明或markdown标记：\n{\n${jsonFields}\n}`;
    }

    // ▼▼▼ 修复：确保返回格式符合API规范 ▼▼▼
    const parts = [rules, contentInsertionTemplate.trim(), outputFormat].filter(Boolean);
    return parts.length > 0 ? parts.join('\n\n') : '请分析以下专利内容：\n\n{内容}';
    // ▲▲▲ 修复结束 ▲▲▲
}

function loadTemplateUI(template) {
    if (!template) return;
    
    const apiSystemInput = getEl('api-system-prompt');
    const promptRules = getEl('prompt-rules');
    const outputFieldsContainer = getEl('output-fields-container');
    
    if (apiSystemInput) {
        apiSystemInput.value = template.system || '';
    }
    
    if (typeof template.user === 'string') {
        if (promptRules) {
            promptRules.value = template.user;
        }
        if (outputFieldsContainer) {
            outputFieldsContainer.innerHTML = '';
        }
    } else if (template.user && typeof template.user === 'object') {
        if (promptRules) {
            promptRules.value = template.user.rules || '';
        }
        if (outputFieldsContainer) {
            outputFieldsContainer.innerHTML = '';
            if(template.user.outputFields) template.user.outputFields.forEach(f => addOutputField(f.name, f.desc));
        }
    }
}

function generateJsonl() {
    if (!appState.generator.currentSheetData) return;
    
    const userPromptTemplate = buildUserPrompt();
    const selectedColumns = Array.from(document.querySelectorAll('.column-selector')).map(sel => sel.value);
    
    const apiModelSelect = getEl('api-model');
    const apiSystemInput = getEl('api-system-prompt');
    const apiTempInput = getEl('api-temperature');
    const genPreviewOutput = getEl('gen_preview_output');
    const genDownloadBtn = getEl('gen_download-btn');
    const genReadyInfo = getEl('gen_ready_info');
    
    if (!apiModelSelect || !apiSystemInput || !apiTempInput) {
        console.error('❌ Required API elements not found for generateJsonl');
        return;
    }
    
    const requests = appState.generator.currentSheetData.map((row, index) => {
        let finalUserPrompt = userPromptTemplate;
        selectedColumns.forEach(colName => { finalUserPrompt = finalUserPrompt.replace(new RegExp(`{${colName}}`, 'g'), row[colName] || ''); });
        return { "custom_id": `request-${index + 1}`, "method": "POST", "url": "/v4/chat/completions", "body": { model: apiModelSelect.value, messages: [{ role: 'system', content: apiSystemInput.value }, { role: 'user', content: finalUserPrompt }], temperature: parseFloat(apiTempInput.value) } };
    });
    appState.batch.jsonlContent = requests.map(JSON.stringify).join('\n');
    
    if (genPreviewOutput) {
        genPreviewOutput.style.display = 'block';
        genPreviewOutput.innerHTML = requests.slice(0, 3).map(req => JSON.stringify(req, null, 2).replace(/</g, '&lt;')).join('<hr style="border-color: var(--border-color); margin: 10px 0;">');
    }
    
    if (genDownloadBtn) {
        genDownloadBtn.style.display = 'inline-block';
    }
    
    if (genReadyInfo) {
        genReadyInfo.style.display = 'block';
    }
}

function addOutputField(name = '', desc = '') {
    const outputFieldsContainer = getEl('output-fields-container');
    
    if (!outputFieldsContainer) {
        console.error('❌ output-fields-container element not found');
        return;
    }
    
    const fieldId = `field-${Date.now()}`;
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'output-field';
    fieldDiv.style = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
    fieldDiv.id = fieldId;
    fieldDiv.innerHTML = `<input type="text" class="output-field-name" placeholder="字段名" value="${name}" style="flex-grow: 1;"><input type="text" class="output-field-desc" placeholder="字段描述" value="${desc}" style="flex-grow: 2;"><button type="button" class="small-button delete-button" onclick="document.getElementById('${fieldId}').remove()">删除</button>`;
    outputFieldsContainer.appendChild(fieldDiv);
}

function getOutputFieldsFromUI() {
    return Array.from(document.querySelectorAll('.output-field')).map(div => ({ name: div.querySelector('.output-field-name').value.trim(), desc: div.querySelector('.output-field-desc').value.trim() })).filter(f => f.name);
}

function downloadJsonl(){
    if(!appState.batch.jsonlContent)return;
    const blob = new Blob([appState.batch.jsonlContent],{type:"application/jsonl"});
    const a = document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="batch_requests.jsonl";
    a.click();
    URL.revokeObjectURL(a.href);
}

// 注意：已删除重复的loadTemplateUI函数，保留第239行的版本
// 该函数已在文件上方定义，包含正确的getEl调用和null检查

function updateTemplateSelector(retryCount = 0) {
    // ▼▼▼ 功能三独立模板选择器：在函数内部重新获取元素 ▼▼▼
    const templateSelectorElement = getEl('large_batch_template_selector');

    // 检查模板选择器元素是否存在
    if (!templateSelectorElement) {
        if (retryCount < 3) {
            // 如果元素未找到，且重试次数未超过3次，则延迟重试
            console.log(`⏳ large_batch_template_selector 元素未找到，${500}ms后重试 (${retryCount + 1}/3)`);
            setTimeout(() => updateTemplateSelector(retryCount + 1), 500);
            return;
        } else {
            console.error('❌ large_batch_template_selector 元素不存在，已达到最大重试次数');
            console.trace('堆栈跟踪:');
            return;
        }
    }

    console.log('✅ 找到 large_batch_template_selector 元素');
    // ▲▲▲ 功能三独立模板选择器结束 ▲▲▲

    // 检查appState和相关属性是否存在
    if (typeof appState === 'undefined' || !appState.generator) {
        console.warn('⚠️ appState.generator 不存在');
        return;
    }

    // 确保预设模板和自定义模板数组存在
    if (!appState.generator.presetTemplates) {
        appState.generator.presetTemplates = [];
    }

    if (!appState.generator.customTemplates) {
        appState.generator.customTemplates = [];
    }

    // 保存当前选中的值
    const selectedValue = templateSelectorElement.value;

    // 清空选择器
    templateSelectorElement.innerHTML = '';

    // 添加默认选项
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '选择预置模板或新建';
    templateSelectorElement.appendChild(defaultOption);

    // ▼▼▼ 改进：添加预设模板时，同时输出日志便于调试 ▼▼▼
    if (appState.generator.presetTemplates.length > 0) {
        console.log('✅ 正在添加预设模板：', appState.generator.presetTemplates.map(t => t.name));
        appState.generator.presetTemplates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.name;
            option.textContent = template.name + ' [预设]';
            templateSelectorElement.appendChild(option);
        });
    } else {
        console.warn('⚠️ 没有预设模板可以添加');
    }
    // ▲▲▲ 改进结束 ▲▲▲

    // 添加自定义模板
    if (appState.generator.customTemplates.length > 0) {
        console.log('✅ 正在添加自定义模板：', appState.generator.customTemplates.map(t => t.name));
        appState.generator.customTemplates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.name;
            option.textContent = template.name;
            templateSelectorElement.appendChild(option);
        });
    }

    // 保持选中状态
    if (selectedValue) {
        templateSelectorElement.value = selectedValue;
    }

    console.log(`✅ 模板选择器已初始化，共 ${templateSelectorElement.options.length} 个选项`);
}

// 全局暴露updateTemplateSelector函数，以便在main.js中调用
globalThis.updateTemplateSelector = updateTemplateSelector;

function initTemplates() {
    console.log('🔄 initTemplates() 开始执行...');
    
    // 加载自定义模板
    appState.generator.customTemplates = JSON.parse(localStorage.getItem('custom_templates') || '[]');
    console.log('✅ 自定义模板加载完成，数量:', appState.generator.customTemplates.length);

    // ▼▼▼ 修复：检查并初始化预设模板 ▼▼▼
    console.log('📋 当前预设模板数量:', appState.generator.presetTemplates ? appState.generator.presetTemplates.length : 0);
    if (!appState.generator.presetTemplates || appState.generator.presetTemplates.length === 0) {
        console.warn('⚠️ appState.generator.presetTemplates 为空，使用备用模板');
        appState.generator.presetTemplates = [
            { name: "专利文本翻译", isPreset: true, system: "你是一个专业精通各技术领域术语的、精通多国语言的专利文本翻译引擎。你的任务是自动检测用户输入专利文本的语言并将其翻译成中文。请直接返回翻译后的文本，不要添加任何额外的解释或说明。你必须严格遵循输出格式要求。", user: { rules: "请基于以下文本，直接输出翻译后的内容。\n要求：\n1. 结果必须是直接的翻译后中文文本，必须忠实于原文不得臆测，并选择贴合技术领域的专业术语表达", outputFields: [] }},
            { name: "技术方案解读", isPreset: true, system: "你是一位资深的专利技术分析师。你的任务是基于专利内容，梳理总结其要解决的技术问题，采用的核心方案内容、以及实现的技术效果和最重要的核心关键词短语。", user: { rules: "请分析此专利并按以下JSON格式输出：", outputFields: [ { name: "技术方案", desc: "此处填写技术方案，总结专利的主要方案内容" }, { name: "技术问题", desc: "此处填写该专利可能主要解决的技术问题" }, { name: "技术效果", desc: "此处填写该专利可能带来的技术效果" }, { name: "技术关键词", desc: "此处按照专利文本中构成核心方案的重要程度输出15个关键词或短语" }] }},
            { name: "技术文本翻译", isPreset: true, system: "你是一个专业精通各技术领域术语的、精通多国语言的翻译引擎。你的任务是自动检测用户输入文本的语言并将其翻译成中文。请直接返回翻译后的文本，不要添加任何额外的解释或说明。", user: { rules: "请翻译以下文本：", outputFields: [] }},
            { name: "检索词拓展", isPreset: true, system: "你是一个专业的专利检索分析师。你的任务是根据用户提供的关键词，生成相关的拓展检索词。请确保生成的检索词与原关键词相关且具有多样性，能够覆盖不同的表达方式和相关领域。", user: { rules: "请为以下关键词生成10个相关的拓展检索词：", outputFields: [] }},
            { name: "技术文本总结", isPreset: true, system: "你是一位资深的技术分析师。你的任务是基于提供的技术文本，总结其核心内容、技术要点和关键数据。请保持总结简洁明了，不超过200字。", user: { rules: "请总结以下技术文本的核心内容（不超过200字）：", outputFields: [] }}
        ];
    }
    console.log('✅ 预设模板准备完成，数量:', appState.generator.presetTemplates.length);
    // ▲▲▲ 修复结束 ▲▲▲

    // 更新模板选择器 - 延迟执行以确保DOM已准备好
    // 调用本地定义的updateTemplateSelector函数，避免与patentTemplate.js中的函数冲突
    console.log('⏳ 延迟100ms后更新模板选择器...');
    setTimeout(() => {
        console.log('🔄 调用 updateTemplateSelector()...');
        updateTemplateSelector();
    }, 100);

    // 加载默认模板（第一个预设模板）
    if (appState.generator.presetTemplates && appState.generator.presetTemplates.length > 0) {
        const defaultTemplate = appState.generator.presetTemplates[0];
        if (defaultTemplate) {
            console.log('✅ 加载默认模板:', defaultTemplate.name);
            loadTemplateUI(defaultTemplate);
        }
    }
    
    console.log('✅ initTemplates() 执行完成');
}

function loadTemplate(templateId) {
    // ▼▼▼ 功能三独立模板选择器：在函数内部重新获取元素 ▼▼▼
    const templateSelectorElement = getEl('large_batch_template_selector');
    // ▲▲▲ 功能三独立模板选择器结束 ▲▲▲

    // 获取所需的DOM元素
    const apiSystemInput = getEl('api-system-prompt');
    const promptRules = getEl('prompt-rules');
    const outputFieldsContainer = getEl('output-fields-container');

    // 如果没有传入templateId，从选择器获取
    if (!templateId) {
        if (templateSelectorElement) {
            templateId = templateSelectorElement.value;
        } else {
            console.error('❌ 无法获取模板ID');
            return;
        }
    }

    // 处理空选项
    if (!templateId) {
        // 重置表单为默认状态
        if (apiSystemInput) {
            apiSystemInput.value = '你是一个高效的专利文本分析助手。';
        }
        if (promptRules) {
            promptRules.value = '';
        }
        if (outputFieldsContainer) {
            outputFieldsContainer.innerHTML = '';
        }
        return;
    }

    console.log('尝试加载模板:', templateId);
    console.log('预设模板数量:', appState.generator.presetTemplates.length);
    console.log('自定义模板数量:', appState.generator.customTemplates.length);

    // 改进模板查找逻辑，使其更加健壮
    let template = null;

    // 首先尝试精确匹配
    template = [...appState.generator.presetTemplates, ...appState.generator.customTemplates].find(t => t.name === templateId);

    // 如果精确匹配失败，尝试模糊匹配
    if (!template) {
        console.log('精确匹配失败，尝试模糊匹配');
        template = [...appState.generator.presetTemplates, ...appState.generator.customTemplates].find(t =>
            t.name.toLowerCase().includes(templateId.toLowerCase()) ||
            templateId.toLowerCase().includes(t.name.toLowerCase())
        );
    }

    // 如果仍然找不到模板，使用第一个预设模板
    if (!template && appState.generator.presetTemplates.length > 0) {
        console.log('模糊匹配失败，使用第一个预设模板');
        template = appState.generator.presetTemplates[0];
    }

    if (!template) {
        console.error('模板不存在:', templateId);
        console.error('可用模板列表:', [...appState.generator.presetTemplates, ...appState.generator.customTemplates].map(t => t.name));
        return;
    }

    console.log('成功找到模板:', template.name);
    loadTemplateUI(template);
}

function saveTemplate() {
    const name = prompt("请输入新模板的名称:", `自定义模板_${new Date().toISOString().slice(0, 10)}`);
    if (!name || !name.trim()) return;
    if ([...appState.generator.presetTemplates, ...appState.generator.customTemplates].some(t => t.name === name)) return alert("错误：该模板名称已存在！");
    const template = { name: name.trim(), system: apiSystemInput.value, user: { rules: promptRules.value, outputFields: getOutputFieldsFromUI() } };
    appState.generator.customTemplates.push(template);
    localStorage.setItem('custom_templates', JSON.stringify(appState.generator.customTemplates));
    updateTemplateSelector();

    // ▼▼▼ 功能三独立模板选择器：重新获取元素来设置选中值 ▼▼▼
    const templateSelectorElement = getEl('large_batch_template_selector');
    if (templateSelectorElement) {
        templateSelectorElement.value = name;
    }
    // ▲▲▲ 功能三独立模板选择器结束 ▲▲▲

    alert("模板已保存！");
}

function deleteTemplate() {
    // ▼▼▼ 功能三独立模板选择器：重新获取元素 ▼▼▼
    const templateSelectorElement = getEl('large_batch_template_selector');
    if (!templateSelectorElement) {
        alert("错误：无法访问模板选择器。");
        return;
    }
    const selectedName = templateSelectorElement.value;
    // ▲▲▲ 功能三独立模板选择器结束 ▲▲▲

    const template = appState.generator.customTemplates.find(t => t.name === selectedName);
    if (!template) return alert("错误：只能删除自定义模板。");
    if (confirm(`确定要删除模板 "${selectedName}" 吗？`)) {
        appState.generator.customTemplates = appState.generator.customTemplates.filter(t => t.name !== selectedName);
        localStorage.setItem('custom_templates', JSON.stringify(appState.generator.customTemplates));
        initTemplates();
        alert("模板已删除！");
    }
}

function exportTemplate() {
    // ▼▼▼ 功能三独立模板选择器：重新获取元素 ▼▼▼
    const templateSelectorElement = getEl('large_batch_template_selector');
    if (!templateSelectorElement) {
        alert("错误：无法访问模板选择器。");
        return;
    }
    const selectedName = templateSelectorElement.value;
    // ▲▲▲ 功能三独立模板选择器结束 ▲▲▲

    const template = [...appState.generator.presetTemplates, ...appState.generator.customTemplates].find(t => t.name === selectedName);
    if (!template) return alert("请先选择一个要导出的模板");
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${template.name.replace(/[\/\\?%*:|"<>]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
}

function importTemplate(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const t = JSON.parse(e.target.result);
            if (!t.name || !t.system || !t.user) throw new Error("模板文件格式不正确。");
            let newName = t.name;
            if ([...appState.generator.presetTemplates, ...appState.generator.customTemplates].some(temp => temp.name === newName)) {
                newName = `${t.name}_imported_${Date.now()}`;
                alert(`模板名称冲突，已重命名为 "${newName}"`);
            }
            t.name = newName;
            delete t.isPreset;
            appState.generator.customTemplates.push(t);
            localStorage.setItem('custom_templates', JSON.stringify(appState.generator.customTemplates));
            updateTemplateSelector();

            // ▼▼▼ 功能三独立模板选择器：重新获取元素来设置选中值 ▼▼▼
            const templateSelectorElement = getEl('large_batch_template_selector');
            if (templateSelectorElement) {
                templateSelectorElement.value = newName;
                loadTemplate();
            }
            // ▲▲▲ 功能三独立模板选择器结束 ▲▲▲

            alert("模板导入成功！");
        } catch (err) { alert(`导入失败: ${err.message}`); }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function initBatchWorkflow() {
    // Get all required DOM elements first
    const btnUpload = getEl('btn_upload');
    const btnCreate = getEl('btn_create');
    const btnCheck = getEl('btn_check');
    const btnDownload = getEl('btn_download');
    const btnStopCheck = getEl('btn_stop_check');
    const btnRecover = getEl('btn_recover');
    
    // Add event listeners with null checks
    if (btnUpload) {
        btnUpload.addEventListener('click', runStep1_Upload);
    }
    if (btnCreate) {
        btnCreate.addEventListener('click', runStep2_Create);
    }
    if (btnCheck) {
        btnCheck.addEventListener('click', runStep3_Check);
    }
    if (btnDownload) {
        btnDownload.addEventListener('click', runStep3_Download);
    }
    if (btnStopCheck) {
        btnStopCheck.addEventListener('click', stopAutoCheck);
    }
    if (btnRecover) {
        btnRecover.addEventListener('click', recoverBatchState);
    }
}

function addLog(message,type="info"){
    // 获取batchLog元素
    const batchLog = getEl('batch_log');
    if (!batchLog) {
        console.error('❌ batch_log元素不存在，无法添加日志');
        return;
    }
    
    if (batchLog.textContent === '等待操作...') batchLog.innerHTML = '';
    const logEntry = document.createElement("div");
    logEntry.className = `info ${type}`;
    logEntry.style.marginBottom = '8px';
    logEntry.innerHTML = `<span style="color: var(--text-color-secondary); margin-right: 10px;">[${new Date().toLocaleTimeString()}]</span> ${message}`;
    batchLog.appendChild(logEntry);
    batchLog.scrollTop = batchLog.scrollHeight;
}

async function runStep1_Upload(){
    addLog("开始执行步骤1：上传请求文件...");
    if(!appState.batch.jsonlContent) return addLog("错误：请先在【1. 生成请求文件】中生成内容。","error");
    
    // 获取所需的DOM元素
    const btnUpload = getEl('btn_upload');
    const btnCreate = getEl('btn_create');
    const btnCheck = getEl('btn_check');
    const btnDownload = getEl('btn_download');
    const batchIdReminder = getEl('batch_id_reminder');
    
    if (btnUpload) {
        btnUpload.disabled = true;
    }
    
    try {
        const data = await apiCall("/upload", { jsonlContent: appState.batch.jsonlContent, fileName: `patent_requests_${Date.now()}.jsonl` });
        appState.batch.fileId = data.fileId;
        addLog(`成功: ${data.message}`,"success");
        addLog(`获取到 File ID: ${appState.batch.fileId}`);
        
        if (btnCreate) btnCreate.disabled = false;
        if (btnCheck) btnCheck.disabled = true;
        if (btnDownload) btnDownload.disabled = true;
        if (batchIdReminder) batchIdReminder.style.display = "none";
        
        stopAutoCheck();
        
        // 自动发起batch请求
        addLog("自动发起批处理任务...");
        setTimeout(() => runStep2_Create(), 500);
    } catch(e) { addLog(`错误: ${e.message}`, "error"); } finally { 
        if (btnUpload) btnUpload.disabled = false;
    }
}

async function runStep2_Create(){
    addLog("开始执行步骤2：创建Batch任务...");
    if(!appState.batch.fileId) return addLog("错误：File ID 缺失。","error");
    
    // 获取所需的DOM元素
    const btnCreate = getEl('btn_create');
    const btnCheck = getEl('btn_check');
    const btnDownload = getEl('btn_download');
    const batchIdReminder = getEl('batch_id_reminder');
    
    if (btnCreate) {
        btnCreate.disabled = true;
    }
    
    try {
        const data = await apiCall("/create_batch",{ fileId: appState.batch.fileId });
        appState.batch.batchId = data.id;
        addLog("成功: Batch任务创建成功！","success");
        addLog(`获取到 Batch ID: ${appState.batch.batchId}`);
        
        if (batchIdReminder) {
            batchIdReminder.innerHTML=`<strong>任务已创建！请务必记录您的 Batch ID: <span style="user-select:all; background: #eee; padding: 2px 6px;">${appState.batch.batchId}</span></strong>`;
            batchIdReminder.style.display = "block";
        }
        
        addLog(`任务初始状态: ${data.status}`);
        
        if (btnCheck) btnCheck.disabled = false;
        if (btnDownload) btnDownload.disabled = true;
        
        startAutoCheck();
    } catch(e) { addLog(`错误: ${e.message}`, "error"); } finally { 
        if (btnCreate) btnCreate.disabled = false;
    }
}

async function runStep3_Check(){
    addLog("正在检查任务状态...");
    if(!appState.batch.batchId) { addLog("错误：Batch ID 缺失，无法检查状态。","error"); stopAutoCheck(); return; }
    
    // 获取所需的DOM元素
    const btnCheck = getEl('btn_check');
    const btnDownload = getEl('btn_download');
    const autoCheckStatusEl = getEl('auto_check_status');
    
    if (btnCheck) {
        btnCheck.disabled = true;
    }
    
    try {
        const data = await apiCall(`/check_status`, { batchId: appState.batch.batchId });

        // ▼▼▼ 核心修改：解析并格式化进度信息 ▼▼▼
        let progressInfo = '';
        if (data.request_counts) {
            const { total, completed, failed } = data.request_counts;
            // 只有在total > 0时显示进度，避免初始状态下显示 "0/0"
            if (total > 0) {
                 progressInfo = ` | 进度: ${completed} / ${total} (成功: ${completed}, 失败: ${failed})`;
            }
        }
        
        // 更新日志
        addLog(`任务状态: <strong style="color: var(--primary-color-dark)">${data.status.toUpperCase()}</strong>${progressInfo}`);
        
        // 更新自动检查状态栏的显示
        if (appState.batch.autoCheckTimer && autoCheckStatusEl) {
             autoCheckStatusEl.textContent = `检查中... [${data.status}]${progressInfo}`;
        }
        // ▲▲▲ 修改结束 ▲▲▲

        if(data.status === "completed"){
            appState.batch.outputFileId = data.output_file_id;
            addLog(`任务完成! Output File ID: ${data.output_file_id}`,"success");
            if (btnDownload) btnDownload.disabled = false;
            stopAutoCheck();
            // (可选) 任务完成后自动触发下载
            addLog("检测到任务已完成，将在2秒后自动获取结果...");
            setTimeout(() => runStep3_Download(), 2000);
        } else if(["failed","expired","cancelling","cancelled"].includes(data.status)){
            addLog(`任务终止。状态: ${data.status.toUpperCase()}`,"error");
            stopAutoCheck();
        }
    } catch(e) { addLog(`检查状态时发生错误: ${e.message}`, "error"); } finally { 
        if (btnCheck) btnCheck.disabled = false;
    }
}

async function runStep3_Download(){
    addLog("开始执行步骤3：获取结果内容...");
    if(!appState.batch.outputFileId) return addLog("错误：Output File ID 缺失。","error");
    
    // 获取所需的DOM元素
    const btnDownload = getEl('btn_download');
    const repInfoBox = getEl('rep_info_box');
    
    if (btnDownload) {
        btnDownload.disabled = true;
    }
    
    try {
        // 【修改1】为了清晰，将变量名从 data 改为 response
        const response = await apiCall(`/download_result`, { fileId: appState.batch.outputFileId });
        
        // 【修改2-核心修复】使用 await response.text() 来正确获取文件内容
        appState.batch.resultContent = await response.text(); 
        
        // 现在 appState.batch.resultContent 中已经有了正确的JSONL字符串
        addLog("成功: 已将结果文件内容加载到浏览器内存中！","success");
        
        if(appState.batch.resultContent) { 
            // 这部分代码现在可以正常执行了
            appState.reporter.jsonlData = parseJsonl(appState.batch.resultContent);
            addLog("已自动将结果内容加载到解析器中！","success");
            
            // 【优化】在切换前就显示提示框，体验更好
            if (repInfoBox) {
                repInfoBox.style.display = 'block';
            }
        }
        
        addLog("正在自动切换到【3. 解析报告】...");
        
        const reporterStepElement = document.querySelector('#large-batch-stepper .step-item[onclick*="reporter"]');
        switchSubTab('reporter', reporterStepElement);
        
        // 因为 appState.reporter.jsonlData 已被正确赋值，这个检查现在会通过
        checkReporterReady();

    } catch(e) { 
        addLog(`错误: 获取结果文件失败: ${e.message}`, "error"); 
    } finally { 
        if (btnDownload) {
            btnDownload.disabled = false;
        }
    }
}

function startAutoCheck(){
    stopAutoCheck();
    addLog("已启动自动状态检查（每分钟一次）。");
    
    // 获取所需的DOM元素
    const autoCheckContainer = getEl('auto_check_container');
    const autoCheckStatusEl = getEl('auto_check_status');
    
    if (autoCheckContainer) {
        autoCheckContainer.style.display = "block";
    }
    if (autoCheckStatusEl) {
        autoCheckStatusEl.textContent = "自动检查已激活，等待首次查询...";
    }
    
    runStep3_Check();
    appState.batch.autoCheckTimer = setInterval(runStep3_Check, 60000);
}

function stopAutoCheck(){
    if(appState.batch.autoCheckTimer){
        clearInterval(appState.batch.autoCheckTimer);
        appState.batch.autoCheckTimer = null;
        
        // 获取所需的DOM元素
        const autoCheckStatusEl = getEl('auto_check_status');
        const autoCheckContainer = getEl('auto_check_container');
        
        if (autoCheckStatusEl) {
            autoCheckStatusEl.textContent = "自动检查已停止。";
        }
        
        addLog("自动检查已停止。");
        
        if (autoCheckContainer) {
            setTimeout(() => { autoCheckContainer.style.display="none" }, 3000);
        }
    }
}

async function recoverBatchState(){
    // 获取所需的DOM元素
    const recoverIdInput = getEl('recover_id_input');
    const btnCheck = getEl('btn_check');
    
    if (!recoverIdInput) {
        console.error('❌ recover_id_input元素不存在');
        return addLog("错误：无法获取恢复ID输入框。","error");
    }
    
    const recoverId = recoverIdInput.value.trim();
    if(!recoverId) return addLog("错误：请输入要恢复的 Batch ID。","error");
    addLog(`正在尝试恢复 Batch ID: ${recoverId}...`);
    appState.batch.batchId = recoverId;
    
    if (btnCheck) {
        btnCheck.disabled = false;
    }
    
    // 直接检查状态并获取outputFileId，而不是依赖日志文本
    let taskCompleted = false;
    try {
        const data = await apiCall(`/check_status`, { batchId: recoverId });
        addLog(`任务状态: <strong style="color: var(--primary-color-dark)">${data.status.toUpperCase()}</strong>`);
        
        if(data.status === "completed"){
            appState.batch.outputFileId = data.output_file_id;
            addLog(`任务已完成! Output File ID: ${data.output_file_id}`,"success");
            taskCompleted = true;
        }
    } catch(e) {
        addLog(`检查状态时发生错误: ${e.message}`, "error");
    }
    
    // 如果任务已完成，自动下载结果文件
    if(taskCompleted && appState.batch.outputFileId) {
        addLog("检测到任务已完成，将在2秒后自动获取结果...");
        setTimeout(() => runStep3_Download(), 2000);
    } else {
        // 否则启动自动检查或只启用手动检查按钮
        if (btnCheck) {
            btnCheck.disabled = false;
        }
        startAutoCheck();
    }
}

function initReporter() {
    // Get all required DOM elements first
    const repExcelInput = getEl('rep_excel_input');
    const repSheetSelector = getEl('rep_sheet_selector');
    const repJsonlInput = getEl('rep_jsonl_input');
    const repGenerateBtn = getEl('rep_generate_btn');
    const repDownloadBtn = getEl('rep_download_btn');
    
    // Add event listeners with null checks
    if (repExcelInput) {
        repExcelInput.addEventListener('change', handleReporterExcel);
    }
    if (repSheetSelector) {
        repSheetSelector.addEventListener('change', e => loadReporterSheet(e.target.value));
    }
    if (repJsonlInput) {
        repJsonlInput.addEventListener('change', handleReporterJsonl);
    }
    if (repGenerateBtn) {
        repGenerateBtn.addEventListener('click', parseAndGenerateReport);
    }
    if (repDownloadBtn) {
        repDownloadBtn.addEventListener('click', downloadFinalReport);
    }
}

function handleReporterExcel(event){
    const file = event.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = new Uint8Array(e.target.result);
            appState.reporter.workbook = XLSX.read(data, {type:"array"});
            repSheetSelector.innerHTML = "";
            appState.reporter.workbook.SheetNames.forEach(name => { repSheetSelector.innerHTML += `<option value="${name}">${name}</option>`; });
            repSheetSelector.style.display="block";
            loadReporterSheet(appState.reporter.workbook.SheetNames[0]);
        } catch (err) { alert('无法解析文件，请确保是有效的Excel文件。'); }
    };
    reader.readAsArrayBuffer(file);
}

function loadReporterSheet(sheetName){
    const worksheet = appState.reporter.workbook.Sheets[sheetName];
    appState.reporter.sheetData = XLSX.utils.sheet_to_json(worksheet,{defval:""});
    checkReporterReady();
}

function handleReporterJsonl(event){
    const file = event.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = e => { appState.reporter.jsonlData = parseJsonl(e.target.result); checkReporterReady(); };
    reader.readAsText(file);
}

function parseJsonl(content){
    if(!content) return [];
    return content.trim().split("\n").map(line => { try { return JSON.parse(line) } catch(e) { console.error("Failed to parse JSONL line:", line); return null } }).filter(item => item);
}

function checkReporterReady(){
    repGenerateBtn.disabled = !(appState.reporter.sheetData && appState.reporter.jsonlData && appState.reporter.jsonlData.length > 0);
}

function parseAndGenerateReport() {
    if (!appState.reporter.sheetData || !appState.reporter.jsonlData) return alert("请先上传原始Excel和结果JSONL文件。");
    const resultMap = new Map(appState.reporter.jsonlData.map(item => [item.custom_id, item?.response?.body?.choices?.[0]?.message?.content?.trim()]));
    const allGeneratedHeaders = new Set();
    appState.reporter.finalOutputData = appState.reporter.sheetData.map((row, index) => {
        const newRow = { ...row };
        const ai_content = resultMap.get(`request-${index + 1}`);
        if (ai_content) {
            try {
                const jsonMatch = ai_content.match(/```json\s*([\s\S]*?)\s*```|({[\s\S]*})/);
                if (!jsonMatch) throw new Error("No JSON block found");
                const jsonString = jsonMatch[1] || jsonMatch[2];
                const ai_json = JSON.parse(jsonString);
                Object.keys(ai_json).forEach(key => {
                    newRow[key] = (typeof ai_json[key] === 'object') ? JSON.stringify(ai_json[key]) : ai_json[key];
                    allGeneratedHeaders.add(key);
                });
            } catch (e) { newRow['AI原始返回'] = ai_content; allGeneratedHeaders.add('AI原始返回'); }
        }
        return newRow;
    });
    if (appState.reporter.finalOutputData.length > 0) {
        appState.reporter.outputHeaders = [...Object.keys(appState.reporter.sheetData[0] || {}), ...Array.from(allGeneratedHeaders)];
        repPreview.style.display = 'block';
        
        // 添加AI生成声明
        const disclaimer = createAIDisclaimer('default', '<strong>AI生成内容：</strong>以下数据包含AI生成的分析结果，仅供参考，请结合实际情况判断使用。');
        repPreview.innerHTML = '';
        repPreview.appendChild(disclaimer);
        
        const previewTitle = document.createElement('p');
        previewTitle.innerHTML = '<strong>解析完成！预览前 5 条:</strong>';
        repPreview.appendChild(previewTitle);
        
        const previewPre = document.createElement('pre');
        previewPre.textContent = JSON.stringify(appState.reporter.finalOutputData.slice(0, 5), null, 2);
        repPreview.appendChild(previewPre);
        
        repDownloadBtn.style.display = 'inline-block';
    } else { alert("处理完成，但没有生成任何数据。"); }
}

function downloadFinalReport(){
    if (appState.reporter.finalOutputData.length === 0) return;

    const MAX_CELL_LEN = 32767;

    // 1) 归一化所有值为字符串，便于统一处理长度
    const baseHeaders = appState.reporter.outputHeaders.slice();
    const normalizedRows = appState.reporter.finalOutputData.map(row => {
        const norm = {};
        baseHeaders.forEach(h => {
            let v = row[h];
            if (v === undefined || v === null) {
                v = "";
            } else if (typeof v === "object") {
                try { v = JSON.stringify(v); } catch { v = String(v); }
            } else {
                v = String(v);
            }
            norm[h] = v;
        });
        return norm;
    });

    // 2) 计算每个字段需要拆分成多少段
    const partsCountByHeader = {};
    baseHeaders.forEach(h => {
        let maxLen = 0;
        for (const r of normalizedRows) {
            if (r[h].length > maxLen) maxLen = r[h].length;
        }
        partsCountByHeader[h] = Math.ceil(maxLen / MAX_CELL_LEN) || 1;
    });

    // 3) 生成最终列头（对需要拆分的字段展开为多列）
    const finalHeaders = [];
    baseHeaders.forEach(h => {
        const count = partsCountByHeader[h];
        if (count <= 1) {
            finalHeaders.push(h);
        } else {
            for (let i = 1; i <= count; i++) {
                finalHeaders.push(`${h} (${i})`);
            }
        }
    });

    // 4) 根据最终列头输出数据，将超长文本切片到多个列
    const outputRows = normalizedRows.map(r => {
        const out = {};
        baseHeaders.forEach(h => {
            const count = partsCountByHeader[h];
            const str = r[h];
            if (count <= 1) {
                out[h] = str;
            } else {
                for (let i = 1; i <= count; i++) {
                    const start = (i - 1) * MAX_CELL_LEN;
                    const part = str.slice(start, start + MAX_CELL_LEN);
                    out[`${h} (${i})`] = part;
                }
            }
        });
        return out;
    });

    // 5) 生成工作簿：主表 + 说明副表
    const workbook = XLSX.utils.book_new();
    const mainSheet = XLSX.utils.json_to_sheet(outputRows, { header: finalHeaders });
    XLSX.utils.book_append_sheet(workbook, mainSheet, "分析结果");

    const splitMeta = [];
    baseHeaders.forEach(h => {
        if (partsCountByHeader[h] > 1) {
            splitMeta.push({
                字段: h,
                分段数: partsCountByHeader[h],
                说明: `该字段超过 ${MAX_CELL_LEN} 字符，已拆分为多列`
            });
        }
    });
    if (splitMeta.length > 0) {
        const metaSheet = XLSX.utils.json_to_sheet(splitMeta);
        XLSX.utils.book_append_sheet(workbook, metaSheet, "字段拆分说明");
    }

    // 6) 写文件（带回退：如仍有异常，则导出 CSV）
    try {
        XLSX.writeFile(workbook, "专利分析报告_最终版.xlsx");
    } catch (err) {
        console.error("写入 Excel 失败，回退导出 CSV：", err);

        // 简易 CSV 生成（包含最终列头）
        const escapeCSV = (s) => {
            const t = String(s ?? "");
            if (/[",\n]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
            return t;
        };
        const csvLines = [];
        csvLines.push(finalHeaders.map(escapeCSV).join(","));
        outputRows.forEach(row => {
            csvLines.push(finalHeaders.map(h => escapeCSV(row[h] ?? "")).join(","));
        });

        const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "专利分析报告_最终版.csv";
        a.click();
        URL.revokeObjectURL(a.href);
    }
    // ... existing code ...
}
