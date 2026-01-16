"""
中断恢复功能演示

演示如何使用ProcessingService的中断恢复功能。
"""

import os
import tempfile
import pandas as pd
from patent_claims_processor.services.processing_service import ProcessingService


def demo_basic_recovery():
    """演示基本的中断恢复功能"""
    print("=" * 60)
    print("演示1: 基本中断恢复功能")
    print("=" * 60)
    
    # 创建测试Excel文件
    with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp_file:
        data = {
            'Claims': [
                "1. 一种计算机系统，包括处理器和存储器。\n2. 根据权利要求1所述的计算机系统。",
                "1. 一种方法，包括以下步骤。\n2. 根据权利要求1所述的方法。",
                "1. 一种装置，包括控制单元。\n2. 根据权利要求1所述的装置。"
            ]
        }
        df = pd.DataFrame(data)
        df.to_excel(tmp_file.name, index=False)
        temp_file_path = tmp_file.name
    
    recovery_file = "demo_recovery.json"
    
    try:
        # 步骤1: 启用恢复功能的处理服务
        print("\n步骤1: 创建启用恢复功能的处理服务")
        service = ProcessingService(enable_recovery=True, recovery_file=recovery_file)
        print(f"✓ 恢复功能已启用，恢复文件: {recovery_file}")
        
        # 步骤2: 处理Excel文件
        print("\n步骤2: 处理Excel文件")
        result = service.process_excel_file(temp_file_path, 'Claims')
        
        print(f"✓ 处理完成")
        print(f"  - 处理单元格数: {result.total_cells_processed}")
        print(f"  - 提取权利要求数: {result.total_claims_extracted}")
        print(f"  - 独立权利要求: {result.independent_claims_count}")
        print(f"  - 从属权利要求: {result.dependent_claims_count}")
        print(f"  - 语言分布: {result.language_distribution}")
        
        # 步骤3: 检查恢复文件状态
        print("\n步骤3: 检查恢复文件状态")
        if os.path.exists(recovery_file):
            print(f"⚠ 恢复文件仍然存在（异常情况）")
        else:
            print(f"✓ 恢复文件已自动清理（正常完成）")
        
    finally:
        # 清理
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
        if os.path.exists(recovery_file):
            os.remove(recovery_file)
    
    print("\n" + "=" * 60)


def demo_manual_recovery():
    """演示手动保存和恢复状态"""
    print("=" * 60)
    print("演示2: 手动保存和恢复状态")
    print("=" * 60)
    
    # 创建测试Excel文件
    with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp_file:
        data = {
            'Claims': [
                "1. 第一个专利的权利要求。",
                "1. 第二个专利的权利要求。",
                "1. 第三个专利的权利要求。"
            ]
        }
        df = pd.DataFrame(data)
        df.to_excel(tmp_file.name, index=False)
        temp_file_path = tmp_file.name
    
    recovery_file = "demo_manual_recovery.json"
    
    try:
        # 步骤1: 创建服务并模拟中断前的状态
        print("\n步骤1: 模拟处理中断")
        service1 = ProcessingService(enable_recovery=True, recovery_file=recovery_file)
        
        # 模拟已处理的数据
        from patent_claims_processor.models import ClaimInfo
        
        processed_claims = [
            ClaimInfo(
                claim_number=1,
                claim_type='independent',
                claim_text='第一个专利的权利要求。',
                language='zh',
                referenced_claims=[],
                original_text='1. 第一个专利的权利要求。',
                confidence_score=0.9
            )
        ]
        
        # 设置处理状态
        service1.processing_state.update({
            'file_path': temp_file_path,
            'column_name': 'Claims',
            'sheet_name': None,
            'current_cell_index': 0
        })
        
        # 保存状态（模拟中断前的自动保存）
        service1._save_processing_state(processed_claims, [], {'zh': 1})
        print(f"✓ 处理状态已保存到: {recovery_file}")
        print(f"  - 已处理权利要求数: {len(processed_claims)}")
        print(f"  - 当前单元格索引: 0")
        
        # 步骤2: 模拟程序重启，创建新服务实例
        print("\n步骤2: 模拟程序重启，尝试恢复")
        service2 = ProcessingService(enable_recovery=True, recovery_file=recovery_file)
        
        # 尝试恢复处理
        recovered_result = service2._try_resume_processing(
            temp_file_path,
            'Claims',
            None
        )
        
        if recovered_result:
            print(f"✓ 成功恢复处理状态")
            print(f"  - 恢复的权利要求数: {recovered_result.total_claims_extracted}")
            print(f"  - 独立权利要求: {recovered_result.independent_claims_count}")
            print(f"  - 从属权利要求: {recovered_result.dependent_claims_count}")
            print(f"  - 语言分布: {recovered_result.language_distribution}")
            
            # 显示恢复的权利要求详情
            print("\n  恢复的权利要求详情:")
            for claim in recovered_result.claims_data:
                print(f"    - 权利要求 {claim.claim_number}: {claim.claim_text[:30]}...")
        else:
            print("✗ 恢复失败")
        
        # 步骤3: 验证恢复文件已清理
        print("\n步骤3: 验证恢复文件清理")
        if os.path.exists(recovery_file):
            print(f"⚠ 恢复文件仍然存在")
        else:
            print(f"✓ 恢复文件已自动清理")
        
    finally:
        # 清理
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
        if os.path.exists(recovery_file):
            os.remove(recovery_file)
    
    print("\n" + "=" * 60)


def demo_recovery_with_resume_flag():
    """演示使用resume标志进行恢复"""
    print("=" * 60)
    print("演示3: 使用resume标志进行恢复")
    print("=" * 60)
    
    # 创建测试Excel文件
    with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp_file:
        data = {
            'Claims': [
                "1. 权利要求A。",
                "1. 权利要求B。"
            ]
        }
        df = pd.DataFrame(data)
        df.to_excel(tmp_file.name, index=False)
        temp_file_path = tmp_file.name
    
    recovery_file = "demo_resume_flag.json"
    
    try:
        # 步骤1: 创建并保存状态
        print("\n步骤1: 创建初始处理状态")
        service1 = ProcessingService(enable_recovery=True, recovery_file=recovery_file)
        
        from patent_claims_processor.models import ClaimInfo
        
        initial_claims = [
            ClaimInfo(
                claim_number=1,
                claim_type='independent',
                claim_text='权利要求A。',
                language='zh',
                referenced_claims=[],
                original_text='1. 权利要求A。',
                confidence_score=0.9
            )
        ]
        
        service1.processing_state.update({
            'file_path': temp_file_path,
            'column_name': 'Claims',
            'sheet_name': None,
            'current_cell_index': 0
        })
        
        service1._save_processing_state(initial_claims, [], {'zh': 1})
        print(f"✓ 初始状态已保存")
        
        # 步骤2: 使用resume=False（不恢复，重新处理）
        print("\n步骤2: 使用resume=False重新处理")
        service2 = ProcessingService(enable_recovery=True, recovery_file=recovery_file)
        result_no_resume = service2.process_excel_file(
            temp_file_path,
            'Claims',
            resume=False  # 不恢复
        )
        print(f"✓ 重新处理完成")
        print(f"  - 提取权利要求数: {result_no_resume.total_claims_extracted}")
        
        # 重新保存状态用于下一步测试
        service2.processing_state.update({
            'file_path': temp_file_path,
            'column_name': 'Claims',
            'sheet_name': None,
            'current_cell_index': 0
        })
        service2._save_processing_state(initial_claims, [], {'zh': 1})
        
        # 步骤3: 使用resume=True（尝试恢复）
        print("\n步骤3: 使用resume=True尝试恢复")
        service3 = ProcessingService(enable_recovery=True, recovery_file=recovery_file)
        result_with_resume = service3.process_excel_file(
            temp_file_path,
            'Claims',
            resume=True  # 尝试恢复
        )
        print(f"✓ 恢复处理完成")
        print(f"  - 提取权利要求数: {result_with_resume.total_claims_extracted}")
        
    finally:
        # 清理
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
        if os.path.exists(recovery_file):
            os.remove(recovery_file)
    
    print("\n" + "=" * 60)


def demo_recovery_statistics():
    """演示获取处理统计信息"""
    print("=" * 60)
    print("演示4: 获取处理统计信息")
    print("=" * 60)
    
    recovery_file = "demo_statistics.json"
    
    try:
        # 创建服务
        print("\n创建处理服务")
        service = ProcessingService(enable_recovery=True, recovery_file=recovery_file)
        
        # 获取初始统计信息
        print("\n初始统计信息:")
        stats = service.get_processing_statistics()
        for key, value in stats.items():
            print(f"  - {key}: {value}")
        
        # 模拟设置处理状态
        print("\n设置处理状态...")
        service.processing_state.update({
            'file_path': 'example.xlsx',
            'column_name': 'Claims',
            'sheet_name': 'Sheet1',
            'current_cell_index': 10
        })
        
        # 获取更新后的统计信息
        print("\n更新后的统计信息:")
        stats = service.get_processing_statistics()
        for key, value in stats.items():
            print(f"  - {key}: {value}")
        
    finally:
        if os.path.exists(recovery_file):
            os.remove(recovery_file)
    
    print("\n" + "=" * 60)


def main():
    """运行所有演示"""
    print("\n")
    print("╔" + "=" * 58 + "╗")
    print("║" + " " * 15 + "中断恢复功能演示" + " " * 15 + "║")
    print("╚" + "=" * 58 + "╝")
    print("\n")
    
    try:
        demo_basic_recovery()
        print("\n")
        
        demo_manual_recovery()
        print("\n")
        
        demo_recovery_with_resume_flag()
        print("\n")
        
        demo_recovery_statistics()
        print("\n")
        
        print("=" * 60)
        print("所有演示完成！")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n错误: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
