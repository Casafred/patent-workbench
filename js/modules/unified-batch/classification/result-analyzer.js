/**
 * 智能分类标引模块 - 结果分析器
 */

import classificationState from './state.js';
import { ClassificationConfig } from './config.js';

const ResultAnalyzer = {
    state: classificationState.state,

    analyzeResult(result) {
        const analysis = {
            isValid: false,
            confidence: null,
            confidenceLevel: null,
            issues: [],
            suggestions: []
        };

        if (!result || !result.classification) {
            analysis.issues.push('分类结果为空或格式错误');
            return analysis;
        }

        analysis.isValid = result.valid !== false;

        const confidence = result.overallConfidence || this.calculateOverallConfidence(result.confidence);
        analysis.confidence = confidence;
        analysis.confidenceLevel = this.getConfidenceLevel(confidence);

        if (confidence < ClassificationConfig.CONFIDENCE.LOW_THRESHOLD) {
            analysis.issues.push('整体确信度过低，建议人工复核');
            analysis.suggestions.push('检查分类体系描述是否清晰');
            analysis.suggestions.push('考虑添加更多示例');
        }

        const schema = this.state.schema;
        schema.layers.forEach(layer => {
            if (!result.classification[layer.name]) {
                analysis.issues.push(`层级"${layer.name}"缺少分类结果`);
            }
        });

        Object.entries(result.classification).forEach(([layerName, label]) => {
            const layer = schema.layers.find(l => l.name === layerName);
            if (layer) {
                if (Array.isArray(label)) {
                    label.forEach(l => {
                        if (!layer.labels.includes(l)) {
                            analysis.issues.push(`层级"${layerName}"的标签"${l}"不在预定义标签列表中`);
                        }
                    });
                } else {
                    if (!layer.labels.includes(label)) {
                        analysis.issues.push(`层级"${layerName}"的标签"${label}"不在预定义标签列表中`);
                    }
                }
            }
        });

        return analysis;
    },

    calculateOverallConfidence(confidenceObj) {
        if (!confidenceObj || typeof confidenceObj !== 'object') {
            return 0;
        }

        const values = Object.values(confidenceObj).filter(v => typeof v === 'number');
        if (values.length === 0) {
            return 0;
        }

        return values.reduce((sum, v) => sum + v, 0) / values.length;
    },

    getConfidenceLevel(confidence) {
        if (confidence < ClassificationConfig.CONFIDENCE.LOW_THRESHOLD) {
            return ClassificationConfig.CONFIDENCE.LEVELS.LOW;
        } else if (confidence < ClassificationConfig.CONFIDENCE.MEDIUM_THRESHOLD) {
            return ClassificationConfig.CONFIDENCE.LEVELS.MEDIUM;
        }
        return ClassificationConfig.CONFIDENCE.LEVELS.HIGH;
    },

    getConfidenceColor(confidence) {
        if (confidence < ClassificationConfig.CONFIDENCE.LOW_THRESHOLD) {
            return '#ef4444';
        } else if (confidence < ClassificationConfig.CONFIDENCE.MEDIUM_THRESHOLD) {
            return '#f59e0b';
        }
        return '#22c55e';
    },

    getConfidenceBgColor(confidence) {
        if (confidence < ClassificationConfig.CONFIDENCE.LOW_THRESHOLD) {
            return 'rgba(239, 68, 68, 0.1)';
        } else if (confidence < ClassificationConfig.CONFIDENCE.MEDIUM_THRESHOLD) {
            return 'rgba(245, 158, 11, 0.1)';
        }
        return 'rgba(34, 197, 94, 0.1)';
    },

    batchAnalyze(results) {
        const stats = {
            total: results.length,
            valid: 0,
            invalid: 0,
            byConfidence: {
                low: 0,
                medium: 0,
                high: 0
            },
            issues: [],
            layerStats: {}
        };

        const schema = this.state.schema;
        if (schema && schema.layers) {
            schema.layers.forEach(layer => {
                stats.layerStats[layer.name] = {
                    total: 0,
                    labelDistribution: {}
                };
            });
        }

        results.forEach(result => {
            const analysis = this.analyzeResult(result);

            if (analysis.isValid) {
                stats.valid++;
            } else {
                stats.invalid++;
            }

            if (analysis.confidenceLevel) {
                stats.byConfidence[analysis.confidenceLevel]++;
            }

            if (analysis.issues && analysis.issues.length > 0) {
                stats.issues.push({
                    resultId: result.id || result.requestId,
                    issues: analysis.issues
                });
            }

            if (result.classification) {
                Object.entries(result.classification).forEach(([layerName, label]) => {
                    if (stats.layerStats[layerName]) {
                        stats.layerStats[layerName].total++;
                        
                        const labels = Array.isArray(label) ? label : [label];
                        labels.forEach(l => {
                            if (!stats.layerStats[layerName].labelDistribution[l]) {
                                stats.layerStats[layerName].labelDistribution[l] = 0;
                            }
                            stats.layerStats[layerName].labelDistribution[l]++;
                        });
                    }
                });
            }
        });

        stats.avgConfidence = this.calculateBatchAvgConfidence(results);
        stats.lowConfidenceRate = stats.total > 0 ? (stats.byConfidence.low / stats.total * 100).toFixed(1) : '0.0';
        stats.highConfidenceRate = stats.total > 0 ? (stats.byConfidence.high / stats.total * 100).toFixed(1) : '0.0';

        return stats;
    },

    calculateBatchAvgConfidence(results) {
        const confidences = results
            .map(r => r.overallConfidence || this.calculateOverallConfidence(r.confidence))
            .filter(c => c !== null && c !== undefined);

        if (confidences.length === 0) return 0;

        return (confidences.reduce((sum, c) => sum + c, 0) / confidences.length).toFixed(2);
    },

    getLowConfidenceResults(results, threshold = null) {
        const t = threshold || ClassificationConfig.CONFIDENCE.LOW_THRESHOLD;
        
        return results.filter(result => {
            const confidence = result.overallConfidence || 
                this.calculateOverallConfidence(result.confidence);
            return confidence < t;
        });
    },

    getProblematicResults(results) {
        return results.filter(result => {
            const analysis = this.analyzeResult(result);
            return analysis.issues.length > 0 || 
                   analysis.confidenceLevel === ClassificationConfig.CONFIDENCE.LEVELS.LOW;
        });
    },

    generateReport(results) {
        const stats = this.batchAnalyze(results);
        const schema = this.state.schema;

        const report = {
            title: '分类标引结果报告',
            generatedAt: new Date().toISOString(),
            schema: {
                name: schema.name,
                layerCount: schema.layers.length,
                multiLabel: schema.multiLabel
            },
            summary: {
                totalRecords: stats.total,
                validRecords: stats.valid,
                invalidRecords: stats.invalid,
                averageConfidence: stats.avgConfidence,
                lowConfidenceRate: stats.lowConfidenceRate + '%',
                highConfidenceRate: stats.highConfidenceRate + '%'
            },
            confidenceDistribution: {
                high: stats.byConfidence.high,
                medium: stats.byConfidence.medium,
                low: stats.byConfidence.low
            },
            layerAnalysis: {},
            recommendations: []
        };

        Object.entries(stats.layerStats).forEach(([layerName, layerStats]) => {
            report.layerAnalysis[layerName] = {
                totalClassified: layerStats.total,
                labelDistribution: layerStats.labelDistribution,
                uniqueLabels: Object.keys(layerStats.labelDistribution).length
            };
        });

        if (parseFloat(stats.lowConfidenceRate) > 20) {
            report.recommendations.push('低确信度条目比例较高，建议优化分类体系描述或添加更多示例');
        }

        if (stats.invalid > 0) {
            report.recommendations.push(`存在${stats.invalid}条无效结果，建议检查数据质量或分类标签设置`);
        }

        return report;
    },

    formatResultForDisplay(result) {
        const analysis = this.analyzeResult(result);
        const schema = this.state.schema;

        const formatted = {
            id: result.id || result.requestId,
            inputPreview: this.truncateText(result.input || result.inputPreview, 100),
            classification: {},
            confidence: {},
            confidenceLevel: analysis.confidenceLevel,
            confidenceColor: this.getConfidenceColor(analysis.confidence),
            status: result.status || 'completed',
            issues: analysis.issues
        };

        schema.layers.forEach(layer => {
            const label = result.classification?.[layer.name];
            const conf = result.confidence?.[layer.name];

            if (label) {
                formatted.classification[layer.name] = Array.isArray(label) ? label.join(', ') : label;
            }

            if (conf !== undefined) {
                const displayConf = Array.isArray(conf) 
                    ? Math.min(...conf) 
                    : conf;
                formatted.confidence[layer.name] = (displayConf * 100).toFixed(0) + '%';
            }
        });

        return formatted;
    },

    truncateText(text, maxLength = 100) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    exportResultsToExcel(results) {
        const schema = this.state.schema;
        const headers = ['序号', '输入内容'];
        
        schema.layers.forEach(layer => {
            headers.push(`${layer.name}(分类)`);
            headers.push(`${layer.name}(确信度)`);
        });
        
        headers.push('整体确信度', '状态', '问题');

        const rows = results.map((result, index) => {
            const analysis = this.analyzeResult(result);
            const row = [
                index + 1,
                result.input || result.inputPreview || ''
            ];

            schema.layers.forEach(layer => {
                const label = result.classification?.[layer.name];
                const conf = result.confidence?.[layer.name];

                row.push(Array.isArray(label) ? label.join('; ') : (label || ''));
                
                if (conf !== undefined) {
                    const displayConf = Array.isArray(conf) 
                        ? Math.min(...conf) 
                        : conf;
                    row.push((displayConf * 100).toFixed(1) + '%');
                } else {
                    row.push('');
                }
            });

            row.push(
                analysis.confidence ? (analysis.confidence * 100).toFixed(1) + '%' : '',
                result.status || 'completed',
                analysis.issues.join('; ')
            );

            return row;
        });

        return { headers, rows };
    },

    exportToOriginalExcel(results, originalData, indexColumn, concatColumns) {
        if (!originalData || originalData.length === 0) {
            return { success: false, message: '没有原始Excel数据' };
        }

        if (!results || results.length === 0) {
            return { success: false, message: '没有分类结果' };
        }

        const schema = this.state.schema;
        
        const resultMap = new Map();
        results.forEach((result, index) => {
            const key = result.id || result.customId || `I${index + 1}`;
            resultMap.set(key, result);
        });

        const newHeaders = [];
        schema.layers.forEach(layer => {
            newHeaders.push(`${layer.name}_分类`);
            newHeaders.push(`${layer.name}_确信度`);
        });
        newHeaders.push('整体确信度', '分类依据');

        const outputData = originalData.map((row, rowIndex) => {
            const newRow = { ...row };
            
            let lookupKey;
            if (indexColumn && row[indexColumn]) {
                lookupKey = String(row[indexColumn]).trim();
            } else {
                lookupKey = `I${rowIndex + 1}`;
            }
            
            const result = resultMap.get(lookupKey);
            
            if (result && result.classification) {
                schema.layers.forEach(layer => {
                    const label = result.classification[layer.name];
                    const conf = result.confidence?.[layer.name];
                    
                    if (label) {
                        newRow[`${layer.name}_分类`] = Array.isArray(label) ? label.join('; ') : label;
                    }
                    
                    if (conf !== undefined) {
                        const displayConf = Array.isArray(conf) ? Math.min(...conf) : conf;
                        newRow[`${layer.name}_确信度`] = (displayConf * 100).toFixed(1) + '%';
                    }
                });
                
                if (result.overallConfidence !== undefined) {
                    newRow['整体确信度'] = (result.overallConfidence * 100).toFixed(1) + '%';
                }
                
                if (result.reasoning) {
                    newRow['分类依据'] = result.reasoning;
                }
            }
            
            return newRow;
        });

        const worksheet = XLSX.utils.json_to_sheet(outputData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '分类结果');
        
        const summaryData = this.generateSummarySheet(results, schema);
        if (summaryData.length > 0) {
            const summarySheet = XLSX.utils.json_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(workbook, summarySheet, '统计汇总');
        }

        const fileName = `分类标引结果_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(workbook, fileName);

        return { 
            success: true, 
            message: `已导出${outputData.length}条分类结果到Excel`,
            fileName: fileName
        };
    },

    generateSummarySheet(results, schema) {
        const summary = [];
        
        const stats = this.batchAnalyze(results);
        
        summary.push({ 项目: '总记录数', 数值: stats.total });
        summary.push({ 项目: '有效记录数', 数值: stats.valid });
        summary.push({ 项目: '无效记录数', 数值: stats.invalid });
        summary.push({ 项目: '平均确信度', 数值: (stats.avgConfidence * 100).toFixed(1) + '%' });
        summary.push({ 项目: '高确信度比例', 数值: stats.highConfidenceRate + '%' });
        summary.push({ 项目: '低确信度比例', 数值: stats.lowConfidenceRate + '%' });
        summary.push({ 项目: '', 数值: '' });
        
        Object.entries(stats.layerStats).forEach(([layerName, layerStats]) => {
            summary.push({ 项目: `层级: ${layerName}`, 数值: '' });
            summary.push({ 项目: '  分类数量', 数值: layerStats.total });
            
            Object.entries(layerStats.labelDistribution).forEach(([label, count]) => {
                summary.push({ 项目: `  - ${label}`, 数值: count });
            });
        });

        return summary;
    }
};

export default ResultAnalyzer;
export { ResultAnalyzer };
