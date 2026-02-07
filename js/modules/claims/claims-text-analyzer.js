/**
 * Claims Text Analyzer Module
 * Handles text analysis, language detection, and AI translation
 */

// 分析权利要求文本
export async function analyzeClaimsText(state, showMessage, displayResults) {
    const input = document.getElementById('claims_text_input');
    const text = input.value.trim();
    
    if (!text) {
        showMessage('请输入权利要求文本', 'error');
        return;
    }
    
    try {
        const detectedLanguage = detectTextLanguage(text);
        console.log('检测到的语言:', detectedLanguage);
        
        if (detectedLanguage !== 'zh' && detectedLanguage !== 'en') {
            const languageNames = {
                'ja': '日语',
                'ko': '韩语',
                'de': '德语',
                'fr': '法语',
                'es': '西班牙语',
                'ru': '俄语',
                'other': '其他语言'
            };
            const langName = languageNames[detectedLanguage] || '非中英文';
            
            const useAI = await showAIModePrompt(langName);
            if (!useAI) {
                showMessage('已取消分析', 'info');
                return;
            }
            
            await analyzeClaimsTextWithAI(text, detectedLanguage, state, showMessage, displayResults);
        } else {
            analyzeClaimsTextDirect(text, state, showMessage, displayResults);
        }
        
    } catch (error) {
        console.error('Analysis error:', error);
        showMessage('分析失败：' + error.message, 'error');
    }
}

// 检测文本语言
function detectTextLanguage(text) {
    if (!text) return 'other';
    
    if (/\b(revendication|selon|caractérisé|comprenant|dispositif)\b/i.test(text)) return 'fr';
    if (/\b(anspruch|ansprüche|gemäß|dadurch|gekennzeichnet)\b/i.test(text)) return 'de';
    if (/[\uac00-\ud7af]/.test(text)) return 'ko';
    
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const hiraganaChars = (text.match(/[\u3040-\u309f]/g) || []).length;
    const katakanaChars = (text.match(/[\u30a0-\u30ff]/g) || []).length;
    const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
    
    const totalChars = text.replace(/\s/g, '').length;
    if (totalChars === 0) return 'other';
    
    const kanaRatio = (hiraganaChars + katakanaChars) / totalChars;
    if (kanaRatio > 0.05) return 'ja';
    
    const chineseRatio = chineseChars / totalChars;
    if (chineseRatio > 0.1) return 'zh';
    
    const englishRatio = englishChars / totalChars;
    if (englishRatio > 0.5) return 'en';
    
    return 'other';
}

// 显示AI模式提示对话框
function showAIModePrompt(languageName) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 8px;
            max-width: 500px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        `;
        
        dialog.innerHTML = `
            <h3 style="margin-top: 0; color: #333;">检测到${languageName}文本</h3>
            <p style="color: #666; line-height: 1.6;">
                系统检测到您输入的文本为${languageName}。<br>
                <strong>建议开启AI模式</strong>，系统将使用AI翻译为中文后再进行独从权分析，以获得更准确的结果。
            </p>
            <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                <button id="ai_mode_cancel" style="padding: 8px 20px; border: 1px solid #ccc; background: #f5f5f5; color: #333; border-radius: 4px; cursor: pointer; font-weight: 500;">
                    取消
                </button>
                <button id="ai_mode_confirm" style="padding: 8px 20px; border: none; background: #007bff; color: white; border-radius: 4px; cursor: pointer; font-weight: 500;">
                    开启AI模式
                </button>
            </div>
        `;
        
        modal.appendChild(dialog);
        document.body.appendChild(modal);
        
        document.getElementById('ai_mode_confirm').onclick = () => {
            document.body.removeChild(modal);
            resolve(true);
        };
        
        document.getElementById('ai_mode_cancel').onclick = () => {
            document.body.removeChild(modal);
            resolve(false);
        };
        
        modal.onclick = (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
                resolve(false);
            }
        };
    });
}

// 使用AI模式分析
async function analyzeClaimsTextWithAI(text, detectedLanguage, state, showMessage, displayResults) {
    showMessage('正在使用AI翻译并分析...', 'info');
    
    try {
        let apiKey = window.appState?.apiKey;
        if (!apiKey) {
            apiKey = localStorage.getItem('globalApiKey');
        }
        if (!apiKey) {
            showMessage('请先在设置中配置API Key', 'error');
            return;
        }
        
        const response = await fetch('/api/claims-analyzer/parse', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                text: text,
                use_ai_translation: true,
                detected_language: detectedLanguage
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            state.textAnalyzedData = data.data.claims;
            
            if (data.data.language_info && data.data.language_info.translation_applied) {
                const langInfo = data.data.language_info;
                showMessage(
                    `✓ AI翻译完成（${langInfo.original_language} → 中文），成功识别 ${state.textAnalyzedData.length} 条权利要求`,
                    'success'
                );
            } else {
                showMessage(`成功识别 ${state.textAnalyzedData.length} 条权利要求`, 'success');
            }
            
            displayResults(state);
        } else {
            showMessage('AI分析失败：' + (data.error || '未知错误'), 'error');
        }
    } catch (error) {
        console.error('AI analysis error:', error);
        showMessage('AI分析失败：' + error.message, 'error');
    }
}

// 直接分析（中英文使用正则规则）
function analyzeClaimsTextDirect(text, state, showMessage, displayResults) {
    state.textAnalyzedData = parseClaimsText(text);
    
    if (state.textAnalyzedData.length === 0) {
        showMessage('未能识别到有效的权利要求，请检查格式', 'error');
        return;
    }
    
    displayResults(state);
    showMessage(`成功识别 ${state.textAnalyzedData.length} 条权利要求`, 'success');
}

// 解析权利要求文本
function parseClaimsText(text) {
    const claims = [];
    const lines = text.split('\n');
    let currentClaim = null;
    
    for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        
        const claimMatch = line.match(/^(?:权利要求|请求项|請求項|claim|claims?)\s*(\d+)|^(\d+)[.、．]/i);
        
        if (claimMatch) {
            if (currentClaim) {
                claims.push(currentClaim);
            }
            
            const claimNumber = parseInt(claimMatch[1] || claimMatch[2]);
            const claimText = line.replace(/^(?:权利要求|请求项|請求項|claim|claims?)\s*\d+[.、．]?\s*/i, '');
            
            currentClaim = {
                claim_number: claimNumber,
                claim_text: claimText,
                full_text: claimText
            };
        } else if (currentClaim) {
            currentClaim.full_text += ' ' + line;
            currentClaim.claim_text += ' ' + line;
        }
    }
    
    if (currentClaim) {
        claims.push(currentClaim);
    }
    
    claims.sort((a, b) => a.claim_number - b.claim_number);
    
    claims.forEach(claim => {
        let refs = extractClaimReferences(claim.full_text);
        
        const resolved_refs = [];
        let has_all_prev = false;
        
        for (const ref of refs) {
            if (ref === 'all_prev') {
                has_all_prev = true;
            } else {
                resolved_refs.push(ref);
            }
        }
        
        if (has_all_prev) {
            for (const prev_claim of claims) {
                if (prev_claim.claim_number < claim.claim_number) {
                    resolved_refs.push(prev_claim.claim_number);
                }
            }
        }
        
        const unique_refs = [...new Set(resolved_refs)];
        unique_refs.sort((a, b) => a - b);
        
        claim.referenced_claims = unique_refs;
        claim.claim_type = unique_refs.length > 0 ? 'dependent' : 'independent';
        claim.language = 'zh';
        claim.confidence_score = 0.95;
    });
    
    return claims;
}

// 提取引用的权利要求编号
function extractClaimReferences(text) {
    const references = [];
    
    const patterns = [
        /根据(?:权利要求|前述权利要求|上述权利要求|前面的权利要求|前所述的权利要求|前权利要求)\s*(\d+(?:\s*[-至或、和,]\s*\d+)*)/g,
        /如(?:权利要求|前述权利要求|上述权利要求|前面的权利要求|前所述的权利要求|前权利要求)\s*(\d+(?:\s*[-至或、和,]\s*\d+)*)/g,
        /按照(?:权利要求|前述权利要求|上述权利要求|前面的权利要求|前所述的权利要求|前权利要求)\s*(\d+(?:\s*[-至或、和,]\s*\d+)*)/g,
        /依据(?:权利要求|前述权利要求|上述权利要求|前面的权利要求|前所述的权利要求|前权利要求)\s*(\d+(?:\s*[-至或、和,]\s*\d+)*)/g,
        /according\s+to\s+(?:claim|preceding\s+claim|above\s+claim|aforementioned\s+claim|said\s+preceding\s+claim)\s*(\d+(?:\s*[-or,and\s]+\d+)*)/gi,
        /of\s+(?:claim|preceding\s+claim|above\s+claim|aforementioned\s+claim|said\s+preceding\s+claim)\s*(\d+(?:\s*[-or,and\s]+\d+)*)/gi,
        /gemäß\s+(?:anspruch|vorstehender\s+anspruch|obiger\s+anspruch|vorgenannter\s+anspruch)\s*(\d+(?:\s*[-oder,und\s]+\d+)*)/gi,
        /請求項\s*(\d+(?:\s*[-または、及び,]\s*\d+)*)/g,
        /(?:claim|claims|anspruch|ansprüche)\s*(\d+(?:\s*[-or,and,oder,und,または、及び]\s*\d+)*)/gi
    ];
    
    patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const refText = match[1];
            const numbers = refText.match(/\d+/g);
            if (numbers) {
                numbers.forEach(num => {
                    const n = parseInt(num);
                    if (!references.includes(n)) {
                        references.push(n);
                    }
                });
            }
        }
    });
    
    if (references.length === 0) {
        const forwardReferenceKeywords = [
            '前述', '上述', '前面', '前所述', '前',
            'preceding', 'above', 'aforementioned', 'said preceding',
            'vorstehender', 'obiger', 'vorgenannter',
            'aforementioned'
        ];
        
        for (const keyword of forwardReferenceKeywords) {
            const regex = new RegExp(keyword, 'i');
            if (regex.test(text)) {
                references.push('all_prev');
                break;
            }
        }
    }
    
    return references;
}

// 显示文本分析结果
export function displayClaimsTextResults(state) {
    const totalClaims = state.textAnalyzedData.length;
    const independentClaims = state.textAnalyzedData.filter(c => c.claim_type === 'independent').length;
    const dependentClaims = totalClaims - independentClaims;
    
    document.getElementById('claims_text_stat_total').textContent = totalClaims;
    document.getElementById('claims_text_stat_independent').textContent = independentClaims;
    document.getElementById('claims_text_stat_dependent').textContent = dependentClaims;
    
    displayClaimsTextList(state.textAnalyzedData);
    renderClaimsTextVisualization(state);
    
    document.getElementById('claims_text_results').style.display = 'block';
    document.getElementById('claims_text_results').scrollIntoView({ behavior: 'smooth' });
}

// 显示权利要求列表
function displayClaimsTextList(claims) {
    const container = document.getElementById('claims_text_list');
    container.innerHTML = '';
    
    claims.forEach(claim => {
        const claimDiv = document.createElement('div');
        claimDiv.className = `claim-item ${claim.claim_type}`;
        
        const headerDiv = document.createElement('div');
        headerDiv.className = 'claim-header';
        
        const numberSpan = document.createElement('span');
        numberSpan.className = 'claim-number';
        numberSpan.textContent = `权利要求 ${claim.claim_number}`;
        
        const badgeSpan = document.createElement('span');
        badgeSpan.className = `claim-badge ${claim.claim_type}`;
        badgeSpan.textContent = claim.claim_type === 'independent' ? '独立权利要求' : '从属权利要求';
        
        headerDiv.appendChild(numberSpan);
        headerDiv.appendChild(badgeSpan);
        
        const textDiv = document.createElement('div');
        textDiv.className = 'claim-text';
        textDiv.textContent = claim.full_text;
        
        claimDiv.appendChild(headerDiv);
        claimDiv.appendChild(textDiv);
        
        if (claim.referenced_claims.length > 0) {
            const refsDiv = document.createElement('div');
            refsDiv.className = 'claim-references';
            refsDiv.innerHTML = `<strong>引用:</strong> 权利要求 ${claim.referenced_claims.join(', ')}`;
            claimDiv.appendChild(refsDiv);
        }
        
        container.appendChild(claimDiv);
    });
}

// 渲染可视化
export function renderClaimsTextVisualization(state) {
    const containerId = 'claims_text_visualization';
    const container = document.getElementById(containerId);
    const style = document.getElementById('claims_text_viz_style').value;
    
    if (!container) {
        console.error('找不到可视化容器');
        return;
    }
    
    const vizData = createClaimsTextVizData(state.textAnalyzedData);
    
    console.log('准备渲染文本分析可视化，样式:', style, '数据:', vizData);
    
    if (!state.textVisualizationRenderer) {
        // Import ClaimsD3TreeRenderer from visualization module
        import('./claims-visualization.js').then(module => {
            const { ClaimsD3TreeRenderer } = module;
            state.textVisualizationRenderer = new ClaimsD3TreeRenderer(containerId);
            state.textVisualizationRenderer.render(vizData, style);
        });
        return; // Exit early, render will happen in the promise
    }
    
    state.textVisualizationRenderer.render(vizData, style);
}

// 创建可视化数据
function createClaimsTextVizData(claims) {
    const nodes = [];
    const links = [];
    const nodes_map = {};
    
    claims.forEach(claim => {
        const node_id = `claim_${claim.claim_number}`;
        if (!nodes_map[node_id]) {
            const node = {
                id: node_id,
                claim_number: claim.claim_number,
                claim_text: claim.full_text,
                claim_type: claim.claim_type,
                level: claim.level || 0,
                dependencies: claim.referenced_claims || [],
                x: 0,
                y: 0
            };
            nodes.push(node);
            nodes_map[node_id] = node;
        }
    });
    
    const links_set = new Set();
    claims.forEach(claim => {
        if (claim.referenced_claims && claim.referenced_claims.length > 0) {
            claim.referenced_claims.forEach(ref => {
                if (ref === 'all_prev') {
                    claims.forEach(prev_claim => {
                        if (prev_claim.claim_number < claim.claim_number) {
                            const source_id = `claim_${prev_claim.claim_number}`;
                            const target_id = `claim_${claim.claim_number}`;
                            const link_key = `${source_id}_${target_id}`;
                            
                            if (!links_set.has(link_key) && nodes_map[source_id]) {
                                links.push({
                                    source: source_id,
                                    target: target_id,
                                    type: 'dependency'
                                });
                                links_set.add(link_key);
                            }
                        }
                    });
                } else {
                    const source_id = `claim_${ref}`;
                    const target_id = `claim_${claim.claim_number}`;
                    const link_key = `${source_id}_${target_id}`;
                    
                    if (!links_set.has(link_key) && nodes_map[source_id]) {
                        links.push({
                            source: source_id,
                            target: target_id,
                            type: 'dependency'
                        });
                        links_set.add(link_key);
                    }
                }
            });
        }
    });
    
    return {
        patent_number: 'text_analysis',
        nodes: nodes,
        links: links,
        metadata: {
            total_claims: claims.length,
            independent_claims: claims.filter(c => c.claim_type === 'independent').length,
            dependent_claims: claims.filter(c => c.claim_type === 'dependent').length
        }
    };
}

// 加载示例
export function loadClaimsTextExample() {
    const example = `1. 一种智能手机，其特征在于，包括：
   处理器，用于执行指令；
   存储器，与所述处理器连接，用于存储数据；
   显示屏，与所述处理器连接，用于显示信息；
   通信模块，与所述处理器连接，用于无线通信。

2. 根据权利要求1所述的智能手机，其特征在于，所述处理器为八核处理器。

3. 根据权利要求1或2所述的智能手机，其特征在于，所述存储器容量为8GB以上。

4. 根据权利要求1至3任一项所述的智能手机，其特征在于，所述显示屏为OLED显示屏。

5. 根据权利要求1所述的智能手机，其特征在于，还包括指纹识别模块。

6. 根据权利要求5所述的智能手机，其特征在于，所述指纹识别模块集成在所述显示屏下方。

7. 一种移动终端，其特征在于，包括：
   主控芯片；
   电源管理模块；
   天线模块。

8. 根据权利要求7所述的移动终端，其特征在于，所述天线模块支持5G通信。`;
    
    document.getElementById('claims_text_input').value = example;
    showClaimsTextMessage('示例已加载，点击"开始分析"按钮进行分析', 'info');
}

// 显示消息
export function showClaimsTextMessage(message, type = 'info') {
    const container = document.getElementById('claims_text_message');
    container.textContent = message;
    container.className = '';
    container.style.display = 'block';
    
    if (type === 'success') {
        container.style.background = '#d4edda';
        container.style.color = '#155724';
        container.style.border = '1px solid #c3e6cb';
    } else if (type === 'error') {
        container.style.background = '#f8d7da';
        container.style.color = '#721c24';
        container.style.border = '1px solid #f5c6cb';
    } else {
        container.style.background = '#d1ecf1';
        container.style.color = '#0c5460';
        container.style.border = '1px solid #bee5eb';
    }
    
    setTimeout(() => {
        container.style.display = 'none';
    }, 5000);
}


// 初始化文本分析功能
export function initClaimsTextAnalyzer(state) {
    const analyzeBtn = document.getElementById('claims_text_analyze_btn');
    const clearBtn = document.getElementById('claims_text_clear_btn');
    const exampleBtn = document.getElementById('claims_text_example_btn');
    const vizStyleSelect = document.getElementById('claims_text_viz_style');
    const spreadSlider = document.getElementById('claims_text_spread_slider');
    const spreadValue = document.getElementById('claims_text_spread_value');
    
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', () => analyzeClaimsText(state, showClaimsTextMessage, displayClaimsTextResults));
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            const input = document.getElementById('claims_text_input');
            if (input) input.value = '';
            const results = document.getElementById('claims_text_results');
            if (results) results.style.display = 'none';
            state.textAnalyzedData = [];
        });
    }
    
    if (exampleBtn) {
        exampleBtn.addEventListener('click', loadClaimsTextExample);
    }
    
    if (vizStyleSelect) {
        vizStyleSelect.addEventListener('change', () => {
            if (state.textVisualizationRenderer && state.textAnalyzedData.length > 0) {
                renderClaimsTextVisualization(state);
            }
        });
    }
    
    if (spreadSlider) {
        spreadSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (spreadValue) {
                spreadValue.textContent = value.toFixed(1) + 'x';
            }
            if (state.textVisualizationRenderer) {
                state.textVisualizationRenderer.setTreeSpreadFactor(value);
            }
        });
    }
    
    // 缩放控制
    const zoomInBtn = document.getElementById('claims_text_zoom_in');
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            if (state.textVisualizationRenderer) state.textVisualizationRenderer.zoomIn();
        });
    }
    
    const zoomOutBtn = document.getElementById('claims_text_zoom_out');
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            if (state.textVisualizationRenderer) state.textVisualizationRenderer.zoomOut();
        });
    }
    
    const resetZoomBtn = document.getElementById('claims_text_zoom_reset');
    if (resetZoomBtn) {
        resetZoomBtn.addEventListener('click', () => {
            if (state.textVisualizationRenderer) state.textVisualizationRenderer.resetZoom();
        });
    }
    
    const centerBtn = document.getElementById('claims_text_center');
    if (centerBtn) {
        centerBtn.addEventListener('click', () => {
            if (state.textVisualizationRenderer) state.textVisualizationRenderer.centerView();
        });
    }
    
    const screenshotBtn = document.getElementById('claims_text_screenshot');
    if (screenshotBtn) {
        screenshotBtn.addEventListener('click', () => {
            if (state.textVisualizationRenderer) state.textVisualizationRenderer.takeScreenshot();
        });
    }
}
