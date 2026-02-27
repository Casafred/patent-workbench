// 功能六：在新标签页打开专利详情 - 绿色主题 + 左侧导航
// 此文件需要在 main.js 之后加载

window.openPatentDetailInNewTab = function(patentNumber) {
    // 找到对应的专利结果
    // 首先尝试从 window.patentResults 中查找
    let patentResult = window.patentResults ? window.patentResults.find(result => result.patent_number === patentNumber) : null;
    
    // 如果没有找到，尝试从标签页管理器中查找
    if (!patentResult && window.patentTabManager) {
        for (const tab of window.patentTabManager.tabs) {
            const result = tab.results.find(r => r.patent_number === patentNumber);
            if (result) {
                patentResult = result;
                break;
            }
        }
    }
    
    if (!patentResult || !patentResult.success) {
        alert('无法打开：专利数据不存在');
        return;
    }
    
    const data = patentResult.data;
    
    // 获取选中的字段
    const selectedFields = window.getSelectedFields ? window.getSelectedFields() : null;
    
    // 查找该专利的解读结果
    let analysisResultHTML = '';
    const analysisResult = window.patentBatchAnalysisResults ? 
        window.patentBatchAnalysisResults.find(item => item.patent_number === patentNumber) : null;
    
    if (analysisResult) {
        let analysisJson = {};
        let displayContent = '';
        try {
            // 尝试清理可能的markdown代码块标记
            let cleanContent = analysisResult.analysis_content.trim();
            if (cleanContent.startsWith('```json')) {
                cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleanContent.startsWith('```')) {
                cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            
            analysisJson = JSON.parse(cleanContent);
            
            // 动态生成表格内容
            let tableRows = '';
            Object.keys(analysisJson).forEach(key => {
                const value = analysisJson[key];
                const displayValue = typeof value === 'string' ? value.replace(/\n/g, '<br>') : value;
                tableRows += `<tr><td style="border: 1px solid #ddd; padding: 12px; font-weight: 500; background-color: #f8f9fa; width: 30%;">${key}</td><td style="border: 1px solid #ddd; padding: 12px;">${displayValue}</td></tr>`;
            });
            
            displayContent = `
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px; background: white;">
                    <thead>
                        <tr style="background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%); color: white;">
                            <th style="border: 1px solid #ddd; padding: 12px; text-align: left; width: 30%;">字段</th>
                            <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">内容</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            `;
        } catch (e) {
            // 如果不是JSON格式，显示原始内容
            displayContent = `
                <div style="padding: 15px; background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; margin-bottom: 15px;">
                    解读结果未能解析为结构化格式，显示原始内容：
                </div>
                <div style="white-space: pre-wrap; font-family: monospace; background-color: #f5f5f5; padding: 15px; border-radius: 4px; border: 1px solid #ddd;">
                    ${analysisResult.analysis_content}
                </div>
            `;
        }
        
        analysisResultHTML = `
            <div class="section" id="analysis-result" data-section-id="analysis-result">
                <h2 class="section-title" onclick="toggleSection('analysis-result')">
                    <div class="section-title-content">
                        <span class="section-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5ZM3 8.5A.5.5 0 0 1 3.5 8h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5ZM2 3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11A.5.5 0 0 1 2 3Z"/></svg></span>
                        AI 解读结果
                    </div>
                </h2>
                <div class="section-content">
                    <div style="padding: 15px; background: linear-gradient(135deg, #e3f2fd 0%, #f5f5f5 100%); border-radius: 8px; border-left: 4px solid #2e7d32;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; padding: 10px; background: white; border-radius: 6px;">
                            <span style="background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%); color: white; padding: 4px 10px; border-radius: 4px; font-size: 0.8em; font-weight: bold;">AI</span>
                            <span style="color: #666; font-size: 0.9em;">以下解读由AI生成，仅供参考</span>
                        </div>
                        ${displayContent}
                    </div>
                </div>
            </div>
        `;
    }
    
    // 字段映射关系
    const FIELD_MAPPING = {
        'abstract': ['abstract'],
        'claims': ['claims'],
        'description': ['description'],
        'classifications': ['classifications'],
        'landscapes': ['landscapes'],
        'family_id': ['family_id'],
        'family_applications': ['family_applications'],
        'country_status': ['country_status'],
        'patent_citations': ['patent_citations'],
        'cited_by': ['cited_by'],
        'events_timeline': ['events_timeline'],
        'legal_events': ['legal_events'],
        'similar_documents': ['similar_documents'],
        'drawings': ['drawings'],
        'pdf_link': ['pdf_link'],
        'external_links': ['external_links']
    };
    
    // 检查是否应该显示某个字段
    function shouldShowField(fieldKey) {
        // 如果没有提供selectedFields，显示所有字段
        if (!selectedFields || selectedFields.length === 0) {
            return true;
        }
        
        // 基础字段始终显示
        const baseFields = ['patent_number', 'title', 'abstract', 'applicant', 'inventor', 'filing_date', 'publication_date', 'priority_date', 'ipc_classification', 'url'];
        if (baseFields.includes(fieldKey)) {
            return true;
        }
        
        // 检查字段是否在选中列表中
        for (const selectedField of selectedFields) {
            const mappedFields = FIELD_MAPPING[selectedField];
            if (mappedFields && mappedFields.includes(fieldKey)) {
                return true;
            }
        }
        
        return false;
    }
    
    // 字段到导航项的映射
    const fieldToNavMap = {
        'classifications': 'classifications',
        'landscapes': 'landscapes',
        'claims': 'claims',
        'events_timeline': 'timeline',
        'legal_events': 'legal-events',
        'family_id': 'family',
        'family_applications': 'family',
        'country_status': 'family',
        'external_links': 'external-links',
        'patent_citations': 'citations',
        'cited_by': 'cited-by',
        'similar_documents': 'similar',
        'description': 'description'
    };
    
    // 检查导航项对应的字段是否被选中
    function isNavFieldSelected(navId) {
        if (!selectedFields || selectedFields.length === 0) {
            return true;
        }
        
        // 基础字段始终可选
        const baseNavIds = ['abstract', 'basic-info'];
        if (baseNavIds.includes(navId)) {
            return true;
        }
        
        // 找到导航ID对应的字段
        for (const [field, nav] of Object.entries(fieldToNavMap)) {
            if (nav === navId) {
                return selectedFields.includes(field);
            }
        }
        
        return true;
    }
    
    // 生成导航项HTML
    function buildNavItem(navId, icon, label) {
        const isSelected = isNavFieldSelected(navId);
        if (isSelected) {
            return `<a href="#${navId}" class="side-nav-item" data-section="${navId}">${icon} ${label}</a>`;
        } else {
            return `<a href="#" class="side-nav-item disabled" data-section="${navId}" onclick="event.preventDefault(); return false;" title="该字段未被爬取" style="color: #ccc; cursor: not-allowed;">${icon} <span style="text-decoration: line-through;">${label}</span></a>`;
        }
    }
    
    // 构建完整的HTML页面 - 绿色主题 + 左侧导航
    const htmlContent = `
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=0.9">
            <title>${data.title || patentNumber} - 专利详情</title>
            <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&display=swap" rel="stylesheet">
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                html {
                    zoom: 0.9;
                }
                
                body {
                    font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                    line-height: 1.7;
                    color: #2c3e50;
                    background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%);
                    min-height: 100vh;
                    padding: 20px;
                    padding-left: 85px;
                }
                
                /* 左侧悬浮导航 */
                .side-nav {
                    position: fixed;
                    left: 5px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                    padding: 15px 10px;
                    z-index: 1000;
                    max-height: 80vh;
                    overflow-y: auto;
                }
                
                .side-nav-item {
                    display: block;
                    padding: 10px 15px;
                    margin: 5px 0;
                    color: #666;
                    text-decoration: none;
                    border-radius: 8px;
                    font-size: 0.85em;
                    transition: all 0.3s;
                    white-space: nowrap;
                }
                
                .side-nav-item:hover {
                    background: #e8f5e9;
                    color: #2e7d32;
                    transform: translateX(5px);
                }
                
                .side-nav-item.active {
                    background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%);
                    color: white;
                    font-weight: 600;
                }
                
                .side-nav-item.disabled {
                    color: #ccc;
                    cursor: not-allowed;
                    opacity: 0.6;
                }
                
                .side-nav-item.disabled:hover {
                    background: transparent;
                    color: #ccc;
                    transform: none;
                }
                
                .side-nav::-webkit-scrollbar {
                    width: 4px;
                }
                
                .side-nav::-webkit-scrollbar-thumb {
                    background: #2e7d32;
                    border-radius: 2px;
                }
                
                /* 复制按钮样式 */
                .copy-section-btn {
                    background: #2e7d32;
                    color: white;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.85em;
                    transition: all 0.3s;
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    margin-left: auto;
                }
                
                .copy-section-btn:hover {
                    background: #1b5e20;
                    transform: translateY(-2px);
                    box-shadow: 0 2px 8px rgba(46, 125, 50, 0.3);
                }
                
                .copy-section-btn svg {
                    width: 14px;
                    height: 14px;
                }

                /* 分析按钮样式 */
                .analyze-btn {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                    margin-right: 8px;
                }

                .analyze-btn:hover {
                    background: linear-gradient(135deg, #764ba2 0%, #667eea 100%) !important;
                    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
                }

                /* 区块操作按钮容器 */
                .section-actions {
                    display: flex;
                    gap: 8px;
                    margin-left: auto;
                }

                .section-title-content {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                /* 折叠/展开功能样式 */
                .collapsible-section {
                    transition: all 0.3s ease;
                }
                
                .collapsible-section.collapsed .section-content {
                    display: none;
                }
                
                .collapsible-section .section-title {
                    cursor: pointer;
                    user-select: none;
                }
                
                .collapsible-section .section-title::after {
                    content: '▼';
                    float: right;
                    margin-left: 10px;
                    transition: transform 0.3s ease;
                    font-size: 0.8em;
                }
                
                .collapsible-section.collapsed .section-title::after {
                    transform: rotate(-90deg);
                }
                
                .section-content {
                    transition: all 0.3s ease;
                }
                
                .section-title {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                
                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    overflow: hidden;
                }
                
                .header {
                    background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%);
                    color: white;
                    padding: 30px 40px;
                    position: relative;
                    overflow: visible;
                }
                
                .header-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }
                
                .patent-number {
                    font-size: 1.2em;
                    font-weight: 300;
                    opacity: 0.9;
                }
                
                .patent-title {
                    font-size: 1.8em;
                    font-weight: 700;
                    line-height: 1.4;
                    margin-bottom: 15px;
                }
                
                .meta-info {
                    display: flex;
                    gap: 20px;
                    font-size: 0.9em;
                    opacity: 0.9;
                    flex-wrap: wrap;
                }
                
                .content {
                    padding: 40px;
                }
                
                .section {
                    margin-bottom: 40px;
                    animation: fadeIn 0.6s ease-out;
                }
                
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .section-title {
                    font-size: 1.4em;
                    font-weight: 600;
                    color: #2e7d32;
                    margin-bottom: 20px;
                    padding-bottom: 10px;
                    border-bottom: 3px solid #2e7d32;
                }
                
                .section-title-content {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .section-icon {
                    font-size: 1.2em;
                    line-height: 1;
                }
                
                .info-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 20px;
                }
                
                .info-card {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 12px;
                    border-left: 4px solid #2e7d32;
                    transition: all 0.3s;
                }
                
                .info-card:hover {
                    transform: translateX(5px);
                    box-shadow: 0 4px 12px rgba(46, 125, 50, 0.2);
                }
                
                .info-label {
                    font-weight: 600;
                    color: #2e7d32;
                    font-size: 0.9em;
                    margin-bottom: 8px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .info-value {
                    color: #2c3e50;
                    font-size: 1em;
                    line-height: 1.6;
                }
                
                .abstract-box {
                    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                    padding: 25px;
                    border-radius: 12px;
                    line-height: 1.8;
                    font-size: 1.05em;
                    color: #2c3e50;
                }
                
                .claims-list {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }
                
                .claim-item {
                    background: white;
                    padding: 20px;
                    border-radius: 12px;
                    border: 2px solid #e9ecef;
                    transition: all 0.3s;
                }
                
                .claim-item:hover {
                    border-color: #2e7d32;
                    box-shadow: 0 4px 12px rgba(46, 125, 50, 0.1);
                }
                
                /* 独立权利要求样式 - 绿色 */
                .claim-item.claim-independent {
                    border-color: #2e7d32;
                    background: #f1f8f4;
                }
                
                .claim-item.claim-independent:hover {
                    border-color: #1b5e20;
                    box-shadow: 0 4px 12px rgba(46, 125, 50, 0.2);
                }
                
                /* 从属权利要求样式 - 蓝色 + 左侧缩进 */
                .claim-item.claim-dependent {
                    border-color: #1976d2;
                    background: #f5f9fc;
                    margin-left: 20px;
                }
                
                .claim-item.claim-dependent:hover {
                    border-color: #0d47a1;
                    box-shadow: 0 4px 12px rgba(25, 118, 210, 0.2);
                }
                
                .claim-number {
                    font-weight: 700;
                    color: #2e7d32;
                    font-size: 1.1em;
                    margin-bottom: 10px;
                }
                
                .claim-text {
                    color: #495057;
                    line-height: 1.7;
                }
                
                .data-table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                    background: white;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                }
                
                .data-table thead {
                    background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%);
                    color: white;
                }
                
                .data-table th {
                    padding: 15px;
                    text-align: left;
                    font-weight: 600;
                    font-size: 0.95em;
                }
                
                .data-table td {
                    padding: 15px;
                    border-bottom: 1px solid #e9ecef;
                }
                
                .data-table tbody tr:hover {
                    background: #f8f9fa;
                }
                
                .data-table tbody tr:last-child td {
                    border-bottom: none;
                }
                
                .timeline {
                    position: relative;
                    padding-left: 40px;
                }
                
                .timeline::before {
                    content: '';
                    position: absolute;
                    left: 15px;
                    top: 0;
                    bottom: 0;
                    width: 3px;
                    background: linear-gradient(180deg, #2e7d32 0%, #43a047 100%);
                }
                
                .timeline-item {
                    position: relative;
                    margin-bottom: 25px;
                    padding: 20px;
                    background: white;
                    border-radius: 12px;
                    border: 2px solid #e9ecef;
                }
                
                .timeline-item::before {
                    content: '';
                    position: absolute;
                    left: -33px;
                    top: 25px;
                    width: 13px;
                    height: 13px;
                    background: #2e7d32;
                    border: 3px solid white;
                    border-radius: 50%;
                    box-shadow: 0 0 0 3px #2e7d32;
                }
                
                .timeline-date {
                    font-weight: 600;
                    color: #2e7d32;
                    margin-bottom: 8px;
                }
                
                .timeline-title {
                    font-weight: 500;
                    color: #2c3e50;
                    margin-bottom: 5px;
                }
                
                .timeline-type {
                    font-size: 0.85em;
                    color: #6c757d;
                }
                
                .cpc-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 15px;
                }
                
                .cpc-card {
                    background: white;
                    padding: 15px;
                    border-radius: 10px;
                    border: 2px solid #e9ecef;
                    transition: all 0.3s;
                }
                
                .cpc-card:hover {
                    border-color: #2e7d32;
                    transform: translateY(-3px);
                    box-shadow: 0 4px 12px rgba(46, 125, 50, 0.15);
                }
                
                .cpc-code {
                    font-weight: 700;
                    color: #2e7d32;
                    font-size: 1.1em;
                    margin-bottom: 8px;
                }
                
                .cpc-desc {
                    font-size: 0.9em;
                    color: #6c757d;
                    line-height: 1.5;
                }
                
                .tag-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                }
                
                .tag {
                    padding: 8px 16px;
                    background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%);
                    color: white;
                    border-radius: 20px;
                    font-size: 0.9em;
                    font-weight: 500;
                }
                
                .link-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 15px;
                }
                
                .link-card {
                    padding: 15px 20px;
                    background: white;
                    border: 2px solid #e9ecef;
                    border-radius: 10px;
                    text-decoration: none;
                    color: #2e7d32;
                    font-weight: 500;
                    transition: all 0.3s;
                    text-align: center;
                    display: block;
                }
                
                .link-card:hover {
                    background: #2e7d32;
                    color: white;
                    transform: translateY(-3px);
                    box-shadow: 0 4px 12px rgba(46, 125, 50, 0.3);
                }
                
                @media (max-width: 768px) {
                    body {
                        padding: 10px;
                    }
                    .content {
                        padding: 20px;
                    }
                    .header {
                        padding: 20px;
                    }
                    .info-grid {
                        grid-template-columns: 1fr;
                    }
                }
                
                @media print {
                    body {
                        background: white;
                        padding: 0;
                    }
                    .close-btn {
                        display: none;
                    }
                }
            </style>
        </head>
        <body>
            <!-- 左侧悬浮导航 -->
            <nav class="side-nav" id="sideNav">
                <a href="#" class="side-nav-item scroll-to-top" onclick="scrollToTop(event)" title="回到顶部" style="background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%); color: white; font-weight: 600; margin-bottom: 15px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right: 5px;">
                        <path fill-rule="evenodd" d="M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 1 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5z"/>
                    </svg>
                    顶部
                </a>
                ${analysisResult ? '<a href="#analysis-result" class="side-nav-item" data-section="analysis-result"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right:5px;vertical-align:middle"><path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5ZM3 8.5A.5.5 0 0 1 3.5 8h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5ZM2 3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11A.5.5 0 0 1 2 3Z"/></svg>AI解读</a>' : ''}
                ${buildNavItem('abstract', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right:5px;vertical-align:middle"><path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/></svg>', '摘要')}
                ${buildNavItem('basic-info', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right:5px;vertical-align:middle"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/></svg>', '基本信息')}
                ${buildNavItem('classifications', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right:5px;vertical-align:middle"><path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/></svg>', 'CPC分类')}
                ${buildNavItem('landscapes', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right:5px;vertical-align:middle"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4a9.267 9.267 0 0 1 .64-1.539 6.7 6.7 0 0 1 .597-.933A7.025 7.025 0 0 0 2.255 4H4.09zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.958 6.958 0 0 0-.656 2.5h2.49zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5H4.847zM8.5 5v2.5h2.99a12.495 12.495 0 0 0-.337-2.5H8.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5H4.51zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5H8.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12H5.145zm.182 2.472a6.696 6.696 0 0 1-.597-.933A9.268 9.268 0 0 1 4.09 12H2.255a7.024 7.024 0 0 0 3.072 2.472zM3.82 11a13.652 13.652 0 0 1-.312-2.5h-2.49A6.95 6.95 0 0 0 1.674 11H3.82zm10.026-2.5a13.65 13.65 0 0 1-.312 2.5h2.146c.22-.765.368-1.608.426-2.5h-2.26zm-1.068 2.5c-.138.386-.295.744-.468 1.068-.552 1.035-1.218 1.65-1.887 1.855V12h2.355zm.182 2.472A6.696 6.696 0 0 0 13.91 12h1.835a7.024 7.024 0 0 1-3.072 2.472zM14.326 11a6.95 6.95 0 0 0 .656-2.5h-2.49c-.03.877-.138 1.718-.312 2.5h2.146z"/></svg>', '技术领域')}
                ${buildNavItem('claims', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right:5px;vertical-align:middle"><path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z"/><path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/></svg>', '权利要求')}
                ${buildNavItem('timeline', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right:5px;vertical-align:middle"><path d="M11 6.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm-3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm-5 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z"/><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/></svg>', '事件时间轴')}
                ${buildNavItem('legal-events', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right:5px;vertical-align:middle"><path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/></svg>', '法律事件')}
                ${buildNavItem('family', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right:5px;vertical-align:middle"><path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7Zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5.784 6A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216ZM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/></svg>', '同族信息')}
                ${buildNavItem('external-links', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right:5px;vertical-align:middle"><path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.315-1.315a.5.5 0 0 1 .707 0l.025.025a.5.5 0 0 1 0 .707l-1.315 1.315a4 4 0 0 1-5.656-5.656l1.372-1.372a.5.5 0 0 1 .707 0l.025.025a.5.5 0 0 1 0 .707l-.975.975A2.5 2.5 0 0 0 5.5 11a2.5 2.5 0 0 0 2.5-2.5V8a.5.5 0 0 1 1 0v.5a3.5 3.5 0 0 1-3.5 3.5A3.5 3.5 0 0 1 2 8.5a3.5 3.5 0 0 1 1.025-2.473l.975-.975a.5.5 0 0 1 .707 0l.025.025a.5.5 0 0 1 0 .707l-.025.025-.975.975a2.5 2.5 0 0 0-.515.558z"/><path d="M6.25 3.544l.975-.975a.5.5 0 0 1 .707 0l.025.025a.5.5 0 0 1 0 .707l-.975.975a2.5 2.5 0 0 0-.515.558 2.5 2.5 0 0 0 .515 3.042l.975.975a.5.5 0 0 1 0 .707l-.025.025a.5.5 0 0 1-.707 0l-.975-.975a3.5 3.5 0 0 1 0-4.95l.975-.975a.5.5 0 0 1 .025-.025z"/><path d="M9.878.392a.5.5 0 0 1 .707 0l4.243 4.243a.5.5 0 0 1 0 .707l-4.243 4.243a.5.5 0 0 1-.707 0l-4.243-4.243a.5.5 0 0 1 0-.707L9.878.392zM10.232 1 6 5.232l3.768 3.768L14 5.232 10.232 1z"/></svg>', '外部链接')}
                ${buildNavItem('citations', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right:5px;vertical-align:middle"><path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z"/></svg>', '引用专利')}
                ${buildNavItem('cited-by', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right:5px;vertical-align:middle"><path d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/><path d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/></svg>', '被引用')}
                ${buildNavItem('similar', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right:5px;vertical-align:middle"><path d="M14 2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h12zM2 3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H2z"/><path d="M3 5.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zM3 8a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 8zm0 2.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5z"/></svg>', '相似文档')}
                ${buildNavItem('description', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right:5px;vertical-align:middle"><path d="M3 2.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-11zm1 1v9h8v-9h-8z"/><path d="M5 5.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zM5 8a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5A.5.5 0 0 1 5 8zm0 2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5z"/></svg>', '说明书')}
            </nav>
            
            <div class="container">
                <div class="header">
                    <div class="header-top">
                        <div class="patent-number">专利号: ${patentNumber}</div>
                        <div style="display: flex; gap: 15px; align-items: center;">
                            ${data.pdf_link ? `
                            <a href="${data.pdf_link}" target="_blank" style="color: white; text-decoration: none; font-size: 0.9em; opacity: 0.9; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 4px; display: inline-flex; align-items: center; gap: 5px;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/></svg>
                                下载PDF原文
                            </a>
                            ` : ''}
                            ${patentResult.url ? `
                            <a href="${patentResult.url}" target="_blank" style="color: white; text-decoration: underline; font-size: 0.9em; opacity: 0.9; display: inline-flex; align-items: center; gap: 5px;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/><path d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/></svg>
                                Google Patents
                            </a>
                            ` : ''}
                        </div>
                    </div>
                    <h1 class="patent-title">${data.title || '专利详情'}</h1>
                    <div class="meta-info">
                        ${data.application_date ? `<span style="display: inline-flex; align-items: center; gap: 5px;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M11 6.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm-3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm-5 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z"/><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/></svg> 申请日期: ${data.application_date}</span>` : ''}
                        ${data.publication_date ? `<span style="display: inline-flex; align-items: center; gap: 5px;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M11 6.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm-3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm-5 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z"/><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/></svg> 公开日期: ${data.publication_date}</span>` : ''}
                    </div>
                </div>
                
                <div class="content">
                    <!-- 已完成的解读结果 -->
                    ${analysisResultHTML}

                    <!-- 批量解读结果区域（用于实时更新） -->
                    <div class="section collapsible-section" id="batch-analysis-${patentNumber}" data-section-id="batch-analysis" style="display: none;">
                        <h2 class="section-title" onclick="toggleSection('batch-analysis-${patentNumber}')">
                            <div class="section-title-content">
                                <span class="section-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5ZM3 8.5A.5.5 0 0 1 3.5 8h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5ZM2 3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11A.5.5 0 0 1 2 3Z"/></svg></span>
                                批量解读结果
                                <span id="tab-analysis-status-${patentNumber}" style="margin-left: 10px; font-size: 12px; color: #666;">等待解读...</span>
                            </div>
                        </h2>
                        <div class="section-content">
                            <div id="tab-analysis-result-${patentNumber}" style="padding: 15px; background-color: #f8f9fa; border-radius: 8px;">
                                <div style="text-align: center; color: #666; padding: 20px;">
                                    等待批量解读完成...
                                </div>
                            </div>
                        </div>
                    </div>

                    ${data.abstract && shouldShowField('abstract') ? `
                    <div class="section collapsible-section" id="abstract" data-section-id="abstract">
                        <h2 class="section-title" onclick="toggleSection('abstract')">
                            <div class="section-title-content">
                                <span class="section-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/></svg></span>
                                摘要
                            </div>
                            <button class="copy-section-btn" onclick="copySectionContent(event, 'abstract', '摘要')">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                                    <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                                </svg>
                                复制
                            </button>
                        </h2>
                        <div class="section-content">
                            <div class="abstract-box" data-section-content="abstract">${data.abstract}</div>
                        </div>
                    </div>
                    ` : ''}
                    
                    <div class="section" id="basic-info">
                        <h2 class="section-title">
                            <span class="section-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/></svg></span>
                            基本信息
                        </h2>
                        <div class="info-grid">
                            ${data.inventors && data.inventors.length > 0 ? `
                            <div class="info-card">
                                <div class="info-label">发明人</div>
                                <div class="info-value">${data.inventors.join(', ')}</div>
                            </div>
                            ` : ''}
                            ${data.assignees && data.assignees.length > 0 ? `
                            <div class="info-card">
                                <div class="info-label">申请人</div>
                                <div class="info-value">${data.assignees.join(', ')}</div>
                            </div>
                            ` : ''}
                            ${data.priority_date ? `
                            <div class="info-card">
                                <div class="info-label">优先权日期</div>
                                <div class="info-value">${data.priority_date}</div>
                            </div>
                            ` : ''}
                            ${data.pdf_link ? `
                            <div class="info-card">
                                <div class="info-label">PDF原文</div>
                                <div class="info-value"><a href="${data.pdf_link}" target="_blank" style="color: #2e7d32; font-weight: 500; display: inline-flex; align-items: center; gap: 5px;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg> 下载PDF</a></div>
                            </div>
                            ` : ''}
                            ${patentResult.url ? `
                            <div class="info-card">
                                <div class="info-label">原始链接</div>
                                <div class="info-value"><a href="${patentResult.url}" target="_blank" style="color: #2e7d32;">Google Patents</a></div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    ${data.classifications && data.classifications.length > 0 && shouldShowField('classifications') ? `
                    <div class="section" id="classifications">
                        <h2 class="section-title">
                            <span class="section-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/></svg></span>
                            CPC分类 (${data.classifications.length})
                        </h2>
                        <div class="cpc-grid">
                            ${data.classifications.map(cls => `
                            <div class="cpc-card">
                                <div class="cpc-code">${cls.leaf_code || cls.code}</div>
                                <div class="cpc-desc">${cls.leaf_description || cls.description}</div>
                            </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                    
                    ${data.landscapes && data.landscapes.length > 0 && shouldShowField('landscapes') ? `
                    <div class="section" id="landscapes">
                        <h2 class="section-title">
                            <span class="section-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4a9.267 9.267 0 0 1 .64-1.539 6.7 6.7 0 0 1 .597-.933A7.025 7.025 0 0 0 2.255 4H4.09zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.958 6.958 0 0 0-.656 2.5h2.49zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5H4.847zM8.5 5v2.5h2.99a12.495 12.495 0 0 0-.337-2.5H8.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5H4.51zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5H8.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12H5.145zm.182 2.472a6.696 6.696 0 0 1-.597-.933A9.268 9.268 0 0 1 4.09 12H2.255a7.024 7.024 0 0 0 3.072 2.472zM3.82 11a13.652 13.652 0 0 1-.312-2.5h-2.49A6.95 6.95 0 0 0 1.674 11H3.82zm10.026-2.5a13.65 13.65 0 0 1-.312 2.5h2.146c.22-.765.368-1.608.426-2.5h-2.26zm-1.068 2.5c-.138.386-.295.744-.468 1.068-.552 1.035-1.218 1.65-1.887 1.855V12h2.355zm.182 2.472A6.696 6.696 0 0 0 13.91 12h1.835a7.024 7.024 0 0 1-3.072 2.472zM14.326 11a6.95 6.95 0 0 0 .656-2.5h-2.49c-.03.877-.138 1.718-.312 2.5h2.146z"/></svg></span>
                            技术领域
                        </h2>
                        <div class="tag-list">
                            ${data.landscapes.map(landscape => `
                            <span class="tag">${landscape.name}</span>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                    
                    ${data.claims && data.claims.length > 0 && shouldShowField('claims') ? `
                    <div class="section collapsible-section collapsed" id="claims" data-section-id="claims">
                        <h2 class="section-title" onclick="toggleSection('claims')">
                            <div class="section-title-content">
                                <span class="section-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z"/><path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/></svg></span>
                                权利要求 (${data.claims.length})
                            </div>
                            <button class="copy-section-btn translate-btn" onclick="showTranslateDialogNewTab(event, 'claims')" title="快捷翻译" style="background: linear-gradient(135deg, #00bcd4 0%, #009688 100%) !important;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4a9.267 9.267 0 0 1 .64-1.539 6.7 6.7 0 0 1 .597-.933A7.025 7.025 0 0 0 2.255 4H4.09zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.958 6.958 0 0 0-.656 2.5h2.49zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5H4.847zM8.5 5v2.5h2.99a12.495 12.495 0 0 0-.337-2.5H8.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5H4.51zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5H8.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12H5.145zm.182 2.472a6.696 6.696 0 0 1-.597-.933A9.268 9.268 0 0 1 4.09 12H2.255a7.024 7.024 0 0 0 3.072 2.472zM3.82 11a13.652 13.652 0 0 1-.312-2.5h-2.49A6.95 6.95 0 0 0 1.674 11H3.82zm10.026-2.5a13.65 13.65 0 0 1-.312 2.5h2.146c.22-.765.368-1.608.426-2.5h-2.26zm-1.068 2.5c-.138.386-.295.744-.468 1.068-.552 1.035-1.218 1.65-1.887 1.855V12h2.355zm.182 2.472A6.696 6.696 0 0 0 13.91 12h1.835a7.024 7.024 0 0 1-3.072 2.472zM14.326 11a6.95 6.95 0 0 0 .656-2.5h-2.49c-.03.877-.138 1.718-.312 2.5h2.146z"/></svg>
                                翻译
                            </button>
                            <button class="copy-section-btn" onclick="copyClaimsWithNumbers(event)">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                                    <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                                </svg>
                                复制
                            </button>
                        </h2>
                        <div class="section-content">
                            <div class="claims-list" data-section-content="claims">
                                ${data.claims.map((claim, index) => {
                                    // Support both string format (old) and object format (new with type)
                                    let claimText, claimType;
                                    if (typeof claim === 'string') {
                                        claimText = claim;
                                        // 检测权利要求类型：
                                        // 1. 优先检查后端添加的 [从属] 标记（最可靠）
                                        // 2. 检查 claim-ref 引用标记（英文专利）
                                        // 3. 检查中文关键词（中文专利备用）
                                        if (claimText.includes('[从属]') || 
                                            claimText.includes('<claim-ref') ||
                                            claimText.match(/claim\s*\d+/i)) {
                                            claimType = 'dependent';
                                        } else {
                                            claimType = 'independent';
                                        }
                                        // 移除后端添加的类型标记，保持显示整洁
                                        claimText = claimText.replace(/\[\d+\]\[从属\]\s*/g, '').replace(/\[\d+\]\s*/g, '');
                                    } else {
                                        claimText = claim.text;
                                        claimType = claim.type || 'unknown';
                                    }
                                    
                                    // Add CSS class based on claim type
                                    let claimClass = 'claim-item';
                                    if (claimType === 'independent') {
                                        claimClass += ' claim-independent';
                                    } else if (claimType === 'dependent') {
                                        claimClass += ' claim-dependent';
                                    }
                                    
                                    return `
                                    <div class="${claimClass}" data-claim-number="${index + 1}" data-claim-text="${claimText.replace(/"/g, '&quot;')}">
                                        <div class="claim-number">权利要求 ${index + 1}${claimType === 'independent' ? ' <span style="color: #2e7d32; font-size: 0.85em;">(独立权利要求)</span>' : claimType === 'dependent' ? ' <span style="color: #1976d2; font-size: 0.85em;">(从属权利要求)</span>' : ''}</div>
                                        <div class="claim-text">${claimText}</div>
                                    </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${data.events_timeline && data.events_timeline.length > 0 && shouldShowField('events_timeline') ? `
                    <div class="section" id="timeline">
                        <h2 class="section-title">
                            <span class="section-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M11 6.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm-3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm-5 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z"/><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/></svg></span>
                            事件时间轴 (${data.events_timeline.length})
                        </h2>
                        <div class="timeline">
                            ${[...data.events_timeline].reverse().map(event => `
                            <div class="timeline-item">
                                <div class="timeline-date">${event.date}</div>
                                <div class="timeline-title">${event.title || event.description}</div>
                                ${event.type ? `<div class="timeline-type">${event.type}</div>` : ''}
                            </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                    
                    ${data.legal_events && data.legal_events.length > 0 && shouldShowField('legal_events') ? `
                    <div class="section" id="legal-events">
                        <h2 class="section-title">
                            <span class="section-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/></svg></span>
                            法律事件 (${data.legal_events.length})
                        </h2>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>日期</th>
                                    <th>代码</th>
                                    <th>描述</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${[...data.legal_events].reverse().map(event => `
                                <tr>
                                    <td>${event.date}</td>
                                    <td>${event.code || '-'}</td>
                                    <td>${event.description || event.title || '-'}</td>
                                </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    ` : ''}
                    
                    ${(data.family_id || (data.family_applications && data.family_applications.length > 0)) && (shouldShowField('family_id') || shouldShowField('family_applications')) ? `
                    <div class="section" id="family">
                        <h2 class="section-title">
                            <div class="section-title-content">
                                <span class="section-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7Zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5.784 6A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216ZM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/></svg></span>
                                同族信息 ${data.family_applications ? '(' + data.family_applications.length + ')' : ''}
                            </div>
                            ${data.family_applications && data.family_applications.length > 1 ? `
                            <button class="copy-section-btn" onclick="jumpToFamilyComparisonFromNewTab(event, '${patentNumber}')" title="跳转到功能四进行同族权利要求对比分析" style="background: linear-gradient(135deg, #9c27b0 0%, #673ab7 100%) !important;">
                                同族对比
                            </button>
                            ` : ''}
                            ${data.family_applications && data.family_applications.length > 0 ? `
                            <button class="copy-section-btn analyze-btn" onclick="analyzeRelationPatents(event, '${patentNumber}', 'family')">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                                </svg>
                                分析同族专利
                            </button>
                            ` : ''}
                        </h2>
                        ${data.family_id && shouldShowField('family_id') ? `<div class="info-card" style="margin-bottom: 20px;"><div class="info-label">同族ID</div><div class="info-value">${data.family_id}</div></div>` : ''}
                        ${data.family_applications && data.family_applications.length > 0 && shouldShowField('family_applications') ? `
                        <table class="data-table" id="family-table" data-patent-number="${patentNumber}">
                            <thead>
                                <tr>
                                    <th>申请号</th>
                                    <th>状态</th>
                                    <th>公开号</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.family_applications.map(app => `
                                <tr>
                                    <td>${app.application_number}</td>
                                    <td>${app.status || '-'}</td>
                                    <td>${app.publication_number || '-'}</td>
                                </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        ` : ''}
                    </div>
                    ` : ''}
                    
                    ${data.external_links && Object.keys(data.external_links).length > 0 && shouldShowField('external_links') ? `
                    <div class="section" id="external-links">
                        <h2 class="section-title">
                            <span class="section-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.315-1.315a.5.5 0 0 1 .707 0l.025.025a.5.5 0 0 1 0 .707l-1.315 1.315a4 4 0 0 1-5.656-5.656l1.372-1.372a.5.5 0 0 1 .707 0l.025.025a.5.5 0 0 1 0 .707l-.975.975A2.5 2.5 0 0 0 5.5 11a2.5 2.5 0 0 0 2.5-2.5V8a.5.5 0 0 1 1 0v.5a3.5 3.5 0 0 1-3.5 3.5A3.5 3.5 0 0 1 2 8.5a3.5 3.5 0 0 1 1.025-2.473l.975-.975a.5.5 0 0 1 .707 0l.025.025a.5.5 0 0 1 0 .707l-.025.025-.975.975a2.5 2.5 0 0 0-.515.558z"/><path d="M6.25 3.544l.975-.975a.5.5 0 0 1 .707 0l.025.025a.5.5 0 0 1 0 .707l-.975.975a2.5 2.5 0 0 0-.515.558 2.5 2.5 0 0 0 .515 3.042l.975.975a.5.5 0 0 1 0 .707l-.025.025a.5.5 0 0 1-.707 0l-.975-.975a3.5 3.5 0 0 1 0-4.95l.975-.975a.5.5 0 0 1 .025-.025z"/><path d="M9.878.392a.5.5 0 0 1 .707 0l4.243 4.243a.5.5 0 0 1 0 .707l-4.243 4.243a.5.5 0 0 1-.707 0l-4.243-4.243a.5.5 0 0 1 0-.707L9.878.392zM10.232 1 6 5.232l3.768 3.768L14 5.232 10.232 1z"/></svg></span>
                            外部链接
                        </h2>
                        <div class="link-grid">
                            ${Object.entries(data.external_links).map(([id, link]) => `
                            <a href="${link.url}" target="_blank" class="link-card">${link.text}</a>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                    
                    ${data.patent_citations && data.patent_citations.length > 0 && shouldShowField('patent_citations') ? `
                    <div class="section collapsible-section collapsed" id="citations" data-section-id="citations">
                        <h2 class="section-title" onclick="toggleSection('citations')">
                            <div class="section-title-content">
                                <span class="section-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z"/></svg></span>
                                引用专利 (${data.patent_citations.length})
                            </div>
                            <div class="section-actions">
                                <button class="copy-section-btn analyze-btn" onclick="analyzeRelationPatents(event, '${patentNumber}', 'citations')">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                                    </svg>
                                    分析引用专利
                                </button>
                                <button class="copy-section-btn" onclick="copyPatentNumbersList(event, 'citations')">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                                        <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                                    </svg>
                                    复制专利号
                                </button>
                            </div>
                        </h2>
                        <div class="section-content">
                            <table class="data-table" id="citations-table" data-patent-number="${patentNumber}">
                                <thead>
                                    <tr>
                                        <th>专利号</th>
                                        <th>标题</th>
                                        <th>审查员引用</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${data.patent_citations.map(citation => `
                                    <tr data-patent-number="${citation.patent_number}">
                                        <td>${citation.patent_number}${citation.examiner_cited ? ' <span style="color: #d32f2f; font-weight: bold;">*</span>' : ''}</td>
                                        <td>${citation.title || '-'}</td>
                                        <td>${citation.examiner_cited ? '<span style="color: #d32f2f; font-weight: bold;"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: middle;"><path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/></svg> 审查员引用</span>' : '-'}</td>
                                    </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${data.cited_by && data.cited_by.length > 0 && shouldShowField('cited_by') ? `
                    <div class="section collapsible-section collapsed" id="cited-by" data-section-id="cited-by">
                        <h2 class="section-title" onclick="toggleSection('cited-by')">
                            <div class="section-title-content">
                                <span class="section-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/><path d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/></svg></span>
                                被引用专利 (${data.cited_by.length})
                            </div>
                            <div class="section-actions">
                                <button class="copy-section-btn analyze-btn" onclick="analyzeRelationPatents(event, '${patentNumber}', 'cited_by')">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                                    </svg>
                                    分析被引用专利
                                </button>
                                <button class="copy-section-btn" onclick="copyPatentNumbersList(event, 'cited-by')">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                                        <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                                    </svg>
                                    复制专利号
                                </button>
                            </div>
                        </h2>
                        <div class="section-content">
                            <table class="data-table" id="cited-by-table" data-patent-number="${patentNumber}">
                                <thead>
                                    <tr>
                                        <th>专利号</th>
                                        <th>标题</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${data.cited_by.map(citation => `
                                    <tr data-patent-number="${citation.patent_number}">
                                        <td>${citation.patent_number}</td>
                                        <td>${citation.title || '-'}</td>
                                    </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${data.similar_documents && data.similar_documents.length > 0 && shouldShowField('similar_documents') ? `
                    <div class="section collapsible-section collapsed" id="similar" data-section-id="similar">
                        <h2 class="section-title" onclick="toggleSection('similar')">
                            <div class="section-title-content">
                                <span class="section-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M14 2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h12zM2 3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H2z"/><path d="M3 5.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zM3 8a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 8zm0 2.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5z"/></svg></span>
                                相似文档 (${data.similar_documents.length})
                            </div>
                            <div class="section-actions">
                                <button class="copy-section-btn analyze-btn" onclick="analyzeRelationPatents(event, '${patentNumber}', 'similar')">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                                    </svg>
                                    分析相似专利
                                </button>
                                <button class="copy-section-btn" onclick="copyPatentNumbersList(event, 'similar')">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                                        <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                                    </svg>
                                    复制专利号
                                </button>
                            </div>
                        </h2>
                        <div class="section-content">
                            <table class="data-table" id="similar-table" data-patent-number="${patentNumber}">
                                <thead>
                                    <tr>
                                        <th>专利号</th>
                                        <th>语言</th>
                                        <th>操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${data.similar_documents.map(doc => `
                                    <tr data-patent-number="${doc.patent_number}">
                                        <td>${doc.patent_number}</td>
                                        <td>${doc.language || '-'}</td>
                                        <td><a href="${doc.link}" target="_blank" style="color: #2e7d32;">查看</a></td>
                                    </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${data.drawings && data.drawings.length > 0 && shouldShowField('drawings') ? `
                    <div class="section collapsible-section collapsed" id="drawings" data-section-id="drawings">
                        <h2 class="section-title" onclick="toggleSection('drawings')">
                            <div class="section-title-content">
                                <span class="section-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M.002 3a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-12a2 2 0 0 1-2-2V3zm1 9v1a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12zm5-6.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0z"/></svg></span>
                                附图 (共${data.drawings.length}张)
                            </div>
                            <button class="copy-section-btn" onclick="copySectionContent(event, 'drawings', '附图链接')">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                                    <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                                </svg>
                                复制
                            </button>
                        </h2>
                        <div class="section-content">
                            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;" data-section-content="drawings">
                                ${data.drawings.map((drawing, index) => `
                                <div style="position: relative; background: white; border-radius: 8px; padding: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                    <img src="${drawing}" alt="附图 ${index + 1}" style="width: 100%; height: 180px; object-fit: contain; border: 1px solid #e0e0e0; border-radius: 4px; cursor: pointer;" onclick="window.open('${drawing}', '_blank')" onerror="this.parentElement.style.display='none'">
                                    <div style="text-align: center; font-size: 0.9em; color: #666; margin-top: 6px;">图 ${index + 1}</div>
                                </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${data.description && shouldShowField('description') ? `
                    <div class="section collapsible-section collapsed" id="description" data-section-id="description">
                        <h2 class="section-title" onclick="toggleSection('description')">
                            <div class="section-title-content">
                                <span class="section-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M3 2.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-11zm1 1v9h8v-9h-8z"/><path d="M5 5.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zM5 8a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5A.5.5 0 0 1 5 8zm0 2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5z"/></svg></span>
                                说明书
                            </div>
                            <button class="copy-section-btn translate-btn" onclick="showTranslateDialogNewTab(event, 'description')" title="快捷翻译" style="background: linear-gradient(135deg, #00bcd4 0%, #009688 100%) !important;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4a9.267 9.267 0 0 1 .64-1.539 6.7 6.7 0 0 1 .597-.933A7.025 7.025 0 0 0 2.255 4H4.09zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.958 6.958 0 0 0-.656 2.5h2.49zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5H4.847zM8.5 5v2.5h2.99a12.495 12.495 0 0 0-.337-2.5H8.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5H4.51zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5H8.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12H5.145zm.182 2.472a6.696 6.696 0 0 1-.597-.933A9.268 9.268 0 0 1 4.09 12H2.255a7.024 7.024 0 0 0 3.072 2.472zM3.82 11a13.652 13.652 0 0 1-.312-2.5h-2.49A6.95 6.95 0 0 0 1.674 11H3.82zm10.026-2.5a13.65 13.65 0 0 1-.312 2.5h2.146c.22-.765.368-1.608.426-2.5h-2.26zm-1.068 2.5c-.138.386-.295.744-.468 1.068-.552 1.035-1.218 1.65-1.887 1.855V12h2.355zm.182 2.472A6.696 6.696 0 0 0 13.91 12h1.835a7.024 7.024 0 0 1-3.072 2.472zM14.326 11a6.95 6.95 0 0 0 .656-2.5h-2.49c-.03.877-.138 1.718-.312 2.5h2.146z"/></svg>
                                翻译
                            </button>
                            <button class="copy-section-btn" onclick="copySectionContent(event, 'description', '说明书')">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                                    <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                                </svg>
                                复制
                            </button>
                        </h2>
                        <div class="section-content">
                            <div class="abstract-box" style="white-space: pre-wrap; line-height: 1.8;" data-section-content="description">
                                ${data.description.replace(/(\[[A-Z\s]+\])/g, '<br/><br/><strong style="font-size: 1.1em; color: #2e7d32;">$1</strong><br/><br/>').replace(/\n/g, '<br/>')}
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            <script>
                // 全局数据变量 - 供所有函数使用
                const pageData = ${JSON.stringify(data)};
                const currentPatentNumber = '${patentNumber}';
                
                // 回到顶部
                function scrollToTop(event) {
                    event.preventDefault();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
                
                // 折叠/展开section
                function toggleSection(sectionId) {
                    const section = document.querySelector('[data-section-id="' + sectionId + '"]');
                    if (section) {
                        section.classList.toggle('collapsed');
                    }
                }
                
                // 复制专利号列表
                function copyPatentNumbersList(event, sectionId) {
                    event.stopPropagation(); // 阻止触发折叠/展开
                    
                    const section = document.querySelector('[data-section-id="' + sectionId + '"]');
                    if (!section) return;
                    
                    // 从表格中提取所有专利号
                    const rows = section.querySelectorAll('tbody tr[data-patent-number]');
                    const patentNumbers = Array.from(rows).map(row => row.getAttribute('data-patent-number'));
                    
                    if (patentNumbers.length === 0) {
                        alert('没有可复制的专利号');
                        return;
                    }
                    
                    const textToCopy = patentNumbers.join('\\n');
                    
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        const btn = event.target.closest('.copy-section-btn');
                        if (btn) {
                            const originalHTML = btn.innerHTML;
                            btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" style="width:14px;height:14px"><path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/></svg> 已复制 ' + patentNumbers.length + ' 个';
                            setTimeout(() => {
                                btn.innerHTML = originalHTML;
                            }, 2000);
                        }
                    }).catch(err => {
                        console.error('复制失败:', err);
                        alert('复制失败，请手动复制');
                    });
                }
                
                // 复制section内容的通用函数
                function copySectionContent(event, sectionId, sectionName) {
                    event.stopPropagation(); // 阻止触发折叠/展开
                    
                    const section = document.querySelector('[data-section-content="' + sectionId + '"]');
                    if (!section) return;
                    
                    let textToCopy = section.textContent.trim();
                    
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        // 找到对应的复制按钮并显示成功提示
                        const btn = event.target.closest('.copy-section-btn');
                        if (btn) {
                            const originalHTML = btn.innerHTML;
                            btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" style="width:14px;height:14px"><path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/></svg> 已复制';
                            setTimeout(() => {
                                btn.innerHTML = originalHTML;
                            }, 2000);
                        }
                    }).catch(err => {
                        console.error('复制失败:', err);
                        alert('复制失败，请手动复制');
                    });
                }
                
                // 复制权利要求（带序号）
                function copyClaimsWithNumbers(event) {
                    event.stopPropagation(); // 阻止触发折叠/展开
                    
                    const claimItems = document.querySelectorAll('.claim-item');
                    if (!claimItems || claimItems.length === 0) return;
                    
                    let textToCopy = '';
                    claimItems.forEach((item) => {
                        const claimNumber = item.getAttribute('data-claim-number');
                        const claimText = item.getAttribute('data-claim-text');
                        textToCopy += claimNumber + '. ' + claimText + '\\n\\n';
                    });
                    
                    navigator.clipboard.writeText(textToCopy.trim()).then(() => {
                        const btn = event.target.closest('.copy-section-btn');
                        if (btn) {
                            const originalHTML = btn.innerHTML;
                            btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" style="width:14px;height:14px"><path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/></svg> 已复制';
                            setTimeout(() => {
                                btn.innerHTML = originalHTML;
                            }, 2000);
                        }
                    }).catch(err => {
                        console.error('复制失败:', err);
                        alert('复制失败，请手动复制');
                    });
                }

                // 分析关系专利 - 在新标签页中打开
                function analyzeRelationPatents(event, patentNumber, relationType) {
                    event.stopPropagation(); // 阻止触发折叠/展开
                    
                    // 获取关系数据
                    let relationData = [];
                    const sectionMap = {
                        'family': 'family-table',
                        'citations': 'citations-table',
                        'cited_by': 'cited-by-table',
                        'similar': 'similar-table'
                    };
                    
                    const tableId = sectionMap[relationType];
                    const table = document.getElementById(tableId);
                    
                    if (table) {
                        const rows = table.querySelectorAll('tbody tr');
                        rows.forEach(row => {
                            if (relationType === 'family') {
                                // 同族表格：第3列是公开号
                                const pubNumber = row.cells[2]?.textContent?.trim();
                                if (pubNumber && pubNumber !== '-') {
                                    relationData.push({
                                        publication_number: pubNumber,
                                        application_number: row.cells[0]?.textContent?.trim() || pubNumber,
                                        status: row.cells[1]?.textContent?.trim() || ''
                                    });
                                }
                            } else {
                                // 其他表格：从 data-patent-number 属性或第一列获取
                                const patentNum = row.getAttribute('data-patent-number') || row.cells[0]?.textContent?.trim();
                                if (patentNum) {
                                    relationData.push({
                                        patent_number: patentNum,
                                        title: row.cells[1]?.textContent?.trim() || ''
                                    });
                                }
                            }
                        });
                    }
                    
                    if (relationData.length === 0) {
                        alert('没有找到相关专利数据');
                        return;
                    }
                    
                    // 打开主窗口并创建标签页
                    if (window.opener && window.opener.openRelationAnalysisTab) {
                        window.opener.openRelationAnalysisTab(patentNumber, relationType, relationData);
                        // 可选：提示用户
                        const btn = event.target.closest('.analyze-btn');
                        if (btn) {
                            const originalHTML = btn.innerHTML;
                            btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/></svg> 已发送';
                            setTimeout(() => {
                                btn.innerHTML = originalHTML;
                            }, 2000);
                        }
                    } else {
                        alert('无法连接到主窗口，请确保从主页面打开此详情页');
                    }
                }
                
                // 从新标签页跳转到同族权利要求对比分析
                window.jumpToFamilyComparisonFromNewTab = function(event, patentNumber) {
                    event.stopPropagation();
                    
                    const familyApps = pageData.family_applications || [];
                    let familyPatentNumbers = familyApps
                        .map(app => app.publication_number)
                        .filter(num => num && num !== '-');
                    
                    if (familyPatentNumbers.length < 2) {
                        alert('同族专利数量不足，需要至少2个同族专利才能进行对比分析');
                        return;
                    }
                    
                    if (window.opener && window.opener.startFamilyClaimsComparison) {
                        window.opener.startFamilyClaimsComparison(patentNumber, familyPatentNumbers);
                        const btn = event.target.closest('.copy-section-btn');
                        if (btn) {
                            const originalHTML = btn.innerHTML;
                            btn.innerHTML = '已发送';
                            setTimeout(() => {
                                btn.innerHTML = originalHTML;
                            }, 2000);
                        }
                        alert('已跳转到主页面功能四同族对比分析界面，请在主页面查看');
                    } else {
                        alert('无法连接到主窗口的同族对比功能，请确保从主页面打开此详情页，并刷新主页面后重试');
                    }
                }
                
                // 平滑滚动和导航高亮（移除自动展开/折叠逻辑）
                document.addEventListener('DOMContentLoaded', function() {
                    const navItems = document.querySelectorAll('.side-nav-item');
                    const sections = document.querySelectorAll('.section');
                    
                    const sectionDataMap = {
                        'abstract': pageData.abstract && pageData.abstract.length > 0,
                        'claims': pageData.claims && pageData.claims.length > 0,
                        'citations': pageData.patent_citations && pageData.patent_citations.length > 0,
                        'cited-by': pageData.cited_by && pageData.cited_by.length > 0,
                        'similar': pageData.similar_documents && pageData.similar_documents.length > 0,
                        'description': pageData.description && pageData.description.length > 0
                    };
                    
                    // 标记缺失数据的导航项
                    navItems.forEach(item => {
                        const sectionId = item.getAttribute('data-section');
                        if (sectionId && sectionDataMap.hasOwnProperty(sectionId) && !sectionDataMap[sectionId]) {
                            item.style.color = '#d32f2f';
                            item.style.opacity = '0.6';
                            item.style.pointerEvents = 'none';
                            item.style.cursor = 'not-allowed';
                            item.title = '该部分数据未抓取到';
                        }
                    });
                    
                    // 点击导航项平滑滚动并展开对应section
                    navItems.forEach(item => {
                        item.addEventListener('click', function(e) {
                            e.preventDefault();
                            const targetId = this.getAttribute('href').substring(1);
                            const targetSection = document.getElementById(targetId);
                            if (targetSection) {
                                // 如果是可折叠的section，展开它
                                if (targetSection.classList.contains('collapsible-section')) {
                                    targetSection.classList.remove('collapsed');
                                }
                                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                        });
                    });
                    
                    // 滚动时高亮当前section（不自动展开/折叠）
                    function highlightNav() {
                        let current = '';
                        
                        sections.forEach(section => {
                            const sectionTop = section.offsetTop;
                            const sectionHeight = section.clientHeight;
                            if (window.pageYOffset >= sectionTop - 100) {
                                current = section.getAttribute('id');
                            }
                        });
                        
                        // 更新导航高亮
                        navItems.forEach(item => {
                            item.classList.remove('active');
                            if (item.getAttribute('href') === '#' + current) {
                                item.classList.add('active');
                            }
                        });
                    }
                    
                    window.addEventListener('scroll', highlightNav);
                    highlightNav(); // 初始化
                    
                    // 监听解读缓存更新事件（跨窗口通信）
                    window.addEventListener('storage', function(e) {
                        if (e.key === 'patent_analysis_update_signal') {
                            try {
                                const signal = JSON.parse(e.newValue);
                                if (signal && signal.patentNumber === currentPatentNumber.toUpperCase()) {
                                    console.log('收到解读更新信号:', signal);
                                    // 从主窗口获取解读结果
                                    if (window.opener && window.opener.PatentCache) {
                                        const cachedAnalysis = window.opener.PatentCache.getAnalysis(currentPatentNumber);
                                        if (cachedAnalysis) {
                                            updateAnalysisSection(cachedAnalysis.content);
                                        }
                                    }
                                }
                            } catch (err) {
                                console.error('解析解读更新信号失败:', err);
                            }
                        }
                    });
                    
                    // 更新解读区域的函数
                    window.updateAnalysisSection = function(analysisContent) {
                        let analysisJson = {};
                        let displayContent = '';
                        
                        try {
                            let cleanContent = analysisContent.trim();
                            if (cleanContent.startsWith('\\\`\\\`\\\`json')) {
                                cleanContent = cleanContent.replace(/^\\\`\\\`\\\`json\\s*/, '').replace(/\\s*\\\`\\\`\\\`$/, '');
                            } else if (cleanContent.startsWith('\\\`\\\`\\\`')) {
                                cleanContent = cleanContent.replace(/^\\\`\\\`\\\`\\s*/, '').replace(/\\s*\\\`\\\`\\\`$/, '');
                            }
                            
                            analysisJson = JSON.parse(cleanContent);
                            
                            let tableRows = '';
                            Object.keys(analysisJson).forEach(key => {
                                const value = analysisJson[key];
                                const displayValue = typeof value === 'string' ? value.replace(/\\n/g, '<br>') : value;
                                tableRows += '<tr><td style="border: 1px solid #ddd; padding: 12px; font-weight: 500; background-color: #f8f9fa; width: 30%;">' + key + '</td><td style="border: 1px solid #ddd; padding: 12px;">' + displayValue + '</td></tr>';
                            });
                            
                            displayContent = '<table style="width: 100%; border-collapse: collapse; margin-top: 10px; background: white;"><thead><tr style="background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%); color: white;"><th style="border: 1px solid #ddd; padding: 12px; text-align: left; width: 30%;">字段</th><th style="border: 1px solid #ddd; padding: 12px; text-align: left;">内容</th></tr></thead><tbody>' + tableRows + '</tbody></table>';
                        } catch (e) {
                            displayContent = '<div style="padding: 15px; background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; margin-bottom: 15px;">解读结果未能解析为结构化格式，显示原始内容：</div><div style="white-space: pre-wrap; font-family: monospace; background-color: #f5f5f5; padding: 15px; border-radius: 4px; border: 1px solid #ddd;">' + analysisContent + '</div>';
                        }
                        
                        // 查找或创建解读结果区域
                        let analysisSection = document.getElementById('analysis-result');
                        if (!analysisSection) {
                            // 创建解读结果区域
                            const container = document.querySelector('.content');
                            if (container) {
                                const newSection = document.createElement('div');
                                newSection.className = 'section';
                                newSection.id = 'analysis-result';
                                newSection.setAttribute('data-section-id', 'analysis-result');
                                newSection.innerHTML = '<h2 class="section-title" onclick="toggleSection(\\'analysis-result\\')"><div class="section-title-content"><span class="section-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5ZM3 8.5A.5.5 0 0 1 3.5 8h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5ZM2 3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11A.5.5 0 0 1 2 3Z"/></svg></span>AI 解读结果</div></h2><div class="section-content"><div style="padding: 15px; background: linear-gradient(135deg, #e3f2fd 0%, #f5f5f5 100%); border-radius: 8px; border-left: 4px solid #2e7d32;"><div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; padding: 10px; background: white; border-radius: 6px;"><span style="background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%); color: white; padding: 4px 10px; border-radius: 4px; font-size: 0.8em; font-weight: bold;">AI</span><span style="color: #666; font-size: 0.9em;">以下解读由AI生成，仅供参考</span></div>' + displayContent + '</div></div>';
                                container.insertBefore(newSection, container.firstChild);
                                
                                // 更新左侧导航
                                const sideNav = document.getElementById('sideNav');
                                if (sideNav) {
                                    const navItem = document.createElement('a');
                                    navItem.href = '#analysis-result';
                                    navItem.className = 'side-nav-item';
                                    navItem.setAttribute('data-section', 'analysis-result');
                                    navItem.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right:5px;vertical-align:middle"><path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5ZM3 8.5A.5.5 0 0 1 3.5 8h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5ZM2 3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11A.5.5 0 0 1 2 3Z"/></svg>AI解读';
                                    sideNav.insertBefore(navItem, sideNav.children[1]);
                                }
                            }
                        } else {
                            // 更新现有解读区域
                            const contentDiv = analysisSection.querySelector('.section-content > div');
                            if (contentDiv) {
                                const aiContentDiv = contentDiv.querySelector('div:last-child');
                                if (aiContentDiv) {
                                    aiContentDiv.innerHTML = displayContent;
                                }
                            }
                        }
                        
                        // 显示提示
                        const statusDiv = document.getElementById('tab-analysis-status-' + currentPatentNumber);
                        if (statusDiv) {
                            statusDiv.textContent = '已更新';
                            statusDiv.style.color = '#28a745';
                        }
                    };
                    
                    // 初始检查是否有解读缓存
                    if (window.opener && window.opener.PatentCache) {
                        const cachedAnalysis = window.opener.PatentCache.getAnalysis(currentPatentNumber);
                        if (cachedAnalysis) {
                            console.log('发现解读缓存，正在加载...');
                            setTimeout(function() {
                                updateAnalysisSection(cachedAnalysis.content);
                            }, 500);
                        }
                    }
                    
                    // 翻译功能
                    window.showTranslateDialogNewTab = function(event, textType) {
                        event.stopPropagation();
                        
                        let models = ['glm-4-flash', 'glm-4-long', 'glm-4.7-flash'];
                        if (window.opener && window.opener.AVAILABLE_MODELS && window.opener.AVAILABLE_MODELS.length > 0) {
                            models = window.opener.AVAILABLE_MODELS;
                        }
                        const cacheKeyPrefix = 'translation_' + currentPatentNumber + '_' + textType + '_';
                        let cachedModel = null;
                        for (const m of models) {
                            const cached = localStorage.getItem(cacheKeyPrefix + m);
                            if (cached) {
                                try {
                                    const data = JSON.parse(cached);
                                    if (Date.now() - data.timestamp < 7 * 24 * 60 * 60 * 1000) {
                                        cachedModel = m;
                                        break;
                                    }
                                } catch(e) {}
                            }
                        }
                        
                        const dialog = document.createElement('div');
                        dialog.id = 'translate-dialog-newtab';
                        dialog.style.cssText = 'position: fixed; top: 20px; right: 20px; background: white; border-radius: 12px; padding: 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); z-index: 10000; min-width: 300px;';
                        
                        dialog.innerHTML = \`
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                                <h4 style="margin: 0; color: #009688; display: flex; align-items: center; gap: 8px;"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4a9.267 9.267 0 0 1 .64-1.539 6.7 6.7 0 0 1 .597-.933A7.025 7.025 0 0 0 2.255 4H4.09zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.958 6.958 0 0 0-.656 2.5h2.49zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5H4.847zM8.5 5v2.5h2.99a12.495 12.495 0 0 0-.337-2.5H8.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5H4.51zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5H8.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12H5.145zm.182 2.472a6.696 6.696 0 0 1-.597-.933A9.268 9.268 0 0 1 4.09 12H2.255a7.024 7.024 0 0 0 3.072 2.472zM3.82 11a13.652 13.652 0 0 1-.312-2.5h-2.49A6.95 6.95 0 0 0 1.674 11H3.82zm10.026-2.5a13.65 13.65 0 0 1-.312 2.5h2.146c.22-.765.368-1.608.426-2.5h-2.26zm-1.068 2.5c-.138.386-.295.744-.468 1.068-.552 1.035-1.218 1.65-1.887 1.855V12h2.355zm.182 2.472A6.696 6.696 0 0 0 13.91 12h1.835a7.024 7.024 0 0 1-3.072 2.472zM14.326 11a6.95 6.95 0 0 0 .656-2.5h-2.49c-.03.877-.138 1.718-.312 2.5h2.146z"/></svg> 选择翻译模型</h4>
                                <button onclick="document.getElementById('translate-dialog-newtab').remove()" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #999;">&times;</button>
                            </div>
                            \${cachedModel ? '<p style="margin: 0 0 8px 0; color: #28a745; font-size: 12px;">已有缓存 (模型: ' + cachedModel + ')</p>' : ''}
                            <select id="translate-model-select" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 12px;">
                                \${models.map(m => '<option value="' + m + '"' + (m === cachedModel ? ' selected' : '') + '>' + m + '</option>').join('')}
                            </select>
                            <div style="display: flex; gap: 8px;">
                                <button onclick="document.getElementById('translate-dialog-newtab').remove()" style="flex: 1; padding: 8px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer;">取消</button>
                                <button id="start-translate-btn" style="flex: 1; padding: 8px; border: none; background: linear-gradient(135deg, #00bcd4 0%, #009688 100%); color: white; border-radius: 6px; cursor: pointer; font-weight: 500;">开始翻译</button>
                            </div>
                        \`;
                        
                        document.body.appendChild(dialog);
                        
                        document.getElementById('start-translate-btn').onclick = function() {
                            const model = document.getElementById('translate-model-select').value;
                            dialog.remove();
                            startTranslationNewTab(textType, model);
                        };
                    };
                    
                    window.startTranslationNewTab = async function(textType, model) {
                        const btn = document.querySelector('.translate-btn');
                        if (btn) {
                            btn.disabled = true;
                            btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" style="animation: spin 1s linear infinite;"><path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/></svg> 翻译中...';
                        }
                        
                        const cacheKey = 'translation_' + currentPatentNumber + '_' + textType + '_' + model;
                        const cached = localStorage.getItem(cacheKey);
                        if (cached) {
                            try {
                                const data = JSON.parse(cached);
                                if (Date.now() - data.timestamp < 7 * 24 * 60 * 60 * 1000) {
                                    console.log('发现翻译缓存:', cacheKey);
                                    showTranslationResultNewTab(data.translations, textType);
                                    if (btn) {
                                        btn.disabled = false;
                                        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4a9.267 9.267 0 0 1 .64-1.539 6.7 6.7 0 0 1 .597-.933A7.025 7.025 0 0 0 2.255 4H4.09zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.958 6.958 0 0 0-.656 2.5h2.49zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5H4.847zM8.5 5v2.5h2.99a12.495 12.495 0 0 0-.337-2.5H8.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5H4.51zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5H8.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12H5.145zm.182 2.472a6.696 6.696 0 0 1-.597-.933A9.268 9.268 0 0 1 4.09 12H2.255a7.024 7.024 0 0 0 3.072 2.472zM3.82 11a13.652 13.652 0 0 1-.312-2.5h-2.49A6.95 6.95 0 0 0 1.674 11H3.82zm10.026-2.5a13.65 13.65 0 0 1-.312 2.5h2.146c.22-.765.368-1.608.426-2.5h-2.26zm-1.068 2.5c-.138.386-.295.744-.468 1.068-.552 1.035-1.218 1.65-1.887 1.855V12h2.355zm.182 2.472A6.696 6.696 0 0 0 13.91 12h1.835a7.024 7.024 0 0 1-3.072 2.472zM14.326 11a6.95 6.95 0 0 0 .656-2.5h-2.49c-.03.877-.138 1.718-.312 2.5h2.146z"/></svg> 翻译';
                                    }
                                    return;
                                }
                            } catch(e) {}
                        }
                        
                        try {
                            const apiKey = window.opener && window.opener.appState ? window.opener.appState.apiKey : localStorage.getItem('api_key');
                            if (!apiKey) {
                                throw new Error('请先配置API Key');
                            }
                            
                            let translations = [];
                            const url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
                            
                            if (textType === 'claims') {
                                const claims = data.claims || [];
                                if (claims.length === 0) throw new Error('没有可翻译的权利要求');
                                
                                const formattedClaims = claims.map((claim, i) => {
                                    const text = typeof claim === 'string' ? claim : claim.text || '';
                                    return '权利要求 ' + (i + 1) + ': ' + text;
                                }).join('\\n\\n');
                                
                                const response = await fetch(url, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': 'Bearer ' + apiKey
                                    },
                                    body: JSON.stringify({
                                        model: model,
                                        messages: [
                                            { role: 'system', content: '你是一位专业的专利文献翻译专家。请将以下英文专利权利要求翻译为中文。保持专利术语的准确性，保留所有数字标记，翻译要流畅自然。保持权利要求的编号和格式。只返回翻译结果，不要添加任何解释。请按照以下格式返回：权利要求 1: [翻译内容]' },
                                            { role: 'user', content: formattedClaims }
                                        ],
                                        temperature: 0.3,
                                        max_tokens: 4096
                                    })
                                });
                                
                                if (!response.ok) {
                                    const errorData = await response.json().catch(() => ({}));
                                    throw new Error(errorData.error?.message || 'API请求失败: ' + response.status);
                                }
                                
                                const result = await response.json();
                                const translatedText = result.choices?.[0]?.message?.content || '';
                                
                                const pattern = /权利要求\\s*(\\d+)[:：]\\s*(.*?)(?=权利要求\\s*\\d+[:：]|$)/gs;
                                const matches = [...translatedText.matchAll(pattern)];
                                
                                if (matches.length > 0) {
                                    const translatedMap = {};
                                    matches.forEach(match => {
                                        translatedMap[parseInt(match[1])] = match[2].trim();
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
                                    const lines = translatedText.split('\\n').filter(l => l.trim());
                                    claims.forEach((claim, i) => {
                                        const claimText = typeof claim === 'string' ? claim : claim.text || '';
                                        translations.push({
                                            original: claimText,
                                            translated: lines[i] || translatedText,
                                            index: i + 1
                                        });
                                    });
                                }
                            } else {
                                const description = data.description || '';
                                if (!description) throw new Error('没有可翻译的说明书内容');
                                
                                const response = await fetch(url, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': 'Bearer ' + apiKey
                                    },
                                    body: JSON.stringify({
                                        model: model,
                                        messages: [
                                            { role: 'system', content: '你是一位专业的专利文献翻译专家。请将以下英文专利说明书翻译为中文。保持专利术语的准确性，保留所有数字标记，翻译要流畅自然。只返回翻译结果，不要添加任何解释。' },
                                            { role: 'user', content: description.substring(0, 4000) }
                                        ],
                                        temperature: 0.3,
                                        max_tokens: 4096
                                    })
                                });
                                
                                if (!response.ok) {
                                    const errorData = await response.json().catch(() => ({}));
                                    throw new Error(errorData.error?.message || 'API请求失败: ' + response.status);
                                }
                                
                                const result = await response.json();
                                translations.push({
                                    original: description.substring(0, 500) + '...',
                                    translated: result.choices?.[0]?.message?.content || ''
                                });
                            }
                            
                            localStorage.setItem(cacheKey, JSON.stringify({ translations: translations, timestamp: Date.now() }));
                            console.log('翻译结果已缓存:', cacheKey);
                            
                            showTranslationResultNewTab(translations, textType);
                            
                        } catch (error) {
                            alert('翻译失败: ' + error.message);
                            console.error('翻译错误:', error);
                        }
                        
                        if (btn) {
                            btn.disabled = false;
                            btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4a9.267 9.267 0 0 1 .64-1.539 6.7 6.7 0 0 1 .597-.933A7.025 7.025 0 0 0 2.255 4H4.09zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.958 6.958 0 0 0-.656 2.5h2.49zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5H4.847zM8.5 5v2.5h2.99a12.495 12.495 0 0 0-.337-2.5H8.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5H4.51zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5H8.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12H5.145zm.182 2.472a6.696 6.696 0 0 1-.597-.933A9.268 9.268 0 0 1 4.09 12H2.255a7.024 7.024 0 0 0 3.072 2.472zM3.82 11a13.652 13.652 0 0 1-.312-2.5h-2.49A6.95 6.95 0 0 0 1.674 11H3.82zm10.026-2.5a13.65 13.65 0 0 1-.312 2.5h2.146c.22-.765.368-1.608.426-2.5h-2.26zm-1.068 2.5c-.138.386-.295.744-.468 1.068-.552 1.035-1.218 1.65-1.887 1.855V12h2.355zm.182 2.472A6.696 6.696 0 0 0 13.91 12h1.835a7.024 7.024 0 0 1-3.072 2.472zM14.326 11a6.95 6.95 0 0 0 .656-2.5h-2.49c-.03.877-.138 1.718-.312 2.5h2.146z"/></svg> 翻译';
                        }
                    };
                    
                    window.showTranslationResultNewTab = function(translations, textType) {
                        const existingResult = document.getElementById('translation-result-panel');
                        if (existingResult) existingResult.remove();
                        
                        const panel = document.createElement('div');
                        panel.id = 'translation-result-panel';
                        panel.style.cssText = 'position: fixed; top: 80px; right: 20px; width: 450px; max-height: 70vh; background: white; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); z-index: 9999; overflow: hidden;';
                        
                        let content = '';
                        if (textType === 'claims' && translations[0]?.index) {
                            translations.forEach(t => {
                                content += \`
                                    <div style="padding: 12px; border-bottom: 1px solid #eee;">
                                        <div style="font-weight: 600; color: #009688; margin-bottom: 6px;">权利要求 \${t.index}</div>
                                        <div style="font-size: 12px; color: #666; margin-bottom: 4px;">原文:</div>
                                        <div style="font-size: 13px; color: #333; margin-bottom: 8px; padding: 8px; background: #f5f5f5; border-radius: 4px;">\${t.original}</div>
                                        <div style="font-size: 12px; color: #666; margin-bottom: 4px;">译文:</div>
                                        <div style="font-size: 13px; color: #2e7d32; padding: 8px; background: #e8f5e9; border-radius: 4px;">\${t.translated}</div>
                                    </div>
                                \`;
                            });
                        } else {
                            translations.forEach((t, i) => {
                                content += \`
                                    <div style="padding: 12px; border-bottom: 1px solid #eee;">
                                        <div style="font-weight: 600; color: #009688; margin-bottom: 6px;">段落 \${i + 1}</div>
                                        <div style="font-size: 13px; color: #2e7d32; padding: 8px; background: #e8f5e9; border-radius: 4px; white-space: pre-wrap;">\${t.translated}</div>
                                    </div>
                                \`;
                            });
                        }
                        
                        panel.innerHTML = \`
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: linear-gradient(135deg, #00bcd4 0%, #009688 100%); color: white;">
                                <h4 style="margin: 0; display: flex; align-items: center; gap: 8px;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4a9.267 9.267 0 0 1 .64-1.539 6.7 6.7 0 0 1 .597-.933A7.025 7.025 0 0 0 2.255 4H4.09zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.958 6.958 0 0 0-.656 2.5h2.49zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5H4.847zM8.5 5v2.5h2.99a12.495 12.495 0 0 0-.337-2.5H8.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5H4.51zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5H8.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12H5.145zm.182 2.472a6.696 6.696 0 0 1-.597-.933A9.268 9.268 0 0 1 4.09 12H2.255a7.024 7.024 0 0 0 3.072 2.472zM3.82 11a13.652 13.652 0 0 1-.312-2.5h-2.49A6.95 6.95 0 0 0 1.674 11H3.82zm10.026-2.5a13.65 13.65 0 0 1-.312 2.5h2.146c.22-.765.368-1.608.426-2.5h-2.26zm-1.068 2.5c-.138.386-.295.744-.468 1.068-.552 1.035-1.218 1.65-1.887 1.855V12h2.355zm.182 2.472A6.696 6.696 0 0 0 13.91 12h1.835a7.024 7.024 0 0 1-3.072 2.472zM14.326 11a6.95 6.95 0 0 0 .656-2.5h-2.49c-.03.877-.138 1.718-.312 2.5h2.146z"/></svg> 翻译结果 - \${textType === 'claims' ? '权利要求' : '说明书'}</h4>
                                <button onclick="document.getElementById('translation-result-panel').remove()" style="background: none; border: none; font-size: 20px; cursor: pointer; color: white;">&times;</button>
                            </div>
                            <div style="max-height: calc(70vh - 60px); overflow-y: auto;">
                                \${content}
                            </div>
                        \`;
                        
                        document.body.appendChild(panel);
                    };
                });
            </script>
        </body>
        </html>
    `;
    
    // 创建一个新窗口
    const newWindow = window.open('', '_blank');
    if (newWindow) {
        // 写入HTML内容
        newWindow.document.write(htmlContent);
        newWindow.document.close();
    }
};
