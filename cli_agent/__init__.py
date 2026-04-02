"""
CLI Agent - 命令行智能代理工具

提供统一的命令行交互方式，支持Excel处理、AI模型调用、API集成等功能。
"""

__version__ = "1.0.0"
__author__ = "Patent Workbench Team"

from cli_agent.main import CLIAgent
from cli_agent.core.config import ConfigManager
from cli_agent.core.logger import Logger

__all__ = ["CLIAgent", "ConfigManager", "Logger"]
