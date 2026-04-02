"""
CLI Agent API命令模块

提供API调用相关的命令。
"""

from typing import Dict, List, Any, Optional
from cli_agent.services.api_service import APIService
from cli_agent.core.exceptions import APIError, ValidationError
from cli_agent.core.logger import Logger


class APICommands:
    """API命令处理器"""
    
    def __init__(self, api_service: APIService):
        self.api_service = api_service
        self.logger = Logger.get_instance().get_logger("api_commands")
    
    def register(
        self,
        name: str,
        base_url: str,
        auth_type: str = None,
        auth_value: str = None,
        timeout: int = 30
    ) -> Dict[str, Any]:
        """
        注册API端点
        
        用法: api register <name> <base_url> [--auth-type bearer] [--auth-value token]
        """
        self.api_service.register_endpoint(
            name=name,
            base_url=base_url,
            auth_type=auth_type,
            auth_value=auth_value,
            timeout=timeout
        )
        
        return {
            "success": True,
            "message": f"已注册API端点: {name}"
        }
    
    def set_auth(
        self,
        name: str,
        auth_type: str,
        auth_value: str
    ) -> Dict[str, Any]:
        """
        设置端点认证信息
        
        用法: api set-auth <name> --auth-type bearer --auth-value <token>
        """
        self.api_service.set_auth(name, auth_type, auth_value)
        
        return {
            "success": True,
            "message": f"已设置 {name} 的认证信息"
        }
    
    def get(
        self,
        endpoint: str,
        path: str = "",
        params: Dict = None,
        use_cache: bool = False
    ) -> Dict[str, Any]:
        """
        发送GET请求
        
        用法: api get <endpoint> [--path /users] [--params key=value] [--use-cache]
        """
        result = self.api_service.get(
            endpoint_name=endpoint,
            path=path,
            params=params,
            use_cache=use_cache
        )
        
        return {
            "success": result["success"],
            "data": result.get("data"),
            "status_code": result["status_code"],
            "error": result.get("error")
        }
    
    def post(
        self,
        endpoint: str,
        path: str = "",
        data: Dict = None,
        json_data: Dict = None
    ) -> Dict[str, Any]:
        """
        发送POST请求
        
        用法: api post <endpoint> [--path /users] [--json '{"name": "test"}']
        """
        result = self.api_service.post(
            endpoint_name=endpoint,
            path=path,
            data=data,
            json_data=json_data
        )
        
        return {
            "success": result["success"],
            "data": result.get("data"),
            "status_code": result["status_code"],
            "error": result.get("error")
        }
    
    def put(
        self,
        endpoint: str,
        path: str = "",
        json_data: Dict = None
    ) -> Dict[str, Any]:
        """
        发送PUT请求
        
        用法: api put <endpoint> [--path /users/1] [--json '{"name": "updated"}']
        """
        result = self.api_service.put(
            endpoint_name=endpoint,
            path=path,
            json_data=json_data
        )
        
        return {
            "success": result["success"],
            "data": result.get("data"),
            "status_code": result["status_code"],
            "error": result.get("error")
        }
    
    def delete(
        self,
        endpoint: str,
        path: str = ""
    ) -> Dict[str, Any]:
        """
        发送DELETE请求
        
        用法: api delete <endpoint> [--path /users/1]
        """
        result = self.api_service.delete(
            endpoint_name=endpoint,
            path=path
        )
        
        return {
            "success": result["success"],
            "data": result.get("data"),
            "status_code": result["status_code"],
            "error": result.get("error")
        }
    
    def list(self) -> Dict[str, Any]:
        """
        列出所有注册的端点
        
        用法: api list
        """
        endpoints = self.api_service.list_endpoints()
        
        details = []
        for name in endpoints:
            info = self.api_service.get_endpoint_info(name)
            details.append({
                "name": name,
                "base_url": info["base_url"],
                "auth_type": info.get("auth_type"),
                "has_auth": bool(info.get("auth_value"))
            })
        
        return {
            "success": True,
            "data": {
                "endpoints": details,
                "total": len(details)
            }
        }
    
    def info(self, name: str) -> Dict[str, Any]:
        """
        查看端点详情
        
        用法: api info <name>
        """
        info = self.api_service.get_endpoint_info(name)
        
        if not info:
            return {
                "success": False,
                "error": f"端点未注册: {name}"
            }
        
        return {
            "success": True,
            "data": info
        }
    
    def test(self, endpoint: str, path: str = "") -> Dict[str, Any]:
        """
        测试端点连接
        
        用法: api test <endpoint> [--path /health]
        """
        result = self.api_service.test_endpoint(endpoint, path)
        
        return result
    
    def remove(self, name: str) -> Dict[str, Any]:
        """
        移除端点
        
        用法: api remove <name>
        """
        success = self.api_service.remove_endpoint(name)
        
        if success:
            return {
                "success": True,
                "message": f"已移除端点: {name}"
            }
        else:
            return {
                "success": False,
                "error": f"端点不存在: {name}"
            }
    
    def clear_cache(self) -> Dict[str, Any]:
        """
        清除API缓存
        
        用法: api clear-cache
        """
        self.api_service.clear_cache()
        
        return {
            "success": True,
            "message": "API缓存已清除"
        }
    
    def request(
        self,
        endpoint: str,
        method: str,
        path: str = "",
        params: Dict = None,
        json_data: Dict = None,
        headers: Dict = None
    ) -> Dict[str, Any]:
        """
        发送自定义请求
        
        用法: api request <endpoint> <method> [--path /api] [--json '{"key": "value"}']
        """
        result = self.api_service.request(
            endpoint_name=endpoint,
            method=method,
            path=path,
            params=params,
            json_data=json_data,
            headers=headers
        )
        
        return {
            "success": result["success"],
            "data": result.get("data"),
            "status_code": result["status_code"],
            "headers": result.get("headers"),
            "error": result.get("error")
        }
