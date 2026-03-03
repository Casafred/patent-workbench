/**
 * IPC Core Module
 * 核心功能：API调用、状态管理、工具函数
 */

const IPCCore = (function() {
    const state = {
        sections: [],
        currentPredictions: [],
        searchResults: [],
        treeCache: {}
    };

    const API_BASE = '/api/ipc';

    async function fetchAPI(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (appState && appState.apiKey) {
            defaultOptions.headers['Authorization'] = `Bearer ${appState.apiKey}`;
        }

        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || '请求失败');
        }

        return data.data;
    }

    async function predict(text, options = {}) {
        const {
            lang = 'zh',
            level = 'subgroup',
            limit = 5
        } = options;

        const response = await fetchAPI('/predict', {
            method: 'POST',
            body: JSON.stringify({
                q: text,
                lang,
                level,
                limit
            })
        });

        state.currentPredictions = response.results || [];
        return response;
    }

    async function getTree(level = 'l1', key = '') {
        const cacheKey = `${level}_${key}`;
        
        if (state.treeCache[cacheKey]) {
            return state.treeCache[cacheKey];
        }

        let endpoint = `/tree?level=${level}`;
        if (key) {
            endpoint += `&key=${encodeURIComponent(key)}`;
        }

        const data = await fetchAPI(endpoint);
        state.treeCache[cacheKey] = data;
        return data;
    }

    async function search(query, options = {}) {
        const {
            lang = 'en',
            limit = 20,
            offset = 0
        } = options;

        let endpoint = `/search?q=${encodeURIComponent(query)}&lang=${lang}&limit=${limit}&offset=${offset}`;
        
        const data = await fetchAPI(endpoint);
        state.searchResults = data.results || [];
        return data;
    }

    async function getDetail(symbol) {
        return await fetchAPI(`/detail?symbol=${encodeURIComponent(symbol)}`);
    }

    async function getSections() {
        if (state.sections.length > 0) {
            return state.sections;
        }

        const data = await fetchAPI('/sections');
        state.sections = data.sections || [];
        return state.sections;
    }

    function getScoreClass(score) {
        if (score >= 80) return 'high';
        if (score >= 50) return 'medium';
        return 'low';
    }

    function formatSymbol(symbol) {
        if (!symbol) return '';
        return symbol.replace(/\//g, ' ');
    }

    function copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                showToast('已复制到剪贴板');
            }).catch(err => {
                console.error('复制失败:', err);
                fallbackCopy(text);
            });
        } else {
            fallbackCopy(text);
        }
    }

    function fallbackCopy(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showToast('已复制到剪贴板');
        } catch (err) {
            console.error('复制失败:', err);
            showToast('复制失败，请手动复制');
        }
        document.body.removeChild(textarea);
    }

    function showToast(message, type = 'success') {
        const existingToast = document.querySelector('.ipc-toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'ipc-toast';
        
        const bgColors = {
            'success': '#22c55e',
            'error': '#ef4444',
            'info': '#3b82f6',
            'warning': '#f59e0b'
        };
        
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${bgColors[type] || bgColors.success};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: fadeInUp 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'fadeOutDown 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    function showLoading(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.style.display = 'block';
        }
    }

    function hideLoading(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.style.display = 'none';
        }
    }

    function showResult(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.style.display = 'block';
        }
    }

    function hideResult(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.style.display = 'none';
        }
    }

    function showError(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="ipc-error-message">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 8px;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                    ${message}
                </div>
            `;
            container.style.display = 'block';
        }
    }

    return {
        state,
        predict,
        getTree,
        search,
        getDetail,
        getSections,
        getScoreClass,
        formatSymbol,
        copyToClipboard,
        showToast,
        showLoading,
        hideLoading,
        showResult,
        hideResult,
        showError
    };
})();

window.IPCCore = IPCCore;
