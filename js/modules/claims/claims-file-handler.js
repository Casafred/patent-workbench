/**
 * Claims File Handler Module
 * Handles file upload, column detection, and patent column selection
 */

// 处理文件选择
export async function handleClaimsFileSelect(event, state, showMessage) {
    const file = event.target.files[0];
    if (!file) return;
    
    state.currentFile = file;
    
    // 显示加载状态
    showMessage('正在上传文件...', 'info');
    
    try {
        // 上传文件
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/claims/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        console.log('Upload response:', data);
        
        if (data.success) {
            const responseData = data.data || {};
            const sheets = responseData.sheet_names || [];
            const filePath = responseData.file_path || '';
            const fileId = responseData.file_id || '';
            const columnAnalysis = responseData.column_analysis || {};
            
            // 存储文件信息供后续使用
            state.currentFilePath = filePath;
            state.currentFileId = fileId;
            
            // 处理专利号列识别结果
            if (columnAnalysis.patent_number_column) {
                state.currentPatentColumn = columnAnalysis.patent_number_column.column_name;
                console.log('自动识别到专利号列:', state.currentPatentColumn);
                console.log('识别置信度:', columnAnalysis.patent_number_column.confidence);
                
                // 显示识别结果
                showPatentColumnDetectionResult(columnAnalysis.patent_number_column, state, showMessage);
            } else {
                console.log('未自动识别到专利号列，将提供手动选择');
                state.currentPatentColumn = null;
            }
            
            if (sheets.length === 0) {
                showMessage('文件中没有找到工作表', 'error');
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
                loadClaimsColumns(filePath, sheets[0], state, showMessage);
                
                // 监听工作表变化
                sheetSelect.addEventListener('change', (e) => {
                    loadClaimsColumns(filePath, e.target.value, state, showMessage);
                });
            }
            
            showMessage('文件上传成功！', 'success');
        } else {
            showMessage('上传失败：' + (data.error || '未知错误'), 'error');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showMessage('上传失败：' + error.message, 'error');
    }
}

// 加载列信息
export async function loadClaimsColumns(filePath, sheetName, state, showMessage) {
    try {
        console.log(`[loadClaimsColumns] Loading columns for sheet: ${sheetName}`);
        
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
        
        console.log(`[loadClaimsColumns] Response status: ${response.status}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[loadClaimsColumns] Error response:`, errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const responseText = await response.text();
        console.log(`[loadClaimsColumns] Response text length: ${responseText.length}`);
        
        if (!responseText || responseText.trim() === '') {
            throw new Error('服务器返回空响应');
        }
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error(`[loadClaimsColumns] JSON parse error:`, parseError);
            console.error(`[loadClaimsColumns] Response text:`, responseText.substring(0, 500));
            throw new Error('服务器返回的数据格式错误');
        }
        
        if (data.success) {
            const responseData = data.data || {};
            const columns = responseData.columns || [];
            
            const columnContainer = document.getElementById('claims_column_selector_container');
            const columnSelect = document.getElementById('claims_column_selector');
            const processBtn = document.getElementById('claims_process_btn');
            
            if (columnContainer && columnSelect) {
                columnSelect.innerHTML = '';
                
                // 智能识别权利要求列
                let claimsColumnFound = false;
                let detectedClaimsColumn = null;
                
                columns.forEach(column => {
                    const option = document.createElement('option');
                    option.value = column;
                    option.textContent = column;
                    
                    const columnLower = column.toLowerCase();
                    if (!claimsColumnFound && (columnLower.includes('权利要求') || columnLower.includes('claim'))) {
                        option.selected = true;
                        claimsColumnFound = true;
                        detectedClaimsColumn = column;
                    }
                    
                    columnSelect.appendChild(option);
                });
                
                columnContainer.style.display = 'block';
                
                if (processBtn) {
                    processBtn.disabled = false;
                }
                
                if (claimsColumnFound && detectedClaimsColumn) {
                    showMessage(`✨ 自动识别到权利要求列: ${detectedClaimsColumn}`, 'success');
                }
            }
            
            // 尝试自动识别专利号列
            claimsAutoDetectPatentColumn(columns, responseData, state, showMessage);
        } else {
            showMessage('加载列信息失败：' + (data.error || '未知错误'), 'error');
        }
    } catch (error) {
        console.error('Load columns error:', error);
        showMessage('加载列信息失败：' + error.message, 'error');
    }
}

// 自动检测专利号列
async function claimsAutoDetectPatentColumn(columns, responseData, state, showMessage) {
    try {
        const columnAnalysis = responseData.column_analysis;
        
        if (columnAnalysis && columnAnalysis.patent_number_column) {
            const patentCol = columnAnalysis.patent_number_column;
            state.currentPatentColumn = patentCol.column_name;
            console.log('自动检测到专利号列:', patentCol.column_name, '置信度:', patentCol.confidence);
            showMessage(`✨ 自动检测到专利号列: ${patentCol.column_name} (置信度: ${(patentCol.confidence * 100).toFixed(0)}%)`, 'success');
        } else {
            console.log('未能自动检测到专利号列，显示手动选择器');
            showMessage('⚠️ 未能自动识别专利号列，请手动选择', 'info');
        }
        
        claimsShowPatentColumnSelector(columns, state.currentPatentColumn, state, showMessage);
        
    } catch (error) {
        console.error('Auto detect patent column error:', error);
        claimsShowPatentColumnSelector(columns, null, state, showMessage);
    }
}

// 显示专利号列选择器
function claimsShowPatentColumnSelector(columns, selectedColumn, state, showMessage) {
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
        
        const columnContainer = document.getElementById('claims_column_selector_container');
        if (columnContainer && columnContainer.parentNode) {
            columnContainer.parentNode.insertBefore(patentColumnContainer, columnContainer.nextSibling);
        }
    }
    
    const patentColumnSelect = document.getElementById('claims_patent_column_selector');
    if (patentColumnSelect) {
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
        
        patentColumnSelect.addEventListener('change', (e) => {
            state.currentPatentColumn = e.target.value;
            console.log('选择专利号列:', state.currentPatentColumn);
            if (state.currentPatentColumn) {
                showMessage(`✓ 已选择专利号列: ${state.currentPatentColumn}`, 'success');
            }
        });
        
        patentColumnContainer.style.display = 'block';
    }
}

// 显示专利号列识别结果
function showPatentColumnDetectionResult(detectionResult, state, showMessage) {
    console.log('显示专利号列识别结果:', detectionResult);
    
    let configSection = document.getElementById('claims_patent_column_config');
    if (!configSection) {
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
                        <button class="btn-small" onclick="window.confirmPatentColumn()">确认使用</button>
                        <button class="btn-small secondary" onclick="window.showManualPatentColumnSelection()">手动选择</button>
                    </div>
                </div>
                <div id="manual_patent_selection" class="manual-selection" style="display: none;">
                    <label for="patent_column_selector">请选择专利号列：</label>
                    <select id="patent_column_selector" class="form-control">
                        <option value="">-- 请选择 --</option>
                    </select>
                    <button class="btn-primary" onclick="window.setManualPatentColumn()">确认选择</button>
                </div>
                <div id="no_patent_column" class="warning-message" style="display: none;">
                    <span class="icon warning">⚠</span>
                    <span>未检测到专利号列，专利搜索功能将不可用</span>
                </div>
            `;
            
            uploadContainer.parentNode.insertBefore(configSection, uploadContainer.nextSibling);
        }
    }
    
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
    
    const manualSelection = document.getElementById('manual_patent_selection');
    const noPatentColumn = document.getElementById('no_patent_column');
    if (manualSelection) manualSelection.style.display = 'none';
    if (noPatentColumn) noPatentColumn.style.display = 'none';
}

// 确认使用自动识别的专利号列
export function confirmPatentColumn(state, showMessage) {
    console.log('用户确认使用专利号列:', state.currentPatentColumn);
    showMessage('已确认专利号列: ' + state.currentPatentColumn, 'success');
    
    const configSection = document.getElementById('claims_patent_column_config');
    if (configSection) {
        configSection.style.display = 'none';
    }
}

// 显示手动选择专利号列界面
export function showManualPatentColumnSelection() {
    console.log('显示手动选择专利号列界面');
    
    const autoDetectionResult = document.getElementById('auto_detection_result');
    const manualSelection = document.getElementById('manual_patent_selection');
    const patentColumnSelector = document.getElementById('patent_column_selector');
    
    if (autoDetectionResult) {
        autoDetectionResult.style.display = 'none';
    }
    
    if (manualSelection) {
        manualSelection.style.display = 'block';
    }
    
    if (patentColumnSelector) {
        const columnSelect = document.getElementById('claims_column_selector');
        if (columnSelect) {
            patentColumnSelector.innerHTML = columnSelect.innerHTML;
        }
    }
}

// 设置手动选择的专利号列
export function setManualPatentColumn(state, showMessage) {
    const patentColumnSelector = document.getElementById('patent_column_selector');
    if (patentColumnSelector && patentColumnSelector.value) {
        state.currentPatentColumn = patentColumnSelector.value;
        console.log('手动设置专利号列:', state.currentPatentColumn);
        showMessage('已设置专利号列: ' + state.currentPatentColumn, 'success');
        
        const configSection = document.getElementById('claims_patent_column_config');
        if (configSection) {
            configSection.style.display = 'none';
        }
    } else {
        showMessage('请选择一个专利号列', 'error');
    }
}
