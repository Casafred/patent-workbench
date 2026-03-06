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

    addLabelToLayer(layerIndex, label, parentLabel = null) {
        const layer = this.getLayer(layerIndex);
        if (layer) {
            if (parentLabel !== null) {
                if (!layer.children) {
                    layer.children = {};
                }
                if (!layer.children[parentLabel]) {
                    layer.children[parentLabel] = [];
                }
                if (!layer.children[parentLabel].includes(label)) {
                    layer.children[parentLabel].push(label);
                    this.updateLayer(layerIndex, { children: layer.children });
                }
            } else {
                if (!layer.labels.includes(label)) {
                    layer.labels.push(label);
                    this.updateLayer(layerIndex, { labels: layer.labels });
                }
            }
        }
        return layer;
    },

    removeLabelFromLayer(layerIndex, labelIndex, parentLabel = null) {
        const layer = this.getLayer(layerIndex);
        if (layer) {
            if (parentLabel !== null && layer.children && layer.children[parentLabel]) {
                layer.children[parentLabel].splice(labelIndex, 1);
                if (layer.children[parentLabel].length === 0) {
                    delete layer.children[parentLabel];
                }
                this.updateLayer(layerIndex, { children: layer.children });
            } else if (layer.labels[labelIndex] !== undefined) {
                const removedLabel = layer.labels[labelIndex];
                layer.labels.splice(labelIndex, 1);
                if (layer.children && layer.children[removedLabel]) {
                    delete layer.children[removedLabel];
                }
                this.updateLayer(layerIndex, { labels: layer.labels, children: layer.children });
            }
        }
        return layer;
    },

    getChildLabels(layerIndex, parentLabel) {
        const layer = this.getLayer(layerIndex);
        if (layer && layer.children && layer.children[parentLabel]) {
            return layer.children[parentLabel];
        }
        return [];
    },

    setChildLabels(layerIndex, parentLabel, childLabels) {
        const layer = this.getLayer(layerIndex);
        if (layer) {
            if (!layer.children) {
                layer.children = {};
            }
            layer.children[parentLabel] = childLabels;
            this.updateLayer(layerIndex, { children: layer.children });
        }
        return layer;
    },

    hasChildLabels(layerIndex, parentLabel) {
        const layer = this.getLayer(layerIndex);
        return layer && layer.children && layer.children[parentLabel] && layer.children[parentLabel].length > 0;
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

        const categories = schema.categories || [];
        if (categories.length === 0) {
            errors.push('请至少添加一个分类项');
        }

        const validateCategories = (cats, path = '') => {
            cats.forEach((cat, index) => {
                if (!cat.name || cat.name.trim() === '') {
                    errors.push(`${path}第${index + 1}项：请输入分类名称`);
                }
                if (cat.children && cat.children.length > 0) {
                    validateCategories(cat.children, `${path}${cat.name || '未命名'} > `);
                }
            });
        };
        
        validateCategories(categories);

        return {
            valid: errors.length === 0,
            errors
        };
    },

    getSchemaSummary() {
        const schema = this.state.schema;
        const categories = schema.categories || [];
        
        const countCategories = (cats) => {
            let count = 0;
            cats.forEach(cat => {
                count++;
                if (cat.children && cat.children.length > 0) {
                    count += countCategories(cat.children);
                }
            });
            return count;
        };

        const summary = {
            name: schema.name,
            categoryCount: countCategories(categories),
            categories: categories.map(cat => ({
                name: cat.name,
                childCount: cat.children ? cat.children.length : 0
            }))
        };

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
            version: '2.0',
            type: 'classification_schema',
            exportedAt: new Date().toISOString(),
            data: {
                name: schema.name,
                categories: schema.categories || [],
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
            id: `schema_${Date.now()}`,
            name: data.name || '导入的分类体系',
            categories: data.categories || data.layers || [],
            model: data.model || 'GLM-4.7-Flash',
            temperature: data.temperature || 0.1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        classificationState.setSchema(schema);
        classificationState.saveSchema();

        return { success: true, schema, message: '分类体系导入成功' };
    },

    validateSchemaObject(schema) {
        const errors = [];

        if (!schema.name || schema.name.trim() === '') {
            errors.push('分类体系名称不能为空');
        }

        const categories = schema.categories || [];
        if (categories.length === 0) {
            errors.push('分类项不能为空');
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
