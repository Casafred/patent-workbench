/**
 * 用户缓存智能合并模块
 * 负责时间戳比较、变化检测、冲突处理、智能合并
 */

class UserCacheMerger {
    constructor() {
        // 合并策略
        this.STRATEGIES = {
            SMART: 'smart',           // 智能合并：保留较新数据
            KEEP_LOCAL: 'keepLocal',  // 保留本地：本地优先
            KEEP_IMPORT: 'keepImport', // 保留导入：导入优先
            ADD_NEW: 'addNew'         // 仅添加：只添加本地没有的
        };
    }

    /**
     * 合并数据
     * @param {Object} localData - 本地数据
     * @param {Object} importData - 导入数据
     * @param {string} strategy - 合并策略
     * @returns {Object} 合并结果
     */
    merge(localData, importData, strategy = this.STRATEGIES.SMART) {
        const result = {
            merged: {},
            stats: {
                added: 0,
                updated: 0,
                skipped: 0,
                conflicts: 0
            },
            details: []
        };

        // 按分类合并
        const categories = new Set([
            ...Object.keys(localData || {}),
            ...Object.keys(importData || {})
        ]);

        categories.forEach(category => {
            const localCategory = localData[category] || {};
            const importCategory = importData[category] || {};

            result.merged[category] = this._mergeCategory(
                localCategory,
                importCategory,
                category,
                strategy,
                result.stats,
                result.details
            );
        });

        return result;
    }

    /**
     * 合并单个分类的数据
     * @private
     */
    _mergeCategory(localCategory, importCategory, category, strategy, stats, details) {
        const merged = {};
        const allKeys = new Set([
            ...Object.keys(localCategory),
            ...Object.keys(importCategory)
        ]);

        allKeys.forEach(key => {
            const localItem = localCategory[key];
            const importItem = importCategory[key];

            const mergeResult = this._mergeItem(key, localItem, importItem, strategy, category);

            if (mergeResult.merged !== null) {
                merged[key] = mergeResult.merged;
            }

            // 更新统计
            stats[mergeResult.action]++;
            details.push({
                key,
                category,
                action: mergeResult.action,
                localTimestamp: mergeResult.localTimestamp,
                importTimestamp: mergeResult.importTimestamp
            });
        });

        return merged;
    }

    /**
     * 合并单个数据项
     * @private
     */
    _mergeItem(key, localItem, importItem, strategy, category) {
        const result = {
            merged: null,
            action: 'skipped',
            localTimestamp: null,
            importTimestamp: null
        };

        // 提取时间戳
        result.localTimestamp = this._extractTimestamp(localItem);
        result.importTimestamp = this._extractTimestamp(importItem);

        // 情况1：本地没有，导入有
        if (localItem === null || localItem === undefined) {
            result.merged = importItem;
            result.action = 'added';
            return result;
        }

        // 情况2：本地有，导入没有
        if (importItem === null || importItem === undefined) {
            result.merged = localItem;
            result.action = 'skipped';
            return result;
        }

        // 情况3：两者都有，根据策略合并
        switch (strategy) {
            case this.STRATEGIES.KEEP_LOCAL:
                result.merged = localItem;
                result.action = 'skipped';
                break;

            case this.STRATEGIES.KEEP_IMPORT:
                result.merged = importItem;
                result.action = 'updated';
                break;

            case this.STRATEGIES.ADD_NEW:
                result.merged = localItem;
                result.action = 'skipped';
                break;

            case this.STRATEGIES.SMART:
            default:
                result.merged = this._smartMerge(localItem, importItem, result);
                break;
        }

        return result;
    }

    /**
     * 智能合并
     * @private
     */
    _smartMerge(localItem, importItem, result) {
        const localTimestamp = result.localTimestamp;
        const importTimestamp = result.importTimestamp;

        // 如果导入数据更新
        if (importTimestamp > localTimestamp) {
            result.action = 'updated';
            return importItem;
        }

        // 如果本地数据更新
        if (localTimestamp > importTimestamp) {
            result.action = 'skipped';
            return localItem;
        }

        // 时间戳相同，检查内容是否相同
        if (this._isContentEqual(localItem, importItem)) {
            result.action = 'skipped';
            return localItem;
        }

        // 时间戳相同但内容不同，标记为冲突
        // 默认保留导入数据（假设用户希望导入）
        result.action = 'updated';
        return importItem;
    }

    /**
     * 提取时间戳
     * @private
     */
    _extractTimestamp(item) {
        if (!item) return 0;

        // 尝试多种时间戳字段
        if (item.timestamp) return item.timestamp;
        if (item.lastUpdate) return item.lastUpdate;
        if (item.updatedAt) return item.updatedAt;
        if (item.created_at) return item.created_at;
        if (item.date) return new Date(item.date).getTime();

        // 对于数组，取最后元素的时间戳
        if (Array.isArray(item) && item.length > 0) {
            const lastItem = item[item.length - 1];
            return this._extractTimestamp(lastItem);
        }

        // 对于对话消息数组
        if (item.messages && Array.isArray(item.messages) && item.messages.length > 0) {
            const lastMsg = item.messages[item.messages.length - 1];
            return this._extractTimestamp(lastMsg);
        }

        return 0;
    }

    /**
     * 检查内容是否相等
     * @private
     */
    _isContentEqual(item1, item2) {
        try {
            return JSON.stringify(item1) === JSON.stringify(item2);
        } catch (e) {
            return false;
        }
    }

    /**
     * 分析导入数据与本地数据的差异
     * @param {Object} localData - 本地数据
     * @param {Object} importData - 导入数据
     * @returns {Object} 差异分析结果
     */
    analyzeDiff(localData, importData) {
        const analysis = {
            summary: {
                totalLocal: 0,
                totalImport: 0,
                added: 0,
                updated: 0,
                unchanged: 0,
                conflicts: 0
            },
            categories: {},
            items: []
        };

        const categories = new Set([
            ...Object.keys(localData || {}),
            ...Object.keys(importData || {})
        ]);

        categories.forEach(category => {
            const localCategory = localData[category] || {};
            const importCategory = importData[category] || {};

            analysis.categories[category] = {
                local: Object.keys(localCategory).length,
                import: Object.keys(importCategory).length,
                added: 0,
                updated: 0,
                unchanged: 0,
                newer: 0,
                older: 0
            };

            const allKeys = new Set([
                ...Object.keys(localCategory),
                ...Object.keys(importCategory)
            ]);

            allKeys.forEach(key => {
                const localItem = localCategory[key];
                const importItem = importCategory[key];

                analysis.summary.totalLocal += localItem ? 1 : 0;
                analysis.summary.totalImport += importItem ? 1 : 0;

                const localTimestamp = this._extractTimestamp(localItem);
                const importTimestamp = this._extractTimestamp(importItem);

                if (!localItem && importItem) {
                    analysis.summary.added++;
                    analysis.categories[category].added++;
                    analysis.items.push({
                        key,
                        category,
                        status: 'added',
                        importTimestamp
                    });
                } else if (localItem && importItem) {
                    if (this._isContentEqual(localItem, importItem)) {
                        analysis.summary.unchanged++;
                        analysis.categories[category].unchanged++;
                    } else if (importTimestamp > localTimestamp) {
                        analysis.summary.updated++;
                        analysis.categories[category].updated++;
                        analysis.categories[category].newer++;
                        analysis.items.push({
                            key,
                            category,
                            status: 'newer',
                            localTimestamp,
                            importTimestamp
                        });
                    } else if (importTimestamp < localTimestamp) {
                        analysis.categories[category].older++;
                        analysis.items.push({
                            key,
                            category,
                            status: 'older',
                            localTimestamp,
                            importTimestamp
                        });
                    } else {
                        analysis.summary.conflicts++;
                        analysis.items.push({
                            key,
                            category,
                            status: 'conflict',
                            localTimestamp,
                            importTimestamp
                        });
                    }
                }
            });
        });

        return analysis;
    }

    /**
     * 合并对话历史
     * @param {Array} localConvos - 本地对话
     * @param {Array} importConvos - 导入对话
     * @param {string} strategy - 合并策略
     * @returns {Array} 合并后的对话
     */
    mergeConversations(localConvos, importConvos, strategy = this.STRATEGIES.SMART) {
        if (!localConvos || localConvos.length === 0) return importConvos || [];
        if (!importConvos || importConvos.length === 0) return localConvos || [];

        const merged = [...localConvos];
        const localIds = new Set(localConvos.map(c => c.id));

        importConvos.forEach(importConvo => {
            const localIndex = merged.findIndex(c => c.id === importConvo.id);

            if (localIndex === -1) {
                // 本地没有，添加
                merged.push(importConvo);
            } else if (strategy === this.STRATEGIES.SMART) {
                // 智能合并：比较最后更新时间
                const localConvo = merged[localIndex];
                if ((importConvo.lastUpdate || 0) > (localConvo.lastUpdate || 0)) {
                    merged[localIndex] = importConvo;
                }
            } else if (strategy === this.STRATEGIES.KEEP_IMPORT) {
                merged[localIndex] = importConvo;
            }
        });

        // 按更新时间排序
        merged.sort((a, b) => (b.lastUpdate || 0) - (a.lastUpdate || 0));

        return merged;
    }

    /**
     * 合并角色配置
     * @param {Object} localPersonas - 本地角色
     * @param {Object} importPersonas - 导入角色
     * @param {string} strategy - 合并策略
     * @returns {Object} 合并后的角色
     */
    mergePersonas(localPersonas, importPersonas, strategy = this.STRATEGIES.SMART) {
        if (!localPersonas || Object.keys(localPersonas).length === 0) {
            return importPersonas || {};
        }
        if (!importPersonas || Object.keys(importPersonas).length === 0) {
            return localPersonas || {};
        }

        const merged = { ...localPersonas };

        Object.entries(importPersonas).forEach(([id, persona]) => {
            // 只合并自定义角色
            if (!persona.isCustom) {
                return;
            }

            if (!merged[id]) {
                merged[id] = persona;
            } else if (strategy === this.STRATEGIES.KEEP_IMPORT) {
                merged[id] = persona;
            } else if (strategy === this.STRATEGIES.SMART) {
                // 保留较新的
                const localTimestamp = merged[id].updatedAt || merged[id].timestamp || 0;
                const importTimestamp = persona.updatedAt || persona.timestamp || 0;
                if (importTimestamp > localTimestamp) {
                    merged[id] = persona;
                }
            }
        });

        return merged;
    }

    /**
     * 合并模板列表
     * @param {Array} localTemplates - 本地模板
     * @param {Array} importTemplates - 导入模板
     * @param {string} strategy - 合并策略
     * @returns {Array} 合并后的模板
     */
    mergeTemplates(localTemplates, importTemplates, strategy = this.STRATEGIES.SMART) {
        if (!localTemplates || localTemplates.length === 0) return importTemplates || [];
        if (!importTemplates || importTemplates.length === 0) return localTemplates || [];

        const merged = [...localTemplates];
        const localIds = new Set(localTemplates.map(t => t.id));

        importTemplates.forEach(importTemplate => {
            const localIndex = merged.findIndex(t => t.id === importTemplate.id);

            if (localIndex === -1) {
                // 检查名称冲突
                const nameConflict = merged.find(t => t.name === importTemplate.name);
                if (nameConflict) {
                    // 重命名导入的模板
                    importTemplate = {
                        ...importTemplate,
                        id: `${importTemplate.id}_imported_${Date.now()}`,
                        name: `${importTemplate.name} (导入)`
                    };
                }
                merged.push(importTemplate);
            } else if (strategy === this.STRATEGIES.KEEP_IMPORT) {
                merged[localIndex] = importTemplate;
            } else if (strategy === this.STRATEGIES.SMART) {
                const localTimestamp = merged[localIndex].timestamp || merged[localIndex].updatedAt || 0;
                const importTimestamp = importTemplate.timestamp || importTemplate.updatedAt || 0;
                if (importTimestamp > localTimestamp) {
                    merged[localIndex] = importTemplate;
                }
            }
        });

        return merged;
    }

    /**
     * 获取可用策略列表
     * @returns {Object[]} 策略列表
     */
    getStrategies() {
        return [
            {
                id: this.STRATEGIES.SMART,
                name: '智能合并',
                description: '自动比较时间戳，保留较新的数据'
            },
            {
                id: this.STRATEGIES.KEEP_LOCAL,
                name: '保留本地',
                description: '本地数据优先，忽略导入数据中的冲突项'
            },
            {
                id: this.STRATEGIES.KEEP_IMPORT,
                name: '覆盖导入',
                description: '导入数据优先，覆盖本地数据'
            },
            {
                id: this.STRATEGIES.ADD_NEW,
                name: '仅添加新项',
                description: '只添加本地没有的数据，不更新已有数据'
            }
        ];
    }
}

// 创建全局单例
const userCacheMerger = new UserCacheMerger();

// 导出
window.UserCacheMerger = UserCacheMerger;
window.userCacheMerger = userCacheMerger;

console.log('[UserCacheMerger] 模块已加载');
