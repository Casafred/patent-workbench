/**
 * 交互式专利附图标注系统 v3.0
 * 优化版本：
 * - 使用高清原图作为展示基底
 * - 移除红点标记，直接拉线
 * - 大弹窗 + 可拖动图片 + 可缩放 + 纯文本标注（无背景框）
 */

class InteractiveDrawingMarker {
    constructor(canvasId, imageUrl, detectedNumbers, referenceMap, options = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`Canvas ${canvasId} not found`);
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.imageUrl = imageUrl;
        this.detectedNumbers = detectedNumbers || [];
        this.referenceMap = referenceMap || {};
        
        // 标注数据（包含偏移位置）
        this.annotations = [];
        
        // 交互状态
        this.selectedAnnotation = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.isEditing = false;
        
        // 缩放和显示控制（小预览）
        this.scale = 1;  // 图片缩放比例（用于适应容器）
        
        // 配置选项
        this.options = {
            enableModal: options.enableModal !== false,  // 默认启用弹窗
            containerWidth: options.containerWidth || null,
            fontSize: options.fontSize || 16,  // 增大字体
            ...options
        };
        
        // 初始化
        this.init();
    }
    
    init() {
        // 加载图片
        this.loadImage();
        
        // 绑定事件
        this.bindEvents();
    }
    
    loadImage() {
        const img = new Image();
        img.onload = () => {
            this.image = img;
            this.setupCanvas();
            this.initializeAnnotations();
            this.render();
        };
        img.src = this.imageUrl;
    }
    
    setupCanvas() {
        // 使用原始图片尺寸，保持高清
        this.originalWidth = this.image.width;
        this.originalHeight = this.image.height;
        
        // 获取容器宽度
        const containerWidth = this.options.containerWidth || 
                              (this.canvas.parentElement ? this.canvas.parentElement.offsetWidth : 800);
        const maxCanvasWidth = containerWidth - 20;
        
        // 计算初始缩放比例（仅用于适应容器）
        this.scale = 1;
        if (this.originalWidth > maxCanvasWidth) {
            this.scale = maxCanvasWidth / this.originalWidth;
        }
        
        // 设置Canvas尺寸为原始尺寸（保持高清）
        this.canvas.width = this.originalWidth;
        this.canvas.height = this.originalHeight;
        
        // 设置显示尺寸（使用原始尺寸，不缩小）
        this.canvas.style.width = `${this.originalWidth}px`;
        this.canvas.style.height = `${this.originalHeight}px`;
        
        // 设置样式
        this.canvas.style.cursor = 'pointer';
        this.canvas.style.maxWidth = '100%';
        this.canvas.style.height = 'auto';
    }
    
    initializeAnnotations() {
        // 为每个检测到的标记创建标注
        this.annotations = this.detectedNumbers.map((detected, index) => {
            // 计算偏移位置（避免遮挡原始标记）
            const offsetDistance = 80; // 增大偏移距离
            const angle = (index * 45) % 360; // 分散角度
            const offsetX = Math.cos(angle * Math.PI / 180) * offsetDistance;
            const offsetY = Math.sin(angle * Math.PI / 180) * offsetDistance;
            
            return {
                id: `annotation_${index}`,
                // 原始标记位置（使用原始坐标）
                markerX: detected.x,
                markerY: detected.y,
                // 标注位置（偏移后，使用原始坐标）
                labelX: detected.x + offsetX,
                labelY: detected.y + offsetY,
                // 标注内容
                number: detected.number,
                name: detected.name || this.referenceMap[detected.number] || '未知',
                confidence: detected.confidence || 0,
                // 状态
                isHovered: false,
                isSelected: false
            };
        });
    }
    
    bindEvents() {
        // 点击打开大弹窗
        this.canvas.addEventListener('click', (e) => {
            this.openModal();
        });
    }
    
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        // 转换为Canvas坐标（考虑缩放）
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }
    
    render() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制图片（使用原始尺寸，保持高清）
        this.ctx.drawImage(this.image, 0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制所有标注
        this.annotations.forEach(annotation => {
            this.drawAnnotation(annotation);
        });
    }
    
    drawAnnotation(annotation) {
        const ctx = this.ctx;
        const fontSize = this.options.fontSize || 18;
        
        // 1. 绘制连接线（从原始标记位置到标注文字）
        ctx.beginPath();
        ctx.moveTo(annotation.markerX, annotation.markerY);
        ctx.lineTo(annotation.labelX, annotation.labelY);
        ctx.strokeStyle = '#FF5722';  // 橙红色线条，更醒目
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 2. 绘制纯文本标注（无背景框，无红点）
        const text = `${annotation.number}: ${annotation.name}`;
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        
        // 添加白色描边，增强可读性
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 4;
        ctx.strokeText(text, annotation.labelX, annotation.labelY);
        
        // 绘制文字（使用醒目的颜色）
        ctx.fillStyle = '#FF5722';  // 橙红色文字
        ctx.fillText(text, annotation.labelX, annotation.labelY);
    }
    
    // 导出标注数据
    exportAnnotations() {
        return this.annotations.map(a => ({
            number: a.number,
            name: a.name,
            markerPosition: { x: a.markerX, y: a.markerY },
            labelPosition: { x: a.labelX, y: a.labelY },
            confidence: a.confidence
        }));
    }
    
    // 导出标注后的图片
    exportImage() {
        return this.canvas.toDataURL('image/png');
    }
    
    // 打开大弹窗查看
    openModal() {
        if (!this.options.enableModal) return;
        
        // 创建弹窗
        const modal = this.createModal();
        document.body.appendChild(modal);
        
        // 显示弹窗
        setTimeout(() => {
            modal.style.display = 'flex';
        }, 10);
    }
    
    createModal() {
        const modal = document.createElement('div');
        modal.className = 'drawing-marker-modal';
        modal.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.95);
            z-index: 10000;
            justify-content: center;
            align-items: center;
        `;
        
        // 工具栏
        const toolbar = document.createElement('div');
        toolbar.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            display: flex;
            gap: 10px;
            z-index: 10002;
        `;
        
        // 缩放状态
        let currentZoom = 1.0;
        const minZoom = 0.5;
        const maxZoom = 5.0;
        const zoomStep = 0.2;
        
        // 缩放显示
        const zoomDisplay = document.createElement('div');
        zoomDisplay.style.cssText = `
            background-color: rgba(255, 255, 255, 0.95);
            padding: 10px 20px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 16px;
            color: #333;
        `;
        zoomDisplay.textContent = `${Math.round(currentZoom * 100)}%`;
        
        // 图片容器（可滚动）
        const container = document.createElement('div');
        container.style.cssText = `
            width: 90%;
            height: 85%;
            overflow: auto;
            background-color: #f5f5f5;
            border-radius: 8px;
            position: relative;
            cursor: grab;
        `;
        
        // 创建新的Canvas用于大弹窗显示
        const modalCanvas = document.createElement('canvas');
        modalCanvas.width = this.originalWidth;
        modalCanvas.height = this.originalHeight;
        modalCanvas.style.cssText = `
            display: block;
            margin: 0 auto;
            transition: transform 0.1s ease-out;
        `;
        
        // 绘制高清图片和标注到modalCanvas
        const modalCtx = modalCanvas.getContext('2d');
        modalCtx.drawImage(this.image, 0, 0, this.originalWidth, this.originalHeight);
        
        // 绘制标注
        this.annotations.forEach(annotation => {
            const fontSize = 22;  // 大弹窗使用更大字体
            
            // 绘制连接线
            modalCtx.beginPath();
            modalCtx.moveTo(annotation.markerX, annotation.markerY);
            modalCtx.lineTo(annotation.labelX, annotation.labelY);
            modalCtx.strokeStyle = '#FF5722';  // 橙红色线条
            modalCtx.lineWidth = 3;
            modalCtx.stroke();
            
            // 绘制纯文本标注（无背景框，无红点）
            const text = `${annotation.number}: ${annotation.name}`;
            modalCtx.font = `bold ${fontSize}px Arial, sans-serif`;
            modalCtx.textBaseline = 'middle';
            modalCtx.textAlign = 'left';
            
            // 白色描边
            modalCtx.strokeStyle = '#FFFFFF';
            modalCtx.lineWidth = 5;
            modalCtx.strokeText(text, annotation.labelX, annotation.labelY);
            
            // 橙红色文字
            modalCtx.fillStyle = '#FF5722';
            modalCtx.fillText(text, annotation.labelX, annotation.labelY);
        });
        
        // 更新Canvas显示尺寸
        const updateCanvasSize = () => {
            modalCanvas.style.width = `${this.originalWidth * currentZoom}px`;
            modalCanvas.style.height = `${this.originalHeight * currentZoom}px`;
        };
        updateCanvasSize();
        
        // 缩放按钮
        const zoomInBtn = this.createButton('放大 +', () => {
            currentZoom = Math.min(maxZoom, currentZoom + zoomStep);
            updateCanvasSize();
            zoomDisplay.textContent = `${Math.round(currentZoom * 100)}%`;
        });
        
        const zoomOutBtn = this.createButton('缩小 -', () => {
            currentZoom = Math.max(minZoom, currentZoom - zoomStep);
            updateCanvasSize();
            zoomDisplay.textContent = `${Math.round(currentZoom * 100)}%`;
        });
        
        const resetBtn = this.createButton('重置 100%', () => {
            currentZoom = 1.0;
            updateCanvasSize();
            zoomDisplay.textContent = `${Math.round(currentZoom * 100)}%`;
            container.scrollLeft = 0;
            container.scrollTop = 0;
        });
        
        const closeBtn = this.createButton('关闭 ×', () => {
            modal.remove();
        });
        closeBtn.style.backgroundColor = '#f44336';
        
        toolbar.appendChild(zoomDisplay);
        toolbar.appendChild(zoomOutBtn);
        toolbar.appendChild(resetBtn);
        toolbar.appendChild(zoomInBtn);
        toolbar.appendChild(closeBtn);
        
        // 鼠标滚轮缩放
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
            currentZoom = Math.max(minZoom, Math.min(maxZoom, currentZoom + delta));
            updateCanvasSize();
            zoomDisplay.textContent = `${Math.round(currentZoom * 100)}%`;
        }, { passive: false });
        
        // 拖动图片功能
        let isDragging = false;
        let startX, startY, scrollLeft, scrollTop;
        
        container.addEventListener('mousedown', (e) => {
            isDragging = true;
            container.style.cursor = 'grabbing';
            startX = e.pageX - container.offsetLeft;
            startY = e.pageY - container.offsetTop;
            scrollLeft = container.scrollLeft;
            scrollTop = container.scrollTop;
        });
        
        container.addEventListener('mouseleave', () => {
            isDragging = false;
            container.style.cursor = 'grab';
        });
        
        container.addEventListener('mouseup', () => {
            isDragging = false;
            container.style.cursor = 'grab';
        });
        
        container.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const x = e.pageX - container.offsetLeft;
            const y = e.pageY - container.offsetTop;
            const walkX = (x - startX) * 1.5;  // 拖动速度
            const walkY = (y - startY) * 1.5;
            container.scrollLeft = scrollLeft - walkX;
            container.scrollTop = scrollTop - walkY;
        });
        
        container.appendChild(modalCanvas);
        modal.appendChild(toolbar);
        modal.appendChild(container);
        
        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // ESC键关闭
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
        
        return modal;
    }
    
    createButton(text, onClick) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.cssText = `
            background-color: #4caf50;
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
        `;
        btn.addEventListener('click', onClick);
        btn.addEventListener('mouseenter', () => {
            btn.style.opacity = '0.8';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.opacity = '1';
        });
        return btn;
    }
}

// 全局存储所有交互式标注实例
window.interactiveMarkers = window.interactiveMarkers || [];
