"""
阿里云百炼 Provider实现

使用OpenAI兼容接口调用阿里云百炼API
"""

from typing import Dict, List, Any, Optional, Generator
from openai import OpenAI

from .base_provider import BaseLLMProvider, LLMResponse, StreamEvent, StreamEventType


ALIYUN_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"

THINKING_ONLY_MODELS = ["qwq-plus", "deepseek-r1", "kimi-k2-thinking"]


class AliyunProvider(BaseLLMProvider):
    """阿里云百炼 Provider"""
    
    provider_name = "aliyun"
    
    def _init_client(self) -> OpenAI:
        """初始化OpenAI兼容客户端"""
        return OpenAI(
            api_key=self.api_key,
            base_url=ALIYUN_BASE_URL
        )
    
    def _is_thinking_only_model(self, model: str) -> bool:
        """检查是否为仅思考模式模型"""
        return model in THINKING_ONLY_MODELS
    
    def _build_extra_body(self, kwargs: Dict) -> Dict:
        """构建阿里云特有的extra_body参数"""
        extra_body = {}
        
        if kwargs.get("enable_thinking", False):
            extra_body["enable_thinking"] = True
            
            if kwargs.get("thinking_budget"):
                extra_body["thinking_budget"] = kwargs["thinking_budget"]
        
        if kwargs.get("enable_search", False):
            extra_body["enable_search"] = True
        
        return extra_body if extra_body else None
    
    def complete(
        self,
        messages: List[Dict],
        model: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> LLMResponse:
        """非流式完成"""
        params = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "stream": False
        }
        
        if max_tokens:
            params["max_tokens"] = max_tokens
        
        if kwargs.get("response_format"):
            params["response_format"] = kwargs["response_format"]
        
        extra_body = self._build_extra_body(kwargs)
        if extra_body:
            params["extra_body"] = extra_body
        
        response = self.client.chat.completions.create(**params)
        
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
        params = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "stream": True,
            "stream_options": {"include_usage": True}
        }
        
        if max_tokens:
            params["max_tokens"] = max_tokens
        
        if kwargs.get("response_format"):
            params["response_format"] = kwargs["response_format"]
        
        extra_body = self._build_extra_body(kwargs)
        if extra_body:
            params["extra_body"] = extra_body
        
        stream = self.client.chat.completions.create(**params)
        
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
                usage = None
                if hasattr(chunk, 'usage'):
                    usage = self._build_usage_dict(chunk.usage)
                yield StreamEvent(
                    type=StreamEventType.DONE,
                    usage=usage
                )
    
    def complete_with_thinking(
        self,
        messages: List[Dict],
        model: str = None,
        temperature: float = 0.7,
        thinking_budget: Optional[int] = None,
        **kwargs
    ) -> Generator[StreamEvent, None, None]:
        """
        开启思考模式的流式完成
        
        Args:
            messages: 消息列表
            model: 模型ID
            temperature: 温度参数
            thinking_budget: 思考过程最大Token数
            **kwargs: 其他参数
            
        Yields:
            StreamEvent: 流式事件（先返回reasoning，后返回content）
        """
        model = model or self.get_default_model()
        
        thinking_kwargs = {**kwargs, "enable_thinking": True}
        if thinking_budget:
            thinking_kwargs["thinking_budget"] = thinking_budget
        
        yield from self.stream(
            messages=messages,
            model=model,
            temperature=temperature,
            **thinking_kwargs
        )
    
    def complete_with_search(
        self,
        messages: List[Dict],
        model: str = None,
        temperature: float = 0.7,
        **kwargs
    ) -> Generator[StreamEvent, None, None]:
        """
        开启联网搜索的流式完成
        
        Args:
            messages: 消息列表
            model: 模型ID
            temperature: 温度参数
            **kwargs: 其他参数
            
        Yields:
            StreamEvent: 流式事件
        """
        model = model or self.get_default_model()
        
        search_kwargs = {**kwargs, "enable_search": True}
        
        yield from self.stream(
            messages=messages,
            model=model,
            temperature=temperature,
            **search_kwargs
        )
    
    def complete_structured(
        self,
        messages: List[Dict],
        response_format: Dict,
        model: str = None,
        temperature: float = 0.7,
        **kwargs
    ) -> LLMResponse:
        """
        结构化输出
        
        Args:
            messages: 消息列表
            response_format: 响应格式定义
                - {"type": "json_object"}: JSON Object模式
                - {"type": "json_schema", "json_schema": {...}}: JSON Schema模式
            model: 模型ID
            temperature: 温度参数
            **kwargs: 其他参数
            
        Returns:
            LLMResponse: 结构化响应
        """
        model = model or self.get_default_model()
        
        return self.complete(
            messages=messages,
            model=model,
            temperature=temperature,
            response_format=response_format,
            **kwargs
        )
    
    def parse_error(self, error: Any) -> Dict:
        """解析阿里云百炼错误"""
        error_code = getattr(error, 'code', None)
        error_message = str(error)
        
        if hasattr(error, 'response') and error.response:
            try:
                error_data = error.response.json()
                error_code = error_data.get('error', {}).get('code', error_code)
                error_message = error_data.get('error', {}).get('message', error_message)
            except Exception:
                pass
        
        if hasattr(error, 'status_code'):
            error_code = error_code or f"http_{error.status_code}"
        
        return {
            "code": error_code or "unknown",
            "message": error_message,
            "provider": self.provider_name
        }
    
    def get_features(self) -> Dict[str, bool]:
        """获取支持的功能"""
        features = super().get_features()
        features["thinking_models"] = THINKING_ONLY_MODELS
        return features
