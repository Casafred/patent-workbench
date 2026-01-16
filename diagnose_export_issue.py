"""
诊断导出问题的脚本
"""
import requests
import json
from io import BytesIO
import openpyxl

def test_export_endpoint():
    """测试导出端点"""
    print("=" * 60)
    print("诊断导出问题")
    print("=" * 60)
    
    # 替换为你的Render URL
    base_url = input("请输入你的Render应用URL (例如: https://your-app.onrender.com): ").strip()
    
    if not base_url:
        print("错误：未提供URL")
        return
    
    # 测试1: 检查端点是否存在
    print("\n[测试1] 检查导出端点...")
    try:
        # 这里需要一个有效的task_id，你需要先处理一个文件
        task_id = input("请输入一个有效的task_id (从处理结果获取): ").strip()
        
        if not task_id:
            print("跳过端点测试（未提供task_id）")
            return
        
        # 测试Excel导出
        print(f"\n[测试2] 测试Excel导出...")
        export_url = f"{base_url}/api/claims/export/{task_id}"
        
        response = requests.post(
            export_url,
            json={"format": "excel"},
            headers={"Content-Type": "application/json"}
        )
        
        print(f"状态码: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type')}")
        print(f"Content-Length: {response.headers.get('Content-Length')}")
        print(f"Content-Disposition: {response.headers.get('Content-Disposition')}")
        print(f"实际内容长度: {len(response.content)} bytes")
        
        if response.status_code == 200:
            # 尝试解析Excel
            try:
                excel_buffer = BytesIO(response.content)
                wb = openpyxl.load_workbook(excel_buffer)
                print(f"✓ Excel文件有效！")
                print(f"  工作表: {wb.sheetnames}")
            except Exception as e:
                print(f"✗ Excel文件无效: {e}")
                
                # 检查内容
                print(f"\n文件前100字节:")
                print(response.content[:100])
                
                # 检查是否是JSON错误响应
                try:
                    error_data = json.loads(response.content)
                    print(f"\n收到JSON错误响应:")
                    print(json.dumps(error_data, indent=2, ensure_ascii=False))
                except:
                    print("\n不是JSON响应")
        else:
            print(f"✗ 请求失败")
            try:
                error_data = response.json()
                print(f"错误信息: {json.dumps(error_data, indent=2, ensure_ascii=False)}")
            except:
                print(f"响应内容: {response.text[:500]}")
        
        # 测试JSON导出
        print(f"\n[测试3] 测试JSON导出...")
        response = requests.post(
            export_url,
            json={"format": "json"},
            headers={"Content-Type": "application/json"}
        )
        
        print(f"状态码: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type')}")
        print(f"实际内容长度: {len(response.content)} bytes")
        
        if response.status_code == 200:
            try:
                json_data = json.loads(response.content.decode('utf-8'))
                print(f"✓ JSON文件有效！")
                print(f"  包含字段: {list(json_data.keys())}")
            except Exception as e:
                print(f"✗ JSON文件无效: {e}")
                print(f"内容前200字节: {response.content[:200]}")
        
    except Exception as e:
        print(f"错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_export_endpoint()
