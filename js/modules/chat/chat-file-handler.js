// js/modules/chat/chat-file-handler.js
// File upload, parsing, and caching functionality

/**
 * Handle file upload and reuse from cache
 * @param {Event} event - File input change event
 * @param {File} fileFromReuse - Optional file object from reuse
 */
async function handleChatFileUpload(event, fileFromReuse = null) {
    const file = fileFromReuse || (event.target ? event.target.files[0] : null);
    if (!file) return;

    // Check cache for already parsed files
    const cachedFile = appState.chat.parsedFilesCache[file.name];
    if (cachedFile) {
        console.log('✅ 文件已解析，直接复用缓存:', file.name);
        
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
            <button class="file-remove-btn" onclick="removeActiveFile()" title="移除文件">&times;</button>
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
 * Start file upload after user selects service
 */
async function startFileUpload() {
    const file = appState.chat.pendingFile;
    const event = appState.chat.pendingFileEvent;
    
    if (!file) return;
    
    const parserServiceSelect = document.getElementById('chat_parser_service_select');
    const toolType = parserServiceSelect.value;
    
    const parserServiceSelector = document.getElementById('chat_parser_service_selector');
    parserServiceSelector.style.display = 'none';
    
    const chatUploadFileBtn = document.getElementById('chat_upload_file_btn');
    
    appState.chat.fileProcessing = true;
    if (chatUploadFileBtn) {
        chatUploadFileBtn.disabled = true;
    }

    try {
        const parser = new FileParserHandler();
        const result = await parser.handleFileUpload(file, toolType);
        
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
        
        appState.chat.pendingFile = null;
        appState.chat.pendingFileEvent = null;
        
        const chatInput = document.getElementById('chat_input');
        if (chatInput) {
            chatInput.focus();
        }
    } catch (error) {
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
