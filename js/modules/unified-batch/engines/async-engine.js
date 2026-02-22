/**
 * 统一批量处理系统 - 小批量异步引擎
 * 实时异步API调用，逐条获取结果
 */

import unifiedBatchState from '../state.js';
import { UnifiedBatchConfig } from '../config.js';
import TemplateManager from '../template-manager.js';
import OutputHandler from '../output-handler.js';

const { ASYNC } = UnifiedBatchConfig;

const AsyncEngine = {
    state: unifiedBatchState.state,

    async submitRequest(input, template) {
        const requestBody = TemplateManager.buildRequestBody(input, template);
        
        try {
            const response = await fetch('/async_submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error('提交失败: ' + response.status);
            }

            const result = await response.json();
            return {
                success: true,
                taskId: result.task_id,
                requestId: this.state.asyncTask.nextRequestId++
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async retrieveResult(taskId) {
        try {
            const response = await fetch('/async_retrieve?task_id=' + taskId);
            
            if (!response.ok) {
                throw new Error('获取结果失败: ' + response.status);
            }

            const result = await response.json();
            return {
                success: true,
                status: result.task_status,
                content: result.content,
                usage: result.usage
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async start(inputs, template, onProgress, onComplete) {
        const asyncTask = this.state.asyncTask;
        asyncTask.requests = [];
        asyncTask.tasks = {};
        OutputHandler.clearResults();

        this.state.task.status = 'running';
        this.state.task.startTime = new Date();

        const batches = [];
        for (let i = 0; i < inputs.length; i += ASYNC.CONCURRENCY) {
            batches.push(inputs.slice(i, i + ASYNC.CONCURRENCY));
        }

        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            
            const submitPromises = batch.map(async (input) => {
                const submitResult = await this.submitRequest(input, template);
                
                if (submitResult.success) {
                    const requestInfo = {
                        requestId: 'REQ-' + submitResult.requestId,
                        inputId: input.id,
                        taskId: submitResult.taskId,
                        status: 'pending',
                        retries: 0,
                        templateName: template.name
                    };
                    
                    asyncTask.requests.push(requestInfo);
                    asyncTask.tasks[submitResult.taskId] = requestInfo;
                    
                    OutputHandler.addResult({
                        requestId: requestInfo.requestId,
                        inputId: input.id,
                        status: 'pending',
                        templateName: template.name
                    });
                    
                    return requestInfo;
                } else {
                    OutputHandler.addResult({
                        requestId: 'REQ-' + submitResult.requestId,
                        inputId: input.id,
                        status: 'failed',
                        error: submitResult.error,
                        templateName: template.name
                    });
                    
                    return null;
                }
            });

            await Promise.all(submitPromises);

            if (onProgress) {
                onProgress({
                    phase: 'submit',
                    batchIndex: batchIndex + 1,
                    totalBatches: batches.length,
                    stats: OutputHandler.getProgressStats()
                });
            }
        }

        await this.startPolling(template, onProgress, onComplete);
    },

    async startPolling(template, onProgress, onComplete) {
        const asyncTask = this.state.asyncTask;
        
        const poll = async () => {
            const pendingRequests = asyncTask.requests.filter(
                r => r.status === 'pending' || r.status === 'processing' || r.status === 'retrying'
            );

            if (pendingRequests.length === 0) {
                this.stopPolling();
                this.state.task.status = 'completed';
                this.state.task.endTime = new Date();
                
                if (onComplete) {
                    onComplete({
                        success: true,
                        stats: OutputHandler.getProgressStats()
                    });
                }
                return;
            }

            for (const request of pendingRequests) {
                if (request.status === 'retrying' && request.retries >= ASYNC.MAX_RETRIES) {
                    request.status = 'failed';
                    OutputHandler.updateResult(request.requestId, {
                        status: 'failed',
                        error: '超过最大重试次数'
                    });
                    continue;
                }

                const result = await this.retrieveResult(request.taskId);
                
                if (result.success) {
                    switch (result.status) {
                        case 'SUCCESS':
                            request.status = 'completed';
                            OutputHandler.updateResult(request.requestId, {
                                status: 'completed',
                                result: result.content,
                                usage: result.usage
                            });
                            break;
                        case 'FAILED':
                            request.status = 'retrying';
                            request.retries++;
                            OutputHandler.updateResult(request.requestId, {
                                status: 'retrying',
                                retries: request.retries
                            });
                            break;
                        case 'PROCESSING':
                            request.status = 'processing';
                            OutputHandler.updateResult(request.requestId, {
                                status: 'processing'
                            });
                            break;
                    }
                }
            }

            if (onProgress) {
                onProgress({
                    phase: 'poll',
                    stats: OutputHandler.getProgressStats()
                });
            }

            asyncTask.pollingInterval = setTimeout(poll, ASYNC.POLL_INTERVAL);
        };

        poll();
    },

    stopPolling() {
        const asyncTask = this.state.asyncTask;
        if (asyncTask.pollingInterval) {
            clearTimeout(asyncTask.pollingInterval);
            asyncTask.pollingInterval = null;
        }
    },

    resume(template, onProgress, onComplete) {
        const asyncTask = this.state.asyncTask;
        
        if (asyncTask.requests.length === 0) {
            return { success: false, message: '没有可恢复的任务' };
        }

        asyncTask.requests.forEach(request => {
            if (request.status !== 'completed' && request.status !== 'failed') {
                request.status = 'pending';
            }
        });

        this.state.task.status = 'running';
        this.startPolling(template, onProgress, onComplete);
        
        return { success: true, message: '任务已恢复' };
    },

    getStatus() {
        return {
            taskStatus: this.state.task.status,
            stats: OutputHandler.getProgressStats(),
            requests: this.state.asyncTask.requests
        };
    },

    stop() {
        this.stopPolling();
        this.state.task.status = 'stopped';
        return { success: true, message: '任务已停止' };
    },

    exportCurrentResults() {
        return OutputHandler.exportToExcel('async');
    }
};

export default AsyncEngine;
export { AsyncEngine };
