"""
权利要求分类器实现

负责识别独立权利要求和从属权利要求，并提取引用关系。
"""

import re
from typing import List, Dict
from ..models import ClaimsClassifierInterface, ClaimInfo


class ClaimsClassifier(ClaimsClassifierInterface):
    """权利要求分类器"""
    
    def __init__(self):
        """初始化权利要求分类器"""
        # 不同语言的引用关键词
        self.reference_keywords = {
            'zh': [
                '权利要求', '如权利要求', '根据权利要求', '按照权利要求',
                '依据权利要求', '基于权利要求', '所述权利要求'
            ],
            'en': [
                'claim', 'claims', 'according to claim', 'as claimed in',
                'as defined in claim', 'of claim', 'in claim'
            ],
            'other': ['claim', 'claims']
        }
        
        # 编译正则表达式模式
        self._compile_patterns()
    
    def _compile_patterns(self):
        """编译正则表达式模式"""
        self.reference_patterns = {}
        
        for language, keywords in self.reference_keywords.items():
            patterns = []
            for keyword in keywords:
                # 匹配"权利要求1"、"claim 1"等格式
                pattern = rf'{re.escape(keyword)}\s*(\d+(?:\s*[-~至到]\s*\d+)?(?:\s*[,，]\s*\d+)*)'
                patterns.append(re.compile(pattern, re.IGNORECASE))
            self.reference_patterns[language] = patterns
    
    def classify_claim_type(self, claim_text: str, language: str) -> str:
        """
        分类权利要求类型
        
        Args:
            claim_text: 权利要求文本
            language: 语言类型
            
        Returns:
            权利要求类型 ('independent' 或 'dependent')
        """
        if not claim_text or not claim_text.strip():
            return 'independent'
        
        # 检查是否包含引用关键词
        referenced_claims = self.extract_referenced_claims(claim_text, language)
        
        if referenced_claims:
            return 'dependent'
        else:
            return 'independent'
    
    def extract_referenced_claims(self, claim_text: str, language: str) -> List[int]:
        """
        提取引用的权利要求序号
        
        Args:
            claim_text: 权利要求文本
            language: 语言类型
            
        Returns:
            引用的权利要求序号列表
        """
        if not claim_text or not claim_text.strip():
            return []
        
        referenced_claims = set()
        
        # 获取对应语言的模式，如果没有则使用通用模式
        patterns = self.reference_patterns.get(language, self.reference_patterns.get('other', []))
        
        for pattern in patterns:
            matches = pattern.findall(claim_text)
            for match in matches:
                # 解析序号字符串，支持范围和列表格式
                numbers = self._parse_claim_numbers(match)
                referenced_claims.update(numbers)
        
        return sorted(list(referenced_claims))
    
    def _parse_claim_numbers(self, number_string: str) -> List[int]:
        """
        解析权利要求序号字符串
        
        Args:
            number_string: 序号字符串，如"1-3,5"
            
        Returns:
            序号列表
        """
        numbers = []
        
        # 分割逗号分隔的部分
        parts = re.split(r'[,，]', number_string)
        
        for part in parts:
            part = part.strip()
            
            # 检查是否为范围格式（如"1-3"、"1至3"）
            range_match = re.search(r'(\d+)\s*[-~至到]\s*(\d+)', part)
            if range_match:
                start = int(range_match.group(1))
                end = int(range_match.group(2))
                numbers.extend(range(start, end + 1))
            else:
                # 单个数字
                digit_match = re.search(r'\d+', part)
                if digit_match:
                    numbers.append(int(digit_match.group()))
        
        return numbers
    
    def get_reference_keywords(self, language: str) -> List[str]:
        """
        获取指定语言的引用关键词
        
        Args:
            language: 语言类型
            
        Returns:
            关键词列表
        """
        return self.reference_keywords.get(language, self.reference_keywords.get('other', []))
    
    def validate_claim_dependencies(self, claims: Dict[int, ClaimInfo]) -> List[str]:
        """
        验证权利要求依赖关系
        
        Args:
            claims: 权利要求字典
            
        Returns:
            验证错误信息列表
        """
        errors = []
        
        for claim_number, claim_info in claims.items():
            if claim_info.claim_type == 'dependent':
                # 检查引用的权利要求是否存在
                for ref_number in claim_info.referenced_claims:
                    if ref_number not in claims:
                        errors.append(f"权利要求{claim_number}引用了不存在的权利要求{ref_number}")
                    elif ref_number >= claim_number:
                        errors.append(f"权利要求{claim_number}引用了后续的权利要求{ref_number}")
                
                # 检查是否存在循环引用
                if self._has_circular_reference(claims, claim_number, set()):
                    errors.append(f"权利要求{claim_number}存在循环引用")
        
        return errors
    
    def _has_circular_reference(self, claims: Dict[int, ClaimInfo], 
                              claim_number: int, visited: set) -> bool:
        """
        检查是否存在循环引用
        
        Args:
            claims: 权利要求字典
            claim_number: 当前检查的权利要求序号
            visited: 已访问的权利要求序号集合
            
        Returns:
            是否存在循环引用
        """
        if claim_number in visited:
            return True
        
        if claim_number not in claims:
            return False
        
        claim_info = claims[claim_number]
        if claim_info.claim_type == 'independent':
            return False
        
        visited.add(claim_number)
        
        for ref_number in claim_info.referenced_claims:
            if self._has_circular_reference(claims, ref_number, visited.copy()):
                return True
        
        return False
    
    def analyze_claim_structure(self, claims: Dict[int, ClaimInfo]) -> Dict[str, any]:
        """
        分析权利要求结构
        
        Args:
            claims: 权利要求字典
            
        Returns:
            结构分析结果
        """
        independent_claims = []
        dependent_claims = []
        dependency_tree = {}
        
        for claim_number, claim_info in claims.items():
            if claim_info.claim_type == 'independent':
                independent_claims.append(claim_number)
            else:
                dependent_claims.append(claim_number)
                dependency_tree[claim_number] = claim_info.referenced_claims
        
        return {
            'total_claims': len(claims),
            'independent_count': len(independent_claims),
            'dependent_count': len(dependent_claims),
            'independent_claims': sorted(independent_claims),
            'dependent_claims': sorted(dependent_claims),
            'dependency_tree': dependency_tree
        }