/**
 * 全局数据管道模块 (Global Data Pipeline)
 * 实现跨功能模块的Excel数据无缝传递
 * 
 * 核心功能：
 * 1. Excel数据暂存与管理
 * 2. 跨页面数据传递
 * 3. 智能目标推荐
 * 4. 传递历史记录
 */

class GlobalDataPipeline {
    constructor() {
        this.VERSION = '1.0.0';
        this.PIPELINE_STORAGE_KEY = 'globalDataPipeline_data';
        this.HISTORY_STORAGE_KEY = 'globalDataPipeline_history';
        this.CONFIG_STORAGE_KEY = 'globalDataPipeline_config';
        
        this.currentData = null;
        this.history = [];
        this.config = {
            maxHistoryItems: 20,
            maxDataSize: 50 * 1024 * 1024,
            autoCleanDays: 7
        };
        
        this.initialized = false;
        this.panelVisible = false;
        this.floatingBall = null;
        this.panel = null;
        
        this.theme = {
            primary: '#6366f1',
            primaryDark: '#4f46e5',
            primaryLight: '#818cf8',
            bg: '#eef2ff',
            text: '#312e81',
            border: '#a5b4fc',
            success: '#10b981',
            warning: '#f59e0b',
            error: '#ef4444'
        };
        
        this.exportSources = {};
        this.importTargets = {};
        
        this.registerExportSources();
        this.registerImportTargets();
    }

    async init() {
        if (this.initialized) return;
        
        this.loadFromStorage();
        this.injectGlobalStyles();
        this.createFloatingBall();
        this.createPanel();
        this.bindEvents();
        this.setupIntegrationHooks();
        
        this.initialized = true;
        console.log('🔄 GlobalDataPipeline initialized');
    }

    registerExportSources() {
        this.exportSources = {
            'patent-batch': {
                name: '功能六：批量专利解读',
                icon: '📋',
                dataType: 'patent-table',
                description: '专利查询结果Excel导出',
                trigger: () => this.detectPatentBatchExport(),
                getData: () => this.getPatentBatchData(),
                position: { tab: 'patent-batch', selector: '#patent_results_container' }
            },
            'async-batch': {
                name: '功能二：异步批处理',
                icon: '⚡',
                dataType: 'analysis-table',
                description: '批处理结果Excel导出',
                trigger: () => this.detectAsyncBatchExport(),
                getData: () => this.getAsyncBatchData(),
                position: { tab: 'async-batch', selector: '#async_results_container' }
            },
            'large-batch': {
                name: '功能三：大批量处理',
                icon: '📊',
                dataType: 'analysis-table',
                description: '大批量处理结果导出',
                trigger: () => this.detectLargeBatchExport(),
                getData: () => this.getLargeBatchData(),
                position: { tab: 'large-batch', selector: '#gen_results_container' }
            },
            'claims-processor': {
                name: '功能七：权利要求分析',
                icon: '📄',
                dataType: 'claims-table',
                description: '权利要求分析结果导出',
                trigger: () => this.detectClaimsExport(),
                getData: () => this.getClaimsData(),
                position: { tab: 'claims-processor', selector: '#claims_results_container' }
            },
            'local-patent-lib': {
                name: '功能四：本地专利库',
                icon: '📚',
                dataType: 'patent-table',
                description: '专利库数据导出',
                trigger: () => this.detectLocalLibExport(),
                getData: () => this.getLocalLibData(),
                position: { tab: 'local-patent-lib', selector: '#lpl_results_container' }
            },
            'user-cache': {
                name: '用户数据备份',
                icon: '💾',
                dataType: 'user-cache',
                description: '用户缓存数据导出',
                trigger: () => this.detectUserCacheExport(),
                getData: () => this.getUserCacheData(),
                position: { tab: null, selector: null }
            },
            'chat-export': {
                name: '功能一：即时对话',
                icon: '💬',
                dataType: 'chat-history',
                description: '对话记录导出',
                trigger: () => this.detectChatExport(),
                getData: () => this.getChatData(),
                position: { tab: 'instant-chat', selector: '#chat_window' }
            }
        };
    }

    registerImportTargets() {
        this.importTargets = {
            'patent-batch': {
                name: '功能六：批量专利解读',
                icon: '📋',
                acceptedTypes: ['patent-table', 'patent-numbers'],
                description: '导入专利号进行批量查询',
                inputSelector: '#patent_numbers_input',
                fileSelector: '#patent_file_input',
                action: 'import'
            },
            'async-batch': {
                name: '功能二：异步批处理',
                icon: '⚡',
                acceptedTypes: ['analysis-table', 'patent-table', 'claims-table'],
                description: '导入Excel进行批处理',
                inputSelector: '#async_manual_input',
                fileSelector: '#async_excel_file',
                action: 'import'
            },
            'large-batch': {
                name: '功能三：大批量处理',
                icon: '📊',
                acceptedTypes: ['analysis-table', 'patent-table', 'json-data'],
                description: '上传Excel进行大批量处理',
                fileSelector: '#gen_file-input',
                action: 'import'
            },
            'claims-processor': {
                name: '功能七：权利要求分析',
                icon: '📄',
                acceptedTypes: ['claims-table', 'claims-text', 'patent-table'],
                description: '导入权利要求进行分析',
                inputSelector: '#claims_text_input',
                fileSelector: '#claims_excel_file',
                action: 'import'
            },
            'local-patent-lib': {
                name: '功能四：本地专利库',
                icon: '📚',
                acceptedTypes: ['patent-table'],
                description: '导入Excel合并到专利库',
                fileSelector: '#lpl_new_file_input',
                action: 'merge'
            },
            'instant-chat': {
                name: '功能一：即时对话',
                icon: '💬',
                acceptedTypes: ['ai-analysis', 'plain-text', 'claims-text'],
                description: '粘贴内容进行讨论',
                inputSelector: '#chat_input',
                action: 'paste'
            }
        };
    }

    loadFromStorage() {
        try {
            const savedData = localStorage.getItem(this.PIPELINE_STORAGE_KEY);
            if (savedData) {
                this.currentData = JSON.parse(savedData);
            }
            
            const savedHistory = localStorage.getItem(this.HISTORY_STORAGE_KEY);
            if (savedHistory) {
                this.history = JSON.parse(savedHistory);
            }
            
            const savedConfig = localStorage.getItem(this.CONFIG_STORAGE_KEY);
            if (savedConfig) {
                this.config = { ...this.config, ...JSON.parse(savedConfig) };
            }
        } catch (e) {
            console.warn('GlobalDataPipeline: Failed to load from storage', e);
        }
    }

    saveToStorage() {
        try {
            if (this.currentData) {
                localStorage.setItem(this.PIPELINE_STORAGE_KEY, JSON.stringify(this.currentData));
            }
            localStorage.setItem(this.HISTORY_STORAGE_KEY, JSON.stringify(this.history));
            localStorage.setItem(this.CONFIG_STORAGE_KEY, JSON.stringify(this.config));
        } catch (e) {
            console.warn('GlobalDataPipeline: Failed to save to storage', e);
        }
    }

    store(data, source, metadata = {}) {
        console.log('🔄 GlobalDataPipeline.store called:', { source, metadata });
        
        const dataType = this.detectDataType(data);
        const dataInfo = this.analyzeData(data, dataType);
        
        const pipelineItem = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            source: source,
            sourceInfo: this.exportSources[source] || null,
            dataType: dataType,
            dataInfo: dataInfo,
            metadata: {
                ...metadata,
                size: this.calculateDataSize(data),
                rowCount: dataInfo.rowCount || 0,
                columnCount: dataInfo.columnCount || 0
            },
            data: data,
            status: 'ready'
        };
        
        if (this.currentData) {
            this.addToHistory(this.currentData);
        }
        
        this.currentData = pipelineItem;
        this.saveToStorage();
        this.updateFloatingBall();
        this.updatePanel();
        this.showStoreNotification(pipelineItem);
        
        return pipelineItem;
    }

    detectDataType(data) {
        if (!data) return 'unknown';
        
        if (Array.isArray(data)) {
            if (data.length > 0 && typeof data[0] === 'object') {
                const firstRow = data[0];
                const keys = Object.keys(firstRow).map(k => k.toLowerCase());
                
                if (keys.some(k => k.includes('专利号') || k.includes('patent') || k.includes('公开号'))) {
                    return 'patent-table';
                }
                if (keys.some(k => k.includes('权利要求') || k.includes('claim'))) {
                    return 'claims-table';
                }
                if (keys.some(k => k.includes('分析') || k.includes('结果') || k.includes('ai'))) {
                    return 'analysis-table';
                }
                return 'table-data';
            }
            return 'array-data';
        }
        
        if (typeof data === 'string') {
            if (this.isPatentNumbers(data)) return 'patent-numbers';
            if (this.isClaimsText(data)) return 'claims-text';
            if (this.isJsonString(data)) return 'json-data';
            return 'plain-text';
        }
        
        if (typeof data === 'object') {
            return 'object-data';
        }
        
        return 'unknown';
    }

    analyzeData(data, dataType) {
        const info = {
            dataType: dataType,
            rowCount: 0,
            columnCount: 0,
            columns: [],
            preview: null
        };
        
        if (Array.isArray(data) && data.length > 0) {
            info.rowCount = data.length;
            info.columnCount = Object.keys(data[0] || {}).length;
            info.columns = Object.keys(data[0] || {});
            info.preview = data.slice(0, 3);
        } else if (typeof data === 'string') {
            info.rowCount = data.split('\n').length;
            info.preview = data.slice(0, 200);
        } else if (typeof data === 'object' && data !== null) {
            info.columns = Object.keys(data);
            info.columnCount = info.columns.length;
            info.preview = JSON.stringify(data).slice(0, 200);
        }
        
        return info;
    }

    calculateDataSize(data) {
        try {
            return new Blob([JSON.stringify(data)]).size;
        } catch (e) {
            return 0;
        }
    }

    isPatentNumbers(text) {
        const patentPattern = /(CN|US|EP|WO|JP|KR)\d+[\d\.]*[A-Z\d]{0,3}/gi;
        const matches = text.match(patentPattern);
        return matches && matches.length >= 1;
    }

    isClaimsText(text) {
        const claimsPatterns = [
            /权利要求[书\s]*[\d一二三四五六七八九十]+/,
            /其特征在于/,
            /根据权利要求\s*\d+.*所述/mi
        ];
        return claimsPatterns.some(p => p.test(text));
    }

    isJsonString(text) {
        try {
            JSON.parse(text);
            return true;
        } catch (e) {
            return false;
        }
    }

    addToHistory(item) {
        const exists = this.history.find(h => h.id === item.id);
        if (exists) {
            this.history = this.history.filter(h => h.id !== item.id);
        }
        
        this.history.unshift(item);
        
        if (this.history.length > this.config.maxHistoryItems) {
            this.history = this.history.slice(0, this.config.maxHistoryItems);
        }
    }

    getCompatibleTargets(dataType) {
        const compatible = [];
        
        for (const [key, target] of Object.entries(this.importTargets)) {
            if (target.acceptedTypes.includes(dataType) || target.acceptedTypes.includes('any')) {
                const element = document.querySelector(target.inputSelector || target.fileSelector);
                if (element || target.action === 'navigate') {
                    compatible.push({
                        ...target,
                        key: key,
                        available: !!element,
                        visible: element ? this.isElementVisible(element) : false
                    });
                }
            }
        }
        
        return compatible.sort((a, b) => {
            if (a.visible && !b.visible) return -1;
            if (!a.visible && b.visible) return 1;
            return 0;
        });
    }

    getCurrentActiveSource() {
        const activeTab = document.querySelector('.tab-content.active');
        if (!activeTab) return null;
        
        const tabId = activeTab.id?.replace('-tab', '');
        return this.exportSources[tabId] || null;
    }

    async sendToTarget(targetKey, options = {}) {
        if (!this.currentData) {
            this.showNotification('没有可发送的数据', 'error');
            return { success: false, error: 'No data to send' };
        }
        
        const target = this.importTargets[targetKey];
        if (!target) {
            this.showNotification('目标不存在', 'error');
            return { success: false, error: 'Target not found' };
        }
        
        try {
            this.showProgress('正在发送数据...');
            
            let result;
            switch (target.action) {
                case 'import':
                    result = await this.importToTarget(target, options);
                    break;
                case 'paste':
                    result = await this.pasteToTarget(target, options);
                    break;
                case 'merge':
                    result = await this.mergeToTarget(target, options);
                    break;
                default:
                    result = await this.defaultTransfer(target, options);
            }
            
            if (result.success) {
                this.recordTransfer(targetKey, result);
                this.showNotification(`✓ 数据已发送到 ${target.name}`, 'success');
            }
            
            return result;
        } catch (error) {
            console.error('Send to target failed:', error);
            this.showNotification(`发送失败: ${error.message}`, 'error');
            return { success: false, error: error.message };
        }
    }

    async importToTarget(target, options) {
        const fileSelector = target.fileSelector;
        if (!fileSelector) {
            return { success: false, error: 'No file input selector' };
        }
        
        const fileInput = document.querySelector(fileSelector);
        if (!fileInput) {
            if (options.autoNavigate !== false) {
                this.navigateToTab(target.key);
                return { success: false, error: 'Target not visible, navigating...', needNavigate: true };
            }
            return { success: false, error: 'Target input not found' };
        }
        
        const blob = this.createExcelBlob(this.currentData.data);
        const file = new File([blob], `pipeline_data_${Date.now()}.xlsx`, {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        return { success: true, method: 'file-import' };
    }

    async pasteToTarget(target, options) {
        const inputSelector = target.inputSelector;
        if (!inputSelector) {
            return { success: false, error: 'No input selector' };
        }
        
        const input = document.querySelector(inputSelector);
        if (!input) {
            if (options.autoNavigate !== false) {
                this.navigateToTab(target.key);
                return { success: false, error: 'Target not visible, navigating...', needNavigate: true };
            }
            return { success: false, error: 'Target input not found' };
        }
        
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        let content;
        if (typeof this.currentData.data === 'string') {
            content = this.currentData.data;
        } else if (Array.isArray(this.currentData.data)) {
            content = this.formatTableAsText(this.currentData.data);
        } else {
            content = JSON.stringify(this.currentData.data, null, 2);
        }
        
        if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
            const start = input.selectionStart || 0;
            const end = input.selectionEnd || start;
            input.value = input.value.slice(0, start) + content + input.value.slice(end);
            input.selectionStart = input.selectionEnd = start + content.length;
        } else {
            input.textContent = content;
        }
        
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        
        this.highlightElement(input);
        
        return { success: true, method: 'paste' };
    }

    async mergeToTarget(target, options) {
        return this.importToTarget(target, options);
    }

    async defaultTransfer(target, options) {
        return this.pasteToTarget(target, options);
    }

    createExcelBlob(data) {
        if (typeof XLSX === 'undefined') {
            throw new Error('XLSX library not loaded');
        }
        
        let jsonData = data;
        if (typeof data === 'string') {
            try {
                jsonData = JSON.parse(data);
            } catch (e) {
                jsonData = [{ content: data }];
            }
        }
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(Array.isArray(jsonData) ? jsonData : [jsonData]);
        XLSX.utils.book_append_sheet(wb, ws, 'Data');
        
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }

    formatTableAsText(data) {
        if (!Array.isArray(data) || data.length === 0) {
            return '';
        }
        
        const headers = Object.keys(data[0]);
        const lines = [headers.join('\t')];
        
        data.forEach(row => {
            const values = headers.map(h => {
                const v = row[h];
                if (v === null || v === undefined) return '';
                if (typeof v === 'object') return JSON.stringify(v);
                return String(v);
            });
            lines.push(values.join('\t'));
        });
        
        return lines.join('\n');
    }

    navigateToTab(tabKey) {
        const tabButton = document.querySelector(`[data-tab="${tabKey}"]`);
        if (tabButton) {
            tabButton.click();
        }
    }

    recordTransfer(targetKey, result) {
        const record = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            sourceKey: this.currentData?.source,
            sourceName: this.currentData?.sourceInfo?.name || this.currentData?.source,
            targetKey: targetKey,
            targetName: this.importTargets[targetKey]?.name || targetKey,
            dataType: this.currentData?.dataType,
            dataInfo: {
                rowCount: this.currentData?.metadata?.rowCount,
                columnCount: this.currentData?.metadata?.columnCount
            },
            method: result.method,
            success: result.success
        };
        
        const historyKey = 'globalDataPipeline_transferHistory';
        let transferHistory = [];
        try {
            const saved = localStorage.getItem(historyKey);
            if (saved) {
                transferHistory = JSON.parse(saved);
            }
        } catch (e) {}
        
        transferHistory.unshift(record);
        if (transferHistory.length > 50) {
            transferHistory = transferHistory.slice(0, 50);
        }
        
        localStorage.setItem(historyKey, JSON.stringify(transferHistory));
    }

    getTransferHistory() {
        try {
            const saved = localStorage.getItem('globalDataPipeline_transferHistory');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    }

    detectPatentBatchExport() {
        return window.patentResults && window.patentResults.length > 0;
    }

    getPatentBatchData() {
        if (!window.patentResults || window.patentResults.length === 0) {
            return null;
        }
        
        return window.patentResults.map(result => {
            if (!result.success) {
                return {
                    '专利号': result.patent_number,
                    '状态': '查询失败',
                    '错误信息': result.error || '未知错误'
                };
            }
            
            const data = result.data || {};
            return {
                '专利号': result.patent_number,
                '标题': data.title || '',
                '摘要': (data.abstract || '').slice(0, 500),
                '发明人': (data.inventors || []).join(', '),
                '申请人': data.assignees || data.applicant || '',
                '申请日期': data.application_date || '',
                '公开日期': data.publication_date || '',
                'PDF链接': data.pdf_link || '',
                '来源链接': result.url || ''
            };
        });
    }

    detectAsyncBatchExport() {
        return window.unifiedBatchState?.state?.results?.length > 0;
    }

    getAsyncBatchData() {
        const results = window.unifiedBatchState?.state?.results;
        if (!results || results.length === 0) return null;
        
        return results.map(r => ({
            '序号': r.inputId,
            '状态': r.status,
            '结果': r.result || r.content || '',
            '错误信息': r.error || ''
        }));
    }

    detectLargeBatchExport() {
        return false;
    }

    getLargeBatchData() {
        return null;
    }

    detectClaimsExport() {
        return window.claimsAnalysisResults && window.claimsAnalysisResults.length > 0;
    }

    getClaimsData() {
        return window.claimsAnalysisResults || null;
    }

    detectLocalLibExport() {
        return window.localPatentLibData && window.localPatentLibData.length > 0;
    }

    getLocalLibData() {
        return window.localPatentLibData || null;
    }

    detectUserCacheExport() {
        return window.userCacheManager?.isInitialized();
    }

    getUserCacheData() {
        if (!window.userCacheManager?.isInitialized()) return null;
        
        const result = window.userCacheManager.collectAllData();
        return result.data;
    }

    detectChatExport() {
        const convo = window.appState?.chat?.conversations?.find(
            c => c.id === window.appState?.chat?.currentConversationId
        );
        return convo && convo.messages.length > 1;
    }

    getChatData() {
        const convo = window.appState?.chat?.conversations?.find(
            c => c.id === window.appState?.chat?.currentConversationId
        );
        if (!convo) return null;
        
        return convo.messages
            .filter(m => m.role !== 'system')
            .map(m => ({
                '角色': m.role === 'user' ? '用户' : 'AI',
                '时间': m.timestamp ? new Date(m.timestamp).toLocaleString('zh-CN') : '',
                '内容': m.content
            }));
    }

    setupIntegrationHooks() {
        document.addEventListener('pipeline-export', (e) => {
            if (e.detail && e.detail.data) {
                this.store(e.detail.data, e.detail.source || 'unknown', e.detail.metadata || {});
            }
        });
        
        this.patchExportFunctions();
    }

    patchExportFunctions() {
        if (typeof window.executeExport === 'function') {
            const originalExport = window.executeExport;
            window.executeExport = async (...args) => {
                const result = await originalExport.apply(this, args);
                
                if (window.patentResults && window.patentResults.length > 0) {
                    const data = this.getPatentBatchData();
                    if (data) {
                        this.store(data, 'patent-batch', { trigger: 'export-button' });
                    }
                }
                
                return result;
            };
        }
        
        if (typeof window.exportChatHistory === 'function') {
            const originalChatExport = window.exportChatHistory;
            window.exportChatHistory = async (format, ...args) => {
                const data = this.getChatData();
                if (data) {
                    this.store(data, 'chat-export', { format, trigger: 'export-button' });
                }
                return originalChatExport.apply(this, [format, ...args]);
            };
        }
    }

    createFloatingBall() {
        if (document.getElementById('gdp-floating-ball')) return;
        
        const ball = document.createElement('div');
        ball.id = 'gdp-floating-ball';
        ball.className = 'gdp-floating-ball';
        ball.innerHTML = `
            <div class="gdp-ball-icon">🔄</div>
            <div class="gdp-ball-badge" style="display: none;">0</div>
        `;
        
        document.body.appendChild(ball);
        this.floatingBall = ball;
        
        ball.addEventListener('click', () => this.togglePanel());
        
        this.makeDraggable(ball);
        this.updateFloatingBall();
    }

    updateFloatingBall() {
        if (!this.floatingBall) return;
        
        const badge = this.floatingBall.querySelector('.gdp-ball-badge');
        
        if (this.currentData) {
            this.floatingBall.classList.add('has-data');
            if (badge) {
                badge.style.display = 'flex';
                badge.textContent = this.history.length + 1;
            }
        } else {
            this.floatingBall.classList.remove('has-data');
            if (badge) {
                badge.style.display = 'none';
            }
        }
    }

    createPanel() {
        const existingPanel = document.getElementById('gdp-panel');
        if (existingPanel) {
            this.panel = existingPanel;
            return;
        }
        
        const panel = document.createElement('div');
        panel.id = 'gdp-panel';
        panel.className = 'gdp-panel';
        panel.innerHTML = `
            <div class="gdp-panel-header">
                <span class="gdp-panel-title">🔄 数据管道</span>
                <button class="gdp-panel-close" title="关闭">×</button>
            </div>
            <div class="gdp-panel-body">
                <div class="gdp-current">
                    <div class="gdp-empty">暂无数据，从功能模块导出数据开始使用</div>
                </div>
                <div class="gdp-targets-section">
                    <div class="gdp-section-title">可发送到:</div>
                    <div class="gdp-targets-list"></div>
                </div>
                <div class="gdp-source-section">
                    <div class="gdp-section-title">当前页面可导出:</div>
                    <div class="gdp-source-list"></div>
                </div>
                <div class="gdp-history-section">
                    <div class="gdp-history-header">
                        <span>传递历史</span>
                        <button class="gdp-clear-btn">清空</button>
                    </div>
                    <div class="gdp-history-list"></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        this.panel = panel;
        
        panel.querySelector('.gdp-panel-close').addEventListener('click', () => this.hidePanel());
        panel.querySelector('.gdp-clear-btn').addEventListener('click', () => this.clearHistory());
        
        this.updatePanel();
    }

    updatePanel() {
        if (!this.panel) return;
        
        const currentDiv = this.panel.querySelector('.gdp-current');
        const targetsList = this.panel.querySelector('.gdp-targets-list');
        const sourceList = this.panel.querySelector('.gdp-source-list');
        const historyList = this.panel.querySelector('.gdp-history-list');
        
        if (this.currentData) {
            const sourceInfo = this.currentData.sourceInfo || {};
            const dataInfo = this.currentData.dataInfo || {};
            
            currentDiv.innerHTML = `
                <div class="gdp-data-header">
                    <span class="gdp-data-icon">${sourceInfo.icon || '📊'}</span>
                    <span class="gdp-data-source">${sourceInfo.name || this.currentData.source}</span>
                </div>
                <div class="gdp-data-info">
                    <span class="gdp-data-type">${this.getDataTypeLabel(this.currentData.dataType)}</span>
                    <span class="gdp-data-stats">${dataInfo.rowCount || 0} 行 × ${dataInfo.columnCount || 0} 列</span>
                </div>
                <div class="gdp-data-preview">${this.escapeHtml(dataInfo.preview?.slice(0, 150) || '')}${dataInfo.preview?.length > 150 ? '...' : ''}</div>
                <div class="gdp-data-actions">
                    <button class="gdp-action-btn gdp-download-btn" title="下载为Excel">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        下载
                    </button>
                    <button class="gdp-action-btn gdp-clear-current-btn" title="清除当前数据">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                        清除
                    </button>
                </div>
            `;
            
            currentDiv.querySelector('.gdp-download-btn').addEventListener('click', () => this.downloadCurrentData());
            currentDiv.querySelector('.gdp-clear-current-btn').addEventListener('click', () => this.clearCurrentData());
            
            const compatibleTargets = this.getCompatibleTargets(this.currentData.dataType);
            if (compatibleTargets.length > 0) {
                targetsList.innerHTML = compatibleTargets.map(target => `
                    <button class="gdp-target-btn ${target.visible ? 'visible' : ''}" data-target="${target.key}">
                        <span class="gdp-target-icon">${target.icon}</span>
                        <span class="gdp-target-name">${target.name}</span>
                        ${!target.visible ? '<span class="gdp-target-hint">需切换页面</span>' : ''}
                    </button>
                `).join('');
                
                targetsList.querySelectorAll('.gdp-target-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const targetKey = btn.dataset.target;
                        this.sendToTarget(targetKey);
                    });
                });
            } else {
                targetsList.innerHTML = '<div class="gdp-no-targets">当前数据类型暂无兼容目标</div>';
            }
        } else {
            currentDiv.innerHTML = '<div class="gdp-empty">暂无数据，从功能模块导出数据开始使用</div>';
            targetsList.innerHTML = '<div class="gdp-no-targets">请先导出数据</div>';
        }
        
        const activeSource = this.getCurrentActiveSource();
        if (activeSource && activeSource.trigger()) {
            sourceList.innerHTML = `
                <button class="gdp-source-btn" data-source="${activeSource.position?.tab}">
                    <span class="gdp-source-icon">${activeSource.icon}</span>
                    <span class="gdp-source-name">${activeSource.name}</span>
                    <span class="gdp-source-action">导出到管道</span>
                </button>
            `;
            
            sourceList.querySelector('.gdp-source-btn').addEventListener('click', () => {
                const data = activeSource.getData();
                if (data) {
                    this.store(data, activeSource.position?.tab || 'unknown', { trigger: 'manual' });
                } else {
                    this.showNotification('没有可导出的数据', 'warning');
                }
            });
        } else {
            sourceList.innerHTML = '<div class="gdp-no-source">当前页面无可导出数据</div>';
        }
        
        if (this.history.length > 0) {
            historyList.innerHTML = this.history.slice(0, 5).map(h => `
                <div class="gdp-history-item" data-id="${h.id}">
                    <span class="gdp-history-icon">${h.sourceInfo?.icon || '📊'}</span>
                    <div class="gdp-history-info">
                        <span class="gdp-history-source">${h.sourceInfo?.name || h.source}</span>
                        <span class="gdp-history-stats">${h.metadata?.rowCount || 0} 行</span>
                    </div>
                    <span class="gdp-history-time">${this.formatTime(h.timestamp)}</span>
                </div>
            `).join('');
            
            historyList.querySelectorAll('.gdp-history-item').forEach(item => {
                item.addEventListener('click', () => {
                    const historyItem = this.history.find(h => h.id === item.dataset.id);
                    if (historyItem) {
                        this.currentData = historyItem;
                        this.saveToStorage();
                        this.updatePanel();
                        this.updateFloatingBall();
                    }
                });
            });
        } else {
            historyList.innerHTML = '<div class="gdp-empty-history">无历史记录</div>';
        }
    }

    getDataTypeLabel(dataType) {
        const labels = {
            'patent-table': '专利表格',
            'patent-numbers': '专利号列表',
            'claims-table': '权利要求表格',
            'claims-text': '权利要求文本',
            'analysis-table': '分析结果',
            'chat-history': '对话记录',
            'user-cache': '用户缓存',
            'table-data': '表格数据',
            'json-data': 'JSON数据',
            'plain-text': '普通文本',
            'unknown': '未知类型'
        };
        return labels[dataType] || dataType;
    }

    togglePanel() {
        if (this.panelVisible) {
            this.hidePanel();
        } else {
            this.showPanel();
        }
    }

    showPanel() {
        if (!this.panel) this.createPanel();
        this.panelVisible = true;
        this.panel.classList.add('show');
        this.updatePanel();
        
        if (this.floatingBall) {
            const ballRect = this.floatingBall.getBoundingClientRect();
            const panelWidth = 360;
            const panelHeight = 500;
            
            let left = ballRect.left - panelWidth - 10;
            let top = ballRect.top;
            
            if (left < 10) {
                left = ballRect.right + 10;
            }
            
            if (top + panelHeight > window.innerHeight) {
                top = window.innerHeight - panelHeight - 20;
            }
            if (top < 10) top = 10;
            
            this.panel.style.top = `${top}px`;
            this.panel.style.left = `${left}px`;
        }
    }

    hidePanel() {
        this.panelVisible = false;
        if (this.panel) {
            this.panel.classList.remove('show');
        }
    }

    clearCurrentData() {
        this.currentData = null;
        localStorage.removeItem(this.PIPELINE_STORAGE_KEY);
        this.updateFloatingBall();
        this.updatePanel();
        this.showNotification('当前数据已清除', 'info');
    }

    clearHistory() {
        this.history = [];
        this.saveToStorage();
        this.updatePanel();
        this.updateFloatingBall();
        this.showNotification('历史记录已清空', 'info');
    }

    async downloadCurrentData() {
        if (!this.currentData) return;
        
        try {
            if (typeof XLSX === 'undefined') {
                if (window.ResourceLoader) {
                    await window.ResourceLoader.ensureLibrary('xlsx');
                } else {
                    throw new Error('XLSX library not available');
                }
            }
            
            const blob = this.createExcelBlob(this.currentData.data);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `pipeline_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
            link.click();
            URL.revokeObjectURL(url);
            
            this.showNotification('文件已下载', 'success');
        } catch (error) {
            console.error('Download failed:', error);
            this.showNotification('下载失败: ' + error.message, 'error');
        }
    }

    showStoreNotification(item) {
        const notification = document.createElement('div');
        notification.className = 'gdp-store-notification';
        notification.innerHTML = `
            <div class="gdp-store-icon">✓</div>
            <div class="gdp-store-content">
                <div class="gdp-store-title">数据已捕获</div>
                <div class="gdp-store-info">${item.sourceInfo?.icon || '📊'} ${item.sourceInfo?.name || item.source}</div>
                <div class="gdp-store-stats">${item.metadata?.rowCount || 0} 行数据</div>
            </div>
        `;
        document.body.appendChild(notification);
        
        requestAnimationFrame(() => notification.classList.add('show'));
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `gdp-notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        requestAnimationFrame(() => notification.classList.add('show'));
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 2500);
    }

    showProgress(message) {
        let progress = document.querySelector('.gdp-progress');
        if (!progress) {
            progress = document.createElement('div');
            progress.className = 'gdp-progress';
            document.body.appendChild(progress);
        }
        
        progress.innerHTML = `
            <div class="gdp-progress-spinner"></div>
            <span>${message}</span>
        `;
        progress.classList.add('show');
        
        setTimeout(() => {
            progress.classList.remove('show');
        }, 3000);
    }

    highlightElement(el) {
        const originalTransition = el.style.transition;
        const originalBoxShadow = el.style.boxShadow;
        
        el.style.transition = 'box-shadow 0.3s ease';
        el.style.boxShadow = `0 0 0 3px ${this.theme.primary}80`;
        
        setTimeout(() => {
            el.style.boxShadow = originalBoxShadow;
            el.style.transition = originalTransition;
        }, 1500);
    }

    isElementVisible(el) {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 &&
            window.getComputedStyle(el).display !== 'none' &&
            window.getComputedStyle(el).visibility !== 'hidden';
    }

    makeDraggable(el) {
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        el.addEventListener('mousedown', (e) => {
            if (e.target.closest('.gdp-ball-badge')) return;
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = el.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            el.style.transition = 'none';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            el.style.left = `${startLeft + dx}px`;
            el.style.top = `${startTop + dy}px`;
            el.style.right = 'auto';
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                el.style.transition = '';
            }
        });
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
        return `${date.getMonth() + 1}/${date.getDate()}`;
    }

    injectGlobalStyles() {
        if (document.getElementById('global-data-pipeline-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'global-data-pipeline-styles';
        styles.textContent = `
            .gdp-floating-ball {
                position: fixed;
                top: 170px;
                right: 20px;
                width: 52px;
                height: 52px;
                background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                border-radius: 50%;
                box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
                cursor: pointer;
                z-index: 9998;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                user-select: none;
            }
            
            .gdp-floating-ball:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
            }
            
            .gdp-floating-ball.has-data {
                animation: gdp-pulse 2s infinite;
            }
            
            @keyframes gdp-pulse {
                0%, 100% { box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4); }
                50% { box-shadow: 0 4px 25px rgba(99, 102, 241, 0.7); }
            }
            
            .gdp-ball-icon {
                font-size: 22px;
                filter: brightness(2);
            }
            
            .gdp-ball-badge {
                position: absolute;
                top: -4px;
                right: -4px;
                width: 20px;
                height: 20px;
                background: #ef4444;
                color: white;
                font-size: 11px;
                font-weight: bold;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid white;
            }
            
            .gdp-panel {
                position: fixed;
                width: 360px;
                max-height: 520px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                z-index: 9997;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 13px;
                overflow: hidden;
                opacity: 0;
                transform: scale(0.9) translateY(10px);
                pointer-events: none;
                transition: all 0.3s ease;
            }
            
            .gdp-panel.show {
                opacity: 1;
                transform: scale(1) translateY(0);
                pointer-events: auto;
            }
            
            .gdp-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 14px 16px;
                background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                color: white;
            }
            
            .gdp-panel-title {
                font-weight: 600;
                font-size: 14px;
            }
            
            .gdp-panel-close {
                width: 24px;
                height: 24px;
                border: none;
                background: rgba(255,255,255,0.2);
                color: white;
                border-radius: 4px;
                cursor: pointer;
                font-size: 18px;
                line-height: 1;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .gdp-panel-close:hover {
                background: rgba(255,255,255,0.3);
            }
            
            .gdp-panel-body {
                max-height: 460px;
                overflow-y: auto;
                padding: 12px;
            }
            
            .gdp-current {
                background: #eef2ff;
                border: 1px solid #a5b4fc;
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 12px;
            }
            
            .gdp-empty {
                color: #9ca3af;
                text-align: center;
                padding: 15px;
                font-size: 12px;
            }
            
            .gdp-data-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
            }
            
            .gdp-data-icon {
                font-size: 18px;
            }
            
            .gdp-data-source {
                font-weight: 600;
                color: #312e81;
                font-size: 13px;
            }
            
            .gdp-data-info {
                display: flex;
                gap: 8px;
                margin-bottom: 8px;
            }
            
            .gdp-data-type {
                font-size: 11px;
                color: #4f46e5;
                background: #c7d2fe;
                padding: 2px 8px;
                border-radius: 10px;
            }
            
            .gdp-data-stats {
                font-size: 11px;
                color: #6b7280;
            }
            
            .gdp-data-preview {
                background: white;
                padding: 8px;
                border-radius: 4px;
                font-family: monospace;
                font-size: 11px;
                color: #374151;
                max-height: 50px;
                overflow: hidden;
                white-space: pre-wrap;
                word-break: break-all;
                border: 1px solid #e5e7eb;
                margin-bottom: 10px;
            }
            
            .gdp-data-actions {
                display: flex;
                gap: 8px;
            }
            
            .gdp-action-btn {
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 6px 12px;
                font-size: 12px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                background: white;
                color: #374151;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .gdp-action-btn:hover {
                background: #f3f4f6;
                border-color: #9ca3af;
            }
            
            .gdp-section-title {
                font-weight: 600;
                color: #312e81;
                margin-bottom: 8px;
                font-size: 12px;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .gdp-section-title::before {
                content: '';
                width: 3px;
                height: 14px;
                background: #6366f1;
                border-radius: 2px;
            }
            
            .gdp-targets-section,
            .gdp-source-section {
                margin-bottom: 12px;
            }
            
            .gdp-targets-list,
            .gdp-source-list {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            
            .gdp-target-btn,
            .gdp-source-btn {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px 12px;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s;
                text-align: left;
                width: 100%;
            }
            
            .gdp-target-btn:hover,
            .gdp-source-btn:hover {
                background: #eef2ff;
                border-color: #6366f1;
            }
            
            .gdp-target-btn.visible {
                background: #f0fdf4;
                border-color: #86efac;
            }
            
            .gdp-target-icon,
            .gdp-source-icon {
                font-size: 16px;
            }
            
            .gdp-target-name,
            .gdp-source-name {
                flex: 1;
                font-weight: 500;
                color: #1e293b;
                font-size: 12px;
            }
            
            .gdp-target-hint {
                font-size: 10px;
                color: #94a3b8;
                background: #f1f5f9;
                padding: 2px 6px;
                border-radius: 4px;
            }
            
            .gdp-source-action {
                font-size: 11px;
                color: #6366f1;
                font-weight: 500;
            }
            
            .gdp-no-targets,
            .gdp-no-source {
                color: #9ca3af;
                text-align: center;
                padding: 12px;
                font-size: 12px;
            }
            
            .gdp-history-section {
                border-top: 1px solid #e5e7eb;
                padding-top: 12px;
            }
            
            .gdp-history-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }
            
            .gdp-history-header span {
                font-weight: 600;
                color: #312e81;
                font-size: 12px;
            }
            
            .gdp-clear-btn {
                font-size: 11px;
                color: #ef4444;
                background: none;
                border: none;
                cursor: pointer;
            }
            
            .gdp-clear-btn:hover {
                text-decoration: underline;
            }
            
            .gdp-history-list {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            .gdp-history-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px;
                background: #f9fafb;
                border-radius: 6px;
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .gdp-history-item:hover {
                background: #eef2ff;
            }
            
            .gdp-history-icon {
                font-size: 14px;
            }
            
            .gdp-history-info {
                flex: 1;
                display: flex;
                flex-direction: column;
            }
            
            .gdp-history-source {
                font-size: 12px;
                color: #374151;
            }
            
            .gdp-history-stats {
                font-size: 10px;
                color: #9ca3af;
            }
            
            .gdp-history-time {
                font-size: 10px;
                color: #9ca3af;
            }
            
            .gdp-empty-history {
                color: #9ca3af;
                text-align: center;
                padding: 12px;
                font-size: 11px;
            }
            
            .gdp-store-notification {
                position: fixed;
                top: 230px;
                right: 20px;
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 14px 18px;
                background: white;
                border-radius: 10px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                z-index: 10000;
                opacity: 0;
                transform: translateX(20px);
                transition: all 0.3s ease;
                border-left: 4px solid #6366f1;
            }
            
            .gdp-store-notification.show {
                opacity: 1;
                transform: translateX(0);
            }
            
            .gdp-store-icon {
                width: 32px;
                height: 32px;
                background: #6366f1;
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                font-weight: bold;
            }
            
            .gdp-store-content {
                display: flex;
                flex-direction: column;
            }
            
            .gdp-store-title {
                font-weight: 600;
                color: #312e81;
                font-size: 13px;
            }
            
            .gdp-store-info {
                color: #6366f1;
                font-size: 11px;
            }
            
            .gdp-store-stats {
                color: #9ca3af;
                font-size: 10px;
            }
            
            .gdp-notification {
                position: fixed;
                top: 230px;
                right: 20px;
                padding: 12px 20px;
                background: #374151;
                color: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                opacity: 0;
                transform: translateX(20px);
                transition: all 0.3s ease;
            }
            
            .gdp-notification.show {
                opacity: 1;
                transform: translateX(0);
            }
            
            .gdp-notification.success {
                background: #10b981;
            }
            
            .gdp-notification.error {
                background: #ef4444;
            }
            
            .gdp-notification.warning {
                background: #f59e0b;
            }
            
            .gdp-notification.info {
                background: #3b82f6;
            }
            
            .gdp-progress {
                position: fixed;
                top: 230px;
                right: 20px;
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 12px 18px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                opacity: 0;
                transform: translateX(20px);
                transition: all 0.3s ease;
            }
            
            .gdp-progress.show {
                opacity: 1;
                transform: translateX(0);
            }
            
            .gdp-progress-spinner {
                width: 16px;
                height: 16px;
                border: 2px solid #e5e7eb;
                border-top-color: #6366f1;
                border-radius: 50%;
                animation: gdp-spin 0.8s linear infinite;
            }
            
            @keyframes gdp-spin {
                to { transform: rotate(360deg); }
            }
        `;
        
        document.head.appendChild(styles);
    }

    bindEvents() {
        document.addEventListener('click', (e) => {
            if (this.panelVisible &&
                this.panel && !this.panel.contains(e.target) &&
                this.floatingBall && !this.floatingBall.contains(e.target)) {
                this.hidePanel();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.panelVisible) {
                this.hidePanel();
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.globalDataPipeline = new GlobalDataPipeline();
    window.globalDataPipeline.init();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    window.globalDataPipeline = new GlobalDataPipeline();
    window.globalDataPipeline.init();
}

console.log('[GlobalDataPipeline] Module loaded');
