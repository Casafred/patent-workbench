// js/modules/chat/chat-search.js
// Search functionality for web search integration

// Default search configuration
const DEFAULT_SEARCH_CONFIG = {
    enabled: false,
    searchEngine: 'search_pro',
    count: 5,
    contentSize: 'medium'
};

/**
 * Get current conversation's search mode config
 * @returns {Object} Search mode config for current conversation
 */
function getCurrentConversationSearchMode() {
    const convo = appState.chat.conversations.find(c => c.id === appState.chat.currentConversationId);
    if (!convo) return { ...DEFAULT_SEARCH_CONFIG };
    
    // Initialize searchMode if not exists
    if (!convo.searchMode) {
        convo.searchMode = { ...DEFAULT_SEARCH_CONFIG };
    }
    return convo.searchMode;
}

/**
 * Update current conversation's search mode config
 * @param {Object} updates - Config updates
 */
function updateCurrentConversationSearchMode(updates) {
    const convo = appState.chat.conversations.find(c => c.id === appState.chat.currentConversationId);
    if (!convo) return;
    
    if (!convo.searchMode) {
        convo.searchMode = { ...DEFAULT_SEARCH_CONFIG };
    }
    
    convo.searchMode = { ...convo.searchMode, ...updates };
    saveConversations();
}

/**
 * Toggle search mode on/off for current conversation
 */
function toggleSearchMode() {
    const currentMode = getCurrentConversationSearchMode();
    const newEnabled = !currentMode.enabled;
    
    updateCurrentConversationSearchMode({ enabled: newEnabled });
    
    console.log('🔍 [联网搜索] 搜索模式切换:', {
        conversationId: appState.chat.currentConversationId,
        enabled: newEnabled,
        searchEngine: currentMode.searchEngine,
        count: currentMode.count,
        contentSize: currentMode.contentSize
    });
    
    updateSearchButtonState();
    
    if (newEnabled) {
        console.log('🔍 [联网搜索] 显示配置弹窗');
        showSearchConfig();
    } else {
        console.log('🔍 [联网搜索] 已关闭');
    }
}

/**
 * Update search button visual state based on current conversation
 */
function updateSearchButtonState() {
    const chatSearchBtn = document.getElementById('chat_search_btn');
    if (!chatSearchBtn) return;
    
    const searchMode = getCurrentConversationSearchMode();
    const provider = appState.provider || 'zhipu';
    
    // Remove existing indicator
    const existingIndicator = document.getElementById('search_indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    if (searchMode.enabled) {
        chatSearchBtn.style.backgroundColor = 'var(--primary-color)';
        chatSearchBtn.style.color = 'white';
        
        if (provider === 'aliyun') {
            chatSearchBtn.title = '阿里云联网搜索已启用 - 点击关闭';
        } else {
            chatSearchBtn.title = '联网搜索已启用 - 点击关闭';
        }
        
        const indicator = document.createElement('div');
        indicator.id = 'search_indicator';
        indicator.style.cssText = `
            position: absolute;
            top: -25px;
            left: 0;
            background-color: var(--primary-color);
            color: white;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `;
        
        if (provider === 'aliyun') {
            indicator.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                </svg>
                <span>阿里云联网搜索已启用</span>
            `;
        } else {
            indicator.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                </svg>
                <span>联网搜索已启用 (${searchMode.searchEngine})</span>
            `;
        }
        
        const inputArea = document.getElementById('chat_input_area');
        if (inputArea) {
            inputArea.style.position = 'relative';
            inputArea.insertBefore(indicator, inputArea.firstChild);
        }
    } else {
        chatSearchBtn.style.backgroundColor = '';
        chatSearchBtn.style.color = '';
        if (provider === 'aliyun') {
            chatSearchBtn.title = '开启联网搜索 (阿里云)';
        } else {
            chatSearchBtn.title = '开启联网搜索 (智谱网络搜索API)';
        }
    }
}

/**
 * Handle search button click
 */
function handleSearch() {
    toggleSearchMode();
}

/**
 * Show search configuration modal
 */
function showSearchConfig() {
    const searchMode = getCurrentConversationSearchMode();
    const provider = appState.provider || 'zhipu';
    
    const optionsModal = document.createElement('div');
    optionsModal.className = 'search-config-popup';
    optionsModal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: white;
        padding: 20px;
        border-radius: 8px;
        width: 80%;
        max-width: 500px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        z-index: 9999;
        animation: fadeIn 0.3s ease-out;
    `;
    
    const modalHeader = document.createElement('div');
    modalHeader.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 1px solid #e0e0e0;
    `;
    
    const modalTitle = document.createElement('h3');
    if (provider === 'aliyun') {
        modalTitle.textContent = '阿里云联网搜索配置';
    } else {
        modalTitle.textContent = '联网搜索配置';
    }
    modalTitle.style.margin = '0';
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #999;
    `;
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(optionsModal);
    });
    
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeBtn);
    optionsModal.appendChild(modalHeader);
    
    const infoText = document.createElement('div');
    infoText.style.cssText = `
        background-color: #f0f7ff;
        border-left: 4px solid var(--primary-color);
        padding: 12px;
        margin-bottom: 20px;
        font-size: 13px;
        color: #333;
        line-height: 1.5;
    `;
    
    if (provider === 'aliyun') {
        infoText.innerHTML = `
            <strong>💡 功能说明：</strong><br>
            启用后，阿里云通义千问模型将自动利用互联网信息增强回答内容。
            <br><br>
            <strong>✨ 特性：</strong><br>
            • 自动搜索：模型根据问题自动检索相关网络信息<br>
            • 智能整合：将搜索结果与 AI 知识无缝融合<br>
            • 来源标注：回答中会自动标注信息来源链接<br>
            <br>
            <strong>📋 支持模型：</strong><br>
            qwen-plus、qwen-turbo、qwen-flash、qwen3-max 等
        `;
    } else {
        infoText.innerHTML = `
            <strong>💡 功能说明：</strong><br>
            启用后，AI 将自动调用智谱网络搜索 API 获取最新信息，并结合搜索结果生成回答。
            搜索结果会自动标注来源链接。
            <br><br>
            <strong>✨ 特性：</strong><br>
            • 多引擎选择：支持智谱基础版、高级版、搜狗、夸克等搜索引擎<br>
            • 可配置数量：自定义返回搜索结果条数（1-50 条）<br>
            • 内容长度：选择返回摘要或完整内容
        `;
    }
    optionsModal.appendChild(infoText);
    
    const optionsForm = document.createElement('form');
    optionsForm.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 15px;
    `;
    
    if (provider === 'aliyun') {
        const infoDiv = document.createElement('div');
        infoDiv.style.cssText = `
            background-color: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 12px;
            font-size: 13px;
            color: #333;
            line-height: 1.6;
        `;
        infoDiv.innerHTML = `
            <strong>📌 阿里云联网搜索说明：</strong><br>
            • 使用方式：通过 <code>enable_search</code> 参数启用，模型自动处理搜索和整合<br>
            • 搜索策略：基于夸克搜索引擎，智能检索相关信息<br>
            • 引用格式：回答中使用 <code>[ref_1]</code>、<code>[ref_2]</code> 等格式标注来源<br>
            • 适用场景：时事新闻、科技动态、政策法规等需要最新信息的场景<br>
            <br>
            <strong style="color: #f57c00;">⚠️ 注意事项：</strong><br>
            • 无需手动配置搜索引擎和数量，由模型自动决定最优搜索策略<br>
            • 部分模型（如 qwen3-max）在思考模式下搜索效果更佳
        `;
        optionsForm.appendChild(infoDiv);
    } else {
        // Engine selection - only for zhipu
        const engineGroup = document.createElement('div');
        engineGroup.style.cssText = `display: flex; flex-direction: column; gap: 5px;`;
        
        const engineLabel = document.createElement('label');
        engineLabel.textContent = '搜索引擎类型:';
        engineLabel.style.fontWeight = '500';
        
        const engineSelect = document.createElement('select');
        engineSelect.id = 'search_engine_select';
        engineSelect.style.cssText = `padding: 8px; border: 1px solid #e0e0e0; border-radius: 4px; font-size: 14px;`;
        
        const engineOptions = [
            { value: 'search_std', text: '智谱基础版 (0.01元/次)', description: '满足日常查询需求，性价比极高' },
            { value: 'search_pro', text: '智谱高级版 (0.03元/次) 推荐', description: '多引擎协作，召回率和准确率大幅提升' },
            { value: 'search_pro_sogou', text: '搜狗 (0.05元/次)', description: '覆盖腾讯生态和知乎内容' },
            { value: 'search_pro_quark', text: '夸克 (0.05元/次)', description: '精准触达垂直内容' }
        ];
        
        engineOptions.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option.value;
            optionEl.textContent = option.text;
            optionEl.title = option.description;
            if (option.value === searchMode.searchEngine) {
                optionEl.selected = true;
            }
            engineSelect.appendChild(optionEl);
        });
        
        const engineDesc = document.createElement('div');
        engineDesc.style.cssText = `font-size: 12px; color: #666; margin-top: 4px;`;
        engineDesc.textContent = engineOptions.find(o => o.value === searchMode.searchEngine)?.description || '';
        
        engineSelect.addEventListener('change', () => {
            const selectedOption = engineOptions.find(o => o.value === engineSelect.value);
            engineDesc.textContent = selectedOption?.description || '';
        });
        
        engineGroup.appendChild(engineLabel);
        engineGroup.appendChild(engineSelect);
        engineGroup.appendChild(engineDesc);
        optionsForm.appendChild(engineGroup);
        
        // Count selection - only for zhipu
        const countGroup = document.createElement('div');
        countGroup.style.cssText = `display: flex; flex-direction: column; gap: 5px;`;
        
        const countLabel = document.createElement('label');
        countLabel.textContent = '返回结果条数:';
        countLabel.style.fontWeight = '500';
        
        const countSelect = document.createElement('select');
        countSelect.id = 'search_count_select';
        countSelect.style.cssText = `padding: 8px; border: 1px solid #e0e0e0; border-radius: 4px; font-size: 14px;`;
        
        const countOptions = [1, 5, 10, 20, 30, 40, 50];
        countOptions.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option;
            optionEl.textContent = option;
            if (option === searchMode.count) {
                optionEl.selected = true;
            }
            countSelect.appendChild(optionEl);
        });
        
        const countDesc = document.createElement('div');
        countDesc.style.cssText = `font-size: 12px; color: #666; margin-top: 4px;`;
        countDesc.textContent = '建议5-10条，过多会增加响应时间';
        
        countGroup.appendChild(countLabel);
        countGroup.appendChild(countSelect);
        countGroup.appendChild(countDesc);
        optionsForm.appendChild(countGroup);
        
        // Content size selection - only for zhipu
        const contentGroup = document.createElement('div');
        contentGroup.style.cssText = `display: flex; flex-direction: column; gap: 5px;`;
        
        const contentLabel = document.createElement('label');
        contentLabel.textContent = '返回内容长度:';
        contentLabel.style.fontWeight = '500';
        
        const contentSelect = document.createElement('select');
        contentSelect.id = 'search_content_select';
        contentSelect.style.cssText = `padding: 8px; border: 1px solid #e0e0e0; border-radius: 4px; font-size: 14px;`;
        
        const contentOptions = [
            { value: 'medium', text: '中等（摘要信息）', description: '适合快速获取关键信息' },
            { value: 'high', text: '详细（完整内容）', description: '适合深度分析和详细解答' }
        ];
        
        contentOptions.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option.value;
            optionEl.textContent = option.text;
            if (option.value === searchMode.contentSize) {
                optionEl.selected = true;
            }
            contentSelect.appendChild(optionEl);
        });
        
        const contentDesc = document.createElement('div');
        contentDesc.style.cssText = `font-size: 12px; color: #666; margin-top: 4px;`;
        contentDesc.textContent = contentOptions.find(o => o.value === searchMode.contentSize)?.description || '';
        
        contentSelect.addEventListener('change', () => {
            const selectedOption = contentOptions.find(o => o.value === contentSelect.value);
            contentDesc.textContent = selectedOption?.description || '';
        });
        
        contentGroup.appendChild(contentLabel);
        contentGroup.appendChild(contentSelect);
        contentGroup.appendChild(contentDesc);
        optionsForm.appendChild(contentGroup);
    }
    
    optionsModal.appendChild(optionsForm);
    
    const modalFooter = document.createElement('div');
    modalFooter.style.cssText = `
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 20px;
        padding-top: 10px;
        border-top: 1px solid #e0e0e0;
    `;
    
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'small-button';
    saveBtn.style.cssText = `
        background-color: var(--primary-color);
        color: white;
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
    `;
    saveBtn.textContent = '保存并启用';
    saveBtn.addEventListener('click', () => {
        if (provider === 'aliyun') {
            updateCurrentConversationSearchMode({
                searchEngine: 'aliyun_enable_search',
                count: 5,
                contentSize: 'medium'
            });
        } else {
            const engineSelect = document.getElementById('search_engine_select');
            const countSelect = document.getElementById('search_count_select');
            const contentSelect = document.getElementById('search_content_select');
            
            updateCurrentConversationSearchMode({
                searchEngine: engineSelect ? engineSelect.value : searchMode.searchEngine,
                count: countSelect ? parseInt(countSelect.value) : searchMode.count,
                contentSize: contentSelect ? contentSelect.value : searchMode.contentSize
            });
        }
        
        updateSearchButtonState();
        document.body.removeChild(optionsModal);
        
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #4caf50;
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        if (provider === 'aliyun') {
            toast.textContent = '✓ 阿里云联网搜索配置已保存并启用';
        } else {
            toast.textContent = '✓ 联网搜索配置已保存并启用';
        }
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 2000);
    });
    
    modalFooter.appendChild(saveBtn);
    optionsModal.appendChild(modalFooter);
    
    document.body.appendChild(optionsModal);
}
