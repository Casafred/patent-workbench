/**
 * 智能分类标引模块 - 入口文件
 */

import classificationState from './state.js';
import SchemaManager from './schema-manager.js';
import PromptBuilder from './prompt-builder.js';
import ExampleLibrary from './example-library.js';
import ColdStart from './cold-start.js';
import ResultAnalyzer from './result-analyzer.js';
import SmartImport from './smart-import.js';
import { ClassificationConfig, DEFAULT_SCHEMA, DEFAULT_LAYER, DEFAULT_EXAMPLE, getConcurrencyForModel } from './config.js';

const ClassificationModule = {
    state: classificationState,
    schema: SchemaManager,
    prompt: PromptBuilder,
    examples: ExampleLibrary,
    coldStart: ColdStart,
    analyzer: ResultAnalyzer,
    smartImport: SmartImport,
    config: ClassificationConfig,

    init() {
        console.log('[ClassificationModule] 模块初始化');
        this.setupEventListeners();
        this.initUI();
        return this;
    },

    bindEvents() {
        this.setupEventListeners();
    },

    setupEventListeners() {
        const clickElements = {
            'classification_load_excel_btn': this.handleLoadExcel.bind(this),
            'classification_add_input_btn': this.handleAddManualInput.bind(this),
            'classification_add_layer_btn': this.handleAddLayer.bind(this),
            'classification_save_schema_btn': this.handleSaveSchema.bind(this),
            'classification_cold_start_btn': this.handleColdStart.bind(this),
            'classification_smart_import_btn': this.handleSmartImport.bind(this),
            'classification_optimize_prompt_btn': this.handleOptimizePrompt.bind(this),
            'classification_import_schema_btn': this.handleImportSchema.bind(this),
            'classification_export_schema_btn': this.handleExportSchema.bind(this),
            'classification_add_example_btn': this.handleAddExample.bind(this),
            'classification_import_examples_btn': this.handleImportExamples.bind(this),
            'classification_export_examples_btn': this.handleExportExamples.bind(this),
            'classification_async_submit_btn': this.handleSubmitAsync.bind(this),
            'classification_async_export_btn': this.handleExportResults.bind(this),
            'classification_add_to_examples_btn': this.handleAddToExamples.bind(this),
            'classification_inputs_select_all_btn': this.handleSelectAllInputs.bind(this),
            'classification_inputs_delete_selected_btn': this.handleDeleteSelectedInputs.bind(this),
            'classification_precheck_btn': this.handlePrecheck.bind(this),
            'classification_precheck_proceed_btn': this.handlePrecheckProceed.bind(this),
            'classification_precheck_modify_btn': this.handlePrecheckModify.bind(this),
            'classification_export_to_original_btn': this.handleExportToOriginalExcel.bind(this),
            'classification_copy_prompt_btn': this.handleCopyPrompt.bind(this),
            'classification_publish_prompt_btn': this.handlePublishPrompt.bind(this)
        };

        Object.entries(clickElements).forEach(([id, handler]) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('click', handler);
            }
        });

        const excelFileInput = document.getElementById('classification_excel_file');
        if (excelFileInput) {
            excelFileInput.addEventListener('change', this.handleExcelUpload.bind(this));
        }

        const excelSheetSelect = document.getElementById('classification_excel_sheet');
        if (excelSheetSelect) {
            excelSheetSelect.addEventListener('change', this.handleSheetChange.bind(this));
        }

        const columnCountInput = document.getElementById('classification_excel_column_count');
        if (columnCountInput) {
            columnCountInput.addEventListener('change', this.handleColumnCountChange.bind(this));
        }

        const addConcatColumnBtn = document.getElementById('classification_add_concat_column_btn');
        if (addConcatColumnBtn) {
            addConcatColumnBtn.addEventListener('click', this.handleAddConcatColumn.bind(this));
        }

        const indexColumnSelect = document.getElementById('classification_index_column');
        if (indexColumnSelect) {
            indexColumnSelect.addEventListener('change', this.handleIndexColumnChange.bind(this));
        }

        const layerCountInput = document.getElementById('classification_layer_count');
        if (layerCountInput) {
            layerCountInput.addEventListener('input', this.handleLayerCountChange.bind(this));
            layerCountInput.addEventListener('change', this.handleLayerCountChange.bind(this));
        }

        const confidenceFilter = document.getElementById('classification_confidence_filter');
        if (confidenceFilter) {
            confidenceFilter.addEventListener('change', this.handleConfidenceFilter.bind(this));
        }

        const schemaSelect = document.getElementById('classification_schema_select');
        if (schemaSelect) {
            schemaSelect.addEventListener('change', this.handleSchemaSelect.bind(this));
        }

        const multiLabelCheckbox = document.getElementById('classification_multi_label');
        if (multiLabelCheckbox) {
            multiLabelCheckbox.addEventListener('change', this.handleMultiLabelChange.bind(this));
        }

        const modelSelect = document.getElementById('classification_model_select');
        if (modelSelect) {
            modelSelect.addEventListener('change', this.handleModelChange.bind(this));
        }

        const temperatureInput = document.getElementById('classification_temperature');
        if (temperatureInput) {
            temperatureInput.addEventListener('change', this.handleTemperatureChange.bind(this));
        }
        
        console.log('[ClassificationModule] Event listeners setup complete');
    },

    initUI() {
        console.log('[ClassificationModule] initUI called');
        
        if (!classificationState.state.schema.categories) {
            classificationState.state.schema.categories = [];
        }
        
        this.updateSchemaSelect();
        this.updateLayersUI();
        this.updatePromptPreview();
        this.updateExamplesList();
        this.updateInputsList();

        const modelSelect = document.getElementById('classification_model_select');
        if (modelSelect) {
            const currentModel = classificationState.state.schema.model || 'GLM-4.7-Flash';
            if (modelSelect.options.length > 0) {
                const modelExists = Array.from(modelSelect.options).some(opt => opt.value === currentModel);
                modelSelect.value = modelExists ? currentModel : modelSelect.options[0].value;
            }
        }

        const temperatureInput = document.getElementById('classification_temperature');
        if (temperatureInput) {
            temperatureInput.value = classificationState.state.schema.temperature || 0.1;
        }
    },

    updateSchemaSelect() {
        const select = document.getElementById('classification_schema_select');
        if (!select) return;

        const options = SchemaManager.getSchemaSelectOptions();
        select.innerHTML = options.map(opt => 
            `<option value="${opt.value}">${opt.label}</option>`
        ).join('');
    },

    updateLayersUI() {
        const container = document.getElementById('classification_tree_container');
        if (!container) return;

        const categories = classificationState.state.schema.categories || [];
        
        if (categories.length === 0) {
            container.innerHTML = `
                <div class="empty-categories">
                    <p style="text-align: center; color: var(--text-color-tertiary); padding: 30px;">
                        暂无分类配置<br>点击下方"添加一级分类"按钮开始配置
                    </p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = categories.map((category, index) => 
            this.renderCategoryItem(category, [index], 0)
        ).join('');
    },

    renderCategoryItem(category, path, depth) {
        const pathStr = path.join('-');
        const hasChildren = category.children && category.children.length > 0;
        const levelClass = depth === 0 ? 'root-category' : `child-category depth-${depth}`;
        
        return `
            <div class="category-tree-item ${levelClass}" data-path="${pathStr}">
                <div class="category-row">
                    <div class="category-expand" onclick="ClassificationModule.toggleExpand('${pathStr}')">
                        ${hasChildren ? (category.expanded !== false ? '▼' : '▶') : '•'}
                    </div>
                    <div class="category-inputs">
                        <input type="text" class="cat-name" value="${category.name || ''}" 
                               placeholder="分类名称"
                               onchange="ClassificationModule.updateCategoryField('${pathStr}', 'name', this.value)">
                        <input type="text" class="cat-desc" value="${category.description || ''}" 
                               placeholder="分类描述（可选）"
                               onchange="ClassificationModule.updateCategoryField('${pathStr}', 'description', this.value)">
                    </div>
                    <div class="category-toolbar">
                        <button class="btn-icon add" onclick="ClassificationModule.addChild('${pathStr}')" title="添加子分类">+</button>
                        <button class="btn-icon del" onclick="ClassificationModule.deleteCategory('${pathStr}')" title="删除">×</button>
                    </div>
                </div>
                ${hasChildren && category.expanded !== false ? `
                    <div class="category-children">
                        ${category.children.map((child, idx) => 
                            this.renderCategoryItem(child, [...path, idx], depth + 1)
                        ).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    },

    toggleExpand(pathStr) {
        const path = pathStr.split('-').map(Number);
        let current = this.getCategoryByPath(path);
        if (current) {
            current.expanded = current.expanded === false ? true : false;
            this.updateLayersUI();
        }
    },

    getCategoryByPath(path) {
        let current = classificationState.state.schema.categories;
        for (let i = 0; i < path.length; i++) {
            if (!current || !current[path[i]]) return null;
            if (i < path.length - 1) {
                current = current[path[i]].children;
            } else {
                return current[path[i]];
            }
        }
        return null;
    },

    getParentByPath(path) {
        if (path.length <= 1) return null;
        const parentPath = path.slice(0, -1);
        return this.getCategoryByPath(parentPath);
    },

    addRootCategory() {
        if (!classificationState.state.schema.categories) {
            classificationState.state.schema.categories = [];
        }
        
        classificationState.state.schema.categories.push({
            id: `cat_${Date.now()}`,
            name: '',
            description: '',
            children: [],
            expanded: true
        });
        
        this.updateLayersUI();
        this.updatePromptPreview();
    },

    addChild(pathStr) {
        const path = pathStr.split('-').map(Number);
        const parent = this.getCategoryByPath(path);
        
        if (parent) {
            if (!parent.children) parent.children = [];
            parent.children.push({
                id: `cat_${Date.now()}`,
                name: '',
                description: '',
                children: [],
                expanded: true
            });
            parent.expanded = true;
            this.updateLayersUI();
            this.updatePromptPreview();
        }
    },

    deleteCategory(pathStr) {
        const path = pathStr.split('-').map(Number);
        
        if (path.length === 1) {
            classificationState.state.schema.categories.splice(path[0], 1);
        } else {
            const parent = this.getParentByPath(path);
            if (parent && parent.children) {
                parent.children.splice(path[path.length - 1], 1);
            }
        }
        
        this.updateLayersUI();
        this.updatePromptPreview();
    },

    updateCategoryField(pathStr, field, value) {
        const path = pathStr.split('-').map(Number);
        const category = this.getCategoryByPath(path);
        if (category) {
            category[field] = value;
            this.updatePromptPreview();
        }
    },

    updateChildLabels(layerIndex, parentLabel, value) {
        const childLabels = value.split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 0);
        SchemaManager.setChildLabels(layerIndex, parentLabel, childLabels);
        this.updatePromptPreview();
    },

    handleLayerCountChange(e) {
        const count = parseInt(e.target.value) || 1;
        SchemaManager.setLayerCount(count);
        this.updateLayersUI();
        this.updatePromptPreview();
    },

    updatePromptPreview() {
        const preview = document.getElementById('classification_prompt_preview');
        if (!preview) return;

        preview.value = PromptBuilder.generatePreviewPrompt();
    },

    updateExamplesList() {
        const list = document.getElementById('classification_examples_list');
        if (!list) return;

        const examples = ExampleLibrary.getAllExamples();
        
        if (examples.length === 0) {
            list.innerHTML = '<div style="text-align: center; color: var(--text-color-tertiary); padding: 20px;">暂无示例，请在标引结果页面将有问题的数据条添加为例示</div>';
            return;
        }

        list.innerHTML = examples.map(example => {
            const formatted = ExampleLibrary.formatExampleForDisplay(example);
            return `
                <div class="example-item" style="padding: 10px; border-bottom: 1px solid var(--border-color);">
                    <div style="display: flex; justify-content: space-between;">
                        <span class="example-type" style="font-size: 0.8em; padding: 2px 6px; border-radius: 4px; background: ${example.type === 'positive' ? 'var(--success-color)' : 'var(--warning-color)'}; color: white;">
                            ${formatted.type}
                        </span>
                        <button class="small-button delete-button" onclick="ClassificationModule.deleteExample('${example.id}')">删除</button>
                    </div>
                    <div style="margin-top: 5px; font-size: 0.9em;">${formatted.preview}</div>
                    <div style="margin-top: 5px; color: var(--text-color-secondary);">标签: ${formatted.label} | 确信度: ${formatted.confidence}</div>
                </div>
            `;
        }).join('');
    },

    handleExcelUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        this.loadExcelFile(file);
    },

    async loadExcelFile(file) {
        console.log('[ClassificationModule] Loading Excel file:', file.name);
        
        try {
            const result = await this.loadExcel(file);
            
            if (result.success) {
                const sheetSelect = document.getElementById('classification_excel_sheet');
                if (sheetSelect) {
                    sheetSelect.innerHTML = '';
                    result.sheets.forEach(function(sheet) {
                        const option = document.createElement('option');
                        option.value = sheet;
                        option.textContent = sheet;
                        sheetSelect.appendChild(option);
                    });
                    sheetSelect.disabled = false;
                }
                
                const loadBtn = document.getElementById('classification_load_excel_btn');
                if (loadBtn) {
                    loadBtn.disabled = false;
                }
                
                console.log('[ClassificationModule] Excel loaded, sheets:', result.sheets);
            } else {
                alert('加载Excel失败: ' + result.message);
            }
        } catch (error) {
            console.error('[ClassificationModule] Excel load error:', error);
            alert('加载Excel失败: ' + error.message);
        }
    },

    async loadExcel(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('未选择文件'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    classificationState.state.workbook = workbook;
                    classificationState.state.columnHeaders = [];
                    classificationState.state.currentSheetData = null;
                    
                    const sheets = workbook.SheetNames;
                    resolve({
                        success: true,
                        sheets: sheets,
                        message: `成功加载Excel文件，共${sheets.length}个工作表`
                    });
                } catch (err) {
                    reject(new Error(`解析Excel失败: ${err.message}`));
                }
            };
            reader.onerror = () => reject(new Error('读取文件失败'));
            reader.readAsArrayBuffer(file);
        });
    },

    handleSheetChange(e) {
        const sheetName = e.target.value;
        console.log('[ClassificationModule] Sheet selected:', sheetName);
        
        const result = this.loadSheet(sheetName);
        if (result.success) {
            const configContainer = document.getElementById('classification_column_config_container');
            if (configContainer) {
                configContainer.style.display = 'block';
            }
            this.renderColumnConfig(result.headers);
        } else {
            alert('加载Sheet失败: ' + result.message);
        }
    },

    loadSheet(sheetName) {
        if (!classificationState.state.workbook) {
            return { success: false, message: '未加载Excel文件' };
        }

        const worksheet = classificationState.state.workbook.Sheets[sheetName];
        if (!worksheet) {
            return { success: false, message: '工作表不存在' };
        }

        const sheetData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        classificationState.state.currentSheetData = sheetData;

        if (sheetData.length > 0) {
            classificationState.state.columnHeaders = Object.keys(sheetData[0]);
            return {
                success: true,
                headers: classificationState.state.columnHeaders,
                rowCount: sheetData.length,
                message: `已加载${sheetData.length}行数据`
            };
        }

        return { success: false, message: '工作表为空' };
    },

    renderColumnConfig(headers) {
        const container = document.getElementById('classification_excel_column_config_area');
        const countInput = document.getElementById('classification_excel_column_count');
        const indexColumnSelect = document.getElementById('classification_index_column');
        const concatContainer = document.getElementById('classification_concat_columns_container');
        
        if (indexColumnSelect) {
            indexColumnSelect.innerHTML = '<option value="">-- 选择索引列 --</option>';
            headers.forEach(function(header) {
                const option = document.createElement('option');
                option.value = header;
                option.textContent = header;
                indexColumnSelect.appendChild(option);
            });
        }
        
        if (concatContainer) {
            concatContainer.innerHTML = '';
        }
        
        const previewEl = document.getElementById('classification_concat_preview');
        if (previewEl) {
            previewEl.textContent = '';
        }
        
        if (!container) return;
        
        const count = parseInt(countInput?.value) || 1;

        container.innerHTML = '';

        for (let i = 0; i < count; i++) {
            const div = document.createElement('div');
            div.className = 'config-item row-flex';
            div.innerHTML = '<label>第' + (i + 1) + '列:</label><select id="classification_column_' + i + '"></select>';
            container.appendChild(div);

            const select = document.getElementById('classification_column_' + i);
            headers.forEach(function(header) {
                const option = document.createElement('option');
                option.value = header;
                option.textContent = header;
                select.appendChild(option);
            });
        }
    },

    handleColumnCountChange(e) {
        const count = parseInt(e.target.value) || 1;
        const headers = classificationState.state.columnHeaders;
        if (headers && headers.length > 0) {
            this.renderColumnConfig(headers);
        }
    },

    handleLoadExcel() {
        console.log('[ClassificationModule] Loading Excel data');
        
        const indexColumn = document.getElementById('classification_index_column')?.value;
        const concatColumns = this.getSelectedConcatColumns();
        
        if (concatColumns.length > 0) {
            const result = this.loadInputsFromConfig(indexColumn, concatColumns);
            if (result.success) {
                this.updateInputsList();
                alert(result.message);
            } else {
                alert(result.message);
            }
            return;
        }
        
        const countInput = document.getElementById('classification_excel_column_count');
        const count = parseInt(countInput?.value) || 1;
        const selectedColumns = [];

        for (let i = 0; i < count; i++) {
            const select = document.getElementById('classification_column_' + i);
            if (select && select.value) {
                selectedColumns.push(select.value);
            }
        }

        const result = this.loadInputsFromColumns(selectedColumns);
        if (result.success) {
            this.updateInputsList();
            alert(result.message);
        } else {
            alert(result.message);
        }
    },

    getSelectedConcatColumns() {
        const container = document.getElementById('classification_concat_columns_container');
        if (!container) return [];
        
        const selects = container.querySelectorAll('select');
        const columns = [];
        
        selects.forEach(select => {
            if (select.value) {
                columns.push(select.value);
            }
        });
        
        return columns;
    },

    handleAddConcatColumn() {
        const container = document.getElementById('classification_concat_columns_container');
        const headers = classificationState.state.columnHeaders;
        
        if (!container || !headers || headers.length === 0) return;
        
        const existingSelects = container.querySelectorAll('select');
        const existingCount = existingSelects.length;
        
        if (existingCount >= 10) {
            alert('最多添加10个拼接列');
            return;
        }
        
        const div = document.createElement('div');
        div.className = 'concat-column-item';
        div.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 8px;';
        div.innerHTML = `
            <span style="color: var(--text-color-secondary); min-width: 20px;">${existingCount + 1}.</span>
            <select id="classification_concat_column_${existingCount}" style="flex: 1;">
                <option value="">-- 选择列 --</option>
                ${headers.map(h => `<option value="${h}">${h}</option>`).join('')}
            </select>
            <button class="small-button delete-button" type="button" onclick="ClassificationModule.removeConcatColumn(this)">删除</button>
        `;
        
        container.appendChild(div);
        this.updateConcatPreview();
        
        const newSelect = div.querySelector('select');
        if (newSelect) {
            newSelect.addEventListener('change', () => this.updateConcatPreview());
        }
    },

    removeConcatColumn(btn) {
        const div = btn.closest('.concat-column-item');
        if (div) {
            div.remove();
            this.renumberConcatColumns();
            this.updateConcatPreview();
        }
    },

    renumberConcatColumns() {
        const container = document.getElementById('classification_concat_columns_container');
        if (!container) return;
        
        const items = container.querySelectorAll('.concat-column-item');
        items.forEach((item, index) => {
            const span = item.querySelector('span');
            if (span) {
                span.textContent = `${index + 1}.`;
            }
            const select = item.querySelector('select');
            if (select) {
                select.id = `classification_concat_column_${index}`;
            }
        });
    },

    updateConcatPreview() {
        const previewEl = document.getElementById('classification_concat_preview');
        if (!previewEl) return;
        
        const columns = this.getSelectedConcatColumns();
        if (columns.length === 0) {
            previewEl.textContent = '';
            return;
        }
        
        previewEl.textContent = `拼接预览: ${columns.join(' + ')}`;
    },

    handleIndexColumnChange(e) {
        const indexColumn = e.target.value;
        classificationState.state.indexColumn = indexColumn;
        console.log('[ClassificationModule] Index column set to:', indexColumn);
    },

    loadInputsFromConfig(indexColumn, concatColumns) {
        const sheetData = classificationState.state.currentSheetData;
        
        if (!sheetData || sheetData.length === 0) {
            return { success: false, message: '未加载数据', count: 0 };
        }

        if (!concatColumns || concatColumns.length === 0) {
            return { success: false, message: '请至少选择一个拼接列', count: 0 };
        }

        classificationState.state.inputs = [];
        classificationState.state.indexColumn = indexColumn;
        classificationState.state.concatColumns = concatColumns;
        let loadedCount = 0;

        sheetData.forEach((row, index) => {
            const concatParts = [];
            let hasContent = false;
            
            concatColumns.forEach(colName => {
                if (row[colName]) {
                    concatParts.push(String(row[colName]).trim());
                    hasContent = true;
                }
            });

            if (hasContent) {
                const id = indexColumn && row[indexColumn] 
                    ? String(row[indexColumn]).trim() 
                    : `I${index + 1}`;
                    
                classificationState.state.inputs.push({
                    id: id,
                    content: concatParts.join('\n'),
                    rowIndex: index,
                    originalData: row
                });
                loadedCount++;
            }
        });

        return {
            success: true,
            count: loadedCount,
            message: `成功加载${loadedCount}条输入（索引列: ${indexColumn || '自动编号'}, 拼接列: ${concatColumns.join(', ')}）`
        };
    },

    loadInputsFromColumns(selectedColumns) {
        const sheetData = classificationState.state.currentSheetData;
        
        if (!sheetData || sheetData.length === 0) {
            return { success: false, message: '未加载数据', count: 0 };
        }

        if (!selectedColumns || selectedColumns.length === 0) {
            return { success: false, message: '未选择列', count: 0 };
        }

        classificationState.state.inputs = [];
        let loadedCount = 0;

        sheetData.forEach((row, index) => {
            if (selectedColumns.length === 1) {
                const colName = selectedColumns[0];
                if (row[colName]) {
                    classificationState.state.inputs.push({
                        id: `I${index + 1}`,
                        content: String(row[colName]).trim()
                    });
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
                        multiColContent[colName] = '';
                    }
                });

                if (hasContent) {
                    classificationState.state.inputs.push({
                        id: `I${index + 1}`,
                        content: multiColContent
                    });
                    loadedCount++;
                }
            }
        });

        return {
            success: true,
            count: loadedCount,
            message: `成功加载${loadedCount}条输入`
        };
    },

    handleSelectAllInputs() {
        const checkboxes = document.querySelectorAll('.classification-input-checkbox');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        
        checkboxes.forEach(cb => {
            cb.checked = !allChecked;
        });
    },

    handleDeleteSelectedInputs() {
        const checkboxes = document.querySelectorAll('.classification-input-checkbox:checked');
        const indicesToDelete = Array.from(checkboxes).map(cb => parseInt(cb.dataset.index));
        
        if (indicesToDelete.length === 0) {
            alert('请先选择要删除的输入');
            return;
        }

        indicesToDelete.sort((a, b) => b - a);
        indicesToDelete.forEach(index => {
            classificationState.state.inputs.splice(index, 1);
        });

        this.updateInputsList();
    },

    handleAddManualInput() {
        const textarea = document.getElementById('classification_manual_input');
        if (!textarea) return;

        const text = textarea.value.trim();
        if (!text) return;

        const lines = text.split('\n').filter(line => line.trim());
        lines.forEach(line => {
            classificationState.addInput({
                id: `input_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                content: line.trim()
            });
        });

        textarea.value = '';
        this.updateInputsList();
    },

    updateInputsList() {
        const list = document.getElementById('classification_inputs_list');
        const countEl = document.getElementById('classification_inputs_count');
        
        if (!list) return;

        const inputs = classificationState.getInputs();
        
        if (countEl) {
            countEl.textContent = inputs.length;
        }

        if (inputs.length === 0) {
            list.innerHTML = '<div class="info" style="text-align: center; padding: 20px;">暂无输入数据</div>';
            return;
        }

        list.innerHTML = inputs.map((input, index) => {
            let summary = '';
            let fullContent = '';
            
            if (input.originalData) {
                const entries = Object.entries(input.originalData).filter(([k, v]) => v);
                summary = entries.slice(0, 2).map(([k, v]) => `${k}: ${this.truncateText(String(v), 30)}`).join(' | ');
                if (entries.length > 2) summary += ' ...';
                fullContent = entries.map(([k, v]) => `<div class="preview-row"><span class="preview-label">${k}:</span> <span class="preview-value">${String(v)}</span></div>`).join('');
            } else if (typeof input.content === 'string') {
                summary = this.truncateText(input.content, 60);
                fullContent = `<div class="preview-row"><span class="preview-value">${input.content}</span></div>`;
            } else if (typeof input.content === 'object') {
                const entries = Object.entries(input.content).filter(([k, v]) => v);
                summary = entries.slice(0, 2).map(([k, v]) => `${k}: ${this.truncateText(v, 30)}`).join(' | ');
                fullContent = entries.map(([k, v]) => `<div class="preview-row"><span class="preview-label">${k}:</span> <span class="preview-value">${v}</span></div>`).join('');
            }
            
            return `
                <div class="input-item-strip" data-index="${index}">
                    <input type="checkbox" class="classification-input-checkbox strip-checkbox" data-index="${index}">
                    <div class="strip-id">${input.id || index + 1}</div>
                    <div class="strip-summary">${summary}</div>
                    <div class="strip-preview">
                        <div class="preview-header">
                            <span class="preview-title">数据详情 - ${input.id || `第${index + 1}条`}</span>
                        </div>
                        <div class="preview-body">${fullContent}</div>
                    </div>
                </div>
            `;
        }).join('');
    },

    handleLayerCountChange(e) {
        const count = parseInt(e.target.value) || 1;
        console.log('[ClassificationModule] handleLayerCountChange:', count);
        SchemaManager.setLayerCount(count);
        this.updateLayersUI();
        this.updatePromptPreview();
    },

    handleAddLayer() {
        console.log('[ClassificationModule] handleAddLayer');
        SchemaManager.addLayer();
        this.updateLayersUI();
        this.updatePromptPreview();
        
        const countEl = document.getElementById('classification_layer_count');
        if (countEl) {
            countEl.value = classificationState.getLayers().length;
        }
    },

    removeLayer(index) {
        SchemaManager.removeLayer(index);
        this.updateLayersUI();
        this.updatePromptPreview();
        
        const countEl = document.getElementById('classification_layer_count');
        if (countEl) {
            countEl.value = classificationState.getLayers().length;
        }
    },

    updateLayerName(index, name) {
        SchemaManager.setLayerName(index, name);
        this.updatePromptPreview();
    },

    updateLayerDescription(index, description) {
        SchemaManager.setLayerDescription(index, description);
        this.updatePromptPreview();
    },

    updateLayerLabels(index, labelsText) {
        const labels = labelsText.split('\n').map(l => l.trim()).filter(l => l);
        SchemaManager.updateLabelsInLayer(index, labels);
        this.updatePromptPreview();
    },

    handleSchemaSelect(e) {
        const schemaId = e.target.value;
        
        if (schemaId === 'new') {
            classificationState.resetSchema();
        } else {
            SchemaManager.loadSchema(schemaId);
        }
        
        this.updateLayersUI();
        this.updatePromptPreview();

        const modelSelect = document.getElementById('classification_model_select');
        if (modelSelect) {
            const currentModel = classificationState.state.schema.model || 'GLM-4.7-Flash';
            const modelExists = Array.from(modelSelect.options).some(opt => opt.value === currentModel);
            modelSelect.value = modelExists ? currentModel : (modelSelect.options[0]?.value || '');
        }

        const temperatureInput = document.getElementById('classification_temperature');
        if (temperatureInput) {
            temperatureInput.value = classificationState.state.schema.temperature || 0.1;
        }

        const nameEl = document.getElementById('classification_schema_name');
        if (nameEl) {
            nameEl.value = classificationState.state.schema.name || '';
        }
    },

    handleMultiLabelChange(e) {
        const enabled = e.target.checked;
        SchemaManager.setMultiLabel(enabled);
        this.updatePromptPreview();
    },

    handleModelChange(e) {
        const model = e.target.value;
        classificationState.state.schema.model = model;
        console.log('[ClassificationModule] Model changed to:', model);
    },

    handleTemperatureChange(e) {
        const temperature = parseFloat(e.target.value) || 0.1;
        classificationState.state.schema.temperature = Math.max(0, Math.min(1, temperature));
        console.log('[ClassificationModule] Temperature changed to:', classificationState.state.schema.temperature);
    },

    handleSaveSchema() {
        const nameEl = document.getElementById('classification_schema_name');
        if (nameEl && nameEl.value.trim()) {
            classificationState.state.schema.name = nameEl.value.trim();
        }

        const validation = SchemaManager.validateSchema();
        if (!validation.valid) {
            alert(validation.errors.join('\n'));
            return;
        }

        const saved = SchemaManager.saveSchema();
        this.updateSchemaSelect();
        alert(`分类体系"${saved.name}"已保存`);
    },

    async handleColdStart() {
        const inputs = classificationState.getInputs();
        
        if (inputs.length === 0) {
            alert('请先添加待标引数据');
            return;
        }

        const btn = document.getElementById('classification_cold_start_btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = '分析中...';
        }

        try {
            const result = await ColdStart.analyzeAndSuggest(inputs);
            
            if (result.success && result.suggestedSchema) {
                ColdStart.applySuggestedSchema();
                this.updateLayersUI();
                this.updatePromptPreview();
                
                const nameEl = document.getElementById('classification_schema_name');
                if (nameEl && result.suggestedSchema.name) {
                    nameEl.value = result.suggestedSchema.name;
                }
                
                alert('智能冷启动完成！分类体系已自动生成，您可以在配置页面进行微调。');
            } else {
                const errorMsg = result.message || (result.analysis?.parseError ? '解析失败: ' + result.analysis.parseError : '未能生成分类体系');
                alert('智能冷启动失败: ' + errorMsg);
                console.error('[ClassificationModule] Cold start failed:', result);
            }
        } catch (error) {
            console.error('[ClassificationModule] Cold start error:', error);
            alert('智能冷启动出错: ' + error.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = '开始智能冷启动';
            }
        }
    },

    handleSmartImport() {
        this.openSmartImportModal();
    },

    openSmartImportModal() {
        const modal = document.getElementById('smart_import_modal');
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
            this.initSmartImportTemplates();
            
            const parseBtn = document.getElementById('smart_import_parse_btn');
            if (parseBtn) {
                parseBtn.onclick = () => this.handleSmartImportParse();
            }
            
            const applyBtn = document.getElementById('smart_import_apply_btn');
            if (applyBtn) {
                applyBtn.onclick = () => this.handleSmartImportApply();
            }
        }
    },

    closeSmartImportModal() {
        const modal = document.getElementById('smart_import_modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 200);
        }
        
        const resultArea = document.getElementById('smart_import_result_area');
        if (resultArea) {
            resultArea.style.display = 'none';
        }
        
        const applyBtn = document.getElementById('smart_import_apply_btn');
        if (applyBtn) {
            applyBtn.style.display = 'none';
        }
        
        const descriptionEl = document.getElementById('smart_import_description');
        if (descriptionEl) {
            descriptionEl.value = '';
        }
    },

    initSmartImportTemplates() {
        const container = document.getElementById('smart_import_templates');
        if (!container) return;

        const templates = SmartImport.getExampleTemplates();
        
        container.innerHTML = templates.map(template => `
            <button class="small-button template-btn" data-template="${template.name}" 
                    style="background: var(--primary-color); color: white; border: 1px solid var(--primary-color-dark); padding: 8px 16px; border-radius: 6px; cursor: pointer; transition: all 0.2s;">
                ${template.name}
            </button>
        `).join('');

        container.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const templateName = btn.dataset.template;
                const template = templates.find(t => t.name === templateName);
                if (template) {
                    const descriptionEl = document.getElementById('smart_import_description');
                    if (descriptionEl) {
                        descriptionEl.value = template.description;
                    }
                }
            });
        });
    },

    async handleSmartImportParse() {
        const descriptionEl = document.getElementById('smart_import_description');
        const description = descriptionEl?.value?.trim();
        
        if (!description) {
            alert('请输入分类体系描述');
            return;
        }

        const parseBtn = document.getElementById('smart_import_parse_btn');
        if (parseBtn) {
            parseBtn.disabled = true;
            parseBtn.textContent = '解析中...';
        }

        try {
            const result = await SmartImport.importFromText(description);
            
            if (result.success && result.schema) {
                this.showSmartImportPreview(result.schema);
                
                const applyBtn = document.getElementById('smart_import_apply_btn');
                if (applyBtn) {
                    applyBtn.style.display = 'inline-block';
                }
            } else {
                alert('解析失败: ' + (result.message || '未知错误'));
            }
        } catch (error) {
            console.error('[ClassificationModule] Smart import parse error:', error);
            alert('解析出错: ' + error.message);
        } finally {
            if (parseBtn) {
                parseBtn.disabled = false;
                parseBtn.textContent = '开始解析';
            }
        }
    },

    showSmartImportPreview(schema) {
        const resultArea = document.getElementById('smart_import_result_area');
        const previewEl = document.getElementById('smart_import_preview');
        
        if (!resultArea || !previewEl) return;

        resultArea.style.display = 'block';
        
        const renderCategories = (categories, depth = 0) => {
            if (!categories || categories.length === 0) return '';
            
            const indent = '  '.repeat(depth);
            return categories.map(cat => {
                let html = `
                    <div class="preview-category" style="margin-left: ${depth * 20}px; margin-bottom: 8px;">
                        <div style="font-weight: ${depth === 0 ? '600' : '500'}; color: var(--text-color);">
                            ${cat.name || '未命名'}
                        </div>
                        ${cat.description ? `
                            <div style="font-size: 0.85em; color: var(--text-color-secondary); margin-top: 2px;">
                                ${cat.description}
                            </div>
                        ` : ''}
                    </div>
                `;
                if (cat.children && cat.children.length > 0) {
                    html += renderCategories(cat.children, depth + 1);
                }
                return html;
            }).join('');
        };

        previewEl.innerHTML = `
            <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid var(--border-color);">
                <div style="font-weight: 600; font-size: 1.1em; color: var(--primary-color);">
                    ${schema.name || '智能导入分类体系'}
                </div>
                <div style="font-size: 0.85em; color: var(--text-color-secondary); margin-top: 5px;">
                    共 ${this.countCategories(schema.categories)} 个分类项
                </div>
            </div>
            <div class="preview-categories">
                ${renderCategories(schema.categories)}
            </div>
        `;
    },

    countCategories(categories) {
        if (!categories) return 0;
        let count = categories.length;
        categories.forEach(cat => {
            if (cat.children && cat.children.length > 0) {
                count += this.countCategories(cat.children);
            }
        });
        return count;
    },

    handleSmartImportApply() {
        const schema = SmartImport.getSuggestion();
        
        if (!schema) {
            alert('没有可应用的分类体系');
            return;
        }

        classificationState.state.schema = {
            ...classificationState.state.schema,
            ...schema,
            id: schema.id || `schema_${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        classificationState.saveState();
        
        const nameEl = document.getElementById('classification_schema_name');
        if (nameEl && schema.name) {
            nameEl.value = schema.name;
        }
        
        this.updateLayersUI();
        this.updatePromptPreview();
        
        this.closeSmartImportModal();
        
        alert('分类体系已应用！您可以在配置页面进行微调。');
    },

    async handleOptimizePrompt() {
        const btn = document.getElementById('classification_optimize_prompt_btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = '优化中...';
        }

        try {
            const result = await PromptBuilder.optimizePromptWithAI();
            
            if (result.success) {
                const preview = document.getElementById('classification_prompt_preview');
                if (preview) {
                    preview.value = result.optimizedPrompt;
                }
                alert('提示词优化完成！');
            } else {
                alert('优化失败: ' + result.message);
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'AI一键优化提示词';
            }
        }
    },

    handleImportSchema() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const data = JSON.parse(text);
                const result = SchemaManager.importSchema(data);
                
                if (result.success) {
                    this.updateSchemaSelect();
                    this.updateLayersUI();
                    this.updatePromptPreview();
                    alert('分类体系导入成功');
                } else {
                    alert('导入失败: ' + result.message);
                }
            } catch (error) {
                alert('文件解析失败: ' + error.message);
            }
        };

        input.click();
    },

    handleExportSchema() {
        const result = SchemaManager.exportSchema();
        
        if (!result.success) {
            alert(result.message);
            return;
        }

        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const schema = classificationState.state.schema;
        const link = document.createElement('a');
        link.href = url;
        link.download = `${schema?.name || '分类体系'}_${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    },

    handleAddExample() {
        const schema = classificationState.state.schema;
        const example = {
            schemaId: schema?.id,
            layerLevel: 1,
            input: '',
            correctLabel: '',
            type: 'positive'
        };
        
        ExampleLibrary.addExample(example);
        this.updateExamplesList();
    },

    handleImportExamples() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const data = JSON.parse(text);
                const result = ExampleLibrary.importExamples(data);
                
                if (result.success) {
                    this.updateExamplesList();
                    alert(result.message);
                } else {
                    alert('导入失败: ' + result.message);
                }
            } catch (error) {
                alert('文件解析失败: ' + error.message);
            }
        };

        input.click();
    },

    handleExportExamples() {
        ExampleLibrary.downloadExportFile();
    },

    handleSubmitAsync() {
        console.log('[ClassificationModule] Starting async classification');
        
        const allInputs = classificationState.getInputs();
        const schema = classificationState.getSchema();
        
        const selectedCheckboxes = document.querySelectorAll('.classification-input-checkbox:checked');
        let inputs;
        if (selectedCheckboxes.length > 0) {
            const selectedIndices = Array.from(selectedCheckboxes).map(cb => parseInt(cb.dataset.index));
            inputs = selectedIndices.map(idx => allInputs[idx]).filter(Boolean);
            console.log('[ClassificationModule] Using selected inputs:', inputs.length, 'of', allInputs.length);
        } else {
            inputs = allInputs;
        }
        
        if (inputs.length === 0) {
            alert('请先添加待分类数据');
            return;
        }
        
        const categories = schema.categories || [];
        const hasValidCategory = categories.some(cat => cat.name && cat.name.trim() !== '');
        if (!hasValidCategory) {
            alert('请至少配置一个有效的分类项');
            return;
        }
        
        const model = schema.model || 'GLM-4.7-Flash';
        const temperature = schema.temperature || 0.1;
        const provider = this.getProviderForModel(model);
        
        if (!this.checkApiKey(provider)) {
            const providerName = provider === 'aliyun' ? '阿里云百炼' : '智谱AI';
            alert(`请先配置${providerName}的API Key`);
            return;
        }
        
        const count = inputs.length;
        const mode = count < 50 ? 'async' : 'batch';
        
        if (mode === 'batch') {
            this.startBatchClassification(inputs, schema, model, temperature, provider);
        } else {
            this.startAsyncClassification(inputs, schema, model, temperature, provider);
        }
    },

    getProviderForModel(model) {
        if (window.ProviderManager && ProviderManager.getProviderForModel) {
            return ProviderManager.getProviderForModel(model);
        }
        if (model.startsWith('glm-') || model.startsWith('GLM-')) {
            return 'zhipu';
        }
        if (model.startsWith('qwen') || model.startsWith('Qwen') || 
            model.startsWith('qwq') || model.startsWith('QwQ') ||
            model.startsWith('deepseek') || model.startsWith('DeepSeek') ||
            model.startsWith('kimi') || model.startsWith('Kimi') ||
            model.startsWith('minimax') || model.startsWith('MiniMax')) {
            return 'aliyun';
        }
        return 'zhipu';
    },

    checkApiKey(provider) {
        const getUserItem = (key) => {
            if (window.userCacheStorage && window.userCacheStorage.isInitialized()) {
                return window.userCacheStorage.get(key);
            }
            return localStorage.getItem(key);
        };
        
        if (provider === 'aliyun') {
            return !!(window.appState?.aliyunApiKey || getUserItem('aliyun_api_key'));
        } else {
            return !!(window.appState?.apiKey || getUserItem('api_key') || getUserItem('globalApiKey'));
        }
    },

    getApiHeaders(model) {
        const provider = this.getProviderForModel(model);
        const headers = { 'Content-Type': 'application/json' };
        const getUserItem = (key) => {
            if (window.userCacheStorage && window.userCacheStorage.isInitialized()) {
                return window.userCacheStorage.get(key);
            }
            return localStorage.getItem(key);
        };
        
        if (provider === 'aliyun') {
            const aliyunKey = window.appState?.aliyunApiKey || getUserItem('aliyun_api_key');
            headers['X-LLM-Provider'] = 'aliyun';
            headers['Authorization'] = `Bearer ${aliyunKey}`;
        } else {
            const zhipuKey = window.appState?.apiKey || getUserItem('api_key') || getUserItem('globalApiKey');
            headers['Authorization'] = `Bearer ${zhipuKey}`;
        }
        
        return headers;
    },

    async startAsyncClassification(inputs, schema, model, temperature, provider) {
        console.log('[ClassificationModule] Starting async classification with', inputs.length, 'inputs');
        console.log('[ClassificationModule] Using model:', model);
        
        const btn = document.getElementById('classification_async_submit_btn');
        const progressInfo = document.getElementById('classification_async_progress_info');
        
        if (btn) {
            btn.disabled = true;
            btn.textContent = '处理中...';
        }
        
        if (progressInfo) {
            progressInfo.textContent = '正在提交分类任务...';
        }
        
        classificationState.clearResults();
        const prompt = PromptBuilder.generateFullPrompt();
        let completed = 0;
        let failed = 0;
        
        const concurrency = getConcurrencyForModel(model);
        const requestDelay = concurrency >= 50 ? 100 : (concurrency >= 10 ? 200 : 500);
        
        console.log('[ClassificationModule] Model concurrency limit:', concurrency, ', request delay:', requestDelay + 'ms');
        
        if (progressInfo) {
            progressInfo.textContent = `模型并发限制: ${concurrency}, 请求间隔: ${requestDelay}ms`;
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        for (let i = 0; i < inputs.length; i++) {
            const input = inputs[i];
            
            if (progressInfo) {
                progressInfo.textContent = `正在处理: ${i + 1}/${inputs.length} (成功: ${completed}, 失败: ${failed})`;
            }
            
            let resultItem;
            try {
                const result = await this.classifySingleInputWithRetry(input, prompt, model, temperature, 3);
                resultItem = {
                    id: input.id,
                    input: input,
                    result: result,
                    status: 'success'
                };
                completed++;
            } catch (error) {
                const errorMsg = error?.message || error?.error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
                console.error('[ClassificationModule] Classification failed for:', input.id, errorMsg);
                resultItem = {
                    id: input.id,
                    input: input,
                    error: errorMsg,
                    status: 'failed'
                };
                failed++;
            }
            
            classificationState.addResult(resultItem);
            this.updateResultsUI(classificationState.getResults());
            this.updateExportButtonState();
            
            if (i < inputs.length - 1) {
                await new Promise(resolve => setTimeout(resolve, requestDelay));
            }
        }
        
        if (btn) {
            btn.disabled = false;
            btn.textContent = '开始分类';
        }
        
        if (progressInfo) {
            progressInfo.textContent = `分类完成！成功: ${completed}, 失败: ${failed}`;
        }
        
        console.log('[ClassificationModule] Async classification completed:', completed, 'success,', failed, 'failed');
    },

    async startBatchClassification(inputs, schema, model, temperature, provider) {
        console.log('[ClassificationModule] Starting batch classification with', inputs.length, 'inputs');
        
        const btn = document.getElementById('classification_async_submit_btn');
        const progressInfo = document.getElementById('classification_async_progress_info');
        
        if (btn) {
            btn.disabled = true;
            btn.textContent = '准备批处理...';
        }
        
        if (progressInfo) {
            progressInfo.textContent = '正在生成批处理请求文件...';
        }
        
        const prompt = PromptBuilder.generateFullPrompt();
        const jsonlLines = [];
        
        inputs.forEach((input, index) => {
            let inputText;
            if (typeof input.content === 'string') {
                inputText = input.content;
            } else {
                inputText = Object.entries(input.content)
                    .filter(([key, value]) => value)
                    .map(([key, value]) => `【${key}】\n${value}`)
                    .join('\n\n');
            }
            
            const fullPrompt = prompt.replace('{{INPUT}}', inputText);
            
            const requestItem = {
                custom_id: input.id || `request-${index + 1}`,
                method: 'POST',
                url: provider === 'aliyun' ? '/v1/chat/completions' : '/v4/chat/completions',
                body: {
                    model: model,
                    messages: [
                        { role: 'user', content: fullPrompt }
                    ],
                    temperature: temperature
                }
            };
            
            jsonlLines.push(JSON.stringify(requestItem));
        });
        
        const jsonlContent = jsonlLines.join('\n');
        
        try {
            if (progressInfo) {
                progressInfo.textContent = '正在上传请求文件...';
            }
            
            const blob = new Blob([jsonlContent], { type: 'application/jsonl' });
            const formData = new FormData();
            formData.append('file', blob, 'classification_requests.jsonl');
            
            const uploadHeaders = {};
            if (provider === 'aliyun') {
                uploadHeaders['X-LLM-Provider'] = 'aliyun';
            }
            
            const uploadResponse = await fetch('/api/upload', {
                method: 'POST',
                headers: uploadHeaders,
                body: formData
            });
            
            if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json().catch(() => ({}));
                throw new Error(errorData.error || '上传失败');
            }
            
            const uploadResult = await uploadResponse.json();
            const fileId = uploadResult.file_id;
            
            if (progressInfo) {
                progressInfo.textContent = '正在创建批处理任务...';
            }
            
            const headers = this.getApiHeaders(model);
            const endpoint = provider === 'aliyun' ? '/v1/chat/completions' : '/v4/chat/completions';
            
            const batchResponse = await fetch('/api/create_batch', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    input_file_id: fileId,
                    endpoint: endpoint,
                    completion_window: '24h',
                    provider: provider
                })
            });
            
            if (!batchResponse.ok) {
                const errorData = await batchResponse.json().catch(() => ({}));
                throw new Error(errorData.error || '创建批处理失败');
            }
            
            const batchResult = await batchResponse.json();
            const batchId = batchResult.id;
            
            classificationState.state.batchTask = {
                batchId: batchId,
                fileId: fileId,
                provider: provider,
                model: model,
                startTime: new Date()
            };
            classificationState.saveState();
            
            if (progressInfo) {
                progressInfo.innerHTML = `批处理任务已创建！<br>任务ID: ${batchId}<br>请稍后使用"恢复任务"按钮查询结果`;
            }
            
            if (btn) {
                btn.disabled = false;
                btn.textContent = '开始分类';
            }
            
            const recoverBtn = document.getElementById('classification_async_recover_btn');
            if (recoverBtn) {
                recoverBtn.disabled = false;
            }
            
            console.log('[ClassificationModule] Batch task created:', batchId);
            
        } catch (error) {
            console.error('[ClassificationModule] Batch classification failed:', error);
            
            if (progressInfo) {
                progressInfo.textContent = '批处理失败: ' + error.message;
            }
            
            if (btn) {
                btn.disabled = false;
                btn.textContent = '开始分类';
            }
        }
    },

    updateResultsUI(results) {
        const tbody = document.getElementById('classification_async_results_tbody');
        const statsEl = document.getElementById('classification_results_stats');
        
        if (!tbody) {
            console.warn('[ClassificationModule] Results tbody element not found');
            return;
        }
        
        const schema = classificationState.getSchema();
        console.log('[ClassificationModule] Updating results UI with', results.length, 'results');
        
        if (statsEl) {
            const successCount = results.filter(r => r.status === 'success').length;
            const failedCount = results.filter(r => r.status === 'failed').length;
            statsEl.textContent = `共 ${results.length} 条结果 (成功: ${successCount}, 失败: ${failedCount})`;
        }
        
        tbody.innerHTML = results.map((item, index) => {
            let resultText = '-';
            let confidenceText = '-';
            let confidenceValue = 0;
            let statusClass = item.status === 'success' ? 'success' : 'error';
            let statusText = item.status === 'success' ? '成功' : '失败';
            
            if (item.result) {
                const result = item.result;
                const classificationParts = [];
                
                if (result.classification) {
                    if (Array.isArray(result.classification)) {
                        classificationParts.push(result.classification.join(' > '));
                    } else if (typeof result.classification === 'object') {
                        const keys = Object.keys(result.classification);
                        if (keys.length > 0) {
                            keys.forEach(key => {
                                const value = result.classification[key];
                                if (value) {
                                    classificationParts.push(`${key}: ${Array.isArray(value) ? value.join(', ') : value}`);
                                }
                            });
                        }
                    }
                }
                
                resultText = classificationParts.join('; ') || '-';
                
                const conf = result.overallConfidence;
                if (conf !== undefined) {
                    confidenceValue = conf;
                    confidenceText = (conf * 100).toFixed(0) + '%';
                    if (conf >= 0.8) {
                        statusClass = 'success';
                        statusText = '高确信度';
                    } else if (conf >= 0.6) {
                        statusClass = 'warning';
                        statusText = '中等确信度';
                    } else {
                        statusClass = 'error';
                        statusText = '低确信度';
                    }
                }
            } else if (item.error) {
                resultText = '错误: ' + item.error;
                statusText = '失败';
            }
            
            const inputPreview = typeof item.input?.content === 'string' 
                ? this.truncateText(item.input.content, 50)
                : (item.inputPreview || '-');
            
            return `
                <tr>
                    <td><input type="checkbox" class="classification-result-checkbox" data-id="${item.id}"></td>
                    <td>${item.id}</td>
                    <td>${inputPreview}</td>
                    <td>${resultText}</td>
                    <td>${confidenceText}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>
                        <button class="small-button" onclick="ClassificationModule.viewResultDetail('${item.id}')">查看</button>
                    </td>
                </tr>
            `;
        }).join('');
        
        this.updateExportButtonState();
        console.log('[ClassificationModule] Results UI updated');
    },

    handleConfidenceFilter(e) {
        classificationState.setConfidenceFilter(e.target.value);
    },

    handleAddToExamples() {
        const selected = Array.from(classificationState.state.ui.selectedResults);
        if (selected.length === 0) {
            alert('请先选择要添加的结果');
            return;
        }

        const schema = classificationState.state.schema;
        selected.forEach(resultId => {
            const result = classificationState.state.results.find(r => r.id === resultId || r.requestId === resultId);
            if (result) {
                ExampleLibrary.addFromResult(result, schema?.categories?.[0]?.name, false, '低确信度条目');
            }
        });

        this.updateExamplesList();
        alert(`已添加${selected.length}条结果到示例库`);
    },

    deleteExample(exampleId) {
        ExampleLibrary.deleteExample(exampleId);
        this.updateExamplesList();
    },

    async handlePrecheck() {
        console.log('[ClassificationModule] Starting precheck...');
        
        const inputs = classificationState.getInputs();
        const schema = classificationState.getSchema();
        
        if (inputs.length === 0) {
            alert('请先添加待分类数据');
            return;
        }
        
        const categories = schema.categories || [];
        const hasValidCategory = categories.some(cat => cat.name && cat.name.trim() !== '');
        if (!hasValidCategory) {
            alert('请至少配置一个有效的分类项');
            return;
        }
        
        const btn = document.getElementById('classification_precheck_btn');
        const statusEl = document.getElementById('classification_precheck_status');
        const resultsContainer = document.getElementById('classification_precheck_results');
        const actionsEl = document.getElementById('classification_precheck_actions');
        
        if (btn) {
            btn.disabled = true;
            btn.textContent = '⏳ 校验中...';
        }
        
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
        }
        
        if (actionsEl) {
            actionsEl.style.display = 'none';
        }
        
        if (statusEl) {
            statusEl.textContent = '正在获取前3条数据进行测试分类...';
            statusEl.style.color = 'var(--text-color-secondary)';
        }
        
        const testInputs = inputs.slice(0, 3);
        const precheckResults = [];
        
        try {
            const prompt = PromptBuilder.generateFullPrompt();
            const model = schema.model || 'GLM-4.7-Flash';
            const temperature = schema.temperature || 0.1;
            
            for (let i = 0; i < testInputs.length; i++) {
                const input = testInputs[i];
                
                if (statusEl) {
                    statusEl.textContent = `正在处理第 ${i + 1}/${testInputs.length} 条数据...`;
                }
                
                try {
                    const result = await this.classifySingleInputWithRetry(input, prompt, model, temperature, 3);
                    precheckResults.push({
                        input: input,
                        result: result,
                        status: 'success'
                    });
                } catch (error) {
                    const errorMsg = error?.message || error?.error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
                    console.error('[ClassificationModule] Precheck error for input:', input.id, errorMsg);
                    precheckResults.push({
                        input: input,
                        error: errorMsg,
                        status: 'failed'
                    });
                }
            }
            
            this.state.precheckResults = precheckResults;
            classificationState.state.precheckResults = precheckResults;
            this.renderPrecheckResults(precheckResults);
            
            if (resultsContainer) {
                resultsContainer.style.display = 'block';
            }
            
            if (actionsEl) {
                actionsEl.style.display = 'flex';
            }
            
            if (statusEl) {
                const successCount = precheckResults.filter(r => r.status === 'success').length;
                const failedCount = precheckResults.filter(r => r.status === 'failed').length;
                if (successCount === testInputs.length) {
                    statusEl.textContent = `校验完成！全部成功: ${successCount}/${testInputs.length}`;
                    statusEl.style.color = 'var(--success-color)';
                } else if (successCount > 0) {
                    statusEl.textContent = `校验完成！成功: ${successCount}, 失败: ${failedCount}`;
                    statusEl.style.color = 'var(--warning-color)';
                } else {
                    statusEl.textContent = `校验失败！全部请求失败，请检查API配置或稍后重试`;
                    statusEl.style.color = 'var(--error-color)';
                }
            }
            
        } catch (error) {
            console.error('[ClassificationModule] Precheck failed:', error);
            if (statusEl) {
                statusEl.textContent = '校验失败: ' + (error.message || '未知错误');
                statusEl.style.color = 'var(--error-color)';
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = '🔍 重新校验';
            }
        }
    },

    async classifySingleInputWithRetry(input, prompt, model, temperature, maxRetries = 3) {
        let lastError = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await this.classifySingleInput(input, prompt, model, temperature);
                return result;
            } catch (error) {
                lastError = error;
                const errorMsg = error?.message || '';
                
                if (errorMsg.includes('429') || errorMsg.includes('速率限制') || errorMsg.includes('rate limit')) {
                    const waitTime = Math.min(2000 * attempt, 10000);
                    console.log(`[ClassificationModule] Rate limited, waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                } else {
                    throw error;
                }
            }
        }
        
        throw lastError;
    },

    async classifySingleInput(input, prompt, model, temperature) {
        const getUserItem = (key) => {
            if (window.userCacheStorage && window.userCacheStorage.isInitialized()) {
                return window.userCacheStorage.get(key);
            }
            return localStorage.getItem(key);
        };
        
        let provider = 'zhipu';
        if (window.ProviderManager && ProviderManager.getProviderForModel) {
            provider = ProviderManager.getProviderForModel(model);
        } else {
            if (model.startsWith('qwen') || model.startsWith('Qwen') || 
                model.startsWith('qwq') || model.startsWith('QwQ') ||
                model.startsWith('deepseek') || model.startsWith('DeepSeek') ||
                model.startsWith('kimi') || model.startsWith('Kimi') ||
                model.startsWith('minimax') || model.startsWith('MiniMax')) {
                provider = 'aliyun';
            }
        }
        
        let apiKey;
        if (provider === 'aliyun') {
            apiKey = window.appState?.aliyunApiKey || getUserItem('aliyun_api_key');
        } else {
            apiKey = window.appState?.apiKey || getUserItem('api_key') || getUserItem('globalApiKey');
        }
        
        if (!apiKey) {
            const providerName = provider === 'aliyun' ? '阿里云百炼' : '智谱AI';
            throw new Error(`请先配置${providerName}的API Key`);
        }
        
        let inputText;
        if (typeof input.content === 'string') {
            inputText = input.content;
        } else {
            inputText = Object.entries(input.content)
                .filter(([key, value]) => value)
                .map(([key, value]) => `【${key}】\n${value}`)
                .join('\n\n');
        }
        
        const fullPrompt = prompt.replace('{{INPUT}}', inputText);
        
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (provider === 'aliyun') {
            headers['X-LLM-Provider'] = 'aliyun';
            headers['X-Aliyun-API-Key'] = apiKey;
            headers['Authorization'] = `Bearer ${apiKey}`;
        } else {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }
        
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: 'user', content: fullPrompt }
                ],
                temperature: temperature
            })
        });
        
        if (!response.ok) {
            let errorMsg = `API请求失败: ${response.status}`;
            try {
                const errorData = await response.json();
                if (errorData.error) {
                    if (typeof errorData.error === 'string') {
                        errorMsg = errorData.error;
                    } else if (errorData.error.message) {
                        errorMsg = errorData.error.message;
                    } else {
                        errorMsg = JSON.stringify(errorData.error);
                    }
                }
            } catch (e) {
                console.error('[ClassificationModule] Failed to parse error response:', e);
            }
            throw new Error(errorMsg);
        }
        
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        
        try {
            const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```|({[\s\S]*"classification"[\s\S]*})/);
            let jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[2]) : content;
            
            if (!jsonString.includes('{')) {
                jsonString = '{' + jsonString;
            }
            if (!jsonString.includes('}')) {
                jsonString = jsonString + '}';
            }
            
            const result = JSON.parse(jsonString);
            
            let overallConfidence = 0;
            if (result.confidence !== undefined) {
                if (typeof result.confidence === 'number') {
                    overallConfidence = result.confidence;
                } else if (typeof result.confidence === 'object') {
                    const confValues = Object.values(result.confidence).filter(v => typeof v === 'number');
                    if (confValues.length > 0) {
                        overallConfidence = confValues.reduce((a, b) => a + b, 0) / confValues.length;
                    }
                }
            }
            
            return {
                classification: result.classification || {},
                confidence: typeof result.confidence === 'object' ? result.confidence : { overall: result.confidence || 0 },
                reasoning: result.reasoning || '',
                overallConfidence: overallConfidence,
                rawContent: content
            };
        } catch (parseError) {
            console.error('[ClassificationModule] Failed to parse classification result:', parseError);
            return {
                classification: {},
                confidence: {},
                reasoning: '',
                overallConfidence: 0,
                rawContent: content,
                parseError: parseError.message
            };
        }
    },

    renderPrecheckResults(results) {
        const tbody = document.getElementById('classification_precheck_tbody');
        const summaryEl = document.getElementById('classification_precheck_summary');
        
        if (!tbody) return;
        
        const schema = classificationState.getSchema();
        const categories = schema.categories || [];
        
        tbody.innerHTML = '';
        
        results.forEach((item, index) => {
            const tr = document.createElement('tr');
            
            let inputPreview;
            if (typeof item.input.content === 'string') {
                inputPreview = this.truncateText(item.input.content, 50);
            } else {
                inputPreview = Object.values(item.input.content)
                    .filter(v => v)
                    .map(v => this.truncateText(v, 20))
                    .join(' | ');
            }
            
            let classificationText = '-';
            let confidenceText = '-';
            let statusHtml = '-';
            
            if (item.status === 'failed') {
                statusHtml = `<span style="color: var(--error-color);">❌ 失败</span>`;
                classificationText = item.error || '处理失败';
            } else if (item.result) {
                const result = item.result;
                
                if (result.parseError) {
                    statusHtml = `<span style="color: var(--warning-color);">⚠️ 解析异常</span>`;
                    classificationText = '结果解析失败';
                } else {
                    const conf = result.overallConfidence || 0;
                    const confPercent = (conf * 100).toFixed(0);
                    
                    if (conf >= 0.8) {
                        statusHtml = `<span style="color: var(--success-color);">✓ 高确信度</span>`;
                    } else if (conf >= 0.6) {
                        statusHtml = `<span style="color: var(--warning-color);">⚠ 中等确信度</span>`;
                    } else {
                        statusHtml = `<span style="color: var(--error-color);">⚠ 低确信度</span>`;
                    }
                    
                    confidenceText = `${confPercent}%`;
                    
                    if (result.classification) {
                        if (Array.isArray(result.classification)) {
                            classificationText = result.classification.join(' > ');
                        } else if (typeof result.classification === 'object') {
                            const parts = [];
                            Object.entries(result.classification).forEach(([key, value]) => {
                                const valueStr = Array.isArray(value) ? value.join(', ') : value;
                                parts.push(`${key}: ${valueStr}`);
                            });
                            classificationText = parts.join('; ') || '-';
                        }
                    }
                }
            }
            
            tr.innerHTML = `
                <td style="padding: 10px; border-bottom: 1px solid var(--border-color);">${index + 1}</td>
                <td style="padding: 10px; border-bottom: 1px solid var(--border-color); max-width: 200px; overflow: hidden; text-overflow: ellipsis;" title="${inputPreview}">${inputPreview}</td>
                <td style="padding: 10px; border-bottom: 1px solid var(--border-color);">${classificationText}</td>
                <td style="padding: 10px; border-bottom: 1px solid var(--border-color);">${confidenceText}</td>
                <td style="padding: 10px; border-bottom: 1px solid var(--border-color);">${statusHtml}</td>
            `;
            
            tbody.appendChild(tr);
        });
        
        if (summaryEl) {
            const successCount = results.filter(r => r.status === 'success' && !r.result?.parseError).length;
            const avgConfidence = results
                .filter(r => r.result?.overallConfidence !== undefined)
                .reduce((sum, r) => sum + r.result.overallConfidence, 0) / results.length || 0;
            
            summaryEl.innerHTML = `
                <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                    <span><strong>成功处理:</strong> ${successCount}/${results.length} 条</span>
                    <span><strong>平均确信度:</strong> ${(avgConfidence * 100).toFixed(0)}%</span>
                </div>
            `;
        }
    },

    handlePrecheckProceed() {
        console.log('[ClassificationModule] Proceeding to formal classification');
        
        const mode = classificationState.getMode();
        if (mode === 'auto') {
            const allInputs = classificationState.getInputs();
            const selectedCheckboxes = document.querySelectorAll('.classification-input-checkbox:checked');
            let count;
            if (selectedCheckboxes.length > 0) {
                count = selectedCheckboxes.length;
            } else {
                count = allInputs.length;
            }
            const actualMode = count < 50 ? 'async' : 'batch';
            classificationState.setMode(actualMode);
        }
        
        updateClassificationProcessPanelVisibility();
        
        switchClassificationSubTab('result', null);
        
        const stepper = document.getElementById('classification-stepper');
        if (stepper) {
            stepper.querySelectorAll('.step-item').forEach((item, idx) => {
                item.classList.remove('active');
                if (idx === 3) item.classList.add('active');
            });
        }
    },

    handlePrecheckModify() {
        console.log('[ClassificationModule] Modifying classification schema');
        switchClassificationSubTab('schema', null);
        
        const stepper = document.getElementById('classification-stepper');
        if (stepper) {
            stepper.querySelectorAll('.step-item').forEach((item, idx) => {
                item.classList.remove('active');
                if (idx === 1) item.classList.add('active');
            });
        }
    },

    handleExportResults() {
        console.log('[ClassificationModule] Exporting results...');
        
        const results = classificationState.getResults();
        
        if (!results || results.length === 0) {
            alert('没有分类结果可导出');
            return;
        }
        
        const { headers, rows } = ResultAnalyzer.exportResultsToExcel(results);
        
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '分类结果');
        
        const fileName = `分类结果_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        console.log('[ClassificationModule] Results exported to', fileName);
    },

    handleExportToOriginalExcel() {
        console.log('[ClassificationModule] Exporting to original Excel...');
        
        const results = classificationState.getResults();
        const originalData = classificationState.state.currentSheetData;
        const indexColumn = classificationState.state.indexColumn;
        const concatColumns = classificationState.state.concatColumns;
        
        if (!results || results.length === 0) {
            alert('没有分类结果可导出');
            return;
        }
        
        if (!originalData || originalData.length === 0) {
            const exportBtn = document.getElementById('classification_async_export_btn');
            if (exportBtn) {
                exportBtn.click();
            } else {
                alert('没有原始Excel数据，请使用"导出结果Excel"功能');
            }
            return;
        }
        
        const result = ResultAnalyzer.exportToOriginalExcel(results, originalData, indexColumn, concatColumns);
        
        if (result.success) {
            alert(result.message);
        } else {
            alert('导出失败: ' + result.message);
        }
    },

    updateExportButtonState() {
        const results = classificationState.getResults();
        const originalData = classificationState.state.currentSheetData;
        const exportToOriginalBtn = document.getElementById('classification_export_to_original_btn');
        const exportResultsBtn = document.getElementById('classification_async_export_btn');
        
        if (exportToOriginalBtn) {
            exportToOriginalBtn.disabled = results.length === 0 || !originalData || originalData.length === 0;
        }
        
        if (exportResultsBtn) {
            exportResultsBtn.disabled = results.length === 0;
        }
    },

    truncateText(text, maxLength = 100) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    handleCopyPrompt() {
        const preview = document.getElementById('classification_prompt_preview');
        if (!preview || !preview.value.trim()) {
            alert('提示词为空，无法复制');
            return;
        }

        const promptContent = preview.value.trim();
        const schema = classificationState.state.schema;
        const schemaName = schema?.name || '智能分类';

        if (window.smartClipboard) {
            window.smartClipboard.export(promptContent, '智能分类提示词', {
                schemaName: schemaName,
                categoryCount: this.countCategories(schema?.categories || [])
            });
            alert('提示词已复制到智能剪贴板！');
        } else {
            navigator.clipboard.writeText(promptContent).then(() => {
                alert('提示词已复制到系统剪贴板！');
            }).catch(err => {
                console.error('复制失败:', err);
                alert('复制失败，请手动选择复制');
            });
        }
    },

    handlePublishPrompt() {
        const preview = document.getElementById('classification_prompt_preview');
        if (!preview || !preview.value.trim()) {
            alert('提示词为空，无法发布');
            return;
        }

        const promptContent = preview.value.trim();
        const schema = classificationState.state.schema;
        const schemaName = schema?.name || '智能分类';

        if (window.PromptForum && window.PromptForum.open) {
            window.PromptForum.open();
            
            setTimeout(() => {
                window.PromptForum.showView('publish');
                
                setTimeout(() => {
                    const titleInput = document.getElementById('prompt_title');
                    const contentInput = document.getElementById('prompt_content');
                    const descInput = document.getElementById('prompt_description');
                    const categorySelect = document.getElementById('prompt_category');
                    
                    if (titleInput) titleInput.value = schemaName;
                    if (contentInput) contentInput.value = promptContent;
                    if (descInput) {
                        const categoryCount = this.countCategories(schema?.categories || []);
                        descInput.value = `智能分类标引提示词，包含 ${categoryCount} 个分类项`;
                    }
                    
                    if (categorySelect) {
                        for (let i = 0; i < categorySelect.options.length; i++) {
                            if (categorySelect.options[i].text.includes('智能分类') || categorySelect.options[i].text.includes('分类')) {
                                categorySelect.selectedIndex = i;
                                break;
                            }
                        }
                    }
                }, 100);
            }, 200);
        } else {
            alert('提示词广场模块未加载，请刷新页面后重试');
        }
    }
};

window.ClassificationModule = ClassificationModule;

export default ClassificationModule;
export { 
    ClassificationModule,
    classificationState,
    SchemaManager,
    PromptBuilder,
    ExampleLibrary,
    ColdStart,
    ResultAnalyzer,
    ClassificationConfig,
    DEFAULT_SCHEMA,
    DEFAULT_LAYER,
    DEFAULT_EXAMPLE
};
