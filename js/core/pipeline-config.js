/**
 * 数据管道配置模块
 * 定义所有导出源和导入目标的详细配置
 */

const PipelineConfig = {
    version: '1.0.0',
    
    dataTypes: {
        'patent-table': {
            name: '专利表格',
            icon: '📋',
            description: '包含专利信息的表格数据',
            compatibleTargets: ['patent-batch', 'async-batch', 'large-batch', 'local-patent-lib', 'claims-processor']
        },
        'patent-numbers': {
            name: '专利号列表',
            icon: '🔢',
            description: '专利号文本列表',
            compatibleTargets: ['patent-batch', 'async-batch', 'instant-chat']
        },
        'claims-table': {
            name: '权利要求表格',
            icon: '📄',
            description: '权利要求分析结果表格',
            compatibleTargets: ['claims-processor', 'async-batch', 'instant-chat']
        },
        'claims-text': {
            name: '权利要求文本',
            icon: '📝',
            description: '权利要求原文文本',
            compatibleTargets: ['claims-processor', 'instant-chat']
        },
        'analysis-table': {
            name: '分析结果表格',
            icon: '📊',
            description: 'AI分析处理结果',
            compatibleTargets: ['async-batch', 'large-batch', 'instant-chat']
        },
        'chat-history': {
            name: '对话记录',
            icon: '💬',
            description: '即时对话历史',
            compatibleTargets: ['instant-chat']
        },
        'user-cache': {
            name: '用户缓存',
            icon: '💾',
            description: '用户数据备份',
            compatibleTargets: []
        },
        'json-data': {
            name: 'JSON数据',
            icon: '🔧',
            description: 'JSON格式数据',
            compatibleTargets: ['async-batch', 'large-batch', 'instant-chat']
        },
        'table-data': {
            name: '通用表格',
            icon: '📈',
            description: '通用表格数据',
            compatibleTargets: ['async-batch', 'large-batch']
        },
        'plain-text': {
            name: '普通文本',
            icon: '📃',
            description: '普通文本内容',
            compatibleTargets: ['instant-chat', 'claims-processor']
        }
    },
    
    exportSources: {
        'patent-batch': {
            name: '功能六：批量专利解读',
            icon: '📋',
            dataType: 'patent-table',
            description: '专利查询结果Excel导出',
            tabId: 'patent-batch',
            containerSelector: '#patent_results_container',
            exportButtonSelector: '.export-btn, [onclick*="exportPatent"]',
            detectCondition: () => window.patentResults && window.patentResults.length > 0,
            extractData: () => {
                if (!window.patentResults || window.patentResults.length === 0) return null;
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
            },
            integrationHooks: {
                interceptExport: true,
                exportFunction: 'executeExport',
                customEvent: 'patent-batch-export'
            }
        },
        
        'async-batch': {
            name: '功能二：异步批处理',
            icon: '⚡',
            dataType: 'analysis-table',
            description: '批处理结果Excel导出',
            tabId: 'async-batch',
            containerSelector: '#async_results_container',
            exportButtonSelector: '.export-results-btn, [onclick*="exportToExcel"]',
            detectCondition: () => window.unifiedBatchState?.state?.results?.length > 0,
            extractData: () => {
                const results = window.unifiedBatchState?.state?.results;
                if (!results || results.length === 0) return null;
                return results.map(r => ({
                    '序号': r.inputId,
                    '模板': r.templateName || '',
                    '状态': r.status,
                    '结果': r.result || r.content || '',
                    'Tokens': r.usage?.total_tokens || '-',
                    '错误信息': r.error || ''
                }));
            },
            integrationHooks: {
                interceptExport: true,
                exportFunction: 'exportAsyncResults',
                customEvent: 'async-batch-export'
            }
        },
        
        'large-batch': {
            name: '功能三：大批量处理',
            icon: '📊',
            dataType: 'analysis-table',
            description: '大批量处理结果导出',
            tabId: 'large-batch',
            containerSelector: '#gen_results_container',
            exportButtonSelector: '.export-btn, [onclick*="exportFinal"]',
            detectCondition: () => false,
            extractData: () => null,
            integrationHooks: {
                interceptExport: false,
                customEvent: 'large-batch-export'
            }
        },
        
        'claims-processor': {
            name: '功能七：权利要求分析',
            icon: '📄',
            dataType: 'claims-table',
            description: '权利要求分析结果导出',
            tabId: 'claims-processor',
            containerSelector: '#claims_results_container',
            exportButtonSelector: '.export-btn, [onclick*="exportClaims"]',
            detectCondition: () => window.claimsAnalysisResults && window.claimsAnalysisResults.length > 0,
            extractData: () => window.claimsAnalysisResults || null,
            integrationHooks: {
                interceptExport: true,
                exportFunction: 'exportClaimsResults',
                customEvent: 'claims-processor-export'
            }
        },
        
        'local-patent-lib': {
            name: '功能四：本地专利库',
            icon: '📚',
            dataType: 'patent-table',
            description: '专利库数据导出',
            tabId: 'local-patent-lib',
            containerSelector: '#lpl_results_container',
            exportButtonSelector: '.export-btn, [onclick*="exportLib"]',
            detectCondition: () => window.localPatentLibData && window.localPatentLibData.length > 0,
            extractData: () => window.localPatentLibData || null,
            integrationHooks: {
                interceptExport: false,
                customEvent: 'local-patent-lib-export'
            }
        },
        
        'user-cache': {
            name: '用户数据备份',
            icon: '💾',
            dataType: 'user-cache',
            description: '用户缓存数据导出',
            tabId: null,
            containerSelector: null,
            exportButtonSelector: '[onclick*="userCacheExporter"]',
            detectCondition: () => window.userCacheManager?.isInitialized(),
            extractData: () => {
                if (!window.userCacheManager?.isInitialized()) return null;
                const result = window.userCacheManager.collectAllData();
                return result.data;
            },
            integrationHooks: {
                interceptExport: false,
                customEvent: 'user-cache-export'
            }
        },
        
        'chat-export': {
            name: '功能一：即时对话',
            icon: '💬',
            dataType: 'chat-history',
            description: '对话记录导出',
            tabId: 'instant-chat',
            containerSelector: '#chat_window',
            exportButtonSelector: '.export-chat-btn, [onclick*="exportChatHistory"]',
            detectCondition: () => {
                const convo = window.appState?.chat?.conversations?.find(
                    c => c.id === window.appState?.chat?.currentConversationId
                );
                return convo && convo.messages.length > 1;
            },
            extractData: () => {
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
            },
            integrationHooks: {
                interceptExport: true,
                exportFunction: 'exportChatHistory',
                customEvent: 'chat-export'
            }
        }
    },
    
    importTargets: {
        'patent-batch': {
            name: '功能六：批量专利解读',
            icon: '📋',
            acceptedTypes: ['patent-table', 'patent-numbers', 'table-data'],
            description: '导入专利号进行批量查询',
            tabId: 'patent-batch',
            inputSelector: '#patent_numbers_input',
            fileSelector: '#patent_file_input',
            action: 'import',
            priority: 1,
            autoNavigate: true,
            onReceive: {
                text: (content) => {
                    const input = document.querySelector('#patent_numbers_input');
                    if (input) {
                        input.value = content;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                },
                file: (file) => {
                    const fileInput = document.querySelector('#patent_file_input');
                    if (fileInput) {
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(file);
                        fileInput.files = dataTransfer.files;
                        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
            }
        },
        
        'async-batch': {
            name: '功能二：异步批处理',
            icon: '⚡',
            acceptedTypes: ['analysis-table', 'patent-table', 'claims-table', 'table-data', 'json-data'],
            description: '导入Excel进行批处理',
            tabId: 'async-batch',
            inputSelector: '#async_manual_input',
            fileSelector: '#async_excel_file',
            action: 'import',
            priority: 2,
            autoNavigate: true,
            onReceive: {
                text: (content) => {
                    const input = document.querySelector('#async_manual_input');
                    if (input) {
                        input.value = content;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                },
                file: (file) => {
                    const fileInput = document.querySelector('#async_excel_file');
                    if (fileInput) {
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(file);
                        fileInput.files = dataTransfer.files;
                        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
            }
        },
        
        'large-batch': {
            name: '功能三：大批量处理',
            icon: '📊',
            acceptedTypes: ['analysis-table', 'patent-table', 'json-data', 'table-data'],
            description: '上传Excel进行大批量处理',
            tabId: 'large-batch',
            inputSelector: null,
            fileSelector: '#gen_file-input',
            action: 'import',
            priority: 3,
            autoNavigate: true,
            onReceive: {
                file: (file) => {
                    const fileInput = document.querySelector('#gen_file-input');
                    if (fileInput) {
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(file);
                        fileInput.files = dataTransfer.files;
                        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
            }
        },
        
        'claims-processor': {
            name: '功能七：权利要求分析',
            icon: '📄',
            acceptedTypes: ['claims-table', 'claims-text', 'patent-table'],
            description: '导入权利要求进行分析',
            tabId: 'claims-processor',
            inputSelector: '#claims_text_input',
            fileSelector: '#claims_excel_file',
            action: 'import',
            priority: 4,
            autoNavigate: true,
            onReceive: {
                text: (content) => {
                    const input = document.querySelector('#claims_text_input');
                    if (input) {
                        input.value = content;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                },
                file: (file) => {
                    const fileInput = document.querySelector('#claims_excel_file');
                    if (fileInput) {
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(file);
                        fileInput.files = dataTransfer.files;
                        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
            }
        },
        
        'local-patent-lib': {
            name: '功能四：本地专利库',
            icon: '📚',
            acceptedTypes: ['patent-table', 'table-data'],
            description: '导入Excel合并到专利库',
            tabId: 'local-patent-lib',
            inputSelector: null,
            fileSelector: '#lpl_new_file_input',
            action: 'merge',
            priority: 5,
            autoNavigate: true,
            onReceive: {
                file: (file) => {
                    const fileInput = document.querySelector('#lpl_new_file_input');
                    if (fileInput) {
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(file);
                        fileInput.files = dataTransfer.files;
                        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
            }
        },
        
        'instant-chat': {
            name: '功能一：即时对话',
            icon: '💬',
            acceptedTypes: ['ai-analysis', 'plain-text', 'claims-text', 'chat-history', 'json-data'],
            description: '粘贴内容进行讨论',
            tabId: 'instant-chat',
            inputSelector: '#chat_input',
            fileSelector: null,
            action: 'paste',
            priority: 0,
            autoNavigate: true,
            onReceive: {
                text: (content) => {
                    const input = document.querySelector('#chat_input');
                    if (input) {
                        const start = input.selectionStart || 0;
                        input.value = input.value.slice(0, start) + content + input.value.slice(input.selectionEnd || start);
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.focus();
                    }
                }
            }
        }
    },
    
    transferRules: {
        autoCleanAfterDays: 7,
        maxHistoryItems: 20,
        maxDataSizeMB: 50,
        enableAutoCapture: true,
        enableNotifications: true,
        enableKeyboardShortcuts: true,
        shortcuts: {
            togglePanel: 'Ctrl+Shift+P',
            quickSend: 'Ctrl+Shift+S',
            showHistory: 'Ctrl+Shift+H'
        }
    },
    
    compatibilityMatrix: {
        'patent-table': {
            'patent-batch': { action: 'import', priority: 'high', description: '直接导入查询' },
            'async-batch': { action: 'import', priority: 'high', description: '批处理分析' },
            'large-batch': { action: 'import', priority: 'medium', description: '大批量处理' },
            'local-patent-lib': { action: 'merge', priority: 'high', description: '合并到专利库' },
            'claims-processor': { action: 'import', priority: 'medium', description: '权利要求分析' }
        },
        'patent-numbers': {
            'patent-batch': { action: 'paste', priority: 'high', description: '批量查询' },
            'async-batch': { action: 'paste', priority: 'medium', description: '手动输入处理' },
            'instant-chat': { action: 'paste', priority: 'low', description: '讨论专利' }
        },
        'claims-table': {
            'claims-processor': { action: 'import', priority: 'high', description: '继续分析' },
            'async-batch': { action: 'import', priority: 'medium', description: '批处理' },
            'instant-chat': { action: 'paste', priority: 'low', description: '讨论权利要求' }
        },
        'claims-text': {
            'claims-processor': { action: 'paste', priority: 'high', description: '分析权利要求' },
            'instant-chat': { action: 'paste', priority: 'medium', description: '讨论权利要求' }
        },
        'analysis-table': {
            'async-batch': { action: 'import', priority: 'high', description: '继续处理' },
            'large-batch': { action: 'import', priority: 'medium', description: '大批量处理' },
            'instant-chat': { action: 'paste', priority: 'low', description: '讨论结果' }
        },
        'chat-history': {
            'instant-chat': { action: 'paste', priority: 'medium', description: '继续讨论' }
        },
        'json-data': {
            'async-batch': { action: 'import', priority: 'high', description: 'JSON数据处理' },
            'large-batch': { action: 'import', priority: 'medium', description: '大批量处理' },
            'instant-chat': { action: 'paste', priority: 'low', description: '讨论数据' }
        },
        'plain-text': {
            'instant-chat': { action: 'paste', priority: 'high', description: '讨论内容' },
            'claims-processor': { action: 'paste', priority: 'medium', description: '分析文本' }
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PipelineConfig };
}

console.log('[PipelineConfig] Configuration loaded');
