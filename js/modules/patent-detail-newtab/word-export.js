window.PatentDetailWordExport = {
    exportPatentToWord: function(patentNumber, patentData, analysisResult) {
        if (typeof htmlDocx === 'undefined' && typeof window.htmlDocx === 'undefined') {
            alert('Word导出库未加载，请刷新页面后重试');
            return;
        }
        
        try {
            const htmlContent = this.generateHTMLContent(patentNumber, patentData, analysisResult);
            
            const docx = (window.htmlDocx || htmlDocx).asBlob(htmlContent, {
                orientation: 'portrait',
                margins: {
                    top: 720,
                    right: 720,
                    bottom: 720,
                    left: 720
                }
            });
            
            const url = URL.createObjectURL(docx);
            const a = document.createElement('a');
            a.href = url;
            a.download = `专利详情_${patentNumber}_${new Date().toISOString().slice(0, 10)}.docx`;
            a.click();
            URL.revokeObjectURL(url);
            
            console.log('Word文档导出成功');
            
        } catch (error) {
            console.error('Word导出失败:', error);
            alert('Word导出失败: ' + error.message);
        }
    },
    
    generateHTMLContent: function(patentNumber, patentData, analysisResult) {
        let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: "Microsoft YaHei", "SimSun", Arial, sans-serif;
            font-size: 12pt;
            line-height: 1.6;
            color: #333;
        }
        h1 {
            font-size: 18pt;
            color: #2E7D32;
            text-align: center;
            margin-bottom: 20pt;
        }
        h2 {
            font-size: 14pt;
            color: #2E7D32;
            border-bottom: 1px solid #2E7D32;
            padding-bottom: 5pt;
            margin-top: 20pt;
            margin-bottom: 10pt;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 10pt 0;
        }
        th, td {
            border: 1px solid #ccc;
            padding: 8pt;
            text-align: left;
        }
        th {
            background-color: #2E7D32;
            color: white;
            font-weight: bold;
        }
        .label-cell {
            background-color: #f5f5f5;
            font-weight: bold;
            width: 25%;
        }
        .translation-label {
            color: #009688;
            font-weight: bold;
            margin-top: 10pt;
        }
        .claim-item {
            margin-bottom: 15pt;
        }
        .claim-title {
            font-weight: bold;
            color: #2E7D32;
        }
        .claim-dependent {
            color: #1976D2;
        }
        .meta-info {
            margin-bottom: 15pt;
            color: #666;
        }
        .section {
            margin-bottom: 20pt;
        }
    </style>
</head>
<body>
    <h1>专利详情报告</h1>
    
    <div class="meta-info">
        <p><strong>专利号:</strong> ${patentNumber || '-'}</p>
        ${patentData.title ? `<p><strong>标题:</strong> ${this.escapeHtml(patentData.title)}</p>` : ''}
        <p><strong>导出时间:</strong> ${new Date().toLocaleString('zh-CN')}</p>
    </div>
    
    <h2>一、基本信息</h2>
    <table>
        ${patentData.inventors && patentData.inventors.length > 0 ? 
            `<tr><td class="label-cell">发明人</td><td>${this.escapeHtml(patentData.inventors.join(', '))}</td></tr>` : ''}
        ${patentData.assignees && patentData.assignees.length > 0 ? 
            `<tr><td class="label-cell">申请人</td><td>${this.escapeHtml(patentData.assignees.join(', '))}</td></tr>` : ''}
        ${patentData.application_date ? 
            `<tr><td class="label-cell">申请日期</td><td>${this.escapeHtml(patentData.application_date)}</td></tr>` : ''}
        ${patentData.publication_date ? 
            `<tr><td class="label-cell">公开日期</td><td>${this.escapeHtml(patentData.publication_date)}</td></tr>` : ''}
        ${patentData.priority_date ? 
            `<tr><td class="label-cell">优先权日期</td><td>${this.escapeHtml(patentData.priority_date)}</td></tr>` : ''}
        ${patentData.pdf_link ? 
            `<tr><td class="label-cell">PDF链接</td><td>${this.escapeHtml(patentData.pdf_link)}</td></tr>` : ''}
    </table>
`;
        
        if (patentData.abstract) {
            html += `
    <h2>二、摘要</h2>
    <div class="section">
        <p>${this.escapeHtml(patentData.abstract)}</p>
`;
            
            const abstractTranslation = this.getTranslation(patentNumber, 'abstract');
            if (abstractTranslation) {
                html += `
        <p class="translation-label">【翻译】</p>
        <p>${this.escapeHtml(abstractTranslation.translated || abstractTranslation)}</p>
`;
            }
            html += `    </div>`;
        }
        
        if (patentData.classifications && patentData.classifications.length > 0) {
            html += `
    <h2>三、CPC分类</h2>
    <table>
        <tr><th>分类号</th><th>描述</th></tr>
`;
            patentData.classifications.forEach(cls => {
                html += `        <tr><td>${this.escapeHtml(cls.leaf_code || cls.code || '-')}</td><td>${this.escapeHtml(cls.leaf_description || cls.description || '-')}</td></tr>
`;
            });
            html += `    </table>`;
        }
        
        if (patentData.landscapes && patentData.landscapes.length > 0) {
            html += `
    <h2>四、技术领域</h2>
    <div class="section">
        <p>${this.escapeHtml(patentData.landscapes.map(l => l.name).join('、'))}</p>
    </div>`;
        }
        
        if (patentData.claims && patentData.claims.length > 0) {
            html += `
    <h2>五、权利要求</h2>
    <div class="section">
`;
            
            const claimsTranslation = this.getTranslation(patentNumber, 'claims');
            
            patentData.claims.forEach((claim, index) => {
                let claimText = typeof claim === 'string' ? claim : claim.text || '';
                claimText = claimText.replace(/\[\d+\]\[从属\]\s*/g, '').replace(/\[\d+\]\s*/g, '');
                
                const isDependent = typeof claim === 'object' ? claim.type === 'dependent' : 
                    (claimText.includes('[从属]') || claimText.includes('<claim-ref') || /claim\s*\d+/i.test(claimText));
                
                html += `
        <div class="claim-item">
            <p class="claim-title ${isDependent ? 'claim-dependent' : ''}">权利要求 ${index + 1}${isDependent ? ' (从属权利要求)' : ' (独立权利要求)'}</p>
            <p>${this.escapeHtml(claimText)}</p>
`;
                
                if (claimsTranslation && claimsTranslation.translations && claimsTranslation.translations[index]) {
                    html += `            <p class="translation-label">【翻译】</p>
            <p>${this.escapeHtml(claimsTranslation.translations[index].translated)}</p>
`;
                }
                html += `        </div>`;
            });
            html += `    </div>`;
        }
        
        if (patentData.description) {
            html += `
    <h2>六、说明书</h2>
    <div class="section">
`;
            
            const descParagraphs = patentData.description.split(/\n\n+/);
            descParagraphs.forEach(para => {
                if (para.trim()) {
                    const isSectionHeader = /^\[[A-Z\s]+\]$/.test(para.trim());
                    if (isSectionHeader) {
                        html += `        <p><strong>${this.escapeHtml(para.trim())}</strong></p>
`;
                    } else {
                        html += `        <p>${this.escapeHtml(para.trim())}</p>
`;
                    }
                }
            });
            
            const descTranslation = this.getTranslation(patentNumber, 'description');
            if (descTranslation) {
                html += `
        <p class="translation-label">【说明书翻译】</p>
        <p>${this.escapeHtml(descTranslation.translated || descTranslation)}</p>
`;
            }
            html += `    </div>`;
        }
        
        if (patentData.family_applications && patentData.family_applications.length > 0) {
            html += `
    <h2>七、同族信息</h2>
`;
            if (patentData.family_id) {
                html += `    <p><strong>同族ID:</strong> ${this.escapeHtml(patentData.family_id)}</p>
`;
            }
            html += `    <table>
        <tr><th>申请号</th><th>状态</th><th>公开号</th></tr>
`;
            patentData.family_applications.forEach(app => {
                html += `        <tr><td>${this.escapeHtml(app.application_number || '-')}</td><td>${this.escapeHtml(app.status || '-')}</td><td>${this.escapeHtml(app.publication_number || '-')}</td></tr>
`;
            });
            html += `    </table>`;
        }
        
        if (patentData.patent_citations && patentData.patent_citations.length > 0) {
            html += `
    <h2>八、引用专利</h2>
    <table>
        <tr><th>专利号</th><th>标题</th><th>审查员引用</th></tr>
`;
            patentData.patent_citations.forEach(citation => {
                html += `        <tr><td>${this.escapeHtml(citation.patent_number || '-')}</td><td>${this.escapeHtml(citation.title || '-')}</td><td>${citation.examiner_cited ? '是' : '否'}</td></tr>
`;
            });
            html += `    </table>`;
        }
        
        if (patentData.cited_by && patentData.cited_by.length > 0) {
            html += `
    <h2>九、被引用专利</h2>
    <table>
        <tr><th>专利号</th><th>标题</th></tr>
`;
            patentData.cited_by.forEach(citation => {
                html += `        <tr><td>${this.escapeHtml(citation.patent_number || '-')}</td><td>${this.escapeHtml(citation.title || '-')}</td></tr>
`;
            });
            html += `    </table>`;
        }
        
        if (patentData.events_timeline && patentData.events_timeline.length > 0) {
            html += `
    <h2>十、事件时间轴</h2>
    <table>
        <tr><th>日期</th><th>事件</th></tr>
`;
            [...patentData.events_timeline].reverse().forEach(event => {
                html += `        <tr><td>${this.escapeHtml(event.date || '-')}</td><td>${this.escapeHtml(event.title || event.description || '-')}</td></tr>
`;
            });
            html += `    </table>`;
        }
        
        if (patentData.legal_events && patentData.legal_events.length > 0) {
            html += `
    <h2>十一、法律事件</h2>
    <table>
        <tr><th>日期</th><th>代码</th><th>描述</th></tr>
`;
            [...patentData.legal_events].reverse().forEach(event => {
                html += `        <tr><td>${this.escapeHtml(event.date || '-')}</td><td>${this.escapeHtml(event.code || '-')}</td><td>${this.escapeHtml(event.description || event.title || '-')}</td></tr>
`;
            });
            html += `    </table>`;
        }
        
        if (analysisResult) {
            html += `
    <h2>十二、AI解读结果</h2>
    <p style="color: #666; font-style: italic;">以下解读由AI生成，仅供参考</p>
`;
            
            let analysisJson = {};
            try {
                let cleanContent = analysisResult.analysis_content.trim();
                const tripleBacktick = String.fromCharCode(96,96,96);
                const jsonPrefix = tripleBacktick + 'json';
                if (cleanContent.startsWith(jsonPrefix)) {
                    cleanContent = cleanContent.substring(jsonPrefix.length).trim();
                    if (cleanContent.endsWith(tripleBacktick)) {
                        cleanContent = cleanContent.substring(0, cleanContent.length - 3).trim();
                    }
                } else if (cleanContent.startsWith(tripleBacktick)) {
                    cleanContent = cleanContent.substring(3).trim();
                    if (cleanContent.endsWith(tripleBacktick)) {
                        cleanContent = cleanContent.substring(0, cleanContent.length - 3).trim();
                    }
                }
                analysisJson = JSON.parse(cleanContent);
                html += `    <table>
        <tr><th>字段</th><th>内容</th></tr>
`;
                Object.keys(analysisJson).forEach(key => {
                    const value = analysisJson[key];
                    const displayValue = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
                    html += `        <tr><td class="label-cell">${this.escapeHtml(key)}</td><td>${this.escapeHtml(displayValue)}</td></tr>
`;
                });
                html += `    </table>`;
            } catch (e) {
                html += `    <p>${this.escapeHtml(analysisResult.analysis_content)}</p>
`;
            }
        }
        
        html += `
</body>
</html>`;
        
        return html;
    },
    
    escapeHtml: function(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },
    
    getTranslation: function(patentNumber, textType) {
        const models = window.AVAILABLE_MODELS || ['glm-4-flash', 'glm-4-long', 'glm-4.7-flash'];
        
        for (const model of models) {
            const cacheKey = `translation_${patentNumber}_${textType}_${model}`;
            const cached = localStorage.getItem(cacheKey);
            
            if (cached) {
                try {
                    const data = JSON.parse(cached);
                    if (data.translations && Date.now() - data.timestamp < 7 * 24 * 60 * 60 * 1000) {
                        return data;
                    }
                } catch (e) {
                    continue;
                }
            }
        }
        
        return null;
    },
    
    exportFromModal: function(patentNumber) {
        const patentResult = window.patentResults ? window.patentResults.find(r => r.patent_number === patentNumber) : null;
        
        if (!patentResult) {
            alert('未找到专利数据');
            return;
        }
        
        const analysisResult = window.patentBatchAnalysisResults ? 
            window.patentBatchAnalysisResults.find(item => item.patent_number === patentNumber) : null;
        
        this.exportPatentToWord(patentNumber, patentResult.data, analysisResult);
    },
    
    exportFromNewTab: function(patentNumber) {
        const pageData = window.pageData;
        
        if (!pageData) {
            alert('未找到专利数据');
            return;
        }
        
        let analysisResult = null;
        if (window.opener && window.opener.patentBatchAnalysisResults) {
            analysisResult = window.opener.patentBatchAnalysisResults.find(item => item.patent_number === patentNumber);
        }
        
        this.exportPatentToWord(patentNumber, pageData, analysisResult);
    }
};

console.log('PatentDetailWordExport module loaded');
