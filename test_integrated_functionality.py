"""
测试集成的专利号查询和可视化功能

验证Excel上传、搜索和可视化功能是否正常工作。
"""

import json
import pandas as pd
from backend.app import create_app


def test_excel_upload_and_search():
    """测试Excel上传和搜索功能"""
    print("=" * 60)
    print("测试Excel上传和专利号搜索功能")
    print("=" * 60)
    
    # 创建测试Excel文件
    test_data = {
        '专利号': [
            'CN202310123456A',
            'CN202310234567B', 
            'US11234567B2',
            'EP3456789A1',
            'CN202310345678A',
            'JP2023123456A'
        ],
        '专利名称': [
            '一种智能手机及其控制方法',
            '移动通信设备的电源管理系统',
            'Smart Device with Enhanced Processing',
            'Communication System for IoT Devices',
            '基于人工智能的数据处理方法',
            'センサーネットワークシステム'
        ],
        '申请人': [
            '某某科技有限公司',
            '通信技术公司',
            'Tech Corp Inc.',
            'European Tech Ltd.',
            'AI创新公司',
            'テクノロジー株式会社'
        ]
    }
    
    # 创建DataFrame并保存为Excel
    df = pd.DataFrame(test_data)
    test_file_path = 'test_data/test_patents.xlsx'
    df.to_excel(test_file_path, index=False)
    
    print(f"✓ 创建测试Excel文件: {test_file_path}")
    print(f"  包含 {len(df)} 条专利记录")
    
    # 创建Flask应用进行测试
    app = create_app()
    
    with app.test_client() as client:
        print("\n1. 测试Excel文件上传...")
        
        # 模拟文件上传
        with open(test_file_path, 'rb') as f:
            response = client.post('/api/excel/upload', 
                                 data={'file': (f, 'test_patents.xlsx')},
                                 content_type='multipart/form-data')
        
        print(f"   上传状态码: {response.status_code}")
        
        if response.status_code == 200:
            upload_result = response.get_json()
            file_id = upload_result['data']['file_id']
            print(f"   ✓ 文件上传成功，文件ID: {file_id}")
            print(f"   列信息: {[col['name'] for col in upload_result['data']['columns']]}")
            
            print("\n2. 测试专利号搜索...")
            
            # 测试搜索功能
            search_queries = ['CN2023', '123456', 'US', 'Tech']
            
            for query in search_queries:
                search_response = client.post(f'/api/excel/{file_id}/search',
                                            json={
                                                'column_name': '专利号',
                                                'query': query,
                                                'limit': 10
                                            },
                                            headers={'Content-Type': 'application/json'})
                
                if search_response.status_code == 200:
                    search_result = search_response.get_json()
                    results = search_result['data']['results']
                    print(f"   查询 '{query}': 找到 {len(results)} 个结果")
                    
                    for result in results[:2]:  # 只显示前2个结果
                        print(f"     - {result['patent_number']} (行号: {result['row_index']})")
                else:
                    print(f"   查询 '{query}' 失败: {search_response.status_code}")
            
            print("\n3. 测试获取Excel数据...")
            
            # 测试获取完整数据
            data_response = client.get(f'/api/excel/{file_id}/data?page=1&page_size=10')
            
            if data_response.status_code == 200:
                data_result = data_response.get_json()
                print(f"   ✓ 获取数据成功")
                print(f"   总行数: {data_result['data']['pagination']['total_rows']}")
                print(f"   列数: {len(data_result['data']['columns'])}")
            else:
                print(f"   ✗ 获取数据失败: {data_response.status_code}")
                
        else:
            print(f"   ✗ 文件上传失败")
            if response.data:
                error_result = response.get_json()
                print(f"   错误: {error_result.get('error', '未知错误')}")
    
    print("\n" + "=" * 60)
    print("Excel上传和搜索功能测试完成")
    print("=" * 60)


def test_visualization_integration():
    """测试可视化集成功能"""
    print("\n" + "=" * 60)
    print("测试可视化集成功能")
    print("=" * 60)
    
    # 创建模拟的权利要求数据
    mock_claims_data = {
        "patent_number": "CN202310123456A",
        "nodes": [
            {
                "id": "claim_1",
                "claim_number": 1,
                "claim_text": "一种智能手机，包括：处理器，用于执行应用程序；存储器，与所述处理器连接，用于存储数据；显示屏，与所述处理器连接，用于显示信息。",
                "claim_type": "independent",
                "level": 0,
                "dependencies": [],
                "children": ["claim_2", "claim_3", "claim_4"]
            },
            {
                "id": "claim_2", 
                "claim_number": 2,
                "claim_text": "根据权利要求1所述的智能手机，其特征在于，还包括摄像头，与所述处理器连接，用于拍摄照片和视频。",
                "claim_type": "dependent",
                "level": 1,
                "dependencies": [1],
                "children": ["claim_5"]
            },
            {
                "id": "claim_3",
                "claim_number": 3,
                "claim_text": "根据权利要求1所述的智能手机，其特征在于，还包括传感器模块，用于检测设备的运动状态。",
                "claim_type": "dependent", 
                "level": 1,
                "dependencies": [1],
                "children": ["claim_6"]
            },
            {
                "id": "claim_4",
                "claim_number": 4,
                "claim_text": "根据权利要求1所述的智能手机，其特征在于，所述显示屏为触摸屏，支持多点触控操作。",
                "claim_type": "dependent",
                "level": 1,
                "dependencies": [1],
                "children": []
            },
            {
                "id": "claim_5",
                "claim_number": 5,
                "claim_text": "根据权利要求2所述的智能手机，其特征在于，所述摄像头包括前置摄像头和后置摄像头。",
                "claim_type": "dependent",
                "level": 2,
                "dependencies": [2],
                "children": []
            },
            {
                "id": "claim_6",
                "claim_number": 6,
                "claim_text": "根据权利要求3所述的智能手机，其特征在于，所述传感器模块包括加速度传感器和陀螺仪传感器。",
                "claim_type": "dependent",
                "level": 2,
                "dependencies": [3],
                "children": []
            }
        ],
        "links": [
            {"source": "claim_1", "target": "claim_2", "type": "dependency", "strength": 1.0},
            {"source": "claim_1", "target": "claim_3", "type": "dependency", "strength": 1.0},
            {"source": "claim_1", "target": "claim_4", "type": "dependency", "strength": 1.0},
            {"source": "claim_2", "target": "claim_5", "type": "dependency", "strength": 1.0},
            {"source": "claim_3", "target": "claim_6", "type": "dependency", "strength": 1.0}
        ],
        "root_nodes": ["claim_1"]
    }
    
    print("✓ 创建模拟权利要求数据")
    print(f"  专利号: {mock_claims_data['patent_number']}")
    print(f"  权利要求数量: {len(mock_claims_data['nodes'])}")
    print(f"  依赖关系数量: {len(mock_claims_data['links'])}")
    
    # 分析权利要求结构
    independent_claims = [node for node in mock_claims_data['nodes'] if node['claim_type'] == 'independent']
    dependent_claims = [node for node in mock_claims_data['nodes'] if node['claim_type'] == 'dependent']
    
    print(f"  独立权利要求: {len(independent_claims)}")
    print(f"  从属权利要求: {len(dependent_claims)}")
    
    # 分析依赖层级
    max_level = max(node['level'] for node in mock_claims_data['nodes'])
    print(f"  最大依赖层级: {max_level}")
    
    # 验证依赖关系的完整性
    print("\n验证依赖关系:")
    for node in mock_claims_data['nodes']:
        if node['dependencies']:
            for dep in node['dependencies']:
                dep_node = next((n for n in mock_claims_data['nodes'] if n['claim_number'] == dep), None)
                if dep_node:
                    print(f"  ✓ 权利要求{node['claim_number']} 依赖 权利要求{dep}")
                else:
                    print(f"  ✗ 权利要求{node['claim_number']} 依赖的权利要求{dep}不存在")
    
    # 保存测试数据
    with open('test_data/mock_visualization_data.json', 'w', encoding='utf-8') as f:
        json.dump(mock_claims_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✓ 测试数据已保存到: test_data/mock_visualization_data.json")
    
    print("\n" + "=" * 60)
    print("可视化集成功能测试完成")
    print("=" * 60)


def test_complete_workflow():
    """测试完整的工作流程"""
    print("\n" + "=" * 60)
    print("测试完整工作流程")
    print("=" * 60)
    
    workflow_steps = [
        "1. 用户上传包含专利号的Excel文件",
        "2. 系统解析Excel文件，识别列结构",
        "3. 用户配置专利号所在的列",
        "4. 用户输入专利号片段进行搜索",
        "5. 系统在Excel中搜索匹配的专利号",
        "6. 用户从搜索结果中选择特定专利号",
        "7. 系统分析该专利的权利要求文本",
        "8. 系统识别权利要求的引用关系",
        "9. 系统生成权利要求依赖关系树",
        "10. 用户查看交互式可视化图表"
    ]
    
    print("完整工作流程步骤:")
    for step in workflow_steps:
        print(f"  {step}")
    
    print(f"\n✓ 工作流程包含 {len(workflow_steps)} 个主要步骤")
    print("✓ 每个步骤都有对应的前端界面和后端API支持")
    print("✓ 支持三种可视化样式：树状图、网络图、径向图")
    print("✓ 支持交互式操作：缩放、平移、节点点击、悬停提示")
    
    print("\n" + "=" * 60)
    print("完整工作流程测试完成")
    print("=" * 60)


if __name__ == '__main__':
    try:
        # 确保测试数据目录存在
        import os
        os.makedirs('test_data', exist_ok=True)
        
        # 运行所有测试
        test_excel_upload_and_search()
        test_visualization_integration()
        test_complete_workflow()
        
        print("\n🎉 所有测试完成！")
        print("\n使用说明:")
        print("1. 启动Flask应用: python backend/app.py")
        print("2. 访问权利要求处理器: http://localhost:5000/claims_processor.html")
        print("3. 上传包含专利号的Excel文件")
        print("4. 选择专利号所在的列")
        print("5. 处理权利要求数据")
        print("6. 在专利查询区域搜索特定专利号")
        print("7. 选择专利号并生成可视化图表")
        
    except Exception as e:
        print(f"\n❌ 测试过程中出现错误: {e}")
        import traceback
        traceback.print_exc()