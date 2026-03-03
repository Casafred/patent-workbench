/**
 * IPC Tree Module
 * 分类树浏览功能实现 - 横向展开布局
 */

const IPCTree = (function() {
    let isInitialized = false;
    let currentPath = [];
    let nodeData = {};
    let keyMap = {};

    async function initialize() {
        if (isInitialized) return;

        IPCCore.showLoading('ipc_tree_loading');

        try {
            const data = await IPCCore.getTree('l1');
            const nodes = data.data || data || [];
            
            nodes.forEach(node => {
                if (node.symbolcode) {
                    keyMap[node.symbolcode] = node.key;
                }
                nodeData[node.key] = node;
            });
            
            renderRootNodes(nodes);
            isInitialized = true;
        } catch (error) {
            console.error('加载分类树失败:', error);
            renderError(error.message);
        } finally {
            IPCCore.hideLoading('ipc_tree_loading');
        }
    }

    function renderRootNodes(nodes) {
        const breadcrumbEl = document.getElementById('ipc_breadcrumb');
        const contentEl = document.getElementById('ipc_tree_content');
        
        if (breadcrumbEl) {
            breadcrumbEl.innerHTML = `
                <span class="ipc-breadcrumb-item current">IPC分类体系</span>
            `;
        }
        
        if (!contentEl) return;
        
        const sectionTitles = {
            'A': 'HUMAN NECESSITIES (人类生活需要)',
            'B': 'PERFORMING OPERATIONS; TRANSPORTING (作业；运输)',
            'C': 'CHEMISTRY; METALLURGY (化学；冶金)',
            'D': 'TEXTILES; PAPER (纺织；造纸)',
            'E': 'FIXED CONSTRUCTIONS (固定建筑物)',
            'F': 'MECHANICAL ENGINEERING (机械工程)',
            'G': 'PHYSICS (物理)',
            'H': 'ELECTRICITY (电学)'
        };
        
        let html = '';
        nodes.forEach(node => {
            const symbol = node.symbol || node.symbolcode || '';
            const title = sectionTitles[symbol] || stripHtml(node.title1 || '');
            const hasChildren = node.folder || node.lazy;
            const key = node.key;
            
            html += `
                <div class="ipc-tree-card ${hasChildren ? 'has-children' : ''}" 
                     onclick="IPCTree.selectNode('${key}', '${symbol}', '${escapeHtml(title)}', true)">
                    <div class="ipc-tree-card-header">
                        <span class="ipc-tree-card-symbol">${symbol}</span>
                        <span class="ipc-tree-card-title">${title}</span>
                    </div>
                    ${hasChildren ? `
                    <div class="ipc-tree-card-actions">
                        <button class="ipc-tree-card-btn primary" onclick="event.stopPropagation(); IPCTree.expandNode('${key}', '${symbol}', '${escapeHtml(title)}')">
                            展开子分类
                        </button>
                        <button class="ipc-tree-card-btn secondary" onclick="event.stopPropagation(); IPCCore.copyToClipboard('${symbol}')">
                            复制
                        </button>
                    </div>
                    ` : ''}
                </div>
            `;
        });
        
        contentEl.innerHTML = html;
        currentPath = [];
    }

    async function expandNode(key, symbol, title) {
        const contentEl = document.getElementById('ipc_tree_content');
        if (!contentEl) return;
        
        contentEl.innerHTML = `
            <div class="ipc-loading-inline">
                <div class="loading-spinner"></div>
                <span>正在加载子分类...</span>
            </div>
        `;
        
        try {
            const data = await IPCCore.getTree('l1', key);
            const nodes = data.data || data || [];
            
            nodes.forEach(node => {
                if (node.symbolcode) {
                    keyMap[node.symbolcode] = node.key;
                }
                nodeData[node.key] = node;
            });
            
            currentPath.push({ key, symbol, title });
            updateBreadcrumb();
            renderChildNodes(nodes);
        } catch (error) {
            console.error('加载子节点失败:', error);
            contentEl.innerHTML = `
                <div class="ipc-error-message">
                    加载失败: ${error.message}
                    <br><br>
                    <button class="small-button" onclick="IPCTree.goBack()">返回上一级</button>
                </div>
            `;
        }
    }

    function selectNode(key, symbol, title, isRoot = false) {
        showDetail(symbol, title);
    }

    function renderChildNodes(nodes) {
        const contentEl = document.getElementById('ipc_tree_content');
        if (!contentEl) return;
        
        if (!nodes || nodes.length === 0) {
            contentEl.innerHTML = `
                <div class="ipc-empty-message">
                    <div>当前分类下没有子分类</div>
                </div>
            `;
            return;
        }
        
        let html = '';
        nodes.forEach(node => {
            const symbol = node.symbol || node.symbolcode || '';
            const title = stripHtml(node.title1 || '');
            const hasChildren = node.folder || node.lazy;
            const key = node.key;
            
            html += `
                <div class="ipc-tree-card ${hasChildren ? 'has-children' : ''}" 
                     onclick="IPCTree.selectNode('${key}', '${symbol}', '${escapeHtml(title)}')">
                    <div class="ipc-tree-card-header">
                        <span class="ipc-tree-card-symbol">${IPCCore.formatSymbol(symbol)}</span>
                        <span class="ipc-tree-card-title">${title || '(无标题)'}</span>
                    </div>
                    ${hasChildren ? `
                    <div class="ipc-tree-card-actions">
                        <button class="ipc-tree-card-btn primary" onclick="event.stopPropagation(); IPCTree.expandNode('${key}', '${symbol}', '${escapeHtml(title)}')">
                            展开子分类
                        </button>
                        <button class="ipc-tree-card-btn secondary" onclick="event.stopPropagation(); IPCCore.copyToClipboard('${symbol}')">
                            复制
                        </button>
                    </div>
                    ` : `
                    <div class="ipc-tree-card-actions">
                        <button class="ipc-tree-card-btn secondary" onclick="event.stopPropagation(); IPCCore.copyToClipboard('${symbol}')">
                            复制
                        </button>
                    </div>
                    `}
                </div>
            `;
        });
        
        contentEl.innerHTML = html;
    }

    function updateBreadcrumb() {
        const breadcrumbEl = document.getElementById('ipc_breadcrumb');
        if (!breadcrumbEl) return;
        
        let html = `
            <span class="ipc-breadcrumb-item" onclick="IPCTree.goToRoot()">
                IPC分类体系
            </span>
        `;
        
        currentPath.forEach((item, index) => {
            const isLast = index === currentPath.length - 1;
            html += `
                <span class="ipc-breadcrumb-separator">›</span>
                <span class="ipc-breadcrumb-item ${isLast ? 'current' : ''}" 
                     onclick="IPCTree.goToLevel(${index})">
                    ${item.symbol}
                </span>
            `;
        });
        
        breadcrumbEl.innerHTML = html;
    }

    async function goToRoot() {
        currentPath = [];
        
        IPCCore.showLoading('ipc_tree_loading');
        
        try {
            const data = await IPCCore.getTree('l1');
            const nodes = data.data || data || [];
            renderRootNodes(nodes);
        } catch (error) {
            renderError(error.message);
        } finally {
            IPCCore.hideLoading('ipc_tree_loading');
        }
    }

    async function goToLevel(level) {
        if (level < 0 || level >= currentPath.length) return;
        
        currentPath = currentPath.slice(0, level);
        
        if (level === 0) {
            await goToRoot();
            return;
        }
        
        const lastItem = currentPath[currentPath.length - 1];
        await expandNode(lastItem.key, lastItem.symbol, lastItem.title);
    }

    function goBack() {
        if (currentPath.length === 0) {
            goToRoot();
        } else {
            goToLevel(currentPath.length - 1);
        }
    }

    function showDetail(symbol, title) {
        const modal = document.getElementById('ipc_detail_modal');
        const titleEl = document.getElementById('ipc_detail_title');
        const bodyEl = document.getElementById('ipc_detail_body');

        if (!modal || !titleEl || !bodyEl) {
            IPCCore.showToast('无法显示详情', 'error');
            return;
        }

        titleEl.textContent = 'IPC分类详情';
        bodyEl.innerHTML = `
            <div class="ipc-detail-symbol">
                ${IPCCore.formatSymbol(symbol)}
                <span class="ipc-copy-link" onclick="IPCCore.copyToClipboard('${symbol}')">复制</span>
            </div>
            <div class="ipc-detail-info">
                <p style="color: #666; font-size: 14px; margin: 0 0 10px 0;">
                    IPC分类号: <strong>${symbol}</strong>
                </p>
                ${title ? `<p style="color: #333; font-size: 14px; margin: 0;">${title}</p>` : ''}
            </div>
            <div class="ipc-detail-actions">
                <button class="small-button" onclick="IPCTree.viewInTree('${symbol}')">
                    在分类树中查看
                </button>
            </div>
        `;
        modal.style.display = 'flex';
        modal.classList.add('show');
    }

    async function viewInTree(symbol) {
        closeIpcDetailModal();
        
        switchIpcSubTab('browse');
        
        if (!isInitialized) {
            await initialize();
        }
        
        const section = symbol.charAt(0).toUpperCase();
        const sectionKey = keyMap[section];
        
        if (sectionKey) {
            const sectionTitles = {
                'A': 'HUMAN NECESSITIES (人类生活需要)',
                'B': 'PERFORMING OPERATIONS; TRANSPORTING (作业；运输)',
                'C': 'CHEMISTRY; METALLURGY (化学；冶金)',
                'D': 'TEXTILES; PAPER (纺织；造纸)',
                'E': 'FIXED CONSTRUCTIONS (固定建筑物)',
                'F': 'MECHANICAL ENGINEERING (机械工程)',
                'G': 'PHYSICS (物理)',
                'H': 'ELECTRICITY (电学)'
            };
            
            IPCCore.showToast(`正在定位到 ${section} 部...`, 'info');
            
            await expandNode(sectionKey, section, sectionTitles[section] || section);
            
            setTimeout(() => {
                IPCCore.showToast(`已展开 ${section} 部，请继续查找 ${symbol}`, 'success');
            }, 500);
        }
    }

    function renderError(message) {
        const contentEl = document.getElementById('ipc_tree_content');
        if (!contentEl) return;
        
        contentEl.innerHTML = `
            <div class="ipc-error-message">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 8px;">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                加载失败: ${message}
                <br><br>
                <button class="small-button" onclick="IPCTree.initialize()">重试</button>
            </div>
        `;
    }

    function stripHtml(html) {
        if (!html) return '';
        return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    }

    function escapeHtml(text) {
        if (!text) return '';
        return text.replace(/'/g, "\\'").replace(/"/g, '\\"');
    }

    return {
        initialize,
        expandNode,
        selectNode,
        goToRoot,
        goToLevel,
        goBack,
        showDetail,
        viewInTree
    };
})();

window.IPCTree = IPCTree;
