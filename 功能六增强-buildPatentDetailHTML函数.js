// ====================================================================
// 构建专利详情HTML - 包含所有新增字段的展示
// ====================================================================

function buildPatentDetailHTML(result) {
    const data = result.data;
    
    let html = '';
    
    // 导航按钮
    html += `
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <button onclick="navigatePatent('prev', '${result.patent_number}')" class="small-button">
                ← 上一个
            </button>
            <button onclick="openPatentInNewTab('${data.url || `https://patents.google.com/patent/${result.patent_number}`}')" class="small-button">
                在Google Patents中打开
            </button>
            <button onclick="navigatePatent('next', '${result.patent_number}')" class="small-button">
                下一个 →
            </button>
        </div>
    `;
    
    // 基本信息
    html += `
        <div class="patent-detail-section">
            <h5>📋 基本信息</h5>
            <div class="patent-field-row">
                <span class="field-label">专利号：</span>
                <span class="field-value">${result.patent_number}</span>
                <button class="copy-field-btn" onclick="copyFieldValue('${result.patent_number}', event)" title="复制">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                        <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                    </svg>
                </button>
            </div>
            <div class="patent-field-row">
                <span class="field-label">标题：</span>
                <span class="field-value">${data.title || '-'}</span>
                ${data.title ? `<button class="copy-field-btn" onclick="copyFieldValue(\`${data.title.replace(/`/g, '\\`')}\`, event)" title="复制"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg></button>` : ''}
            </div>
            <div class="patent-field-row">
                <span class="field-label">摘要：</span>
                <span class="field-value">${data.abstract || '-'}</span>
                ${data.abstract ? `<button class="copy-field-btn" onclick="copyFieldValue(\`${data.abstract.replace(/`/g, '\\`')}\`, event)" title="复制"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg></button>` : ''}
            </div>
            <div class="patent-field-row">
                <span class="field-label">发明人：</span>
                <span class="field-value">${data.inventors && data.inventors.length > 0 ? data.inventors.join(', ') : '-'}</span>
                ${data.inventors && data.inventors.length > 0 ? `<button class="copy-field-btn" onclick="copyFieldValue('${data.inventors.join(', ')}', event)" title="复制"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg></button>` : ''}
            </div>
            <div class="patent-field-row">
                <span class="field-label">申请人：</span>
                <span class="field-value">${data.assignees && data.assignees.length > 0 ? data.assignees.join(', ') : '-'}</span>
                ${data.assignees && data.assignees.length > 0 ? `<button class="copy-field-btn" onclick="copyFieldValue('${data.assignees.join(', ')}', event)" title="复制"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg></button>` : ''}
            </div>
            <div class="patent-field-row">
                <span class="field-label">申请日期：</span>
                <span class="field-value">${data.application_date || '-'}</span>
            </div>
            <div class="patent-field-row">
                <span class="field-label">公开日期：</span>
                <span class="field-value">${data.publication_date || '-'}</span>
            </div>
            ${data.priority_date ? `
            <div class="patent-field-row">
                <span class="field-label">优先权日期：</span>
                <span class="field-value">${data.priority_date}</span>
            </div>
            ` : ''}
        </div>
    `;
    
    // CPC分类信息（新增）
    if (data.classifications && data.classifications.length > 0) {
        html += `
            <div class="patent-detail-section">
                <h5>🏷️ CPC分类信息 (${data.classifications.length}个)</h5>
                <div class="classifications-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 10px;">
                    ${data.classifications.map(cls => `
                        <div class="classification-item" style="padding: 10px; background-color: #f0f8ff; border-left: 3px solid #4a6cf7; border-radius: 4px;">
                            <strong style="color: #4a6cf7;">${cls.code || ''}</strong>
                            ${cls.description ? `<div style="font-size: 0.9em; color: #666; margin-top: 5px;">${cls.description}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // 技术领域（新增）
    if (data.landscapes && data.landscapes.length > 0) {
        html += `
            <div class="patent-detail-section">
                <h5>🌐 技术领域 (${data.landscapes.length}个)</h5>
                <div class="landscapes-list" style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${data.landscapes.map(land => `
                        <div class="landscape-item" style="padding: 6px 12px; background-color: #e8f5e9; color: #2e7d32; border-radius: 16px; font-size: 0.9em;">
                            ${land.name || land}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // 同族信息（新增）
    if (data.family_id || (data.family_applications && data.family_applications.length > 0)) {
        html += `
            <div class="patent-detail-section">
                <h5>👨‍👩‍👧‍👦 同族信息</h5>
                ${data.family_id ? `
                <div class="patent-field-row">
                    <span class="field-label">同族ID：</span>
                    <span class="field-value">${data.family_id}</span>
                </div>
                ` : ''}
                ${data.family_applications && data.family_applications.length > 0 ? `
                    <div style="margin-top: 10px;">
                        <strong>同族申请 (${data.family_applications.length}个)：</strong>
                        <div class="family-applications-list" style="margin-top: 10px; max-height: 200px; overflow-y: auto;">
                            ${data.family_applications.map(app => `
                                <div class="family-app-item" style="padding: 8px; margin-bottom: 8px; background-color: #fff3e0; border-left: 3px solid #ff9800; border-radius: 4px;">
                                    <strong>${app.patent_number || ''}</strong> - ${app.country || ''} 
                                    ${app.status ? `<span style="color: #666;">(${app.status})</span>` : ''}
                                    ${app.date ? `<span style="color: #999; font-size: 0.9em;"> - ${app.date}</span>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // 法律事件时间轴（新增）
    if (data.legal_events && data.legal_events.length > 0) {
        html += `
            <div class="patent-detail-section">
                <h5>⏱️ 法律事件时间轴 (${data.legal_events.length}个事件)</h5>
                <div class="patent-timeline-container">
                    <div class="patent-timeline">
                        ${data.legal_events.map((event, index) => `
                            <div class="timeline-event ${event.is_critical ? 'critical' : ''}">
                                <div class="timeline-event-node"></div>
                                <div class="timeline-event-connector"></div>
                                <div class="timeline-event-content">
                                    <div class="timeline-event-date">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                            <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
                                        </svg>
                                        ${event.date || ''}
                                    </div>
                                    <div class="timeline-event-title">${event.title || ''}</div>
                                    ${event.code ? `<div class="timeline-event-code">${event.code}</div>` : ''}
                                    ${event.description ? `<div class="timeline-event-description">${event.description}</div>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    // 权利要求
    if (data.claims && data.claims.length > 0) {
        html += `
            <div class="patent-detail-section">
                <h5>⚖️ 权利要求 (共${data.claims.length}条)</h5>
                <div style="max-height: 400px; overflow-y: auto;">
                    ${data.claims.map((claim, index) => `
                        <div class="claim-item" style="margin-bottom: 10px; padding: 10px; background-color: #f9f9f9; border-left: 3px solid #4a6cf7; border-radius: 4px;">
                            <strong>权利要求 ${index + 1}:</strong> ${claim}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // 附图
    if (data.drawings && data.drawings.length > 0) {
        html += `
            <div class="patent-detail-section">
                <h5>🖼️ 附图 (共${data.drawings.length}张)</h5>
                <div class="drawings-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">
                    ${data.drawings.slice(0, 6).map((drawing, index) => `
                        <div style="position: relative;">
                            <img src="${drawing}" alt="附图 ${index + 1}" style="width: 100%; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;" onclick="window.open('${drawing}', '_blank')">
                            <div style="text-align: center; font-size: 0.9em; color: #666; margin-top: 5px;">图 ${index + 1}</div>
                        </div>
                    `).join('')}
                </div>
                ${data.drawings.length > 6 ? `<p style="margin-top: 10px; color: #666;">还有 ${data.drawings.length - 6} 张附图...</p>` : ''}
            </div>
        `;
    }
    
    // 引用专利
    if (data.patent_citations && data.patent_citations.length > 0) {
        html += `
            <div class="patent-detail-section">
                <h5>📚 引用专利 (${data.patent_citations.length}个)</h5>
                <div style="max-height: 300px; overflow-y: auto;">
                    ${data.patent_citations.slice(0, 10).map(citation => `
                        <div style="padding: 8px; margin-bottom: 8px; background-color: #f5f5f5; border-radius: 4px;">
                            <strong>${citation.patent_number || ''}</strong>
                            ${citation.title ? `<div style="font-size: 0.9em; color: #666;">${citation.title}</div>` : ''}
                            ${citation.assignee ? `<div style="font-size: 0.85em; color: #999;">${citation.assignee}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
                ${data.patent_citations.length > 10 ? `<p style="margin-top: 10px; color: #666;">还有 ${data.patent_citations.length - 10} 个引用专利...</p>` : ''}
            </div>
        `;
    }
    
    // 被引用专利
    if (data.cited_by && data.cited_by.length > 0) {
        html += `
            <div class="patent-detail-section">
                <h5>🔗 被引用专利 (${data.cited_by.length}个)</h5>
                <div style="max-height: 300px; overflow-y: auto;">
                    ${data.cited_by.slice(0, 10).map(citation => `
                        <div style="padding: 8px; margin-bottom: 8px; background-color: #f0f8ff; border-radius: 4px;">
                            <strong>${citation.patent_number || ''}</strong>
                            ${citation.title ? `<div style="font-size: 0.9em; color: #666;">${citation.title}</div>` : ''}
                            ${citation.assignee ? `<div style="font-size: 0.85em; color: #999;">${citation.assignee}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
                ${data.cited_by.length > 10 ? `<p style="margin-top: 10px; color: #666;">还有 ${data.cited_by.length - 10} 个被引用专利...</p>` : ''}
            </div>
        `;
    }
    
    // 外部链接（新增）
    if (data.external_links && Object.keys(data.external_links).length > 0) {
        html += `
            <div class="patent-detail-section">
                <h5>🔗 外部链接</h5>
                <div class="external-links-list" style="display: flex; flex-wrap: wrap; gap: 10px;">
                    ${Object.entries(data.external_links).map(([name, url]) => `
                        <a href="${url}" target="_blank" class="external-link-item" style="padding: 8px 16px; background-color: #4a6cf7; color: white; text-decoration: none; border-radius: 4px; font-size: 0.9em; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#3a5ce7'" onmouseout="this.style.backgroundColor='#4a6cf7'">
                            ${name}
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // 说明书（如果有）
    if (data.description) {
        html += `
            <div class="patent-detail-section">
                <h5>📄 说明书</h5>
                <div style="max-height: 300px; overflow-y: auto; padding: 10px; background-color: #f9f9f9; border-radius: 4px; white-space: pre-wrap; font-size: 0.9em;">
                    ${data.description.substring(0, 2000)}${data.description.length > 2000 ? '...' : ''}
                </div>
            </div>
        `;
    }
    
    return html;
}

// 复制字段值的辅助函数
window.copyFieldValue = function(value, event) {
    if (event) {
        event.stopPropagation();
    }
    
    navigator.clipboard.writeText(value).then(() => {
        // 显示复制成功提示
        const btn = event.target.closest('button');
        if (btn) {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>';
            setTimeout(() => {
                btn.innerHTML = originalHTML;
            }, 1500);
        }
    }).catch(err => {
        console.error('复制失败:', err);
        alert('复制失败');
    });
};
