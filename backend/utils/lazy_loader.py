"""
Backend Lazy Loader

后端延迟加载模块，用于优化模块初始化顺序
"""

import importlib
import sys
import time
from functools import wraps
from typing import Dict, Any, Callable, Optional

class LazyModuleLoader:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._modules: Dict[str, Any] = {}
        self._loading: Dict[str, bool] = {}
        self._factories: Dict[str, Callable] = {}
        self._load_times: Dict[str, float] = {}
    
    def register_lazy(self, name: str, factory: Callable):
        self._factories[name] = factory
        print(f"[LazyLoader] 注册延迟加载模块: {name}")
    
    def get(self, name: str) -> Optional[Any]:
        if name in self._modules:
            return self._modules[name]
        
        if name in self._factories:
            return self._load_module(name)
        
        return None
    
    def _load_module(self, name: str) -> Optional[Any]:
        if name in self._loading:
            print(f"[LazyLoader] 模块 {name} 正在加载中，等待...")
            while name in self._loading:
                time.sleep(0.01)
            return self._modules.get(name)
        
        if name not in self._factories:
            print(f"[LazyLoader] 模块 {name} 未注册")
            return None
        
        self._loading[name] = True
        start_time = time.time()
        
        try:
            print(f"[LazyLoader] 开始加载模块: {name}")
            module = self._factories[name]()
            self._modules[name] = module
            
            load_time = (time.time() - start_time) * 1000
            self._load_times[name] = load_time
            print(f"[LazyLoader] 模块 {name} 加载完成，耗时 {load_time:.2f}ms")
            
            return module
        except Exception as e:
            print(f"[LazyLoader] 模块 {name} 加载失败: {e}")
            return None
        finally:
            del self._loading[name]
    
    def preload_critical(self, names: list):
        print(f"[LazyLoader] 预加载关键模块: {names}")
        for name in names:
            if name in self._factories and name not in self._modules:
                self._load_module(name)
    
    def get_load_stats(self) -> Dict:
        return {
            'loaded_modules': list(self._modules.keys()),
            'pending_modules': [k for k in self._factories.keys() if k not in self._modules],
            'load_times': self._load_times
        }


lazy_loader = LazyModuleLoader()


def lazy_import(module_path: str):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if module_path not in sys.modules:
                start = time.time()
                module = importlib.import_module(module_path)
                load_time = (time.time() - start) * 1000
                if load_time > 50:
                    print(f"[LazyImport] {module_path} 导入耗时 {load_time:.2f}ms")
            return func(*args, **kwargs)
        return wrapper
    return decorator


def defer_import(module_path: str):
    _cached_module = None
    
    def get_module():
        nonlocal _cached_module
        if _cached_module is None:
            start = time.time()
            _cached_module = importlib.import_module(module_path)
            load_time = (time.time() - start) * 1000
            if load_time > 50:
                print(f"[DeferImport] {module_path} 延迟导入耗时 {load_time:.2f}ms")
        return _cached_module
    
    class LazyModule:
        def __getattr__(self, name):
            module = get_module()
            return getattr(module, name)
    
    return LazyModule()


class BlueprintLazyLoader:
    def __init__(self, app):
        self.app = app
        self._blueprints = {}
        self._loaded = set()
    
    def register_lazy(self, name: str, import_path: str, url_prefix: str = None):
        self._blueprints[name] = {
            'import_path': import_path,
            'url_prefix': url_prefix
        }
    
    def load_blueprint(self, name: str):
        if name in self._loaded:
            return True
        
        if name not in self._blueprints:
            return False
        
        bp_info = self._blueprints[name]
        start = time.time()
        
        try:
            module = importlib.import_module(bp_info['import_path'])
            bp = getattr(module, f"{name}_bp", None)
            
            if bp:
                url_prefix = bp_info.get('url_prefix')
                if url_prefix:
                    self.app.register_blueprint(bp, url_prefix=url_prefix)
                else:
                    self.app.register_blueprint(bp)
                
                self._loaded.add(name)
                load_time = (time.time() - start) * 1000
                print(f"[BlueprintLoader] {name} 加载完成，耗时 {load_time:.2f}ms")
                return True
            else:
                print(f"[BlueprintLoader] 未找到 blueprint: {name}_bp")
                return False
        except Exception as e:
            print(f"[BlueprintLoader] 加载 {name} 失败: {e}")
            return False
    
    def load_on_demand(self, blueprint_name: str):
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                if blueprint_name not in self._loaded:
                    self.load_blueprint(blueprint_name)
                return func(*args, **kwargs)
            return wrapper
        return decorator
