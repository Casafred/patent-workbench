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
        apiKeyToggleVisibilityBtn.textContent = isPassword ? '🙈' : '👁️';
    });
    apiKeyCopyBtn.addEventListener('click', () => {
        if (!globalApiKeyInput.value) return;
        navigator.clipboard.writeText(globalApiKeyInput.value).then(() => {
            apiKeyCopyBtn.textContent = '✅';
            setTimeout(() => { apiKeyCopyBtn.textContent = '📋'; }, 1500);
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
    const progressBar = stepper.querySelector('.progress-bar');
    const activeIndex = steps.indexOf(activeStepElement);

    if (activeIndex === -1) return;

    steps.forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index < activeIndex) {
            step.classList.add('completed');
        } else if (index === activeIndex) {
            step.classList.add('active');
        }
    });

    if (progressBar) {
        const totalSteps = steps.length;
        if (totalSteps > 1) {
            progressBar.style.width = `${(activeIndex / (totalSteps - 1)) * 100}%`;
        } else {
            progressBar.style.width = '0px';
        }
    }
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
    const searchStatus = getEl('search_status');
    const patentResultsList = getEl('patent_results_list');
    const analysisResultsList = getEl('analysis_results_list');
    
    // 存储专利查询结果
    let patentResults = [];
    
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
        patentResultsList.innerHTML = '';
        analysisResultsList.innerHTML = '';
        searchStatus.style.display = 'none';
    });
    
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
        
        // 清空之前的结果
        patentResultsList.innerHTML = '';
        analysisResultsList.innerHTML = '';
        analyzeAllBtn.disabled = true;
        
        // 显示查询状态
        searchStatus.textContent = `正在查询 ${uniquePatents.length} 个专利...`;
        searchStatus.style.display = 'block';
        
        try {
            // 调用API查询专利
            const results = await apiCall('/patent/search', {
                patent_numbers: uniquePatents
            });
            
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
            console.error('专利查询失败:', error);
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
        
        // 清空之前的解读结果
        analysisResultsList.innerHTML = '';
        
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
                    patent_data: patent.data
                });
                
                // 更新解读结果
                const analysisContent = analysisResult.choices[0]?.message?.content || '解读失败';
                resultItem.innerHTML = `
                    <h5>专利 ${patent.patent_number} 解读结果</h5>
                    <div class="analysis-content">${marked.parse(analysisContent)}</div>
                `;
            }
            
            // 更新状态
            searchStatus.textContent = `解读完成，共解读 ${successfulResults.length} 个专利`;
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
            
            if (result.success) {
                const data = result.data;
                
                // 构建完整的专利信息显示
                let htmlContent = `
                    <div style="border-bottom: 2px solid var(--primary-color); padding-bottom: 10px; margin-bottom: 15px;">
                        <h5 style="color: var(--primary-color); margin-bottom: 5px;">
                            ${result.patent_number} - ${data.title || '无标题'}
                        </h5>
                        <div style="font-size: 0.9em; color: #666;">
                            查询耗时: ${result.processing_time?.toFixed(2) || 'N/A'}秒
                        </div>
                    </div>
                `;
                
                // 基本信息
                htmlContent += `<div style="margin-bottom: 15px;">`;
                
                if (data.abstract) {
                    htmlContent += `
                        <p style="margin-bottom: 10px;">
                            <strong style="color: var(--primary-color);">📄 摘要:</strong><br/>
                            <span style="line-height: 1.6;">${data.abstract}</span>
                        </p>
                    `;
                }
                
                // 发明人信息
                if (data.inventors && data.inventors.length > 0) {
                    htmlContent += `
                        <p style="margin-bottom: 8px;">
                            <strong style="color: var(--primary-color);">👤 发明人:</strong> 
                            ${data.inventors.join(', ')}
                        </p>
                    `;
                }
                
                // 受让人信息
                if (data.assignees && data.assignees.length > 0) {
                    htmlContent += `
                        <p style="margin-bottom: 8px;">
                            <strong style="color: var(--primary-color);">🏢 受让人:</strong> 
                            ${data.assignees.join(', ')}
                        </p>
                    `;
                }
                
                // 日期信息
                htmlContent += `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">`;
                
                if (data.application_date) {
                    htmlContent += `
                        <p style="margin: 0;">
                            <strong style="color: var(--primary-color);">📅 申请日期:</strong><br/>
                            ${data.application_date}
                        </p>
                    `;
                }
                
                if (data.publication_date) {
                    htmlContent += `
                        <p style="margin: 0;">
                            <strong style="color: var(--primary-color);">📅 公开日期:</strong><br/>
                            ${data.publication_date}
                        </p>
                    `;
                }
                
                htmlContent += `</div>`;
                
                // 权利要求
                if (data.claims && data.claims.length > 0) {
                    const claimsPreview = data.claims.slice(0, 3); // 只显示前3条
                    const hasMore = data.claims.length > 3;
                    
                    htmlContent += `
                        <div style="margin-top: 15px; padding: 10px; background-color: #f8f9fa; border-radius: 5px;">
                            <strong style="color: var(--primary-color);">⚖️ 权利要求 (共${data.claims.length}条):</strong>
                            <div style="margin-top: 8px; max-height: 200px; overflow-y: auto;">
                    `;
                    
                    claimsPreview.forEach((claim, index) => {
                        htmlContent += `
                            <div style="margin-bottom: 8px; padding: 8px; background-color: white; border-radius: 3px; font-size: 0.9em;">
                                <strong>权利要求 ${index + 1}:</strong><br/>
                                ${claim.substring(0, 200)}${claim.length > 200 ? '...' : ''}
                            </div>
                        `;
                    });
                    
                    if (hasMore) {
                        htmlContent += `
                            <div style="text-align: center; margin-top: 8px; color: #666; font-size: 0.9em;">
                                还有 ${data.claims.length - 3} 条权利要求未显示
                            </div>
                        `;
                    }
                    
                    htmlContent += `</div></div>`;
                }
                
                // 说明书描述
                if (data.description) {
                    const descPreview = data.description.substring(0, 300);
                    htmlContent += `
                        <div style="margin-top: 15px; padding: 10px; background-color: #f0f8ff; border-radius: 5px;">
                            <strong style="color: var(--primary-color);">📝 说明书摘录:</strong>
                            <div style="margin-top: 8px; font-size: 0.9em; line-height: 1.6;">
                                ${descPreview}${data.description.length > 300 ? '...' : ''}
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
                    <h5 style="color: red;">❌ ${result.patent_number} - 查询失败</h5>
                    <p style="padding: 10px; background-color: #fff3cd; border-radius: 5px; border-left: 4px solid #ffc107;">
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
        
        text += `\n原始链接: ${result.url}\n`;
        
        navigator.clipboard.writeText(text)
            .then(() => alert('✅ 专利信息已复制到剪贴板！'))
            .catch(() => alert('❌ 复制失败，请手动复制。'));
    }
}
