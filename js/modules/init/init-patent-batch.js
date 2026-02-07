// js/modules/init/init-patent-batch.js
// Initialization module for Feature 6 (Patent Batch)

/**
 * Initialize Patent Batch feature
 * This function should be called AFTER the patent-batch component HTML is loaded
 * Note: initPatentBatch is defined in main.js, not in a separate file
 */
function initPatentBatchModule() {
    console.log('🔧 Initializing Patent Batch module...');
    
    // Check if required DOM elements exist
    const requiredElements = [
        'patent_numbers_input',
        'search_patents_btn',
        'patent_results_container'
    ];
    
    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    
    if (missingElements.length > 0) {
        console.error('❌ Patent Batch initialization failed: Missing required elements:', missingElements);
        return false;
    }
    
    // Initialize field selector
    if (typeof window.initFieldSelector === 'function') {
        window.initFieldSelector();
        console.log('✅ Field selector initialized');
    } else {
        console.warn('⚠️ initFieldSelector function not found');
    }
    
    // Call the original initPatentBatch function from main.js
    if (typeof initPatentBatch === 'function') {
        initPatentBatch();
        console.log('✅ Patent Batch module initialized successfully');
        return true;
    } else {
        console.error('❌ initPatentBatch function not found');
        return false;
    }
}

// Export for use in main.js
if (typeof window !== 'undefined') {
    window.initPatentBatchModule = initPatentBatchModule;
}

