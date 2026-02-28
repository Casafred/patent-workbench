"""
Provider工厂类

根据配置创建和管理Provider实例
"""

import json
import os
from typing import Dict, Optional, Type

from .base_provider import BaseLLMProvider
from .zhipu_provider import ZhipuProvider
from .aliyun_provider import AliyunProvider


PROVIDER_CLASSES: Dict[str, Type[BaseLLMProvider]] = {
    "zhipu": ZhipuProvider,
    "aliyun": AliyunProvider
}


class ProviderFactory:
    """Provider工厂类"""
    
    _instance = None
    _config: Dict = None
    _providers: Dict[str, Dict[str, BaseLLMProvider]] = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._config is None:
            self._load_config()
    
    def _load_config(self) -> Dict:
        """加载服务商配置"""
        config_paths = [
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), 'config', 'providers.json'),
            '/etc/secrets/providers.json'
        ]
        
        for path in config_paths:
            if os.path.exists(path):
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        self._config = json.load(f)
                        return self._config
                except Exception as e:
                    print(f"[ProviderFactory] 加载配置失败 ({path}): {e}")
        
        self._config = {"providers": {}, "default_provider": "zhipu"}
        return self._config
    
    def get_provider_config(self, provider_name: str) -> Optional[Dict]:
        """获取指定服务商的配置"""
        return self._config.get("providers", {}).get(provider_name)
    
    def get_default_provider_name(self) -> str:
        """获取默认服务商名称"""
        return self._config.get("default_provider", "zhipu")
    
    def get_enabled_providers(self) -> list:
        """获取已启用的服务商列表"""
        providers = []
        for name, config in self._config.get("providers", {}).items():
            if config.get("enabled", True):
                providers.append({
                    "id": name,
                    "name": config.get("name", name),
                    "features": config.get("features", {}),
                    "models": config.get("models", [])
                })
        return providers
    
    def get_provider(
        self,
        provider_name: str,
        api_key: str,
        use_cache: bool = True
    ) -> BaseLLMProvider:
        """
        获取Provider实例
        
        Args:
            provider_name: 服务商名称
            api_key: API密钥
            use_cache: 是否使用缓存的实例
            
        Returns:
            BaseLLMProvider: Provider实例
        """
        if provider_name not in PROVIDER_CLASSES:
            raise ValueError(f"未知的服务商: {provider_name}")
        
        if use_cache:
            cache_key = f"{provider_name}:{api_key[:8]}..."
            if provider_name not in self._providers:
                self._providers[provider_name] = {}
            
            if cache_key in self._providers[provider_name]:
                return self._providers[provider_name][cache_key]
        
        provider_config = self.get_provider_config(provider_name)
        if not provider_config:
            raise ValueError(f"服务商配置不存在: {provider_name}")
        
        provider_class = PROVIDER_CLASSES[provider_name]
        provider = provider_class(api_key=api_key, config=provider_config)
        
        if use_cache:
            cache_key = f"{provider_name}:{api_key[:8]}..."
            self._providers[provider_name][cache_key] = provider
        
        return provider
    
    def get_provider_for_model(self, model_id: str) -> Optional[str]:
        """
        根据模型ID查找对应的服务商
        
        Args:
            model_id: 模型ID
            
        Returns:
            str: 服务商名称，未找到返回None
        """
        for provider_name, config in self._config.get("providers", {}).items():
            models = config.get("models", [])
            for model in models:
                if model.get("id") == model_id:
                    return provider_name
        return None
    
    def get_model_info(self, model_id: str) -> Optional[Dict]:
        """
        获取模型信息
        
        Args:
            model_id: 模型ID
            
        Returns:
            Dict: 模型信息
        """
        for provider_name, config in self._config.get("providers", {}).items():
            models = config.get("models", [])
            for model in models:
                if model.get("id") == model_id:
                    model["provider"] = provider_name
                    return model
        return None
    
    def is_feature_supported(self, provider_name: str, feature: str) -> bool:
        """
        检查服务商是否支持某功能
        
        Args:
            provider_name: 服务商名称
            feature: 功能名称
            
        Returns:
            bool: 是否支持
        """
        config = self.get_provider_config(provider_name)
        if not config:
            return False
        return config.get("features", {}).get(feature, False)
    
    def clear_cache(self):
        """清除Provider缓存"""
        self._providers.clear()
    
    def reload_config(self):
        """重新加载配置"""
        self._config = None
        self._load_config()
        self.clear_cache()


_factory_instance = None


def get_factory() -> ProviderFactory:
    """获取ProviderFactory单例"""
    global _factory_instance
    if _factory_instance is None:
        _factory_instance = ProviderFactory()
    return _factory_instance
