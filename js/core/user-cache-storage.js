/**
 * 用户缓存存储层
 * 封装 localStorage 操作，实现用户数据隔离
 * 
 * 所有数据存储格式: user_{username}_{key}
 */

class UserCacheStorage {
    constructor() {
        this._username = null;
        this._prefix = null;
        this._initialized = false;
    }

    /**
     * 初始化存储层
     * @param {string} username - 当前登录用户名
     */
    init(username) {
        if (!username || typeof username !== 'string') {
            console.error('[UserCacheStorage] 初始化失败: 用户名无效');
            return false;
        }
        
        this._username = username;
        this._prefix = `user_${username}_`;
        this._initialized = true;
        
        console.log(`[UserCacheStorage] 已初始化，用户: ${username}`);
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
     * 生成带用户前缀的键名
     * @param {string} key - 原始键名
     * @returns {string} 带前缀的键名
     */
    getKey(key) {
        if (!this._initialized) {
            console.warn('[UserCacheStorage] 未初始化，返回原始键名');
            return key;
        }
        return `${this._prefix}${key}`;
    }

    /**
     * 获取数据
     * @param {string} key - 键名
     * @returns {string|null} 数据或null
     */
    get(key) {
        try {
            return localStorage.getItem(this.getKey(key));
        } catch (e) {
            console.error(`[UserCacheStorage] 读取失败: ${key}`, e);
            return null;
        }
    }

    /**
     * 获取并解析JSON数据
     * @param {string} key - 键名
     * @param {*} defaultValue - 解析失败时的默认值
     * @returns {*} 解析后的数据
     */
    getJSON(key, defaultValue = null) {
        try {
            const data = this.get(key);
            if (data === null) return defaultValue;
            return JSON.parse(data);
        } catch (e) {
            console.error(`[UserCacheStorage] JSON解析失败: ${key}`, e);
            return defaultValue;
        }
    }

    /**
     * 存储数据
     * @param {string} key - 键名
     * @param {string} value - 数据
     */
    set(key, value) {
        try {
            localStorage.setItem(this.getKey(key), value);
            return true;
        } catch (e) {
            console.error(`[UserCacheStorage] 存储失败: ${key}`, e);
            return false;
        }
    }

    /**
     * 存储JSON数据
     * @param {string} key - 键名
     * @param {*} value - 数据对象
     */
    setJSON(key, value) {
        try {
            return this.set(key, JSON.stringify(value));
        } catch (e) {
            console.error(`[UserCacheStorage] JSON序列化失败: ${key}`, e);
            return false;
        }
    }

    /**
     * 删除数据
     * @param {string} key - 键名
     */
    remove(key) {
        try {
            localStorage.removeItem(this.getKey(key));
            return true;
        } catch (e) {
            console.error(`[UserCacheStorage] 删除失败: ${key}`, e);
            return false;
        }
    }

    /**
     * 检查键是否存在
     * @param {string} key - 键名
     */
    has(key) {
        return this.get(key) !== null;
    }

    /**
     * 获取当前用户的所有键名（不含前缀）
     * @returns {string[]} 键名列表
     */
    getAllKeys() {
        const keys = [];
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const fullKey = localStorage.key(i);
                if (fullKey && fullKey.startsWith(this._prefix)) {
                    keys.push(fullKey.substring(this._prefix.length));
                }
            }
        } catch (e) {
            console.error('[UserCacheStorage] 获取键列表失败', e);
        }
        return keys;
    }

    /**
     * 获取当前用户的所有数据
     * @returns {Object} 数据对象 {key: value}
     */
    getAllData() {
        const data = {};
        const keys = this.getAllKeys();
        keys.forEach(key => {
            data[key] = this.get(key);
        });
        return data;
    }

    /**
     * 获取当前用户的所有JSON数据
     * @returns {Object} 数据对象 {key: parsedValue}
     */
    getAllJSONData() {
        const data = {};
        const keys = this.getAllKeys();
        keys.forEach(key => {
            data[key] = this.getJSON(key);
        });
        return data;
    }

    /**
     * 清除当前用户的所有数据
     * @returns {number} 清除的数据条数
     */
    clearUserData() {
        const keys = this.getAllKeys();
        let count = 0;
        keys.forEach(key => {
            if (this.remove(key)) {
                count++;
            }
        });
        console.log(`[UserCacheStorage] 已清除 ${count} 条用户数据`);
        return count;
    }

    /**
     * 获取当前用户数据大小统计
     * @returns {Object} 统计信息
     */
    getStorageStats() {
        const keys = this.getAllKeys();
        let totalSize = 0;
        const itemStats = {};

        keys.forEach(key => {
            const value = this.get(key);
            const size = value ? value.length * 2 : 0; // UTF-16 编码
            totalSize += size;
            itemStats[key] = {
                size: size,
                sizeFormatted: this._formatSize(size)
            };
        });

        return {
            username: this._username,
            totalItems: keys.length,
            totalSize: totalSize,
            totalSizeFormatted: this._formatSize(totalSize),
            items: itemStats,
            keys: keys
        };
    }

    /**
     * 格式化大小显示
     * @param {number} bytes - 字节数
     * @returns {string} 格式化字符串
     */
    _formatSize(bytes) {
        if (bytes < 1024) {
            return `${bytes} B`;
        } else if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(2)} KB`;
        } else {
            return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        }
    }

    /**
     * 批量设置数据
     * @param {Object} data - 数据对象 {key: value}
     */
    setBatch(data) {
        let success = 0;
        let failed = 0;
        Object.entries(data).forEach(([key, value]) => {
            if (this.set(key, value)) {
                success++;
            } else {
                failed++;
            }
        });
        return { success, failed };
    }

    /**
     * 批量设置JSON数据
     * @param {Object} data - 数据对象 {key: value}
     */
    setJSONBatch(data) {
        let success = 0;
        let failed = 0;
        Object.entries(data).forEach(([key, value]) => {
            if (this.setJSON(key, value)) {
                success++;
            } else {
                failed++;
            }
        });
        return { success, failed };
    }

    /**
     * 重置存储层（登出时调用）
     */
    reset() {
        this._username = null;
        this._prefix = null;
        this._initialized = false;
        console.log('[UserCacheStorage] 已重置');
    }

    /**
     * 检查特定前缀的键是否存在（用于缓存键前缀匹配）
     * @param {string} keyPrefix - 键前缀
     * @returns {string[]} 匹配的键名列表
     */
    getKeysByPrefix(keyPrefix) {
        const allKeys = this.getAllKeys();
        return allKeys.filter(key => key.startsWith(keyPrefix));
    }

    /**
     * 获取特定前缀的所有数据
     * @param {string} keyPrefix - 键前缀
     * @returns {Object} 数据对象
     */
    getDataByPrefix(keyPrefix) {
        const keys = this.getKeysByPrefix(keyPrefix);
        const data = {};
        keys.forEach(key => {
            data[key] = this.getJSON(key);
        });
        return data;
    }

    /**
     * 删除特定前缀的所有数据
     * @param {string} keyPrefix - 键前缀
     * @returns {number} 删除的数据条数
     */
    removeByPrefix(keyPrefix) {
        const keys = this.getKeysByPrefix(keyPrefix);
        let count = 0;
        keys.forEach(key => {
            if (this.remove(key)) {
                count++;
            }
        });
        return count;
    }
}

// 创建全局单例
const userCacheStorage = new UserCacheStorage();

// 导出
window.UserCacheStorage = UserCacheStorage;
window.userCacheStorage = userCacheStorage;

console.log('[UserCacheStorage] 模块已加载');
