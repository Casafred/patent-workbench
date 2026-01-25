"""
Claims Analyzer API - 独立权利要求分析器
提供文本分析API，支持直接输入权利要求文本进行分析
"""

from flask import Blueprint, request
from backend.utils import create_response
from patent_claims_processor.processors import ClaimsParser, ClaimsClassifier, LanguageDetector

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
        
        # 直接解析权利要求 - 让解析器处理多语言版本（与Excel处理相同）
        try:
            claims_dict = parser.split_claims_by_numbers(cleaned_text)
            
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
                    matches = re.findall(pattern, cleaned_text, re.DOTALL)
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
                if not claims_dict and cleaned_text.strip():
                    # 检查是否包含任何数字
                    if re.search(r'\d', cleaned_text):
                        claims_dict[1] = cleaned_text.strip()
                    
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
                matches = re.findall(pattern, cleaned_text, re.DOTALL)
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
            if not claims_dict and cleaned_text.strip():
                # 检查是否包含任何数字
                if re.search(r'\d', cleaned_text):
                    claims_dict[1] = cleaned_text.strip()
        
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
