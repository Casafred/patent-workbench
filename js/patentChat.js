// =================================================================================
// 专利对话功能模块
// =================================================================================

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
    
    // 显示弹窗
    const modal = getEl('patent_chat_modal');
    if (modal) {
        modal.style.display = 'flex';
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
                <p><strong>👋 欢迎使用专利问一问功能！</strong></p>
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
        const roleIcon = msg.role === 'user' ? '👤' : '🤖';
        
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

// 格式化消息内容
function formatMessageContent(content) {
    // 转义HTML
    let formatted = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // 转换换行
    formatted = formatted.replace(/\n/g, '<br>');
    
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
        
        // 显示加载状态
        const historyEl = getEl('patent_chat_history');
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'chat-message assistant-message loading';
        loadingDiv.innerHTML = `
            <div class="message-header">
                <span class="message-role">🤖 AI助手</span>
            </div>
            <div class="message-content">
                <div class="loading-dots">
                    <span>.</span><span>.</span><span>.</span>
                </div>
            </div>
        `;
        historyEl.appendChild(loadingDiv);
        historyEl.scrollTop = historyEl.scrollHeight;
        
        // 调用API
        const response = await apiCall('/patent/chat', {
            patent_number: patentNumber,
            patent_data: chatState.patentData,
            messages: chatState.messages
        });
        
        // 移除加载状态
        loadingDiv.remove();
        
        // 添加AI回复到历史
        const assistantMessage = response.choices[0]?.message?.content || '抱歉，我无法回答这个问题。';
        chatState.messages.push({
            role: 'assistant',
            content: assistantMessage,
            timestamp: new Date().toISOString()
        });
        
        // 更新显示
        updateChatHistory(patentNumber);
        
    } catch (error) {
        console.error('发送消息失败:', error);
        
        // 移除加载状态
        const loadingDiv = historyEl.querySelector('.loading');
        if (loadingDiv) loadingDiv.remove();
        
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
    
    // 点击模态框外部关闭
    const modal = getEl('patent_chat_modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closePatentChat();
            }
        });
    }
}

// 暴露到全局
globalThis.initPatentChat = initPatentChat;
globalThis.openPatentChat = openPatentChat;
globalThis.closePatentChat = closePatentChat;
globalThis.sendPatentChatMessage = sendPatentChatMessage;
globalThis.clearPatentChat = clearPatentChat;
globalThis.exportPatentChat = exportPatentChat;
