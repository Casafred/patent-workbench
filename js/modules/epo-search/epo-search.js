/**
 * 全球专利智能检索模块
 */
class EPOSearchModule {
    constructor() {
        this.currentQuery = '';
        this.currentPage = 1;
        this.resultsPerPage = 25;
        this.totalResults = 0;
        this.searchResults = [];
        this.currentPatentNumber = null;
        this.cqlHelpData = null;
        this.searchHistory = this.loadSearchHistory();
        
        this.init();
    }
    
    loadSearchHistory() {
        try {
            const saved = localStorage.getItem('epo_search_history');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    }
    
    saveSearchHistory(query, totalResults) {
        const historyItem = {
            query: query,
            total_results: totalResults,
            timestamp: new Date().toISOString(),
            date_str: new Date().toLocaleString('zh-CN')
        };
        
        this.searchHistory = this.searchHistory.filter(h => h.query !== query);
        this.searchHistory.unshift(historyItem);
        
        if (this.searchHistory.length > 20) {
            this.searchHistory = this.searchHistory.slice(0, 20);
        }
        
        localStorage.setItem('epo_search_history', JSON.stringify(this.searchHistory));
        this.renderSearchHistory();
    }
    
    clearSearchHistory() {
        this.searchHistory = [];
        localStorage.removeItem('epo_search_history');
        this.renderSearchHistory();
    }
    
    renderSearchHistory() {
        const container = document.getElementById('epo-history-list');
        if (!container) return;
        
        if (this.searchHistory.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">暂无检索记录</div>';
            return;
        }
        
        container.innerHTML = this.searchHistory.map((item, index) => `
            <div class="epo-history-item" data-query="${this.escapeHtml(item.query)}">
                <div class="epo-history-query">${this.escapeHtml(item.query)}</div>
                <div class="epo-history-meta">
                    <span>${item.total_results.toLocaleString()} 条结果</span>
                    <span>${item.date_str}</span>
                </div>
            </div>
        `).join('');
        
        container.querySelectorAll('.epo-history-item').forEach(el => {
            el.addEventListener('click', () => {
                const query = el.dataset.query;
                const cqlInput = document.getElementById('cql-query-input');
                if (cqlInput) {
                    cqlInput.value = query;
                }
                this.switchSearchType('cql');
            });
        });
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    init() {
        this.bindEvents();
        this.loadQuotaInfo();
        this.loadCQLHelp();
        this.renderSearchHistory();
    }
    
    async loadQuotaInfo() {
        const statusEl = document.getElementById('epo-quota-status');
        const barContainer = document.getElementById('epo-quota-bar-container');
        const barEl = document.getElementById('epo-quota-bar');
        const bannerEl = document.getElementById('epo-quota-banner');
        
        if (!statusEl) return;
        
        try {
            const response = await fetch('/api/epo/quota');
            const data = await response.json();
            
            if (data.success && data.quota) {
                const quota = data.quota;
                
                if (!quota.configured) {
                    statusEl.innerHTML = '<span style="color: #f44336;">⚠️ API未配置</span>';
                    return;
                }
                
                if (quota.error) {
                    statusEl.innerHTML = `<span style="color: #f44336;">⚠️ ${quota.error}</span>`;
                    return;
                }
                
                const usedMB = quota.total_mb || 0;
                const remainingMB = quota.remaining_mb || 4096;
                const percent = quota.usage_percent || 0;
                const requests = quota.total_requests || 0;
                
                statusEl.innerHTML = `
                    <span>已用: <strong>${usedMB.toFixed(2)} MB</strong></span>
                    <span>剩余: <strong>${remainingMB.toFixed(2)} MB</strong></span>
                    <span>请求: <strong>${requests}</strong> 次</span>
                    <span>使用率: <strong>${percent.toFixed(1)}%</strong></span>
                `;
                
                if (barContainer && barEl) {
                    barContainer.style.display = 'block';
                    barEl.style.width = `${Math.min(percent, 100)}%`;
                    
                    if (percent >= 90) {
                        barEl.style.background = 'linear-gradient(90deg, #f44336, #ef5350)';
                        if (bannerEl) bannerEl.style.background = 'linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%)';
                    } else if (percent >= 70) {
                        barEl.style.background = 'linear-gradient(90deg, #ff9800, #ffc107)';
                        if (bannerEl) bannerEl.style.background = 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)';
                    }
                }
            }
        } catch (error) {
            console.error('加载配额信息失败:', error);
            if (statusEl) {
                statusEl.innerHTML = '<span style="color: #666;">配额信息加载失败</span>';
            }
        }
    }
    
    bindEvents() {
        const searchBtn = document.getElementById('epo-search-btn');
        const clearBtn = document.getElementById('epo-clear-btn');
        
        if (searchBtn) {
            searchBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.search();
            });
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearSearch();
            });
        }
        
        document.querySelectorAll('.search-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchSearchType(e.target.dataset.type);
            });
        });
        
        document.querySelectorAll('.quick-search-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const query = e.target.dataset.query;
                const cqlInput = document.getElementById('cql-query-input');
                if (cqlInput) {
                    cqlInput.value = query;
                }
                this.switchSearchType('cql');
            });
        });
        
        const addRowBtn = document.getElementById('add-search-row-btn');
        if (addRowBtn) {
            addRowBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.addSearchRow();
            });
        }
        
        const showCqlHelpBtn = document.getElementById('show-cql-help-btn');
        if (showCqlHelpBtn) {
            showCqlHelpBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const modal = document.getElementById('cql-help-modal');
                if (modal) modal.style.display = 'flex';
            });
        }
        
        const closeCqlHelp = document.getElementById('close-cql-help');
        if (closeCqlHelp) {
            closeCqlHelp.addEventListener('click', (e) => {
                e.preventDefault();
                const modal = document.getElementById('cql-help-modal');
                if (modal) modal.style.display = 'none';
            });
        }
        
        const closeEpoModal = document.getElementById('close-epo-modal');
        if (closeEpoModal) {
            closeEpoModal.addEventListener('click', (e) => {
                e.preventDefault();
                const modal = document.getElementById('epo-detail-modal');
                if (modal) modal.style.display = 'none';
            });
        }
        
        const closeDetailBtn = document.getElementById('close-detail-btn');
        if (closeDetailBtn) {
            closeDetailBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const modal = document.getElementById('epo-detail-modal');
                if (modal) modal.style.display = 'none';
            });
        }
        
        const analyzeBtn = document.getElementById('analyze-patent-btn');
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.analyzePatent();
            });
        }
        
        const closeAnalysisModal = document.getElementById('close-analysis-modal');
        if (closeAnalysisModal) {
            closeAnalysisModal.addEventListener('click', (e) => {
                e.preventDefault();
                const modal = document.getElementById('ai-analysis-modal');
                if (modal) modal.style.display = 'none';
            });
        }
        
        const closeAnalysisBtn = document.getElementById('close-analysis-btn');
        if (closeAnalysisBtn) {
            closeAnalysisBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const modal = document.getElementById('ai-analysis-modal');
                if (modal) modal.style.display = 'none';
            });
        }
        
        const copyAnalysisBtn = document.getElementById('copy-analysis-btn');
        if (copyAnalysisBtn) {
            copyAnalysisBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.copyAnalysis();
            });
        }
        
        const clearDateBtn = document.getElementById('clear-date-btn');
        if (clearDateBtn) {
            clearDateBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const dateFrom = document.getElementById('date-from');
                const dateTo = document.getElementById('date-to');
                if (dateFrom) dateFrom.value = '';
                if (dateTo) dateTo.value = '';
            });
        }
        
        const resultsPerPage = document.getElementById('results-per-page');
        if (resultsPerPage) {
            resultsPerPage.addEventListener('change', (e) => {
                this.resultsPerPage = parseInt(e.target.value);
            });
        }
        
        const simpleInput = document.getElementById('simple-keyword-input');
        if (simpleInput) {
            simpleInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.search();
                }
            });
        }
        
        const cqlInput = document.getElementById('cql-query-input');
        if (cqlInput) {
            cqlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    this.search();
                }
            });
        }
        
        const clearHistoryBtn = document.getElementById('epo-clear-history-btn');
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('确定要清除所有检索历史记录吗？')) {
                    this.clearSearchHistory();
                }
            });
        }
        
        const exportResultsBtn = document.getElementById('export-results-btn');
        if (exportResultsBtn) {
            exportResultsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.exportResults();
            });
        }
    }
    
    switchSearchType(type) {
        document.querySelectorAll('.search-type-btn').forEach(btn => {
            btn.classList.remove('epo-active');
        });
        
        const activeBtn = document.querySelector(`.search-type-btn[data-type="${type}"]`);
        if (activeBtn) {
            activeBtn.classList.add('epo-active');
        }
        
        document.querySelectorAll('.search-panel').forEach(panel => {
            panel.style.display = 'none';
        });
        
        const targetPanel = document.getElementById(`${type}-search-panel`);
        if (targetPanel) {
            targetPanel.style.display = 'block';
        }
    }
    
    addSearchRow() {
        const container = document.getElementById('advanced-search-rows');
        if (!container) return;
        
        const row = document.createElement('div');
        row.className = 'adv-row';
        row.innerHTML = `
            <select class="adv-field epo-select-sm">
                <option value="ta">标题</option>
                <option value="ab">摘要</option>
                <option value="cl">权利要求</option>
                <option value="de">说明书</option>
                <option value="pa">申请人</option>
                <option value="in">发明人</option>
                <option value="cpc">CPC分类</option>
                <option value="ipc">IPC分类</option>
            </select>
            <select class="adv-operator epo-select-sm">
                <option value="AND">AND</option>
                <option value="OR">OR</option>
                <option value="NOT">NOT</option>
            </select>
            <input type="text" class="adv-keyword epo-input-sm" placeholder="关键词">
            <button type="button" class="remove-row-btn epo-btn-danger">×</button>
        `;
        
        container.appendChild(row);
        
        row.querySelector('.remove-row-btn').addEventListener('click', (e) => {
            e.preventDefault();
            row.remove();
            this.updateRemoveButtons();
        });
        
        this.updateRemoveButtons();
    }
    
    updateRemoveButtons() {
        const container = document.getElementById('advanced-search-rows');
        if (!container) return;
        
        const rows = container.querySelectorAll('.adv-row');
        rows.forEach((row, index) => {
            const btn = row.querySelector('.remove-row-btn');
            if (btn) {
                btn.style.display = rows.length > 1 ? 'block' : 'none';
            }
        });
    }
    
    buildQuery() {
        const activeBtn = document.querySelector('.search-type-btn.epo-active');
        const activeType = activeBtn ? activeBtn.dataset.type : 'simple';
        let query = '';
        
        if (activeType === 'simple') {
            const field = document.getElementById('simple-field-select');
            const keyword = document.getElementById('simple-keyword-input');
            const fieldVal = field ? field.value : 'ta';
            const keywordVal = keyword ? keyword.value.trim() : '';
            if (keywordVal) {
                query = `${fieldVal}=${keywordVal}`;
            }
        } else if (activeType === 'advanced') {
            const rows = document.querySelectorAll('.adv-row');
            const parts = [];
            
            rows.forEach((row, index) => {
                const fieldEl = row.querySelector('.adv-field');
                const operatorEl = row.querySelector('.adv-operator');
                const keywordEl = row.querySelector('.adv-keyword');
                
                const field = fieldEl ? fieldEl.value : 'ta';
                const operator = operatorEl ? operatorEl.value : 'AND';
                const keyword = keywordEl ? keywordEl.value.trim() : '';
                
                if (keyword) {
                    if (index > 0) {
                        parts.push(operator);
                    }
                    parts.push(`${field}=${keyword}`);
                }
            });
            
            query = parts.join(' ');
        } else if (activeType === 'cql') {
            const cqlInput = document.getElementById('cql-query-input');
            query = cqlInput ? cqlInput.value.trim() : '';
        }
        
        const dateFrom = document.getElementById('date-from');
        const dateTo = document.getElementById('date-to');
        const dateFromVal = dateFrom ? dateFrom.value : '';
        const dateToVal = dateTo ? dateTo.value : '';
        
        if (dateFromVal && dateToVal) {
            const dateQuery = `pd=${dateFromVal.replace(/-/g, '')}..${dateToVal.replace(/-/g, '')}`;
            query = query ? `${query} AND ${dateQuery}` : dateQuery;
        } else if (dateFromVal) {
            const dateQuery = `pd>=${dateFromVal.replace(/-/g, '')}`;
            query = query ? `${query} AND ${dateQuery}` : dateQuery;
        } else if (dateToVal) {
            const dateQuery = `pd<=${dateToVal.replace(/-/g, '')}`;
            query = query ? `${query} AND ${dateQuery}` : dateQuery;
        }
        
        return query;
    }
    
    async search(page = 1) {
        console.log('[EPO Search] search() called, page:', page);
        
        if (window.guestModeRestrictions && !window.guestModeRestrictions.checkEPOSearch()) {
            return;
        }
        
        const query = this.buildQuery();
        console.log('[EPO Search] built query:', query);
        
        if (!query) {
            this.showToast('请输入检索条件', 'warning');
            return;
        }
        
        this.currentQuery = query;
        this.currentPage = page;
        
        const searchBtn = document.getElementById('epo-search-btn');
        if (searchBtn) {
            searchBtn.disabled = true;
            searchBtn.innerHTML = '<span style="display:inline-block;animation:spin 1s linear infinite;">⏳</span> 检索中...';
        }
        
        try {
            const rangeStart = (page - 1) * this.resultsPerPage + 1;
            const rangeEnd = page * this.resultsPerPage;
            
            console.log('[EPO Search] Sending request to /api/epo/search (quick mode)');
            
            // 第一步：快速模式搜索，只获取专利号
            const response = await fetch('/api/epo/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: query,
                    range_start: rangeStart,
                    range_end: rangeEnd,
                    quick_mode: true  // 快速模式
                })
            });
            
            const data = await response.json();
            console.log('[EPO Search] Quick search response:', data);
            
            if (data.success) {
                this.searchResults = data.results;
                this.totalResults = data.total_results;
                
                // 立即显示基本结果（只有专利号）
                this.displayResultsQuick(data.results, data.total_results);
                this.saveSearchHistory(query, data.total_results);
                
                // 第二步：逐步加载每个专利的详细信息
                this.loadDetailsProgressively(data.results);
            } else {
                this.showToast(data.error || '检索失败', 'error');
            }
        } catch (error) {
            console.error('检索错误:', error);
            this.showToast('检索请求失败: ' + error.message, 'error');
        } finally {
            if (searchBtn) {
                searchBtn.disabled = false;
                searchBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right: 6px; vertical-align: middle;">
                        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                    </svg>
                    开始检索
                `;
            }
        }
    }
    
    displayResultsQuick(results, total) {
        const resultsList = document.getElementById('epo-results-list');
        const resultsCount = document.getElementById('epo-results-count');
        
        if (resultsCount) {
            resultsCount.textContent = `找到 ${total} 条结果`;
        }
        
        if (!resultsList) return;
        
        // 快速显示基本结果
        resultsList.innerHTML = results.map((r, index) => `
            <div class="epo-result-item" data-index="${index}" data-patent-number="${r.patent_number}">
                <div class="epo-result-header">
                    <span class="epo-result-number">${r.patent_number || '加载中...'}</span>
                    <span class="epo-result-date">${r.publication_date || ''}</span>
                </div>
                <div class="epo-result-title" style="color: #666;">正在加载详细信息...</div>
                <div class="epo-result-abstract" style="color: #999;">请稍候...</div>
                <div class="epo-result-meta">
                    <span class="loading-indicator">
                        <span style="display:inline-block;animation:spin 1s linear infinite;">⏳</span> 加载中...
                    </span>
                </div>
            </div>
        `).join('');
        
        // 绑定点击事件
        resultsList.querySelectorAll('.epo-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                this.showPatentDetail(index);
            });
        });
    }
    
    async loadDetailsProgressively(results) {
        const resultsList = document.getElementById('epo-results-list');
        if (!resultsList) return;
        
        // 逐个加载详细信息
        for (let i = 0; i < results.length; i++) {
            const r = results[i];
            const itemEl = resultsList.querySelector(`[data-index="${i}"]`);
            
            if (!itemEl) continue;
            
            try {
                // 获取单个专利的详细信息
                const response = await fetch(`/api/epo/brief/${encodeURIComponent(r.patent_number)}`);
                const data = await response.json();
                
                if (data.success && data.result) {
                    const detail = data.result;
                    
                    // 更新搜索结果数组
                    this.searchResults[i] = detail;
                    
                    // 更新DOM
                    const titleEl = itemEl.querySelector('.epo-result-title');
                    const abstractEl = itemEl.querySelector('.epo-result-abstract');
                    const metaEl = itemEl.querySelector('.epo-result-meta');
                    const dateEl = itemEl.querySelector('.epo-result-date');
                    
                    if (titleEl) {
                        titleEl.textContent = detail.title || '无标题';
                        titleEl.style.color = '#333';
                    }
                    
                    if (abstractEl) {
                        abstractEl.textContent = detail.abstract ? 
                            (detail.abstract.length > 200 ? detail.abstract.substring(0, 200) + '...' : detail.abstract) : 
                            '无摘要';
                        abstractEl.style.color = '#666';
                    }
                    
                    if (dateEl) {
                        dateEl.textContent = detail.publication_date || '';
                    }
                    
                    if (metaEl) {
                        metaEl.innerHTML = `
                            ${(detail.applicants || []).slice(0, 2).map(a => `<span class="epo-tag">${a}</span>`).join('')}
                            ${(detail.cpc_classifications || []).slice(0, 2).map(c => `<span class="epo-tag epo-tag-cpc">${c}</span>`).join('')}
                        `;
                    }
                }
            } catch (error) {
                console.error(`加载专利 ${r.patent_number} 详情失败:`, error);
            }
            
            // 每加载完一个，暂停一下，避免请求过快
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    displayResults(results, total) {
        const resultsSection = document.getElementById('epo-results-section');
        const resultsList = document.getElementById('epo-results-list');
        const totalCount = document.getElementById('epo-total-count');
        
        if (resultsSection) resultsSection.style.display = 'block';
        if (totalCount) totalCount.textContent = `(共 ${total.toLocaleString()} 条结果)`;
        
        if (!resultsList) return;
        
        if (results.length === 0) {
            resultsList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <p>未找到匹配的专利</p>
                    <p style="font-size: 13px; margin-top: 8px;">请尝试调整检索条件</p>
                </div>
            `;
            return;
        }
        
        resultsList.innerHTML = results.map(result => this.renderResultItem(result)).join('');
        
        this.renderPagination();
        
        resultsList.querySelectorAll('.epo-result-title').forEach(el => {
            el.addEventListener('click', () => {
                this.showDetail(el.dataset.patentNumber);
            });
        });
        
        resultsList.querySelectorAll('.view-detail-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.showDetail(btn.dataset.patentNumber);
            });
        });
        
        resultsList.querySelectorAll('.quick-analyze-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.quickAnalyze(btn.dataset.patentNumber);
            });
        });
    }
    
    renderResultItem(result) {
        const safeText = (val) => {
            if (val === null || val === undefined) return '-';
            if (typeof val === 'string') return val;
            if (typeof val === 'object') {
                if (val.$) return val.$;
                if (val['$']) return val['$'];
                return JSON.stringify(val);
            }
            return String(val);
        };
        
        const safeArray = (arr) => {
            if (!Array.isArray(arr)) return [];
            return arr.map(item => {
                if (typeof item === 'string') return item;
                if (typeof item === 'object' && item !== null) {
                    if (item.$) return item.$;
                    if (item['$']) return item['$'];
                    return JSON.stringify(item);
                }
                return String(item);
            }).filter(item => item && item !== '{}');
        };
        
        const classifications = [
            ...safeArray(result.cpc_classifications).slice(0, 3),
            ...safeArray(result.ipc_classifications).slice(0, 2)
        ].map(c => `<span class="epo-classification-tag">${c}</span>`).join('');
        
        const applicants = safeArray(result.applicants);
        const inventors = safeArray(result.inventors);
        
        const drawingHtml = result.first_drawing_url 
            ? `<div class="epo-result-drawing">
                <img src="${safeText(result.first_drawing_url)}" alt="附图" onerror="this.parentElement.style.display='none'" />
               </div>`
            : '';
        
        return `
            <div class="epo-result-item">
                <div class="epo-result-content">
                    ${drawingHtml}
                    <div class="epo-result-info">
                        <div class="epo-result-header">
                            <span class="epo-result-patent-number">${safeText(result.patent_number)}</span>
                            <span style="font-size: 12px; color: #999;">公开日期: ${safeText(result.publication_date)}</span>
                        </div>
                        <div class="epo-result-title" data-patent-number="${safeText(result.patent_number)}">
                            ${safeText(result.title) || '无标题'}
                        </div>
                        <div class="epo-result-meta">
                            <span>申请人: ${applicants.slice(0, 2).join(', ') || '-'}${applicants.length > 2 ? ' 等' : ''}</span>
                            <span>发明人: ${inventors.slice(0, 2).join(', ') || '-'}${inventors.length > 2 ? ' 等' : ''}</span>
                        </div>
                        <div class="epo-result-abstract">
                            ${safeText(result.abstract) || '无摘要'}
                        </div>
                        <div class="epo-result-classifications">
                            ${classifications}
                        </div>
                    </div>
                </div>
                <div class="epo-result-actions">
                    <button type="button" class="view-detail-btn epo-btn-primary" data-patent-number="${safeText(result.patent_number)}">
                        查看详情
                    </button>
                    <button type="button" class="quick-analyze-btn epo-btn-secondary" data-patent-number="${safeText(result.patent_number)}">
                        AI解读
                    </button>
                    <a href="${safeText(result.url) || '#'}" target="_blank" class="epo-btn-info" style="text-decoration: none; display: inline-block;">
                        Google Patents
                    </a>
                </div>
            </div>
        `;
    }
    
    renderPagination() {
        const pagination = document.getElementById('epo-pagination');
        if (!pagination) return;
        
        const totalPages = Math.ceil(this.totalResults / this.resultsPerPage);
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        let html = '';
        
        if (this.currentPage > 1) {
            html += `<button type="button" class="page-btn" data-page="${this.currentPage - 1}">上一页</button>`;
        }
        
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);
        
        if (startPage > 1) {
            html += `<button type="button" class="page-btn" data-page="1">1</button>`;
            if (startPage > 2) html += `<span style="padding: 0 8px; color: #666;">...</span>`;
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === this.currentPage ? ' active' : '';
            html += `<button type="button" class="page-btn${activeClass}" data-page="${i}">${i}</button>`;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) html += `<span style="padding: 0 8px; color: #666;">...</span>`;
            html += `<button type="button" class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
        }
        
        if (this.currentPage < totalPages) {
            html += `<button type="button" class="page-btn" data-page="${this.currentPage + 1}">下一页</button>`;
        }
        
        pagination.innerHTML = html;
        
        pagination.querySelectorAll('.page-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.search(parseInt(btn.dataset.page));
            });
        });
    }
    
    async showDetail(patentNumber) {
        this.currentPatentNumber = patentNumber;
        
        const modal = document.getElementById('epo-detail-modal');
        const content = document.getElementById('epo-detail-content');
        const title = document.getElementById('epo-detail-title');
        
        if (!modal || !content) return;
        
        modal.style.display = 'flex';
        content.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">加载中...</div>';
        if (title) title.textContent = patentNumber;
        
        try {
            const response = await fetch(`/api/epo/detail/${patentNumber}?endpoint=biblio`);
            const data = await response.json();
            
            if (data.success && data.detail) {
                this.displayDetail(data.detail);
            } else {
                content.innerHTML = `<p style="color: #f44336;">获取详情失败: ${data.error || '未知错误'}</p>`;
            }
        } catch (error) {
            content.innerHTML = `<p style="color: #f44336;">请求失败: ${error.message}</p>`;
        }
    }
    
    displayDetail(detail) {
        const content = document.getElementById('epo-detail-content');
        if (!content) return;
        
        const claimsHtml = (detail.claims && detail.claims.length > 0) 
            ? `<div>
                <h4 style="margin: 0 0 8px 0; color: #333;">权利要求</h4>
                <div style="max-height: 300px; overflow-y: auto; font-size: 13px; line-height: 1.8; color: #555; padding: 12px; background: #f8f9fa; border-radius: 6px;">
                    ${detail.claims.map((c, i) => `<p style="margin: 8px 0;"><strong>${i + 1}.</strong> ${c}</p>`).join('')}
                </div>
               </div>`
            : '';
        
        const cpcHtml = (detail.cpc_classifications && detail.cpc_classifications.length > 0)
            ? (detail.cpc_classifications).map(c => `<span class="epo-classification-tag">${c}</span>`).join('')
            : '<span style="color: #999;">无</span>';
        
        const ipcHtml = (detail.ipc_classifications && detail.ipc_classifications.length > 0)
            ? (detail.ipc_classifications).map(c => `<span class="epo-classification-tag">${c}</span>`).join('')
            : '<span style="color: #999;">无</span>';
        
        const drawingHtml = detail.first_drawing_url 
            ? `<div style="margin-bottom: 16px;">
                <h4 style="margin: 0 0 8px 0; color: #333;">首张附图</h4>
                <div style="max-width: 300px; border: 1px solid #e0e0e0; border-radius: 6px; overflow: hidden;">
                    <img src="${detail.first_drawing_url}" alt="附图" style="width: 100%; display: block;" onerror="this.parentElement.style.display='none'" />
                </div>
               </div>`
            : '';
        
        content.innerHTML = `
            <div style="display: grid; gap: 16px;">
                ${drawingHtml}
                
                <div>
                    <h4 style="margin: 0 0 8px 0; color: #333;">标题</h4>
                    <p style="margin: 0; font-size: 15px;">${detail.title || '-'}</p>
                </div>
                
                <div>
                    <h4 style="margin: 0 0 8px 0; color: #333;">摘要</h4>
                    <p style="margin: 0; font-size: 14px; line-height: 1.8; color: #555;">${detail.abstract || '-'}</p>
                </div>
                
                ${claimsHtml}
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div>
                        <h4 style="margin: 0 0 8px 0; color: #333;">申请人</h4>
                        <p style="margin: 0; font-size: 14px;">${(detail.applicants || []).join(', ') || '-'}</p>
                    </div>
                    <div>
                        <h4 style="margin: 0 0 8px 0; color: #333;">发明人</h4>
                        <p style="margin: 0; font-size: 14px;">${(detail.inventors || []).join(', ') || '-'}</p>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                    <div>
                        <h4 style="margin: 0 0 8px 0; color: #333;">公开日期</h4>
                        <p style="margin: 0;">${detail.publication_date || '-'}</p>
                    </div>
                    <div>
                        <h4 style="margin: 0 0 8px 0; color: #333;">申请日期</h4>
                        <p style="margin: 0;">${detail.application_date || '-'}</p>
                    </div>
                    <div>
                        <h4 style="margin: 0 0 8px 0; color: #333;">优先权日</h4>
                        <p style="margin: 0;">${detail.priority_date || '-'}</p>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div>
                        <h4 style="margin: 0 0 8px 0; color: #333;">CPC分类</h4>
                        <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                            ${cpcHtml}
                        </div>
                    </div>
                    <div>
                        <h4 style="margin: 0 0 8px 0; color: #333;">IPC分类</h4>
                        <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                            ${ipcHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const viewOnGoogleBtn = document.getElementById('view-on-google-btn');
        if (viewOnGoogleBtn) {
            viewOnGoogleBtn.onclick = () => {
                window.open(`https://patents.google.com/patent/${this.currentPatentNumber}`, '_blank');
            };
        }
    }
    
    async quickAnalyze(patentNumber) {
        this.currentPatentNumber = patentNumber;
        await this.analyzePatent();
    }
    
    async analyzePatent() {
        if (window.guestModeRestrictions && !window.guestModeRestrictions.checkEPOAnalyze()) {
            return;
        }
        
        if (!this.currentPatentNumber) {
            this.showToast('请先选择要解读的专利', 'warning');
            return;
        }
        
        const modelSelect = document.getElementById('epo-model-select');
        const model = modelSelect ? modelSelect.value : 'glm-4-flash';
        const analyzeBtn = document.getElementById('analyze-patent-btn');
        
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
            analyzeBtn.textContent = '解读中...';
        }
        
        const modal = document.getElementById('ai-analysis-modal');
        const content = document.getElementById('ai-analysis-content');
        
        if (modal) modal.style.display = 'flex';
        if (content) content.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">AI正在分析...</div>';
        
        try {
            const response = await fetch('/api/epo/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patent_number: this.currentPatentNumber,
                    template: 'technical_summary',
                    model: model
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                if (content) content.textContent = data.analysis;
            } else {
                if (content) content.textContent = `解读失败: ${data.error || '未知错误'}`;
            }
        } catch (error) {
            if (content) content.textContent = `请求失败: ${error.message}`;
        } finally {
            if (analyzeBtn) {
                analyzeBtn.disabled = false;
                analyzeBtn.textContent = 'AI解读';
            }
        }
    }
    
    copyAnalysis() {
        const content = document.getElementById('ai-analysis-content');
        if (content) {
            navigator.clipboard.writeText(content.textContent).then(() => {
                this.showToast('已复制到剪贴板', 'success');
            });
        }
    }
    
    exportResults() {
        if (this.searchResults.length === 0) {
            this.showToast('没有可导出的结果', 'warning');
            return;
        }
        
        const headers = ['专利号', '标题', '摘要', '申请人', '发明人', '公开日期', '申请日期', 'CPC分类', 'IPC分类', '链接'];
        const rows = this.searchResults.map(r => [
            r.patent_number || '',
            r.title || '',
            (r.abstract || '').replace(/[\n\r]/g, ' '),
            (r.applicants || []).join('; '),
            (r.inventors || []).join('; '),
            r.publication_date || '',
            r.application_date || '',
            (r.cpc_classifications || []).join('; '),
            (r.ipc_classifications || []).join('; '),
            r.url || ''
        ]);
        
        // 生成 HTML 表格格式的 Excel 文件
        let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
        html += '<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>';
        html += '<x:Name>专利检索结果</x:Name>';
        html += '<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>';
        html += '<body><table border="1">';
        
        // 表头
        html += '<tr style="background-color: #4472C4; color: white; font-weight: bold;">';
        headers.forEach(h => {
            html += `<td style="padding: 8px;">${h}</td>`;
        });
        html += '</tr>';
        
        // 数据行
        rows.forEach(row => {
            html += '<tr>';
            row.forEach(cell => {
                html += `<td style="padding: 6px;">${this.escapeHtml(cell)}</td>`;
            });
            html += '</tr>';
        });
        
        html += '</table></body></html>';
        
        const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `专利检索结果_${new Date().toISOString().slice(0, 10)}.xls`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.showToast(`已导出 ${this.searchResults.length} 条结果为 Excel 文件`, 'success');
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    clearSearch() {
        const simpleInput = document.getElementById('simple-keyword-input');
        const cqlInput = document.getElementById('cql-query-input');
        const dateFrom = document.getElementById('date-from');
        const dateTo = document.getElementById('date-to');
        const resultsSection = document.getElementById('epo-results-section');
        
        if (simpleInput) simpleInput.value = '';
        if (cqlInput) cqlInput.value = '';
        if (dateFrom) dateFrom.value = '';
        if (dateTo) dateTo.value = '';
        
        const container = document.getElementById('advanced-search-rows');
        if (container) {
            container.innerHTML = `
                <div class="adv-row">
                    <select class="adv-field epo-select-sm">
                        <option value="ta">标题</option>
                        <option value="ab">摘要</option>
                        <option value="cl">权利要求</option>
                        <option value="de">说明书</option>
                        <option value="pa">申请人</option>
                        <option value="in">发明人</option>
                        <option value="cpc">CPC分类</option>
                        <option value="ipc">IPC分类</option>
                    </select>
                    <select class="adv-operator epo-select-sm">
                        <option value="AND">AND</option>
                        <option value="OR">OR</option>
                        <option value="NOT">NOT</option>
                    </select>
                    <input type="text" class="adv-keyword epo-input-sm" placeholder="关键词">
                    <button type="button" class="remove-row-btn epo-btn-danger" style="display: none;">×</button>
                </div>
            `;
        }
        
        if (resultsSection) resultsSection.style.display = 'none';
        this.searchResults = [];
        this.totalResults = 0;
    }
    
    async loadCQLHelp() {
        try {
            const response = await fetch('/api/epo/cql-help');
            const data = await response.json();
            
            if (data.success) {
                this.cqlHelpData = data.help;
                this.displayCQLHelp(data.help);
            }
        } catch (error) {
            console.error('加载CQL帮助失败:', error);
        }
    }
    
    displayCQLHelp(help) {
        const content = document.getElementById('cql-help-content');
        if (!content) return;
        
        content.innerHTML = `
            <div style="display: grid; gap: 20px;">
                <div>
                    <h4 style="margin: 0 0 12px 0; color: #333;">检索字段</h4>
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead>
                            <tr style="background: #f5f5f5;">
                                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">字段代码</th>
                                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">含义</th>
                                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">示例</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(help.fields || []).map(f => `
                                <tr>
                                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: 600; color: #1976d2;">${f.code}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">${f.name}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd; font-family: monospace; color: #666;">${f.example}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div>
                    <h4 style="margin: 0 0 12px 0; color: #333;">运算符</h4>
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead>
                            <tr style="background: #f5f5f5;">
                                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">运算符</th>
                                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">说明</th>
                                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">示例</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(help.operators || []).map(o => `
                                <tr>
                                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: 600;">${o.operator}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">${o.description}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd; font-family: monospace; color: #666;">${o.example}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div>
                    <h4 style="margin: 0 0 12px 0; color: #333;">检索示例</h4>
                    <div style="display: grid; gap: 8px;">
                        ${(help.examples || []).map(e => `
                            <div style="padding: 12px; background: #f8f9fa; border-radius: 6px; cursor: pointer;" class="cql-example" data-query="${e.query}">
                                <div style="font-weight: 500; margin-bottom: 4px;">${e.name}</div>
                                <div style="font-family: monospace; font-size: 12px; color: #1976d2; margin-bottom: 4px;">${e.query}</div>
                                <div style="font-size: 12px; color: #666;">${e.description}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        content.querySelectorAll('.cql-example').forEach(el => {
            el.addEventListener('click', () => {
                const cqlInput = document.getElementById('cql-query-input');
                if (cqlInput) cqlInput.value = el.dataset.query;
                const modal = document.getElementById('cql-help-modal');
                if (modal) modal.style.display = 'none';
            });
        });
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `epo-toast epo-toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

let epoSearchModule = null;

function initEPOSearchModule() {
    const container = document.getElementById('epo_search-tab');
    if (!container) {
        console.warn('[EPO Search] 组件容器未找到，等待组件加载...');
        return false;
    }
    
    if (!epoSearchModule) {
        epoSearchModule = new EPOSearchModule();
        window.epoSearchModule = epoSearchModule;
        console.log('✓ EPO Search module initialized');
        return true;
    }
    return true;
}

window.initEPOSearchModule = initEPOSearchModule;

document.addEventListener('eposearchcomponentLoaded', () => {
    console.log('[EPO Search] 组件加载完成事件触发，开始初始化...');
    setTimeout(() => {
        initEPOSearchModule();
    }, 100);
});
