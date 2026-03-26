window.PatentDetailViewer = {
    viewerIndex: 0,
    viewerScale: 0.6,
    viewerRotation: 0,
    minScale: 0.3,
    maxScale: 3,
    zoomStep: 0.1,

    init: function() {
        const self = this;
        
        window.openNewTabImageViewer = function(startIndex) {
            self.open(startIndex);
        };
        
        window.closeNewTabImageViewer = function() {
            self.close();
        };
        
        window.navigateNewTabViewer = function(delta) {
            self.navigate(delta);
        };
        
        window.zoomNewTabImage = function(delta) {
            self.zoom(delta);
        };
        
        window.rotateNewTabImage = function(delta) {
            self.rotate(delta);
        };
        
        window.jumpNewTabToImage = function(index) {
            self.jumpTo(index);
        };
        
        window.sendNewTabDrawingsToMarker = function() {
            self.sendToMarker();
        };
    },

    getDrawings: function() {
        return window.newTabDrawings || [];
    },

    open: function(startIndex) {
        const drawings = this.getDrawings();
        if (drawings.length === 0) return;
        
        this.viewerIndex = startIndex;
        this.viewerScale = 0.6;
        this.viewerRotation = 0;
        
        const viewerHTML = `
            <div id="image-viewer-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.92); z-index: 10000; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div style="position: absolute; top: 20px; right: 20px; display: flex; gap: 15px; align-items: center;">
                    <span id="viewer-counter" style="color: white; font-size: 18px; font-weight: 500;">图 ${this.viewerIndex + 1} / ${drawings.length}</span>
                    <button onclick="closeNewTabImageViewer()" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 28px; width: 44px; height: 44px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0;">&times;</button>
                </div>
                <div style="position: absolute; left: 30px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 8px;">
                    <button onclick="navigateNewTabViewer(-1)" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 36px; width: 56px; height: 56px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0;">&#8249;</button>
                    <button onclick="zoomNewTabImage(0.2)" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 28px; width: 56px; height: 56px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0;" title="放大">+</button>
                    <span id="zoom-level" style="color: white; font-size: 14px; text-align: center; min-width: 56px;">${Math.round(this.viewerScale * 100)}%</span>
                    <button onclick="zoomNewTabImage(-0.2)" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 28px; width: 56px; height: 56px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0;" title="缩小">-</button>
                    <button onclick="rotateNewTabImage(-90)" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 22px; width: 56px; height: 56px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0;" title="向左旋转90度">↺</button>
                </div>
                <div style="position: absolute; right: 30px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 8px;">
                    <button onclick="navigateNewTabViewer(1)" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 36px; width: 56px; height: 56px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0;">&#8250;</button>
                    <button onclick="rotateNewTabImage(90)" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 22px; width: 56px; height: 56px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0;" title="向右旋转90度">↻</button>
                    <button onclick="sendNewTabDrawingsToMarker()" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); border: none; color: white; font-size: 12px; width: 56px; height: 56px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; font-weight: bold; line-height: 1.1; text-align: center;" title="将附图和说明书传递到功能七进行OCR智能标记">智能<br>标记</button>
                </div>
                <div id="viewer-image-container" style="position: relative; display: flex; align-items: center; justify-content: center;">
                    <img id="viewer-image" src="${drawings[this.viewerIndex]}" style="max-width: 85%; max-height: 60%; object-fit: contain; border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.6); transition: transform 0.3s ease;">
                </div>
                <div style="position: absolute; bottom: 25px; display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; max-width: 88%; max-height: 90px; overflow-y: auto; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 12px;">
                    ${drawings.map((d, i) => `
                        <div onclick="jumpNewTabToImage(${i})" style="width: 60px; height: 60px; border: 3px solid ${i === this.viewerIndex ? '#fff' : 'transparent'}; border-radius: 6px; cursor: pointer; overflow: hidden; opacity: ${i === this.viewerIndex ? 1 : 0.5}; transition: all 0.2s;">
                            <img src="${d}" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', viewerHTML);
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', this.handleKeydown.bind(this));
        
        const overlay = document.getElementById('image-viewer-overlay');
        if (overlay) {
            overlay.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
        }
    },

    close: function() {
        const overlay = document.getElementById('image-viewer-overlay');
        if (overlay) {
            overlay.removeEventListener('wheel', this.handleWheel.bind(this));
            overlay.remove();
        }
        document.body.style.overflow = '';
        document.removeEventListener('keydown', this.handleKeydown.bind(this));
    },

    navigate: function(delta) {
        const drawings = this.getDrawings();
        this.viewerIndex = (this.viewerIndex + delta + drawings.length) % drawings.length;
        this.updateImage();
    },

    jumpTo: function(index) {
        this.viewerIndex = index;
        this.updateImage();
    },

    zoom: function(delta) {
        this.viewerScale = Math.max(this.minScale, Math.min(this.maxScale, this.viewerScale + delta));
        this.updateImage();
    },

    rotate: function(delta) {
        this.viewerRotation = (this.viewerRotation + delta) % 360;
        this.updateImage();
    },

    updateImage: function() {
        const drawings = this.getDrawings();
        const img = document.getElementById('viewer-image');
        const counter = document.getElementById('viewer-counter');
        const zoomLevel = document.getElementById('zoom-level');
        
        if (img) {
            img.src = drawings[this.viewerIndex];
            img.style.transform = 'scale(' + this.viewerScale + ') rotate(' + this.viewerRotation + 'deg)';
        }
        if (counter) {
            counter.textContent = '图 ' + (this.viewerIndex + 1) + ' / ' + drawings.length;
        }
        if (zoomLevel) {
            zoomLevel.textContent = Math.round(this.viewerScale * 100) + '%';
        }
        
        document.querySelectorAll('#image-viewer-overlay > div:last-child > div').forEach((thumb, i) => {
            thumb.style.borderColor = i === this.viewerIndex ? '#fff' : 'transparent';
            thumb.style.opacity = i === this.viewerIndex ? 1 : 0.5;
        });
    },

    handleKeydown: function(e) {
        if (e.key === 'Escape') this.close();
        else if (e.key === 'ArrowLeft') this.navigate(-1);
        else if (e.key === 'ArrowRight') this.navigate(1);
        else if (e.key === 'ArrowUp' || e.key === '+') this.zoom(this.zoomStep);
        else if (e.key === 'ArrowDown' || e.key === '-') this.zoom(-this.zoomStep);
        else if (e.key === 'r' || e.key === 'R') this.rotate(90);
    },

    handleWheel: function(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -this.zoomStep : this.zoomStep;
        this.zoom(delta);
    },

    sendToMarker: function() {
        this.close();
        
        const patentData = window.pageData || {};
        const description = patentData.description || '';
        const patentTitle = patentData.title || window.currentPatentNumber;
        const drawings = this.getDrawings();
        
        console.log('[sendNewTabDrawingsToMarker] 准备传递数据到功能七:', {
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
