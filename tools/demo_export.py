#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
演示导出服务功能

展示如何使用导出服务导出处理结果到不同格式。
"""

import os
import sys
sys.path.insert(0, '.')

from patent_claims_processor.services import ProcessingService, ExportService
from patent_claims_processor.models import ProcessedClaims, ClaimInfo, ProcessingError


def main():
    print("=" * 60)
    print("专利权利要求导出服务演示")
    print("=" * 60)
    print()
    
    # 创建示例处理结果
    claims = [
        ClaimInfo(
            claim_number=1,
            claim_type='independent',
            claim_text='一种计算机系统，其特征在于包括处理器和存储器。',
            language='zh',
            referenced_claims=[],
            original_text='1. 一种计算机系统，其特征在于包括处理器和存储器。',
            confidence_score=0.95
        ),
        ClaimInfo(
            claim_number=2,
            claim_type='dependent',
            claim_text='根据权利要求1所述的计算机系统，其特征在于所述处理器为多核处理器。',
            language='zh',
            referenced_claims=[1],
            original_text='2. 根据权利要求1所述的计算机系统，其特征在于所述处理器为多核处理器。',
            confidence_score=0.90
        ),
        ClaimInfo(
            claim_number=3,
            claim_type='independent',
            claim_text='A computer system comprising a processor and memory.',
            language='en',
            referenced_claims=[],
            original_text='3. A computer system comprising a processor and memory.',
            confidence_score=0.92
        ),
        ClaimInfo(
            claim_number=4,
            claim_type='dependent',
            claim_text='The computer system of claim 3, wherein the processor is a multi-core processor.',
            language='en',
            referenced_claims=[3],
            original_text='4. The computer system of claim 3, wherein the processor is a multi-core processor.',
            confidence_score=0.88
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
    
    processed_claims = ProcessedClaims(
        total_cells_processed=10,
        total_claims_extracted=4,
        language_distribution={'zh': 2, 'en': 2},
        independent_claims_count=2,
        dependent_claims_count=2,
        processing_errors=errors,
        claims_data=claims
    )
    
    # 创建导出服务
    export_service = ExportService(output_dir="output")
    
    print("1. 导出到JSON格式...")
    json_path = export_service.export_to_json(processed_claims, "demo_export.json")
    print(f"   ✓ JSON文件已导出: {json_path}")
    print()
    
    print("2. 导出到Excel格式...")
    excel_path = export_service.export_to_excel(processed_claims, "demo_export.xlsx")
    print(f"   ✓ Excel文件已导出: {excel_path}")
    print()
    
    print("3. 生成处理报告...")
    report = export_service.generate_processing_report(processed_claims)
    print(report)
    print()
    
    print("4. 导出报告到文件...")
    report_path = export_service.export_report_to_file(processed_claims, "demo_report.txt")
    print(f"   ✓ 报告文件已导出: {report_path}")
    print()
    
    print("5. 获取输出摘要...")
    summary = export_service.get_output_summary(processed_claims)
    print("   摘要信息:")
    for key, value in summary.items():
        print(f"     - {key}: {value}")
    print()
    
    print("=" * 60)
    print("演示完成！")
    print("=" * 60)
    print()
    print("生成的文件:")
    print(f"  - {json_path}")
    print(f"  - {excel_path}")
    print(f"  - {report_path}")
    print()


if __name__ == "__main__":
    main()
