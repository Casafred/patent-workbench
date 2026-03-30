/**
 * 用户缓存存储层
 * 封装 IndexedDB 操作，实现用户数据隔离
 * 
 * 所有数据存储格式: user_{username}_{key}
 * 
 * v2.1 - 使用 IndexedDB + 内存缓存
 * - 初始化时预加载数据到内存
 * - 提供完全同步的 API
 * - 后台异步持久化到 IndexedDB
 */

class UserCacheStorage {
    constructor() {
        this._username = null;
        this._prefix = null;
        this._initialized = false;
        this._useIndexedDB = true;
        this._memoryCache = {};
        this._pendingWrites = [];
        this._writeInProgress = false;
    }

    async init(username) {
        if (!username || typeof username !== 'string') {
            console.error('[UserCacheStorage] 初始化失败: 用户名无效');
            return false;
        }
        
        this._username = username;
        this._prefix = `user_${username}_`;

        if (this._useIndexedDB && window.indexedDBStorage) {
            try {
                const success = await window.indexedDBStorage.init(username);
                if (success) {
                    await this._loadAllToMemory();
                    await this._migrateFromLocalStorage();
                    this._initialized = true;
                    console.log(`[UserCacheStorage] 已初始化 (IndexedDB)，用户: ${username}`);
                    return true;
                }
            } catch (e) {
                console.error('[UserCacheStorage] IndexedDB 初始化失败:', e);
            }
        }

        console.warn('[UserCacheStorage] IndexedDB 不可用，回退到 localStorage');
        this._useIndexedDB = false;
        this._loadFromLocalStorage();
        this._initialized = true;
        console.log(`[UserCacheStorage] 已初始化 (localStorage)，用户: ${username}`);
        return true;
    }

    async _loadAllToMemory() {
        if (!window.indexedDBStorage || !window.indexedDBStorage.isInitialized()) return;
        
        try {
            const allData = await window.indexedDBStorage.getAllData();
            for (const [key, value] of Object.entries(allData)) {
                this._memoryCache[key] = value;
            }
            console.log(`[UserCacheStorage] 已加载 ${Object.keys(allData).length} 条数据到内存`);
        } catch (e) {
            console.error('[UserCacheStorage] 加载数据到内存失败:', e);
        }
    }

    _loadFromLocalStorage() {
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const fullKey = localStorage.key(i);
                if (fullKey && fullKey.startsWith(this._prefix)) {
                    const shortKey = fullKey.substring(this._prefix.length);
                    const value = localStorage.getItem(fullKey);
                    if (value !== null) {
                        this._memoryCache[shortKey] = value;
                    }
                }
            }
        } catch (e) {
            console.error('[UserCacheStorage] 从 localStorage 加载失败:', e);
        }
    }

    async _migrateFromLocalStorage() {
        if (!this._useIndexedDB || !window.indexedDBStorage) return;

        const migrationKey = `migration_done_${this._username}`;
        const migrated = localStorage.getItem(migrationKey);
        
        if (migrated === 'true') return;

        console.log('[UserCacheStorage] 开始从 localStorage 迁移数据到 IndexedDB...');
        
        let migratedCount = 0;
        const keysToMigrate = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this._prefix)) {
                keysToMigrate.push(key);
            }
        }

        for (const fullKey of keysToMigrate) {
            try {
                const value = localStorage.getItem(fullKey);
                if (value) {
                    const shortKey = fullKey.substring(this._prefix.length);
                    await window.indexedDBStorage.set(shortKey, value);
                    this._memoryCache[shortKey] = value;
                    localStorage.removeItem(fullKey);
                    migratedCount++;
                }
            } catch (e) {
                console.warn(`[UserCacheStorage] 迁移失败: ${fullKey}`, e);
            }
        }

        localStorage.setItem(migrationKey, 'true');
        console.log(`[UserCacheStorage] 迁移完成，共 ${migratedCount} 条数据`);
    }

    isInitialized() {
        return this._initialized;
    }

    getUsername() {
        return this._username;
    }

    getKey(key) {
        if (!this._initialized) {
            return key;
        }
        return `${this._prefix}${key}`;
    }

    get(key) {
        return this._memoryCache[key] !== undefined ? this._memoryCache[key] : null;
    }

    async getAsync(key) {
        if (this._useIndexedDB && window.indexedDBStorage && window.indexedDBStorage.isInitialized()) {
            return await window.indexedDBStorage.get(key);
        }
        return this.get(key);
    }

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

    async getJSONAsync(key, defaultValue = null) {
        try {
            const data = await this.getAsync(key);
            if (data === null) return defaultValue;
            return JSON.parse(data);
        } catch (e) {
            console.error(`[UserCacheStorage] JSON解析失败: ${key}`, e);
            return defaultValue;
        }
    }

    set(key, value, options = {}) {
        this._memoryCache[key] = value;
        this._scheduleWrite(key, value, options);
        return true;
    }

    async setAsync(key, value, options = {}) {
        this._memoryCache[key] = value;
        if (this._useIndexedDB && window.indexedDBStorage && window.indexedDBStorage.isInitialized()) {
            return await window.indexedDBStorage.set(key, value, options);
        }
        try {
            localStorage.setItem(this.getKey(key), value);
            return true;
        } catch (e) {
            console.error(`[UserCacheStorage] 存储失败: ${key}`, e);
            return false;
        }
    }

    setJSON(key, value, options = {}) {
        try {
            const jsonStr = JSON.stringify(value);
            return this.set(key, jsonStr, options);
        } catch (e) {
            console.error(`[UserCacheStorage] JSON序列化失败: ${key}`, e);
            return false;
        }
    }

    async setJSONAsync(key, value, options = {}) {
        try {
            const jsonStr = JSON.stringify(value);
            return await this.setAsync(key, jsonStr, options);
        } catch (e) {
            console.error(`[UserCacheStorage] JSON序列化失败: ${key}`, e);
            return false;
        }
    }

    _scheduleWrite(key, value, options = {}) {
        this._pendingWrites.push({ key, value, options });
        this._processPendingWrites();
    }

    async _processPendingWrites() {
        if (this._writeInProgress || this._pendingWrites.length === 0) return;
        
        this._writeInProgress = true;
        
        while (this._pendingWrites.length > 0) {
            const { key, value, options } = this._pendingWrites.shift();
            try {
                if (this._useIndexedDB && window.indexedDBStorage && window.indexedDBStorage.isInitialized()) {
                    await window.indexedDBStorage.set(key, value, options);
                } else {
                    localStorage.setItem(this.getKey(key), value);
                }
            } catch (e) {
                console.error(`[UserCacheStorage] 异步写入失败: ${key}`, e);
            }
        }
        
        this._writeInProgress = false;
    }

    remove(key) {
        delete this._memoryCache[key];
        this._scheduleRemove(key);
        return true;
    }

    async removeAsync(key) {
        delete this._memoryCache[key];
        if (this._useIndexedDB && window.indexedDBStorage && window.indexedDBStorage.isInitialized()) {
            return await window.indexedDBStorage.remove(key);
        }
        try {
            localStorage.removeItem(this.getKey(key));
            return true;
        } catch (e) {
            console.error(`[UserCacheStorage] 删除失败: ${key}`, e);
            return false;
        }
    }

    _scheduleRemove(key) {
        if (this._useIndexedDB && window.indexedDBStorage && window.indexedDBStorage.isInitialized()) {
            window.indexedDBStorage.remove(key).catch(() => {});
        } else {
            localStorage.removeItem(this.getKey(key));
        }
    }

    has(key) {
        return this._memoryCache[key] !== undefined;
    }

    getAllKeys() {
        return Object.keys(this._memoryCache);
    }

    getAllData() {
        return { ...this._memoryCache };
    }

    getAllJSONData() {
        const data = {};
        for (const [key, value] of Object.entries(this._memoryCache)) {
            try {
                data[key] = JSON.parse(value);
            } catch (e) {
                data[key] = value;
            }
        }
        return data;
    }

    clearUserData() {
        const count = Object.keys(this._memoryCache).length;
        this._memoryCache = {};
        
        if (this._useIndexedDB && window.indexedDBStorage && window.indexedDBStorage.isInitialized()) {
            window.indexedDBStorage.clearUserData().catch(() => {});
        } else {
            const keys = Object.keys(localStorage);
            for (const fullKey of keys) {
                if (fullKey.startsWith(this._prefix)) {
                    localStorage.removeItem(fullKey);
                }
            }
        }
        
        console.log(`[UserCacheStorage] 已清除 ${count} 条用户数据`);
        return count;
    }

    getStorageStats() {
        let totalSize = 0;
        const itemStats = {};

        for (const [key, value] of Object.entries(this._memoryCache)) {
            const size = value ? value.length * 2 : 0;
            totalSize += size;
            itemStats[key] = {
                size: size,
                sizeFormatted: this._formatSize(size)
            };
        }

        return {
            username: this._username,
            totalItems: Object.keys(this._memoryCache).length,
            totalSize: totalSize,
            totalSizeFormatted: this._formatSize(totalSize),
            items: itemStats,
            keys: Object.keys(this._memoryCache)
        };
    }

    _formatSize(bytes) {
        if (bytes < 1024) {
            return `${bytes} B`;
        } else if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(2)} KB`;
        } else {
            return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        }
    }

    setBatch(data, options = {}) {
        for (const [key, value] of Object.entries(data)) {
            this._memoryCache[key] = value;
            this._scheduleWrite(key, value, options);
        }
        return { success: Object.keys(data).length, failed: 0 };
    }

    setJSONBatch(data, options = {}) {
        for (const [key, value] of Object.entries(data)) {
            try {
                const jsonStr = JSON.stringify(value);
                this._memoryCache[key] = jsonStr;
                this._scheduleWrite(key, jsonStr, options);
            } catch (e) {
                console.error(`[UserCacheStorage] JSON序列化失败: ${key}`, e);
            }
        }
        return { success: Object.keys(data).length, failed: 0 };
    }

    reset() {
        this._memoryCache = {};
        this._pendingWrites = [];
        this._writeInProgress = false;
        
        if (this._useIndexedDB && window.indexedDBStorage) {
            window.indexedDBStorage.reset();
        }
        
        this._username = null;
        this._prefix = null;
        this._initialized = false;
        console.log('[UserCacheStorage] 已重置');
    }

    getKeysByPrefix(keyPrefix) {
        return Object.keys(this._memoryCache).filter(key => key.startsWith(keyPrefix));
    }

    getDataByPrefix(keyPrefix) {
        const data = {};
        for (const [key, value] of Object.entries(this._memoryCache)) {
            if (key.startsWith(keyPrefix)) {
                try {
                    data[key] = JSON.parse(value);
                } catch (e) {
                    data[key] = value;
                }
            }
        }
        return data;
    }

    removeByPrefix(keyPrefix) {
        let count = 0;
        const keysToRemove = Object.keys(this._memoryCache).filter(key => key.startsWith(keyPrefix));
        
        for (const key of keysToRemove) {
            delete this._memoryCache[key];
            this._scheduleRemove(key);
            count++;
        }
        
        return count;
    }

    async getQuotaInfo() {
        if (this._useIndexedDB && window.indexedDBStorage) {
            return await window.indexedDBStorage.getQuotaInfo();
        }
        return null;
    }

    async requestPersistentStorage() {
        if (this._useIndexedDB && window.indexedDBStorage) {
            return await window.indexedDBStorage.requestPersistentStorage();
        }
        return false;
    }
}

const userCacheStorage = new UserCacheStorage();

window.UserCacheStorage = UserCacheStorage;
window.userCacheStorage = userCacheStorage;

console.log('[UserCacheStorage] 模块已加载');
