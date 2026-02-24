// js/familyClaimsComparison.js (v1.0 - 同族权利要求对比分析)

/**
 * 功能四子标签页：同族权利要求对比分析
 * 融合功能四的多权利要求对比功能和功能五的专利同族信息爬取功能
 */

// DOM元素引用
let familyPatentNumberInput, fetchFamilyBtn, familyListContainer, familyPatentsGrid;
let selectAllFamilyBtn, deselectAllFamilyBtn, familyCompareBtn, familyComparisonModelSelect;
let familyLoadingOverlay, familyLoadingText, familyComparisonResultContainer;
let familyViewModeBtns, familyToggleLanguageBtn, familyExportComparisonBtn;
let familyComparisonStatsPanel, familyStatSimilar, familyStatDifferent, familyStatSimilarity;

/**
 * 初始化同族权利要求对比功能
 */
function initFamilyClaimsComparison() {
    console.log('🚀 初始化同族权利要求对比功能...');
    
    // 获取DOM元素
    familyPatentNumberInput = document.getElementById('family_patent_number');
    fetchFamilyBtn = document.getElementById('fetch_family_btn');
    familyListContainer = document.getElementById('family_list_container');
    familyPatentsGrid = document.getElementById('family_patents_grid');
    selectAllFamilyBtn = document.getElementById('select_all_family_btn');
    deselectAllFamilyBtn = document.getElementById('deselect_all_family_btn');
    familyCompareBtn = document.getElementById('family_compare_btn');
    familyComparisonModelSelect = document.getElementById('family_comparison_model_select');
    familyLoadingOverlay = document.getElementById('family_loading_overlay');
    familyLoadingText = document.getElementById('family_loading_text');
    familyComparisonResultContainer = document.getElementById('family_comparison_result_container');
    familyViewModeBtns = document.querySelectorAll('#family_comparison_result_container .view-btn, .result-controls .view-btn');
    familyToggleLanguageBtn = document.getElementById('family_toggle_language_btn');
    familyExportComparisonBtn = document.getElementById('family_export_comparison_btn');
    familyComparisonStatsPanel = document.getElementById('family_comparison_stats_panel');
    familyStatSimilar = document.getElementById('family_stat_similar');
    familyStatDifferent = document.getElementById('family_stat_different');
    familyStatSimilarity = document.getElementById('family_stat_similarity');

    // 检查必需元素
    if (!familyPatentNumberInput || !fetchFamilyBtn || !familyListContainer) {
        console.error('❌ 同族权利要求对比功能必需元素未找到');
        return;
    }

    // 绑定事件
    fetchFamilyBtn.addEventListener('click', fetchFamilyPatents);
    selectAllFamilyBtn.addEventListener('click', selectAllFamilyPatents);
    deselectAllFamilyBtn.addEventListener('click', deselectAllFamilyPatents);
    familyCompareBtn.addEventListener('click', compareFamilyClaims);

    // 视图模式切换
    familyViewModeBtns.forEach(btn => {
        btn.addEventListener('click', () => handleFamilyViewModeChange(btn.dataset.view));
    });

    // 语言切换和导出
    if (familyToggleLanguageBtn) {
        familyToggleLanguageBtn.addEventListener('click', toggleFamilyDisplayLanguage);
    }
    if (familyExportComparisonBtn) {
        familyExportComparisonBtn.addEventListener('click', exportFamilyComparisonReport);
    }

    // 初始化模型选择器
    initFamilyComparisonModelSelector();

    // 监听模型配置加载完成事件
    window.addEventListener('modelsConfigLoaded', () => {
        console.log('📡 同族权利要求对比收到模型配置加载完成事件');
        initFamilyComparisonModelSelector();
    });

    console.log('✅ 同族权利要求对比功能初始化完成');
}

/**
 * 初始化模型选择器
 */
function initFamilyComparisonModelSelector() {
    if (!familyComparisonModelSelect) return;

    const models = window.AVAILABLE_MODELS || ["glm-4-flash", "glm-4-long", "glm-4.7-flash"];

    const currentValue = familyComparisonModelSelect.value;
    familyComparisonModelSelect.innerHTML = models.map(m => `<option value="${m}">${m}</option>`).join('');

    if (currentValue && models.includes(currentValue)) {
        familyComparisonModelSelect.value = currentValue;
    } else {
        familyComparisonModelSelect.value = models[0];
    }

    console.log('✅ 同族权利要求对比模型选择器已初始化');
}

/**
 * 获取同族专利列表
 */
async function fetchFamilyPatents() {
    const patentNumber = familyPatentNumberInput.value.trim();

    if (!patentNumber) {
        alert('请输入专利号');
        return;
    }

    try {
        showFamilyLoading('正在获取同族专利列表...');

        const response = await fetch(`/api/patent/family/${encodeURIComponent(patentNumber)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`获取同族列表失败: ${response.status}`);
        }

        const result = await response.json();

        if (result.error) {
            throw new Error(result.error);
        }

        // API返回的数据在 result.data 中
        const data = result.data || {};

        // 保存同族专利数据到状态
        appState.familyClaimsComparison = {
            basePatent: data.basePatent,
            familyPatents: data.familyPatents || [],
            selectedPatents: [],
            analysisResult: null,
            viewMode: 'card',
            displayLang: 'translated',
            isLoading: false,
            error: null
        };

        // 渲染同族专利列表
        renderFamilyPatentsGrid(data.familyPatents || []);

        // 显示列表容器
        familyListContainer.style.display = 'block';

        // 清空之前的结果
        clearFamilyComparisonResult();

    } catch (error) {
        console.error('获取同族专利列表失败:', error);
        alert(`获取同族专利列表失败: ${error.message}`);
    } finally {
        hideFamilyLoading();
    }
}

/**
 * 渲染同族专利网格
 */
function renderFamilyPatentsGrid(patents) {
    familyPatentsGrid.innerHTML = '';

    patents.forEach((patent, index) => {
        const card = createFamilyPatentCard(patent, index);
        familyPatentsGrid.appendChild(card);
    });

    // 更新对比按钮状态
    updateFamilyCompareButton();
}

/**
 * 创建同族专利卡片
 */
function createFamilyPatentCard(patent, index) {
    const card = document.createElement('div');
    card.className = 'family-patent-card';
    card.dataset.patentNumber = patent.patent_number;
    card.dataset.index = index;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'family-patent-checkbox';
    checkbox.dataset.patentNumber = patent.patent_number;
    checkbox.addEventListener('change', (e) => handleFamilyPatentSelection(e, patent));

    const header = document.createElement('div');
    header.className = 'family-patent-header';

    const number = document.createElement('div');
    number.className = 'family-patent-number';
    number.textContent = patent.patent_number;

    header.appendChild(checkbox);
    header.appendChild(number);

    const title = document.createElement('div');
    title.className = 'family-patent-title';
    title.textContent = patent.title || '无标题';

    const info = document.createElement('div');
    info.className = 'family-patent-info';

    if (patent.publication_date) {
        const pubDate = document.createElement('div');
        pubDate.className = 'family-patent-info-item';
        pubDate.textContent = `公开日期: ${patent.publication_date}`;
        info.appendChild(pubDate);
    }

    if (patent.language) {
        const lang = document.createElement('div');
        lang.className = 'family-patent-info-item';
        lang.textContent = `语言: ${patent.language}`;
        info.appendChild(lang);
    }

    card.appendChild(header);
    card.appendChild(title);
    card.appendChild(info);

    // 点击卡片也可以切换选择状态
    card.addEventListener('click', (e) => {
        if (e.target !== checkbox) {
            checkbox.checked = !checkbox.checked;
            handleFamilyPatentSelection({ target: checkbox }, patent);
        }
    });

    return card;
}

/**
 * 处理同族专利选择
 */
function handleFamilyPatentSelection(event, patent) {
    const checkbox = event.target;
    const card = checkbox.closest('.family-patent-card');
    const patentNumber = patent.patent_number;

    if (checkbox.checked) {
        appState.familyClaimsComparison.selectedPatents.push(patent);
        card.classList.add('selected');
    } else {
        appState.familyClaimsComparison.selectedPatents = appState.familyClaimsComparison.selectedPatents.filter(
            p => p.patent_number !== patentNumber
        );
        card.classList.remove('selected');
    }

    updateFamilyCompareButton();
}

/**
 * 全选同族专利
 */
function selectAllFamilyPatents() {
    const checkboxes = familyPatentsGrid.querySelectorAll('.family-patent-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
        const card = checkbox.closest('.family-patent-card');
        card.classList.add('selected');
    });

    appState.familyClaimsComparison.selectedPatents = [...appState.familyClaimsComparison.familyPatents];
    updateFamilyCompareButton();
}

/**
 * 取消全选
 */
function deselectAllFamilyPatents() {
    const checkboxes = familyPatentsGrid.querySelectorAll('.family-patent-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
        const card = checkbox.closest('.family-patent-card');
        card.classList.remove('selected');
    });

    appState.familyClaimsComparison.selectedPatents = [];
    updateFamilyCompareButton();
}

/**
 * 更新对比按钮状态
 */
function updateFamilyCompareButton() {
    const selectedCount = appState.familyClaimsComparison.selectedPatents.length;
    familyCompareBtn.disabled = selectedCount < 2;

    if (selectedCount >= 2) {
        familyCompareBtn.textContent = `开始对比分析 (${selectedCount}个专利)`;
    } else {
        familyCompareBtn.textContent = '开始对比分析';
    }
}

/**
 * 对比同族专利的权利要求
 */
async function compareFamilyClaims() {
    const selectedPatents = appState.familyClaimsComparison.selectedPatents;

    if (selectedPatents.length < 2) {
        alert('请至少选择2个专利进行对比');
        return;
    }

    try {
        showFamilyLoading('正在对比同族专利权利要求...');

        const model = familyComparisonModelSelect.value;
        const patentNumbers = selectedPatents.map(p => p.patent_number);

        // 从 appState 获取 API Key
        const apiKey = appState.apiKey || localStorage.getItem('api_key') || '';

        const response = await fetch('/api/patent/family/compare', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            credentials: 'include',
            body: JSON.stringify({
                patent_numbers: patentNumbers,
                model: model
            })
        });

        if (!response.ok) {
            throw new Error(`对比失败: ${response.status}`);
        }

        const result = await response.json();

        if (result.error) {
            throw new Error(result.error);
        }

        // API返回的数据在 result.data 中
        const data = result.data || {};
        const analysisResult = data.result || {};

        // 保存对比结果
        appState.familyClaimsComparison.analysisResult = analysisResult;

        // 渲染对比结果
        renderFamilyComparisonResult(analysisResult);

        // 显示控制按钮
        familyToggleLanguageBtn.style.display = 'inline-block';
        familyExportComparisonBtn.style.display = 'inline-block';

    } catch (error) {
        console.error('对比同族专利权利要求失败:', error);
        alert(`对比失败: ${error.message}`);
    } finally {
        hideFamilyLoading();
    }
}

/**
 * 渲染同族对比结果
 */
function renderFamilyComparisonResult(result) {
    familyComparisonResultContainer.innerHTML = '';

    // 显示统计面板
    if (result.overall_summary) {
        familyComparisonStatsPanel.style.display = 'flex';
        updateFamilyStatsPanel(result);
    }

    // 根据视图模式渲染
    const viewMode = appState.familyClaimsComparison.viewMode;

    switch (viewMode) {
        case 'card':
            renderFamilyCardView(result);
            break;
        case 'sideBySide':
            renderFamilySideBySideView(result);
            break;
        case 'matrix':
            renderFamilyMatrixView(result);
            break;
    }
}

/**
 * 更新统计面板
 */
function updateFamilyStatsPanel(result) {
    let totalSimilar = 0;
    let totalDifferent = 0;
    let totalSimilarity = 0;

    if (result.comparison_matrix) {
        result.comparison_matrix.forEach(item => {
            totalSimilar += item.similar_features?.length || 0;
            totalDifferent += item.different_features?.length || 0;
            totalSimilarity += item.similarity_score || 0;
        });

        const avgSimilarity = result.comparison_matrix.length > 0
            ? (totalSimilarity / result.comparison_matrix.length * 100).toFixed(0)
            : 0;

        familyStatSimilar.textContent = totalSimilar;
        familyStatDifferent.textContent = totalDifferent;
        familyStatSimilarity.textContent = `${avgSimilarity}%`;
    }
}

/**
 * 渲染卡片视图
 */
function renderFamilyCardView(result) {
    if (!result || !result.comparison_matrix) {
        familyComparisonResultContainer.innerHTML = '<div class="info error">无对比数据</div>';
        return;
    }

    // 添加AI生成声明
    const disclaimer = document.createElement('div');
    disclaimer.className = 'ai-disclaimer';
    disclaimer.innerHTML = '<strong>AI生成内容：</strong>以下对比分析由AI生成，仅供参考，请结合实际情况判断使用。';
    disclaimer.style.cssText = 'background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 14px; color: #856404;';

    familyComparisonResultContainer.innerHTML = '';
    familyComparisonResultContainer.appendChild(disclaimer);

    let html = '';

    result.comparison_matrix.forEach(pair => {
        const similarityPercent = Math.round(pair.similarity_score * 100);
        const [claim1, claim2] = pair.claim_pair;

        html += `
            <div class="comparison-card" style="background: var(--surface-color); border: 1px solid var(--border-color); border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
                <div class="comparison-card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid var(--border-color);">
                    <h3 style="margin: 0; font-size: 18px; color: var(--text-color);">${claim1} vs ${claim2}</h3>
                    <span class="similarity-badge" style="background: var(--primary-color); color: white; padding: 6px 12px; border-radius: 20px; font-weight: 600; font-size: 14px;">相似度: ${similarityPercent}%</span>
                </div>
                <div class="comparison-card-body">
                    <div class="comparison-section-v2" style="margin-bottom: 20px;">
                        <h4 style="margin: 0 0 12px 0; font-size: 16px; color: var(--text-color);"><span class="icon-match" style="margin-right: 8px;">✅</span> 相同特征</h4>
                        <table class="features-table" style="width: 100%; border-collapse: collapse;">
                            <tbody>
                                ${pair.similar_features && pair.similar_features.length > 0 ?
                                  pair.similar_features.map(item => `
                                    <tr class="similar-row" style="background: rgba(34, 197, 94, 0.1);">
                                        <td style="padding: 10px; border: 1px solid var(--border-color); border-radius: 4px;">${item.feature}</td>
                                    </tr>
                                  `).join('') :
                                  '<tr><td class="no-data" style="padding: 10px; text-align: center; color: #666; font-style: italic;">无完全相同的技术特征</td></tr>'
                                }
                            </tbody>
                        </table>
                    </div>
                    <div class="comparison-section-v2">
                        <h4 style="margin: 0 0 12px 0; font-size: 16px; color: var(--text-color);"><span class="icon-diff" style="margin-right: 8px;">⚠️</span> 差异特征</h4>
                        <table class="features-table diff-table" style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: var(--primary-color); color: white;">
                                    <th style="padding: 10px; text-align: left; border: 1px solid var(--border-color);">${claim1}</th>
                                    <th style="padding: 10px; text-align: left; border: 1px solid var(--border-color);">${claim2}</th>
                                    <th style="padding: 10px; text-align: left; border: 1px solid var(--border-color);">差异分析</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${pair.different_features && pair.different_features.length > 0 ?
                                  pair.different_features.map(item => `
                                    <tr class="different-row" style="background: rgba(239, 68, 68, 0.05);">
                                        <td style="padding: 10px; border: 1px solid var(--border-color); vertical-align: top;">${item.claim_1_feature}</td>
                                        <td style="padding: 10px; border: 1px solid var(--border-color); vertical-align: top;">${item.claim_2_feature}</td>
                                        <td class="analysis-cell" style="padding: 10px; border: 1px solid var(--border-color); vertical-align: top; background: rgba(59, 130, 246, 0.05);">${item.analysis}</td>
                                    </tr>
                                  `).join('') :
                                  '<tr><td colspan="3" class="no-data" style="padding: 10px; text-align: center; color: #666; font-style: italic;">未发现显著差异</td></tr>'
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    });

    if (result.overall_summary) {
        html += `
            <div class="comparison-card" style="background: var(--surface-color); border: 1px solid var(--border-color); border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
                <div class="comparison-card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid var(--border-color);">
                    <h3 style="margin: 0; font-size: 18px; color: var(--text-color);">整体对比总结</h3>
                </div>
                <div class="comparison-card-body">
                    <p style="line-height: 1.6; margin: 0;">${result.overall_summary}</p>
                </div>
            </div>
        `;
    }

    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = html;
    familyComparisonResultContainer.appendChild(contentDiv);
}

/**
 * 渲染并排对比视图
 * 与手动输入对比的并排视图保持一致：显示原始权利要求文本
 */
function renderFamilySideBySideView(result) {
    // 从结果中获取原始权利要求数据
    const patentClaims = result.patent_claims || {};
    const patentNumbers = Object.keys(patentClaims);

    if (patentNumbers.length < 2) {
        familyComparisonResultContainer.innerHTML = '<div class="info error">暂无权利要求数据，无法进行并排对比</div>';
        return;
    }

    // 添加AI生成声明
    const disclaimer = document.createElement('div');
    disclaimer.className = 'ai-disclaimer';
    disclaimer.innerHTML = '<strong>AI生成内容：</strong>以下对比分析由AI生成，仅供参考，请结合实际情况判断使用。';
    disclaimer.style.cssText = 'background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 14px; color: #856404;';

    familyComparisonResultContainer.innerHTML = '';
    familyComparisonResultContainer.appendChild(disclaimer);

    // 构建并排视图HTML - 与手动输入对比保持一致
    let html = '<div class="side-by-side-view" style="border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden;">';

    // 头部：显示专利号
    html += '<div class="side-by-side-header" style="display: grid; grid-template-columns: repeat(' + patentNumbers.length + ', 1fr); background: var(--primary-color); color: white;">';
    patentNumbers.forEach(patentNumber => {
        html += `<div class="claim-label" style="padding: 15px; text-align: center; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.3);">${patentNumber}</div>`;
    });
    html += '</div>';

    // 主体：显示权利要求文本
    html += '<div class="side-by-side-body" id="family-side-by-side-container" style="display: grid; grid-template-columns: repeat(' + patentNumbers.length + ', 1fr); max-height: 600px; overflow: hidden;">';
    patentNumbers.forEach((patentNumber, index) => {
        const patentData = patentClaims[patentNumber];
        const claimsText = patentData && patentData.claims ? patentData.claims.join('\n\n') : '暂无权利要求数据';
        const formattedText = formatFamilyClaimTextForDisplay(claimsText);
        html += `<div class="claim-text-column" data-column="${index}" style="padding: 20px; border-right: 1px solid var(--border-color); overflow-y: auto; max-height: 600px; line-height: 1.8; white-space: pre-wrap;">${formattedText}</div>`;
    });
    html += '</div>';
    html += '</div>';

    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = html;
    familyComparisonResultContainer.appendChild(contentDiv);

    // 添加同步滚动功能
    setupFamilySyncScroll();
}

/**
 * 设置同步滚动
 */
function setupFamilySyncScroll() {
    const container = document.getElementById('family-side-by-side-container');
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
 */
function formatFamilyClaimTextForDisplay(text) {
    if (!text) return '';

    // 按权利要求分隔符分割
    const sections = text.split(/\n*---\n*/);

    let formattedSections = sections.map(section => {
        let formatted = section.trim();

        // 如果文本不是以序号开头，直接返回
        if (!/^\d+\s*[.、．]/.test(formatted)) {
            return formatted;
        }

        // 将长段落按句子分割，便于阅读
        formatted = formatted.replace(/([；;：:])/g, '$1\n');

        // 在关键词后换行
        formatted = formatted.replace(/(其特征在于[，,]?|包括[：:]?|comprising[：:]?|characterized in that[，,]?)/gi, '$1\n');

        return formatted;
    }).join('\n\n---\n\n');

    return formattedSections;
}

/**
 * 渲染矩阵视图
 * 与手动输入对比的矩阵视图保持一致：显示相似度矩阵，支持点击跳转到卡片视图
 */
function renderFamilyMatrixView(result) {
    const selectedPatents = appState.familyClaimsComparison.selectedPatents;

    if (!result || !result.comparison_matrix || !selectedPatents || selectedPatents.length < 2) {
        familyComparisonResultContainer.innerHTML = '<div class="info error">无对比数据</div>';
        return;
    }

    // 添加AI生成声明
    const disclaimer = document.createElement('div');
    disclaimer.className = 'ai-disclaimer';
    disclaimer.innerHTML = '<strong>AI生成内容：</strong>以下对比分析由AI生成，仅供参考，请结合实际情况判断使用。';
    disclaimer.style.cssText = 'background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 14px; color: #856404;';

    familyComparisonResultContainer.innerHTML = '';
    familyComparisonResultContainer.appendChild(disclaimer);

    // 构建相似度矩阵 - 与手动输入对比保持一致
    const matrix = {};
    result.comparison_matrix.forEach(pair => {
        const key = `${pair.claim_pair[0]}-${pair.claim_pair[1]}`;
        matrix[key] = {
            score: pair.similarity_score,
            data: pair
        };
    });

    // 构建矩阵表格HTML
    let html = '<div class="matrix-view" style="overflow-x: auto;"><table class="matrix-table" style="width: 100%; border-collapse: collapse; background: var(--surface-color); border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden;">';

    // 表头
    html += '<thead><tr><th style="padding: 12px; text-align: center; border: 1px solid var(--border-color); background: var(--primary-color); color: white; font-weight: 600;"></th>';
    selectedPatents.forEach(patent => {
        html += `<th style="padding: 12px; text-align: center; border: 1px solid var(--border-color); background: var(--primary-color); color: white; font-weight: 600;">${patent.patent_number}</th>`;
    });
    html += '</tr></thead><tbody>';

    // 表格主体 - 只显示上三角部分（i < j），避免重复
    selectedPatents.forEach((patent1, i) => {
        html += `<tr><th style="padding: 12px; text-align: center; border: 1px solid var(--border-color); background: var(--primary-color); color: white; font-weight: 600;">${patent1.patent_number}</th>`;
        selectedPatents.forEach((patent2, j) => {
            if (i === j) {
                // 对角线显示"-"
                html += '<td style="padding: 12px; text-align: center; border: 1px solid var(--border-color); background: #f3f4f6; color: #9ca3af;">-</td>';
            } else if (i < j) {
                // 上三角：显示相似度数据
                const key1 = `${patent1.patent_number}-${patent2.patent_number}`;
                const key2 = `${patent2.patent_number}-${patent1.patent_number}`;
                const matrixData = matrix[key1] || matrix[key2];
                const score = matrixData ? matrixData.score : 0;
                const percent = Math.round(score * 100);

                // 根据相似度设置单元格样式
                let cellStyle = 'padding: 12px; text-align: center; border: 1px solid var(--border-color); font-weight: 600; cursor: pointer; transition: all 0.2s;';
                if (score > 0.7) {
                    cellStyle += ' background: rgba(34, 197, 94, 0.2); color: #166534;';
                } else if (score > 0.4) {
                    cellStyle += ' background: rgba(234, 179, 8, 0.2); color: #854d0e;';
                } else {
                    cellStyle += ' background: rgba(239, 68, 68, 0.2); color: #991b1b;';
                }

                html += `<td style="${cellStyle}" onclick="jumpToFamilyCardView('${key1}')">${percent}%</td>`;
            } else {
                // 下三角：显示为空
                html += '<td style="padding: 12px; text-align: center; border: 1px solid var(--border-color); background: #f9fafb;"></td>';
            }
        });
        html += '</tr>';
    });

    html += '</tbody></table></div>';

    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = html;
    familyComparisonResultContainer.appendChild(contentDiv);
}

/**
 * 从矩阵视图跳转到卡片视图的对应对比
 */
function jumpToFamilyCardView(pairKey) {
    // 切换到卡片视图
    appState.familyClaimsComparison.viewMode = 'card';
    familyViewModeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === 'card');
    });

    // 渲染卡片视图
    renderFamilyComparisonResult(appState.familyClaimsComparison.analysisResult);

    // 滚动到对应的卡片
    setTimeout(() => {
        const cards = familyComparisonResultContainer.querySelectorAll('.comparison-card');
        for (let card of cards) {
            const header = card.querySelector('.comparison-card-header h3');
            if (header && (header.textContent.includes(pairKey.replace('-', ' vs ')) ||
                header.textContent.includes(pairKey.split('-').reverse().join(' vs ')))) {
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
 * 获取矩阵单元格样式类
 */
function getMatrixCellClass(score) {
    if (score >= 0.7) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
}

/**
 * 处理视图模式切换
 */
function handleFamilyViewModeChange(viewMode) {
    appState.familyClaimsComparison.viewMode = viewMode;

    familyViewModeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === viewMode);
    });

    if (appState.familyClaimsComparison.analysisResult) {
        renderFamilyComparisonResult(appState.familyClaimsComparison.analysisResult);
    }
}

/**
 * 切换显示语言
 */
function toggleFamilyDisplayLanguage() {
    const currentLang = appState.familyClaimsComparison.displayLang;
    appState.familyClaimsComparison.displayLang = currentLang === 'translated' ? 'original' : 'translated';

    familyToggleLanguageBtn.textContent = currentLang === 'translated' ? '切换为原文' : '切换为译文';

    if (appState.familyClaimsComparison.analysisResult) {
        renderFamilyComparisonResult(appState.familyClaimsComparison.analysisResult);
    }
}

/**
 * 导出对比报告
 */
function exportFamilyComparisonReport() {
    const result = appState.familyClaimsComparison.analysisResult;

    if (!result) {
        alert('没有可导出的对比结果');
        return;
    }

    let markdown = '# 同族权利要求对比报告\n\n';

    if (result.overall_summary) {
        markdown += `## 整体总结\n\n${result.overall_summary}\n\n`;
    }

    if (result.comparison_matrix) {
        markdown += '## 详细对比\n\n';

        result.comparison_matrix.forEach((item, index) => {
            const [claim1, claim2] = item.claim_pair;
            markdown += `### ${claim1} vs ${claim2}\n\n`;
            markdown += `**相似度**: ${(item.similarity_score * 100).toFixed(0)}%\n\n`;

            markdown += '#### 相同特征\n\n';
            if (item.similar_features?.length > 0) {
                item.similar_features.forEach(f => {
                    markdown += `- ${f.feature}\n`;
                });
            } else {
                markdown += '无\n';
            }
            markdown += '\n';

            markdown += '#### 差异特征\n\n';
            if (item.different_features?.length > 0) {
                item.different_features.forEach(f => {
                    markdown += `- **${claim1}**: ${f.claim_1_feature}\n`;
                    markdown += `- **${claim2}**: ${f.claim_2_feature}\n`;
                    markdown += `- **分析**: ${f.analysis}\n\n`;
                });
            } else {
                markdown += '无\n\n';
            }
        });
    }

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '同族权利要求对比报告.md';
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * 清空对比结果
 */
function clearFamilyComparisonResult() {
    familyComparisonResultContainer.innerHTML = `
        <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <p>请勾选需要对比的同族专利</p>
        </div>
    `;

    familyComparisonStatsPanel.style.display = 'none';
    familyToggleLanguageBtn.style.display = 'none';
    familyExportComparisonBtn.style.display = 'none';
}

/**
 * 显示加载状态
 */
function showFamilyLoading(text) {
    familyLoadingText.textContent = text;
    familyLoadingOverlay.style.display = 'flex';
}

/**
 * 隐藏加载状态
 */
function hideFamilyLoading() {
    familyLoadingOverlay.style.display = 'none';
}