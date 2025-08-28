// js/claimsComparison.js

function initClaimsComparison() {
    claimsCompareBtn.addEventListener('click', handleCompareClick);
}

async function handleCompareClick() {
    const textA = claimTextA.value.trim();
    const textB = claimTextB.value.trim();

    if (!textA || !textB) {
        alert('请确保两个文本框都已粘贴权利要求文本。');
        return;
    }

    appState.claimsComparison.isLoading = true;
    claimsCompareBtn.disabled = true;
    claimsCompareBtn.textContent = '正在分析中...';
    comparisonResultContainer.innerHTML = '<div class="info"><div class="loading-spinner"></div> 正在调用大模型进行深度对比，请稍候...</div>';

    // 基于我们设计的稳定提示词
    const promptTemplate = `
你是一位精通全球专利法，尤其擅长权利要求（Claims）解释和范围对比的资深专利律师。你的任务是精确、客观地对比两个不同版本的权利要求文本，并以严格的JSON格式输出你的分析结果。

**任务指令:**

1.  **识别与配对**: 自动识别并配对两个文本中对应的独立权利要求。例如，文本A的权利要求1通常对应文本B的权利要求1。
2.  **逐句拆解与对比**: 对每一对配对的独立权利要求，进行逐句（通常以句号、分号或逗号分隔的短语为一个单元）拆解和对比。
3.  **语义相似度评估**: 评估每一对句子的语义相似度，并给出一个0.0到1.0之间的分数。1.0代表完全相同或同义，0.0代表完全不同。
4.  **差异分析**: 对于语义相似度低于0.95的句子对，清晰、简洁地指出其核心差异点，以及这种差异可能对保护范围带来的影响（是扩大、缩小还是限定）。
5.  **总结**: 对每一对独立权利要求的整体差异给出一个简短的总结。
6.  **处理从属权利要求**: 简单罗列出各自的从属权利要求，暂不进行详细对比。

**输入文本:**

[文本A]
${textA}

[文本B]
${textB}

**输出格式 (必须严格遵守此JSON结构，不要添加任何Markdown标记或额外解释):**

{
  "comparison_pairs": [
    {
      "claim_A": {
        "number": "独立权利要求1",
        "full_text": "（此处为文本A的独立权利要求1的全文）"
      },
      "claim_B": {
        "number": "独立权利要求1",
        "full_text": "（此处为文本B的独立权利要求1的全文）"
      },
      "overall_summary": "（此处为对这对独立权利要求差异的整体总结，例如：'版本B在版本A的基础上增加了XX技术特征，导致保护范围缩小。'）",
      "sentence_analysis": [
        {
          "sentence_A": "（拆分出的句子A1）",
          "sentence_B": "（拆分出的句子B1）",
          "similarity_score": 1.0,
          "difference_analysis": "完全相同。"
        },
        {
          "sentence_A": "一种数据处理方法。",
          "sentence_B": "一种基于区块链的数据处理方法。",
          "similarity_score": 0.7,
          "difference_analysis": "版本B明确限定了技术背景为'基于区块链'，缩小了保护范围。"
        }
      ]
    }
  ],
  "dependent_claims_A": [
    "（文本A的从属权利要求2）",
    "（文本A的从属权利要求3）"
  ],
  "dependent_claims_B": [
    "（文本B的从属权利要求2）",
    "（文本B的从属权利要求3）"
  ]
}
`;

    let fullResponse = "";
    try {
        const reader = await apiCall('/stream_chat', {
            model: 'glm-4', // 使用能力更强的模型以保证JSON格式和分析质量
            messages: [{ role: 'user', content: promptTemplate }],
            temperature: 0.1,
        }, 'POST', true);

        const decoder = new TextDecoder();
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n\n').filter(line => line.startsWith('data: '));

            for (const line of lines) {
                const data = line.substring(6);
                if (data === '[DONE]') continue;
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) throw new Error(parsed.error.message || JSON.stringify(parsed.error));
                    
                    const delta = parsed.choices[0]?.delta?.content || "";
                    if (delta) {
                        fullResponse += delta;
                    }
                } catch (e) {
                    // Ignore parsing errors during streaming, just accumulate the string
                }
            }
        }
        
        // 尝试从累积的响应中提取JSON
        const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("模型未返回有效的JSON格式。");
        }

        const parsedJson = JSON.parse(jsonMatch[0]);
        appState.claimsComparison.result = parsedJson;
        renderComparisonResults(parsedJson);

    } catch (error) {
        console.error("权利要求对比失败:", error);
        appState.claimsComparison.error = error.message;
        comparisonResultContainer.innerHTML = `<div class="info error"><strong>分析失败:</strong><br>${error.message}</div>`;
    } finally {
        appState.claimsComparison.isLoading = false;
        claimsCompareBtn.disabled = false;
        claimsCompareBtn.textContent = '开始对比';
    }
}

function renderComparisonResults(data) {
    if (!data || !data.comparison_pairs) {
        comparisonResultContainer.innerHTML = '<div class="info error">返回的数据格式不正确，无法渲染结果。</div>';
        return;
    }

    let html = '';

    // 渲染配对的独立权利要求
    data.comparison_pairs.forEach(pair => {
        html += `
            <div class="comparison-pair">
                <div class="comparison-pair-header">
                    <h4>${pair.claim_A.number} vs ${pair.claim_B.number}</h4>
                    <p class="summary"><strong>总结:</strong> ${pair.overall_summary}</p>
                </div>
                <div style="padding: 10px 20px;">
                    <table class="sentence-analysis-table">
                        <thead>
                            <tr>
                                <th>文本 A</th>
                                <th>文本 B</th>
                                <th>差异分析</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pair.sentence_analysis.map(sentence => `
                                <tr class="${sentence.similarity_score >= 0.95 ? 'diff-similar' : 'diff-different'}">
                                    <td>${sentence.sentence_A}</td>
                                    <td>${sentence.sentence_B}</td>
                                    <td>${sentence.difference_analysis}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });

    // 渲染从属权利要求
    if (data.dependent_claims_A.length > 0 || data.dependent_claims_B.length > 0) {
        html += `
            <div class="dependent-claims-section">
                <div class="dependent-claims-list">
                    <div>
                        <h5>文本 A 的从属权利要求</h5>
                        <ul>
                            ${data.dependent_claims_A.map(claim => `<li>${claim}</li>`).join('')}
                        </ul>
                    </div>
                    <div>
                        <h5>文本 B 的从属权利要求</h5>
                        <ul>
                            ${data.dependent_claims_B.map(claim => `<li>${claim}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }

    comparisonResultContainer.innerHTML = html;
}
