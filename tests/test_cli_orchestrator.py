import unittest
from unittest.mock import patch

from backend.routes.cli_agent import list_models_data, parse_legacy_command
from backend.services.cli_orchestrator import CLIOrchestrator


class TestCLIOrchestrator(unittest.TestCase):
    def setUp(self):
        self.orchestrator = CLIOrchestrator()

    def test_extract_patent_numbers(self):
        text = "查询 CN104154208B 和 us12390907b2 专利详情"
        patents = self.orchestrator.extract_patent_numbers(text)
        self.assertEqual(patents, ["CN104154208B", "US12390907B2"])

    def test_detect_patent_detail_intent(self):
        intent = self.orchestrator.detect_intent(
            "查询 CN104154208B 专利详情",
            ["CN104154208B"],
        )
        self.assertEqual(intent["name"], "patent_detail")

    def test_detect_follow_up_intent(self):
        intent = self.orchestrator.detect_intent("基于这个继续分析创新点", [])
        self.assertEqual(intent["name"], "context_follow_up")

    def test_parse_legacy_command(self):
        parsed = parse_legacy_command("patent search CN104154208B US12390907B2", "aliyun", "qwen-plus")
        self.assertEqual(parsed["command"], "patent")
        self.assertEqual(parsed["subcommand"], "search")
        self.assertEqual(parsed["params"]["patent_numbers"], ["CN104154208B", "US12390907B2"])
        self.assertEqual(parsed["params"]["provider"], "aliyun")
        self.assertEqual(parsed["params"]["model"], "qwen-plus")

    def test_models_include_aliyun_when_enabled(self):
        result = list_models_data()
        providers = result["data"]["providers"]
        provider_ids = [provider["id"] for provider in providers]
        self.assertIn("aliyun", provider_ids)

    def test_stream_execute_for_model_listing(self):
        events = list(
            self.orchestrator.stream_execute(
                user_input="ai models",
                session_key="test_session",
                user_id="test_user",
                provider="aliyun",
                model="qwen-plus",
            )
        )
        event_types = [event["type"] for event in events]
        self.assertIn("trace", event_types)
        self.assertIn("final", event_types)
        self.assertEqual(events[-1]["type"], "done")

    def test_normalize_invalid_api_key_message(self):
        error = ValueError("Error code: 401 - {'error': {'code': 'invalid_api_key'}}")
        message = self.orchestrator.normalize_error_message(error)
        self.assertIn("API Key", message)

    @patch("backend.services.cli_orchestrator.get_api_key")
    def test_ask_llm_reports_missing_key(self, mock_get_api_key):
        mock_get_api_key.return_value = (None, object())
        with self.assertRaises(ValueError) as ctx:
            self.orchestrator.ask_llm(
                user_input="查询 CN104154208B 专利详情",
                provider="aliyun",
                model="qwen-plus",
                patent_context=[],
                message_history=[],
            )
        self.assertIn("API Key", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
