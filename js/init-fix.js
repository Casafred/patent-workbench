// js/init-fix.js
// Comprehensive fix for DOM element initialization errors
// This file wraps all initialization functions with proper null checks

/**
 * Safely add event listener with null check
 */
function safeAddEventListener(elementId, event, handler, context = '') {
    const element = getEl(elementId);
    if (element) {
        element.addEventListener(event, handler);
        return true;
    } else {
        console.error(`❌ [${context}] Element not found: ${elementId}`);
        return false;
    }
}

/**
 * Wait for element to exist in DOM using MutationObserver
 * @param {string} elementId - Element ID to wait for
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<HTMLElement>}
 */
function waitForElement(elementId, timeout = 5000) {
    return new Promise((resolve, reject) => {
        // Check if element already exists
        const element = getEl(elementId);
        if (element) {
            resolve(element);
            return;
        }
        
        const startTime = Date.now();
        
        // Use MutationObserver for efficient detection
        const observer = new MutationObserver(() => {
            const element = getEl(elementId);
            if (element) {
                observer.disconnect();
                resolve(element);
            } else if (Date.now() - startTime > timeout) {
                observer.disconnect();
                reject(new Error(`Timeout waiting for element: ${elementId}`));
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Fallback timeout
        setTimeout(() => {
            const element = getEl(elementId);
            if (!element) {
                observer.disconnect();
                reject(new Error(`Timeout waiting for element: ${elementId}`));
            }
        }, timeout);
    });
}

/**
 * Wait for multiple elements to exist in DOM using MutationObserver
 * @param {string[]} elementIds - Array of element IDs to wait for
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<void>}
 */
function waitForElements(elementIds, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const foundElements = new Set();
        
        // Check if elements already exist
        elementIds.forEach(id => {
            if (getEl(id)) {
                foundElements.add(id);
            }
        });
        
        // If all elements exist, resolve immediately
        if (foundElements.size === elementIds.length) {
            resolve();
            return;
        }
        
        // Use MutationObserver for efficient detection
        const observer = new MutationObserver(() => {
            // Check each element
            elementIds.forEach(id => {
                if (getEl(id)) {
                    foundElements.add(id);
                }
            });
            
            // If all elements found, disconnect and resolve
            if (foundElements.size === elementIds.length) {
                observer.disconnect();
                console.log(`✅ All elements found: ${elementIds.join(', ')}`);
                resolve();
            } else if (Date.now() - startTime > timeout) {
                // Timeout
                observer.disconnect();
                const missing = elementIds.filter(id => !foundElements.has(id));
                reject(new Error(`Timeout waiting for elements. Missing: ${missing.join(', ')}`));
            }
        });
        
        // Observe document.body for changes
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Fallback timeout
        setTimeout(() => {
            if (foundElements.size < elementIds.length) {
                observer.disconnect();
                const missing = elementIds.filter(id => !foundElements.has(id));
                reject(new Error(`Timeout waiting for elements. Missing: ${missing.join(', ')}`));
            }
        }, timeout);
    });
}

/**
 * Safe initialization wrapper with MutationObserver-based element waiting
 * @param {Function} initFn - Initialization function to call
 * @param {string} componentName - Name of the component for logging
 * @param {string[]} requiredElements - Array of required element IDs
 * @returns {Promise<boolean>} - Success status
 */
async function safeInit(initFn, componentName, requiredElements = []) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`[${timestamp}] 🔄 Initializing ${componentName}...`);
    
    try {
        // Check if required elements exist
        if (requiredElements.length > 0) {
            const missingElements = requiredElements.filter(id => !getEl(id));
            
            if (missingElements.length > 0) {
                console.warn(`[${timestamp}] ⚠️ [${componentName}] Waiting for elements:`, missingElements);
                
                // Wait for elements using MutationObserver
                try {
                    await waitForElements(requiredElements, 5000);
                    console.log(`[${timestamp}] ✅ [${componentName}] All elements loaded`);
                } catch (error) {
                    console.error(`[${timestamp}] ❌ [${componentName}] Failed to load elements:`, error.message);
                    console.error(`[${timestamp}] ❌ [${componentName}] Skipping initialization`);
                    return false;
                }
            }
        }
        
        // Call the initialization function (support both sync and async)
        if (initFn.constructor.name === 'AsyncFunction') {
            await initFn();
        } else {
            initFn();
        }
        
        console.log(`[${timestamp}] ✅ [${componentName}] Initialized successfully`);
        return true;
        
    } catch (error) {
        console.error(`[${timestamp}] ❌ [${componentName}] Initialization failed:`, error);
        return false;
    }
}

// Export for use in main.js and other modules
window.safeInit = safeInit;
window.safeAddEventListener = safeAddEventListener;
window.waitForElement = waitForElement;
window.waitForElements = waitForElements;
