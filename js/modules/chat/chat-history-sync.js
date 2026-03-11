/**
 * 对话历史同步管理器
 * 负责将各处的"问一问"对话记录同步到功能一对话历史中
 */

const ChatHistorySync = {
    SOURCE_TYPES: {
        PATENT_CHAT: {
            id: 'patent_chat',
            name: '专利问一问',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M10.478 1.647a.5.5 0 1 0-.956-.294l-4 13a.5.5 0 0 0 .956.294l4-13zM4.854 4.146a.5.5 0 0 1 0 .708L1.707 8l3.147 3.146a.5.5 0 0 1-.708.708l-3.5-3.5a.5.5 0 0 1 0-.708l3.5-3.5a.5.5 0 0 1 .708 0zm6.292 0a.5.5 0 0 0 0 .708L14.293 8l-3.147 3.146a.5.5 0 0 0 .708.708l3.5-3.5a.5.5 0 0 0 0-.708l-3.5-3.5a.5.5 0 0 0-.708 0z"/></svg>',
            color: '#667eea'
        },
        PDF_OCR_CHAT: {
            id: 'pdf_ocr_chat',
            name: 'PDF对话',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/></svg>',
            color: '#e74c3c'
        },
        NEW_TAB_CHAT: {
            id: 'new_tab_chat',
            name: '详情页问一问',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4Zm.5 11h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1Zm-.2-3.35l.7-.7 1.8 1.8 3.5-3.5.7.7-4.2 4.2-2.5-2.5Zm.2-1.65h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1Zm0-3h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1Z"/></svg>',
            color: '#764ba2'
        }
    },

    syncToHistory(messages, sourceType, contextInfo = {}) {
        if (!messages || messages.length === 0) {
            console.log('[ChatHistorySync] 没有消息需要同步');
            return null;
        }

        const source = this.SOURCE_TYPES[sourceType];
        if (!source) {
            console.error('[ChatHistorySync] 未知的来源类型:', sourceType);
            return null;
        }

        const nonSystemMessages = messages.filter(m => m.role !== 'system' && m.role !== 'loading' && m.role !== 'error');
        if (nonSystemMessages.length === 0) {
            console.log('[ChatHistorySync] 没有有效消息需要同步');
            return null;
        }

        const title = this.generateTitle(messages, source, contextInfo);
        
        const systemPrompt = this.buildSystemPrompt(source, contextInfo);

        const newConvo = {
            id: `convo-${Date.now()}-${source.id}`,
            title: title,
            personaId: 'patent_analyzer',
            messages: [
                { role: 'system', content: systemPrompt },
                ...nonSystemMessages.map(m => ({
                    role: m.role,
                    content: m.content,
                    reasoningContent: m.reasoningContent || null,
                    timestamp: m.timestamp || new Date().toISOString()
                }))
            ],
            lastUpdate: Date.now(),
            model: contextInfo.model || '',
            temperature: '0.7',
            contextCount: '10',
            source: {
                type: sourceType,
                name: source.name,
                icon: source.icon,
                color: source.color,
                contextInfo: contextInfo
            },
            thinkingModeEnabled: contextInfo.thinkingMode || false,
            searchMode: { enabled: false, searchEngine: 'search_pro', count: 5, contentSize: 'medium' }
        };

        if (!window.appState || !window.appState.chat) {
            console.error('[ChatHistorySync] appState.chat 未初始化');
            return null;
        }

        appState.chat.conversations.push(newConvo);
        
        if (typeof saveConversations === 'function') {
            saveConversations();
        } else if (window.userCacheStorage) {
            window.userCacheStorage.setJSON('chatConversations', appState.chat.conversations);
        }

        if (typeof renderChatHistoryList === 'function') {
            renderChatHistoryList();
        }

        console.log('[ChatHistorySync] 对话已同步到历史:', title);
        
        return newConvo.id;
    },

    generateTitle(messages, source, contextInfo) {
        const firstUserMsg = messages.find(m => m.role === 'user');
        let baseTitle = '';
        
        if (contextInfo.patentNumber) {
            baseTitle = `专利${contextInfo.patentNumber}`;
        } else if (contextInfo.fileName) {
            const shortName = contextInfo.fileName.length > 20 
                ? contextInfo.fileName.substring(0, 20) + '...' 
                : contextInfo.fileName;
            baseTitle = `PDF: ${shortName}`;
        } else {
            baseTitle = source.name;
        }

        if (firstUserMsg && firstUserMsg.content) {
            const questionPreview = firstUserMsg.content.substring(0, 30);
            return `${baseTitle} - ${questionPreview}${firstUserMsg.content.length > 30 ? '...' : ''}`;
        }

        return baseTitle;
    },

    buildSystemPrompt(source, contextInfo) {
        let prompt = `这是一个来自"${source.name}"功能的对话记录。`;
        
        if (contextInfo.patentNumber) {
            prompt += `\n\n原始上下文：专利号 ${contextInfo.patentNumber}`;
            if (contextInfo.patentTitle) {
                prompt += `，标题：${contextInfo.patentTitle}`;
            }
        } else if (contextInfo.fileName) {
            prompt += `\n\n原始上下文：PDF文件 "${contextInfo.fileName}"`;
            if (contextInfo.contextPreview) {
                prompt += `\n选中的内容：${contextInfo.contextPreview.substring(0, 200)}...`;
            }
        }

        return prompt;
    },

    showSyncConfirmation(messages, sourceType, contextInfo = {}) {
        const source = this.SOURCE_TYPES[sourceType];
        if (!source) return null;

        const nonSystemMessages = messages.filter(m => m.role !== 'system' && m.role !== 'loading' && m.role !== 'error');
        const messageCount = nonSystemMessages.length;

        if (messageCount === 0) {
            return null;
        }

        const confirmed = confirm(
            `是否将本次"${source.name}"的对话记录（共${messageCount}条消息）同步到即时对话历史中？\n\n` +
            `同步后，您可以在功能一的对话历史列表中查看和继续此对话。`
        );

        if (confirmed) {
            return this.syncToHistory(messages, sourceType, contextInfo);
        }

        return null;
    },

    autoSyncIfNeeded(messages, sourceType, contextInfo = {}) {
        const autoSyncEnabled = window.userCacheStorage?.get('autoSyncChatHistory') !== 'false';
        
        if (autoSyncEnabled && messages && messages.length > 0) {
            const nonSystemMessages = messages.filter(m => m.role !== 'system' && m.role !== 'loading' && m.role !== 'error');
            if (nonSystemMessages.length >= 2) {
                return this.syncToHistory(messages, sourceType, contextInfo);
            }
        }
        
        return null;
    },

    getSourceBadge(source) {
        if (!source) return '';
        
        return `<span class="source-badge" style="background: ${source.color}20; color: ${source.color}; border: 1px solid ${source.color}40; padding: 2px 8px; border-radius: 4px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">
            ${source.icon}
            ${source.name}
        </span>`;
    },

    getSyncedConversations() {
        if (!window.appState || !window.appState.chat || !window.appState.chat.conversations) {
            return [];
        }
        
        return appState.chat.conversations.filter(c => c.source && c.source.type);
    },

    deleteSyncedConversation(convoId) {
        if (!window.appState || !window.appState.chat) return false;
        
        const index = appState.chat.conversations.findIndex(c => c.id === convoId);
        if (index !== -1) {
            appState.chat.conversations.splice(index, 1);
            
            if (typeof saveConversations === 'function') {
                saveConversations();
            } else if (window.userCacheStorage) {
                window.userCacheStorage.setJSON('chatConversations', appState.chat.conversations);
            }
            
            if (typeof renderChatHistoryList === 'function') {
                renderChatHistoryList();
            }
            
            return true;
        }
        
        return false;
    }
};

window.ChatHistorySync = ChatHistorySync;
