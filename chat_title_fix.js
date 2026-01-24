// 标题生成优化补丁
// 将此代码添加到 js/chat.js 文件开头（在第一个函数之前）

// 标题生成状态管理 - 防止并发冲突
const titleGenerationState = {
    pending: new Set(),  // 正在生成标题的对话ID
    failed: new Set(),   // 生成失败的对话ID（并发限制）
    lastAttempt: {}      // 最后尝试时间戳
};

// 替换原有的 generateConversationTitle 函数为以下版本：

async function generateConversationTitle(conversation) {
    const nonSystemMessages = conversation.messages.filter(m => m.role !== 'system');
    
    // 检查是否需要生成标题
    if (!conversation || conversation.title !== '' || nonSystemMessages.length < 2) {
        return;
    }
    
    // 防止重复生成
    if (titleGenerationState.pending.has(conversation.id)) {
        console.log('标题生成中，跳过重复请求');
        return;
    }
    
    // 检查是否之前失败过（并发限制）
    if (titleGenerationState.failed.has(conversation.id)) {
        console.log('标题生成已失败（并发限制），跳过');
        return;
    }
    
    // 检查最后尝试时间，避免频繁请求（至少间隔5秒）
    const lastAttempt = titleGenerationState.lastAttempt[conversation.id];
    if (lastAttempt && (Date.now() - lastAttempt) < 5000) {
        console.log('标题生成请求过于频繁，跳过');
        return;
    }

    // 标记为正在生成
    titleGenerationState.pending.add(conversation.id);
    titleGenerationState.lastAttempt[conversation.id] = Date.now();

    const recentMessages = conversation.messages.slice(-2);
    const contentToSummarize = recentMessages.map(m => `${m.role}: ${m.content}`).join('\n\n');

    const titlePrompt = {
        model: 'GLM-4-Flash',  // 使用更快的模型
        messages: [
            { role: 'system', content: '你是一个对话主题提炼专家。你的任务是根据提供的对话内容，用一句话（中文不超过20个字）总结出一个简洁、精炼的标题。直接返回标题文本，不要包含任何引导词、引号或说明。' },
            { role: 'user', content: `请为以下对话生成一个标题：\n\n${contentToSummarize}` }
        ],
        temperature: 0.4,
    };

    try {
        const responseData = await apiCall('/chat', titlePrompt, 'POST');
        const newTitleRaw = responseData.choices[0]?.message?.content;

        if (newTitleRaw) {
            if (conversation.title === '') {
                const newTitle = newTitleRaw.trim().replace(/["'""。,]/g, '').replace(/\s/g, '');
                conversation.title = newTitle;
                saveConversations();
                renderChatHistoryList();
                console.log(`AI生成标题成功: "${newTitle}"`);
            }
        }
    } catch (error) {
        console.error("自动生成标题失败:", error.message);
        
        // 如果是并发限制错误（1302或429），标记为失败，不再重试
        if (error.message && (error.message.includes('1302') || error.message.includes('429'))) {
            titleGenerationState.failed.add(conversation.id);
            console.log('检测到并发限制错误，该对话不再自动生成标题');
        }
    } finally {
        // 移除正在生成标记
        titleGenerationState.pending.delete(conversation.id);
    }
}

// 修改调用位置：
// 将 setTimeout(() => generateConversationTitle(convo), 100);
// 改为 setTimeout(() => generateConversationTitle(convo), 3000);
