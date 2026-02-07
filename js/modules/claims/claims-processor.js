/**
 * Claims Processor Module
 * Handles core processing logic, polling, and result loading
 */

// 开始处理
export async function handleClaimsProcess(state, showMessage, updateProgress, loadResults) {
    const sheetSelect = document.getElementById('claims_sheet_selector');
    const columnSelect = document.getElementById('claims_column_selector');
    const processBtn = document.getElementById('claims_process_btn');
    
    if (!sheetSelect || !columnSelect) return;
    
    const sheetName = sheetSelect.value;
    const columnName = columnSelect.value;
    
    if (processBtn) {
        processBtn.disabled = true;
        processBtn.textContent = '处理中...';
    }
    
    const progressContainer = document.getElementById('claims_progress_container');
    if (progressContainer) {
        progressContainer.style.display = 'block';
    }
    
    try {
        const requestBody = {
            file_id: state.currentFileId,
            sheet_name: sheetName,
            column_name: columnName
        };
        
        if (state.currentPatentColumn) {
            requestBody.patent_column_name = state.currentPatentColumn;
            console.log('发送专利号列参数:', state.currentPatentColumn);
        }
        
        const response = await fetch('/api/claims/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            if (response.status === 502) {
                showMessage('处理请求已提交，正在后台处理中...', 'info');
                if (processBtn) {
                    processBtn.textContent = '后台处理中...';
                }
                return;
            }
            
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText || '服务器错误'}`);
        }
        
        let data;
        try {
            const responseText = await response.text();
            if (!responseText || responseText.trim() === '') {
                throw new Error('服务器返回空响应');
            }
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            throw new Error('服务器返回的数据格式错误');
        }
        
        if (data.success) {
            const responseData = data.data || {};
            state.currentTaskId = responseData.task_id || data.task_id;
            startClaimsPolling(state, showMessage, updateProgress, loadResults);
        } else {
            if (data.error && data.error.includes('正在进行中')) {
                showMessage('上一个处理任务仍在进行中，请稍候...', 'info');
                if (state.currentTaskId) {
                    startClaimsPolling(state, showMessage, updateProgress, loadResults);
                } else {
                    resetProcessButton();
                }
            } else {
                showMessage('处理失败：' + data.error, 'error');
                resetProcessButton();
            }
        }
    } catch (error) {
        console.error('Process error:', error);
        showMessage('处理失败：' + error.message, 'error');
        resetProcessButton();
    }
}

// 轮询处理状态
function startClaimsPolling(state, showMessage, updateProgress, loadResults) {
    if (state.processingInterval) {
        clearInterval(state.processingInterval);
    }
    
    let pollCount = 0;
    const startTime = Date.now();
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 10;
    const MAX_POLLING_TIME = 600000; // 10分钟
    
    const poll = async () => {
        try {
            const elapsedSeconds = (Date.now() - startTime) / 1000;
            
            if (elapsedSeconds > MAX_POLLING_TIME / 1000) {
                clearInterval(state.processingInterval);
                showMessage('处理超时（超过10分钟），请检查文件大小或联系技术支持', 'error');
                resetProcessButton();
                return;
            }
            
            const response = await fetch(`/api/claims/status/${state.currentTaskId}`);
            const data = await response.json();
            
            consecutiveErrors = 0;
            
            if (data.success) {
                const responseData = data.data || {};
                const progress = responseData.progress || data.progress || 0;
                const status = responseData.status || data.status;
                const error = responseData.error || data.error;
                
                updateProgress(progress);
                
                if (status === 'completed') {
                    clearInterval(state.processingInterval);
                    setTimeout(() => {
                        loadResults(state, showMessage);
                    }, 1500);
                    return;
                } else if (status === 'failed') {
                    clearInterval(state.processingInterval);
                    showMessage('处理失败：' + error, 'error');
                    resetProcessButton();
                    return;
                } else if (status === 'processing') {
                    console.log(`[Polling] 任务处理中... 进度: ${progress}%, 已用时: ${elapsedSeconds.toFixed(1)}秒`);
                }
            }
            
            pollCount++;
            
            let nextInterval;
            if (elapsedSeconds < 30) {
                nextInterval = 3000;
            } else if (elapsedSeconds < 120) {
                nextInterval = 5000;
            } else {
                nextInterval = 8000;
            }
            
            clearInterval(state.processingInterval);
            state.processingInterval = setInterval(poll, nextInterval);
            
        } catch (error) {
            console.error('Polling error:', error);
            consecutiveErrors++;
            
            if (error instanceof SyntaxError && error.message.includes('JSON')) {
                console.log(`[Polling] JSON解析错误（可能后端繁忙），继续等待... (错误次数: ${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS})`);
            }
            
            if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                clearInterval(state.processingInterval);
                showMessage('处理超时或服务器繁忙，请稍后刷新页面查看结果', 'error');
                resetProcessButton();
            }
        }
    };
    
    poll();
}

// 更新进度
export function updateClaimsProgress(progress) {
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
export async function loadClaimsResults(state, showMessage, displayResults, retryCount = 0) {
    const MAX_RETRIES = 3;
    
    try {
        console.log(`[loadClaimsResults] Fetching result for task: ${state.currentTaskId} (尝试 ${retryCount + 1}/${MAX_RETRIES + 1})`);
        const response = await fetch(`/api/claims/result/${state.currentTaskId}`);
        
        console.log(`[loadClaimsResults] Response status: ${response.status}`);
        console.log(`[loadClaimsResults] Response headers:`, {
            contentType: response.headers.get('Content-Type'),
            contentLength: response.headers.get('Content-Length')
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[loadClaimsResults] Error response:`, errorText);
            
            if (response.status === 400 && errorText.includes('尚未完成') && retryCount < MAX_RETRIES) {
                console.log(`[loadClaimsResults] 任务尚未完成，2秒后重试...`);
                setTimeout(() => {
                    loadClaimsResults(state, showMessage, displayResults, retryCount + 1);
                }, 2000);
                return;
            }
            
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const responseText = await response.text();
        console.log(`[loadClaimsResults] Response text length: ${responseText.length}`);
        
        if (!responseText || responseText.trim() === '') {
            throw new Error('服务器返回空响应');
        }
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error(`[loadClaimsResults] JSON parse error:`, parseError);
            console.error(`[loadClaimsResults] Response text:`, responseText.substring(0, 500));
            throw new Error('服务器返回的数据格式错误');
        }
        
        if (data.success) {
            const responseData = data.data || {};
            state.processedData = responseData;
            displayResults(responseData);
            showMessage('处理完成！', 'success');
        } else {
            showMessage('获取结果失败：' + data.error, 'error');
        }
    } catch (error) {
        console.error('Load results error:', error);
        showMessage('获取结果失败：' + error.message, 'error');
    }
    
    resetProcessButton();
}

// 导出结果
export async function exportClaimsResults(format, state, showMessage) {
    if (!state.currentTaskId) {
        showMessage('没有可导出的结果', 'error');
        return;
    }
    
    try {
        console.log(`[Export v2.0] Starting ${format} export for task: ${state.currentTaskId}`);
        showMessage(`正在导出${format.toUpperCase()}文件...`, 'info');
        
        const response = await fetch(`/api/claims/export/${state.currentTaskId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ format: format })
        });
        
        console.log(`[Export v2.0] Response status: ${response.status}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '导出失败');
        }
        
        const blob = await response.blob();
        
        console.log(`[Export v2.0] Blob size: ${blob.size} bytes`);
        
        if (blob.size === 0) {
            throw new Error('导出的文件为空');
        }
        
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `claims_result_${Date.now()}.${format === 'excel' ? 'xlsx' : 'json'}`;
        
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1].replace(/['"]/g, '');
            }
        }
        
        console.log(`[Export v2.0] Filename: ${filename}`);
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        console.log(`[Export v2.0] Download triggered`);
        
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            console.log(`[Export v2.0] Cleanup complete`);
        }, 100);
        
        showMessage('导出成功！', 'success');
    } catch (error) {
        console.error('[Export v2.0] Export error:', error);
        showMessage('导出失败：' + error.message, 'error');
    }
}

// 重置处理按钮
function resetProcessButton() {
    const processBtn = document.getElementById('claims_process_btn');
    if (processBtn) {
        processBtn.disabled = false;
        processBtn.textContent = '开始处理';
    }
}
