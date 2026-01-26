// =================================================================================
// 专利对话功能模块
// =================================================================================

// 初始化模态框拖动功能
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
        // 不拖动关闭按钮
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
        
        // 限制在视口内
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

// 打开专利对话窗口
function openPatentChat(patentNumber) {
    // 查找专利数据
    const patent = appState.patentBatch.patentResults.find(p => p.patent_number === patentNumber);
    
    if (!patent || !patent.success) {
        alert('未找到专利数据');
        return;
    }
    
    // 初始化对话状态
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
    
    // 显示弹窗（不使用flex，直接显示）
    const modal = getEl('patent_chat_modal');
    if (modal) {
        modal.style.display = 'block';
        // 初始化拖动功能
        initModalDrag(modal);
    }
    
    // 更新弹窗内容
    updatePatentChatModal(patentNumber);
    
    // 聚焦输入框
    const input = getEl('patent_chat_input');
    if (input) {
        setTimeout(() => input.focus(), 100);
    }
}

// 关闭专利对话窗口
function closePatentChat() {
    const modal = getEl('patent_chat_modal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // 标记为关闭
    const currentPatentNumber = modal.dataset.currentPatent;
    if (currentPatentNumber && appState.patentBatch.patentChats[currentPatentNumber]) {
        appState.patentBatch.patentChats[currentPatentNumber].isOpen = false;
    }
}

// 更新对话弹窗内容
function updatePatentChatModal(patentNumber) {
    const modal = getEl('patent_chat_modal');
    const chatState = appState.patentBatch.patentChats[patentNumber];
    
    if (!modal || !chatState) return;
    
    // 保存当前专利号
    modal.dataset.currentPatent = patentNumber;
    
    // 更新标题
    const titleEl = modal.querySelector('.patent-chat-title');
    if (titleEl) {
        titleEl.textContent = `专利对话：${patentNumber}`;
    }
    
    const subtitleEl = modal.querySelector('.patent-chat-subtitle');
    if (subtitleEl) {
        subtitleEl.textContent = chatState.patentData.title || '无标题';
    }
    
    // 更新对话历史
    updateChatHistory(patentNumber);
}

// 更新对话历史显示
function updateChatHistory(patentNumber) {
    const chatState = appState.patentBatch.patentChats[patentNumber];
    const historyEl = getEl('patent_chat_history');
    
    if (!historyEl || !chatState) return;
    
    historyEl.innerHTML = '';
    
    // 如果没有对话历史，显示欢迎消息
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
    
    // 显示对话历史
    chatState.messages.forEach(msg => {
        if (msg.role === 'system') return; // 不显示system消息
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${msg.role}-message`;
        
        const roleLabel = msg.role === 'user' ? '您' : 'AI助手';
        const roleIcon = msg.role === 'user' 
            ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: text-bottom;"><path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/><path fill-rule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"/></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: text-bottom;"><path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5ZM3 8.062C3 6.76 4.235 5.765 5.53 5.886a26.58 26.58 0 0 0 4.94 0C11.765 5.765 13 6.76 13 8.062v1.157a.933.933 0 0 1-.765.935c-.845.147-2.34.346-4.235.346-1.895 0-3.39-.2-4.235-.346A.933.933 0 0 1 3 9.219V8.062Zm4.542-.827a.25.25 0 0 0-.217.068l-.92.9a24.767 24.767 0 0 1-1.871-.183.25.25 0 0 0-.068.495c.55.076 1.232.149 2.02.193a.25.25 0 0 0 .189-.071l.754-.736.847 1.71a.25.25 0 0 0 .404.062l.932-.97a25.286 25.286 0 0 0 1.922-.188.25.25 0 0 0-.068-.495c-.538.074-1.207.145-1.98.189a.25.25 0 0 0-.166.076l-.754.785-.842-1.7a.25.25 0 0 0-.182-.135Z"/><path d="M8.5 1.866a1 1 0 1 0-1 0V3h-2A4.5 4.5 0 0 0 1 7.5V8a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1v-.5A4.5 4.5 0 0 0 10.5 3h-2V1.866ZM14 7.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.5A3.5 3.5 0 0 1 5.5 4h5A3.5 3.5 0 0 1 14 7.5Z"/></svg>';
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-role">${roleIcon} ${roleLabel}</span>
                <span class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="message-content">${formatMessageContent(msg.content)}</div>
        `;
        
        historyEl.appendChild(messageDiv);
    });
    
    // 滚动到底部
    historyEl.scrollTop = historyEl.scrollHeight;
}

// 格式化消息内容 - 支持Markdown渲染
function formatMessageContent(content) {
    // 检查是否有marked库
    if (typeof marked !== 'undefined') {
        try {
            // 配置marked选项
            marked.setOptions({
                breaks: true,  // 支持GFM换行
                gfm: true,     // 启用GitHub风格的Markdown
                headerIds: false,  // 禁用标题ID
                mangle: false  // 禁用邮箱混淆
            });
            
            // 使用marked渲染Markdown
            return marked.parse(content);
        } catch (e) {
            console.error('Markdown渲染失败:', e);
            // 如果渲染失败，使用简单格式化
            return simpleFormatContent(content);
        }
    } else {
        // 如果没有marked库，使用简单格式化
        return simpleFormatContent(content);
    }
}

// 简单格式化（备用方案）
function simpleFormatContent(content) {
    // 转义HTML
    let formatted = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // 转换换行
    formatted = formatted.replace(/\n/g, '<br>');
    
    // 转换粗体
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // 转换斜体
    formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // 转换列表
    formatted = formatted.replace(/^- (.+)$/gm, '<li>$1</li>');
    if (formatted.includes('<li>')) {
        formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    }
    
    return formatted;
}

// 发送消息
async function sendPatentChatMessage() {
    const modal = getEl('patent_chat_modal');
    const input = getEl('patent_chat_input');
    const sendBtn = getEl('patent_chat_send_btn');
    
    if (!modal || !input || !sendBtn) return;
    
    const patentNumber = modal.dataset.currentPatent;
    const chatState = appState.patentBatch.patentChats[patentNumber];
    
    if (!chatState) return;
    
    const userMessage = input.value.trim();
    if (!userMessage) {
        alert('请输入您的问题');
        return;
    }
    
    // 禁用输入和按钮
    input.disabled = true;
    sendBtn.disabled = true;
    sendBtn.textContent = '发送中...';
    
    try {
        // 添加用户消息到历史
        chatState.messages.push({
            role: 'user',
            content: userMessage,
            timestamp: new Date().toISOString()
        });
        
        // 更新显示
        updateChatHistory(patentNumber);
        
        // 清空输入框
        input.value = '';
        
        // 创建AI消息容器（用于流式显示）
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
            <div class="message-content"></div>
        `;
        historyEl.appendChild(assistantDiv);
        const contentDiv = assistantDiv.querySelector('.message-content');
        historyEl.scrollTop = historyEl.scrollHeight;
        
        // 调用流式API
        const reader = await apiCall('/patent/chat', {
            patent_number: patentNumber,
            patent_data: chatState.patentData,
            messages: chatState.messages
        }, 'POST', true); // 启用流式传输
        
        let fullContent = '';
        const decoder = new TextDecoder();
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;
                    
                    try {
                        const parsed = JSON.parse(data);
                        const delta = parsed.choices?.[0]?.delta?.content;
                        if (delta) {
                            fullContent += delta;
                            contentDiv.textContent = fullContent;
                            historyEl.scrollTop = historyEl.scrollHeight;
                        }
                    } catch (e) {
                        console.warn('解析流式数据失败:', e);
                    }
                }
            }
        }
        
        // 移除流式标记
        assistantDiv.classList.remove('streaming');
        
        // 添加AI回复到历史
        chatState.messages.push({
            role: 'assistant',
            content: fullContent || '抱歉，我无法回答这个问题。',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('发送消息失败:', error);
        
        // 移除流式消息
        const historyEl = getEl('patent_chat_history');
        const streamingDiv = historyEl ? historyEl.querySelector('.streaming') : null;
        if (streamingDiv) streamingDiv.remove();
        
        // 显示错误消息
        chatState.messages.push({
            role: 'assistant',
            content: `抱歉，发生错误：${error.message}`,
            timestamp: new Date().toISOString()
        });
        updateChatHistory(patentNumber);
        
    } finally {
        // 恢复输入和按钮
        input.disabled = false;
        sendBtn.disabled = false;
        sendBtn.textContent = '发送';
        input.focus();
    }
}

// 清空对话历史
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

// 导出对话历史
function exportPatentChat() {
    const modal = getEl('patent_chat_modal');
    if (!modal) return;
    
    const patentNumber = modal.dataset.currentPatent;
    const chatState = appState.patentBatch.patentChats[patentNumber];
    
    if (!chatState || chatState.messages.length === 0) {
        alert('没有对话历史可导出');
        return;
    }
    
    // 构建导出内容
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
    
    // 下载文件
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `专利对话_${patentNumber}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
}

// 初始化对话功能
function initPatentChat() {
    // 绑定发送按钮
    const sendBtn = getEl('patent_chat_send_btn');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendPatentChatMessage);
    }
    
    // 绑定输入框回车键
    const input = getEl('patent_chat_input');
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendPatentChatMessage();
            }
        });
    }
    
    // 绑定关闭按钮
    const closeBtn = getEl('patent_chat_close_btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closePatentChat);
    }
    
    // 绑定清空按钮
    const clearBtn = getEl('patent_chat_clear_btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearPatentChat);
    }
    
    // 绑定导出按钮
    const exportBtn = getEl('patent_chat_export_btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportPatentChat);
    }
    
    // 注意：移除了点击模态框外部关闭的功能，因为现在是悬浮窗模式
}

// 暴露到全局
globalThis.initPatentChat = initPatentChat;
globalThis.openPatentChat = openPatentChat;
globalThis.closePatentChat = closePatentChat;
globalThis.sendPatentChatMessage = sendPatentChatMessage;
globalThis.clearPatentChat = clearPatentChat;
globalThis.exportPatentChat = exportPatentChat;
