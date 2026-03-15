(function() {
    'use strict';
    
    window.PerformanceMonitor = {
        metrics: {},
        marks: {},
        measures: [],
        
        init: function() {
            this.mark('app_start');
            console.log('[Performance] 性能监控器已初始化');
        },
        
        mark: function(name) {
            const timestamp = performance.now();
            this.marks[name] = timestamp;
            console.log(`[Performance] Mark: ${name} at ${timestamp.toFixed(2)}ms`);
        },
        
        measure: function(name, startMark, endMark) {
            const start = this.marks[startMark] || 0;
            const end = this.marks[endMark] || performance.now();
            const duration = end - start;
            
            this.measures.push({
                name: name,
                start: start,
                end: end,
                duration: duration
            });
            
            this.metrics[name] = duration;
            console.log(`[Performance] Measure: ${name} = ${duration.toFixed(2)}ms`);
            
            return duration;
        },
        
        getMetrics: function() {
            return {
                ...this.metrics,
                marks: { ...this.marks },
                measures: [...this.measures]
            };
        },
        
        getReport: function() {
            const report = {
                timestamp: new Date().toISOString(),
                navigationTiming: this.getNavigationTiming(),
                resourceTiming: this.getResourceTiming(),
                customMetrics: this.metrics,
                summary: this.getSummary()
            };
            
            return report;
        },
        
        getNavigationTiming: function() {
            const timing = performance.timing || {};
            const navigation = performance.getEntriesByType ? 
                performance.getEntriesByType('navigation')[0] : null;
            
            if (navigation) {
                return {
                    dns: navigation.domainLookupEnd - navigation.domainLookupStart,
                    tcp: navigation.connectEnd - navigation.connectStart,
                    request: navigation.responseStart - navigation.requestStart,
                    response: navigation.responseEnd - navigation.responseStart,
                    domProcessing: navigation.domComplete - navigation.domInteractive,
                    total: navigation.loadEventEnd - navigation.fetchStart
                };
            }
            
            return {
                dns: timing.domainLookupEnd - timing.domainLookupStart,
                tcp: timing.connectEnd - timing.connectStart,
                request: timing.responseStart - timing.requestStart,
                response: timing.responseEnd - timing.responseStart,
                domProcessing: timing.domComplete - timing.domInteractive,
                total: timing.loadEventEnd - timing.navigationStart
            };
        },
        
        getResourceTiming: function() {
            const resources = performance.getEntriesByType ? 
                performance.getEntriesByType('resource') : [];
            
            const grouped = {
                scripts: [],
                styles: [],
                images: [],
                fonts: [],
                other: []
            };
            
            resources.forEach(resource => {
                const item = {
                    name: resource.name,
                    duration: resource.duration,
                    size: resource.transferSize || 0
                };
                
                if (resource.name.endsWith('.js')) {
                    grouped.scripts.push(item);
                } else if (resource.name.endsWith('.css')) {
                    grouped.styles.push(item);
                } else if (/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(resource.name)) {
                    grouped.images.push(item);
                } else if (/\.(woff|woff2|ttf|eot)$/i.test(resource.name)) {
                    grouped.fonts.push(item);
                } else {
                    grouped.other.push(item);
                }
            });
            
            return grouped;
        },
        
        getSummary: function() {
            const navTiming = this.getNavigationTiming();
            const resources = performance.getEntriesByType ? 
                performance.getEntriesByType('resource') : [];
            
            const totalResourceSize = resources.reduce((sum, r) => 
                sum + (r.transferSize || 0), 0);
            
            const slowResources = resources
                .filter(r => r.duration > 500)
                .map(r => ({ name: r.name, duration: r.duration }));
            
            return {
                totalLoadTime: navTiming.total,
                domContentLoaded: navTiming.domProcessing,
                resourceCount: resources.length,
                totalResourceSize: totalResourceSize,
                slowResources: slowResources,
                customMetricsCount: Object.keys(this.metrics).length
            };
        },
        
        logReport: function() {
            const report = this.getReport();
            console.group('📊 性能分析报告');
            console.log('时间戳:', report.timestamp);
            console.log('\n⏱️ 导航计时:');
            console.table(report.navigationTiming);
            console.log('\n📦 资源统计:');
            console.log('脚本数量:', report.resourceTiming.scripts.length);
            console.log('样式数量:', report.resourceTiming.styles.length);
            console.log('图片数量:', report.resourceTiming.images.length);
            console.log('\n📈 自定义指标:');
            console.table(report.customMetrics);
            console.log('\n⚠️ 慢资源 (>500ms):');
            console.table(report.summary.slowResources);
            console.groupEnd();
            
            return report;
        }
    };
    
    window.PerformanceMonitor.init();
    
    window.addEventListener('load', function() {
        setTimeout(function() {
            window.PerformanceMonitor.mark('page_load_complete');
            window.PerformanceMonitor.measure('total_page_load', 'app_start', 'page_load_complete');
            
            if (window.location.search.includes('debug=performance')) {
                window.PerformanceMonitor.logReport();
            }
        }, 0);
    });
    
})();
