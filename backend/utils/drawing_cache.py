"""
Drawing OCR Cache Manager

Manages caching of OCR results for patent drawings to improve performance
and provide cache update notifications to users.
"""

import json
import time
import os
from typing import Dict, Optional
from pathlib import Path


class DrawingCacheManager:
    """
    Manages OCR result caching for patent drawings.
    
    Features:
    - In-memory cache for fast access
    - Persistent cache storage (optional)
    - Cache expiration (default: 7 days)
    - Cache key based on image content hash
    """
    
    def __init__(self, cache_dir: Optional[str] = None, max_age_days: int = 7):
        """
        Initialize cache manager.
        
        Args:
            cache_dir: Directory for persistent cache storage (None = memory only)
            max_age_days: Maximum cache age in days (default: 7)
        """
        self.cache = {}  # In-memory cache
        self.cache_dir = cache_dir
        self.max_age_seconds = max_age_days * 24 * 60 * 60
        
        # Create cache directory if specified
        if self.cache_dir:
            Path(self.cache_dir).mkdir(parents=True, exist_ok=True)
            self._load_persistent_cache()
    
    def get_cache(self, cache_key: str) -> Optional[Dict]:
        """
        Get cached OCR result.
        
        Args:
            cache_key: Cache key (typically: filename_hash)
            
        Returns:
            Cached result dict or None if not found/expired
        """
        # Check in-memory cache first
        if cache_key in self.cache:
            cached_data = self.cache[cache_key]
            
            # Check if expired
            if self._is_expired(cached_data):
                del self.cache[cache_key]
                return None
            
            return cached_data
        
        # Check persistent cache if enabled
        if self.cache_dir:
            cached_data = self._load_from_disk(cache_key)
            if cached_data and not self._is_expired(cached_data):
                # Load into memory cache
                self.cache[cache_key] = cached_data
                return cached_data
        
        return None
    
    def set_cache(self, cache_key: str, data: Dict) -> None:
        """
        Save OCR result to cache.
        
        Args:
            cache_key: Cache key
            data: OCR result data to cache
        """
        # Add timestamp
        cached_data = {
            **data,
            'timestamp': time.time()
        }
        
        # Save to memory cache
        self.cache[cache_key] = cached_data
        
        # Save to persistent cache if enabled
        if self.cache_dir:
            self._save_to_disk(cache_key, cached_data)
    
    def has_cache(self, cache_key: str) -> bool:
        """
        Check if cache exists for given key.
        
        Args:
            cache_key: Cache key
            
        Returns:
            True if cache exists and not expired
        """
        return self.get_cache(cache_key) is not None
    
    def clear_cache(self, cache_key: Optional[str] = None) -> None:
        """
        Clear cache.
        
        Args:
            cache_key: Specific key to clear (None = clear all)
        """
        if cache_key:
            # Clear specific cache
            if cache_key in self.cache:
                del self.cache[cache_key]
            
            if self.cache_dir:
                cache_file = self._get_cache_file_path(cache_key)
                if cache_file.exists():
                    cache_file.unlink()
        else:
            # Clear all cache
            self.cache.clear()
            
            if self.cache_dir:
                for cache_file in Path(self.cache_dir).glob('*.json'):
                    cache_file.unlink()
    
    def cleanup_expired(self) -> int:
        """
        Remove expired cache entries.
        
        Returns:
            Number of entries removed
        """
        removed_count = 0
        
        # Clean memory cache
        expired_keys = [
            key for key, data in self.cache.items()
            if self._is_expired(data)
        ]
        
        for key in expired_keys:
            del self.cache[key]
            removed_count += 1
        
        # Clean persistent cache
        if self.cache_dir:
            for cache_file in Path(self.cache_dir).glob('*.json'):
                try:
                    with open(cache_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    
                    if self._is_expired(data):
                        cache_file.unlink()
                        removed_count += 1
                except Exception:
                    # Remove corrupted cache files
                    cache_file.unlink()
                    removed_count += 1
        
        return removed_count
    
    def _is_expired(self, cached_data: Dict) -> bool:
        """Check if cached data is expired."""
        timestamp = cached_data.get('timestamp', 0)
        age = time.time() - timestamp
        return age > self.max_age_seconds
    
    def _get_cache_file_path(self, cache_key: str) -> Path:
        """Get file path for cache key."""
        # Sanitize cache key for filename
        safe_key = cache_key.replace('/', '_').replace('\\', '_')
        return Path(self.cache_dir) / f"{safe_key}.json"
    
    def _load_from_disk(self, cache_key: str) -> Optional[Dict]:
        """Load cache from disk."""
        cache_file = self._get_cache_file_path(cache_key)
        
        if not cache_file.exists():
            return None
        
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"[WARNING] Failed to load cache from {cache_file}: {e}")
            return None
    
    def _save_to_disk(self, cache_key: str, data: Dict) -> None:
        """Save cache to disk."""
        cache_file = self._get_cache_file_path(cache_key)
        
        try:
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[WARNING] Failed to save cache to {cache_file}: {e}")
    
    def _load_persistent_cache(self) -> None:
        """Load all persistent cache into memory on startup."""
        if not self.cache_dir:
            return
        
        cache_dir_path = Path(self.cache_dir)
        if not cache_dir_path.exists():
            return
        
        for cache_file in cache_dir_path.glob('*.json'):
            try:
                with open(cache_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # Skip expired cache
                if self._is_expired(data):
                    cache_file.unlink()
                    continue
                
                # Extract cache key from filename
                cache_key = cache_file.stem
                self.cache[cache_key] = data
                
            except Exception as e:
                print(f"[WARNING] Failed to load cache file {cache_file}: {e}")
                # Remove corrupted file
                try:
                    cache_file.unlink()
                except Exception:
                    pass
