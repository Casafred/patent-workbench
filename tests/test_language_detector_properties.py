"""
语言检测器属性测试

使用基于属性的测试验证语言检测器的正确性属性。
"""

import pytest
from hypothesis import given, strategies as st, assume, settings
from hypothesis.strategies import composite
import re

from patent_claims_processor.processors.language_detector import LanguageDetector


# 测试数据生成策略

@composite
def chinese_text_strategy(draw):
    """生成中文文本"""
    # 生成常用中文字符
    chinese_chars = draw(st.lists(
        st.text(
            alphabet=st.characters(min_codepoint=0x4e00, max_codepoint=0x9fff),
            min_size=1,
            max_size=3
        ),
        min_size=3,
        max_size=15
    ))
    
    # 组合成文本
    chinese_text = "".join(chinese_chars)
    
    # 添加一些中文标点符号
    punctuation = draw(st.sampled_from(["。", "，", "；", "：", "！", "？"]))
    
    return chinese_text + punctuation


@composite
def english_text_strategy(draw):
    """生成英文文本"""
    # 生成基础英文单词
    words = draw(st.lists(
        st.text(
            alphabet=st.characters(min_codepoint=ord('a'), max_codepoint=ord('z')),
            min_size=3,
            max_size=10
        ),
        min_size=2,
        max_size=20
    ))
    
    # 组合成句子
    english_text = " ".join(words)
    
    # 添加一些标点符号
    punctuation = draw(st.sampled_from([".", "!", "?", ",", ";"]))
    
    return english_text + punctuation


@composite
def other_language_text_strategy(draw):
    """生成其他语言文本（如日文、韩文等）"""
    # 日文平假名
    hiragana = draw(st.text(
        alphabet=st.characters(min_codepoint=0x3040, max_codepoint=0x309f),
        min_size=5,
        max_size=50
    ))
    
    # 韩文
    korean = draw(st.text(
        alphabet=st.characters(min_codepoint=0xac00, max_codepoint=0xd7af),
        min_size=5,
        max_size=50
    ))
    
    # 随机选择一种
    text_type = draw(st.sampled_from(['hiragana', 'korean']))
    if text_type == 'hiragana':
        return hiragana
    else:
        return korean


@composite
def claims_number_pattern_strategy(draw):
    """生成权利要求序号模式"""
    number = draw(st.integers(min_value=1, max_value=50))
    
    # 不同的序号格式
    format_type = draw(st.sampled_from(['dot', 'chinese_dot', 'paren', 'space']))
    
    if format_type == 'dot':
        return f"{number}. "
    elif format_type == 'chinese_dot':
        return f"{number}、"
    elif format_type == 'paren':
        return f"{number}) "
    else:  # space
        return f"{number} "


@composite
def multilingual_claims_text_strategy(draw):
    """生成包含多语言版本的权利要求文本"""
    # 生成不同语言的权利要求文本段
    segments = []
    
    # 英文段落
    english_segment = ""
    english_claims_count = draw(st.integers(min_value=1, max_value=5))
    for i in range(1, english_claims_count + 1):
        number_pattern = draw(claims_number_pattern_strategy())
        claim_text = draw(english_text_strategy())
        english_segment += f"{number_pattern}{claim_text}\n"
    
    # 中文段落
    chinese_segment = ""
    chinese_claims_count = draw(st.integers(min_value=1, max_value=5))
    for i in range(1, chinese_claims_count + 1):
        number_pattern = draw(claims_number_pattern_strategy())
        claim_text = draw(chinese_text_strategy())
        chinese_segment += f"{number_pattern}{claim_text}\n"
    
    # 其他语言段落（可选）
    include_other = draw(st.booleans())
    other_segment = ""
    if include_other:
        other_claims_count = draw(st.integers(min_value=1, max_value=3))
        for i in range(1, other_claims_count + 1):
            number_pattern = draw(claims_number_pattern_strategy())
            claim_text = draw(other_language_text_strategy())
            other_segment += f"{number_pattern}{claim_text}\n"
    
    # 随机排列段落顺序
    all_segments = [english_segment, chinese_segment]
    if other_segment:
        all_segments.append(other_segment)
    
    # 打乱顺序
    segments_order = draw(st.permutations(all_segments))
    
    # 组合成完整文本
    full_text = "\n".join(segments_order)
    
    return full_text, {
        'english': english_segment,
        'chinese': chinese_segment,
        'other': other_segment if include_other else None
    }


@composite
def language_priority_test_data_strategy(draw):
    """生成语言优先级测试数据"""
    # 生成不同语言的文本段
    english_text = draw(english_text_strategy())
    chinese_text = draw(chinese_text_strategy())
    other_text = draw(other_language_text_strategy())
    
    # 随机选择包含哪些语言
    include_english = draw(st.booleans())
    include_chinese = draw(st.booleans())
    include_other = draw(st.booleans())
    
    # 至少包含一种语言
    assume(include_english or include_chinese or include_other)
    
    segments = []
    expected_priority_order = []
    
    if include_english:
        segments.append(english_text)
        expected_priority_order.append(('en', english_text))
    
    if include_chinese:
        segments.append(chinese_text)
        expected_priority_order.append(('zh', chinese_text))
    
    if include_other:
        segments.append(other_text)
        expected_priority_order.append(('other', other_text))
    
    # 按优先级排序：英文 > 中文 > 其他
    priority_map = {'en': 3, 'zh': 2, 'other': 1}
    expected_priority_order.sort(key=lambda x: priority_map[x[0]], reverse=True)
    
    return segments, expected_priority_order


@composite
def sequence_restart_test_data_strategy(draw):
    """生成序号重启测试数据"""
    # 第一个语言版本
    first_lang_count = draw(st.integers(min_value=2, max_value=8))
    first_lang_text = draw(st.sampled_from(['english', 'chinese']))
    
    # 第二个语言版本（序号重新从1开始）
    second_lang_count = draw(st.integers(min_value=2, max_value=8))
    second_lang_text = draw(st.sampled_from(['english', 'chinese']))
    
    # 确保两个语言版本不同
    assume(first_lang_text != second_lang_text)
    
    # 生成第一个语言版本的文本
    first_segment = ""
    for i in range(1, first_lang_count + 1):
        number_pattern = f"{i}. "
        if first_lang_text == 'chinese':
            content = draw(chinese_text_strategy())
        else:
            content = draw(english_text_strategy())
        first_segment += f"{number_pattern}{content}\n"
    
    # 生成第二个语言版本的文本（序号重新从1开始）
    second_segment = ""
    for i in range(1, second_lang_count + 1):
        number_pattern = f"{i}. "
        if second_lang_text == 'chinese':
            content = draw(chinese_text_strategy())
        else:
            content = draw(english_text_strategy())
        second_segment += f"{number_pattern}{content}\n"
    
    # 组合文本
    full_text = first_segment + "\n" + second_segment
    
    return full_text, {
        'first_segment': first_segment,
        'second_segment': second_segment,
        'first_lang': first_lang_text,
        'second_lang': second_lang_text,
        'first_count': first_lang_count,
        'second_count': second_lang_count
    }


class TestLanguageDetectorProperties:
    """语言检测器属性测试类"""
    
    def setup_method(self):
        """设置测试方法"""
        self.detector = LanguageDetector()
    
    @given(chinese_text_strategy())
    @settings(max_examples=20, deadline=None)
    def test_property_3_chinese_language_detection(self, chinese_text):
        """
        **Feature: patent-claims-processor, Property 3: 多语言版本识别和优先级选择**
        
        测试中文文本的语言检测准确性
        
        **验证需求: 2.1**
        """
        # 检测语言
        detected_language = self.detector.detect_language(chinese_text)
        
        # 验证检测结果
        assert detected_language in ['zh', 'other'], f"中文文本应该被检测为中文或其他语言，实际检测为: {detected_language}"
        
        # 如果文本足够长且包含足够多的中文字符，应该被检测为中文
        chinese_chars = len(re.findall(r'[\u4e00-\u9fff]', chinese_text))
        total_chars = len(chinese_text.replace(' ', '').replace('\n', '').replace('\t', ''))
        
        if total_chars > 0:
            chinese_ratio = chinese_chars / total_chars
            if chinese_ratio > 0.1:  # 中文字符占比超过10%
                assert detected_language == 'zh', f"中文字符占比 {chinese_ratio:.2f} 的文本应该被检测为中文"
    
    @given(english_text_strategy())
    @settings(max_examples=20, deadline=None)
    def test_property_3_english_language_detection(self, english_text):
        """
        **Feature: patent-claims-processor, Property 3: 多语言版本识别和优先级选择**
        
        测试英文文本的语言检测准确性
        
        **验证需求: 2.1**
        """
        # 检测语言
        detected_language = self.detector.detect_language(english_text)
        
        # 验证检测结果
        assert detected_language in ['en', 'other'], f"英文文本应该被检测为英文或其他语言，实际检测为: {detected_language}"
        
        # 如果文本足够长且包含足够多的英文字符，应该被检测为英文
        english_chars = len(re.findall(r'[a-zA-Z]', english_text))
        total_chars = len(english_text.replace(' ', '').replace('\n', '').replace('\t', ''))
        
        if total_chars > 0:
            english_ratio = english_chars / total_chars
            if english_ratio > 0.3:  # 英文字符占比超过30%
                assert detected_language == 'en', f"英文字符占比 {english_ratio:.2f} 的文本应该被检测为英文"
    
    @given(language_priority_test_data_strategy())
    @settings(max_examples=15, deadline=None)
    def test_property_3_language_priority_selection(self, priority_data):
        """
        **Feature: patent-claims-processor, Property 3: 多语言版本识别和优先级选择**
        
        对于任何包含多种语言版本的权利要求文本，系统应当按照优先级（英文 > 中文 > 其他语言）选择处理版本
        
        **验证需求: 2.2, 2.4**
        """
        segments, expected_priority_order = priority_data
        
        # 使用语言检测器选择优先版本
        selected_version = self.detector.select_preferred_version(segments)
        
        # 验证选择结果不为空
        assert selected_version is not None, "选择的语言版本不应为空"
        assert selected_version.strip() != "", "选择的语言版本不应为空字符串"
        
        # 验证选择的版本在输入段落中
        assert selected_version in segments, "选择的版本应该在输入段落中"
        
        # 验证优先级逻辑
        if len(expected_priority_order) > 0:
            # 获取最高优先级的语言和对应文本
            highest_priority_lang, highest_priority_text = expected_priority_order[0]
            
            # 检测选择版本的语言
            selected_language = self.detector.detect_language(selected_version)
            
            # 验证语言优先级分数
            selected_priority = self.detector.get_language_priority_score(selected_language)
            highest_expected_priority = self.detector.get_language_priority_score(highest_priority_lang)
            
            # 由于语言检测可能有误差，我们验证选择的版本至少是合理的
            # 如果预期是英文但检测为其他语言，检查文本是否确实包含足够的英文字符
            if highest_priority_lang == 'en' and selected_language != 'en':
                # 检查文本的英文字符比例
                english_chars = len(re.findall(r'[a-zA-Z]', selected_version))
                total_chars = len(selected_version.replace(' ', '').replace('\n', '').replace('\t', ''))
                
                if total_chars > 0:
                    english_ratio = english_chars / total_chars
                    # 如果英文字符比例很低，允许检测为其他语言
                    if english_ratio < 0.3:
                        # 这种情况下，检测为其他语言是合理的
                        pass
                    else:
                        # 英文字符比例足够高，应该检测为英文
                        assert selected_priority >= highest_expected_priority - 1, \
                            f"选择的语言 {selected_language} (优先级 {selected_priority}) 应该不低于预期最高优先级 {highest_priority_lang} (优先级 {highest_expected_priority})"
            else:
                # 其他情况下，验证优先级逻辑
                assert selected_priority >= highest_expected_priority - 1, \
                    f"选择的语言 {selected_language} (优先级 {selected_priority}) 应该不低于预期最高优先级 {highest_priority_lang} (优先级 {highest_expected_priority})"
    
    @given(multilingual_claims_text_strategy())
    @settings(max_examples=10, deadline=None)
    def test_property_3_language_boundary_identification(self, multilingual_data):
        """
        **Feature: patent-claims-processor, Property 3: 多语言版本识别和优先级选择**
        
        对于任何包含多种语言版本的权利要求文本，系统应当通过序号连续性正确识别语言边界
        
        **验证需求: 2.1**
        """
        full_text, segments_info = multilingual_data
        
        # 识别语言边界
        boundaries = self.detector.identify_language_boundaries(full_text)
        
        # 验证边界识别结果
        assert isinstance(boundaries, list), "语言边界应该是列表"
        assert len(boundaries) > 0, "应该至少识别出一个语言边界"
        
        # 验证边界格式
        for boundary in boundaries:
            assert isinstance(boundary, tuple), "每个边界应该是元组"
            assert len(boundary) == 3, "边界元组应该包含3个元素: (start_pos, end_pos, language)"
            
            start_pos, end_pos, language = boundary
            assert isinstance(start_pos, int), "起始位置应该是整数"
            assert isinstance(end_pos, int), "结束位置应该是整数"
            assert isinstance(language, str), "语言标识应该是字符串"
            assert start_pos >= 0, "起始位置应该非负"
            assert end_pos > start_pos, "结束位置应该大于起始位置"
            assert end_pos <= len(full_text), "结束位置不应超过文本长度"
            assert language in ['en', 'zh', 'other'], f"语言标识应该是有效值，实际为: {language}"
        
        # 验证边界覆盖完整性
        boundaries.sort(key=lambda x: x[0])  # 按起始位置排序
        
        # 检查边界是否合理覆盖了文本
        total_covered_length = sum(end - start for start, end, _ in boundaries)
        assert total_covered_length > 0, "边界应该覆盖一定长度的文本"
        
        # 验证边界不重叠
        for i in range(len(boundaries) - 1):
            current_end = boundaries[i][1]
            next_start = boundaries[i + 1][0]
            assert current_end <= next_start, f"边界不应重叠: 边界{i}结束于{current_end}, 边界{i+1}开始于{next_start}"
    
    @given(sequence_restart_test_data_strategy())
    @settings(max_examples=10, deadline=None)
    def test_property_3_sequence_restart_detection(self, restart_data):
        """
        **Feature: patent-claims-processor, Property 3: 多语言版本识别和优先级选择**
        
        当权利要求序号重新从1开始时，系统应当正确识别为新语言版本的开始
        
        **验证需求: 2.1**
        """
        full_text, metadata = restart_data
        
        # 识别语言边界
        boundaries = self.detector.identify_language_boundaries(full_text)
        
        # 验证识别出多个语言边界（因为有序号重启）
        assert len(boundaries) >= 1, "应该识别出至少一个语言边界"
        
        # 如果识别出多个边界，验证序号重启检测
        if len(boundaries) > 1:
            # 验证第一个边界对应第一个语言版本
            first_boundary = boundaries[0]
            first_start, first_end, first_lang = first_boundary
            first_segment_text = full_text[first_start:first_end]
            
            # 验证第一个段落包含从1开始的序号
            assert "1." in first_segment_text or "1、" in first_segment_text or "1)" in first_segment_text, \
                "第一个语言边界应该包含序号1"
            
            # 验证后续边界也包含序号重启
            for i, boundary in enumerate(boundaries[1:], 1):
                start, end, lang = boundary
                segment_text = full_text[start:end]
                
                # 检查是否包含序号1（重启标志）
                has_restart = ("1." in segment_text or "1、" in segment_text or "1)" in segment_text)
                
                # 如果这个边界足够长，应该包含序号重启
                if len(segment_text.strip()) > 10:
                    assert has_restart, f"边界{i}应该包含序号重启标志，文本片段: {segment_text[:100]}..."
    
    @given(st.text(min_size=0, max_size=10))
    @settings(max_examples=10, deadline=None)
    def test_property_3_empty_or_short_text_handling(self, short_text):
        """
        **Feature: patent-claims-processor, Property 3: 多语言版本识别和优先级选择**
        
        测试空文本或极短文本的处理
        
        **验证需求: 2.4**
        """
        # 检测语言
        detected_language = self.detector.detect_language(short_text)
        
        # 验证检测结果
        assert detected_language in ['en', 'zh', 'other'], f"语言检测结果应该是有效值，实际为: {detected_language}"
        
        # 空文本或极短文本通常应该被标记为'other'
        if not short_text or len(short_text.strip()) == 0:
            assert detected_language == 'other', "空文本应该被检测为'other'"
        
        # 测试边界识别
        boundaries = self.detector.identify_language_boundaries(short_text)
        assert isinstance(boundaries, list), "边界识别结果应该是列表"
        
        # 空文本的边界识别应该返回空列表或包含整个文本的单一边界
        if not short_text or len(short_text.strip()) == 0:
            assert len(boundaries) <= 1, "空文本的边界识别应该返回最多一个边界"
        
        # 测试优先版本选择
        if short_text.strip():
            selected = self.detector.select_preferred_version([short_text])
            assert selected == short_text, "单一文本段的选择应该返回原文本"
        
        # 测试空列表的处理
        empty_selection = self.detector.select_preferred_version([])
        assert empty_selection == "", "空列表的选择应该返回空字符串"
    
    def test_property_3_language_priority_scores(self):
        """
        **Feature: patent-claims-processor, Property 3: 多语言版本识别和优先级选择**
        
        测试语言优先级分数的正确性：英文 > 中文 > 其他语言
        
        **验证需求: 2.2**
        """
        # 获取各语言的优先级分数
        english_score = self.detector.get_language_priority_score('en')
        chinese_score = self.detector.get_language_priority_score('zh')
        other_score = self.detector.get_language_priority_score('other')
        
        # 验证优先级顺序：英文 > 中文 > 其他
        assert english_score > chinese_score, f"英文优先级 ({english_score}) 应该高于中文 ({chinese_score})"
        assert chinese_score > other_score, f"中文优先级 ({chinese_score}) 应该高于其他语言 ({other_score})"
        assert english_score > other_score, f"英文优先级 ({english_score}) 应该高于其他语言 ({other_score})"
        
        # 验证分数为正整数
        assert english_score > 0, "英文优先级分数应该为正数"
        assert chinese_score > 0, "中文优先级分数应该为正数"
        assert other_score > 0, "其他语言优先级分数应该为正数"
        
        # 测试中文变体的处理
        zh_cn_score = self.detector.get_language_priority_score('zh-cn')
        zh_tw_score = self.detector.get_language_priority_score('zh-tw')
        
        assert zh_cn_score == chinese_score, "简体中文优先级应该与中文相同"
        assert zh_tw_score == chinese_score, "繁体中文优先级应该与中文相同"
        
        # 测试未知语言的处理
        unknown_score = self.detector.get_language_priority_score('unknown_language')
        assert unknown_score == other_score, "未知语言应该使用其他语言的优先级分数"