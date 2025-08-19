// =================================================================================
// 功能三: 大批量处理 (无修改，保持原样)
// =================================================================================
function initLargeBatch() {
    initGenerator();
    initBatchWorkflow();
    initReporter();
    switchSubTab('generator', document.querySelector('#large_batch-tab .sub-tab-button'));
}

// 全局变量定义
const genFileInput = document.getElementById('gen_file-input');
const genSheetSelector = document.getElementById('gen_sheet-selector');
const columnConfigContainer = document.getElementById('column-config-container');
const columnCountInput = document.getElementById('column-count');
const columnConfigArea = document.getElementById('column-config-area');
const templateSelector = document.getElementById('template_selector');
const saveTemplateBtn = document.getElementById('save_template_btn');
const importTemplateBtn = document.getElementById('import_template_btn');
const templateFileInput = document.getElementById('template_file_input');
const exportTemplateBtn = document.getElementById('export_template_btn');
const deleteTemplateBtn = document.getElementById('delete_template_btn');
const apiModelSelect = document.getElementById('api-model');
const apiTemperatureInput = document.getElementById('api-temperature');
const apiSystemPrompt = document.getElementById('api-system-prompt');
const promptRules = document.getElementById('prompt-rules');
const contentInsertionPreview = document.getElementById('content-insertion-preview');
const outputFieldsContainer = document.getElementById('output-fields-container');
const addOutputFieldBtn = document.getElementById('add-output-field-btn');
const genGenerateBtn = document.getElementById('gen_generate-btn');
const genPreviewOutput = document.getElementById('gen_preview_output');
const genDownloadBtn = document.getElementById('gen_download-btn');
const genReadyInfo = document.getElementById('gen_ready_info');
const btnUpload = document.getElementById('batch_step1_upload');
const btnCreate = document.getElementById('batch_step2_create');
const btnDownload = document.getElementById('batch_step3_download');
const batchIdReminder = document.getElementById('batch_id_reminder');
const autoCheckContainer = document.getElementById('auto-check-container');
const autoCheckStatus = document.getElementById('auto_check_status');
const batchStopCheckBtn = document.getElementById('batch_stop_check_btn');
const recoverBatchIdInput = document.getElementById('recover_batch_id_input');
const recoverStateBtn = document.getElementById('recover_state_btn');
const batchStep3Check = document.getElementById('batch_step3_check');
const batchLog = document.getElementById('batch_log');
const repExcelInput = document.getElementById('rep_excel-input');
const repSheetSelector = document.getElementById('rep_sheet-selector');
const repJsonlInput = document.getElementById('rep_jsonl-input');
const repInfoBox = document.getElementById('reporter-info-box');
const repGenerateBtn = document.getElementById('rep_generate-report-btn');
const repPreview = document.getElementById('rep_output_preview');
const repDownloadBtn = document.getElementById('rep_download-report-btn');

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
        addLog(`任务状态: <strong style="color: var(--primary-color-dark)">${data.status.toUpperCase()}</strong>`);
        if(data.status === "completed"){
            appState.batch.outputFileId = data.output_file_id;
            addLog(`任务完成! Output File ID: ${data.output_file_id}`,"success");
            btnDownload.disabled = false;
        document.getElementById('batch_step3_download').disabled = false;
            stopAutoCheck();
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
        const data = await apiCall(`/download_result`, { fileId: appState.batch.outputFileId });
        appState.batch.resultContent = data.fileContent;
        addLog("成功: 已将结果文件内容加载到浏览器内存中！","success");
        addLog("请切换到【3. 解析报告】，您将看到直接解析的选项。");
        // ▼▼▼ 修正后的代码行 ▼▼▼
        switchSubTab('reporter', document.querySelector('#large-batch-stepper .step-item[onclick*="reporter"]'));
    } catch(e) { addLog(`错误: ${e.message}`, "error"); } finally { btnDownload.disabled = false; }
}

function startAutoCheck(){
    stopAutoCheck();
    addLog("已启动自动状态检查（每分钟一次）。");
    autoCheckContainer.style.display = "block";
    autoCheckStatusEl.textContent = "自动检查已激活...";
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
    await runStep3_Check();
    const lastLogEntry = batchLog.lastChild?.textContent || "";
    // 检查是否已完成，如果是则自动下载结果
    if(/completed/i.test(lastLogEntry) && appState.batch.outputFileId) {
        addLog("检测到任务已完成，自动获取结果...");
        await runStep3_Download();
    } else if(!/failed|expired|cancelled|cancelling/i.test(lastLogEntry)) {
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
        const previewText = JSON.stringify(appState.reporter.finalOutputData.slice(0, 5), null, 2).replace(/</g, '&lt;');
        repPreview.innerHTML = `<p><strong>解析完成！预览前 5 条:</strong></p><pre>${previewText}</pre>`;
        repDownloadBtn.style.display = 'inline-block';
    } else { alert("处理完成，但没有生成任何数据。"); }
}

function downloadFinalReport(){
    if(appState.reporter.finalOutputData.length === 0) return;
    const consistentData = appState.reporter.finalOutputData.map(row => { let newRow = {}; appState.reporter.outputHeaders.forEach(header => { newRow[header] = row[header] || ""; }); return newRow; });
    // ▼▼▼ 修改①：修复下载功能 ▼▼▼
    // 简化调用，让库从对象键自动推断表头，这更稳健
    const newSheet = XLSX.utils.json_to_sheet(consistentData);
    // ▲▲▲ 修改①：修复下载功能 ▲▲▲
    const newWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWorkbook, newSheet, "分析结果");
    XLSX.writeFile(newWorkbook, "专利分析报告_最终版.xlsx");
}
