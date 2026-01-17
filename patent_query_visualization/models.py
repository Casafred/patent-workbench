"""
专利查询和可视化功能的数据模型

定义了专利查询、权利要求树图可视化相关的数据结构和接口。
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Any
from abc import ABC, abstractmethod
from enum import Enum
import json


# 枚举类型定义

class VisualizationStyle(Enum):
    """可视化样式枚举"""
    TREE = "tree"
    NETWORK = "network"
    RADIAL = "radial"


class ClaimType(Enum):
    """权利要求类型枚举"""
    INDEPENDENT = "independent"
    DEPENDENT = "dependent"


# 数据模型定义

@dataclass
class ColumnConfiguration:
    """列配置数据结构"""
    patent_number_column: str
    excel_file_path: str
    column_index: int
    header_row: int = 1
    config_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@dataclass
class ValidationResult:
    """验证结果数据结构"""
    is_valid: bool
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


@dataclass
class PatentSearchResult:
    """专利搜索结果数据结构"""
    patent_number: str
    title: str
    applicant: str
    filing_date: str
    claims_count: int
    match_score: float = 0.0
    url: Optional[str] = None


@dataclass
class ClaimNode:
    """权利要求节点数据结构"""
    id: str  # 格式: "claim_{claim_number}"
    claim_number: int
    claim_text: str
    claim_type: ClaimType
    level: int  # 依赖层级，独立权利要求为0
    dependencies: List[int] = field(default_factory=list)  # 直接依赖的权利要求编号
    children: List[str] = field(default_factory=list)  # 子节点ID列表
    x: Optional[float] = None  # D3.js布局坐标
    y: Optional[float] = None
    confidence_score: float = 1.0
    language: str = "zh"


@dataclass
class ClaimLink:
    """权利要求连接数据结构"""
    source: str  # 源节点ID
    target: str  # 目标节点ID
    type: str = "dependency"
    strength: float = 1.0  # 连接强度


@dataclass
class ClaimsTreeData:
    """权利要求树数据结构"""
    patent_number: str
    nodes: List[ClaimNode] = field(default_factory=list)
    links: List[ClaimLink] = field(default_factory=list)
    root_nodes: List[str] = field(default_factory=list)  # 独立权利要求ID列表
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        """初始化后处理"""
        if not self.metadata:
            self.metadata = {
                "total_claims": len(self.nodes),
                "independent_claims": len([n for n in self.nodes if n.claim_type == ClaimType.INDEPENDENT]),
                "dependent_claims": len([n for n in self.nodes if n.claim_type == ClaimType.DEPENDENT]),
                "max_depth": max([n.level for n in self.nodes], default=0)
            }


@dataclass
class PatentDetails:
    """专利详细信息数据结构"""
    patent_number: str
    title: str
    applicant: str
    filing_date: str
    publication_date: Optional[str] = None
    abstract: Optional[str] = None
    inventors: List[str] = field(default_factory=list)
    assignees: List[str] = field(default_factory=list)
    claims: List[ClaimNode] = field(default_factory=list)
    claims_tree: Optional[ClaimsTreeData] = None
    raw_claims_text: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None


@dataclass
class PatentQueryRequest:
    """专利查询请求数据结构"""
    query: str
    limit: int = 10
    exact_match: bool = False
    include_claims: bool = True
    visualization_style: VisualizationStyle = VisualizationStyle.TREE


@dataclass
class PatentQueryResponse:
    """专利查询响应数据结构"""
    results: List[PatentSearchResult] = field(default_factory=list)
    total_count: int = 0
    query_time: float = 0.0
    has_more: bool = False


@dataclass
class VisualizationOptions:
    """可视化选项数据结构"""
    style: VisualizationStyle = VisualizationStyle.TREE
    width: int = 800
    height: int = 600
    node_size: int = 10
    link_distance: int = 100
    charge_strength: int = -300
    show_labels: bool = True
    enable_zoom: bool = True
    enable_drag: bool = True
    animation_duration: int = 750


# 抽象接口定义

class PatentSearchServiceInterface(ABC):
    """专利搜索服务接口"""
    
    @abstractmethod
    def fuzzy_search(self, query: str, limit: int = 10) -> List[PatentSearchResult]:
        """模糊搜索专利号"""
        pass
    
    @abstractmethod
    def exact_search(self, patent_number: str) -> Optional[PatentDetails]:
        """精确搜索专利详情"""
        pass
    
    @abstractmethod
    def search_by_partial_number(self, partial_number: str, limit: int = 10) -> List[PatentSearchResult]:
        """根据部分专利号搜索"""
        pass
    
    @abstractmethod
    def get_patent_claims(self, patent_number: str) -> List[ClaimNode]:
        """获取专利权利要求"""
        pass


class ClaimsDependencyAnalyzerInterface(ABC):
    """权利要求依赖关系分析器接口"""
    
    @abstractmethod
    def analyze_dependencies(self, claims: List[ClaimNode]) -> ClaimsTreeData:
        """分析权利要求依赖关系"""
        pass
    
    @abstractmethod
    def parse_claim_references(self, claim_text: str, language: str = "zh") -> List[int]:
        """解析权利要求引用"""
        pass
    
    @abstractmethod
    def build_dependency_tree(self, claims: List[ClaimNode]) -> ClaimsTreeData:
        """构建依赖关系树"""
        pass
    
    @abstractmethod
    def calculate_claim_levels(self, claims: List[ClaimNode]) -> Dict[int, int]:
        """计算权利要求层级"""
        pass


class ConfigurationServiceInterface(ABC):
    """配置服务接口"""
    
    @abstractmethod
    def get_configuration(self) -> Optional[ColumnConfiguration]:
        """获取当前配置"""
        pass
    
    @abstractmethod
    def save_configuration(self, config: ColumnConfiguration) -> bool:
        """保存配置"""
        pass
    
    @abstractmethod
    def validate_configuration(self, config: ColumnConfiguration) -> ValidationResult:
        """验证配置"""
        pass
    
    @abstractmethod
    def delete_configuration(self, config_id: str) -> bool:
        """删除配置"""
        pass


class VisualizationServiceInterface(ABC):
    """可视化服务接口"""
    
    @abstractmethod
    def generate_tree_data(self, claims_tree: ClaimsTreeData, options: VisualizationOptions) -> Dict[str, Any]:
        """生成树图数据"""
        pass
    
    @abstractmethod
    def generate_network_data(self, claims_tree: ClaimsTreeData, options: VisualizationOptions) -> Dict[str, Any]:
        """生成网络图数据"""
        pass
    
    @abstractmethod
    def generate_radial_data(self, claims_tree: ClaimsTreeData, options: VisualizationOptions) -> Dict[str, Any]:
        """生成径向图数据"""
        pass
    
    @abstractmethod
    def optimize_layout(self, data: Dict[str, Any], style: VisualizationStyle) -> Dict[str, Any]:
        """优化布局"""
        pass


class DataStorageInterface(ABC):
    """数据存储接口"""
    
    @abstractmethod
    def store_patent_data(self, patent: PatentDetails) -> bool:
        """存储专利数据"""
        pass
    
    @abstractmethod
    def get_patent_data(self, patent_number: str) -> Optional[PatentDetails]:
        """获取专利数据"""
        pass
    
    @abstractmethod
    def search_patents(self, query: str, limit: int = 10) -> List[PatentSearchResult]:
        """搜索专利"""
        pass
    
    @abstractmethod
    def store_claims_tree(self, patent_number: str, tree_data: ClaimsTreeData) -> bool:
        """存储权利要求树数据"""
        pass
    
    @abstractmethod
    def get_claims_tree(self, patent_number: str) -> Optional[ClaimsTreeData]:
        """获取权利要求树数据"""
        pass


# 工具函数

def claim_node_to_dict(node: ClaimNode) -> Dict[str, Any]:
    """将ClaimNode转换为字典"""
    return {
        "id": node.id,
        "claim_number": node.claim_number,
        "claim_text": node.claim_text,
        "claim_type": node.claim_type.value,
        "level": node.level,
        "dependencies": node.dependencies,
        "children": node.children,
        "x": node.x,
        "y": node.y,
        "confidence_score": node.confidence_score,
        "language": node.language
    }


def dict_to_claim_node(data: Dict[str, Any]) -> ClaimNode:
    """将字典转换为ClaimNode"""
    return ClaimNode(
        id=data["id"],
        claim_number=data["claim_number"],
        claim_text=data["claim_text"],
        claim_type=ClaimType(data["claim_type"]),
        level=data["level"],
        dependencies=data.get("dependencies", []),
        children=data.get("children", []),
        x=data.get("x"),
        y=data.get("y"),
        confidence_score=data.get("confidence_score", 1.0),
        language=data.get("language", "zh")
    )


def claims_tree_to_json(tree: ClaimsTreeData) -> str:
    """将ClaimsTreeData转换为JSON字符串"""
    data = {
        "patent_number": tree.patent_number,
        "nodes": [claim_node_to_dict(node) for node in tree.nodes],
        "links": [
            {
                "source": link.source,
                "target": link.target,
                "type": link.type,
                "strength": link.strength
            }
            for link in tree.links
        ],
        "root_nodes": tree.root_nodes,
        "metadata": tree.metadata
    }
    return json.dumps(data, ensure_ascii=False, indent=2)


def json_to_claims_tree(json_str: str) -> ClaimsTreeData:
    """将JSON字符串转换为ClaimsTreeData"""
    data = json.loads(json_str)
    
    nodes = [dict_to_claim_node(node_data) for node_data in data["nodes"]]
    links = [
        ClaimLink(
            source=link_data["source"],
            target=link_data["target"],
            type=link_data.get("type", "dependency"),
            strength=link_data.get("strength", 1.0)
        )
        for link_data in data["links"]
    ]
    
    return ClaimsTreeData(
        patent_number=data["patent_number"],
        nodes=nodes,
        links=links,
        root_nodes=data.get("root_nodes", []),
        metadata=data.get("metadata", {})
    )


# 异常类定义

class PatentQueryError(Exception):
    """专利查询异常"""
    pass


class ConfigurationError(Exception):
    """配置异常"""
    pass


class VisualizationError(Exception):
    """可视化异常"""
    pass


class DataStorageError(Exception):
    """数据存储异常"""
    pass