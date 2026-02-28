"""
LLM服务商抽象基类

定义所有LLM服务商必须实现的统一接口
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, AsyncGenerator, Generator
from dataclasses import dataclass
from enum import Enum


class StreamEventType(Enum):
    CONTENT = "content"
    REASONING = "reasoning"
    DONE = "done"
    ERROR = "error"


@dataclass
class StreamEvent:
    type: StreamEventType
    delta: str = ""
    usage: Optional[Dict] = None
    error: Optional[str] = None


@dataclass
class LLMResponse:
    content: str
    model: str
    provider: str
    usage: Dict[str, int]
    reasoning_content: Optional[str] = None


@dataclass
class ModelInfo:
    id: str
    name: str
    type: str
    context: str
    free: bool = False
    thinking: bool = False
    thinking_only: bool = False


class BaseLLMProvider(ABC):
    """LLM服务商抽象基类"""
    
    provider_name: str = "base"
    
    def __init__(self, api_key: str, config: Dict):
        self.api_key = api_key
        self.config = config
        self._client = None
    
    @abstractmethod
    def _init_client(self):
        """初始化SDK客户端"""
        pass
    
    @property
    def client(self):
        if self._client is None:
            self._client = self._init_client()
        return self._client
    
    @abstractmethod
    def complete(
        self,
        messages: List[Dict],
        model: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> LLMResponse:
        """
        非流式完成
        
        Args:
            messages: 消息列表 [{"role": "user", "content": "..."}]
            model: 模型ID
            temperature: 温度参数
            max_tokens: 最大输出token数
            **kwargs: 其他参数
            
        Returns:
            LLMResponse: 统一格式的响应
        """
        pass
    
    @abstractmethod
    def stream(
        self,
        messages: List[Dict],
        model: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> Generator[StreamEvent, None, None]:
        """
        流式完成
        
        Args:
            messages: 消息列表
            model: 模型ID
            temperature: 温度参数
            max_tokens: 最大输出token数
            **kwargs: 其他参数
            
        Yields:
            StreamEvent: 统一格式的流式事件
        """
        pass
    
    def get_model_list(self) -> List[ModelInfo]:
        """获取支持的模型列表"""
        models = self.config.get("models", [])
        return [
            ModelInfo(
                id=m.get("id"),
                name=m.get("name", m.get("id")),
                type=m.get("type", "chat"),
                context=m.get("context", "128K"),
                free=m.get("free", False),
                thinking=m.get("thinking", False),
                thinking_only=m.get("thinking_only", False)
            )
            for m in models
        ]
    
    def get_default_model(self) -> str:
        """获取默认模型"""
        return self.config.get("default_model", "")
    
    def get_features(self) -> Dict[str, bool]:
        """获取支持的功能"""
        return self.config.get("features", {})
    
    def supports_feature(self, feature: str) -> bool:
        """检查是否支持某功能"""
        return self.get_features().get(feature, False)
    
    @abstractmethod
    def parse_error(self, error: Any) -> Dict:
        """
        解析错误为统一格式
        
        Args:
            error: 原始错误对象
            
        Returns:
            Dict: {"code": "...", "message": "...", "provider": "..."}
        """
        pass
    
    def _build_usage_dict(self, usage_obj: Any) -> Dict[str, int]:
        """构建统一的usage字典"""
        if usage_obj is None:
            return {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        
        return {
            "prompt_tokens": getattr(usage_obj, 'prompt_tokens', 0) or 0,
            "completion_tokens": getattr(usage_obj, 'completion_tokens', 0) or 0,
            "total_tokens": getattr(usage_obj, 'total_tokens', 0) or 0
        }
