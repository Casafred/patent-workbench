/**
 * 统一批量处理系统 - 智能路由模块
 * 根据数据量自动选择处理模式
 */

import { UnifiedBatchConfig } from './config.js';

const { MODE, MODE_THRESHOLD } = UnifiedBatchConfig;

const UnifiedBatchRouter = {
    config: {
        threshold: MODE_THRESHOLD,
        smallBatchConcurrency: UnifiedBatchConfig.ASYNC.CONCURRENCY,
        smallBatchPollInterval: UnifiedBatchConfig.ASYNC.POLL_INTERVAL,
        largeBatchPollInterval: UnifiedBatchConfig.BATCH.POLL_INTERVAL
    },

    determineMode(dataCount, userPreference = null) {
        if (userPreference && userPreference !== MODE.AUTO) {
            return userPreference;
        }
        return dataCount < this.config.threshold ? MODE.ASYNC : MODE.BATCH;
    },

    getRecommendation(dataCount) {
        if (dataCount < 10) {
            return {
                mode: MODE.ASYNC,
                reason: '数据量较小，建议使用实时异步模式，可立即获得结果',
                estimatedTime: this.estimateAsyncTime(dataCount)
            };
        } else if (dataCount < this.config.threshold) {
            return {
                mode: MODE.ASYNC,
                reason: `数据量适中，建议使用异步模式，约需${this.estimateAsyncTime(dataCount)}完成`,
                estimatedTime: this.estimateAsyncTime(dataCount)
            };
        } else if (dataCount < 200) {
            return {
                mode: MODE.BATCH,
                reason: '数据量较大，建议使用批处理模式，效率更高',
                estimatedTime: this.estimateBatchTime(dataCount)
            };
        } else {
            return {
                mode: MODE.BATCH,
                reason: '数据量很大，必须使用批处理模式',
                estimatedTime: this.estimateBatchTime(dataCount)
            };
        }
    },

    estimateAsyncTime(dataCount) {
        const concurrency = this.config.smallBatchConcurrency;
        const avgProcessingTime = 10;
        const batches = Math.ceil(dataCount / concurrency);
        const totalSeconds = batches * avgProcessingTime;
        
        if (totalSeconds < 60) {
            return `${totalSeconds}秒`;
        } else if (totalSeconds < 3600) {
            return `${Math.ceil(totalSeconds / 60)}分钟`;
        } else {
            return `${Math.ceil(totalSeconds / 3600)}小时`;
        }
    },

    estimateBatchTime(dataCount) {
        const baseTime = 5;
        const perItemTime = 0.5;
        const totalMinutes = baseTime + (dataCount * perItemTime / 60);
        
        if (totalMinutes < 60) {
            return `${Math.ceil(totalMinutes)}分钟`;
        } else {
            return `${Math.ceil(totalMinutes / 60)}小时`;
        }
    },

    getModeInfo(mode) {
        const modeInfo = {
            [MODE.ASYNC]: {
                name: '小批量异步模式',
                description: '实时处理，逐个获取结果',
                features: [
                    '实时API调用，快速响应',
                    '逐条显示处理结果',
                    '支持中途导出',
                    '5秒轮询状态更新'
                ],
                pollInterval: this.config.smallBatchPollInterval,
                maxRetries: UnifiedBatchConfig.ASYNC.MAX_RETRIES
            },
            [MODE.BATCH]: {
                name: '大批量延时模式',
                description: '高效批处理，完成后统一获取',
                features: [
                    '智谱Batch API批处理',
                    '整体进度显示',
                    '支持断点续查',
                    '60秒轮询状态更新'
                ],
                pollInterval: this.config.largeBatchPollInterval
            }
        };
        return modeInfo[mode] || null;
    },

    setThreshold(newThreshold) {
        if (typeof newThreshold === 'number' && newThreshold > 0) {
            this.config.threshold = newThreshold;
            return true;
        }
        return false;
    },

    getThreshold() {
        return this.config.threshold;
    },

    isAsyncMode(mode) {
        return mode === MODE.ASYNC;
    },

    isBatchMode(mode) {
        return mode === MODE.BATCH;
    }
};

export default UnifiedBatchRouter;
export { UnifiedBatchRouter };
