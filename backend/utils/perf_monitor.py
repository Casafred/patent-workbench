"""
Performance Monitor - Optional performance monitoring module.

This module provides optional performance monitoring that can be enabled
via environment variable. It does NOT affect core functionality.

Usage:
    Set ENABLE_PERFORMANCE_MONITOR=true to enable monitoring.
"""

import os
import time
import threading
from functools import wraps

_enabled = os.environ.get('ENABLE_PERFORMANCE_MONITOR', 'false').lower() == 'true'

_metrics = {}
_lock = threading.Lock()


def is_enabled():
    return _enabled


def record_request(endpoint, duration_ms, status_code):
    if not _enabled:
        return
    
    with _lock:
        if endpoint not in _metrics:
            _metrics[endpoint] = {
                'count': 0,
                'total_time': 0,
                'avg_time': 0,
                'max_time': 0,
                'errors': 0
            }
        
        m = _metrics[endpoint]
        m['count'] += 1
        m['total_time'] += duration_ms
        m['avg_time'] = m['total_time'] / m['count']
        m['max_time'] = max(m['max_time'], duration_ms)
        if status_code >= 400:
            m['errors'] += 1


def get_metrics():
    with _lock:
        return dict(_metrics)


def reset_metrics():
    global _metrics
    with _lock:
        _metrics = {}


def measure_time(func):
    """Decorator to measure function execution time."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        if not _enabled:
            return func(*args, **kwargs)
        
        start = time.time()
        try:
            return func(*args, **kwargs)
        finally:
            duration = (time.time() - start) * 1000
            if duration > 100:
                print(f"[Perf] {func.__name__}: {duration:.1f}ms")
    return wrapper


def setup_request_hooks(app):
    """
    Setup performance monitoring hooks for Flask app.
    Only activates if ENABLE_PERFORMANCE_MONITOR=true.
    
    This should be called AFTER all blueprints are registered.
    """
    if not _enabled:
        print("Performance monitoring is disabled")
        return
    
    from flask import request, g
    
    @app.before_request
    def _perf_before_request():
        g._perf_start = time.time()
    
    @app.after_request
    def _perf_after_request(response):
        if hasattr(g, '_perf_start'):
            duration = (time.time() - g._perf_start) * 1000
            endpoint = request.endpoint or 'unknown'
            record_request(endpoint, duration, response.status_code)
        return response
    
    print("✓ Performance monitoring enabled")
