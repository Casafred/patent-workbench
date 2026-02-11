// js/modules/patent-batch/cache-confirm-modal.js
// 专利缓存确认弹窗组件

const CacheConfirmModal = {
    modalId: 'cache_confirm_modal',
    
    /**
     * 初始化弹窗（如果不存在则创建）
     */
    init() {
        if (document.getElementById(this.modalId)) {
            return;
        }

        const modalHTML = `
            <div id="${this.modalId}" class="modal cache-confirm-modal" style="display: none;">
                <div class="modal-content" style="max-width: 600px; max-height: 80vh;">
                    <div class="modal-header">
                        <h3 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16" style="color: var(--primary-color);">
                                <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
                            </svg>
                            发现缓存数据
                        </h3>
                        <button class="close-modal" onclick="CacheConfirmModal.close()" style="position: absolute; right: 15px; top: 15px; background: rgba(255, 255, 255, 0.9); border: 1px solid #ddd; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 20px; color: #666; transition: all 0.3s;" onmouseover="this.style.background='#f44336'; this.style.color='white'; this.style.borderColor='#f44336';" onmouseout="this.style.background='rgba(255, 255, 255, 0.9)'; this.style.color='#666'; this.style.borderColor='#ddd';" title="关闭">&times;</button>
                    </div>
                    <div class="modal-body" id="cache_confirm_body">
                        <!-- 动态内容 -->
                    </div>
                    <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 10px; padding: 15px; border-top: 1px solid #eee;">
                        <button id="cache_confirm_use_all" class="small-button primary-btn">
                            全部使用缓存
                        </button>
                        <button id="cache_confirm_refresh_all" class="small-button">
                            全部重新爬取
                        </button>
                        <button id="cache_confirm_cancel" class="small-button delete-button">
                            取消
                        </button>
                    </div>
                </div>
            </div>
        `;

        // 插入到 body 末尾
        const div = document.createElement('div');
        div.innerHTML = modalHTML;
        document.body.appendChild(div.firstElementChild);

        // 绑定关闭事件
        const modal = document.getElementById(this.modalId);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.close();
            }
        });

        // ESC 键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen()) {
                this.close();
            }
        });
    },

    /**
     * 显示缓存确认弹窗
     * @param {Object} cacheStatus - 缓存状态对象
     * @param {Function} onConfirm - 确认回调 (useCache: boolean, selectedPatents: Object)
     * @param {Function} onCancel - 取消回调
     */
    show(cacheStatus, onConfirm, onCancel) {
        this.init();

        const modal = document.getElementById(this.modalId);
        const body = document.getElementById('cache_confirm_body');
        
        const { cached, notCached, details } = cacheStatus;
        const oldCached = cached.filter(num => details[num].isOld);
        const freshCached = cached.filter(num => !details[num].isOld);

        // 构建内容
        let contentHTML = `
            <div class="cache-summary" style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; text-align: center;">
                    <div>
                        <div style="font-size: 24px; font-weight: bold; color: var(--primary-color);">${cached.length}</div>
                        <div style="font-size: 12px; color: #666;">有缓存</div>
                    </div>
                    <div>
                        <div style="font-size: 24px; font-weight: bold; color: #28a745;">${freshCached.length}</div>
                        <div style="font-size: 12px; color: #666;">缓存较新</div>
                    </div>
                    <div>
                        <div style="font-size: 24px; font-weight: bold; color: #ffc107;">${notCached.length}</div>
                        <div style="font-size: 12px; color: #666;">无缓存</div>
                    </div>
                </div>
            </div>
        `;

        // 有缓存的专利列表
        if (cached.length > 0) {
            contentHTML += `
                <div class="cache-list-section" style="margin-bottom: 20px;">
                    <h4 style="margin: 0 0 10px 0; display: flex; align-items: center; gap: 8px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="color: var(--primary-color);">
                            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                            <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/>
                        </svg>
                        有缓存的专利 (${cached.length}个)
                    </h4>
                    <div class="cache-list" style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; border-radius: 6px;">
            `;

            cached.forEach((num, index) => {
                const detail = details[num];
                const isOld = detail.isOld;
                const cacheTime = PatentCache.formatCacheTime(detail.timestamp);
                
                contentHTML += `
                    <div class="cache-item" style="display: flex; align-items: center; padding: 10px; ${index !== cached.length - 1 ? 'border-bottom: 1px solid #eee;' : ''} ${isOld ? 'background: #fff3cd;' : ''}">
                        <input type="checkbox" class="cache-item-checkbox" data-patent="${num}" checked style="margin-right: 10px; width: 16px; height: 16px; cursor: pointer;">
                        <div style="flex: 1;">
                            <div style="font-weight: 500;">${num}</div>
                            <div style="font-size: 12px; color: #666; display: flex; align-items: center; gap: 5px;">
                                <span>缓存于: ${cacheTime}</span>
                                ${isOld ? '<span style="color: #856404; background: #ffeeba; padding: 2px 6px; border-radius: 3px; font-size: 11px;">较旧</span>' : '<span style="color: #155724; background: #d4edda; padding: 2px 6px; border-radius: 3px; font-size: 11px;">较新</span>'}
                            </div>
                        </div>
                        <button class="cache-refresh-btn small-button" data-patent="${num}" style="padding: 4px 8px; font-size: 12px;">
                            重新爬取
                        </button>
                    </div>
                `;
            });

            contentHTML += `
                    </div>
                    <div style="margin-top: 8px; display: flex; gap: 10px;">
                        <button class="small-button" onclick="CacheConfirmModal.selectAll(true)" style="padding: 4px 10px; font-size: 12px;">全选</button>
                        <button class="small-button" onclick="CacheConfirmModal.selectAll(false)" style="padding: 4px 10px; font-size: 12px;">全不选</button>
                        <button class="small-button" onclick="CacheConfirmModal.selectOldOnly()" style="padding: 4px 10px; font-size: 12px;">只选较旧的</button>
                    </div>
                </div>
            `;
        }

        // 无缓存的专利列表
        if (notCached.length > 0) {
            contentHTML += `
                <div class="no-cache-list-section">
                    <h4 style="margin: 0 0 10px 0; display: flex; align-items: center; gap: 8px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="color: #6c757d;">
                            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                        </svg>
                        需要爬取的专利 (${notCached.length}个)
                    </h4>
                    <div class="no-cache-list" style="max-height: 100px; overflow-y: auto; padding: 10px; background: #f8f9fa; border-radius: 6px; font-size: 13px; color: #666;">
                        ${notCached.join(', ')}
                    </div>
                </div>
            `;
        }

        // 提示信息
        if (oldCached.length > 0) {
            contentHTML += `
                <div class="cache-warning" style="margin-top: 15px; padding: 10px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; display: flex; align-items: center; gap: 10px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16" style="color: #856404; flex-shrink: 0;">
                        <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                    </svg>
                    <span style="font-size: 13px; color: #856404;">
                        有 ${oldCached.length} 个专利的缓存数据超过7天，建议重新爬取以获取最新数据
                    </span>
                </div>
            `;
        }

        body.innerHTML = contentHTML;

        // 绑定按钮事件
        document.getElementById('cache_confirm_use_all').onclick = () => {
            const selected = this.getSelectedPatents();
            onConfirm && onConfirm(true, selected);
            this.close();
        };

        document.getElementById('cache_confirm_refresh_all').onclick = () => {
            onConfirm && onConfirm(false, { useCache: [], refresh: [...cached, ...notCached] });
            this.close();
        };

        document.getElementById('cache_confirm_cancel').onclick = () => {
            onCancel && onCancel();
            this.close();
        };

        // 绑定单个重新爬取按钮
        body.querySelectorAll('.cache-refresh-btn').forEach(btn => {
            btn.onclick = (e) => {
                const patent = e.target.dataset.patent;
                const checkbox = body.querySelector(`input[data-patent="${patent}"]`);
                if (checkbox) {
                    checkbox.checked = false;
                    e.target.textContent = '将重新爬取';
                    e.target.disabled = true;
                    e.target.style.opacity = '0.6';
                }
            };
        });

        // 显示弹窗
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    },

    /**
     * 获取用户选择的专利
     * @returns {Object} { useCache: [], refresh: [] }
     */
    getSelectedPatents() {
        const body = document.getElementById('cache_confirm_body');
        const checkboxes = body.querySelectorAll('.cache-item-checkbox');
        
        const useCache = [];
        const refresh = [];

        checkboxes.forEach(cb => {
            const patent = cb.dataset.patent;
            if (cb.checked) {
                useCache.push(patent);
            } else {
                refresh.push(patent);
            }
        });

        // 无缓存的专利默认需要爬取
        const noCacheSection = body.querySelector('.no-cache-list');
        if (noCacheSection) {
            const noCacheText = noCacheSection.textContent;
            // 从文本中提取专利号
            const noCachePatents = noCacheText.split(',').map(s => s.trim()).filter(s => s);
            refresh.push(...noCachePatents);
        }

        return { useCache, refresh };
    },

    /**
     * 全选/全不选
     * @param {boolean} checked - 是否选中
     */
    selectAll(checked) {
        const body = document.getElementById('cache_confirm_body');
        body.querySelectorAll('.cache-item-checkbox').forEach(cb => {
            cb.checked = checked;
        });
        body.querySelectorAll('.cache-refresh-btn').forEach(btn => {
            btn.textContent = checked ? '重新爬取' : '将重新爬取';
            btn.disabled = !checked;
            btn.style.opacity = checked ? '1' : '0.6';
        });
    },

    /**
     * 只选择较旧的缓存
     */
    selectOldOnly() {
        const body = document.getElementById('cache_confirm_body');
        const cacheItems = body.querySelectorAll('.cache-item');
        
        cacheItems.forEach(item => {
            const isOld = item.style.background.includes('fff3cd');
            const checkbox = item.querySelector('.cache-item-checkbox');
            const btn = item.querySelector('.cache-refresh-btn');
            
            checkbox.checked = isOld;
            btn.textContent = isOld ? '重新爬取' : '将重新爬取';
            btn.disabled = !isOld;
            btn.style.opacity = isOld ? '1' : '0.6';
        });
    },

    /**
     * 关闭弹窗
     */
    close() {
        const modal = document.getElementById(this.modalId);
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
    },

    /**
     * 检查弹窗是否打开
     * @returns {boolean}
     */
    isOpen() {
        const modal = document.getElementById(this.modalId);
        return modal && modal.style.display !== 'none';
    }
};

// 导出模块
window.CacheConfirmModal = CacheConfirmModal;