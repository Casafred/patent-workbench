"""
测试导出功能
"""
import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from patent_claims_processor.services import ExportService
from patent_claims_processor.models import ProcessedClaims, ClaimInfo, ProcessingError

def create_test_data():
    """创建测试数据"""
    claims = [
        ClaimInfo(
            claim_number=1,
            claim_type='independent',
            claim_text='一种智能手机，其特征在于包括处理器和存储器。',
            language='zh',
            referenced_claims=[],
            original_text='1. 一种智能手机，其特征在于包括处理器和存储器。',
            confidence_score=0.95
        ),
        ClaimInfo(
            claim_number=2,
            claim_type='dependent',
            claim_text='根据权利要求1所述的智能手机，其特征在于还包括显示屏。',
            language='zh',
            referenced_claims=[1],
            original_text='2. 根据权利要求1所述的智能手机，其特征在于还包括显示屏。',
            confidence_score=0.92
        ),
        ClaimInfo(
            claim_number=3,
            claim_type='independent',
            claim_text='A smartphone comprising a processor and memory.',
            language='en',
            referenced_claims=[],
            original_text='3. A smartphone comprising a processor and memory.',
            confidence_score=0.93
        )
    ]
    
    errors = [
        ProcessingError(
            error_type='parsing_warning',
            cell_index=5,
            error_message='单元格格式不规范',
            suggested_action='检查文本格式',
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

def test_export_excel():
    """测试Excel导出"""
    print("测试Excel导出...")
    
    try:
        export_service = ExportService()
        test_data = create_test_data()
        
        output_path = export_service.export_to_excel(test_data, 'test_export.xlsx')
        
        # 检查文件是否存在
        if os.path.exists(output_path):
            file_size = os.path.getsize(output_path)
            print(f"✓ Excel文件已创建: {output_path}")
            print(f"  文件大小: {file_size} 字节")
            
            # 尝试读取文件验证
            import pandas as pd
            try:
                df = pd.read_excel(output_path, sheet_name='权利要求详情')
                print(f"  权利要求详情工作表行数: {len(df)}")
                print(f"  列名: {list(df.columns)}")
                print("✓ Excel文件可以正常读取")
                return True
            except Exception as e:
                print(f"✗ Excel文件无法读取: {e}")
                return False
        else:
            print("✗ Excel文件未创建")
            return False
            
    except Exception as e:
        print(f"✗ Excel导出失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_export_json():
    """测试JSON导出"""
    print("\n测试JSON导出...")
    
    try:
        export_service = ExportService()
        test_data = create_test_data()
        
        output_path = export_service.export_to_json(test_data, 'test_export.json')
        
        # 检查文件是否存在
        if os.path.exists(output_path):
            file_size = os.path.getsize(output_path)
            print(f"✓ JSON文件已创建: {output_path}")
            print(f"  文件大小: {file_size} 字节")
            
            # 尝试读取文件验证
            import json
            try:
                with open(output_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                print(f"  权利要求数量: {len(data.get('claims', []))}")
                print(f"  元数据: {data.get('metadata', {})}")
                print("✓ JSON文件可以正常读取")
                return True
            except Exception as e:
                print(f"✗ JSON文件无法读取: {e}")
                return False
        else:
            print("✗ JSON文件未创建")
            return False
            
    except Exception as e:
        print(f"✗ JSON导出失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_export_report():
    """测试报告导出"""
    print("\n测试报告导出...")
    
    try:
        export_service = ExportService()
        test_data = create_test_data()
        
        report_text = export_service.generate_processing_report(test_data)
        
        print(f"✓ 报告已生成")
        print(f"  报告长度: {len(report_text)} 字符")
        print("\n报告内容预览:")
        print("-" * 60)
        print(report_text[:500])
        print("-" * 60)
        
        # 测试导出到文件
        output_path = export_service.export_report_to_file(test_data, 'test_report.txt')
        
        if os.path.exists(output_path):
            file_size = os.path.getsize(output_path)
            print(f"\n✓ 报告文件已创建: {output_path}")
            print(f"  文件大小: {file_size} 字节")
            return True
        else:
            print("\n✗ 报告文件未创建")
            return False
            
    except Exception as e:
        print(f"✗ 报告生成失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_file_content_integrity():
    """测试文件内容完整性"""
    print("\n测试文件内容完整性...")
    
    try:
        export_service = ExportService()
        test_data = create_test_data()
        
        # 导出Excel
        excel_path = export_service.export_to_excel(test_data, 'integrity_test.xlsx')
        
        # 读取文件内容到内存
        with open(excel_path, 'rb') as f:
            file_content = f.read()
        
        print(f"✓ 文件内容已读取到内存")
        print(f"  内容大小: {len(file_content)} 字节")
        
        # 删除原文件
        os.remove(excel_path)
        print(f"✓ 原文件已删除")
        
        # 尝试从内存写回文件
        test_output_path = os.path.join(export_service.output_dir, 'integrity_test_restored.xlsx')
        with open(test_output_path, 'wb') as f:
            f.write(file_content)
        
        print(f"✓ 文件已从内存恢复: {test_output_path}")
        
        # 验证恢复的文件
        import pandas as pd
        try:
            df = pd.read_excel(test_output_path, sheet_name='权利要求详情')
            print(f"✓ 恢复的文件可以正常读取")
            print(f"  行数: {len(df)}")
            return True
        except Exception as e:
            print(f"✗ 恢复的文件无法读取: {e}")
            return False
            
    except Exception as e:
        print(f"✗ 完整性测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("导出功能测试")
    print("=" * 60)
    
    results = []
    
    results.append(("Excel导出", test_export_excel()))
    results.append(("JSON导出", test_export_json()))
    results.append(("报告导出", test_export_report()))
    results.append(("文件完整性", test_file_content_integrity()))
    
    print("\n" + "=" * 60)
    print("测试结果汇总")
    print("=" * 60)
    
    for test_name, result in results:
        status = "✓ 通过" if result else "✗ 失败"
        print(f"{test_name}: {status}")
    
    all_passed = all(result for _, result in results)
    
    print("\n" + "=" * 60)
    if all_passed:
        print("所有测试通过 ✓")
    else:
        print("部分测试失败 ✗")
    print("=" * 60)
