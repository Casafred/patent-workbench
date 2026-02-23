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
    familyViewModeBtns = document.querySelectorAll('#family_claims_comparison-tab .view-btn');
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

        const response = await fetch('/api/patent/family/compare', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                patent_numbers: patentNumbers,
                model: model
            })
        });

        if (!response.ok) {
            throw new Error(`对比失败: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        // 保存对比结果
        appState.familyClaimsComparison.analysisResult = data.result;

        // 渲染对比结果
        renderFamilyComparisonResult(data.result);

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
    const container = document.createElement('div');
    container.className = 'comparison-cards-container';

    if (result.comparison_matrix) {
        result.comparison_matrix.forEach((item, index) => {
            const card = createFamilyComparisonCard(item, index);
            container.appendChild(card);
        });
    }

    if (result.overall_summary) {
        const summaryCard = document.createElement('div');
        summaryCard.className = 'comparison-card';
        summaryCard.innerHTML = `
            <div class="card-header">
                <h4>整体对比总结</h4>
            </div>
            <div class="card-content">
                <p>${result.overall_summary}</p>
            </div>
        `;
        container.appendChild(summaryCard);
    }

    familyComparisonResultContainer.appendChild(container);
}

/**
 * 创建同族对比卡片
 */
function createFamilyComparisonCard(item, index) {
    const card = document.createElement('div');
    card.className = 'comparison-card';

    const [claim1, claim2] = item.claim_pair;

    card.innerHTML = `
        <div class="card-header">
            <h4>${claim1} vs ${claim2}</h4>
            <div class="similarity-score">
                相似度: ${(item.similarity_score * 100).toFixed(0)}%
            </div>
        </div>
        <div class="card-content">
            <div class="features-section">
                <h5>相同特征</h5>
                <ul>
                    ${item.similar_features?.map(f => `<li>${f.feature}</li>`).join('') || '<li>无</li>'}
                </ul>
            </div>
            <div class="features-section">
                <h5>差异特征</h5>
                <ul>
                    ${item.different_features?.map(f => `
                        <li>
                            <strong>${claim1}:</strong> ${f.claim_1_feature}<br>
                            <strong>${claim2}:</strong> ${f.claim_2_feature}<br>
                            <em>${f.analysis}</em>
                        </li>
                    `).join('') || '<li>无</li>'}
                </ul>
            </div>
        </div>
    `;

    return card;
}

/**
 * 渲染并排对比视图
 */
function renderFamilySideBySideView(result) {
    const container = document.createElement('div');
    container.className = 'side-by-side-view';

    if (result.comparison_matrix) {
        result.comparison_matrix.forEach((item, index) => {
            const row = document.createElement('div');
            row.className = 'side-by-side-row';

            const [claim1, claim2] = item.claim_pair;

            row.innerHTML = `
                <div class="side-by-side-col">
                    <h4>${claim1}</h4>
                    <ul>
                        ${item.similar_features?.map(f => `<li>${f.feature}</li>`).join('') || ''}
                    </ul>
                </div>
                <div class="side-by-side-col">
                    <h4>${claim2}</h4>
                    <ul>
                        ${item.similar_features?.map(f => `<li>${f.feature}</li>`).join('') || ''}
                    </ul>
                </div>
            `;

            container.appendChild(row);
        });
    }

    familyComparisonResultContainer.appendChild(container);
}

/**
 * 渲染矩阵视图
 */
function renderFamilyMatrixView(result) {
    const container = document.createElement('div');
    container.className = 'matrix-view';

    if (result.comparison_matrix) {
        const table = document.createElement('table');
        table.className = 'matrix-table';

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = '<th></th>';

        const uniqueClaims = [...new Set(result.comparison_matrix.flatMap(item => item.claim_pair))];
        uniqueClaims.forEach(claim => {
            const th = document.createElement('th');
            th.textContent = claim;
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');

        uniqueClaims.forEach((rowClaim, rowIndex) => {
            const tr = document.createElement('tr');
            const th = document.createElement('th');
            th.textContent = rowClaim;
            tr.appendChild(th);

            uniqueClaims.forEach((colClaim, colIndex) => {
                if (rowIndex === colIndex) {
                    const td = document.createElement('td');
                    td.className = 'matrix-cell-diagonal';
                    td.textContent = '-';
                    tr.appendChild(td);
                } else if (rowIndex < colIndex) {
                    const item = result.comparison_matrix.find(
                        m => m.claim_pair.includes(rowClaim) && m.claim_pair.includes(colClaim)
                    );

                    const td = document.createElement('td');
                    if (item) {
                        const score = item.similarity_score || 0;
                        td.className = `matrix-cell-${getMatrixCellClass(score)}`;
                        td.textContent = `${(score * 100).toFixed(0)}%`;
                    } else {
                        td.textContent = '-';
                    }
                    tr.appendChild(td);
                } else {
                    const td = document.createElement('td');
                    td.className = 'matrix-cell-empty';
                    td.textContent = '';
                    tr.appendChild(td);
                }
            });

            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        container.appendChild(table);
    }

    familyComparisonResultContainer.appendChild(container);
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