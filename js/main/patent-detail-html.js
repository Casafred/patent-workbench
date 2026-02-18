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
        { label: '📄 摘要', value: data.abstract, type: 'text', key: 'abstract' },
        { label: '👤 发明人', value: data.inventors && data.inventors.length > 0 ? data.inventors.join(', ') : null, type: 'text', key: 'inventors' },
        { label: '🏢 申请人', value: data.assignees && data.assignees.length > 0 ? data.assignees.join(', ') : null, type: 'text', key: 'assignees' },
        { label: '📅 申请日期', value: data.application_date, type: 'text', key: 'application_date' },
        { label: '📅 公开日期', value: data.publication_date, type: 'text', key: 'publication_date' },
        { label: '🔗 专利链接', value: result.url, type: 'url', key: 'url' }
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
    const analysisResult = window.patentBatchAnalysisResults.find(item => item.patent_number === result.patent_number);
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
                tableRows += `<tr><td style="border: 1px solid #ddd; padding: 8px;">${key}</td><td style="border: 1px solid #ddd; padding: 8px;">${displayValue}</td></tr>`;
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
                        ${analysisResult.analysis_content}
                    </div>
                </div>
            `;
        }
        
        htmlContent += `
            <div style="margin-top: 15px; padding: 10px; background-color: #e3f2fd; border-radius: 5px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div>
                        <strong style="color: var(--primary-color);">🤖 批量解读结果:</strong>
                        <span id="modal-analysis-status-${result.patent_number}" style="margin-left: 10px; font-size: 12px; color: #666;">已完成</span>
                    </div>
                </div>
                <div id="modal-analysis-result-${result.patent_number}">
                    <div class="ai-disclaimer compact">
                        <div class="ai-disclaimer-icon">AI</div>
                        <div class="ai-disclaimer-text"><strong>AI生成：</strong>以下解读由AI生成，仅供参考</div>
                    </div>
                    ${displayContent}
                </div>
            </div>
        `;
    }
    
    // 权利要求
    if (data.claims && data.claims.length > 0 && shouldShowField('claims', selectedFields)) {
        htmlContent += `
            <div style="margin-top: 15px; padding: 10px; background-color: #f8f9fa; border-radius: 5px;">
                <div style="margin-bottom: 8px;">
                    <strong style="color: var(--primary-color);">⚖️ 权利要求 (共${data.claims.length}条):</strong>
                    <button class="copy-field-btn" onclick="copyFieldContent('${result.patent_number}', 'claims', event)" title="复制所有权利要求">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>
                    </button>
                </div>
                <div id="claims_${result.patent_number}" class="claims-container">
        `;
        
        data.claims.forEach((claim, index) => {
            // Support both string format (old) and object format (new with type)
            let claimText, claimType;
            if (typeof claim === 'string') {
                claimText = claim;
                // 检测权利要求类型：
                // 1. 如果包含 '[从属]' 标记，则为从属权利要求
                // 2. 如果包含 '其特征在于' 或 '根据权利要求' 等关键词，则为从属权利要求
                // 3. 否则为独立权利要求
                if (claim.includes('[从属]') || 
                    claim.includes('其特征在于') || 
                    claim.includes('根据权利要求') ||
                    claim.includes('如权利要求') ||
                    claim.match(/^\s*\d+\.[\s\S]*?权利要求\s*\d+/)) {
                    claimType = 'dependent';
                } else {
                    claimType = 'independent';
                }
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
            <div style="margin-top: 15px; padding: 10px; background-color: #f0f8ff; border-radius: 5px;">
                <div style="margin-bottom: 8px;">
                    <strong style="color: var(--primary-color);">📝 说明书:</strong>
                    <button class="copy-field-btn" onclick="copyFieldContent('${result.patent_number}', 'description', event)" title="复制说明书">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>
                    </button>
                </div>
                <div style="margin-top: 8px; font-size: 0.9em; line-height: 1.6; max-height: 300px; overflow-y: auto;">
                    ${data.description.replace(/(\[[A-Z\s]+\])/g, '<br/><br/><strong style="font-size: 1.1em; color: var(--primary-color);">$1</strong><br/><br/>').replace(/\n/g, '<br/>')}
                </div>
            </div>
        `;
    }
    
    // CPC分类信息
    if (data.classifications && data.classifications.length > 0 && shouldShowField('classifications', selectedFields)) {
        htmlContent += `
            <div style="margin-top: 15px; padding: 10px; background-color: #e3f2fd; border-radius: 5px;">
                <div style="margin-bottom: 8px;">
                    <strong style="color: var(--primary-color);">🏷️ CPC分类 (共${data.classifications.length}条):</strong>
                </div>
                <div class="cpc-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 10px;">
        `;
        
        data.classifications.forEach(cls => {
            htmlContent += `
                <div class="cpc-item" style="padding: 10px; background-color: white; border-radius: 4px; border-left: 3px solid var(--primary-color);">
                    <div style="font-weight: 600; color: var(--primary-color); margin-bottom: 4px;">${cls.leaf_code || cls.code}</div>
                    <div style="font-size: 0.85em; color: #666;">${cls.leaf_description || cls.description}</div>
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
            <div style="margin-top: 15px; padding: 10px; background-color: #f3e5f5; border-radius: 5px;">
                <div style="margin-bottom: 8px;">
                    <strong style="color: var(--primary-color);">🌐 技术领域:</strong>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        `;
        
        data.landscapes.forEach(landscape => {
            htmlContent += `
                <span style="padding: 6px 12px; background-color: white; border-radius: 20px; font-size: 0.9em; border: 1px solid #ddd;">
                    ${landscape.name}
                </span>
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
            <div style="margin-top: 15px; padding: 10px; background-color: #fff9c4; border-radius: 5px;">
                <p style="margin: 0;">
                    <strong style="color: var(--primary-color);">📅 优先权日期:</strong> ${data.priority_date}
                </p>
            </div>
        `;
    }
    
    // 同族信息
    const showFamilyInfo = shouldShowField('family_id', selectedFields) || shouldShowField('family_applications', selectedFields);
    if (showFamilyInfo && (data.family_id || (data.family_applications && data.family_applications.length > 0))) {
        htmlContent += `
            <div style="margin-top: 15px; padding: 10px; background-color: #fff3e0; border-radius: 5px;">
                <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <strong style="color: var(--primary-color);">👨‍👩‍👧‍👦 同族信息:</strong>
                    ${data.family_applications && data.family_applications.length > 0 ? `
                    <button class="copy-field-btn" onclick="analyzeRelationFromModal('${result.patent_number}', 'family')" title="分析同族专利" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></svg>
                        分析同族
                    </button>
                    ` : ''}
                </div>
        `;

        if (data.family_id && shouldShowField('family_id', selectedFields)) {
            htmlContent += `<p style="margin: 5px 0;"><strong>同族ID:</strong> ${data.family_id}</p>`;
        }

        if (data.family_applications && data.family_applications.length > 0 && shouldShowField('family_applications', selectedFields)) {
            htmlContent += `
                <div style="margin-top: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <strong>同族申请 (共${data.family_applications.length}条):</strong>
                        <button class="copy-field-btn" onclick="copyFamilyPublicationNumbers('${result.patent_number}', event)" title="复制所有公开号">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>
                        </button>
                    </div>
                    <div style="max-height: 200px; overflow-y: auto;">
                        <table id="modal-family-table-${result.patent_number}" style="width: 100%; font-size: 0.85em; border-collapse: collapse;">
                            <thead>
                                <tr style="background-color: #ffe0b2;">
                                    <th style="padding: 5px; text-align: left; border: 1px solid #ddd;">申请号</th>
                                    <th style="padding: 5px; text-align: left; border: 1px solid #ddd;">状态</th>
                                    <th style="padding: 5px; text-align: left; border: 1px solid #ddd;">公开号</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            data.family_applications.forEach(app => {
                htmlContent += `
                    <tr>
                        <td style="padding: 5px; border: 1px solid #ddd;">${app.application_number}</td>
                        <td style="padding: 5px; border: 1px solid #ddd;">${app.status || '-'}</td>
                        <td style="padding: 5px; border: 1px solid #ddd;">${app.publication_number || '-'}</td>
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
            <div style="margin-top: 15px; padding: 10px; background-color: #e8f5e9; border-radius: 5px;">
                <div style="margin-bottom: 8px;">
                    <strong style="color: var(--primary-color);">🔗 外部链接:</strong>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 10px;">
        `;
        
        Object.entries(data.external_links).forEach(([id, link]) => {
            htmlContent += `
                <a href="${link.url}" target="_blank" style="padding: 8px 16px; background-color: white; border-radius: 4px; border: 1px solid #ddd; text-decoration: none; color: var(--primary-color);">
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
            <div style="margin-top: 15px; padding: 10px; background-color: #e8f5e9; border-radius: 5px;">
                <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <strong style="color: var(--primary-color);">📚 引用专利 (共${data.patent_citations.length}条):</strong>
                    <div style="display: flex; gap: 6px;">
                        <button class="copy-field-btn" onclick="analyzeRelationFromModal('${result.patent_number}', 'citations')" title="分析引用专利" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></svg>
                            分析引用
                        </button>
                        <button class="copy-field-btn" onclick="copyFieldContent('${result.patent_number}', 'patent_citations', event)" title="复制引用专利">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>
                        </button>
                    </div>
                </div>
                <div style="max-height: 200px; overflow-y: auto;">
                    <table style="width: 100%; font-size: 0.85em; border-collapse: collapse;">
                        <thead>
                            <tr style="background-color: #c8e6c9;">
                                <th style="padding: 5px; text-align: left; border: 1px solid #ddd;">专利号</th>
                                <th style="padding: 5px; text-align: left; border: 1px solid #ddd;">标题</th>
                                <th style="padding: 5px; text-align: center; border: 1px solid #ddd; width: 80px;">审查员引用</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        data.patent_citations.forEach(citation => {
            const examinerMark = citation.examiner_cited ? '<span style="color: #d32f2f; font-weight: bold;">✓</span>' : '-';
            htmlContent += `
                <tr>
                    <td style="padding: 5px; border: 1px solid #ddd;">${citation.patent_number}${citation.examiner_cited ? ' <span style="color: #d32f2f; font-weight: bold;">*</span>' : ''}</td>
                    <td style="padding: 5px; border: 1px solid #ddd;">${citation.title || '-'}</td>
                    <td style="padding: 5px; border: 1px solid #ddd; text-align: center;">${examinerMark}</td>
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
            <div style="margin-top: 15px; padding: 10px; background-color: #fff3e0; border-radius: 5px;">
                <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <strong style="color: var(--primary-color);">🔗 被引用专利 (共${data.cited_by.length}条):</strong>
                    <div style="display: flex; gap: 6px;">
                        <button class="copy-field-btn" onclick="analyzeRelationFromModal('${result.patent_number}', 'cited_by')" title="分析被引用专利" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></svg>
                            分析被引用
                        </button>
                        <button class="copy-field-btn" onclick="copyFieldContent('${result.patent_number}', 'cited_by', event)" title="复制被引用专利">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>
                        </button>
                    </div>
                </div>
                <div style="max-height: 200px; overflow-y: auto;">
                    <table style="width: 100%; font-size: 0.85em; border-collapse: collapse;">
                        <thead>
                            <tr style="background-color: #ffe0b2;">
                                <th style="padding: 5px; text-align: left; border: 1px solid #ddd;">专利号</th>
                                <th style="padding: 5px; text-align: left; border: 1px solid #ddd;">标题</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        data.cited_by.forEach(citation => {
            htmlContent += `
                <tr>
                    <td style="padding: 5px; border: 1px solid #ddd;">${citation.patent_number}</td>
                    <td style="padding: 5px; border: 1px solid #ddd;">${citation.title || '-'}</td>
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
            <div style="margin-top: 15px;">
                <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                    <strong style="color: var(--primary-color);">📅 事件时间轴 (共${sortedEvents.length}条):</strong>
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
            <div style="margin-top: 15px; padding: 10px; background-color: #fff3e0; border-radius: 5px;">
                <div style="margin-bottom: 8px;">
                    <strong style="color: var(--primary-color);">⚖️ 法律事件 (共${sortedLegalEvents.length}条):</strong>
                    <button class="copy-field-btn" onclick="copyFieldContent('${result.patent_number}', 'legal_events', event)" title="复制法律事件">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>
                    </button>
                </div>
                <div style="max-height: 300px; overflow-y: auto;">
                    <table style="width: 100%; font-size: 0.85em; border-collapse: collapse;">
                        <thead>
                            <tr style="background-color: #ffe0b2;">
                                <th style="padding: 5px; text-align: left; border: 1px solid #ddd;">日期</th>
                                <th style="padding: 5px; text-align: left; border: 1px solid #ddd; width: 100px;">代码</th>
                                <th style="padding: 5px; text-align: left; border: 1px solid #ddd;">描述</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        sortedLegalEvents.forEach(event => {
            htmlContent += `
                <tr>
                    <td style="padding: 5px; border: 1px solid #ddd;">${event.date}</td>
                    <td style="padding: 5px; border: 1px solid #ddd;">${event.code || '-'}</td>
                    <td style="padding: 5px; border: 1px solid #ddd;">${event.description || event.title || '-'}</td>
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
            <div style="margin-top: 15px; padding: 10px; background-color: #e8f5e9; border-radius: 5px;">
                <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <strong style="color: var(--primary-color);">📋 相似文档 (共${data.similar_documents.length}条):</strong>
                    <div style="display: flex; gap: 6px;">
                        <button class="copy-field-btn" onclick="analyzeRelationFromModal('${result.patent_number}', 'similar')" title="分析相似专利" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></svg>
                            分析相似
                        </button>
                        <button class="copy-field-btn" onclick="copySimilarDocumentNumbers('${result.patent_number}', event)" title="复制所有专利号">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>
                        </button>
                    </div>
                </div>
                <div style="max-height: 200px; overflow-y: auto;">
                    <table style="width: 100%; font-size: 0.85em; border-collapse: collapse;">
                        <thead>
                            <tr style="background-color: #c8e6c9;">
                                <th style="padding: 5px; text-align: left; border: 1px solid #ddd;">专利号</th>
                                <th style="padding: 5px; text-align: left; border: 1px solid #ddd; width: 80px;">语言</th>
                                <th style="padding: 5px; text-align: left; border: 1px solid #ddd; width: 80px;">操作</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        data.similar_documents.forEach(doc => {
            htmlContent += `
                <tr>
                    <td style="padding: 5px; border: 1px solid #ddd;">${doc.patent_number}</td>
                    <td style="padding: 5px; border: 1px solid #ddd;">${doc.language || '-'}</td>
                    <td style="padding: 5px; border: 1px solid #ddd;">
                        <a href="${doc.link}" target="_blank" style="color: var(--primary-color); text-decoration: underline;">查看</a>
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
                tableRows += `<tr><td style="border: 1px solid #ddd; padding: 8px;">${key}</td><td style="border: 1px solid #ddd; padding: 8px;">${displayValue}</td></tr>`;
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
            displayContent = `
                <div class="analysis-content">
                    <div style="white-space: pre-wrap; font-family: monospace; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">
                        ${analysisContent}
                    </div>
                </div>
            `;
        }
    } else {
        displayContent = `
            <div class="analysis-content">
                <div style="white-space: pre-wrap; font-family: monospace; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">
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
        modalAnalysisStatus.style.color = '#28a745';
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
                tableRows += `<tr><td style="border: 1px solid #ddd; padding: 8px;">${key}</td><td style="border: 1px solid #ddd; padding: 8px;">${displayValue}</td></tr>`;
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
            displayContent = `
                <div class="analysis-content">
                    <div style="white-space: pre-wrap; font-family: monospace; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">
                        ${analysisContent}
                    </div>
                </div>
            `;
        }
    }
    
    return `
        <div style="margin-top: 15px; padding: 10px; background-color: #e3f2fd; border-radius: 5px;" data-analysis-section="${patentNumber}">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div>
                    <strong style="color: var(--primary-color);">🤖 批量解读结果:</strong>
                    <span id="modal-analysis-status-${patentNumber}" style="margin-left: 10px; font-size: 12px; color: #28a745;">已完成</span>
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
