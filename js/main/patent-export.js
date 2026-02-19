/**
 * 专利导出功能模块
 * 支持字段选择和拖拽排序
 */

// 导出字段配置
const EXPORT_FIELDS_CONFIG = [
    { key: 'patent_number', label: '专利号', width: 14, defaultChecked: true, locked: true },
    { key: 'title', label: '标题', width: 30, defaultChecked: true },
    { key: 'abstract', label: '摘要', width: 35, defaultChecked: true },
    { key: 'inventors', label: '发明人', width: 18, defaultChecked: true },
    { key: 'assignees', label: '申请人', width: 18, defaultChecked: true },
    { key: 'application_date', label: '申请日期', width: 12, defaultChecked: true },
    { key: 'publication_date', label: '公开日期', width: 12, defaultChecked: true },
    { key: 'priority_date', label: '优先权日期', width: 12, defaultChecked: false },
    { key: 'classifications', label: 'CPC分类', width: 25, defaultChecked: false },
    { key: 'landscapes', label: '技术领域', width: 20, defaultChecked: false },
    { key: 'family_id', label: '同族ID', width: 14, defaultChecked: false },
    { key: 'family_applications', label: '同族申请', width: 30, defaultChecked: false },
    { key: 'patent_citations', label: '引用专利', width: 30, defaultChecked: false },
    { key: 'cited_by', label: '被引用专利', width: 30, defaultChecked: false },
    { key: 'similar_documents', label: '相似文档', width: 25, defaultChecked: false },
    { key: 'claims', label: '权利要求', width: 40, defaultChecked: false },
    { key: 'description', label: '说明书', width: 40, defaultChecked: false },
    { key: 'events_timeline', label: '事件时间轴', width: 30, defaultChecked: false },
    { key: 'legal_events', label: '法律事件', width: 30, defaultChecked: false },
    { key: 'external_links', label: '外部链接', width: 25, defaultChecked: false },
    { key: 'pdf_link', label: 'PDF链接', width: 35, defaultChecked: true },
    { key: 'url', label: 'Google Patents链接', width: 35, defaultChecked: true }
];

let currentExportFields = [...EXPORT_FIELDS_CONFIG];
let draggedItem = null;

window.showExportFieldSelector = function() {
    if (!window.patentResults || window.patentResults.length === 0) {
        alert('没有可导出的专利数据');
        return;
    }
    
    const modal = document.getElementById('export_field_selector_modal');
    if (modal) {
        modal.style.display = 'flex';
        renderExportFieldList();
        return;
    }
    
    const modalHTML = `
        <div id="export_field_selector_modal" class="export-modal-overlay" style="display: flex; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; align-items: center; justify-content: center;">
            <div class="export-modal-content" style="background: white; border-radius: 12px; width: 500px; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
                <div class="export-modal-header" style="padding: 16px 20px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; font-size: 16px; color: #333;">选择导出字段</h3>
                    <button onclick="closeExportFieldSelector()" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #666;">&times;</button>
                </div>
                <div class="export-modal-actions" style="padding: 12px 20px; border-bottom: 1px solid #e0e0e0; display: flex; gap: 10px; flex-wrap: wrap;">
                    <button onclick="selectAllExportFields()" style="padding: 6px 12px; font-size: 12px; background: #e3f2fd; color: #1976d2; border: 1px solid #90caf9; border-radius: 4px; cursor: pointer;">全选</button>
                    <button onclick="deselectAllExportFields()" style="padding: 6px 12px; font-size: 12px; background: #fff3e0; color: #f57c00; border: 1px solid #ffcc80; border-radius: 4px; cursor: pointer;">取消全选</button>
                    <button onclick="resetExportFieldsOrder()" style="padding: 6px 12px; font-size: 12px; background: #f3e5f5; color: #7b1fa2; border: 1px solid #ce93d8; border-radius: 4px; cursor: pointer;">重置顺序</button>
                </div>
                <div class="export-modal-tip" style="padding: 8px 20px; background: #fff8e1; font-size: 12px; color: #f57c00;">
                    💡 拖拽字段可调整列顺序，勾选字段决定是否导出
                </div>
                <div id="export_field_list" class="export-field-list" style="flex: 1; overflow-y: auto; padding: 10px 20px;">
                </div>
                <div class="export-modal-footer" style="padding: 16px 20px; border-top: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center;">
                    <span id="export_field_count" style="font-size: 13px; color: #666;">已选择 0 个字段</span>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="closeExportFieldSelector()" style="padding: 8px 20px; font-size: 14px; background: #f5f5f5; color: #333; border: 1px solid #ddd; border-radius: 6px; cursor: pointer;">取消</button>
                        <button onclick="executeExport()" style="padding: 8px 20px; font-size: 14px; background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">导出Excel</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    renderExportFieldList();
};

window.closeExportFieldSelector = function() {
    const modal = document.getElementById('export_field_selector_modal');
    if (modal) {
        modal.style.display = 'none';
    }
};

function renderExportFieldList() {
    const container = document.getElementById('export_field_list');
    if (!container) return;
    
    container.innerHTML = currentExportFields.map((field, index) => `
        <div class="export-field-item ${field.locked ? 'locked' : ''}" 
             draggable="${!field.locked}" 
             data-index="${index}"
             style="display: flex; align-items: center; padding: 10px 12px; margin-bottom: 6px; background: ${field.locked ? '#f5f5f5' : '#fff'}; border: 1px solid #e0e0e0; border-radius: 6px; cursor: ${field.locked ? 'default' : 'grab'}; transition: all 0.2s;">
            <span class="drag-handle" style="margin-right: 10px; color: #999; font-size: 14px; ${field.locked ? 'opacity: 0.3' : ''}">☰</span>
            <input type="checkbox" 
                   id="export_field_${field.key}" 
                   ${field.defaultChecked ? 'checked' : ''} 
                   ${field.locked ? 'disabled checked' : ''}
                   onchange="toggleExportField('${field.key}')"
                   style="margin-right: 10px; width: 16px; height: 16px; cursor: pointer;">
            <label for="export_field_${field.key}" style="flex: 1; cursor: pointer; font-size: 14px; color: #333;">
                ${field.label}
                ${field.locked ? '<span style="font-size: 11px; color: #999; margin-left: 6px;">(必选)</span>' : ''}
            </label>
            <span style="font-size: 11px; color: #999; background: #f0f0f0; padding: 2px 6px; border-radius: 3px;">列宽:${field.width}</span>
        </div>
    `).join('');
    
    updateExportFieldCount();
    initDragAndDrop();
}

function initDragAndDrop() {
    const items = document.querySelectorAll('.export-field-item[draggable="true"]');
    
    items.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragenter', handleDragEnter);
        item.addEventListener('dragleave', handleDragLeave);
    });
}

function handleDragStart(e) {
    draggedItem = this;
    this.style.opacity = '0.5';
    this.style.background = '#e3f2fd';
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    this.style.opacity = '1';
    this.style.background = '#fff';
    document.querySelectorAll('.export-field-item').forEach(item => {
        item.style.borderTop = '';
        item.style.borderBottom = '';
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    e.preventDefault();
    if (this !== draggedItem && !this.classList.contains('locked')) {
        const rect = this.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY < midY) {
            this.style.borderTop = '2px solid #1976d2';
            this.style.borderBottom = '';
        } else {
            this.style.borderBottom = '2px solid #1976d2';
            this.style.borderTop = '';
        }
    }
}

function handleDragLeave(e) {
    this.style.borderTop = '';
    this.style.borderBottom = '';
}

function handleDrop(e) {
    e.preventDefault();
    if (this === draggedItem || this.classList.contains('locked')) return;
    
    const fromIndex = parseInt(draggedItem.dataset.index);
    const toIndex = parseInt(this.dataset.index);
    
    const fromField = currentExportFields[fromIndex];
    const toField = currentExportFields[toIndex];
    
    if (fromField.locked || toField.locked) return;
    
    currentExportFields.splice(fromIndex, 1);
    currentExportFields.splice(toIndex, 0, fromField);
    
    renderExportFieldList();
}

window.toggleExportField = function(key) {
    const field = currentExportFields.find(f => f.key === key);
    if (field && !field.locked) {
        const checkbox = document.getElementById(`export_field_${key}`);
        field.defaultChecked = checkbox ? checkbox.checked : !field.defaultChecked;
        updateExportFieldCount();
    }
};

window.selectAllExportFields = function() {
    currentExportFields.forEach(field => {
        if (!field.locked) {
            field.defaultChecked = true;
        }
    });
    renderExportFieldList();
};

window.deselectAllExportFields = function() {
    currentExportFields.forEach(field => {
        if (!field.locked) {
            field.defaultChecked = false;
        }
    });
    renderExportFieldList();
};

window.resetExportFieldsOrder = function() {
    currentExportFields = [...EXPORT_FIELDS_CONFIG];
    renderExportFieldList();
};

function updateExportFieldCount() {
    const count = currentExportFields.filter(f => f.defaultChecked).length;
    const countEl = document.getElementById('export_field_count');
    if (countEl) {
        countEl.textContent = `已选择 ${count} 个字段`;
    }
}

window.executeExport = async function() {
    closeExportFieldSelector();
    
    const selectedFields = currentExportFields.filter(f => f.defaultChecked);
    
    if (selectedFields.length === 0) {
        alert('请至少选择一个导出字段');
        return;
    }
    
    const searchStatus = document.getElementById('search_status');
    
    if (typeof XLSX === 'undefined') {
        if (searchStatus) {
            searchStatus.textContent = '正在加载导出库，请稍候...';
            searchStatus.style.display = 'block';
        }
        try {
            if (window.ResourceLoader) {
                await window.ResourceLoader.ensureLibrary('xlsx');
            } else {
                alert('导出库未加载，请刷新页面后重试');
                return;
            }
        } catch (err) {
            alert('导出库加载失败，请刷新页面后重试');
            return;
        }
    }
    
    try {
        if (searchStatus) {
            searchStatus.textContent = '正在导出Excel文件...';
            searchStatus.style.display = 'block';
        }
        
        const exportData = [];
        
        window.patentResults.forEach(result => {
            const row = {};
            
            if (!result.success) {
                row['专利号'] = result.patent_number;
                row['错误信息'] = result.error || '查询失败';
                exportData.push(row);
                return;
            }
            
            const data = result.data || {};
            
            selectedFields.forEach(field => {
                switch (field.key) {
                    case 'patent_number':
                        row[field.label] = result.patent_number;
                        break;
                    case 'title':
                        row[field.label] = data.title || '';
                        break;
                    case 'abstract':
                        row[field.label] = truncateText(data.abstract, 32767);
                        break;
                    case 'inventors':
                        row[field.label] = formatArray(data.inventors);
                        break;
                    case 'assignees':
                        row[field.label] = formatArray(data.assignees) || data.applicant || data.assignee || '';
                        break;
                    case 'application_date':
                        row[field.label] = data.application_date || data.filing_date || '';
                        break;
                    case 'publication_date':
                        row[field.label] = data.publication_date || '';
                        break;
                    case 'priority_date':
                        row[field.label] = data.priority_date || '';
                        break;
                    case 'classifications':
                        row[field.label] = formatClassifications(data.classifications);
                        break;
                    case 'landscapes':
                        row[field.label] = formatLandscapes(data.landscapes);
                        break;
                    case 'family_id':
                        row[field.label] = data.family_id || '';
                        break;
                    case 'family_applications':
                        row[field.label] = formatFamilyApplications(data.family_applications);
                        break;
                    case 'patent_citations':
                        row[field.label] = formatCitations(data.patent_citations);
                        break;
                    case 'cited_by':
                        row[field.label] = formatCitations(data.cited_by);
                        break;
                    case 'similar_documents':
                        row[field.label] = formatSimilarDocuments(data.similar_documents);
                        break;
                    case 'claims':
                        row[field.label] = truncateText(formatClaims(data.claims), 32767);
                        break;
                    case 'description':
                        row[field.label] = truncateText(data.description, 32767);
                        break;
                    case 'events_timeline':
                        row[field.label] = formatEvents(data.events_timeline);
                        break;
                    case 'legal_events':
                        row[field.label] = formatLegalEvents(data.legal_events);
                        break;
                    case 'external_links':
                        row[field.label] = formatExternalLinks(data.external_links);
                        break;
                    case 'pdf_link':
                        row[field.label] = data.pdf_link || '';
                        break;
                    case 'url':
                        row[field.label] = result.url || '';
                        break;
                }
            });
            
            const analysisResult = window.patentBatchAnalysisResults ? 
                window.patentBatchAnalysisResults.find(item => item.patent_number === result.patent_number) : null;
            
            if (analysisResult && analysisResult.analysis_content) {
                try {
                    let cleanContent = analysisResult.analysis_content.trim();
                    if (cleanContent.startsWith('```json')) {
                        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                    } else if (cleanContent.startsWith('```')) {
                        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
                    }
                    
                    const analysisJson = JSON.parse(cleanContent);
                    
                    Object.keys(analysisJson).forEach(key => {
                        const value = analysisJson[key];
                        const colName = `解读-${key}`;
                        row[colName] = typeof value === 'string' ? truncateText(value, 32767) : JSON.stringify(value);
                    });
                } catch (e) {
                    row['解读结果'] = truncateText(analysisResult.analysis_content, 32767);
                }
            }
            
            exportData.push(row);
        });
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);
        
        const colWidths = selectedFields.map(field => ({ wch: field.width }));
        ws['!cols'] = colWidths;
        
        XLSX.utils.book_append_sheet(wb, ws, '专利查询结果');
        
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `专利查询结果_${timestamp}.xlsx`;
        
        XLSX.writeFile(wb, filename);
        
        if (searchStatus) {
            searchStatus.textContent = `已导出 ${exportData.length} 条专利数据到 ${filename}`;
        }
    } catch (error) {
        console.error('导出失败:', error);
        if (searchStatus) {
            searchStatus.textContent = `导出失败: ${error.message}`;
        }
        alert('导出失败: ' + error.message);
    }
};

window.exportPatentResultsToExcel = window.showExportFieldSelector;

function truncateText(text, maxLength) {
    if (!text) return '';
    if (typeof text !== 'string') {
        text = String(text);
    }
    return text.length > maxLength ? text.substring(0, maxLength) : text;
}

function formatArray(arr) {
    if (!arr || !Array.isArray(arr) || arr.length === 0) return '';
    return arr.join(', ');
}

function formatClassifications(classifications) {
    if (!classifications || !Array.isArray(classifications) || classifications.length === 0) return '';
    return classifications.map(cls => {
        const code = cls.leaf_code || cls.code || '';
        const desc = cls.leaf_description || cls.description || '';
        return desc ? `${code}: ${desc}` : code;
    }).join('; ');
}

function formatLandscapes(landscapes) {
    if (!landscapes || !Array.isArray(landscapes) || landscapes.length === 0) return '';
    return landscapes.map(l => l.name).join('; ');
}

function formatFamilyApplications(applications) {
    if (!applications || !Array.isArray(applications) || applications.length === 0) return '';
    return applications.map(app => {
        const parts = [];
        if (app.application_number) parts.push(`申请号:${app.application_number}`);
        if (app.publication_number) parts.push(`公开号:${app.publication_number}`);
        if (app.status) parts.push(`状态:${app.status}`);
        return parts.join(' ') || app.publication_number || app.application_number || '';
    }).join('; ');
}

function formatCitations(citations) {
    if (!citations || !Array.isArray(citations) || citations.length === 0) return '';
    return citations.map(c => {
        const num = c.patent_number || c.publication_number || '';
        const title = c.title || '';
        return title ? `${num}(${title})` : num;
    }).join('; ');
}

function formatSimilarDocuments(documents) {
    if (!documents || !Array.isArray(documents) || documents.length === 0) return '';
    return documents.map(doc => {
        const num = doc.patent_number || '';
        const lang = doc.language || '';
        return lang ? `${num}[${lang}]` : num;
    }).join('; ');
}

function formatClaims(claims) {
    if (!claims || !Array.isArray(claims) || claims.length === 0) return '';
    return claims.map((claim, index) => {
        const text = typeof claim === 'string' ? claim : claim.text || '';
        return `${index + 1}. ${text}`;
    }).join('\n\n');
}

function formatEvents(events) {
    if (!events || !Array.isArray(events) || events.length === 0) return '';
    return events.map(event => {
        const date = event.date || '';
        const title = event.title || event.description || '';
        const type = event.type || '';
        return type ? `${date}: ${title} [${type}]` : `${date}: ${title}`;
    }).join('; ');
}

function formatLegalEvents(events) {
    if (!events || !Array.isArray(events) || events.length === 0) return '';
    return events.map(event => {
        const date = event.date || '';
        const code = event.code || '';
        const desc = event.description || event.title || '';
        return code ? `${date} [${code}]: ${desc}` : `${date}: ${desc}`;
    }).join('; ');
}

function formatExternalLinks(links) {
    if (!links || typeof links !== 'object' || Object.keys(links).length === 0) return '';
    return Object.entries(links).map(([id, link]) => {
        return link.text || id;
    }).join('; ');
}

console.log('[OK] patent-export.js 加载完成');
