window.PatentDetailModes = {
    dualColumnMode: false,
    imageTextMode: false,
    originalNavCollapsed: false,
    imageTextViewerIndex: 0,
    imageTextViewerScale: 1,
    imageTextViewerRotation: 0,

    init: function() {
        const self = this;
        
        window.toggleDualColumnMode = function() {
            self.toggleDualColumn();
        };
        
        window.toggleImageTextMode = function() {
            self.toggleImageText();
        };
        
        window.imageTextPrevImage = function() {
            self.imageTextPrev();
        };
        
        window.imageTextNextImage = function() {
            self.imageTextNext();
        };
        
        window.imageTextJumpToImage = function(index) {
            self.imageTextJump(index);
        };
        
        window.imageTextZoomIn = function() {
            self.imageTextZoom(0.2);
        };
        
        window.imageTextZoomOut = function() {
            self.imageTextZoom(-0.2);
        };
        
        window.imageTextRotateLeft = function() {
            self.imageTextRotate(-90);
        };
        
        window.imageTextRotateRight = function() {
            self.imageTextRotate(90);
        };
        
        window.imageTextSmartMarker = function() {
            self.imageTextSmartMarker();
        };
    },

    toggleDualColumn: function() {
        this.dualColumnMode = !this.dualColumnMode;
        const btn = document.getElementById('dual-column-btn');
        const mainContent = document.querySelector('.content');
        const container = document.querySelector('.container');
        const sideNav = document.getElementById('sideNav');
        
        if (!mainContent) {
            console.error('找不到内容区域');
            return;
        }
        
        if (this.dualColumnMode) {
            if (this.imageTextMode) {
                this.toggleImageText();
                this.dualColumnMode = true;
            }
            
            btn.style.background = 'rgba(255,255,255,0.4)';
            btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M0 3a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3zm2-1a1 1 0 0 0-1 1v1h2V2H2zm3 2h2V2H5v2zm3-2v2h2V2H8zm3 2v2h2V4h-2zm0 3v2h2V7h-2zm0 3v2h2v-2h-2zm-3 2v2h2v-2H8zm-3 2v2h2v-2H5zm-3-2v2h2v-2H2zm0-3v2h2V7H2zm0-3v2h2V4H2zm5 0v2h2V4H7zm2 3H7v2h2V7z"/></svg> 退出双栏';
            
            if (container) {
                container.style.maxWidth = '1800px';
            }
            
            if (sideNav) {
                this.originalNavCollapsed = sideNav.classList.contains('collapsed');
                sideNav.classList.add('collapsed');
            }
            
            const navTrigger = document.getElementById('navTrigger');
            if (navTrigger) {
                navTrigger.classList.add('visible');
            }
            
            const sections = mainContent.querySelectorAll('.section');
            
            const dualColumnWrapper = document.createElement('div');
            dualColumnWrapper.className = 'dual-column-wrapper';
            dualColumnWrapper.style.cssText = 'display: flex; gap: 30px; padding: 20px;';
            
            const leftColumn = document.createElement('div');
            leftColumn.className = 'dual-column-left';
            leftColumn.style.cssText = 'flex: 1; overflow-y: auto; max-height: calc(100vh - 80px); padding-right: 15px;';
            
            const rightColumn = document.createElement('div');
            rightColumn.className = 'dual-column-right';
            rightColumn.style.cssText = 'flex: 1; overflow-y: auto; max-height: calc(100vh - 80px); padding-left: 15px; border-left: 2px solid #e0e0e0;';
            
            sections.forEach((section) => {
                const leftClone = section.cloneNode(true);
                const rightClone = section.cloneNode(true);
                leftColumn.appendChild(leftClone);
                rightColumn.appendChild(rightClone);
            });
            
            mainContent.style.display = 'none';
            
            mainContent.parentNode.insertBefore(dualColumnWrapper, mainContent);
            dualColumnWrapper.appendChild(leftColumn);
            dualColumnWrapper.appendChild(rightColumn);
            
            this.bindDualColumnNavEvents(leftColumn, rightColumn);
            
        } else {
            btn.style.background = 'rgba(255,255,255,0.2)';
            btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M0 3a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3zm2-1a1 1 0 0 0-1 1v1h2V2H2zm3 2h2V2H5v2zm3-2v2h2V2H8zm3 2v2h2V4h-2zm0 3v2h2V7h-2zm0 3v2h2v-2h-2zm-3 2v2h2v-2H8zm-3 2v2h2v-2H5zm-3-2v2h2v-2H2zm0-3v2h2V7H2zm0-3v2h2V4H2zm5 0v2h2V4H7zm2 3H7v2h2V7z"/></svg> 双栏对照';
            
            if (container) {
                container.style.maxWidth = '1200px';
            }
            
            if (sideNav && !this.originalNavCollapsed) {
                sideNav.classList.remove('collapsed');
            }
            
            const navTrigger = document.getElementById('navTrigger');
            if (navTrigger) {
                navTrigger.classList.remove('visible');
            }
            
            const wrapper = document.querySelector('.dual-column-wrapper');
            if (wrapper) {
                wrapper.remove();
            }
            
            mainContent.style.display = 'block';
        }
    },

    bindDualColumnNavEvents: function(leftColumn, rightColumn) {
        const navItems = document.querySelectorAll('.side-nav-item[data-section]');
        
        navItems.forEach(item => {
            item.addEventListener('click', function(e) {
                const sectionId = this.getAttribute('data-section');
                
                const leftSection = leftColumn.querySelector('#' + sectionId + ', [data-section-id="' + sectionId + '"]');
                const rightSection = rightColumn.querySelector('#' + sectionId + ', [data-section-id="' + sectionId + '"]');
                
                if (leftSection) {
                    leftSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                if (rightSection) {
                    rightSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    },

    toggleImageText: function() {
        this.imageTextMode = !this.imageTextMode;
        const btn = document.getElementById('image-text-btn');
        const mainContent = document.querySelector('.content');
        const container = document.querySelector('.container');
        const sideNav = document.getElementById('sideNav');
        const drawings = window.newTabDrawings || [];
        
        if (!mainContent) {
            console.error('找不到内容区域');
            return;
        }
        
        if (drawings.length === 0) {
            alert('当前专利没有附图，无法使用图文对照模式');
            this.imageTextMode = false;
            return;
        }
        
        if (this.imageTextMode) {
            if (this.dualColumnMode) {
                this.toggleDualColumn();
            }
            
            btn.style.background = 'rgba(255,255,255,0.4)';
            btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M.002 3a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-12a2 2 0 0 1-2-2V3zm1 9v1a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12zm5-6.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0z"/></svg> 退出图文';
            
            if (container) {
                container.style.maxWidth = '1800px';
            }
            
            if (sideNav) {
                this.originalNavCollapsed = sideNav.classList.contains('collapsed');
                sideNav.classList.add('collapsed');
            }
            
            const navTrigger = document.getElementById('navTrigger');
            if (navTrigger) {
                navTrigger.classList.add('visible');
            }
            
            this.imageTextViewerIndex = 0;
            this.imageTextViewerScale = 1;
            this.imageTextViewerRotation = 0;
            
            this.createImageTextWrapper(mainContent, drawings);
            
        } else {
            btn.style.background = 'rgba(255,255,255,0.25)';
            btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M.002 3a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-12a2 2 0 0 1-2-2V3zm1 9v1a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12zm5-6.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0z"/></svg> 图文对照';
            
            if (container) {
                container.style.maxWidth = '1200px';
            }
            
            if (sideNav && !this.originalNavCollapsed) {
                sideNav.classList.remove('collapsed');
            }
            
            const navTrigger = document.getElementById('navTrigger');
            if (navTrigger) {
                navTrigger.classList.remove('visible');
            }
            
            const wrapper = document.querySelector('.image-text-wrapper');
            if (wrapper) {
                wrapper.remove();
            }
            
            mainContent.style.display = 'block';
        }
    },

    createImageTextWrapper: function(mainContent, drawings) {
        const imageTextWrapper = document.createElement('div');
        imageTextWrapper.className = 'image-text-wrapper';
        imageTextWrapper.style.cssText = 'display: flex; gap: 20px; padding: 15px; height: calc(100vh - 80px);';
        
        const leftColumn = document.createElement('div');
        leftColumn.className = 'image-text-left';
        leftColumn.style.cssText = 'flex: 1; overflow-y: auto; padding-right: 10px;';
        
        const sections = mainContent.querySelectorAll('.section');
        sections.forEach((section) => {
            const clone = section.cloneNode(true);
            leftColumn.appendChild(clone);
        });
        
        const rightColumn = document.createElement('div');
        rightColumn.className = 'image-text-right';
        rightColumn.style.cssText = 'flex: 1; display: flex; flex-direction: column; background: #1a1a1a; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.3);';
        
        const toolbar = document.createElement('div');
        toolbar.className = 'image-text-toolbar';
        toolbar.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%); color: white;';
        toolbar.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span id="image-text-counter" style="font-weight: 500; font-size: 14px;">图 1 / ${drawings.length}</span>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
                <button onclick="imageTextZoomIn()" title="放大" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px;">+</button>
                <span id="image-text-zoom" style="min-width: 50px; text-align: center; font-size: 13px;">100%</span>
                <button onclick="imageTextZoomOut()" title="缩小" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px;">-</button>
                <button onclick="imageTextRotateLeft()" title="向左旋转" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px;">↺</button>
                <button onclick="imageTextRotateRight()" title="向右旋转" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px;">↻</button>
                <button onclick="imageTextSmartMarker()" title="智能标记" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); border: none; color: white; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;">智能标记</button>
            </div>
        `;
        
        const imageArea = document.createElement('div');
        imageArea.className = 'image-text-image-area';
        imageArea.style.cssText = 'flex: 1; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; background: #0d0d0d;';
        imageArea.innerHTML = `
            <button onclick="imageTextPrevImage()" style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.15); border: none; color: white; width: 50px; height: 50px; border-radius: 50%; cursor: pointer; font-size: 28px; z-index: 10; transition: all 0.2s; opacity: 0.7;">‹</button>
            <img id="image-text-main-img" src="${drawings[0]}" style="max-width: 95%; max-height: 95%; object-fit: contain; transition: transform 0.3s ease; border-radius: 4px;">
            <button onclick="imageTextNextImage()" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.15); border: none; color: white; width: 50px; height: 50px; border-radius: 50%; cursor: pointer; font-size: 28px; z-index: 10; transition: all 0.2s; opacity: 0.7;">›</button>
        `;
        
        const thumbnailArea = document.createElement('div');
        thumbnailArea.className = 'image-text-thumbnails';
        thumbnailArea.style.cssText = 'display: flex; gap: 8px; padding: 12px 15px; background: rgba(0,0,0,0.5); overflow-x: auto; justify-content: center; flex-wrap: wrap; max-height: 100px;';
        thumbnailArea.id = 'image-text-thumbnail-area';
        
        drawings.forEach((d, i) => {
            const thumb = document.createElement('div');
            thumb.style.cssText = `
                width: 60px; height: 60px; 
                border: 3px solid ${i === 0 ? '#4CAF50' : 'transparent'}; 
                border-radius: 6px; cursor: pointer; 
                overflow: hidden; 
                opacity: ${i === 0 ? 1 : 0.5}; 
                transition: all 0.2s;
                flex-shrink: 0;
            `;
            thumb.innerHTML = `<img src="${d}" style="width: 100%; height: 100%; object-fit: cover;">`;
            thumb.onclick = () => this.imageTextJump(i);
            thumbnailArea.appendChild(thumb);
        });
        
        rightColumn.appendChild(toolbar);
        rightColumn.appendChild(imageArea);
        rightColumn.appendChild(thumbnailArea);
        
        mainContent.style.display = 'none';
        
        mainContent.parentNode.insertBefore(imageTextWrapper, mainContent);
        imageTextWrapper.appendChild(leftColumn);
        imageTextWrapper.appendChild(rightColumn);
        
        this.bindImageTextNavEvents(leftColumn);
    },

    bindImageTextNavEvents: function(leftColumn) {
        const navItems = document.querySelectorAll('.side-nav-item[data-section]');
        
        navItems.forEach(item => {
            item.addEventListener('click', function(e) {
                const sectionId = this.getAttribute('data-section');
                const leftSection = leftColumn.querySelector('#' + sectionId + ', [data-section-id="' + sectionId + '"]');
                
                if (leftSection) {
                    leftSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    },

    imageTextUpdateDisplay: function() {
        const drawings = window.newTabDrawings || [];
        const img = document.getElementById('image-text-main-img');
        const counter = document.getElementById('image-text-counter');
        const zoomDisplay = document.getElementById('image-text-zoom');
        
        if (img) {
            img.src = drawings[this.imageTextViewerIndex];
            img.style.transform = 'scale(' + this.imageTextViewerScale + ') rotate(' + this.imageTextViewerRotation + 'deg)';
        }
        if (counter) {
            counter.textContent = '图 ' + (this.imageTextViewerIndex + 1) + ' / ' + drawings.length;
        }
        if (zoomDisplay) {
            zoomDisplay.textContent = Math.round(this.imageTextViewerScale * 100) + '%';
        }
        
        const thumbs = document.querySelectorAll('#image-text-thumbnail-area > div');
        thumbs.forEach((thumb, i) => {
            thumb.style.borderColor = i === this.imageTextViewerIndex ? '#4CAF50' : 'transparent';
            thumb.style.opacity = i === this.imageTextViewerIndex ? '1' : '0.5';
        });
    },

    imageTextPrev: function() {
        const drawings = window.newTabDrawings || [];
        this.imageTextViewerIndex = (this.imageTextViewerIndex - 1 + drawings.length) % drawings.length;
        this.imageTextUpdateDisplay();
    },

    imageTextNext: function() {
        const drawings = window.newTabDrawings || [];
        this.imageTextViewerIndex = (this.imageTextViewerIndex + 1) % drawings.length;
        this.imageTextUpdateDisplay();
    },

    imageTextJump: function(index) {
        this.imageTextViewerIndex = index;
        this.imageTextUpdateDisplay();
    },

    imageTextZoom: function(delta) {
        this.imageTextViewerScale = Math.min(3, Math.max(0.5, this.imageTextViewerScale + delta));
        this.imageTextUpdateDisplay();
    },

    imageTextRotate: function(delta) {
        this.imageTextViewerRotation = (this.imageTextViewerRotation + delta + 360) % 360;
        this.imageTextUpdateDisplay();
    },

    imageTextSmartMarker: function() {
        this.toggleImageText();
        
        const patentData = window.pageData || {};
        const description = patentData.description || '';
        const patentTitle = patentData.title || window.currentPatentNumber;
        const drawings = window.newTabDrawings || [];
        
        console.log('[imageTextSmartMarker] 准备传递数据到功能七:', {
            patentNumber: window.currentPatentNumber,
            patentTitle,
            drawingsCount: drawings.length,
            descriptionLength: description.length
        });
        
        if (typeof window.opener !== 'undefined' && window.opener && !window.opener.closed) {
            if (!window.opener.patentDrawingsData) {
                window.opener.patentDrawingsData = {};
            }
            window.opener.patentDrawingsData[window.currentPatentNumber] = drawings;
            
            if (!window.opener.patentResults) {
                window.opener.patentResults = [];
            }
            const existingIndex = window.opener.patentResults.findIndex(r => r.patent_number === window.currentPatentNumber);
            const patentResult = {
                patent_number: window.currentPatentNumber,
                success: true,
                data: patentData
            };
            if (existingIndex >= 0) {
                window.opener.patentResults[existingIndex] = patentResult;
            } else {
                window.opener.patentResults.push(patentResult);
            }
            
            if (typeof window.opener.sendToDrawingMarker === 'function') {
                window.opener.sendToDrawingMarker(window.currentPatentNumber);
                window.opener.focus();
                alert('已传递数据到主页面，请在主页面中选择要标记的图片');
                return;
            }
        }
        
        alert('请在主页面中使用此功能，或确保主页面已加载完成');
    }
};
