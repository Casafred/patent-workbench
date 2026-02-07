// js/modules/chat/chat-search.js
// Search functionality for web search integration

// Initialize search state
if (!appState.chat.searchMode) {
    appState.chat.searchMode = {
        enabled: false,
        searchEngine: 'search_pro',
        count: 5,
        contentSize: 'medium'
    };
}

/**
 * Toggle search mode on/off
 */
function toggleSearchMode() {
    appState.chat.searchMode.enabled = !appState.chat.searchMode.enabled;
    
    console.log('🔍 [联网搜索] 搜索模式切换:', {
        enabled: appState.chat.searchMode.enabled,
        searchEngine: appState.chat.searchMode.searchEngine,
        count: appState.chat.searchMode.count,
        contentSize: appState.chat.searchMode.contentSize
    });
    
    updateSearchButtonState();
    
    if (appState.chat.searchMode.enabled) {
        console.log('🔍 [联网搜索] 显示配置弹窗');
        showSearchConfig();
    } else {
        console.log('🔍 [联网搜索] 已关闭');
    }
}

/**
 * Update search button visual state
 */
function updateSearchButtonState() {
    const chatSearchBtn = document.getElementById('chat_search_btn');
    if (!chatSearchBtn) return;
    
    if (appState.chat.searchMode.enabled) {
        chatSearchBtn.style.backgroundColor = 'var(--primary-color)';
        chatSearchBtn.style.color = 'white';
        chatSearchBtn.title = '联网搜索已启用 - 点击关闭';
        
        if (!document.getElementById('search_indicator')) {
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
            indicator.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                </svg>
                <span>联网搜索已启用 (${appState.chat.searchMode.searchEngine})</span>
            `;
            const inputArea = document.querySelector('.chat-input-area');
            if (inputArea) {
                inputArea.style.position = 'relative';
                inputArea.insertBefore(indicator, inputArea.firstChild);
            }
        }
    } else {
        chatSearchBtn.style.backgroundColor = '';
        chatSearchBtn.style.color = '';
        chatSearchBtn.title = '开启联网搜索 (使用智谱网络搜索API)';
        
        const indicator = document.getElementById('search_indicator');
        if (indicator) {
            indicator.remove();
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
    modalTitle.textContent = '联网搜索配置';
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
    infoText.innerHTML = `
        <strong>💡 功能说明：</strong><br>
        启用后，AI将自动调用智谱网络搜索API获取最新信息，并结合搜索结果生成回答。
        搜索结果会自动标注来源链接。
    `;
    optionsModal.appendChild(infoText);
    
    const optionsForm = document.createElement('form');
    optionsForm.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 15px;
    `;
    
    // Engine selection
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
        if (option.value === appState.chat.searchMode.searchEngine) {
            optionEl.selected = true;
        }
        engineSelect.appendChild(optionEl);
    });
    
    const engineDesc = document.createElement('div');
    engineDesc.style.cssText = `font-size: 12px; color: #666; margin-top: 4px;`;
    engineDesc.textContent = engineOptions.find(o => o.value === appState.chat.searchMode.searchEngine)?.description || '';
    
    engineSelect.addEventListener('change', () => {
        const selectedOption = engineOptions.find(o => o.value === engineSelect.value);
        engineDesc.textContent = selectedOption?.description || '';
    });
    
    engineGroup.appendChild(engineLabel);
    engineGroup.appendChild(engineSelect);
    engineGroup.appendChild(engineDesc);
    optionsForm.appendChild(engineGroup);
    
    // Count selection
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
        if (option === appState.chat.searchMode.count) {
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
    
    // Content size selection
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
        if (option.value === appState.chat.searchMode.contentSize) {
            optionEl.selected = true;
        }
        contentSelect.appendChild(optionEl);
    });
    
    const contentDesc = document.createElement('div');
    contentDesc.style.cssText = `font-size: 12px; color: #666; margin-top: 4px;`;
    contentDesc.textContent = contentOptions.find(o => o.value === appState.chat.searchMode.contentSize)?.description || '';
    
    contentSelect.addEventListener('change', () => {
        const selectedOption = contentOptions.find(o => o.value === contentSelect.value);
        contentDesc.textContent = selectedOption?.description || '';
    });
    
    contentGroup.appendChild(contentLabel);
    contentGroup.appendChild(contentSelect);
    contentGroup.appendChild(contentDesc);
    optionsForm.appendChild(contentGroup);
    
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
        appState.chat.searchMode.searchEngine = engineSelect.value;
        appState.chat.searchMode.count = parseInt(countSelect.value);
        appState.chat.searchMode.contentSize = contentSelect.value;
        
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
        toast.textContent = '✓ 联网搜索配置已保存并启用';
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
