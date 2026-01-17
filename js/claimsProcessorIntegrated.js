/**
 * 专利权利要求处理器 - 主页面集成版本
 * 版本: 2.0.0 - BytesIO修复版本
 * 更新时间: 2026-01-16 23:50
 */

console.log('Claims Processor Integrated v2.0.0 - BytesIO Export Fix Loaded');

// 全局状态
let claimsCurrentFile = null;
let claimsCurrentFilePath = null; // 存储服务器端文件路径
let claimsCurrentFileId = null; // 存储文件ID
let claimsCurrentTaskId = null;
let claimsProcessingInterval = null;
let claimsProcessedData = null;

// 初始化函数
function initClaimsProcessor() {
    const fileInput = document.getElementById('claims_excel_file');
    const processBtn = document.getElementById('claims_process_btn');
    const exportExcelBtn = document.getElementById('claims_export_excel_btn');
    const exportJsonBtn = document.getElementById('claims_export_json_btn');
    
    if (!fileInput) return; // 如果元素不存在，直接返回
    
    // 文件选择事件
    fileInput.addEventListener('change', handleClaimsFileSelect);
    
    // 处理按钮
    if (processBtn) {
        processBtn.addEventListener('click', handleClaimsProcess);
    }
    
    // 导出按钮
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', () => exportClaimsResults('excel'));
    }
    
    if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', () => exportClaimsResults('json'));
    }
}

// 处理文件选择
async function handleClaimsFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    claimsCurrentFile = file;
    
    // 显示加载状态
    showClaimsMessage('正在上传文件...', 'info');
    
    try {
        // 上传文件
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/claims/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        console.log('Upload response:', data); // 调试日志
        
        if (data.success) {
            // 检查返回的数据结构 - data.data 包含实际数据
            const responseData = data.data || {};
            const sheets = responseData.sheet_names || [];
            const filePath = responseData.file_path || '';
            const fileId = responseData.file_id || '';
            
            // 存储文件信息供后续使用
            claimsCurrentFilePath = filePath;
            claimsCurrentFileId = fileId;
            
            if (sheets.length === 0) {
                showClaimsMessage('文件中没有找到工作表', 'error');
                return;
            }
            
            // 显示工作表选择器
            const sheetContainer = document.getElementById('claims_sheet_selector_container');
            const sheetSelect = document.getElementById('claims_sheet_selector');
            
            if (sheetContainer && sheetSelect) {
                sheetSelect.innerHTML = '';
                sheets.forEach(sheet => {
                    const option = document.createElement('option');
                    option.value = sheet;
                    option.textContent = sheet;
                    sheetSelect.appendChild(option);
                });
                
                sheetContainer.style.display = 'block';
                
                // 加载第一个工作表的列
                loadClaimsColumns(filePath, sheets[0]);
                
                // 监听工作表变化
                sheetSelect.addEventListener('change', (e) => {
                    loadClaimsColumns(filePath, e.target.value);
                });
            }
            
            showClaimsMessage('文件上传成功！', 'success');
        } else {
            showClaimsMessage('上传失败：' + (data.error || '未知错误'), 'error');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showClaimsMessage('上传失败：' + error.message, 'error');
    }
}

// 加载列信息
async function loadClaimsColumns(filePath, sheetName) {
    try {
        const response = await fetch('/api/claims/columns', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_path: filePath,
                sheet_name: sheetName
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            const responseData = data.data || {};
            const columns = responseData.columns || [];
            
            const columnContainer = document.getElementById('claims_column_selector_container');
            const columnSelect = document.getElementById('claims_column_selector');
            const processBtn = document.getElementById('claims_process_btn');
            
            if (columnContainer && columnSelect) {
                columnSelect.innerHTML = '';
                columns.forEach(column => {
                    const option = document.createElement('option');
                    option.value = column;
                    option.textContent = column;
                    columnSelect.appendChild(option);
                });
                
                columnContainer.style.display = 'block';
                
                // 启用处理按钮
                if (processBtn) {
                    processBtn.disabled = false;
                }
            }
        } else {
            showClaimsMessage('加载列信息失败：' + (data.error || '未知错误'), 'error');
        }
    } catch (error) {
        console.error('Load columns error:', error);
        showClaimsMessage('加载列信息失败：' + error.message, 'error');
    }
}

// 开始处理
async function handleClaimsProcess() {
    const sheetSelect = document.getElementById('claims_sheet_selector');
    const columnSelect = document.getElementById('claims_column_selector');
    const processBtn = document.getElementById('claims_process_btn');
    
    if (!sheetSelect || !columnSelect) return;
    
    const sheetName = sheetSelect.value;
    const columnName = columnSelect.value;
    
    // 禁用按钮
    if (processBtn) {
        processBtn.disabled = true;
        processBtn.textContent = '处理中...';
    }
    
    // 显示进度容器
    const progressContainer = document.getElementById('claims_progress_container');
    if (progressContainer) {
        progressContainer.style.display = 'block';
    }
    
    try {
        const response = await fetch('/api/claims/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_id: claimsCurrentFileId,
                sheet_name: sheetName,
                column_name: columnName
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            const responseData = data.data || {};
            claimsCurrentTaskId = responseData.task_id || data.task_id;
            // 开始轮询状态
            startClaimsPolling();
        } else {
            showClaimsMessage('处理失败：' + data.error, 'error');
            if (processBtn) {
                processBtn.disabled = false;
                processBtn.textContent = '开始处理';
            }
        }
    } catch (error) {
        console.error('Process error:', error);
        showClaimsMessage('处理失败：' + error.message, 'error');
        if (processBtn) {
            processBtn.disabled = false;
            processBtn.textContent = '开始处理';
        }
    }
}

// 轮询处理状态
function startClaimsPolling() {
    if (claimsProcessingInterval) {
        clearInterval(claimsProcessingInterval);
    }
    
    claimsProcessingInterval = setInterval(async () => {
        try {
            const response = await fetch(`/api/claims/status/${claimsCurrentTaskId}`);
            const data = await response.json();
            
            if (data.success) {
                const responseData = data.data || {};
                const progress = responseData.progress || data.progress || 0;
                const status = responseData.status || data.status;
                const error = responseData.error || data.error;
                
                updateClaimsProgress(progress);
                
                if (status === 'completed') {
                    clearInterval(claimsProcessingInterval);
                    loadClaimsResults();
                } else if (status === 'failed') {
                    clearInterval(claimsProcessingInterval);
                    showClaimsMessage('处理失败：' + error, 'error');
                    resetClaimsProcessButton();
                }
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    }, 1000);
}

// 更新进度
function updateClaimsProgress(progress) {
    const progressBar = document.getElementById('claims_progress_bar');
    const progressText = document.getElementById('claims_progress_text');
    
    if (progressBar) {
        progressBar.style.width = progress + '%';
    }
    
    if (progressText) {
        progressText.textContent = Math.round(progress) + '%';
    }
}

// 加载结果
async function loadClaimsResults() {
    try {
        const response = await fetch(`/api/claims/result/${claimsCurrentTaskId}`);
        const data = await response.json();
        
        if (data.success) {
            const responseData = data.data || {};
            
            // 后端返回的结构是 {summary: {...}, claims: [...], errors: [...]}
            claimsProcessedData = responseData;
            displayClaimsResults(responseData);
            showClaimsMessage('处理完成！', 'success');
        } else {
            showClaimsMessage('获取结果失败：' + data.error, 'error');
        }
    } catch (error) {
        console.error('Load results error:', error);
        showClaimsMessage('获取结果失败：' + error.message, 'error');
    }
    
    resetClaimsProcessButton();
}

// 显示结果
function displayClaimsResults(result) {
    // result 结构: {summary: {...}, claims: [...], errors: [...]}
    const summary = result.summary || {};
    const claims = result.claims || [];
    
    // 更新统计信息
    document.getElementById('claims_stat_cells').textContent = summary.total_cells_processed || 0;
    document.getElementById('claims_stat_total').textContent = summary.total_claims_extracted || 0;
    document.getElementById('claims_stat_independent').textContent = summary.independent_claims_count || 0;
    document.getElementById('claims_stat_dependent').textContent = summary.dependent_claims_count || 0;
    
    // 显示结果容器
    const resultsContainer = document.getElementById('claims_results_container');
    if (resultsContainer) {
        resultsContainer.style.display = 'block';
    }
    
    // 填充表格
    const tbody = document.getElementById('claims_results_tbody');
    if (tbody && claims.length > 0) {
        tbody.innerHTML = '';
        
        claims.forEach(claim => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${claim.claim_number}</td>
                <td><span class="badge ${claim.claim_type === 'independent' ? 'badge-primary' : 'badge-secondary'}">${claim.claim_type === 'independent' ? '独立' : '从属'}</span></td>
                <td>${claim.language === 'zh' ? '中文' : claim.language === 'en' ? '英文' : claim.language}</td>
                <td>${claim.referenced_claims && claim.referenced_claims.length > 0 ? claim.referenced_claims.join(', ') : '-'}</td>
                <td title="${claim.claim_text}">${claim.claim_text.substring(0, 100)}${claim.claim_text.length > 100 ? '...' : ''}</td>
                <td>${(claim.confidence_score * 100).toFixed(0)}%</td>
            `;
        });
    }
}

// 导出结果
async function exportClaimsResults(format) {
    if (!claimsCurrentTaskId) {
        showClaimsMessage('没有可导出的结果', 'error');
        return;
    }
    
    try {
        console.log(`[Export v2.0] Starting ${format} export for task: ${claimsCurrentTaskId}`);
        showClaimsMessage(`正在导出${format.toUpperCase()}文件...`, 'info');
        
        const response = await fetch(`/api/claims/export/${claimsCurrentTaskId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ format: format })
        });
        
        console.log(`[Export v2.0] Response status: ${response.status}`);
        console.log(`[Export v2.0] Response headers:`, {
            contentType: response.headers.get('Content-Type'),
            contentLength: response.headers.get('Content-Length'),
            contentDisposition: response.headers.get('Content-Disposition')
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '导出失败');
        }
        
        const blob = await response.blob();
        
        console.log(`[Export v2.0] Blob size: ${blob.size} bytes`);
        console.log(`[Export v2.0] Blob type: ${blob.type}`);
        
        if (blob.size === 0) {
            throw new Error('导出的文件为空');
        }
        
        // 获取文件名
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `claims_result_${Date.now()}.${format === 'excel' ? 'xlsx' : 'json'}`;
        
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1].replace(/['"]/g, '');
            }
        }
        
        console.log(`[Export v2.0] Filename: ${filename}`);
        
        // 创建下载链接
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        console.log(`[Export v2.0] Download triggered`);
        
        // 延迟清理
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            console.log(`[Export v2.0] Cleanup complete`);
        }, 100);
        
        showClaimsMessage('导出成功！', 'success');
    } catch (error) {
        console.error('[Export v2.0] Export error:', error);
        showClaimsMessage('导出失败：' + error.message, 'error');
    }
}

// 重置处理按钮
function resetClaimsProcessButton() {
    const processBtn = document.getElementById('claims_process_btn');
    if (processBtn) {
        processBtn.disabled = false;
        processBtn.textContent = '开始处理';
    }
}

// 显示消息
function showClaimsMessage(message, type) {
    // 在控制台显示
    console.log(`[${type}] ${message}`);
    
    // 也可以在页面上显示（如果需要）
    const progressText = document.getElementById('claims_progress_text');
    if (progressText && type === 'info') {
        progressText.textContent = message;
    }
    
    // 如果是错误，使用alert
    if (type === 'error') {
        alert(message);
    }
}

// 在页面加载时初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initClaimsProcessor);
} else {
    initClaimsProcessor();
}
