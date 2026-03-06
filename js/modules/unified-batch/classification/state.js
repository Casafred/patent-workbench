/**
 * 智能分类标引模块 - 状态管理
 */

import { ClassificationConfig, DEFAULT_SCHEMA, DEFAULT_LAYER, DEFAULT_EXAMPLE } from './config.js';

const { MODE, STORAGE_KEYS, CONFIDENCE } = ClassificationConfig;

class ClassificationState {
    constructor() {
        this.state = {
            mode: MODE.AUTO,
            inputs: [],
            columnHeaders: [],
            workbook: null,
            currentSheetData: null,
            schema: { 
                categories: [],
                model: 'GLM-4.7-Flash',
                temperature: 0.1
            },
            savedSchemas: [],
            examples: [],
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
            },
            coldStart: {
                isRunning: false,
                sampleData: [],
                suggestedSchema: null
            },
            ui: {
                currentSubTab: 'input',
                selectedResults: new Set(),
                confidenceFilter: 'all'
            }
        };
        
        this.loadSavedData();
    }

    loadSavedData() {
        this.loadSavedSchemas();
        this.loadExamples();
        this.loadLastState();
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

    getSchema() {
        return this.state.schema;
    }

    setSchema(schema) {
        this.state.schema = { ...this.state.schema, ...schema };
    }

    resetSchema() {
        this.state.schema = { 
            categories: [],
            model: 'GLM-4.7-Flash',
            temperature: 0.1
        };
    }

    addLayer(layer = null) {
        console.warn('[ClassificationState] addLayer is deprecated, use categories instead');
        return null;
    }

    updateLayer(index, updates) {
        console.warn('[ClassificationState] updateLayer is deprecated, use categories instead');
        return null;
    }

    removeLayer(index) {
        console.warn('[ClassificationState] removeLayer is deprecated, use categories instead');
        return [];
    }

    getLayer(index) {
        console.warn('[ClassificationState] getLayer is deprecated, use categories instead');
        return null;
    }

    getLayers() {
        console.warn('[ClassificationState] getLayers is deprecated, use schema.categories instead');
        return [];
    }

    getSchema() {
        return this.state.schema;
    }

    setSchema(schema) {
        this.state.schema = schema;
        this.saveState();
    }

    getSavedSchemas() {
        return this.state.savedSchemas;
    }

    loadSavedSchemas() {
        try {
            const stored = window.userCacheStorage 
                ? window.userCacheStorage.getJSON(STORAGE_KEYS.SCHEMAS)
                : JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHEMAS) || '[]');
            if (stored && Array.isArray(stored)) {
                this.state.savedSchemas = stored;
            }
        } catch (e) {
            console.error('加载分类体系失败:', e);
            this.state.savedSchemas = [];
        }
    }

    saveSchema() {
        const schema = {
            ...this.state.schema,
            id: this.state.schema.id || `schema_${Date.now()}`,
            updatedAt: new Date().toISOString()
        };
        
        if (!schema.createdAt) {
            schema.createdAt = schema.updatedAt;
        }

        const existingIndex = this.state.savedSchemas.findIndex(s => s.id === schema.id);
        if (existingIndex >= 0) {
            this.state.savedSchemas[existingIndex] = schema;
        } else {
            this.state.savedSchemas.push(schema);
        }

        this.state.schema = schema;
        this.persistSchemas();
        return schema;
    }

    deleteSchema(schemaId) {
        this.state.savedSchemas = this.state.savedSchemas.filter(s => s.id !== schemaId);
        this.persistSchemas();
        return true;
    }

    loadSchema(schemaId) {
        const schema = this.state.savedSchemas.find(s => s.id === schemaId);
        if (schema) {
            this.state.schema = { ...schema };
        }
        return schema;
    }

    persistSchemas() {
        try {
            if (window.userCacheStorage) {
                window.userCacheStorage.setJSON(STORAGE_KEYS.SCHEMAS, this.state.savedSchemas);
            } else {
                localStorage.setItem(STORAGE_KEYS.SCHEMAS, JSON.stringify(this.state.savedSchemas));
            }
        } catch (e) {
            console.error('保存分类体系失败:', e);
        }
    }

    getExamples(schemaId = null) {
        if (schemaId) {
            return this.state.examples.filter(e => e.schemaId === schemaId);
        }
        return this.state.examples;
    }

    loadExamples() {
        try {
            const stored = window.userCacheStorage 
                ? window.userCacheStorage.getJSON(STORAGE_KEYS.EXAMPLES)
                : JSON.parse(localStorage.getItem(STORAGE_KEYS.EXAMPLES) || '[]');
            if (stored && Array.isArray(stored)) {
                this.state.examples = stored;
            }
        } catch (e) {
            console.error('加载示例库失败:', e);
            this.state.examples = [];
        }
    }

    addExample(example) {
        const newExample = {
            ...DEFAULT_EXAMPLE,
            ...example,
            id: example.id || `example_${Date.now()}`,
            createdAt: new Date().toISOString()
        };
        this.state.examples.push(newExample);
        this.persistExamples();
        return newExample;
    }

    updateExample(exampleId, updates) {
        const index = this.state.examples.findIndex(e => e.id === exampleId);
        if (index >= 0) {
            this.state.examples[index] = {
                ...this.state.examples[index],
                ...updates
            };
            this.persistExamples();
            return this.state.examples[index];
        }
        return null;
    }

    deleteExample(exampleId) {
        this.state.examples = this.state.examples.filter(e => e.id !== exampleId);
        this.persistExamples();
        return true;
    }

    persistExamples() {
        try {
            if (window.userCacheStorage) {
                window.userCacheStorage.setJSON(STORAGE_KEYS.EXAMPLES, this.state.examples);
            } else {
                localStorage.setItem(STORAGE_KEYS.EXAMPLES, JSON.stringify(this.state.examples));
            }
        } catch (e) {
            console.error('保存示例库失败:', e);
        }
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

    getConfidenceLevel(confidence) {
        if (confidence < CONFIDENCE.LOW_THRESHOLD) {
            return CONFIDENCE.LEVELS.LOW;
        } else if (confidence < CONFIDENCE.MEDIUM_THRESHOLD) {
            return CONFIDENCE.LEVELS.MEDIUM;
        }
        return CONFIDENCE.LEVELS.HIGH;
    }

    getFilteredResults() {
        const filter = this.state.ui.confidenceFilter;
        if (filter === 'all') {
            return this.state.results;
        }
        
        return this.state.results.filter(result => {
            const level = this.getConfidenceLevel(result.confidence || 0);
            return level === filter;
        });
    }

    getLowConfidenceResults() {
        return this.state.results.filter(result => {
            const confidence = result.confidence || 0;
            return confidence < CONFIDENCE.LOW_THRESHOLD;
        });
    }

    getAsyncTask() {
        return this.state.asyncTask;
    }

    getBatchTask() {
        return this.state.batchTask;
    }

    getColdStart() {
        return this.state.coldStart;
    }

    setColdStartRunning(isRunning) {
        this.state.coldStart.isRunning = isRunning;
    }

    setColdStartSample(data) {
        this.state.coldStart.sampleData = data;
    }

    setColdStartSuggestion(schema) {
        this.state.coldStart.suggestedSchema = schema;
    }

    getUI() {
        return this.state.ui;
    }

    setSelectedResults(selected) {
        this.state.ui.selectedResults = new Set(selected);
    }

    toggleResultSelection(resultId) {
        if (this.state.ui.selectedResults.has(resultId)) {
            this.state.ui.selectedResults.delete(resultId);
        } else {
            this.state.ui.selectedResults.add(resultId);
        }
        return this.state.ui.selectedResults;
    }

    setConfidenceFilter(filter) {
        this.state.ui.confidenceFilter = filter;
    }

    saveState() {
        try {
            const stateToSave = {
                mode: this.state.mode,
                inputs: this.state.inputs,
                schema: this.state.schema,
                indexColumn: this.state.indexColumn,
                concatColumns: this.state.concatColumns,
                currentSheetData: this.state.currentSheetData,
                asyncTask: {
                    requests: this.state.asyncTask.requests,
                    tasks: this.state.asyncTask.tasks
                },
                batchTask: {
                    batchId: this.state.batchTask.batchId,
                    fileId: this.state.batchTask.fileId
                },
                results: this.state.results,
                timestamp: new Date().toISOString()
            };
            
            if (window.userCacheStorage) {
                window.userCacheStorage.setJSON(STORAGE_KEYS.LAST_STATE, stateToSave);
            } else {
                localStorage.setItem(STORAGE_KEYS.LAST_STATE, JSON.stringify(stateToSave));
            }
        } catch (e) {
            console.error('保存状态失败:', e);
        }
    }

    loadLastState() {
        try {
            const saved = window.userCacheStorage 
                ? window.userCacheStorage.getJSON(STORAGE_KEYS.LAST_STATE)
                : JSON.parse(localStorage.getItem(STORAGE_KEYS.LAST_STATE) || 'null');
                
            if (saved) {
                if (saved.mode) this.state.mode = saved.mode;
                if (saved.inputs) this.state.inputs = saved.inputs;
                if (saved.schema) this.state.schema = saved.schema;
                if (saved.indexColumn) this.state.indexColumn = saved.indexColumn;
                if (saved.concatColumns) this.state.concatColumns = saved.concatColumns;
                if (saved.currentSheetData) this.state.currentSheetData = saved.currentSheetData;
                if (saved.asyncTask) {
                    this.state.asyncTask.requests = saved.asyncTask.requests || [];
                    this.state.asyncTask.tasks = saved.asyncTask.tasks || {};
                }
                if (saved.batchTask) {
                    this.state.batchTask.batchId = saved.batchTask.batchId;
                    this.state.batchTask.fileId = saved.batchTask.fileId;
                }
                if (saved.results) {
                    this.state.results = saved.results;
                }
                return true;
            }
        } catch (e) {
            console.error('加载状态失败:', e);
        }
        return false;
    }

    clearState() {
        if (window.userCacheStorage) {
            window.userCacheStorage.remove(STORAGE_KEYS.LAST_STATE);
        } else {
            localStorage.removeItem(STORAGE_KEYS.LAST_STATE);
        }
    }

    reset() {
        this.state.mode = MODE.AUTO;
        this.state.inputs = [];
        this.state.columnHeaders = [];
        this.state.workbook = null;
        this.state.currentSheetData = null;
        this.state.schema = { ...DEFAULT_SCHEMA };
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
        this.state.coldStart = {
            isRunning: false,
            sampleData: [],
            suggestedSchema: null
        };
        this.state.ui = {
            currentSubTab: 'input',
            selectedResults: new Set(),
            confidenceFilter: 'all'
        };
    }

    getReporter() {
        return this.state.reporter;
    }
}

const classificationState = new ClassificationState();

export default classificationState;
export { ClassificationState };
