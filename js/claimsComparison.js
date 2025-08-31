// js/claimsComparison.js (v2.0 - 支持独立权利要求提取、语言检测与翻译、原文/翻译切换)

// 初始化权利要求对比功能
function initClaimsComparison() {
    // 绑定按钮点击事件
    claimsCompareBtn.addEventListener('click', handleCompareClick);
    
    // 绑定语言检测按钮事件
    detectBaseLanguageBtn.addEventListener('click', () => detectLanguage(claimTextA, baseLanguageDisplay, 'base'));
    detectComparisonLanguageBtn.addEventListener('click', () => detectLanguage(claimTextB, comparisonLanguageDisplay, 'comparison'));
    
    // 绑定原文/翻译切换按钮事件
    displayModeToggle.addEventListener('click', switchDisplayMode);
    
    // 监听文本输入变化，更新状态
    claimTextA.addEventListener('input', () => {
        appState.claimsComparison.baseVersion.text = claimTextA.value;
    });
    
    claimTextB.addEventListener('input', () => {
        appState.claimsComparison.comparisonVersion.text = claimTextB.value;
    });
    
    // 监听独立权利要求输入变化
    baseIndependentClaimsInput.addEventListener('input', () => {
        const input = baseIndependentClaimsInput.value.trim();
        appState.claimsComparison.baseVersion.independentClaimNumbers = parseClaimNumbers(input);
    });
    
    comparisonIndependentClaimsInput.addEventListener('input', () => {
        const input = comparisonIndependentClaimsInput.value.trim();
        appState.claimsComparison.comparisonVersion.independentClaimNumbers = parseClaimNumbers(input);
    });
}

// 解析权利要求序号输入
function parseClaimNumbers(input) {
    if (!input) return [];
    
    // 支持多种格式：1,3,5 或 1-5 或混合
    const ranges = input.split(',');
    const numbers = [];
    
    ranges.forEach(range => {
        range = range.trim();
        if (range.includes('-')) {
            // 处理范围格式，如 1-5
            const [start, end] = range.split('-').map(Number);
            if (!isNaN(start) && !isNaN(end)) {
                for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
                    numbers.push(i);
                }
            }
        } else {
            // 处理单个数字
            const num = Number(range);
            if (!isNaN(num)) {
                numbers.push(num);
            }
        }
    });
    
    return [...new Set(numbers)].sort((a, b) => a - b); // 去重并排序
}

// 从文本中提取独立权利要求
function extractIndependentClaims(text, claimNumbers) {
    if (!text) return '';
    
    const lines = text.split('\n');
    const extractedClaims = [];
    
    if (claimNumbers && claimNumbers.length > 0) {
        // 如果指定了独权序号，只提取这些序号的权利要求
        lines.forEach(line => {
            for (const num of claimNumbers) {
                const pattern = new RegExp(`^权利要求${num}[\s\.:，,]+`, 'i');
                if (pattern.test(line)) {
                    extractedClaims.push(line);
                    break;
                }
            }
        });
    } else {
        // 如果没有指定，尝试自动识别独立权利要求
        lines.forEach(line => {
            // 简单的规则：寻找以"权利要求1"或类似格式开头的行，通常这是独立权利要求
            const pattern = /^权利要求\s*1[\s\.:，,]+/i;
            if (pattern.test(line)) {
                extractedClaims.push(line);
            }
        });
    }
    
    return extractedClaims.join('\n');
}

// 语言检测功能
async function detectLanguage(textArea, displayElement, versionType) {
    if (!textArea.value.trim()) {
        alert('请先输入文本内容');
        return;
    }
    
    const text = textArea.value.trim().substring(0, 1000); // 取前1000个字符进行检测
    
    try {
        displayElement.textContent = '检测中...';
        displayElement.className = 'language-detecting';
        
        const result = await apiCall('/detect-language', {
            text: text
        });
        
        const language = result.language || 'unknown';
        displayElement.textContent = language;
        displayElement.className = language === 'unknown' ? 'language-unknown' : 'language-detected';
        
        // 更新状态
        if (versionType === 'base') {
            appState.claimsComparison.baseVersion.language = language;
        } else {
            appState.claimsComparison.comparisonVersion.language = language;
        }
        
        // 如果检测到是英文，可以询问用户是否需要翻译
        if (language === 'en') {
            if (confirm('检测到英文文本，是否需要翻译成中文？')) {
                await translateText(textArea, versionType);
            }
        }
    } catch (error) {
        console.error('语言检测失败:', error);
        displayElement.textContent = '检测失败';
        displayElement.className = 'language-error';
        alert(`语言检测失败: ${error.message}`);
    }
}

// 文本翻译功能
async function translateText(textArea, versionType) {
    const text = textArea.value.trim();
    if (!text) {
        alert('没有可翻译的内容');
        return;
    }
    
    try {
        // 显示翻译中状态
        if (versionType === 'base') {
            baseLanguageDisplay.textContent = '翻译中...';
        } else {
            comparisonLanguageDisplay.textContent = '翻译中...';
        }
        
        const result = await apiCall('/translate', {
            text: text,
            target_language: 'zh'
        });
        
        const translatedText = result.translated_text || '';
        
        // 更新状态
        if (versionType === 'base') {
            appState.claimsComparison.baseVersion.translatedText = translatedText;
        } else {
            appState.claimsComparison.comparisonVersion.translatedText = translatedText;
        }
        
        // 更新显示
        if (versionType === 'base') {
            baseLanguageDisplay.textContent = 'en -> zh';
        } else {
            comparisonLanguageDisplay.textContent = 'en -> zh';
        }
        
        // 如果当前是翻译显示模式，立即更新对比结果
        if (appState.claimsComparison.displayMode === 'translated' && appState.claimsComparison.result) {
            renderComparisonResults(appState.claimsComparison.result);
        }
        
    } catch (error) {
        console.error('翻译失败:', error);
        alert(`翻译失败: ${error.message}`);
        // 恢复语言显示
        if (versionType === 'base') {
            baseLanguageDisplay.textContent = appState.claimsComparison.baseVersion.language || 'unknown';
        } else {
            comparisonLanguageDisplay.textContent = appState.claimsComparison.comparisonVersion.language || 'unknown';
        }
    }
}

// 切换原文/翻译显示模式
function switchDisplayMode() {
    const currentMode = appState.claimsComparison.displayMode;
    const newMode = currentMode === 'original' ? 'translated' : 'original';
    
    appState.claimsComparison.displayMode = newMode;
    displayModeToggle.textContent = newMode === 'original' ? '显示原文' : '显示翻译';
    
    // 如果已有对比结果，重新渲染
    if (appState.claimsComparison.result) {
        renderComparisonResults(appState.claimsComparison.result);
    }
}

// 处理对比按钮点击
async function handleCompareClick() {
    // 重置状态
    appState.claimsComparison.isLoading = true;
    appState.claimsComparison.error = null;
    
    // 更新UI状态
    claimsCompareBtn.disabled = true;
    claimsCompareBtn.textContent = '对比中...';
    comparisonResultContainer.innerHTML = '<div class="loading">正在进行权利要求对比，请稍候...</div>';
    
    try {
        // 1. 提取独立权利要求
        const baseExtractedClaims = extractIndependentClaims(
            appState.claimsComparison.baseVersion.text,
            appState.claimsComparison.baseVersion.independentClaimNumbers
        );
        
        const comparisonExtractedClaims = extractIndependentClaims(
            appState.claimsComparison.comparisonVersion.text,
            appState.claimsComparison.comparisonVersion.independentClaimNumbers
        );
        
        if (!baseExtractedClaims) {
            throw new Error('无法从基准版本中提取独立权利要求，请检查输入或指定权利要求序号');
        }
        
        if (!comparisonExtractedClaims) {
            throw new Error('无法从对比版本中提取独立权利要求，请检查输入或指定权利要求序号');
        }
        
        // 2. 根据显示模式确定要使用的文本
        let baseText, comparisonText;
        if (appState.claimsComparison.displayMode === 'translated') {
            baseText = appState.claimsComparison.baseVersion.translatedText || baseExtractedClaims;
            comparisonText = appState.claimsComparison.comparisonVersion.translatedText || comparisonExtractedClaims;
        } else {
            baseText = baseExtractedClaims;
            comparisonText = comparisonExtractedClaims;
        }
        
        // 保存用于对比的文本
        appState.claimsComparison.comparisonData.baseText = baseText;
        appState.claimsComparison.comparisonData.comparisonText = comparisonText;
        
        // 3. 调用模型进行对比
        const result = await callComparisonModel(baseText, comparisonText);
        
        // 4. 保存结果并渲染
        appState.claimsComparison.result = result;
        renderComparisonResults(result);
        
    } catch (error) {
        console.error('对比失败:', error);
        appState.claimsComparison.error = error.message;
        comparisonResultContainer.innerHTML = `<div class="error">对比失败: ${error.message}</div>`;
    } finally {
        // 恢复UI状态
        appState.claimsComparison.isLoading = false;
        claimsCompareBtn.disabled = false;
        claimsCompareBtn.textContent = '开始对比';
    }
}

// 调用对比模型
async function callComparisonModel(textA, textB) {
    try {
        // 准备提示词
        const prompt = `你是一位专业的专利审查员，需要对比两份专利权利要求的内容，特别是独立权利要求。请分析它们的相似性和差异，并按照指定的JSON格式输出结果。

基准版本权利要求：
${textA}

对比版本权利要求：
${textB}

请按照以下JSON格式输出对比结果，不要添加任何额外的说明文字：
{
  "similarities": [
    {
      "baseSentence": "基准版本中的相似句子",
      "comparisonSentence": "对比版本中的相似句子",
      "reason": "相似的理由"
    }
  ],
  "differences": [
    {
      "baseSentence": "基准版本中的不同句子",
      "comparisonSentence": "对比版本中的不同句子或'无对应内容'",
      "reason": "不同的理由"
    }
  ],
  "summary": "简要总结两份权利要求的整体相似性和差异"
}`;
        
        // 调用API
        const response = await apiCall('/chat', {
            model: 'glm-4-long',
            messages: [
                { role: 'system', content: '你是一位专业的专利审查员，需要对比两份专利权利要求的内容并分析相似性和差异。' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.1,
            max_tokens: 4096
        });
        
        // 处理响应
        const content = response.choices[0].message.content;
        
        // 尝试解析JSON
        try {
            return JSON.parse(content);
        } catch (e) {
            // 如果JSON解析失败，尝试提取JSON部分
            const jsonMatch = content.match(/```json\n([\s\S]*)\n```/);
            if (jsonMatch && jsonMatch[1]) {
                return JSON.parse(jsonMatch[1]);
            }
            
            // 如果都失败，返回一个包含原始内容的对象
            return {
                similarities: [],
                differences: [],
                summary: content
            };
        }
    } catch (error) {
        console.error('模型调用失败:', error);
        throw error;
    }
}

// 渲染对比结果
function renderComparisonResults(result) {
    if (!result) {
        comparisonResultContainer.innerHTML = '<div class="error">没有找到对比结果</div>';
        return;
    }
    
    // 创建结果容器
    const container = document.createElement('div');
    container.className = 'comparison-result';
    
    // 添加总结部分
    if (result.summary) {
        const summarySection = document.createElement('div');
        summarySection.className = 'summary-section';
        summarySection.innerHTML = `<h3>对比总结</h3><p>${result.summary}</p>`;
        container.appendChild(summarySection);
    }
    
    // 添加相似部分
    if (result.similarities && result.similarities.length > 0) {
        const similaritiesSection = document.createElement('div');
        similaritiesSection.className = 'similarities-section';
        similaritiesSection.innerHTML = '<h3>相似之处</h3>';
        
        const similarityList = document.createElement('div');
        similarityList.className = 'similarity-list';
        
        result.similarities.forEach((item, index) => {
            const similarityItem = document.createElement('div');
            similarityItem.className = 'similarity-item';
            similarityItem.innerHTML = `
                <div class="similarity-header">相似点 ${index + 1}</div>
                <div class="similarity-content">
                    <div class="sentence-pair">
                        <div class="sentence-label">基准版本：</div>
                        <div class="sentence-text">${item.baseSentence || '无内容'}</div>
                    </div>
                    <div class="sentence-pair">
                        <div class="sentence-label">对比版本：</div>
                        <div class="sentence-text">${item.comparisonSentence || '无内容'}</div>
                    </div>
                    ${item.reason ? `<div class="similarity-reason">原因：${item.reason}</div>` : ''}
                </div>
            `;
            similarityList.appendChild(similarityItem);
        });
        
        similaritiesSection.appendChild(similarityList);
        container.appendChild(similaritiesSection);
    }
    
    // 添加差异部分
    if (result.differences && result.differences.length > 0) {
        const differencesSection = document.createElement('div');
        differencesSection.className = 'differences-section';
        differencesSection.innerHTML = '<h3>主要差异</h3>';
        
        const differenceList = document.createElement('div');
        differenceList.className = 'difference-list';
        
        result.differences.forEach((item, index) => {
            const differenceItem = document.createElement('div');
            differenceItem.className = 'difference-item';
            differenceItem.innerHTML = `
                <div class="difference-header">差异点 ${index + 1}</div>
                <div class="difference-content">
                    <div class="sentence-pair">
                        <div class="sentence-label">基准版本：</div>
                        <div class="sentence-text">${item.baseSentence || '无内容'}</div>
                    </div>
                    <div class="sentence-pair">
                        <div class="sentence-label">对比版本：</div>
                        <div class="sentence-text">${item.comparisonSentence || '无内容'}</div>
                    </div>
                    ${item.reason ? `<div class="difference-reason">原因：${item.reason}</div>` : ''}
                </div>
            `;
            differenceList.appendChild(differenceItem);
        });
        
        differencesSection.appendChild(differenceList);
        container.appendChild(differencesSection);
    }
    
    // 如果没有相似和差异结果，显示提示
    if (!result.similarities || result.similarities.length === 0 && 
        (!result.differences || result.differences.length === 0)) {
        container.innerHTML += '<div class="no-results">未找到明显的相似或差异内容</div>';
    }
    
    // 更新结果容器
    comparisonResultContainer.innerHTML = '';
    comparisonResultContainer.appendChild(container);
}
