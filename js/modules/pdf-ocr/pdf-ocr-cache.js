/**
 * PDF-OCR 缓存管理模块
 * 处理OCR结果的智能缓存，避免重复提交分析请求
 */

class PDFOCRCache {
    constructor() {
        this.cachePrefix = 'pdf_ocr_cache_';
        this.metaKey = 'pdf_ocr_cache_meta';
        this.maxAgeDays = 7;
        this.maxCacheSize = 100;
        this.init();
    }

    init() {
        this.cleanupExpired();
    }

    generateFileHash(file) {
        return new Promise((resolve) => {
            if (!file) {
                resolve(null);
                return;
            }
            
            const fileInfo = `${file.name}_${file.size}_${file.lastModified}`;
            let hash = 0;
            for (let i = 0; i < fileInfo.length; i++) {
                const char = fileInfo.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            resolve(Math.abs(hash).toString(16));
        });
    }

    generateCacheKey(fileHash, pageRange) {
        if (typeof pageRange === 'string') {
            return `${this.cachePrefix}${fileHash}_${pageRange}`;
        }
        return `${this.cachePrefix}${fileHash}_page_${pageRange}`;
    }

    hasCache(fileHash, pageRange) {
        const key = this.generateCacheKey(fileHash, pageRange);
        const cached = localStorage.getItem(key);
        if (!cached) return false;

        try {
            const data = JSON.parse(cached);
            if (this.isExpired(data.timestamp)) {
                localStorage.removeItem(key);
                return false;
            }
            return true;
        } catch (e) {
            localStorage.removeItem(key);
            return false;
        }
    }

    getCache(fileHash, pageRange) {
        const key = this.generateCacheKey(fileHash, pageRange);
        const cached = localStorage.getItem(key);
        if (!cached) return null;

        try {
            const data = JSON.parse(cached);
            if (this.isExpired(data.timestamp)) {
                localStorage.removeItem(key);
                return null;
            }
            return data.result;
        } catch (e) {
            localStorage.removeItem(key);
            return null;
        }
    }

    setCache(fileHash, pageRange, result) {
        const key = this.generateCacheKey(fileHash, pageRange);
        const data = {
            result: result,
            timestamp: Date.now(),
            fileHash: fileHash,
            pageRange: pageRange
        };

        try {
            localStorage.setItem(key, JSON.stringify(data));
            this.updateMeta(fileHash, pageRange);
            this.checkCacheSize();
        } catch (e) {
            console.warn('[PDF-OCR-Cache] 缓存存储失败，可能已满:', e);
            this.clearOldest();
            try {
                localStorage.setItem(key, JSON.stringify(data));
            } catch (e2) {
                console.error('[PDF-OCR-Cache] 缓存存储仍然失败:', e2);
            }
        }
    }

    clearCache(fileHash, pageRange) {
        if (fileHash && pageRange) {
            const key = this.generateCacheKey(fileHash, pageRange);
            localStorage.removeItem(key);
        } else if (fileHash) {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.cachePrefix + fileHash)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
        } else {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.cachePrefix)) {
                    localStorage.removeItem(key);
                }
            }
        }
    }

    getCacheStatus(fileHash, totalPages) {
        const status = {
            hasAnyCache: false,
            cachedPages: [],
            missingPages: [],
            hasFullCache: false
        };

        for (let i = 1; i <= totalPages; i++) {
            if (this.hasCache(fileHash, i)) {
                status.cachedPages.push(i);
            } else {
                status.missingPages.push(i);
            }
        }

        status.hasAnyCache = status.cachedPages.length > 0;
        status.hasFullCache = status.missingPages.length === 0 && totalPages > 0;

        return status;
    }

    parsePageRange(rangeStr, totalPages) {
        if (!rangeStr || rangeStr.trim() === '') {
            return [];
        }

        const pages = new Set();
        const parts = rangeStr.split(',');

        for (const part of parts) {
            const trimmed = part.trim();
            
            if (trimmed.includes('-')) {
                const [start, end] = trimmed.split('-').map(s => parseInt(s.trim()));
                if (!isNaN(start) && !isNaN(end)) {
                    for (let i = Math.max(1, start); i <= Math.min(totalPages, end); i++) {
                        pages.add(i);
                    }
                }
            } else {
                const pageNum = parseInt(trimmed);
                if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                    pages.add(pageNum);
                }
            }
        }

        return Array.from(pages).sort((a, b) => a - b);
    }

    isExpired(timestamp) {
        const age = Date.now() - timestamp;
        return age > this.maxAgeDays * 24 * 60 * 60 * 1000;
    }

    updateMeta(fileHash, pageRange) {
        try {
            let meta = JSON.parse(localStorage.getItem(this.metaKey) || '{}');
            if (!meta[fileHash]) {
                meta[fileHash] = { pages: [], lastAccess: Date.now() };
            }
            if (typeof pageRange === 'number') {
                if (!meta[fileHash].pages.includes(pageRange)) {
                    meta[fileHash].pages.push(pageRange);
                }
            }
            meta[fileHash].lastAccess = Date.now();
            localStorage.setItem(this.metaKey, JSON.stringify(meta));
        } catch (e) {
            console.warn('[PDF-OCR-Cache] 更新元数据失败:', e);
        }
    }

    checkCacheSize() {
        let count = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.cachePrefix)) {
                count++;
            }
        }
        if (count > this.maxCacheSize) {
            this.clearOldest();
        }
    }

    clearOldest() {
        const entries = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.cachePrefix)) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    entries.push({ key, timestamp: data.timestamp || 0 });
                } catch (e) {
                    entries.push({ key, timestamp: 0 });
                }
            }
        }

        entries.sort((a, b) => a.timestamp - b.timestamp);
        const toRemove = entries.slice(0, Math.floor(entries.length / 2));
        toRemove.forEach(entry => localStorage.removeItem(entry.key));
    }

    cleanupExpired() {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.cachePrefix)) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (this.isExpired(data.timestamp)) {
                        keysToRemove.push(key);
                    }
                } catch (e) {
                    keysToRemove.push(key);
                }
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
    }

    getCacheInfo(fileHash) {
        const info = {
            totalEntries: 0,
            cachedPages: [],
            totalSize: 0
        };

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.cachePrefix + fileHash)) {
                info.totalEntries++;
                const data = localStorage.getItem(key);
                if (data) {
                    info.totalSize += data.length;
                    try {
                        const parsed = JSON.parse(data);
                        if (typeof parsed.pageRange === 'number') {
                            info.cachedPages.push(parsed.pageRange);
                        }
                    } catch (e) {}
                }
            }
        }

        info.cachedPages.sort((a, b) => a - b);
        info.totalSizeKB = Math.round(info.totalSize / 1024);
        return info;
    }
}

window.PDFOCRCache = PDFOCRCache;
window.pdfOCRCache = null;
