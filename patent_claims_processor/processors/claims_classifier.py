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
                '依据权利要求', '基于权利要求', '所述权利要求',
                '前述权利要求', '上述权利要求', '任一权利要求', '任意权利要求',
                '之一所述权利要求', '所述的任一权利要求'
            ],
            'en': [
                'claim', 'claims', 'according to claim', 'as claimed in',
                'as defined in claim', 'of claim', 'in claim'
            ],
            'de': [
                'anspruch', 'ansprüche', 'anspruchs', 'gemäß anspruch',
                'wie in anspruch', 'definiert in anspruch', 'von anspruch', 'in anspruch'
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
                # 匹配"权利要求1"、"claim 1"、"claims 1 to 10"等格式
                pattern = rf'{re.escape(keyword)}\s*((?:\d+\s*[-~至到to]\s*\d+)|\d+)(?:\s*[,，]\s*(?:\d+\s*[-~至到to]\s*\d+|\d+))*'
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
        
        # 特殊处理：如果引用列表只包含'all'，且文本开头是权利要求序号格式
        # 则可能是独立权利要求被错误分类
        if referenced_claims == ['all']:
            # 检查文本开头是否是权利要求序号格式
            import re
            # 匹配各种权利要求序号格式
            number_patterns = [
                r'^\s*\d+\s*[\.、\)\:]\s*',  # 数字+标点
                r'^\s*claim\s+\d+\s*[\.\:]\s*',  # claim 1:
                r'^\s*anspruch\s+\d+\s*[\.\:]\s*',  # Anspruch 1:
                r'^\s*权利要求\s*\d+\s*[\.\:]\s*',  # 权利要求1:
            ]
            
            for pattern in number_patterns:
                if re.search(pattern, claim_text, re.IGNORECASE):
                    # 这可能是独立权利要求
                    return 'independent'
        
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
        
        # 首先跳过权利要求序号部分
        import re
        
        # 匹配各种权利要求序号格式
        number_patterns = [
            r'^\s*\d+\s*[\.、\)\:]*',  # 数字+标点
            r'^\s*claim\s+\d+\s*[\.\:]\s*',  # claim 1:
            r'^\s*claims\s+\d+\s*[\.\:]\s*',  # claims 1:
            r'^\s*anspruch\s+\d+\s*[\.\:]\s*',  # Anspruch 1:
            r'^\s*ansprüche\s+\d+\s*[\.\:]\s*',  # Ansprüche 1:
            r'^\s*权利要求\s*\d+\s*[\.\:]\s*',  # 权利要求1:
        ]
        
        # 移除开头的权利要求序号
        cleaned_text = claim_text
        for pattern in number_patterns:
            match = re.search(pattern, cleaned_text, re.IGNORECASE)
            if match:
                cleaned_text = cleaned_text[match.end():]
                break
        
        referenced_claims = set()
        has_reference_keywords = False
        
        # 获取对应语言的模式，如果没有则使用通用模式
        patterns = self.reference_patterns.get(language, self.reference_patterns.get('other', []))
        
        # 首先使用正则表达式模式匹配
        for pattern in patterns:
            matches = pattern.findall(cleaned_text)
            if matches:
                has_reference_keywords = True
                for match in matches:
                    # 预处理：将"to"替换为"-"以便_parse_claim_numbers能正确处理
                    processed_match = re.sub(r'\s*to\s*', '-', match, flags=re.IGNORECASE)
                    # 解析序号字符串，支持范围和列表格式
                    numbers = self._parse_claim_numbers(processed_match)
                    referenced_claims.update(numbers)
        
        # 专门处理"claims 1 to 10"格式 - 无论是否已经找到引用
        if language in ['en', 'other']:
            # 匹配"claims 1 to 10"、"claim 1 to 3"等格式
            to_pattern = re.search(r'claim[s]?\s+(\d+)\s+to\s+(\d+)', cleaned_text, re.IGNORECASE)
            if to_pattern:
                start = int(to_pattern.group(1))
                end = int(to_pattern.group(2))
                referenced_claims.update(range(start, end + 1))
                has_reference_keywords = True

        # 专门处理德语"Anspruch 1 bis 3"格式
        if language in ['de', 'other']:
            # 匹配"Anspruch 1 bis 3"、"Ansprüche 1 bis 10"等格式
            bis_pattern = re.search(r'anspruch[s]?\s+(\d+)\s+bis\s+(\d+)', cleaned_text, re.IGNORECASE)
            if bis_pattern:
                start = int(bis_pattern.group(1))
                end = int(bis_pattern.group(2))
                referenced_claims.update(range(start, end + 1))
                has_reference_keywords = True

        # 专门处理"claim 1 or 2"、"claim 1 und 2"等格式
        if language in ['en', 'de', 'other']:
            # 英文和通用情况：匹配"claim 1 or 2"、"claim 1 or 2 or 3"等格式
            or_und_pattern = re.search(r'claim[s]?\s+(\d+(?:\s*(?:or|und)\s*\d+)+)', cleaned_text, re.IGNORECASE)
            if or_und_pattern:
                numbers_str = or_und_pattern.group(1)
                # 分割并提取所有数字
                numbers = re.findall(r'\d+', numbers_str)
                for num_str in numbers:
                    referenced_claims.add(int(num_str))
                has_reference_keywords = True

        # 专门处理德语"Anspruch 1 und 2"等格式
        if language in ['de', 'other']:
            # 德语情况：匹配"Anspruch 1 und 2"、"Anspruch 1 und 2 und 3"等格式
            anspruch_pattern = re.search(r'anspruch[s]?\s+(\d+(?:\s*(?:und|oder)\s*\d+)+)', cleaned_text, re.IGNORECASE)
            if anspruch_pattern:
                numbers_str = anspruch_pattern.group(1)
                # 分割并提取所有数字
                numbers = re.findall(r'\d+', numbers_str)
                for num_str in numbers:
                    referenced_claims.add(int(num_str))
                has_reference_keywords = True

        # 专门处理中文"权利要求1或2"格式
        if language in ['zh', 'other']:
            # 匹配"权利要求1或2"、"权利要求1或2或3"等格式
            chinese_or_pattern = re.search(r'权利要求\s*(\d+(?:\s*或\s*\d+)+)', cleaned_text, re.IGNORECASE)
            if chinese_or_pattern:
                numbers_str = chinese_or_pattern.group(1)
                # 分割并提取所有数字
                numbers = re.findall(r'\d+', numbers_str)
                for num_str in numbers:
                    referenced_claims.add(int(num_str))
                has_reference_keywords = True
        
        # 专门处理多个范围的情况，如"claims 1 to 3 and 5 to 7"
        if language in ['en', 'other']:
            # 匹配多个范围格式："claims 1 to 3 and 5 to 7"
            multiple_range_pattern = re.search(r'claim[s]?\s+((?:\d+\s*to\s*\d+)(?:\s*and\s*(?:\d+\s*to\s*\d+|\d+))*)', cleaned_text, re.IGNORECASE)
            if multiple_range_pattern:
                ranges_str = multiple_range_pattern.group(1)
                # 处理多个范围
                range_parts = re.split(r'\s*and\s*', ranges_str)
                for part in range_parts:
                    # 检查是否为范围
                    range_match = re.search(r'(\d+)\s*to\s*(\d+)', part, re.IGNORECASE)
                    if range_match:
                        start = int(range_match.group(1))
                        end = int(range_match.group(2))
                        referenced_claims.update(range(start, end + 1))
                    else:
                        # 单个数字
                        digit_match = re.search(r'\d+', part)
                        if digit_match:
                            referenced_claims.add(int(digit_match.group()))
                has_reference_keywords = True
        
        # 专门处理德语多个范围的情况，如"Anspruch 1 bis 3 und 5 bis 7"
        if language in ['de', 'other']:
            # 匹配多个范围格式："Anspruch 1 bis 3 und 5 bis 7"
            multiple_range_pattern = re.search(r'anspruch[s]?\s+((?:\d+\s*bis\s*\d+)(?:\s*und\s*(?:\d+\s*bis\s*\d+|\d+))*)', cleaned_text, re.IGNORECASE)
            if multiple_range_pattern:
                ranges_str = multiple_range_pattern.group(1)
                # 处理多个范围
                range_parts = re.split(r'\s*und\s*', ranges_str)
                for part in range_parts:
                    # 检查是否为范围
                    range_match = re.search(r'(\d+)\s*bis\s*(\d+)', part, re.IGNORECASE)
                    if range_match:
                        start = int(range_match.group(1))
                        end = int(range_match.group(2))
                        referenced_claims.update(range(start, end + 1))
                    else:
                        # 单个数字
                        digit_match = re.search(r'\d+', part)
                        if digit_match:
                            referenced_claims.add(int(digit_match.group()))
                has_reference_keywords = True
        
        # 专门处理中文多个范围的情况，如"权利要求1至3和5至7"
        if language in ['zh', 'other']:
            # 匹配多个范围格式："权利要求1至3和5至7"
            multiple_range_pattern = re.search(r'权利要求\s*((?:\d+\s*(?:至|到)\s*\d+)(?:\s*和\s*(?:\d+\s*(?:至|到)\s*\d+|\d+))*)', cleaned_text, re.IGNORECASE)
            if multiple_range_pattern:
                ranges_str = multiple_range_pattern.group(1)
                # 处理多个范围
                range_parts = re.split(r'\s*和\s*', ranges_str)
                for part in range_parts:
                    # 检查是否为范围
                    range_match = re.search(r'(\d+)\s*(?:至|到)\s*(\d+)', part, re.IGNORECASE)
                    if range_match:
                        start = int(range_match.group(1))
                        end = int(range_match.group(2))
                        referenced_claims.update(range(start, end + 1))
                    else:
                        # 单个数字
                        digit_match = re.search(r'\d+', part)
                        if digit_match:
                            referenced_claims.add(int(digit_match.group()))
                has_reference_keywords = True
        
        # 检查是否包含引用关键词但没有找到数字
        if has_reference_keywords and not referenced_claims:
            # 检查是否有单独的引用关键词出现（如"权利要求"、"claims"）
            keywords = self.reference_keywords.get(language, self.reference_keywords.get('other', []))
            for keyword in keywords:
                # 找到关键词在文本中的位置
                keyword_matches = list(re.finditer(rf'{re.escape(keyword)}', cleaned_text, re.IGNORECASE))
                for match in keyword_matches:
                    # 提取关键词前后的文本（各三个单词）
                    keyword_start = match.start()
                    keyword_end = match.end()
                    
                    # 提取关键词前后的文本
                    text_before = cleaned_text[:keyword_start]
                    text_after = cleaned_text[keyword_end:]
                    
                    # 分词并检查是否有数字
                    words_before = text_before.split()[-3:]  # 前三个单词
                    words_after = text_after.split()[:3]   # 后三个单词
                    
                    # 检查周边单词是否包含数字
                    has_number_nearby = False
                    all_surrounding_words = words_before + words_after
                    
                    for word in all_surrounding_words:
                        if any(char.isdigit() for char in word):
                            has_number_nearby = True
                            break
                    
                    # 如果周边三个单词以内没有数字，则默认引用全部
                    if not has_number_nearby:
                        return ['all']
        
        # 额外检查：直接检查文本中是否包含引用关键词，即使正则表达式没有匹配
        # 这是为了处理只有关键词而没有数字的情况
        if not has_reference_keywords:
            keywords = self.reference_keywords.get(language, self.reference_keywords.get('other', []))
            for keyword in keywords:
                if re.search(rf'{re.escape(keyword)}', cleaned_text, re.IGNORECASE):
                    # 检查关键词周边是否有数字
                    keyword_matches = list(re.finditer(rf'{re.escape(keyword)}', cleaned_text, re.IGNORECASE))
                    for match in keyword_matches:
                        keyword_start = match.start()
                        keyword_end = match.end()
                        
                        text_before = cleaned_text[:keyword_start]
                        text_after = cleaned_text[keyword_end:]
                        
                        words_before = text_before.split()[-3:]
                        words_after = text_after.split()[:3]
                        
                        has_number_nearby = False
                        all_surrounding_words = words_before + words_after
                        
                        for word in all_surrounding_words:
                            if any(char.isdigit() for char in word):
                                has_number_nearby = True
                                break
                        
                        if not has_number_nearby:
                            return ['all']
        
        # 特殊检查：如果文本中包含"claims"相关短语，即使没有找到具体序号，也应识别为从权
        if not has_reference_keywords:
            # 检查是否包含"claims"、"preceding claims"等相关短语
            if re.search(r'claims', cleaned_text, re.IGNORECASE):
                return ['all']
            # 检查是否包含"anspruch"等德语相关短语
            elif re.search(r'anspruch', cleaned_text, re.IGNORECASE):
                return ['all']
        
        return sorted(list(referenced_claims))
    
    def _parse_claim_numbers(self, number_string: str) -> List[int]:
        """
        解析权利要求序号字符串

        Args:
            number_string: 序号字符串，如"1-3,5"、"1 to 10"、"1 or 2"、"1 und 2"、"1 to 3 and 5"

        Returns:
            序号列表
        """
        numbers = []

        # 处理连接词：将"or"、"und"、"and"、"bis"、"或"替换为逗号，以便后续处理
        processed_string = re.sub(r'\s*(?:or|und|and|bis|或)\s*', ',', number_string, flags=re.IGNORECASE)

        # 分割逗号分隔的部分
        parts = re.split(r'[,，]', processed_string)

        for part in parts:
            part = part.strip()

            # 检查是否为范围格式（如"1-3"、"1至3"、"1 to 10"、"1 bis 3"）
            # 匹配包含"to"、"至"、"到"、"bis"作为单词的范围格式
            range_match = re.search(r'(\d+)\s*(?:[-~至到]|to|bis)\s*(\d+)', part, re.IGNORECASE)
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