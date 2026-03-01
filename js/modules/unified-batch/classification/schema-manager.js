/**
 * 智能分类标引模块 - 分类体系管理器
 */

import classificationState from './state.js';
import { ClassificationConfig, DEFAULT_SCHEMA, DEFAULT_LAYER } from './config.js';

const SchemaManager = {
    state: classificationState.state,

    createSchema(name = '') {
        const schema = {
            ...DEFAULT_SCHEMA,
            id: `schema_${Date.now()}`,
            name: name,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        classificationState.setSchema(schema);
        return schema;
    },

    loadSchema(schemaId) {
        return classificationState.loadSchema(schemaId);
    },

    saveSchema() {
        return classificationState.saveSchema();
    },

    deleteSchema(schemaId) {
        return classificationState.deleteSchema(schemaId);
    },

    getCurrentSchema() {
        return this.state.schema;
    },

    getSavedSchemas() {
        return this.state.savedSchemas;
    },

    updateSchemaName(name) {
        this.state.schema.name = name;
        return this.state.schema;
    },

    setMultiLabel(enabled, maxLabels = 3) {
        this.state.schema.multiLabel = enabled;
        this.state.schema.maxLabels = enabled ? Math.min(maxLabels, ClassificationConfig.MULTI_LABEL.MAX_LABELS) : 1;
        return this.state.schema;
    },

    addLayer(layerData = {}) {
        const layer = {
            ...DEFAULT_LAYER,
            ...layerData,
            level: this.state.schema.layers.length + 1
        };
        return classificationState.addLayer(layer);
    },

    updateLayer(index, updates) {
        return classificationState.updateLayer(index, updates);
    },

    removeLayer(index) {
        return classificationState.removeLayer(index);
    },

    getLayer(index) {
        return classificationState.getLayer(index);
    },

    getLayers() {
        return classificationState.getLayers();
    },

    setLayerName(index, name) {
        return this.updateLayer(index, { name });
    },

    setLayerDescription(index, description) {
        return this.updateLayer(index, { description });
    },

    addLabelToLayer(layerIndex, label) {
        const layer = this.getLayer(layerIndex);
        if (layer) {
            if (!layer.labels.includes(label)) {
                layer.labels.push(label);
                this.updateLayer(layerIndex, { labels: layer.labels });
            }
        }
        return layer;
    },

    removeLabelFromLayer(layerIndex, labelIndex) {
        const layer = this.getLayer(layerIndex);
        if (layer && layer.labels[labelIndex] !== undefined) {
            layer.labels.splice(labelIndex, 1);
            this.updateLayer(layerIndex, { labels: layer.labels });
        }
        return layer;
    },

    updateLabelsInLayer(layerIndex, labels) {
        return this.updateLayer(layerIndex, { labels });
    },

    setLayerCount(count) {
        const currentCount = this.state.schema.layers.length;
        
        if (count > currentCount) {
            for (let i = currentCount; i < count; i++) {
                this.addLayer();
            }
        } else if (count < currentCount) {
            for (let i = currentCount - 1; i >= count; i--) {
                this.removeLayer(i);
            }
        }
        
        return this.state.schema.layers;
    },

    validateSchema() {
        const errors = [];
        const schema = this.state.schema;

        if (!schema.name || schema.name.trim() === '') {
            errors.push('请输入分类体系名称');
        }

        if (schema.layers.length === 0) {
            errors.push('请至少添加一个分类层级');
        }

        schema.layers.forEach((layer, index) => {
            if (!layer.name || layer.name.trim() === '') {
                errors.push(`层级${index + 1}：请输入层级名称`);
            }
            if (!layer.labels || layer.labels.length === 0) {
                errors.push(`层级${index + 1}：请至少添加一个分类标签`);
            }
        });

        return {
            valid: errors.length === 0,
            errors
        };
    },

    getSchemaSummary() {
        const schema = this.state.schema;
        const summary = {
            name: schema.name,
            layerCount: schema.layers.length,
            layers: [],
            multiLabel: schema.multiLabel,
            maxLabels: schema.maxLabels
        };

        schema.layers.forEach(layer => {
            summary.layers.push({
                level: layer.level,
                name: layer.name,
                labelCount: layer.labels.length,
                labels: layer.labels
            });
        });

        return summary;
    },

    exportSchema(schemaId = null) {
        const schema = schemaId 
            ? this.state.savedSchemas.find(s => s.id === schemaId)
            : this.state.schema;

        if (!schema) {
            return { success: false, message: '分类体系不存在' };
        }

        const exportData = {
            version: '1.0',
            type: 'classification_schema',
            exportedAt: new Date().toISOString(),
            data: {
                name: schema.name,
                layers: schema.layers,
                multiLabel: schema.multiLabel,
                maxLabels: schema.maxLabels,
                model: schema.model,
                temperature: schema.temperature
            }
        };

        return { success: true, data: exportData };
    },

    importSchema(importData) {
        if (!importData || importData.type !== 'classification_schema') {
            return { success: false, message: '无效的分类体系文件' };
        }

        const data = importData.data;
        const schema = {
            ...DEFAULT_SCHEMA,
            id: `schema_${Date.now()}`,
            name: data.name || '导入的分类体系',
            layers: data.layers || [],
            multiLabel: data.multiLabel || false,
            maxLabels: data.maxLabels || 1,
            model: data.model || 'GLM-4.7-Flash',
            temperature: data.temperature || 0.1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const validation = this.validateSchemaObject(schema);
        if (!validation.valid) {
            return { success: false, message: validation.errors.join('; ') };
        }

        classificationState.setSchema(schema);
        classificationState.saveSchema();

        return { success: true, schema, message: '分类体系导入成功' };
    },

    validateSchemaObject(schema) {
        const errors = [];

        if (!schema.name || schema.name.trim() === '') {
            errors.push('分类体系名称不能为空');
        }

        if (!schema.layers || schema.layers.length === 0) {
            errors.push('分类层级不能为空');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    },

    duplicateSchema(schemaId) {
        const original = this.state.savedSchemas.find(s => s.id === schemaId);
        if (!original) {
            return { success: false, message: '原分类体系不存在' };
        }

        const duplicate = {
            ...original,
            id: `schema_${Date.now()}`,
            name: `${original.name} (副本)`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.state.savedSchemas.push(duplicate);
        classificationState.persistSchemas();

        return { success: true, schema: duplicate };
    },

    getSchemaSelectOptions() {
        const options = [
            { value: 'new', label: '+ 新建分类体系' }
        ];

        this.state.savedSchemas.forEach(schema => {
            options.push({
                value: schema.id,
                label: schema.name
            });
        });

        return options;
    }
};

export default SchemaManager;
export { SchemaManager };
