// js/modules/chat/chat-export.js
// Export functionality for chat history

/**
 * Export chat history in various formats
 * @param {string} format - Export format (txt, txt-selected, pdf, png)
 */
async function exportChatHistory(format = 'txt') {
    const convo = appState.chat.conversations.find(c => c.id === appState.chat.currentConversationId);
    if (!convo || convo.messages.length <= 1) return alert("没有聊天记录可导出。");

    const personaName = appState.chat.personas[convo.personaId].name;
    const conversationTitle = convo.title || '未命名对话';
    const filename = `聊天记录_${conversationTitle}_${personaName}_${new Date().toISOString().slice(0,10)}`;

    // Handle selected messages export
    if (format === 'txt-selected') {
        const selectedCheckboxes = document.querySelectorAll('#chat_window input[type="checkbox"]:checked');
        if (selectedCheckboxes.length === 0) {
            return alert("请先选择要导出的消息");
        }
        
        const selectedIndices = Array.from(selectedCheckboxes).map(cb => parseInt(cb.closest('.chat-message').dataset.index));
        const selectedMessages = convo.messages.filter((msg, idx) => selectedIndices.includes(idx) && msg.role !== 'system');
        
        if (selectedMessages.length === 0) {
            return alert("没有选中有效的消息");
        }
        
        let content = `聊天记录（选中部分） - ${conversationTitle}\n角色: ${personaName}\n导出时间: ${new Date().toLocaleString()}\n========================\n\n`;
        selectedMessages.forEach(msg => {
            const timestamp = msg.timestamp ? new Date(msg.timestamp).toLocaleString('zh-CN') : '未知时间';
            content += `[${msg.role.toUpperCase()}] - ${timestamp}\n${msg.content}\n\n------------------------\n\n`;
        });
        
        downloadTextFile(content, `${filename}_选中部分.txt`);
        return;
    }

    // Handle TXT export
    if (format === 'txt') {
        let content = `聊天记录 - ${conversationTitle}\n角色: ${personaName}\n导出时间: ${new Date().toLocaleString()}\n========================\n\n`;
        convo.messages.forEach(msg => { 
            if (msg.role !== 'system') {
                const timestamp = msg.timestamp ? new Date(msg.timestamp).toLocaleString('zh-CN') : '未知时间';
                content += `[${msg.role.toUpperCase()}] - ${timestamp}\n${msg.content}\n\n------------------------\n\n`; 
            }
        });
        downloadTextFile(content, `${filename}.txt`);
    } 
    // Handle PDF export
    else if (format === 'pdf') {
        await exportToPDF(convo, conversationTitle, personaName, filename);
    } 
    // Handle PNG export
    else if (format === 'png') {
        await exportToPNG(convo, conversationTitle, personaName, filename);
    }
}

/**
 * Download text file
 * @param {string} content - File content
 * @param {string} filename - File name
 */
function downloadTextFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}

/**
 * Export chat to PDF
 * @param {Object} convo - Conversation object
 * @param {string} conversationTitle - Conversation title
 * @param {string} personaName - Persona name
 * @param {string} filename - Base filename
 */
async function exportToPDF(convo, conversationTitle, personaName, filename) {
    alert("正在生成PDF，请稍候...");
    
    if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
        alert("PDF库未加载，请刷新页面后重试");
        return;
    }
    
    const { jsPDF } = window.jspdf;
    
    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 800px;
        background-color: #ffffff;
        padding: 30px;
        font-family: Arial, sans-serif;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
    `;
    
    // Add title
    const titleDiv = document.createElement('div');
    titleDiv.style.cssText = `
        margin-bottom: 30px;
        text-align: center;
        border-bottom: 2px solid #e0e0e0;
        padding-bottom: 20px;
    `;
    
    const mainTitle = document.createElement('h1');
    mainTitle.style.cssText = `font-size: 28px; margin: 0 0 15px 0; color: #333;`;
    mainTitle.textContent = conversationTitle;
    
    const subtitle = document.createElement('div');
    subtitle.style.cssText = `font-size: 16px; color: #666;`;
    subtitle.innerHTML = `角色: ${personaName}<br>导出时间: ${new Date().toLocaleString()}`;
    
    titleDiv.appendChild(mainTitle);
    titleDiv.appendChild(subtitle);
    tempContainer.appendChild(titleDiv);
    
    // Add messages
    convo.messages.forEach((msg) => {
        if (msg.role !== 'system') {
            const msgDiv = document.createElement('div');
            msgDiv.style.cssText = `
                margin-bottom: 20px;
                padding: 20px;
                border-radius: 10px;
                background-color: ${msg.role === 'user' ? '#f8f9fa' : '#e3f2fd'};
                border-left: 4px solid ${msg.role === 'user' ? '#007bff' : '#2196f3'};
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            `;
            
            const roleSpan = document.createElement('div');
            roleSpan.style.cssText = `
                font-weight: bold;
                margin-bottom: 10px;
                font-size: 16px;
                color: ${msg.role === 'user' ? '#007bff' : '#2196f3'};
            `;
            roleSpan.textContent = msg.role === 'user' ? '👤 用户消息' : '🤖 AI回复';
            
            const contentDiv = document.createElement('div');
            contentDiv.style.cssText = `
                line-height: 1.6;
                font-size: 14px;
                color: #333;
                white-space: pre-wrap;
                word-wrap: break-word;
            `;
            contentDiv.textContent = msg.content;
            
            msgDiv.appendChild(roleSpan);
            msgDiv.appendChild(contentDiv);
            tempContainer.appendChild(msgDiv);
        }
    });
    
    document.body.appendChild(tempContainer);
    
    try {
        const canvas = await html2canvas(tempContainer, { 
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            scrollX: 0,
            scrollY: 0,
            height: tempContainer.scrollHeight,
            width: tempContainer.scrollWidth,
            logging: false
        });
        
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        
        let position = 0;
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }
        
        pdf.save(`${filename}.pdf`);
        
    } catch (e) {
        console.error("PDF导出失败:", e);
        alert("PDF导出失败，请查看控制台获取详细信息");
    } finally {
        document.body.removeChild(tempContainer);
    }
}

/**
 * Export chat to PNG
 * @param {Object} convo - Conversation object
 * @param {string} conversationTitle - Conversation title
 * @param {string} personaName - Persona name
 * @param {string} filename - Base filename
 */
async function exportToPNG(convo, conversationTitle, personaName, filename) {
    alert("正在生成图片，请稍候... 对于很长的聊天记录，这可能需要一些时间。");
    
    if (typeof window.html2canvas === 'undefined') {
        alert("图片导出库未加载，请刷新页面后重试");
        return;
    }
    
    const chatWindow = document.getElementById('chat_window');
    const chatWindowStyles = chatWindow ? getComputedStyle(chatWindow) : null;
    const bgColor = chatWindowStyles?.backgroundColor || '#ffffff';
    const fontFamily = chatWindowStyles?.fontFamily || 'Arial, sans-serif';
    
    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 800px;
        background-color: ${bgColor};
        padding: 20px;
        font-family: ${fontFamily};
    `;
    
    // Add title
    const titleDiv = document.createElement('div');
    titleDiv.style.cssText = `
        margin-bottom: 20px;
        text-align: center;
        border-bottom: 2px solid #ccc;
        padding-bottom: 10px;
    `;
    
    const mainTitle = document.createElement('h1');
    mainTitle.style.cssText = `font-size: 24px; margin: 0 0 10px 0;`;
    mainTitle.textContent = conversationTitle;
    
    const subtitle = document.createElement('div');
    subtitle.style.cssText = `font-size: 14px; color: #666;`;
    subtitle.innerHTML = `角色: ${personaName}<br>时间: ${new Date().toLocaleString()}`;
    
    titleDiv.appendChild(mainTitle);
    titleDiv.appendChild(subtitle);
    tempContainer.appendChild(titleDiv);
    
    // Add messages
    convo.messages.forEach((msg) => {
        if (msg.role !== 'system') {
            const msgDiv = document.createElement('div');
            msgDiv.style.cssText = `
                margin-bottom: 15px;
                padding: 15px;
                border-radius: 8px;
                background-color: ${msg.role === 'user' ? '#e3f2fd' : '#f5f5f5'};
            `;
            
            const roleSpan = document.createElement('div');
            roleSpan.style.cssText = `font-weight: bold; margin-bottom: 8px;`;
            roleSpan.textContent = msg.role === 'user' ? '用户' : 'AI';
            
            const contentDiv = document.createElement('div');
            contentDiv.style.cssText = `white-space: pre-wrap; word-wrap: break-word;`;
            contentDiv.textContent = msg.content;
            
            msgDiv.appendChild(roleSpan);
            msgDiv.appendChild(contentDiv);
            tempContainer.appendChild(msgDiv);
        }
    });
    
    document.body.appendChild(tempContainer);
    
    try {
        const canvas = await html2canvas(tempContainer, {
            scale: 2,
            useCORS: true,
            backgroundColor: bgColor,
            logging: false
        });
        
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}.png`;
            a.click();
            URL.revokeObjectURL(url);
        }, 'image/png');
        
    } catch (e) {
        console.error("PNG导出失败:", e);
        alert("PNG导出失败，请查看控制台获取详细信息");
    } finally {
        document.body.removeChild(tempContainer);
    }
}

/**
 * Copy message content to clipboard and sync with SmartClipboard
 * @param {HTMLElement} buttonElement - Copy button element
 */
function copyMessage(buttonElement) {
    const messageEl = buttonElement.closest('.chat-message');
    const contentEl = messageEl.querySelector('.message-content');
    const textContent = contentEl.textContent || contentEl.innerText;
    
    navigator.clipboard.writeText(textContent).then(() => {
        // 同步到智能剪贴板
        if (window.smartClipboard) {
            window.smartClipboard.export(textContent, '功能一-即时对话', {
                source: '快捷复制按钮',
                timestamp: Date.now()
            });
        }
        
        const originalHTML = buttonElement.innerHTML;
        buttonElement.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>';
        setTimeout(() => {
            buttonElement.innerHTML = originalHTML;
        }, 1500);
    }).catch(err => {
        console.error('复制失败:', err);
        alert('复制失败，请手动复制');
    });
}
