window.PatentDetailHtmlBuilder = {
    buildHeader: function(patentNumber, data, patentResult) {
        const U = window.PatentDetailUtils;
        return `
            <div class="header">
                <div class="header-top">
                    <div class="patent-number">专利号: ${patentNumber}</div>
                    <div style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap;">
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <button id="dual-column-btn" onclick="toggleDualColumnMode()" title="切换双栏对照模式" style="color: white; text-decoration: none; font-size: 0.95em; font-weight: 500; background: rgba(255,255,255,0.25); padding: 6px 14px; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px; border: 1px solid rgba(255,255,255,0.4); cursor: pointer;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M0 3a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3zm2-1a1 1 0 0 0-1 1v1h2V2H2zm3 2h2V2H5v2zm3-2v2h2V2H8zm3 2v2h2V4h-2zm0 3v2h2V7h-2zm0 3v2h2v-2h-2zm-3 2v2h2v-2H8zm-3 2v2h2v-2H5zm-3-2v2h2v-2H2zm0-3v2h2V7H2zm0-3v2h2V4H2zm5 0v2h2V4H7zm2 3H7v2h2V7z"/></svg>
                                双栏对照
                            </button>
                            <button id="image-text-btn" onclick="toggleImageTextMode()" title="切换图文对照模式" style="color: white; text-decoration: none; font-size: 0.95em; font-weight: 500; background: rgba(255,255,255,0.25); padding: 6px 14px; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px; border: 1px solid rgba(255,255,255,0.4); cursor: pointer;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M.002 3a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-12a2 2 0 0 1-2-2V3zm1 9v1a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12zm5-6.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0z"/></svg>
                                图文对照
                            </button>
                            ${data.pdf_link ? `
                            <a href="${data.pdf_link}" target="_blank" style="color: white; text-decoration: none; font-size: 0.95em; font-weight: 500; background: rgba(255,255,255,0.25); padding: 6px 14px; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px; border: 1px solid rgba(255,255,255,0.4);">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/></svg>
                                PDF原文
                            </a>
                            ` : ''}
                            ${patentResult.url ? `
                            <a href="${patentResult.url}" target="_blank" style="color: white; text-decoration: none; font-size: 0.95em; font-weight: 500; background: rgba(255,255,255,0.25); padding: 6px 14px; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px; border: 1px solid rgba(255,255,255,0.4);">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/><path d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/></svg>
                                Google Patents
                            </a>
                            ` : ''}
                            <button id="patent-chat-btn" onclick="openPatentChatInNewTab('${U.safeStr(patentNumber)}')" title="问一问 - AI智能问答" style="color: white; text-decoration: none; font-size: 0.95em; font-weight: 500; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 6px 14px; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px; border: none; cursor: pointer;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/><path d="m2.165 15.803.02-.004c1.83-.363 2.948-.842 3.468-1.105A9.06 9.06 0 0 0 8 15c4.418 0 8-3.134 8-7s-3.582-7-8-7-8 3.134-8 7c0 1.76.743 3.37 1.97 4.6a10.437 10.437 0 0 1-.524 2.318l-.003.011a10.722 10.722 0 0 1-.244.637c-.079.186.074.394.273.362a21.673 21.673 0 0 0 .693-.125zm.8-3.108a1 1 0 0 0-.287-.801C1.618 10.83 1 9.468 1 8c0-3.192 3.004-6 7-6s7 2.808 7 6c0 3.193-3.004 6-7 6a8.06 8.06 0 0 1-2.088-.272 1 1 0 0 0-.711.074c-.387.196-1.24.57-2.634.893a10.97 10.97 0 0 0 .398-2z"/></svg>
                                问一问
                            </button>
                            <button id="export-word-btn" onclick="exportPatentDetailToWordFromNewTab('${U.safeStr(patentNumber)}')" title="下载Word文档" style="color: white; text-decoration: none; font-size: 0.95em; font-weight: 500; background: linear-gradient(135deg, #2E7D32 0%, #388E3C 100%); padding: 6px 14px; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px; border: none; cursor: pointer;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                                    <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                                </svg>
                                下载Word
                            </button>
                        </div>
                        ${data.external_links && Object.keys(data.external_links).length > 0 ? `
                        <div style="display: flex; gap: 8px; align-items: center; padding-left: 15px; border-left: 1px solid rgba(255,255,255,0.3);">
                            ${Object.entries(data.external_links).map(([id, link]) => `
                            <a href="${link.url}" target="_blank" style="color: rgba(255,255,255,0.85); text-decoration: none; font-size: 0.85em; background: rgba(0,0,0,0.15); padding: 4px 10px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/><path d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/></svg>
                                ${link.text}
                            </a>
                            `).join('')}
                        </div>
                        ` : ''}
                    </div>
                </div>
                <h1 class="patent-title">${U.safeStr(data.title) || '专利详情'}</h1>
                <div class="meta-info">
                    ${data.application_date ? `<span style="display: inline-flex; align-items: center; gap: 5px;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M11 6.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm-3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm-5 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z"/><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/></svg> 申请日期: ${data.application_date}</span>` : ''}
                    ${data.publication_date ? `<span style="display: inline-flex; align-items: center; gap: 5px;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M11 6.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm-3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm-5 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z"/><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/></svg> 公开日期: ${data.publication_date}</span>` : ''}
                </div>
            </div>
        `;
    },

    buildSideNav: function(data, analysisResult, selectedFields) {
        const U = window.PatentDetailUtils;
        const buildNavItem = (navId, icon, label) => U.buildNavItem(navId, icon, label, selectedFields);
        
        return `
            <nav class="side-nav" id="sideNav">
                <a href="#" class="side-nav-item scroll-to-top" onclick="scrollToTop(event)" title="回到顶部" style="background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%); color: white; font-weight: 600; margin-bottom: 15px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right: 5px;">
                        <path fill-rule="evenodd" d="M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 1 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5z"/>
                    </svg>
                    顶部
                </a>
                ${analysisResult ? '<a href="#analysis-result" class="side-nav-item" data-section="analysis-result"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right:5px;vertical-align:middle"><path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5ZM3 8.5A.5.5 0 0 1 3.5 8h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5ZM2 3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11A.5.5 0 0 1 2 3Z"/></svg>AI解读</a>' : ''}
                ${buildNavItem('basic-info', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right:5px;vertical-align:middle"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/></svg>', '基本信息')}
                ${buildNavItem('abstract', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right:5px;vertical-align:middle"><path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/></svg>', '摘要')}
                ${data.drawings && data.drawings.length > 0 ? buildNavItem('drawings', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right:5px;vertical-align:middle"><path d="M.002 3a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-12a2 2 0 0 1-2-2V3zm1 9v1a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12zm5-6.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0z"/></svg>', '附图') : ''}
                ${buildNavItem('classifications', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right:5px;vertical-align:middle"><path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/></svg>', '分类信息')}
                ${buildNavItem('claims', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right:5px;vertical-align:middle"><path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z"/><path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/></svg>', '权利要求')}
                ${buildNavItem('description', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right:5px;vertical-align:middle"><path d="M3 2.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-11zm1 1v9h8v-9h-8z"/><path d="M5 5.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zM5 8a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5A.5.5 0 0 1 5 8zm0 2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5z"/></svg>', '说明书')}
                ${buildNavItem('events-combined', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right:5px;vertical-align:middle"><path d="M11 6.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm-3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm-5 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z"/><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/></svg>', '事件信息')}
                ${buildNavItem('family', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right:5px;vertical-align:middle"><path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7Zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5.784 6A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216ZM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/></svg>', '同族信息')}
                ${buildNavItem('related-patents', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right:5px;vertical-align:middle"><path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z"/></svg>', '相关专利')}
            </nav>
        `;
    },

    buildBasicInfo: function(data) {
        const U = window.PatentDetailUtils;
        return `
            <div class="section" id="basic-info">
                <h2 class="section-title">
                    <span class="section-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/></svg></span>
                    基本信息
                </h2>
                <div class="info-grid">
                    ${data.inventors && data.inventors.length > 0 ? `
                    <div class="info-card">
                        <div class="info-label">发明人</div>
                        <div class="info-value">${U.safeStr(data.inventors.join(', '))}</div>
                    </div>
                    ` : ''}
                    ${data.assignees && data.assignees.length > 0 ? `
                    <div class="info-card">
                        <div class="info-label">申请人</div>
                        <div class="info-value">${U.safeStr(data.assignees.join(', '))}</div>
                    </div>
                    ` : ''}
                    ${data.priority_date ? `
                    <div class="info-card">
                        <div class="info-label">优先权日期</div>
                        <div class="info-value">${U.safeStr(data.priority_date)}</div>
                    </div>
                    ` : ''}
                    ${data.pdf_link ? `
                    <div class="info-card">
                        <div class="info-label">PDF原文</div>
                        <div class="info-value"><a href="${data.pdf_link}" target="_blank" style="color: #2e7d32; font-weight: 500; display: inline-flex; align-items: center; gap: 5px;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg> 下载PDF</a></div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    },

    buildAbstract: function(data, selectedFields) {
        const U = window.PatentDetailUtils;
        if (!data.abstract || !U.shouldShowField('abstract', selectedFields)) return '';
        
        return `
            <div class="section collapsible-section" id="abstract" data-section-id="abstract">
                <h2 class="section-title" onclick="toggleSection(event, 'abstract')">
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
                    <div class="abstract-box" data-section-content="abstract">${U.safeStr(data.abstract)}</div>
                </div>
            </div>
        `;
    },

    buildDrawings: function(data, selectedFields) {
        const U = window.PatentDetailUtils;
        if (!data.drawings || data.drawings.length === 0 || !U.shouldShowField('drawings', selectedFields)) return '';
        
        const maxVisibleDrawings = 6;
        const visibleDrawings = data.drawings.slice(0, maxVisibleDrawings);
        const hasMoreDrawings = data.drawings.length > maxVisibleDrawings;
        
        let drawingsHtml = '';
        visibleDrawings.forEach((drawing, index) => {
            drawingsHtml += `
                <div class="drawing-thumbnail" onclick="openNewTabImageViewer(${index})" style="position: relative; background: white; border-radius: 8px; overflow: hidden; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: all 0.3s; border: 2px solid transparent;" onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 4px 16px rgba(46,125,50,0.2)';this.style.borderColor='#2e7d32';" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)';this.style.borderColor='transparent';">
                    <img src="${U.safeStr(drawing)}" alt="附图 ${index + 1}" style="width: 100%; height: 120px; object-fit: contain; background: #f5f5f5;" onerror="this.style.display='none'">
                    <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.7)); color: white; font-size: 12px; padding: 8px 6px 4px; text-align: center;">图 ${index + 1}</div>
                </div>
            `;
        });
        
        if (hasMoreDrawings) {
            const remainingCount = data.drawings.length - maxVisibleDrawings;
            drawingsHtml += `
                <div class="drawing-thumbnail drawing-more" onclick="openNewTabImageViewer(${maxVisibleDrawings})" style="position: relative; background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%); border-radius: 8px; overflow: hidden; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: all 0.3s; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 120px;" onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 4px 16px rgba(46,125,50,0.3)';" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)';">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="white" viewBox="0 0 16 16" style="opacity: 0.9;">
                        <path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5ZM3 8.5A.5.5 0 0 1 3.5 8h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5Zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5Z"/>
                    </svg>
                    <div style="color: white; font-size: 14px; font-weight: 500; margin-top: 4px;">+${remainingCount} 张</div>
                </div>
            `;
        }
        
        return `
            <div class="section" id="drawings" data-section-id="drawings">
                <h2 class="section-title">
                    <div class="section-title-content">
                        <span class="section-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M.002 3a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-12a2 2 0 0 1-2-2V3zm1 9v1a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12zm5-6.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0z"/></svg></span>
                        附图 (${data.drawings.length}张)
                    </div>
                </h2>
                <div class="section-content" style="display: block;">
                    <div class="drawings-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; margin-top: 10px;">
                        ${drawingsHtml}
                    </div>
                </div>
            </div>
            <script>
                window.newTabDrawings = ${U.safeJsonStringify(data.drawings)};
            </script>
        `;
    }
};
