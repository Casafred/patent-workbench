"""
CLI Agent 日志记录模块

提供结构化日志记录，支持多种输出格式和日志级别。
"""

import os
import sys
import logging
import json
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any
from enum import Enum


class LogLevel(Enum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class JsonFormatter(logging.Formatter):
    """JSON格式日志格式化器"""
    
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        if hasattr(record, "extra_data"):
            log_data["extra"] = record.extra_data
        
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        return json.dumps(log_data, ensure_ascii=False)


class ColoredFormatter(logging.Formatter):
    """彩色控制台日志格式化器"""
    
    COLORS = {
        "DEBUG": "\033[36m",
        "INFO": "\033[32m",
        "WARNING": "\033[33m",
        "ERROR": "\033[31m",
        "CRITICAL": "\033[35m",
    }
    RESET = "\033[0m"
    
    def __init__(self, use_color: bool = True):
        super().__init__(
            fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        self.use_color = use_color and self._supports_color()
    
    @staticmethod
    def _supports_color() -> bool:
        if os.name == "nt":
            return os.environ.get("ANSICON") is not None or "WT_SESSION" in os.environ
        return hasattr(sys.stdout, "isatty") and sys.stdout.isatty()
    
    def format(self, record: logging.LogRecord) -> str:
        if self.use_color:
            levelname = record.levelname
            if levelname in self.COLORS:
                record.levelname = f"{self.COLORS[levelname]}{levelname}{self.RESET}"
        
        result = super().format(record)
        
        if hasattr(record, "extra_data"):
            extra_str = " | " + " | ".join(f"{k}={v}" for k, v in record.extra_data.items())
            result += extra_str
        
        return result


class Logger:
    """日志管理器"""
    
    _instance: Optional["Logger"] = None
    _loggers: Dict[str, logging.Logger] = {}
    
    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(
        self,
        name: str = "cli_agent",
        level: str = "INFO",
        log_dir: Optional[str] = None,
        use_color: bool = True,
        json_format: bool = False
    ):
        if hasattr(self, "_initialized") and self._initialized:
            return
        
        self.name = name
        self.level = getattr(logging, level.upper(), logging.INFO)
        self.log_dir = Path(log_dir) if log_dir else None
        self.use_color = use_color
        self.json_format = json_format
        
        self._setup_root_logger()
        self._initialized = True
    
    def _setup_root_logger(self) -> None:
        root_logger = logging.getLogger(self.name)
        root_logger.setLevel(self.level)
        root_logger.handlers.clear()
        
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(self.level)
        
        if self.json_format:
            console_handler.setFormatter(JsonFormatter())
        else:
            console_handler.setFormatter(ColoredFormatter(self.use_color))
        
        root_logger.addHandler(console_handler)
        
        if self.log_dir:
            self._setup_file_handler(root_logger)
    
    def _setup_file_handler(self, logger: logging.Logger) -> None:
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        log_file = self.log_dir / f"{self.name}_{datetime.now().strftime('%Y%m%d')}.log"
        
        file_handler = logging.FileHandler(log_file, encoding="utf-8")
        file_handler.setLevel(self.level)
        file_handler.setFormatter(JsonFormatter())
        
        logger.addHandler(file_handler)
    
    def get_logger(self, module_name: str = None) -> logging.Logger:
        logger_name = f"{self.name}.{module_name}" if module_name else self.name
        
        if logger_name not in self._loggers:
            self._loggers[logger_name] = logging.getLogger(logger_name)
        
        return self._loggers[logger_name]
    
    def debug(self, message: str, **kwargs) -> None:
        self._log(logging.DEBUG, message, **kwargs)
    
    def info(self, message: str, **kwargs) -> None:
        self._log(logging.INFO, message, **kwargs)
    
    def warning(self, message: str, **kwargs) -> None:
        self._log(logging.WARNING, message, **kwargs)
    
    def error(self, message: str, exc_info: bool = False, **kwargs) -> None:
        self._log(logging.ERROR, message, exc_info=exc_info, **kwargs)
    
    def critical(self, message: str, exc_info: bool = False, **kwargs) -> None:
        self._log(logging.CRITICAL, message, exc_info=exc_info, **kwargs)
    
    def _log(self, level: int, message: str, exc_info: bool = False, **kwargs) -> None:
        logger = self.get_logger()
        
        extra = {}
        if kwargs:
            extra["extra_data"] = kwargs
        
        logger.log(level, message, exc_info=exc_info, extra=extra if extra else None)
    
    def log_command(self, command: str, args: Dict[str, Any] = None, result: str = None) -> None:
        extra = {"command": command}
        if args:
            extra["args"] = args
        if result:
            extra["result"] = result[:200] if len(result) > 200 else result
        
        self.info(f"Command: {command}", **extra)
    
    def log_api_call(
        self,
        endpoint: str,
        method: str,
        status_code: int = None,
        duration_ms: float = None,
        error: str = None
    ) -> None:
        extra = {
            "endpoint": endpoint,
            "method": method
        }
        if status_code:
            extra["status_code"] = status_code
        if duration_ms:
            extra["duration_ms"] = round(duration_ms, 2)
        if error:
            extra["error"] = error
        
        if error:
            self.error(f"API Call Failed: {method} {endpoint}", **extra)
        else:
            self.info(f"API Call: {method} {endpoint}", **extra)
    
    def log_model_call(
        self,
        provider: str,
        model: str,
        prompt_tokens: int = None,
        completion_tokens: int = None,
        duration_ms: float = None,
        error: str = None
    ) -> None:
        extra = {
            "provider": provider,
            "model": model
        }
        if prompt_tokens:
            extra["prompt_tokens"] = prompt_tokens
        if completion_tokens:
            extra["completion_tokens"] = completion_tokens
        if duration_ms:
            extra["duration_ms"] = round(duration_ms, 2)
        if error:
            extra["error"] = error
        
        if error:
            self.error(f"Model Call Failed: {provider}/{model}", **extra)
        else:
            self.info(f"Model Call: {provider}/{model}", **extra)
    
    def set_level(self, level: str) -> None:
        self.level = getattr(logging, level.upper(), logging.INFO)
        logging.getLogger(self.name).setLevel(self.level)
    
    @classmethod
    def get_instance(cls) -> "Logger":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
