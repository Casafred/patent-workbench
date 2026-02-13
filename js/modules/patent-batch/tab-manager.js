    async analyzeAllPatents(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) {
            alert('标签页不存在');
            return;
        }

        // 获取成功的结果
        const successfulResults = tab.results.filter(r => r.success);
        if (successfulResults.length === 0) {
            alert('没有可解读的专利');
            return;
        }

        // 获取当前模板，如果没有则尝试加载默认模板
        let template = window.appState?.patentBatch?.currentTemplate;
        if (!template) {
            // 尝试加载默认模板
            if (typeof loadTemplate === 'function') {
                console.log('🔄 没有当前模板，尝试加载默认模板...');
                loadTemplate('default');
                template = window.appState?.patentBatch?.currentTemplate;
            }
            
            // 如果仍然没有模板，提示用户
            if (!template) {
                alert('请先选择解读模板');
                return;
            }
        }

        // 获取是否包含说明书的选项
        const includeSpecification = document.getElementById('include_specification_checkbox')?.checked || false;

        // 获取选择的模型
        const selectedModel = document.getElementById('patent_batch_model_selector')?.value || 'GLM-4-Flash';

        // 禁用按钮
        const analyzeBtn = document.getElementById(`${tabId}_analyze_btn`);
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
            analyzeBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="rotating">
                    <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/>
                    <path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/>
                </svg>
                解读中...
            `;
        }

        // 获取解读结果列表容器
        const analysisResultsList = document.getElementById('analysis_results_list');
        if (analysisResultsList) {
            analysisResultsList.innerHTML = '';
        }
        
        // 清空之前的解读结果
        window.patentBatchAnalysisResults = [];
        
        // 显示解读状态
        const searchStatus = document.getElementById('search_status');
        if (searchStatus) {
            searchStatus.textContent = `正在使用"${template.name}"模板解读 ${successfulResults.length} 个专利...`;
            searchStatus.style.display = 'block';
        }
        
        // 创建一个Map来存储解读结果，key是专利号
        const analysisResultsMap = new Map();

        // 逐个解读专利
        for (let i = 0; i < successfulResults.length; i++) {
            const result = successfulResults[i];
            const patentNumber = result.patent_number;

            // 更新状态
            if (searchStatus) {
                searchStatus.textContent = `正在解读: ${patentNumber} (${i + 1}/${successfulResults.length})`;
            }

            // 创建占位符（按用户输入顺序）
            const placeholderId = `analysis_placeholder_${patentNumber}`;
            if (!document.getElementById(placeholderId) && analysisResultsList) {
                const placeholder = document.createElement('div');
                placeholder.id = placeholderId;
                placeholder.className = 'result-item';
                placeholder.innerHTML = `<h5>正在解读专利：${patentNumber} (${i + 1}/${successfulResults.length})</h5>`;
                analysisResultsList.appendChild(placeholder);
            }

            try {
                // 构建用户提示词
                const userPrompt = buildAnalysisPrompt(template, result.data, includeSpecification);
                
                // 调用解读API（使用统一的apiCall函数）
                const analysisResult = await apiCall('/patent/analyze', {
                    patent_data: result.data,
                    template: {
                        fields: template.fields,
                        system_prompt: template.systemPrompt
                    },
                    user_prompt: userPrompt,
                    include_specification: includeSpecification,
                    model: selectedModel
                });

                // 解析解读结果
                const analysisContent = analysisResult.choices?.[0]?.message?.content || analysisResult.analysis || analysisResult.result || '无解读结果';
                
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
                        tableRows += `<tr><td style="border: 1px solid #ddd; padding: 8px; font-weight: 500;">${field.name}</td><td style="border: 1px solid #ddd; padding: 8px;">${displayValue}</td></tr>`;
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
                        <h5>专利 ${patentNumber} 解读结果</h5>
                        <div class="ai-disclaimer compact">
                            <div class="ai-disclaimer-icon">AI</div>
                            <div class="ai-disclaimer-text"><strong>AI生成：</strong>以下解读由AI生成，仅供参考</div>
                        </div>
                        ${displayContent}
                    `;
                }
                
                // 存储解读结果到Map
                analysisResultsMap.set(patentNumber, {
                    patent_number: patentNumber,
                    patent_data: result.data,
                    analysis_content: analysisContent
                });

            } catch (error) {
                console.error(`解读专利 ${patentNumber} 失败:`, error);
                
                // 更新占位符显示错误
                const placeholder = document.getElementById(placeholderId);
                if (placeholder) {
                    placeholder.innerHTML = `
                        <h5>专利 ${patentNumber} 解读失败</h5>
                        <div style="color: #721c24; background: #f8d7da; padding: 10px; border-radius: 4px;">
                            ❌ 解读失败: ${error.message}
                        </div>
                    `;
                }
            }
        }
        
        // 按照用户输入的顺序重新组织 analysisResults 数组
        window.patentBatchAnalysisResults = [];
        window.patentResults.forEach(result => {
            if (result.success && analysisResultsMap.has(result.patent_number)) {
                window.patentBatchAnalysisResults.push(analysisResultsMap.get(result.patent_number));
            }
        });
        
        // 更新状态
        if (searchStatus) {
            searchStatus.textContent = `解读完成，共解读 ${successfulResults.length} 个专利`;
        }
        
        // 启用导出按钮
        const exportAnalysisExcelBtn = document.getElementById('export_analysis_excel_btn');
        if (exportAnalysisExcelBtn) {
            exportAnalysisExcelBtn.disabled = false;
        }

        // 恢复按钮
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                </svg>
                批量解读
            `;
        }
    }
