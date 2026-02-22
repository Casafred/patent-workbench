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
            this.clearAllGuestData();
            this.loadUsageData();
            this.applyAllRestrictions();
            this.setupBeforeUnload();
        }
    }
    
    clearAllGuestData() {
        console.log('[GuestMode] 清空所有游客缓存数据...');
        
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                const lowerKey = key.toLowerCase();
                if (lowerKey.includes('guest') || 
                    lowerKey.includes('cache') ||
                    lowerKey.includes('ocr') ||
                    lowerKey.includes('chat') ||
                    lowerKey.includes('patent') ||
                    lowerKey.includes('conversation') ||
                    lowerKey.includes('persona') ||
                    lowerKey.includes('template') ||
                    lowerKey.includes('history') ||
                    lowerKey.includes('setting') ||
                    lowerKey.includes('config') ||
                    lowerKey.includes('user_')) {
                    keysToRemove.push(key);
                }
            }
        }
        
        keysToRemove.forEach(key => {
            try {
                localStorage.removeItem(key);
            } catch (e) {}
        });
        
        console.log(`[GuestMode] 已清空 ${keysToRemove.length} 项缓存数据`);
        
        if (window.sessionStorage) {
            sessionStorage.clear();
            console.log('[GuestMode] 已清空 sessionStorage');
        }
    }
    
    setupBeforeUnload() {
        window.addEventListener('beforeunload', () => {
            this.clearAllGuestData();
        });
        
        window.addEventListener('pagehide', () => {
            this.clearAllGuestData();
        });
    }
    
    loadUsageData() {
        // 不从localStorage加载，每次都重新开始
        this.limits.imageUpload.uploads = [];
        this.limits.pdfParse.parsedPages = [];
    }
    
    saveUsageData() {
        // 游客模式不保存使用数据到localStorage
        // 使用内存中的数据，页面关闭后自动清空
    }
    
    applyAllRestrictions() {
        if (!this.isGuest) return;
        
        console.log('[GuestMode] 应用游客模式限制');
        
        setTimeout(() => {
            this.disableChatFileUpload();
            this.disableChatSearch();
            this.restrictModelSelectors();
            this.restrictPDFOCRParseMode();
            this.showGuestLimitNotices();
        }, 500);
        
        setTimeout(() => {
            this.restrictPDFOCRParseMode();
            this.showGuestLimitNotices();
        }, 2000);
    }
    
    showGuestLimitNotices() {
        const patentNotice = document.getElementById('guest-patent-limit-notice');
        if (patentNotice) {
            patentNotice.style.display = 'block';
        }
        
        const ocrNotice = document.getElementById('guest-ocr-limit-notice');
        if (ocrNotice) {
            ocrNotice.style.display = 'block';
        }
        
        const patentLimitText = document.getElementById('patent-limit-text');
        if (patentLimitText) {
            patentLimitText.innerHTML = '游客模式每小时最多查询 <strong>5 篇</strong>专利。';
        }
        
        const patentCountDisplay = document.getElementById('patent_count_display');
        if (patentCountDisplay) {
            patentCountDisplay.textContent = '专利号数量：0/5 (游客模式)';
        }
        
        const patentInput = document.getElementById('patent_numbers_input');
        if (patentInput) {
            patentInput.placeholder = '请输入专利号（游客模式最多5个）';
        }
        
        console.log('[GuestMode] 已显示游客限制提示');
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
    
    restrictPDFOCRParseMode() {
        const parseModeSelect = document.getElementById('ocr-parse-mode');
        const pageRangeGroup = document.getElementById('ocr-page-range-group');
        
        if (parseModeSelect) {
            parseModeSelect.innerHTML = '<option value="page">当前页面</option>';
            parseModeSelect.value = 'page';
            parseModeSelect.disabled = true;
            parseModeSelect.style.cursor = 'not-allowed';
            parseModeSelect.style.opacity = '0.7';
            parseModeSelect.title = '游客模式仅支持当前页面解析';
            console.log('[GuestMode] 已限制PDF解析模式为当前页面');
        }
        
        if (pageRangeGroup) {
            pageRangeGroup.style.display = 'none';
        }
        
        const useCacheCheckbox = document.getElementById('ocr-use-cache');
        if (useCacheCheckbox) {
            useCacheCheckbox.checked = false;
            useCacheCheckbox.disabled = true;
            useCacheCheckbox.parentElement.style.opacity = '0.5';
        }
    }
    
    checkImageUpload() {
        const count = this.limits.imageUpload.uploads.length;
        if (count >= this.limits.imageUpload.maxPerHour) {
            const remaining = this.getTimeUntilReset(this.limits.imageUpload.uploads[0]);
            alert(`游客模式限制\n\n图片上传：每小时仅限 ${this.limits.imageUpload.maxPerHour} 张\n\n剩余等待时间：${remaining}`);
            return false;
        }
        this.limits.imageUpload.uploads.push(Date.now());
        return true;
    }
    
    checkPDFParse() {
        const count = this.limits.pdfParse.parsedPages.length;
        if (count >= this.limits.pdfParse.maxPagesPerHour) {
            const remaining = this.getTimeUntilReset(this.limits.pdfParse.parsedPages[0]);
            alert(`游客模式限制\n\nPDF解析：每小时仅限 ${this.limits.pdfParse.maxPagesPerHour} 页\n\n剩余等待时间：${remaining}`);
            return false;
        }
        this.limits.pdfParse.parsedPages.push(Date.now());
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
    
    recordPDFParse() {
        this.limits.pdfParse.parsedPages.push(Date.now());
    }
}

window.guestModeRestrictions = new GuestModeRestrictions();
window.GuestModeRestrictions = GuestModeRestrictions;

console.log('[GuestMode] 限制模块已加载');
