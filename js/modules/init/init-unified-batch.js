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
    
    let availableModels = [];
    
    if (window.ProviderManager && typeof ProviderManager.getAvailableModels === 'function') {
        availableModels = ProviderManager.getAvailableModels();
    } else {
        const getUserStorageItem = (key) => {
            if (window.userCacheStorage && window.userCacheStorage.isInitialized()) {
                return window.userCacheStorage.get(key);
            }
            return localStorage.getItem(key);
        };
        
        const zhipuKey = window.appState?.apiKey || getUserStorageItem('globalApiKey');
        const aliyunKey = window.appState?.aliyunApiKey || getUserStorageItem('aliyun_api_key');
        
        const defaultZhipuModels = [
            { id: 'glm-4-flash', name: 'GLM-4-Flash', provider: 'zhipu' },
            { id: 'glm-4-long', name: 'GLM-4-Long', provider: 'zhipu' },
            { id: 'glm-4.7-flash', name: 'GLM-4.7-Flash', provider: 'zhipu' }
        ];
        
        const defaultAliyunModels = [
            { id: 'qwen-turbo', name: 'Qwen-Turbo', provider: 'aliyun' },
            { id: 'qwen-plus', name: 'Qwen-Plus', provider: 'aliyun' },
            { id: 'qwen-max', name: 'Qwen-Max', provider: 'aliyun' }
        ];
        
        if (zhipuKey) {
            availableModels = availableModels.concat(defaultZhipuModels);
        }
        if (aliyunKey) {
            availableModels = availableModels.concat(defaultAliyunModels);
        }
    }
    
    if (availableModels.length === 0) {
        var option = document.createElement('option');
        option.value = '';
        option.textContent = '请先配置API Key';
        option.disabled = true;
        option.selected = true;
        select.appendChild(option);
        return;
    }
    
    const grouped = { zhipu: [], aliyun: [] };
    availableModels.forEach(function(model) {
        const provider = model.provider || 'zhipu';
        if (grouped[provider]) {
            grouped[provider].push(model);
        }
    });
    
    if (grouped.zhipu.length > 0) {
        var optgroup = document.createElement('optgroup');
        optgroup.label = '智谱AI';
        grouped.zhipu.forEach(function(m) {
            var option = document.createElement('option');
            option.value = m.id;
            option.textContent = m.name || m.id;
            optgroup.appendChild(option);
        });
        select.appendChild(optgroup);
    }
    
    if (grouped.aliyun.length > 0) {
        var optgroup = document.createElement('optgroup');
        optgroup.label = '阿里云百炼';
        grouped.aliyun.forEach(function(m) {
            var option = document.createElement('option');
            option.value = m.id;
            option.textContent = m.name || m.id;
            optgroup.appendChild(option);
        });
        select.appendChild(optgroup);
    }
    
    if (select.options.length === 0) {
        availableModels.forEach(function(m) {
            var option = document.createElement('option');
            option.value = m.id;
            option.textContent = m.name || m.id;
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
    const allInputs = UnifiedBatch.getInputs();
    const selectedCheckboxes = document.querySelectorAll('.unified-input-checkbox:checked');
    
    let count;
    if (selectedCheckboxes.length > 0) {
        count = selectedCheckboxes.length;
    } else {
        count = allInputs.length;
    }
    
    const recommendation = UnifiedBatch.router.getRecommendation(count);
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
    const instantCard = document.getElementById('unified_mode_instant_card');
    const asyncCard = document.getElementById('unified_mode_async_card');
    const batchCard = document.getElementById('unified_mode_batch_card');
    
    const allInputs = UnifiedBatch.getInputs();
    const selectedCheckboxes = document.querySelectorAll('.unified-input-checkbox:checked');
    const count = selectedCheckboxes.length > 0 ? selectedCheckboxes.length : allInputs.length;
    const userMode = UnifiedBatch.getMode();
    const mode = UnifiedBatch.router.determineMode(count, userMode);

    if (instantCard) {
        instantCard.style.borderColor = mode === 'instant' ? 'var(--success-color)' : 'var(--border-color)';
    }
    if (asyncCard) {
        asyncCard.style.borderColor = mode === 'async' ? 'var(--primary-color)' : 'var(--border-color)';
    }
    if (batchCard) {
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
    const allInputs = UnifiedBatch.getInputs();
    const selectedCheckboxes = document.querySelectorAll('.unified-input-checkbox:checked');
    const count = selectedCheckboxes.length > 0 ? selectedCheckboxes.length : allInputs.length;
    const userMode = UnifiedBatch.getMode();
    const mode = UnifiedBatch.router.determineMode(count, userMode);
    
    const instantPanel = document.getElementById('unified_instant_progress_panel');
    const asyncPanel = document.getElementById('unified_async_progress_panel');
    const batchPanel = document.getElementById('unified_batch_progress_panel');

    if (instantPanel) {
        instantPanel.style.display = mode === 'instant' ? 'block' : 'none';
    }
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
    if (window._unifiedBatchEventsBound) {
        console.log('[UnifiedBatch] 事件已绑定，跳过重复绑定');
        return;
    }
    window._unifiedBatchEventsBound = true;
    
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

    var instantSubmitBtn = document.getElementById('unified_instant_submit_btn');
    if (instantSubmitBtn) {
        instantSubmitBtn.addEventListener('click', startUnifiedInstantProcessing);
    }

    var testThreeBtn = document.getElementById('unified_test_three_btn');
    if (testThreeBtn) {
        testThreeBtn.addEventListener('click', testUnifiedThreeInputs);
    }

    var instantStopBtn = document.getElementById('unified_instant_stop_btn');
    if (instantStopBtn) {
        instantStopBtn.addEventListener('click', stopUnifiedInstantProcessing);
    }

    var instantExportBtn = document.getElementById('unified_instant_export_btn');
    if (instantExportBtn) {
        instantExportBtn.addEventListener('click', exportUnifiedInstantResults);
    }

    var addConcatColumnBtn = document.getElementById('unified_add_concat_column_btn');
    if (addConcatColumnBtn) {
        addConcatColumnBtn.addEventListener('click', handleUnifiedAddConcatColumn);
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

    var recoverStateBtn = document.getElementById('unified_recover_state_btn');
    if (recoverStateBtn) {
        recoverStateBtn.addEventListener('click', recoverUnifiedBatchState);
    }

    var manualCheckBtn = document.getElementById('unified_batch_manual_check_btn');
    if (manualCheckBtn) {
        manualCheckBtn.addEventListener('click', manualCheckUnifiedBatchStatus);
    }

    var stopCheckBtn = document.getElementById('unified_batch_stop_check_btn');
    if (stopCheckBtn) {
        stopCheckBtn.addEventListener('click', stopUnifiedBatchAutoCheck);
    }
    
    console.log('[UnifiedBatch] 事件绑定完成');
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
                    renderUnifiedColumnConfig(sheetResult.headers);
                }
            };

            if (result.sheets.length > 0) {
                var sheetResult = UnifiedBatch.loadSheet(result.sheets[0]);
                if (sheetResult.success) {
                    renderUnifiedColumnConfig(sheetResult.headers);
                }
            }
        }
    } catch (error) {
        alert('加载Excel失败: ' + error.message);
    }
}

function renderUnifiedColumnConfig(headers) {
    var container = document.getElementById('unified_excel_column_config_area');
    var indexColumnSelect = document.getElementById('unified_index_column');
    var concatContainer = document.getElementById('unified_concat_columns_container');
    
    if (indexColumnSelect) {
        indexColumnSelect.innerHTML = '<option value="">-- 选择索引列 --</option>';
        headers.forEach(function(header) {
            var option = document.createElement('option');
            option.value = header;
            option.textContent = header;
            indexColumnSelect.appendChild(option);
        });
    }
    
    if (concatContainer) {
        concatContainer.innerHTML = '';
    }
    
    var previewEl = document.getElementById('unified_concat_preview');
    if (previewEl) {
        previewEl.textContent = '';
    }
    
    if (!container) return;
    
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

function handleUnifiedAddConcatColumn() {
    var container = document.getElementById('unified_concat_columns_container');
    var headers = UnifiedBatch.getColumnHeaders();
    
    if (!container || !headers || headers.length === 0) return;
    
    var existingSelects = container.querySelectorAll('select');
    var existingCount = existingSelects.length;
    
    if (existingCount >= 10) {
        alert('最多添加10个拼接列');
        return;
    }
    
    var div = document.createElement('div');
    div.className = 'concat-column-item';
    div.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 8px;';
    div.innerHTML = `
        <span style="color: var(--text-color-secondary); min-width: 20px;">${existingCount + 1}.</span>
        <select id="unified_concat_column_${existingCount}" style="flex: 1;">
            <option value="">-- 选择列 --</option>
            ${headers.map(function(h) { return '<option value="' + h + '">' + h + '</option>'; }).join('')}
        </select>
        <button class="small-button delete-button" type="button" onclick="removeUnifiedConcatColumn(this)">删除</button>
    `;
    
    container.appendChild(div);
    updateUnifiedConcatPreview();
    
    var newSelect = div.querySelector('select');
    if (newSelect) {
        newSelect.addEventListener('change', function() { updateUnifiedConcatPreview(); });
    }
}

window.removeUnifiedConcatColumn = function(btn) {
    var div = btn.closest('.concat-column-item');
    if (div) {
        div.remove();
        renumberUnifiedConcatColumns();
        updateUnifiedConcatPreview();
    }
};

function renumberUnifiedConcatColumns() {
    var container = document.getElementById('unified_concat_columns_container');
    if (!container) return;
    
    var items = container.querySelectorAll('.concat-column-item');
    items.forEach(function(item, index) {
        var span = item.querySelector('span');
        if (span) {
            span.textContent = (index + 1) + '.';
        }
        var select = item.querySelector('select');
        if (select) {
            select.id = 'unified_concat_column_' + index;
        }
    });
}

function updateUnifiedConcatPreview() {
    var previewEl = document.getElementById('unified_concat_preview');
    if (!previewEl) return;
    
    var columns = getUnifiedSelectedConcatColumns();
    if (columns.length === 0) {
        previewEl.textContent = '';
        return;
    }
    
    previewEl.textContent = '拼接预览: ' + columns.join(' + ');
}

function getUnifiedSelectedConcatColumns() {
    var container = document.getElementById('unified_concat_columns_container');
    if (!container) return [];
    
    var selects = container.querySelectorAll('select');
    var columns = [];
    
    selects.forEach(function(select) {
        if (select.value) {
            columns.push(select.value);
        }
    });
    
    return columns;
}

async function loadUnifiedInputsFromExcel() {
    var indexColumn = document.getElementById('unified_index_column')?.value;
    var concatColumns = getUnifiedSelectedConcatColumns();
    
    if (concatColumns.length > 0) {
        var result = await UnifiedBatch.loadInputsFromConfig(indexColumn, concatColumns);
        if (result.success) {
            renderUnifiedInputsList();
            updateUnifiedModeRecommendation();
            alert(result.message);
        } else {
            alert(result.message);
        }
        return;
    }
    
    var countInput = document.getElementById('unified_excel_column_count');
    var count = parseInt(countInput.value) || 1;
    var selectedColumns = [];

    for (var i = 0; i < count; i++) {
        var select = document.getElementById('unified_column_' + i);
        if (select && select.value) {
            selectedColumns.push(select.value);
        }
    }

    var result = await UnifiedBatch.loadInputsFromColumns(selectedColumns);
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
        container.innerHTML = '<div class="info" style="text-align: center; padding: 20px;">暂无输入数据</div>';
        return;
    }

    var pageSize = 50;
    var totalPages = Math.ceil(inputs.length / pageSize);
    var currentPage = 1;
    
    window._unifiedInputsData = { inputs: inputs, pageSize: pageSize, totalPages: totalPages, currentPage: currentPage };
    
    renderUnifiedInputsPage(currentPage);
}

function renderUnifiedInputsPage(page) {
    var data = window._unifiedInputsData;
    if (!data) return;
    
    var container = document.getElementById('unified_inputs_list');
    var inputs = data.inputs;
    var pageSize = data.pageSize;
    var totalPages = data.totalPages;
    
    var start = (page - 1) * pageSize;
    var end = Math.min(start + pageSize, inputs.length);
    var pageInputs = inputs.slice(start, end);
    
    var html = pageInputs.map(function(input, idx) {
        var index = start + idx;
        var summary = '';
        var fullContent = '';
        
        if (input.rawContent) {
            var keys = Object.keys(input.rawContent);
            summary = keys.slice(0, 2).map(function(k) { 
                return k + ': ' + truncateUnifiedText(String(input.rawContent[k] || ''), 30); 
            }).join(' | ');
            if (keys.length > 2) summary += ' ...';
        } else if (typeof input.content === 'string') {
            summary = truncateUnifiedText(input.content, 60);
        } else if (typeof input.content === 'object') {
            var keys = Object.keys(input.content);
            summary = keys.slice(0, 2).map(function(k) { 
                return k + ': ' + truncateUnifiedText(String(input.content[k] || ''), 30); 
            }).join(' | ');
        }
        
        return '<div class="input-item-strip" data-index="' + index + '">' +
            '<input type="checkbox" class="unified-input-checkbox strip-checkbox" data-id="' + input.id + '">' +
            '<div class="strip-id">' + (input.id || (index + 1)) + '</div>' +
            '<div class="strip-summary">' + summary + '</div>' +
        '</div>';
    }).join('');
    
    var paginationHtml = '';
    if (totalPages > 1) {
        paginationHtml = '<div class="pagination" style="display: flex; justify-content: center; gap: 10px; margin-top: 15px; padding: 10px; border-top: 1px solid var(--border-color);">';
        
        if (page > 1) {
            paginationHtml += '<button class="small-button" onclick="goToUnifiedInputsPage(' + (page - 1) + ')">上一页</button>';
        }
        
        paginationHtml += '<span style="padding: 5px 15px;">第 ' + page + ' / ' + totalPages + ' 页 (共 ' + inputs.length + ' 条)</span>';
        
        if (page < totalPages) {
            paginationHtml += '<button class="small-button" onclick="goToUnifiedInputsPage(' + (page + 1) + ')">下一页</button>';
        }
        
        paginationHtml += '</div>';
    }
    
    container.innerHTML = html + paginationHtml;
    data.currentPage = page;
}

window.goToUnifiedInputsPage = function(page) {
    renderUnifiedInputsPage(page);
};

function truncateUnifiedText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
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

async function startUnifiedInstantProcessing() {
    var checkboxes = document.querySelectorAll('.unified-input-checkbox:checked');
    var selectedIds = Array.from(checkboxes).map(function(cb) { return cb.dataset.id; });
    
    if (selectedIds.length === 0) {
        alert('请先勾选要处理的数据');
        return;
    }

    var submitBtn = document.getElementById('unified_instant_submit_btn');
    var stopBtn = document.getElementById('unified_instant_stop_btn');
    var progressInfo = document.getElementById('unified_instant_progress_info');
    var tbody = document.getElementById('unified_instant_results_tbody');
    
    if (submitBtn) submitBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = false;
    if (tbody) tbody.innerHTML = '';
    
    window._unifiedTokenStats = { total: 0, prompt: 0, completion: 0 };
    updateUnifiedTokenDisplay();
    
    var onProgress = function(progress) {
        updateUnifiedInstantProgress(progress);
        if (progress.usage) {
            window._unifiedTokenStats.total += progress.usage.total_tokens || 0;
            window._unifiedTokenStats.prompt += progress.usage.prompt_tokens || 0;
            window._unifiedTokenStats.completion += progress.usage.completion_tokens || 0;
            updateUnifiedTokenDisplay();
        }
    };

    var onComplete = function(result) {
        if (submitBtn) submitBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;
        if (progressInfo) {
            progressInfo.textContent = `处理完成！成功: ${result.stats?.completed || 0}, 失败: ${result.stats?.failed || 0}`;
        }
        if (result.success) {
            var exportBtn = document.getElementById('unified_instant_export_btn');
            if (exportBtn) exportBtn.disabled = false;
        }
    };

    var result = await UnifiedBatch.startProcessing(onProgress, onComplete, selectedIds);
    if (!result.success) {
        alert(result.message);
        if (submitBtn) submitBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;
    }
}

async function testUnifiedThreeInputs() {
    var allInputs = UnifiedBatch.getInputs();
    
    if (allInputs.length === 0) {
        alert('请先添加输入数据');
        return;
    }
    
    var testInputs = allInputs.slice(0, Math.min(3, allInputs.length));
    var testIds = testInputs.map(function(input) { return input.id; });
    
    var submitBtn = document.getElementById('unified_instant_submit_btn');
    var testBtn = document.getElementById('unified_test_three_btn');
    var stopBtn = document.getElementById('unified_instant_stop_btn');
    var progressInfo = document.getElementById('unified_instant_progress_info');
    var tbody = document.getElementById('unified_instant_results_tbody');
    
    if (submitBtn) submitBtn.disabled = true;
    if (testBtn) testBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = false;
    if (tbody) tbody.innerHTML = '';
    
    window._unifiedTokenStats = { total: 0, prompt: 0, completion: 0 };
    updateUnifiedTokenDisplay();
    
    if (progressInfo) {
        progressInfo.textContent = '🧪 测试模式：处理前 ' + testInputs.length + ' 条数据...';
    }
    
    var onProgress = function(progress) {
        updateUnifiedInstantProgress(progress);
        if (progress.usage) {
            window._unifiedTokenStats.total += progress.usage.total_tokens || 0;
            window._unifiedTokenStats.prompt += progress.usage.prompt_tokens || 0;
            window._unifiedTokenStats.completion += progress.usage.completion_tokens || 0;
            updateUnifiedTokenDisplay();
        }
    };

    var onComplete = function(result) {
        if (submitBtn) submitBtn.disabled = false;
        if (testBtn) testBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;
        if (progressInfo) {
            progressInfo.textContent = '🧪 测试完成！成功: ' + (result.stats?.completed || 0) + ', 失败: ' + (result.stats?.failed || 0);
        }
    };

    var result = await UnifiedBatch.startProcessing(onProgress, onComplete, testIds);
    if (!result.success) {
        alert(result.message);
        if (submitBtn) submitBtn.disabled = false;
        if (testBtn) testBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;
    }
}

function updateUnifiedTokenDisplay() {
    var stats = window._unifiedTokenStats || { total: 0, prompt: 0, completion: 0 };
    var totalEl = document.getElementById('unified_total_tokens');
    var costEl = document.getElementById('unified_estimated_cost');
    
    if (totalEl) {
        totalEl.textContent = stats.total.toLocaleString();
    }
    
    if (costEl) {
        var cost = (stats.total / 1000) * 0.001;
        costEl.textContent = cost.toFixed(4);
    }
}

function stopUnifiedInstantProcessing() {
    UnifiedBatch.stopProcessing();
    var submitBtn = document.getElementById('unified_instant_submit_btn');
    var stopBtn = document.getElementById('unified_instant_stop_btn');
    var progressInfo = document.getElementById('unified_instant_progress_info');
    
    if (submitBtn) submitBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;
    if (progressInfo) progressInfo.textContent = '任务已停止';
}

function updateUnifiedInstantProgress(progress) {
    var progressInfo = document.getElementById('unified_instant_progress_info');
    var tbody = document.getElementById('unified_instant_results_tbody');
    
    if (progressInfo) {
        progressInfo.textContent = `处理进度: ${progress.completed || 0} 成功 / ${progress.failed || 0} 失败 / 共 ${progress.total || 0} 条`;
    }
    
    if (progress.lastResult !== undefined && tbody) {
        var tr = document.createElement('tr');
        var isSuccess = !progress.error;
        var statusClass = isSuccess ? 'success' : 'error';
        var statusText = isSuccess ? '✓ 成功' : '✗ 失败';
        var resultPreview = progress.lastResult 
            ? (progress.lastResult.length > 200 ? progress.lastResult.substring(0, 200) + '...' : progress.lastResult)
            : '-';
        
        tr.innerHTML = '<td style="text-align: center;">' + (progress.current || '-') + '</td>' +
            '<td style="text-align: center;">' + (progress.inputId || '-') + '</td>' +
            '<td class="' + statusClass + '" style="text-align: center;"><strong>' + statusText + '</strong></td>' +
            '<td style="word-break: break-word; white-space: pre-wrap; max-width: 400px;">' + 
            (progress.error || resultPreview) + '</td>';
        tbody.appendChild(tr);
        
        tbody.scrollTop = tbody.scrollHeight;
    }
}

function updateUnifiedAsyncProgress(progress) {
    var progressInfo = document.getElementById('unified_async_progress_info');
    var tbody = document.getElementById('unified_async_results_tbody');
    
    if (progressInfo) {
        progressInfo.textContent = `处理进度: ${progress.completed || 0} 成功 / ${progress.failed || 0} 失败 / 共 ${progress.total || 0} 条`;
    }
    
    if (progress.lastResult !== undefined && tbody) {
        var tr = document.createElement('tr');
        var isSuccess = !progress.error;
        var statusClass = isSuccess ? 'success' : 'error';
        var statusText = isSuccess ? '✓ 成功' : '✗ 失败';
        var resultPreview = progress.lastResult 
            ? (progress.lastResult.length > 200 ? progress.lastResult.substring(0, 200) + '...' : progress.lastResult)
            : '-';
        
        tr.innerHTML = '<td style="text-align: center;">' + (progress.current || '-') + '</td>' +
            '<td style="text-align: center;">' + (progress.inputId || '-') + '</td>' +
            '<td class="' + statusClass + '" style="text-align: center;"><strong>' + statusText + '</strong></td>' +
            '<td style="word-break: break-word; white-space: pre-wrap; max-width: 400px;">' + 
            (progress.error || resultPreview) + '</td>';
        tbody.appendChild(tr);
        
        tbody.scrollTop = tbody.scrollHeight;
    }
}

function exportUnifiedInstantResults() {
    var result = UnifiedBatch.exportCurrentResults();
    if (result.success) {
        alert('导出成功！');
    } else {
        alert(result.message || '导出失败');
    }
}

async function startUnifiedAsyncProcessing() {
    var checkboxes = document.querySelectorAll('.unified-input-checkbox:checked');
    var selectedIds = Array.from(checkboxes).map(function(cb) { return cb.dataset.id; });
    
    if (selectedIds.length === 0) {
        alert('请先勾选要处理的数据');
        return;
    }

    var submitBtn = document.getElementById('unified_async_submit_btn');
    var progressInfo = document.getElementById('unified_async_progress_info');
    var tbody = document.getElementById('unified_async_results_tbody');
    
    if (submitBtn) submitBtn.disabled = true;
    if (tbody) tbody.innerHTML = '';
    if (progressInfo) progressInfo.textContent = '正在处理...';

    var onProgress = function(progress) {
        updateUnifiedAsyncProgress(progress);
    };

    var onComplete = function(result) {
        if (submitBtn) submitBtn.disabled = false;
        if (progressInfo) {
            progressInfo.textContent = `处理完成！成功: ${result.stats?.completed || 0}, 失败: ${result.stats?.failed || 0}`;
        }
        if (result.success) {
            var exportBtn = document.getElementById('unified_async_export_btn');
            if (exportBtn) exportBtn.disabled = false;
        }
    };

    var result = await UnifiedBatch.startProcessing(onProgress, onComplete, selectedIds);
    if (!result.success) {
        alert(result.message);
        if (submitBtn) submitBtn.disabled = false;
    }
}

function updateUnifiedAsyncProgress(progress) {
    var progressInfo = document.getElementById('unified_async_progress_info');
    var tbody = document.getElementById('unified_async_results_tbody');
    
    if (progressInfo) {
        progressInfo.textContent = `处理进度: ${progress.completed || 0} 成功 / ${progress.failed || 0} 失败 / 共 ${progress.total || 0} 条`;
    }
    
    if (progress.lastResult !== undefined && tbody) {
        var tr = document.createElement('tr');
        var isSuccess = !progress.error;
        var statusClass = isSuccess ? 'success' : 'error';
        var statusText = isSuccess ? '✓ 成功' : '✗ 失败';
        var resultPreview = progress.lastResult 
            ? (progress.lastResult.length > 100 ? progress.lastResult.substring(0, 100) + '...' : progress.lastResult)
            : '-';
        
        tr.innerHTML = '<td>' + (progress.current || '-') + '</td>' +
            '<td>' + (progress.inputId || '-') + '</td>' +
            '<td class="' + statusClass + '"><strong>' + statusText + '</strong></td>' +
            '<td style="max-width: 300px; word-break: break-all; white-space: pre-wrap;">' + 
            (progress.error || resultPreview) + '</td>';
        tbody.appendChild(tr);
        
        tbody.scrollTop = tbody.scrollHeight;
    }
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

function formatZhipuTimestamp(timestamp) {
    if (!timestamp) return '-';
    var date = new Date(timestamp * 1000);
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    var hours = String(date.getHours()).padStart(2, '0');
    var minutes = String(date.getMinutes()).padStart(2, '0');
    var seconds = String(date.getSeconds()).padStart(2, '0');
    return year + '-' + month + '-' + day + ' ' + hours + ':' + minutes + ':' + seconds;
}

function getZhipuStatusText(status) {
    var statusMap = {
        'pending': '等待中',
        'running': '运行中',
        'completed': '已完成',
        'failed': '失败',
        'expired': '已过期',
        'cancelled': '已取消',
        'finalizing': '最终处理中',
        'cancelling': '取消中'
    };
    return statusMap[status] || status;
}

function logUnifiedBatchProgress(progress) {
    var statusText = getZhipuStatusText(progress.status);
    var message = '状态: ' + statusText;
    
    if (progress.requestCounts) {
        var completed = progress.requestCounts.completed || 0;
        var total = progress.requestCounts.total || 0;
        var failed = progress.requestCounts.failed || 0;
        message += ' | 进度: ' + completed + '/' + total;
        if (failed > 0) {
            message += ' (失败: ' + failed + ')';
        }
    } else if (progress.total !== undefined) {
        var completed = progress.completed || 0;
        var total = progress.total || 0;
        var failed = progress.failed || 0;
        message += ' | 进度: ' + completed + '/' + total;
        if (failed > 0) {
            message += ' (失败: ' + failed + ')';
        }
    }
    
    logUnifiedBatchMessage(message);

    var statusEl = document.getElementById('unified_auto_check_status');
    if (statusEl) {
        statusEl.textContent = message;
    }
    
    updateZhipuBatchDetails(progress);

    if (progress.status === 'running' || progress.status === 'pending') {
        document.getElementById('unified_auto_check_container').style.display = 'block';
    }
}

function updateZhipuBatchDetails(progress) {
    var detailsEl = document.getElementById('unified_batch_details');
    var detailsPanel = document.getElementById('unified_batch_details_panel');
    if (!detailsEl) return;
    
    if (detailsPanel) {
        detailsPanel.style.display = 'block';
    }
    
    var html = '<div class="batch-details-grid">';
    
    html += '<div class="detail-item"><span class="detail-label">任务ID:</span><span class="detail-value">' + (progress.id || '-') + '</span></div>';
    html += '<div class="detail-item"><span class="detail-label">状态:</span><span class="detail-value status-' + (progress.status || 'unknown') + '">' + getZhipuStatusText(progress.status) + '</span></div>';
    
    if (progress.endpoint) {
        html += '<div class="detail-item"><span class="detail-label">API端点:</span><span class="detail-value">' + progress.endpoint + '</span></div>';
    }
    
    if (progress.completionWindow) {
        html += '<div class="detail-item"><span class="detail-label">完成窗口:</span><span class="detail-value">' + progress.completionWindow + '</span></div>';
    }
    
    if (progress.createdAt) {
        html += '<div class="detail-item"><span class="detail-label">创建时间:</span><span class="detail-value">' + formatZhipuTimestamp(progress.createdAt) + '</span></div>';
    }
    
    if (progress.inProgressAt) {
        html += '<div class="detail-item"><span class="detail-label">开始处理:</span><span class="detail-value">' + formatZhipuTimestamp(progress.inProgressAt) + '</span></div>';
    }
    
    if (progress.expiresAt) {
        html += '<div class="detail-item"><span class="detail-label">过期时间:</span><span class="detail-value">' + formatZhipuTimestamp(progress.expiresAt) + '</span></div>';
    }
    
    if (progress.completedAt) {
        html += '<div class="detail-item"><span class="detail-label">完成时间:</span><span class="detail-value">' + formatZhipuTimestamp(progress.completedAt) + '</span></div>';
    }
    
    if (progress.failedAt) {
        html += '<div class="detail-item"><span class="detail-label">失败时间:</span><span class="detail-value">' + formatZhipuTimestamp(progress.failedAt) + '</span></div>';
    }
    
    var completed = progress.requestCounts?.completed || progress.completed || 0;
    var total = progress.requestCounts?.total || progress.total || 0;
    var failed = progress.requestCounts?.failed || progress.failed || 0;
    
    if (total > 0) {
        var percent = total > 0 ? Math.round((completed / total) * 100) : 0;
        html += '<div class="detail-item full-width"><span class="detail-label">处理进度:</span>';
        html += '<div class="progress-bar-container"><div class="progress-bar-fill" style="width: ' + percent + '%;"></div></div>';
        html += '<span class="detail-value">' + completed + '/' + total + ' (' + percent + '%)</span></div>';
        
        if (failed > 0) {
            html += '<div class="detail-item"><span class="detail-label">失败数量:</span><span class="detail-value status-failed">' + failed + '</span></div>';
        }
    }
    
    if (progress.inputFileId) {
        html += '<div class="detail-item"><span class="detail-label">输入文件ID:</span><span class="detail-value small-text">' + progress.inputFileId + '</span></div>';
    }
    
    if (progress.outputFileId) {
        html += '<div class="detail-item"><span class="detail-label">输出文件ID:</span><span class="detail-value small-text status-success">' + progress.outputFileId + '</span></div>';
    }
    
    if (progress.errorFileId) {
        html += '<div class="detail-item"><span class="detail-label">错误文件ID:</span><span class="detail-value small-text status-failed">' + progress.errorFileId + '</span></div>';
    }
    
    html += '</div>';
    
    detailsEl.innerHTML = html;
    detailsEl.style.display = 'block';
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
        if (batchTab) batchTab.classList.add('active');
        if (classificationTab) classificationTab.classList.remove('active');
        if (batchPanel) batchPanel.style.display = 'block';
        if (classificationPanel) classificationPanel.style.display = 'none';
    } else {
        if (batchTab) batchTab.classList.remove('active');
        if (classificationTab) classificationTab.classList.add('active');
        if (batchPanel) batchPanel.style.display = 'none';
        if (classificationPanel) classificationPanel.style.display = 'block';
        
        if (typeof ProviderManager !== 'undefined' && ProviderManager.updateModelSelectors) {
            ProviderManager.updateModelSelectors();
        }
        
        waitForClassificationModule(5000).then(function(loaded) {
            if (!loaded) {
                console.error('[Classification] 无法加载ClassificationModule');
                return;
            }
            
            if (!ClassificationModule._initialized) {
                ClassificationModule.init();
                ClassificationModule._initialized = true;
            }
            ClassificationModule.initUI();
            
            var stepper = document.getElementById('classification-stepper');
            if (stepper) {
                stepper.querySelectorAll('.step-item').forEach(function(item, index) {
                    if (index === 0) {
                        item.classList.add('active');
                    } else {
                        item.classList.remove('active');
                    }
                });
            }
            
            var inputTab = document.getElementById('classification-sub-tab-input');
            if (inputTab) {
                document.querySelectorAll('#unified-classification-mode-panel .sub-tab-content').forEach(function(content) {
                    content.classList.remove('active');
                });
                inputTab.classList.add('active');
            }
        });
    }
}

function initClassificationModule() {
    console.log('[Classification] 初始化分类标引模块...');
    
    if (typeof ClassificationModule === 'undefined') {
        console.warn('[Classification] ClassificationModule未加载，等待中...');
        return false;
    }
    
    ClassificationModule.init();
    ClassificationModule._initialized = true;
    
    console.log('[Classification] 分类标引模块初始化完成');
    return true;
}

function waitForClassificationModule(timeout) {
    timeout = timeout || 5000;
    return new Promise(function(resolve) {
        if (typeof ClassificationModule !== 'undefined') {
            resolve(true);
            return;
        }
        
        var startTime = Date.now();
        var checkInterval = setInterval(function() {
            if (typeof ClassificationModule !== 'undefined') {
                clearInterval(checkInterval);
                resolve(true);
            } else if (Date.now() - startTime > timeout) {
                clearInterval(checkInterval);
                console.error('[Classification] 等待ClassificationModule超时');
                resolve(false);
            }
        }, 100);
    });
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

async function recoverUnifiedBatchState() {
    var batchIdInput = document.getElementById('unified_recover_batch_id_input');
    var batchId = batchIdInput ? batchIdInput.value.trim() : '';
    
    if (!batchId) {
        alert('请输入 Batch ID');
        return;
    }
    
    logUnifiedBatchMessage('正在恢复任务: ' + batchId);
    
    var result = await UnifiedBatch.batchEngine.recoverFromBatchId(
        batchId,
        function(progress) {
            logUnifiedBatchProgress(progress);
        },
        function(result) {
            handleUnifiedBatchComplete(result);
        }
    );
    
    if (result.success) {
        logUnifiedBatchMessage(result.message);
        document.getElementById('unified_batch_step3_download').disabled = false;
        document.getElementById('unified_auto_check_container').style.display = 'block';
    } else {
        logUnifiedBatchMessage('恢复失败: ' + (result.message || result.error));
    }
}

async function manualCheckUnifiedBatchStatus() {
    logUnifiedBatchMessage('手动检查状态...');
    
    var result = await UnifiedBatch.batchEngine.checkStatus();
    
    if (result.success) {
        logUnifiedBatchMessage('状态: ' + result.status);
        logUnifiedBatchProgress(result);
        
        if (result.status === 'completed') {
            document.getElementById('unified_batch_step3_download').disabled = false;
            logUnifiedBatchMessage('批处理已完成，可以下载结果');
        }
    } else {
        logUnifiedBatchMessage('检查失败: ' + (result.error || result.message));
    }
}

function stopUnifiedBatchAutoCheck() {
    UnifiedBatch.batchEngine.stopAutoCheck();
    logUnifiedBatchMessage('已停止自动检查');
    document.getElementById('unified_auto_check_container').style.display = 'none';
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
        var allInputs = ClassificationModule.state.getInputs();
        var selectedCheckboxes = document.querySelectorAll('.classification-input-checkbox:checked');
        
        if (selectedCheckboxes.length > 0) {
            count = selectedCheckboxes.length;
        } else {
            count = allInputs.length;
        }
        
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
            var allInputs = ClassificationModule.state.getInputs();
            var selectedCheckboxes = document.querySelectorAll('.classification-input-checkbox:checked');
            var count = selectedCheckboxes.length > 0 ? selectedCheckboxes.length : allInputs.length;
            mode = count < 50 ? 'async' : 'batch';
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
            var allInputs = ClassificationModule.state.getInputs();
            var selectedCheckboxes = document.querySelectorAll('.classification-input-checkbox:checked');
            var count = selectedCheckboxes.length > 0 ? selectedCheckboxes.length : allInputs.length;
            mode = count < 50 ? 'async' : 'batch';
        }
    }
    
    var asyncPanel = document.getElementById('classification_async_progress_panel');
    var batchPanel = document.getElementById('classification_batch_progress_panel');

    if (asyncPanel && batchPanel) {
        asyncPanel.style.display = mode === 'async' ? 'block' : 'none';
        batchPanel.style.display = mode === 'batch' ? 'block' : 'none';
    }
}

function updateClassificationBatchDetails(progress) {
    var detailsEl = document.getElementById('classification_batch_details');
    var detailsPanel = document.getElementById('classification_batch_details_panel');
    if (!detailsEl) return;
    
    if (detailsPanel) {
        detailsPanel.style.display = 'block';
    }
    
    var html = '<div class="batch-details-grid">';
    
    html += '<div class="detail-item"><span class="detail-label">任务ID:</span><span class="detail-value">' + (progress.id || '-') + '</span></div>';
    html += '<div class="detail-item"><span class="detail-label">状态:</span><span class="detail-value status-' + (progress.status || 'unknown') + '">' + getZhipuStatusText(progress.status) + '</span></div>';
    
    if (progress.endpoint) {
        html += '<div class="detail-item"><span class="detail-label">API端点:</span><span class="detail-value">' + progress.endpoint + '</span></div>';
    }
    
    if (progress.completionWindow) {
        html += '<div class="detail-item"><span class="detail-label">完成窗口:</span><span class="detail-value">' + progress.completionWindow + '</span></div>';
    }
    
    if (progress.createdAt) {
        html += '<div class="detail-item"><span class="detail-label">创建时间:</span><span class="detail-value">' + formatZhipuTimestamp(progress.createdAt) + '</span></div>';
    }
    
    if (progress.inProgressAt) {
        html += '<div class="detail-item"><span class="detail-label">开始处理:</span><span class="detail-value">' + formatZhipuTimestamp(progress.inProgressAt) + '</span></div>';
    }
    
    if (progress.expiresAt) {
        html += '<div class="detail-item"><span class="detail-label">过期时间:</span><span class="detail-value">' + formatZhipuTimestamp(progress.expiresAt) + '</span></div>';
    }
    
    if (progress.completedAt) {
        html += '<div class="detail-item"><span class="detail-label">完成时间:</span><span class="detail-value">' + formatZhipuTimestamp(progress.completedAt) + '</span></div>';
    }
    
    if (progress.failedAt) {
        html += '<div class="detail-item"><span class="detail-label">失败时间:</span><span class="detail-value">' + formatZhipuTimestamp(progress.failedAt) + '</span></div>';
    }
    
    var completed = progress.requestCounts?.completed || progress.completed || 0;
    var total = progress.requestCounts?.total || progress.total || 0;
    var failed = progress.requestCounts?.failed || progress.failed || 0;
    
    if (total > 0) {
        var percent = total > 0 ? Math.round((completed / total) * 100) : 0;
        html += '<div class="detail-item full-width"><span class="detail-label">处理进度:</span>';
        html += '<div class="progress-bar-container"><div class="progress-bar-fill" style="width: ' + percent + '%;"></div></div>';
        html += '<span class="detail-value">' + completed + '/' + total + ' (' + percent + '%)</span></div>';
        
        if (failed > 0) {
            html += '<div class="detail-item"><span class="detail-label">失败数量:</span><span class="detail-value status-failed">' + failed + '</span></div>';
        }
    }
    
    if (progress.inputFileId) {
        html += '<div class="detail-item"><span class="detail-label">输入文件ID:</span><span class="detail-value small-text">' + progress.inputFileId + '</span></div>';
    }
    
    if (progress.outputFileId) {
        html += '<div class="detail-item"><span class="detail-label">输出文件ID:</span><span class="detail-value small-text status-success">' + progress.outputFileId + '</span></div>';
    }
    
    if (progress.errorFileId) {
        html += '<div class="detail-item"><span class="detail-label">错误文件ID:</span><span class="detail-value small-text status-failed">' + progress.errorFileId + '</span></div>';
    }
    
    html += '</div>';
    
    detailsEl.innerHTML = html;
    detailsEl.style.display = 'block';
}
