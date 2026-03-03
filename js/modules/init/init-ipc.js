/**
 * IPC Module Main Entry
 * 在主页面加载后调用此初始化
 */

function initIpcLookup() {
    console.log('[IPC] 开始初始化IPC查询功能...');
    
    if (typeof IPCCore === 'undefined') {
        console.error('[IPC] IPCCore模块未加载');
        return;
    }
    
    if (typeof IPCInit !== 'undefined') {
        IPCInit.initialize();
    }
    
    console.log('[IPC] IPC查询功能初始化完成');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(initIpcLookup, 500);
    });
} else {
    setTimeout(initIpcLookup, 500);
}
