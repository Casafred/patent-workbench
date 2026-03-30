// js/modules/patent-batch/patent-cache.js
// 专利数据缓存管理模块 (用户隔离版)

const PatentCache = {
    // 缓存键前缀
    CACHE_KEY_PREFIX: 'patent_cache_',
    // 解读缓存键前缀
    ANALYSIS_CACHE_KEY_PREFIX: 'patent_analysis_',
    // 缓存过期时间（30天，单位：毫秒）
    CACHE_EXPIRY: 30 * 24 * 60 * 60 * 1000,
    // 警告阈值（7天，单位：毫秒）
    CACHE_WARNING_THRESHOLD: 7 * 24 * 60 * 60 * 1000,

    /**
     * 获取用户隔离存储实例
     * @returns {Object} 存储实例
     */
    _getStorage() {
        if (window.userCacheStorage && window.userCacheStorage.isInitialized()) {
            return window.userCacheStorage;
        }
        return {
            get: (key) => localStorage.getItem(key),
            getJSON: (key, def = null) => {
                try {
                    const v = localStorage.getItem(key);
                    return v ? JSON.parse(v) : def;
                } catch (e) { return def; }
            },
            set: (key, val) => { localStorage.setItem(key, val); return true; },
            setJSON: (key, val) => { localStorage.setItem(key, JSON.stringify(val)); return true; },
            remove: (key) => { localStorage.removeItem(key); return true; },
            has: (key) => localStorage.getItem(key) !== null,
            getKeysByPrefix: (prefix) => {
                const keys = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && k.startsWith(prefix)) keys.push(k);
                }
                return keys;
            },
            removeByPrefix: (prefix) => {
                const keys = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && k.startsWith(prefix)) {
                        localStorage.removeItem(k);
                        keys.push(k);
                    }
                }
                return keys.length;
            }
        };
    },

    /**
     * 获取缓存键
     * @param {string} patentNumber - 专利号
     * @returns {string} 缓存键
     */
    getCacheKey(patentNumber) {
        return `${this.CACHE_KEY_PREFIX}${patentNumber.toUpperCase()}`;
    },

    /**
     * 保存专利数据到缓存 (用户隔离)
     * @param {string} patentNumber - 专利号
     * @param {Object} data - 专利数据
     * @param {Array} selectedFields - 选择的字段列表
     * @param {string} url - Google Patents 链接
     */
    save(patentNumber, data, selectedFields = [], url = null) {
        try {
            // 不缓存图片，避免缓存爆满
            const cacheDataCopy = JSON.parse(JSON.stringify(data));
            if (cacheDataCopy.drawings) {
                cacheDataCopy.drawings = [];
                console.log(`🔍 专利 ${patentNumber} 图片不缓存，下次需重新爬取`);
            }
            
            const cacheData = {
                patentNumber: patentNumber.toUpperCase(),
                data: cacheDataCopy,
                url: url || `https://patents.google.com/patent/${patentNumber}`,
                timestamp: Date.now(),
                selectedFields: selectedFields,
                version: '1.1'
            };
            this._getStorage().setJSON(this.getCacheKey(patentNumber), cacheData);
            console.log(`✅ 专利 ${patentNumber} 数据已缓存（不含图片）`);
        } catch (error) {
            console.error(`❌ 缓存专利 ${patentNumber} 数据失败:`, error);
            this.cleanExpiredCache();
        }
    },

    /**
     * 从缓存获取专利数据 (用户隔离)
     * @param {string} patentNumber - 专利号
     * @returns {Object|null} 缓存数据或null
     */
    get(patentNumber) {
        try {
            const cacheKey = this.getCacheKey(patentNumber);
            const cacheData = this._getStorage().getJSON(cacheKey);
            if (!cacheData) return null;
            
            if (Date.now() - cacheData.timestamp > this.CACHE_EXPIRY) {
                console.log(`🗑️ 专利 ${patentNumber} 缓存已过期，自动清理`);
                this._getStorage().remove(cacheKey);
                return null;
            }

            return cacheData;
        } catch (error) {
            console.error(`❌ 读取专利 ${patentNumber} 缓存失败:`, error);
            return null;
        }
    },

    /**
     * 检查专利是否有有效缓存
     * @param {string} patentNumber - 专利号
     * @returns {boolean} 是否有有效缓存
     */
    has(patentNumber) {
        return this.get(patentNumber) !== null;
    },

    /**
     * 批量检查专利缓存状态
     * @param {Array<string>} patentNumbers - 专利号列表
     * @returns {Object} 缓存状态统计
     */
    checkBatch(patentNumbers) {
        const result = {
            cached: [],      // 有缓存的专利
            notCached: [],   // 无缓存的专利
            expired: [],     // 过期但还在的缓存（理论上get会清理）
            details: {}      // 每个专利的详细状态
        };

        patentNumbers.forEach(number => {
            const cacheData = this.get(number);
            const upperNumber = number.toUpperCase();
            
            if (cacheData) {
                const age = Date.now() - cacheData.timestamp;
                const isOld = age > this.CACHE_WARNING_THRESHOLD;
                
                result.cached.push(upperNumber);
                result.details[upperNumber] = {
                    hasCache: true,
                    timestamp: cacheData.timestamp,
                    age: age,
                    isOld: isOld,
                    cacheDate: new Date(cacheData.timestamp).toLocaleString('zh-CN'),
                    selectedFields: cacheData.selectedFields || []
                };
            } else {
                result.notCached.push(upperNumber);
                result.details[upperNumber] = {
                    hasCache: false
                };
            }
        });

        return result;
    },

    /**
     * 删除指定专利的缓存 (用户隔离)
     * @param {string} patentNumber - 专利号
     */
    remove(patentNumber) {
        try {
            this._getStorage().remove(this.getCacheKey(patentNumber));
            console.log(`🗑️ 专利 ${patentNumber} 缓存已删除`);
        } catch (error) {
            console.error(`❌ 删除专利 ${patentNumber} 缓存失败:`, error);
        }
    },

    /**
     * 清理所有过期的缓存 (用户隔离)
     * @returns {number} 清理的缓存数量
     */
    cleanExpiredCache() {
        let cleanedCount = 0;
        const now = Date.now();
        const storage = this._getStorage();
        
        try {
            const keys = storage.getKeysByPrefix(this.CACHE_KEY_PREFIX);
            if (!Array.isArray(keys)) return 0;
            
            keys.forEach(key => {
                try {
                    const cached = storage.getJSON(key);
                    if (cached && now - cached.timestamp > this.CACHE_EXPIRY) {
                        storage.remove(key);
                        cleanedCount++;
                    }
                } catch (e) {
                    storage.remove(key);
                    cleanedCount++;
                }
            });
        } catch (error) {
            console.error('❌ 清理过期缓存失败:', error);
        }

        if (cleanedCount > 0) {
            console.log(`🧹 已清理 ${cleanedCount} 个过期缓存`);
        }
        return cleanedCount;
    },

    /**
     * 清理所有专利缓存 (用户隔离)
     * @returns {number} 清理的缓存数量
     */
    clearAll() {
        const storage = this._getStorage();
        const clearedCount = storage.removeByPrefix(this.CACHE_KEY_PREFIX);
        console.log(`🧹 已清理 ${clearedCount} 个专利缓存`);
        return clearedCount;
    },

    /**
     * 获取缓存统计信息 (用户隔离)
     * @returns {Object} 统计信息
     */
    getStats() {
        let totalCount = 0;
        let totalSize = 0;
        let oldestTimestamp = Date.now();
        let newestTimestamp = 0;
        const storage = this._getStorage();

        try {
            const keys = storage.getKeysByPrefix(this.CACHE_KEY_PREFIX);
            keys.forEach(key => {
                const value = storage.get(key);
                if (value) {
                    totalCount++;
                    totalSize += value.length * 2;
                    
                    try {
                        const cached = JSON.parse(value);
                        if (cached.timestamp < oldestTimestamp) {
                            oldestTimestamp = cached.timestamp;
                        }
                        if (cached.timestamp > newestTimestamp) {
                            newestTimestamp = cached.timestamp;
                        }
                    } catch (e) {}
                }
            });
        } catch (error) {
            console.error('❌ 获取缓存统计失败:', error);
        }

        return {
            totalCount,
            totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
            oldestCache: oldestTimestamp < Date.now() ? new Date(oldestTimestamp).toLocaleString('zh-CN') : '无',
            newestCache: newestTimestamp > 0 ? new Date(newestTimestamp).toLocaleString('zh-CN') : '无'
        };
    },

    /**
     * 格式化缓存时间显示
     * @param {number} timestamp - 时间戳
     * @returns {string} 格式化后的时间字符串
     */
    formatCacheTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const date = new Date(timestamp);
        
        if (diff < 60 * 1000) {
            return '刚刚';
        } else if (diff < 60 * 60 * 1000) {
            return `${Math.floor(diff / (60 * 1000))} 分钟前`;
        } else if (diff < 24 * 60 * 60 * 1000) {
            return `${Math.floor(diff / (60 * 60 * 1000))} 小时前`;
        } else if (diff < 7 * 24 * 60 * 60 * 1000) {
            return `${Math.floor(diff / (24 * 60 * 60 * 1000))} 天前`;
        } else {
            return date.toLocaleString('zh-CN');
        }
    },

    // =================================================================================
    // 解读缓存相关方法
    // =================================================================================

    /**
     * 获取解读缓存键
     * @param {string} patentNumber - 专利号
     * @returns {string} 缓存键
     */
    getAnalysisCacheKey(patentNumber) {
        return `${this.ANALYSIS_CACHE_KEY_PREFIX}${patentNumber.toUpperCase()}`;
    },

    /**
     * 保存解读结果到缓存 (用户隔离)
     * @param {string} patentNumber - 专利号
     * @param {Object} analysisData - 解读数据
     * @param {string} analysisData.content - 解读内容
     * @param {string} analysisData.template - 使用的模板名称
     * @param {string} analysisData.model - 使用的模型
     */
    saveAnalysis(patentNumber, analysisData) {
        try {
            const cacheData = {
                patentNumber: patentNumber.toUpperCase(),
                content: analysisData.content,
                template: analysisData.template || '',
                templateId: analysisData.templateId || '',
                model: analysisData.model || '',
                timestamp: Date.now(),
                version: '1.0'
            };
            this._getStorage().setJSON(this.getAnalysisCacheKey(patentNumber), cacheData);
            console.log(`✅ 专利 ${patentNumber} 解读结果已缓存`);
            
            this.dispatchAnalysisUpdate(patentNumber, cacheData);
            return true;
        } catch (error) {
            console.error(`❌ 缓存专利 ${patentNumber} 解读结果失败:`, error);
            this.cleanExpiredCache();
            return false;
        }
    },

    /**
     * 从缓存获取解读结果 (用户隔离)
     * @param {string} patentNumber - 专利号
     * @returns {Object|null} 缓存数据或null
     */
    getAnalysis(patentNumber) {
        try {
            const cacheKey = this.getAnalysisCacheKey(patentNumber);
            const cacheData = this._getStorage().getJSON(cacheKey);
            if (!cacheData) return null;
            
            if (Date.now() - cacheData.timestamp > this.CACHE_EXPIRY) {
                console.log(`🗑️ 专利 ${patentNumber} 解读缓存已过期，自动清理`);
                this._getStorage().remove(cacheKey);
                return null;
            }

            return cacheData;
        } catch (error) {
            console.error(`❌ 读取专利 ${patentNumber} 解读缓存失败:`, error);
            return null;
        }
    },

    /**
     * 检查专利是否有有效的解读缓存
     * @param {string} patentNumber - 专利号
     * @returns {boolean} 是否有有效缓存
     */
    hasAnalysis(patentNumber) {
        return this.getAnalysis(patentNumber) !== null;
    },

    /**
     * 删除指定专利的解读缓存 (用户隔离)
     * @param {string} patentNumber - 专利号
     */
    removeAnalysis(patentNumber) {
        try {
            this._getStorage().remove(this.getAnalysisCacheKey(patentNumber));
            console.log(`🗑️ 专利 ${patentNumber} 解读缓存已删除`);
        } catch (error) {
            console.error(`❌ 删除专利 ${patentNumber} 解读缓存失败:`, error);
        }
    },

    /**
     * 批量检查解读缓存状态
     * @param {Array<string>} patentNumbers - 专利号列表
     * @returns {Object} 缓存状态统计
     */
    checkAnalysisBatch(patentNumbers) {
        const result = {
            cached: [],
            notCached: [],
            details: {}
        };

        patentNumbers.forEach(number => {
            const cacheData = this.getAnalysis(number);
            const upperNumber = number.toUpperCase();
            
            if (cacheData) {
                result.cached.push(upperNumber);
                result.details[upperNumber] = {
                    hasAnalysisCache: true,
                    timestamp: cacheData.timestamp,
                    template: cacheData.template,
                    model: cacheData.model,
                    cacheDate: new Date(cacheData.timestamp).toLocaleString('zh-CN')
                };
            } else {
                result.notCached.push(upperNumber);
                result.details[upperNumber] = {
                    hasAnalysisCache: false
                };
            }
        });

        return result;
    },

    /**
     * 清理所有解读缓存 (用户隔离)
     * @returns {number} 清理的缓存数量
     */
    clearAllAnalysis() {
        const storage = this._getStorage();
        const clearedCount = storage.removeByPrefix(this.ANALYSIS_CACHE_KEY_PREFIX);
        console.log(`🧹 已清理 ${clearedCount} 个解读缓存`);
        return clearedCount;
    },

    /**
     * 获取解读缓存统计信息
     * @returns {Object} 统计信息
     */
    getAnalysisStats() {
        let totalCount = 0;
        let totalSize = 0;
        let oldestTimestamp = Date.now();
        let newestTimestamp = 0;

        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.ANALYSIS_CACHE_KEY_PREFIX)) {
                    const value = localStorage.getItem(key);
                    totalCount++;
                    totalSize += value.length * 2;
                    
                    try {
                        const cached = JSON.parse(value);
                        if (cached.timestamp < oldestTimestamp) {
                            oldestTimestamp = cached.timestamp;
                        }
                        if (cached.timestamp > newestTimestamp) {
                            newestTimestamp = cached.timestamp;
                        }
                    } catch (e) {
                        // 忽略解析错误
                    }
                }
            }
        } catch (error) {
            console.error('❌ 获取解读缓存统计失败:', error);
        }

        return {
            totalCount,
            totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
            oldestCache: oldestTimestamp < Date.now() ? new Date(oldestTimestamp).toLocaleString('zh-CN') : '无',
            newestCache: newestTimestamp > 0 ? new Date(newestTimestamp).toLocaleString('zh-CN') : '无'
        };
    },

    /**
     * 触发解读缓存更新事件（用于跨窗口通信）
     * @param {string} patentNumber - 专利号
     * @param {Object} cacheData - 缓存数据
     */
    dispatchAnalysisUpdate(patentNumber, cacheData) {
        try {
            const event = new CustomEvent('patentAnalysisCacheUpdated', {
                detail: {
                    patentNumber: patentNumber.toUpperCase(),
                    cacheData: cacheData
                }
            });
            window.dispatchEvent(event);
            
            localStorage.setItem('patent_analysis_update_signal', JSON.stringify({
                patentNumber: patentNumber.toUpperCase(),
                timestamp: Date.now()
            }));
        } catch (error) {
            console.error('❌ 触发解读缓存更新事件失败:', error);
        }
    }
};

// 页面加载时自动清理过期缓存
window.addEventListener('DOMContentLoaded', () => {
    PatentCache.cleanExpiredCache();
});

// 导出模块
window.PatentCache = PatentCache;