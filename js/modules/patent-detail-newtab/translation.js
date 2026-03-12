window.PatentDetailTranslation = {
    init: function() {
        const self = this;
        
        window.showTranslateDialogNewTab = function(event, sectionId) {
            self.showDialog(event, sectionId);
        };
        
        window.translateNewTabContent = function(sectionId, targetLang) {
            self.translate(sectionId, targetLang);
        };
        
        window.closeNewTabTranslateDialog = function() {
            self.closeDialog();
        };
        
        window.copyNewTabTranslatedText = function() {
            self.copyTranslated();
        };
    },

    showDialog: function(event, sectionId) {
        event.stopPropagation();
        
        const existingDialog = document.getElementById('translate-dialog');
        if (existingDialog) {
            existingDialog.remove();
        }
        
        const existingOverlay = document.getElementById('translate-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        
        const self = this;
        
        const dialogHTML = `
            <div id="translate-dialog" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); z-index: 10001; min-width: 400px; max-width: 600px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #00bcd4 0%, #009688 100%); color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4a9.267 9.267 0 0 1 .64-1.539 6.7 6.7 0 0 1 .597-.933A7.025 7.025 0 0 0 2.255 4H4.09zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.958 6.958 0 0 0-.656 2.5h2.49zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5H4.847zM8.5 5v2.5h2.99a12.495 12.495 0 0 0-.337-2.5H8.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5H4.51zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5H8.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12H5.145zm.182 2.472a6.696 6.696 0 0 1-.597-.933A9.268 9.268 0 0 1 4.09 12H2.255a7.024 7.024 0 0 0 3.072 2.472zM3.82 11a13.652 13.652 0 0 1-.312-2.5h-2.49A6.95 6.95 0 0 0 1.674 11H3.82zm10.026-2.5a13.65 13.65 0 0 1-.312 2.5h2.146c.22-.765.368-1.608.426-2.5h-2.26zm-1.068 2.5c-.138.386-.295.744-.468 1.068-.552 1.035-1.218 1.65-1.887 1.855V12h2.355zm.182 2.472A6.696 6.696 0 0 0 13.91 12h1.835a7.024 7.024 0 0 1-3.072 2.472zM14.326 11a6.95 6.95 0 0 0 .656-2.5h-2.49c-.03.877-.138-1.718-.312 2.5h2.146z"/></svg>
                        快捷翻译
                    </h3>
                    <button id="translate-close-btn" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 20px; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;">&times;</button>
                </div>
                <div style="padding: 20px;">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #333;">选择目标语言：</label>
                        <select id="translate-target-lang" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px;">
                            <option value="zh">中文</option>
                            <option value="en">英文</option>
                            <option value="ja">日文</option>
                            <option value="ko">韩文</option>
                            <option value="de">德文</option>
                            <option value="fr">法文</option>
                        </select>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button id="translate-start-btn" style="flex: 1; background: linear-gradient(135deg, #00bcd4 0%, #009688 100%); color: white; border: none; padding: 12px 20px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077z"/></svg>
                            开始翻译
                        </button>
                        <button id="translate-cancel-btn" style="background: #f5f5f5; color: #666; border: none; padding: 12px 20px; border-radius: 8px; font-size: 14px; cursor: pointer;">取消</button>
                    </div>
                    <div id="translate-result-container" style="margin-top: 15px; display: none;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-weight: 500; color: #333;">翻译结果：</span>
                            <button id="translate-copy-btn" style="background: #2e7d32; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/></svg>
                                复制
                            </button>
                        </div>
                        <div id="translate-result" style="background: #f5f5f5; padding: 15px; border-radius: 8px; max-height: 300px; overflow-y: auto; white-space: pre-wrap; line-height: 1.6;"></div>
                    </div>
                </div>
            </div>
            <div id="translate-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000;"></div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', dialogHTML);
        
        this.currentSectionId = sectionId;
        
        document.getElementById('translate-close-btn').onclick = function() { self.closeDialog(); };
        document.getElementById('translate-cancel-btn').onclick = function() { self.closeDialog(); };
        document.getElementById('translate-overlay').onclick = function() { self.closeDialog(); };
        document.getElementById('translate-start-btn').onclick = function() {
            var targetLang = document.getElementById('translate-target-lang').value;
            self.translate(sectionId, targetLang);
        };
        document.getElementById('translate-copy-btn').onclick = function() { self.copyTranslated(); };
    },

    closeDialog: function() {
        const dialog = document.getElementById('translate-dialog');
        const overlay = document.getElementById('translate-overlay');
        if (dialog) dialog.remove();
        if (overlay) overlay.remove();
    },

    translate: function(sectionId, targetLang) {
        const section = document.querySelector('[data-section-content="' + sectionId + '"]');
        if (!section) {
            alert('未找到要翻译的内容');
            return;
        }
        
        const textToTranslate = section.textContent.trim();
        if (!textToTranslate) {
            alert('内容为空，无法翻译');
            return;
        }
        
        const resultContainer = document.getElementById('translate-result-container');
        const resultDiv = document.getElementById('translate-result');
        
        resultContainer.style.display = 'block';
        resultDiv.innerHTML = '<div style="text-align: center; padding: 20px;"><div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #00bcd4; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div><style>@keyframes spin { to { transform: rotate(360deg); } }</style><div style="margin-top: 10px; color: #666;">正在翻译...</div></div>';
        
        const langMap = {
            'zh': 'Chinese',
            'en': 'English',
            'ja': 'Japanese',
            'ko': 'Korean',
            'de': 'German',
            'fr': 'French'
        };
        
        const targetLangName = langMap[targetLang] || 'Chinese';
        
        if (window.opener && window.opener.translateText) {
            window.opener.translateText(textToTranslate, targetLangName).then(result => {
                resultDiv.textContent = result;
            }).catch(err => {
                resultDiv.innerHTML = '<div style="color: #d32f2f;">翻译失败: ' + err.message + '</div>';
            });
        } else {
            setTimeout(() => {
                resultDiv.textContent = '[模拟翻译结果]\n\n' + textToTranslate.substring(0, 500) + (textToTranslate.length > 500 ? '...' : '');
            }, 1000);
        }
    },

    copyTranslated: function() {
        const resultDiv = document.getElementById('translate-result');
        if (resultDiv && resultDiv.textContent) {
            navigator.clipboard.writeText(resultDiv.textContent).then(() => {
                alert('已复制翻译结果');
            }).catch(err => {
                console.error('复制失败:', err);
            });
        }
    }
};
