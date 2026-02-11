// js/modules/patent-batch/patent-cache.js
// 专利数据缓存管理模块

const PatentCache = {
    // 缓存键前缀
    CACHE_KEY_PREFIX: 'patent_cache_',
    // 缓存过期时间（30天，单位：毫秒）
    CACHE_EXPIRY: 30 * 24 * 60 * 60 * 1000,
    // 警告阈值（7天，单位：毫秒）
    CACHE_WARNING_THRESHOLD: 7 * 24 * 60 * 60 * 1000,

    /**
     * 获取缓存键
     * @param {string} patentNumber - 专利号
     * @returns {string} 缓存键
     */
    getCacheKey(patentNumber) {
        return `${this.CACHE_KEY_PREFIX}${patentNumber.toUpperCase()}`;
    },

    /**
     * 保存专利数据到缓存
     * @param {string} patentNumber - 专利号
     * @param {Object} data - 专利数据
     * @param {Array} selectedFields - 选择的字段列表
     */
    save(patentNumber, data, selectedFields = []) {
        try {
            const cacheData = {
                patentNumber: patentNumber.toUpperCase(),
                data: data,
                timestamp: Date.now(),
                selectedFields: selectedFields,
                version: '1.0'
            };
            localStorage.setItem(this.getCacheKey(patentNumber), JSON.stringify(cacheData));
            console.log(`✅ 专利 ${patentNumber} 数据已缓存`);
        } catch (error) {
            console.error(`❌ 缓存专利 ${patentNumber} 数据失败:`, error);
            // 如果存储失败（可能是空间不足），尝试清理旧缓存
            this.cleanExpiredCache();
        }
    },

    /**
     * 从缓存获取专利数据
     * @param {string} patentNumber - 专利号
     * @returns {Object|null} 缓存数据或null
     */
    get(patentNumber) {
        try {
            const cacheKey = this.getCacheKey(patentNumber);
            const cached = localStorage.getItem(cacheKey);
            if (!cached) return null;

            const cacheData = JSON.parse(cached);
            
            // 检查是否过期
            if (Date.now() - cacheData.timestamp > this.CACHE_EXPIRY) {
                console.log(`🗑️ 专利 ${patentNumber} 缓存已过期，自动清理`);
                localStorage.removeItem(cacheKey);
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
     * 删除指定专利的缓存
     * @param {string} patentNumber - 专利号
     */
    remove(patentNumber) {
        try {
            localStorage.removeItem(this.getCacheKey(patentNumber));
            console.log(`🗑️ 专利 ${patentNumber} 缓存已删除`);
        } catch (error) {
            console.error(`❌ 删除专利 ${patentNumber} 缓存失败:`, error);
        }
    },

    /**
     * 清理所有过期的缓存
     * @returns {number} 清理的缓存数量
     */
    cleanExpiredCache() {
        let cleanedCount = 0;
        const now = Date.now();
        
        try {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.CACHE_KEY_PREFIX)) {
                    try {
                        const cached = JSON.parse(localStorage.getItem(key));
                        if (now - cached.timestamp > this.CACHE_EXPIRY) {
                            localStorage.removeItem(key);
                            cleanedCount++;
                        }
                    } catch (e) {
                        // 如果解析失败，删除这个键
                        localStorage.removeItem(key);
                        cleanedCount++;
                    }
                }
            }
        } catch (error) {
            console.error('❌ 清理过期缓存失败:', error);
        }

        if (cleanedCount > 0) {
            console.log(`🧹 已清理 ${cleanedCount} 个过期缓存`);
        }
        return cleanedCount;
    },

    /**
     * 清理所有专利缓存
     * @returns {number} 清理的缓存数量
     */
    clearAll() {
        let clearedCount = 0;
        
        try {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.CACHE_KEY_PREFIX)) {
                    localStorage.removeItem(key);
                    clearedCount++;
                }
            }
        } catch (error) {
            console.error('❌ 清理所有缓存失败:', error);
        }

        console.log(`🧹 已清理 ${clearedCount} 个专利缓存`);
        return clearedCount;
    },

    /**
     * 获取缓存统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        let totalCount = 0;
        let totalSize = 0;
        let oldestTimestamp = Date.now();
        let newestTimestamp = 0;

        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.CACHE_KEY_PREFIX)) {
                    const value = localStorage.getItem(key);
                    totalCount++;
                    totalSize += value.length * 2; // UTF-16 编码，每个字符2字节
                    
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
    }
};

// 页面加载时自动清理过期缓存
window.addEventListener('DOMContentLoaded', () => {
    PatentCache.cleanExpiredCache();
});

// 导出模块
window.PatentCache = PatentCache;