/**
 * 统一批量处理系统 - 极速同步引擎
 * 实时同步调用，立即显示结果
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

        let completed = 0;
        let failed = 0;
        const total = inputs.length;
        const results = [];

        for (let i = 0; i < inputs.length; i++) {
            const input = inputs[i];
            
            if (this.state.task.status === 'stopped') {
                console.log('[InstantEngine] Task stopped by user');
                break;
            }

            if (onProgress) {
                onProgress({
                    phase: 'processing',
                    current: i + 1,
                    total: total,
                    completed: completed,
                    failed: failed,
                    message: `正在处理: ${i + 1}/${total}`
                });
            }

            try {
                const result = await this.processSingle(input, template);
                
                const resultItem = {
                    requestId: `INST-${i + 1}`,
                    inputId: input.id,
                    status: 'completed',
                    result: result.content,
                    usage: result.usage,
                    templateName: template.name
                };
                
                results.push(resultItem);
                OutputHandler.addResult(resultItem);
                completed++;
                
                if (onProgress) {
                    onProgress({
                        phase: 'processing',
                        current: i + 1,
                        total: total,
                        completed: completed,
                        failed: failed,
                        lastResult: result.content,
                        stats: OutputHandler.getProgressStats()
                    });
                }
                
            } catch (error) {
                const errorMsg = error?.message || String(error);
                console.error('[InstantEngine] Processing failed for:', input.id, errorMsg);
                
                const resultItem = {
                    requestId: `INST-${i + 1}`,
                    inputId: input.id,
                    status: 'failed',
                    error: errorMsg,
                    templateName: template.name
                };
                
                results.push(resultItem);
                OutputHandler.addResult(resultItem);
                failed++;
            }
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
