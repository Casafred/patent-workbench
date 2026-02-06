/**
 * Drawing Reprocess Manager
 * 
 * Manages independent reprocessing modes for Feature 8:
 * 1. Reprocess specification only (reuse OCR cache)
 * 2. Reprocess drawings only (reuse specification cache)
 */

class DrawingReprocessManager {
    constructor() {
        this.cacheManager = new DrawingCacheManager();
        this.currentState = {
            hasOCRCache: false,
            hasSpecCache: false,
            ocrCacheKeys: [],
            specReferenceMap: null,
            lastSpecification: null,
            lastDrawings: []
        };
    }

    /**
     * Update current state based on processing results
     * @param {Object} result - Processing result from API
     * @param {string} specification - Specification text
     * @param {Array} drawings - Drawing files
     */
    updateState(result, specification, drawings) {
        // Extract cache keys from result
        const cacheKeys = [];
        if (result.cache_info) {
            for (const [fileName, info] of Object.entries(result.cache_info)) {
                if (info.cache_key) {
                    cacheKeys.push(info.cache_key);
                }
            }
        }

        // Update state
        this.currentState = {
            hasOCRCache: cacheKeys.length > 0,
            hasSpecCache: result.reference_map && Object.keys(result.reference_map).length > 0,
            ocrCacheKeys: cacheKeys,
            specReferenceMap: result.reference_map,
            lastSpecification: specification,
            lastDrawings: drawings
        };

        console.log('[DrawingReprocessManager] State updated:', this.currentState);
    }

    /**
     * Check if reprocess buttons should be shown
     * @returns {Object} Button visibility state
     */
    getButtonVisibility() {
        return {
            showReprocessSpec: this.currentState.hasOCRCache,
            showReprocessDrawings: this.currentState.hasSpecCache
        };
    }

    /**
     * Reprocess specification only (use cached OCR results)
     * @param {string} newSpecification - New specification text
     * @param {boolean} aiMode - Use AI mode
     * @param {string} modelName - AI model name
     * @param {string} customPrompt - Custom prompt (optional)
     * @returns {Promise<Object>} Processing result
     */
    async reprocessSpecification(newSpecification, aiMode = false, modelName = null, customPrompt = null) {
        if (!this.currentState.hasOCRCache) {
            throw new Error('No OCR cache available. Please process drawings first.');
        }

        if (!newSpecification || newSpecification.trim() === '') {
            throw new Error('Specification text is required.');
        }

        // Show confirmation dialog
        const confirmed = await this.showReprocessConfirmDialog(
            'reprocess-spec',
            {
                ocrCount: this.currentState.ocrCacheKeys.length,
                specMarkerCount: this.currentState.specReferenceMap ? 
                    Object.keys(this.currentState.specReferenceMap).length : 0
            }
        );

        if (!confirmed) {
            return null;
        }

        // Show progress
        this.showProgress('正在重新处理说明书...');

        try {
            const response = await fetch('/api/drawing-marker/reprocess-specification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': localStorage.getItem('api_key') || ''
                },
                body: JSON.stringify({
                    cache_keys: this.currentState.ocrCacheKeys,
                    specification: newSpecification,
                    ai_mode: aiMode,
                    model_name: modelName,
                    custom_prompt: customPrompt
                })
            });

            const result = await response.json();

            this.hideProgress();

            if (!result.success) {
                throw new Error(result.error || '处理失败');
            }

            // Update state
            this.currentState.lastSpecification = newSpecification;
            this.currentState.specReferenceMap = result.data.reference_map;

            return result.data;

        } catch (error) {
            this.hideProgress();
            throw error;
        }
    }

    /**
     * Reprocess drawings only (use cached specification parsing)
     * @param {Array} newDrawings - New drawing files
     * @returns {Promise<Object>} Processing result
     */
    async reprocessDrawings(newDrawings) {
        if (!this.currentState.hasSpecCache) {
            throw new Error('No specification cache available. Please process specification first.');
        }

        if (!newDrawings || newDrawings.length === 0) {
            throw new Error('Drawing files are required.');
        }

        // Show confirmation dialog
        const confirmed = await this.showReprocessConfirmDialog(
            'reprocess-drawings',
            {
                drawingCount: newDrawings.length,
                specMarkerCount: Object.keys(this.currentState.specReferenceMap).length
            }
        );

        if (!confirmed) {
            return null;
        }

        // Show progress
        this.showProgress('正在重新识别图片标号...');

        try {
            // Convert drawings to base64
            const drawingsData = await Promise.all(
                newDrawings.map(file => this.fileToBase64(file))
            );

            const response = await fetch('/api/drawing-marker/reprocess-drawings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': localStorage.getItem('api_key') || ''
                },
                body: JSON.stringify({
                    drawings: drawingsData,
                    reference_map: this.currentState.specReferenceMap
                })
            });

            const result = await response.json();

            this.hideProgress();

            if (!result.success) {
                throw new Error(result.error || '处理失败');
            }

            // Update state
            this.currentState.lastDrawings = newDrawings;
            this.currentState.ocrCacheKeys = result.data.drawings.map(d => d.cache_key);

            return result.data;

        } catch (error) {
            this.hideProgress();
            throw error;
        }
    }

    /**
     * Show reprocess confirmation dialog
     * @param {string} mode - 'reprocess-spec' or 'reprocess-drawings'
     * @param {Object} info - Cache info
     * @returns {Promise<boolean>} User confirmation
     */
    async showReprocessConfirmDialog(mode, info) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'reprocess-confirm-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.7);
                z-index: 10001;
                display: flex;
                justify-content: center;
                align-items: center;
            `;

            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background-color: white;
                border-radius: 12px;
                padding: 30px;
                max-width: 500px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                animation: slideIn 0.3s ease-out;
            `;

            let title, description, cacheInfo;

            if (mode === 'reprocess-spec') {
                title = '🔄 重新处理说明书';
                description = '将使用已缓存的OCR识别结果，重新解析说明书并匹配标记。';
                cacheInfo = `
                    <p style="margin: 5px 0; color: #666;">
                        <strong>缓存的OCR结果：</strong>${info.ocrCount} 张图片
                    </p>
                    <p style="margin: 5px 0; color: #666;">
                        <strong>当前说明书标记：</strong>${info.specMarkerCount} 个
                    </p>
                `;
            } else {
                title = '🔄 重新识别图片标号';
                description = '将使用已缓存的说明书解析结果，重新OCR识别图片标记。';
                cacheInfo = `
                    <p style="margin: 5px 0; color: #666;">
                        <strong>新上传图片：</strong>${info.drawingCount} 张
                    </p>
                    <p style="margin: 5px 0; color: #666;">
                        <strong>缓存的说明书标记：</strong>${info.specMarkerCount} 个
                    </p>
                `;
            }

            dialog.innerHTML = `
                <style>
                    @keyframes slideIn {
                        from {
                            transform: translateY(-50px);
                            opacity: 0;
                        }
                        to {
                            transform: translateY(0);
                            opacity: 1;
                        }
                    }
                </style>
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 48px; margin-bottom: 10px;">🔄</div>
                    <h2 style="margin: 0; color: #333; font-size: 24px;">${title}</h2>
                </div>
                
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                        ${description}
                    </p>
                    ${cacheInfo}
                </div>
                
                <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 4px solid #2196F3; margin-bottom: 20px;">
                    <p style="margin: 0; color: #1565C0; font-size: 14px; line-height: 1.6;">
                        <strong>💡 提示：</strong>此操作将复用缓存数据，处理速度更快。确保缓存内容符合预期。
                    </p>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button class="cancel-btn" style="
                        flex: 1;
                        padding: 12px 24px;
                        background-color: #9E9E9E;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        font-size: 16px;
                        font-weight: bold;
                        cursor: pointer;
                        transition: all 0.2s;
                    ">
                        取消
                    </button>
                    <button class="confirm-btn" style="
                        flex: 1;
                        padding: 12px 24px;
                        background-color: #2196F3;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        font-size: 16px;
                        font-weight: bold;
                        cursor: pointer;
                        transition: all 0.2s;
                    ">
                        确认
                    </button>
                </div>
            `;

            modal.appendChild(dialog);
            document.body.appendChild(modal);

            // Button hover effects
            const cancelBtn = dialog.querySelector('.cancel-btn');
            const confirmBtn = dialog.querySelector('.confirm-btn');

            cancelBtn.addEventListener('mouseenter', () => {
                cancelBtn.style.backgroundColor = '#757575';
                cancelBtn.style.transform = 'scale(1.05)';
            });
            cancelBtn.addEventListener('mouseleave', () => {
                cancelBtn.style.backgroundColor = '#9E9E9E';
                cancelBtn.style.transform = 'scale(1)';
            });

            confirmBtn.addEventListener('mouseenter', () => {
                confirmBtn.style.backgroundColor = '#1976D2';
                confirmBtn.style.transform = 'scale(1.05)';
            });
            confirmBtn.addEventListener('mouseleave', () => {
                confirmBtn.style.backgroundColor = '#2196F3';
                confirmBtn.style.transform = 'scale(1)';
            });

            // Button click handlers
            cancelBtn.addEventListener('click', () => {
                modal.remove();
                resolve(false);
            });

            confirmBtn.addEventListener('click', () => {
                modal.remove();
                resolve(true);
            });

            // ESC key to cancel
            const handleEsc = (e) => {
                if (e.key === 'Escape') {
                    modal.remove();
                    document.removeEventListener('keydown', handleEsc);
                    resolve(false);
                }
            };
            document.addEventListener('keydown', handleEsc);
        });
    }

    /**
     * Show progress indicator
     * @param {string} message - Progress message
     */
    showProgress(message) {
        // Remove existing progress if any
        this.hideProgress();

        const progress = document.createElement('div');
        progress.id = 'reprocess-progress';
        progress.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            z-index: 10002;
            text-align: center;
        `;

        progress.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 15px;">⏳</div>
            <div style="font-size: 18px; font-weight: bold; color: #333; margin-bottom: 10px;">
                ${message}
            </div>
            <div style="width: 200px; height: 4px; background-color: #e0e0e0; border-radius: 2px; overflow: hidden;">
                <div style="width: 100%; height: 100%; background-color: #2196F3; animation: progress 1.5s ease-in-out infinite;"></div>
            </div>
            <style>
                @keyframes progress {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            </style>
        `;

        document.body.appendChild(progress);
    }

    /**
     * Hide progress indicator
     */
    hideProgress() {
        const progress = document.getElementById('reprocess-progress');
        if (progress) {
            progress.remove();
        }
    }

    /**
     * Convert file to base64
     * @param {File} file - File object
     * @returns {Promise<Object>} File data with base64
     */
    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: base64
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Reset state
     */
    reset() {
        this.currentState = {
            hasOCRCache: false,
            hasSpecCache: false,
            ocrCacheKeys: [],
            specReferenceMap: null,
            lastSpecification: null,
            lastDrawings: []
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DrawingReprocessManager;
}
