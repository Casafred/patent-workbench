"""
CLI Agent 主入口

提供命令行交互界面，支持命令解析、自动补全、历史记录等功能。
"""

import os
import sys
import json
import shlex
import signal
from typing import Dict, List, Any, Optional, Callable
from pathlib import Path

from cli_agent.core.config import ConfigManager
from cli_agent.core.logger import Logger
from cli_agent.core.history import CommandHistory
from cli_agent.core.exceptions import CLIAgentError, CommandError, ValidationError
from cli_agent.services.excel_service import ExcelService
from cli_agent.services.ai_service import AIService
from cli_agent.services.api_service import APIService
from cli_agent.commands.excel import ExcelCommands
from cli_agent.commands.ai import AICommands
from cli_agent.commands.api import APICommands
from cli_agent.commands.config import ConfigCommands
from cli_agent.utils.formatters import OutputFormatter
from cli_agent.utils.validators import InputValidator


class CLIAgent:
    """CLI Agent 主类"""
    
    VERSION = "1.0.0"
    
    def __init__(
        self,
        config_dir: str = None,
        log_level: str = "INFO",
        use_color: bool = True
    ):
        self.config_manager = ConfigManager(config_dir)
        self.config_manager.initialize()
        
        self.logger = Logger(
            name="cli_agent",
            level=log_level,
            use_color=use_color
        )
        
        self.history = CommandHistory(
            max_size=self.config_manager.get("ui.history_size", 1000)
        )
        self.history.load()
        
        self.formatter = OutputFormatter(use_color)
        self.validator = InputValidator()
        
        self._init_services()
        self._init_commands()
        self._register_builtin_commands()
        
        self._running = False
        self._current_input = ""
        self._history_index = -1
        
        self._setup_signal_handlers()
    
    def _init_services(self):
        """初始化服务"""
        self.excel_service = ExcelService(
            config=self.config_manager.get("excel", {})
        )
        
        self.ai_service = AIService(
            config=self.config_manager.get("ai", {})
        )
        
        self._load_ai_providers()
        
        self.api_service = APIService(
            config=self.config_manager.get("api", {})
        )
    
    def _load_ai_providers(self):
        """加载已保存的AI提供商配置"""
        for provider in self.ai_service.list_providers():
            api_key = self.config_manager.get_api_key(provider)
            if api_key:
                try:
                    self.ai_service.register_provider(provider, api_key)
                except Exception as e:
                    self.logger.warning(f"加载AI提供商 {provider} 失败: {e}")
    
    def _init_commands(self):
        """初始化命令处理器"""
        self.excel_commands = ExcelCommands(self.excel_service)
        self.ai_commands = AICommands(self.ai_service)
        self.api_commands = APICommands(self.api_service)
        self.config_commands = ConfigCommands(self.config_manager)
        
        self._command_handlers = {
            "excel": self.excel_commands,
            "ai": self.ai_commands,
            "api": self.api_commands,
            "config": self.config_commands
        }
    
    def _register_builtin_commands(self):
        """注册内置命令"""
        self._builtin_commands = {
            "help": self._cmd_help,
            "version": self._cmd_version,
            "exit": self._cmd_exit,
            "quit": self._cmd_exit,
            "clear": self._cmd_clear,
            "history": self._cmd_history,
            "status": self._cmd_status
        }
    
    def _setup_signal_handlers(self):
        """设置信号处理器"""
        def signal_handler(signum, frame):
            print("\n")
            self._cmd_exit()
        
        try:
            signal.signal(signal.SIGINT, signal_handler)
        except AttributeError:
            pass
    
    def run(self):
        """运行CLI交互循环"""
        self._running = True
        
        self._print_welcome()
        
        while self._running:
            try:
                prompt = self.config_manager.get("ui.prompt_style", ">")
                user_input = input(f"{self.formatter.colorize(prompt, 'cyan')} ")
                
                if not user_input.strip():
                    continue
                
                self._execute_command(user_input)
                
            except EOFError:
                print("\n")
                break
            except KeyboardInterrupt:
                print("\n")
                continue
            except Exception as e:
                self.logger.error(f"执行错误: {e}", exc_info=True)
                print(self.formatter.error(f"错误: {e}"))
        
        self._cleanup()
    
    def _print_welcome(self):
        """打印欢迎信息"""
        welcome = f"""
{self.formatter.colorize('=' * 50, 'cyan')}
{self.formatter.colorize('  CLI Agent v' + self.VERSION, 'bold')}
{self.formatter.colorize('  命令行智能代理工具', 'dim')}
{self.formatter.colorize('=' * 50, 'cyan')}

{self.formatter.info('输入 help 查看可用命令')}
{self.formatter.info('输入 <command> --help 查看命令帮助')}
"""
        print(welcome)
    
    def _execute_command(self, input_str: str):
        """执行命令"""
        input_str = input_str.strip()
        
        if not input_str:
            return
        
        try:
            parts = self._parse_command(input_str)
        except ValueError as e:
            print(self.formatter.error(f"命令解析错误: {e}"))
            return
        
        if not parts:
            return
        
        command = parts[0].lower()
        args = parts[1:]
        
        self.history.add(command, {"args": args})
        
        try:
            if command in self._builtin_commands:
                result = self._builtin_commands[command](args)
            elif command in self._command_handlers:
                result = self._dispatch_command(command, args)
            else:
                print(self.formatter.error(f"未知命令: {command}"))
                print(self.formatter.info("输入 help 查看可用命令"))
                return
            
            if result:
                self._print_result(result)
                
        except CLIAgentError as e:
            print(self.formatter.error(str(e)))
            self.logger.error(f"命令执行失败: {e}")
        except Exception as e:
            print(self.formatter.error(f"执行错误: {e}"))
            self.logger.error(f"命令执行错误: {e}", exc_info=True)
    
    def _parse_command(self, input_str: str) -> List[str]:
        """解析命令"""
        try:
            parts = shlex.split(input_str)
            return parts
        except ValueError as e:
            raise ValueError(f"引号不匹配: {e}")
    
    def _dispatch_command(self, namespace: str, args: List[str]) -> Optional[Dict]:
        """分发命令到处理器"""
        handler = self._command_handlers.get(namespace)
        
        if not handler:
            raise CommandError(f"未知的命令命名空间: {namespace}")
        
        if not args:
            return self._show_namespace_help(namespace)
        
        subcommand = args[0].lower()
        subcommand_args = args[1:]
        
        if subcommand in ["--help", "-h", "help"]:
            return self._show_command_help(namespace, subcommand_args[0] if subcommand_args else None)
        
        method_name = subcommand.replace("-", "_")
        method = getattr(handler, method_name, None)
        
        if not method or not callable(method):
            raise CommandError(f"未知子命令: {namespace} {subcommand}")
        
        kwargs = self._parse_args(subcommand_args)
        
        return method(**kwargs)
    
    def _parse_args(self, args: List[str]) -> Dict[str, Any]:
        """解析命令参数"""
        kwargs = {}
        positional = []
        
        i = 0
        while i < len(args):
            arg = args[i]
            
            if arg.startswith("--"):
                key = arg[2:].replace("-", "_")
                if i + 1 < len(args) and not args[i + 1].startswith("-"):
                    kwargs[key] = args[i + 1]
                    i += 2
                else:
                    kwargs[key] = True
                    i += 1
            elif arg.startswith("-") and len(arg) > 1:
                key = arg[1:].replace("-", "_")
                if i + 1 < len(args) and not args[i + 1].startswith("-"):
                    kwargs[key] = args[i + 1]
                    i += 2
                else:
                    kwargs[key] = True
                    i += 1
            else:
                positional.append(arg)
                i += 1
        
        param_names = ['message', 'file_path', 'query', 'text', 'name', 'value', 'key', 'provider', 'model', 'path']
        for i, val in enumerate(positional):
            if i < len(param_names):
                param_name = param_names[i]
                if param_name not in kwargs:
                    kwargs[param_name] = val
        
        return kwargs
    
    def _print_result(self, result: Dict):
        """打印结果"""
        if isinstance(result, dict):
            if result.get("success"):
                if "message" in result:
                    print(self.formatter.success(result["message"]))
                
                if "data" in result:
                    data = result["data"]
                    if isinstance(data, dict):
                        print(self.formatter.key_value(data))
                    elif isinstance(data, list):
                        if data and isinstance(data[0], dict):
                            print(self.formatter.table(data[:20]))
                        else:
                            print(self.formatter.list(data[:20]))
                        if len(data) > 20:
                            print(self.formatter.colorize(f"... 还有 {len(data) - 20} 项", "dim"))
                    else:
                        print(str(data))
            else:
                print(self.formatter.error(result.get("error", "操作失败")))
        else:
            print(str(result))
    
    def _show_namespace_help(self, namespace: str) -> Dict:
        """显示命名空间帮助"""
        handler = self._command_handlers.get(namespace)
        
        if not handler:
            return {"success": False, "error": f"未知的命名空间: {namespace}"}
        
        methods = []
        for name in dir(handler):
            if not name.startswith("_") and callable(getattr(handler, name)):
                method = getattr(handler, name)
                if hasattr(method, "__doc__") and method.__doc__:
                    doc_lines = method.__doc__.strip().split("\n")
                    desc = doc_lines[0] if doc_lines else ""
                    methods.append({
                        "command": name.replace("_", "-"),
                        "description": desc
                    })
        
        print(self.formatter.header(f"{namespace} 命令"))
        
        if methods:
            print(self.formatter.table(methods, ["command", "description"], 
                                        {"command": "命令", "description": "说明"}))
        
        return {"success": True, "data": {"commands": methods}}
    
    def _show_command_help(self, namespace: str, subcommand: str = None) -> Dict:
        """显示命令帮助"""
        handler = self._command_handlers.get(namespace)
        
        if not handler:
            return {"success": False, "error": f"未知的命名空间: {namespace}"}
        
        if subcommand:
            method_name = subcommand.replace("-", "_")
            method = getattr(handler, method_name, None)
            
            if method and hasattr(method, "__doc__"):
                print(self.formatter.header(f"{namespace} {subcommand}"))
                print(method.__doc__)
            else:
                return {"success": False, "error": f"未知的子命令: {subcommand}"}
        else:
            return self._show_namespace_help(namespace)
        
        return {"success": True}
    
    def _cmd_help(self, args: List[str]) -> Dict:
        """显示帮助信息"""
        if args:
            namespace = args[0]
            subcommand = args[1] if len(args) > 1 else None
            return self._show_command_help(namespace, subcommand)
        
        help_text = f"""
{self.formatter.header("CLI Agent 帮助")}

{self.formatter.subheader("内置命令")}
{self.formatter.list([
    "help [command]     - 显示帮助信息",
    "version            - 显示版本信息",
    "exit / quit        - 退出程序",
    "clear              - 清屏",
    "history            - 显示命令历史",
    "status             - 显示系统状态"
])}

{self.formatter.subheader("功能模块")}
{self.formatter.list([
    "excel <command>    - Excel文件处理",
    "ai <command>       - AI模型调用",
    "api <command>      - API接口调用",
    "config <command>   - 配置管理"
])}

{self.formatter.info("输入 <module> help 查看模块详细命令")}
"""
        print(help_text)
        return {"success": True}
    
    def _cmd_version(self, args: List[str]) -> Dict:
        """显示版本信息"""
        version_info = f"""
{self.formatter.colorize('CLI Agent', 'bold')} v{self.VERSION}
Python {sys.version.split()[0]}
Platform: {sys.platform}
"""
        print(version_info)
        return {"success": True, "data": {"version": self.VERSION}}
    
    def _cmd_exit(self, args: List[str] = None) -> Dict:
        """退出程序"""
        self._running = False
        print(self.formatter.info("再见！"))
        return {"success": True}
    
    def _cmd_clear(self, args: List[str]) -> Dict:
        """清屏"""
        os.system('cls' if os.name == 'nt' else 'clear')
        return {"success": True}
    
    def _cmd_history(self, args: List[str]) -> Dict:
        """显示命令历史"""
        count = 10
        if args:
            try:
                count = int(args[0])
            except ValueError:
                pass
        
        history = self.history.get_recent(count)
        
        print(self.formatter.header("命令历史"))
        
        for entry in history:
            timestamp = entry.get("timestamp", "")[:19]
            command = entry.get("command", "")
            success = "✓" if entry.get("success", True) else "✗"
            print(f"  {timestamp} {success} {command}")
        
        return {"success": True}
    
    def _cmd_status(self, args: List[str]) -> Dict:
        """显示系统状态"""
        print(self.formatter.header("系统状态"))
        
        config_path = self.config_manager.get_config_path()
        print(f"  配置文件: {config_path}")
        
        providers = self.ai_service.list_providers()
        registered = [p for p in providers if self.ai_service.is_provider_registered(p)]
        print(f"  已注册AI提供商: {', '.join(registered) if registered else '无'}")
        
        endpoints = self.api_service.list_endpoints()
        print(f"  已注册API端点: {len(endpoints)}")
        
        stats = self.history.get_stats()
        print(f"  命令历史: {stats['total_commands']} 条")
        
        return {"success": True}
    
    def _cleanup(self):
        """清理资源"""
        self.history.save()
        self.logger.info("CLI Agent 已退出")
    
    def execute(self, command: str) -> Dict:
        """
        执行单条命令（非交互模式）
        
        Args:
            command: 命令字符串
            
        Returns:
            执行结果
        """
        self._execute_command(command)
        return {"success": True}
    
    def get_completions(self, text: str) -> List[str]:
        """
        获取命令补全建议
        
        Args:
            text: 当前输入文本
            
        Returns:
            补全建议列表
        """
        if not text:
            return list(self._builtin_commands.keys()) + list(self._command_handlers.keys())
        
        parts = text.split()
        
        if len(parts) == 1:
            prefix = parts[0]
            all_commands = list(self._builtin_commands.keys()) + list(self._command_handlers.keys())
            return [cmd for cmd in all_commands if cmd.startswith(prefix)]
        
        namespace = parts[0]
        subcommand_prefix = parts[-1] if len(parts) > 1 else ""
        
        if namespace in self._command_handlers:
            handler = self._command_handlers[namespace]
            subcommands = []
            
            for name in dir(handler):
                if not name.startswith("_") and callable(getattr(handler, name)):
                    cmd_name = name.replace("_", "-")
                    if cmd_name.startswith(subcommand_prefix):
                        subcommands.append(f"{namespace} {cmd_name}")
            
            return subcommands
        
        return []


def main():
    """主入口函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description="CLI Agent - 命令行智能代理工具")
    parser.add_argument("--config-dir", help="配置目录路径")
    parser.add_argument("--log-level", default="INFO", help="日志级别")
    parser.add_argument("--no-color", action="store_true", help="禁用彩色输出")
    parser.add_argument("-c", "--command", help="执行单条命令后退出")
    parser.add_argument("-v", "--version", action="store_true", help="显示版本信息")
    
    args = parser.parse_args()
    
    if args.version:
        print(f"CLI Agent v{CLIAgent.VERSION}")
        return
    
    agent = CLIAgent(
        config_dir=args.config_dir,
        log_level=args.log_level,
        use_color=not args.no_color
    )
    
    if args.command:
        agent.execute(args.command)
    else:
        agent.run()


if __name__ == "__main__":
    main()
