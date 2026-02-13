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
            if (result.success) {
                const data = result.data;
                const row = {
                    '专利号': result.patent_number,
                    '标题': data.title || '',
                    '申请人': data.applicant || data.assignee || '',
                    '发明人': data.inventor || '',
                    '申请日': data.filing_date || '',
                    '公开日': data.publication_date || '',
                    '摘要': data.abstract || ''
                };
                
                // 如果有解读结果，也一并导出
                if (result.analysis && result.analysis.content) {
                    row['AI解读'] = result.analysis.content;
                    row['解读模板'] = result.analysis.template || '';
                }
                
                exportData.push(row);
            }
        });
        
        // 创建工作簿
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);
        
        // 设置列宽
        const colWidths = [
            { wch: 15 }, // 专利号
            { wch: 40 }, // 标题
            { wch: 20 }, // 申请人
            { wch: 20 }, // 发明人
            { wch: 12 }, // 申请日
            { wch: 12 }, // 公开日
            { wch: 60 }, // 摘要
            { wch: 60 }, // AI解读
            { wch: 15 }  // 解读模板
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

console.log('✅ patent-export.js 加载完成');
