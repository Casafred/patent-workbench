// js/modules/init/init-local-patent-lib.js
// Initialization module for Feature 4 (Local Patent Library)

/**
 * Initialize Local Patent Library feature
 * This function should be called AFTER the local-patent-lib component HTML is loaded
 */
function initLocalPatentLibModule() {
    console.log('🔧 Initializing Local Patent Library module...');
    
    // Check if required DOM elements exist
    const requiredElements = [
        'lpl_original_file_input',
        'lpl_expand_btn'
    ];
    
    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    
    if (missingElements.length > 0) {
        console.error('❌ Local Patent Library initialization failed: Missing required elements:', missingElements);
        return false;
    }
    
    // Call the original initLocalPatentLib function from localPatentLib.js
    if (typeof initLocalPatentLib === 'function') {
        initLocalPatentLib();
        console.log('✅ Local Patent Library module initialized successfully');
        return true;
    } else {
        console.error('❌ initLocalPatentLib function not found');
        return false;
    }
}

// Export for use in main.js
if (typeof window !== 'undefined') {
    window.initLocalPatentLibModule = initLocalPatentLibModule;
}
