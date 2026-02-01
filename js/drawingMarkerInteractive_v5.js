/**
 * 交互式专利附图标注系统 v5.0
 * 完整交互版本：
 * - 高清原图展示
 * - 主界面和弹窗都可拖拽标注
 * - 字体大小可调整 (12-48px)
 * - 双击编辑，右键删除
 * - 缩放范围 10%-1000%
 * - 标注列表管理
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
        
        // 标注数据
        this.annotations = [];
        
        // 交互状态
        this.selectedAnnotation = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        
        // 配置选项
        this.options = {
            enableModal: options.enableModal !== false,
            containerWidth: options.containerWidth || null,
            fontSize: options.fontSize || 18,
            ...options
        };
        
        this.init();
    }
    
    init() {
        this.loadImage();
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
        this.originalWidth = this.image.width;
        this.originalHeight = this.image.height;
        
        this.canvas.width = this.originalWidth;
        this.canvas.height = this.originalHeight;
        this.canvas.style.width = `${this.originalWidth}px`;
        this.canvas.style.height = `${this.originalHeight}px`;
        this.canvas.style.cursor = 'default';
        this.canvas.style.maxWidth = '100%';
        this.canvas.style.height = 'auto';
    }
    
    initializeAnnotations() {
        this.annotations = this.detectedNumbers.map((detected, index) => {
            const offsetDistance = 80;
            const angle = (index * 45) % 360;
            const offsetX = Math.cos(angle * Math.PI / 180) * offsetDistance;
            const offsetY = Math.sin(angle * Math.PI / 180) * offsetDistance;
            
            return {
                id: `annotation_${index}`,
                markerX: detected.x,
                markerY: detected.y,
                labelX: detected.x + offsetX,
                labelY: detected.y + offsetY,
                number: detected.number,
                name: detected.name || this.referenceMap[detected.number] || '未知',
                confidence: detected.confidence || 0
            };
        });
    }
    
    bindEvents() {
        this.canvas.addEventListener('mousedown', (e) => {
            const pos = this.getMousePos(e);
            const annotation = this.findAnnotationAt(pos.x, pos.y);
            
            if (annotation) {
                this.selectedAnnotation = annotation;
                this.isDragging = true;
                this.dragOffset = {
                    x: pos.x - annotation.labelX,
                    y: pos.y - annotation.labelY
                };
                this.canvas.style.cursor = 'move';
                e.preventDefault();
            }
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            const pos = this.getMousePos(e);
            
            if (this.isDragging && this.selectedAnnotation) {
                this.selectedAnnotation.labelX = pos.x - this.dragOffset.x;
                this.selectedAnnotation.labelY = pos.y - this.dragOffset.y;
                this.render();
            } else {
                const annotation = this.findAnnotationAt(pos.x, pos.y);
                this.canvas.style.cursor = annotation ? 'pointer' : 'default';
            }
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.canvas.style.cursor = 'default';
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            this.isDragging = false;
            this.canvas.style.cursor = 'default';
        });
        
        this.canvas.addEventListener('dblclick', (e) => {
            const pos = this.getMousePos(e);
            const annotation = this.findAnnotationAt(pos.x, pos.y);
            
            if (annotation) {
                this.editAnnotation(annotation);
            } else {
                this.openModal();
            }
        });
        
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const pos = this.getMousePos(e);
            const annotation = this.findAnnotationAt(pos.x, pos.y);
            
            if (annotation) {
                if (confirm(`确定删除标注 "${annotation.number}: ${annotation.name}" 吗？`)) {
                    this.deleteAnnotation(annotation);
                }
            }
        });
    }
    
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }
    
    findAnnotationAt(x, y) {
        for (let i = this.annotations.length - 1; i >= 0; i--) {
            const ann = this.annotations[i];
            const text = `${ann.number}: ${ann.name}`;
            const fontSize = this.options.fontSize || 18;
            
            this.ctx.font = `bold ${fontSize}px Arial, sans-serif`;
            const textWidth = this.ctx.measureText(text).width;
            const textHeight = fontSize * 1.5;
            
            if (x >= ann.labelX && x <= ann.labelX + textWidth &&
                y >= ann.labelY - textHeight/2 && y <= ann.labelY + textHeight/2) {
                return ann;
            }
        }
        return null;
    }
    
    editAnnotation(annotation) {
        const newName = prompt(`编辑标注名称 (${annotation.number}):`, annotation.name);
        if (newName !== null && newName.trim() !== '') {
            annotation.name = newName.trim();
            this.render();
        }
    }
    
    deleteAnnotation(annotation) {
        const index = this.annotations.indexOf(annotation);
        if (index > -1) {
            this.annotations.splice(index, 1);
            this.render();
        }
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.image, 0, 0, this.canvas.width, this.canvas.height);
        
        this.annotations.forEach(annotation => {
            this.drawAnnotation(annotation);
        });
    }
    
    drawAnnotation(annotation, fontSize) {
        const ctx = this.ctx;
        const size = fontSize || this.options.fontSize || 18;
        
        ctx.beginPath();
        ctx.moveTo(annotation.markerX, annotation.markerY);
        ctx.lineTo(annotation.labelX, annotation.labelY);
        ctx.strokeStyle = '#FF5722';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        const text = `${annotation.number}: ${annotation.name}`;
        ctx.font = `bold ${size}px Arial, sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 4;
        ctx.strokeText(text, annotation.labelX, annotation.labelY);
        
        ctx.fillStyle = '#FF5722';
        ctx.fillText(text, annotation.labelX, annotation.labelY);
    }
    
    exportAnnotations() {
        return this.annotations.map(a => ({
            number: a.number,
            name: a.name,
            markerPosition: { x: a.markerX, y: a.markerY },
            labelPosition: { x: a.labelX, y: a.labelY },
            confidence: a.confidence
        }));
    }
    
    exportImage() {
        return this.canvas.toDataURL('image/png');
    }
    
    openModal() {
        if (!this.options.enableModal) return;
        
        const modal = this.createModal();
        document.body.appendChild(modal);
        
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
            flex-wrap: wrap;
            max-width: 600px;
        `;
        
        // 状态变量
        let currentZoom = 1.0;
        const minZoom = 0.1;
        const maxZoom = 10.0;
        const zoomStep = 0.2;
        
        let currentFontSize = 22;
        const minFontSize = 12;
        const maxFontSize = 48;
        
        let isDraggingAnnotation = false;
        let selectedAnnotation = null;
        let dragOffset = { x: 0, y: 0 };
        
        // 显示元素
        const zoomDisplay = document.createElement('div');
        zoomDisplay.style.cssText = `
            background-color: rgba(255, 255, 255, 0.95);
            padding: 10px 20px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 16px;
            color: #333;
        `;
        zoomDisplay.textContent = `缩放: ${Math.round(currentZoom * 100)}%`;
        
        const fontDisplay = document.createElement('div');
        fontDisplay.style.cssText = zoomDisplay.style.cssText;
        fontDisplay.textContent = `字体: ${currentFontSize}px`;
        
        // 图片容器
        const container = document.createElement('div');
        container.style.cssText = `
            width: 90%;
            height: 85%;
            overflow: auto;
            background-color: #f5f5f5;
            border-radius: 8px;
            position: relative;
        `;
        
        // 创建Canvas
        const modalCanvas = document.createElement('canvas');
        modalCanvas.width = this.originalWidth;
        modalCanvas.height = this.originalHeight;
        modalCanvas.style.cssText = `
            display: block;
            margin: 0 auto;
            transition: transform 0.1s ease-out;
        `;
        
        const modalCtx = modalCanvas.getContext('2d');
        
        // 渲染函数
        const renderModal = () => {
            modalCtx.clearRect(0, 0, this.originalWidth, this.originalHeight);
            modalCtx.drawImage(this.image, 0, 0, this.originalWidth, this.originalHeight);
            
            this.annotations.forEach(annotation => {
                // 绘制连接线
                modalCtx.beginPath();
                modalCtx.moveTo(annotation.markerX, annotation.markerY);
                modalCtx.lineTo(annotation.labelX, annotation.labelY);
                modalCtx.strokeStyle = '#FF5722';
                modalCtx.lineWidth = 3;
                modalCtx.stroke();
                
                // 绘制文字
                const text = `${annotation.number}: ${annotation.name}`;
                modalCtx.font = `bold ${currentFontSize}px Arial, sans-serif`;
                modalCtx.textBaseline = 'middle';
                modalCtx.textAlign = 'left';
                
                modalCtx.strokeStyle = '#FFFFFF';
                modalCtx.lineWidth = 5;
                modalCtx.strokeText(text, annotation.labelX, annotation.labelY);
                
                modalCtx.fillStyle = '#FF5722';
                modalCtx.fillText(text, annotation.labelX, annotation.labelY);
            });
        };
        
        renderModal();
        
        // 更新Canvas尺寸
        const updateCanvasSize = () => {
            modalCanvas.style.width = `${this.originalWidth * currentZoom}px`;
            modalCanvas.style.height = `${this.originalHeight * currentZoom}px`;
        };
        updateCanvasSize();
        
        // 查找标注
        const findAnnotationAtModal = (x, y) => {
            const rect = modalCanvas.getBoundingClientRect();
            const scaleX = this.originalWidth / rect.width;
            const scaleY = this.originalHeight / rect.height;
            const canvasX = (x - rect.left) * scaleX;
            const canvasY = (y - rect.top) * scaleY;
            
            for (let i = this.annotations.length - 1; i >= 0; i--) {
                const ann = this.annotations[i];
                const text = `${ann.number}: ${ann.name}`;
                modalCtx.font = `bold ${currentFontSize}px Arial, sans-serif`;
                const textWidth = modalCtx.measureText(text).width;
                const textHeight = currentFontSize * 1.5;
                
                if (canvasX >= ann.labelX && canvasX <= ann.labelX + textWidth &&
                    canvasY >= ann.labelY - textHeight/2 && canvasY <= ann.labelY + textHeight/2) {
                    return ann;
                }
            }
            return null;
        };
        
        // 标注拖拽事件
        modalCanvas.addEventListener('mousedown', (e) => {
            const annotation = findAnnotationAtModal(e.clientX, e.clientY);
            if (annotation) {
                isDraggingAnnotation = true;
                selectedAnnotation = annotation;
                const rect = modalCanvas.getBoundingClientRect();
                const scaleX = this.originalWidth / rect.width;
                const scaleY = this.originalHeight / rect.height;
                const canvasX = (e.clientX - rect.left) * scaleX;
                const canvasY = (e.clientY - rect.top) * scaleY;
                dragOffset = {
                    x: canvasX - annotation.labelX,
                    y: canvasY - annotation.labelY
                };
                modalCanvas.style.cursor = 'move';
                e.stopPropagation();
            }
        });
        
        modalCanvas.addEventListener('mousemove', (e) => {
            if (isDraggingAnnotation && selectedAnnotation) {
                const rect = modalCanvas.getBoundingClientRect();
                const scaleX = this.originalWidth / rect.width;
                const scaleY = this.originalHeight / rect.height;
                const canvasX = (e.clientX - rect.left) * scaleX;
                const canvasY = (e.clientY - rect.top) * scaleY;
                selectedAnnotation.labelX = canvasX - dragOffset.x;
                selectedAnnotation.labelY = canvasY - dragOffset.y;
                renderModal();
                this.render(); // 同步更新主界面
            } else {
                const annotation = findAnnotationAtModal(e.clientX, e.clientY);
                modalCanvas.style.cursor = annotation ? 'pointer' : 'default';
            }
        });
        
        modalCanvas.addEventListener('mouseup', () => {
            isDraggingAnnotation = false;
            selectedAnnotation = null;
            modalCanvas.style.cursor = 'default';
        });
        
        modalCanvas.addEventListener('dblclick', (e) => {
            const annotation = findAnnotationAtModal(e.clientX, e.clientY);
            if (annotation) {
                const newName = prompt(`编辑标注名称 (${annotation.number}):`, annotation.name);
                if (newName !== null && newName.trim() !== '') {
                    annotation.name = newName.trim();
                    renderModal();
                    this.render();
                }
            }
        });
        
        modalCanvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const annotation = findAnnotationAtModal(e.clientX, e.clientY);
            if (annotation) {
                if (confirm(`确定删除标注 "${annotation.number}: ${annotation.name}" 吗？`)) {
                    this.deleteAnnotation(annotation);
                    renderModal();
                }
            }
        });
        
        // 按钮
        const zoomInBtn = this.createButton('放大 +', () => {
            currentZoom = Math.min(maxZoom, currentZoom + zoomStep);
            updateCanvasSize();
            zoomDisplay.textContent = `缩放: ${Math.round(currentZoom * 100)}%`;
        });
        
        const zoomOutBtn = this.createButton('缩小 -', () => {
            currentZoom = Math.max(minZoom, currentZoom - zoomStep);
            updateCanvasSize();
            zoomDisplay.textContent = `缩放: ${Math.round(currentZoom * 100)}%`;
        });
        
        const resetBtn = this.createButton('重置', () => {
            currentZoom = 1.0;
            updateCanvasSize();
            zoomDisplay.textContent = `缩放: ${Math.round(currentZoom * 100)}%`;
            container.scrollLeft = 0;
            container.scrollTop = 0;
        });
        
        const fontIncBtn = this.createButton('字体+', () => {
            currentFontSize = Math.min(maxFontSize, currentFontSize + 2);
            fontDisplay.textContent = `字体: ${currentFontSize}px`;
            renderModal();
        });
        
        const fontDecBtn = this.createButton('字体-', () => {
            currentFontSize = Math.max(minFontSize, currentFontSize - 2);
            fontDisplay.textContent = `字体: ${currentFontSize}px`;
            renderModal();
        });
        
        const closeBtn = this.createButton('关闭 ×', () => {
            modal.remove();
        });
        closeBtn.style.backgroundColor = '#f44336';
        
        toolbar.appendChild(zoomDisplay);
        toolbar.appendChild(zoomOutBtn);
        toolbar.appendChild(resetBtn);
        toolbar.appendChild(zoomInBtn);
        toolbar.appendChild(fontDisplay);
        toolbar.appendChild(fontDecBtn);
        toolbar.appendChild(fontIncBtn);
        toolbar.appendChild(closeBtn);
        
        // 鼠标滚轮缩放
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
            currentZoom = Math.max(minZoom, Math.min(maxZoom, currentZoom + delta));
            updateCanvasSize();
            zoomDisplay.textContent = `缩放: ${Math.round(currentZoom * 100)}%`;
        }, { passive: false });
        
        // 拖动背景平移
        let isDraggingBg = false;
        let startX, startY, scrollLeft, scrollTop;
        
        container.addEventListener('mousedown', (e) => {
            if (e.target === container || e.target === modalCanvas) {
                isDraggingBg = true;
                container.style.cursor = 'grabbing';
                startX = e.pageX - container.offsetLeft;
                startY = e.pageY - container.offsetTop;
                scrollLeft = container.scrollLeft;
                scrollTop = container.scrollTop;
            }
        });
        
        container.addEventListener('mouseleave', () => {
            isDraggingBg = false;
            container.style.cursor = 'grab';
        });
        
        container.addEventListener('mouseup', () => {
            isDraggingBg = false;
            container.style.cursor = 'grab';
        });
        
        container.addEventListener('mousemove', (e) => {
            if (isDraggingBg && !isDraggingAnnotation) {
                e.preventDefault();
                const x = e.pageX - container.offsetLeft;
                const y = e.pageY - container.offsetTop;
                const walkX = (x - startX) * 1.5;
                const walkY = (y - startY) * 1.5;
                container.scrollLeft = scrollLeft - walkX;
                container.scrollTop = scrollTop - walkY;
            }
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

// 全局存储
window.interactiveMarkers = window.interactiveMarkers || [];
