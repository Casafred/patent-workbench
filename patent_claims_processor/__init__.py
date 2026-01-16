"""
专利权利要求处理器

一个用于解析Excel文件中多语言专利权利要求文本的Python包。
支持自动语言检测、权利要求分类和结构化数据输出。
"""

__version__ = "1.0.0"
__author__ = "Patent Claims Processor Team"

from .models import ClaimInfo, ProcessingResult, ProcessingError, ExcelInputData, ProcessedClaims
from .processors import ExcelProcessor, LanguageDetector, ClaimsParser, ClaimsClassifier
from .services import ProcessingService

__all__ = [
    "ClaimInfo",
    "ProcessingResult", 
    "ProcessingError",
    "ExcelInputData",
    "ProcessedClaims",
    "ExcelProcessor",
    "LanguageDetector",
    "ClaimsParser", 
    "ClaimsClassifier",
    "ProcessingService"
]