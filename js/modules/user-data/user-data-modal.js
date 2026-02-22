/**
 * 用户数据管理弹窗组件
 * 负责导出/导入选项弹窗、进度显示
 */

class UserDataModal {
    constructor() {
        this.activeOverlay = null;
        this.activeModal = null;
        this._selectedFile = null;
        this._stylesInjected = false;
    }

    _injectStyles() {
        if (this._stylesInjected) return;
        this._stylesInjected = true;

        const style = document.createElement('style');
        style.id = 'user-data-modal-styles';
        style.textContent = `
            .udm-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 100000;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .udm-modal {
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                width: 450px;
                max-width: 90vw;
                max-height: 80vh;
                overflow: hidden;
                font-family: 'Noto Sans SC', sans-serif;
            }
            .udm-header {
                padding: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                color: white;
                background: linear-gradient(135deg, #16A34A 0%, #22C55E 100%);
            }
            .udm-header h2 {
                margin: 0;
                font-size: 18px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .udm-close {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                flex-shrink: 0;
            }
            .udm-close:hover { background: rgba(255, 255, 255, 0.3); }
            .udm-body {
                padding: 20px;
                max-height: 60vh;
                overflow-y: auto;
            }
            .udm-preview {
                background: #f0fdf4;
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 16px;
                font-size: 13px;
                color: #166534;
                border: 1px solid #bbf7d0;
            }
            .udm-option-group { margin-bottom: 16px; }
            .udm-option-group > label {
                display: block;
                font-weight: 500;
                margin-bottom: 8px;
                color: #333;
            }
            .udm-option-item {
                display: flex;
                flex-direction: row;
                align-items: flex-start;
                padding: 12px;
                background: #f9f9f9;
                border-radius: 8px;
                margin-bottom: 8px;
                cursor: pointer;
                transition: background 0.2s;
                text-align: left;
            }
            .udm-option-item:hover { background: #f0fdf4; border: 1px solid #bbf7d0; }
            .udm-option-item input[type="radio"] {
                margin-right: 12px;
                margin-top: 3px;
                flex-shrink: 0;
                accent-color: #16A34A;
            }
            .udm-option-text {
                flex: 1;
                min-width: 0;
                text-align: left;
            }
            .udm-option-name {
                font-weight: 500;
                color: #333;
                display: block;
            }
            .udm-option-desc {
                font-size: 12px;
                color: #666;
                margin-top: 4px;
                display: block;
            }
            .udm-checkbox { margin: 16px 0; }
            .udm-checkbox label {
                display: flex;
                flex-direction: row;
                align-items: center;
                padding: 8px 0;
                cursor: pointer;
                text-align: left;
            }
            .udm-checkbox input[type="checkbox"] {
                margin-right: 10px;
                accent-color: #16A34A;
            }
            .udm-warning {
                background: #fef3c7;
                border: 1px solid #fcd34d;
                border-radius: 8px;
                padding: 10px;
                margin-top: 16px;
                font-size: 12px;
                color: #92400e;
            }
            .udm-footer {
                padding: 16px 20px;
                border-top: 1px solid #eee;
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }
            .udm-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s;
                display: inline-flex;
                align-items: center;
                gap: 6px;
            }
            .udm-btn-cancel {
                background: #f0f0f0;
                color: #666;
            }
            .udm-btn-cancel:hover { background: #e5e5e5; }
            .udm-btn-primary {
                background: linear-gradient(135deg, #16A34A 0%, #22C55E 100%);
                color: white;
            }
            .udm-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
            .udm-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
            .udm-file-drop {
                border: 2px dashed #d1d5db;
                border-radius: 12px;
                padding: 30px;
                text-align: center;
                cursor: pointer;
                transition: all 0.2s;
                margin-bottom: 16px;
            }
            .udm-file-drop:hover { border-color: #16A34A; background: #f0fdf4; }
            .udm-file-drop.dragover { border-color: #16A34A; background: #dcfce7; }
            .udm-file-drop-icon { width: 40px; height: 40px; margin: 0 auto 10px; color: #666; display: block; }
            .udm-file-drop-text { color: #666; font-size: 14px; }
            .udm-file-drop-hint { color: #999; font-size: 12px; margin-top: 8px; }
            .udm-file-input { display: none; }
            .udm-file-info {
                background: #f0fdf4;
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 16px;
                border: 1px solid #bbf7d0;
            }
            .udm-filename { font-weight: 500; color: #166534; }
            .udm-file-meta { font-size: 12px; color: #666; margin-top: 4px; }
            .udm-diff {
                background: #f9fafb;
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 16px;
                border: 1px solid #e5e7eb;
            }
            .udm-diff h4 { margin: 0 0 8px; font-size: 14px; color: #333; }
            .udm-diff-item {
                display: flex;
                justify-content: space-between;
                padding: 4px 0;
                font-size: 13px;
            }
            .udm-diff-label { color: #666; }
            .udm-diff-value { font-weight: 500; }
            .udm-diff-value.added { color: #16A34A; }
            .udm-diff-value.updated { color: #2563eb; }
            .udm-progress {
                height: 4px;
                background: #e5e7eb;
                border-radius: 2px;
                overflow: hidden;
                margin-top: 16px;
            }
            .udm-progress-bar {
                height: 100%;
                background: linear-gradient(135deg, #16A34A 0%, #22C55E 100%);
                transition: width 0.3s;
                width: 0%;
            }
            .udm-progress-text {
                font-size: 12px;
                color: #666;
                text-align: center;
                margin-top: 8px;
            }
        `;
        document.head.appendChild(style);
    }

    showExportModal() {
        this._closeActiveModal();
        this._injectStyles();

        const preview = window.userCacheExporter.preview();
        if (!preview.success) {
            alert('获取数据预览失败: ' + preview.error);
            return;
        }

        const overlay = document.createElement('div');
        overlay.className = 'udm-overlay';
        overlay.onclick = (e) => {
            if (e.target === overlay) this.closeModal();
        };

        const modal = document.createElement('div');
        modal.className = 'udm-modal';
        modal.innerHTML = this._getExportModalHTML(preview.preview);

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        this.activeOverlay = overlay;
        this.activeModal = modal;

        this._bindExportEvents();
    }

    _getExportModalHTML(preview) {
        const exportOptions = window.userCacheExporter.getExportOptions();
        return `
            <div class="udm-header">
                <h2>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    导出数据
                </h2>
                <button class="udm-close" data-action="close">&times;</button>
            </div>
            <div class="udm-body">
                <div class="udm-preview">
                    <strong>数据预览:</strong> 共 ${preview.totalItems} 项，约 ${preview.totalSize}
                </div>
                <div class="udm-option-group">
                    <label>导出选项:</label>
                    ${exportOptions.map((opt, index) => `
                        <div class="udm-option-item" data-option="${opt.id}">
                            <input type="radio" name="export-option" value="${opt.id}" ${index === 0 ? 'checked' : ''}>
                            <div class="udm-option-text">
                                <span class="udm-option-name">${opt.name}</span>
                                <span class="udm-option-desc">${opt.description}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="udm-checkbox">
                    <label>
                        <input type="checkbox" id="include-large-cache" checked>
                        <span>包含大型缓存数据（专利缓存、OCR结果等）</span>
                    </label>
                </div>
                <div class="udm-warning">
                    提示: API密钥等敏感信息不会导出
                </div>
            </div>
            <div class="udm-footer">
                <button class="udm-btn udm-btn-cancel" data-action="close">取消</button>
                <button class="udm-btn udm-btn-primary" data-action="export">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    导出
                </button>
            </div>
        `;
    }

    _bindExportEvents() {
        const modal = this.activeModal;

        modal.querySelectorAll('[data-action="close"]').forEach(btn => {
            btn.onclick = () => this.closeModal();
        });

        modal.querySelectorAll('.udm-option-item').forEach(item => {
            item.onclick = () => {
                const radio = item.querySelector('input[type="radio"]');
                if (radio) radio.checked = true;
            };
        });

        modal.querySelector('[data-action="export"]').onclick = () => this._executeExport();

        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }

    _executeExport() {
        const modal = this.activeModal;
        const selectedOption = modal.querySelector('input[name="export-option"]:checked')?.value || 'all';
        const includeLargeCache = modal.querySelector('#include-large-cache')?.checked ?? true;

        const exportOptions = window.userCacheExporter.getExportOptions();
        const option = exportOptions.find(o => o.id === selectedOption);

        const options = {
            include: option?.types || null,
            includeLargeCache: includeLargeCache && option?.includeLargeCache !== false
        };

        const result = window.userCacheExporter.export(options);

        if (result.success) {
            this.closeModal();
            alert(`导出成功！\n\n文件: ${result.filename}\n数据项: ${result.stats.totalItems}\n大小: ${result.stats.totalSize}`);
        } else {
            alert('导出失败: ' + result.error);
        }
    }

    showImportModal() {
        this._closeActiveModal();
        this._injectStyles();

        const overlay = document.createElement('div');
        overlay.className = 'udm-overlay';
        overlay.onclick = (e) => {
            if (e.target === overlay) this.closeModal();
        };

        const modal = document.createElement('div');
        modal.className = 'udm-modal';
        modal.innerHTML = this._getImportModalHTML();

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        this.activeOverlay = overlay;
        this.activeModal = modal;

        this._bindImportEvents();
    }

    _getImportModalHTML() {
        const strategies = window.userCacheMerger.getStrategies();
        return `
            <div class="udm-header">
                <h2>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    导入数据
                </h2>
                <button class="udm-close" data-action="close">&times;</button>
            </div>
            <div class="udm-body">
                <div class="udm-file-drop" id="import-file-drop">
                    <svg class="udm-file-drop-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="12" y1="18" x2="12" y2="12"></line>
                        <line x1="9" y1="15" x2="15" y2="15"></line>
                    </svg>
                    <div class="udm-file-drop-text">点击选择文件或拖拽文件到此处</div>
                    <div class="udm-file-drop-hint">支持 .json 格式，最大 50MB</div>
                </div>
                <input type="file" id="import-file-input" class="udm-file-input" accept=".json">
                
                <div class="udm-file-info" id="import-file-info" style="display:none;">
                    <div class="udm-filename" id="import-filename"></div>
                    <div class="udm-file-meta" id="import-file-meta"></div>
                </div>
                
                <div class="udm-diff" id="import-diff" style="display:none;">
                    <h4>数据对比</h4>
                    <div id="diff-content"></div>
                </div>
                
                <div class="udm-option-group">
                    <label>合并策略:</label>
                    ${strategies.map((s, index) => `
                        <div class="udm-option-item" data-strategy="${s.id}">
                            <input type="radio" name="merge-strategy" value="${s.id}" ${index === 0 ? 'checked' : ''}>
                            <div class="udm-option-text">
                                <span class="udm-option-name">${s.name}</span>
                                <span class="udm-option-desc">${s.description}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="udm-progress" id="import-progress" style="display:none;">
                    <div class="udm-progress-bar" id="import-progress-bar"></div>
                </div>
                <div class="udm-progress-text" id="import-progress-text" style="display:none;">准备导入...</div>
            </div>
            <div class="udm-footer">
                <button class="udm-btn udm-btn-cancel" data-action="close">取消</button>
                <button class="udm-btn udm-btn-primary" id="import-btn" data-action="import" disabled>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    导入
                </button>
            </div>
        `;
    }

    _bindImportEvents() {
        const modal = this.activeModal;
        const fileDrop = modal.querySelector('#import-file-drop');
        const fileInput = modal.querySelector('#import-file-input');

        modal.querySelectorAll('[data-action="close"]').forEach(btn => {
            btn.onclick = () => this.closeModal();
        });

        modal.querySelectorAll('.udm-option-item[data-strategy]').forEach(item => {
            item.onclick = () => {
                const radio = item.querySelector('input[type="radio"]');
                if (radio) radio.checked = true;
            };
        });

        modal.querySelector('[data-action="import"]').onclick = () => this._executeImport();

        fileDrop.onclick = () => fileInput.click();

        fileDrop.ondragover = (e) => {
            e.preventDefault();
            fileDrop.classList.add('dragover');
        };

        fileDrop.ondragleave = () => {
            fileDrop.classList.remove('dragover');
        };

        fileDrop.ondrop = (e) => {
            e.preventDefault();
            fileDrop.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                this._handleFileSelect(e.dataTransfer.files[0]);
            }
        };

        fileInput.onchange = (e) => {
            if (e.target.files.length > 0) {
                this._handleFileSelect(e.target.files[0]);
            }
        };

        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }

    async _handleFileSelect(file) {
        const modal = this.activeModal;
        const fileInfo = modal.querySelector('#import-file-info');
        const filename = modal.querySelector('#import-filename');
        const fileMeta = modal.querySelector('#import-file-meta');
        const diffDiv = modal.querySelector('#import-diff');
        const diffContent = modal.querySelector('#diff-content');
        const importBtn = modal.querySelector('#import-btn');

        fileInfo.style.display = 'block';
        filename.textContent = file.name;
        fileMeta.textContent = `大小: ${(file.size / 1024).toFixed(2)} KB`;

        const preview = await window.userCacheImporter.preview(file);

        if (!preview.success) {
            diffDiv.style.display = 'block';
            diffContent.innerHTML = `<div style="color: #EF4444;">预览失败: ${preview.error}</div>`;
            importBtn.disabled = true;
            return;
        }

        diffDiv.style.display = 'block';
        const analysis = preview.preview.analysis;

        diffContent.innerHTML = `
            <div class="udm-diff-item">
                <span class="udm-diff-label">导出用户:</span>
                <span class="udm-diff-value">${preview.preview.exportUsername} ${preview.preview.usernameMatch ? '匹配' : '不匹配'}</span>
            </div>
            <div class="udm-diff-item">
                <span class="udm-diff-label">导出时间:</span>
                <span class="udm-diff-value">${new Date(preview.preview.exportTime).toLocaleString()}</span>
            </div>
            <div class="udm-diff-item">
                <span class="udm-diff-label">新增数据:</span>
                <span class="udm-diff-value added">+${analysis.summary.added}</span>
            </div>
            <div class="udm-diff-item">
                <span class="udm-diff-label">更新数据:</span>
                <span class="udm-diff-value updated">~${analysis.summary.updated}</span>
            </div>
        `;

        importBtn.disabled = false;
        this._selectedFile = file;
    }

    async _executeImport() {
        if (!this._selectedFile) {
            alert('请先选择文件');
            return;
        }

        const modal = this.activeModal;
        const strategy = modal.querySelector('input[name="merge-strategy"]:checked')?.value || 'smart';
        const progressDiv = modal.querySelector('#import-progress');
        const progressBar = modal.querySelector('#import-progress-bar');
        const progressText = modal.querySelector('#import-progress-text');
        const importBtn = modal.querySelector('#import-btn');

        progressDiv.style.display = 'block';
        progressText.style.display = 'block';
        importBtn.disabled = true;

        const result = await window.userCacheImporter.importFromFile(this._selectedFile, {
            strategy,
            onProgress: (percent, message) => {
                progressBar.style.width = `${percent}%`;
                progressText.textContent = message;
            }
        });

        if (result.success) {
            progressBar.style.width = '100%';
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
        this.activeModal = null;
        this._selectedFile = null;
    }
}

const userDataModal = new UserDataModal();

window.UserDataModal = UserDataModal;
window.userDataModal = userDataModal;

console.log('[UserDataModal] 模块已加载');
