"""
智能列识别工具

自动识别Excel文件中的专利号列和权利要求列
"""

import re
import pandas as pd
from typing import List, Dict, Optional, Tuple


class ColumnDetector:
    """列类型智能识别器"""
    
    def __init__(self):
        # 专利号列关键词（按优先级排序）
        self.patent_number_keywords = [
            # 中文
            '专利号', '公开号', '申请号', '公告号', '专利申请号', '专利公开号',
            '专利公告号', '发明专利号', '实用新型专利号', '外观设计专利号',
            
            # 英文
            'patent number', 'patent no', 'patent_number', 'patent_no',
            'publication number', 'publication no', 'publication_number', 'publication_no',
            'application number', 'application no', 'application_number', 'application_no',
            'patent id', 'patent_id', 'patentid',
            
            # 简写
            'pat no', 'pat_no', 'patno', 'pub no', 'pub_no', 'pubno',
            'app no', 'app_no', 'appno',
            
            # 其他语言
            '特許番号', '公開番号', '출원번호', '공개번호',  # 日文、韩文
        ]
        
        # 权利要求列关键词
        self.claims_keywords = [
            # 中文
            '权利要求', '請求項', '請求项', '权利要求书', '独立权利要求', '从属权利要求',
            '权利要求内容', '权利要求文本', '权利要求描述',
            
            # 英文
            'claims', 'claim', 'patent claims', 'independent claims', 'dependent claims',
            'claim text', 'claim content', 'claim description',
            
            # 其他语言
            'クレーム', '청구항', '請求項',  # 日文、韩文
        ]
        
        # 专利号格式正则表达式
        self.patent_number_patterns = [
            # 中国专利号格式
            r'CN\d{9}[A-Z]?',  # CN202310123456A
            r'ZL\d{9}\.\d',     # ZL202310123456.7
            r'\d{4}\d{8}\.\d',  # 202310123456.7
            
            # 美国专利号格式
            r'US\d{7,10}[A-Z]?\d?',  # US10123456B2
            r'\d{7,10}',             # 10123456
            
            # 欧洲专利号格式
            r'EP\d{7}[A-Z]\d?',      # EP1234567A1
            
            # 日本专利号格式
            r'JP\d{4}-\d{6}[A-Z]?',  # JP2023-123456A
            r'特願\d{4}-\d{6}',       # 特願2023-123456
            
            # 韩国专利号格式
            r'KR\d{2}-\d{7}',        # KR10-1234567
            
            # 通用格式
            r'[A-Z]{2}\d{6,12}[A-Z]?\d?',  # 两字母+数字+可选字母数字
        ]
    
    def detect_patent_number_column(self, df: pd.DataFrame) -> Optional[Dict]:
        """
        检测专利号列
        
        Args:
            df: pandas DataFrame
            
        Returns:
            dict: 检测结果，包含列名、置信度、匹配原因
        """
        results = []
        
        for col_name in df.columns:
            score = 0
            reasons = []
            
            # 1. 检查列名关键词匹配
            col_name_lower = str(col_name).lower()
            for keyword in self.patent_number_keywords:
                if keyword.lower() in col_name_lower:
                    # 根据关键词重要性给分
                    if keyword.lower() in ['专利号', 'patent number', '公开号']:
                        score += 50
                        reasons.append(f"列名包含高优先级关键词: {keyword}")
                    else:
                        score += 30
                        reasons.append(f"列名包含关键词: {keyword}")
                    break
            
            # 2. 检查数据内容格式
            sample_data = df[col_name].dropna().astype(str).head(10)
            if len(sample_data) > 0:
                patent_format_matches = 0
                total_samples = len(sample_data)
                
                for value in sample_data:
                    value_clean = str(value).strip().upper()
                    if len(value_clean) < 5:  # 太短不太可能是专利号
                        continue
                        
                    # 检查是否匹配专利号格式
                    for pattern in self.patent_number_patterns:
                        if re.search(pattern, value_clean):
                            patent_format_matches += 1
                            break
                
                # 计算格式匹配率
                if total_samples > 0:
                    format_match_rate = patent_format_matches / total_samples
                    if format_match_rate >= 0.8:
                        score += 40
                        reasons.append(f"数据格式高度匹配专利号格式 ({format_match_rate:.1%})")
                    elif format_match_rate >= 0.5:
                        score += 25
                        reasons.append(f"数据格式部分匹配专利号格式 ({format_match_rate:.1%})")
                    elif format_match_rate >= 0.2:
                        score += 10
                        reasons.append(f"数据格式少量匹配专利号格式 ({format_match_rate:.1%})")
            
            # 3. 检查数据长度特征
            if len(sample_data) > 0:
                avg_length = sample_data.str.len().mean()
                if 8 <= avg_length <= 20:  # 专利号通常在这个长度范围
                    score += 10
                    reasons.append(f"数据长度符合专利号特征 (平均{avg_length:.1f}字符)")
            
            # 4. 检查是否包含专利号特征字符
            if len(sample_data) > 0:
                has_letters_and_numbers = 0
                for value in sample_data:
                    value_str = str(value).strip()
                    if re.search(r'[A-Za-z]', value_str) and re.search(r'\d', value_str):
                        has_letters_and_numbers += 1
                
                if has_letters_and_numbers > 0:
                    letter_number_rate = has_letters_and_numbers / len(sample_data)
                    if letter_number_rate >= 0.5:
                        score += 15
                        reasons.append(f"数据包含字母数字组合特征 ({letter_number_rate:.1%})")
            
            if score > 0:
                results.append({
                    'column_name': col_name,
                    'score': score,
                    'confidence': min(score / 100, 1.0),  # 转换为0-1的置信度
                    'reasons': reasons,
                    'sample_data': sample_data.head(3).tolist()
                })
        
        # 按分数排序，返回最佳匹配
        if results:
            results.sort(key=lambda x: x['score'], reverse=True)
            return results[0] if results[0]['score'] >= 20 else None  # 最低阈值
        
        return None
    
    def detect_claims_column(self, df: pd.DataFrame) -> Optional[Dict]:
        """
        检测权利要求列
        
        Args:
            df: pandas DataFrame
            
        Returns:
            dict: 检测结果，包含列名、置信度、匹配原因
        """
        results = []
        
        for col_name in df.columns:
            score = 0
            reasons = []
            
            # 1. 检查列名关键词匹配
            col_name_lower = str(col_name).lower()
            for keyword in self.claims_keywords:
                if keyword.lower() in col_name_lower:
                    if keyword.lower() in ['权利要求', 'claims', 'claim']:
                        score += 50
                        reasons.append(f"列名包含高优先级关键词: {keyword}")
                    else:
                        score += 30
                        reasons.append(f"列名包含关键词: {keyword}")
                    break
            
            # 2. 检查数据内容特征
            sample_data = df[col_name].dropna().astype(str).head(10)
            if len(sample_data) > 0:
                claims_content_matches = 0
                
                for value in sample_data:
                    value_str = str(value).strip()
                    
                    # 检查是否包含权利要求特征词汇
                    claims_indicators = [
                        '权利要求', 'claim', '一种', '包括', '其特征在于', 'comprising',
                        'characterized', 'wherein', '所述', 'said', 'the method',
                        'the apparatus', 'the system'
                    ]
                    
                    for indicator in claims_indicators:
                        if indicator.lower() in value_str.lower():
                            claims_content_matches += 1
                            break
                
                # 计算内容匹配率
                if len(sample_data) > 0:
                    content_match_rate = claims_content_matches / len(sample_data)
                    if content_match_rate >= 0.6:
                        score += 40
                        reasons.append(f"内容高度匹配权利要求特征 ({content_match_rate:.1%})")
                    elif content_match_rate >= 0.3:
                        score += 25
                        reasons.append(f"内容部分匹配权利要求特征 ({content_match_rate:.1%})")
            
            # 3. 检查文本长度（权利要求通常较长）
            if len(sample_data) > 0:
                avg_length = sample_data.str.len().mean()
                if avg_length >= 50:  # 权利要求通常比较长
                    score += 20
                    reasons.append(f"文本长度符合权利要求特征 (平均{avg_length:.0f}字符)")
                elif avg_length >= 20:
                    score += 10
                    reasons.append(f"文本长度可能符合权利要求特征 (平均{avg_length:.0f}字符)")
            
            if score > 0:
                results.append({
                    'column_name': col_name,
                    'score': score,
                    'confidence': min(score / 100, 1.0),
                    'reasons': reasons,
                    'sample_data': sample_data.head(2).tolist()
                })
        
        # 按分数排序，返回最佳匹配
        if results:
            results.sort(key=lambda x: x['score'], reverse=True)
            return results[0] if results[0]['score'] >= 20 else None
        
        return None
    
    def analyze_all_columns(self, df: pd.DataFrame) -> Dict:
        """
        分析所有列，返回完整的检测结果
        
        Args:
            df: pandas DataFrame
            
        Returns:
            dict: 包含专利号列和权利要求列的检测结果
        """
        patent_column = self.detect_patent_number_column(df)
        claims_column = self.detect_claims_column(df)
        
        return {
            'patent_number_column': patent_column,
            'claims_column': claims_column,
            'total_columns': len(df.columns),
            'column_names': list(df.columns)
        }


def detect_columns_from_file(file_path: str, sheet_name: str = None) -> Dict:
    """
    从Excel文件检测列类型
    
    Args:
        file_path: Excel文件路径
        sheet_name: 工作表名称
        
    Returns:
        dict: 检测结果
    """
    try:
        # 读取Excel文件
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path, sheet_name=sheet_name)
        
        # 创建检测器并分析
        detector = ColumnDetector()
        results = detector.analyze_all_columns(df)
        
        return {
            'success': True,
            'data': results
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': f"文件分析失败: {str(e)}"
        }