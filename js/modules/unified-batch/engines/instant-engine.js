/**
 * 统一批量处理系统 - 极速同步引擎
 * 实时同步调用，立即显示结果
 * 支持并发调用
 */

import unifiedBatchState from '../state.js';
import TemplateManager from '../template-manager.js';
import OutputHandler from '../output-handler.js';

const InstantEngine = {
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

    async processSingle(input, template) {
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
                    }
                }
            } catch (e) {}
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
        console.log('[InstantEngine] Starting instant processing with', inputs.length, 'inputs');
        
        this.state.task.status = 'running';
        this.state.task.startTime = new Date();
        OutputHandler.clearResults();

        const model = template.model || 'glm-4-flash';
        const maxConcurrency = Math.min(this.getConcurrencyForModel(model), inputs.length, 5);
        
        console.log('[InstantEngine] Model:', model, ', Max concurrency:', maxConcurrency);

        let completed = 0;
        let failed = 0;
        const total = inputs.length;
        const results = [];

        const processWithProgress = async (input, index) => {
            if (this.state.task.status === 'stopped') {
                return null;
            }

            try {
                const result = await this.processSingle(input, template);
                
                const resultItem = {
                    requestId: `INST-${index + 1}`,
                    inputId: input.id,
                    status: 'completed',
                    result: result.content,
                    usage: result.usage,
                    templateName: template.name
                };
                
                OutputHandler.addResult(resultItem);
                completed++;
                
                if (onProgress) {
                    onProgress({
                        phase: 'processing',
                        current: completed + failed,
                        total: total,
                        completed: completed,
                        failed: failed,
                        lastResult: result.content,
                        inputId: input.id,
                        stats: OutputHandler.getProgressStats()
                    });
                }
                
                return resultItem;
                
            } catch (error) {
                const errorMsg = error?.message || String(error);
                console.error('[InstantEngine] Processing failed for:', input.id, errorMsg);
                
                const resultItem = {
                    requestId: `INST-${index + 1}`,
                    inputId: input.id,
                    status: 'failed',
                    error: errorMsg,
                    templateName: template.name
                };
                
                OutputHandler.addResult(resultItem);
                failed++;
                
                if (onProgress) {
                    onProgress({
                        phase: 'processing',
                        current: completed + failed,
                        total: total,
                        completed: completed,
                        failed: failed,
                        error: errorMsg,
                        inputId: input.id,
                        stats: OutputHandler.getProgressStats()
                    });
                }
                
                return resultItem;
            }
        };

        for (let i = 0; i < inputs.length; i += maxConcurrency) {
            if (this.state.task.status === 'stopped') {
                console.log('[InstantEngine] Task stopped by user');
                break;
            }

            const batch = inputs.slice(i, i + maxConcurrency);
            const batchPromises = batch.map((input, batchIndex) => 
                processWithProgress(input, i + batchIndex)
            );
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults.filter(r => r !== null));
        }

        this.state.task.status = 'completed';
        this.state.task.endTime = new Date();

        console.log('[InstantEngine] Processing completed:', completed, 'success,', failed, 'failed');

        if (onComplete) {
            onComplete({
                success: true,
                stats: OutputHandler.getProgressStats(),
                results: results
            });
        }

        return {
            success: true,
            completed: completed,
            failed: failed,
            results: results
        };
    },

    stop() {
        this.state.task.status = 'stopped';
        return { success: true, message: '任务已停止' };
    },

    getStatus() {
        return {
            taskStatus: this.state.task.status,
            stats: OutputHandler.getProgressStats()
        };
    }
};

export default InstantEngine;
export { InstantEngine };
