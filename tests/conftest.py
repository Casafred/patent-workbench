"""
pytest配置文件

定义测试夹具和配置。
"""

import pytest
import pandas as pd
import tempfile
import os
from typing import Dict, Any

from patent_claims_processor.models import ClaimInfo, ExcelInputData
from patent_claims_processor.processors import (
    ExcelProcessor, LanguageDetector, ClaimsParser, ClaimsClassifier
)
from patent_claims_processor.services import ProcessingService


@pytest.fixture
def sample_excel_data():
    """创建示例Excel数据"""
    data = {
        'Patent_Claims': [
            "1. 一种计算机系统，其特征在于包括处理器和存储器。",
            "2. 根据权利要求1所述的计算机系统，其特征在于所述处理器为多核处理器。",
            "1. A computer system comprising a processor and memory.\n2. The computer system of claim 1, wherein the processor is a multi-core processor.",
            ""
        ]
    }
    return pd.DataFrame(data)


@pytest.fixture
def temp_excel_file(sample_excel_data):
    """创建临时Excel文件"""
    with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp_file:
        tmp_file_name = tmp_file.name
    
    # 在with块外写入文件，确保文件句柄已关闭
    sample_excel_data.to_excel(tmp_file_name, index=False)
    yield tmp_file_name
    
    # 清理临时文件，添加重试机制处理Windows文件锁定
    try:
        if os.path.exists(tmp_file_name):
            os.unlink(tmp_file_name)
    except PermissionError:
        # Windows文件锁定，稍后重试
        import time
        time.sleep(0.1)
        try:
            if os.path.exists(tmp_file_name):
                os.unlink(tmp_file_name)
        except:
            # 如果仍然失败，忽略错误（临时文件会被系统清理）
            pass


@pytest.fixture
def excel_processor():
    """Excel处理器实例"""
    return ExcelProcessor()


@pytest.fixture
def language_detector():
    """语言检测器实例"""
    return LanguageDetector()


@pytest.fixture
def claims_parser():
    """权利要求解析器实例"""
    return ClaimsParser()


@pytest.fixture
def claims_classifier():
    """权利要求分类器实例"""
    return ClaimsClassifier()


@pytest.fixture
def processing_service():
    """处理服务实例"""
    return ProcessingService()


@pytest.fixture
def sample_claim_info():
    """示例权利要求信息"""
    return ClaimInfo(
        claim_number=1,
        claim_type="independent",
        claim_text="一种计算机系统，其特征在于包括处理器和存储器。",
        language="zh",
        referenced_claims=[],
        original_text="1. 一种计算机系统，其特征在于包括处理器和存储器。",
        confidence_score=0.9
    )


@pytest.fixture
def multilingual_claims_text():
    """多语言权利要求文本"""
    return """
    1. 一种计算机系统，其特征在于包括处理器和存储器。
    2. 根据权利要求1所述的计算机系统，其特征在于所述处理器为多核处理器。
    
    1. A computer system comprising a processor and memory.
    2. The computer system of claim 1, wherein the processor is a multi-core processor.
    """