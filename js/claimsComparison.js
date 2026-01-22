// js/claimsComparison.js (v3.0 - 全面优化版本)

/**
 * 功能五：权利要求对比功能
 * 支持2-4个权利要求的智能对比
 * 提供多种可视化展示方式
 */

// DOM元素引用（注意：部分元素已在dom.js中声明）
let comparisonModelSelect, comparisonCountBtns, claimsInputContainer;
let viewModeBtns, exportComparisonBtn;
let comparisonStatsPanel;
let statSimilar, statDifferent, statSimilarity;

/**
 * 初始化功能五
 */
function initClaimsComparison() {
    // 获取DOM元素（使用dom.js中已声明的全局变量）
    comparisonModelSelect = document.getElementById('comparison_model_select');
    comparisonCountBtns = document.querySelectorAll('.count-btn');
    claimsInputContainer = document.getElementById('claims_input_container');
    // claimsAnalyzeBtn 已在 dom.js 中声明
    viewModeBtns = document.querySelectorAll('.view-btn');
    // toggleLanguageBtn 已在 dom.js 中声明
    exportComparisonBtn = document.getElementById('export_comparison_btn');
    comparisonStatsPanel = document.getElementById('comparison_stats_panel');
    // comparisonResultContainer 使用 dom.js 中的 comparisonResultContainerRefactored
    statSimilar = document.getElementById('stat_similar');
    statDifferent = document.getElementById('stat_different');
    statSimilarity = document.getElementById('stat_similarity');

    // 绑定事件
    comparisonModelSelect.addEventListener('change', handleModelChange);
    comparisonCountBtns.forEach(btn => {
        btn.addEventListener('click', () => handleCountChange(parseInt(btn.dataset.count)));
    });
    claimsAnalyzeBtn.addEventListener('click', runAnalysisWorkflow);
    viewModeBtns.forEach(btn => {
        btn.addEventListener('click', () => handleViewModeChange(btn.dataset.view));
    });
    toggleLanguageBtn.addEventListener('click', toggleDisplayLanguage);
    exportComparisonBtn.addEventListener('click', exportComparisonReport);

    // 初始化输入区（默认2个）
    renderInputGroups();
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
 * 处理对比数量切换
 */
function handleCountChange(count) {
    if (count < 2 || count > 4) return;
    
    appState.claimsComparison.comparisonCount = count;
    
    // 更新按钮状态
    comparisonCountBtns.forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.count) === count);
    });
    
    // 调整claims数组
    const currentCount = appState.claimsComparison.claims.length;
    const labels = ['版本A', '版本B', '版本C', '版本D'];
    
    if (count > currentCount) {
        // 添加新的输入组
        for (let i = currentCount; i < count; i++) {
            appState.claimsComparison.claims.push({
                id: i + 1,
                label: labels[i],
                fullText: '',
                numbers: '',
                original: '',
                translated: '',
                lang: ''
            });
        }
    } else if (count < currentCount) {
        // 移除多余的输入组
        appState.claimsComparison.claims = appState.claimsComparison.claims.slice(0, count);
    }
    
    // 重新渲染输入区
    renderInputGroups();
}

/**
 * 渲染输入组
 */
function renderInputGroups() {
    const claims = appState.claimsComparison.claims;
    let html = '';
    
    claims.forEach((claim, index) => {
        html += `
            <div class="comparison-input-group" data-id="${claim.id}">
                <div class="version-label">
                    <span>${claim.label}</span>
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
    
    comparisonResultContainerRefactored.innerHTML = html;
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
    
    html += '<div class="side-by-side-body">';
    claims.forEach(claim => {
        html += `<div class="claim-text-column">${claim.translated}</div>`;
    });
    html += '</div>';
    html += '</div>';
    
    comparisonResultContainerRefactored.innerHTML = html;
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
        matrix[key] = pair.similarity_score;
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
                const score = matrix[key1] || matrix[key2] || 0;
                const percent = Math.round(score * 100);
                const cellClass = score > 0.7 ? 'matrix-cell-high' : 
                                 score > 0.4 ? 'matrix-cell-medium' : 'matrix-cell-low';
                html += `<td class="matrix-cell ${cellClass}">${percent}%</td>`;
            }
        });
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    comparisonResultContainerRefactored.innerHTML = html;
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
    appState.claimsComparison.viewMode = viewMode;
    
    viewModeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === viewMode);
    });
    
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
 * 导出对比报告
 */
function exportComparisonReport() {
    // TODO: 实现导出功能
    alert('导出功能将在后续版本实现');
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
