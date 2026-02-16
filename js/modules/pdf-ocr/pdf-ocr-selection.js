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
            minSelectionSize: 10,
            highlightColor: 'rgba(59, 130, 246, 0.3)',
            highlightBorderColor: '#3b82f6',
            selectionBoxColor: 'rgba(59, 130, 246, 0.1)',
            selectionBorderColor: '#3b82f6'
        };
        
        this.init();
    }
    
    init() {
        this.initElements();
        this.bindGlobalEvents();
    }
    
    initElements() {
        this.elements = {
            viewerWrap: document.querySelector('.viewer-wrap'),
            selectionLayer: null
        };
        
        // 延迟创建选择层
        setTimeout(() => {
            this.createSelectionLayer();
        }, 100);
    }
    
    /**
     * 创建选择层
     */
    createSelectionLayer() {
        const container = document.querySelector('.viewer-wrap');
        if (!container) {
            console.warn('[PDF-OCR] 无法找到viewer-wrap容器');
            setTimeout(() => this.createSelectionLayer(), 500);
            return;
        }
        
        this.elements.viewerWrap = container;
        
        // 检查是否已存在
        let selectionLayer = document.getElementById('ocr-selection-layer');
        if (selectionLayer) {
            selectionLayer.remove();
        }
        
        selectionLayer = document.createElement('div');
        selectionLayer.id = 'ocr-selection-layer';
        selectionLayer.className = 'selection-layer';
        selectionLayer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 100;
            cursor: text;
            user-select: none;
            display: none;
        `;
        container.appendChild(selectionLayer);
        
        this.elements.selectionLayer = selectionLayer;
        console.log('[PDF-OCR] 选择层已创建');
        
        // 绑定事件
        this.bindSelectionEvents();
    }
    
    /**
     * 显示选择层（当PDF加载后）
     */
    showSelectionLayer() {
        if (this.elements.selectionLayer) {
            this.elements.selectionLayer.style.display = 'block';
        }
    }
    
    /**
     * 隐藏选择层
     */
    hideSelectionLayer() {
        if (this.elements.selectionLayer) {
            this.elements.selectionLayer.style.display = 'none';
        }
    }
    
    /**
     * 重新创建选择层
     */
    recreateSelectionLayer() {
        this.clearSelection();
        this.createSelectionLayer();
        this.showSelectionLayer();
    }
    
    /**
     * 绑定选择层事件
     */
    bindSelectionEvents() {
        const layer = this.elements.selectionLayer;
        if (!layer) return;
        
        // 鼠标按下 - 开始选择
        layer.addEventListener('mousedown', (e) => this.onMouseDown(e));
        
        // 双击选中
        layer.addEventListener('dblclick', (e) => this.onDoubleClick(e));
    }
    
    /**
     * 绑定全局事件
     */
    bindGlobalEvents() {
        // 鼠标移动 - 更新选择
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        
        // 鼠标释放 - 结束选择
        document.addEventListener('mouseup', (e) => this.onMouseUp(e));
        
        // 点击空白处取消选择
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.selection-layer') && 
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
        if (e.button !== 0) return;
        
        // 如果点击的是OCR区块，不启动选择
        if (e.target.closest('.ocr-block-overlay')) return;
        
        const layer = this.elements.selectionLayer;
        const rect = layer.getBoundingClientRect();
        
        this.isSelecting = true;
        this.startPoint = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        this.endPoint = { ...this.startPoint };
        
        this.clearSelection();
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
        
        this.updateSelectionBox();
        this.highlightSelectedBlocks();
    }
    
    /**
     * 鼠标释放处理
     */
    onMouseUp(e) {
        if (!this.isSelecting) return;
        
        this.isSelecting = false;
        
        const selectionWidth = Math.abs(this.endPoint.x - this.startPoint.x);
        const selectionHeight = Math.abs(this.endPoint.y - this.startPoint.y);
        
        if (selectionWidth < this.config.minSelectionSize || 
            selectionHeight < this.config.minSelectionSize) {
            this.clearSelection();
            return;
        }
        
        this.updateSelectedBlocks();
        
        if (this.selectedBlocks.length > 0 || this.selectedText) {
            this.showFloatingToolbar();
        } else {
            this.clearSelection();
        }
    }
    
    /**
     * 双击处理
     */
    onDoubleClick(e) {
        const layer = this.elements.selectionLayer;
        const rect = layer.getBoundingClientRect();
        
        const clickPoint = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        const block = this.findBlockAtPoint(clickPoint);
        if (block) {
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
     * 更新选择框
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
        this.clearHighlightOverlays();
        
        const selectionRect = this.getSelectionRect();
        const blocks = this.getCurrentPageBlocks();
        
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
        
        this.selectedText = this.extractSelectedText();
        
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
        
        const blockRect = this.getBlockRect(block);
        
        return !(blockRect.right < selectionRect.left || 
                 blockRect.left > selectionRect.right || 
                 blockRect.bottom < selectionRect.top || 
                 blockRect.top > selectionRect.bottom);
    }
    
    /**
     * 获取区块在视口中的矩形位置
     */
    getBlockRect(block) {
        const container = document.querySelector('.viewer-wrap');
        if (!container || !block.bbox) {
            return { left: 0, top: 0, right: 0, bottom: 0 };
        }
        
        // 获取PDF图片实际尺寸
        const pdfImage = container.querySelector('img, canvas');
        if (!pdfImage) return { left: 0, top: 0, right: 0, bottom: 0 };
        
        const containerWidth = pdfImage.offsetWidth;
        const containerHeight = pdfImage.offsetHeight;
        
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
        const container = document.querySelector('.viewer-wrap');
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
        
        const sortedBlocks = [...this.selectedBlocks].sort((a, b) => {
            const rectA = this.getBlockRect(a);
            const rectB = this.getBlockRect(b);
            
            if (Math.abs(rectA.top - rectB.top) > 20) {
                return rectA.top - rectB.top;
            }
            return rectA.left - rectB.left;
        });
        
        return sortedBlocks.map(block => block.content || block.text || '').join('\n');
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
        this.selectedText = block.content || block.text || '';
        this.highlightBlock(block);
        this.showFloatingToolbar();
    }
    
    /**
     * 显示悬浮工具栏
     */
    showFloatingToolbar() {
        const selectionRect = this.getSelectionRect();
        const layer = this.elements.selectionLayer;
        if (!layer) return;
        
        const layerRect = layer.getBoundingClientRect();
        
        this.emit('showToolbar', {
            x: layerRect.left + (selectionRect.left + selectionRect.right) / 2,
            y: layerRect.top + selectionRect.top - 50,
            selectedText: this.selectedText,
            selectedBlocks: this.selectedBlocks
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
        
        if (this.selectionBox) {
            this.selectionBox.remove();
            this.selectionBox = null;
        }
        
        this.clearHighlightOverlays();
        
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

window.PDFOCRSelection = PDFOCRSelection;
window.pdfOCRSelection = null;
