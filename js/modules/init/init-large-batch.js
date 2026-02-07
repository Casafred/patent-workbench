// js/modules/init/init-large-batch.js
// Initialization module for Feature 3 (Large Batch)

/**
 * Initialize Large Batch feature
 * This function should be called AFTER the large-batch component HTML is loaded
 */
function initLargeBatchModule() {
    console.log('🔧 Initializing Large Batch module...');
    
    // Call the original initLargeBatch function from largeBatch.js
    if (typeof initLargeBatch === 'function') {
        initLargeBatch();
        console.log('✅ Large Batch module initialized successfully');
        return true;
    } else {
        console.error('❌ initLargeBatch function not found');
        return false;
    }
}

// Export for use in main.js
if (typeof window !== 'undefined') {
    window.initLargeBatchModule = initLargeBatchModule;
}
