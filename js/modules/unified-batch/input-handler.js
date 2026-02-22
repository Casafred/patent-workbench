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
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('未选择文件'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    this.state.workbook = workbook;
                    this.state.columnHeaders = [];
                    this.state.currentSheetData = null;
                    
                    const sheets = workbook.SheetNames;
                    resolve({
                        success: true,
                        sheets: sheets,
                        message: `成功加载Excel文件，共${sheets.length}个工作表`
                    });
                } catch (err) {
                    reject(new Error(`解析Excel失败: ${err.message}`));
                }
            };
            reader.onerror = () => reject(new Error('读取文件失败'));
            reader.readAsArrayBuffer(file);
        });
    },

    loadSheet(sheetName) {
        if (!this.state.workbook) {
            return { success: false, message: '未加载Excel文件' };
        }

        const worksheet = this.state.workbook.Sheets[sheetName];
        if (!worksheet) {
            return { success: false, message: '工作表不存在' };
        }

        const sheetData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        this.state.currentSheetData = sheetData;

        if (sheetData.length > 0) {
            this.state.columnHeaders = Object.keys(sheetData[0]);
            return {
                success: true,
                headers: this.state.columnHeaders,
                rowCount: sheetData.length,
                message: `已加载${sheetData.length}行数据`
            };
        }

        return { success: false, message: '工作表为空' };
    },

    loadInputsFromColumns(selectedColumns) {
        if (!this.state.currentSheetData || this.state.currentSheetData.length === 0) {
            return { success: false, message: '未加载数据', count: 0 };
        }

        if (!selectedColumns || selectedColumns.length === 0) {
            return { success: false, message: '未选择列', count: 0 };
        }

        this.state.inputs = [];
        let loadedCount = 0;

        this.state.currentSheetData.forEach((row, index) => {
            if (selectedColumns.length === 1) {
                const colName = selectedColumns[0];
                if (row[colName]) {
                    this.state.inputs.push({
                        id: `I${index + 1}`,
                        content: String(row[colName]).trim()
                    });
                    loadedCount++;
                }
            } else {
                const multiColContent = {};
                let hasContent = false;
                
                selectedColumns.forEach(colName => {
                    if (row[colName]) {
                        multiColContent[colName] = String(row[colName]).trim();
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

        return {
            success: true,
            count: loadedCount,
            message: `成功加载${loadedCount}条输入`
        };
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
        return this.state.workbook ? this.state.workbook.SheetNames : [];
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
