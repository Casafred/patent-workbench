/**
 * 用户缓存导出模块
 * 负责收集数据、生成JSON文件、触发下载
 */

class UserCacheExporter {
    constructor() {
        this.VERSION = '1.0';
        this.EXPORT_FILE_PREFIX = 'patent_workbench_backup_';
    }

    /**
     * 导出用户数据
     * @param {Object} options - 导出选项
     * @param {string[]} options.include - 包含的数据类型（null表示全部）
     * @param {string[]} options.exclude - 排除的数据类型
     * @param {boolean} options.includeLargeCache - 是否包含大型缓存数据
     * @returns {Object} 导出结果
     */
    export(options = {}) {
        const {
            include = null,
            exclude = [],
            includeLargeCache = true
        } = options;

        // 检查管理器是否初始化
        if (!window.userCacheManager.isInitialized()) {
            return {
                success: false,
                error: '缓存管理器未初始化'
            };
        }

        try {
            // 收集数据
            const { data, stats } = this._collectData(include, exclude, includeLargeCache);

            // 构建导出对象
            const exportData = this._buildExportObject(data, stats);

            // 生成文件并下载
            const filename = this._generateFilename();
            this._downloadFile(exportData, filename);

            return {
                success: true,
                filename,
                stats: {
                    totalItems: stats.totalItems,
                    totalSize: window.userCacheManager.formatSize(stats.totalSize),
                    categories: stats.categories
                }
            };
        } catch (error) {
            console.error('[UserCacheExporter] 导出失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 预览导出数据（不下载）
     * @param {Object} options - 导出选项
     * @returns {Object} 预览结果
     */
    preview(options = {}) {
        const {
            include = null,
            exclude = [],
            includeLargeCache = true
        } = options;

        if (!window.userCacheManager.isInitialized()) {
            return {
                success: false,
                error: '缓存管理器未初始化'
            };
        }

        try {
            const { data, stats } = this._collectData(include, exclude, includeLargeCache);

            // 构建详细预览
            const preview = {
                username: window.userCacheManager.getUsername(),
                exportTime: new Date().toISOString(),
                totalItems: stats.totalItems,
                totalSize: window.userCacheManager.formatSize(stats.totalSize),
                categories: {}
            };

            // 按分类统计
            Object.entries(stats.categories).forEach(([category, catStats]) => {
                preview.categories[category] = {
                    items: catStats.items,
                    size: window.userCacheManager.formatSize(catStats.size),
                    types: []
                };
            });

            // 按类型统计
            const dataTypes = window.userCacheManager.getDataTypes();
            Object.entries(dataTypes).forEach(([typeKey, type]) => {
                if (data[type.category] && Object.keys(data[type.category]).some(k => k.startsWith(type.key) || k === type.key)) {
                    if (preview.categories[type.category]) {
                        let itemCount = 0;
                        if (type.isPrefix) {
                            itemCount = Object.keys(data[type.category]).filter(k => k.startsWith(type.key)).length;
                        } else {
                            itemCount = data[type.category][type.key] ? 1 : 0;
                        }
                        preview.categories[type.category].types.push({
                            key: typeKey,
                            name: type.name,
                            count: itemCount
                        });
                    }
                }
            });

            return {
                success: true,
                preview
            };
        } catch (error) {
            console.error('[UserCacheExporter] 预览失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 收集数据
     * @private
     */
    _collectData(include, exclude, includeLargeCache) {
        // 大型缓存类型
        const largeCacheTypes = [
            'PATENT_CACHE',
            'PATENT_ANALYSIS',
            'DRAWING_OCR_CACHE',
            'PDF_OCR_CACHE'
        ];

        // 如果不包含大型缓存，添加到排除列表
        const finalExclude = includeLargeCache ? exclude : [...exclude, ...largeCacheTypes];

        return window.userCacheManager.collectAllData({
            include,
            exclude: finalExclude
        });
    }

    /**
     * 构建导出对象
     * @private
     */
    _buildExportObject(data, stats) {
        const now = new Date();
        const exportObject = {
            version: this.VERSION,
            exportTime: now.toISOString(),
            exportTimestamp: now.getTime(),
            username: window.userCacheManager.getUsername(),
            checksum: null, // 稍后计算
            data: data,
            metadata: {
                totalItems: stats.totalItems,
                totalSize: window.userCacheManager.formatSize(stats.totalSize),
                categories: {},
                appVersion: 'patent-workbench-v26'
            }
        };

        // 添加分类元数据
        Object.entries(stats.categories).forEach(([category, catStats]) => {
            exportObject.metadata.categories[category] = {
                items: catStats.items,
                size: window.userCacheManager.formatSize(catStats.size)
            };
        });

        // 计算校验和
        exportObject.checksum = this._calculateChecksum(exportObject);

        return exportObject;
    }

    /**
     * 计算校验和
     * @private
     */
    _calculateChecksum(obj) {
        // 简单的校验和计算（基于数据内容的哈希）
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
     * 生成文件名
     * @private
     */
    _generateFilename() {
        const username = window.userCacheManager.getUsername();
        const date = new Date().toISOString().slice(0, 10);
        const time = new Date().toTimeString().slice(0, 8).replace(/:/g, '-');
        return `${this.EXPORT_FILE_PREFIX}${username}_${date}_${time}.json`;
    }

    /**
     * 下载文件
     * @private
     */
    _downloadFile(data, filename) {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();

        // 清理
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);

        console.log(`[UserCacheExporter] 文件已下载: ${filename}`);
    }

    /**
     * 导出特定类型的数据
     * @param {string} typeKey - 数据类型键
     * @returns {Object} 导出结果
     */
    exportType(typeKey) {
        return this.export({
            include: [typeKey],
            includeLargeCache: true
        });
    }

    /**
     * 导出配置数据（不含缓存）
     * @returns {Object} 导出结果
     */
    exportConfig() {
        const configTypes = [
            'CHAT_PERSONAS',
            'CHAT_CURRENT_ID',
            'PATENT_HISTORY',
            'PATENT_TEMPLATES',
            'LARGE_BATCH_TEMPLATES'
        ];

        return this.export({
            include: configTypes,
            includeLargeCache: false
        });
    }

    /**
     * 导出对话历史
     * @returns {Object} 导出结果
     */
    exportConversations() {
        return this.export({
            include: ['CHAT_CONVERSATIONS', 'CHAT_PERSONAS', 'CHAT_CURRENT_ID'],
            includeLargeCache: false
        });
    }

    /**
     * 获取导出选项列表
     * @returns {Object[]} 选项列表
     */
    getExportOptions() {
        return [
            {
                id: 'all',
                name: '全部数据',
                description: '导出所有用户数据，包括缓存',
                includeLargeCache: true
            },
            {
                id: 'config',
                name: '仅配置',
                description: '导出模板、角色等配置，不含缓存数据',
                includeLargeCache: false,
                types: ['CHAT_PERSONAS', 'PATENT_TEMPLATES', 'LARGE_BATCH_TEMPLATES']
            },
            {
                id: 'conversations',
                name: '对话历史',
                description: '导出即时对话的历史记录和角色配置',
                includeLargeCache: false,
                types: ['CHAT_CONVERSATIONS', 'CHAT_PERSONAS']
            },
            {
                id: 'patentCache',
                name: '专利缓存',
                description: '导出专利爬取数据和解读结果',
                includeLargeCache: true,
                types: ['PATENT_CACHE', 'PATENT_ANALYSIS', 'PATENT_HISTORY']
            },
            {
                id: 'ocrCache',
                name: 'OCR缓存',
                description: '导出附图和PDF的OCR识别结果',
                includeLargeCache: true,
                types: ['DRAWING_OCR_CACHE', 'PDF_OCR_CACHE', 'PDF_OCR_META']
            }
        ];
    }
}

// 创建全局单例
const userCacheExporter = new UserCacheExporter();

// 导出
window.UserCacheExporter = UserCacheExporter;
window.userCacheExporter = userCacheExporter;

console.log('[UserCacheExporter] 模块已加载');
