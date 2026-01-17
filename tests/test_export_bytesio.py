"""
测试BytesIO导出功能
"""
import sys
import json
from io import BytesIO
from patent_claims_processor.models import ProcessedClaims, ClaimInfo, ProcessingError
from patent_claims_processor.services import ExportService

def create_test_data():
    """创建测试数据"""
    claims = [
        ClaimInfo(
            claim_number=1,
            claim_type='independent',
            claim_text='一种智能手机，包括处理器和显示屏。',
            language='中文',
            referenced_claims=[],
            original_text='1. 一种智能手机，包括处理器和显示屏。',
            confidence_score=0.95
        ),
        ClaimInfo(
            claim_number=2,
            claim_type='dependent',
            claim_text='根据权利要求1所述的智能手机，其特征在于还包括摄像头。',
            language='中文',
            referenced_claims=[1],
            original_text='2. 根据权利要求1所述的智能手机，其特征在于还包括摄像头。',
            confidence_score=0.92
        )
    ]
    
    errors = [
        ProcessingError(
            error_type='warning',
            cell_index=5,
            error_message='权利要求编号不连续',
            suggested_action='检查原始文件',
            severity='warning'
        )
    ]
    
    result = ProcessedClaims(
        total_cells_processed=10,
        total_claims_extracted=2,
        language_distribution={'中文': 2},
        independent_claims_count=1,
        dependent_claims_count=1,
        processing_errors=errors,
        claims_data=claims
    )
    
    return result

def test_excel_export():
    """测试Excel导出"""
    print("测试Excel导出...")
    
    try:
        export_service = ExportService()
        test_data = create_test_data()
        
        # 生成Excel BytesIO
        output_buffer, filename = export_service.generate_excel_bytesio(test_data)
        
        # 验证
        file_size = len(output_buffer.getvalue())
        print(f"✓ Excel文件生成成功")
        print(f"  文件名: {filename}")
        print(f"  大小: {file_size} bytes")
        
        # 尝试用openpyxl读取验证
        import openpyxl
        output_buffer.seek(0)
        wb = openpyxl.load_workbook(output_buffer)
        print(f"  工作表: {wb.sheetnames}")
        print(f"✓ Excel文件验证成功 - 可以被openpyxl读取")
        
        return True
    except Exception as e:
        print(f"✗ Excel导出失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_json_export():
    """测试JSON导出"""
    print("\n测试JSON导出...")
    
    try:
        export_service = ExportService()
        test_data = create_test_data()
        
        # 生成JSON BytesIO
        output_buffer, filename = export_service.generate_json_bytesio(test_data)
        
        # 验证
        file_size = len(output_buffer.getvalue())
        print(f"✓ JSON文件生成成功")
        print(f"  文件名: {filename}")
        print(f"  大小: {file_size} bytes")
        
        # 尝试解析JSON验证
        output_buffer.seek(0)
        json_data = json.loads(output_buffer.read().decode('utf-8'))
        print(f"  包含字段: {list(json_data.keys())}")
        print(f"  权利要求数量: {len(json_data['claims'])}")
        print(f"✓ JSON文件验证成功 - 可以被解析")
        
        # 验证中文字符
        if '智能手机' in json_data['claims'][0]['claim_text']:
            print(f"✓ 中文字符保留正确")
        
        return True
    except Exception as e:
        print(f"✗ JSON导出失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("BytesIO导出功能测试")
    print("=" * 60)
    
    excel_ok = test_excel_export()
    json_ok = test_json_export()
    
    print("\n" + "=" * 60)
    if excel_ok and json_ok:
        print("✓ 所有测试通过")
        sys.exit(0)
    else:
        print("✗ 部分测试失败")
        sys.exit(1)
