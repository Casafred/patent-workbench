/**
 * 统一批量处理系统 - 输入处理模块
 * 处理Excel导入和手动添加输入
 */

import unifiedBatchState from './state.js';
import { UnifiedBatchConfig } from './config.js';

const { INPUT } = UnifiedBatchConfig;

const InputHandler = {
    state: unifiedBatchState.state,
    
    uploadState: {
        currentFileId: null,
        currentFileName: null,
        uploadTime: null,
        totalRows: 0,
        version: 0
    },

    getFileUploadState() {
        return { ...this.uploadState };
    },

    hasExistingFile() {
        return this.uploadState.currentFileId !== null;
    },

    clearUploadState() {
        this.uploadState = {
            currentFileId: null,
            currentFileName: null,
            uploadTime: null,
            totalRows: 0,
            version: 0
        };
    },

    async handleExcelUpload(file, forceReplace = false) {
        if (!file) {
            return { success: false, message: '未选择文件' };
        }

        if (this.hasExistingFile() && !forceReplace) {
            return {
                success: false,
                needsConfirmation: true,
                message: `当前已有文件 "${this.uploadState.currentFileName}" (${this.uploadState.totalRows}行数据)。是否要用新文件替换？`,
                existingFile: {
                    name: this.uploadState.currentFileName,
                    rows: this.uploadState.totalRows,
                    uploadTime: this.uploadState.uploadTime
                },
                newFile: {
                    name: file.name,
                    size: file.size
                }
            };
        }

        try {
            this.state.task.status = 'uploading';
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('header_row', '0');
            formData.append('replace_existing', 'true');

            const response = await fetch('/api/excel/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.state.excelFileId = result.data.file_id;
                this.state.excelColumns = result.data.columns;
                this.state.excelPreviewData = result.data.preview_data;
                this.state.excelTotalRows = result.data.total_rows;
                this.state.excelSheetNames = result.data.sheet_names;
                this.state.columnHeaders = result.data.columns.map(col => col.name);
                this.state.currentSheetData = result.data.preview_data.map(item => item.data);
                
                this.uploadState = {
                    currentFileId: result.data.file_id,
                    currentFileName: file.name,
                    uploadTime: new Date().toISOString(),
                    totalRows: result.data.total_rows,
                    version: this.uploadState.version + 1
                };
                
                this.state.inputs = [];
                this.state.task.status = 'idle';
                
                return {
                    success: true,
                    sheets: result.data.sheet_names,
                    message: `成功加载Excel文件，共${result.data.sheet_names.length}个工作表，${result.data.total_rows}行数据`,
                    uploadState: this.getFileUploadState()
                };
            } else {
                this.state.task.status = 'idle';
                return { success: false, message: result.error || '上传失败' };
            }
        } catch (err) {
            console.error('Excel上传错误:', err);
            this.state.task.status = 'idle';
            return { success: false, message: `解析Excel失败: ${err.message}` };
        }
    },

    async replaceExcelFile(file) {
        return this.handleExcelUpload(file, true);
    },

    loadSheet(sheetName) {
        if (!this.state.excelFileId) {
            return { success: false, message: '未加载Excel文件' };
        }

        return {
            success: true,
            headers: this.state.columnHeaders,
            rowCount: this.state.excelTotalRows || 0,
            message: `已加载${this.state.excelTotalRows || 0}行数据`
        };
    },

    async loadInputsFromColumns(selectedColumns, onProgress) {
        if (!this.state.excelFileId) {
            return { success: false, message: '未加载Excel文件', count: 0 };
        }

        if (!selectedColumns || selectedColumns.length === 0) {
            return { success: false, message: '未选择列', count: 0 };
        }

        try {
            const CHUNK_SIZE = 500;
            const totalRows = this.state.excelTotalRows || 0;
            const isLargeDataset = totalRows > 1000;
            
            if (isLargeDataset && onProgress) {
                onProgress({ status: 'loading', progress: 0, message: '开始加载数据...' });
            }
            
            this.state.inputs = [];
            let loadedCount = 0;
            let offset = 0;
            let hasMore = true;
            
            while (hasMore) {
                const response = await fetch(
                    `/api/excel/${this.state.excelFileId}/data?header_row=0&page=1&page_size=${CHUNK_SIZE}&offset=${offset}`
                );
                const result = await response.json();

                if (!result.success) {
                    return { success: false, message: result.error || '获取数据失败', count: 0 };
                }

                const sheetData = result.data.data;
                
                sheetData.forEach((row, index) => {
                    const rowData = row.data;
                    const globalIndex = offset + index;
                    
                    if (selectedColumns.length === 1) {
                        const colName = selectedColumns[0];
                        if (rowData[colName]) {
                            this.state.inputs.push({
                                id: `I${globalIndex + 1}`,
                                content: String(rowData[colName]).trim()
                            });
                            loadedCount++;
                        }
                    } else {
                        const multiColContent = {};
                        let hasContent = false;
                        
                        selectedColumns.forEach(colName => {
                            if (rowData[colName]) {
                                multiColContent[colName] = String(rowData[colName]).trim();
                                hasContent = true;
                            } else {
                                multiColContent[colName] = '';
                            }
                        });

                        if (hasContent) {
                            this.state.inputs.push({
                                id: `I${globalIndex + 1}`,
                                content: multiColContent
                            });
                            loadedCount++;
                        }
                    }
                });

                hasMore = result.data.has_more || (sheetData.length === CHUNK_SIZE);
                offset += sheetData.length;
                
                if (isLargeDataset && onProgress) {
                    const progress = totalRows > 0 ? Math.round((offset / totalRows) * 100) : 50;
                    onProgress({
                        status: 'loading',
                        progress: progress,
                        message: `正在加载数据... ${offset}/${totalRows || offset} 行`
                    });
                }
                
                if (!hasMore || offset >= 10000) {
                    break;
                }
            }

            if (onProgress) {
                onProgress({ status: 'completed', progress: 100, message: `加载完成，共 ${loadedCount} 条` });
            }

            return {
                success: true,
                count: loadedCount,
                message: `成功加载${loadedCount}条输入`
            };
        } catch (err) {
            console.error('加载Excel数据错误:', err);
            return { success: false, message: `加载数据失败: ${err.message}`, count: 0 };
        }
    },

    async loadInputsFromConfig(indexColumn, concatColumns, onProgress) {
        if (!this.state.excelFileId) {
            return { success: false, message: '未加载Excel文件', count: 0 };
        }

        if (!concatColumns || concatColumns.length === 0) {
            return { success: false, message: '未选择拼接列', count: 0 };
        }

        try {
            const totalRows = this.state.excelTotalRows || 0;
            
            if (onProgress) {
                onProgress({ status: 'loading', progress: 10, message: '正在使用高性能引擎加载...' });
            }
            
            this.state.inputs = [];
            this.state.indexColumn = indexColumn || null;

            const response = await fetch(`/api/excel/${this.state.excelFileId}/concat_columns`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    columns: concatColumns,
                    separator: '\n\n',
                    header_row: 0,
                    index_column: indexColumn
                })
            });

            const result = await response.json();

            if (!result.success) {
                return { success: false, message: result.error || '列拼接失败', count: 0 };
            }

            const data = result.data;
            
            this.state.inputs = data.results.map(item => ({
                id: item.id,
                content: item.content,
                rawContent: item.raw
            }));

            if (onProgress) {
                onProgress({ 
                    status: 'completed', 
                    progress: 100, 
                    message: `拼接完成，共 ${data.total_count} 条 (${data.elapsed_time.toFixed(2)}秒, ${data.engine}引擎)` 
                });
            }

            return {
                success: true,
                count: data.total_count,
                message: `成功加载${data.total_count}条输入（${data.engine}引擎，耗时${data.elapsed_time.toFixed(2)}秒）`
            };
        } catch (err) {
            console.error('加载Excel数据错误:', err);
            return { success: false, message: `加载数据失败: ${err.message}`, count: 0 };
        }
    },

    async loadInputsFromConfigLegacy(indexColumn, concatColumns, onProgress) {
        if (!this.state.excelFileId) {
            return { success: false, message: '未加载Excel文件', count: 0 };
        }

        if (!concatColumns || concatColumns.length === 0) {
            return { success: false, message: '未选择拼接列', count: 0 };
        }

        try {
            const CHUNK_SIZE = 1000;
            const totalRows = this.state.excelTotalRows || 0;
            const isLargeDataset = totalRows > 1000;
            
            if (isLargeDataset && onProgress) {
                onProgress({ status: 'loading', progress: 0, message: '开始加载拼接数据...' });
            }
            
            this.state.inputs = [];
            this.state.indexColumn = indexColumn || null;
            let loadedCount = 0;
            let offset = 0;
            let hasMore = true;

            while (hasMore) {
                const response = await fetch(
                    `/api/excel/${this.state.excelFileId}/load_more?header_row=0&offset=${offset}&limit=${CHUNK_SIZE}`
                );
                const result = await response.json();

                if (!result.success) {
                    return { success: false, message: result.error || '获取数据失败', count: 0 };
                }

                const sheetData = result.data.data;
                
                sheetData.forEach((row, index) => {
                    const rowData = row.data;
                    const globalIndex = offset + index;
                    
                    const contentParts = [];
                    concatColumns.forEach(colName => {
                        if (rowData[colName]) {
                            contentParts.push(String(rowData[colName]).trim());
                        }
                    });
                    
                    if (contentParts.length > 0) {
                        const inputId = indexColumn && rowData[indexColumn] 
                            ? String(rowData[indexColumn]).trim()
                            : `I${globalIndex + 1}`;
                        
                        this.state.inputs.push({
                            id: inputId,
                            content: contentParts.join('\n\n'),
                            rawContent: rowData
                        });
                        loadedCount++;
                    }
                });

                hasMore = result.data.has_more || (sheetData.length === CHUNK_SIZE);
                offset += sheetData.length;
                
                if (isLargeDataset && onProgress) {
                    const progress = totalRows > 0 ? Math.round((offset / totalRows) * 100) : 50;
                    onProgress({
                        status: 'loading',
                        progress: progress,
                        message: `正在拼接数据... ${offset}/${totalRows || offset} 行`
                    });
                }
                
                if (!hasMore || offset >= 10000) {
                    break;
                }
            }

            if (onProgress) {
                onProgress({ status: 'completed', progress: 100, message: `拼接完成，共 ${loadedCount} 条` });
            }

            return {
                success: true,
                count: loadedCount,
                message: `成功加载${loadedCount}条输入（拼接模式）`
            };
        } catch (err) {
            console.error('加载Excel数据错误:', err);
            return { success: false, message: `加载数据失败: ${err.message}`, count: 0 };
        }
    },

    getDataVolumeWarning() {
        const totalRows = this.state.excelTotalRows || 0;
        
        if (totalRows > 5000) {
            return {
                level: 'high',
                message: `数据量较大 (${totalRows} 行)，建议分批处理或使用批处理模式`,
                recommendation: 'batch'
            };
        } else if (totalRows > 1000) {
            return {
                level: 'medium',
                message: `数据量中等 (${totalRows} 行)，建议使用异步处理模式`,
                recommendation: 'async'
            };
        }
        
        return null;
    },

    addManualInput(text) {
        if (!text || !text.trim()) {
            return { success: false, message: '输入内容为空', count: 0 };
        }

        const lines = text.trim().split('\n').filter(line => line.trim());
        let addedCount = 0;
        const startId = this.state.inputs.length + 1;

        lines.forEach((line, index) => {
            this.state.inputs.push({
                id: `I${startId + index}`,
                content: line.trim()
            });
            addedCount++;
        });

        return {
            success: true,
            count: addedCount,
            message: `成功添加${addedCount}条输入`
        };
    },

    removeInput(inputId) {
        const index = this.state.inputs.findIndex(i => i.id === inputId);
        if (index !== -1) {
            this.state.inputs.splice(index, 1);
            return { success: true, message: '已删除' };
        }
        return { success: false, message: '未找到该输入' };
    },

    removeSelectedInputs(inputIds) {
        if (!inputIds || inputIds.length === 0) {
            return { success: false, message: '未选择要删除的输入' };
        }

        this.state.inputs = this.state.inputs.filter(i => !inputIds.includes(i.id));
        return {
            success: true,
            count: inputIds.length,
            message: `已删除${inputIds.length}条输入`
        };
    },

    clearInputs() {
        this.state.inputs = [];
        this.state.columnHeaders = [];
        this.state.workbook = null;
        this.state.currentSheetData = null;
        this.state.excelFileId = null;
        this.state.excelColumns = [];
        this.state.excelPreviewData = [];
        this.state.excelTotalRows = 0;
        this.state.excelSheetNames = [];
        return { success: true, message: '已清空所有输入' };
    },

    getInputs() {
        return this.state.inputs;
    },

    getInputCount() {
        return this.state.inputs.length;
    },

    getColumnHeaders() {
        return this.state.columnHeaders;
    },

    getSheetNames() {
        return this.state.excelSheetNames || [];
    },

    getInputPreview(maxLength = 50) {
        return this.state.inputs.map((input, index) => {
            let preview;
            if (typeof input.content === 'string') {
                preview = input.content.length > maxLength 
                    ? input.content.substring(0, maxLength) + '...'
                    : input.content;
            } else {
                preview = Object.entries(input.content)
                    .map(([key, value]) => `${key}: ${value.substring(0, 20)}...`)
                    .join(' | ');
            }
            return { id: input.id, index: index + 1, preview };
        });
    },

    formatInputForPrompt(input, template) {
        if (typeof input.content === 'string') {
            return input.content;
        }

        const parts = [];
        Object.entries(input.content).forEach(([key, value]) => {
            parts.push(`以下是"${key}"部分的内容:\n${value}`);
        });
        return parts.join('\n\n');
    },

    validateInputs() {
        const errors = [];
        
        if (this.state.inputs.length === 0) {
            errors.push('没有输入数据');
        }

        this.state.inputs.forEach((input, index) => {
            if (typeof input.content === 'string' && !input.content.trim()) {
                errors.push(`第${index + 1}条输入为空`);
            } else if (typeof input.content === 'object') {
                const hasContent = Object.values(input.content).some(v => v && v.trim());
                if (!hasContent) {
                    errors.push(`第${index + 1}条输入所有列都为空`);
                }
            }
        });

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
};

export default InputHandler;
export { InputHandler };
