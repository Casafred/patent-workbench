"""
CLI Agent 输出格式化模块

提供输出格式化和显示功能。
"""

import json
from typing import Any, Dict, List, Optional
from datetime import datetime


class OutputFormatter:
    """输出格式化器"""
    
    COLORS = {
        "reset": "\033[0m",
        "bold": "\033[1m",
        "dim": "\033[2m",
        "red": "\033[31m",
        "green": "\033[32m",
        "yellow": "\033[33m",
        "blue": "\033[34m",
        "magenta": "\033[35m",
        "cyan": "\033[36m",
        "white": "\033[37m",
        "bg_red": "\033[41m",
        "bg_green": "\033[42m",
        "bg_yellow": "\033[43m",
    }
    
    def __init__(self, use_color: bool = True):
        self.use_color = use_color
    
    def colorize(self, text: str, color: str) -> str:
        """添加颜色"""
        if not self.use_color or color not in self.COLORS:
            return text
        return f"{self.COLORS[color]}{text}{self.COLORS['reset']}"
    
    def success(self, message: str) -> str:
        """成功消息"""
        return self.colorize(f"✓ {message}", "green")
    
    def error(self, message: str) -> str:
        """错误消息"""
        return self.colorize(f"✗ {message}", "red")
    
    def warning(self, message: str) -> str:
        """警告消息"""
        return self.colorize(f"⚠ {message}", "yellow")
    
    def info(self, message: str) -> str:
        """信息消息"""
        return self.colorize(f"ℹ {message}", "cyan")
    
    def header(self, title: str) -> str:
        """标题"""
        line = "═" * (len(title) + 4)
        return f"\n{self.colorize(line, 'cyan')}\n  {self.colorize(title, 'bold')}\n{self.colorize(line, 'cyan')}\n"
    
    def subheader(self, title: str) -> str:
        """子标题"""
        return f"\n{self.colorize(f'── {title} ──', 'yellow')}\n"
    
    def table(
        self,
        data: List[Dict],
        columns: List[str] = None,
        headers: Dict[str, str] = None,
        max_width: int = 80
    ) -> str:
        """
        格式化表格
        
        Args:
            data: 数据列表
            columns: 要显示的列
            headers: 列标题映射
            max_width: 最大宽度
            
        Returns:
            格式化后的表格字符串
        """
        if not data:
            return self.info("无数据")
        
        if columns is None:
            columns = list(data[0].keys())
        
        if headers is None:
            headers = {col: col for col in columns}
        
        col_widths = {}
        for col in columns:
            header_len = len(headers.get(col, col))
            max_data_len = max(
                len(str(row.get(col, ""))) for row in data
            ) if data else 0
            col_widths[col] = min(max(header_len, max_data_len) + 2, max_width // len(columns))
        
        header_row = "│"
        separator = "┼"
        
        for col in columns:
            header_text = headers.get(col, col)
            header_row += f" {header_text:<{col_widths[col] - 1}}│"
            separator += "─" * col_widths[col] + "┼"
        
        separator = "┌" + separator[1:-1] + "┐"
        header_separator = "├" + separator[3:-3].replace("┼", "┼") + "┤"
        bottom_separator = "└" + separator[3:-3].replace("┼", "┴") + "┘"
        
        lines = [separator]
        lines.append(self.colorize(header_row, "bold"))
        lines.append(header_separator.replace("┼", "┬"))
        
        for row in data:
            row_str = "│"
            for col in columns:
                value = str(row.get(col, ""))
                if len(value) > col_widths[col] - 2:
                    value = value[:col_widths[col] - 5] + "..."
                row_str += f" {value:<{col_widths[col] - 1}}│"
            lines.append(row_str)
        
        lines.append(bottom_separator.replace("┼", "┴"))
        
        return "\n".join(lines)
    
    def json(self, data: Any, indent: int = 2) -> str:
        """格式化JSON"""
        try:
            formatted = json.dumps(data, indent=indent, ensure_ascii=False)
            return self._highlight_json(formatted)
        except Exception:
            return str(data)
    
    def _highlight_json(self, json_str: str) -> str:
        """JSON语法高亮"""
        if not self.use_color:
            return json_str
        
        import re
        
        json_str = re.sub(
            r'"([^"]+)":',
            f'{self.COLORS["cyan"]}"\\1"{self.COLORS["reset"]}:',
            json_str
        )
        
        json_str = re.sub(
            r': "([^"]*)"',
            f': {self.COLORS["green"]}"\\1"{self.COLORS["reset"]}',
            json_str
        )
        
        json_str = re.sub(
            r': (\d+)',
            f': {self.COLORS["yellow"]}\\1{self.COLORS["reset"]}',
            json_str
        )
        
        json_str = re.sub(
            r': (true|false)',
            f': {self.COLORS["magenta"]}\\1{self.COLORS["reset"]}',
            json_str
        )
        
        json_str = re.sub(
            r': (null)',
            f': {self.COLORS["dim"]}\\1{self.COLORS["reset"]}',
            json_str
        )
        
        return json_str
    
    def list(self, items: List[Any], bullet: str = "•", indent: int = 2) -> str:
        """格式化列表"""
        lines = []
        indent_str = " " * indent
        
        for item in items:
            if isinstance(item, dict):
                for key, value in item.items():
                    lines.append(f"{indent_str}{bullet} {self.colorize(str(key), 'cyan')}: {value}")
            else:
                lines.append(f"{indent_str}{bullet} {item}")
        
        return "\n".join(lines)
    
    def key_value(self, data: Dict, indent: int = 2) -> str:
        """格式化键值对"""
        lines = []
        indent_str = " " * indent
        
        for key, value in data.items():
            key_str = self.colorize(str(key), "cyan")
            
            if isinstance(value, dict):
                lines.append(f"{indent_str}{key_str}:")
                lines.append(self.key_value(value, indent + 2))
            elif isinstance(value, list):
                lines.append(f"{indent_str}{key_str}: [{len(value)} 项]")
            elif isinstance(value, str) and len(value) > 50:
                lines.append(f"{indent_str}{key_str}: {value[:50]}...")
            else:
                lines.append(f"{indent_str}{key_str}: {value}")
        
        return "\n".join(lines)
    
    def progress(self, current: int, total: int, width: int = 40, prefix: str = "") -> str:
        """进度条"""
        if total == 0:
            percent = 100
        else:
            percent = int(current / total * 100)
        
        filled = int(width * current / total) if total > 0 else width
        empty = width - filled
        
        bar = "█" * filled + "░" * empty
        
        progress_str = f"[{self.colorize(bar, 'green')}] {percent}%"
        
        if prefix:
            progress_str = f"{prefix} {progress_str}"
        
        return progress_str
    
    def timestamp(self, dt: datetime = None, format: str = "%Y-%m-%d %H:%M:%S") -> str:
        """时间戳"""
        if dt is None:
            dt = datetime.now()
        return self.colorize(dt.strftime(format), "dim")
    
    def code_block(self, code: str, language: str = "") -> str:
        """代码块"""
        lines = [self.colorize(f"```{language}", "dim")]
        lines.append(code)
        lines.append(self.colorize("```", "dim"))
        return "\n".join(lines)
    
    def divider(self, char: str = "─", width: int = 60) -> str:
        """分隔线"""
        return self.colorize(char * width, "dim")
    
    def format_response(self, response: Dict) -> str:
        """格式化响应"""
        lines = []
        
        if response.get("success"):
            lines.append(self.success(response.get("message", "操作成功")))
        else:
            lines.append(self.error(response.get("error", "操作失败")))
        
        if "data" in response:
            lines.append("")
            lines.append(self.subheader("数据"))
            data = response["data"]
            
            if isinstance(data, dict):
                lines.append(self.key_value(data))
            elif isinstance(data, list):
                lines.append(self.list(data))
            else:
                lines.append(str(data))
        
        return "\n".join(lines)
