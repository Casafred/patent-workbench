/**
 * Excel数据拼接功能模块
 * 
 * 提供多Excel文件选择、工作表配置、行数范围设置、数据拼接等功能
 */

const ExcelConcatModule = (function() {
    let sessionId = null;
    let files = [];
    let currentStep = 'files';
    let previewData = null;
    
    const API_BASE = '/api/excel_concat';
    
    async function init() {
        try {
            const response = await fetch(`${API_BASE}/session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            if (result.success) {
                sessionId = result.data.session_id;
                console.log('[ExcelConcat] Session created:', sessionId);
            } else {
                console.error('[ExcelConcat] Failed to create session:', result.error);
            }
        } catch (error) {
            console.error('[ExcelConcat] Init error:', error);
        }
        
        bindEvents();
        loadHistory();
    }
    
    function bindEvents() {
        const fileInput = document.getElementById('concat_file_input');
        if (fileInput) {
            fileInput.addEventListener('change', handleFileSelect);
        }
        
        const clearAllBtn = document.getElementById('concat_clear_all_btn');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', clearAllFiles);
        }
        
        const downloadBtn = document.getElementById('concat_download_btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', downloadResult);
        }
        
        const openFolderBtn = document.getElementById('concat_open_folder_btn');
        if (openFolderBtn) {
            openFolderBtn.addEventListener('click', openFolder);
        }
    }
    
    async function handleFileSelect(event) {
        const selectedFiles = event.target.files;
        if (!selectedFiles || selectedFiles.length === 0) return;
        
        const progressContainer = document.getElementById('concat_upload_progress');
        const statusText = document.getElementById('concat_upload_status');
        const percentText = document.getElementById('concat_upload_percent');
        const progressBar = document.getElementById('concat_upload_bar');
        
        if (progressContainer) {
            progressContainer.style.display = 'block';
        }
        
        const totalFiles = selectedFiles.length;
        let uploadedCount = 0;
        
        for (const file of selectedFiles) {
            try {
                if (statusText) statusText.textContent = `正在上传: ${file.name}`;
                
                const formData = new FormData();
                formData.append('file', file);
                
                const response = await fetch(`${API_BASE}/upload`, {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    await addFileToSession(result.data);
                    uploadedCount++;
                } else {
                    showNotification(`上传失败: ${result.error}`, 'error');
                }
                
                const percent = Math.round((uploadedCount / totalFiles) * 100);
                if (percentText) percentText.textContent = `${percent}%`;
                if (progressBar) progressBar.style.width = `${percent}%`;
                
            } catch (error) {
                console.error('[ExcelConcat] Upload error:', error);
                showNotification(`上传失败: ${error.message}`, 'error');
            }
        }
        
        if (statusText) statusText.textContent = '上传完成';
        setTimeout(() => {
            if (progressContainer) progressContainer.style.display = 'none';
        }, 1000);
        
        event.target.value = '';
        renderFilesList();
        updateButtons();
    }
    
    async function addFileToSession(fileData) {
        try {
            const response = await fetch(`${API_BASE}/session/${sessionId}/add_file`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file_id: fileData.file_id,
                    file_path: fileData.file_path,
                    original_filename: fileData.original_filename,
                    file_size: fileData.file_size
                })
            });
            
            const result = await response.json();
            if (result.success) {
                files.push(result.data.file_entry);
            }
        } catch (error) {
            console.error('[ExcelConcat] Add file error:', error);
        }
    }
    
    function renderFilesList() {
        const container = document.getElementById('concat_files_list');
        const countSpan = document.getElementById('concat_files_count');
        
        if (!container) return;
        
        if (countSpan) countSpan.textContent = files.length;
        
        if (files.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 40px; color: var(--text-color-tertiary);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor" style="opacity: 0.3; margin-bottom: 10px;"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/></svg>
                    <p>尚未选择任何文件</p>
                    <p style="font-size: 0.85em;">请点击上方按钮选择Excel文件</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = files.map((file, index) => `
            <div class="concat-file-item" data-file-id="${file.id}">
                <div class="concat-file-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M12.9,14.5L15.8,19H14L12,15.6L10,19H8.2L11.1,14.5L8.2,10H10L12,13.4L14,10H15.8L12.9,14.5Z"/></svg>
                </div>
                <div class="concat-file-info">
                    <div class="concat-file-name">${escapeHtml(file.original_filename)}</div>
                    <div class="concat-file-meta">
                        ${formatFileSize(file.file_size)} | 
                        ${file.sheet_names ? file.sheet_names.length : 0} 个工作表 |
                        ${file.total_rows || 0} 行数据
                    </div>
                </div>
                <div class="concat-file-actions">
                    <button class="small-button delete-button" onclick="ExcelConcatModule.removeFile('${file.id}')">移除</button>
                </div>
            </div>
        `).join('');
    }
    
    async function removeFile(fileId) {
        try {
            const response = await fetch(`${API_BASE}/session/${sessionId}/file/${fileId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            if (result.success) {
                files = files.filter(f => f.id !== fileId);
                renderFilesList();
                updateButtons();
            }
        } catch (error) {
            console.error('[ExcelConcat] Remove file error:', error);
        }
    }
    
    async function clearAllFiles() {
        if (!confirm('确定要清空所有已选择的文件吗？')) return;
        
        for (const file of [...files]) {
            await removeFile(file.id);
        }
    }
    
    function renderConfigList() {
        const container = document.getElementById('concat_config_list');
        if (!container) return;
        
        if (files.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-color-tertiary);">
                    <p>请先选择文件</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = files.map((file, index) => `
            <div class="concat-config-item" draggable="true" data-file-id="${file.id}" data-order="${index}">
                <div class="concat-config-header">
                    <div class="concat-config-filename">
                        <span class="concat-config-order">${index + 1}</span>
                        <span>${escapeHtml(file.original_filename)}</span>
                    </div>
                    <button class="small-button delete-button" onclick="ExcelConcatModule.removeFile('${file.id}')" style="padding: 4px 10px; font-size: 0.85em;">移除</button>
                </div>
                <div class="concat-config-body">
                    <div class="config-item">
                        <label>工作表:</label>
                        <select onchange="ExcelConcatModule.updateFileConfig('${file.id}', 'selected_sheet', this.value)">
                            ${(file.sheet_names || []).map(name => 
                                `<option value="${escapeHtml(name)}" ${file.selected_sheet === name ? 'selected' : ''}>${escapeHtml(name)}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="config-item">
                        <label>起始行:</label>
                        <input type="number" min="1" max="${file.total_rows || 999999}" 
                               value="${file.row_range?.start || 1}" 
                               onchange="ExcelConcatModule.updateFileConfig('${file.id}', 'row_start', this.value)">
                    </div>
                    <div class="config-item">
                        <label>结束行:</label>
                        <input type="number" min="1" max="${file.total_rows || 999999}" 
                               value="${file.row_range?.end || file.total_rows || ''}" 
                               placeholder="默认到末尾"
                               onchange="ExcelConcatModule.updateFileConfig('${file.id}', 'row_end', this.value)">
                    </div>
                </div>
            </div>
        `).join('');
        
        initDragAndDrop();
    }
    
    function initDragAndDrop() {
        const items = document.querySelectorAll('.concat-config-item');
        
        items.forEach(item => {
            item.addEventListener('dragstart', handleDragStart);
            item.addEventListener('dragend', handleDragEnd);
            item.addEventListener('dragover', handleDragOver);
            item.addEventListener('drop', handleDrop);
        });
    }
    
    let draggedItem = null;
    
    function handleDragStart(e) {
        draggedItem = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }
    
    function handleDragEnd(e) {
        this.classList.remove('dragging');
        draggedItem = null;
    }
    
    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }
    
    function handleDrop(e) {
        e.preventDefault();
        
        if (draggedItem !== this) {
            const allItems = [...document.querySelectorAll('.concat-config-item')];
            const draggedIndex = allItems.indexOf(draggedItem);
            const targetIndex = allItems.indexOf(this);
            
            if (draggedIndex < targetIndex) {
                this.parentNode.insertBefore(draggedItem, this.nextSibling);
            } else {
                this.parentNode.insertBefore(draggedItem, this);
            }
            
            updateFileOrder();
        }
    }
    
    async function updateFileOrder() {
        const items = document.querySelectorAll('.concat-config-item');
        const fileIds = [...items].map(item => item.dataset.fileId);
        
        try {
            await fetch(`${API_BASE}/session/${sessionId}/reorder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_ids: fileIds })
            });
            
            files = fileIds.map((id, index) => {
                const file = files.find(f => f.id === id);
                if (file) file.order = index + 1;
                return file;
            }).filter(Boolean);
            
            renderConfigList();
            
        } catch (error) {
            console.error('[ExcelConcat] Reorder error:', error);
        }
    }
    
    async function updateFileConfig(fileId, field, value) {
        const file = files.find(f => f.id === fileId);
        if (!file) return;
        
        const updateData = {};
        
        if (field === 'selected_sheet') {
            updateData.selected_sheet = value;
            file.selected_sheet = value;
            
            try {
                const response = await fetch(`${API_BASE}/sheet_info`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        file_path: file.file_path,
                        sheet_name: value
                    })
                });
                
                const result = await response.json();
                if (result.success) {
                    file.total_rows = result.data.total_rows;
                    file.columns = result.data.columns;
                    file.row_range = { start: 1, end: result.data.total_rows };
                    renderConfigList();
                }
            } catch (error) {
                console.error('[ExcelConcat] Get sheet info error:', error);
            }
            
        } else if (field === 'row_start') {
            const start = parseInt(value) || 1;
            file.row_range = file.row_range || {};
            file.row_range.start = start;
            updateData.row_range = file.row_range;
            
        } else if (field === 'row_end') {
            const end = parseInt(value) || null;
            file.row_range = file.row_range || {};
            file.row_range.end = end;
            updateData.row_range = file.row_range;
        }
        
        try {
            await fetch(`${API_BASE}/session/${sessionId}/file/${fileId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
        } catch (error) {
            console.error('[ExcelConcat] Update config error:', error);
        }
    }
    
    async function refreshPreview() {
        const container = document.getElementById('concat_preview_container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="loading-state" style="text-align: center; padding: 40px;">
                <div class="spinner" style="width: 40px; height: 40px; border: 3px solid var(--border-color); border-top-color: var(--primary-color); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px;"></div>
                <p style="color: var(--text-color-secondary);">正在加载预览数据...</p>
            </div>
        `;
        
        try {
            const response = await fetch(`${API_BASE}/session/${sessionId}/preview`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ preview_rows: 5 })
            });
            
            const result = await response.json();
            
            if (result.success) {
                previewData = result.data;
                renderPreview(result.data);
            } else {
                container.innerHTML = `
                    <div class="info error" style="padding: 20px; border-radius: 8px;">
                        预览失败: ${escapeHtml(result.error)}
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('[ExcelConcat] Preview error:', error);
            container.innerHTML = `
                <div class="info error" style="padding: 20px; border-radius: 8px;">
                    预览失败: ${escapeHtml(error.message)}
                </div>
            `;
        }
    }
    
    function renderPreview(data) {
        const container = document.getElementById('concat_preview_container');
        const summaryContainer = document.getElementById('concat_preview_summary');
        
        if (!container) return;
        
        let totalRows = 0;
        
        container.innerHTML = data.preview_results.map((item, index) => {
            if (item.error) {
                return `
                    <div class="concat-preview-item">
                        <div class="concat-preview-header">
                            <div class="concat-preview-filename">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#ef4444"><path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,17A1.5,1.5 0 0,0 13.5,15.5A1.5,1.5 0 0,0 12,14A1.5,1.5 0 0,0 10.5,15.5A1.5,1.5 0 0,0 12,17M12,10C12.55,10 13,9.55 13,9V6C13,5.45 12.55,5 12,5C11.45,5 11,5.45 11,6V9C11,9.55 11.45,10 12,10Z"/></svg>
                                ${escapeHtml(item.filename)}
                            </div>
                            <span style="color: #ef4444;">错误: ${escapeHtml(item.error)}</span>
                        </div>
                    </div>
                `;
            }
            
            const selectedRows = item.selected_rows || 0;
            totalRows += selectedRows;
            
            const columns = item.columns || [];
            const previewRows = item.preview_data || [];
            
            return `
                <div class="concat-preview-item">
                    <div class="concat-preview-header">
                        <div class="concat-preview-filename">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="var(--primary-color)"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/></svg>
                            ${escapeHtml(item.filename)} - ${escapeHtml(item.sheet_name || 'Sheet1')}
                        </div>
                        <div class="concat-preview-meta">
                            行范围: ${item.row_range?.start || 1} - ${item.row_range?.end || item.total_rows} |
                            共 ${selectedRows} 行
                        </div>
                    </div>
                    <div style="overflow-x: auto;">
                        <table class="concat-preview-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    ${columns.map(col => `<th>${escapeHtml(col.name)}</th>`).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                ${previewRows.map((row, rowIndex) => `
                                    <tr>
                                        <td>${row.row_index || rowIndex + 1}</td>
                                        ${columns.map(col => `<td>${escapeHtml(truncateText(row.data?.[col.name] || '', 50))}</td>`).join('')}
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }).join('');
        
        if (summaryContainer) {
            summaryContainer.style.display = 'block';
            document.getElementById('concat_summary_files').textContent = data.total_files;
            document.getElementById('concat_summary_rows').textContent = totalRows.toLocaleString();
            document.getElementById('concat_summary_cols').textContent = data.all_columns?.length || 0;
        }
    }
    
    async function executeConcat() {
        const executingPanel = document.getElementById('concat_executing_panel');
        const successPanel = document.getElementById('concat_result_success');
        const errorPanel = document.getElementById('concat_result_error');
        
        if (executingPanel) executingPanel.style.display = 'block';
        if (successPanel) successPanel.style.display = 'none';
        if (errorPanel) errorPanel.style.display = 'none';
        
        const outputFilename = document.getElementById('concat_output_filename')?.value || '';
        const outputSheet = document.getElementById('concat_output_sheet')?.value || 'Sheet1';
        
        try {
            const response = await fetch(`${API_BASE}/session/${sessionId}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    output_filename: outputFilename,
                    output_sheet_name: outputSheet
                })
            });
            
            const result = await response.json();
            
            if (executingPanel) executingPanel.style.display = 'none';
            
            if (result.success) {
                showSuccessResult(result.data);
            } else {
                showErrorResult(result.error);
            }
            
            loadHistory();
            
        } catch (error) {
            console.error('[ExcelConcat] Execute error:', error);
            if (executingPanel) executingPanel.style.display = 'none';
            showErrorResult(error.message);
        }
    }
    
    function showSuccessResult(data) {
        const successPanel = document.getElementById('concat_result_success');
        if (successPanel) successPanel.style.display = 'block';
        
        document.getElementById('concat_result_rows').textContent = data.total_rows?.toLocaleString() || '0';
        document.getElementById('concat_result_time').textContent = data.elapsed_time || '0';
        document.getElementById('concat_result_filename').textContent = data.output_filename || '-';
        document.getElementById('concat_result_size').textContent = data.output_size_mb ? `${data.output_size_mb} MB` : '-';
        document.getElementById('concat_result_sheet').textContent = data.output_sheet_name || '-';
        document.getElementById('concat_result_files').textContent = data.total_files || '0';
        
        const logContainer = document.getElementById('concat_result_log');
        if (logContainer && data.log) {
            logContainer.innerHTML = data.log.map(entry => {
                const statusIcon = entry.status === 'success' 
                    ? '<span style="color: var(--success-color);">✓</span>'
                    : '<span style="color: #ef4444;">✗</span>';
                const rowsInfo = entry.rows_added ? ` (${entry.rows_added} 行)` : '';
                const rangeInfo = entry.range ? ` [${entry.range}]` : '';
                const errorMsg = entry.message ? ` - ${entry.message}` : '';
                
                return `<div style="padding: 5px 0; border-bottom: 1px solid var(--border-color);">
                    ${statusIcon} ${escapeHtml(entry.file)}${entry.sheet ? ` / ${escapeHtml(entry.sheet)}` : ''}${rangeInfo}${rowsInfo}${errorMsg}
                </div>`;
            }).join('');
        }
        
        window._concatResultData = data;
    }
    
    function showErrorResult(error) {
        const errorPanel = document.getElementById('concat_result_error');
        if (errorPanel) errorPanel.style.display = 'block';
        
        const errorMsg = document.getElementById('concat_error_message');
        if (errorMsg) errorMsg.textContent = error;
    }
    
    function downloadResult() {
        const data = window._concatResultData;
        if (data && data.output_filename) {
            window.location.href = `${API_BASE}/download/${encodeURIComponent(data.output_filename)}`;
        }
    }
    
    function openFolder() {
        showNotification('请在下载后查看文件所在位置', 'info');
    }
    
    async function loadHistory() {
        const container = document.getElementById('concat_history_list');
        if (!container) return;
        
        try {
            const response = await fetch(`${API_BASE}/history`);
            const result = await response.json();
            
            if (result.success && result.data.history?.length > 0) {
                container.innerHTML = result.data.history.reverse().map(item => `
                    <div class="concat-history-item">
                        <div class="concat-history-info">
                            <div class="concat-history-filename">${escapeHtml(item.output_filename)}</div>
                            <div class="concat-history-meta">
                                ${item.total_rows?.toLocaleString() || 0} 行 | 
                                ${item.total_files} 个文件 | 
                                ${item.elapsed_time}s | 
                                ${new Date(item.timestamp).toLocaleString()}
                            </div>
                        </div>
                        <button class="small-button" onclick="window.location.href='${API_BASE}/download/${encodeURIComponent(item.output_filename)}'">
                            下载
                        </button>
                    </div>
                `).join('');
            } else {
                container.innerHTML = `
                    <div style="text-align: center; color: var(--text-color-tertiary); padding: 20px;">
                        暂无历史记录
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('[ExcelConcat] Load history error:', error);
        }
    }
    
    function switchStep(stepName, element) {
        const steps = ['files', 'config', 'preview', 'output', 'result'];
        const currentIndex = steps.indexOf(currentStep);
        const targetIndex = steps.indexOf(stepName);
        
        if (targetIndex > currentIndex && !canProceedToStep(stepName)) {
            showNotification('请先完成前面的步骤', 'warning');
            return;
        }
        
        goToStep(stepName);
    }
    
    function goToStep(stepName) {
        currentStep = stepName;
        
        document.querySelectorAll('.sub-tab-content').forEach(el => {
            el.classList.remove('active');
        });
        
        const stepContent = document.getElementById(`concat-step-${stepName}`);
        if (stepContent) stepContent.classList.add('active');
        
        document.querySelectorAll('#concat-stepper .step-item').forEach((el, index) => {
            const steps = ['files', 'config', 'preview', 'output', 'result'];
            const stepIndex = steps.indexOf(stepName);
            
            el.classList.remove('active', 'completed');
            if (index < stepIndex) {
                el.classList.add('completed');
            } else if (index === stepIndex) {
                el.classList.add('active');
            }
        });
        
        if (stepName === 'config') {
            renderConfigList();
        } else if (stepName === 'preview') {
            refreshPreview();
        } else if (stepName === 'result') {
            executeConcat();
        }
    }
    
    function canProceedToStep(stepName) {
        if (stepName === 'config' || stepName === 'preview' || stepName === 'output' || stepName === 'result') {
            return files.length > 0;
        }
        return true;
    }
    
    function updateButtons() {
        const nextBtn1 = document.getElementById('concat_next_step1_btn');
        const clearBtn = document.getElementById('concat_clear_all_btn');
        
        if (nextBtn1) nextBtn1.disabled = files.length === 0;
        if (clearBtn) clearBtn.disabled = files.length === 0;
    }
    
    function resetAll() {
        files = [];
        previewData = null;
        currentStep = 'files';
        
        init().then(() => {
            goToStep('files');
            renderFilesList();
            updateButtons();
            
            const successPanel = document.getElementById('concat_result_success');
            const errorPanel = document.getElementById('concat_result_error');
            if (successPanel) successPanel.style.display = 'none';
            if (errorPanel) errorPanel.style.display = 'none';
            
            const filenameInput = document.getElementById('concat_output_filename');
            if (filenameInput) filenameInput.value = '';
        });
    }
    
    function showNotification(message, type = 'info') {
        console.log(`[ExcelConcat][${type}] ${message}`);
        
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            alert(message);
        }
    }
    
    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }
    
    function formatFileSize(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    function truncateText(text, maxLength) {
        if (!text) return '';
        text = String(text);
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }
    
    document.addEventListener('DOMContentLoaded', init);
    
    return {
        init,
        switchStep,
        goToStep,
        removeFile,
        updateFileConfig,
        refreshPreview,
        resetAll,
        loadHistory,
        downloadResult,
        openFolder
    };
})();

window.switchLPLMode = function(mode) {
    document.querySelectorAll('.lpl-mode-panel').forEach(el => {
        el.style.display = 'none';
        el.classList.remove('active');
    });
    
    document.querySelectorAll('#local_patent_lib-tab .mode-switcher-tab').forEach(el => {
        el.classList.remove('active');
    });
    
    if (mode === 'lib') {
        document.getElementById('lpl-lib-mode-panel').style.display = 'block';
        document.getElementById('lpl-lib-mode-panel').classList.add('active');
        document.getElementById('lpl-mode-tab-lib').classList.add('active');
    } else if (mode === 'concat') {
        document.getElementById('lpl-concat-mode-panel').style.display = 'block';
        document.getElementById('lpl-concat-mode-panel').classList.add('active');
        document.getElementById('lpl-mode-tab-concat').classList.add('active');
    }
};
