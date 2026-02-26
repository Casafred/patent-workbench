/**
 * PDF-OCR 阅读器视图模块
 * 处理OCR区块的可视化渲染、选中和交互
 */

class PDFOCRViewer {
    constructor() {
        this.ocrBlocks = [];
        this.pageResults = new Map(); // 按页面存储OCR结果
        this.selectedBlock = null;
        this.selectedBlocks = []; // 多选区块
        this.highlightedBlock = null;
        this.blockOverlays = new Map();
        this.isBlockMode = false;
        this.isMultiSelectMode = false; // 多选模式（显示全部区块时启用）
        this.filterType = 'all';
        this.colors = {
            text: 'rgba(34, 197, 94, 0.3)',
            table: 'rgba(59, 130, 246, 0.3)',
            formula: 'rgba(168, 85, 247, 0.3)',
            image: 'rgba(249, 115, 22, 0.3)',
            selected: 'rgba(234, 179, 8, 0.5)',
            hover: 'rgba(34, 197, 94, 0.5)'
        };
        this.borderColors = {
            text: '#22c55e',
            table: '#3b82f6',
            formula: '#a855f7',
            image: '#f97316',
            selected: '#eab308'
        };
        this.init();
    }

    init() {
        this.initElements();
        this.bindEvents();
        this.initFloatingPanel();
        this.setupResizeListener();
    }

    initElements() {
        // 初始化元素引用（可在DOM加载后重新调用）
        this.elements = {
            filterSelect: document.getElementById('ocr-block-filter'),
            toggleBtn: document.getElementById('toggle-ocr-blocks'),
            container: document.getElementById('pdf-ocr-container'),
            blocksLayer: document.getElementById('ocr-blocks-layer'),
            structuredContent: document.getElementById('ocr-structured-content'),
            blockDetails: document.getElementById('ocr-block-details'),
            viewerWrap: document.querySelector('.viewer-wrap'),
            floatingPanel: document.getElementById('floating-text-panel'),
            toggleTextPanelBtn: document.getElementById('toggle-text-panel')
        };
    }

    bindEvents() {
        // 区块类型筛选
        const filterSelect = document.getElementById('ocr-block-filter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.filterType = e.target.value;
                this.updateBlockVisibility();
            });
        }

        // 显示/隐藏区块按钮
        const toggleBtn = document.getElementById('toggle-ocr-blocks');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.toggleBlockMode();
            });
        }

        // 全选区块按钮
        const selectAllBtn = document.getElementById('select-all-blocks-btn');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
                this.selectAllBlocksInPage();
            });
        }

        // 取消全选区块按钮
        const deselectAllBtn = document.getElementById('deselect-all-blocks-btn');
        if (deselectAllBtn) {
            deselectAllBtn.addEventListener('click', () => {
                this.deselectAllBlocks();
            });
        }

        // 打开/关闭识别文本面板
        const toggleTextPanelBtn = document.getElementById('toggle-text-panel');
        if (toggleTextPanelBtn) {
            toggleTextPanelBtn.addEventListener('click', () => {
                this.toggleFloatingPanel();
            });
        }

        // 查看器点击事件 - 根据点击位置找到最近的区块
        const viewerWrap = document.querySelector('.viewer-wrap');
        if (viewerWrap) {
            viewerWrap.addEventListener('click', (e) => {
                // 如果点击的是区块覆盖层，不处理（由区块自己的点击事件处理）
                if (e.target.closest('.ocr-block-overlay')) return;
                
                // 如果没有OCR结果，不处理
                if (this.ocrBlocks.length === 0) {
                    console.log('[PDF-OCR] 没有OCR区块数据');
                    return;
                }
                
                // 获取点击位置相对于图片的坐标
                const result = this.getClickPositionOnImage(e, viewerWrap);
                if (result) {
                    console.log('[PDF-OCR] 点击坐标:', result);
                    const nearestBlock = this.findNearestBlock(result.x, result.y, result.pageIndex);
                    if (nearestBlock) {
                        console.log('[PDF-OCR] 找到最近区块:', nearestBlock);
                        this.selectBlock(nearestBlock, e.ctrlKey || e.metaKey);
                    } else {
                        console.log('[PDF-OCR] 未找到附近区块');
                    }
                }
            });
        }

        // 内容标签页切换
        const contentTabBtns = document.querySelectorAll('.floating-text-panel .tab-btn');
        contentTabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchContentTab(tabName);
            });
        });

        // 多页拼接按钮
        const multiPageConcatBtn = document.getElementById('multi-page-concat-btn');
        if (multiPageConcatBtn) {
            multiPageConcatBtn.addEventListener('click', () => {
                this.openMultiPageConcatPopup();
            });
        }
    }

    /**
     * 获取点击位置相对于PDF图片的坐标
     */
    getClickPositionOnImage(e, viewerWrap) {
        const pdfCanvas = document.getElementById('pdf-canvas');
        const pdfImage = pdfCanvas ? pdfCanvas.querySelector('img, canvas') : null;
        
        if (!pdfImage) {
            console.log('[PDF-OCR] 未找到PDF图片元素');
            return null;
        }
        
        const imageRect = pdfImage.getBoundingClientRect();
        
        // 计算点击位置相对于图片的坐标（屏幕坐标）
        const clickX = e.clientX - imageRect.left;
        const clickY = e.clientY - imageRect.top;
        
        // 获取第一个区块的page_width和page_height作为参考
        // 因为区块的bbox坐标是基于这个尺寸的
        let pageWidth = null;
        let pageHeight = null;
        for (const block of this.ocrBlocks) {
            if (block.bbox && block.bbox.page_width && block.bbox.page_height) {
                pageWidth = block.bbox.page_width;
                pageHeight = block.bbox.page_height;
                break;
            }
        }
        
        // 如果没有找到page尺寸，使用图片的自然尺寸
        if (!pageWidth || !pageHeight) {
            if (pdfImage.tagName === 'IMG') {
                pageWidth = pdfImage.naturalWidth;
                pageHeight = pdfImage.naturalHeight;
            } else if (pdfImage.tagName === 'CANVAS') {
                pageWidth = pdfImage.width;
                pageHeight = pdfImage.height;
            } else {
                pageWidth = pdfImage.offsetWidth;
                pageHeight = pdfImage.offsetHeight;
            }
        }
        
        // 计算缩放比例（与区块渲染一致）
        // 区块渲染: scaleX = pdfImage.offsetWidth / page_width
        // 所以点击转换: originalX = clickX * (page_width / pdfImage.offsetWidth)
        const scaleX = pageWidth / pdfImage.offsetWidth;
        const scaleY = pageHeight / pdfImage.offsetHeight;
        
        // 转换为原始坐标
        const originalX = clickX * scaleX;
        const originalY = clickY * scaleY;
        
        // 获取当前页码
        const pageIndex = window.pdfOCRCore ? window.pdfOCRCore.currentPage : 1;
        
        console.log('[PDF-OCR] 页面尺寸:', pageWidth, 'x', pageHeight);
        console.log('[PDF-OCR] 显示尺寸:', pdfImage.offsetWidth, 'x', pdfImage.offsetHeight);
        console.log('[PDF-OCR] 缩放比例:', scaleX.toFixed(3), scaleY.toFixed(3));
        console.log('[PDF-OCR] 点击位置: 屏幕=', clickX.toFixed(1), clickY.toFixed(1), ', 原始=', originalX.toFixed(1), originalY.toFixed(1));
        
        return {
            x: originalX,
            y: originalY,
            pageIndex: pageIndex
        };
    }

    /**
     * 根据坐标找到最近的区块
     */
    findNearestBlock(x, y, pageIndex) {
        if (this.ocrBlocks.length === 0) return null;
        
        let nearestBlock = null;
        let minDistance = Infinity;
        const threshold = 1000; // 最大搜索距离（像素）- 增大以适应不同缩放
        
        // 筛选当前页的区块
        const currentPageBlocks = this.ocrBlocks.filter(block => block.pageIndex === pageIndex);
        console.log('[PDF-OCR] 当前页区块数量:', currentPageBlocks.length, '页码:', pageIndex);
        
        // 如果当前页没有区块，尝试使用所有区块
        const searchBlocks = currentPageBlocks.length > 0 ? currentPageBlocks : this.ocrBlocks;
        
        for (const block of searchBlocks) {
            if (!block.bbox) continue;
            
            // 计算点击位置到区块边界的最近距离
            const blockLeft = block.bbox.lt[0];
            const blockTop = block.bbox.lt[1];
            const blockRight = block.bbox.rb[0];
            const blockBottom = block.bbox.rb[1];
            
            // 扩展区块范围，增加容差
            const tolerance = 50; // 容差像素
            const extendedLeft = blockLeft - tolerance;
            const extendedRight = blockRight + tolerance;
            const extendedTop = blockTop - tolerance;
            const extendedBottom = blockBottom + tolerance;
            
            // 计算点到矩形的最短距离
            let distance;
            if (x >= extendedLeft && x <= extendedRight && y >= extendedTop && y <= extendedBottom) {
                // 点在扩展后的区块范围内，距离为0
                distance = 0;
            } else {
                // 计算到区块边界或扩展边界的最短距离
                const dx = Math.max(extendedLeft - x, 0, x - extendedRight);
                const dy = Math.max(extendedTop - y, 0, y - extendedBottom);
                distance = Math.sqrt(dx * dx + dy * dy);
            }
            
            console.log('[PDF-OCR] 区块', block.id, '距离:', distance.toFixed(1));
            
            // 始终记录最近的区块
            if (distance < minDistance) {
                minDistance = distance;
                nearestBlock = block;
            }
        }
        
        // 如果最近的区块在阈值范围内，返回它
        if (minDistance < threshold) {
            console.log('[PDF-OCR] 找到最近区块，距离:', minDistance.toFixed(1));
            return nearestBlock;
        }
        
        console.log('[PDF-OCR] 最近区块距离超出阈值:', minDistance.toFixed(1));
        return null;
    }

    /**
     * 初始化悬浮面板
     */
    initFloatingPanel() {
        let panel = this.elements.floatingPanel;
        
        // 将面板移动到body下，避免被container的overflow:hidden裁剪
        if (panel && panel.parentElement !== document.body) {
            document.body.appendChild(panel);
            this.elements.floatingPanel = panel;
        }
        
        if (!panel) return;

        // 关闭按钮
        const closeBtn = panel.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideFloatingPanel();
            });
        }

        // 最小化按钮
        const minimizeBtn = panel.querySelector('.minimize-btn');
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', () => {
                this.toggleMinimizePanel();
            });
        }

        // 全部原文折叠切换
        const toggleFullText = panel.querySelector('#toggle-full-text');
        if (toggleFullText) {
            toggleFullText.addEventListener('click', () => {
                const section = panel.querySelector('.full-text-section');
                if (section) {
                    section.classList.toggle('collapsed');
                }
            });
        }

        // 内容标签页切换
        const contentTabBtns = panel.querySelectorAll('.full-text-section .tab-btn[data-tab]');
        contentTabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchContentTab(tabName);
            });
        });

        // 全部原文翻译按钮
        const translateFullTextBtn = panel.querySelector('#translate-full-text-btn');
        if (translateFullTextBtn) {
            translateFullTextBtn.addEventListener('click', () => {
                this.translateFullText();
            });
        }

        // 全部原文提问按钮
        const askFullTextBtn = panel.querySelector('#ask-full-text-btn');
        if (askFullTextBtn) {
            askFullTextBtn.addEventListener('click', () => {
                this.askAboutFullText();
            });
        }

        // 拖动功能
        const header = panel.querySelector('.panel-header');
        if (header) {
            let isDragging = false;
            let startX, startY, startLeft, startTop;

            header.addEventListener('mousedown', (e) => {
                if (e.target.closest('.panel-controls')) return;
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                const rect = panel.getBoundingClientRect();
                startLeft = rect.left;
                startTop = rect.top;
                panel.style.transition = 'none';
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                panel.style.left = `${startLeft + dx}px`;
                panel.style.top = `${startTop + dy}px`;
                panel.style.right = 'auto';
            });

            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    panel.style.transition = '';
                }
            });
        }
    }

    /**
     * 切换悬浮面板显示/隐藏
     */
    toggleFloatingPanel() {
        const panel = this.elements.floatingPanel;
        if (!panel) return;

        if (panel.style.display === 'none' || !panel.style.display) {
            this.showFloatingPanel();
        } else {
            this.hideFloatingPanel();
        }
    }

    /**
     * 显示悬浮面板
     */
    showFloatingPanel() {
        const panel = this.elements.floatingPanel;
        if (!panel) return;
        panel.style.display = 'flex';
        if (this.elements.toggleTextPanelBtn) {
            this.elements.toggleTextPanelBtn.classList.add('active');
        }
    }

    /**
     * 隐藏悬浮面板
     */
    hideFloatingPanel() {
        const panel = this.elements.floatingPanel;
        if (!panel) return;
        panel.style.display = 'none';
        if (this.elements.toggleTextPanelBtn) {
            this.elements.toggleTextPanelBtn.classList.remove('active');
        }
    }

    /**
     * 切换面板最小化
     */
    toggleMinimizePanel() {
        const panel = this.elements.floatingPanel;
        if (!panel) return;
        panel.classList.toggle('minimized');
        const minimizeBtn = panel.querySelector('.minimize-btn');
        if (minimizeBtn) {
            minimizeBtn.textContent = panel.classList.contains('minimized') ? '+' : '−';
            minimizeBtn.title = panel.classList.contains('minimized') ? '还原' : '最小化';
        }
    }

    /**
     * 切换内容标签页
     */
    switchContentTab(tabName) {
        const panel = this.elements.floatingPanel;
        if (!panel) return;

        // 更新标签按钮状态
        panel.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // 更新内容区域显示
        panel.querySelectorAll('.ocr-text-tab').forEach(tab => {
            tab.classList.toggle('active', tab.id === `tab_${tabName}`);
        });
    }

    /**
     * 设置OCR解析结果（支持增量添加多页面）
     */
    setOCRResult(result, appendMode = false) {
        console.log('[PDF-OCR-Viewer] setOCRResult调用:');
        console.log('  - appendMode:', appendMode);
        console.log('  - result.pages:', result?.pages?.length);
        console.log('  - 当前pageResults keys:', [...this.pageResults.keys()]);
        console.log('  - 当前ocrBlocks数量:', this.ocrBlocks.length);
        
        if (!result || !result.pages) {
            console.log('  - 结果为空，appendMode:', appendMode);
            if (!appendMode) {
                console.log('  - 清空数据（非追加模式）');
                this.ocrBlocks = [];
                this.pageResults.clear();
            }
            return;
        }

        // 如果不是追加模式，清空现有数据
        if (!appendMode) {
            console.log('  - 清空数据（非追加模式）');
            this.ocrBlocks = [];
            this.pageResults.clear();
        } else {
            console.log('  - 追加模式，保留现有数据');
        }

        // 提取所有页面的区块
        result.pages.forEach((page, idx) => {
            // 使用页面中的pageIndex字段（已在normalizeResult中正确设置）
            const pageNum = page.pageIndex || (idx + 1);
            
            console.log('[PDF-OCR-Viewer] 处理页面:', pageNum, '区块数:', page.blocks?.length || 0);
            
            // 存储页面结果到Map
            this.pageResults.set(pageNum, page);
            
            // 移除该页面的旧区块（如果存在）
            this.ocrBlocks = this.ocrBlocks.filter(b => b.pageIndex !== pageNum);
            
            // 添加新区块
            if (page.blocks) {
                page.blocks.forEach((block, blockIndex) => {
                    this.ocrBlocks.push({
                        ...block,
                        pageIndex: pageNum,
                        blockIndex: blockIndex,
                        id: `block-${pageNum}-${blockIndex}`
                    });
                });
            }
        });

        console.log('[PDF-OCR-Viewer] OCR结果已更新:');
        console.log('  - 总区块数:', this.ocrBlocks.length);
        console.log('  - 已解析页面:', [...this.pageResults.keys()]);
        console.log('  - 各页区块数:', [...this.pageResults.entries()].map(([k, v]) => `第${k}页:${v.blocks?.length || 0}`));

        // 更新结构化内容列表
        this.updateStructuredContent();
        
        // 更新统计信息
        this.updateStatistics();
        
        // 渲染当前页的区块
        this.renderBlocks();
    }

    /**
     * 获取已解析的页面列表
     */
    getParsedPages() {
        return [...this.pageResults.keys()].sort((a, b) => a - b);
    }

    /**
     * 检查指定页面是否已解析
     */
    isPageParsed(pageNum) {
        return this.pageResults.has(pageNum);
    }

    /**
     * 清除指定页面的OCR结果
     */
    clearPageResult(pageNum) {
        this.pageResults.delete(pageNum);
        this.ocrBlocks = this.ocrBlocks.filter(b => b.pageIndex !== pageNum);
        this.updateStructuredContent();
        this.updateStatistics();
        this.renderBlocks();
    }

    /**
     * 渲染OCR区块覆盖层
     */
    renderBlocks() {
        const container = document.getElementById('ocr-blocks-layer');
        if (!container) return;

        const currentPage = window.pdfOCRCore ? window.pdfOCRCore.currentPage : 1;
        
        const hasCurrentPageBlocks = this.ocrBlocks.some(block => block.pageIndex === currentPage);
        
        console.log('[PDF-OCR] renderBlocks - currentPage:', currentPage, 'hasBlocks:', hasCurrentPageBlocks, 'isBlockMode:', this.isBlockMode);
        
        if (!hasCurrentPageBlocks) {
            container.style.display = 'none';
            container.innerHTML = '';
            this.blockOverlays.clear();
            
            this.clearCurrentPageState();
            return;
        }

        container.innerHTML = '';
        this.blockOverlays.clear();

        const pageBlocks = this.ocrBlocks.filter(block => block.pageIndex === currentPage);

        console.log('[PDF-OCR] 渲染页面', currentPage, '的区块，数量:', pageBlocks.length);

        pageBlocks.forEach(block => {
            const overlay = this.createBlockOverlay(block);
            container.appendChild(overlay);
            this.blockOverlays.set(block.id, overlay);
        });

        if (this.isBlockMode || this.selectedBlocks.length > 0 || this.selectedBlock) {
            container.style.display = 'block';
        }

        this.updateBlockVisibility();
        
        this.updateAllSelectedStyles();

        console.log(`[PDF-OCR] 渲染了 ${pageBlocks.length} 个区块`);
    }

    /**
     * 清理当前页面状态（当页面未解析时）
     */
    clearCurrentPageState() {
        const currentPage = window.pdfOCRCore ? window.pdfOCRCore.currentPage : 1;
        
        const hasSelectedBlocksInOtherPages = this.selectedBlocks.some(b => b.pageIndex !== currentPage);
        const hasSelectedBlockInOtherPages = this.selectedBlock && this.selectedBlock.pageIndex !== currentPage;
        
        if (hasSelectedBlocksInOtherPages || hasSelectedBlockInOtherPages) {
            this.selectedBlocks = [];
            this.selectedBlock = null;
            
            document.querySelectorAll('.ocr-content-item.selected').forEach(item => {
                item.classList.remove('selected');
            });
        }
        
        const currentBlockContent = document.getElementById('ocr-current-block');
        if (currentBlockContent) {
            currentBlockContent.innerHTML = '<div class="empty-tip">当前页暂无识别内容</div>';
        }
        
        const detailsPanel = document.getElementById('ocr-block-details');
        if (detailsPanel) {
            const parsedPages = this.getParsedPages();
            if (parsedPages.length > 0) {
                detailsPanel.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-file-alt"></i>
                        <p>当前页暂无解析结果</p>
                        <p class="sub">已解析页面: ${parsedPages.join(', ')}</p>
                    </div>
                `;
            } else {
                detailsPanel.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-mouse-pointer"></i>
                        <p>点击解析区块查看详情</p>
                    </div>
                `;
            }
        }
    }

    /**
     * 创建单个区块覆盖层
     */
    createBlockOverlay(block) {
        const overlay = document.createElement('div');
        overlay.className = `ocr-block-overlay type-${block.type}`;
        overlay.dataset.blockId = block.id;
        overlay.dataset.blockType = block.type;

        // 设置位置和大小
        const pdfCanvas = document.getElementById('pdf-canvas');
        const blocksLayer = document.getElementById('ocr-blocks-layer');
        const pdfImage = pdfCanvas ? pdfCanvas.querySelector('img, canvas') : null;
        
        if (pdfImage && block.bbox && blocksLayer) {
            // 获取图片的显示尺寸（已经考虑缩放）
            const displayWidth = pdfImage.offsetWidth;
            const displayHeight = pdfImage.offsetHeight;
            
            // 获取图片原始尺寸
            let naturalWidth, naturalHeight;
            if (pdfImage.tagName === 'IMG') {
                naturalWidth = pdfImage.naturalWidth;
                naturalHeight = pdfImage.naturalHeight;
            } else {
                naturalWidth = pdfImage.width / (window.pdfOCRCore?.zoomLevel || 1);
                naturalHeight = pdfImage.height / (window.pdfOCRCore?.zoomLevel || 1);
            }
            
            // OCR结果的页面尺寸
            const pageWidth = block.bbox.page_width || naturalWidth;
            const pageHeight = block.bbox.page_height || naturalHeight;
            
            // 计算缩放比例（显示尺寸 / OCR原始尺寸）
            const scaleX = displayWidth / pageWidth;
            const scaleY = displayHeight / pageHeight;
            
            // 计算区块位置
            const left = block.bbox.lt[0] * scaleX;
            const top = block.bbox.lt[1] * scaleY;
            const width = (block.bbox.rb[0] - block.bbox.lt[0]) * scaleX;
            const height = (block.bbox.rb[1] - block.bbox.lt[1]) * scaleY;

            overlay.style.left = `${left}px`;
            overlay.style.top = `${top}px`;
            overlay.style.width = `${width}px`;
            overlay.style.height = `${height}px`;
        } else {
            console.warn(`[PDF-OCR] 无法计算区块位置:`, block);
        }

        // 设置颜色
        overlay.style.backgroundColor = this.colors[block.type] || this.colors.text;
        overlay.style.borderColor = this.borderColors[block.type] || this.borderColors.text;

        // 添加标签
        const label = document.createElement('div');
        label.className = 'ocr-block-label';
        label.textContent = this.getBlockTypeLabel(block.type);
        overlay.appendChild(label);

        // 绑定事件
        overlay.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectBlock(block, e.ctrlKey || e.metaKey);
        });

        overlay.addEventListener('mouseenter', () => {
            this.highlightBlock(block.id);
        });

        overlay.addEventListener('mouseleave', () => {
            this.unhighlightBlock(block.id);
        });

        // 右键菜单
        overlay.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showBlockContextMenu(e, block);
        });

        return overlay;
    }

    /**
     * 获取区块类型标签
     */
    getBlockTypeLabel(type) {
        const labels = {
            text: '文本',
            table: '表格',
            formula: '公式',
            image: '图片',
            title: '标题',
            header: '页眉',
            footer: '页脚',
            reference: '引用'
        };
        return labels[type] || type;
    }

    /**
     * 选中区块（支持多选模式）
     */
    selectBlock(block, isMultiSelect = false) {
        // 确保区块层可见
        const layer = document.getElementById('ocr-blocks-layer');
        if (layer) {
            layer.style.display = 'block';
        }

        // 如果区块还没有渲染，创建它
        if (!this.blockOverlays.has(block.id)) {
            const overlay = this.createBlockOverlay(block);
            if (layer && overlay) {
                layer.appendChild(overlay);
                this.blockOverlays.set(block.id, overlay);
            }
        }

        // 判断是否使用多选模式：显式传入isMultiSelect或处于多选模式
        const useMultiSelect = isMultiSelect || this.isMultiSelectMode;
        
        if (useMultiSelect) {
            // 多选模式
            const existingIndex = this.selectedBlocks.findIndex(b => b.id === block.id);
            if (existingIndex >= 0) {
                // 已选中，取消选中
                this.selectedBlocks.splice(existingIndex, 1);
            } else {
                // 添加到选中列表
                this.selectedBlocks.push(block);
            }
            // 更新主选中区块为最后一个
            if (this.selectedBlocks.length > 0) {
                this.selectedBlock = this.selectedBlocks[this.selectedBlocks.length - 1];
            } else {
                this.selectedBlock = null;
            }
        } else {
            // 单选模式：清除所有选中，只选中当前
            this.selectedBlock = block;
            this.selectedBlocks = [block];
        }

        // 更新所有选中区块的样式
        this.updateAllSelectedStyles();

        // 更新可见性
        this.updateBlockVisibility();

        // 高亮结构化内容列表中的对应项
        this.highlightStructuredItem(block.id);

        // 显示区块详情
        this.showBlockDetails(block);

        // 自动打开悬浮面板（如果已关闭）
        const panel = this.elements.floatingPanel;
        if (panel && (panel.style.display === 'none' || !panel.style.display)) {
            this.showFloatingPanel();
        }

        // 触发选中事件
        this.emit('blockSelected', block);
        
        console.log('[PDF-OCR] 选中区块:', block.id, '多选数量:', this.selectedBlocks.length);
    }

    /**
     * 更新所有选中区块的样式
     */
    updateAllSelectedStyles() {
        // 先确保所有选中的区块都有overlay
        const layer = document.getElementById('ocr-blocks-layer');
        this.selectedBlocks.forEach(block => {
            if (!this.blockOverlays.has(block.id)) {
                const overlay = this.createBlockOverlay(block);
                if (layer && overlay) {
                    layer.appendChild(overlay);
                    this.blockOverlays.set(block.id, overlay);
                }
            }
        });
        
        // 遍历所有区块overlay
        this.blockOverlays.forEach((overlay, id) => {
            const isSelected = this.selectedBlocks.some(b => b.id === id);
            
            if (isSelected) {
                // 选中状态 - 使用橙色
                overlay.classList.add('selected');
                overlay.style.zIndex = '100';
                overlay.style.boxShadow = '0 0 0 4px rgba(249, 115, 22, 0.6)';
                overlay.style.backgroundColor = 'rgba(249, 115, 22, 0.4)';
                overlay.style.borderColor = '#f97316';
                overlay.style.display = 'block';
            } else {
                // 非选中状态
                overlay.classList.remove('selected');
                overlay.style.zIndex = '';
                overlay.style.boxShadow = '';
                // 恢复原始颜色
                const block = this.ocrBlocks.find(b => b.id === id);
                if (block) {
                    overlay.style.backgroundColor = this.colors[block.type] || this.colors.text;
                    overlay.style.borderColor = this.borderColors[block.type] || this.borderColors.text;
                }
            }
        });
        
        console.log('[PDF-OCR] 更新选中样式，选中数量:', this.selectedBlocks.length);
    }

    /**
     * 更新区块覆盖层样式
     */
    updateBlockOverlayStyle(block, isSelected) {
        const overlay = this.blockOverlays.get(block.id);
        if (!overlay) return;

        if (isSelected) {
            overlay.classList.add('selected');
            overlay.style.backgroundColor = this.colors.selected;
            overlay.style.borderColor = this.borderColors.selected;
            overlay.style.display = 'block';
        } else {
            overlay.classList.remove('selected');
            overlay.style.backgroundColor = this.colors[block.type] || this.colors.text;
            overlay.style.borderColor = this.borderColors[block.type] || this.borderColors.text;
        }
    }

    /**
     * 清除所有选中
     */
    clearAllSelections() {
        this.selectedBlocks.forEach(block => {
            this.updateBlockOverlayStyle(block, false);
        });
        this.selectedBlocks = [];
        this.selectedBlock = null;

        // 清除结构化列表高亮
        document.querySelectorAll('.ocr-content-item.selected').forEach(item => {
            item.classList.remove('selected');
        });
    }

    /**
     * 取消选中区块
     */
    deselectBlock() {
        this.clearAllSelections();

        // 如果不是全部显示模式，隐藏区块层
        if (!this.isBlockMode) {
            const layer = document.getElementById('ocr-blocks-layer');
            if (layer) {
                layer.style.display = 'none';
            }
        }
    }

    /**
     * 高亮区块（悬停效果）
     */
    highlightBlock(blockId) {
        if (this.selectedBlock && this.selectedBlock.id === blockId) return;

        const overlay = this.blockOverlays.get(blockId);
        if (overlay) {
            overlay.classList.add('highlighted');
        }

        this.highlightedBlock = blockId;
    }

    /**
     * 取消高亮区块
     */
    unhighlightBlock(blockId) {
        if (this.selectedBlock && this.selectedBlock.id === blockId) return;

        const overlay = this.blockOverlays.get(blockId);
        if (overlay) {
            overlay.classList.remove('highlighted');
        }

        this.highlightedBlock = null;
    }

    /**
     * 更新区块可见性（根据筛选条件）
     */
    updateBlockVisibility() {
        // 如果不是显示全部区块模式，只显示选中的区块
        if (!this.isBlockMode) {
            this.blockOverlays.forEach((overlay, blockId) => {
                const isSelected = this.selectedBlocks.some(b => b.id === blockId) || 
                                   (this.selectedBlock && blockId === this.selectedBlock.id);
                if (isSelected) {
                    overlay.style.display = 'block';
                } else {
                    overlay.style.display = 'none';
                }
            });
        } else {
            // 显示全部区块模式
            this.blockOverlays.forEach((overlay, blockId) => {
                const blockType = overlay.dataset.blockType;
                if (this.filterType === 'all' || blockType === this.filterType) {
                    overlay.style.display = 'block';
                } else {
                    overlay.style.display = 'none';
                }
            });
        }

        // 始终更新左侧识别结果列表（无论是否全部显示模式）
        const contentItems = document.querySelectorAll('.ocr-content-item');
        contentItems.forEach(item => {
            const itemType = item.className.match(/type-(\w+)/)?.[1];
            if (this.filterType === 'all' || itemType === this.filterType) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    /**
     * 切换全部区块显示模式
     */
    toggleBlockMode() {
        this.isBlockMode = !this.isBlockMode;
        const layer = document.getElementById('ocr-blocks-layer');
        const btn = document.getElementById('toggle-ocr-blocks');
        const selectAllBtn = document.getElementById('select-all-blocks-btn');
        const deselectAllBtn = document.getElementById('deselect-all-blocks-btn');

        if (btn) {
            btn.classList.toggle('active', this.isBlockMode);
            btn.textContent = this.isBlockMode ? '退出多选' : '多选模式';
        }

        if (this.isBlockMode) {
            if (layer) {
                layer.style.display = 'block';
            }
            this.renderBlocks();
            this.updateBlockVisibility();
            this.showFloatingPanel();
            
            if (selectAllBtn) selectAllBtn.style.display = 'inline-block';
            if (deselectAllBtn) deselectAllBtn.style.display = 'inline-block';
        } else {
            this.updateBlockVisibility();
            if (layer && this.selectedBlocks.length === 0 && !this.selectedBlock) {
                layer.style.display = 'none';
            }
            
            if (selectAllBtn) selectAllBtn.style.display = 'none';
            if (deselectAllBtn) deselectAllBtn.style.display = 'none';
        }
        
        console.log(`[PDF-OCR] 全部区块显示模式: ${this.isBlockMode ? '开启' : '关闭'}`);
    }

    /**
     * 全选当前页所有区块
     */
    selectAllBlocksInPage() {
        const currentPage = window.pdfOCRCore ? window.pdfOCRCore.currentPage : 1;
        const currentPageBlocks = this.ocrBlocks.filter(block => block.pageIndex === currentPage);
        
        if (currentPageBlocks.length === 0) {
            this.showToast('当前页没有可选择的区块', 'error');
            return;
        }

        currentPageBlocks.forEach(block => {
            if (!this.selectedBlocks.some(b => b.id === block.id)) {
                this.selectedBlocks.push(block);
            }
        });

        if (this.selectedBlocks.length > 0) {
            this.selectedBlock = this.selectedBlocks[this.selectedBlocks.length - 1];
        }

        this.updateAllSelectedStyles();
        this.updateBlockVisibility();
        
        if (this.selectedBlocks.length > 1) {
            this.showBlockDetails(this.selectedBlock);
        }

        this.showToast(`已选中 ${currentPageBlocks.length} 个区块`, 'success');
        console.log('[PDF-OCR] 全选当前页区块:', currentPageBlocks.length);
    }

    /**
     * 取消所有选中
     */
    deselectAllBlocks() {
        const count = this.selectedBlocks.length;
        this.selectedBlocks = [];
        this.selectedBlock = null;

        this.blockOverlays.forEach((overlay, id) => {
            overlay.classList.remove('selected');
            overlay.style.zIndex = '';
            overlay.style.boxShadow = '';
            const block = this.ocrBlocks.find(b => b.id === id);
            if (block) {
                overlay.style.backgroundColor = this.colors[block.type] || this.colors.text;
                overlay.style.borderColor = this.borderColors[block.type] || this.borderColors.text;
            }
        });

        document.querySelectorAll('.ocr-content-item.selected').forEach(item => {
            item.classList.remove('selected');
        });

        const currentBlockContent = document.getElementById('ocr-current-block');
        if (currentBlockContent) {
            currentBlockContent.innerHTML = '<div class="empty-tip">点击识别结果查看内容</div>';
        }

        const detailsPanel = document.getElementById('ocr-block-details');
        if (detailsPanel) {
            detailsPanel.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-mouse-pointer"></i>
                    <p>点击解析区块查看详情</p>
                </div>
            `;
        }

        this.showToast(`已取消选中 ${count} 个区块`, 'success');
        console.log('[PDF-OCR] 取消所有选中');
    }

    /**
     * 监听缩放和滚动事件，重新渲染区块
     */
    setupResizeListener() {
        let resizeTimeout;
        const viewerWrap = document.querySelector('.viewer-wrap');
        
        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (this.isBlockMode) {
                    this.renderBlocks();
                }
            }, 200);
        });

        // 监听查看器滚动
        if (viewerWrap) {
            viewerWrap.addEventListener('scroll', () => {
                if (this.isBlockMode) {
                    this.renderBlocks();
                }
            });
        }

        // 监听缩放选择器变化
        const zoomSelect = document.getElementById('viewer_zoom_select');
        if (zoomSelect) {
            zoomSelect.addEventListener('change', () => {
                setTimeout(() => {
                    if (this.isBlockMode) {
                        this.renderBlocks();
                    }
                }, 100);
            });
        }

        // 监听缩放按钮
        const zoomInBtn = document.getElementById('viewer_zoom_in');
        const zoomOutBtn = document.getElementById('viewer_zoom_out');
        
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => {
                setTimeout(() => {
                    if (this.isBlockMode) {
                        this.renderBlocks();
                    }
                }, 100);
            });
        }
        
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => {
                setTimeout(() => {
                    if (this.isBlockMode) {
                        this.renderBlocks();
                    }
                }, 100);
            });
        }
    }

    /**
     * 更新结构化内容列表（只显示当前页）
     */
    updateStructuredContent() {
        const container = document.getElementById('ocr-structured-content');
        if (!container) return;

        container.innerHTML = '';

        // 获取当前页码
        const currentPage = window.pdfOCRCore ? window.pdfOCRCore.currentPage : 1;
        
        console.log('[PDF-OCR-Viewer] updateStructuredContent:');
        console.log('  - currentPage:', currentPage);
        console.log('  - ocrBlocks总数:', this.ocrBlocks.length);
        console.log('  - pageResults keys:', [...this.pageResults.keys()]);

        // 过滤当前页的区块
        const currentPageBlocks = this.ocrBlocks.filter(block => block.pageIndex === currentPage);
        
        console.log('  - currentPageBlocks数量:', currentPageBlocks.length);

        if (currentPageBlocks.length === 0) {
            // 检查是否有其他页已解析
            const parsedPages = this.getParsedPages();
            if (parsedPages.length > 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-file-alt"></i>
                        <p>当前页暂无解析结果</p>
                        <p class="sub">已解析页面: ${parsedPages.join(', ')}</p>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-layer-group"></i>
                        <p>暂无结构化内容</p>
                        <p class="sub">请先上传文件并进行OCR解析</p>
                    </div>
                `;
            }
            return;
        }

        // 按位置排序
        const sortedBlocks = [...currentPageBlocks].sort((a, b) => {
            return a.bbox?.lt[1] - b.bbox?.lt[1] || 0;
        });

        sortedBlocks.forEach(block => {
            const item = this.createStructuredItem(block);
            container.appendChild(item);
        });
    }

    /**
     * 创建结构化内容项
     */
    createStructuredItem(block) {
        const item = document.createElement('div');
        item.className = `ocr-content-item type-${block.type}`;
        item.dataset.blockId = block.id;

        const typeIcon = this.getBlockTypeIcon(block.type);
        const typeLabel = this.getBlockTypeLabel(block.type);
        const previewText = this.getBlockPreviewText(block);
        
        // 图片类型不显示操作按钮
        const isImage = block.type === 'image';
        const actionButtons = isImage ? '' : `
            <div class="content-item-actions">
                <button class="ocr-action-btn copy-btn" title="复制" data-action="copy">
                    <span>复制</span>
                </button>
                <button class="ocr-action-btn translate-btn" title="翻译" data-action="translate">
                    <span>翻译</span>
                </button>
                <button class="ocr-action-btn ask-btn" title="提问" data-action="ask">
                    <span>提问</span>
                </button>
            </div>
        `;

        item.innerHTML = `
            <div class="content-item-header">
                <span class="content-type-badge ${block.type}">
                    <i class="${typeIcon}"></i> ${typeLabel}
                </span>
                <span class="content-page">第${block.pageIndex}页</span>
            </div>
            <div class="content-item-body">
                ${previewText}
            </div>
            ${actionButtons}
        `;

        // 点击选中
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.content-item-actions')) {
                this.selectBlock(block, e.ctrlKey || e.metaKey);
                this.scrollToBlock(block.id);
            }
        });

        // 图片类型没有操作按钮，跳过事件绑定
        if (isImage) return item;

        // 操作按钮
        item.querySelector('[data-action="copy"]').addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.selectedBlocks.length > 1 && this.selectedBlocks.some(b => b.id === block.id)) {
                this.copyMultipleBlocks(this.selectedBlocks);
            } else {
                this.copyBlockContent(block);
            }
        });

        item.querySelector('[data-action="translate"]').addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.selectedBlocks.length > 1 && this.selectedBlocks.some(b => b.id === block.id)) {
                this.translateMultipleBlocks(this.selectedBlocks);
            } else {
                this.translateBlock(block);
            }
        });

        item.querySelector('[data-action="ask"]').addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.selectedBlocks.length > 1 && this.selectedBlocks.some(b => b.id === block.id)) {
                this.askAboutMultipleBlocks(this.selectedBlocks);
            } else {
                this.askAboutBlock(block);
            }
        });

        return item;
    }

    /**
     * 获取区块类型图标
     */
    getBlockTypeIcon(type) {
        const icons = {
            text: 'fas fa-align-left',
            table: 'fas fa-table',
            formula: 'fas fa-square-root-alt',
            image: 'fas fa-image',
            title: 'fas fa-heading',
            header: 'fas fa-header',
            footer: 'fas fa-shoe-prints',
            reference: 'fas fa-quote-right'
        };
        return icons[type] || 'fas fa-square';
    }

    /**
     * 获取区块预览文本
     */
    getBlockPreviewText(block) {
        let text = '';

        switch (block.type) {
            case 'text':
            case 'title':
            case 'header':
            case 'footer':
            case 'reference':
                text = block.text || '无文本内容';
                break;
            case 'table':
                text = block.text || '[表格内容]';
                break;
            case 'formula':
                text = block.latex || block.text || '[公式]';
                break;
            case 'image':
                text = block.caption || '[图片]';
                break;
            default:
                text = block.text || '无内容';
        }

        // 截断长文本
        if (text.length > 200) {
            text = text.substring(0, 200) + '...';
        }

        return text;
    }

    /**
     * 高亮结构化列表中的项
     */
    highlightStructuredItem(blockId) {
        // 多选模式：高亮所有选中的项
        if (this.selectedBlocks.length > 1) {
            document.querySelectorAll('.ocr-content-item').forEach(item => {
                const isSelected = this.selectedBlocks.some(b => b.id === item.dataset.blockId);
                item.classList.toggle('selected', isSelected);
            });
        } else {
            document.querySelectorAll('.ocr-content-item').forEach(item => {
                item.classList.remove('selected');
                if (item.dataset.blockId === blockId) {
                    item.classList.add('selected');
                    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            });
        }
    }

    /**
     * 滚动到指定区块
     */
    scrollToBlock(blockId) {
        const block = this.ocrBlocks.find(b => b.id === blockId);
        if (!block) return;

        // 如果区块不在当前页，先切换页面
        if (block.pageIndex !== window.pdfOCRCore?.currentPage) {
            window.pdfOCRCore?.goToPage(block.pageIndex);
            // goToPage会自动调用renderBlocks，所以这里不需要再调用
        }

        // 高亮区块
        setTimeout(() => {
            const overlay = this.blockOverlays.get(blockId);
            if (overlay) {
                overlay.scrollIntoView({ behavior: 'smooth', block: 'center' });
                overlay.classList.add('flash');
                setTimeout(() => overlay.classList.remove('flash'), 1000);
            }
        }, 200);
    }

    /**
     * 显示区块详情（支持多选）
     */
    showBlockDetails(block) {
        const detailsPanel = document.getElementById('ocr-block-details');
        const currentBlockContent = document.getElementById('ocr-current-block');
        
        // 多选模式
        if (this.selectedBlocks.length > 1) {
            const combinedText = this.selectedBlocks.map(b => this.getBlockFullText(b)).join('\n\n---\n\n');
            const typeLabels = [...new Set(this.selectedBlocks.map(b => this.getBlockTypeLabel(b.type)))].join(', ');
            
            if (currentBlockContent) {
                const renderedContent = this.renderMarkdown(combinedText);
                currentBlockContent.innerHTML = renderedContent;
            }

            if (detailsPanel) {
                detailsPanel.innerHTML = `
                    <div class="block-details-header">
                        <span class="block-type-badge multi">已选 ${this.selectedBlocks.length} 项</span>
                        <span class="block-page">${typeLabels}</span>
                    </div>
                    <div class="block-details-content">
                        <div class="detail-section">
                            <label>合并内容</label>
                            <div class="detail-text">${combinedText.substring(0, 500)}${combinedText.length > 500 ? '...' : ''}</div>
                        </div>
                    </div>
                    <div class="block-details-actions">
                        <button class="btn btn-primary" data-action="copy">
                            <i class="fas fa-copy"></i> 复制全部
                        </button>
                        <button class="btn btn-secondary" data-action="translate">
                            <i class="fas fa-language"></i> 翻译
                        </button>
                        <button class="btn btn-secondary" data-action="ask">
                            <i class="fas fa-comment-dots"></i> 提问
                        </button>
                    </div>
                `;

                detailsPanel.querySelector('[data-action="copy"]').addEventListener('click', () => {
                    this.copyMultipleBlocks(this.selectedBlocks);
                });

                detailsPanel.querySelector('[data-action="translate"]').addEventListener('click', () => {
                    this.translateMultipleBlocks(this.selectedBlocks);
                });

                detailsPanel.querySelector('[data-action="ask"]').addEventListener('click', () => {
                    this.askAboutMultipleBlocks(this.selectedBlocks);
                });
            }
            return;
        }
        
        const typeLabel = this.getBlockTypeLabel(block.type);
        const fullText = this.getBlockFullText(block);

        // 更新当前选中区块内容（使用markdown渲染）
        if (currentBlockContent) {
            const renderedContent = this.renderMarkdown(fullText);
            currentBlockContent.innerHTML = renderedContent;
        }

        if (!detailsPanel) return;

        detailsPanel.innerHTML = `
            <div class="block-details-header">
                <span class="block-type-badge ${block.type}">${typeLabel}</span>
                <span class="block-page">第${block.pageIndex}页</span>
            </div>
            <div class="block-details-content">
                <div class="detail-section">
                    <label>内容</label>
                    <div class="detail-text">${fullText}</div>
                </div>
                ${block.latex ? `
                <div class="detail-section">
                    <label>LaTeX</label>
                    <code class="detail-code">${block.latex}</code>
                </div>
                ` : ''}
                ${block.html ? `
                <div class="detail-section">
                    <label>HTML</label>
                    <code class="detail-code">${block.html.substring(0, 500)}${block.html.length > 500 ? '...' : ''}</code>
                </div>
                ` : ''}
            </div>
            <div class="block-details-actions">
                <button class="btn btn-sm btn-primary" data-action="copy">
                    <i class="fas fa-copy"></i> 复制
                </button>
                <button class="btn btn-sm btn-secondary" data-action="translate">
                    <i class="fas fa-language"></i> 翻译
                </button>
                <button class="btn btn-sm btn-secondary" data-action="ask">
                    <i class="fas fa-comment-dots"></i> 提问
                </button>
            </div>
        `;

        // 绑定按钮事件
        detailsPanel.querySelector('[data-action="copy"]').addEventListener('click', () => {
            this.copyBlockContent(block);
        });

        detailsPanel.querySelector('[data-action="translate"]').addEventListener('click', () => {
            this.translateBlock(block);
        });

        detailsPanel.querySelector('[data-action="ask"]').addEventListener('click', () => {
            this.askAboutBlock(block);
        });
    }

    /**
     * 渲染Markdown内容
     */
    renderMarkdown(text) {
        if (!text) return '';
        
        // 检查是否有marked库
        if (typeof marked !== 'undefined') {
            try {
                return marked.parse(text);
            } catch (e) {
                console.warn('[PDF-OCR] Markdown渲染失败:', e);
            }
        }
        
        // 简单的markdown渲染（备用方案）
        return this.simpleMarkdownRender(text);
    }

    /**
     * 简单的Markdown渲染（备用方案）
     */
    simpleMarkdownRender(text) {
        if (!text) return '';
        
        let html = this.escapeHtml(text);
        
        // 表格渲染
        html = html.replace(/\|(.+)\|/g, (match, content) => {
            const cells = content.split('|').map(c => c.trim());
            if (cells.length > 1) {
                return '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
            }
            return match;
        });
        
        // 包装表格行
        if (html.includes('<tr>')) {
            html = html.replace(/(<tr>.*<\/tr>)+/gs, '<table>$&</table>');
        }
        
        // 代码块
        html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // 标题
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        
        // 粗体和斜体
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        
        // 列表
        html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)+/g, '<ul>$&</ul>');
        
        // 换行
        html = html.replace(/\n/g, '<br>');
        
        return html;
    }

    /**
     * 获取区块完整文本
     */
    getBlockFullText(block) {
        switch (block.type) {
            case 'table':
                return block.text || block.html || '无表格内容';
            case 'formula':
                return block.latex || block.text || '无公式内容';
            default:
                return block.text || '无文本内容';
        }
    }

    /**
     * 复制区块内容
     */
    async copyBlockContent(block) {
        const text = this.getBlockFullText(block);
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('内容已复制到剪贴板');
        } catch (err) {
            // 降级方案
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showToast('内容已复制到剪贴板');
        }
    }

    /**
     * 复制多个区块内容
     */
    async copyMultipleBlocks(blocks) {
        const text = blocks.map(b => this.getBlockFullText(b)).join('\n\n---\n\n');
        try {
            await navigator.clipboard.writeText(text);
            this.showToast(`已复制 ${blocks.length} 个区块的内容`);
        } catch (err) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showToast(`已复制 ${blocks.length} 个区块的内容`);
        }
    }

    /**
     * 翻译多个区块
     */
    async translateMultipleBlocks(blocks) {
        const text = blocks.map(b => this.getBlockFullText(b)).join('\n\n---\n\n');
        if (!text) {
            this.showToast('没有可翻译的内容', 'error');
            return;
        }

        const apiKey = await this.getAPIKey();
        if (!apiKey) {
            this.showToast('请先配置智谱AI API密钥', 'error');
            return;
        }

        this.showToast('正在翻译...', 'info');

        try {
            const translated = await this.callTranslateAPI(text, apiKey);
            this.showTranslationResult(text, translated, null);
        } catch (error) {
            console.error('[PDF-OCR] 翻译失败:', error);
            this.showToast('翻译失败: ' + error.message, 'error');
        }
    }

    /**
     * 对多个区块提问
     */
    async askAboutMultipleBlocks(blocks) {
        const text = blocks.map(b => this.getBlockFullText(b)).join('\n\n---\n\n');
        if (!text) {
            this.showToast('没有可提问的内容', 'error');
            return;
        }

        const apiKey = await this.getAPIKey();
        if (!apiKey) {
            this.showToast('请先配置智谱AI API密钥', 'error');
            return;
        }

        // 打开悬浮对话窗口
        if (window.pdfOCRFloatingChat) {
            window.pdfOCRFloatingChat.openWithContext({ context: text, apiKey: apiKey });
        } else {
            this.showAIChatPopup(text, apiKey);
        }
    }

    /**
     * 翻译区块 - 一键调用AI翻译
     */
    async translateBlock(block) {
        const text = this.getBlockFullText(block);
        if (!text) {
            this.showToast('没有可翻译的内容', 'error');
            return;
        }

        // 获取API密钥
        const apiKey = await this.getAPIKey();
        if (!apiKey) {
            this.showToast('请先配置智谱AI API密钥', 'error');
            return;
        }

        // 显示翻译中状态
        this.showToast('正在翻译...', 'info');

        try {
            const translated = await this.callTranslateAPI(text, apiKey);
            
            // 显示翻译结果
            this.showTranslationResult(text, translated, block);
            
        } catch (error) {
            console.error('[PDF-OCR] 翻译失败:', error);
            this.showToast('翻译失败: ' + error.message, 'error');
        }
    }

    /**
     * 调用翻译API
     */
    async callTranslateAPI(text, apiKey) {
        const url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'glm-4-flash',
                messages: [
                    {
                        role: 'system',
                        content: '你是一个专业的翻译助手。请将用户提供的文本翻译成中文，只返回翻译结果，不要添加任何解释。如果原文已经是中文，请翻译成英文。'
                    },
                    {
                        role: 'user',
                        content: text
                    }
                ],
                temperature: 0.3,
                max_tokens: 2048
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API请求失败: ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
    }

    /**
     * 显示翻译结果弹窗
     */
    showTranslationResult(original, translated, block) {
        // 移除已有的翻译弹窗
        document.querySelectorAll('.ocr-translation-popup').forEach(p => p.remove());

        const popup = document.createElement('div');
        popup.className = 'ocr-translation-popup';
        popup.innerHTML = `
            <div class="popup-header" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);">
                <span class="popup-title" style="font-weight: 600; font-size: 14px; color: white;">🌐 翻译结果</span>
                <button class="popup-close" style="background: none; border: none; font-size: 20px; cursor: pointer; color: white; padding: 4px 8px; min-width: 32px;">×</button>
            </div>
            <div class="popup-body" style="padding: 16px; overflow-y: auto; flex: 1;">
                <div class="translation-section" style="margin-bottom: 16px;">
                    <div class="section-label" style="font-size: 12px; color: #64748b; margin-bottom: 4px; font-weight: 500;">原文</div>
                    <div class="section-content original" style="font-size: 14px; line-height: 1.6; color: #334155; padding: 12px; background: #f8fafc; border-radius: 8px; white-space: pre-wrap;">${this.escapeHtml(original.substring(0, 500))}${original.length > 500 ? '...' : ''}</div>
                </div>
                <div class="translation-section" style="margin-bottom: 16px;">
                    <div class="section-label" style="font-size: 12px; color: #64748b; margin-bottom: 4px; font-weight: 500;">译文</div>
                    <div class="section-content translated" style="font-size: 14px; line-height: 1.6; color: #334155; padding: 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; white-space: pre-wrap;">${this.escapeHtml(translated)}</div>
                </div>
            </div>
            <div class="popup-footer" style="display: flex; justify-content: flex-end; gap: 8px; padding: 12px 16px; border-top: 1px solid #e2e8f0;">
                <button class="popup-btn copy-btn" style="padding: 8px 16px; border-radius: 6px; font-size: 13px; cursor: pointer; border: none; font-weight: 500; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white;">复制译文</button>
                <button class="popup-btn close-btn" style="padding: 8px 16px; border-radius: 6px; font-size: 13px; cursor: pointer; border: none; font-weight: 500; background: #f1f5f9; color: #475569;">关闭</button>
            </div>
        `;

        // 添加样式
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        // 绑定事件
        popup.querySelector('.popup-close').addEventListener('click', () => popup.remove());
        popup.querySelector('.close-btn').addEventListener('click', () => popup.remove());
        popup.querySelector('.copy-btn').addEventListener('click', async () => {
            await navigator.clipboard.writeText(translated);
            this.showToast('译文已复制到剪贴板', 'success');
        });

        // 点击背景关闭
        popup.addEventListener('click', (e) => {
            if (e.target === popup) popup.remove();
        });

        document.body.appendChild(popup);
        this.showToast('翻译完成', 'success');
    }

    /**
     * 对区块提问 - 一键调用AI
     */
    async askAboutBlock(block) {
        const text = this.getBlockFullText(block);
        if (!text) {
            this.showToast('没有可提问的内容', 'error');
            return;
        }

        // 获取API密钥
        const apiKey = await this.getAPIKey();
        if (!apiKey) {
            this.showToast('请先配置智谱AI API密钥', 'error');
            return;
        }

        // 打开悬浮对话窗口
        if (window.pdfOCRFloatingChat) {
            window.pdfOCRFloatingChat.openWithContext({ context: text, apiKey: apiKey });
        } else {
            // 如果没有悬浮对话窗口，创建一个简单的对话弹窗
            this.showAIChatPopup(text, apiKey);
        }
    }

    /**
     * 对全部原文提问
     */
    async askAboutFullText() {
        const currentPage = window.pdfOCRCore ? window.pdfOCRCore.currentPage : 1;
        const currentPageBlocks = this.ocrBlocks.filter(b => b.pageIndex === currentPage);
        
        if (currentPageBlocks.length === 0) {
            this.showToast('当前页面没有识别内容', 'error');
            return;
        }
        
        const fullText = currentPageBlocks.map(b => this.getBlockFullText(b)).join('\n\n');
        
        if (!fullText || fullText.trim().length === 0) {
            this.showToast('没有可提问的内容', 'error');
            return;
        }

        const apiKey = await this.getAPIKey();
        if (!apiKey) {
            this.showToast('请先配置智谱AI API密钥', 'error');
            return;
        }

        if (window.pdfOCRFloatingChat) {
            window.pdfOCRFloatingChat.openWithContext({ 
                context: `【第${currentPage}页全部内容】\n${fullText}`, 
                apiKey: apiKey 
            });
        } else {
            this.showAIChatPopup(fullText, apiKey);
        }
    }

    /**
     * 翻译全部原文（直接替换原文内容）
     */
    async translateFullText() {
        const currentPage = window.pdfOCRCore ? window.pdfOCRCore.currentPage : 1;
        const currentPageBlocks = this.ocrBlocks.filter(b => b.pageIndex === currentPage);
        
        if (currentPageBlocks.length === 0) {
            this.showToast('当前页面没有识别内容', 'error');
            return;
        }
        
        const fullText = currentPageBlocks.map(b => this.getBlockFullText(b)).join('\n\n');
        
        if (!fullText || fullText.trim().length === 0) {
            this.showToast('没有可翻译的内容', 'error');
            return;
        }

        const apiKey = await this.getAPIKey();
        if (!apiKey) {
            this.showToast('请先配置智谱AI API密钥', 'error');
            return;
        }

        const originalContentEl = document.getElementById('ocr-original-content');
        const translateBtn = document.getElementById('translate-full-text-btn');
        
        if (!originalContentEl) {
            this.showToast('找不到原文内容区域', 'error');
            return;
        }

        if (!this._originalTextBackup) {
            this._originalTextBackup = {};
        }
        
        if (!this._originalTextBackup[currentPage]) {
            this._originalTextBackup[currentPage] = originalContentEl.innerHTML;
        }

        if (translateBtn) {
            translateBtn.disabled = true;
            translateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 翻译中...';
        }

        this.showToast('正在翻译...', 'info');

        try {
            const translated = await this.callTranslateAPI(fullText, apiKey);
            
            originalContentEl.innerHTML = `<div class="translated-content">${this.escapeHtml(translated)}</div>`;
            
            // 切换到原文标签页显示翻译内容
            this.switchContentTab('original');
            
            const restoreBtn = document.createElement('button');
            restoreBtn.className = 'tab-btn restore-btn';
            restoreBtn.style.cssText = 'background: #f97316; color: white; margin-left: 8px;';
            restoreBtn.innerHTML = '↩️ 恢复原文';
            restoreBtn.onclick = () => this.restoreOriginalText(currentPage);
            
            const contentTabs = originalContentEl.closest('.full-text-section')?.querySelector('.content-tabs');
            if (contentTabs && !contentTabs.querySelector('.restore-btn')) {
                contentTabs.appendChild(restoreBtn);
            }
            
            this.showToast('翻译完成', 'success');
            
        } catch (error) {
            console.error('[PDF-OCR] 翻译失败:', error);
            this.showToast('翻译失败: ' + error.message, 'error');
        } finally {
            if (translateBtn) {
                translateBtn.disabled = false;
                translateBtn.innerHTML = '🌐 翻译';
            }
        }
    }

    /**
     * 恢复原文内容
     */
    restoreOriginalText(pageNum) {
        const originalContentEl = document.getElementById('ocr-original-content');
        if (!originalContentEl) return;

        if (this._originalTextBackup && this._originalTextBackup[pageNum]) {
            originalContentEl.innerHTML = this._originalTextBackup[pageNum];
            delete this._originalTextBackup[pageNum];
        }

        const contentTabs = originalContentEl.closest('.full-text-section')?.querySelector('.content-tabs');
        if (contentTabs) {
            const restoreBtn = contentTabs.querySelector('.restore-btn');
            if (restoreBtn) {
                restoreBtn.remove();
            }
        }

        this.showToast('已恢复原文', 'success');
    }

    /**
     * 打开多页拼接弹窗
     */
    openMultiPageConcatPopup() {
        const popup = document.getElementById('multi-page-concat-popup');
        if (!popup) return;

        this._selectedConcatPages = [];
        this.updateConcatPageList();

        popup.style.display = 'flex';

        const closeBtn = popup.querySelector('.popup-close');
        if (closeBtn) {
            closeBtn.onclick = () => {
                popup.style.display = 'none';
            };
        }

        const selectAllBtn = document.getElementById('concat-select-all-btn');
        if (selectAllBtn) {
            selectAllBtn.onclick = () => this.concatSelectAll();
        }

        const deselectAllBtn = document.getElementById('concat-deselect-all-btn');
        if (deselectAllBtn) {
            deselectAllBtn.onclick = () => this.concatDeselectAll();
        }

        const viewBtn = document.getElementById('concat-view-btn');
        if (viewBtn) {
            viewBtn.onclick = () => this.viewConcatContent();
        }

        const translateBtn = document.getElementById('concat-translate-btn');
        if (translateBtn) {
            translateBtn.onclick = () => this.translateConcatContent();
        }

        const askBtn = document.getElementById('concat-ask-btn');
        if (askBtn) {
            askBtn.onclick = () => this.askAboutConcatContent();
        }

        popup.onclick = (e) => {
            if (e.target === popup) {
                popup.style.display = 'none';
            }
        };
    }

    /**
     * 更新拼接页面列表
     */
    updateConcatPageList() {
        const pageListEl = document.getElementById('concat-page-list');
        if (!pageListEl) return;

        const parsedPages = this.getParsedPages();
        
        if (parsedPages.length === 0) {
            pageListEl.innerHTML = '<div class="empty-tip">暂无已解析的页面，请先进行OCR解析</div>';
            this.updateConcatPreview();
            return;
        }

        pageListEl.innerHTML = parsedPages.map(pageNum => {
            const pageData = this.pageResults.get(pageNum);
            const blockCount = pageData?.blocks?.length || 0;
            const isSelected = this._selectedConcatPages?.includes(pageNum);
            return `
                <label class="concat-page-item ${isSelected ? 'selected' : ''}">
                    <input type="checkbox" data-page="${pageNum}" ${isSelected ? 'checked' : ''}>
                    <span class="page-label">第 ${pageNum} 页</span>
                    <span class="page-info">(${blockCount} 个区块)</span>
                </label>
            `;
        }).join('');

        pageListEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const pageNum = parseInt(e.target.dataset.page);
                if (e.target.checked) {
                    if (!this._selectedConcatPages.includes(pageNum)) {
                        this._selectedConcatPages.push(pageNum);
                    }
                } else {
                    this._selectedConcatPages = this._selectedConcatPages.filter(p => p !== pageNum);
                }
                this._selectedConcatPages.sort((a, b) => a - b);
                this.updateConcatPreview();
                this.updateConcatPageList();
            });
        });

        this.updateConcatPreview();
    }

    /**
     * 全选拼接页面
     */
    concatSelectAll() {
        const parsedPages = this.getParsedPages();
        this._selectedConcatPages = [...parsedPages];
        this.updateConcatPageList();
    }

    /**
     * 取消全选拼接页面
     */
    concatDeselectAll() {
        this._selectedConcatPages = [];
        this.updateConcatPageList();
    }

    /**
     * 更新拼接预览
     */
    updateConcatPreview() {
        const previewEl = document.getElementById('concat-preview-content');
        const viewBtn = document.getElementById('concat-view-btn');
        const translateBtn = document.getElementById('concat-translate-btn');
        const askBtn = document.getElementById('concat-ask-btn');

        if (!previewEl) return;

        const hasSelection = this._selectedConcatPages && this._selectedConcatPages.length > 0;

        if (viewBtn) viewBtn.disabled = !hasSelection;
        if (translateBtn) translateBtn.disabled = !hasSelection;
        if (askBtn) askBtn.disabled = !hasSelection;

        if (!hasSelection) {
            previewEl.innerHTML = '<div class="empty-tip">请选择要拼接的页面</div>';
            return;
        }

        const previewText = this.getConcatText();
        const truncated = previewText.length > 500 ? previewText.substring(0, 500) + '...' : previewText;
        previewEl.innerHTML = `<div class="preview-text">${this.escapeHtml(truncated)}</div>`;
    }

    /**
     * 获取拼接文本内容
     */
    getConcatText() {
        if (!this._selectedConcatPages || this._selectedConcatPages.length === 0) {
            return '';
        }

        const parts = [];
        this._selectedConcatPages.forEach(pageNum => {
            const pageData = this.pageResults.get(pageNum);
            if (pageData && pageData.blocks) {
                const pageText = pageData.blocks
                    .map(b => this.getBlockFullText(b))
                    .filter(t => t && t.trim())
                    .join('\n\n');
                if (pageText) {
                    parts.push(`【第${pageNum}页】\n${pageText}`);
                }
            }
        });

        return parts.join('\n\n---\n\n');
    }

    /**
     * 查看拼接内容
     */
    viewConcatContent() {
        const text = this.getConcatText();
        if (!text) {
            this.showToast('没有可查看的内容', 'error');
            return;
        }

        const popup = document.createElement('div');
        popup.className = 'ocr-concat-view-popup';
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            z-index: 10001;
            width: 600px;
            max-width: 90%;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        `;

        popup.innerHTML = `
            <div class="popup-header" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);">
                <span class="popup-title" style="font-weight: 600; font-size: 14px; color: white;">📑 拼接内容 (${this._selectedConcatPages.length}页)</span>
                <button class="popup-close" style="background: none; border: none; font-size: 20px; cursor: pointer; color: white; padding: 4px 8px;">×</button>
            </div>
            <div class="popup-body" style="padding: 16px; overflow-y: auto; flex: 1;">
                <div class="concat-content" style="font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${this.escapeHtml(text)}</div>
            </div>
            <div class="popup-footer" style="display: flex; justify-content: flex-end; gap: 8px; padding: 12px 16px; border-top: 1px solid #e2e8f0;">
                <button class="popup-btn copy-btn" style="padding: 8px 16px; border-radius: 6px; font-size: 13px; cursor: pointer; border: none; font-weight: 500; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white;">复制内容</button>
                <button class="popup-btn close-btn" style="padding: 8px 16px; border-radius: 6px; font-size: 13px; cursor: pointer; border: none; font-weight: 500; background: #f1f5f9; color: #475569;">关闭</button>
            </div>
        `;

        popup.querySelector('.popup-close').addEventListener('click', () => popup.remove());
        popup.querySelector('.close-btn').addEventListener('click', () => popup.remove());
        popup.querySelector('.copy-btn').addEventListener('click', async () => {
            await navigator.clipboard.writeText(text);
            this.showToast('内容已复制到剪贴板', 'success');
        });

        popup.addEventListener('click', (e) => {
            if (e.target === popup) popup.remove();
        });

        document.body.appendChild(popup);
    }

    /**
     * 翻译拼接内容
     */
    async translateConcatContent() {
        const text = this.getConcatText();
        if (!text) {
            this.showToast('没有可翻译的内容', 'error');
            return;
        }

        const apiKey = await this.getAPIKey();
        if (!apiKey) {
            this.showToast('请先配置智谱AI API密钥', 'error');
            return;
        }

        const translateBtn = document.getElementById('concat-translate-btn');
        if (translateBtn) {
            translateBtn.disabled = true;
            translateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 翻译中...';
        }

        this.showToast('正在翻译...', 'info');

        try {
            const translated = await this.callTranslateAPI(text, apiKey);
            this.showTranslationResult(text, translated, null);
        } catch (error) {
            console.error('[PDF-OCR] 翻译失败:', error);
            this.showToast('翻译失败: ' + error.message, 'error');
        } finally {
            if (translateBtn) {
                translateBtn.disabled = false;
                translateBtn.innerHTML = '🌐 翻译拼接';
            }
        }
    }

    /**
     * 对拼接内容提问
     */
    async askAboutConcatContent() {
        const text = this.getConcatText();
        if (!text) {
            this.showToast('没有可提问的内容', 'error');
            return;
        }

        const apiKey = await this.getAPIKey();
        if (!apiKey) {
            this.showToast('请先配置智谱AI API密钥', 'error');
            return;
        }

        const pageList = this._selectedConcatPages.map(p => `第${p}页`).join('、');
        const context = `【拼接内容 (${pageList})】\n${text}`;

        if (window.pdfOCRFloatingChat) {
            window.pdfOCRFloatingChat.openWithContext({ 
                context: context, 
                apiKey: apiKey 
            });
        } else {
            this.showAIChatPopup(text, apiKey);
        }
    }

    /**
     * 显示AI对话弹窗
     */
    showAIChatPopup(context, apiKey) {
        // 移除已有的对话弹窗
        document.querySelectorAll('.ocr-chat-popup').forEach(p => p.remove());

        const popup = document.createElement('div');
        popup.className = 'ocr-chat-popup';
        popup.innerHTML = `
            <div class="popup-header" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);">
                <span class="popup-title" style="font-weight: 600; font-size: 14px; color: white;">💬 AI问答</span>
                <button class="popup-close" style="background: none; border: none; font-size: 20px; cursor: pointer; color: white; padding: 4px 8px; min-width: 32px;">×</button>
            </div>
            <div class="popup-context" style="padding: 12px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                <div class="context-label" style="font-size: 12px; color: #64748b; margin-bottom: 4px;">选中内容：</div>
                <div class="context-text" style="font-size: 13px; color: #334155; max-height: 60px; overflow-y: auto; white-space: pre-wrap;">${this.escapeHtml(context.substring(0, 300))}${context.length > 300 ? '...' : ''}</div>
            </div>
            <div class="popup-messages" id="ocr-chat-messages" style="flex: 1; overflow-y: auto; padding: 16px;"></div>
            <div class="popup-input" style="display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid #e2e8f0;">
                <textarea id="ocr-chat-input" placeholder="输入您的问题..." style="flex: 1; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; resize: none; font-size: 14px; outline: none; color: #334155;"></textarea>
                <button class="send-btn" id="ocr-chat-send" style="padding: 10px 20px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500;">发送</button>
            </div>
        `;

        // 添加样式
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            width: 450px;
            max-width: 90%;
            height: 500px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        // 添加内部样式（用于动态内容）
        const style = document.createElement('style');
        style.textContent = `
            .ocr-chat-popup .chat-message {
                margin-bottom: 12px;
            }
            .ocr-chat-popup .chat-message.user {
                text-align: right;
            }
            .ocr-chat-popup .chat-message .message-content {
                display: inline-block;
                padding: 10px 14px;
                border-radius: 12px;
                max-width: 80%;
                text-align: left;
                font-size: 14px;
                line-height: 1.5;
            }
            .ocr-chat-popup .chat-message.user .message-content {
                background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                color: white !important;
            }
            .ocr-chat-popup .chat-message.assistant .message-content {
                background: #f1f5f9;
                color: #334155;
            }
            .ocr-chat-popup .popup-input textarea:focus {
                border-color: #22c55e;
            }
            .ocr-chat-popup .send-btn:hover {
                opacity: 0.9;
            }
        `;
        popup.appendChild(style);

        // 绑定事件
        popup.querySelector('.popup-close').addEventListener('click', () => popup.remove());

        const input = popup.querySelector('#ocr-chat-input');
        const sendBtn = popup.querySelector('#ocr-chat-send');
        const messagesContainer = popup.querySelector('#ocr-chat-messages');

        const sendMessage = async () => {
            const message = input.value.trim();
            if (!message) return;

            // 添加用户消息
            const userMsg = document.createElement('div');
            userMsg.className = 'chat-message user';
            userMsg.innerHTML = `<div class="message-content">${this.escapeHtml(message)}</div>`;
            messagesContainer.appendChild(userMsg);
            input.value = '';
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

            // 调用AI
            try {
                const response = await this.callAIChat(context, message, apiKey);
                
                // 添加AI回复
                const aiMsg = document.createElement('div');
                aiMsg.className = 'chat-message assistant';
                aiMsg.innerHTML = `<div class="message-content">${this.escapeHtml(response)}</div>`;
                messagesContainer.appendChild(aiMsg);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            } catch (error) {
                const errorMsg = document.createElement('div');
                errorMsg.className = 'chat-message assistant';
                errorMsg.innerHTML = `<div class="message-content" style="color: #ef4444;">请求失败: ${error.message}</div>`;
                messagesContainer.appendChild(errorMsg);
            }
        };

        sendBtn.addEventListener('click', sendMessage);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        document.body.appendChild(popup);
        input.focus();
    }

    /**
     * 调用AI对话API
     */
    async callAIChat(context, message, apiKey) {
        const url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'glm-4-flash',
                messages: [
                    {
                        role: 'system',
                        content: `你是一个专业的文档分析助手。用户选中了以下文档内容，请基于这个内容回答用户的问题。回答要准确、简洁、专业。\n\n选中内容：\n${context}`
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                temperature: 0.7,
                max_tokens: 2048
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API请求失败: ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '抱歉，无法生成回复';
    }

    /**
     * 获取API密钥
     */
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
     * 显示区块右键菜单
     */
    showBlockContextMenu(event, block) {
        // 移除现有菜单
        document.querySelectorAll('.ocr-context-menu').forEach(menu => menu.remove());

        const menu = document.createElement('div');
        menu.className = 'ocr-context-menu';
        menu.style.left = `${event.pageX}px`;
        menu.style.top = `${event.pageY}px`;

        menu.innerHTML = `
            <div class="menu-item" data-action="copy">
                <i class="fas fa-copy"></i> 复制内容
            </div>
            <div class="menu-item" data-action="translate">
                <i class="fas fa-language"></i> 翻译
            </div>
            <div class="menu-item" data-action="chat">
                <i class="fas fa-comment-dots"></i> 对话
            </div>
            <div class="menu-item" data-action="quote">
                <i class="fas fa-quote-right"></i> 引用
            </div>
            <div class="menu-divider"></div>
            <div class="menu-item" data-action="select">
                <i class="fas fa-check-circle"></i> 选中
            </div>
        `;

        menu.querySelector('[data-action="copy"]').addEventListener('click', () => {
            this.copyBlockContent(block);
            menu.remove();
        });

        menu.querySelector('[data-action="translate"]').addEventListener('click', () => {
            this.translateBlock(block);
            menu.remove();
        });

        menu.querySelector('[data-action="chat"]').addEventListener('click', () => {
            this.chatAboutBlock(block);
            menu.remove();
        });

        menu.querySelector('[data-action="quote"]').addEventListener('click', () => {
            this.quoteBlock(block);
            menu.remove();
        });

        menu.querySelector('[data-action="select"]').addEventListener('click', () => {
            this.selectBlock(block);
            menu.remove();
        });

        document.body.appendChild(menu);

        // 点击其他地方关闭菜单
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }

    /**
     * 对区块进行对话（使用悬浮窗口）
     */
    chatAboutBlock(block) {
        const text = this.getBlockFullText(block);
        
        // 触发打开悬浮对话窗口事件
        this.emit('openFloatingChat', {
            context: text,
            blocks: [block],
            type: 'block'
        });
        
        this.showToast('已打开对话窗口', 'success');
    }

    /**
     * 引用区块
     */
    quoteBlock(block) {
        const text = this.getBlockFullText(block);
        
        // 创建引用数据
        const quote = {
            id: Date.now(),
            text: text,
            page: block.pageIndex,
            type: block.type,
            timestamp: new Date().toLocaleString()
        };
        
        // 保存到引用列表
        let quotes = JSON.parse(localStorage.getItem('ocr_quotes') || '[]');
        quotes.push(quote);
        localStorage.setItem('ocr_quotes', JSON.stringify(quotes));
        
        this.showToast('已添加到引用列表', 'success');
        
        // 触发引用添加事件
        this.emit('quoteAdded', quote);
    }

    /**
     * 更新统计信息
     */
    updateStatistics() {
        // 统计当前页的区块
        const currentPage = window.pdfOCRCore ? window.pdfOCRCore.currentPage : 1;
        const currentPageBlocks = this.ocrBlocks.filter(b => b.pageIndex === currentPage);
        
        const stats = {
            total: currentPageBlocks.length,
            text: currentPageBlocks.filter(b => b.type === 'text').length,
            table: currentPageBlocks.filter(b => b.type === 'table').length,
            formula: currentPageBlocks.filter(b => b.type === 'formula').length,
            image: currentPageBlocks.filter(b => b.type === 'image').length
        };

        // 更新UI - 使用正确的元素ID
        const elements = {
            'stat-total': stats.total,
            'stat-text': stats.text,
            'stat-table': stats.table,
            'stat-formula': stats.formula,
            'stat-image': stats.image
        };

        Object.entries(elements).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        });

        return stats;
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

        // 动画显示
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // 自动隐藏
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
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
     * 清除所有数据（保留多页缓存）
     */
    clear() {
        // 注意：不清空pageResults和ocrBlocks，保留多页解析结果
        this.selectedBlock = null;
        this.selectedBlocks = [];
        this.highlightedBlock = null;
        this.blockOverlays.clear();

        // 清空UI
        const container = document.getElementById('ocr-blocks-layer');
        if (container) container.innerHTML = '';

        // 更新结构化内容列表（会显示当前页的结果）
        this.updateStructuredContent();

        const detailsPanel = document.getElementById('ocr-block-details');
        if (detailsPanel) {
            detailsPanel.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-mouse-pointer"></i>
                    <p>点击解析区块查看详情</p>
                </div>
            `;
        }

        // 重置统计
        this.updateStatistics();
    }

    /**
     * 完全清除所有数据（包括多页缓存）
     */
    clearAll() {
        this.ocrBlocks = [];
        this.pageResults.clear();
        this.selectedBlock = null;
        this.selectedBlocks = [];
        this.highlightedBlock = null;
        this.blockOverlays.clear();

        // 清空UI
        const container = document.getElementById('ocr-blocks-layer');
        if (container) container.innerHTML = '';

        const contentContainer = document.getElementById('ocr-structured-content');
        if (contentContainer) {
            contentContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-layer-group"></i>
                    <p>暂无结构化内容</p>
                    <p class="sub">请先上传文件并进行OCR解析</p>
                </div>
            `;
        }

        const detailsPanel = document.getElementById('ocr-block-details');
        if (detailsPanel) {
            detailsPanel.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-mouse-pointer"></i>
                    <p>点击解析区块查看详情</p>
                </div>
            `;
        }

        // 重置统计
        this.updateStatistics();
    }
}

// 暴露类定义（供 pdf-ocr-init.js 使用）
window.PDFOCRViewer = PDFOCRViewer;
window.pdfOCRViewer = null;
