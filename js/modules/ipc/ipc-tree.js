/**
 * IPC Tree Module
 * 分类树浏览功能实现
 */

const IPCTree = (function() {
    let isInitialized = false;
    let expandedNodes = new Set();
    let rootNodes = [];
    let keyMap = {};

    async function initialize() {
        if (isInitialized) return;

        IPCCore.showLoading('ipc_tree_loading');

        try {
            const data = await IPCCore.getTree('l1');
            rootNodes = data.data || data || [];
            
            rootNodes.forEach(node => {
                if (node.symbolcode) {
                    keyMap[node.symbolcode] = node.key;
                }
            });
            
            renderSectionsFromRoots(rootNodes);
            isInitialized = true;
        } catch (error) {
            console.error('加载分类树失败:', error);
            const sections = await IPCCore.getSections();
            renderSections(sections);
            isInitialized = true;
        } finally {
            IPCCore.hideLoading('ipc_tree_loading');
        }
    }

    function renderSectionsFromRoots(nodes) {
        const container = document.getElementById('ipc_section_grid');
        if (!container) return;

        const sectionTitles = {
            'A': '人类生活需要',
            'B': '作业；运输',
            'C': '化学；冶金',
            'D': '纺织；造纸',
            'E': '固定建筑物',
            'F': '机械工程；照明；加热；武器；爆破',
            'G': '物理',
            'H': '电学'
        };

        let html = '';
        nodes.forEach(node => {
            const symbol = node.symbol || node.symbolcode;
            const title = sectionTitles[symbol] || node.title1 || '';
            const key = node.key;
            
            html += `
                <div class="ipc-section-card" id="section_${symbol}" data-key="${key}">
                    <div class="ipc-section-header" onclick="IPCTree.toggleSection('${symbol}', '${key}')">
                        <span class="ipc-section-symbol">${symbol}</span>
                        <span class="ipc-section-title">${title}</span>
                        <span class="ipc-section-toggle">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </span>
                    </div>
                    <div class="ipc-section-children" id="children_${symbol}">
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

    function renderSections(sections) {
        const container = document.getElementById('ipc_section_grid');
        if (!container) return;

        let html = '';
        sections.forEach(section => {
            html += `
                <div class="ipc-section-card" id="section_${section.symbol}">
                    <div class="ipc-section-header" onclick="IPCTree.toggleSection('${section.symbol}', '')">
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

    async function toggleSection(symbol, key) {
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
                await loadChildren(symbol, 'l1', key);
            }
        }
    }

    function getLocalData(symbol) {
        if (typeof IPC_LOCAL_DATA !== 'undefined' && IPC_LOCAL_DATA.sections[symbol]) {
            return IPC_LOCAL_DATA.sections[symbol].children.map(child => ({
                symbol: child.symbol,
                title1: child.title,
                folder: child.hasChildren,
                lazy: child.hasChildren,
                key: child.symbol,
                symbolcode: child.symbol
            }));
        }
        return null;
    }

    async function loadChildren(symbol, level, key) {
        const container = document.getElementById(`children_${symbol}`);
        if (!container) return;

        try {
            if (!key) {
                throw new Error('缺少key参数');
            }
            
            const data = await IPCCore.getTree(level, key);
            const nodes = data.data || data;
            
            nodes.forEach(node => {
                if (node.symbolcode) {
                    keyMap[node.symbolcode] = node.key;
                }
            });
            
            renderChildren(container, nodes, symbol);
        } catch (error) {
            console.error('加载子节点失败:', error);
            
            const localData = getLocalData(symbol);
            if (localData && localData.length > 0) {
                console.log('使用本地数据作为后备');
                container.innerHTML = `
                    <div style="background: #fef3c7; padding: 8px 12px; margin-bottom: 10px; border-radius: 6px; font-size: 12px; color: #92400e;">
                        ⚠️ WIPO API暂时不可用，显示本地缓存数据
                    </div>
                `;
                renderChildren(container, localData, symbol, true);
            } else {
                container.innerHTML = `
                    <div class="ipc-error-message">
                        加载失败: ${error.message}
                        <br><br>
                        <button class="small-button" onclick="IPCTree.retryLoad('${symbol}', '${level}', '${key}')">重试</button>
                    </div>
                `;
            }
        }
    }

    function renderChildren(container, nodes, parentSymbol, isLocalData = false) {
        if (!nodes || nodes.length === 0) {
            if (!isLocalData) {
                container.innerHTML = `
                    <div class="ipc-empty-message" style="padding: 20px;">
                        无子分类
                    </div>
                `;
            }
            return;
        }

        let html = isLocalData ? container.innerHTML : '';
        nodes.forEach(node => {
            const hasChildren = node.folder || node.lazy;
            const nodeKey = node.key || node.symbolcode || '';
            const nodeSymbol = node.symbol || node.symbolcode || '';
            const nodeTitle = node.title1 || node.text || '';

            html += `
                <div class="ipc-tree-node ${hasChildren ? 'has-children' : ''}" 
                     id="node_${nodeKey}"
                     data-key="${nodeKey}"
                     data-symbol="${nodeSymbol}">
                    ${nodeSymbol ? `<strong>${IPCCore.formatSymbol(nodeSymbol)}</strong>` : ''}
                    ${nodeTitle ? ` - ${nodeTitle}` : ''}
                    ${nodeSymbol ? `<button class="ipc-copy-btn" onclick="event.stopPropagation(); IPCCore.copyToClipboard('${nodeSymbol}')">复制</button>` : ''}
                </div>
                ${hasChildren ? `<div class="ipc-tree-children" id="node_children_${nodeKey}"></div>` : ''}
            `;
        });

        container.innerHTML = html;
        
        if (!isLocalData) {
            container.querySelectorAll('.ipc-tree-node.has-children').forEach(nodeEl => {
                nodeEl.addEventListener('click', function(e) {
                    const key = this.dataset.key;
                    const symbol = this.dataset.symbol;
                    handleNodeClick(e, key, symbol, true);
                });
            });
            
            container.querySelectorAll('.ipc-tree-node:not(.has-children)').forEach(nodeEl => {
                nodeEl.addEventListener('click', function(e) {
                    const symbol = this.dataset.symbol;
                    if (symbol) {
                        IPCSearch.showDetail(symbol);
                    }
                });
            });
        }
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
                        const nodes = data.data || data;
                        
                        nodes.forEach(node => {
                            if (node.symbolcode) {
                                keyMap[node.symbolcode] = node.key;
                            }
                        });
                        
                        renderChildren(childrenEl, nodes, key);
                    } catch (error) {
                        const localData = getLocalData(key);
                        if (localData && localData.length > 0) {
                            childrenEl.innerHTML = `
                                <div style="background: #fef3c7; padding: 6px 10px; margin-bottom: 8px; border-radius: 4px; font-size: 11px; color: #92400e;">
                                    ⚠️ 使用本地数据
                                </div>
                            `;
                            renderChildren(childrenEl, localData, key, true);
                        } else {
                            childrenEl.innerHTML = `
                                <div class="ipc-error-message" style="padding: 10px;">
                                    加载失败
                                </div>
                            `;
                        }
                    }
                }
            }
        } else if (symbol) {
            IPCSearch.showDetail(symbol);
        }
    }

    async function retryLoad(symbol, level, key) {
        const container = document.getElementById(`children_${symbol}`);
        if (!container) return;
        
        container.innerHTML = `
            <div class="ipc-loading-inline">
                <div class="loading-spinner"></div>
                <span>加载中...</span>
            </div>
        `;
        
        await loadChildren(symbol, level, key);
    }

    function expandAll() {
        document.querySelectorAll('.ipc-section-card:not(.expanded)').forEach(card => {
            const symbol = card.id.replace('section_', '');
            const key = card.dataset.key || '';
            toggleSection(symbol, key);
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
        collapseAll,
        retryLoad
    };
})();

window.IPCTree = IPCTree;
