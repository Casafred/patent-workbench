"""
测试导出服务功能

验证结构化数据输出和多格式导出功能。
"""

import os
import json
import pytest
import pandas as pd
from datetime import datetime

from patent_claims_processor.services.export_service import ExportService
from patent_claims_processor.models import ProcessedClaims, ClaimInfo, ProcessingError


@pytest.fixture
def export_service(tmp_path):
    """创建导出服务实例"""
    output_dir = str(tmp_path / "output")
    return ExportService(output_dir=output_dir)


@pytest.fixture
def sample_processed_claims():
    """创建示例处理结果"""
    claims = [
        ClaimInfo(
            claim_number=1,
            claim_type='independent',
            claim_text='一种测试装置，包括...',
            language='zh',
            referenced_claims=[],
            original_text='1. 一种测试装置，包括...',
            confidence_score=0.95
        ),
        ClaimInfo(
            claim_number=2,
            claim_type='dependent',
            claim_text='根据权利要求1所述的装置，其特征在于...',
            language='zh',
            referenced_claims=[1],
            original_text='2. 根据权利要求1所述的装置，其特征在于...',
            confidence_score=0.90
        ),
        ClaimInfo(
            claim_number=3,
            claim_type='independent',
            claim_text='A testing device comprising...',
            language='en',
            referenced_claims=[],
            original_text='3. A testing device comprising...',
            confidence_score=0.92
        )
    ]
    
    errors = [
        ProcessingError(
            error_type='cell_parsing_warning',
            cell_index=5,
            error_message='单元格包含文本但未能识别权利要求格式',
            suggested_action='请检查文本格式是否符合权利要求标准',
            severity='warning'
        )
    ]
    
    return ProcessedClaims(
        total_cells_processed=10,
        total_claims_extracted=3,
        language_distribution={'zh': 2, 'en': 1},
        independent_claims_count=2,
        dependent_claims_count=1,
        processing_errors=errors,
        claims_data=claims
    )


class TestExportService:
    """测试导出服务"""
    
    def test_export_to_json_creates_file(self, export_service, sample_processed_claims):
        """测试JSON导出创建文件"""
        # 导出到JSON
        output_path = export_service.export_to_json(sample_processed_claims, "test_output.json")
        
        # 验证文件存在
        assert os.path.exists(output_path)
        assert output_path.endswith('.json')
    
    def test_export_to_json_structure(self, export_service, sample_processed_claims):
        """测试JSON导出结构完整性 - 需求 6.1, 6.2"""
        # 导出到JSON
        output_path = export_service.export_to_json(sample_processed_claims, "test_structure.json")
        
        # 读取JSON文件
        with open(output_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # 验证顶层结构
        assert 'metadata' in data
        assert 'summary' in data
        assert 'claims' in data
        assert 'errors' in data
        
        # 验证metadata
        assert 'export_time' in data['metadata']
        assert 'version' in data['metadata']
        
        # 验证summary包含所有必需字段
        summary = data['summary']
        assert summary['total_cells_processed'] == 10
        assert summary['total_claims_extracted'] == 3
        assert summary['independent_claims_count'] == 2
        assert summary['dependent_claims_count'] == 1
        assert 'language_distribution' in summary
        assert summary['language_distribution'] == {'zh': 2, 'en': 1}
        
        # 验证claims数据
        assert len(data['claims']) == 3
        for claim in data['claims']:
            assert 'claim_number' in claim
            assert 'claim_type' in claim
            assert 'claim_text' in claim
            assert 'language' in claim
            assert 'referenced_claims' in claim
            assert 'original_text' in claim
            assert 'confidence_score' in claim
        
        # 验证errors数据
        assert len(data['errors']) == 1
        error = data['errors'][0]
        assert 'error_type' in error
        assert 'cell_index' in error
        assert 'error_message' in error
        assert 'suggested_action' in error
        assert 'severity' in error
    
    def test_export_to_excel_creates_file(self, export_service, sample_processed_claims):
        """测试Excel导出创建文件"""
        # 导出到Excel
        output_path = export_service.export_to_excel(sample_processed_claims, "test_output.xlsx")
        
        # 验证文件存在
        assert os.path.exists(output_path)
        assert output_path.endswith('.xlsx')
    
    def test_export_to_excel_sheets(self, export_service, sample_processed_claims):
        """测试Excel导出包含所有工作表 - 需求 6.3"""
        # 导出到Excel
        output_path = export_service.export_to_excel(sample_processed_claims, "test_sheets.xlsx")
        
        # 读取Excel文件
        excel_file = pd.ExcelFile(output_path)
        
        # 验证工作表存在
        assert '权利要求详情' in excel_file.sheet_names
        assert '处理统计' in excel_file.sheet_names
        assert '错误报告' in excel_file.sheet_names
        
        # 验证权利要求详情工作表
        claims_df = pd.read_excel(output_path, sheet_name='权利要求详情')
        assert len(claims_df) == 3
        assert '序号' in claims_df.columns
        assert '类型' in claims_df.columns
        assert '语言' in claims_df.columns
        assert '引用权利要求' in claims_df.columns
        assert '权利要求文本' in claims_df.columns
        
        # 验证处理统计工作表
        stats_df = pd.read_excel(output_path, sheet_name='处理统计')
        assert len(stats_df) > 0
        assert '统计项' in stats_df.columns
        assert '数值' in stats_df.columns
        
        # 验证错误报告工作表
        errors_df = pd.read_excel(output_path, sheet_name='错误报告')
        assert len(errors_df) == 1
        assert '错误类型' in errors_df.columns
        assert '错误信息' in errors_df.columns
    
    def test_generate_processing_report(self, export_service, sample_processed_claims):
        """测试生成处理报告 - 需求 6.4"""
        # 生成报告
        report = export_service.generate_processing_report(sample_processed_claims)
        
        # 验证报告包含关键信息
        assert '专利权利要求处理报告' in report
        assert '处理统计' in report
        assert '语言分布' in report
        assert '错误报告' in report
        assert '权利要求概览' in report
        
        # 验证统计数据在报告中
        assert '处理单元格总数: 10' in report
        assert '提取权利要求总数: 3' in report
        assert '独立权利要求数量: 2' in report
        assert '从属权利要求数量: 1' in report
    
    def test_export_report_to_file(self, export_service, sample_processed_claims):
        """测试导出报告到文件"""
        # 导出报告
        output_path = export_service.export_report_to_file(sample_processed_claims, "test_report.txt")
        
        # 验证文件存在
        assert os.path.exists(output_path)
        assert output_path.endswith('.txt')
        
        # 读取文件内容
        with open(output_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 验证内容
        assert '专利权利要求处理报告' in content
        assert '处理统计' in content
    
    def test_get_output_summary(self, export_service, sample_processed_claims):
        """测试获取输出摘要"""
        # 获取摘要
        summary = export_service.get_output_summary(sample_processed_claims)
        
        # 验证摘要包含所有必需字段
        assert summary['total_cells'] == 10
        assert summary['total_claims'] == 3
        assert summary['independent_claims'] == 2
        assert summary['dependent_claims'] == 1
        assert 'zh' in summary['languages']
        assert 'en' in summary['languages']
        assert summary['error_count'] == 1
        assert summary['has_errors'] is True
        assert 'success_rate' in summary
    
    def test_auto_filename_generation(self, export_service, sample_processed_claims):
        """测试自动文件名生成"""
        # 不指定文件名导出JSON
        json_path = export_service.export_to_json(sample_processed_claims)
        assert os.path.exists(json_path)
        assert 'patent_claims_' in os.path.basename(json_path)
        
        # 不指定文件名导出Excel
        excel_path = export_service.export_to_excel(sample_processed_claims)
        assert os.path.exists(excel_path)
        assert 'patent_claims_' in os.path.basename(excel_path)
    
    def test_success_rate_calculation(self, export_service):
        """测试成功率计算"""
        # 创建无错误的结果
        claims_no_errors = ProcessedClaims(
            total_cells_processed=10,
            total_claims_extracted=10,
            language_distribution={'zh': 10},
            independent_claims_count=5,
            dependent_claims_count=5,
            processing_errors=[],
            claims_data=[]
        )
        
        summary = export_service.get_output_summary(claims_no_errors)
        assert summary['success_rate'] == 1.0
        
        # 创建有严重错误的结果
        claims_with_errors = ProcessedClaims(
            total_cells_processed=10,
            total_claims_extracted=5,
            language_distribution={'zh': 5},
            independent_claims_count=3,
            dependent_claims_count=2,
            processing_errors=[
                ProcessingError(
                    error_type='critical_error',
                    cell_index=i,
                    error_message='严重错误',
                    suggested_action='修复',
                    severity='critical'
                ) for i in range(3)
            ],
            claims_data=[]
        )
        
        summary_with_errors = export_service.get_output_summary(claims_with_errors)
        assert summary_with_errors['success_rate'] == 0.7  # (10-3)/10
    
    def test_language_distribution_in_output(self, export_service, sample_processed_claims):
        """测试输出中包含语言版本标识 - 需求 6.3"""
        # 导出到JSON
        json_path = export_service.export_to_json(sample_processed_claims, "test_lang.json")
        
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # 验证语言分布信息
        assert 'language_distribution' in data['summary']
        assert data['summary']['language_distribution'] == {'zh': 2, 'en': 1}
        
        # 验证每个权利要求都有语言标识
        for claim in data['claims']:
            assert 'language' in claim
            assert claim['language'] in ['zh', 'en']
    
    def test_empty_claims_export(self, export_service):
        """测试空结果导出"""
        empty_claims = ProcessedClaims(
            total_cells_processed=0,
            total_claims_extracted=0,
            language_distribution={},
            independent_claims_count=0,
            dependent_claims_count=0,
            processing_errors=[],
            claims_data=[]
        )
        
        # 导出JSON
        json_path = export_service.export_to_json(empty_claims, "empty.json")
        assert os.path.exists(json_path)
        
        # 导出Excel
        excel_path = export_service.export_to_excel(empty_claims, "empty.xlsx")
        assert os.path.exists(excel_path)
        
        # 生成报告
        report = export_service.generate_processing_report(empty_claims)
        assert '专利权利要求处理报告' in report


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
