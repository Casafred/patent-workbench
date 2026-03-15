"""
Backend Performance Monitor Middleware

后端性能监控中间件，用于测量每个API请求的处理时间
"""

import time
import functools
from flask import request, g
import threading

class BackendPerformanceMonitor:
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self.metrics = {}
        self.slow_requests = []
        self.max_slow_requests = 100
        self.slow_threshold_ms = 1000
    
    def start_request(self, endpoint):
        g.perf_start_time = time.time()
        g.perf_endpoint = endpoint
    
    def end_request(self, endpoint, status_code):
        if not hasattr(g, 'perf_start_time'):
            return
        
        duration_ms = (time.time() - g.perf_start_time) * 1000
        
        if endpoint not in self.metrics:
            self.metrics[endpoint] = {
                'count': 0,
                'total_time': 0,
                'min_time': float('inf'),
                'max_time': 0,
                'avg_time': 0
            }
        
        metric = self.metrics[endpoint]
        metric['count'] += 1
        metric['total_time'] += duration_ms
        metric['min_time'] = min(metric['min_time'], duration_ms)
        metric['max_time'] = max(metric['max_time'], duration_ms)
        metric['avg_time'] = metric['total_time'] / metric['count']
        
        if duration_ms > self.slow_threshold_ms:
            self.slow_requests.append({
                'endpoint': endpoint,
                'duration_ms': duration_ms,
                'status_code': status_code,
                'timestamp': time.time()
            })
            
            if len(self.slow_requests) > self.max_slow_requests:
                self.slow_requests.pop(0)
    
    def get_metrics(self):
        return {
            'endpoints': dict(self.metrics),
            'slow_requests': list(self.slow_requests[-20:]),
            'summary': self._get_summary()
        }
    
    def _get_summary(self):
        if not self.metrics:
            return {}
        
        total_requests = sum(m['count'] for m in self.metrics.values())
        total_time = sum(m['total_time'] for m in self.metrics.values())
        
        slowest_endpoints = sorted(
            self.metrics.items(),
            key=lambda x: x[1]['avg_time'],
            reverse=True
        )[:5]
        
        most_called_endpoints = sorted(
            self.metrics.items(),
            key=lambda x: x[1]['count'],
            reverse=True
        )[:5]
        
        return {
            'total_requests': total_requests,
            'total_time_ms': total_time,
            'avg_request_time_ms': total_time / total_requests if total_requests > 0 else 0,
            'slowest_endpoints': [
                {'endpoint': ep, 'avg_time': m['avg_time']}
                for ep, m in slowest_endpoints
            ],
            'most_called_endpoints': [
                {'endpoint': ep, 'count': m['count']}
                for ep, m in most_called_endpoints
            ]
        }
    
    def reset(self):
        self.metrics.clear()
        self.slow_requests.clear()


performance_monitor = BackendPerformanceMonitor()


def init_performance_middleware(app):
    @app.before_request
    def before_request():
        endpoint = request.endpoint or 'unknown'
        performance_monitor.start_request(endpoint)
    
    @app.after_request
    def after_request(response):
        endpoint = getattr(g, 'perf_endpoint', request.endpoint or 'unknown')
        performance_monitor.end_request(endpoint, response.status_code)
        return response
    
    @app.route('/api/performance/metrics')
    def get_performance_metrics():
        from flask import jsonify
        return jsonify(performance_monitor.get_metrics())
    
    @app.route('/api/performance/reset', methods=['POST'])
    def reset_performance_metrics():
        from flask import jsonify
        performance_monitor.reset()
        return jsonify({'success': True, 'message': 'Performance metrics reset'})
    
    print("✓ Performance monitoring middleware initialized")


def measure_time(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = time.time()
        try:
            result = func(*args, **kwargs)
            return result
        finally:
            duration = (time.time() - start) * 1000
            if duration > 100:
                print(f"[Performance] {func.__name__} took {duration:.2f}ms")
    return wrapper


def async_measure_time(func):
    @functools.wraps(func)
    async def wrapper(*args, **kwargs):
        start = time.time()
        try:
            result = await func(*args, **kwargs)
            return result
        finally:
            duration = (time.time() - start) * 1000
            if duration > 100:
                print(f"[Performance] {func.__name__} took {duration:.2f}ms")
    return wrapper
