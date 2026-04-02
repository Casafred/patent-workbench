"""
CLI Agent 单元测试
"""

import unittest
import os
import sys
import tempfile
import json
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cli_agent.core.config import ConfigManager
from cli_agent.core.exceptions import CLIAgentError, ValidationError, ConfigError
from cli_agent.core.history import CommandHistory
from cli_agent.utils.validators import InputValidator
from cli_agent.utils.formatters import OutputFormatter


class TestConfigManager(unittest.TestCase):
    """配置管理器测试"""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.config_manager = ConfigManager(self.temp_dir)
        self.config_manager.initialize()
    
    def test_default_config(self):
        """测试默认配置"""
        self.assertIsNotNone(self.config_manager.get("app"))
        self.assertEqual(self.config_manager.get("app.name"), "CLI Agent")
    
    def test_set_and_get(self):
        """测试设置和获取配置"""
        self.config_manager.set("test.key", "value")
        self.assertEqual(self.config_manager.get("test.key"), "value")
    
    def test_nested_config(self):
        """测试嵌套配置"""
        self.config_manager.set("ai.default_model", "glm-4-plus")
        self.assertEqual(self.config_manager.get("ai.default_model"), "glm-4-plus")
    
    def test_api_key_management(self):
        """测试API密钥管理"""
        self.config_manager.set_api_key("test_provider", "test_key_123")
        self.assertEqual(self.config_manager.get_api_key("test_provider"), "test_key_123")
        
        self.config_manager.delete_secret("api_key_test_provider")
        self.assertIsNone(self.config_manager.get_api_key("test_provider"))
    
    def test_get_nonexistent_key(self):
        """测试获取不存在的键"""
        self.assertIsNone(self.config_manager.get("nonexistent.key"))
        self.assertEqual(self.config_manager.get("nonexistent.key", "default"), "default")


class TestCommandHistory(unittest.TestCase):
    """命令历史测试"""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.history = CommandHistory(history_dir=self.temp_dir)
    
    def test_add_command(self):
        """测试添加命令"""
        self.history.add("test_command", {"args": ["arg1"]})
        
        recent = self.history.get_recent(1)
        self.assertEqual(len(recent), 1)
        self.assertEqual(recent[0]["command"], "test_command")
    
    def test_search_commands(self):
        """测试搜索命令"""
        self.history.add("excel load test.xlsx")
        self.history.add("ai chat hello")
        self.history.add("excel info test.xlsx")
        
        results = self.history.search("excel")
        self.assertEqual(len(results), 2)
    
    def test_history_stats(self):
        """测试历史统计"""
        self.history.add("cmd1", success=True)
        self.history.add("cmd2", success=False)
        self.history.add("cmd3", success=True)
        
        stats = self.history.get_stats()
        self.assertEqual(stats["total_commands"], 3)
        self.assertEqual(stats["failed_commands"], 1)
    
    def test_save_and_load(self):
        """测试保存和加载"""
        self.history.add("test_command")
        self.history.save()
        
        new_history = CommandHistory(history_dir=self.temp_dir)
        new_history.load()
        
        self.assertEqual(len(new_history.get_all()), 1)


class TestInputValidator(unittest.TestCase):
    """输入验证器测试"""
    
    def test_validate_file_path(self):
        """测试文件路径验证"""
        is_valid, _ = InputValidator.validate_file_path(__file__, must_exist=True)
        self.assertTrue(is_valid)
        
        is_valid, error = InputValidator.validate_file_path("/nonexistent/file.txt", must_exist=True)
        self.assertFalse(is_valid)
    
    def test_validate_url(self):
        """测试URL验证"""
        is_valid, _ = InputValidator.validate_url("https://example.com")
        self.assertTrue(is_valid)
        
        is_valid, _ = InputValidator.validate_url("not_a_url")
        self.assertFalse(is_valid)
    
    def test_validate_integer(self):
        """测试整数验证"""
        is_valid, _, val = InputValidator.validate_integer("123", min_val=0, max_val=200)
        self.assertTrue(is_valid)
        self.assertEqual(val, 123)
        
        is_valid, _, _ = InputValidator.validate_integer("abc")
        self.assertFalse(is_valid)
    
    def test_validate_json(self):
        """测试JSON验证"""
        is_valid, _, data = InputValidator.validate_json('{"key": "value"}')
        self.assertTrue(is_valid)
        self.assertEqual(data, {"key": "value"})
        
        is_valid, _, _ = InputValidator.validate_json("not json")
        self.assertFalse(is_valid)
    
    def test_sanitize_input(self):
        """测试输入清理"""
        result = InputValidator.sanitize_input("  test  ")
        self.assertEqual(result, "test")
        
        result = InputValidator.sanitize_input("<script>alert('xss')</script>")
        self.assertNotIn("<script>", result)


class TestOutputFormatter(unittest.TestCase):
    """输出格式化器测试"""
    
    def setUp(self):
        self.formatter = OutputFormatter(use_color=False)
    
    def test_success_message(self):
        """测试成功消息"""
        msg = self.formatter.success("操作成功")
        self.assertIn("操作成功", msg)
    
    def test_error_message(self):
        """测试错误消息"""
        msg = self.formatter.error("操作失败")
        self.assertIn("操作失败", msg)
    
    def test_table_formatting(self):
        """测试表格格式化"""
        data = [
            {"name": "Alice", "age": "30"},
            {"name": "Bob", "age": "25"}
        ]
        table = self.formatter.table(data)
        self.assertIn("Alice", table)
        self.assertIn("Bob", table)
    
    def test_json_formatting(self):
        """测试JSON格式化"""
        data = {"key": "value", "number": 123}
        json_str = self.formatter.json(data)
        self.assertIn("key", json_str)
        self.assertIn("value", json_str)
    
    def test_key_value_formatting(self):
        """测试键值对格式化"""
        data = {"name": "test", "value": 123}
        result = self.formatter.key_value(data)
        self.assertIn("name", result)
        self.assertIn("test", result)


class TestExceptions(unittest.TestCase):
    """异常测试"""
    
    def test_cli_agent_error(self):
        """测试基础异常"""
        error = CLIAgentError("测试错误", code="TEST_ERROR")
        self.assertEqual(error.message, "测试错误")
        self.assertEqual(error.code, "TEST_ERROR")
        
        error_dict = error.to_dict()
        self.assertTrue(error_dict["error"])
    
    def test_validation_error(self):
        """测试验证异常"""
        error = ValidationError("无效输入", field="username", value="test")
        self.assertEqual(error.details["field"], "username")
    
    def test_config_error(self):
        """测试配置异常"""
        error = ConfigError("配置错误", config_key="test.key")
        self.assertEqual(error.details["config_key"], "test.key")


if __name__ == "__main__":
    unittest.main()
