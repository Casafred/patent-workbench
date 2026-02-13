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
            console.error('❌ 标签页容器不存在:', containerId);
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

        console.log('✅ 标签页管理器已初始化');
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
            console.log(`⚠️ 标签页已存在，切换到现有标签页: ${existingTab.id}`);
            this.switchToTab(existingTab.id);
            return existingTab.id;
        }

        this.tabs.push(tab);
        this.renderTab(tab);
        this.switchToTab(tabId);
        
        console.log(`✅ 创建新标签页: ${tabId}, 标题: ${tab.title}`);
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
        const hasImages = data.images && data.images.length > 0;
        const firstImage = hasImages ? data.images[0] : null;
        const cacheBadge = result.fromCache ? '<span class="cache-badge">缓存</span>' : '';

        return `
            <div class="patent-strip success" data-patent-number="${result.patent_number}">
                <div class="patent-strip-image">
                    ${firstImage ? `<img src="${firstImage}" alt="专利附图" loading="lazy">` : '<div class="no-image">暂无附图</div>'}
                </div>
                <div class="patent-strip-content">
                    <div class="patent-strip-number">${result.patent_number}${cacheBadge}</div>
                    <div class="patent-strip-title">${data.title || '无标题'}</div>
                    <div class="patent-strip-meta">
                        <span>申请人: ${data.applicant || '-'}</span>
                        <span>发明人: ${data.inventor || '-'}</span>
                        <span>申请日: ${data.filing_date || '-'}</span>
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

        console.log(`📊 更新标签页结果: ${tabId}, 成功: ${results.filter(r => r.success).length}/${results.length}`);
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
    async analyzeAllPatents(tabId) {
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

        // 获取当前模板
        const template = window.appState?.patentBatch?.currentTemplate;
        if (!template) {
            alert('请先选择解读模板');
            return;
        }

        // 获取是否包含说明书的选项
        const includeSpecification = document.getElementById('include_specification_checkbox')?.checked || false;

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

        // 显示解读状态
        const resultsContainer = document.getElementById(`${tabId}_results`);
        let statusDiv = document.getElementById(`${tabId}_analysis_status`);
        if (!statusDiv) {
            statusDiv = document.createElement('div');
            statusDiv.id = `${tabId}_analysis_status`;
            statusDiv.className = 'analysis-status-bar';
            statusDiv.style.cssText = 'padding: 10px; background: #e3f2fd; border-radius: 6px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;';
            resultsContainer.insertBefore(statusDiv, resultsContainer.firstChild);
        }

        // 逐个解读专利
        for (let i = 0; i < successfulResults.length; i++) {
            const result = successfulResults[i];
            const patentNumber = result.patent_number;

            // 更新状态
            statusDiv.innerHTML = `
                <span>正在解读: <strong>${patentNumber}</strong> (${i + 1}/${successfulResults.length})</span>
                <span style="color: #666;">${Math.round((i / successfulResults.length) * 100)}%</span>
            `;

            try {
                // 查找或创建专利条带的解读区域
                const patentStrip = resultsContainer.querySelector(`[data-patent-number="${patentNumber}"]`);
                if (patentStrip) {
                    // 添加解读状态标记
                    let analysisBadge = patentStrip.querySelector('.analysis-badge');
                    if (!analysisBadge) {
                        analysisBadge = document.createElement('span');
                        analysisBadge.className = 'analysis-badge';
                        analysisBadge.style.cssText = 'margin-left: 10px; padding: 2px 8px; background: #e3f2fd; color: #1976d2; border-radius: 10px; font-size: 12px;';
                        const titleDiv = patentStrip.querySelector('.patent-strip-title');
                        if (titleDiv) {
                            titleDiv.appendChild(analysisBadge);
                        }
                    }
                    analysisBadge.textContent = '解读中...';
                }

                // 调用解读API
                const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/analyze_patent`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        patent_data: result.data,
                        template: template,
                        include_specification: includeSpecification
                    })
                });

                if (!response.ok) {
                    throw new Error(`解读请求失败: ${response.status}`);
                }

                const analysisResult = await response.json();
                const analysisContent = analysisResult.analysis || analysisResult.result || analysisResult.content || '无解读结果';

                // 更新专利条带的解读结果
                if (patentStrip) {
                    const analysisBadge = patentStrip.querySelector('.analysis-badge');
                    if (analysisBadge) {
                        analysisBadge.textContent = '已解读';
                        analysisBadge.style.background = '#d4edda';
                        analysisBadge.style.color = '#155724';
                    }

                    // 添加或更新解读结果区域
                    let analysisSection = patentStrip.querySelector('.patent-analysis-result');
                    if (!analysisSection) {
                        analysisSection = document.createElement('div');
                        analysisSection.className = 'patent-analysis-result';
                        analysisSection.style.cssText = 'margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 6px; border-left: 3px solid #28a745;';
                        patentStrip.appendChild(analysisSection);
                    }

                    // 格式化显示解读结果
                    let displayContent = analysisContent;
                    try {
                        const analysisData = JSON.parse(analysisContent);
                        displayContent = window.formatAnalysisResult ? window.formatAnalysisResult(analysisData, template) : `<pre>${JSON.stringify(analysisData, null, 2)}</pre>`;
                    } catch (e) {
                        displayContent = `<div style="white-space: pre-wrap;">${analysisContent}</div>`;
                    }

                    analysisSection.innerHTML = `
                        <div style="font-size: 12px; color: #666; margin-bottom: 5px;">🤖 AI解读结果：</div>
                        ${displayContent}
                    `;
                }

                // 存储解读结果到tab
                result.analysis = {
                    content: analysisContent,
                    template: template.name,
                    timestamp: new Date().toISOString()
                };

            } catch (error) {
                console.error(`解读专利 ${patentNumber} 失败:`, error);

                // 更新错误状态
                const patentStrip = resultsContainer.querySelector(`[data-patent-number="${patentNumber}"]`);
                if (patentStrip) {
                    const analysisBadge = patentStrip.querySelector('.analysis-badge');
                    if (analysisBadge) {
                        analysisBadge.textContent = '解读失败';
                        analysisBadge.style.background = '#f8d7da';
                        analysisBadge.style.color = '#721c24';
                    }
                }
            }
        }

        // 完成解读
        statusDiv.innerHTML = `
            <span>✅ 解读完成 (${successfulResults.length} 个专利)</span>
            <button class="small-button" onclick="this.parentElement.remove()">关闭</button>
        `;
        statusDiv.style.background = '#d4edda';

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

console.log('✅ 标签页管理器模块已加载');
