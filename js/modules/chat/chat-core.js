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
            chatParamsModal.style.display = 'flex';
            setTimeout(() => {
                chatParamsModal.classList.add('show');
            }, 10);
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
    const chatStopBtn = document.getElementById('chat_stop_btn');
    if (chatSendBtn) {
        chatSendBtn.addEventListener('click', handleStreamChatRequest);
    }
    if (chatStopBtn) {
        chatStopBtn.addEventListener('click', stopStreamChat);
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
    
    // Thinking mode functionality
    const chatThinkingBtn = document.getElementById('chat_thinking_btn');
    if (chatThinkingBtn) {
        chatThinkingBtn.addEventListener('click', toggleThinkingMode);
    }
    
    // Model change listener for thinking button visibility
    if (chatModelSelect) {
        chatModelSelect.addEventListener('change', updateThinkingButtonVisibility);
    }
    
    // Provider change listener
    window.addEventListener('providerChanged', () => {
        setTimeout(updateThinkingButtonVisibility, 150);
        setTimeout(updateFileUploadButtonState, 150);
        setTimeout(updateSearchButtonState, 150);
    });
    
    // Models config loaded listener
    window.addEventListener('modelsConfigLoaded', () => {
        setTimeout(updateThinkingButtonVisibility, 150);
        setTimeout(updateFileUploadButtonState, 150);
    });
    
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
    
    // Persona indicator click event
    const personaIndicator = document.getElementById('chat_persona_indicator');
    if (personaIndicator && chatParamsBtn) {
        personaIndicator.addEventListener('click', () => {
            chatParamsBtn.click();
        });
    }
    
    // Initialize UI
    updatePersonaEditor();
    updatePersonaSelector();
    updatePersonaIndicator();
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

    // 调试日志：检查最后一条用户消息的内容长度
    const lastUserMessage = messagesToSend[messagesToSend.length - 1];
    if (lastUserMessage && lastUserMessage.role === 'user') {
        console.log(`[Chat] buildMessagesForApi - 最后一条用户消息长度: ${lastUserMessage.content?.length || 0}`);
    }

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
    const chatStopBtn = document.getElementById('chat_stop_btn');
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
    
    // 重置终止标志
    appState.chat.stopStreaming = false;

    const persona = appState.chat.personas[convo.personaId];
    
    // Build final prompt for model
    let finalPromptForModel = message;
    if (persona.userTemplate && persona.userTemplate.includes('{{INPUT}}') && message) {
        finalPromptForModel = persona.userTemplate.replace('{{INPUT}}', message);
    }
    
    if (appState.chat.activeFile) {
        finalPromptForModel += `\n\n--- 参考附加文件: ${appState.chat.activeFile.filename} ---\n${appState.chat.activeFile.content}`;
        console.log(`[Chat] 文件已附加到提示词: ${appState.chat.activeFile.filename}, 内容长度: ${appState.chat.activeFile.content?.length || 0}`);
        console.log(`[Chat] 最终提示词总长度: ${finalPromptForModel.length}`);
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
    
    // 显示停止按钮，隐藏发送按钮
    if (chatStopBtn) chatStopBtn.style.display = 'inline-block';
    if (chatSendBtn) chatSendBtn.style.display = 'none';
    
    const assistantMessageId = addMessageToDOM('assistant', '<span class="blinking-cursor">|</span>', convo.messages.length, true);
    const assistantMessageEl = getEl(assistantMessageId);
    const assistantContentEl = assistantMessageEl.querySelector('.message-content');
    const tokenUsageEl = assistantMessageEl.querySelector('.message-token-usage');
    let fullResponse = "";
    let fullReasoning = "";
    let usageInfo = null;
    let webSearchResults = null;
    let isSearching = false;
    let contentStarted = false;
    let reasoningStarted = false;
    let isThinkingMode = false;

    // 检测用户是否手动滚动的标志
    let userScrolled = false;
    const handleUserScroll = () => {
        const isAtBottom = chatWindow.scrollHeight - chatWindow.scrollTop - chatWindow.clientHeight < 50;
        userScrolled = !isAtBottom;
    };
    chatWindow.addEventListener('scroll', handleUserScroll, { passive: true });

    try {
        const contextCount = parseInt(chatContextCount.value, 10);
        const messagesToSend = buildMessagesForApi(convo, contextCount, finalPromptForModel);

        const requestPayload = {
            model: chatModelSelect.value,
            temperature: parseFloat(chatTempInput.value),
            messages: messagesToSend
        };

        const lastMessage = messagesToSend[messagesToSend.length - 1];
        console.log(`[Chat] 发送请求 - 模型: ${requestPayload.model}, 消息数量: ${messagesToSend.length}`);
        console.log(`[Chat] 最后一条消息角色: ${lastMessage?.role}, 内容长度: ${lastMessage?.content?.length || 0}`);

        const model = chatModelSelect.value;
        const provider = appState.provider || 'zhipu';
        
        if (window.shouldEnableThinking && window.shouldEnableThinking(model, provider)) {
            requestPayload.enable_thinking = true;
            if (appState.chat.thinkingMode.budget) {
                requestPayload.thinking_budget = appState.chat.thinkingMode.budget;
            }
            isThinkingMode = true;
            console.log(`🧠 [深度思考] 已启用！模型: ${model}`);
        }

        const conversationSearchMode = getCurrentConversationSearchMode();

        console.log('🔍 [联网搜索] 准备发送请求，当前搜索模式状态:', {
            conversationId: appState.chat.currentConversationId,
            enabled: conversationSearchMode.enabled,
            searchEngine: conversationSearchMode.searchEngine,
            count: conversationSearchMode.count,
            contentSize: conversationSearchMode.contentSize
        });

        if (conversationSearchMode.enabled) {
            requestPayload.enable_web_search = true;
            requestPayload.search_engine = conversationSearchMode.searchEngine;
            requestPayload.search_count = conversationSearchMode.count;
            requestPayload.content_size = conversationSearchMode.contentSize;
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
        let lastChunkTime = Date.now();
        const CHUNK_TIMEOUT = 60000; // 60秒没有收到数据则认为超时

        while (true) {
            // 检查是否被终止
            if (appState.chat.stopStreaming) {
                console.log('🛑 流式输出被用户终止');
                break;
            }

            // 检查是否超时（长时间没有收到数据）
            if (Date.now() - lastChunkTime > CHUNK_TIMEOUT) {
                console.error('⏱️ 流式输出超时：超过60秒没有收到数据');
                assistantContentEl.innerHTML += '<div style="color: #f59e0b; margin-top: 10px;">[系统提示：响应超时，输出可能不完整]</div>';
                break;
            }

            try {
                const { value, done } = await Promise.race([
                    reader.read(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Read timeout')), CHUNK_TIMEOUT)
                    )
                ]);

                if (value) {
                    lastChunkTime = Date.now(); // 更新最后收到数据的时间
                    buffer += decoder.decode(value, { stream: !done });
                }
                if (done) break;
            } catch (readError) {
                if (readError.message === 'Read timeout') {
                    console.error('⏱️ 流式读取超时');
                    assistantContentEl.innerHTML += '<div style="color: #f59e0b; margin-top: 10px;">[系统提示：读取响应超时，输出可能不完整]</div>';
                } else {
                    console.error('❌ 流式读取错误:', readError);
                    assistantContentEl.innerHTML += '<div style="color: #ef4444; margin-top: 10px;">[错误：读取响应失败]</div>';
                }
                break;
            }
            
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

                    if (parsed.web_search && parsed.web_search.length > 0) {
                        webSearchResults = parsed.web_search;
                        console.log('🔍 [联网搜索] 获取到搜索结果，共', webSearchResults.length, '条');
                    }

                    const delta = parsed.choices[0]?.delta;
                    
                    if (delta?.reasoning_content) {
                        if (!reasoningStarted) {
                            reasoningStarted = true;
                            assistantContentEl.innerHTML = `
                                <div class="thinking-container">
                                    <div class="thinking-header" onclick="toggleThinkingContent(this)">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                                            <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
                                        </svg>
                                        <span class="thinking-title">深度思考中...</span>
                                        <span class="thinking-toggle-icon">▼</span>
                                    </div>
                                    <div class="thinking-content">
                                        <span class="thinking-text"></span>
                                        <span class="blinking-cursor">|</span>
                                    </div>
                                </div>
                            `;
                        }
                        
                        fullReasoning += delta.reasoning_content;
                        const thinkingText = assistantContentEl.querySelector('.thinking-text');
                        if (thinkingText) {
                            thinkingText.textContent = fullReasoning;
                        }
                        
                        if (!userScrolled) {
                            chatWindow.scrollTop = chatWindow.scrollHeight;
                        }
                    }

                    if (delta?.content) {
                        if (!contentStarted) {
                            contentStarted = true;
                            isSearching = false;
                            
                            if (reasoningStarted) {
                                const thinkingContainer = assistantContentEl.querySelector('.thinking-container');
                                if (thinkingContainer) {
                                    const thinkingTitle = thinkingContainer.querySelector('.thinking-title');
                                    const thinkingToggleIcon = thinkingContainer.querySelector('.thinking-toggle-icon');
                                    if (thinkingTitle) thinkingTitle.textContent = '深度思考完成';
                                    if (thinkingToggleIcon) thinkingToggleIcon.textContent = '▶';
                                    
                                    const thinkingContent = thinkingContainer.querySelector('.thinking-content');
                                    if (thinkingContent) thinkingContent.style.display = 'none';
                                }
                                
                                const responseDiv = document.createElement('div');
                                responseDiv.className = 'response-content';
                                responseDiv.innerHTML = '<span class="blinking-cursor">|</span>';
                                assistantContentEl.appendChild(responseDiv);
                            } else {
                                assistantContentEl.innerHTML = '<span class="blinking-cursor">|</span>';
                            }
                            fullResponse = '';
                            console.log('🧠 [深度思考] 思考阶段完成，开始接收回答内容');
                        }

                        fullResponse += delta.content;
                        
                        let targetEl;
                        if (reasoningStarted) {
                            targetEl = assistantContentEl.querySelector('.response-content');
                        } else {
                            targetEl = assistantContentEl;
                        }
                        
                        if (targetEl) {
                            targetEl.innerHTML = window.marked.parse(fullResponse + '<span class="blinking-cursor">|</span>', { gfm: true, breaks: true });
                        }
                        
                        if (!userScrolled) {
                            chatWindow.scrollTop = chatWindow.scrollHeight;
                        }
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
                    
                    const delta = parsed.choices[0]?.delta;
                    if (delta?.reasoning_content) {
                        fullReasoning += delta.reasoning_content;
                    }
                    if (delta?.content) {
                        if (!contentStarted) {
                            contentStarted = true;
                            isSearching = false;
                            if (!reasoningStarted) {
                                assistantContentEl.innerHTML = '';
                            }
                            fullResponse = '';
                        }
                        fullResponse += delta.content;
                    }
                } catch(e) { /* Ignore */ }
            }
        }

        let renderedContent = window.marked.parse(fullResponse, { gfm: true, breaks: true });

        if (webSearchResults && webSearchResults.length > 0) {
            webSearchResults.forEach((result, index) => {
                const refNumber = index + 1;
                const refPattern = new RegExp(`\\[ref_${refNumber}\\]`, 'g');
                const refLink = `<a href="${result.link}" target="_blank" rel="noopener noreferrer" class="ref-link" title="${result.title}">[${refNumber}]</a>`;
                renderedContent = renderedContent.replace(refPattern, refLink);
            });
        }

        if (reasoningStarted && fullReasoning) {
            assistantContentEl.innerHTML = `
                <div class="thinking-container">
                    <div class="thinking-header" onclick="toggleThinkingContent(this)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                            <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
                        </svg>
                        <span class="thinking-title">深度思考完成</span>
                        <span class="thinking-toggle-icon">▶</span>
                    </div>
                    <div class="thinking-content" style="display: none;">
                        <div class="thinking-text">${fullReasoning}</div>
                    </div>
                </div>
                <div class="response-content">${renderedContent}</div>
            `;
        } else {
            assistantContentEl.innerHTML = renderedContent;
        }

        // 添加搜索来源（如果有）
        if (webSearchResults && webSearchResults.length > 0) {
            const sourcesDiv = document.createElement('div');
            sourcesDiv.className = 'search-sources';
            sourcesDiv.innerHTML = `
                <div class="sources-header">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                    </svg>
                    <span>搜索来源 (${webSearchResults.length})</span>
                </div>
                <div class="sources-list">
                    ${webSearchResults.map((result, index) => `
                        <div class="source-item">
                            <span class="source-number">[${index + 1}]</span>
                            <a href="${result.link}" target="_blank" rel="noopener noreferrer" class="source-link" title="${result.media || ''}">
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
            webSearchEnabled: conversationSearchMode.enabled,
            webSearchResults: webSearchResults,
            thinkingEnabled: isThinkingMode,
            reasoningContent: fullReasoning || null
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

        // 移除滚动事件监听器
        chatWindow.removeEventListener('scroll', handleUserScroll);

    } catch (error) {
        assistantContentEl.innerHTML = `<div class="info error">请求失败: ${error.message}</div>`;
        convo.messages.push({ role: 'assistant', content: `[ERROR] ${error.message}` });
        assistantMessageEl.dataset.index = convo.messages.length - 1;
        assistantMessageEl.querySelector('.message-footer').style.opacity = '1';
        saveConversations();
        // 确保在错误时也移除监听器
        chatWindow.removeEventListener('scroll', handleUserScroll);
    } finally {
        chatSendBtn.disabled = false;
        chatInput.disabled = false;
        chatInput.focus();
        
        // 恢复按钮状态
        if (chatStopBtn) chatStopBtn.style.display = 'none';
        if (chatSendBtn) chatSendBtn.style.display = 'inline-block';
        
        // 重置终止标志
        appState.chat.stopStreaming = false;
    }
}

/**
 * Stop streaming chat output
 */
function stopStreamChat() {
    if (appState.chat) {
        appState.chat.stopStreaming = true;
        console.log('🛑 用户点击终止按钮');
    }
}

function toggleThinkingMode() {
    const chatThinkingBtn = document.getElementById('chat_thinking_btn');
    const chatModelSelect = document.getElementById('chat_model_select');
    
    if (!chatThinkingBtn || !chatModelSelect) return;
    
    const model = chatModelSelect.value;
    
    if (window.isThinkingOnlyModel && window.isThinkingOnlyModel(model)) {
        console.log('🧠 当前模型为仅思考模式，无法关闭');
        return;
    }
    
    appState.chat.thinkingMode.enabled = !appState.chat.thinkingMode.enabled;
    
    updateThinkingButtonState();
    
    console.log(`🧠 深度思考模式: ${appState.chat.thinkingMode.enabled ? '已开启' : '已关闭'}`);
}

function updateThinkingButtonVisibility() {
    const chatThinkingBtn = document.getElementById('chat_thinking_btn');
    const chatModelSelect = document.getElementById('chat_model_select');
    
    if (!chatThinkingBtn || !chatModelSelect) return;
    
    const model = chatModelSelect.value;
    const provider = appState.provider || 'zhipu';
    
    if (window.supportsThinkingMode && window.supportsThinkingMode(model, provider)) {
        chatThinkingBtn.style.display = 'inline-flex';
        updateThinkingButtonState();
    } else {
        chatThinkingBtn.style.display = 'none';
    }
    
    console.log(`🧠 思考按钮可见性更新: model=${model}, provider=${provider}, visible=${chatThinkingBtn.style.display !== 'none'}`);
}

function updateThinkingButtonState() {
    const chatThinkingBtn = document.getElementById('chat_thinking_btn');
    const chatModelSelect = document.getElementById('chat_model_select');
    
    if (!chatThinkingBtn || !chatModelSelect) return;
    
    const model = chatModelSelect.value;
    const isEnabled = appState.chat.thinkingMode.enabled;
    const isOnlyThinking = window.isThinkingOnlyModel && window.isThinkingOnlyModel(model);
    
    if (isOnlyThinking) {
        chatThinkingBtn.classList.add('active', 'thinking-only');
        chatThinkingBtn.title = '当前模型为仅思考模式（自动启用）';
    } else if (isEnabled) {
        chatThinkingBtn.classList.add('active');
        chatThinkingBtn.classList.remove('thinking-only');
        chatThinkingBtn.title = '深度思考模式已开启 (点击关闭)';
    } else {
        chatThinkingBtn.classList.remove('active', 'thinking-only');
        chatThinkingBtn.title = '深度思考模式 (点击开启)';
    }
}

function toggleThinkingContent(headerEl) {
    const container = headerEl.closest('.thinking-container');
    if (!container) return;
    
    const content = container.querySelector('.thinking-content');
    const toggleIcon = headerEl.querySelector('.thinking-toggle-icon');
    
    if (content) {
        const isHidden = content.style.display === 'none';
        content.style.display = isHidden ? 'block' : 'none';
        if (toggleIcon) {
            toggleIcon.textContent = isHidden ? '▼' : '▶';
        }
    }
}

window.toggleThinkingContent = toggleThinkingContent;


