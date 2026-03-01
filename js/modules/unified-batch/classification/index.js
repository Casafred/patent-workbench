/**
 * 智能分类标引模块 - 入口文件
 */

import classificationState from './state.js';
import SchemaManager from './schema-manager.js';
import PromptBuilder from './prompt-builder.js';
import ExampleLibrary from './example-library.js';
import ColdStart from './cold-start.js';
import ResultAnalyzer from './result-analyzer.js';
import { ClassificationConfig, DEFAULT_SCHEMA, DEFAULT_LAYER, DEFAULT_EXAMPLE } from './config.js';

const ClassificationModule = {
    state: classificationState,
    schema: SchemaManager,
    prompt: PromptBuilder,
    examples: ExampleLibrary,
    coldStart: ColdStart,
    analyzer: ResultAnalyzer,
    config: ClassificationConfig,

    init() {
        console.log('[ClassificationModule] 模块初始化');
        this.bindEvents();
        this.initUI();
        return this;
    },

    bindEvents() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupEventListeners();
        });
    },

    setupEventListeners() {
        const elements = {
            'classification_excel_file': this.handleExcelUpload.bind(this),
            'classification_load_excel_btn': this.handleLoadExcel.bind(this),
            'classification_add_input_btn': this.handleAddManualInput.bind(this),
            'classification_layer_count': this.handleLayerCountChange.bind(this),
            'classification_add_layer_btn': this.handleAddLayer.bind(this),
            'classification_save_schema_btn': this.handleSaveSchema.bind(this),
            'classification_cold_start_btn': this.handleColdStart.bind(this),
            'classification_optimize_prompt_btn': this.handleOptimizePrompt.bind(this),
            'classification_import_schema_btn': this.handleImportSchema.bind(this),
            'classification_export_schema_btn': this.handleExportSchema.bind(this),
            'classification_add_example_btn': this.handleAddExample.bind(this),
            'classification_import_examples_btn': this.handleImportExamples.bind(this),
            'classification_export_examples_btn': this.handleExportExamples.bind(this),
            'classification_async_submit_btn': this.handleSubmitAsync.bind(this),
            'classification_confidence_filter': this.handleConfidenceFilter.bind(this),
            'classification_add_to_examples_btn': this.handleAddToExamples.bind(this)
        };

        Object.entries(elements).forEach(([id, handler]) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('click', handler);
            }
        });

        const schemaSelect = document.getElementById('classification_schema_select');
        if (schemaSelect) {
            schemaSelect.addEventListener('change', this.handleSchemaSelect.bind(this));
        }

        const multiLabelCheckbox = document.getElementById('classification_multi_label');
        if (multiLabelCheckbox) {
            multiLabelCheckbox.addEventListener('change', this.handleMultiLabelChange.bind(this));
        }
    },

    initUI() {
        this.updateSchemaSelect();
        this.updateLayersUI();
        this.updatePromptPreview();
        this.updateExamplesList();
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
        const container = document.getElementById('classification_layers_container');
        if (!container) return;

        const layers = classificationState.getLayers();
        
        container.innerHTML = layers.map((layer, index) => this.renderLayerConfig(layer, index)).join('');
    },

    renderLayerConfig(layer, index) {
        return `
            <div class="layer-config" data-layer-index="${index}" style="border: 1px solid var(--border-color); border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h4 style="margin: 0;">层级 ${layer.level}</h4>
                    <button class="small-button delete-button" onclick="ClassificationModule.removeLayer(${index})">删除层级</button>
                </div>
                <div class="config-item">
                    <label>层级名称:</label>
                    <input type="text" value="${layer.name || ''}" 
                           onchange="ClassificationModule.updateLayerName(${index}, this.value)"
                           placeholder="例如：技术领域">
                </div>
                <div class="config-item">
                    <label>分类原则描述:</label>
                    <textarea rows="2" 
                              onchange="ClassificationModule.updateLayerDescription(${index}, this.value)"
                              placeholder="描述该层级的分类原则和判断标准...">${layer.description || ''}</textarea>
                </div>
                <div class="config-item">
                    <label>分类标签 (每行一个):</label>
                    <textarea rows="3" 
                              onchange="ClassificationModule.updateLayerLabels(${index}, this.value)"
                              placeholder="标签1&#10;标签2&#10;标签3">${(layer.labels || []).join('\n')}</textarea>
                </div>
            </div>
        `;
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
        console.log('Loading Excel file:', file.name);
    },

    handleLoadExcel() {
        console.log('Loading Excel data');
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

        list.innerHTML = inputs.map((input, index) => `
            <div class="input-item" style="padding: 8px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; gap: 10px;">
                <input type="checkbox" class="input-checkbox" data-index="${index}">
                <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${this.truncateText(input.content, 100)}
                </span>
            </div>
        `).join('');
    },

    handleLayerCountChange(e) {
        const count = parseInt(e.target.value) || 1;
        SchemaManager.setLayerCount(count);
        this.updateLayersUI();
        this.updatePromptPreview();
    },

    handleAddLayer() {
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
    },

    handleMultiLabelChange(e) {
        const enabled = e.target.checked;
        SchemaManager.setMultiLabel(enabled);
        this.updatePromptPreview();
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
            
            if (result.success) {
                ColdStart.applySuggestedSchema();
                this.updateLayersUI();
                this.updatePromptPreview();
                
                const nameEl = document.getElementById('classification_schema_name');
                if (nameEl) {
                    nameEl.value = result.suggestedSchema.name;
                }
                
                alert('智能冷启动完成！分类体系已自动生成，您可以在配置页面进行微调。');
            } else {
                alert('智能冷启动失败: ' + result.message);
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = '开始智能冷启动';
            }
        }
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
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${this.state.schema.name || '分类体系'}_${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    },

    handleAddExample() {
        const example = {
            schemaId: this.state.schema.id,
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
        console.log('Submitting async classification');
    },

    handleConfidenceFilter(e) {
        classificationState.setConfidenceFilter(e.target.value);
    },

    handleAddToExamples() {
        const selected = Array.from(this.state.ui.selectedResults);
        if (selected.length === 0) {
            alert('请先选择要添加的结果');
            return;
        }

        selected.forEach(resultId => {
            const result = this.state.results.find(r => r.id === resultId || r.requestId === resultId);
            if (result) {
                ExampleLibrary.addFromResult(result, this.state.schema.layers[0]?.name, false, '低确信度条目');
            }
        });

        this.updateExamplesList();
        alert(`已添加${selected.length}条结果到示例库`);
    },

    deleteExample(exampleId) {
        ExampleLibrary.deleteExample(exampleId);
        this.updateExamplesList();
    },

    truncateText(text, maxLength = 100) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
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
