"""
核心数据模型和接口定义

定义了专利权利要求处理系统中使用的所有数据结构和接口。
"""

from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple
from abc import ABC, abstractmethod


@dataclass
class ClaimInfo:
    """权利要求信息数据结构"""
    claim_number: int
    claim_type: str  # "independent" or "dependent"
    claim_text: str
    language: str
    referenced_claims: List[int]
    original_text: str
    confidence_score: float


@dataclass
class ProcessingResult:
    """单元格处理结果数据结构"""
    cell_index: int
    claims: List[ClaimInfo]
    selected_language: str
    processing_errors: List[str]
    processing_time: float


@dataclass
class ProcessingError:
    """处理错误信息数据结构"""
    error_type: str
    cell_index: int
    error_message: str
    suggested_action: str
    severity: str  # "warning", "error", "critical"


@dataclass
class ExcelInputData:
    """Excel输入数据配置"""
    file_path: str
    sheet_name: str
    column_name: str
    start_row: int = 1
    end_row: Optional[int] = None


@dataclass
class ProcessedClaims:
    """完整的处理结果数据结构"""
    total_cells_processed: int
    total_claims_extracted: int
    language_distribution: Dict[str, int]
    independent_claims_count: int
    dependent_claims_count: int
    processing_errors: List[ProcessingError]
    claims_data: List[ClaimInfo]


# 抽象接口定义

class ExcelProcessorInterface(ABC):
    """Excel处理器接口"""
    
    @abstractmethod
    def read_excel_file(self, file_path: str, sheet_name: str = None) -> 'pd.DataFrame':
        """读取Excel文件"""
        pass
    
    @abstractmethod
    def get_sheet_names(self, file_path: str) -> List[str]:
        """获取工作表名称列表"""
        pass
    
    @abstractmethod
    def get_column_data(self, df: 'pd.DataFrame', column_name: str) -> List[str]:
        """获取指定列的数据"""
        pass
    
    @abstractmethod
    def validate_excel_file(self, file_path: str) -> bool:
        """验证Excel文件格式"""
        pass


class LanguageDetectorInterface(ABC):
    """语言检测器接口"""
    
    @abstractmethod
    def detect_language(self, text: str) -> str:
        """检测文本语言"""
        pass
    
    @abstractmethod
    def select_preferred_version(self, text_segments: List[str]) -> str:
        """选择优先语言版本"""
        pass
    
    @abstractmethod
    def identify_language_boundaries(self, text: str) -> List[Tuple[int, int, str]]:
        """识别语言边界"""
        pass
    
    @abstractmethod
    def get_language_priority_score(self, language: str) -> int:
        """获取语言优先级分数"""
        pass


class ClaimsParserInterface(ABC):
    """权利要求解析器接口"""
    
    @abstractmethod
    def extract_claim_numbers(self, text: str) -> List[int]:
        """提取权利要求序号"""
        pass
    
    @abstractmethod
    def split_claims_by_numbers(self, text: str) -> Dict[int, str]:
        """按序号分割权利要求文本"""
        pass
    
    @abstractmethod
    def detect_sequence_restart(self, claim_numbers: List[int]) -> List[int]:
        """检测序号重启"""
        pass
    
    @abstractmethod
    def normalize_claim_text(self, text: str) -> str:
        """标准化权利要求文本"""
        pass


class ClaimsClassifierInterface(ABC):
    """权利要求分类器接口"""
    
    @abstractmethod
    def classify_claim_type(self, claim_text: str, language: str) -> str:
        """分类权利要求类型"""
        pass
    
    @abstractmethod
    def extract_referenced_claims(self, claim_text: str, language: str) -> List[int]:
        """提取引用的权利要求"""
        pass
    
    @abstractmethod
    def get_reference_keywords(self, language: str) -> List[str]:
        """获取引用关键词"""
        pass
    
    @abstractmethod
    def validate_claim_dependencies(self, claims: Dict[int, ClaimInfo]) -> List[str]:
        """验证权利要求依赖关系"""
        pass


class ProcessingServiceInterface(ABC):
    """处理服务接口"""
    
    @abstractmethod
    def process_excel_file(self, file_path: str, column_name: str) -> ProcessingResult:
        """处理Excel文件"""
        pass
    
    @abstractmethod
    def process_single_cell(self, cell_text: str) -> List[ClaimInfo]:
        """处理单个单元格"""
        pass
    
    @abstractmethod
    def generate_processing_report(self, results: List[ProcessingResult]) -> 'ProcessingReport':
        """生成处理报告"""
        pass
    
    @abstractmethod
    def validate_processing_results(self, results: List[ClaimInfo]) -> List['ValidationError']:
        """验证处理结果"""
        pass


# 错误处理相关类

@dataclass
class ValidationError:
    """验证错误"""
    error_code: str
    message: str
    claim_number: Optional[int] = None
    severity: str = "error"


@dataclass
class ProcessingReport:
    """处理报告"""
    start_time: str
    end_time: str
    total_processing_time: float
    processed_claims: ProcessedClaims
    validation_errors: List[ValidationError]
    performance_metrics: Dict[str, float]