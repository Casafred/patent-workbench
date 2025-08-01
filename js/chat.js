// js/chat.js (完整最终版)

function initChat() {
    // 标题编辑功能初始化
    const chatCurrentTitle = document.getElementById('chat_current_title');
    const chatSaveTitleBtn = document.getElementById('chat_save_title_btn');

    // 点击标题进入编辑状态
    chatCurrentTitle.addEventListener('click', () => {
        chatCurrentTitle.focus();
        chatSaveTitleBtn.classList.remove('hidden');
    });

    // 编辑时显示保存按钮
    chatCurrentTitle.addEventListener('input', () => {
        chatSaveTitleBtn.classList.remove('hidden');
    });

    // 保存标题更改
    chatSaveTitleBtn.addEventListener('click', () => {
        saveTitleChanges();
    });

    // 按Enter保存标题
    chatCurrentTitle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveTitleChanges();
        } else if (e.key === 'Escape') {
            // 按Escape取消编辑
            const convo = appState.chat.conversations.find(c => c.id === appState.chat.currentConversationId);
            if (convo) {
                chatCurrentTitle.textContent = convo.title || '未命名对话';
            }
            chatSaveTitleBtn.classList.add('hidden');
        }
    });

    // 点击其他地方保存标题
    document.addEventListener('click', (e) => {
        if (!chatCurrentTitle.contains(e.target) && !chatSaveTitleBtn.contains(e.target)) {
            if (!chatSaveTitleBtn.classList.contains('hidden')) {
                saveTitleChanges();
            }
        }
    });

    function saveTitleChanges() {
        const newTitle = chatCurrentTitle.textContent.trim();
        const convo = appState.chat.conversations.find(c => c.id === appState.chat.currentConversationId);

        if (convo) {
            if (convo.title !== newTitle) {
                convo.title = newTitle;
                saveConversations();
                renderChatHistoryList();
                console.log(`标题已更新为: "${newTitle}"`);
            }
        }
        chatSaveTitleBtn.classList.add('hidden');
    }

    chatModelSelect.innerHTML = AVAILABLE_MODELS.map(m => `<option value="${m}">${m}</option>`).join('');
    loadPersonas();
    loadConversations();

    // 初始化对话参数模态框
    const chatParamsModal = document.getElementById('chat_params_modal');
    const chatParamsBtn = document.getElementById('chat_params_btn');
    const closeModalBtn = document.querySelector('.close-modal');
    const saveChatParamsBtn = document.getElementById('save_chat_params_btn');

    // 打开模态框
    chatParamsBtn.addEventListener('click', () => {
        chatParamsModal.style.display = 'block';
        // 延迟添加show类以确保过渡效果生效
        setTimeout(() => {
            chatParamsModal.classList.add('show');
        }, 10);
    });

    // 关闭模态框 - 点击关闭按钮
        closeModalBtn.addEventListener('click', () => {
            chatParamsModal.classList.remove('show');
            // 等待过渡效果完成后再隐藏
            setTimeout(() => {
                chatParamsModal.style.display = 'none';
            }, 200);
        });

        // 关闭模态框 - 点击模态框外部
        window.addEventListener('click', (event) => {
            if (event.target === chatParamsModal) {
                chatParamsModal.classList.remove('show');
                // 等待过渡效果完成后再隐藏
                setTimeout(() => {
                    chatParamsModal.style.display = 'none';
                }, 200);
            }
        });

        // 保存设置按钮事件
        saveChatParamsBtn.addEventListener('click', () => {
            // 这里可以添加保存设置的逻辑，如果需要
            chatParamsModal.classList.remove('show');
            // 等待过渡效果完成后再隐藏
            setTimeout(() => {
                chatParamsModal.style.display = 'none';
                alert('对话参数已保存');
            }, 200);
        });
    
    chatSendBtn.addEventListener('click', handleStreamChatRequest);
    chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleStreamChatRequest(); }});
    chatInput.addEventListener('input', () => {
        chatCharCount.textContent = chatInput.value.length;
        chatInput.style.height = 'auto';
        chatInput.style.height = `${Math.min(chatInput.scrollHeight, 300)}px`;
    });
    chatPersonaSelect.addEventListener('change', updateCurrentConversationPersona);
    chatNewBtn.addEventListener('click', () => startNewChat(true));
    chatInputNewBtn.addEventListener('click', () => startNewChat(true));
    
    // 设置所有导出下拉菜单的事件监听
    document.addEventListener('click', (e) => {
        if (e.target.matches('[data-export]')) {
            e.preventDefault();
            const exportType = e.target.dataset.export;
            exportChatHistory(exportType);
        }
    });

    chatAddPersonaBtn.addEventListener('click', addPersona);
    chatDeletePersonaBtn.addEventListener('click', deletePersona);
    chatSavePersonaBtn = document.getElementById('chat_save_persona_btn');
    chatSavePersonaBtn.addEventListener('click', saveCurrentPersona);

    // 监听角色选择变化
    chatPersonaSelect.addEventListener('change', updatePersonaEditor);

    chatManageBtn.addEventListener('click', () => toggleManagementMode());

    // 初始化角色编辑器
    updatePersonaEditor();
    
    chatSelectAllBtn.addEventListener('click', () => {
        console.log("全选按钮点击");
        toggleSelectAllMessages(true);
    });
    
    chatDeselectAllBtn.addEventListener('click', () => {
        console.log("取消全选按钮点击");
        toggleSelectAllMessages(false);
    });

    chatDeleteSelectedBtn.addEventListener('click', deleteSelectedMessages);
    
    updatePersonaSelector();
    renderChatHistoryList();
    if (!appState.chat.currentConversationId) {
        startNewChat(false);
    } else {
        switchConversation(appState.chat.currentConversationId);
    }
}

async function generateConversationTitle(conversation) {
    // 只有当标题为空且至少有2条非系统消息时才生成标题
    const nonSystemMessages = conversation.messages.filter(m => m.role !== 'system');
    if (!conversation || conversation.title !== '' || nonSystemMessages.length < 2) {
        return;
    }

    const recentMessages = conversation.messages.slice(-2);
    const contentToSummarize = recentMessages.map(m => `${m.role}: ${m.content}`).join('\n\n');

    const titlePrompt = {
        model: 'glm-4-flash',
        messages: [
            {
                role: 'system',
                content: '你是一个文本摘要专家。你的任务是根据提供的对话内容，用一句话（中文不超过15个字）总结出一个简洁、精炼的标题。直接返回标题文本，不要包含任何引导词、引号或说明。'
            },
            {
                role: 'user',
                content: `请为以下对话生成一个标题：\n\n${contentToSummarize}`
            }
        ],
        temperature: 0.2,
    };

    try {
        const responseData = await apiCall('/chat', titlePrompt, 'POST');
        const newTitleRaw = responseData.choices[0]?.message?.content;

        if (newTitleRaw) {
            // 只有当当前标题仍为空时才更新，防止覆盖用户刚刚手动修改的标题
            if (conversation.title === '') {
                const newTitle = newTitleRaw.trim().replace(/["'“”。,]/g, '').replace(/\s/g, '');
                conversation.title = newTitle;
                saveConversations();
                renderChatHistoryList(); // 重新渲染列表以显示新标题
                console.log(`AI生成标题成功: "${newTitle}"`);
            }
        }
    } catch (error) {
        console.error("自动生成标题失败:", error.message);
        // 即使生成失败，也不应影响用户体验，仅在控制台打印错误
    }
}

function renderChatHistoryList() {
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
                        title="点击编辑标题"
                        data-convo-id="${convo.id}"
                        contenteditable="false"
                        onkeydown="handleTitleEditKeydown(event)">${convo.title}</span>
                </div>
                <span class="history-item-details">${new Date(convo.lastUpdate).toLocaleString()}</span>
            </div>
            <div class="history-item-actions">
                <button class="icon-button edit-title-btn" 
                        title="编辑标题"
                        onclick="enableTitleEdit(event, '${convo.id}')">
                    <svg viewBox="0 0 24 24">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
                <button 
                    class="icon-button history-delete-btn" 
                    title="删除对话" 
                    onclick="deleteConversation(event, '${convo.id}')"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
                </button>
            </div>
        `;
        
        chatHistoryList.appendChild(item);
    });
    
    // 同步更新当前聊天框上方的标题
    const convo = appState.chat.conversations.find(c => c.id === appState.chat.currentConversationId);
    if (convo) {
        const currentTitleEl = getEl('chat_current_title');
        if (currentTitleEl) {
            currentTitleEl.textContent = convo.title || '未命名对话';
        }
    }
}

function enableTitleEdit(event, convoId) { 
  event.stopPropagation();
  const titleElement = document.querySelector(`.history-item-title[data-convo-id='${convoId}']`);
  if (titleElement) {
    titleElement.contentEditable = 'true';
    titleElement.focus();
    // 选中所有文本
    const range = document.createRange();
    range.selectNodeContents(titleElement);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    // 阻止点击标题本身时触发blur
    titleElement.addEventListener('mousedown', function(e) {
      e.stopPropagation();
    });
    
    // 阻止点击标题时触发父元素的点击事件
    titleElement.addEventListener('click', function(e) {
      e.stopPropagation();
    });
    
    // 添加document级别的点击事件监听器来检测外部点击
    const handleExternalClick = function(e) {
      if (!titleElement.contains(e.target)) {
        handleTitleEditBlur({ target: titleElement });
        document.removeEventListener('click', handleExternalClick);
      }
    };
    
    // 延迟添加监听器，避免当前点击事件立即触发
    setTimeout(() => {
      document.addEventListener('click', handleExternalClick);
    }, 0);
  }
}

function handleTitleEditKeydown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        event.target.blur();
    }
    if (event.key === 'Escape') {
        const convoId = event.target.dataset.convoId;
        const conversation = appState.chat.conversations.find(c => c.id === convoId);
        if (conversation) {
            event.target.textContent = conversation.title;
        }
        event.target.blur();
    }
}

function handleTitleEditBlur(event) { 
    event.target.contentEditable = 'false';
    const convoId = event.target.dataset.convoId;
    const newTitle = event.target.textContent.trim();
    const conversation = appState.chat.conversations.find(c => c.id === convoId);

    if (conversation) {
        // 总是保存新标题，即使是空字符串
        if (conversation.title !== newTitle) {
            conversation.title = newTitle;
            saveConversations();
            renderChatHistoryList(); // 重新渲染确保同步
            console.log(`标题已更新为: "${newTitle}"`);
        } else {
            // 如果没变化，恢复原状
            event.target.textContent = conversation.title;
        }
    }
}

async function handleStreamChatRequest() {
    const userInput = chatInput.value.trim();
    if (!userInput) return;
    
    const convo = appState.chat.conversations.find(c => c.id === appState.chat.currentConversationId);
    if (!convo) return;
    
    const messagesCountBefore = convo.messages.length;

    chatSendBtn.disabled = true;
    chatInput.disabled = true;

    const persona = appState.chat.personas[convo.personaId];
    let finalUserInput = userInput;
    if (persona.userTemplate && persona.userTemplate.includes('{{INPUT}}')) {
        finalUserInput = persona.userTemplate.replace('{{INPUT}}', userInput);
    }
    
    convo.messages.push({ role: 'user', content: finalUserInput, timestamp: Date.now() });
    convo.lastUpdate = Date.now();
    
    renderCurrentChat();
    renderChatHistoryList();
    saveConversations();
    
    chatInput.value = '';
    chatInput.style.height = '50px';
    chatCharCount.textContent = '0';
    
    const assistantMessageId = addMessageToDOM('assistant', '<span class="blinking-cursor">|</span>', convo.messages.length, true);
    const assistantMessageEl = getEl(assistantMessageId);
    const assistantContentEl = assistantMessageEl.querySelector('.message-content');
    const tokenUsageEl = assistantMessageEl.querySelector('.message-token-usage');
    let fullResponse = "";
    let usageInfo = null;
    
    try {
        const contextCount = parseInt(chatContextCount.value, 10);
        const messagesToSend = [convo.messages[0], ...convo.messages.slice(1).slice(-(contextCount * 2))];
        
        const reader = await apiCall('/stream_chat', { model: chatModelSelect.value, temperature: parseFloat(chatTempInput.value), messages: messagesToSend }, 'POST', true);
        const decoder = new TextDecoder();
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n\n').filter(line => line.startsWith('data: '));
            for (const line of lines) {
                const data = line.substring(6);
                if (data === '[DONE]') continue;
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) throw new Error(parsed.error.message || JSON.stringify(parsed.error));
                    if (parsed.usage) usageInfo = parsed.usage;
                    const delta = parsed.choices[0]?.delta?.content || "";
                    if (delta) {
                        fullResponse += delta;
                        assistantContentEl.innerHTML = window.marked.parse(fullResponse + '<span class="blinking-cursor">|</span>', { gfm: true, breaks: true });
                        chatWindow.scrollTop = chatWindow.scrollHeight;
                    }
                } catch(e) { /* ignore parsing errors in stream */ }
            }
        }
        assistantContentEl.innerHTML = window.marked.parse(fullResponse, { gfm: true, breaks: true });
        
        const assistantMessageData = { role: 'assistant', content: fullResponse, timestamp: Date.now() };
        if (usageInfo) {
            assistantMessageData.usage = usageInfo;
            if (tokenUsageEl) tokenUsageEl.textContent = `Tokens: ${usageInfo.total_tokens}`;
        }
        convo.messages.push(assistantMessageData);
        assistantMessageEl.dataset.index = convo.messages.length - 1;
        assistantMessageEl.querySelector('.message-footer').style.opacity = '1';

        saveConversations();

        // 生成对话标题
        setTimeout(() => generateConversationTitle(convo), 100);

    } catch (error) {
        assistantContentEl.innerHTML = `<div class="info error">请求失败: ${error.message}</div>`;
        convo.messages.push({ role: 'assistant', content: `[ERROR] ${error.message}` });
        assistantMessageEl.dataset.index = convo.messages.length - 1;
        assistantMessageEl.querySelector('.message-footer').style.opacity = '1';
        saveConversations();
    } finally {
        chatSendBtn.disabled = false;
        chatInput.disabled = false;
        chatInput.focus();
    }
}

function savePersonas() { localStorage.setItem('chatPersonas', JSON.stringify(appState.chat.personas)); }

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

function saveConversations() { localStorage.setItem('chatConversations', JSON.stringify(appState.chat.conversations)); }

function loadConversations() {
    const savedConvos = JSON.parse(localStorage.getItem('chatConversations') || '[]');
    appState.chat.conversations = savedConvos;
    appState.chat.currentConversationId = localStorage.getItem('currentConversationId');
    if (savedConvos.length > 0 && (!appState.chat.currentConversationId || !savedConvos.find(c => c.id === appState.chat.currentConversationId))) {
        appState.chat.currentConversationId = savedConvos.sort((a,b) => b.lastUpdate - a.lastUpdate)[0].id;
    }
}

function updatePersonaSelector() {
    const currentVal = chatPersonaSelect.value;
    chatPersonaSelect.innerHTML = Object.keys(appState.chat.personas).map(id => `<option value="${id}">${appState.chat.personas[id].name}</option>`).join('');
    if (appState.chat.personas[currentVal]) chatPersonaSelect.value = currentVal;
    else if (Object.keys(appState.chat.personas).length > 0) chatPersonaSelect.value = Object.keys(appState.chat.personas)[0];
}

function deleteConversation(event, convoId) {
    event.stopPropagation();
    const convoToDelete = appState.chat.conversations.find(c => c.id === convoId);
    if (!convoToDelete) return;

    if (confirm(`您确定要永久删除对话 "${convoToDelete.title}" 吗？此操作无法撤销。`)) {
        // 在删除前询问是否导出
        if (convoToDelete.messages.length > 1 && confirm(`是否在删除前导出对话 "${convoToDelete.title}" 的聊天记录？`)) {
            const originalConvoId = appState.chat.currentConversationId;
            appState.chat.currentConversationId = convoId; // 临时切换到要删除的对话
            exportChatHistory('txt');
            appState.chat.currentConversationId = originalConvoId; // 恢复原来的对话
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

function renderCurrentChat() {
    const convo = appState.chat.conversations.find(c => c.id === appState.chat.currentConversationId);
    chatWindow.innerHTML = '';
    if (!convo) return;
    
    if (appState.chat.personas[convo.personaId]) {
        chatPersonaSelect.value = convo.personaId;
    }
    
    // 更新聊天框上方的标题
    const currentTitleEl = getEl('chat_current_title');
    if (currentTitleEl) {
        currentTitleEl.textContent = convo.title || '未命名对话';
    }
    
    convo.messages.forEach((msg, index) => {
        if (msg.role !== 'system') {
            addMessageToDOM(msg.role, msg.content, index, false, msg.usage, msg.timestamp);
        }
    });
    
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function addMessageToDOM(role, content, index, isStreaming = false, usage = null, timestamp = null) {
    const messageId = `msg-${Date.now()}-${Math.random()}`;
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role}-message`;
    messageDiv.id = messageId;
    if (index !== undefined) messageDiv.dataset.index = index;
    
    const renderedContent = isStreaming ? content : (window.marked ? window.marked.parse(content, { gfm: true, breaks: true }) : content.replace(/</g, "&lt;").replace(/>/g, "&gt;"));
    
    const tokenUsageHtml = (usage && usage.total_tokens) ? `<div class="message-token-usage">Tokens: ${usage.total_tokens}</div>` : `<div class="message-token-usage"></div>`;
    const messageTime = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
    const timeHtml = `<div class="message-time">${messageTime}</div>`;
    
    messageDiv.innerHTML = `
        <input type="checkbox" class="message-checkbox" title="选择此消息">
        <div class="message-main-content">
            <div class="avatar">${role === 'user' ? 'U' : 'AI'}</div>
            <div class="message-body">
                <div class="message-content">${renderedContent}</div>
                <div class="message-footer">
                    ${timeHtml}
                    ${role === 'assistant' ? tokenUsageHtml : ''}
                    <button class="icon-button" title="复制" onclick="copyMessage(this)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V2Zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H6Z M2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1H2Z"></path></svg>
                    </button>
                    <button class="icon-button" title="删除" onclick="deleteMessage(this)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
                    </button>
                    ${role === 'user' ? `<button class="icon-button" title="重新发送" onclick="resendMessage(this)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 3a5 5 0 0 0-5 5h1a4 4 0 0 1 4-4V3z"/><path d="M8 13a5 5 0 0 0 5-5h-1a4 4 0 0 1-4 4v1z"/><path fill-rule="evenodd" d="M8 3a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 3z"/></svg>
                    </button>` : ''}
                    ${role === 'assistant' ? `<button class="icon-button" title="重新生成" onclick="regenerateMessage(this)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 3a5 5 0 0 0-5 5h1a4 4 0 0 1 4-4V3z"/><path d="M8 13a5 5 0 0 0 5-5h-1a4 4 0 0 1-4 4v1z"/><path fill-rule="evenodd" d="M8 3a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 3z"/></svg>
                    </button>` : ''}
                </div>
            </div>
        </div>
    `;

    const footer = messageDiv.querySelector('.message-footer');
    if (isStreaming) footer.style.opacity = '0';
    
    chatWindow.appendChild(messageDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return messageId;
}

function startNewChat(fromUserClick = false) {
    const newId = `convo-${Date.now()}`;
    const personaId = chatPersonaSelect.value || Object.keys(appState.chat.personas)[0];
    const persona = appState.chat.personas[personaId];
    
    const newConvo = {
        id: newId,
        title: ``,
        personaId: personaId,
        messages: [{ role: 'system', content: persona.system }],
        lastUpdate: Date.now()
    };
    
    appState.chat.conversations.push(newConvo);
    switchConversation(newId);
    saveConversations();
    renderChatHistoryList();
}

function switchConversation(id) {
    appState.chat.currentConversationId = id;
    localStorage.setItem('currentConversationId', id);
    renderCurrentChat();
    renderChatHistoryList();
    toggleManagementMode(false);
}

function updateCurrentConversationPersona() {
    const convo = appState.chat.conversations.find(c => c.id === appState.chat.currentConversationId);
    if (!convo) return;
    
    const newPersonaId = chatPersonaSelect.value;
    const newPersona = appState.chat.personas[newPersonaId];
    convo.personaId = newPersonaId;
    convo.messages[0] = { role: 'system', content: newPersona.system };
    convo.lastUpdate = Date.now();
    
    saveConversations();
    renderChatHistoryList();
    
    const notification = document.createElement('div');
    notification.className = 'info';
    notification.style.alignSelf = 'center';
    notification.style.margin = '10px 0';
    notification.innerHTML = `对话角色已切换为：<strong>${newPersona.name}</strong>`;
    chatWindow.appendChild(notification);
}

async function exportChatHistory(format = 'txt') {
    const convo = appState.chat.conversations.find(c => c.id === appState.chat.currentConversationId);
    if (!convo || convo.messages.length <= 1) return alert("没有聊天记录可导出。");

    const personaName = appState.chat.personas[convo.personaId].name;
    const conversationTitle = convo.title || '未命名对话';
    const filename = `聊天记录_${conversationTitle}_${personaName}_${new Date().toISOString().slice(0,10)}`;

    if (format === 'txt') {
        let content = `聊天记录 - ${conversationTitle}\n角色: ${personaName}\n时间: ${new Date().toLocaleString()}\n========================\n\n`;
        convo.messages.forEach(msg => { 
            if (msg.role !== 'system') 
                content += `[${msg.role.toUpperCase()}]\n${msg.content}\n\n------------------------\n\n`; 
        });
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${filename}.txt`;
        a.click();
        URL.revokeObjectURL(a.href);
    } else if (format === 'pdf') {
        alert("正在生成PDF，请稍候...");
        
        // 确保jsPDF和html2canvas库已加载
        if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
            alert("PDF库未加载，请刷新页面后重试");
            return;
        }
        
        const { jsPDF } = window.jspdf;
        
        // 创建临时容器用于生成美观的聊天记录
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '0';
        tempContainer.style.width = '800px';
        tempContainer.style.backgroundColor = '#ffffff';
        tempContainer.style.padding = '30px';
        tempContainer.style.fontFamily = 'Arial, sans-serif';
        tempContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.1)';
        
        // 添加标题信息
        const titleDiv = document.createElement('div');
        titleDiv.style.marginBottom = '30px';
        titleDiv.style.textAlign = 'center';
        titleDiv.style.borderBottom = '2px solid #e0e0e0';
        titleDiv.style.paddingBottom = '20px';
        
        const mainTitle = document.createElement('h1');
        mainTitle.style.fontSize = '28px';
        mainTitle.style.margin = '0 0 15px 0';
        mainTitle.style.color = '#333';
        mainTitle.textContent = conversationTitle;
        
        const subtitle = document.createElement('div');
        subtitle.style.fontSize = '16px';
        subtitle.style.color = '#666';
        subtitle.innerHTML = `角色: ${personaName}<br>导出时间: ${new Date().toLocaleString()}`;
        
        titleDiv.appendChild(mainTitle);
        titleDiv.appendChild(subtitle);
        tempContainer.appendChild(titleDiv);
        
        // 添加消息内容
        if (convo) {
            convo.messages.forEach((msg, idx) => {
                if (msg.role !== 'system') {
                    const msgDiv = document.createElement('div');
                    msgDiv.style.marginBottom = '20px';
                    msgDiv.style.padding = '20px';
                    msgDiv.style.borderRadius = '10px';
                    msgDiv.style.backgroundColor = msg.role === 'user' ? '#f8f9fa' : '#e3f2fd';
                    msgDiv.style.borderLeft = `4px solid ${msg.role === 'user' ? '#007bff' : '#2196f3'}`;
                    msgDiv.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                    
                    const roleSpan = document.createElement('div');
                    roleSpan.style.fontWeight = 'bold';
                    roleSpan.style.marginBottom = '10px';
                    roleSpan.style.fontSize = '16px';
                    roleSpan.style.color = msg.role === 'user' ? '#007bff' : '#2196f3';
                    roleSpan.textContent = msg.role === 'user' ? '👤 用户消息' : '🤖 AI回复';
                    
                    const contentDiv = document.createElement('div');
                    contentDiv.style.lineHeight = '1.6';
                    contentDiv.style.fontSize = '14px';
                    contentDiv.style.color = '#333';
                    contentDiv.style.whiteSpace = 'pre-wrap';
                    contentDiv.style.wordWrap = 'break-word';
                    contentDiv.textContent = msg.content; // 使用textContent避免HTML标签
                    
                    msgDiv.appendChild(roleSpan);
                    msgDiv.appendChild(contentDiv);
                    tempContainer.appendChild(msgDiv);
                }
            });
        }
        
        document.body.appendChild(tempContainer);
        
        try {
            // 使用更高分辨率生成图片
            const canvas = await html2canvas(tempContainer, { 
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                scrollX: 0,
                scrollY: 0,
                height: tempContainer.scrollHeight,
                width: tempContainer.scrollWidth,
                logging: false
            });
            
            // 创建PDF
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            const imgWidth = 210; // A4宽度mm
            const pageHeight = 297; // A4高度mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            
            let position = 0;
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            
            // 添加第一页
            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
            
            // 处理多页
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }
            

            
            pdf.save(`${filename}.pdf`);
            
        } catch (e) {
            console.error("PDF导出失败:", e);
            alert("PDF导出失败，请查看控制台获取详细信息");
        } finally {
            document.body.removeChild(tempContainer);
        }
    } else if (format === 'png') {
        alert("正在生成图片，请稍候... 对于很长的聊天记录，这可能需要一些时间。");
        
        // 创建临时容器用于完整截图
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '0';
        tempContainer.style.width = '800px';
        tempContainer.style.backgroundColor = getComputedStyle(chatWindow).backgroundColor;
        tempContainer.style.padding = '20px';
        tempContainer.style.fontFamily = getComputedStyle(chatWindow).fontFamily;
        
        // 添加标题信息
        const titleDiv = document.createElement('div');
        titleDiv.style.marginBottom = '20px';
        titleDiv.style.textAlign = 'center';
        titleDiv.style.borderBottom = '2px solid #ccc';
        titleDiv.style.paddingBottom = '10px';
        
        const mainTitle = document.createElement('h1');
        mainTitle.style.fontSize = '24px';
        mainTitle.style.margin = '0 0 10px 0';
        mainTitle.textContent = conversationTitle;
        
        const subtitle = document.createElement('div');
        subtitle.style.fontSize = '14px';
        subtitle.style.color = '#666';
        subtitle.innerHTML = `角色: ${personaName}<br>时间: ${new Date().toLocaleString()}`;
        
        titleDiv.appendChild(mainTitle);
        titleDiv.appendChild(subtitle);
        tempContainer.appendChild(titleDiv);
        
        // 复制聊天内容到临时容器
        if (convo) {
            convo.messages.forEach((msg, idx) => {
                if (msg.role !== 'system') {
                    const msgDiv = document.createElement('div');
                    msgDiv.style.marginBottom = '15px';
                    msgDiv.style.padding = '15px';
                    msgDiv.style.borderRadius = '8px';
                    msgDiv.style.backgroundColor = msg.role === 'user' ? '#f0f0f0' : '#e8f4f8';
                    msgDiv.style.borderLeft = `4px solid ${msg.role === 'user' ? '#007bff' : '#28a745'}`;
                    
                    const roleSpan = document.createElement('div');
                    roleSpan.style.fontWeight = 'bold';
                    roleSpan.style.marginBottom = '8px';
                    roleSpan.style.color = msg.role === 'user' ? '#007bff' : '#28a745';
                    roleSpan.textContent = msg.role === 'user' ? '用户消息' : 'AI回复';
                    
                    const contentDiv = document.createElement('div');
                    contentDiv.style.lineHeight = '1.6';
                    contentDiv.innerHTML = window.marked ? window.marked.parse(msg.content, { gfm: true, breaks: true }) : msg.content;
                    
                    msgDiv.appendChild(roleSpan);
                    msgDiv.appendChild(contentDiv);
                    tempContainer.appendChild(msgDiv);
                }
            });
        }
        
        document.body.appendChild(tempContainer);
        
        try {
            const canvas = await html2canvas(tempContainer, { 
                scale: 1.5,
                useCORS: true, 
                backgroundColor: getComputedStyle(chatWindow).backgroundColor,
                scrollX: 0,
                scrollY: 0,
                height: tempContainer.scrollHeight,
                width: tempContainer.scrollWidth
            });

            const a = document.createElement('a');
            a.href = canvas.toDataURL('image/png');
            a.download = `${filename}.png`;
            a.click();
        } catch (e) {
            console.error("图片导出失败:", e);
            alert("图片导出失败，请查看控制台获取错误信息。");
        } finally {
            document.body.removeChild(tempContainer);
        }
    }
}

function copyMessage(buttonElement) {
    const contentDiv = buttonElement.closest('.message-body').querySelector('.message-content');
    const originalContent = buttonElement.innerHTML;
    navigator.clipboard.writeText(contentDiv.innerText).then(() => {
        buttonElement.innerHTML = '✓';
        buttonElement.title = '已复制!';
        setTimeout(() => {
            buttonElement.innerHTML = originalContent;
            buttonElement.title = '复制';
        }, 1500);
    }).catch(err => alert('复制失败!'));
}

function addPersona() {
    // 创建一个新的临时角色ID
    const id = `custom-${Date.now()}`;
    // 添加一个新的空角色
    appState.chat.personas[id] = { name: '新角色', system: '', userTemplate: '', isCustom: true };
    savePersonas();
    updatePersonaSelector();
    // 选择新创建的角色
    chatPersonaSelect.value = id;
    // 更新角色编辑器
    updatePersonaEditor();
    // 清空当前编辑区域
    document.getElementById('persona_name_input').value = '新角色';
    document.getElementById('persona_system_input').value = '';
    document.getElementById('persona_template_input').value = '';
    // 聚焦到角色名称输入框
    document.getElementById('persona_name_input').focus();
}

function updatePersonaEditor() {
    const id = chatPersonaSelect.value;
    const persona = appState.chat.personas[id];
    if (!persona) return;

    document.getElementById('persona_name_input').value = persona.name || '';
    document.getElementById('persona_system_input').value = persona.system || '';
    document.getElementById('persona_template_input').value = persona.userTemplate || '';

    // 如果是预设角色，禁用编辑
    const isCustom = persona.isCustom !== undefined ? persona.isCustom : false;
    document.getElementById('persona_name_input').disabled = !isCustom;
    document.getElementById('persona_system_input').disabled = !isCustom;
    document.getElementById('persona_template_input').disabled = !isCustom;
    document.getElementById('chat_save_persona_btn').disabled = !isCustom;
}

// 保存当前角色
function saveCurrentPersona() {
    const id = chatPersonaSelect.value;
    const persona = appState.chat.personas[id];
    if (!persona || !persona.isCustom) {
        alert('不能修改预设角色！');
        return;
    }

    const name = document.getElementById('persona_name_input').value.trim();
    const system = document.getElementById('persona_system_input').value.trim();
    const userTemplate = document.getElementById('persona_template_input').value.trim();

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

function deletePersona() {
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

function toggleManagementMode(forceState) {
    appState.chat.isManagementMode = forceState !== undefined ? forceState : !appState.chat.isManagementMode;
    chatWindow.classList.toggle('chat-window-management-mode', appState.chat.isManagementMode);
    chatManagementBar.style.display = appState.chat.isManagementMode ? 'flex' : 'none';
    chatManageBtn.textContent = appState.chat.isManagementMode ? '退出管理' : '管理消息';
    if (!appState.chat.isManagementMode) {
        chatWindow.querySelectorAll('.message-checkbox').forEach(cb => cb.checked = false);
    }
}

function toggleSelectAllMessages(select) {
    const checkboxes = chatWindow.querySelectorAll('.message-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = select;
    });
}

function deleteSelectedMessages() {
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

function resendMessage(buttonElement) {
    const messageEl = buttonElement.closest('.chat-message');
    const index = parseInt(messageEl.dataset.index, 10);
    const convo = appState.chat.conversations.find(c => c.id === appState.chat.currentConversationId);
    
    if (!convo || isNaN(index) || index < 0 || index >= convo.messages.length) return;
    
    const message = convo.messages[index];
    if (message.role !== 'user') return;
    
    // 获取消息内容并重新发送
    const content = message.content;
    chatInput.value = content;
    chatInput.focus();
    chatInput.dispatchEvent(new Event('input', { bubbles: true }));
}

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

function regenerateMessage(buttonElement) {
    const messageEl = buttonElement.closest('.chat-message');
    const index = parseInt(messageEl.dataset.index, 10);
    const convo = appState.chat.conversations.find(c => c.id === appState.chat.currentConversationId);
    
    if (!convo || isNaN(index) || index < 0 || index >= convo.messages.length) return;
    
    const message = convo.messages[index];
    if (message.role !== 'assistant') return;
    
    // 找到对应的上一条用户消息
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
    
    // 删除AI回复和后续消息
    const messagesToDelete = convo.messages.length - index;
    if (confirm('确定要重新生成这条AI回复吗？后续的AI回复也会被删除。')) {
        convo.messages.splice(index, messagesToDelete);
        convo.lastUpdate = Date.now();
        saveConversations();
        renderCurrentChat();
        
        // 重新发送用户消息
        const userMessage = convo.messages[userMessageIndex];
        chatInput.value = userMessage.content;
        handleStreamChatRequest();
    }
}
