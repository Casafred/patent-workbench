// js/modules/chat/chat-conversation.js
// Conversation management and history functionality

/**
 * Load conversations from localStorage
 */
function loadConversations() {
    const savedConvos = JSON.parse(localStorage.getItem('chatConversations') || '[]');
    appState.chat.conversations = savedConvos;
    appState.chat.currentConversationId = localStorage.getItem('currentConversationId');
    if (savedConvos.length > 0 && (!appState.chat.currentConversationId || !savedConvos.find(c => c.id === appState.chat.currentConversationId))) {
        appState.chat.currentConversationId = savedConvos.sort((a,b) => b.lastUpdate - a.lastUpdate)[0].id;
    }
    
    // Load file cache
    try {
        const savedCache = localStorage.getItem('parsedFilesCache');
        if (savedCache) {
            appState.chat.parsedFilesCache = JSON.parse(savedCache);
            console.log('✅ 已加载文件缓存，共', Object.keys(appState.chat.parsedFilesCache).length, '个文件');
        }
    } catch (e) {
        console.warn('⚠️ 无法加载文件缓存:', e);
        appState.chat.parsedFilesCache = {};
    }
}

/**
 * Save conversations to localStorage
 */
function saveConversations() {
    localStorage.setItem('chatConversations', JSON.stringify(appState.chat.conversations));
}

/**
 * Start a new chat conversation
 * @param {boolean} shouldSwitch - Whether to switch to the new conversation
 */
function startNewChat(shouldSwitch = false) {
    removeActiveFile(); 
    const newId = `convo-${Date.now()}`;
    
    const chatPersonaSelect = document.getElementById('chat_persona_select');
    const personaId = (chatPersonaSelect ? chatPersonaSelect.value : null) || Object.keys(appState.chat.personas)[0];
    const persona = appState.chat.personas[personaId];
    
    const newConvo = {
        id: newId,
        title: ``,
        personaId: personaId,
        messages: [{ role: 'system', content: persona.system }],
        lastUpdate: Date.now()
    };
    
    appState.chat.conversations.push(newConvo);
    if (shouldSwitch) {
        switchConversation(newId);
    }
    saveConversations();
    renderChatHistoryList();
}

/**
 * Switch to a different conversation
 * @param {string} id - Conversation ID
 */
function switchConversation(id) {
    removeActiveFile();
    appState.chat.currentConversationId = id;
    localStorage.setItem('currentConversationId', id);
    renderCurrentChat();
    renderChatHistoryList();
    toggleManagementMode(false);
    updatePersonaEditor(); 
}

/**
 * Delete a conversation
 * @param {Event} event - Click event
 * @param {string} convoId - Conversation ID to delete
 */
function deleteConversation(event, convoId) {
    event.stopPropagation();
    const convoToDelete = appState.chat.conversations.find(c => c.id === convoId);
    if (!convoToDelete) return;

    if (confirm(`您确定要永久删除对话 "${convoToDelete.title || '未命名对话'}" 吗？此操作无法撤销。`)) {
        if (convoToDelete.messages.length > 1 && confirm(`是否在删除前导出对话 "${convoToDelete.title || '未命名对话'}" 的聊天记录？`)) {
            const originalConvoId = appState.chat.currentConversationId;
            appState.chat.currentConversationId = convoId;
            exportChatHistory('txt');
            appState.chat.currentConversationId = originalConvoId;
        }
        
        appState.chat.conversations = appState.chat.conversations.filter(c => c.id !== convoId);
        if (appState.chat.currentConversationId === convoId) {
            const mostRecentConvo = appState.chat.conversations.sort((a, b) => b.lastUpdate - a.lastUpdate)[0];
            if (mostRecentConvo) {
                switchConversation(mostRecentConvo.id);
            } else {
                startNewChat(false);
            }
        }
        saveConversations();
        renderChatHistoryList();
    }
}

/**
 * Render chat history list in sidebar
 */
function renderChatHistoryList() {
    const chatHistoryList = document.getElementById('chat_history_list');
    if (!chatHistoryList) return;
    
    chatHistoryList.innerHTML = '';
    const sortedConvos = [...appState.chat.conversations].sort((a, b) => b.lastUpdate - a.lastUpdate);
    sortedConvos.forEach(convo => {
        const item = document.createElement('div');
        item.className = 'chat-history-item';
        item.dataset.id = convo.id;
        if (convo.id === appState.chat.currentConversationId) {
            item.classList.add('active');
        }

        item.innerHTML = `
            <div class="history-item-content" onclick="switchConversation('${convo.id}')">
                <div class="title-container">
                  <span class="history-item-title" 
                        title="${convo.title || '未命名对话'}"
                        data-convo-id="${convo.id}">${convo.title || '未命名对话'}</span>
                </div>
                <span class="history-item-details">${new Date(convo.lastUpdate).toLocaleString()}</span>
            </div>
            <div class="history-item-actions">
                <button class="icon-button edit-title-btn" title="编辑标题" onclick="enableTitleEdit(event, '${convo.id}')">
                    <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="icon-button history-delete-btn" title="删除对话" onclick="deleteConversation(event, '${convo.id}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
                </button>
            </div>
        `;
        
        chatHistoryList.appendChild(item);
    });
    
    const convo = appState.chat.conversations.find(c => c.id === appState.chat.currentConversationId);
    if (convo) {
        const currentTitleEl = getEl('chat_current_title');
        if (currentTitleEl) {
            currentTitleEl.textContent = convo.title || '未命名对话';
        }
    }
}

/**
 * Enable title editing for a conversation
 * @param {Event} event - Click event
 * @param {string} convoId - Conversation ID
 */
function enableTitleEdit(event, convoId) { 
    event.stopPropagation();
    const mainTitleElement = document.getElementById('chat_current_title');
    if (mainTitleElement) {
        mainTitleElement.contentEditable = 'true';
        mainTitleElement.focus();
        const range = document.createRange();
        range.selectNodeContents(mainTitleElement);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

/**
 * Generate conversation title using AI
 * @param {Object} conversation - Conversation object
 */
async function generateConversationTitle(conversation) {
    const nonSystemMessages = conversation.messages.filter(m => m.role !== 'system');
    
    if (!conversation || conversation.title !== '' || nonSystemMessages.length < 2) {
        return;
    }
    
    // Title generation state management
    const titleGenerationState = window.titleGenerationState || {
        pending: new Set(),
        failed: new Set(),
        lastAttempt: {}
    };
    window.titleGenerationState = titleGenerationState;
    
    if (titleGenerationState.pending.has(conversation.id)) {
        console.log('标题生成中，跳过重复请求');
        return;
    }
    
    if (titleGenerationState.failed.has(conversation.id)) {
        console.log('标题生成已失败（并发限制），跳过');
        return;
    }
    
    const lastAttempt = titleGenerationState.lastAttempt[conversation.id];
    if (lastAttempt && (Date.now() - lastAttempt) < 5000) {
        console.log('标题生成请求过于频繁，跳过');
        return;
    }

    titleGenerationState.pending.add(conversation.id);
    titleGenerationState.lastAttempt[conversation.id] = Date.now();

    const recentMessages = conversation.messages.slice(-2);
    const contentToSummarize = recentMessages.map(m => `${m.role}: ${m.content}`).join('\n\n');

    const titlePrompt = {
        model: 'GLM-4-Flash',
        messages: [
            { role: 'system', content: '你是一个对话主题提炼专家。你的任务是根据提供的对话内容，用一句话（中文不超过20个字）总结出一个简洁、精炼的标题。直接返回标题文本，不要包含任何引导词、引号或说明。' },
            { role: 'user', content: `请为以下对话生成一个标题：\n\n${contentToSummarize}` }
        ],
        temperature: 0.4,
    };

    try {
        const responseData = await apiCall('/chat', titlePrompt, 'POST');
        const newTitleRaw = responseData.choices[0]?.message?.content;

        if (newTitleRaw) {
            if (conversation.title === '') {
                const newTitle = newTitleRaw.trim().replace(/["'""。,]/g, '').replace(/\s/g, '');
                conversation.title = newTitle;
                saveConversations();
                renderChatHistoryList();
                console.log(`AI生成标题成功: "${newTitle}"`);
            }
        }
    } catch (error) {
        console.error("自动生成标题失败:", error.message);
        
        if (error.message && (error.message.includes('1302') || error.message.includes('429'))) {
            titleGenerationState.failed.add(conversation.id);
            console.log('检测到并发限制错误，该对话不再自动生成标题');
        }
    } finally {
        titleGenerationState.pending.delete(conversation.id);
    }
}

/**
 * Update current conversation persona
 */
function updateCurrentConversationPersona() {
    const convo = appState.chat.conversations.find(c => c.id === appState.chat.currentConversationId);
    if (!convo) return;
    
    const chatPersonaSelect = document.getElementById('chat_persona_select');
    const chatWindow = document.getElementById('chat_window');
    
    if (!chatPersonaSelect) return;
    
    const newPersonaId = chatPersonaSelect.value;
    const newPersona = appState.chat.personas[newPersonaId];
    convo.personaId = newPersonaId;
    convo.messages[0] = { role: 'system', content: newPersona.system };
    convo.lastUpdate = Date.now();
    
    saveConversations();
    renderChatHistoryList();
    
    if (chatWindow) {
        const notification = document.createElement('div');
        notification.className = 'info';
        notification.style.alignSelf = 'center';
        notification.style.margin = '10px 0';
        notification.innerHTML = `对话角色已切换为：<strong>${newPersona.name}</strong>`;
        chatWindow.appendChild(notification);
    }
}
