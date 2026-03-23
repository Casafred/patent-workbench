/**
 * 数据管道集成模块
 * 负责与现有功能模块的集成
 */

class PipelineIntegration {
    constructor() {
        this.initialized = false;
        this.hooks = new Map();
        this.monitors = new Map();
    }

    init() {
        if (this.initialized) return;
        
        this.setupExportInterceptors();
        this.setupDataMonitors();
        this.setupUIEnhancements();
        this.setupKeyboardShortcuts();
        
        this.initialized = true;
        console.log('[PipelineIntegration] Initialized');
    }

    setupExportInterceptors() {
        this.interceptFunction('executeExport', (original) => {
            return async (...args) => {
                const result = await original.apply(window, args);
                this.capturePatentBatchData();
                return result;
            };
        });
        
        this.interceptFunction('exportChatHistory', (original) => {
            return async (format, ...args) => {
                this.captureChatData();
                return original.apply(window, [format, ...args]);
            };
        });
        
        this.interceptFunction('exportToExcel', (original) => {
            return async (...args) => {
                const result = await original.apply(window, args);
                this.captureAsyncBatchData();
                return result;
            };
        });
        
        this.interceptFunction('exportFinalReport', (original) => {
            return async (...args) => {
                const result = await original.apply(window, args);
                this.captureLargeBatchData();
                return result;
            };
        });
    }

    interceptFunction(name, interceptor) {
        if (typeof window[name] === 'function') {
            const original = window[name];
            window[name] = interceptor(original);
            this.hooks.set(name, { original, interceptor });
            console.log(`[PipelineIntegration] Intercepted: ${name}`);
        }
    }

    setupDataMonitors() {
        this.monitors.set('patentResults', {
            check: () => window.patentResults?.length > 0,
            lastCount: 0,
            onChange: () => this.capturePatentBatchData()
        });
        
        this.monitors.set('unifiedBatchState', {
            check: () => window.unifiedBatchState?.state?.results?.length > 0,
            lastCount: 0,
            onChange: () => this.captureAsyncBatchData()
        });
        
        this.monitors.set('claimsAnalysisResults', {
            check: () => window.claimsAnalysisResults?.length > 0,
            lastCount: 0,
            onChange: () => this.captureClaimsData()
        });
        
        setInterval(() => this.checkMonitors(), 2000);
    }

    checkMonitors() {
        this.monitors.forEach((monitor, key) => {
            const currentCount = monitor.check() ? this.getDataCount(key) : 0;
            if (currentCount !== monitor.lastCount && currentCount > 0) {
                monitor.lastCount = currentCount;
                this.updatePipelineSourceStatus(key, currentCount);
            }
        });
    }

    getDataCount(key) {
        switch (key) {
            case 'patentResults':
                return window.patentResults?.length || 0;
            case 'unifiedBatchState':
                return window.unifiedBatchState?.state?.results?.length || 0;
            case 'claimsAnalysisResults':
                return window.claimsAnalysisResults?.length || 0;
            default:
                return 0;
        }
    }

    updatePipelineSourceStatus(sourceKey, count) {
        if (window.globalDataPipeline) {
            const source = window.globalDataPipeline.exportSources[sourceKey];
            if (source && document.querySelector(source.position?.selector)) {
                this.addExportBadge(source.position.selector, count);
            }
        }
    }

    addExportBadge(selector, count) {
        const container = document.querySelector(selector);
        if (!container) return;
        
        let badge = container.querySelector('.pipeline-export-badge');
        if (!badge) {
            badge = document.createElement('div');
            badge.className = 'pipeline-export-badge';
            badge.innerHTML = `
                <span class="badge-icon">🔄</span>
                <span class="badge-count">${count}</span>
                <span class="badge-text">条数据可导出</span>
                <button class="badge-action" title="导出到数据管道">导出</button>
            `;
            badge.style.cssText = `
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                color: white;
                border-radius: 8px;
                font-size: 12px;
                margin: 10px 0;
                animation: slideIn 0.3s ease;
            `;
            
            badge.querySelector('.badge-action').addEventListener('click', () => {
                this.captureCurrentSource();
            });
            
            container.insertBefore(badge, container.firstChild);
        } else {
            badge.querySelector('.badge-count').textContent = count;
        }
    }

    captureCurrentSource() {
        const activeTab = document.querySelector('.tab-content.active');
        if (!activeTab) return;
        
        const tabId = activeTab.id?.replace('-tab', '');
        
        switch (tabId) {
            case 'patent-batch':
                this.capturePatentBatchData();
                break;
            case 'async-batch':
                this.captureAsyncBatchData();
                break;
            case 'claims-processor':
                this.captureClaimsData();
                break;
            case 'instant-chat':
                this.captureChatData();
                break;
            default:
                console.log('[PipelineIntegration] No capture handler for tab:', tabId);
        }
    }

    capturePatentBatchData() {
        if (!window.patentResults || window.patentResults.length === 0) return;
        
        const data = window.patentResults.map(result => {
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
        
        if (window.globalDataPipeline) {
            window.globalDataPipeline.store(data, 'patent-batch', {
                trigger: 'auto-capture',
                originalCount: window.patentResults.length
            });
        }
    }

    captureAsyncBatchData() {
        const results = window.unifiedBatchState?.state?.results;
        if (!results || results.length === 0) return;
        
        const data = results.map(r => ({
            '序号': r.inputId,
            '模板': r.templateName || '',
            '状态': r.status,
            '结果': r.result || r.content || '',
            'Tokens': r.usage?.total_tokens || '-',
            '错误信息': r.error || ''
        }));
        
        if (window.globalDataPipeline) {
            window.globalDataPipeline.store(data, 'async-batch', {
                trigger: 'auto-capture',
                originalCount: results.length
            });
        }
    }

    captureLargeBatchData() {
        const data = window.unifiedBatchState?.state?.reporter?.finalOutputData;
        if (!data || data.length === 0) return;
        
        if (window.globalDataPipeline) {
            window.globalDataPipeline.store(data, 'large-batch', {
                trigger: 'export-capture',
                originalCount: data.length
            });
        }
    }

    captureClaimsData() {
        if (!window.claimsAnalysisResults || window.claimsAnalysisResults.length === 0) return;
        
        if (window.globalDataPipeline) {
            window.globalDataPipeline.store(window.claimsAnalysisResults, 'claims-processor', {
                trigger: 'auto-capture',
                originalCount: window.claimsAnalysisResults.length
            });
        }
    }

    captureChatData() {
        const convo = window.appState?.chat?.conversations?.find(
            c => c.id === window.appState?.chat?.currentConversationId
        );
        if (!convo || convo.messages.length <= 1) return;
        
        const data = convo.messages
            .filter(m => m.role !== 'system')
            .map(m => ({
                '角色': m.role === 'user' ? '用户' : 'AI',
                '时间': m.timestamp ? new Date(m.timestamp).toLocaleString('zh-CN') : '',
                '内容': m.content
            }));
        
        if (window.globalDataPipeline) {
            window.globalDataPipeline.store(data, 'chat-export', {
                trigger: 'export-capture',
                conversationId: convo.id,
                conversationTitle: convo.title
            });
        }
    }

    setupUIEnhancements() {
        this.addQuickExportButtons();
        this.addTargetReceiveButtons();
        
        const observer = new MutationObserver(() => {
            this.addQuickExportButtons();
            this.addTargetReceiveButtons();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    addQuickExportButtons() {
        const exportContainers = [
            { selector: '#patent_results_container', source: 'patent-batch' },
            { selector: '#async_results_container', source: 'async-batch' },
            { selector: '#claims_results_container', source: 'claims-processor' }
        ];
        
        exportContainers.forEach(({ selector, source }) => {
            const container = document.querySelector(selector);
            if (!container) return;
            
            const existingBtn = container.querySelector('.pipeline-quick-export');
            if (existingBtn) return;
            
            const btn = document.createElement('button');
            btn.className = 'pipeline-quick-export';
            btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>导出`;
            btn.title = '导出数据到管道';
            btn.style.cssText = `
                position: absolute;
                top: 10px;
                right: 10px;
                padding: 6px 12px;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 12px;
                cursor: pointer;
                z-index: 10;
                transition: all 0.2s;
                display: flex;
                align-items: center;
            `;
            
            btn.addEventListener('click', () => {
                this.captureCurrentSource();
            });
            
            if (getComputedStyle(container).position === 'static') {
                container.style.position = 'relative';
            }
            container.appendChild(btn);
        });
    }

    addTargetReceiveButtons() {
        const targetInputs = [
            { selector: '#async_manual_input', target: 'async-batch' },
            { selector: '#claims_text_input', target: 'claims-processor' }
        ];
        
        targetInputs.forEach(({ selector, target }) => {
            const input = document.querySelector(selector);
            if (!input) return;
            
            const parent = input.parentElement;
            if (!parent || parent.querySelector('.pipeline-receive-btn')) return;
            
            const btn = document.createElement('button');
            btn.className = 'pipeline-receive-btn';
            btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>`;
            btn.title = '从数据管道接收';
            btn.style.cssText = `
                position: absolute;
                right: 8px;
                top: 50%;
                transform: translateY(-50%);
                width: 28px;
                height: 28px;
                background: #10b981;
                color: white;
                border: none;
                border-radius: 50%;
                font-size: 14px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
                z-index: 5;
            `;
            
            btn.addEventListener('click', () => {
                if (window.globalDataPipeline?.currentData) {
                    window.globalDataPipeline.sendToTarget(target);
                } else {
                    window.globalDataPipeline?.showPanel();
                }
            });
            
            if (getComputedStyle(parent).position === 'static') {
                parent.style.position = 'relative';
            }
            parent.appendChild(btn);
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey) {
                switch (e.key.toUpperCase()) {
                    case 'P':
                        e.preventDefault();
                        window.globalDataPipeline?.togglePanel();
                        break;
                    case 'S':
                        e.preventDefault();
                        this.captureCurrentSource();
                        break;
                    case 'H':
                        e.preventDefault();
                        this.showTransferHistory();
                        break;
                }
            }
        });
    }

    showTransferHistory() {
        const history = window.globalDataPipeline?.getTransferHistory() || [];
        
        if (history.length === 0) {
            window.globalDataPipeline?.showNotification('暂无传递历史', 'info');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'pipeline-history-modal';
        modal.innerHTML = `
            <div class="modal-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;">
                <div class="modal-content" style="background: white; border-radius: 12px; width: 500px; max-height: 80vh; overflow: hidden;">
                    <div class="modal-header" style="padding: 16px; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0; font-size: 16px;">📊 数据传递历史</h3>
                        <button class="modal-close" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer;">&times;</button>
                    </div>
                    <div class="modal-body" style="padding: 16px; max-height: 400px; overflow-y: auto;">
                        ${history.map(item => `
                            <div class="history-item" style="display: flex; align-items: center; gap: 12px; padding: 12px; border-bottom: 1px solid #e5e7eb;">
                                <div class="history-icon" style="font-size: 20px;">${item.success ? '✅' : '❌'}</div>
                                <div class="history-info" style="flex: 1;">
                                    <div style="font-weight: 500; color: #1f2937;">${item.sourceName} → ${item.targetName}</div>
                                    <div style="font-size: 12px; color: #6b7280;">${item.dataInfo?.rowCount || 0} 行数据 · ${this.formatTime(item.timestamp)}</div>
                                </div>
                                <div style="font-size: 11px; color: #9ca3af;">${item.method}</div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="modal-footer" style="padding: 12px 16px; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end;">
                        <button class="modal-close-btn" style="padding: 8px 16px; background: #6366f1; color: white; border: none; border-radius: 6px; cursor: pointer;">关闭</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
            btn.addEventListener('click', () => modal.remove());
        });
        
        modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                modal.remove();
            }
        });
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
        return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
}

const pipelineIntegration = new PipelineIntegration();

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        pipelineIntegration.init();
    }, 1000);
});

if (document.readyState === 'complete') {
    setTimeout(() => {
        pipelineIntegration.init();
    }, 1000);
}

window.pipelineIntegration = pipelineIntegration;

console.log('[PipelineIntegration] Module loaded');
