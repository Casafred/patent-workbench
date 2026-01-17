"""
测试导出功能的HTTP响应
"""
import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, Response
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
        )
    ]
    
    errors = []
    
    return ProcessedClaims(
        total_cells_processed=10,
        total_claims_extracted=2,
        language_distribution={'zh': 2},
        independent_claims_count=1,
        dependent_claims_count=1,
        processing_errors=errors,
        claims_data=claims
    )

def test_response_headers():
    """测试Response对象的头部设置"""
    print("测试Response对象头部设置...")
    
    try:
        export_service = ExportService()
        test_data = create_test_data()
        
        # 导出Excel
        output_path = export_service.export_to_excel(test_data, 'test_response.xlsx')
        
        # 读取文件内容
        with open(output_path, 'rb') as f:
            file_content = f.read()
        
        filename = os.path.basename(output_path)
        mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        
        # 创建Response对象
        response = Response(
            file_content,
            mimetype=mimetype,
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"',
                'Content-Type': mimetype,
                'Content-Length': str(len(file_content))
            }
        )
        
        print(f"✓ Response对象已创建")
        print(f"  Content-Type: {response.headers.get('Content-Type')}")
        print(f"  Content-Disposition: {response.headers.get('Content-Disposition')}")
        print(f"  Content-Length: {response.headers.get('Content-Length')}")
        print(f"  文件内容大小: {len(file_content)} 字节")
        
        # 验证响应数据
        response_data = response.get_data()
        print(f"  响应数据大小: {len(response_data)} 字节")
        
        if len(response_data) == len(file_content):
            print("✓ 响应数据大小匹配")
        else:
            print("✗ 响应数据大小不匹配")
            return False
        
        # 验证响应数据内容
        if response_data == file_content:
            print("✓ 响应数据内容匹配")
        else:
            print("✗ 响应数据内容不匹配")
            return False
        
        # 清理
        os.remove(output_path)
        
        return True
        
    except Exception as e:
        print(f"✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_flask_app_export():
    """测试完整的Flask应用导出流程"""
    print("\n测试Flask应用导出流程...")
    
    try:
        app = Flask(__name__)
        
        @app.route('/test_export')
        def test_export():
            export_service = ExportService()
            test_data = create_test_data()
            
            # 导出Excel
            output_path = export_service.export_to_excel(test_data, 'flask_test.xlsx')
            
            # 读取文件内容
            with open(output_path, 'rb') as f:
                file_content = f.read()
            
            filename = os.path.basename(output_path)
            mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            
            # 清理临时文件
            os.remove(output_path)
            
            # 创建Response
            response = Response(
                file_content,
                mimetype=mimetype,
                headers={
                    'Content-Disposition': f'attachment; filename="{filename}"',
                    'Content-Type': mimetype,
                    'Content-Length': str(len(file_content))
                }
            )
            
            return response
        
        # 测试请求
        with app.test_client() as client:
            response = client.get('/test_export')
            
            print(f"✓ Flask测试请求完成")
            print(f"  状态码: {response.status_code}")
            print(f"  Content-Type: {response.headers.get('Content-Type')}")
            print(f"  Content-Disposition: {response.headers.get('Content-Disposition')}")
            print(f"  Content-Length: {response.headers.get('Content-Length')}")
            print(f"  响应数据大小: {len(response.data)} 字节")
            
            if response.status_code == 200:
                print("✓ 状态码正确")
            else:
                print(f"✗ 状态码错误: {response.status_code}")
                return False
            
            # 验证响应数据可以被解析为Excel
            import pandas as pd
            from io import BytesIO
            
            try:
                excel_stream = BytesIO(response.data)
                df = pd.read_excel(excel_stream, sheet_name='权利要求详情')
                print(f"✓ 响应数据可以被解析为Excel")
                print(f"  行数: {len(df)}")
                return True
            except Exception as e:
                print(f"✗ 响应数据无法被解析为Excel: {e}")
                return False
        
    except Exception as e:
        print(f"✗ Flask测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_content_type_variations():
    """测试不同的Content-Type设置"""
    print("\n测试不同的Content-Type设置...")
    
    content_types = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/octet-stream'
    ]
    
    try:
        export_service = ExportService()
        test_data = create_test_data()
        
        # 导出Excel
        output_path = export_service.export_to_excel(test_data, 'content_type_test.xlsx')
        
        # 读取文件内容
        with open(output_path, 'rb') as f:
            file_content = f.read()
        
        filename = os.path.basename(output_path)
        
        for mimetype in content_types:
            print(f"\n  测试 Content-Type: {mimetype}")
            
            response = Response(
                file_content,
                mimetype=mimetype,
                headers={
                    'Content-Disposition': f'attachment; filename="{filename}"',
                    'Content-Type': mimetype,
                    'Content-Length': str(len(file_content))
                }
            )
            
            print(f"    响应头 Content-Type: {response.headers.get('Content-Type')}")
            print(f"    响应数据大小: {len(response.get_data())} 字节")
        
        # 清理
        os.remove(output_path)
        
        print("\n✓ 所有Content-Type测试完成")
        return True
        
    except Exception as e:
        print(f"✗ Content-Type测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("HTTP响应测试")
    print("=" * 60)
    
    results = []
    
    results.append(("Response头部设置", test_response_headers()))
    results.append(("Flask应用导出", test_flask_app_export()))
    results.append(("Content-Type变化", test_content_type_variations()))
    
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
