// js/familyClaimsComparison.js (v1.1 - 同族权利要求对比分析)

/**
 * 功能四子标签页：同族权利要求对比分析
 * 融合功能四的多权利要求对比功能和功能五的专利同族信息爬取功能
 * v1.1: 新增手动输入专利号功能
 */

// DOM元素引用
let familyPatentNumberInput, fetchFamilyBtn, familyListContainer, familyPatentsGrid;
let selectAllFamilyBtn, deselectAllFamilyBtn, familyCompareBtn, familyComparisonModelSelect;
let familyLoadingOverlay, familyLoadingText, familyComparisonResultContainer;
let familyViewModeBtns, familyToggleLanguageBtn, familyExportComparisonBtn;
let familyComparisonStatsPanel, familyStatSimilar, familyStatDifferent, familyStatSimilarity;
// 手动输入模式相关元素
let manualPatentNumbersTextarea, addManualPatentsBtn, clearManualInputBtn, clearFamilyListBtn;
// 输入模式标签
let familyModeTabs;

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

    // 手动输入模式元素
    manualPatentNumbersTextarea = document.getElementById('manual_patent_numbers');
    addManualPatentsBtn = document.getElementById('add_manual_patents_btn');
    clearManualInputBtn = document.getElementById('clear_manual_input_btn');
    clearFamilyListBtn = document.getElementById('clear_family_list_btn');
    familyModeTabs = document.querySelectorAll('.family-mode-tab');

    // 检查必需元素
    if (!familyListContainer) {
        console.error('❌ 同族权利要求对比功能必需元素未找到');
        return;
    }

    // 绑定事件 - 自动获取模式
    if (fetchFamilyBtn) {
        fetchFamilyBtn.addEventListener('click', fetchFamilyPatents);
    }

    // 绑定事件 - 手动输入模式
    if (addManualPatentsBtn) {
        addManualPatentsBtn.addEventListener('click', addManualPatents);
    }
    if (clearManualInputBtn) {
        clearManualInputBtn.addEventListener('click', clearManualInput);
    }
    if (clearFamilyListBtn) {
        clearFamilyListBtn.addEventListener('click', clearFamilyList);
    }

    // 绑定事件 - 列表操作
    selectAllFamilyBtn.addEventListener('click', selectAllFamilyPatents);
    deselectAllFamilyBtn.addEventListener('click', deselectAllFamilyPatents);
    familyCompareBtn.addEventListener('click', compareFamilyClaims);

    // 绑定事件 - 输入模式切换
    familyModeTabs.forEach(tab => {
        tab.addEventListener('click', () => switchFamilyInputMode(tab.dataset.mode));
    });

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

    // 初始化状态
    if (!appState.familyClaimsComparison) {
        appState.familyClaimsComparison = {
            basePatent: null,
            familyPatents: [],
            selectedPatents: [],
            analysisResult: null,
            viewMode: 'card',
            displayLang: 'original',  // 默认显示原文，可切换到译文
            isLoading: false,
            error: null,
            inputMode: 'auto'  // 'auto' 或 'manual'
        };
    }

    console.log('✅ 同族权利要求对比功能初始化完成');
}

/**
 * 切换输入模式（自动获取/手动输入）
 */
function switchFamilyInputMode(mode) {
    appState.familyClaimsComparison.inputMode = mode;

    // 更新标签按钮状态
    familyModeTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.mode === mode);
    });

    // 切换内容显示
    const autoMode = document.getElementById('family_auto_mode');
    const manualMode = document.getElementById('family_manual_mode');

    if (autoMode && manualMode) {
        autoMode.classList.toggle('active', mode === 'auto');
        manualMode.classList.toggle('active', mode === 'manual');
    }

    console.log(`🔄 切换到${mode === 'auto' ? '自动获取' : '手动输入'}模式`);
}

/**
 * 添加手动输入的专利号到列表
 */
function addManualPatents() {
    const inputText = manualPatentNumbersTextarea.value.trim();

    if (!inputText) {
        alert('请输入专利号');
        return;
    }

    // 解析专利号（支持换行、逗号、分号分隔）
    const patentNumbers = parsePatentNumbers(inputText);

    if (patentNumbers.length === 0) {
        alert('未识别到有效的专利号');
        return;
    }

    console.log(`📝 解析到 ${patentNumbers.length} 个专利号:`, patentNumbers);

    // 初始化状态（如果还没有）
    if (!appState.familyClaimsComparison.familyPatents) {
        appState.familyClaimsComparison.familyPatents = [];
    }

    // 添加专利号到列表（去重）
    const existingNumbers = new Set(
        appState.familyClaimsComparison.familyPatents.map(p => p.patent_number)
    );

    let addedCount = 0;
    patentNumbers.forEach(number => {
        if (!existingNumbers.has(number)) {
            appState.familyClaimsComparison.familyPatents.push({
                patent_number: number,
                title: '手动添加',
                publication_date: '',
                language: 'unknown',
                is_manual: true
            });
            existingNumbers.add(number);
            addedCount++;
        }
    });

    if (addedCount === 0) {
        alert('所有输入的专利号都已存在于列表中');
        return;
    }

    // 渲染列表
    renderFamilyPatentsGrid(appState.familyClaimsComparison.familyPatents);

    // 显示列表容器
    familyListContainer.style.display = 'block';

    // 清空输入框
    manualPatentNumbersTextarea.value = '';

    // 提示用户
    alert(`已添加 ${addedCount} 个专利号到列表`);

    // 清空之前的结果
    clearFamilyComparisonResult();
}

/**
 * 解析专利号字符串
 * 支持格式：
 * - 每行一个专利号
 * - 逗号分隔
 * - 分号分隔
 * - 混合格式
 */
function parsePatentNumbers(text) {
    // 统一分隔符为换行
    let normalized = text
        .replace(/[,，;；\s]+/g, '\n')  // 将逗号、分号、空格替换为换行
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    // 去重
    return [...new Set(normalized)];
}

/**
 * 清空手动输入框
 */
function clearManualInput() {
    manualPatentNumbersTextarea.value = '';
}

/**
 * 清空专利列表
 */
function clearFamilyList() {
    if (!confirm('确定要清空专利列表吗？')) {
        return;
    }

    appState.familyClaimsComparison.familyPatents = [];
    appState.familyClaimsComparison.selectedPatents = [];

    familyPatentsGrid.innerHTML = '';
    familyListContainer.style.display = 'none';

    updateFamilyCompareButton();
    clearFamilyComparisonResult();

    console.log('🗑️ 专利列表已清空');
}

/**
 * 初始化模型选择器
 */
function initFamilyComparisonModelSelector() {
    if (!familyComparisonModelSelect) return;

    let availableModels = [];
    
    if (window.ProviderManager && typeof ProviderManager.getAvailableModelsGrouped === 'function') {
        availableModels = ProviderManager.getAvailableModelsGrouped();
    } else {
        const getUserStorageItem = (key) => {
            if (window.userCacheStorage && window.userCacheStorage.isInitialized()) {
                return window.userCacheStorage.get(key);
            }
            return localStorage.getItem(key);
        };
        
        const zhipuKey = window.appState?.apiKey || getUserStorageItem('globalApiKey');
        const aliyunKey = window.appState?.aliyunApiKey || getUserStorageItem('aliyun_api_key');
        
        const defaultZhipuModels = [
            { id: 'glm-4-flash', name: 'GLM-4-Flash', provider: 'zhipu' },
            { id: 'glm-4-long', name: 'GLM-4-Long', provider: 'zhipu' },
            { id: 'glm-4.7-flash', name: 'GLM-4.7-Flash', provider: 'zhipu' }
        ];
        
        const defaultAliyunModels = [
            { id: 'qwen-turbo', name: 'Qwen-Turbo', provider: 'aliyun' },
            { id: 'qwen-plus', name: 'Qwen-Plus', provider: 'aliyun' },
            { id: 'qwen-max', name: 'Qwen-Max', provider: 'aliyun' }
        ];
        
        if (zhipuKey) {
            availableModels = availableModels.concat(defaultZhipuModels);
        }
        if (aliyunKey) {
            availableModels = availableModels.concat(defaultAliyunModels);
        }
        
        if (availableModels.length === 0) {
            availableModels = defaultZhipuModels;
        }
    }
    
    const grouped = { zhipu: [], aliyun: [] };
    availableModels.forEach(model => {
        const provider = model.provider || 'zhipu';
        if (grouped[provider]) {
            grouped[provider].push(model);
        }
    });
    
    let optionsHtml = '';
    
    if (grouped.zhipu.length > 0) {
        optionsHtml += '<optgroup label="智谱AI">';
        grouped.zhipu.forEach(m => {
            optionsHtml += `<option value="${m.id}">${m.name || m.id}</option>`;
        });
        optionsHtml += '</optgroup>';
    }
    
    if (grouped.aliyun.length > 0) {
        optionsHtml += '<optgroup label="阿里云百炼">';
        grouped.aliyun.forEach(m => {
            optionsHtml += `<option value="${m.id}">${m.name || m.id}</option>`;
        });
        optionsHtml += '</optgroup>';
    }
    
    if (optionsHtml === '') {
        optionsHtml = availableModels.map(m => `<option value="${m.id}">${m.name || m.id}</option>`).join('');
    }
    
    const currentValue = familyComparisonModelSelect.value;
    familyComparisonModelSelect.innerHTML = optionsHtml;

    if (currentValue && availableModels.find(m => m.id === currentValue)) {
        familyComparisonModelSelect.value = currentValue;
    } else if (availableModels.length > 0) {
        familyComparisonModelSelect.value = availableModels[0].id;
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
 * 对比同族专利的权利要求 - 第一步：获取并显示原文
 */
async function compareFamilyClaims() {
    const selectedPatents = appState.familyClaimsComparison.selectedPatents;

    if (selectedPatents.length < 2) {
        alert('请至少选择2个专利进行对比');
        return;
    }

    try {
        showFamilyLoading('正在获取各专利的权利要求原文...');

        const patentNumbers = selectedPatents.map(p => p.patent_number);

        const apiKey = appState.apiKey || localStorage.getItem('api_key') || '';

        const response = await fetch('/api/patent/family/claims-preview', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            credentials: 'include',
            body: JSON.stringify({
                patent_numbers: patentNumbers
            })
        });

        if (!response.ok) {
            throw new Error(`获取权利要求失败: ${response.status}`);
        }

        const result = await response.json();

        if (result.error) {
            throw new Error(result.error);
        }

        const data = result.data || {};
        const patentClaims = data.patent_claims || {};

        if (Object.keys(patentClaims).length < 2) {
            throw new Error('成功获取的权利要求数量不足，无法进行对比');
        }

        appState.familyClaimsComparison.originalClaims = patentClaims;

        renderOriginalClaimsPreview(patentClaims);

    } catch (error) {
        console.error('获取权利要求原文失败:', error);
        alert(`获取失败: ${error.message}`);
    } finally {
        hideFamilyLoading();
    }
}

/**
 * 渲染权利要求原文预览界面
 */
function renderOriginalClaimsPreview(patentClaims) {
    familyComparisonResultContainer.innerHTML = '';

    const patentNumbers = Object.keys(patentClaims);

    const infoBox = document.createElement('div');
    infoBox.className = 'original-claims-info';
    infoBox.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; background: #e3f2fd; border-left: 4px solid #1976d2; border-radius: 4px; padding: 10px 16px; margin-bottom: 16px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1976d2" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span style="color: #1565c0; font-size: 14px;">权利要求原文预览 - 请确认内容后点击下方按钮开始AI对比分析</span>
        </div>
    `;
    familyComparisonResultContainer.appendChild(infoBox);

    let html = '<div class="original-claims-preview" style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">';

    html += '<div class="side-by-side-header" style="display: grid; grid-template-columns: repeat(' + patentNumbers.length + ', 1fr); background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%); color: white; min-width: fit-content;">';
    patentNumbers.forEach(patentNumber => {
        const patentData = patentClaims[patentNumber];
        const title = patentData && patentData.title ? patentData.title : '';
        html += `<div class="claim-label" style="padding: 15px !important; text-align: center; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.3); min-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; background: transparent !important; color: white !important;" title="${title}">${patentNumber}</div>`;
    });
    html += '</div>';

    html += '<div class="side-by-side-body" style="display: grid; grid-template-columns: repeat(' + patentNumbers.length + ', 1fr); max-height: 500px; overflow-x: auto; overflow-y: hidden; background: #fafafa;">';
    patentNumbers.forEach((patentNumber, index) => {
        const patentData = patentClaims[patentNumber];
        const claimsText = patentData && patentData.claims ? patentData.claims.join('\n\n---\n\n') : '暂无权利要求数据';
        const formattedText = formatFamilyClaimTextForDisplay(claimsText);
        html += `<div class="claim-text-column" style="padding: 20px; border-right: 1px solid #e0e0e0; overflow-y: auto; max-height: 500px; line-height: 1.8; white-space: pre-wrap; min-width: 250px; background: white;">${formattedText}</div>`;
    });
    html += '</div>';
    html += '</div>';

    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = html;
    familyComparisonResultContainer.appendChild(contentDiv);

    const actionDiv = document.createElement('div');
    actionDiv.className = 'ai-comparison-action';
    actionDiv.style.cssText = 'display: flex; justify-content: center; gap: 20px; margin-top: 25px; padding: 25px; background: linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%); border-radius: 12px; border: 1px solid #e0e0e0;';
    actionDiv.innerHTML = `
        <button id="start_ai_comparison_btn" class="ai-start-btn" style="
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 16px 40px;
            font-size: 16px;
            font-weight: 600;
            color: white;
            background: linear-gradient(135deg, #2e7d32 0%, #388e3c 50%, #1b5e20 100%);
            border: none;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 15px rgba(46, 125, 50, 0.35);
            position: relative;
            overflow: hidden;
        ">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
            <span>开始AI对比分析</span>
        </button>
        <button id="cancel_comparison_btn" class="ai-cancel-btn" style="
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 16px 32px;
            font-size: 15px;
            font-weight: 500;
            color: #555 !important;
            background: #f5f5f5;
            border: 2px solid #ccc;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        ">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            <span style="color: #555;">取消</span>
        </button>
    `;
    familyComparisonResultContainer.appendChild(actionDiv);

    const startBtn = document.getElementById('start_ai_comparison_btn');
    const cancelBtn = document.getElementById('cancel_comparison_btn');

    startBtn.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-3px)';
        this.style.boxShadow = '0 8px 25px rgba(46, 125, 50, 0.45)';
        this.style.filter = 'brightness(1.05)';
    });
    startBtn.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '0 4px 15px rgba(46, 125, 50, 0.35)';
        this.style.filter = 'brightness(1)';
    });
    startBtn.addEventListener('click', startAIComparison);

    cancelBtn.addEventListener('mouseenter', function() {
        this.style.borderColor = '#aaa';
        this.style.background = '#e8e8e8';
        this.style.color = '#333 !important';
        this.style.transform = 'translateY(-2px)';
        this.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.12)';
    });
    cancelBtn.addEventListener('mouseleave', function() {
        this.style.borderColor = '#ccc';
        this.style.background = '#f5f5f5';
        this.style.color = '#555 !important';
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
    });
    cancelBtn.addEventListener('click', function() {
        clearFamilyComparisonResult();
    });
}

/**
 * 开始AI对比分析 - 第二步
 */
async function startAIComparison() {
    const patentClaims = appState.familyClaimsComparison.originalClaims;

    if (!patentClaims || Object.keys(patentClaims).length < 2) {
        alert('请先获取权利要求原文');
        return;
    }

    try {
        showFamilyLoading('正在进行AI对比分析...');

        const model = familyComparisonModelSelect.value;
        const patentNumbers = Object.keys(patentClaims);

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
                model: model,
                patent_claims: patentClaims
            })
        });

        if (!response.ok) {
            throw new Error(`对比失败: ${response.status}`);
        }

        const result = await response.json();

        if (result.error) {
            throw new Error(result.error);
        }

        const data = result.data || {};
        const analysisResult = data.result || {};

        appState.familyClaimsComparison.analysisResult = analysisResult;

        renderFamilyComparisonResult(analysisResult);

        familyToggleLanguageBtn.style.display = 'inline-block';
        familyExportComparisonBtn.style.display = 'inline-block';

    } catch (error) {
        console.error('AI对比分析失败:', error);
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

    // 获取当前显示语言
    const displayLang = appState.familyClaimsComparison.displayLang;

    // 构建并排视图HTML - 与手动输入对比保持一致
    let html = '<div class="side-by-side-view" style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">';

    // 头部：显示专利号 - 使用固定宽度确保对齐，直接使用绿色背景
    html += '<div class="side-by-side-header" style="display: grid; grid-template-columns: repeat(' + patentNumbers.length + ', 1fr); background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%); color: white; min-width: fit-content;">';
    patentNumbers.forEach(patentNumber => {
        const patentData = patentClaims[patentNumber];
        const title = patentData && patentData.title ? patentData.title : '';
        html += `<div class="claim-label" style="padding: 15px !important; text-align: center; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.3); min-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; background: transparent !important; color: white !important;" title="${title}">${patentNumber}</div>`;
    });
    html += '</div>';

    // 主体：显示权利要求文本 - 使用固定宽度确保与头部对齐
    html += '<div class="side-by-side-body" id="family-side-by-side-container" style="display: grid; grid-template-columns: repeat(' + patentNumbers.length + ', 1fr); max-height: 600px; overflow-x: auto; overflow-y: hidden; background: #fafafa;">';
    patentNumbers.forEach((patentNumber, index) => {
        const patentData = patentClaims[patentNumber];
        // 根据显示语言选择原文或译文（如果有的话）
        let claimsText;
        if (displayLang === 'translated' && patentData && patentData.claims_translated) {
            claimsText = patentData.claims_translated.join('\n\n');
        } else {
            claimsText = patentData && patentData.claims ? patentData.claims.join('\n\n') : '暂无权利要求数据';
        }
        const formattedText = formatFamilyClaimTextForDisplay(claimsText);
        html += `<div class="claim-text-column" data-column="${index}" style="padding: 20px; border-right: 1px solid #e0e0e0; overflow-y: auto; max-height: 600px; line-height: 1.8; white-space: pre-wrap; min-width: 250px; background: white;">${formattedText}</div>`;
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
 * 在原文（英文）和译文（中文）之间切换
 */
function toggleFamilyDisplayLanguage() {
    const currentLang = appState.familyClaimsComparison.displayLang;
    const newLang = currentLang === 'original' ? 'translated' : 'original';
    appState.familyClaimsComparison.displayLang = newLang;

    // 更新按钮文字
    familyToggleLanguageBtn.textContent = newLang === 'translated' ? '切换为原文' : '切换为译文';

    // 检查是否有翻译数据
    const patentClaims = appState.familyClaimsComparison.analysisResult?.patent_claims || {};
    const hasTranslation = Object.values(patentClaims).some(p => p.claims_translated && p.claims_translated.length > 0);

    // 显示提示
    let message;
    if (newLang === 'translated') {
        if (hasTranslation) {
            message = '已切换为中文译文模式';
        } else {
            message = '暂无中文翻译数据，请重新进行对比分析';
        }
    } else {
        message = '已切换为原文模式（英文）';
    }

    // 创建提示元素
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: var(--primary-color); color: white; padding: 12px 24px; border-radius: 8px; z-index: 10000; font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);';
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);

    // 重新渲染并排对比视图（如果有）
    if (appState.familyClaimsComparison.analysisResult && appState.familyClaimsComparison.viewMode === 'sideBySide') {
        renderFamilyComparisonResult(appState.familyClaimsComparison.analysisResult);
    }
}

/**
 * 导出对比报告为Word文档
 */
function exportFamilyComparisonReport() {
    const result = appState.familyClaimsComparison.analysisResult;

    if (!result) {
        alert('没有可导出的对比结果');
        return;
    }

    // 生成Word文档（使用HTML格式，Word可以打开）
    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>同族权利要求对比报告</title>
    <style>
        body { font-family: 'Microsoft YaHei', SimSun, Arial, sans-serif; line-height: 1.8; padding: 20px; }
        h1 { color: #2e7d32; border-bottom: 2px solid #2e7d32; padding-bottom: 10px; }
        h2 { color: #43a047; margin-top: 30px; }
        h3 { color: #666; border-left: 4px solid #43a047; padding-left: 10px; }
        h4 { color: #333; margin-top: 15px; }
        table { border-collapse: collapse; width: 100%; margin: 15px 0; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background-color: #43a047; color: white; }
        .similarity { background: #e8f5e9; padding: 5px 15px; border-radius: 15px; display: inline-block; margin: 10px 0; }
        .similar-feature { background: rgba(34, 197, 94, 0.1); padding: 8px; margin: 5px 0; border-radius: 4px; }
        .different-feature { background: rgba(239, 68, 68, 0.05); padding: 10px; margin: 10px 0; border-radius: 4px; border-left: 3px solid #ef5350; }
        .analysis { background: rgba(59, 130, 246, 0.1); padding: 8px; margin-top: 5px; border-radius: 4px; font-style: italic; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <h1>同族权利要求对比报告</h1>
    <p style="color: #666;">生成时间：${new Date().toLocaleString('zh-CN')}</p>
`;

    // 添加整体总结
    if (result.overall_summary) {
        html += `
    <h2>一、整体总结</h2>
    <p>${result.overall_summary}</p>
`;
    }

    // 添加详细对比
    if (result.comparison_matrix && result.comparison_matrix.length > 0) {
        html += `
    <h2>二、详细对比分析</h2>
`;

        result.comparison_matrix.forEach((item, index) => {
            const [claim1, claim2] = item.claim_pair;
            const similarityPercent = Math.round(item.similarity_score * 100);

            html += `
    <h3>${index + 1}. ${claim1} vs ${claim2}</h3>
    <p class="similarity"><strong>相似度：${similarityPercent}%</strong></p>

    <h4>相同特征</h4>
`;

            if (item.similar_features && item.similar_features.length > 0) {
                html += '<ul>';
                item.similar_features.forEach(f => {
                    html += `<li class="similar-feature">${f.feature}</li>`;
                });
                html += '</ul>';
            } else {
                html += '<p style="color: #666;">无完全相同的技术特征</p>';
            }

            html += `
    <h4>差异特征</h4>
`;

            if (item.different_features && item.different_features.length > 0) {
                html += '<table><thead><tr><th width="30%">' + claim1 + '</th><th width="30%">' + claim2 + '</th><th width="40%">差异分析</th></tr></thead><tbody>';
                item.different_features.forEach(f => {
                    html += `<tr>
                        <td>${f.claim_1_feature}</td>
                        <td>${f.claim_2_feature}</td>
                        <td>${f.analysis}</td>
                    </tr>`;
                });
                html += '</tbody></table>';
            } else {
                html += '<p style="color: #666;">未发现显著差异</p>';
            }
        });
    }

    // 添加页脚
    html += `
    <div class="footer">
        <p>本报告由专利工作台自动生成，仅供参考。</p>
        <p>AI生成内容声明：以上对比分析由AI生成，请结合实际情况判断使用。</p>
    </div>
</body>
</html>
`;

    // 创建Blob并下载
    const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `同族权利要求对比报告_${new Date().toISOString().slice(0, 10)}.doc`;
    a.click();
    URL.revokeObjectURL(url);

    console.log('✅ Word文档已导出');
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

/**
 * 从外部启动同族权利要求对比（供新标签页调用）
 * @param {string} basePatentNumber - 基础专利号
 * @param {Array<string>} familyPatentNumbers - 同族专利公开号列表
 */
window.startFamilyClaimsComparison = async function(basePatentNumber, familyPatentNumbers) {
    console.log('🚀 启动同族权利要求对比:', basePatentNumber, familyPatentNumbers);
    
    // 1. 切换到功能四标签页
    if (typeof switchTab === 'function') {
        const claimsTabBtn = document.querySelector('.tab-button[onclick*="claims_comparison"]');
        if (claimsTabBtn) {
            switchTab('claims_comparison', claimsTabBtn);
        }
    }
    
    // 2. 等待标签页切换完成后，切换到同族专利对比子标签页
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (typeof switchClaimsComparisonSubTab === 'function') {
        const familySubBtn = document.querySelector('.sub-tab-button[data-sub-tab="family"]');
        if (familySubBtn) {
            switchClaimsComparisonSubTab('family', familySubBtn);
        }
    }
    
    // 3. 等待子标签页加载完成
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 4. 初始化状态（如果尚未初始化）
    if (!appState.familyClaimsComparison) {
        appState.familyClaimsComparison = {
            basePatent: null,
            familyPatents: [],
            selectedPatents: [],
            analysisResult: null,
            viewMode: 'card',
            displayLang: 'translated',
            isLoading: false,
            error: null,
            inputMode: 'manual'
        };
    }
    
    // 5. 切换到手动输入模式
    if (typeof switchFamilyInputMode === 'function') {
        switchFamilyInputMode('manual');
    }
    
    // 6. 构建同族专利数据
    const familyPatents = familyPatentNumbers.map(num => ({
        patent_number: num,
        title: '同族专利',
        publication_date: '',
        language: 'unknown',
        is_manual: true
    }));
    
    // 7. 保存到状态
    appState.familyClaimsComparison.basePatent = basePatentNumber;
    appState.familyClaimsComparison.familyPatents = familyPatents;
    appState.familyClaimsComparison.selectedPatents = [...familyPatents];
    
    // 8. 渲染同族专利列表
    if (typeof renderFamilyPatentsGrid === 'function') {
        renderFamilyPatentsGrid(familyPatents);
    }
    
    // 9. 显示列表容器
    if (familyListContainer) {
        familyListContainer.style.display = 'block';
    }
    
    // 10. 自动选中所有专利
    setTimeout(() => {
        const checkboxes = document.querySelectorAll('.family-patent-checkbox');
        checkboxes.forEach(cb => {
            cb.checked = true;
        });
        
        // 11. 更新对比按钮状态
        if (typeof updateFamilyCompareButton === 'function') {
            updateFamilyCompareButton();
        }
        
        // 12. 清空之前的对比结果
        if (typeof clearFamilyComparisonResult === 'function') {
            clearFamilyComparisonResult();
        }
        
        // 13. 滚动到对比区域
        if (familyListContainer) {
            familyListContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
        // 14. 提示用户
        const toast = document.createElement('div');
        toast.innerHTML = `✅ 已自动填入 ${familyPatentNumbers.length} 个同族专利，请点击"开始对比分析"按钮`;
        toast.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: linear-gradient(135deg, #9c27b0 0%, #673ab7 100%); color: white; padding: 12px 24px; border-radius: 8px; z-index: 10000; font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); max-width: 90%; text-align: center;';
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 4000);
    }, 100);
};