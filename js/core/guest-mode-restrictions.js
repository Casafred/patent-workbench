/**
 * 游客模式限制模块
 * 管理游客模式下的功能限制
 */

class GuestModeRestrictions {
    constructor() {
        this.isGuest = window.IS_GUEST_MODE || false;
        this.guestModel = window.GUEST_MODEL || 'glm-4-flash';
        
        this.limits = {
            imageUpload: {
                maxPerHour: 1,
                uploads: []
            },
            pdfParse: {
                maxPagesPerHour: 1,
                parsedPages: []
            }
        };
        
        if (this.isGuest) {
            this.loadUsageData();
            this.applyAllRestrictions();
        }
    }
    
    loadUsageData() {
        try {
            const data = localStorage.getItem('guest_usage_data');
            if (data) {
                const parsed = JSON.parse(data);
                this.limits.imageUpload.uploads = this.filterExpiredTimestamps(parsed.imageUploads || []);
                this.limits.pdfParse.parsedPages = this.filterExpiredTimestamps(parsed.pdfParsedPages || []);
            }
        } catch (e) {
            console.error('[GuestMode] 加载使用数据失败:', e);
        }
    }
    
    saveUsageData() {
        try {
            localStorage.setItem('guest_usage_data', JSON.stringify({
                imageUploads: this.limits.imageUpload.uploads,
                pdfParsedPages: this.limits.pdfParse.parsedPages
            }));
        } catch (e) {
            console.error('[GuestMode] 保存使用数据失败:', e);
        }
    }
    
    filterExpiredTimestamps(timestamps) {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        return timestamps.filter(t => t > oneHourAgo);
    }
    
    applyAllRestrictions() {
        if (!this.isGuest) return;
        
        console.log('[GuestMode] 应用游客模式限制');
        
        setTimeout(() => {
            this.disableChatFileUpload();
            this.disableChatSearch();
            this.restrictModelSelectors();
            this.setupPDFOCRRestrictions();
        }, 500);
    }
    
    disableChatFileUpload() {
        const uploadBtn = document.getElementById('chat_upload_file_btn');
        const fileInput = document.getElementById('chat_file_input');
        
        if (uploadBtn) {
            uploadBtn.disabled = true;
            uploadBtn.style.opacity = '0.4';
            uploadBtn.style.cursor = 'not-allowed';
            uploadBtn.title = '游客模式不可用';
            uploadBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                alert('游客模式下文件上传功能不可用\n\n请注册账号以使用完整功能');
            };
            console.log('[GuestMode] 已禁用文件上传按钮');
        }
        
        if (fileInput) {
            fileInput.disabled = true;
        }
    }
    
    disableChatSearch() {
        const searchBtn = document.getElementById('chat_search_btn');
        
        if (searchBtn) {
            searchBtn.disabled = true;
            searchBtn.style.opacity = '0.4';
            searchBtn.style.cursor = 'not-allowed';
            searchBtn.title = '游客模式不可用';
            searchBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                alert('游客模式下联网搜索功能不可用\n\n请注册账号以使用完整功能');
            };
            console.log('[GuestMode] 已禁用联网搜索按钮');
        }
    }
    
    restrictModelSelectors() {
        const selectors = [
            'modelSelector',
            'chat_model_select',
            'unified_template_model_select',
            'comparison_model_select',
            'patent_batch_model_selector',
            'ocr-chat-model-select'
        ];
        
        selectors.forEach(id => {
            const selector = document.getElementById(id);
            if (selector) {
                selector.innerHTML = `<option value="${this.guestModel}">${this.guestModel}</option>`;
                selector.value = this.guestModel;
                selector.disabled = true;
                selector.style.cursor = 'not-allowed';
                selector.style.opacity = '0.7';
            }
        });
        
        console.log('[GuestMode] 已限制模型选择器');
    }
    
    setupPDFOCRRestrictions() {
        const dropzone = document.getElementById('pdf_upload_dropzone');
        const fileInput = document.getElementById('ocr-file-input');
        const startOcrBtn = document.getElementById('start-ocr-btn');
        const ocrScopeSelect = document.getElementById('ocr-parse-mode');
        
        if (dropzone) {
            const originalClick = dropzone.onclick;
            dropzone.onclick = (e) => {
                if (!this.checkAndHandleFileUpload(e)) {
                    return;
                }
                if (originalClick) originalClick.call(dropzone, e);
            };
        }
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (!this.checkAndHandleFileUpload(e)) {
                    e.target.value = '';
                    return;
                }
            });
        }
        
        if (startOcrBtn) {
            const originalClick = startOcrBtn.onclick;
            startOcrBtn.addEventListener('click', (e) => {
                if (!this.checkAndHandleOCRStart(e)) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
            }, true);
        }
        
        if (ocrScopeSelect) {
            const options = ocrScopeSelect.querySelectorAll('option');
            options.forEach(opt => {
                if (opt.value === 'all') {
                    opt.disabled = true;
                    opt.textContent = opt.textContent + ' (游客不可用)';
                }
            });
        }
        
        console.log('[GuestMode] 已设置PDF OCR限制');
    }
    
    checkAndHandleFileUpload(e) {
        const fileInput = document.getElementById('ocr-file-input');
        const file = fileInput?.files?.[0];
        
        if (file) {
            const isImage = /\.(png|jpg|jpeg|bmp|webp)$/i.test(file.name);
            const isPDF = /\.pdf$/i.test(file.name);
            
            if (isImage) {
                const count = this.limits.imageUpload.uploads.length;
                if (count >= this.limits.imageUpload.maxPerHour) {
                    const remaining = this.getTimeUntilReset(this.limits.imageUpload.uploads[0]);
                    alert(`游客模式限制\n\n图片上传：每小时仅限 ${this.limits.imageUpload.maxPerHour} 张\n\n剩余等待时间：${remaining}`);
                    return false;
                }
                this.limits.imageUpload.uploads.push(Date.now());
                this.saveUsageData();
                return true;
            }
            
            if (isPDF) {
                return true;
            }
        }
        
        return true;
    }
    
    checkAndHandleOCRStart(e) {
        const scopeSelect = document.getElementById('ocr-parse-mode');
        const scope = scopeSelect?.value || 'current';
        
        if (scope === 'all') {
            alert('游客模式限制\n\nPDF全文档解析不可用\n仅支持当前页面解析');
            return false;
        }
        
        const count = this.limits.pdfParse.parsedPages.length;
        if (count >= this.limits.pdfParse.maxPagesPerHour) {
            const remaining = this.getTimeUntilReset(this.limits.pdfParse.parsedPages[0]);
            alert(`游客模式限制\n\nPDF解析：每小时仅限 ${this.limits.pdfParse.maxPagesPerHour} 页\n\n剩余等待时间：${remaining}`);
            return false;
        }
        
        this.limits.pdfParse.parsedPages.push(Date.now());
        this.saveUsageData();
        return true;
    }
    
    getTimeUntilReset(timestamp) {
        const elapsed = Date.now() - timestamp;
        const remaining = Math.max(0, 60 * 60 * 1000 - elapsed);
        const minutes = Math.ceil(remaining / (60 * 1000));
        return `${minutes} 分钟`;
    }
    
    canUseImageUpload() {
        return this.limits.imageUpload.uploads.length < this.limits.imageUpload.maxPerHour;
    }
    
    canUsePDFParse() {
        return this.limits.pdfParse.parsedPages.length < this.limits.pdfParse.maxPagesPerHour;
    }
    
    getRemainingImageUploads() {
        return Math.max(0, this.limits.imageUpload.maxPerHour - this.limits.imageUpload.uploads.length);
    }
    
    getRemainingPDFParses() {
        return Math.max(0, this.limits.pdfParse.maxPagesPerHour - this.limits.pdfParse.parsedPages.length);
    }
}

window.guestModeRestrictions = new GuestModeRestrictions();
window.GuestModeRestrictions = GuestModeRestrictions;

console.log('[GuestMode] 限制模块已加载');
