/**
 * 多图查看器 v8.0
 * 支持多张图片的左右切换查看
 */

class MultiImageViewerV8 {
    constructor(images, options = {}) {
        // images: [{ url, detectedNumbers, referenceMap, title }]
        this.images = images;
        this.currentIndex = 0;
        this.options = {
            fontSize: options.fontSize || 22,
            highlightColor: options.highlightColor || '#FFD700',
            ...options
        };
        
        this.annotations = [];
        this.selectedAnnotationId = null;
        this.currentZoom = 1.0;
        this.currentRotation = 0;
        this.currentFontSize = this.options.fontSize;
        
        this.minZoom = 0.5;
        this.maxZoom = 5.0;
        this.zoomStep = 0.2;
    }
    
    open(startIndex = 0) {
        this.currentIndex = startIndex;
        const modal = this.createModal();
        document.body.appendChild(modal);
        
        setTimeout(() => {
            modal.style.display = 'flex';
        }, 10);
    }
    
    createModal() {
        const modal = document.createElement('div');
        modal.className = 'multi-image-viewer-v8';
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
        
        // 主容器
        const mainContainer = document.createElement('div');
        mainContainer.style.cssText = `
            width: 95%;
            height: 90%;
            display: flex;
            gap: 10px;
            position: relative;
        `;
        
        // 图片容器
        const imageContainer = document.createElement('div');
        imageContainer.style.cssText = `
            flex: 1;
            overflow: auto;
            background-color: #f5f5f5;
            border-radius: 8px;
            position: relative;
            cursor: grab;
        `;
        
        // Canvas
        const modalCanvas = document.createElement('canvas');
        modalCanvas.style.cssText = `
            display: block;
            margin: 0 auto;
            transition: transform 0.1s ease-out;
        `;
        
        // 左右切换箭头
        const leftArrow = this.createArrow('left', () => {
            this.previousImage();
            this.updateDisplay();
        });
        
        const rightArrow = this.createArrow('right', () => {
            this.nextImage();
            this.updateDisplay();
        });
        
        imageContainer.appendChild(leftArrow);
        imageContainer.appendChild(rightArrow);
        imageContainer.appendChild(modalCanvas);
        
        // 鼠标移动显示/隐藏箭头
        imageContainer.addEventListener('mousemove', (e) => {
            const rect = imageContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const width = rect.width;
            
            if (x < 100) {
                leftArrow.style.opacity = '1';
                rightArrow.style.opacity = '0';
            } else if (x > width - 100) {
                rightArrow.style.opacity = '1';
                leftArrow.style.opacity = '0';
            } else {
                leftArrow.style.opacity = '0';
                rightArrow.style.opacity = '0';
            }
        });
        
        imageContainer.addEventListener('mouseleave', () => {
            leftArrow.style.opacity = '0';
            rightArrow.style.opacity = '0';
        });
        
        // 侧边栏
        const sidebar = this.createSidebar();
        
        // 保存引用
        this.modal = modal;
        this.modalCanvas = modalCanvas;
        this.imageContainer = imageContainer;
        this.sidebar = sidebar;
        
        // 初始化显示
        this.loadCurrentImage(() => {
            this.updateDisplay();
        });
        
        // 拖动功能
        this.setupDragScroll(imageContainer);
        
        // 滚轮缩放
        imageContainer.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -this.zoomStep : this.zoomStep;
            this.currentZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.currentZoom + delta));
            this.updateCanvasSize();
            this.updateZoomDisplay();
        }, { passive: false });
        
        // 双击添加标注
        modalCanvas.addEventListener('dblclick', (e) => {
            this.handleDoubleClick(e);
        });
        
        // 键盘导航
        const handleKeydown = (e) => {
            if (e.key === 'ArrowLeft') {
                this.previousImage();
                this.updateDisplay();
            } else if (e.key === 'ArrowRight') {
                this.nextImage();
                this.updateDisplay();
            } else if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleKeydown);
            }
        };
        document.addEventListener('keydown', handleKeydown);
        
        mainContainer.appendChild(imageContainer);
        mainContainer.appendChild(sidebar);
        modal.appendChild(mainContainer);
        
        return modal;
    }
    
    createArrow(direction, onClick) {
        const arrow = document.createElement('div');
        arrow.style.cssText = `
            position: absolute;
            top: 50%;
            ${direction === 'left' ? 'left: 20px' : 'right: 20px'};
            transform: translateY(-50%);
            width: 60px;
            height: 60px;
            background-color: rgba(255, 255, 255, 0.9);
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            font-size: 30px;
            color: #333;
            opacity: 0;
            transition: opacity 0.3s, background-color 0.2s;
            z-index: 100;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;
        
        arrow.textContent = direction === 'left' ? '‹' : '›';
        
        arrow.addEventListener('click', (e) => {
            e.stopPropagation();
            onClick();
        });
        
        arrow.addEventListener('mouseenter', () => {
            arrow.style.backgroundColor = 'rgba(255, 255, 255, 1)';
        });
        
        arrow.addEventListener('mouseleave', () => {
            arrow.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        });
        
        return arrow;
    }
    
    createSidebar() {
        const sidebar = document.createElement('div');
        sidebar.style.cssText = `
            width: 200px;
            background-color: rgba(255, 255, 255, 0.95);
            border-radius: 8px;
            padding: 15px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            overflow-y: auto;
        `;
        
        // 标题
        const title = document.createElement('div');
        title.textContent = '功能控制';
        title.style.cssText = `
            font-size: 18px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
            text-align: center;
        `;
        sidebar.appendChild(title);
        
        // 图片信息
        this.imageInfoSection = this.createSection('图片信息');
        this.imageInfoDisplay = document.createElement('div');
        this.imageInfoDisplay.style.cssText = `
            text-align: center;
            font-weight: bold;
            color: #555;
            padding: 10px;
            background-color: #f0f0f0;
            border-radius: 4px;
        `;
        this.imageInfoSection.appendChild(this.imageInfoDisplay);
        sidebar.appendChild(this.imageInfoSection);
        
        // 字体大小
        const fontSection = this.createSection('字体大小');
        this.fontSizeDisplay = document.createElement('div');
        this.fontSizeDisplay.textContent = `${this.currentFontSize}px`;
        this.fontSizeDisplay.style.cssText = `
            text-align: center;
            font-weight: bold;
            margin: 5px 0;
        `;
        
        const fontBtnContainer = document.createElement('div');
        fontBtnContainer.style.cssText = 'display: flex; gap: 5px;';
        
        const fontMinusBtn = this.createButton('-', () => {
            this.currentFontSize = Math.max(12, this.currentFontSize - 2);
            this.fontSizeDisplay.textContent = `${this.currentFontSize}px`;
            this.renderCanvas();
        });
        
        const fontPlusBtn = this.createButton('+', () => {
            this.currentFontSize = Math.min(40, this.currentFontSize + 2);
            this.fontSizeDisplay.textContent = `${this.currentFontSize}px`;
            this.renderCanvas();
        });
        
        fontBtnContainer.appendChild(fontMinusBtn);
        fontBtnContainer.appendChild(fontPlusBtn);
        fontSection.appendChild(this.fontSizeDisplay);
        fontSection.appendChild(fontBtnContainer);
        sidebar.appendChild(fontSection);
        
        // 旋转
        const rotateSection = this.createSection('图片旋转');
        const rotateBtnContainer = document.createElement('div');
        rotateBtnContainer.style.cssText = 'display: flex; gap: 5px;';
        
        const rotateLeftBtn = this.createButton('↺ 逆时针', () => {
            this.currentRotation = (this.currentRotation - 90 + 360) % 360;
            this.renderCanvas();
        });
        
        const rotateRightBtn = this.createButton('↻ 顺时针', () => {
            this.currentRotation = (this.currentRotation + 90) % 360;
            this.renderCanvas();
        });
        
        rotateBtnContainer.appendChild(rotateLeftBtn);
        rotateBtnContainer.appendChild(rotateRightBtn);
        rotateSection.appendChild(rotateBtnContainer);
        sidebar.appendChild(rotateSection);
        
        // 缩放
        const zoomSection = this.createSection('缩放');
        this.zoomDisplay = document.createElement('div');
        this.zoomDisplay.textContent = `${Math.round(this.currentZoom * 100)}%`;
        this.zoomDisplay.style.cssText = `
            text-align: center;
            font-weight: bold;
            margin: 5px 0;
        `;
        
        const zoomBtnContainer = document.createElement('div');
        zoomBtnContainer.style.cssText = 'display: flex; gap: 5px;';
        
        const zoomOutBtn = this.createButton('-', () => {
            this.currentZoom = Math.max(this.minZoom, this.currentZoom - this.zoomStep);
            this.updateCanvasSize();
            this.updateZoomDisplay();
        });
        
        const zoomInBtn = this.createButton('+', () => {
            this.currentZoom = Math.min(this.maxZoom, this.currentZoom + this.zoomStep);
            this.updateCanvasSize();
            this.updateZoomDisplay();
        });
        
        const zoomResetBtn = this.createButton('重置', () => {
            this.currentZoom = 1.0;
            this.updateCanvasSize();
            this.updateZoomDisplay();
        });
        
        zoomBtnContainer.appendChild(zoomOutBtn);
        zoomBtnContainer.appendChild(zoomResetBtn);
        zoomBtnContainer.appendChild(zoomInBtn);
        zoomSection.appendChild(this.zoomDisplay);
        zoomSection.appendChild(zoomBtnContainer);
        sidebar.appendChild(zoomSection);
        
        // 标注列表
        this.annotationSection = this.createSection('标注列表');
        this.annotationList = document.createElement('div');
        this.annotationList.style.cssText = `
            max-height: 300px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 5px;
        `;
        this.annotationSection.appendChild(this.annotationList);
        sidebar.appendChild(this.annotationSection);
        
        // 调试面板
        const debugBtn = this.createButton('🔧 调试面板', () => {
            this.openDebugPanel();
        });
        debugBtn.style.cssText += 'background-color: #2196F3; margin-top: 10px;';
        sidebar.appendChild(debugBtn);
        
        // 关闭
        const closeBtn = this.createButton('✕ 关闭', () => {
            this.modal.remove();
        });
        closeBtn.style.cssText += 'background-color: #f44336; margin-top: auto;';
        sidebar.appendChild(closeBtn);
        
        return sidebar;
    }
    
    createSection(title) {
        const section = document.createElement('div');
        section.style.cssText = `
            border-bottom: 1px solid #ddd;
            padding-bottom: 10px;
        `;
        
        const titleEl = document.createElement('div');
        titleEl.textContent = title;
        titleEl.style.cssText = `
            font-weight: bold;
            color: #555;
            margin-bottom: 8px;
            font-size: 14px;
        `;
        
        section.appendChild(titleEl);
        return section;
    }
    
    createButton(text, onClick) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.cssText = `
            flex: 1;
            background-color: #4caf50;
            color: white;
            border: none;
            padding: 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: bold;
            transition: opacity 0.2s;
        `;
        btn.addEventListener('click', onClick);
        btn.addEventListener('mouseenter', () => btn.style.opacity = '0.8');
        btn.addEventListener('mouseleave', () => btn.style.opacity = '1');
        return btn;
    }
    
    loadCurrentImage(callback) {
        const imageData = this.images[this.currentIndex];
        const img = new Image();
        img.onload = () => {
            this.currentImage = img;
            this.currentImageData = imageData;
            this.initializeAnnotations();
            if (callback) callback();
        };
        img.src = imageData.url;
    }
    
    initializeAnnotations() {
        const detectedNumbers = this.currentImageData.detectedNumbers || [];
        const referenceMap = this.currentImageData.referenceMap || {};
        
        this.annotations = detectedNumbers.map((detected, index) => {
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
                name: detected.name || referenceMap[detected.number] || '未知',
                confidence: detected.confidence || 0,
                isSelected: false,
                isManual: false
            };
        });
    }
    
    updateDisplay() {
        this.loadCurrentImage(() => {
            this.setupCanvas();
            this.renderCanvas();
            this.updateAnnotationList();
            this.updateImageInfo();
        });
    }
    
    setupCanvas() {
        this.modalCanvas.width = this.currentImage.width;
        this.modalCanvas.height = this.currentImage.height;
        this.updateCanvasSize();
    }
    
    updateCanvasSize() {
        this.modalCanvas.style.width = `${this.currentImage.width * this.currentZoom}px`;
        this.modalCanvas.style.height = `${this.currentImage.height * this.currentZoom}px`;
    }
    
    renderCanvas() {
        const ctx = this.modalCanvas.getContext('2d');
        ctx.clearRect(0, 0, this.modalCanvas.width, this.modalCanvas.height);
        
        ctx.save();
        
        // 旋转
        if (this.currentRotation !== 0) {
            ctx.translate(this.modalCanvas.width / 2, this.modalCanvas.height / 2);
            ctx.rotate((this.currentRotation * Math.PI) / 180);
            ctx.translate(-this.modalCanvas.width / 2, -this.modalCanvas.height / 2);
        }
        
        // 绘制图片
        ctx.drawImage(this.currentImage, 0, 0, this.modalCanvas.width, this.modalCanvas.height);
        
        ctx.restore();
        
        // 绘制标注
        this.annotations.forEach(annotation => {
            const isHighlighted = annotation.id === this.selectedAnnotationId;
            const color = isHighlighted ? this.options.highlightColor : '#FF5722';
            const lineWidth = isHighlighted ? 4 : 3;
            
            ctx.beginPath();
            ctx.moveTo(annotation.markerX, annotation.markerY);
            ctx.lineTo(annotation.labelX, annotation.labelY);
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
            
            const text = `${annotation.number}: ${annotation.name}`;
            ctx.font = `bold ${this.currentFontSize}px Arial, sans-serif`;
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'left';
            
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 5;
            ctx.strokeText(text, annotation.labelX, annotation.labelY);
            
            ctx.fillStyle = color;
            ctx.fillText(text, annotation.labelX, annotation.labelY);
        });
    }
    
    updateAnnotationList() {
        this.annotationList.innerHTML = '';
        
        this.annotations.forEach(annotation => {
            const item = document.createElement('div');
            item.style.cssText = `
                padding: 8px;
                background-color: #f0f0f0;
                border-radius: 4px;
                cursor: pointer;
                transition: background-color 0.2s;
            `;
            item.textContent = `${annotation.number}: ${annotation.name}${annotation.isManual ? ' (手动)' : ''}`;
            
            item.addEventListener('click', () => {
                this.selectedAnnotationId = annotation.id;
                this.renderCanvas();
                
                this.annotationList.querySelectorAll('div').forEach(el => {
                    el.style.backgroundColor = '#f0f0f0';
                });
                item.style.backgroundColor = this.options.highlightColor;
            });
            
            this.annotationList.appendChild(item);
        });
    }
    
    updateImageInfo() {
        const current = this.currentIndex + 1;
        const total = this.images.length;
        const title = this.currentImageData.title || `图片 ${current}`;
        this.imageInfoDisplay.textContent = `${title}\n(${current}/${total})`;
    }
    
    updateZoomDisplay() {
        this.zoomDisplay.textContent = `${Math.round(this.currentZoom * 100)}%`;
    }
    
    previousImage() {
        this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
        this.selectedAnnotationId = null;
    }
    
    nextImage() {
        this.currentIndex = (this.currentIndex + 1) % this.images.length;
        this.selectedAnnotationId = null;
    }
    
    handleDoubleClick(e) {
        const rect = this.modalCanvas.getBoundingClientRect();
        const scaleX = this.modalCanvas.width / rect.width;
        const scaleY = this.modalCanvas.height / rect.height;
        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;
        
        const number = prompt('请输入标记序号：');
        if (!number) return;
        
        const name = prompt('请输入标记说明：');
        if (!name) return;
        
        // 计算标签位置（自动偏移，避免遮挡标注点）
        // 优先向右上方偏移
        const offsetDistance = 80;
        let labelX = clickX + offsetDistance;
        let labelY = clickY - offsetDistance;
        
        // 边界检查，确保标签不超出画布
        if (labelX > this.modalCanvas.width - 100) {
            labelX = clickX - offsetDistance; // 改为向左
        }
        if (labelY < 50) {
            labelY = clickY + offsetDistance; // 改为向下
        }
        
        const newAnnotation = {
            id: `manual_${Date.now()}`,
            markerX: clickX,      // 双击位置作为标注点
            markerY: clickY,      // 双击位置作为标注点
            labelX: labelX,       // 标签位置（自动偏移）
            labelY: labelY,       // 标签位置（自动偏移）
            number: number,
            name: name,
            confidence: 1.0,
            isSelected: false,
            isManual: true
        };
        
        this.annotations.push(newAnnotation);
        this.renderCanvas();
        this.updateAnnotationList();
    }
    
    setupDragScroll(container) {
        let isDragging = false;
        let startX, startY, scrollLeft, scrollTop;
        
        container.addEventListener('mousedown', (e) => {
            if (e.target !== this.modalCanvas) return;
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
            const walkX = (x - startX) * 1.5;
            const walkY = (y - startY) * 1.5;
            container.scrollLeft = scrollLeft - walkX;
            container.scrollTop = scrollTop - walkY;
        });
    }
    
    openDebugPanel() {
        const debugModal = document.createElement('div');
        debugModal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 600px;
            max-height: 80vh;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10001;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        `;
        
        const header = document.createElement('div');
        header.style.cssText = `
            background-color: #2196F3;
            color: white;
            padding: 15px;
            font-weight: bold;
            font-size: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        header.innerHTML = `
            <span>🔧 调试面板</span>
            <button style="background: none; border: none; color: white; font-size: 20px; cursor: pointer;">✕</button>
        `;
        header.querySelector('button').addEventListener('click', () => {
            debugModal.remove();
        });
        
        const content = document.createElement('div');
        content.style.cssText = `
            padding: 20px;
            overflow-y: auto;
            flex: 1;
        `;
        
        const debugInfo = `
            <h3>当前图片信息</h3>
            <ul>
                <li>索引: ${this.currentIndex + 1} / ${this.images.length}</li>
                <li>尺寸: ${this.currentImage.width} × ${this.currentImage.height}</li>
                <li>缩放: ${Math.round(this.currentZoom * 100)}%</li>
                <li>旋转: ${this.currentRotation}°</li>
                <li>标注数量: ${this.annotations.length}</li>
            </ul>
            
            <h3>标注数据</h3>
            <pre style="background-color: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; max-height: 300px;">${JSON.stringify(this.annotations, null, 2)}</pre>
        `;
        
        content.innerHTML = debugInfo;
        
        debugModal.appendChild(header);
        debugModal.appendChild(content);
        document.body.appendChild(debugModal);
    }
}

window.MultiImageViewerV8 = MultiImageViewerV8;
