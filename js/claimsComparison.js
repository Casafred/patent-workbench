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
 * 从完整文本中根据序号提取权利要求 (v2.1 - 优化多独权提取逻辑)
 * @param {string} fullText - 完整的权利要求文本
 * @param {string} numbersStr - 用户输入的序号字符串，如 "1, 9"
 * @returns {string} - 拼接好的独立权利要求文本
 */
function extractClaims(fullText, numbersStr) {
    // 1. 解析用户输入的序号
    const targetNumbers = new Set(numbersStr.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n)));
    if (targetNumbers.size === 0) return "";

    const extractedClaims = [];
    
    // 2. 将文本按权利要求编号分割成块
    // 这个正则表达式匹配一个或多个数字开头，后面跟着点、空格或中文顿号，这是一个权利要求的开始标志。
    // `\n(?=\d+\s*[.\s、])` 这是一个正向先行断言，它匹配换行符，但前提是这个换行符后面跟着一个权利要求编号。
    // 这能确保我们正确地按权利要求分割，即使权利要求内部有换行。
    const claimBlocks = fullText.split(/\n(?=\d+\s*[.\s、])/).map(s => s.trim());

    // 3. 遍历分割后的块，提取目标权利要求
    for (const block of claimBlocks) {
        if (!block) continue;
        
        const match = block.match(/^(\d+)/);
        if (match) {
            const currentClaimNumber = parseInt(match[1]);
            if (targetNumbers.has(currentClaimNumber)) {
                extractedClaims.push(block);
            }
        }
    }

    // 4. 如果没有提取到任何内容，返回空字符串
    if (extractedClaims.length === 0) {
        return "";
    }

    // 5. 将所有提取到的独立权利要求用分隔符连接起来
    return extractedClaims.join('\n\n---\n\n'); // 使用分隔符拼接多个独权
}

/**
 * API调用：检测语言 (v2.1 - 增加健壮性)
 */
async function detectLanguages(text1, text2) {
    const prompt = `You are a language detection expert. For the two texts provided below, identify their primary language (e.g., "Chinese", "English", "Japanese"). Respond ONLY with a JSON object.

[Text 1]: ${text1.slice(0, 200)}
[Text 2]: ${text2.slice(0, 200)}

Your JSON output must be in the format: {"language_1": "...", "language_2": "..."}`;
    
    // 使用非流式调用，因为我们需要完整的返回内容
    const response = await apiCall('/chat', {
        model: 'glm-4-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.0,
    });
    
    const rawContent = response.choices[0].message.content;
    
    // ▼▼▼ 核心健壮性修复 ▼▼▼
    // 使用正则表达式从返回的文本中提取出JSON部分
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        // 如果连JSON的括号都找不到，就抛出明确的错误
        console.error("Language detection raw response:", rawContent);
        throw new Error('语言检测失败，模型未返回任何看似JSON的内容。');
    }

    try {
        // 解析提取出的JSON字符串
        const result = JSON.parse(jsonMatch[0]);
        if (!result.language_1 || !result.language_2) {
             throw new Error('JSON中缺少language_1或language_2字段。');
        }
        return { lang1: result.language_1, lang2: result.language_2 };
    } catch (e) {
        console.error("Language detection JSON parsing error:", e);
        console.error("Original matched string:", jsonMatch[0]);
        throw new Error(`语言检测失败，模型返回的JSON格式无效: ${e.message}`);
    }
    // ▲▲▲ 修复结束 ▲▲▲
}

/**
 * API调用：翻译文本到中文 (v2.1 - 增加健壮性)
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
    // 直接返回模型的输出，不假设格式
    return response.choices[0].message.content.trim();
}

/**
 * API调用：执行核心对比
 */
async function performComparison(baselineClaim, comparisonClaim) {
    // 将“角色扮演”和“任务指令”分离，是更规范的做法
    const system_prompt = `You are a highly specialized AI assistant for patent analysis. Your sole function is to compare two patent claims and output the analysis in a structured JSON format. You must not engage in conversation or add any explanatory text outside of the requested JSON structure.`;

    // 使用XML标签来提供强结构化指令，极大提高模型遵循指令的概率
    const user_prompt = `
<TASK_DESCRIPTION>
Your task is to conduct a detailed semantic comparison of two independent patent claims: a baseline version and a comparison version. Identify and group all technical features into two categories: 'similar_features' and 'different_features'.
</TASK_DESCRIPTION>

<INPUT_DATA>
  <BASELINE_CLAIM>
    <![CDATA[
${baselineClaim}
    ]]>
  </BASELINE_CLAIM>
  <COMPARISON_CLAIM>
    <![CDATA[
${comparisonClaim}
    ]]>
  </COMPARISON_CLAIM>
</INPUT_DATA>

<OUTPUT_INSTRUCTIONS>
You must generate a single JSON object as your response. The JSON object must contain exactly two keys: \`similar_features\` and \`different_features\`.

1.  **similar_features**: This must be an array of strings. Each string should represent a technical feature that is semantically identical or has only minor, non-substantive wording differences between the two claims.
2.  **different_features**: This must be an array of objects. Each object represents a significant difference and must contain three string keys:
    - \`baseline_feature\`: The feature text from the baseline claim.
    - \`comparison_feature\`: The corresponding, but different, feature text from the comparison claim.
    - \`analysis\`: A concise explanation of the difference and its impact on the patent's scope (e.g., "narrows the scope by adding a specific material," "broadens the scope by removing a process step").

Do not include any text, greetings, or markdown formatting before or after the JSON object.
</OUTPUT_INSTRUCTIONS>
`;

    const response = await apiCall('/chat', {
        model: 'glm-4-long',
        messages: [
            { role: 'system', content: system_prompt },
            { role: 'user', content: user_prompt }
        ],
        temperature: 0.1,
    });

    const rawContent = response.choices[0].message.content;
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        console.error("Comparison raw response:", rawContent);
        throw new Error('核心对比失败，模型未返回任何看似JSON的内容。');
    }

    try {
        return JSON.parse(jsonMatch[0]);
    } catch (e) {
        console.error("Comparison JSON parsing error:", e);
        console.error("Original matched string:", jsonMatch[0]);
        throw new Error(`核心对比失败，模型返回的JSON格式无效: ${e.message}`);
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
