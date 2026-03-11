window.PatentDetailCache = {
    CACHE_PREFIX: 'patent_detail_cache_',
    CACHE_DURATION: 30 * 60 * 1000,

    save: function(patentNumber, patentResult, analysisResult) {
        const cacheKey = this.CACHE_PREFIX + patentNumber;
        const cacheData = {
            patentResult: patentResult,
            analysisResult: analysisResult,
            timestamp: Date.now()
        };
        try {
            sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
            return true;
        } catch (e) {
            console.warn('无法缓存专利数据:', e);
            return false;
        }
    },

    load: function(patentNumber) {
        const cacheKey = this.CACHE_PREFIX + patentNumber;
        const cachedData = sessionStorage.getItem(cacheKey);
        
        if (cachedData) {
            try {
                const data = JSON.parse(cachedData);
                if (Date.now() - data.timestamp < this.CACHE_DURATION) {
                    return data;
                } else {
                    sessionStorage.removeItem(cacheKey);
                    return null;
                }
            } catch (e) {
                console.error('解析缓存数据失败:', e);
                sessionStorage.removeItem(cacheKey);
                return null;
            }
        }
        return null;
    },

    remove: function(patentNumber) {
        const cacheKey = this.CACHE_PREFIX + patentNumber;
        sessionStorage.removeItem(cacheKey);
    },

    clear: function() {
        const keysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && key.startsWith(this.CACHE_PREFIX)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => sessionStorage.removeItem(key));
    },

    checkUrlParamAndRestore: function() {
        const urlParams = new URLSearchParams(window.location.search);
        const patentDetailParam = urlParams.get('patent_detail');
        
        if (patentDetailParam && !window.opener) {
            const cachedData = this.load(patentDetailParam);
            
            if (cachedData) {
                if (cachedData.patentResult) {
                    window.patentResults = [cachedData.patentResult];
                    window.patentBatchAnalysisResults = cachedData.analysisResult ? [cachedData.analysisResult] : [];
                    
                    setTimeout(() => {
                        if (typeof window.openPatentDetailInNewTab === 'function') {
                            window.openPatentDetailInNewTab(patentDetailParam);
                        }
                    }, 100);
                }
            } else {
                alert('页面数据已过期或未找到，请从主页面重新打开');
            }
        }
    }
};

(function() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            window.PatentDetailCache.checkUrlParamAndRestore();
        });
    } else {
        window.PatentDetailCache.checkUrlParamAndRestore();
    }
})();
