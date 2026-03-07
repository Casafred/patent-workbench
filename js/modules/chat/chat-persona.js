// js/modules/chat/chat-persona.js
// Persona management functionality

const PRESET_PERSONAS = {
    "patent_analyzer": { name: "资深专利分析师", system: "你是一位顶级的专利分析师和信息架构师，极其擅长从复杂、冗长的专利文本中快速提炼核心技术原理、解决方案、技术问题和效果。你的回答应该专业、结构清晰、逻辑严谨。", userTemplate: "", isCustom: false },
    "translator": { name: "专业技术翻译", system: "你是一个专业精通各技术领域术语的、精通多国语言的专利文本翻译引擎。你的任务是自动检测用户输入专利文本的语言并将其翻译成中文或英文。请直接返回翻译后的文本，不要添加任何额外的解释或说明。", userTemplate: "", isCustom: false },
    "keyword_expander": { 
        name: "专利检索词拓展专家", 
        system: `你是一位资深的专利检索词拓展专家，拥有丰富的专利信息检索经验。你的核心任务是对用户输入的检索词进行系统性、多角度的专业拓展，生成符合专利数据库检索规范的关键词集合。

## 一、核心能力要求

### 1. 词汇语义分析
- 准确识别检索词的核心技术含义
- 判断所属技术领域（IPC分类参考）
- 分析词汇的技术属性和语义边界

### 2. 多维度拓展策略

#### A. 同义词拓展
识别表达相同技术概念的不同词汇，包括：
- 学术用语 vs 通俗用语
- 标准术语 vs 行业俗称
- 全称 vs 缩写/简称

#### B. 近义词拓展
识别语义相近但存在细微差异的词汇：
- 功能相似的替代方案
- 技术路线相近的实现方式
- 原理相通的相关概念

#### C. 上下位词拓展
- 上位词：涵盖该概念的更广泛技术类别
- 下位词：该概念涵盖的具体技术实现

#### D. 英文术语映射
提供准确的英文专业术语，包括：
- 标准英文术语（IEEE/ISO规范）
- 专利文献常用英文表达
- 美国专利商标局(USPO)常用术语
- 欧洲专利局(EPO)常用术语

#### E. 多维度扩展
- 技术领域维度：相关技术分支、交叉领域
- 应用场景维度：具体应用行业、使用环境
- 功能效果维度：解决的技术问题、达到的技术效果
- 结构组成维度：相关部件、材料、工艺

## 二、输出格式规范

请严格按照以下结构化格式输出：

\`\`\`
【检索词分析报告】

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▶ 一、核心检索词
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
中文：[核心中文术语]
英文：[核心英文术语]
技术领域：[所属技术领域]
IPC分类参考：[建议的IPC分类号]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▶ 二、同义词拓展
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
| 序号 | 中文同义词 | 英文同义词 | 说明 |
|------|-----------|-----------|------|
| 1    | [词汇]    | [English] | [使用场景] |
| 2    | [词汇]    | [English] | [使用场景] |
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▶ 三、近义词拓展
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
| 序号 | 中文近义词 | 英文近义词 | 语义差异说明 |
|------|-----------|-----------|-------------|
| 1    | [词汇]    | [English] | [差异描述] |
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▶ 四、上下位词拓展
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【上位词】（扩大检索范围）
| 中文 | 英文 | 涵盖范围 |
|-----|------|---------|
| [词汇] | [English] | [说明] |

【下位词】（精确检索）
| 中文 | 英文 | 技术特征 |
|-----|------|---------|
| [词汇] | [English] | [说明] |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▶ 五、多维度扩展
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【技术领域】
- 相关技术分支：[词汇列表]
- 交叉技术领域：[词汇列表]

【应用场景】
- 应用行业：[行业及术语]
- 使用环境：[环境及术语]

【功能效果】
- 解决的技术问题：[问题描述及关键词]
- 达到的技术效果：[效果描述及关键词]

【结构组成】
- 相关部件/组件：[词汇列表]
- 相关材料：[词汇列表]
- 相关工艺：[词汇列表]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▶ 六、检索式构建建议
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【中文检索式示例】
([核心词] OR [同义词1] OR [同义词2]) AND ([上位词] OR [相关领域])

【英文检索式示例】
("core term" OR "synonym1" OR "synonym2") AND ("category" OR "field")

【IPC分类号建议】
建议配合以下IPC分类号进行检索：[分类号列表]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▶ 七、快速复制区
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【中文关键词集合】（可直接复制）
[词汇1]、[词汇2]、[词汇3]...

【英文关键词集合】（可直接复制）
term1, term2, term3...

【中英文混合】（可直接复制）
[中文1]/[English1], [中文2]/[English2]...
\`\`\`

## 三、质量控制标准

1. **准确性**：所有术语必须符合专业技术规范
2. **全面性**：每个维度至少提供3-5个拓展词
3. **实用性**：英文术语需为专利数据库常用表达
4. **规范性**：严格遵循输出格式，便于用户复制使用
5. **专业性**：IPC分类号建议需准确对应技术领域

## 四、特殊处理规则

1. 若输入为多个检索词，分别进行拓展后再整合
2. 若输入为英文术语，同样提供完整的中文拓展
3. 对于新兴技术领域，标注"新兴技术"并提供最接近的传统术语
4. 对于跨领域术语，分别标注各领域的含义差异

请始终保持专业、严谨的态度，确保输出结果能够直接应用于专利检索实践。`, 
        userTemplate: "请对以下专利检索词进行专业拓展分析：\n\n{{INPUT}}", 
        isCustom: false 
    },
    "general_assistant": { name: "通用助手", system: "你是一个乐于助人的通用AI助手，可以回答各种问题。", userTemplate: "", isCustom: false }
};

/**
 * Load personas from localStorage (user-isolated)
 * Preset personas are always updated to latest version
 */
function loadPersonas() {
    const storage = window.userCacheStorage;
    const savedPersonas = storage.getJSON('chatPersonas');
    
    if (savedPersonas && Object.keys(savedPersonas).length > 0) {
        appState.chat.personas = { ...savedPersonas };
        Object.keys(PRESET_PERSONAS).forEach(id => {
            if (!appState.chat.personas[id] || !appState.chat.personas[id].isCustom) {
                appState.chat.personas[id] = PRESET_PERSONAS[id];
            }
        });
        savePersonas();
    } else {
        appState.chat.personas = { ...PRESET_PERSONAS };
        savePersonas();
    }
}

/**
 * Save personas to localStorage (user-isolated)
 */
function savePersonas() {
    window.userCacheStorage.setJSON('chatPersonas', appState.chat.personas);
}

/**
 * Update persona selector dropdown
 */
function updatePersonaSelector() {
    const chatPersonaSelect = document.getElementById('chat_persona_select');
    if (!chatPersonaSelect) return;
    
    const currentVal = chatPersonaSelect.value;
    chatPersonaSelect.innerHTML = Object.keys(appState.chat.personas).map(id => `<option value="${id}">${appState.chat.personas[id].name}</option>`).join('');
    if (appState.chat.personas[currentVal]) chatPersonaSelect.value = currentVal;
    else if (Object.keys(appState.chat.personas).length > 0) chatPersonaSelect.value = Object.keys(appState.chat.personas)[0];
}

/**
 * Add a new persona
 */
function addPersona() {
    const chatPersonaSelect = document.getElementById('chat_persona_select');
    
    const newId = `custom-${Date.now()}`;
    const newName = prompt("请输入新角色的名称：");
    if (!newName || !newName.trim()) return;

    appState.chat.personas[newId] = {
        name: newName.trim(),
        system: "你是一个乐于助人的AI助手。",
        userTemplate: "",
        isCustom: true
    };

    savePersonas();
    updatePersonaSelector();
    if (chatPersonaSelect) {
        chatPersonaSelect.value = newId;
    }
    updatePersonaEditor();
    
    const personaNameInput = document.getElementById('persona_name_input');
    if (personaNameInput) {
        personaNameInput.focus();
    }
}

/**
 * Delete a persona
 */
function deletePersona() {
    const chatPersonaSelect = document.getElementById('chat_persona_select');
    if (!chatPersonaSelect) return;
    
    const id = chatPersonaSelect.value;
    const persona = appState.chat.personas[id];
    if (!persona.isCustom) return alert("抱歉，不能删除预设角色。");
    if (confirm(`确定要删除角色 "${persona.name}" 吗？使用此角色的对话将切换为通用助手。`)) {
        delete appState.chat.personas[id];
        appState.chat.conversations.forEach(c => {
            if (c.personaId === id) c.personaId = 'general_assistant';
        });
        savePersonas();
        saveConversations();
        updatePersonaSelector();
        switchConversation(appState.chat.currentConversationId);
        alert("角色已删除。");
    }
}

/**
 * Update persona editor fields
 */
function updatePersonaEditor() {
    const chatPersonaSelect = document.getElementById('chat_persona_select');
    if (!chatPersonaSelect) return;
    
    const id = chatPersonaSelect.value;
    const persona = appState.chat.personas[id];
    if (!persona) return;

    const personaNameInput = document.getElementById('persona_name_input');
    const personaSystemInput = document.getElementById('persona_system_input');
    const personaTemplateInput = document.getElementById('persona_template_input');
    const chatSavePersonaBtn = document.getElementById('chat_save_persona_btn');
    
    if (personaNameInput) {
        personaNameInput.value = persona.name || '';
    }
    if (personaSystemInput) {
        personaSystemInput.value = persona.system || '';
    }
    if (personaTemplateInput) {
        personaTemplateInput.value = persona.userTemplate || '';
    }

    const isCustom = persona.isCustom !== undefined ? persona.isCustom : false;
    if (personaNameInput) personaNameInput.disabled = !isCustom;
    if (personaSystemInput) personaSystemInput.disabled = !isCustom;
    if (personaTemplateInput) personaTemplateInput.disabled = !isCustom;
    if (chatSavePersonaBtn) chatSavePersonaBtn.disabled = !isCustom;
}

/**
 * Save current persona
 */
function saveCurrentPersona() {
    const chatPersonaSelect = document.getElementById('chat_persona_select');
    if (!chatPersonaSelect) return;
    
    const id = chatPersonaSelect.value;
    const persona = appState.chat.personas[id];
    if (!persona || !persona.isCustom) {
        alert('不能修改预设角色！');
        return;
    }

    const personaNameInput = document.getElementById('persona_name_input');
    const personaSystemInput = document.getElementById('persona_system_input');
    const personaTemplateInput = document.getElementById('persona_template_input');
    
    const name = personaNameInput ? personaNameInput.value.trim() : '';
    const system = personaSystemInput ? personaSystemInput.value.trim() : '';
    const userTemplate = personaTemplateInput ? personaTemplateInput.value.trim() : '';

    if (!name || !system) {
        alert('角色名称和系统提示不能为空！');
        return;
    }

    persona.name = name;
    persona.system = system;
    persona.userTemplate = userTemplate;

    savePersonas();
    updatePersonaSelector();
    updateCurrentConversationPersona();
    alert('角色已更新并保存到本地！');
}

window.loadPersonas = loadPersonas;
window.savePersonas = savePersonas;
window.updatePersonaSelector = updatePersonaSelector;
window.updatePersonaEditor = updatePersonaEditor;
window.addPersona = addPersona;
window.deletePersona = deletePersona;
window.saveCurrentPersona = saveCurrentPersona;
window.saveLastUsedPersona = saveLastUsedPersona;
window.getLastUsedPersona = getLastUsedPersona;
window.updatePersonaIndicator = updatePersonaIndicator;

/**
 * Save the last used persona ID to localStorage
 * @param {string} personaId - The persona ID to save
 */
function saveLastUsedPersona(personaId) {
    if (!personaId) return;
    window.userCacheStorage.set('lastUsedPersonaId', personaId);
}

/**
 * Get the last used persona ID from localStorage
 * @returns {string|null} The last used persona ID or null if not set
 */
function getLastUsedPersona() {
    return window.userCacheStorage.get('lastUsedPersonaId');
}

/**
 * Update the persona indicator display
 * Shows the current persona name in the floating indicator
 */
function updatePersonaIndicator() {
    const indicatorText = document.getElementById('chat_persona_indicator_text');
    const chatPersonaSelect = document.getElementById('chat_persona_select');
    
    if (!indicatorText) return;
    
    let personaId = null;
    let personaName = '通用助手';
    
    if (chatPersonaSelect && chatPersonaSelect.value) {
        personaId = chatPersonaSelect.value;
    }
    
    if (personaId && appState.chat.personas[personaId]) {
        personaName = appState.chat.personas[personaId].name;
    } else {
        const lastUsedId = getLastUsedPersona();
        if (lastUsedId && appState.chat.personas[lastUsedId]) {
            personaName = appState.chat.personas[lastUsedId].name;
        }
    }
    
    indicatorText.textContent = `当前角色：${personaName}`;
}
