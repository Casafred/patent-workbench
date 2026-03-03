/**
 * IPC Tree Module
 * 分类树浏览功能实现
 */

const IPCTree = (function() {
    let isInitialized = false;
    let expandedNodes = new Set();

    async function initialize() {
        if (isInitialized) return;

        IPCCore.showLoading('ipc_tree_loading');

        try {
            const sections = await IPCCore.getSections();
            renderSections(sections);
            isInitialized = true;
        } catch (error) {
            console.error('加载分类树失败:', error);
            IPCCore.showError('ipc_tree_container', '加载分类树失败: ' + error.message);
        } finally {
            IPCCore.hideLoading('ipc_tree_loading');
        }
    }

    function renderSections(sections) {
        const container = document.getElementById('ipc_section_grid');
        if (!container) return;

        let html = '';
        sections.forEach(section => {
            html += `
                <div class="ipc-section-card" id="section_${section.symbol}">
                    <div class="ipc-section-header" onclick="IPCTree.toggleSection('${section.symbol}')">
                        <span class="ipc-section-symbol">${section.symbol}</span>
                        <span class="ipc-section-title">${section.title}</span>
                        <span class="ipc-section-toggle">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </span>
                    </div>
                    <div class="ipc-section-children" id="children_${section.symbol}">
                        <div class="ipc-loading-inline">
                            <div class="loading-spinner"></div>
                            <span>加载中...</span>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    async function toggleSection(symbol) {
        const card = document.getElementById(`section_${symbol}`);
        const childrenContainer = document.getElementById(`children_${symbol}`);

        if (!card || !childrenContainer) return;

        const isExpanded = card.classList.contains('expanded');

        if (isExpanded) {
            card.classList.remove('expanded');
            expandedNodes.delete(symbol);
        } else {
            card.classList.add('expanded');
            expandedNodes.add(symbol);

            if (childrenContainer.querySelector('.ipc-loading-inline')) {
                await loadChildren(symbol, 'l1', symbol);
            }
        }
    }

    async function loadChildren(symbol, level, key) {
        const container = document.getElementById(`children_${symbol}`);
        if (!container) return;

        try {
            const data = await IPCCore.getTree(level, key);
            renderChildren(container, data.data || data, symbol);
        } catch (error) {
            console.error('加载子节点失败:', error);
            container.innerHTML = `
                <div class="ipc-error-message">
                    加载失败: ${error.message}
                </div>
            `;
        }
    }

    function renderChildren(container, nodes, parentSymbol) {
        if (!nodes || nodes.length === 0) {
            container.innerHTML = `
                <div class="ipc-empty-message" style="padding: 20px;">
                    无子分类
                </div>
            `;
            return;
        }

        let html = '';
        nodes.forEach(node => {
            const hasChildren = node.folder || node.lazy;
            const nodeKey = node.key || node.symbolcode || '';
            const nodeSymbol = node.symbol || '';
            const nodeTitle = node.title1 || node.text || '';

            html += `
                <div class="ipc-tree-node ${hasChildren ? 'has-children' : ''}" 
                     id="node_${nodeKey}"
                     onclick="IPCTree.handleNodeClick(event, '${nodeKey}', '${nodeSymbol}', ${hasChildren})">
                    ${nodeSymbol ? `<strong>${IPCCore.formatSymbol(nodeSymbol)}</strong>` : ''}
                    ${nodeTitle ? ` - ${nodeTitle}` : ''}
                    ${nodeSymbol ? `<button class="ipc-copy-btn" onclick="event.stopPropagation(); IPCCore.copyToClipboard('${nodeSymbol}')">复制</button>` : ''}
                </div>
                ${hasChildren ? `<div class="ipc-tree-children" id="node_children_${nodeKey}"></div>` : ''}
            `;
        });

        container.innerHTML = html;
    }

    async function handleNodeClick(event, key, symbol, hasChildren) {
        event.stopPropagation();

        if (hasChildren) {
            const nodeEl = document.getElementById(`node_${key}`);
            const childrenEl = document.getElementById(`node_children_${key}`);

            if (!nodeEl || !childrenEl) return;

            const isExpanded = nodeEl.classList.contains('expanded');

            if (isExpanded) {
                nodeEl.classList.remove('expanded');
                childrenEl.classList.remove('show');
            } else {
                nodeEl.classList.add('expanded');
                childrenEl.classList.add('show');

                if (childrenEl.children.length === 0) {
                    childrenEl.innerHTML = `
                        <div class="ipc-loading-inline">
                            <div class="loading-spinner"></div>
                            <span>加载中...</span>
                        </div>
                    `;

                    try {
                        const data = await IPCCore.getTree('l1', key);
                        renderChildren(childrenEl, data.data || data, key);
                    } catch (error) {
                        childrenEl.innerHTML = `
                            <div class="ipc-error-message">
                                加载失败
                            </div>
                        `;
                    }
                }
            }
        } else if (symbol) {
            IPCSearch.showDetail(symbol);
        }
    }

    function expandAll() {
        document.querySelectorAll('.ipc-section-card:not(.expanded)').forEach(card => {
            const symbol = card.id.replace('section_', '');
            toggleSection(symbol);
        });
    }

    function collapseAll() {
        document.querySelectorAll('.ipc-section-card.expanded').forEach(card => {
            card.classList.remove('expanded');
        });
        document.querySelectorAll('.ipc-tree-node.expanded').forEach(node => {
            node.classList.remove('expanded');
        });
        document.querySelectorAll('.ipc-tree-children.show').forEach(el => {
            el.classList.remove('show');
        });
        expandedNodes.clear();
    }

    return {
        initialize,
        toggleSection,
        loadChildren,
        handleNodeClick,
        expandAll,
        collapseAll
    };
})();

window.IPCTree = IPCTree;
