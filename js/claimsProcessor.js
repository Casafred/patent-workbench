/**
 * 专利权利要求处理器前端脚本
 */

// 全局状态
let currentFileId = null;
let currentTaskId = null;
let processingInterval = null;

// DOM元素
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const sheetNames = document.getElementById('sheetNames');
const columnNames = document.getElementById('columnNames');
const configSection = document.getElementById('configSection');
const sheetSelect = document.getElementById('sheetSelect');
const columnSelect = document.getElementById('columnSelect');
const processBtn = document.getElementById('processBtn');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const statusMessage = document.getElementById('statusMessage');
const resultsSection = document.getElementById('resultsSection');
const summaryGrid = document.getElementById('summaryGrid');
const claimsTableContainer = document.getElementById('claimsTableContainer');
const exportExcelBtn = document.getElementById('exportExcelBtn');
const exportJsonBtn = document.getElementById('exportJsonBtn');
const viewReportBtn = document.getElementById('viewReportBtn');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
});

function initializeEventListeners() {
    // 上传区域点击
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    // 文件选择
    fileInput.addEventListener('change', handleFileSelect);
    
    // 拖拽上传
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });
    
    // 工作表和列选择
    sheetSelect.addEventListener('change', updateColumnSelect);
    columnSelect.addEventListener('change', validateProcessButton);
    
    // 处理按钮
    processBtn.addEventListener('click', startProcessing);
    
    // 导出按钮
    exportExcelBtn.addEventListener('click', () => exportResults('excel'));
    exportJsonBtn.addEventListener('click', () => exportResults('json'));
    viewReportBtn.addEventListener('click', viewReport);
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        handleFile(file);
    }
}

async function handleFile(file) {
    // 验证文件类型
    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
        showError('请上传.xlsx或.xls格式的Excel文件');
        return;
    }
    
    // 显示上传中状态
    showInfo('正在上传文件...');
    
    try {
        // 创建FormData
        const formData = new FormData();
        formData.append('file', file);
        
        // 上传文件
        const response = await fetch('/api/claims/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentFileId = result.data.file_id;
            displayFileInfo(result.data);
            showSuccess('文件上传成功！');
        } else {
            showError(result.error || '文件上传失败');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showError('文件上传失败: ' + error.message);
    }
}

function displayFileInfo(data) {
    // 显示文件信息
    fileName.textContent = data.original_filename;
    sheetNames.textContent = data.sheet_names.join(', ');
    columnNames.textContent = data.columns.join(', ');
    fileInfo.style.display = 'block';
    
    // 填充工作表选择器
    sheetSelect.innerHTML = '<option value="">请选择...</option>';
    data.sheet_names.forEach(sheet => {
        const option = document.createElement('option');
        option.value = sheet;
        option.textContent = sheet;
        sheetSelect.appendChild(option);
    });
    
    // 填充列选择器
    columnSelect.innerHTML = '<option value="">请选择...</option>';
    data.columns.forEach(col => {
        const option = document.createElement('option');
        option.value = col;
        option.textContent = col;
        columnSelect.appendChild(option);
    });
    
    // 显示配置区域
    configSection.style.display = 'block';
}

function updateColumnSelect() {
    validateProcessButton();
}

function validateProcessButton() {
    const sheetSelected = sheetSelect.value !== '';
    const columnSelected = columnSelect.value !== '';
    processBtn.disabled = !(sheetSelected && columnSelected);
}

async function startProcessing() {
    const sheetName = sheetSelect.value;
    const columnName = columnSelect.value;
    
    if (!currentFileId || !columnName) {
        showError('请先上传文件并选择列');
        return;
    }
    
    // 禁用处理按钮
    processBtn.disabled = true;
    
    // 显示进度条
    progressContainer.style.display = 'block';
    progressFill.style.width = '0%';
    progressFill.textContent = '0%';
    statusMessage.style.display = 'block';
    statusMessage.className = 'status-message status-info';
    statusMessage.textContent = '正在启动处理任务...';
    
    try {
        // 启动处理任务
        const response = await fetch('/api/claims/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_id: currentFileId,
                column_name: columnName,
                sheet_name: sheetName || null
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentTaskId = result.data.task_id;
            statusMessage.textContent = '处理任务已启动，正在处理中...';
            
            // 开始轮询任务状态
            startStatusPolling();
        } else {
            showError(result.error || '启动处理任务失败');
            processBtn.disabled = false;
            progressContainer.style.display = 'none';
        }
    } catch (error) {
        console.error('Processing error:', error);
        showError('启动处理任务失败: ' + error.message);
        processBtn.disabled = false;
        progressContainer.style.display = 'none';
    }
}

function startStatusPolling() {
    // 每2秒检查一次任务状态
    processingInterval = setInterval(checkProcessingStatus, 2000);
}

async function checkProcessingStatus() {
    if (!currentTaskId) {
        clearInterval(processingInterval);
        return;
    }
    
    try {
        const response = await fetch(`/api/claims/status/${currentTaskId}`);
        const result = await response.json();
        
        if (result.success) {
            const data = result.data;
            
            // 更新进度
            progressFill.style.width = data.progress + '%';
            progressFill.textContent = data.progress + '%';
            statusMessage.textContent = data.message;
            
            // 检查是否完成
            if (data.status === 'completed') {
                clearInterval(processingInterval);
                handleProcessingComplete(data);
            } else if (data.status === 'failed') {
                clearInterval(processingInterval);
                showError('处理失败: ' + (data.error || '未知错误'));
                processBtn.disabled = false;
            }
        }
    } catch (error) {
        console.error('Status check error:', error);
    }
}

async function handleProcessingComplete(statusData) {
    statusMessage.className = 'status-message status-success';
    statusMessage.textContent = '处理完成！';
    
    // 获取详细结果
    try {
        const response = await fetch(`/api/claims/result/${currentTaskId}`);
        const result = await response.json();
        
        if (result.success) {
            displayResults(result.data);
        } else {
            showError('获取处理结果失败');
        }
    } catch (error) {
        console.error('Result fetch error:', error);
        showError('获取处理结果失败: ' + error.message);
    }
    
    processBtn.disabled = false;
}

function displayResults(data) {
    // 显示摘要
    summaryGrid.innerHTML = `
        <div class="summary-item">
            <div class="summary-value">${data.summary.total_cells_processed}</div>
            <div class="summary-label">处理单元格数</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${data.summary.total_claims_extracted}</div>
            <div class="summary-label">提取权利要求数</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${data.summary.independent_claims_count}</div>
            <div class="summary-label">独立权利要求</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${data.summary.dependent_claims_count}</div>
            <div class="summary-label">从属权利要求</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${data.summary.error_count}</div>
            <div class="summary-label">错误数量</div>
        </div>
    `;
    
    // 显示权利要求表格
    if (data.claims && data.claims.length > 0) {
        let tableHTML = `
            <h3 style="margin-top: 30px; margin-bottom: 15px;">权利要求详情</h3>
            <table class="claims-table">
                <thead>
                    <tr>
                        <th>序号</th>
                        <th>类型</th>
                        <th>语言</th>
                        <th>引用</th>
                        <th>权利要求文本</th>
                        <th>置信度</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        // 只显示前50条
        const displayClaims = data.claims.slice(0, 50);
        
        displayClaims.forEach(claim => {
            const typeClass = claim.claim_type === 'independent' ? 'badge-independent' : 'badge-dependent';
            const typeText = claim.claim_type === 'independent' ? '独立' : '从属';
            const references = claim.referenced_claims.length > 0 
                ? claim.referenced_claims.join(', ') 
                : '-';
            
            tableHTML += `
                <tr>
                    <td>${claim.claim_number}</td>
                    <td><span class="claim-type-badge ${typeClass}">${typeText}</span></td>
                    <td>${claim.language}</td>
                    <td>${references}</td>
                    <td style="max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" 
                        title="${escapeHtml(claim.claim_text)}">
                        ${escapeHtml(claim.claim_text.substring(0, 100))}${claim.claim_text.length > 100 ? '...' : ''}
                    </td>
                    <td>${(claim.confidence_score * 100).toFixed(0)}%</td>
                </tr>
            `;
        });
        
        tableHTML += `
                </tbody>
            </table>
        `;
        
        if (data.claims.length > 50) {
            tableHTML += `<p style="margin-top: 10px; color: #666; text-align: center;">
                显示前50条，共${data.claims.length}条权利要求。导出文件可查看全部。
            </p>`;
        }
        
        claimsTableContainer.innerHTML = tableHTML;
    }
    
    // 显示结果区域
    resultsSection.style.display = 'block';
    
    // 滚动到结果区域
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

async function exportResults(format) {
    if (!currentTaskId) {
        showError('没有可导出的结果');
        return;
    }
    
    try {
        const response = await fetch(`/api/claims/export/${currentTaskId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ format: format })
        });
        
        if (response.ok) {
            // 下载文件
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `patent_claims_${new Date().getTime()}.${format === 'excel' ? 'xlsx' : 'json'}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            showSuccess(`${format.toUpperCase()}文件已下载`);
        } else {
            const result = await response.json();
            showError(result.error || '导出失败');
        }
    } catch (error) {
        console.error('Export error:', error);
        showError('导出失败: ' + error.message);
    }
}

async function viewReport() {
    if (!currentTaskId) {
        showError('没有可查看的报告');
        return;
    }
    
    try {
        const response = await fetch(`/api/claims/report/${currentTaskId}`);
        const result = await response.json();
        
        if (result.success) {
            // 在新窗口中显示报告
            const reportWindow = window.open('', '_blank');
            reportWindow.document.write(`
                <html>
                <head>
                    <title>处理报告</title>
                    <style>
                        body {
                            font-family: 'Courier New', monospace;
                            padding: 20px;
                            background-color: #f5f5f5;
                        }
                        pre {
                            background-color: white;
                            padding: 20px;
                            border-radius: 8px;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                            white-space: pre-wrap;
                            word-wrap: break-word;
                        }
                    </style>
                </head>
                <body>
                    <pre>${escapeHtml(result.data.report)}</pre>
                </body>
                </html>
            `);
            reportWindow.document.close();
        } else {
            showError(result.error || '获取报告失败');
        }
    } catch (error) {
        console.error('Report error:', error);
        showError('获取报告失败: ' + error.message);
    }
}

// 工具函数
function showSuccess(message) {
    statusMessage.className = 'status-message status-success';
    statusMessage.textContent = message;
    statusMessage.style.display = 'block';
    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 5000);
}

function showError(message) {
    statusMessage.className = 'status-message status-error';
    statusMessage.textContent = message;
    statusMessage.style.display = 'block';
}

function showInfo(message) {
    statusMessage.className = 'status-message status-info';
    statusMessage.textContent = message;
    statusMessage.style.display = 'block';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
