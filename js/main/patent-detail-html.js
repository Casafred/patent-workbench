// js/main/patent-detail-html.js
// 专利详情HTML构建模块
// 从 main.js 拆分出来，负责构建专利详情展示的HTML内容

// =================================================================================
// 字段映射关系：将字段选择器的值映射到数据字段
// =================================================================================
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

// =================================================================================
// 检查是否应该显示某个字段
// =================================================================================
function shouldShowField(fieldKey, selectedFields) {
    // 如果没有提供selectedFields，显示所有字段
    if (!selectedFields || selectedFields.length === 0) {
        return true;
    }
    
    // 基础字段始终显示（包括单数和复数形式）
    const baseFields = ['patent_number', 'title', 'abstract', 'applicant', 'inventor', 'assignees', 'inventors', 'application_date', 'publication_date', 'filing_date', 'priority_date', 'ipc_classification', 'url'];
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

// =================================================================================
// 构建专利详情HTML
// =================================================================================
function buildPatentDetailHTML(result, selectedFields) {
    const data = result.data;
    
    // 如果没有提供selectedFields，尝试从全局获取
    if (!selectedFields && window.getSelectedFields) {
        selectedFields = window.getSelectedFields();
    }
    
    // 直接开始构建基本信息，不再包含patent-card-header
    let htmlContent = `<div style="margin-bottom: 15px;">`;
    
    // 基础字段（始终显示）
    const fields = [
        { label: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: middle; margin-right: 4px;"><path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/><path d="M4.5 12.5A.5.5 0 0 1 5 12h3a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5zm0-2A.5.5 0 0 1 5 10h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5zm1.639-3.958 1.33.886 1.854-1.855a.25.25 0 0 1 .289-.047l1.888.974V8.5a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V7s1.614-.836 1.639-.458z"/></svg> 摘要', value: data.abstract, type: 'text', key: 'abstract' },
        { label: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: middle; margin-right: 4px;"><path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/></svg> 发明人', value: data.inventors && data.inventors.length > 0 ? data.inventors.join(', ') : null, type: 'text', key: 'inventors' },
        { label: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: middle; margin-right: 4px;"><path d="M8.5 2a.5.5 0 0 0-1 0h1zm1 3.5a.5.5 0 0 0 1 0h-1zm-7.5 1a.5.5 0 0 0 0 1V6.5zm11.5 1a.5.5 0 0 0 0-1v1zm-6 6v1a.5.5 0 0 0 .5-.5h-.5zm0-11V1h-1v1h1zm7.5 4h.5v-.5h-.5v.5zm-11 0v-.5h-.5v.5h.5zm6 7h-.5v.5h.5v-.5zM4.5 9h7V8h-7v1zm7 0a.5.5 0 0 1 .5.5h1A1.5 1.5 0 0 0 11.5 8v1zm.5 4.5a.5.5 0 0 1-.5.5v1a1.5 1.5 0 0 0 1.5-1.5h-1zm-.5.5h-7v1h7v-1zm-7 0a.5.5 0 0 1-.5-.5H3A1.5 1.5 0 0 0 4.5 15v-1zm-.5-.5V9H3v4.5h1zM4.5 8A1.5 1.5 0 0 0 3 9.5h1a.5.5 0 0 1 .5-.5V8zm3 7v-6h-1v6h1zm.5-5.5h7v-1h-7v1zm6.5-.5v4.5h1V9h-1zm.5 3.5h-7v1h7v-1zM8.5 6v6h1V6h-1zm5-1h-11v1h11V5zm-10.5.5v4h1v-4h-1zm.5-.5a.5.5 0 0 0-.5.5h1a.5.5 0 0 1-.5-.5zM8 2v3.5h1V2H8z"/></svg> 申请人', value: data.assignees && data.assignees.length > 0 ? data.assignees.join(', ') : null, type: 'text', key: 'assignees' },
        { label: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: middle; margin-right: 4px;"><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/></svg> 申请日期', value: data.application_date, type: 'text', key: 'application_date' },
        { label: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: middle; margin-right: 4px;"><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/></svg> 公开日期', value: data.publication_date, type: 'text', key: 'publication_date' },
        { label: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: middle; margin-right: 4px;"><path d="M6.354 5.5H4a3 3 0 0 0 0 6h3a3 3 0 0 0 2.83-4H9c-.086 0-.17.01-.25.031A2 2 0 0 1 7 10.5H4a2 2 0 1 1 0-4h1.535c.218-.376.495-.714.82-1H4a3 3 0 1 0 0 6h3a3 3 0 0 0 2.83-4H9c-.086 0-.17.01-.25.031A2 2 0 0 1 7 10.5H4a2 2 0 1 1 0-4h1.535c.218-.376.495-.714.82-1H4z"/><path d="M9 5.5a3 3 0 0 0-2.83 4h1.098A2 2 0 0 1 9 6.5h3a2 2 0 1 1 0 4h-1.535a4.02 4.02 0 0 1-.82 1H12a3 3 0 1 0 0-6H9z"/></svg> 专利链接', value: result.url, type: 'url', key: 'url' },
        { label: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: middle; margin-right: 4px;"><path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/><path d="M.5 9.5a.5.5 0 0 1 .5-.5h3.5a.5.5 0 0 1 0 1H1a.5.5 0 0 1-.5-.5zM.5 12a.5.5 0 0 1 .5-.5h3.5a.5.5 0 0 1 0 1H1a.5.5 0 0 1-.5-.5z"/><path d="M6.5 9.5a.5.5 0 0 1 .5-.5h3.5a.5.5 0 0 1 0 1H7a.5.5 0 0 1-.5-.5zm0 2.5a.5.5 0 0 1 .5-.5h3.5a.5.5 0 0 1 0 1H7a.5.5 0 0 1-.5-.5z"/></svg> PDF原文', value: data.pdf_link, type: 'url', key: 'pdf_link' }
    ];
    
    fields.forEach(field => {
        if (field.value && shouldShowField(field.key, selectedFields)) {
            if (field.type === 'url') {
                htmlContent += `
                    <p style="margin-bottom: 10px; font-family: 'Noto Sans SC', Arial, sans-serif;">
                        <strong style="color: var(--primary-color);">${field.label}:</strong>
                        <button class="copy-field-btn" onclick="copyFieldContent('${result.patent_number}', '${field.key}', event)" title="复制${field.label}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>
                        </button>
                        <br/>
                        <a href="${field.value}" target="_blank" style="color: var(--primary-color); text-decoration: underline;">${field.value}</a>
                    </p>
                `;
            } else {
                htmlContent += `
                    <p style="margin-bottom: 10px; font-family: 'Noto Sans SC', Arial, sans-serif;">
                        <strong style="color: var(--primary-color);">${field.label}:</strong>
                        <button class="copy-field-btn" onclick="copyFieldContent('${result.patent_number}', '${field.key}', event)" title="复制${field.label}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>
                        </button>
                        <br/>
                        <span style="line-height: 1.6;">${field.value}</span>
                    </p>
                `;
            }
        }
    });
    
    // 批量解读结果
    const analysisResult = window.patentBatchAnalysisResults && window.patentBatchAnalysisResults.find(item => item.patent_number === result.patent_number);
    
    // 检查是否正在解读中
    const isAnalyzing = window.patentBatchAnalyzing && window.patentBatchAnalyzing.has(result.patent_number);
    
    if (analysisResult) {
        let analysisJson = {};
        let displayContent = '';
        try {
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
                tableRows += `<tr><td class="analysis-table-field">${key}</td><td class="analysis-table-value">${displayValue}</td></tr>`;
            });
            
            displayContent = `
                <div class="analysis-content">
                    <table class="analysis-table">
                        <tr><th class="analysis-table-header">字段</th><th class="analysis-table-header">内容</th></tr>
                        ${tableRows}
                    </table>
                </div>
            `;
        } catch (e) {
            console.error('JSON解析失败:', e);
            // 如果不是JSON格式，显示原始内容
            displayContent = `
                <div class="analysis-content">
                    <div class="analysis-warning-box">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: middle; margin-right: 4px; color: #856404;"><path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg> 解读结果未能解析为结构化格式，显示原始内容：
                    </div>
                    <div class="analysis-raw-content">
                        ${analysisResult.analysis_content}
                    </div>
                </div>
            `;
        }
        
        htmlContent += `
            <div class="analysis-section-container">
                <div class="analysis-section-header">
                    <div>
                        <strong class="analysis-section-title"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: middle; margin-right: 4px;"><path d="M7 2.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0 4a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0 4a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2.5-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/></svg> 批量解读结果:</strong>
                        <span id="modal-analysis-status-${result.patent_number}" class="analysis-status completed">已完成</span>
                    </div>
                </div>
                <div id="modal-analysis-result-${result.patent_number}" data-analysis-section="${result.patent_number}">
                    <div class="ai-disclaimer compact">
                        <div class="ai-disclaimer-icon">AI</div>
                        <div class="ai-disclaimer-text"><strong>AI生成：</strong>以下解读由AI生成，仅供参考</div>
                    </div>
                    ${displayContent}
                </div>
            </div>
        `;
    } else if (isAnalyzing) {
        // 正在解读中，显示加载状态
        htmlContent += `
            <div class="analysis-section-container">
                <div class="analysis-section-header">
                    <div>
                        <strong class="analysis-section-title"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: middle; margin-right: 4px;"><path d="M7 2.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0 4a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0 4a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2.5-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/></svg> 批量解读结果:</strong>
                        <span id="modal-analysis-status-${result.patent_number}" class="analysis-status pending">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16" style="animation: spin 1s linear infinite; vertical-align: middle;">
                                <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                            </svg>
                            解读中...
                        </span>
                    </div>
                </div>
                <div id="modal-analysis-result-${result.patent_number}" data-analysis-section="${result.patent_number}" style="display: none;">
                    <div class="ai-disclaimer compact">
                        <div class="ai-disclaimer-icon">AI</div>
                        <div class="ai-disclaimer-text"><strong>AI生成：</strong>以下解读由AI生成，仅供参考</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // 附图 - 显示多张缩略图，点击打开查看器
    if (data.drawings && data.drawings.length > 0 && shouldShowField('drawings', selectedFields)) {
        // 直接存储数据到全局变量（innerHTML中的script不会执行）
        if (!window.patentDrawingsData) window.patentDrawingsData = {};
        window.patentDrawingsData[result.patent_number] = data.drawings;
        
        // 生成多张缩略图HTML（最多显示6张，超过则显示"更多"提示）
        const maxVisibleDrawings = 6;
        const visibleDrawings = data.drawings.slice(0, maxVisibleDrawings);
        const hasMoreDrawings = data.drawings.length > maxVisibleDrawings;
        
        let drawingsThumbnailsHTML = '';
        visibleDrawings.forEach((drawing, index) => {
            drawingsThumbnailsHTML += `
                <div class="detail-drawing-thumbnail" onclick="openImageViewer(${index}, '${result.patent_number}')">
                    <img src="${drawing}" alt="附图 ${index + 1}" class="detail-drawing-thumbnail-img" onerror="this.style.display='none'">
                    <div class="detail-drawing-thumbnail-caption">${index + 1}</div>
                </div>
            `;
        });
        
        // 如果超过6张，显示"更多"提示
        if (hasMoreDrawings) {
            const remainingCount = data.drawings.length - maxVisibleDrawings;
            drawingsThumbnailsHTML += `
                <div class="detail-drawing-thumbnail detail-drawing-more" onclick="openImageViewer(${maxVisibleDrawings}, '${result.patent_number}')">
                    <div class="detail-drawing-more-content">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5ZM3 8.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5Zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5Z"/>
                        </svg>
                        <span>+${remainingCount}</span>
                    </div>
                </div>
            `;
        }
        
        htmlContent += `
            <div class="detail-section detail-section-drawings">
                <div class="detail-section-header">
                    <strong class="detail-section-title"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: middle; margin-right: 4px;"><path d="M.002 3a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-12a2 2 0 0 1-2-2V3zm1 9v1a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12zm5-6.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0z"/></svg> 附图 (${data.drawings.length}张)</strong>
                    <div class="detail-section-actions">
                        <button class="copy-field-btn" onclick="sendToDrawingMarker('${result.patent_number}', event)" title="将附图和说明书传递到功能八进行OCR智能标记" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%) !important;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/><path d="M6.5 8a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1H7a.5.5 0 0 1-.5-.5z"/><path d="M8 6.5a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0V7a.5.5 0 0 1 .5-.5z"/></svg>
                            智能标记
                        </button>
                        <button class="copy-field-btn" onclick="copyFieldContent('${result.patent_number}', 'drawings', event)" title="复制附图链接">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a2 2 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>
                        </button>
                    </div>
                </div>
                <div class="detail-drawings-grid">
                    ${drawingsThumbnailsHTML}
                </div>
            </div>
        `;
    }
    
    // 权利要求
    if (data.claims && data.claims.length > 0 && shouldShowField('claims', selectedFields)) {
        htmlContent += `
            <div class="detail-section detail-section-claims">
                <div class="detail-section-header">
                    <strong class="detail-section-title"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: middle; margin-right: 4px;"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg> 权利要求 (共${data.claims.length}条):</strong>
                    <div class="detail-section-actions">
                        <button class="copy-field-btn" data-translate-patent="${result.patent_number}" data-translate-type="claims" onclick="showTranslateModal('${result.patent_number}', 'claims', event)" title="对照翻译" style="background: linear-gradient(135deg, #00bcd4 0%, #009688 100%) !important;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4.545 6.714 4.11 8H3l1.862-5h1.284L8 8H6.833l-.435-1.286H4.545zm1.634-.736L5.5 3.956h-.049l-.679 2.022H6.18z"/><path d="M0 2a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v3h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-3H2a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H2z"/></svg>
                            🌐 翻译
                        </button>
                        <button class="copy-field-btn" onclick="copyFieldContent('${result.patent_number}', 'claims', event)" title="复制所有权利要求">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>
                        </button>
                    </div>
                </div>
                <div id="claims_${result.patent_number}" class="claims-container">
        `;
        
        data.claims.forEach((claim, index) => {
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
            
            htmlContent += `
                <div class="${claimClass}" id="claim_${result.patent_number}_${index}">
                    <strong>权利要求 ${index + 1}${claimType === 'independent' ? ' <span style="color: #2e7d32;">(独立权利要求)</span>' : claimType === 'dependent' ? ' <span style="color: #1976d2;">(从属权利要求)</span>' : ''}:</strong><br/>
                    ${claimText}
                </div>
            `;
        });
        
        htmlContent += `</div></div>`;
    }
    
    // 说明书
    if (data.description && shouldShowField('description', selectedFields)) {
        htmlContent += `
            <div class="detail-section detail-section-description">
                <div class="detail-section-header">
                    <strong class="detail-section-title"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: middle; margin-right: 4px;"><path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/><path d="M6 5.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1H6.5a.5.5 0 0 1-.5-.5zM6 8a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1H6.5A.5.5 0 0 1 6 8zm0 2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1H6.5a.5.5 0 0 1-.5-.5z"/></svg> 说明书:</strong>
                    <div class="detail-section-actions">
                        <button class="copy-field-btn" data-translate-patent="${result.patent_number}" data-translate-type="description" onclick="showTranslateModal('${result.patent_number}', 'description', event)" title="对照翻译" style="background: linear-gradient(135deg, #00bcd4 0%, #009688 100%) !important;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4.545 6.714 4.11 8H3l1.862-5h1.284L8 8H6.833l-.435-1.286H4.545zm1.634-.736L5.5 3.956h-.049l-.679 2.022H6.18z"/><path d="M0 2a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v3h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-3H2a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H2z"/></svg>
                            🌐 翻译
                        </button>
                        <button class="copy-field-btn" onclick="copyFieldContent('${result.patent_number}', 'description', event)" title="复制说明书">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>
                        </button>
                    </div>
                </div>
                <div id="description_${result.patent_number}" class="detail-description-content">
                    ${data.description.replace(/(\[[A-Z\s]+\])/g, '<br/><br/><strong style="font-size: 1.1em; color: var(--primary-color);">$1</strong><br/><br/>').replace(/\n/g, '<br/>')}
                </div>
            </div>
        `;
    }
    
    // CPC分类信息
    if (data.classifications && data.classifications.length > 0 && shouldShowField('classifications', selectedFields)) {
        htmlContent += `
            <div class="detail-section detail-section-cpc">
                <div class="detail-section-header">
                    <strong class="detail-section-title"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: middle; margin-right: 4px;"><path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/></svg> CPC分类 (共${data.classifications.length}条):</strong>
                </div>
                <div class="cpc-grid">
        `;
        
        data.classifications.forEach(cls => {
            htmlContent += `
                <div class="cpc-item">
                    <div class="cpc-code">${cls.leaf_code || cls.code}</div>
                    <div class="cpc-description">${cls.leaf_description || cls.description}</div>
                </div>
            `;
        });
        
        htmlContent += `
                </div>
            </div>
        `;
    }
    
    // 技术领域
    if (data.landscapes && data.landscapes.length > 0 && shouldShowField('landscapes', selectedFields)) {
        htmlContent += `
            <div class="detail-section detail-section-landscapes">
                <div class="detail-section-header">
                    <strong class="detail-section-title"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: middle; margin-right: 4px;"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4a9.267 9.267 0 0 1 .64-1.539 6.7 6.7 0 0 1 .597-.933A7.025 7.025 0 0 0 2.255 4H4.09zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.958 6.958 0 0 0-.656 2.5h2.49zM4.847 5a12.34 12.34 0 0 0-.338 2.5H7.5V5H4.847zM8.5 5v2.5h2.99a12.342 12.342 0 0 0-.337-2.5H8.5zM4.51 8.5a12.342 12.342 0 0 0 .337 2.5H7.5V8.5H4.51zm3.99 2.5V8.5h2.653c.187.765.306 1.608.338 2.5H8.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12H5.145zm.182 2.472a6.696 6.696 0 0 1-.597-.933A9.268 9.268 0 0 1 4.09 12H2.255a7.024 7.024 0 0 0 3.072 2.472zM3.82 11a13.652 13.652 0 0 1-.312-2.5h-2.49A6.953 6.953 0 0 0 1.674 11H3.82zm10.163-3.5a9.268 9.268 0 0 0-.64-1.539 6.696 6.696 0 0 0-.597-.933A7.024 7.024 0 0 1 15.326 8H13.98zm.582 3.5a6.953 6.953 0 0 0 .656-2.5h-2.49a13.652 13.652 0 0 1-.312 2.5h2.146zm-1.837 3.472A7.024 7.024 0 0 0 15.326 12h-1.836a9.268 9.268 0 0 1-.64 1.539 6.696 6.696 0 0 1-.597.933zM8.5 12v2.923c.67-.204 1.335-.82 1.887-1.855.173-.324.33-.682.468-1.068H8.5zm3.68-1a12.342 12.342 0 0 0 .337-2.5H8.5V11h3.68zm-2.793 3.472A7.025 7.025 0 0 1 8.5 14.923V12h2.653c.187.765.306 1.608.338 2.5h-2.11z"/></svg> 技术领域:</strong>
                </div>
                <div class="detail-landscapes-container">
        `;
        
        data.landscapes.forEach(landscape => {
            htmlContent += `
                <span class="landscape-tag">${landscape.name}</span>
            `;
        });
        
        htmlContent += `
                </div>
            </div>
        `;
    }
    
    // 优先权日期
    if (data.priority_date) {
        htmlContent += `
            <div class="detail-section detail-section-priority">
                <p class="detail-priority-text">
                    <strong class="detail-section-title"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: middle; margin-right: 4px;"><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/></svg> 优先权日期:</strong> ${data.priority_date}
                </p>
            </div>
        `;
    }
    
    // 同族信息
    const showFamilyInfo = shouldShowField('family_id', selectedFields) || shouldShowField('family_applications', selectedFields);
    if (showFamilyInfo && (data.family_id || (data.family_applications && data.family_applications.length > 0))) {
        htmlContent += `
            <div class="detail-section detail-section-family">
                <div class="detail-section-header">
                    <strong class="detail-section-title"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: middle; margin-right: 4px;"><path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7Zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5.784 6A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216ZM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/></svg> 同族信息:</strong>
                    <div class="detail-section-actions">
                        ${data.family_applications && data.family_applications.length > 1 ? `
                        <button class="copy-field-btn" onclick="jumpToFamilyComparisonFromModal('${result.patent_number}')" title="跳转到功能四进行同族权利要求对比分析" style="background: linear-gradient(135deg, #9c27b0 0%, #673ab7 100%) !important;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M9.5 1.5a.5.5 0 0 1 0 1H5.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L5.707 1.5H9.5z"/><path d="M6.5 14.5a.5.5 0 0 1 0-1h3.793l-2.147-2.146a.5.5 0 0 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L10.293 14.5H6.5z"/></svg>
                            同族对比
                        </button>
                        ` : ''}
                        ${data.family_applications && data.family_applications.length > 0 ? `
                        <button class="copy-field-btn" onclick="analyzeRelationFromModal('${result.patent_number}', 'family')" title="分析同族专利" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></svg>
                            分析同族
                        </button>
                        ` : ''}
                    </div>
                </div>
        `;

        if (data.family_id && shouldShowField('family_id', selectedFields)) {
            htmlContent += `<p class="detail-family-id"><strong>同族ID:</strong> ${data.family_id}</p>`;
        }

        if (data.family_applications && data.family_applications.length > 0 && shouldShowField('family_applications', selectedFields)) {
            htmlContent += `
                <div class="detail-family-applications">
                    <div class="detail-family-header">
                        <strong>同族申请 (共${data.family_applications.length}条):</strong>
                        <button class="copy-field-btn" onclick="copyFamilyPublicationNumbers('${result.patent_number}', event)" title="复制所有公开号">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>
                        </button>
                    </div>
                    <div class="detail-table-container">
                        <table id="modal-family-table-${result.patent_number}" class="detail-table">
                            <thead>
                                <tr class="detail-table-header-row">
                                    <th class="detail-table-header">申请号</th>
                                    <th class="detail-table-header">状态</th>
                                    <th class="detail-table-header">公开号</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            data.family_applications.forEach(app => {
                htmlContent += `
                    <tr>
                        <td class="detail-table-cell">${app.application_number}</td>
                        <td class="detail-table-cell">${app.status || '-'}</td>
                        <td class="detail-table-cell">${app.publication_number || '-'}</td>
                    </tr>
                `;
            });
            
            htmlContent += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
        
        htmlContent += `</div>`;
    }
    
    // 外部链接
    if (data.external_links && Object.keys(data.external_links).length > 0 && shouldShowField('external_links', selectedFields)) {
        htmlContent += `
            <div class="detail-section detail-section-links">
                <div class="detail-section-header">
                    <strong class="detail-section-title"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: middle; margin-right: 4px;"><path d="M6.354 5.5H4a3 3 0 0 0 0 6h3a3 3 0 0 0 2.83-4H9c-.086 0-.17.01-.25.031A2 2 0 0 1 7 10.5H4a2 2 0 1 1 0-4h1.535c.218-.376.495-.714.82-1H4a3 3 0 1 0 0 6h3a3 3 0 0 0 2.83-4H9c-.086 0-.17.01-.25.031A2 2 0 0 1 7 10.5H4a2 2 0 1 1 0-4h1.535c.218-.376.495-.714.82-1H4z"/><path d="M9 5.5a3 3 0 0 0-2.83 4h1.098A2 2 0 0 1 9 6.5h3a2 2 0 1 1 0 4h-1.535a4.02 4.02 0 0 1-.82 1H12a3 3 0 1 0 0-6H9z"/></svg> 外部链接:</strong>
                </div>
                <div class="detail-links-container">
        `;
        
        Object.entries(data.external_links).forEach(([id, link]) => {
            htmlContent += `
                <a href="${link.url}" target="_blank" class="detail-link-item">
                    ${link.text}
                </a>
            `;
        });
        
        htmlContent += `
                </div>
            </div>
        `;
    }
    
    // 引用专利
    if (data.patent_citations && data.patent_citations.length > 0 && shouldShowField('patent_citations', selectedFields)) {
        htmlContent += `
            <div class="detail-section detail-section-citations">
                <div class="detail-section-header">
                    <strong class="detail-section-title"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: middle; margin-right: 4px;"><path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z"/></svg> 引用专利 (共${data.patent_citations.length}条):</strong>
                    <div class="detail-section-actions">
                        <button class="copy-field-btn" onclick="analyzeRelationFromModal('${result.patent_number}', 'citations')" title="分析引用专利" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></svg>
                            分析引用
                        </button>
                        <button class="copy-field-btn" onclick="copyFieldContent('${result.patent_number}', 'patent_citations', event)" title="复制引用专利">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>
                        </button>
                    </div>
                </div>
                <div class="detail-table-container">
                    <table class="detail-table">
                        <thead>
                            <tr class="detail-table-header-row detail-table-header-citations">
                                <th class="detail-table-header">专利号</th>
                                <th class="detail-table-header">标题</th>
                                <th class="detail-table-header detail-table-header-center">审查员引用</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        data.patent_citations.forEach(citation => {
            const examinerMark = citation.examiner_cited ? '<span class="examiner-mark">✓</span>' : '-';
            htmlContent += `
                <tr>
                    <td class="detail-table-cell">${citation.patent_number}${citation.examiner_cited ? ' <span class="examiner-mark">*</span>' : ''}</td>
                    <td class="detail-table-cell">${citation.title || '-'}</td>
                    <td class="detail-table-cell detail-table-cell-center">${examinerMark}</td>
                </tr>
            `;
        });
        
        htmlContent += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    // 被引用专利
    if (data.cited_by && data.cited_by.length > 0 && shouldShowField('cited_by', selectedFields)) {
        htmlContent += `
            <div class="detail-section detail-section-citedby">
                <div class="detail-section-header">
                    <strong class="detail-section-title"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: middle; margin-right: 4px;"><path d="M6.354 5.5H4a3 3 0 0 0 0 6h3a3 3 0 0 0 2.83-4H9c-.086 0-.17.01-.25.031A2 2 0 0 1 7 10.5H4a2 2 0 1 1 0-4h1.535c.218-.376.495-.714.82-1H4a3 3 0 1 0 0 6h3a3 3 0 0 0 2.83-4H9c-.086 0-.17.01-.25.031A2 2 0 0 1 7 10.5H4a2 2 0 1 1 0-4h1.535c.218-.376.495-.714.82-1H4z"/><path d="M9 5.5a3 3 0 0 0-2.83 4h1.098A2 2 0 0 1 9 6.5h3a2 2 0 1 1 0 4h-1.535a4.02 4.02 0 0 1-.82 1H12a3 3 0 1 0 0-6H9z"/></svg> 被引用专利 (共${data.cited_by.length}条):</strong>
                    <div class="detail-section-actions">
                        <button class="copy-field-btn" onclick="analyzeRelationFromModal('${result.patent_number}', 'cited_by')" title="分析被引用专利" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></svg>
                            分析被引用
                        </button>
                        <button class="copy-field-btn" onclick="copyFieldContent('${result.patent_number}', 'cited_by', event)" title="复制被引用专利">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>
                        </button>
                    </div>
                </div>
                <div class="detail-table-container">
                    <table class="detail-table">
                        <thead>
                            <tr class="detail-table-header-row detail-table-header-citedby">
                                <th class="detail-table-header">专利号</th>
                                <th class="detail-table-header">标题</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        data.cited_by.forEach(citation => {
            htmlContent += `
                <tr>
                    <td class="detail-table-cell">${citation.patent_number}</td>
                    <td class="detail-table-cell">${citation.title || '-'}</td>
                </tr>
            `;
        });
        
        htmlContent += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    // 事件时间轴（Events Timeline）- 按时间倒序显示，最新的在最前面
    if (data.events_timeline && data.events_timeline.length > 0 && shouldShowField('events_timeline', selectedFields)) {
        // 复制并倒序排列事件
        const sortedEvents = [...data.events_timeline].reverse();
        
        htmlContent += `
            <div class="detail-section detail-section-timeline">
                <div class="detail-section-header">
                    <strong class="detail-section-title"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: middle; margin-right: 4px;"><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/></svg> 事件时间轴 (共${sortedEvents.length}条):</strong>
                    <button class="copy-field-btn" onclick="copyFieldContent('${result.patent_number}', 'events_timeline', event)" title="复制事件时间轴">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>
                    </button>
                </div>
                <div class="patent-timeline-container">
                    <div class="patent-timeline">
        `;

        sortedEvents.forEach((event, index) => {
            const isCritical = event.is_critical ? 'critical' : '';

            htmlContent += `
                <div class="timeline-event ${isCritical}">
                    <div class="timeline-event-node"></div>
                    <div class="timeline-event-connector"></div>
                    <div class="timeline-event-content">
                        <div class="timeline-event-date">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
                            </svg>
                            ${event.date}
                        </div>
                        <div class="timeline-event-title">${event.title || event.description}</div>
                        ${event.type ? `<div class="timeline-event-description">${event.type}</div>` : ''}
                    </div>
                </div>
            `;
        });

        htmlContent += `
                    </div>
                </div>
            </div>
        `;
    }
    
    // 法律事件（Legal Events）- 表格样式，按时间倒序显示，最新的在最前面
    if (data.legal_events && data.legal_events.length > 0 && shouldShowField('legal_events', selectedFields)) {
        // 复制并倒序排列法律事件
        const sortedLegalEvents = [...data.legal_events].reverse();

        htmlContent += `
            <div class="detail-section detail-section-legal">
                <div class="detail-section-header">
                    <strong class="detail-section-title"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: middle; margin-right: 4px;"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg> 法律事件 (共${sortedLegalEvents.length}条):</strong>
                    <button class="copy-field-btn" onclick="copyFieldContent('${result.patent_number}', 'legal_events', event)" title="复制法律事件">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>
                    </button>
                </div>
                <div class="detail-table-container">
                    <table class="detail-table">
                        <thead>
                            <tr class="detail-table-header-row detail-table-header-legal">
                                <th class="detail-table-header">日期</th>
                                <th class="detail-table-header">代码</th>
                                <th class="detail-table-header">描述</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        sortedLegalEvents.forEach(event => {
            htmlContent += `
                <tr>
                    <td class="detail-table-cell">${event.date}</td>
                    <td class="detail-table-cell">${event.code || '-'}</td>
                    <td class="detail-table-cell">${event.description || event.title || '-'}</td>
                </tr>
            `;
        });

        htmlContent += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    // 相似文档
    if (data.similar_documents && data.similar_documents.length > 0 && shouldShowField('similar_documents', selectedFields)) {
        htmlContent += `
            <div class="detail-section detail-section-similar">
                <div class="detail-section-header">
                    <strong class="detail-section-title"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: middle; margin-right: 4px;"><path d="M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h13zm0-1h-13A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2z"/><path d="M3 5.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zM3 8a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 8zm0 2.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5z"/></svg> 相似文档 (共${data.similar_documents.length}条):</strong>
                    <div class="detail-section-actions">
                        <button class="copy-field-btn" onclick="analyzeRelationFromModal('${result.patent_number}', 'similar')" title="分析相似专利" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></svg>
                            分析相似
                        </button>
                        <button class="copy-field-btn" onclick="copySimilarDocumentNumbers('${result.patent_number}', event)" title="复制所有专利号">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>
                        </button>
                    </div>
                </div>
                <div class="detail-table-container">
                    <table class="detail-table">
                        <thead>
                            <tr class="detail-table-header-row detail-table-header-similar">
                                <th class="detail-table-header">专利号</th>
                                <th class="detail-table-header">语言</th>
                                <th class="detail-table-header">操作</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        data.similar_documents.forEach(doc => {
            htmlContent += `
                <tr>
                    <td class="detail-table-cell">${doc.patent_number}</td>
                    <td class="detail-table-cell">${doc.language || '-'}</td>
                    <td class="detail-table-cell">
                        <a href="${doc.link}" target="_blank" class="detail-table-link">查看</a>
                    </td>
                </tr>
            `;
        });
        
        htmlContent += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    htmlContent += `</div>`;

    return htmlContent;
}

/**
 * 实时更新弹窗中的解读结果
 * @param {string} patentNumber - 专利号
 * @param {string} analysisContent - 解读内容
 * @param {boolean} parseSuccess - 是否成功解析
 * @param {Object} template - 使用的模板
 */
function updatePatentDetailAnalysis(patentNumber, analysisContent, parseSuccess, template) {
    const modalAnalysisResult = document.getElementById(`modal-analysis-result-${patentNumber}`);
    const modalBody = document.getElementById('patent_detail_body');
    
    if (!modalAnalysisResult && modalBody) {
        const existingAnalysisSection = modalBody.querySelector(`[data-analysis-section="${patentNumber}"]`);
        if (existingAnalysisSection) {
            updateAnalysisSection(existingAnalysisSection, analysisContent, parseSuccess, template, patentNumber);
            return;
        }
        
        const newSection = createAnalysisSection(patentNumber, analysisContent, parseSuccess, template);
        const firstContent = modalBody.querySelector('div');
        if (firstContent) {
            firstContent.insertAdjacentHTML('beforeend', newSection);
        } else {
            modalBody.insertAdjacentHTML('beforeend', newSection);
        }
        return;
    }
    
    if (modalAnalysisResult) {
        updateAnalysisSection(modalAnalysisResult, analysisContent, parseSuccess, template, patentNumber);
    }
}

/**
 * 更新解读区域内容
 */
function updateAnalysisSection(element, analysisContent, parseSuccess, template, patentNumber) {
    let displayContent = '';
    
    if (parseSuccess) {
        try {
            let cleanContent = analysisContent.trim();
            if (cleanContent.startsWith('```json')) {
                cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleanContent.startsWith('```')) {
                cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            
            const analysisJson = JSON.parse(cleanContent);
            
            let tableRows = '';
            Object.keys(analysisJson).forEach(key => {
                const value = analysisJson[key];
                const displayValue = typeof value === 'string' ? value.replace(/\n/g, '<br>') : value;
                tableRows += `<tr><td class="analysis-table-field">${key}</td><td class="analysis-table-value">${displayValue}</td></tr>`;
            });
            
            displayContent = `
                <div class="analysis-content">
                    <table class="analysis-table">
                        <tr><th class="analysis-table-header">字段</th><th class="analysis-table-header">内容</th></tr>
                        ${tableRows}
                    </table>
                </div>
            `;
        } catch (e) {
            displayContent = `
                <div class="analysis-content">
                    <div class="analysis-raw-content">
                        ${analysisContent}
                    </div>
                </div>
            `;
        }
    } else {
        displayContent = `
            <div class="analysis-content">
                <div class="analysis-raw-content">
                    ${analysisContent}
                </div>
            </div>
        `;
    }
    
    element.innerHTML = `
        <div class="ai-disclaimer compact">
            <div class="ai-disclaimer-icon">AI</div>
            <div class="ai-disclaimer-text"><strong>AI生成：</strong>以下解读由AI生成，仅供参考</div>
        </div>
        ${displayContent}
    `;
    element.style.display = 'block';
    
    const modalAnalysisStatus = document.getElementById(`modal-analysis-status-${patentNumber}`);
    if (modalAnalysisStatus) {
        modalAnalysisStatus.textContent = '已完成';
        modalAnalysisStatus.className = 'analysis-status completed';
    }
}

/**
 * 创建新的解读区域
 */
function createAnalysisSection(patentNumber, analysisContent, parseSuccess, template) {
    let displayContent = '';
    
    if (parseSuccess) {
        try {
            let cleanContent = analysisContent.trim();
            if (cleanContent.startsWith('```json')) {
                cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleanContent.startsWith('```')) {
                cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            
            const analysisJson = JSON.parse(cleanContent);
            
            let tableRows = '';
            Object.keys(analysisJson).forEach(key => {
                const value = analysisJson[key];
                const displayValue = typeof value === 'string' ? value.replace(/\n/g, '<br>') : value;
                tableRows += `<tr><td class="analysis-table-field">${key}</td><td class="analysis-table-value">${displayValue}</td></tr>`;
            });
            
            displayContent = `
                <div class="analysis-content">
                    <table class="analysis-table">
                        <tr><th class="analysis-table-header">字段</th><th class="analysis-table-header">内容</th></tr>
                        ${tableRows}
                    </table>
                </div>
            `;
        } catch (e) {
            displayContent = `
                <div class="analysis-content">
                    <div class="analysis-raw-content">
                        ${analysisContent}
                    </div>
                </div>
            `;
        }
    }
    
    return `
        <div class="analysis-section-container" data-analysis-section="${patentNumber}">
            <div class="analysis-section-header">
                <div>
                    <strong class="analysis-section-title"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: middle; margin-right: 4px;"><path d="M7 2.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0 4a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0 4a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2.5-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/></svg> 批量解读结果:</strong>
                    <span id="modal-analysis-status-${patentNumber}" class="analysis-status completed">已完成</span>
                </div>
            </div>
            <div id="modal-analysis-result-${patentNumber}">
                <div class="ai-disclaimer compact">
                    <div class="ai-disclaimer-icon">AI</div>
                    <div class="ai-disclaimer-text"><strong>AI生成：</strong>以下解读由AI生成，仅供参考</div>
                </div>
                ${displayContent}
            </div>
        </div>
    `;
}

// 导出到全局作用域
window.FIELD_MAPPING = FIELD_MAPPING;
window.shouldShowField = shouldShowField;
window.buildPatentDetailHTML = buildPatentDetailHTML;
window.updatePatentDetailAnalysis = updatePatentDetailAnalysis;

console.log('✅ patent-detail-html.js 加载完成');
