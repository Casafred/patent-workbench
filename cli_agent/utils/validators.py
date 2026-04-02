"""
CLI Agent 输入验证模块

提供输入验证和安全检查功能。
"""

import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from cli_agent.core.exceptions import ValidationError


class InputValidator:
    """输入验证器"""
    
    @staticmethod
    def validate_file_path(file_path: str, must_exist: bool = True) -> Tuple[bool, str]:
        """
        验证文件路径
        
        Args:
            file_path: 文件路径
            must_exist: 文件是否必须存在
            
        Returns:
            (是否有效, 错误信息)
        """
        if not file_path:
            return False, "文件路径不能为空"
        
        path = Path(file_path)
        
        if must_exist and not path.exists():
            return False, f"文件不存在: {file_path}"
        
        if must_exist and not path.is_file():
            return False, f"路径不是文件: {file_path}"
        
        try:
            resolved = path.resolve()
            if must_exist and not str(resolved).startswith(str(Path.cwd().resolve())):
                pass
        except Exception as e:
            return False, f"无效的文件路径: {str(e)}"
        
        return True, ""
    
    @staticmethod
    def validate_directory(dir_path: str, create_if_missing: bool = False) -> Tuple[bool, str]:
        """
        验证目录路径
        
        Args:
            dir_path: 目录路径
            create_if_missing: 如果不存在是否创建
            
        Returns:
            (是否有效, 错误信息)
        """
        if not dir_path:
            return False, "目录路径不能为空"
        
        path = Path(dir_path)
        
        if not path.exists():
            if create_if_missing:
                try:
                    path.mkdir(parents=True, exist_ok=True)
                    return True, ""
                except Exception as e:
                    return False, f"创建目录失败: {str(e)}"
            return False, f"目录不存在: {dir_path}"
        
        if not path.is_dir():
            return False, f"路径不是目录: {dir_path}"
        
        return True, ""
    
    @staticmethod
    def validate_url(url: str) -> Tuple[bool, str]:
        """
        验证URL
        
        Args:
            url: URL字符串
            
        Returns:
            (是否有效, 错误信息)
        """
        if not url:
            return False, "URL不能为空"
        
        url_pattern = re.compile(
            r'^https?://'
            r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'
            r'localhost|'
            r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'
            r'(?::\d+)?'
            r'(?:/?|[/?]\S+)$', re.IGNORECASE
        )
        
        if not url_pattern.match(url):
            return False, f"无效的URL格式: {url}"
        
        return True, ""
    
    @staticmethod
    def validate_api_key(api_key: str, provider: str = None) -> Tuple[bool, str]:
        """
        验证API密钥
        
        Args:
            api_key: API密钥
            provider: 提供商名称
            
        Returns:
            (是否有效, 错误信息)
        """
        if not api_key:
            return False, "API密钥不能为空"
        
        api_key = api_key.strip()
        
        if len(api_key) < 10:
            return False, "API密钥长度不足"
        
        if provider == "zhipu":
            if not re.match(r'^[a-zA-Z0-9._-]+$', api_key):
                return False, "智谱AI API密钥格式无效"
        
        return True, ""
    
    @staticmethod
    def validate_json(json_str: str) -> Tuple[bool, str, Optional[Dict]]:
        """
        验证JSON字符串
        
        Args:
            json_str: JSON字符串
            
        Returns:
            (是否有效, 错误信息, 解析后的数据)
        """
        if not json_str:
            return False, "JSON字符串不能为空", None
        
        try:
            import json
            data = json.loads(json_str)
            return True, "", data
        except json.JSONDecodeError as e:
            return False, f"JSON解析错误: {str(e)}", None
    
    @staticmethod
    def validate_integer(value: str, min_val: int = None, max_val: int = None) -> Tuple[bool, str, Optional[int]]:
        """
        验证整数
        
        Args:
            value: 字符串值
            min_val: 最小值
            max_val: 最大值
            
        Returns:
            (是否有效, 错误信息, 解析后的整数)
        """
        if not value:
            return False, "值不能为空", None
        
        try:
            int_val = int(value)
        except ValueError:
            return False, f"无效的整数: {value}", None
        
        if min_val is not None and int_val < min_val:
            return False, f"值 {int_val} 小于最小值 {min_val}", None
        
        if max_val is not None and int_val > max_val:
            return False, f"值 {int_val} 大于最大值 {max_val}", None
        
        return True, "", int_val
    
    @staticmethod
    def validate_float(value: str, min_val: float = None, max_val: float = None) -> Tuple[bool, str, Optional[float]]:
        """
        验证浮点数
        
        Args:
            value: 字符串值
            min_val: 最小值
            max_val: 最大值
            
        Returns:
            (是否有效, 错误信息, 解析后的浮点数)
        """
        if not value:
            return False, "值不能为空", None
        
        try:
            float_val = float(value)
        except ValueError:
            return False, f"无效的浮点数: {value}", None
        
        if min_val is not None and float_val < min_val:
            return False, f"值 {float_val} 小于最小值 {min_val}", None
        
        if max_val is not None and float_val > max_val:
            return False, f"值 {float_val} 大于最大值 {max_val}", None
        
        return True, "", float_val
    
    @staticmethod
    def validate_choice(value: str, choices: List[str], case_sensitive: bool = False) -> Tuple[bool, str]:
        """
        验证选项
        
        Args:
            value: 输入值
            choices: 可选项列表
            case_sensitive: 是否区分大小写
            
        Returns:
            (是否有效, 错误信息)
        """
        if not value:
            return False, "值不能为空"
        
        if case_sensitive:
            if value not in choices:
                return False, f"无效的选项: {value}。有效选项: {', '.join(choices)}"
        else:
            if value.lower() not in [c.lower() for c in choices]:
                return False, f"无效的选项: {value}。有效选项: {', '.join(choices)}"
        
        return True, ""
    
    @staticmethod
    def sanitize_input(value: str, max_length: int = 10000) -> str:
        """
        清理输入
        
        Args:
            value: 输入值
            max_length: 最大长度
            
        Returns:
            清理后的值
        """
        if not value:
            return ""
        
        value = value.strip()
        
        dangerous_patterns = [
            r'<script[^>]*>.*?</script>',
            r'javascript:',
            r'on\w+\s*=',
        ]
        
        for pattern in dangerous_patterns:
            value = re.sub(pattern, '', value, flags=re.IGNORECASE | re.DOTALL)
        
        if len(value) > max_length:
            value = value[:max_length]
        
        return value
    
    @staticmethod
    def validate_email(email: str) -> Tuple[bool, str]:
        """
        验证邮箱地址
        
        Args:
            email: 邮箱地址
            
        Returns:
            (是否有效, 错误信息)
        """
        if not email:
            return False, "邮箱地址不能为空"
        
        email_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
        
        if not email_pattern.match(email):
            return False, f"无效的邮箱地址: {email}"
        
        return True, ""
    
    @staticmethod
    def validate_command(command: str) -> Tuple[bool, str]:
        """
        验证命令字符串
        
        Args:
            command: 命令字符串
            
        Returns:
            (是否有效, 错误信息)
        """
        if not command:
            return False, "命令不能为空"
        
        dangerous_commands = ['rm', 'del', 'format', 'shutdown', 'reboot', 'mkfs']
        
        first_word = command.split()[0].lower() if command.split() else ''
        
        if first_word in dangerous_commands:
            return False, f"禁止执行危险命令: {first_word}"
        
        return True, ""
