#!/usr/bin/env python3
"""
专利权利要求处理器演示脚本

展示基本功能的使用方法。
"""

import pandas as pd
import tempfile
import os

from patent_claims_processor import ProcessingService
from patent_claims_processor.processors import (
    ExcelProcessor, LanguageDetector, ClaimsParser, ClaimsClassifier
)


def create_demo_excel():
    """创建演示用的Excel文件"""
    data = {
        'Patent_Claims': [
            "1. 一种计算机系统，其特征在于包括处理器和存储器。\n2. 根据权利要求1所述的计算机系统，其特征在于所述处理器为多核处理器。",
            "1. A computer system comprising a processor and memory.\n2. The computer system of claim 1, wherein the processor is a multi-core processor.",
            "1. 一种数据处理方法，包括以下步骤：\n   a) 接收输入数据；\n   b) 处理数据；\n   c) 输出结果。\n2. 根据权利要求1所述的方法，其中所述处理数据步骤包括数据验证。",
        ]
    }
    
    df = pd.DataFrame(data)
    
    # 创建临时Excel文件
    with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp_file:
        df.to_excel(tmp_file.name, index=False)
        return tmp_file.name


def demo_individual_components():
    """演示各个组件的功能"""
    print("=== 专利权利要求处理器组件演示 ===\n")
    
    # 1. 语言检测演示
    print("1. 语言检测演示:")
    detector = LanguageDetector()
    
    test_texts = [
        "一种计算机系统，其特征在于包括处理器和存储器。",
        "A computer system comprising a processor and memory.",
        "123456"
    ]
    
    for text in test_texts:
        language = detector.detect_language(text)
        print(f"   文本: '{text[:30]}...' -> 语言: {language}")
    
    print()
    
    # 2. 权利要求解析演示
    print("2. 权利要求解析演示:")
    parser = ClaimsParser()
    
    claims_text = "1. 一种计算机系统，其特征在于包括处理器和存储器。\n2. 根据权利要求1所述的计算机系统，其特征在于所述处理器为多核处理器。"
    
    numbers = parser.extract_claim_numbers(claims_text)
    print(f"   提取的序号: {numbers}")
    
    claims_dict = parser.split_claims_by_numbers(claims_text)
    for num, text in claims_dict.items():
        print(f"   权利要求 {num}: {text[:50]}...")
    
    print()
    
    # 3. 权利要求分类演示
    print("3. 权利要求分类演示:")
    classifier = ClaimsClassifier()
    
    test_claims = [
        ("一种计算机系统，其特征在于包括处理器和存储器。", "zh"),
        ("根据权利要求1所述的计算机系统，其特征在于所述处理器为多核处理器。", "zh"),
        ("A computer system comprising a processor and memory.", "en"),
        ("The computer system of claim 1, wherein the processor is a multi-core processor.", "en")
    ]
    
    for claim_text, language in test_claims:
        claim_type = classifier.classify_claim_type(claim_text, language)
        references = classifier.extract_referenced_claims(claim_text, language)
        print(f"   文本: '{claim_text[:40]}...'")
        print(f"   类型: {claim_type}, 引用: {references}")
        print()


def demo_processing_service():
    """演示完整的处理服务"""
    print("=== 完整处理服务演示 ===\n")
    
    # 创建演示Excel文件
    excel_file = create_demo_excel()
    
    try:
        # 创建处理服务
        service = ProcessingService()
        
        # 处理Excel文件
        print("处理Excel文件...")
        result = service.process_excel_file(
            file_path=excel_file,
            column_name="Patent_Claims"
        )
        
        # 显示处理结果
        print(f"处理统计:")
        print(f"  - 处理单元格数: {result.total_cells_processed}")
        print(f"  - 提取权利要求数: {result.total_claims_extracted}")
        print(f"  - 独立权利要求: {result.independent_claims_count}")
        print(f"  - 从属权利要求: {result.dependent_claims_count}")
        print(f"  - 语言分布: {result.language_distribution}")
        print(f"  - 处理错误数: {len(result.processing_errors)}")
        
        print("\n详细权利要求信息:")
        for i, claim in enumerate(result.claims_data[:5]):  # 只显示前5个
            print(f"  权利要求 {claim.claim_number}:")
            print(f"    类型: {claim.claim_type}")
            print(f"    语言: {claim.language}")
            print(f"    引用: {claim.referenced_claims}")
            print(f"    内容: {claim.claim_text[:60]}...")
            print(f"    置信度: {claim.confidence_score:.2f}")
            print()
        
        if len(result.claims_data) > 5:
            print(f"  ... 还有 {len(result.claims_data) - 5} 个权利要求")
        
    finally:
        # 清理临时文件
        if os.path.exists(excel_file):
            os.unlink(excel_file)


if __name__ == "__main__":
    print("专利权利要求处理器演示\n")
    
    demo_individual_components()
    print("\n" + "="*50 + "\n")
    demo_processing_service()
    
    print("\n演示完成！")