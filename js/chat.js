// js/chat.js (完整最终版)

// 处理文件上传和复用
async function handleChatFileUpload(event, fileFromReuse = null) {
    // 【核心修改】优先使用复用的文件对象，否则从事件中获取
    const file = fileFromReuse || (event.target ? event.target.files[0] : null);
    if (!file) return;

    chatFileStatusArea.style.display = 'flex';
    chatFileStatusArea.innerHTML = `<div class="file-info"><div class="file-processing-spinner"></div><span>正在处理文件: ${file.name}...</span></div>`;
    // 【修改1】不再禁用输入框和发送按钮
    // chatInput.disabled = true;
    // chatSendBtn.disabled = true;
    chatUploadFileBtn.disabled = true;

    // 【新增】添加文件处理状态标志
    appState.chat.fileProcessing = true;

    try {
        let content;
        let fileId;
        let filename;

        if (fileFromReuse) {
            // 如果是复用，我们已经有 fileId 和 filename，只需要获取内容
            fileId = fileFromReuse.id;
            filename = fileFromReuse.name;
            const contentResponse = await apiCall(`/files/${fileId}/content`, undefined, 'GET');
            if (!contentResponse.ok) throw new Error(await contentResponse.text());
            content = await contentResponse.text();
        } else {
            // 如果是新上传，走完整的上传->获取内容流程
            const formData = new FormData();
            formData.append('file', file);
            formData.append('purpose', 'file-extract');
            
            const uploadResult = await apiCall('/files/upload', formData, 'POST');
            fileId = uploadResult.id;
            filename = uploadResult.filename;

            const contentResponse = await apiCall(`/files/${fileId}/content`, undefined, 'GET');
            if (!contentResponse.ok) throw new Error(await contentResponse.text());
            content = await contentResponse.text();
        }

        appState.chat.activeFile = {
            fileId: fileId,
            filename: filename,
            content: content,
        };

        chatFileStatusArea.innerHTML = `
            <div class="file-info">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right: 8px; color: var(--primary-color);"><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/></svg>
                <span>已附加文件:</span>
                <span class="filename" title="${appState.chat.activeFile.filename}">${appState.chat.activeFile.filename}</span>
            </div>
            <button class="file-remove-btn" onclick="removeActiveFile()" title="移除文件">&times;</button>`;
        chatInput.focus();
    } catch (error) {
        alert(`文件处理失败: ${error.message}`);
        removeActiveFile(); 
    } finally {
        // 【修改2】无论成功失败，都更新文件处理状态
        appState.chat.fileProcessing = false;
        // chatInput.disabled = false;
        // chatSendBtn.disabled = false;
        chatUploadFileBtn.disabled = false;
        if (event && event.target) {
            event.target.value = ''; 
        }
    }
}

// ▼▼▼ 用这个新版本替换旧的 removeActiveFile 函数 ▼▼▼
function removeActiveFile() {
    // 【核心修改】不再需要从输入框移除文件内容
    // if (appState.chat.activeFile && appState.chat.activeFile.content) { ... } (删除这部分)

    // 清理状态
    appState.chat.activeFile = null;
    
    // 清理UI
    chatFileStatusArea.style.display = 'none';
    chatFileStatusArea.innerHTML = '';
    
    // 确保字数统计是正确的
    updateCharCount();
}
// ▲▲▲ 替换结束 ▲▲▲

// 辅助函数，用于转义正则表达式中的特殊字符
function escapeRegex(string) {
    if (typeof string !== 'string') return '';
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


// 更新字数统计和输入框高度
function updateCharCount() {
    chatCharCount.textContent = chatInput.value.length;
    chatInput.style.height = 'auto';
    chatInput.style.height = `${Math.min(chatInput.scrollHeight, 300)}px`;
}

function initChat() {
    // 标题编辑功能初始化
    const chatCurrentTitle = document.getElementById('chat_current_title');

    // 1. 点击标题，进入编辑模式
    chatCurrentTitle.addEventListener('click', (e) => {
        // 确保只有在非编辑模式下点击才触发
        if (chatCurrentTitle.contentEditable !== 'true') {
            chatCurrentTitle.contentEditable = 'true';
            chatCurrentTitle.focus();
            // 选中所有文本，方便用户修改
            document.execCommand('selectAll', false, null);
        }
    });

    // 2. 键盘事件：Enter确认, Escape取消
    chatCurrentTitle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // 阻止在 contenteditable 中换行
            chatCurrentTitle.blur(); // 触发 blur 事件来保存和退出
        } else if (e.key === 'Escape') {
            // 恢复到修改前的标题，然后触发 blur 退出
            const convo = appState.chat.conversations.find(c => c.id === appState.chat.currentConversationId);
            if (convo) {
                chatCurrentTitle.textContent = convo.title || '未命名对话';
            }
            chatCurrentTitle.blur();
        }
    });

    // 点击其他地方保存标题 (这段保留，但需要修改)
    document.addEventListener('click', (e) => {
        // ▼▼▼ 核心修改：不再检查按钮，只检查标题元素本身 ▼▼▼
        if (!chatCurrentTitle.contains(e.target)) {
            // 如果点击了标题外部，并且标题当前处于可编辑状态
            if (document.activeElement === chatCurrentTitle) {
                saveTitleChanges();
            }
        }
    });

    // 3. 失焦事件：保存并退出编辑模式
    chatCurrentTitle.addEventListener('blur', () => {
        chatCurrentTitle.contentEditable = 'false'; // 退出编辑模式
        saveTitleChanges(); // 调用保存函数
    });

    // saveTitleChanges 函数需要修改，不再需要处理按钮的显示/隐藏
    function saveTitleChanges() {
        // 1. 从UI获取新标题
        const newTitle = chatCurrentTitle.textContent.trim();
        const convo = appState.chat.conversations.find(c => c.id === appState.chat.currentConversationId);

        if (!convo) return;
        
        // 只有当标题实际发生改变时才执行保存和渲染
        if (convo.title !== newTitle) {
            // 2. 更新应用状态 (appState)
            convo.title = newTitle || '未命名对话'; // 如果用户清空标题，则恢复默认
            convo.lastUpdate = Date.now(); // 更新时间戳，让其排序到最前
            
            // 3. 将更新后的状态持久化
            saveConversations();
            
            // 4. 【核心修复】根据更新后的状态，重新渲染所有相关的UI
            renderChatHistoryList(); 
            
            console.log(`标题已更新为: "${convo.title}"`);
        }
    }

    chatModelSelect.innerHTML = AVAILABLE_MODELS.map(m => `<option value="${m}">${m}</option>`).join('');
    loadPersonas();
    loadConversations();

    // 初始化对话参数模态框
    const chatParamsModal = document.getElementById('chat_params_modal');
    const chatParamsBtn = document.getElementById('chat_params_btn');
    const closeModalBtn = chatParamsModal.querySelector('.close-modal');
    const saveChatParamsBtn = document.getElementById('save_chat_params_btn');

    // 打开模态框
    chatParamsBtn.addEventListener('click', () => {
        chatParamsModal.style.display = 'block';
        setTimeout(() => {
            chatParamsModal.classList.add('show');
        }, 10);
    });

    // 关闭模态框 - 点击关闭按钮
    closeModalBtn.addEventListener('click', () => {
        chatParamsModal.classList.remove('show');
        setTimeout(() => {
            chatParamsModal.style.display = 'none';
        }, 300);
    });

    // 关闭模态框 - 点击模态框外部
    window.addEventListener('click', (event) => {
        if (event.target === chatParamsModal) {
            closeModalBtn.click();
        }
    });

    // 保存设置按钮事件
    saveChatParamsBtn.addEventListener('click', () => {
        closeModalBtn.click();
        alert('对话参数已保存');
    });
    
    // ▼▼▼ 新增：为回形针按钮和隐藏的文件输入框绑定事件 ▼▼▼
    chatUploadFileBtn.addEventListener('click', () => chatFileInput.click());
    chatFileInput.addEventListener('change', handleChatFileUpload);
    // ▲▲▲ 新增结束 ▲▲▲

    // 聊天核心功能事件监听
    chatSendBtn.addEventListener('click', handleStreamChatRequest);
    chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleStreamChatRequest(); }});
    chatInput.addEventListener('input', updateCharCount);
    chatPersonaSelect.addEventListener('change', updateCurrentConversationPersona);
    chatNewBtn.addEventListener('click', () => startNewChat(true));
    chatInputNewBtn.addEventListener('click', () => startNewChat(true));
    
    document.addEventListener('click', (e) => {
        if (e.target.matches('[data-export]')) {
            e.preventDefault();
            exportChatHistory(e.target.dataset.export);
        }
    });

    chatAddPersonaBtn.addEventListener('click', addPersona);
    chatDeletePersonaBtn.addEventListener('click', deletePersona);
    document.getElementById('chat_save_persona_btn').addEventListener('click', saveCurrentPersona);
    chatPersonaSelect.addEventListener('change', updatePersonaEditor);

    chatManageBtn.addEventListener('click', () => toggleManagementMode());
    chatSelectAllBtn.addEventListener('click', () => toggleSelectAllMessages(true));
    chatDeselectAllBtn.addEventListener('click', () => toggleSelectAllMessages(false));
    chatDeleteSelectedBtn.addEventListener('click', deleteSelectedMessages);
    
    // 初始化UI
    updatePersonaEditor();
    updatePersonaSelector();
    renderChatHistoryList();
    if (!appState.chat.currentConversationId || !appState.chat.conversations.find(c => c.id === appState.chat.currentConversationId)) {
        startNewChat(false);
    } else {
        switchConversation(appState.chat.currentConversationId);
    }
}

async function generateConversationTitle(conversation) {
    const nonSystemMessages = conversation.messages.filter(m => m.role !== 'system');
    if (!conversation || conversation.title !== '' || nonSystemMessages.length < 2) {
        return;
    }

    const recentMessages = conversation.messages.slice(-2);
    const contentToSummarize = recentMessages.map(m => `${m.role}: ${m.content}`).join('\n\n');

    const titlePrompt = {
        model: 'glm-4-flash',
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
                const newTitle = newTitleRaw.trim().replace(/["'“”。,]/g, '').replace(/\s/g, '');
                conversation.title = newTitle;
                saveConversations();
                renderChatHistoryList();
                console.log(`AI生成标题成功: "${newTitle}"`);
            }
        }
    } catch (error) {
        console.error("自动生成标题失败:", error.message);
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

function buildMessagesForApi(conversation, contextCount, currentUserPrompt) {
    // 复制一份消息历史，避免修改原始数据
    const messages = JSON.parse(JSON.stringify(conversation.messages));
    
    // 移除最后一条（我们刚刚添加的、不完整的）用户消息
    messages.pop(); 

    // 添加包含完整上下文（用户输入+文件内容）的新用户消息
    messages.push({ role: 'user', content: currentUserPrompt });

    // 筛选出用于发送的上下文消息
    const nonSystemMessages = messages.filter(m => m.role !== 'system');
    const systemMessage = messages.find(m => m.role === 'system');
    
    // 取最后 N*2 条消息作为上下文
    const contextMessages = nonSystemMessages.slice(-(contextCount * 2));

    // 最终要发送的消息数组
    const messagesToSend = [];
    if (systemMessage) {
        messagesToSend.push(systemMessage);
    }
    messagesToSend.push(...contextMessages);

    return messagesToSend;
}

async function handleStreamChatRequest() {
    const message = chatInput.value.trim();
    if (!message) {
        alert('请输入消息内容');
        return;
    }

    // 【新增】检查文件是否正在处理中
    if (appState.chat.fileProcessing) {
        alert('文件正在解析中，请稍候再发送消息');
        return;
    }

    // 准备消息数据
    const messagesToSend = [...currentConversation.messages];
    messagesToSend.push({ role: 'user', content: message });

    // 如果有活动文件，将文件ID和内容添加到用户消息中
    if (appState.chat.activeFile) {
        messagesToSend[messagesToSend.length - 1].content = `文件ID: ${appState.chat.activeFile.fileId}\n文件名: ${appState.chat.activeFile.filename}\n文件内容:\n${appState.chat.activeFile.content}\n\n用户问题: ${message}`;
    }
    const persona = appState.chat.personas[convo.personaId];
    
    // 1. 构建最终发送给模型的完整用户内容 (finalPromptForModel)
    let finalPromptForModel = userInput;
    if (persona.userTemplate && persona.userTemplate.includes('{{INPUT}}') && userInput) {
        finalPromptForModel = persona.userTemplate.replace('{{INPUT}}', userInput);
    }
    
    if (appState.chat.activeFile) {
        // 文件内容附加在最后，作为发送给模型的上下文
        finalPromptForModel += `\n\n--- 参考附加文件: ${appState.chat.activeFile.filename} ---\n${appState.chat.activeFile.content}`;
    }
    
    // 2. 构建显示在UI上的用户消息 (messageForUI)
    // 【核心逻辑修改】这里不再包含文件内容，只显示用户的原始输入
    convo.messages.push({ 
        role: 'user', 
        content: userInput, // 只保存和显示用户的原始输入
        timestamp: Date.now(),
        // 在消息对象中记录附加的文件信息，以便UI可以显示它
        attachedFile: appState.chat.activeFile ? {
            filename: appState.chat.activeFile.filename,
            fileId: appState.chat.activeFile.fileId
        } : null
    });
    convo.lastUpdate = Date.now();
    
    renderCurrentChat();
    renderChatHistoryList();
    saveConversations();
    
    chatInput.value = '';
    updateCharCount();
    // 清理 activeFile，一次发送只用一次
    if (appState.chat.activeFile) {
        removeActiveFile(); 
    }
    
    const assistantMessageId = addMessageToDOM('assistant', '<span class="blinking-cursor">|</span>', convo.messages.length, true);
    const assistantMessageEl = getEl(assistantMessageId);
    const assistantContentEl = assistantMessageEl.querySelector('.message-content');
    const tokenUsageEl = assistantMessageEl.querySelector('.message-token-usage');
    let fullResponse = "";
    let usageInfo = null;

    try {
        const contextCount = parseInt(chatContextCount.value, 10);
        const messagesToSend = buildMessagesForApi(convo, contextCount, finalPromptForModel);
        
        const reader = await apiCall('/stream_chat', { 
            model: chatModelSelect.value, 
            temperature: parseFloat(chatTempInput.value), 
            messages: messagesToSend // 发送构建好的消息
        }, 'POST', true);
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
                } catch(e) { /* 忽略流解析错误 */ }
            }
        }

        assistantContentEl.innerHTML = window.marked.parse(fullResponse, { gfm: true, breaks: true });
        
        const assistantMessageData = { 
            role: 'assistant', 
            content: fullResponse, 
            timestamp: Date.now() 
        };
        if (usageInfo) {
            assistantMessageData.usage = usageInfo;
            if (tokenUsageEl) tokenUsageEl.textContent = `Tokens: ${usageInfo.total_tokens}`;
        }
        convo.messages.push(assistantMessageData);
        assistantMessageEl.dataset.index = convo.messages.length - 1;
        assistantMessageEl.querySelector('.message-footer').style.opacity = '1';
        saveConversations();
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

function renderCurrentChat() {
    const convo = appState.chat.conversations.find(c => c.id === appState.chat.currentConversationId);
    chatWindow.innerHTML = '';
    if (!convo) return;
    
    if (appState.chat.personas[convo.personaId]) {
        chatPersonaSelect.value = convo.personaId;
    }
    
    const currentTitleEl = getEl('chat_current_title');
    if (currentTitleEl) {
        currentTitleEl.textContent = convo.title || '未命名对话';
    }
    
    convo.messages.forEach((msg, index) => {
        if (msg.role !== 'system') {
            // ▼▼▼ 核心修正：确保总是传递第7个参数 msg ▼▼▼
            addMessageToDOM(msg.role, msg.content, index, false, msg.usage, msg.timestamp, msg);
        }
    });
    
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// ▼▼▼ 核心修正：确保函数签名包含第7个参数 `msg = null` ▼▼▼
// 这使得函数能够健壮地处理来自不同地方的调用
function addMessageToDOM(role, content, index, isStreaming = false, usage = null, timestamp = null, msg = null) {
    const messageId = `msg-${Date.now()}-${Math.random()}`;
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role}-message`;
    messageDiv.id = messageId;
    if (index !== undefined) messageDiv.dataset.index = index;

    // ▼▼▼ FIX START: 正确显示附件标记 ▼▼▼
    let attachmentHtml = '';
    const attachedFile = msg ? msg.attachedFile : null; // 从消息对象获取
    if (role === 'user' && attachedFile && attachedFile.filename) {
        attachmentHtml = `
            <div class="message-attachment-indicator" title="文件ID: ${attachedFile.fileId || 'N/A'}">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M4.5 3a2.5 2.5 0 0 1 5 0v9a1.5 1.5 0 0 1-3 0V5a.5.5 0 0 1 1 0v7a.5.5 0 0 0 1 0V3a1.5 1.5 0 1 0-3 0v9a2.5 2.5 0 0 0 5 0V5a.5.5 0 0 1 1 0v7a3.5 3.5 0 1 1-7 0V3z"/></svg>
                <span>${attachedFile.filename}</span>
            </div>
        `;
    }
    // ▲▲▲ FIX END ▲▲▲

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
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return messageId;
}

function startNewChat(fromUserClick = false) {
    removeActiveFile(); 
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
    removeActiveFile();
    appState.chat.currentConversationId = id;
    localStorage.setItem('currentConversationId', id);
    renderCurrentChat();
    renderChatHistoryList();
    toggleManagementMode(false);
    updatePersonaEditor(); 
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
