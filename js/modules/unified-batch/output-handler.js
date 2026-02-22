/**
 * 统一批量处理系统 - 输出处理模块
 * 处理结果收集、导出和报告生成
 */

import unifiedBatchState from './state.js';
import { UnifiedBatchConfig } from './config.js';

const { OUTPUT } = UnifiedBatchConfig;

const OutputHandler = {
    state: unifiedBatchState.state,

    addResult(result) {
        this.state.results.push(result);
    },

    updateResult(requestId, data) {
        const result = this.state.results.find(r => r.requestId === requestId);
        if (result) {
            Object.assign(result, data);
        }
    },

    getResults() {
        return this.state.results;
    },

    clearResults() {
        this.state.results = [];
    },

    getSuccessfulResults() {
        return this.state.results.filter(r => r.status === 'completed');
    },

    getFailedResults() {
        return this.state.results.filter(r => r.status === 'failed');
    },

    getProgressStats() {
        const total = this.state.results.length;
        const completed = this.state.results.filter(r => r.status === 'completed').length;
        const failed = this.state.results.filter(r => r.status === 'failed').length;
        const pending = this.state.results.filter(r => r.status === 'pending').length;
        const processing = this.state.results.filter(r => r.status === 'processing').length;

        return { total, completed, failed, pending, processing };
    },

    exportToExcel(mode) {
        const results = this.state.results;
        
        if (results.length === 0) {
            return { success: false, message: '没有数据可导出' };
        }

        const dataToExport = results.map(result => {
            const input = this.state.inputs.find(i => i.id === result.inputId);
            const template = result.templateName || 'N/A';

            let statusText;
            switch (result.status) {
                case 'completed': statusText = '成功'; break;
                case 'failed': statusText = '失败'; break;
                case 'processing': statusText = '处理中'; break;
                case 'pending': statusText = '排队中'; break;
                case 'retrying': statusText = '重试中'; break;
                default: statusText = '未提交';
            }

            const row = {
                '请求ID': result.requestId || result.customId || '-',
                '模板名称': template,
                '状态': statusText,
                '消耗Tokens': result.usage?.total_tokens || '-',
                '结果': result.result || result.content || ''
            };

            if (input) {
                if (typeof input.content === 'string') {
                    row['输入内容'] = input.content;
                } else {
                    Object.entries(input.content).forEach(([key, value]) => {
                        row['输入列_' + key] = value;
                    });
                }
            }

            if (result.error) {
                row['错误信息'] = result.error;
            }

            return row;
        });

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '批量处理结果');

        const fileName = mode === 'async' 
            ? '小批量异步结果_' + new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-') + '.xlsx'
            : '大批量处理结果_' + new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-') + '.xlsx';

        XLSX.writeFile(workbook, fileName);
        return { success: true, message: 'Excel文件已下载' };
    },

    generateFinalReport(originalData, jsonlResults) {
        if (!originalData || !jsonlResults) {
            return { success: false, message: '缺少必要数据' };
        }

        const resultMap = new Map(
            jsonlResults.map(item => [
                item.custom_id, 
                item?.response?.body?.choices?.[0]?.message?.content?.trim()
            ])
        );

        const allGeneratedHeaders = new Set();
        this.state.reporter.finalOutputData = originalData.map((row, index) => {
            const newRow = { ...row };
            const aiContent = resultMap.get('request-' + (index + 1));

            if (aiContent) {
                try {
                    const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```|({[\s\S]*})/);
                    if (!jsonMatch) throw new Error('未找到JSON块');

                    const jsonString = jsonMatch[1] || jsonMatch[2];
                    const aiJson = JSON.parse(jsonString);

                    Object.keys(aiJson).forEach(key => {
                        newRow[key] = typeof aiJson[key] === 'object' 
                            ? JSON.stringify(aiJson[key]) 
                            : aiJson[key];
                        allGeneratedHeaders.add(key);
                    });
                } catch (e) {
                    newRow['AI原始返回'] = aiContent;
                    allGeneratedHeaders.add('AI原始返回');
                }
            }

            return newRow;
        });

        if (this.state.reporter.finalOutputData.length > 0) {
            this.state.reporter.outputHeaders = [
                ...Object.keys(originalData[0] || {}),
                ...Array.from(allGeneratedHeaders)
            ];
        }

        return {
            success: true,
            data: this.state.reporter.finalOutputData,
            headers: this.state.reporter.outputHeaders,
            message: '解析完成，共' + this.state.reporter.finalOutputData.length + '条结果'
        };
    },

    exportFinalReport() {
        const data = this.state.reporter.finalOutputData;
        const headers = this.state.reporter.outputHeaders;

        if (!data || data.length === 0) {
            return { success: false, message: '没有数据可导出' };
        }

        const normalizedRows = data.map(row => {
            const norm = {};
            headers.forEach(h => {
                let v = row[h];
                if (v === undefined || v === null) {
                    v = '';
                } else if (typeof v === 'object') {
                    try { v = JSON.stringify(v); } catch { v = String(v); }
                } else {
                    v = String(v);
                }
                norm[h] = v;
            });
            return norm;
        });

        const partsCountByHeader = {};
        headers.forEach(h => {
            let maxLen = 0;
            normalizedRows.forEach(r => {
                if (r[h].length > maxLen) maxLen = r[h].length;
            });
            partsCountByHeader[h] = Math.ceil(maxLen / OUTPUT.MAX_CELL_LENGTH) || 1;
        });

        const finalHeaders = [];
        headers.forEach(h => {
            const count = partsCountByHeader[h];
            if (count <= 1) {
                finalHeaders.push(h);
            } else {
                for (let i = 1; i <= count; i++) {
                    finalHeaders.push(h + ' (' + i + ')');
                }
            }
        });

        const outputRows = normalizedRows.map(r => {
            const out = {};
            headers.forEach(h => {
                const count = partsCountByHeader[h];
                const str = r[h];
                if (count <= 1) {
                    out[h] = str;
                } else {
                    for (let i = 1; i <= count; i++) {
                        const start = (i - 1) * OUTPUT.MAX_CELL_LENGTH;
                        out[h + ' (' + i + ')'] = str.slice(start, start + OUTPUT.MAX_CELL_LENGTH);
                    }
                }
            });
            return out;
        });

        const workbook = XLSX.utils.book_new();
        const mainSheet = XLSX.utils.json_to_sheet(outputRows, { header: finalHeaders });
        XLSX.utils.book_append_sheet(workbook, mainSheet, '分析结果');

        const splitMeta = [];
        headers.forEach(h => {
            if (partsCountByHeader[h] > 1) {
                splitMeta.push({
                    字段: h,
                    分段数: partsCountByHeader[h],
                    说明: '该字段超过' + OUTPUT.MAX_CELL_LENGTH + '字符，已拆分为多列'
                });
            }
        });

        if (splitMeta.length > 0) {
            const metaSheet = XLSX.utils.json_to_sheet(splitMeta);
            XLSX.utils.book_append_sheet(workbook, metaSheet, '字段拆分说明');
        }

        try {
            XLSX.writeFile(workbook, '专利分析报告_最终版.xlsx');
            return { success: true, message: '报告已导出' };
        } catch (err) {
            console.error('写入Excel失败，回退导出CSV:', err);
            return this.exportAsCSV(outputRows, finalHeaders);
        }
    },

    exportAsCSV(rows, headers) {
        const escapeCSV = function(s) {
            const t = String(s ?? '');
            if (/[",\n]/.test(t)) return '"' + t.replace(/"/g, '""') + '"';
            return t;
        };

        const csvLines = [];
        csvLines.push(headers.map(escapeCSV).join(','));
        rows.forEach(row => {
            csvLines.push(headers.map(function(h) { return escapeCSV(row[h] ?? ''); }).join(','));
        });

        const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = '专利分析报告_最终版.csv';
        link.click();
        URL.revokeObjectURL(link.href);

        return { success: true, message: 'CSV文件已下载' };
    },

    parseJsonl(content) {
        if (!content) return [];
        return content.trim().split('\n').map(function(line) {
            try {
                return JSON.parse(line);
            } catch (e) {
                console.error('解析JSONL行失败:', line);
                return null;
            }
        }).filter(function(item) { return item; });
    },

    previewResults(count) {
        return this.state.results.slice(0, count || 5);
    }
};

export default OutputHandler;
export { OutputHandler };
