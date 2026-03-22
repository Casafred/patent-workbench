/**
 * Excel功能索引模块
 * 记录系统中所有Excel导出和导入功能的详细信息
 */

const ExcelFunctionIndex = {
    version: '1.0.0',
    lastUpdated: '2026-03-22',
    
    exportFunctions: {
        'patent-batch-export': {
            id: 'export-001',
            name: '专利批量查询结果导出',
            module: '功能六：批量专利解读',
            moduleKey: 'patent-batch',
            description: '将批量查询的专利数据导出为Excel文件',
            triggerPoints: [
                {
                    type: 'button',
                    selector: '[onclick*="exportPatentResultsToExcel"], [onclick*="showExportFieldSelector"]',
                    label: '导出Excel按钮'
                },
                {
                    type: 'function',
                    name: 'executeExport',
                    file: 'js/main/patent-export.js'
                }
            ],
            outputFormat: 'xlsx',
            outputFields: [
                { key: 'patent_number', label: '专利号', required: true },
                { key: 'title', label: '标题' },
                { key: 'abstract', label: '摘要' },
                { key: 'inventors', label: '发明人' },
                { key: 'assignees', label: '申请人' },
                { key: 'application_date', label: '申请日期' },
                { key: 'publication_date', label: '公开日期' },
                { key: 'pdf_link', label: 'PDF链接' },
                { key: 'url', label: '来源链接' }
            ],
            dataType: 'patent-table',
            compatibleTargets: ['patent-batch', 'async-batch', 'large-batch', 'local-patent-lib', 'claims-processor'],
            estimatedRows: '10-1000+',
            notes: '支持字段选择和拖拽排序'
        },
        
        'async-batch-export': {
            id: 'export-002',
            name: '异步批处理结果导出',
            module: '功能二：异步批处理',
            moduleKey: 'async-batch',
            description: '将批处理结果导出为Excel文件',
            triggerPoints: [
                {
                    type: 'button',
                    selector: '[onclick*="exportToExcel"]',
                    label: '导出结果按钮'
                },
                {
                    type: 'function',
                    name: 'OutputHandler.exportToExcel',
                    file: 'js/modules/unified-batch/output-handler.js'
                }
            ],
            outputFormat: 'xlsx',
            outputFields: [
                { key: 'index', label: '序号' },
                { key: 'template', label: '模板名称' },
                { key: 'status', label: '状态' },
                { key: 'tokens', label: '消耗Tokens' },
                { key: 'result', label: '结果' },
                { key: 'error', label: '错误信息' }
            ],
            dataType: 'analysis-table',
            compatibleTargets: ['async-batch', 'large-batch', 'instant-chat'],
            estimatedRows: '10-500',
            notes: '支持极速同步和小批量异步两种模式'
        },
        
        'large-batch-export': {
            id: 'export-003',
            name: '大批量处理结果导出',
            module: '功能三：大批量处理',
            moduleKey: 'large-batch',
            description: '将大批量处理结果导出为Excel文件',
            triggerPoints: [
                {
                    type: 'button',
                    selector: '[onclick*="exportFinalReport"]',
                    label: '导出最终报告按钮'
                },
                {
                    type: 'function',
                    name: 'OutputHandler.exportFinalReport',
                    file: 'js/modules/unified-batch/output-handler.js'
                }
            ],
            outputFormat: 'xlsx',
            outputFields: '动态（根据输入和AI输出）',
            dataType: 'analysis-table',
            compatibleTargets: ['async-batch', 'large-batch', 'instant-chat'],
            estimatedRows: '100-10000+',
            notes: '支持超大单元格自动拆分'
        },
        
        'claims-processor-export': {
            id: 'export-004',
            name: '权利要求分析结果导出',
            module: '功能七：权利要求分析器',
            moduleKey: 'claims-processor',
            description: '将权利要求分析结果导出为Excel文件',
            triggerPoints: [
                {
                    type: 'button',
                    selector: '[onclick*="exportClaims"]',
                    label: '导出分析结果按钮'
                }
            ],
            outputFormat: 'xlsx',
            outputFields: [
                { key: 'claim_number', label: '权利要求编号' },
                { key: 'claim_text', label: '权利要求内容' },
                { key: 'claim_type', label: '类型' },
                { key: 'dependencies', label: '引用关系' }
            ],
            dataType: 'claims-table',
            compatibleTargets: ['claims-processor', 'async-batch', 'instant-chat'],
            estimatedRows: '1-50',
            notes: '支持权利要求结构分析'
        },
        
        'chat-export-txt': {
            id: 'export-005',
            name: '对话记录导出(TXT)',
            module: '功能一：即时对话',
            moduleKey: 'instant-chat',
            description: '将对话记录导出为TXT文件',
            triggerPoints: [
                {
                    type: 'button',
                    selector: '[onclick*="exportChatHistory(\'txt\')"]',
                    label: '导出TXT按钮'
                },
                {
                    type: 'function',
                    name: 'exportChatHistory',
                    file: 'js/modules/chat/chat-export.js'
                }
            ],
            outputFormat: 'txt',
            dataType: 'chat-history',
            compatibleTargets: ['instant-chat'],
            notes: '支持选中部分导出'
        },
        
        'chat-export-pdf': {
            id: 'export-006',
            name: '对话记录导出(PDF)',
            module: '功能一：即时对话',
            moduleKey: 'instant-chat',
            description: '将对话记录导出为PDF文件',
            triggerPoints: [
                {
                    type: 'button',
                    selector: '[onclick*="exportChatHistory(\'pdf\')"]',
                    label: '导出PDF按钮'
                }
            ],
            outputFormat: 'pdf',
            dataType: 'chat-history',
            compatibleTargets: ['instant-chat'],
            notes: '使用html2canvas和jsPDF生成'
        },
        
        'user-cache-export': {
            id: 'export-007',
            name: '用户缓存数据导出',
            module: '用户数据管理',
            moduleKey: 'user-cache',
            description: '将用户缓存数据导出为JSON文件',
            triggerPoints: [
                {
                    type: 'button',
                    selector: '[onclick*="userCacheExporter"]',
                    label: '导出用户数据按钮'
                },
                {
                    type: 'function',
                    name: 'userCacheExporter.export',
                    file: 'js/core/user-cache-exporter.js'
                }
            ],
            outputFormat: 'json',
            dataType: 'user-cache',
            compatibleTargets: [],
            notes: '支持选择性导出不同类型数据'
        }
    },
    
    importFunctions: {
        'patent-batch-import': {
            id: 'import-001',
            name: '专利号导入',
            module: '功能六：批量专利解读',
            moduleKey: 'patent-batch',
            description: '导入专利号列表进行批量查询',
            inputPoints: [
                {
                    type: 'textarea',
                    selector: '#patent_numbers_input',
                    label: '专利号输入框',
                    acceptFormat: 'text'
                },
                {
                    type: 'file',
                    selector: '#patent_file_input',
                    label: 'Excel文件上传',
                    acceptFormat: 'xlsx,xls,csv'
                }
            ],
            acceptedDataTypes: ['patent-numbers', 'patent-table'],
            autoDetection: true,
            notes: '支持多种专利号格式自动识别'
        },
        
        'async-batch-import': {
            id: 'import-002',
            name: '批处理数据导入',
            module: '功能二：异步批处理',
            moduleKey: 'async-batch',
            description: '导入Excel数据进行批处理',
            inputPoints: [
                {
                    type: 'textarea',
                    selector: '#async_manual_input',
                    label: '手动输入框',
                    acceptFormat: 'text'
                },
                {
                    type: 'file',
                    selector: '#async_excel_file',
                    label: 'Excel文件上传',
                    acceptFormat: 'xlsx,xls,csv'
                }
            ],
            acceptedDataTypes: ['analysis-table', 'patent-table', 'claims-table', 'table-data'],
            autoDetection: true,
            notes: '支持智能列识别'
        },
        
        'large-batch-import': {
            id: 'import-003',
            name: '大批量数据导入',
            module: '功能三：大批量处理',
            moduleKey: 'large-batch',
            description: '上传Excel进行大批量处理',
            inputPoints: [
                {
                    type: 'file',
                    selector: '#gen_file-input',
                    label: 'Excel文件上传',
                    acceptFormat: 'xlsx,xls,csv,jsonl'
                }
            ],
            acceptedDataTypes: ['analysis-table', 'patent-table', 'json-data', 'table-data'],
            autoDetection: true,
            notes: '支持大数据量分片加载'
        },
        
        'claims-processor-import': {
            id: 'import-004',
            name: '权利要求导入',
            module: '功能七：权利要求分析器',
            moduleKey: 'claims-processor',
            description: '导入权利要求进行分析',
            inputPoints: [
                {
                    type: 'textarea',
                    selector: '#claims_text_input',
                    label: '权利要求文本输入',
                    acceptFormat: 'text'
                },
                {
                    type: 'file',
                    selector: '#claims_excel_file',
                    label: 'Excel文件上传',
                    acceptFormat: 'xlsx,xls,csv'
                }
            ],
            acceptedDataTypes: ['claims-text', 'claims-table', 'patent-table'],
            autoDetection: true,
            notes: '支持权利要求结构自动识别'
        },
        
        'local-patent-lib-import': {
            id: 'import-005',
            name: '专利库导入',
            module: '功能四：本地专利库',
            moduleKey: 'local-patent-lib',
            description: '导入Excel合并到专利库',
            inputPoints: [
                {
                    type: 'file',
                    selector: '#lpl_new_file_input',
                    label: '新库文件上传',
                    acceptFormat: 'xlsx,xls,csv'
                }
            ],
            acceptedDataTypes: ['patent-table', 'table-data'],
            autoDetection: true,
            notes: '支持与现有专利库合并'
        },
        
        'user-cache-import': {
            id: 'import-006',
            name: '用户缓存导入',
            module: '用户数据管理',
            moduleKey: 'user-cache',
            description: '导入用户缓存数据',
            inputPoints: [
                {
                    type: 'file',
                    selector: '[accept*=".json"]',
                    label: 'JSON文件上传',
                    acceptFormat: 'json'
                }
            ],
            acceptedDataTypes: ['user-cache'],
            autoDetection: false,
            notes: '支持数据校验和合并策略选择'
        }
    },
    
    dataFlowRecommendations: [
        {
            from: 'patent-batch-export',
            to: 'claims-processor-import',
            description: '专利查询结果 → 权利要求分析',
            priority: 'high',
            transform: '提取权利要求列'
        },
        {
            from: 'patent-batch-export',
            to: 'local-patent-lib-import',
            description: '专利查询结果 → 本地专利库',
            priority: 'high',
            transform: '直接导入'
        },
        {
            from: 'async-batch-export',
            to: 'large-batch-import',
            description: '小批量结果 → 大批量继续处理',
            priority: 'medium',
            transform: '格式转换'
        },
        {
            from: 'claims-processor-export',
            to: 'async-batch-import',
            description: '权利要求分析 → 批处理',
            priority: 'medium',
            transform: '直接导入'
        },
        {
            from: 'chat-export-txt',
            to: 'async-batch-import',
            description: '对话记录 → 批处理模板',
            priority: 'low',
            transform: '文本处理'
        }
    ],
    
    getExportFunction: function(id) {
        return this.exportFunctions[id] || null;
    },
    
    getImportFunction: function(id) {
        return this.importFunctions[id] || null;
    },
    
    getCompatibleTargets: function(exportId) {
        const exportFunc = this.exportFunctions[exportId];
        if (!exportFunc) return [];
        
        return Object.entries(this.importFunctions)
            .filter(([_, importFunc]) => 
                importFunc.acceptedDataTypes.some(type => 
                    exportFunc.compatibleTargets.includes(importFunc.moduleKey) &&
                    (exportFunc.dataType === type || exportFunc.compatibleTargets.includes(type))
                )
            )
            .map(([id, func]) => ({
                id,
                ...func
            }));
    },
    
    getExportFunctionsByModule: function(moduleKey) {
        return Object.entries(this.exportFunctions)
            .filter(([_, func]) => func.moduleKey === moduleKey)
            .map(([id, func]) => ({ id, ...func }));
    },
    
    getImportFunctionsByModule: function(moduleKey) {
        return Object.entries(this.importFunctions)
            .filter(([_, func]) => func.moduleKey === moduleKey)
            .map(([id, func]) => ({ id, ...func }));
    },
    
    detectCurrentPageExports: function() {
        const activeTab = document.querySelector('.tab-content.active');
        if (!activeTab) return [];
        
        const tabId = activeTab.id?.replace('-tab', '');
        return this.getExportFunctionsByModule(tabId);
    },
    
    detectCurrentPageImports: function() {
        const activeTab = document.querySelector('.tab-content.active');
        if (!activeTab) return [];
        
        const tabId = activeTab.id?.replace('-tab', '');
        return this.getImportFunctionsByModule(tabId);
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ExcelFunctionIndex };
}

window.ExcelFunctionIndex = ExcelFunctionIndex;

console.log('[ExcelFunctionIndex] Index loaded');
