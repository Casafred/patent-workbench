"""
专利查询和可视化功能的API路由

提供专利号搜索、配置管理和可视化数据的API端点。
"""

import json
import traceback
from flask import Blueprint, request, jsonify
from backend.middleware import validate_api_request
from backend.utils import create_response
from patent_query_visualization import (
    get_configuration_service,
    get_patent_storage,
    ColumnConfiguration,
    ValidationResult,
    PatentQueryError,
    ConfigurationError,
    DataStorageError
)

# 创建蓝图
patent_query_bp = Blueprint('patent_query', __name__)


# ==================== 配置管理API ====================

@patent_query_bp.route('/api/patent-query/configuration', methods=['GET'])
def get_configuration():
    """
    获取专利号列配置
    
    Returns:
        配置信息或错误响应
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        config_service = get_configuration_service()
        config = config_service.get_configuration()
        
        if config:
            return create_response(data={
                'patent_number_column': config.patent_number_column,
                'excel_file_path': config.excel_file_path,
                'column_index': config.column_index,
                'header_row': config.header_row,
                'config_id': config.config_id,
                'created_at': config.created_at,
                'updated_at': config.updated_at
            })
        else:
            return create_response(data=None, message="未找到配置")
    
    except Exception as e:
        print(f"获取配置失败: {traceback.format_exc()}")
        return create_response(
            error=f"获取配置失败: {str(e)}",
            status_code=500
        )


@patent_query_bp.route('/api/patent-query/configuration', methods=['POST'])
def save_configuration():
    """
    保存专利号列配置
    
    Request body:
        - patent_number_column: 专利号列名
        - excel_file_path: Excel文件路径
        - column_index: 列索引
        - header_row: 标题行号 (可选，默认为1)
    
    Returns:
        保存结果
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        req_data = request.get_json()
        
        # 验证必填字段
        required_fields = ['patent_number_column', 'excel_file_path', 'column_index']
        for field in required_fields:
            if field not in req_data:
                return create_response(
                    error=f"缺少必填字段: {field}",
                    status_code=400
                )
        
        # 创建配置对象
        config = ColumnConfiguration(
            patent_number_column=req_data['patent_number_column'],
            excel_file_path=req_data['excel_file_path'],
            column_index=int(req_data['column_index']),
            header_row=int(req_data.get('header_row', 1))
        )
        
        # 验证配置
        config_service = get_configuration_service()
        validation_result = config_service.validate_configuration(config)
        
        if not validation_result.is_valid:
            return create_response(
                error="配置验证失败",
                data={
                    'errors': validation_result.errors,
                    'warnings': validation_result.warnings
                },
                status_code=400
            )
        
        # 保存配置
        success = config_service.save_configuration(config)
        
        if success:
            return create_response(
                data={'success': True},
                message="配置保存成功"
            )
        else:
            return create_response(
                error="配置保存失败",
                status_code=500
            )
    
    except ValueError as e:
        return create_response(
            error=f"参数格式错误: {str(e)}",
            status_code=400
        )
    except ConfigurationError as e:
        return create_response(
            error=f"配置错误: {str(e)}",
            status_code=400
        )
    except Exception as e:
        print(f"保存配置失败: {traceback.format_exc()}")
        return create_response(
            error=f"保存配置失败: {str(e)}",
            status_code=500
        )


@patent_query_bp.route('/api/patent-query/configuration/validate', methods=['POST'])
def validate_configuration():
    """
    验证专利号列配置
    
    Request body:
        - patent_number_column: 专利号列名
        - excel_file_path: Excel文件路径
        - column_index: 列索引
        - header_row: 标题行号 (可选，默认为1)
    
    Returns:
        验证结果
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        req_data = request.get_json()
        
        # 创建配置对象
        config = ColumnConfiguration(
            patent_number_column=req_data.get('patent_number_column', ''),
            excel_file_path=req_data.get('excel_file_path', ''),
            column_index=int(req_data.get('column_index', 0)),
            header_row=int(req_data.get('header_row', 1))
        )
        
        # 验证配置
        config_service = get_configuration_service()
        validation_result = config_service.validate_configuration(config)
        
        return create_response(data={
            'is_valid': validation_result.is_valid,
            'errors': validation_result.errors,
            'warnings': validation_result.warnings
        })
    
    except ValueError as e:
        return create_response(
            error=f"参数格式错误: {str(e)}",
            status_code=400
        )
    except Exception as e:
        print(f"验证配置失败: {traceback.format_exc()}")
        return create_response(
            error=f"验证配置失败: {str(e)}",
            status_code=500
        )


@patent_query_bp.route('/api/patent-query/configuration', methods=['DELETE'])
def delete_configuration():
    """
    删除专利号列配置
    
    Returns:
        删除结果
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        config_service = get_configuration_service()
        success = config_service.delete_configuration("column_configuration")
        
        if success:
            return create_response(
                data={'success': True},
                message="配置删除成功"
            )
        else:
            return create_response(
                error="配置删除失败",
                status_code=500
            )
    
    except Exception as e:
        print(f"删除配置失败: {traceback.format_exc()}")
        return create_response(
            error=f"删除配置失败: {str(e)}",
            status_code=500
        )


# ==================== 专利搜索API ====================

@patent_query_bp.route('/api/patent-query/search', methods=['POST'])
def search_patents():
    """
    搜索专利
    
    Request body:
        - query: 搜索查询字符串
        - limit: 返回结果数量限制 (可选，默认为10)
        - exact_match: 是否精确匹配 (可选，默认为False)
    
    Returns:
        搜索结果列表
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        req_data = request.get_json()
        
        query = req_data.get('query', '').strip()
        if not query:
            return create_response(
                error="搜索查询不能为空",
                status_code=400
            )
        
        limit = int(req_data.get('limit', 10))
        exact_match = req_data.get('exact_match', False)
        
        # 限制搜索结果数量
        if limit > 50:
            limit = 50
        
        patent_storage = get_patent_storage()
        
        if exact_match:
            # 精确搜索
            patent = patent_storage.get_patent_data(query)
            if patent:
                results = [{
                    'patent_number': patent.patent_number,
                    'title': patent.title,
                    'applicant': patent.applicant,
                    'filing_date': patent.filing_date,
                    'claims_count': len(patent.claims),
                    'match_score': 1.0
                }]
            else:
                results = []
        else:
            # 模糊搜索
            results = patent_storage.search_patents(query, limit)
            results = [
                {
                    'patent_number': r.patent_number,
                    'title': r.title,
                    'applicant': r.applicant,
                    'filing_date': r.filing_date,
                    'claims_count': r.claims_count,
                    'match_score': r.match_score
                }
                for r in results
            ]
        
        return create_response(data={
            'results': results,
            'total_count': len(results),
            'query': query,
            'exact_match': exact_match
        })
    
    except ValueError as e:
        return create_response(
            error=f"参数格式错误: {str(e)}",
            status_code=400
        )
    except PatentQueryError as e:
        return create_response(
            error=f"搜索错误: {str(e)}",
            status_code=400
        )
    except Exception as e:
        print(f"搜索专利失败: {traceback.format_exc()}")
        return create_response(
            error=f"搜索专利失败: {str(e)}",
            status_code=500
        )


@patent_query_bp.route('/api/patent-query/patent/<patent_number>', methods=['GET'])
def get_patent_details(patent_number):
    """
    获取专利详细信息
    
    Args:
        patent_number: 专利号
    
    Returns:
        专利详细信息
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        patent_storage = get_patent_storage()
        patent = patent_storage.get_patent_data(patent_number)
        
        if not patent:
            return create_response(
                error=f"未找到专利: {patent_number}",
                status_code=404
            )
        
        # 构建响应数据
        claims_data = []
        for claim in patent.claims:
            claims_data.append({
                'id': claim.id,
                'claim_number': claim.claim_number,
                'claim_text': claim.claim_text,
                'claim_type': claim.claim_type.value,
                'level': claim.level,
                'dependencies': claim.dependencies,
                'children': claim.children,
                'confidence_score': claim.confidence_score,
                'language': claim.language
            })
        
        response_data = {
            'patent_number': patent.patent_number,
            'title': patent.title,
            'applicant': patent.applicant,
            'filing_date': patent.filing_date,
            'publication_date': patent.publication_date,
            'abstract': patent.abstract,
            'inventors': patent.inventors,
            'assignees': patent.assignees,
            'claims': claims_data,
            'raw_claims_text': patent.raw_claims_text,
            'description': patent.description,
            'url': patent.url
        }
        
        return create_response(data=response_data)
    
    except DataStorageError as e:
        return create_response(
            error=f"数据访问错误: {str(e)}",
            status_code=500
        )
    except Exception as e:
        print(f"获取专利详情失败: {traceback.format_exc()}")
        return create_response(
            error=f"获取专利详情失败: {str(e)}",
            status_code=500
        )


# ==================== 权利要求树图API ====================

@patent_query_bp.route('/api/patent-query/claims-tree/<patent_number>', methods=['GET'])
def get_claims_tree(patent_number):
    """
    获取专利权利要求树图数据
    
    Args:
        patent_number: 专利号
    
    Returns:
        权利要求树图数据
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        patent_storage = get_patent_storage()
        
        # 首先尝试从缓存获取树图数据
        tree_data = patent_storage.get_claims_tree(patent_number)
        
        if not tree_data:
            # 如果没有缓存的树图数据，从专利数据生成
            patent = patent_storage.get_patent_data(patent_number)
            if not patent:
                return create_response(
                    error=f"未找到专利: {patent_number}",
                    status_code=404
                )
            
            if not patent.claims:
                return create_response(
                    error=f"专利 {patent_number} 没有权利要求数据",
                    status_code=404
                )
            
            # TODO: 这里需要实现权利要求依赖关系分析
            # 暂时返回基础的节点数据
            from patent_query_visualization.models import ClaimsTreeData, ClaimLink
            
            nodes = patent.claims
            links = []
            root_nodes = []
            
            # 构建基础的连接关系
            for claim in patent.claims:
                if claim.claim_type.value == 'independent':
                    root_nodes.append(claim.id)
                else:
                    # 为从属权利要求创建连接
                    for dep in claim.dependencies:
                        dep_id = f"claim_{dep}"
                        links.append(ClaimLink(source=dep_id, target=claim.id))
            
            tree_data = ClaimsTreeData(
                patent_number=patent_number,
                nodes=nodes,
                links=links,
                root_nodes=root_nodes
            )
            
            # 缓存树图数据
            patent_storage.store_claims_tree(patent_number, tree_data)
        
        # 构建响应数据
        nodes_data = []
        for node in tree_data.nodes:
            nodes_data.append({
                'id': node.id,
                'claim_number': node.claim_number,
                'claim_text': node.claim_text,
                'claim_type': node.claim_type.value,
                'level': node.level,
                'dependencies': node.dependencies,
                'children': node.children,
                'x': node.x,
                'y': node.y,
                'confidence_score': node.confidence_score,
                'language': node.language
            })
        
        links_data = []
        for link in tree_data.links:
            links_data.append({
                'source': link.source,
                'target': link.target,
                'type': link.type,
                'strength': link.strength
            })
        
        response_data = {
            'patent_number': tree_data.patent_number,
            'nodes': nodes_data,
            'links': links_data,
            'root_nodes': tree_data.root_nodes,
            'metadata': tree_data.metadata
        }
        
        return create_response(data=response_data)
    
    except DataStorageError as e:
        return create_response(
            error=f"数据访问错误: {str(e)}",
            status_code=500
        )
    except Exception as e:
        print(f"获取权利要求树图失败: {traceback.format_exc()}")
        return create_response(
            error=f"获取权利要求树图失败: {str(e)}",
            status_code=500
        )


# ==================== 健康检查API ====================

@patent_query_bp.route('/api/patent-query/health', methods=['GET'])
def health_check():
    """
    健康检查端点
    
    Returns:
        服务状态信息
    """
    try:
        # 检查数据库连接
        config_service = get_configuration_service()
        db_status = "connected" if config_service.db_pool else "disconnected"
        
        return create_response(data={
            'status': 'healthy',
            'database': db_status,
            'module': 'patent_query_visualization',
            'version': '1.0.0'
        })
    
    except Exception as e:
        return create_response(
            error=f"健康检查失败: {str(e)}",
            status_code=500
        )