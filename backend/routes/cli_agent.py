"""
Embedded CLI routes.
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


def list_flows_data() -> Dict[str, Any]:
    flows = [
        {
            "id": "patent_lookup",
            "name": "专利详情抓取问答",
            "description": "输入专利号后自动抓取、注入上下文并继续问答",
            "entry_examples": ["查询 CN104154208B 专利详情", "分析 US12390907B2 的创新点"],
            "status": "ready",
        },
        {
            "id": "patent_family_compare",
            "name": "同族专利对比",
            "description": "围绕同族专利做抓取和对比分析",
            "entry_examples": ["flow launch patent_family_compare CN104154208B"],
            "status": "ready",
        },
        {
            "id": "claims_pipeline",
            "name": "权利要求处理流程",
            "description": "适合后续接入 claims 上传、处理、结果回读",
            "entry_examples": ["flow launch claims_pipeline"],
            "status": "planned",
        },
        {
            "id": "pdf_ocr_pipeline",
            "name": "PDF OCR 阅读流程",
            "description": "适合后续接入 PDF OCR 阅读和问答",
            "entry_examples": ["flow launch pdf_ocr_pipeline"],
            "status": "planned",
        },
        {
            "id": "ipc_lookup",
            "name": "IPC 检索流程",
            "description": "适合后续接入 IPC 查询、预测和问答",
            "entry_examples": ["flow launch ipc_lookup H04L"],
            "status": "planned",
        },
    ]
    return {"success": True, "data": {"flows": flows}}


class CommandRegistry:
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
            "flow": {
                "description": "嵌入式服务流程",
                "subcommands": {
                    "list": "列出可嵌入 CLI 的服务流程",
                    "launch": "启动指定服务流程",
                },
            },
            "help": {"description": "查看帮助", "subcommands": {}},
            "status": {"description": "查看 CLI 状态", "subcommands": {}},
        }

    def list_commands(self) -> List[Dict[str, str]]:
        return [{"name": name, "description": info["description"]} for name, info in self._commands.items()]

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
    def __init__(self):
        self.registry = CommandRegistry()

    def execute(self, parsed_command: Dict[str, Any], request_context: Dict[str, Any]) -> Dict[str, Any]:
        command = parsed_command.get("command")
        subcommand = parsed_command.get("subcommand")
        params = parsed_command.get("params", {})
        if request_context:
            params.update(request_context)

        if command == "help":
            return {"success": True, "data": {"help": self.registry.get_help_text(subcommand), "commands": self.registry.list_commands()}}

        if command == "status":
            return {
                "success": True,
                "data": {"status": "running", "timestamp": datetime.now().isoformat(), "mode": "embedded_cli"},
            }

        if command == "ai" and subcommand == "models":
            return list_models_data()

        if command == "ai" and subcommand == "chat":
            message = params.get("message") or params.get("query")
            if not message:
                return {"success": False, "error": "缺少对话内容"}
            return orchestrator.execute(
                user_input=message,
                session_key=str(request_context.get("session_id", "web_cli")),
                user_id=str(request_context.get("user_id", "anonymous")),
                provider=params.get("provider"),
                model=params.get("model"),
            )

        if command == "flow" and subcommand == "list":
            return list_flows_data()

        if command == "flow" and subcommand == "launch":
            flow_id = params.get("flow_id")
            flow_input = params.get("flow_input")
            return self.launch_flow(flow_id, flow_input, request_context, params)

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
                return {"success": True, "message": f"同族入口已准备: {patent_number}", "data": {"api_endpoint": f"/api/patent/family/{patent_number}"}}

            if subcommand == "compare":
                return {
                    "success": True,
                    "message": "同族对比入口已准备",
                    "data": {"api_endpoint": "/api/patent/family/compare", "patent_numbers": patent_numbers},
                }

        return {"success": False, "error": f"未知命令: {command} {subcommand or ''}".strip(), "suggestions": ["输入 help 查看命令", "或直接用自然语言发起请求"]}

    def launch_flow(
        self,
        flow_id: Optional[str],
        flow_input: Optional[str],
        request_context: Dict[str, Any],
        params: Dict[str, Any],
    ) -> Dict[str, Any]:
        if not flow_id:
            return {"success": False, "error": "缺少 flow_id"}

        if flow_id == "patent_lookup":
            prompt = flow_input or "查询 CN104154208B 专利详情"
            return orchestrator.execute(
                user_input=prompt,
                session_key=str(request_context.get("session_id", "web_cli")),
                user_id=str(request_context.get("user_id", "anonymous")),
                provider=params.get("provider"),
                model=params.get("model"),
            )

        if flow_id == "patent_family_compare":
            patent_number = flow_input or "CN104154208B"
            return {
                "success": True,
                "type": "embedded_flow",
                "message": f"已装载服务流程: {flow_id}",
                "data": {
                    "flow_id": flow_id,
                    "title": "同族专利对比",
                    "description": "可继续围绕同族专利做检索和比较。",
                    "steps": [
                        "获取同族列表",
                        "选择要比较的专利",
                        "抓取权利要求",
                        "发起 AI 对比分析",
                    ],
                    "api_endpoint": f"/api/patent/family/{patent_number}",
                },
            }

        return {
            "success": True,
            "type": "embedded_flow",
            "message": f"已装载服务流程: {flow_id}",
            "data": {
                "flow_id": flow_id,
                "title": flow_id,
                "description": "该流程已登记，可继续接入具体服务实现。",
                "steps": ["识别输入", "调用服务端点", "回填结果", "继续问答"],
            },
        }


registry = CommandRegistry()
executor = SimpleCommandExecutor()


def get_request_context() -> Dict[str, Any]:
    return {"user_id": session.get("user_id", "anonymous"), "session_id": session.get("session_id") or session.get("_id") or "web_cli"}


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
    elif command == "flow" and subcommand == "launch":
        params["flow_id"] = remaining[0] if remaining else ""
        params["flow_input"] = " ".join(remaining[1:]) if len(remaining) > 1 else ""

    if provider:
        params["provider"] = provider
    if model:
        params["model"] = model

    return {"command": command, "subcommand": subcommand, "params": params, "confidence": 1.0}


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

    return {"success": True, "data": {"default_provider": default_provider, "providers": providers}}


@cli_agent_bp.route("/cli/execute", methods=["POST"])
def execute_command():
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
            return create_response(data=result, status_code=200 if result.get("success", False) else 400)

        parsed = parse_legacy_command(user_input, provider=provider, model=model)
        result = executor.execute(parsed, request_context)
        return create_response(
            data={"success": result.get("success", False), "mode": "legacy_cli_command", "parsed": parsed, "result": result},
            status_code=200 if result.get("success", False) else 400,
        )
    except Exception as exc:
        return create_response(error=f"执行失败: {str(exc)}")


@cli_agent_bp.route("/cli/stream", methods=["POST"])
def stream_execute_command():
    is_valid, error_response = validate_api_request()
    if not is_valid:
        error_json = json.dumps({"type": "error", "error": error_response.get_json().get("error", "request error")}, ensure_ascii=False)
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
                session_key=str(request_context["session_id"]),
                user_id=str(request_context["user_id"]),
                provider=provider,
                model=model,
            ):
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'error': str(exc)}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"

    return Response(stream_with_context(generate()), mimetype="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@cli_agent_bp.route("/cli/parse", methods=["POST"])
def parse_command():
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
            parsed = {
                "mode": "orchestrated_cli",
                "intent": orchestrator.detect_intent(user_input, orchestrator.extract_patent_numbers(user_input)),
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
    command = request.args.get("command")
    return create_response(data={"help": registry.get_help_text(command), "commands": registry.list_commands()})


@cli_agent_bp.route("/cli/commands", methods=["GET"])
def list_commands():
    return create_response(data={"commands": registry.list_commands()})


@cli_agent_bp.route("/cli/models", methods=["GET"])
def list_models():
    result = list_models_data()
    return create_response(data=result["data"])


@cli_agent_bp.route("/cli/flows", methods=["GET"])
def list_flows():
    result = list_flows_data()
    return create_response(data=result["data"])


@cli_agent_bp.route("/cli/chat", methods=["POST"])
def chat():
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
        return create_response(data=result, status_code=200 if result.get("success", False) else 400)
    except Exception as exc:
        return create_response(error=f"对话失败: {str(exc)}")
