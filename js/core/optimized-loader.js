(function() {
    'use strict';
    
    window.OptimizedLoader = {
        criticalScripts: [],
        deferredScripts: [],
        lazyScripts: {},
        loadedModules: new Set(),
        loadingPromises: new Map(),
        
        config: {
            criticalTimeout: 10000,
            deferredDelay: 100,
            lazyDelay: 1000,
            maxConcurrent: 3
        },
        
        init: function() {
            console.log('[OptimizedLoader] 初始化优化加载器');
            this.markPerformance('loader_init');
        },
        
        markPerformance: function(name) {
            if (window.PerformanceMonitor) {
                window.PerformanceMonitor.mark(name);
            }
        },
        
        measurePerformance: function(name, start, end) {
            if (window.PerformanceMonitor) {
                window.PerformanceMonitor.measure(name, start, end);
            }
        },
        
        loadScript: function(src, options) {
            if (options === void 0) { options = {}; }
            if (this.loadingPromises.has(src)) {
                return this.loadingPromises.get(src);
            }
            
            if (this.loadedModules.has(src)) {
                return Promise.resolve();
            }
            
            var self = this;
            var promise = new Promise(function(resolve, reject) {
                var script = document.createElement('script');
                script.src = src;
                script.async = options.async !== false;
                script.defer = options.defer === true;
                
                if (options.module) {
                    script.type = 'module';
                }
                
                var timeout = options.timeout || 30000;
                var timeoutId = setTimeout(function() {
                    reject(new Error('Script load timeout: ' + src));
                }, timeout);
                
                script.onload = function() {
                    clearTimeout(timeoutId);
                    self.loadedModules.add(src);
                    self.loadingPromises.delete(src);
                    console.log('[OptimizedLoader] 脚本加载完成:', src);
                    resolve();
                };
                
                script.onerror = function(err) {
                    clearTimeout(timeoutId);
                    self.loadingPromises.delete(src);
                    console.warn('[OptimizedLoader] 脚本加载失败:', src, err);
                    reject(err);
                };
                
                document.head.appendChild(script);
            });
            
            this.loadingPromises.set(src, promise);
            return promise;
        },
        
        loadScriptsParallel: function(scripts, options) {
            if (options === void 0) { options = {}; }
            var self = this;
            var batchSize = options.batchSize || this.config.maxConcurrent;
            
            var batches = [];
            for (var i = 0; i < scripts.length; i += batchSize) {
                batches.push(scripts.slice(i, i + batchSize));
            }
            
            var results = [];
            var currentBatch = 0;
            
            return new Promise(function(resolve) {
                function loadNextBatch() {
                    if (currentBatch >= batches.length) {
                        resolve(results);
                        return;
                    }
                    
                    var batch = batches[currentBatch];
                    var promises = batch.map(function(script) {
                        if (typeof script === 'string') {
                            return self.loadScript(script, options);
                        } else {
                            return self.loadScript(script.src, script.options || options);
                        }
                    });
                    
                    Promise.all(promises).then(function(batchResults) {
                        results.push.apply(results, batchResults);
                        currentBatch++;
                        loadNextBatch();
                    }).catch(function(error) {
                        console.warn('[OptimizedLoader] 批次加载出错:', error);
                        currentBatch++;
                        loadNextBatch();
                    });
                }
                
                loadNextBatch();
            });
        },
        
        loadCriticalScripts: function(scripts) {
            var self = this;
            this.markPerformance('critical_scripts_start');
            
            return this.loadScriptsParallel(scripts, {
                async: false,
                timeout: this.config.criticalTimeout
            }).then(function() {
                self.markPerformance('critical_scripts_end');
                self.measurePerformance('critical_scripts', 'critical_scripts_start', 'critical_scripts_end');
                console.log('[OptimizedLoader] 关键脚本加载完成');
            });
        },
        
        loadDeferredScripts: function(scripts) {
            var self = this;
            var delay = this.config.deferredDelay;
            
            return new Promise(function(resolve) {
                setTimeout(function() {
                    self.markPerformance('deferred_scripts_start');
                    
                    self.loadScriptsParallel(scripts, {
                        async: true,
                        timeout: 20000
                    }).then(function() {
                        self.markPerformance('deferred_scripts_end');
                        self.measurePerformance('deferred_scripts', 'deferred_scripts_start', 'deferred_scripts_end');
                        console.log('[OptimizedLoader] 延迟脚本加载完成');
                        resolve();
                    });
                }, delay);
            });
        },
        
        loadLazyScript: function(name, src) {
            if (this.lazyScripts[name]) {
                return this.lazyScripts[name];
            }
            
            var self = this;
            var promise = this.loadScript(src, { async: true });
            this.lazyScripts[name] = promise;
            
            return promise;
        },
        
        preloadModule: function(name) {
            var moduleMap = {
                'xlsx': 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
                'html2canvas': 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
                'jspdf': 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
                'd3': 'https://d3js.org/d3.v7.min.js',
                'marked': 'https://cdn.jsdelivr.net/npm/marked/marked.min.js'
            };
            
            var src = moduleMap[name];
            if (!src) {
                return Promise.reject(new Error('Unknown module: ' + name));
            }
            
            return this.loadLazyScript(name, src);
        },
        
        isModuleLoaded: function(name) {
            var checkMap = {
                'xlsx': function() { return typeof XLSX !== 'undefined'; },
                'html2canvas': function() { return typeof html2canvas !== 'undefined'; },
                'jspdf': function() { return typeof jspdf !== 'undefined'; },
                'd3': function() { return typeof d3 !== 'undefined'; },
                'marked': function() { return typeof marked !== 'undefined'; }
            };
            
            var checkFn = checkMap[name];
            return checkFn ? checkFn() : false;
        },
        
        ensureModule: function(name) {
            if (this.isModuleLoaded(name)) {
                return Promise.resolve();
            }
            return this.preloadModule(name);
        },
        
        getLoadingStats: function() {
            return {
                loadedCount: this.loadedModules.size,
                pendingCount: this.loadingPromises.size,
                lazyScriptsCount: Object.keys(this.lazyScripts).length
            };
        }
    };
    
    window.OptimizedLoader.init();
    
})();
