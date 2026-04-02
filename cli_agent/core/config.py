"""
CLI Agent 配置管理模块

支持用户偏好设置、环境变量配置、API密钥管理等功能。
"""

import os
import json
from pathlib import Path
from typing import Any, Dict, Optional
from cli_agent.core.exceptions import ConfigError


class ConfigManager:
    """配置管理器"""
    
    DEFAULT_CONFIG = {
        "app": {
            "name": "CLI Agent",
            "version": "1.0.0",
            "debug": False,
            "log_level": "INFO"
        },
        "ai": {
            "default_provider": "zhipu",
            "default_model": "glm-4-flash",
            "temperature": 0.7,
            "max_tokens": 4096,
            "timeout": 60
        },
        "excel": {
            "max_file_size_mb": 100,
            "max_rows": 10000,
            "chunk_size": 1000,
            "supported_formats": ["xlsx", "xls", "csv"]
        },
        "api": {
            "timeout": 30,
            "retry_count": 3,
            "retry_delay": 1
        },
        "ui": {
            "color_output": True,
            "show_progress": True,
            "prompt_style": ">",
            "history_size": 1000
        }
    }
    
    ENV_PREFIX = "CLI_AGENT_"
    
    def __init__(self, config_dir: str = None):
        self.config_dir = Path(config_dir) if config_dir else self._get_default_config_dir()
        self.config_file = self.config_dir / "config.json"
        self.secrets_file = self.config_dir / "secrets.json"
        self._config: Dict[str, Any] = {}
        self._secrets: Dict[str, str] = {}
        self._initialized = False
    
    def _get_default_config_dir(self) -> Path:
        if os.name == "nt":
            base = Path(os.environ.get("APPDATA", "~"))
        else:
            base = Path.home()
        return base / ".cli_agent"
    
    def initialize(self) -> None:
        if self._initialized:
            return
        
        self._ensure_config_dir()
        self._load_config()
        self._load_secrets()
        self._apply_env_overrides()
        self._initialized = True
    
    def _ensure_config_dir(self) -> None:
        self.config_dir.mkdir(parents=True, exist_ok=True)
    
    def _load_config(self) -> None:
        self._config = self.DEFAULT_CONFIG.copy()
        
        if self.config_file.exists():
            try:
                with open(self.config_file, "r", encoding="utf-8") as f:
                    user_config = json.load(f)
                self._deep_merge(self._config, user_config)
            except json.JSONDecodeError as e:
                raise ConfigError(f"配置文件格式错误: {e}", config_key="config.json")
            except Exception as e:
                raise ConfigError(f"加载配置文件失败: {e}", config_key="config.json")
    
    def _load_secrets(self) -> None:
        if self.secrets_file.exists():
            try:
                with open(self.secrets_file, "r", encoding="utf-8") as f:
                    self._secrets = json.load(f)
            except Exception:
                self._secrets = {}
    
    def _apply_env_overrides(self) -> None:
        env_mappings = {
            "CLI_AGENT_DEBUG": ("app", "debug"),
            "CLI_AGENT_LOG_LEVEL": ("app", "log_level"),
            "CLI_AGENT_DEFAULT_PROVIDER": ("ai", "default_provider"),
            "CLI_AGENT_DEFAULT_MODEL": ("ai", "default_model"),
            "CLI_AGENT_TIMEOUT": ("ai", "timeout"),
            "CLI_AGENT_API_TIMEOUT": ("api", "timeout"),
        }
        
        for env_key, config_path in env_mappings.items():
            value = os.environ.get(env_key)
            if value:
                self._set_nested_value(config_path, value)
    
    def _deep_merge(self, base: dict, override: dict) -> None:
        for key, value in override.items():
            if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                self._deep_merge(base[key], value)
            else:
                base[key] = value
    
    def _set_nested_value(self, path: tuple, value: Any) -> None:
        current = self._config
        for key in path[:-1]:
            if key not in current:
                current[key] = {}
            current = current[key]
        current[path[-1]] = value
    
    def get(self, key: str, default: Any = None) -> Any:
        if not self._initialized:
            self.initialize()
        
        keys = key.split(".")
        current = self._config
        
        for k in keys:
            if isinstance(current, dict) and k in current:
                current = current[k]
            else:
                return default
        return current
    
    def set(self, key: str, value: Any, save: bool = True) -> None:
        if not self._initialized:
            self.initialize()
        
        keys = key.split(".")
        current = self._config
        
        for k in keys[:-1]:
            if k not in current:
                current[k] = {}
            current = current[k]
        
        current[keys[-1]] = value
        
        if save:
            self.save()
    
    def save(self) -> None:
        if not self._initialized:
            return
        
        self._ensure_config_dir()
        
        with open(self.config_file, "w", encoding="utf-8") as f:
            json.dump(self._config, f, indent=2, ensure_ascii=False)
    
    def get_secret(self, key: str) -> Optional[str]:
        if not self._initialized:
            self.initialize()
        return self._secrets.get(key)
    
    def set_secret(self, key: str, value: str) -> None:
        if not self._initialized:
            self.initialize()
        
        self._secrets[key] = value
        self._save_secrets()
    
    def delete_secret(self, key: str) -> None:
        if not self._initialized:
            self.initialize()
        
        if key in self._secrets:
            del self._secrets[key]
            self._save_secrets()
    
    def _save_secrets(self) -> None:
        self._ensure_config_dir()
        
        with open(self.secrets_file, "w", encoding="utf-8") as f:
            json.dump(self._secrets, f, indent=2)
    
    def get_api_key(self, provider: str) -> Optional[str]:
        return self.get_secret(f"api_key_{provider}")
    
    def set_api_key(self, provider: str, api_key: str) -> None:
        self.set_secret(f"api_key_{provider}", api_key)
    
    def get_all_config(self) -> Dict[str, Any]:
        if not self._initialized:
            self.initialize()
        return self._config.copy()
    
    def reset_to_default(self) -> None:
        self._config = self.DEFAULT_CONFIG.copy()
        self.save()
    
    def get_config_path(self) -> Path:
        return self.config_file
    
    def export_config(self, export_path: str) -> None:
        if not self._initialized:
            self.initialize()
        
        export_data = {
            "config": self._config,
            "secrets_keys": list(self._secrets.keys())
        }
        
        with open(export_path, "w", encoding="utf-8") as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False)
    
    def import_config(self, import_path: str, include_secrets: bool = False) -> None:
        try:
            with open(import_path, "r", encoding="utf-8") as f:
                import_data = json.load(f)
            
            if "config" in import_data:
                self._deep_merge(self._config, import_data["config"])
                self.save()
            
            if include_secrets and "secrets" in import_data:
                self._secrets.update(import_data["secrets"])
                self._save_secrets()
                
        except Exception as e:
            raise ConfigError(f"导入配置失败: {e}")
