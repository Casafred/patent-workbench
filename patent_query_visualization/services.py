"""
专利查询可视化功能的业务逻辑服务

实现专利搜索、权利要求依赖关系分析和可视化数据生成等核心业务逻辑。
"""

import re
import logging
from typing import List, Optional, Dict, Any, Tuple
from .models import (
    PatentSearchServiceInterface,
    ClaimsDependencyAnalyzerInterface,
    VisualizationServiceInterface,
    PatentSearchResult,
    PatentDetails,
    ClaimNode,
    ClaimsTreeData,
    ClaimLink,
    VisualizationOptions,
    VisualizationStyle,
    ClaimType,
    PatentQueryError
)
from .database import PatentDataStorage

logger = logging.getLogger(__name__)


class PatentSearchService(PatentSearchServiceInterface):
    """专利搜索服务实现"""
    
    def __init__(self):
        self.storage = PatentDataStorage()
    
    def fuzzy_search(self, query: str, limit: int = 10) -> List[PatentSearchResult]:
        """模糊搜索专利号"""
        try:
            # 使用存储层的搜索功能
            results = self.storage.search_patents(query, limit)
            
            # 按匹配分数排序
            results.sort(key=lambda x: x.match_score, reverse=True)
            
            logger.info(f"模糊搜索 '{query}' 返回 {len(results)} 个结果")
            return results
            
        except Exception as e:
            logger.error(f"模糊搜索失败: {e}")
            raise PatentQueryError(f"搜索失败: {str(e)}")
    
    def exact_search(self, patent_number: str) -> Optional[PatentDetails]:
        """精确搜索专利详情"""
        try:
            # 清理专利号格式
            clean_patent_number = self._clean_patent_number(patent_number)
            
            # 从存储层获取专利详情
            patent = self.storage.get_patent_data(clean_patent_number)
            
            if patent:
                logger.info(f"精确搜索找到专利: {clean_patent_number}")
            else:
                logger.info(f"精确搜索未找到专利: {clean_patent_number}")
            
            return patent
            
        except Exception as e:
            logger.error(f"精确搜索失败: {e}")
            raise PatentQueryError(f"精确搜索失败: {str(e)}")
    
    def search_by_partial_number(self, partial_number: str, limit: int = 10) -> List[PatentSearchResult]:
        """根据部分专利号搜索"""
        try:
            # 构建模糊搜索查询
            query = f"%{partial_number}%"
            
            # 使用模糊搜索
            results = self.fuzzy_search(partial_number, limit)
            
            # 过滤结果，只保留专利号匹配的
            filtered_results = []
            for result in results:
                if partial_number.lower() in result.patent_number.lower():
                    # 提高专利号匹配的分数
                    result.match_score = min(result.match_score + 0.2, 1.0)
                    filtered_results.append(result)
            
            logger.info(f"部分专利号搜索 '{partial_number}' 返回 {len(filtered_results)} 个结果")
            return filtered_results
            
        except Exception as e:
            logger.error(f"部分专利号搜索失败: {e}")
            raise PatentQueryError(f"部分专利号搜索失败: {str(e)}")
    
    def get_patent_claims(self, patent_number: str) -> List[ClaimNode]:
        """获取专利权利要求"""
        try:
            patent = self.exact_search(patent_number)
            if patent:
                return patent.claims
            return []
            
        except Exception as e:
            logger.error(f"获取专利权利要求失败: {e}")
            raise PatentQueryError(f"获取专利权利要求失败: {str(e)}")
    
    def _clean_patent_number(self, patent_number: str) -> str:
        """清理专利号格式"""
        # 移除空格和特殊字符
        cleaned = re.sub(r'[^\w\d]', '', patent_number.strip())
        return cleaned.upper()


class ClaimsDependencyAnalyzer(ClaimsDependencyAnalyzerInterface):
    """权利要求依赖关系分析器实现"""
    
    def __init__(self):
        # 中文引用关键词
        self.zh_reference_keywords = [
            r'根据权利要求\s*(\d+(?:\s*[-~至或]\s*\d+)*(?:\s*[,，]\s*\d+(?:\s*[-~至或]\s*\d+)*)*)\s*所述',
            r'如权利要求\s*(\d+(?:\s*[-~至或]\s*\d+)*(?:\s*[,，]\s*\d+(?:\s*[-~至或]\s*\d+)*)*)\s*所述',
            r'按照权利要求\s*(\d+(?:\s*[-~至或]\s*\d+)*(?:\s*[,，]\s*\d+(?:\s*[-~至或]\s*\d+)*)*)\s*所述',
            r'依据权利要求\s*(\d+(?:\s*[-~至或]\s*\d+)*(?:\s*[,，]\s*\d+(?:\s*[-~至或]\s*\d+)*)*)\s*所述'
        ]
        
        # 英文引用关键词
        self.en_reference_keywords = [
            r'according\s+to\s+claim\s*(\d+(?:\s*(?:[-~]|to)\s*\d+)*(?:\s*[,]\s*\d+(?:\s*(?:[-~]|to)\s*\d+)*)*)',
            r'as\s+claimed\s+in\s+claim\s*(\d+(?:\s*(?:[-~]|to)\s*\d+)*(?:\s*[,]\s*\d+(?:\s*(?:[-~]|to)\s*\d+)*)*)',
            r'of\s+claim\s*(\d+(?:\s*(?:[-~]|to)\s*\d+)*(?:\s*[,]\s*\d+(?:\s*(?:[-~]|to)\s*\d+)*)*)',
            r'in\s+claim\s*(\d+(?:\s*(?:[-~]|to)\s*\d+)*(?:\s*[,]\s*\d+(?:\s*(?:[-~]|to)\s*\d+)*)*)'
        ]
    
    def analyze_dependencies(self, claims: List[ClaimNode]) -> ClaimsTreeData:
        """分析权利要求依赖关系"""
        try:
            # 首先解析所有权利要求的引用关系
            for claim in claims:
                if claim.claim_type == ClaimType.DEPENDENT:
                    references = self.parse_claim_references(claim.claim_text, claim.language)
                    claim.dependencies = references
            
            # 构建依赖关系树
            tree_data = self.build_dependency_tree(claims)
            
            # 计算权利要求层级
            levels = self.calculate_claim_levels(claims)
            for claim in claims:
                claim.level = levels.get(claim.claim_number, 0)
            
            logger.info(f"分析了 {len(claims)} 个权利要求的依赖关系")
            return tree_data
            
        except Exception as e:
            logger.error(f"分析权利要求依赖关系失败: {e}")
            raise PatentQueryError(f"分析权利要求依赖关系失败: {str(e)}")
    
    def parse_claim_references(self, claim_text: str, language: str = "zh") -> List[int]:
        """解析权利要求引用"""
        references = []
        
        try:
            # 根据语言选择关键词
            if language == "zh":
                keywords = self.zh_reference_keywords
            else:
                keywords = self.en_reference_keywords
            
            # 使用正则表达式匹配引用
            for pattern in keywords:
                matches = re.finditer(pattern, claim_text, re.IGNORECASE)
                for match in matches:
                    ref_text = match.group(1)
                    refs = self._parse_reference_numbers(ref_text)
                    references.extend(refs)
            
            # 去重并排序
            references = sorted(list(set(references)))
            
            logger.debug(f"从权利要求文本中解析出引用: {references}")
            return references
            
        except Exception as e:
            logger.error(f"解析权利要求引用失败: {e}")
            return []
    
    def build_dependency_tree(self, claims: List[ClaimNode]) -> ClaimsTreeData:
        """构建依赖关系树"""
        try:
            # 创建节点映射
            claim_map = {claim.claim_number: claim for claim in claims}
            
            # 构建连接关系
            links = []
            root_nodes = []
            
            for claim in claims:
                if claim.claim_type == ClaimType.INDEPENDENT:
                    root_nodes.append(claim.id)
                else:
                    # 为从属权利要求创建连接
                    for dep_num in claim.dependencies:
                        if dep_num in claim_map:
                            dep_claim = claim_map[dep_num]
                            link = ClaimLink(
                                source=dep_claim.id,
                                target=claim.id,
                                type="dependency"
                            )
                            links.append(link)
                            
                            # 更新父节点的子节点列表
                            if claim.id not in dep_claim.children:
                                dep_claim.children.append(claim.id)
            
            # 创建树数据结构
            tree_data = ClaimsTreeData(
                patent_number="",  # 将在调用时设置
                nodes=claims,
                links=links,
                root_nodes=root_nodes
            )
            
            logger.info(f"构建了包含 {len(claims)} 个节点和 {len(links)} 个连接的依赖关系树")
            return tree_data
            
        except Exception as e:
            logger.error(f"构建依赖关系树失败: {e}")
            raise PatentQueryError(f"构建依赖关系树失败: {str(e)}")
    
    def calculate_claim_levels(self, claims: List[ClaimNode]) -> Dict[int, int]:
        """计算权利要求层级"""
        levels = {}
        
        try:
            # 创建节点映射
            claim_map = {claim.claim_number: claim for claim in claims}
            
            # 初始化独立权利要求为0级
            for claim in claims:
                if claim.claim_type == ClaimType.INDEPENDENT:
                    levels[claim.claim_number] = 0
            
            # 使用广度优先搜索计算层级
            changed = True
            max_iterations = len(claims)  # 防止无限循环
            iteration = 0
            
            while changed and iteration < max_iterations:
                changed = False
                iteration += 1
                
                for claim in claims:
                    if claim.claim_type == ClaimType.DEPENDENT:
                        if claim.claim_number not in levels:
                            # 计算当前权利要求的层级
                            max_dep_level = -1
                            all_deps_resolved = True
                            
                            for dep_num in claim.dependencies:
                                if dep_num in levels:
                                    max_dep_level = max(max_dep_level, levels[dep_num])
                                else:
                                    all_deps_resolved = False
                                    break
                            
                            if all_deps_resolved and max_dep_level >= 0:
                                levels[claim.claim_number] = max_dep_level + 1
                                changed = True
            
            logger.debug(f"计算了 {len(levels)} 个权利要求的层级")
            return levels
            
        except Exception as e:
            logger.error(f"计算权利要求层级失败: {e}")
            return {}
    
    def _parse_reference_numbers(self, ref_text: str) -> List[int]:
        """解析引用数字"""
        numbers = []
        
        # 处理"或"连接的数字
        if '或' in ref_text:
            parts = ref_text.split('或')
            for part in parts:
                part = part.strip()
                if part.isdigit():
                    numbers.append(int(part))
                else:
                    # 处理范围
                    range_nums = self._parse_range(part)
                    numbers.extend(range_nums)
            return numbers
        
        # 处理范围表示（如"1-3"、"1至3"、"1~3"、"1 to 3"）
        range_patterns = [
            r'(\d+)\s*[-~至to]\s*(\d+)',
            r'(\d+)\s*-\s*(\d+)',
            r'(\d+)\s*~\s*(\d+)',
            r'(\d+)\s*至\s*(\d+)',
            r'(\d+)\s*to\s*(\d+)'
        ]
        
        for pattern in range_patterns:
            matches = re.finditer(pattern, ref_text, re.IGNORECASE)
            for match in matches:
                start = int(match.group(1))
                end = int(match.group(2))
                numbers.extend(range(start, end + 1))
                # 移除已处理的范围
                ref_text = ref_text.replace(match.group(0), '')
        
        # 处理单独的数字
        single_numbers = re.findall(r'\d+', ref_text)
        numbers.extend([int(num) for num in single_numbers])
        
        return numbers
    
    def _parse_range(self, text: str) -> List[int]:
        """解析范围文本"""
        # 处理范围表示
        range_patterns = [
            r'(\d+)\s*[-~至to]\s*(\d+)',
            r'(\d+)\s*-\s*(\d+)',
            r'(\d+)\s*~\s*(\d+)',
            r'(\d+)\s*至\s*(\d+)',
            r'(\d+)\s*to\s*(\d+)'
        ]
        
        for pattern in range_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                start = int(match.group(1))
                end = int(match.group(2))
                return list(range(start, end + 1))
        
        # 如果不是范围，尝试解析单个数字
        if text.strip().isdigit():
            return [int(text.strip())]
        
        return []


class VisualizationService(VisualizationServiceInterface):
    """可视化服务实现"""
    
    def generate_tree_data(self, claims_tree: ClaimsTreeData, options: VisualizationOptions) -> Dict[str, Any]:
        """生成树图数据"""
        try:
            # 为D3.js树状图优化数据结构
            tree_data = {
                "type": "tree",
                "width": options.width,
                "height": options.height,
                "nodes": [],
                "links": [],
                "options": {
                    "node_size": options.node_size,
                    "link_distance": options.link_distance,
                    "show_labels": options.show_labels,
                    "enable_zoom": options.enable_zoom,
                    "enable_drag": options.enable_drag,
                    "animation_duration": options.animation_duration
                }
            }
            
            # 转换节点数据
            for node in claims_tree.nodes:
                tree_node = {
                    "id": node.id,
                    "claim_number": node.claim_number,
                    "claim_text": node.claim_text[:100] + "..." if len(node.claim_text) > 100 else node.claim_text,
                    "full_text": node.claim_text,
                    "claim_type": node.claim_type.value,
                    "level": node.level,
                    "dependencies": node.dependencies,
                    "children": node.children,
                    "confidence_score": node.confidence_score,
                    "language": node.language,
                    "size": self._calculate_node_size(node, options),
                    "color": self._get_node_color(node)
                }
                tree_data["nodes"].append(tree_node)
            
            # 转换连接数据
            for link in claims_tree.links:
                tree_link = {
                    "source": link.source,
                    "target": link.target,
                    "type": link.type,
                    "strength": link.strength
                }
                tree_data["links"].append(tree_link)
            
            tree_data["root_nodes"] = claims_tree.root_nodes
            tree_data["metadata"] = claims_tree.metadata
            
            logger.info(f"生成了树状图数据，包含 {len(tree_data['nodes'])} 个节点")
            return tree_data
            
        except Exception as e:
            logger.error(f"生成树图数据失败: {e}")
            raise PatentQueryError(f"生成树图数据失败: {str(e)}")
    
    def generate_network_data(self, claims_tree: ClaimsTreeData, options: VisualizationOptions) -> Dict[str, Any]:
        """生成网络图数据"""
        try:
            # 为D3.js力导向图优化数据结构
            network_data = {
                "type": "network",
                "width": options.width,
                "height": options.height,
                "nodes": [],
                "links": [],
                "options": {
                    "node_size": options.node_size,
                    "link_distance": options.link_distance,
                    "charge_strength": options.charge_strength,
                    "show_labels": options.show_labels,
                    "enable_zoom": options.enable_zoom,
                    "enable_drag": options.enable_drag,
                    "animation_duration": options.animation_duration
                }
            }
            
            # 转换节点数据
            for node in claims_tree.nodes:
                network_node = {
                    "id": node.id,
                    "claim_number": node.claim_number,
                    "claim_text": node.claim_text[:100] + "..." if len(node.claim_text) > 100 else node.claim_text,
                    "full_text": node.claim_text,
                    "claim_type": node.claim_type.value,
                    "level": node.level,
                    "dependencies": node.dependencies,
                    "children": node.children,
                    "confidence_score": node.confidence_score,
                    "language": node.language,
                    "size": self._calculate_node_size(node, options),
                    "color": self._get_node_color(node),
                    "group": node.level  # 用于网络图分组
                }
                network_data["nodes"].append(network_node)
            
            # 转换连接数据
            for link in claims_tree.links:
                network_link = {
                    "source": link.source,
                    "target": link.target,
                    "type": link.type,
                    "strength": link.strength,
                    "distance": options.link_distance
                }
                network_data["links"].append(network_link)
            
            network_data["root_nodes"] = claims_tree.root_nodes
            network_data["metadata"] = claims_tree.metadata
            
            logger.info(f"生成了网络图数据，包含 {len(network_data['nodes'])} 个节点")
            return network_data
            
        except Exception as e:
            logger.error(f"生成网络图数据失败: {e}")
            raise PatentQueryError(f"生成网络图数据失败: {str(e)}")
    
    def generate_radial_data(self, claims_tree: ClaimsTreeData, options: VisualizationOptions) -> Dict[str, Any]:
        """生成径向图数据"""
        try:
            # 为D3.js径向图优化数据结构
            radial_data = {
                "type": "radial",
                "width": options.width,
                "height": options.height,
                "nodes": [],
                "links": [],
                "options": {
                    "node_size": options.node_size,
                    "show_labels": options.show_labels,
                    "enable_zoom": options.enable_zoom,
                    "enable_drag": options.enable_drag,
                    "animation_duration": options.animation_duration,
                    "radius": min(options.width, options.height) / 2 - 50
                }
            }
            
            # 转换节点数据
            for node in claims_tree.nodes:
                radial_node = {
                    "id": node.id,
                    "claim_number": node.claim_number,
                    "claim_text": node.claim_text[:100] + "..." if len(node.claim_text) > 100 else node.claim_text,
                    "full_text": node.claim_text,
                    "claim_type": node.claim_type.value,
                    "level": node.level,
                    "dependencies": node.dependencies,
                    "children": node.children,
                    "confidence_score": node.confidence_score,
                    "language": node.language,
                    "size": self._calculate_node_size(node, options),
                    "color": self._get_node_color(node),
                    "depth": node.level  # 用于径向图层级
                }
                radial_data["nodes"].append(radial_node)
            
            # 转换连接数据
            for link in claims_tree.links:
                radial_link = {
                    "source": link.source,
                    "target": link.target,
                    "type": link.type,
                    "strength": link.strength
                }
                radial_data["links"].append(radial_link)
            
            radial_data["root_nodes"] = claims_tree.root_nodes
            radial_data["metadata"] = claims_tree.metadata
            
            logger.info(f"生成了径向图数据，包含 {len(radial_data['nodes'])} 个节点")
            return radial_data
            
        except Exception as e:
            logger.error(f"生成径向图数据失败: {e}")
            raise PatentQueryError(f"生成径向图数据失败: {str(e)}")
    
    def optimize_layout(self, data: Dict[str, Any], style: VisualizationStyle) -> Dict[str, Any]:
        """优化布局"""
        try:
            if style == VisualizationStyle.TREE:
                return self._optimize_tree_layout(data)
            elif style == VisualizationStyle.NETWORK:
                return self._optimize_network_layout(data)
            elif style == VisualizationStyle.RADIAL:
                return self._optimize_radial_layout(data)
            else:
                return data
                
        except Exception as e:
            logger.error(f"优化布局失败: {e}")
            return data
    
    def _calculate_node_size(self, node: ClaimNode, options: VisualizationOptions) -> int:
        """计算节点大小"""
        base_size = options.node_size
        
        # 根据权利要求类型调整大小
        if node.claim_type == ClaimType.INDEPENDENT:
            return int(base_size * 1.5)
        else:
            return base_size
    
    def _get_node_color(self, node: ClaimNode) -> str:
        """获取节点颜色"""
        if node.claim_type == ClaimType.INDEPENDENT:
            return "#ff6b6b"  # 红色表示独立权利要求
        else:
            # 根据层级使用不同的蓝色深度
            blue_values = ["#74b9ff", "#0984e3", "#2d3436", "#636e72"]
            level = min(node.level, len(blue_values) - 1)
            return blue_values[level]
    
    def _optimize_tree_layout(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """优化树状图布局"""
        # 可以在这里添加树状图特定的布局优化
        return data
    
    def _optimize_network_layout(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """优化网络图布局"""
        # 可以在这里添加网络图特定的布局优化
        return data
    
    def _optimize_radial_layout(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """优化径向图布局"""
        # 可以在这里添加径向图特定的布局优化
        return data