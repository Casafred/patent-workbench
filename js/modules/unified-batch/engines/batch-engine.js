/**
 * 统一批量处理系统 - 大批量延时引擎
 * 智谱Batch API批处理，完成后统一获取结果
 */

import unifiedBatchState from '../state.js';
import { UnifiedBatchConfig } from '../config.js';
import TemplateManager from '../template-manager.js';
import OutputHandler from '../output-handler.js';

const { BATCH } = UnifiedBatchConfig;

const BatchEngine = {
    state: unifiedBatchState.state,

    generateJsonl(inputs, template) {
        const lines = [];
        
        inputs.forEach((input, index) => {
            const requestItem = TemplateManager.buildBatchRequestItem(
                input, 
                template, 
                'request-' + (index + 1)
            );
            lines.push(JSON.stringify(requestItem));
        });

        this.state.batchTask.jsonlContent = lines.join('\n');
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

    async uploadJsonl() {
        const content = this.state.batchTask.jsonlContent;
        if (!content) {
            return { success: false, message: '没有请求文件内容' };
        }

        try {
            const blob = new Blob([content], { type: 'application/jsonl' });
            const formData = new FormData();
            formData.append('file', blob, 'batch_requests.jsonl');

            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('上传失败: ' + response.status);
            }

            const result = await response.json();
            this.state.batchTask.fileId = result.file_id;
            
            return { 
                success: true, 
                fileId: result.file_id,
                message: '文件上传成功'
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async createBatch() {
        const fileId = this.state.batchTask.fileId;
        if (!fileId) {
            return { success: false, message: '未上传文件' };
        }

        try {
            const response = await fetch('/create_batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input_file_id: fileId,
                    endpoint: '/v4/chat/completions',
                    completion_window: '24h'
                })
            });

            if (!response.ok) {
                throw new Error('创建批处理失败: ' + response.status);
            }

            const result = await response.json();
            this.state.batchTask.batchId = result.id;
            this.state.task.status = 'running';
            this.state.task.startTime = new Date();

            unifiedBatchState.saveState();
            
            return { 
                success: true, 
                batchId: result.id,
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

        try {
            const response = await fetch('/check_status?batch_id=' + batchId);
            
            if (!response.ok) {
                throw new Error('查询状态失败: ' + response.status);
            }

            const result = await response.json();
            
            const statusInfo = {
                success: true,
                id: result.id,
                status: result.status,
                requestCounts: result.request_counts,
                outputFileId: result.output_file_id,
                errorFileId: result.error_file_id
            };

            if (result.output_file_id) {
                this.state.batchTask.outputFileId = result.output_file_id;
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

        try {
            const response = await fetch('/download_result?file_id=' + outputFileId);
            
            if (!response.ok) {
                throw new Error('下载结果失败: ' + response.status);
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
            hasResult: !!this.state.batchTask.resultContent
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
            autoCheckTimer: null
        };
        this.state.task = { status: 'idle', startTime: null, endTime: null };
        OutputHandler.clearResults();
    }
};

export default BatchEngine;
export { BatchEngine };
