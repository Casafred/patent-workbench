/**
 * PDF-OCR 悬浮对话窗口模块
 * 处理可拖动的悬浮AI对话窗口
 * 支持多服务商切换和深度思考模式
 */

class PDFOCRFloatingChat {
    constructor() {
        this.window = null;
        this.isVisible = false;
        this.isMinimized = false;
        this.messages = [];
        this.currentContext = '';
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.isResizing = false;
        this.currentModel = 'glm-4-flash';
        this.currentProvider = 'zhipu';
        this.models = [];
        this.thinkingMode = {
            enabled: false,
            budget: null
        };
        this.thinkingOnlyModels = [];
        this.stopStreaming = false;
        
        this.config = {
            width: 400,
            height: 550,
            minWidth: 320,
            minHeight: 450,
            defaultPosition: { right: 20, bottom: 100 }
        };
        
        this.init();
    }
    
    async init() {
        await this.loadProvidersConfig();
        this.createWindow();
        this.bindEvents();
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
                    this.models = data.providers[this.currentProvider]?.models || ['glm-4-flash'];
                    this.currentModel = data.providers[this.currentProvider]?.default_model || 'glm-4-flash';
                }
            }
        } catch (error) {
            console.warn('[PDF-OCR Floating Chat] 从API加载配置失败，尝试本地配置');
            try {
                const configResponse = await fetch('config/models.json');
                if (configResponse.ok) {
                    const config = await configResponse.json();
                    if (config.providers) {
                        this.providers = config.providers;
                        this.thinkingOnlyModels = config.providers.aliyun?.thinking_only_models || [];
                        this.currentProvider = localStorage.getItem('llm_provider') || config.default_provider || 'zhipu';
                        this.models = config.providers[this.currentProvider]?.models || config.models || ['glm-4-flash'];
                        this.currentModel = config.providers[this.currentProvider]?.default_model || config.default_model || 'glm-4-flash';
                    }
                }
            } catch (err) {
                console.warn('[PDF-OCR Floating Chat] 使用默认配置');
                this.models = ['glm-4-flash'];
                this.currentModel = 'glm-4-flash';
            }
        }
    }
    
    createWindow() {
        if (document.getElementById('ocr-floating-chat')) {
            this.window = document.getElementById('ocr-floating-chat');
            return;
        }
        
        this.window = document.createElement('div');
        this.window.id = 'ocr-floating-chat';
        this.window.className = 'floating-chat-window';
        this.window.style.cssText = `
            position: fixed;
            width: ${this.config.width}px;
            height: ${this.config.height}px;
            right: ${this.config.defaultPosition.right}px;
            bottom: ${this.config.defaultPosition.bottom}px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            display: none;
            flex-direction: column;
            z-index: 1001;
            overflow: hidden;
            transition: transform 0.2s ease, opacity 0.2s ease;
        `;
        
        this.window.innerHTML = this.getWindowHTML();
        document.body.appendChild(this.window);
        this.bindWindowEvents();
        this.updateThinkingButtonVisibility();
    }
    
    getWindowHTML() {
        const providerOptions = Object.entries(this.providers || {}).map(([key, val]) => 
            `<option value="${key}" ${key === this.currentProvider ? 'selected' : ''}>${val.name}</option>`
        ).join('');
        
        const modelOptions = this.models.map(m => 
            `<option value="${m}" ${m === this.currentModel ? 'selected' : ''}>${m}</option>`
        ).join('');
        
        return `
            <div class="chat-window-header">
                <div class="chat-window-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span>AI 对话</span>
                </div>
                <div class="chat-window-controls">
                    <button class="control-btn minimize" title="最小化">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                    <button class="control-btn close" title="关闭">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
            
            <div class="chat-provider-bar">
                <span class="provider-label">服务商:</span>
                <select class="provider-select" id="ocr-chat-provider-select">
                    ${providerOptions}
                </select>
            </div>
            
            <div class="chat-model-bar">
                <span class="model-label">模型:</span>
                <select class="model-select" id="ocr-chat-model-select">
                    ${modelOptions}
                </select>
                <button class="thinking-btn" id="ocr-chat-thinking-btn" title="深度思考模式" style="display: none;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 16v-4"></path>
                        <path d="M12 8h.01"></path>
                    </svg>
                </button>
            </div>
            
            <div class="chat-context-bar">
                <span class="context-label">上下文:</span>
                <span class="context-preview">未选择内容</span>
            </div>
            
            <div class="chat-messages">
                <div class="chat-welcome">
                    <div class="welcome-icon"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16"><path d="M2 6.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zM2 9.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zM2 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5z"/><path d="M14 1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4.414A1 1 0 0 1 3 10.586l-1-1A1 1 0 0 1 1.586 9L3 7.586V2a1 1 0 0 1 1-1h10z"/></svg></div>
                    <div class="welcome-text">
                        <p>我是您的AI助手</p>
                        <p class="hint">选中PDF内容后点击"对话"，我可以帮您：</p>
                        <ul>
                            <li>解释内容含义</li>
                            <li>总结关键信息</li>
                            <li>回答相关问题</li>
                            <li>提供专业分析</li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <div class="chat-input-area">
                <textarea class="chat-input" placeholder="输入您的问题..." rows="2"></textarea>
                <div class="chat-actions">
                    <button class="action-btn stop" id="ocr-chat-stop-btn" title="停止生成" style="display: none; background: #e74c3c;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="6" y="6" width="12" height="12"></rect>
                        </svg>
                    </button>
                    <button class="action-btn clear-history" title="清空对话">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                    <button class="action-btn send" id="ocr-chat-send-btn" title="发送">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </div>
            </div>
            
            <div class="resize-handle"></div>
        `;
    }
    
    bindWindowEvents() {
        const header = this.window.querySelector('.chat-window-header');
        const minimizeBtn = this.window.querySelector('.control-btn.minimize');
        const closeBtn = this.window.querySelector('.control-btn.close');
        const sendBtn = this.window.querySelector('#ocr-chat-send-btn');
        const stopBtn = this.window.querySelector('#ocr-chat-stop-btn');
        const input = this.window.querySelector('.chat-input');
        const clearHistoryBtn = this.window.querySelector('.action-btn.clear-history');
        const resizeHandle = this.window.querySelector('.resize-handle');
        const modelSelect = this.window.querySelector('#ocr-chat-model-select');
        const providerSelect = this.window.querySelector('#ocr-chat-provider-select');
        const thinkingBtn = this.window.querySelector('#ocr-chat-thinking-btn');
        
        header.addEventListener('mousedown', (e) => this.startDrag(e));
        minimizeBtn.addEventListener('click', () => this.toggleMinimize());
        closeBtn.addEventListener('click', () => this.hide());
        sendBtn.addEventListener('click', () => this.sendMessage());
        stopBtn.addEventListener('click', () => this.stopStreaming = true);
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        resizeHandle.addEventListener('mousedown', (e) => this.startResize(e));
        
        if (providerSelect) {
            providerSelect.addEventListener('change', (e) => {
                this.currentProvider = e.target.value;
                localStorage.setItem('llm_provider', this.currentProvider);
                this.updateModelList();
                this.updateThinkingButtonVisibility();
                console.log('[PDF-OCR Floating Chat] 切换服务商:', this.currentProvider);
            });
        }
        
        if (modelSelect) {
            modelSelect.addEventListener('change', (e) => {
                this.currentModel = e.target.value;
                this.updateThinkingButtonState();
                console.log('[PDF-OCR Floating Chat] 切换模型:', this.currentModel);
            });
        }
        
        if (thinkingBtn) {
            thinkingBtn.addEventListener('click', () => this.toggleThinkingMode());
        }
    }
    
    updateModelList() {
        const modelSelect = this.window.querySelector('#ocr-chat-model-select');
        if (!modelSelect || !this.providers) return;
        
        const models = this.providers[this.currentProvider]?.models || [];
        const defaultModel = this.providers[this.currentProvider]?.default_model || models[0];
        
        modelSelect.innerHTML = models.map(m => 
            `<option value="${m}" ${m === defaultModel ? 'selected' : ''}>${m}</option>`
        ).join('');
        
        this.currentModel = defaultModel;
        this.models = models;
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
    
    updateThinkingButtonVisibility() {
        const thinkingBtn = this.window.querySelector('#ocr-chat-thinking-btn');
        if (!thinkingBtn) return;
        
        if (this.supportsThinkingMode(this.currentModel, this.currentProvider)) {
            thinkingBtn.style.display = 'inline-flex';
            this.updateThinkingButtonState();
        } else {
            thinkingBtn.style.display = 'none';
        }
    }
    
    updateThinkingButtonState() {
        const thinkingBtn = this.window.querySelector('#ocr-chat-thinking-btn');
        if (!thinkingBtn) return;
        
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
        
        this.updateThinkingButtonVisibility();
    }
    
    toggleThinkingMode() {
        if (this.isThinkingOnlyModel(this.currentModel)) {
            console.log('[PDF-OCR Floating Chat] 当前模型为仅思考模式，无法关闭');
            return;
        }
        
        this.thinkingMode.enabled = !this.thinkingMode.enabled;
        this.updateThinkingButtonState();
        console.log('[PDF-OCR Floating Chat] 深度思考模式:', this.thinkingMode.enabled ? '已开启' : '已关闭');
    }
    
    bindEvents() {
        document.addEventListener('pdfocr:openFloatingChat', (e) => {
            this.openWithContext(e.detail);
        });
        
        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.onDrag(e);
            }
        });
        
        document.addEventListener('mouseup', () => {
            this.isDragging = false;
        });
        
        window.addEventListener('providerChanged', () => {
            if (this.providers && ProviderManager) {
                this.currentProvider = ProviderManager.getProvider();
                this.updateModelList();
                this.updateThinkingButtonVisibility();
            }
        });
    }
    
    show() {
        this.window.style.display = 'flex';
        this.isVisible = true;
        
        requestAnimationFrame(() => {
            this.window.style.opacity = '1';
            this.window.style.transform = 'scale(1)';
        });
    }
    
    hide() {
        this.window.style.opacity = '0';
        this.window.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            this.window.style.display = 'none';
            this.isVisible = false;
        }, 200);
    }
    
    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        
        const messages = this.window.querySelector('.chat-messages');
        const inputArea = this.window.querySelector('.chat-input-area');
        const contextBar = this.window.querySelector('.chat-context-bar');
        const modelBar = this.window.querySelector('.chat-model-bar');
        const providerBar = this.window.querySelector('.chat-provider-bar');
        
        if (this.isMinimized) {
            messages.style.display = 'none';
            inputArea.style.display = 'none';
            contextBar.style.display = 'none';
            modelBar.style.display = 'none';
            providerBar.style.display = 'none';
            this.window.style.height = 'auto';
        } else {
            messages.style.display = 'block';
            inputArea.style.display = 'flex';
            contextBar.style.display = 'flex';
            modelBar.style.display = 'flex';
            providerBar.style.display = 'flex';
            this.window.style.height = `${this.config.height}px`;
        }
    }
    
    openWithContext(data) {
        this.messages = [];
        this.currentContext = data.context || '';
        
        const messagesContainer = this.window.querySelector('.chat-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }
        
        this.updateContextPreview();
        
        if (this.isMinimized) {
            this.isMinimized = false;
            const messages = this.window.querySelector('.chat-messages');
            const inputArea = this.window.querySelector('.chat-input-area');
            const contextBar = this.window.querySelector('.chat-context-bar');
            const modelBar = this.window.querySelector('.chat-model-bar');
            const providerBar = this.window.querySelector('.chat-provider-bar');
            if (messages) messages.style.display = 'block';
            if (inputArea) inputArea.style.display = 'flex';
            if (contextBar) contextBar.style.display = 'flex';
            if (modelBar) modelBar.style.display = 'flex';
            if (providerBar) providerBar.style.display = 'flex';
            this.window.style.height = `${this.config.height}px`;
        }
        
        if (this.currentContext) {
            this.addMessage('system', `已加载选中的内容作为上下文。您可以询问关于这段内容的任何问题。`);
        }
        
        this.show();
        
        setTimeout(() => {
            this.window.querySelector('.chat-input').focus();
        }, 100);
    }
    
    updateContextPreview() {
        const preview = this.window.querySelector('.context-preview');
        if (this.currentContext) {
            const truncated = this.currentContext.length > 50 
                ? this.currentContext.substring(0, 50) + '...' 
                : this.currentContext;
            preview.textContent = truncated;
            preview.title = this.currentContext;
        } else {
            preview.textContent = '未选择内容';
            preview.title = '';
        }
    }
    
    startDrag(e) {
        if (e.target.closest('.control-btn')) return;
        this.isDragging = true;
        const rect = this.window.getBoundingClientRect();
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        this.window.style.transition = 'none';
    }
    
    onDrag(e) {
        if (!this.isDragging) return;
        
        const x = e.clientX - this.dragOffset.x;
        const y = e.clientY - this.dragOffset.y;
        
        const maxX = window.innerWidth - this.window.offsetWidth;
        const maxY = window.innerHeight - this.window.offsetHeight;
        
        this.window.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
        this.window.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
        this.window.style.right = 'auto';
        this.window.style.bottom = 'auto';
    }
    
    startResize(e) {
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = this.window.offsetWidth;
        const startHeight = this.window.offsetHeight;
        
        const onResize = (e) => {
            const newWidth = Math.max(this.config.minWidth, startWidth + e.clientX - startX);
            const newHeight = Math.max(this.config.minHeight, startHeight + e.clientY - startY);
            
            this.window.style.width = `${newWidth}px`;
            this.window.style.height = `${newHeight}px`;
        };
        
        const onResizeEnd = () => {
            document.removeEventListener('mousemove', onResize);
            document.removeEventListener('mouseup', onResizeEnd);
        };
        
        document.addEventListener('mousemove', onResize);
        document.addEventListener('mouseup', onResizeEnd);
    }
    
    async sendMessage() {
        const input = this.window.querySelector('.chat-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        this.addMessage('user', message);
        input.value = '';
        
        await this.callAI(message);
    }
    
    async callAI(userMessage) {
        const loadingId = this.addMessage('loading', '思考中...');
        this.stopStreaming = false;
        
        const sendBtn = this.window.querySelector('#ocr-chat-send-btn');
        const stopBtn = this.window.querySelector('#ocr-chat-stop-btn');
        sendBtn.style.display = 'none';
        stopBtn.style.display = 'inline-flex';
        
        try {
            const messages = this.buildMessages(userMessage);
            
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
                console.log('[PDF-OCR Floating Chat] 深度思考模式已启用');
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
            
            this.removeMessage(loadingId);
            
            const aiMessageId = this.addMessage('assistant', '');
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let aiResponse = '';
            let reasoningContent = '';
            let buffer = '';
            
            while (true) {
                if (this.stopStreaming) {
                    console.log('[PDF-OCR Floating Chat] 用户终止输出');
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
                        const delta = parsed.choices?.[0]?.delta;
                        
                        if (delta?.reasoning_content) {
                            reasoningContent += delta.reasoning_content;
                            this.updateMessage(aiMessageId, aiResponse, reasoningContent, true);
                        }
                        
                        if (delta?.content) {
                            aiResponse += delta.content;
                            this.updateMessage(aiMessageId, aiResponse, reasoningContent, reasoningContent ? false : undefined);
                        }
                    } catch (e) {
                        // 忽略解析错误
                    }
                }
            }
            
            this.finalizeMessage(aiMessageId, aiResponse, reasoningContent);
            
        } catch (error) {
            this.removeMessage(loadingId);
            this.addMessage('error', '请求失败: ' + error.message);
            console.error('[PDF-OCR Floating Chat] AI调用失败:', error);
        } finally {
            sendBtn.style.display = 'inline-flex';
            stopBtn.style.display = 'none';
            this.stopStreaming = false;
        }
    }
    
    buildMessages(userMessage) {
        const messages = [];
        
        let systemPrompt = '你是一个专业的AI助手，擅长分析文档内容并提供详细解答。';
        if (this.currentContext) {
            systemPrompt += `\n\n当前上下文内容：\n"""\n${this.currentContext}\n"""\n\n请基于以上上下文回答用户的问题。`;
        }
        
        messages.push({
            role: 'system',
            content: systemPrompt
        });
        
        const recentMessages = this.messages.slice(-10);
        recentMessages.forEach(msg => {
            if (msg.role !== 'system' && msg.role !== 'loading' && msg.role !== 'error') {
                messages.push({
                    role: msg.role,
                    content: msg.content
                });
            }
        });
        
        messages.push({
            role: 'user',
            content: userMessage
        });
        
        return messages;
    }
    
    addMessage(role, content) {
        const id = Date.now() + Math.random();
        const message = { id, role, content };
        this.messages.push(message);
        
        const messagesContainer = this.window.querySelector('.chat-messages');
        
        const welcome = messagesContainer.querySelector('.chat-welcome');
        if (welcome) welcome.remove();
        
        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${role}`;
        messageEl.dataset.messageId = id;
        
        let icon = '';
        switch (role) {
            case 'user':
                icon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4Zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10Z"/></svg>';
                break;
            case 'assistant':
                icon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5ZM3 8.5A.5.5 0 0 1 3.5 8h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5ZM2 3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11A.5.5 0 0 1 2 3Z"/></svg>';
                break;
            case 'system':
                icon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/></svg>';
                break;
            case 'error':
                icon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg>';
                break;
            case 'loading':
                icon = '<span class="loading-spinner"></span>';
                break;
        }
        
        const renderedContent = role === 'assistant' ? this.renderMarkdown(content) : this.escapeHtml(content);
        
        messageEl.innerHTML = `
            <div class="message-avatar">${icon}</div>
            <div class="message-content">
                <div class="message-text">${renderedContent}</div>
            </div>
        `;
        
        messagesContainer.appendChild(messageEl);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        return id;
    }
    
    updateMessage(id, content, reasoningContent = '', isThinking = false) {
        const messageEl = this.window.querySelector(`[data-message-id="${id}"]`);
        if (!messageEl) return;
        
        const contentEl = messageEl.querySelector('.message-content');
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
                responseEl.innerHTML = this.renderMarkdown(content) + '<span class="blinking-cursor">|</span>';
            }
        } else {
            contentEl.innerHTML = `<div class="message-text">${this.renderMarkdown(content)}<span class="blinking-cursor">|</span></div>`;
        }
        
        const message = this.messages.find(m => m.id === id);
        if (message) {
            message.content = content;
            message.reasoningContent = reasoningContent;
        }
        
        const messagesContainer = this.window.querySelector('.chat-messages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    finalizeMessage(id, content, reasoningContent = '') {
        const messageEl = this.window.querySelector(`[data-message-id="${id}"]`);
        if (!messageEl) return;
        
        const contentEl = messageEl.querySelector('.message-content');
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
                <div class="response-content">${this.renderMarkdown(content)}</div>
            `;
        } else {
            contentEl.innerHTML = `<div class="message-text">${this.renderMarkdown(content)}</div>`;
        }
        
        const message = this.messages.find(m => m.id === id);
        if (message) {
            message.content = content;
            message.reasoningContent = reasoningContent;
        }
    }
    
    renderMarkdown(text) {
        if (!text) return '';
        
        if (typeof marked !== 'undefined') {
            try {
                return marked.parse(text, { gfm: true, breaks: true });
            } catch (e) {
                console.error('Markdown渲染失败:', e);
            }
        }
        
        return this.simpleMarkdownRender(text);
    }
    
    simpleMarkdownRender(text) {
        if (!text) return '';
        
        let html = this.escapeHtml(text);
        
        html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
        html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^\- (.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
        html = html.replace(/\n\n/g, '</p><p>');
        html = '<p>' + html + '</p>';
        
        return html;
    }
    
    removeMessage(id) {
        const messageEl = this.window.querySelector(`[data-message-id="${id}"]`);
        if (messageEl) {
            messageEl.remove();
        }
        this.messages = this.messages.filter(m => m.id !== id);
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    clearHistory() {
        this.messages = [];
        const messagesContainer = this.window.querySelector('.chat-messages');
        messagesContainer.innerHTML = `
            <div class="chat-welcome">
                <div class="welcome-icon"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16"><path d="M2 6.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zM2 9.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zM2 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5z"/><path d="M14 1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4.414A1 1 0 0 1 3 10.586l-1-1A1 1 0 0 1 1.586 9L3 7.586V2a1 1 0 0 1 1-1h10z"/></svg></div>
                <div class="welcome-text">
                    <p>对话历史已清空</p>
                    <p class="hint">您可以继续提问</p>
                </div>
            </div>
        `;
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
    
    destroy() {
        if (this.window) {
            this.window.remove();
            this.window = null;
        }
    }
}

window.PDFOCRFloatingChat = PDFOCRFloatingChat;
window.pdfOCRFloatingChat = null;
