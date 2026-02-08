// js/claimsComparison.js (v3.0 - 全面优化版本)

/**
 * 功能五：权利要求对比功能
 * 支持2-4个权利要求的智能对比
 * 提供多种可视化展示方式
 */

// DOM元素引用（注意：部分元素已在dom.js中声明）
let comparisonModelSelect, addClaimBtn, claimsInputContainer, claimsCountDisplay;
let viewModeBtns, exportComparisonBtn;
let comparisonStatsPanel;
let statSimilar, statDifferent, statSimilarity;
let couplingSelector, couplingAnalyzeBtn;

/**
 * 初始化功能五
 */
function initClaimsComparison() {
    // 获取DOM元素（使用dom.js中已声明的全局变量）
    comparisonModelSelect = document.getElementById('comparison_model_select');
    addClaimBtn = document.getElementById('add_claim_btn');
    claimsInputContainer = document.getElementById('claims_input_container');
    claimsCountDisplay = document.getElementById('claims_count_display');
    // claimsAnalyzeBtn 已在 dom.js 中声明
    viewModeBtns = document.querySelectorAll('.view-btn');
    // toggleLanguageBtn 已在 dom.js 中声明
    exportComparisonBtn = document.getElementById('export_comparison_btn');
    comparisonStatsPanel = document.getElementById('comparison_stats_panel');
    // comparisonResultContainer 使用 dom.js 中的 comparisonResultContainerRefactored
    statSimilar = document.getElementById('stat_similar');
    statDifferent = document.getElementById('stat_different');
    statSimilarity = document.getElementById('stat_similarity');
    couplingSelector = document.getElementById('coupling_selector');
    couplingAnalyzeBtn = document.getElementById('coupling_analyze_btn');

    // Check if required elements exist
    if (!comparisonModelSelect) {
        console.error('❌ comparison_model_select element not found');
        return;
    }
    
    if (!addClaimBtn) {
        console.error('❌ add_claim_btn element not found');
        return;
    }
    
    if (!claimsInputContainer) {
        console.error('❌ claims_input_container element not found');
        return;
    }

    // 绑定事件
    comparisonModelSelect.addEventListener('change', handleModelChange);
    addClaimBtn.addEventListener('click', addNewClaim);
    
    if (claimsAnalyzeBtn) {
        claimsAnalyzeBtn.addEventListener('click', runAnalysisWorkflow);
    }
    
    viewModeBtns.forEach(btn => {
        btn.addEventListener('click', () => handleViewModeChange(btn.dataset.view));
    });
    
    if (toggleLanguageBtn) {
        toggleLanguageBtn.addEventListener('click', toggleDisplayLanguage);
    }
    
    if (exportComparisonBtn) {
        exportComparisonBtn.addEventListener('click', exportComparisonReport);
    }
    
    if (couplingAnalyzeBtn) {
        couplingAnalyzeBtn.addEventListener('click', runCouplingAnalysis);
    }

    // 初始化输入区（默认2个）
    renderInputGroups();
    updateCouplingSelector();
    
    // 初始化模型选择器
    initComparisonModelSelector();
    
    // 监听模型配置加载完成事件，确保配置加载后能正确更新
    window.addEventListener('modelsConfigLoaded', (event) => {
        console.log('📡 功能五收到模型配置加载完成事件');
        initComparisonModelSelector();
    });
}

/**
 * 初始化模型选择器
 */
function initComparisonModelSelector() {
    if (!comparisonModelSelect) return;
    
    // 获取可用模型列表（从全局变量或默认值）
    const models = window.AVAILABLE_MODELS || ["glm-4-flash", "glm-4-long", "glm-4.7-flash"];
    
    const currentValue = comparisonModelSelect.value;
    comparisonModelSelect.innerHTML = models.map(m => `<option value="${m}">${m}</option>`).join('');
    
    // 恢复之前的选择或设置默认值
    if (currentValue && models.includes(currentValue)) {
        comparisonModelSelect.value = currentValue;
    } else {
        comparisonModelSelect.value = models[0];
    }
    
    // 触发一次模型说明更新
    handleModelChange();
    
    console.log('✅ 功能五模型选择器已初始化');
}

/**
 * 处理模型切换
 */
function handleModelChange() {
    const model = comparisonModelSelect.value;
    appState.claimsComparison.model = model;
    
    // 更新模型说明
    const descriptions = {
        'GLM-4.7-Flash': '快速模型，适合简单对比，响应速度快',
        'glm-4-flash': '标准模型，平衡速度和质量，适合大多数场景',
        'glm-4-long': '深度模型，适合复杂技术特征的详细对比'
    };
    document.getElementById('model_description').textContent = descriptions[model];
}

/**
 * 添加新的权利要求输入框
 */
function addNewClaim() {
    const currentCount = appState.claimsComparison.claims.length;
    
    if (currentCount >= 10) {
        alert('最多支持10个权利要求对比');
        return;
    }
    
    const newId = currentCount + 1;
    const newLabel = `版本${String.fromCharCode(65 + currentCount)}`; // A, B, C...
    
    appState.claimsComparison.claims.push({
        id: newId,
        label: newLabel,
        fullText: '',
        numbers: '',
        original: '',
        translated: '',
        lang: ''
    });
    
    appState.claimsComparison.comparisonCount = newId;
    
    renderInputGroups();
    updateCouplingSelector();
    updateClaimsCountDisplay();
}

/**
 * 删除权利要求输入框
 */
function removeClaim(id) {
    if (appState.claimsComparison.claims.length <= 2) {
        alert('至少需要保留2个权利要求');
        return;
    }
    
    appState.claimsComparison.claims = appState.claimsComparison.claims.filter(c => c.id !== id);
    appState.claimsComparison.comparisonCount = appState.claimsComparison.claims.length;
    
    // 重新分配ID和标签
    appState.claimsComparison.claims.forEach((claim, index) => {
        claim.id = index + 1;
        claim.label = `版本${String.fromCharCode(65 + index)}`;
    });
    
    renderInputGroups();
    updateCouplingSelector();
    updateClaimsCountDisplay();
}

/**
 * 更新权利要求数量显示
 */
function updateClaimsCountDisplay() {
    const count = appState.claimsComparison.claims.length;
    claimsCountDisplay.textContent = `当前：${count}个`;
    
    // 更新添加按钮状态
    if (count >= 10) {
        addClaimBtn.disabled = true;
    } else {
        addClaimBtn.disabled = false;
    }
}

/**
 * 更新耦合选择器
 */
function updateCouplingSelector() {
    const claims = appState.claimsComparison.claims;
    let html = '';
    
    claims.forEach(claim => {
        html += `
            <label>
                <input type="checkbox" class="coupling-checkbox" data-id="${claim.id}" value="${claim.id}">
                <span>${claim.label}</span>
            </label>
        `;
    });
    
    couplingSelector.innerHTML = html;
    
    // 绑定复选框事件
    const checkboxes = couplingSelector.querySelectorAll('.coupling-checkbox');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', updateCouplingAnalyzeButton);
    });
    
    updateCouplingAnalyzeButton();
}

/**
 * 更新耦合分析按钮状态
 */
function updateCouplingAnalyzeButton() {
    const checked = couplingSelector.querySelectorAll('.coupling-checkbox:checked');
    couplingAnalyzeBtn.disabled = checked.length < 2;
}

/**
 * 处理对比数量切换（保留兼容性）
 */
function handleCountChange(count) {
    // 此函数保留用于向后兼容，实际使用addNewClaim和removeClaim
    console.log('handleCountChange is deprecated, use addNewClaim/removeClaim instead');
}

/**
 * 渲染输入组
 */
function renderInputGroups() {
    const claims = appState.claimsComparison.claims;
    let html = '';
    
    claims.forEach((claim, index) => {
        const showRemoveBtn = claims.length > 2;
        html += `
            <div class="comparison-input-group" data-id="${claim.id}">
                <div class="version-label">
                    <span class="claim-number-badge">#${claim.id} ${claim.label}</span>
                    ${showRemoveBtn ? `<button class="remove-btn" onclick="removeClaim(${claim.id})">删除</button>` : ''}
                </div>
                <textarea 
                    id="claim_text_${claim.id}" 
                    rows="12" 
                    placeholder="在此处粘贴${claim.label}的权利要求全文..."
                >${claim.fullText}</textarea>
                <div class="claim-number-input">
                    <label for="claim_numbers_${claim.id}">独立权利要求序号:</label>
                    <input 
                        type="text" 
                        id="claim_numbers_${claim.id}" 
                        placeholder="用逗号分隔,如: 1,9"
                        value="${claim.numbers}"
                    >
                </div>
            </div>
        `;
    });
    
    claimsInputContainer.innerHTML = html;
    
    // 绑定输入事件
    claims.forEach(claim => {
        const textArea = document.getElementById(`claim_text_${claim.id}`);
        const numbersInput = document.getElementById(`claim_numbers_${claim.id}`);
        
        textArea.addEventListener('input', (e) => {
            claim.fullText = e.target.value;
        });
        
        numbersInput.addEventListener('input', (e) => {
            claim.numbers = e.target.value;
        });
    });
    
    updateClaimsCountDisplay();
}

/**
 * 主工作流函数
 */
async function runAnalysisWorkflow() {
    setLoadingState(true, '开始分析，准备提取文本...');
    
    try {
        // 1. 验证输入
        const claims = appState.claimsComparison.claims;
        for (const claim of claims) {
            if (!claim.fullText || !claim.numbers) {
                throw new Error(`请确保${claim.label}的文本和序号都已填写`);
            }
        }
        
        // 2. 提取权利要求
        setLoadingState(true, '提取权利要求文本...');
        for (const claim of claims) {
            claim.original = extractClaims(claim.fullText, claim.numbers);
            if (!claim.original) {
                throw new Error(`${claim.label}未能提取到有效的独立权利要求`);
            }
        }
        
        // 3. 语言检测
        setLoadingState(true, '检测语言...');
        await detectLanguagesForAll(claims);
        
        // 4. 智能翻译
        setLoadingState(true, '翻译非中文文本...');
        await translateClaimsIfNeeded(claims);
        
        // 5. 执行对比分析
        setLoadingState(true, '执行对比分析...');
        const result = await performMultiComparison(claims);
        appState.claimsComparison.analysisResult = result;
        
        // 6. 渲染结果
        renderResults();
        
        // 7. 显示控制按钮
        toggleLanguageBtn.style.display = 'inline-block';
        exportComparisonBtn.style.display = 'inline-block';
        comparisonStatsPanel.style.display = 'flex';
        
        setLoadingState(false);
        
    } catch (error) {
        console.error("分析工作流失败:", error);
        setLoadingState(false, '', `分析失败: ${error.message}`);
    }
}

/**
 * 从完整文本中提取权利要求
 */
function extractClaims(fullText, numbersStr) {
    const standardizedStr = numbersStr.replace(/[\s，；;、]/g, ',');
    const targetNumbers = new Set(standardizedStr.split(',')
        .map(n => parseInt(n.trim()))
        .filter(n => !isNaN(n) && n > 0)
    );
    
    if (targetNumbers.size === 0) return "";
    
    const extractedClaims = [];
    const claimBlocks = fullText.split(/\n(?=\d+\s*[.\s、])/).map(s => s.trim());
    
    for (const block of claimBlocks) {
        if (!block) continue;
        const match = block.match(/^(\d+)/);
        if (match && targetNumbers.has(parseInt(match[1]))) {
            extractedClaims.push(block);
        }
    }
    
    return extractedClaims.length > 0 ? extractedClaims.join('\n\n---\n\n') : "";
}

/**
 * 检测所有权利要求的语言
 */
async function detectLanguagesForAll(claims) {
    const textsForDetection = claims.map(c => c.original.slice(0, 200)).join('\n\n');
    
    const prompt = `You are a language detection expert. For the ${claims.length} texts provided below (separated by blank lines), identify their primary language. Respond ONLY with a JSON array.

${textsForDetection}

Your JSON output must be in the format: ["language1", "language2", ...]`;
    
    const response = await apiCall('/chat', {
        model: appState.claimsComparison.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.0,
    });
    
    const rawContent = response.choices[0].message.content;
    const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) {
        throw new Error('语言检测失败');
    }
    
    const languages = JSON.parse(jsonMatch[0]);
    claims.forEach((claim, index) => {
        claim.lang = languages[index] || 'Unknown';
    });
}

/**
 * 翻译需要翻译的权利要求
 */
async function translateClaimsIfNeeded(claims) {
    for (const claim of claims) {
        if (claim.lang !== 'Chinese') {
            const prompt = `Please translate the following patent claim text into professional, accurate Chinese. Only return the translated text.

${claim.original}`;
            
            const response = await apiCall('/chat', {
                model: appState.claimsComparison.model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.0,
            });
            
            claim.translated = response.choices[0].message.content.trim();
        } else {
            claim.translated = claim.original;
        }
    }
}

/**
 * 执行多权利要求对比
 */
async function performMultiComparison(claims) {
    const claimsText = claims.map((c, i) => 
        `<CLAIM_${i + 1} LABEL="${c.label}">\n${c.translated}\n</CLAIM_${i + 1}>`
    ).join('\n\n');
    
    const system_prompt = `You are a world-class patent comparison AI. Your task is to compare multiple independent claims and generate a structured JSON analysis. All analytical text must be in Chinese.`;
    
    const user_prompt = `
<TASK>
Compare the following ${claims.length} independent claims and output a JSON object with pairwise comparisons.
</TASK>

<INPUT_CLAIMS>
${claimsText}
</INPUT_CLAIMS>

<OUTPUT_SCHEMA>
{
  "comparison_matrix": [
    {
      "claim_pair": ["版本A", "版本B"],
      "similarity_score": 0.75,
      "similar_features": [
        {"feature": "共同特征描述"}
      ],
      "different_features": [
        {
          "claim_1_feature": "版本A的特征",
          "claim_2_feature": "版本B的特征",
          "analysis": "差异分析（中文）"
        }
      ]
    }
  ],
  "overall_summary": "整体对比总结（中文）"
}
</OUTPUT_SCHEMA>

<INSTRUCTIONS>
1. Generate pairwise comparisons for all claim combinations
2. Calculate similarity scores (0-1)
3. Identify similar and different features
4. Provide analysis in Chinese
5. Return only the JSON object
</INSTRUCTIONS>
`;
    
    const response = await apiCall('/chat', {
        model: appState.claimsComparison.model,
        messages: [
            { role: 'system', content: system_prompt },
            { role: 'user', content: user_prompt }
        ],
        temperature: 0.1,
    });
    
    const rawContent = response.choices[0].message.content;
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
        throw new Error('对比分析失败，模型未返回有效JSON');
    }
    
    return JSON.parse(jsonMatch[0]);
}

/**
 * 渲染结果
 */
function renderResults() {
    const viewMode = appState.claimsComparison.viewMode;
    
    switch (viewMode) {
        case 'card':
            renderCardView();
            break;
        case 'sideBySide':
            renderSideBySideView();
            break;
        case 'matrix':
            renderMatrixView();
            break;
    }
    
    // 更新统计面板
    updateStatsPanel();
}

/**
 * 渲染卡片视图
 */
function renderCardView() {
    const data = appState.claimsComparison.analysisResult;
    if (!data || !data.comparison_matrix) {
        comparisonResultContainerRefactored.innerHTML = '<div class="info error">无对比数据</div>';
        return;
    }
    
    // 添加AI生成声明
    const disclaimer = createAIDisclaimer('default', '<strong>AI生成内容：</strong>以下对比分析由AI生成，仅供参考，请结合实际情况判断使用。');
    comparisonResultContainerRefactored.innerHTML = '';
    comparisonResultContainerRefactored.appendChild(disclaimer);
    
    let html = '';
    
    data.comparison_matrix.forEach(pair => {
        const similarityPercent = Math.round(pair.similarity_score * 100);
        html += `
            <div class="comparison-card">
                <div class="comparison-card-header">
                    <h3>${pair.claim_pair[0]} vs ${pair.claim_pair[1]}</h3>
                    <span class="similarity-badge">相似度: ${similarityPercent}%</span>
                </div>
                <div class="comparison-card-body">
                    <div class="comparison-section-v2">
                        <h4><span class="icon-match">✅</span> 相同特征</h4>
                        <table class="features-table">
                            <tbody>
                                ${pair.similar_features && pair.similar_features.length > 0 ?
                                  pair.similar_features.map(item => `
                                    <tr class="similar-row">
                                        <td>${item.feature}</td>
                                    </tr>
                                  `).join('') :
                                  '<tr><td class="no-data">无完全相同的技术特征</td></tr>'
                                }
                            </tbody>
                        </table>
                    </div>
                    <div class="comparison-section-v2">
                        <h4><span class="icon-diff">⚠️</span> 差异特征</h4>
                        <table class="features-table diff-table">
                            <thead>
                                <tr>
                                    <th>${pair.claim_pair[0]}</th>
                                    <th>${pair.claim_pair[1]}</th>
                                    <th>差异分析</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${pair.different_features && pair.different_features.length > 0 ?
                                  pair.different_features.map(item => `
                                    <tr class="different-row">
                                        <td>${item.claim_1_feature}</td>
                                        <td>${item.claim_2_feature}</td>
                                        <td class="analysis-cell">${item.analysis}</td>
                                    </tr>
                                  `).join('') :
                                  '<tr><td colspan="3" class="no-data">未发现显著差异</td></tr>'
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    });
    
    if (data.overall_summary) {
        html += `
            <div class="comparison-card">
                <div class="comparison-card-header">
                    <h3>整体对比总结</h3>
                </div>
                <div class="comparison-card-body">
                    <p>${data.overall_summary}</p>
                </div>
            </div>
        `;
    }
    
    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = html;
    comparisonResultContainerRefactored.appendChild(contentDiv);
}

/**
 * 渲染并排视图
 */
function renderSideBySideView() {
    const claims = appState.claimsComparison.claims;
    
    let html = '<div class="side-by-side-view">';
    html += '<div class="side-by-side-header">';
    claims.forEach(claim => {
        html += `<div class="claim-label">${claim.label}</div>`;
    });
    html += '</div>';
    
    html += '<div class="side-by-side-body" id="side-by-side-container">';
    claims.forEach((claim, index) => {
        // 格式化文本：确保每个权利要求以序号开头并换行
        const formattedText = formatClaimTextForDisplay(claim.translated);
        html += `<div class="claim-text-column" data-column="${index}">${formattedText}</div>`;
    });
    html += '</div>';
    html += '</div>';
    
    comparisonResultContainerRefactored.innerHTML = html;
    
    // 添加同步滚动功能
    setupSyncScroll();
}

/**
 * 设置同步滚动
 */
function setupSyncScroll() {
    const container = document.getElementById('side-by-side-container');
    if (!container) return;
    
    const columns = container.querySelectorAll('.claim-text-column');
    if (columns.length === 0) return;
    
    let isScrolling = false;
    
    columns.forEach(column => {
        column.addEventListener('scroll', function() {
            if (isScrolling) return;
            
            isScrolling = true;
            const scrollPercentage = this.scrollTop / (this.scrollHeight - this.clientHeight);
            
            columns.forEach(otherColumn => {
                if (otherColumn !== this) {
                    const targetScroll = scrollPercentage * (otherColumn.scrollHeight - otherColumn.clientHeight);
                    otherColumn.scrollTop = targetScroll;
                }
            });
            
            setTimeout(() => {
                isScrolling = false;
            }, 50);
        });
    });
}

/**
 * 格式化权利要求文本以便于对照阅读
 * 将文本按权利要求序号分段，每段以序号开头并换行
 */
function formatClaimTextForDisplay(text) {
    if (!text) return '';
    
    // 按权利要求分隔符分割（支持多种格式）
    // 匹配模式：数字 + 点/句号/顿号 + 可选空格
    const claimPattern = /(\d+\s*[.、．]\s*)/g;
    
    // 先按分隔符 --- 分割（如果有多个独立权利要求）
    const sections = text.split(/\n*---\n*/);
    
    let formattedSections = sections.map(section => {
        // 为每个section添加序号和换行
        let formatted = section.trim();
        
        // 如果文本不是以序号开头，尝试添加
        if (!/^\d+\s*[.、．]/.test(formatted)) {
            return formatted;
        }
        
        // 将长段落按句子分割，便于阅读
        // 在中文句号、分号、冒号后添加换行
        formatted = formatted.replace(/([；;：:])/g, '$1\n');
        
        // 在"其特征在于"、"包括"等关键词后换行
        formatted = formatted.replace(/(其特征在于[，,]?|包括[：:]?|comprising[：:]?|characterized in that[，,]?)/gi, '$1\n');
        
        return formatted;
    }).join('\n\n---\n\n');
    
    return formattedSections;
}

/**
 * 渲染矩阵视图
 */
function renderMatrixView() {
    const data = appState.claimsComparison.analysisResult;
    const claims = appState.claimsComparison.claims;
    
    if (!data || !data.comparison_matrix) {
        comparisonResultContainerRefactored.innerHTML = '<div class="info error">无对比数据</div>';
        return;
    }
    
    // 构建相似度矩阵
    const matrix = {};
    data.comparison_matrix.forEach(pair => {
        const key = `${pair.claim_pair[0]}-${pair.claim_pair[1]}`;
        matrix[key] = {
            score: pair.similarity_score,
            data: pair
        };
    });
    
    let html = '<div class="matrix-view"><table class="matrix-table">';
    html += '<thead><tr><th></th>';
    claims.forEach(claim => {
        html += `<th>${claim.label}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    claims.forEach((claim1, i) => {
        html += `<tr><th>${claim1.label}</th>`;
        claims.forEach((claim2, j) => {
            if (i === j) {
                html += '<td class="matrix-cell matrix-cell-self">-</td>';
            } else {
                const key1 = `${claim1.label}-${claim2.label}`;
                const key2 = `${claim2.label}-${claim1.label}`;
                const matrixData = matrix[key1] || matrix[key2];
                const score = matrixData ? matrixData.score : 0;
                const percent = Math.round(score * 100);
                const cellClass = score > 0.7 ? 'matrix-cell-high' : 
                                 score > 0.4 ? 'matrix-cell-medium' : 'matrix-cell-low';
                html += `<td class="matrix-cell ${cellClass}" data-pair="${key1}" onclick="jumpToCardView('${key1}')">${percent}%</td>`;
            }
        });
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    comparisonResultContainerRefactored.innerHTML = html;
}

/**
 * 从矩阵视图跳转到卡片视图的对应对比
 */
function jumpToCardView(pairKey) {
    // 切换到卡片视图
    appState.claimsComparison.viewMode = 'card';
    viewModeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === 'card');
    });
    
    // 渲染卡片视图
    renderCardView();
    
    // 滚动到对应的卡片
    setTimeout(() => {
        const cards = document.querySelectorAll('.comparison-card');
        for (let card of cards) {
            const header = card.querySelector('.comparison-card-header h3');
            if (header && header.textContent.includes(pairKey.replace('-', ' vs '))) {
                card.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // 高亮显示
                card.style.boxShadow = '0 0 20px rgba(74, 108, 247, 0.5)';
                setTimeout(() => {
                    card.style.boxShadow = '';
                }, 2000);
                break;
            }
        }
    }, 100);
}

/**
 * 更新统计面板
 */
function updateStatsPanel() {
    const data = appState.claimsComparison.analysisResult;
    if (!data || !data.comparison_matrix) return;
    
    let totalSimilar = 0;
    let totalDifferent = 0;
    let totalSimilarity = 0;
    
    data.comparison_matrix.forEach(pair => {
        totalSimilar += (pair.similar_features || []).length;
        totalDifferent += (pair.different_features || []).length;
        totalSimilarity += pair.similarity_score;
    });
    
    const avgSimilarity = Math.round((totalSimilarity / data.comparison_matrix.length) * 100);
    
    statSimilar.textContent = totalSimilar;
    statDifferent.textContent = totalDifferent;
    statSimilarity.textContent = `${avgSimilarity}%`;
}

/**
 * 处理视图模式切换
 */
function handleViewModeChange(viewMode) {
    // 保存当前分析结果到状态，防止切换时丢失
    if (!appState.claimsComparison.analysisResult) {
        alert('请先进行对比分析');
        return;
    }
    
    appState.claimsComparison.viewMode = viewMode;
    
    viewModeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === viewMode);
    });
    
    // 重新渲染结果（使用保存的数据）
    renderResults();
}

/**
 * 切换显示语言
 */
function toggleDisplayLanguage() {
    // TODO: 实现原文/译文切换
    alert('语言切换功能将在后续版本实现');
}

/**
 * 执行耦合对比分析
 */
async function runCouplingAnalysis() {
    const checked = Array.from(couplingSelector.querySelectorAll('.coupling-checkbox:checked'));
    const selectedIds = checked.map(cb => parseInt(cb.value));
    
    if (selectedIds.length < 2) {
        alert('请至少选择2个权利要求进行耦合分析');
        return;
    }
    
    setLoadingState(true, '开始耦合分析，准备提取文本...');
    
    try {
        // 1. 获取选中的权利要求
        const selectedClaims = appState.claimsComparison.claims.filter(c => selectedIds.includes(c.id));
        
        // 2. 验证输入
        for (const claim of selectedClaims) {
            if (!claim.fullText || !claim.numbers) {
                throw new Error(`请确保${claim.label}的文本和序号都已填写`);
            }
        }
        
        // 3. 提取权利要求
        setLoadingState(true, '提取权利要求文本...');
        for (const claim of selectedClaims) {
            if (!claim.original) {
                claim.original = extractClaims(claim.fullText, claim.numbers);
                if (!claim.original) {
                    throw new Error(`${claim.label}未能提取到有效的独立权利要求`);
                }
            }
        }
        
        // 4. 语言检测
        setLoadingState(true, '检测语言...');
        await detectLanguagesForAll(selectedClaims);
        
        // 5. 智能翻译
        setLoadingState(true, '翻译非中文文本...');
        await translateClaimsIfNeeded(selectedClaims);
        
        // 6. 执行耦合对比分析
        setLoadingState(true, '执行耦合对比分析...');
        const result = await performCouplingComparison(selectedClaims);
        
        // 7. 显示结果
        displayCouplingResult(result, selectedClaims);
        
        setLoadingState(false);
        
    } catch (error) {
        console.error("耦合分析失败:", error);
        setLoadingState(false, '', `耦合分析失败: ${error.message}`);
    }
}

/**
 * 执行耦合对比
 */
async function performCouplingComparison(claims) {
    const claimsText = claims.map((c, i) => 
        `<CLAIM_${i + 1} LABEL="${c.label}">\n${c.translated}\n</CLAIM_${i + 1}>`
    ).join('\n\n');
    
    const system_prompt = `You are a world-class patent coupling analysis AI. Your task is to analyze the coupling relationships among multiple independent claims. All analytical text must be in Chinese.`;
    
    const user_prompt = `
<TASK>
Analyze the coupling relationships among the following ${claims.length} independent claims and output a JSON object.
</TASK>

<INPUT_CLAIMS>
${claimsText}
</INPUT_CLAIMS>

<OUTPUT_SCHEMA>
{
  "coupling_analysis": {
    "overall_coupling_score": 0.75,
    "common_features": [
      {"feature": "所有权利要求共有的技术特征"}
    ],
    "unique_features": [
      {
        "claim_label": "版本A",
        "features": ["该权利要求独有的特征"]
      }
    ],
    "pairwise_relationships": [
      {
        "claim_pair": ["版本A", "版本B"],
        "relationship_type": "互补/冲突/包含",
        "analysis": "关系分析（中文）"
      }
    ],
    "coupling_summary": "耦合关系总结（中文）"
  }
}
</OUTPUT_SCHEMA>

<INSTRUCTIONS>
1. Calculate overall coupling score (0-1)
2. Identify common features across all claims
3. Identify unique features for each claim
4. Analyze pairwise relationships
5. Provide coupling summary in Chinese
6. Return only the JSON object
</INSTRUCTIONS>
`;
    
    const response = await apiCall('/chat', {
        model: appState.claimsComparison.model,
        messages: [
            { role: 'system', content: system_prompt },
            { role: 'user', content: user_prompt }
        ],
        temperature: 0.1,
    });
    
    const rawContent = response.choices[0].message.content;
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
        throw new Error('耦合分析失败，模型未返回有效JSON');
    }
    
    return JSON.parse(jsonMatch[0]);
}

/**
 * 显示耦合分析结果
 */
function displayCouplingResult(result, selectedClaims) {
    const data = result.coupling_analysis;
    
    // 添加AI生成声明
    const disclaimer = createAIDisclaimer('default', '<strong>AI生成内容：</strong>以下耦合分析由AI生成，仅供参考，请结合实际情况判断使用。');
    comparisonResultContainerRefactored.innerHTML = '';
    comparisonResultContainerRefactored.appendChild(disclaimer);
    
    const couplingScore = Math.round(data.overall_coupling_score * 100);
    
    let html = `
        <div class="comparison-card">
            <div class="comparison-card-header">
                <h3>耦合分析结果：${selectedClaims.map(c => c.label).join(' + ')}</h3>
                <span class="similarity-badge">耦合度: ${couplingScore}%</span>
            </div>
            <div class="comparison-card-body">
                <div class="comparison-section-v2">
                    <h4><span class="icon-match">✅</span> 共有特征</h4>
                    <table class="features-table">
                        <tbody>
                            ${data.common_features && data.common_features.length > 0 ?
                              data.common_features.map(item => `
                                <tr class="similar-row">
                                    <td>${item.feature}</td>
                                </tr>
                              `).join('') :
                              '<tr><td class="no-data">无共有技术特征</td></tr>'
                            }
                        </tbody>
                    </table>
                </div>
                <div class="comparison-section-v2">
                    <h4><span class="icon-diff">⚠️</span> 独有特征</h4>
                    <table class="features-table">
                        <thead>
                            <tr>
                                <th>权利要求</th>
                                <th>独有特征</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.unique_features && data.unique_features.length > 0 ?
                              data.unique_features.map(item => `
                                <tr>
                                    <td><strong>${item.claim_label}</strong></td>
                                    <td>${item.features.join('；')}</td>
                                </tr>
                              `).join('') :
                              '<tr><td colspan="2" class="no-data">无独有特征</td></tr>'
                            }
                        </tbody>
                    </table>
                </div>
                <div class="comparison-section-v2">
                    <h4>🔗 两两关系分析</h4>
                    <table class="features-table">
                        <thead>
                            <tr>
                                <th>对比组合</th>
                                <th>关系类型</th>
                                <th>分析</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.pairwise_relationships && data.pairwise_relationships.length > 0 ?
                              data.pairwise_relationships.map(item => `
                                <tr>
                                    <td><strong>${item.claim_pair.join(' vs ')}</strong></td>
                                    <td>${item.relationship_type}</td>
                                    <td class="analysis-cell">${item.analysis}</td>
                                </tr>
                              `).join('') :
                              '<tr><td colspan="3" class="no-data">无两两关系数据</td></tr>'
                            }
                        </tbody>
                    </table>
                </div>
                <div class="comparison-section-v2">
                    <h4>📊 耦合总结</h4>
                    <p>${data.coupling_summary}</p>
                </div>
            </div>
        </div>
    `;
    
    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = html;
    comparisonResultContainerRefactored.appendChild(contentDiv);
    
    // 显示控制按钮
    exportComparisonBtn.style.display = 'inline-block';
    comparisonStatsPanel.style.display = 'none'; // 耦合分析不显示统计面板
}

/**
 * 导出对比报告
 */
function exportComparisonReport() {
    // 从状态中获取数据，确保数据持久化
    const data = appState.claimsComparison.analysisResult;
    const claims = appState.claimsComparison.claims;
    
    if (!data || !claims || claims.length === 0) {
        alert('没有可导出的分析结果，请先进行对比分析');
        return;
    }
    
    // 验证数据完整性
    if (!data.comparison_matrix || data.comparison_matrix.length === 0) {
        alert('对比数据不完整，请重新进行分析');
        return;
    }
    
    // 生成报告内容
    let reportContent = '# 权利要求对比分析报告\n\n';
    reportContent += `生成时间：${new Date().toLocaleString('zh-CN')}\n\n`;
    reportContent += `## 对比概况\n\n`;
    reportContent += `- 对比数量：${claims.length}个权利要求\n`;
    reportContent += `- 对比模型：${appState.claimsComparison.model}\n\n`;
    
    reportContent += `## 权利要求列表\n\n`;
    claims.forEach(claim => {
        reportContent += `### ${claim.label}\n\n`;
        reportContent += `**语言：** ${claim.lang}\n\n`;
        reportContent += `**原文：**\n\`\`\`\n${claim.original}\n\`\`\`\n\n`;
        if (claim.lang !== 'Chinese' && claim.translated) {
            reportContent += `**译文：**\n\`\`\`\n${claim.translated}\n\`\`\`\n\n`;
        }
    });
    
    reportContent += `## 对比分析结果\n\n`;
    
    if (data.comparison_matrix) {
        data.comparison_matrix.forEach(pair => {
            const similarityPercent = Math.round(pair.similarity_score * 100);
            reportContent += `### ${pair.claim_pair[0]} vs ${pair.claim_pair[1]}\n\n`;
            reportContent += `**相似度：** ${similarityPercent}%\n\n`;
            
            reportContent += `**相同特征：**\n\n`;
            if (pair.similar_features && pair.similar_features.length > 0) {
                pair.similar_features.forEach(item => {
                    reportContent += `- ${item.feature}\n`;
                });
            } else {
                reportContent += `- 无完全相同的技术特征\n`;
            }
            reportContent += `\n`;
            
            reportContent += `**差异特征：**\n\n`;
            if (pair.different_features && pair.different_features.length > 0) {
                reportContent += `| ${pair.claim_pair[0]} | ${pair.claim_pair[1]} | 差异分析 |\n`;
                reportContent += `|---|---|---|\n`;
                pair.different_features.forEach(item => {
                    reportContent += `| ${item.claim_1_feature} | ${item.claim_2_feature} | ${item.analysis} |\n`;
                });
            } else {
                reportContent += `- 未发现显著差异\n`;
            }
            reportContent += `\n`;
        });
    }
    
    if (data.overall_summary) {
        reportContent += `## 整体总结\n\n`;
        reportContent += `${data.overall_summary}\n\n`;
    }
    
    reportContent += `---\n\n`;
    reportContent += `*本报告由AI生成，仅供参考*\n`;
    
    // 创建下载
    const blob = new Blob([reportContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `权利要求对比报告_${new Date().getTime()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('报告已导出为Markdown格式');
}

/**
 * 设置加载状态
 */
function setLoadingState(isLoading, message = '', error = '') {
    appState.claimsComparison.isLoading = isLoading;
    claimsAnalyzeBtn.disabled = isLoading;
    
    if (isLoading) {
        claimsAnalyzeBtn.textContent = '分析中...';
        comparisonResultContainerRefactored.innerHTML = `<div class="info"><div class="loading-spinner"></div> ${message}</div>`;
    } else {
        claimsAnalyzeBtn.textContent = '开始分析';
        if (error) {
            comparisonResultContainerRefactored.innerHTML = `<div class="info error">${error}</div>`;
        }
    }
}
