// =================================================================================
// v12.2 - 全局应用状态与配置
// =================================================================================
const appState = {
    apiKey: '',
    chat: {
        personas: {},
        conversations: [], // { id, title, personaId, messages, lastUpdate }
        currentConversationId: null,
        isManagementMode: false,
        // ▼▼▼ 新增：存储当前对话附加的文件信息 ▼▼▼
        activeFile: null, // { fileId, filename, content }
        // ▼▼▼ 新增：联网搜索配置 ▼▼▼
        searchMode: {
            enabled: false,
            searchEngine: 'search_pro',
            count: 5,
            contentSize: 'medium'
        }
        // ▲▲▲ 新增结束 ▲▲▲
    },
    asyncBatch: {
        inputs: [], // { id, content }
        templates: [], // { id, name, systemPrompt, userPromptTemplate, model, temperature }
        presetTemplates: [
            {
                name: "技术文本翻译",
                systemPrompt: "你是一个专业精通各技术领域术语的、精通多国语言的翻译引擎。你的任务是自动检测用户输入文本的语言并将其翻译成中文。请直接返回翻译后的文本，不要添加任何额外的解释或说明。",
                userPromptTemplate: "请翻译以下文本：\n\n{{INPUT}}",
                model: "GLM-4.7-Flash",
                temperature: 0.1
            },
            {
                name: "检索词拓展",
                systemPrompt: "你是一个专业的专利检索分析师。你的任务是根据用户提供的关键词，生成相关的拓展检索词。请确保生成的检索词与原关键词相关且具有多样性，能够覆盖不同的表达方式和相关领域。",
                userPromptTemplate: "请为以下关键词生成10个相关的拓展检索词：\n\n{{INPUT}}",
                model: "GLM-4.7-Flash",
                temperature: 0.7
            },
            {
                name: "技术文本总结",
                systemPrompt: "你是一位资深的技术分析师。你的任务是基于提供的技术文本，总结其核心内容、技术要点和关键数据。请保持总结简洁明了，不超过200字。",
                userPromptTemplate: "请总结以下技术文本的核心内容（不超过200字）：\n\n{{INPUT}}",
                model: "GLM-4.7-Flash",
                temperature: 0.3
            }
        ],
        requests: [], // { localId, inputId, templateId }
        tasks: {}, // { zhipuTaskId, status, result, usage, retryCount... } for a localRequestId
        pollingInterval: null,
        nextInputId: 1,
        nextTemplateId: 1,
        nextRequestId: 1,
        excelWorkbook: null, 
    },
    batch: {
        jsonlContent: "",
        fileId: null,
        batchId: null,
        outputFileId: null,
        resultContent: null,
        autoCheckTimer: null,
    },
    generator: {
        workbook: null,
        currentSheetData: null,
        columnHeaders: [],
        customTemplates: [],
        presetTemplates: [
            { name: "专利文本翻译", isPreset: true, system: "你是一个专业精通各技术领域术语的、精通多国语言的专利文本翻译引擎。你的任务是自动检测用户输入专利文本的语言并将其翻译成中文。请直接返回翻译后的文本，不要添加任何额外的解释或说明。你必须严格遵循输出格式要求。", user: { rules: "请基于以下文本，直接输出翻译后的内容。\n要求：\n1. 结果必须是直接的翻译后中文文本，必须忠实于原文不得臆测，并选择贴合技术领域的专业术语表达", outputFields: [] }},
            { name: "技术方案解读", isPreset: true, system: "你是一位资深的专利技术分析师。你的任务是基于专利内容，梳理总结其要解决的技术问题，采用的核心方案内容、以及实现的技术效果和最重要的核心关键词短语。", user: { rules: "请分析此专利并按以下JSON格式输出：", outputFields: [ { name: "技术方案", desc: "此处填写技术方案，总结专利的主要方案内容" }, { name: "技术问题", desc: "此处填写该专利可能主要解决的技术问题" }, { name: "技术效果", desc: "此处填写该专利可能带来的技术效果" }, { name: "技术关键词", desc: "此处按照专利文本中构成核心方案的重要程度输出15个关键词或短语" }] }}
        ]
    },
    reporter: {
        workbook: null,
        sheetData: null,
        jsonlData: null,
        finalOutputData: [],
        outputHeaders: [],
    },
    // ▼▼▼ 在这里添加新功能的状态对象 ▼▼▼
    // ▼▼▼ 权利要求对比功能的状态 (v3.0) ▼▼▼
    claimsComparison: {
        model: 'GLM-4.7-Flash', // 可选模型
        comparisonCount: 2, // 2-4个权利要求
        claims: [
            { id: 1, label: '版本A', fullText: '', numbers: '', original: '', translated: '', lang: '' },
            { id: 2, label: '版本B', fullText: '', numbers: '', original: '', translated: '', lang: '' }
        ],
        analysisResult: null, // 存储对比矩阵结果
        viewMode: 'card', // card, sideBySide, matrix
        displayLang: 'translated', // 'original' 或 'translated'
        isLoading: false,
        error: null
    },
    // ▲▲▲ 新增结束 ▲▲▲
    
    lpl: { // Local Patent Library
        originalFile: {
            name: null,
            workbook: null,
            sheets: [], // 新增
            selectedSheet: null, // 新增
            ignoreHeader: false, // 新增
            jsonData: null,
            headers: []
        },
        
        newFile: {
            name: null,
            workbook: null,
            sheets: [], // 新增
            selectedSheet: null, // 新增
            ignoreHeader: false, // 新增
            jsonData: null,
            headers: []
        },
        expandedPatents: [],
        mergedData: null,
    },
    // ▲▲▲ 添加结束 ▲▲▲
    
    // ▼▼▼ 新增：批量专利解读状态 ▼▼▼
    patentBatch: {
        customTemplates: [], // 自定义模板列表
        currentTemplate: null, // 当前选中的模板
        isEditingTemplate: false, // 是否正在编辑模板
        patentResults: [], // 专利查询结果
        analysisResults: [], // 解读结果
        patentChats: {} // 专利对话状态 { patentNumber: { patentNumber, patentData, messages, isOpen } }
    },
    // ▲▲▲ 新增结束 ▲▲▲
    
    // --- 新增：文件管理状态 ---
    files: {
        purposeFilter: 'file-extract',
        items: [] // {id, filename, bytes, created_at, purpose}
    }
};

const BACKEND_URL = 'https://patent-workbench-backend.onrender.com';
const AVAILABLE_MODELS = ["glm-4-flash-250414", "glm-4-flashX-250414", "glm-4-flash", "glm-4-long", "GLM-4.7-Flash"];
const BATCH_MODELS = ["glm-4-flashX-250414" , "glm-4-flash","glm-4-long", "GLM-4.7-Flash"];
const ASYNC_MODELS = ["glm-4-flash", "glm-4-flashX-250414", "glm-4-flash-250414", "GLM-4.7-Flash"];
const MAX_ASYNC_RETRIES = 3;