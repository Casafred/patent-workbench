"""
LLM统一服务层

提供统一的LLM调用入口，屏蔽不同服务商的差异
"""

from typing import Dict, List, Optional, Generator, Any
from dataclasses import dataclass

from .base_provider import LLMResponse, StreamEvent, StreamEventType, ModelInfo
from .provider_factory import ProviderFactory, get_factory


@dataclass
class ServiceConfig:
    provider: str = "zhipu"
    model: Optional[str] = None
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    enable_thinking: bool = False
    thinking_budget: Optional[int] = None
    enable_search: bool = False
    response_format: Optional[Dict] = None


class LLMService:
    """
    LLM统一服务层
    
    提供统一的调用接口，自动处理服务商差异
    """
    
    def __init__(
        self,
        api_key: str,
        provider: str = None,
        factory: ProviderFactory = None
    ):
        self.api_key = api_key
        self.factory = factory or get_factory()
        self._default_provider = provider or self.factory.get_default_provider_name()
        self._provider_instance = None
    
    @property
    def provider(self) -> str:
        return self._default_provider
    
    @provider.setter
    def provider(self, value: str):
        self._default_provider = value
        self._provider_instance = None
    
    def _get_provider(self, provider_name: str = None):
        """获取Provider实例"""
        provider = provider_name or self._default_provider
        if self._provider_instance is None or provider != self._default_provider:
            self._provider_instance = self.factory.get_provider(
                provider_name=provider,
                api_key=self.api_key,
                use_cache=True
            )
        return self._provider_instance
    
    def complete(
        self,
        messages: List[Dict],
        model: str = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        provider: str = None,
        **kwargs
    ) -> LLMResponse:
        """
        非流式完成
        
        Args:
            messages: 消息列表
            model: 模型ID
            temperature: 温度参数
            max_tokens: 最大输出token数
            provider: 指定服务商
            **kwargs: 其他参数
            
        Returns:
            LLMResponse: 统一格式的响应
        """
        provider_instance = self._get_provider(provider)
        
        model = model or provider_instance.get_default_model()
        
        return provider_instance.complete(
            messages=messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            **kwargs
        )
    
    def stream(
        self,
        messages: List[Dict],
        model: str = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        provider: str = None,
        **kwargs
    ) -> Generator[StreamEvent, None, None]:
        """
        流式完成
        
        Args:
            messages: 消息列表
            model: 模型ID
            temperature: 温度参数
            max_tokens: 最大输出token数
            provider: 指定服务商
            **kwargs: 其他参数
            
        Yields:
            StreamEvent: 统一格式的流式事件
        """
        provider_instance = self._get_provider(provider)
        
        model = model or provider_instance.get_default_model()
        
        yield from provider_instance.stream(
            messages=messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            **kwargs
        )
    
    def stream_text(
        self,
        messages: List[Dict],
        model: str = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        provider: str = None,
        **kwargs
    ) -> Generator[str, None, None]:
        """
        流式完成（仅返回文本内容）
        
        Args:
            messages: 消息列表
            model: 模型ID
            temperature: 温度参数
            max_tokens: 最大输出token数
            provider: 指定服务商
            **kwargs: 其他参数
            
        Yields:
            str: 文本内容增量
        """
        for event in self.stream(
            messages=messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            provider=provider,
            **kwargs
        ):
            if event.type == StreamEventType.CONTENT:
                yield event.delta
    
    def complete_with_config(
        self,
        messages: List[Dict],
        config: ServiceConfig
    ) -> LLMResponse:
        """
        使用配置对象完成请求
        
        Args:
            messages: 消息列表
            config: 服务配置
            
        Returns:
            LLMResponse: 统一格式的响应
        """
        kwargs = {}
        
        if config.enable_thinking:
            kwargs["enable_thinking"] = True
            if config.thinking_budget:
                kwargs["thinking_budget"] = config.thinking_budget
        
        if config.enable_search:
            kwargs["enable_search"] = True
        
        if config.response_format:
            kwargs["response_format"] = config.response_format
        
        return self.complete(
            messages=messages,
            model=config.model,
            temperature=config.temperature,
            max_tokens=config.max_tokens,
            provider=config.provider,
            **kwargs
        )
    
    def stream_with_config(
        self,
        messages: List[Dict],
        config: ServiceConfig
    ) -> Generator[StreamEvent, None, None]:
        """
        使用配置对象流式完成请求
        
        Args:
            messages: 消息列表
            config: 服务配置
            
        Yields:
            StreamEvent: 统一格式的流式事件
        """
        kwargs = {}
        
        if config.enable_thinking:
            kwargs["enable_thinking"] = True
            if config.thinking_budget:
                kwargs["thinking_budget"] = config.thinking_budget
        
        if config.enable_search:
            kwargs["enable_search"] = True
        
        if config.response_format:
            kwargs["response_format"] = config.response_format
        
        yield from self.stream(
            messages=messages,
            model=config.model,
            temperature=config.temperature,
            max_tokens=config.max_tokens,
            provider=config.provider,
            **kwargs
        )
    
    def get_model_list(self, provider: str = None) -> List[ModelInfo]:
        """获取模型列表"""
        provider_instance = self._get_provider(provider)
        return provider_instance.get_model_list()
    
    def get_features(self, provider: str = None) -> Dict[str, bool]:
        """获取支持的功能"""
        provider_instance = self._get_provider(provider)
        return provider_instance.get_features()
    
    def supports_feature(self, feature: str, provider: str = None) -> bool:
        """检查是否支持某功能"""
        provider_instance = self._get_provider(provider)
        return provider_instance.supports_feature(feature)
    
    def get_default_model(self, provider: str = None) -> str:
        """获取默认模型"""
        provider_instance = self._get_provider(provider)
        return provider_instance.get_default_model()
    
    def parse_error(self, error: Any, provider: str = None) -> Dict:
        """解析错误"""
        provider_instance = self._get_provider(provider)
        return provider_instance.parse_error(error)


def create_service(
    api_key: str,
    provider: str = None,
    model: str = None
) -> LLMService:
    """
    创建LLMService实例的便捷方法
    
    Args:
        api_key: API密钥
        provider: 服务商名称
        model: 默认模型
        
    Returns:
        LLMService: 服务实例
    """
    service = LLMService(api_key=api_key, provider=provider)
    if model:
        service._default_model = model
    return service
