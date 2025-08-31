// js/claimsComparison.js (v2.0 - Major Refactor)

function initClaimsComparison() {
    claimsAnalyzeBtn.addEventListener('click', runAnalysisWorkflow);
    toggleLanguageBtn.addEventListener('click', toggleDisplayLanguage);
}

/**
 * 主工作流函数，协调所有分析步骤
 */
async function runAnalysisWorkflow() {
    // 1. UI反馈和状态初始化
    setLoadingState(true, '开始分析，准备提取文本...');
    
    try {
        // 2. 从UI提取用户输入和独权序号
        const baselineFullText = baselineClaimText.value;
        const comparisonFullText = comparisonClaimText.value;
        const baselineNumbers = baselineClaimNumbers.value;
        const comparisonNumbers = comparisonClaimNumbers.value;

        if (!baselineFullText || !comparisonFullText || !baselineNumbers || !comparisonNumbers) {
            throw new Error('请确保所有文本框和序号框都已填写。');
        }

        const baselineExtracted = extractClaims(baselineFullText, baselineNumbers);
        const comparisonExtracted = extractClaims(comparisonFullText, comparisonNumbers);

        if (!baselineExtracted || !comparisonExtracted) {
            throw new Error('根据提供的序号未能提取到有效的独立权利要求，请检查序号是否正确。');
        }
        
        // 保存原文
        appState.claimsComparison.baseline.original = baselineExtracted;
        appState.claimsComparison.comparison.original = comparisonExtracted;

        // 3. 语言检测
        setLoadingState(true, '提取成功，正在检测语言...');
        const langs = await detectLanguages(baselineExtracted, comparisonExtracted);
        appState.claimsComparison.baseline.lang = langs.lang1;
        appState.claimsComparison.comparison.lang = langs.lang2;

        // 4. 智能翻译 (目标语言：中文)
        let textForComparisonA = baselineExtracted;
        let textForComparisonB = comparisonExtracted;

        if (langs.lang1 !== 'Chinese' && langs.lang2 === 'Chinese') {
            // 基准版本需要翻译
            setLoadingState(true, `语言为(${langs.lang1}/${langs.lang2})，正在翻译基准版本...`);
            textForComparisonA = await translateText(baselineExtracted);
            appState.claimsComparison.baseline.translated = textForComparisonA;
        } else if (langs.lang1 === 'Chinese' && langs.lang2 !== 'Chinese') {
            // 对比版本需要翻译
            setLoadingState(true, `语言为(${langs.lang1}/${langs.lang2})，正在翻译对比版本...`);
            textForComparisonB = await translateText(comparisonExtracted);
            appState.claimsComparison.comparison.translated = textForComparisonB;
        } else if (langs.lang1 !== 'Chinese' && langs.lang2 !== 'Chinese') {
            // 两者都需要翻译，以基准版本为准，翻译对比版本
             setLoadingState(true, `语言为(${langs.lang1}/${langs.lang2})，正在翻译对比版本...`);
             textForComparisonB = await translateText(comparisonExtracted);
             appState.claimsComparison.comparison.translated = textForComparisonB;
        }
        // 如果都是中文，则无需翻译

        // 5. 核心对比
        setLoadingState(true, '翻译完成，正在进行核心对比分析...');
        const analysisResult = await performComparison(textForComparisonA, textForComparisonB);
        appState.claimsComparison.analysisResult = analysisResult;
        
        // 6. 渲染结果
        renderComparisonResults();
        
        // 7. 如果有翻译发生，则显示切换按钮
        if(appState.claimsComparison.baseline.translated || appState.claimsComparison.comparison.translated) {
            toggleLanguageBtn.style.display = 'inline-block';
            appState.claimsComparison.displayLang = 'translated'; // 默认显示翻译后的对比结果
            toggleDisplayLanguage(true); // 调用一次以确保初始状态正确
        } else {
            toggleLanguageBtn.style.display = 'none';
        }

    } catch (error) {
        console.error("分析工作流失败:", error);
        setLoadingState(false, '', `分析失败: ${error.message}`);
    } finally {
        setLoadingState(false);
    }
}

/**
 * 从完整文本中根据序号提取权利要求
 * @param {string} fullText - 完整的权利要求文本
 * @param {string} numbersStr - 用户输入的序号字符串，如 "1, 9"
 * @returns {string} - 拼接好的独立权利要求文本
 */
function extractClaims(fullText, numbersStr) {
    const numbers = numbersStr.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
    if (numbers.length === 0) return "";

    const claims = [];
    const lines = fullText.split('\n');
    let currentClaimText = '';
    let currentClaimNumber = -1;

    for (const line of lines) {
        const match = line.match(/^(\d+)\s*[.\s、]/); // 匹配 "1." "1 " "1、" 等格式
        if (match) {
            // 保存上一条权利要求
            if (currentClaimNumber !== -1 && numbers.includes(currentClaimNumber)) {
                claims.push(currentClaimText.trim());
            }
            // 开始新的权利要求
            currentClaimNumber = parseInt(match[1]);
            currentClaimText = line;
        } else if (currentClaimNumber !== -1) {
            currentClaimText += '\n' + line;
        }
    }
    // 保存最后一条权利要求
    if (currentClaimNumber !== -1 && numbers.includes(currentClaimNumber)) {
        claims.push(currentClaimText.trim());
    }

    return claims.join('\n\n---\n\n'); // 使用分隔符拼接多个独权
}


/**
 * API调用：检测语言
 */
async function detectLanguages(text1, text2) {
    const prompt = `You are a language detection expert. For the two texts provided below, identify their primary language (e.g., "Chinese", "English", "Japanese"). Respond ONLY with a JSON object.

[Text 1]: ${text1.slice(0, 200)}
[Text 2]: ${text2.slice(0, 200)}

Your JSON output:
{"language_1": "...", "language_2": "..."}`;
    
    const response = await apiCall('/chat', {
        model: 'glm-4-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.0,
    });
    
    try {
        const result = JSON.parse(response.choices[0].message.content);
        return { lang1: result.language_1, lang2: result.language_2 };
    } catch (e) {
        throw new Error('语言检测失败，模型返回格式错误。');
    }
}

/**
 * API调用：翻译文本到中文
 */
async function translateText(text) {
    const prompt = `Please translate the following patent claim text into professional, accurate Chinese. Only return the translated text, without any explanations or extra content.

Text to translate:
${text}`;

    const response = await apiCall('/chat', {
        model: 'glm-4-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.0,
    });
    return response.choices[0].message.content.trim();
}

/**
 * API调用：执行核心对比
 */
async function performComparison(baselineClaim, comparisonClaim) {
    const prompt = `You are a patent expert comparing two versions of an independent claim. Your task is to semantically group their constituent technical features into 'similar' and 'different' categories.

- **Baseline Claim:**
${baselineClaim}

- **Comparison Claim:**
${comparisonClaim}

Output a JSON object with two keys: \`similar_features\` and \`different_features\`.

- For \`similar_features\`: list features that are semantically identical or have minor wording changes. Each item should be a single string representing the common feature.
- For \`different_features\`: list features with significant semantic differences. Each item must be an object with three keys: \`baseline_feature\`, \`comparison_feature\`, and \`analysis\` (explaining the difference and its impact on scope).

Strictly follow this JSON format, do not add any markdown:
{
  "similar_features": [
    "A shared feature...",
    "Another shared feature..."
  ],
  "different_features": [
    {
      "baseline_feature": "A feature from the baseline claim.",
      "comparison_feature": "The corresponding, but different, feature from the comparison claim.",
      "analysis": "The comparison version adds the 'X' limitation, narrowing the scope."
    }
  ]
}`;

    const response = await apiCall('/chat', {
        model: 'glm-4-long', // Use long context model for complex claims
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
    });

    try {
        return JSON.parse(response.choices[0].message.content);
    } catch (e) {
        throw new Error('核心对比失败，模型返回的JSON格式无效。');
    }
}

/**
 * 渲染结果到UI
 */
function renderComparisonResults() {
    const data = appState.claimsComparison.analysisResult;
    if (!data) return;

    let html = `
        <div class="comparison-section">
            <h4>相同或基本相同的技术特征</h4>
            <ul class="similar-features-list">
                ${data.similar_features.map(feature => `<li>${feature}</li>`).join('') || '<li>无完全相同的特征。</li>'}
            </ul>
        </div>
        <div class="comparison-section">
            <h4>存在显著差异的技术特征</h4>
            <table class="different-features-table">
                <thead>
                    <tr>
                        <th>基准版本 (Baseline)</th>
                        <th>对比版本 (Comparison)</th>
                        <th>差异分析 (Analysis)</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.different_features.map(item => `
                        <tr>
                            <td>${item.baseline_feature}</td>
                            <td>${item.comparison_feature}</td>
                            <td>${item.analysis}</td>
                        </tr>
                    `).join('') || '<tr><td colspan="3" style="text-align:center;">未发现显著差异的特征。</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
    comparisonResultContainerRefactored.innerHTML = html;
}

/**
 * 控制UI的加载状态
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

/**
 * 切换显示语言（暂未实现，作为后续功能）
 */
function toggleDisplayLanguage(forceUpdate = false) {
    // This is a placeholder for the more complex implementation
    // that would require storing original/translated text for each feature.
    // For now, it just toggles the button text.
    if (!forceUpdate) {
        appState.claimsComparison.displayLang = appState.claimsComparison.displayLang === 'original' ? 'translated' : 'original';
    }

    if (appState.claimsComparison.displayLang === 'original') {
        toggleLanguageBtn.textContent = '切换为译文';
        alert("显示原文的功能将在下一版本实现！当前默认显示翻译后的对比结果。");
    } else {
        toggleLanguageBtn.textContent = '切换为原文';
    }
    // In a full implementation, you would iterate over the rendered elements
    // and swap their innerHTML with content from data attributes.
}
