/**
 * 统一批量处理系统 - 异步引擎
 * 实时API调用，逐条处理结果
 * 支持智谱AI和阿里云百炼双服务商
 */

import unifiedBatchState from '../state.js';
import TemplateManager from '../template-manager.js';
import OutputHandler from '../output-handler.js';

const AsyncEngine = {
    state: unifiedBatchState.state,

    getProviderForModel(model) {
        if (window.getProviderForModel) {
            return window.getProviderForModel(model);
        }
        if (window.ProviderManager && ProviderManager.getProviderForModel) {
            return ProviderManager.getProviderForModel(model);
        }
        if (model.startsWith('glm-') || model.startsWith('GLM-')) {
            return 'zhipu';
        }
        if (model.startsWith('qwen') || model.startsWith('Qwen') || 
            model.startsWith('qwq') || model.startsWith('QwQ') ||
            model.startsWith('deepseek') || model.startsWith('DeepSeek') ||
            model.startsWith('kimi') || model.startsWith('Kimi') ||
            model.startsWith('minimax') || model.startsWith('MiniMax')) {
            return 'aliyun';
        }
        return 'zhipu';
    },

    getApiHeaders(model) {
        const provider = this.getProviderForModel(model);
        const headers = { 'Content-Type': 'application/json' };
        const getUserItem = (key) => {
            if (window.userCacheStorage && window.userCacheStorage.isInitialized()) {
                return window.userCacheStorage.get(key);
            }
            return localStorage.getItem(key);
        };
        
        if (provider === 'aliyun') {
            const aliyunKey = window.appState?.aliyunApiKey || getUserItem('aliyun_api_key');
            headers['X-LLM-Provider'] = 'aliyun';
            headers['Authorization'] = `Bearer ${aliyunKey}`;
        } else {
            const zhipuKey = window.appState?.apiKey || getUserItem('api_key') || getUserItem('globalApiKey');
            headers['Authorization'] = `Bearer ${zhipuKey}`;
        }
        
        return headers;
    },

    getConcurrencyForModel(model) {
        if (!model) return 3;
        
        const MODEL_CONCURRENCY_LIMITS = {
            'GLM-4.6': 3,
            'GLM-4.6V-FlashX': 3,
            'GLM-4.7': 2,
            'GLM-Image': 1,
            'GLM-Z1-Air': 30,
            'GLM-4.5': 10,
            'embedding-3-pro': 100,
            'GLM-4.6V': 10,
            'GLM-4.7-Flash': 1,
            'GLM-4.7-FlashX': 3,
            'GLM-OCR': 2,
            'GLM-5': 3,
            'GLM-4-Plus': 20,
            'GLM-Z1-Flash': 30,
            'GLM-Z1-AirX': 30,
            'GLM-4.5V': 10,
            'GLM-4.6V-Flash': 1,
            'AutoGLM-Phone': 5,
            'AutoGLM-Phone-Multilingual': 5,
            'GLM-4-0520': 20,
            'Search-Pro': 5,
            'Search-Std': 50,
            'GLM-4.5-Air': 5,
            'GLM-4.5-AirX': 5,
            'GLM-4-AirX': 5,
            'GLM-Realtime': 5,
            'GLM-4-Flash-250414': 5,
            'GLM-4-FlashX-250414': 50,
            'GLM-Realtime-Flash': 5,
            'GLM-Realtime-Air': 5,
            'GLM-4.5-Flash': 2,
            'GLM-4V-Plus-0111': 5,
            'GLM-Zero-Preview': 50,
            'GLM-4-Air': 100,
            'GLM-4-Air-250414': 30,
            'GLM-4-32B-0414-128K': 15,
            'GLM-4-Long': 10,
            'GLM-4-FlashX': 50,
            'GLM-4.1V-Thinking-Flash': 5,
            'GLM-4.1V-Thinking-FlashX': 30,
            'GLM-4-Voice': 5,
            'GLM-4-Flash': 200,
            'GLM-Z1-FlashX': 50,
            'GLM-4-9B': 5,
            'GLM-4V-Plus': 5,
            'GLM-4V-Flash': 10,
            'GLM-4V': 5,
            'Web-Search-Pro': 30,
            'GLM-ASR': 5,
            'Rerank': 50,
            'CogView-4-250304': 5,
            'CogView-3-Plus': 5,
            'CogView-4': 5,
            'CogView-3-Flash': 5,
            'CogView-3': 5,
            'CogVideoX-Flash': 3,
            'CogVideoX': 5,
            'CogVideoX-2': 5,
            'CogTTS-Clone': 2,
            'CogTTS': 5,
            'GLM-TTS': 5,
            'GLM-TTS-Clone': 2,
            'GLM-ASR-2512': 5,
            'ViduQ1-text': 5,
            'Viduq1-Image': 5,
            'Viduq1-Start-End': 5,
            'Vidu2-Image': 5,
            'Vidu2-Start-End': 5,
            'Vidu2-Reference': 5,
            'Embedding-3': 50,
            'Embedding-2': 50,
            'GLM-4-AllTools': 5,
            'GLM-4-Assistant': 5,
            'CodeGeeX-4': 50,
            'GLM-4': 30,
            'CharGLM-4': 5,
            'GLM-3-Turbo': 50,
            'Moderation': 5,
            'CogVideoX-3': 1,
            'GLM-Experimental-Preview': 5
        };
        
        const normalizedName = model.replace(/^glm-/i, 'GLM-').replace(/^GLM-/i, 'GLM-');
        if (MODEL_CONCURRENCY_LIMITS[normalizedName]) {
            return MODEL_CONCURRENCY_LIMITS[normalizedName];
        }
        for (const [key, value] of Object.entries(MODEL_CONCURRENCY_LIMITS)) {
            if (normalizedName.toLowerCase() === key.toLowerCase()) {
                return value;
            }
        }
        return 3;
    },

    async processSingleInputWithRetry(input, template, maxRetries = 3) {
        let lastError = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await this.processSingleInput(input, template);
                return result;
            } catch (error) {
                lastError = error;
                const errorMsg = error?.message || '';
                
                if (errorMsg.includes('429') || errorMsg.includes('速率限制') || errorMsg.includes('rate limit')) {
                    const waitTime = Math.min(2000 * attempt, 10000);
                    console.log(`[AsyncEngine] Rate limited, waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                } else {
                    throw error;
                }
            }
        }
        
        throw lastError;
    },

    async processSingleInput(input, template) {
        const requestBody = TemplateManager.buildRequestBody(input, template);
        const model = requestBody.model || template.model || 'glm-4-flash';
        const headers = this.getApiHeaders(model);
        
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            let errorMsg = `API请求失败: ${response.status}`;
            try {
                const errorData = await response.json();
                if (errorData.error) {
                    if (typeof errorData.error === 'string') {
                        errorMsg = errorData.error;
                    } else if (errorData.error.message) {
                        errorMsg = errorData.error.message;
                    } else {
                        errorMsg = JSON.stringify(errorData.error);
                    }
                }
            } catch (e) {
                console.error('[AsyncEngine] Failed to parse error response:', e);
            }
            throw new Error(errorMsg);
        }
        
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        const usage = data.usage || {};
        
        return {
            content: content,
            usage: usage,
            rawResponse: data
        };
    },

    async start(inputs, template, onProgress, onComplete) {
        console.log('[AsyncEngine] Starting async processing with', inputs.length, 'inputs');
        
        const asyncTask = this.state.asyncTask;
        asyncTask.requests = [];
        asyncTask.tasks = {};
        OutputHandler.clearResults();

        this.state.task.status = 'running';
        this.state.task.startTime = new Date();

        const model = template.model || 'glm-4-flash';
        const concurrency = this.getConcurrencyForModel(model);
        const requestDelay = concurrency >= 50 ? 100 : (concurrency >= 10 ? 200 : 500);
        
        console.log('[AsyncEngine] Model concurrency limit:', concurrency, ', request delay:', requestDelay + 'ms');

        let completed = 0;
        let failed = 0;

        for (let i = 0; i < inputs.length; i++) {
            const input = inputs[i];
            const requestId = 'REQ-' + (asyncTask.nextRequestId++);
            
            if (onProgress) {
                onProgress({
                    phase: 'processing',
                    current: i + 1,
                    total: inputs.length,
                    completed: completed,
                    failed: failed,
                    message: `正在处理: ${i + 1}/${inputs.length}`
                });
            }

            let resultItem;
            try {
                const result = await this.processSingleInputWithRetry(input, template, 3);
                resultItem = {
                    requestId: requestId,
                    inputId: input.id,
                    status: 'completed',
                    result: result.content,
                    usage: result.usage,
                    templateName: template.name
                };
                completed++;
            } catch (error) {
                const errorMsg = error?.message || String(error);
                console.error('[AsyncEngine] Processing failed for:', input.id, errorMsg);
                resultItem = {
                    requestId: requestId,
                    inputId: input.id,
                    status: 'failed',
                    error: errorMsg,
                    templateName: template.name
                };
                failed++;
            }

            asyncTask.requests.push({
                requestId: requestId,
                inputId: input.id,
                status: resultItem.status,
                templateName: template.name,
                model: model
            });

            OutputHandler.addResult(resultItem);

            if (onProgress) {
                onProgress({
                    phase: 'processing',
                    current: i + 1,
                    total: inputs.length,
                    completed: completed,
                    failed: failed,
                    stats: OutputHandler.getProgressStats()
                });
            }

            if (i < inputs.length - 1) {
                await new Promise(resolve => setTimeout(resolve, requestDelay));
            }
        }

        this.state.task.status = 'completed';
        this.state.task.endTime = new Date();

        console.log('[AsyncEngine] Processing completed:', completed, 'success,', failed, 'failed');

        if (onComplete) {
            onComplete({
                success: true,
                stats: OutputHandler.getProgressStats()
            });
        }
    },

    stop() {
        this.state.task.status = 'stopped';
        return { success: true, message: '任务已停止' };
    },

    async resume(template, onProgress, onComplete) {
        const asyncTask = this.state.asyncTask;
        
        if (!asyncTask.requests || asyncTask.requests.length === 0) {
            return { success: false, message: '没有可恢复的任务' };
        }

        const failedRequests = asyncTask.requests.filter(r => r.status === 'failed');
        if (failedRequests.length === 0) {
            return { success: true, message: '没有需要重试的失败任务' };
        }

        console.log('[AsyncEngine] Resuming with', failedRequests.length, 'failed requests');

        const model = template.model || 'glm-4-flash';
        const concurrency = this.getConcurrencyForModel(model);
        const requestDelay = concurrency >= 50 ? 100 : (concurrency >= 10 ? 200 : 500);

        this.state.task.status = 'running';

        let completed = 0;
        let stillFailed = 0;

        for (let i = 0; i < failedRequests.length; i++) {
            const request = failedRequests[i];
            const input = { id: request.inputId, content: request.inputId };

            if (onProgress) {
                onProgress({
                    phase: 'resuming',
                    current: i + 1,
                    total: failedRequests.length,
                    message: `正在重试: ${i + 1}/${failedRequests.length}`
                });
            }

            try {
                const result = await this.processSingleInputWithRetry(input, template, 3);
                request.status = 'completed';
                OutputHandler.updateResult(request.requestId, {
                    status: 'completed',
                    result: result.content,
                    usage: result.usage
                });
                completed++;
            } catch (error) {
                const errorMsg = error?.message || String(error);
                console.error('[AsyncEngine] Retry failed for:', request.inputId, errorMsg);
                stillFailed++;
            }

            if (i < failedRequests.length - 1) {
                await new Promise(resolve => setTimeout(resolve, requestDelay));
            }
        }

        this.state.task.status = 'completed';
        this.state.task.endTime = new Date();

        console.log('[AsyncEngine] Resume completed:', completed, 'recovered,', stillFailed, 'still failed');

        if (onComplete) {
            onComplete({
                success: true,
                stats: OutputHandler.getProgressStats()
            });
        }

        return { 
            success: true, 
            message: `重试完成: ${completed} 成功, ${stillFailed} 仍失败` 
        };
    },

    getStatus() {
        return {
            taskStatus: this.state.task.status,
            stats: OutputHandler.getProgressStats(),
            requests: this.state.asyncTask.requests
        };
    },

    exportCurrentResults() {
        return OutputHandler.exportToExcel('async');
    }
};

export default AsyncEngine;
export { AsyncEngine };
