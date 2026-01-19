/**
 * 专利权利要求处理器前端脚本
 * 版本: 2.1.0 - 集成专利号查询和可视化功能
 * 更新时间: 2026-01-17 18:30
 */

// 版本检查
console.log('Claims Processor v2.1.0 - Patent Query & Visualization Loaded');

// 全局状态
let currentFileId = null;
let currentTaskId = null;
let processingInterval = null;
let currentPatentColumn = null;
let currentClaimsColumn = null;  // 新增：权利要求列
let selectedPatentNumber = null;
let selectedPatentRow = null;
let visualizationRenderer = null;
let columnAnalysis = null;  // 新增：存储列分析结果

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
const patentColumnSelect = document.getElementById('patentColumnSelect');  // 新增
const claimsColumnHint = document.getElementById('claimsColumnHint');      // 新增
const patentColumnHint = document.getElementById('patentColumnHint');      // 新增
const processBtn = document.getElementById('processBtn');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const statusMessage = document.getElementById('statusMessage');
const resultsSection = document.getElementById('resultsSection');
const summaryGrid = document.getElementById('summaryGrid');
const claimsTableContainer = document.getElementById('claimsTableContainer');
const exportExcelBtn = document.getElementById('exportExcelBtn');
const exportJsonBtn = document.getElementById('exportJsonBtn');

// 新增：专利查询和可视化相关元素
const patentQuerySection = document.getElementById('patentQuerySection');
const patentSearchInput = document.getElementById('patentSearchInput');
const searchPatentBtn = document.getElementById('searchPatentBtn');
const searchResultsContainer = document.getElementById('searchResultsContainer');
const searchResults = document.getElementById('searchResults');
const selectedPatentInfo = document.getElementById('selectedPatentInfo');
const selectedPatentNumber = document.getElementById('selectedPatentNumber');
const selectedPatentRow = document.getElementById('selectedPatentRow');
const visualizePatentBtn = document.getElementById('visualizePatentBtn');
const visualizationSection = document.getElementById('visualizationSection');
const styleSelector = document.getElementById('styleSelector');
const zoomIn = document.getElementById('zoomIn');
const zoomOut = document.getElementById('zoomOut');
const zoomReset = document.getElementById('zoomReset');
const centerView = document.getElementById('centerView');
const visualizationContainer = document.getElementById('visualizationContainer');
const vizLoadingIndicator = document.getElementById('vizLoadingIndicator');
const vizErrorMessage = document.getElementById('vizErrorMessage');
const vizErrorText = document.getElementById('vizErrorText');

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
    patentColumnSelect.addEventListener('change', validateProcessButton);  // 新增
    
    // 处理按钮
    processBtn.addEventListener('click', startProcessing);
    
    // 导出按钮
    exportExcelBtn.addEventListener('click', () => exportResults('excel'));
    exportJsonBtn.addEventListener('click', () => exportResults('json'));
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
        const response = await fetch('/api/excel/upload', {
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
    columnNames.textContent = data.columns.map(col => col.name).join(', ');
    fileInfo.style.display = 'block';
    
    // 存储列分析结果
    columnAnalysis = data.column_analysis;
    
    // 填充工作表选择器
    sheetSelect.innerHTML = '<option value="">请选择...</option>';
    data.sheet_names.forEach(sheet => {
        const option = document.createElement('option');
        option.value = sheet;
        option.textContent = sheet;
        sheetSelect.appendChild(option);
    });
    
    // 填充列选择器
    populateColumnSelectors(data.columns);
    
    // 应用智能列识别结果
    applyColumnAnalysis();
    
    // 显示配置区域
    configSection.style.display = 'block';
}

function populateColumnSelectors(columns) {
    // 清空选择器
    columnSelect.innerHTML = '<option value="">请选择...</option>';
    patentColumnSelect.innerHTML = '<option value="">请选择...</option>';
    
    // 填充两个选择器
    columns.forEach(col => {
        // 权利要求列选择器
        const claimsOption = document.createElement('option');
        claimsOption.value = col.name;
        claimsOption.textContent = col.name;
        columnSelect.appendChild(claimsOption);
        
        // 专利号列选择器
        const patentOption = document.createElement('option');
        patentOption.value = col.name;
        patentOption.textContent = col.name;
        patentColumnSelect.appendChild(patentOption);
    });
}

function applyColumnAnalysis() {
    if (!columnAnalysis) return;
    
    // 应用权利要求列识别结果
    if (columnAnalysis.claims_column) {
        const claimsCol = columnAnalysis.claims_column;
        columnSelect.value = claimsCol.column_name;
        currentClaimsColumn = claimsCol.column_name;
        
        // 显示提示信息
        showColumnHint(claimsColumnHint, 'auto-detected', 
            `✨ 自动识别为权利要求列 (置信度: ${(claimsCol.confidence * 100).toFixed(0)}%)`);
    } else {
        showColumnHint(claimsColumnHint, 'manual-required', 
            '⚠️ 未能自动识别权利要求列，请手动选择');
    }
    
    // 应用专利号列识别结果
    if (columnAnalysis.patent_number_column) {
        const patentCol = columnAnalysis.patent_number_column;
        patentColumnSelect.value = patentCol.column_name;
        currentPatentColumn = patentCol.column_name;
        
        // 显示提示信息
        showColumnHint(patentColumnHint, 'auto-detected', 
            `✨ 自动识别为专利号列 (置信度: ${(patentCol.confidence * 100).toFixed(0)}%)`);
    } else {
        showColumnHint(patentColumnHint, 'manual-required', 
            '⚠️ 未能自动识别专利号列，请手动选择');
    }
    
    // 验证处理按钮状态
    validateProcessButton();
}

function showColumnHint(hintElement, type, text) {
    hintElement.className = `column-hint ${type}`;
    hintElement.querySelector('.hint-text').textContent = text;
    hintElement.style.display = 'flex';
}

function updateColumnSelect() {
    // Reset task when sheet changes
    if (currentTaskId) {
        currentTaskId = null;
        resultsSection.style.display = 'none';
        progressContainer.style.display = 'none';
    }
    
    // 重新应用列分析（如果有的话）
    if (columnAnalysis) {
        applyColumnAnalysis();
    }
    
    validateProcessButton();
}

function validateProcessButton() {
    const sheetSelected = sheetSelect.value !== '';
    const claimsColumnSelected = columnSelect.value !== '';
    const patentColumnSelected = patentColumnSelect.value !== '';
    
    // 更新当前选择的列
    currentClaimsColumn = columnSelect.value;
    currentPatentColumn = patentColumnSelect.value;
    
    // Reset task when column changes
    if ((claimsColumnSelected || patentColumnSelected) && currentTaskId) {
        currentTaskId = null;
        resultsSection.style.display = 'none';
        progressContainer.style.display = 'none';
    }
    
    // 只有权利要求列是必须的，专利号列是可选的
    processBtn.disabled = !(sheetSelected && claimsColumnSelected);
    
    // 更新提示信息
    if (claimsColumnSelected && !columnAnalysis?.claims_column) {
        showColumnHint(claimsColumnHint, 'manual-required', 
            '✓ 已手动选择权利要求列');
    }
    
    if (patentColumnSelected && !columnAnalysis?.patent_number_column) {
        showColumnHint(patentColumnHint, 'manual-required', 
            '✓ 已手动选择专利号列');
    }
}

async function startProcessing() {
    const sheetName = sheetSelect.value;
    const columnName = columnSelect.value;  // 权利要求列
    
    if (!currentFileId || !columnName) {
        showError('请先上传文件并选择权利要求列');
        return;
    }
    
    // 禁用处理按钮
    processBtn.disabled = true;
    
    // 隐藏旧结果
    resultsSection.style.display = 'none';
    
    // 显示进度条
    progressContainer.style.display = 'block';
    progressFill.style.width = '0%';
    progressFill.textContent = '0%';
    statusMessage.style.display = 'block';
    statusMessage.className = 'status-message status-info';
    statusMessage.textContent = '正在验证权利要求文本...';
    
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
                sheet_name: sheetName || null,
                patent_column_name: currentPatentColumn || null
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
        console.log(`[Export v2.0] Starting ${format} export for task: ${currentTaskId}`);
        showInfo(`正在导出${format.toUpperCase()}文件...`);
        
        const response = await fetch(`/api/claims/export/${currentTaskId}`, {
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
        
        if (response.ok) {
            // 获取文件名
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `patent_claims_${new Date().getTime()}.${format === 'excel' ? 'xlsx' : 'json'}`;
            
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1].replace(/['"]/g, '');
                }
            }
            
            console.log(`[Export v2.0] Filename: ${filename}`);
            
            // 下载文件
            const blob = await response.blob();
            
            // 验证blob大小
            console.log(`[Export v2.0] Blob size: ${blob.size} bytes`);
            console.log(`[Export v2.0] Blob type: ${blob.type}`);
            
            if (blob.size === 0) {
                console.error('[Export v2.0] Blob is empty!');
                showError('导出的文件为空，请重试');
                return;
            }
            
            // 检查blob内容（前100字节）
            const reader = new FileReader();
            reader.onload = function(e) {
                const arr = new Uint8Array(e.target.result).subarray(0, 100);
                console.log('[Export v2.0] Blob first 100 bytes:', arr);
            };
            reader.readAsArrayBuffer(blob.slice(0, 100));
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            
            console.log(`[Export v2.0] Download triggered for: ${filename}`);
            
            // 延迟清理，确保下载完成
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                console.log('[Export v2.0] Cleanup complete');
            }, 100);
            
            showSuccess(`${format.toUpperCase()}文件已下载`);
        } else {
            console.error(`[Export v2.0] Request failed with status: ${response.status}`);
            // 尝试解析错误信息
            try {
                const result = await response.json();
                console.error('[Export v2.0] Error response:', result);
                showError(result.error || '导出失败');
            } catch (e) {
                console.error('[Export v2.0] Could not parse error response');
                showError(`导出失败: HTTP ${response.status}`);
            }
        }
    } catch (error) {
        console.error('[Export v2.0] Export error:', error);
        showError('导出失败: ' + error.message);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== 专利号查询和可视化功能 ====================

// 更新事件监听器初始化
const originalInitializeEventListeners = initializeEventListeners;
initializeEventListeners = function() {
    // 调用原有的事件监听器
    originalInitializeEventListeners();
    
    // 新增：专利查询相关事件监听器
    if (searchPatentBtn) {
        searchPatentBtn.addEventListener('click', searchPatentNumbers);
    }
    
    if (patentSearchInput) {
        patentSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchPatentNumbers();
            }
        });
    }
    
    if (visualizePatentBtn) {
        visualizePatentBtn.addEventListener('click', generateVisualization);
    }
    
    // 可视化控制事件
    if (styleSelector) {
        styleSelector.addEventListener('change', () => {
            if (visualizationRenderer && visualizationRenderer.currentData) {
                visualizationRenderer.render(visualizationRenderer.currentData, styleSelector.value);
            }
        });
    }
    
    if (zoomIn) {
        zoomIn.addEventListener('click', () => {
            if (visualizationRenderer) visualizationRenderer.zoomIn();
        });
    }
    
    if (zoomOut) {
        zoomOut.addEventListener('click', () => {
            if (visualizationRenderer) visualizationRenderer.zoomOut();
        });
    }
    
    if (zoomReset) {
        zoomReset.addEventListener('click', () => {
            if (visualizationRenderer) visualizationRenderer.zoomReset();
        });
    }
    
    if (centerView) {
        centerView.addEventListener('click', () => {
            if (visualizationRenderer) visualizationRenderer.centerView();
        });
    }
};

// 显示专利查询区域
function showPatentQuerySection() {
    if (currentFileId && currentPatentColumn) {
        patentQuerySection.style.display = 'block';
        
        // 滚动到专利查询区域
        patentQuerySection.scrollIntoView({ behavior: 'smooth' });
    } else if (currentFileId && !currentPatentColumn) {
        // 如果没有选择专利号列，显示提示
        showError('请先选择专利号列才能使用专利查询功能');
    }
}

// 搜索专利号
async function searchPatentNumbers() {
    const query = patentSearchInput.value.trim();
    
    if (!query) {
        showError('请输入专利号片段');
        return;
    }
    
    if (!currentFileId || !currentPatentColumn) {
        showError('请先上传文件并选择专利号列');
        return;
    }
    
    try {
        showInfo('正在搜索专利号...');
        
        const response = await fetch(`/api/excel/${currentFileId}/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                column_name: currentPatentColumn,
                query: query,
                limit: 20
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            displaySearchResults(result.data.results, query);
        } else {
            showError(result.error || '搜索失败');
        }
    } catch (error) {
        console.error('Search error:', error);
        showError('搜索失败: ' + error.message);
    }
}

// 显示搜索结果
function displaySearchResults(results, query) {
    if (results.length === 0) {
        searchResults.innerHTML = `
            <div style="padding: 30px; text-align: center; color: #666; background-color: #f9fafb; border-radius: 8px;">
                <div style="font-size: 2rem; margin-bottom: 10px;">🔍</div>
                <h4 style="margin-bottom: 5px;">未找到匹配结果</h4>
                <p>未找到包含 "${query}" 的专利公开号</p>
                <p style="font-size: 0.8rem; margin-top: 10px; color: #9ca3af;">
                    提示: 尝试使用更短的专利号片段或检查输入是否正确
                </p>
            </div>
        `;
        document.getElementById('searchResultsCount').textContent = `找到 0 个结果`;
    } else {
        let html = '';
        results.forEach((result, index) => {
            html += `
                <div class="search-result-item" onclick="selectPatent('${result.patent_number}', ${result.row_index})" style="padding: 15px; border-bottom: 1px solid var(--border-color); cursor: pointer; transition: all 0.2s; border-radius: 6px; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div class="search-result-patent" style="font-weight: 600; color: var(--primary-color-dark); font-size: 1.1rem;">${result.patent_number}</div>
                        <span class="badge" style="background-color: #E0F2FE; color: #0369A1; padding: 2px 6px; border-radius: 10px; font-size: 0.7rem;">
                            第 ${result.row_index} 行
                        </span>
                    </div>
                    <div class="search-result-row" style="color: #666; font-size: 0.9rem; margin-top: 5px;">Excel行号: ${result.row_index}</div>
                </div>
            `;
        });
        searchResults.innerHTML = html;
        document.getElementById('searchResultsCount').textContent = `找到 ${results.length} 个结果`;
        
        showSuccess(`找到 ${results.length} 个匹配的专利公开号`);
    }
    
    searchResultsContainer.style.display = 'block';
    selectedPatentInfo.style.display = 'none';
    visualizationSection.style.display = 'none';
}

// 选择专利
function selectPatent(patentNumber, rowIndex) {
    selectedPatentNumber = patentNumber;
    selectedPatentRow = rowIndex;
    
    // 更新选中状态
    document.querySelectorAll('.search-result-item').forEach(item => {
        item.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
    
    // 显示选中的专利信息
    document.getElementById('selectedPatentNumber').textContent = patentNumber;
    document.getElementById('selectedPatentRow').textContent = rowIndex;
    selectedPatentInfo.style.display = 'block';
    
    // 隐藏之前的可视化
    visualizationSection.style.display = 'none';
}

// 生成可视化
async function generateVisualization() {
    if (!selectedPatentNumber) {
        showError('请先选择一个专利公开号');
        return;
    }
    
    try {
        // 显示可视化区域和加载状态
        visualizationSection.style.display = 'block';
        vizLoadingIndicator.style.display = 'block';
        vizErrorMessage.style.display = 'none';
        
        // 滚动到可视化区域
        visualizationSection.scrollIntoView({ behavior: 'smooth' });
        
        showInfo('正在分析权利要求关系...');
        
        // 检查是否有处理结果
        if (!currentTaskId) {
            showError('请先处理权利要求文件，然后再生成可视化');
            vizLoadingIndicator.style.display = 'none';
            return;
        }
        
        // 尝试获取与所选专利号关联的权利要求数据
        try {
            // 获取处理结果
            const response = await fetch(`/api/claims/result/${currentTaskId}`);
            const result = await response.json();
            
            if (result.success) {
                // 构建基于实际权利要求数据的可视化数据
                const visualizationData = buildVisualizationDataFromClaims(result.data.claims, selectedPatentNumber);
                
                // 初始化可视化渲染器
                if (!visualizationRenderer) {
                    visualizationRenderer = new D3TreeRenderer('visualizationContainer');
                }
                
                // 渲染可视化
                vizLoadingIndicator.style.display = 'none';
                visualizationRenderer.render(visualizationData, styleSelector.value);
                
                showSuccess('权利要求关系图生成完成！');
            } else {
                throw new Error('获取权利要求数据失败');
            }
        } catch (apiError) {
            console.warn('API调用失败，使用模拟数据:', apiError);
            // 如果API调用失败，使用模拟数据
            const mockData = createMockVisualizationData(selectedPatentNumber);
            
            // 初始化可视化渲染器
            if (!visualizationRenderer) {
                visualizationRenderer = new D3TreeRenderer('visualizationContainer');
            }
            
            // 渲染可视化
            vizLoadingIndicator.style.display = 'none';
            visualizationRenderer.render(mockData, styleSelector.value);
            
            showSuccess('使用模拟数据生成权利要求关系图完成！');
        }
        
    } catch (error) {
        console.error('Visualization error:', error);
        vizLoadingIndicator.style.display = 'none';
        vizErrorMessage.style.display = 'block';
        vizErrorText.textContent = error.message;
        showError('生成可视化失败: ' + error.message);
    }
}

// 从权利要求数据构建可视化数据
function buildVisualizationDataFromClaims(claims, patentNumber) {
    const nodes = [];
    const links = [];
    const root_nodes = [];
    
    // 首先创建所有节点
    claims.forEach((claim, index) => {
        const node = {
            id: `claim_${claim.claim_number}`,
            claim_number: claim.claim_number,
            claim_text: claim.claim_text,
            claim_type: claim.claim_type,
            level: claim.referenced_claims.length,
            dependencies: claim.referenced_claims,
            children: []
        };
        nodes.push(node);
        
        // 如果是独立权利要求，添加到根节点
        if (claim.claim_type === 'independent') {
            root_nodes.push(node.id);
        }
    });
    
    // 然后创建链接
    nodes.forEach(node => {
        node.dependencies.forEach(dependedClaimNumber => {
            const dependedNode = nodes.find(n => n.claim_number === dependedClaimNumber);
            if (dependedNode) {
                links.push({
                    source: dependedNode.id,
                    target: node.id,
                    type: 'dependency',
                    strength: 1.0
                });
                dependedNode.children.push(node.id);
            }
        });
    });
    
    return {
        patent_number: patentNumber,
        nodes: nodes,
        links: links,
        root_nodes: root_nodes
    };
}

// 创建模拟可视化数据
function createMockVisualizationData(patentNumber) {
    return {
        patent_number: patentNumber,
        nodes: [
            {
                id: "claim_1",
                claim_number: 1,
                claim_text: `一种智能设备，包括：处理器，用于执行应用程序；存储器，与所述处理器连接，用于存储数据。（专利号：${patentNumber}）`,
                claim_type: "independent",
                level: 0,
                dependencies: [],
                children: ["claim_2", "claim_3"]
            },
            {
                id: "claim_2",
                claim_number: 2,
                claim_text: `根据权利要求1所述的智能设备，其特征在于，还包括显示屏，与所述处理器连接。`,
                claim_type: "dependent",
                level: 1,
                dependencies: [1],
                children: ["claim_4"]
            },
            {
                id: "claim_3",
                claim_number: 3,
                claim_text: `根据权利要求1所述的智能设备，其特征在于，还包括传感器模块。`,
                claim_type: "dependent",
                level: 1,
                dependencies: [1],
                children: []
            },
            {
                id: "claim_4",
                claim_number: 4,
                claim_text: `根据权利要求2所述的智能设备，其特征在于，所述显示屏为触摸屏。`,
                claim_type: "dependent",
                level: 2,
                dependencies: [2],
                children: []
            }
        ],
        links: [
            { source: "claim_1", target: "claim_2", type: "dependency", strength: 1.0 },
            { source: "claim_1", target: "claim_3", type: "dependency", strength: 1.0 },
            { source: "claim_2", target: "claim_4", type: "dependency", strength: 1.0 }
        ],
        root_nodes: ["claim_1"]
    };
}

// 重试可视化
function retryVisualization() {
    generateVisualization();
}

// 更新显示结果函数，添加专利查询按钮
const originalDisplayResults = displayResults;
displayResults = function(data) {
    // 调用原有的显示逻辑
    originalDisplayResults(data);
    
    // 显示专利查询区域
    showPatentQuerySection();
};

// ==================== D3.js可视化渲染器 ====================

// D3TreeRenderer类 - 基础D3.js渲染器
class D3TreeRenderer {
    constructor(containerId) {
        this.container = d3.select(`#${containerId}`);
        this.svg = this.container.select('#visualizationSvg');
        
        // 创建工具提示
        this.tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);
        
        // 获取容器尺寸
        this.updateDimensions();
        
        // 创建主要的SVG组
        this.mainGroup = this.svg.append('g').attr('class', 'main-group');
        
        // 设置缩放行为
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 3])
            .on('zoom', (event) => {
                this.mainGroup.attr('transform', event.transform);
            });
        
        this.svg.call(this.zoom);
        
        // 当前数据和样式
        this.currentData = null;
        this.currentStyle = 'tree';
        
        // 绑定窗口大小变化事件
        window.addEventListener('resize', () => {
            this.updateDimensions();
            if (this.currentData) {
                this.render(this.currentData, this.currentStyle);
            }
        });
    }
    
    updateDimensions() {
        const containerRect = this.container.node().getBoundingClientRect();
        this.width = containerRect.width;
        this.height = containerRect.height;
        
        this.svg
            .attr('width', this.width)
            .attr('height', this.height);
    }
    
    // 渲染可视化
    render(data, style = 'tree') {
        this.currentData = data;
        this.currentStyle = style;
        
        // 清除现有内容
        this.mainGroup.selectAll('*').remove();
        
        switch (style) {
            case 'tree':
                this.renderTree(data);
                break;
            case 'network':
                this.renderNetwork(data);
                break;
            case 'radial':
                this.renderRadial(data);
                break;
            default:
                console.error('Unknown visualization style:', style);
        }
    }
    
    // 渲染树状图
    renderTree(data) {
        const treeLayout = d3.tree()
            .size([this.width - 100, this.height - 100]);
        
        // 构建层次结构
        const root = this.buildHierarchy(data);
        const treeData = treeLayout(root);
        
        // 渲染连线
        this.mainGroup.selectAll('.link')
            .data(treeData.links())
            .enter()
            .append('path')
            .attr('class', 'link')
            .attr('d', d3.linkHorizontal()
                .x(d => d.y + 50)
                .y(d => d.x + 50)
            );
        
        // 渲染节点
        const nodes = this.mainGroup.selectAll('.node')
            .data(treeData.descendants())
            .enter()
            .append('g')
            .attr('class', 'node-group')
            .attr('transform', d => `translate(${d.y + 50}, ${d.x + 50})`);
        
        // 添加节点圆圈
        nodes.append('circle')
            .attr('class', d => `node ${d.data.claim_type}`)
            .attr('r', d => d.data.claim_type === 'independent' ? 20 : 15)
            .on('mouseover', (event, d) => this.showTooltip(event, d.data))
            .on('mouseout', () => this.hideTooltip())
            .on('click', (event, d) => this.onNodeClick(d.data));
        
        // 添加节点标签
        nodes.append('text')
            .attr('class', 'node-label')
            .attr('dy', '0.35em')
            .text(d => d.data.claim_number);
    }
    
    // 渲染网络图
    renderNetwork(data) {
        const simulation = d3.forceSimulation(data.nodes)
            .force('link', d3.forceLink(data.links).id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2));
        
        // 渲染连线
        const links = this.mainGroup.selectAll('.link')
            .data(data.links)
            .enter()
            .append('line')
            .attr('class', 'link');
        
        // 渲染节点
        const nodes = this.mainGroup.selectAll('.node-group')
            .data(data.nodes)
            .enter()
            .append('g')
            .attr('class', 'node-group')
            .call(d3.drag()
                .on('start', (event, d) => {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                })
                .on('drag', (event, d) => {
                    d.fx = event.x;
                    d.fy = event.y;
                })
                .on('end', (event, d) => {
                    if (!event.active) simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                })
            );
        
        // 添加节点圆圈
        nodes.append('circle')
            .attr('class', d => `node ${d.claim_type}`)
            .attr('r', d => d.claim_type === 'independent' ? 20 : 15)
            .on('mouseover', (event, d) => this.showTooltip(event, d))
            .on('mouseout', () => this.hideTooltip())
            .on('click', (event, d) => this.onNodeClick(d));
        
        // 添加节点标签
        nodes.append('text')
            .attr('class', 'node-label')
            .attr('dy', '0.35em')
            .text(d => d.claim_number);
        
        // 更新位置
        simulation.on('tick', () => {
            links
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            
            nodes.attr('transform', d => `translate(${d.x}, ${d.y})`);
        });
    }
    
    // 渲染径向图
    renderRadial(data) {
        const radius = Math.min(this.width, this.height) / 2 - 50;
        const tree = d3.cluster().size([2 * Math.PI, radius]);
        
        // 构建层次结构
        const root = this.buildHierarchy(data);
        const treeData = tree(root);
        
        // 移动到中心
        this.mainGroup.attr('transform', `translate(${this.width / 2}, ${this.height / 2})`);
        
        // 渲染连线
        this.mainGroup.selectAll('.link')
            .data(treeData.links())
            .enter()
            .append('path')
            .attr('class', 'link')
            .attr('d', d3.linkRadial()
                .angle(d => d.x)
                .radius(d => d.y)
            );
        
        // 渲染节点
        const nodes = this.mainGroup.selectAll('.node-group')
            .data(treeData.descendants())
            .enter()
            .append('g')
            .attr('class', 'node-group')
            .attr('transform', d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y}, 0)`);
        
        // 添加节点圆圈
        nodes.append('circle')
            .attr('class', d => `node ${d.data.claim_type}`)
            .attr('r', d => d.data.claim_type === 'independent' ? 20 : 15)
            .on('mouseover', (event, d) => this.showTooltip(event, d.data))
            .on('mouseout', () => this.hideTooltip())
            .on('click', (event, d) => this.onNodeClick(d.data));
        
        // 添加节点标签
        nodes.append('text')
            .attr('class', 'node-label')
            .attr('dy', '0.35em')
            .attr('x', d => d.x < Math.PI === !d.children ? 6 : -6)
            .attr('text-anchor', d => d.x < Math.PI === !d.children ? 'start' : 'end')
            .attr('transform', d => d.x >= Math.PI ? 'rotate(180)' : null)
            .text(d => d.data.claim_number);
    }
    
    // 构建D3层次结构
    buildHierarchy(data) {
        // 找到根节点
        const rootNodes = data.nodes.filter(node => 
            !data.links.some(link => link.target === node.id)
        );
        
        if (rootNodes.length === 0) {
            // 如果没有明确的根节点，使用第一个独立权利要求
            const independentClaim = data.nodes.find(node => node.claim_type === 'independent');
            if (independentClaim) {
                rootNodes.push(independentClaim);
            } else {
                rootNodes.push(data.nodes[0]);
            }
        }
        
        // 构建层次结构
        const buildChildren = (nodeId) => {
            const children = data.links
                .filter(link => link.source === nodeId)
                .map(link => {
                    const childNode = data.nodes.find(node => node.id === link.target);
                    return {
                        ...childNode,
                        children: buildChildren(childNode.id)
                    };
                });
            
            return children.length > 0 ? children : null;
        };
        
        // 如果有多个根节点，创建虚拟根节点
        if (rootNodes.length > 1) {
            return d3.hierarchy({
                id: 'virtual_root',
                claim_number: 'Root',
                claim_type: 'independent',
                children: rootNodes.map(root => ({
                    ...root,
                    children: buildChildren(root.id)
                }))
            });
        } else {
            return d3.hierarchy({
                ...rootNodes[0],
                children: buildChildren(rootNodes[0].id)
            });
        }
    }
    
    // 显示工具提示
    showTooltip(event, data) {
        this.tooltip.html(`
            <strong>权利要求 ${data.claim_number}</strong><br>
            类型: ${data.claim_type === 'independent' ? '独立权利要求' : '从属权利要求'}<br>
            ${data.dependencies && data.dependencies.length > 0 ? 
                `依赖: ${data.dependencies.join(', ')}<br>` : ''}
            层级: ${data.level || 0}<br>
            <em>点击查看详细内容</em>
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .style('opacity', 1);
    }
    
    // 隐藏工具提示
    hideTooltip() {
        this.tooltip.style('opacity', 0);
    }
    
    // 节点点击事件
    onNodeClick(data) {
        showClaimModal(data);
    }
    
    // 缩放控制
    zoomIn() {
        this.svg.transition().call(
            this.zoom.scaleBy, 1.5
        );
    }
    
    zoomOut() {
        this.svg.transition().call(
            this.zoom.scaleBy, 1 / 1.5
        );
    }
    
    zoomReset() {
        this.svg.transition().call(
            this.zoom.transform,
            d3.zoomIdentity
        );
    }
    
    centerView() {
        const bounds = this.mainGroup.node().getBBox();
        const fullWidth = this.width;
        const fullHeight = this.height;
        const width = bounds.width;
        const height = bounds.height;
        const midX = bounds.x + width / 2;
        const midY = bounds.y + height / 2;
        
        const scale = 0.8 / Math.max(width / fullWidth, height / fullHeight);
        const translate = [fullWidth / 2 - scale * midX, fullHeight / 2 - scale * midY];
        
        this.svg.transition().call(
            this.zoom.transform,
            d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
        );
    }
}

// ==================== 模态框功能 ====================

// 显示权利要求详情模态框
function showClaimModal(claimData) {
    // 设置模态框内容
    document.getElementById('claimModalTitle').textContent = `权利要求 ${claimData.claim_number} 详情`;
    document.getElementById('claimNumberBadge').textContent = `权利要求 ${claimData.claim_number}`;
    
    const typeBadge = document.getElementById('claimTypeBadge');
    typeBadge.textContent = claimData.claim_type === 'independent' ? '独立权利要求' : '从属权利要求';
    typeBadge.className = `claim-type-badge ${claimData.claim_type}`;
    
    document.getElementById('claimLevelBadge').textContent = `层级 ${claimData.level || 0}`;
    
    // 显示依赖关系
    const dependenciesDiv = document.getElementById('claimDependencies');
    if (claimData.dependencies && claimData.dependencies.length > 0) {
        document.getElementById('claimDependenciesList').textContent = claimData.dependencies.join(', ');
        dependenciesDiv.style.display = 'block';
    } else {
        dependenciesDiv.style.display = 'none';
    }
    
    // 显示权利要求文本
    document.getElementById('claimText').textContent = claimData.claim_text || '暂无详细内容';
    
    // 显示模态框
    document.getElementById('claimModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// 关闭权利要求详情模态框
function closeClaimModal() {
    document.getElementById('claimModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// ESC键关闭模态框
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeClaimModal();
    }
});

// ==================== 消息显示函数 ====================

function showSuccess(message) {
    console.log('Success:', message);
    // 可以在这里添加成功消息的UI显示
}

function showError(message) {
    console.error('Error:', message);
    // 可以在这里添加错误消息的UI显示
}

function showInfo(message) {
    console.log('Info:', message);
    // 可以在这里添加信息消息的UI显示
}