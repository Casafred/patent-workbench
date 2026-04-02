"""
CLI Agent AI模型服务

集成智谱AI、阿里云千问、DeepSeek等AI模型。
"""

import time
import json
from typing import Dict, List, Any, Optional, Generator, Callable
from abc import ABC, abstractmethod

from cli_agent.core.exceptions import ModelError, AuthenticationError, ValidationError
from cli_agent.core.logger import Logger


class BaseAIProvider(ABC):
    """AI服务提供商基类"""
    
    def __init__(self, api_key: str, config: dict = None):
        self.api_key = api_key
        self.config = config or {}
        self.logger = Logger.get_instance().get_logger(f"ai_provider_{self.name}")
    
    @property
    @abstractmethod
    def name(self) -> str:
        """提供商名称"""
        pass
    
    @property
    @abstractmethod
    def models(self) -> List[str]:
        """支持的模型列表"""
        pass
    
    @property
    @abstractmethod
    def default_model(self) -> str:
        """默认模型"""
        pass
    
    @abstractmethod
    def chat(
        self,
        messages: List[Dict[str, str]],
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        stream: bool = False,
        **kwargs
    ) -> Any:
        """发送聊天请求"""
        pass
    
    def validate_model(self, model: str) -> bool:
        """验证模型是否支持"""
        return model in self.models


class ZhipuProvider(BaseAIProvider):
    """智谱AI提供商"""
    
    @property
    def name(self) -> str:
        return "zhipu"
    
    @property
    def models(self) -> List[str]:
        return [
            "glm-4-flash", "glm-4-flashx-250414", "glm-4-flash-250414",
            "glm-4-long", "glm-4-plus", "glm-4-air-250414", "glm-4-airx",
            "glm-4.5-air", "glm-4.5-airx", "glm-4.7-flash", "glm-4.7-flashx",
            "glm-4.7", "glm-z1-flash", "glm-z1-flashx", "glm-z1-air", "glm-z1-airx"
        ]
    
    @property
    def default_model(self) -> str:
        return "glm-4-flash"
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        stream: bool = False,
        **kwargs
    ) -> Any:
        try:
            from zhipuai import ZhipuAI
        except ImportError:
            raise ModelError(
                "zhipuai库未安装，请运行: pip install zhipuai",
                provider=self.name
            )
        
        model = model or self.default_model
        
        if not self.validate_model(model):
            raise ValidationError(
                f"不支持的模型: {model}",
                field="model",
                value=model
            )
        
        try:
            client = ZhipuAI(api_key=self.api_key)
            
            start_time = time.time()
            
            if stream:
                response = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    stream=True,
                    **kwargs
                )
                return self._handle_stream_response(response, model, start_time)
            else:
                response = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    stream=False,
                    **kwargs
                )
                return self._handle_response(response, model, start_time)
                
        except Exception as e:
            self.logger.error(f"智谱AI调用失败: {str(e)}")
            if "api_key" in str(e).lower() or "auth" in str(e).lower():
                raise AuthenticationError(f"API密钥无效: {str(e)}", provider=self.name)
            raise ModelError(f"模型调用失败: {str(e)}", model=model, provider=self.name)
    
    def _handle_response(self, response, model: str, start_time: float) -> Dict[str, Any]:
        """处理非流式响应"""
        elapsed = (time.time() - start_time) * 1000
        
        return {
            "success": True,
            "provider": self.name,
            "model": model,
            "content": response.choices[0].message.content,
            "usage": {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            },
            "elapsed_ms": round(elapsed, 2)
        }
    
    def _handle_stream_response(self, response, model: str, start_time: float) -> Generator:
        """处理流式响应"""
        collected_content = []
        
        for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                collected_content.append(content)
                yield {
                    "success": True,
                    "provider": self.name,
                    "model": model,
                    "content": content,
                    "is_stream": True,
                    "is_done": False
                }
        
        elapsed = (time.time() - start_time) * 1000
        
        yield {
            "success": True,
            "provider": self.name,
            "model": model,
            "content": "".join(collected_content),
            "is_stream": True,
            "is_done": True,
            "elapsed_ms": round(elapsed, 2)
        }


class AliyunProvider(BaseAIProvider):
    """阿里云百炼提供商"""
    
    BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    
    THINKING_ONLY_MODELS = [
        "qwq-plus", "qwq-32b",
        "deepseek-r1", "deepseek-r1-distill-qwen-32b",
        "kimi-k2-thinking"
    ]
    
    @property
    def name(self) -> str:
        return "aliyun"
    
    @property
    def models(self) -> List[str]:
        return [
            "qwen-flash", "qwen-turbo", "qwen-plus", "qwen3.5-plus",
            "qwen3.5-flash", "qwen-max", "qwen-max-latest", "qwen3-max",
            "qwen-long", "qwq-plus", "qwq-32b",
            "deepseek-v3", "deepseek-v3.1", "deepseek-v3.2",
            "deepseek-r1", "deepseek-r1-distill-qwen-32b",
            "kimi-k2.5", "kimi-k2-thinking",
            "glm-5", "MiniMax-M2.5", "minimax-text-01"
        ]
    
    @property
    def default_model(self) -> str:
        return "qwen-plus"
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        stream: bool = False,
        enable_thinking: bool = False,
        enable_search: bool = False,
        **kwargs
    ) -> Any:
        try:
            from openai import OpenAI
        except ImportError:
            raise ModelError(
                "openai库未安装，请运行: pip install openai",
                provider=self.name
            )
        
        model = model or self.default_model
        
        if not self.validate_model(model):
            raise ValidationError(
                f"不支持的模型: {model}",
                field="model",
                value=model
            )
        
        try:
            client = OpenAI(api_key=self.api_key, base_url=self.BASE_URL)
            
            params = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "stream": stream
            }
            
            extra_body = {}
            if enable_thinking and model not in self.THINKING_ONLY_MODELS:
                extra_body["enable_thinking"] = True
            if enable_search:
                extra_body["enable_search"] = True
            if extra_body:
                params["extra_body"] = extra_body
            
            start_time = time.time()
            
            if stream:
                params["stream_options"] = {"include_usage": True}
                response = client.chat.completions.create(**params)
                return self._handle_stream_response(response, model, start_time)
            else:
                response = client.chat.completions.create(**params)
                return self._handle_response(response, model, start_time)
                
        except Exception as e:
            self.logger.error(f"阿里云百炼调用失败: {str(e)}")
            if "api_key" in str(e).lower() or "auth" in str(e).lower():
                raise AuthenticationError(f"API密钥无效: {str(e)}", provider=self.name)
            raise ModelError(f"模型调用失败: {str(e)}", model=model, provider=self.name)
    
    def _handle_response(self, response, model: str, start_time: float) -> Dict[str, Any]:
        """处理非流式响应"""
        elapsed = (time.time() - start_time) * 1000
        
        return {
            "success": True,
            "provider": self.name,
            "model": model,
            "content": response.choices[0].message.content,
            "usage": {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            },
            "elapsed_ms": round(elapsed, 2)
        }
    
    def _handle_stream_response(self, response, model: str, start_time: float) -> Generator:
        """处理流式响应"""
        collected_content = []
        
        for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                collected_content.append(content)
                yield {
                    "success": True,
                    "provider": self.name,
                    "model": model,
                    "content": content,
                    "is_stream": True,
                    "is_done": False
                }
        
        elapsed = (time.time() - start_time) * 1000
        
        yield {
            "success": True,
            "provider": self.name,
            "model": model,
            "content": "".join(collected_content),
            "is_stream": True,
            "is_done": True,
            "elapsed_ms": round(elapsed, 2)
        }


class DeepSeekProvider(BaseAIProvider):
    """DeepSeek提供商"""
    
    BASE_URL = "https://api.deepseek.com/v1"
    
    @property
    def name(self) -> str:
        return "deepseek"
    
    @property
    def models(self) -> List[str]:
        return ["deepseek-chat", "deepseek-coder", "deepseek-reasoner"]
    
    @property
    def default_model(self) -> str:
        return "deepseek-chat"
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        stream: bool = False,
        **kwargs
    ) -> Any:
        try:
            from openai import OpenAI
        except ImportError:
            raise ModelError(
                "openai库未安装，请运行: pip install openai",
                provider=self.name
            )
        
        model = model or self.default_model
        
        try:
            client = OpenAI(api_key=self.api_key, base_url=self.BASE_URL)
            
            start_time = time.time()
            
            if stream:
                response = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    stream=True,
                    stream_options={"include_usage": True}
                )
                return self._handle_stream_response(response, model, start_time)
            else:
                response = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens
                )
                return self._handle_response(response, model, start_time)
                
        except Exception as e:
            self.logger.error(f"DeepSeek调用失败: {str(e)}")
            if "api_key" in str(e).lower() or "auth" in str(e).lower():
                raise AuthenticationError(f"API密钥无效: {str(e)}", provider=self.name)
            raise ModelError(f"模型调用失败: {str(e)}", model=model, provider=self.name)
    
    def _handle_response(self, response, model: str, start_time: float) -> Dict[str, Any]:
        elapsed = (time.time() - start_time) * 1000
        return {
            "success": True,
            "provider": self.name,
            "model": model,
            "content": response.choices[0].message.content,
            "usage": {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            },
            "elapsed_ms": round(elapsed, 2)
        }
    
    def _handle_stream_response(self, response, model: str, start_time: float) -> Generator:
        collected_content = []
        
        for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                collected_content.append(content)
                yield {
                    "success": True,
                    "provider": self.name,
                    "model": model,
                    "content": content,
                    "is_stream": True,
                    "is_done": False
                }
        
        elapsed = (time.time() - start_time) * 1000
        
        yield {
            "success": True,
            "provider": self.name,
            "model": model,
            "content": "".join(collected_content),
            "is_stream": True,
            "is_done": True,
            "elapsed_ms": round(elapsed, 2)
        }


class AIService:
    """AI模型服务管理器"""
    
    PROVIDERS = {
        "zhipu": ZhipuProvider,
        "aliyun": AliyunProvider,
        "deepseek": DeepSeekProvider
    }
    
    def __init__(self, config: dict = None):
        self.config = config or {}
        self.logger = Logger.get_instance().get_logger("ai_service")
        self._providers: Dict[str, BaseAIProvider] = {}
        self._default_provider = self.config.get("default_provider", "zhipu")
    
    def register_provider(self, provider_name: str, api_key: str) -> None:
        """注册AI服务提供商"""
        if provider_name not in self.PROVIDERS:
            raise ValidationError(
                f"不支持的提供商: {provider_name}",
                field="provider",
                value=provider_name
            )
        
        provider_class = self.PROVIDERS[provider_name]
        self._providers[provider_name] = provider_class(api_key, self.config)
        self.logger.info(f"已注册AI提供商: {provider_name}")
    
    def get_provider(self, provider_name: str = None) -> BaseAIProvider:
        """获取AI服务提供商"""
        provider_name = provider_name or self._default_provider
        
        if provider_name not in self._providers:
            raise AuthenticationError(
                f"提供商 {provider_name} 未注册，请先设置API密钥",
                provider=provider_name
            )
        
        return self._providers[provider_name]
    
    def chat(
        self,
        message: str,
        provider: str = None,
        model: str = None,
        system_prompt: str = None,
        temperature: float = None,
        max_tokens: int = None,
        stream: bool = False,
        **kwargs
    ) -> Any:
        """
        发送聊天请求
        
        Args:
            message: 用户消息
            provider: 提供商名称
            model: 模型名称
            system_prompt: 系统提示
            temperature: 温度参数
            max_tokens: 最大token数
            stream: 是否流式输出
            **kwargs: 其他参数
            
        Returns:
            响应结果
        """
        provider_instance = self.get_provider(provider)
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": message})
        
        model = model or self.config.get("default_model") or provider_instance.default_model
        temperature = temperature if temperature is not None else self.config.get("temperature", 0.7)
        max_tokens = max_tokens or self.config.get("max_tokens", 4096)
        
        self.logger.info(f"发送聊天请求: provider={provider_instance.name}, model={model}")
        
        return provider_instance.chat(
            messages=messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=stream,
            **kwargs
        )
    
    def chat_with_history(
        self,
        message: str,
        history: List[Dict[str, str]],
        provider: str = None,
        model: str = None,
        **kwargs
    ) -> Any:
        """带历史记录的聊天"""
        provider_instance = self.get_provider(provider)
        
        messages = history.copy()
        messages.append({"role": "user", "content": message})
        
        model = model or self.config.get("default_model") or provider_instance.default_model
        
        return provider_instance.chat(messages=messages, model=model, **kwargs)
    
    def list_providers(self) -> List[str]:
        """列出所有支持的提供商"""
        return list(self.PROVIDERS.keys())
    
    def list_models(self, provider: str = None) -> Dict[str, List[str]]:
        """列出可用模型"""
        if provider:
            if provider in self._providers:
                return {provider: self._providers[provider].models}
            elif provider in self.PROVIDERS:
                return {provider: self.PROVIDERS[provider](None).models}
            return {}
        
        result = {}
        for name, provider_class in self.PROVIDERS.items():
            result[name] = provider_class(None).models
        return result
    
    def set_default_provider(self, provider: str) -> None:
        """设置默认提供商"""
        if provider not in self.PROVIDERS:
            raise ValidationError(f"不支持的提供商: {provider}")
        self._default_provider = provider
    
    def is_provider_registered(self, provider: str) -> bool:
        """检查提供商是否已注册"""
        return provider in self._providers
