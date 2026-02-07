// js/modules/chat/chat-core.js
// Main chat initialization and coordination

/**
 * Initialize chat functionality
 * This is the main entry point for the chat module
 */
function initChat() {
    // Get all DOM elements first
    const chatCurrentTitle = document.getElementById('chat_current_title');
    const chatSendBtn = document.getElementById('chat_send_btn');
    const chatInput = document.getElementById('chat_input');
    const chatPersonaSelect = document.getElementById('chat_persona_select');
    const chatNewBtn = document.getElementById('chat_new_btn');
    const chatInputNewBtn = document.getElementById('chat_input_new_btn');
    const chatSearchBtn = document.getElementById('chat_search_btn');
    const chatAddPersonaBtn = document.getElementById('chat_add_persona_btn');
    const chatDeletePersonaBtn = document.getElementById('chat_delete_persona_btn');
    const chatParamsModal = document.getElementById('chat_params_modal');
    const chatParamsBtn = document.getElementById('chat_params_btn');
    const closeModalBtn = chatParamsModal ? chatParamsModal.querySelector('.close-modal') : null;
    const saveChatParamsBtn = document.getElementById('save_chat_params_btn');
    
    // Message management elements
    const chatManageBtn = document.getElementById('chat_manage_btn');
    const chatSelectAllBtn = document.getElementById('chat_select_all_btn');
    const chatDeselectAllBtn = document.getElementById('chat_deselect_all_btn');
    const chatDeleteSelectedBtn = document.getElementById('chat_delete_selected_btn');
    
    // Chat window and other elements
    const chatWindow = document.getElementById('chat_window');
    const chatModelSelect = document.getElementById('chat_model_select');
    const chatTempInput = document.getElementById('chat_temperature');
    const chatContextCount = document.getElementById('chat_context_count');
    
    // Check if essential elements exist
    if (!chatCurrentTitle || !chatSendBtn || !chatInput || !chatWindow) {
        console.error('Essential chat elements not found');
        return;
    }

    // Title editing functionality

    // Click title to edit
    chatCurrentTitle.addEventListener('click', (e) => {
        if (chatCurrentTitle.contentEditable !== 'true') {
            chatCurrentTitle.contentEditable = 'true';
            chatCurrentTitle.focus();
            document.execCommand('selectAll', false, null);
        }
    });

    // Keyboard events: Enter to confirm, Escape to cancel
    chatCurrentTitle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            chatCurrentTitle.blur();
        } else if (e.key === 'Escape') {
            const convo = appState.chat.conversations.find(c => c.id === appState.chat.currentConversationId);
            if (convo) {
                chatCurrentTitle.textContent = convo.title || '未命名对话';
            }
            chatCurrentTitle.blur();
        }
    });

    // Click outside to save
    document.addEventListener('click', (e) => {
        if (!chatCurrentTitle.contains(e.target)) {
            if (document.activeElement === chatCurrentTitle) {
                saveTitleChanges();
            }
        }
    });

    // Blur to save
    chatCurrentTitle.addEventListener('blur', () => {
        chatCurrentTitle.contentEditable = 'false';
        saveTitleChanges();
    });

    function saveTitleChanges() {
        const newTitle = chatCurrentTitle.textContent.trim();
        const convo = appState.chat.conversations.find(c => c.id === appState.chat.currentConversationId);

        if (!convo) return;
        
        if (convo.title !== newTitle) {
            convo.title = newTitle || '未命名对话';
            convo.lastUpdate = Date.now();
            saveConversations();
            renderChatHistoryList();
            console.log(`标题已更新为: "${convo.title}"`);
        }
    }

    // Load personas and conversations
    loadPersonas();
    loadConversations();
    cleanupFileCache();

    // Initialize chat params modal
    if (chatParamsModal && chatParamsBtn && closeModalBtn) {
        chatParamsBtn.addEventListener('click', () => {
            // 强制重排确保样式正确应用
            chatParamsModal.style.display = 'block';
            void chatParamsModal.offsetHeight;
            chatParamsModal.classList.add('show');
        });

        closeModalBtn.addEventListener('click', () => {
            chatParamsModal.classList.remove('show');
            setTimeout(() => {
                chatParamsModal.style.display = 'none';
            }, 200);
        });

        window.addEventListener('click', (event) => {
            if (event.target === chatParamsModal) {
                closeModalBtn.click();
            }
        });
    }

    if (saveChatParamsBtn) {
        saveChatParamsBtn.addEventListener('click', () => {
            if (closeModalBtn) closeModalBtn.click();
            alert('对话参数已保存');
        });
    }
    
    // File upload events - already defined at top
    const chatUploadFileBtn = document.getElementById('chat_upload_file_btn');
    const chatFileInput = document.getElementById('chat_file_input');
    
    if (chatUploadFileBtn && chatFileInput) {
        chatUploadFileBtn.addEventListener('click', () => chatFileInput.click());
        chatFileInput.addEventListener('change', handleChatFileUpload);
    }
    
    // Service selector events
    const parserServiceSelect = document.getElementById('chat_parser_service_select');
    if (parserServiceSelect) {
        parserServiceSelect.addEventListener('change', updateParserServiceDescription);
    }
    
    const parserServiceInfoBtn = document.getElementById('chat_parser_service_info_btn');
    if (parserServiceInfoBtn) {
        parserServiceInfoBtn.addEventListener('click', showParserServiceInfo);
    }

    // Chat core events
    if (chatSendBtn) {
        chatSendBtn.addEventListener('click', handleStreamChatRequest);
    }
    if (chatInput) {
        chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleStreamChatRequest(); }});
        chatInput.addEventListener('input', updateCharCount);
    }
    if (chatPersonaSelect) {
        chatPersonaSelect.addEventListener('change', updateCurrentConversationPersona);
    }
    if (chatNewBtn) {
        chatNewBtn.addEventListener('click', () => startNewChat(true));
    }
    if (chatInputNewBtn) {
        chatInputNewBtn.addEventListener('click', () => startNewChat(true));
    }
    
    // Search functionality
    if (chatSearchBtn) {
        chatSearchBtn.addEventListener('click', handleSearch);
    }
    
    // Export functionality
    document.addEventListener('click', (e) => {
        if (e.target.matches('[data-export]')) {
            e.preventDefault();
            exportChatHistory(e.target.dataset.export);
        }
    });

    // Persona management
    if (chatAddPersonaBtn) {
        chatAddPersonaBtn.addEventListener('click', addPersona);
    }
    if (chatDeletePersonaBtn) {
        chatDeletePersonaBtn.addEventListener('click', deletePersona);
    }
    const chatSavePersonaBtn = document.getElementById('chat_save_persona_btn');
    if (chatSavePersonaBtn) {
        chatSavePersonaBtn.addEventListener('click', saveCurrentPersona);
    }
    if (chatPersonaSelect) {
        chatPersonaSelect.addEventListener('change', updatePersonaEditor);
    }

    // Message management
    if (chatManageBtn) {
        chatManageBtn.addEventListener('click', () => toggleManagementMode());
    }
    if (chatSelectAllBtn) {
        chatSelectAllBtn.addEventListener('click', () => toggleSelectAllMessages(true));
    }
    if (chatDeselectAllBtn) {
        chatDeselectAllBtn.addEventListener('click', () => toggleSelectAllMessages(false));
    }
    if (chatDeleteSelectedBtn) {
        chatDeleteSelectedBtn.addEventListener('click', deleteSelectedMessages);
    }
    
    // Initialize UI
    updatePersonaEditor();
    updatePersonaSelector();
    renderChatHistoryList();
    if (!appState.chat.currentConversationId || !appState.chat.conversations.find(c => c.id === appState.chat.currentConversationId)) {
        startNewChat(false);
    } else {
        switchConversation(appState.chat.currentConversationId);
    }
}

/**
 * Build messages for API call
 * @param {Object} conversation - Conversation object
 * @param {number} contextCount - Number of context messages
 * @param {string} currentUserPrompt - Current user prompt
 * @returns {Array} Messages array for API
 */
function buildMessagesForApi(conversation, contextCount, currentUserPrompt) {
    const messages = JSON.parse(JSON.stringify(conversation.messages));
    messages.pop(); 
    messages.push({ role: 'user', content: currentUserPrompt });

    const nonSystemMessages = messages.filter(m => m.role !== 'system');
    const systemMessage = messages.find(m => m.role === 'system');
    
    const contextMessages = nonSystemMessages.slice(-(contextCount * 2));

    const messagesToSend = [];
    if (systemMessage) {
        messagesToSend.push(systemMessage);
    }
    messagesToSend.push(...contextMessages);

    return messagesToSend;
}

/**
 * Handle streaming chat request
 * Main function for sending chat messages and receiving streaming responses
 */
async function handleStreamChatRequest() {
    // Get DOM elements
    const chatInput = document.getElementById('chat_input');
    const chatSendBtn = document.getElementById('chat_send_btn');
    const chatWindow = document.getElementById('chat_window');
    const chatModelSelect = document.getElementById('chat_model_select');
    const chatTempInput = document.getElementById('chat_temperature');
    const chatContextCount = document.getElementById('chat_context_count');
    
    if (!chatInput || !chatSendBtn || !chatWindow) {
        console.error('Essential chat elements not found in handleStreamChatRequest');
        return;
    }
    
    const message = chatInput.value.trim();
    if (!message) {
        alert('请输入消息内容');
        return;
    }

    if (appState.chat.fileProcessing) {
        alert('文件正在解析中，请稍候再发送消息');
        return;
    }

    const convo = appState.chat.conversations.find(c => c.id === appState.chat.currentConversationId);
    if (!convo) return;

    const persona = appState.chat.personas[convo.personaId];
    
    // Build final prompt for model
    let finalPromptForModel = message;
    if (persona.userTemplate && persona.userTemplate.includes('{{INPUT}}') && message) {
        finalPromptForModel = persona.userTemplate.replace('{{INPUT}}', message);
    }
    
    if (appState.chat.activeFile) {
        finalPromptForModel += `\n\n--- 参考附加文件: ${appState.chat.activeFile.filename} ---\n${appState.chat.activeFile.content}`;
    }
    
    if (appState.chat.searchMode.enabled) {
        const searchConfig = appState.chat.searchMode;
        finalPromptForModel += `\n\n--- 搜索配置 ---\n您可以根据需要调用网络搜索API获取最新信息。搜索配置如下：\n搜索引擎: ${searchConfig.searchEngine}\n结果数量: ${searchConfig.count}\n内容长度: ${searchConfig.contentSize}`;
    }
    
    // Save user message to conversation
    convo.messages.push({ 
        role: 'user', 
        content: message,
        timestamp: Date.now(),
        attachedFile: appState.chat.activeFile ? {
            filename: appState.chat.activeFile.filename,
            taskId: appState.chat.activeFile.taskId,
            toolType: appState.chat.activeFile.toolType || 'lite'
        } : null
    });
    convo.lastUpdate = Date.now();
    
    renderCurrentChat();
    renderChatHistoryList();
    saveConversations();
    
    chatInput.value = '';
    updateCharCount();
    if (appState.chat.activeFile) {
        removeActiveFile(); 
    }
    
    const assistantMessageId = addMessageToDOM('assistant', '<span class="blinking-cursor">|</span>', convo.messages.length, true);
    const assistantMessageEl = getEl(assistantMessageId);
    const assistantContentEl = assistantMessageEl.querySelector('.message-content');
    const tokenUsageEl = assistantMessageEl.querySelector('.message-token-usage');
    let fullResponse = "";
    let usageInfo = null;
    let searchResults = null;
    let isSearching = false;
    let contentStarted = false;

    try {
        const contextCount = parseInt(chatContextCount.value, 10);
        const messagesToSend = buildMessagesForApi(convo, contextCount, finalPromptForModel);
        
        const requestPayload = { 
            model: chatModelSelect.value, 
            temperature: parseFloat(chatTempInput.value), 
            messages: messagesToSend
        };
        
        console.log('🔍 [联网搜索] 准备发送请求，当前搜索模式状态:', {
            enabled: appState.chat.searchMode.enabled,
            searchEngine: appState.chat.searchMode.searchEngine,
            count: appState.chat.searchMode.count,
            contentSize: appState.chat.searchMode.contentSize
        });
        
        if (appState.chat.searchMode.enabled) {
            requestPayload.enable_web_search = true;
            requestPayload.search_engine = appState.chat.searchMode.searchEngine;
            requestPayload.search_count = appState.chat.searchMode.count;
            requestPayload.content_size = appState.chat.searchMode.contentSize;
            requestPayload.search_prompt = "你是一个专业的AI助手。请基于网络搜索结果{search_result}回答用户问题，并在回答中引用来源链接。确保信息准确、及时，并标注信息来源。";
            
            console.log('🔍 [联网搜索] 已启用！请求参数:', requestPayload);
            
            isSearching = true;
            assistantContentEl.innerHTML = `
                <div class="search-progress">
                    <div class="search-spinner"></div>
                    <span>正在联网搜索相关信息...</span>
                </div>
            `;
        } else {
            console.log('🔍 [联网搜索] 未启用，使用普通对话模式');
        }
        
        const reader = await apiCall('/stream_chat', requestPayload, 'POST', true);
        const decoder = new TextDecoder();
        let buffer = '';
        
        while (true) {
            const { value, done } = await reader.read();
            if (value) {
                buffer += decoder.decode(value, { stream: !done });
            }
            if (done) break;
            
            let lines = buffer.split('\n\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.substring(6);
                if (data === '[DONE]') continue;
                
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) throw new Error(parsed.error.message || JSON.stringify(parsed.error));
                    if (parsed.usage) usageInfo = parsed.usage;
                    
                    // Check for tool calls (search results)
                    const toolCalls = parsed.choices[0]?.delta?.tool_calls;
                    if (toolCalls && toolCalls.length > 0) {
                        toolCalls.forEach((toolCall) => {
                            if (toolCall.type === 'web_search' && toolCall.web_search?.outputs) {
                                searchResults = toolCall.web_search.outputs;
                                console.log('🔍 [联网搜索] 成功获取搜索结果，共', searchResults.length, '条');
                                
                                assistantContentEl.innerHTML = `
                                    <div class="search-complete">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                                        </svg>
                                        <span>已找到 ${searchResults.length} 条相关信息，正在生成回答...</span>
                                    </div>
                                    <span class="blinking-cursor">|</span>
                                `;
                            }
                        });
                    }
                    
                    const delta = parsed.choices[0]?.delta?.content || "";
                    if (delta) {
                        if (!contentStarted) {
                            contentStarted = true;
                            isSearching = false;
                            assistantContentEl.innerHTML = '';
                            fullResponse = '';
                        }
                        
                        fullResponse += delta;
                        assistantContentEl.innerHTML = window.marked.parse(fullResponse + '<span class="blinking-cursor">|</span>', { gfm: true, breaks: true });
                        chatWindow.scrollTop = chatWindow.scrollHeight;
                    }
                } catch(e) { /* Ignore stream parsing errors */ }
            }
        }
        
        // Process last incomplete line
        if (buffer.startsWith('data: ')) {
            const data = buffer.substring(6);
            if (data !== '[DONE]') {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) throw new Error(parsed.error.message || JSON.stringify(parsed.error));
                    if (parsed.usage) usageInfo = parsed.usage;
                    
                    const delta = parsed.choices[0]?.delta?.content || "";
                    if (delta) {
                        if (!contentStarted) {
                            contentStarted = true;
                            isSearching = false;
                            assistantContentEl.innerHTML = '';
                            fullResponse = '';
                        }
                        fullResponse += delta;
                    }
                } catch(e) { /* Ignore */ }
            }
        }

        assistantContentEl.innerHTML = window.marked.parse(fullResponse, { gfm: true, breaks: true });
        
        // Add search sources if available
        if (searchResults && searchResults.length > 0) {
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
                            <a href="${result.link}" target="_blank" rel="noopener noreferrer" class="source-link">
                                ${result.title}
                            </a>
                            ${result.media ? `<span class="source-media">${result.media}</span>` : ''}
                            ${result.publish_date ? `<span class="source-date">${result.publish_date}</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
            assistantContentEl.appendChild(sourcesDiv);
        }
        
        // Add AI disclaimer
        const disclaimer = createAIDisclaimer('inline');
        assistantContentEl.appendChild(disclaimer);
        
        const assistantMessageData = { 
            role: 'assistant', 
            content: fullResponse, 
            timestamp: Date.now(),
            searchResults: searchResults
        };
        if (usageInfo) {
            assistantMessageData.usage = usageInfo;
            if (tokenUsageEl) tokenUsageEl.textContent = `Tokens: ${usageInfo.total_tokens}`;
        }
        convo.messages.push(assistantMessageData);
        assistantMessageEl.dataset.index = convo.messages.length - 1;
        assistantMessageEl.querySelector('.message-footer').style.opacity = '1';
        saveConversations();
        
        setTimeout(() => generateConversationTitle(convo), 3000);

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
