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
            const columnAnalysis = responseData.column_analysis || {};
            
            // 存储文件信息供后续使用
            claimsCurrentFilePath = filePath;
            claimsCurrentFileId = fileId;
            
            // 新增：处理专利号列识别结果
            if (columnAnalysis.patent_number_column) {
                claimsCurrentPatentColumn = columnAnalysis.patent_number_column.column_name;
                console.log('自动识别到专利号列:', claimsCurrentPatentColumn);
                console.log('识别置信度:', columnAnalysis.patent_number_column.confidence);
                
                // 显示识别结果
                showPatentColumnDetectionResult(columnAnalysis.patent_number_column);
            } else {
                console.log('未自动识别到专利号列，将提供手动选择');
                claimsCurrentPatentColumn = null;
            }
            
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
            
            // 新增：尝试自动识别专利号列
            claimsAutoDetectPatentColumn(columns, responseData);
        } else {
            showClaimsMessage('加载列信息失败：' + (data.error || '未知错误'), 'error');
        }
    } catch (error) {
        console.error('Load columns error:', error);
        showClaimsMessage('加载列信息失败：' + error.message, 'error');
    }
}

// 新增：自动检测专利号列
async function claimsAutoDetectPatentColumn(columns, responseData) {
    try {
        // 使用后端返回的列分析结果
        const columnAnalysis = responseData.column_analysis;
        
        if (columnAnalysis && columnAnalysis.patent_number_column) {
            const patentCol = columnAnalysis.patent_number_column;
            claimsCurrentPatentColumn = patentCol.column_name;
            console.log('自动检测到专利号列:', patentCol.column_name, '置信度:', patentCol.confidence);
            showClaimsMessage(`✨ 自动检测到专利号列: ${patentCol.column_name} (置信度: ${(patentCol.confidence * 100).toFixed(0)}%)`, 'success');
        } else {
            console.log('未能自动检测到专利号列，显示手动选择器');
            showClaimsMessage('⚠️ 未能自动识别专利号列，请手动选择', 'info');
        }
        
        // 无论是否自动检测成功，都显示专利号列选择器供用户确认或手动选择
        claimsShowPatentColumnSelector(columns, claimsCurrentPatentColumn);
        
    } catch (error) {
        console.error('Auto detect patent column error:', error);
        // 如果自动检测失败，显示手动选择器
        claimsShowPatentColumnSelector(columns);
    }
}

// 新增：显示专利号列选择器
function claimsShowPatentColumnSelector(columns, selectedColumn = null) {
    // 创建专利号列选择器（如果不存在）
    let patentColumnContainer = document.getElementById('claims_patent_column_selector_container');
    
    if (!patentColumnContainer) {
        patentColumnContainer = document.createElement('div');
        patentColumnContainer.id = 'claims_patent_column_selector_container';
        patentColumnContainer.className = 'form-group';
        patentColumnContainer.innerHTML = `
            <label for="claims_patent_column_selector">专利号列（用于专利搜索功能）:</label>
            <select id="claims_patent_column_selector" class="form-control">
                <option value="">请选择专利号列...</option>
            </select>
            <small class="form-text text-muted">选择包含专利号的列，如：公开号、专利号、申请号等。格式如：US202402107869A1</small>
        `;
        
        // 插入到列选择器后面
        const columnContainer = document.getElementById('claims_column_selector_container');
        if (columnContainer && columnContainer.parentNode) {
            columnContainer.parentNode.insertBefore(patentColumnContainer, columnContainer.nextSibling);
        }
    }
    
    const patentColumnSelect = document.getElementById('claims_patent_column_selector');
    if (patentColumnSelect) {
        // 清空并填充选项
        patentColumnSelect.innerHTML = '<option value="">请选择专利号列...</option>';
        columns.forEach(column => {
            const option = document.createElement('option');
            option.value = column;
            option.textContent = column;
            if (column === selectedColumn) {
                option.selected = true;
            }
            patentColumnSelect.appendChild(option);
        });
        
        // 添加事件监听器
        patentColumnSelect.addEventListener('change', (e) => {
            claimsCurrentPatentColumn = e.target.value;
            console.log('选择专利号列:', claimsCurrentPatentColumn);
            if (claimsCurrentPatentColumn) {
                showClaimsMessage(`✓ 已选择专利号列: ${claimsCurrentPatentColumn}`, 'success');
            }
        });
        
        patentColumnContainer.style.display = 'block';
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

// 显示专利号列识别结果
function showPatentColumnDetectionResult(detectionResult) {
    console.log('显示专利号列识别结果:', detectionResult);
    
    // 创建或更新专利号列配置区域
    let configSection = document.getElementById('claims_patent_column_config');
    if (!configSection) {
        // 在文件上传区域后添加配置区域
        const uploadContainer = document.getElementById('claims_sheet_selector_container');
        if (uploadContainer && uploadContainer.parentNode) {
            configSection = document.createElement('div');
            configSection.id = 'claims_patent_column_config';
            configSection.className = 'config-section';
            configSection.innerHTML = `
                <h4>专利号列配置</h4>
                <div id="auto_detection_result" class="detection-result">
                    <div class="result-header">
                        <span class="icon success">✓</span>
                        <span>自动识别到专利号列</span>
                    </div>
                    <div class="result-content">
                        <strong id="detected_column_name"></strong>
                        <span class="confidence">置信度: <span id="confidence_score"></span></span>
                        <button class="btn-small" onclick="confirmPatentColumn()">确认使用</button>
                        <button class="btn-small secondary" onclick="showManualPatentColumnSelection()">手动选择</button>
                    </div>
                </div>
                <div id="manual_patent_selection" class="manual-selection" style="display: none;">
                    <label for="patent_column_selector">请选择专利号列：</label>
                    <select id="patent_column_selector" class="form-control">
                        <option value="">-- 请选择 --</option>
                    </select>
                    <button class="btn-primary" onclick="setManualPatentColumn()">确认选择</button>
                </div>
                <div id="no_patent_column" class="warning-message" style="display: none;">
                    <span class="icon warning">⚠</span>
                    <span>未检测到专利号列，专利搜索功能将不可用</span>
                </div>
            `;
            
            // 插入到上传容器后面
            uploadContainer.parentNode.insertBefore(configSection, uploadContainer.nextSibling);
        }
    }
    
    // 更新识别结果显示
    const detectedColumnName = document.getElementById('detected_column_name');
    const confidenceScore = document.getElementById('confidence_score');
    const autoDetectionResult = document.getElementById('auto_detection_result');
    
    if (detectedColumnName) {
        detectedColumnName.textContent = detectionResult.column_name;
    }
    if (confidenceScore) {
        confidenceScore.textContent = Math.round(detectionResult.confidence * 100) + '%';
    }
    if (autoDetectionResult) {
        autoDetectionResult.style.display = 'block';
    }
    
    // 隐藏其他区域
    const manualSelection = document.getElementById('manual_patent_selection');
    const noPatentColumn = document.getElementById('no_patent_column');
    if (manualSelection) manualSelection.style.display = 'none';
    if (noPatentColumn) noPatentColumn.style.display = 'none';
}

// 确认使用自动识别的专利号列
function confirmPatentColumn() {
    console.log('用户确认使用专利号列:', claimsCurrentPatentColumn);
    showClaimsMessage('已确认专利号列: ' + claimsCurrentPatentColumn, 'success');
    
    // 隐藏配置区域
    const configSection = document.getElementById('claims_patent_column_config');
    if (configSection) {
        configSection.style.display = 'none';
    }
}

// 显示手动选择专利号列界面
function showManualPatentColumnSelection() {
    console.log('显示手动选择专利号列界面');
    
    const autoDetectionResult = document.getElementById('auto_detection_result');
    const manualSelection = document.getElementById('manual_patent_selection');
    const patentColumnSelector = document.getElementById('patent_column_selector');
    
    // 隐藏自动识别结果
    if (autoDetectionResult) {
        autoDetectionResult.style.display = 'none';
    }
    
    // 显示手动选择界面
    if (manualSelection) {
        manualSelection.style.display = 'block';
    }
    
    // 填充列选项
    if (patentColumnSelector) {
        const columnSelect = document.getElementById('claims_column_selector');
        if (columnSelect) {
            // 复制权利要求列选择器的选项
            patentColumnSelector.innerHTML = columnSelect.innerHTML;
        }
    }
}

// 设置手动选择的专利号列
function setManualPatentColumn() {
    const patentColumnSelector = document.getElementById('patent_column_selector');
    if (patentColumnSelector && patentColumnSelector.value) {
        claimsCurrentPatentColumn = patentColumnSelector.value;
        console.log('手动设置专利号列:', claimsCurrentPatentColumn);
        showClaimsMessage('已设置专利号列: ' + claimsCurrentPatentColumn, 'success');
        
        // 隐藏配置区域
        const configSection = document.getElementById('claims_patent_column_config');
        if (configSection) {
            configSection.style.display = 'none';
        }
    } else {
        showClaimsMessage('请选择一个专利号列', 'error');
    }
}

// 显示无专利号列提示
function showNoPatentColumnWarning() {
    console.log('显示无专利号列警告');
    
    let configSection = document.getElementById('claims_patent_column_config');
    if (!configSection) {
        // 创建配置区域（如果不存在）
        const uploadContainer = document.getElementById('claims_sheet_selector_container');
        if (uploadContainer && uploadContainer.parentNode) {
            configSection = document.createElement('div');
            configSection.id = 'claims_patent_column_config';
            configSection.className = 'config-section';
            configSection.innerHTML = `
                <div id="no_patent_column" class="warning-message">
                    <span class="icon warning">⚠</span>
                    <span>未检测到专利号列，专利搜索功能将不可用</span>
                    <button class="btn-small" onclick="showManualPatentColumnSelection()">手动选择</button>
                </div>
            `;
            uploadContainer.parentNode.insertBefore(configSection, uploadContainer.nextSibling);
        }
    }
    
    const noPatentColumn = document.getElementById('no_patent_column');
    if (noPatentColumn) {
        noPatentColumn.style.display = 'block';
    }
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

// 搜索专利号 - 增强版本
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
        
        let results = [];
        
        // 策略1: 从处理结果中搜索
        if (claimsProcessedData && claimsProcessedData.claims) {
            console.log('策略1: 从处理结果中搜索');
            // 按专利号分组，避免重复
            const patentMap = new Map();
            claimsProcessedData.claims.forEach(claim => {
                if (claim.patent_number && claim.patent_number.toLowerCase().includes(query.toLowerCase())) {
                    if (!patentMap.has(claim.patent_number)) {
                        patentMap.set(claim.patent_number, claim.row_index);
                    }
                }
            });
            
            // 转换为搜索结果格式
            results = Array.from(patentMap.entries()).map(([patent_number, row_index]) => ({
                patent_number,
                row_index
            }));
            
            if (results.length > 0) {
                console.log('在处理结果中找到', results.length, '个匹配的专利号');
                displayClaimsSearchResults(results, query);
                return;
            }
        }
        
        // 策略2: 从Excel原始数据搜索（如果有专利号列）
        if (claimsCurrentPatentColumn) {
            console.log('策略2: 从Excel数据搜索，专利号列:', claimsCurrentPatentColumn);
            try {
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
                
                if (result.success && result.data.results.length > 0) {
                    console.log('在Excel数据中找到', result.data.results.length, '个匹配项');
                    displayClaimsSearchResults(result.data.results, query);
                    return;
                }
            } catch (error) {
                console.error('Excel搜索失败:', error);
            }
        }
        
        // 策略3: 模糊搜索所有列
        console.log('策略3: 模糊搜索所有列');
        try {
            const response = await fetch(`/api/excel/${claimsCurrentFileId}/data?page=1&page_size=100`, {
                method: 'GET'
            });
            
            const result = await response.json();
            
            if (result.success) {
                const fuzzyResults = performFuzzySearch(result.data.data, query);
                if (fuzzyResults.length > 0) {
                    console.log('模糊搜索找到', fuzzyResults.length, '个匹配项');
                    displayClaimsSearchResults(fuzzyResults, query);
                    return;
                }
            }
        } catch (error) {
            console.error('模糊搜索失败:', error);
        }
        
        // 如果所有策略都没有找到结果
        showClaimsMessage('未找到包含 "' + query + '" 的专利号。建议：1) 检查输入是否正确 2) 尝试输入更少的字符 3) 确认Excel中包含专利号数据', 'error');
        displayClaimsSearchResults([], query);
        
    } catch (error) {
        console.error('Search error:', error);
        showClaimsMessage('搜索失败: ' + error.message, 'error');
    }
}

// 执行模糊搜索
function performFuzzySearch(data, query) {
    const results = [];
    const queryLower = query.toLowerCase();
    
    data.forEach((row, index) => {
        // 搜索所有列
        for (const [columnName, value] of Object.entries(row.data)) {
            if (value && typeof value === 'string') {
                const valueLower = value.toLowerCase();
                if (valueLower.includes(queryLower)) {
                    // 检查是否看起来像专利号
                    if (looksLikePatentNumber(value)) {
                        results.push({
                            patent_number: value,
                            row_index: row.row_index,
                            source_column: columnName,
                            match_type: 'fuzzy',
                            data: row.data
                        });
                        break; // 每行只添加一次
                    }
                }
            }
        }
    });
    
    return results.slice(0, 20); // 限制结果数量
}

// 检查字符串是否看起来像专利号
function looksLikePatentNumber(value) {
    if (!value || typeof value !== 'string') return false;
    
    const cleanValue = value.trim();
    
    // 基本长度检查
    if (cleanValue.length < 6 || cleanValue.length > 25) return false;
    
    // 检查是否包含数字
    if (!/\d/.test(cleanValue)) return false;
    
    // 检查常见专利号模式
    const patentPatterns = [
        /^[A-Z]{2,4}\d+[A-Z]?\d?$/i,  // 字母+数字+可选字母数字
        /^\d{6,20}$/,                  // 纯数字
        /^[A-Z]{2}\d{4}-?\d+[A-Z]?$/i, // 字母+年份-数字+字母
        /^ZL\d+\.?\d?$/i,              // ZL开头
    ];
    
    return patentPatterns.some(pattern => pattern.test(cleanValue));
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
    console.log('查找权利要求数据:', {
        patentNumber: patentNumber,
        rowIndex: rowIndex,
        hasClaimsByRow: !!processedData.claims_by_row,
        claimsByRowKeys: processedData.claims_by_row ? Object.keys(processedData.claims_by_row) : [],
        hasClaims: !!processedData.claims,
        claimsCount: processedData.claims ? processedData.claims.length : 0
    });
    
    // 优先按专利号查找 - 这是关键修复！
    // 当提供了专利号时，查找该专利的所有权利要求，忽略行号
    if (patentNumber && processedData.claims) {
        const patentClaims = processedData.claims.filter(claim => 
            claim.patent_number === patentNumber
        );
        if (patentClaims.length > 0) {
            console.log(`按专利号找到 ${patentClaims.length} 个权利要求`);
            return patentClaims;
        }
    }
    
    // 如果没有专利号或按专利号未找到，再按行号查找
    if (processedData.claims_by_row) {
        // 尝试数字键和字符串键
        const claims = processedData.claims_by_row[rowIndex] || processedData.claims_by_row[String(rowIndex)];
        if (claims && claims.length > 0) {
            console.log(`在claims_by_row中找到 ${claims.length} 个权利要求`);
            return claims;
        }
    }
    
    // 最后尝试在行索引中查找
    if (processedData.claims) {
        const filteredClaims = processedData.claims.filter(claim => 
            claim.row_index === rowIndex
        );
        console.log(`在claims数组中找到 ${filteredClaims.length} 个权利要求`);
        return filteredClaims;
    }
    
    console.log('未找到任何权利要求数据');
    return [];
}

// 构建可视化数据
function claimsBuildVisualizationData(claims, patentNumber) {
    console.log('构建可视化数据，专利号:', patentNumber);
    console.log('权利要求数据:', claims);
    
    const nodesMap = {};
    const links = [];
    
    // 创建节点，确保每个权利要求号只创建一个节点
    claims.forEach(claim => {
        const nodeId = `claim_${claim.claim_number}`;
        if (!nodesMap[nodeId]) {
            const node = {
                id: nodeId,
                claim_number: claim.claim_number,
                claim_text: claim.claim_text,
                claim_type: claim.claim_type,
                level: claim.level || 0,
                dependencies: claim.dependencies || claim.referenced_claims || [],
                x: 0,
                y: 0
            };
            nodesMap[nodeId] = node;
            console.log('创建节点:', node);
        } else {
            console.log('节点已存在，跳过创建:', nodeId);
        }
    });
    
    // 将节点对象转换为数组
    const nodes = Object.values(nodesMap);
    
    // 创建连接，避免重复连接
    const linksMap = new Map();
    claims.forEach(claim => {
        const dependencies = claim.dependencies || claim.referenced_claims || [];
        console.log('权利要求', claim.claim_number, '的依赖关系:', dependencies);
        
        if (dependencies && dependencies.length > 0) {
            dependencies.forEach(dep => {
                if (dep === 'all') {
                    // 如果是'all'，则连接到所有其他权利要求
                    claims.forEach(otherClaim => {
                        if (otherClaim.claim_number !== claim.claim_number) {
                            const linkKey = `claim_${otherClaim.claim_number}_to_claim_${claim.claim_number}`;
                            if (!linksMap.has(linkKey)) {
                                const link = {
                                    source: `claim_${otherClaim.claim_number}`,
                                    target: `claim_${claim.claim_number}`,
                                    type: 'dependency'
                                };
                                links.push(link);
                                linksMap.set(linkKey, true);
                                console.log('创建连接（全部引用）:', link);
                            }
                        }
                    });
                } else {
                    const linkKey = `claim_${dep}_to_claim_${claim.claim_number}`;
                    if (!linksMap.has(linkKey)) {
                        const link = {
                            source: `claim_${dep}`,
                            target: `claim_${claim.claim_number}`,
                            type: 'dependency'
                        };
                        links.push(link);
                        linksMap.set(linkKey, true);
                        console.log('创建连接:', link);
                    }
                }
            });
        }
    });
    
    console.log('最终节点:', nodes);
    console.log('最终连接:', links);
    
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
        // 找到所有独立权利要求作为根节点
        const independentClaims = data.nodes.filter(node => node.claim_type === 'independent');
        
        // 计算每个独立权利要求树的垂直空间
        const treesCount = Math.max(1, independentClaims.length);
        const treeHeight = (this.height - 100) / treesCount;
        
        // 为每个独立权利要求渲染单独的树
        independentClaims.forEach((rootClaim, treeIndex) => {
            // 构建当前独立权利要求的层次结构
            const buildSubTree = (nodeId) => {
                const node = data.nodes.find(n => n.id === nodeId);
                if (!node) return null;
                
                const children = data.links
                    .filter(link => {
                        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                        return sourceId === nodeId;
                    })
                    .map(link => {
                        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                        return buildSubTree(targetId);
                    })
                    .filter(child => child !== null);
                
                return {
                    ...node,
                    children: children.length > 0 ? children : null
                };
            };
            
            // 构建当前树的根节点
            const treeRoot = buildSubTree(rootClaim.id);
            if (!treeRoot) return;
            
            // 创建层次结构
            const root = d3.hierarchy(treeRoot);
            
            // 计算树布局
            const treeLayout = d3.tree()
                .size([treeHeight, (this.width - 200) / 2]);
            
            const treeData = treeLayout(root);
            
            // 计算垂直偏移
            const yOffset = 50 + treeIndex * treeHeight;
            
            // 渲染连线
            this.mainGroup.selectAll(`.link-tree-${treeIndex}`)
                .data(treeData.links())
                .enter()
                .append('path')
                .attr('class', `link link-tree-${treeIndex}`)
                .attr('stroke', '#999')
                .attr('stroke-width', 2)
                .attr('fill', 'none')
                .attr('d', d3.linkHorizontal()
                    .x(d => d.y + 100)
                    .y(d => d.x + yOffset)
                );
            
            // 渲染节点
            const nodes = this.mainGroup.selectAll(`.node-tree-${treeIndex}`)
                .data(treeData.descendants())
                .enter()
                .append('g')
                .attr('class', `node-group node-tree-${treeIndex}`)
                .attr('transform', d => `translate(${d.y + 100}, ${d.x + yOffset})`);
            
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
        });
        
        // 如果没有独立权利要求，渲染默认树
        if (independentClaims.length === 0 && data.nodes.length > 0) {
            const treeLayout = d3.tree()
                .size([this.height - 100, this.width - 200]);
            
            const root = d3.hierarchy({
                ...data.nodes[0],
                children: null
            });
            
            const treeData = treeLayout(root);
            
            // 渲染节点
            const nodes = this.mainGroup.selectAll('.node-default')
                .data(treeData.descendants())
                .enter()
                .append('g')
                .attr('class', 'node-group node-default')
                .attr('transform', d => `translate(${d.y + 100}, ${d.x + 50})`);
            
            // 添加节点圆圈
            nodes.append('circle')
                .attr('class', d => `node ${d.data.claim_type || 'independent'}`)
                .attr('r', 20)
                .attr('fill', '#4CAF50')
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
        
        // 更新位置
        simulation.on('tick', () => {
            links
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            
            nodes.attr('transform', d => `translate(${d.x}, ${d.y})`);
        });
        
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
        console.log('构建层次结构数据:', data);
        
        // 找到所有独立权利要求作为根节点
        const independentClaims = data.nodes.filter(node => node.claim_type === 'independent');
        console.log('独立权利要求:', independentClaims);
        
        // 如果没有独立权利要求，使用所有节点
        const rootNodes = independentClaims.length > 0 ? independentClaims : data.nodes;
        console.log('根节点:', rootNodes);
        
        // 构建子节点（从属权利要求）
        const buildChildren = (nodeId) => {
            const children = data.links
                .filter(link => {
                    // 处理source可能是字符串ID或对象引用的情况
                    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                    return sourceId === nodeId;
                })
                .map(link => {
                    // 处理target可能是字符串ID或对象引用的情况
                    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                    const childNode = data.nodes.find(node => node.id === targetId);
                    if (childNode) {
                        return {
                            ...childNode,
                            children: buildChildren(childNode.id)
                        };
                    }
                    return null;
                })
                .filter(child => child !== null);
            
            return children.length > 0 ? children : null;
        };
        
        // 为每个独立权利要求构建完整的层次结构
        const hierarchyNodes = rootNodes.map(root => ({
            ...root,
            children: buildChildren(root.id)
        }));
        
        console.log('层次结构节点:', hierarchyNodes);
        
        // 如果有多个根节点，创建虚拟根节点
        if (hierarchyNodes.length > 1) {
            return d3.hierarchy({
                id: 'virtual_root',
                claim_number: 'Root',
                claim_type: 'virtual',
                claim_text: '权利要求根节点',
                children: hierarchyNodes
            });
        } else if (hierarchyNodes.length === 1) {
            return d3.hierarchy(hierarchyNodes[0]);
        } else {
            // 如果没有根节点，创建一个默认的
            return d3.hierarchy({
                id: 'default_root',
                claim_number: '1',
                claim_type: 'independent',
                claim_text: '默认根节点',
                children: null
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
        console.log('节点点击事件数据:', data);
        // 使用新的模态框显示函数
        showSimpleClaimModal(data);
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
    console.log('显示权利要求详情:', claimData);
    
    // 创建模态框HTML（如果不存在）
    let modal = document.getElementById('claims_claim_modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'claims_claim_modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
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
        
        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            #claims_claim_modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: none;
                z-index: 1000;
                align-items: center;
                justify-content: center;
            }
            
            #claims_claim_modal .modal-overlay {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            
            #claims_claim_modal .modal-content {
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                max-width: 850px;
        width: 100%;
                max-height: 80vh;
                overflow-y: auto;
                position: relative;
            }
            
            #claims_claim_modal .modal-header {
                padding: 20px;
                border-bottom: 1px solid #eee;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: #f8f9fa;
                border-radius: 8px 8px 0 0;
            }
            
            #claims_claim_modal .modal-header h3 {
                margin: 0;
                color: #333;
                font-size: 18px;
            }
            
            #claims_claim_modal .close-btn {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #666;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background-color 0.2s;
            }
            
            #claims_claim_modal .close-btn:hover {
                background-color: #f0f0f0;
                color: #333;
            }
            
            #claims_claim_modal .modal-body {
                padding: 20px;
            }
            
            #claims_claim_modal .claim-info {
                margin-bottom: 15px;
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            
            #claims_claim_modal .badge {
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
                color: white;
            }
            
            #claims_claim_modal .badge.independent {
                background-color: #4CAF50;
            }
            
            #claims_claim_modal .badge.dependent {
                background-color: #2196F3;
            }
            
            #claims_claim_modal .badge:not(.independent):not(.dependent) {
                background-color: #666;
            }
            
            #claims_claim_modal .claim-dependencies {
                margin-bottom: 15px;
                padding: 10px;
                background-color: #f8f9fa;
                border-radius: 4px;
                border-left: 4px solid #2196F3;
            }
            
            #claims_claim_modal .claim-text {
                margin-bottom: 15px;
            }
            
            #claims_claim_modal .claim-text p {
                margin: 10px 0 0 0;
                line-height: 1.6;
                color: #333;
                background-color: #f8f9fa;
                padding: 15px;
                border-radius: 4px;
                border: 1px solid #e9ecef;
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(modal);
        
        // 点击遮罩层关闭模态框
        modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                closeClaimsClaimModal();
            }
        });
    }
    
    // 设置模态框内容
    const titleElement = document.getElementById('claims_claim_modal_title');
    const numberBadge = document.getElementById('claims_claim_number_badge');
    const typeBadge = document.getElementById('claims_claim_type_badge');
    const levelBadge = document.getElementById('claims_claim_level_badge');
    const dependenciesDiv = document.getElementById('claims_claim_dependencies');
    const dependenciesList = document.getElementById('claims_claim_dependencies_list');
    const claimTextElement = document.getElementById('claims_claim_text');
    
    if (titleElement) {
        titleElement.textContent = `权利要求 ${claimData.claim_number || '未知'} 详情`;
    }
    
    if (numberBadge) {
        numberBadge.textContent = `权利要求 ${claimData.claim_number || '未知'}`;
    }
    
    if (typeBadge) {
        typeBadge.textContent = claimData.claim_type === 'independent' ? '独立权利要求' : '从属权利要求';
        typeBadge.className = `badge ${claimData.claim_type}`;
    }
    
    if (levelBadge) {
        levelBadge.textContent = `层级 ${claimData.level || 0}`;
    }
    
    // 显示依赖关系
    if (dependenciesDiv && dependenciesList) {
        const dependencies = claimData.dependencies || claimData.referenced_claims || [];
        if (dependencies && dependencies.length > 0) {
            dependenciesList.textContent = dependencies.join(', ');
            dependenciesDiv.style.display = 'block';
        } else {
            dependenciesDiv.style.display = 'none';
        }
    }
    
    // 显示权利要求文本
    if (claimTextElement) {
        const claimText = claimData.claim_text || claimData.text || '暂无详细内容';
        claimTextElement.textContent = claimText;
    }
    
    // 显示模态框
    modal.style.display = 'flex';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.background = 'rgba(0, 0, 0, 0.5)';
    modal.style.zIndex = '1000';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    document.body.style.overflow = 'hidden';
    console.log('模态框已显示');
    
    // 强制重绘
    setTimeout(() => {
        modal.offsetHeight; // 触发重绘
    }, 0);
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
        closeSimpleClaimModal();
    }
});

// 简单的权利要求详情模态框
function showSimpleClaimModal(claimData) {
    console.log('显示简单权利要求详情模态框:', claimData);
    
    // 首先移除旧的模态框（如果存在）
    const oldModal = document.getElementById('simple_claim_modal');
    if (oldModal) {
        oldModal.remove();
    }
    
    // 创建新的模态框
    const modal = document.createElement('div');
    modal.id = 'simple_claim_modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        z-index: 1000;
        align-items: center;
        justify-content: center;
    `;
    
    // 创建模态框内容
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        max-width: 850px;
        width: 100%;
        max-height: 80vh;
        overflow-y: auto;
        position: relative;
        z-index: 1001;
    `;
    
    // 创建模态框头部
    const modalHeader = document.createElement('div');
    modalHeader.style.cssText = `
        padding: 20px;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f8f9fa;
        border-radius: 8px 8px 0 0;
    `;
    
    const modalTitle = document.createElement('h3');
    modalTitle.textContent = `权利要求 ${claimData.claim_number || '未知'} 详情`;
    modalTitle.style.cssText = `
        margin: 0;
        color: #333;
        font-size: 18px;
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background-color 0.2s;
    `;
    closeBtn.onclick = closeSimpleClaimModal;
    
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeBtn);
    
    // 创建模态框主体
    const modalBody = document.createElement('div');
    modalBody.style.cssText = `
        padding: 20px;
    `;
    
    // 创建权利要求信息
    const claimInfo = document.createElement('div');
    claimInfo.style.cssText = `
        margin-bottom: 15px;
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
    `;
    
    const numberBadge = document.createElement('span');
    numberBadge.textContent = `权利要求 ${claimData.claim_number || '未知'}`;
    numberBadge.style.cssText = `
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
        color: white;
        background-color: #666;
    `;
    
    const typeBadge = document.createElement('span');
    typeBadge.textContent = claimData.claim_type === 'independent' ? '独立权利要求' : '从属权利要求';
    typeBadge.style.cssText = `
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
        color: white;
        background-color: ${claimData.claim_type === 'independent' ? '#4CAF50' : '#2196F3'};
    `;
    
    const levelBadge = document.createElement('span');
    levelBadge.textContent = `层级 ${claimData.level || 0}`;
    levelBadge.style.cssText = `
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
        color: white;
        background-color: #666;
    `;
    
    claimInfo.appendChild(numberBadge);
    claimInfo.appendChild(typeBadge);
    claimInfo.appendChild(levelBadge);
    
    // 创建依赖关系
    const dependenciesDiv = document.createElement('div');
    dependenciesDiv.style.cssText = `
        margin-bottom: 15px;
        padding: 10px;
        background-color: #f8f9fa;
        border-radius: 4px;
        border-left: 4px solid #2196F3;
    `;
    
    const dependenciesLabel = document.createElement('strong');
    dependenciesLabel.textContent = '依赖关系：';
    
    const dependenciesList = document.createElement('span');
    const dependencies = claimData.dependencies || claimData.referenced_claims || [];
    dependenciesList.textContent = dependencies && dependencies.length > 0 ? dependencies.join(', ') : '无';
    
    dependenciesDiv.appendChild(dependenciesLabel);
    dependenciesDiv.appendChild(dependenciesList);
    
    // 创建权利要求内容
    const contentDiv = document.createElement('div');
    contentDiv.style.cssText = `
        margin-bottom: 15px;
    `;
    
    const contentLabel = document.createElement('strong');
    contentLabel.textContent = '权利要求内容：';
    
    const claimText = document.createElement('p');
    claimText.textContent = claimData.claim_text || claimData.text || '暂无详细内容';
    claimText.style.cssText = `
        margin: 10px 0 0 0;
        line-height: 1.6;
        color: #333;
        background-color: #f8f9fa;
        padding: 15px;
        border-radius: 4px;
        border: 1px solid #e9ecef;
    `;
    
    contentDiv.appendChild(contentLabel);
    contentDiv.appendChild(claimText);
    
    // 组装模态框主体
    modalBody.appendChild(claimInfo);
    modalBody.appendChild(dependenciesDiv);
    modalBody.appendChild(contentDiv);
    
    // 组装模态框内容
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    
    // 组装模态框
    modal.appendChild(modalContent);
    
    // 添加到页面
    document.body.appendChild(modal);
    
    // 点击遮罩层关闭模态框
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeSimpleClaimModal();
        }
    });
    
    // 禁止页面滚动
    document.body.style.overflow = 'hidden';
    console.log('简单模态框已显示');
}

// 关闭简单权利要求详情模态框
function closeSimpleClaimModal() {
    const modal = document.getElementById('simple_claim_modal');
    if (modal) {
        modal.remove();
    }
    document.body.style.overflow = 'auto';
    console.log('简单模态框已关闭');
}

// 在页面加载时初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initClaimsProcessor);
} else {
    initClaimsProcessor();
}