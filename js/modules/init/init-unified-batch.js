/**
 * 统一批量处理系统 - 初始化模块
 * 绑定UI事件和初始化状态
 */

function initUnifiedBatchModule() {
    console.log('[UnifiedBatch] 初始化模块...');

    const requiredElements = [
        'unified_excel_file',
        'unified_excel_sheet',
        'unified_load_excel_btn',
        'unified_inputs_list',
        'unified_preset_template_select',
        'unified_add_output_field_btn',
        'unified_output_fields_container'
    ];

    const missingElements = requiredElements.filter(function(id) {
        return !document.getElementById(id);
    });

    if (missingElements.length > 0) {
        console.error('[UnifiedBatch] 缺少必要元素:', missingElements);
        return false;
    }

    if (typeof UnifiedBatch === 'undefined') {
        console.error('[UnifiedBatch] UnifiedBatch模块未加载');
        return false;
    }

    UnifiedBatch.init();
    initUnifiedBatchUI();
    bindUnifiedBatchEvents();

    console.log('[UnifiedBatch] 模块初始化完成');
    return true;
}

function initUnifiedBatchUI() {
    populateUnifiedTemplateSelect();
    populateUnifiedModelSelect();
    renderUnifiedTemplatesList();
    updateUnifiedModeRecommendation();
}

function populateUnifiedTemplateSelect() {
    const select = document.getElementById('unified_preset_template_select');
    if (!select) return;

    select.innerHTML = '<option value="">-- 新建模板 --</option>';
    
    const templates = UnifiedBatch.getTemplates();
    templates.forEach(function(template) {
        const option = document.createElement('option');
        option.value = template.id;
        option.textContent = template.name + (template.isPreset === false ? ' (自定义)' : '');
        select.appendChild(option);
    });
}

function populateUnifiedModelSelect() {
    const select = document.getElementById('unified_template_model_select');
    if (!select) return;

    select.innerHTML = '';

    if (typeof AVAILABLE_MODELS !== 'undefined' && AVAILABLE_MODELS.length > 0) {
        AVAILABLE_MODELS.forEach(function(modelId) {
            var option = document.createElement('option');
            option.value = modelId;
            option.textContent = modelId;
            if (modelId === 'GLM-4.7-Flash' || modelId === 'GLM-4-Flash') {
                option.textContent = modelId + ' (推荐)';
            }
            select.appendChild(option);
        });
    } else {
        var defaultModels = [
            'GLM-4.7-Flash',
            'GLM-4-Flash',
            'GLM-4-Plus',
            'GLM-4-Air',
            'GLM-4-0520',
            'GLM-4'
        ];
        defaultModels.forEach(function(modelId) {
            var option = document.createElement('option');
            option.value = modelId;
            option.textContent = modelId;
            select.appendChild(option);
        });
    }
}

function renderUnifiedTemplatesList() {
    const container = document.getElementById('unified_templates_list');
    if (!container) return;

    const customTemplates = UnifiedBatch.template.getCustomTemplates();
    
    if (customTemplates.length === 0) {
        container.innerHTML = '<div class="info">暂无自定义模板</div>';
        return;
    }

    container.innerHTML = '';
    customTemplates.forEach(function(template) {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = '<span>' + template.name + '</span><button class="small-button delete-button" onclick="deleteUnifiedTemplate(\'' + template.id + '\')">删除</button>';
        container.appendChild(item);
    });
}

function updateUnifiedModeRecommendation() {
    const count = UnifiedBatch.getInputCount();
    const recommendation = UnifiedBatch.getRecommendedMode();
    const textEl = document.getElementById('unified_recommendation_text');
    
    if (textEl) {
        if (count === 0) {
            textEl.textContent = '请先添加输入数据...';
        } else {
            textEl.innerHTML = '<strong>推荐模式:</strong> ' + (recommendation.mode === 'async' ? '小批量异步模式' : '大批量延时模式') + '<br><strong>原因:</strong> ' + recommendation.reason;
        }
    }

    updateModeCardStyles();
}

function updateModeCardStyles() {
    const asyncCard = document.getElementById('unified_mode_async_card');
    const batchCard = document.getElementById('unified_mode_batch_card');
    const mode = UnifiedBatch.getActualMode();

    if (asyncCard && batchCard) {
        asyncCard.style.borderColor = mode === 'async' ? 'var(--primary-color)' : 'var(--border-color)';
        batchCard.style.borderColor = mode === 'batch' ? 'var(--primary-color)' : 'var(--border-color)';
    }
}

function selectUnifiedMode(mode) {
    const autoCheckbox = document.getElementById('unified_auto_mode_checkbox');
    if (autoCheckbox && autoCheckbox.checked) {
        autoCheckbox.checked = false;
    }
    
    UnifiedBatch.setMode(mode);
    updateModeCardStyles();
    updateProcessPanelVisibility();
}

function updateProcessPanelVisibility() {
    const mode = UnifiedBatch.getActualMode();
    const asyncPanel = document.getElementById('unified_async_progress_panel');
    const batchPanel = document.getElementById('unified_batch_progress_panel');

    if (asyncPanel && batchPanel) {
        asyncPanel.style.display = mode === 'async' ? 'block' : 'none';
        batchPanel.style.display = mode === 'batch' ? 'block' : 'none';
    }
}

function switchUnifiedSubTab(tabName, element) {
    var stepper = document.getElementById('unified-stepper');
    if (stepper) {
        stepper.querySelectorAll('.step-item').forEach(function(item) {
            item.classList.remove('active');
        });
    }
    
    if (element) {
        element.classList.add('active');
    }

    document.querySelectorAll('#unified_batch-tab .sub-tab-content').forEach(function(content) {
        content.classList.remove('active');
    });

    var targetTab = document.getElementById('unified-sub-tab-' + tabName);
    if (targetTab) {
        targetTab.classList.add('active');
    }

    if (tabName === 'mode') {
        updateUnifiedModeRecommendation();
    } else if (tabName === 'process') {
        updateProcessPanelVisibility();
    }
}

function switchUnifiedInput(event, type) {
    var container = event.target.parentElement;
    container.querySelectorAll('.sub-tab-button').forEach(function(btn) {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    document.getElementById('unified-input-excel').classList.remove('active');
    document.getElementById('unified-input-manual').classList.remove('active');
    document.getElementById('unified-input-' + type).classList.add('active');
}

function bindUnifiedBatchEvents() {
    var excelFile = document.getElementById('unified_excel_file');
    if (excelFile) {
        excelFile.addEventListener('change', handleUnifiedExcelUpload);
    }

    var loadExcelBtn = document.getElementById('unified_load_excel_btn');
    if (loadExcelBtn) {
        loadExcelBtn.addEventListener('click', loadUnifiedInputsFromExcel);
    }

    var addInputBtn = document.getElementById('unified_add_input_btn');
    if (addInputBtn) {
        addInputBtn.addEventListener('click', addUnifiedManualInput);
    }

    var presetSelect = document.getElementById('unified_preset_template_select');
    if (presetSelect) {
        presetSelect.addEventListener('change', handleUnifiedTemplateSelect);
    }

    var saveTemplateBtn = document.getElementById('unified_add_template_btn');
    if (saveTemplateBtn) {
        saveTemplateBtn.addEventListener('click', saveUnifiedTemplate);
    }

    var addFieldBtn = document.getElementById('unified_add_output_field_btn');
    if (addFieldBtn) {
        addFieldBtn.addEventListener('click', addUnifiedOutputField);
    }

    var asyncSubmitBtn = document.getElementById('unified_async_submit_btn');
    if (asyncSubmitBtn) {
        asyncSubmitBtn.addEventListener('click', startUnifiedAsyncProcessing);
    }

    var asyncExportBtn = document.getElementById('unified_async_export_btn');
    if (asyncExportBtn) {
        asyncExportBtn.addEventListener('click', exportUnifiedAsyncResults);
    }

    var batchStep1 = document.getElementById('unified_batch_step1_upload');
    if (batchStep1) {
        batchStep1.addEventListener('click', unifiedBatchStep1Upload);
    }

    var batchStep2 = document.getElementById('unified_batch_step2_create');
    if (batchStep2) {
        batchStep2.addEventListener('click', unifiedBatchStep2Create);
    }

    var batchStep3 = document.getElementById('unified_batch_step3_download');
    if (batchStep3) {
        batchStep3.addEventListener('click', unifiedBatchStep3Download);
    }

    var generateReportBtn = document.getElementById('unified_generate_report_btn');
    if (generateReportBtn) {
        generateReportBtn.addEventListener('click', generateUnifiedReport);
    }

    var downloadReportBtn = document.getElementById('unified_download_report_btn');
    if (downloadReportBtn) {
        downloadReportBtn.addEventListener('click', downloadUnifiedReport);
    }
}

async function handleUnifiedExcelUpload(event) {
    var file = event.target.files[0];
    if (!file) return;

    try {
        var result = await UnifiedBatch.loadExcel(file);
        if (result.success) {
            var sheetSelect = document.getElementById('unified_excel_sheet');
            sheetSelect.innerHTML = '';
            result.sheets.forEach(function(sheet) {
                var option = document.createElement('option');
                option.value = sheet;
                option.textContent = sheet;
                sheetSelect.appendChild(option);
            });
            sheetSelect.disabled = false;
            document.getElementById('unified_load_excel_btn').disabled = false;

            sheetSelect.onchange = function() {
                var sheetResult = UnifiedBatch.loadSheet(this.value);
                if (sheetResult.success) {
                    document.getElementById('unified_column_config_container').style.display = 'block';
                    renderUnifiedColumnConfig(sheetResult.headers);
                }
            };
        }
    } catch (error) {
        alert('加载Excel失败: ' + error.message);
    }
}

function renderUnifiedColumnConfig(headers) {
    var container = document.getElementById('unified_excel_column_config_area');
    var countInput = document.getElementById('unified_excel_column_count');
    var count = parseInt(countInput.value) || 1;

    container.innerHTML = '';

    for (var i = 0; i < count; i++) {
        var div = document.createElement('div');
        div.className = 'config-item row-flex';
        div.innerHTML = '<label>第' + (i + 1) + '列:</label><select id="unified_column_' + i + '"></select>';
        container.appendChild(div);

        var select = document.getElementById('unified_column_' + i);
        headers.forEach(function(header) {
            var option = document.createElement('option');
            option.value = header;
            option.textContent = header;
            select.appendChild(option);
        });
    }

    countInput.onchange = function() {
        renderUnifiedColumnConfig(headers);
    };
}

function loadUnifiedInputsFromExcel() {
    var countInput = document.getElementById('unified_excel_column_count');
    var count = parseInt(countInput.value) || 1;
    var selectedColumns = [];

    for (var i = 0; i < count; i++) {
        var select = document.getElementById('unified_column_' + i);
        if (select && select.value) {
            selectedColumns.push(select.value);
        }
    }

    var result = UnifiedBatch.loadInputsFromColumns(selectedColumns);
    if (result.success) {
        renderUnifiedInputsList();
        updateUnifiedModeRecommendation();
        alert(result.message);
    } else {
        alert(result.message);
    }
}

function addUnifiedManualInput() {
    var textarea = document.getElementById('unified_manual_input');
    var text = textarea.value;
    
    var result = UnifiedBatch.addManualInput(text);
    if (result.success) {
        textarea.value = '';
        renderUnifiedInputsList();
        updateUnifiedModeRecommendation();
    }
    alert(result.message);
}

function renderUnifiedInputsList() {
    var container = document.getElementById('unified_inputs_list');
    var inputs = UnifiedBatch.getInputs();
    var countEl = document.getElementById('unified_inputs_count');
    
    if (countEl) {
        countEl.textContent = inputs.length;
    }

    if (inputs.length === 0) {
        container.innerHTML = '<div class="info">暂无输入数据</div>';
        return;
    }

    container.innerHTML = '';
    inputs.forEach(function(input, index) {
        var preview = typeof input.content === 'string' 
            ? (input.content.length > 50 ? input.content.substring(0, 50) + '...' : input.content)
            : Object.keys(input.content).join(', ');

        var item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = '<input type="checkbox" class="unified-input-checkbox" data-id="' + input.id + '"><span>' + (index + 1) + '. ' + preview + '</span>';
        container.appendChild(item);
    });
}

function handleUnifiedTemplateSelect(event) {
    var templateId = event.target.value;
    if (!templateId) return;

    var result = UnifiedBatch.loadTemplate(templateId);
    if (result.success) {
        var template = result.template;
        document.getElementById('unified_template_name').value = template.name || '';
        document.getElementById('unified_system_prompt').value = template.systemPrompt || '';
        document.getElementById('unified_user_prompt').value = template.userPromptTemplate || '';
        document.getElementById('unified_template_temperature').value = template.temperature || 0.1;
        
        if (template.model) {
            var modelSelect = document.getElementById('unified_template_model_select');
            modelSelect.value = template.model;
        }

        renderUnifiedOutputFields(template.outputFields || []);
    }
}

function renderUnifiedOutputFields(fields) {
    var container = document.getElementById('unified_output_fields_container');
    container.innerHTML = '';

    fields.forEach(function(field, index) {
        var div = document.createElement('div');
        div.className = 'output-field-item';
        div.innerHTML = '<div class="config-item row-flex"><label>字段名:</label><input type="text" value="' + field.name + '" onchange="updateUnifiedOutputField(' + index + ', \'name\', this.value)"></div>' +
            '<div class="config-item row-flex"><label>描述:</label><input type="text" value="' + (field.description || '') + '" onchange="updateUnifiedOutputField(' + index + ', \'description\', this.value)"></div>' +
            '<button class="small-button delete-button" onclick="removeUnifiedOutputField(' + index + ')">删除</button>';
        container.appendChild(div);
    });
}

function addUnifiedOutputField() {
    UnifiedBatch.template.addOutputField();
    var fields = UnifiedBatch.template.getOutputFields();
    renderUnifiedOutputFields(fields);
}

function updateUnifiedOutputField(index, property, value) {
    UnifiedBatch.template.updateOutputField(index, property, value);
}

function removeUnifiedOutputField(index) {
    UnifiedBatch.template.removeOutputField(index);
    var fields = UnifiedBatch.template.getOutputFields();
    renderUnifiedOutputFields(fields);
}

function saveUnifiedTemplate() {
    var template = {
        name: document.getElementById('unified_template_name').value,
        systemPrompt: document.getElementById('unified_system_prompt').value,
        userPromptTemplate: document.getElementById('unified_user_prompt').value,
        model: document.getElementById('unified_template_model_select').value,
        temperature: parseFloat(document.getElementById('unified_template_temperature').value),
        outputFields: UnifiedBatch.template.getOutputFields()
    };

    UnifiedBatch.setCurrentTemplate(template);
    var result = UnifiedBatch.saveTemplate();
    
    if (result.success) {
        populateUnifiedTemplateSelect();
        renderUnifiedTemplatesList();
    }
    
    alert(result.message);
}

function deleteUnifiedTemplate(templateId) {
    if (confirm('确定要删除这个模板吗？')) {
        var result = UnifiedBatch.deleteTemplate(templateId);
        if (result.success) {
            populateUnifiedTemplateSelect();
            renderUnifiedTemplatesList();
        }
        alert(result.message);
    }
}

async function startUnifiedAsyncProcessing() {
    var onProgress = function(progress) {
        updateUnifiedAsyncProgress(progress);
    };

    var onComplete = function(result) {
        if (result.success) {
            alert('处理完成！');
        }
    };

    var result = await UnifiedBatch.startProcessing(onProgress, onComplete);
    if (!result.success) {
        alert(result.message);
    }
}

function updateUnifiedAsyncProgress(progress) {
    var stats = UnifiedBatch.getProgressStats();
    var infoEl = document.getElementById('unified_async_progress_info');
    
    if (infoEl) {
        infoEl.textContent = '进度: 已成功 ' + stats.completed + ' / ' + stats.total + ' (失败: ' + stats.failed + ')';
    }

    renderUnifiedAsyncResults();
}

function renderUnifiedAsyncResults() {
    var tbody = document.getElementById('unified_async_results_tbody');
    if (!tbody) return;

    var results = UnifiedBatch.getResults();
    tbody.innerHTML = '';

    results.forEach(function(result) {
        var tr = document.createElement('tr');
        
        var statusText, statusClass;
        switch (result.status) {
            case 'completed':
                statusText = '成功';
                statusClass = 'status-success';
                break;
            case 'failed':
                statusText = '失败';
                statusClass = 'status-failed';
                break;
            case 'processing':
                statusText = '处理中';
                statusClass = 'status-processing';
                break;
            case 'retrying':
                statusText = '重试中';
                statusClass = 'status-warning';
                break;
            default:
                statusText = '排队中';
                statusClass = 'status-pending';
        }

        var input = UnifiedBatch.getInputs().find(function(i) { return i.id === result.inputId; });
        var inputPreview = input 
            ? (typeof input.content === 'string' ? input.content.substring(0, 30) + '...' : '多列数据')
            : '-';

        tr.innerHTML = '<td>' + (result.requestId || '-') + '</td>' +
            '<td>' + inputPreview + '</td>' +
            '<td>' + (result.templateName || '-') + '</td>' +
            '<td class="' + statusClass + '">' + statusText + '</td>' +
            '<td>' + (result.usage?.total_tokens || '-') + '</td>' +
            '<td>' + (result.result || result.error || '-') + '</td>';
        
        tbody.appendChild(tr);
    });

    var exportBtn = document.getElementById('unified_async_export_btn');
    if (exportBtn) {
        exportBtn.disabled = results.length === 0;
    }
}

function exportUnifiedAsyncResults() {
    var result = UnifiedBatch.exportResults();
    alert(result.message);
}

async function unifiedBatchStep1Upload() {
    var result = await UnifiedBatch.batchEngine.uploadJsonl();
    if (result.success) {
        document.getElementById('unified_batch_step2_create').disabled = false;
        logUnifiedBatchMessage('文件上传成功，File ID: ' + result.fileId);
    } else {
        logUnifiedBatchMessage('上传失败: ' + (result.error || result.message));
    }
}

async function unifiedBatchStep2Create() {
    var result = await UnifiedBatch.batchEngine.createBatch();
    if (result.success) {
        logUnifiedBatchMessage('Batch任务创建成功，ID: ' + result.batchId);
        document.getElementById('unified_batch_step3_download').disabled = false;
        document.getElementById('unified_batch_id_reminder').style.display = 'block';
        document.getElementById('unified_batch_id_reminder').textContent = '请记录 Batch ID: ' + result.batchId;
        
        UnifiedBatch.batchEngine.startAutoCheck(
            function(progress) { logUnifiedBatchProgress(progress); },
            function(result) { handleUnifiedBatchComplete(result); }
        );
    } else {
        logUnifiedBatchMessage('创建失败: ' + (result.error || result.message));
    }
}

async function unifiedBatchStep3Download() {
    var result = await UnifiedBatch.batchEngine.downloadResult();
    if (result.success) {
        logUnifiedBatchMessage('结果下载成功，共 ' + result.content.split('\n').length + ' 条');
        document.getElementById('unified_generate_report_btn').disabled = false;
        document.getElementById('unified_reporter_info_box').style.display = 'block';
    } else {
        logUnifiedBatchMessage('下载失败: ' + (result.error || result.message));
    }
}

function logUnifiedBatchMessage(message) {
    var logEl = document.getElementById('unified_batch_log');
    if (logEl) {
        var timestamp = new Date().toLocaleTimeString();
        logEl.innerHTML += '[' + timestamp + '] ' + message + '\n';
        logEl.scrollTop = logEl.scrollHeight;
    }
}

function logUnifiedBatchProgress(progress) {
    var statusText = {
        'pending': '等待中',
        'running': '运行中',
        'completed': '已完成',
        'failed': '失败'
    };

    var message = '状态: ' + (statusText[progress.status] || progress.status);
    if (progress.requestCounts) {
        message += ' | 进度: ' + progress.requestCounts.completed + '/' + progress.requestCounts.total;
        if (progress.requestCounts.failed > 0) {
            message += ' (失败: ' + progress.requestCounts.failed + ')';
        }
    }
    
    logUnifiedBatchMessage(message);

    var statusEl = document.getElementById('unified_auto_check_status');
    if (statusEl) {
        statusEl.textContent = message;
    }

    if (progress.status === 'running' || progress.status === 'pending') {
        document.getElementById('unified_auto_check_container').style.display = 'block';
    }
}

function handleUnifiedBatchComplete(result) {
    logUnifiedBatchMessage('批处理完成！');
    document.getElementById('unified_generate_report_btn').disabled = false;
    document.getElementById('unified_reporter_info_box').style.display = 'block';
}

async function generateUnifiedReport() {
    var originalData = UnifiedBatch.state.state.currentSheetData;
    if (!originalData) {
        alert('请先上传原始Excel文件');
        return;
    }

    var result = UnifiedBatch.batchEngine.generateReport(originalData);
    if (result.success) {
        var previewEl = document.getElementById('unified_rep_output_preview');
        if (previewEl) {
            previewEl.style.display = 'block';
            previewEl.textContent = '解析完成！共 ' + result.data.length + ' 条结果\n字段: ' + result.headers.join(', ');
        }
        document.getElementById('unified_download_report_btn').style.display = 'inline-block';
    } else {
        alert(result.message);
    }
}

function downloadUnifiedReport() {
    var result = UnifiedBatch.batchEngine.exportReport();
    alert(result.message);
}

if (typeof window !== 'undefined') {
    window.initUnifiedBatchModule = initUnifiedBatchModule;
    window.switchUnifiedSubTab = switchUnifiedSubTab;
    window.switchUnifiedInput = switchUnifiedInput;
    window.selectUnifiedMode = selectUnifiedMode;
    window.deleteUnifiedTemplate = deleteUnifiedTemplate;
    window.updateUnifiedOutputField = updateUnifiedOutputField;
    window.removeUnifiedOutputField = removeUnifiedOutputField;
    window.switchUnifiedMode = switchUnifiedMode;
    window.switchClassificationSubTab = switchClassificationSubTab;
    window.switchClassificationInput = switchClassificationInput;
    window.selectClassificationMode = selectClassificationMode;
    window.initClassificationModule = initClassificationModule;
}

function switchUnifiedMode(mode) {
    var batchTab = document.getElementById('mode-tab-batch');
    var classificationTab = document.getElementById('mode-tab-classification');
    var batchPanel = document.getElementById('unified-batch-mode-panel');
    var classificationPanel = document.getElementById('unified-classification-mode-panel');

    if (mode === 'batch') {
        if (batchTab) {
            batchTab.classList.add('active');
            batchTab.style.borderBottomColor = 'var(--primary-color)';
            batchTab.style.color = 'var(--primary-color)';
        }
        if (classificationTab) {
            classificationTab.classList.remove('active');
            classificationTab.style.borderBottomColor = 'transparent';
            classificationTab.style.color = 'var(--text-color-secondary)';
        }
        if (batchPanel) batchPanel.style.display = 'block';
        if (classificationPanel) classificationPanel.style.display = 'none';
    } else {
        if (batchTab) {
            batchTab.classList.remove('active');
            batchTab.style.borderBottomColor = 'transparent';
            batchTab.style.color = 'var(--text-color-secondary)';
        }
        if (classificationTab) {
            classificationTab.classList.add('active');
            classificationTab.style.borderBottomColor = 'var(--primary-color)';
            classificationTab.style.color = 'var(--primary-color)';
        }
        if (batchPanel) batchPanel.style.display = 'none';
        if (classificationPanel) classificationPanel.style.display = 'block';
        
        if (typeof ClassificationModule !== 'undefined') {
            if (!ClassificationModule._initialized) {
                initClassificationModule();
            }
            ClassificationModule.initUI();
        }
    }
}

function initClassificationModule() {
    console.log('[Classification] 初始化分类标引模块...');
    
    if (typeof ClassificationModule === 'undefined') {
        console.error('[Classification] ClassificationModule未加载');
        return false;
    }
    
    ClassificationModule.init();
    ClassificationModule._initialized = true;
    
    console.log('[Classification] 分类标引模块初始化完成');
    return true;
}

function switchClassificationSubTab(tabName, element) {
    var stepper = document.getElementById('classification-stepper');
    if (stepper) {
        stepper.querySelectorAll('.step-item').forEach(function(item) {
            item.classList.remove('active');
        });
    }
    
    if (element) {
        element.classList.add('active');
    }

    document.querySelectorAll('#unified-classification-mode-panel .sub-tab-content').forEach(function(content) {
        content.classList.remove('active');
    });

    var targetTab = document.getElementById('classification-sub-tab-' + tabName);
    if (targetTab) {
        targetTab.classList.add('active');
    }

    if (tabName === 'mode') {
        updateClassificationModeRecommendation();
    } else if (tabName === 'result') {
        updateClassificationProcessPanelVisibility();
    }
}

function switchClassificationInput(event, type) {
    var container = event.target.parentElement;
    container.querySelectorAll('.sub-tab-button').forEach(function(btn) {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    document.getElementById('classification-input-excel').classList.remove('active');
    document.getElementById('classification-input-manual').classList.remove('active');
    document.getElementById('classification-input-' + type).classList.add('active');
}

function selectClassificationMode(mode) {
    var autoCheckbox = document.getElementById('classification_auto_mode_checkbox');
    if (autoCheckbox && autoCheckbox.checked) {
        autoCheckbox.checked = false;
    }
    
    if (typeof ClassificationModule !== 'undefined') {
        ClassificationModule.state.setMode(mode);
    }
    
    updateClassificationModeCardStyles();
    updateClassificationProcessPanelVisibility();
}

function updateClassificationModeRecommendation() {
    var count = 0;
    var recommendation = { mode: 'async', reason: '' };
    
    if (typeof ClassificationModule !== 'undefined') {
        count = ClassificationModule.state.getInputCount();
        recommendation = count < 50 
            ? { mode: 'async', reason: '数据量较少，适合实时处理' }
            : { mode: 'batch', reason: '数据量较大，建议使用批处理' };
    }
    
    var textEl = document.getElementById('classification_recommendation_text');
    
    if (textEl) {
        if (count === 0) {
            textEl.textContent = '请先添加输入数据...';
        } else {
            textEl.innerHTML = '<strong>推荐模式:</strong> ' + (recommendation.mode === 'async' ? '小批量异步模式' : '大批量延时模式') + '<br><strong>原因:</strong> ' + recommendation.reason;
        }
    }

    updateClassificationModeCardStyles();
}

function updateClassificationModeCardStyles() {
    var asyncCard = document.getElementById('classification_mode_async_card');
    var batchCard = document.getElementById('classification_mode_batch_card');
    var mode = 'async';
    
    if (typeof ClassificationModule !== 'undefined') {
        mode = ClassificationModule.state.getMode();
        if (mode === 'auto') {
            mode = ClassificationModule.state.getInputCount() < 50 ? 'async' : 'batch';
        }
    }

    if (asyncCard && batchCard) {
        asyncCard.style.borderColor = mode === 'async' ? 'var(--primary-color)' : 'var(--border-color)';
        batchCard.style.borderColor = mode === 'batch' ? 'var(--primary-color)' : 'var(--border-color)';
    }
}

function updateClassificationProcessPanelVisibility() {
    var mode = 'async';
    
    if (typeof ClassificationModule !== 'undefined') {
        mode = ClassificationModule.state.getMode();
        if (mode === 'auto') {
            mode = ClassificationModule.state.getInputCount() < 50 ? 'async' : 'batch';
        }
    }
    
    var asyncPanel = document.getElementById('classification_async_progress_panel');
    var batchPanel = document.getElementById('classification_batch_progress_panel');

    if (asyncPanel && batchPanel) {
        asyncPanel.style.display = mode === 'async' ? 'block' : 'none';
        batchPanel.style.display = mode === 'batch' ? 'block' : 'none';
    }
}
