/**
 * 数据管道集成模块
 * 负责与现有功能模块的集成
 */

class PipelineIntegration {
    constructor() {
        this.initialized = false;
        this.hooks = new Map();
        this.monitors = new Map();
        this.observer = null;
        this.checkInterval = null;
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
        
        this.checkInterval = setInterval(() => this.checkMonitors(), 3000);
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
                <span class="badge-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg></span>
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
            
            const d = result.data || {};
            return {
                '专利号': result.patent_number,
                '标题': d.title || '',
                '摘要': (d.abstract || '').slice(0, 500),
                '发明人': (d.inventors || []).join(', '),
                '申请人': d.assignees || d.applicant || '',
                '申请日期': d.application_date || '',
                '公开日期': d.publication_date || '',
                'PDF链接': d.pdf_link || '',
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
        
        this.observer = new MutationObserver(this.debounce(() => {
            this.addQuickExportButtons();
            this.addTargetReceiveButtons();
        }, 500));
        
        const mainContent = document.querySelector('.main-content') || document.querySelector('#main-content') || document.body;
        this.observer.observe(mainContent, {
            childList: true,
            subtree: false
        });
    }

    debounce(fn, delay) {
        let timer = null;
        return (...args) => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
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
            { selector: '#unified_excel_file', target: 'async-batch', type: 'file' },
            { selector: '#unified_rep_excel_input', target: 'async-batch', type: 'file' },
            { selector: '#unified_rep_jsonl_input', target: 'async-batch', type: 'file' },
            { selector: '#classification_excel_file', target: 'async-batch', type: 'file' },
            { selector: '#classification_rep_excel_input', target: 'async-batch', type: 'file' },
            { selector: '#classification_rep_jsonl_input', target: 'async-batch', type: 'file' },
            { selector: '#lpl_original_file_input', target: 'local-patent-lib', type: 'file' },
            { selector: '#lpl_original_reupload_input', target: 'local-patent-lib', type: 'file' },
            { selector: '#lpl_new_file_input', target: 'local-patent-lib', type: 'file' },
            { selector: '#concat_file_input', target: 'local-patent-lib', type: 'file' },
            { selector: '#claims_excel_file', target: 'claims-processor', type: 'file' }
        ];
        
        targetInputs.forEach(({ selector, target, type }) => {
            const input = document.querySelector(selector);
            if (!input) return;
            
            const parent = input.parentElement;
            if (!parent || parent.querySelector('.pipeline-upload-wrapper')) return;
            
            const wrapper = document.createElement('div');
            wrapper.className = 'pipeline-upload-wrapper';
            wrapper.style.cssText = `
                display: inline-flex;
                align-items: center;
                position: relative;
            `;
            
            input.style.display = 'none';
            
            const uploadBtn = document.createElement('button');
            uploadBtn.className = 'pipeline-upload-btn';
            uploadBtn.type = 'button';
            uploadBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>选择文件来源</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"/>
                </svg>
            `;
            uploadBtn.style.cssText = `
                padding: 8px 16px;
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 13px;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                transition: all 0.2s;
            `;
            
            const dropdown = document.createElement('div');
            dropdown.className = 'pipeline-upload-dropdown';
            dropdown.style.cssText = `
                position: absolute;
                top: 100%;
                left: 0;
                margin-top: 4px;
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 1000;
                min-width: 200px;
                display: none;
                overflow: hidden;
            `;
            
            const localOption = document.createElement('div');
            localOption.className = 'pipeline-dropdown-option';
            localOption.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>从本地上传文件</span>
            `;
            localOption.style.cssText = `
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 12px 14px;
                cursor: pointer;
                transition: background 0.2s;
                font-size: 13px;
                color: #374151;
            `;
            
            const pipelineOption = document.createElement('div');
            pipelineOption.className = 'pipeline-dropdown-option pipeline-receive-option';
            pipelineOption.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
                </svg>
                <span>从数据管道接收</span>
                <span class="pipeline-status" style="margin-left: auto; font-size: 11px; color: #9ca3af;">暂无数据</span>
            `;
            pipelineOption.style.cssText = `
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 12px 14px;
                cursor: pointer;
                transition: background 0.2s;
                font-size: 13px;
                color: #374151;
                border-top: 1px solid #f3f4f6;
            `;
            
            dropdown.appendChild(localOption);
            dropdown.appendChild(pipelineOption);
            
            const fileNameDisplay = document.createElement('span');
            fileNameDisplay.className = 'pipeline-file-name';
            fileNameDisplay.style.cssText = `
                color: var(--text-color-secondary, #6b7280);
                font-size: 12px;
                margin-left: 12px;
                max-width: 200px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            `;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'pipeline-delete-btn';
            deleteBtn.type = 'button';
            deleteBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
            `;
            deleteBtn.title = '删除已加载的表格';
            deleteBtn.style.cssText = `
                padding: 6px 8px;
                background: #ef4444;
                color: white;
                border: none;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                display: none;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
                margin-left: 8px;
            `;
            
            const clearFileInput = () => {
                input.value = '';
                fileNameDisplay.textContent = '';
                fileNameDisplay.style.color = 'var(--text-color-secondary, #6b7280)';
                deleteBtn.style.display = 'none';
                
                const clearEvent = new CustomEvent('fileCleared', {
                    detail: { selector: selector },
                    bubbles: true
                });
                input.dispatchEvent(clearEvent);
                
                this.clearRelatedData(selector);
            };
            
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                clearFileInput();
            });
            
            let dropdownVisible = false;
            
            const updatePipelineStatus = () => {
                const statusSpan = pipelineOption.querySelector('.pipeline-status');
                if (window.globalDataPipeline?.currentData) {
                    const dataInfo = window.globalDataPipeline.currentData.dataInfo || {};
                    statusSpan.textContent = `${dataInfo.rowCount || 0}条数据`;
                    statusSpan.style.color = '#10b981';
                } else {
                    statusSpan.textContent = '暂无数据';
                    statusSpan.style.color = '#9ca3af';
                }
            };
            
            uploadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (dropdownVisible) {
                    dropdown.style.display = 'none';
                    dropdownVisible = false;
                } else {
                    updatePipelineStatus();
                    dropdown.style.display = 'block';
                    dropdownVisible = true;
                }
            });
            
            localOption.addEventListener('mouseenter', () => {
                localOption.style.background = '#f3f4f6';
            });
            localOption.addEventListener('mouseleave', () => {
                localOption.style.background = 'transparent';
            });
            localOption.addEventListener('click', () => {
                input.click();
                dropdown.style.display = 'none';
                dropdownVisible = false;
            });
            
            pipelineOption.addEventListener('mouseenter', () => {
                pipelineOption.style.background = '#ecfdf5';
            });
            pipelineOption.addEventListener('mouseleave', () => {
                pipelineOption.style.background = 'transparent';
            });
            pipelineOption.addEventListener('click', async () => {
                dropdown.style.display = 'none';
                dropdownVisible = false;
                if (window.globalDataPipeline?.currentData) {
                    await window.globalDataPipeline.sendToTarget(target);
                    deleteBtn.style.display = 'inline-flex';
                } else {
                    window.globalDataPipeline?.showPanel();
                }
            });
            
            document.addEventListener('click', (e) => {
                if (!wrapper.contains(e.target)) {
                    dropdown.style.display = 'none';
                    dropdownVisible = false;
                }
            });
            
            input.addEventListener('change', () => {
                if (input.files && input.files.length > 0) {
                    fileNameDisplay.textContent = input.files[0].name;
                    fileNameDisplay.style.color = 'var(--success-color, #10b981)';
                    deleteBtn.style.display = 'inline-flex';
                } else {
                    fileNameDisplay.textContent = '';
                    deleteBtn.style.display = 'none';
                }
            });
            
            wrapper.appendChild(uploadBtn);
            wrapper.appendChild(dropdown);
            wrapper.appendChild(fileNameDisplay);
            wrapper.appendChild(deleteBtn);
            
            parent.insertBefore(wrapper, input);
            wrapper.appendChild(input);
        });
    }

    clearRelatedData(selector) {
        const selectorToStateMap = {
            '#unified_excel_file': 'unifiedBatchState',
            '#unified_rep_excel_input': 'unifiedBatchState',
            '#unified_rep_jsonl_input': 'unifiedBatchState',
            '#classification_excel_file': 'unifiedBatchState',
            '#classification_rep_excel_input': 'unifiedBatchState',
            '#classification_rep_jsonl_input': 'unifiedBatchState',
            '#lpl_original_file_input': 'localPatentLibState',
            '#lpl_original_reupload_input': 'localPatentLibState',
            '#lpl_new_file_input': 'localPatentLibState',
            '#concat_file_input': 'localPatentLibState',
            '#claims_excel_file': 'claimsProcessorState'
        };
        
        const stateKey = selectorToStateMap[selector];
        
        switch (stateKey) {
            case 'unifiedBatchState':
                if (window.unifiedBatchState?.state) {
                    if (selector === '#unified_excel_file') {
                        window.unifiedBatchState.state.excelData = null;
                        window.unifiedBatchState.state.excelHeaders = [];
                        window.unifiedBatchState.state.selectedSheet = null;
                        const sheetSelector = document.querySelector('#unified_sheet_selector');
                        const columnSelector = document.querySelector('#unified_column_selector');
                        if (sheetSelector) sheetSelector.innerHTML = '<option value="">-- 请先上传Excel --</option>';
                        if (columnSelector) columnSelector.innerHTML = '';
                    } else if (selector === '#unified_rep_excel_input' || selector === '#unified_rep_jsonl_input') {
                        window.unifiedBatchState.state.repExcelData = null;
                        window.unifiedBatchState.state.repJsonlData = null;
                    } else if (selector === '#classification_excel_file') {
                        window.unifiedBatchState.state.classificationExcelData = null;
                        window.unifiedBatchState.state.classificationHeaders = [];
                        const sheetSelector = document.querySelector('#classification_sheet_selector');
                        const columnSelector = document.querySelector('#classification_column_selector');
                        if (sheetSelector) sheetSelector.innerHTML = '<option value="">-- 请先上传Excel --</option>';
                        if (columnSelector) columnSelector.innerHTML = '';
                    } else if (selector === '#classification_rep_excel_input' || selector === '#classification_rep_jsonl_input') {
                        window.unifiedBatchState.state.classificationRepExcelData = null;
                        window.unifiedBatchState.state.classificationRepJsonlData = null;
                    }
                }
                break;
            case 'localPatentLibState':
                if (window.localPatentLibState) {
                    if (selector === '#lpl_original_file_input' || selector === '#lpl_original_reupload_input') {
                        window.localPatentLibState.originalData = null;
                        window.localPatentLibState.originalHeaders = [];
                        const fileConfirm = document.querySelector('#lpl_original_file_confirm');
                        if (fileConfirm) fileConfirm.value = '';
                    } else if (selector === '#lpl_new_file_input') {
                        window.localPatentLibState.newData = null;
                        window.localPatentLibState.newHeaders = [];
                    } else if (selector === '#concat_file_input') {
                        window.localPatentLibState.concatFiles = [];
                    }
                }
                break;
            case 'claimsProcessorState':
                if (window.claimsProcessorState) {
                    window.claimsProcessorState.excelData = null;
                    window.claimsProcessorState.headers = [];
                    const sheetSelector = document.querySelector('#claims_sheet_selector');
                    const columnSelector = document.querySelector('#claims_column_selector');
                    if (sheetSelector) sheetSelector.innerHTML = '';
                    if (columnSelector) columnSelector.innerHTML = '';
                }
                break;
        }
        
        console.log(`[PipelineIntegration] Cleared data for: ${selector}`);
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
                        <h3 style="margin: 0; font-size: 16px; display: flex; align-items: center; gap: 8px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>数据传递历史</h3>
                        <button class="modal-close" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer;">&times;</button>
                    </div>
                    <div class="modal-body" style="padding: 16px; max-height: 400px; overflow-y: auto;">
                        ${history.map(item => `
                            <div class="history-item" style="display: flex; align-items: center; gap: 12px; padding: 12px; border-bottom: 1px solid #e5e7eb;">
                                <div class="history-icon" style="display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;">${item.success ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'}</div>
                                <div class="history-info" style="flex: 1;">
                                    <div style="font-weight: 500; color: #1f2937;">${item.sourceName} -> ${item.targetName}</div>
                                    <div style="font-size: 12px; color: #6b7280;">${item.dataInfo?.rowCount || 0} 行数据 - ${this.formatTime(item.timestamp)}</div>
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

    destroy() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.initialized = false;
    }
}

const pipelineIntegration = new PipelineIntegration();

let initAttempts = 0;
const maxInitAttempts = 5;

function tryInit() {
    if (pipelineIntegration.initialized) return;
    
    initAttempts++;
    
    if (document.readyState === 'complete') {
        setTimeout(() => {
            pipelineIntegration.init();
        }, 500);
    } else if (initAttempts < maxInitAttempts) {
        setTimeout(tryInit, 1000);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit);
} else {
    tryInit();
}

window.pipelineIntegration = pipelineIntegration;

console.log('[PipelineIntegration] Module loaded');
