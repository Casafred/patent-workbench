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
            highlightColor: options.highlightColor || '#00FF00',
            ...options
        };
        
        this.annotations = [];
        this.selectedAnnotationId = null;
        this.currentZoom = 1.0;
        this.currentRotation = 0;
        this.currentFontSize = this.options.fontSize;
        this.currentColor = '#4CAF50'; // 默认绿色
        
        this.minZoom = 0.5;
        this.maxZoom = 5.0;
        this.zoomStep = 0.2;
        
        // 可选颜色列表
        this.availableColors = [
            { name: '橙色', value: '#FF5722' },
            { name: '绿色', value: '#4CAF50' },
            { name: '蓝色', value: '#2196F3' },
            { name: '紫色', value: '#9C27B0' },
            { name: '红色', value: '#F44336' },
            { name: '青色', value: '#00BCD4' },
            { name: '黄色', value: '#FFC107' },
            { name: '粉色', value: '#E91E63' }
        ];
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
        
        // 顶部关闭按钮
        const topCloseBtn = document.createElement('button');
        topCloseBtn.innerHTML = '✕';
        topCloseBtn.style.cssText = `
            position: absolute;
            top: 20px;
            left: 20px;
            width: 50px;
            height: 50px;
            background-color: rgba(244, 67, 54, 0.9);
            color: white;
            border: none;
            border-radius: 50%;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
            z-index: 10003;
            display: flex;
            justify-content: center;
            align-items: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: all 0.3s;
        `;
        topCloseBtn.addEventListener('click', () => {
            modal.remove();
        });
        topCloseBtn.addEventListener('mouseenter', () => {
            topCloseBtn.style.backgroundColor = 'rgba(244, 67, 54, 1)';
            topCloseBtn.style.transform = 'scale(1.1)';
        });
        topCloseBtn.addEventListener('mouseleave', () => {
            topCloseBtn.style.backgroundColor = 'rgba(244, 67, 54, 0.9)';
            topCloseBtn.style.transform = 'scale(1)';
        });
        
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
        
        // 左侧悬浮工具栏
        const floatingToolbar = this.createFloatingToolbar();
        imageContainer.appendChild(floatingToolbar);
        
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
        let isDraggingAnnotation = false;
        let draggedAnnotation = null;
        let dragOffsetX = 0;
        let dragOffsetY = 0;
        
        this.setupDragScroll(imageContainer);
        
        // 鼠标按下 - 检查是否点击标注
        modalCanvas.addEventListener('mousedown', (e) => {
            const rect = modalCanvas.getBoundingClientRect();
            const scaleX = this.modalCanvas.width / rect.width;
            const scaleY = this.modalCanvas.height / rect.height;
            const clickX = (e.clientX - rect.left) * scaleX;
            const clickY = (e.clientY - rect.top) * scaleY;
            
            const annotation = this.findAnnotationAt(clickX, clickY);
            if (annotation) {
                isDraggingAnnotation = true;
                draggedAnnotation = annotation;
                dragOffsetX = clickX - annotation.labelX;
                dragOffsetY = clickY - annotation.labelY;
                imageContainer.style.cursor = 'move';
                e.stopPropagation();
            }
        });
        
        // 鼠标移动 - 拖动标注
        modalCanvas.addEventListener('mousemove', (e) => {
            if (isDraggingAnnotation && draggedAnnotation) {
                const rect = modalCanvas.getBoundingClientRect();
                const scaleX = this.modalCanvas.width / rect.width;
                const scaleY = this.modalCanvas.height / rect.height;
                const mouseX = (e.clientX - rect.left) * scaleX;
                const mouseY = (e.clientY - rect.top) * scaleY;
                
                // 计算新位置
                let newLabelX = mouseX - dragOffsetX;
                let newLabelY = mouseY - dragOffsetY;
                
                // 边界限制：获取文字宽度和高度
                const ctx = this.modalCanvas.getContext('2d');
                const text = `${draggedAnnotation.number}: ${draggedAnnotation.name}`;
                const fontSize = draggedAnnotation.fontSize || this.currentFontSize;
                ctx.font = `bold ${fontSize}px Arial, sans-serif`;
                const textWidth = ctx.measureText(text).width;
                const textHeight = fontSize * 1.5;
                
                // 限制在画布范围内
                const minX = 10;
                const maxX = this.modalCanvas.width - textWidth - 10;
                const minY = textHeight / 2 + 10;
                const maxY = this.modalCanvas.height - textHeight / 2 - 10;
                
                newLabelX = Math.max(minX, Math.min(maxX, newLabelX));
                newLabelY = Math.max(minY, Math.min(maxY, newLabelY));
                
                draggedAnnotation.labelX = newLabelX;
                draggedAnnotation.labelY = newLabelY;
                this.renderCanvas();
            }
        });
        
        // 鼠标释放 - 停止拖动
        modalCanvas.addEventListener('mouseup', () => {
            isDraggingAnnotation = false;
            draggedAnnotation = null;
            imageContainer.style.cursor = 'default';
        });
        
        modalCanvas.addEventListener('mouseleave', () => {
            isDraggingAnnotation = false;
            draggedAnnotation = null;
            imageContainer.style.cursor = 'default';
        });
        
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
            const rect = modalCanvas.getBoundingClientRect();
            const scaleX = this.modalCanvas.width / rect.width;
            const scaleY = this.modalCanvas.height / rect.height;
            const clickX = (e.clientX - rect.left) * scaleX;
            const clickY = (e.clientY - rect.top) * scaleY;
            
            // 先检查是否点击了现有标注
            const annotation = this.findAnnotationAt(clickX, clickY);
            if (annotation) {
                // 编辑现有标注
                const newName = prompt(`编辑标注名称 (${annotation.number}):`, annotation.name);
                if (newName !== null && newName.trim() !== '') {
                    annotation.name = newName.trim();
                    this.renderCanvas();
                    this.updateAnnotationList();
                }
                return;
            }
            
            // 添加新标注
            const number = prompt('请输入标记序号：');
            if (!number) return;
            
            const name = prompt('请输入标记说明：');
            if (!name) return;
            
            // 计算标签位置（自动偏移，避免遮挡标注点）
            const offsetDistance = 80;
            let labelX = clickX + offsetDistance;
            let labelY = clickY - offsetDistance;
            
            // 边界检查
            if (labelX > this.modalCanvas.width - 100) {
                labelX = clickX - offsetDistance;
            }
            if (labelY < 50) {
                labelY = clickY + offsetDistance;
            }
            
            const newAnnotation = {
                id: `manual_${Date.now()}`,
                markerX: clickX,
                markerY: clickY,
                labelX: labelX,
                labelY: labelY,
                number: number,
                name: name,
                confidence: 1.0,
                isSelected: false,
                isManual: true,
                fontSize: this.currentFontSize,
                color: this.currentColor
            };
            
            this.annotations.push(newAnnotation);
            this.renderCanvas();
            this.updateAnnotationList();
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
        
        // 右键删除标注
        modalCanvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const rect = modalCanvas.getBoundingClientRect();
            const scaleX = this.modalCanvas.width / rect.width;
            const scaleY = this.modalCanvas.height / rect.height;
            const clickX = (e.clientX - rect.left) * scaleX;
            const clickY = (e.clientY - rect.top) * scaleY;
            
            const annotation = this.findAnnotationAt(clickX, clickY);
            if (annotation) {
                if (confirm(`确定删除标注 "${annotation.number}: ${annotation.name}" 吗？`)) {
                    const index = this.annotations.indexOf(annotation);
                    if (index > -1) {
                        this.annotations.splice(index, 1);
                        this.renderCanvas();
                        this.updateAnnotationList();
                    }
                }
            }
        });
        
        // 单击选择标注
        modalCanvas.addEventListener('click', (e) => {
            const rect = modalCanvas.getBoundingClientRect();
            const scaleX = this.modalCanvas.width / rect.width;
            const scaleY = this.modalCanvas.height / rect.height;
            const clickX = (e.clientX - rect.left) * scaleX;
            const clickY = (e.clientY - rect.top) * scaleY;
            
            const annotation = this.findAnnotationAt(clickX, clickY);
            
            if (annotation) {
                if (e.ctrlKey || e.metaKey) {
                    // Ctrl/Cmd + 点击：多选
                    annotation.isSelected = !annotation.isSelected;
                } else {
                    // 单击：单选
                    this.annotations.forEach(a => a.isSelected = false);
                    annotation.isSelected = true;
                }
                this.selectedAnnotationId = annotation.id;
                this.renderCanvas();
                this.updateAnnotationList();
            } else if (!e.ctrlKey && !e.metaKey) {
                // 点击空白处：取消所有选中
                this.annotations.forEach(a => a.isSelected = false);
                this.selectedAnnotationId = null;
                this.renderCanvas();
                this.updateAnnotationList();
            }
        });
        
        mainContainer.appendChild(imageContainer);
        mainContainer.appendChild(sidebar);
        modal.appendChild(topCloseBtn);
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
    
    createFloatingToolbar() {
        const toolbar = document.createElement('div');
        toolbar.style.cssText = `
            position: absolute;
            left: 20px;
            top: 50%;
            transform: translateY(-50%);
            display: flex;
            flex-direction: column;
            gap: 8px;
            z-index: 101;
            background-color: rgba(255, 255, 255, 0.9);
            padding: 8px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        // 字体大小按钮组
        const fontGroup = document.createElement('div');
        fontGroup.style.cssText = 'display: flex; flex-direction: column; gap: 4px; border-bottom: 1px solid #ddd; padding-bottom: 8px;';
        
        const fontPlusBtn = this.createIconButton(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <text x="4" y="18" font-size="14" font-weight="bold" fill="currentColor">A+</text>
            </svg>
        `, () => {
            const selected = this.annotations.filter(a => a.isSelected);
            if (selected.length > 0) {
                selected.forEach(ann => {
                    ann.fontSize = Math.min((ann.fontSize || this.currentFontSize) + 2, 48);
                });
            } else {
                this.currentFontSize = Math.min(this.currentFontSize + 2, 48);
                this.annotations.forEach(ann => ann.fontSize = this.currentFontSize);
            }
            this.renderCanvas();
        }, '增大字体');
        
        const fontMinusBtn = this.createIconButton(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <text x="4" y="18" font-size="14" font-weight="bold" fill="currentColor">A-</text>
            </svg>
        `, () => {
            const selected = this.annotations.filter(a => a.isSelected);
            if (selected.length > 0) {
                selected.forEach(ann => {
                    ann.fontSize = Math.max((ann.fontSize || this.currentFontSize) - 2, 12);
                });
            } else {
                this.currentFontSize = Math.max(this.currentFontSize - 2, 12);
                this.annotations.forEach(ann => ann.fontSize = this.currentFontSize);
            }
            this.renderCanvas();
        }, '减小字体');
        
        fontGroup.appendChild(fontPlusBtn);
        fontGroup.appendChild(fontMinusBtn);
        toolbar.appendChild(fontGroup);
        
        // 旋转按钮组
        const rotateGroup = document.createElement('div');
        rotateGroup.style.cssText = 'display: flex; flex-direction: column; gap: 4px; border-bottom: 1px solid #ddd; padding-bottom: 8px;';
        
        const rotateLeftBtn = this.createIconButton(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
            </svg>
        `, () => {
            this.currentRotation = (this.currentRotation - 90 + 360) % 360;
            this.renderCanvas();
        }, '逆时针旋转');
        
        const rotateRightBtn = this.createIconButton(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
                <path d="M3 3v5h5"/>
            </svg>
        `, () => {
            this.currentRotation = (this.currentRotation + 90) % 360;
            this.renderCanvas();
        }, '顺时针旋转');
        
        rotateGroup.appendChild(rotateLeftBtn);
        rotateGroup.appendChild(rotateRightBtn);
        toolbar.appendChild(rotateGroup);
        
        // 缩放按钮组
        const zoomGroup = document.createElement('div');
        zoomGroup.style.cssText = 'display: flex; flex-direction: column; gap: 4px; border-bottom: 1px solid #ddd; padding-bottom: 8px;';
        
        this.zoomDisplay = document.createElement('div');
        this.zoomDisplay.textContent = '100%';
        this.zoomDisplay.style.cssText = 'font-size: 11px; font-weight: bold; text-align: center; color: #333; padding: 2px 0;';
        zoomGroup.appendChild(this.zoomDisplay);
        
        const zoomInBtn = this.createIconButton(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
                <line x1="11" y1="8" x2="11" y2="14"/>
                <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
        `, () => {
            this.currentZoom = Math.min(this.maxZoom, this.currentZoom + this.zoomStep);
            this.updateCanvasSize();
            this.updateZoomDisplay();
        }, '放大');
        
        const zoomOutBtn = this.createIconButton(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
                <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
        `, () => {
            this.currentZoom = Math.max(this.minZoom, this.currentZoom - this.zoomStep);
            this.updateCanvasSize();
            this.updateZoomDisplay();
        }, '缩小');
        
        const zoomResetBtn = this.createIconButton(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <text x="6" y="16" font-size="10" font-weight="bold" fill="currentColor">1:1</text>
            </svg>
        `, () => {
            this.currentZoom = 1.0;
            this.updateCanvasSize();
            this.updateZoomDisplay();
        }, '重置缩放');
        
        zoomGroup.appendChild(zoomInBtn);
        zoomGroup.appendChild(zoomOutBtn);
        zoomGroup.appendChild(zoomResetBtn);
        toolbar.appendChild(zoomGroup);
        
        // 截图按钮
        const screenshotBtn = this.createIconButton(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
            </svg>
        `, () => {
            this.takeScreenshot();
        }, '高清截图');
        toolbar.appendChild(screenshotBtn);
        
        return toolbar;
    }
    
    createIconButton(svgContent, onClick, title) {
        const btn = document.createElement('button');
        btn.innerHTML = svgContent;
        btn.title = title;
        btn.style.cssText = `
            width: 40px;
            height: 40px;
            background-color: transparent;
            color: #333;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            justify-content: center;
            align-items: center;
            transition: all 0.2s;
            padding: 0;
        `;
        btn.addEventListener('click', onClick);
        btn.addEventListener('mouseenter', () => {
            btn.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
            btn.style.transform = 'scale(1.1)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.backgroundColor = 'transparent';
            btn.style.transform = 'scale(1)';
        });
        return btn;
    }
    
    createSidebar() {
        const sidebar = document.createElement('div');
        sidebar.style.cssText = `
            width: 250px;
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
        
        // 选择控制
        const selectSection = this.createSection('选择控制');
        const selectBtnContainer = document.createElement('div');
        selectBtnContainer.style.cssText = 'display: flex; gap: 5px;';
        
        const selectAllBtn = this.createButton('全选', () => {
            this.annotations.forEach(a => a.isSelected = true);
            this.renderCanvas();
            this.updateAnnotationList();
        });
        selectAllBtn.style.backgroundColor = '#607D8B';
        
        const deselectAllBtn = this.createButton('取消选择', () => {
            this.annotations.forEach(a => a.isSelected = false);
            this.selectedAnnotationId = null;
            this.renderCanvas();
            this.updateAnnotationList();
        });
        deselectAllBtn.style.backgroundColor = '#795548';
        
        selectBtnContainer.appendChild(selectAllBtn);
        selectBtnContainer.appendChild(deselectAllBtn);
        selectSection.appendChild(selectBtnContainer);
        sidebar.appendChild(selectSection);
        
        // 颜色选择
        const colorSection = this.createSection('标注颜色');
        const colorGrid = document.createElement('div');
        colorGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 5px;
        `;
        
        this.availableColors.forEach(colorObj => {
            const colorBtn = document.createElement('button');
            colorBtn.style.cssText = `
                width: 100%;
                height: 35px;
                background-color: ${colorObj.value} !important;
                border: 2px solid ${this.currentColor === colorObj.value ? '#FFF' : 'transparent'};
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            `;
            colorBtn.title = colorObj.name;
            
            colorBtn.addEventListener('click', () => {
                // 更新当前颜色
                this.currentColor = colorObj.value;
                
                // 更新选中标注的颜色
                const selected = this.annotations.filter(a => a.isSelected);
                if (selected.length > 0) {
                    selected.forEach(ann => {
                        ann.color = colorObj.value;
                    });
                } else {
                    // 如果没有选中标注，提示用户
                    // 但仍然更新默认颜色，用于新添加的标注
                }
                
                this.renderCanvas();
                
                // 更新按钮边框
                colorGrid.querySelectorAll('button').forEach(btn => {
                    btn.style.border = '2px solid transparent';
                });
                colorBtn.style.border = '2px solid #FFF';
            });
            
            colorBtn.addEventListener('mouseenter', () => {
                if (this.currentColor !== colorObj.value) {
                    colorBtn.style.transform = 'scale(1.1)';
                }
            });
            
            colorBtn.addEventListener('mouseleave', () => {
                colorBtn.style.transform = 'scale(1)';
            });
            
            colorGrid.appendChild(colorBtn);
        });
        
        const colorHint = document.createElement('div');
        colorHint.textContent = '点击颜色改变选中标注';
        colorHint.style.cssText = `
            text-align: center;
            font-size: 11px;
            color: #666;
            margin-top: 5px;
        `;
        
        colorSection.appendChild(colorGrid);
        colorSection.appendChild(colorHint);
        sidebar.appendChild(colorSection);
        
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
        
        // 智能布局：将标注分布到画布边缘
        const canvasWidth = this.modalCanvas.width;
        const canvasHeight = this.modalCanvas.height;
        const margin = 50; // 距离边缘的最小距离
        
        // 将标注分配到四个边缘区域
        const regions = [
            { name: 'top', labels: [] },
            { name: 'right', labels: [] },
            { name: 'bottom', labels: [] },
            { name: 'left', labels: [] }
        ];
        
        this.annotations = detectedNumbers.map((detected, index) => {
            // 根据标注点位置决定标签放在哪个边缘
            const centerX = canvasWidth / 2;
            const centerY = canvasHeight / 2;
            const dx = detected.x - centerX;
            const dy = detected.y - centerY;
            
            let region;
            let labelX, labelY;
            
            // 根据标注点相对于中心的位置，选择最近的边缘
            if (Math.abs(dx) > Math.abs(dy)) {
                // 左右边缘
                if (dx > 0) {
                    region = regions[1]; // right
                    labelX = canvasWidth - margin;
                } else {
                    region = regions[3]; // left
                    labelX = margin;
                }
                labelY = detected.y;
            } else {
                // 上下边缘
                if (dy > 0) {
                    region = regions[2]; // bottom
                    labelY = canvasHeight - margin;
                } else {
                    region = regions[0]; // top
                    labelY = margin;
                }
                labelX = detected.x;
            }
            
            const annotation = {
                id: `annotation_${index}`,
                markerX: detected.x,
                markerY: detected.y,
                labelX: labelX,
                labelY: labelY,
                number: detected.number,
                name: detected.name || referenceMap[detected.number] || '未知',
                confidence: detected.confidence || 0,
                isSelected: false,
                isManual: false,
                fontSize: this.currentFontSize,
                color: '#4CAF50' // 默认统一使用绿色
            };
            
            region.labels.push(annotation);
            return annotation;
        });
        
        // 简单布局：均匀分布到边缘，确保不超出边界
        regions.forEach(region => {
            if (region.labels.length === 0) return;
            
            const ctx = this.modalCanvas.getContext('2d');
            
            // 按照标注点位置排序
            if (region.name === 'top' || region.name === 'bottom') {
                region.labels.sort((a, b) => a.markerX - b.markerX);
                // 均匀分布在水平方向
                const spacing = (canvasWidth - 2 * margin) / (region.labels.length + 1);
                region.labels.forEach((label, i) => {
                    label.labelX = margin + spacing * (i + 1);
                    
                    // 边界检查：确保文字不超出画布
                    const text = `${label.number}: ${label.name}`;
                    ctx.font = `bold ${label.fontSize}px Arial, sans-serif`;
                    const textWidth = ctx.measureText(text).width;
                    
                    // 限制在画布范围内
                    const minX = 10;
                    const maxX = canvasWidth - textWidth - 10;
                    label.labelX = Math.max(minX, Math.min(maxX, label.labelX));
                });
            } else {
                region.labels.sort((a, b) => a.markerY - b.markerY);
                // 均匀分布在垂直方向
                const spacing = (canvasHeight - 2 * margin) / (region.labels.length + 1);
                region.labels.forEach((label, i) => {
                    label.labelY = margin + spacing * (i + 1);
                    
                    // 边界检查：确保文字不超出画布
                    const textHeight = label.fontSize * 1.5;
                    const minY = textHeight / 2 + 10;
                    const maxY = canvasHeight - textHeight / 2 - 10;
                    label.labelY = Math.max(minY, Math.min(maxY, label.labelY));
                });
            }
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
        
        // 应用旋转变换到图片
        if (this.currentRotation !== 0) {
            ctx.translate(this.modalCanvas.width / 2, this.modalCanvas.height / 2);
            ctx.rotate((this.currentRotation * Math.PI) / 180);
            ctx.translate(-this.modalCanvas.width / 2, -this.modalCanvas.height / 2);
        }
        
        // 绘制图片
        ctx.drawImage(this.currentImage, 0, 0, this.modalCanvas.width, this.modalCanvas.height);
        
        ctx.restore();
        
        // 绘制标注（标注点跟随旋转，文字不旋转）
        this.annotations.forEach(annotation => {
            const isHighlighted = annotation.isSelected || annotation.id === this.selectedAnnotationId;
            const color = annotation.color || this.currentColor;
            const lineWidth = isHighlighted ? 4 : 3;
            const fontSize = annotation.fontSize || this.currentFontSize;
            
            // 计算旋转后的标注点位置
            const centerX = this.modalCanvas.width / 2;
            const centerY = this.modalCanvas.height / 2;
            const radians = (this.currentRotation * Math.PI) / 180;
            
            // 原始标注点相对于中心的位置
            const relX = annotation.markerX - centerX;
            const relY = annotation.markerY - centerY;
            
            // 旋转后的标注点位置
            const rotatedMarkerX = centerX + (relX * Math.cos(radians) - relY * Math.sin(radians));
            const rotatedMarkerY = centerY + (relX * Math.sin(radians) + relY * Math.cos(radians));
            
            // 计算标注点偏移位置（避免遮挡原图标记）
            const dx = annotation.labelX - rotatedMarkerX;
            const dy = annotation.labelY - rotatedMarkerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const offsetDistance = 15;
            
            const offsetX = distance > 0 ? (dx / distance) * offsetDistance : 0;
            const offsetY = distance > 0 ? (dy / distance) * offsetDistance : 0;
            
            const markerDisplayX = rotatedMarkerX + offsetX;
            const markerDisplayY = rotatedMarkerY + offsetY;
            
            // 绘制连接线（从偏移后的标注点到标签文字）
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(markerDisplayX, markerDisplayY);
            ctx.lineTo(annotation.labelX, annotation.labelY);
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
            ctx.restore();
            
            // 绘制标注点（偏移后的位置）
            ctx.save();
            ctx.beginPath();
            ctx.arc(markerDisplayX, markerDisplayY, 6, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
            
            // 绘制标注文字（不旋转，保持可读）
            ctx.save();
            const text = `${annotation.number}: ${annotation.name}`;
            ctx.font = `bold ${fontSize}px Arial, sans-serif`;
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'left';
            
            // 白色描边
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 5;
            ctx.strokeText(text, annotation.labelX, annotation.labelY);
            
            // 彩色填充
            ctx.fillStyle = color;
            ctx.fillText(text, annotation.labelX, annotation.labelY);
            
            // 选中时绘制边框
            if (isHighlighted) {
                const textWidth = ctx.measureText(text).width;
                const textHeight = fontSize * 1.5;
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.strokeRect(
                    annotation.labelX - 4,
                    annotation.labelY - textHeight/2 - 2,
                    textWidth + 8,
                    textHeight + 4
                );
            }
            ctx.restore();
        });
    }
    
    updateAnnotationList() {
        this.annotationList.innerHTML = '';
        
        this.annotations.forEach(annotation => {
            const item = document.createElement('div');
            const isHighlighted = annotation.isSelected || annotation.id === this.selectedAnnotationId;
            const annotationColor = annotation.color || this.currentColor;
            
            // 将颜色转换为淡化版本作为背景色
            const bgColor = isHighlighted ? this.hexToRgba(annotationColor, 0.3) : '#f0f0f0';
            const borderColor = isHighlighted ? annotationColor : '#ddd';
            
            item.style.cssText = `
                padding: 8px;
                background-color: ${bgColor};
                color: #000;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s;
                font-weight: ${isHighlighted ? 'bold' : 'normal'};
                border: ${isHighlighted ? `3px solid ${borderColor}` : '1px solid #ddd'};
            `;
            item.textContent = `${annotation.number}: ${annotation.name}${annotation.isManual ? ' (手动)' : ''}`;
            
            item.addEventListener('click', () => {
                // 切换选中状态
                annotation.isSelected = !annotation.isSelected;
                this.selectedAnnotationId = annotation.isSelected ? annotation.id : null;
                this.renderCanvas();
                this.updateAnnotationList();
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
    
    
    findAnnotationAt(x, y) {
        const ctx = this.modalCanvas.getContext('2d');
        
        for (let i = this.annotations.length - 1; i >= 0; i--) {
            const ann = this.annotations[i];
            const text = `${ann.number}: ${ann.name}`;
            const fontSize = ann.fontSize || this.currentFontSize;
            
            ctx.font = `bold ${fontSize}px Arial, sans-serif`;
            const textWidth = ctx.measureText(text).width;
            const textHeight = fontSize * 1.5;
            
            if (x >= ann.labelX - 4 && x <= ann.labelX + textWidth + 4 &&
                y >= ann.labelY - textHeight/2 - 2 && y <= ann.labelY + textHeight/2 + 2) {
                return ann;
            }
        }
        return null;
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
    
    takeScreenshot() {
        // 创建一个临时canvas来绘制高清截图
        const screenshotCanvas = document.createElement('canvas');
        screenshotCanvas.width = this.modalCanvas.width;
        screenshotCanvas.height = this.modalCanvas.height;
        const ctx = screenshotCanvas.getContext('2d');
        
        // 绘制当前状态（包括旋转、标注等）
        ctx.save();
        
        // 应用旋转
        if (this.currentRotation !== 0) {
            ctx.translate(screenshotCanvas.width / 2, screenshotCanvas.height / 2);
            ctx.rotate((this.currentRotation * Math.PI) / 180);
            ctx.translate(-screenshotCanvas.width / 2, -screenshotCanvas.height / 2);
        }
        
        // 绘制图片
        ctx.drawImage(this.currentImage, 0, 0, screenshotCanvas.width, screenshotCanvas.height);
        ctx.restore();
        
        // 绘制标注
        this.annotations.forEach(annotation => {
            const isHighlighted = annotation.isSelected || annotation.id === this.selectedAnnotationId;
            const color = annotation.color || this.currentColor;
            const lineWidth = isHighlighted ? 4 : 3;
            const fontSize = annotation.fontSize || this.currentFontSize;
            
            // 计算旋转后的标注点位置
            const centerX = screenshotCanvas.width / 2;
            const centerY = screenshotCanvas.height / 2;
            const radians = (this.currentRotation * Math.PI) / 180;
            
            const relX = annotation.markerX - centerX;
            const relY = annotation.markerY - centerY;
            
            const rotatedMarkerX = centerX + (relX * Math.cos(radians) - relY * Math.sin(radians));
            const rotatedMarkerY = centerY + (relX * Math.sin(radians) + relY * Math.cos(radians));
            
            const dx = annotation.labelX - rotatedMarkerX;
            const dy = annotation.labelY - rotatedMarkerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const offsetDistance = 15;
            
            const offsetX = distance > 0 ? (dx / distance) * offsetDistance : 0;
            const offsetY = distance > 0 ? (dy / distance) * offsetDistance : 0;
            
            const markerDisplayX = rotatedMarkerX + offsetX;
            const markerDisplayY = rotatedMarkerY + offsetY;
            
            // 绘制连接线
            ctx.beginPath();
            ctx.moveTo(markerDisplayX, markerDisplayY);
            ctx.lineTo(annotation.labelX, annotation.labelY);
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
            
            // 绘制标注点
            ctx.beginPath();
            ctx.arc(markerDisplayX, markerDisplayY, 6, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // 绘制标注文字
            const text = `${annotation.number}: ${annotation.name}`;
            ctx.font = `bold ${fontSize}px Arial, sans-serif`;
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'left';
            
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 5;
            ctx.strokeText(text, annotation.labelX, annotation.labelY);
            
            ctx.fillStyle = color;
            ctx.fillText(text, annotation.labelX, annotation.labelY);
        });
        
        // 转换为图片并下载
        screenshotCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const imageName = this.currentImageData.title || `图片${this.currentIndex + 1}`;
            a.download = `${imageName}_标注_${timestamp}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // 显示成功提示
            alert('高清截图已保存！');
        }, 'image/png', 1.0);
    }
    
    openDebugPanel() {
        const debugModal = document.createElement('div');
        debugModal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 80%;
            max-width: 1200px;
            max-height: 85vh;
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
            <span>🔧 调试面板 - ${this.currentImageData.title || '当前图片'}</span>
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
        
        // 创建两列布局
        const columnsContainer = document.createElement('div');
        columnsContainer.style.cssText = `
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        `;
        
        // 左列：OCR识别结果
        const leftColumn = document.createElement('div');
        leftColumn.style.cssText = `
            background-color: white;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 15px;
        `;
        
        const ocrTitle = document.createElement('h4');
        ocrTitle.textContent = '📷 附图OCR识别结果';
        ocrTitle.style.cssText = `
            margin: 0 0 10px 0;
            color: #007bff;
            font-size: 16px;
        `;
        leftColumn.appendChild(ocrTitle);
        
        // OCR统计信息
        const ocrStats = document.createElement('div');
        ocrStats.style.cssText = `
            background-color: #e7f3ff;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 10px;
            font-size: 14px;
        `;
        
        const detectedNumbers = this.currentImageData.detectedNumbers || [];
        const referenceMap = this.currentImageData.referenceMap || {};
        const matchedCount = detectedNumbers.filter(d => referenceMap[d.number]).length;
        
        ocrStats.innerHTML = `
            <div><strong>识别标号数:</strong> ${detectedNumbers.length} 个</div>
            <div><strong>匹配成功:</strong> ${matchedCount} 个</div>
            <div><strong>未匹配:</strong> ${detectedNumbers.length - matchedCount} 个</div>
        `;
        leftColumn.appendChild(ocrStats);
        
        // OCR识别列表
        const ocrList = document.createElement('div');
        ocrList.style.cssText = `
            max-height: 500px;
            overflow-y: auto;
            font-size: 13px;
        `;
        
        if (detectedNumbers.length > 0) {
            const sortedOcr = [...detectedNumbers].sort((a, b) => {
                const numA = parseInt(a.number) || 0;
                const numB = parseInt(b.number) || 0;
                return numA - numB;
            });
            
            sortedOcr.forEach(item => {
                const itemDiv = document.createElement('div');
                const isMatched = referenceMap[item.number];
                itemDiv.style.cssText = `
                    padding: 8px;
                    margin: 5px 0;
                    border-left: 4px solid ${isMatched ? '#28a745' : '#ffc107'};
                    background-color: ${isMatched ? '#d4edda' : '#fff3cd'};
                    border-radius: 4px;
                `;
                itemDiv.innerHTML = `
                    <div><strong>标号:</strong> ${item.number}</div>
                    <div><strong>位置:</strong> (${Math.round(item.x)}, ${Math.round(item.y)})</div>
                    <div><strong>置信度:</strong> ${Math.round((item.confidence || 0) * 100)}%</div>
                    <div><strong>状态:</strong> ${isMatched ? '✅ 已匹配 → ' + referenceMap[item.number] : '⚠️ 未匹配'}</div>
                `;
                ocrList.appendChild(itemDiv);
            });
        } else {
            ocrList.innerHTML = '<div style="color: #6c757d; padding: 10px;">暂无OCR识别结果</div>';
        }
        
        leftColumn.appendChild(ocrList);
        
        // 右列：说明书提取结果
        const rightColumn = document.createElement('div');
        rightColumn.style.cssText = `
            background-color: white;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 15px;
        `;
        
        const specTitle = document.createElement('h4');
        specTitle.textContent = '📝 说明书提取结果';
        specTitle.style.cssText = `
            margin: 0 0 10px 0;
            color: #28a745;
            font-size: 16px;
        `;
        rightColumn.appendChild(specTitle);
        
        // 说明书统计信息
        const specStats = document.createElement('div');
        specStats.style.cssText = `
            background-color: #d4edda;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 10px;
            font-size: 14px;
        `;
        
        const totalMarkers = Object.keys(referenceMap).length;
        const detectedMarkers = detectedNumbers.length;
        const matchRate = totalMarkers > 0 ? Math.round((matchedCount / totalMarkers) * 100) : 0;
        
        specStats.innerHTML = `
            <div><strong>总部件数:</strong> ${totalMarkers} 个</div>
            <div><strong>已识别:</strong> ${detectedMarkers} 个</div>
            <div><strong>匹配率:</strong> ${matchRate}%</div>
        `;
        rightColumn.appendChild(specStats);
        
        // 说明书部件列表
        const specList = document.createElement('div');
        specList.style.cssText = `
            max-height: 500px;
            overflow-y: auto;
            font-size: 13px;
        `;
        
        if (Object.keys(referenceMap).length > 0) {
            const sortedMarkers = Object.entries(referenceMap).sort((a, b) => {
                const numA = parseInt(a[0]) || 0;
                const numB = parseInt(b[0]) || 0;
                return numA - numB;
            });
            
            sortedMarkers.forEach(([number, name]) => {
                const isDetected = detectedNumbers.some(d => d.number === number);
                const itemDiv = document.createElement('div');
                itemDiv.style.cssText = `
                    padding: 8px;
                    margin: 5px 0;
                    border-left: 4px solid ${isDetected ? '#28a745' : '#dc3545'};
                    background-color: ${isDetected ? '#d4edda' : '#f8d7da'};
                    border-radius: 4px;
                `;
                itemDiv.innerHTML = `
                    <div><strong>${number}:</strong> ${name}</div>
                    <div style="margin-top: 4px; font-size: 12px;">
                        ${isDetected ? '✅ 已在附图中识别' : '❌ 未在附图中识别'}
                    </div>
                `;
                specList.appendChild(itemDiv);
            });
        } else {
            specList.innerHTML = '<div style="color: #6c757d; padding: 10px;">暂无说明书提取结果</div>';
        }
        
        rightColumn.appendChild(specList);
        
        // 添加列到容器
        columnsContainer.appendChild(leftColumn);
        columnsContainer.appendChild(rightColumn);
        content.appendChild(columnsContainer);
        
        // 添加图例说明
        const legend = document.createElement('div');
        legend.style.cssText = `
            margin-top: 15px;
            padding: 10px;
            background-color: #e9ecef;
            border-radius: 4px;
            font-size: 12px;
            color: #495057;
        `;
        legend.innerHTML = `
            <strong>图例说明:</strong>
            <span style="color: #28a745; margin-left: 10px;">● 绿色</span> = 已匹配/已识别 |
            <span style="color: #ffc107; margin-left: 10px;">● 黄色</span> = OCR识别但未匹配 |
            <span style="color: #dc3545; margin-left: 10px;">● 红色</span> = 说明书中有但未识别
        `;
        content.appendChild(legend);
        
        debugModal.appendChild(header);
        debugModal.appendChild(content);
        document.body.appendChild(debugModal);
    }
    
    // 辅助函数：将十六进制颜色转换为 RGBA
    hexToRgba(hex, alpha) {
        // 移除 # 号
        hex = hex.replace('#', '');
        
        // 解析 RGB 值
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
}

window.MultiImageViewerV8 = MultiImageViewerV8;
