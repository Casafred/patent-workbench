"""
CLI orchestration service for the embedded patent terminal.
"""

from __future__ import annotations

import json
import re
import threading
import time
from collections import deque
from typing import Any, Deque, Dict, Generator, List, Optional, Tuple

from backend.routes.patent import get_scraper_instance
from backend.services.llm.provider_factory import get_factory
from backend.services.llm.llm_service import create_service
from backend.services.llm_service import get_api_key


PATENT_NUMBER_PATTERN = re.compile(
    r"\b(?:CN|US|EP|WO|JP|KR|DE|FR|GB|TW|CA|AU|RU|IN)"
    r"[A-Z0-9./-]{4,24}[A-Z0-9]\b",
    re.IGNORECASE,
)

BUILTIN_COMMANDS = {"help", "status", "clear", "exit", "quit"}
COMMAND_PREFIXES = {"patent", "claims", "classify", "ai", "config", "flow"}

MAX_CONTEXT_PATENTS = 5
MAX_CONTEXT_MESSAGES = 12


class CLIContextStore:
    """Thread-safe in-memory store for CLI sessions."""

    def __init__(self):
        self._lock = threading.Lock()
        self._store: Dict[str, Dict[str, Any]] = {}

    def _default_payload(self) -> Dict[str, Any]:
        return {
            "patents": {},
            "message_history": deque(maxlen=MAX_CONTEXT_MESSAGES),
            "last_accessed": time.time(),
        }

    def _get_or_create_unlocked(self, key: str) -> Dict[str, Any]:
        payload = self._store.get(key)
        if payload is None:
            payload = self._default_payload()
            self._store[key] = payload
        payload["last_accessed"] = time.time()
        return payload

    def get(self, key: str) -> Dict[str, Any]:
        with self._lock:
            return self._get_or_create_unlocked(key)

    def upsert_patent(self, key: str, patent_data: Dict[str, Any]) -> None:
        with self._lock:
            payload = self._get_or_create_unlocked(key)
            patents = payload["patents"]
            patent_number = patent_data.get("patent_number")
            if not patent_number:
                return
            patents[patent_number] = patent_data
            while len(patents) > MAX_CONTEXT_PATENTS:
                first_key = next(iter(patents))
                if first_key == patent_number:
                    break
                patents.pop(first_key, None)

    def add_message(self, key: str, role: str, content: str) -> None:
        with self._lock:
            payload = self._get_or_create_unlocked(key)
            payload["message_history"].append({"role": role, "content": content})

    def snapshot(self, key: str) -> Dict[str, Any]:
        payload = self.get(key)
        return {
            "patents": dict(payload["patents"]),
            "message_history": list(payload["message_history"]),
            "last_accessed": payload["last_accessed"],
        }


context_store = CLIContextStore()


class CLIOrchestrator:
    """Natural language -> scraper -> context -> model orchestration."""

    def __init__(self):
        self.factory = get_factory()

    def execute(
        self,
        user_input: str,
        session_key: str,
        user_id: str,
        provider: Optional[str] = None,
        model: Optional[str] = None,
    ) -> Dict[str, Any]:
        started_at = time.time()
        normalized = (user_input or "").strip()
        if not normalized:
            return {"success": False, "error": "请输入命令或自然语言请求"}

        patent_numbers = self.extract_patent_numbers(normalized)
        intent = self.detect_intent(normalized, patent_numbers)
        provider_name, model_name = self.resolve_model(provider=provider, model=model)

        context_key = f"{user_id}:{session_key}"
        scraped_patents: List[Dict[str, Any]] = []
        scrape_errors: List[Dict[str, str]] = []

        if patent_numbers:
            scraped_patents, scrape_errors = self.fetch_patent_context(
                patent_numbers=patent_numbers,
                user_id=user_id,
                context_key=context_key,
            )

        context_snapshot = context_store.snapshot(context_key)
        patent_context = list(context_snapshot["patents"].values())

        llm_meta = self.default_llm_meta(provider_name, model_name)
        ai_answer = None
        ai_error = None

        if intent.get("should_answer_with_ai", True):
            try:
                llm_result = self.ask_llm(
                    user_input=normalized,
                    provider=provider_name,
                    model=model_name,
                    patent_context=patent_context,
                    message_history=context_snapshot["message_history"],
                )
                ai_answer = llm_result.get("answer")
                llm_meta.update(llm_result.get("meta", {}))
            except Exception as exc:
                ai_error = self.normalize_error_message(exc)

        context_store.add_message(context_key, "user", normalized)
        if ai_answer:
            context_store.add_message(context_key, "assistant", ai_answer)

        render_payload = self.build_render_payload(
            user_input=normalized,
            intent=intent,
            provider=llm_meta.get("provider", provider_name),
            model=llm_meta.get("model", model_name),
            patent_numbers=patent_numbers,
            scraped_patents=scraped_patents,
            patent_context=patent_context,
            scrape_errors=scrape_errors,
            ai_answer=ai_answer,
            ai_error=ai_error,
            stats=self.build_stats(started_at, patent_context, scrape_errors, llm_meta),
        )

        return {
            "success": ai_error is None,
            "mode": "orchestrated_cli",
            "message": render_payload["summary"]["title"],
            "data": render_payload,
            "error": ai_error,
            "suggestions": self.build_suggestions(intent, patent_numbers),
        }

    def stream_execute(
        self,
        user_input: str,
        session_key: str,
        user_id: str,
        provider: Optional[str] = None,
        model: Optional[str] = None,
    ) -> Generator[Dict[str, Any], None, None]:
        started_at = time.time()
        normalized = (user_input or "").strip()
        if not normalized:
            yield {"type": "error", "error": "请输入命令或自然语言请求"}
            return

        yield {"type": "trace", "stage": "intent", "message": "开始解析用户意图"}
        patent_numbers = self.extract_patent_numbers(normalized)
        intent = self.detect_intent(normalized, patent_numbers)
        provider_name, model_name = self.resolve_model(provider=provider, model=model)
        llm_meta = self.default_llm_meta(provider_name, model_name)

        yield {
            "type": "trace",
            "stage": "routing",
            "message": f"已路由到模型 {provider_name}/{model_name}",
            "routing": {"provider": provider_name, "model": model_name},
        }

        context_key = f"{user_id}:{session_key}"
        scraped_patents: List[Dict[str, Any]] = []
        scrape_errors: List[Dict[str, str]] = []

        if patent_numbers:
            yield {
                "type": "trace",
                "stage": "scrape",
                "message": f"识别到专利号 {', '.join(patent_numbers)}，开始抓取",
            }
            scraped_patents, scrape_errors = self.fetch_patent_context(
                patent_numbers=patent_numbers,
                user_id=user_id,
                context_key=context_key,
            )
            yield {
                "type": "context",
                "stage": "scrape_complete",
                "message": f"已抓取 {len(scraped_patents)} 篇专利，失败 {len(scrape_errors)} 篇",
                "scraped_patents": [self.build_patent_view(item) for item in scraped_patents],
                "scrape_errors": scrape_errors,
            }
        else:
            yield {"type": "trace", "stage": "scrape_skip", "message": "未识别到新专利号，直接使用现有上下文"}

        context_snapshot = context_store.snapshot(context_key)
        patent_context = list(context_snapshot["patents"].values())
        yield {
            "type": "trace",
            "stage": "context",
            "message": f"当前会话上下文中共有 {len(patent_context)} 篇专利",
        }

        answer_parts: List[str] = []
        ai_error = None
        context_store.add_message(context_key, "user", normalized)

        if intent.get("should_answer_with_ai", True):
            try:
                yield {"type": "trace", "stage": "llm", "message": "开始调用模型生成回答"}
                for event in self.stream_llm_answer(
                    user_input=normalized,
                    provider=provider_name,
                    model=model_name,
                    patent_context=patent_context,
                    message_history=context_snapshot["message_history"],
                ):
                    if event.get("type") == "trace" and event.get("stage") == "fallback":
                        llm_meta["fallback_used"] = True
                        llm_meta["fallback_reason"] = event.get("message")
                        llm_meta["provider"] = event.get("provider", llm_meta["provider"])
                        llm_meta["model"] = event.get("model", llm_meta["model"])
                    if event.get("type") == "content":
                        delta = event.get("delta", "")
                        if delta:
                            answer_parts.append(delta)
                    if event.get("type") == "trace" and event.get("stage") == "llm_complete":
                        llm_meta["usage"] = event.get("usage")
                        llm_meta["provider"] = event.get("provider", llm_meta["provider"])
                        llm_meta["model"] = event.get("model", llm_meta["model"])
                    yield event
            except Exception as exc:
                ai_error = self.normalize_error_message(exc)
                yield {"type": "error", "stage": "llm", "error": ai_error}
        else:
            yield {"type": "trace", "stage": "llm_skip", "message": "当前意图无需模型回答"}

        ai_answer = "".join(answer_parts).strip() or None
        if ai_answer:
            context_store.add_message(context_key, "assistant", ai_answer)

        render_payload = self.build_render_payload(
            user_input=normalized,
            intent=intent,
            provider=llm_meta.get("provider", provider_name),
            model=llm_meta.get("model", model_name),
            patent_numbers=patent_numbers,
            scraped_patents=scraped_patents,
            patent_context=list(context_store.snapshot(context_key)["patents"].values()),
            scrape_errors=scrape_errors,
            ai_answer=ai_answer,
            ai_error=ai_error,
            stats=self.build_stats(started_at, patent_context, scrape_errors, llm_meta),
        )

        yield {"type": "final", "data": render_payload}
        yield {"type": "done"}

    def default_llm_meta(self, provider: str, model: str) -> Dict[str, Any]:
        return {
            "provider": provider,
            "model": model,
            "usage": None,
            "fallback_used": False,
            "fallback_reason": None,
        }

    def is_builtin_or_command_style(self, text: str) -> bool:
        first = (text or "").strip().split(" ", 1)[0].lower()
        return first in BUILTIN_COMMANDS or first in COMMAND_PREFIXES

    def extract_patent_numbers(self, text: str) -> List[str]:
        seen: List[str] = []
        for match in PATENT_NUMBER_PATTERN.findall(text or ""):
            patent_number = match.upper().replace(" ", "")
            if patent_number not in seen:
                seen.append(patent_number)
        return seen

    def detect_intent(self, text: str, patent_numbers: List[str]) -> Dict[str, Any]:
        detail_keywords = ["详情", "详细", "全文", "专利详情", "信息", "查看"]
        qa_keywords = ["问答", "分析", "总结", "解释", "对比", "评估", "风险", "创新点", "回答"]
        follow_up_keywords = ["这个", "该专利", "上述", "上面", "继续", "进一步", "它"]
        lowered = (text or "").lower()

        if patent_numbers and any(keyword in text for keyword in detail_keywords):
            return {"name": "patent_detail", "should_answer_with_ai": True}
        if patent_numbers and any(keyword in text for keyword in qa_keywords):
            return {"name": "patent_qa", "should_answer_with_ai": True}
        if patent_numbers:
            return {"name": "patent_lookup", "should_answer_with_ai": True}
        if any(keyword in text for keyword in follow_up_keywords):
            return {"name": "context_follow_up", "should_answer_with_ai": True}
        if lowered.startswith("ai models"):
            return {"name": "model_listing", "should_answer_with_ai": False}
        return {"name": "general_chat", "should_answer_with_ai": True}

    def resolve_model(self, provider: Optional[str], model: Optional[str]) -> Tuple[str, str]:
        if model:
            inferred_provider = self.factory.get_provider_for_model(model)
            resolved_provider = inferred_provider or provider or self.factory.get_default_provider_name()
            return resolved_provider, model

        resolved_provider = provider or self.factory.get_default_provider_name()
        provider_config = self.factory.get_provider_config(resolved_provider) or {}
        resolved_model = provider_config.get("default_model") or "glm-4-flash"
        return resolved_provider, resolved_model

    def get_provider_candidates(self, provider: str, model: str) -> List[Dict[str, str]]:
        candidates = [{"provider": provider, "model": model}]
        default_provider = self.factory.get_default_provider_name()
        default_config = self.factory.get_provider_config(default_provider) or {}
        default_model = default_config.get("default_model") or "glm-4-flash"
        if default_provider != provider:
            candidates.append({"provider": default_provider, "model": default_model})
        return candidates

    def fetch_patent_context(
        self,
        patent_numbers: List[str],
        user_id: str,
        context_key: str,
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, str]]]:
        scraper = get_scraper_instance()
        results = scraper.scrape_patents_batch(
            patent_numbers,
            crawl_specification=True,
            selected_fields=None,
            user_id=user_id,
        )

        scraped_patents: List[Dict[str, Any]] = []
        scrape_errors: List[Dict[str, str]] = []
        for result in results:
            if result.success and result.data:
                data = result.data.to_dict()
                scraped_patents.append(data)
                context_store.upsert_patent(context_key, data)
            else:
                scrape_errors.append(
                    {
                        "patent_number": result.patent_number,
                        "error": result.error or "抓取失败",
                    }
                )
        return scraped_patents, scrape_errors

    def ask_llm(
        self,
        user_input: str,
        provider: str,
        model: str,
        patent_context: List[Dict[str, Any]],
        message_history: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        messages = self.build_llm_messages(
            user_input=user_input,
            patent_context=patent_context,
            message_history=message_history,
        )
        last_error: Optional[Exception] = None

        for index, candidate in enumerate(self.get_provider_candidates(provider, model)):
            candidate_provider = candidate["provider"]
            candidate_model = candidate["model"]
            api_key, error_response = get_api_key(candidate_provider)
            if error_response:
                last_error = ValueError(f"{candidate_provider} API key unavailable")
                continue

            try:
                service = create_service(api_key=api_key, provider=candidate_provider, model=candidate_model)
                response = service.complete(
                    messages=messages,
                    provider=candidate_provider,
                    model=candidate_model,
                    temperature=0.3,
                    enable_search=False,
                )
                return {
                    "answer": response.content.strip(),
                    "meta": {
                        "provider": candidate_provider,
                        "model": candidate_model,
                        "usage": response.usage,
                        "fallback_used": index > 0,
                        "fallback_reason": self.normalize_error_message(last_error) if index > 0 and last_error else None,
                    },
                }
            except Exception as exc:
                last_error = exc

        raise ValueError(self.normalize_error_message(last_error) if last_error else "模型调用失败")

    def stream_llm_answer(
        self,
        user_input: str,
        provider: str,
        model: str,
        patent_context: List[Dict[str, Any]],
        message_history: List[Dict[str, str]],
    ) -> Generator[Dict[str, Any], None, None]:
        messages = self.build_llm_messages(
            user_input=user_input,
            patent_context=patent_context,
            message_history=message_history,
        )
        last_error: Optional[Exception] = None

        for index, candidate in enumerate(self.get_provider_candidates(provider, model)):
            candidate_provider = candidate["provider"]
            candidate_model = candidate["model"]
            api_key, error_response = get_api_key(candidate_provider)
            if error_response:
                last_error = ValueError(f"{candidate_provider} API key unavailable")
                continue

            if index > 0:
                yield {
                    "type": "trace",
                    "stage": "fallback",
                    "message": f"主模型不可用，已切换到 {candidate_provider}/{candidate_model}",
                    "provider": candidate_provider,
                    "model": candidate_model,
                }

            try:
                service = create_service(api_key=api_key, provider=candidate_provider, model=candidate_model)
                for event in service.stream(
                    messages=messages,
                    provider=candidate_provider,
                    model=candidate_model,
                    temperature=0.3,
                    enable_search=False,
                ):
                    event_type = getattr(getattr(event, "type", None), "value", None)
                    if event_type == "reasoning":
                        yield {"type": "trace", "stage": "reasoning", "message": event.delta}
                    elif event_type == "content":
                        yield {"type": "content", "delta": event.delta}
                    elif event_type == "done":
                        yield {
                            "type": "trace",
                            "stage": "llm_complete",
                            "message": "模型回答完成",
                            "usage": event.usage,
                            "provider": candidate_provider,
                            "model": candidate_model,
                        }
                    elif event_type == "error":
                        yield {"type": "error", "stage": "llm", "error": event.error or "模型流式调用失败"}
                return
            except Exception as exc:
                last_error = exc

        raise ValueError(self.normalize_error_message(last_error) if last_error else "模型流式调用失败")

    def build_llm_messages(
        self,
        user_input: str,
        patent_context: List[Dict[str, Any]],
        message_history: List[Dict[str, str]],
    ) -> List[Dict[str, str]]:
        patent_context_json = json.dumps(
            [self.compact_patent_context(item) for item in patent_context],
            ensure_ascii=False,
            indent=2,
        )
        history_text = json.dumps(message_history[-6:], ensure_ascii=False, indent=2)
        system_prompt = (
            "你是网站内嵌 CLI 的专利智能助理。"
            "请基于上下文，用清晰、分段、可读性强的中文回答。"
            "如果已有专利抓取结果，优先基于抓取结果回答，不要编造。"
            "如果用户在查询专利详情，优先概括标题、摘要、申请日、公开日、申请人、发明人和权利要求概览。"
        )
        user_prompt = (
            f"用户输入:\n{user_input}\n\n"
            f"最近会话摘要:\n{history_text}\n\n"
            f"当前专利上下文:\n{patent_context_json}\n\n"
            "请直接回答。如果缺少必要专利数据，请明确说明。"
        )
        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

    def normalize_error_message(self, exc: Optional[Exception]) -> str:
        if exc is None:
            return "未知错误"
        text = str(exc)
        lowered = text.lower()
        if "invalid_api_key" in lowered or "incorrect api key" in lowered:
            return "所选模型服务的 API Key 无效，请检查阿里云 Key，或切换到其他 Provider。"
        if "api key unavailable" in lowered:
            return "未找到所选模型服务的 API Key，请先在页面配置。"
        return text

    def build_stats(
        self,
        started_at: float,
        patent_context: List[Dict[str, Any]],
        scrape_errors: List[Dict[str, str]],
        llm_meta: Dict[str, Any],
    ) -> Dict[str, Any]:
        return {
            "duration_ms": int((time.time() - started_at) * 1000),
            "context_patents": len(patent_context),
            "scrape_error_count": len(scrape_errors),
            "fallback_used": bool(llm_meta.get("fallback_used")),
            "fallback_reason": llm_meta.get("fallback_reason"),
            "usage": llm_meta.get("usage") or {},
        }

    def compact_patent_context(self, patent_data: Dict[str, Any]) -> Dict[str, Any]:
        claims = patent_data.get("claims") or []
        if isinstance(claims, list):
            claims_preview = claims[:5]
        else:
            claims_preview = [str(claims)[:500]]

        description = patent_data.get("description") or ""
        return {
            "patent_number": patent_data.get("patent_number", ""),
            "title": patent_data.get("title", ""),
            "abstract": patent_data.get("abstract", "")[:1200],
            "inventors": patent_data.get("inventors", [])[:8],
            "assignees": patent_data.get("assignees", [])[:8],
            "application_date": patent_data.get("application_date", ""),
            "publication_date": patent_data.get("publication_date", ""),
            "claims": claims,
            "claims_preview": claims_preview,
            "description": description,
            "description_preview": description[:1500],
            "classifications": patent_data.get("classifications", [])[:6],
            "patent_citations": patent_data.get("patent_citations", [])[:10],
            "cited_by": patent_data.get("cited_by", [])[:10],
            "events_timeline": patent_data.get("events_timeline", [])[:10],
            "legal_events": patent_data.get("legal_events", [])[:10],
            "drawings": patent_data.get("drawings", [])[:5],
            "pdf_link": patent_data.get("pdf_link", ""),
            "url": patent_data.get("url", ""),
        }

    def build_render_payload(
        self,
        user_input: str,
        intent: Dict[str, Any],
        provider: str,
        model: str,
        patent_numbers: List[str],
        scraped_patents: List[Dict[str, Any]],
        patent_context: List[Dict[str, Any]],
        scrape_errors: List[Dict[str, str]],
        ai_answer: Optional[str],
        ai_error: Optional[str],
        stats: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        summary_title = "CLI 智能链路执行完成" if not ai_error else "CLI 智能链路部分失败"
        summary_lines = [
            f"意图识别: {intent.get('name', 'unknown')}",
            f"模型路由: {provider} / {model}",
            f"识别到专利号: {', '.join(patent_numbers) if patent_numbers else '无'}",
            f"成功注入上下文的专利数: {len(patent_context)}",
        ]
        if scrape_errors:
            summary_lines.append(f"抓取失败数: {len(scrape_errors)}")
        if ai_error:
            summary_lines.append(f"模型调用异常: {ai_error}")

        patents_view = [self.build_patent_view(item) for item in patent_context]
        return {
            "type": "cli_orchestration",
            "summary": {"title": summary_title, "lines": summary_lines},
            "input": user_input,
            "intent": intent.get("name"),
            "routing": {"provider": provider, "model": model},
            "detected_patents": patent_numbers,
            "scraped_patents": patents_view,
            "scrape_errors": scrape_errors,
            "qa": {"answer": ai_answer, "error": ai_error},
            "stats": stats or {},
            "raw": {
                "scraped_patents_count": len(scraped_patents),
                "context_patents_count": len(patent_context),
            },
        }

    def build_patent_view(self, patent_data: Dict[str, Any]) -> Dict[str, Any]:
        claims = patent_data.get("claims") or []
        if isinstance(claims, list):
            claims_count = len(claims)
            claims_preview = claims[:5]
        else:
            claims_count = 1 if claims else 0
            claims_preview = [str(claims)[:400]] if claims else []

        return {
            "patent_number": patent_data.get("patent_number", ""),
            "title": patent_data.get("title", "") or "未抓取到标题",
            "abstract": (patent_data.get("abstract") or "")[:600],
            "inventors": patent_data.get("inventors", [])[:5],
            "assignees": patent_data.get("assignees", [])[:5],
            "application_date": patent_data.get("application_date", ""),
            "publication_date": patent_data.get("publication_date", ""),
            "claims_count": claims_count,
            "claims_preview": claims_preview,
            "claims": claims,
            "description_preview": (patent_data.get("description") or "")[:700],
            "description": patent_data.get("description", ""),
            "classifications": patent_data.get("classifications", [])[:6],
            "patent_citations": patent_data.get("patent_citations", [])[:10],
            "cited_by": patent_data.get("cited_by", [])[:10],
            "events_timeline": patent_data.get("events_timeline", [])[:10],
            "legal_events": patent_data.get("legal_events", [])[:10],
            "drawings": patent_data.get("drawings", [])[:5],
            "pdf_link": patent_data.get("pdf_link", ""),
            "url": patent_data.get("url") or f"https://patents.google.com/patent/{patent_data.get('patent_number', '')}",
        }

    def build_suggestions(self, intent: Dict[str, Any], patent_numbers: List[str]) -> List[str]:
        suggestions: List[str] = []
        if patent_numbers:
            joined = " ".join(patent_numbers)
            suggestions.append(f"继续追问: 分析 {joined} 的创新点和潜在侵权风险")
            suggestions.append(f"继续追问: 对比 {joined} 的权利要求保护范围")
        else:
            suggestions.append("试试输入: 查询 CN104154208B 专利详情")
            suggestions.append("试试输入: 基于刚才专利结果总结技术方案")
        if intent.get("name") == "general_chat":
            suggestions.append("也可以直接指定模型，例如: 用 qwen-plus 分析上面专利")
        return suggestions[:3]
