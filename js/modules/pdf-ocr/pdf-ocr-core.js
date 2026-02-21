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
            fileInput: document.getElementById('ocr-file-input'),
            fileInfo: document.getElementById('pdf_file_info'),
            fileName: document.getElementById('pdf_file_name'),
            removeFileBtn: document.getElementById('pdf_remove_file_btn'),
            
            // OCR控制
            ocrScopeSelect: document.getElementById('ocr-parse-mode'),
            ocrLanguageSelect: document.getElementById('ocr-translate-target'),
            startOcrBtn: document.getElementById('start-ocr-btn'),
            progressContainer: document.getElementById('ocr-progress-container'),
            progressBar: document.getElementById('ocr-progress-bar'),
            progressText: document.getElementById('ocr-progress-text'),
            
            // 页面导航
            pageThumbnails: document.getElementById('page_thumbnails'),
            
            // 阅读器
            viewerContainer: document.getElementById('pdf-canvas'),
            prevPageBtn: document.getElementById('viewer_prev_page'),
            nextPageBtn: document.getElementById('viewer_next_page'),
            pageInput: document.getElementById('viewer_page_input'),
            totalPages: document.getElementById('viewer_total_pages'),
            zoomSelect: document.getElementById('viewer_zoom_select'),
            zoomOutBtn: document.getElementById('viewer_zoom_out'),
            zoomInBtn: document.getElementById('viewer_zoom_in'),
            toggleBlocksBtn: document.getElementById('toggle-ocr-blocks'),
            
            // 内容标签页
            tabHeaders: document.querySelectorAll('.tab-header'),
            tabPanels: document.querySelectorAll('.tab-content-panel'),
            originalContent: document.getElementById('ocr-original-content'),
            structuredContent: document.getElementById('ocr-structured-content'),
            translationContent: document.getElementById('ocr-translation-content'),
            
            // 过滤器 - 使用区块筛选器替代
            blockFilter: document.getElementById('ocr-block-filter'),
            
            // 统计
            statTotal: document.getElementById('ocr-stat-total'),
            statText: document.getElementById('ocr-stat-text'),
            statTable: document.getElementById('ocr-stat-table'),
            statFormula: document.getElementById('ocr-stat-formula'),
            statImage: document.getElementById('ocr-stat-image'),
            
            // 导出
            exportJsonBtn: document.getElementById('ocr-export-json'),
            exportMarkdownBtn: document.getElementById('ocr-export-markdown'),
            exportTxtBtn: document.getElementById('ocr-export-text')
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
        
        // 标签页切换（如果存在）
        if (this.elements.tabHeaders && this.elements.tabHeaders.length > 0) {
            this.elements.tabHeaders.forEach(header => {
                header.addEventListener('click', () => {
                    const tabName = header.dataset.tab;
                    this.switchTab(tabName);
                });
            });
        }
        
        // 区块筛选器
        if (this.elements.blockFilter) {
            this.elements.blockFilter.addEventListener('change', () => {
                if (window.pdfOCRViewer) {
                    window.pdfOCRViewer.filterType = this.elements.blockFilter.value;
                    window.pdfOCRViewer.updateBlockVisibility();
                }
            });
        }
        
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
        
        // 更新缓存状态显示
        if (window.pdfOCRParser) {
            window.pdfOCRParser.updateCacheStatus();
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
            if (this.elements.statTotal) this.elements.statTotal.textContent = this.totalPages;
            
            // PDF加载完成后，重新创建选择层
            if (window.pdfOCRSelection) {
                window.pdfOCRSelection.recreateSelectionLayer();
            }
            
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
        
        // 保存区块层引用
        const blocksLayer = document.getElementById('ocr-blocks-layer');
        
        // 清空容器
        this.elements.viewerContainer.innerHTML = '';
        
        // 创建图片元素
        const img = document.createElement('img');
        img.src = url;
        img.className = 'pdf-image-display';
        img.style.display = 'block';
        
        // 等待图片加载完成
        await new Promise((resolve) => {
            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve();
            };
            img.onerror = () => {
                console.error('[PDF-OCR] 图片加载失败');
                resolve();
            };
        });
        
        this.elements.viewerContainer.appendChild(img);
        
        // 重新添加区块层
        if (blocksLayer) {
            this.elements.viewerContainer.appendChild(blocksLayer);
        }
        
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
        if (this.elements.statTotal) this.elements.statTotal.textContent = 1;
        
        // 图片加载完成后，渲染区块和创建选择层
        if (window.pdfOCRViewer) {
            window.pdfOCRViewer.renderBlocks();
        }
        if (window.pdfOCRSelection) {
            window.pdfOCRSelection.recreateSelectionLayer();
        }
    }
    
    /**
     * 渲染页面缩略图
     */
    async renderPageThumbnails() {
        // 如果页面中没有缩略图容器，则跳过
        if (!this.elements.pageThumbnails) {
            console.log('[PDF-OCR] 页面缩略图容器不存在，跳过渲染');
            return;
        }
        
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
        if (!this.elements.pageThumbnails) return;
        
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
            
            // 保存区块层引用
            const blocksLayer = document.getElementById('ocr-blocks-layer');
            
            // 清空容器并添加canvas
            this.elements.viewerContainer.innerHTML = '';
            this.elements.viewerContainer.appendChild(canvas);
            
            // 重新添加区块层
            if (blocksLayer) {
                this.elements.viewerContainer.appendChild(blocksLayer);
            }
            
            // 渲染页面
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            // 缓存canvas
            this.pageCanvases.set(pageNum, canvas);
            
            // 如果有OCR结果，渲染区块
            if (window.pdfOCRViewer) {
                window.pdfOCRViewer.renderBlocks();
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
        
        console.log('[PDF-OCR-Core] goToPage:', pageNum);
        
        this.currentPage = pageNum;
        
        // 更新UI
        this.elements.pageInput.value = pageNum;
        this.elements.prevPageBtn.disabled = pageNum === 1;
        this.elements.nextPageBtn.disabled = pageNum === this.totalPages;
        
        // 更新缩略图高亮
        if (this.elements.pageThumbnails) {
            const thumbnails = this.elements.pageThumbnails.querySelectorAll('.page-thumbnail');
            thumbnails.forEach(thumb => {
                thumb.classList.toggle('active', parseInt(thumb.dataset.page) === pageNum);
            });
        }
        
        // 渲染页面
        if (this.currentFileType === 'pdf') {
            await this.renderPage(pageNum);
        }
        
        // 更新状态
        if (window.appState && window.appState.pdfOCRReader) {
            window.appState.pdfOCRReader.currentPage = pageNum;
        }

        console.log('[PDF-OCR-Core] goToPage完成，调用viewer更新');
        
        // 触发页面切换事件，让viewer重新渲染区块和更新结果列表
        if (window.pdfOCRViewer) {
            console.log('[PDF-OCR-Core] viewer.ocrBlocks数量:', window.pdfOCRViewer.ocrBlocks.length);
            console.log('[PDF-OCR-Core] viewer.pageResults keys:', [...window.pdfOCRViewer.pageResults.keys()]);
            window.pdfOCRViewer.renderBlocks();
            window.pdfOCRViewer.updateStructuredContent();
        }
        
        // 更新缓存状态显示
        if (window.pdfOCRParser) {
            window.pdfOCRParser.updateCacheStatus();
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
        // 将缩放级别转换为与option值匹配的格式
        const zoomValue = level.toString();
        // 尝试找到匹配的option值
        const options = Array.from(this.elements.zoomSelect.options);
        const matchedOption = options.find(opt => parseFloat(opt.value) === level);
        if (matchedOption) {
            this.elements.zoomSelect.value = matchedOption.value;
        } else {
            this.elements.zoomSelect.value = zoomValue;
        }
        
        if (this.currentFileType === 'pdf') {
            this.renderPage(this.currentPage);
        } else if (this.currentFileType === 'image') {
            this.renderImage();
        }
        
        if (window.appState && window.appState.pdfOCRReader) {
            window.appState.pdfOCRReader.viewerScale = level;
        }
    }
    
    /**
     * 渲染图片（支持缩放）
     */
    renderImage() {
        const img = this.elements.viewerContainer.querySelector('.pdf-image-display');
        if (!img) return;
        
        // 应用缩放 - 使用width/height而不是transform，避免定位问题
        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;
        img.style.width = `${naturalWidth * this.zoomLevel}px`;
        img.style.height = `${naturalHeight * this.zoomLevel}px`;
        img.style.transform = 'none';
        
        // 渲染区块
        if (window.pdfOCRViewer) {
            window.pdfOCRViewer.renderBlocks();
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
     * 切换区块显示（同时切换多选模式）
     */
    toggleBlocks() {
        this.showBlocks = !this.showBlocks;
        this.elements.toggleBlocksBtn.classList.toggle('active', this.showBlocks);
        
        // 更新按钮文本
        if (this.elements.toggleBlocksBtn) {
            this.elements.toggleBlocksBtn.textContent = this.showBlocks ? '退出多选' : '多选模式';
        }
        
        const blocksLayer = document.getElementById('ocr-blocks-layer');
        
        if (this.showBlocks && window.pdfOCRViewer) {
            // 显示区块层并进入多选模式
            if (blocksLayer) {
                blocksLayer.style.display = 'block';
            }
            // 设置多选模式
            window.pdfOCRViewer.isMultiSelectMode = true;
            window.pdfOCRViewer.renderBlocks();
        } else {
            // 隐藏区块层并退出多选模式
            if (blocksLayer) {
                blocksLayer.style.display = 'none';
            }
            // 退出多选模式，清空选中
            if (window.pdfOCRViewer) {
                window.pdfOCRViewer.isMultiSelectMode = false;
                window.pdfOCRViewer.selectedBlocks = [];
                window.pdfOCRViewer.selectedBlock = null;
            }
        }
    }
    
    /**
     * 切换标签页
     */
    switchTab(tabName) {
        // 更新标签头（如果存在）
        if (this.elements.tabHeaders) {
            this.elements.tabHeaders.forEach(header => {
                header.classList.toggle('active', header.dataset.tab === tabName);
            });
        }
        
        // 更新面板（如果存在）
        if (this.elements.tabPanels) {
            this.elements.tabPanels.forEach(panel => {
                panel.classList.remove('active');
            });
        }
        
        const targetPanel = document.getElementById(`tab_${tabName}`);
        if (targetPanel) {
            targetPanel.classList.add('active');
        }
    }
    
    /**
     * 更新结构化内容显示
     */
    updateStructuredContent() {
        // 结构化内容更新由 pdfOCRViewer 处理
        if (window.pdfOCRViewer) {
            window.pdfOCRViewer.updateStructuredContent();
        }
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
        if (this.elements.statTotal) this.elements.statTotal.textContent = '-';
        if (this.elements.statText) this.elements.statText.textContent = '-';
        if (this.elements.statTable) this.elements.statTable.textContent = '-';
        if (this.elements.statFormula) this.elements.statFormula.textContent = '-';
        if (this.elements.statImage) this.elements.statImage.textContent = '-';
        
        // 重置内容（如果元素存在）
        if (this.elements.originalContent) this.elements.originalContent.textContent = '请先进行OCR解析';
        if (this.elements.structuredContent) this.elements.structuredContent.innerHTML = '请先进行OCR解析';
        if (this.elements.translationContent) this.elements.translationContent.textContent = '请先进行OCR解析';
        
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
        
        // 清除viewer的多页缓存
        if (window.pdfOCRViewer) {
            window.pdfOCRViewer.clearAll();
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
        // 调用parser的导出方法
        if (window.pdfOCRParser) {
            window.pdfOCRParser.exportJSON();
        } else {
            alert('导出功能未初始化');
        }
    }
    
    /**
     * 导出Markdown
     */
    exportMarkdown() {
        // 调用parser的导出方法
        if (window.pdfOCRParser) {
            window.pdfOCRParser.exportMarkdown();
        } else {
            alert('导出功能未初始化');
        }
    }
    
    /**
     * 导出TXT
     */
    exportTXT() {
        // 调用parser的导出方法
        if (window.pdfOCRParser) {
            window.pdfOCRParser.exportText();
        } else {
            alert('导出功能未初始化');
        }
    }
}

// 暴露类定义（供 pdf-ocr-init.js 使用）
window.PDFOCRCore = PDFOCRCore;
window.pdfOCRCore = null;
