/**
 * 智能分类标引模块 - 智能冷启动
 */

import classificationState from './state.js';
import { ClassificationConfig, DEFAULT_SCHEMA, DEFAULT_LAYER } from './config.js';

const ColdStart = {
    state: classificationState.state,

    async analyzeAndSuggest(inputs, options = {}) {
        const sampleSize = options.sampleSize || ClassificationConfig.COLD_START.SAMPLE_SIZE;
        const sample = this.selectSample(inputs, sampleSize);
        
        classificationState.setColdStartRunning(true);
        classificationState.setColdStartSample(sample);

        try {
            const analysisResult = await this.callAnalysisAPI(sample, options);
            
            if (analysisResult.success) {
                const suggestedSchema = this.buildSchemaFromAnalysis(analysisResult.analysis);
                classificationState.setColdStartSuggestion(suggestedSchema);
                
                return {
                    success: true,
                    sample: sample,
                    analysis: analysisResult.analysis,
                    suggestedSchema: suggestedSchema
                };
            } else {
                return {
                    success: false,
                    message: analysisResult.message || '分析失败'
                };
            }
        } catch (error) {
            console.error('智能冷启动失败:', error);
            return {
                success: false,
                message: `分析过程出错: ${error.message}`
            };
        } finally {
            classificationState.setColdStartRunning(false);
        }
    },

    selectSample(inputs, sampleSize) {
        const size = Math.min(sampleSize, inputs.length);
        
        if (inputs.length <= size) {
            return inputs.map(input => this.extractInputText(input));
        }

        const shuffled = [...inputs].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, size).map(input => this.extractInputText(input));
    },

    extractInputText(input) {
        if (typeof input === 'string') {
            return input;
        }
        
        if (input.content) {
            if (typeof input.content === 'string') {
                return input.content;
            }
            
            return Object.entries(input.content)
                .map(([key, value]) => `【${key}】${value}`)
                .join('\n');
        }
        
        return JSON.stringify(input);
    },

    async callAnalysisAPI(sample, options = {}) {
        const prompt = this.buildAnalysisPrompt(sample, options);

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: options.model || 'GLM-4.7-Flash',
                    temperature: 0.5,
                    messages: [
                        {
                            role: 'system',
                            content: this.getSystemPrompt()
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }

            const result = await response.json();
            const content = result.content || result.response || result.message?.content;

            const analysis = this.parseAnalysisResult(content);

            return {
                success: true,
                analysis: analysis,
                rawContent: content
            };
        } catch (error) {
            console.error('调用分析API失败:', error);
            return {
                success: false,
                message: error.message
            };
        }
    },

    getSystemPrompt() {
        return `你是一个专业的数据分类分析师。你的任务是分析给定的文本数据，识别其特征和模式，并提出合理的分类体系建议。

你需要：
1. 分析数据的主题、领域、结构特征
2. 识别可能的分类维度
3. 为每个分类维度提出具体的分类标签
4. 给出分类原则和判断标准

输出格式必须是有效的JSON。`;
    },

    buildAnalysisPrompt(sample, options) {
        let prompt = `请分析以下${sample.length}条数据样本，提出一个合理的分类体系建议。

## 数据样本

`;
        sample.forEach((text, index) => {
            prompt += `### 样本${index + 1}\n`;
            prompt += `${this.truncateText(text, 500)}\n\n`;
        });

        prompt += `
## 输出要求

请严格按照以下JSON格式输出分析结果：

\`\`\`json
{
  "dataCharacteristics": {
    "domain": "数据所属领域",
    "mainTopics": ["主题1", "主题2"],
    "structureFeatures": "数据结构特征描述"
  },
  "suggestedSchema": {
    "name": "分类体系名称",
    "layers": [
      {
        "name": "层级名称",
        "description": "分类原则描述",
        "labels": ["标签1", "标签2", "标签3"]
      }
    ],
    "multiLabel": false,
    "reasoning": "分类体系设计理由"
  },
  "recommendations": ["其他建议"]
}
\`\`\`

请确保：
1. 分类标签具体且互斥
2. 分类原则清晰可操作
3. 标签数量适中（每个层级3-10个标签为宜）
4. 考虑实际应用场景`;
        
        if (options.hint) {
            prompt += `\n\n## 用户提示\n${options.hint}`;
        }

        return prompt;
    },

    parseAnalysisResult(content) {
        try {
            const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                             content.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
                const jsonStr = jsonMatch[1] || jsonMatch[0];
                return JSON.parse(jsonStr);
            }
            
            return {
                dataCharacteristics: {
                    domain: '未知领域',
                    mainTopics: [],
                    structureFeatures: '无法解析'
                },
                suggestedSchema: {
                    name: '自动生成分类',
                    layers: [],
                    multiLabel: false,
                    reasoning: '无法解析AI响应'
                },
                recommendations: [],
                rawContent: content
            };
        } catch (error) {
            console.error('解析分析结果失败:', error);
            return {
                dataCharacteristics: {
                    domain: '未知领域',
                    mainTopics: [],
                    structureFeatures: '解析失败'
                },
                suggestedSchema: null,
                recommendations: [],
                parseError: error.message,
                rawContent: content
            };
        }
    },

    buildSchemaFromAnalysis(analysis) {
        if (!analysis || !analysis.suggestedSchema) {
            return null;
        }

        const suggested = analysis.suggestedSchema;
        const schema = {
            ...DEFAULT_SCHEMA,
            id: `schema_coldstart_${Date.now()}`,
            name: suggested.name || '智能生成分类体系',
            multiLabel: suggested.multiLabel || false,
            maxLabels: suggested.multiLabel ? 3 : 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (suggested.layers && Array.isArray(suggested.layers)) {
            schema.layers = suggested.layers.map((layer, index) => ({
                ...DEFAULT_LAYER,
                level: index + 1,
                name: layer.name || `层级${index + 1}`,
                description: layer.description || '',
                labels: layer.labels || []
            }));
        }

        return schema;
    },

    applySuggestedSchema() {
        const suggested = this.state.coldStart.suggestedSchema;
        
        if (!suggested) {
            return { success: false, message: '没有可应用的分类体系建议' };
        }

        classificationState.setSchema(suggested);
        
        return { 
            success: true, 
            schema: suggested,
            message: '分类体系已应用，您可以在配置页面进行微调'
        };
    },

    truncateText(text, maxLength = 500) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    isRunning() {
        return this.state.coldStart.isRunning;
    },

    getSample() {
        return this.state.coldStart.sampleData;
    },

    getSuggestion() {
        return this.state.coldStart.suggestedSchema;
    },

    clearSuggestion() {
        classificationState.setColdStartSuggestion(null);
        classificationState.setColdStartSample([]);
    },

    async refineSchema(feedback) {
        const currentSuggestion = this.state.coldStart.suggestedSchema;
        
        if (!currentSuggestion) {
            return { success: false, message: '没有当前建议可优化' };
        }

        const refinePrompt = `请根据用户反馈优化以下分类体系：

## 当前分类体系

${JSON.stringify(currentSuggestion, null, 2)}

## 用户反馈

${feedback}

## 输出要求

请输出优化后的完整分类体系JSON，格式与之前相同。只输出JSON，不要其他内容。`;

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'GLM-4.7-Flash',
                    temperature: 0.3,
                    messages: [
                        {
                            role: 'system',
                            content: '你是一个分类体系优化专家。根据用户反馈优化分类体系。'
                        },
                        {
                            role: 'user',
                            content: refinePrompt
                        }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error('优化请求失败');
            }

            const result = await response.json();
            const content = result.content || result.response || result.message?.content;

            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const refined = JSON.parse(jsonMatch[0]);
                const schema = this.buildSchemaFromAnalysis({ suggestedSchema: refined });
                classificationState.setColdStartSuggestion(schema);
                
                return { success: true, schema };
            }

            return { success: false, message: '无法解析优化结果' };
        } catch (error) {
            console.error('优化分类体系失败:', error);
            return { success: false, message: error.message };
        }
    }
};

export default ColdStart;
export { ColdStart };
