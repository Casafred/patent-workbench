/**
 * 交互式专利附图标注系统
 * 支持拖动标注、编辑文字、连线显示
 */

class InteractiveDrawingMarker {
    constructor(canvasId, imageUrl, detectedNumbers, referenceMap) {
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
        
        // 缩放比例
        this.scale = 1;
        
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
        // 获取容器宽度
        const containerWidth = this.canvas.parentElement.offsetWidth;
        const maxCanvasWidth = containerWidth - 20;
        
        // 计算缩放比例
        this.scale = 1;
        if (this.image.width > maxCanvasWidth) {
            this.scale = maxCanvasWidth / this.image.width;
        }
        
        // 设置Canvas尺寸
        this.canvas.width = this.image.width * this.scale;
        this.canvas.height = this.image.height * this.scale;
        
        // 设置样式
        this.canvas.style.cursor = 'default';
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
                // 原始标记位置
                markerX: detected.x * this.scale,
                markerY: detected.y * this.scale,
                // 标注位置（偏移后）
                labelX: detected.x * this.scale + offsetX,
                labelY: detected.y * this.scale + offsetY,
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
    }
    
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
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
    
    render() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制图片
        this.ctx.drawImage(this.image, 0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制所有标注
        this.annotations.forEach(annotation => {
            this.drawAnnotation(annotation);
        });
    }
    
    drawAnnotation(annotation) {
        const ctx = this.ctx;
        
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
        ctx.font = 'bold 12px Arial';
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
            ctx.font = '10px Arial';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillText(`${annotation.confidence.toFixed(0)}%`, 
                        annotation.labelX + padding, 
                        annotation.labelY - boxHeight + 20);
        }
        
        // 6. 如果选中，显示拖动提示
        if (annotation.isSelected) {
            ctx.font = '10px Arial';
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
            markerPosition: { x: a.markerX / this.scale, y: a.markerY / this.scale },
            labelPosition: { x: a.labelX / this.scale, y: a.labelY / this.scale },
            confidence: a.confidence
        }));
    }
    
    // 导出标注后的图片
    exportImage() {
        return this.canvas.toDataURL('image/png');
    }
}

// 全局存储所有交互式标注实例
window.interactiveMarkers = window.interactiveMarkers || [];
