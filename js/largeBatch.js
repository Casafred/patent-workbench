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

function initGenerator() {
    apiModelSelect.innerHTML = BATCH_MODELS.map(m => `<option value="${m}">${m}</option>`).join('');
    genFileInput.addEventListener('change', handleGenFile);
    genSheetSelector.addEventListener('change', e => loadGenSheet(e.target.value));
    columnCountInput.addEventListener('input', () => { updateColumnSelectors(); updateContentInsertionPreview(); });
    genGenerateBtn.addEventListener('click', generateJsonl);
    genDownloadBtn.addEventListener('click', downloadJsonl);
    templateSelector.addEventListener('change', loadTemplate);
    getEl('save_template_btn').addEventListener('click', saveTemplate);
    getEl('delete_template_btn').addEventListener('click', deleteTemplate);
    getEl('export_template_btn').addEventListener('click', exportTemplate);
    getEl('import_template_btn').addEventListener('click', () => templateFileInput.click());
    templateFileInput.addEventListener('change', importTemplate);
    getEl('add-output-field-btn').addEventListener('click', () => addOutputField());
    initTemplates();
}

function handleGenFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    // 清除之前的数据
    appState.generator.workbook = null;
    appState.generator.currentSheetData = null;
    appState.generator.columnHeaders = [];
    genSheetSelector.innerHTML = '';
    genSheetSelector.style.display = 'none';
    columnConfigContainer.style.display = 'none';
    genGenerateBtn.disabled = true;
    genPreviewOutput.style.display = 'none';
    genDownloadBtn.style.display = 'none';
    genReadyInfo.style.display = 'none';
    
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = new Uint8Array(e.target.result);
            appState.generator.workbook = XLSX.read(data, { type: 'array' });
            genSheetSelector.innerHTML = '';
            appState.generator.workbook.SheetNames.forEach(name => {
                genSheetSelector.innerHTML += `<option value="${name}">${name}</option>`;
            });
            genSheetSelector.style.display = 'inline-block';
            loadGenSheet(appState.generator.workbook.SheetNames[0]);
        } catch (err) { alert('无法解析文件，请确保是有效的Excel文件。'); console.error(err); }
    };
    reader.readAsArrayBuffer(file);
    
    // 关键修改：重置文件输入值，允许重复上传同名文件
    event.target.value = '';
}

function loadGenSheet(sheetName) {
    const worksheet = appState.generator.workbook.Sheets[sheetName];
    appState.generator.currentSheetData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
    genGenerateBtn.disabled = !appState.generator.currentSheetData || appState.generator.currentSheetData.length === 0;
    if (appState.generator.currentSheetData.length > 0) {
        appState.generator.columnHeaders = Object.keys(appState.generator.currentSheetData[0]);
        columnConfigContainer.style.display = 'block';
        updateColumnSelectors();
    } else {
        columnConfigContainer.style.display = 'none';
    }
}

function updateColumnSelectors() {
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
    let placeholders = Array.from(selectors).map((sel, i) => `{${sel.value || `配置列${i+1}`}}`);
    contentInsertionPreview.textContent = `专利内容如下：\n${placeholders.join('\n\n')}`;
}

function buildUserPrompt() {
    const rules = promptRules.value.trim();
    const contentInsertionTemplate = "专利内容如下：\n" + Array.from(document.querySelectorAll('.column-selector')).map(sel => `{${sel.value}}`).join('\n\n');
    const outputFields = getOutputFieldsFromUI();
    let outputFormat = "";
    if (outputFields.length > 0) {
        const jsonFields = outputFields.map(f => `  "${f.name}": "[${f.desc}]"`).join(',\n');
        outputFormat = `请严格按照以下JSON格式输出，不要添加任何其他说明或markdown标记：\n{\n${jsonFields}\n}`;
    }
    return [rules, contentInsertionTemplate.trim(), outputFormat].filter(Boolean).join('\n\n');
}

function loadTemplateUI(template) {
    if (!template) return;
    apiSystemInput.value = template.system || '';
    if (typeof template.user === 'string') {
        promptRules.value = template.user;
        outputFieldsContainer.innerHTML = '';
    } else if (template.user && typeof template.user === 'object') {
        promptRules.value = template.user.rules || '';
        outputFieldsContainer.innerHTML = '';
        if(template.user.outputFields) template.user.outputFields.forEach(f => addOutputField(f.name, f.desc));
    }
}

function generateJsonl() {
    if (!appState.generator.currentSheetData) return;
    const userPromptTemplate = buildUserPrompt();
    const selectedColumns = Array.from(document.querySelectorAll('.column-selector')).map(sel => sel.value);
    const requests = appState.generator.currentSheetData.map((row, index) => {
        let finalUserPrompt = userPromptTemplate;
        selectedColumns.forEach(colName => { finalUserPrompt = finalUserPrompt.replace(new RegExp(`{${colName}}`, 'g'), row[colName] || ''); });
        return { "custom_id": `request-${index + 1}`, "method": "POST", "url": "/v4/chat/completions", "body": { model: apiModelSelect.value, messages: [{ role: 'system', content: apiSystemInput.value }, { role: 'user', content: finalUserPrompt }], temperature: parseFloat(apiTempInput.value) } };
    });
    appState.batch.jsonlContent = requests.map(JSON.stringify).join('\n');
    genPreviewOutput.style.display = 'block';
    genPreviewOutput.innerHTML = requests.slice(0, 3).map(req => JSON.stringify(req, null, 2).replace(/</g, '&lt;')).join('<hr style="border-color: var(--border-color); margin: 10px 0;">');
    genDownloadBtn.style.display = 'inline-block';
    genReadyInfo.style.display = 'block';
}

function addOutputField(name = '', desc = '') {
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

function loadTemplateUI(template) {
    if (!template) return;
    apiSystemInput.value = template.system || '';
    if (typeof template.user === 'string') {
        promptRules.value = template.user;
        outputFieldsContainer.innerHTML = '';
    } else if (template.user && typeof template.user === 'object') {
        promptRules.value = template.user.rules || '';
        outputFieldsContainer.innerHTML = '';
        if(template.user.outputFields) template.user.outputFields.forEach(f => addOutputField(f.name, f.desc));
    }
}

function initTemplates() {
    appState.generator.customTemplates = JSON.parse(localStorage.getItem('custom_templates') || '[]');
    updateTemplateSelector();
    loadTemplate();
}

function updateTemplateSelector() {
    const selectedValue = templateSelector.value;
    templateSelector.innerHTML = '';
    const allTemplates = [...appState.generator.presetTemplates, ...appState.generator.customTemplates];
    ['预设模板', '自定义模板'].forEach(groupName => {
        const templatesInGroup = allTemplates.filter(t => (t.isPreset && groupName === '预设模板') || (!t.isPreset && groupName === '自定义模板'));
        if (templatesInGroup.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = groupName;
            templatesInGroup.forEach(t => optgroup.innerHTML += `<option value="${t.name}">${t.name}</option>`);
            templateSelector.appendChild(optgroup);
        }
    });
    if (allTemplates.some(t => t.name === selectedValue)) templateSelector.value = selectedValue;
}

function loadTemplate() {
    const selectedName = templateSelector.value;
    const template = [...appState.generator.presetTemplates, ...appState.generator.customTemplates].find(t => t.name === selectedName);
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
    templateSelector.value = name;
    alert("模板已保存！");
}

function deleteTemplate() {
    const selectedName = templateSelector.value;
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
    const selectedName = templateSelector.value;
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
            if ([...appState.generator.presetTemplates, ...appState.generator.customTemplates].some(temp => temp.name === newName)) { newName = `${t.name}_imported_${Date.now()}`; alert(`模板名称冲突，已重命名为 "${newName}"`); }
            t.name = newName;
            delete t.isPreset;
            appState.generator.customTemplates.push(t);
            localStorage.setItem('custom_templates', JSON.stringify(appState.generator.customTemplates));
            updateTemplateSelector();
            templateSelector.value = newName;
            loadTemplate();
            alert("模板导入成功！");
        } catch (err) { alert(`导入失败: ${err.message}`); }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function initBatchWorkflow() {
    btnUpload.addEventListener('click', runStep1_Upload);
    btnCreate.addEventListener('click', runStep2_Create);
    btnCheck.addEventListener('click', runStep3_Check);
    btnDownload.addEventListener('click', runStep3_Download);
    btnStopCheck.addEventListener('click', stopAutoCheck);
    btnRecover.addEventListener('click', recoverBatchState);
}

function addLog(message,type="info"){
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
    btnUpload.disabled = true;
    try {
        const data = await apiCall("/upload", { jsonlContent: appState.batch.jsonlContent, fileName: `patent_requests_${Date.now()}.jsonl` });
        appState.batch.fileId = data.fileId;
        addLog(`成功: ${data.message}`,"success");
        addLog(`获取到 File ID: ${appState.batch.fileId}`);
        btnCreate.disabled = false; btnCheck.disabled = true; btnDownload.disabled = true;
        batchIdReminder.style.display = "none";
        stopAutoCheck();
        
        // 自动发起batch请求
        addLog("自动发起批处理任务...");
        setTimeout(() => runStep2_Create(), 500);
    } catch(e) { addLog(`错误: ${e.message}`, "error"); } finally { btnUpload.disabled = false; }
}

async function runStep2_Create(){
    addLog("开始执行步骤2：创建Batch任务...");
    if(!appState.batch.fileId) return addLog("错误：File ID 缺失。","error");
    btnCreate.disabled = true;
    try {
        const data = await apiCall("/create_batch",{ fileId: appState.batch.fileId });
        appState.batch.batchId = data.id;
        addLog("成功: Batch任务创建成功！","success");
        addLog(`获取到 Batch ID: ${appState.batch.batchId}`);
        batchIdReminder.innerHTML=`<strong>任务已创建！请务必记录您的 Batch ID: <span style="user-select:all; background: #eee; padding: 2px 6px;">${appState.batch.batchId}</span></strong>`;
        batchIdReminder.style.display = "block";
        addLog(`任务初始状态: ${data.status}`);
        btnCheck.disabled = false; btnDownload.disabled = true;
        startAutoCheck();
    } catch(e) { addLog(`错误: ${e.message}`, "error"); } finally { btnCreate.disabled = false; }
}

async function runStep3_Check(){
    addLog("正在检查任务状态...");
    if(!appState.batch.batchId) { addLog("错误：Batch ID 缺失，无法检查状态。","error"); stopAutoCheck(); return; }
    btnCheck.disabled = true;
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
        if (appState.batch.autoCheckTimer) {
             autoCheckStatusEl.textContent = `检查中... [${data.status}]${progressInfo}`;
        }
        // ▲▲▲ 修改结束 ▲▲▲

        if(data.status === "completed"){
            appState.batch.outputFileId = data.output_file_id;
            addLog(`任务完成! Output File ID: ${data.output_file_id}`,"success");
            btnDownload.disabled = false;
            stopAutoCheck();
            // (可选) 任务完成后自动触发下载
            addLog("检测到任务已完成，将在2秒后自动获取结果...");
            setTimeout(() => runStep3_Download(), 2000);
        } else if(["failed","expired","cancelling","cancelled"].includes(data.status)){
            addLog(`任务终止。状态: ${data.status.toUpperCase()}`,"error");
            stopAutoCheck();
        }
    } catch(e) { addLog(`检查状态时发生错误: ${e.message}`, "error"); } finally { btnCheck.disabled = false; }
}

async function runStep3_Download(){
    addLog("开始执行步骤3：获取结果内容...");
    if(!appState.batch.outputFileId) return addLog("错误：Output File ID 缺失。","error");
    btnDownload.disabled = true;
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
            repInfoBox.style.display = 'block';
        }
        
        addLog("正在自动切换到【3. 解析报告】...");
        
        const reporterStepElement = document.querySelector('#large-batch-stepper .step-item[onclick*="reporter"]');
        switchSubTab('reporter', reporterStepElement);
        
        // 因为 appState.reporter.jsonlData 已被正确赋值，这个检查现在会通过
        checkReporterReady();

    } catch(e) { 
        addLog(`错误: 获取结果文件失败: ${e.message}`, "error"); 
    } finally { 
        btnDownload.disabled = false; 
    }
}

function startAutoCheck(){
    stopAutoCheck();
    addLog("已启动自动状态检查（每分钟一次）。");
    autoCheckContainer.style.display = "block";
    autoCheckStatusEl.textContent = "自动检查已激活，等待首次查询...";
    runStep3_Check();
    appState.batch.autoCheckTimer = setInterval(runStep3_Check, 60000);
}

function stopAutoCheck(){
    if(appState.batch.autoCheckTimer){
        clearInterval(appState.batch.autoCheckTimer);
        appState.batch.autoCheckTimer = null;
        autoCheckStatusEl.textContent = "自动检查已停止。";
        addLog("自动检查已停止。");
        setTimeout(() => { autoCheckContainer.style.display="none" }, 3000);
    }
}

async function recoverBatchState(){
    const recoverId = recoverIdInput.value.trim();
    if(!recoverId) return addLog("错误：请输入要恢复的 Batch ID。","error");
    addLog(`正在尝试恢复 Batch ID: ${recoverId}...`);
    appState.batch.batchId = recoverId;
    btnCheck.disabled = false;
    
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
        btnCheck.disabled = false;
        startAutoCheck();
    }
}

function initReporter() {
    repExcelInput.addEventListener('change', handleReporterExcel);
    repSheetSelector.addEventListener('change', e => loadReporterSheet(e.target.value));
    repJsonlInput.addEventListener('change', handleReporterJsonl);
    repGenerateBtn.addEventListener('click', parseAndGenerateReport);
    repDownloadBtn.addEventListener('click', downloadFinalReport);
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
