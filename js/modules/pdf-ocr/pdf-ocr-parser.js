/**
 * PDF-OCR 解析模块
 * 处理GLM-OCR API调用和结果解析
 */

class PDFOCRParser {
    constructor() {
        this.apiUrl = 'https://open.bigmodel.cn/api/paas/v4/layout_parsing';
        this.isParsing = false;
        this.currentTask = null;
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        // 开始OCR解析按钮
        const startBtn = document.getElementById('start-ocr-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                this.startOCR();
            });
        }

        // 解析设置变更
        const settings = ['ocr-parse-mode', 'ocr-recognize-formula', 'ocr-recognize-table'];
        settings.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => {
                    this.updateSettings();
                });
            }
        });
    }

    /**
     * 开始OCR解析
     */
    async startOCR() {
        // 检查是否有文件
        const file = window.pdfOCRCore?.currentFile;
        if (!file) {
            this.showToast('请先上传PDF文件或图片', 'error');
            return;
        }

        // 检查API密钥
        const apiKey = await this.getAPIKey();
        if (!apiKey) {
            this.showToast('请先配置智谱AI API密钥', 'error');
            // 打开设置面板
            this.openSettingsPanel();
            return;
        }

        // 获取解析设置
        const settings = this.getSettings();

        try {
            this.isParsing = true;
            this.updateUIState('parsing');

            // 准备文件数据
            const fileData = await this.prepareFileData(file);

            // 调用GLM-OCR API
            const result = await this.callGLMOCR(fileData, apiKey, settings);

            // 处理解析结果
            this.handleParseResult(result);

            this.showToast('OCR解析完成', 'success');

        } catch (error) {
            console.error('OCR解析失败:', error);
            this.showToast(`解析失败: ${error.message}`, 'error');
        } finally {
            this.isParsing = false;
            this.updateUIState('idle');
        }
    }

    /**
     * 获取API密钥
     */
    async getAPIKey() {
        // 首先检查本地存储
        let apiKey = localStorage.getItem('zhipu_api_key');
        
        // 如果没有，尝试从后端获取
        if (!apiKey) {
            try {
                const response = await fetch('/api/config/zhipu-key');
                if (response.ok) {
                    const data = await response.json();
                    apiKey = data.key;
                }
            } catch (e) {
                console.log('无法从后端获取API密钥');
            }
        }

        return apiKey;
    }

    /**
     * 获取解析设置
     */
    getSettings() {
        const mode = document.getElementById('ocr-parse-mode')?.value || 'auto';
        const recognizeFormula = document.getElementById('ocr-recognize-formula')?.checked ?? true;
        const recognizeTable = document.getElementById('ocr-recognize-table')?.checked ?? true;

        return {
            mode,
            recognizeFormula,
            recognizeTable
        };
    }

    /**
     * 准备文件数据
     */
    async prepareFileData(file) {
        const fileType = window.pdfOCRCore?.currentFileType;

        if (fileType === 'pdf') {
            // PDF文件：提取当前页或所有页面
            const mode = this.getSettings().mode;
            
            if (mode === 'page' && window.pdfOCRCore?.pdfDocument) {
                // 仅当前页
                const pageNum = window.pdfOCRCore.currentPage;
                const imageData = await this.pdfPageToImage(pageNum);
                return {
                    type: 'image',
                    data: imageData
                };
            } else {
                // 整个PDF：转换为图片数组或上传PDF
                // GLM-OCR支持PDF直接上传
                return {
                    type: 'pdf',
                    data: file
                };
            }
        } else {
            // 图片文件
            return {
                type: 'image',
                data: file
            };
        }
    }

    /**
     * PDF页面转换为图片
     */
    async pdfPageToImage(pageNum) {
        if (!window.pdfOCRCore?.pdfDocument) {
            throw new Error('PDF文档未加载');
        }

        const page = await window.pdfOCRCore.pdfDocument.getPage(pageNum);
        const scale = 2.0; // 高分辨率
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        // 转换为Blob
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/png', 0.95);
        });
    }

    /**
     * 调用GLM-OCR API
     */
    async callGLMOCR(fileData, apiKey, settings) {
        const formData = new FormData();

        // 添加文件
        if (fileData.type === 'pdf') {
            formData.append('file', fileData.data);
        } else {
            formData.append('image', fileData.data);
        }

        // 添加参数
        const params = {
            recognize_formula: settings.recognizeFormula,
            recognize_table: settings.recognizeTable
        };
        formData.append('params', JSON.stringify(params));

        // 发送请求
        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API请求失败: ${response.status}`);
        }

        return await response.json();
    }

    /**
     * 处理解析结果
     */
    handleParseResult(result) {
        // 存储结果
        this.currentTask = result;

        // 更新全局状态
        if (window.state) {
            window.state.set('ocrResult', result);
        }

        // 更新视图
        if (window.pdfOCRViewer) {
            window.pdfOCRViewer.setOCRResult(result);
        }

        // 更新原始内容显示
        this.updateOriginalContent(result);

        // 触发解析完成事件
        this.emit('parseComplete', result);
    }

    /**
     * 更新原始内容显示
     */
    updateOriginalContent(result) {
        const container = document.getElementById('ocr-original-content');
        if (!container || !result) return;

        let html = '';

        if (result.pages) {
            result.pages.forEach((page, index) => {
                html += `<div class="page-content" data-page="${index + 1}">`;
                html += `<h4>第 ${index + 1} 页</h4>`;

                if (page.blocks) {
                    page.blocks.forEach(block => {
                        html += this.renderBlockContent(block);
                    });
                }

                html += '</div>';
            });
        }

        container.innerHTML = html || '<p class="empty">无内容</p>';
    }

    /**
     * 渲染区块内容
     */
    renderBlockContent(block) {
        const typeClass = `block-type-${block.type}`;

        switch (block.type) {
            case 'text':
            case 'title':
            case 'header':
            case 'footer':
            case 'reference':
                return `<p class="${typeClass}">${this.escapeHtml(block.text)}</p>`;

            case 'table':
                if (block.html) {
                    return `<div class="${typeClass}">${block.html}</div>`;
                }
                return `<pre class="${typeClass}">${this.escapeHtml(block.text)}</pre>`;

            case 'formula':
                let formulaHtml = '';
                if (block.latex) {
                    formulaHtml += `<div class="formula-latex">$$${block.latex}$$</div>`;
                }
                if (block.text) {
                    formulaHtml += `<div class="formula-text">${this.escapeHtml(block.text)}</div>`;
                }
                return `<div class="${typeClass}">${formulaHtml}</div>`;

            case 'image':
                return `
                    <div class="${typeClass}">
                        <div class="image-placeholder">
                            <i class="fas fa-image"></i>
                            <span>${block.caption || '图片'}</span>
                        </div>
                    </div>
                `;

            default:
                return `<div class="${typeClass}">${this.escapeHtml(block.text || '')}</div>`;
        }
    }

    /**
     * HTML转义
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 更新UI状态
     */
    updateUIState(state) {
        const startBtn = document.getElementById('start-ocr-btn');
        const progressBar = document.getElementById('ocr-progress-bar');
        const progressText = document.getElementById('ocr-progress-text');

        switch (state) {
            case 'parsing':
                if (startBtn) {
                    startBtn.disabled = true;
                    startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 解析中...';
                }
                if (progressBar) {
                    progressBar.style.width = '50%';
                }
                if (progressText) {
                    progressText.textContent = '正在解析文档...';
                }
                break;

            case 'idle':
                if (startBtn) {
                    startBtn.disabled = false;
                    startBtn.innerHTML = '<i class="fas fa-magic"></i> 开始OCR解析';
                }
                if (progressBar) {
                    progressBar.style.width = '0%';
                }
                if (progressText) {
                    progressText.textContent = '准备就绪';
                }
                break;

            case 'complete':
                if (progressBar) {
                    progressBar.style.width = '100%';
                }
                if (progressText) {
                    progressText.textContent = '解析完成';
                }
                setTimeout(() => {
                    if (progressBar) progressBar.style.width = '0%';
                    if (progressText) progressText.textContent = '准备就绪';
                }, 2000);
                break;
        }
    }

    /**
     * 打开设置面板
     */
    openSettingsPanel() {
        // 触发打开设置事件
        this.emit('openSettings');
    }

    /**
     * 更新设置
     */
    updateSettings() {
        const settings = this.getSettings();
        if (window.state) {
            window.state.set('ocrSettings', settings);
        }
    }

    /**
     * 显示提示消息
     */
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `ocr-toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * 导出Markdown
     */
    exportMarkdown() {
        if (!this.currentTask) {
            this.showToast('暂无解析结果', 'error');
            return;
        }

        let markdown = '';

        if (this.currentTask.pages) {
            this.currentTask.pages.forEach((page, index) => {
                markdown += `## 第 ${index + 1} 页\n\n`;

                if (page.blocks) {
                    page.blocks.forEach(block => {
                        markdown += this.blockToMarkdown(block);
                    });
                }

                markdown += '\n---\n\n';
            });
        }

        this.downloadFile(markdown, 'ocr-result.md', 'text/markdown');
    }

    /**
     * 区块转换为Markdown
     */
    blockToMarkdown(block) {
        switch (block.type) {
            case 'title':
                return `## ${block.text}\n\n`;

            case 'text':
                return `${block.text}\n\n`;

            case 'table':
                if (block.markdown) {
                    return block.markdown + '\n\n';
                }
                return '```\n' + block.text + '\n```\n\n';

            case 'formula':
                if (block.latex) {
                    return `$$${block.latex}$$\n\n`;
                }
                return '```\n' + block.text + '\n```\n\n';

            case 'image':
                return `![${block.caption || '图片'}](image)\n\n`;

            default:
                return block.text + '\n\n';
        }
    }

    /**
     * 导出纯文本
     */
    exportText() {
        if (!this.currentTask) {
            this.showToast('暂无解析结果', 'error');
            return;
        }

        let text = '';

        if (this.currentTask.pages) {
            this.currentTask.pages.forEach((page, index) => {
                text += `=== 第 ${index + 1} 页 ===\n\n`;

                if (page.blocks) {
                    page.blocks.forEach(block => {
                        text += this.blockToText(block);
                    });
                }

                text += '\n';
            });
        }

        this.downloadFile(text, 'ocr-result.txt', 'text/plain');
    }

    /**
     * 区块转换为纯文本
     */
    blockToText(block) {
        switch (block.type) {
            case 'title':
                return `[标题] ${block.text}\n\n`;

            case 'text':
                return `${block.text}\n\n`;

            case 'table':
                return `[表格]\n${block.text}\n\n`;

            case 'formula':
                return `[公式] ${block.latex || block.text}\n\n`;

            case 'image':
                return `[图片: ${block.caption || '无描述'}]\n\n`;

            default:
                return block.text + '\n\n';
        }
    }

    /**
     * 导出JSON
     */
    exportJSON() {
        if (!this.currentTask) {
            this.showToast('暂无解析结果', 'error');
            return;
        }

        const json = JSON.stringify(this.currentTask, null, 2);
        this.downloadFile(json, 'ocr-result.json', 'application/json');
    }

    /**
     * 下载文件
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast(`已导出: ${filename}`);
    }

    /**
     * 事件发射器
     */
    emit(eventName, data) {
        const event = new CustomEvent(`pdfocr:${eventName}`, { detail: data });
        document.dispatchEvent(event);
    }

    /**
     * 监听事件
     */
    on(eventName, callback) {
        document.addEventListener(`pdfocr:${eventName}`, (e) => callback(e.detail));
    }

    /**
     * 获取当前解析结果
     */
    getCurrentResult() {
        return this.currentTask;
    }

    /**
     * 清除数据
     */
    clear() {
        this.currentTask = null;
        this.isParsing = false;
        
        // 清空原始内容
        const container = document.getElementById('ocr-original-content');
        if (container) {
            container.innerHTML = '<p class="empty">请先上传文件并进行OCR解析</p>';
        }
    }
}

// 创建全局实例
window.pdfOCRParser = new PDFOCRParser();
