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

// 新增：专利查询和可视化相关状态
let claimsCurrentPatentColumn = null;
let claimsSelectedPatentNumber = null;
let claimsSelectedPatentRow = null;
let claimsVisualizationRenderer = null;

// 初始化函数
function initClaimsProcessor() {
    const fileInput = document.getElementById('claims_excel_file');
    const processBtn = document.getElementById('claims_process_btn');
    const exportExcelBtn = document.getElementById('claims_export_excel_btn');
    const exportJsonBtn = document.getElementById('claims_export_json_btn');
    
    // 新增：专利查询和可视化相关元素
    const patentSearchInput = document.getElementById('claims_patent_search_input');
    const searchPatentBtn = document.getElementById('claims_search_patent_btn');
    const visualizePatentBtn = document.getElementById('claims_visualize_patent_btn');
    const styleSelector = document.getElementById('claims_style_selector');
    const zoomIn = document.getElementById('claims_zoom_in');
    const zoomOut = document.getElementById('claims_zoom_out');
    const zoomReset = document.getElementById('claims_zoom_reset');
    const centerView = document.getElementById('claims_center_view');
    
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
    
    // 新增：专利查询相关事件监听器
    if (searchPatentBtn) {
        searchPatentBtn.addEventListener('click', claimsSearchPatentNumbers);
    }
    
    if (patentSearchInput) {
        patentSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                claimsSearchPatentNumbers();
            }
        });
    }
    
    if (visualizePatentBtn) {
        visualizePatentBtn.addEventListener('click', claimsGenerateVisualization);
    }
    
    // 可视化控制事件
    if (styleSelector) {
        styleSelector.addEventListener('change', () => {
            if (claimsVisualizationRenderer && claimsVisualizationRenderer.currentData) {
                claimsVisualizationRenderer.render(claimsVisualizationRenderer.currentData, styleSelector.value);
            }
        });
    }
    
    if (zoomIn) {
        zoomIn.addEventListener('click', () => {
            if (claimsVisualizationRenderer) claimsVisualizationRenderer.zoomIn();
        });
    }
    
    if (zoomOut) {
        zoomOut.addEventListener('click', () => {
            if (claimsVisualizationRenderer) claimsVisualizationRenderer.zoomOut();
        });
    }
    
    if (zoomReset) {
        zoomReset.addEventListener('click', () => {
            if (claimsVisualizationRenderer) claimsVisualizationRenderer.zoomReset();
        });
    }
    
    if (centerView) {
        centerView.addEventListener('click', () => {
            if (claimsVisualizationRenderer) claimsVisualizationRenderer.centerView();
        });
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
    
    // 新增：显示专利查询区域
    showClaimsPatentQuerySection();
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

// ==================== 专利号查询和可视化功能 ====================

// 显示专利查询区域
function showClaimsPatentQuerySection() {
    console.log('showClaimsPatentQuerySection called');
    console.log('claimsCurrentFileId:', claimsCurrentFileId);
    console.log('claimsCurrentPatentColumn:', claimsCurrentPatentColumn);
    
    const patentQuerySection = document.getElementById('claims_patent_query_section');
    
    if (claimsCurrentFileId && patentQuerySection) {
        console.log('Showing claims patent query section');
        patentQuerySection.style.display = 'block';
        
        // 滚动到专利查询区域
        patentQuerySection.scrollIntoView({ behavior: 'smooth' });
        
        // 如果没有选择专利号列，显示提示
        if (!claimsCurrentPatentColumn) {
            showClaimsMessage('提示：如果需要使用专利号搜索功能，请先确保Excel中有专利号列', 'info');
        }
    } else {
        console.log('No file uploaded yet or patent query section not found');
    }
}

// 搜索专利号
async function claimsSearchPatentNumbers() {
    const patentSearchInput = document.getElementById('claims_patent_search_input');
    const query = patentSearchInput ? patentSearchInput.value.trim() : '';
    
    if (!query) {
        showClaimsMessage('请输入专利号片段', 'error');
        return;
    }
    
    if (!claimsCurrentFileId) {
        showClaimsMessage('请先上传文件并完成权利要求处理', 'error');
        return;
    }
    
    try {
        showClaimsMessage('正在搜索专利号...', 'info');
        
        // 尝试从处理结果中搜索
        if (claimsProcessedData && claimsProcessedData.claims) {
            const results = claimsProcessedData.claims.filter(claim => 
                claim.patent_number && claim.patent_number.includes(query)
            );
            
            if (results.length > 0) {
                displayClaimsSearchResults(results, query);
                return;
            }
        }
        
        // 如果没有找到，尝试API搜索（需要专利号列）
        if (claimsCurrentPatentColumn) {
            const response = await fetch(`/api/excel/${claimsCurrentFileId}/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    column_name: claimsCurrentPatentColumn,
                    query: query,
                    limit: 20
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                displayClaimsSearchResults(result.data.results, query);
            } else {
                showClaimsMessage(result.error || '搜索失败', 'error');
            }
        } else {
            showClaimsMessage('未找到包含 "' + query + '" 的专利号', 'error');
        }
    } catch (error) {
        console.error('Search error:', error);
        showClaimsMessage('搜索失败: ' + error.message, 'error');
    }
}

// 显示搜索结果
function displayClaimsSearchResults(results, query) {
    const searchResults = document.getElementById('claims_search_results');
    const searchResultsContainer = document.getElementById('claims_search_results_container');
    const selectedPatentInfo = document.getElementById('claims_selected_patent_info');
    const visualizationSection = document.getElementById('claims_visualization_section');
    
    if (!searchResults) return;
    
    if (results.length === 0) {
        searchResults.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #666;">
                未找到包含 "${query}" 的专利号
            </div>
        `;
    } else {
        let html = '';
        results.forEach((result, index) => {
            const patentNumber = result.patent_number || result.claim_number || 'Unknown';
            const rowIndex = result.row_index || index + 1;
            
            html += `
                <div class="search-result-item" onclick="claimsSelectPatent('${patentNumber}', ${rowIndex})">
                    <div class="search-result-patent">${patentNumber}</div>
                    <div class="search-result-row">行号: ${rowIndex}</div>
                </div>
            `;
        });
        searchResults.innerHTML = html;
        
        showClaimsMessage(`找到 ${results.length} 个匹配的专利号`, 'success');
    }
    
    if (searchResultsContainer) {
        searchResultsContainer.style.display = 'block';
    }
    
    if (selectedPatentInfo) {
        selectedPatentInfo.style.display = 'none';
    }
    
    if (visualizationSection) {
        visualizationSection.style.display = 'none';
    }
}

// 选择专利
function claimsSelectPatent(patentNumber, rowIndex) {
    claimsSelectedPatentNumber = patentNumber;
    claimsSelectedPatentRow = rowIndex;
    
    // 更新选中状态
    document.querySelectorAll('.search-result-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // 找到当前点击的元素并添加选中状态
    const clickedElement = event.currentTarget;
    if (clickedElement) {
        clickedElement.classList.add('selected');
    }
    
    // 显示选中的专利信息
    const selectedPatentNumber = document.getElementById('claims_selected_patent_number');
    const selectedPatentRow = document.getElementById('claims_selected_patent_row');
    const selectedPatentInfo = document.getElementById('claims_selected_patent_info');
    const visualizationSection = document.getElementById('claims_visualization_section');
    
    if (selectedPatentNumber) {
        selectedPatentNumber.textContent = patentNumber;
    }
    
    if (selectedPatentRow) {
        selectedPatentRow.textContent = rowIndex;
    }
    
    if (selectedPatentInfo) {
        selectedPatentInfo.style.display = 'block';
    }
    
    // 隐藏之前的可视化
    if (visualizationSection) {
        visualizationSection.style.display = 'none';
    }
}

// 生成可视化
async function claimsGenerateVisualization() {
    if (!claimsSelectedPatentNumber) {
        showClaimsMessage('请先选择一个专利号', 'error');
        return;
    }
    
    if (!claimsCurrentTaskId) {
        showClaimsMessage('请先完成权利要求处理', 'error');
        return;
    }
    
    try {
        // 显示可视化区域和加载状态
        const visualizationSection = document.getElementById('claims_visualization_section');
        const vizLoadingIndicator = document.getElementById('claims_viz_loading_indicator');
        const vizErrorMessage = document.getElementById('claims_viz_error_message');
        
        if (visualizationSection) {
            visualizationSection.style.display = 'block';
        }
        
        if (vizLoadingIndicator) {
            vizLoadingIndicator.style.display = 'block';
        }
        
        if (vizErrorMessage) {
            vizErrorMessage.style.display = 'none';
        }
        
        // 滚动到可视化区域
        if (visualizationSection) {
            visualizationSection.scrollIntoView({ behavior: 'smooth' });
        }
        
        showClaimsMessage('正在分析权利要求关系...', 'info');
        
        // 获取权利要求处理结果
        const response = await fetch(`/api/claims/result/${claimsCurrentTaskId}`);
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || '获取权利要求数据失败');
        }
        
        // 从处理结果中找到对应专利的权利要求
        const patentClaims = claimsFindPatentClaims(result.data, claimsSelectedPatentNumber, claimsSelectedPatentRow);
        
        if (!patentClaims || patentClaims.length === 0) {
            throw new Error('未找到该专利的权利要求数据');
        }
        
        // 构建可视化数据
        const visualizationData = claimsBuildVisualizationData(patentClaims, claimsSelectedPatentNumber);
        
        // 初始化可视化渲染器
        if (!claimsVisualizationRenderer) {
            claimsVisualizationRenderer = new ClaimsD3TreeRenderer('claims_visualization_container');
        }
        
        // 渲染可视化
        if (vizLoadingIndicator) {
            vizLoadingIndicator.style.display = 'none';
        }
        
        const styleSelector = document.getElementById('claims_style_selector');
        const style = styleSelector ? styleSelector.value : 'tree';
        
        claimsVisualizationRenderer.render(visualizationData, style);
        
        showClaimsMessage('权利要求关系图生成完成！', 'success');
        
    } catch (error) {
        console.error('Visualization error:', error);
        
        const vizLoadingIndicator = document.getElementById('claims_viz_loading_indicator');
        const vizErrorMessage = document.getElementById('claims_viz_error_message');
        const vizErrorText = document.getElementById('claims_viz_error_text');
        
        if (vizLoadingIndicator) {
            vizLoadingIndicator.style.display = 'none';
        }
        
        if (vizErrorMessage) {
            vizErrorMessage.style.display = 'block';
        }
        
        if (vizErrorText) {
            vizErrorText.textContent = error.message;
        }
        
        showClaimsMessage('生成可视化失败: ' + error.message, 'error');
    }
}

// 从权利要求处理结果中找到特定专利的权利要求
function claimsFindPatentClaims(processedData, patentNumber, rowIndex) {
    // 处理结果通常按行组织，找到对应行的权利要求
    if (processedData.claims_by_row && processedData.claims_by_row[rowIndex]) {
        return processedData.claims_by_row[rowIndex];
    }
    
    // 如果没有按行组织，尝试在所有权利要求中查找
    if (processedData.claims) {
        return processedData.claims.filter(claim => 
            claim.patent_number === patentNumber || 
            claim.row_index === rowIndex
        );
    }
    
    return processedData.claims || [];
}

// 构建可视化数据
function claimsBuildVisualizationData(claims, patentNumber) {
    const nodes = [];
    const links = [];
    
    // 创建节点
    claims.forEach(claim => {
        nodes.push({
            id: `claim_${claim.claim_number}`,
            claim_number: claim.claim_number,
            claim_text: claim.claim_text,
            claim_type: claim.claim_type,
            level: claim.level || 0,
            dependencies: claim.dependencies || claim.referenced_claims || [],
            x: 0,
            y: 0
        });
    });
    
    // 创建连接
    claims.forEach(claim => {
        const dependencies = claim.dependencies || claim.referenced_claims || [];
        if (dependencies && dependencies.length > 0) {
            dependencies.forEach(dep => {
                links.push({
                    source: `claim_${dep}`,
                    target: `claim_${claim.claim_number}`,
                    type: 'dependency'
                });
            });
        }
    });
    
    return {
        patent_number: patentNumber,
        nodes: nodes,
        links: links,
        metadata: {
            total_claims: claims.length,
            independent_claims: claims.filter(c => c.claim_type === 'independent').length,
            dependent_claims: claims.filter(c => c.claim_type === 'dependent').length
        }
    };
}

// ==================== D3.js可视化渲染器 ====================

// ClaimsD3TreeRenderer类 - 专门为权利要求可视化设计的D3.js渲染器
class ClaimsD3TreeRenderer {
    constructor(containerId) {
        this.container = d3.select(`#${containerId}`);
        this.svg = this.container.select('svg');
        
        // 如果没有SVG，创建一个
        if (this.svg.empty()) {
            this.svg = this.container.append('svg')
                .attr('id', 'claims_visualization_svg')
                .style('width', '100%')
                .style('height', '600px');
        }
        
        // 创建工具提示
        this.tooltip = d3.select('body').append('div')
            .attr('class', 'claims-tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(0, 0, 0, 0.8)')
            .style('color', 'white')
            .style('padding', '10px')
            .style('border-radius', '5px')
            .style('pointer-events', 'none')
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
        this.width = containerRect.width || 800;
        this.height = 600;
        
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
            .attr('stroke', '#999')
            .attr('stroke-width', 2)
            .attr('fill', 'none')
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
            .attr('fill', d => d.data.claim_type === 'independent' ? '#4CAF50' : '#2196F3')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .style('cursor', 'pointer')
            .on('mouseover', (event, d) => this.showTooltip(event, d.data))
            .on('mouseout', () => this.hideTooltip())
            .on('click', (event, d) => this.onNodeClick(d.data));
        
        // 添加节点标签
        nodes.append('text')
            .attr('class', 'node-label')
            .attr('dy', '0.35em')
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
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
            .attr('class', 'link')
            .attr('stroke', '#999')
            .attr('stroke-width', 2);
        
        // 渲染节点
        const nodes = this.mainGroup.selectAll('.node-group')
            .data(data.nodes)
            .enter()
            .append('g')
            .attr('class', 'node-group')
            .style('cursor', 'pointer')
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
            .attr('fill', d => d.claim_type === 'independent' ? '#4CAF50' : '#2196F3')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .on('mouseover', (event, d) => this.showTooltip(event, d))
            .on('mouseout', () => this.hideTooltip())
            .on('click', (event, d) => this.onNodeClick(d));
        
        // 添加节点标签
        nodes.append('text')
            .attr('class', 'node-label')
            .attr('dy', '0.35em')
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
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
            .attr('stroke', '#999')
            .attr('stroke-width', 2)
            .attr('fill', 'none')
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
            .attr('fill', d => d.data.claim_type === 'independent' ? '#4CAF50' : '#2196F3')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .style('cursor', 'pointer')
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
            .attr('fill', 'black')
            .attr('font-size', '12px')
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
        showClaimsClaimModal(data);
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
function showClaimsClaimModal(claimData) {
    // 创建模态框HTML（如果不存在）
    let modal = document.getElementById('claims_claim_modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'claims_claim_modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="closeClaimsClaimModal()">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3 id="claims_claim_modal_title">权利要求详情</h3>
                        <button class="close-btn" onclick="closeClaimsClaimModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="claim-info">
                            <span id="claims_claim_number_badge" class="badge">权利要求 1</span>
                            <span id="claims_claim_type_badge" class="badge">独立权利要求</span>
                            <span id="claims_claim_level_badge" class="badge">层级 0</span>
                        </div>
                        <div id="claims_claim_dependencies" class="claim-dependencies">
                            <strong>依赖关系：</strong>
                            <span id="claims_claim_dependencies_list"></span>
                        </div>
                        <div class="claim-text">
                            <strong>权利要求内容：</strong>
                            <p id="claims_claim_text"></p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: none;
            z-index: 1000;
        `;
        document.body.appendChild(modal);
    }
    
    // 设置模态框内容
    document.getElementById('claims_claim_modal_title').textContent = `权利要求 ${claimData.claim_number} 详情`;
    document.getElementById('claims_claim_number_badge').textContent = `权利要求 ${claimData.claim_number}`;
    
    const typeBadge = document.getElementById('claims_claim_type_badge');
    typeBadge.textContent = claimData.claim_type === 'independent' ? '独立权利要求' : '从属权利要求';
    typeBadge.className = `badge ${claimData.claim_type}`;
    
    document.getElementById('claims_claim_level_badge').textContent = `层级 ${claimData.level || 0}`;
    
    // 显示依赖关系
    const dependenciesDiv = document.getElementById('claims_claim_dependencies');
    if (claimData.dependencies && claimData.dependencies.length > 0) {
        document.getElementById('claims_claim_dependencies_list').textContent = claimData.dependencies.join(', ');
        dependenciesDiv.style.display = 'block';
    } else {
        dependenciesDiv.style.display = 'none';
    }
    
    // 显示权利要求文本
    document.getElementById('claims_claim_text').textContent = claimData.claim_text || '暂无详细内容';
    
    // 显示模态框
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// 关闭权利要求详情模态框
function closeClaimsClaimModal() {
    const modal = document.getElementById('claims_claim_modal');
    if (modal) {
        modal.style.display = 'none';
    }
    document.body.style.overflow = 'auto';
}

// ESC键关闭模态框
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeClaimsClaimModal();
    }
});