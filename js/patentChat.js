// =================================================================================
// 专利对话功能模块
// 支持多服务商切换和深度思考模式
// =================================================================================

let patentChatState = {
    providers: {},
    currentProvider: 'zhipu',
    currentModel: 'glm-4-flash',
    thinkingMode: {
        enabled: false,
        budget: null
    },
    thinkingOnlyModels: [],
    stopStreaming: false
};

async function initPatentChatProviders() {
    try {
        const response = await fetch('/api/providers');
        if (response.ok) {
            const data = await response.json();
            if (data.providers) {
                patentChatState.providers = data.providers;
                patentChatState.thinkingOnlyModels = data.providers.aliyun?.thinking_only_models || [];
                patentChatState.currentProvider = localStorage.getItem('llm_provider') || data.default_provider || 'zhipu';
                patentChatState.currentModel = data.providers[patentChatState.currentProvider]?.default_model || 'glm-4-flash';
                updatePatentChatProviderSelect();
                updatePatentChatModelSelect();
                updatePatentChatThinkingButton();
            }
        }
    } catch (error) {
        console.warn('[Patent Chat] 从API加载配置失败，尝试本地配置');
        try {
            const configResponse = await fetch('config/models.json');
            if (configResponse.ok) {
                const config = await configResponse.json();
                if (config.providers) {
                    patentChatState.providers = config.providers;
                    patentChatState.thinkingOnlyModels = config.providers.aliyun?.thinking_only_models || [];
                    patentChatState.currentProvider = localStorage.getItem('llm_provider') || config.default_provider || 'zhipu';
                    patentChatState.currentModel = config.providers[patentChatState.currentProvider]?.default_model || config.default_model || 'glm-4-flash';
                    updatePatentChatProviderSelect();
                    updatePatentChatModelSelect();
                    updatePatentChatThinkingButton();
                }
            }
        } catch (err) {
            console.warn('[Patent Chat] 使用默认配置');
        }
    }
}

function updatePatentChatProviderSelect() {
    const providerSelect = document.getElementById('patent_chat_provider');
    if (!providerSelect || !patentChatState.providers) return;
    
    const options = Object.entries(patentChatState.providers).map(([key, val]) => 
        `<option value="${key}" ${key === patentChatState.currentProvider ? 'selected' : ''}>${val.name}</option>`
    ).join('');
    
    providerSelect.innerHTML = options;
}

function updatePatentChatModelSelect() {
    const modelSelect = document.getElementById('patent_chat_model');
    if (!modelSelect || !patentChatState.providers || !patentChatState.providers[patentChatState.currentProvider]) return;
    
    const models = patentChatState.providers[patentChatState.currentProvider].models || [];
    const defaultModel = patentChatState.providers[patentChatState.currentProvider].default_model || models[0];
    
    const options = models.map(m => 
        `<option value="${m}" ${m === patentChatState.currentModel ? 'selected' : ''}>${m}</option>`
    ).join('');
    
    modelSelect.innerHTML = options;
    patentChatState.currentModel = defaultModel;
}

function patentChatSupportsThinking(model, provider) {
    if (provider !== 'aliyun') return false;
    const thinkingSupportedModels = [
        'qwen-flash', 'qwen-turbo', 'qwen-plus', 'qwen3-max', 'qwen-long',
        'deepseek-v3.2', 'qwq-plus', 'qwq-32b', 'deepseek-r1', 
        'deepseek-r1-distill-qwen-32b', 'kimi-k2-thinking'
    ];
    return thinkingSupportedModels.includes(model);
}

function patentChatIsThinkingOnlyModel(model) {
    return patentChatState.thinkingOnlyModels.includes(model);
}

function updatePatentChatThinkingButton() {
    const thinkingBtn = document.getElementById('patent_chat_thinking_btn');
    if (!thinkingBtn) return;
    
    const supportsThinking = patentChatSupportsThinking(patentChatState.currentModel, patentChatState.currentProvider);
    
    if (!supportsThinking) {
        thinkingBtn.style.display = 'none';
        return;
    }
    
    thinkingBtn.style.display = 'inline-flex';
    
    const isOnlyThinking = patentChatIsThinkingOnlyModel(patentChatState.currentModel);
    
    if (isOnlyThinking) {
        thinkingBtn.classList.add('active', 'thinking-only');
        thinkingBtn.title = '当前模型为仅思考模式（自动启用）';
    } else if (patentChatState.thinkingMode.enabled) {
        thinkingBtn.classList.add('active');
        thinkingBtn.classList.remove('thinking-only');
        thinkingBtn.title = '深度思考模式已开启 (点击关闭)';
    } else {
        thinkingBtn.classList.remove('active', 'thinking-only');
        thinkingBtn.title = '深度思考模式 (点击开启)';
    }
}

function togglePatentChatThinkingMode() {
    if (patentChatIsThinkingOnlyModel(patentChatState.currentModel)) {
        console.log('[Patent Chat] 当前模型为仅思考模式，无法关闭');
        return;
    }
    
    patentChatState.thinkingMode.enabled = !patentChatState.thinkingMode.enabled;
    updatePatentChatThinkingButton();
    console.log('[Patent Chat] 深度思考模式:', patentChatState.thinkingMode.enabled ? '已开启' : '已关闭');
}

function initModalDrag(modal) {
    const modalContent = modal.querySelector('.patent-chat-modal');
    const header = modalContent.querySelector('.modal-header');
    
    if (!header || header.dataset.dragInitialized) return;
    header.dataset.dragInitialized = 'true';
    
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    
    header.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);
    
    function dragStart(e) {
        if (e.target.closest('.close-btn')) return;
        
        isDragging = true;
        initialX = e.clientX - (modalContent.offsetLeft || 0);
        initialY = e.clientY - (modalContent.offsetTop || 0);
        header.style.cursor = 'grabbing';
        modalContent.classList.add('dragging');
    }
    
    function drag(e) {
        if (!isDragging) return;
        
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        
        const maxX = window.innerWidth - modalContent.offsetWidth;
        const maxY = window.innerHeight - modalContent.offsetHeight;
        
        currentX = Math.max(0, Math.min(currentX, maxX));
        currentY = Math.max(0, Math.min(currentY, maxY));
        
        modal.style.left = currentX + 'px';
        modal.style.top = currentY + 'px';
        modal.style.transform = 'none';
    }
    
    function dragEnd() {
        isDragging = false;
        header.style.cursor = 'move';
        modalContent.classList.remove('dragging');
    }
}

function openPatentChat(patentNumber) {
    const patent = appState.patentBatch.patentResults.find(p => p.patent_number === patentNumber);
    
    if (!patent || !patent.success) {
        alert('未找到专利数据');
        return;
    }
    
    if (!appState.patentBatch.patentChats[patentNumber]) {
        appState.patentBatch.patentChats[patentNumber] = {
            patentNumber,
            patentData: patent.data,
            messages: [],
            isOpen: true
        };
    } else {
        appState.patentBatch.patentChats[patentNumber].isOpen = true;
    }
    
    const modal = getEl('patent_chat_modal');
    if (modal) {
        modal.style.display = 'block';
        initModalDrag(modal);
    }
    
    updatePatentChatModal(patentNumber);
    
    const input = getEl('patent_chat_input');
    if (input) {
        setTimeout(() => input.focus(), 100);
    }
}

function closePatentChat() {
    const modal = getEl('patent_chat_modal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    const currentPatentNumber = modal.dataset.currentPatent;
    if (currentPatentNumber && appState.patentBatch.patentChats[currentPatentNumber]) {
        appState.patentBatch.patentChats[currentPatentNumber].isOpen = false;
    }
}

function updatePatentChatModal(patentNumber) {
    const modal = getEl('patent_chat_modal');
    const chatState = appState.patentBatch.patentChats[patentNumber];
    
    if (!modal || !chatState) return;
    
    modal.dataset.currentPatent = patentNumber;
    
    const titleEl = modal.querySelector('.patent-chat-title');
    if (titleEl) {
        titleEl.textContent = `专利对话：${patentNumber}`;
    }
    
    const subtitleEl = modal.querySelector('.patent-chat-subtitle');
    if (subtitleEl) {
        subtitleEl.textContent = chatState.patentData.title || '无标题';
    }
    
    updateChatHistory(patentNumber);
}

function updateChatHistory(patentNumber) {
    const chatState = appState.patentBatch.patentChats[patentNumber];
    const historyEl = getEl('patent_chat_history');
    
    if (!historyEl || !chatState) return;
    
    historyEl.innerHTML = '';
    
    if (chatState.messages.length === 0) {
        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'chat-message system-message';
        welcomeDiv.innerHTML = `
            <div class="message-content">
                <p><strong>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: text-bottom; margin-right: 4px;">
                        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                        <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286zm1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94z"/>
                    </svg>
                    欢迎使用专利问一问功能！
                </strong></p>
                <p>您可以针对这个专利提出任何问题，例如：</p>
                <ul style="margin-top: 10px; padding-left: 20px;">
                    <li>这个专利的核心创新点是什么？</li>
                    <li>与现有技术相比有什么优势？</li>
                    <li>这个专利的应用场景有哪些？</li>
                    <li>这个专利的技术难点在哪里？</li>
                </ul>
            </div>
        `;
        historyEl.appendChild(welcomeDiv);
        return;
    }
    
    chatState.messages.forEach(msg => {
        if (msg.role === 'system') return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${msg.role}-message`;
        
        const roleLabel = msg.role === 'user' ? '您' : 'AI助手';
        const roleIcon = msg.role === 'user' 
            ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: text-bottom;"><path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/><path fill-rule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"/></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: text-bottom;"><path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5ZM3 8.062C3 6.76 4.235 5.765 5.53 5.886a26.58 26.58 0 0 0 4.94 0C11.765 5.765 13 6.76 13 8.062v1.157a.933.933 0 0 1-.765.935c-.845.147-2.34.346-4.235.346-1.895 0-3.39-.2-4.235-.346A.933.933 0 0 1 3 9.219V8.062Zm4.542-.827a.25.25 0 0 0-.217.068l-.92.9a24.767 24.767 0 0 1-1.871-.183.25.25 0 0 0-.068.495c.55.076 1.232.149 2.02.193a.25.25 0 0 0 .189-.071l.754-.736.847 1.71a.25.25 0 0 0 .404.062l.932-.97a25.286 25.286 0 0 0 1.922-.188.25.25 0 0 0-.068-.495c-.538.074-1.207.145-1.98.189a.25.25 0 0 0-.166.076l-.754.785-.842-1.7a.25.25 0 0 0-.182-.135Z"/><path d="M8.5 1.866a1 1 0 1 0-1 0V3h-2A4.5 4.5 0 0 0 1 7.5V8a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1v-.5A4.5 4.5 0 0 0 10.5 3h-2V1.866ZM14 7.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.5A3.5 3.5 0 0 1 5.5 4h5A3.5 3.5 0 0 1 14 7.5Z"/></svg>';
        
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
                        <div class="thinking-text">${escapeHtml(msg.reasoningContent)}</div>
                    </div>
                </div>
                <div class="response-content">${formatMessageContent(msg.content)}</div>
            `;
        } else {
            contentHtml = formatMessageContent(msg.content);
        }
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-role">${roleIcon} ${roleLabel}</span>
                <span class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="message-content">${contentHtml}</div>
        `;
        
        historyEl.appendChild(messageDiv);
    });
    
    historyEl.scrollTop = historyEl.scrollHeight;
}

function formatMessageContent(content) {
    if (typeof marked !== 'undefined') {
        try {
            marked.setOptions({
                breaks: true,
                gfm: true,
                headerIds: false,
                mangle: false,
                sanitize: false,
                smartLists: true,
                smartypants: false,
                xhtml: false
            });
            
            const html = marked.parse(content);
            
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            const scripts = tempDiv.querySelectorAll('script');
            scripts.forEach(script => script.remove());
            
            const allElements = tempDiv.querySelectorAll('*');
            allElements.forEach(el => {
                Array.from(el.attributes).forEach(attr => {
                    if (attr.name.startsWith('on')) {
                        el.removeAttribute(attr.name);
                    }
                });
            });
            
            return tempDiv.innerHTML;
        } catch (e) {
            console.error('Markdown渲染失败:', e);
            return simpleFormatContent(content);
        }
    } else {
        console.warn('marked库未加载，使用简单格式化');
        return simpleFormatContent(content);
    }
}

function simpleFormatContent(content) {
    let formatted = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    formatted = formatted.replace(/\n/g, '<br>');
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/^- (.+)$/gm, '<li>$1</li>');
    if (formatted.includes('<li>')) {
        formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    }
    return formatted;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function sendPatentChatMessage() {
    const modal = getEl('patent_chat_modal');
    const input = getEl('patent_chat_input');
    const sendBtn = getEl('patent_chat_send_btn');
    const stopBtn = getEl('patent_chat_stop_btn');
    
    if (!modal || !input || !sendBtn) return;
    
    const patentNumber = modal.dataset.currentPatent;
    const chatState = appState.patentBatch.patentChats[patentNumber];
    
    if (!chatState) return;
    
    const userMessage = input.value.trim();
    if (!userMessage) {
        alert('请输入您的问题');
        return;
    }
    
    input.disabled = true;
    sendBtn.disabled = true;
    sendBtn.style.display = 'none';
    if (stopBtn) stopBtn.style.display = 'inline-flex';
    patentChatState.stopStreaming = false;
    
    try {
        chatState.messages.push({
            role: 'user',
            content: userMessage,
            timestamp: new Date().toISOString()
        });
        
        updateChatHistory(patentNumber);
        input.value = '';
        
        const historyEl = getEl('patent_chat_history');
        const assistantDiv = document.createElement('div');
        assistantDiv.className = 'chat-message assistant-message streaming';
        assistantDiv.innerHTML = `
            <div class="message-header">
                <span class="message-role">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: text-bottom;">
                        <path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5ZM3 8.062C3 6.76 4.235 5.765 5.53 5.886a26.58 26.58 0 0 0 4.94 0C11.765 5.765 13 6.76 13 8.062v1.157a.933.933 0 0 1-.765.935c-.845.147-2.34.346-4.235.346-1.895 0-3.39-.2-4.235-.346A.933.933 0 0 1 3 9.219V8.062Zm4.542-.827a.25.25 0 0 0-.217.068l-.92.9a24.767 24.767 0 0 1-1.871-.183.25.25 0 0 0-.068.495c.55.076 1.232.149 2.02.193a.25.25 0 0 0 .189-.071l.754-.736.847 1.71a.25.25 0 0 0 .404.062l.932-.97a25.286 25.286 0 0 0 1.922-.188.25.25 0 0 0-.068-.495c-.538.074-1.207.145-1.98.189a.25.25 0 0 0-.166.076l-.754.785-.842-1.7a.25.25 0 0 0-.182-.135Z"/><path d="M8.5 1.866a1 1 0 1 0-1 0V3h-2A4.5 4.5 0 0 0 1 7.5V8a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1v-.5A4.5 4.5 0 0 0 10.5 3h-2V1.866ZM14 7.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.5A3.5 3.5 0 0 1 5.5 4h5A3.5 3.5 0 0 1 14 7.5Z"/>
                    </svg>
                    AI助手
                </span>
                <span class="message-time">${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="message-content"><span class="blinking-cursor">|</span></div>
        `;
        historyEl.appendChild(assistantDiv);
        const contentDiv = assistantDiv.querySelector('.message-content');
        historyEl.scrollTop = historyEl.scrollHeight;
        
        const patentInfo = chatState.patentData;
        
        const safeValue = (val) => {
            if (!val) return '未知';
            if (Array.isArray(val)) return val.length > 0 ? val.join(', ') : '未知';
            return val;
        };
        
        let contextInfo = `你是一个专业的专利分析助手。当前正在分析专利号为 ${patentNumber} 的专利。

## 专利完整信息

### 基本信息
- **专利号**: ${patentInfo.patent_number || patentNumber}
- **标题**: ${patentInfo.title || '无标题'}
- **申请日期**: ${patentInfo.application_date || '未知'}
- **公开日期**: ${patentInfo.publication_date || '未知'}
- **授权日期**: ${patentInfo.grant_date || '未知'}
- **优先权日期**: ${patentInfo.priority_date || '未知'}
- **法律状态**: ${patentInfo.legal_status || '未知'}

### 申请人与发明人
- **申请人/受让人**: ${safeValue(patentInfo.assignees || patentInfo.applicant)}
- **发明人**: ${safeValue(patentInfo.inventors || patentInfo.inventor)}

### 分类信息
- **IPC分类**: ${patentInfo.ipc_classification || '未知'}
- **CPC分类**: ${patentInfo.cpc_classification || '未知'}

### 摘要
${patentInfo.abstract || '无摘要'}

### 权利要求
${patentInfo.claims ? patentInfo.claims.slice(0, 5).map((c, i) => `${i + 1}. ${c}`).join('\n\n') : '无权利要求信息'}

${patentInfo.description ? `### 说明书摘要\n${patentInfo.description.substring(0, 500)}...\n` : ''}

${patentInfo.patent_citations && patentInfo.patent_citations.length > 0 ? `### 引用专利\n${patentInfo.patent_citations.slice(0, 5).map(c => `- ${c.patent_number}: ${c.title || '无标题'}`).join('\n')}\n` : ''}

${patentInfo.cited_by && patentInfo.cited_by.length > 0 ? `### 被引用专利\n${patentInfo.cited_by.slice(0, 5).map(c => `- ${c.patent_number}: ${c.title || '无标题'}`).join('\n')}\n` : ''}

${patentInfo.legal_events && patentInfo.legal_events.length > 0 ? `### 法律事件\n${patentInfo.legal_events.slice(0, 3).map(e => `- ${e.date}: ${e.event}`).join('\n')}\n` : ''}

请基于以上完整的专利信息，准确、专业地回答用户的问题。回答时可以使用Markdown格式来组织内容，使其更易读。`;

        const apiMessages = [
            {
                role: 'system',
                content: contextInfo
            },
            ...chatState.messages.filter(m => m.role !== 'system')
        ];
        
        const requestBody = {
            model: patentChatState.currentModel,
            messages: apiMessages,
            temperature: 0.7,
            stream: true
        };
        
        if (patentChatState.currentProvider === 'aliyun') {
            requestBody.provider = 'aliyun';
        }
        
        const shouldEnableThinking = patentChatSupportsThinking(patentChatState.currentModel, patentChatState.currentProvider) && 
            (patentChatState.thinkingMode.enabled || patentChatIsThinkingOnlyModel(patentChatState.currentModel));
        
        if (shouldEnableThinking) {
            requestBody.enable_thinking = true;
            if (patentChatState.thinkingMode.budget) {
                requestBody.thinking_budget = patentChatState.thinkingMode.budget;
            }
            console.log('[Patent Chat] 深度思考模式已启用');
        }
        
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (patentChatState.currentProvider === 'aliyun') {
            const aliyunKey = localStorage.getItem('aliyun_api_key') || window.appState?.aliyunApiKey;
            if (aliyunKey) {
                headers['X-LLM-Provider'] = 'aliyun';
                headers['Authorization'] = `Bearer ${aliyunKey}`;
            }
        } else {
            const apiKey = appState.apiKey || localStorage.getItem('globalApiKey') || localStorage.getItem('zhipu_api_key');
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
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        let reasoningContent = '';
        let buffer = '';
        let lastRenderTime = 0;
        const RENDER_INTERVAL = 100;
        
        while (true) {
            if (patentChatState.stopStreaming) {
                console.log('[Patent Chat] 用户终止输出');
                break;
            }
            
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
                    const delta = parsed.choices?.[0]?.delta;
                    
                    if (delta?.reasoning_content) {
                        reasoningContent += delta.reasoning_content;
                        updatePatentChatMessageContent(contentDiv, fullContent, reasoningContent, true);
                    }
                    
                    if (delta?.content) {
                        fullContent += delta;
                        
                        const now = Date.now();
                        if (now - lastRenderTime > RENDER_INTERVAL) {
                            updatePatentChatMessageContent(contentDiv, fullContent, reasoningContent, reasoningContent ? false : undefined);
                            lastRenderTime = now;
                        }
                    }
                } catch (e) {
                    console.warn('解析流式数据失败:', e);
                }
            }
        }
        
        assistantDiv.classList.remove('streaming');
        finalizePatentChatMessage(contentDiv, fullContent, reasoningContent);
        
        chatState.messages.push({
            role: 'assistant',
            content: fullContent || '抱歉，我无法回答这个问题。',
            reasoningContent: reasoningContent,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('发送消息失败:', error);
        
        const historyEl = getEl('patent_chat_history');
        const streamingDiv = historyEl ? historyEl.querySelector('.streaming') : null;
        if (streamingDiv) streamingDiv.remove();
        
        chatState.messages.push({
            role: 'assistant',
            content: `抱歉，发生错误：${error.message}`,
            timestamp: new Date().toISOString()
        });
        updateChatHistory(patentNumber);
        
    } finally {
        input.disabled = false;
        sendBtn.disabled = false;
        sendBtn.style.display = 'inline-flex';
        if (stopBtn) stopBtn.style.display = 'none';
        input.focus();
    }
}

function updatePatentChatMessageContent(contentDiv, content, reasoningContent = '', isThinking = false) {
    if (!contentDiv) return;
    
    if (isThinking && reasoningContent) {
        contentDiv.innerHTML = `
            <div class="thinking-container">
                <div class="thinking-header" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none';">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7"></circle><path d="M8 12v-4M8 6h.01"/></svg>
                    <span class="thinking-title">深度思考中...</span>
                    <span class="thinking-toggle-icon">▼</span>
                </div>
                <div class="thinking-content">
                    <span class="thinking-text">${escapeHtml(reasoningContent)}</span>
                    <span class="blinking-cursor">|</span>
                </div>
            </div>
            <div class="response-content"><span class="blinking-cursor">|</span></div>
        `;
    } else if (reasoningContent) {
        const responseEl = contentDiv.querySelector('.response-content');
        if (responseEl) {
            responseEl.innerHTML = formatMessageContent(content) + '<span class="blinking-cursor">|</span>';
        }
    } else {
        contentDiv.textContent = content;
        contentDiv.innerHTML += '<span class="blinking-cursor">|</span>';
    }
    
    const historyEl = getEl('patent_chat_history');
    if (historyEl) historyEl.scrollTop = historyEl.scrollHeight;
}

function finalizePatentChatMessage(contentDiv, content, reasoningContent = '') {
    if (!contentDiv) return;
    
    if (reasoningContent) {
        contentDiv.innerHTML = `
            <div class="thinking-container">
                <div class="thinking-header" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none';">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7"></circle><path d="M8 12v-4M8 6h.01"/></svg>
                    <span class="thinking-title">深度思考完成</span>
                    <span class="thinking-toggle-icon">▶</span>
                </div>
                <div class="thinking-content" style="display: none;">
                    <div class="thinking-text">${escapeHtml(reasoningContent)}</div>
                </div>
            </div>
            <div class="response-content">${formatMessageContent(content)}</div>
        `;
    } else {
        contentDiv.innerHTML = formatMessageContent(content);
    }
    
    const historyEl = getEl('patent_chat_history');
    if (historyEl) historyEl.scrollTop = historyEl.scrollHeight;
}

function clearPatentChat() {
    const modal = getEl('patent_chat_modal');
    if (!modal) return;
    
    const patentNumber = modal.dataset.currentPatent;
    const chatState = appState.patentBatch.patentChats[patentNumber];
    
    if (!chatState) return;
    
    if (!confirm('确定要清空对话历史吗？')) {
        return;
    }
    
    chatState.messages = [];
    updateChatHistory(patentNumber);
}

function exportPatentChat() {
    const modal = getEl('patent_chat_modal');
    if (!modal) return;
    
    const patentNumber = modal.dataset.currentPatent;
    const chatState = appState.patentBatch.patentChats[patentNumber];
    
    if (!chatState || chatState.messages.length === 0) {
        alert('没有对话历史可导出');
        return;
    }
    
    let content = `专利对话记录\n`;
    content += `专利号：${patentNumber}\n`;
    content += `专利标题：${chatState.patentData.title || '无标题'}\n`;
    content += `导出时间：${new Date().toLocaleString()}\n`;
    content += `\n${'='.repeat(60)}\n\n`;
    
    chatState.messages.forEach(msg => {
        if (msg.role === 'system') return;
        
        const roleLabel = msg.role === 'user' ? '用户' : 'AI助手';
        const time = new Date(msg.timestamp).toLocaleString();
        
        content += `【${roleLabel}】 ${time}\n`;
        content += `${msg.content}\n\n`;
    });
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `专利对话_${patentNumber}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
}

async function initPatentChat() {
    await initPatentChatProviders();
    
    const sendBtn = getEl('patent_chat_send_btn');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendPatentChatMessage);
    }
    
    const stopBtn = getEl('patent_chat_stop_btn');
    if (stopBtn) {
        stopBtn.addEventListener('click', () => patentChatState.stopStreaming = true);
    }
    
    const input = getEl('patent_chat_input');
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendPatentChatMessage();
            }
        });
    }
    
    const closeBtn = getEl('patent_chat_close_btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closePatentChat);
    }
    
    const clearBtn = getEl('patent_chat_clear_btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearPatentChat);
    }
    
    const exportBtn = getEl('patent_chat_export_btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportPatentChat);
    }
    
    const providerSelect = document.getElementById('patent_chat_provider');
    if (providerSelect) {
        providerSelect.addEventListener('change', (e) => {
            patentChatState.currentProvider = e.target.value;
            localStorage.setItem('llm_provider', patentChatState.currentProvider);
            updatePatentChatModelSelect();
            updatePatentChatThinkingButton();
            console.log('[Patent Chat] 切换服务商:', patentChatState.currentProvider);
        });
    }
    
    const modelSelect = document.getElementById('patent_chat_model');
    if (modelSelect) {
        modelSelect.addEventListener('change', (e) => {
            patentChatState.currentModel = e.target.value;
            updatePatentChatThinkingButton();
            console.log('[Patent Chat] 切换模型:', patentChatState.currentModel);
        });
    }
    
    const thinkingBtn = document.getElementById('patent_chat_thinking_btn');
    if (thinkingBtn) {
        thinkingBtn.addEventListener('click', togglePatentChatThinkingMode);
    }
    
    window.addEventListener('providerChanged', () => {
        if (patentChatState.providers && window.ProviderManager) {
            patentChatState.currentProvider = window.ProviderManager.getProvider();
            updatePatentChatProviderSelect();
            updatePatentChatModelSelect();
            updatePatentChatThinkingButton();
        }
    });
}

globalThis.initPatentChat = initPatentChat;
globalThis.openPatentChat = openPatentChat;
globalThis.closePatentChat = closePatentChat;
globalThis.sendPatentChatMessage = sendPatentChatMessage;
globalThis.clearPatentChat = clearPatentChat;
globalThis.exportPatentChat = exportPatentChat;
