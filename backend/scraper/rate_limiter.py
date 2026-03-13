"""
Rate limiter for patent scraping.
Implements token bucket algorithm with global and per-user limits.
"""

import time
import threading
import logging
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class RateLimitStats:
    total_requests: int = 0
    total_wait_time: float = 0.0
    rate_limit_hits: int = 0
    last_request_time: Optional[float] = None
    blocked_requests: int = 0


class TokenBucket:
    def __init__(self, rate: float, capacity: int):
        self.rate = rate
        self.capacity = capacity
        self.tokens = capacity
        self.last_update = time.time()
        self.lock = threading.Lock()
    
    def acquire(self, tokens: int = 1, timeout: Optional[float] = None) -> Tuple[bool, float]:
        start_time = time.time()
        
        while True:
            with self.lock:
                now = time.time()
                elapsed = now - self.last_update
                self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
                self.last_update = now
                
                if self.tokens >= tokens:
                    self.tokens -= tokens
                    wait_time = time.time() - start_time
                    return True, wait_time
            
            if timeout is not None:
                if time.time() - start_time >= timeout:
                    return False, time.time() - start_time
            
            time.sleep(0.1)


class GlobalRateLimiter:
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
        
        self.global_bucket = TokenBucket(
            rate=0.8,
            capacity=10
        )
        
        self.user_buckets: Dict[str, TokenBucket] = defaultdict(
            lambda: TokenBucket(rate=0.3, capacity=5)
        )
        
        self.user_request_counts: Dict[str, list] = defaultdict(list)
        
        self.user_hourly_limit = 100
        self.user_minute_limit = 20
        
        self.stats = RateLimitStats()
        self.stats_lock = threading.Lock()
        
        self._cleanup_thread = threading.Thread(target=self._cleanup_old_entries, daemon=True)
        self._cleanup_thread.start()
    
    def acquire(self, user_id: str = 'anonymous', timeout: float = 60.0) -> Tuple[bool, str]:
        if not user_id or user_id == 'None':
            user_id = 'anonymous'
        
        now = time.time()
        
        with self.stats_lock:
            self.stats.total_requests += 1
        
        user_requests = self.user_request_counts[user_id]
        user_requests.append(now)
        
        minute_ago = now - 60
        hour_ago = now - 3600
        
        minute_count = sum(1 for t in user_requests if t > minute_ago)
        hour_count = sum(1 for t in user_requests if t > hour_ago)
        
        if minute_count > self.user_minute_limit:
            with self.stats_lock:
                self.stats.blocked_requests += 1
            return False, f"用户请求过于频繁，每分钟最多{self.user_minute_limit}次请求，请稍后再试"
        
        if hour_count > self.user_hourly_limit:
            with self.stats_lock:
                self.stats.blocked_requests += 1
            return False, f"用户请求已达上限，每小时最多{self.user_hourly_limit}次请求"
        
        success, wait_time = self.global_bucket.acquire(1, timeout)
        
        if success:
            with self.stats_lock:
                self.stats.total_wait_time += wait_time
                self.stats.last_request_time = time.time()
                if wait_time > 0.5:
                    self.stats.rate_limit_hits += 1
            return True, ""
        else:
            with self.stats_lock:
                self.stats.blocked_requests += 1
            return False, "全局请求队列已满，请稍后再试"
    
    def _cleanup_old_entries(self):
        while True:
            time.sleep(300)
            now = time.time()
            hour_ago = now - 3600
            
            for user_id in list(self.user_request_counts.keys()):
                self.user_request_counts[user_id] = [
                    t for t in self.user_request_counts[user_id] if t > hour_ago
                ]
                if not self.user_request_counts[user_id]:
                    del self.user_request_counts[user_id]
    
    def get_stats(self) -> Dict:
        with self.stats_lock:
            return {
                'total_requests': self.stats.total_requests,
                'total_wait_time': round(self.stats.total_wait_time, 2),
                'rate_limit_hits': self.stats.rate_limit_hits,
                'last_request_time': self.stats.last_request_time,
                'blocked_requests': self.stats.blocked_requests,
                'current_tokens': self.global_bucket.tokens
            }
    
    def get_user_stats(self, user_id: str) -> Dict:
        if not user_id or user_id == 'None':
            user_id = 'anonymous'
        
        now = time.time()
        user_requests = self.user_request_counts.get(user_id, [])
        
        minute_ago = now - 60
        hour_ago = now - 3600
        
        minute_count = sum(1 for t in user_requests if t > minute_ago)
        hour_count = sum(1 for t in user_requests if t > hour_ago)
        
        return {
            'user_id': user_id,
            'minute_count': minute_count,
            'minute_limit': self.user_minute_limit,
            'hour_count': hour_count,
            'hour_limit': self.user_hourly_limit,
            'minute_remaining': max(0, self.user_minute_limit - minute_count),
            'hour_remaining': max(0, self.user_hourly_limit - hour_count)
        }


class RequestQueue:
    _instance = None
    _lock = threading.Lock()
    
    def __init__(self, max_size: int = 100):
        if RequestQueue._instance is not None:
            raise RuntimeError("Use get_instance() to get the singleton instance")
        
        self.max_size = max_size
        self.current_size = 0
        self.size_lock = threading.Lock()
        self.condition = threading.Condition(self.size_lock)
    
    @classmethod
    def get_instance(cls, max_size: int = 100):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls(max_size)
        return cls._instance
    
    def acquire_slot(self, timeout: float = 30.0) -> bool:
        start_time = time.time()
        
        with self.condition:
            while self.current_size >= self.max_size:
                remaining = timeout - (time.time() - start_time)
                if remaining <= 0:
                    return False
                self.condition.wait(remaining)
            
            self.current_size += 1
            return True
    
    def release_slot(self):
        with self.condition:
            self.current_size = max(0, self.current_size - 1)
            self.condition.notify_all()
    
    def get_stats(self) -> Dict:
        with self.size_lock:
            return {
                'current_size': self.current_size,
                'max_size': self.max_size,
                'available_slots': self.max_size - self.current_size
            }


def get_rate_limiter() -> GlobalRateLimiter:
    return GlobalRateLimiter()


def get_request_queue() -> RequestQueue:
    return RequestQueue.get_instance()
