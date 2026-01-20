"""
测试中文文件名上传功能
运行此脚本前请确保后端服务已启动
"""
import requests
import os

# 配置
API_URL = "http://localhost:5000/api/claims/upload"
TEST_FILE = "uploads/实际测试.xlsx"

def test_upload():
    """测试上传中文文件名的Excel文件"""
    
    if not os.path.exists(TEST_FILE):
        print(f"❌ 测试文件不存在: {TEST_FILE}")
        return
    
    print("=" * 80)
    print("测试中文文件名Excel上传")
    print("=" * 80)
    print(f"\n测试文件: {TEST_FILE}")
    print(f"API地址: {API_URL}")
    
    # 准备文件
    with open(TEST_FILE, 'rb') as f:
        files = {'file': (os.path.basename(TEST_FILE), f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
        
        print("\n正在上传...")
        try:
            response = requests.post(API_URL, files=files)
            
            print(f"\n状态码: {response.status_code}")
            print(f"响应内容:")
            print(response.json())
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    print("\n✓ 测试通过！文件上传成功")
                    print(f"  - 文件ID: {data['data'].get('file_id')}")
                    print(f"  - 原始文件名: {data['data'].get('original_filename')}")
                    print(f"  - 列数: {len(data['data'].get('columns', []))}")
                else:
                    print(f"\n✗ 测试失败：{data.get('error')}")
            else:
                print(f"\n✗ 测试失败：HTTP {response.status_code}")
                
        except requests.exceptions.ConnectionError:
            print("\n❌ 无法连接到服务器，请确保后端服务已启动")
        except Exception as e:
            print(f"\n❌ 测试出错: {str(e)}")
    
    print("\n" + "=" * 80)

if __name__ == "__main__":
    test_upload()
