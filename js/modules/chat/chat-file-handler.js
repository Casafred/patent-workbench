// js/modules/chat/chat-file-handler.js
// File upload, parsing, and caching functionality

/**
 * Handle file upload and reuse from cache
 * @param {Event} event - File input change event
 * @param {File} fileFromReuse - Optional file object from reuse
 * @param {boolean} skipCache - Whether to skip cache and reprocess
 */
async function handleChatFileUpload(event, fileFromReuse = null, skipCache = false) {
    const file = fileFromReuse || (event.target ? event.target.files[0] : null);
    if (!file) return;

    const provider = appState.provider || 'zhipu';
    if (provider === 'aliyun') {
        alert('文件解析功能仅支持智谱AI服务。请切换到智谱AI服务后再上传文件，或直接在对话中粘贴文本内容。');
        event.target.value = '';
        return;
    }

    console.log(`[File Upload] 开始处理文件: ${file.name}, 跳过缓存: ${skipCache}`);

    // Check cache for already parsed files
    const cachedFile = appState.chat.parsedFilesCache[file.name];
    if (cachedFile && !skipCache) {
        console.log('✅ 文件已解析，直接复用缓存:', file.name);

        // 检查缓存文件内容长度，如果较长则提示切换模型
        const contentLength = cachedFile.content?.length || 0;
        console.log(`[File Upload] 缓存文件内容长度: ${contentLength}`);

        if (contentLength > 10000) {
            const shouldProceed = await checkFileSizeAndShowModelDialog(file, contentLength);
            if (!shouldProceed) {
                console.log('[File Upload] 用户取消使用缓存文件');
                return;
            }
        }

        appState.chat.activeFile = cachedFile;

        const chatFileStatusArea = document.getElementById('chat_file_status_area');
        chatFileStatusArea.style.display = 'flex';
        chatFileStatusArea.innerHTML = `
            <div class="file-info">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right: 8px; color: var(--success-color, #22c55e);">
                    <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/>
                    <path d="M10.854 7.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 9.793l2.646-2.647a.5.5 0 0 1 .708 0z"/>
                </svg>
                <span>已附加文件（复用）:</span>
                <span class="filename" title="${file.name}">${file.name}</span>
                <span style="margin-left: 8px; color: #22c55e; font-size: 0.85em;">✓ 已缓存</span>
            </div>
            <div style="display: flex; gap: 8px;">
                <button class="small-button" onclick="reprocessFile('${file.name}')" title="重新处理">重新处理</button>
                <button class="file-remove-btn" onclick="removeActiveFile()" title="移除文件">&times;</button>
            </div>
        `;

        const parserServiceSelector = document.getElementById('chat_parser_service_selector');
        if (parserServiceSelector) {
            parserServiceSelector.style.display = 'none';
        }

        const chatInput = document.getElementById('chat_input');
        if (chatInput) {
            chatInput.focus();
        }
        return;
    }

    if (cachedFile && skipCache) {
        console.log('🔄 用户选择跳过缓存，重新处理文件:', file.name);
    }

    // Save pending file
    appState.chat.pendingFile = file;
    appState.chat.pendingFileEvent = event;
    
    // Recommend service based on file type
    const fileType = file.type || '';
    let recommendedService = 'lite';
    
    if (!fileType && file.name) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext === 'pdf') {
            recommendedService = 'lite';
        } else if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'heic'].includes(ext)) {
            recommendedService = 'prime';
        } else if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
            recommendedService = 'prime';
        }
    } else {
        if (fileType === 'application/pdf') {
            recommendedService = 'lite';
        } else if (fileType.includes('image')) {
            recommendedService = 'prime';
        } else if (fileType.includes('officedocument') || fileType.includes('msword') || fileType.includes('ms-excel') || fileType.includes('ms-powerpoint')) {
            recommendedService = 'prime';
        }
    }
    
    const parserServiceSelect = document.getElementById('chat_parser_service_select');
    parserServiceSelect.value = recommendedService;
    updateParserServiceDescription();
    
    const parserServiceSelector = document.getElementById('chat_parser_service_selector');
    parserServiceSelector.style.display = 'block';
    
    const chatFileStatusArea = document.getElementById('chat_file_status_area');
    chatFileStatusArea.style.display = 'flex';
    chatFileStatusArea.innerHTML = `
        <div class="file-info">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right: 8px; color: var(--primary-color);">
                <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/>
            </svg>
            <span>已选择文件:</span>
            <span class="filename" title="${file.name}">${file.name}</span>
            <span style="margin-left: 8px; color: #666; font-size: 0.9em;">(${(file.size / 1024).toFixed(1)} KB)</span>
        </div>
        <div style="display: flex; gap: 8px;">
            <button class="small-button" onclick="startFileUpload()" title="开始上传">上传</button>
            <button class="file-remove-btn" onclick="cancelFileUpload()" title="取消">&times;</button>
        </div>
    `;
}

/**
 * Reprocess a file from cache (skip cache and re-upload)
 * @param {string} filename - Filename to reprocess
 */
async function reprocessFile(filename) {
    console.log(`[File Upload] 用户选择重新处理文件: ${filename}`);

    // Remove from cache
    delete appState.chat.parsedFilesCache[filename];
    try {
        localStorage.setItem('parsedFilesCache', JSON.stringify(appState.chat.parsedFilesCache));
    } catch (e) {
        console.warn('⚠️ 无法更新 localStorage:', e);
    }

    // Clear active file
    appState.chat.activeFile = null;

    // Show message to user
    const chatFileStatusArea = document.getElementById('chat_file_status_area');
    chatFileStatusArea.innerHTML = `
        <div class="file-info" style="color: var(--primary-color);">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right: 8px;">
                <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/>
                <path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/>
            </svg>
            <span>请重新选择文件进行上传</span>
        </div>
    `;

    // Trigger file input click
    const chatFileInput = document.getElementById('chat_file_input');
    if (chatFileInput) {
        chatFileInput.value = '';
        chatFileInput.click();
    }
}

/**
 * Start file upload after user selects service
 */
/**
 * Check if content is large and show model selection dialog
 * @param {File} file - File object
 * @param {number} contentLength - Parsed content length in characters
 * @returns {Promise<boolean>} - Whether to proceed with upload
 */
function checkFileSizeAndShowModelDialog(file, contentLength) {
    // 获取当前模型
    const chatModelSelect = document.getElementById('chat_model_select');
    const currentModel = chatModelSelect ? chatModelSelect.value : 'glm-4-flash';

    // 检查当前模型是否支持长上下文
    const longContextModels = ['glm-4', 'glm-4-plus', 'glm-4-air', 'glm-4-long', 'glm-4.7', 'glm-4.5'];
    const isLongContextModel = longContextModels.some(m => currentModel.includes(m));

    if (isLongContextModel) {
        console.log(`[File Upload] 当前模型 ${currentModel} 支持长上下文，继续上传`);
        return Promise.resolve(true);
    }

    // 显示模型切换弹窗
    return new Promise((resolve) => {
        const estimatedTokens = Math.ceil(contentLength / 4); // 粗略估计：1 token ≈ 4 字符
        
        // 从全局获取模型列表，如果没有则使用默认列表
        const models = window.AVAILABLE_MODELS || ["glm-4-flash", "glm-4-flashx-250414", "glm-4-flash-250414", "glm-4-long", "glm-4.7-flash", "glm-4.7-flashx", "glm-4.7", "glm-4.5-air", "glm-4.5-airx"];
        
        // 生成模型选项HTML
        const modelOptions = models.map(model => {
            // 为长上下文模型添加标记
            const isLongContext = ['glm-4', 'glm-4-plus', 'glm-4-air', 'glm-4-long', 'glm-4.7', 'glm-4.5'].some(m => model.includes(m));
            const label = isLongContext ? `${model} (推荐)` : model;
            const selected = model === currentModel ? 'selected' : '';
            return `<option value="${model}" ${selected}>${label}</option>`;
        }).join('');

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background-color: white;
            border-radius: 12px;
            padding: 28px;
            max-width: 480px;
            width: 90%;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        `;

        content.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 16px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#f59e0b" viewBox="0 0 16 16" style="margin-right: 12px;">
                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                    <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                </svg>
                <h3 style="margin: 0; font-size: 1.2em; color: #1f2937;">解析内容较长，建议切换模型</h3>
            </div>

            <p style="margin: 0 0 16px 0; color: #4b5563; line-height: 1.6;">
                文件 <strong>${file.name}</strong> 解析后共 <strong>${contentLength.toLocaleString()} 字符</strong>，
                预估需要约 <strong>${estimatedTokens.toLocaleString()} tokens</strong> 的上下文。
            </p>

            <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 0.9em;">
                当前模型 <strong>${currentModel}</strong> 可能无法处理如此长的内容，建议切换到支持更长上下文的模型。
            </p>

            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">选择模型：</label>
                <select id="model-selection-dialog-select" style="
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-size: 14px;
                    background-color: white;
                ">
                    ${modelOptions}
                </select>
            </div>

            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button id="model-dialog-cancel" style="
                    padding: 10px 20px;
                    border: 1px solid #d1d5db;
                    background-color: white;
                    color: #374151;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                ">取消上传</button>
                <button id="model-dialog-confirm" style="
                    padding: 10px 20px;
                    border: none;
                    background-color: var(--primary-color, #3b82f6);
                    color: white;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                ">确认并上传</button>
            </div>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        // 绑定事件
        const cancelBtn = content.querySelector('#model-dialog-cancel');
        const confirmBtn = content.querySelector('#model-dialog-confirm');
        const modelSelect = content.querySelector('#model-selection-dialog-select');

        cancelBtn.addEventListener('click', () => {
            modal.remove();
            resolve(false);
        });

        confirmBtn.addEventListener('click', () => {
            const selectedModel = modelSelect.value;

            // 更新模型选择器
            if (chatModelSelect) {
                chatModelSelect.value = selectedModel;
                console.log(`[File Upload] 用户切换模型为: ${selectedModel}`);
            }

            modal.remove();
            resolve(true);
        });

        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                resolve(false);
            }
        });
    });
}

async function startFileUpload() {
    const file = appState.chat.pendingFile;
    const event = appState.chat.pendingFileEvent;

    if (!file) {
        console.error('[File Upload] 没有待上传的文件');
        return;
    }

    console.log(`[File Upload] 开始上传文件: ${file.name}`);

    const parserServiceSelect = document.getElementById('chat_parser_service_select');
    const toolType = parserServiceSelect.value;

    const parserServiceSelector = document.getElementById('chat_parser_service_selector');
    parserServiceSelector.style.display = 'none';

    const chatUploadFileBtn = document.getElementById('chat_upload_file_btn');
    const chatFileStatusArea = document.getElementById('chat_file_status_area');

    // 显示加载状态
    if (chatFileStatusArea) {
        chatFileStatusArea.innerHTML = `
            <div class="file-info">
                <div class="file-processing-spinner" style="
                    width: 16px;
                    height: 16px;
                    border: 2px solid var(--primary-color);
                    border-top-color: transparent;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-right: 8px;
                "></div>
                <span>正在解析文件: ${file.name}...</span>
            </div>
        `;
    }

    appState.chat.fileProcessing = true;
    if (chatUploadFileBtn) {
        chatUploadFileBtn.disabled = true;
    }

    try {
        console.log(`[File Upload] 创建 FileParserHandler 实例，工具类型: ${toolType}`);
        const parser = new FileParserHandler();

        console.log(`[File Upload] 调用 handleFileUpload...`);
        const result = await parser.handleFileUpload(file, toolType);

        console.log(`[File Upload] 文件解析成功，task_id: ${result.task_id}`);

        // 检查解析后的内容长度，如果较长则提示切换模型
        const contentLength = result.content?.length || 0;
        console.log(`[File Upload] 解析内容长度: ${contentLength}`);

        if (contentLength > 10000) { // 10000字符约2500 tokens
            const shouldProceed = await checkFileSizeAndShowModelDialog(file, contentLength);
            if (!shouldProceed) {
                console.log('[File Upload] 用户取消上传');
                removeActiveFile();
                return;
            }
        }

        appState.chat.activeFile = {
            taskId: result.task_id,
            filename: file.name,
            content: result.content,
            toolType: toolType
        };

        appState.chat.parsedFilesCache[file.name] = {
            taskId: result.task_id,
            filename: file.name,
            content: result.content,
            toolType: toolType,
            timestamp: Date.now()
        };

        try {
            localStorage.setItem('parsedFilesCache', JSON.stringify(appState.chat.parsedFilesCache));
            console.log('✅ 文件已保存到缓存:', file.name);
        } catch (e) {
            console.warn('⚠️ 无法保存缓存到 localStorage:', e);
        }

        // 更新UI显示完成状态
        if (chatFileStatusArea) {
            chatFileStatusArea.innerHTML = `
                <div class="file-info">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right: 8px; color: var(--primary-color);">
                        <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/>
                    </svg>
                    <span>已附加文件:</span>
                    <span class="filename" title="${file.name}">${file.name}</span>
                </div>
                <button class="file-remove-btn" onclick="removeActiveFile()" title="移除文件">&times;</button>
            `;
        }

        appState.chat.pendingFile = null;
        appState.chat.pendingFileEvent = null;

        const chatInput = document.getElementById('chat_input');
        if (chatInput) {
            chatInput.focus();
        }
    } catch (error) {
        console.error('[File Upload] 文件解析失败:', error);
        alert(`文件解析失败: ${error.message}`);
        removeActiveFile();
    } finally {
        appState.chat.fileProcessing = false;
        if (chatUploadFileBtn) {
            chatUploadFileBtn.disabled = false;
        }
        if (event && event.target) {
            event.target.value = '';
        }
    }
}

/**
 * Cancel file upload
 */
function cancelFileUpload() {
    appState.chat.pendingFile = null;
    appState.chat.pendingFileEvent = null;
    
    const parserServiceSelector = document.getElementById('chat_parser_service_selector');
    parserServiceSelector.style.display = 'none';
    
    const chatFileStatusArea = document.getElementById('chat_file_status_area');
    chatFileStatusArea.style.display = 'none';
    chatFileStatusArea.innerHTML = '';
    
    const chatFileInput = document.getElementById('chat_file_input');
    if (chatFileInput) {
        chatFileInput.value = '';
    }
}

/**
 * Remove active file from chat
 */
function removeActiveFile() {
    appState.chat.activeFile = null;
    
    const chatFileStatusArea = document.getElementById('chat_file_status_area');
    if (chatFileStatusArea) {
        chatFileStatusArea.style.display = 'none';
        chatFileStatusArea.innerHTML = '';
    }
    
    const parserServiceSelector = document.getElementById('chat_parser_service_selector');
    if (parserServiceSelector) {
        parserServiceSelector.style.display = 'none';
    }
    
    updateCharCount();
}

/**
 * Update parser service description
 */
function updateParserServiceDescription() {
    const parserServiceSelect = document.getElementById('chat_parser_service_select');
    const descriptionEl = document.getElementById('chat_parser_service_description');
    
    const descriptions = {
        'lite': '满足日常查询需求，性价比极高。支持常见格式，返回纯文本。',
        'expert': '专业PDF解析，返回Markdown格式+图片。适合需要保留格式的文档。',
        'prime': '支持最多格式，返回完整结构化内容。适合复杂文档和图片识别。'
    };
    
    descriptionEl.textContent = descriptions[parserServiceSelect.value] || '';
}

/**
 * Clean up file cache - remove files older than 7 days
 */
function cleanupFileCache() {
    const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const filename in appState.chat.parsedFilesCache) {
        const cacheEntry = appState.chat.parsedFilesCache[filename];
        if (now - cacheEntry.timestamp > MAX_CACHE_AGE) {
            delete appState.chat.parsedFilesCache[filename];
            cleanedCount++;
        }
    }
    
    if (cleanedCount > 0) {
        console.log(`🧹 已清理 ${cleanedCount} 个过期缓存文件`);
        try {
            localStorage.setItem('parsedFilesCache', JSON.stringify(appState.chat.parsedFilesCache));
        } catch (e) {
            console.warn('⚠️ 无法保存清理后的缓存:', e);
        }
    }
}

/**
 * Clear all file cache manually
 */
function clearAllFileCache() {
    appState.chat.parsedFilesCache = {};
    try {
        localStorage.removeItem('parsedFilesCache');
        console.log('✅ 已清除所有文件缓存');
        alert('文件缓存已清除');
    } catch (e) {
        console.warn('⚠️ 无法清除缓存:', e);
    }
}

/**
 * Show parser service information modal
 */
function showParserServiceInfo() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background-color: white;
        border-radius: 8px;
        padding: 24px;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    `;
    
    content.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="margin: 0; font-size: 1.3em;">文件解析服务说明</h3>
            <button onclick="this.closest('.modal-overlay').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #999;">&times;</button>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4 style="color: var(--primary-color); margin-bottom: 10px;">🆓 Lite (免费)</h4>
            <p style="margin: 0 0 8px 0; line-height: 1.6;">
                <strong>适用场景：</strong>日常文档查询、简单文本提取<br>
                <strong>支持格式：</strong>PDF, Word, Excel, PPT, 图片, CSV, TXT等常见格式<br>
                <strong>返回内容：</strong>纯文本格式<br>
                <strong>价格：</strong>免费
            </p>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4 style="color: var(--primary-color); margin-bottom: 10px;">⭐ Expert (0.03元/次)</h4>
            <p style="margin: 0 0 8px 0; line-height: 1.6;">
                <strong>适用场景：</strong>专业PDF文档、需要保留格式的文档<br>
                <strong>支持格式：</strong>专注于PDF格式的深度解析<br>
                <strong>返回内容：</strong>Markdown格式 + 图片提取<br>
                <strong>价格：</strong>0.03元/次
            </p>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4 style="color: var(--primary-color); margin-bottom: 10px;">💎 Prime (0.05元/次)</h4>
            <p style="margin: 0 0 8px 0; line-height: 1.6;">
                <strong>适用场景：</strong>复杂文档、图片识别、完整结构保留<br>
                <strong>支持格式：</strong>支持最多格式，包括复杂表格和图表<br>
                <strong>返回内容：</strong>完整结构化内容，保留原始格式<br>
                <strong>价格：</strong>0.05元/次
            </p>
        </div>
        
        <div style="background-color: #f0f7ff; border-left: 4px solid var(--primary-color); padding: 12px; margin-top: 20px;">
            <strong>💡 推荐选择：</strong><br>
            • PDF文档：优先选择 Lite，如需保留格式选择 Expert<br>
            • 图片文件：推荐 Prime，识别效果更好<br>
            • Office文档：推荐 Prime，保留完整结构<br>
            • 简单文本：选择 Lite 即可
        </div>
    `;
    
    modal.className = 'modal-overlay';
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

/**
 * Update file upload button state based on current provider
 */
function updateFileUploadButtonState() {
    const chatUploadFileBtn = document.getElementById('chat_upload_file_btn');
    if (!chatUploadFileBtn) return;
    
    const provider = appState.provider || 'zhipu';
    
    if (provider === 'aliyun') {
        chatUploadFileBtn.style.opacity = '0.5';
        chatUploadFileBtn.style.cursor = 'not-allowed';
        chatUploadFileBtn.title = '文件解析功能仅支持智谱AI服务';
    } else {
        chatUploadFileBtn.style.opacity = '1';
        chatUploadFileBtn.style.cursor = 'pointer';
        chatUploadFileBtn.title = '上传文件 (PDF, Word, Excel, 图片, CSV等)';
    }
    
    console.log(`[File Upload] 按钮状态更新: provider=${provider}`);
}
