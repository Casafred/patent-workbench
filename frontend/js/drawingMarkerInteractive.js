/**
 * 交互式专利附图标注系统 v2.0
 * 支持拖动标注、编辑文字、连线显示、缩放查看、弹窗展示
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
        
        // 缩放和显示控制
        this.scale = 1;  // 图片缩放比例（用于适应容器）
        this.zoom = 1;   // 用户缩放比例（1.0 = 100%）
        this.minZoom = 0.5;
        this.maxZoom = 3.0;
        this.zoomStep = 0.1;
        
        // 配置选项
        this.options = {
            enableModal: options.enableModal !== false,  // 默认启用弹窗
            containerWidth: options.containerWidth || null,
            fontSize: options.fontSize || 12,
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
        
        // 设置显示尺寸
        this.updateCanvasDisplaySize();
        
        // 设置样式
        this.canvas.style.cursor = 'default';
    }
    
    updateCanvasDisplaySize() {
        // 更新Canvas的显示尺寸（CSS尺寸）
        const displayWidth = this.originalWidth * this.scale * this.zoom;
        const displayHeight = this.originalHeight * this.scale * this.zoom;
        
        this.canvas.style.width = `${displayWidth}px`;
        this.canvas.style.height = `${displayHeight}px`;
    }
    
    initializeAnnotations() {
        // 为每个检测到的标记创建标注
        this.annotations = this.detectedNumbers.map((detected, index) => {
            // 计算偏移位置（避免遮挡原始标记）
            const offsetDistance = 60; // 偏移距离
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
                // 样式
                width: 0, // 将在渲染时计算
                height: 30,
                // 状态
                isHovered: false,
                isSelected: false
            };
        });
    }
    
    bindEvents() {
        // 鼠标移动
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        
        // 鼠标按下
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        
        // 鼠标释放
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        // 鼠标离开
        this.canvas.addEventListener('mouseleave', (e) => this.handleMouseLeave(e));
        
        // 双击编辑
        this.canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
        
        // 鼠标滚轮缩放
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
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
    
    handleMouseMove(e) {
        const pos = this.getMousePos(e);
        
        if (this.isDragging && this.selectedAnnotation) {
            // 拖动标注
            this.selectedAnnotation.labelX = pos.x - this.dragOffset.x;
            this.selectedAnnotation.labelY = pos.y - this.dragOffset.y;
            this.render();
            return;
        }
        
        // 检查鼠标悬停
        let hoveredAnnotation = null;
        for (const annotation of this.annotations) {
            if (this.isPointInAnnotation(pos, annotation)) {
                hoveredAnnotation = annotation;
                break;
            }
        }
        
        // 更新悬停状态
        let needsRender = false;
        for (const annotation of this.annotations) {
            const wasHovered = annotation.isHovered;
            annotation.isHovered = (annotation === hoveredAnnotation);
            if (wasHovered !== annotation.isHovered) {
                needsRender = true;
            }
        }
        
        // 更新光标
        this.canvas.style.cursor = hoveredAnnotation ? 'move' : 'default';
        
        if (needsRender) {
            this.render();
        }
    }
    
    handleMouseDown(e) {
        const pos = this.getMousePos(e);
        
        // 查找点击的标注
        for (const annotation of this.annotations) {
            if (this.isPointInAnnotation(pos, annotation)) {
                this.selectedAnnotation = annotation;
                this.isDragging = true;
                this.dragOffset = {
                    x: pos.x - annotation.labelX,
                    y: pos.y - annotation.labelY
                };
                
                // 更新选中状态
                this.annotations.forEach(a => a.isSelected = false);
                annotation.isSelected = true;
                
                this.render();
                return;
            }
        }
        
        // 点击空白处取消选中
        if (this.selectedAnnotation) {
            this.annotations.forEach(a => a.isSelected = false);
            this.selectedAnnotation = null;
            this.render();
        }
    }
    
    handleMouseUp(e) {
        this.isDragging = false;
    }
    
    handleMouseLeave(e) {
        this.isDragging = false;
        
        // 清除悬停状态
        let needsRender = false;
        for (const annotation of this.annotations) {
            if (annotation.isHovered) {
                annotation.isHovered = false;
                needsRender = true;
            }
        }
        
        if (needsRender) {
            this.render();
        }
    }
    
    handleDoubleClick(e) {
        const pos = this.getMousePos(e);
        
        // 查找双击的标注
        for (const annotation of this.annotations) {
            if (this.isPointInAnnotation(pos, annotation)) {
                this.editAnnotation(annotation);
                return;
            }
        }
    }
    
    handleWheel(e) {
        e.preventDefault();
        
        // 计算缩放
        const delta = e.deltaY > 0 ? -this.zoomStep : this.zoomStep;
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom + delta));
        
        if (newZoom !== this.zoom) {
            this.zoom = newZoom;
            this.updateCanvasDisplaySize();
            this.render();
            
            // 触发缩放事件（用于更新UI）
            if (this.options.onZoomChange) {
                this.options.onZoomChange(this.zoom);
            }
        }
    }
    
    isPointInAnnotation(point, annotation) {
        return point.x >= annotation.labelX &&
               point.x <= annotation.labelX + annotation.width &&
               point.y >= annotation.labelY - annotation.height &&
               point.y <= annotation.labelY;
    }
    
    editAnnotation(annotation) {
        const newName = prompt('编辑标注名称:', annotation.name);
        if (newName !== null && newName.trim() !== '') {
            annotation.name = newName.trim();
            this.render();
        }
    }
    
    // 缩放控制方法
    zoomIn() {
        const newZoom = Math.min(this.maxZoom, this.zoom + this.zoomStep);
        if (newZoom !== this.zoom) {
            this.zoom = newZoom;
            this.updateCanvasDisplaySize();
            this.render();
            return this.zoom;
        }
        return this.zoom;
    }
    
    zoomOut() {
        const newZoom = Math.max(this.minZoom, this.zoom - this.zoomStep);
        if (newZoom !== this.zoom) {
            this.zoom = newZoom;
            this.updateCanvasDisplaySize();
            this.render();
            return this.zoom;
        }
        return this.zoom;
    }
    
    resetZoom() {
        this.zoom = 1;
        this.updateCanvasDisplaySize();
        this.render();
        return this.zoom;
    }
    
    setZoom(zoom) {
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
        this.updateCanvasDisplaySize();
        this.render();
        return this.zoom;
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
        
        // 根据缩放调整字体大小
        const baseFontSize = this.options.fontSize || 12;
        const fontSize = baseFontSize;  // 字体大小不随zoom变化，保持清晰
        
        // 1. 绘制原始标记位置（小圆点）
        ctx.beginPath();
        ctx.arc(annotation.markerX, annotation.markerY, 5, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 2. 绘制连接线
        ctx.beginPath();
        ctx.moveTo(annotation.markerX, annotation.markerY);
        ctx.lineTo(annotation.labelX, annotation.labelY - annotation.height / 2);
        ctx.strokeStyle = annotation.isSelected ? '#2196f3' : 
                         annotation.isHovered ? '#ff9800' : 
                         'rgba(100, 100, 100, 0.5)';
        ctx.lineWidth = annotation.isSelected ? 2 : 1;
        ctx.setLineDash([5, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // 3. 绘制标注框
        const text = `${annotation.number}: ${annotation.name}`;
        ctx.font = `bold ${fontSize}px Arial`;
        const textMetrics = ctx.measureText(text);
        const padding = 8;
        const boxWidth = textMetrics.width + padding * 2;
        const boxHeight = annotation.height;
        
        // 更新标注宽度（用于点击检测）
        annotation.width = boxWidth;
        
        // 背景框
        const bgColor = annotation.isSelected ? 'rgba(33, 150, 243, 0.95)' :
                       annotation.isHovered ? 'rgba(255, 152, 0, 0.95)' :
                       'rgba(76, 175, 80, 0.9)';
        
        ctx.fillStyle = bgColor;
        ctx.fillRect(annotation.labelX, annotation.labelY - boxHeight, boxWidth, boxHeight);
        
        // 边框
        ctx.strokeStyle = annotation.isSelected ? '#1976d2' :
                         annotation.isHovered ? '#f57c00' :
                         '#388e3c';
        ctx.lineWidth = annotation.isSelected ? 3 : 2;
        ctx.strokeRect(annotation.labelX, annotation.labelY - boxHeight, boxWidth, boxHeight);
        
        // 4. 绘制文本
        ctx.fillStyle = 'white';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, annotation.labelX + padding, annotation.labelY - boxHeight / 2);
        
        // 5. 绘制置信度（小字）
        if (annotation.confidence > 0) {
            ctx.font = `${fontSize - 2}px Arial`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillText(`${annotation.confidence.toFixed(0)}%`, 
                        annotation.labelX + padding, 
                        annotation.labelY - boxHeight + 20);
        }
        
        // 6. 如果选中，显示拖动提示
        if (annotation.isSelected) {
            ctx.font = `${fontSize - 2}px Arial`;
            ctx.fillStyle = 'rgba(33, 150, 243, 0.8)';
            ctx.fillText('拖动移动 | 双击编辑', 
                        annotation.labelX, 
                        annotation.labelY + 15);
        }
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
    
    // 打开弹窗查看
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
            background-color: rgba(0, 0, 0, 0.9);
            z-index: 10000;
            justify-content: center;
            align-items: center;
            flex-direction: column;
        `;
        
        // 工具栏
        const toolbar = document.createElement('div');
        toolbar.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            display: flex;
            gap: 10px;
            z-index: 10001;
        `;
        
        // 缩放显示
        const zoomDisplay = document.createElement('div');
        zoomDisplay.style.cssText = `
            background-color: rgba(255, 255, 255, 0.9);
            padding: 8px 15px;
            border-radius: 4px;
            font-weight: bold;
            color: #333;
        `;
        zoomDisplay.textContent = `${Math.round(this.zoom * 100)}%`;
        
        // 缩放按钮
        const zoomInBtn = this.createButton('放大 +', () => {
            const newZoom = this.zoomIn();
            zoomDisplay.textContent = `${Math.round(newZoom * 100)}%`;
        });
        
        const zoomOutBtn = this.createButton('缩小 -', () => {
            const newZoom = this.zoomOut();
            zoomDisplay.textContent = `${Math.round(newZoom * 100)}%`;
        });
        
        const resetBtn = this.createButton('重置', () => {
            const newZoom = this.resetZoom();
            zoomDisplay.textContent = `${Math.round(newZoom * 100)}%`;
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
        
        // 图片容器
        const container = document.createElement('div');
        container.style.cssText = `
            max-width: 95%;
            max-height: 90%;
            overflow: auto;
            background-color: #fff;
            border-radius: 8px;
            padding: 20px;
        `;
        
        // 克隆Canvas
        const clonedCanvas = this.canvas.cloneNode(true);
        clonedCanvas.style.cssText = `
            display: block;
            margin: 0 auto;
            cursor: grab;
        `;
        
        container.appendChild(clonedCanvas);
        modal.appendChild(toolbar);
        modal.appendChild(container);
        
        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
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
