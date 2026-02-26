// js/main.js (Final, Corrected, and Robust Version)

// =================================================================================
// 智能剪贴板系统初始化
// =================================================================================
// 在 DOMContentLoaded 之前加载剪贴板核心模块
(function() {
    // 加载内容类型规则
    const contentTypesScript = document.createElement('script');
    contentTypesScript.src = 'js/core/content-types.js';
    contentTypesScript.async = false;
    document.head.appendChild(contentTypesScript);
    
    // 加载 SmartClipboard 核心
    const smartClipboardScript = document.createElement('script');
    smartClipboardScript.src = 'js/core/smart-clipboard.js';
    smartClipboardScript.async = false;
    document.head.appendChild(smartClipboardScript);
    
    console.log('📋 SmartClipboard scripts loading...');
})();

// =================================================================================
// DOM 辅助函数
// =================================================================================
// Note: getEl is defined in js/modules/navigation/tab-navigation.js which loads before this file

// =================================================================================
// 加载进度管理
// =================================================================================
window.LoadingManager = {
    totalSteps: 10,
    currentStep: 0,
    progressElement: null,
    overlayElement: null,
    progressBarElement: null,
    loadingTextElement: null,
    
    init: function() {
        this.progressElement = document.getElementById('loading-progress');
        this.overlayElement = document.getElementById('loading-overlay');
        this.progressBarElement = document.getElementById('tech-loading-progress');
        this.loadingTextElement = document.getElementById('loading-text');
        
        this.startWelcomeAnimation();
    },
    
    startWelcomeAnimation: function() {
        const welcomeTextCN = 'ALFRED X IP';
        const welcomeTextEN = 'INTELLIGENT PATENT WORKBENCH';
        const cnElement = document.getElementById('welcome-text-cn');
        const enElement = document.getElementById('welcome-text-en');
        
        if (!cnElement || !enElement) return;
        
        let cnIndex = 0;
        let enIndex = 0;
        
        const typeCN = () => {
            if (cnIndex < welcomeTextCN.length) {
                cnElement.textContent += welcomeTextCN[cnIndex];
                cnIndex++;
                setTimeout(typeCN, 120);
            } else {
                setTimeout(typeEN, 300);
            }
        };
        
        const typeEN = () => {
            if (enIndex < welcomeTextEN.length) {
                enElement.textContent += welcomeTextEN[enIndex];
                enIndex++;
                setTimeout(typeEN, 35);
            }
        };
        
        setTimeout(typeCN, 500);
    },
    
    updateProgress: function(stepName) {
        this.currentStep++;
        const percentage = Math.round((this.currentStep / this.totalSteps) * 100);
        
        if (this.progressElement) {
            this.progressElement.textContent = `${stepName} (${percentage}%)`;
        }
        
        if (this.progressBarElement) {
            this.progressBarElement.style.width = `${percentage}%`;
        }
        
        if (this.loadingTextElement) {
            this.loadingTextElement.textContent = stepName;
        }
        
        console.log(`📊 加载进度: ${stepName} (${percentage}%)`);
    },
    
    complete: function() {
        if (this.progressBarElement) {
            this.progressBarElement.style.width = '100%';
        }
        
        if (this.loadingTextElement) {
            this.loadingTextElement.textContent = '加载完成';
        }
        
        if (this.progressElement) {
            this.progressElement.textContent = '系统就绪 (100%)';
        }
        
        setTimeout(() => {
            if (this.overlayElement) {
                this.overlayElement.classList.add('hidden');
                setTimeout(() => {
                    this.overlayElement.style.display = 'none';
                }, 800);
            }
        }, 500);
        
        console.log('✅ 所有模块加载完成');
    }
};

// =================================================================================
// 初始化
// =================================================================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('开始初始化所有模块');
    
    // 初始化加载管理器
    LoadingManager.init();
    
    // Load header component first
    try {
        await loadComponent('frontend/components/header.html', 'header-component');
        LoadingManager.updateProgress('加载头部组件');
    } catch (error) {
        console.error('❌ Failed to load header component:', error);
    }
    
    // Load tab navigation component
    try {
        await loadComponent('frontend/components/tab-navigation.html', 'tab-navigation-component');
        LoadingManager.updateProgress('加载导航组件');
    } catch (error) {
        console.error('❌ Failed to load tab navigation component:', error);
    }
    
    // Load instant chat component and initialize
    try {
        await loadComponent('frontend/components/tabs/instant-chat.html', 'instant-chat-component');
        // Wait for DOM to be ready
        await new Promise(resolve => setTimeout(resolve, 50));
        initChat();
        LoadingManager.updateProgress('初始化即时对话');
    } catch (error) {
        console.error('❌ Failed to load instant chat component:', error);
    }
    
    // Load Feature 2 (Unified Batch - 合并了原功能二和功能三) component and initialize
    try {
        const loaded = await loadComponent('frontend/components/tabs/unified-batch.html', 'unified-batch-component', {
            requiredElements: [
                'unified_excel_file',
                'unified_preset_template_select',
                'unified_add_output_field_btn'
            ],
            timeout: 5000
        });
        
        if (loaded) {
            // Wait for DOM to be ready
            await new Promise(resolve => setTimeout(resolve, 50));
            if (typeof initUnifiedBatchModule === 'function') {
                initUnifiedBatchModule();
            }
            LoadingManager.updateProgress('初始化文本批量智能分析');
        }
    } catch (error) {
        console.error('❌ Failed to load Feature 2 (Unified Batch) component:', error);
    }
    
    // Load Feature 4 (Local Patent Library) component and initialize
    try {
        const loaded = await loadComponent('frontend/components/tabs/local-patent-lib.html', 'local-patent-lib-component', {
            requiredElements: [
                'lpl_original_file_input',
                'lpl_expand_btn'
            ],
            timeout: 5000
        });
        
        if (loaded) {
            // Wait for DOM to be ready
            await new Promise(resolve => setTimeout(resolve, 50));
            if (typeof initLocalPatentLibModule === 'function') {
                initLocalPatentLibModule();
            }
            LoadingManager.updateProgress('初始化本地专利库');
        }
    } catch (error) {
        console.error('❌ Failed to load Feature 4 (Local Patent Library) component:', error);
    }
    
    // Load Feature 5 (Claims Comparison) component and initialize
    try {
        const loaded = await loadComponent('frontend/components/tabs/claims-comparison.html', 'claims-comparison-component', {
            requiredElements: [
                'comparison_model_select',
                'add_claim_btn',
                'claims_input_container'
            ],
            timeout: 5000
        });
        
        if (loaded) {
            // Wait for DOM to be ready
            await new Promise(resolve => setTimeout(resolve, 50));
            if (typeof initClaimsComparisonModule === 'function') {
                initClaimsComparisonModule();
            }
            LoadingManager.updateProgress('初始化权利要求对比');
        }
    } catch (error) {
        console.error('❌ Failed to load Feature 5 (Claims Comparison) component:', error);
    }
    
    // Load Feature 6 (Patent Batch) component and initialize
    try {
        await loadComponent('frontend/components/tabs/patent-batch.html', 'patent-batch-component');
        // Wait for DOM to be ready
        await new Promise(resolve => setTimeout(resolve, 50));
        if (typeof initPatentBatchModule === 'function') {
            initPatentBatchModule();
        }
        LoadingManager.updateProgress('初始化批量专利解读');
    } catch (error) {
        console.error('❌ Failed to load Feature 6 (Patent Batch) component:', error);
    }
    
    // Load Feature 7 (Claims Processor) component
    try {
        const loaded = await loadComponent('frontend/components/tabs/claims-processor.html', 'claims-processor-component', {
            requiredElements: [
                'claims_text_analyze_btn',
                'claims_text_example_btn',
                'claims_text_input'
            ],
            timeout: 5000
        });

        if (loaded) {
            // Wait for DOM to be ready
            await new Promise(resolve => setTimeout(resolve, 100));
            // Initialize Claims Processor
            if (typeof initClaimsProcessor === 'function') {
                initClaimsProcessor();
            }
            LoadingManager.updateProgress('初始化权利要求分析器');
        }
    } catch (error) {
        console.error('❌ Failed to load Feature 7 (Claims Processor) component:', error);
    }
    
    // Load Feature 8 (Drawing Marker) component and initialize
    try {
        const loaded = await loadComponent('frontend/components/tabs/drawing-marker.html', 'drawing-marker-component', {
            requiredElements: [
                'aiProcessingPanelContainer',
                'drawing_upload_input',
                'specification_input',
                'start_processing_btn',
                'clear_all_btn'
            ],
            timeout: 5000,
            onReady: async () => {
                // Wait a bit for scripts to load
                await new Promise(resolve => setTimeout(resolve, 100));
                // Initialize Drawing Marker
                if (typeof initDrawingMarker === 'function') {
                    initDrawingMarker();
                }
            }
        });
        
        if (loaded) {
            LoadingManager.updateProgress('初始化附图标记');
        }
    } catch (error) {
        console.error('❌ Failed to load Feature 8 (Drawing Marker) component:', error);
    }
    
    // Load Feature 9 (PDF OCR Reader) component and initialize
    try {
        const loaded = await loadComponent('frontend/components/tabs/pdf-ocr-reader.html', 'pdf-ocr-reader-component', {
            retryCount: 3,
            onReady: async () => {
                // Wait for DOM to be fully updated
                await new Promise(resolve => setTimeout(resolve, 200));
                // Initialize PDF OCR Reader
                if (typeof window.pdfOCRInit !== 'undefined') {
                    window.pdfOCRInit.init();
                }
            }
        });
        
        if (loaded) {
            LoadingManager.updateProgress('初始化PDF-OCR阅读器');
        }
    } catch (error) {
        console.error('❌ Failed to load Feature 9 (PDF OCR Reader) component:', error);
    }
    
    // Initialize API Key Config (global, not tied to a specific component)
    initApiKeyConfig();
    LoadingManager.updateProgress('初始化API配置');

    // 默认激活第一个主页签
    switchTab('instant', document.querySelector('.main-tab-container .tab-button'));
    
    // 默认激活各个功能内部的第一个步骤
    const unifiedFirstStep = document.querySelector('#unified_batch-tab .step-item');
    if (unifiedFirstStep) switchUnifiedSubTab('input', unifiedFirstStep);
    
    const lplFirstStep = document.querySelector('#local_patent_lib-tab .step-item');
    if (lplFirstStep) switchLPLSubTab('expand', lplFirstStep);
    
    // 完成加载，隐藏进度遮罩
    LoadingManager.complete();
});

// =================================================================================
// API Key配置 与 统一API调用函数 (从 js/core/api.js 导入)
// =================================================================================
// 注意: initApiKeyConfig 和 apiCall 函数现在在 js/core/api.js 中定义
// 这些函数通过 <script> 标签加载，在全局作用域中可用

// =================================================================================
// 页面布局与导航
// =================================================================================
// 注意: 导航函数现在在 js/modules/navigation/tab-navigation.js 中定义
// 这些函数通过 <script> 标签加载，在全局作用域中可用:
// - updateStepperState(stepper, activeStepElement)
// - switchTab(tabId, clickedButton)
// - switchAsyncSubTab(subTabId, clickedElement)
// - switchSubTab(subTabId, clickedElement)
// - switchLPLSubTab(subTabId, clickedElement)

// =================================================================================
// 批量专利解读功能
// =================================================================================

// 全局变量：存储解读结果（已移到window对象，供模块化使用）
window.patentBatchAnalysisResults = [];

function initPatentBatch() {
    // 初始化模板管理
    initPatentTemplate();
    
    // 初始化对话功能
    initPatentChat();
    
    // 初始化模型选择器
    initPatentBatchModelSelector();
    
    // 初始化事件监听器
    initPatentBatchEventListeners();
    
    // 存储专利查询结果（全局变量，供 patentDetailNewTab.js 使用）
    window.patentResults = [];
    
    // 监听模型配置加载完成事件，确保配置加载后能正确更新
    window.addEventListener('modelsConfigLoaded', (event) => {
        console.log('📡 功能六收到模型配置加载完成事件');
        initPatentBatchModelSelector();
    });
    
    console.log('✅ 功能六批量专利解读已初始化');
}

/**
 * 初始化功能六模型选择器
 */
function initPatentBatchModelSelector() {
    const modelSelect = document.getElementById('patent_batch_model_selector');
    if (!modelSelect) {
        console.warn('⚠️ 功能六模型选择器不存在');
        return;
    }
    
    // 获取可用模型列表（从全局变量或默认值）
    const models = window.AVAILABLE_MODELS || ["glm-4-flash", "glm-4-long", "glm-4.7-flash"];
    
    const currentValue = modelSelect.value;
    modelSelect.innerHTML = models.map(m => `<option value="${m}">${m}</option>`).join('');
    
    // 恢复之前的选择或设置默认值
    if (currentValue && models.includes(currentValue)) {
        modelSelect.value = currentValue;
    } else {
        modelSelect.value = models[0];
    }
    
    console.log('✅ 功能六模型选择器已初始化');
}

/**
 * 初始化功能六事件监听器
 */
function initPatentBatchEventListeners() {
    // 获取DOM元素
    const patentNumbersInput = getEl('patent_numbers_input');
    const patentCountDisplay = getEl('patent_count_display');
    const clearPatentInputBtn = getEl('clear_patent_input_btn');
    const copyPatentNumbersBtn = getEl('copy_patent_numbers_btn');
    const searchPatentsBtn = getEl('search_patents_btn');
    const quickCrawlBtn = getEl('quick_crawl_btn');
    const analyzeAllBtn = getEl('analyze_all_btn');
    const exportAnalysisExcelBtn = getEl('export_analysis_excel_btn');
    const searchStatus = getEl('search_status');
    const patentResultsContainer = getEl('patent_results_container');
    const patentResultsList = getEl('patent_results_list');
    const analysisResultsList = getEl('analysis_results_list');
    
    if (!patentNumbersInput || !patentCountDisplay) {
        console.warn('⚠️ 功能六必要DOM元素不存在，跳过事件监听器初始化');
        return;
    }
    
    // 使用全局变量存储解读结果
    
    // 复制专利号按钮
    if (copyPatentNumbersBtn) {
        copyPatentNumbersBtn.addEventListener('click', () => {
            const text = patentNumbersInput.value.trim();
            if (!text) {
                alert('没有可复制的内容');
                return;
            }
            
            navigator.clipboard.writeText(text).then(() => {
                // 显示复制成功提示
                const originalHTML = copyPatentNumbersBtn.innerHTML;
                copyPatentNumbersBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>';
                setTimeout(() => {
                    copyPatentNumbersBtn.innerHTML = originalHTML;
                }, 1500);
            }).catch(err => {
                console.error('复制失败:', err);
                alert('复制失败，请手动复制');
            });
        });
    }
    
    // 实时更新专利号数量
    patentNumbersInput.addEventListener('input', () => {
        const input = patentNumbersInput.value.trim();
        const patentNumbers = input ? input.replace(/\n/g, ' ').split(/\s+/).filter(num => num) : [];
        const uniquePatents = [...new Set(patentNumbers)];
        const count = uniquePatents.length;
        patentCountDisplay.textContent = `专利号数量：${count}/50`;
        
        // 根据数量更新样式
        if (count > 50) {
            patentCountDisplay.style.color = 'red';
            if (searchPatentsBtn) searchPatentsBtn.disabled = true;
            if (quickCrawlBtn) quickCrawlBtn.disabled = true;
        } else {
            patentCountDisplay.style.color = '';
            if (searchPatentsBtn) searchPatentsBtn.disabled = false;
            if (quickCrawlBtn) quickCrawlBtn.disabled = false;
        }
    });
    
    // 清空输入按钮
    if (clearPatentInputBtn) {
        clearPatentInputBtn.addEventListener('click', () => {
            patentNumbersInput.value = '';
            patentCountDisplay.textContent = '专利号数量：0/50';
            patentCountDisplay.style.color = '';
            if (searchPatentsBtn) searchPatentsBtn.disabled = false;
            if (quickCrawlBtn) quickCrawlBtn.disabled = false;
            if (analyzeAllBtn) analyzeAllBtn.disabled = true;
            if (exportAnalysisExcelBtn) {
                exportAnalysisExcelBtn.disabled = true;
            }
            if (patentResultsContainer) patentResultsContainer.style.display = 'none';
            if (patentResultsList) patentResultsList.innerHTML = '';
            if (analysisResultsList) {
                analysisResultsList.innerHTML = '';
            }
            // 隐藏解读结果容器
            const analysisResultsContainer = document.getElementById('analysis_results_container');
            if (analysisResultsContainer) {
                analysisResultsContainer.style.display = 'none';
            }
            if (searchStatus) searchStatus.style.display = 'none';
            window.patentResults = [];
        });
    }
    
    // 快速全爬取按钮
    if (quickCrawlBtn) {
        quickCrawlBtn.addEventListener('click', async () => {
            const input = patentNumbersInput.value.trim();
            if (!input) {
                alert('请输入专利号');
                return;
            }
            
            // 处理专利号
            const patentNumbers = input.replace(/\n/g, ' ').split(/\s+/).filter(num => num);
            const uniquePatents = [...new Set(patentNumbers)];
            
            if (uniquePatents.length > 50) {
                alert('最多支持50个专利号');
                return;
            }
            
            // 确保字段选择器是关闭状态（全爬取模式）
            const fieldSelectorPanel = document.getElementById('field_selector_panel');
            if (fieldSelectorPanel) {
                fieldSelectorPanel.style.display = 'none';
            }
            
            // 触发批量查询
            if (searchPatentsBtn) {
                searchPatentsBtn.click();
            } else {
                // 如果没有searchPatentsBtn，直接执行查询逻辑
                await performPatentSearch(uniquePatents);
            }
        });
    }
    
    // 缓存统计按钮
    const viewCacheStatsBtn = getEl('view_cache_stats_btn');
    if (viewCacheStatsBtn && window.PatentCache) {
        viewCacheStatsBtn.addEventListener('click', () => {
            const stats = PatentCache.getStats();
            alert(`📊 专利缓存统计\n\n` +
                  `缓存数量: ${stats.totalCount} 个\n` +
                  `占用空间: ${stats.totalSize}\n` +
                  `最早缓存: ${stats.oldestCache}\n` +
                  `最新缓存: ${stats.newestCache}\n\n` +
                  `缓存有效期: 30天\n` +
                  `警告阈值: 7天`);
        });
    }
    
    // 清理缓存按钮
    const clearCacheBtn = getEl('clear_cache_btn');
    if (clearCacheBtn && window.PatentCache) {
        clearCacheBtn.addEventListener('click', () => {
            if (confirm('确定要清理所有专利缓存吗？此操作不可恢复。')) {
                const count = PatentCache.clearAll();
                alert(`✅ 已清理 ${count} 个专利缓存`);
            }
        });
    }
    
    // 导出Excel按钮
    if (exportAnalysisExcelBtn) {
        exportAnalysisExcelBtn.addEventListener('click', async () => {
            if (window.patentResults.length === 0) {
                alert('没有可导出的专利数据');
                return;
            }
            
            // 确保 XLSX 库已加载
            if (typeof XLSX === 'undefined') {
                searchStatus.textContent = '正在加载导出库，请稍候...';
                searchStatus.style.display = 'block';
                try {
                    await window.ResourceLoader.ensureLibrary('xlsx');
                } catch (err) {
                    alert('导出库加载失败，请刷新页面后重试');
                    return;
                }
            }
            
            try {
                // 显示导出状态
                searchStatus.textContent = '正在导出Excel文件...';
                searchStatus.style.display = 'block';
                
                // 准备导出数据
                const exportData = window.patentResults.map(result => {
                    // 检查result是否成功
                    if (!result.success) {
                        // 如果查询失败，只导出专利号和错误信息
                        return {
                            '专利号': result.patent_number,
                            '错误信息': result.error || '查询失败',
                            '标题': '',
                            '摘要': '',
                            '发明人': '',
                            '受让人': '',
                            '申请日期': '',
                            '公开日期': '',
                            '权利要求': '',
                            '附图链接': '',
                            '说明书': ''
                        };
                    }
                    
                    const patentData = result.data || {};
                    
                    // 构建基础数据行
                    const row = {
                        '专利号': result.patent_number,
                        '标题': patentData.title || '',
                        '摘要': patentData.abstract ? patentData.abstract.substring(0, 32767) : '',
                        '发明人': patentData.inventors ? patentData.inventors.join(', ').substring(0, 32767) : '',
                        '受让人': patentData.assignees ? patentData.assignees.join(', ').substring(0, 32767) : '',
                        '申请日期': patentData.application_date || '',
                        '公开日期': patentData.publication_date || '',
                        '权利要求': patentData.claims ? ((Array.isArray(patentData.claims) ? patentData.claims.join('\n') : patentData.claims).substring(0, 32767)) : '',
                        '附图链接': patentData.drawings ? ((Array.isArray(patentData.drawings) ? patentData.drawings.join('\n') : patentData.drawings).substring(0, 32767)) : '',
                        '说明书': patentData.description ? patentData.description.substring(0, 32767) : ''
                    };
                    
                    // 尝试添加解读结果
                    const analysisResult = window.patentBatchAnalysisResults.find(item => item.patent_number === result.patent_number);
                    if (analysisResult) {
                        try {
                            // 尝试清理可能的markdown代码块标记
                            let cleanContent = (analysisResult.analysis_content || '').trim();
                            if (cleanContent.startsWith('```json')) {
                                cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                            } else if (cleanContent.startsWith('```')) {
                                cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
                            }
                            
                            const analysisJson = JSON.parse(cleanContent);
                            
                            // 动态添加解读字段
                            Object.keys(analysisJson).forEach(key => {
                                const value = analysisJson[key] || '';
                                row[key] = typeof value === 'string' ? value.substring(0, 32767) : value;
                            });
                        } catch (e) {
                            // 如果不是JSON格式，将整个内容放到一个字段
                            row['解读结果'] = analysisResult.analysis_content ? analysisResult.analysis_content.substring(0, 32767) : '';
                        }
                    }
                    
                    return row;
                });
                
                // 使用XLSX库生成Excel文件
                const ws = XLSX.utils.json_to_sheet(exportData);
                
                // 动态设置列宽
                const colWidths = [
                    { wch: 15 },  // 专利号
                    { wch: 30 },  // 标题
                    { wch: 40 },  // 摘要
                    { wch: 20 },  // 发明人
                    { wch: 20 },  // 受让人
                    { wch: 12 },  // 申请日期
                    { wch: 12 },  // 公开日期
                    { wch: 50 },  // 权利要求
                    { wch: 60 },  // 附图链接
                    { wch: 50 },  // 说明书
                    { wch: 50 }   // 解读结果（如果有）
                ];
                ws['!cols'] = colWidths;
                
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, '专利数据');
                
                // 导出文件
                const filename = `专利数据_${new Date().toISOString().slice(0, 10)}.xlsx`;
                XLSX.writeFile(wb, filename);
                
                // 更新状态
                searchStatus.textContent = `导出成功，共导出 ${window.patentResults.length} 个专利数据`;
            } catch (error) {
                console.error('导出Excel失败:', error);
                searchStatus.textContent = `导出失败: ${error.message}`;
                searchStatus.style.color = 'red';
            }
        });
    }
    
    // 定义批量查询专利的执行函数（增强版：支持缓存、实时显示、自动解读）
    async function performPatentSearch(patentNumbers, options = {}) {
        const { skipCacheCheck = false, forceRefresh = false } = options;
        
        // 首先检查后端版本
        try {
            const versionResponse = await apiCall('/patent/version', null, 'GET');
            console.log('✅ 后端版本信息:', versionResponse);
            console.log('✅ 支持的功能:', versionResponse.features);
        } catch (error) {
            console.warn('⚠️ 无法获取版本信息，可能是旧版本后端');
        }
        
        // 判断字段选择器是否展开，决定爬取模式
        const isFieldSelectorOpen = window.isFieldSelectorOpen ? window.isFieldSelectorOpen() : false;
        const crawlSpecification = true; // 始终启用爬取
        
        // 获取用户选择的字段（根据字段选择器状态自动判断）
        const selectedFields = getSelectedFields();
        
        if (isFieldSelectorOpen) {
            console.log('📋 选择性爬取模式 - 字段选择器已展开，根据勾选字段爬取');
            console.log('📋 选中的字段:', selectedFields);
        } else {
            console.log('📋 全爬取模式 - 字段选择器未展开，爬取所有字段');
        }
        
        // 清空之前的结果
        patentResultsList.innerHTML = '';
        if (analysisResultsList) {
            analysisResultsList.innerHTML = '';
        }
        if (analyzeAllBtn) {
            analyzeAllBtn.disabled = true;
        }
        
        // 更新状态
        appState.patentBatch.isCrawling = true;
        appState.patentBatch.crawlProgress = { current: 0, total: patentNumbers.length };
        updateCrawlProgress();
        
        // 显示查询状态
        searchStatus.textContent = `准备查询 ${patentNumbers.length} 个专利...`;
        searchStatus.style.display = 'block';
        
        // 检查缓存（如果不是强制刷新）
        if (!skipCacheCheck && !forceRefresh && window.PatentCache) {
            const cacheStatus = PatentCache.checkBatch(patentNumbers);
            
            if (cacheStatus.cached.length > 0) {
                // 显示缓存确认弹窗
                return new Promise((resolve) => {
                    CacheConfirmModal.show(cacheStatus, async (useCache, selectedPatents) => {
                        await executePatentSearch(selectedPatents.useCache, selectedPatents.refresh, selectedFields);
                        resolve();
                    }, () => {
                        // 取消操作
                        searchStatus.textContent = '已取消查询';
                        appState.patentBatch.isCrawling = false;
                        updateCrawlProgress();
                        resolve();
                    });
                });
            }
        }
        
        // 直接执行查询（无缓存或强制刷新）
        await executePatentSearch([], patentNumbers, selectedFields);
    }
    
    // 执行专利查询（内部函数）- 使用标签页管理器显示结果
    async function executePatentSearch(cachedPatents, patentsToCrawl, selectedFields) {
        const results = [];
        const patentNumbers = [...cachedPatents, ...patentsToCrawl];
        
        // 初始化标签页管理器并显示容器
        const tabsContainer = document.getElementById('patent_batch_tabs_container');
        if (tabsContainer && window.patentTabManager) {
            tabsContainer.style.display = 'block';
            if (!window.patentTabManager.container) {
                window.patentTabManager.init('patent_batch_tabs_container');
            }
            
            // 创建原始结果标签页
            window.originalResultsTabId = window.patentTabManager.createTab({
                title: '原始查询结果',
                sourcePatent: '批量查询',
                relationType: 'original',
                patentNumbers: patentNumbers
            });
        } else if (patentResultsContainer) {
            // 回退到旧容器显示
            patentResultsContainer.style.display = 'block';
        }
        
        // 1. 首先加载缓存的专利（实时显示）
        for (const patentNumber of cachedPatents) {
            const cacheData = PatentCache.get(patentNumber);
            if (cacheData) {
                const result = {
                    patent_number: patentNumber,
                    success: true,
                    data: cacheData.data,
                    url: cacheData.url || `https://patents.google.com/patent/${patentNumber}`,
                    fromCache: true,
                    cacheTime: cacheData.timestamp
                };
                results.push(result);
                
                // 实时显示
                displayPatentResult(result, results.length - 1, patentNumbers.length);
                
                // 更新进度
                appState.patentBatch.crawlProgress.current++;
                updateCrawlProgress();
                
                searchStatus.textContent = `已从缓存加载 ${results.length}/${patentNumbers.length} 个专利`;
            }
        }
        
        // 2. 逐个爬取未缓存的专利（实时显示）
        for (let i = 0; i < patentsToCrawl.length; i++) {
            const patentNumber = patentsToCrawl[i];
            
            try {
                searchStatus.textContent = `正在爬取第 ${results.length + 1}/${patentNumbers.length} 个专利: ${patentNumber}...`;
                
                // 调用API查询单个专利
                const apiResults = await apiCall('/patent/search', {
                    patent_numbers: [patentNumber],
                    crawl_specification: true,
                    selected_fields: selectedFields
                });
                
                if (apiResults && apiResults.length > 0) {
                    const result = apiResults[0];
                    results.push(result);
                    
                    // 如果成功，保存到缓存
                    if (result.success && window.PatentCache) {
                        PatentCache.save(patentNumber, result.data, selectedFields, result.url);
                    }
                    
                    // 保存到历史记录
                    if (window.PatentHistory) {
                        window.PatentHistory.add(patentNumber, 'crawl', {
                            title: result.data?.title || ''
                        });
                    }
                    
                    // 实时显示
                    displayPatentResult(result, results.length - 1, patentNumbers.length);
                }
            } catch (error) {
                console.error(`❌ 爬取专利 ${patentNumber} 失败:`, error);
                const errorResult = {
                    patent_number: patentNumber,
                    success: false,
                    error: error.message
                };
                results.push(errorResult);
                displayPatentResult(errorResult, results.length - 1, patentNumbers.length);
            }
            
            // 更新进度
            appState.patentBatch.crawlProgress.current++;
            updateCrawlProgress();
        }
        
        // 按照用户输入的顺序重新排列结果
        const orderedResults = [];
        for (const patentNumber of patentNumbers) {
            const result = results.find(r => r.patent_number.toUpperCase() === patentNumber.toUpperCase());
            if (result) {
                orderedResults.push(result);
            }
        }
        
        window.patentResults = orderedResults;
        appState.patentBatch.patentResults = orderedResults;
        
        // 更新状态
        const successCount = orderedResults.filter(r => r.success).length;
        const failCount = orderedResults.filter(r => !r.success).length;
        searchStatus.textContent = `爬取完成，成功 ${successCount} 个，失败 ${failCount} 个${cachedPatents.length > 0 ? `（其中 ${cachedPatents.length} 个来自缓存）` : ''}`;
        
        // 完成爬取
        appState.patentBatch.isCrawling = false;
        updateCrawlProgress();
        
        // 如果有成功的结果，启用一键解读按钮
        if (successCount > 0) {
            if (analyzeAllBtn) {
                analyzeAllBtn.disabled = false;
            }
            
            // 检查是否开启自动解读
            const autoAnalyzeCheckbox = document.getElementById('auto_analyze_checkbox');
            if (autoAnalyzeCheckbox && autoAnalyzeCheckbox.checked) {
                console.log('🤖 自动解读已开启，开始批量解读...');
                searchStatus.textContent += '，自动开始解读...';
                
                // 延迟一下让用户看到爬取完成的状态
                setTimeout(() => {
                    // 触发标签页中的批量解读
                    if (window.patentTabManager && window.originalResultsTabId) {
                        window.patentTabManager.analyzeAllPatents(window.originalResultsTabId);
                    } else if (analyzeAllBtn) {
                        analyzeAllBtn.click();
                    }
                }, 500);
            }
        }
    }
    
    // 更新爬取进度条
    function updateCrawlProgress() {
        const container = document.getElementById('crawl_progress_container');
        const text = document.getElementById('crawl_progress_text');
        const count = document.getElementById('crawl_progress_count');
        const bar = document.getElementById('crawl_progress_bar');
        
        if (!container || !text || !count || !bar) return;
        
        const { current, total } = appState.patentBatch.crawlProgress;
        
        if (appState.patentBatch.isCrawling || current > 0) {
            container.style.display = 'block';
            text.textContent = appState.patentBatch.isCrawling ? '正在爬取...' : '爬取完成';
            count.textContent = `${current}/${total}`;
            const percentage = total > 0 ? (current / total * 100) : 0;
            bar.style.width = `${percentage}%`;
        } else {
            container.style.display = 'none';
        }
    }
    
    // 更新解读进度条
    function updateAnalyzeProgress() {
        const container = document.getElementById('analyze_progress_container');
        const text = document.getElementById('analyze_progress_text');
        const count = document.getElementById('analyze_progress_count');
        const bar = document.getElementById('analyze_progress_bar');
        
        if (!container || !text || !count || !bar) return;
        
        const { current, total } = appState.patentBatch.analyzeProgress;
        
        if (appState.patentBatch.isAnalyzing || current > 0) {
            container.style.display = 'block';
            text.textContent = appState.patentBatch.isAnalyzing ? '正在解读...' : '解读完成';
            count.textContent = `${current}/${total}`;
            const percentage = total > 0 ? (current / total * 100) : 0;
            bar.style.width = `${percentage}%`;
        } else {
            container.style.display = 'none';
        }
    }
    
    // 生成专利条带HTML（统一样式）
    function generatePatentStripHTML(result) {
        if (!result.success) {
            return `
                <div class="patent-strip error" data-patent-number="${result.patent_number}">
                    <div class="patent-strip-image">
                        <div class="no-image">查询失败</div>
                    </div>
                    <div class="patent-strip-content">
                        <div class="patent-strip-number">${result.patent_number}</div>
                        <div class="patent-strip-error">查询失败: ${result.error}</div>
                    </div>
                </div>
            `;
        }

        const data = result.data;
        const titlePreview = data.title ? (data.title.length > 60 ? data.title.substring(0, 60) + '...' : data.title) : '无标题';
        const cacheBadge = result.fromCache ? '<span class="cache-badge">缓存</span>' : '';
        const hasImages = data.images && data.images.length > 0;
        const firstImage = hasImages ? data.images[0] : null;
        
        // 获取申请人、申请日信息（去掉发明人）
        // 后端返回的是 assignees 数组，需要取第一个或使用 join
        const applicant = data.applicant || (data.assignees && data.assignees.length > 0 ? data.assignees.join(', ') : (data.assignee || '-'));
        // 后端返回的是 application_date，但也可能有 filing_date
        const filingDate = data.filing_date || data.application_date || data.priority_date || '-';

        return `
            <div class="patent-strip success" data-patent-number="${result.patent_number}">
                <div class="patent-strip-image">
                    ${firstImage ? `<img src="${firstImage}" alt="专利附图" loading="lazy">` : '<div class="no-image">暂无附图</div>'}
                </div>
                <div class="patent-strip-content">
                    <div class="patent-strip-number">${result.patent_number}${cacheBadge}</div>
                    <div class="patent-strip-title">${titlePreview}</div>
                    <div class="patent-strip-meta">
                        <span>申请人: ${applicant}</span>
                        <span>申请日: ${filingDate}</span>
                    </div>
                </div>
                <div class="patent-strip-actions">
                    <button class="small-button" onclick="event.stopPropagation(); openPatentDetailModal(window.patentResults.find(r => r.patent_number === '${result.patent_number}'))">
                        查看详情
                    </button>
                    <button class="small-button" onclick="event.stopPropagation(); openPatentDetailInNewTab('${result.patent_number}')">
                        新标签页
                    </button>
                </div>
            </div>
        `;
    }

    // 显示单个专利结果（实时显示）- 使用统一样式，包含图片、申请人、申请日等信息
    function displayPatentResult(result, index, total) {
        const stripItem = document.createElement('div');
        stripItem.innerHTML = generatePatentStripHTML(result);
        const newStrip = stripItem.firstElementChild;
        
        // 点击条带打开详情弹窗
        newStrip.addEventListener('click', (e) => {
            if (e.target.closest('.patent-strip-actions')) {
                return;
            }
            e.stopPropagation();
            openPatentDetailModal(result);
        });
        
        // 更新标签页中的结果
        if (window.patentTabManager && window.originalResultsTabId) {
            const tab = window.patentTabManager.tabs.find(t => t.id === window.originalResultsTabId);
            if (tab) {
                // 更新或添加结果
                const existingIndex = tab.results.findIndex(r => r.patent_number === result.patent_number);
                if (existingIndex >= 0) {
                    tab.results[existingIndex] = result;
                } else {
                    tab.results.push(result);
                }
                
                // 重新渲染标签页内容
                const resultsContainer = document.getElementById(`${window.originalResultsTabId}_results`);
                if (resultsContainer) {
                    resultsContainer.innerHTML = window.patentTabManager.generateResultsHTML(tab);
                }
                
                // 更新标签页标题显示数量
                const successCount = tab.results.filter(r => r.success).length;
                const tabButton = document.querySelector(`[data-tab-id="${window.originalResultsTabId}"] .tab-title`);
                if (tabButton) {
                    tabButton.textContent = `原始查询结果 (${successCount})`;
                }
            }
        }
        
        // 同时更新旧容器（兼容）
        const existingStrip = document.querySelector(`#patent_results_list [data-patent-number="${result.patent_number}"]`);
        if (existingStrip) {
            existingStrip.replaceWith(newStrip);
        } else {
            patentResultsList.appendChild(newStrip);
        }
    }
    
    // 批量查询专利按钮事件
    if (searchPatentsBtn) {
        searchPatentsBtn.addEventListener('click', async () => {
            const input = patentNumbersInput.value.trim();
            if (!input) {
                alert('请输入专利号');
                return;
            }
            
            // 处理专利号
            const patentNumbers = input.replace(/\n/g, ' ').split(/\s+/).filter(num => num);
            const uniquePatents = [...new Set(patentNumbers)];
            
            if (uniquePatents.length > 50) {
                alert('最多支持50个专利号');
                return;
            }
            
            await performPatentSearch(uniquePatents);
        });
    }
    
    // 一键解读全部（增强版：支持实时显示和进度条）
    if (analyzeAllBtn) {
        analyzeAllBtn.addEventListener('click', async () => {
        const successfulResults = window.patentResults.filter(r => r.success);
        if (successfulResults.length === 0) {
            alert('没有可解读的专利');
            return;
        }

        // 获取当前模板，如果没有则尝试加载默认模板
        let template = window.appState?.patentBatch?.currentTemplate;
        if (!template) {
            // 尝试加载默认模板
            if (typeof loadTemplate === 'function') {
                console.log('🔄 没有当前模板，尝试加载默认模板...');
                loadTemplate('default');
                template = window.appState?.patentBatch?.currentTemplate;
            }
            
            // 如果仍然没有模板，提示用户
            if (!template) {
                alert('请先选择解读模板');
                return;
            }
        }

        // 获取是否包含说明书的选项
        const includeSpecification = document.getElementById('include_specification_checkbox')?.checked || false;

        // 获取解读结果容器
        const analysisResultsContainer = document.getElementById('analysis_results_container');
        const analysisProgressText = document.getElementById('analysis_progress_text');

        // 清空之前的解读结果
        if (analysisResultsList) {
            analysisResultsList.innerHTML = '';
        }
        window.patentBatchAnalysisResults = [];

        // 初始化进度
        appState.patentBatch.isAnalyzing = true;
        appState.patentBatch.analyzeProgress = { current: 0, total: successfulResults.length };
        updateAnalyzeProgress();

        // 显示解读状态
        searchStatus.textContent = `正在使用"${template.name}"模板解读 ${successfulResults.length} 个专利...`;
        searchStatus.style.display = 'block';

        // 创建一个Map来存储解读结果，key是专利号
        const analysisResultsMap = new Map();

        // 显示结果容器
        if (patentResultsContainer) {
            patentResultsContainer.style.display = 'block';
        }

        // 显示解读结果区域
        if (analysisResultsContainer) {
            analysisResultsContainer.style.display = 'block';
        }
        
        try {
            // 显示所有已打开新标签页中的解读区域
            successfulResults.forEach(patent => {
                const tabAnalysisSection = document.getElementById(`batch-analysis-${patent.patent_number}`);
                if (tabAnalysisSection) {
                    tabAnalysisSection.style.display = 'block';
                }
                // 也尝试通过新标签页的window对象更新
                const tabStatus = document.getElementById(`tab-analysis-status-${patent.patent_number}`);
                if (tabStatus) {
                    tabStatus.textContent = '解读中...';
                    tabStatus.style.color = '#1976d2';
                }
            });

            // 逐个解读专利（实时显示）
            for (let i = 0; i < successfulResults.length; i++) {
                const patent = successfulResults[i];

                // 更新进度
                appState.patentBatch.analyzeProgress.current = i;
                updateAnalyzeProgress();
                searchStatus.textContent = `正在解读第 ${i + 1}/${successfulResults.length} 个专利: ${patent.patent_number}...`;

                // 创建结果容器（按用户输入顺序）
                const resultId = `analysis_result_${patent.patent_number}`;
                let resultContainer = document.getElementById(resultId);
                if (!resultContainer && analysisResultsList) {
                    resultContainer = document.createElement('div');
                    resultContainer.id = resultId;
                    resultContainer.className = 'result-item analysis-result-item';
                    resultContainer.innerHTML = `
                        <div class="analysis-result-header" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f5f5f5; border-radius: 6px 6px 0 0;">
                            <h5 style="margin: 0; display: flex; align-items: center; gap: 8px;">
                                <span>专利 ${patent.patent_number}</span>
                                <span class="analysis-status" style="font-size: 12px; padding: 2px 8px; background: #e3f2fd; color: #1976d2; border-radius: 10px;">解读中...</span>
                            </h5>
                            <span style="font-size: 12px; color: #999;">${i + 1}/${successfulResults.length}</span>
                        </div>
                        <div class="analysis-result-content" style="padding: 15px;">
                            <div style="display: flex; align-items: center; gap: 10px; color: #666;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="rotating">
                                    <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/>
                                    <path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/>
                                </svg>
                                <span>正在分析专利内容...</span>
                            </div>
                        </div>
                    `;
                    analysisResultsList.appendChild(resultContainer);
                }
                
                try {
                    // 获取选择的模型
                    const selectedModel = getEl('patent_batch_model_selector')?.value || 'GLM-4-Flash';
                    
                    // 检查解读缓存
                    let analysisContent = null;
                    let fromCache = false;
                    
                    if (window.PatentCache && window.PatentCache.hasAnalysis) {
                        const cachedAnalysis = window.PatentCache.getAnalysis(patent.patent_number);
                        if (cachedAnalysis) {
                            analysisContent = cachedAnalysis.content;
                            fromCache = true;
                            console.log(`📦 使用解读缓存: ${patent.patent_number}`);
                        }
                    }
                    
                    // 如果没有缓存，调用API解读
                    if (!analysisContent) {
                        // 调试：检查 patent.data 的实际内容
                        console.log('🔍 main.js - patent.data 调试:');
                        console.log('  - patent 对象:', patent);
                        console.log('  - patent.data:', patent.data);
                        console.log('  - patent.data 的字段:', patent.data ? Object.keys(patent.data) : 'N/A');
                        console.log('  - patent.data.patent_number:', patent.data?.patent_number);
                        console.log('  - patent.data.title:', patent.data?.title);
                        console.log('  - patent.data.abstract:', patent.data?.abstract ? patent.data.abstract.substring(0, 50) + '...' : 'N/A');
                        console.log('  - patent.data.claims:', patent.data?.claims);
                        console.log('  - patent.data.description 是否存在:', !!patent.data?.description);
                        
                        // 使用模板构建提示词
                        const userPrompt = buildAnalysisPrompt(template, patent.data, includeSpecification);
                        
                        // 调用API解读专利
                        const analysisResult = await apiCall('/patent/analyze', {
                            patent_data: patent.data,
                            template: {
                                fields: template.fields,
                                system_prompt: template.systemPrompt
                            },
                            user_prompt: userPrompt,
                            include_specification: includeSpecification,
                            model: selectedModel
                        });
                        
                        // 更新解读结果
                        analysisContent = analysisResult.choices[0]?.message?.content || '解读失败';
                        
                        // 保存解读结果到缓存
                        if (window.PatentCache && window.PatentCache.saveAnalysis) {
                            window.PatentCache.saveAnalysis(patent.patent_number, {
                                content: analysisContent,
                                template: template.name,
                                templateId: template.id,
                                model: selectedModel
                            });
                        }
                        
                        // 保存到历史记录
                        if (window.PatentHistory) {
                            window.PatentHistory.add(patent.patent_number, 'analyze', {
                                title: patent.data?.title || ''
                            });
                        }
                    }
                    
                    // 尝试解析JSON格式的解读结果
                    let analysisJson = {};
                    let displayContent = '';
                    let parseSuccess = false;
                    
                    try {
                        // 尝试清理可能的markdown代码块标记
                        let cleanContent = analysisContent.trim();
                        if (cleanContent.startsWith('```json')) {
                            cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                        } else if (cleanContent.startsWith('```')) {
                            cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
                        }
                        
                        analysisJson = JSON.parse(cleanContent);
                        parseSuccess = true;
                        
                        // 动态生成表格内容（根据模板字段）
                        let tableRows = '';
                        template.fields.forEach(field => {
                            const value = analysisJson[field.id] || '-';
                            const displayValue = typeof value === 'string' ? value.replace(/\n/g, '<br>') : value;
                            tableRows += `<tr><td style="border: 1px solid #ddd; padding: 8px; font-weight: 500;">${field.name}</td><td style="border: 1px solid #ddd; padding: 8px;">${displayValue}</td></tr>`;
                        });
                        
                        displayContent = `
                            <div class="analysis-content">
                                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                                    <tr><th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">字段</th><th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">内容</th></tr>
                                    ${tableRows}
                                </table>
                            </div>
                        `;
                    } catch (e) {
                        console.error('JSON解析失败:', e);
                        // 如果不是JSON格式，显示原始内容
                        displayContent = `
                            <div class="analysis-content">
                                <div style="padding: 10px; background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; margin-bottom: 10px;">
                                    ⚠️ 解读结果未能解析为结构化格式，显示原始内容：
                                </div>
                                <div style="white-space: pre-wrap; font-family: monospace; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">
                                    ${analysisContent}
                                </div>
                            </div>
                        `;
                    }
                    
                    // 实时更新结果容器
                    if (resultContainer) {
                        const statusBadge = resultContainer.querySelector('.analysis-status');
                        if (statusBadge) {
                            statusBadge.textContent = fromCache ? '已缓存' : '已完成';
                            statusBadge.style.background = fromCache ? '#fff3cd' : '#d4edda';
                            statusBadge.style.color = fromCache ? '#856404' : '#155724';
                        }

                        const contentDiv = resultContainer.querySelector('.analysis-result-content');
                        if (contentDiv) {
                            contentDiv.innerHTML = `
                                <div class="ai-disclaimer compact" style="margin-bottom: 10px;">
                                    <div class="ai-disclaimer-icon">AI</div>
                                    <div class="ai-disclaimer-text"><strong>AI生成：</strong>以下解读由AI生成，仅供参考${fromCache ? '（来自缓存）' : ''}</div>
                                </div>
                                ${displayContent}
                            `;
                        }
                    }

                    // 更新标签页中的解读结果
                    updateTabAnalysisResult(patent.patent_number, analysisContent, parseSuccess, template);

                    // 更新进度文本
                    if (analysisProgressText) {
                        analysisProgressText.textContent = `已完成 ${i + 1}/${successfulResults.length}`;
                    }

                    // 存储解读结果到Map
                    analysisResultsMap.set(patent.patent_number, {
                        patent_number: patent.patent_number,
                        patent_data: patent.data,
                        analysis_content: analysisContent,
                        parseSuccess: parseSuccess
                    });

                    // 滚动到新完成的结果（如果是第一个或每3个滚动一次，避免过度滚动）
                    if (resultContainer && (i === 0 || (i + 1) % 3 === 0)) {
                        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }

                    // 实时更新专利详情弹窗中的解读结果（如果弹窗已打开）
                    updatePatentDetailAnalysis(patent.patent_number, analysisContent, parseSuccess, template);
                } catch (error) {
                    console.error(`❌ 解读专利 ${patent.patent_number} 失败:`, error);

                    // 显示错误状态
                    if (resultContainer) {
                        const statusBadge = resultContainer.querySelector('.analysis-status');
                        if (statusBadge) {
                            statusBadge.textContent = '失败';
                            statusBadge.style.background = '#f8d7da';
                            statusBadge.style.color = '#721c24';
                        }

                        const contentDiv = resultContainer.querySelector('.analysis-result-content');
                        if (contentDiv) {
                            contentDiv.innerHTML = `
                                <div style="padding: 10px; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; color: #721c24;">
                                    <strong>解读失败:</strong> ${error.message}
                                </div>
                            `;
                        }
                    }

                    // 更新进度文本（即使失败也更新）
                    if (analysisProgressText) {
                        analysisProgressText.textContent = `已完成 ${i + 1}/${successfulResults.length} (含失败)`;
                    }
                }
                
                // 更新进度
                appState.patentBatch.analyzeProgress.current = i + 1;
                updateAnalyzeProgress();
            }
            
            // 完成解读
            appState.patentBatch.isAnalyzing = false;
            updateAnalyzeProgress();

            // 按照用户输入的顺序重新组织 analysisResults 数组
            window.patentBatchAnalysisResults = [];
            window.patentResults.forEach(result => {
                if (result.success && analysisResultsMap.has(result.patent_number)) {
                    window.patentBatchAnalysisResults.push(analysisResultsMap.get(result.patent_number));
                }
            });

            // 更新状态
            const completedCount = window.patentBatchAnalysisResults.length;
            searchStatus.textContent = `解读完成，成功 ${completedCount}/${successfulResults.length} 个专利`;

            // 更新最终进度文本
            if (analysisProgressText) {
                analysisProgressText.textContent = `全部完成 (${completedCount}/${successfulResults.length})`;
                analysisProgressText.style.color = '#28a745';
            }

            // 启用导出按钮
            if (exportAnalysisExcelBtn) {
                exportAnalysisExcelBtn.disabled = false;
            }
        } catch (error) {
            console.error('专利解读失败:', error);
            searchStatus.textContent = `解读失败: ${error.message}`;
            searchStatus.style.color = 'red';

            // 更新进度文本显示失败状态
            if (analysisProgressText) {
                analysisProgressText.textContent = '解读失败';
                analysisProgressText.style.color = '#dc3545';
            }

            appState.patentBatch.isAnalyzing = false;
            updateAnalyzeProgress();
        }
    });
    }
}

// 显示专利查询结果 - 条带式展示
function displayPatentResults(results) {
    // 保存到状态
    appState.patentBatch.patentResults = results;
    
    // 显示结果容器
    if (patentResultsContainer) {
        patentResultsContainer.style.display = 'block';
    }
    
    patentResultsList.innerHTML = '';
    
    results.forEach(result => {
        const stripItem = document.createElement('div');
        stripItem.className = `patent-strip ${result.success ? 'success' : 'error'}`;
        
        if (result.success) {
            const data = result.data;
            const titlePreview = data.title ? (data.title.length > 60 ? data.title.substring(0, 60) + '...' : data.title) : '无标题';
            
            stripItem.innerHTML = `
                <div class="patent-strip-icon">
                    ✓
                </div>
                <div class="patent-strip-content">
                    <div class="patent-strip-number">${result.patent_number}</div>
                    <div class="patent-strip-title">${titlePreview}</div>
                </div>
                <div class="patent-strip-actions">
                    <button class="patent-strip-copy-btn" onclick="copyPatentNumber('${result.patent_number}', event)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                            <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                        </svg>
                        复制
                    </button>
                </div>
            `;
            
            // 点击条带打开详情弹窗
            stripItem.addEventListener('click', (e) => {
                // 如果点击的是复制按钮，不打开弹窗
                if (e.target.closest('.patent-strip-copy-btn')) {
                    return;
                }
                e.stopPropagation(); // 阻止事件冒泡
                openPatentDetailModal(result);
            });
        } else {
            stripItem.innerHTML = `
                <div class="patent-strip-icon">
                    ✗
                </div>
                <div class="patent-strip-content">
                    <div class="patent-strip-number">${result.patent_number}</div>
                    <div class="patent-strip-error">查询失败: ${result.error}</div>
                </div>
            `;
        }
        
        patentResultsList.appendChild(stripItem);
    });
    
    // 启用导出按钮，即使没有解读结果也可以导出爬取的字段
    if (exportAnalysisExcelBtn) {
        exportAnalysisExcelBtn.disabled = false;
    }
}

// 切换权利要求显示/隐藏 - 单按钮切换
function toggleClaims(patentNumber) {
    const container = document.getElementById(`claims_${patentNumber}`);
    const claimItems = document.querySelectorAll(`.claim-item[id^="claim_${patentNumber}"]`);
    
    if (!container || !claimItems.length) return;
    
    // 查找切换按钮
    const toggleBtn = container.parentElement.querySelector(`button[onclick*="toggleClaims('${patentNumber}')"]`);
    if (!toggleBtn) return;
    
    // 检查当前状态：如果有任何一个隐藏的项，说明是收起状态
    let isCollapsed = false;
    claimItems.forEach((item, index) => {
        if (index >= 3 && item.style.display === 'none') {
            isCollapsed = true;
        }
    });
    
    if (isCollapsed) {
        // 展开全部
        claimItems.forEach((item) => {
            item.style.display = 'block';
        });
        container.style.maxHeight = 'none';
        container.style.overflowY = 'visible';
        toggleBtn.textContent = '收起';
    } else {
        // 收起，只显示前3条
        claimItems.forEach((item, index) => {
            if (index >= 3) {
                item.style.display = 'none';
            }
        });
        container.style.maxHeight = '200px';
        container.style.overflowY = 'auto';
        toggleBtn.textContent = '展开全部';
    }
}

// ====================================================================
// 专利详情弹窗功能
// ====================================================================

// 打开专利详情弹窗
window.openPatentDetailModal = function(result) {
    const modal = document.getElementById('patent_detail_modal');
    const modalBody = document.getElementById('patent_detail_body');
    const modalHeader = modal.querySelector('.modal-header');
    const modalContent = modal.querySelector('.modal-content');

    if (!modal || !modalBody || !modalHeader) return;

    const data = result.data;

    // 清空并重建modal header，添加左上角关闭按钮
    modalHeader.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%; gap: 15px;">
            <!-- 左上角关闭按钮 -->
            <button class="close-modal" onclick="closePatentDetailModal()" style="position: absolute; left: 15px; top: 15px; z-index: 10; background: rgba(255, 255, 255, 0.9); border: 1px solid #ddd; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 20px; color: #666; transition: all 0.3s;" onmouseover="this.style.background='#f44336'; this.style.color='white'; this.style.borderColor='#f44336';" onmouseout="this.style.background='rgba(255, 255, 255, 0.9)'; this.style.color='#666'; this.style.borderColor='#ddd';" title="关闭">&times;</button>
            
            <div style="flex: 1; min-width: 0; padding-left: 40px;">
                <h3 style="margin: 0; font-size: 1.2em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${result.patent_number} - ${data.title || '无标题'}</h3>
                ${result.url ? `
                <div style="font-size: 0.85em; color: #666; margin-top: 5px;">
                    <a href="${result.url}" target="_blank" style="color: var(--primary-color); text-decoration: underline;">🔗 查看 Google Patents 原文</a>
                </div>
                ` : ''}
            </div>
            <div style="display: flex; gap: 8px; align-items: flex-start; flex-shrink: 0;">
                <!-- 上一条/下一条切换按钮 -->
                <div style="display: flex; gap: 5px; border: 1px solid var(--border-color); border-radius: 6px; overflow: hidden;">
                    <button class="small-button" onclick="navigatePatent('prev', '${result.patent_number}')" style="border-radius: 0; border-right: 1px solid var(--border-color);" title="上一条">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M15 8a.5.5 0 0 1-.5.5H2.707l3.147 3.146a.5.5 0 0 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 7.5H14.5A.5.5 0 0 1 15 8z"/>
                        </svg>
                    </button>
                    <button class="small-button" onclick="navigatePatent('next', '${result.patent_number}')" style="border-radius: 0;" title="下一条">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"/>
                        </svg>
                    </button>
                </div>
                <!-- 新标签页打开按钮 -->
                <button class="small-button" onclick="openPatentDetailInNewTab('${result.patent_number}')" title="新标签页打开">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <path fill-rule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/>
                        <path fill-rule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/>
                    </svg>
                </button>
                <!-- 问一问按钮 -->
                <button class="small-button patent-chat-btn" onclick="openPatentChat('${result.patent_number}')" title="问一问">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M5 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
                        <path d="m2.165 15.803.02-.004c1.83-.363 2.948-.842 3.468-1.105A9.06 9.06 0 0 0 8 15c4.418 0 8-3.134 8-7s-3.582-7-8-7-8 3.134-8 7c0 1.76.743 3.37 1.97 4.6a10.437 10.437 0 0 1-.524 2.318l-.003.011a10.722 10.722 0 0 1-.244.637c-.079.186.074.394.273.362a21.673 21.673 0 0 0 .693-.125zm.8-3.108a1 1 0 0 0-.287-.801C1.618 10.83 1 9.468 1 8c0-3.192 3.004-6 7-6s7 2.808 7 6c0 3.193-3.004 6-7 6a8.06 8.06 0 0 1-2.088-.272 1 1 0 0 0-.711.074c-.387.196-1.24.57-2.634.893a10.97 10.97 0 0 0 .398-2z"/>
                    </svg>
                </button>
            </div>
        </div>
    `;

    // 构建完整的专利信息HTML（不再包含patent-card-header）
    // 获取当前选中的字段
    const selectedFields = window.getSelectedFields ? window.getSelectedFields() : null;
    let htmlContent = buildPatentDetailHTML(result, selectedFields);

    modalBody.innerHTML = htmlContent;

    // 设置为flex显示，确保居中
    modal.style.display = 'flex';

    // 触发重排，然后添加show类以触发过渡效果
    setTimeout(() => {
        modal.classList.add('show');

        // 滚动到弹窗顶部
        modalBody.scrollTop = 0;
    }, 10);
};

// 关闭专利详情弹窗
window.closePatentDetailModal = function() {
    const modal = document.getElementById('patent_detail_modal');
    if (modal) {
        // 移除show类，触发过渡效果
        modal.classList.remove('show');

        // 等待过渡效果完成后再隐藏
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
};

// 导航到上一条或下一条专利
window.navigatePatent = function(direction, currentPatentNumber) {
    if (!window.patentResults || window.patentResults.length === 0) return;
    
    // 找到当前专利在结果列表中的索引
    const currentIndex = window.patentResults.findIndex(result => result.patent_number === currentPatentNumber);
    if (currentIndex === -1) return;
    
    let targetIndex;
    if (direction === 'prev') {
        targetIndex = currentIndex > 0 ? currentIndex - 1 : window.patentResults.length - 1;
    } else if (direction === 'next') {
        targetIndex = currentIndex < window.patentResults.length - 1 ? currentIndex + 1 : 0;
    }
    
    // 打开目标专利详情
    const targetResult = window.patentResults[targetIndex];
    if (targetResult) {
        openPatentDetailModal(targetResult);
    }
};

// 为专利详情弹窗添加键盘事件监听
window.addEventListener('keydown', function(event) {
    const modal = document.getElementById('patent_detail_modal');
    if (modal && modal.style.display !== 'none') {
        // 检查是否按下了上下箭头键或左右箭头键
        if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
            // 查找当前显示的专利号
            const title = document.getElementById('patent_detail_title').textContent;
            const patentNumber = title.split(' - ')[0];
            navigatePatent('prev', patentNumber);
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
            // 查找当前显示的专利号
            const title = document.getElementById('patent_detail_title').textContent;
            const patentNumber = title.split(' - ')[0];
            navigatePatent('next', patentNumber);
        } else if (event.key === 'Escape') {
            // 按ESC键关闭弹窗
            closePatentDetailModal();
        }
    }
});

// 在新标签页打开专利
window.openPatentInNewTab = function(url) {
    window.open(url, '_blank');
};

// 在新标签页打开专利详情
// 此函数已移至 js/patentDetailNewTab.js 文件中，采用全新现代化设计

// 复制字段内容
window.copyFieldContent = function(patentNumber, fieldKey, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    // 清除页面选中内容，防止智能剪贴板错误捕获
    if (window.getSelection) {
        window.getSelection().removeAllRanges();
    }
    
    // 找到对应的专利结果
    const patentResult = window.patentResults.find(result => result.patent_number === patentNumber);
    if (!patentResult || !patentResult.success) {
        alert('❌ 无法复制：专利数据不存在');
        return;
    }
    
    const data = patentResult.data;
    let contentToCopy = '';
    
    // 根据字段类型获取不同的内容
    switch (fieldKey) {
        case 'abstract':
            contentToCopy = data.abstract || '';
            break;
        case 'inventors':
            contentToCopy = data.inventors && data.inventors.length > 0 ? data.inventors.join(', ') : '';
            break;
        case 'assignees':
            contentToCopy = data.assignees && data.assignees.length > 0 ? data.assignees.join(', ') : '';
            break;
        case 'application_date':
            contentToCopy = data.application_date || '';
            break;
        case 'publication_date':
            contentToCopy = data.publication_date || '';
            break;
        case 'url':
            contentToCopy = patentResult.url || '';
            break;
        case 'claims':
            contentToCopy = data.claims && data.claims.length > 0 ? data.claims.join('\n\n') : '';
            break;
        case 'description':
            contentToCopy = data.description || '';
            break;
        case 'patent_citations':
            if (data.patent_citations && data.patent_citations.length > 0) {
                contentToCopy = data.patent_citations.map(citation => 
                    citation.patent_number
                ).join('\n');
            }
            break;
        case 'cited_by':
            if (data.cited_by && data.cited_by.length > 0) {
                contentToCopy = data.cited_by.map(citation => 
                    citation.patent_number
                ).join('\n');
            }
            break;
        case 'legal_events':
            if (data.legal_events && data.legal_events.length > 0) {
                contentToCopy = data.legal_events.map(event => 
                    `${event.date}: ${event.description}`
                ).join('\n');
            }
            break;
        case 'events_timeline':
            if (data.events_timeline && data.events_timeline.length > 0) {
                contentToCopy = data.events_timeline.map(event => 
                    `${event.date}: ${event.title || event.description}`
                ).join('\n');
            }
            break;
        default:
            contentToCopy = patentNumber;
    }
    
    // 复制到剪贴板
    navigator.clipboard.writeText(contentToCopy)
        .then(() => {
            console.log('📋 copyFieldContent - contentToCopy:', contentToCopy?.substring(0, 100));
            console.log('📋 copyFieldContent - smartClipboard exists:', !!window.smartClipboard);
            
            // 同步到智能剪贴板
            if (window.smartClipboard && contentToCopy) {
                console.log('📋 copyFieldContent - calling export');
                window.smartClipboard.export(contentToCopy, '功能六-专利详情', {
                    source: '快捷复制按钮',
                    patentNumber: patentNumber,
                    fieldKey: fieldKey,
                    timestamp: Date.now()
                });
            }
            
            const btn = event?.target?.closest('button');
            if (btn) {
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/></svg> 已复制';
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                }, 1500);
            }
        })
        .catch(() => alert('❌ 复制失败'));
};

// 从弹窗分析关系专利
window.analyzeRelationFromModal = function(patentNumber, relationType) {
    // 找到对应的专利结果
    const patentResult = window.patentResults.find(result => result.patent_number === patentNumber);
    if (!patentResult || !patentResult.success) {
        alert('❌ 无法分析：专利数据不存在');
        return;
    }

    const data = patentResult.data;
    let relationData = [];

    // 根据关系类型获取数据
    switch (relationType) {
        case 'family':
            if (data.family_applications && data.family_applications.length > 0) {
                relationData = data.family_applications.map(app => ({
                    publication_number: app.publication_number,
                    application_number: app.application_number,
                    status: app.status || ''
                }));
            }
            break;
        case 'citations':
            if (data.patent_citations && data.patent_citations.length > 0) {
                relationData = data.patent_citations.map(citation => ({
                    patent_number: citation.patent_number,
                    title: citation.title || ''
                }));
            }
            break;
        case 'cited_by':
            if (data.cited_by && data.cited_by.length > 0) {
                relationData = data.cited_by.map(citation => ({
                    patent_number: citation.patent_number,
                    title: citation.title || ''
                }));
            }
            break;
        case 'similar':
            if (data.similar_documents && data.similar_documents.length > 0) {
                relationData = data.similar_documents.map(doc => ({
                    patent_number: doc.patent_number,
                    title: ''
                }));
            }
            break;
    }

    if (relationData.length === 0) {
        alert('没有找到相关专利数据');
        return;
    }

    // 调用关系分析函数
    if (window.openRelationAnalysisTab) {
        window.openRelationAnalysisTab(patentNumber, relationType, relationData);
        // 关闭弹窗
        closePatentDetailModal();
    } else {
        alert('分析功能未加载，请刷新页面后重试');
    }
};

// 从弹窗跳转到同族权利要求对比分析
window.jumpToFamilyComparisonFromModal = function(patentNumber) {
    // 找到对应的专利结果
    const patentResult = window.patentResults.find(result => result.patent_number === patentNumber);
    if (!patentResult || !patentResult.success) {
        alert('❌ 无法分析：专利数据不存在');
        return;
    }

    const data = patentResult.data;
    
    // 获取同族专利公开号列表
    let familyPatentNumbers = [];
    if (data.family_applications && data.family_applications.length > 0) {
        familyPatentNumbers = data.family_applications
            .map(app => app.publication_number)
            .filter(num => num && num !== '-');
    }
    
    if (familyPatentNumbers.length < 2) {
        alert('同族专利数量不足，需要至少2个同族专利才能进行对比分析');
        return;
    }
    
    // 关闭弹窗
    closePatentDetailModal();
    
    // 调用跳转函数
    if (window.startFamilyClaimsComparison) {
        window.startFamilyClaimsComparison(patentNumber, familyPatentNumbers);
    } else {
        alert('同族对比功能未加载，请刷新页面后重试');
    }
};

// 弹窗中显示翻译对话框
window.showTranslateModal = function(patentNumber, textType, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    const models = window.AVAILABLE_MODELS || ['glm-4-flash', 'glm-4-long', 'glm-4.7-flash'];
    
    const cacheKeyPrefix = `translation_${patentNumber}_${textType}_`;
    let cachedModel = null;
    for (const m of models) {
        if (getTranslationCache(cacheKeyPrefix + m)) {
            cachedModel = m;
            break;
        }
    }
    
    const dialog = document.createElement('div');
    dialog.id = 'translate-modal-dialog';
    dialog.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 10001;';
    
    dialog.innerHTML = `
        <div style="background: white; border-radius: 12px; padding: 24px; max-width: 400px; width: 90%; box-shadow: 0 8px 32px rgba(0,0,0,0.2);">
            <h3 style="margin: 0 0 16px 0; color: var(--primary-color); display: flex; align-items: center; gap: 8px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M4.545 6.714 4.11 8H3l1.862-5h1.284L8 8H6.833l-.435-1.286H4.545zm1.634-.736L5.5 3.956h-.049l-.679 2.022H6.18z"/>
                    <path d="M0 2a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v3h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-3H2a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H2z"/>
                </svg>
                选择翻译模型
            </h3>
            ${cachedModel ? `<p style="margin: 0 0 8px 0; color: #28a745; font-size: 13px;">✅ 已有缓存 (模型: ${cachedModel})</p>` : ''}
            <p style="margin: 0 0 16px 0; color: #666; font-size: 14px;">请选择用于翻译${textType === 'claims' ? '权利要求' : '说明书'}的AI模型：</p>
            <select id="translate-modal-model-select" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; margin-bottom: 16px;">
                ${models.map(m => `<option value="${m}" ${m === cachedModel ? 'selected' : ''}>${m}</option>`).join('')}
            </select>
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button onclick="document.getElementById('translate-modal-dialog').remove()" style="padding: 8px 20px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer;">取消</button>
                <button id="start-translate-modal-btn" style="padding: 8px 20px; border: none; background: linear-gradient(135deg, #00bcd4 0%, #009688 100%); color: white; border-radius: 6px; cursor: pointer; font-weight: 500;">开始翻译</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    document.getElementById('start-translate-modal-btn').onclick = function() {
        const model = document.getElementById('translate-modal-model-select').value;
        dialog.remove();
        startModalTranslation(patentNumber, textType, model);
    };
    
    dialog.onclick = function(e) {
        if (e.target === dialog) {
            dialog.remove();
        }
    };
};

// 开始弹窗翻译 - 直接调用智谱AI API（参考功能八实现）
async function startModalTranslation(patentNumber, textType, model) {
    const btn = document.querySelector(`[data-translate-patent="${patentNumber}"][data-translate-type="${textType}"]`);
    
    const cacheKey = `translation_${patentNumber}_${textType}_${model}`;
    const cachedTranslation = getTranslationCache(cacheKey);
    
    if (cachedTranslation) {
        console.log(`发现翻译缓存: ${cacheKey}`);
        showModalTranslationResult({ translations: cachedTranslation, fromCache: true }, textType);
        return;
    }
    
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span style="animation: spin 1s linear infinite; display: inline-block;">⏳</span> 翻译中...';
    }
    
    try {
        const patentResult = window.patentResults.find(result => result.patent_number === patentNumber);
        if (!patentResult || !patentResult.success) {
            throw new Error('专利数据不存在');
        }
        
        const data = patentResult.data;
        const apiKey = appState.apiKey || localStorage.getItem('api_key') || '';
        
        if (!apiKey) {
            throw new Error('请先配置API Key');
        }
        
        let translations = [];
        
        if (textType === 'claims') {
            const claims = data.claims || [];
            if (claims.length === 0) {
                throw new Error('没有可翻译的权利要求');
            }
            translations = await translateClaimsDirect(claims, model, apiKey);
        } else {
            const description = data.description || '';
            if (!description) {
                throw new Error('没有可翻译的说明书内容');
            }
            translations = await translateDescriptionDirect(description, model, apiKey);
        }
        
        saveTranslationCache(cacheKey, translations);
        
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '🌐 翻译';
        }
        
        showModalTranslationResult({ translations }, textType);
        
    } catch (error) {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '🌐 翻译';
        }
        alert('翻译失败: ' + error.message);
        console.error('翻译错误:', error);
    }
}

function getTranslationCache(cacheKey) {
    try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const data = JSON.parse(cached);
            const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000;
            if (Date.now() - data.timestamp < CACHE_EXPIRY) {
                return data.translations;
            } else {
                localStorage.removeItem(cacheKey);
            }
        }
    } catch (e) {
        console.error('读取翻译缓存失败:', e);
    }
    return null;
}

function saveTranslationCache(cacheKey, translations) {
    try {
        const data = {
            translations: translations,
            timestamp: Date.now()
        };
        localStorage.setItem(cacheKey, JSON.stringify(data));
        console.log(`翻译结果已缓存: ${cacheKey}`);
    } catch (e) {
        console.error('保存翻译缓存失败:', e);
    }
}

// 直接调用智谱AI API翻译权利要求
async function translateClaimsDirect(claims, model, apiKey) {
    const url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
    const translations = [];
    
    const formattedClaims = claims.map((claim, i) => 
        `权利要求 ${i + 1}: ${typeof claim === 'string' ? claim : claim.text || ''}`
    ).join('\n\n');
    
    const systemPrompt = `你是一位专业的专利文献翻译专家。请将以下英文专利权利要求翻译为中文。

要求:
1. 保持专利术语的准确性
2. 保留所有数字标记(如10、20、图1等)
3. 翻译要流畅自然,符合中文专利文献的表达习惯
4. 保持权利要求的编号和格式
5. 不要添加任何解释或注释,只返回翻译结果

请按照以下格式返回翻译结果，每条权利要求单独一行，以"权利要求 X:"开头：
权利要求 1: [翻译内容]
权利要求 2: [翻译内容]`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: formattedClaims }
            ],
            temperature: 0.3,
            max_tokens: 4096
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API请求失败: ${response.status}`);
    }

    const result = await response.json();
    const translatedText = result.choices?.[0]?.message?.content || '';
    
    const pattern = /权利要求\s*(\d+)[:：]\s*(.*?)(?=权利要求\s*\d+[:：]|$)/gs;
    const matches = [...translatedText.matchAll(pattern)];
    
    if (matches.length > 0) {
        const translatedMap = {};
        matches.forEach(match => {
            const idx = parseInt(match[1]);
            translatedMap[idx] = match[2].trim();
        });
        
        claims.forEach((claim, i) => {
            const claimText = typeof claim === 'string' ? claim : claim.text || '';
            translations.push({
                original: claimText,
                translated: translatedMap[i + 1] || '[翻译解析失败]',
                index: i + 1
            });
        });
    } else {
        const lines = translatedText.split('\n').filter(l => l.trim());
        claims.forEach((claim, i) => {
            const claimText = typeof claim === 'string' ? claim : claim.text || '';
            translations.push({
                original: claimText,
                translated: lines[i] || translatedText,
                index: i + 1
            });
        });
    }
    
    return translations;
}

// 直接调用智谱AI API翻译说明书
async function translateDescriptionDirect(description, model, apiKey) {
    const url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
    const translations = [];
    
    const maxChunkSize = 4000;
    
    if (description.length > maxChunkSize) {
        const paragraphs = description.split(/\n\n+/).filter(p => p.trim());
        
        for (let i = 0; i < paragraphs.length; i++) {
            const para = paragraphs[i];
            if (!para.trim()) continue;
            
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [
                            {
                                role: 'system',
                                content: '你是一位专业的专利文献翻译专家。请将以下英文专利说明书段落翻译为中文。保持专利术语的准确性，保留所有数字标记，翻译要流畅自然。只返回翻译结果，不要添加任何解释。'
                            },
                            { role: 'user', content: para }
                        ],
                        temperature: 0.3,
                        max_tokens: 4096
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error?.message || `API请求失败: ${response.status}`);
                }

                const result = await response.json();
                const translated = result.choices?.[0]?.message?.content || '';
                
                translations.push({
                    original: para,
                    translated: translated
                });
            } catch (e) {
                translations.push({
                    original: para,
                    translated: `[翻译失败: ${e.message}]`
                });
            }
        }
    } else {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: '你是一位专业的专利文献翻译专家。请将以下英文专利说明书翻译为中文。保持专利术语的准确性，保留所有数字标记，翻译要流畅自然。只返回翻译结果，不要添加任何解释。'
                    },
                    { role: 'user', content: description }
                ],
                temperature: 0.3,
                max_tokens: 4096
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API请求失败: ${response.status}`);
        }

        const result = await response.json();
        const translated = result.choices?.[0]?.message?.content || '';
        
        translations.push({
            original: description,
            translated: translated
        });
    }
    
    return translations;
}

// 显示弹窗翻译结果
function showModalTranslationResult(result, textType) {
    const translations = result.translations || [];
    
    // 创建对照显示弹窗
    const resultDiv = document.createElement('div');
    resultDiv.id = 'translate-modal-result';
    resultDiv.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 10001;';
    
    let contentHtml = '';
    if (textType === 'claims') {
        translations.forEach(item => {
            contentHtml += `
                <div style="border-bottom: 1px solid #e0e0e0; padding: 16px 0;">
                    <div style="font-weight: 600; color: var(--primary-color); margin-bottom: 8px;">权利要求 ${item.index}</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; font-size: 13px; line-height: 1.6;">
                            <div style="color: #999; font-size: 11px; margin-bottom: 4px;">原文 (英文)</div>
                            ${item.original}
                        </div>
                        <div style="background: #e8f5e9; padding: 12px; border-radius: 6px; font-size: 13px; line-height: 1.6;">
                            <div style="color: var(--primary-color); font-size: 11px; margin-bottom: 4px;">译文 (中文)</div>
                            ${item.translated}
                        </div>
                    </div>
                </div>
            `;
        });
    } else {
        translations.forEach((item, index) => {
            contentHtml += `
                <div style="border-bottom: 1px solid #e0e0e0; padding: 16px 0;">
                    <div style="font-weight: 600; color: var(--primary-color); margin-bottom: 8px;">段落 ${index + 1}</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; font-size: 13px; line-height: 1.6; max-height: 200px; overflow-y: auto;">
                            <div style="color: #999; font-size: 11px; margin-bottom: 4px;">原文 (英文)</div>
                            ${item.original.replace(/\n/g, '<br>')}
                        </div>
                        <div style="background: #e8f5e9; padding: 12px; border-radius: 6px; font-size: 13px; line-height: 1.6; max-height: 200px; overflow-y: auto;">
                            <div style="color: var(--primary-color); font-size: 11px; margin-bottom: 4px;">译文 (中文)</div>
                            ${item.translated.replace(/\n/g, '<br>')}
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    resultDiv.innerHTML = `
        <div style="background: white; border-radius: 12px; width: 90%; max-width: 1000px; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 8px 32px rgba(0,0,0,0.2);">
            <div style="padding: 16px 24px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; color: var(--primary-color); display: flex; align-items: center; gap: 8px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M4.545 6.714 4.11 8H3l1.862-5h1.284L8 8H6.833l-.435-1.286H4.545zm1.634-.736L5.5 3.956h-.049l-.679 2.022H6.18z"/>
                        <path d="M0 2a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v3h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-3H2a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H2z"/>
                    </svg>
                    ${textType === 'claims' ? '权利要求' : '说明书'}对照翻译
                </h3>
                <button onclick="document.getElementById('translate-modal-result').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #999;">&times;</button>
            </div>
            <div style="padding: 16px 24px; overflow-y: auto; flex: 1;">
                ${contentHtml}
            </div>
            <div style="padding: 12px 24px; border-top: 1px solid #e0e0e0; display: flex; justify-content: flex-end; gap: 12px;">
                <button onclick="document.getElementById('translate-modal-result').remove()" style="padding: 8px 20px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer;">关闭</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(resultDiv);
    
    // 点击背景关闭
    resultDiv.onclick = function(e) {
        if (e.target === resultDiv) {
            resultDiv.remove();
        }
    };
}

// 复制专利号
window.copyPatentNumber = function(patentNumber, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    navigator.clipboard.writeText(patentNumber)
        .then(() => {
            const btn = event?.target?.closest('button');
            if (btn) {
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/></svg> 已复制';
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                }, 1500);
            }
        })
        .catch(() => alert('❌ 复制失败'));
};

// 复制同族专利的所有公开号
window.copyFamilyPublicationNumbers = function(patentNumber, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    // 清除页面选中内容，防止智能剪贴板错误捕获
    if (window.getSelection) {
        window.getSelection().removeAllRanges();
    }
    
    // 找到对应的专利结果
    const patentResult = window.patentResults.find(result => result.patent_number === patentNumber);
    if (!patentResult || !patentResult.success) {
        alert('❌ 无法复制：专利数据不存在');
        return;
    }
    
    const data = patentResult.data;
    let contentToCopy = '';
    
    if (data.family_applications && data.family_applications.length > 0) {
        contentToCopy = data.family_applications
            .map(app => app.publication_number || '')
            .filter(num => num !== '' && num !== '-')
            .join('\n');
    }
    
    if (!contentToCopy) {
        alert('❌ 没有可复制的公开号');
        return;
    }
    
    // 复制到剪贴板
    navigator.clipboard.writeText(contentToCopy)
        .then(() => {
            // 同步到智能剪贴板
            if (window.smartClipboard && contentToCopy) {
                window.smartClipboard.export(contentToCopy, '功能六-专利详情', {
                    source: '同族公开号复制按钮',
                    patentNumber: patentNumber,
                    fieldType: 'family_publication_numbers',
                    timestamp: Date.now()
                });
            }
            
            const btn = event?.target?.closest('button');
            if (btn) {
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/></svg> 已复制';
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                }, 1500);
            }
        })
        .catch(() => alert('❌ 复制失败'));
};

// 复制相似文档的所有专利号
window.copySimilarDocumentNumbers = function(patentNumber, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    // 清除页面选中内容，防止智能剪贴板错误捕获
    if (window.getSelection) {
        window.getSelection().removeAllRanges();
    }
    
    // 找到对应的专利结果
    const patentResult = window.patentResults.find(result => result.patent_number === patentNumber);
    if (!patentResult || !patentResult.success) {
        alert('❌ 无法复制：专利数据不存在');
        return;
    }
    
    const data = patentResult.data;
    let contentToCopy = '';
    
    if (data.similar_documents && data.similar_documents.length > 0) {
        contentToCopy = data.similar_documents
            .map(doc => doc.patent_number || '')
            .filter(num => num !== '')
            .join('\n');
    }
    
    if (!contentToCopy) {
        alert('❌ 没有可复制的专利号');
        return;
    }
    
    // 复制到剪贴板
    navigator.clipboard.writeText(contentToCopy)
        .then(() => {
            // 同步到智能剪贴板
            if (window.smartClipboard && contentToCopy) {
                window.smartClipboard.export(contentToCopy, '功能六-专利详情', {
                    source: '相似文档专利号复制按钮',
                    patentNumber: patentNumber,
                    fieldType: 'similar_document_numbers',
                    timestamp: Date.now()
                });
            }
            
            const btn = event?.target?.closest('button');
            if (btn) {
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/></svg> 已复制';
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                }, 1500);
            }
        })
        .catch(() => alert('❌ 复制失败'));
};


