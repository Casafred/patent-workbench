"""
CLI Agent 配置命令模块

提供配置管理相关的命令。
"""

from typing import Dict, List, Any, Optional
from cli_agent.core.config import ConfigManager
from cli_agent.core.exceptions import ConfigError
from cli_agent.core.logger import Logger


class ConfigCommands:
    """配置命令处理器"""
    
    def __init__(self, config_manager: ConfigManager):
        self.config_manager = config_manager
        self.logger = Logger.get_instance().get_logger("config_commands")
    
    def get(self, key: str = None) -> Dict[str, Any]:
        """
        获取配置值
        
        用法: config get [key]
        示例: 
          config get              # 获取所有配置
          config get ai.default_model  # 获取特定配置
        """
        if key:
            value = self.config_manager.get(key)
            return {
                "success": True,
                "data": {
                    "key": key,
                    "value": value
                }
            }
        else:
            config = self.config_manager.get_all_config()
            return {
                "success": True,
                "data": config
            }
    
    def set(self, key: str, value: str) -> Dict[str, Any]:
        """
        设置配置值
        
        用法: config set <key> <value>
        示例: config set ai.default_model glm-4-plus
        """
        parsed_value = self._parse_value(value)
        
        self.config_manager.set(key, parsed_value)
        
        return {
            "success": True,
            "message": f"已设置 {key} = {parsed_value}"
        }
    
    def _parse_value(self, value: str) -> Any:
        """解析配置值"""
        if value.lower() == "true":
            return True
        elif value.lower() == "false":
            return False
        elif value.lower() == "null" or value.lower() == "none":
            return None
        
        try:
            return int(value)
        except ValueError:
            pass
        
        try:
            return float(value)
        except ValueError:
            pass
        
        return value
    
    def set_api_key(self, provider: str, api_key: str) -> Dict[str, Any]:
        """
        设置API密钥
        
        用法: config set-api-key <provider> <api_key>
        示例: config set-api-key zhipu your-api-key
        """
        self.config_manager.set_api_key(provider, api_key)
        
        return {
            "success": True,
            "message": f"已设置 {provider} 的API密钥"
        }
    
    def get_api_key(self, provider: str) -> Dict[str, Any]:
        """
        查看API密钥状态
        
        用法: config get-api-key <provider>
        """
        api_key = self.config_manager.get_api_key(provider)
        
        return {
            "success": True,
            "data": {
                "provider": provider,
                "has_key": bool(api_key),
                "key_preview": f"{api_key[:8]}...{api_key[-4:]}" if api_key and len(api_key) > 12 else None
            }
        }
    
    def delete_api_key(self, provider: str) -> Dict[str, Any]:
        """
        删除API密钥
        
        用法: config delete-api-key <provider>
        """
        self.config_manager.delete_secret(f"api_key_{provider}")
        
        return {
            "success": True,
            "message": f"已删除 {provider} 的API密钥"
        }
    
    def reset(self) -> Dict[str, Any]:
        """
        重置为默认配置
        
        用法: config reset
        """
        self.config_manager.reset_to_default()
        
        return {
            "success": True,
            "message": "配置已重置为默认值"
        }
    
    def path(self) -> Dict[str, Any]:
        """
        显示配置文件路径
        
        用法: config path
        """
        config_path = self.config_manager.get_config_path()
        
        return {
            "success": True,
            "data": {
                "config_path": str(config_path),
                "config_dir": str(config_path.parent)
            }
        }
    
    def export(self, output_path: str) -> Dict[str, Any]:
        """
        导出配置
        
        用法: config export <output_path>
        """
        self.config_manager.export_config(output_path)
        
        return {
            "success": True,
            "message": f"配置已导出到: {output_path}"
        }
    
    def import_config(self, input_path: str, include_secrets: bool = False) -> Dict[str, Any]:
        """
        导入配置
        
        用法: config import <input_path> [--include-secrets]
        """
        self.config_manager.import_config(input_path, include_secrets)
        
        return {
            "success": True,
            "message": f"配置已从 {input_path} 导入"
        }
    
    def list_secrets(self) -> Dict[str, Any]:
        """
        列出已保存的密钥（不显示实际值）
        
        用法: config list-secrets
        """
        secrets = self.config_manager._secrets
        
        keys = []
        for key in secrets.keys():
            if key.startswith("api_key_"):
                provider = key.replace("api_key_", "")
                keys.append({
                    "type": "api_key",
                    "provider": provider,
                    "key_name": key
                })
            else:
                keys.append({
                    "type": "other",
                    "key_name": key
                })
        
        return {
            "success": True,
            "data": {
                "secrets": keys,
                "total": len(keys)
            }
        }
    
    def show(self) -> Dict[str, Any]:
        """
        显示当前配置概览
        
        用法: config show
        """
        config = self.config_manager.get_all_config()
        
        overview = {
            "app": {
                "debug": config.get("app", {}).get("debug", False),
                "log_level": config.get("app", {}).get("log_level", "INFO")
            },
            "ai": {
                "default_provider": config.get("ai", {}).get("default_provider", "zhipu"),
                "default_model": config.get("ai", {}).get("default_model", "glm-4-flash"),
                "temperature": config.get("ai", {}).get("temperature", 0.7)
            },
            "excel": {
                "max_file_size_mb": config.get("excel", {}).get("max_file_size_mb", 100),
                "max_rows": config.get("excel", {}).get("max_rows", 10000)
            },
            "api": {
                "timeout": config.get("api", {}).get("timeout", 30),
                "retry_count": config.get("api", {}).get("retry_count", 3)
            }
        }
        
        secrets = self.config_manager._secrets
        api_keys_status = {}
        for key in secrets:
            if key.startswith("api_key_"):
                provider = key.replace("api_key_", "")
                api_keys_status[provider] = "已配置"
        
        overview["api_keys"] = api_keys_status
        
        return {
            "success": True,
            "data": overview
        }
