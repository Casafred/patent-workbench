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
            'family': '#4caf50',
            'citations': '#2196f3',
            'cited_by': '#ff9800',
            'similar': '#9c27b0'
        };
        const color = relationTypeColors[tab.relationType] || '#666';

        return `
            <div class="patent-tab-source-banner" style="background: linear-gradient(135deg, ${color}15 0%, ${color}08 100%); border-left: 4px solid ${color};">
                <div class="source-info">
                    <span class="source-label">来源专利：</span>
                    <span class="source-patent">${tab.sourcePatent}</span>
                    <span class="relation-type-badge" style="background: ${color}; color: white;">${tab.relationTypeName}</span>
                    <span class="patent-count">共 ${tab.patentNumbers.length} 个专利</span>
                </div>
                <div class="source-actions">
                    <button class="small-button" onclick="patentTabManager.refreshTab('${tab.id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                        </svg>
                        重新爬取
                    </button>
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
     * 生成单个专利条带HTML
     */
    generatePatentStripHTML(result, index) {
        if (!result.success) {
            return `
                <div class="patent-strip-item error" data-patent-number="${result.patent_number}">
                    <div class="patent-strip-number">${result.patent_number}</div>
                    <div class="patent-strip-error">查询失败: ${result.error}</div>
                </div>
            `;
        }

        const data = result.data;
        const hasImages = data.images && data.images.length > 0;
        const firstImage = hasImages ? data.images[0] : null;

        return `
            <div class="patent-strip-item" data-patent-number="${result.patent_number}">
                <div class="patent-strip-image">
                    ${firstImage ? `<img src="${firstImage}" alt="专利附图" loading="lazy">` : '<div class="no-image">暂无附图</div>'}
                </div>
                <div class="patent-strip-content">
                    <div class="patent-strip-number">${result.patent_number}</div>
                    <div class="patent-strip-title">${data.title || '无标题'}</div>
                    <div class="patent-strip-meta">
                        <span>申请人: ${data.applicant || '-'}</span>
                        <span>发明人: ${data.inventor || '-'}</span>
                        <span>申请日: ${data.filing_date || '-'}</span>
                    </div>
                </div>
                <div class="patent-strip-actions">
                    <button class="small-button" onclick="patentTabManager.openPatentDetail('${result.patent_number}')">
                        查看详情
                    </button>
                    <button class="small-button" onclick="openPatentDetailInNewTab('${result.patent_number}')">
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
            if (this.tabs.length > 0)