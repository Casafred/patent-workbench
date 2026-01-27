// 功能六：批量专利解读 - UI交互优化
// 新版：条带式显示 + 弹窗详情

// 显示专利查询结果 - 新版：条带式显示
function displayPatentResults(results) {
    // 保存到状态
    appState.patentBatch.patentResults = results;
    
    const patentResultsContainer = document.getElementById('patent_results_container');
    const patentResultsList = document.getElementById('patent_results_list');
    
    patentResultsList.innerHTML = '';
    patentResultsContainer.style.display = 'block';
    
    results.forEach(result => {
        const strip = document.createElement('div');
        strip.className = `patent-strip ${result.success ? 'success' : 'failed'}`;
        
        if (result.success) {
            const data = result.data;
            const titlePreview = data.title ? (data.title.length > 50 ? data.title.substring(0, 50) + '...' : data.title) : '无标题';
            
            strip.innerHTML = `
                <div class="patent-strip-info">
                    <span class="patent-status-icon">✓</span>
                    <span class="patent-number-badge">${result.patent_number}</span>
                    <span class="patent-title-preview">${titlePreview}</span>
                </div>
                <div class="patent-strip-actions">
                    <button class="patent-strip-copy-btn" onclick="copyPatentNumber('${result.patent_number}', event)">
                        复制
                    </button>
                </div>
            `;
            
            // 点击条带打开详情弹窗
            strip.addEventListener('click', (e) => {
                // 如果点击的是复制按钮，不触发弹窗
                if (e.target.closest('.patent-strip-copy-btn')) {
                    return;
                }
                openPatentDetailModal(result);
            });
        } else {
            strip.innerHTML = `
                <div class="patent-strip-info">
                    <span class="patent-status-icon">✗</span>
                    <span class="patent-number-badge">${result.patent_number}</span>
                    <span class="patent-title-preview" style="color: #dc3545;">查询失败: ${result.error || '未知错误'}</span>
                </div>
            `;
        }
        
        patentResultsList.appendChild(strip);
    });
}

// 复制专利号
window.copyPatentNumber = function(patentNumber, event) {
    event.stopPropagation();
    navigator.clipboard.writeText(patentNumber).then(() => {
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '已复制';
        btn.style.background = '#218838';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
        }, 1500);
    }).catch(err => {
        console.error('复制失败:', err);
        alert('复制失败');
    });
};

// 打开专利详情弹窗
window.openPatentDetailModal = function(result) {
    const modal = document.getElementById('patent_detail_modal');
    const titleEl = document.getElementById('patent_detail_title');
    const bodyEl = document.getElementById('patent_detail_body');
    
    if (!result.success || !result.data) {
        return;
    }
    
    const data = result.data;
    
    // 设置标题
    titleEl.textContent = `${result.patent_number} - ${data.title || '无标题'}`;
    
    // 构建详情内容
    let htmlContent = '';
    
    // 基本信息部分
    htmlContent += `<div class="patent-detail-section">`;
    htmlContent += `<h5>📋 基本信息</h5>`;
    
    const basicFields = [
        { label: '公开号', value: result.patent_number, copyable: true },
        { label: '标题', value: data.title },
        { label: '摘要', value: data.abstract },
        { label: '发明人', value: data.inventors && data.inventors.length > 0 ? data.inventors.join(', ') : null },
        { label: '受让人', value: data.assignees && data.assignees.length > 0 ? data.assignees.join(', ') : null },
        { label: '申请日期', value: data.application_date },
        { label: '公开日期', value: data.publication_date },
        { label: '专利链接', value: result.url, isLink: true }
    ];
    
    basicFields.forEach(field => {
        if (field.value) {
            htmlContent += `<div class="patent-field-row">`;
            htmlContent += `<span class="patent-field-label">${field.label}:</span>`;
            
            if (field.isLink) {
                htmlContent += `<a href="${field.value}" target="_blank" style="color: var(--primary-color); text-decoration: underline;">${field.value}</a>`;
            } else {
                htmlContent += `<span class="patent-field-value">${field.value}</span>`;
            }
            
            if (field.copyable) {
                htmlContent += ` <button class="patent-strip-copy-btn" onclick="copyToClipboard('${field.value}', event)" style="margin-left: 8px;">复制</button>`;
            }
            
            htmlContent += `</div>`;
        }
    });
    
    htmlContent += `</div>`;
    
    // 权利要求部分
    if (data.claims && data.claims.length > 0) {
        htmlContent += `<div class="patent-detail-section">`;
        htmlContent += `<h5>⚖️ 权利要求 (共${data.claims.length}条)</h5>`;
        htmlContent += `<div style="max-height: 300px; overflow-y: auto;">`;
        
        data.claims.forEach((claim, index) => {
            htmlContent += `
                <div style="margin-bottom: 12px; padding: 10px; background: white; border-radius: 4px; border-left: 3px solid var(--primary-color);">
                    <strong>权利要求 ${index + 1}:</strong><br/>
                    <span style="color: #666; line-height: 1.6;">${claim}</span>
                </div>
            `;
        });
        
        htmlContent += `</div></div>`;
    }
    
    // 说明书部分
    if (data.description) {
        htmlContent += `<div class="patent-detail-section">`;
        htmlContent += `<h5>📝 说明书</h5>`;
        htmlContent += `<div style="max-height: 300px; overflow-y: auto; line-height: 1.6; color: #666;">${data.description}</div>`;
        htmlContent += `</div>`;
    }
    
    // 引用专利部分
    if (data.patent_citations && data.patent_citations.length > 0) {
        htmlContent += `<div class="patent-detail-section">`;
        htmlContent += `<h5>📚 引用专利 (共${data.patent_citations.length}条)</h5>`;
        htmlContent += `<div style="max-height: 200px; overflow-y: auto;">`;
        
        data.patent_citations.forEach((citation, index) => {
            const citationText = typeof citation === 'string' ? citation : (citation.patent_number || JSON.stringify(citation));
            htmlContent += `<div style="padding: 6px 0; border-bottom: 1px solid #eee;">${index + 1}. ${citationText}</div>`;
        });
        
        htmlContent += `</div></div>`;
    }
    
    // 非专利引用部分
    if (data.non_patent_citations && data.non_patent_citations.length > 0) {
        htmlContent += `<div class="patent-detail-section">`;
        htmlContent += `<h5>📖 非专利引用 (共${data.non_patent_citations.length}条)</h5>`;
        htmlContent += `<div style="max-height: 200px; overflow-y: auto;">`;
        
        data.non_patent_citations.forEach((citation, index) => {
            htmlContent += `<div style="padding: 6px 0; border-bottom: 1px solid #eee;">${index + 1}. ${citation}</div>`;
        });
        
        htmlContent += `</div></div>`;
    }
    
    // 添加问一问按钮
    htmlContent += `
        <div style="text-align: center; margin-top: 20px;">
            <button class="small-button primary-btn" onclick="closePatentDetailModal(); openPatentChat('${result.patent_number}');">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: middle; margin-right: 4px;">
                    <path d="M2.678 11.894a1 1 0 0 1 .287.801 10.97 10.97 0 0 1-.398 2c1.395-.323 2.247-.697 2.634-.893a1 1 0 0 1 .71-.074A8.06 8.06 0 0 0 8 14c3.996 0 7-2.807 7-6 0-3.192-3.004-6-7-6S1 4.808 1 8c0 1.468.617 2.83 1.678 3.894zm-.493 3.905a21.682 21.682 0 0 1-.713.129c-.2.032-.352-.176-.273-.362a9.68 9.68 0 0 0 .244-.637l.003-.01c.248-.72.45-1.548.524-2.319C.743 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7-3.582 7-8 7a9.06 9.06 0 0 1-2.347-.306c-.52.263-1.639.742-3.468 1.105z"/>
                </svg>
                问一问这个专利
            </button>
        </div>
    `;
    
    bodyEl.innerHTML = htmlContent;
    modal.style.display = 'block';
};

// 关闭专利详情弹窗
window.closePatentDetailModal = function() {
    const modal = document.getElementById('patent_detail_modal');
    modal.style.display = 'none';
};

// 通用复制函数
window.copyToClipboard = function(text, event) {
    if (event) {
        event.stopPropagation();
    }
    navigator.clipboard.writeText(text).then(() => {
        if (event && event.target) {
            const btn = event.target;
            const originalText = btn.textContent;
            btn.textContent = '已复制';
            btn.style.background = '#218838';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '';
            }, 1500);
        }
    }).catch(err => {
        console.error('复制失败:', err);
        alert('复制失败');
    });
};

// 点击弹窗外部关闭
window.addEventListener('click', (event) => {
    const modal = document.getElementById('patent_detail_modal');
    if (event.target === modal) {
        closePatentDetailModal();
    }
});

// 导出函数供main.js使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { displayPatentResults };
}
