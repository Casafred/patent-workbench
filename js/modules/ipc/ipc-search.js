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
            const title = item.title || item.titleCn || '';
            html += `
                <div class="ipc-search-item" onclick="IPCSearch.viewInLookup('${item.symbol}')" title="点击查看详情">
                    <div class="ipc-search-main">
                        <span class="ipc-search-symbol">${IPCCore.formatSymbol(item.symbol)}</span>
                        <span class="ipc-search-title">${title}</span>
                    </div>
                </div>
            `;
        });

        listEl.innerHTML = html;
    }

    function viewInLookup(symbol) {
        switchIpcSubTab('lookup');
        
        const lookupInput = document.getElementById('ipc_lookup_input');
        if (lookupInput) {
            lookupInput.value = symbol;
        }
        
        setTimeout(() => {
            IPCLookup.performLookup();
        }, 300);
    }

    function handleKeyPress(event) {
        if (event.key === 'Enter') {
            performSearch();
        }
    }

    return {
        performSearch,
        viewInLookup,
        handleKeyPress
    };
})();

window.IPCSearch = IPCSearch;
