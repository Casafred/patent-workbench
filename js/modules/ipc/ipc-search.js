/**
 * IPC Search Module
 * 搜索功能实现
 */

const IPCSearch = (function() {
    let isSearching = false;

    async function performSearch() {
        if (isSearching) return;

        const input = document.getElementById('ipc_search_input');
        const query = input ? input.value.trim() : '';

        if (!query) {
            IPCCore.showToast('请输入搜索关键词', 'error');
            return;
        }

        isSearching = true;

        const lang = document.getElementById('ipc_search_lang')?.value || 'en';
        const limit = parseInt(document.getElementById('ipc_search_limit')?.value || '20');

        IPCCore.showLoading('ipc_search_loading');
        IPCCore.hideResult('ipc_search_result');

        try {
            const data = await IPCCore.search(query, { lang, limit });
            
            renderResults(data);
            IPCCore.showResult('ipc_search_result');
        } catch (error) {
            console.error('搜索失败:', error);
            IPCCore.showError('ipc_search_result', error.message);
            IPCCore.showResult('ipc_search_result');
        } finally {
            IPCCore.hideLoading('ipc_search_loading');
            isSearching = false;
        }
    }

    function renderResults(data) {
        const countEl = document.getElementById('ipc_search_count');
        const listEl = document.getElementById('ipc_search_list');

        if (countEl) {
            countEl.textContent = `共 ${data.count || 0} 条结果`;
        }

        if (!listEl) return;

        if (!data.results || data.results.length === 0) {
            listEl.innerHTML = `
                <div class="ipc-empty-message">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 10px;">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    <div>未找到匹配的IPC分类</div>
                    <div style="font-size: 12px; margin-top: 5px;">请尝试其他关键词</div>
                </div>
            `;
            return;
        }

        let html = '';
        data.results.forEach((item, index) => {
            html += `
                <div class="ipc-search-item" onclick="IPCSearch.showDetail('${item.symbol}')">
                    <span class="ipc-search-symbol">${IPCCore.formatSymbol(item.symbol)}</span>
                    <span class="ipc-search-score">${item.score || 0}</span>
                </div>
            `;
        });

        listEl.innerHTML = html;
    }

    async function showDetail(symbol) {
        const modal = document.getElementById('ipc_detail_modal');
        const titleEl = document.getElementById('ipc_detail_title');
        const bodyEl = document.getElementById('ipc_detail_body');

        if (!modal || !titleEl || !bodyEl) return;

        titleEl.textContent = 'IPC分类详情';
        bodyEl.innerHTML = `
            <div class="ipc-loading-inline">
                <div class="loading-spinner"></div>
                <span>正在加载详情...</span>
            </div>
        `;
        modal.style.display = 'block';

        try {
            const data = await IPCCore.getDetail(symbol);
            renderDetail(symbol, data);
        } catch (error) {
            bodyEl.innerHTML = `
                <div class="ipc-error-message">
                    获取详情失败: ${error.message}
                </div>
            `;
        }
    }

    function renderDetail(symbol, data) {
        const bodyEl = document.getElementById('ipc_detail_body');
        if (!bodyEl) return;

        const detail = data.data || data;

        let html = `
            <div class="ipc-detail-symbol">
                ${IPCCore.formatSymbol(symbol)}
                <button class="ipc-copy-btn" onclick="IPCCore.copyToClipboard('${symbol}')">复制</button>
            </div>
        `;

        if (detail.title) {
            html += `
                <div class="ipc-detail-section">
                    <h5>标题</h5>
                    <div class="ipc-detail-content">${detail.title}</div>
                </div>
            `;
        }

        if (detail.key) {
            html += `
                <div class="ipc-detail-section">
                    <h5>键值</h5>
                    <div class="ipc-detail-content">${detail.key}</div>
                </div>
            `;
        }

        if (detail.parent) {
            html += `
                <div class="ipc-detail-section">
                    <h5>父级分类</h5>
                    <div class="ipc-detail-content">${detail.parent}</div>
                </div>
            `;
        }

        if (detail.valid !== undefined) {
            const isValid = detail.valid;
            html += `
                <div class="ipc-detail-section">
                    <h5>有效性</h5>
                    <div class="ipc-detail-content" style="color: ${isValid ? '#22c55e' : '#ef4444'};">
                        ${isValid ? '✓ 有效分类号' : '✗ 无效分类号'}
                    </div>
                </div>
            `;
        }

        bodyEl.innerHTML = html;
    }

    function handleKeyPress(event) {
        if (event.key === 'Enter') {
            performSearch();
        }
    }

    return {
        performSearch,
        showDetail,
        handleKeyPress
    };
})();

window.IPCSearch = IPCSearch;
