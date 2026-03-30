/**
 * 统一批量处理系统 - 模型配置验证模块
 * 验证模型配置、记录错误日志、提供友好错误提示
 */

const ModelValidator = {
    errorLog: [],
    maxLogSize: 100,
    
    VALID_PROVIDERS: ['zhipu', 'aliyun'],
    
    PROVIDER_MODELS: {
        zhipu: [
            'glm-4-flash', 'glm-4-flashx-250414', 'glm-4-flash-250414',
            'glm-4-long', 'glm-4-plus', 'glm-4-air-250414', 'glm-4-airx',
            'glm-4.5-air', 'glm-4.5-airx', 'glm-4.7-flash', 'glm-4.7-flashx',
            'glm-4.7', 'glm-z1-flash', 'glm-z1-flashx', 'glm-z1-air', 
            'glm-z1-airx', 'glm-5'
        ],
        aliyun: [
            'qwen-flash', 'qwen-turbo', 'qwen-plus', 'qwen3-max', 'qwen-long',
            'qwq-plus', 'qwq-32b', 'deepseek-v3', 'deepseek-v3.2',
            'deepseek-r1', 'deepseek-r1-distill-qwen-32b',
            'kimi-k2.5', 'kimi-k2-thinking', 'minimax-text-01'
        ]
    },
    
    THINKING_ONLY_MODELS: [
        'qwq-plus', 'qwq-32b', 'deepseek-r1', 
        'deepseek-r1-distill-qwen-32b', 'kimi-k2-thinking'
    ],
    
    THINKING_CAPABLE_MODELS: [
        'qwen-flash', 'qwen-turbo', 'qwen-plus', 'qwen3-max', 'qwen-long',
        'qwq-plus', 'qwq-32b', 'deepseek-r1', 'deepseek-r1-distill-qwen-32b',
        'deepseek-v3', 'deepseek-v3.2', 'kimi-k2-thinking', 'kimi-k2.5',
        'glm-z1-flash', 'glm-z1-flashx', 'glm-z1-air', 'glm-z1-airx'
    ],
    
    isThinkingModel(model) {
        if (!model) return false;
        const normalizedModel = model.toLowerCase().trim();
        return this.THINKING_CAPABLE_MODELS.includes(normalizedModel);
    },
    
    isThinkingOnlyModel(model) {
        if (!model) return false;
        const normalizedModel = model.toLowerCase().trim();
        return this.THINKING_ONLY_MODELS.includes(normalizedModel);
    },
    
    getModelResponseInfo(model) {
        const isThinking = this.isThinkingModel(model);
        const isThinkingOnly = this.isThinkingOnlyModel(model);
        
        return {
            model: model,
            isThinkingModel: isThinking,
            isThinkingOnlyModel: isThinkingOnly,
            needsReasoningContentHandling: isThinking || isThinkingOnly,
            description: isThinkingOnly 
                ? '仅推理模型，响应包含 reasoning_content 和 content'
                : isThinking 
                    ? '支持深度思考的模型，可能返回 reasoning_content'
                    : '普通模型，仅返回 content'
        };
    },
    
    FREE_MODELS: ['glm-4-flash', 'glm-4-flash-250414', 'glm-z1-flash'],

    validateModel(model) {
        if (!model || typeof model !== 'string') {
            return {
                valid: false,
                error: 'MODEL_EMPTY',
                message: '模型名称不能为空',
                suggestion: '请选择一个有效的模型'
            };
        }
        
        const normalizedModel = model.toLowerCase().trim();
        
        const allModels = [
            ...this.PROVIDER_MODELS.zhipu, 
            ...this.PROVIDER_MODELS.aliyun
        ];
        
        if (!allModels.includes(normalizedModel)) {
            const similarModels = this.findSimilarModels(normalizedModel, allModels);
            return {
                valid: false,
                error: 'MODEL_NOT_FOUND',
                message: `模型 "${model}" 不存在于支持的模型列表中`,
                suggestion: similarModels.length > 0 
                    ? `您是否是指: ${similarModels.join(', ')}?` 
                    : '请选择支持的模型'
            };
        }
        
        return {
            valid: true,
            model: normalizedModel,
            provider: this.getProviderForModel(normalizedModel),
            isFree: this.FREE_MODELS.includes(normalizedModel),
            isThinkingOnly: this.THINKING_ONLY_MODELS.includes(normalizedModel)
        };
    },

    validateProvider(provider) {
        if (!provider || typeof provider !== 'string') {
            return {
                valid: false,
                error: 'PROVIDER_EMPTY',
                message: '服务商名称不能为空',
                suggestion: '请选择智谱AI或阿里云百炼'
            };
        }
        
        const normalizedProvider = provider.toLowerCase().trim();
        
        if (!this.VALID_PROVIDERS.includes(normalizedProvider)) {
            return {
                valid: false,
                error: 'PROVIDER_INVALID',
                message: `服务商 "${provider}" 不支持`,
                suggestion: `支持的服务商: ${this.VALID_PROVIDERS.join(', ')}`
            };
        }
        
        return {
            valid: true,
            provider: normalizedProvider
        };
    },

    validateModelProviderMatch(model, provider) {
        const modelValidation = this.validateModel(model);
        if (!modelValidation.valid) {
            return modelValidation;
        }
        
        const providerValidation = this.validateProvider(provider);
        if (!providerValidation.valid) {
            return providerValidation;
        }
        
        const expectedProvider = this.getProviderForModel(modelValidation.model);
        
        if (expectedProvider !== providerValidation.provider) {
            return {
                valid: false,
                error: 'MODEL_PROVIDER_MISMATCH',
                message: `模型 "${model}" 属于 ${expectedProvider} 服务商，但配置的是 ${provider}`,
                suggestion: `请将服务商改为 ${expectedProvider} 或选择 ${provider} 支持的模型`
            };
        }
        
        return {
            valid: true,
            model: modelValidation.model,
            provider: providerValidation.provider
        };
    },

    validateApiKey(apiKey, provider) {
        if (!apiKey || typeof apiKey !== 'string') {
            return {
                valid: false,
                error: 'API_KEY_EMPTY',
                message: 'API Key 未配置',
                suggestion: '请在设置中配置相应的 API Key'
            };
        }
        
        const trimmedKey = apiKey.trim();
        
        if (trimmedKey.length < 10) {
            return {
                valid: false,
                error: 'API_KEY_TOO_SHORT',
                message: 'API Key 格式不正确（长度不足）',
                suggestion: '请检查 API Key 是否完整'
            };
        }
        
        if (provider === 'zhipu' && !trimmedKey.includes('.')) {
            return {
                valid: false,
                error: 'API_KEY_FORMAT_INVALID',
                message: '智谱AI API Key 格式不正确',
                suggestion: '智谱AI API Key 应包含点号(.)，格式如: xxx.xxxxxxxx'
            };
        }
        
        return {
            valid: true,
            keyPrefix: trimmedKey.substring(0, 8) + '...'
        };
    },

    validateBatchRequest(model, provider, template) {
        const errors = [];
        const warnings = [];
        
        const modelValidation = this.validateModel(model);
        if (!modelValidation.valid) {
            errors.push({
                field: 'model',
                ...modelValidation
            });
        }
        
        const providerValidation = this.validateProvider(provider);
        if (!providerValidation.valid) {
            errors.push({
                field: 'provider',
                ...providerValidation
            });
        }
        
        if (modelValidation.valid && providerValidation.valid) {
            const matchValidation = this.validateModelProviderMatch(model, provider);
            if (!matchValidation.valid) {
                errors.push({
                    field: 'model_provider_match',
                    ...matchValidation
                });
            }
        }
        
        if (!template || !template.systemPrompt) {
            errors.push({
                field: 'template',
                error: 'TEMPLATE_INCOMPLETE',
                message: '模板配置不完整',
                suggestion: '请配置系统提示词'
            });
        }
        
        if (modelValidation.valid && modelValidation.isThinkingOnly) {
            warnings.push({
                field: 'model',
                warning: 'THINKING_MODEL_SELECTED',
                message: `模型 "${model}" 是推理模型，仅支持思考模式`,
                suggestion: '如需普通对话，请选择其他模型'
            });
        }
        
        return {
            valid: errors.length === 0,
            errors: errors,
            warnings: warnings,
            model: modelValidation.valid ? modelValidation : null
        };
    },

    getProviderForModel(model) {
        if (!model) return null;
        
        const normalizedModel = model.toLowerCase().trim();
        
        for (const [provider, models] of Object.entries(this.PROVIDER_MODELS)) {
            if (models.includes(normalizedModel)) {
                return provider;
            }
        }
        
        if (normalizedModel.startsWith('glm-') || normalizedModel.startsWith('glz-')) {
            return 'zhipu';
        }
        if (normalizedModel.startsWith('qwen') || normalizedModel.startsWith('qwq') ||
            normalizedModel.startsWith('deepseek') || normalizedModel.startsWith('kimi') ||
            normalizedModel.startsWith('minimax')) {
            return 'aliyun';
        }
        
        return 'zhipu';
    },

    findSimilarModels(model, modelList) {
        const similar = [];
        const modelLower = model.toLowerCase();
        
        for (const m of modelList) {
            if (m.includes(modelLower) || modelLower.includes(m)) {
                similar.push(m);
            }
        }
        
        return similar.slice(0, 3);
    },

    logError(error, context = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            error: error,
            context: context,
            stack: new Error().stack
        };
        
        this.errorLog.push(logEntry);
        
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog.shift();
        }
        
        console.error('[ModelValidator] 错误:', error, context);
        
        return logEntry;
    },

    getErrorLog() {
        return [...this.errorLog];
    },

    clearErrorLog() {
        this.errorLog = [];
    },

    getLastError() {
        return this.errorLog.length > 0 ? this.errorLog[this.errorLog.length - 1] : null;
    },

    formatErrorMessage(validationResult) {
        if (validationResult.valid) {
            return null;
        }
        
        const parts = [validationResult.message];
        
        if (validationResult.suggestion) {
            parts.push(`建议: ${validationResult.suggestion}`);
        }
        
        if (validationResult.error) {
            parts.push(`[错误码: ${validationResult.error}]`);
        }
        
        return parts.join('\n');
    },

    getAvailableModels(provider = null) {
        if (provider) {
            return this.PROVIDER_MODELS[provider] || [];
        }
        
        return Object.values(this.PROVIDER_MODELS).flat();
    },

    getModelInfo(model) {
        const validation = this.validateModel(model);
        if (!validation.valid) {
            return null;
        }
        
        return {
            id: validation.model,
            provider: validation.provider,
            isFree: validation.isFree,
            isThinkingOnly: validation.isThinkingOnly
        };
    }
};

export default ModelValidator;
export { ModelValidator };
