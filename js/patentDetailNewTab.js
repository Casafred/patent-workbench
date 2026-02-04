// 功能六：在新标签页打开专利详情 - 绿色主题 + 左侧导航
// 此文件需要在 main.js 之后加载

window.openPatentDetailInNewTab = function(patentNumber) {
    // 找到对应的专利结果
    const patentResult = window.patentResults.find(result => result.patent_number === patentNumber);
    if (!patentResult || !patentResult.success) {
        alert('❌ 无法打开：专利数据不存在');
        return;
    }
    
    const data = patentResult.data;
    
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
                    width: 28px;
                    height: 28px;
                    background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%);
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 0.7em;
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
                <a href="#abstract" class="side-nav-item">📄 摘要</a>
                <a href="#basic-info" class="side-nav-item">ℹ️ 基本信息</a>
                <a href="#classifications" class="side-nav-item">🏷️ CPC分类</a>
                <a href="#landscapes" class="side-nav-item">🌐 技术领域</a>
                <a href="#claims" class="side-nav-item">⚖️ 权利要求</a>
                <a href="#timeline" class="side-nav-item">📅 事件时间轴</a>
                <a href="#family" class="side-nav-item">👨‍👩‍👧‍👦 同族信息</a>
                <a href="#external-links" class="side-nav-item">🔗 外部链接</a>
                <a href="#citations" class="side-nav-item">📚 引用专利</a>
                <a href="#cited-by" class="side-nav-item">🔗 被引用</a>
                <a href="#similar" class="side-nav-item">📋 相似文档</a>
                <a href="#description" class="side-nav-item">📝 说明书</a>
            </nav>
            
            <div class="container">
                <div class="header">
                    <div class="header-top">
                        <div class="patent-number">专利号: ${patentNumber}</div>
                    </div>
                    <h1 class="patent-title">${data.title || '专利详情'}</h1>
                    <div class="meta-info">
                        ${data.application_date ? `<span>📅 申请日期: ${data.application_date}</span>` : ''}
                        ${data.publication_date ? `<span>📅 公开日期: ${data.publication_date}</span>` : ''}
                        <span>⏱️ 查询耗时: ${patentResult.processing_time?.toFixed(2) || 'N/A'}秒</span>
                    </div>
                </div>
                
                <div class="content">
                    ${data.abstract ? `
                    <div class="section collapsible-section" id="abstract" data-section-id="abstract">
                        <h2 class="section-title" onclick="toggleSection('abstract')">
                            <div class="section-title-content">
                                <span class="section-icon">📄</span>
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
                            <span class="section-icon">ℹ️</span>
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
                            ${patentResult.url ? `
                            <div class="info-card">
                                <div class="info-label">原始链接</div>
                                <div class="info-value"><a href="${patentResult.url}" target="_blank" style="color: #2e7d32;">Google Patents</a></div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    ${data.classifications && data.classifications.length > 0 ? `
                    <div class="section" id="classifications">
                        <h2 class="section-title">
                            <span class="section-icon">🏷️</span>
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
                    
                    ${data.landscapes && data.landscapes.length > 0 ? `
                    <div class="section" id="landscapes">
                        <h2 class="section-title">
                            <span class="section-icon">🌐</span>
                            技术领域
                        </h2>
                        <div class="tag-list">
                            ${data.landscapes.map(landscape => `
                            <span class="tag">${landscape.name}</span>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                    
                    ${data.claims && data.claims.length > 0 ? `
                    <div class="section collapsible-section collapsed" id="claims" data-section-id="claims">
                        <h2 class="section-title" onclick="toggleSection('claims')">
                            <div class="section-title-content">
                                <span class="section-icon">⚖️</span>
                                权利要求 (${data.claims.length})
                            </div>
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
                                ${data.claims.map((claim, index) => `
                                <div class="claim-item" data-claim-number="${index + 1}" data-claim-text="${claim.replace(/"/g, '&quot;')}">
                                    <div class="claim-number">权利要求 ${index + 1}</div>
                                    <div class="claim-text">${claim}</div>
                                </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${data.legal_events && data.legal_events.length > 0 ? `
                    <div class="section" id="timeline">
                        <h2 class="section-title">
                            <span class="section-icon">📅</span>
                            事件时间轴 (${data.legal_events.length})
                        </h2>
                        <div class="timeline">
                            ${data.legal_events.map(event => `
                            <div class="timeline-item">
                                <div class="timeline-date">${event.date}</div>
                                <div class="timeline-title">${event.title || event.description}</div>
                                ${event.type ? `<div class="timeline-type">${event.type}</div>` : ''}
                            </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                    
                    ${data.family_id || (data.family_applications && data.family_applications.length > 0) ? `
                    <div class="section" id="family">
                        <h2 class="section-title">
                            <span class="section-icon">👨‍👩‍👧‍👦</span>
                            同族信息
                        </h2>
                        ${data.family_id ? `<div class="info-card" style="margin-bottom: 20px;"><div class="info-label">同族ID</div><div class="info-value">${data.family_id}</div></div>` : ''}
                        ${data.family_applications && data.family_applications.length > 0 ? `
                        <table class="data-table">
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
                    
                    ${data.external_links && Object.keys(data.external_links).length > 0 ? `
                    <div class="section" id="external-links">
                        <h2 class="section-title">
                            <span class="section-icon">🔗</span>
                            外部链接
                        </h2>
                        <div class="link-grid">
                            ${Object.entries(data.external_links).map(([id, link]) => `
                            <a href="${link.url}" target="_blank" class="link-card">${link.text}</a>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                    
                    ${data.patent_citations && data.patent_citations.length > 0 ? `
                    <div class="section collapsible-section collapsed" id="citations" data-section-id="citations">
                        <h2 class="section-title" onclick="toggleSection('citations')">
                            <div class="section-title-content">
                                <span class="section-icon">📚</span>
                                引用专利 (${data.patent_citations.length})
                            </div>
                            <button class="copy-section-btn" onclick="copyPatentNumbersList(event, 'citations')">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                                    <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                                </svg>
                                复制专利号
                            </button>
                        </h2>
                        <div class="section-content">
                            <table class="data-table">
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
                                        <td>${citation.examiner_cited ? '<span style="color: #d32f2f; font-weight: bold;">✓ 审查员引用</span>' : '-'}</td>
                                    </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${data.cited_by && data.cited_by.length > 0 ? `
                    <div class="section collapsible-section collapsed" id="cited-by" data-section-id="cited-by">
                        <h2 class="section-title" onclick="toggleSection('cited-by')">
                            <div class="section-title-content">
                                <span class="section-icon">🔗</span>
                                被引用专利 (${data.cited_by.length})
                            </div>
                            <button class="copy-section-btn" onclick="copyPatentNumbersList(event, 'cited-by')">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                                    <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                                </svg>
                                复制专利号
                            </button>
                        </h2>
                        <div class="section-content">
                            <table class="data-table">
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
                    
                    ${data.similar_documents && data.similar_documents.length > 0 ? `
                    <div class="section collapsible-section collapsed" id="similar" data-section-id="similar">
                        <h2 class="section-title" onclick="toggleSection('similar')">
                            <div class="section-title-content">
                                <span class="section-icon">📋</span>
                                相似文档 (${data.similar_documents.length})
                            </div>
                            <button class="copy-section-btn" onclick="copyPatentNumbersList(event, 'similar')">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                                    <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                                </svg>
                                复制专利号
                            </button>
                        </h2>
                        <div class="section-content">
                            <table class="data-table">
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
                    
                    ${data.description ? `
                    <div class="section collapsible-section collapsed" id="description" data-section-id="description">
                        <h2 class="section-title" onclick="toggleSection('description')">
                            <div class="section-title-content">
                                <span class="section-icon">📝</span>
                                说明书
                            </div>
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
                
                // 平滑滚动和导航高亮（移除自动展开/折叠逻辑）
                document.addEventListener('DOMContentLoaded', function() {
                    const navItems = document.querySelectorAll('.side-nav-item');
                    const sections = document.querySelectorAll('.section');
                    
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
