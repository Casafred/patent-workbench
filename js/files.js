// js/files.js

/**
 * 初始化文件管理器的所有功能和事件监听器。
 */
function initFilesManager() {
    // --- 事件监听 ---
    // 打开/关闭模态框的按钮
    // 'chat_attach_file_btn' 已被移除，所以相关监听也移除
    chatManageFilesBtn.addEventListener('click', () => openFilesModal());
    fileManagerCloseBtn.addEventListener('click', closeFilesModal);
    
    // 点击模态框的灰色背景区域关闭它
    fileManagerModal.addEventListener('click', (event) => {
        if (event.target === fileManagerModal) {
            closeFilesModal();
        }
    });

    // 上传文件按钮
    fmUploadBtn.addEventListener('click', handleUploadFileInManager);

    // 文件列表筛选和刷新按钮
    fmFilterPurpose.addEventListener('change', refreshFilesList);
    fmRefreshBtn.addEventListener('click', refreshFilesList);
}

/**
 * 打开文件管理器模态框。
 */
// 新增：添加文件列表是否已加载的标志
let isFileListLoaded = false;

function openFilesModal() {
    fileManagerModal.style.display = 'block';
    setTimeout(() => {
        fileManagerModal.classList.add('show');
        // 只在首次打开或需要刷新时才加载文件列表
        if (!isFileListLoaded) {
            refreshFilesList();
        } else {
            // 否则使用已加载的数据重新渲染
            renderFilesList();
        }
    }, 10);
}

/**
 * 关闭文件管理器模态框。
 */
function closeFilesModal() {
    fileManagerModal.classList.remove('show');
    setTimeout(() => {
        fileManagerModal.style.display = 'none';
    }, 300); // 等待CSS过渡效果完成
}

/**
 * 处理在文件管理器中点击“上传”按钮的逻辑。
 */
async function handleUploadFileInManager() {
    const file = fmFileInput.files?.[0];
    if (!file) {
        alert('请先选择一个文件。');
        return;
    }
    const purpose = fmPurposeSelect.value;
    
    // 提供即时反馈，防止重复点击
    fmUploadBtn.disabled = true;
    fmUploadBtn.textContent = '上传中...';

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('purpose', purpose);

        // 记录本地上传时间
        const uploadTime = new Date();

        // 调用后端API进行上传
        const result = await apiCall('/files/upload', formData, 'POST');
        // 将本地上传时间添加到结果中
        result.local_upload_time = uploadTime;
        alert(`文件 "${result.filename}" 上传成功！`);
        fmFileInput.value = ''; // 清空文件输入框
        await refreshFilesList(); // 刷新列表以显示新文件
        // 上传成功后标记为需要刷新
        isFileListLoaded = false;
    } catch (error) {
        console.error('Upload failed:', error);
        alert(`上传失败: ${error.message}`);
    } finally {
        // 无论成功或失败，都恢复按钮状态
        fmUploadBtn.disabled = false;
        fmUploadBtn.textContent = '上传';
    }
}

/**
 * 从后端获取并刷新文件列表。
 */
async function refreshFilesList() {
    fmList.innerHTML = `<div class="info">正在加载文件列表...</div>`;
    try {
        const purpose = fmFilterPurpose.value;
        // 构建查询字符串并调用API
        const listData = await apiCall(`/files?purpose=${purpose}&limit=100`, undefined, 'GET');
        appState.files.items = listData.data || [];
        renderFilesList();
        // 加载完成后更新标志
        isFileListLoaded = true;
    } catch (error) {
        console.error('Failed to refresh files list:', error);
        fmList.innerHTML = `<div class="info error">加载文件列表失败: ${error.message}</div>`;
        // 加载失败时不更新标志，以便下次打开时重新尝试
        isFileListLoaded = false;
    }
}

/**
 * 将 appState.files.items 中的数据渲染到文件列表中，并为按钮绑定事件。
 */
function renderFilesList() {
    const fileListContainer = fmList;
    if (!appState.files.items || appState.files.items.length === 0) {
        fileListContainer.innerHTML = `<div class="info">该用途下没有文件。</div>`;
        return;
    }

    fileListContainer.innerHTML = ''; // 清空现有列表

    appState.files.items.forEach(file => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'list-item';
        
        const sizeKB = file.bytes ? (file.bytes / 1024).toFixed(1) : '-';
        
        // 使用本地上传时间或创建时间
        let createdAt = 'N/A';
        if (file.local_upload_time) {
            // 如果有本地上传时间，则使用它
            const date = new Date(file.local_upload_time);
            if (!isNaN(date.getTime())) {
                createdAt = date.toLocaleString();
            }
        } else {
            // 否则尝试使用服务器返回的时间
            const timestamp = parseInt(file.created_at, 10);
            if (!isNaN(timestamp) && timestamp > 0) {
                const date = new Date(timestamp * 1000);
                if (!isNaN(date.getTime())) {
                    createdAt = date.toLocaleString();
                }
            }
        }

        // 构建每个文件条目的HTML结构
        // 将 '插入内容' 按钮的文本改为 '复用文件'
        itemDiv.innerHTML = `
            <div class="item-content" style="display: block; width: 100%;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong title="${file.filename}">${file.filename}</strong>
                    <span class="preset-badge" style="background-color: #6c757d;">${file.purpose}</span>
                </div>
                <div style="font-size: 12px; color: #666; margin-top: 4px; word-break: break-all;">
                    ID: ${file.id} | Size: ${sizeKB} KB | Created: ${createdAt}
                </div>
                <div style="margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap;">
                    <button class="small-button" data-action="copy-id" data-id="${file.id}">复制ID</button>
                    <button class="small-button" data-action="reuse-file" data-id="${file.id}" data-filename="${file.filename}">复用文件</button>
                    <button class="small-button delete-button" data-action="delete" data-id="${file.id}" data-filename="${file.filename}">删除</button>
                </div>
            </div>
        `;
        fileListContainer.appendChild(itemDiv);
    });

    // --- 优化：使用事件委托，并确保只绑定一次事件监听器 ---
    // 移除旧的事件监听器，避免重复绑定
    if (fileListContainer.clickHandler) {
        fileListContainer.removeEventListener('click', fileListContainer.clickHandler);
    }

    // 定义新的事件处理器
    fileListContainer.clickHandler = async (event) => {
        const target = event.target.closest('button[data-action]');
        if (!target) return;

        event.stopPropagation(); // 防止事件冒泡

        const action = target.dataset.action;
        const fileId = target.dataset.id;
        const filename = target.dataset.filename;

        switch (action) {
            case 'copy-id':
                await navigator.clipboard.writeText(fileId);
                target.textContent = '已复制!';
                setTimeout(() => { target.textContent = '复制ID'; }, 1500);
                break;

            case 'delete':
    if (confirm(`确定要永久删除文件 "${filename}" 吗？此操作无法撤销。`)) {
        target.disabled = true;
        target.textContent = '删除中...';
        try {
            await apiCall(`/files/${fileId}`, undefined, 'DELETE');
            alert(`文件 "${filename}" 已删除。`);
            refreshFilesList(); // 成功后刷新列表
            // 删除成功后标记为需要刷新
            isFileListLoaded = false;
        } catch (error) {
            alert(`删除失败: ${error.message}`);
            target.disabled = false;
            target.textContent = '删除';
        }
    }
    break;

            case 'reuse-file':
                if (appState.chat.activeFile) {
                    if (!confirm("当前已有附加文件，复用新文件将替换它。要继续吗？")) {
                        return;
                    }
                }
                
                target.disabled = true;
                target.textContent = '复用中...';
                
                try {
                    // 切换到即时对话 Tab
                    switchTab('instant', document.querySelector('.main-tab-container .tab-button'));
                    closeFilesModal(); // 关闭文件管理器

                    // 模拟一个文件对象，用于传递给 chat.js 的核心处理函数
                    const fileToReuse = {
                        id: fileId,
                        name: filename // chat.js 的 handleChatFileUpload 会读取 file.name
                    };

                    // 直接调用 chat.js 中的核心文件处理函数
                    // 第二个参数 `fileFromReuse` 就是为此场景设计的
                    await handleChatFileUpload(null, fileToReuse);

                } catch (error) {
                    alert(`复用文件失败: ${error.message}`);
                } finally {
                    target.disabled = false;
                    target.textContent = '复用文件';
                }
                break;
        }
    };

    // 绑定新的事件处理器
    fileListContainer.addEventListener('click', fileListContainer.clickHandler);
}
