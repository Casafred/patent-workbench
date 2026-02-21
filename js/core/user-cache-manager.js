/**
 * 用户缓存管理器
 * 统一入口，协调存储、导出、导入、合并模块
 */

class UserCacheManager {
    constructor() {
        this._initialized = false;
        this._username = null;
        this._eventListeners = {};
        
        // 数据类型定义
        this.DATA_TYPES = {
            CHAT_CONVERSATIONS: {
                key: 'chatConversations',
                name: '对话历史',
                category: 'chat',
                exportable: true,
                hasTimestamp: true
            },
            CHAT_PERSONAS: {
                key: 'chatPersonas',
                name: '自定义角色',
                category: 'chat',
                exportable: true,
                hasTimestamp: true
            },
            CHAT_CURRENT_ID: {
                key: 'currentConversationId',
                name: '当前对话ID',
                category: 'chat',
                exportable: true,
                hasTimestamp: false
            },
            CHAT_FILE_CACHE: {
                key: 'parsedFilesCache',
                name: '文件解析缓存',
                category: 'chat',
                exportable: true,
                hasTimestamp: true
            },
            PATENT_CACHE: {
                key: 'patent_cache_',
                name: '专利数据缓存',
                category: 'patentBatch',
                exportable: true,
                hasTimestamp: true,
                isPrefix: true
            },
            PATENT_ANALYSIS: {
                key: 'patent_analysis_',
                name: '解读结果缓存',
                category: 'patentBatch',
                exportable: true,
                hasTimestamp: true,
                isPrefix: true
            },
            PATENT_HISTORY: {
                key: 'patent_crawl_history',
                name: '专利爬取历史',
                category: 'patentBatch',
                exportable: true,
                hasTimestamp: true
            },
            PATENT_TEMPLATES: {
                key: 'patent_batch_custom_templates',
                name: '专利解读模板',
                category: 'patentBatch',
                exportable: true,
                hasTimestamp: true
            },
            LARGE_BATCH_TEMPLATES: {
                key: 'large_batch_custom_templates',
                name: '大批量处理模板',
                category: 'largeBatch',
                exportable: true,
                hasTimestamp: true
            },
            DRAWING_OCR_CACHE: {
                key: 'drawing_ocr_cache',
                name: '附图OCR缓存',
                category: 'drawingMarker',
                exportable: true,
                hasTimestamp: true
            },
            PDF_OCR_CACHE: {
                key: 'pdf_ocr_cache_',
                name: 'PDF OCR缓存',
                category: 'pdfOCR',
                exportable: true,
                hasTimestamp: true,
                isPrefix: true
            },
            PDF_OCR_META: {
                key: 'pdf_ocr_cache_meta',
                name: 'PDF OCR元数据',
                category: 'pdfOCR',
                exportable: true,
                hasTimestamp: true
            }
        };
    }

    /**
     * 初始化管理器
     * @param {string} username - 当前登录用户名
     */
    init(username) {
        if (!username) {
            console.error('[UserCacheManager] 初始化失败: 用户名无效');
            return false;
        }

        this._username = username;
        
        // 初始化存储层
        if (!window.userCacheStorage.init(username)) {
            return false;
        }

        this._initialized = true;
        
        // 触发初始化事件
        this._emit('initialized', { username });
        
        console.log(`[UserCacheManager] 已初始化，用户: ${username}`);
        return true;
    }

    /**
     * 检查是否已初始化
     */
    isInitialized() {
        return this._initialized;
    }

    /**
     * 获取当前用户名
     */
    getUsername() {
        return this._username;
    }

    /**
     * 获取存储层实例
     */
    getStorage() {
        return window.userCacheStorage;
    }

    // =================================================================================
    // 数据存取代理方法
    // =================================================================================

    /**
     * 获取数据
     */
    get(key) {
        return this.getStorage().get(key);
    }

    /**
     * 获取JSON数据
     */
    getJSON(key, defaultValue = null) {
        return this.getStorage().getJSON(key, defaultValue);
    }

    /**
     * 存储数据
     */
    set(key, value) {
        const result = this.getStorage().set(key, value);
        if (result) {
            this._emit('dataChanged', { key, action: 'set' });
        }
        return result;
    }

    /**
     * 存储JSON数据
     */
    setJSON(key, value) {
        const result = this.getStorage().setJSON(key, value);
        if (result) {
            this._emit('dataChanged', { key, action: 'set' });
        }
        return result;
    }

    /**
     * 删除数据
     */
    remove(key) {
        const result = this.getStorage().remove(key);
        if (result) {
            this._emit('dataChanged', { key, action: 'remove' });
        }
        return result;
    }

    /**
     * 检查键是否存在
     */
    has(key) {
        return this.getStorage().has(key);
    }

    // =================================================================================
    // 数据收集方法
    // =================================================================================

    /**
     * 收集指定类型的数据
     * @param {string} typeKey - 数据类型键
     * @returns {Object} 收集的数据
     */
    collectDataType(typeKey) {
        const type = this.DATA_TYPES[typeKey];
        if (!type) {
            console.warn(`[UserCacheManager] 未知数据类型: ${typeKey}`);
            return null;
        }

        if (type.isPrefix) {
            return this.getStorage().getDataByPrefix(type.key);
        } else {
            const data = this.getJSON(type.key);
            return data !== null ? { [type.key]: data } : null;
        }
    }

    /**
     * 收集所有用户数据
     * @param {Object} options - 选项
     * @param {string[]} options.include - 包含的数据类型
     * @param {string[]} options.exclude - 排除的数据类型
     */
    collectAllData(options = {}) {
        const { include = null, exclude = [] } = options;
        const data = {};
        const stats = {
            categories: {},
            totalItems: 0,
            totalSize: 0
        };

        Object.entries(this.DATA_TYPES).forEach(([typeKey, type]) => {
            // 检查是否在排除列表
            if (exclude.includes(typeKey)) {
                return;
            }

            // 检查是否在包含列表（如果指定了）
            if (include && !include.includes(typeKey)) {
                return;
            }

            // 收集数据
            const collected = this.collectDataType(typeKey);
            if (collected && Object.keys(collected).length > 0) {
                // 合并到对应分类
                if (!stats.categories[type.category]) {
                    stats.categories[type.category] = {
                        name: type.category,
                        items: 0,
                        size: 0
                    };
                    data[type.category] = {};
                }

                Object.assign(data[type.category], collected);

                const itemCount = Object.keys(collected).length;
                stats.categories[type.category].items += itemCount;
                stats.totalItems += itemCount;

                // 计算大小
                const size = JSON.stringify(collected).length * 2;
                stats.categories[type.category].size += size;
                stats.totalSize += size;
            }
        });

        return { data, stats };
    }

    // =================================================================================
    // 统计方法
    // =================================================================================

    /**
     * 获取数据统计
     */
    getStats() {
        const storageStats = this.getStorage().getStorageStats();
        const typeStats = {};

        Object.entries(this.DATA_TYPES).forEach(([typeKey, type]) => {
            if (type.isPrefix) {
                const keys = this.getStorage().getKeysByPrefix(type.key);
                if (keys.length > 0) {
                    typeStats[typeKey] = {
                        name: type.name,
                        count: keys.length,
                        keys: keys
                    };
                }
            } else {
                if (this.has(type.key)) {
                    typeStats[typeKey] = {
                        name: type.name,
                        count: 1,
                        keys: [type.key]
                    };
                }
            }
        });

        return {
            ...storageStats,
            typeStats
        };
    }

    /**
     * 获取分类统计
     */
    getCategoryStats() {
        const categories = {
            chat: { name: '即时对话', items: 0, size: 0 },
            patentBatch: { name: '批量专利解读', items: 0, size: 0 },
            largeBatch: { name: '大批量处理', items: 0, size: 0 },
            drawingMarker: { name: '附图标记', items: 0, size: 0 },
            pdfOCR: { name: 'PDF OCR', items: 0, size: 0 }
        };

        Object.entries(this.DATA_TYPES).forEach(([typeKey, type]) => {
            const category = categories[type.category];
            if (!category) return;

            if (type.isPrefix) {
                const keys = this.getStorage().getKeysByPrefix(type.key);
                category.items += keys.length;
                keys.forEach(key => {
                    const value = this.get(key);
                    if (value) {
                        category.size += value.length * 2;
                    }
                });
            } else {
                if (this.has(type.key)) {
                    category.items++;
                    const value = this.get(type.key);
                    if (value) {
                        category.size += value.length * 2;
                    }
                }
            }
        });

        return categories;
    }

    // =================================================================================
    // 清理方法
    // =================================================================================

    /**
     * 清除指定类型的数据
     * @param {string} typeKey - 数据类型键
     */
    clearDataType(typeKey) {
        const type = this.DATA_TYPES[typeKey];
        if (!type) {
            console.warn(`[UserCacheManager] 未知数据类型: ${typeKey}`);
            return 0;
        }

        let count = 0;
        if (type.isPrefix) {
            count = this.getStorage().removeByPrefix(type.key);
        } else {
            if (this.remove(type.key)) {
                count = 1;
            }
        }

        this._emit('dataCleared', { typeKey, count });
        return count;
    }

    /**
     * 清除所有用户数据
     */
    clearAllData() {
        const count = this.getStorage().clearUserData();
        this._emit('allDataCleared', { count });
        return count;
    }

    /**
     * 重置管理器（登出时调用）
     */
    reset() {
        this.getStorage().reset();
        this._username = null;
        this._initialized = false;
        this._emit('reset');
        console.log('[UserCacheManager] 已重置');
    }

    // =================================================================================
    // 事件系统
    // =================================================================================

    /**
     * 添加事件监听
     * @param {string} event - 事件名
     * @param {Function} callback - 回调函数
     */
    on(event, callback) {
        if (!this._eventListeners[event]) {
            this._eventListeners[event] = [];
        }
        this._eventListeners[event].push(callback);
    }

    /**
     * 移除事件监听
     * @param {string} event - 事件名
     * @param {Function} callback - 回调函数
     */
    off(event, callback) {
        if (!this._eventListeners[event]) return;
        this._eventListeners[event] = this._eventListeners[event].filter(cb => cb !== callback);
    }

    /**
     * 触发事件
     * @param {string} event - 事件名
     * @param {*} data - 事件数据
     */
    _emit(event, data = null) {
        if (!this._eventListeners[event]) return;
        this._eventListeners[event].forEach(callback => {
            try {
                callback(data);
            } catch (e) {
                console.error(`[UserCacheManager] 事件处理错误: ${event}`, e);
            }
        });
    }

    // =================================================================================
    // 工具方法
    // =================================================================================

    /**
     * 获取数据类型定义
     */
    getDataTypes() {
        return { ...this.DATA_TYPES };
    }

    /**
     * 获取可导出的数据类型列表
     */
    getExportableTypes() {
        return Object.entries(this.DATA_TYPES)
            .filter(([_, type]) => type.exportable)
            .map(([key, type]) => ({
                key,
                name: type.name,
                category: type.category,
                hasTimestamp: type.hasTimestamp,
                isPrefix: type.isPrefix || false
            }));
    }

    /**
     * 格式化大小
     */
    formatSize(bytes) {
        return this.getStorage()._formatSize(bytes);
    }
}

// 创建全局单例
const userCacheManager = new UserCacheManager();

// 导出
window.UserCacheManager = UserCacheManager;
window.userCacheManager = userCacheManager;

console.log('[UserCacheManager] 模块已加载');
