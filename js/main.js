// js/main.js (Final, Corrected, and Robust Version)

// =================================================================================
// 初始化
// =================================================================================
document.addEventListener('DOMContentLoaded', () => {
    initApiKeyConfig();
    initChat();
    initAsyncBatch();
    initLargeBatch();
    initLocalPatentLib();
    initClaimsComparison();
    initFilesManager();
    initPatentBatch();


    // 默认激活第一个主页签
    switchTab('instant', document.querySelector('.main-tab-container .tab-button'));
    
    // 默认激活各个功能内部的第一个步骤
    const asyncFirstStep = document.querySelector('#async_batch-tab .step-item');
    if (asyncFirstStep) switchAsyncSubTab('input', asyncFirstStep);
    
    const largeBatchFirstStep = document.querySelector('#large_batch-tab .step-item');
    if (largeBatchFirstStep) switchSubTab('generator', largeBatchFirstStep);
    
    const lplFirstStep = document.querySelector('#local_patent_lib-tab .step-item');
    if (lplFirstStep) switchLPLSubTab('expand', lplFirstStep);
});

// =================================================================================
// API Key配置 与 统一API调用函数
// =================================================================================
function initApiKeyConfig() {
    appState.apiKey = localStorage.getItem('globalApiKey') || '';
    globalApiKeyInput.value = appState.apiKey;
    apiKeySaveBtn.addEventListener('click', () => {
        appState.apiKey = globalApiKeyInput.value.trim();
        localStorage.setItem('globalApiKey', appState.apiKey);
        apiKeySaveStatus.textContent = "已保存!";
        setTimeout(() => { apiKeySaveStatus.textContent = ""; }, 2000);
    });
    apiConfigToggleBtn.addEventListener('click', () => {
        apiConfigContainer.classList.toggle('visible');
    });
    apiKeyToggleVisibilityBtn.addEventListener('click', () => {
        const isPassword = globalApiKeyInput.type === 'password';
        globalApiKeyInput.type = isPassword ? 'text' : 'password';
        // 保持SVG图标，不要替换为emoji
        const svg = apiKeyToggleVisibilityBtn.querySelector('svg');
        if (svg) {
            // 切换眼睛图标的显示状态（可以通过修改SVG路径或添加斜线来表示隐藏状态）
            // 这里我们保持SVG不变，只是改变输入框类型
        }
    });
    apiKeyCopyBtn.addEventListener('click', () => {
        if (!globalApiKeyInput.value) return;
        navigator.clipboard.writeText(globalApiKeyInput.value).then(() => {
            // 保存原始SVG
            const originalHTML = apiKeyCopyBtn.innerHTML;
            apiKeyCopyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            setTimeout(() => { apiKeyCopyBtn.innerHTML = originalHTML; }, 1500);
        });
    });
    apiKeyDeleteBtn.addEventListener('click', () => {
        globalApiKeyInput.value = '';
    });
    document.addEventListener('click', (event) => {
        if (!apiConfigContainer.contains(event.target) && !apiConfigToggleBtn.contains(event.target)) {
            apiConfigContainer.classList.remove('visible');
        }
    });
}

async function apiCall(endpoint, body, method = 'POST', isStream = false) {
    if (!appState.apiKey) {
        const errorMsg = "API Key 未配置。请点击右上角 ⚙️ 设置并保存您的 API Key。";
        alert(errorMsg);
        throw new Error(errorMsg);
    }

    // ▼▼▼ FIX START: 智能处理 Headers ▼▼▼
    const headers = {
        'Authorization': `Bearer ${appState.apiKey}`
    };

    // 只有当 body 不是 FormData 时，才设置 Content-Type 为 JSON
    if (body && !(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    // ▲▲▲ FIX END ▲▲▲

    const fullUrl = `${window.location.origin}/api${endpoint}`;

    const fetchOptions = {
        method,
        headers,
    };
    
    if (method !== 'GET' && method !== 'HEAD') {
        // ▼▼▼ FIX START: 智能处理 Body ▼▼▼
        if (body instanceof FormData) {
            fetchOptions.body = body; // 直接使用 FormData
        } else if (body) {
            fetchOptions.body = JSON.stringify(body); // 序列化其他类型的 body
        }
        // ▲▲▲ FIX END ▲▲▲
    }

    try {
        const response = await fetch(fullUrl, fetchOptions);

        if (isStream) {
            if (!response.ok) {
                // ... (stream 错误处理保持不变)
                const errorText = await response.text();
                let errorMessage = `请求失败 (Stream): ${response.statusText}`;
                try {
                    const parsedError = JSON.parse(errorText.substring(errorText.indexOf('{')));
                    errorMessage = parsedError.error?.message || JSON.stringify(parsedError.error);
                } catch(e) {
                    errorMessage = errorText;
                }
                throw new Error(errorMessage);
            }
            return response.body.getReader();
        }

        // ▼▼▼ FIX START: 优雅处理非JSON响应 ▼▼▼
        const contentType = response.headers.get("content-type");
        if (!response.ok) {
            // 对于失败的响应，尝试解析为JSON，如果失败则返回文本
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = await response.text();
            }
            const errorMessage = errorData.error?.message || errorData.error || (typeof errorData === 'string' ? errorData : JSON.stringify(errorData));
            throw new Error(errorMessage);
        }

        if (contentType && contentType.indexOf("application/json") !== -1) {
            const result = await response.json();
            // 你的后端包装了响应，所以要解包
            return result.choices ? result : result.data;
        } else {
            // 对于非JSON的成功响应（如文件流），直接返回原始 response 对象
            // 让调用者决定如何处理 (e.g., response.blob(), response.text())
            return response;
        }
        // ▲▲▲ FIX END ▲▲▲

    } catch (error) {
        console.error(`API调用 ${endpoint} 失败:`, error);
        throw error;
    }
}

// =================================================================================
// 页面布局与导航
// =================================================================================
function updateStepperState(stepper, activeStepElement) {
    if (!stepper || !activeStepElement) return;

    const steps = Array.from(stepper.querySelectorAll('.step-item'));
    const activeIndex = steps.indexOf(activeStepElement);

    if (activeIndex === -1) return;

    // 更新步骤状态：之前的步骤标记为completed，当前步骤标记为active
    steps.forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index < activeIndex) {
            step.classList.add('completed');
        } else if (index === activeIndex) {
            step.classList.add('active');
        }
    });
}

function switchTab(tabId, clickedButton) {
    document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".tab-button").forEach(el => el.classList.remove("active"));
    getEl(`${tabId}-tab`).classList.add("active");
    if (clickedButton) clickedButton.classList.add("active");
}

function switchAsyncSubTab(subTabId, clickedElement) {
    const parent = getEl('async_batch-tab');
    parent.querySelectorAll(".sub-tab-content").forEach(el => el.classList.remove("active"));
    getEl(`async-sub-tab-${subTabId}`).classList.add("active");
    
    if (clickedElement) {
        const stepper = clickedElement.closest('.progress-stepper');
        updateStepperState(stepper, clickedElement);
    }

    if (subTabId === 'input') {
        const activeInnerTabButton = document.querySelector('#async-sub-tab-input .sub-tab-container .sub-tab-button.active');
        if (activeInnerTabButton) {
            activeInnerTabButton.click();
        } else {
            const firstInnerTabButton = document.querySelector('#async-sub-tab-input .sub-tab-container .sub-tab-button');
            if (firstInnerTabButton) firstInnerTabButton.click();
        }
    }
}

function switchSubTab(subTabId, clickedElement) {
    const parent = getEl('large_batch-tab');
    parent.querySelectorAll(".sub-tab-content").forEach(el => el.classList.remove("active"));
    getEl(`sub-tab-${subTabId}`).classList.add("active");
    
    if (clickedElement) {
        const stepper = clickedElement.closest('.progress-stepper');
        updateStepperState(stepper, clickedElement);
    }

    // ▼▼▼ 新增的核心逻辑 ▼▼▼
    // 当切换到“解析报告”页签时，主动检查内存中是否有待处理的结果
    if (subTabId === 'reporter' && appState.batch.resultContent) {
        // 显示提示信息
        repInfoBox.style.display = 'block';
        // 解析内存中的JSONL数据并存入报告模块的状态
        appState.reporter.jsonlData = parseJsonl(appState.batch.resultContent);
        // 检查是否可以启用“生成报告”按钮
        checkReporterReady();
    } else if(subTabId !== 'reporter') {
        // 确保离开报告页再回来时，如果内存数据已清除，提示框会隐藏
        // (虽然当前逻辑不会清除，但这是个好的防御性编程习惯)
        repInfoBox.style.display = 'none';
    }
    // ▲▲▲ 新增逻辑结束 ▲▲▲
}

function switchLPLSubTab(subTabId, clickedElement) {
    const parent = getEl('local_patent_lib-tab');
    parent.querySelectorAll(".sub-tab-content").forEach(el => el.classList.remove("active"));
    getEl(`lpl-sub-tab-${subTabId}`).classList.add("active");
    
    if (clickedElement) {
        const stepper = clickedElement.closest('.progress-stepper');
        updateStepperState(stepper, clickedElement);
    }
}

// =================================================================================
// 批量专利解读功能
// =================================================================================
function initPatentBatch() {
    // 获取DOM元素
    const patentNumbersInput = getEl('patent_numbers_input');
    const patentCountDisplay = getEl('patent_count_display');
    const clearPatentInputBtn = getEl('clear_patent_input_btn');
    const searchPatentsBtn = getEl('search_patents_btn');
    const analyzeAllBtn = getEl('analyze_all_btn');
    const exportAnalysisExcelBtn = getEl('export_analysis_excel_btn');
    const searchStatus = getEl('search_status');
    const patentResultsList = getEl('patent_results_list');
    const analysisResultsList = getEl('analysis_results_list');
    
    // 存储专利查询结果
    let patentResults = [];
    
    // 存储解读结果
    let analysisResults = [];
    
    // 实时更新专利号数量
    patentNumbersInput.addEventListener('input', () => {
        const input = patentNumbersInput.value.trim();
        const patentNumbers = input ? input.replace(/\n/g, ' ').split(/\s+/).filter(num => num) : [];
        const uniquePatents = [...new Set(patentNumbers)];
        const count = uniquePatents.length;
        patentCountDisplay.textContent = `专利号数量：${count}/50`;
        
        // 根据数量更新样式
        if (count > 50) {
            patentCountDisplay.style.color = 'red';
            searchPatentsBtn.disabled = true;
        } else {
            patentCountDisplay.style.color = '';
            searchPatentsBtn.disabled = false;
        }
    });
    
    // 清空输入按钮
    clearPatentInputBtn.addEventListener('click', () => {
        patentNumbersInput.value = '';
        patentCountDisplay.textContent = '专利号数量：0/50';
        patentCountDisplay.style.color = '';
        searchPatentsBtn.disabled = false;
        analyzeAllBtn.disabled = true;
        if (exportAnalysisExcelBtn) {
            exportAnalysisExcelBtn.disabled = true;
        }
        patentResultsList.innerHTML = '';
        analysisResultsList.innerHTML = '';
        searchStatus.style.display = 'none';
        patentResults = [];
        analysisResults = [];
    });
    
    // 导出Excel按钮
    if (exportAnalysisExcelBtn) {
        exportAnalysisExcelBtn.addEventListener('click', async () => {
            if (analysisResults.length === 0) {
                alert('没有可导出的解读结果');
                return;
            }
            
            try {
                // 显示导出状态
                searchStatus.textContent = '正在导出Excel文件...';
                searchStatus.style.display = 'block';
                
                // 准备导出数据 - 将JSON字段拆分到各列
                const exportData = analysisResults.map(result => {
                    const patentData = result.patent_data || {};
                    
                    // 解析JSON格式的解读结果
                    let analysisJson = {};
                    try {
                        // 尝试清理可能的markdown代码块标记
                        let cleanContent = (result.analysis_content || '').trim();
                        if (cleanContent.startsWith('```json')) {
                            cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                        } else if (cleanContent.startsWith('```')) {
                            cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
                        }
                        
                        analysisJson = JSON.parse(cleanContent);
                        console.log('Excel导出 - 成功解析JSON:', result.patent_number);
                    } catch (e) {
                        console.error('Excel导出 - JSON解析失败:', result.patent_number, e);
                        // 如果不是JSON格式，将整个内容放到总结字段
                        analysisJson = {
                            summary: result.analysis_content || ''
                        };
                    }
                    
                    // 返回扁平化的数据结构，每个字段一列
                    return {
                        '专利号': result.patent_number,
                        '标题': patentData.title || '',
                        '摘要': patentData.abstract || '',
                        '发明人': patentData.inventors ? patentData.inventors.join(', ') : '',
                        '受让人': patentData.assignees ? patentData.assignees.join(', ') : '',
                        '申请日期': patentData.application_date || '',
                        '公开日期': patentData.publication_date || '',
                        '权利要求': patentData.claims ? (Array.isArray(patentData.claims) ? patentData.claims.join('\n') : patentData.claims) : '',
                        '附图链接': patentData.drawings ? (Array.isArray(patentData.drawings) ? patentData.drawings.join('\n') : patentData.drawings) : '',
                        '说明书': patentData.description || '',
                        '技术领域': analysisJson.technical_field || '',
                        '创新点': analysisJson.innovation_points || '',
                        '技术方案': analysisJson.technical_solution || '',
                        '应用场景': analysisJson.application_scenarios || '',
                        '市场价值': analysisJson.market_value || '',
                        '技术优势': analysisJson.advantages || '',
                        '局限性': analysisJson.limitations || '',
                        '解读总结': analysisJson.summary || ''
                    };
                });
                
                // 使用XLSX库生成Excel文件
                const ws = XLSX.utils.json_to_sheet(exportData);
                
                // 设置列宽以便更好地显示内容
                const colWidths = [
                    { wch: 15 },  // 专利号
                    { wch: 30 },  // 标题
                    { wch: 40 },  // 摘要
                    { wch: 20 },  // 发明人
                    { wch: 20 },  // 受让人
                    { wch: 12 },  // 申请日期
                    { wch: 12 },  // 公开日期
                    { wch: 50 },  // 权利要求
                    { wch: 60 },  // 附图链接
                    { wch: 50 },  // 说明书
                    { wch: 20 },  // 技术领域
                    { wch: 50 },  // 创新点
                    { wch: 50 },  // 技术方案
                    { wch: 40 },  // 应用场景
                    { wch: 40 },  // 市场价值
                    { wch: 40 },  // 技术优势
                    { wch: 40 },  // 局限性
                    { wch: 50 }   // 解读总结
                ];
                ws['!cols'] = colWidths;
                
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, '专利解读结果');
                
                // 导出文件
                const filename = `专利解读结果_${new Date().toISOString().slice(0, 10)}.xlsx`;
                XLSX.writeFile(wb, filename);
                
                // 更新状态
                searchStatus.textContent = `导出成功，共导出 ${analysisResults.length} 个专利解读结果`;
            } catch (error) {
                console.error('导出Excel失败:', error);
                searchStatus.textContent = `导出失败: ${error.message}`;
                searchStatus.style.color = 'red';
            }
        });
    }
    
    // 批量查询专利
    searchPatentsBtn.addEventListener('click', async () => {
        const input = patentNumbersInput.value.trim();
        if (!input) {
            alert('请输入专利号');
            return;
        }
        
        // 处理专利号
        const patentNumbers = input.replace(/\n/g, ' ').split(/\s+/).filter(num => num);
        const uniquePatents = [...new Set(patentNumbers)];
        
        if (uniquePatents.length > 50) {
            alert('最多支持50个专利号');
            return;
        }
        
        // 首先检查后端版本
        try {
            const versionResponse = await apiCall('/patent/version');
            console.log('✅ 后端版本信息:', versionResponse);
            console.log('✅ 支持的功能:', versionResponse.features);
        } catch (error) {
            console.warn('⚠️ 无法获取版本信息，可能是旧版本后端');
        }
        
        // 获取是否需要爬取说明书的选项
        const crawlSpecification = document.getElementById('crawl_specification_checkbox')?.checked || false;
        console.log('📋 crawl_specification:', crawlSpecification);
        
        // 清空之前的结果
        patentResultsList.innerHTML = '';
        analysisResultsList.innerHTML = '';
        analyzeAllBtn.disabled = true;
        
        // 显示查询状态
        searchStatus.textContent = `正在查询 ${uniquePatents.length} 个专利...`;
        searchStatus.style.display = 'block';
        
        try {
            // 调用API查询专利
            console.log('🚀 开始查询专利，参数:', { patent_numbers: uniquePatents, crawl_specification: crawlSpecification });
            const results = await apiCall('/patent/search', {
                patent_numbers: uniquePatents,
                crawl_specification: crawlSpecification
            });
            
            console.log('📦 查询结果:', results);
            
            patentResults = results;
            
            // 显示查询结果
            displayPatentResults(results);
            
            // 更新状态
            searchStatus.textContent = `查询完成，成功 ${results.filter(r => r.success).length} 个，失败 ${results.filter(r => !r.success).length} 个`;
            
            // 如果有成功的结果，启用一键解读按钮
            if (results.some(r => r.success)) {
                analyzeAllBtn.disabled = false;
            }
        } catch (error) {
            console.error('❌ 专利查询失败:', error);
            searchStatus.textContent = `查询失败: ${error.message}`;
            searchStatus.style.color = 'red';
        }
    });
    
    // 一键解读全部
    analyzeAllBtn.addEventListener('click', async () => {
        const successfulResults = patentResults.filter(r => r.success);
        if (successfulResults.length === 0) {
            alert('没有可解读的专利');
            return;
        }
        
        // 获取是否包含说明书的选项
        const includeSpecification = document.getElementById('crawl_specification_checkbox')?.checked || false;
        
        // 清空之前的解读结果
        analysisResultsList.innerHTML = '';
        analysisResults = [];
        
        // 显示解读状态
        searchStatus.textContent = `正在解读 ${successfulResults.length} 个专利...`;
        searchStatus.style.display = 'block';
        
        try {
            // 逐个解读专利
            for (let i = 0; i < successfulResults.length; i++) {
                const patent = successfulResults[i];
                
                // 创建解读结果项
                const resultItem = document.createElement('div');
                resultItem.className = 'result-item';
                resultItem.innerHTML = `<h5>正在解读专利：${patent.patent_number}</h5>`;
                analysisResultsList.appendChild(resultItem);
                
                // 调用API解读专利
                const analysisResult = await apiCall('/patent/analyze', {
                    patent_data: patent.data,
                    include_specification: includeSpecification
                });
                
                // 更新解读结果
                const analysisContent = analysisResult.choices[0]?.message?.content || '解读失败';
                
                console.log('原始解读内容:', analysisContent); // 调试日志
                
                // 尝试解析JSON格式的解读结果
                let analysisJson = {};
                let displayContent = '';
                try {
                    // 尝试清理可能的markdown代码块标记
                    let cleanContent = analysisContent.trim();
                    if (cleanContent.startsWith('```json')) {
                        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                    } else if (cleanContent.startsWith('```')) {
                        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
                    }
                    
                    analysisJson = JSON.parse(cleanContent);
                    console.log('解析后的JSON:', analysisJson); // 调试日志
                    
                    // 以表格形式显示JSON内容
                    displayContent = `
                        <div class="analysis-content">
                            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                                <tr><th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">字段</th><th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">内容</th></tr>
                                <tr><td style="border: 1px solid #ddd; padding: 8px;">技术领域</td><td style="border: 1px solid #ddd; padding: 8px;">${analysisJson.technical_field || '-'}</td></tr>
                                <tr><td style="border: 1px solid #ddd; padding: 8px;">创新点</td><td style="border: 1px solid #ddd; padding: 8px;">${(analysisJson.innovation_points || '-').replace(/\n/g, '<br>')}</td></tr>
                                <tr><td style="border: 1px solid #ddd; padding: 8px;">技术方案</td><td style="border: 1px solid #ddd; padding: 8px;">${(analysisJson.technical_solution || '-').replace(/\n/g, '<br>')}</td></tr>
                                <tr><td style="border: 1px solid #ddd; padding: 8px;">应用场景</td><td style="border: 1px solid #ddd; padding: 8px;">${(analysisJson.application_scenarios || '-').replace(/\n/g, '<br>')}</td></tr>
                                <tr><td style="border: 1px solid #ddd; padding: 8px;">市场价值</td><td style="border: 1px solid #ddd; padding: 8px;">${(analysisJson.market_value || '-').replace(/\n/g, '<br>')}</td></tr>
                                <tr><td style="border: 1px solid #ddd; padding: 8px;">技术优势</td><td style="border: 1px solid #ddd; padding: 8px;">${(analysisJson.advantages || '-').replace(/\n/g, '<br>')}</td></tr>
                                <tr><td style="border: 1px solid #ddd; padding: 8px;">局限性</td><td style="border: 1px solid #ddd; padding: 8px;">${(analysisJson.limitations || '-').replace(/\n/g, '<br>')}</td></tr>
                                <tr><td style="border: 1px solid #ddd; padding: 8px;">总结</td><td style="border: 1px solid #ddd; padding: 8px;">${(analysisJson.summary || '-').replace(/\n/g, '<br>')}</td></tr>
                            </table>
                        </div>
                    `;
                } catch (e) {
                    console.error('JSON解析失败:', e, '原始内容:', analysisContent); // 调试日志
                    // 如果不是JSON格式，显示原始内容
                    displayContent = `
                        <div class="analysis-content">
                            <div style="padding: 10px; background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; margin-bottom: 10px;">
                                ⚠️ 解读结果未能解析为结构化格式，显示原始内容：
                            </div>
                            <div style="white-space: pre-wrap; font-family: monospace; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">
                                ${analysisContent}
                            </div>
                        </div>
                    `;
                }
                
                resultItem.innerHTML = `
                    <h5>专利 ${patent.patent_number} 解读结果</h5>
                    <div class="ai-disclaimer compact">
                        <div class="ai-disclaimer-icon">AI</div>
                        <div class="ai-disclaimer-text"><strong>AI生成：</strong>以下解读由AI生成，仅供参考</div>
                    </div>
                    ${displayContent}
                `;
                
                // 存储解读结果
                analysisResults.push({
                    patent_number: patent.patent_number,
                    patent_data: patent.data,
                    analysis_content: analysisContent
                });
            }
            
            // 更新状态
            searchStatus.textContent = `解读完成，共解读 ${successfulResults.length} 个专利`;
            
            // 启用导出按钮
            if (exportAnalysisExcelBtn) {
                exportAnalysisExcelBtn.disabled = false;
            }
        } catch (error) {
            console.error('专利解读失败:', error);
            searchStatus.textContent = `解读失败: ${error.message}`;
            searchStatus.style.color = 'red';
        }
    });
    
    // 显示专利查询结果
    function displayPatentResults(results) {
        patentResultsList.innerHTML = '';
        
        results.forEach(result => {
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            resultItem.style.fontFamily = '"Noto Sans SC", Arial, sans-serif';
            resultItem.style.lineHeight = '1.6';
            
            if (result.success) {
                const data = result.data;
                
                // 构建完整的专利信息显示
                let htmlContent = `
                    <div style="border-bottom: 2px solid var(--primary-color); padding-bottom: 10px; margin-bottom: 15px;">
                        <h5 style="color: var(--primary-color); margin-bottom: 5px; font-family: 'Noto Sans SC', Arial, sans-serif;">
                            ${result.patent_number} - ${data.title || '无标题'}
                        </h5>
                        <div style="font-size: 0.9em; color: #666;">
                            查询耗时: ${result.processing_time?.toFixed(2) || 'N/A'}秒
                        </div>
                    </div>
                `;
                
                // 基本信息
                htmlContent += `<div style="margin-bottom: 15px;">`;
                
                // 所有可用字段的完整显示
                const fields = [
                    { label: '📄 摘要', value: data.abstract, type: 'text', key: 'abstract' },
                    { label: '👤 发明人', value: data.inventors && data.inventors.length > 0 ? data.inventors.join(', ') : null, type: 'text', key: 'inventors' },
                    { label: '🏢 受让人', value: data.assignees && data.assignees.length > 0 ? data.assignees.join(', ') : null, type: 'text', key: 'assignees' },
                    { label: '📅 申请日期', value: data.application_date, type: 'text', key: 'application_date' },
                    { label: '📅 公开日期', value: data.publication_date, type: 'text', key: 'publication_date' },
                    { label: '🔗 专利链接', value: result.url, type: 'url', key: 'url' }
                ];
                
                // 显示所有基本字段
                fields.forEach(field => {
                    if (field.value) {
                        if (field.type === 'url') {
                            htmlContent += `
                                <p style="margin-bottom: 10px; font-family: 'Noto Sans SC', Arial, sans-serif; position: relative;">
                                    <strong style="color: var(--primary-color);">${field.label}:</strong>
                                    <button class="copy-field-btn" onclick="copyFieldContent('${result.patent_number}', '${field.key}')" title="复制${field.label}" style="margin-left: 8px; padding: 2px 6px; font-size: 0.75em; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;">📋</button>
                                    <br/>
                                    <a href="${field.value}" target="_blank" style="color: var(--primary-color); text-decoration: underline;">${field.value}</a>
                                </p>
                            `;
                        } else {
                            htmlContent += `
                                <p style="margin-bottom: 10px; font-family: 'Noto Sans SC', Arial, sans-serif; position: relative;">
                                    <strong style="color: var(--primary-color);">${field.label}:</strong>
                                    <button class="copy-field-btn" onclick="copyFieldContent('${result.patent_number}', '${field.key}')" title="复制${field.label}" style="margin-left: 8px; padding: 2px 6px; font-size: 0.75em; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;">📋</button>
                                    <br/>
                                    <span style="line-height: 1.6;">${field.value}</span>
                                </p>
                            `;
                        }
                    }
                });
                
                // 权利要求
                if (data.claims && data.claims.length > 0) {
                    const hasMore = data.claims.length > 3;
                    
                    htmlContent += `
                        <div style="margin-top: 15px; padding: 10px; background-color: #f8f9fa; border-radius: 5px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <div>
                                    <strong style="color: var(--primary-color); font-family: 'Noto Sans SC', Arial, sans-serif;">⚖️ 权利要求 (共${data.claims.length}条):</strong>
                                    <button class="copy-field-btn" onclick="copyFieldContent('${result.patent_number}', 'claims')" title="复制所有权利要求" style="margin-left: 8px; padding: 2px 6px; font-size: 0.75em; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;">📋</button>
                                </div>
                                ${hasMore ? `<button class="small-button" onclick="toggleClaims('${result.patent_number}')" style="padding: 2px 8px; font-size: 0.8em;">展开全部</button>` : ''}
                            </div>
                            <div id="claims_${result.patent_number}" class="claims-container" style="max-height: ${hasMore ? '200px' : 'none'}; overflow-y: ${hasMore ? 'auto' : 'visible'};">
                    `;
                    
                    data.claims.forEach((claim, index) => {
                        const isVisible = index < 3;
                        htmlContent += `
                            <div class="claim-item" id="claim_${result.patent_number}_${index}" style="margin-bottom: 8px; padding: 8px; background-color: white; border-radius: 3px; font-size: 0.9em; font-family: 'Noto Sans SC', Arial, sans-serif; ${!isVisible ? 'display: none;' : ''}">
                                <strong>权利要求 ${index + 1}:</strong><br/>
                                ${claim}
                            </div>
                        `;
                    });
                    
                    htmlContent += `</div></div>`;
                }
                
                // 附图显示
                if (data.drawings && data.drawings.length > 0) {
                    htmlContent += `
                        <div style="margin-top: 15px; padding: 10px; background-color: #fff8e1; border-radius: 5px;">
                            <div style="margin-bottom: 10px;">
                                <strong style="color: var(--primary-color); font-family: 'Noto Sans SC', Arial, sans-serif;">🖼️ 专利附图 (共${data.drawings.length}张):</strong>
                                <button class="copy-field-btn" onclick="copyFieldContent('${result.patent_number}', 'drawings')" title="复制所有附图链接" style="margin-left: 8px; padding: 2px 6px; font-size: 0.75em; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;">📋</button>
                            </div>
                            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                    `;
                    
                    data.drawings.forEach((drawing, index) => {
                        htmlContent += `
                            <div style="border: 1px solid #ddd; border-radius: 5px; padding: 5px; background-color: white;">
                                <img src="${drawing}" alt="附图 ${index + 1}" style="max-width: 200px; max-height: 200px; cursor: pointer;" onclick="window.open('${drawing}', '_blank')" onerror="this.parentElement.innerHTML='<div style=\\'padding:20px;color:#999;\\'>图片加载失败</div>'">
                                <div style="text-align: center; font-size: 0.8em; margin-top: 5px; color: #666;">附图 ${index + 1}</div>
                            </div>
                        `;
                    });
                    
                    htmlContent += `</div></div>`;
                }
                
                // 说明书描述
                if (data.description) {
                    htmlContent += `
                        <div style="margin-top: 15px; padding: 10px; background-color: #f0f8ff; border-radius: 5px;">
                            <div style="margin-bottom: 8px;">
                                <strong style="color: var(--primary-color); font-family: 'Noto Sans SC', Arial, sans-serif;">📝 说明书:</strong>
                                <button class="copy-field-btn" onclick="copyFieldContent('${result.patent_number}', 'description')" title="复制说明书" style="margin-left: 8px; padding: 2px 6px; font-size: 0.75em; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;">📋</button>
                            </div>
                            <div style="margin-top: 8px; font-size: 0.9em; line-height: 1.6; font-family: 'Noto Sans SC', Arial, sans-serif; max-height: 300px; overflow-y: auto;">
                                ${data.description}
                            </div>
                        </div>
                    `;
                }
                
                // Patent Citations (引用的专利)
                if (data.patent_citations && data.patent_citations.length > 0) {
                    htmlContent += `
                        <div style="margin-top: 15px; padding: 10px; background-color: #e8f5e9; border-radius: 5px;">
                            <div style="margin-bottom: 8px;">
                                <strong style="color: var(--primary-color); font-family: 'Noto Sans SC', Arial, sans-serif;">📚 引用专利 (共${data.patent_citations.length}条):</strong>
                                <button class="copy-field-btn" onclick="copyFieldContent('${result.patent_number}', 'patent_citations')" title="复制引用专利" style="margin-left: 8px; padding: 2px 6px; font-size: 0.75em; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;">📋</button>
                            </div>
                            <div style="max-height: 200px; overflow-y: auto;">
                                <table style="width: 100%; font-size: 0.85em; border-collapse: collapse;">
                                    <thead>
                                        <tr style="background-color: #c8e6c9;">
                                            <th style="padding: 5px; text-align: left; border: 1px solid #ddd;">专利号</th>
                                            <th style="padding: 5px; text-align: left; border: 1px solid #ddd;">标题</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                    `;
                    
                    data.patent_citations.forEach(citation => {
                        htmlContent += `
                            <tr>
                                <td style="padding: 5px; border: 1px solid #ddd;">${citation.patent_number}</td>
                                <td style="padding: 5px; border: 1px solid #ddd;">${citation.title || '-'}</td>
                            </tr>
                        `;
                    });
                    
                    htmlContent += `
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `;
                }
                
                // Cited By (被引用的专利)
                if (data.cited_by && data.cited_by.length > 0) {
                    htmlContent += `
                        <div style="margin-top: 15px; padding: 10px; background-color: #fff3e0; border-radius: 5px;">
                            <div style="margin-bottom: 8px;">
                                <strong style="color: var(--primary-color); font-family: 'Noto Sans SC', Arial, sans-serif;">🔗 被引用专利 (共${data.cited_by.length}条):</strong>
                                <button class="copy-field-btn" onclick="copyFieldContent('${result.patent_number}', 'cited_by')" title="复制被引用专利" style="margin-left: 8px; padding: 2px 6px; font-size: 0.75em; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;">📋</button>
                            </div>
                            <div style="max-height: 200px; overflow-y: auto;">
                                <table style="width: 100%; font-size: 0.85em; border-collapse: collapse;">
                                    <thead>
                                        <tr style="background-color: #ffe0b2;">
                                            <th style="padding: 5px; text-align: left; border: 1px solid #ddd;">专利号</th>
                                            <th style="padding: 5px; text-align: left; border: 1px solid #ddd;">标题</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                    `;
                    
                    data.cited_by.forEach(citation => {
                        htmlContent += `
                            <tr>
                                <td style="padding: 5px; border: 1px solid #ddd;">${citation.patent_number}</td>
                                <td style="padding: 5px; border: 1px solid #ddd;">${citation.title || '-'}</td>
                            </tr>
                        `;
                    });
                    
                    htmlContent += `
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `;
                }
                
                // Legal Events (法律事件)
                if (data.legal_events && data.legal_events.length > 0) {
                    htmlContent += `
                        <div style="margin-top: 15px; padding: 10px; background-color: #f3e5f5; border-radius: 5px;">
                            <div style="margin-bottom: 8px;">
                                <strong style="color: var(--primary-color); font-family: 'Noto Sans SC', Arial, sans-serif;">⚖️ 法律事件 (共${data.legal_events.length}条):</strong>
                                <button class="copy-field-btn" onclick="copyFieldContent('${result.patent_number}', 'legal_events')" title="复制法律事件" style="margin-left: 8px; padding: 2px 6px; font-size: 0.75em; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;">📋</button>
                            </div>
                            <div style="max-height: 200px; overflow-y: auto;">
                                <table style="width: 100%; font-size: 0.85em; border-collapse: collapse;">
                                    <thead>
                                        <tr style="background-color: #e1bee7;">
                                            <th style="padding: 5px; text-align: left; border: 1px solid #ddd; width: 120px;">日期</th>
                                            <th style="padding: 5px; text-align: left; border: 1px solid #ddd;">事件描述</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                    `;
                    
                    data.legal_events.forEach(event => {
                        htmlContent += `
                            <tr>
                                <td style="padding: 5px; border: 1px solid #ddd;">${event.date}</td>
                                <td style="padding: 5px; border: 1px solid #ddd;">${event.description}</td>
                            </tr>
                        `;
                    });
                    
                    htmlContent += `
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `;
                }
                
                htmlContent += `</div>`;
                
                // 操作按钮
                htmlContent += `
                    <div style="margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
                        <a href="${result.url}" target="_blank" class="small-button" style="text-decoration: none;">
                            🔗 查看原始专利
                        </a>
                        <button class="small-button" onclick="copyPatentInfo('${result.patent_number}')" style="background-color: #28a745;">
                            📋 复制信息
                        </button>
                    </div>
                `;
                
                resultItem.innerHTML = htmlContent;
            } else {
                resultItem.innerHTML = `
                    <h5 style="color: red; font-family: 'Noto Sans SC', Arial, sans-serif;">❌ ${result.patent_number} - 查询失败</h5>
                    <p style="padding: 10px; background-color: #fff3cd; border-radius: 5px; border-left: 4px solid #ffc107; font-family: 'Noto Sans SC', Arial, sans-serif;">
                        <strong>错误信息:</strong> ${result.error}
                    </p>
                `;
            }
            
            patentResultsList.appendChild(resultItem);
        });
    }
    
    // 复制专利信息到剪贴板
    window.copyPatentInfo = function(patentNumber) {
        const result = patentResults.find(r => r.patent_number === patentNumber);
        if (!result || !result.success) return;
        
        const data = result.data;
        let text = `专利号: ${patentNumber}\n`;
        text += `标题: ${data.title || '无'}\n`;
        text += `\n摘要:\n${data.abstract || '无'}\n`;
        
        if (data.inventors && data.inventors.length > 0) {
            text += `\n发明人: ${data.inventors.join(', ')}\n`;
        }
        
        if (data.assignees && data.assignees.length > 0) {
            text += `受让人: ${data.assignees.join(', ')}\n`;
        }
        
        if (data.application_date) {
            text += `申请日期: ${data.application_date}\n`;
        }
        
        if (data.publication_date) {
            text += `公开日期: ${data.publication_date}\n`;
        }
        
        if (data.claims && data.claims.length > 0) {
            text += `\n权利要求 (共${data.claims.length}条):\n`;
            data.claims.forEach((claim, index) => {
                text += `\n${index + 1}. ${claim}\n`;
            });
        }
        
        if (data.drawings && data.drawings.length > 0) {
            text += `\n附图 (共${data.drawings.length}张):\n`;
            data.drawings.forEach((drawing, index) => {
                text += `${index + 1}. ${drawing}\n`;
            });
        }
        
        text += `\n原始链接: ${result.url}\n`;
        
        navigator.clipboard.writeText(text)
            .then(() => alert('✅ 专利信息已复制到剪贴板！'))
            .catch(() => alert('❌ 复制失败，请手动复制。'));
    }
    
    // 复制单个字段内容
    window.copyFieldContent = function(patentNumber, fieldKey) {
        const result = patentResults.find(r => r.patent_number === patentNumber);
        if (!result || !result.success) return;
        
        const data = result.data;
        let text = '';
        
        switch(fieldKey) {
            case 'abstract':
                text = data.abstract || '';
                break;
            case 'inventors':
                text = data.inventors ? data.inventors.join(', ') : '';
                break;
            case 'assignees':
                text = data.assignees ? data.assignees.join(', ') : '';
                break;
            case 'application_date':
                text = data.application_date || '';
                break;
            case 'publication_date':
                text = data.publication_date || '';
                break;
            case 'url':
                text = result.url || '';
                break;
            case 'claims':
                if (data.claims && data.claims.length > 0) {
                    text = data.claims.map((claim, index) => `${index + 1}. ${claim}`).join('\n\n');
                }
                break;
            case 'drawings':
                if (data.drawings && data.drawings.length > 0) {
                    text = data.drawings.map((drawing, index) => `${index + 1}. ${drawing}`).join('\n');
                }
                break;
            case 'description':
                text = data.description || '';
                break;
            case 'patent_citations':
                if (data.patent_citations && data.patent_citations.length > 0) {
                    text = '引用专利:\n' + data.patent_citations.map((citation, index) => 
                        `${index + 1}. ${citation.patent_number} - ${citation.title || '无标题'}`
                    ).join('\n');
                }
                break;
            case 'cited_by':
                if (data.cited_by && data.cited_by.length > 0) {
                    text = '被引用专利:\n' + data.cited_by.map((citation, index) => 
                        `${index + 1}. ${citation.patent_number} - ${citation.title || '无标题'}`
                    ).join('\n');
                }
                break;
            case 'legal_events':
                if (data.legal_events && data.legal_events.length > 0) {
                    text = '法律事件:\n' + data.legal_events.map((event, index) => 
                        `${index + 1}. ${event.date} - ${event.description}`
                    ).join('\n');
                }
                break;
            default:
                text = '';
        }
        
        if (text) {
            navigator.clipboard.writeText(text)
                .then(() => {
                    // 显示简短的成功提示
                    const btn = event.target;
                    const originalText = btn.textContent;
                    btn.textContent = '✓';
                    btn.style.background = '#28a745';
                    setTimeout(() => {
                        btn.textContent = originalText;
                    }, 1000);
                })
                .catch(() => alert('❌ 复制失败，请手动复制。'));
        }
    }
}

// 切换权利要求显示/隐藏
function toggleClaims(patentNumber) {
    const container = document.getElementById(`claims_${patentNumber}`);
    const claimItems = document.querySelectorAll(`.claim-item[id^="claim_${patentNumber}"]`);
    const toggleBtn = container?.parentElement?.querySelector('button');
    
    if (!container || !claimItems.length) return;
    
    let allVisible = true;
    claimItems.forEach((item, index) => {
        if (index >= 3 && item.style.display === 'none') {
            allVisible = false;
        }
    });
    
    if (allVisible) {
        // 隐藏超出部分
        claimItems.forEach((item, index) => {
            if (index >= 3) {
                item.style.display = 'none';
            }
        });
        container.style.maxHeight = '200px';
        container.style.overflowY = 'auto';
        if (toggleBtn) {
            toggleBtn.textContent = '展开全部';
        }
    } else {
        // 显示全部
        claimItems.forEach((item) => {
            item.style.display = 'block';
        });
        container.style.maxHeight = 'none';
        container.style.overflowY = 'visible';
        if (toggleBtn) {
            toggleBtn.textContent = '收起';
        }
    }
}
