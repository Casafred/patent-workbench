"""
设置验证测试

验证项目结构和依赖项是否正确设置。
"""

import pytest
from patent_claims_processor import (
    ClaimInfo, ProcessingResult, ExcelProcessor, 
    LanguageDetector, ClaimsParser, ClaimsClassifier, ProcessingService
)


def test_imports():
    """测试所有核心组件是否可以正确导入"""
    # 测试数据模型导入
    assert ClaimInfo is not None
    assert ProcessingResult is not None
    
    # 测试处理器导入
    assert ExcelProcessor is not None
    assert LanguageDetector is not None
    assert ClaimsParser is not None
    assert ClaimsClassifier is not None
    
    # 测试服务导入
    assert ProcessingService is not None


def test_component_initialization():
    """测试所有组件是否可以正确初始化"""
    # 初始化处理器
    excel_processor = ExcelProcessor()
    language_detector = LanguageDetector()
    claims_parser = ClaimsParser()
    claims_classifier = ClaimsClassifier()
    processing_service = ProcessingService()
    
    # 验证实例创建成功
    assert excel_processor is not None
    assert language_detector is not None
    assert claims_parser is not None
    assert claims_classifier is not None
    assert processing_service is not None


def test_claim_info_creation():
    """测试ClaimInfo数据结构创建"""
    claim_info = ClaimInfo(
        claim_number=1,
        claim_type="independent",
        claim_text="测试权利要求",
        language="zh",
        referenced_claims=[],
        original_text="1. 测试权利要求",
        confidence_score=0.9
    )
    
    assert claim_info.claim_number == 1
    assert claim_info.claim_type == "independent"
    assert claim_info.language == "zh"
    assert claim_info.referenced_claims == []
    assert claim_info.confidence_score == 0.9