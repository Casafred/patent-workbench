// js/modules/init/init-async-batch.js
// Initialization module for Feature 2 (Async Batch)

/**
 * Initialize Async Batch feature
 * This function should be called AFTER the async-batch component HTML is loaded
 */
function initAsyncBatchModule() {
    console.log('🔧 Initializing Async Batch module...');
    
    // Check if required DOM elements exist
    const requiredElements = [
        'async_add_output_field_btn',
        'async_output_fields_container',
        'async_preset_template_select',
        'async_excel_column_count'
    ];
    
    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    
    if (missingElements.length > 0) {
        console.error('❌ Async Batch initialization failed: Missing required elements:', missingElements);
        return false;
    }
    
    // Call the original initAsyncBatch function from asyncBatch.js
    if (typeof initAsyncBatch === 'function') {
        initAsyncBatch();
        console.log('✅ Async Batch module initialized successfully');
        return true;
    } else {
        console.error('❌ initAsyncBatch function not found');
        return false;
    }
}

// Export for use in main.js
if (typeof window !== 'undefined') {
    window.initAsyncBatchModule = initAsyncBatchModule;
}
