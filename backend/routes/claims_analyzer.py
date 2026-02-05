"""
Claims Analyzer API - 独立权利要求分析器
提供文本分析API，支持直接输入权利要求文本进行分析
"""

import os
import logging
from flask import Blueprint, request
from backend.utils import create_response
from patent_claims_processor.processors import ClaimsParser, ClaimsClassifier, LanguageDetector
from zhipuai import ZhipuAI

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 翻译提示模板
TRANSLATION_PROMPT = """你是一个专业的专利文献翻译专家。请将以下{source_lang}文本翻译为中文。

要求:
1. 保持专利术语的准确性
2. 保留所有数字标记和权利要求序号
3. 翻译要流畅自然,符合中文专利文献的表达习惯
4. 不要添加任何解释或注释,只返回翻译结果

原文:
{text}

请直接返回中文翻译:"""

# 语言名称映射
LANG_NAMES = {
    'en': '英文',
    'ja': '日文',
    'ko': '韩文',
    'de': '德文',
    'fr': '法文',
    'es': '西班牙文',
    'ru': '俄文'
}

claims_analyzer_bp = Blueprint('claims_analyzer', __name__)


@claims_analyzer_bp.route('/api/claims-analyzer/parse', methods=['POST'])
def parse_claims_text():
    """
    解析权利要求文本
    
    接收纯文本输入，返回解析后的权利要求结构
    """
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return create_response(error="请提供权利要求文本", status_code=400)
        
        # 初始化处理器
        parser = ClaimsParser()
        classifier = ClaimsClassifier()
        language_detector = LanguageDetector()
        
        # 预处理文本
        def preprocess_text(text: str) -> str:
            """预处理文本，清理常见的格式问题"""
            if not text:
                return ""
            
            # 移除多余的空白字符
            cleaned = text.strip()
            
            # 统一换行符
            cleaned = cleaned.replace('\r\n', '\n').replace('\r', '\n')
            
            # 移除多余的空行
            lines = [line.strip() for line in cleaned.split('\n') if line.strip()]
            cleaned = '\n'.join(lines)
            
            # 修复常见的编码问题
            cleaned = cleaned.replace('â€™', "'").replace('â€œ', '"').replace('â€', '"')
            
            return cleaned
        
        cleaned_text = preprocess_text(text)
        
        # 检测文本语言并翻译非中英文内容
        text_to_process = cleaned_text
        detected_language = 'zh'  # 默认中文
        translation_applied = False
        
        try:
            # 检测整个文本的语言
            detected_language = language_detector.detect_language(cleaned_text)
            logger.info(f"Detected text language: {detected_language}")
            
            # 如果不是中文或英文，需要翻译
            if detected_language not in ['zh', 'en']:
                logger.info(f"Non-Chinese/English text detected, will translate to Chinese")
                
                # 初始化翻译服务
                api_key = os.getenv('ZHIPU_API_KEY')
                if not api_key:
                    logger.warning("ZHIPU_API_KEY not configured, skipping translation")
                else:
                    try:
                        client = ZhipuAI(api_key=api_key)
                        
                        # 准备翻译提示
                        source_lang_name = LANG_NAMES.get(detected_language, detected_language)
                        prompt = TRANSLATION_PROMPT.format(
                            source_lang=source_lang_name,
                            text=cleaned_text
                        )
                        
                        # 调用翻译API
                        logger.info(f"Translating text using glm-4-flash")
                        response = client.chat.completions.create(
                            model="glm-4-flash",
                            messages=[
                                {
                                    "role": "system",
                                    "content": "你是一位专业的专利文献翻译专家。请准确翻译专利文本，保持专业术语的准确性。"
                                },
                                {
                                    "role": "user",
                                    "content": prompt
                                }
                            ],
                            stream=False,
                            temperature=0.3
                        )
                        
                        translated_text = response.choices[0].message.content.strip()
                        logger.info(f"Translation completed successfully")
                        
                        # 使用翻译后的文本进行处理
                        text_to_process = translated_text
                        translation_applied = True
                        
                    except Exception as e:
                        logger.error(f"Translation failed: {str(e)}")
                        logger.warning("Translation failed, will try to process original text")
                        # 翻译失败时使用原文
                        text_to_process = cleaned_text
        except Exception as e:
            logger.error(f"Language detection failed: {str(e)}")
            # 语言检测失败时使用原文
            text_to_process = cleaned_text
        
        # 解析权利要求 - 使用处理后的文本（可能是翻译后的）
        try:
            claims_dict = parser.split_claims_by_numbers(text_to_process)
            
            # 如果标准解析失败，尝试更宽松的解析
            if not claims_dict:
                # 尝试备用解析方法
                import re
                claims_dict = {}
                
                # 寻找任何数字后跟文本的模式
                patterns = [
                    r'(\d+)[\.、\)\s]+([^0-9]+?)(?=\d+[\.、\)\s]|$)',  # 数字 + 分隔符 + 文本
                    r'(\d+)\s*[:：]\s*([^0-9]+?)(?=\d+\s*[:：]|$)',    # 数字 + 冒号 + 文本
                ]
                
                for pattern in patterns:
                    matches = re.findall(pattern, text_to_process, re.DOTALL)
                    if matches:
                        for match in matches:
                            try:
                                number = int(match[0])
                                content = match[1].strip()
                                if content and 1 <= number <= 1000:
                                    claims_dict[number] = content
                            except (ValueError, IndexError):
                                continue
                        break  # 如果找到匹配，就不尝试其他模式
                
                # 如果仍然没有找到，尝试将整个文本作为单个权利要求
                if not claims_dict and text_to_process.strip():
                    # 检查是否包含任何数字
                    if re.search(r'\d', text_to_process):
                        claims_dict[1] = text_to_process.strip()
                    
        except Exception as e:
            # 解析失败时尝试备用方法
            import re
            claims_dict = {}
            
            # 寻找任何数字后跟文本的模式
            patterns = [
                r'(\d+)[\.、\)\s]+([^0-9]+?)(?=\d+[\.、\)\s]|$)',  # 数字 + 分隔符 + 文本
                r'(\d+)\s*[:：]\s*([^0-9]+?)(?=\d+\s*[:：]|$)',    # 数字 + 冒号 + 文本
            ]
            
            for pattern in patterns:
                matches = re.findall(pattern, text_to_process, re.DOTALL)
                if matches:
                    for match in matches:
                        try:
                            number = int(match[0])
                            content = match[1].strip()
                            if content and 1 <= number <= 1000:
                                claims_dict[number] = content
                        except (ValueError, IndexError):
                            continue
                    break  # 如果找到匹配，就不尝试其他模式
            
            # 如果仍然没有找到，尝试将整个文本作为单个权利要求
            if not claims_dict and text_to_process.strip():
                # 检查是否包含任何数字
                if re.search(r'\d', text_to_process):
                    claims_dict[1] = text_to_process.strip()
        
        # 分析每条权利要求
        processed_claims = []
        for claim_number, claim_text in claims_dict.items():
            try:
                # 标准化文本
                normalized_text = parser.normalize_claim_text(claim_text)
                
                # 检测当前权利要求的语言
                claim_language = language_detector.detect_language(normalized_text)
                
                # 分类权利要求类型
                claim_type = classifier.classify_claim_type(normalized_text, claim_language)
                
                # 提取引用关系
                referenced_claims = []
                if claim_type == 'dependent':
                    try:
                        referenced_claims = classifier.extract_referenced_claims(
                            normalized_text, claim_language
                        )
                    except Exception:
                        # 引用提取失败时，仍然标记为从属权利要求但引用为空
                        pass
                
                # 处理特殊引用标记
                resolved_references = []
                for ref in referenced_claims:
                    if ref == 'previous':
                        # 向前引用：只引用当前权利要求之前的所有权利要求
                        # 获取当前权利要求之前的所有序号
                        for prev_num in claims_dict.keys():
                            if prev_num < claim_number:
                                resolved_references.append(prev_num)
                    elif ref == 'all':
                        # 引用全部权利要求
                        resolved_references.extend(claims_dict.keys())
                    else:
                        # 普通引用
                        resolved_references.append(ref)
                
                # 去重并排序
                referenced_claims = sorted(list(set(resolved_references)))
                
                # 计算置信度分数
                def calculate_confidence_score(claim_text: str, claim_type: str, 
                                            referenced_claims: list) -> float:
                    """
                    计算权利要求处理的置信度分数
                    """
                    score = 0.5  # 基础分数
                    
                    # 文本长度因子
                    if len(claim_text) > 10:
                        score += 0.2
                    
                    # 类型一致性因子
                    if claim_type == 'dependent' and referenced_claims:
                        score += 0.2
                    elif claim_type == 'independent' and not referenced_claims:
                        score += 0.2
                    
                    # 文本结构因子
                    if claim_text.endswith(('.', '。', ';', '；', ':', '：')):
                        score += 0.1
                    
                    return min(1.0, score)
                
                confidence_score = calculate_confidence_score(
                    normalized_text, claim_type, referenced_claims
                )
                
                processed_claims.append({
                    'claim_number': claim_number,
                    'claim_text': normalized_text,
                    'full_text': normalized_text,
                    'claim_type': claim_type,
                    'language': claim_language,
                    'referenced_claims': referenced_claims,
                    'confidence_score': confidence_score
                })
                
            except Exception as e:
                # 单个权利要求处理失败时，跳过但不影响其他权利要求
                continue
        
        # 统计信息
        total_claims = len(processed_claims)
        independent_count = sum(1 for c in processed_claims if c['claim_type'] == 'independent')
        dependent_count = total_claims - independent_count
        
        return create_response(data={
            'claims': processed_claims,
            'summary': {
                'total_claims': total_claims,
                'independent_claims': independent_count,
                'dependent_claims': dependent_count
            },
            'language_info': {
                'detected_language': detected_language,
                'translation_applied': translation_applied,
                'original_language': detected_language if translation_applied else None
            }
        })
        
    except Exception as e:
        import traceback
        print(f"Error in parse_claims_text: {traceback.format_exc()}")
        return create_response(
            error=f"解析失败: {str(e)}",
            status_code=500
        )


@claims_analyzer_bp.route('/api/claims-analyzer/visualize', methods=['POST'])
def generate_visualization_data():
    """
    生成可视化数据
    
    接收权利要求列表，返回可视化所需的节点和边数据
    """
    try:
        data = request.get_json()
        claims = data.get('claims', [])
        
        if not claims:
            return create_response(error="请提供权利要求数据", status_code=400)
        
        # 构建节点和边
        nodes = []
        links = []
        
        for claim in claims:
            nodes.append({
                'id': str(claim['claim_number']),
                'label': f"权利要求{claim['claim_number']}",
                'type': claim['claim_type'],
                'text': claim['full_text'][:100] + '...' if len(claim['full_text']) > 100 else claim['full_text']
            })
            
            # 添加引用关系
            for ref in claim.get('referenced_claims', []):
                links.append({
                    'source': str(claim['claim_number']),
                    'target': str(ref)
                })
        
        return create_response(data={
            'nodes': nodes,
            'links': links
        })
        
    except Exception as e:
        import traceback
        print(f"Error in generate_visualization_data: {traceback.format_exc()}")
        return create_response(
            error=f"生成可视化数据失败: {str(e)}",
            status_code=500
        )
