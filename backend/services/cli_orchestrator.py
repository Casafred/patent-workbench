"""
CLI orchestration service.

Provides a higher-level natural language workflow for the embedded CLI:
1. Detect patent numbers and user intent from natural language
2. Scrape patent data when needed
3. Persist lightweight conversation context in memory
4. Route the final QA request to the selected LLM provider/model
5. Return a terminal-friendly structured payload for rendering
"""

from __future__ import annotations

import json
import re
import threading
import time
from collections import deque
from typing import Any, Deque, Dict, List, Optional, Tuple

from backend.routes.patent import get_scraper_instance
from backend.services.llm_service import get_api_key
from backend.services.llm.provider_factory import get_factory
from backend.services.llm.llm_service import create_service


PATENT_NUMBER_PATTERN = re.compile(
    r"\b(?:CN|US|EP|WO|JP|KR|DE|FR|GB|TW|CA|AU|RU|IN)"
    r"[A-Z0-9./-]{4,24}[A-Z0-9]\b",
    re.IGNORECASE,
)

BUILTIN_COMMANDS = {"help", "status", "clear", "exit", "quit"}
COMMAND_PREFIXES = {"patent", "claims", "classify", "ai", "config"}

MAX_CONTEXT_PATENTS = 5
MAX_CONTEXT_MESSAGES = 12


class CLIContextStore:
    """Thread-safe in-memory store for CLI conversation context."""

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
            history: Deque[Dict[str, str]] = payload["message_history"]
            history.append({"role": role, "content": content})

    def snapshot(self, key: str) -> Dict[str, Any]:
        payload = self.get(key)
        return {
            "patents": dict(payload["patents"]),
            "message_history": list(payload["message_history"]),
            "last_accessed": payload["last_accessed"],
        }


context_store = CLIContextStore()


class CLIOrchestrator:
    """Higher-level NL -> scraper -> context -> model orchestration."""

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

        ai_answer = None
        ai_error = None
        if intent.get("should_answer_with_ai", True):
            try:
                ai_answer = self.ask_llm(
                    user_input=normalized,
                    provider=provider_name,
                    model=model_name,
                    patent_context=patent_context,
                    message_history=context_snapshot["message_history"],
                )
            except Exception as exc:
                ai_error = str(exc)

        context_store.add_message(context_key, "user", normalized)
        if ai_answer:
            context_store.add_message(context_key, "assistant", ai_answer)

        render_payload = self.build_render_payload(
            user_input=normalized,
            intent=intent,
            provider=provider_name,
            model=model_name,
            patent_numbers=patent_numbers,
            scraped_patents=scraped_patents,
            patent_context=patent_context,
            scrape_errors=scrape_errors,
            ai_answer=ai_answer,
            ai_error=ai_error,
        )

        return {
            "success": ai_error is None,
            "mode": "orchestrated_cli",
            "message": render_payload["summary"]["title"],
            "data": render_payload,
            "error": ai_error,
            "suggestions": self.build_suggestions(intent, patent_numbers),
        }

    def is_builtin_or_command_style(self, text: str) -> bool:
        first = (text or "").strip().split(" ", 1)[0].lower()
        return first in BUILTIN_COMMANDS or first in COMMAND_PREFIXES

    def extract_patent_numbers(self, text: str) -> List[str]:
        seen = []
        for match in PATENT_NUMBER_PATTERN.findall(text or ""):
            patent_number = match.upper().replace(" ", "")
            if patent_number not in seen:
                seen.append(patent_number)
        return seen

    def detect_intent(self, text: str, patent_numbers: List[str]) -> Dict[str, Any]:
        lowered = (text or "").lower()
        detail_keywords = ["详情", "详细", "全文", "专利详情", "信息", "查看"]
        qa_keywords = ["问答", "分析", "总结", "解释", "对比", "评估", "风险", "创新点", "回答"]
        follow_up_keywords = ["这个", "该专利", "上述", "上面", "继续", "进一步", "它"]

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
            provider = inferred_provider or provider or self.factory.get_default_provider_name()
            return provider, model

        provider = provider or self.factory.get_default_provider_name()
        provider_config = self.factory.get_provider_config(provider) or {}
        default_model = provider_config.get("default_model") or "glm-4-flash"
        return provider, default_model

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
    ) -> str:
        api_key, error_response = get_api_key(provider)
        if error_response:
            raise ValueError("缺少对应模型服务的 API Key")

        service = create_service(api_key=api_key, provider=provider, model=model)

        patent_context_json = json.dumps(
            [self.compact_patent_context(item) for item in patent_context],
            ensure_ascii=False,
            indent=2,
        )
        history_text = json.dumps(message_history[-6:], ensure_ascii=False, indent=2)
        system_prompt = (
            "你是网站内嵌 CLI 的专利智能助理。"
            "你的任务是基于当前上下文，用清晰、分段、可读性强的中文回答用户。"
            "如果上下文中已有专利抓取结果，优先引用这些结果，不要凭空编造。"
            "输出时尽量包含：结论、关键信息、后续建议。"
            "如果用户是在查询专利详情，先概括标题、摘要、申请/公开日期、申请人/发明人、权利要求概览。"
        )
        user_prompt = (
            f"用户输入:\n{user_input}\n\n"
            f"最近会话摘要:\n{history_text}\n\n"
            f"当前专利上下文:\n{patent_context_json}\n\n"
            "请结合上下文直接回答。如果缺少必要专利数据，要明确指出。"
        )

        response = service.complete(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            provider=provider,
            model=model,
            temperature=0.3,
            enable_search=False,
        )
        return response.content.strip()

    def compact_patent_context(self, patent_data: Dict[str, Any]) -> Dict[str, Any]:
        claims = patent_data.get("claims") or []
        if isinstance(claims, list):
            claims_preview = claims[:3]
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
            "claims_preview": claims_preview,
            "description_preview": description[:1500],
            "classifications": patent_data.get("classifications", [])[:6],
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
            "summary": {
                "title": summary_title,
                "lines": summary_lines,
            },
            "input": user_input,
            "intent": intent.get("name"),
            "routing": {
                "provider": provider,
                "model": model,
            },
            "detected_patents": patent_numbers,
            "scraped_patents": patents_view,
            "scrape_errors": scrape_errors,
            "qa": {
                "answer": ai_answer,
                "error": ai_error,
            },
            "raw": {
                "scraped_patents_count": len(scraped_patents),
                "context_patents_count": len(patent_context),
            },
        }

    def build_patent_view(self, patent_data: Dict[str, Any]) -> Dict[str, Any]:
        claims = patent_data.get("claims") or []
        if isinstance(claims, list):
            claims_count = len(claims)
            claims_preview = claims[:2]
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
            "description_preview": (patent_data.get("description") or "")[:700],
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
