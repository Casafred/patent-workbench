// js/files.js

/**
 * 初始化文件管理器的所有功能和事件监听器。
 */
function initFilesManager() {
    // --- 事件监听 ---
    // 打开/关闭模态框的按钮
    chatAttachFileBtn.addEventListener('click', () => openFilesModal(true));
    chatManageFilesBtn.addEventListener('click', () => openFilesModal(false));
    fileManagerCloseBtn.addEventListener('click', closeFilesModal);
    
    // 点击模态框的灰色背景区域关闭它
    fileManagerModal.addEventListener('click', (event) => {
        if (event.target === fileManagerModal) {
            closeFilesModal();
        }
    });

    // 上传文件按钮
    fmUploadBtn.addEventListener('click', handleUploadFile);

    // 文件列表筛选和刷新按钮
    fmFilterPurpose.addEventListener('change', async () => {
        appState.files.purposeFilter = fmFilterPurpose.value;
        await refreshFilesList();
    });
    fmRefreshBtn.addEventListener('click', refreshFilesList);
}

/**
 * 打开文件管理器模态框。
 * @param {boolean} goUploadTab - 是否突出显示上传区域（当前版本暂未使用此参数）。
 */
function openFilesModal(goUploadTab = false) {
    fileManagerModal.style.display = 'block';
    setTimeout(() => {
        fileManagerModal.classList.add('show');
        // 每次打开模态框时，都刷新文件列表以获取最新数据
        refreshFilesList();
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
 * 处理文件上传的逻辑。
 */
async function handleUploadFile() {
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

        // 调用后端API进行上传
        const result = await apiCall('/files/upload', formData, 'POST');
        alert(`文件 "${result.filename}" 上传成功！`);
        fmFileInput.value = ''; // 清空文件输入框
        await refreshFilesList(); // 刷新列表以显示新文件
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
    } catch (error) {
        console.error('Failed to refresh files list:', error);
        fmList.innerHTML = `<div class="info error">加载文件列表失败: ${error.message}</div>`;
    }
}

/**
 * 将 appState.files.items 中的数据渲染到文件列表中，并为按钮绑定事件。
 */
function renderFilesList() {
    if (!appState.files.items || appState.files.items.length === 0) {
        fmList.innerHTML = `<div class="info">该用途下没有文件。</div>`;
        return;
    }

    fmList.innerHTML = ''; // 清空现有列表

    appState.files.items.forEach(file => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'list-item';
        
        const sizeKB = file.bytes ? (file.bytes / 1024).toFixed(1) : '-';
        const createdAt = file.created_at ? new Date(file.created_at * 1000).toLocaleString() : 'N/A';

        // 构建每个文件条目的HTML结构
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
                    ${file.purpose === 'file-extract' || file.purpose === 'batch' ? 
                      `<button class="small-button" data-action="insert-content" data-id="${file.id}">插入内容</button>` : ''}
                    <button class="small-button delete-button" data-action="delete" data-id="${file.id}" data-filename="${file.filename}">删除</button>
                </div>
            </div>
        `;
        fmList.appendChild(itemDiv);
    });

    // 事件委托：为所有动态生成的按钮添加事件监听器
    fmList.addEventListener('click', async (event) => {
        const target = event.target.closest('button[data-action]');
        if (!target) return;

        const action = target.dataset.action;
        const fileId = target.dataset.id;

        if (action === 'copy-id') {
            await navigator.clipboard.writeText(fileId);
            target.textContent = '已复制!';
            setTimeout(() => { target.textContent = '复制ID'; }, 1500);
        } 
        else if (action === 'delete') {
            const filename = target.dataset.filename;
            if (confirm(`确定要永久删除文件 "${filename}" 吗？此操作无法撤销。`)) {
                try {
                    await apiCall(`/files/${fileId}`, undefined, 'DELETE');
                    alert(`文件 "${filename}" 已删除。`);
                    refreshFilesList();
                } catch (error) {
                    alert(`删除失败: ${error.message}`);
                }
            }
        } 
        else if (action === 'insert-content') {
            target.disabled = true;
            target.textContent = '加载中...';
            try {
                // 直接使用 fetch 获取文件流，因为 apiCall 主要为 JSON 设计
                const response = await fetch(`${window.location.origin}/api/files/${fileId}/content`, {
                    headers: { 'Authorization': `Bearer ${appState.apiKey}` }
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(JSON.parse(errorText).error || `HTTP ${response.status}`);
                }
                
                const fileContent = await response.text(); // 假设内容是文本
                const currentInput = chatInput.value;
                chatInput.value = currentInput ? `${currentInput}\n\n--- 文件内容 ---\n${fileContent}` : fileContent;
                chatInput.dispatchEvent(new Event('input', { bubbles: true })); // 触发输入事件以更新UI
                chatInput.focus();
                alert('文件内容已成功插入到对话输入框！');
                closeFilesModal(); // 操作成功后关闭模态框
            } catch (error) {
                alert(`获取文件内容失败: ${error.message}`);
            } finally {
                target.disabled = false;
                target.textContent = '插入内容';
            }
        }
    });
}
