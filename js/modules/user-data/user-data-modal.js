/**
 * 用户数据管理弹窗组件
 * 负责导出/导入选项弹窗、进度显示
 */

class UserDataModal {
    constructor() {
        this.activeModal = null;
        this.activeOverlay = null;
    }

    showExportModal() {
        this._closeActiveModal();

        const preview = window.userCacheExporter.preview();
        if (!preview.success) {
            alert('获取数据预览失败: ' + preview.error);
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'user-data-modal-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:100000;';
        overlay.onclick = () => this.closeModal();

        const modal = document.createElement('div');
        modal.id = 'user-data-export-modal';
        modal.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:100001;font-family:\'Noto Sans SC\',sans-serif;';
        
        this._injectExportModalStyles();
        modal.innerHTML = this._getExportModalContent(preview.preview);

        document.body.appendChild(overlay);
        document.body.appendChild(modal);
        this.activeOverlay = overlay;
        this.activeModal = modal;

        this._bindExportModalEvents();
    }

    _injectExportModalStyles() {
        if (document.getElementById('user-data-export-modal-styles')) return;
        const style = document.createElement('style');
        style.id = 'user-data-export-modal-styles';
        style.textContent = `
            #user-data-export-modal .modal-content { background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); width: 450px; max-width: 90vw; max-height: 80vh; overflow: hidden; }
            #user-data-export-modal .modal-header { background: linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%); color: white; padding: 20px; display: flex; justify-content: space-between; align-items: center; }
            #user-data-export-modal .modal-header h2 { margin: 0; font-size: 18px; display: flex; align-items: center; gap: 8px; }
            #user-data-export-modal .close-btn { background: rgba(255,255,255,0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; }
            #user-data-export-modal .modal-body { padding: 20px; max-height: 60vh; overflow-y: auto; }
            #user-data-export-modal .preview-info { background: #f0f9ff; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 13px; color: #0369a1; }
            #user-data-export-modal .option-group { margin-bottom: 16px; }
            #user-data-export-modal .option-group > label { display: block; font-weight: 500; margin-bottom: 8px; color: #333; }
            #user-data-export-modal .option-item { display: flex; align-items: flex-start; padding: 10px; background: #f9f9f9; border-radius: 8px; margin-bottom: 8px; cursor: pointer; transition: background 0.2s; }
            #user-data-export-modal .option-item:hover { background: #f0f0f0; }
            #user-data-export-modal .option-item input { margin-right: 10px; margin-top: 3px; }
            #user-data-export-modal .option-item .option-text { flex: 1; }
            #user-data-export-modal .option-item .option-name { font-weight: 500; color: #333; }
            #user-data-export-modal .option-item .option-desc { font-size: 12px; color: #666; margin-top: 2px; }
            #user-data-export-modal .checkbox-group { margin: 16px 0; }
            #user-data-export-modal .checkbox-item { display: flex; align-items: center; padding: 8px 0; }
            #user-data-export-modal .checkbox-item input { margin-right: 8px; }
            #user-data-export-modal .warning-box { background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 10px; margin-top: 16px; font-size: 12px; color: #856404; }
            #user-data-export-modal .modal-footer { padding: 16px 20px; border-top: 1px solid #eee; display: flex; gap: 10px; justify-content: flex-end; }
            #user-data-export-modal .btn { padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s; display: flex; align-items: center; gap: 6px; }
            #user-data-export-modal .btn-cancel { background: #f0f0f0; color: #666; }
            #user-data-export-modal .btn-export { background: linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%); color: white; }
            #user-data-export-modal .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
            #user-data-export-modal .btn .icon { width: 16px; height: 16px; }
        `;
        document.head.appendChild(style);
    }

    _getExportModalContent(preview) {
        const exportOptions = window.userCacheExporter.getExportOptions();
        return `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        导出数据
                    </h2>
                    <button class="close-btn" onclick="window.userDataModal.closeModal()">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="preview-info">
                        <strong>数据预览:</strong> 共 ${preview.totalItems} 项，约 ${preview.totalSize}
                    </div>
                    
                    <div class="option-group">
                        <label>导出选项:</label>
                        ${exportOptions.map((opt, index) => `
                            <div class="option-item" onclick="window.userDataModal.selectExportOption('${opt.id}')">
                                <input type="radio" name="export-option" value="${opt.id}" ${index === 0 ? 'checked' : ''}>
                                <div class="option-text">
                                    <div class="option-name">${opt.name}</div>
                                    <div class="option-desc">${opt.description}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="checkbox-group">
                        <label class="checkbox-item">
                            <input type="checkbox" id="include-large-cache" checked>
                            包含大型缓存数据（专利缓存、OCR结果等）
                        </label>
                    </div>
                    
                    <div class="warning-box">
                        提示: API密钥等敏感信息不会导出
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-cancel" onclick="window.userDataModal.closeModal()">取消</button>
                    <button class="btn btn-export" onclick="window.userDataModal.executeExport()">
                        <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        导出
                    </button>
                </div>
            </div>
        `;
    }

    _bindExportModalEvents() {
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }

    selectExportOption(optionId) {
        const radios = document.querySelectorAll('input[name="export-option"]');
        radios.forEach(radio => {
            radio.checked = radio.value === optionId;
        });
    }

    executeExport() {
        const selectedOption = document.querySelector('input[name="export-option"]:checked')?.value || 'all';
        const includeLargeCache = document.getElementById('include-large-cache')?.checked ?? true;

        const options = this._getExportOptions(selectedOption, includeLargeCache);
        const result = window.userCacheExporter.export(options);

        if (result.success) {
            this.closeModal();
            alert(`导出成功！\n\n文件: ${result.filename}\n数据项: ${result.stats.totalItems}\n大小: ${result.stats.totalSize}`);
        } else {
            alert('导出失败: ' + result.error);
        }
    }

    _getExportOptions(optionId, includeLargeCache) {
        const exportOptions = window.userCacheExporter.getExportOptions();
        const option = exportOptions.find(o => o.id === optionId);

        return {
            include: option?.types || null,
            includeLargeCache: includeLargeCache && option?.includeLargeCache !== false
        };
    }

    showImportModal() {
        this._closeActiveModal();

        const overlay = document.createElement('div');
        overlay.id = 'user-data-modal-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:100000;';
        overlay.onclick = () => this.closeModal();

        const modal = document.createElement('div');
        modal.id = 'user-data-import-modal';
        modal.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:100001;font-family:\'Noto Sans SC\',sans-serif;';
        
        this._injectImportModalStyles();
        modal.innerHTML = this._getImportModalContent();

        document.body.appendChild(overlay);
        document.body.appendChild(modal);
        this.activeOverlay = overlay;
        this.activeModal = modal;

        this._bindImportModalEvents();
    }

    _injectImportModalStyles() {
        if (document.getElementById('user-data-import-modal-styles')) return;
        const style = document.createElement('style');
        style.id = 'user-data-import-modal-styles';
        style.textContent = `
            #user-data-import-modal .modal-content { background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); width: 450px; max-width: 90vw; max-height: 80vh; overflow: hidden; }
            #user-data-import-modal .modal-header { background: linear-gradient(135deg, #10B981 0%, #34D399 100%); color: white; padding: 20px; display: flex; justify-content: space-between; align-items: center; }
            #user-data-import-modal .modal-header h2 { margin: 0; font-size: 18px; display: flex; align-items: center; gap: 8px; }
            #user-data-import-modal .close-btn { background: rgba(255,255,255,0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; }
            #user-data-import-modal .modal-body { padding: 20px; max-height: 60vh; overflow-y: auto; }
            #user-data-import-modal .file-drop { border: 2px dashed #ccc; border-radius: 12px; padding: 30px; text-align: center; cursor: pointer; transition: all 0.2s; margin-bottom: 16px; }
            #user-data-import-modal .file-drop:hover { border-color: #10B981; background: #f0fdf4; }
            #user-data-import-modal .file-drop.dragover { border-color: #10B981; background: #d1fae5; }
            #user-data-import-modal .file-drop .icon { width: 40px; height: 40px; margin-bottom: 10px; color: #666; }
            #user-data-import-modal .file-drop .text { color: #666; font-size: 14px; }
            #user-data-import-modal .file-drop .hint { color: #999; font-size: 12px; margin-top: 8px; }
            #user-data-import-modal .file-input { display: none; }
            #user-data-import-modal .file-info { background: #f0fdf4; border-radius: 8px; padding: 12px; margin-bottom: 16px; display: none; }
            #user-data-import-modal .file-info.show { display: block; }
            #user-data-import-modal .file-info .filename { font-weight: 500; color: #0369a1; }
            #user-data-import-modal .file-info .file-meta { font-size: 12px; color: #666; margin-top: 4px; }
            #user-data-import-modal .strategy-group { margin-bottom: 16px; }
            #user-data-import-modal .strategy-group > label { display: block; font-weight: 500; margin-bottom: 8px; color: #333; }
            #user-data-import-modal .strategy-item { display: flex; align-items: flex-start; padding: 10px; background: #f9f9f9; border-radius: 8px; margin-bottom: 8px; cursor: pointer; }
            #user-data-import-modal .strategy-item:hover { background: #f0f0f0; }
            #user-data-import-modal .strategy-item input { margin-right: 10px; margin-top: 3px; }
            #user-data-import-modal .strategy-item .strategy-text { flex: 1; }
            #user-data-import-modal .strategy-item .strategy-name { font-weight: 500; color: #333; }
            #user-data-import-modal .strategy-item .strategy-desc { font-size: 12px; color: #666; margin-top: 2px; }
            #user-data-import-modal .diff-preview { background: #f9f9f9; border-radius: 8px; padding: 12px; margin-bottom: 16px; display: none; }
            #user-data-import-modal .diff-preview.show { display: block; }
            #user-data-import-modal .diff-preview h4 { margin: 0 0 8px; font-size: 14px; color: #333; }
            #user-data-import-modal .diff-item { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
            #user-data-import-modal .diff-item .label { color: #666; }
            #user-data-import-modal .diff-item .value { font-weight: 500; }
            #user-data-import-modal .diff-item .value.added { color: #10B981; }
            #user-data-import-modal .diff-item .value.updated { color: #3B82F6; }
            #user-data-import-modal .progress-bar { height: 4px; background: #e5e7eb; border-radius: 2px; overflow: hidden; margin-top: 16px; display: none; }
            #user-data-import-modal .progress-bar.show { display: block; }
            #user-data-import-modal .progress-bar .progress { height: 100%; background: linear-gradient(135deg, #10B981 0%, #34D399 100%); transition: width 0.3s; }
            #user-data-import-modal .progress-text { font-size: 12px; color: #666; text-align: center; margin-top: 8px; display: none; }
            #user-data-import-modal .progress-text.show { display: block; }
            #user-data-import-modal .modal-footer { padding: 16px 20px; border-top: 1px solid #eee; display: flex; gap: 10px; justify-content: flex-end; }
            #user-data-import-modal .btn { padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s; display: flex; align-items: center; gap: 6px; }
            #user-data-import-modal .btn-cancel { background: #f0f0f0; color: #666; }
            #user-data-import-modal .btn-import { background: linear-gradient(135deg, #10B981 0%, #34D399 100%); color: white; }
            #user-data-import-modal .btn:disabled { opacity: 0.5; cursor: not-allowed; }
            #user-data-import-modal .btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
            #user-data-import-modal .btn .icon { width: 16px; height: 16px; }
        `;
        document.head.appendChild(style);
    }

    _getImportModalContent() {
        const strategies = window.userCacheMerger.getStrategies();
        return `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        导入数据
                    </h2>
                    <button class="close-btn" onclick="window.userDataModal.closeModal()">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="file-drop" id="import-file-drop" onclick="document.getElementById('import-file-input').click()">
                        <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="12" y1="18" x2="12" y2="12"></line>
                            <line x1="9" y1="15" x2="15" y2="15"></line>
                        </svg>
                        <div class="text">点击选择文件或拖拽文件到此处</div>
                        <div class="hint">支持 .json 格式，最大 50MB</div>
                    </div>
                    <input type="file" id="import-file-input" class="file-input" accept=".json">
                    
                    <div class="file-info" id="import-file-info">
                        <div class="filename" id="import-filename"></div>
                        <div class="file-meta" id="import-file-meta"></div>
                    </div>
                    
                    <div class="diff-preview" id="import-diff-preview">
                        <h4>数据对比</h4>
                        <div id="diff-content"></div>
                    </div>
                    
                    <div class="strategy-group">
                        <label>合并策略:</label>
                        ${strategies.map((s, index) => `
                            <div class="strategy-item" onclick="window.userDataModal.selectStrategy('${s.id}')">
                                <input type="radio" name="merge-strategy" value="${s.id}" ${index === 0 ? 'checked' : ''}>
                                <div class="strategy-text">
                                    <div class="strategy-name">${s.name}</div>
                                    <div class="strategy-desc">${s.description}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="progress-bar" id="import-progress-bar">
                        <div class="progress" id="import-progress" style="width: 0%"></div>
                    </div>
                    <div class="progress-text" id="import-progress-text">准备导入...</div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-cancel" onclick="window.userDataModal.closeModal()">取消</button>
                    <button class="btn btn-import" id="import-btn" onclick="window.userDataModal.executeImport()" disabled>
                        <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        导入
                    </button>
                </div>
            </div>
        `;
    }

    _bindImportModalEvents() {
        const fileInput = document.getElementById('import-file-input');
        const fileDrop = document.getElementById('import-file-drop');

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this._handleFileSelect(e.target.files[0]);
            }
        });

        fileDrop.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileDrop.classList.add('dragover');
        });

        fileDrop.addEventListener('dragleave', () => {
            fileDrop.classList.remove('dragover');
        });

        fileDrop.addEventListener('drop', (e) => {
            e.preventDefault();
            fileDrop.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                this._handleFileSelect(e.dataTransfer.files[0]);
            }
        });
    }

    async _handleFileSelect(file) {
        const fileInfo = document.getElementById('import-file-info');
        const filename = document.getElementById('import-filename');
        const fileMeta = document.getElementById('import-file-meta');
        const diffPreview = document.getElementById('import-diff-preview');
        const diffContent = document.getElementById('diff-content');
        const importBtn = document.getElementById('import-btn');

        fileInfo.classList.add('show');
        filename.textContent = file.name;
        fileMeta.textContent = `大小: ${(file.size / 1024).toFixed(2)} KB`;

        const preview = await window.userCacheImporter.preview(file);

        if (!preview.success) {
            diffPreview.classList.add('show');
            diffContent.innerHTML = `<div style="color: #EF4444;">预览失败: ${preview.error}</div>`;
            importBtn.disabled = true;
            return;
        }

        diffPreview.classList.add('show');
        const analysis = preview.preview.analysis;

        diffContent.innerHTML = `
            <div class="diff-item">
                <span class="label">导出用户:</span>
                <span class="value">${preview.preview.exportUsername} ${preview.preview.usernameMatch ? '匹配' : '不匹配'}</span>
            </div>
            <div class="diff-item">
                <span class="label">导出时间:</span>
                <span class="value">${new Date(preview.preview.exportTime).toLocaleString()}</span>
            </div>
            <div class="diff-item">
                <span class="label">新增数据:</span>
                <span class="value added">+${analysis.summary.added}</span>
            </div>
            <div class="diff-item">
                <span class="label">更新数据:</span>
                <span class="value updated">~${analysis.summary.updated}</span>
            </div>
        `;

        importBtn.disabled = false;
        this._selectedFile = file;
    }

    selectStrategy(strategyId) {
        const radios = document.querySelectorAll('input[name="merge-strategy"]');
        radios.forEach(radio => {
            radio.checked = radio.value === strategyId;
        });
    }

    async executeImport() {
        if (!this._selectedFile) {
            alert('请先选择文件');
            return;
        }

        const strategy = document.querySelector('input[name="merge-strategy"]:checked')?.value || 'smart';
        const progressBar = document.getElementById('import-progress-bar');
        const progressEl = document.getElementById('import-progress');
        const progressText = document.getElementById('import-progress-text');
        const importBtn = document.getElementById('import-btn');

        progressBar.classList.add('show');
        progressText.classList.add('show');
        importBtn.disabled = true;

        const result = await window.userCacheImporter.importFromFile(this._selectedFile, {
            strategy,
            onProgress: (percent, message) => {
                progressEl.style.width = `${percent}%`;
                progressText.textContent = message;
            }
        });

        if (result.success) {
            progressEl.style.width = '100%';
            progressText.textContent = '导入完成！';

            setTimeout(() => {
                this.closeModal();
                alert(`导入成功！\n\n新增: ${result.stats.added}\n更新: ${result.stats.updated}\n跳过: ${result.stats.skipped}\n保存: ${result.stats.saved}`);

                if (window.userDataUI) {
                    window.userDataUI._loadStats();
                }
            }, 500);
        } else {
            progressText.textContent = '导入失败';
            alert('导入失败: ' + result.error);
            importBtn.disabled = false;
        }
    }

    closeModal() {
        this._closeActiveModal();
    }

    _closeActiveModal() {
        if (this.activeOverlay) {
            this.activeOverlay.remove();
            this.activeOverlay = null;
        }
        if (this.activeModal) {
            this.activeModal.remove();
            this.activeModal = null;
        }
        this._selectedFile = null;
    }
}

const userDataModal = new UserDataModal();

window.UserDataModal = UserDataModal;
window.userDataModal = userDataModal;

console.log('[UserDataModal] 模块已加载');
