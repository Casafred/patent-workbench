// js/main.js (Final, Corrected, and Robust Version)

// =================================================================================
// 初始化
// =================================================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('开始初始化所有模块');
    initApiKeyConfig();
    initChat();
    initAsyncBatch();
    console.log('准备初始化大批量处理模块');
    initLargeBatch();
    console.log('大批量处理模块初始化完成');
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
            // 对于失败的响应，先克隆response以便多次读取
            const clonedResponse = response.clone();
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                // 如果JSON解析失败，使用克隆的response读取文本
                try {
                    errorData = await clonedResponse.text();
                } catch (textError) {
                    errorData = 'Unknown error';
                }
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
    // 初始化模板管理
    initPatentTemplate();
    
    // 初始化对话功能
    initPatentChat();
    
    // 获取DOM元素
    const patentNumbersInput = getEl('patent_numbers_input');
    const patentCountDisplay = getEl('patent_count_display');
    const clearPatentInputBtn = getEl('clear_patent_input_btn');
    const copyPatentNumbersBtn = getEl('copy_patent_numbers_btn');
    const searchPatentsBtn = getEl('search_patents_btn');
    const analyzeAllBtn = getEl('analyze_all_btn');
    const exportAnalysisExcelBtn = getEl('export_analysis_excel_btn');
    const searchStatus = getEl('search_status');
    const patentResultsContainer = getEl('patent_results_container');
    const patentResultsList = getEl('patent_results_list');
    const analysisResultsList = getEl('analysis_results_list');
    
    // 存储专利查询结果
    let patentResults = [];
    
    // 存储解读结果
    let analysisResults = [];
    
    // 复制专利号按钮
    if (copyPatentNumbersBtn) {
        copyPatentNumbersBtn.addEventListener('click', () => {
            const text = patentNumbersInput.value.trim();
            if (!text) {
                alert('没有可复制的内容');
                return;
            }
            
            navigator.clipboard.writeText(text).then(() => {
                // 显示复制成功提示
                const originalHTML = copyPatentNumbersBtn.innerHTML;
                copyPatentNumbersBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>';
                setTimeout(() => {
                    copyPatentNumbersBtn.innerHTML = originalHTML;
                }, 1500);
            }).catch(err => {
                console.error('复制失败:', err);
                alert('复制失败，请手动复制');
            });
        });
    }
    
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
        patentResultsContainer.style.display = 'none';
        patentResultsList.innerHTML = '';
        if (analysisResultsList) {
            analysisResultsList.innerHTML = '';
        }
        searchStatus.style.display = 'none';
        patentResults = [];
        analysisResults = [];
    });
    
    // 导出Excel按钮
    if (exportAnalysisExcelBtn) {
        exportAnalysisExcelBtn.addEventListener('click', async () => {
            if (patentResults.length === 0) {
                alert('没有可导出的专利数据');
                return;
            }
            
            try {
                // 显示导出状态
                searchStatus.textContent = '正在导出Excel文件...';
                searchStatus.style.display = 'block';
                
                // 准备导出数据
                const exportData = patentResults.map(result => {
                    // 检查result是否成功
                    if (!result.success) {
                        // 如果查询失败，只导出专利号和错误信息
                        return {
                            '专利号': result.patent_number,
                            '错误信息': result.error || '查询失败',
                            '标题': '',
                            '摘要': '',
                            '发明人': '',
                            '受让人': '',
                            '申请日期': '',
                            '公开日期': '',
                            '权利要求': '',
                            '附图链接': '',
                            '说明书': ''
                        };
                    }
                    
                    const patentData = result.data || {};
                    
                    // 构建基础数据行
                    const row = {
                        '专利号': result.patent_number,
                        '标题': patentData.title || '',
                        '摘要': patentData.abstract || '',
                        '发明人': patentData.inventors ? patentData.inventors.join(', ') : '',
                        '受让人': patentData.assignees ? patentData.assignees.join(', ') : '',
                        '申请日期': patentData.application_date || '',
                        '公开日期': patentData.publication_date || '',
                        '权利要求': patentData.claims ? (Array.isArray(patentData.claims) ? patentData.claims.join('\n') : patentData.claims) : '',
                        '附图链接': patentData.drawings ? (Array.isArray(patentData.drawings) ? patentData.drawings.join('\n') : patentData.drawings) : '',
                        '说明书': patentData.description || ''
                    };
                    
                    // 尝试添加解读结果
                    const analysisResult = analysisResults.find(item => item.patent_number === result.patent_number);
                    if (analysisResult) {
                        try {
                            // 尝试清理可能的markdown代码块标记
                            let cleanContent = (analysisResult.analysis_content || '').trim();
                            if (cleanContent.startsWith('```json')) {
                                cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                            } else if (cleanContent.startsWith('```')) {
                                cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
                            }
                            
                            const analysisJson = JSON.parse(cleanContent);
                            
                            // 动态添加解读字段
                            Object.keys(analysisJson).forEach(key => {
                                row[key] = analysisJson[key] || '';
                            });
                        } catch (e) {
                            // 如果不是JSON格式，将整个内容放到一个字段
                            row['解读结果'] = analysisResult.analysis_content || '';
                        }
                    }
                    
                    return row;
                });
                
                // 使用XLSX库生成Excel文件
                const ws = XLSX.utils.json_to_sheet(exportData);
                
                // 动态设置列宽
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
                    { wch: 50 }   // 解读结果（如果有）
                ];
                ws['!cols'] = colWidths;
                
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, '专利数据');
                
                // 导出文件
                const filename = `专利数据_${new Date().toISOString().slice(0, 10)}.xlsx`;
                XLSX.writeFile(wb, filename);
                
                // 更新状态
                searchStatus.textContent = `导出成功，共导出 ${patentResults.length} 个专利数据`;
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
            const versionResponse = await apiCall('/patent/version', null, 'GET');
            console.log('✅ 后端版本信息:', versionResponse);
            console.log('✅ 支持的功能:', versionResponse.features);
        } catch (error) {
            console.warn('⚠️ 无法获取版本信息，可能是旧版本后端');
        }
        
        // 总是启用爬取额外信息
        const crawlSpecification = true; // 强制启用，确保获取所有额外信息
        console.log('📋 crawl_specification:', crawlSpecification);
        
        // 清空之前的结果
        patentResultsList.innerHTML = '';
        if (analysisResultsList) {
            analysisResultsList.innerHTML = '';
        }
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
        
        // 获取当前模板
        const template = appState.patentBatch.currentTemplate;
        if (!template) {
            alert('请先选择解读模板');
            return;
        }
        
        // 获取是否包含说明书的选项
        const includeSpecification = document.getElementById('crawl_specification_checkbox')?.checked || false;
        
        // 清空之前的解读结果
        if (analysisResultsList) {
            analysisResultsList.innerHTML = '';
        }
        analysisResults = [];
        
        // 显示解读状态
        searchStatus.textContent = `正在使用"${template.name}"模板解读 ${successfulResults.length} 个专利...`;
        searchStatus.style.display = 'block';
        
        // 创建一个Map来存储解读结果，key是专利号
        const analysisResultsMap = new Map();
        
        try {
            // 逐个解读专利
            for (let i = 0; i < successfulResults.length; i++) {
                const patent = successfulResults[i];
                
                // 创建占位符（按用户输入顺序）
                const placeholderId = `analysis_placeholder_${patent.patent_number}`;
                if (!document.getElementById(placeholderId) && analysisResultsList) {
                    const placeholder = document.createElement('div');
                    placeholder.id = placeholderId;
                    placeholder.className = 'result-item';
                    placeholder.innerHTML = `<h5>正在解读专利：${patent.patent_number} (${i + 1}/${successfulResults.length})</h5>`;
                    analysisResultsList.appendChild(placeholder);
                }
                
                // 使用模板构建提示词
                const userPrompt = buildAnalysisPrompt(template, patent.data, includeSpecification);
                
                // 获取选择的模型
                const selectedModel = getEl('patent_batch_model_selector')?.value || 'GLM-4-Flash';
                
                // 调用API解读专利
                const analysisResult = await apiCall('/patent/analyze', {
                    patent_data: patent.data,
                    template: {
                        fields: template.fields,
                        system_prompt: template.systemPrompt
                    },
                    user_prompt: userPrompt,
                    include_specification: includeSpecification,
                    model: selectedModel
                });
                
                // 更新解读结果
                const analysisContent = analysisResult.choices[0]?.message?.content || '解读失败';
                
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
                    
                    // 动态生成表格内容（根据模板字段）
                    let tableRows = '';
                    template.fields.forEach(field => {
                        const value = analysisJson[field.id] || '-';
                        const displayValue = typeof value === 'string' ? value.replace(/\n/g, '<br>') : value;
                        tableRows += `<tr><td style="border: 1px solid #ddd; padding: 8px;">${field.name}</td><td style="border: 1px solid #ddd; padding: 8px;">${displayValue}</td></tr>`;
                    });
                    
                    displayContent = `
                        <div class="analysis-content">
                            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                                <tr><th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">字段</th><th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">内容</th></tr>
                                ${tableRows}
                            </table>
                        </div>
                    `;
                } catch (e) {
                    console.error('JSON解析失败:', e);
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
                
                // 更新占位符内容
                const placeholder = document.getElementById(placeholderId);
                if (placeholder) {
                    placeholder.innerHTML = `
                        <h5>专利 ${patent.patent_number} 解读结果</h5>
                        <div class="ai-disclaimer compact">
                            <div class="ai-disclaimer-icon">AI</div>
                            <div class="ai-disclaimer-text"><strong>AI生成：</strong>以下解读由AI生成，仅供参考</div>
                        </div>
                        ${displayContent}
                    `;
                }
                
                // 存储解读结果到Map
                analysisResultsMap.set(patent.patent_number, {
                    patent_number: patent.patent_number,
                    patent_data: patent.data,
                    analysis_content: analysisContent
                });
            }
            
            // 按照用户输入的顺序重新组织 analysisResults 数组
            analysisResults = [];
            patentResults.forEach(result => {
                if (result.success && analysisResultsMap.has(result.patent_number)) {
                    analysisResults.push(analysisResultsMap.get(result.patent_number));
                }
            });
            
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
    
// 显示专利查询结果 - 条带式展示
function displayPatentResults(results) {
    // 保存到状态
    appState.patentBatch.patentResults = results;
    
    // 显示结果容器
    if (patentResultsContainer) {
        patentResultsContainer.style.display = 'block';
    }
    
    patentResultsList.innerHTML = '';
    
    results.forEach(result => {
        const stripItem = document.createElement('div');
        stripItem.className = `patent-strip ${result.success ? 'success' : 'error'}`;
        
        if (result.success) {
            const data = result.data;
            const titlePreview = data.title ? (data.title.length > 60 ? data.title.substring(0, 60) + '...' : data.title) : '无标题';
            
            stripItem.innerHTML = `
                <div class="patent-strip-icon">
                    ✓
                </div>
                <div class="patent-strip-content">
                    <div class="patent-strip-number">${result.patent_number}</div>
                    <div class="patent-strip-title">${titlePreview}</div>
                </div>
                <div class="patent-strip-actions">
                    <button class="patent-strip-copy-btn" onclick="copyPatentNumber('${result.patent_number}', event)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                            <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                        </svg>
                        复制
                    </button>
                </div>
            `;
            
            // 点击条带打开详情弹窗
            stripItem.addEventListener('click', (e) => {
                // 如果点击的是复制按钮，不打开弹窗
                if (e.target.closest('.patent-strip-copy-btn')) {
                    return;
                }
                e.stopPropagation(); // 阻止事件冒泡
                openPatentDetailModal(result);
            });
        } else {
            stripItem.innerHTML = `
                <div class="patent-strip-icon">
                    ✗
                </div>
                <div class="patent-strip-content">
                    <div class="patent-strip-number">${result.patent_number}</div>
                    <div class="patent-strip-error">查询失败: ${result.error}</div>
                </div>
            `;
        }
        
        patentResultsList.appendChild(stripItem);
    });
    
    // 启用导出按钮，即使没有解读结果也可以导出爬取的字段
    if (exportAnalysisExcelBtn) {
        exportAnalysisExcelBtn.disabled = false;
    }
}

// 切换权利要求显示/隐藏 - 单按钮切换
function toggleClaims(patentNumber) {
    const container = document.getElementById(`claims_${patentNumber}`);
    const claimItems = document.querySelectorAll(`.claim-item[id^="claim_${patentNumber}"]`);
    
    if (!container || !claimItems.length) return;
    
    // 查找切换按钮
    const toggleBtn = container.parentElement.querySelector(`button[onclick*="toggleClaims('${patentNumber}')"]`);
    if (!toggleBtn) return;
    
    // 检查当前状态：如果有任何一个隐藏的项，说明是收起状态
    let isCollapsed = false;
    claimItems.forEach((item, index) => {
        if (index >= 3 && item.style.display === 'none') {
            isCollapsed = true;
        }
    });
    
    if (isCollapsed) {
        // 展开全部
        claimItems.forEach((item) => {
            item.style.display = 'block';
        });
        container.style.maxHeight = 'none';
        container.style.overflowY = 'visible';
        toggleBtn.textContent = '收起';
    } else {
        // 收起，只显示前3条
        claimItems.forEach((item, index) => {
            if (index >= 3) {
                item.style.display = 'none';
            }
        });
        container.style.maxHeight = '200px';
        container.style.overflowY = 'auto';
        toggleBtn.textContent = '展开全部';
    }
}

// ====================================================================
// 专利详情弹窗功能
// ====================================================================

// 打开专利详情弹窗
window.openPatentDetailModal = function(result) {
    const modal = document.getElementById('patent_detail_modal');
    const modalBody = document.getElementById('patent_detail_body');
    const modalTitle = document.getElementById('patent_detail_title');
    
    if (!modal || !modalBody || !modalTitle) return;
    
    const data = result.data;
    modalTitle.textContent = `${result.patent_number} - ${data.title || '无标题'}`;
    
    // 构建完整的专利信息HTML
    let htmlContent = buildPatentDetailHTML(result);
    
    modalBody.innerHTML = htmlContent;
    
    // 先设置为flex显示，确保居中
    modal.style.display = 'flex';
    
    // 触发重排，然后添加show类以触发过渡效果
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
};

// 关闭专利详情弹窗
window.closePatentDetailModal = function() {
    const modal = document.getElementById('patent_detail_modal');
    if (modal) {
        // 移除show类，触发过渡效果
        modal.classList.remove('show');
        
        // 等待过渡效果完成后再隐藏
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
};

// 复制专利号
window.copyPatentNumber = function(patentNumber, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    navigator.clipboard.writeText(patentNumber)
        .then(() => {
            const btn = event?.target?.closest('button');
            if (btn) {
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/></svg> 已复制';
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                }, 1500);
            }
        })
        .catch(() => alert('❌ 复制失败'));
};

// 构建专利详情HTML
function buildPatentDetailHTML(result) {
    const data = result.data;
    
    let htmlContent = `
        <div class="patent-card-header">
            <div style="flex: 1;">
                <div style="font-size: 0.9em; color: #666; margin-bottom: 8px;">
                    查询耗时: ${result.processing_time?.toFixed(2) || 'N/A'}秒
                </div>
            </div>
            <button class="ask-patent-btn" onclick="openPatentChat('${result.patent_number}')">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M2.678 11.894a1 1 0 0 1 .287.801 10.97 10.97 0 0 1-.398 2c1.395-.323 2.247-.697 2.634-.893a1 1 0 0 1 .71-.074A8.06 8.06 0 0 0 8 14c3.996 0 7-2.807 7-6 0-3.192-3.004-6-7-6S1 4.808 1 8c0 1.468.617 2.83 1.678 3.894zm-.493 3.905a21.682 21.682 0 0 1-.713.129c-.2.032-.352-.176-.273-.362a9.68 9.68 0 0 0 .244-.637l.003-.01c.248-.72.45-1.548.524-2.319C.743 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7-3.582 7-8 7a9.06 9.06 0 0 1-2.347-.306c-.52.263-1.639.742-3.468 1.105z"/>
                </svg>
                问一问
            </button>
        </div>
    `;
    
    // 基本信息
    htmlContent += `<div style="margin-bottom: 15px;">`;
    
    const fields = [
        { label: '📄 摘要', value: data.abstract, type: 'text', key: 'abstract' },
        { label: '👤 发明人', value: data.inventors && data.inventors.length > 0 ? data.inventors.join(', ') : null, type: 'text', key: 'inventors' },
        { label: '🏢 申请人', value: data.assignees && data.assignees.length > 0 ? data.assignees.join(', ') : null, type: 'text', key: 'assignees' },
        { label: '📅 申请日期', value: data.application_date, type: 'text', key: 'application_date' },
        { label: '📅 公开日期', value: data.publication_date, type: 'text', key: 'publication_date' },
        { label: '🔗 专利链接', value: result.url, type: 'url', key: 'url' }
    ];
    
    fields.forEach(field => {
        if (field.value) {
            if (field.type === 'url') {
                htmlContent += `
                    <p style="margin-bottom: 10px; font-family: 'Noto Sans SC', Arial, sans-serif;">
                        <strong style="color: var(--primary-color);">${field.label}:</strong>
                        <button class="copy-field-btn" onclick="copyFieldContent('${result.patent_number}', '${field.key}', event)" title="复制${field.label}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>
                        </button>
                        <br/>
                        <a href="${field.value}" target="_blank" style="color: var(--primary-color); text-decoration: underline;">${field.value}</a>
                    </p>
                `;
            } else {
                htmlContent += `
                    <p style="margin-bottom: 10px; font-family: 'Noto Sans SC', Arial, sans-serif;">
                        <strong style="color: var(--primary-color);">${field.label}:</strong>
                        <button class="copy-field-btn" onclick="copyFieldContent('${result.patent_number}', '${field.key}', event)" title="复制${field.label}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>
                        </button>
                        <br/>
                        <span style="line-height: 1.6;">${field.value}</span>
                    </p>
                `;
            }
        }
    });
    
    // 批量解读结果
    const analysisResult = analysisResults.find(item => item.patent_number === result.patent_number);
    if (analysisResult) {
        let analysisJson = {};
        let displayContent = '';
        try {
            // 尝试清理可能的markdown代码块标记
            let cleanContent = analysisResult.analysis_content.trim();
            if (cleanContent.startsWith('```json')) {
                cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleanContent.startsWith('```')) {
                cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            
            analysisJson = JSON.parse(cleanContent);
            
            // 动态生成表格内容
            let tableRows = '';
            Object.keys(analysisJson).forEach(key => {
                const value = analysisJson[key];
                const displayValue = typeof value === 'string' ? value.replace(/\n/g, '<br>') : value;
                tableRows += `<tr><td style="border: 1px solid #ddd; padding: 8px;">${key}</td><td style="border: 1px solid #ddd; padding: 8px;">${displayValue}</td></tr>`;
            });
            
            displayContent = `
                <div class="analysis-content">
                    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                        <tr><th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">字段</th><th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">内容</th></tr>
                        ${tableRows}
                    </table>
                </div>
            `;
        } catch (e) {
            console.error('JSON解析失败:', e);
            // 如果不是JSON格式，显示原始内容
            displayContent = `
                <div class="analysis-content">
                    <div style="padding: 10px; background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; margin-bottom: 10px;">
                        ⚠️ 解读结果未能解析为结构化格式，显示原始内容：
                    </div>
                    <div style="white-space: pre-wrap; font-family: monospace; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">
                        ${analysisResult.analysis_content}
                    </div>
                </div>
            `;
        }
        
        htmlContent += `
            <div style="margin-top: 15px; padding: 10px; background-color: #e3f2fd; border-radius: 5px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div>
                        <strong style="color: var(--primary-color);">🤖 批量解读结果:</strong>
                    </div>
                </div>
                <div class="ai-disclaimer compact">
                    <div class="ai-disclaimer-icon">AI</div>
                    <div class="ai-disclaimer-text"><strong>AI生成：</strong>以下解读由AI生成，仅供参考</div>
                </div>
                ${displayContent}
            </div>
        `;
    }
    
    // 权利要求
    if (data.claims && data.claims.length > 0) {
        htmlContent += `
            <div style="margin-top: 15px; padding: 10px; background-color: #f8f9fa; border-radius: 5px;">
                <div style="margin-bottom: 8px;">
                    <strong style="color: var(--primary-color);">⚖️ 权利要求 (共${data.claims.length}条):</strong>
                    <button class="copy-field-btn" onclick="copyFieldContent('${result.patent_number}', 'claims', event)" title="复制所有权利要求">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>
                    </button>
                </div>
                <div id="claims_${result.patent_number}" class="claims-container">
        `;
        
        data.claims.forEach((claim, index) => {
            htmlContent += `
                <div class="claim-item" id="claim_${result.patent_number}_${index}">
                    <strong>权利要求 ${index + 1}:</strong><br/>
                    ${claim}
                </div>
            `;
        });
        
        htmlContent += `</div></div>`;
    }
    
    // 说明书
    if (data.description) {
        htmlContent += `
            <div style="margin-top: 15px; padding: 10px; background-color: #f0f8ff; border-radius: 5px;">
                <div style="margin-bottom: 8px;">
                    <strong style="color: var(--primary-color);">📝 说明书:</strong>
                    <button class="copy-field-btn" onclick="copyFieldContent('${result.patent_number}', 'description', event)" title="复制说明书">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>
                    </button>
                </div>
                <div style="margin-top: 8px; font-size: 0.9em; line-height: 1.6; max-height: 300px; overflow-y: auto;">
                    ${data.description}
                </div>
            </div>
        `;
    }
    
    // 引用专利
    if (data.patent_citations && data.patent_citations.length > 0) {
        htmlContent += `
            <div style="margin-top: 15px; padding: 10px; background-color: #e8f5e9; border-radius: 5px;">
                <div style="margin-bottom: 8px;">
                    <strong style="color: var(--primary-color);">📚 引用专利 (共${data.patent_citations.length}条):</strong>
                    <button class="copy-field-btn" onclick="copyFieldContent('${result.patent_number}', 'patent_citations', event)" title="复制引用专利">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>
                    </button>
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
    
    // 被引用专利
    if (data.cited_by && data.cited_by.length > 0) {
        htmlContent += `
            <div style="margin-top: 15px; padding: 10px; background-color: #fff3e0; border-radius: 5px;">
                <div style="margin-bottom: 8px;">
                    <strong style="color: var(--primary-color);">🔗 被引用专利 (共${data.cited_by.length}条):</strong>
                    <button class="copy-field-btn" onclick="copyFieldContent('${result.patent_number}', 'cited_by', event)" title="复制被引用专利">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>
                    </button>
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
    
    // 法律事件
    if (data.legal_events && data.legal_events.length > 0) {
        htmlContent += `
            <div style="margin-top: 15px; padding: 10px; background-color: #f3e5f5; border-radius: 5px;">
                <div style="margin-bottom: 8px;">
                    <strong style="color: var(--primary-color);">⚖️ 法律事件 (共${data.legal_events.length}条):</strong>
                    <button class="copy-field-btn" onclick="copyFieldContent('${result.patent_number}', 'legal_events', event)" title="复制法律事件">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>
                    </button>
                </div>
                <div style="max-height: 200px; overflow-y: auto;">
                    <table style="width: 100%; font-size: 0.85em; border-collapse: collapse;">
                        <thead>
                            <tr style="background-color: #e1bee7;">
                                <th style="padding: 5px; text-align: left; border: 1px solid #ddd; width: 120px;">日期</th>
                                <th style="padding: 5px; text-align: left; border: 1px solid #ddd; width: 80px;">代码</th>
                                <th style="padding: 5px; text-align: left; border: 1px solid #ddd;">事件描述</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        data.legal_events.forEach(event => {
            htmlContent += `
                <tr>
                    <td style="padding: 5px; border: 1px solid #ddd;">${event.date}</td>
                    <td style="padding: 5px; border: 1px solid #ddd;">${event.code || '-'}</td>
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
    
    // 相似文档
    if (data.similar_documents && data.similar_documents.length > 0) {
        htmlContent += `
            <div style="margin-top: 15px; padding: 10px; background-color: #e8f5e9; border-radius: 5px;">
                <div style="margin-bottom: 8px;">
                    <strong style="color: var(--primary-color);">📋 相似文档 (共${data.similar_documents.length}条):</strong>
                </div>
                <div style="max-height: 200px; overflow-y: auto;">
                    <table style="width: 100%; font-size: 0.85em; border-collapse: collapse;">
                        <thead>
                            <tr style="background-color: #c8e6c9;">
                                <th style="padding: 5px; text-align: left; border: 1px solid #ddd;">专利号</th>
                                <th style="padding: 5px; text-align: left; border: 1px solid #ddd; width: 80px;">语言</th>
                                <th style="padding: 5px; text-align: left; border: 1px solid #ddd; width: 80px;">操作</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        data.similar_documents.forEach(doc => {
            htmlContent += `
                <tr>
                    <td style="padding: 5px; border: 1px solid #ddd;">${doc.patent_number}</td>
                    <td style="padding: 5px; border: 1px solid #ddd;">${doc.language || '-'}</td>
                    <td style="padding: 5px; border: 1px solid #ddd;">
                        <a href="${doc.link}" target="_blank" style="color: var(--primary-color); text-decoration: underline;">查看</a>
                    </td>
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
    
    // 调试信息
    htmlContent += `
        <div style="margin-top: 15px; padding: 10px; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px;">
            <h5>调试信息：</h5>
            <pre>引用专利数量: ${data.patent_citations ? data.patent_citations.length : 0}</pre>
            <pre>法律事件数量: ${data.legal_events ? data.legal_events.length : 0}</pre>
            <pre>相似文档数量: ${data.similar_documents ? data.similar_documents.length : 0}</pre>
            <pre>是否有法律事件数据: ${data.legal_events ? '是' : '否'}</pre>
            <pre>是否有相似文档数据: ${data.similar_documents ? '是' : '否'}</pre>
        </div>
    `;
    
    // 操作按钮
    htmlContent += `
        <div style="margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
            <a href="${result.url}" target="_blank" class="small-button" style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1.002 1.002 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4.018 4.018 0 0 1-.128-1.287z"/>
                    <path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243L6.586 4.672z"/>
                </svg>
                查看原始专利
            </a>
            <button class="small-button" onclick="copyPatentInfo('${result.patent_number}')" style="background-color: #28a745; display: inline-flex; align-items: center; gap: 6px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                    <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                </svg>
                复制信息
            </button>
        </div>
    `;
    
    return htmlContent;
}}
