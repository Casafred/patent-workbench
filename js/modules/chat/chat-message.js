// js/modules/chat/chat-message.js
// Message rendering and display functionality

/**
 * Render current chat conversation
 */
function renderCurrentChat() {
    const convo = appState.chat.conversations.find(c => c.id === appState.chat.currentConversationId);
    const chatWindow = document.getElementById('chat_window');
    const chatPersonaSelect = document.getElementById('chat_persona_select');
    
    if (!chatWindow) return;
    
    chatWindow.innerHTML = '';
    if (!convo) return;
    
    if (chatPersonaSelect && appState.chat.personas[convo.personaId]) {
        chatPersonaSelect.value = convo.personaId;
    }
    
    const currentTitleEl = getEl('chat_current_title');
    if (currentTitleEl) {
        currentTitleEl.textContent = convo.title || '未命名对话';
    }
    
    convo.messages.forEach((msg, index) => {
        if (msg.role !== 'system') {
            addMessageToDOM(msg.role, msg.content, index, false, msg.usage, msg.timestamp, msg, msg.searchResults);
        }
    });
    
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

/**
 * Add a message to the DOM
 * @param {string} role - Message role (user/assistant)
 * @param {string} content - Message content
 * @param {number} index - Message index
 * @param {boolean} isStreaming - Whether message is streaming
 * @param {Object} usage - Token usage info
 * @param {number} timestamp - Message timestamp
 * @param {Object} msg - Full message object
 * @param {Array} searchResults - Search results if any
 * @returns {string} Message element ID
 */
function addMessageToDOM(role, content, index, isStreaming = false, usage = null, timestamp = null, msg = null, searchResults = null) {
    const chatWindow = document.getElementById('chat_window');
    if (!chatWindow) return '';
    
    const messageId = `msg-${Date.now()}-${Math.random()}`;
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role}-message`;
    messageDiv.id = messageId;
    if (index !== undefined) messageDiv.dataset.index = index;

    let attachmentHtml = '';
    const attachedFile = msg ? msg.attachedFile : null;
    if (role === 'user' && attachedFile && attachedFile.filename) {
        const taskIdDisplay = attachedFile.taskId || attachedFile.fileId || 'N/A';
        const serviceType = attachedFile.toolType || 'lite';
        attachmentHtml = `
            <div class="message-attachment-indicator" title="任务ID: ${taskIdDisplay} | 解析服务: ${serviceType}">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M4.5 3a2.5 2.5 0 0 1 5 0v9a1.5 1.5 0 0 1-3 0V5a.5.5 0 0 1 1 0v7a.5.5 0 0 0 1 0V3a1.5 1.5 0 1 0-3 0v9a2.5 2.5 0 0 0 5 0V5a.5.5 0 0 1 1 0v7a3.5 3.5 0 1 1-7 0V3z"/></svg>
                <span>${attachedFile.filename}</span>
                <span class="file-service-badge">${serviceType}</span>
            </div>
        `;
    }

    const renderedContent = isStreaming ? content : (window.marked ? window.marked.parse(content, { gfm: true, breaks: true }) : content.replace(/</g, "&lt;").replace(/>/g, "&gt;"));

    const tokenUsageHtml = (usage && usage.total_tokens) ? `<div class="message-token-usage">Tokens: ${usage.total_tokens}</div>` : `<div class="message-token-usage"></div>`;

    let formattedTime = '';
    const dateObj = timestamp ? new Date(timestamp) : new Date();
    if (!isNaN(dateObj.getTime())) {
        const today = new Date();
        if (dateObj.toDateString() === today.toDateString()) {
            formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            formattedTime = dateObj.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
    }
    const timeHtml = `<div class="message-time" title="${dateObj.toLocaleString()}">${formattedTime}</div>`;

    messageDiv.innerHTML = `
        <input type="checkbox" class="message-checkbox" title="选择此消息">
        <div class="message-main-content">
            <div class="avatar">${role === 'user' ? 'U' : 'AI'}</div>
            <div class="message-body">
                ${attachmentHtml}
                <div class="message-content">${renderedContent}</div>
                <div class="message-footer">
                    ${timeHtml}
                    ${role === 'assistant' ? tokenUsageHtml : ''}
                    <button class="icon-button" title="复制" onclick="copyMessage(this)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V2Zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H6Z M2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1H2Z"></path></svg></button>
                    <button class="icon-button" title="删除" onclick="deleteMessage(this)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg></button>
                    ${role === 'user' ? `<button class="icon-button" title="重新发送" onclick="resendMessage(this)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 3a5 5 0 0 0-5 5h1a4 4 0 0 1 4-4V3z"/><path d="M8 13a5 5 0 0 0 5-5h-1a4 4 0 0 1-4 4v1z"/><path fill-rule="evenodd" d="M8 3a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 3z"/></svg></button>` : ''}
                    ${role === 'assistant' ? `<button class="icon-button" title="重新生成" onclick="regenerateMessage(this)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 3a5 5 0 0 0-5 5h1a4 4 0 0 1 4-4V3z"/><path d="M8 13a5 5 0 0 0 5-5h-1a4 4 0 0 1-4 4v1z"/><path fill-rule="evenodd" d="M8 3a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 3z"/></svg></button>` : ''}
                </div>
            </div>
        </div>
    `;

    const footer = messageDiv.querySelector('.message-footer');
    if (isStreaming) footer.style.opacity = '0';
    
    chatWindow.appendChild(messageDiv);
    
    // Add search results if present
    if (role === 'assistant' && !isStreaming && searchResults && searchResults.length > 0) {
        const contentEl = messageDiv.querySelector('.message-content');
        const sourcesDiv = document.createElement('div');
        sourcesDiv.className = 'search-sources';
        sourcesDiv.innerHTML = `
            <div class="sources-header">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                </svg>
                <span>搜索来源 (${searchResults.length})</span>
            </div>
            <div class="sources-list">
                ${searchResults.map((result, index) => `
                    <div class="source-item">
                        <span class="source-number">[${index + 1}]</span>
                        <a href="${result.link}" target="_blank" rel="noopener noreferrer" class="source-link" title="${result.content || ''}">
                            ${result.title}
                        </a>
                        ${result.media ? `<span class="source-media">${result.media}</span>` : ''}
                        ${result.publish_date ? `<span class="source-date">${result.publish_date}</span>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
        contentEl.appendChild(sourcesDiv);
    }
    
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return messageId;
}

/**
 * Update character count and input height
 */
function updateCharCount() {
    const chatCharCount = document.getElementById('chat_char_count');
    const chatInput = document.getElementById('chat_input');
    
    if (chatCharCount && chatInput) {
        chatCharCount.textContent = chatInput.value.length;
        chatInput.style.height = 'auto';
        chatInput.style.height = `${Math.min(chatInput.scrollHeight, 300)}px`;
    }
}

/**
 * Delete a message
 * @param {HTMLElement} buttonElement - Delete button element
 */
function deleteMessage(buttonElement) {
    const messageEl = buttonElement.closest('.chat-message');
    const index = parseInt(messageEl.dataset.index, 10);
    const convo = appState.chat.conversations.find(c => c.id === appState.chat.currentConversationId);
    
    if (!convo || isNaN(index) || index < 0 || index >= convo.messages.length) return;
    
    const message = convo.messages[index];
    if (message.role === 'system') {
        alert('系统消息无法删除');
        return;
    }
    
    if (confirm('确定要删除这条消息吗？此操作无法撤销。')) {
        convo.messages.splice(index, 1);
        convo.lastUpdate = Date.now();
        saveConversations();
        renderCurrentChat();
    }
}

/**
 * Resend a user message
 * @param {HTMLElement} buttonElement - Resend button element
 */
function resendMessage(buttonElement) {
    const messageEl = buttonElement.closest('.chat-message');
    const index = parseInt(messageEl.dataset.index, 10);
    const convo = appState.chat.conversations.find(c => c.id === appState.chat.currentConversationId);
    
    if (!convo || isNaN(index) || index < 0 || index >= convo.messages.length) return;
    
    const message = convo.messages[index];
    if (message.role !== 'user') return;
    
    const chatInput = document.getElementById('chat_input');
    if (!chatInput) return;
    
    const content = message.content;
    chatInput.value = content;
    chatInput.focus();
    chatInput.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Regenerate an assistant message
 * @param {HTMLElement} buttonElement - Regenerate button element
 */
function regenerateMessage(buttonElement) {
    const messageEl = buttonElement.closest('.chat-message');
    const index = parseInt(messageEl.dataset.index, 10);
    const convo = appState.chat.conversations.find(c => c.id === appState.chat.currentConversationId);
    
    if (!convo || isNaN(index) || index < 0 || index >= convo.messages.length) return;
    
    const message = convo.messages[index];
    if (message.role !== 'assistant') return;
    
    let userMessageIndex = -1;
    for (let i = index - 1; i >= 0; i--) {
        if (convo.messages[i].role === 'user') {
            userMessageIndex = i;
            break;
        }
    }
    
    if (userMessageIndex === -1) {
        alert('无法找到对应的用户消息');
        return;
    }
    
    const messagesToDelete = convo.messages.length - index;
    if (confirm('确定要重新生成这条AI回复吗？后续的AI回复也会被删除。')) {
        convo.messages.splice(index, messagesToDelete);
        convo.lastUpdate = Date.now();
        saveConversations();
        renderCurrentChat();
        
        const chatInput = document.getElementById('chat_input');
        if (!chatInput) return;
        
        const userMessage = convo.messages[userMessageIndex];
        chatInput.value = userMessage.content;
        handleStreamChatRequest();
    }
}

/**
 * Toggle management mode for bulk message operations
 * @param {boolean} forceState - Force a specific state
 */
function toggleManagementMode(forceState) {
    const chatWindow = document.getElementById('chat_window');
    const chatManagementBar = document.getElementById('chat_management_bar');
    const chatManageBtn = document.getElementById('chat_manage_btn');
    
    if (!chatWindow || !chatManagementBar || !chatManageBtn) return;
    
    appState.chat.isManagementMode = forceState !== undefined ? forceState : !appState.chat.isManagementMode;
    chatWindow.classList.toggle('chat-window-management-mode', appState.chat.isManagementMode);
    chatManagementBar.style.display = appState.chat.isManagementMode ? 'flex' : 'none';
    chatManageBtn.textContent = appState.chat.isManagementMode ? '退出管理' : '管理消息';
    if (!appState.chat.isManagementMode) {
        chatWindow.querySelectorAll('.message-checkbox').forEach(cb => cb.checked = false);
    }
}

/**
 * Toggle select all messages
 * @param {boolean} select - Whether to select or deselect
 */
function toggleSelectAllMessages(select) {
    const chatWindow = document.getElementById('chat_window');
    if (!chatWindow) return;
    
    const checkboxes = chatWindow.querySelectorAll('.message-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = select;
    });
}

/**
 * Delete selected messages
 */
function deleteSelectedMessages() {
    const chatWindow = document.getElementById('chat_window');
    if (!chatWindow) return;
    
    const indicesToDelete = [];
    chatWindow.querySelectorAll('.message-checkbox:checked').forEach(cb => {
        const messageEl = cb.closest('.chat-message');
        if (messageEl && messageEl.dataset.index) {
            const index = parseInt(messageEl.dataset.index, 10);
            if (!isNaN(index)) indicesToDelete.push(index);
        }
    });

    if (indicesToDelete.length === 0) return alert("请先选择要删除的消息。");
    if (!confirm(`确定要删除选中的 ${indicesToDelete.length} 条消息吗？此操作无法撤销。`)) return;

    const convo = appState.chat.conversations.find(c => c.id === appState.chat.currentConversationId);
    if (!convo) return;
    
    indicesToDelete.sort((a, b) => b - a);
    indicesToDelete.forEach(index => {
        convo.messages.splice(index, 1);
    });

    convo.lastUpdate = Date.now();
    saveConversations();
    renderCurrentChat();
    toggleManagementMode(false);
}
