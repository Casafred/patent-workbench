/**
 * 用户缓存导入模块
 * 负责解析JSON文件、验证格式、调用合并器执行合并
 */

class UserCacheImporter {
    constructor() {
        this.SUPPORTED_VERSIONS = ['1.0'];
        this.MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    }

    /**
     * 从文件导入
     * @param {File} file - 文件对象
     * @param {Object} options - 导入选项
     * @param {string} options.strategy - 合并策略
     * @param {Function} options.onProgress - 进度回调
     * @returns {Promise<Object>} 导入结果
     */
    async importFromFile(file, options = {}) {
        const { strategy = 'smart', onProgress = null } = options;

        // 检查管理器是否初始化
        if (!window.userCacheManager.isInitialized()) {
            return {
                success: false,
                error: '缓存管理器未初始化'
            };
        }

        try {
            // 验证文件
            const validation = this._validateFile(file);
            if (!validation.valid) {
                return {
                    success: false,
                    error: validation.error
                };
            }

            // 读取文件
            if (onProgress) onProgress(10, '正在读取文件...');
            const content = await this._readFile(file);

            // 解析JSON
            if (onProgress) onProgress(30, '正在解析数据...');
            const importData = this._parseJSON(content);
            if (importData.error) {
                return {
                    success: false,
                    error: importData.error
                };
            }

            // 验证数据格式
            if (onProgress) onProgress(40, '正在验证格式...');
            const formatValidation = this._validateFormat(importData.data);
            if (!formatValidation.valid) {
                return {
                    success: false,
                    error: formatValidation.error
                };
            }

            // 检查用户名匹配
            const usernameCheck = this._checkUsername(importData.data);
            if (!usernameCheck.match) {
                // 用户名不匹配，但允许继续（警告用户）
                console.warn(`[UserCacheImporter] 用户名不匹配: 导入=${importData.data.username}, 当前=${window.userCacheManager.getUsername()}`);
            }

            // 分析差异
            if (onProgress) onProgress(50, '正在分析差异...');
            const localData = window.userCacheManager.collectAllData().data;
            const analysis = window.userCacheMerger.analyzeDiff(localData, importData.data.data);

            // 执行合并
            if (onProgress) onProgress(70, '正在合并数据...');
            const mergeResult = window.userCacheMerger.merge(
                localData,
                importData.data.data,
                strategy
            );

            // 保存合并结果
            if (onProgress) onProgress(90, '正在保存数据...');
            const saveResult = this._saveMergedData(mergeResult.merged);

            if (onProgress) onProgress(100, '导入完成');

            return {
                success: true,
                stats: {
                    added: mergeResult.stats.added,
                    updated: mergeResult.stats.updated,
                    skipped: mergeResult.stats.skipped,
                    conflicts: mergeResult.stats.conflicts,
                    saved: saveResult.saved,
                    failed: saveResult.failed
                },
                analysis,
                usernameMatch: usernameCheck.match,
                importUsername: importData.data.username
            };

        } catch (error) {
            console.error('[UserCacheImporter] 导入失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 预览导入文件
     * @param {File} file - 文件对象
     * @returns {Promise<Object>} 预览结果
     */
    async preview(file) {
        if (!window.userCacheManager.isInitialized()) {
            return {
                success: false,
                error: '缓存管理器未初始化'
            };
        }

        try {
            // 验证文件
            const validation = this._validateFile(file);
            if (!validation.valid) {
                return {
                    success: false,
                    error: validation.error
                };
            }

            // 读取并解析
            const content = await this._readFile(file);
            const importData = this._parseJSON(content);
            if (importData.error) {
                return {
                    success: false,
                    error: importData.error
                };
            }

            // 验证格式
            const formatValidation = this._validateFormat(importData.data);
            if (!formatValidation.valid) {
                return {
                    success: false,
                    error: formatValidation.error
                };
            }

            // 分析差异
            const localData = window.userCacheManager.collectAllData().data;
            const analysis = window.userCacheMerger.analyzeDiff(localData, importData.data.data);

            // 检查用户名
            const usernameCheck = this._checkUsername(importData.data);

            return {
                success: true,
                preview: {
                    version: importData.data.version,
                    exportTime: importData.data.exportTime,
                    exportUsername: importData.data.username,
                    currentUsername: window.userCacheManager.getUsername(),
                    usernameMatch: usernameCheck.match,
                    metadata: importData.data.metadata,
                    analysis
                }
            };

        } catch (error) {
            console.error('[UserCacheImporter] 预览失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 验证文件
     * @private
     */
    _validateFile(file) {
        if (!file) {
            return { valid: false, error: '未选择文件' };
        }

        if (!file.name.endsWith('.json')) {
            return { valid: false, error: '请选择JSON格式的文件' };
        }

        if (file.size > this.MAX_FILE_SIZE) {
            return { valid: false, error: `文件过大，最大支持 ${this.MAX_FILE_SIZE / 1024 / 1024}MB` };
        }

        return { valid: true };
    }

    /**
     * 读取文件内容
     * @private
     */
    _readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('文件读取失败'));
            reader.readAsText(file, 'UTF-8');
        });
    }

    /**
     * 解析JSON
     * @private
     */
    _parseJSON(content) {
        try {
            const data = JSON.parse(content);
            return { data, error: null };
        } catch (e) {
            return { data: null, error: 'JSON格式无效，请检查文件内容' };
        }
    }

    /**
     * 验证数据格式
     * @private
     */
    _validateFormat(data) {
        if (!data) {
            return { valid: false, error: '数据为空' };
        }

        if (!data.version) {
            return { valid: false, error: '缺少版本信息' };
        }

        if (!this.SUPPORTED_VERSIONS.includes(data.version)) {
            return { valid: false, error: `不支持的版本: ${data.version}` };
        }

        if (!data.username) {
            return { valid: false, error: '缺少用户名信息' };
        }

        if (!data.data) {
            return { valid: false, error: '缺少数据内容' };
        }

        // 验证校验和（如果存在）
        if (data.checksum) {
            const expectedChecksum = this._calculateChecksum(data);
            if (data.checksum !== expectedChecksum) {
                console.warn('[UserCacheImporter] 校验和不匹配，数据可能已被修改');
                // 不阻止导入，只是警告
            }
        }

        return { valid: true };
    }

    /**
     * 计算校验和
     * @private
     */
    _calculateChecksum(obj) {
        const content = JSON.stringify(obj.data);
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(8, '0');
    }

    /**
     * 检查用户名匹配
     * @private
     */
    _checkUsername(data) {
        const currentUsername = window.userCacheManager.getUsername();
        const importUsername = data.username;

        return {
            match: currentUsername === importUsername,
            current: currentUsername,
            imported: importUsername
        };
    }

    /**
     * 保存合并后的数据
     * @private
     */
    _saveMergedData(mergedData) {
        let saved = 0;
        let failed = 0;

        Object.entries(mergedData).forEach(([category, categoryData]) => {
            Object.entries(categoryData).forEach(([key, value]) => {
                if (window.userCacheManager.setJSON(key, value)) {
                    saved++;
                } else {
                    failed++;
                }
            });
        });

        return { saved, failed };
    }

    /**
     * 导入特定分类的数据
     * @param {File} file - 文件对象
     * @param {string} category - 分类名称
     * @param {string} strategy - 合并策略
     * @returns {Promise<Object>} 导入结果
     */
    async importCategory(file, category, strategy = 'smart') {
        const result = await this.importFromFile(file, { strategy });

        if (!result.success) {
            return result;
        }

        // 只保留指定分类的数据
        const categoryData = {};
        if (result.merged && result.merged[category]) {
            categoryData[category] = result.merged[category];
        }

        return {
            ...result,
            category,
            categoryData
        };
    }

    /**
     * 获取支持的版本列表
     */
    getSupportedVersions() {
        return this.SUPPORTED_VERSIONS;
    }

    /**
     * 获取最大文件大小
     */
    getMaxFileSize() {
        return this.MAX_FILE_SIZE;
    }
}

// 创建全局单例
const userCacheImporter = new UserCacheImporter();

// 导出
window.UserCacheImporter = UserCacheImporter;
window.userCacheImporter = userCacheImporter;

console.log('[UserCacheImporter] 模块已加载');
