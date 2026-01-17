"""
专利查询服务的测试
"""

import pytest
from unittest.mock import Mock, patch
from patent_query_visualization.services import (
    PatentSearchService,
    ClaimsDependencyAnalyzer,
    VisualizationService
)
from patent_query_visualization.models import (
    ClaimNode,
    ClaimType,
    ClaimsTreeData,
    VisualizationOptions,
    VisualizationStyle
)


class TestPatentSearchService:
    """测试专利搜索服务"""
    
    def test_clean_patent_number(self):
        """测试专利号清理功能"""
        service = PatentSearchService()
        
        # 测试各种格式的专利号
        assert service._clean_patent_number("CN123456789A") == "CN123456789A"
        assert service._clean_patent_number("cn 123456789 a") == "CN123456789A"
        assert service._clean_patent_number("CN-123456789-A") == "CN123456789A"
        assert service._clean_patent_number("CN.123456789.A") == "CN123456789A"


class TestClaimsDependencyAnalyzer:
    """测试权利要求依赖关系分析器"""
    
    def test_parse_claim_references_chinese(self):
        """测试中文权利要求引用解析"""
        analyzer = ClaimsDependencyAnalyzer()
        
        # 测试单个引用
        text1 = "根据权利要求1所述的装置"
        refs1 = analyzer.parse_claim_references(text1, "zh")
        assert refs1 == [1]
        
        # 测试多个引用
        text2 = "根据权利要求1或2所述的装置"
        refs2 = analyzer.parse_claim_references(text2, "zh")
        assert set(refs2) == {1, 2}
        
        # 测试范围引用
        text3 = "根据权利要求1-3所述的装置"
        refs3 = analyzer.parse_claim_references(text3, "zh")
        assert set(refs3) == {1, 2, 3}
    
    def test_parse_claim_references_english(self):
        """测试英文权利要求引用解析"""
        analyzer = ClaimsDependencyAnalyzer()
        
        # 测试单个引用
        text1 = "The device according to claim 1"
        refs1 = analyzer.parse_claim_references(text1, "en")
        assert refs1 == [1]
        
        # 测试范围引用
        text2 = "The device according to claim 1 to 3"
        refs2 = analyzer.parse_claim_references(text2, "en")
        assert set(refs2) == {1, 2, 3}
    
    def test_parse_reference_numbers(self):
        """测试引用数字解析"""
        analyzer = ClaimsDependencyAnalyzer()
        
        # 测试范围解析
        assert set(analyzer._parse_reference_numbers("1-3")) == {1, 2, 3}
        assert set(analyzer._parse_reference_numbers("1~5")) == {1, 2, 3, 4, 5}
        assert set(analyzer._parse_reference_numbers("1至3")) == {1, 2, 3}
        assert set(analyzer._parse_reference_numbers("1 to 3")) == {1, 2, 3}
        
        # 测试单独数字
        assert analyzer._parse_reference_numbers("1,2,5") == [1, 2, 5]
    
    def test_build_dependency_tree(self):
        """测试依赖关系树构建"""
        analyzer = ClaimsDependencyAnalyzer()
        
        # 创建测试权利要求
        claim1 = ClaimNode(
            id="claim_1",
            claim_number=1,
            claim_text="独立权利要求",
            claim_type=ClaimType.INDEPENDENT,
            level=0
        )
        
        claim2 = ClaimNode(
            id="claim_2",
            claim_number=2,
            claim_text="从属权利要求",
            claim_type=ClaimType.DEPENDENT,
            level=1,
            dependencies=[1]
        )
        
        claims = [claim1, claim2]
        tree = analyzer.build_dependency_tree(claims)
        
        assert len(tree.nodes) == 2
        assert len(tree.links) == 1
        assert tree.root_nodes == ["claim_1"]
        assert tree.links[0].source == "claim_1"
        assert tree.links[0].target == "claim_2"
    
    def test_calculate_claim_levels(self):
        """测试权利要求层级计算"""
        analyzer = ClaimsDependencyAnalyzer()
        
        # 创建测试权利要求
        claim1 = ClaimNode(
            id="claim_1",
            claim_number=1,
            claim_text="独立权利要求",
            claim_type=ClaimType.INDEPENDENT,
            level=0
        )
        
        claim2 = ClaimNode(
            id="claim_2",
            claim_number=2,
            claim_text="从属权利要求",
            claim_type=ClaimType.DEPENDENT,
            level=0,
            dependencies=[1]
        )
        
        claim3 = ClaimNode(
            id="claim_3",
            claim_number=3,
            claim_text="从属权利要求",
            claim_type=ClaimType.DEPENDENT,
            level=0,
            dependencies=[2]
        )
        
        claims = [claim1, claim2, claim3]
        levels = analyzer.calculate_claim_levels(claims)
        
        assert levels[1] == 0  # 独立权利要求
        assert levels[2] == 1  # 依赖于权利要求1
        assert levels[3] == 2  # 依赖于权利要求2


class TestVisualizationService:
    """测试可视化服务"""
    
    def test_generate_tree_data(self):
        """测试树图数据生成"""
        service = VisualizationService()
        
        # 创建测试数据
        claim1 = ClaimNode(
            id="claim_1",
            claim_number=1,
            claim_text="独立权利要求",
            claim_type=ClaimType.INDEPENDENT,
            level=0
        )
        
        claim2 = ClaimNode(
            id="claim_2",
            claim_number=2,
            claim_text="从属权利要求",
            claim_type=ClaimType.DEPENDENT,
            level=1,
            dependencies=[1]
        )
        
        tree_data = ClaimsTreeData(
            patent_number="CN123456789A",
            nodes=[claim1, claim2],
            links=[],
            root_nodes=["claim_1"]
        )
        
        options = VisualizationOptions(
            style=VisualizationStyle.TREE,
            width=800,
            height=600
        )
        
        result = service.generate_tree_data(tree_data, options)
        
        assert result["type"] == "tree"
        assert result["width"] == 800
        assert result["height"] == 600
        assert len(result["nodes"]) == 2
        assert result["nodes"][0]["id"] == "claim_1"
        assert result["nodes"][1]["id"] == "claim_2"
    
    def test_generate_network_data(self):
        """测试网络图数据生成"""
        service = VisualizationService()
        
        # 创建测试数据
        claim1 = ClaimNode(
            id="claim_1",
            claim_number=1,
            claim_text="独立权利要求",
            claim_type=ClaimType.INDEPENDENT,
            level=0
        )
        
        tree_data = ClaimsTreeData(
            patent_number="CN123456789A",
            nodes=[claim1],
            links=[],
            root_nodes=["claim_1"]
        )
        
        options = VisualizationOptions(
            style=VisualizationStyle.NETWORK,
            charge_strength=-300
        )
        
        result = service.generate_network_data(tree_data, options)
        
        assert result["type"] == "network"
        assert result["options"]["charge_strength"] == -300
        assert len(result["nodes"]) == 1
    
    def test_calculate_node_size(self):
        """测试节点大小计算"""
        service = VisualizationService()
        
        options = VisualizationOptions(node_size=10)
        
        # 独立权利要求应该更大
        independent_claim = ClaimNode(
            id="claim_1",
            claim_number=1,
            claim_text="独立权利要求",
            claim_type=ClaimType.INDEPENDENT,
            level=0
        )
        
        dependent_claim = ClaimNode(
            id="claim_2",
            claim_number=2,
            claim_text="从属权利要求",
            claim_type=ClaimType.DEPENDENT,
            level=1
        )
        
        independent_size = service._calculate_node_size(independent_claim, options)
        dependent_size = service._calculate_node_size(dependent_claim, options)
        
        assert independent_size > dependent_size
        assert independent_size == 15  # 10 * 1.5
        assert dependent_size == 10
    
    def test_get_node_color(self):
        """测试节点颜色获取"""
        service = VisualizationService()
        
        # 独立权利要求应该是红色
        independent_claim = ClaimNode(
            id="claim_1",
            claim_number=1,
            claim_text="独立权利要求",
            claim_type=ClaimType.INDEPENDENT,
            level=0
        )
        
        # 从属权利要求应该是蓝色系
        dependent_claim = ClaimNode(
            id="claim_2",
            claim_number=2,
            claim_text="从属权利要求",
            claim_type=ClaimType.DEPENDENT,
            level=1
        )
        
        independent_color = service._get_node_color(independent_claim)
        dependent_color = service._get_node_color(dependent_claim)
        
        assert independent_color == "#ff6b6b"
        assert dependent_color.startswith("#")  # 应该是蓝色系


if __name__ == '__main__':
    pytest.main([__file__])