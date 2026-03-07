/**
 * 智能分类标引模块 - 智能导入体系
 * 
 * 用户通过自然语言描述分类体系，AI智能解析并生成符合格式要求的分类体系
 */

import classificationState from './state.js';

const SmartImport = {
    state: classificationState.state,

    async importFromText(description, options = {}) {
        if (!description || typeof description !== 'string') {
            return {
                success: false,
                message: '请输入分类体系描述'
            };
        }

        classificationState.setSmartImportRunning?.(true);

        try {
            const result = await this.callSmartImportAPI(description, options);

            if (result.success) {
                const schema = this.buildSchemaFromResult(result.parsedSchema);
                classificationState.setSmartImportSuggestion?.(schema);

                return {
                    success: true,
                    schema: schema,
                    rawDescription: description,
                    message: '分类体系解析成功'
                };
            } else {
                return {
                    success: false,
                    message: result.message || '解析失败'
                };
            }
        } catch (error) {
            console.error('智能导入失败:', error);
            return {
                success: false,
                message: `解析过程出错: ${error.message}`
            };
        } finally {
            classificationState.setSmartImportRunning?.(false);
        }
    },

    async callSmartImportAPI(description, options = {}) {
        const prompt = this.buildImportPrompt(description, options);

        const model = options.model || window.ProviderManager?.getDefaultModel?.() || 'GLM-4-Flash';
        const headers = window.ProviderManager?.getApiHeaders?.(model) || {};

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
                credentials: 'include',
                body: JSON.stringify({
                    model: model,
                    temperature: 0.3,
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

            let content;
            if (result.choices && result.choices[0]?.message?.content) {
                content = result.choices[0].message.content;
            } else if (result.content) {
                content = result.content;
            } else if (result.response) {
                content = result.response;
            } else if (result.message?.content) {
                content = result.message.content;
            } else {
                console.error('[SmartImport] Unexpected API response structure:', result);
                content = null;
            }

            const parsedSchema = this.parseImportResult(content);

            return {
                success: true,
                parsedSchema: parsedSchema,
                rawContent: content
            };
        } catch (error) {
            console.error('调用智能导入API失败:', error);
            return {
                success: false,
                message: error.message
            };
        }
    },

    getSystemPrompt() {
        return `你是一个专业的分类体系设计专家。你的任务是将用户用自然语言描述的分类体系转换为标准的树状结构JSON格式。

你需要：
1. 理解用户描述的分类层级结构
2. 识别每个分类的名称和描述
3. 正确处理多层级嵌套关系
4. 保持分类的完整性和一致性

输出格式必须是有效的JSON，严格按照指定格式输出。`;
    },

    buildImportPrompt(description, options) {
        let prompt = `请将以下自然语言描述的分类体系转换为标准的树状JSON结构。

## 用户描述

${description}

## 输出要求

请严格按照以下JSON格式输出分类体系：

\`\`\`json
{
  "name": "分类体系名称（根据描述推断）",
  "description": "分类体系整体描述（可选）",
  "categories": [
    {
      "name": "一级分类名称",
      "description": "该分类的描述或判断标准",
      "children": [
        {
          "name": "二级分类名称",
          "description": "该分类的描述或判断标准",
          "children": [
            {
              "name": "三级分类名称",
              "description": "该分类的描述",
              "children": []
            }
          ]
        }
      ]
    }
  ],
  "reasoning": "分类体系设计说明（可选）"
}
\`\`\`

## 解析规则

1. **层级识别**：
   - "一级"、"二级"、"三级"等词汇表示层级
   - 缩进、编号（1. 1.1 1.1.1）也表示层级
   - "包含"、"下设"、"分为"等词汇表示父子关系

2. **分类名称**：
   - 提取每个分类的名称
   - 如果用户提供了描述或判断标准，放入description字段

3. **结构处理**：
   - 支持任意层级深度
   - 每个分类项必须包含name和children字段
   - description字段可选，用于存放分类说明
   - 最底层的children为空数组[]

4. **特殊情况**：
   - 如果描述不清晰，根据上下文合理推断
   - 如果没有提供体系名称，根据内容生成合适的名称
   - 保持分类的互斥性和完整性

请确保输出的JSON格式正确，可以直接解析使用。`;

        if (options.hint) {
            prompt += `\n\n## 补充说明\n${options.hint}`;
        }

        return prompt;
    },

    parseImportResult(content) {
        try {
            if (!content) {
                console.error('[SmartImport] content is undefined or null');
                return {
                    name: '解析失败',
                    categories: [],
                    parseError: 'API响应内容为空'
                };
            }

            const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                content.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                const jsonStr = jsonMatch[1] || jsonMatch[0];
                return JSON.parse(jsonStr);
            }

            return {
                name: '解析失败',
                categories: [],
                parseError: '无法解析JSON',
                rawContent: content
            };
        } catch (error) {
            console.error('解析导入结果失败:', error);
            return {
                name: '解析失败',
                categories: [],
                parseError: error.message,
                rawContent: content || ''
            };
        }
    },

    buildSchemaFromResult(parsedSchema) {
        if (!parsedSchema) {
            return null;
        }

        const schema = {
            id: `schema_smart_import_${Date.now()}`,
            name: parsedSchema.name || '智能导入分类体系',
            categories: [],
            model: 'GLM-4.7-Flash',
            temperature: 0.1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (parsedSchema.categories && Array.isArray(parsedSchema.categories)) {
            schema.categories = parsedSchema.categories.map(cat => this.normalizeCategory(cat));
        }

        return schema;
    },

    normalizeCategory(category) {
        return {
            id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: category.name || '',
            description: category.description || '',
            children: (category.children || []).map(child => this.normalizeCategory(child)),
            expanded: true
        };
    },

    applyImportedSchema() {
        const imported = this.state.smartImport?.suggestedSchema;

        if (!imported) {
            return { success: false, message: '没有可应用的分类体系' };
        }

        const schema = {
            id: imported.id || `schema_${Date.now()}`,
            name: imported.name || '智能导入分类体系',
            categories: imported.categories || [],
            model: imported.model || 'GLM-4.7-Flash',
            temperature: imported.temperature || 0.1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        classificationState.state.schema = schema;
        classificationState.saveState();

        return {
            success: true,
            schema: schema,
            message: '分类体系已应用，您可以在配置页面进行微调'
        };
    },

    async refineImportedSchema(feedback) {
        const currentSchema = this.state.smartImport?.suggestedSchema;

        if (!currentSchema) {
            return { success: false, message: '没有当前导入的体系可优化' };
        }

        const refinePrompt = `请根据用户反馈优化以下分类体系：

## 当前分类体系

${JSON.stringify(currentSchema, null, 2)}

## 用户反馈

${feedback}

## 输出要求

请输出优化后的完整分类体系JSON，格式如下：

\`\`\`json
{
  "name": "分类体系名称",
  "categories": [
    {
      "name": "分类名称",
      "description": "分类描述",
      "children": [...]
    }
  ],
  "reasoning": "优化理由"
}
\`\`\`

只输出JSON，不要其他内容。`;

        try {
            const model = window.ProviderManager?.getDefaultModel?.() || 'GLM-4-Flash';
            const headers = window.ProviderManager?.getApiHeaders?.(model) || {};

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
                credentials: 'include',
                body: JSON.stringify({
                    model: model,
                    temperature: 0.3,
                    messages: [
                        {
                            role: 'system',
                            content: '你是一个分类体系优化专家。根据用户反馈优化分类体系，保持树状层级结构。'
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
            let content;
            if (result.choices && result.choices[0]?.message?.content) {
                content = result.choices[0].message.content;
            } else if (result.content) {
                content = result.content;
            } else if (result.response) {
                content = result.response;
            } else if (result.message?.content) {
                content = result.message.content;
            }

            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const refined = JSON.parse(jsonMatch[0]);
                const schema = this.buildSchemaFromResult(refined);
                classificationState.setSmartImportSuggestion?.(schema);

                return { success: true, schema };
            }

            return { success: false, message: '无法解析优化结果' };
        } catch (error) {
            console.error('优化分类体系失败:', error);
            return { success: false, message: error.message };
        }
    },

    isRunning() {
        return this.state.smartImport?.isRunning;
    },

    getSuggestion() {
        return this.state.smartImport?.suggestedSchema;
    },

    clearSuggestion() {
        classificationState.setSmartImportSuggestion?.(null);
    },

    getExampleTemplates() {
        return [
            {
                name: '专利技术领域分类',
                description: `这是一个专利技术领域的分类体系：

一级分类：
1. 机械工程 - 涉及机械设备、结构设计相关的专利
2. 电气工程 - 涉及电路、电子设备、电力系统相关的专利
3. 化学工程 - 涉及化工工艺、材料合成相关的专利
4. 生物医药 - 涉及药物、生物技术相关的专利

二级分类（以机械工程为例）：
- 机械制造 - 包括加工工艺、制造设备
- 交通运输 - 包括车辆、船舶、航空器
- 建筑工程 - 包括建筑结构、施工方法

三级分类（以机械制造为例）：
- 切削加工 - 车削、铣削、钻削等工艺
- 成形加工 - 锻造、冲压、铸造等工艺
- 特种加工 - 激光加工、电火花加工等`
            },
            {
                name: '客户反馈分类',
                description: `客户反馈分类体系：

一级分类：
- 产品问题 - 关于产品本身的反馈
- 服务体验 - 关于服务质量的反馈
- 建议改进 - 客户提出的改进建议

二级分类（产品问题）：
- 功能缺陷 - 产品功能无法正常使用
- 性能问题 - 产品性能不达标
- 质量问题 - 产品质量有瑕疵

二级分类（服务体验）：
- 客服态度 - 客服人员服务态度
- 响应速度 - 问题处理响应时间
- 解决效果 - 问题最终解决情况`
            },
            {
                name: '新闻文章分类',
                description: `新闻文章分类：

一级：时政、财经、科技、娱乐、体育

二级（科技类）：
- 互联网 - 互联网公司动态、行业趋势
- 人工智能 - AI技术发展、应用案例
- 消费电子 - 手机、电脑等电子产品
- 科学研究 - 科研成果、学术动态`
            }
        ];
    }
};

export default SmartImport;
export { SmartImport };
