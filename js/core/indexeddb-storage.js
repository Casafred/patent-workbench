/**
 * IndexedDB 存储层
 * 解决 localStorage 5MB 限制问题
 * 
 * 特点：
 * - 容量大（250MB+，可请求更多）
 * - 异步操作，不阻塞UI
 * - 支持过期时间和自动清理
 * - 支持存储容量监控
 */

class IndexedDBStorage {
    constructor() {
        this.DB_NAME = 'PatentWorkbenchDB';
        this.DB_VERSION = 1;
        this.STORE_NAME = 'userCache';
        this.META_STORE = 'metaCache';
        
        this._db = null;
        this._username = null;
        this._prefix = '';
        this._initialized = false;
        this._initPromise = null;
        
        this.QUOTA_WARNING_THRESHOLD = 0.8;
        this.QUOTA_CRITICAL_THRESHOLD = 0.95;
        this.DEFAULT_EXPIRY_DAYS = 30;
    }

    async init(username) {
        if (!username || typeof username !== 'string') {
            console.error('[IndexedDBStorage] 初始化失败: 用户名无效');
            return false;
        }

        if (this._initPromise) {
            return this._initPromise;
        }

        this._initPromise = this._doInit(username);
        return this._initPromise;
    }

    async _doInit(username) {
        this._username = username;
        this._prefix = `user_${username}_`;

        try {
            this._db = await this._openDatabase();
            this._initialized = true;
            
            await this._cleanExpiredData();
            
            console.log(`[IndexedDBStorage] 已初始化，用户: ${username}`);
            return true;
        } catch (e) {
            console.error('[IndexedDBStorage] 初始化失败:', e);
            return false;
        }
    }

    _openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = () => {
                reject(request.error);
            };

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'key' });
                    store.createIndex('username', 'username', { unique: false });
                    store.createIndex('category', 'category', { unique: false });
                    store.createIndex('expiry', 'expiry', { unique: false });
                    store.createIndex('lastAccess', 'lastAccess', { unique: false });
                }

                if (!db.objectStoreNames.contains(this.META_STORE)) {
                    db.createObjectStore(this.META_STORE, { keyPath: 'key' });
                }
            };
        });
    }

    _getStore(mode = 'readonly') {
        const transaction = this._db.transaction([this.STORE_NAME], mode);
        return transaction.objectStore(this.STORE_NAME);
    }

    _getMetaStore(mode = 'readonly') {
        const transaction = this._db.transaction([this.META_STORE], mode);
        return transaction.objectStore(this.META_STORE);
    }

    _getFullKey(key) {
        return `${this._prefix}${key}`;
    }

    async get(key) {
        if (!this._initialized) {
            console.warn('[IndexedDBStorage] 未初始化');
            return null;
        }

        return new Promise((resolve, reject) => {
            const store = this._getStore('readonly');
            const fullKey = this._getFullKey(key);
            const request = store.get(fullKey);

            request.onsuccess = () => {
                const record = request.result;
                if (record) {
                    this._updateLastAccess(fullKey);
                    resolve(record.value);
                } else {
                    resolve(null);
                }
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async getJSON(key, defaultValue = null) {
        try {
            const data = await this.get(key);
            if (data === null) return defaultValue;
            return JSON.parse(data);
        } catch (e) {
            console.error(`[IndexedDBStorage] JSON解析失败: ${key}`, e);
            return defaultValue;
        }
    }

    async set(key, value, options = {}) {
        if (!this._initialized) {
            console.warn('[IndexedDBStorage] 未初始化');
            return false;
        }

        return new Promise(async (resolve, reject) => {
            try {
                const store = this._getStore('readwrite');
                const fullKey = this._getFullKey(key);
                
                const now = Date.now();
                const expiryDays = options.expiryDays || this.DEFAULT_EXPIRY_DAYS;
                
                const record = {
                    key: fullKey,
                    value: value,
                    username: this._username,
                    category: options.category || 'general',
                    created: now,
                    lastAccess: now,
                    expiry: now + (expiryDays * 24 * 60 * 60 * 1000),
                    size: value ? value.length * 2 : 0
                };

                const request = store.put(record);

                request.onsuccess = () => {
                    this._checkStorageQuota();
                    resolve(true);
                };

                request.onerror = () => {
                    reject(request.error);
                };
            } catch (e) {
                console.error(`[IndexedDBStorage] 存储失败: ${key}`, e);
                resolve(false);
            }
        });
    }

    async setJSON(key, value, options = {}) {
        try {
            return await this.set(key, JSON.stringify(value), options);
        } catch (e) {
            console.error(`[IndexedDBStorage] JSON序列化失败: ${key}`, e);
            return false;
        }
    }

    async remove(key) {
        if (!this._initialized) return false;

        return new Promise((resolve, reject) => {
            const store = this._getStore('readwrite');
            const fullKey = this._getFullKey(key);
            const request = store.delete(fullKey);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    async has(key) {
        const data = await this.get(key);
        return data !== null;
    }

    async getAllKeys() {
        if (!this._initialized) return [];

        return new Promise((resolve, reject) => {
            const store = this._getStore('readonly');
            const request = store.getAll();

            request.onsuccess = () => {
                const records = request.result;
                const keys = records
                    .filter(r => r.key.startsWith(this._prefix))
                    .map(r => r.key.substring(this._prefix.length));
                resolve(keys);
            };

            request.onerror = () => reject(request.error);
        });
    }

    async getAllData() {
        if (!this._initialized) return {};

        return new Promise((resolve, reject) => {
            const store = this._getStore('readonly');
            const request = store.getAll();

            request.onsuccess = () => {
                const records = request.result;
                const data = {};
                records
                    .filter(r => r.key.startsWith(this._prefix))
                    .forEach(r => {
                        data[r.key.substring(this._prefix.length)] = r.value;
                    });
                resolve(data);
            };

            request.onerror = () => reject(request.error);
        });
    }

    async getAllJSONData() {
        const data = await this.getAllData();
        const result = {};
        for (const [key, value] of Object.entries(data)) {
            try {
                result[key] = JSON.parse(value);
            } catch (e) {
                result[key] = value;
            }
        }
        return result;
    }

    async clearUserData() {
        if (!this._initialized) return 0;

        const keys = await this.getAllKeys();
        let count = 0;

        for (const key of keys) {
            try {
                await this.remove(key);
                count++;
            } catch (e) {
                console.error(`[IndexedDBStorage] 删除失败: ${key}`, e);
            }
        }

        console.log(`[IndexedDBStorage] 已清除 ${count} 条用户数据`);
        return count;
    }

    async getStorageStats() {
        if (!this._initialized) {
            return { totalItems: 0, totalSize: 0, totalSizeFormatted: '0 B' };
        }

        return new Promise((resolve, reject) => {
            const store = this._getStore('readonly');
            const request = store.getAll();

            request.onsuccess = () => {
                const records = request.result.filter(r => r.key.startsWith(this._prefix));
                let totalSize = 0;
                const items = {};

                records.forEach(r => {
                    const shortKey = r.key.substring(this._prefix.length);
                    const size = r.size || (r.value ? r.value.length * 2 : 0);
                    totalSize += size;
                    items[shortKey] = {
                        size: size,
                        sizeFormatted: this._formatSize(size),
                        created: r.created,
                        lastAccess: r.lastAccess,
                        expiry: r.expiry
                    };
                });

                resolve({
                    username: this._username,
                    totalItems: records.length,
                    totalSize: totalSize,
                    totalSizeFormatted: this._formatSize(totalSize),
                    items: items
                });
            };

            request.onerror = () => reject(request.error);
        });
    }

    _formatSize(bytes) {
        if (bytes < 1024) {
            return `${bytes} B`;
        } else if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(2)} KB`;
        } else if (bytes < 1024 * 1024 * 1024) {
            return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        } else {
            return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
        }
    }

    async setBatch(data, options = {}) {
        let success = 0;
        let failed = 0;

        for (const [key, value] of Object.entries(data)) {
            try {
                if (await this.set(key, value, options)) {
                    success++;
                } else {
                    failed++;
                }
            } catch (e) {
                failed++;
            }
        }

        return { success, failed };
    }

    async setJSONBatch(data, options = {}) {
        let success = 0;
        let failed = 0;

        for (const [key, value] of Object.entries(data)) {
            try {
                if (await this.setJSON(key, value, options)) {
                    success++;
                } else {
                    failed++;
                }
            } catch (e) {
                failed++;
            }
        }

        return { success, failed };
    }

    reset() {
        this._username = null;
        this._prefix = '';
        this._initialized = false;
        this._initPromise = null;
        console.log('[IndexedDBStorage] 已重置');
    }

    async getKeysByPrefix(keyPrefix) {
        const allKeys = await this.getAllKeys();
        return allKeys.filter(key => key.startsWith(keyPrefix));
    }

    async getDataByPrefix(keyPrefix) {
        const keys = await this.getKeysByPrefix(keyPrefix);
        const data = {};
        
        for (const key of keys) {
            data[key] = await this.getJSON(key);
        }
        
        return data;
    }

    async removeByPrefix(keyPrefix) {
        const keys = await this.getKeysByPrefix(keyPrefix);
        let count = 0;

        for (const key of keys) {
            try {
                await this.remove(key);
                count++;
            } catch (e) {
                console.error(`[IndexedDBStorage] 删除失败: ${key}`, e);
            }
        }

        return count;
    }

    async _updateLastAccess(fullKey) {
        try {
            const store = this._getStore('readwrite');
            const request = store.get(fullKey);
            
            request.onsuccess = () => {
                const record = request.result;
                if (record) {
                    record.lastAccess = Date.now();
                    store.put(record);
                }
            };
        } catch (e) {
            // 静默失败
        }
    }

    async _cleanExpiredData() {
        if (!this._initialized) return;

        return new Promise((resolve) => {
            const store = this._getStore('readwrite');
            const index = store.index('expiry');
            const now = Date.now();
            const range = IDBKeyRange.upperBound(now);
            const request = index.openCursor(range);
            let deleted = 0;

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    if (cursor.value.key.startsWith(this._prefix)) {
                        cursor.delete();
                        deleted++;
                    }
                    cursor.continue();
                } else {
                    if (deleted > 0) {
                        console.log(`[IndexedDBStorage] 已清理 ${deleted} 条过期数据`);
                    }
                    resolve();
                }
            };

            request.onerror = () => resolve();
        });
    }

    async _checkStorageQuota() {
        if (navigator.storage && navigator.storage.estimate) {
            try {
                const estimate = await navigator.storage.estimate();
                const usage = estimate.usage || 0;
                const quota = estimate.quota || 0;
                const ratio = quota > 0 ? usage / quota : 0;

                if (ratio >= this.QUOTA_CRITICAL_THRESHOLD) {
                    console.warn(`[IndexedDBStorage] 存储空间严重不足: ${this._formatSize(usage)} / ${this._formatSize(quota)} (${(ratio * 100).toFixed(1)}%)`);
                    this._emit('quotaCritical', { usage, quota, ratio });
                    await this._autoCleanup();
                } else if (ratio >= this.QUOTA_WARNING_THRESHOLD) {
                    console.warn(`[IndexedDBStorage] 存储空间不足: ${this._formatSize(usage)} / ${this._formatSize(quota)} (${(ratio * 100).toFixed(1)}%)`);
                    this._emit('quotaWarning', { usage, quota, ratio });
                }
            } catch (e) {
                // 静默失败
            }
        }
    }

    async _autoCleanup() {
        console.log('[IndexedDBStorage] 执行自动清理...');
        
        const store = this._getStore('readwrite');
        const index = store.index('lastAccess');
        const request = index.openCursor();
        
        let deleted = 0;
        const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000);

        return new Promise((resolve) => {
            request.onsuccess = async (event) => {
                const cursor = event.target.result;
                if (cursor && deleted < 100) {
                    const record = cursor.value;
                    if (record.key.startsWith(this._prefix) && record.lastAccess < cutoffTime) {
                        cursor.delete();
                        deleted++;
                    }
                    cursor.continue();
                } else {
                    console.log(`[IndexedDBStorage] 自动清理完成，删除 ${deleted} 条旧数据`);
                    resolve();
                }
            };

            request.onerror = () => resolve();
        });
    }

    async getQuotaInfo() {
        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            return {
                usage: estimate.usage || 0,
                quota: estimate.quota || 0,
                usageFormatted: this._formatSize(estimate.usage || 0),
                quotaFormatted: this._formatSize(estimate.quota || 0),
                ratio: estimate.quota > 0 ? (estimate.usage / estimate.quota) : 0
            };
        }
        return null;
    }

    async requestPersistentStorage() {
        if (navigator.storage && navigator.storage.persist) {
            const isPersisted = await navigator.storage.persist();
            console.log(`[IndexedDBStorage] 持久化存储: ${isPersisted ? '已启用' : '未启用'}`);
            return isPersisted;
        }
        return false;
    }

    _emit(event, data) {
        window.dispatchEvent(new CustomEvent(`indexedDB:${event}`, { detail: data }));
    }

    isInitialized() {
        return this._initialized;
    }

    getUsername() {
        return this._username;
    }
}

const indexedDBStorage = new IndexedDBStorage();

window.IndexedDBStorage = IndexedDBStorage;
window.indexedDBStorage = indexedDBStorage;

console.log('[IndexedDBStorage] 模块已加载');
