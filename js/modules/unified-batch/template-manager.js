/**
 * 统一批量处理系统 - 模板管理模块
 * 管理预设模板和自定义模板
 */

import unifiedBatchState from './state.js';
import { PRESET_TEMPLATES, UnifiedBatchConfig } from './config.js';

const { STORAGE_KEYS } = UnifiedBatchConfig;

const TemplateManager = {
    state: unifiedBatchState.state,
    presetTemplates: PRESET_TEMPLATES,

    getAllTemplates() {
        return [...this.presetTemplates, ...this.state.customTemplates];
    },

    getPresetTemplates() {
        return this.presetTemplates;
    },

    getCustomTemplates() {
        return this.state.customTemplates;
    },

    getTemplateById(templateId) {
        let template = this.presetTemplates.find(t => t.id === templateId);
        if (!template) {
            template = this.state.customTemplates.find(t => t.id === templateId);
        }
        return template || null;
    },

    getTemplateByName(name) {
        let template = this.presetTemplates.find(t => t.name === name);
        if (!template) {
            template = this.state.customTemplates.find(t => t.name === name);
        }
        return template || null;
    },

    getCurrentTemplate() {
        return this.state.template;
    },

    setCurrentTemplate(template) {
        this.state.template = { ...this.state.template, ...template };
    },

    loadTemplateToForm(template) {
        if (!template) return;

        this.state.template = {
            id: template.id,
            name: template.name,
            systemPrompt: template.systemPrompt || '',
            userPromptTemplate: template.userPromptTemplate || '',
            model: template.model || 'GLM-4.7-Flash',
            temperature: template.temperature || 0.1,
            outputFields: template.outputFields ? [...template.outputFields] : []
        };

        return this.state.template;
    },

    saveCurrentTemplate() {
        const template = {
            id: `custom_${Date.now()}`,
            ...this.state.template,
            isPreset: false,
            createdAt: new Date().toISOString()
        };

        const existing = this.state.customTemplates.find(t => t.name === template.name);
        if (existing) {
            if (existing.isPreset) {
                return { success: false, message: '不能覆盖预设模板' };
            }
            const index = this.state.customTemplates.indexOf(existing);
            template.id = existing.id;
            this.state.customTemplates[index] = template;
        } else {
            this.state.customTemplates.push(template);
        }

        unifiedBatchState.saveCustomTemplates();
        return { success: true, template, message: '模板已保存' };
    },

    deleteTemplate(templateId) {
        const template = this.state.customTemplates.find(t => t.id === templateId);
        if (!template) {
            return { success: false, message: '模板不存在或为预设模板' };
        }

        this.state.customTemplates = this.state.customTemplates.filter(t => t.id !== templateId);
        unifiedBatchState.saveCustomTemplates();
        return { success: true, message: '模板已删除' };
    },

    importTemplate(templateData) {
        if (!templateData.name || !templateData.systemPrompt) {
            return { success: false, message: '模板格式不正确，缺少必要字段' };
        }

        const template = {
            id: `custom_${Date.now()}`,
            name: templateData.name,
            systemPrompt: templateData.systemPrompt,
            userPromptTemplate: templateData.userPromptTemplate || '',
            model: templateData.model || 'GLM-4.7-Flash',
            temperature: templateData.temperature || 0.1,
            outputFields: templateData.outputFields || [],
            isPreset: false,
            importedAt: new Date().toISOString()
        };

        const existingPreset = this.presetTemplates.find(t => t.name === template.name);
        const existingCustom = this.state.customTemplates.find(t => t.name === template.name);

        if (existingPreset || existingCustom) {
            template.name = `${template.name}_导入_${Date.now()}`;
        }

        this.state.customTemplates.push(template);
        unifiedBatchState.saveCustomTemplates();
        return { success: true, template, message: '模板导入成功' };
    },

    exportTemplate(templateId) {
        const template = this.getTemplateById(templateId);
        if (!template) {
            return { success: false, message: '模板不存在' };
        }

        const exportData = {
            name: template.name,
            systemPrompt: template.systemPrompt,
            userPromptTemplate: template.userPromptTemplate,
            model: template.model,
            temperature: template.temperature,
            outputFields: template.outputFields
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${template.name}_模板_${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        return { success: true, message: '模板已导出' };
    },

    addOutputField(name = '', description = '') {
        if (!this.state.template.outputFields) {
            this.state.template.outputFields = [];
        }

        this.state.template.outputFields.push({
            name: name || `字段${this.state.template.outputFields.length + 1}`,
            description: description || ''
        });

        return this.state.template.outputFields;
    },

    updateOutputField(index, property, value) {
        if (this.state.template.outputFields && this.state.template.outputFields[index]) {
            this.state.template.outputFields[index][property] = value;
        }
        return this.state.template.outputFields;
    },

    removeOutputField(index) {
        if (this.state.template.outputFields && this.state.template.outputFields.length > index) {
            this.state.template.outputFields.splice(index, 1);
        }
        return this.state.template.outputFields;
    },

    getOutputFields() {
        return this.state.template.outputFields || [];
    },

    buildUserPrompt(input, template, selectedColumns = null) {
        let userPrompt = template.userPromptTemplate || '';
        
        let inputContent;
        if (typeof input.content === 'string') {
            inputContent = input.content;
        } else {
            const parts = [];
            Object.entries(input.content).forEach(([key, value]) => {
                parts.push(`以下是"${key}"部分的内容:\n${value}`);
            });
            inputContent = parts.join('\n\n');
        }

        userPrompt = userPrompt.replace(/\{\{INPUT\}\}/g, inputContent);

        if (template.outputFields && template.outputFields.length > 0) {
            const outputSchema = {
                type: 'object',
                properties: {}
            };
            template.outputFields.forEach(field => {
                outputSchema.properties[field.name] = {
                    description: field.description || ''
                };
            });
            
            userPrompt += '\n\n请严格按照以下JSON格式输出结果，不要添加任何额外内容：\n';
            userPrompt += JSON.stringify(outputSchema, null, 2);
        }

        return userPrompt;
    },

    buildRequestBody(input, template) {
        const userPrompt = this.buildUserPrompt(input, template);
        
        const messages = [];
        if (template.systemPrompt) {
            messages.push({ role: 'system', content: template.systemPrompt });
        }
        messages.push({ role: 'user', content: userPrompt });

        return {
            model: template.model,
            temperature: template.temperature,
            messages: messages
        };
    },

    buildBatchRequestItem(input, template, customId) {
        const body = this.buildRequestBody(input, template);
        
        return {
            custom_id: customId,
            method: 'POST',
            url: '/v4/chat/completions',
            body: body
        };
    }
};

export default TemplateManager;
export { TemplateManager };
