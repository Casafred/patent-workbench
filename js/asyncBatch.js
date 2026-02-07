// js/asyncBatch.js (v2.3 - Tabbed UI & In-progress Export)

const delay = ms => new Promise(res => setTimeout(res, ms));

function initAsyncBatch() {
    // 初始化输出格式配置相关元素
    const asyncAddOutputFieldBtn = getEl('async_add_output_field_btn');
    const asyncOutputFieldsContainer = getEl('async_output_fields_container');
    const asyncPresetTemplateSelect = getEl('async_preset_template_select');
    const asyncExcelColumnCount = getEl('async_excel_column_count');
    const asyncExcelColumnConfigArea = getEl('async_excel_column_config_area');
    const asyncPreviewRequestBtn = getEl('async_preview_request_btn');
    const asyncExportExcelBtn = getEl('async_export_excel_btn');
    const asyncRecoverBtn = getEl('async_recover_btn');
    const asyncInputsSelectAllBtn = getEl('async_inputs_select_all_btn');
    const asyncInputsDeleteSelectedBtn = getEl('async_inputs_delete_selected_btn');
    const asyncInputsCount = getEl('async_inputs_count');
    const asyncInputsManagement = getEl('async_inputs_management');
    const asyncRequestsCount = getEl('async_requests_count');
    const asyncRequestBodyPreview = getEl('async_request_body_preview');

    // 添加输出字段按钮点击事件
    if (asyncAddOutputFieldBtn) {
        asyncAddOutputFieldBtn.addEventListener('click', () => {
            addAsyncOutputField();
        });
    } else {
        console.error('❌ async_add_output_field_btn element not found');
    }

    // 初始化预设输出字段
    if (!appState.asyncBatch.currentOutputFields) {
        appState.asyncBatch.currentOutputFields = [];
    }

    // 渲染输出字段
    renderAsyncOutputFields();

    // 监听模板选择变化，更新输出字段
    if (!asyncPresetTemplateSelect) {
        console.error('❌ async_preset_template_select element not found');
        return;
    }
    asyncPresetTemplateSelect.addEventListener('change', () => {
        const selectedName = asyncPresetTemplateSelect.value;
        const template = appState.asyncBatch.presetTemplates.find(t => t.name === selectedName);
        if (template && template.outputFields) {
            appState.asyncBatch.currentOutputFields = [...template.outputFields];
        } else {
            appState.asyncBatch.currentOutputFields = [];
        }
        renderAsyncOutputFields();
    });

    
    const presetTemplateSelect = asyncPresetTemplateSelect;
    const templateNameInput = getEl('async_template_name');
    const systemPromptInput = getEl('async_system_prompt');
    const userPromptInput = getEl('async_user_prompt');
    const templateModelSelect = getEl('async_template_model_select');
    const templateTempInput = getEl('async_template_temperature');
    const addTemplateBtn = getEl('async_add_template_btn');
    const templateEditArea = getEl('async_template_edit_area');
    const manualInput = getEl('async_manual_input');
    const addInputBtn = getEl('async_add_input_btn');
    const excelFile = getEl('async_excel_file');
    const excelSheet = getEl('async_excel_sheet');
    const loadExcelBtn = getEl('async_load_excel_btn');
    const clearRequestsBtn = getEl('async_clear_requests_btn');
    const submitBtn = getEl('async_submit_batch_btn');

    presetTemplateSelect.innerHTML = '<option value="">选择预置模板或新建</option>' + appState.asyncBatch.presetTemplates.map(t => `<option value="${t.name}">${t.name}</option>`).join('');
    // 模型选择器现在由 state.js 的 updateAllModelSelectors() 统一管理

    presetTemplateSelect.addEventListener('change', () => {
        const selectedName = presetTemplateSelect.value;
        const template = appState.asyncBatch.presetTemplates.find(t => t.name === selectedName);
        templateEditArea.style.display = 'block';
        if (template) {
            templateNameInput.value = template.name;
            systemPromptInput.value = template.systemPrompt;
            userPromptInput.value = template.userPromptTemplate;
            templateModelSelect.value = template.model;
            templateTempInput.value = template.temperature;
            // Also need to load output fields for the selected template
            appState.asyncBatch.currentOutputFields = template.outputFields ? [...template.outputFields] : [];
        } else {
            templateNameInput.value = '';
            systemPromptInput.value = '你是一个高效的专利文本分析助手。';
            userPromptInput.value = '请根据以下文本，总结其核心技术点：\n\n{{INPUT}}';
            templateModelSelect.value = ASYG_MODELS[0];
            templateTempInput.value = 0.1;
            // Clear output fields when creating a new template
            appState.asyncBatch.currentOutputFields = [];
        }
        // Re-render the output fields after selection change
        renderAsyncOutputFields();
    });

    addTemplateBtn.addEventListener('click', () => {
        const name = templateNameInput.value.trim();
        if (!name || !userPromptInput.value.trim()) return alert('模板名称和用户提示模板不能为空！');
        if (appState.asyncBatch.templates.some(t => t.name === name)) return alert('已存在同名模板！');
        if (!userPromptInput.value.includes('{{INPUT}}')) return alert('用户提示模板必须包含 {{INPUT}} 占位符！');
        
        // 构建输出格式要求
        let outputFormatPrompt = '';
        if (appState.asyncBatch.currentOutputFields && appState.asyncBatch.currentOutputFields.length > 0) {
            outputFormatPrompt = '\n\n请严格按照以下JSON格式输出结果，不要添加任何额外内容：\n';
            const outputSchema = {
                type: 'object',
                properties: {}
            };
            appState.asyncBatch.currentOutputFields.forEach(field => {
                outputSchema.properties[field.name] = {
                    description: field.description || ''
                }; 
            });
            outputFormatPrompt += JSON.stringify(outputSchema, null, 2);
        }

        // 移除outputFields中的type属性
          const fieldsWithoutType = appState.asyncBatch.currentOutputFields ? 
              appState.asyncBatch.currentOutputFields.map(field => {
                  const { type, ...rest } = field; // 移除type属性
                  return rest;
              }) : [];

          appState.asyncBatch.templates.push({
              id: `T${appState.asyncBatch.nextTemplateId++}`,
              name,
              systemPrompt: systemPromptInput.value.trim(),
              userPromptTemplate: userPromptInput.value.trim() + outputFormatPrompt,
              model: templateModelSelect.value,
              temperature: parseFloat(templateTempInput.value),
              outputFields: fieldsWithoutType
          });
        renderAsyncLists();
        templateEditArea.style.display = 'none';
        presetTemplateSelect.value = '';
    });
    
    addInputBtn.addEventListener('click', () => {
        manualInput.value.trim().split('\n').filter(Boolean).forEach(line => {
             appState.asyncBatch.inputs.push({ id: `I${appState.asyncBatch.nextInputId++}`, content: line.trim() });
        });
        renderAsyncLists();
        manualInput.value = '';
    });

    excelFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                appState.asyncBatch.excelWorkbook = XLSX.read(data, { type: 'array' });
                excelSheet.innerHTML = appState.asyncBatch.excelWorkbook.SheetNames.map(name => `<option value="${name}">${name}</option>`).join('');
                excelSheet.disabled = false;
                loadExcelBtn.disabled = true;
                handleAsyncSheetChange(); 
            } catch (err) { alert(`解析Excel失败: ${err.message}`); console.error(err); }
        };
        reader.readAsArrayBuffer(file);
        
        // 关键修改：重置文件输入值，允许重复上传同名文件
        e.target.value = '';
    });

    if (excelSheet) {
        excelSheet.addEventListener('change', handleAsyncSheetChange);
    }
    if (asyncExcelColumnCount) {
        asyncExcelColumnCount.addEventListener('input', renderAsyncColumnSelectors);
    }

    loadExcelBtn.addEventListener('click', () => {
        if (appState.asyncBatch.inputs.length > 0 && !confirm("从Excel加载将清空并替换当前所有输入，确定吗？")) return;
        
        appState.asyncBatch.inputs = [];
        appState.asyncBatch.requests = [];
        appState.asyncBatch.nextInputId = 1;

        const sheetName = excelSheet.value;
        const worksheet = appState.asyncBatch.excelWorkbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        
        const columnSelectors = document.querySelectorAll('#async_excel_column_config_area select');
        const selectedColumns = Array.from(columnSelectors).map(sel => sel.value);

        if (selectedColumns.some(c => !c)) return alert('请为所有选择的列指定一个Excel中的列名。');

        let loadedCount = 0;
        jsonData.forEach(row => {
            if (selectedColumns.length === 1) {
                const colName = selectedColumns[0];
                if (row[colName]) {
                    appState.asyncBatch.inputs.push({ id: `I${appState.asyncBatch.nextInputId++}`, content: String(row[colName]).trim() });
                    loadedCount++;
                }
            } else {
                const multiColContent = {};
                let hasContent = false;
                selectedColumns.forEach(colName => {
                    if (row[colName]) {
                        multiColContent[colName] = String(row[colName]).trim();
                        hasContent = true;
                    } else {
                        multiColContent[colName] = "";
                    }
                });
                if (hasContent) {
                    appState.asyncBatch.inputs.push({ id: `I${appState.asyncBatch.nextInputId++}`, content: multiColContent });
                    loadedCount++;
                }
            }
        });

        renderAsyncLists();
        renderRequestsPreview();
        alert(`已成功从选择的 ${selectedColumns.length} 列中加载 ${loadedCount} 条输入。`);
    });
    
    clearRequestsBtn.addEventListener('click', () => {
        if (confirm('确定要清空所有待提交的请求吗？')) {
            appState.asyncBatch.requests = [];
            renderRequestsPreview();
        }
    });

    if (submitBtn) {
        submitBtn.addEventListener('click', handleAsyncBatchSubmit);
    }
    if (asyncPreviewRequestBtn) {
        asyncPreviewRequestBtn.addEventListener('click', previewAsyncRequests);
    }
    if (asyncExportExcelBtn) {
        asyncExportExcelBtn.addEventListener('click', exportAsyncResultsToExcel);
    }
    if (asyncRecoverBtn) {
        asyncRecoverBtn.addEventListener('click', recoverAsyncBatchState);
    }

    if (asyncInputsSelectAllBtn) {
        asyncInputsSelectAllBtn.addEventListener('click', () => {
            const allChecked = Array.from(document.querySelectorAll('#async_inputs_list input[type="checkbox"]')).every(cb => cb.checked);
            document.querySelectorAll('#async_inputs_list input[type="checkbox"]').forEach(cb => cb.checked = !allChecked);
        });
    }
    if (asyncInputsDeleteSelectedBtn) {
        asyncInputsDeleteSelectedBtn.addEventListener('click', deleteSelectedAsyncInputs);
    }
    
    if (localStorage.getItem('lastAsyncBatchState') && asyncRecoverBtn) {
        asyncRecoverBtn.disabled = false;
    }
}

function handleAsyncSheetChange() {
    const sheetName = getEl('async_excel_sheet').value;
    const worksheet = appState.asyncBatch.excelWorkbook.Sheets[sheetName];
    const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
    if (sheetData.length > 0) {
        appState.asyncBatch.columnHeaders = sheetData[0].filter(h => h);
        asyncColumnConfigContainer.style.display = 'block';
        renderAsyncColumnSelectors();
        getEl('async_load_excel_btn').disabled = false;
    } else {
        appState.asyncBatch.columnHeaders = [];
        asyncColumnConfigContainer.style.display = 'none';
        getEl('async_load_excel_btn').disabled = true;
    }
}

// 添加输出字段
function addAsyncOutputField() {
    if (!appState.asyncBatch.currentOutputFields) {
        appState.asyncBatch.currentOutputFields = [];
    }
    appState.asyncBatch.currentOutputFields.push({
        name: `字段${appState.asyncBatch.currentOutputFields.length + 1}`,
        description: ''
    });
    renderAsyncOutputFields();
}

// 渲染输出字段列表
function renderAsyncOutputFields() {
    const container = getEl('async_output_fields_container');
    if (!appState.asyncBatch.currentOutputFields || appState.asyncBatch.currentOutputFields.length === 0) {
        container.innerHTML = '<div class="info" style="padding: 10px;">暂无输出字段，请点击"添加输出字段"按钮添加。</div>';
        return;
    }
    container.innerHTML = '';
    appState.asyncBatch.currentOutputFields.forEach((field, index) => {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'output-field config-item row-flex';
        fieldDiv.innerHTML = `
            <div style="flex: 1;">
                <input type="text" placeholder="字段名称" value="${field.name || ''}" oninput="updateAsyncOutputField(${index}, 'name', this.value)">
            </div>
            <div style="flex: 3;">
                <input type="text" placeholder="字段描述" value="${field.description || ''}" oninput="updateAsyncOutputField(${index}, 'description', this.value)">
            </div>
            <button class="icon-button delete-button" onclick="deleteAsyncOutputField(${index})">&times;</button>
        `;
        container.appendChild(fieldDiv);
    });
}

// 更新输出字段
function updateAsyncOutputField(index, prop, value) {
    if (appState.asyncBatch.currentOutputFields && appState.asyncBatch.currentOutputFields[index]) {
        appState.asyncBatch.currentOutputFields[index][prop] = value;
    }
}

// 删除输出字段
function deleteAsyncOutputField(index) {
    if (confirm('确定删除此字段吗？')) {
        appState.asyncBatch.currentOutputFields.splice(index, 1);
        renderAsyncOutputFields();
    }
}

function renderAsyncColumnSelectors() {
    const asyncExcelColumnConfigArea = getEl('async_excel_column_config_area');
    const asyncExcelColumnCount = getEl('async_excel_column_count');
    
    if (!asyncExcelColumnConfigArea || !asyncExcelColumnCount) {
        console.error('❌ Required elements not found for renderAsyncColumnSelectors');
        return;
    }
    
    asyncExcelColumnConfigArea.innerHTML = '';
    const count = parseInt(asyncExcelColumnCount.value, 10);
    const headers = appState.asyncBatch.columnHeaders || [];
    const optionsHtml = headers.map(h => `<option value="${h}">${h}</option>`).join('');

    for (let i = 1; i <= count; i++) {
        const div = document.createElement('div');
        div.className = 'config-item row-flex';
        div.innerHTML = `<label for="async-col-selector-${i}">输入列 ${i}:</label><div style="flex-grow:1;"><select id="async-col-selector-${i}">${optionsHtml}</select></div>`;
        asyncExcelColumnConfigArea.appendChild(div);
        const select = div.querySelector('select');
        if (headers.length >= i) { select.value = headers[i - 1]; }
    }
}

function renderAsyncLists() {
    const inputsListDiv = getEl('async_inputs_list');
    const templatesListDiv = getEl('async_templates_list');
    const taskCreationArea = getEl('async_task_creation_area');
    const asyncInputsCount = getEl('async_inputs_count');
    const asyncInputsManagement = getEl('async_inputs_management');

    if (inputsListDiv) {
        inputsListDiv.innerHTML = appState.asyncBatch.inputs.map((inputItem, index) => {
            let displayContent = (typeof inputItem.content === 'string') ? inputItem.content : Object.entries(inputItem.content).map(([key, value]) => `<strong>${key}:</strong> ${String(value).substring(0, 30)}...`).join(' | ');
            return `<div class="list-item"><input type="checkbox" value="${inputItem.id}" id="async-input-${inputItem.id}"><label for="async-input-${inputItem.id}" class="item-content" style="cursor: pointer;"><span class="item-index">${index + 1}.</span>${displayContent.substring(0, 150)}</label></div>`;
        }).join('') || '<div class="info" style="padding:10px">暂无输入</div>';
    }
    
    if (asyncInputsCount) {
        asyncInputsCount.textContent = appState.asyncBatch.inputs.length;
    }
    
    if (asyncInputsManagement) {
        asyncInputsManagement.style.display = appState.asyncBatch.inputs.length > 0 ? 'flex' : 'none';
    }

    if (templatesListDiv) {
        templatesListDiv.innerHTML = appState.asyncBatch.templates.map(t => `<div class="list-item" style="grid-template-columns: 1fr auto;"><span class="item-content"><strong>${t.id}:</strong> ${t.name} (模型: ${t.model}, 温度: ${t.temperature})</span><button class="icon-button" title="删除" onclick="deleteAsyncTemplate('${t.id}')">🗑️</button></div>`).join('') || '<div class="info" style="padding:10px">暂无模板</div>';
    }
    
    if (taskCreationArea) {
        if (appState.asyncBatch.templates.length === 0 || appState.asyncBatch.inputs.length === 0) {
            taskCreationArea.innerHTML = '<div class="info">请先在步骤1添加输入，并在步骤2中添加模板。</div>';
        } else {
            taskCreationArea.innerHTML = appState.asyncBatch.templates.map(t => `<div class="template-task-creator"><h5>模板: ${t.name} (${t.id})</h5><div class="config-item row-flex"><label for="range-input-${t.id}">输入序号范围:</label><input type="text" id="range-input-${t.id}" placeholder="默认全部 (1-${appState.asyncBatch.inputs.length}), 或手动输入范围"></div><button class="small-button" onclick="addAsyncTasksByRange('${t.id}')">添加至任务列表</button></div>`).join('');
        }
    }
}

function deleteAsyncTemplate(templateId) {
    if (!confirm(`确定删除模板 ${templateId} 吗？`)) return;
    appState.asyncBatch.templates = appState.asyncBatch.templates.filter(t => t.id !== templateId);
    appState.asyncBatch.requests = appState.asyncBatch.requests.filter(r => r.templateId !== templateId);
    renderAsyncLists();
    renderRequestsPreview();
}

function deleteSelectedAsyncInputs() {
    const idsToDelete = Array.from(document.querySelectorAll('#async_inputs_list input[type="checkbox"]:checked')).map(cb => cb.value);
    if (idsToDelete.length === 0) return alert("请先勾选需要删除的输入项。");
    if (!confirm(`确定要删除选中的 ${idsToDelete.length} 项输入吗？`)) return;
    appState.asyncBatch.inputs = appState.asyncBatch.inputs.filter(i => !idsToDelete.includes(i.id));
    appState.asyncBatch.requests = appState.asyncBatch.requests.filter(r => !idsToDelete.includes(r.inputId));
    renderAsyncLists();
    renderRequestsPreview();
}

function parseRangeString(rangeStr) {
    const indices = new Set();
    const maxIndex = appState.asyncBatch.inputs.length;
    if (maxIndex === 0) return [];
    if (!rangeStr.trim()) {
        for (let i = 0; i < maxIndex; i++) indices.add(i);
        return Array.from(indices);
    }
    const parts = rangeStr.split(',');
    for (const part of parts) {
        const trimmedPart = part.trim();
        if (trimmedPart.includes('-')) {
            const [start, end] = trimmedPart.split('-').map(s => parseInt(s.trim(), 10));
            if (!isNaN(start) && !isNaN(end) && start <= end) {
                for (let i = start; i <= end; i++) {
                    if (i > 0 && i <= maxIndex) indices.add(i - 1);
                }
            }
        } else {
            const num = parseInt(trimmedPart, 10);
            if (!isNaN(num) && num > 0 && num <= maxIndex) indices.add(num - 1);
        }
    }
    return Array.from(indices);
}

function addAsyncTasksByRange(templateId) {
    const rangeInput = getEl(`range-input-${templateId}`);
    const indices = parseRangeString(rangeInput.value);
    if (indices.length === 0) return alert("输入的范围无效或没有匹配到任何输入。");
    let addedCount = 0;
    indices.forEach(index => {
        const inputId = appState.asyncBatch.inputs[index].id;
        if (!appState.asyncBatch.requests.some(r => r.inputId === inputId && r.templateId === templateId)) {
            const localId = `task-${Date.now()}-${appState.asyncBatch.nextRequestId++}`;
            appState.asyncBatch.requests.push({ localId, inputId, templateId });
            addedCount++;
        }
    });
    renderRequestsPreview();
    rangeInput.value = '';
    alert(`已成功添加 ${addedCount} 个新任务到待提交列表。`);
}

function renderRequestsPreview() {
    const previewList = getEl('async_requests_preview_list');
    const requestsCount = appState.asyncBatch.requests.length;
    asyncRequestsCount.textContent = requestsCount;
    getEl('async_submit_batch_btn').disabled = requestsCount === 0;
    asyncPreviewRequestBtn.disabled = requestsCount === 0;
    // ▼▼▼ 需求②: 只要有请求就允许导出 ▼▼▼
    asyncExportExcelBtn.disabled = requestsCount === 0;

    if (requestsCount === 0) {
        previewList.innerHTML = '<div class="info">请通过上方的模板任务创建器来添加请求。</div>';
        asyncRequestBodyPreview.style.display = 'none';
        return;
    }
    previewList.innerHTML = appState.asyncBatch.requests.map(req => {
        const input = appState.asyncBatch.inputs.find(i => i.id === req.inputId);
        const template = appState.asyncBatch.templates.find(t => t.id === req.templateId);
        if (!input || !template) return '';
        let contentPreview = typeof input.content === 'string' ? input.content.substring(0,40) : Object.keys(input.content).join(', ');
        return `<div class="list-item" style="grid-template-columns: 1fr auto;"><span><strong>${input.id} &rarr; ${template.id}</strong>: ${contentPreview}... &rarr; ${template.name}</span><button class="icon-button" title="删除此请求" onclick="deleteAsyncRequest('${req.localId}')">🗑️</button></div>`;
    }).join('');
}

function deleteAsyncRequest(localId) {
    appState.asyncBatch.requests = appState.asyncBatch.requests.filter(r => r.localId !== localId);
    renderRequestsPreview();
}

function switchAsyncInput(event, type) {
    const parent = event.target.closest('.sub-tab-container');
    parent.querySelectorAll('.sub-tab-button').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    const contentParent = document.getElementById('async-sub-tab-input');
    contentParent.querySelectorAll('.sub-tab-content').forEach(el => el.classList.remove('active'));
    getEl(`async-input-${type}`).classList.add('active');
}

function buildRequestBody(request) {
    const input = appState.asyncBatch.inputs.find(i => i.id === request.inputId);
    const template = appState.asyncBatch.templates.find(t => t.id === request.templateId);
    if (!input || !template) return null;
    let finalInputContent = typeof input.content === 'string' ? input.content : Object.entries(input.content).map(([key, value]) => `以下是“${key}”部分的内容:\n${value}`).join('\n\n');
    const userPrompt = template.userPromptTemplate.replace('{{INPUT}}', finalInputContent);
    const messages = [{ role: 'user', content: userPrompt }];
    if (template.systemPrompt) messages.unshift({ role: 'system', content: template.systemPrompt });
    return { model: template.model, temperature: template.temperature, messages, request_id: request.localId };
}

function previewAsyncRequests() {
    const requestsToPreview = appState.asyncBatch.requests.slice(0, 2);
    if (requestsToPreview.length === 0) {
        asyncRequestBodyPreview.innerHTML = '<div class="info">没有可预览的请求。</div>';
        asyncRequestBodyPreview.style.display = 'block';
        return;
    }
    const previewContent = requestsToPreview.map((req, index) => {
        const body = buildRequestBody(req);
        return `---------- 请求 ${index + 1} (ID: ${req.localId}) ----------\n` + JSON.stringify(body, null, 2);
    }).join('\n\n');
    asyncRequestBodyPreview.textContent = previewContent;
    asyncRequestBodyPreview.style.display = 'block';
}

async function submitTaskWithRetry(request, retries = MAX_ASYNC_RETRIES) {
    const body = buildRequestBody(request);
    if (!body) {
        updateAsyncTableRow(request.localId, 'failed', `构建请求失败：找不到输入或模板。`);
        return;
    }
    for (let i = 0; i <= retries; i++) {
        try {
            updateAsyncTableRow(request.localId, i === 0 ? 'processing' : 'retrying', `提交中 (尝试 ${i + 1}/${retries + 1})...`);
            const data = await apiCall("/async_submit", body);
            appState.asyncBatch.tasks[request.localId] = { ...appState.asyncBatch.tasks[request.localId], zhipuTaskId: data.task_id, status: 'processing' };
            updateAsyncTableRow(request.localId, 'processing', '已提交，待处理...');
            return;
        } catch (error) {
            console.error(`Submission attempt ${i + 1} for ${request.localId} failed:`, error.message);
            if (i === retries) {
                appState.asyncBatch.tasks[request.localId].status = 'failed';
                updateAsyncTableRow(request.localId, 'failed', `提交失败: ${error.message}`);
                return;
            }
            await delay(2000 * (i + 1));
        }
    }
}

async function handleAsyncBatchSubmit() {
    if (appState.asyncBatch.requests.length === 0) return alert("没有待提交的请求。");
    getEl('async_submit_batch_btn').disabled = true;
    asyncRecoverBtn.disabled = true;
    getEl('async_results_tbody').innerHTML = '';
    appState.asyncBatch.tasks = {};
    for (const request of appState.asyncBatch.requests) {
        const input = appState.asyncBatch.inputs.find(i => i.id === request.inputId);
        const template = appState.asyncBatch.templates.find(t => t.id === request.templateId);
        let contentPreview = input ? (typeof input.content === 'string' ? input.content.substring(0, 50) : Object.keys(input.content).join(', ')) : '无效输入';
        const row = getEl('async_results_tbody').insertRow();
        row.id = `row-${request.localId}`;
        row.innerHTML = `<td>${request.localId}</td><td>${contentPreview}...</td><td>${template.name} (${template.id})</td><td class="status-cell">排队中...</td><td class="token-cell">-</td><td class="result-cell">...</td>`;
        appState.asyncBatch.tasks[request.localId] = { status: 'pending', retryCount: 0 };
    }
    const concurrency = 5;
    for (let i = 0; i < appState.asyncBatch.requests.length; i += concurrency) {
        const chunk = appState.asyncBatch.requests.slice(i, i + concurrency);
        await Promise.all(chunk.map(request => submitTaskWithRetry(request)));
    }
    saveAsyncStateToLocalStorage();
    startAsyncPolling();
}

function updateAsyncTableRow(localRequestId, status, content, tokens = '-') {
    const row = getEl(`row-${localRequestId}`);
    if (!row) return;
    const statusCell = row.querySelector('.status-cell'), tokenCell = row.querySelector('.token-cell'), resultCell = row.querySelector('.result-cell');
    let statusText;
    switch(status) {
        case 'processing': statusText = "处理中..."; break; case 'completed': statusText = "成功"; break;
        case 'failed': statusText = "失败"; break; case 'retrying': statusText = "重试中..."; break;
        case 'pending': statusText = "排队中..."; break; default: statusText = status;
    }
    statusCell.className = `status-cell status-${status}`;
    statusCell.textContent = statusText;
    tokenCell.textContent = tokens;
    
    // 为成功的AI结果添加声明
    if (status === 'completed' && content) {
        const resultContainer = document.createElement('div');
        const disclaimer = createAIDisclaimer('compact', '<strong>AI生成：</strong>以下内容由AI生成，仅供参考');
        const contentPre = document.createElement('pre');
        contentPre.textContent = content || '';
        resultContainer.appendChild(disclaimer);
        resultContainer.appendChild(contentPre);
        resultCell.innerHTML = '';
        resultCell.appendChild(resultContainer);
    } else {
        resultCell.innerHTML = `<pre>${content || ''}</pre>`;
    }
}

function startAsyncPolling() {
    const progressInfo = getEl('async_progress_info');
    if (appState.asyncBatch.pollingInterval) clearInterval(appState.asyncBatch.pollingInterval);
    let stopPollingBtn = getEl('async_stop_polling_btn');
    if (!stopPollingBtn) {
        stopPollingBtn = document.createElement('button');
        stopPollingBtn.id = 'async_stop_polling_btn';
        stopPollingBtn.className = 'small-button delete-button';
        stopPollingBtn.textContent = '停止轮询';
        stopPollingBtn.style.marginLeft = '15px';
        stopPollingBtn.onclick = () => {
            if (appState.asyncBatch.pollingInterval) {
                clearInterval(appState.asyncBatch.pollingInterval);
                appState.asyncBatch.pollingInterval = null;
                progressInfo.textContent = `轮询已手动停止。`;
                stopPollingBtn.remove();
                getEl('async_submit_batch_btn').disabled = false;
            }
        };
        progressInfo.parentNode.insertBefore(stopPollingBtn, progressInfo.nextSibling);
    }
    stopPollingBtn.style.display = 'inline-block';
    const poll = async () => {
        const tasksToPoll = Object.entries(appState.asyncBatch.tasks).filter(([_, task]) => task.status === 'processing' || task.status === 'retrying');
        const total = Object.keys(appState.asyncBatch.tasks).length;
        const completedCount = Object.values(appState.asyncBatch.tasks).filter(task => task.status === 'completed').length;
        progressInfo.innerHTML = `任务轮询中... 已成功 ${completedCount} / ${total}`;
        if (tasksToPoll.length === 0) {
            clearInterval(appState.asyncBatch.pollingInterval);
            appState.asyncBatch.pollingInterval = null;
            const failedCount = Object.values(appState.asyncBatch.tasks).filter(task => task.status === 'failed').length;
            progressInfo.innerHTML = `所有任务处理完成！共 ${total} 条，成功 ${completedCount} 条，失败 ${failedCount} 条。`;
            if (getEl('async_stop_polling_btn')) getEl('async_stop_polling_btn').remove();
            saveAsyncStateToLocalStorage();
            return;
        }
        for (const [localId, task] of tasksToPoll) {
            if (!task.zhipuTaskId) continue;
            try {
                const data = await apiCall(`/async_retrieve`, { task_id: task.zhipuTaskId }, "POST");
                if (data.task_status === 'SUCCESS') {
                    task.status = 'completed'; task.result = data.choices[0].message.content; task.usage = data.usage;
                    updateAsyncTableRow(localId, 'completed', task.result, task.usage.total_tokens);
                } else if (data.task_status === 'FAIL') {
                    task.status = 'failed'; task.result = data.error?.message || '任务执行失败';
                    updateAsyncTableRow(localId, 'failed', task.result);
                }
            } catch (error) { console.warn(`轮询任务 ${localId} (ID: ${task.zhipuTaskId}) 失败:`, error.message); }
        }
        saveAsyncStateToLocalStorage();
    };
    appState.asyncBatch.pollingInterval = setInterval(poll, 5000);
    poll();
}

function saveAsyncStateToLocalStorage() {
    if (appState.asyncBatch.requests.length > 0) {
        const stateToSave = { requests: appState.asyncBatch.requests, tasks: appState.asyncBatch.tasks, inputs: appState.asyncBatch.inputs, templates: appState.asyncBatch.templates, timestamp: new Date().toISOString() };
        localStorage.setItem('lastAsyncBatchState', JSON.stringify(stateToSave));
        asyncRecoverBtn.disabled = false;
    }
}

function renderAsyncResultsTableFromState() {
    const tbody = getEl('async_results_tbody');
    tbody.innerHTML = '';
    if (!appState.asyncBatch.requests) return;
    for (const request of appState.asyncBatch.requests) {
        const input = appState.asyncBatch.inputs.find(i => i.id === request.inputId);
        const template = appState.asyncBatch.templates.find(t => t.id === request.templateId);
        const task = appState.asyncBatch.tasks[request.localId];
        let contentPreview = input ? (typeof input.content === 'string' ? input.content.substring(0, 50) : Object.keys(input.content).join(', ')) : '无效输入';
        const row = tbody.insertRow();
        row.id = `row-${request.localId}`;
        row.innerHTML = `<td>${request.localId}</td><td>${contentPreview}...</td><td>${template ? `${template.name} (${template.id})` : 'N/A'}</td><td class="status-cell">...</td><td class="token-cell">-</td><td class="result-cell">...</td>`;
        if (task) {
            updateAsyncTableRow(request.localId, task.status, task.result || `状态: ${task.status}`, (task.usage && task.usage.total_tokens) || '-');
        } else {
            updateAsyncTableRow(request.localId, 'pending', '待处理');
        }
    }
}

function recoverAsyncBatchState() {
    const savedStateJSON = localStorage.getItem('lastAsyncBatchState');
    if (!savedStateJSON) return alert("未找到可恢复的任务。");
    if (!confirm("恢复上次任务将覆盖当前所有异步任务和输入，确定吗？")) return;
    const savedState = JSON.parse(savedStateJSON);
    appState.asyncBatch.requests = savedState.requests || [];
    appState.asyncBatch.tasks = savedState.tasks || {};
    appState.asyncBatch.inputs = savedState.inputs || [];
    appState.asyncBatch.templates = savedState.templates || [];
    renderAsyncLists();
    renderRequestsPreview();
    renderAsyncResultsTableFromState();
    const isFinished = Object.values(appState.asyncBatch.tasks).every(t => t.status === 'completed' || t.status === 'failed');
    alert(`已成功恢复 ${new Date(savedState.timestamp).toLocaleString()} 的任务状态。`);
    getEl('async_submit_batch_btn').disabled = true;
    asyncRecoverBtn.disabled = true;
    if (!isFinished) {
        startAsyncPolling();
    } else {
        getEl('async_progress_info').textContent = '已恢复已完成的任务。';
    }
}

// ▼▼▼ 需求②: 增强的导出函数，支持中途导出 ▼▼▼
function exportAsyncResultsToExcel() {
    if (appState.asyncBatch.requests.length === 0) {
        alert("没有数据可导出。");
        return;
    }
    
    const dataToExport = appState.asyncBatch.requests.map(request => {
        const input = appState.asyncBatch.inputs.find(i => i.id === request.inputId);
        const template = appState.asyncBatch.templates.find(t => t.id === request.templateId);
        const task = appState.asyncBatch.tasks[request.localId] || { status: 'pending' };
        
        let statusText;
        switch(task.status) {
            case 'completed': statusText = '成功'; break;
            case 'failed': statusText = '失败'; break;
            case 'processing': statusText = '处理中'; break;
            case 'retrying': statusText = '重试中'; break;
            case 'pending': statusText = '排队中'; break;
            default: statusText = '未提交';
        }

        let resultText = task.result || '';
        if (task.status !== 'completed') {
             resultText = task.result || `[当前状态: ${statusText}]`; // 如果失败，显示错误信息；否则显示状态
        }
        
        const row = {
            '请求ID': request.localId,
            '模板名称': template ? template.name : 'N/A',
            '状态': statusText,
            '消耗Tokens': (task.usage && task.usage.total_tokens) ? task.usage.total_tokens : '-',
            '结果': resultText
        };

        if (input) {
            if (typeof input.content === 'string') {
                row['输入内容'] = input.content;
            } else {
                for (const colName in input.content) {
                    row[`输入列_${colName}`] = input.content[colName];
                }
            }
        }
        return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "小批量异步结果");
    
    XLSX.writeFile(workbook, `小批量异步结果快照_${new Date().toISOString().slice(0,16).replace('T','_').replace(':','-')}.xlsx`);
    alert("Excel结果快照已开始下载。");
}

// Note: Initialization is now handled by js/main.js after component loads
// Removed auto-initialization to prevent double initialization
