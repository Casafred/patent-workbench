/**
 * 统一批量处理系统 - 输入处理模块
 * 处理Excel导入和手动添加输入
 */

import unifiedBatchState from './state.js';
import { UnifiedBatchConfig } from './config.js';

const { INPUT } = UnifiedBatchConfig;

const InputHandler = {
    state: unifiedBatchState.state,

    async handleExcelUpload(file) {
        if (!file) {
            return { success: false, message: '未选择文件' };
        }

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('header_row', '0');

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
                
                return {
                    success: true,
                    sheets: result.data.sheet_names,
                    message: `成功加载Excel文件，共${result.data.sheet_names.length}个工作表，${result.data.total_rows}行数据`
                };
            } else {
                return { success: false, message: result.error || '上传失败' };
            }
        } catch (err) {
            console.error('Excel上传错误:', err);
            return { success: false, message: `解析Excel失败: ${err.message}` };
        }
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

    async loadInputsFromColumns(selectedColumns) {
        if (!this.state.excelFileId) {
            return { success: false, message: '未加载Excel文件', count: 0 };
        }

        if (!selectedColumns || selectedColumns.length === 0) {
            return { success: false, message: '未选择列', count: 0 };
        }

        try {
            const response = await fetch(`/api/excel/${this.state.excelFileId}/data?header_row=0&page=1&page_size=10000`);
            const result = await response.json();

            if (!result.success) {
                return { success: false, message: result.error || '获取数据失败', count: 0 };
            }

            const sheetData = result.data.data;
            this.state.inputs = [];
            let loadedCount = 0;

            sheetData.forEach((row, index) => {
                const rowData = row.data;
                if (selectedColumns.length === 1) {
                    const colName = selectedColumns[0];
                    if (rowData[colName]) {
                        this.state.inputs.push({
                            id: `I${index + 1}`,
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
                            id: `I${index + 1}`,
                            content: multiColContent
                        });
                        loadedCount++;
                    }
                }
            });

            this.state.currentSheetData = sheetData.map(item => item.data);

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
