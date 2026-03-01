/**
 * 统一批量处理系统 - 模块入口
 * 整合所有子模块，提供统一的API
 */

import unifiedBatchState from './state.js';
import { UnifiedBatchConfig, PRESET_TEMPLATES } from './config.js';
import UnifiedBatchRouter from './router.js';
import InputHandler from './input-handler.js';
import TemplateManager from './template-manager.js';
import OutputHandler from './output-handler.js';
import AsyncEngine from './engines/async-engine.js';
import BatchEngine from './engines/batch-engine.js';
import ClassificationModule from './classification/index.js';

const UnifiedBatch = {
    config: UnifiedBatchConfig,
    state: unifiedBatchState,
    router: UnifiedBatchRouter,
    input: InputHandler,
    template: TemplateManager,
    output: OutputHandler,
    asyncEngine: AsyncEngine,
    batchEngine: BatchEngine,
    classification: ClassificationModule,

    init() {
        this.state.loadState();
        this.state.loadCustomTemplates();
        console.log('[UnifiedBatch] 模块初始化完成');
    },

    async loadExcel(file) {
        return await this.input.handleExcelUpload(file);
    },

    loadSheet(sheetName) {
        return this.input.loadSheet(sheetName);
    },

    loadInputsFromColumns(columns) {
        return this.input.loadInputsFromColumns(columns);
    },

    addManualInput(text) {
        return this.input.addManualInput(text);
    },

    getInputs() {
        return this.input.getInputs();
    },

    getInputCount() {
        return this.input.getInputCount();
    },

    getMode() {
        return this.state.getMode();
    },

    setMode(mode) {
        this.state.setMode(mode);
    },

    getRecommendedMode() {
        const count = this.getInputCount();
        return this.router.getRecommendation(count);
    },

    getActualMode() {
        const count = this.getInputCount();
        const userMode = this.state.getMode();
        return this.router.determineMode(count, userMode);
    },

    getTemplates() {
        return this.template.getAllTemplates();
    },

    getPresetTemplates() {
        return this.template.getPresetTemplates();
    },

    getCurrentTemplate() {
        return this.template.getCurrentTemplate();
    },

    setCurrentTemplate(template) {
        this.template.setCurrentTemplate(template);
    },

    loadTemplate(templateId) {
        const template = this.template.getTemplateById(templateId);
        if (template) {
            this.template.loadTemplateToForm(template);
            return { success: true, template };
        }
        return { success: false, message: '模板不存在' };
    },

    saveTemplate() {
        return this.template.saveCurrentTemplate();
    },

    deleteTemplate(templateId) {
        return this.template.deleteTemplate(templateId);
    },

    async startProcessing(onProgress, onComplete) {
        const inputs = this.input.getInputs();
        const template = this.template.getCurrentTemplate();
        const mode = this.getActualMode();

        if (inputs.length === 0) {
            return { success: false, message: '没有输入数据' };
        }

        if (!template.systemPrompt) {
            return { success: false, message: '请配置模板' };
        }

        this.output.clearResults();

        if (mode === 'async') {
            await this.asyncEngine.start(inputs, template, onProgress, onComplete);
            return { success: true, mode: 'async' };
        } else {
            this.batchEngine.generateJsonl(inputs, template);
            const uploadResult = await this.batchEngine.uploadJsonl();
            
            if (!uploadResult.success) {
                return uploadResult;
            }

            const createResult = await this.batchEngine.createBatch();
            
            if (!createResult.success) {
                return createResult;
            }

            this.batchEngine.startAutoCheck(onProgress, onComplete);
            return { success: true, mode: 'batch', batchId: createResult.batchId };
        }
    },

    stopProcessing() {
        const mode = this.getActualMode();
        if (mode === 'async') {
            return this.asyncEngine.stop();
        } else {
            return this.batchEngine.stop();
        }
    },

    resumeProcessing(onProgress, onComplete) {
        const mode = this.getActualMode();
        const template = this.template.getCurrentTemplate();

        if (mode === 'async') {
            return this.asyncEngine.resume(template, onProgress, onComplete);
        } else {
            const batchId = this.state.getBatchTask().batchId;
            if (batchId) {
                return this.batchEngine.recoverFromBatchId(batchId, onProgress, onComplete);
            }
            return { success: false, message: '没有可恢复的批处理任务' };
        }
    },

    getProgressStats() {
        return this.output.getProgressStats();
    },

    getResults() {
        return this.output.getResults();
    },

    exportResults() {
        const mode = this.getActualMode();
        if (mode === 'async') {
            return this.asyncEngine.exportCurrentResults();
        } else {
            return this.batchEngine.exportReport();
        }
    },

    generateReport(originalData) {
        return this.batchEngine.generateReport(originalData);
    },

    reset() {
        this.input.clearInputs();
        this.output.clearResults();
        this.asyncEngine.stop();
        this.batchEngine.reset();
        this.state.reset();
    },

    saveState() {
        this.state.saveState();
    },

    loadState() {
        return this.state.loadState();
    },

    clearState() {
        this.state.clearState();
    }
};

window.UnifiedBatch = UnifiedBatch;

export default UnifiedBatch;
export { 
    UnifiedBatch,
    UnifiedBatchConfig,
    UnifiedBatchRouter,
    InputHandler,
    TemplateManager,
    OutputHandler,
    AsyncEngine,
    BatchEngine,
    PRESET_TEMPLATES
};
