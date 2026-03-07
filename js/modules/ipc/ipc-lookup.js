/**
 * IPC Lookup Module
 * IPC分类号查询功能实现 - 直接输入分类号查询含义及层级路径
 */

const IPCLookup = (function() {
    let isInitialized = false;
    let currentSymbol = '';

    async function initialize() {
        if (isInitialized) return;
        isInitialized = true;
    }

    async function performLookup() {
        const inputEl = document.getElementById('ipc_lookup_input');
        if (!inputEl) return;

        const symbol = inputEl.value.trim();
        if (!symbol) {
            IPCCore.showToast('请输入IPC分类号', 'warning');
            return;
        }

        currentSymbol = symbol;
        IPCCore.showLoading('ipc_lookup_loading');
        IPCCore.hideResult('ipc_lookup_result');

        try {
            const data = await IPCCore.getHierarchy(symbol);
            renderHierarchy(data);
            IPCCore.showResult('ipc_lookup_result');
        } catch (error) {
            console.error('查询分类号失败:', error);
            renderError(error.message);
            IPCCore.showResult('ipc_lookup_result');
        } finally {
            IPCCore.hideLoading('ipc_lookup_loading');
        }
    }

    function quickLookup(symbol) {
        const inputEl = document.getElementById('ipc_lookup_input');
        if (inputEl) {
            inputEl.value = symbol;
            performLookup();
        }
    }

    function renderHierarchy(data) {
        const containerEl = document.getElementById('ipc_hierarchy_path');
        if (!containerEl) return;

        const hierarchy = data.hierarchy || [];
        
        if (hierarchy.length === 0) {
            containerEl.innerHTML = `
                <div class="ipc-empty-message">
                    <div>未找到分类号 "${data.symbol}" 的层级信息</div>
                </div>
            `;
            return;
        }

        let html = '<div class="ipc-hierarchy-list">';
        
        hierarchy.forEach((item, index) => {
            const isLast = index === hierarchy.length - 1;
            const levelName = item.levelName || `层级 ${index}`;
            const symbol = item.symbol || '';
            const title = item.title || '';
            const titleCn = item.titleCn || '';
            
            html += `
                <div class="ipc-hierarchy-item ${isLast ? 'current' : ''}">
                    <div class="ipc-hierarchy-level">${levelName}</div>
                    <div class="ipc-hierarchy-content">
                        <div class="ipc-hierarchy-symbol">
                            ${IPCCore.formatSymbol(symbol)}
                            ${isLast ? '<span class="ipc-hierarchy-badge">当前</span>' : ''}
                        </div>
                        <div class="ipc-hierarchy-title">${title}</div>
                        ${titleCn ? `<div class="ipc-hierarchy-title-cn">${titleCn}</div>` : ''}
                    </div>
                    ${!isLast ? `
                    <div class="ipc-hierarchy-arrow">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <polyline points="19 12 12 19 5 12"></polyline>
                        </svg>
                    </div>
                    ` : ''}
                </div>
            `;
        });
        
        html += '</div>';
        
        html += `
            <div class="ipc-hierarchy-actions">
                <button class="small-button" onclick="IPCCore.copyToClipboard('${data.symbol}')">
                    复制分类号
                </button>
                <button class="small-button" onclick="IPCLookup.copyHierarchy()">
                    复制完整路径
                </button>
            </div>
        `;
        
        containerEl.innerHTML = html;
    }

    function copyHierarchy() {
        const hierarchyItems = document.querySelectorAll('.ipc-hierarchy-item');
        if (hierarchyItems.length === 0) return;

        const path = Array.from(hierarchyItems).map(item => {
            const symbol = item.querySelector('.ipc-hierarchy-symbol')?.textContent.trim().replace('当前', '').trim() || '';
            const title = item.querySelector('.ipc-hierarchy-title')?.textContent.trim() || '';
            return `${symbol}: ${title}`;
        }).join(' → ');

        IPCCore.copyToClipboard(path);
    }

    function renderError(message) {
        const containerEl = document.getElementById('ipc_hierarchy_path');
        if (!containerEl) return;

        containerEl.innerHTML = `
            <div class="ipc-error-message">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 8px;">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                ${message}
                <br><br>
                <button class="small-button" onclick="IPCLookup.performLookup()">重试</button>
            </div>
        `;
    }

    return {
        initialize,
        performLookup,
        quickLookup,
        copyHierarchy
    };
})();

window.IPCLookup = IPCLookup;