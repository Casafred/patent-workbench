"""
CLI Agent AI命令模块

提供AI模型调用相关的命令。
"""

from typing import Dict, List, Any, Optional
from cli_agent.services.ai_service import AIService
from cli_agent.core.exceptions import ModelError, AuthenticationError
from cli_agent.core.logger import Logger


class AICommands:
    """AI命令处理器"""
    
    def __init__(self, ai_service: AIService):
        self.ai_service = ai_service
        self.logger = Logger.get_instance().get_logger("ai_commands")
    
    def register(self, provider: str, api_key: str) -> Dict[str, Any]:
        """
        注册AI服务提供商
        
        用法: ai register <provider> <api_key>
        示例: ai register zhipu your-api-key
        """
        self.ai_service.register_provider(provider, api_key)
        
        return {
            "success": True,
            "message": f"已注册AI服务提供商: {provider}"
        }
    
    def chat(
        self,
        message: str,
        provider: str = None,
        model: str = None,
        system: str = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        stream: bool = False
    ) -> Dict[str, Any]:
        """
        发送聊天消息
        
        用法: ai chat "你的问题" [--provider zhipu] [--model glm-4-flash] [--system "系统提示"]
        """
        self.logger.info(f"发送聊天请求: provider={provider}, model={model}")
        
        result = self.ai_service.chat(
            message=message,
            provider=provider,
            model=model,
            system_prompt=system,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=stream
        )
        
        if stream:
            return {
                "success": True,
                "message": "流式响应已开始",
                "stream": True,
                "generator": result
            }
        
        return {
            "success": True,
            "data": {
                "content": result["content"],
                "provider": result["provider"],
                "model": result["model"],
                "usage": result["usage"],
                "elapsed_ms": result["elapsed_ms"]
            }
        }
    
    def models(self, provider: str = None) -> Dict[str, Any]:
        """
        列出可用模型
        
        用法: ai models [--provider zhipu]
        """
        models = self.ai_service.list_models(provider)
        
        return {
            "success": True,
            "data": models
        }
    
    def providers(self) -> Dict[str, Any]:
        """
        列出支持的AI服务提供商
        
        用法: ai providers
        """
        providers = self.ai_service.list_providers()
        
        registered = []
        unregistered = []
        
        for p in providers:
            if self.ai_service.is_provider_registered(p):
                registered.append(p)
            else:
                unregistered.append(p)
        
        return {
            "success": True,
            "data": {
                "all": providers,
                "registered": registered,
                "unregistered": unregistered
            }
        }
    
    def set_default(self, provider: str) -> Dict[str, Any]:
        """
        设置默认AI服务提供商
        
        用法: ai set-default <provider>
        """
        self.ai_service.set_default_provider(provider)
        
        return {
            "success": True,
            "message": f"已设置默认提供商: {provider}"
        }
    
    def status(self) -> Dict[str, Any]:
        """
        查看AI服务状态
        
        用法: ai status
        """
        providers = self.ai_service.list_providers()
        
        status = {}
        for p in providers:
            status[p] = {
                "registered": self.ai_service.is_provider_registered(p),
                "models": self.ai_service.list_models(p).get(p, [])
            }
        
        return {
            "success": True,
            "data": {
                "default_provider": self.ai_service._default_provider,
                "providers": status
            }
        }
    
    def batch(
        self,
        prompts: List[str],
        provider: str = None,
        model: str = None,
        output: str = None
    ) -> Dict[str, Any]:
        """
        批量处理多个提示
        
        用法: ai batch "提示1" "提示2" "提示3" [--provider zhipu] [--output results.json]
        """
        if isinstance(prompts, str):
            prompts = [prompts]
        
        results = []
        
        for i, prompt in enumerate(prompts):
            try:
                result = self.ai_service.chat(
                    message=prompt,
                    provider=provider,
                    model=model
                )
                
                results.append({
                    "index": i + 1,
                    "prompt": prompt[:100] + "..." if len(prompt) > 100 else prompt,
                    "success": True,
                    "content": result["content"],
                    "usage": result["usage"]
                })
            except Exception as e:
                results.append({
                    "index": i + 1,
                    "prompt": prompt[:100] + "..." if len(prompt) > 100 else prompt,
                    "success": False,
                    "error": str(e)
                })
        
        response = {
            "success": True,
            "message": f"批量处理完成: {len(results)} 个提示",
            "data": {
                "results": results,
                "total": len(results),
                "successful": sum(1 for r in results if r["success"]),
                "failed": sum(1 for r in results if not r["success"])
            }
        }
        
        if output:
            import json
            with open(output, "w", encoding="utf-8") as f:
                json.dump(results, f, ensure_ascii=False, indent=2)
            response["message"] += f"，已保存到: {output}"
            response["data"]["output"] = output
        
        return response
    
    def analyze(
        self,
        text: str,
        task: str = "summarize",
        provider: str = None,
        model: str = None
    ) -> Dict[str, Any]:
        """
        分析文本
        
        用法: ai analyze "文本内容" --task summarize
        任务类型: summarize, extract, translate, classify, sentiment
        """
        task_prompts = {
            "summarize": "请总结以下内容的核心要点：\n\n{text}",
            "extract": "请从以下内容中提取关键信息（实体、日期、数字等）：\n\n{text}",
            "translate": "请将以下内容翻译成英文：\n\n{text}",
            "classify": "请对以下内容进行分类：\n\n{text}",
            "sentiment": "请分析以下内容的情感倾向：\n\n{text}"
        }
        
        if task not in task_prompts:
            return {
                "success": False,
                "error": f"不支持的任务类型: {task}。支持的类型: {', '.join(task_prompts.keys())}"
            }
        
        prompt = task_prompts[task].format(text=text)
        
        result = self.ai_service.chat(
            message=prompt,
            provider=provider,
            model=model
        )
        
        return {
            "success": True,
            "data": {
                "task": task,
                "result": result["content"],
                "provider": result["provider"],
                "model": result["model"],
                "usage": result["usage"]
            }
        }
