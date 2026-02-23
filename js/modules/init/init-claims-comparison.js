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
        
        // Initialize sub-tab switching for claims comparison
        initClaimsComparisonSubTabs();
        
        return true;
    } else {
        console.error('❌ initClaimsComparison function not found');
        return false;
    }
}

/**
 * Initialize sub-tab switching for claims comparison
 */
function initClaimsComparisonSubTabs() {
    const subTabButtons = document.querySelectorAll('#claims_comparison-tab .sub-tab-button');
    
    subTabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const subTabId = e.target.dataset.subTab;
            if (subTabId && typeof switchClaimsComparisonSubTab === 'function') {
                switchClaimsComparisonSubTab(subTabId, e.target);
                
                // If switching to family sub-tab, load the family comparison HTML
                if (subTabId === 'family') {
                    loadFamilyComparisonHTML();
                }
            }
        });
    });
    
    console.log('✅ Claims Comparison sub-tabs initialized');
}

/**
 * Load family comparison HTML content
 */
async function loadFamilyComparisonHTML() {
    const familySubTab = document.getElementById('family-sub-tab');
    
    // Check if content is already loaded
    if (familySubTab && familySubTab.children.length > 0) {
        console.log('✅ Family comparison HTML already loaded');
        return;
    }
    
    try {
        const response = await fetch('frontend/components/tabs/family-claims-comparison.html');
        const html = await response.text();
        
        if (familySubTab) {
            familySubTab.innerHTML = html;
            console.log('✅ Family comparison HTML loaded successfully');
        }
    } catch (error) {
        console.error('❌ Failed to load family comparison HTML:', error);
        if (familySubTab) {
            familySubTab.innerHTML = '<div class="error">加载同族权利要求对比内容失败</div>';
        }
    }
}

// Export for use in main.js
if (typeof window !== 'undefined') {
    window.initClaimsComparisonModule = initClaimsComparisonModule;
}
