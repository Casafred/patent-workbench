(function() {
    'use strict';
    
    window.LoadingConfig = {
        critical: {
            scripts: [
                'js/core/component-loader.js',
                'js/core/api.js',
                'js/core/provider.js',
                'js/core/feature-lock.js',
                'js/core/theme-manager.js',
                'js/core/user-cache-storage.js',
                'js/core/user-cache-manager.js',
                'js/dom.js',
                'js/state.js'
            ],
            styles: [
                'frontend/css/main.css'
            ],
            components: [
                'frontend/components/header.html',
                'frontend/components/sidebar-navigation.html'
            ]
        },
        
        deferred: {
            scripts: [
                'js/modules/chat/chat-file-handler.js',
                'js/modules/chat/chat-history-sync.js',
                'js/modules/chat/chat-conversation.js',
                'js/modules/chat/chat-message.js',
                'js/modules/chat/chat-persona.js',
                'js/modules/chat/chat-search.js',
                'js/modules/chat/chat-export.js',
                'js/modules/chat/chat-core.js',
                'js/modules/init/init-unified-batch.js',
                'js/modules/init/init-local-patent-lib.js',
                'js/modules/init/init-claims-comparison.js',
                'js/modules/init/init-patent-batch.js',
                'js/modules/init/init-ipc.js',
                'js/localPatentLib.js',
                'js/claimsComparison.js',
                'js/familyClaimsComparison.js',
                'js/patentTemplate.js',
                'js/patentChat.js',
                'js/claimsProcessor.js',
                'js/fileParserHandler.js',
                'js/aiDisclaimer.js',
                'js/patentDetailNewTab.js'
            ],
            styles: [
                'frontend/css/pages/claims.css',
                'frontend/css/pages/family-claims-comparison.css',
                'frontend/css/components/patent-template.css',
                'frontend/css/components/patent-chat.css',
                'frontend/css/components/patent-config.css',
                'frontend/css/components/patent-timeline.css',
                'frontend/css/components/field-selector.css',
                'frontend/css/components/ai-description-processor.css',
                'frontend/css/components/pdf-ocr-reader.css',
                'frontend/css/components/pdf-ocr-interaction.css',
                'frontend/css/pages/ipc-lookup.css',
                'frontend/css/pages/epo-search.css',
                'frontend/css/pages/prompt-forum.css'
            ]
        },
        
        lazy: {
            modules: {
                'unified-batch': [
                    'js/modules/unified-batch/config.js',
                    'js/modules/unified-batch/state.js',
                    'js/modules/unified-batch/router.js',
                    'js/modules/unified-batch/input-handler.js',
                    'js/modules/unified-batch/template-manager.js',
                    'js/modules/unified-batch/output-handler.js',
                    'js/modules/unified-batch/engines/async-engine.js',
                    'js/modules/unified-batch/engines/batch-engine.js',
                    'js/modules/unified-batch/index.js'
                ],
                'classification': [
                    'js/modules/unified-batch/classification/config.js',
                    'js/modules/unified-batch/classification/state.js',
                    'js/modules/unified-batch/classification/schema-manager.js',
                    'js/modules/unified-batch/classification/prompt-builder.js',
                    'js/modules/unified-batch/classification/example-library.js',
                    'js/modules/unified-batch/classification/cold-start.js',
                    'js/modules/unified-batch/classification/result-analyzer.js',
                    'js/modules/unified-batch/classification/smart-import.js',
                    'js/modules/unified-batch/classification/index.js'
                ],
                'claims-processor': [
                    'js/modules/claims/claims-file-handler.js',
                    'js/modules/claims/claims-processor.js',
                    'js/modules/claims/claims-visualization.js',
                    'js/modules/claims/claims-text-analyzer.js',
                    'js/modules/claims/claims-patent-search.js',
                    'js/modules/claims/claims-core.js'
                ],
                'pdf-ocr': [
                    'js/modules/pdf-ocr/pdf-ocr-cache.js',
                    'js/modules/pdf-ocr/pdf-ocr-core.js',
                    'js/modules/pdf-ocr/pdf-ocr-viewer.js',
                    'js/modules/pdf-ocr/pdf-ocr-parser.js',
                    'js/modules/pdf-ocr/pdf-ocr-chat.js',
                    'js/modules/pdf-ocr/pdf-ocr-selection.js',
                    'js/modules/pdf-ocr/pdf-ocr-floating-toolbar.js',
                    'js/modules/pdf-ocr/pdf-ocr-floating-chat.js',
                    'js/modules/pdf-ocr/pdf-ocr-init.js'
                ],
                'ipc': [
                    'js/modules/ipc/ipc-local-data.js',
                    'js/modules/ipc/ipc-core.js',
                    'js/modules/ipc/ipc-search.js',
                    'js/modules/ipc/ipc-tree.js',
                    'js/modules/ipc/ipc-lookup.js',
                    'js/modules/ipc/ipc-predict.js',
                    'js/modules/ipc/ipc-init.js'
                ],
                'epo': [
                    'js/modules/epo-search/epo-search.js'
                ],
                'patent-batch': [
                    'js/modules/patent-batch/field-selector.js',
                    'js/modules/patent-batch/patent-cache.js',
                    'js/modules/patent-batch/patent-history.js',
                    'js/modules/patent-batch/cache-confirm-modal.js',
                    'js/modules/patent-batch/tab-manager.js',
                    'js/modules/patent-batch/relation-batch-crawler.js'
                ],
                'drawing-marker': [
                    'frontend/js/multiImageViewer_v8.js',
                    'frontend/js/drawingCacheManager.js',
                    'frontend/js/drawingReprocessManager.js',
                    'frontend/js/drawingMarkerInteractive_v8.js',
                    'frontend/js/ai_description/ai_processing_panel.js',
                    'frontend/js/ai_description/prompt_editor.js',
                    'js/modules/drawing-marker/drawing-marker-init.js'
                ],
                'guide': [
                    'js/modules/guide/guide-system.js',
                    'js/modules/guide/guide-api-config.js',
                    'js/modules/guide/guide-features.js',
                    'js/modules/guide/guide-init.js'
                ],
                'prompt-forum': [
                    'js/modules/prompt-forum/prompt-forum.js'
                ],
                'user-data': [
                    'js/modules/user-data/user-data-ui.js',
                    'js/modules/user-data/user-data-modal.js'
                ]
            },
            libraries: {
                xlsx: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
                html2canvas: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
                jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
                d3: 'https://d3js.org/d3.v7.min.js',
                marked: 'https://cdn.jsdelivr.net/npm/marked/marked.min.js'
            }
        },
        
        timings: {
            criticalTarget: 5000,
            deferredTarget: 15000,
            lazyTarget: 30000
        }
    };
    
    var initialized = false;
    var loadingState = {
        critical: false,
        deferred: false,
        lazy: {}
    };
    
    function init() {
        if (initialized) return;
        initialized = true;
        
        console.log('[LoadingConfig] 初始化加载配置');
        
        if (window.PerformanceMonitor) {
            window.PerformanceMonitor.mark('loading_config_init');
        }
    }
    
    function isCriticalLoaded() {
        return loadingState.critical;
    }
    
    function isDeferredLoaded() {
        return loadingState.deferred;
    }
    
    function isLazyLoaded(moduleName) {
        return loadingState.lazy[moduleName] === true;
    }
    
    function setCriticalLoaded() {
        loadingState.critical = true;
        if (window.PerformanceMonitor) {
            window.PerformanceMonitor.mark('critical_loaded');
            window.PerformanceMonitor.measure('critical_loading', 'loading_config_init', 'critical_loaded');
        }
    }
    
    function setDeferredLoaded() {
        loadingState.deferred = true;
        if (window.PerformanceMonitor) {
            window.PerformanceMonitor.mark('deferred_loaded');
            window.PerformanceMonitor.measure('deferred_loading', 'critical_loaded', 'deferred_loaded');
        }
    }
    
    function setLazyLoaded(moduleName) {
        loadingState.lazy[moduleName] = true;
        if (window.PerformanceMonitor) {
            window.PerformanceMonitor.mark('lazy_' + moduleName + '_loaded');
        }
    }
    
    function getLoadingProgress() {
        var total = 1 + 1 + Object.keys(window.LoadingConfig.lazy.modules).length;
        var loaded = (loadingState.critical ? 1 : 0) + 
                     (loadingState.deferred ? 1 : 0) + 
                     Object.values(loadingState.lazy).filter(function(v) { return v; }).length;
        return Math.round((loaded / total) * 100);
    }
    
    window.LoadingConfig.init = init;
    window.LoadingConfig.isCriticalLoaded = isCriticalLoaded;
    window.LoadingConfig.isDeferredLoaded = isDeferredLoaded;
    window.LoadingConfig.isLazyLoaded = isLazyLoaded;
    window.LoadingConfig.setCriticalLoaded = setCriticalLoaded;
    window.LoadingConfig.setDeferredLoaded = setDeferredLoaded;
    window.LoadingConfig.setLazyLoaded = setLazyLoaded;
    window.LoadingConfig.getLoadingProgress = getLoadingProgress;
    
    window.LoadingConfig.init();
    
})();
