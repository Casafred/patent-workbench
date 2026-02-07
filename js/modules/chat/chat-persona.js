// js/modules/chat/chat-persona.js
// Persona management functionality

/**
 * Load personas from localStorage
 */
function loadPersonas() {
    const savedPersonas = JSON.parse(localStorage.getItem('chatPersonas'));
    if (savedPersonas && Object.keys(savedPersonas).length > 0) {
        appState.chat.personas = savedPersonas;
    } else {
        appState.chat.personas = {
            "patent_analyzer": { name: "资深专利分析师", system: "你是一位顶级的专利分析师和信息架构师，极其擅长从复杂、冗长的专利文本中快速提炼核心技术原理、解决方案、技术问题和效果。你的回答应该专业、结构清晰、逻辑严谨。", userTemplate: "", isCustom: false },
            "translator": { name: "专业技术翻译", system: "你是一个专业精通各技术领域术语的、精通多国语言的专利文本翻译引擎。你的任务是自动检测用户输入专利文本的语言并将其翻译成中文或英文。请直接返回翻译后的文本，不要添加任何额外的解释或说明。", userTemplate: "", isCustom: false },
            "keyword_expander": { name: "专利检索词专家", system: "你是一名资深的专利检索专家。你的任务是根据用户提供的技术点，拓展出一系列用于专利数据库检索的中英文同义词、近义词、上下位概念和相关技术术语。输出应该清晰、格式化，便于复制使用。", userTemplate: "", isCustom: false },
            "general_assistant": { name: "通用助手", system: "你是一个乐于助人的通用AI助手，可以回答各种问题。", userTemplate: "", isCustom: false }
        };
        savePersonas();
    }
}

/**
 * Save personas to localStorage
 */
function savePersonas() {
    localStorage.setItem('chatPersonas', JSON.stringify(appState.chat.personas));
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
