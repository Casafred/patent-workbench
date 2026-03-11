(function() {
    const MODULE_BASE_PATH = 'js/modules/patent-detail-newtab/';
    
    const MODULES = [
        'utils.js',
        'styles.js',
        'cache.js',
        'html-builder.js',
        'sections.js',
        'viewer.js',
        'modes.js',
        'translation.js',
        'chat.js',
        'index.js'
    ];
    
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load: ' + src));
            document.head.appendChild(script);
        });
    }
    
    async function loadAllModules() {
        for (const module of MODULES) {
            try {
                await loadScript(MODULE_BASE_PATH + module);
                console.log('[PatentDetailNewTab] Loaded module:', module);
            } catch (err) {
                console.error('[PatentDetailNewTab] Failed to load module:', module, err);
            }
        }
        
        if (window.PatentDetailTranslation) {
            window.PatentDetailTranslation.init();
        }
        if (window.PatentDetailChat) {
            window.PatentDetailChat.init();
        }
        
        console.log('[PatentDetailNewTab] All modules loaded successfully');
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadAllModules);
    } else {
        loadAllModules();
    }
    
})();
