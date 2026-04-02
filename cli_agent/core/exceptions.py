"""
CLI Agent 异常处理模块

定义所有自定义异常类，提供清晰的错误层次结构。
"""


class CLIAgentError(Exception):
    """CLI Agent 基础异常类"""
    
    def __init__(self, message: str, code: str = None, details: dict = None):
        self.message = message
        self.code = code or "UNKNOWN_ERROR"
        self.details = details or {}
        super().__init__(self.message)
    
    def to_dict(self) -> dict:
        return {
            "error": True,
            "code": self.code,
            "message": self.message,
            "details": self.details
        }
    
    def __str__(self):
        if self.details:
            return f"[{self.code}] {self.message} - {self.details}"
        return f"[{self.code}] {self.message}"


class ConfigError(CLIAgentError):
    """配置相关错误"""
    
    def __init__(self, message: str, config_key: str = None, **kwargs):
        details = kwargs.get("details", {})
        if config_key:
            details["config_key"] = config_key
        kwargs["details"] = details
        super().__init__(message, code="CONFIG_ERROR", **kwargs)


class FileError(CLIAgentError):
    """文件操作相关错误"""
    
    def __init__(self, message: str, file_path: str = None, **kwargs):
        details = kwargs.get("details", {})
        if file_path:
            details["file_path"] = file_path
        kwargs["details"] = details
        super().__init__(message, code="FILE_ERROR", **kwargs)


class APIError(CLIAgentError):
    """API调用相关错误"""
    
    def __init__(self, message: str, endpoint: str = None, status_code: int = None, **kwargs):
        details = kwargs.get("details", {})
        if endpoint:
            details["endpoint"] = endpoint
        if status_code:
            details["status_code"] = status_code
        kwargs["details"] = details
        super().__init__(message, code="API_ERROR", **kwargs)


class ModelError(CLIAgentError):
    """AI模型相关错误"""
    
    def __init__(self, message: str, model: str = None, provider: str = None, **kwargs):
        details = kwargs.get("details", {})
        if model:
            details["model"] = model
        if provider:
            details["provider"] = provider
        kwargs["details"] = details
        super().__init__(message, code="MODEL_ERROR", **kwargs)


class ValidationError(CLIAgentError):
    """输入验证相关错误"""
    
    def __init__(self, message: str, field: str = None, value: any = None, **kwargs):
        details = kwargs.get("details", {})
        if field:
            details["field"] = field
        if value is not None:
            details["value"] = str(value)[:100]
        kwargs["details"] = details
        super().__init__(message, code="VALIDATION_ERROR", **kwargs)


class CommandError(CLIAgentError):
    """命令执行相关错误"""
    
    def __init__(self, message: str, command: str = None, **kwargs):
        details = kwargs.get("details", {})
        if command:
            details["command"] = command
        kwargs["details"] = details
        super().__init__(message, code="COMMAND_ERROR", **kwargs)


class AuthenticationError(CLIAgentError):
    """认证相关错误"""
    
    def __init__(self, message: str = "认证失败", provider: str = None, **kwargs):
        details = kwargs.get("details", {})
        if provider:
            details["provider"] = provider
        kwargs["details"] = details
        super().__init__(message, code="AUTH_ERROR", **kwargs)


class RateLimitError(CLIAgentError):
    """速率限制错误"""
    
    def __init__(self, message: str = "请求频率超限", retry_after: int = None, **kwargs):
        details = kwargs.get("details", {})
        if retry_after:
            details["retry_after"] = retry_after
        kwargs["details"] = details
        super().__init__(message, code="RATE_LIMIT_ERROR", **kwargs)


class NetworkError(CLIAgentError):
    """网络连接错误"""
    
    def __init__(self, message: str = "网络连接失败", **kwargs):
        super().__init__(message, code="NETWORK_ERROR", **kwargs)


class TimeoutError(CLIAgentError):
    """超时错误"""
    
    def __init__(self, message: str = "操作超时", timeout: int = None, **kwargs):
        details = kwargs.get("details", {})
        if timeout:
            details["timeout"] = timeout
        kwargs["details"] = details
        super().__init__(message, code="TIMEOUT_ERROR", **kwargs)
