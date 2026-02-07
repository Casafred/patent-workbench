// js/modules/init/init-claims-comparison.js
// Initialization module for Feature 5 (Claims Comparison)

/**
 * Initialize Claims Comparison feature
 * This function should be called AFTER the claims-comparison component HTML is loaded
 */
function initClaimsComparisonModule() {
    console.log('🔧 Initializing Claims Comparison module...');
    
    // Check if required DOM elements exist
    const requiredElements = [
        'comparison_model_select',
        'add_claim_btn',
        'claims_input_container'
    ];
    
    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    
    if (missingElements.length > 0) {
        console.error('❌ Claims Comparison initialization failed: Missing required elements:', missingElements);
        return false;
    }
    
    // Call the original initClaimsComparison function from claimsComparison.js
    if (typeof initClaimsComparison === 'function') {
        initClaimsComparison();
        console.log('✅ Claims Comparison module initialized successfully');
        return true;
    } else {
        console.error('❌ initClaimsComparison function not found');
        return false;
    }
}

// Export for use in main.js
if (typeof window !== 'undefined') {
    window.initClaimsComparisonModule = initClaimsComparisonModule;
}
