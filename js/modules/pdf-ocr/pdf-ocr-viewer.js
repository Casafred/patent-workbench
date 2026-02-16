/**
 * PDF-OCR 阅读器视图模块
 * 处理OCR区块的可视化渲染、选中和交互
 */

class PDFOCRViewer {
    constructor() {
        this.ocrBlocks = [];
        this.selectedBlock = null;
        this.highlightedBlock = null;
        this.blockOverlays = new Map();
        this.isBlockMode = false;
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
                if (this.ocrBlocks.length === 0) return;
                
                // 获取点击位置相对于图片的坐标
                const result = this.getClickPositionOnImage(e, viewerWrap);
                if (result) {
                    const nearestBlock = this.findNearestBlock(result.x, result.y, result.pageIndex);
                    if (nearestBlock) {
                        this.selectBlock(nearestBlock);
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
    }

    /**
     * 获取点击位置相对于PDF图片的坐标
     */
    getClickPositionOnImage(e, viewerWrap) {
        const pdfCanvas = document.getElementById('pdf-canvas');
        const pdfImage = pdfCanvas ? pdfCanvas.querySelector('img, canvas') : null;
        
        if (!pdfImage) return null;
        
        const imageRect = pdfImage.getBoundingClientRect();
        const viewerRect = viewerWrap.getBoundingClientRect();
        
        // 计算点击位置相对于图片的坐标
        const clickX = e.clientX - imageRect.left;
        const clickY = e.clientY - imageRect.top;
        
        // 计算图片相对于原始尺寸的缩放比例
        const scaleX = pdfImage.naturalWidth ? pdfImage.naturalWidth / pdfImage.offsetWidth : 1;
        const scaleY = pdfImage.naturalHeight ? pdfImage.naturalHeight / pdfImage.offsetHeight : 1;
        
        // 转换为原始坐标
        const originalX = clickX * scaleX;
        const originalY = clickY * scaleY;
        
        // 获取当前页码
        const pageIndex = window.pdfOCRCore ? window.pdfOCRCore.currentPageIndex : 0;
        
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
        const threshold = 100; // 最大搜索距离（像素）
        
        // 筛选当前页的区块
        const currentPageBlocks = this.ocrBlocks.filter(block => block.pageIndex === pageIndex);
        
        for (const block of currentPageBlocks) {
            if (!block.bbox) continue;
            
            // 计算点击位置到区块中心的距离
            const blockCenterX = (block.bbox.lt[0] + block.bbox.rb[0]) / 2;
            const blockCenterY = (block.bbox.lt[1] + block.bbox.rb[1]) / 2;
            const distance = Math.sqrt(Math.pow(x - blockCenterX, 2) + Math.pow(y - blockCenterY, 2));
            
            // 检查点击位置是否在区块范围内或附近
            const inBlockX = x >= block.bbox.lt[0] - threshold && x <= block.bbox.rb[0] + threshold;
            const inBlockY = y >= block.bbox.lt[1] - threshold && y <= block.bbox.rb[1] + threshold;
            
            if ((inBlockX && inBlockY) || distance < threshold) {
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestBlock = block;
                }
            }
        }
        
        return nearestBlock;
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
        const contentTabBtns = panel.querySelectorAll('.full-text-section .tab-btn');
        contentTabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchContentTab(tabName);
            });
        });

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
     * 设置OCR解析结果
     */
    setOCRResult(result) {
        if (!result || !result.pages) {
            this.ocrBlocks = [];
            return;
        }

        // 提取所有页面的区块
        this.ocrBlocks = [];
        result.pages.forEach((page, pageIndex) => {
            if (page.blocks) {
                page.blocks.forEach((block, blockIndex) => {
                    this.ocrBlocks.push({
                        ...block,
                        pageIndex: pageIndex + 1,
                        blockIndex: blockIndex,
                        id: `block-${pageIndex}-${blockIndex}`
                    });
                });
            }
        });

        // 更新结构化内容列表
        this.updateStructuredContent();
        
        // 更新统计信息
        this.updateStatistics();
        
        // 如果当前是区块模式，渲染区块
        if (this.isBlockMode) {
            this.renderBlocks();
        }
    }

    /**
     * 渲染OCR区块覆盖层
     */
    renderBlocks() {
        const container = document.getElementById('ocr-blocks-layer');
        if (!container) return;

        // 显示区块层
        container.style.display = 'block';

        // 清空现有区块
        container.innerHTML = '';
        this.blockOverlays.clear();

        // 获取当前页码
        const currentPage = window.pdfOCRCore ? window.pdfOCRCore.currentPage : 1;

        // 过滤当前页的区块
        const pageBlocks = this.ocrBlocks.filter(block => block.pageIndex === currentPage);

        pageBlocks.forEach(block => {
            const overlay = this.createBlockOverlay(block);
            container.appendChild(overlay);
            this.blockOverlays.set(block.id, overlay);
        });

        // 应用筛选
        this.updateBlockVisibility();

        console.log(`[PDF-OCR] 渲染了 ${pageBlocks.length} 个区块`);
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
            // 获取viewer-wrap的滚动位置
            const viewerWrap = document.querySelector('.viewer-wrap');
            const scrollLeft = viewerWrap ? viewerWrap.scrollLeft : 0;
            const scrollTop = viewerWrap ? viewerWrap.scrollTop : 0;
            
            // 获取各元素的位置
            const viewerRect = viewerWrap ? viewerWrap.getBoundingClientRect() : { left: 0, top: 0 };
            const canvasRect = pdfCanvas.getBoundingClientRect();
            const imageRect = pdfImage.getBoundingClientRect();
            
            // 计算图片相对于viewer-wrap的偏移（考虑滚动）
            const imageOffsetLeft = imageRect.left - viewerRect.left + scrollLeft;
            const imageOffsetTop = imageRect.top - viewerRect.top + scrollTop;
            
            // 使用PDF图片的实际尺寸计算缩放比例
            const scaleX = pdfImage.offsetWidth / (block.bbox.page_width || pdfImage.offsetWidth);
            const scaleY = pdfImage.offsetHeight / (block.bbox.page_height || pdfImage.offsetHeight);

            const left = imageOffsetLeft + (block.bbox.lt[0] * scaleX);
            const top = imageOffsetTop + (block.bbox.lt[1] * scaleY);
            const width = (block.bbox.rb[0] - block.bbox.lt[0]) * scaleX;
            const height = (block.bbox.rb[1] - block.bbox.lt[1]) * scaleY;

            overlay.style.left = `${left}px`;
            overlay.style.top = `${top}px`;
            overlay.style.width = `${width}px`;
            overlay.style.height = `${height}px`;
            
            console.log(`[PDF-OCR] 创建区块 ${block.id}: left=${left.toFixed(1)}, top=${top.toFixed(1)}, width=${width.toFixed(1)}, height=${height.toFixed(1)}`);
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
            this.selectBlock(block);
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
     * 选中区块
     */
    selectBlock(block) {
        // 取消之前的选中
        this.deselectBlock();

        this.selectedBlock = block;

        // 确保区块层可见
        const layer = document.getElementById('ocr-blocks-layer');
        if (layer) {
            layer.style.display = 'block';
        }

        // 如果区块还没有渲染，先渲染
        if (!this.blockOverlays.has(block.id)) {
            this.renderBlocks();
        }

        // 更新可见性（只显示选中的区块，如果不是全部显示模式）
        this.updateBlockVisibility();

        // 高亮覆盖层
        const overlay = this.blockOverlays.get(block.id);
        if (overlay) {
            overlay.classList.add('selected');
            overlay.style.backgroundColor = this.colors.selected;
            overlay.style.borderColor = this.borderColors.selected;
            overlay.style.display = 'block'; // 确保显示
        }

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
    }

    /**
     * 取消选中区块
     */
    deselectBlock() {
        if (this.selectedBlock) {
            const overlay = this.blockOverlays.get(this.selectedBlock.id);
            if (overlay) {
                overlay.classList.remove('selected');
                const type = this.selectedBlock.type;
                overlay.style.backgroundColor = this.colors[type] || this.colors.text;
                overlay.style.borderColor = this.borderColors[type] || this.borderColors.text;
            }
            this.selectedBlock = null;
        }

        // 清除结构化列表高亮
        document.querySelectorAll('.ocr-content-item.selected').forEach(item => {
            item.classList.remove('selected');
        });

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
                if (this.selectedBlock && blockId === this.selectedBlock.id) {
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

        if (layer) {
            layer.style.display = this.isBlockMode || this.selectedBlock ? 'block' : 'none';
        }

        if (btn) {
            btn.classList.toggle('active', this.isBlockMode);
            btn.textContent = this.isBlockMode ? '隐藏全部区块' : '显示全部区块';
        }

        if (this.isBlockMode) {
            this.renderBlocks();
            this.updateBlockVisibility();
            // 自动打开悬浮面板显示识别文本
            this.showFloatingPanel();
        } else {
            // 隐藏全部区块，但如果有选中的区块，仍然显示
            this.updateBlockVisibility();
        }
        
        console.log(`[PDF-OCR] 全部区块显示模式: ${this.isBlockMode ? '开启' : '关闭'}`);
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
     * 更新结构化内容列表
     */
    updateStructuredContent() {
        const container = document.getElementById('ocr-structured-content');
        if (!container) return;

        container.innerHTML = '';

        if (this.ocrBlocks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-layer-group"></i>
                    <p>暂无结构化内容</p>
                    <p class="sub">请先上传文件并进行OCR解析</p>
                </div>
            `;
            return;
        }

        // 按页码和位置排序
        const sortedBlocks = [...this.ocrBlocks].sort((a, b) => {
            if (a.pageIndex !== b.pageIndex) {
                return a.pageIndex - b.pageIndex;
            }
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
            <div class="content-item-actions">
                <button class="btn-icon" title="复制" data-action="copy">
                    <i class="fas fa-copy"></i>
                </button>
                <button class="btn-icon" title="翻译" data-action="translate">
                    <i class="fas fa-language"></i>
                </button>
                <button class="btn-icon" title="提问" data-action="ask">
                    <i class="fas fa-comment-dots"></i>
                </button>
            </div>
        `;

        // 点击选中
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.content-item-actions')) {
                this.selectBlock(block);
                this.scrollToBlock(block.id);
            }
        });

        // 操作按钮
        item.querySelector('[data-action="copy"]').addEventListener('click', () => {
            this.copyBlockContent(block);
        });

        item.querySelector('[data-action="translate"]').addEventListener('click', () => {
            this.translateBlock(block);
        });

        item.querySelector('[data-action="ask"]').addEventListener('click', () => {
            this.askAboutBlock(block);
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
        document.querySelectorAll('.ocr-content-item').forEach(item => {
            item.classList.remove('selected');
            if (item.dataset.blockId === blockId) {
                item.classList.add('selected');
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
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
        }

        // 重新渲染区块（页面切换后）
        setTimeout(() => {
            this.renderBlocks();

            // 高亮区块
            const overlay = this.blockOverlays.get(blockId);
            if (overlay) {
                overlay.scrollIntoView({ behavior: 'smooth', block: 'center' });
                overlay.classList.add('flash');
                setTimeout(() => overlay.classList.remove('flash'), 1000);
            }
        }, 100);
    }

    /**
     * 显示区块详情
     */
    showBlockDetails(block) {
        const detailsPanel = document.getElementById('ocr-block-details');
        const currentBlockContent = document.getElementById('ocr-current-block');
        
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
            </div>
        `;

        // 绑定按钮事件
        detailsPanel.querySelector('[data-action="copy"]').addEventListener('click', () => {
            this.copyBlockContent(block);
        });

        detailsPanel.querySelector('[data-action="translate"]').addEventListener('click', () => {
            this.translateBlock(block);
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
            <div class="popup-header">
                <span class="popup-title">🌐 翻译结果</span>
                <button class="popup-close">×</button>
            </div>
            <div class="popup-body">
                <div class="translation-section">
                    <div class="section-label">原文</div>
                    <div class="section-content original">${this.escapeHtml(original.substring(0, 500))}${original.length > 500 ? '...' : ''}</div>
                </div>
                <div class="translation-section">
                    <div class="section-label">译文</div>
                    <div class="section-content translated">${this.escapeHtml(translated)}</div>
                </div>
            </div>
            <div class="popup-footer">
                <button class="popup-btn copy-btn">复制译文</button>
                <button class="popup-btn close-btn">关闭</button>
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
        `;

        // 添加内部样式
        const style = document.createElement('style');
        style.textContent = `
            .ocr-translation-popup .popup-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                color: white;
            }
            .ocr-translation-popup .popup-title {
                font-weight: 600;
                font-size: 14px;
            }
            .ocr-translation-popup .popup-close {
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                opacity: 0.8;
            }
            .ocr-translation-popup .popup-close:hover {
                opacity: 1;
            }
            .ocr-translation-popup .popup-body {
                padding: 16px;
                overflow-y: auto;
                flex: 1;
            }
            .ocr-translation-popup .translation-section {
                margin-bottom: 16px;
            }
            .ocr-translation-popup .section-label {
                font-size: 12px;
                color: #64748b;
                margin-bottom: 4px;
                font-weight: 500;
            }
            .ocr-translation-popup .section-content {
                font-size: 14px;
                line-height: 1.6;
                color: #334155;
                padding: 12px;
                background: #f8fafc;
                border-radius: 8px;
                white-space: pre-wrap;
            }
            .ocr-translation-popup .section-content.translated {
                background: #f0fdf4;
                border: 1px solid #bbf7d0;
            }
            .ocr-translation-popup .popup-footer {
                display: flex;
                justify-content: flex-end;
                gap: 8px;
                padding: 12px 16px;
                border-top: 1px solid #e2e8f0;
            }
            .ocr-translation-popup .popup-btn {
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 13px;
                cursor: pointer;
                border: none;
            }
            .ocr-translation-popup .copy-btn {
                background: #22c55e;
                color: white;
            }
            .ocr-translation-popup .copy-btn:hover {
                background: #16a34a;
            }
            .ocr-translation-popup .close-btn {
                background: #f1f5f9;
                color: #475569;
            }
            .ocr-translation-popup .close-btn:hover {
                background: #e2e8f0;
            }
        `;
        popup.appendChild(style);

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
            window.pdfOCRFloatingChat.openWithContext(text, apiKey);
        } else {
            // 如果没有悬浮对话窗口，创建一个简单的对话弹窗
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
            <div class="popup-header">
                <span class="popup-title">💬 AI问答</span>
                <button class="popup-close">×</button>
            </div>
            <div class="popup-context">
                <div class="context-label">选中内容：</div>
                <div class="context-text">${this.escapeHtml(context.substring(0, 300))}${context.length > 300 ? '...' : ''}</div>
            </div>
            <div class="popup-messages" id="ocr-chat-messages"></div>
            <div class="popup-input">
                <textarea id="ocr-chat-input" placeholder="输入您的问题..."></textarea>
                <button class="send-btn" id="ocr-chat-send">发送</button>
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
        `;

        // 添加内部样式
        const style = document.createElement('style');
        style.textContent = `
            .ocr-chat-popup .popup-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                color: white;
                flex-shrink: 0;
            }
            .ocr-chat-popup .popup-title {
                font-weight: 600;
                font-size: 14px;
            }
            .ocr-chat-popup .popup-close {
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                opacity: 0.8;
            }
            .ocr-chat-popup .popup-close:hover {
                opacity: 1;
            }
            .ocr-chat-popup .popup-context {
                padding: 12px 16px;
                background: #f8fafc;
                border-bottom: 1px solid #e2e8f0;
                flex-shrink: 0;
            }
            .ocr-chat-popup .context-label {
                font-size: 12px;
                color: #64748b;
                margin-bottom: 4px;
            }
            .ocr-chat-popup .context-text {
                font-size: 13px;
                color: #334155;
                max-height: 60px;
                overflow-y: auto;
                white-space: pre-wrap;
            }
            .ocr-chat-popup .popup-messages {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
            }
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
                color: white;
            }
            .ocr-chat-popup .chat-message.assistant .message-content {
                background: #f1f5f9;
                color: #334155;
            }
            .ocr-chat-popup .popup-input {
                display: flex;
                gap: 8px;
                padding: 12px 16px;
                border-top: 1px solid #e2e8f0;
                flex-shrink: 0;
            }
            .ocr-chat-popup .popup-input textarea {
                flex: 1;
                padding: 10px;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                resize: none;
                font-size: 14px;
                outline: none;
            }
            .ocr-chat-popup .popup-input textarea:focus {
                border-color: #22c55e;
            }
            .ocr-chat-popup .send-btn {
                padding: 10px 20px;
                background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
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
        const stats = {
            total: this.ocrBlocks.length,
            text: this.ocrBlocks.filter(b => b.type === 'text').length,
            table: this.ocrBlocks.filter(b => b.type === 'table').length,
            formula: this.ocrBlocks.filter(b => b.type === 'formula').length,
            image: this.ocrBlocks.filter(b => b.type === 'image').length
        };

        // 更新UI
        const elements = {
            'ocr-stat-total': stats.total,
            'ocr-stat-text': stats.text,
            'ocr-stat-table': stats.table,
            'ocr-stat-formula': stats.formula,
            'ocr-stat-image': stats.image
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
     * 清除所有数据
     */
    clear() {
        this.ocrBlocks = [];
        this.selectedBlock = null;
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
