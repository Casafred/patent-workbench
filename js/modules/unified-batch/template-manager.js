/**
 * 统一批量处理系统 - 模板管理模块（升级版）
 * 支持双模式字段插入：
 * 1. 分离模式：各字段独立占位符，如 {{字段名}}
 * 2. 合并模式：统一占位符 {{INPUT}}，所有字段合并插入
 */

import unifiedBatchState from './state.js';
import { PRESET_TEMPLATES, UnifiedBatchConfig } from './config.js';

const { STORAGE_KEYS } = UnifiedBatchConfig;

const TemplateManager = {
    state: unifiedBatchState.state,
    presetTemplates: PRESET_TEMPLATES,
    
    INSERT_MODE: {
        MERGED: 'merged',
        SEPARATE: 'separate'
    },

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
    
    getInsertMode() {
        return this.state.template.insertMode || this.INSERT_MODE.MERGED;
    },
    
    setInsertMode(mode) {
        if (Object.values(this.INSERT_MODE).includes(mode)) {
            this.state.template.insertMode = mode;
            return { success: true, mode };
        }
        return { success: false, message: '无效的插入模式' };
    },
    
    getFieldMappings() {
        return this.state.template.fieldMappings || [];
    },
    
    setFieldMappings(mappings) {
        this.state.template.fieldMappings = mappings;
    },
    
    addFieldMapping(columnName, placeholder, description = '') {
        if (!this.state.template.fieldMappings) {
            this.state.template.fieldMappings = [];
        }
        
        const existing = this.state.template.fieldMappings.find(m => m.column === columnName);
        if (existing) {
            existing.placeholder = placeholder;
            existing.description = description;
        } else {
            this.state.template.fieldMappings.push({
                column: columnName,
                placeholder: placeholder || `{{${columnName}}}`,
                description: description
            });
        }
        
        return this.state.template.fieldMappings;
    },
    
    removeFieldMapping(columnName) {
        if (this.state.template.fieldMappings) {
            this.state.template.fieldMappings = this.state.template.fieldMappings.filter(
                m => m.column !== columnName
            );
        }
        return this.state.template.fieldMappings;
    },
    
    removeFieldMappingByIndex(index) {
        if (this.state.template.fieldMappings && this.state.template.fieldMappings.length > index) {
            this.state.template.fieldMappings.splice(index, 1);
        }
        return this.state.template.fieldMappings;
    },
    
    autoGenerateFieldMappings(columnNames) {
        this.state.template.fieldMappings = columnNames.map((col, index) => ({
            column: col,
            placeholder: `{{字段${index + 1}}}`,
            description: ''
        }));
        return this.state.template.fieldMappings;
    },
    
    generateMergedIntroduction(columnNames, introText = '以下是相关内容：') {
        if (!columnNames || columnNames.length === 0) {
            return '';
        }
        
        if (columnNames.length === 1) {
            return `以下是"${columnNames[0]}"的内容：`;
        }
        
        const fieldList = columnNames.map(name => `"${name}"`).join('、');
        return `${introText}\n\n包含字段：${fieldList}`;
    },

    loadTemplateToForm(template) {
        if (!template) return;

        this.state.template = {
            id: template.id,
            name: template.name,
            systemPrompt: template.systemPrompt || '',
            userPromptTemplate: template.userPromptTemplate || '',
            model: template.model || 'glm-4-flash',
            temperature: template.temperature || 0.1,
            outputFields: template.outputFields ? [...template.outputFields] : [],
            insertMode: template.insertMode || this.INSERT_MODE.MERGED,
            fieldMappings: template.fieldMappings ? [...template.fieldMappings] : [],
            mergedIntro: template.mergedIntro || '以下是相关内容：'
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
            model: templateData.model || 'glm-4-flash',
            temperature: templateData.temperature || 0.1,
            outputFields: templateData.outputFields || [],
            insertMode: templateData.insertMode || this.INSERT_MODE.MERGED,
            fieldMappings: templateData.fieldMappings || [],
            mergedIntro: templateData.mergedIntro || '以下是相关内容：',
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
            outputFields: template.outputFields,
            insertMode: template.insertMode,
            fieldMappings: template.fieldMappings,
            mergedIntro: template.mergedIntro
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
        const insertMode = template.insertMode || this.INSERT_MODE.MERGED;
        
        if (insertMode === this.INSERT_MODE.SEPARATE && typeof input.content === 'object') {
            userPrompt = this._buildSeparatePrompt(userPrompt, input.content, template);
        } else {
            userPrompt = this._buildMergedPrompt(userPrompt, input, template);
        }

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
    
    _buildSeparatePrompt(template, content, templateConfig) {
        let result = template;
        const fieldMappings = templateConfig.fieldMappings || [];
        
        if (fieldMappings.length > 0) {
            fieldMappings.forEach(mapping => {
                const value = content[mapping.column] || '';
                result = result.replace(new RegExp(this._escapeRegExp(mapping.placeholder), 'g'), value);
            });
        } else {
            Object.entries(content).forEach(([key, value]) => {
                const placeholder = `{{${key}}}`;
                result = result.replace(new RegExp(this._escapeRegExp(placeholder), 'g'), value);
            });
        }
        
        result = result.replace(/\{\{INPUT\}\}/g, () => {
            return Object.entries(content)
                .map(([k, v]) => `${k}: ${v}`)
                .join('\n\n');
        });
        
        return result;
    },
    
    _buildMergedPrompt(template, input, templateConfig) {
        let inputContent;
        const mergedIntro = templateConfig.mergedIntro || '以下是相关内容：';
        
        if (typeof input.content === 'string') {
            inputContent = input.content;
        } else {
            const parts = [];
            const entries = Object.entries(input.content);
            
            if (entries.length > 1) {
                parts.push(mergedIntro);
            }
            
            entries.forEach(([key, value]) => {
                if (value && value.trim()) {
                    parts.push(`【${key}】\n${value}`);
                }
            });
            inputContent = parts.join('\n\n');
        }

        return template.replace(/\{\{INPUT\}\}/g, inputContent);
    },
    
    _escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },
    
    getAvailablePlaceholders() {
        const template = this.getCurrentTemplate();
        const userPrompt = template.userPromptTemplate || '';
        const placeholders = [];
        
        const mergedMatches = userPrompt.match(/\{\{INPUT\}\}/g) || [];
        if (mergedMatches.length > 0) {
            placeholders.push({
                type: 'merged',
                placeholder: '{{INPUT}}',
                description: '合并所有字段内容'
            });
        }
        
        const separateMatches = userPrompt.match(/\{\{[^}]+\}\}/g) || [];
        separateMatches.forEach(p => {
            if (p !== '{{INPUT}}') {
                placeholders.push({
                    type: 'separate',
                    placeholder: p,
                    description: `字段: ${p.replace(/[{}]/g, '')}`
                });
            }
        });
        
        return placeholders;
    },
    
    validateTemplate(template) {
        const errors = [];
        const warnings = [];
        
        if (!template.systemPrompt || template.systemPrompt.trim() === '') {
            errors.push('系统提示词不能为空');
        }
        
        if (!template.userPromptTemplate || template.userPromptTemplate.trim() === '') {
            errors.push('用户提示词模板不能为空');
        }
        
        const placeholders = this.getAvailablePlaceholders();
        if (placeholders.length === 0) {
            warnings.push('模板中没有占位符，将无法插入数据');
        }
        
        if (template.insertMode === this.INSERT_MODE.SEPARATE) {
            const fieldMappings = template.fieldMappings || [];
            if (fieldMappings.length === 0) {
                warnings.push('分离模式需要配置字段映射');
            }
        }
        
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
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

    buildBatchRequestItem(input, template, customId, provider = 'zhipu') {
        const body = this.buildRequestBody(input, template);
        
        const url = provider === 'aliyun' 
            ? '/v1/chat/completions' 
            : '/v4/chat/completions';
        
        return {
            custom_id: customId,
            method: 'POST',
            url: url,
            body: body
        };
    }
};

export default TemplateManager;
export { TemplateManager };
