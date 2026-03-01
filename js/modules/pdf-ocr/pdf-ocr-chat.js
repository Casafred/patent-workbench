/**
 * PDF-OCR AI问答模块
 * 处理与OCR解析结果的智能问答和翻译功能
 * 支持多服务商切换和深度思考模式
 */

class PDFOCRChat {
    constructor() {
        this.messages = [];
        this.isProcessing = false;
        this.currentModel = 'glm-4-flash';
        this.currentProvider = 'zhipu';
        this.providers = {};
        this.thinkingMode = {
            enabled: false,
            budget: null
        };
        this.thinkingOnlyModels = [];
        this.stopStreaming = false;
        this.init();
    }

    async init() {
        await this.loadProvidersConfig();
        this.initElements();
        this.bindEvents();
        this.loadChatHistory();
    }

    async loadProvidersConfig() {
        try {
            const response = await fetch('/api/providers');
            if (response.ok) {
                const data = await response.json();
                if (data.providers) {
                    this.providers = data.providers;
                    this.thinkingOnlyModels = data.providers.aliyun?.thinking_only_models || [];
                    this.currentProvider = localStorage.getItem('llm_provider') || data.default_provider || 'zhipu';
                    this.currentModel = data.providers[this.currentProvider]?.default_model || 'glm-4-flash';
                }
            }
        } catch (error) {
            console.warn('[PDF-OCR Chat] 从API加载配置失败，尝试本地配置');
            try {
                const configResponse = await fetch('config/models.json');
                if (configResponse.ok) {
                    const config = await configResponse.json();
                    if (config.providers) {
                        this.providers = config.providers;
                        this.thinkingOnlyModels = config.providers.aliyun?.thinking_only_models || [];
                        this.currentProvider = localStorage.getItem('llm_provider') || config.default_provider || 'zhipu';
                        this.currentModel = config.providers[this.currentProvider]?.default_model || config.default_model || 'glm-4-flash';
                    }
                }
            } catch (err) {
                console.warn('[PDF-OCR Chat] 使用默认配置');
            }
        }
    }

    initElements() {
        this.elements = {
            sendBtn: document.getElementById('ocr-chat-send'),
            stopBtn: document.getElementById('ocr-chat-stop'),
            input: document.getElementById('ocr-chat-input'),
            clearBtn: document.getElementById('ocr-chat-clear'),
            modelSelect: document.getElementById('ocr-chat-model'),
            providerSelect: document.getElementById('ocr-chat-provider'),
            thinkingBtn: document.getElementById('ocr-chat-thinking-btn'),
            messagesContainer: document.getElementById('ocr-chat-messages'),
            translateBtn: document.getElementById('ocr-translate-btn'),
            translateSource: document.getElementById('ocr-translate-source'),
            translateResult: document.getElementById('ocr-translate-result'),
            translateTarget: document.getElementById('ocr-translate-target')
        };
        
        this.updateProviderSelect();
        this.updateModelSelect();
        this.updateThinkingButtonState();
    }

    updateProviderSelect() {
        const providerSelect = this.elements.providerSelect;
        if (!providerSelect || !this.providers) return;
        
        const options = Object.entries(this.providers).map(([key, val]) => 
            `<option value="${key}" ${key === this.currentProvider ? 'selected' : ''}>${val.name}</option>`
        ).join('');
        
        providerSelect.innerHTML = options;
    }

    updateModelSelect() {
        const modelSelect = this.elements.modelSelect;
        if (!modelSelect || !this.providers || !this.providers[this.currentProvider]) return;
        
        const models = this.providers[this.currentProvider].models || [];
        const defaultModel = this.providers[this.currentProvider].default_model || models[0];
        
        const options = models.map(m => 
            `<option value="${m}" ${m === this.currentModel ? 'selected' : ''}>${m}</option>`
        ).join('');
        
        modelSelect.innerHTML = options;
        this.currentModel = defaultModel;
    }

    supportsThinkingMode(model, provider) {
        if (provider !== 'aliyun') return false;
        const thinkingSupportedModels = [
            'qwen-flash', 'qwen-turbo', 'qwen-plus', 'qwen3-max', 'qwen-long',
            'deepseek-v3.2', 'qwq-plus', 'qwq-32b', 'deepseek-r1', 
            'deepseek-r1-distill-qwen-32b', 'kimi-k2-thinking'
        ];
        return thinkingSupportedModels.includes(model);
    }

    isThinkingOnlyModel(model) {
        return this.thinkingOnlyModels.includes(model);
    }

    updateThinkingButtonState() {
        const thinkingBtn = this.elements.thinkingBtn;
        if (!thinkingBtn) return;
        
        const supportsThinking = this.supportsThinkingMode(this.currentModel, this.currentProvider);
        
        if (!supportsThinking) {
            thinkingBtn.style.display = 'none';
            return;
        }
        
        thinkingBtn.style.display = 'inline-flex';
        
        const isOnlyThinking = this.isThinkingOnlyModel(this.currentModel);
        
        if (isOnlyThinking) {
            thinkingBtn.classList.add('active', 'thinking-only');
            thinkingBtn.title = '当前模型为仅思考模式（自动启用）';
        } else if (this.thinkingMode.enabled) {
            thinkingBtn.classList.add('active');
            thinkingBtn.classList.remove('thinking-only');
            thinkingBtn.title = '深度思考模式已开启 (点击关闭)';
        } else {
            thinkingBtn.classList.remove('active', 'thinking-only');
            thinkingBtn.title = '深度思考模式 (点击开启)';
        }
    }

    toggleThinkingMode() {
        if (this.isThinkingOnlyModel(this.currentModel)) {
            console.log('[PDF-OCR Chat] 当前模型为仅思考模式，无法关闭');
            return;
        }
        
        this.thinkingMode.enabled = !this.thinkingMode.enabled;
        this.updateThinkingButtonState();
        console.log('[PDF-OCR Chat] 深度思考模式:', this.thinkingMode.enabled ? '已开启' : '已关闭');
    }

    bindEvents() {
        const sendBtn = document.getElementById('ocr-chat-send');
        const stopBtn = document.getElementById('ocr-chat-stop');
        const input = document.getElementById('ocr-chat-input');
        const clearBtn = document.getElementById('ocr-chat-clear');
        const modelSelect = document.getElementById('ocr-chat-model');
        const providerSelect = document.getElementById('ocr-chat-provider');
        const thinkingBtn = document.getElementById('ocr-chat-thinking-btn');
        const translateBtn = document.getElementById('ocr-translate-btn');

        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }

        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.stopStreaming = true);
        }

        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearChat());
        }

        if (providerSelect) {
            providerSelect.addEventListener('change', (e) => {
                this.currentProvider = e.target.value;
                localStorage.setItem('llm_provider', this.currentProvider);
                this.updateModelSelect();
                this.updateThinkingButtonState();
                console.log('[PDF-OCR Chat] 切换服务商:', this.currentProvider);
            });
        }

        if (modelSelect) {
            modelSelect.addEventListener('change', (e) => {
                this.currentModel = e.target.value;
                this.updateThinkingButtonState();
                console.log('[PDF-OCR Chat] 切换模型:', this.currentModel);
            });
        }

        if (thinkingBtn) {
            thinkingBtn.addEventListener('click', () => this.toggleThinkingMode());
        }

        if (translateBtn) {
            translateBtn.addEventListener('click', () => this.translateText());
        }

        document.addEventListener('pdfocr:blockSelected', (e) => {
            this.onBlockSelected(e.detail);
        });

        document.addEventListener('pdfocr:translateBlock', (e) => {
            this.onTranslateBlock(e.detail);
        });

        document.addEventListener('pdfocr:askAboutBlock', (e) => {
            this.onAskAboutBlock(e.detail);
        });

        window.addEventListener('providerChanged', () => {
            if (this.providers && window.ProviderManager) {
                this.currentProvider = window.ProviderManager.getProvider();
                this.updateProviderSelect();
                this.updateModelSelect();
                this.updateThinkingButtonState();
            }
        });
    }

    async sendMessage() {
        const input = document.getElementById('ocr-chat-input');
        const message = input?.value.trim();

        if (!message || this.isProcessing) return;

        this.addMessage('user', message);
        input.value = '';

        const context = this.buildContext();

        try {
            this.isProcessing = true;
            this.stopStreaming = false;
            this.showTypingIndicator();
            this.updateButtons(true);

            await this.callAIStream(message, context);

        } catch (error) {
            console.error('AI请求失败:', error);
            this.hideTypingIndicator();
            this.addMessage('error', `请求失败: ${error.message}`);
        } finally {
            this.isProcessing = false;
            this.updateButtons(false);
            this.stopStreaming = false;
        }
    }

    updateButtons(isProcessing) {
        const sendBtn = document.getElementById('ocr-chat-send');
        const stopBtn = document.getElementById('ocr-chat-stop');
        
        if (sendBtn) {
            sendBtn.style.display = isProcessing ? 'none' : 'inline-flex';
        }
        if (stopBtn) {
            stopBtn.style.display = isProcessing ? 'inline-flex' : 'none';
        }
    }

    async callAIStream(message, context) {
        const messages = [
            {
                role: 'system',
                content: `你是一个专业的文档分析助手。用户正在查看一个PDF或图片文档，以下是文档的OCR解析结果：

${context}

请基于以上文档内容回答用户的问题。如果问题与文档内容无关，请礼貌地提醒用户。回答要准确、简洁、专业。`
            },
            ...this.messages.filter(m => m.role !== 'error' && m.role !== 'loading').slice(-10),
            {
                role: 'user',
                content: message
            }
        ];

        const requestBody = {
            model: this.currentModel,
            messages: messages,
            temperature: 0.7,
            stream: true
        };

        if (this.currentProvider === 'aliyun') {
            requestBody.provider = 'aliyun';
        }

        const shouldEnableThinking = this.supportsThinkingMode(this.currentModel, this.currentProvider) && 
            (this.thinkingMode.enabled || this.isThinkingOnlyModel(this.currentModel));

        if (shouldEnableThinking) {
            requestBody.enable_thinking = true;
            if (this.thinkingMode.budget) {
                requestBody.thinking_budget = this.thinkingMode.budget;
            }
            console.log('[PDF-OCR Chat] 深度思考模式已启用');
        }

        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.currentProvider === 'aliyun') {
            const aliyunKey = localStorage.getItem('aliyun_api_key') || window.appState?.aliyunApiKey;
            if (aliyunKey) {
                headers['X-LLM-Provider'] = 'aliyun';
                headers['Authorization'] = `Bearer ${aliyunKey}`;
            }
        } else {
            const apiKey = await this.getAPIKey();
            if (!apiKey) {
                throw new Error('请先配置API密钥');
            }
            headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const response = await fetch('/api/stream_chat', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `API请求失败: ${response.status}`);
        }

        this.hideTypingIndicator();
        
        const aiMessageId = this.addMessage('assistant', '', true);
        const messageEl = document.querySelector(`[data-message-id="${aiMessageId}"]`);
        const contentEl = messageEl?.querySelector('.message-body');
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let aiResponse = '';
        let reasoningContent = '';
        let buffer = '';

        while (true) {
            if (this.stopStreaming) {
                console.log('[PDF-OCR Chat] 用户终止输出');
                break;
            }

            const { done, value } = await reader.read();
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
                    
                    if (parsed.error) {
                        throw new Error(parsed.error.message || JSON.stringify(parsed.error));
                    }
                    
                    const delta = parsed.choices?.[0]?.delta;
                    
                    if (!delta) continue;

                    if (delta.reasoning_content) {
                        reasoningContent += delta.reasoning_content;
                        this.updateMessageContent(contentEl, aiResponse, reasoningContent, true);
                    }

                    if (delta.content) {
                        const contentStr = typeof delta.content === 'string' ? delta.content : String(delta.content);
                        aiResponse += contentStr;
                        this.updateMessageContent(contentEl, aiResponse, reasoningContent, reasoningContent ? false : undefined);
                    }
                } catch (e) {
                    console.error('[PDF-OCR Chat] 解析错误:', e, 'data:', data);
                }
            }
        }

        this.finalizeMessage(aiMessageId, aiResponse, reasoningContent);
    }

    updateMessageContent(contentEl, content, reasoningContent = '', isThinking = false) {
        if (!contentEl) return;

        if (isThinking && reasoningContent) {
            contentEl.innerHTML = `
                <div class="thinking-container">
                    <div class="thinking-header" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none';">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7"></circle><path d="M8 12v-4M8 6h.01"/></svg>
                        <span class="thinking-title">深度思考中...</span>
                        <span class="thinking-toggle-icon">▼</span>
                    </div>
                    <div class="thinking-content">
                        <span class="thinking-text">${this.escapeHtml(reasoningContent)}</span>
                        <span class="blinking-cursor">|</span>
                    </div>
                </div>
                <div class="response-content"><span class="blinking-cursor">|</span></div>
            `;
        } else if (reasoningContent) {
            const responseEl = contentEl.querySelector('.response-content');
            if (responseEl) {
                responseEl.innerHTML = this.formatMessage(content) + '<span class="blinking-cursor">|</span>';
            }
        } else {
            contentEl.innerHTML = `<div class="message-text">${this.formatMessage(content)}<span class="blinking-cursor">|</span></div>`;
        }

        this.scrollToBottom();
    }

    finalizeMessage(id, content, reasoningContent = '') {
        const messageEl = document.querySelector(`[data-message-id="${id}"]`);
        if (!messageEl) return;
        
        const contentEl = messageEl.querySelector('.message-body');
        if (!contentEl) return;

        if (reasoningContent) {
            contentEl.innerHTML = `
                <div class="thinking-container">
                    <div class="thinking-header" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none';">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7"></circle><path d="M8 12v-4M8 6h.01"/></svg>
                        <span class="thinking-title">深度思考完成</span>
                        <span class="thinking-toggle-icon">▶</span>
                    </div>
                    <div class="thinking-content" style="display: none;">
                        <div class="thinking-text">${this.escapeHtml(reasoningContent)}</div>
                    </div>
                </div>
                <div class="response-content">${this.formatMessage(content)}</div>
            `;
        } else {
            contentEl.innerHTML = `<div class="message-text">${this.formatMessage(content)}</div>`;
        }

        const message = this.messages.find(m => m.id === id);
        if (message) {
            message.content = content;
            message.reasoningContent = reasoningContent;
        }

        this.saveChatHistory();
        this.scrollToBottom();
    }

    buildContext() {
        const result = window.pdfOCRParser?.getCurrentResult();
        if (!result || !result.pages) {
            return '暂无文档内容。';
        }

        let context = '';
        const maxLength = 3000;

        result.pages.forEach((page, pageIndex) => {
            if (context.length > maxLength) return;

            context += `\n--- 第 ${pageIndex + 1} 页 ---\n`;

            if (page.blocks) {
                page.blocks.forEach(block => {
                    if (context.length > maxLength) return;

                    const text = this.getBlockText(block);
                    if (text) {
                        context += `[${block.type}] ${text}\n`;
                    }
                });
            }
        });

        if (context.length > maxLength) {
            context = context.substring(0, maxLength) + '\n... (内容已截断)';
        }

        return context;
    }

    getBlockText(block) {
        switch (block.type) {
            case 'text':
            case 'title':
                return block.text;
            case 'table':
                return block.text || '[表格]';
            case 'formula':
                return block.latex || block.text || '[公式]';
            case 'image':
                return block.caption || '[图片]';
            default:
                return block.text;
        }
    }

    addMessage(role, content, isStreaming = false) {
        const container = document.getElementById('ocr-chat-messages');
        if (!container) return null;

        const id = Date.now() + Math.random();
        const message = { id, role, content };
        this.messages.push(message);

        const welcome = container.querySelector('.chat-welcome');
        if (welcome) welcome.remove();

        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${role}`;
        messageEl.dataset.messageId = id;

        const avatar = role === 'user' ? 'user' : role === 'error' ? 'exclamation-circle' : 'robot';
        const name = role === 'user' ? '用户' : role === 'error' ? '错误' : 'AI助手';

        messageEl.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-${avatar}"></i>
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-name">${name}</span>
                    <span class="message-time">${this.formatTime()}</span>
                </div>
                <div class="message-body">${role === 'error' ? content : this.formatMessage(content)}</div>
            </div>
        `;

        container.appendChild(messageEl);
        this.scrollToBottom();

        this.saveChatHistory();
        return id;
    }

    formatMessage(content) {
        if (!content) return '';
        
        if (typeof marked !== 'undefined') {
            try {
                return marked.parse(content, { gfm: true, breaks: true });
            } catch (e) {
                console.error('Markdown渲染失败:', e);
            }
        }
        
        return content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    formatTime() {
        const now = new Date();
        return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    }

    showTypingIndicator() {
        const container = document.getElementById('ocr-chat-messages');
        if (!container) return;

        const welcome = container.querySelector('.chat-welcome');
        if (welcome) welcome.remove();

        const indicator = document.createElement('div');
        indicator.className = 'chat-message assistant typing-indicator';
        indicator.id = 'typing-indicator';
        indicator.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-name">AI助手</span>
                </div>
                <div class="message-body">
                    <span class="typing-dots"><span></span><span></span><span></span></span>
                </div>
            </div>
        `;

        container.appendChild(indicator);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    scrollToBottom() {
        const container = document.getElementById('ocr-chat-messages');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    clearChat() {
        this.messages = [];
        const container = document.getElementById('ocr-chat-messages');
        if (container) {
            container.innerHTML = `
                <div class="chat-welcome">
                    <i class="fas fa-comments"></i>
                    <p>开始与AI助手对话</p>
                    <p class="sub">可以询问关于文档内容的任何问题</p>
                </div>
            `;
        }
        this.saveChatHistory();
    }

    async translateText() {
        const sourceInput = document.getElementById('ocr-translate-source');
        const resultContainer = document.getElementById('ocr-translate-result');
        const targetLang = document.getElementById('ocr-translate-target')?.value || 'zh';

        const text = sourceInput?.value.trim();
        if (!text) {
            this.showToast('请输入要翻译的文本', 'error');
            return;
        }

        if (resultContainer) {
            resultContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> 翻译中...</div>';
        }

        try {
            const translated = await this.callTranslateAPI(text, targetLang);
            if (resultContainer) {
                resultContainer.innerHTML = `<div class="translated-text">${this.escapeHtml(translated)}</div>`;
            }
        } catch (error) {
            console.error('翻译失败:', error);
            if (resultContainer) {
                resultContainer.innerHTML = `<div class="error">翻译失败: ${error.message}</div>`;
            }
        }
    }

    async callTranslateAPI(text, targetLang) {
        const langNames = {
            'zh': '中文',
            'en': '英文',
            'ja': '日文',
            'ko': '韩文',
            'fr': '法文',
            'de': '德文',
            'es': '西班牙文',
            'ru': '俄文'
        };

        const requestBody = {
            model: this.currentModel,
            messages: [
                {
                    role: 'system',
                    content: `你是一个专业的翻译助手。请将用户提供的文本翻译成${langNames[targetLang] || targetLang}，只返回翻译结果，不要添加任何解释。`
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            temperature: 0.3,
            stream: false
        };

        if (this.currentProvider === 'aliyun') {
            requestBody.provider = 'aliyun';
        }

        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.currentProvider === 'aliyun') {
            const aliyunKey = localStorage.getItem('aliyun_api_key') || window.appState?.aliyunApiKey;
            if (aliyunKey) {
                headers['X-LLM-Provider'] = 'aliyun';
                headers['Authorization'] = `Bearer ${aliyunKey}`;
            }
        } else {
            const apiKey = await this.getAPIKey();
            if (!apiKey) {
                throw new Error('请先配置API密钥');
            }
            headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const response = await fetch('/api/stream_chat', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API请求失败: ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
    }

    onBlockSelected(block) {
        console.log('选中区块:', block);
    }

    onTranslateBlock({ block, text, targetLang }) {
        const sourceInput = document.getElementById('ocr-translate-source');
        const targetSelect = document.getElementById('ocr-translate-target');

        if (sourceInput) sourceInput.value = text;
        if (targetSelect) targetSelect.value = targetLang;

        this.translateText();
    }

    onAskAboutBlock({ block, context }) {
        const input = document.getElementById('ocr-chat-input');
        if (input) {
            input.value = context;
            input.focus();
        }
    }

    async getAPIKey() {
        let apiKey = window.appState?.apiKey || '';
        
        if (!apiKey) {
            apiKey = localStorage.getItem('globalApiKey') || '';
        }
        
        if (!apiKey) {
            apiKey = localStorage.getItem('zhipu_api_key') || '';
        }

        return apiKey;
    }

    saveChatHistory() {
        try {
            const historyToSave = this.messages.map(m => ({
                role: m.role,
                content: m.content,
                reasoningContent: m.reasoningContent
            }));
            localStorage.setItem('pdf_ocr_chat_history', JSON.stringify(historyToSave));
        } catch (e) {
            console.log('无法保存对话历史');
        }
    }

    loadChatHistory() {
        try {
            const history = localStorage.getItem('pdf_ocr_chat_history');
            if (history) {
                this.messages = JSON.parse(history);
                this.renderMessages();
            }
        } catch (e) {
            console.log('无法加载对话历史');
        }
    }

    renderMessages() {
        const container = document.getElementById('ocr-chat-messages');
        if (!container || this.messages.length === 0) return;

        container.innerHTML = '';
        this.messages.forEach(msg => {
            const messageEl = document.createElement('div');
            messageEl.className = `chat-message ${msg.role}`;

            const avatar = msg.role === 'user' ? 'user' : msg.role === 'error' ? 'exclamation-circle' : 'robot';
            const name = msg.role === 'user' ? '用户' : msg.role === 'error' ? '错误' : 'AI助手';

            let contentHtml = '';
            if (msg.reasoningContent) {
                contentHtml = `
                    <div class="thinking-container">
                        <div class="thinking-header" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none';">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7"></circle><path d="M8 12v-4M8 6h.01"/></svg>
                            <span class="thinking-title">深度思考完成</span>
                            <span class="thinking-toggle-icon">▶</span>
                        </div>
                        <div class="thinking-content" style="display: none;">
                            <div class="thinking-text">${this.escapeHtml(msg.reasoningContent)}</div>
                        </div>
                    </div>
                    <div class="response-content">${this.formatMessage(msg.content)}</div>
                `;
            } else {
                contentHtml = `<div class="message-text">${this.formatMessage(msg.content)}</div>`;
            }

            messageEl.innerHTML = `
                <div class="message-avatar">
                    <i class="fas fa-${avatar}"></i>
                </div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="message-name">${name}</span>
                    </div>
                    <div class="message-body">${contentHtml}</div>
                </div>
            `;

            container.appendChild(messageEl);
        });

        this.scrollToBottom();
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `ocr-toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    clear() {
        this.messages = [];
        const container = document.getElementById('ocr-chat-messages');
        if (container) {
            container.innerHTML = `
                <div class="chat-welcome">
                    <i class="fas fa-comments"></i>
                    <p>开始与AI助手对话</p>
                    <p class="sub">可以询问关于文档内容的任何问题</p>
                </div>
            `;
        }

        const resultContainer = document.getElementById('ocr-translate-result');
        if (resultContainer) {
            resultContainer.innerHTML = '<p class="placeholder">翻译结果将显示在这里</p>';
        }
    }
}

window.PDFOCRChat = PDFOCRChat;
window.pdfOCRChat = null;
