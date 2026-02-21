/**
 * 专利爬取解读历史记录模块 (用户隔离版)
 * 记录用户历史爬取过的专利号，支持一键再次爬取或解读
 */

const PatentHistory = {
    // 历史记录键名
    HISTORY_KEY: 'patent_crawl_history',
    // 最大历史记录数
    MAX_HISTORY: 100,
    
    /**
     * 获取用户隔离存储实例
     */
    _getStorage() {
        return window.userCacheStorage;
    },
    
    /**
     * 获取所有历史记录 (用户隔离)
     * @returns {Array} 历史记录列表
     */
    getAll() {
        try {
            return this._getStorage().getJSON(this.HISTORY_KEY, []);
        } catch (error) {
            console.error('❌ 读取历史记录失败:', error);
            return [];
        }
    },
    
    /**
     * 添加历史记录 (用户隔离)
     * @param {string} patentNumber - 专利号
     * @param {string} action - 操作类型 ('crawl' | 'analyze')
     * @param {Object} options - 附加选项
     */
    add(patentNumber, action = 'crawl', options = {}) {
        try {
            const history = this.getAll();
            const upperNumber = patentNumber.toUpperCase();
            
            const existingIndex = history.findIndex(h => h.patentNumber === upperNumber);
            
            const record = {
                patentNumber: upperNumber,
                action: action,
                timestamp: Date.now(),
                hasCache: window.PatentCache ? window.PatentCache.has(upperNumber) : false,
                hasAnalysis: window.PatentCache ? window.PatentCache.hasAnalysis(upperNumber) : false,
                title: options.title || '',
                source: options.source || ''
            };
            
            if (existingIndex >= 0) {
                history[existingIndex] = record;
            } else {
                history.unshift(record);
            }
            
            if (history.length > this.MAX_HISTORY) {
                history.splice(this.MAX_HISTORY);
            }
            
            this._getStorage().setJSON(this.HISTORY_KEY, history);
            console.log(`✅ 已添加历史记录: ${upperNumber}`);
            
            this.dispatchHistoryUpdate();
        } catch (error) {
            console.error('❌ 添加历史记录失败:', error);
        }
    },
    
    /**
     * 批量添加历史记录
     * @param {Array<string>} patentNumbers - 专利号列表
     * @param {string} action - 操作类型
     */
    addBatch(patentNumbers, action = 'crawl') {
        patentNumbers.forEach(num => {
            this.add(num, action);
        });
    },
    
    /**
     * 删除指定历史记录 (用户隔离)
     * @param {string} patentNumber - 专利号
     */
    remove(patentNumber) {
        try {
            const history = this.getAll();
            const upperNumber = patentNumber.toUpperCase();
            const filtered = history.filter(h => h.patentNumber !== upperNumber);
            this._getStorage().setJSON(this.HISTORY_KEY, filtered);
            this.dispatchHistoryUpdate();
            console.log(`🗑️ 已删除历史记录: ${upperNumber}`);
        } catch (error) {
            console.error('❌ 删除历史记录失败:', error);
        }
    },
    
    /**
     * 清空所有历史记录 (用户隔离)
     */
    clear() {
        try {
            this._getStorage().remove(this.HISTORY_KEY);
            this.dispatchHistoryUpdate();
            console.log('🧹 已清空所有历史记录');
        } catch (error) {
            console.error('❌ 清空历史记录失败:', error);
        }
    },
    
    /**
     * 获取最近的N条记录
     * @param {number} count - 数量
     * @returns {Array} 历史记录列表
     */
    getRecent(count = 10) {
        const history = this.getAll();
        return history.slice(0, count);
    },
    
    /**
     * 搜索历史记录
     * @param {string} keyword - 关键词
     * @returns {Array} 匹配的历史记录
     */
    search(keyword) {
        if (!keyword) return this.getAll();
        const history = this.getAll();
        const lowerKeyword = keyword.toLowerCase();
        return history.filter(h => 
            h.patentNumber.toLowerCase().includes(lowerKeyword) ||
            (h.title && h.title.toLowerCase().includes(lowerKeyword))
        );
    },
    
    /**
     * 获取所有专利号列表
     * @returns {Array<string>} 专利号列表
     */
    getAllPatentNumbers() {
        const history = this.getAll();
        return history.map(h => h.patentNumber);
    },
    
    /**
     * 更新记录的缓存状态 (用户隔离)
     */
    refreshCacheStatus() {
        try {
            const history = this.getAll();
            let updated = false;
            
            history.forEach(record => {
                const hasCache = window.PatentCache ? window.PatentCache.has(record.patentNumber) : false;
                const hasAnalysis = window.PatentCache ? window.PatentCache.hasAnalysis(record.patentNumber) : false;
                
                if (record.hasCache !== hasCache || record.hasAnalysis !== hasAnalysis) {
                    record.hasCache = hasCache;
                    record.hasAnalysis = hasAnalysis;
                    updated = true;
                }
            });
            
            if (updated) {
                this._getStorage().setJSON(this.HISTORY_KEY, history);
                this.dispatchHistoryUpdate();
            }
        } catch (error) {
            console.error('❌ 更新缓存状态失败:', error);
        }
    },
    
    /**
     * 格式化时间显示
     * @param {number} timestamp - 时间戳
     * @returns {string} 格式化后的时间
     */
    formatTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        if (diff < 60 * 1000) {
            return '刚刚';
        } else if (diff < 60 * 60 * 1000) {
            return `${Math.floor(diff / (60 * 1000))}分钟前`;
        } else if (diff < 24 * 60 * 60 * 1000) {
            return `${Math.floor(diff / (60 * 60 * 1000))}小时前`;
        } else if (diff < 7 * 24 * 60 * 60 * 1000) {
            return `${Math.floor(diff / (24 * 60 * 60 * 1000))}天前`;
        } else {
            return new Date(timestamp).toLocaleDateString('zh-CN');
        }
    },
    
    /**
     * 触发历史记录更新事件
     */
    dispatchHistoryUpdate() {
        const event = new CustomEvent('patentHistoryUpdated', {
            detail: { history: this.getAll() }
        });
        window.dispatchEvent(event);
    },
    
    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        const history = this.getAll();
        return {
            total: history.length,
            crawled: history.filter(h => h.action === 'crawl' || h.hasCache).length,
            analyzed: history.filter(h => h.action === 'analyze' || h.hasAnalysis).length,
            withCache: history.filter(h => h.hasCache).length,
            withAnalysis: history.filter(h => h.hasAnalysis).length
        };
    }
};

// 导出到全局
window.PatentHistory = PatentHistory;

console.log('✅ patent-history.js 加载完成');
