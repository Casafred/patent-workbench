/**
 * PDF-OCR 解析模块
 * 处理GLM-OCR API调用和结果解析
 * 支持智能缓存和页面范围解析
 */

class PDFOCRParser {
    constructor() {
        this.apiUrl = 'https://open.bigmodel.cn/api/paas/v4/layout_parsing';
        this.isParsing = false;
        this.currentTask = null;
        this.currentFileHash = null;
        this.init();
    }

    init() {
        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.elements = {
            startBtn: document.getElementById('start-ocr-btn'),
            parseMode: document.getElementById('ocr-parse-mode'),
            pageRangeGroup: document.getElementById('ocr-page-range-group'),
            pageRangeInput: document.getElementById('ocr-page-range-input'),
            useCache: document.getElementById('ocr-use-cache'),
            recognizeFormula: document.getElementById('ocr-recognize-formula'),
            recognizeTable: document.getElementById('ocr-recognize-table'),
            cacheStatus: document.getElementById('ocr-cache-status'),
            cacheText: document.querySelector('#ocr-cache-status .cache-text'),
            progressBar: document.getElementById('ocr-progress-bar'),
            progressText: document.getElementById('ocr-progress-text'),
            progressContainer: document.getElementById('ocr-progress-container')
        };
    }

    bindEvents() {
        const startBtn = document.getElementById('start-ocr-btn');
        if (startBtn) {
            startBtn.addEventListener('click', (e) => {
                const forceRefresh = e.shiftKey;
                this.startOCR(forceRefresh);
            });
        }

        const parseMode = document.getElementById('ocr-parse-mode');
        if (parseMode) {
            parseMode.addEventListener('change', () => {
                this.onParseModeChange();
                this.updateSettings();
            });
        }

        const pageRangeInput = document.getElementById('ocr-page-range-input');
        if (pageRangeInput) {
            pageRangeInput.addEventListener('input', () => {
                this.updateCacheStatus();
            });
        }

        const useCache = document.getElementById('ocr-use-cache');
        if (useCache) {
            useCache.addEventListener('change', () => {
                this.updateCacheStatus();
                this.updateSettings();
            });
        }

        const settings = ['ocr-recognize-formula', 'ocr-recognize-table'];
        settings.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => {
                    this.updateSettings();
                });
            }
        });
    }

    onParseModeChange() {
        const parseMode = document.getElementById('ocr-parse-mode');
        const pageRangeGroup = document.getElementById('ocr-page-range-group');
        
        if (parseMode && pageRangeGroup) {
            const mode = parseMode.value;
            pageRangeGroup.style.display = mode === 'range' ? 'block' : 'none';
        }
        
        this.updateCacheStatus();
    }

    async updateCacheStatus() {
        if (!window.pdfOCRCache) return;
        
        const cacheStatus = document.getElementById('ocr-cache-status');
        const cacheText = document.querySelector('#ocr-cache-status .cache-text');
        const useCache = document.getElementById('ocr-use-cache');
        
        if (!cacheStatus || !cacheText) return;
        
        const file = window.pdfOCRCore?.currentFile;
        if (!file) {
            cacheStatus.style.display = 'none';
            return;
        }
        
        const useCacheEnabled = useCache?.checked ?? true;
        if (!useCacheEnabled) {
            cacheStatus.style.display = 'block';
            cacheText.textContent = '缓存已禁用';
            cacheStatus.className = 'cache-status disabled';
            return;
        }
        
        const fileHash = await window.pdfOCRCache.generateFileHash(file);
        if (!fileHash) {
            cacheStatus.style.display = 'none';
            return;
        }
        
        this.currentFileHash = fileHash;
        
        const totalPages = window.pdfOCRCore?.totalPages || 1;
        const mode = document.getElementById('ocr-parse-mode')?.value || 'page';
        
        let statusText = '';
        let statusClass = '';
        
        if (mode === 'page') {
            const currentPage = window.pdfOCRCore?.currentPage || 1;
            const hasCache = window.pdfOCRCache.hasCache(fileHash, currentPage);
            if (hasCache) {
                statusText = `第${currentPage}页已有缓存`;
                statusClass = 'cached';
            } else {
                statusText = `第${currentPage}页无缓存`;
                statusClass = 'no-cache';
            }
        } else if (mode === 'range') {
            const rangeInput = document.getElementById('ocr-page-range-input')?.value || '';
            const pages = window.pdfOCRCache.parsePageRange(rangeInput, totalPages);
            if (pages.length === 0) {
                statusText = '请输入有效页码';
                statusClass = 'no-cache';
            } else {
                const cachedCount = pages.filter(p => window.pdfOCRCache.hasCache(fileHash, p)).length;
                if (cachedCount === pages.length) {
                    statusText = `${pages.length}页全部已缓存`;
                    statusClass = 'cached';
                } else if (cachedCount > 0) {
                    statusText = `${cachedCount}/${pages.length}页已缓存`;
                    statusClass = 'partial';
                } else {
                    statusText = `${pages.length}页无缓存`;
                    statusClass = 'no-cache';
                }
            }
        } else {
            const cacheInfo = window.pdfOCRCache.getCacheStatus(fileHash, totalPages);
            if (cacheInfo.hasFullCache) {
                statusText = `全部${totalPages}页已缓存`;
                statusClass = 'cached';
            } else if (cacheInfo.hasAnyCache) {
                statusText = `${cacheInfo.cachedPages.length}/${totalPages}页已缓存`;
                statusClass = 'partial';
            } else {
                statusText = '无缓存';
                statusClass = 'no-cache';
            }
        }
        
        cacheStatus.style.display = 'block';
        cacheText.textContent = statusText;
        cacheStatus.className = `cache-status ${statusClass}`;
    }

    async startOCR(forceRefresh = false) {
        const file = window.pdfOCRCore?.currentFile;
        if (!file) {
            this.showToast('请先上传PDF文件或图片', 'error');
            return;
        }

        const apiKey = await this.getAPIKey();
        if (!apiKey) {
            this.showToast('请先配置智谱AI API密钥', 'error');
            this.openSettingsPanel();
            return;
        }

        const settings = this.getSettings();
        const useCache = document.getElementById('ocr-use-cache')?.checked ?? true;
        
        if (!window.pdfOCRCache) {
            console.warn('[PDF-OCR-Parser] 缓存管理器未初始化');
        }
        
        const fileHash = this.currentFileHash || await window.pdfOCRCache?.generateFileHash(file);
        
        console.log('[PDF-OCR-Parser] startOCR:');
        console.log('  - settings.mode:', settings.mode);
        console.log('  - useCache:', useCache);
        console.log('  - forceRefresh:', forceRefresh);
        console.log('  - fileHash:', fileHash);

        try {
            this.isParsing = true;
            this.updateUIState('parsing');

            if (settings.mode === 'page') {
                await this.parseCurrentPage(file, apiKey, fileHash, useCache, forceRefresh);
            } else if (settings.mode === 'range') {
                await this.parsePageRange(file, apiKey, fileHash, useCache, forceRefresh, settings.pageRange);
            } else {
                await this.parseAllPages(file, apiKey, fileHash, useCache, forceRefresh);
            }

        } catch (error) {
            console.error('OCR解析失败:', error);
            this.showToast(`解析失败: ${error.message}`, 'error');
        } finally {
            this.isParsing = false;
            this.updateUIState('idle');
            this.updateCacheStatus();
        }
    }

    async parseCurrentPage(file, apiKey, fileHash, useCache, forceRefresh) {
        const pageNum = window.pdfOCRCore?.currentPage || 1;
        const totalPages = window.pdfOCRCore?.totalPages || 1;
        
        if (useCache && !forceRefresh && window.pdfOCRCache?.hasCache(fileHash, pageNum)) {
            console.log(`[PDF-OCR-Parser] 使用缓存: 第${pageNum}页`);
            this.updateProgress(50, `使用缓存: 第${pageNum}页...`);
            
            const cachedResult = window.pdfOCRCache.getCache(fileHash, pageNum);
            if (cachedResult) {
                this.handleParseResult(cachedResult, true);
                this.showToast(`第${pageNum}页使用缓存结果`, 'success');
                return;
            }
        }

        this.updateProgress(10, `正在解析第${pageNum}页...`);
        
        const fileData = await this.prepareFileDataForPage(file, pageNum);
        const result = await this.callGLMOCR(fileData, apiKey, {});
        const normalizedResult = this.normalizeResult(result, pageNum);
        
        if (useCache && window.pdfOCRCache) {
            window.pdfOCRCache.setCache(fileHash, pageNum, normalizedResult);
            console.log(`[PDF-OCR-Parser] 已缓存: 第${pageNum}页`);
        }
        
        this.handleParseResult(normalizedResult, true);
        this.showToast(`第${pageNum}页OCR解析完成`, 'success');
    }

    async parsePageRange(file, apiKey, fileHash, useCache, forceRefresh, pageRangeStr) {
        const totalPages = window.pdfOCRCore?.totalPages || 1;
        const pages = window.pdfOCRCache?.parsePageRange(pageRangeStr, totalPages) || [];
        
        if (pages.length === 0) {
            throw new Error('请输入有效的页面范围');
        }
        
        console.log(`[PDF-OCR-Parser] 解析页面范围: ${pages.join(', ')}`);
        
        let cachedCount = 0;
        let newParseCount = 0;
        
        for (let i = 0; i < pages.length; i++) {
            const pageNum = pages[i];
            const progress = Math.round(((i + 1) / pages.length) * 100);
            
            if (useCache && !forceRefresh && window.pdfOCRCache?.hasCache(fileHash, pageNum)) {
                this.updateProgress(progress, `使用缓存: 第${pageNum}页 (${i + 1}/${pages.length})`);
                
                const cachedResult = window.pdfOCRCache.getCache(fileHash, pageNum);
                if (cachedResult) {
                    this.handleParseResult(cachedResult, true);
                    cachedCount++;
                }
                continue;
            }
            
            this.updateProgress(progress, `正在解析第${pageNum}页 (${i + 1}/${pages.length})...`);
            
            const fileData = await this.prepareFileDataForPage(file, pageNum);
            const result = await this.callGLMOCR(fileData, apiKey, {});
            const normalizedResult = this.normalizeResult(result, pageNum);
            
            if (useCache && window.pdfOCRCache) {
                window.pdfOCRCache.setCache(fileHash, pageNum, normalizedResult);
            }
            
            this.handleParseResult(normalizedResult, true);
            newParseCount++;
            
            if (i < pages.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        let message = '解析完成';
        if (cachedCount > 0 && newParseCount > 0) {
            message = `解析完成 (${newParseCount}页新解析, ${cachedCount}页缓存)`;
        } else if (cachedCount > 0) {
            message = `全部使用缓存 (${cachedCount}页)`;
        } else {
            message = `解析完成 (${newParseCount}页)`;
        }
        this.showToast(message, 'success');
    }

    async parseAllPages(file, apiKey, fileHash, useCache, forceRefresh) {
        const totalPages = window.pdfOCRCore?.totalPages || 1;
        
        console.log(`[PDF-OCR-Parser] 解析全部页面: 共${totalPages}页`);
        
        let cachedCount = 0;
        let newParseCount = 0;
        
        for (let i = 1; i <= totalPages; i++) {
            const progress = Math.round((i / totalPages) * 100);
            
            if (useCache && !forceRefresh && window.pdfOCRCache?.hasCache(fileHash, i)) {
                this.updateProgress(progress, `使用缓存: 第${i}页 (${i}/${totalPages})`);
                
                const cachedResult = window.pdfOCRCache.getCache(fileHash, i);
                if (cachedResult) {
                    this.handleParseResult(cachedResult, true);
                    cachedCount++;
                }
                continue;
            }
            
            this.updateProgress(progress, `正在解析第${i}页 (${i}/${totalPages})...`);
            
            const fileData = await this.prepareFileDataForPage(file, i);
            const result = await this.callGLMOCR(fileData, apiKey, {});
            const normalizedResult = this.normalizeResult(result, i);
            
            if (useCache && window.pdfOCRCache) {
                window.pdfOCRCache.setCache(fileHash, i, normalizedResult);
            }
            
            this.handleParseResult(normalizedResult, true);
            newParseCount++;
            
            if (i < totalPages) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        let message = '全部页面解析完成';
        if (cachedCount > 0 && newParseCount > 0) {
            message = `解析完成 (${newParseCount}页新解析, ${cachedCount}页缓存)`;
        } else if (cachedCount > 0) {
            message = `全部使用缓存 (${cachedCount}页)`;
        } else {
            message = `解析完成 (${newParseCount}页)`;
        }
        this.showToast(message, 'success');
    }

    async getAPIKey() {
        let apiKey = window.appState?.apiKey || '';
        if (!apiKey) {
            apiKey = localStorage.getItem('globalApiKey') || '';
        }
        if (!apiKey) {
            apiKey = localStorage.getItem('zhipu_api_key') || '';
        }
        return apiKey;
    }

    getSettings() {
        const modeElement = document.getElementById('ocr-parse-mode');
        const mode = modeElement?.value || 'page';
        const pageRange = document.getElementById('ocr-page-range-input')?.value || '';
        const useCache = document.getElementById('ocr-use-cache')?.checked ?? true;
        const recognizeFormula = document.getElementById('ocr-recognize-formula')?.checked ?? true;
        const recognizeTable = document.getElementById('ocr-recognize-table')?.checked ?? true;

        return {
            mode,
            pageRange,
            useCache,
            recognizeFormula,
            recognizeTable
        };
    }

    async prepareFileDataForPage(file, pageNum) {
        const fileType = window.pdfOCRCore?.currentFileType;

        if (fileType === 'pdf') {
            if (!window.pdfOCRCore?.pdfDocument) {
                throw new Error('PDF文档未加载');
            }
            
            const imageBlob = await this.pdfPageToImage(pageNum);
            const imageFile = new File([imageBlob], `page_${pageNum}.png`, { type: 'image/png' });
            return {
                type: 'image',
                data: imageFile
            };
        } else {
            return {
                type: 'image',
                data: file
            };
        }
    }

    async prepareFileData(file) {
        return this.prepareFileDataForPage(file, window.pdfOCRCore?.currentPage || 1);
    }

    async pdfPageToImage(pageNum) {
        if (!window.pdfOCRCore?.pdfDocument) {
            throw new Error('PDF文档未加载');
        }

        const page = await window.pdfOCRCore.pdfDocument.getPage(pageNum);
        const scale = 2.0;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/png', 0.95);
        });
    }

    async callGLMOCR(fileData, apiKey, settings) {
        const base64Data = await this.fileToBase64(fileData.data);
        
        const requestBody = {
            model: "glm-ocr",
            file: base64Data
        };

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

    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                resolve(reader.result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    handleParseResult(result, appendMode = false) {
        const normalizedResult = result.pages ? result : this.normalizeResult(result);
        
        console.log('[PDF-OCR-Parser] 解析结果处理:');
        console.log('  - appendMode:', appendMode);
        console.log('  - normalizedResult.pages:', normalizedResult?.pages?.map(p => ({ pageIndex: p.pageIndex, blocksCount: p.blocks?.length })));
        
        this.currentTask = normalizedResult;

        if (window.state) {
            window.state.set('ocrResult', normalizedResult);
        }

        if (window.pdfOCRViewer) {
            window.pdfOCRViewer.setOCRResult(normalizedResult, appendMode);
        }

        this.updateOriginalContent(normalizedResult);
        this.updateMarkdownContent(result);
        this.enableExportButtons();
        this.updatePageThumbnailStatus(normalizedResult);

        this.emit('parseComplete', normalizedResult);
    }

    updatePageThumbnailStatus(result) {
        if (!result || !result.pages) return;
        
        result.pages.forEach(page => {
            const statusEl = document.getElementById(`ocr-status-${page.pageIndex}`);
            if (statusEl) {
                statusEl.innerHTML = '✓';
                statusEl.className = 'ocr-status parsed';
                statusEl.title = '已解析';
            }
        });
    }

    enableExportButtons() {
        const exportJsonBtn = document.getElementById('ocr-export-json');
        const exportMarkdownBtn = document.getElementById('ocr-export-markdown');
        const exportTxtBtn = document.getElementById('ocr-export-text');

        if (exportJsonBtn) exportJsonBtn.disabled = false;
        if (exportMarkdownBtn) exportMarkdownBtn.disabled = false;
        if (exportTxtBtn) exportTxtBtn.disabled = false;
    }

    normalizeResult(result, pageNum = null) {
        if (!result) return null;

        if (result.pages) {
            return result;
        }

        const currentPageNum = pageNum || window.pdfOCRCore?.currentPage || 1;

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

        if (result.layout_details && Array.isArray(result.layout_details)) {
            result.layout_details.forEach((pageBlocks, apiPageIndex) => {
                const pageInfo = result.data_info?.pages?.[apiPageIndex] || {};
                const actualPageNum = currentPageNum;
                
                const page = {
                    pageIndex: actualPageNum,
                    width: pageInfo.width || 1224,
                    height: pageInfo.height || 1584,
                    blocks: []
                };

                if (Array.isArray(pageBlocks)) {
                    pageBlocks.forEach((block, blockIndex) => {
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

    mapLabelToType(label, nativeLabel) {
        const labelMap = {
            'text': 'text',
            'table': 'table',
            'formula': 'formula',
            'image': 'image'
        };
        
        if (labelMap[label]) {
            return labelMap[label];
        }
        
        if (nativeLabel?.includes('title')) return 'title';
        if (nativeLabel?.includes('table')) return 'table';
        if (nativeLabel?.includes('formula')) return 'formula';
        if (nativeLabel?.includes('image')) return 'image';
        
        return 'text';
    }

    updateMarkdownContent(result) {
        const container = document.getElementById('ocr-markdown-content');
        if (!container) return;

        const mdContent = result.md_results || result.markdown || '无Markdown内容';
        
        if (typeof marked !== 'undefined') {
            try {
                container.innerHTML = marked.parse(mdContent);
                container.classList.add('markdown-body');
                return;
            } catch (e) {
                console.warn('[PDF-OCR] Markdown渲染失败:', e);
            }
        }
        
        container.innerHTML = `<pre class="markdown-body">${this.escapeHtml(mdContent)}</pre>`;
    }

    updateOriginalContent(result) {
        const container = document.getElementById('ocr-original-content');
        if (!container || !result) return;

        let html = '';

        if (result.pages) {
            result.pages.forEach((page, index) => {
                html += `<div class="page-content" data-page="${page.pageIndex}">`;
                html += `<h4>第 ${page.pageIndex} 页</h4>`;

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

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateProgress(percent, text) {
        const progressBar = document.getElementById('ocr-progress-bar');
        const progressText = document.getElementById('ocr-progress-text');
        const progressContainer = document.getElementById('ocr-progress-container');
        
        if (progressContainer) {
            progressContainer.style.display = 'block';
        }
        if (progressBar) {
            progressBar.style.width = `${percent}%`;
        }
        if (progressText) {
            progressText.textContent = text || `${percent}%`;
        }
    }

    updateUIState(state) {
        const startBtn = document.getElementById('start-ocr-btn');
        const progressBar = document.getElementById('ocr-progress-bar');
        const progressText = document.getElementById('ocr-progress-text');
        const progressContainer = document.getElementById('ocr-progress-container');

        switch (state) {
            case 'parsing':
                if (startBtn) {
                    startBtn.disabled = true;
                    startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 解析中...';
                }
                if (progressContainer) {
                    progressContainer.style.display = 'block';
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
                setTimeout(() => {
                    if (progressContainer) {
                        progressContainer.style.display = 'none';
                    }
                }, 1000);
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

    openSettingsPanel() {
        this.emit('openSettings');
    }

    updateSettings() {
        const settings = this.getSettings();
        if (window.state) {
            window.state.set('ocrSettings', settings);
        }
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `ocr-toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'info' ? 'info-circle' : 'exclamation-circle'}"></i>
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

    exportMarkdown() {
        const allPages = this.getAllParsedPages();
        if (!allPages || allPages.length === 0) {
            this.showToast('暂无解析结果', 'error');
            return;
        }

        let markdown = '';

        allPages.forEach((page, index) => {
            markdown += `## 第 ${page.pageIndex} 页\n\n`;

            if (page.blocks) {
                page.blocks.forEach(block => {
                    markdown += this.blockToMarkdown(block);
                });
            }

            markdown += '\n---\n\n';
        });

        this.downloadFile(markdown, 'ocr-result.md', 'text/markdown');
    }

    getAllParsedPages() {
        if (window.pdfOCRViewer && window.pdfOCRViewer.pageResults) {
            const pages = [];
            const sortedKeys = [...window.pdfOCRViewer.pageResults.keys()].sort((a, b) => a - b);
            sortedKeys.forEach(key => {
                pages.push(window.pdfOCRViewer.pageResults.get(key));
            });
            if (pages.length > 0) {
                return pages;
            }
        }
        
        if (this.currentTask && this.currentTask.pages) {
            return this.currentTask.pages;
        }
        
        return null;
    }

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

    exportText() {
        const allPages = this.getAllParsedPages();
        if (!allPages || allPages.length === 0) {
            this.showToast('暂无解析结果', 'error');
            return;
        }

        let text = '';

        allPages.forEach((page, index) => {
            text += `=== 第 ${page.pageIndex} 页 ===\n\n`;

            if (page.blocks) {
                page.blocks.forEach(block => {
                    text += this.blockToText(block);
                });
            }

            text += '\n';
        });

        this.downloadFile(text, 'ocr-result.txt', 'text/plain');
    }

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

    exportJSON() {
        const allPages = this.getAllParsedPages();
        if (!allPages || allPages.length === 0) {
            this.showToast('暂无解析结果', 'error');
            return;
        }

        const exportData = {
            exportTime: new Date().toISOString(),
            totalPages: allPages.length,
            pages: allPages
        };

        const json = JSON.stringify(exportData, null, 2);
        this.downloadFile(json, 'ocr-result.json', 'application/json');
    }

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

    emit(eventName, data) {
        const event = new CustomEvent(`pdfocr:${eventName}`, { detail: data });
        document.dispatchEvent(event);
    }

    on(eventName, callback) {
        document.addEventListener(`pdfocr:${eventName}`, (e) => callback(e.detail));
    }

    getCurrentResult() {
        return this.currentTask;
    }

    clear() {
        this.currentTask = null;
        this.isParsing = false;
        
        const container = document.getElementById('ocr-original-content');
        if (container) {
            container.innerHTML = '<p class="empty">请先上传文件并进行OCR解析</p>';
        }
    }
}

window.PDFOCRParser = PDFOCRParser;
window.pdfOCRParser = null;
