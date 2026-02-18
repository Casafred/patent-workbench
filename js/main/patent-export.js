/**
 * 专利导出功能模块
 * 从main.js中提取的导出功能
 */

// 导出专利结果为Excel（全局函数，供标签页调用）
window.exportPatentResultsToExcel = async function() {
    const searchStatus = document.getElementById('search_status');
    
    if (!window.patentResults || window.patentResults.length === 0) {
        alert('没有可导出的专利数据');
        return;
    }
    
    // 确保 XLSX 库已加载
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
        
        // 准备导出数据
        const exportData = [];
        window.patentResults.forEach(result => {
            if (!result.success) {
                exportData.push({
                    '专利号': result.patent_number,
                    '错误信息': result.error || '查询失败'
                });
                return;
            }
            
            const data = result.data || {};
            
            const row = {
                '专利号': result.patent_number,
                '标题': data.title || '',
                '摘要': truncateText(data.abstract, 32767),
                '发明人': formatArray(data.inventors),
                '申请人': formatArray(data.assignees) || data.applicant || data.assignee || '',
                '申请日期': data.application_date || data.filing_date || '',
                '公开日期': data.publication_date || '',
                '优先权日期': data.priority_date || '',
                'CPC分类': formatClassifications(data.classifications),
                '技术领域': formatLandscapes(data.landscapes),
                '同族ID': data.family_id || '',
                '同族申请': formatFamilyApplications(data.family_applications),
                '引用专利': formatCitations(data.patent_citations),
                '被引用专利': formatCitations(data.cited_by),
                '相似文档': formatSimilarDocuments(data.similar_documents),
                '权利要求': truncateText(formatClaims(data.claims), 32767),
                '说明书': truncateText(data.description, 32767),
                '事件时间轴': formatEvents(data.events_timeline),
                '法律事件': formatLegalEvents(data.legal_events),
                '外部链接': formatExternalLinks(data.external_links),
                'Google Patents链接': result.url || ''
            };
            
            // 添加解读结果
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
                    
                    // 动态添加解读字段
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
        
        // 创建工作簿
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);
        
        // 设置列宽
        const colWidths = [
            { wch: 15 }, // 专利号
            { wch: 40 }, // 标题
            { wch: 50 }, // 摘要
            { wch: 20 }, // 发明人
            { wch: 20 }, // 申请人
            { wch: 12 }, // 申请日期
            { wch: 12 }, // 公开日期
            { wch: 12 }, // 优先权日期
            { wch: 30 }, // CPC分类
            { wch: 30 }, // 技术领域
            { wch: 15 }, // 同族ID
            { wch: 50 }, // 同族申请
            { wch: 50 }, // 引用专利
            { wch: 50 }, // 被引用专利
            { wch: 50 }, // 相似文档
            { wch: 60 }, // 权利要求
            { wch: 60 }, // 说明书
            { wch: 40 }, // 事件时间轴
            { wch: 40 }, // 法律事件
            { wch: 30 }, // 外部链接
            { wch: 40 }, // Google Patents链接
            { wch: 50 }  // 解读结果
        ];
        ws['!cols'] = colWidths;
        
        // 添加工作表到工作簿
        XLSX.utils.book_append_sheet(wb, ws, '专利查询结果');
        
        // 生成文件名
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `专利查询结果_${timestamp}.xlsx`;
        
        // 下载文件
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

// 辅助函数：截断文本
function truncateText(text, maxLength) {
    if (!text) return '';
    if (typeof text !== 'string') {
        text = String(text);
    }
    return text.length > maxLength ? text.substring(0, maxLength) : text;
}

// 辅助函数：格式化数组
function formatArray(arr) {
    if (!arr || !Array.isArray(arr) || arr.length === 0) return '';
    return arr.join(', ');
}

// 辅助函数：格式化CPC分类
function formatClassifications(classifications) {
    if (!classifications || !Array.isArray(classifications) || classifications.length === 0) return '';
    return classifications.map(cls => {
        const code = cls.leaf_code || cls.code || '';
        const desc = cls.leaf_description || cls.description || '';
        return desc ? `${code}: ${desc}` : code;
    }).join('; ');
}

// 辅助函数：格式化技术领域
function formatLandscapes(landscapes) {
    if (!landscapes || !Array.isArray(landscapes) || landscapes.length === 0) return '';
    return landscapes.map(l => l.name).join('; ');
}

// 辅助函数：格式化同族申请
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

// 辅助函数：格式化引用专利
function formatCitations(citations) {
    if (!citations || !Array.isArray(citations) || citations.length === 0) return '';
    return citations.map(c => {
        const num = c.patent_number || c.publication_number || '';
        const title = c.title || '';
        return title ? `${num}(${title})` : num;
    }).join('; ');
}

// 辅助函数：格式化相似文档
function formatSimilarDocuments(documents) {
    if (!documents || !Array.isArray(documents) || documents.length === 0) return '';
    return documents.map(doc => {
        const num = doc.patent_number || '';
        const lang = doc.language || '';
        return lang ? `${num}[${lang}]` : num;
    }).join('; ');
}

// 辅助函数：格式化权利要求
function formatClaims(claims) {
    if (!claims || !Array.isArray(claims) || claims.length === 0) return '';
    return claims.map((claim, index) => {
        const text = typeof claim === 'string' ? claim : claim.text || '';
        return `${index + 1}. ${text}`;
    }).join('\n\n');
}

// 辅助函数：格式化事件时间轴
function formatEvents(events) {
    if (!events || !Array.isArray(events) || events.length === 0) return '';
    return events.map(event => {
        const date = event.date || '';
        const title = event.title || event.description || '';
        const type = event.type || '';
        return type ? `${date}: ${title} [${type}]` : `${date}: ${title}`;
    }).join('; ');
}

// 辅助函数：格式化法律事件
function formatLegalEvents(events) {
    if (!events || !Array.isArray(events) || events.length === 0) return '';
    return events.map(event => {
        const date = event.date || '';
        const code = event.code || '';
        const desc = event.description || event.title || '';
        return code ? `${date} [${code}]: ${desc}` : `${date}: ${desc}`;
    }).join('; ');
}

// 辅助函数：格式化外部链接
function formatExternalLinks(links) {
    if (!links || typeof links !== 'object' || Object.keys(links).length === 0) return '';
    return Object.entries(links).map(([id, link]) => {
        return link.text || id;
    }).join('; ');
}

console.log('✅ patent-export.js 加载完成');
