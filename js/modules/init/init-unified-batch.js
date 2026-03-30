/**
 * 统一批量处理系统 - 初始化模块
 * 绑定UI事件和初始化状态
 */

function initUnifiedBatchModule() {
    console.log('[UnifiedBatch] 初始化模块...');

    const requiredElements = [
        'unified_excel_file',
        'unified_excel_sheet',
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
    initColumnMappingState();
}

function initColumnMappingState() {
    if (!UnifiedBatch.state.columnMappings) {
        UnifiedBatch.state.columnMappings = [];
    }
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
        const defaultZhipuModels = [
            { id: 'glm-4-flash', name: 'GLM-4-Flash', provider: 'zhipu' },
            { id: 'glm-4-long', name: 'GLM-4-Long', provider: 'zhipu' },
            { id: 'glm-4-plus', name: 'GLM-4-Plus', provider: 'zhipu' },
            { id: 'glm-4-air', name: 'GLM-4-Air', provider: 'zhipu' },
            { id: 'glm-z1-flash', name: 'GLM-Z1-Flash', provider: 'zhipu' },
            { id: 'glm-z1-air', name: 'GLM-Z1-Air', provider: 'zhipu' },
            { id: 'glm-5', name: 'GLM-5', provider: 'zhipu' }
        ];
        
        const defaultAliyunModels = [
            { id: 'qwen-flash', name: 'Qwen-Flash', provider: 'aliyun' },
            { id: 'qwen-turbo', name: 'Qwen-Turbo', provider: 'aliyun' },
            { id: 'qwen-plus', name: 'Qwen-Plus', provider: 'aliyun' },
            { id: 'qwen3-max', name: 'Qwen3-Max', provider: 'aliyun' },
            { id: 'qwq-plus', name: 'QwQ-Plus', provider: 'aliyun' },
            { id: 'deepseek-v3', name: 'DeepSeek-V3', provider: 'aliyun' },
            { id: 'kimi-k2.5', name: 'Kimi-K2.5', provider: 'aliyun' }
        ];
        
        availableModels = [...defaultZhipuModels, ...defaultAliyunModels];
    }
    
    availableModels.forEach(function(model) {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name;
        option.dataset.provider = model.provider;
        select.appendChild(option);
    });
    
    select.onchange = function() {
        var selectedModel = this.value;
        var template = UnifiedBatch.template.getCurrentTemplate();
        template.model = selectedModel;
        UnifiedBatch.template.setCurrentTemplate(template);
        console.log('[UnifiedBatch] 模型已实时更新为:', selectedModel);
        updateBatchProviderLabel(selectedModel);
    };
    
    var currentTemplate = UnifiedBatch.template.getCurrentTemplate();
    if (currentTemplate && currentTemplate.model) {
        select.value = currentTemplate.model;
    } else if (availableModels.length > 0) {
        select.value = availableModels[0].id;
        var template = UnifiedBatch.template.getCurrentTemplate();
        template.model = availableModels[0].id;
        UnifiedBatch.template.setCurrentTemplate(template);
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

function updateBatchProviderLabel(model) {
    var label = document.getElementById('unified_batch_provider_label');
    if (!label) return;
    
    var provider = 'zhipu';
    if (window.UnifiedBatch && UnifiedBatch.batchEngine) {
        provider = UnifiedBatch.batchEngine.getProviderForModel(model);
    }
    
    var providerName = provider === 'aliyun' ? '阿里云百炼' : '智谱AI';
    label.textContent = '(' + providerName + ' Batch API)';
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

    var loadDataBtn = document.getElementById('unified_load_data_btn');
    if (loadDataBtn) {
        loadDataBtn.addEventListener('click', handleUnifiedLoadData);
    }

    var saveTemplateBtn = document.getElementById('unified_save_template_btn');
    if (saveTemplateBtn) {
        saveTemplateBtn.addEventListener('click', saveUnifiedTemplate);
    }

    var publishTemplateBtn = document.getElementById('unified_publish_template_btn');
    if (publishTemplateBtn) {
        publishTemplateBtn.addEventListener('click', publishUnifiedTemplate);
    }

    var addColumnMappingBtn = document.getElementById('unified_add_column_mapping_btn');
    if (addColumnMappingBtn) {
        addColumnMappingBtn.addEventListener('click', handleAddColumnMapping);
    }

    var presetSelect = document.getElementById('unified_preset_template_select');
    if (presetSelect) {
        presetSelect.addEventListener('change', handleUnifiedTemplateSelect);
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

    var asyncExportBtn = document.getElementById('unified_async_export_btn');
    if (asyncExportBtn) {
        asyncExportBtn.addEventListener('click', exportUnifiedAsyncResults);
    }

    var batchStep1 = document.getElementById('unified_batch_step1_upload');
    if (batchStep1) {
        batchStep1.addEventListener('click', unifiedBatchStep1Upload);
    }

    var batchPreviewBtn = document.getElementById('unified_batch_preview_btn');
    if (batchPreviewBtn) {
        batchPreviewBtn.addEventListener('click', showUnifiedBatchPreview);
    }

    var batchCopyPreviewBtn = document.getElementById('unified_batch_copy_preview_btn');
    if (batchCopyPreviewBtn) {
        batchCopyPreviewBtn.addEventListener('click', copyUnifiedBatchPreview);
    }

    var batchDownloadPreviewBtn = document.getElementById('unified_batch_download_preview_btn');
    if (batchDownloadPreviewBtn) {
        batchDownloadPreviewBtn.addEventListener('click', downloadUnifiedBatchPreview);
    }

    var batchClosePreviewBtn = document.getElementById('unified_batch_close_preview_btn');
    if (batchClosePreviewBtn) {
        batchClosePreviewBtn.addEventListener('click', closeUnifiedBatchPreview);
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

    var selectAllBtn = document.getElementById('unified_inputs_select_all_btn');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', handleUnifiedSelectAll);
    }

    var deleteSelectedBtn = document.getElementById('unified_inputs_delete_selected_btn');
    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', handleUnifiedDeleteSelected);
    }

    var repExcelInput = document.getElementById('unified_rep_excel_input');
    if (repExcelInput) {
        repExcelInput.addEventListener('change', handleUnifiedRepExcelUpload);
    }

    var repJsonlInput = document.getElementById('unified_rep_jsonl_input');
    if (repJsonlInput) {
        repJsonlInput.addEventListener('change', handleUnifiedRepJsonlUpload);
    }
    
    console.log('[UnifiedBatch] 事件绑定完成');
}

async function handleUnifiedExcelUpload(event) {
    if (window.guestModeRestrictions && window.guestModeRestrictions.isGuestMode()) {
        alert('游客模式限制\n\n文件上传功能不可用\n\n请注册账号以使用完整功能');
        event.target.value = '';
        return;
    }
    
    var file = event.target.files[0];
    if (!file) return;

    try {
        var result = await UnifiedBatch.loadExcel(file);
        
        if (result.needsConfirmation) {
            var confirmMsg = result.message + '\n\n';
            confirmMsg += '现有文件: ' + result.existingFile.name + ' (' + result.existingFile.rows + '行)\n';
            confirmMsg += '新文件: ' + result.newFile.name + ' (' + formatFileSize(result.newFile.size) + ')';
            
            if (confirm(confirmMsg + '\n\n确定要替换吗？此操作不可撤销。')) {
                result = await UnifiedBatch.replaceExcelFile(file);
            } else {
                event.target.value = '';
                return;
            }
        }
        
        if (result.success) {
            updateUnifiedFileStatusDisplay(result.uploadState || result);
            
            var sheetSelect = document.getElementById('unified_excel_sheet');
            sheetSelect.innerHTML = '';
            result.sheets.forEach(function(sheet) {
                var option = document.createElement('option');
                option.value = sheet;
                option.textContent = sheet;
                sheetSelect.appendChild(option);
            });
            sheetSelect.disabled = false;

            sheetSelect.onchange = function() {
                var sheetResult = UnifiedBatch.loadSheet(this.value);
                if (sheetResult.success) {
                    renderUnifiedColumnMapping(sheetResult.headers);
                }
            };

            if (result.sheets.length > 0) {
                var sheetResult = UnifiedBatch.loadSheet(result.sheets[0]);
                if (sheetResult.success) {
                    renderUnifiedColumnMapping(sheetResult.headers);
                }
            }
        } else {
            alert(result.message || '加载Excel失败');
        }
    } catch (error) {
        alert('加载Excel失败: ' + error.message);
    }
}

function renderUnifiedColumnMapping(headers) {
    var indexColumnSelect = document.getElementById('unified_index_column');
    var mappingSection = document.getElementById('unified_column_mapping_section');
    var mappingContainer = document.getElementById('unified_column_mapping_container');
    
    if (indexColumnSelect) {
        indexColumnSelect.innerHTML = '<option value="">-- 选择索引列（可选）--</option>';
        headers.forEach(function(header) {
            var option = document.createElement('option');
            option.value = header;
            option.textContent = header;
            indexColumnSelect.appendChild(option);
        });
    }
    
    if (mappingSection) {
        mappingSection.style.display = 'block';
    }
    
    if (mappingContainer) {
        mappingContainer.innerHTML = '';
        UnifiedBatch.state.columnMappings = [];
        UnifiedBatch.state.excelHeaders = headers;
    }
    
    updatePlaceholderButtons(headers);
    updateColumnMappingStatus();
}

function handleAddColumnMapping() {
    var container = document.getElementById('unified_column_mapping_container');
    var headers = UnifiedBatch.state.excelHeaders || [];
    
    if (!container || headers.length === 0) return;
    
    var existingMappings = UnifiedBatch.state.columnMappings || [];
    var newIndex = existingMappings.length;
    
    if (newIndex >= 10) {
        alert('最多添加10个列映射');
        return;
    }
    
    var div = document.createElement('div');
    div.className = 'column-mapping-item';
    div.dataset.index = newIndex;
    div.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 10px; padding: 10px; background: var(--bg-color); border-radius: 8px;';
    
    var headerOptions = headers.map(function(h) { 
        return '<option value="' + h + '">' + h + '</option>'; 
    }).join('');
    
    div.innerHTML = `
        <span style="color: var(--text-color-secondary); min-width: 20px;">${newIndex + 1}.</span>
        <select class="column-source" style="flex: 1;" onchange="updateColumnMappingPlaceholder(this)">
            <option value="">-- 选择Excel列 --</option>
            ${headerOptions}
        </select>
        <span style="color: var(--text-color-tertiary);">→</span>
        <input type="text" class="column-placeholder" placeholder="占位符名称" style="width: 120px;" onchange="updateColumnMappingStatus()">
        <button class="small-button delete-button" type="button" onclick="removeColumnMapping(this)">删除</button>
    `;
    
    container.appendChild(div);
    
    existingMappings.push({ source: '', placeholder: '' });
    UnifiedBatch.state.columnMappings = existingMappings;
    
    updateColumnMappingStatus();
}

window.updateColumnMappingPlaceholder = function(select) {
    var div = select.closest('.column-mapping-item');
    var index = parseInt(div.dataset.index);
    var placeholderInput = div.querySelector('.column-placeholder');
    
    if (select.value && !placeholderInput.value) {
        placeholderInput.value = select.value;
    }
    
    updateColumnMappingStatus();
};

window.removeColumnMapping = function(btn) {
    var div = btn.closest('.column-mapping-item');
    var index = parseInt(div.dataset.index);
    
    if (div) {
        div.remove();
        var mappings = UnifiedBatch.state.columnMappings || [];
        mappings.splice(index, 1);
        UnifiedBatch.state.columnMappings = mappings;
        
        renumberColumnMappings();
        updateColumnMappingStatus();
        updatePlaceholderButtons(UnifiedBatch.state.excelHeaders || []);
    }
};

function renumberColumnMappings() {
    var container = document.getElementById('unified_column_mapping_container');
    if (!container) return;
    
    var items = container.querySelectorAll('.column-mapping-item');
    items.forEach(function(item, index) {
        item.dataset.index = index;
        var span = item.querySelector('span');
        if (span) {
            span.textContent = (index + 1) + '.';
        }
    });
}

function updateColumnMappingStatus() {
    var statusEl = document.getElementById('unified_column_mapping_status');
    var loadDataBtn = document.getElementById('unified_load_data_btn');
    
    var mappings = getColumnMappings();
    var validMappings = mappings.filter(function(m) { return m.source && m.placeholder; });
    
    if (statusEl) {
        if (validMappings.length === 0) {
            statusEl.textContent = '请添加列映射';
            statusEl.style.color = 'var(--text-color-tertiary)';
        } else {
            statusEl.textContent = '已配置 ' + validMappings.length + ' 个列映射';
            statusEl.style.color = 'var(--success-color)';
        }
    }
    
    if (loadDataBtn) {
        loadDataBtn.disabled = validMappings.length === 0;
    }
    
    UnifiedBatch.state.columnMappings = mappings;
    updatePlaceholderButtons(UnifiedBatch.state.excelHeaders || []);
}

function getColumnMappings() {
    var container = document.getElementById('unified_column_mapping_container');
    if (!container) return [];
    
    var items = container.querySelectorAll('.column-mapping-item');
    var mappings = [];
    
    items.forEach(function(item) {
        var source = item.querySelector('.column-source')?.value || '';
        var placeholder = item.querySelector('.column-placeholder')?.value || '';
        mappings.push({ source: source, placeholder: placeholder });
    });
    
    return mappings;
}

function updatePlaceholderButtons(headers) {
    var section = document.getElementById('unified_placeholder_buttons_section');
    var container = document.getElementById('unified_placeholder_buttons');
    
    if (!section || !container) return;
    
    var mappings = getColumnMappings();
    var validMappings = mappings.filter(function(m) { return m.source && m.placeholder; });
    
    if (validMappings.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    container.innerHTML = '';
    
    validMappings.forEach(function(mapping) {
        var btn = document.createElement('button');
        btn.className = 'small-button';
        btn.type = 'button';
        btn.style.fontSize = '0.85em';
        btn.textContent = '{{' + mapping.placeholder + '}}';
        btn.onclick = function() {
            insertPlaceholderToPrompt('{{' + mapping.placeholder + '}}');
        };
        container.appendChild(btn);
    });
}

async function handleUnifiedLoadData() {
    var indexColumn = document.getElementById('unified_index_column')?.value || '';
    var mappings = getColumnMappings();
    var validMappings = mappings.filter(function(m) { return m.source && m.placeholder; });
    
    if (validMappings.length === 0) {
        alert('请至少配置一个列映射');
        return;
    }
    
    var template = UnifiedBatch.template.getCurrentTemplate();
    if (!template.systemPrompt) {
        alert('请配置系统提示');
        return;
    }
    
    var userPrompt = document.getElementById('unified_user_prompt')?.value || '';
    if (!userPrompt) {
        alert('请配置用户提示模板');
        return;
    }
    
    var warning = UnifiedBatch.input.getDataVolumeWarning();
    if (warning) {
        showUnifiedDataWarning(warning);
    }
    
    showUnifiedLoadingProgress('正在加载数据...');
    
    var sourceColumns = validMappings.map(function(m) { return m.source; });
    
    var onProgress = function(progress) {
        updateUnifiedLoadingProgress(progress);
    };
    
    var result = await UnifiedBatch.loadInputsFromColumns(sourceColumns, onProgress);
    
    if (result.success) {
        UnifiedBatch.state.columnMappings = validMappings;
        UnifiedBatch.state.indexColumn = indexColumn;
        
        template.columnMappings = validMappings;
        template.indexColumn = indexColumn;
        UnifiedBatch.template.setCurrentTemplate(template);
        
        showDataPreview();
        hideUnifiedLoadingProgress();
        
        switchUnifiedSubTab('mode', document.querySelector('.step-item:nth-child(2)'));
        updateUnifiedModeRecommendation();
    } else {
        hideUnifiedLoadingProgress();
        alert(result.message);
    }
}

function showDataPreview() {
    var section = document.getElementById('unified_data_preview_section');
    var container = document.getElementById('unified_data_preview_container');
    var countEl = document.getElementById('unified_preview_count');
    
    if (!section || !container) return;
    
    var inputs = UnifiedBatch.getInputs();
    var mappings = UnifiedBatch.state.columnMappings || [];
    
    section.style.display = 'block';
    
    if (countEl) {
        countEl.textContent = '(共 ' + inputs.length + ' 条数据)';
    }
    
    var previewCount = Math.min(5, inputs.length);
    var html = '';
    
    for (var i = 0; i < previewCount; i++) {
        var input = inputs[i];
        html += '<div style="background: var(--bg-color); padding: 12px; border-radius: 8px; margin-bottom: 10px;">';
        html += '<div style="font-weight: 500; margin-bottom: 8px; color: var(--primary-color);">第 ' + (i + 1) + ' 条';
        if (input.id) {
            html += ' (ID: ' + input.id + ')';
        }
        html += '</div>';
        
        if (typeof input.content === 'object') {
            Object.keys(input.content).forEach(function(key) {
                var val = String(input.content[key] || '');
                if (val.length > 100) val = val.substring(0, 100) + '...';
                html += '<div style="font-size: 0.9em; margin-bottom: 4px;"><strong>' + key + ':</strong> ' + val + '</div>';
            });
        } else {
            var content = String(input.content || '');
            if (content.length > 200) content = content.substring(0, 200) + '...';
            html += '<div style="font-size: 0.9em; color: var(--text-color-secondary);">' + content + '</div>';
        }
        
        html += '</div>';
    }
    
    if (inputs.length > 5) {
        html += '<div style="text-align: center; color: var(--text-color-tertiary); font-size: 0.9em;">... 还有 ' + (inputs.length - 5) + ' 条数据</div>';
    }
    
    container.innerHTML = html;
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function updateUnifiedFileStatusDisplay(uploadState) {
    var statusEl = document.getElementById('unified_file_status');
    if (!statusEl) {
        var container = document.getElementById('unified-input-excel');
        if (container) {
            statusEl = document.createElement('div');
            statusEl.id = 'unified_file_status';
            statusEl.className = 'file-status-info';
            statusEl.style.cssText = 'margin-top: 10px; padding: 10px; background: var(--bg-color-secondary); border-radius: 6px; font-size: 13px;';
            container.insertBefore(statusEl, container.firstChild.nextSibling);
        }
    }
    
    if (statusEl && uploadState) {
        var uploadTime = uploadState.uploadTime ? new Date(uploadState.uploadTime).toLocaleString() : '未知';
        statusEl.innerHTML = 
            '<div style="display: flex; justify-content: space-between; align-items: center;">' +
            '<span><strong>📄 当前文件:</strong> ' + (uploadState.currentFileName || '未加载') + '</span>' +
            '<span><strong>数据行数:</strong> ' + (uploadState.totalRows || 0) + '</span>' +
            '</div>' +
            '<div style="margin-top: 5px; color: var(--text-color-secondary);">' +
            '<span>上传时间: ' + uploadTime + '</span>' +
            (uploadState.version > 1 ? '<span style="margin-left: 15px;">版本: v' + uploadState.version + '</span>' : '') +
            '</div>';
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
    
    var warning = UnifiedBatch.input.getDataVolumeWarning();
    if (warning) {
        showUnifiedDataWarning(warning);
    }
    
    showUnifiedLoadingProgress('正在加载数据...');
    
    var onProgress = function(progress) {
        updateUnifiedLoadingProgress(progress);
    };
    
    if (concatColumns.length > 0) {
        var result = await UnifiedBatch.loadInputsFromConfig(indexColumn, concatColumns, onProgress);
        hideUnifiedLoadingProgress();
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

    var result = await UnifiedBatch.loadInputsFromColumns(selectedColumns, onProgress);
    hideUnifiedLoadingProgress();
    if (result.success) {
        renderUnifiedInputsList();
        updateUnifiedModeRecommendation();
        alert(result.message);
    } else {
        alert(result.message);
    }
}

function showUnifiedDataWarning(warning) {
    var warningEl = document.getElementById('unified_data_warning');
    if (!warningEl) {
        var container = document.getElementById('unified-input-excel');
        if (container) {
            warningEl = document.createElement('div');
            warningEl.id = 'unified_data_warning';
            warningEl.className = 'data-warning';
            warningEl.style.cssText = 'margin: 10px 0; padding: 12px; border-radius: 6px; font-size: 13px;';
            container.insertBefore(warningEl, container.firstChild.nextSibling);
        }
    }
    
    if (warningEl) {
        var bgColor = warning.level === 'high' ? 'var(--error-color-light, #fff3cd)' : 'var(--warning-color-light, #e7f3ff)';
        var borderColor = warning.level === 'high' ? 'var(--error-color)' : 'var(--warning-color, #0066cc)';
        
        warningEl.style.background = bgColor;
        warningEl.style.border = '1px solid ' + borderColor;
        warningEl.innerHTML = 
            '<div style="display: flex; align-items: center; gap: 8px;">' +
            '<span style="font-size: 16px;">⚠️</span>' +
            '<div>' +
            '<strong>数据量提示</strong><br>' +
            warning.message +
            (warning.recommendation ? '<br><small style="color: var(--text-color-secondary);">推荐模式: ' + 
                (warning.recommendation === 'batch' ? '大批量延时模式' : '异步处理模式') + '</small>' : '') +
            '</div></div>';
    }
}

function showUnifiedLoadingProgress(message) {
    var progressEl = document.getElementById('unified_loading_progress');
    if (!progressEl) {
        var container = document.getElementById('unified_batch-tab');
        if (container) {
            progressEl = document.createElement('div');
            progressEl.id = 'unified_loading_progress';
            progressEl.className = 'loading-progress-overlay';
            progressEl.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;';
            document.body.appendChild(progressEl);
        }
    }
    
    if (progressEl) {
        progressEl.innerHTML = 
            '<div style="background: var(--bg-color); padding: 24px 32px; border-radius: 12px; text-align: center; min-width: 300px;">' +
            '<div class="spinner" style="width: 40px; height: 40px; margin: 0 auto 16px; border: 3px solid var(--border-color); border-top-color: var(--primary-color); border-radius: 50%; animation: spin 1s linear infinite;"></div>' +
            '<div id="unified_loading_message" style="font-size: 14px; color: var(--text-color);">' + message + '</div>' +
            '<div id="unified_loading_detail" style="font-size: 12px; color: var(--text-color-secondary); margin-top: 8px;"></div>' +
            '</div>';
        progressEl.style.display = 'flex';
    }
}

function updateUnifiedLoadingProgress(progress) {
    var messageEl = document.getElementById('unified_loading_message');
    var detailEl = document.getElementById('unified_loading_detail');
    
    if (messageEl && progress.message) {
        messageEl.textContent = progress.message;
    }
    
    if (detailEl && progress.progress !== undefined) {
        detailEl.innerHTML = '<div style="background: var(--bg-color-secondary); border-radius: 4px; height: 8px; margin-top: 12px; overflow: hidden;">' +
            '<div style="background: var(--primary-color); height: 100%; width: ' + progress.progress + '%; transition: width 0.3s;"></div>' +
            '</div>' +
            '<span style="margin-top: 4px; display: inline-block;">' + progress.progress + '%</span>';
    }
}

function hideUnifiedLoadingProgress() {
    var progressEl = document.getElementById('unified_loading_progress');
    if (progressEl) {
        progressEl.style.display = 'none';
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
        
        return '<div class="input-item-strip" data-index="' + index + '" onclick="showUnifiedInputPreview(' + index + ')">' +
            '<input type="checkbox" class="unified-input-checkbox strip-checkbox" data-id="' + input.id + '" onclick="event.stopPropagation()">' +
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
    updateUnifiedInputsCount();
}

window.goToUnifiedInputsPage = function(page) {
    renderUnifiedInputsPage(page);
};

function truncateUnifiedText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function handleUnifiedSelectAll() {
    var selectAllBtn = document.getElementById('unified_inputs_select_all_btn');
    
    if (!selectAllBtn) return;
    
    var allInputs = window.UnifiedBatch ? UnifiedBatch.getInputs() : [];
    
    if (allInputs.length === 0) {
        alert('没有可选择的输入数据');
        return;
    }
    
    var state = window.UnifiedBatch ? UnifiedBatch.state : null;
    if (!state) return;
    
    var isAllSelected = state.selectAllMode === true;
    
    if (isAllSelected) {
        state.selectAllMode = false;
        state.selectedInputIds = [];
        selectAllBtn.textContent = '全选';
        selectAllBtn.style.background = '';
    } else {
        state.selectAllMode = true;
        state.selectedInputIds = allInputs.map(function(input) {
            return input.id;
        });
        selectAllBtn.textContent = '取消全选(' + allInputs.length + ')';
        selectAllBtn.style.background = '#e6f7ff';
    }
    
    var checkboxes = document.querySelectorAll('.unified-input-checkbox');
    checkboxes.forEach(function(checkbox) {
        checkbox.checked = state.selectAllMode;
    });
    
    updateUnifiedInputsCount();
}

function updateUnifiedInputsCount() {
    var countEl = document.getElementById('unified_inputs_count');
    var allInputs = window.UnifiedBatch ? UnifiedBatch.getInputs() : [];
    var state = window.UnifiedBatch ? UnifiedBatch.state : null;
    
    var checkedCount = 0;
    var totalCount = allInputs.length;
    
    if (state && state.selectAllMode) {
        checkedCount = state.selectedInputIds.length;
    } else {
        var checkboxes = document.querySelectorAll('.unified-input-checkbox:checked');
        checkedCount = checkboxes.length;
    }
    
    if (countEl) {
        countEl.textContent = checkedCount + '/' + totalCount;
    }
}

function showUnifiedInputPreview(index) {
    var data = window._unifiedInputsData;
    if (!data || !data.inputs[index]) return;
    
    var input = data.inputs[index];
    var fullContent = '';
    
    if (input.rawContent) {
        var entries = Object.entries(input.rawContent);
        fullContent = entries.map(function([k, v]) {
            return '<div class="preview-row">' +
                '<span class="preview-label">' + k + ':</span>' +
                '<span class="preview-value">' + String(v || '') + '</span>' +
            '</div>';
        }).join('');
    } else if (typeof input.content === 'string') {
        fullContent = '<div class="preview-row"><span class="preview-value">' + input.content + '</span></div>';
    } else if (typeof input.content === 'object') {
        var entries = Object.entries(input.content);
        fullContent = entries.map(function([k, v]) {
            return '<div class="preview-row">' +
                '<span class="preview-label">' + k + ':</span>' +
                '<span class="preview-value">' + String(v || '') + '</span>' +
            '</div>';
        }).join('');
    }
    
    var previewPanel = document.getElementById('unified_input_preview_panel');
    if (!previewPanel) {
        previewPanel = document.createElement('div');
        previewPanel.id = 'unified_input_preview_panel';
        previewPanel.className = 'strip-preview';
        previewPanel.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 8px; padding: 20px; max-width: 800px; max-height: 80vh; overflow-y: auto; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: none;';
        document.body.appendChild(previewPanel);
        
        var overlay = document.createElement('div');
        overlay.id = 'unified_input_preview_overlay';
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999; display: none;';
        overlay.onclick = function() { hideUnifiedInputPreview(); };
        document.body.appendChild(overlay);
    }
    
    previewPanel.innerHTML = `
        <div class="preview-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid var(--border-color);">
            <span class="preview-title" style="font-weight: bold; font-size: 16px;">数据详情 - ${input.id || '第' + (index + 1) + '条'}</span>
            <button class="close-preview" onclick="hideUnifiedInputPreview()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-color);">&times;</button>
        </div>
        <div class="preview-body" style="max-height: 60vh; overflow-y: auto;">
            ${fullContent}
        </div>
    `;
    
    previewPanel.style.display = 'block';
    document.getElementById('unified_input_preview_overlay').style.display = 'block';
}

function hideUnifiedInputPreview() {
    var previewPanel = document.getElementById('unified_input_preview_panel');
    var overlay = document.getElementById('unified_input_preview_overlay');
    
    if (previewPanel) {
        previewPanel.style.display = 'none';
    }
    if (overlay) {
        overlay.style.display = 'none';
    }
}

window.showUnifiedInputPreview = showUnifiedInputPreview;
window.hideUnifiedInputPreview = hideUnifiedInputPreview;

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
        
        var insertModeSelect = document.getElementById('unified_insert_mode');
        if (insertModeSelect) {
            insertModeSelect.value = template.insertMode || 'merged';
            handleUnifiedInsertModeChange();
        }
        
        var mergedIntroInput = document.getElementById('unified_merged_intro');
        if (mergedIntroInput) {
            mergedIntroInput.value = template.mergedIntro || '以下是相关内容：';
        }

        renderUnifiedOutputFields(template.outputFields || []);
        renderUnifiedFieldMappings(template.fieldMappings || []);
    }
}

function handleUnifiedInsertModeChange() {
    var insertMode = document.getElementById('unified_insert_mode')?.value || 'merged';
    var separateConfig = document.getElementById('unified_separate_config');
    var mergedConfig = document.getElementById('unified_merged_config');
    
    if (separateConfig) {
        separateConfig.style.display = insertMode === 'separate' ? 'block' : 'none';
    }
    if (mergedConfig) {
        mergedConfig.style.display = insertMode === 'merged' ? 'block' : 'none';
    }
    
    UnifiedBatch.template.setInsertMode(insertMode);
}

function renderUnifiedFieldMappings(mappings) {
    var container = document.getElementById('unified_field_mappings_container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!mappings || mappings.length === 0) {
        container.innerHTML = '<div class="info-text">请先在Excel列配置中选择要使用的列，然后点击"自动生成映射"</div>';
        return;
    }
    
    mappings.forEach(function(mapping, index) {
        var div = document.createElement('div');
        div.className = 'field-mapping-item';
        div.innerHTML = 
            '<div class="mapping-row">' +
            '<span class="mapping-column">列: ' + mapping.column + '</span>' +
            '<span class="mapping-arrow">→</span>' +
            '<input type="text" class="mapping-placeholder" value="' + mapping.placeholder + '" ' +
            'onchange="updateUnifiedFieldMapping(' + index + ', \'placeholder\', this.value)" placeholder="占位符">' +
            '</div>' +
            '<input type="text" class="mapping-desc" value="' + (mapping.description || '') + '" ' +
            'onchange="updateUnifiedFieldMapping(' + index + ', \'description\', this.value)" placeholder="字段描述（可选）">' +
            '<button class="small-button delete-button" onclick="removeUnifiedFieldMapping(' + index + ')">删除</button>';
        container.appendChild(div);
    });
}

function autoGenerateUnifiedFieldMappings() {
    var selectedColumns = getUnifiedSelectedConcatColumns();
    if (selectedColumns.length === 0) {
        alert('请先在Excel列配置中选择要使用的列');
        return;
    }
    
    UnifiedBatch.template.autoGenerateFieldMappings(selectedColumns);
    renderUnifiedFieldMappings(UnifiedBatch.template.getFieldMappings());
}

function updateUnifiedFieldMapping(index, property, value) {
    var mappings = UnifiedBatch.template.getFieldMappings();
    if (mappings[index]) {
        mappings[index][property] = value;
    }
}

function removeUnifiedFieldMapping(index) {
    UnifiedBatch.template.removeFieldMappingByIndex(index);
    renderUnifiedFieldMappings(UnifiedBatch.template.getFieldMappings());
}

function insertPlaceholderToPrompt(placeholder) {
    var textarea = document.getElementById('unified_user_prompt');
    var start = textarea.selectionStart;
    var end = textarea.selectionEnd;
    var text = textarea.value;
    textarea.value = text.substring(0, start) + placeholder + text.substring(end);
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + placeholder.length;
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
    var columnMappings = getColumnMappings();
    var validMappings = columnMappings.filter(function(m) { return m.source && m.placeholder; });
    
    var template = {
        name: document.getElementById('unified_template_name').value,
        systemPrompt: document.getElementById('unified_system_prompt').value,
        userPromptTemplate: document.getElementById('unified_user_prompt').value,
        model: document.getElementById('unified_template_model_select').value,
        temperature: parseFloat(document.getElementById('unified_template_temperature').value) || 0.1,
        outputFields: UnifiedBatch.template.getOutputFields(),
        columnMappings: validMappings,
        indexColumn: document.getElementById('unified_index_column')?.value || ''
    };

    UnifiedBatch.setCurrentTemplate(template);
    var result = UnifiedBatch.saveTemplate();
    
    if (result.success) {
        populateUnifiedTemplateSelect();
        renderUnifiedTemplatesList();
    }
    
    alert(result.message);
}

function publishUnifiedTemplate() {
    var templateName = document.getElementById('unified_template_name').value;
    var systemPrompt = document.getElementById('unified_system_prompt').value;
    var userPromptTemplate = document.getElementById('unified_user_prompt').value;
    var outputFields = UnifiedBatch.template.getOutputFields();
    var model = document.getElementById('unified_template_model_select').value;
    var temperature = parseFloat(document.getElementById('unified_template_temperature').value) || 0.1;
    var columnMappings = getColumnMappings();
    var validMappings = columnMappings.filter(function(m) { return m.source && m.placeholder; });
    
    if (!systemPrompt && !userPromptTemplate) {
        alert('请先配置系统提示或用户提示模板');
        return;
    }
    
    var content = '';
    if (systemPrompt) {
        content += '【系统提示】\n' + systemPrompt;
    }
    if (userPromptTemplate) {
        if (content) content += '\n\n';
        content += '【用户提示模板】\n' + userPromptTemplate;
    }
    if (validMappings.length > 0) {
        content += '\n\n【占位符映射】\n';
        validMappings.forEach(function(m) {
            content += '{{' + m.placeholder + '}} ← Excel列: ' + m.source + '\n';
        });
    }
    if (outputFields && outputFields.length > 0) {
        content += '\n\n【输出字段】\n';
        outputFields.forEach(function(f) {
            content += '- ' + f.name + (f.description ? ': ' + f.description : '') + '\n';
        });
    }
    if (model) {
        content += '\n\n【模型配置】\n';
        content += '模型: ' + model + '\n';
        content += '温度: ' + temperature;
    }
    
    if (!content.trim()) {
        alert('模板内容为空，无法发布');
        return;
    }
    
    if (window.PromptForum && window.PromptForum.quickPublish) {
        window.PromptForum.quickPublish({
            title: templateName || '批量处理模板',
            content: content,
            description: '通用批量处理模板 - 适用于Excel数据批量处理',
            categoryId: '',
            tags: '批量处理,模板' + (model ? ',' + model : '')
        });
    } else {
        alert('提示词广场模块未加载，请刷新页面后重试');
    }
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
    if (window.guestModeRestrictions && !window.guestModeRestrictions.checkBatchAnalysis()) {
        return;
    }
    
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
        renderUnifiedInstantResults();
    };

    var result = await UnifiedBatch.startProcessing(onProgress, onComplete, selectedIds);
    if (!result.success) {
        alert(result.message);
        if (submitBtn) submitBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;
    }
}

async function testUnifiedThreeInputs() {
    if (window.guestModeRestrictions && !window.guestModeRestrictions.checkBatchAnalysis()) {
        return;
    }
    
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
        renderUnifiedInstantResults();
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

function renderUnifiedInstantResults() {
    var tbody = document.getElementById('unified_instant_results_tbody');
    if (!tbody) return;

    var results = UnifiedBatch.getResults();
    var inputs = UnifiedBatch.getInputs();
    tbody.innerHTML = '';

    var inputOrderMap = {};
    inputs.forEach(function(input, index) {
        inputOrderMap[input.id] = index;
    });

    var sortedResults = results.slice().sort(function(a, b) {
        var orderA = inputOrderMap[a.inputId] !== undefined ? inputOrderMap[a.inputId] : 999999;
        var orderB = inputOrderMap[b.inputId] !== undefined ? inputOrderMap[b.inputId] : 999999;
        return orderA - orderB;
    });

    sortedResults.forEach(function(result) {
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
            default:
                statusText = '处理中';
                statusClass = 'status-processing';
        }

        var input = inputs.find(function(i) { return i.id === result.inputId; });
        var inputPreview = input 
            ? (typeof input.content === 'string' ? input.content.substring(0, 30) + '...' : '多列数据')
            : '-';

        tr.innerHTML = '<td style="text-align: center;">' + (result.requestId || '-') + '</td>' +
            '<td style="text-align: center;">' + inputPreview + '</td>' +
            '<td style="text-align: center;">' + (result.templateName || '-') + '</td>' +
            '<td class="' + statusClass + '" style="text-align: center;">' + statusText + '</td>' +
            '<td style="text-align: center;">' + (result.usage?.total_tokens || '-') + '</td>' +
            '<td style="word-break: break-word; white-space: pre-wrap; max-width: 400px;">' + (result.result || result.error || '-') + '</td>';
        
        tbody.appendChild(tr);
    });

    var exportBtn = document.getElementById('unified_instant_export_btn');
    if (exportBtn) {
        exportBtn.disabled = results.length === 0;
    }
}

async function startUnifiedAsyncProcessing() {
    if (window.guestModeRestrictions && !window.guestModeRestrictions.checkBatchAnalysis()) {
        return;
    }
    
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
        renderUnifiedAsyncResults();
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
    var inputs = UnifiedBatch.getInputs();
    tbody.innerHTML = '';

    var inputOrderMap = {};
    inputs.forEach(function(input, index) {
        inputOrderMap[input.id] = index;
    });

    var sortedResults = results.slice().sort(function(a, b) {
        var orderA = inputOrderMap[a.inputId] !== undefined ? inputOrderMap[a.inputId] : 999999;
        var orderB = inputOrderMap[b.inputId] !== undefined ? inputOrderMap[b.inputId] : 999999;
        return orderA - orderB;
    });

    sortedResults.forEach(function(result) {
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
    if (window.guestModeRestrictions && !window.guestModeRestrictions.checkBatchAnalysis()) {
        return;
    }
    
    var state = UnifiedBatch.state;
    var allInputs = (state && state.inputs) || [];
    var selectAllMode = state.selectAllMode;
    
    var selectedInputs = [];
    var selectedIds = [];
    
    if (selectAllMode && state.selectedInputIds && state.selectedInputIds.length > 0) {
        selectedInputs = allInputs.filter(function(input) {
            return state.selectedInputIds.includes(input.id);
        });
        selectedIds = state.selectedInputIds.slice();
    }
    else {
        var checkboxes = document.querySelectorAll('.unified-input-checkbox:checked');
        selectedIds = Array.from(checkboxes).map(function(cb) { return cb.dataset.id; });
        
        selectedInputs = allInputs.filter(function(input) {
            return selectedIds.includes(input.id);
        });
    }
    
    if (selectedInputs.length === 0) {
        logUnifiedBatchMessage('上传失败: 没有选中任何输入数据');
        return;
    }
    
    var template = UnifiedBatch.template.getCurrentTemplate();
    if (!template || !template.systemPrompt) {
        logUnifiedBatchMessage('上传失败: 请先配置模板');
        return;
    }
    
    var confirmed = await showBatchUploadConfirmation(selectedInputs, template);
    if (!confirmed) {
        logUnifiedBatchMessage('用户取消上传');
        return;
    }
    
    UnifiedBatch.batchEngine.generateJsonl(selectedInputs, template);
    
    var result = await UnifiedBatch.batchEngine.uploadJsonl(template.model);
    if (result.success) {
        document.getElementById('unified_batch_step2_create').disabled = false;
        logUnifiedBatchMessage('文件上传成功，File ID: ' + result.fileId + '，共 ' + selectedInputs.length + ' 条数据');
    } else {
        logUnifiedBatchMessage('上传失败: ' + (result.error || result.message));
    }
}

function showBatchUploadConfirmation(inputs, template) {
    return new Promise(function(resolve) {
        var previewCount = Math.min(3, inputs.length);
        var previewHtml = '';
        
        for (var i = 0; i < previewCount; i++) {
            var input = inputs[i];
            var contentPreview = '';
            
            if (typeof input.content === 'string') {
                contentPreview = input.content.length > 200 
                    ? input.content.substring(0, 200) + '...' 
                    : input.content;
            } else if (typeof input.content === 'object') {
                var parts = [];
                Object.keys(input.content).forEach(function(key) {
                    var val = String(input.content[key] || '');
                    if (val.length > 100) val = val.substring(0, 100) + '...';
                    parts.push('<strong>' + key + ':</strong> ' + val);
                });
                contentPreview = parts.join('<br>');
            }
            
            previewHtml += '<div class="preview-item" style="background: var(--bg-color-secondary); padding: 12px; border-radius: 6px; margin-bottom: 10px;">';
            previewHtml += '<div style="font-weight: 500; margin-bottom: 8px; color: var(--primary-color);">第 ' + (i + 1) + ' 条 (ID: ' + input.id + ')</div>';
            previewHtml += '<div style="font-size: 0.9em; color: var(--text-color-secondary); white-space: pre-wrap; word-break: break-all;">' + contentPreview + '</div>';
            previewHtml += '</div>';
        }
        
        var modelSelect = document.getElementById('unified_template_model_select');
        var modelName = modelSelect ? modelSelect.options[modelSelect.selectedIndex]?.text || template.model : template.model;
        var provider = UnifiedBatch.batchEngine.getProviderForModel(template.model);
        var providerName = provider === 'aliyun' ? '阿里云百炼' : '智谱AI';
        
        var modalHtml = '<div id="batch_upload_confirm_modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;">';
        modalHtml += '<div style="background: var(--bg-color); border-radius: 12px; padding: 24px; max-width: 700px; max-height: 80vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">';
        modalHtml += '<h3 style="margin: 0 0 16px; color: var(--primary-color); display: flex; align-items: center; gap: 8px;">';
        modalHtml += '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16"><path d="M9.05.435c-.58-.621-1.595-.481-1.986.36l-.578 1.159a1.28 1.28 0 0 1-.898.658l-1.285.213a1.25 1.25 0 0 0-.912 1.788l.643 1.143a1.25 1.25 0 0 1 0 1.248l-.643 1.143a1.25 1.25 0 0 0 .912 1.788l1.285.213a1.28 1.28 0 0 1 .898.658l.578 1.159c.39.84 1.406.98 1.986.36l.944-.944a1.28 1.28 0 0 1 .912-.373h1.285c.84 0 1.468-.804 1.267-1.62l-.344-1.372a1.25 1.25 0 0 1 .344-1.18l.944-.944c.621-.58.481-1.595-.36-1.986l-1.159-.578a1.28 1.28 0 0 1-.658-.898l-.213-1.285A1.25 1.25 0 0 0 11.9.435h-1.285a1.28 1.28 0 0 1-.912-.373L9.05.435ZM8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4Z"/></svg>';
        modalHtml += '批量请求确认</h3>';
        
        modalHtml += '<div style="background: linear-gradient(135deg, var(--primary-color), var(--accent-color, #667eea)); color: white; padding: 16px; border-radius: 8px; margin-bottom: 16px;">';
        modalHtml += '<div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 16px;">';
        modalHtml += '<div><span style="opacity: 0.8;">请求数量</span><div style="font-size: 1.5em; font-weight: bold;">' + inputs.length + ' 条</div></div>';
        modalHtml += '<div><span style="opacity: 0.8;">服务商</span><div style="font-size: 1.2em; font-weight: bold;">' + providerName + '</div></div>';
        modalHtml += '<div><span style="opacity: 0.8;">模型</span><div style="font-size: 1.2em; font-weight: bold;">' + modelName + '</div></div>';
        modalHtml += '</div></div>';
        
        modalHtml += '<div style="margin-bottom: 16px;">';
        modalHtml += '<div style="font-weight: 500; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">';
        modalHtml += '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M.54 3.87.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3H14a2 2 0 0 1 2 2v3H0V5a2 2 0 0 1 1.54-1.95ZM0 9h16v5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V9Z"/></svg>';
        modalHtml += '前 ' + previewCount + ' 条请求预览';
        modalHtml += '</div>';
        modalHtml += previewHtml;
        if (inputs.length > 3) {
            modalHtml += '<div style="text-align: center; color: var(--text-color-tertiary); font-size: 0.9em;">... 还有 ' + (inputs.length - 3) + ' 条数据</div>';
        }
        modalHtml += '</div>';
        
        modalHtml += '<div style="display: flex; gap: 12px; justify-content: flex-end;">';
        modalHtml += '<button id="batch_confirm_cancel" class="small-button" style="padding: 10px 24px;">取消</button>';
        modalHtml += '<button id="batch_confirm_ok" class="small-button" style="background: var(--primary-color); color: white; padding: 10px 24px;">确认上传</button>';
        modalHtml += '</div></div></div>';
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        var modal = document.getElementById('batch_upload_confirm_modal');
        document.getElementById('batch_confirm_cancel').onclick = function() {
            modal.remove();
            resolve(false);
        };
        document.getElementById('batch_confirm_ok').onclick = function() {
            modal.remove();
            resolve(true);
        };
        modal.onclick = function(e) {
            if (e.target === modal) {
                modal.remove();
                resolve(false);
            }
        };
    });
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
    var stateObj = UnifiedBatch.state;
    var actualState = stateObj ? stateObj.state : null;
    var reporter = actualState ? actualState.reporter : null;
    
    var originalData = reporter && reporter.sheetData ? reporter.sheetData : actualState.currentSheetData;
    if (!originalData) {
        alert('请先上传原始Excel文件');
        return;
    }

    var jsonlContent = reporter && reporter.jsonlData ? reporter.jsonlData : (actualState.batchTask ? actualState.batchTask.resultContent : null);
    if (!jsonlContent) {
        alert('请先加载Batch响应结果文件');
        return;
    }

    if (!reporter || !reporter.jsonlData) {
        actualState.batchTask.resultContent = jsonlContent;
    }

    var result = UnifiedBatch.batchEngine.generateReport(originalData);
    if (result.success) {
        var previewEl = document.getElementById('unified_rep_output_preview');
        if (previewEl) {
            previewEl.style.display = 'block';
            previewEl.textContent = '解析完成！共 ' + result.data.length + ' 条结果\n字段: ' + result.headers.join(', ');
        }
        document.getElementById('unified_download_report_btn').style.display = 'inline-block';
        logUnifiedBatchMessage('报告生成成功，共 ' + result.data.length + ' 条结果');
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
    window.showUnifiedBatchPreview = showUnifiedBatchPreview;
    window.copyUnifiedBatchPreview = copyUnifiedBatchPreview;
    window.downloadUnifiedBatchPreview = downloadUnifiedBatchPreview;
    window.closeUnifiedBatchPreview = closeUnifiedBatchPreview;
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
            
            var configTab = document.getElementById('classification-sub-tab-config');
            if (configTab) {
                document.querySelectorAll('#unified-classification-mode-panel .sub-tab-content').forEach(function(content) {
                    content.classList.remove('active');
                });
                configTab.classList.add('active');
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

function updateClassificationModeCardStyles() {
    var currentMode = 'async';
    if (typeof ClassificationModule !== 'undefined') {
        currentMode = ClassificationModule.state.getMode();
    }
    
    var modes = ['instant', 'async', 'batch'];
    modes.forEach(function(m) {
        var card = document.getElementById('classification_mode_' + m + '_card');
        if (card) {
            if (m === currentMode) {
                card.style.borderColor = 'var(--primary-color)';
                card.style.background = 'rgba(var(--primary-color-rgb), 0.05)';
            } else {
                card.style.borderColor = 'var(--border-color)';
                card.style.background = 'transparent';
            }
        }
    });
}

function updateClassificationProcessPanelVisibility() {
    var currentMode = 'async';
    if (typeof ClassificationModule !== 'undefined') {
        currentMode = ClassificationModule.state.getMode();
    }
    
    var instantPanel = document.getElementById('classification_instant_progress_panel');
    var asyncPanel = document.getElementById('classification_async_progress_panel');
    var batchPanel = document.getElementById('classification_batch_progress_panel');
    
    if (instantPanel) instantPanel.style.display = currentMode === 'instant' ? 'block' : 'none';
    if (asyncPanel) asyncPanel.style.display = currentMode === 'async' ? 'block' : 'none';
    if (batchPanel) batchPanel.style.display = currentMode === 'batch' ? 'block' : 'none';
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
        
        if (count <= 20) {
            recommendation = { mode: 'instant', reason: '数据量少，适合极速同步处理' };
        } else if (count < 100) {
            recommendation = { mode: 'async', reason: '数据量适中，适合实时处理' };
        } else {
            recommendation = { mode: 'batch', reason: '数据量较大，建议使用批处理' };
        }
    }
    
    var textEl = document.getElementById('classification_recommendation_text');
    
    if (textEl) {
        if (count === 0) {
            textEl.textContent = '请先添加输入数据...';
        } else {
            var modeName = recommendation.mode === 'instant' ? '⚡ 极速同步模式' 
                         : recommendation.mode === 'async' ? '小批量异步模式' 
                         : '大批量延时模式';
            textEl.innerHTML = '<strong>推荐模式:</strong> ' + modeName + '<br><strong>原因:</strong> ' + recommendation.reason;
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

function handleUnifiedDeleteSelected() {
    var checkboxes = document.querySelectorAll('.unified-input-checkbox:checked');
    var selectedIds = Array.from(checkboxes).map(function(cb) { return cb.dataset.id; });
    
    if (selectedIds.length === 0) {
        alert('请先勾选要删除的数据');
        return;
    }
    
    if (!confirm('确定要删除选中的 ' + selectedIds.length + ' 条数据吗？')) {
        return;
    }
    
    var allInputs = UnifiedBatch.getInputs();
    var remainingInputs = allInputs.filter(function(input) {
        return !selectedIds.includes(input.id);
    });
    
    UnifiedBatch.setInputs(remainingInputs);
    
    var state = UnifiedBatch.state;
    if (state) {
        state.selectAllMode = false;
        state.selectedInputIds = [];
    }
    
    var selectAllBtn = document.getElementById('unified_inputs_select_all_btn');
    if (selectAllBtn) {
        selectAllBtn.textContent = '全选';
        selectAllBtn.style.background = '';
    }
    
    renderUnifiedInputsList();
    updateUnifiedModeRecommendation();
}

async function handleUnifiedRepExcelUpload(event) {
    var file = event.target.files[0];
    if (!file) return;
    
    try {
        var arrayBuffer = await file.arrayBuffer();
        var workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        var stateObj = UnifiedBatch.state;
        var actualState = stateObj ? stateObj.state : null;
        if (actualState && actualState.reporter) {
            actualState.reporter.workbook = workbook;
            actualState.reporter.sheetData = null;
        }
        
        var sheetSelector = document.getElementById('unified_rep_sheet_selector');
        if (sheetSelector) {
            sheetSelector.innerHTML = '';
            workbook.SheetNames.forEach(function(name) {
                var option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                sheetSelector.appendChild(option);
            });
            sheetSelector.style.display = 'block';
            
            sheetSelector.onchange = function() {
                var sheetName = this.value;
                var worksheet = workbook.Sheets[sheetName];
                var data = XLSX.utils.sheet_to_json(worksheet);
                
                if (actualState && actualState.reporter) {
                    actualState.reporter.sheetData = data;
                }
                
                checkUnifiedReportReady();
            };
            
            if (workbook.SheetNames.length > 0) {
                var firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                var data = XLSX.utils.sheet_to_json(firstSheet);
                if (actualState && actualState.reporter) {
                    actualState.reporter.sheetData = data;
                }
            }
        }
        
        checkUnifiedReportReady();
        logUnifiedBatchMessage('原始Excel已加载: ' + file.name);
    } catch (error) {
        alert('加载Excel失败: ' + error.message);
    }
}

async function handleUnifiedRepJsonlUpload(event) {
    var file = event.target.files[0];
    if (!file) return;
    
    try {
        var text = await file.text();
        var stateObj = UnifiedBatch.state;
        var actualState = stateObj ? stateObj.state : null;
        if (actualState && actualState.reporter) {
            actualState.reporter.jsonlData = text;
        }
        
        var infoBox = document.getElementById('unified_reporter_info_box');
        if (infoBox) {
            infoBox.style.display = 'none';
        }
        
        checkUnifiedReportReady();
        logUnifiedBatchMessage('Batch结果文件已加载: ' + file.name);
    } catch (error) {
        alert('加载JSONL文件失败: ' + error.message);
    }
}

function checkUnifiedReportReady() {
    var stateObj = UnifiedBatch.state;
    var actualState = stateObj ? stateObj.state : null;
    var reporter = actualState ? actualState.reporter : null;
    
    var hasSheetData = reporter && reporter.sheetData && reporter.sheetData.length > 0;
    var hasJsonlData = reporter && reporter.jsonlData;
    var hasBatchResult = actualState && actualState.batchTask && actualState.batchTask.resultContent;
    
    var generateBtn = document.getElementById('unified_generate_report_btn');
    if (generateBtn) {
        var hasAnyJsonl = hasJsonlData || hasBatchResult;
        generateBtn.disabled = !(hasSheetData && hasAnyJsonl);
    }
    
    console.log('[UnifiedBatch] 报告就绪检查:', {
        hasSheetData: hasSheetData,
        hasJsonlData: hasJsonlData,
        hasBatchResult: hasBatchResult,
        buttonDisabled: generateBtn ? generateBtn.disabled : 'button not found'
    });
}

function showUnifiedBatchPreview() {
    var state = UnifiedBatch.state;
    var allInputs = (state && state.inputs) || [];
    var selectAllMode = state.selectAllMode;
    
    var selectedInputs = [];
    if (selectAllMode && state.selectedInputIds && state.selectedInputIds.length > 0) {
        selectedInputs = allInputs.filter(function(input) {
            return state.selectedInputIds.includes(input.id);
        });
    } else {
        var checkboxes = document.querySelectorAll('.unified-input-checkbox:checked');
        var selectedIds = Array.from(checkboxes).map(function(cb) { return cb.dataset.id; });
        selectedInputs = allInputs.filter(function(input) {
            return selectedIds.includes(input.id);
        });
    }
    
    if (selectedInputs.length === 0) {
        alert('请先选择要处理的数据');
        return;
    }
    
    var template = UnifiedBatch.template.getCurrentTemplate();
    if (!template || !template.systemPrompt) {
        alert('请先配置模板');
        return;
    }
    
    try {
        UnifiedBatch.batchEngine.generateJsonl(selectedInputs, template);
        
        var jsonlContent = UnifiedBatch.batchEngine.state.batchTask.jsonlContent;
        if (!jsonlContent) {
            alert('生成请求内容失败');
            return;
        }
        
        var lines = jsonlContent.split('\n').filter(function(line) { return line.trim(); });
        var previewLines = lines.slice(0, 5);
        
        var previewContent = document.getElementById('unified_batch_preview_content');
        var previewStats = document.getElementById('unified_batch_preview_stats');
        var previewContainer = document.getElementById('unified_batch_preview_container');
        
        if (previewContent) {
            var formattedPreview = previewLines.map(function(line, index) {
                try {
                    var parsed = JSON.parse(line);
                    return '【请求 ' + (index + 1) + '】\n' + JSON.stringify(parsed, null, 2);
                } catch (e) {
                    return line;
                }
            }).join('\n\n');
            
            previewContent.textContent = formattedPreview;
        }
        
        if (previewStats) {
            var modelSelect = document.getElementById('unified_template_model_select');
            var modelName = modelSelect ? (modelSelect.options[modelSelect.selectedIndex]?.text || template.model) : template.model;
            var provider = UnifiedBatch.batchEngine.getProviderForModel(template.model);
            var providerName = provider === 'aliyun' ? '阿里云百炼' : '智谱AI';
            
            previewStats.innerHTML = 
                '<strong>总请求数:</strong> ' + lines.length + ' 条 | ' +
                '<strong>模型:</strong> ' + modelName + ' | ' +
                '<strong>服务商:</strong> ' + providerName + 
                (lines.length > 5 ? ' | <span style="color: var(--text-color-tertiary);">显示前 5 条</span>' : '');
        }
        
        if (previewContainer) {
            previewContainer.style.display = 'block';
        }
        
    } catch (error) {
        alert('生成预览失败: ' + error.message);
        console.error('[UnifiedBatch] 预览生成错误:', error);
    }
}

function copyUnifiedBatchPreview() {
    var jsonlContent = UnifiedBatch.batchEngine.state.batchTask.jsonlContent;
    if (!jsonlContent) {
        alert('没有可复制的内容');
        return;
    }
    
    navigator.clipboard.writeText(jsonlContent).then(function() {
        alert('请求内容已复制到剪贴板！');
    }).catch(function(err) {
        console.error('复制失败:', err);
        alert('复制失败，请手动复制');
    });
}

function downloadUnifiedBatchPreview() {
    var jsonlContent = UnifiedBatch.batchEngine.state.batchTask.jsonlContent;
    if (!jsonlContent) {
        alert('没有可下载的内容');
        return;
    }
    
    var blob = new Blob([jsonlContent], { type: 'application/jsonl' });
    var url = URL.createObjectURL(blob);
    
    var link = document.createElement('a');
    link.href = url;
    link.download = 'batch_requests_' + new Date().toISOString().slice(0, 10) + '.jsonl';
    link.click();
    
    URL.revokeObjectURL(url);
}

function closeUnifiedBatchPreview() {
    var previewContainer = document.getElementById('unified_batch_preview_container');
    if (previewContainer) {
        previewContainer.style.display = 'none';
    }
}
