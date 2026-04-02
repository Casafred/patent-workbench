"""
CLI Agent API调用服务

提供外部API接口的配置和调用功能。
"""

import time
import json
import hashlib
from typing import Dict, List, Any, Optional, Callable
from urllib.parse import urljoin, urlparse

from cli_agent.core.exceptions import APIError, NetworkError, TimeoutError, ValidationError
from cli_agent.core.logger import Logger


class APIService:
    """API调用服务"""
    
    def __init__(self, config: dict = None):
        self.config = config or {}
        self.logger = Logger.get_instance().get_logger("api_service")
        self._endpoints: Dict[str, Dict] = {}
        self._rate_limits: Dict[str, Dict] = {}
        self._cache: Dict[str, Dict] = {}
    
    def register_endpoint(
        self,
        name: str,
        base_url: str,
        headers: Dict[str, str] = None,
        auth_type: str = None,
        auth_value: str = None,
        timeout: int = 30,
        retry_count: int = 3,
        retry_delay: float = 1.0
    ) -> None:
        """
        注册API端点
        
        Args:
            name: 端点名称
            base_url: 基础URL
            headers: 默认请求头
            auth_type: 认证类型 (bearer, basic, api_key, custom)
            auth_value: 认证值
            timeout: 超时时间（秒）
            retry_count: 重试次数
            retry_delay: 重试延迟（秒）
        """
        if not base_url:
            raise ValidationError("base_url不能为空", field="base_url")
        
        parsed = urlparse(base_url)
        if not parsed.scheme or not parsed.netloc:
            raise ValidationError(f"无效的URL: {base_url}", field="base_url", value=base_url)
        
        self._endpoints[name] = {
            "base_url": base_url.rstrip("/"),
            "headers": headers or {},
            "auth_type": auth_type,
            "auth_value": auth_value,
            "timeout": timeout,
            "retry_count": retry_count,
            "retry_delay": retry_delay
        }
        
        self.logger.info(f"已注册API端点: {name} -> {base_url}")
    
    def set_auth(self, endpoint_name: str, auth_type: str, auth_value: str) -> None:
        """设置端点认证信息"""
        if endpoint_name not in self._endpoints:
            raise ValidationError(f"端点未注册: {endpoint_name}", field="endpoint_name")
        
        self._endpoints[endpoint_name]["auth_type"] = auth_type
        self._endpoints[endpoint_name]["auth_value"] = auth_value
    
    def _build_headers(self, endpoint: Dict, custom_headers: Dict = None) -> Dict[str, str]:
        """构建请求头"""
        headers = endpoint["headers"].copy()
        
        auth_type = endpoint.get("auth_type")
        auth_value = endpoint.get("auth_value")
        
        if auth_type and auth_value:
            if auth_type == "bearer":
                headers["Authorization"] = f"Bearer {auth_value}"
            elif auth_type == "basic":
                import base64
                encoded = base64.b64encode(auth_value.encode()).decode()
                headers["Authorization"] = f"Basic {encoded}"
            elif auth_type == "api_key":
                headers["X-API-Key"] = auth_value
            elif auth_type == "custom":
                if ":" in auth_value:
                    key, val = auth_value.split(":", 1)
                    headers[key.strip()] = val.strip()
        
        if custom_headers:
            headers.update(custom_headers)
        
        return headers
    
    def request(
        self,
        endpoint_name: str,
        method: str,
        path: str = "",
        params: Dict = None,
        data: Dict = None,
        json_data: Dict = None,
        headers: Dict = None,
        timeout: int = None,
        use_cache: bool = False,
        cache_ttl: int = 300
    ) -> Dict[str, Any]:
        """
        发送API请求
        
        Args:
            endpoint_name: 端点名称
            method: HTTP方法
            path: 路径
            params: 查询参数
            data: 表单数据
            json_data: JSON数据
            headers: 自定义请求头
            timeout: 超时时间
            use_cache: 是否使用缓存
            cache_ttl: 缓存有效期（秒）
            
        Returns:
            响应数据
        """
        if endpoint_name not in self._endpoints:
            raise ValidationError(f"端点未注册: {endpoint_name}", field="endpoint_name")
        
        endpoint = self._endpoints[endpoint_name]
        url = urljoin(endpoint["base_url"] + "/", path.lstrip("/"))
        
        cache_key = None
        if use_cache and method.upper() == "GET":
            cache_key = self._generate_cache_key(url, params)
            cached = self._get_from_cache(cache_key)
            if cached:
                self.logger.debug(f"使用缓存响应: {url}")
                return cached
        
        try:
            import requests
        except ImportError:
            raise APIError("requests库未安装，请运行: pip install requests")
        
        request_headers = self._build_headers(endpoint, headers)
        request_timeout = timeout or endpoint["timeout"]
        retry_count = endpoint["retry_count"]
        retry_delay = endpoint["retry_delay"]
        
        last_error = None
        
        for attempt in range(retry_count + 1):
            try:
                start_time = time.time()
                
                response = requests.request(
                    method=method.upper(),
                    url=url,
                    params=params,
                    data=data,
                    json=json_data,
                    headers=request_headers,
                    timeout=request_timeout
                )
                
                elapsed = (time.time() - start_time) * 1000
                
                self.logger.log_api_call(
                    endpoint=url,
                    method=method.upper(),
                    status_code=response.status_code,
                    duration_ms=elapsed
                )
                
                if response.status_code >= 500 and attempt < retry_count:
                    self.logger.warning(f"服务器错误，重试 {attempt + 1}/{retry_count}")
                    time.sleep(retry_delay * (attempt + 1))
                    continue
                
                return self._process_response(response, url, cache_key, cache_ttl, use_cache)
                
            except requests.exceptions.Timeout:
                last_error = TimeoutError(
                    f"请求超时: {request_timeout}秒",
                    timeout=request_timeout
                )
                if attempt < retry_count:
                    time.sleep(retry_delay)
                    continue
                    
            except requests.exceptions.ConnectionError as e:
                last_error = NetworkError(f"网络连接失败: {str(e)}")
                if attempt < retry_count:
                    time.sleep(retry_delay)
                    continue
                    
            except requests.exceptions.RequestException as e:
                last_error = APIError(f"请求失败: {str(e)}", endpoint=url)
                break
        
        if last_error:
            raise last_error
        
        raise APIError("未知错误", endpoint=url)
    
    def _process_response(
        self,
        response,
        url: str,
        cache_key: str = None,
        cache_ttl: int = 300,
        use_cache: bool = False
    ) -> Dict[str, Any]:
        """处理响应"""
        result = {
            "success": 200 <= response.status_code < 300,
            "status_code": response.status_code,
            "headers": dict(response.headers),
            "url": url
        }
        
        content_type = response.headers.get("Content-Type", "")
        
        try:
            if "application/json" in content_type:
                result["data"] = response.json()
            else:
                result["data"] = response.text
        except Exception:
            result["data"] = response.text
        
        if not result["success"]:
            result["error"] = f"HTTP {response.status_code}"
            if isinstance(result.get("data"), dict):
                result["error_detail"] = result["data"]
        
        if use_cache and cache_key and result["success"]:
            self._add_to_cache(cache_key, result, cache_ttl)
        
        return result
    
    def get(
        self,
        endpoint_name: str,
        path: str = "",
        params: Dict = None,
        **kwargs
    ) -> Dict[str, Any]:
        """GET请求"""
        return self.request(endpoint_name, "GET", path, params=params, **kwargs)
    
    def post(
        self,
        endpoint_name: str,
        path: str = "",
        json_data: Dict = None,
        data: Dict = None,
        **kwargs
    ) -> Dict[str, Any]:
        """POST请求"""
        return self.request(
            endpoint_name, "POST", path,
            json_data=json_data, data=data, **kwargs
        )
    
    def put(
        self,
        endpoint_name: str,
        path: str = "",
        json_data: Dict = None,
        **kwargs
    ) -> Dict[str, Any]:
        """PUT请求"""
        return self.request(endpoint_name, "PUT", path, json_data=json_data, **kwargs)
    
    def delete(
        self,
        endpoint_name: str,
        path: str = "",
        **kwargs
    ) -> Dict[str, Any]:
        """DELETE请求"""
        return self.request(endpoint_name, "DELETE", path, **kwargs)
    
    def _generate_cache_key(self, url: str, params: Dict = None) -> str:
        """生成缓存键"""
        key_data = url
        if params:
            key_data += json.dumps(params, sort_keys=True)
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def _get_from_cache(self, cache_key: str) -> Optional[Dict]:
        """从缓存获取"""
        if cache_key not in self._cache:
            return None
        
        cached = self._cache[cache_key]
        if time.time() > cached["expires"]:
            del self._cache[cache_key]
            return None
        
        return cached["data"]
    
    def _add_to_cache(self, cache_key: str, data: Dict, ttl: int) -> None:
        """添加到缓存"""
        self._cache[cache_key] = {
            "data": data,
            "expires": time.time() + ttl
        }
    
    def clear_cache(self) -> None:
        """清除缓存"""
        self._cache.clear()
    
    def list_endpoints(self) -> List[str]:
        """列出所有注册的端点"""
        return list(self._endpoints.keys())
    
    def get_endpoint_info(self, name: str) -> Optional[Dict]:
        """获取端点信息"""
        if name in self._endpoints:
            endpoint = self._endpoints[name].copy()
            if "auth_value" in endpoint:
                endpoint["auth_value"] = "***" if endpoint["auth_value"] else None
            return endpoint
        return None
    
    def remove_endpoint(self, name: str) -> bool:
        """移除端点"""
        if name in self._endpoints:
            del self._endpoints[name]
            return True
        return False
    
    def test_endpoint(self, endpoint_name: str, path: str = "") -> Dict[str, Any]:
        """测试端点连接"""
        try:
            result = self.get(endpoint_name, path, timeout=10)
            return {
                "success": True,
                "status_code": result["status_code"],
                "message": "连接成功"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": f"连接失败: {str(e)}"
            }
