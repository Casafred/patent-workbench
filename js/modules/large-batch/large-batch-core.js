/**
 * 大批量处理 - 核心模块
 * 协调配置管理、文件处理、批处理等功能
 */

import { initTemplateManager, getCurrentConfig } from './template-manager.js';

/**
 * 初始化大批量处理功能
 */
export function initLargeBatch() {
    console.log('🚀 初始化大批量处理功能...');
    
    // 初始化状态
    if (!window.appState.largeBatch) {
        window.appState.largeBatch = {
            currentFile: null,
            currentSheet: null,
            columnConfig: [],
            generatedJsonl: null,
            batchId: null,
            batchResult: null
        };
    }
    
    // 初始化配置管理器
    initTemplateManager();
    
    // 初始化其他功能
    initFileUpload();
    initColumnConfig();
    initOutputFields();
    initBatchProcessing();
    initReporter();
    
    console.log('✅ 大批量处理功能初始化完成');
}

/**
 * 初始化文件上传
 */
function initFileUpload() {
    const fileInput = document.getElementById('gen_file-input');
    if (!fileInput) return;
    
    fileInput.addEventListener('change', handleFileUpload);
    console.log('✅ 文件上传已初始化');
}

/**
 * 处理文件上传
 */
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('📁 上传文件:', file.name);
    
    try {
        // 这里调用现有的文件处理逻辑
        // 暂时保留原有实现
        console.log('⏳ 处理文件中...');
        
        // TODO: 实现文件解析逻辑
        
    } catch (error) {
        console.error('❌ 文件处理失败:', error);
        alert('文件处理失败：' + error.message);
    }
}

/**
 * 初始化列配置
 */
function initColumnConfig() {
    const columnCount = document.getElementById('column-count');
    if (!columnCount) return;
    
    columnCount.addEventListener('change', updateColumnConfig);
    console.log('✅ 列配置已初始化');
}

/**
 * 更新列配置
 */
function updateColumnConfig() {
    const count = parseInt(document.getElementById('column-count')?.value) || 2;
    const container = document.getElementById('column-config-area');
    if (!container) return;
    
    container.innerHTML = '';
    
    for (let i = 1; i <= count; i++) {
        const configDiv = document.createElement('div');
        configDiv.className = 'config-item';
        configDiv.innerHTML = `
            <label>分析列 ${i}:</label>
            <select class="column-selector" data-index="${i}">
                <option value="">请选择列</option>
            </select>
        `;
        container.appendChild(configDiv);
    }
    
    console.log(`✅ 已生成 ${count} 个列配置`);
}

/**
 * 初始化输出字段
 */
function initOutputFields() {
    const addBtn = document.getElementById('add-output-field-btn');
    if (!addBtn) {
        console.warn('⚠️ 添加输出字段按钮不存在');
        return;
    }
    
    addBtn.addEventListener('click', () => {
        addOutputField();
    });
    
    // 添加默认字段
    addOutputField('summary', '分析摘要');
    addOutputField('key_points', '关键要点');
    
    console.log('✅ 输出字段已初始化');
}

/**
 * 添加输出字段
 */
export function addOutputField(name = '', description = '') {
    const container = document.getElementById('output-fields-container');
    if (!container) {
        console.warn('⚠️ 输出字段容器不存在');
        return;
    }
    
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'output-field-item';
    fieldDiv.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
    
    fieldDiv.innerHTML = `
        <input type="text" class="field-name-input" placeholder="字段名（英文）" value="${name}" 
               style="flex: 1; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px;">
        <input type="text" class="field-desc-input" placeholder="字段描述（中文）" value="${description}"
               style="flex: 2; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px;">
        <button type="button" class="remove-field-btn small-button delete-button">删除</button>
    `;
    
    // 绑定删除按钮
    const removeBtn = fieldDiv.querySelector('.remove-field-btn');
    removeBtn.addEventListener('click', () => fieldDiv.remove());
    
    container.appendChild(fieldDiv);
}

/**
 * 初始化批处理
 */
function initBatchProcessing() {
    // 生成JSONL按钮
    const generateBtn = document.getElementById('gen_generate-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateJsonl);
    }
    
    // 下载JSONL按钮
    const downloadBtn = document.getElementById('gen_download-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadJsonl);
    }
    
    // 批处理步骤按钮
    const step1Btn = document.getElementById('batch_step1_upload');
    const step2Btn = document.getElementById('batch_step2_create');
    const step3Btn = document.getElementById('batch_step3_download');
    const checkBtn = document.getElementById('batch_step3_check');
    const recoverBtn = document.getElementById('recover_state_btn');
    const stopBtn = document.getElementById('batch_stop_check_btn');
    
    if (step1Btn) step1Btn.addEventListener('click', uploadBatchFile);
    if (step2Btn) step2Btn.addEventListener('click', createBatchTask);
    if (step3Btn) step3Btn.addEventListener('click', downloadBatchResult);
    if (checkBtn) checkBtn.addEventListener('click', checkBatchStatus);
    if (recoverBtn) recoverBtn.addEventListener('click', recoverBatchState);
    if (stopBtn) stopBtn.addEventListener('click', stopAutoCheck);
    
    console.log('✅ 批处理已初始化');
}

/**
 * 生成JSONL文件
 */
function generateJsonl() {
    console.log('🔄 生成JSONL文件...');
    
    try {
        // 获取当前配置
        const config = getCurrentConfig();
        console.log('📋 当前配置:', config);
        
        // TODO: 实现JSONL生成逻辑
        alert('JSONL生成功能开发中...');
    } catch (error) {
        console.error('❌ 生成JSONL失败:', error);
        alert('生成失败：' + error.message);
    }
}

/**
 * 下载JSONL文件
 */
function downloadJsonl() {
    console.log('📥 下载JSONL文件...');
    
    if (!window.appState.largeBatch.generatedJsonl) {
        alert('请先生成JSONL文件');
        return;
    }
    
    // TODO: 实现下载逻辑
}

/**
 * 上传批处理文件
 */
function uploadBatchFile() {
    console.log('📤 上传批处理文件...');
    // TODO: 实现上传逻辑
}

/**
 * 创建批处理任务
 */
function createBatchTask() {
    console.log('🚀 创建批处理任务...');
    // TODO: 实现创建任务逻辑
}

/**
 * 下载批处理结果
 */
function downloadBatchResult() {
    console.log('📥 下载批处理结果...');
    // TODO: 实现下载结果逻辑
}

/**
 * 检查批处理状态
 */
function checkBatchStatus() {
    console.log('🔍 检查批处理状态...');
    // TODO: 实现状态检查逻辑
}

/**
 * 恢复批处理状态
 */
function recoverBatchState() {
    console.log('🔄 恢复批处理状态...');
    // TODO: 实现状态恢复逻辑
}

/**
 * 停止自动检查
 */
function stopAutoCheck() {
    console.log('⏹️ 停止自动检查...');
    // TODO: 实现停止自动检查逻辑
}

/**
 * 初始化报告生成器
 */
function initReporter() {
    const excelInput = document.getElementById('rep_excel-input');
    const jsonlInput = document.getElementById('rep_jsonl-input');
    const generateBtn = document.getElementById('rep_generate-report-btn');
    const downloadBtn = document.getElementById('rep_download-report-btn');
    
    if (excelInput) excelInput.addEventListener('change', handleReporterExcelUpload);
    if (jsonlInput) jsonlInput.addEventListener('change', handleReporterJsonlUpload);
    if (generateBtn) generateBtn.addEventListener('click', generateReport);
    if (downloadBtn) downloadBtn.addEventListener('click', downloadReport);
    
    console.log('✅ 报告生成器已初始化');
}

/**
 * 处理报告器Excel上传
 */
function handleReporterExcelUpload(event) {
    console.log('📁 上传报告器Excel文件...');
    // TODO: 实现Excel上传逻辑
}

/**
 * 处理报告器JSONL上传
 */
function handleReporterJsonlUpload(event) {
    console.log('📁 上传报告器JSONL文件...');
    // TODO: 实现JSONL上传逻辑
}

/**
 * 生成报告
 */
function generateReport() {
    console.log('📊 生成报告...');
    // TODO: 实现报告生成逻辑
}

/**
 * 下载报告
 */
function downloadReport() {
    console.log('📥 下载报告...');
    // TODO: 实现报告下载逻辑
}

// 导出给全局使用
window.largeBatchCore = {
    init: initLargeBatch,
    addOutputField: addOutputField
};
