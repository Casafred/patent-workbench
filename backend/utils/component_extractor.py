"""
专利说明书部件名称提取工具 - 基于分词和词性标注

从专利说明书文本中提取附图标记和对应的部件名称
使用jieba分词和词性标注，准确识别名词性部件名称
"""

import re
from typing import Dict, List, Tuple
import logging

logger = logging.getLogger(__name__)

# 尝试导入jieba，如果失败则使用简化版本
try:
    import jieba
    import jieba.posseg as pseg
    JIEBA_AVAILABLE = True
    logger.info("jieba分词库加载成功")
except ImportError:
    JIEBA_AVAILABLE = False
    logger.warning("jieba分词库未安装，将使用简化版提取算法")


def extract_reference_markers(spec_text: str) -> Dict[str, str]:
    """
    从专利说明书中提取附图标记和部件名称
    
    优先使用基于分词的智能提取，如果jieba不可用则回退到正则表达式
    
    Args:
        spec_text: 专利说明书文本
        
    Returns:
        Dict[str, str]: {编号: 部件名称} 的映射
    """
    if JIEBA_AVAILABLE:
        return _extract_with_jieba(spec_text)
    else:
        return _extract_with_regex(spec_text)


def _extract_with_jieba(spec_text: str) -> Dict[str, str]:
    """
    使用jieba分词和词性标注提取部件名称
    
    策略：
    1. 先用标准格式提取（最可靠）
    2. 对剩余文本进行分词和词性标注
    3. 查找"名词+数字"或"数字+名词"的组合
    4. 支持多个名词组合（如"第二电路板"）
    5. 验证名词是否为有效的部件名称
    """
    reference_map = {}
    
    # 阶段1: 标准格式提取（最可靠）
    # 例如: "71. 机壳"、"713、底座部分"
    pattern_standard = r'([0-9]+[A-Z]*)\s*[.、]\s*([一-龥\u4e00-\u9fa5]{2,15})'
    matches = re.findall(pattern_standard, spec_text)
    
    for number, name in matches:
        name = name.strip()
        if name and len(name) >= 2:
            reference_map[number] = name
            logger.debug(f"标准格式提取: {number} -> {name}")
    
    # 阶段2: 基于分词的智能提取
    # 分句处理，避免跨句匹配
    sentences = re.split(r'[。；]', spec_text)
    
    for sentence in sentences:
        if not sentence.strip():
            continue
        
        # 对句子进行分词和词性标注
        words = pseg.cut(sentence)
        word_list = list(words)
        
        # 查找"名词+数字"或"数字+名词"的模式
        for i in range(len(word_list)):
            word, flag = word_list[i].word, word_list[i].flag
            
            # 检查是否是数字
            number_match = re.match(r'^([0-9]+[A-Z]?)$', word)
            if number_match:
                number = number_match.group(1)
                
                # 如果已经提取过，跳过
                if number in reference_map:
                    continue
                
                # 向前查找名词组合（名词+数字模式）
                # 支持多个连续的名词/形容词组合，如"第二电路板"、"电机控制单元"
                if i > 0:
                    noun_parts = []
                    j = i - 1
                    
                    # 向前查找所有连续的名词、形容词、数词
                    while j >= 0:
                        prev_word, prev_flag = word_list[j].word, word_list[j].flag
                        
                        # 检查是否是名词、形容词或数词
                        if _is_noun_or_modifier(prev_flag) and _is_valid_word_part(prev_word):
                            noun_parts.insert(0, prev_word)
                            j -= 1
                        else:
                            break
                    
                    # 组合名词部分
                    if noun_parts:
                        component_name = ''.join(noun_parts)
                        if _is_valid_component_name(component_name):
                            reference_map[number] = component_name
                            logger.debug(f"名词+数字提取: {number} -> {component_name} (词性: {[word_list[k].flag for k in range(j+1, i)]})")
                            continue
                
                # 向后查找名词（数字+名词模式，较少见）
                if i < len(word_list) - 1:
                    noun_parts = []
                    j = i + 1
                    
                    # 向后查找所有连续的名词、形容词
                    while j < len(word_list):
                        next_word, next_flag = word_list[j].word, word_list[j].flag
                        
                        if _is_noun_or_modifier(next_flag) and _is_valid_word_part(next_word):
                            noun_parts.append(next_word)
                            j += 1
                        else:
                            break
                    
                    # 组合名词部分
                    if noun_parts:
                        component_name = ''.join(noun_parts)
                        if _is_valid_component_name(component_name):
                            reference_map[number] = component_name
                            logger.debug(f"数字+名词提取: {number} -> {component_name}")
    
    # 阶段3: 处理括号注释的情况
    # 例如: "电位器(potentiometer)2022"
    pattern_parenthesis = r'([一-龥\u4e00-\u9fa5]{2,15})\s*\([^)]+\)\s*([0-9]+[A-Z]?)'
    matches = re.findall(pattern_parenthesis, spec_text)
    
    for name, number in matches:
        if number not in reference_map:
            name = name.strip()
            if _is_valid_component_name(name):
                reference_map[number] = name
                logger.debug(f"括号注释提取: {number} -> {name}")
    
    # 阶段4: 处理顿号分隔的列表（需要精确匹配，避免错位）
    # 例如: "电机控制单元22、电机电流检测元件28、直流电源转换模块24"
    # 策略：使用非贪婪匹配，确保部件名不会跨越数字边界
    # 匹配模式：中文(2-15字) + 数字 + 顿号，但中文部分不能包含其他数字
    pattern_list = r'([一-龥\u4e00-\u9fa5]{2,15}?)([0-9]+[A-Z]?)、'
    
    # 先找到所有可能的匹配
    all_matches = []
    for match in re.finditer(pattern_list, spec_text):
        name = match.group(1).strip()
        number = match.group(2)
        start_pos = match.start()
        
        # 向前查找，确保这是完整的部件名
        # 检查前面是否还有中文字符（可能是部件名的一部分）
        if start_pos > 0:
            # 向前查找最多20个字符
            context_start = max(0, start_pos - 20)
            context = spec_text[context_start:start_pos]
            
            # 查找最后一个非中文字符的位置
            last_non_chinese = -1
            for k in range(len(context) - 1, -1, -1):
                if not re.match(r'[\u4e00-\u9fa5]', context[k]):
                    last_non_chinese = k
                    break
            
            # 如果找到了，提取完整的部件名
            if last_non_chinese >= 0:
                full_name = context[last_non_chinese + 1:] + name
                name = full_name.strip()
        
        all_matches.append((name, number))
    
    # 添加到结果中
    for name, number in all_matches:
        if number not in reference_map:
            # 移除"以及"等连词前缀
            name = re.sub(r'^(以及|和|或|及)', '', name)
            if _is_valid_component_name(name):
                reference_map[number] = name
                logger.debug(f"列表格式提取: {number} -> {name}")
    
    # 阶段5: 处理"以及"连接的最后一项
    # 例如: "以及电机控制开关201"
    pattern_final = r'以及([一-龥\u4e00-\u9fa5]{2,15})([0-9]+[A-Z]?)(?![、，])'
    matches = re.findall(pattern_final, spec_text)
    
    for name, number in matches:
        if number not in reference_map:
            name = name.strip()
            if _is_valid_component_name(name):
                reference_map[number] = name
                logger.debug(f"以及格式提取: {number} -> {name}")
    
    logger.info(f"提取完成: 共提取 {len(reference_map)} 个部件")
    return reference_map


def _is_noun_or_modifier(flag: str) -> bool:
    """
    判断词性是否为名词、形容词或数词
    
    jieba词性标注：
    - n: 普通名词
    - nr/ns/nt/nz: 专名
    - a: 形容词
    - m: 数词（如"第二"）
    """
    return (flag.startswith('n') or 
            flag.startswith('a') or 
            flag == 'm' or
            flag == 'q')  # 量词


def _is_valid_word_part(word: str) -> bool:
    """
    验证词是否可以作为部件名称的一部分
    """
    # 排除的词（不能作为部件名称的一部分）
    exclude_words = {
        '设置', '位于', '安装', '固定', '连接', '延伸',
        '包括', '具有', '含有', '形成', '构成',
        '用于', '通过', '由于', '因此', '可以', '能够',
        '在', '与', '对', '从', '向', '到', '于',
        '以及', '或者', '并且', '而且', '但是', '和', '或',
        '其中', '其', '该', '所述', '上述', '下述',
        '例如', '如图', '所示', '参见', '参照',
        '需要', '说明', '本领域', '技术', '人员', '熟知',
        '实施', '方式', '本发明', '专利',
        '如果', '当', '则', '即', '也就是'
    }
    
    return word not in exclude_words


def _is_valid_component_name(name: str) -> bool:
    """
    验证是否为有效的部件名称
    
    规则：
    1. 长度在2-8个字符之间
    2. 必须是纯中文
    3. 不包含排除的关键词
    """
    # 长度检查
    if not name or len(name) < 2 or len(name) > 8:
        return False
    
    # 纯中文检查
    if not re.match(r'^[\u4e00-\u9fa5]+$', name):
        return False
    
    # 排除的关键词（动词、介词、连词等）
    exclude_keywords = {
        # 动词
        '设置', '位于', '安装', '固定', '连接', '延伸', '延伸出',
        '包括', '具有', '含有', '形成', '构成', '组成',
        '用于', '通过', '由于', '因此', '可以', '能够',
        '提供', '实现', '完成', '进行', '执行',
        # 介词和连词
        '在', '与', '对', '从', '向', '到', '于', '和', '或',
        '以及', '或者', '并且', '而且', '但是',
        # 指代词
        '其中', '其', '该', '所述', '上述', '下述', '本',
        # 描述词
        '基本上', '大致', '大约', '左右', '以内', '以上', '以下',
        '例如', '如图', '所示', '参见', '参照',
        # 说明性词汇
        '需要', '说明', '本领域', '技术', '人员', '熟知',
        '实施', '方式', '本发明', '专利', '实用新型',
        # 方位词
        '内', '外', '上', '下', '前', '后', '左', '右',
        '顶', '底', '侧', '中', '间',
        # 其他
        '如果', '当', '则', '即', '也就是', '第一', '第二'
    }
    
    # 检查是否包含排除关键词
    if name in exclude_keywords:
        return False
    
    # 检查是否包含排除关键词作为子串
    for keyword in exclude_keywords:
        if keyword in name and len(keyword) >= 2:
            return False
    
    return True


def _extract_with_regex(spec_text: str) -> Dict[str, str]:
    """
    使用正则表达式提取（jieba不可用时的回退方案）
    
    仅提取标准格式，避免误提取
    """
    reference_map = {}
    
    # 模式1: 标准格式 - 数字 + 分隔符 + 部件名称
    pattern1 = r'([0-9]+[A-Z]*)\s*[.、]\s*([一-龥\u4e00-\u9fa5]{2,10})'
    matches1 = re.findall(pattern1, spec_text)
    
    for number, name in matches1:
        name = name.strip()
        if name and len(name) >= 2:
            reference_map[number] = name
    
    # 模式2: 括号注释格式
    pattern2 = r'([一-龥\u4e00-\u9fa5]{2,10})\s*\([^)]+\)\s*([0-9]+[A-Z]?)'
    matches2 = re.findall(pattern2, spec_text)
    
    for name, number in matches2:
        if number not in reference_map:
            name = name.strip()
            if len(name) >= 2 and re.match(r'^[\u4e00-\u9fa5]+$', name):
                reference_map[number] = name
    
    logger.warning(f"使用简化提取算法，建议安装jieba: pip install jieba")
    return reference_map


def get_extraction_stats() -> Dict[str, any]:
    """
    获取提取器状态信息
    
    Returns:
        Dict包含:
        - jieba_available: jieba是否可用
        - method: 当前使用的提取方法
    """
    return {
        'jieba_available': JIEBA_AVAILABLE,
        'method': 'jieba分词' if JIEBA_AVAILABLE else '正则表达式'
    }
