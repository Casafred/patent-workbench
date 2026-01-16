"""
基本功能测试

验证核心组件的基本功能是否正常工作。
"""

import pytest
import tempfile
import pandas as pd
import os

from patent_claims_processor.processors import (
    ExcelProcessor, LanguageDetector, ClaimsParser, ClaimsClassifier
)


class TestExcelProcessor:
    """Excel处理器基本功能测试"""
    
    def test_validate_excel_file_valid(self, temp_excel_file):
        """测试有效Excel文件验证"""
        processor = ExcelProcessor()
        assert processor.validate_excel_file(temp_excel_file) is True
    
    def test_validate_excel_file_invalid(self):
        """测试无效文件验证"""
        processor = ExcelProcessor()
        assert processor.validate_excel_file("nonexistent.txt") is False
    
    def test_read_excel_file(self, temp_excel_file):
        """测试Excel文件读取"""
        processor = ExcelProcessor()
        df = processor.read_excel_file(temp_excel_file)
        assert isinstance(df, pd.DataFrame)
        assert 'Patent_Claims' in df.columns


class TestLanguageDetector:
    """语言检测器基本功能测试"""
    
    def test_detect_chinese(self):
        """测试中文检测"""
        detector = LanguageDetector()
        result = detector.detect_language("一种计算机系统")
        assert result == 'zh'
    
    def test_detect_english(self):
        """测试英文检测"""
        detector = LanguageDetector()
        result = detector.detect_language("A computer system")
        assert result == 'en'
    
    def test_detect_empty_text(self):
        """测试空文本检测"""
        detector = LanguageDetector()
        result = detector.detect_language("")
        assert result == 'other'


class TestClaimsParser:
    """权利要求解析器基本功能测试"""
    
    def test_extract_claim_numbers(self):
        """测试权利要求序号提取"""
        parser = ClaimsParser()
        text = "1. 第一个权利要求\n2. 第二个权利要求"
        numbers = parser.extract_claim_numbers(text)
        assert numbers == [1, 2]
    
    def test_split_claims_by_numbers(self):
        """测试按序号分割权利要求"""
        parser = ClaimsParser()
        text = "1. 第一个权利要求内容\n2. 第二个权利要求内容"
        claims_dict = parser.split_claims_by_numbers(text)
        assert 1 in claims_dict
        assert 2 in claims_dict
        assert "第一个权利要求内容" in claims_dict[1]


class TestClaimsClassifier:
    """权利要求分类器基本功能测试"""
    
    def test_classify_independent_claim(self):
        """测试独立权利要求分类"""
        classifier = ClaimsClassifier()
        text = "一种计算机系统，包括处理器和存储器"
        result = classifier.classify_claim_type(text, 'zh')
        assert result == 'independent'
    
    def test_classify_dependent_claim(self):
        """测试从属权利要求分类"""
        classifier = ClaimsClassifier()
        text = "根据权利要求1所述的计算机系统"
        result = classifier.classify_claim_type(text, 'zh')
        assert result == 'dependent'
    
    def test_extract_referenced_claims(self):
        """测试引用权利要求提取"""
        classifier = ClaimsClassifier()
        text = "根据权利要求1所述的计算机系统"
        references = classifier.extract_referenced_claims(text, 'zh')
        assert 1 in references