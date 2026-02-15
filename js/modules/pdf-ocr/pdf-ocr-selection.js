/**
 * PDF-OCR 划词选中模块
 * 处理PDF查看器上的文本选择功能
 */

class PDFOCRSelection {
    constructor() {
        this.isSelecting = false;
        this.startPoint = null;
        this.endPoint = null;
        this.selectedBlocks = [];
        this.selectedText = '';
        this.selectionBox = null;
        this.highlightOverlays = [];
        
        // 配置
        this.config = {
            minSelectionSize: 10, // 最小选择尺寸（像素）
            highlightColor: 'rgba(59, 130, 246, 0.3)',
            highlightBorderColor: '#3b82f6',
            selectionBoxColor: 'rgba(59, 130, 246, 0.1)',
            selectionBorderColor: '#3b82f6'
        };
        
        this.init();
    }
    
    init() {
        this.initElements();
        this.bindEvents();
    }
    
    initElements() {
        this.elements = {
            viewerContainer: document.getElementById('pdf-canvas'),
            selectionLayer: null
        };
        
        // 创建选择层
        this.createSelectionLayer();
    }
    
    /**
     * 创建选择层
     */
    createSelectionLayer() {
        const container = this.elements.viewerContainer;
        if (!container) return;
        
        // 检查是否已存在
        let selectionLayer = document.getElementById('ocr-selection-layer');
        if (!selectionLayer) {
            selectionLayer = document.createElement('div');
            selectionLayer.id = 'ocr-selection-layer';
            selectionLayer.className = 'ocr-selection-layer';
            selectionLayer.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 100;
                cursor: text;
                user-select: none;
            `;
            container.appendChild(selectionLayer);
        }
        
        this.elements.selectionLayer = selectionLayer;
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        const layer = this.elements.selectionLayer;
        if (!layer) return;
        
        // 鼠标按下 - 开始选择
        layer.addEventListener('mousedown', (e) => this.onMouseDown(e));
        
        // 鼠标移动 - 更新选择
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        
        // 鼠标释放 - 结束选择
        document.addEventListener('mouseup', (e) => this.onMouseUp(e));
        
        // 双击选中单词
        layer.addEventListener('dblclick', (e) => this.onDoubleClick(e));
        
        // 点击空白处取消选择
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.ocr-selection-layer') && 
                !e.target.closest('.floating-toolbar') &&
                !e.target.closest('.floating-chat-window')) {
                this.clearSelection();
            }
        });
    }
    
    /**
     * 鼠标按下处理
     */
    onMouseDown(e) {
        // 只处理左键
        if (e.button !== 0) return;
        
        // 如果点击的是OCR区块，不启动选择
        if (e.target.closest('.ocr-block-overlay')) return;
        
        this.isSelecting = true;
        this.startPoint = {
            x: e.offsetX,
            y: e.offsetY
        };
        this.endPoint = { ...this.startPoint };
        
        // 清除之前的选择
        this.clearSelection();
        
        // 创建选择框
        this.createSelectionBox();
        
        e.preventDefault();
    }
    
    /**
     * 鼠标移动处理
     */
    onMouseMove(e) {
        if (!this.isSelecting) return;
        
        const layer = this.elements.selectionLayer;
        if (!layer) return;
        
        const rect = layer.getBoundingClientRect();
        this.endPoint = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        // 更新选择框
        this.updateSelectionBox();
        
        // 实时高亮选中的区块
        this.highlightSelectedBlocks();
    }
    
    /**
     * 鼠标释放处理
     */
    onMouseUp(e) {
        if (!this.isSelecting) return;
        
        this.isSelecting = false;
        
        // 检查选择大小
        const selectionWidth = Math.abs(this.endPoint.x - this.startPoint.x);
        const selectionHeight = Math.abs(this.endPoint.y - this.startPoint.y);
        
        if (selectionWidth < this.config.minSelectionSize || 
            selectionHeight < this.config.minSelectionSize) {
            this.clearSelection();
            return;
        }
        
        // 获取选中的区块
        this.updateSelectedBlocks();
        
        // 如果有选中内容，显示工具栏
        if (this.selectedBlocks.length > 0 || this.selectedText) {
            this.showFloatingToolbar();
        } else {
            this.clearSelection();
        }
    }
    
    /**
     * 双击处理 - 选中单词
     */
    onDoubleClick(e) {
        const clickPoint = {
            x: e.offsetX,
            y: e.offsetY
        };
        
        // 查找点击位置对应的OCR区块
        const block = this.findBlockAtPoint(clickPoint);
        if (block) {
            // 选中整个区块
            this.selectBlock(block);
        }
    }
    
    /**
     * 创建选择框
     */
    createSelectionBox() {
        this.selectionBox = document.createElement('div');
        this.selectionBox.className = 'ocr-selection-box';
        this.selectionBox.style.cssText = `
            position: absolute;
            background-color: ${this.config.selectionBoxColor};
            border: 1px dashed ${this.config.selectionBorderColor};
            pointer-events: none;
            z-index: 101;
        `;
        
        this.elements.selectionLayer.appendChild(this.selectionBox);
    }
    
    /**
     * 更新选择框位置和大小
     */
    updateSelectionBox() {
        if (!this.selectionBox) return;
        
        const left = Math.min(this.startPoint.x, this.endPoint.x);
        const top = Math.min(this.startPoint.y, this.endPoint.y);
        const width = Math.abs(this.endPoint.x - this.startPoint.x);
        const height = Math.abs(this.endPoint.y - this.startPoint.y);
        
        this.selectionBox.style.left = `${left}px`;
        this.selectionBox.style.top = `${top}px`;
        this.selectionBox.style.width = `${width}px`;
        this.selectionBox.style.height = `${height}px`;
    }
    
    /**
     * 高亮选中的区块
     */
    highlightSelectedBlocks() {
        // 清除之前的高亮
        this.clearHighlightOverlays();
        
        // 获取选择区域
        const selectionRect = this.getSelectionRect();
        
        // 获取当前页的OCR区块
        const blocks = this.getCurrentPageBlocks();
        
        // 找出与选择区域相交的区块
        blocks.forEach(block => {
            if (this.isBlockInSelection(block, selectionRect)) {
                this.highlightBlock(block);
            }
        });
    }
    
    /**
     * 更新选中的区块列表
     */
    updateSelectedBlocks() {
        const selectionRect = this.getSelectionRect();
        const blocks = this.getCurrentPageBlocks();
        
        this.selectedBlocks = blocks.filter(block => 
            this.isBlockInSelection(block, selectionRect)
        );
        
        // 提取选中的文本
        this.selectedText = this.extractSelectedText();
        
        // 更新高亮
        this.clearHighlightOverlays();
        this.selectedBlocks.forEach(block => this.highlightBlock(block));
    }
    
    /**
     * 获取选择区域
     */
    getSelectionRect() {
        return {
            left: Math.min(this.startPoint.x, this.endPoint.x),
            top: Math.min(this.startPoint.y, this.endPoint.y),
            right: Math.max(this.startPoint.x, this.endPoint.x),
            bottom: Math.max(this.startPoint.y, this.endPoint.y)
        };
    }
    
    /**
     * 获取当前页的OCR区块
     */
    getCurrentPageBlocks() {
        const currentPage = window.pdfOCRCore?.currentPage || 1;
        const allBlocks = window.pdfOCRViewer?.ocrBlocks || [];
        return allBlocks.filter(block => block.pageIndex === currentPage);
    }
    
    /**
     * 判断区块是否在选择区域内
     */
    isBlockInSelection(block, selectionRect) {
        if (!block.bbox) return false;
        
        // 获取区块在视口中的位置
        const blockRect = this.getBlockRect(block);
        
        // 检查是否相交
        return !(blockRect.right < selectionRect.left || 
                 blockRect.left > selectionRect.right || 
                 blockRect.bottom < selectionRect.top || 
                 blockRect.top > selectionRect.bottom);
    }
    
    /**
     * 获取区块在视口中的矩形位置
     */
    getBlockRect(block) {
        const container = this.elements.viewerContainer;
        if (!container || !block.bbox) {
            return { left: 0, top: 0, right: 0, bottom: 0 };
        }
        
        // 获取容器尺寸
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;
        
        // 获取页面原始尺寸
        const pageWidth = block.bbox.page_width || containerWidth;
        const pageHeight = block.bbox.page_height || containerHeight;
        
        // 计算缩放比例
        const scaleX = containerWidth / pageWidth;
        const scaleY = containerHeight / pageHeight;
        
        // 计算区块位置
        const left = block.bbox.lt[0] * scaleX;
        const top = block.bbox.lt[1] * scaleY;
        const right = block.bbox.rb[0] * scaleX;
        const bottom = block.bbox.rb[1] * scaleY;
        
        return { left, top, right, bottom };
    }
    
    /**
     * 高亮单个区块
     */
    highlightBlock(block) {
        const container = this.elements.viewerContainer;
        if (!container) return;
        
        const blockRect = this.getBlockRect(block);
        
        const overlay = document.createElement('div');
        overlay.className = 'ocr-highlight-overlay';
        overlay.style.cssText = `
            position: absolute;
            left: ${blockRect.left}px;
            top: ${blockRect.top}px;
            width: ${blockRect.right - blockRect.left}px;
            height: ${blockRect.bottom - blockRect.top}px;
            background-color: ${this.config.highlightColor};
            border: 1px solid ${this.config.highlightBorderColor};
            pointer-events: none;
            z-index: 99;
        `;
        
        container.appendChild(overlay);
        this.highlightOverlays.push(overlay);
    }
    
    /**
     * 清除高亮覆盖层
     */
    clearHighlightOverlays() {
        this.highlightOverlays.forEach(overlay => overlay.remove());
        this.highlightOverlays = [];
    }
    
    /**
     * 提取选中的文本
     */
    extractSelectedText() {
        if (this.selectedBlocks.length === 0) return '';
        
        // 按阅读顺序排序
        const sortedBlocks = [...this.selectedBlocks].sort((a, b) => {
            const rectA = this.getBlockRect(a);
            const rectB = this.getBlockRect(b);
            
            // 先按行排序（y坐标）
            if (Math.abs(rectA.top - rectB.top) > 20) {
                return rectA.top - rectB.top;
            }
            // 同行按x坐标排序
            return rectA.left - rectB.left;
        });
        
        // 提取文本
        return sortedBlocks.map(block => {
            switch (block.type) {
                case 'formula':
                    return block.latex || block.text || '';
                case 'table':
                    return block.text || '';
                default:
                    return block.text || '';
            }
        }).join('\n');
    }
    
    /**
     * 查找指定位置的区块
     */
    findBlockAtPoint(point) {
        const blocks = this.getCurrentPageBlocks();
        
        return blocks.find(block => {
            const rect = this.getBlockRect(block);
            return point.x >= rect.left && point.x <= rect.right &&
                   point.y >= rect.top && point.y <= rect.bottom;
        });
    }
    
    /**
     * 选中单个区块
     */
    selectBlock(block) {
        this.clearSelection();
        this.selectedBlocks = [block];
        this.selectedText = this.extractSelectedText();
        this.highlightBlock(block);
        this.showFloatingToolbar();
    }
    
    /**
     * 显示悬浮工具栏
     */
    showFloatingToolbar() {
        // 计算工具栏位置
        const selectionRect = this.getSelectionRect();
        const toolbarX = (selectionRect.left + selectionRect.right) / 2;
        const toolbarY = selectionRect.top - 50; // 在选择区域上方
        
        // 触发显示工具栏事件
        this.emit('showToolbar', {
            x: toolbarX,
            y: toolbarY,
            selectedText: this.selectedText,
            selectedBlocks: this.selectedBlocks,
            selectionRect: selectionRect
        });
    }
    
    /**
     * 清除选择
     */
    clearSelection() {
        this.isSelecting = false;
        this.startPoint = null;
        this.endPoint = null;
        this.selectedBlocks = [];
        this.selectedText = '';
        
        // 移除选择框
        if (this.selectionBox) {
            this.selectionBox.remove();
            this.selectionBox = null;
        }
        
        // 清除高亮
        this.clearHighlightOverlays();
        
        // 触发清除事件
        this.emit('clearSelection');
    }
    
    /**
     * 获取选中的文本
     */
    getSelectedText() {
        return this.selectedText;
    }
    
    /**
     * 获取选中的区块
     */
    getSelectedBlocks() {
        return this.selectedBlocks;
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
     * 销毁
     */
    destroy() {
        this.clearSelection();
        if (this.elements.selectionLayer) {
            this.elements.selectionLayer.remove();
        }
    }
}

// 暴露类定义
window.PDFOCRSelection = PDFOCRSelection;
window.pdfO