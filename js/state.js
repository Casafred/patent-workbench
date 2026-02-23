// =================================================================================
// v12.2 - 全局应用状态与配置
// =================================================================================
const appState = {
    apiKey: '',
    isGuestMode: false,
    guestModel: 'glm-4-flash',
    chat: {
        personas: {},
        conversations: [], // { id, title, personaId, messages, lastUpdate }
        currentConversationId: null,
        isManagementMode: false,
        // ▼▼▼ 新增：存储当前对话附加的文件信息 ▼▼▼
        activeFile: null, // { taskId, filename, content, toolType }
        // ▼▼▼ 新增：文件缓存 - 避免重复解析 ▼▼▼
        parsedFilesCache: {}, // { filename: { taskId, filename, content, toolType, timestamp } }
        // ▼▼▼ 新增：文件解析状态 ▼▼▼
        pendingFile: null, // 待上传的文件对象
        pendingFileEvent: null, // 文件选择事件
        fileProcessing: false, // 文件是否正在处理中
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
            { name: "技术方案解读", isPreset: true, system: "你是一位资深的专利技术分析师。你的任务是基于专利内容，梳理总结其要解决的技术问题，采用的核心方案内容、以及实现的技术效果和最重要的核心关键词短语。", user: { rules: "请分析此专利并按以下JSON格式输出：", outputFields: [ { name: "技术方案", desc: "此处填写技术方案，总结专利的主要方案内容" }, { name: "技术问题", desc: "此处填写该专利可能主要解决的技术问题" }, { name: "技术效果", desc: "此处填写该专利可能带来的技术效果" }, { name: "技术关键词", desc: "此处按照专利文本中构成核心方案的重要程度输出15个关键词或短语" }] }},
            { name: "技术文本翻译", isPreset: true, system: "你是一个专业精通各技术领域术语的、精通多国语言的翻译引擎。你的任务是自动检测用户输入文本的语言并将其翻译成中文。请直接返回翻译后的文本，不要添加任何额外的解释或说明。", user: { rules: "请翻译以下文本：", outputFields: [] }},
            { name: "检索词拓展", isPreset: true, system: "你是一个专业的专利检索分析师。你的任务是根据用户提供的关键词，生成相关的拓展检索词。请确保生成的检索词与原关键词相关且具有多样性，能够覆盖不同的表达方式和相关领域。", user: { rules: "请为以下关键词生成10个相关的拓展检索词：", outputFields: [] }},
            { name: "技术文本总结", isPreset: true, system: "你是一位资深的技术分析师。你的任务是基于提供的技术文本，总结其核心内容、技术要点和关键数据。请保持总结简洁明了，不超过200字。", user: { rules: "请总结以下技术文本的核心内容（不超过200字）：", outputFields: [] }}
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
    
    // ▼▼▼ 同族权利要求对比功能的状态 (v1.0) ▼▼▼
    familyClaimsComparison: {
        basePatent: null, // 基础专利信息
        familyPatents: [], // 同族专利列表
        selectedPatents: [], // 用户选择的专利
        analysisResult: null, // 对比分析结果
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
        patentChats: {}, // 专利对话状态 { patentNumber: { patentNumber, patentData, messages, isOpen } }
        autoAnalyze: true, // 自动批量解读开关（默认开启）
        isCrawling: false, // 是否正在爬取中
        isAnalyzing: false, // 是否正在解读中
        crawlProgress: { current: 0, total: 0 }, // 爬取进度
        analyzeProgress: { current: 0, total: 0 } // 解读进度
    },
    // ▲▲▲ 新增结束 ▲▲▲
    
    // ▼▼▼ 新增：PDF-OCR阅读器状态 (v9.0) ▼▼▼
    pdfOCRReader: {
        currentFile: null, // 当前加载的文件
        currentFileType: null, // 'pdf' 或 'image'
        currentPage: 1, // 当前页码
        totalPages: 0, // 总页数
        zoomLevel: 1.0, // 缩放级别
        ocrResult: null, // OCR解析结果
        ocrSettings: {
            mode: 'auto', // 'auto' 或 'page'
            recognizeFormula: true, // 识别公式
            recognizeTable: true // 识别表格
        },
        selectedBlock: null, // 当前选中的区块
        isBlockMode: false, // 是否显示区块覆盖层
        filterType: 'all', // 区块筛选类型
        chatHistory: [], // AI问答历史
        translateHistory: [] // 翻译历史
    }
    // ▲▲▲ 新增结束 ▲▲▲
};

// 将 appState 挂载到 window 对象，供其他模块访问
window.appState = appState;

const BACKEND_URL = 'https://patent-workbench-backend.onrender.com';

// ▼▼▼ 统一模型配置 - 从配置文件加载 ▼▼▼
let AVAILABLE_MODELS = ["glm-4-flashX-250414", "glm-4-flash", "glm-4-long", "GLM-4.7-Flash"];
let BATCH_MODELS = ["glm-4-flashX-250414", "glm-4-flash", "glm-4-long", "GLM-4.7-Flash"];
let ASYNC_MODELS = ["glm-4-flashX-250414", "glm-4-flash", "glm-4-long", "GLM-4.7-Flash"];

// 将模型列表挂载到 window 对象，供其他模块访问
window.AVAILABLE_MODELS = AVAILABLE_MODELS;
window.BATCH_MODELS = BATCH_MODELS;
window.ASYNC_MODELS = ASYNC_MODELS;

// 从配置文件加载模型列表
async function loadModelsConfig() {
    try {
        // 尝试多个可能的路径（适配不同页面位置）
        const possiblePaths = [
            '../config/models.json',  // 从 frontend/ 子目录访问
            'config/models.json',      // 从根目录访问
            './config/models.json'     // 相对根目录访问
        ];
        
        let config = null;
        let lastError = null;
        
        for (const path of possiblePaths) {
            try {
                const response = await fetch(path);
                if (response.ok) {
                    config = await response.json();
                    console.log(`✅ 模型配置已从 ${path} 加载`);
                    break;
                }
            } catch (e) {
                lastError = e;
                continue;
            }
        }
        
        if (config && config.models && Array.isArray(config.models)) {
            AVAILABLE_MODELS = config.models;
            BATCH_MODELS = config.models;
            ASYNC_MODELS = config.models;
            // 同步更新 window 对象上的模型列表
            window.AVAILABLE_MODELS = config.models;
            window.BATCH_MODELS = config.models;
            window.ASYNC_MODELS = config.models;
            console.log('✅ 可用模型列表:', config.models);
            
            // 延迟更新所有模型选择器，确保DOM已准备好
            setTimeout(() => {
                updateAllModelSelectors();
                // 触发自定义事件，通知模型配置已加载
                window.dispatchEvent(new CustomEvent('modelsConfigLoaded', { 
                    detail: { models: AVAILABLE_MODELS } 
                }));
            }, 100);
        } else {
            throw new Error('无法从任何路径加载模型配置');
        }
    } catch (error) {
        console.warn('⚠️ 无法加载模型配置文件，使用默认配置:', error);
        // 即使加载失败，也要更新选择器
        setTimeout(() => {
            updateAllModelSelectors();
        }, 100);
    }
}

// 更新所有功能的模型选择器
function updateAllModelSelectors(retryCount = 0) {
    const isGuest = window.IS_GUEST_MODE || appState.isGuestMode;
    const guestModel = window.GUEST_MODEL || appState.guestModel || 'glm-4-flash';
    
    let modelsToShow = AVAILABLE_MODELS;
    if (isGuest) {
        modelsToShow = [guestModel];
    }
    
    const modelOptions = modelsToShow.map(m => `<option value="${m}">${m}</option>`).join('');
    let allFound = true;
    
    // 功能一：即时对话
    const chatModelSelect = document.getElementById('chat_model_select');
    if (chatModelSelect) {
        const currentValue = chatModelSelect.value;
        chatModelSelect.innerHTML = modelOptions;
        if (isGuest) {
            chatModelSelect.value = guestModel;
            chatModelSelect.disabled = true;
            chatModelSelect.style.cursor = 'not-allowed';
        } else if (AVAILABLE_MODELS.includes(currentValue)) {
            chatModelSelect.value = currentValue;
        }
        console.log('✅ 功能一模型选择器已更新');
    } else {
        console.warn('⚠️ chat_model_select 未找到');
        allFound = false;
    }
    
    // 功能二：小批量异步
    const asyncTemplateModelSelect = document.getElementById('async_template_model_select');
    if (asyncTemplateModelSelect) {
        const currentValue = asyncTemplateModelSelect.value;
        asyncTemplateModelSelect.innerHTML = modelOptions;
        if (isGuest) {
            asyncTemplateModelSelect.value = guestModel;
            asyncTemplateModelSelect.disabled = true;
            asyncTemplateModelSelect.style.cursor = 'not-allowed';
        } else if (AVAILABLE_MODELS.includes(currentValue)) {
            asyncTemplateModelSelect.value = currentValue;
        }
        console.log('✅ 功能二模型选择器已更新');
    } else {
        console.warn('⚠️ async_template_model_select 未找到');
        allFound = false;
    }
    
    // 功能三：大批量处理
    const apiModelSelect = document.getElementById('api-model');
    if (apiModelSelect) {
        const currentValue = apiModelSelect.value;
        apiModelSelect.innerHTML = modelOptions;
        if (isGuest) {
            apiModelSelect.value = guestModel;
            apiModelSelect.disabled = true;
            apiModelSelect.style.cursor = 'not-allowed';
        } else if (AVAILABLE_MODELS.includes(currentValue)) {
            apiModelSelect.value = currentValue;
        }
        console.log('✅ 功能三模型选择器已更新');
    } else {
        console.warn('⚠️ api-model 未找到');
        allFound = false;
    }
    
    // 功能二/三：统一批量处理（合并后）
    const unifiedTemplateModelSelect = document.getElementById('unified_template_model_select');
    if (unifiedTemplateModelSelect) {
        const currentValue = unifiedTemplateModelSelect.value;
        unifiedTemplateModelSelect.innerHTML = modelOptions;
        if (isGuest) {
            unifiedTemplateModelSelect.value = guestModel;
            unifiedTemplateModelSelect.disabled = true;
            unifiedTemplateModelSelect.style.cursor = 'not-allowed';
        } else if (AVAILABLE_MODELS.includes(currentValue)) {
            unifiedTemplateModelSelect.value = currentValue;
        }
        console.log('✅ 统一批量处理模型选择器已更新');
    } else {
        console.warn('⚠️ unified_template_model_select 未找到');
        allFound = false;
    }
    
    // 功能五：权利要求对比
    const comparisonModelSelect = document.getElementById('comparison_model_select');
    if (comparisonModelSelect) {
        const currentValue = comparisonModelSelect.value;
        comparisonModelSelect.innerHTML = modelOptions;
        if (isGuest) {
            comparisonModelSelect.value = guestModel;
            comparisonModelSelect.disabled = true;
            comparisonModelSelect.style.cursor = 'not-allowed';
        } else if (AVAILABLE_MODELS.includes(currentValue)) {
            comparisonModelSelect.value = currentValue;
        }
        console.log('✅ 功能五模型选择器已更新');
    } else {
        console.warn('⚠️ comparison_model_select 未找到');
        allFound = false;
    }
    
    // 功能六：批量专利解读
    const patentBatchModelSelector = document.getElementById('patent_batch_model_selector');
    if (patentBatchModelSelector) {
        const currentValue = patentBatchModelSelector.value;
        patentBatchModelSelector.innerHTML = modelOptions;
        if (isGuest) {
            patentBatchModelSelector.value = guestModel;
            patentBatchModelSelector.disabled = true;
            patentBatchModelSelector.style.cursor = 'not-allowed';
        } else if (AVAILABLE_MODELS.includes(currentValue)) {
            patentBatchModelSelector.value = currentValue;
        }
        console.log('✅ 功能六模型选择器已更新');
    } else {
        console.warn('⚠️ patent_batch_model_selector 未找到');
        allFound = false;
    }
    
    if (allFound) {
        console.log('✅ 所有模型选择器已更新');
    } else if (retryCount < 3) {
        // 如果有选择器未找到，且重试次数未超过3次，则延迟重试
        console.log(`⏳ 部分选择器未找到，${500}ms后重试 (${retryCount + 1}/3)`);
        setTimeout(() => updateAllModelSelectors(retryCount + 1), 500);
    } else {
        console.warn('⚠️ 部分模型选择器未找到，已达到最大重试次数');
    }
}

// 在页面加载时自动加载模型配置
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadModelsConfig);
} else {
    loadModelsConfig();
}

// 加载游客模式限制模块
function loadGuestRestrictions() {
    if (window.IS_GUEST_MODE) {
        const script = document.createElement('script');
        script.src = '/js/core/guest-mode-restrictions.js';
        script.onload = () => {
            console.log('[State] 游客模式限制模块已加载');
        };
        document.head.appendChild(script);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadGuestRestrictions);
} else {
    loadGuestRestrictions();
}
// ▲▲▲ 统一模型配置结束 ▲▲▲

// ▼▼▼ 用户缓存管理器初始化 ▼▼▼
function initUserCacheManager() {
    // 检查是否有后端注入的用户名
    if (window.CURRENT_USERNAME && window.userCacheManager) {
        window.userCacheManager.init(window.CURRENT_USERNAME);
        console.log('[State] 用户缓存管理器已初始化:', window.CURRENT_USERNAME);
        
        // 初始化UI
        if (window.userDataUI) {
            window.userDataUI.init();
        }
    } else {
        // 延迟重试
        setTimeout(initUserCacheManager, 100);
    }
}

// 在DOM加载后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUserCacheManager);
} else {
    initUserCacheManager();
}
// ▲▲▲ 用户缓存管理器初始化结束 ▲▲▲

const MAX_ASYNC_RETRIES = 3;