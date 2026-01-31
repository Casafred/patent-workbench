/**
 * 交互式专利附图标注系统 v6.0
 * 主界面和弹窗功能完全一致：
 * - 高清原图展示
 * - 滚轮缩放 + 鼠标拖拽移动（主界面和弹窗）
 * - 拖拽标注、双击编辑、右键删除（主界面和弹窗）
 * - 快捷按钮调整字体大小（选中/全部）
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
        
        // 视图状态（主界面）
        this.viewState = {
            scale: 1.0,
            offsetX: 0,
            offsetY: 0,
            isDraggingView: false,
            lastMouseX: 0,
            lastMouseY: 0
        };
        
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
    }
    
    loadImage() {
        const img = new Image();
        img.onload = () => {
            this.image = img;
            this.setupCanvas();
            this.initializeAnnotations();
            this.bindEvents();
            this.render();
        };
        img.src = this.imageUrl;
    }
    
    setupCanvas() {
        this.originalWidth = this.image.width;
        this.originalHeight = this.image.height;
        
        this.canvas.width = this.originalWidth;
        this.canvas.height = this.originalHeight;
        this.canvas.style.maxWidth = '100%';
        this.canvas.style.height = 'auto';
        this.canvas.style.cursor = 'default';
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
                confidence: detected.confidence || 0,
                fontSize: this.options.fontSize || 18,
                selected: false,
                color: '#FF6B6B' // 默认颜色
            };
        });
    }
    
    bindEvents() {
        // 鼠标按下
        this.canvas.addEventListener('mousedown', (e) => {
            const pos = this.getMousePos(e);
            const annotation = this.findAnnotationAt(pos.x, pos.y);
            
            if (annotation) {
                // 点击标注
                this.selectedAnnotation = annotation;
                this.isDragging = true;
                this.dragOffset = {
                    x: pos.x - annotation.labelX,
                    y: pos.y - annotation.labelY
                };
                this.canvas.style.cursor = 'move';
            } else {
                // 点击空白处，拖拽视图
                this.viewState.isDraggingView = true;
                this.viewState.lastMouseX = e.clientX;
                this.viewState.lastMouseY = e.clientY;
                this.canvas.style.cursor = 'grab';
            }
        });
        
        // 鼠标移动
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDragging && this.selectedAnnotation) {
                // 拖拽标注
                const pos = this.getMousePos(e);
                this.selectedAnnotation.labelX = pos.x - this.dragOffset.x;
                this.selectedAnnotation.labelY = pos.y - this.dragOffset.y;
                this.render();
            } else if (this.viewState.isDraggingView) {
                // 拖拽视图
                const deltaX = e.clientX - this.viewState.lastMouseX;
                const deltaY = e.clientY - this.viewState.lastMouseY;
                this.viewState.offsetX += deltaX;
                this.viewState.offsetY += deltaY;
                this.viewState.lastMouseX = e.clientX;
                this.viewState.lastMouseY = e.clientY;
                this.render();
            }
        });
        
        // 鼠标释放
        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.selectedAnnotation = null;
            this.viewState.isDraggingView = false;
            this.canvas.style.cursor = 'default';
        });
        
        // 鼠标离开
        this.canvas.addEventListener('mouseleave', () => {
            this.isDragging = false;
            this.selectedAnnotation = null;
            this.viewState.isDraggingView = false;
            this.canvas.style.cursor = 'default';
        });
        
        // 双击编辑
        this.canvas.addEventListener('dblclick', (e) => {
            const pos = this.getMousePos(e);
            const annotation = this.findAnnotationAt(pos.x, pos.y);
            if (annotation) {
                this.editAnnotation(annotation);
            }
        });
        
        // 右键删除
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
        
        // 滚轮缩放
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.viewState.scale *= delta;
            this.viewState.scale = Math.max(0.1, Math.min(10, this.viewState.scale));
            this.render();
        });
        
        // 单击选中标注
        this.canvas.addEventListener('click', (e) => {
            const pos = this.getMousePos(e);
            const annotation = this.findAnnotationAt(pos.x, pos.y);
            
            if (annotation) {
                // 切换选中状态
                if (e.ctrlKey || e.metaKey) {
                    // Ctrl/Cmd + 点击：多选
                    annotation.selected = !annotation.selected;
                } else {
                    // 单击：单选
                    this.annotations.forEach(a => a.selected = false);
                    annotation.selected = true;
                }
                this.render();
            } else if (!e.ctrlKey && !e.metaKey) {
                // 点击空白处：取消所有选中
                this.annotations.forEach(a => a.selected = false);
                this.render();
            }
        });
    }
    
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        // 考虑视图缩放和偏移
        const x = ((e.clientX - rect.left) * scaleX - this.viewState.offsetX) / this.viewState.scale;
        const y = ((e.clientY - rect.top) * scaleY - this.viewState.offsetY) / this.viewState.scale;
        
        return { x, y };
    }
    
    findAnnotationAt(x, y) {
        for (let i = this.annotations.length - 1; i >= 0; i--) {
            const ann = this.annotations[i];
            const text = `${ann.number}: ${ann.name}`;
            const fontSize = ann.fontSize || 18;
            
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
    
    increaseFontSize(selectedOnly = false) {
        const targets = selectedOnly 
            ? this.annotations.filter(a => a.selected)
            : this.annotations;
        
        targets.forEach(ann => {
            ann.fontSize = Math.min((ann.fontSize || 18) + 2, 48);
        });
        this.render();
    }
    
    decreaseFontSize(selectedOnly = false) {
        const targets = selectedOnly 
            ? this.annotations.filter(a => a.selected)
            : this.annotations;
        
        targets.forEach(ann => {
            ann.fontSize = Math.max((ann.fontSize || 18) - 2, 12);
        });
        this.render();
    }
    
    selectAll() {
        this.annotations.forEach(a => a.selected = true);
        this.render();
    }
    
    deselectAll() {
        this.annotations.forEach(a => a.selected = false);
        this.render();
    }
    
    setColor(color, selectedOnly = true) {
        const targets = selectedOnly 
            ? this.annotations.filter(a => a.selected)
            : this.annotations;
        
        targets.forEach(ann => {
            ann.color = color;
        });
        this.render();
    }
    
    render() {
        this.ctx.save();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 应用视图变换
        this.ctx.translate(this.viewState.offsetX, this.viewState.offsetY);
        this.ctx.scale(this.viewState.scale, this.viewState.scale);
        
        // 绘制图片
        this.ctx.drawImage(this.image, 0, 0, this.originalWidth, this.originalHeight);
        
        // 绘制标注
        this.annotations.forEach(annotation => {
            const fontSize = annotation.fontSize || 18;
            
            // 绘制连接线
            this.ctx.beginPath();
            this.ctx.moveTo(annotation.markerX, annotation.markerY);
            this.ctx.lineTo(annotation.labelX, annotation.labelY);
            this.ctx.strokeStyle = annotation.selected ? '#00FF00' : (annotation.color || '#FF6B6B');
            this.ctx.lineWidth = annotation.selected ? 3 : 2;
            this.ctx.stroke();
            
            // 绘制标注文字
            const text = `${annotation.number}: ${annotation.name}`;
            this.ctx.font = `bold ${fontSize}px Arial, sans-serif`;
            this.ctx.fillStyle = annotation.selected ? '#00FF00' : (annotation.color || '#FF6B6B');
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(text, annotation.labelX, annotation.labelY);
            
            // 选中时绘制边框
            if (annotation.selected) {
                const textWidth = this.ctx.measureText(text).width;
                const textHeight = fontSize * 1.5;
                this.ctx.strokeStyle = '#00FF00';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(
                    annotation.labelX - 2,
                    annotation.labelY - textHeight/2 - 2,
                    textWidth + 4,
                    textHeight + 4
                );
            }
        });
        
        this.ctx.restore();
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
            max-width: 800px;
            align-items: center;
        `;
        
        // 弹窗状态
        const modalState = {
            scale: 1.0,
            offsetX: 0,
            offsetY: 0,
            isDraggingView: false,
            isDraggingAnnotation: false,
            selectedAnnotation: null,
            dragOffset: { x: 0, y: 0 },
            lastMouseX: 0,
            lastMouseY: 0
        };
        
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
        zoomDisplay.textContent = `缩放: ${Math.round(modalState.scale * 100)}%`;
        
        // 图片容器
        const container = document.createElement('div');
        container.style.cssText = `
            width: 90%;
            height: 85%;
            overflow: hidden;
            background-color: #f5f5f5;
            border-radius: 8px;
            position: relative;
            cursor: default;
        `;
        
        // 创建Canvas
        const modalCanvas = document.createElement('canvas');
        modalCanvas.width = this.originalWidth;
        modalCanvas.height = this.originalHeight;
        modalCanvas.style.cssText = `
            display: block;
            margin: 0 auto;
            position: absolute;
            top: 50%;
            left: 50%;
            transform-origin: center center;
        `;
        
        const modalCtx = modalCanvas.getContext('2d');
        
        // 渲染函数
        const renderModal = () => {
            modalCtx.clearRect(0, 0, this.originalWidth, this.originalHeight);
            modalCtx.drawImage(this.image, 0, 0, this.originalWidth, this.originalHeight);
            
            this.annotations.forEach(annotation => {
                const fontSize = annotation.fontSize || 18;
                
                // 绘制连接线
                modalCtx.beginPath();
                modalCtx.moveTo(annotation.markerX, annotation.markerY);
                modalCtx.lineTo(annotation.labelX, annotation.labelY);
                modalCtx.strokeStyle = annotation.selected ? '#00FF00' : (annotation.color || '#FF6B6B');
                modalCtx.lineWidth = annotation.selected ? 3 : 2;
                modalCtx.stroke();
                
                // 绘制标注文字
                const text = `${annotation.number}: ${annotation.name}`;
                modalCtx.font = `bold ${fontSize}px Arial, sans-serif`;
                modalCtx.fillStyle = annotation.selected ? '#00FF00' : (annotation.color || '#FF6B6B');
                modalCtx.textBaseline = 'middle';
                modalCtx.fillText(text, annotation.labelX, annotation.labelY);
                
                // 选中时绘制边框
                if (annotation.selected) {
                    const textWidth = modalCtx.measureText(text).width;
                    const textHeight = fontSize * 1.5;
                    modalCtx.strokeStyle = '#00FF00';
                    modalCtx.lineWidth = 2;
                    modalCtx.strokeRect(
                        annotation.labelX - 2,
                        annotation.labelY - textHeight/2 - 2,
                        textWidth + 4,
                        textHeight + 4
                    );
                }
            });
            
            // 更新变换
            modalCanvas.style.transform = `
                translate(-50%, -50%)
                translate(${modalState.offsetX}px, ${modalState.offsetY}px)
                scale(${modalState.scale})
            `;
            
            zoomDisplay.textContent = `缩放: ${Math.round(modalState.scale * 100)}%`;
        };
        
        // 获取鼠标在Canvas上的位置
        const getModalMousePos = (e) => {
            const rect = modalCanvas.getBoundingClientRect();
            const scaleX = this.originalWidth / rect.width;
            const scaleY = this.originalHeight / rect.height;
            
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY
            };
        };
        
        // 弹窗事件绑定
        modalCanvas.addEventListener('mousedown', (e) => {
            const pos = getModalMousePos(e);
            const annotation = this.findAnnotationAt(pos.x, pos.y);
            
            if (annotation) {
                // 拖拽标注
                modalState.isDraggingAnnotation = true;
                modalState.selectedAnnotation = annotation;
                modalState.dragOffset = {
                    x: pos.x - annotation.labelX,
                    y: pos.y - annotation.labelY
                };
                container.style.cursor = 'move';
            } else {
                // 拖拽视图
                modalState.isDraggingView = true;
                modalState.lastMouseX = e.clientX;
                modalState.lastMouseY = e.clientY;
                container.style.cursor = 'grab';
            }
        });
        
        modalCanvas.addEventListener('mousemove', (e) => {
            if (modalState.isDraggingAnnotation && modalState.selectedAnnotation) {
                const pos = getModalMousePos(e);
                modalState.selectedAnnotation.labelX = pos.x - modalState.dragOffset.x;
                modalState.selectedAnnotation.labelY = pos.y - modalState.dragOffset.y;
                renderModal();
                this.render(); // 同步主界面
            } else if (modalState.isDraggingView) {
                const deltaX = e.clientX - modalState.lastMouseX;
                const deltaY = e.clientY - modalState.lastMouseY;
                modalState.offsetX += deltaX;
                modalState.offsetY += deltaY;
                modalState.lastMouseX = e.clientX;
                modalState.lastMouseY = e.clientY;
                renderModal();
            }
        });
        
        modalCanvas.addEventListener('mouseup', () => {
            modalState.isDraggingAnnotation = false;
            modalState.isDraggingView = false;
            modalState.selectedAnnotation = null;
            container.style.cursor = 'default';
        });
        
        modalCanvas.addEventListener('dblclick', (e) => {
            const pos = getModalMousePos(e);
            const annotation = this.findAnnotationAt(pos.x, pos.y);
            if (annotation) {
                this.editAnnotation(annotation);
                renderModal();
                this.render(); // 同步主界面
            }
        });
        
        modalCanvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const pos = getModalMousePos(e);
            const annotation = this.findAnnotationAt(pos.x, pos.y);
            if (annotation) {
                if (confirm(`确定删除标注 "${annotation.number}: ${annotation.name}" 吗？`)) {
                    this.deleteAnnotation(annotation);
                    renderModal();
                    this.render(); // 同步主界面
                }
            }
        });
        
        modalCanvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            modalState.scale *= delta;
            modalState.scale = Math.max(0.1, Math.min(10, modalState.scale));
            renderModal();
        });
        
        modalCanvas.addEventListener('click', (e) => {
            const pos = getModalMousePos(e);
            const annotation = this.findAnnotationAt(pos.x, pos.y);
            
            if (annotation) {
                if (e.ctrlKey || e.metaKey) {
                    annotation.selected = !annotation.selected;
                } else {
                    this.annotations.forEach(a => a.selected = false);
                    annotation.selected = true;
                }
                renderModal();
                this.render(); // 同步主界面
            } else if (!e.ctrlKey && !e.metaKey) {
                this.annotations.forEach(a => a.selected = false);
                renderModal();
                this.render(); // 同步主界面
            }
        });
        
        // 字体控制按钮
        const fontControls = document.createElement('div');
        fontControls.style.cssText = `
            background-color: rgba(255, 255, 255, 0.95);
            padding: 10px;
            border-radius: 6px;
            display: flex;
            gap: 5px;
            align-items: center;
        `;
        
        const fontLabel = document.createElement('span');
        fontLabel.textContent = '字体:';
        fontLabel.style.cssText = 'font-weight: bold; margin-right: 5px;';
        
        const btnFontUp = this.createButton('选中+', '#4CAF50', () => {
            this.increaseFontSize(true);
            renderModal();
        });
        
        const btnFontDown = this.createButton('选中-', '#FF9800', () => {
            this.decreaseFontSize(true);
            renderModal();
        });
        
        const btnFontUpAll = this.createButton('全部+', '#2196F3', () => {
            this.increaseFontSize(false);
            renderModal();
        });
        
        const btnFontDownAll = this.createButton('全部-', '#9C27B0', () => {
            this.decreaseFontSize(false);
            renderModal();
        });
        
        fontControls.appendChild(fontLabel);
        fontControls.appendChild(btnFontUp);
        fontControls.appendChild(btnFontDown);
        fontControls.appendChild(btnFontUpAll);
        fontControls.appendChild(btnFontDownAll);
        
        // 选择控制按钮
        const selectControls = document.createElement('div');
        selectControls.style.cssText = fontControls.style.cssText;
        
        const btnSelectAll = this.createButton('全选', '#607D8B', () => {
            this.selectAll();
            renderModal();
        });
        
        const btnDeselectAll = this.createButton('取消选择', '#795548', () => {
            this.deselectAll();
            renderModal();
        });
        
        selectControls.appendChild(btnSelectAll);
        selectControls.appendChild(btnDeselectAll);
        
        // 颜色控制按钮
        const colorControls = document.createElement('div');
        colorControls.style.cssText = fontControls.style.cssText;
        
        const colorLabel = document.createElement('span');
        colorLabel.textContent = '颜色:';
        colorLabel.style.cssText = 'font-weight: bold; margin-right: 5px;';
        
        const btnColorRed = this.createButton('🔴 红', '#FF6B6B', () => {
            this.setColor('#FF6B6B', true);
            renderModal();
        });
        
        const btnColorBlue = this.createButton('🔵 蓝', '#2196F3', () => {
            this.setColor('#2196F3', true);
            renderModal();
        });
        
        const btnColorOrange = this.createButton('🟠 橙', '#FF9800', () => {
            this.setColor('#FF9800', true);
            renderModal();
        });
        
        const btnColorPurple = this.createButton('🟣 紫', '#9C27B0', () => {
            this.setColor('#9C27B0', true);
            renderModal();
        });
        
        const btnColorYellow = this.createButton('🟡 黄', '#FFC107', () => {
            this.setColor('#FFC107', true);
            renderModal();
        });
        
        const btnColorCyan = this.createButton('🔷 青', '#00BCD4', () => {
            this.setColor('#00BCD4', true);
            renderModal();
        });
        
        colorControls.appendChild(colorLabel);
        colorControls.appendChild(btnColorRed);
        colorControls.appendChild(btnColorBlue);
        colorControls.appendChild(btnColorOrange);
        colorControls.appendChild(btnColorPurple);
        colorControls.appendChild(btnColorYellow);
        colorControls.appendChild(btnColorCyan);
        
        // 关闭按钮
        const closeBtn = this.createButton('关闭 ✕', '#f44336', () => {
            modal.remove();
        });
        
        toolbar.appendChild(zoomDisplay);
        toolbar.appendChild(fontControls);
        toolbar.appendChild(selectControls);
        toolbar.appendChild(colorControls);
        toolbar.appendChild(closeBtn);
        
        container.appendChild(modalCanvas);
        modal.appendChild(toolbar);
        modal.appendChild(container);
        
        renderModal();
        
        return modal;
    }
    
    createButton(text, color, onClick) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.cssText = `
            background-color: ${color};
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
