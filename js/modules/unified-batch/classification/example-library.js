/**
 * 智能分类标引模块 - 示例库管理器
 */

import classificationState from './state.js';
import { DEFAULT_EXAMPLE } from './config.js';

const ExampleLibrary = {
    state: classificationState.state,

    getAllExamples() {
        return this.state.examples;
    },

    getExamplesBySchema(schemaId) {
        return this.state.examples.filter(e => e.schemaId === schemaId);
    },

    getExamplesByLayer(schemaId, layerLevel) {
        return this.state.examples.filter(e => 
            e.schemaId === schemaId && e.layerLevel === layerLevel
        );
    },

    getPositiveExamples(schemaId = null) {
        const examples = schemaId 
            ? this.getExamplesBySchema(schemaId)
            : this.getAllExamples();
        return examples.filter(e => e.type === 'positive');
    },

    getNegativeExamples(schemaId = null) {
        const examples = schemaId 
            ? this.getExamplesBySchema(schemaId)
            : this.getAllExamples();
        return examples.filter(e => e.type === 'negative');
    },

    getExampleById(exampleId) {
        return this.state.examples.find(e => e.id === exampleId);
    },

    addExample(exampleData) {
        const example = {
            ...DEFAULT_EXAMPLE,
            ...exampleData,
            id: `example_${Date.now()}`,
            createdAt: new Date().toISOString()
        };

        if (!example.schemaId && this.state.schema.id) {
            example.schemaId = this.state.schema.id;
        }

        return classificationState.addExample(example);
    },

    addFromResult(result, layerName, isCorrect = true, note = '') {
        const layer = this.state.schema.layers.find(l => l.name === layerName);
        
        const exampleData = {
            schemaId: this.state.schema.id,
            layerLevel: layer ? layer.level : 1,
            input: result.input || result.inputPreview || '',
            correctLabel: isCorrect 
                ? result.classification?.[layerName] 
                : (note || '需要人工标注'),
            wrongLabel: isCorrect ? '' : result.classification?.[layerName],
            type: isCorrect ? 'positive' : 'negative',
            confidence: result.confidence?.[layerName] || result.overallConfidence,
            note: note
        };

        return this.addExample(exampleData);
    },

    updateExample(exampleId, updates) {
        return classificationState.updateExample(exampleId, updates);
    },

    deleteExample(exampleId) {
        return classificationState.deleteExample(exampleId);
    },

    deleteExamplesBySchema(schemaId) {
        const toDelete = this.state.examples
            .filter(e => e.schemaId === schemaId)
            .map(e => e.id);
        
        toDelete.forEach(id => this.deleteExample(id));
        
        return toDelete.length;
    },

    batchAddExamples(examplesData) {
        const added = [];
        examplesData.forEach(data => {
            const example = this.addExample(data);
            added.push(example);
        });
        return added;
    },

    exportExamples(schemaId = null) {
        const examples = schemaId 
            ? this.getExamplesBySchema(schemaId)
            : this.getAllExamples();

        if (examples.length === 0) {
            return { success: false, message: '没有可导出的示例' };
        }

        const exportData = {
            version: '1.0',
            type: 'classification_examples',
            exportedAt: new Date().toISOString(),
            schemaId: schemaId || null,
            count: examples.length,
            data: examples.map(e => ({
                layerLevel: e.layerLevel,
                input: e.input,
                correctLabel: e.correctLabel,
                wrongLabel: e.wrongLabel,
                type: e.type,
                confidence: e.confidence,
                note: e.note
            }))
        };

        return { success: true, data: exportData };
    },

    importExamples(importData, schemaId = null) {
        if (!importData || importData.type !== 'classification_examples') {
            return { success: false, message: '无效的示例文件' };
        }

        const targetSchemaId = schemaId || this.state.schema.id;
        if (!targetSchemaId) {
            return { success: false, message: '请先选择或创建分类体系' };
        }

        const examples = importData.data;
        if (!Array.isArray(examples)) {
            return { success: false, message: '示例数据格式错误' };
        }

        let imported = 0;
        let failed = 0;

        examples.forEach(exampleData => {
            try {
                this.addExample({
                    ...exampleData,
                    schemaId: targetSchemaId
                });
                imported++;
            } catch (e) {
                failed++;
            }
        });

        return {
            success: true,
            imported,
            failed,
            message: `成功导入${imported}个示例${failed > 0 ? `，${failed}个失败` : ''}`
        };
    },

    downloadExportFile(schemaId = null) {
        const result = this.exportExamples(schemaId);
        
        if (!result.success) {
            return result;
        }

        const blob = new Blob([JSON.stringify(result.data, null, 2)], { 
            type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `分类示例库_${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        
        return { success: true, message: '导出成功' };
    },

    getExampleStats(schemaId = null) {
        const examples = schemaId 
            ? this.getExamplesBySchema(schemaId)
            : this.getAllExamples();

        const stats = {
            total: examples.length,
            positive: 0,
            negative: 0,
            byLayer: {},
            avgConfidence: 0
        };

        let totalConfidence = 0;
        let confidenceCount = 0;

        examples.forEach(e => {
            if (e.type === 'positive') {
                stats.positive++;
            } else {
                stats.negative++;
            }

            if (!stats.byLayer[e.layerLevel]) {
                stats.byLayer[e.layerLevel] = 0;
            }
            stats.byLayer[e.layerLevel]++;

            if (e.confidence !== null && e.confidence !== undefined) {
                totalConfidence += e.confidence;
                confidenceCount++;
            }
        });

        stats.avgConfidence = confidenceCount > 0 
            ? (totalConfidence / confidenceCount).toFixed(2) 
            : 0;

        return stats;
    },

    searchExamples(query, schemaId = null) {
        const examples = schemaId 
            ? this.getExamplesBySchema(schemaId)
            : this.getAllExamples();

        const lowerQuery = query.toLowerCase();
        
        return examples.filter(e => 
            (e.input && e.input.toLowerCase().includes(lowerQuery)) ||
            (e.correctLabel && e.correctLabel.toLowerCase().includes(lowerQuery)) ||
            (e.note && e.note.toLowerCase().includes(lowerQuery))
        );
    },

    getLowConfidenceExamples(schemaId = null, threshold = 0.6) {
        const examples = schemaId 
            ? this.getExamplesBySchema(schemaId)
            : this.getAllExamples();

        return examples.filter(e => 
            e.confidence !== null && e.confidence < threshold
        );
    },

    formatExampleForDisplay(example) {
        return {
            id: example.id,
            preview: this.truncateText(example.input, 100),
            label: example.correctLabel,
            type: example.type === 'positive' ? '正确示例' : '错误示例',
            confidence: example.confidence 
                ? `${(example.confidence * 100).toFixed(0)}%` 
                : '-',
            note: example.note || ''
        };
    },

    truncateText(text, maxLength = 100) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
};

export default ExampleLibrary;
export { ExampleLibrary };
