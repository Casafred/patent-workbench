/**
 * 功能六：标签页管理器
 * 管理批量专利查询结果的多个标签页，支持同族/引用/被引用/相似专利的并列分析
 */

class PatentTabManager {
    constructor() {
        this.tabs = [];
        this.activeTabId = null;
        this.tabCounter = 0;
        this.container = null;
        this.headerContainer = null;
        this.contentContainer = null;
        this.onTabChange = null;
    }

    /**
     * 初始化标签页管理器
     * @param {string} containerId - 容器元素ID
     */
    init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('[ERROR] 标签页容器不存在:', containerId);
            return false;
        }

        // 创建标签页结构
        this.container.innerHTML = `
            <div class="patent-tabs-wrapper">
                <div class="patent-tabs-header" id="${containerId}_header"></div>
                <div class="patent-tabs-content" id="${containerId}_content"></div>
            </div>
        `;

        this.headerContainer = document.getElementById(`${containerId}_header`);
        this.contentContainer = document.getElementById(`${containerId}_content`);

        console.log('[OK] 标签页管理器已初始化');
        return true;
    }

    /**
     * 创建新标签页
     * @param {Object} options - 标签页配置
     * @param {string} options.title - 标签页标题
     * @param {string} options.sourcePatent - 来源专利号
     * @param {string} options.relationType - 关系类型 (family/citations/cited_by/similar)
     * @param {Array} options.patentNumbers - 要爬取的专利号列表
     * @returns {string} 标签页ID
     */
    createTab(options) {
        const tabId = `patent_tab_${++this.tabCounter}`;
        const relationTypeName = this.getRelationTypeName(options.relationType);
        
        const tab = {
            id: tabId,
            title: options.title || `${options.sourcePatent} 的${relationTypeName}`,
            sourcePatent: options.sourcePatent,
            relationType: options.relationType,
            relationTypeName: relationTypeName,
            patentNumbers: options.patentNumbers || [],
            results: [],
            isLoading: true,
            createdAt: new Date()
        };

        // 检查是否已存在相同来源和类型的标签页
        const existingTab = this.tabs.find(t => 
            t.sourcePatent === options.sourcePatent && 
            t.relationType === options.relationType
        );
        
        if (existingTab) {
            console.log(`[WARN] 标签页已存在，重置现有标签页: ${existingTab.id}`);
            existingTab.patentNumbers = options.patentNumbers || [];
            existingTab.results = [];
            existingTab.isLoading = true;
            existingTab.createdAt = new Date();
            
            const resultsContainer = document.getElementById(`${existingTab.id}_results`);
            if (resultsContainer) {
                resultsContainer.innerHTML = this.generateLoadingHTML(existingTab);
            }
            
            const tabButton = this.headerContainer.querySelector(`[data-tab-id="${existingTab.id}"] .tab-title`);
            if (tabButton) {
                tabButton.textContent = existingTab.title;
            }
            
            this.switchToTab(existingTab.id);
            return existingTab.id;
        }

        this.tabs.push(tab);
        this.renderTab(tab);
        this.switchToTab(tabId);
        
        console.log(`[OK] 创建新标签页: ${tabId}, 标题: ${tab.title}`);
        return tabId;
    }

    /**
     * 获取关系类型中文名称
     */
    getRelationTypeName(type) {
        const typeNames = {
            'original': '原始结果',
            'family': '同族专利',
            'citations': '引用专利',
            'cited_by': '被引用专利',
            'similar': '相似专利'
        };
        return typeNames[type] || '相关专利';
    }

    /**
     * 渲染标签页DOM
     */
    renderTab(tab) {
        // 创建标签页头部按钮
        const tabButton = document.createElement('div');
        tabButton.className = 'patent-tab-button';
        tabButton.dataset.tabId = tab.id;
        tabButton.innerHTML = `
            <span class="tab-title">${tab.title}</span>
            <span class="tab-close" onclick="event.stopPropagation(); patentTabManager.closeTab('${tab.id}')">×</span>
        `;
        tabButton.onclick = () => this.switchToTab(tab.id);
        this.headerContainer.appendChild(tabButton);

        // 创建标签页内容区域
        const tabContent = document.createElement('div');
        tabContent.className = 'patent-tab-content';
        tabContent.id = tab.id;
        tabContent.innerHTML = this.generateTabContent(tab);
        this.contentContainer.appendChild(tabContent);
    }

    /**
     * 生成标签页内容HTML
     */
    generateTabContent(tab) {
        const relationTypeColors = {
            'original': '#22C55E',
            'family': '#4caf50',
            'citations': '#2196f3',
            'cited_by': '#ff9800',
            'similar': '#9c27b0'
        };
        const color = relationTypeColors[tab.relationType] || '#666';

        // 原始结果标签页不显示"来源专利"标签
        const sourceLabel = tab.relationType === 'original' ? '' : '<span class="source-label">来源专利：</span>';
        const sourcePatent = tab.relationType === 'original' ? '' : `<span class="source-patent">${tab.sourcePatent}</span>`;
        
        // 原始结果标签页显示导出Excel按钮
        const exportButton = tab.relationType === 'original' ? `
            <button class="small-button" onclick="exportPatentResultsToExcel()">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                    <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                </svg>
                导出Excel
            </button>
        ` : '';

        return `
            <div class="patent-tab-source-banner" style="background: linear-gradient(135deg, ${color}15 0%, ${color}08 100%); border-left: 4px solid ${color};">
                <div class="source-info">
                    ${sourceLabel}
                    ${sourcePatent}
                    <span class="relation-type-badge" style="background: ${color}; color: white;">${tab.relationTypeName}</span>
                    <span class="patent-count">共 ${tab.patentNumbers.length} 个专利</span>
                </div>
                <div class="source-actions">
                    <button class="small-button primary-btn" onclick="patentTabManager.analyzeAllPatents('${tab.id}')" id="${tab.id}_analyze_btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                        </svg>
                        批量解读
                    </button>
                    <button class="small-button" onclick="patentTabManager.analyzeAllPatents('${tab.id}', true)" title="强制重新解读，忽略缓存" style="background: #ff9800; color: white;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                        </svg>
                        刷新解读
                    </button>
                    ${tab.relationType !== 'original' ? `
                    <button class="small-button" onclick="patentTabManager.refreshTab('${tab.id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                        </svg>
                        重新爬取
                    </button>
                    ` : ''}
                    ${exportButton}
                </div>
            </div>
            <div class="patent-tab-results-container" id="${tab.id}_results">
                ${tab.isLoading ? this.generateLoadingHTML(tab) : this.generateResultsHTML(tab)}
            </div>
        `;
    }

    /**
     * 生成加载状态HTML
     */
    generateLoadingHTML(tab) {
        return `
            <div class="patent-tab-loading">
                <div class="loading-spinner"></div>
                <div class="loading-text">正在爬取 ${tab.relationTypeName}...</div>
                <div class="loading-progress" id="${tab.id}_progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 0%"></div>
                    </div>
                    <div class="progress-text">准备中...</div>
                </div>
            </div>
        `;
    }

    /**
     * 生成结果列表HTML
     */
    generateResultsHTML(tab) {
        if (!tab.results || tab.results.length === 0) {
            return `
                <div class="patent-tab-empty">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                        <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                    </svg>
                    <p>暂无数据</p>
                </div>
            `;
        }

        // 复刻主页面的专利条带列表样式
        let html = '<div class="patent-strip-list">';
        tab.results.forEach((result, index) => {
            html += this.generatePatentStripHTML(result, index);
        });
        html += '</div>';
        return html;
    }

    /**
     * 生成单个专利条带HTML - 使用统一样式
     */
    generatePatentStripHTML(result, index) {
        if (!result.success) {
            return `
                <div class="patent-strip error" data-patent-number="${result.patent_number}">
                    <div class="patent-strip-image">
                        <div class="no-image">查询失败</div>
                    </div>
                    <div class="patent-strip-content">
                        <div class="patent-strip-number">${result.patent_number}</div>
                        <div class="patent-strip-error">查询失败: ${result.error}</div>
                    </div>
                </div>
            `;
        }

        const data = result.data;
        const hasDrawings = data.drawings && data.drawings.length > 0;
        const firstDrawing = hasDrawings ? data.drawings[0] : null;
        const cacheBadge = result.fromCache ? '<span class="cache-badge">缓存</span>' : '';

        return `
            <div class="patent-strip success" data-patent-number="${result.patent_number}">
                <div class="patent-strip-image">
                    ${firstDrawing ? `<img src="${firstDrawing}" alt="专利附图" loading="lazy">` : '<div class="no-image">暂无附图</div>'}
                </div>
                <div class="patent-strip-content">
                    <div class="patent-strip-number">${result.patent_number}${cacheBadge}</div>
                    <div class="patent-strip-title">${data.title || '无标题'}</div>
                    <div class="patent-strip-meta">
                        <span>申请人: ${data.applicant || (data.assignees && data.assignees.length > 0 ? data.assignees.join(', ') : (data.assignee || '-'))}</span>
                        <span>申请日: ${data.filing_date || data.application_date || data.priority_date || '-'}</span>
                    </div>
                </div>
                <div class="patent-strip-actions">
                    <button class="small-button" onclick="event.stopPropagation(); patentTabManager.openPatentDetail('${result.patent_number}')">
                        查看详情
                    </button>
                    <button class="small-button" onclick="event.stopPropagation(); openPatentDetailInNewTab('${result.patent_number}')">
                        新标签页
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * 切换到指定标签页
     */
    switchToTab(tabId) {
        // 更新头部按钮状态
        this.headerContainer.querySelectorAll('.patent-tab-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tabId === tabId);
        });

        // 更新内容区域显示
        this.contentContainer.querySelectorAll('.patent-tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tabId);
        });

        this.activeTabId = tabId;
        
        if (this.onTabChange) {
            this.onTabChange(tabId);
        }

        console.log(`🔄 切换到标签页: ${tabId}`);
    }

    /**
     * 关闭标签页
     */
    closeTab(tabId) {
        const tabIndex = this.tabs.findIndex(t => t.id === tabId);
        if (tabIndex === -1) return;

        const tab = this.tabs[tabIndex];
        
        // 移除DOM元素
        const tabButton = this.headerContainer.querySelector(`[data-tab-id="${tabId}"]`);
        const tabContent = document.getElementById(tabId);
        if (tabButton) tabButton.remove();
        if (tabContent) tabContent.remove();

        // 从数组中移除
        this.tabs.splice(tabIndex, 1);

        // 如果关闭的是当前活动标签页，切换到其他标签页
        if (this.activeTabId === tabId) {
            if (this.tabs.length > 0) {
                // 切换到相邻的标签页
                const newIndex = Math.min(tabIndex, this.tabs.length - 1);
                this.switchToTab(this.tabs[newIndex].id);
            } else {
                this.activeTabId = null;
                // 如果没有标签页了，隐藏容器
                if (this.container) {
                    this.container.style.display = 'none';
                }
            }
        }

        console.log(`❌ 关闭标签页: ${tabId}`);
    }

    /**
     * 更新标签页结果
     */
    updateTabResults(tabId, results) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return;

        tab.results = results;
        tab.isLoading = false;

        const resultsContainer = document.getElementById(`${tabId}_results`);
        if (resultsContainer) {
            resultsContainer.innerHTML = this.generateResultsHTML(tab);
        }

        // 更新标题显示数量
        const tabButton = this.headerContainer.querySelector(`[data-tab-id="${tabId}"] .tab-title`);
        if (tabButton) {
            const successCount = results.filter(r => r.success).length;
            tabButton.textContent = `${tab.title} (${successCount})`;
        }

        console.log(`[DATA] 更新标签页结果: ${tabId}, 成功: ${results.filter(r => r.success).length}/${results.length}`);
    }

    /**
     * 更新标签页进度
     */
    updateTabProgress(tabId, current, total, message) {
        const progressContainer = document.getElementById(`${tabId}_progress`);
        if (!progressContainer) return;

        const percentage = total > 0 ? (current / total * 100) : 0;
        const progressFill = progressContainer.querySelector('.progress-fill');
        const progressText = progressContainer.querySelector('.progress-text');

        if (progressFill) progressFill.style.width = `${percentage}%`;
        if (progressText) progressText.textContent = message || `${current}/${total}`;
    }

    /**
     * 显示标签页容器
     */
    show() {
        if (this.container) {
            this.container.style.display = 'block';
        }
    }

    /**
     * 打开专利详情弹窗
     */
    openPatentDetail(patentNumber) {
        // 查找专利数据
        const tab = this.tabs.find(t => t.id === this.activeTabId);
        if (!tab) return;

        const result = tab.results.find(r => r.patent_number === patentNumber);
        if (!result) return;

        // 将当前标签页的结果设置到 window.patentResults，以便前后导航在当前列表中工作
        window.patentResults = tab.results;
        
        // 同时更新 appState.patentBatch.patentResults，以便问一问功能能找到专利数据
        if (window.appState && window.appState.patentBatch) {
            window.appState.patentBatch.patentResults = tab.results;
        }

        // 调用主页面的弹窗函数
        if (window.openPatentDetailModal) {
            window.openPatentDetailModal(result);
        }
    }

    /**
     * 刷新标签页（重新爬取）
     */
    refreshTab(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return;

        tab.isLoading = true;
        tab.results = [];

        const resultsContainer = document.getElementById(`${tabId}_results`);
        if (resultsContainer) {
            resultsContainer.innerHTML = this.generateLoadingHTML(tab);
        }

        // 触发重新爬取
        if (window.crawlRelationPatents) {
            window.crawlRelationPatents(tabId, tab.sourcePatent, tab.relationType, tab.patentNumbers);
        }
    }

    /**
     * 批量解读当前标签页的所有专利
     * @param {string} tabId - 标签页ID
     */
    async analyzeAllPatents(tabId, forceRefresh = false) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) {
            alert('标签页不存在');
            return;
        }

        // 获取成功的结果
        const successfulResults = tab.results.filter(r => r.success);
        if (successfulResults.length === 0) {
            alert('没有可解读的专利');
            return;
        }

        // 获取当前模板，如果没有则尝试加载默认模板
        let template = window.appState?.patentBatch?.currentTemplate;
        if (!template) {
            // 尝试加载默认模板
            if (typeof loadTemplate === 'function') {
                console.log('🔄 没有当前模板，尝试加载默认模板...');
                loadTemplate('default');
                template = window.appState?.patentBatch?.currentTemplate;
            }
            
            // 如果仍然没有模板，提示用户
            if (!template) {
                alert('请先选择解读模板');
                return;
            }
        }

        const includeSpecification = document.getElementById('include_specification_checkbox')?.checked || false;

        const selectedModel = document.getElementById('patent_batch_model_selector')?.value || 'GLM-4-Flash';
        
        const originalProvider = appState.provider || 'zhipu';
        const isAliyunModel = window.ALIYUN_THINKING_CAPABLE_MODELS?.includes(selectedModel) || 
                              window.ALIYUN_THINKING_ONLY_MODELS?.includes(selectedModel) ||
                              selectedModel.startsWith('qwen') || 
                              selectedModel.startsWith('deepseek') || 
                              selectedModel.startsWith('qwq') ||
                              selectedModel.startsWith('kimi');
        
        if (isAliyunModel && originalProvider !== 'aliyun') {
            appState.provider = 'aliyun';
            console.log(`[专利解读] 检测到阿里云模型 ${selectedModel}，临时切换服务商`);
        }

        // 禁用按钮
        const analyzeBtn = document.getElementById(`${tabId}_analyze_btn`);
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
            analyzeBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="rotating">
                    <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/>
                    <path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/>
                </svg>
                解读中...
            `;
        }

        // 获取解读结果列表容器
        const analysisResultsList = document.getElementById('analysis_results_list');
        if (analysisResultsList) {
            analysisResultsList.innerHTML = '';
        }
        
        // 清空之前的解读结果
        window.patentBatchAnalysisResults = [];
        
        // 初始化正在解读的专利集合（用于弹窗实时显示）
        window.patentBatchAnalyzing = new Set();
        successfulResults.forEach(result => {
            window.patentBatchAnalyzing.add(result.patent_number);
        });
        
        // 显示解读状态
        const searchStatus = document.getElementById('search_status');
        if (searchStatus) {
            const refreshText = forceRefresh ? '（强制刷新）' : '';
            searchStatus.textContent = `正在使用"${template.name}"模板解读 ${successfulResults.length} 个专利${refreshText}...`;
            searchStatus.style.display = 'block';
        }
        
        // 创建一个Map来存储解读结果，key是专利号
        const analysisResultsMap = new Map();

        // 逐个解读专利
        for (let i = 0; i < successfulResults.length; i++) {
            const result = successfulResults[i];
            const patentNumber = result.patent_number;

            // 更新状态
            if (searchStatus) {
                searchStatus.textContent = `正在解读: ${patentNumber} (${i + 1}/${successfulResults.length})`;
            }

            // 创建占位符（按用户输入顺序）
            const placeholderId = `analysis_placeholder_${patentNumber}`;
            if (!document.getElementById(placeholderId) && analysisResultsList) {
                const placeholder = document.createElement('div');
                placeholder.id = placeholderId;
                placeholder.className = 'result-item';
                placeholder.innerHTML = `<h5>正在解读专利：${patentNumber} (${i + 1}/${successfulResults.length})</h5>`;
                analysisResultsList.appendChild(placeholder);
            }

            try {
                // 检查解读缓存（除非强制刷新）
                let analysisContent = null;
                let fromCache = false;
                
                if (!forceRefresh && window.PatentCache && window.PatentCache.hasAnalysis) {
                    const cachedAnalysis = window.PatentCache.getAnalysis(patentNumber);
                    if (cachedAnalysis) {
                        analysisContent = cachedAnalysis.content;
                        fromCache = true;
                        console.log(`📦 使用解读缓存: ${patentNumber}`);
                    }
                }
                
                // 如果没有缓存或强制刷新，调用API解读
                if (!analysisContent) {
                    // 构建用户提示词
                    const userPrompt = buildAnalysisPrompt(template, result.data, includeSpecification);
                    
                    // 调用解读API（使用统一的apiCall函数）
                    const analysisResult = await apiCall('/patent/analyze', {
                        patent_data: result.data,
                        template: {
                            fields: template.fields,
                            system_prompt: template.systemPrompt
                        },
                        user_prompt: userPrompt,
                        include_specification: includeSpecification,
                        model: selectedModel
                    });

                    // 解析解读结果
                    analysisContent = analysisResult.choices?.[0]?.message?.content || analysisResult.analysis || analysisResult.result || '无解读结果';
                    
                    // 保存解读结果到缓存
                    if (window.PatentCache && window.PatentCache.saveAnalysis) {
                        window.PatentCache.saveAnalysis(patentNumber, {
                            content: analysisContent,
                            template: template.name,
                            templateId: template.id,
                            model: selectedModel
                        });
                    }
                    
                    // 保存到历史记录
                    if (window.PatentHistory) {
                        window.PatentHistory.add(patentNumber, 'analyze', {
                            title: result.data?.title || ''
                        });
                    }
                }
                
                // 尝试解析JSON格式的解读结果
                let analysisJson = {};
                let displayContent = '';
                try {
                    // 尝试清理可能的markdown代码块标记
                    let cleanContent = analysisContent.trim();
                    if (cleanContent.startsWith('```json')) {
                        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                    } else if (cleanContent.startsWith('```')) {
                        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
                    }
                    
                    analysisJson = JSON.parse(cleanContent);
                    
                    // 动态生成表格内容（根据模板字段）
                    let tableRows = '';
                    template.fields.forEach(field => {
                        const value = analysisJson[field.id] || '-';
                        const displayValue = typeof value === 'string' ? value.replace(/\n/g, '<br>') : value;
                        tableRows += `<tr><td style="border: 1px solid #ddd; padding: 8px; font-weight: 500;">${field.name}</td><td style="border: 1px solid #ddd; padding: 8px;">${displayValue}</td></tr>`;
                    });
                    
                    displayContent = `
                        <div class="analysis-content">
                            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                                <tr><th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">字段</th><th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">内容</th></tr>
                                ${tableRows}
                            </table>
                        </div>
                    `;
                } catch (e) {
                    console.error('JSON解析失败:', e);
                    // 如果不是JSON格式，显示原始内容
                    displayContent = `
                        <div class="analysis-content">
                            <div style="padding: 10px; background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; margin-bottom: 10px;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: middle; margin-right: 4px; color: #856404;"><path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg> 解读结果未能解析为结构化格式，显示原始内容：
                            </div>
                            <div style="white-space: pre-wrap; font-family: monospace; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">
                                ${analysisContent}
                            </div>
                        </div>
                    `;
                }
                
                // 更新占位符内容
                const placeholder = document.getElementById(placeholderId);
                if (placeholder) {
                    placeholder.innerHTML = `
                        <h5>专利 ${patentNumber} 解读结果 ${fromCache ? '<span style="color: #856404; font-size: 0.8em;">(来自缓存)</span>' : ''}</h5>
                        <div class="ai-disclaimer compact">
                            <div class="ai-disclaimer-icon">AI</div>
                            <div class="ai-disclaimer-text"><strong>AI生成：</strong>以下解读由AI生成，仅供参考</div>
                        </div>
                        ${displayContent}
                    `;
                }
                
                // 存储解读结果到Map
                analysisResultsMap.set(patentNumber, {
                    patent_number: patentNumber,
                    patent_data: result.data,
                    analysis_content: analysisContent,
                    fromCache: fromCache
                });
                
                // 立即添加到全局结果数组（用于弹窗实时显示）
                if (!window.patentBatchAnalysisResults) {
                    window.patentBatchAnalysisResults = [];
                }
                // 检查是否已存在，避免重复添加
                const existingIndex = window.patentBatchAnalysisResults.findIndex(
                    r => r.patent_number === patentNumber
                );
                if (existingIndex >= 0) {
                    window.patentBatchAnalysisResults[existingIndex] = {
                        patent_number: patentNumber,
                        patent_data: result.data,
                        analysis_content: analysisContent,
                        fromCache: fromCache
                    };
                } else {
                    window.patentBatchAnalysisResults.push({
                        patent_number: patentNumber,
                        patent_data: result.data,
                        analysis_content: analysisContent,
                        fromCache: fromCache
                    });
                }
                
                // 从正在解读的集合中移除（表示该专利解读完成）
                if (window.patentBatchAnalyzing) {
                    window.patentBatchAnalyzing.delete(patentNumber);
                }
                
                // 即时更新专利详情弹窗中的解读结果
                if (window.updatePatentDetailAnalysis) {
                    window.updatePatentDetailAnalysis(patentNumber, analysisContent, true, template);
                }
                
                // 触发解读完成事件（用于新标签页更新）
                window.dispatchEvent(new CustomEvent('patentAnalysisCompleted', {
                    detail: {
                        patentNumber: patentNumber,
                        analysisContent: analysisContent,
                        template: template
                    }
                }));

            } catch (error) {
                console.error(`解读专利 ${patentNumber} 失败:`, error);
                
                // 从正在解读的集合中移除
                if (window.patentBatchAnalyzing) {
                    window.patentBatchAnalyzing.delete(patentNumber);
                }
                
                // 更新占位符显示错误
                const placeholder = document.getElementById(placeholderId);
                if (placeholder) {
                    placeholder.innerHTML = `
                        <h5>专利 ${patentNumber} 解读失败</h5>
                        <div style="color: #721c24; background: #f8d7da; padding: 10px; border-radius: 4px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: middle; margin-right: 4px;"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/></svg> 解读失败: ${error.message}
                        </div>
                    `;
                }
            }
        }
        
        // 按照用户输入的顺序重新组织 analysisResults 数组
        window.patentBatchAnalysisResults = [];
        window.patentResults.forEach(result => {
            if (result.success && analysisResultsMap.has(result.patent_number)) {
                window.patentBatchAnalysisResults.push(analysisResultsMap.get(result.patent_number));
            }
        });
        
        // 更新状态
        if (searchStatus) {
            searchStatus.textContent = `解读完成，共解读 ${successfulResults.length} 个专利`;
        }
        
        if (typeof originalProvider !== 'undefined' && appState.provider !== originalProvider) {
            appState.provider = originalProvider;
            console.log(`[专利解读] 恢复原始服务商: ${originalProvider}`);
        }
        
        const exportAnalysisExcelBtn = document.getElementById('export_analysis_excel_btn');
        if (exportAnalysisExcelBtn) {
            exportAnalysisExcelBtn.disabled = false;
        }

        // 恢复按钮
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                </svg>
                批量解读
            `;
        }
    }

    /**
     * 获取所有标签页
     */
    getTabs() {
        return this.tabs;
    }

    /**
     * 获取当前活动标签页
     */
    getActiveTab() {
        return this.tabs.find(t => t.id === this.activeTabId);
    }
}

// 创建全局实例
window.patentTabManager = new PatentTabManager();

console.log('[OK] 标签页管理器模块已加载');
