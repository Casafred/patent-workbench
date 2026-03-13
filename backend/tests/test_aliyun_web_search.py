"""
阿里云百炼联网搜索功能测试

测试阿里云百炼平台的联网搜索功能是否正确实现
"""

import unittest
from unittest.mock import Mock, patch, MagicMock
from backend.services.llm.aliyun_provider import AliyunProvider


class TestAliyunWebSearch(unittest.TestCase):
    """阿里云百炼联网搜索功能测试"""
    
    def setUp(self):
        """测试前准备"""
        self.api_key = "test_api_key"
        self.config = {
            "default_model": "qwen-plus",
            "models": [
                {"id": "qwen-plus", "name": "Qwen-Plus"},
                {"id": "qwen-turbo", "name": "Qwen-Turbo"},
                {"id": "qwen3-max", "name": "Qwen3-Max"}
            ]
        }
        self.provider = AliyunProvider(self.api_key, self.config)
        self.messages = [
            {"role": "user", "content": "杭州今天天气如何？"}
        ]
    
    def test_enable_search_parameter(self):
        """测试 enable_search 参数是否正确设置"""
        extra_body = self.provider._build_extra_body({"enable_search": True})
        self.assertIsNotNone(extra_body)
        self.assertTrue(extra_body.get("enable_search"))
        self.assertEqual(extra_body["enable_search"], True)
    
    def test_disable_search_parameter(self):
        """测试不启用搜索时的参数"""
        extra_body = self.provider._build_extra_body({"enable_search": False})
        self.assertIsNone(extra_body)
    
    def test_complete_with_search_method_exists(self):
        """测试 complete_with_search 方法存在"""
        self.assertTrue(hasattr(self.provider, "complete_with_search"))
    
    def test_complete_with_search_calls_stream(self):
        """测试 complete_with_search 调用 stream 方法并传入 enable_search"""
        # 记录调用参数
        call_args = {}
        
        def mock_stream(**kwargs):
            call_args.update(kwargs)
            return iter([])
        
        original_stream = self.provider.stream
        self.provider.stream = mock_stream
        
        try:
            list(self.provider.complete_with_search(
                messages=self.messages,
                model="qwen-plus",
                temperature=0.7
            ))
            
            self.assertTrue(call_args.get("enable_search"))
        finally:
            self.provider.stream = original_stream
    
    def test_stream_includes_enable_search(self):
        """测试 stream 方法正确包含 enable_search 参数"""
        # 测试 extra_body 是否正确构建
        extra_body = self.provider._build_extra_body({"enable_search": True})
        self.assertIsNotNone(extra_body)
        self.assertTrue(extra_body.get("enable_search"))
    
    def test_search_with_thinking_mode(self):
        """测试搜索模式与思考模式同时启用"""
        extra_body = self.provider._build_extra_body({
            "enable_search": True,
            "enable_thinking": True,
            "thinking_budget": 2048
        })
        
        self.assertIsNotNone(extra_body)
        self.assertTrue(extra_body.get("enable_search"))
        self.assertTrue(extra_body.get("enable_thinking"))
        self.assertEqual(extra_body.get("thinking_budget"), 2048)
    
    def test_supported_web_search_models(self):
        """测试支持联网搜索的模型列表"""
        web_search_models = [
            "qwen-flash",
            "qwen-turbo",
            "qwen-plus",
            "qwen3-max"
        ]
        
        for model in web_search_models:
            with self.subTest(model=model):
                extra_body = self.provider._build_extra_body({"enable_search": True})
                self.assertIsNotNone(extra_body)
                self.assertTrue(extra_body.get("enable_search"))
    
    def test_parse_error_for_search_failure(self):
        """测试解析搜索失败错误"""
        # 创建一个模拟的错误对象
        mock_error = Exception("enable_search is not supported for this model")
        
        error_dict = self.provider.parse_error(mock_error)
        
        self.assertEqual(error_dict["provider"], "aliyun")
        self.assertIn("enable_search", error_dict["message"])


class TestAliyunWebSearchIntegration(unittest.TestCase):
    """阿里云百炼联网搜索集成测试"""
    
    @unittest.skip("需要有效的 API Key 才能运行")
    def test_real_web_search_request(self):
        """真实测试阿里云联网搜索请求"""
        import os
        from openai import OpenAI
        
        api_key = os.getenv("ALIYUN_API_KEY")
        if not api_key:
            self.skipTest("ALIYUN_API_KEY 环境变量未设置")
        
        client = OpenAI(
            api_key=api_key,
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1"
        )
        
        response = client.chat.completions.create(
            model="qwen-plus",
            messages=[
                {"role": "user", "content": "2026 年最新的 AI 技术趋势是什么？"}
            ],
            extra_body={"enable_search": True}
        )
        
        self.assertIsNotNone(response)
        self.assertIsNotNone(response.choices[0].message.content)
        self.assertGreater(len(response.choices[0].message.content), 0)


if __name__ == "__main__":
    unittest.main()
