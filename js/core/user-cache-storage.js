/**
 * 用户缓存存储层
 * 封装 IndexedDB 操作，实现用户数据隔离
 * 
 * 所有数据存储格式: user_{username}_{key}
 * 
 * v2.0 - 使用 IndexedDB 替代 localStorage
 * - 容量大（250MB+）
 * - 支持过期时间
 * - 自动清理旧数据
 */

class UserCacheStorage {
    constructor() {
        this._username = null;
        this._prefix = null;
        this._initialized = false;
        this._useIndexedDB = true;
        this._ready = false;
        this._syncFallback = {};
    }

    async init(username) {
        if (!username || typeof username !== 'string') {
            console.error('[UserCacheStorage] 初始化失败: 用户名无效');
            return false;
        }
        
        this._username = username;
        this._prefix = `user_${username}_`;

        if (this._useIndexedDB && window.indexedDBStorage) {
            const success = await window.indexedDBStorage.init(username);
            if (success) {
                this._initialized = true;
                this._ready = true;
                
                await this._migrateFromLocalStorage();
                
                console.log(`[UserCacheStorage] 已初始化 (IndexedDB)，用户: ${username}`);
                return true;
            }
        }

        console.warn('[UserCacheStorage] IndexedDB 不可用，回退到 localStorage');
        this._useIndexedDB = false;
        this._initialized = true;
        this._ready = true;
        console.log(`[UserCacheStorage] 已初始化 (localStorage)，用户: ${username}`);
        return true;
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

    async get(key) {
        if (this._useIndexedDB && window.indexedDBStorage && window.indexedDBStorage.isInitialized()) {
            return await window.indexedDBStorage.get(key);
        }
        try {
            return localStorage.getItem(this.getKey(key));
        } catch (e) {
            console.error(`[UserCacheStorage] 读取失败: ${key}`, e);
            return null;
        }
    }

    getSync(key) {
        if (this._useIndexedDB && window.indexedDBStorage && window.indexedDBStorage.isInitialized()) {
            const cached = this._syncFallback[key];
            if (cached !== undefined) return cached;
            return null;
        }
        try {
            return localStorage.getItem(this.getKey(key));
        } catch (e) {
            console.error(`[UserCacheStorage] 读取失败: ${key}`, e);
            return null;
        }
    }

    async getJSON(key, defaultValue = null) {
        try {
            const data = await this.get(key);
            if (data === null) return defaultValue;
            return JSON.parse(data);
        } catch (e) {
            console.error(`[UserCacheStorage] JSON解析失败: ${key}`, e);
            return defaultValue;
        }
    }

    getJSONSync(key, defaultValue = null) {
        try {
            const data = this.getSync(key);
            if (data === null) return defaultValue;
            return JSON.parse(data);
        } catch (e) {
            console.error(`[UserCacheStorage] JSON解析失败: ${key}`, e);
            return defaultValue;
        }
    }

    async set(key, value, options = {}) {
        if (this._useIndexedDB && window.indexedDBStorage && window.indexedDBStorage.isInitialized()) {
            this._syncFallback[key] = value;
            return await window.indexedDBStorage.set(key, value, options);
        }
        try {
            localStorage.setItem(this.getKey(key), value);
            return true;
        } catch (e) {
            console.error(`[UserCacheStorage] 存储失败: ${key}`, e);
            if (e.name === 'QuotaExceededError') {
                this._handleQuotaExceeded();
            }
            return false;
        }
    }

    setSync(key, value) {
        if (this._useIndexedDB && window.indexedDBStorage && window.indexedDBStorage.isInitialized()) {
            this._syncFallback[key] = value;
            window.indexedDBStorage.set(key, value).catch(() => {});
            return true;
        }
        try {
            localStorage.setItem(this.getKey(key), value);
            return true;
        } catch (e) {
            console.error(`[UserCacheStorage] 存储失败: ${key}`, e);
            if (e.name === 'QuotaExceededError') {
                this._handleQuotaExceeded();
            }
            return false;
        }
    }

    async setJSON(key, value, options = {}) {
        try {
            const jsonStr = JSON.stringify(value);
            return await this.set(key, jsonStr, options);
        } catch (e) {
            console.error(`[UserCacheStorage] JSON序列化失败: ${key}`, e);
            return false;
        }
    }

    setJSONSync(key, value) {
        try {
            const jsonStr = JSON.stringify(value);
            return this.setSync(key, jsonStr);
        } catch (e) {
            console.error(`[UserCacheStorage] JSON序列化失败: ${key}`, e);
            return false;
        }
    }

    async remove(key) {
        if (this._useIndexedDB && window.indexedDBStorage && window.indexedDBStorage.isInitialized()) {
            delete this._syncFallback[key];
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

    removeSync(key) {
        if (this._useIndexedDB && window.indexedDBStorage && window.indexedDBStorage.isInitialized()) {
            delete this._syncFallback[key];
            window.indexedDBStorage.remove(key).catch(() => {});
            return true;
        }
        try {
            localStorage.removeItem(this.getKey(key));
            return true;
        } catch (e) {
            console.error(`[UserCacheStorage] 删除失败: ${key}`, e);
            return false;
        }
    }

    async has(key) {
        const data = await this.get(key);
        return data !== null;
    }

    hasSync(key) {
        if (this._useIndexedDB && window.indexedDBStorage && window.indexedDBStorage.isInitialized()) {
            return this._syncFallback[key] !== undefined;
        }
        return localStorage.getItem(this.getKey(key)) !== null;
    }

    async getAllKeys() {
        if (this._useIndexedDB && window.indexedDBStorage && window.indexedDBStorage.isInitialized()) {
            return await window.indexedDBStorage.getAllKeys();
        }
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

    getAllKeysSync() {
        if (this._useIndexedDB && window.indexedDBStorage && window.indexedDBStorage.isInitialized()) {
            return Object.keys(this._syncFallback);
        }
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

    async getAllData() {
        if (this._useIndexedDB && window.indexedDBStorage && window.indexedDBStorage.isInitialized()) {
            return await window.indexedDBStorage.getAllData();
        }
        const data = {};
        const keys = this.getAllKeysSync();
        for (const key of keys) {
            data[key] = localStorage.getItem(this.getKey(key));
        }
        return data;
    }

    async getAllJSONData() {
        if (this._useIndexedDB && window.indexedDBStorage && window.indexedDBStorage.isInitialized()) {
            return await window.indexedDBStorage.getAllJSONData();
        }
        const data = {};
        const keys = this.getAllKeysSync();
        for (const key of keys) {
            data[key] = this.getJSONSync(key);
        }
        return data;
    }

    async clearUserData() {
        if (this._useIndexedDB && window.indexedDBStorage && window.indexedDBStorage.isInitialized()) {
            this._syncFallback = {};
            return await window.indexedDBStorage.clearUserData();
        }
        const keys = this.getAllKeysSync();
        let count = 0;
        for (const key of keys) {
            if (this.removeSync(key)) {
                count++;
            }
        }
        console.log(`[UserCacheStorage] 已清除 ${count} 条用户数据`);
        return count;
    }

    async getStorageStats() {
        if (this._useIndexedDB && window.indexedDBStorage && window.indexedDBStorage.isInitialized()) {
            return await window.indexedDBStorage.getStorageStats();
        }
        const keys = this.getAllKeysSync();
        let totalSize = 0;
        const itemStats = {};

        keys.forEach(key => {
            const value = localStorage.getItem(this.getKey(key));
            const size = value ? value.length * 2 : 0;
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

    _formatSize(bytes) {
        if (bytes < 1024) {
            return `${bytes} B`;
        } else if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(2)} KB`;
        } else {
            return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        }
    }

    async setBatch(data, options = {}) {
        if (this._useIndexedDB && window.indexedDBStorage && window.indexedDBStorage.isInitialized()) {
            Object.assign(this._syncFallback, data);
            return await window.indexedDBStorage.setBatch(data, options);
        }
        let success = 0;
        let failed = 0;
        for (const [key, value] of Object.entries(data)) {
            if (this.setSync(key, value)) {
                success++;
            } else {
                failed++;
            }
        }
        return { success, failed };
    }

    async setJSONBatch(data, options = {}) {
        if (this._useIndexedDB && window.indexedDBStorage && window.indexedDBStorage.isInitialized()) {
            for (const [key, value] of Object.entries(data)) {
                this._syncFallback[key] = JSON.stringify(value);
            }
            return await window.indexedDBStorage.setJSONBatch(data, options);
        }
        let success = 0;
        let failed = 0;
        for (const [key, value] of Object.entries(data)) {
            if (this.setJSONSync(key, value)) {
                success++;
            } else {
                failed++;
            }
        }
        return { success, failed };
    }

    reset() {
        if (this._useIndexedDB && window.indexedDBStorage) {
            window.indexedDBStorage.reset();
        }
        this._syncFallback = {};
        this._username = null;
        this._prefix = null;
        this._initialized = false;
        this._ready = false;
        console.log('[UserCacheStorage] 已重置');
    }

    async getKeysByPrefix(keyPrefix) {
        if (this._useIndexedDB && window.indexedDBStorage && window.indexedDBStorage.isInitialized()) {
            return await window.indexedDBStorage.getKeysByPrefix(keyPrefix);
        }
        const allKeys = this.getAllKeysSync();
        return allKeys.filter(key => key.startsWith(keyPrefix));
    }

    getKeysByPrefixSync(keyPrefix) {
        if (this._useIndexedDB && window.indexedDBStorage && window.indexedDBStorage.isInitialized()) {
            return Object.keys(this._syncFallback).filter(key => key.startsWith(keyPrefix));
        }
        const allKeys = this.getAllKeysSync();
        return allKeys.filter(key => key.startsWith(keyPrefix));
    }

    async getDataByPrefix(keyPrefix) {
        if (this._useIndexedDB && window.indexedDBStorage && window.indexedDBStorage.isInitialized()) {
            return await window.indexedDBStorage.getDataByPrefix(keyPrefix);
        }
        const keys = this.getKeysByPrefixSync(keyPrefix);
        const data = {};
        for (const key of keys) {
            data[key] = this.getJSONSync(key);
        }
        return data;
    }

    async removeByPrefix(keyPrefix) {
        if (this._useIndexedDB && window.indexedDBStorage && window.indexedDBStorage.isInitialized()) {
            const keys = Object.keys(this._syncFallback).filter(k => k.startsWith(keyPrefix));
            keys.forEach(k => delete this._syncFallback[k]);
            return await window.indexedDBStorage.removeByPrefix(keyPrefix);
        }
        const keys = this.getKeysByPrefixSync(keyPrefix);
        let count = 0;
        for (const key of keys) {
            if (this.removeSync(key)) {
                count++;
            }
        }
        return count;
    }

    _handleQuotaExceeded() {
        console.warn('[UserCacheStorage] localStorage 配额已满，建议清理数据');
        window.dispatchEvent(new CustomEvent('storage:quotaExceeded', {
            detail: { storage: 'localStorage' }
        }));
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
