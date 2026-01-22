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
        
        # 分割文本为行
        lines = text.split('\n')
        claims = []
        current_claim = None
        claim_number = 0
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # 检测权利要求编号
            import re
            claim_match = re.match(r'^(?:权利要求|请求项|請求項|claim|claims?)\s*(\d+)|^(\d+)[.、．]', line, re.IGNORECASE)
            
            if claim_match:
                # 保存上一条权利要求
                if current_claim:
                    claims.append(current_claim)
                
                # 开始新的权利要求
                claim_number = int(claim_match.group(1) or claim_match.group(2))
                claim_text = re.sub(r'^(?:权利要求|请求项|請求項|claim|claims?)\s*\d+[.、．]?\s*', '', line, flags=re.IGNORECASE)
                
                current_claim = {
                    'claim_number': claim_number,
                    'claim_text': claim_text,
                    'full_text': claim_text
                }
            elif current_claim:
                # 继续当前权利要求
                current_claim['full_text'] += ' ' + line
                current_claim['claim_text'] += ' ' + line
        
        # 保存最后一条
        if current_claim:
            claims.append(current_claim)
        
        # 分析每条权利要求
        processed_claims = []
        for claim in claims:
            # 检测语言
            language = language_detector.detect_language(claim['full_text'])
            
            # 提取引用
            referenced_claims = parser.extract_referenced_claims(claim['full_text'])
            
            # 分类
            claim_type = 'dependent' if referenced_claims else 'independent'
            
            processed_claims.append({
                'claim_number': claim['claim_number'],
                'claim_text': claim['claim_text'],
                'full_text': claim['full_text'],
                'claim_type': claim_type,
                'language': language,
                'referenced_claims': referenced_claims,
                'confidence_score': 0.95  # 文本输入的置信度较高
            })
        
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
