"""
Patent search and analysis routes.

This module handles patent search from Google Patents and AI-powered analysis.
Uses improved scraper for better reliability.
"""

import json
import time
import traceback
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, session
from backend.middleware import validate_api_request
from backend.services import get_zhipu_client
from backend.utils import create_response
from backend.scraper.simple_scraper import SimplePatentScraper

patent_bp = Blueprint('patent', __name__)

_scraper_instance = None

GUEST_PATENT_SEARCH_LIMIT = 5
GUEST_PATENT_SEARCH_WINDOW_HOURS = 1


def get_scraper_instance() -> SimplePatentScraper:
    """Get or create the global scraper instance."""
    global _scraper_instance
    
    if _scraper_instance is None:
        _scraper_instance = SimplePatentScraper(delay=2.0)
    
    return _scraper_instance


def check_guest_patent_limit(patent_count):
    """
    Check if guest user has exceeded patent search limit.
    
    Returns:
        tuple: (is_allowed, error_message)
    """
    if not session.get('is_guest'):
        return True, None
    
    now = datetime.now()
    window_start = now - timedelta(hours=GUEST_PATENT_SEARCH_WINDOW_HOURS)
    
    search_history = session.get('guest_patent_searches', [])
    search_history = [t for t in search_history if datetime.fromisoformat(t) > window_start]
    
    total_searched = sum(session.get('guest_patent_search_count', {}).get(str(i), 0) 
                         for i in range(len(search_history)))
    
    if total_searched + patent_count > GUEST_PATENT_SEARCH_LIMIT:
        remaining = GUEST_PATENT_SEARCH_LIMIT - total_searched
        if remaining <= 0:
            oldest = min(search_history) if search_history else now.isoformat()
            oldest_time = datetime.fromisoformat(oldest)
            reset_minutes = int((oldest_time + timedelta(hours=1) - now).total_seconds() / 60) + 1
            return False, f"游客模式限制：每小时仅能查询 {GUEST_PATENT_SEARCH_LIMIT} 篇专利，请 {reset_minutes} 分钟后再试"
        else:
            return False, f"游客模式限制：每小时仅能查询 {GUEST_PATENT_SEARCH_LIMIT} 篇专利，剩余额度 {remaining} 篇"
    
    return True, None


def record_guest_patent_search(count):
    """Record patent search count for guest user."""
    if not session.get('is_guest'):
        return
    
    now = datetime.now()
    window_start = now - timedelta(hours=GUEST_PATENT_SEARCH_WINDOW_HOURS)
    
    search_history = session.get('guest_patent_searches', [])
    search_history = [t for t in search_history if datetime.fromisoformat(t) > window_start]
    
    search_history.append(now.isoformat())
    
    search_count = session.get('guest_patent_search_count', {})
    search_count[str(len(search_history) - 1)] = count
    
    session['guest_patent_searches'] = search_history
    session['guest_patent_search_count'] = search_count
    session.modified = True


@patent_bp.route('/patent/version', methods=['GET'])
def get_version():
    """Get scraper version info for debugging."""
    return create_response(data={
        'version': '2.1-events-timeline-split',
        'features': [
            'claims_always_extracted',
            'drawings_three_strategies',
            'patent_citations',
            'cited_by',
            'events_timeline',  # 新增：事件时间轴（申请、公开、授权等）
            'legal_events'  # 法律事件（USPTO法律状态代码）
        ],
        'timestamp': '2026-02-05'
    })


@patent_bp.route('/patent/search', methods=['POST'])
def search_patents():
    """
    Search for multiple patents from Google Patents.
    
    Request body:
        - patent_numbers: List of patent numbers or string with space/newline separated numbers
        - crawl_specification: Whether to crawl specification fields
        - selected_fields: List of fields to crawl (if None, crawl all fields)
    
    Returns:
        List of patent search results
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        req_data = request.get_json()
        patent_numbers = req_data.get('patent_numbers', [])
        crawl_specification = req_data.get('crawl_specification', False)
        selected_fields = req_data.get('selected_fields', None)
        
        print(f"[API] 收到爬取请求: {len(patent_numbers)} 个专利")
        print(f"[API] crawl_specification: {crawl_specification}")
        print(f"[API] selected_fields: {selected_fields}")
        
        if not isinstance(patent_numbers, list):
            if isinstance(patent_numbers, str):
                patent_numbers = patent_numbers.replace('\n', ' ').split()
            else:
                return create_response(
                    error="patent_numbers must be a list or string",
                    status_code=400
                )
        
        patent_numbers = [p.strip() for p in patent_numbers if p.strip()]
        patent_numbers = list(set(patent_numbers))
        
        if not patent_numbers:
            return create_response(
                error="No valid patent numbers provided",
                status_code=400
            )
        
        is_allowed, error_msg = check_guest_patent_limit(len(patent_numbers))
        if not is_allowed:
            return create_response(error=error_msg, status_code=403)
        
        if session.get('is_guest') and len(patent_numbers) > GUEST_PATENT_SEARCH_LIMIT:
            return create_response(
                error=f"游客模式每次最多查询 {GUEST_PATENT_SEARCH_LIMIT} 篇专利",
                status_code=403
            )
        
        try:
            scraper = get_scraper_instance()
            results = scraper.scrape_patents_batch(
                patent_numbers, 
                crawl_specification=crawl_specification,
                selected_fields=selected_fields
            )
            
            record_guest_patent_search(len(patent_numbers))
            
            api_results = [result.to_dict() for result in results]
            
            return create_response(data=api_results)
            
        except Exception as e:
            print(f"Scraper error: {traceback.format_exc()}")
            return create_response(
                error=f"Failed to scrape patents: {str(e)}",
                status_code=500
            )
    
    except Exception as e:
        print(f"Error in search_patents: {traceback.format_exc()}")
        return create_response(
            error=f"Failed to search patents: {str(e)}",
            status_code=500
        )


@patent_bp.route('/patent/analyze', methods=['POST'])
def analyze_patent():
    """
    Analyze patent data using AI with custom template support.
    
    Request body:
        - patent_data: Patent data to analyze
        - template: Optional custom template with fields and system_prompt
        - user_prompt: Optional custom user prompt (overrides default)
        - include_specification: Whether to include specification in analysis (default: False)
        - model: AI model to use (default: 'GLM-4.7-Flash')
        - temperature: Temperature parameter (default: 0.4)
    
    Returns:
        AI analysis result
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    client, error_response = get_zhipu_client()
    if error_response:
        return error_response
    
    try:
        req_data = request.get_json()
        patent_data = req_data.get('patent_data')
        template = req_data.get('template')
        user_prompt = req_data.get('user_prompt')
        include_specification = req_data.get('include_specification', False)
        model = req_data.get('model', 'GLM-4.7-Flash')
        temperature = req_data.get('temperature', 0.4)
        
        if not patent_data:
            return create_response(
                error="patent_data is required",
                status_code=400
            )
        
        # 使用自定义提示词或构建默认提示词
        if user_prompt:
            # 使用前端传来的完整提示词
            prompt = user_prompt
        else:
            # 构建默认提示词
            prompt = f"请详细解读以下专利信息，并以JSON格式返回结构化的解读结果：\n\n"
            prompt += f"专利号: {patent_data.get('patent_number', 'N/A')}\n"
            prompt += f"标题: {patent_data.get('title', 'N/A')}\n"
            prompt += f"摘要: {patent_data.get('abstract', 'N/A')}\n"
            prompt += f"发明人: {', '.join(patent_data.get('inventors', []))}\n"
            prompt += f"受让人: {', '.join(patent_data.get('assignees', []))}\n"
            prompt += f"申请日期: {patent_data.get('application_date', 'N/A')}\n"
            prompt += f"公开日期: {patent_data.get('publication_date', 'N/A')}\n"
            
            if patent_data.get('claims'):
                claims_text = patent_data.get('claims', 'N/A')
                if isinstance(claims_text, list):
                    claims_text = ' '.join(claims_text)
                prompt += f"权利要求: {claims_text[:500]}...\n"
            else:
                prompt += "权利要求: N/A\n"
            
            # 如果选择包含说明书，则添加说明书内容
            if include_specification and patent_data.get('description'):
                description_text = patent_data.get('description', '')
                # 限制说明书长度，避免超出token限制
                if len(description_text) > 3000:
                    description_text = description_text[:3000] + "..."
                prompt += f"说明书: {description_text}\n"
            
            # 添加JSON格式要求
            prompt += "\n请严格按照以下JSON格式返回解读结果（只返回JSON对象，不要添加markdown代码块标记）：\n"
            prompt += "{\n"
            prompt += '  "technical_field": "技术领域",\n'
            prompt += '  "innovation_points": "创新点",\n'
            prompt += '  "technical_solution": "技术方案",\n'
            prompt += '  "application_scenarios": "应用场景",\n'
            prompt += '  "advantages": "技术优势",\n'
            prompt += '  "summary": "总结"\n'
            prompt += "}\n"
            prompt += "\n注意：\n"
            prompt += "1. 直接返回JSON对象，不要使用```json```标记包裹\n"
            prompt += "2. 所有输出内容必须使用中文\n"
        
        # 使用自定义系统提示词或默认提示词
        system_prompt = "你是一位专业的专利分析师。你必须严格按照要求的JSON格式返回结果，不要添加任何markdown标记（如```json），只返回纯JSON对象。所有分析结果必须使用中文输出。"
        if template and template.get('system_prompt'):
            system_prompt = template['system_prompt']
        
        messages = [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
        
        response_from_sdk = client.chat.completions.create(
            model=model,
            messages=messages,
            stream=False,
            temperature=temperature
        )
        
        json_string = response_from_sdk.model_dump_json()
        clean_dict = json.loads(json_string)
        
        return jsonify(clean_dict)
    except Exception as e:
        print(f"Error in analyze_patent: {traceback.format_exc()}")
        error_payload = {
            "error": {
                "message": f"专利解读失败: {str(e)}",
                "type": "backend_exception"
            }
        }
        return jsonify(error_payload), 500


@patent_bp.route('/patent/chat', methods=['POST'])
def patent_chat():
    """
    Chat with AI about a specific patent.
    
    Request body:
        - patent_number: Patent number
        - patent_data: Patent data for context
        - messages: Chat message history (list of {role, content})
        - model: AI model to use (default: 'GLM-4.7-Flash')
        - temperature: Temperature parameter (default: 0.7)
    
    Returns:
        AI chat response
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    client, error_response = get_zhipu_client()
    if error_response:
        return error_response
    
    try:
        req_data = request.get_json()
        patent_number = req_data.get('patent_number')
        patent_data = req_data.get('patent_data', {})
        messages = req_data.get('messages', [])
        model = req_data.get('model', 'GLM-4.7-Flash')
        temperature = req_data.get('temperature', 0.7)
        
        if not patent_number or not patent_data:
            return create_response(
                error="patent_number and patent_data are required",
                status_code=400
            )
        
        # 构建专利上下文
        patent_context = f"""专利号：{patent_number}
标题：{patent_data.get('title', '未知')}
摘要：{patent_data.get('abstract', '未知')}
发明人：{', '.join(patent_data.get('inventors', []))}
受让人：{', '.join(patent_data.get('assignees', []))}
申请日期：{patent_data.get('application_date', '未知')}
公开日期：{patent_data.get('publication_date', '未知')}

权利要求：
"""
        
        # 添加权利要求
        if patent_data.get('claims'):
            claims = patent_data.get('claims', [])
            if isinstance(claims, list):
                patent_context += '\n'.join(claims[:5])  # 只包含前5条权利要求
            else:
                patent_context += str(claims)[:1000]  # 限制长度
        
        # 添加说明书（如果有）
        if patent_data.get('description'):
            description = patent_data.get('description', '')
            if len(description) > 2000:
                description = description[:2000] + "..."
            patent_context += f"\n\n说明书摘要：\n{description}"
        
        # 构建完整消息列表
        full_messages = [
            {
                "role": "system",
                "content": f"你是一位专利分析专家。以下是专利的详细信息：\n\n{patent_context}\n\n请基于这些信息回答用户的问题。回答要专业、准确、有针对性。"
            }
        ] + messages
        
        # 调用AI API
        response_from_sdk = client.chat.completions.create(
            model=model,
            messages=full_messages,
            stream=False,
            temperature=temperature
        )
        
        json_string = response_from_sdk.model_dump_json()
        clean_dict = json.loads(json_string)
        
        return jsonify(clean_dict)
        
    except Exception as e:
        print(f"Error in patent_chat: {traceback.format_exc()}")
        error_payload = {
            "error": {
                "message": f"专利对话失败: {str(e)}",
                "type": "backend_exception"
            }
        }
        return jsonify(error_payload), 500


@patent_bp.route('/patent/family/<patent_number>', methods=['GET'])
def get_patent_family(patent_number):
    """
    Get family patents for a given patent number.
    
    Args:
        patent_number: The base patent number
    
    Returns:
        Family patents list with basic information
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        print(f"[API] 获取同族专利列表: {patent_number}")
        
        # 爬取基础专利信息（包含同族信息）
        # 注意：crawl_specification 必须为 True 才能爬取同族信息
        scraper = get_scraper_instance()
        base_patent_result = scraper.scrape_patent(
            patent_number, 
            crawl_specification=True,
            selected_fields=['family_applications', 'country_status']
        )
        
        if not base_patent_result or not base_patent_result.success:
            return create_response(
                error=f"未找到专利: {patent_number}",
                status_code=404
            )
        
        # 获取实际的专利数据
        base_patent_data = base_patent_result.data
        if not base_patent_data:
            return create_response(
                error=f"无法获取专利数据: {patent_number}",
                status_code=404
            )
        
        # 提取同族专利列表
        family_applications = base_patent_data.family_applications or []
        country_status = base_patent_data.country_status or []
        
        # 合并同族申请和国家状态，去重
        family_patents = []
        seen_numbers = set()
        
        # 添加基础专利
        base_patent = {
            'patent_number': base_patent_data.patent_number,
            'title': base_patent_data.title,
            'publication_date': base_patent_data.publication_date,
            'language': 'en',
            'is_base': True
        }
        family_patents.append(base_patent)
        seen_numbers.add(base_patent_data.patent_number)
        
        # 添加同族申请
        for app in family_applications:
            pub_num = app.get('publication_number', '')
            if pub_num and pub_num not in seen_numbers:
                family_patent = {
                    'patent_number': pub_num,
                    'title': app.get('title', ''),
                    'publication_date': app.get('publication_date', ''),
                    'language': app.get('language', ''),
                    'status': app.get('status', ''),
                    'is_base': False
                }
                family_patents.append(family_patent)
                seen_numbers.add(pub_num)
        
        # 添加国家状态中的专利
        for status in country_status:
            pub_num = status.get('publication_number', '')
            if pub_num and pub_num not in seen_numbers:
                family_patent = {
                    'patent_number': pub_num,
                    'title': '',
                    'publication_date': '',
                    'language': status.get('language', ''),
                    'country_code': status.get('country_code', ''),
                    'is_base': False
                }
                family_patents.append(family_patent)
                seen_numbers.add(pub_num)
        
        # 限制返回数量（最多30个）
        family_patents = family_patents[:30]
        
        return create_response(data={
            'basePatent': base_patent,
            'familyPatents': family_patents,
            'total': len(family_patents)
        })
        
    except Exception as e:
        print(f"Error in get_patent_family: {traceback.format_exc()}")
        return create_response(
            error=f"获取同族专利列表失败: {str(e)}",
            status_code=500
        )


@patent_bp.route('/patent/family/compare', methods=['POST'])
def compare_family_claims():
    """
    Compare claims of multiple family patents.
    
    Request body:
        - patent_numbers: List of patent numbers to compare
        - model: AI model to use (default: 'GLM-4.7-Flash')
    
    Returns:
        Comparison result with similarity matrix and analysis
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    client, error_response = get_zhipu_client()
    if error_response:
        return error_response
    
    try:
        req_data = request.get_json()
        patent_numbers = req_data.get('patent_numbers', [])
        model = req_data.get('model', 'GLM-4.7-Flash')
        
        if not patent_numbers or len(patent_numbers) < 2:
            return create_response(
                error="至少需要2个专利号进行对比",
                status_code=400
            )
        
        print(f"[API] 对比同族专利权利要求: {len(patent_numbers)} 个专利")
        
        # 爬取所有专利的权利要求
        scraper = get_scraper_instance()
        patent_claims = {}
        
        for patent_number in patent_numbers:
            try:
                result = scraper.scrape_patent(
                    patent_number,
                    crawl_specification=True,
                    selected_fields=['claims']
                )

                # scrape_patent 返回 SimplePatentResult 对象，实际数据在 result.data 中
                if result and result.success and result.data:
                    patent_data = result.data
                    if patent_data.claims:
                        # 只取前3条权利要求（通常是独立权利要求）
                        claims_text = patent_data.claims[:3] if isinstance(patent_data.claims, list) else [str(patent_data.claims)]
                        patent_claims[patent_number] = {
                            'patent_number': patent_number,
                            'title': patent_data.title,
                            'claims': claims_text,
                            'claims_translated': None  # 将在后面填充翻译结果
                        }
            except Exception as e:
                print(f"爬取专利 {patent_number} 权利要求失败: {e}")
                continue
        
        if len(patent_claims) < 2:
            return create_response(
                error="成功获取的权利要求数量不足，无法进行对比",
                status_code=400
            )
        
        # 并行翻译权利要求
        print(f"[API] 开始翻译 {len(patent_claims)} 个专利的权利要求...")
        translation_tasks = []
        for patent_number, data in patent_claims.items():
            claims_text = '\n\n'.join(data['claims']) if isinstance(data['claims'], list) else str(data['claims'])
            translation_tasks.append((patent_number, claims_text))
        
        # 使用线程池并行翻译
        from concurrent.futures import ThreadPoolExecutor, as_completed
        
        def translate_claims(patent_number, claims_text):
            try:
                translation_prompt = f"""请将以下专利权利要求翻译成中文。保持专业术语的准确性，使用专利领域的标准翻译。

专利号：{patent_number}

权利要求原文：
{claims_text}

请直接输出翻译后的中文内容，不要添加任何解释或说明。"""

                translation_response = client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": "你是一位专业的专利翻译专家，精通中英文专利文献翻译。"},
                        {"role": "user", "content": translation_prompt}
                    ],
                    stream=False,
                    temperature=0.3
                )
                
                translated_text = translation_response.choices[0].message.content.strip()
                # 将翻译结果分割成列表（与原始claims对应）
                translated_claims = translated_text.split('\n\n')
                return patent_number, translated_claims
            except Exception as e:
                print(f"翻译专利 {patent_number} 权利要求失败: {e}")
                return patent_number, None
        
        # 并行执行翻译
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = {executor.submit(translate_claims, pn, ct): pn for pn, ct in translation_tasks}
            for future in as_completed(futures):
                try:
                    patent_number, translated_claims = future.result()
                    if translated_claims and patent_number in patent_claims:
                        patent_claims[patent_number]['claims_translated'] = translated_claims
                        print(f"[API] 翻译完成: {patent_number}")
                except Exception as e:
                    print(f"翻译任务执行失败: {e}")
        
        print(f"[API] 翻译完成，开始对比分析...")
        
        # 构建对比提示词
        claims_list = list(patent_claims.values())
        user_prompt = f"""
<TASK>
Compare the following {len(claims_list)} patents' claims and output a JSON object with pairwise comparisons.
</TASK>

<PATENTS>
{json.dumps(claims_list, ensure_ascii=False, indent=2)}
</PATENTS>

<OUTPUT_SCHEMA>
{{
  "comparison_matrix": [
    {{
      "claim_pair": ["专利号1", "专利号2"],
      "similarity_score": 0.75,
      "similar_features": [{{"feature": "共同特征描述"}}],
      "different_features": [{{
        "claim_1_feature": "专利号1的特征",
        "claim_2_feature": "专利号2的特征",
        "analysis": "差异分析（中文）"
      }}]
    }}
  ],
  "overall_summary": "整体对比总结（中文）"
}}
</OUTPUT_SCHEMA>

<REQUIREMENTS>
1. similarity_score should be a float between 0 and 1
2. Provide at least 3 similar features for each pair
3. Provide at least 2 different features with analysis for each pair
4. All analysis text must be in Chinese
5. Output only valid JSON, no markdown code blocks
</REQUIREMENTS>
"""
        
        messages = [
            {
                "role": "system",
                "content": "你是一位专业的专利权利要求分析专家。请严格按照要求的JSON格式返回对比结果，不要添加任何markdown标记（如```json），只返回纯JSON对象。所有分析结果必须使用中文输出。"
            },
            {
                "role": "user",
                "content": user_prompt
            }
        ]
        
        # 调用AI API
        response_from_sdk = client.chat.completions.create(
            model=model,
            messages=messages,
            stream=False,
            temperature=0.4
        )
        
        # 解析响应
        response_text = response_from_sdk.choices[0].message.content
        
        # 尝试提取JSON（去除可能的markdown标记）
        import re
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            response_text = json_match.group()
        
        try:
            result = json.loads(response_text)
        except json.JSONDecodeError:
            # 如果解析失败，返回原始文本
            result = {
                "error": "AI响应解析失败",
                "raw_response": response_text
            }

        # 构建完整的响应，包含AI分析结果和原始权利要求数据
        full_result = {
            **result,
            'patent_claims': patent_claims  # 包含原始权利要求数据，用于并排对比视图
        }

        return create_response(data={'result': full_result})
        
    except Exception as e:
        print(f"Error in compare_family_claims: {traceback.format_exc()}")
        return create_response(
            error=f"对比同族专利权利要求失败: {str(e)}",
            status_code=500
        )


@patent_bp.route('/patent/translate', methods=['POST'])
def translate_patent_text():
    """
    Translate patent text (claims or description) to Chinese.
    
    Request body:
        - text: Text content to translate (string or array of strings)
        - text_type: Type of text ('claims' or 'description')
        - model: AI model to use for translation
        - source_lang: Source language code (default: 'en')
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        import asyncio
        data = request.get_json()
        
        text = data.get('text', '')
        text_type = data.get('text_type', 'description')
        model = data.get('model', 'glm-4-flash')
        source_lang = data.get('source_lang', 'en')
        
        if not text:
            return create_response(
                error="缺少要翻译的文本内容",
                status_code=400
            )
        
        # 获取智谱AI客户端
        client = get_zhipu_client()
        if not client:
            return create_response(
                error="翻译服务不可用，请检查API配置",
                status_code=503
            )
        
        # 导入翻译服务
        from backend.services.ai_description.translation_service import TranslationService
        translation_service = TranslationService()
        
        # 同步翻译函数
        def sync_translate(text_content):
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                result = loop.run_until_complete(
                    translation_service.translate_to_chinese(
                        text=text_content,
                        source_lang=source_lang,
                        client=client,
                        model_name=model
                    )
                )
                loop.close()
                return result
            except Exception as e:
                return f'[翻译失败: {str(e)}]'
        
        # 处理权利要求（可能是数组）
        if text_type == 'claims' and isinstance(text, list):
            translated_claims = []
            for i, claim_text in enumerate(text):
                if claim_text and len(str(claim_text).strip()) > 0:
                    translated = sync_translate(claim_text)
                    translated_claims.append({
                        'original': claim_text,
                        'translated': translated,
                        'index': i + 1
                    })
            
            return create_response(data={
                'text_type': 'claims',
                'translations': translated_claims,
                'source_lang': source_lang,
                'model': model
            })
        
        # 处理说明书（单个长文本）
        if isinstance(text, list):
            text = '\n\n'.join([str(t) for t in text])
        
        # 对于长文本，分段翻译
        max_chunk_size = 4000
        if len(text) > max_chunk_size:
            # 按段落分割
            paragraphs = text.split('\n\n')
            translated_paragraphs = []
            
            for para in paragraphs:
                if para.strip():
                    translated = sync_translate(para)
                    translated_paragraphs.append({
                        'original': para,
                        'translated': translated
                    })
            
            return create_response(data={
                'text_type': 'description',
                'translations': translated_paragraphs,
                'source_lang': source_lang,
                'model': model
            })
        else:
            # 短文本直接翻译
            translated = sync_translate(text)
            
            return create_response(data={
                'text_type': text_type,
                'translations': [{
                    'original': text,
                    'translated': translated
                }],
                'source_lang': source_lang,
                'model': model
            })
            
    except Exception as e:
        print(f"Error in translate_patent_text: {traceback.format_exc()}")
        return create_response(
            error=f"翻译失败: {str(e)}",
            status_code=500
        )
