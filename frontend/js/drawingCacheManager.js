/**
 * Drawing OCR Cache Manager (Frontend) - 用户隔离版
 * 
 * Manages OCR result caching on the frontend and provides
 * cache update confirmation dialogs.
 */

class DrawingCacheManager {
    constructor() {
        this.cacheKey = 'drawing_ocr_cache';
        this.maxCacheAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    }

    /**
     * 获取用户隔离存储实例
     */
    _getStorage() {
        return window.userCacheStorage;
    }

    /**
     * Generate cache key from image data
     * @param {string} imageData - Base64 image data
     * @param {string} fileName - File name
     * @returns {string} Cache key
     */
    generateCacheKey(imageData, fileName) {
        const dataHash = this._simpleHash(imageData);
        return `${fileName}_${dataHash}`;
    }

    /**
     * Check if cache exists for given key (用户隔离)
     * @param {string} cacheKey - Cache key
     * @returns {Object|null} Cached data or null
     */
    getCache(cacheKey) {
        try {
            const allCache = this._loadAllCache();
            const cached = allCache[cacheKey];

            if (!cached) {
                return null;
            }

            const age = Date.now() - cached.timestamp;
            if (age > this.maxCacheAge) {
                this.clearCache(cacheKey);
                return null;
            }

            return cached;
        } catch (e) {
            console.error('Failed to get cache:', e);
            return null;
        }
    }

    /**
     * Save OCR result to cache (用户隔离)
     * @param {string} cacheKey - Cache key
     * @param {Object} data - OCR result data
     */
    setCache(cacheKey, data) {
        try {
            const allCache = this._loadAllCache();
            allCache[cacheKey] = {
                ...data,
                timestamp: Date.now()
            };
            this._saveAllCache(allCache);
        } catch (e) {
            console.error('Failed to set cache:', e);
        }
    }

    /**
     * Clear specific cache or all cache (用户隔离)
     * @param {string|null} cacheKey - Cache key (null = clear all)
     */
    clearCache(cacheKey = null) {
        try {
            if (cacheKey) {
                const allCache = this._loadAllCache();
                delete allCache[cacheKey];
                this._saveAllCache(allCache);
            } else {
                this._getStorage().remove(this.cacheKey);
            }
        } catch (e) {
            console.error('Failed to clear cache:', e);
        }
    }

    /**
     * Cleanup expired cache entries (用户隔离)
     * @returns {number} Number of entries removed
     */
    cleanupExpired() {
        try {
            const allCache = this._loadAllCache();
            let removedCount = 0;

            for (const key in allCache) {
                const cached = allCache[key];
                const age = Date.now() - cached.timestamp;

                if (age > this.maxCacheAge) {
                    delete allCache[key];
                    removedCount++;
                }
            }

            if (removedCount > 0) {
                this._saveAllCache(allCache);
                console.log(`Cleaned up ${removedCount} expired cache entries`);
            }

            return removedCount;
        } catch (e) {
            console.error('Failed to cleanup cache:', e);
            return 0;
        }
    }

    /**
     * Show cache update confirmation dialog
     * @param {string} fileName - File name
     * @param {Object} cachedData - Cached data info
     * @returns {Promise<boolean>} True if user wants to refresh
     */
    async showCacheUpdateDialog(fileName, cachedData) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.7);
                z-index: 10001;
                display: flex;
                justify-content: center;
                align-items: center;
            `;

            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background-color: white;
                border-radius: 12px;
                padding: 30px;
                max-width: 500px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                animation: slideIn 0.3s ease-out;
            `;

            const cachedTime = new Date(cachedData.timestamp).toLocaleString('zh-CN');
            const matchedCount = cachedData.matched_count || 0;
            const ocrCount = cachedData.ocr_detected_count || 0;

            dialog.innerHTML = `
                <style>
                    @keyframes slideIn {
                        from {
                            transform: translateY(-50px);
                            opacity: 0;
                        }
                        to {
                            transform: translateY(0);
                            opacity: 1;
                        }
                    }
                </style>
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 48px; margin-bottom: 10px;">🔄</div>
                    <h2 style="margin: 0; color: #333; font-size: 24px;">检测到缓存结果</h2>
                </div>
                
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                        <strong>文件名：</strong>${fileName}
                    </p>
                    <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                        <strong>缓存时间：</strong>${cachedTime}
                    </p>
                    <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                        <strong>识别结果：</strong>OCR识别 ${ocrCount} 个标记，匹配 ${matchedCount} 个
                    </p>
                </div>
                
                <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
                    <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
                        <strong>⚠️ 提示：</strong>此图片之前已处理过。如果说明书内容有更新，建议重新分析以获取最新匹配结果。
                    </p>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="useCacheBtn" style="
                        flex: 1;
                        padding: 12px 24px;
                        background-color: #4CAF50;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        font-size: 16px;
                        font-weight: bold;
                        cursor: pointer;
                        transition: all 0.2s;
                    ">
                        使用缓存
                    </button>
                    <button id="refreshBtn" style="
                        flex: 1;
                        padding: 12px 24px;
                        background-color: #FF9800;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        font-size: 16px;
                        font-weight: bold;
                        cursor: pointer;
                        transition: all 0.2s;
                    ">
                        重新分析
                    </button>
                </div>
            `;

            modal.appendChild(dialog);
            document.body.appendChild(modal);

            // Button hover effects
            const useCacheBtn = dialog.querySelector('#useCacheBtn');
            const refreshBtn = dialog.querySelector('#refreshBtn');

            useCacheBtn.addEventListener('mouseenter', () => {
                useCacheBtn.style.backgroundColor = '#45a049';
                useCacheBtn.style.transform = 'scale(1.05)';
            });
            useCacheBtn.addEventListener('mouseleave', () => {
                useCacheBtn.style.backgroundColor = '#4CAF50';
                useCacheBtn.style.transform = 'scale(1)';
            });

            refreshBtn.addEventListener('mouseenter', () => {
                refreshBtn.style.backgroundColor = '#F57C00';
                refreshBtn.style.transform = 'scale(1.05)';
            });
            refreshBtn.addEventListener('mouseleave', () => {
                refreshBtn.style.backgroundColor = '#FF9800';
                refreshBtn.style.transform = 'scale(1)';
            });

            // Button click handlers
            useCacheBtn.addEventListener('click', () => {
                modal.remove();
                resolve(false); // Don't refresh
            });

            refreshBtn.addEventListener('click', () => {
                modal.remove();
                resolve(true); // Refresh
            });

            // ESC key to close (use cache)
            const handleEsc = (e) => {
                if (e.key === 'Escape') {
                    modal.remove();
                    document.removeEventListener('keydown', handleEsc);
                    resolve(false);
                }
            };
            document.addEventListener('keydown', handleEsc);
        });
    }

    /**
     * Load all cache from localStorage (用户隔离)
     * @private
     */
    _loadAllCache() {
        try {
            return this._getStorage().getJSON(this.cacheKey, {});
        } catch (e) {
            console.error('Failed to load cache:', e);
            return {};
        }
    }

    /**
     * Save all cache to localStorage (用户隔离)
     * @private
     */
    _saveAllCache(cache) {
        try {
            this._getStorage().setJSON(this.cacheKey, cache);
        } catch (e) {
            console.error('Failed to save cache:', e);
        }
    }

    /**
     * Simple hash function for cache key generation
     * @private
     */
    _simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < Math.min(str.length, 1000); i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(36);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DrawingCacheManager;
}
