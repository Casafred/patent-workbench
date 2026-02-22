/**
 * 统一批量处理系统 - 配置模块
 * 包含所有配置常量
 */

export const UnifiedBatchConfig = {
    MODE_THRESHOLD: 50,
    MODE: {
        ASYNC: 'async',
        BATCH: 'batch',
        AUTO: 'auto'
    },
    ASYNC: {
        POLL_INTERVAL: 5000,
        CONCURRENCY: 5,
        MAX_RETRIES: 3,
        RETRY_DELAY_BASE: 2000
    },
    BATCH: {
        POLL_INTERVAL: 60000,
        AUTO_DOWNLOAD_DELAY: 2000
    },
    INPUT: {
        MAX_COLUMNS: 10,
        MAX_MANUAL_LINES: 100
    },
    OUTPUT: {
        MAX_CELL_LENGTH: 32767
    },
    STORAGE_KEYS: {
        CUSTOM_TEMPLATES: 'unified_batch_custom_templates',
        LAST_STATE: 'unified_batch_last_state'
    }
};

export const PRESET_TEMPLATES = [
    {
        id: 'preset_translation',
        name: '技术文本翻译',
        systemPrompt: '你是一个专业精通各技术领域术语的、精通多国语言的翻译引擎。你的任务是自动检测用户输入文本的语言并将其翻译成中文。请直接返回翻译后的文本，不要添加任何额外的解释或说明。',
        userPromptTemplate: '请翻译以下文本：\n\n{{INPUT}}',
        model: 'GLM-4.7-Flash',
        temperature: 0.1,
        outputFields: []
    },
    {
        id: 'preset_tech_analysis',
        name: '技术方案解读',
        systemPrompt: '你是一位资深的专利技术分析师。你的任务是基于专利内容，梳理总结其要解决的技术问题，采用的核心方案内容、以及实现的技术效果和最重要的核心关键词短语。',
        userPromptTemplate: '请分析此专利并按以下要求输出：\n\n{{INPUT}}',
        model: 'GLM-4.7-Flash',
        temperature: 0.3,
        outputFields: [
            { name: '技术方案', description: '总结专利的主要方案内容' },
            { name: '技术问题', description: '该专利主要解决的技术问题' },
            { name: '技术效果', description: '该专利带来的技术效果' },
            { name: '技术关键词', description: '按照重要程度输出15个关键词或短语' }
        ]
    },
    {
        id: 'preset_search_expand',
        name: '检索词拓展',
        systemPrompt: '你是一个专业的专利检索分析师。你的任务是根据用户提供的关键词，生成相关的拓展检索词。请确保生成的检索词与原关键词相关且具有多样性，能够覆盖不同的表达方式和相关领域。',
        userPromptTemplate: '请为以下关键词生成10个相关的拓展检索词：\n\n{{INPUT}}',
        model: 'GLM-4.7-Flash',
        temperature: 0.7,
        outputFields: []
    },
    {
        id: 'preset_summary',
        name: '技术文本总结',
        systemPrompt: '你是一位资深的技术分析师。你的任务是基于提供的技术文本，总结其核心内容、技术要点和关键数据。请保持总结简洁明了，不超过200字。',
        userPromptTemplate: '请总结以下技术文本的核心内容（不超过200字）：\n\n{{INPUT}}',
        model: 'GLM-4.7-Flash',
        temperature: 0.3,
        outputFields: []
    }
];

export default UnifiedBatchConfig;
