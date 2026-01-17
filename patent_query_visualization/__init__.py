"""
专利查询和可视化功能模块

提供专利号查询、权利要求分析和可视化功能。
"""

from .models import (
    # 数据模型
    ColumnConfiguration,
    ValidationResult,
    PatentSearchResult,
    ClaimNode,
    ClaimLink,
    ClaimsTreeData,
    PatentDetails,
    PatentQueryRequest,
    PatentQueryResponse,
    VisualizationOptions,
    
    # 枚举
    VisualizationStyle,
    ClaimType,
    
    # 接口
    PatentSearchServiceInterface,
    ClaimsDependencyAnalyzerInterface,
    ConfigurationServiceInterface,
    VisualizationServiceInterface,
    DataStorageInterface,
    
    # 工具函数
    claim_node_to_dict,
    dict_to_claim_node,
    claims_tree_to_json,
    json_to_claims_tree,
    
    # 异常
    PatentQueryError,
    ConfigurationError,
    VisualizationError,
    DataStorageError
)

from .database import (
    DatabaseManager,
    PatentDataStorage,
    ConfigurationService,
    init_patent_query_database
)

from .services import (
    PatentSearchService,
    ClaimsDependencyAnalyzer,
    VisualizationService
)

__version__ = "1.0.0"
__author__ = "Patent Analysis Team"
__description__ = "专利查询和权利要求引用关系树图可视化功能"

# 模块级别的便捷函数
# 模块级别的便捷函数
def get_patent_storage():
    """获取专利数据存储实例"""
    return PatentDataStorage()

def get_configuration_service():
    """获取配置服务实例"""
    return ConfigurationService()

def get_patent_search_service():
    """获取专利搜索服务实例"""
    return PatentSearchService()

def get_claims_analyzer():
    """获取权利要求依赖关系分析器实例"""
    return ClaimsDependencyAnalyzer()

def get_visualization_service():
    """获取可视化服务实例"""
    return VisualizationService()

def initialize_module():
    """初始化模块"""
    return init_patent_query_database()

__all__ = [
    # 数据模型
    'ColumnConfiguration',
    'ValidationResult',
    'PatentSearchResult',
    'ClaimNode',
    'ClaimLink',
    'ClaimsTreeData',
    'PatentDetails',
    'PatentQueryRequest',
    'PatentQueryResponse',
    'VisualizationOptions',
    
    # 枚举
    'VisualizationStyle',
    'ClaimType',
    
    # 接口
    'PatentSearchServiceInterface',
    'ClaimsDependencyAnalyzerInterface',
    'ConfigurationServiceInterface',
    'VisualizationServiceInterface',
    'DataStorageInterface',
    
    # 实现类
    'DatabaseManager',
    'PatentDataStorage',
    'ConfigurationService',
    'PatentSearchService',
    'ClaimsDependencyAnalyzer',
    'VisualizationService',
    
    # 工具函数
    'claim_node_to_dict',
    'dict_to_claim_node',
    'claims_tree_to_json',
    'json_to_claims_tree',
    'get_patent_storage',
    'get_configuration_service',
    'get_patent_search_service',
    'get_claims_analyzer',
    'get_visualization_service',
    'initialize_module',
    'init_patent_query_database',
    
    # 异常
    'PatentQueryError',
    'ConfigurationError',
    'VisualizationError',
    'DataStorageError'
]