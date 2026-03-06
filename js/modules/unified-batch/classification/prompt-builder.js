/**
 * 智能分类标引模块 - 提示词构建器
 */

import classificationState from './state.js';
import { ClassificationConfig, CLASSIFICATION_PROMPT_TEMPLATE } from './config.js';

const PromptBuilder = {
    state: classificationState.state,

    buildSystemPrompt(schema = null) {
        const currentSchema = schema || this.state.schema;
        
        let systemPrompt = '你是一个专业的分类标引助手。你的任务是根据给定的分类体系，对输入文本进行准确的分类标引。\n\n';
        
        systemPrompt += '## 重要规则\n';
        systemPrompt += '1. 必须严格按照指定的分类标签进行选择，不能创造新标签\n';
        systemPrompt += '2. 对于每个分类层级，需要给出确信度评分（0-1之间的小数）\n';
        systemPrompt += '3. 如果无法确定分类，选择最接近的标签并在reasoning中说明\n';
        
        if (currentSchema.multiLabel) {
            systemPrompt += `4. 这是一个多标签分类任务，每条数据可以属于多个类别（最多${currentSchema.maxLabels}个）\n`;
        } else {
            systemPrompt += '4. 这是一个单标签分类任务，每条数据只能属于一个类别\n';
        }

        return systemPrompt;
    },

    buildUserPrompt(input, schema = null) {
        const currentSchema = schema || this.state.schema;
        
        let userPrompt = '';

        userPrompt += this.buildSchemaDescription(currentSchema);
        userPrompt += '\n\n';
        userPrompt += this.buildClassificationRules(currentSchema);
        userPrompt += '\n\n';
        userPrompt += this.buildExamplesSection(currentSchema);
        userPrompt += '\n\n';
        userPrompt += this.buildOutputFormat(currentSchema);
        userPrompt += '\n\n';
        userPrompt += '## 待分类文本\n\n';
        userPrompt += this.formatInput(input);
        userPrompt += '\n\n请输出分类结果：';

        return userPrompt;
    },

    buildSchemaDescription(schema) {
        let description = '## 分类体系\n\n';
        
        if (schema.name) {
            description += `**${schema.name}**\n\n`;
        }

        const categories = schema.categories || [];
        
        if (categories.length === 0) {
            description += '（暂无分类配置）\n';
            return description;
        }

        description += this.buildCategoryTree(categories, 0);
        
        return description;
    },

    buildCategoryTree(categories, depth) {
        let result = '';
        const indent = '  '.repeat(depth);
        const prefix = depth === 0 ? '-' : '-';
        
        categories.forEach(category => {
            if (category.name) {
                result += `${indent}${prefix} **${category.name}**`;
                if (category.description) {
                    result += `：${category.description}`;
                }
                result += '\n';
                
                if (category.children && category.children.length > 0) {
                    result += this.buildCategoryTree(category.children, depth + 1);
                }
            }
        });
        
        return result;
    },

    buildClassificationRules(schema) {
        let rules = '## 分类原则\n\n';

        const categories = schema.categories || [];
        
        const extractDescriptions = (cats, path = []) => {
            let result = [];
            cats.forEach(cat => {
                if (cat.name && cat.description) {
                    result.push({
                        path: [...path, cat.name].join(' > '),
                        description: cat.description
                    });
                }
                if (cat.children && cat.children.length > 0) {
                    result = result.concat(extractDescriptions(cat.children, [...path, cat.name]));
                }
            });
            return result;
        };

        const descriptions = extractDescriptions(categories);
        
        if (descriptions.length > 0) {
            descriptions.forEach(item => {
                rules += `**${item.path}**：${item.description}\n\n`;
            });
        } else {
            rules += '请根据文本内容选择最合适的分类标签。\n\n';
        }

        rules += '### 评分标准\n';
        rules += '- **高确信度（0.8-1.0）**：文本内容明确符合该分类标签的特征\n';
        rules += '- **中等确信度（0.6-0.8）**：文本内容基本符合，但存在一定模糊性\n';
        rules += '- **低确信度（0.0-0.6）**：文本内容与标签匹配度较低，需要人工复核\n';

        return rules;
    },

    buildExamplesSection(schema) {
        const examples = classificationState.getExamples(schema.id);
        
        if (!examples || examples.length === 0) {
            return '## 示例\n\n（暂无示例）';
        }

        let section = '## 示例\n\n';
        
        const positiveExamples = examples.filter(e => e.type === 'positive');
        const negativeExamples = examples.filter(e => e.type === 'negative');

        if (positiveExamples.length > 0) {
            section += '### 正确示例\n\n';
            positiveExamples.slice(0, 3).forEach((example, index) => {
                section += `**示例${index + 1}**\n`;
                section += `输入：${this.truncateText(example.input, 200)}\n`;
                section += `分类：${example.correctLabel}\n`;
                if (example.note) {
                    section += `说明：${example.note}\n`;
                }
                section += '\n';
            });
        }

        if (negativeExamples.length > 0) {
            section += '### 错误示例（避免此类分类）\n\n';
            negativeExamples.slice(0, 2).forEach((example, index) => {
                section += `**错误示例${index + 1}**\n`;
                section += `输入：${this.truncateText(example.input, 200)}\n`;
                section += `错误分类：${example.wrongLabel}\n`;
                section += `正确分类：${example.correctLabel}\n`;
                if (example.note) {
                    section += `说明：${example.note}\n`;
                }
                section += '\n';
            });
        }

        return section;
    },

    buildOutputFormat(schema) {
        let format = '## 输出格式\n\n';
        format += '请严格按照以下JSON格式输出分类结果，不要添加任何额外内容：\n\n';
        format += '```json\n';
        format += '{\n';
        format += '  "classification": [\n';
        
        const categories = schema.categories || [];
        
        if (categories.length > 0) {
            format += '    // 分类路径，从根到叶\n';
            format += '    "分类路径1 > 子分类1 > 叶分类",\n';
            format += '    "分类路径2 > 子分类2"\n';
        }
        
        format += '  ],\n';
        format += '  "confidence": 0.95,\n';
        format += '  "reasoning": "简要说明分类依据"\n';
        format += '}\n';
        format += '```\n';
        
        format += '\n**重要说明**：\n';
        format += '- classification为数组，包含从根到叶的完整分类路径\n';
        format += '- 如果有多个匹配的分类，可以输出多个路径\n';
        format += '- confidence表示整体分类确信度，范围0.0-1.0\n';
        format += '- reasoning简要说明分类的依据和理由\n';

        return format;
    },

    formatInput(input) {
        if (typeof input === 'string') {
            return input;
        }

        if (typeof input === 'object' && input.content) {
            if (typeof input.content === 'string') {
                return input.content;
            }

            const parts = [];
            Object.entries(input.content).forEach(([key, value]) => {
                parts.push(`【${key}】\n${value}`);
            });
            return parts.join('\n\n');
        }

        return JSON.stringify(input, null, 2);
    },

    truncateText(text, maxLength = 200) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    buildRequestBody(input, schema = null) {
        const currentSchema = schema || this.state.schema;
        
        const messages = [];
        messages.push({ 
            role: 'system', 
            content: this.buildSystemPrompt(currentSchema) 
        });
        messages.push({ 
            role: 'user', 
            content: this.buildUserPrompt(input, currentSchema) 
        });

        return {
            model: currentSchema.model || 'GLM-4.7-Flash',
            temperature: currentSchema.temperature || 0.1,
            messages: messages
        };
    },

    buildBatchRequestItem(input, customId, schema = null) {
        const body = this.buildRequestBody(input, schema);
        
        return {
            custom_id: customId,
            method: 'POST',
            url: '/v4/chat/completions',
            body: body
        };
    },

    parseClassificationResult(responseContent) {
        try {
            let result;
            
            if (typeof responseContent === 'string') {
                const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    result = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('无法从响应中提取JSON');
                }
            } else {
                result = responseContent;
            }

            const classification = result.classification || {};
            const confidence = result.confidence || {};
            const reasoning = result.reasoning || '';

            const processedResult = {
                classification: {},
                confidence: {},
                reasoning: reasoning,
                valid: true
            };

            Object.entries(classification).forEach(([layerName, value]) => {
                processedResult.classification[layerName] = value;
            });

            Object.entries(confidence).forEach(([layerName, value]) => {
                if (Array.isArray(value)) {
                    processedResult.confidence[layerName] = Math.min(...value);
                } else {
                    processedResult.confidence[layerName] = value;
                }
            });

            const avgConfidence = Object.values(processedResult.confidence).reduce((a, b) => a + b, 0) / 
                Object.values(processedResult.confidence).length || 0;
            processedResult.overallConfidence = avgConfidence;

            return processedResult;
        } catch (error) {
            console.error('解析分类结果失败:', error);
            return {
                classification: {},
                confidence: {},
                reasoning: '',
                valid: false,
                error: error.message,
                rawContent: responseContent
            };
        }
    },

    generatePreviewPrompt() {
        const schema = this.state.schema;
        
        if (!schema.layers || schema.layers.length === 0) {
            return '请先配置分类层级';
        }

        return this.buildUserPrompt({ content: '【示例输入文本】' }, schema);
    },

    generateFullPrompt() {
        const schema = this.state.schema;
        
        if (!schema.layers || schema.layers.length === 0) {
            return '';
        }

        const systemPrompt = this.buildSystemPrompt(schema);
        const userPromptTemplate = this.buildUserPrompt({ content: '{{INPUT}}' }, schema);
        
        return systemPrompt + '\n\n' + userPromptTemplate;
    },

    async optimizePromptWithAI() {
        const schema = this.state.schema;
        
        if (!schema.layers || schema.layers.length === 0) {
            return { success: false, message: '请先配置分类层级' };
        }

        const currentPrompt = this.buildSystemPrompt(schema) + '\n\n' + this.buildUserPrompt({ content: '{{INPUT}}' }, schema);

        const model = window.ProviderManager?.getDefaultModel?.() || 'GLM-4-Flash';
        const headers = window.ProviderManager?.getApiHeaders?.(model) || {};

        const optimizeRequest = {
            model: model,
            temperature: 0.3,
            messages: [
                {
                    role: 'system',
                    content: '你是一个提示词优化专家。你的任务是优化分类标引的提示词，使其更加清晰、准确、易于模型理解。保持原有结构，优化表述。'
                },
                {
                    role: 'user',
                    content: `请优化以下分类标引提示词，使其更加清晰有效。保持JSON输出格式要求不变，只优化分类原则和描述部分：\n\n${currentPrompt}`
                }
            ]
        };

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...headers
                },
                credentials: 'include',
                body: JSON.stringify(optimizeRequest)
            });

            if (!response.ok) {
                throw new Error('请求失败');
            }

            const result = await response.json();
            const optimizedPrompt = result.content || result.response || result.message?.content;

            return {
                success: true,
                originalPrompt: currentPrompt,
                optimizedPrompt: optimizedPrompt
            };
        } catch (error) {
            console.error('优化提示词失败:', error);
            return {
                success: false,
                message: `优化失败: ${error.message}`
            };
        }
    }
};

export default PromptBuilder;
export { PromptBuilder };
