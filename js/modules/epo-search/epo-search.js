/**
 * 全球专利智能检索模块
 * 功能：CQL检索、结果展示、详情获取、AI解读
 */

class EPOSearchModule {
    constructor() {
        this.currentQuery = '';
        this.currentPage = 1;
        this.resultsPerPage = 25;
        this.totalResults = 0;
        this.searchResults = [];
        this.currentPatentNumber = null;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadQuotaInfo();
        this.loadCQLHelp();
    }
    
    bindEvents() {
        document.getElementById('epo-search-btn')?.addEventListener('click', () => this.search());
        document.getElementById('epo-clear-btn')?.addEventListener('click', () => this.clearSearch());
        
        document.querySelectorAll('.search-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchSearchType(e.target.dataset.type));
        });
        
        document.querySelectorAll('.quick-search-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const query = e.target.dataset.query;
                document.getElementById('cql-query-input').value = query;
                this.switchSearchType('cql');
            });
        });
        
        document.getElementById('add-search-row-btn')?.addEventListener('click', () => this.addSearchRow());
        
        document.getElementById('show-cql-help-btn')?.addEventListener('click', () => {
            document.getElementById('cql-help-modal').style.display = 'flex';
        });
        
        document.getElementById('close-cql-help')?.addEventListener('click', () => {
            document.getElementById('cql-help-modal').style.display = 'none';
        });
        
        document.getElementById('close-epo-modal')?.addEventListener('click', () => {
            document.getElementById('epo-detail-modal').style.display = 'none';
        });
        
        document.getElementById('close-detail-btn')?.addEventListener('click', () => {
            document.getElementById('epo-detail-modal').style.display = 'none';
        });
        
        document.getElementById('analyze-patent-btn')?.addEventListener('click', () => this.analyzePatent());
        
        document.getElementById('close-analysis-modal')?.addEventListener('click', () => {
            document.getElementById('ai-analysis-modal').style.display = 'none';
        });
        
        document.getElementById('close-analysis-btn')?.addEventListener('click', () => {
            document.getElementById('ai-analysis-modal').style.display = 'none';
        });
        
        document.getElementById('copy-analysis-btn')?.addEventListener('click', () => this.copyAnalysis());
        
        document.getElementById('clear-date-btn')?.addEventListener('click', () => {
            document.getElementById('date-from').value = '';
            document.getElementById('date-to').value = '';
        });
        
        document.getElementById('results-per-page')?.addEventListener('change', (e) => {
            this.resultsPerPage = parseInt(e.target.value);
        });
        
        document.getElementById('simple-keyword-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.search();
        });
        
        document.getElementById('cql-query-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) this.search();
        });
    }
    
    switchSearchType(type) {
        document.querySelectorAll('.search-type-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.style.background = 'white';
            btn.style.color = '#666';
            btn.style.borderColor = '#ddd';
        });
        
        const activeBtn = document.querySelector(`.search-type-btn[data-type="${type}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
            activeBtn.style.background = 'var(--primary-color)';
            activeBtn.style.color = 'white';
            activeBtn.style.borderColor = 'var(--primary-color)';
        }
        
        document.querySelectorAll('.search-panel').forEach(panel => {
            panel.style.display = 'none';
        });
        
        document.getElementById(`${type}-search-panel`).style.display = 'block';
    }
    
    addSearchRow() {
        const container = document.getElementById('advanced-search-rows');
        const rowCount = container.children.length;
        
        const row = document.createElement('div');
        row.className = 'advanced-search-row';
        row.style.cssText = 'display: flex; gap: 8px; margin-bottom: 10px; align-items: center;';
        
        row.innerHTML = `
            <select class="adv-field" style="padding: 8px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">
                <option value="ta">标题</option>
                <option value="ab">摘要</option>
                <option value="cl">权利要求</option>
                <option value="de">说明书</option>
                <option value="pa">申请人</option>
                <option value="in">发明人</option>
                <option value="cpc">CPC分类</option>
                <option value="ipc">IPC分类</option>
            </select>
            <select class="adv-operator" style="padding: 8px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">
                <option value="AND">AND</option>
                <option value="OR">OR</option>
                <option value="NOT">NOT</option>
            </select>
            <input type="text" class="adv-keyword" placeholder="关键词" style="flex: 1; padding: 8px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">
            <button class="remove-row-btn" style="padding: 6px 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">×</button>
        `;
        
        container.appendChild(row);
        
        row.querySelector('.remove-row-btn').addEventListener('click', () => {
            row.remove();
        });
        
        container.querySelectorAll('.remove-row-btn').forEach(btn => {
            btn.style.display = 'block';
        });
        
        if (container.children.length === 1) {
            container.querySelector('.remove-row-btn').style.display = 'none';
        }
    }
    
    buildQuery() {
        const activeType = document.querySelector('.search-type-btn.active')?.dataset.type || 'simple';
        let query = '';
        
        if (activeType === 'simple') {
            const field = document.getElementById('simple-field-select').value;
            const keyword = document.getElementById('simple-keyword-input').value.trim();
            if (keyword) {
                query = `${field}=${keyword}`;
            }
        } else if (activeType === 'advanced') {
            const rows = document.querySelectorAll('.advanced-search-row');
            const parts = [];
            
            rows.forEach((row, index) => {
                const field = row.querySelector('.adv-field').value;
                const operator = row.querySelector('.adv-operator').value;
                const keyword = row.querySelector('.adv-keyword').value.trim();
                
                if (keyword) {
                    if (index > 0) {
                        parts.push(operator);
                    }
                    parts.push(`${field}=${keyword}`);
                }
            });
            
            query = parts.join(' ');
        } else if (activeType === 'cql') {
            query = document.getElementById('cql-query-input').value.trim();
        }
        
        const dateFrom = document.getElementById('date-from').value;
        const dateTo = document.getElementById('date-to').value;
        
        if (dateFrom && dateTo) {
            const dateQuery = `pd=${dateFrom.replace(/-/g, '')}..${dateTo.replace(/-/g, '')}`;
            query = query ? `${query} AND ${dateQuery}` : dateQuery;
        } else if (dateFrom) {
            const dateQuery = `pd>=${dateFrom.replace(/-/g, '')}`;
            query = query ? `${query} AND ${dateQuery}` : dateQuery;
        } else if (dateTo) {
            const dateQuery = `pd<=${dateTo.replace(/-/g, '')}`;
            query = query ? `${query} AND ${dateQuery}` : dateQuery;
        }
        
        return query;
    }
    
    async search(page = 1) {
        const query = this.buildQuery();
        
        if (!query) {
            this.showToast('请输入检索条件', 'warning');
            return;
        }
        
        this.currentQuery = query;
        this.currentPage = page;
        
        const searchBtn = document.getElementById('epo-search-btn');
        searchBtn.disabled = true;
        searchBtn.innerHTML = '<span class="spinner"></span> 检索中...';
        
        try {
            const rangeStart = (page - 1) * this.resultsPerPage + 1;
            const rangeEnd = page * this.resultsPerPage;
            
            const response = await fetch('/api/epo/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: query,
                    range_start: rangeStart,
                    range_end: rangeEnd
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.searchResults = data.results;
                this.totalResults = data.total_results;
                this.displayResults(data.results, data.total_results);
                this.updateQuotaInfo(data.quota_info);
            } else {
                this.showToast(data.error || '检索失败', 'error');
            }
        } catch (error) {
            console.error('检索错误:', error);
            this.showToast('检索请求失败: ' + error.message, 'error');
        } finally {
            searchBtn.disabled = false;
            searchBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right: 6px;">
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                </svg>
                开始检索
            `;
        }
    }
    
    displayResults(results, total) {
        const resultsSection = document.getElementById('epo-results-section');
        const resultsList = document.getElementById('epo-results-list');
        const totalCount = document.getElementById('epo-total-count');
        
        resultsSection.style.display = 'block';
        totalCount.textContent = `(共 ${total.toLocaleString()} 条结果)`;
        
        if (results.length === 0) {
            resultsList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16" style="margin-bottom: 16px; opacity: 0.5;">
                        <path d="M7.5 1a.5.5 0 0 0-.5.5v3a.5.5 0 0 1-.5.5h-3a.5.5 0 0 0 0 1h3a.5.5 0 0 1 .5.5v3a.5.5 0 0 0 1 0v-3a.5.5 0 0 1 .5-.5h3a.5.5 0 0 0 0-1h-3a.5.5 0 0 1-.5-.5v-3a.5.5 0 0 0-.5-.5z"/>
                    </svg>
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
        const classifications = [
            ...result.cpc_classifications.slice(0, 3),
            ...result.ipc_classifications.slice(0, 2)
        ].map(c => `<span class="epo-classification-tag">${c}</span>`).join('');
        
        return `
            <div class="epo-result-item">
                <div class="epo-result-header">
                    <span class="epo-result-patent-number">${result.patent_number}</span>
                    <span style="font-size: 12px; color: #999;">公开日期: ${result.publication_date || '-'}</span>
                </div>
                <div class="epo-result-title" data-patent-number="${result.patent_number}">
                    ${result.title || '无标题'}
                </div>
                <div class="epo-result-meta">
                    <span>申请人: ${result.applicants.slice(0, 2).join(', ') || '-'}${result.applicants.length > 2 ? ' 等' : ''}</span>
                    <span>发明人: ${result.inventors.slice(0, 2).join(', ') || '-'}${result.inventors.length > 2 ? ' 等' : ''}</span>
                </div>
                <div class="epo-result-abstract">
                    ${result.abstract || '无摘要'}
                </div>
                <div class="epo-result-classifications">
                    ${classifications}
                </div>
                <div class="epo-result-actions">
                    <button class="view-detail-btn small-button primary-btn" data-patent-number="${result.patent_number}">
                        查看详情
                    </button>
                    <button class="quick-analyze-btn small-button" data-patent-number="${result.patent_number}" style="background: #E8F5E9; color: #2E7D32;">
                        AI解读
                    </button>
                    <a href="${result.url}" target="_blank" class="small-button" style="background: #f5f5f5; text-decoration: none; padding: 6px 12px; border-radius: 4px;">
                        Google Patents
                    </a>
                </div>
            </div>
        `;
    }
    
    renderPagination() {
        const pagination = document.getElementById('epo-pagination');
        const totalPages = Math.ceil(this.totalResults / this.resultsPerPage);
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        let html = '';
        
        if (this.currentPage > 1) {
            html += `<button class="page-btn" data-page="${this.currentPage - 1}">上一页</button>`;
        }
        
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);
        
        if (startPage > 1) {
            html += `<button class="page-btn" data-page="1">1</button>`;
            if (startPage > 2) html += `<span style="padding: 0 8px;">...</span>`;
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const active = i === this.currentPage ? 'style="background: var(--primary-color); color: white;"' : '';
            html += `<button class="page-btn" data-page="${i}" ${active}>${i}</button>`;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) html += `<span style="padding: 0 8px;">...</span>`;
            html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
        }
        
        if (this.currentPage < totalPages) {
            html += `<button class="page-btn" data-page="${this.currentPage + 1}">下一页</button>`;
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
        
        modal.style.display = 'flex';
        content.innerHTML = '<div style="text-align: center; padding: 40px;"><span class="spinner"></span> 加载中...</div>';
        title.textContent = patentNumber;
        
        try {
            const response = await fetch(`/api/epo/detail/${patentNumber}?endpoint=biblio`);
            const data = await response.json();
            
            if (data.success && data.detail) {
                this.displayDetail(data.detail);
                this.updateQuotaInfo(data.quota_info);
            } else {
                content.innerHTML = `<p style="color: #f44336;">获取详情失败: ${data.error || '未知错误'}</p>`;
            }
        } catch (error) {
            content.innerHTML = `<p style="color: #f44336;">请求失败: ${error.message}</p>`;
        }
    }
    
    displayDetail(detail) {
        const content = document.getElementById('epo-detail-content');
        
        content.innerHTML = `
            <div style="display: grid; gap: 16px;">
                <div>
                    <h4 style="margin: 0 0 8px 0; color: #333;">标题</h4>
                    <p style="margin: 0; font-size: 15px;">${detail.title || '-'}</p>
                </div>
                
                <div>
                    <h4 style="margin: 0 0 8px 0; color: #333;">摘要</h4>
                    <p style="margin: 0; font-size: 14px; line-height: 1.8; color: #555;">${detail.abstract || '-'}</p>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div>
                        <h4 style="margin: 0 0 8px 0; color: #333;">申请人</h4>
                        <p style="margin: 0; font-size: 14px;">${detail.applicants?.join(', ') || '-'}</p>
                    </div>
                    <div>
                        <h4 style="margin: 0 0 8px 0; color: #333;">发明人</h4>
                        <p style="margin: 0; font-size: 14px;">${detail.inventors?.join(', ') || '-'}</p>
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
                            ${(detail.cpc_classifications || []).map(c => `<span class="epo-classification-tag">${c}</span>`).join('')}
                        </div>
                    </div>
                    <div>
                        <h4 style="margin: 0 0 8px 0; color: #333;">IPC分类</h4>
                        <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                            ${(detail.ipc_classifications || []).map(c => `<span class="epo-classification-tag">${c}</span>`).join('')}
                        </div>
                    </div>
                </div>
                
                ${detail.family_id ? `
                <div>
                    <h4 style="margin: 0 0 8px 0; color: #333;">同族ID</h4>
                    <p style="margin: 0;">${detail.family_id}</p>
                </div>
                ` : ''}
                
                ${detail.legal_status?.length > 0 ? `
                <div>
                    <h4 style="margin: 0 0 8px 0; color: #333;">法律状态</h4>
                    <div style="max-height: 150px; overflow-y: auto;">
                        ${detail.legal_status.map(s => `
                            <div style="padding: 6px 0; border-bottom: 1px solid #eee; font-size: 13px;">
                                <span style="color: #666;">${s.date || '-'}</span>
                                <span style="margin: 0 8px;">|</span>
                                <span>${s.status || s.description || '-'}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        `;
        
        document.getElementById('view-on-google-btn').onclick = () => {
            window.open(`https://patents.google.com/patent/${patentNumber}`, '_blank');
        };
    }
    
    async quickAnalyze(patentNumber) {
        this.currentPatentNumber = patentNumber;
        await this.analyzePatent();
    }
    
    async analyzePatent() {
        if (!this.currentPatentNumber) {
            this.showToast('请先选择要解读的专利', 'warning');
            return;
        }
        
        const model = document.getElementById('epo-model-select').value;
        const analyzeBtn = document.getElementById('analyze-patent-btn');
        
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<span class="spinner"></span> 解读中...';
        
        const modal = document.getElementById('ai-analysis-modal');
        const content = document.getElementById('ai-analysis-content');
        
        modal.style.display = 'flex';
        content.innerHTML = '<div style="text-align: center; padding: 40px;"><span class="spinner"></span> AI正在分析...</div>';
        
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
                content.textContent = data.analysis;
                this.updateQuotaInfo(data.quota_info);
            } else {
                content.textContent = `解读失败: ${data.error || '未知错误'}`;
            }
        } catch (error) {
            content.textContent = `请求失败: ${error.message}`;
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = 'AI解读';
        }
    }
    
    copyAnalysis() {
        const content = document.getElementById('ai-analysis-content').textContent;
        navigator.clipboard.writeText(content).then(() => {
            this.showToast('已复制到剪贴板', 'success');
        });
    }
    
    clearSearch() {
        document.getElementById('simple-keyword-input').value = '';
        document.getElementById('cql-query-input').value = '';
        document.getElementById('date-from').value = '';
        document.getElementById('date-to').value = '';
        
        const container = document.getElementById('advanced-search-rows');
        container.innerHTML = `
            <div class="advanced-search-row" style="display: flex; gap: 8px; margin-bottom: 10px; align-items: center;">
                <select class="adv-field" style="padding: 8px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">
                    <option value="ta">标题</option>
                    <option value="ab">摘要</option>
                    <option value="cl">权利要求</option>
                    <option value="de">说明书</option>
                    <option value="pa">申请人</option>
                    <option value="in">发明人</option>
                    <option value="cpc">CPC分类</option>
                    <option value="ipc">IPC分类</option>
                </select>
                <select class="adv-operator" style="padding: 8px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                    <option value="NOT">NOT</option>
                </select>
                <input type="text" class="adv-keyword" placeholder="关键词" style="flex: 1; padding: 8px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">
                <button class="remove-row-btn" style="padding: 6px 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; display: none;">×</button>
            </div>
        `;
        
        document.getElementById('epo-results-section').style.display = 'none';
        this.searchResults = [];
        this.totalResults = 0;
    }
    
    async loadQuotaInfo() {
        try {
            const response = await fetch('/api/epo/quota');
            const data = await response.json();
            
            if (data.success) {
                this.updateQuotaInfo(data.quota);
            }
        } catch (error) {
            console.error('加载配额信息失败:', error);
        }
    }
    
    updateQuotaInfo(quota) {
        if (!quota) return;
        
        document.getElementById('epo-used-mb').textContent = quota.weekly_used_mb.toFixed(2);
        document.getElementById('epo-remaining-mb').textContent = quota.weekly_remaining_mb.toFixed(2);
        document.getElementById('epo-usage-percent').textContent = quota.usage_percent.toFixed(1);
        document.getElementById('epo-reset-date').textContent = quota.reset_date;
        
        const quotaBar = document.getElementById('epo-quota-bar');
        const quotaBanner = document.getElementById('epo-quota-banner');
        
        quotaBar.style.width = `${Math.min(quota.usage_percent, 100)}%`;
        
        quotaBanner.classList.remove('warning', 'danger');
        quotaBar.classList.remove('warning', 'danger');
        
        if (quota.usage_percent >= 90) {
            quotaBanner.classList.add('danger');
            quotaBar.classList.add('danger');
        } else if (quota.usage_percent >= 70) {
            quotaBanner.classList.add('warning');
            quotaBar.classList.add('warning');
        }
    }
    
    async loadCQLHelp() {
        try {
            const response = await fetch('/api/epo/cql-help');
            const data = await response.json();
            
            if (data.success) {
                this.displayCQLHelp(data.help);
            }
        } catch (error) {
            console.error('加载CQL帮助失败:', error);
        }
    }
    
    displayCQLHelp(help) {
        const content = document.getElementById('cql-help-content');
        
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
                            ${help.fields.map(f => `
                                <tr>
                                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: 600; color: var(--primary-color);">${f.code}</td>
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
                            ${help.operators.map(o => `
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
                        ${help.examples.map(e => `
                            <div style="padding: 12px; background: #f9f9f9; border-radius: 6px; cursor: pointer;" class="cql-example" data-query="${e.query}">
                                <div style="font-weight: 500; margin-bottom: 4px;">${e.name}</div>
                                <div style="font-family: monospace; font-size: 12px; color: var(--primary-color); margin-bottom: 4px;">${e.query}</div>
                                <div style="font-size: 12px; color: #666;">${e.description}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        content.querySelectorAll('.cql-example').forEach(el => {
            el.addEventListener('click', () => {
                document.getElementById('cql-query-input').value = el.dataset.query;
                document.getElementById('cql-help-modal').style.display = 'none';
            });
        });
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : type === 'warning' ? '#FF9800' : '#2196F3'};
            color: white;
            border-radius: 6px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

let epoSearchModule = null;

document.addEventListener('DOMContentLoaded', () => {
    epoSearchModule = new EPOSearchModule();
});

window.epoSearchModule = epoSearchModule;
