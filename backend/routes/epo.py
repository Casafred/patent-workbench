"""
欧洲专利检索API路由

功能：
1. CQL 检索
2. 专利详情获取
3. 配额监控
4. AI 解读集成
"""

from flask import Blueprint, request, jsonify, current_app
import logging

from backend.services.epo_ops_service import get_epo_ops_client, EPOOPSClient

logger = logging.getLogger(__name__)

epo_bp = Blueprint('epo', __name__)


@epo_bp.route('/search', methods=['POST'])
def search_patents():
    """
    专利检索
    
    Request:
        {
            "query": "ta=machine learning AND pa=Google",
            "range_start": 1,
            "range_end": 25
        }
    
    Response:
        {
            "success": true,
            "results": [...],
            "total_results": 1000,
            "quota_info": {...}
        }
    """
    try:
        import os
        if not os.getenv('EPO_OPS_KEY') or not os.getenv('EPO_OPS_SECRET'):
            return jsonify({
                'success': False,
                'error': '专利检索服务未配置，请联系管理员配置API密钥'
            }), 400
        
        data = request.get_json()
        query = data.get('query', '')
        range_start = data.get('range_start', 1)
        range_end = data.get('range_end', 25)
        
        if not query:
            return jsonify({
                'success': False,
                'error': '检索查询不能为空'
            }), 400
        
        client = get_epo_ops_client()
        result = client.search(query, range_start, range_end)
        
        results_data = []
        for r in result['results']:
            results_data.append({
                'patent_number': r.patent_number,
                'title': r.title,
                'abstract': r.abstract[:500] + '...' if len(r.abstract) > 500 else r.abstract,
                'applicants': r.applicants,
                'inventors': r.inventors,
                'publication_date': r.publication_date,
                'application_date': r.application_date,
                'cpc_classifications': r.cpc_classifications[:5] if r.cpc_classifications else [],
                'ipc_classifications': r.ipc_classifications[:5] if r.ipc_classifications else [],
                'url': r.url
            })
        
        return jsonify({
            'success': True,
            'results': results_data,
            'total_results': result['total_results'],
            'quota_info': result['quota_info']
        })
        
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
    except Exception as e:
        logger.error(f"专利检索失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@epo_bp.route('/detail/<patent_number>', methods=['GET'])
def get_patent_detail(patent_number):
    """
    获取专利详情
    
    Params:
        patent_number: 专利号
        endpoint: biblio | claims | description | fulltext (default: biblio)
    """
    try:
        endpoint = request.args.get('endpoint', 'biblio')
        
        client = get_epo_ops_client()
        result = client.get_patent_detail(patent_number, endpoint)
        
        return jsonify({
            'success': True,
            'detail': result['detail'],
            'quota_info': result['quota_info']
        })
        
    except Exception as e:
        logger.error(f"获取专利详情失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@epo_bp.route('/quota', methods=['GET'])
def get_quota_info():
    """
    获取配额使用情况（从EPO官方API）
    """
    try:
        import os
        if not os.getenv('EPO_OPS_KEY') or not os.getenv('EPO_OPS_SECRET'):
            return jsonify({
                'success': True,
                'quota': {
                    'weekly_used_bytes': 0,
                    'weekly_used_mb': 0.0,
                    'weekly_remaining_mb': 4096.0,
                    'usage_percent': 0.0,
                    'week_start': '',
                    'reset_date': '',
                    'configured': False
                }
            })
        
        client = get_epo_ops_client()
        usage_info = client.get_official_usage()
        
        return jsonify({
            'success': True,
            'quota': usage_info
        })
        
    except Exception as e:
        logger.error(f"获取配额信息失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@epo_bp.route('/analyze', methods=['POST'])
def analyze_patent():
    """
    AI 解读专利
    
    Request:
        {
            "patent_number": "EP1234567A1",
            "template": "technical_summary",
            "model": "glm-4-flash"
        }
    """
    try:
        from backend.services.llm_service import get_llm_client
        
        data = request.get_json()
        patent_number = data.get('patent_number', '')
        template = data.get('template', 'technical_summary')
        model = data.get('model', 'glm-4-flash')
        
        if not patent_number:
            return jsonify({
                'success': False,
                'error': '专利号不能为空'
            }), 400
        
        client = get_epo_ops_client()
        
        biblio_result = client.get_patent_detail(patent_number, 'biblio')
        claims_result = client.get_patent_detail(patent_number, 'claims')
        
        detail = biblio_result.get('detail', {})
        claims = claims_result.get('detail', {}).get('claims', [])
        
        if not detail:
            return jsonify({
                'success': False,
                'error': '未找到专利信息'
            }), 404
        
        prompt_templates = {
            'technical_summary': f"""请对以下专利进行技术摘要分析：

专利号：{patent_number}
标题：{detail.get('title', '')}
摘要：{detail.get('abstract', '')}
权利要求：{chr(10).join(claims[:5]) if claims else ''}

请从以下方面进行分析：
1. 技术领域
2. 核心技术方案
3. 创新点
4. 应用场景
5. 技术效果

请用中文回答。""",
            
            'claim_analysis': f"""请对以下专利权利要求进行分析：

专利号：{patent_number}
标题：{detail.get('title', '')}
权利要求：{chr(10).join(claims) if claims else ''}

请分析：
1. 独立权利要求范围
2. 从属权利要求层次
3. 保护范围评估
4. 潜在规避设计

请用中文回答。""",
            
            'competitor_analysis': f"""请对以下专利进行竞争对手分析：

专利号：{patent_number}
标题：{detail.get('title', '')}
申请人：{', '.join(detail.get('applicants', []))}
发明人：{', '.join(detail.get('inventors', []))}
CPC分类：{', '.join(detail.get('cpc_classifications', []))}

请分析：
1. 申请人技术布局
2. 技术发展趋势
3. 潜在竞争对手
4. 技术壁垒评估

请用中文回答。"""
        }
        
        prompt = prompt_templates.get(template, prompt_templates['technical_summary'])
        
        llm_client = get_llm_client()
        
        if hasattr(llm_client, 'chat'):
            response = llm_client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}]
            )
            analysis = response.choices[0].message.content
        else:
            response = llm_client.invoke(prompt)
            analysis = response.content
        
        return jsonify({
            'success': True,
            'analysis': analysis,
            'patent_number': patent_number,
            'quota_info': biblio_result.get('quota_info', {})
        })
        
    except Exception as e:
        logger.error(f"AI 解读失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@epo_bp.route('/cql-help', methods=['GET'])
def get_cql_help():
    """
    获取 CQL 检索语法帮助
    """
    help_info = {
        'fields': [
            {'code': 'ta', 'name': '标题', 'example': 'ta=machine learning'},
            {'code': 'ab', 'name': '摘要', 'example': 'ab=neural network'},
            {'code': 'cl', 'name': '权利要求', 'example': 'cl=method for'},
            {'code': 'de', 'name': '说明书', 'example': 'de=artificial intelligence'},
            {'code': 'pa', 'name': '申请人', 'example': 'pa=Google'},
            {'code': 'in', 'name': '发明人', 'example': 'in=Smith'},
            {'code': 'pn', 'name': '公开号', 'example': 'pn=US2024000001'},
            {'code': 'an', 'name': '申请号', 'example': 'an=US2023123456'},
            {'code': 'pr', 'name': '优先权号', 'example': 'pr=US2022123456'},
            {'code': 'cpc', 'name': 'CPC分类', 'example': 'cpc=G06N'},
            {'code': 'ipc', 'name': 'IPC分类', 'example': 'ipc=G06N'},
            {'code': 'pd', 'name': '公开日期', 'example': 'pd=20240101'},
            {'code': 'ad', 'name': '申请日期', 'example': 'ad=20230101'},
        ],
        'operators': [
            {'operator': 'AND', 'description': '逻辑与', 'example': 'ta=AI AND pa=Google'},
            {'operator': 'OR', 'description': '逻辑或', 'example': 'pa=Apple OR pa=Microsoft'},
            {'operator': 'NOT', 'description': '逻辑非', 'example': 'ta=AI NOT pa=Google'},
            {'operator': 'NEAR', 'description': '邻近检索', 'example': 'ta=neural NEAR network'},
            {'operator': 'ADJ', 'description': '相邻检索', 'example': 'ta=machine ADJ learning'},
            {'operator': '..', 'description': '范围检索', 'example': 'pd=20230101..20240101'},
        ],
        'examples': [
            {
                'name': '标题检索',
                'query': 'ta=machine learning',
                'description': '在标题中检索包含"machine learning"的专利'
            },
            {
                'name': '申请人+日期范围',
                'query': 'pa=Apple AND pd=20230101..20240101',
                'description': '检索Apple在2023年公开的专利'
            },
            {
                'name': 'CPC分类检索',
                'query': 'cpc=G06N AND ta=neural network',
                'description': '检索G06N分类下标题包含"neural network"的专利'
            },
            {
                'name': '组合检索',
                'query': '(ta=AI OR ta=artificial intelligence) AND pa=Google AND pd>20230101',
                'description': '检索Google在2023年后公开的AI相关专利'
            }
        ]
    }
    
    return jsonify({
        'success': True,
        'help': help_info
    })
