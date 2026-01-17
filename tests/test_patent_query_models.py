"""
专利查询可视化模块的数据模型测试
"""

import pytest
import json
from patent_query_visualization.models import (
    ColumnConfiguration,
    ValidationResult,
    PatentSearchResult,
    ClaimNode,
    ClaimLink,
    ClaimsTreeData,
    PatentDetails,
    VisualizationStyle,
    ClaimType,
    claim_node_to_dict,
    dict_to_claim_node,
    claims_tree_to_json,
    json_to_claims_tree
)


class TestDataModels:
    """测试数据模型"""
    
    def test_column_configuration_creation(self):
        """测试列配置创建"""
        config = ColumnConfiguration(
            patent_number_column="专利号",
            excel_file_path="/path/to/file.xlsx",
            column_index=0,
            header_row=1
        )
        
        assert config.patent_number_column == "专利号"
        assert config.excel_file_path == "/path/to/file.xlsx"
        assert config.column_index == 0
        assert config.header_row == 1
    
    def test_validation_result_creation(self):
        """测试验证结果创建"""
        result = ValidationResult(
            is_valid=False,
            errors=["错误1", "错误2"],
            warnings=["警告1"]
        )
        
        assert not result.is_valid
        assert len(result.errors) == 2
        assert len(result.warnings) == 1
    
    def test_patent_search_result_creation(self):
        """测试专利搜索结果创建"""
        result = PatentSearchResult(
            patent_number="CN123456789A",
            title="测试专利",
            applicant="测试公司",
            filing_date="2023-01-01",
            claims_count=10,
            match_score=0.95
        )
        
        assert result.patent_number == "CN123456789A"
        assert result.title == "测试专利"
        assert result.claims_count == 10
        assert result.match_score == 0.95
    
    def test_claim_node_creation(self):
        """测试权利要求节点创建"""
        node = ClaimNode(
            id="claim_1",
            claim_number=1,
            claim_text="一种测试装置",
            claim_type=ClaimType.INDEPENDENT,
            level=0,
            dependencies=[],
            children=["claim_2", "claim_3"]
        )
        
        assert node.id == "claim_1"
        assert node.claim_number == 1
        assert node.claim_type == ClaimType.INDEPENDENT
        assert node.level == 0
        assert len(node.children) == 2
    
    def test_claims_tree_data_creation(self):
        """测试权利要求树数据创建"""
        node1 = ClaimNode(
            id="claim_1",
            claim_number=1,
            claim_text="独立权利要求",
            claim_type=ClaimType.INDEPENDENT,
            level=0
        )
        
        node2 = ClaimNode(
            id="claim_2",
            claim_number=2,
            claim_text="从属权利要求",
            claim_type=ClaimType.DEPENDENT,
            level=1,
            dependencies=[1]
        )
        
        link = ClaimLink(source="claim_1", target="claim_2")
        
        tree = ClaimsTreeData(
            patent_number="CN123456789A",
            nodes=[node1, node2],
            links=[link],
            root_nodes=["claim_1"]
        )
        
        assert tree.patent_number == "CN123456789A"
        assert len(tree.nodes) == 2
        assert len(tree.links) == 1
        assert len(tree.root_nodes) == 1
        assert tree.metadata["total_claims"] == 2
        assert tree.metadata["independent_claims"] == 1
        assert tree.metadata["dependent_claims"] == 1
    
    def test_claim_node_serialization(self):
        """测试权利要求节点序列化"""
        node = ClaimNode(
            id="claim_1",
            claim_number=1,
            claim_text="测试权利要求",
            claim_type=ClaimType.INDEPENDENT,
            level=0,
            dependencies=[],
            confidence_score=0.95,
            language="zh"
        )
        
        # 转换为字典
        node_dict = claim_node_to_dict(node)
        assert node_dict["id"] == "claim_1"
        assert node_dict["claim_type"] == "independent"
        assert node_dict["confidence_score"] == 0.95
        
        # 从字典转换回来
        restored_node = dict_to_claim_node(node_dict)
        assert restored_node.id == node.id
        assert restored_node.claim_type == node.claim_type
        assert restored_node.confidence_score == node.confidence_score
    
    def test_claims_tree_json_serialization(self):
        """测试权利要求树JSON序列化"""
        node = ClaimNode(
            id="claim_1",
            claim_number=1,
            claim_text="测试权利要求",
            claim_type=ClaimType.INDEPENDENT,
            level=0
        )
        
        link = ClaimLink(source="claim_1", target="claim_2")
        
        tree = ClaimsTreeData(
            patent_number="CN123456789A",
            nodes=[node],
            links=[link],
            root_nodes=["claim_1"]
        )
        
        # 转换为JSON
        json_str = claims_tree_to_json(tree)
        assert isinstance(json_str, str)
        
        # 验证JSON格式
        data = json.loads(json_str)
        assert data["patent_number"] == "CN123456789A"
        assert len(data["nodes"]) == 1
        assert len(data["links"]) == 1
        
        # 从JSON转换回来
        restored_tree = json_to_claims_tree(json_str)
        assert restored_tree.patent_number == tree.patent_number
        assert len(restored_tree.nodes) == len(tree.nodes)
        assert len(restored_tree.links) == len(tree.links)
    
    def test_patent_details_creation(self):
        """测试专利详情创建"""
        claim = ClaimNode(
            id="claim_1",
            claim_number=1,
            claim_text="测试权利要求",
            claim_type=ClaimType.INDEPENDENT,
            level=0
        )
        
        patent = PatentDetails(
            patent_number="CN123456789A",
            title="测试专利",
            applicant="测试公司",
            filing_date="2023-01-01",
            inventors=["发明人1", "发明人2"],
            claims=[claim]
        )
        
        assert patent.patent_number == "CN123456789A"
        assert patent.title == "测试专利"
        assert len(patent.inventors) == 2
        assert len(patent.claims) == 1
    
    def test_visualization_style_enum(self):
        """测试可视化样式枚举"""
        assert VisualizationStyle.TREE.value == "tree"
        assert VisualizationStyle.NETWORK.value == "network"
        assert VisualizationStyle.RADIAL.value == "radial"
    
    def test_claim_type_enum(self):
        """测试权利要求类型枚举"""
        assert ClaimType.INDEPENDENT.value == "independent"
        assert ClaimType.DEPENDENT.value == "dependent"


if __name__ == '__main__':
    pytest.main([__file__])