"""
语言检测器实现

负责检测文本语言类型并选择优先语言版本。
"""

import re
from typing import List, Tuple
from langdetect import detect, LangDetectException
from ..models import LanguageDetectorInterface


class LanguageDetector(LanguageDetectorInterface):
    """语言检测器"""
    
    def __init__(self):
        """初始化语言检测器"""
        # 语言优先级：中文 > 英文 > 日语 > 其他语言
        self.language_priority = {
            'zh': 4,
            'zh-cn': 4,
            'zh-tw': 4,
            'ja': 3,  # 日语
            'en': 2,
            'other': 1
        }
        
        # 中文字符正则表达式（CJK统一汉字）
        self.chinese_pattern = re.compile(r'[\u4e00-\u9fff]+')
        
        # 日语特有字符正则表达式
        self.hiragana_pattern = re.compile(r'[\u3040-\u309f]+')  # 平假名
        self.katakana_pattern = re.compile(r'[\u30a0-\u30ff]+')  # 片假名
        
        # 英文字符正则表达式
        self.english_pattern = re.compile(r'[a-zA-Z]+')
    
    def detect_language(self, text: str) -> str:
        """
        检测文本语言类型
        
        Args:
            text: 待检测的文本
            
        Returns:
            语言代码 ('en', 'zh', 'ja', 'de', 'other')
        """
        if not text or not text.strip():
            return 'other'
        
        # 【关键修复】先检测日语特有字符（平假名和片假名）
        # 这是区分日语和中文的关键！
        hiragana_matches = self.hiragana_pattern.findall(text)
        hiragana_chars = sum(len(match) for match in hiragana_matches)
        
        katakana_matches = self.katakana_pattern.findall(text)
        katakana_chars = sum(len(match) for match in katakana_matches)
        
        japanese_kana_chars = hiragana_chars + katakana_chars
        
        # 统计汉字（中日共享）
        chinese_matches = self.chinese_pattern.findall(text)
        chinese_chars = sum(len(match) for match in chinese_matches)
        
        # 统计英文字符
        english_matches = self.english_pattern.findall(text)
        english_chars = sum(len(match) for match in english_matches)
        
        total_chars = len(text.replace(' ', '').replace('\n', '').replace('\t', ''))
        
        if total_chars == 0:
            return 'other'
        
        # 计算各类字符比例
        kana_ratio = japanese_kana_chars / total_chars if total_chars > 0 else 0
        kanji_ratio = chinese_chars / total_chars if total_chars > 0 else 0
        english_ratio = english_chars / total_chars if total_chars > 0 else 0
        
        # 【关键判断】如果包含假名（平假名或片假名），很可能是日语
        if kana_ratio > 0.05:  # 假名占比超过5%，判定为日语
            return 'ja'
        
        # 使用langdetect进行辅助检测
        try:
            clean_text = re.sub(r'[0-9\.\,\;\:\(\)\[\]\{\}]', ' ', text)
            clean_text = re.sub(r'\s+', ' ', clean_text).strip()
            
            if len(clean_text) > 10:
                detected_lang = detect(clean_text)
                
                # 如果langdetect检测为日语，直接返回
                if detected_lang == 'ja':
                    return 'ja'
                elif detected_lang in ['en']:
                    return 'en'
                elif detected_lang in ['zh-cn', 'zh-tw', 'zh']:
                    # 即使langdetect说是中文，也要验证是否有假名
                    if kana_ratio > 0.01:  # 有少量假名也判定为日语
                        return 'ja'
                    return 'zh'
                elif detected_lang in ['de']:
                    return 'de'
        except (LangDetectException, Exception):
            pass
        
        # 德语关键词检测
        german_keywords = ['anspruch', 'ansprüche', 'anspruchs', 'gemäß', 'dadurch', 'dadurch gekennzeichnet']
        german_pattern = re.compile('|'.join(german_keywords), re.IGNORECASE)
        has_german_keywords = bool(german_pattern.search(text))
        
        # 日语关键词检测（作为辅助判断）
        japanese_keywords = ['請求項', 'に記載', 'において', 'であって', 'することを特徴とする']
        japanese_pattern = re.compile('|'.join(japanese_keywords))
        has_japanese_keywords = bool(japanese_pattern.search(text))
        
        # 最终判断逻辑
        if has_japanese_keywords or (kana_ratio > 0.01 and kanji_ratio > 0.1):
            # 包含日语关键词，或有假名+汉字组合
            return 'ja'
        elif kanji_ratio > 0.1 and kana_ratio == 0:
            # 只有汉字没有假名，判定为中文
            return 'zh'
        elif english_ratio > 0.3:
            # 英文字符占比超过30%
            return 'en'
        elif has_german_keywords and english_ratio > 0.1:
            # 包含德语关键词且有一定英文字符
            return 'de'
        else:
            return 'other'
    
    def select_preferred_version(self, text_segments: List[str]) -> str:
        """
        从多个文本段中选择优先语言版本
        
        根据语言优先级选择：英文 > 中文 > 其他语言
        
        Args:
            text_segments: 文本段列表
            
        Returns:
            选中的文本段
        """
        if not text_segments:
            return ""
        
        if len(text_segments) == 1:
            return text_segments[0]
        
        # 为每个文本段检测语言并计算优先级分数
        segment_scores = []
        for segment in text_segments:
            language = self.detect_language(segment)
            priority_score = self.get_language_priority_score(language)
            
            # 额外考虑文本长度和质量
            text_length = len(segment.strip())
            quality_score = min(text_length / 100, 1.0)  # 长度质量分数，最大1.0
            
            # 检查是否包含权利要求序号（质量指标）
            has_numbers = bool(re.search(r'\d+\s*[\.、\)]\s*', segment))
            structure_score = 1.0 if has_numbers else 0.5
            
            total_score = priority_score + quality_score + structure_score
            segment_scores.append((segment, language, total_score))
        
        # 按总分排序，选择最高分的文本段
        segment_scores.sort(key=lambda x: x[2], reverse=True)
        return segment_scores[0][0]
    
    def identify_language_boundaries(self, text: str) -> List[Tuple[int, int, str]]:
        """
        识别文本中不同语言版本的边界
        
        通过序号连续性识别不同语言版本的边界
        
        Args:
            text: 完整文本
            
        Returns:
            边界信息列表 [(start_pos, end_pos, language), ...]
        """
        if not text or not text.strip():
            return []
        
        # 寻找权利要求序号模式
        # 支持多种格式：1. 1、 1) 1 等
        number_patterns = [
            r'(\d+)\s*\.\s*',      # "1. "
            r'(\d+)\s*、\s*',      # "1、"
            r'(\d+)\s*\)\s*',      # "1) "
            r'(\d+)\s+(?=[A-Za-z\u4e00-\u9fff])',  # "1 " 后跟字母或中文
        ]
        
        # 收集所有序号及其位置
        all_numbers = []
        for pattern in number_patterns:
            for match in re.finditer(pattern, text):
                number = int(match.group(1))
                position = match.start()
                all_numbers.append((number, position, match.end()))
        
        # 按位置排序
        all_numbers.sort(key=lambda x: x[1])
        
        if not all_numbers:
            # 没有找到序号，整个文本作为一个段
            language = self.detect_language(text)
            return [(0, len(text), language)]
        
        # 检测序号重启点（序号重新从1开始）
        restart_points = [0]  # 文本开始总是一个重启点
        
        for i in range(1, len(all_numbers)):
            current_num, current_pos, _ = all_numbers[i]
            prev_num, _, _ = all_numbers[i-1]
            
            # 如果当前序号是1且前一个序号大于1，认为是重启
            if current_num == 1 and prev_num > 1:
                restart_points.append(i)
        
        # 根据重启点分割文本段
        boundaries = []
        
        for i in range(len(restart_points)):
            start_idx = restart_points[i]
            end_idx = restart_points[i + 1] if i + 1 < len(restart_points) else len(all_numbers)
            
            # 确定这个段的文本范围
            if start_idx < len(all_numbers):
                segment_start = all_numbers[start_idx][1]  # 第一个序号的位置
            else:
                segment_start = 0
                
            if end_idx < len(all_numbers):
                segment_end = all_numbers[end_idx][1]  # 下一段第一个序号的位置
            else:
                segment_end = len(text)
            
            # 提取段落文本并检测语言
            segment_text = text[segment_start:segment_end]
            if segment_text.strip():
                language = self.detect_language(segment_text)
                boundaries.append((segment_start, segment_end, language))
        
        # 如果没有检测到重启点，整个文本作为一个段
        if len(boundaries) == 0:
            language = self.detect_language(text)
            boundaries.append((0, len(text), language))
        
        return boundaries
    
    def get_language_priority_score(self, language: str) -> int:
        """
        获取语言优先级分数
        
        Args:
            language: 语言代码
            
        Returns:
            优先级分数（越高越优先）
        """
        return self.language_priority.get(language.lower(), 1)
    
    def extract_language_segments(self, text: str) -> List[str]:
        """
        提取文本中的不同语言段落
        
        Args:
            text: 完整文本
            
        Returns:
            语言段落列表
        """
        boundaries = self.identify_language_boundaries(text)
        segments = []
        
        for start_pos, end_pos, language in boundaries:
            segment = text[start_pos:end_pos].strip()
            if segment:
                segments.append(segment)
        
        return segments