// js/modules/init/init-patent-batch.js
// Initialization module for Feature 6 (Patent Batch)

/**
 * Initialize Patent Batch feature
 * This function should be called AFTER the patent-batch component HTML is loaded
 * Note: initPatentBatch is defined in main.js, not in a separate file
 */
function initPatentBatchModule() {
    console.log('🔧 Initializing Patent Batch module...');
    
    // Check if required DOM elements exist
    const requiredElements = [
        'patent_numbers_input',
        'search_patents_btn',
        'patent_results_container'
    ];
    
    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    
    if (missingElements.length > 0) {
        console.error('❌ Patent Batch initialization failed: Missing required elements:', missingElements);
        return false;
    }
    
    // Initialize field selector
    if (typeof window.initFieldSelector === 'function') {
        window.initFieldSelector();
        console.log('✅ Field selector initialized');
    } else {
        console.warn('⚠️ initFieldSelector function not found');
    }
    
    // Initialize history panel
    initHistoryPanel();
    console.log('✅ History panel initialized');
    
    // Call the original initPatentBatch function from main.js
    if (typeof initPatentBatch === 'function') {
        initPatentBatch();
        console.log('✅ Patent Batch module initialized successfully');
        return true;
    } else {
        console.error('❌ initPatentBatch function not found');
        return false;
    }
}

/**
 * Initialize history panel functionality
 */
function initHistoryPanel() {
    // History panel toggle
    const viewHistoryBtn = document.getElementById('view_history_btn');
    const historyPanel = document.getElementById('history_panel');
    const closeHistoryBtn = document.getElementById('close_history_btn');
    const refreshHistoryBtn = document.getElementById('refresh_history_btn');
    const clearHistoryBtn = document.getElementById('clear_history_btn');
    const historySearchInput = document.getElementById('history_search_input');
    const historyList = document.getElementById('history_list');
    const historySelectAllBtn = document.getElementById('history_select_all_btn');
    const historyDeselectAllBtn = document.getElementById('history_deselect_all_btn');
    const historyBatchCrawlBtn = document.getElementById('history_batch_crawl_btn');
    const historyBatchAnalyzeBtn = document.getElementById('history_batch_analyze_btn');
    
    if (viewHistoryBtn && historyPanel) {
        viewHistoryBtn.addEventListener('click', () => {
            const isVisible = historyPanel.style.display !== 'none';
            historyPanel.style.display = isVisible ? 'none' : 'block';
            if (!isVisible) {
                renderHistoryList();
            }
        });
    }
    
    if (closeHistoryBtn && historyPanel) {
        closeHistoryBtn.addEventListener('click', () => {
            historyPanel.style.display = 'none';
        });
    }
    
    if (refreshHistoryBtn) {
        refreshHistoryBtn.addEventListener('click', () => {
            if (window.PatentHistory) {
                window.PatentHistory.refreshCacheStatus();
            }
            renderHistoryList();
        });
    }
    
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            if (confirm('确定要清空所有历史记录吗？')) {
                if (window.PatentHistory) {
                    window.PatentHistory.clear();
                }
                renderHistoryList();
            }
        });
    }
    
    if (historySearchInput) {
        historySearchInput.addEventListener('input', (e) => {
            renderHistoryList(e.target.value);
        });
    }
    
    if (historySelectAllBtn) {
        historySelectAllBtn.addEventListener('click', () => {
            const checkboxes = historyList.querySelectorAll('.history-item-checkbox');
            checkboxes.forEach(cb => cb.checked = true);
            updateHistoryBatchButtons();
        });
    }
    
    if (historyDeselectAllBtn) {
        historyDeselectAllBtn.addEventListener('click', () => {
            const checkboxes = historyList.querySelectorAll('.history-item-checkbox');
            checkboxes.forEach(cb => cb.checked = false);
            updateHistoryBatchButtons();
        });
    }
    
    if (historyBatchCrawlBtn) {
        historyBatchCrawlBtn.addEventListener('click', () => {
            const selected = getSelectedHistoryPatents();
            if (selected.length > 0) {
                const input = document.getElementById('patent_numbers_input');
                if (input) {
                    input.value = selected.join('\n');
                    input.dispatchEvent(new Event('input'));
                }
                historyPanel.style.display = 'none';
                
                // 自动触发爬取
                const crawlBtn = document.getElementById('search_patents_btn');
                if (crawlBtn) {
                    crawlBtn.click();
                }
            }
        });
    }
    
    if (historyBatchAnalyzeBtn) {
        historyBatchAnalyzeBtn.addEventListener('click', () => {
            const selected = getSelectedHistoryPatents();
            if (selected.length > 0) {
                // 检查缓存状态
                const cachedPatents = selected.filter(num => 
                    window.PatentCache && window.PatentCache.has(num)
                );
                
                if (cachedPatents.length === 0) {
                    alert('选中的专利都没有缓存数据，请先爬取');
                    return;
                }
                
                // 触发解读
                if (window.TabManager && window.TabManager.analyzeAllPatents) {
                    historyPanel.style.display = 'none';
                    window.TabManager.analyzeAllPatents(cachedPatents);
                }
            }
        });
    }
    
    // Listen for history updates
    window.addEventListener('patentHistoryUpdated', () => {
        if (historyPanel && historyPanel.style.display !== 'none') {
            renderHistoryList();
        }
    });
}

/**
 * Render history list
 */
function renderHistoryList(searchKeyword = '') {
    const historyList = document.getElementById('history_list');
    if (!historyList) return;
    
    if (!window.PatentHistory) {
        historyList.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">历史记录模块未加载</div>';
        return;
    }
    
    let history = searchKeyword ? 
        window.PatentHistory.search(searchKeyword) : 
        window.PatentHistory.getAll();
    
    if (history.length === 0) {
        historyList.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">暂无历史记录</div>';
        updateHistoryStats();
        return;
    }
    
    let html = '';
    history.forEach((record, index) => {
        const cacheBadge = record.hasCache ? 
            '<span style="background: #d4edda; color: #155724; padding: 2px 6px; border-radius: 3px; font-size: 10px;">已缓存</span>' : 
            '<span style="background: #f8d7da; color: #721c24; padding: 2px 6px; border-radius: 3px; font-size: 10px;">未缓存</span>';
        
        const analysisBadge = record.hasAnalysis ? 
            '<span style="background: #cce5ff; color: #004085; padding: 2px 6px; border-radius: 3px; font-size: 10px;">已解读</span>' : 
            '';
        
        const actionBadge = record.action === 'analyze' ? 
            '<span style="background: #e2e3e5; color: #383d41; padding: 2px 6px; border-radius: 3px; font-size: 10px;">解读</span>' : 
            '<span style="background: #e2e3e5; color: #383d41; padding: 2px 6px; border-radius: 3px; font-size: 10px;">爬取</span>';
        
        html += `
            <div class="history-item" style="display: flex; align-items: center; padding: 10px 12px; border-bottom: 1px solid #eee;">
                <input type="checkbox" class="history-item-checkbox" data-patent="${record.patentNumber}" style="margin-right: 10px;">
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                        <span style="font-weight: 500; color: #333;">${record.patentNumber}</span>
                        ${actionBadge}
                        ${cacheBadge}
                        ${analysisBadge}
                    </div>
                    <div style="font-size: 12px; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${record.title || '无标题'}
                    </div>
                    <div style="font-size: 11px; color: #999; margin-top: 2px;">
                        ${window.PatentHistory.formatTime(record.timestamp)}
                    </div>
                </div>
                <div style="display: flex; gap: 4px; margin-left: 10px;">
                    <button class="history-action-btn" data-action="crawl" data-patent="${record.patentNumber}" title="重新爬取" style="padding: 4px 8px; font-size: 11px; border: 1px solid #ddd; background: white; border-radius: 3px; cursor: pointer;">
                        爬取
                    </button>
                    <button class="history-action-btn" data-action="analyze" data-patent="${record.patentNumber}" title="重新解读" style="padding: 4px 8px; font-size: 11px; border: 1px solid #ddd; background: white; border-radius: 3px; cursor: pointer;" ${!record.hasCache ? 'disabled' : ''}>
                        解读
                    </button>
                    <button class="history-action-btn" data-action="delete" data-patent="${record.patentNumber}" title="删除记录" style="padding: 4px 8px; font-size: 11px; border: 1px solid #f5c6cb; background: #fff; color: #721c24; border-radius: 3px; cursor: pointer;">
                        删除
                    </button>
                </div>
            </div>
        `;
    });
    
    historyList.innerHTML = html;
    
    // Add event listeners to action buttons
    historyList.querySelectorAll('.history-action-btn').forEach(btn => {
        btn.addEventListener('click', handleHistoryAction);
    });
    
    // Add event listeners to checkboxes
    historyList.querySelectorAll('.history-item-checkbox').forEach(cb => {
        cb.addEventListener('change', updateHistoryBatchButtons);
    });
    
    updateHistoryStats();
}

/**
 * Handle history item action
 */
function handleHistoryAction(e) {
    const btn = e.target;
    const action = btn.dataset.action;
    const patentNumber = btn.dataset.patent;
    
    if (action === 'crawl') {
        const input = document.getElementById('patent_numbers_input');
        if (input) {
            input.value = patentNumber;
            input.dispatchEvent(new Event('input'));
        }
        
        const historyPanel = document.getElementById('history_panel');
        if (historyPanel) {
            historyPanel.style.display = 'none';
        }
        
        const crawlBtn = document.getElementById('search_patents_btn');
        if (crawlBtn) {
            crawlBtn.click();
        }
    } else if (action === 'analyze') {
        if (!window.PatentCache || !window.PatentCache.has(patentNumber)) {
            alert('该专利没有缓存数据，请先爬取');
            return;
        }
        
        const historyPanel = document.getElementById('history_panel');
        if (historyPanel) {
            historyPanel.style.display = 'none';
        }
        
        if (window.TabManager && window.TabManager.analyzeAllPatents) {
            window.TabManager.analyzeAllPatents([patentNumber]);
        }
    } else if (action === 'delete') {
        if (window.PatentHistory) {
            window.PatentHistory.remove(patentNumber);
        }
        renderHistoryList();
    }
}

/**
 * Get selected history patents
 */
function getSelectedHistoryPatents() {
    const historyList = document.getElementById('history_list');
    if (!historyList) return [];
    
    const checked = historyList.querySelectorAll('.history-item-checkbox:checked');
    return Array.from(checked).map(cb => cb.dataset.patent);
}

/**
 * Update history batch buttons state
 */
function updateHistoryBatchButtons() {
    const selected = getSelectedHistoryPatents();
    const historyBatchCrawlBtn = document.getElementById('history_batch_crawl_btn');
    const historyBatchAnalyzeBtn = document.getElementById('history_batch_analyze_btn');
    
    if (historyBatchCrawlBtn) {
        historyBatchCrawlBtn.disabled = selected.length === 0;
    }
    
    if (historyBatchAnalyzeBtn) {
        const hasCached = selected.some(num => 
            window.PatentCache && window.PatentCache.has(num)
        );
        historyBatchAnalyzeBtn.disabled = selected.length === 0 || !hasCached;
    }
}

/**
 * Update history statistics
 */
function updateHistoryStats() {
    if (!window.PatentHistory) return;
    
    const stats = window.PatentHistory.getStats();
    
    const totalCount = document.getElementById('history_total_count');
    const cachedCount = document.getElementById('history_cached_count');
    const analyzedCount = document.getElementById('history_analyzed_count');
    
    if (totalCount) totalCount.textContent = stats.total;
    if (cachedCount) cachedCount.textContent = stats.withCache;
    if (analyzedCount) analyzedCount.textContent = stats.withAnalysis;
}

// Export for use in main.js
if (typeof window !== 'undefined') {
    window.initPatentBatchModule = initPatentBatchModule;
    window.renderHistoryList = renderHistoryList;
}
