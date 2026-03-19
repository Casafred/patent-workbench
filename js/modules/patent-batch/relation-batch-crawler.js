/**
 * 功能六：关系专利批量爬取模块
 * 用于爬取同族专利、引用专利、被引用专利、相似专利的详细信息
 */

/**
 * 打开关系分析标签页并启动爬取
 * @param {string} sourcePatentNumber - 来源专利号
 * @param {string} relationType - 关系类型 (family/citations/cited_by/similar)
 * @param {Array} relationData - 关系专利数据列表
 */
window.openRelationAnalysisTab = function(sourcePatentNumber, relationType, relationData) {
    console.log(`🔍 打开关系分析标签页: ${sourcePatentNumber} - ${relationType}`, relationData);

    const patentNumbers = extractPatentNumbers(relationData, relationType);
    
    if (!patentNumbers || patentNumbers.length === 0) {
        alert(`该专利没有${getRelationTypeName(relationType)}数据`);
        return;
    }

    if (window.guestModeRestrictions && window.guestModeRestrictions.isGuestMode()) {
        if (patentNumbers.length > 1) {
            if (!confirm(`游客模式仅允许查询 1 条专利。\n\n当前共 ${patentNumbers.length} 条，将只查询第一条。\n\n是否继续？`)) {
                return;
            }
            patentNumbers.splice(1);
        }
    } else if (patentNumbers.length > 50) {
        if (!confirm(`发现 ${patentNumbers.length} 个${getRelationTypeName(relationType)}，数量较多可能导致爬取时间较长。\n是否继续？`)) {
            return;
        }
        patentNumbers.splice(50);
    }

    // 显示标签页容器
    const tabsContainer = document.getElementById('patent_batch_tabs_container');
    if (tabsContainer) {
        tabsContainer.style.display = 'block';
    }

    // 初始化标签页管理器（如果尚未初始化）
    if (!window.patentTabManager.container) {
        window.patentTabManager.init('patent_batch_tabs_container');
    }

    // 创建新标签页
    const tabId = window.patentTabManager.createTab({
        sourcePatent: sourcePatentNumber,
        relationType: relationType,
        patentNumbers: patentNumbers
    });

    // 开始爬取
    crawlRelationPatents(tabId, sourcePatentNumber, relationType, patentNumbers);
};

/**
 * 从关系数据中提取专利号列表
 */
function extractPatentNumbers(relationData, relationType) {
    if (!relationData || !Array.isArray(relationData)) {
        return [];
    }

    const patentNumbers = [];
    
    relationData.forEach(item => {
        let patentNumber = null;
        
        switch (relationType) {
            case 'family':
                // 同族专利数据结构
                patentNumber = item.publication_number || item.application_number;
                break;
            case 'citations':
            case 'cited_by':
                // 引用/被引用专利数据结构
                patentNumber = item.patent_number;
                break;
            case 'similar':
                // 相似文档数据结构
                patentNumber = item.patent_number;
                break;
        }

        if (patentNumber && !patentNumbers.includes(patentNumber)) {
            patentNumbers.push(patentNumber);
        }
    });

    return patentNumbers;
}

/**
 * 获取关系类型中文名称
 */
function getRelationTypeName(type) {
    const typeNames = {
        'family': '同族专利',
        'citations': '引用专利',
        'cited_by': '被引用专利',
        'similar': '相似专利'
    };
    return typeNames[type] || '相关专利';
}

/**
 * 批量爬取关系专利
 * @param {string} tabId - 标签页ID
 * @param {string} sourcePatentNumber - 来源专利号
 * @param {string} relationType - 关系类型
 * @param {Array} patentNumbers - 专利号列表
 */
window.crawlRelationPatents = async function(tabId, sourcePatentNumber, relationType, patentNumbers) {
    console.log(`🚀 开始爬取关系专利: ${tabId}, 数量: ${patentNumbers.length}`);

    const results = [];
    const total = patentNumbers.length;

    // 获取字段选择
    const selectedFields = window.getSelectedFields ? window.getSelectedFields() : null;

    // 逐个爬取专利
    for (let i = 0; i < patentNumbers.length; i++) {
        const patentNumber = patentNumbers[i];
        
        // 更新进度
        window.patentTabManager.updateTabProgress(
            tabId, 
            i, 
            total, 
            `正在爬取 ${patentNumber} (${i + 1}/${total})`
        );

        try {
            // 检查缓存
            let patentData = null;
            if (window.PatentCache) {
                const cacheResult = window.PatentCache.get(patentNumber);
                // PatentCache.get 返回的是包含 data 字段的对象
                if (cacheResult && cacheResult.data) {
                    patentData = cacheResult.data;
                }
            }

            if (patentData) {
                console.log(`📦 使用缓存数据: ${patentNumber}`);
                results.push({
                    patent_number: patentNumber,
                    success: true,
                    data: patentData,
                    from_cache: true
                });
            } else {
                // 调用API爬取
                const response = await fetch('/api/patent/search', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        patent_numbers: [patentNumber],
                        crawl_specification: true,
                        selected_fields: selectedFields
                    })
                });

                const data = await response.json();

                if (data.success && data.data && data.data.length > 0) {
                    const result = data.data[0];
                    
                    if (result.success) {
                        // 保存到缓存 - 使用 save 方法
                        if (window.PatentCache && window.PatentCache.save) {
                            window.PatentCache.save(patentNumber, result.data, selectedFields, result.url);
                        }

                        results.push({
                            patent_number: patentNumber,
                            success: true,
                            data: result.data,
                            url: result.url,
                            processing_time: result.processing_time
                        });
                    } else {
                        results.push({
                            patent_number: patentNumber,
                            success: false,
                            error: result.error || '爬取失败'
                        });
                    }
                } else {
                    results.push({
                        patent_number: patentNumber,
                        success: false,
                        error: data.error || '请求失败'
                    });
                }
            }
        } catch (error) {
            console.error(`❌ 爬取失败 ${patentNumber}:`, error);
            results.push({
                patent_number: patentNumber,
                success: false,
                error: error.message || '网络错误'
            });
        }

        // 每爬取一个就更新一次结果（实时显示）
        window.patentTabManager.updateTabResults(tabId, [...results]);

        // 添加小延迟，避免请求过快
        if (i < patentNumbers.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    // 最终更新
    window.patentTabManager.updateTabProgress(tabId, total, total, '爬取完成');
    window.patentTabManager.updateTabResults(tabId, results);

    console.log(`✅ 关系专利爬取完成: ${tabId}, 成功: ${results.filter(r => r.success).length}/${total}`);
};

/**
 * 批量爬取关系专利（简化版，用于直接调用）
 * @param {Array} patentNumbers - 专利号列表
 * @param {Function} onProgress - 进度回调函数
 * @returns {Promise<Array>} 爬取结果
 */
window.crawlPatentsBatch = async function(patentNumbers, onProgress) {
    if (window.guestModeRestrictions && window.guestModeRestrictions.isGuestMode()) {
        if (patentNumbers.length > 1) {
            if (!confirm(`游客模式仅允许查询 1 条专利。\n\n当前共 ${patentNumbers.length} 条，将只查询第一条。\n\n是否继续？`)) {
                return [];
            }
            patentNumbers = patentNumbers.slice(0, 1);
        }
    }
    
    const results = [];
    const total = patentNumbers.length;

    // 获取字段选择
    const selectedFields = window.getSelectedFields ? window.getSelectedFields() : null;

    for (let i = 0; i < patentNumbers.length; i++) {
        const patentNumber = patentNumbers[i];
        
        if (onProgress) {
            onProgress(i + 1, total, `正在爬取 ${patentNumber}`);
        }

        try {
            // 检查缓存
            let patentData = null;
            if (window.PatentCache) {
                patentData = window.PatentCache.get(patentNumber);
            }

            if (patentData) {
                results.push({
                    patent_number: patentNumber,
                    success: true,
                    data: patentData,
                    from_cache: true
                });
            } else {
                const response = await fetch('/api/patent/search', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        patent_numbers: [patentNumber],
                        crawl_specification: true,
                        selected_fields: selectedFields
                    })
                });

                const data = await response.json();

                if (data.success && data.data && data.data.length > 0) {
                    const result = data.data[0];
                    
                    if (result.success) {
                        if (window.PatentCache) {
                            window.PatentCache.set(patentNumber, result.data);
                        }

                        results.push({
                            patent_number: patentNumber,
                            success: true,
                            data: result.data,
                            processing_time: result.processing_time
                        });
                    } else {
                        results.push({
                            patent_number: patentNumber,
                            success: false,
                            error: result.error || '爬取失败'
                        });
                    }
                } else {
                    results.push({
                        patent_number: patentNumber,
                        success: false,
                        error: data.error || '请求失败'
                    });
                }
            }
        } catch (error) {
            results.push({
                patent_number: patentNumber,
                success: false,
                error: error.message || '网络错误'
            });
        }

        // 添加小延迟
        if (i < patentNumbers.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    return results;
};

console.log('✅ 关系专利批量爬取模块已加载');
