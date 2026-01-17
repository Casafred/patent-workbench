"""
权利要求解析器实现

负责从文本中提取权利要求序号和内容，支持多种序号格式和语言。
"""

import re
from typing import List, Dict, Tuple, Optional
from ..models import ClaimsParserInterface


class ClaimsParser(ClaimsParserInterface):
    """权利要求解析器"""
    
    def __init__(self):
        """初始化权利要求解析器"""
        # 权利要求序号的正则表达式模式 - 支持多语言和多种格式
        self.number_patterns = [
            # 中文格式 - 更精确的模式
            r'^\s*(\d+)\s*[\.、]\s*',           # 行首 "1." 或 "1、"
            r'^\s*(\d+)\s*\)\s*',               # 行首 "1)"
            r'^\s*(\d+)\s*：\s*',               # 行首 "1："
            r'^\s*第\s*(\d+)\s*项\s*',          # 行首 "第1项"
            r'^\s*第\s*(\d+)\s*条\s*',          # 行首 "第1条"
            r'^\s*权利要求\s*(\d+)\s*',         # 行首 "权利要求1"
            r'^\s*权项\s*(\d+)\s*',             # 行首 "权项1"
            
            # 英文格式 - 更精确的模式
            r'^\s*claim\s+(\d+)\s*',            # 行首 "claim 1"
            r'^\s*(\d+)\s*\.\s+',               # 行首 "1. " (必须有空格)
            r'^\s*(\d+)\s*\)\s+',               # 行首 "1) " (必须有空格)
            
            # 其他语言格式
            r'^\s*revendication\s+(\d+)\s*',    # 法语 "revendication 1"
            r'^\s*anspruch\s+(\d+)\s*',         # 德语 "anspruch 1"
            r'^\s*reivindicación\s+(\d+)\s*',   # 西班牙语 "reivindicación 1"
            r'^\s*rivendicazione\s+(\d+)\s*',   # 意大利语 "rivendicazione 1"
        ]
        
        # 编译正则表达式
        self.compiled_patterns = [re.compile(pattern, re.IGNORECASE | re.MULTILINE) for pattern in self.number_patterns]
        
        # 序号重启检测的阈值
        self.restart_threshold = 5  # 如果序号差异超过此值，可能是重启
    
    def extract_claim_numbers(self, text: str) -> List[int]:
        """
        提取权利要求序号
        
        Args:
            text: 权利要求文本
            
        Returns:
            序号列表，按在文本中出现的顺序排列（保留重复序号以检测语言版本）
        """
        if not text or not text.strip():
            return []
        
        # 存储找到的序号及其位置和匹配长度
        numbers_with_info = []
        
        # 使用所有模式尝试提取序号
        for pattern in self.compiled_patterns:
            matches = pattern.finditer(text)
            for match in matches:
                try:
                    number = int(match.group(1))
                    if 1 <= number <= 1000:  # 合理的权利要求序号范围
                        # 存储序号、位置和匹配长度，用于去重和排序
                        numbers_with_info.append({
                            'number': number,
                            'start': match.start(),
                            'end': match.end(),
                            'length': match.end() - match.start()
                        })
                except (ValueError, IndexError):
                    continue
        
        # 按位置排序
        numbers_with_info.sort(key=lambda x: x['start'])
        
        # 去重：如果多个匹配重叠，选择匹配长度最长的
        unique_numbers = []
        i = 0
        while i < len(numbers_with_info):
            current = numbers_with_info[i]
            overlapping = [current]
            
            # 找到所有重叠的匹配
            j = i + 1
            while j < len(numbers_with_info) and numbers_with_info[j]['start'] < current['end']:
                overlapping.append(numbers_with_info[j])
                j += 1
            
            # 选择匹配长度最长的
            best_match = max(overlapping, key=lambda x: x['length'])
            unique_numbers.append(best_match['number'])
            
            # 跳过所有重叠的匹配
            i = j
        
        return unique_numbers
    
    def split_claims_by_numbers(self, text: str) -> Dict[int, str]:
        """
        按序号分割权利要求文本，支持多语言版本（序号重启检测）
        
        Args:
            text: 完整的权利要求文本
            
        Returns:
            序号到文本的映射字典，对于重复序号，保留最完整的版本
        """
        if not text or not text.strip():
            return {}
        
        # 找到所有序号位置，包含匹配的模式信息
        number_positions = []
        
        for pattern in self.compiled_patterns:
            for match in pattern.finditer(text):
                try:
                    number = int(match.group(1))
                    if 1 <= number <= 1000:
                        # 存储开始位置、结束位置、序号和匹配的完整文本
                        number_positions.append({
                            'start': match.start(),
                            'end': match.end(),
                            'number': number,
                            'matched_text': match.group(0)
                        })
                except (ValueError, IndexError):
                    continue
        
        # 按位置排序并去重（同一位置可能有多个模式匹配）
        number_positions.sort(key=lambda x: x['start'])
        
        # 去重：如果多个模式匹配同一位置，选择匹配文本最长的
        unique_positions = []
        i = 0
        while i < len(number_positions):
            current = number_positions[i]
            # 检查是否有重叠的匹配
            overlapping = [current]
            j = i + 1
            while j < len(number_positions) and number_positions[j]['start'] < current['end']:
                overlapping.append(number_positions[j])
                j += 1
            
            # 选择匹配文本最长的
            best_match = max(overlapping, key=lambda x: len(x['matched_text']))
            unique_positions.append(best_match)
            i = j
        
        if not unique_positions:
            return {}
        
        # 检测语言版本边界（序号重启点）
        language_boundaries = self._detect_language_boundaries(unique_positions)
        
        # 按语言版本分组处理
        all_claims = {}
        
        for version_start, version_end in language_boundaries:
            version_positions = unique_positions[version_start:version_end]
            version_claims = self._extract_claims_from_positions(text, version_positions)
            
            # 合并到总的权利要求字典中
            # 对于重复的序号，选择来自更完整语言版本的权利要求
            for number, claim_text in version_claims.items():
                if number not in all_claims:
                    all_claims[number] = claim_text
                else:
                    # 如果序号已存在，比较两个版本的完整性
                    # 选择来自权利要求数量更多的语言版本
                    current_version_size = len(version_claims)
                    existing_version_size = self._estimate_version_size(all_claims, number)
                    
                    if current_version_size > existing_version_size:
                        all_claims[number] = claim_text
                    elif current_version_size == existing_version_size:
                        # 如果版本大小相同，选择文本更长的
                        if len(claim_text) > len(all_claims[number]):
                            all_claims[number] = claim_text
        
        return all_claims
    
    def _estimate_version_size(self, claims_dict: Dict[int, str], reference_number: int) -> int:
        """
        估算包含指定权利要求序号的语言版本的大小
        
        Args:
            claims_dict: 当前权利要求字典
            reference_number: 参考序号
            
        Returns:
            估算的版本大小
        """
        # 简单估算：假设每个语言版本都是连续的序号
        # 找到与reference_number相邻的序号数量
        adjacent_count = 1  # 至少包含reference_number本身
        
        # 向前查找连续序号
        current = reference_number - 1
        while current > 0 and current in claims_dict:
            adjacent_count += 1
            current -= 1
        
        # 向后查找连续序号
        current = reference_number + 1
        while current in claims_dict:
            adjacent_count += 1
            current += 1
        
        return adjacent_count
    
    def _detect_language_boundaries(self, positions: List[Dict]) -> List[Tuple[int, int]]:
        """
        检测语言版本边界
        
        Args:
            positions: 序号位置信息列表
            
        Returns:
            边界列表，每个元素为(开始索引, 结束索引)
        """
        if not positions:
            return []
        
        boundaries = []
        current_start = 0
        
        # 提取序号序列
        numbers = [pos['number'] for pos in positions]
        
        # 检测重启点
        for i in range(1, len(numbers)):
            current_num = numbers[i]
            previous_num = numbers[i - 1]
            
            # 检测序号重启的条件
            is_restart = False
            
            # 条件1: 当前序号为1，且前一个序号大于1
            if current_num == 1 and previous_num > 1:
                is_restart = True
            
            # 条件2: 序号大幅回退（差值>=5）
            elif current_num < previous_num and (previous_num - current_num) >= 5:
                is_restart = True
            
            # 条件3: 序号回退且前面有相对完整的序列
            elif current_num <= previous_num:
                # 检查前面是否有相对完整的序列
                prev_sequence = numbers[current_start:i]
                if self._is_complete_sequence(prev_sequence):
                    is_restart = True
            
            if is_restart:
                # 记录当前语言版本的边界
                boundaries.append((current_start, i))
                current_start = i
        
        # 添加最后一个语言版本
        boundaries.append((current_start, len(positions)))
        
        return boundaries
    
    def _is_complete_sequence(self, numbers: List[int]) -> bool:
        """
        判断序号序列是否相对完整
        
        Args:
            numbers: 序号列表
            
        Returns:
            是否为完整序列
        """
        if len(numbers) < 3:  # 至少需要3个序号
            return False
        
        unique_numbers = sorted(set(numbers))
        if not unique_numbers:
            return False
        
        # 检查是否从1开始
        if unique_numbers[0] != 1:
            return False
        
        # 计算连续性比例
        min_num = unique_numbers[0]
        max_num = unique_numbers[-1]
        expected_count = max_num - min_num + 1
        actual_count = len(unique_numbers)
        
        # 连续性超过70%且至少有3个序号，认为是完整序列
        continuity_ratio = actual_count / expected_count if expected_count > 0 else 0
        return continuity_ratio >= 0.7 and len(unique_numbers) >= 3
    
    def _extract_claims_from_positions(self, text: str, positions: List[Dict]) -> Dict[int, str]:
        """
        从位置信息中提取权利要求文本
        
        Args:
            text: 完整文本
            positions: 位置信息列表
            
        Returns:
            序号到文本的映射
        """
        claims = {}
        
        for i, pos_info in enumerate(positions):
            start_pos = pos_info['start']
            end_pos = pos_info['end']
            number = pos_info['number']
            
            # 确定当前权利要求的结束位置
            if i < len(positions) - 1:
                next_start = positions[i + 1]['start']
                claim_text = text[end_pos:next_start].strip()
            else:
                claim_text = text[end_pos:].strip()
            
            # 清理和验证文本
            if claim_text:
                # 移除可能的重复序号标记
                cleaned_text = self._clean_claim_text(claim_text)
                if cleaned_text:  # 确保清理后仍有内容
                    claims[number] = cleaned_text
        
        return claims
    
    def _clean_claim_text(self, text: str) -> str:
        """
        清理权利要求文本，移除重复的序号标记
        
        Args:
            text: 原始文本
            
        Returns:
            清理后的文本
        """
        if not text:
            return ""
        
        # 移除开头可能存在的序号标记
        cleaned = text.strip()
        
        # 尝试移除开头的序号模式
        for pattern in self.compiled_patterns:
            cleaned = pattern.sub('', cleaned, count=1).strip()
            if cleaned != text.strip():  # 如果有变化，说明移除了序号
                break
        
        return cleaned
    
    def detect_sequence_restart(self, claim_numbers: List[int]) -> List[int]:
        """
        检测序号重启点（新语言版本的开始）
        
        Args:
            claim_numbers: 权利要求序号列表（按在文本中出现的顺序）
            
        Returns:
            重启点序号列表
        """
        if not claim_numbers or len(claim_numbers) < 2:
            return []
        
        restart_points = []
        
        for i in range(1, len(claim_numbers)):
            current_num = claim_numbers[i]
            previous_num = claim_numbers[i - 1]
            
            # 检测重启的几种情况：
            # 1. 当前序号为1，且前一个序号大于1
            if current_num == 1 and previous_num > 1:
                restart_points.append(current_num)
            
            # 2. 序号大幅回退（可能是新语言版本）
            elif current_num < previous_num and (previous_num - current_num) >= self.restart_threshold:
                restart_points.append(current_num)
            
            # 3. 检查是否存在完整的序列后又重新开始
            elif current_num <= previous_num:
                # 检查前面是否有一个相对完整的序列
                if self._has_complete_sequence_before(claim_numbers, i):
                    restart_points.append(current_num)
        
        return restart_points
    
    def _has_complete_sequence_before(self, claim_numbers: List[int], index: int) -> bool:
        """
        检查指定位置之前是否有相对完整的序列
        
        Args:
            claim_numbers: 序号列表
            index: 检查位置
            
        Returns:
            是否有完整序列
        """
        if index < 3:  # 至少需要3个序号才能判断
            return False
        
        # 检查前面的序号是否形成相对连续的序列
        previous_numbers = claim_numbers[:index]
        if not previous_numbers:
            return False
        
        # 计算连续性比例
        min_num = min(previous_numbers)
        max_num = max(previous_numbers)
        expected_count = max_num - min_num + 1
        actual_count = len(set(previous_numbers))
        
        # 如果连续性超过70%，认为是完整序列
        continuity_ratio = actual_count / expected_count if expected_count > 0 else 0
        return continuity_ratio >= 0.7 and len(previous_numbers) >= 3
    
    def normalize_claim_text(self, text: str) -> str:
        """
        标准化权利要求文本
        
        Args:
            text: 原始权利要求文本
            
        Returns:
            标准化后的文本
        """
        if not text:
            return ""
        
        # 移除多余的空白字符
        normalized = re.sub(r'\s+', ' ', text.strip())
        
        # 移除序号前缀（如果存在）
        for pattern in self.number_patterns:
            # 只在文本开头移除序号模式
            pattern_obj = re.compile(f'^{pattern}', re.IGNORECASE)
            normalized = pattern_obj.sub('', normalized).strip()
        
        # 移除常见的格式字符
        normalized = re.sub(r'^[：:]\s*', '', normalized)  # 移除开头的冒号
        normalized = re.sub(r'^\s*[-–—]\s*', '', normalized)  # 移除开头的破折号
        
        # 确保文本以适当的标点结尾
        normalized = normalized.strip()
        if normalized and not normalized.endswith(('.', '。', ';', '；', ':', '：')):
            # 根据文本内容判断使用中文还是英文标点
            if self._contains_chinese(normalized):
                normalized += '。'
            else:
                normalized += '.'
        
        return normalized
    
    def _contains_chinese(self, text: str) -> bool:
        """
        检查文本是否包含中文字符
        
        Args:
            text: 待检查的文本
            
        Returns:
            是否包含中文字符
        """
        chinese_pattern = re.compile(r'[\u4e00-\u9fff]')
        return bool(chinese_pattern.search(text))
    
    def validate_claim_sequence(self, claim_numbers: List[int]) -> List[str]:
        """
        验证权利要求序号序列的完整性
        
        Args:
            claim_numbers: 权利要求序号列表
            
        Returns:
            验证错误信息列表
        """
        if not claim_numbers:
            return ["没有找到权利要求序号"]
        
        errors = []
        sorted_numbers = sorted(claim_numbers)
        
        # 检查是否从1开始
        if sorted_numbers[0] != 1:
            errors.append(f"权利要求序号不是从1开始，而是从{sorted_numbers[0]}开始")
        
        # 检查序号连续性
        for i in range(1, len(sorted_numbers)):
            if sorted_numbers[i] != sorted_numbers[i-1] + 1:
                missing_numbers = list(range(sorted_numbers[i-1] + 1, sorted_numbers[i]))
                if missing_numbers:
                    errors.append(f"缺少权利要求序号: {missing_numbers}")
        
        return errors
    
    def extract_claim_content(self, text: str, claim_number: int) -> str:
        """
        提取指定序号的权利要求内容
        
        Args:
            text: 完整文本
            claim_number: 权利要求序号
            
        Returns:
            权利要求内容
        """
        claims_dict = self.split_claims_by_numbers(text)
        return claims_dict.get(claim_number, "")
    
    def get_language_segments(self, text: str) -> List[Tuple[List[int], str]]:
        """
        根据序号重启检测分割不同语言版本的文本段
        
        Args:
            text: 完整的权利要求文本
            
        Returns:
            语言段列表，每个元素为(序号列表, 文本段)
        """
        if not text or not text.strip():
            return []
        
        claim_numbers = self.extract_claim_numbers(text)
        if not claim_numbers:
            return []
        
        restart_points = self.detect_sequence_restart(claim_numbers)
        
        # 如果没有重启点，整个文本是一个语言版本
        if not restart_points:
            return [(claim_numbers, text)]
        
        # 分割成不同的语言段
        segments = []
        current_start = 0
        
        for restart_point in restart_points:
            # 找到重启点在序号列表中的位置
            restart_index = claim_numbers.index(restart_point)
            
            # 提取当前段的序号
            segment_numbers = claim_numbers[current_start:restart_index]
            if segment_numbers:
                # 提取对应的文本段（这里简化处理，实际可能需要更复杂的文本分割）
                segments.append((segment_numbers, text))
            
            current_start = restart_index
        
        # 添加最后一段
        if current_start < len(claim_numbers):
            final_numbers = claim_numbers[current_start:]
            segments.append((final_numbers, text))
        
        return segments
    
    def analyze_claim_structure(self, text: str) -> Dict[str, any]:
        """
        分析权利要求文本的整体结构
        
        Args:
            text: 权利要求文本
            
        Returns:
            结构分析结果
        """
        if not text or not text.strip():
            return {
                'total_claims': 0,
                'claim_numbers': [],
                'missing_numbers': [],
                'restart_points': [],
                'language_segments': 0,
                'validation_errors': ['文本为空']
            }
        
        claim_numbers = self.extract_claim_numbers(text)
        restart_points = self.detect_sequence_restart(claim_numbers)
        validation_errors = self.validate_claim_sequence(claim_numbers)
        language_segments = self.get_language_segments(text)
        
        # 计算缺失的序号
        missing_numbers = []
        if claim_numbers:
            sorted_numbers = sorted(set(claim_numbers))
            for i in range(1, len(sorted_numbers)):
                expected = sorted_numbers[i-1] + 1
                actual = sorted_numbers[i]
                if actual > expected:
                    missing_numbers.extend(range(expected, actual))
        
        return {
            'total_claims': len(set(claim_numbers)),
            'claim_numbers': claim_numbers,
            'missing_numbers': missing_numbers,
            'restart_points': restart_points,
            'language_segments': len(language_segments),
            'validation_errors': validation_errors,
            'claims_dict': self.split_claims_by_numbers(text)
        }