/**
 * 交互式专利附图标注系统 v8.0
 * 新增功能：
 * 1. 调试面板改为按钮+弹窗形式
 * 2. 多图片查看器（左右箭头切换）
 * 3. 图片旋转功能（顺时针/逆时针）
 * 4. 选中标记颜色高亮
 * 5. 功能栏集成（字体、高亮、旋转）
 * 6. 双击手动插入标注
 */

class InteractiveDrawingMarkerV8 {
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
        
        // 显示控制
        this.scale = 1;
        this.rotation = 0; // 旋转角度（0, 90, 180, 270）
        
        // 配置选项
        this.options = {
            enableModal: options.enableModal !== false,
            containerWidth: options.containerWidth || null,
            fontSize: options.fontSize || 16,
            highlightColor: options.highlightColor || '#FFD700', // 高亮颜色
            ...options
        };
        
        // 初始化
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
        
        const containerWidth = this.options.containerWidth || 
                              (this.canvas.parentElement ? this.canvas.parentElement.offsetWidth : 800);
        const maxCanvasWidth = containerWidth - 20;
        
        this.scale = 1;
        if (this.originalWidth > maxCanvasWidth) {
            this.scale = maxCanvasWidth / this.originalWidth;
        }
        
        this.canvas.width = this.originalWidth;
        this.canvas.height = this.originalHeight;
        this.canvas.style.width = `${this.originalWidth}px`;
        this.canvas.style.height = `${this.originalHeight}px`;
        this.canvas.style.cursor = 'pointer';
        this.canvas.style.maxWidth = '100%';
        this.canvas.style.height = 'auto';
    }
    
    initializeAnnotations() {
        this.annotations = this.detectedNumbers.map((detected, index) => {
            const offsetDistance = 80;
            const angle = (index * 45) % 360;
            const offsetX = Math.cos(angle * Math.PI / 180) * offsetDistance;
            const offsetY = Math.sin(angle * Math.PI / 180) * offsetDistance;
            
            // 🔥 优化：区分匹配和未匹配的标记
            const isMatched = detected.is_matched !== false; // 默认为true（兼容旧数据）
            const displayName = detected.name || this.referenceMap[detected.number] || '(说明书未匹配)';
            
            return {
                id: `annotation_${index}`,
                markerX: detected.x,
                markerY: detected.y,
                labelX: detected.x + offsetX,
                labelY: detected.y + offsetY,
                number: detected.number,
                name: displayName,
                confidence: detected.confidence || 0,
                isSelected: false,
                isManual: false, // 标记是否为手动添加
                isMatched: isMatched // 🔥 新增：标记是否匹配
            };
        });
    }
    
    bindEvents() {
        this.canvas.addEventListener('click', (e) => {
            this.openModal();
        });
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.image, 0, 0, this.canvas.width, this.canvas.height);
        
        this.annotations.forEach(annotation => {
            this.drawAnnotation(annotation, false);
        });
    }
    
    drawAnnotation(annotation, isHighlighted = false) {
        const ctx = this.ctx;
        const fontSize = this.options.fontSize || 18;
        
        // 🔥 优化：根据匹配状态选择颜色
        let color;
        if (isHighlighted) {
            color = this.options.highlightColor; // 高亮颜色（选中时）
        } else if (!annotation.isMatched) {
            color = '#FFA500'; // 橙色表示未匹配（OCR识别但说明书未匹配）
        } else {
            color = '#FF5722'; // 红色表示已匹配
        }
        
        const lineWidth = isHighlighted ? 4 : 2;
        
        // 绘制连接线
        ctx.beginPath();
        ctx.moveTo(annotation.markerX, annotation.markerY);
        ctx.lineTo(annotation.labelX, annotation.labelY);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
        
        // 绘制文本
        const text = `${annotation.number}: ${annotation.name}`;
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        
        // 白色描边
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 4;
        ctx.strokeText(text, annotation.labelX, annotation.labelY);
        
        // 文字颜色
        ctx.fillStyle = color;
        ctx.fillText(text, annotation.labelX, annotation.labelY);
    }
    
    openModal(imageIndex = 0) {
        if (!this.options.enableModal) return;
        
        const modal = this.createModal(imageIndex);
        document.body.appendChild(modal);
        
        setTimeout(() => {
            modal.style.display = 'flex';
        }, 10);
    }
    
    createModal() {
        const modal = document.createElement('div');
        modal.className = 'drawing-marker-modal-v8';
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
        
        // 状态变量
        let currentZoom = 1.0;
        let currentRotation = 0;
        let currentFontSize = 22;
        let selectedAnnotationId = null;
        const minZoom = 0.5;
        const maxZoom = 5.0;
        const zoomStep = 0.2;
        
        // 创建主容器
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
        
        // 创建Canvas
        const modalCanvas = document.createElement('canvas');
        modalCanvas.width = this.originalWidth;
        modalCanvas.height = this.originalHeight;
        modalCanvas.style.cssText = `
            display: block;
            margin: 0 auto;
            transition: transform 0.1s ease-out;
        `;
        
        // 渲染函数
        const renderCanvas = () => {
            const modalCtx = modalCanvas.getContext('2d');
            modalCtx.clearRect(0, 0, modalCanvas.width, modalCanvas.height);
            
            // 保存状态
            modalCtx.save();
            
            // 应用旋转
            if (currentRotation !== 0) {
                modalCtx.translate(modalCanvas.width / 2, modalCanvas.height / 2);
                modalCtx.rotate((currentRotation * Math.PI) / 180);
                modalCtx.translate(-modalCanvas.width / 2, -modalCanvas.height / 2);
            }
            
            // 绘制图片
            modalCtx.drawImage(this.image, 0, 0, this.originalWidth, this.originalHeight);
            
            // 恢复状态
            modalCtx.restore();
            
            // 绘制标注
            this.annotations.forEach(annotation => {
                const isHighlighted = annotation.id === selectedAnnotationId;
                
                // 🔥 优化：根据匹配状态选择颜色
                let color;
                if (isHighlighted) {
                    color = this.options.highlightColor;
                } else if (!annotation.isMatched) {
                    color = '#FFA500'; // 橙色表示未匹配
                } else {
                    color = '#FF5722'; // 红色表示已匹配
                }
                
                const lineWidth = isHighlighted ? 4 : 3;
                
                // 绘制连接线
                modalCtx.beginPath();
                modalCtx.moveTo(annotation.markerX, annotation.markerY);
                modalCtx.lineTo(annotation.labelX, annotation.labelY);
                modalCtx.strokeStyle = color;
                modalCtx.lineWidth = lineWidth;
                modalCtx.stroke();
                
                // 绘制文本
                const text = `${annotation.number}: ${annotation.name}`;
                modalCtx.font = `bold ${currentFontSize}px Arial, sans-serif`;
                modalCtx.textBaseline = 'middle';
                modalCtx.textAlign = 'left';
                
                // 白色描边
                modalCtx.strokeStyle = '#FFFFFF';
                modalCtx.lineWidth = 5;
                modalCtx.strokeText(text, annotation.labelX, annotation.labelY);
                
                // 文字颜色
                modalCtx.fillStyle = color;
                modalCtx.fillText(text, annotation.labelX, annotation.labelY);
            });
        };
        
        // 更新Canvas尺寸
        const updateCanvasSize = () => {
            modalCanvas.style.width = `${this.originalWidth * currentZoom}px`;
            modalCanvas.style.height = `${this.originalHeight * currentZoom}px`;
        };
        
        // 初始渲染
        renderCanvas();
        updateCanvasSize();
        
        // 侧边功能栏
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
        
        // 功能栏标题
        const sidebarTitle = document.createElement('div');
        sidebarTitle.textContent = '功能控制';
        sidebarTitle.style.cssText = `
            font-size: 18px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
            text-align: center;
        `;
        sidebar.appendChild(sidebarTitle);
        
        // 字体大小控制
        const fontSection = this.createSection('字体大小');
        const fontSizeDisplay = document.createElement('div');
        fontSizeDisplay.textContent = `${currentFontSize}px`;
        fontSizeDisplay.style.cssText = `
            text-align: center;
            font-weight: bold;
            margin: 5px 0;
        `;
        
        const fontBtnContainer = document.createElement('div');
        fontBtnContainer.style.cssText = 'display: flex; gap: 5px;';
        
        const fontMinusBtn = this.createSidebarButton('-', () => {
            currentFontSize = Math.max(12, currentFontSize - 2);
            fontSizeDisplay.textContent = `${currentFontSize}px`;
            renderCanvas();
        });
        
        const fontPlusBtn = this.createSidebarButton('+', () => {
            currentFontSize = Math.min(40, currentFontSize + 2);
            fontSizeDisplay.textContent = `${currentFontSize}px`;
            renderCanvas();
        });
        
        fontBtnContainer.appendChild(fontMinusBtn);
        fontBtnContainer.appendChild(fontPlusBtn);
        fontSection.appendChild(fontSizeDisplay);
        fontSection.appendChild(fontBtnContainer);
        sidebar.appendChild(fontSection);
        
        // 旋转控制
        const rotateSection = this.createSection('图片旋转');
        const rotateBtnContainer = document.createElement('div');
        rotateBtnContainer.style.cssText = 'display: flex; gap: 5px;';
        
        const rotateLeftBtn = this.createSidebarButton('↺ 逆时针', () => {
            currentRotation = (currentRotation - 90 + 360) % 360;
            renderCanvas();
        });
        
        const rotateRightBtn = this.createSidebarButton('↻ 顺时针', () => {
            currentRotation = (currentRotation + 90) % 360;
            renderCanvas();
        });
        
        rotateBtnContainer.appendChild(rotateLeftBtn);
        rotateBtnContainer.appendChild(rotateRightBtn);
        rotateSection.appendChild(rotateBtnContainer);
        sidebar.appendChild(rotateSection);
        
        // 缩放控制
        const zoomSection = this.createSection('缩放');
        const zoomDisplay = document.createElement('div');
        zoomDisplay.textContent = `${Math.round(currentZoom * 100)}%`;
        zoomDisplay.style.cssText = `
            text-align: center;
            font-weight: bold;
            margin: 5px 0;
        `;
        
        const zoomBtnContainer = document.createElement('div');
        zoomBtnContainer.style.cssText = 'display: flex; gap: 5px;';
        
        const zoomOutBtn = this.createSidebarButton('-', () => {
            currentZoom = Math.max(minZoom, currentZoom - zoomStep);
            updateCanvasSize();
            zoomDisplay.textContent = `${Math.round(currentZoom * 100)}%`;
        });
        
        const zoomInBtn = this.createSidebarButton('+', () => {
            currentZoom = Math.min(maxZoom, currentZoom + zoomStep);
            updateCanvasSize();
            zoomDisplay.textContent = `${Math.round(currentZoom * 100)}%`;
        });
        
        const zoomResetBtn = this.createSidebarButton('重置', () => {
            currentZoom = 1.0;
            updateCanvasSize();
            zoomDisplay.textContent = `${Math.round(currentZoom * 100)}%`;
        });
        
        zoomBtnContainer.appendChild(zoomOutBtn);
        zoomBtnContainer.appendChild(zoomResetBtn);
        zoomBtnContainer.appendChild(zoomInBtn);
        zoomSection.appendChild(zoomDisplay);
        zoomSection.appendChild(zoomBtnContainer);
        sidebar.appendChild(zoomSection);
        
        // 标注列表
        const annotationSection = this.createSection('标注列表');
        
        // 🔥 优化：添加图例说明
        const legend = document.createElement('div');
        legend.style.cssText = `
            font-size: 12px;
            color: #666;
            margin-bottom: 8px;
            padding: 8px;
            background-color: #f9f9f9;
            border-radius: 4px;
        `;
        legend.innerHTML = `
            <div style="margin-bottom: 4px;"><span style="color: #FF5722;">●</span> 已匹配</div>
            <div style="margin-bottom: 4px;"><span style="color: #FFA500;">●</span> 未匹配（仅OCR识别）</div>
            <div><span style="color: ${this.options.highlightColor};">●</span> 当前选中</div>
        `;
        annotationSection.appendChild(legend);
        
        const annotationList = document.createElement('div');
        annotationList.style.cssText = `
            max-height: 300px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 5px;
        `;
        
        this.annotations.forEach(annotation => {
            const item = document.createElement('div');
            
            // 🔥 优化：根据匹配状态设置不同的背景色
            const bgColor = annotation.isMatched ? '#f0f0f0' : '#fff3e0'; // 未匹配用浅橙色
            
            item.style.cssText = `
                padding: 8px;
                background-color: ${bgColor};
                border-radius: 4px;
                cursor: pointer;
                transition: background-color 0.2s;
                border-left: 3px solid ${annotation.isMatched ? '#FF5722' : '#FFA500'};
            `;
            
            // 🔥 优化：显示匹配状态
            const statusIcon = annotation.isMatched ? '✓' : '⚠';
            item.textContent = `${statusIcon} ${annotation.number}: ${annotation.name}`;
            
            item.addEventListener('click', () => {
                selectedAnnotationId = annotation.id;
                renderCanvas();
                
                // 更新列表样式
                annotationList.querySelectorAll('div').forEach(el => {
                    const ann = this.annotations.find(a => a.id === el.dataset.annotationId);
                    if (ann) {
                        el.style.backgroundColor = ann.isMatched ? '#f0f0f0' : '#fff3e0';
                    }
                });
                item.style.backgroundColor = this.options.highlightColor;
            });
            
            item.addEventListener('mouseenter', () => {
                if (selectedAnnotationId !== annotation.id) {
                    item.style.backgroundColor = annotation.isMatched ? '#e0e0e0' : '#ffe0b2';
                }
            });
            
            item.addEventListener('mouseleave', () => {
                if (selectedAnnotationId !== annotation.id) {
                    item.style.backgroundColor = annotation.isMatched ? '#f0f0f0' : '#fff3e0';
                }
            });
            
            item.dataset.annotationId = annotation.id; // 存储ID用于更新
            annotationList.appendChild(item);
        });
        
        annotationSection.appendChild(annotationList);
        sidebar.appendChild(annotationSection);
        
        // 调试面板按钮
        const debugBtn = this.createSidebarButton('🔧 调试面板', () => {
            this.openDebugPanel();
        });
        debugBtn.style.cssText += 'background-color: #2196F3; margin-top: 10px;';
        sidebar.appendChild(debugBtn);
        
        // 关闭按钮
        const closeBtn = this.createSidebarButton('✕ 关闭', () => {
            modal.remove();
        });
        closeBtn.style.cssText += 'background-color: #f44336; margin-top: auto;';
        sidebar.appendChild(closeBtn);
        
        // 双击添加标注
        modalCanvas.addEventListener('dblclick', (e) => {
            const rect = modalCanvas.getBoundingClientRect();
            const scaleX = modalCanvas.width / rect.width;
            const scaleY = modalCanvas.height / rect.height;
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
            if (labelX > modalCanvas.width - 100) {
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
            renderCanvas();
            
            // 更新列表
            const item = document.createElement('div');
            item.style.cssText = `
                padding: 8px;
                background-color: #f0f0f0;
                border-radius: 4px;
                cursor: pointer;
                transition: background-color 0.2s;
            `;
            item.textContent = `${newAnnotation.number}: ${newAnnotation.name} (手动)`;
            item.addEventListener('click', () => {
                selectedAnnotationId = newAnnotation.id;
                renderCanvas();
            });
            annotationList.appendChild(item);
        });
        
        // 鼠标滚轮缩放
        imageContainer.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
            currentZoom = Math.max(minZoom, Math.min(maxZoom, currentZoom + delta));
            updateCanvasSize();
            zoomDisplay.textContent = `${Math.round(currentZoom * 100)}%`;
        }, { passive: false });
        
        // 拖动功能
        let isDragging = false;
        let startX, startY, scrollLeft, scrollTop;
        
        imageContainer.addEventListener('mousedown', (e) => {
            isDragging = true;
            imageContainer.style.cursor = 'grabbing';
            startX = e.pageX - imageContainer.offsetLeft;
            startY = e.pageY - imageContainer.offsetTop;
            scrollLeft = imageContainer.scrollLeft;
            scrollTop = imageContainer.scrollTop;
        });
        
        imageContainer.addEventListener('mouseleave', () => {
            isDragging = false;
            imageContainer.style.cursor = 'grab';
        });
        
        imageContainer.addEventListener('mouseup', () => {
            isDragging = false;
            imageContainer.style.cursor = 'grab';
        });
        
        imageContainer.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const x = e.pageX - imageContainer.offsetLeft;
            const y = e.pageY - imageContainer.offsetTop;
            const walkX = (x - startX) * 1.5;
            const walkY = (y - startY) * 1.5;
            imageContainer.scrollLeft = scrollLeft - walkX;
            imageContainer.scrollTop = scrollTop - walkY;
        });
        
        imageContainer.appendChild(modalCanvas);
        mainContainer.appendChild(imageContainer);
        mainContainer.appendChild(sidebar);
        modal.appendChild(mainContainer);
        
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
    
    createSidebarButton(text, onClick) {
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
        btn.addEventListener('mouseenter', () => {
            btn.style.opacity = '0.8';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.opacity = '1';
        });
        return btn;
    }
    
    openDebugPanel() {
        const debugModal = document.createElement('div');
        debugModal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 700px;
            max-height: 80vh;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10001;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        `;
        
        // 标题栏
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
            <span>🔧 调试面板 - OCR识别详情</span>
            <button style="background: none; border: none; color: white; font-size: 20px; cursor: pointer;">✕</button>
        `;
        header.querySelector('button').addEventListener('click', () => {
            debugModal.remove();
        });
        
        // 内容区
        const content = document.createElement('div');
        content.style.cssText = `
            padding: 20px;
            overflow-y: auto;
            flex: 1;
        `;
        
        // 🔥 优化：分类显示OCR结果
        const matchedAnnotations = this.annotations.filter(a => a.isMatched);
        const unmatchedAnnotations = this.annotations.filter(a => !a.isMatched && !a.isManual);
        const manualAnnotations = this.annotations.filter(a => a.isManual);
        
        const debugInfo = `
            <div style="margin-bottom: 20px; padding: 15px; background-color: #e3f2fd; border-radius: 4px;">
                <h3 style="margin-top: 0; color: #1976d2;">📊 识别统计</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li><strong>OCR识别总数:</strong> ${this.annotations.length - manualAnnotations.length} 个</li>
                    <li><strong style="color: #4caf50;">✓ 说明书匹配:</strong> ${matchedAnnotations.length} 个</li>
                    <li><strong style="color: #ff9800;">⚠ 未匹配:</strong> ${unmatchedAnnotations.length} 个</li>
                    <li><strong style="color: #2196f3;">✎ 手动添加:</strong> ${manualAnnotations.length} 个</li>
                </ul>
            </div>
            
            ${matchedAnnotations.length > 0 ? `
            <div style="margin-bottom: 20px;">
                <h3 style="color: #4caf50;">✓ 已匹配标记 (${matchedAnnotations.length})</h3>
                <div style="background-color: #f5f5f5; padding: 10px; border-radius: 4px; max-height: 200px; overflow-y: auto;">
                    ${matchedAnnotations.map(a => `
                        <div style="padding: 5px; border-bottom: 1px solid #ddd;">
                            <strong>${a.number}</strong>: ${a.name} 
                            <span style="color: #666; font-size: 12px;">(置信度: ${a.confidence.toFixed(1)}%)</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            
            ${unmatchedAnnotations.length > 0 ? `
            <div style="margin-bottom: 20px;">
                <h3 style="color: #ff9800;">⚠ 未匹配标记 (${unmatchedAnnotations.length})</h3>
                <p style="color: #666; font-size: 14px; margin: 5px 0;">
                    这些标记被OCR识别到，但在说明书中未找到对应的部件名称。
                    <br>建议：检查说明书内容是否完整，或使用AI模式重新处理。
                </p>
                <div style="background-color: #fff3e0; padding: 10px; border-radius: 4px; max-height: 200px; overflow-y: auto;">
                    ${unmatchedAnnotations.map(a => `
                        <div style="padding: 5px; border-bottom: 1px solid #ffe0b2;">
                            <strong>${a.number}</strong>: ${a.name} 
                            <span style="color: #666; font-size: 12px;">(置信度: ${a.confidence.toFixed(1)}%)</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            
            ${manualAnnotations.length > 0 ? `
            <div style="margin-bottom: 20px;">
                <h3 style="color: #2196f3;">✎ 手动添加标记 (${manualAnnotations.length})</h3>
                <div style="background-color: #e3f2fd; padding: 10px; border-radius: 4px; max-height: 200px; overflow-y: auto;">
                    ${manualAnnotations.map(a => `
                        <div style="padding: 5px; border-bottom: 1px solid #bbdefb;">
                            <strong>${a.number}</strong>: ${a.name}
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            
            <div style="margin-bottom: 20px;">
                <h3>🖼️ 图片信息</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>原始尺寸: ${this.originalWidth} × ${this.originalHeight}</li>
                    <li>当前缩放: ${this.scale.toFixed(2)}</li>
                    <li>标注总数: ${this.annotations.length}</li>
                </ul>
            </div>
            
            <details style="margin-bottom: 20px;">
                <summary style="cursor: pointer; font-weight: bold; padding: 10px; background-color: #f5f5f5; border-radius: 4px;">
                    📋 完整标注数据 (JSON)
                </summary>
                <pre style="background-color: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; margin-top: 10px; font-size: 12px;">${JSON.stringify(this.annotations, null, 2)}</pre>
            </details>
            
            <details>
                <summary style="cursor: pointer; font-weight: bold; padding: 10px; background-color: #f5f5f5; border-radius: 4px;">
                    🔍 原始检测数据 (JSON)
                </summary>
                <pre style="background-color: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; margin-top: 10px; font-size: 12px;">${JSON.stringify(this.detectedNumbers, null, 2)}</pre>
            </details>
        `;
        
        content.innerHTML = debugInfo;
        
        debugModal.appendChild(header);
        debugModal.appendChild(content);
        document.body.appendChild(debugModal);
    }
    
    exportAnnotations() {
        return this.annotations.map(a => ({
            number: a.number,
            name: a.name,
            markerPosition: { x: a.markerX, y: a.markerY },
            labelPosition: { x: a.labelX, y: a.labelY },
            confidence: a.confidence,
            isManual: a.isManual
        }));
    }
    
    exportImage() {
        return this.canvas.toDataURL('image/png');
    }
}

// 全局存储
window.interactiveMarkersV8 = window.interactiveMarkersV8 || [];
