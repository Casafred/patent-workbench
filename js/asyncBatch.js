// js/asyncBatch.js (修正版)

const delay = ms => new Promise(res => setTimeout(res, ms));

function initAsyncBatch() {
    // 添加预置模板选择下拉框
    const presetTemplateSelect = getEl('async_preset_template_select');
    const templateNameInput = getEl('async_template_name');
    const systemPromptInput = getEl('async_system_prompt');
    const userPromptInput = getEl('async_user_prompt');
    const templateModelSelect = getEl('async_template_model_select');
    const templateTempInput = getEl('async_template_temperature');
    const addTemplateBtn = getEl('async_add_template_btn');
    const templateEditArea = getEl('async_template_edit_area');

    // 初始化预置模板选择下拉框
    presetTemplateSelect.innerHTML = '<option value="">选择预置模板或新建</option>' + appState.asyncBatch.presetTemplates.map(t => `<option value="${t.name}">${t.name}</option>`).join('');

    // 隐藏模板编辑区域，仅当选择新建模板时显示
    templateEditArea.style.display = 'none';

    // 初始化模板模型选择下拉框
    templateModelSelect.innerHTML = ASYNC_MODELS.map(m => `<option value="${m}">${m}</option>`).join('');
    templateModelSelect.value = ASYNC_MODELS[0]; // 默认选择第一个模型
    templateTempInput.value = 0.1; // 默认温度值

    // 预置模板选择事件监听器
    presetTemplateSelect.addEventListener('change', () => {
        const selectedTemplateName = presetTemplateSelect.value;
        if (selectedTemplateName) {
            // 选择了预置模板
            const selectedTemplate = appState.asyncBatch.presetTemplates.find(t => t.name === selectedTemplateName);
            if (selectedTemplate) {
                templateNameInput.value = selectedTemplate.name;
                systemPromptInput.value = selectedTemplate.systemPrompt;
                userPromptInput.value = selectedTemplate.userPromptTemplate;
                templateModelSelect.value = selectedTemplate.model;
                templateTempInput.value = selectedTemplate.temperature;
                // 允许编辑
                templateNameInput.disabled = false;
                systemPromptInput.disabled = false;
                userPromptInput.disabled = false;
                templateModelSelect.disabled = false;
                templateTempInput.disabled = false;
                templateEditArea.style.display = 'block';
            }
        } else {
            // 选择新建模板
            templateNameInput.value = '';
            systemPromptInput.value = '';
            userPromptInput.value = '';
            templateModelSelect.value = ASYNC_MODELS[0];
            templateTempInput.value = 0.1;
            // 启用编辑
            templateNameInput.disabled = false;
            systemPromptInput.disabled = false;
            userPromptInput.disabled = false;
            templateModelSelect.disabled = false;
            templateTempInput.disabled = false;
            templateEditArea.style.display = 'block';
        }
    });

    const manualInput = getEl('async_manual_input');
    const addInputBtn = getEl('async_add_input_btn');
    const excelFile = getEl('async_excel_file');
    const excelSheet = getEl('async_excel_sheet');
    const excelColumn = getEl('async_excel_column');
    const loadExcelBtn = getEl('async_load_excel_btn');
    const clearRequestsBtn = getEl('async_clear_requests_btn');
    const submitBtn = getEl('async_submit_batch_btn');

    // 全局模型选择下拉框已移除，相关代码已删除

    // 检查是否有可恢复的任务
    if (localStorage.getItem('lastAsyncBatchState')) {
        asyncRecoverBtn.disabled = false;
    }

    // ▼▼▼ 修正：将所有事件监听器绑定放在init函数内部 ▼▼▼
    // 移除全局模型和温度设置相关代码

    addTemplateBtn.addEventListener('click', () => {
        const selectedTemplateName = presetTemplateSelect.value;
        const name = templateNameInput.value.trim();
        const systemPrompt = systemPromptInput.value.trim();
        const userPrompt = userPromptInput.value.trim();
        const model = templateModelSelect.value;
        const temperature = parseFloat(templateTempInput.value);

        if (selectedTemplateName) {
            // 用户选择了预置模板但可能已修改
            // 检查是否已添加相同名称的模板
            const exists = appState.asyncBatch.templates.some(t => t.name === name);
            if (exists) {
                return alert('已存在同名模板！');
            }
            // 使用用户修改后的值创建自定义模板
            if (!name || !userPrompt) return alert('模板名称和用户提示模板不能为空！');
            if (!userPrompt.includes('{{INPUT}}')) return alert('用户提示模板必须包含 {{INPUT}} 占位符！');
            if (isNaN(temperature) || temperature < 0 || temperature > 1) return alert('温度必须是0到1之间的数字！');
            appState.asyncBatch.templates.push({
                id: `T${appState.asyncBatch.nextTemplateId++}`,
                name,
                systemPrompt,
                userPromptTemplate: userPrompt,
                model,
                temperature,
                isPreset: false // 即使基于预置模板，修改后也变为自定义模板
            });
            renderAsyncLists();
            // 重置选择
            presetTemplateSelect.value = '';
            templateEditArea.style.display = 'none';
        } else {
            // 创建自定义模板
            if (!name || !userPrompt) return alert('模板名称和用户提示模板不能为空！');
            if (!userPrompt.includes('{{INPUT}}')) return alert('用户提示模板必须包含 {{INPUT}} 占位符！');
            if (isNaN(temperature) || temperature < 0 || temperature > 1) return alert('温度必须是0到1之间的数字！');
            appState.asyncBatch.templates.push({
                id: `T${appState.asyncBatch.nextTemplateId++}`,
                name,
                systemPrompt,
                userPromptTemplate: userPrompt,
                model,
                temperature,
                isPreset: false
            });
            renderAsyncLists();
            templateNameInput.value = '';
            systemPromptInput.value = '';
            userPromptInput.value = '';
            templateModelSelect.value = ASYNC_MODELS[0];
            templateTempInput.value = 0.1;
            templateEditArea.style.display = 'none';
            presetTemplateSelect.value = '';
        }
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
                excelColumn.disabled = true; 
                loadExcelBtn.disabled = true;
                handleAsyncSheetChange(); 
            } catch (err) { alert(`解析Excel失败: ${err.message}`); console.error(err); }
        };
        reader.readAsArrayBuffer(file);
    });

    excelSheet.addEventListener('change', handleAsyncSheetChange);
    
    loadExcelBtn.addEventListener('click', () => {
        if (appState.asyncBatch.inputs.length > 0) {
            if (!confirm("从Excel加载将清空并替换当前所有输入内容，确定吗？")) {
                return;
            }
        }
        
        appState.asyncBatch.inputs = [];
        appState.asyncBatch.requests = [];
        appState.asyncBatch.nextInputId = 1;

        const sheetName = excelSheet.value;
        const columnName = excelColumn.value;
        const worksheet = appState.asyncBatch.excelWorkbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        
        let loadedCount = 0;
        jsonData.forEach(row => {
            if (row[columnName]) {
                appState.asyncBatch.inputs.push({ id: `I${appState.asyncBatch.nextInputId++}`, content: String(row[columnName]).trim() });
                loadedCount++;
            }
        });
        renderAsyncLists();
        renderRequestsPreview();
        alert(`已成功从列 "${columnName}" 加载 ${loadedCount} 条输入，并清空了原有数据。`);
    });
    
    clearRequestsBtn.addEventListener('click', () => {
        if (confirm('确定要清空所有待提交的请求吗？')) {
            appState.asyncBatch.requests = [];
            renderRequestsPreview();
        }
    });

    submitBtn.addEventListener('click', handleAsyncBatchSubmit);
    asyncExportExcelBtn.addEventListener('click', exportAsyncResultsToExcel);
    asyncRecoverBtn.addEventListener('click', recoverAsyncBatchState); // 这行现在是安全的

    asyncInputsSelectAllBtn.addEventListener('click', () => {
        const allChecked = Array.from(document.querySelectorAll('#async_inputs_list input[type="checkbox"]')).every(cb => cb.checked);
        document.querySelectorAll('#async_inputs_list input[type="checkbox"]').forEach(cb => cb.checked = !allChecked);
    });
    asyncInputsDeleteSelectedBtn.addEventListener('click', deleteSelectedAsyncInputs);
    // ▲▲▲ 修正：将所有事件监听器绑定放在init函数内部 ▲▲▲

    // 内部函数，仅在 initAsyncBatch 作用域内可见
    function handleAsyncSheetChange() {
        const sheetName = excelSheet.value;
        const worksheet = appState.asyncBatch.excelWorkbook.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        if (sheetData.length > 0) {
            const headers = sheetData[0];
            excelColumn.innerHTML = headers.map(h => `<option value="${h}">${h}</option>`).join('');
            excelColumn.disabled = false;
            loadExcelBtn.disabled = false;
        } else {
            excelColumn.innerHTML = '';
            excelColumn.disabled = true;
            loadExcelBtn.disabled = true;
        }
    }
}


function renderAsyncLists() {
    const inputsListDiv = getEl('async_inputs_list');
    const templatesListDiv = getEl('async_templates_list');
    const taskCreationArea = getEl('async_task_creation_area');

    inputsListDiv.innerHTML = appState.asyncBatch.inputs.map((i, index) => `
        <div class="list-item">
            <input type="checkbox" value="${i.id}" id="async-input-${i.id}">
            <label for="async-input-${i.id}" class="item-content" style="cursor: pointer;">
                <span class="item-index">${index + 1}.</span>
                ${i.content.substring(0, 100)}...
            </label>
        </div>`
    ).join('') || '<div class="info" style="padding:10px">暂无输入</div>';
    
    asyncInputsCount.textContent = appState.asyncBatch.inputs.length;
    asyncInputsManagement.classList.toggle('visible', appState.asyncBatch.inputs.length > 0);

    templatesListDiv.innerHTML = appState.asyncBatch.templates.map(t => `
        <div class="list-item">
            <span class="item-content">
                <strong>${t.id}:</strong> ${t.name} ${t.isPreset ? '<span class="preset-badge">预置</span>' : ''} (模型: ${t.model}, 温度: ${t.temperature})
            </span>
            <button class="icon-button" title="删除" onclick="deleteAsyncTemplate('${t.id}')">🗑️</button>
        </div>`).join('') || '<div class="info" style="padding:10px">暂无模板</div>';
    
    if (appState.asyncBatch.templates.length === 0) {
        taskCreationArea.innerHTML = '<div class="info">请先在步骤3中添加模板。</div>';
    } else {
        taskCreationArea.innerHTML = appState.asyncBatch.templates.map(t => `
            <div class="template-task-creator">
                <h5>模板: ${t.name} (${t.id}) - 模型: ${t.model}, 温度: ${t.temperature}</h5>
                <div class="config-item row-flex">
                    <label for="range-input-${t.id}">输入序号范围:</label>
                    <input type="text" id="range-input-${t.id}" placeholder="例: 1-10, 15, 21-30">
                </div>
                <button class="small-button" onclick="addAsyncTasksByRange('${t.id}')">添加至任务列表</button>
            </div>
        `).join('');
    }
}

function deleteAsyncTemplate(templateId) {
    if (!confirm(`确定删除模板 ${templateId} 吗？所有使用此模板的待提交请求也将被移除。`)) return;
    appState.asyncBatch.templates = appState.asyncBatch.templates.filter(t => t.id !== templateId);
    appState.asyncBatch.requests = appState.asyncBatch.requests.filter(r => r.templateId !== templateId);
    renderAsyncLists();
    renderRequestsPreview();
}

function deleteSelectedAsyncInputs() {
    const idsToDelete = Array.from(document.querySelectorAll('#async_inputs_list input[type="checkbox"]:checked')).map(cb => cb.value);
    if (idsToDelete.length === 0) {
        return alert("请先勾选需要删除的输入项。");
    }
    if (!confirm(`确定要删除选中的 ${idsToDelete.length} 项输入吗？相关的待提交请求也会被一并移除。`)) {
        return;
    }

    appState.asyncBatch.inputs = appState.asyncBatch.inputs.filter(i => !idsToDelete.includes(i.id));
    appState.asyncBatch.requests = appState.asyncBatch.requests.filter(r => !idsToDelete.includes(r.inputId));
    
    renderAsyncLists();
    renderRequestsPreview();
}

function parseRangeString(rangeStr) {
    const indices = new Set();
    const maxIndex = appState.asyncBatch.inputs.length;
    if (maxIndex === 0) return [];
    
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
            if (!isNaN(num) && num > 0 && num <= maxIndex) {
                indices.add(num - 1);
            }
        }
    }
    return Array.from(indices);
}

function addAsyncTasksByRange(templateId) {
    const rangeInput = getEl(`range-input-${templateId}`);
    const rangeStr = rangeInput.value;
    const indices = parseRangeString(rangeStr);
    
    if (indices.length === 0) {
        return alert("输入的范围无效或没有匹配到任何输入。请检查格式 (例: 1-5, 8) 和序号。");
    }

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
    if (addedCount > 0) {
        alert(`已成功添加 ${addedCount} 个新任务到待提交列表。`);
    } else {
        alert("所选范围的任务已存在于列表中，未添加新任务。");
    }
}

function renderRequestsPreview() {
    const previewList = getEl('async_requests_preview_list');
    const countSpan = getEl('async_requests_count');
    const submitBtn = getEl('async_submit_batch_btn');
    countSpan.textContent = appState.asyncBatch.requests.length;
    submitBtn.disabled = appState.asyncBatch.requests.length === 0;
    if (appState.asyncBatch.requests.length === 0) {
        previewList.innerHTML = '<div class="info">请通过上方的模板任务创建器来添加请求。</div>';
        return;
    }
    previewList.innerHTML = appState.asyncBatch.requests.map(req => {
        const input = appState.asyncBatch.inputs.find(i => i.id === req.inputId);
        const template = appState.asyncBatch.templates.find(t => t.id === req.templateId);
        if (!input || !template) return ''; 
        return `<div class="list-item"><span><strong>${input.id} &rarr; ${template.id}</strong>: ${input.content.substring(0,40)}... &rarr; ${template.name}</span><button class="icon-button" title="删除此请求" onclick="deleteAsyncRequest('${req.localId}')">🗑️</button></div>`;
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
    const contentParent = parent.parentElement;
    contentParent.querySelectorAll('.sub-tab-content').forEach(el => el.classList.remove('active'));
    getEl(`async-input-${type}`).classList.add('active');
}

async function submitTaskWithRetry(request, retries = MAX_ASYNC_RETRIES) {
    const input = appState.asyncBatch.inputs.find(i => i.id === request.inputId);
    const template = appState.asyncBatch.templates.find(t => t.id === request.templateId);
    const userPrompt = template.userPromptTemplate.replace('{{INPUT}}', input.content);
    const messages = [{ role: 'user', content: userPrompt }];
    if (template.systemPrompt) messages.unshift({ role: 'system', content: template.systemPrompt });
    const body = { model: template.model, temperature: template.temperature, messages, request_id: request.localId };
    
    for (let i = 0; i <= retries; i++) {
        try {
            updateAsyncTableRow(request.localId, i === 0 ? 'processing' : 'retrying', `提交中 (尝试 ${i + 1}/${retries + 1})...`);
            const data = await apiCall("/async_submit", body);
            appState.asyncBatch.tasks[request.localId] = { ...appState.asyncBatch.tasks[request.localId], zhipuTaskId: data.task_id, status: 'processing' };
            updateAsyncTableRow(request.localId, 'processing', '已提交，待处理...');
            return; // Success
        } catch (error) {
            console.error(`Submission attempt ${i + 1} for ${request.localId} failed:`, error.message);
            if (i === retries) {
                appState.asyncBatch.tasks[request.localId].status = 'failed';
                updateAsyncTableRow(request.localId, 'failed', `提交失败: ${error.message}`);
                return; // Final failure
            }
            await delay(2000 * (i + 1)); // Wait longer after each failure
        }
    }
}

async function handleAsyncBatchSubmit() {
    if (appState.asyncBatch.requests.length === 0) return alert("没有待提交的请求。");
    getEl('async_submit_batch_btn').disabled = true;
    asyncExportExcelBtn.disabled = false;
    asyncRecoverBtn.disabled = true;

    getEl('async_results_tbody').innerHTML = '';
    appState.asyncBatch.tasks = {};

    for (const request of appState.asyncBatch.requests) {
        const input = appState.asyncBatch.inputs.find(i => i.id === request.inputId);
        const template = appState.asyncBatch.templates.find(t => t.id === request.templateId);
        const row = getEl('async_results_tbody').insertRow();
        row.id = `row-${request.localId}`;
        row.innerHTML = `<td>${request.localId}</td><td>${input.content.substring(0, 50)}...</td><td>${template.name} (${template.id})</td><td class="status-cell">排队中...</td><td class="token-cell">-</td><td class="result-cell">...</td>`;
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
    const statusCell = row.querySelector('.status-cell');
    const tokenCell = row.querySelector('.token-cell');
    const resultCell = row.querySelector('.result-cell');
    
    let statusText;
    switch(status) {
        case 'processing': statusText = "处理中..."; break;
        case 'completed': statusText = "成功"; break;
        case 'failed': statusText = "失败"; break;
        case 'retrying': statusText = "重试中..."; break;
        case 'pending': statusText = "排队中..."; break;
        default: statusText = status;
    }
    
    statusCell.className = `status-cell status-${status}`;
    statusCell.textContent = statusText;
    tokenCell.textContent = tokens;
    resultCell.innerHTML = `<pre>${content || ''}</pre>`;
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
            if (getEl('async_stop_polling_btn')) {
                getEl('async_stop_polling_btn').remove();
            }
            saveAsyncStateToLocalStorage();
            return;
        }

        for (const [localId, task] of tasksToPoll) {
            if (!task.zhipuTaskId) continue;
            try {
                const data = await apiCall(`/async_retrieve`, { task_id: task.zhipuTaskId }, "POST");
                if (data.task_status === 'SUCCESS') {
                    task.status = 'completed';
                    task.result = data.choices[0].message.content;
                    task.usage = data.usage;
                    updateAsyncTableRow(localId, 'completed', task.result, task.usage.total_tokens);
                } else if (data.task_status === 'FAIL') {
                    task.status = 'failed';
                    task.result = data.error?.message || '任务执行失败';
                    updateAsyncTableRow(localId, 'failed', task.result);
                }
            } catch (error) {
                 console.warn(`轮询任务 ${localId} (ID: ${task.zhipuTaskId}) 失败，将在下次轮询时重试。错误:`, error.message);
            }
        }
        saveAsyncStateToLocalStorage();
    };

    appState.asyncBatch.pollingInterval = setInterval(poll, 5000);
    poll();
}

function saveAsyncStateToLocalStorage() {
    if (appState.asyncBatch.requests.length > 0) {
        const stateToSave = {
            requests: appState.asyncBatch.requests,
            tasks: appState.asyncBatch.tasks,
            inputs: appState.asyncBatch.inputs,
            templates: appState.asyncBatch.templates,
            timestamp: new Date().toISOString()
        };
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
        
        const row = tbody.insertRow();
        row.id = `row-${request.localId}`;
        row.innerHTML = `
            <td>${request.localId}</td>
            <td>${input ? input.content.substring(0, 50) : 'N/A'}...</td>
            <td>${template ? `${template.name} (${template.id})` : 'N/A'}</td>
            <td class="status-cell">...</td>
            <td class="token-cell">-</td>
            <td class="result-cell">...</td>
        `;
        
        if (task) {
            updateAsyncTableRow(request.localId, task.status, task.result || `状态: ${task.status}`, (task.usage && task.usage.total_tokens) || '-');
        } else {
            updateAsyncTableRow(request.localId, 'pending', '待处理');
        }
    }
}


function recoverAsyncBatchState() {
    const savedStateJSON = localStorage.getItem('lastAsyncBatchState');
    if (!savedStateJSON) {
        alert("未找到可恢复的任务。");
        return;
    }
    if (!confirm("恢复上次任务将覆盖当前所有未提交的异步任务和输入，确定要继续吗？")) {
        return;
    }
    
    const savedState = JSON.parse(savedStateJSON);
    
    appState.asyncBatch.requests = savedState.requests || [];
    appState.asyncBatch.tasks = savedState.tasks || {};
    appState.asyncBatch.inputs = savedState.inputs || [];
    appState.asyncBatch.templates = savedState.templates || [];

    renderAsyncLists();
    renderRequestsPreview();
    renderAsyncResultsTableFromState();
    
    asyncExportExcelBtn.disabled = appState.asyncBatch.requests.length === 0;

    alert(`已成功恢复 ${new Date(savedState.timestamp).toLocaleString()} 的任务状态。将开始轮询未完成的任务。`);
    
    getEl('async_submit_batch_btn').disabled = true;
    asyncRecoverBtn.disabled = true;

    startAsyncPolling();
}

function exportAsyncResultsToExcel() {
    if (appState.asyncBatch.requests.length === 0) {
        alert("没有数据可导出。");
        return;
    }
    
    const sortedRequests = [...appState.asyncBatch.requests].sort((a, b) => {
        const numA = parseInt(a.inputId.replace('I', ''));
        const numB = parseInt(b.inputId.replace('I', ''));
        return numA - numB;
    });

    const dataToExport = sortedRequests.map(request => {
        const input = appState.asyncBatch.inputs.find(i => i.id === request.inputId);
        const template = appState.asyncBatch.templates.find(t => t.id === request.templateId);
        const task = appState.asyncBatch.tasks[request.localId] || { status: '未提交' };
        
        let statusText = task.status;
        let resultText = task.result || '';
        
        switch(task.status) {
            case 'completed': statusText = '成功'; break;
            case 'failed': statusText = '失败'; break;
            case 'processing': statusText = '处理中'; break;
            case 'retrying': statusText = '重试中'; break;
            case 'pending': statusText = '排队中'; break;
        }

        if (!resultText && task.status !== 'completed') {
            resultText = `[当前状态: ${statusText}]`;
        }
        
        return {
            '请求ID': request.localId,
            '输入内容': input ? input.content : 'N/A',
            '使用模板': template ? template.name : 'N/A',
            '状态': statusText,
            '消耗Tokens': (task.usage && task.usage.total_tokens) ? task.usage.total_tokens : '-',
            '结果': resultText
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "小批量异步结果");

    worksheet['!cols'] = [ { wch: 25 }, { wch: 60 }, { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 80 } ];
    
    XLSX.writeFile(workbook, `小批量异步结果_${new Date().toISOString().slice(0, 10)}.xlsx`);
    alert("Excel文件已开始下载。");
}
