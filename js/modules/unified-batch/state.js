/**
 * 统一批量处理系统 - 状态管理模块
 */

import { UnifiedBatchConfig } from './config.js';

const { MODE, STORAGE_KEYS } = UnifiedBatchConfig;

class UnifiedBatchState {
    constructor() {
        this.state = {
            mode: MODE.AUTO,
            inputs: [],
            columnHeaders: [],
            workbook: null,
            currentSheetData: null,
            template: {
                name: '',
                systemPrompt: '你是一个高效的专利文本分析助手。',
                userPromptTemplate: '请根据以下文本，总结其核心技术点：\n\n{{INPUT}}',
                model: 'GLM-4.7-Flash',
                temperature: 0.1,
                outputFields: []
            },
            customTemplates: [],
            task: {
                status: 'idle',
                startTime: null,
                endTime: null
            },
            asyncTask: {
                requests: [],
                tasks: {},
                pollingInterval: null,
                nextRequestId: 1
            },
            batchTask: {
                jsonlContent: '',
                fileId: null,
                batchId: null,
                outputFileId: null,
                resultContent: null,
                autoCheckTimer: null
            },
            results: [],
            reporter: {
                workbook: null,
                sheetData: null,
                jsonlData: null,
                finalOutputData: [],
                outputHeaders: []
            }
        };
        
        this.loadCustomTemplates();
    }

    getInputs() {
        return this.state.inputs;
    }

    setInputs(inputs) {
        this.state.inputs = inputs;
    }

    addInput(input) {
        this.state.inputs.push(input);
    }

    clearInputs() {
        this.state.inputs = [];
        this.state.columnHeaders = [];
        this.state.workbook = null;
        this.state.currentSheetData = null;
    }

    getInputCount() {
        return this.state.inputs.length;
    }

    getMode() {
        return this.state.mode;
    }

    setMode(mode) {
        this.state.mode = mode;
    }

    getTemplate() {
        return this.state.template;
    }

    setTemplate(template) {
        this.state.template = { ...this.state.template, ...template };
    }

    getCustomTemplates() {
        return this.state.customTemplates;
    }

    addCustomTemplate(template) {
        const existing = this.state.customTemplates.find(t => t.name === template.name);
        if (existing) {
            const index = this.state.customTemplates.indexOf(existing);
            this.state.customTemplates[index] = template;
        } else {
            this.state.customTemplates.push(template);
        }
        this.saveCustomTemplates();
    }

    removeCustomTemplate(name) {
        this.state.customTemplates = this.state.customTemplates.filter(t => t.name !== name);
        this.saveCustomTemplates();
    }

    loadCustomTemplates() {
        try {
            const stored = window.userCacheStorage 
                ? window.userCacheStorage.getJSON(STORAGE_KEYS.CUSTOM_TEMPLATES)
                : JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOM_TEMPLATES) || '[]');
            if (stored) {
                this.state.customTemplates = stored;
            }
        } catch (e) {
            console.error('加载自定义模板失败:', e);
            this.state.customTemplates = [];
        }
    }

    saveCustomTemplates() {
        try {
            if (window.userCacheStorage) {
                window.userCacheStorage.setJSON(STORAGE_KEYS.CUSTOM_TEMPLATES, this.state.customTemplates);
            } else {
                localStorage.setItem(STORAGE_KEYS.CUSTOM_TEMPLATES, JSON.stringify(this.state.customTemplates));
            }
        } catch (e) {
            console.error('保存自定义模板失败:', e);
        }
    }

    getAsyncTask() {
        return this.state.asyncTask;
    }

    getBatchTask() {
        return this.state.batchTask;
    }

    getResults() {
        return this.state.results;
    }

    addResult(result) {
        this.state.results.push(result);
    }

    clearResults() {
        this.state.results = [];
    }

    getReporter() {
        return this.state.reporter;
    }

    saveState() {
        try {
            const stateToSave = {
                mode: this.state.mode,
                inputs: this.state.inputs,
                template: this.state.template,
                asyncTask: {
                    requests: this.state.asyncTask.requests,
                    tasks: this.state.asyncTask.tasks
                },
                batchTask: {
                    batchId: this.state.batchTask.batchId,
                    fileId: this.state.batchTask.fileId
                },
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(STORAGE_KEYS.LAST_STATE, JSON.stringify(stateToSave));
        } catch (e) {
            console.error('保存状态失败:', e);
        }
    }

    loadState() {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.LAST_STATE);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.mode) this.state.mode = parsed.mode;
                if (parsed.inputs) this.state.inputs = parsed.inputs;
                if (parsed.template) this.state.template = parsed.template;
                if (parsed.asyncTask) {
                    this.state.asyncTask.requests = parsed.asyncTask.requests || [];
                    this.state.asyncTask.tasks = parsed.asyncTask.tasks || {};
                }
                if (parsed.batchTask) {
                    this.state.batchTask.batchId = parsed.batchTask.batchId;
                    this.state.batchTask.fileId = parsed.batchTask.fileId;
                }
                return true;
            }
        } catch (e) {
            console.error('加载状态失败:', e);
        }
        return false;
    }

    clearState() {
        localStorage.removeItem(STORAGE_KEYS.LAST_STATE);
    }

    reset() {
        this.state.mode = MODE.AUTO;
        this.state.inputs = [];
        this.state.columnHeaders = [];
        this.state.workbook = null;
        this.state.currentSheetData = null;
        this.state.task = { status: 'idle', startTime: null, endTime: null };
        this.state.asyncTask = {
            requests: [],
            tasks: {},
            pollingInterval: null,
            nextRequestId: 1
        };
        this.state.batchTask = {
            jsonlContent: '',
            fileId: null,
            batchId: null,
            outputFileId: null,
            resultContent: null,
            autoCheckTimer: null
        };
        this.state.results = [];
    }
}

const unifiedBatchState = new UnifiedBatchState();

export default unifiedBatchState;
export { UnifiedBatchState };
