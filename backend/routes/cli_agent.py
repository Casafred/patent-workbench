"""
Embedded CLI routes.
"""

from __future__ import annotations

import json
import os
import re
import tempfile
import base64
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from flask import Blueprint, Response, request, session, stream_with_context

from backend.middleware import validate_api_request
from backend.routes.ipc import (
    build_hierarchy_from_items,
    fetch_from_incopat_keyword_search,
    fetch_from_incopat_query,
    normalize_symbol,
)
from backend.routes.pdf_ocr import _parse_with_glm_ocr, _parse_with_paddle_ocr_vl
from backend.routes.patent import get_current_user_id, get_scraper_instance
from backend.services import get_aliyun_client, get_zhipu_client
from backend.services.cli_orchestrator import CLIOrchestrator
from backend.services.llm.provider_factory import get_factory
from backend.services.llm_service import get_default_model, get_llm_client, is_aliyun_model
from backend.utils import create_response
from backend.utils.column_detector import ColumnDetector
from patent_claims_processor.services import ProcessingService
from patent_claims_processor.processors import ExcelProcessor
from patent_claims_processor.processors import ClaimsClassifier, ClaimsParser, LanguageDetector

cli_agent_bp = Blueprint("cli_agent", __name__)

orchestrator = CLIOrchestrator()
PATENT_NUMBER_REGEX = re.compile(
    r"\b(?:CN|US|EP|WO|JP|KR|DE|FR|GB|TW|CA|AU|RU|IN)[A-Z0-9./-]{4,24}[A-Z0-9]\b",
    re.IGNORECASE,
)
IPC_CODE_REGEX = re.compile(r"^[A-H][0-9]{2}[A-Z][0-9]+(?:/[0-9]+)?$", re.IGNORECASE)
IPC_PREFIX_REGEX = re.compile(r"\b[A-H][0-9]{2}[A-Z](?:[0-9]+(?:/[0-9]+)?)?\b", re.IGNORECASE)


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
            "description": "输入一个或多个专利号，抓取权利要求并完成同族对比",
            "entry_examples": [
                "flow launch patent_family_compare CN104154208B",
                "flow launch patent_family_compare CN104154208B US12390907B2",
            ],
            "status": "ready",
        },
        {
            "id": "claims_pipeline",
            "name": "权利要求文本分析",
            "description": "直接粘贴权利要求文本，识别独从权、引用关系和语言信息",
            "entry_examples": [
                "flow launch claims_pipeline 权利要求1. 一种装置...",
                "flow launch claims_pipeline Claim 1. A device...",
            ],
            "status": "ready",
        },
        {
            "id": "claims_excel_pipeline",
            "name": "Claims Excel 处理",
            "description": "上传 Excel 后自动识别 sheet 和 claims 列，并直接启动处理",
            "entry_examples": ["上传 claims.xlsx 后输入：处理这个Excel", "flow launch claims_excel_pipeline"],
            "status": "ready",
        },
        {
            "id": "pdf_ocr_pipeline",
            "name": "PDF OCR 阅读流程",
            "description": "后端解析能力已在，CLI 还需要文件输入控件后才能完整执行",
            "entry_examples": ["flow launch pdf_ocr_pipeline <base64_or_file>"],
            "status": "input_required",
        },
        {
            "id": "ipc_lookup",
            "name": "IPC 检索流程",
            "description": "支持 IPC 号详情查询和关键词检索",
            "entry_examples": ["flow launch ipc_lookup H04L", "flow launch ipc_lookup 人工智能"],
            "status": "ready",
        },
    ]
    return {"success": True, "data": {"flows": flows}}


def get_request_context() -> Dict[str, Any]:
    return {
        "user_id": session.get("user_id", "anonymous"),
        "session_id": session.get("session_id") or session.get("_id") or "web_cli",
    }


def extract_patent_numbers(text: str) -> List[str]:
    seen: List[str] = []
    for match in PATENT_NUMBER_REGEX.findall(text or ""):
        patent_number = match.upper().replace(" ", "")
        if patent_number not in seen:
            seen.append(patent_number)
    return seen


def response_error_message(error_response: Any, default: str) -> str:
    if error_response is None:
        return default
    try:
        payload = error_response.get_json() or {}
        return payload.get("error") or payload.get("message") or default
    except Exception:
        return default


def parse_possible_json(text: str) -> Dict[str, Any]:
    if not text:
        return {}
    match = re.search(r"\{[\s\S]*\}", text)
    candidate = match.group(0) if match else text
    try:
        return json.loads(candidate)
    except Exception:
        return {"raw_response": text}


def data_url_to_bytes(data: str) -> bytes:
    if data.startswith("data:"):
        _, encoded = data.split(",", 1)
    else:
        encoded = data
    return base64.b64decode(encoded)


def should_auto_run_pdf_ocr(user_input: str, attachment: Optional[Dict[str, Any]]) -> bool:
    if not attachment or not attachment.get("data"):
        return False
    normalized = (user_input or "").strip().lower()
    if not normalized:
        return True
    keywords = ["pdf", "ocr", "文档", "文件", "解析", "读取", "识别", "帮我看", "总结这个文件", "分析这个文件"]
    return any(keyword in normalized for keyword in keywords)


def should_auto_run_claims_excel(user_input: str, attachment: Optional[Dict[str, Any]]) -> bool:
    if not attachment:
        return False
    name = (attachment.get("name") or "").lower()
    mime_type = (attachment.get("mime_type") or "").lower()
    is_excel = name.endswith((".xlsx", ".xls")) or "spreadsheet" in mime_type or "excel" in mime_type
    if not is_excel:
        return False
    normalized = (user_input or "").strip().lower()
    if not normalized:
        return True
    keywords = ["excel", "表格", "claims", "权利要求", "处理", "解析这个表", "分析这个excel"]
    return any(keyword in normalized for keyword in keywords)


def detect_auto_flow_command(
    user_input: str,
    attachment: Optional[Dict[str, Any]],
    provider: Optional[str],
    model: Optional[str],
    ocr_engine: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    text = (user_input or "").strip()
    lowered = text.lower()

    if should_auto_run_claims_excel(text, attachment):
        return {
            "command": "flow",
            "subcommand": "launch",
            "params": {
                "flow_id": "claims_excel_pipeline",
                "flow_input": text,
                "provider": provider,
                "model": model,
                "attachment": attachment,
                "ocr_engine": ocr_engine,
            },
        }

    if should_auto_run_pdf_ocr(text, attachment):
        return {
            "command": "flow",
            "subcommand": "launch",
            "params": {
                "flow_id": "pdf_ocr_pipeline",
                "flow_input": text,
                "provider": provider,
                "model": model,
                "attachment": attachment,
            },
        }

    ipc_match = IPC_PREFIX_REGEX.search(text)
    ipc_keywords = ["ipc", "分类号", "分类", "分类编码", "检索号", "分类检索"]
    if ipc_match and any(keyword in text for keyword in ipc_keywords):
        return {
            "command": "flow",
            "subcommand": "launch",
            "params": {
                "flow_id": "ipc_lookup",
                "flow_input": ipc_match.group(0).upper(),
                "provider": provider,
                "model": model,
            },
        }

    if any(keyword in lowered for keyword in ["ipc", "分类号"]) and text:
        query = ipc_match.group(0).upper() if ipc_match else text.replace("查询一下", "").replace("查询", "").replace("一下", "").strip()
        return {
            "command": "flow",
            "subcommand": "launch",
            "params": {
                "flow_id": "ipc_lookup",
                "flow_input": query,
                "provider": provider,
                "model": model,
            },
        }

    return None


def resolve_model_choice(model: Optional[str]) -> Tuple[str, str]:
    if model:
        provider = "aliyun" if is_aliyun_model(model) else "zhipu"
        return provider, model
    provider = "zhipu"
    return provider, get_default_model(provider)


def fetch_family_patent_numbers(base_patent_number: str) -> Tuple[List[str], Optional[str]]:
    scraper = get_scraper_instance()
    user_id = get_current_user_id()
    result = scraper.scrape_patent(
        base_patent_number,
        crawl_specification=True,
        selected_fields=["family_applications", "country_status"],
        user_id=user_id,
    )

    if not result or not result.success or not result.data:
        return [], f"未找到基础专利: {base_patent_number}"

    patent_numbers: List[str] = []

    def add_candidate(value: Optional[str]) -> None:
        if not value:
            return
        normalized = str(value).strip().upper()
        if normalized and normalized not in patent_numbers:
            patent_numbers.append(normalized)

    add_candidate(base_patent_number)

    for item in result.data.family_applications or []:
        add_candidate(item.get("publication_number"))
        if len(patent_numbers) >= 4:
            break

    if len(patent_numbers) < 2:
        for item in result.data.country_status or []:
            add_candidate(item.get("publication_number"))
            if len(patent_numbers) >= 4:
                break

    if len(patent_numbers) < 2:
        return [], f"未找到可用于同族对比的成员: {base_patent_number}"

    return patent_numbers[:4], None


def fetch_patent_claims(patent_numbers: List[str]) -> Tuple[Dict[str, Dict[str, Any]], List[str]]:
    scraper = get_scraper_instance()
    user_id = get_current_user_id()
    claims_map: Dict[str, Dict[str, Any]] = {}
    errors: List[str] = []

    for patent_number in patent_numbers:
        try:
            result = scraper.scrape_patent(
                patent_number,
                crawl_specification=True,
                selected_fields=["claims"],
                user_id=user_id,
            )
            if not result or not result.success or not result.data or not result.data.claims:
                errors.append(f"{patent_number}: 未抓取到权利要求")
                continue

            claims = result.data.claims if isinstance(result.data.claims, list) else [str(result.data.claims)]
            claims_map[patent_number] = {
                "patent_number": patent_number,
                "title": result.data.title or "",
                "claims": claims[:3],
            }
        except Exception as exc:
            errors.append(f"{patent_number}: {exc}")

    return claims_map, errors


def run_patent_family_compare_flow(flow_input: str, params: Dict[str, Any]) -> Dict[str, Any]:
    requested_numbers = extract_patent_numbers(flow_input)
    if len(requested_numbers) >= 2:
        patent_numbers = requested_numbers[:4]
    elif len(requested_numbers) == 1:
        patent_numbers, error = fetch_family_patent_numbers(requested_numbers[0])
        if error:
            return {"success": False, "error": error}
    else:
        return {"success": False, "error": "请至少提供 1 个专利号"}

    claims_map, claim_errors = fetch_patent_claims(patent_numbers)
    if len(claims_map) < 2:
        return {"success": False, "error": "成功抓取到的权利要求不足 2 份，无法完成对比", "details": claim_errors}

    provider, model = resolve_model_choice(params.get("model"))
    client, error_response, _ = get_llm_client(provider)
    if error_response:
        return {"success": False, "error": response_error_message(error_response, "模型客户端初始化失败")}

    comparison_prompt = f"""
请比较以下专利权利要求，输出 JSON。

输入数据:
{json.dumps(list(claims_map.values()), ensure_ascii=False, indent=2)}

输出格式:
{{
  "overall_summary": "整体比较结论",
  "pairwise": [
    {{
      "patents": ["专利A", "专利B"],
      "similarity_score": 0.0,
      "common_points": ["共同点1", "共同点2"],
      "differences": ["差异1", "差异2"],
      "risk_hint": "保护范围或侵权判断提示"
    }}
  ]
}}

要求:
1. similarity_score 为 0 到 1 的小数
2. 所有分析文本使用中文
3. 只输出 JSON，不要 markdown
""".strip()

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "你是专业的专利同族权利要求对比分析助手，只返回 JSON。"},
            {"role": "user", "content": comparison_prompt},
        ],
        stream=False,
        temperature=0.3,
    )
    parsed = parse_possible_json(response.choices[0].message.content)
    pairwise = parsed.get("pairwise") or []
    outputs = [
        {"title": "对比专利", "text": "\n".join(claims_map.keys())},
        {"title": "整体结论", "text": parsed.get("overall_summary", "模型未返回整体结论")},
    ]
    if pairwise:
        first = pairwise[0]
        outputs.append(
            {
                "title": "首组对比",
                "text": "\n".join(
                    [
                        f"专利对: {', '.join(first.get('patents') or [])}",
                        f"相似度: {first.get('similarity_score', '-')}",
                        f"共同点: {'; '.join(first.get('common_points') or []) or '-'}",
                        f"差异点: {'; '.join(first.get('differences') or []) or '-'}",
                        f"提示: {first.get('risk_hint') or '-'}",
                    ]
                ),
            }
        )
    if claim_errors:
        outputs.append({"title": "抓取异常", "text": "\n".join(claim_errors)})

    return {
        "success": True,
        "type": "embedded_flow",
        "message": "同族专利对比完成",
        "data": {
            "flow_id": "patent_family_compare",
            "title": "同族专利对比",
            "description": "已抓取权利要求并完成首轮 AI 对比。",
            "steps": ["解析输入", "补齐同族成员", "抓取权利要求", "生成 AI 对比结论"],
            "outputs": outputs,
            "result": parsed,
            "patent_claims": claims_map,
        },
    }


def run_claims_text_flow(flow_input: str) -> Dict[str, Any]:
    text = (flow_input or "").strip()
    if not text:
        return {"success": False, "error": "请在 flow 后直接粘贴权利要求文本"}

    parser = ClaimsParser()
    classifier = ClaimsClassifier()
    language_detector = LanguageDetector()

    cleaned = text.replace("\r\n", "\n").replace("\r", "\n").strip()
    claims_dict = parser.split_claims_by_numbers(cleaned)
    if not claims_dict:
        return {"success": False, "error": "未识别到有效的权利要求序号结构"}

    processed_claims: List[Dict[str, Any]] = []
    for claim_number, claim_text in claims_dict.items():
        normalized_text = parser.normalize_claim_text(claim_text)
        claim_language = language_detector.detect_language(normalized_text)
        claim_type = classifier.classify_claim_type(normalized_text, claim_language)
        referenced_claims: List[int] = []
        if claim_type == "dependent":
            try:
                referenced_claims = classifier.extract_referenced_claims(normalized_text, claim_language)
            except Exception:
                referenced_claims = []
        processed_claims.append(
            {
                "claim_number": claim_number,
                "claim_type": claim_type,
                "language": claim_language,
                "referenced_claims": referenced_claims,
                "claim_text": normalized_text,
            }
        )

    total_claims = len(processed_claims)
    independent_claims = sum(1 for item in processed_claims if item["claim_type"] == "independent")
    dependent_claims = total_claims - independent_claims
    preview_lines = []
    for item in processed_claims[:8]:
        refs = ",".join(str(value) for value in item["referenced_claims"]) if item["referenced_claims"] else "-"
        preview_lines.append(
            f"权利要求{item['claim_number']} | {item['claim_type']} | lang={item['language']} | refs={refs}"
        )

    return {
        "success": True,
        "type": "embedded_flow",
        "message": "权利要求分析完成",
        "data": {
            "flow_id": "claims_pipeline",
            "title": "权利要求文本分析",
            "description": "已完成独从权识别和引用关系提取。",
            "steps": ["清洗文本", "识别权利要求编号", "判断独从权", "提取引用关系"],
            "outputs": [
                {
                    "title": "统计摘要",
                    "text": "\n".join(
                        [
                            f"总权利要求数: {total_claims}",
                            f"独立权利要求: {independent_claims}",
                            f"从属权利要求: {dependent_claims}",
                        ]
                    ),
                },
                {"title": "解析预览", "text": "\n".join(preview_lines) or "无"},
            ],
            "claims": processed_claims,
        },
    }


def run_ipc_lookup_flow(flow_input: str) -> Dict[str, Any]:
    query = (flow_input or "").strip()
    if not query:
        return {"success": False, "error": "请提供 IPC 分类号或关键词"}

    outputs: List[Dict[str, str]] = []

    if IPC_CODE_REGEX.match(query.replace(" ", "").upper()):
        symbol = normalize_symbol(query)
        items = fetch_from_incopat_query(symbol)
        hierarchy = build_hierarchy_from_items(symbol, items)
        detail = None
        if items:
            for item in items:
                code = normalize_symbol(item.get("code", ""))
                if code == symbol:
                    detail = item
                    break

        title = ""
        if detail:
            title = detail.get("nameNew") or detail.get("name") or ""

        outputs.append({"title": "IPC 编码", "text": symbol})
        outputs.append({"title": "分类标题", "text": title or "未找到标题"})
        outputs.append(
            {
                "title": "层级路径",
                "text": "\n".join(f"{node.get('symbol', '')} {node.get('titleCn') or node.get('title') or ''}" for node in hierarchy) or "未找到层级",
            }
        )

        return {
            "success": True,
            "type": "embedded_flow",
            "message": "IPC 分类详情查询完成",
            "data": {
                "flow_id": "ipc_lookup",
                "title": "IPC 检索流程",
                "description": "已完成 IPC 分类详情和层级查询。",
                "steps": ["识别输入类型", "查询 IPC 详情", "构建层级路径"],
                "outputs": outputs,
                "symbol": symbol,
                "hierarchy": hierarchy,
            },
        }

    items = fetch_from_incopat_keyword_search(query) or []
    results = []
    for item in items[:10]:
        code = item.get("code", "")
        title = item.get("nameNew") or item.get("name") or ""
        results.append(f"{code} | {title}")

    return {
        "success": True,
        "type": "embedded_flow",
        "message": "IPC 关键词检索完成",
        "data": {
            "flow_id": "ipc_lookup",
            "title": "IPC 检索流程",
            "description": "已完成 IPC 关键词检索。",
            "steps": ["识别输入类型", "执行关键词检索", "返回候选 IPC 列表"],
            "outputs": [
                {"title": "检索词", "text": query},
                {"title": "候选结果", "text": "\n".join(results) or "未找到结果"},
            ],
            "results": items[:10],
        },
    }


def run_pdf_ocr_flow(flow_input: str, params: Dict[str, Any]) -> Dict[str, Any]:
    attachment = params.get("attachment") or {}
    file_name = attachment.get("name") or "uploaded-file"
    mime_type = attachment.get("mime_type") or ""
    engine = params.get("ocr_engine") or ("glm_ocr" if params.get("model", "").lower().startswith("glm") else "paddle_ocr_vl")
    pages = attachment.get("pages") or []
    file_data = attachment.get("data")

    if not file_data and not pages:
        return {"success": False, "error": "请先在 CLI 中选择文件，再执行 pdf_ocr_pipeline"}

    parsed_pages: List[Dict[str, Any]] = []
    markdown_parts: List[str] = []

    def parse_single(data: str) -> Dict[str, Any]:
        if engine == "glm_ocr":
            return _parse_with_glm_ocr(data, {})
        return _parse_with_paddle_ocr_vl(data, {})

    if pages:
        for item in pages:
            page_result = parse_single(item.get("data", ""))
            parsed_pages.extend(page_result.get("pages") or [])
            page_markdown = page_result.get("markdown") or page_result.get("md_results") or ""
            if page_markdown:
                markdown_parts.append(page_markdown)
        result = {
            "pages": parsed_pages,
            "markdown": "\n\n---\n\n".join(markdown_parts),
            "engine": engine,
            "md_results": "\n\n---\n\n".join(markdown_parts),
        }
    else:
        result = parse_single(file_data)

    markdown = result.get("markdown") or result.get("md_results") or ""
    preview = markdown[:3000] if markdown else "未提取到正文"
    pages = result.get("pages") or []

    return {
        "success": True,
        "type": "embedded_flow",
        "message": "PDF OCR 解析完成",
        "data": {
            "flow_id": "pdf_ocr_pipeline",
            "title": "PDF OCR 阅读流程",
            "description": "已完成文档解析，可继续围绕结果追问。",
            "steps": ["读取附件", "调用 OCR 引擎", "抽取版面文本", "回填 CLI 上下文"],
            "outputs": [
                {
                    "title": "附件信息",
                    "text": "\n".join([f"文件名: {file_name}", f"MIME: {mime_type or '-'}", f"引擎: {engine}", f"页数: {len(pages)}"]),
                },
                {"title": "OCR 预览", "text": preview},
            ],
            "ocr_result": result,
        },
    }


def run_claims_excel_flow(params: Dict[str, Any]) -> Dict[str, Any]:
    attachment = params.get("attachment") or {}
    file_data = attachment.get("data")
    file_name = attachment.get("name") or "claims.xlsx"
    if not file_data:
        return {"success": False, "error": "请先在 CLI 中选择 Excel 文件"}

    suffix = ".xlsx" if file_name.lower().endswith(".xlsx") else ".xls"
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            temp_path = tmp.name
            tmp.write(data_url_to_bytes(file_data))

        excel_processor = ExcelProcessor()
        sheet_names = excel_processor.get_sheet_names(temp_path)
        sheet_name = sheet_names[0] if sheet_names else None
        df_preview = excel_processor.read_excel_file(temp_path, sheet_name=sheet_name, nrows=10)
        columns = list(df_preview.columns)
        detector = ColumnDetector()
        column_analysis = detector.analyze_all_columns(df_preview)

        claims_column = None
        patent_column = None
        if isinstance(column_analysis, dict):
            claims_column = (column_analysis.get("claims_column") or {}).get("column_name")
            patent_column = (column_analysis.get("patent_column") or {}).get("column_name")

        outputs = [
            {"title": "文件信息", "text": "\n".join([f"文件名: {file_name}", f"工作表: {sheet_name or '-'}", f"列数: {len(columns)}"])},
            {"title": "识别列", "text": "\n".join([f"Claims列: {claims_column or '-'}", f"专利号列: {patent_column or '-'}"])},
        ]

        if not claims_column:
            outputs.append({"title": "候选列", "text": "\n".join(columns[:20]) or "无"})
            return {
                "success": True,
                "type": "embedded_flow",
                "message": "已读取 Excel，但未自动识别 claims 列",
                "data": {
                    "flow_id": "claims_excel_pipeline",
                    "title": "Claims Excel 处理",
                    "description": "已读取 Excel 结构，请根据候选列继续指定 claims 列。",
                    "steps": ["读取 Excel", "识别工作表", "分析列类型"],
                    "outputs": outputs,
                    "column_analysis": column_analysis,
                },
            }

        service = ProcessingService()
        result = service.process_excel_file(
            file_path=temp_path,
            column_name=claims_column,
            sheet_name=sheet_name,
            patent_column_name=patent_column,
        )
        preview_claims = []
        for claim in (result.claims_data or [])[:8]:
            refs = ",".join(str(value) for value in getattr(claim, "referenced_claims", []) or []) or "-"
            preview_claims.append(
                f"#{claim.claim_number} | {claim.claim_type} | patent={getattr(claim, 'patent_number', None) or '-'} | refs={refs}"
            )

        outputs.extend(
            [
                {
                    "title": "处理摘要",
                    "text": "\n".join(
                        [
                            f"处理单元格: {result.total_cells_processed}",
                            f"抽取权利要求: {result.total_claims_extracted}",
                            f"独立权利要求: {result.independent_claims_count}",
                            f"从属权利要求: {result.dependent_claims_count}",
                        ]
                    ),
                },
                {"title": "结果预览", "text": "\n".join(preview_claims) or "无"},
            ]
        )

        return {
            "success": True,
            "type": "embedded_flow",
            "message": "Claims Excel 处理完成",
            "data": {
                "flow_id": "claims_excel_pipeline",
                "title": "Claims Excel 处理",
                "description": "已自动识别 claims 列并完成整表处理。",
                "steps": ["读取 Excel", "识别 sheet/列", "抽取 claims", "生成结构化结果"],
                "outputs": outputs,
                "summary": {
                    "total_cells_processed": result.total_cells_processed,
                    "total_claims_extracted": result.total_claims_extracted,
                    "independent_claims_count": result.independent_claims_count,
                    "dependent_claims_count": result.dependent_claims_count,
                },
            },
        }
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


class CommandRegistry:
    def __init__(self):
        self._commands = {
            "patent": {
                "description": "专利抓取与分析",
                "subcommands": {
                    "search": "抓取一个或多个专利",
                    "family": "查看同族入口",
                    "compare": "同族对比工作流",
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
                    "list": "列出 CLI 可执行流程",
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
            return {
                "success": True,
                "data": {"help": self.registry.get_help_text(subcommand), "commands": self.registry.list_commands()},
            }

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
            return self.launch_flow(params.get("flow_id"), params.get("flow_input"), request_context, params)

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
                    "data": {"api_endpoint": f"/api/patent/family/{patent_number}"},
                }

            if subcommand == "compare":
                flow_input = normalized or params.get("patent_number") or ""
                return self.launch_flow("patent_family_compare", flow_input, request_context, params)

        return {
            "success": False,
            "error": f"未知命令: {command} {subcommand or ''}".strip(),
            "suggestions": ["输入 help 查看命令", "或直接用自然语言发起请求"],
        }

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
            return run_patent_family_compare_flow(flow_input or "", params)

        if flow_id == "claims_pipeline":
            return run_claims_text_flow(flow_input or "")

        if flow_id == "claims_excel_pipeline":
            return run_claims_excel_flow(params)

        if flow_id == "ipc_lookup":
            return run_ipc_lookup_flow(flow_input or "")

        if flow_id == "pdf_ocr_pipeline":
            return run_pdf_ocr_flow(flow_input or "", params)

        return {"success": False, "error": f"未注册的 flow: {flow_id}"}


registry = CommandRegistry()
executor = SimpleCommandExecutor()


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
    elif command == "flow" and subcommand == "attach":
        params["message"] = " ".join(remaining)

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
        attachment = req_data.get("attachment")
        ocr_engine = req_data.get("ocr_engine")

        if not user_input and not attachment:
            return create_response(error="请输入命令")

        request_context = get_request_context()

        auto_flow = detect_auto_flow_command(user_input, attachment, provider, model, ocr_engine)
        if auto_flow:
            parsed = auto_flow
            result = executor.execute(parsed, request_context)
            return create_response(
                data={"success": result.get("success", False), "mode": "legacy_cli_command", "parsed": parsed, "result": result},
                status_code=200 if result.get("success", False) else 400,
            )

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
        if attachment:
            parsed.setdefault("params", {})["attachment"] = attachment
        if ocr_engine:
            parsed.setdefault("params", {})["ocr_engine"] = ocr_engine
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
        error_json = json.dumps(
            {"type": "error", "error": error_response.get_json().get("error", "request error")},
            ensure_ascii=False,
        )
        return Response(f"data: {error_json}\n\n", mimetype="text/event-stream", status=error_response.status_code)

    req_data = request.get_json() or {}
    user_input = (req_data.get("input") or "").strip()
    provider = req_data.get("provider")
    model = req_data.get("model")
    attachment = req_data.get("attachment")
    ocr_engine = req_data.get("ocr_engine")

    if not user_input and not attachment:
        error_json = json.dumps({"type": "error", "error": "请输入命令"}, ensure_ascii=False)
        return Response(f"data: {error_json}\n\n", mimetype="text/event-stream", status=400)

    request_context = get_request_context()

    def generate():
        try:
            auto_flow = detect_auto_flow_command(user_input, attachment, provider, model, ocr_engine)
            if auto_flow:
                parsed = auto_flow
                result = executor.execute(parsed, request_context)
                flow_id = parsed.get("params", {}).get("flow_id", "flow")
                trace_message = {
                    "claims_excel_pipeline": "检测到 Excel 附件，自动进入 Claims Excel 工作流",
                    "pdf_ocr_pipeline": "检测到附件，自动进入 PDF OCR 工作流",
                    "ipc_lookup": "识别到 IPC/分类号查询，自动进入 IPC 工作流",
                }.get(flow_id, f"自动进入 {flow_id} 工作流")
                yield f"data: {json.dumps({'type': 'trace', 'stage': 'auto_flow', 'message': trace_message}, ensure_ascii=False)}\n\n"
                yield f"data: {json.dumps({'type': 'final', 'data': result}, ensure_ascii=False)}\n\n"
                yield "data: [DONE]\n\n"
                return

            if orchestrator.is_builtin_or_command_style(user_input):
                parsed = parse_legacy_command(user_input, provider=provider, model=model)
                if attachment:
                    parsed.setdefault("params", {})["attachment"] = attachment
                if ocr_engine:
                    parsed.setdefault("params", {})["ocr_engine"] = ocr_engine
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

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


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
