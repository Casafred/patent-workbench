(function(global) {
    'use strict';

    var ImageLoaderOptimizer = {
        config: {
            rootMargin: '100px 0px',
            threshold: 0.01,
            fadeInDuration: 400,
            placeholderColor: 'rgba(34, 197, 94, 0.05)',
            skeletonAnimation: true,
            enablePerformanceMonitor: true,
            criticalImagesSelector: '.hero-section img, .navbar-logo',
            lazyImagesSelector: '.feature-image img, .feature-image-stack img, .stacked-image img',
            debugMode: false,
            maxRetries: 3,
            retryDelay: 1000
        },

        state: {
            observer: null,
            criticalImagesLoaded: 0,
            totalCriticalImages: 0,
            lazyImagesLoaded: 0,
            totalLazyImages: 0,
            performanceMetrics: {
                pageLoadStart: 0,
                criticalImagesComplete: 0,
                allImagesComplete: 0,
                imageLoadTimes: []
            },
            isPageInteractive: false,
            browserSupport: {
                intersectionObserver: false,
                performanceObserver: false,
                customEvent: false,
                aspectRatio: false
            },
            retryCount: {}
        },

        init: function(options) {
            var self = this;
            
            this._checkBrowserSupport();
            
            if (options) {
                Object.keys(options).forEach(function(key) {
                    if (self.config.hasOwnProperty(key)) {
                        self.config[key] = options[key];
                    }
                });
            }

            this.state.performanceMetrics.pageLoadStart = this._getPerformanceNow();

            this._setupCriticalImageLoading();
            this._setupLazyLoading();
            this._setupLayoutShiftPrevention();
            this._setupPerformanceMonitoring();

            if (this.config.debugMode) {
                this._enableDebugMode();
            }

            return this;
        },

        _checkBrowserSupport: function() {
            this.state.browserSupport.intersectionObserver = 'IntersectionObserver' in window;
            this.state.browserSupport.performanceObserver = 'PerformanceObserver' in window;
            this.state.browserSupport.customEvent = typeof CustomEvent === 'function';
            this.state.browserSupport.aspectRatio = CSS.supports && CSS.supports('aspect-ratio', '1');
        },

        _getPerformanceNow: function() {
            if (typeof performance !== 'undefined' && performance.now) {
                return performance.now();
            }
            return Date.now();
        },

        _setupCriticalImageLoading: function() {
            var self = this;
            var criticalImages = document.querySelectorAll(this.config.criticalImagesSelector);
            this.state.totalCriticalImages = criticalImages.length;

            if (criticalImages.length === 0) {
                this._markPageInteractive();
                return;
            }

            criticalImages.forEach(function(img) {
                self._preloadImage(img, true);
            });
        },

        _preloadImage: function(img, isCritical) {
            var self = this;
            var startTime = this._getPerformanceNow();

            if (img.complete && img.naturalHeight !== 0) {
                this._handleImageLoad(img, isCritical, startTime);
                return;
            }

            img.addEventListener('load', function() {
                self._handleImageLoad(img, isCritical, startTime);
            });

            img.addEventListener('error', function() {
                self._handleImageError(img, isCritical);
            });

            if (img.dataset.src && !img.src) {
                img.src = img.dataset.src;
            }
        },

        _handleImageLoad: function(img, isCritical, startTime) {
            var loadTime = this._getPerformanceNow() - startTime;
            
            this.state.performanceMetrics.imageLoadTimes.push({
                src: img.src,
                loadTime: loadTime,
                isCritical: isCritical
            });

            img.classList.add('image-loaded');
            img.classList.remove('image-loading');

            if (isCritical) {
                this.state.criticalImagesLoaded++;
                if (this.state.criticalImagesLoaded >= this.state.totalCriticalImages) {
                    this.state.performanceMetrics.criticalImagesComplete = this._getPerformanceNow();
                    this._markPageInteractive();
                }
            } else {
                this.state.lazyImagesLoaded++;
                if (this.state.lazyImagesLoaded >= this.state.totalLazyImages) {
                    this.state.performanceMetrics.allImagesComplete = this._getPerformanceNow();
                    this._dispatchEvent('allImagesLoaded');
                }
            }

            this._dispatchEvent('imageLoaded', {
                img: img,
                isCritical: isCritical,
                loadTime: loadTime
            });
        },

        _handleImageError: function(img, isCritical) {
            var self = this;
            var imgSrc = img.src || img.dataset.src;
            
            if (!imgSrc) {
                this._showErrorPlaceholder(img, isCritical);
                return;
            }
            
            var retryKey = imgSrc.replace(/[^a-zA-Z0-9]/g, '_');
            var currentRetry = this.state.retryCount[retryKey] || 0;
            
            if (currentRetry < this.config.maxRetries) {
                this.state.retryCount[retryKey] = currentRetry + 1;
                
                if (this.config.debugMode) {
                    console.log('[ImageLoader] Retrying image (' + (currentRetry + 1) + '/' + this.config.maxRetries + '):', imgSrc);
                }
                
                setTimeout(function() {
                    var timestamp = imgSrc.indexOf('?') > -1 ? '&t=' : '?t=';
                    img.src = imgSrc + timestamp + Date.now();
                }, this.config.retryDelay * (currentRetry + 1));
                
                return;
            }
            
            this._showErrorPlaceholder(img, isCritical);
        },

        _showErrorPlaceholder: function(img, isCritical) {
            img.classList.add('image-error');
            img.classList.remove('image-loading');

            var placeholder = this._createErrorPlaceholder(img);
            if (placeholder) {
                img.parentNode.replaceChild(placeholder, img);
            }

            if (isCritical) {
                this.state.criticalImagesLoaded++;
                if (this.state.criticalImagesLoaded >= this.state.totalCriticalImages) {
                    this._markPageInteractive();
                }
            }
        },

        _createErrorPlaceholder: function(img) {
            var placeholder = document.createElement('div');
            placeholder.className = 'image-error-placeholder';
            placeholder.style.cssText = 'width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: rgba(255, 100, 100, 0.1); border-radius: 8px;';
            placeholder.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.5;"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
            return placeholder;
        },

        _setupLazyLoading: function() {
            var self = this;
            var lazyImages = document.querySelectorAll(this.config.lazyImagesSelector);
            this.state.totalLazyImages = lazyImages.length;

            if (this.state.browserSupport.intersectionObserver) {
                this.state.observer = new IntersectionObserver(function(entries, observer) {
                    entries.forEach(function(entry) {
                        if (entry.isIntersecting) {
                            var img = entry.target;
                            self._loadLazyImage(img);
                            observer.unobserve(img);
                        }
                    });
                }, {
                    rootMargin: this.config.rootMargin,
                    threshold: this.config.threshold
                });

                lazyImages.forEach(function(img) {
                    if (img.dataset.src && !img.src) {
                        img.src = img.dataset.src;
                    }
                    
                    if (img.complete && img.naturalHeight !== 0) {
                        img.classList.add('image-loaded');
                        return;
                    }
                    
                    self._addSkeletonPlaceholder(img);
                    img.classList.add('image-loading');
                    self.state.observer.observe(img);
                });
            } else {
                this._setupFallbackLazyLoading(lazyImages);
            }
        },

        _setupFallbackLazyLoading: function(lazyImages) {
            var self = this;
            
            lazyImages.forEach(function(img) {
                if (img.dataset.src && !img.src) {
                    img.src = img.dataset.src;
                }
                img.classList.add('image-loaded');
            });
        },

        _addSkeletonPlaceholder: function(img) {
            var parent = img.parentElement;
            if (!parent) return;

            if (!parent.querySelector('.image-skeleton')) {
                var skeleton = document.createElement('div');
                skeleton.className = 'image-skeleton';
                skeleton.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(90deg, rgba(34, 197, 94, 0.05) 25%, rgba(34, 197, 94, 0.1) 50%, rgba(34, 197, 94, 0.05) 75%); background-size: 200% 100%; animation: skeletonShimmer 1.5s infinite; border-radius: inherit; z-index: 0;';
                
                if (getComputedStyle(parent).position === 'static') {
                    parent.style.position = 'relative';
                }
                
                img.style.position = 'relative';
                img.style.zIndex = '1';
                
                parent.insertBefore(skeleton, img);
            }
        },

        _removeSkeletonPlaceholder: function(img) {
            var parent = img.parentElement;
            if (!parent) return;

            var skeleton = parent.querySelector('.image-skeleton');
            if (skeleton) {
                skeleton.style.opacity = '0';
                setTimeout(function() {
                    if (skeleton.parentNode) {
                        skeleton.parentNode.removeChild(skeleton);
                    }
                }, 300);
            }
        },

        _loadLazyImage: function(img) {
            var self = this;
            var startTime = this._getPerformanceNow();

            if (img.dataset.src && !img.src) {
                img.src = img.dataset.src;
            }

            if (img.complete) {
                if (img.naturalHeight !== 0) {
                    this._handleImageLoad(img, false, startTime);
                }
                this._removeSkeletonPlaceholder(img);
                img.classList.remove('image-loading');
                img.classList.add('image-loaded');
                return;
            }

            img.addEventListener('load', function onLoad() {
                img.removeEventListener('load', onLoad);
                img.removeEventListener('error', onError);
                self._handleImageLoad(img, false, startTime);
                self._removeSkeletonPlaceholder(img);
                img.classList.remove('image-loading');
                img.classList.add('image-loaded');
            });

            var onError = function() {
                img.removeEventListener('load', onLoad);
                img.removeEventListener('error', onError);
                self._handleImageError(img, false);
                self._removeSkeletonPlaceholder(img);
            };
            img.addEventListener('error', onError);
        },

        _setupLayoutShiftPrevention: function() {
        },

        _setupPerformanceMonitoring: function() {
            if (!this.config.enablePerformanceMonitor) return;

            var self = this;
            
            if (this.state.browserSupport.performanceObserver) {
                try {
                    var lcpObserver = new PerformanceObserver(function(list) {
                        var entries = list.getEntries();
                        var lastEntry = entries[entries.length - 1];
                        
                        self.state.performanceMetrics.largestContentfulPaint = lastEntry.startTime;
                    });
                    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

                    var clsObserver = new PerformanceObserver(function(list) {
                        var entries = list.getEntries();
                        var clsValue = 0;
                        
                        entries.forEach(function(entry) {
                            if (!entry.hadRecentInput) {
                                clsValue += entry.value;
                            }
                        });
                        
                        self.state.performanceMetrics.cumulativeLayoutShift = clsValue;
                    });
                    clsObserver.observe({ type: 'layout-shift', buffered: true });
                } catch (e) {
                    if (self.config.debugMode) {
                        console.warn('[ImageLoader] PerformanceObserver not fully supported:', e);
                    }
                }
            }

            window.addEventListener('load', function() {
                setTimeout(function() {
                    self._collectFinalMetrics();
                }, 1000);
            });
        },

        _collectFinalMetrics: function() {
            var timing = {};
            
            if (typeof performance !== 'undefined' && performance.timing) {
                timing = performance.timing;
                this.state.performanceMetrics.timing = {
                    domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
                    loadComplete: timing.loadEventEnd - timing.navigationStart
                };
            }

            if (typeof performance !== 'undefined' && performance.getEntriesByType) {
                var paintEntries = performance.getEntriesByType('paint');
                if (paintEntries && paintEntries.length > 0) {
                    if (!this.state.performanceMetrics.timing) {
                        this.state.performanceMetrics.timing = {};
                    }
                    this.state.performanceMetrics.timing.firstPaint = this._findPaintTime(paintEntries, 'first-paint');
                    this.state.performanceMetrics.timing.firstContentfulPaint = this._findPaintTime(paintEntries, 'first-contentful-paint');
                }
            }

            this._dispatchEvent('metricsCollected', this.getPerformanceReport());
        },

        _findPaintTime: function(entries, name) {
            for (var i = 0; i < entries.length; i++) {
                if (entries[i].name === name) {
                    return entries[i].startTime;
                }
            }
            return 0;
        },

        _markPageInteractive: function() {
            if (this.state.isPageInteractive) return;
            
            this.state.isPageInteractive = true;
            
            var loader = document.getElementById('loader');
            if (loader) {
                loader.classList.add('hidden');
            }

            this._dispatchEvent('pageInteractive');
        },

        _dispatchEvent: function(eventName, detail) {
            var event = new CustomEvent('imageLoader.' + eventName, {
                detail: detail,
                bubbles: true
            });
            document.dispatchEvent(event);
        },

        _enableDebugMode: function() {
            var self = this;
            
            console.log('[ImageLoader] Debug mode enabled');
            console.log('[ImageLoader] Config:', this.config);
            
            document.addEventListener('imageLoader.imageLoaded', function(e) {
                console.log('[ImageLoader] Image loaded:', e.detail);
            });

            document.addEventListener('imageLoader.pageInteractive', function() {
                console.log('[ImageLoader] Page is now interactive');
            });

            document.addEventListener('imageLoader.allImagesLoaded', function() {
                console.log('[ImageLoader] All images loaded');
                console.log('[ImageLoader] Performance report:', self.getPerformanceReport());
            });
        },

        getPerformanceReport: function() {
            var metrics = this.state.performanceMetrics;
            
            return {
                pageLoadStart: metrics.pageLoadStart,
                criticalImagesComplete: metrics.criticalImagesComplete,
                allImagesComplete: metrics.allImagesComplete,
                criticalImagesTime: metrics.criticalImagesComplete - metrics.pageLoadStart,
                totalImagesTime: metrics.allImagesComplete - metrics.pageLoadStart,
                imageLoadTimes: metrics.imageLoadTimes,
                webVitals: {
                    lcp: metrics.largestContentfulPaint,
                    cls: metrics.cumulativeLayoutShift,
                    fp: metrics.timing ? metrics.timing.firstPaint : 0,
                    fcp: metrics.timing ? metrics.timing.firstContentfulPaint : 0
                },
                counts: {
                    criticalImagesLoaded: this.state.criticalImagesLoaded,
                    totalCriticalImages: this.state.totalCriticalImages,
                    lazyImagesLoaded: this.state.lazyImagesLoaded,
                    totalLazyImages: this.state.totalLazyImages
                }
            };
        },

        forceLoadAll: function() {
            var self = this;
            var lazyImages = document.querySelectorAll(this.config.lazyImagesSelector);
            
            lazyImages.forEach(function(img) {
                if (self.state.observer) {
                    self.state.observer.unobserve(img);
                }
                self._loadLazyImage(img);
            });
        },

        updateConfig: function(newConfig) {
            var self = this;
            Object.keys(newConfig).forEach(function(key) {
                if (self.config.hasOwnProperty(key)) {
                    self.config[key] = newConfig[key];
                }
            });
        },

        destroy: function() {
            if (this.state.observer) {
                this.state.observer.disconnect();
                this.state.observer = null;
            }
        }
    };

    function addSkeletonStyles() {
        if (document.getElementById('image-loader-skeleton-styles')) return;

        var style = document.createElement('style');
        style.id = 'image-loader-skeleton-styles';
        style.textContent = '\
            @keyframes skeletonShimmer {\
                0% { background-position: -200% 0; }\
                100% { background-position: 200% 0; }\
            }\
            .image-loading {\
                opacity: 1;\
            }\
            .image-loaded {\
                opacity: 1;\
            }\
            .image-error-placeholder {\
                min-height: 100px;\
            }\
            .image-skeleton {\
                pointer-events: none;\
            }\
        ';
        document.head.appendChild(style);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            addSkeletonStyles();
        });
    } else {
        addSkeletonStyles();
    }

    global.ImageLoaderOptimizer = ImageLoaderOptimizer;

})(typeof window !== 'undefined' ? window : this);
