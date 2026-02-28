"""
智谱AI Provider实现

封装ZhipuAI SDK调用，实现统一接口
"""

from typing import Dict, List, Any, Optional, Generator
from zhipuai import ZhipuAI

from .base_provider import BaseLLMProvider, LLMResponse, StreamEvent, StreamEventType


class ZhipuProvider(BaseLLMProvider):
    """智谱AI Provider"""
    
    provider_name = "zhipu"
    
    def _init_client(self) -> ZhipuAI:
        """初始化ZhipuAI客户端"""
        return ZhipuAI(api_key=self.api_key)
    
    def complete(
        self,
        messages: List[Dict],
        model: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> LLMResponse:
        """非流式完成"""
        extra_params = {}
        
        if max_tokens:
            extra_params["max_tokens"] = max_tokens
        
        if "tools" in kwargs:
            extra_params["tools"] = kwargs["tools"]
        
        if "tool_choice" in kwargs:
            extra_params["tool_choice"] = kwargs["tool_choice"]
        
        response = self.client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            stream=False,
            **extra_params
        )
        
        reasoning_content = None
        if hasattr(response.choices[0].message, 'reasoning_content'):
            reasoning_content = response.choices[0].message.reasoning_content
        
        return LLMResponse(
            content=response.choices[0].message.content,
            model=response.model,
            provider=self.provider_name,
            usage=self._build_usage_dict(response.usage),
            reasoning_content=reasoning_content
        )
    
    def stream(
        self,
        messages: List[Dict],
        model: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> Generator[StreamEvent, None, None]:
        """流式完成"""
        extra_params = {}
        
        if max_tokens:
            extra_params["max_tokens"] = max_tokens
        
        if "tools" in kwargs:
            extra_params["tools"] = kwargs["tools"]
        
        if "tool_choice" in kwargs:
            extra_params["tool_choice"] = kwargs["tool_choice"]
        
        if "web_search" in kwargs and kwargs["web_search"]:
            extra_params["tools"] = [{"type": "web_search", "web_search": {"enable": True}}]
        
        stream = self.client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            stream=True,
            **extra_params
        )
        
        for chunk in stream:
            if not chunk.choices:
                if hasattr(chunk, 'usage') and chunk.usage:
                    yield StreamEvent(
                        type=StreamEventType.DONE,
                        usage=self._build_usage_dict(chunk.usage)
                    )
                continue
            
            delta = chunk.choices[0].delta
            
            if hasattr(delta, 'reasoning_content') and delta.reasoning_content:
                yield StreamEvent(
                    type=StreamEventType.REASONING,
                    delta=delta.reasoning_content
                )
            
            if delta.content:
                yield StreamEvent(
                    type=StreamEventType.CONTENT,
                    delta=delta.content
                )
            
            if chunk.choices[0].finish_reason:
                yield StreamEvent(
                    type=StreamEventType.DONE,
                    usage=self._build_usage_dict(getattr(chunk, 'usage', None))
                )
    
    def parse_error(self, error: Any) -> Dict:
        """解析智谱AI错误"""
        error_code = getattr(error, 'code', None)
        error_message = str(error)
        
        if hasattr(error, 'response') and error.response:
            try:
                error_data = error.response.json()
                error_code = error_data.get('error', {}).get('code', error_code)
                error_message = error_data.get('error', {}).get('message', error_message)
            except Exception:
                pass
        
        return {
            "code": error_code or "unknown",
            "message": error_message,
            "provider": self.provider_name
        }
    
    def web_search(
        self,
        messages: List[Dict],
        model: str = None,
        temperature: float = 0.7,
        **kwargs
    ) -> Generator[StreamEvent, None, None]:
        """
        联网搜索（智谱AI特有）
        
        Args:
            messages: 消息列表
            model: 模型ID
            temperature: 温度参数
            **kwargs: 其他参数
            
        Yields:
            StreamEvent: 流式事件
        """
        model = model or self.get_default_model()
        
        yield from self.stream(
            messages=messages,
            model=model,
            temperature=temperature,
            web_search=True,
            **kwargs
        )
