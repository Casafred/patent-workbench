/**
 * HTML Component Loader
 * 负责动态加载和注入HTML组件到页面中
 * 
 * @module component-loader
 */

/**
 * 异步加载HTML组件并注入到目标元素
 * @param {string} componentPath - 组件文件的相对路径 (相对于项目根目录)
 * @param {string} targetElementId - 目标DOM元素的ID
 * @param {number|Object} retryCountOrOptions - 重试次数 (默认3次) 或配置对象
 * @returns {Promise<boolean>} - 成功返回true,失败返回false
 */
async function loadComponent(componentPath, targetElementId, retryCountOrOptions = 3) {
    // 支持旧的API (retryCount) 和新的API (options对象)
    let retryCount = 3;
    let options = {};
    
    if (typeof retryCountOrOptions === 'number') {
        retryCount = retryCountOrOptions;
    } else if (typeof retryCountOrOptions === 'object') {
        options = retryCountOrOptions;
        retryCount = options.retryCount || 3;
    }
    
    const {
        requiredElements = [],  // 必须存在的元素ID列表
        timeout = 5000,          // 等待元素的最大时间(毫秒)
        onReady = null           // DOM准备好后的回调函数
    } = options;
    
    const targetElement = document.getElementById(targetElementId);
    
    if (!targetElement) {
        console.error(`[Component Loader] 目标元素未找到: ${targetElementId}`);
        return false;
    }

    for (let attempt = 1; attempt <= retryCount; attempt++) {
        try {
            console.log(`[Component Loader] 加载组件: ${componentPath} -> #${targetElementId} (尝试 ${attempt}/${retryCount})`);
            
            const response = await fetch(componentPath);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const html = await response.text();
            
            // 注入HTML内容
            targetElement.innerHTML = html;
            
            console.log(`[Component Loader] ✓ 组件加载成功: ${componentPath}`);
            
            // 如果指定了必需元素，等待它们出现
            if (requiredElements.length > 0) {
                console.log(`[Component Loader] 等待必需元素: ${requiredElements.join(', ')}`);
                
                try {
                    await waitForElements(requiredElements, timeout);
                    console.log(`[Component Loader] ✓ 所有必需元素已就绪`);
                } catch (error) {
                    console.error(`[Component Loader] ✗ 等待元素超时:`, error.message);
                    throw error;
                }
            }
            
            // 调用onReady回调
            if (typeof onReady === 'function') {
                console.log(`[Component Loader] 执行onReady回调`);
                await onReady();
            }
            
            // 触发组件加载完成事件
            const eventName = targetElementId.replace(/-/g, '') + 'Loaded';
            const loadedEvent = new CustomEvent(eventName, {
                detail: { componentPath, targetElementId }
            });
            document.dispatchEvent(loadedEvent);
            
            return true;
            
        } catch (error) {
            console.warn(`[Component Loader] 加载失败 (尝试 ${attempt}/${retryCount}):`, error.message);
            
            if (attempt < retryCount) {
                // 指数退避重试
                const delay = Math.pow(2, attempt) * 100;
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error(`[Component Loader] ✗ 组件加载失败 (已达最大重试次数): ${componentPath}`);
                targetElement.innerHTML = `
                    <div style="padding: 20px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; color: #856404;">
                        <strong>⚠️ 组件加载失败</strong><br>
                        无法加载: ${componentPath}<br>
                        <small>错误: ${error.message}</small>
                    </div>
                `;
                return false;
            }
        }
    }
    
    return false;
}

/**
 * 等待多个元素出现在DOM中
 * @param {string[]} elementIds - 元素ID数组
 * @param {number} timeout - 超时时间(毫秒)
 * @returns {Promise<void>}
 */
function waitForElements(elementIds, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const foundElements = new Set();
        
        // 首先检查元素是否已经存在
        elementIds.forEach(id => {
            if (document.getElementById(id)) {
                foundElements.add(id);
            }
        });
        
        // 如果所有元素都已存在，立即resolve
        if (foundElements.size === elementIds.length) {
            resolve();
            return;
        }
        
        // 使用MutationObserver监听DOM变化
        const observer = new MutationObserver(() => {
            // 检查每个元素
            elementIds.forEach(id => {
                if (document.getElementById(id)) {
                    foundElements.add(id);
                }
            });
            
            // 如果所有元素都找到了，停止观察并resolve
            if (foundElements.size === elementIds.length) {
                observer.disconnect();
                resolve();
            } else if (Date.now() - startTime > timeout) {
                // 超时
                observer.disconnect();
                const missing = elementIds.filter(id => !foundElements.has(id));
                reject(new Error(`等待元素超时，缺失: ${missing.join(', ')}`));
            }
        });
        
        // 开始观察document.body的变化
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // 设置超时检查
        setTimeout(() => {
            if (foundElements.size < elementIds.length) {
                observer.disconnect();
                const missing = elementIds.filter(id => !foundElements.has(id));
                reject(new Error(`等待元素超时，缺失: ${missing.join(', ')}`));
            }
        }, timeout);
    });
}

/**
 * 同步加载HTML组件 (使用XMLHttpRequest)
 * 注意: 仅在必要时使用,推荐使用异步loadComponent
 * @param {string} componentPath - 组件文件的相对路径
 * @param {string} targetElementId - 目标DOM元素的ID
 * @returns {boolean} - 成功返回true,失败返回false
 */
function loadComponentSync(componentPath, targetElementId) {
    const targetElement = document.getElementById(targetElementId);
    
    if (!targetElement) {
        console.error(`[Component Loader] 目标元素未找到: ${targetElementId}`);
        return false;
    }

    try {
        console.log(`[Component Loader] 同步加载组件: ${componentPath} -> #${targetElementId}`);
        
        const xhr = new XMLHttpRequest();
        xhr.open('GET', componentPath, false); // false = 同步
        xhr.send();
        
        if (xhr.status === 200) {
            targetElement.innerHTML = xhr.responseText;
            console.log(`[Component Loader] ✓ 组件同步加载成功: ${componentPath}`);
            return true;
        } else {
            throw new Error(`HTTP ${xhr.status}: ${xhr.statusText}`);
        }
        
    } catch (error) {
        console.error(`[Component Loader] ✗ 组件同步加载失败: ${componentPath}`, error);
        targetElement.innerHTML = `
            <div style="padding: 20px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; color: #856404;">
                <strong>⚠️ 组件加载失败</strong><br>
                无法加载: ${componentPath}<br>
                <small>错误: ${error.message}</small>
            </div>
        `;
        return false;
    }
}

/**
 * 批量加载多个组件
 * @param {Array<{path: string, targetId: string}>} components - 组件配置数组
 * @returns {Promise<Object>} - 返回加载结果统计
 */
async function loadComponents(components) {
    console.log(`[Component Loader] 开始批量加载 ${components.length} 个组件`);
    
    const results = await Promise.allSettled(
        components.map(comp => loadComponent(comp.path, comp.targetId))
    );
    
    const stats = {
        total: components.length,
        success: results.filter(r => r.status === 'fulfilled' && r.value === true).length,
        failed: results.filter(r => r.status === 'rejected' || r.value === false).length
    };
    
    console.log(`[Component Loader] 批量加载完成: ${stats.success}/${stats.total} 成功, ${stats.failed} 失败`);
    
    return stats;
}

// 导出函数供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { loadComponent, loadComponentSync, loadComponents };
}
