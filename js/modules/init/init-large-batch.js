/**
 * 大批量处理功能初始化模块
 * 使用新的模块化架构
 */

/**
 * 初始化大批量处理功能
 * 此函数在large-batch组件HTML加载后调用
 */
function initLargeBatchModule() {
    console.log('🔧 [Init] 初始化大批量处理功能...');
    
    try {
        // 检查新的模块化代码是否已加载
        if (typeof window.largeBatchCore !== 'undefined' && window.largeBatchCore.init) {
            // 使用新的模块化初始化
            window.largeBatchCore.init();
            console.log('✅ [Init] 使用新模块化架构初始化完成');
            return true;
        }
        
        // 如果新模块未加载，尝试使用旧代码
        if (typeof initLargeBatch === 'function') {
            initLargeBatch();
            console.log('✅ [Init] 使用旧代码初始化完成');
            return true;
        }
        
        console.error('❌ [Init] 未找到初始化函数');
        return false;
        
    } catch (error) {
        console.error('❌ [Init] 初始化失败:', error);
        return false;
    }
}

// 导出给全局使用
if (typeof window !== 'undefined') {
    window.initLargeBatchModule = initLargeBatchModule;
}
