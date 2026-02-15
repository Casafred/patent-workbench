/**
 * PDF-OCR AI问答模块
 * 处理与OCR解析结果的智能问答和翻译功能
 */

class PDFOCRChat {
    constructor() {
        this.messages = [];
        this.isProcessing = false;
        this.currentModel = 'glm-4-flash';
        this.init();
    }

    init() {
        this.initElements();
        this.bindEvents();
        this.loadChatHistory();
    }

    initElements() {
        // 初始化元素引用（可在DOM加载后重新调用）
        this.elements = {
            sendBtn: document.getElementById('ocr-chat-send'),
            input: document.getElementById('ocr-chat-input'),
            clearBtn: document.getElementById('ocr-chat-clear'),
            modelSelect: document.getElementById('ocr-chat-model'),
            messagesContainer: document.getElementById('ocr-chat-messages'),
            translateBtn: document.getElementById('ocr-translate-btn'),
            translateSource: document.getElementById('ocr-translate-source'),
            translateResult: document.getElementById('ocr-translate-result'),
            translateTarget: document.getElementById('ocr-translate-target')
        };
    }

    bindEvents() {
        // 发送消息
        const sendBtn = document.getElementById('ocr-chat-send');
        const input = document.getElementById('ocr-chat-input');

        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }

        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        // 清空对话
        const clearBtn = document.getElementById('ocr-chat-clear');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearChat());
        }

        // 模型选择
        const modelSelect = document.getElementById('ocr-chat-model');
        if (modelSelect) {
            modelSelect.addEventListener('change', (e) => {
                this.currentModel = e.target.value;
            });
        }

        // 翻译按钮
        const translateBtn = document.getElementById('ocr-translate-btn');
        if (translateBtn) {
            translateBtn.addEventListener('click', () => this.translateText());
        }

        // 监听区块选择事件
        document.addEventListener('pdfocr:blockSelected', (e) => {
            this.onBlockSelected(e.detail);
        });

        // 监听翻译请求事件
        document.addEventListener('pdfocr:translateBlock', (e) => {
            this.onTranslateBlock(e.detail);
        });

        // 监听提问请求事件
        document.addEventListener('pdfocr:askAboutBlock', (e) => {
            this.onAskAboutBlock(e.detail);
        });
    }

    /**
     * 发送消息
     */
    async sendMessage() {
        const input = document.getElementById('ocr-chat-input');
        const message = input?.value.trim();

        if (!message || this.isProcessing) return;

        // 检查API密钥
        const apiKey = await this.getAPIKey();
        if (!apiKey) {
            this.showToast('请先配置智谱AI API密钥', 'error');
            return;
        }

        // 添加用户消息
        this.addMessage('user', message);
        input.value = '';

        // 获取上下文
        const context = this.buildContext();

        try {
            this.isProcessing = true;
            this.showTypingIndicator();

            // 调用AI API
            const response = await this.callAI(message, context, apiKey);

            // 添加AI回复
            this.hideTypingIndicator();
            this.addMessage('assistant', response);

        } catch (error) {
            console.error('AI请求失败:', error);
            this.hideTypingIndicator();
            this.addMessage('error', `请求失败: ${error.message}`);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * 调用AI API
     */
    async callAI(message, context, apiKey) {
        const url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

        const messages = [
            {
                role: 'system',
                content: `你是一个专业的文档分析助手。用户正在查看一个PDF或图片文档，以下是文档的OCR解析结果：

${context}

请基于以上文档内容回答用户的问题。如果问题与文档内容无关，请礼貌地提醒用户。回答要准确、简洁、专业。`
            },
            ...this.messages.filter(m => m.role !== 'error').slice(-10),
            {
                role: 'user',
                content: message
            }
        ];

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: this.currentModel,
                messages: messages,
                temperature: 0.7,
                max_tokens: 2048
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API请求失败: ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '抱歉，无法生成回复';
    }

    /**
     * 构建上下文
     */
    buildContext() {
        const result = window.pdfOCRParser?.getCurrentResult();
        if (!result || !result.pages) {
            return '暂无文档内容。';
        }

        let context = '';
        const maxLength = 3000; // 最大上下文长度

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

    /**
     * 获取区块文本
     */
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

    /**
     * 添加消息到聊天界面
     */
    addMessage(role, content) {
        const container = document.getElementById('ocr-chat-messages');
        if (!container) return;

        // 存储消息
        this.messages.push({ role, content });

        // 创建消息元素
        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${role}`;

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
                <div class="message-body">${this.formatMessage(content)}</div>
            </div>
        `;

        container.appendChild(messageEl);
        this.scrollToBottom();

        // 保存历史
        this.saveChatHistory();
    }

    /**
     * 格式化消息内容
     */
    formatMessage(content) {
        // 简单的Markdown格式化
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

    /**
     * 格式化时间
     */
    formatTime() {
        const now = new Date();
        return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    }

    /**
     * 显示输入中指示器
     */
    showTypingIndicator() {
        const container = document.getElementById('ocr-chat-messages');
        if (!container) return;

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

    /**
     * 隐藏输入中指示器
     */
    hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    /**
     * 滚动到底部
     */
    scrollToBottom() {
        const container = document.getElementById('ocr-chat-messages');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    /**
     * 清空对话
     */
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

    /**
     * 翻译文本
     */
    async translateText() {
        const sourceInput = document.getElementById('ocr-translate-source');
        const resultContainer = document.getElementById('ocr-translate-result');
        const targetLang = document.getElementById('ocr-translate-target')?.value || 'zh';

        const text = sourceInput?.value.trim();
        if (!text) {
            this.showToast('请输入要翻译的文本', 'error');
            return;
        }

        const apiKey = await this.getAPIKey();
        if (!apiKey) {
            this.showToast('请先配置智谱AI API密钥', 'error');
            return;
        }

        // 显示加载状态
        if (resultContainer) {
            resultContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> 翻译中...</div>';
        }

        try {
            const translated = await this.callTranslateAPI(text, targetLang, apiKey);
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

    /**
     * 调用翻译API
     */
    async callTranslateAPI(text, targetLang, apiKey) {
        const url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

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

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
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
                max_tokens: 2048
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API请求失败: ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
    }

    /**
     * 区块选中处理
     */
    onBlockSelected(block) {
        // 可以在这里添加选中区块后的自动操作
        console.log('选中区块:', block);
    }

    /**
     * 翻译区块请求处理
     */
    onTranslateBlock({ block, text, targetLang }) {
        const sourceInput = document.getElementById('ocr-translate-source');
        const targetSelect = document.getElementById('ocr-translate-target');

        if (sourceInput) sourceInput.value = text;
        if (targetSelect) targetSelect.value = targetLang;

        // 自动触发翻译
        this.translateText();
    }

    /**
     * 提问区块请求处理
     */
    onAskAboutBlock({ block, context }) {
        const input = document.getElementById('ocr-chat-input');
        if (input) {
            input.value = context;
            input.focus();
        }
    }

    /**
     * 获取API密钥
     */
    async getAPIKey() {
        // 首先检查全局appState（其他功能使用的统一配置）
        let apiKey = window.appState?.apiKey || '';
        
        // 如果appState没有，检查localStorage中的全局API密钥
        if (!apiKey) {
            apiKey = localStorage.getItem('globalApiKey') || '';
        }
        
        // 如果还没有，尝试旧的zhipu_api_key（向后兼容）
        if (!apiKey) {
            apiKey = localStorage.getItem('zhipu_api_key') || '';
        }

        return apiKey;
    }

    /**
     * 保存对话历史
     */
    saveChatHistory() {
        try {
            localStorage.setItem('pdf_ocr_chat_history', JSON.stringify(this.messages));
        } catch (e) {
            console.log('无法保存对话历史');
        }
    }

    /**
     * 加载对话历史
     */
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

    /**
     * 渲染消息列表
     */
    renderMessages() {
        const container = document.getElementById('ocr-chat-messages');
        if (!container || this.messages.length === 0) return;

        container.innerHTML = '';
        this.messages.forEach(msg => {
            const messageEl = document.createElement('div');
            messageEl.className = `chat-message ${msg.role}`;

            const avatar = msg.role === 'user' ? 'user' : msg.role === 'error' ? 'exclamation-circle' : 'robot';
            const name = msg.role === 'user' ? '用户' : msg.role === 'error' ? '错误' : 'AI助手';

            messageEl.innerHTML = `
                <div class="message-avatar">
                    <i class="fas fa-${avatar}"></i>
                </div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="message-name">${name}</span>
                    </div>
                    <div class="message-body">${this.formatMessage(msg.content)}</div>
                </div>
            `;

            container.appendChild(messageEl);
        });

        this.scrollToBottom();
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
     * 显示提示消息
     */
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

    /**
     * 清除数据
     */
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

// 暴露类定义（供 pdf-ocr-init.js 使用）
window.PDFOCRChat = PDFOCRChat;
window.pdfOCRChat = null;
