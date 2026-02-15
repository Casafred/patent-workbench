/**
 * PDF-OCR 核心模块
 * 负责文件上传、PDF渲染、状态管理
 */

class PDFOCRCore {
    constructor() {
        this.currentFile = null;
        this.currentFileType = null; // 'pdf' | 'image'
        this.currentPage = 1;
        this.totalPages = 0;
        this.pdfDocument = null;
        this.pageCanvases = new Map(); // 缓存页面canvas
        this.zoomLevel = 1.0;
        this.showBlocks = false;
        this.selectedBlocks = new Set();
        
        // DOM 元素引用
        this.elements = {};
        
        // 初始化
        this.initElements();
        this.bindEvents();
    }
    
    /**
     * 初始化DOM元素引用
     */
    initElements() {
        this.elements = {
            // 文件上传
            dropzone: document.getElementById('pdf_upload_dropzone'),
            fileInput: document.getElementById('pdf_file_input'),
            fileInfo: document.getElementById('pdf_file_info'),
            fileName: document.getElementById('pdf_file_name'),
            removeFileBtn: document.getElementById('pdf_remove_file_btn'),
            
            // OCR控制
            ocrScopeSelect: document.getElementById('ocr_scope_select'),
            ocrLanguageSelect: document.getElementById('ocr_language_select'),
            startOcrBtn: document.getElementById('start_ocr_btn'),
            progressContainer: document.getElementById('ocr_progress_container'),
            progressBar: document.getElementById('ocr_progress_bar'),
            progressText: document.getElementById('ocr_progress_text'),
            
            // 页面导航
            pageThumbnails: document.getElementById('page_thumbnails'),
            
            // 阅读器
            viewerContainer: document.getElementById('pdf_viewer_container'),
            prevPageBtn: document.getElementById('viewer_prev_page'),
            nextPageBtn: document.getElementById('viewer_next_page'),
            pageInput: document.getElementById('viewer_page_input'),
            totalPages: document.getElementById('viewer_total_pages'),
            zoomSelect: document.getElementById('viewer_zoom_select'),
            zoomOutBtn: document.getElementById('viewer_zoom_out'),
            zoomInBtn: document.getElementById('viewer_zoom_in'),
            toggleBlocksBtn: document.getElementById('viewer_toggle_blocks'),
            
            // 内容标签页
            tabHeaders: document.querySelectorAll('.tab-header'),
            tabPanels: document.querySelectorAll('.tab-content-panel'),
            originalContent: document.getElementById('original_content'),
            structuredContent: document.getElementById('structured_content'),
            translationContent: document.getElementById('translation_content'),
            
            // 过滤器
            filterText: document.getElementById('filter_text'),
            filterTable: document.getElementById('filter_table'),
            filterFormula: document.getElementById('filter_formula'),
            filterImage: document.getElementById('filter_image'),
            
            // 统计
            statPages: document.getElementById('stat_pages'),
            statTexts: document.getElementById('stat_texts'),
            statTables: document.getElementById('stat_tables'),
            statFormulas: document.getElementById('stat_formulas'),
            
            // 导出
            exportJsonBtn: document.getElementById('export_json_btn'),
            exportMarkdownBtn: document.getElementById('export_markdown_btn'),
            exportTxtBtn: document.getElementById('export_txt_btn')
        };
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // 文件上传
        if (this.elements.dropzone) {
            this.elements.dropzone.addEventListener('click', () => {
                this.elements.fileInput.click();
            });
            
            // 拖拽事件
            this.elements.dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                this.elements.dropzone.classList.add('dragover');
            });
            
            this.elements.dropzone.addEventListener('dragleave', () => {
                this.elements.dropzone.classList.remove('dragover');
            });
            
            this.elements.dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                this.elements.dropzone.classList.remove('dragover');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleFile(files[0]);
                }
            });
        }
        
        if (this.elements.fileInput) {
            this.elements.fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFile(e.target.files[0]);
                }
            });
        }
        
        if (this.elements.removeFileBtn) {
            this.elements.removeFileBtn.addEventListener('click', () => this.removeFile());
        }
        
        // 页面导航
        if (this.elements.prevPageBtn) {
            this.elements.prevPageBtn.addEventListener('click', () => this.goToPage(this.currentPage - 1));
        }
        
        if (this.elements.nextPageBtn) {
            this.elements.nextPageBtn.addEventListener('click', () => this.goToPage(this.currentPage + 1));
        }
        
        if (this.elements.pageInput) {
            this.elements.pageInput.addEventListener('change', (e) => {
                const page = parseInt(e.target.value);
                if (page >= 1 && page <= this.totalPages) {
                    this.goToPage(page);
                }
            });
        }
        
        // 缩放控制
        if (this.elements.zoomSelect) {
            this.elements.zoomSelect.addEventListener('change', (e) => {
                if (e.target.value === 'fit') {
                    this.fitToWidth();
                } else {
                    this.setZoom(parseFloat(e.target.value));
                }
            });
        }
        
        if (this.elements.zoomOutBtn) {
            this.elements.zoomOutBtn.addEventListener('click', () => this.zoomOut());
        }
        
        if (this.elements.zoomInBtn) {
            this.elements.zoomInBtn.addEventListener('click', () => this.zoomIn());
        }
        
        // 区块显示切换
        if (this.elements.toggleBlocksBtn) {
            this.elements.toggleBlocksBtn.addEventListener('click', () => this.toggleBlocks());
        }
        
        // 标签页切换
        this.elements.tabHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const tabName = header.dataset.tab;
                this.switchTab(tabName);
            });
        });
        
        // 过滤器
        [this.elements.filterText, this.elements.filterTable, this.elements.filterFormula, this.elements.filterImage]
            .forEach(filter => {
                if (filter) {
                    filter.addEventListener('change', () => this.updateStructuredContent());
                }
            });
        
        // 导出按钮
        if (this.elements.exportJsonBtn) {
            this.elements.exportJsonBtn.addEventListener('click', () => this.exportJSON());
        }
        
        if (this.elements.exportMarkdownBtn) {
            this.elements.exportMarkdownBtn.addEventListener('click', () => this.exportMarkdown());
        }
        
        if (this.elements.exportTxtBtn) {
            this.elements.exportTxtBtn.addEventListener('click', () => this.exportTXT());
        }
    }
    
    /**
     * 处理上传的文件
     */
    async handleFile(file) {
        const fileName = file.name.toLowerCase();
        
        // 检查文件类型
        if (fileName.endsWith('.pdf')) {
            this.currentFileType = 'pdf';
        } else if (/\.(png|jpg|jpeg|bmp|webp)$/.test(fileName)) {
            this.currentFileType = 'image';
        } else {
            alert('不支持的文件格式，请上传PDF或图片文件');
            return;
        }
        
        this.currentFile = file;
        
        // 更新UI
        this.elements.fileName.textContent = file.name;
        this.elements.fileInfo.style.display = 'flex';
        this.elements.startOcrBtn.disabled = false;
        
        // 保存到状态
        if (window.appState && window.appState.pdfOCRReader) {
            window.appState.pdfOCRReader.currentFile = file;
        }
        
        // 加载文件
        if (this.currentFileType === 'pdf') {
            await this.loadPDF(file);
        } else {
            await this.loadImage(file);
        }
        
        console.log('[PDF-OCR] 文件已加载:', file.name);
    }
    
    /**
     * 加载PDF文件
     */
    async loadPDF(file) {
        try {
            // 检查PDF.js是否可用
            if (typeof pdfjsLib === 'undefined') {
                // 动态加载PDF.js
                await this.loadPDFJS();
            }
            
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            this.pdfDocument = await loadingTask.promise;
            
            this.totalPages = this.pdfDocument.numPages;
            this.currentPage = 1;
            
            // 更新UI
            this.elements.totalPages.textContent = this.totalPages;
            this.elements.pageInput.value = 1;
            this.elements.pageInput.max = this.totalPages;
            this.elements.prevPageBtn.disabled = true;
            this.elements.nextPageBtn.disabled = this.totalPages <= 1;
            
            // 渲染页面缩略图
            await this.renderPageThumbnails();
            
            // 渲染第一页
            await this.renderPage(1);
            
            // 更新统计
            this.elements.statPages.textContent = this.totalPages;
            
        } catch (error) {
            console.error('[PDF-OCR] 加载PDF失败:', error);
            alert('PDF加载失败: ' + error.message);
        }
    }
    
    /**
     * 加载PDF.js库
     */
    loadPDFJS() {
        return new Promise((resolve, reject) => {
            if (typeof pdfjsLib !== 'undefined') {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = () => {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    /**
     * 加载图片文件
     */
    async loadImage(file) {
        const url = URL.createObjectURL(file);
        
        this.totalPages = 1;
        this.currentPage = 1;
        
        // 更新UI
        this.elements.totalPages.textContent = 1;
        this.elements.pageInput.value = 1;
        this.elements.pageInput.max = 1;
        this.elements.prevPageBtn.disabled = true;
        this.elements.nextPageBtn.disabled = true;
        
        // 清空容器
        this.elements.viewerContainer.innerHTML = '';
        
        // 创建图片元素
        const img = document.createElement('img');
        img.src = url;
        img.className = 'pdf-image-display';
        img.onload = () => {
            URL.revokeObjectURL(url);
        };
        
        this.elements.viewerContainer.appendChild(img);
        
        // 更新缩略图
        this.elements.pageThumbnails.innerHTML = `
            <div class="page-thumbnail active" data-page="1">
                <img src="${url}" alt="Page 1">
                <span class="page-num">第1页</span>
            </div>
        `;
        
        // 绑定缩略图点击事件
        this.bindThumbnailEvents();
        
        // 更新统计
        this.elements.statPages.textContent = 1;
    }
    
    /**
     * 渲染页面缩略图
     */
    async renderPageThumbnails() {
        this.elements.pageThumbnails.innerHTML = '';
        
        for (let i = 1; i <= this.totalPages; i++) {
            const thumbnail = document.createElement('div');
            thumbnail.className = `page-thumbnail ${i === 1 ? 'active' : ''}`;
            thumbnail.dataset.page = i;
            
            const canvas = document.createElement('canvas');
            canvas.width = 50;
            canvas.height = 70;
            
            const pageNum = document.createElement('span');
            pageNum.className = 'page-num';
            pageNum.textContent = `第${i}页`;
            
            const status = document.createElement('span');
            status.className = 'ocr-status';
            status.id = `ocr-status-${i}`;
            
            thumbnail.appendChild(canvas);
            thumbnail.appendChild(pageNum);
            thumbnail.appendChild(status);
            
            this.elements.pageThumbnails.appendChild(thumbnail);
            
            // 渲染缩略图
            try {
                const page = await this.pdfDocument.getPage(i);
                const viewport = page.getViewport({ scale: 0.2 });
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;
            } catch (error) {
                console.warn(`[PDF-OCR] 渲染缩略图 ${i} 失败:`, error);
            }
        }
        
        this.bindThumbnailEvents();
    }
    
    /**
     * 绑定缩略图事件
     */
    bindThumbnailEvents() {
        const thumbnails = this.elements.pageThumbnails.querySelectorAll('.page-thumbnail');
        thumbnails.forEach(thumb => {
            thumb.addEventListener('click', () => {
                const page = parseInt(thumb.dataset.page);
                this.goToPage(page);
            });
        });
    }
    
    /**
     * 渲染指定页面
     */
    async renderPage(pageNum) {
        if (!this.pdfDocument || pageNum < 1 || pageNum > this.totalPages) {
            return;
        }
        
        try {
            const page = await this.pdfDocument.getPage(pageNum);
            const viewport = page.getViewport({ scale: this.zoomLevel });
            
            // 创建canvas
            const canvas = document.createElement('canvas');
            canvas.className = 'pdf-page-canvas';
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            const context = canvas.getContext('2d');
            
            // 清空容器并添加canvas
            this.elements.viewerContainer.innerHTML = '';
            this.elements.viewerContainer.appendChild(canvas);
            
            // 渲染页面
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            // 缓存canvas
            this.pageCanvases.set(pageNum, canvas);
            
            // 如果有OCR结果，渲染区块
            if (this.showBlocks && window.pdfOCRViewer) {
                window.pdfOCRViewer.renderBlocks(pageNum);
            }
            
        } catch (error) {
            console.error('[PDF-OCR] 渲染页面失败:', error);
        }
    }
    
    /**
     * 跳转到指定页面
     */
    async goToPage(pageNum) {
        if (pageNum < 1 || pageNum > this.totalPages) {
            return;
        }
        
        this.currentPage = pageNum;
        
        // 更新UI
        this.elements.pageInput.value = pageNum;
        this.elements.prevPageBtn.disabled = pageNum === 1;
        this.elements.nextPageBtn.disabled = pageNum === this.totalPages;
        
        // 更新缩略图高亮
        const thumbnails = this.elements.pageThumbnails.querySelectorAll('.page-thumbnail');
        thumbnails.forEach(thumb => {
            thumb.classList.toggle('active', parseInt(thumb.dataset.page) === pageNum);
        });
        
        // 渲染页面
        if (this.currentFileType === 'pdf') {
            await this.renderPage(pageNum);
        }
        
        // 更新状态
        if (window.appState && window.appState.pdfOCRReader) {
            window.appState.pdfOCRReader.currentPage = pageNum;
        }
    }
    
    /**
     * 缩放控制
     */
    zoomIn() {
        this.setZoom(this.zoomLevel + 0.25);
    }
    
    zoomOut() {
        this.setZoom(Math.max(0.25, this.zoomLevel - 0.25));
    }
    
    setZoom(level) {
        this.zoomLevel = level;
        this.elements.zoomSelect.value = level.toFixed(2);
        
        if (this.currentFileType === 'pdf') {
            this.renderPage(this.currentPage);
        }
        
        if (window.appState && window.appState.pdfOCRReader) {
            window.appState.pdfOCRReader.viewerScale = level;
        }
    }
    
    fitToWidth() {
        // 适应宽度逻辑
        const containerWidth = this.elements.viewerContainer.clientWidth - 40;
        if (this.pdfDocument) {
            this.pdfDocument.getPage(this.currentPage).then(page => {
                const viewport = page.getViewport({ scale: 1 });
                const scale = containerWidth / viewport.width;
                this.setZoom(scale);
            });
        }
    }
    
    /**
     * 切换区块显示
     */
    toggleBlocks() {
        this.showBlocks = !this.showBlocks;
        this.elements.toggleBlocksBtn.classList.toggle('active', this.showBlocks);
        
        if (this.showBlocks && window.pdfOCRViewer) {
            window.pdfOCRViewer.renderBlocks(this.currentPage);
        } else {
            // 移除区块覆盖层
            const overlays = this.elements.viewerContainer.querySelectorAll('.ocr-block-overlay');
            overlays.forEach(overlay => overlay.remove());
        }
    }
    
    /**
     * 切换标签页
     */
    switchTab(tabName) {
        // 更新标签头
        this.elements.tabHeaders.forEach(header => {
            header.classList.toggle('active', header.dataset.tab === tabName);
        });
        
        // 更新面板
        this.elements.tabPanels.forEach(panel => {
            panel.classList.remove('active');
        });
        
        const targetPanel = document.getElementById(`tab_${tabName}`);
        if (targetPanel) {
            targetPanel.classList.add('active');
        }
    }
    
    /**
     * 更新结构化内容显示
     */
    updateStructuredContent() {
        if (!window.pdfOCRParser || !window.pdfOCRParser.ocrResults) {
            return;
        }
        
        const filters = {
            text: this.elements.filterText?.checked ?? true,
            table: this.elements.filterTable?.checked ?? true,
            formula: this.elements.filterFormula?.checked ?? false,
            image: this.elements.filterImage?.checked ?? false
        };
        
        window.pdfOCRParser.renderStructuredContent(filters);
    }
    
    /**
     * 移除文件
     */
    removeFile() {
        this.currentFile = null;
        this.currentFileType = null;
        this.pdfDocument = null;
        this.totalPages = 0;
        this.currentPage = 1;
        this.pageCanvases.clear();
        
        // 重置UI
        this.elements.fileInfo.style.display = 'none';
        this.elements.fileInput.value = '';
        this.elements.startOcrBtn.disabled = true;
        this.elements.viewerContainer.innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <p>请上传PDF或图片文件开始阅读</p>
            </div>
        `;
        this.elements.pageThumbnails.innerHTML = '<div class="empty-state">请先上传文件</div>';
        
        // 重置统计
        this.elements.statPages.textContent = '-';
        this.elements.statTexts.textContent = '-';
        this.elements.statTables.textContent = '-';
        this.elements.statFormulas.textContent = '-';
        
        // 重置内容
        this.elements.originalContent.textContent = '请先进行OCR解析';
        this.elements.structuredContent.innerHTML = '请先进行OCR解析';
        this.elements.translationContent.textContent = '请先进行OCR解析';
        
        // 禁用导出
        this.elements.exportJsonBtn.disabled = true;
        this.elements.exportMarkdownBtn.disabled = true;
        this.elements.exportTxtBtn.disabled = true;
        
        // 清除状态
        if (window.appState && window.appState.pdfOCRReader) {
            window.appState.pdfOCRReader.currentFile = null;
            window.appState.pdfOCRReader.ocrResults = null;
        }
        
        // 清除解析器结果
        if (window.pdfOCRParser) {
            window.pdfOCRParser.ocrResults = null;
        }
    }
    
    /**
     * 更新进度条
     */
    updateProgress(percent, text) {
        if (this.elements.progressBar) {
            this.elements.progressBar.style.width = `${percent}%`;
        }
        if (this.elements.progressText) {
            this.elements.progressText.textContent = text || `${percent}%`;
        }
    }
    
    /**
     * 显示/隐藏进度条
     */
    showProgress(show) {
        if (this.elements.progressContainer) {
            this.elements.progressContainer.style.display = show ? 'block' : 'none';
        }
    }
    
    /**
     * 导出JSON
     */
    exportJSON() {
        if (!window.pdfOCRParser || !window.pdfOCRParser.ocrResults) {
            alert('没有可导出的OCR结果');
            return;
        }
        
        const data = JSON.stringify(window.pdfOCRParser.ocrResults, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `ocr-result-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
    
    /**
     * 导出Markdown
     */
    exportMarkdown() {
        if (!window.pdfOCRParser || !window.pdfOCRParser.ocrResults) {
            alert('没有可导出的OCR结果');
            return;
        }
        
        let markdown = '# OCR解析结果\n\n';
        const results = window.pdfOCRParser.ocrResults;
        
        if (results.pages) {
            results.pages.forEach((page, index) => {
                markdown += `## 第${index + 1}页\n\n`;
                if (page.blocks) {
                    page.blocks.forEach(block => {
                        if (block.type === 'table') {
                            markdown += block.content + '\n\n';
                        } else if (block.type === 'formula') {
                            markdown += `$$${block.content}$$\n\n`;
                        } else {
                            markdown += block.content + '\n\n';
                        }
                    });
                }
            });
        }
        
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `ocr-result-${Date.now()}.md`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
    
    /**
     * 导出TXT
     */
    exportTXT() {
        if (!window.pdfOCRParser || !window.pdfOCRParser.ocrResults) {
            alert('没有可导出的OCR结果');
            return;
        }
        
        let text = 'OCR解析结果\n\n';
        const results = window.pdfOCRParser.ocrResults;
        
        if (results.pages) {
            results.pages.forEach((page, index) => {
                text += `=== 第${index + 1}页 ===\n\n`;
                if (page.blocks) {
                    page.blocks.forEach(block => {
                        text += block.content + '\n\n';
                    });
                }
            });
        }
        
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `ocr-result-${Date.now()}.txt`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
}

// 创建全局实例
window.pdfOCRCore = new PDFOCRCore();
