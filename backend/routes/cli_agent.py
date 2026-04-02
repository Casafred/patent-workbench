"""
Embedded CLI routes.

Provides:
- natural-language orchestration for the in-page CLI
- lightweight legacy command support for built-in command namespaces
- model/provider listing for CLI-side selection
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from flask import Blueprint, Response, request, session, stream_with_context

from backend.middleware import validate_api_request
from backend.services import get_aliyun_client, get_zhipu_client
from backend.services.cli_orchestrator import CLIOrchestrator
from backend.services.llm.provider_factory import get_factory
from backend.utils import create_response

cli_agent_bp = Blueprint("cli_agent", __name__)

orchestrator = CLIOrchestrator()


class CommandRegistry:
    """Minimal CLI command registry for built-in help and command mode."""

    def __init__(self):
        self._commands = {
            "patent": {
                "description": "专利抓取与分析",
                "subcommands": {
                    "search": "抓取一个或多个专利",
                    "family": "查看专利同族入口",
                    "compare": "查看同族对比入口",
                },
            },
            "ai": {
                "description": "AI 模型工具",
                "subcommands": {
                    "chat": "与模型对话",
                    "models": "列出可用模型",
                },
            },
            "help": {"description": "查看帮助", "subcommands": {}},
            "status": {"description": "查看 CLI 状态", "subcommands": {}},
        }

    def list_commands(self) -> List[Dict[str, str]]:
        return [
            {"name": name, "description": info["description"]}
            for name, info in self._commands.items()
        ]

    def get_help_text(self, command: Optional[str] = None) -> str:
        if command and command in self._commands:
            info = self._commands[command]
            lines = [f"{command}: {info['description']}"]
            for subcommand, desc in info.get("subcommands", {}).items():
                lines.append(f"  {subcommand}: {desc}")
            return "\n".join(lines)

        lines = ["CLI Agent 可用命令:"]
        for name, info in self._commands.items():
            lines.append(f"  {name}: {info['description']}")
        lines.append("")
        lines.append("也支持自然语言，例如: 查询 CN104154208B 专利详情")
        return "\n".join(lines)


class SimpleCommandExecutor:
    """Small legacy command executor for CLI command-style inputs."""

    def __init__(self):
        self.registry = CommandRegistry()

    def execute(self, parsed_command: Dict[str, Any], request_context: Dict[str, Any]) -> Dict[str, Any]:
        command = parsed_command.get("command")
        subcommand = parsed_command.get("subcommand")
        params = parsed_command.get("params", {})
        if request_context:
            params.update(request_context)

        if command == "help":
            return {
                "success": True,
                "data": {
                    "help": self.registry.get_help_text(subcommand),
                    "commands": self.registry.list_commands(),
                },
            }

        if command == "status":
            return {
                "success": True,
                "data": {
                    "status": "running",
                    "timestamp": datetime.now().isoformat(),
                    "mode": "embedded_cli",
                },
            }

        if command == "ai" and subcommand == "models":
            return list_models_data()

        if command == "ai" and subcommand == "chat":
            message = params.get("message") or params.get("query")
            provider = params.get("provider")
            model = params.get("model")
            if not message:
                return {"success": False, "error": "缺少对话内容"}
            return orchestrator.execute(
                user_input=message,
                session_key=str(request_context.get("session_id", "web_cli")),
                user_id=str(request_context.get("user_id", "anonymous")),
                provider=provider,
                model=model,
            )

        if command == "patent":
            patent_numbers = params.get("patent_numbers") or []
            if isinstance(patent_numbers, str):
                patent_numbers = patent_numbers.replace("\n", " ").split()
            normalized = " ".join(patent_numbers) if patent_numbers else params.get("message", "")

            if subcommand == "search":
                message = f"查询 {normalized} 专利详情".strip()
                return orchestrator.execute(
                    user_input=message,
                    session_key=str(request_context.get("session_id", "web_cli")),
                    user_id=str(request_context.get("user_id", "anonymous")),
                    provider=params.get("provider"),
                    model=params.get("model"),
                )

            if subcommand == "family":
                patent_number = params.get("patent_number") or normalized
                return {
                    "success": True,
                    "message": f"同族入口已准备: {patent_number}",
                    "data": {
                        "api_endpoint": f"/api/patent/family/{patent_number}",
                    },
                }

            if subcommand == "compare":
                return {
                    "success": True,
                    "message": "同族对比入口已准备",
                    "data": {
                        "api_endpoint": "/api/patent/family/compare",
                        "patent_numbers": patent_numbers,
                    },
                }

        return {
            "success": False,
            "error": f"未知命令: {command} {subcommand or ''}".strip(),
            "suggestions": ["输入 help 查看命令", "或直接用自然语言发起请求"],
        }


registry = CommandRegistry()
executor = SimpleCommandExecutor()


def get_request_context() -> Dict[str, Any]:
    return {
        "user_id": session.get("user_id", "anonymous"),
        "session_id": session.get("session_id") or session.get("_id") or "web_cli",
    }


def try_get_available_provider() -> Optional[str]:
    client, _ = get_zhipu_client()
    if client:
        return "zhipu"
    client, _ = get_aliyun_client()
    if client:
        return "aliyun"
    return None


def parse_legacy_command(text: str, provider: Optional[str], model: Optional[str]) -> Dict[str, Any]:
    tokens = (text or "").strip().split()
    command = tokens[0].lower()
    subcommand = tokens[1].lower() if len(tokens) > 1 else None
    remaining = tokens[2:] if len(tokens) > 2 else []

    params: Dict[str, Any] = {}
    if command == "ai" and subcommand == "chat":
        params["message"] = text.split(" ", 2)[2] if len(text.split(" ", 2)) == 3 else ""
    elif command == "patent" and subcommand in {"search", "compare"}:
        params["patent_numbers"] = remaining
    elif command == "patent" and subcommand == "family":
        params["patent_number"] = remaining[0] if remaining else ""

    if provider:
        params["provider"] = provider
    if model:
        params["model"] = model

    return {
        "command": command,
        "subcommand": subcommand,
        "params": params,
        "confidence": 1.0,
    }


def list_models_data() -> Dict[str, Any]:
    factory = get_factory()
    enabled_providers = factory.get_enabled_providers()
    default_provider = factory.get_default_provider_name()

    providers = []
    for provider in enabled_providers:
        provider_id = provider.get("id")
        config = factory.get_provider_config(provider_id) or {}
        providers.append(
            {
                "id": provider_id,
                "name": provider.get("name", provider_id),
                "default_model": config.get("default_model"),
                "models": config.get("models", []),
                "features": provider.get("features", {}),
            }
        )

    return {
        "success": True,
        "data": {
            "default_provider": default_provider,
            "providers": providers,
        },
    }


@cli_agent_bp.route("/cli/execute", methods=["POST"])
def execute_command():
    """Execute a CLI command or natural language request."""
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response

    try:
        req_data = request.get_json() or {}
        user_input = (req_data.get("input") or "").strip()
        mode = req_data.get("mode", "auto")
        provider = req_data.get("provider")
        model = req_data.get("model")

        if not user_input:
            return create_response(error="请输入命令")

        request_context = get_request_context()

        if mode == "orchestrate" or (mode == "auto" and not orchestrator.is_builtin_or_command_style(user_input)):
            result = orchestrator.execute(
                user_input=user_input,
                session_key=str(request_context["session_id"]),
                user_id=str(request_context["user_id"]),
                provider=provider,
                model=model,
            )
            status_code = 200 if result.get("success", False) else 400
            return create_response(data=result, status_code=status_code)

        parsed = parse_legacy_command(user_input, provider=provider, model=model)
        result = executor.execute(parsed, request_context)
        status_code = 200 if result.get("success", False) else 400
        return create_response(
            data={
                "success": result.get("success", False),
                "mode": "legacy_cli_command",
                "parsed": parsed,
                "result": result,
            },
            status_code=status_code,
        )

    except Exception as exc:
        return create_response(error=f"执行失败: {str(exc)}")


@cli_agent_bp.route("/cli/stream", methods=["POST"])
def stream_execute_command():
    """Stream CLI orchestration and execution traces via SSE."""
    is_valid, error_response = validate_api_request()
    if not is_valid:
        error_json = json.dumps(
            {"type": "error", "error": error_response.get_json().get("error", "request error")},
            ensure_ascii=False,
        )
        return Response(f"data: {error_json}\n\n", mimetype="text/event-stream", status=error_response.status_code)

    req_data = request.get_json() or {}
    user_input = (req_data.get("input") or "").strip()
    provider = req_data.get("provider")
    model = req_data.get("model")

    if not user_input:
        error_json = json.dumps({"type": "error", "error": "请输入命令"}, ensure_ascii=False)
        return Response(f"data: {error_json}\n\n", mimetype="text/event-stream", status=400)

    request_context = get_request_context()

    def generate():
        try:
            if orchestrator.is_builtin_or_command_style(user_input):
                parsed = parse_legacy_command(user_input, provider=provider, model=model)
                result = executor.execute(parsed, request_context)
                yield f"data: {json.dumps({'type': 'trace', 'stage': 'command', 'message': '执行命令模式'}, ensure_ascii=False)}\n\n"
                yield f"data: {json.dumps({'type': 'final', 'data': result}, ensure_ascii=False)}\n\n"
                yield "data: [DONE]\n\n"
                return

            for event in orchestrator.stream_execute(
                user_input=user_input,
                session_key=str(request_context['session_id']),
                user_id=str(request_context['user_id']),
                provider=provider,
                model=model,
            ):
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

            yield "data: [DONE]\n\n"
        except Exception as exc:
            payload = {"type": "error", "error": str(exc)}
            yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@cli_agent_bp.route("/cli/parse", methods=["POST"])
def parse_command():
    """Parse user input into either command-mode or orchestration-mode metadata."""
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response

    try:
        req_data = request.get_json() or {}
        user_input = (req_data.get("input") or "").strip()
        provider = req_data.get("provider")
        model = req_data.get("model")
        if not user_input:
            return create_response(error="请输入命令")

        if orchestrator.is_builtin_or_command_style(user_input):
            parsed = parse_legacy_command(user_input, provider=provider, model=model)
            help_text = registry.get_help_text(parsed.get("command"))
        else:
            intent = orchestrator.detect_intent(
                user_input,
                orchestrator.extract_patent_numbers(user_input),
            )
            parsed = {
                "mode": "orchestrated_cli",
                "intent": intent,
                "patent_numbers": orchestrator.extract_patent_numbers(user_input),
                "provider": provider,
                "model": model,
            }
            help_text = "将自动执行: 专利识别 -> 抓取 -> 上下文注入 -> 模型问答"

        return create_response(data={"parsed": parsed, "help": help_text})
    except Exception as exc:
        return create_response(error=f"解析失败: {str(exc)}")


@cli_agent_bp.route("/cli/help", methods=["GET"])
def get_help():
    """Get CLI help text."""
    command = request.args.get("command")
    return create_response(
        data={
            "help": registry.get_help_text(command),
            "commands": registry.list_commands(),
        }
    )


@cli_agent_bp.route("/cli/commands", methods=["GET"])
def list_commands():
    """List available CLI command namespaces."""
    return create_response(data={"commands": registry.list_commands()})


@cli_agent_bp.route("/cli/models", methods=["GET"])
def list_models():
    """List enabled providers and models for the embedded CLI."""
    result = list_models_data()
    return create_response(data=result["data"])


@cli_agent_bp.route("/cli/chat", methods=["POST"])
def chat():
    """Multi-turn chat endpoint backed by the orchestrator."""
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response

    try:
        req_data = request.get_json() or {}
        messages = req_data.get("messages", [])
        provider = req_data.get("provider") or try_get_available_provider()
        model = req_data.get("model")

        if not messages:
            return create_response(error="请提供对话消息")

        latest_user_message = ""
        for message in reversed(messages):
            if message.get("role") == "user":
                latest_user_message = message.get("content", "")
                break

        if not latest_user_message:
            return create_response(error="缺少用户问题")

        request_context = get_request_context()
        result = orchestrator.execute(
            user_input=latest_user_message,
            session_key=str(request_context["session_id"]),
            user_id=str(request_context["user_id"]),
            provider=provider,
            model=model,
        )
        status_code = 200 if result.get("success", False) else 400
        return create_response(data=result, status_code=status_code)
    except Exception as exc:
        return create_response(error=f"对话失败: {str(exc)}")
