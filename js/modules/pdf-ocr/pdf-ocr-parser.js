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
        this.initElements();
        this.bindEvents();
    }

    initElements() {
        // 初始化元素引用（可在DOM加载后重新调用）
        this.elements = {
            startBtn: document.getElementById('start-ocr-btn'),
            parseMode: document.getElementById('ocr-parse-mode'),
            recognizeFormula: document.getElementById('ocr-recognize-formula'),
            recognizeTable: document.getElementById('ocr-recognize-table'),
            progressBar: document.getElementById('ocr-progress-bar'),
            progressText: document.getElementById('ocr-progress-text'),
            progressContainer: document.getElementById('ocr-progress-container')
        };
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
        // 首先检查全局appState（其他功能使用的统一配置）
        let apiKey = window.appState?.apiKey || '';
        
        // 如果appState没有，检查localStorage中的全局API密钥
        if (!apiKey) {
            apiKey = localStorage.getItem('globalApiKey') || '';
        }
        
        // 如果还没有，尝试旧的zhipu_api_key（向后兼容）
        if (!apiKey) {
            apiKey = localStorage.getItem('zhipu_api_key') || '';
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
     * GLM-OCR API只支持图片格式，PDF需要先转换为图片
     */
    async prepareFileData(file) {
        const fileType = window.pdfOCRCore?.currentFileType;

        if (fileType === 'pdf') {
            // PDF文件：必须转换为图片
            const mode = this.getSettings().mode;
            
            if (mode === 'page' && window.pdfOCRCore?.pdfDocument) {
                // 仅当前页
                const pageNum = window.pdfOCRCore.currentPage;
                const imageBlob = await this.pdfPageToImage(pageNum);
                // 将Blob转换为File对象，保留原始文件名
                const imageFile = new File([imageBlob], 'page.png', { type: 'image/png' });
                return {
                    type: 'image',
                    data: imageFile
                };
            } else {
                // 整个PDF：默认解析第一页
                // 注意：GLM-OCR API目前只支持单张图片
                this.showToast('注意：GLM-OCR API只支持单张图片，将解析第一页', 'info');
                const imageBlob = await this.pdfPageToImage(1);
                const imageFile = new File([imageBlob], 'page.png', { type: 'image/png' });
                return {
                    type: 'image',
                    data: imageFile
                };
            }
        } else {
            // 图片文件，直接使用
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
     * 根据文档使用application/json格式，file字段支持URL或Base64
     */
    async callGLMOCR(fileData, apiKey, settings) {
        // 将文件转换为Base64
        const base64Data = await this.fileToBase64(fileData.data);
        
        // 构建请求体 - 根据API文档，使用file字段（不是image字段）
        const requestBody = {
            model: "glm-ocr",
            file: base64Data
        };

        // 发送请求
        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API请求失败: ${response.status}`);
        }

        return await response.json();
    }

    /**
     * 将文件转换为Base64
     */
    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // 返回完整的Data URL格式，包含data:image/png;base64,前缀
                // API文档说明file字段支持base64格式
                resolve(reader.result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * 处理解析结果
     * 将API返回的layout_details格式转换为内部使用的格式
     */
    handleParseResult(result) {
        // 转换API响应格式为内部格式
        const normalizedResult = this.normalizeResult(result);
        
        // 存储结果
        this.currentTask = normalizedResult;

        // 更新全局状态
        if (window.state) {
            window.state.set('ocrResult', normalizedResult);
        }

        // 判断是否使用追加模式（当前页模式时使用追加模式）
        const mode = this.getSettings().mode;
        const appendMode = mode === 'page';

        // 更新视图
        if (window.pdfOCRViewer) {
            window.pdfOCRViewer.setOCRResult(normalizedResult, appendMode);
        }

        // 更新原始内容显示
        this.updateOriginalContent(normalizedResult);
        
        // 更新Markdown内容显示
        this.updateMarkdownContent(result);

        // 启用导出按钮
        this.enableExportButtons();

        // 触发解析完成事件
        this.emit('parseComplete', normalizedResult);
    }

    /**
     * 启用导出按钮
     */
    enableExportButtons() {
        const exportJsonBtn = document.getElementById('ocr-export-json');
        const exportMarkdownBtn = document.getElementById('ocr-export-markdown');
        const exportTxtBtn = document.getElementById('ocr-export-text');

        if (exportJsonBtn) exportJsonBtn.disabled = false;
        if (exportMarkdownBtn) exportMarkdownBtn.disabled = false;
        if (exportTxtBtn) exportTxtBtn.disabled = false;
    }

    /**
     * 将API响应格式转换为内部格式
     * API返回: layout_details[pageIndex][blockIndex]
     * 内部格式: pages[pageIndex].blocks[blockIndex]
     */
    normalizeResult(result) {
        if (!result) return null;

        // 如果已经是内部格式，直接返回
        if (result.pages) {
            return result;
        }

        // 获取当前解析的页码（用于单页模式）
        const currentPageNum = window.pdfOCRCore?.currentPage || 1;

        // 转换API格式到内部格式
        const normalized = {
            id: result.id,
            created: result.created,
            model: result.model,
            md_results: result.md_results,
            request_id: result.request_id,
            usage: result.usage,
            data_info: result.data_info,
            pages: []
        };

        // 处理layout_details: 二维数组 [page][blocks]
        if (result.layout_details && Array.isArray(result.layout_details)) {
            result.layout_details.forEach((pageBlocks, apiPageIndex) => {
                const pageInfo = result.data_info?.pages?.[apiPageIndex] || {};
                
                // 使用当前页码作为pageIndex（单页模式时）
                const actualPageNum = currentPageNum;
                
                const page = {
                    pageIndex: actualPageNum,
                    width: pageInfo.width || 1224,
                    height: pageInfo.height || 1584,
                    blocks: []
                };

                // 处理每个区块
                if (Array.isArray(pageBlocks)) {
                    pageBlocks.forEach((block, blockIndex) => {
                        // 转换bbox_2d格式
                        const bbox = block.bbox_2d;
                        const convertedBlock = {
                            index: block.index || blockIndex,
                            type: this.mapLabelToType(block.label, block.native_label),
                            label: block.label,
                            native_label: block.native_label,
                            text: block.content || '',
                            content: block.content || '',
                            bbox: {
                                lt: [bbox[0], bbox[1]],
                                rb: [bbox[2], bbox[3]],
                                page_width: block.width || pageInfo.width,
                                page_height: block.height || pageInfo.height
                            },
                            pageIndex: actualPageNum
                        };
                        page.blocks.push(convertedBlock);
                    });
                }

                normalized.pages.push(page);
            });
        }

        return normalized;
    }

    /**
     * 将API的label映射到内部type
     */
    mapLabelToType(label, nativeLabel) {
        const labelMap = {
            'text': 'text',
            'table': 'table',
            'formula': 'formula',
            'image': 'image'
        };
        
        // 优先使用label，如果没有则使用native_label映射
        if (labelMap[label]) {
            return labelMap[label];
        }
        
        // 根据native_label判断
        if (nativeLabel?.includes('title')) return 'title';
        if (nativeLabel?.includes('table')) return 'table';
        if (nativeLabel?.includes('formula')) return 'formula';
        if (nativeLabel?.includes('image')) return 'image';
        
        return 'text';
    }

    /**
     * 更新Markdown内容显示
     */
    updateMarkdownContent(result) {
        const container = document.getElementById('ocr-markdown-content');
        if (!container) return;

        const mdContent = result.md_results || result.markdown || '无Markdown内容';
        
        // 使用marked.js渲染Markdown
        if (typeof marked !== 'undefined') {
            try {
                container.innerHTML = marked.parse(mdContent);
                container.classList.add('markdown-body');
                return;
            } catch (e) {
                console.warn('[PDF-OCR] Markdown渲染失败:', e);
            }
        }
        
        // 备用方案：简单渲染
        container.innerHTML = `<pre class="markdown-body">${this.escapeHtml(mdContent)}</pre>`;
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
        const content = block.text || block.content || '';

        switch (block.type) {
            case 'text':
            case 'title':
            case 'header':
            case 'footer':
            case 'reference':
                return `<p class="${typeClass}">${this.escapeHtml(content)}</p>`;

            case 'table':
                if (block.html) {
                    return `<div class="${typeClass}">${block.html}</div>`;
                }
                return `<pre class="${typeClass}">${this.escapeHtml(content)}</pre>`;

            case 'formula':
                let formulaHtml = '';
                if (block.latex) {
                    formulaHtml += `<div class="formula-latex">$$${block.latex}$$</div>`;
                }
                if (content) {
                    formulaHtml += `<div class="formula-text">${this.escapeHtml(content)}</div>`;
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
                return `<div class="${typeClass}">${this.escapeHtml(content)}</div>`;
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

// 暴露类定义（供 pdf-ocr-init.js 使用）
window.PDFOCRParser = PDFOCRParser;
window.pdfOCRParser = null;
