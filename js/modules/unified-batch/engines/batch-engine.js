/**
 * 统一批量处理系统 - 大批量延时引擎
 * 支持智谱AI和阿里云百炼双服务商Batch API
 */

import unifiedBatchState from '../state.js';
import { UnifiedBatchConfig } from '../config.js';
import TemplateManager from '../template-manager.js';
import OutputHandler from '../output-handler.js';

const { BATCH } = UnifiedBatchConfig;

const BatchEngine = {
    state: unifiedBatchState.state,
    currentProvider: 'zhipu',
    currentModel: 'glm-4-flash',

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
        const provider = this.getProviderForModel(model || this.currentModel);
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

    setModel(model) {
        this.currentModel = model;
        this.currentProvider = this.getProviderForModel(model);
    },

    generateJsonl(inputs, template) {
        const lines = [];
        const provider = this.getProviderForModel(template.model);
        
        inputs.forEach((input, index) => {
            const requestItem = TemplateManager.buildBatchRequestItem(
                input, 
                template, 
                'request-' + (index + 1),
                provider
            );
            lines.push(JSON.stringify(requestItem));
        });

        this.state.batchTask.jsonlContent = lines.join('\n');
        this.state.batchTask.provider = provider;
        return this.state.batchTask.jsonlContent;
    },

    downloadJsonl() {
        const content = this.state.batchTask.jsonlContent;
        if (!content) {
            return { success: false, message: '没有生成请求文件' };
        }

        const blob = new Blob([content], { type: 'application/jsonl' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'batch_requests_' + new Date().toISOString().slice(0, 10) + '.jsonl';
        link.click();
        
        URL.revokeObjectURL(url);
        return { success: true, message: 'JSONL文件已下载' };
    },

    async uploadJsonl(model) {
        const content = this.state.batchTask.jsonlContent;
        if (!content) {
            return { success: false, message: '没有请求文件内容' };
        }

        if (model) {
            this.setModel(model);
        }

        try {
            const blob = new Blob([content], { type: 'application/jsonl' });
            const formData = new FormData();
            formData.append('file', blob, 'batch_requests.jsonl');

            const headers = this.getApiHeaders(model || this.currentModel);
            delete headers['Content-Type'];
            headers['X-LLM-Provider'] = this.currentProvider;

            const response = await fetch('/api/async_batch/upload', {
                method: 'POST',
                headers: headers,
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || '上传失败: ' + response.status);
            }

            const result = await response.json();
            const fileId = result.data?.file_id || result.file_id;
            this.state.batchTask.fileId = fileId;
            
            return { 
                success: true, 
                fileId: fileId,
                message: '文件上传成功'
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async createBatch(model) {
        const fileId = this.state.batchTask.fileId;
        if (!fileId) {
            return { success: false, message: '未上传文件' };
        }

        if (model) {
            this.setModel(model);
        }

        try {
            const headers = this.getApiHeaders(model);
            
            const endpoint = this.currentProvider === 'aliyun' 
                ? '/v1/chat/completions' 
                : '/v4/chat/completions';

            const response = await fetch('/api/async_batch/create_batch', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    input_file_id: fileId,
                    endpoint: endpoint,
                    completion_window: '24h',
                    provider: this.currentProvider
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || '创建批处理失败: ' + response.status);
            }

            const result = await response.json();
            const data = result.data || result;
            this.state.batchTask.batchId = data.id;
            this.state.batchTask.provider = this.currentProvider;
            this.state.task.status = 'running';
            this.state.task.startTime = new Date();

            unifiedBatchState.saveState();
            
            return { 
                success: true, 
                batchId: data.id,
                provider: this.currentProvider,
                message: '批处理任务已创建'
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async checkStatus() {
        const batchId = this.state.batchTask.batchId;
        if (!batchId) {
            return { success: false, message: '没有批处理任务' };
        }

        const provider = this.state.batchTask.provider || this.currentProvider;

        try {
            const headers = this.getApiHeaders(this.currentModel);
            
            const response = await fetch('/api/async_batch/check_status', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ 
                    batch_id: batchId,
                    provider: provider
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || '查询状态失败: ' + response.status);
            }

            const result = await response.json();
            const data = result.data || result;
            
            const statusInfo = {
                success: true,
                id: data.id,
                object: data.object,
                endpoint: data.endpoint,
                status: data.status,
                inputFileId: data.input_file_id,
                outputFileId: data.output_file_id,
                errorFileId: data.error_file_id,
                completionWindow: data.completion_window,
                requestCounts: data.request_counts,
                total: data.total,
                completed: data.completed,
                failed: data.failed,
                createdAt: data.created_at,
                inProgressAt: data.in_progress_at,
                expiresAt: data.expires_at,
                finalizingAt: data.finalizing_at,
                completedAt: data.completed_at,
                failedAt: data.failed_at,
                expiredAt: data.expired_at,
                cancellingAt: data.cancelling_at,
                cancelledAt: data.cancelled_at,
                metadata: data.metadata
            };

            if (data.output_file_id) {
                this.state.batchTask.outputFileId = data.output_file_id;
            }
            
            if (result.input_file_id) {
                this.state.batchTask.inputFileId = result.input_file_id;
            }

            return statusInfo;
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async downloadResult() {
        const outputFileId = this.state.batchTask.outputFileId;
        if (!outputFileId) {
            return { success: false, message: '没有输出文件' };
        }

        const provider = this.state.batchTask.provider || this.currentProvider;

        try {
            const headers = this.getApiHeaders(this.currentModel);
            
            const response = await fetch('/api/async_batch/download_result', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ 
                    file_id: outputFileId,
                    provider: provider
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || '下载结果失败: ' + response.status);
            }

            const content = await response.text();
            this.state.batchTask.resultContent = content;
            
            return { 
                success: true, 
                content: content,
                message: '结果下载成功'
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async startAutoCheck(onProgress, onComplete) {
        const check = async () => {
            const statusResult = await this.checkStatus();
            
            if (!statusResult.success) {
                if (onProgress) {
                    onProgress({
                        status: 'error',
                        error: statusResult.error
                    });
                }
                return;
            }

            if (onProgress) {
                onProgress({
                    status: statusResult.status,
                    requestCounts: statusResult.requestCounts,
                    batchId: this.state.batchTask.batchId
                });
            }

            if (statusResult.status === 'completed') {
                this.state.task.status = 'completed';
                this.state.task.endTime = new Date();
                this.stopAutoCheck();

                const downloadResult = await this.downloadResult();
                
                if (downloadResult.success && onComplete) {
                    onComplete({
                        success: true,
                        content: downloadResult.content
                    });
                }
                return;
            }

            if (statusResult.status === 'failed' || statusResult.status === 'expired') {
                this.state.task.status = 'failed';
                this.stopAutoCheck();
                
                if (onProgress) {
                    onProgress({
                        status: 'failed',
                        error: '批处理任务失败或过期'
                    });
                }
                return;
            }

            this.state.batchTask.autoCheckTimer = setTimeout(check, BATCH.POLL_INTERVAL);
        };

        check();
    },

    stopAutoCheck() {
        if (this.state.batchTask.autoCheckTimer) {
            clearTimeout(this.state.batchTask.autoCheckTimer);
            this.state.batchTask.autoCheckTimer = null;
        }
    },

    async recoverFromBatchId(batchId, onProgress, onComplete) {
        this.state.batchTask.batchId = batchId;
        unifiedBatchState.saveState();

        const statusResult = await this.checkStatus();
        
        if (!statusResult.success) {
            return { success: false, message: '无法恢复任务: ' + statusResult.error };
        }

        this.state.task.status = 'running';
        
        if (statusResult.status === 'completed') {
            const downloadResult = await this.downloadResult();
            
            if (downloadResult.success) {
                if (onComplete) {
                    onComplete({
                        success: true,
                        content: downloadResult.content
                    });
                }
                return { success: true, message: '任务已完成，结果已下载' };
            }
        } else {
            this.startAutoCheck(onProgress, onComplete);
        }

        return { success: true, message: '任务已恢复' };
    },

    parseResults() {
        const content = this.state.batchTask.resultContent;
        if (!content) {
            return { success: false, message: '没有结果内容' };
        }

        const results = OutputHandler.parseJsonl(content);
        
        results.forEach(item => {
            const customId = item.custom_id;
            const content = item?.response?.body?.choices?.[0]?.message?.content;
            const usage = item?.response?.body?.usage;
            const error = item?.error;

            OutputHandler.addResult({
                customId: customId,
                status: error ? 'failed' : 'completed',
                content: content,
                usage: usage,
                error: error?.message
            });
        });

        return {
            success: true,
            count: results.length,
            message: '解析完成，共' + results.length + '条结果'
        };
    },

    generateReport(originalData) {
        const content = this.state.batchTask.resultContent;
        if (!content) {
            return { success: false, message: '没有结果内容' };
        }

        const results = OutputHandler.parseJsonl(content);
        return OutputHandler.generateFinalReport(originalData, results);
    },

    exportReport() {
        return OutputHandler.exportFinalReport();
    },

    getStatus() {
        return {
            taskStatus: this.state.task.status,
            batchId: this.state.batchTask.batchId,
            fileId: this.state.batchTask.fileId,
            outputFileId: this.state.batchTask.outputFileId,
            hasResult: !!this.state.batchTask.resultContent,
            provider: this.state.batchTask.provider || this.currentProvider
        };
    },

    stop() {
        this.stopAutoCheck();
        this.state.task.status = 'stopped';
        return { success: true, message: '自动检查已停止' };
    },

    reset() {
        this.stopAutoCheck();
        this.state.batchTask = {
            jsonlContent: '',
            fileId: null,
            batchId: null,
            outputFileId: null,
            resultContent: null,
            autoCheckTimer: null,
            provider: null
        };
        this.state.task = { status: 'idle', startTime: null, endTime: null };
        OutputHandler.clearResults();
    }
};

export default BatchEngine;
export { BatchEngine };
