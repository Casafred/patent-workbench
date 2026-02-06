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
 * @param {number} retryCount - 重试次数 (默认3次)
 * @returns {Promise<boolean>} - 成功返回true,失败返回false
 */
async function loadComponent(componentPath, targetElementId, retryCount = 3) {
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
