/**
 * PDF-OCR 悬浮对话窗口模块
 * 处理可拖动的悬浮AI对话窗口
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
        this.models = [];
        
        // 配置
        this.config = {
            width: 380,
            height: 500,
            minWidth: 300,
            minHeight: 400,
            defaultPosition: { right: 20, bottom: 100 }
        };
        
        this.init();
    }
    
    async init() {
        await this.loadModels();
        this.createWindow();
        this.bindEvents();
    }
    
    /**
     * 加载模型列表
     */
    async loadModels() {
        try {
            const response = await fetch('config/models.json');
            const data = await response.json();
            this.models = data.models || ['glm-4-flash'];
            this.currentModel = data.default_model || 'glm-4-flash';
        } catch (error) {
            console.error('加载模型列表失败:', error);
            this.models = ['glm-4-flash'];
            this.currentModel = 'glm-4-flash';
        }
    }
    
    /**
     * 创建悬浮窗口
     */
    createWindow() {
        // 检查是否已存在
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
        
        this.window.innerHTML = `
            <!-- 标题栏 -->
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
            
            <!-- 模型选择 -->
            <div class="chat-model-bar">
                <span class="model-label">模型:</span>
                <select class="model-select" id="ocr-chat-model-select">
                    ${this.models.map(m => `<option value="${m}" ${m === this.currentModel ? 'selected' : ''}>${m}</option>`).join('')}
                </select>
            </div>
            
            <!-- 上下文提示 -->
            <div class="chat-context-bar">
                <span class="context-label">上下文:</span>
                <span class="context-preview">未选择内容</span>
            </div>
            
            <!-- 消息区域 -->
            <div class="chat-messages">
                <div class="chat-welcome">
                    <div class="welcome-icon">💬</div>
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
            
            <!-- 输入区域 -->
            <div class="chat-input-area">
                <textarea class="chat-input" placeholder="输入您的问题..." rows="2"></textarea>
                <div class="chat-actions">
                    <button class="action-btn clear-history" title="清空对话">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                    <button class="action-btn send" title="发送">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </div>
            </div>
            
            <!-- 调整大小手柄 -->
            <div class="resize-handle"></div>
        `;
        
        document.body.appendChild(this.window);
        
        // 绑定内部事件
        this.bindWindowEvents();
    }
    
    /**
     * 绑定窗口内部事件
     */
    bindWindowEvents() {
        const header = this.window.querySelector('.chat-window-header');
        const minimizeBtn = this.window.querySelector('.control-btn.minimize');
        const closeBtn = this.window.querySelector('.control-btn.close');
        const sendBtn = this.window.querySelector('.action-btn.send');
        const input = this.window.querySelector('.chat-input');
        const clearHistoryBtn = this.window.querySelector('.action-btn.clear-history');
        const resizeHandle = this.window.querySelector('.resize-handle');
        const modelSelect = this.window.querySelector('#ocr-chat-model-select');
        
        // 拖动功能
        header.addEventListener('mousedown', (e) => this.startDrag(e));
        
        // 最小化
        minimizeBtn.addEventListener('click', () => this.toggleMinimize());
        
        // 关闭
        closeBtn.addEventListener('click', () => this.hide());
        
        // 发送消息
        sendBtn.addEventListener('click', () => this.sendMessage());
        
        // 输入框回车发送
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // 清空历史
        clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        
        // 调整大小
        resizeHandle.addEventListener('mousedown', (e) => this.startResize(e));
        
        // 模型选择
        if (modelSelect) {
            modelSelect.addEventListener('change', (e) => {
                this.currentModel = e.target.value;
                console.log('[PDF-OCR] 切换模型:', this.currentModel);
            });
        }
    }
    
    /**
     * 绑定全局事件
     */
    bindEvents() {
        // 监听打开对话窗口事件
        document.addEventListener('pdfocr:openFloatingChat', (e) => {
            this.openWithContext(e.detail);
        });
        
        // 全局鼠标事件（拖动和调整大小）
        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.onDrag(e);
            }
        });
        
        document.addEventListener('mouseup', () => {
            this.isDragging = false;
        });
    }
    
    /**
     * 显示窗口
     */
    show() {
        this.window.style.display = 'flex';
        this.isVisible = true;
        
        // 触发动画
        requestAnimationFrame(() => {
            this.window.style.opacity = '1';
            this.window.style.transform = 'scale(1)';
        });
    }
    
    /**
     * 隐藏窗口
     */
    hide() {
        this.window.style.opacity = '0';
        this.window.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            this.window.style.display = 'none';
            this.isVisible = false;
        }, 200);
    }
    
    /**
     * 切换最小化
     */
    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        
        const messages = this.window.querySelector('.chat-messages');
        const inputArea = this.window.querySelector('.chat-input-area');
        const contextBar = this.window.querySelector('.chat-context-bar');
        
        if (this.isMinimized) {
            messages.style.display = 'none';
            inputArea.style.display = 'none';
            contextBar.style.display = 'none';
            this.window.style.height = 'auto';
        } else {
            messages.style.display = 'block';
            inputArea.style.display = 'flex';
            contextBar.style.display = 'flex';
            this.window.style.height = `${this.config.height}px`;
        }
    }
    
    /**
     * 打开窗口并设置上下文
     */
    openWithContext(data) {
        // 重置状态（新的对话）
        this.messages = [];
        this.currentContext = data.context || '';
        
        // 清空消息容器
        const messagesContainer = this.window.querySelector('.chat-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }
        
        // 更新上下文显示
        this.updateContextPreview();
        
        // 如果是最小化状态，恢复
        if (this.isMinimized) {
            this.isMinimized = false;
            const messages = this.window.querySelector('.chat-messages');
            const inputArea = this.window.querySelector('.chat-input-area');
            const contextBar = this.window.querySelector('.chat-context-bar');
            if (messages) messages.style.display = 'block';
            if (inputArea) inputArea.style.display = 'flex';
            if (contextBar) contextBar.style.display = 'flex';
            this.window.style.height = `${this.config.height}px`;
        }
        
        // 添加系统提示
        if (this.currentContext) {
            this.addMessage('system', `已加载选中的内容作为上下文。您可以询问关于这段内容的任何问题。`);
        }
        
        this.show();
        
        // 聚焦输入框
        setTimeout(() => {
            this.window.querySelector('.chat-input').focus();
        }, 100);
    }
    
    /**
     * 更新上下文预览
     */
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
    
    /**
     * 清除上下文
     */
    clearContext() {
        this.currentContext = '';
        this.updateContextPreview();
        this.addMessage('system', '上下文已清除。');
    }
    
    /**
     * 开始拖动
     */
    startDrag(e) {
        this.isDragging = true;
        const rect = this.window.getBoundingClientRect();
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        this.window.style.transition = 'none';
    }
    
    /**
     * 拖动中
     */
    onDrag(e) {
        if (!this.isDragging) return;
        
        const x = e.clientX - this.dragOffset.x;
        const y = e.clientY - this.dragOffset.y;
        
        // 确保不超出视口
        const maxX = window.innerWidth - this.window.offsetWidth;
        const maxY = window.innerHeight - this.window.offsetHeight;
        
        this.window.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
        this.window.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
        this.window.style.right = 'auto';
        this.window.style.bottom = 'auto';
    }
    
    /**
     * 开始调整大小
     */
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
    
    /**
     * 发送消息
     */
    async sendMessage() {
        const input = this.window.querySelector('.chat-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        // 添加用户消息
        this.addMessage('user', message);
        input.value = '';
        
        // 调用AI
        await this.callAI(message);
    }
    
    /**
     * 调用AI
     */
    async callAI(userMessage) {
        // 显示加载中
        const loadingId = this.addMessage('loading', '思考中...');
        
        try {
            const apiKey = await this.getAPIKey();
            if (!apiKey) {
                this.removeMessage(loadingId);
                this.addMessage('error', '请先配置智谱AI API密钥');
                return;
            }
            
            // 构建消息历史
            const messages = this.buildMessages(userMessage);
            
            // 调用API
            const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: this.currentModel,
                    messages: messages,
                    stream: true
                })
            });
            
            if (!response.ok) {
                throw new Error('API请求失败');
            }
            
            // 移除加载消息
            this.removeMessage(loadingId);
            
            // 创建AI消息占位
            const aiMessageId = this.addMessage('assistant', '');
            
            // 处理流式响应
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let aiResponse = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;
                        
                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices?.[0]?.delta?.content || '';
                            if (content) {
                                aiResponse += content;
                                this.updateMessage(aiMessageId, aiResponse);
                            }
                        } catch (e) {
                            // 忽略解析错误
                        }
                    }
                }
            }
            
        } catch (error) {
            this.removeMessage(loadingId);
            this.addMessage('error', '请求失败: ' + error.message);
            console.error('AI调用失败:', error);
        }
    }
    
    /**
     * 构建消息历史
     */
    buildMessages(userMessage) {
        const messages = [];
        
        // 系统提示
        let systemPrompt = '你是一个专业的AI助手，擅长分析文档内容并提供详细解答。';
        if (this.currentContext) {
            systemPrompt += `\n\n当前上下文内容：\n"""\n${this.currentContext}\n"""\n\n请基于以上上下文回答用户的问题。`;
        }
        
        messages.push({
            role: 'system',
            content: systemPrompt
        });
        
        // 历史消息（保留最近10条）
        const recentMessages = this.messages.slice(-10);
        recentMessages.forEach(msg => {
            if (msg.role !== 'system' && msg.role !== 'loading') {
                messages.push({
                    role: msg.role,
                    content: msg.content
                });
            }
        });
        
        // 当前消息
        messages.push({
            role: 'user',
            content: userMessage
        });
        
        return messages;
    }
    
    /**
     * 添加消息
     */
    addMessage(role, content) {
        const id = Date.now() + Math.random();
        const message = { id, role, content };
        this.messages.push(message);
        
        const messagesContainer = this.window.querySelector('.chat-messages');
        
        // 移除欢迎消息
        const welcome = messagesContainer.querySelector('.chat-welcome');
        if (welcome) welcome.remove();
        
        // 创建消息元素
        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${role}`;
        messageEl.dataset.messageId = id;
        
        let icon = '';
        switch (role) {
            case 'user':
                icon = '👤';
                break;
            case 'assistant':
                icon = '🤖';
                break;
            case 'system':
                icon = 'ℹ️';
                break;
            case 'error':
                icon = '⚠️';
                break;
            case 'loading':
                icon = '<span class="loading-spinner"></span>';
                break;
        }
        
        // 渲染内容（assistant使用Markdown）
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
    
    /**
     * 渲染Markdown
     */
    renderMarkdown(text) {
        if (!text) return '';
        
        // 使用marked库（如果可用）
        if (typeof marked !== 'undefined') {
            try {
                return marked.parse(text);
            } catch (e) {
                console.error('Markdown渲染失败:', e);
            }
        }
        
        // 简单的Markdown渲染（备用）
        return this.simpleMarkdownRender(text);
    }
    
    /**
     * 简单的Markdown渲染
     */
    simpleMarkdownRender(text) {
        if (!text) return '';
        
        // 转义HTML
        let html = this.escapeHtml(text);
        
        // 代码块
        html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
        
        // 行内代码
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // 粗体
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        
        // 斜体
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        
        // 标题
        html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
        html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');
        
        // 列表
        html = html.replace(/^\- (.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
        
        // 段落
        html = html.replace(/\n\n/g, '</p><p>');
        html = '<p>' + html + '</p>';
        
        return html;
    }
    
    /**
     * 更新消息内容
     */
    updateMessage(id, content) {
        const messageEl = this.window.querySelector(`[data-message-id="${id}"]`);
        if (messageEl) {
            const textEl = messageEl.querySelector('.message-text');
            if (textEl) {
                // 使用Markdown渲染
                textEl.innerHTML = this.renderMarkdown(content);
            }
        }
        
        // 更新消息数据
        const message = this.messages.find(m => m.id === id);
        if (message) {
            message.content = content;
        }
        
        // 滚动到底部
        const messagesContainer = this.window.querySelector('.chat-messages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    /**
     * 移除消息
     */
    removeMessage(id) {
        const messageEl = this.window.querySelector(`[data-message-id="${id}"]`);
        if (messageEl) {
            messageEl.remove();
        }
        this.messages = this.messages.filter(m => m.id !== id);
    }
    
    /**
     * 格式化内容
     */
    formatContent(content) {
        // 简单的Markdown格式化
        return this.escapeHtml(content)
            .replace(/\n/g, '<br>')
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>');
    }
    
    /**
     * HTML转义
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * 清空历史
     */
    clearHistory() {
        this.messages = [];
        const messagesContainer = this.window.querySelector('.chat-messages');
        messagesContainer.innerHTML = `
            <div class="chat-welcome">
                <div class="welcome-icon">💬</div>
                <div class="welcome-text">
                    <p>对话历史已清空</p>
                    <p class="hint">您可以继续提问</p>
                </div>
            </div>
        `;
    }
    
    /**
     * 获取API密钥
     */
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
    
    /**
     * 销毁
     */
    destroy() {
        if (this.window) {
            this.window.remove();
            this.window = null;
        }
    }
}

// 暴露类定义
window.PDFOCRFloatingChat = PDFOCRFloatingChat;
window.pdfOCRFloatingChat = null;
