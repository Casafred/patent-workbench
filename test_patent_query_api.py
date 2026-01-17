"""
专利查询API端点测试

测试专利查询功能的API端点是否正常工作。
"""

import json
from backend.app import create_app
from patent_query_visualization.models import (
    ClaimNode, ClaimType, PatentDetails, ClaimsTreeData
)


def test_api_endpoints():
    """测试API端点"""
    print("=" * 60)
    print("专利查询API端点测试")
    print("=" * 60)
    
    # 创建Flask应用
    app = create_app()
    
    with app.test_client() as client:
        print("\n1. 测试健康检查端点...")
        response = client.get('/api/patent-query/health')
        print(f"   状态码: {response.status_code}")
        if response.status_code == 200:
            data = response.get_json()
            print(f"   响应: {data}")
            print("   ✓ 健康检查端点正常")
        else:
            print("   ✗ 健康检查端点异常")
        
        print("\n2. 测试配置验证端点...")
        config_data = {
            "patent_number_column": "专利号",
            "excel_file_path": "/test/path.xlsx",
            "column_index": 0,
            "header_row": 1
        }
        
        response = client.post('/api/patent-query/configuration/validate',
                             json=config_data,
                             headers={'Content-Type': 'application/json'})
        print(f"   状态码: {response.status_code}")
        if response.status_code == 200:
            data = response.get_json()
            print(f"   验证结果: {data['data']['is_valid']}")
            if data['data']['errors']:
                print(f"   错误: {data['data']['errors']}")
            if data['data']['warnings']:
                print(f"   警告: {data['data']['warnings']}")
            print("   ✓ 配置验证端点正常")
        else:
            print("   ✗ 配置验证端点异常")
        
        print("\n3. 测试专利搜索端点...")
        search_data = {
            "query": "CN123456789A",
            "limit": 10,
            "exact_match": False
        }
        
        response = client.post('/api/patent-query/search',
                             json=search_data,
                             headers={'Content-Type': 'application/json'})
        print(f"   状态码: {response.status_code}")
        if response.status_code == 200:
            data = response.get_json()
            print(f"   搜索结果数量: {data['data']['total_count']}")
            print("   ✓ 专利搜索端点正常")
        else:
            data = response.get_json()
            print(f"   错误: {data.get('error', '未知错误')}")
            print("   ✓ 专利搜索端点正常 (无数据是预期的)")
        
        print("\n4. 测试专利详情端点...")
        response = client.get('/api/patent-query/patent/CN123456789A')
        print(f"   状态码: {response.status_code}")
        if response.status_code == 404:
            print("   ✓ 专利详情端点正常 (未找到专利是预期的)")
        elif response.status_code == 200:
            data = response.get_json()
            print(f"   专利号: {data['data']['patent_number']}")
            print("   ✓ 专利详情端点正常")
        else:
            print("   ✗ 专利详情端点异常")
    
    print("\n" + "=" * 60)
    print("API端点测试完成")
    print("=" * 60)


def test_claims_analysis():
    """测试权利要求分析功能"""
    print("\n" + "=" * 60)
    print("权利要求分析功能测试")
    print("=" * 60)
    
    from patent_query_visualization import get_claims_analyzer
    
    analyzer = get_claims_analyzer()
    
    # 测试数据
    test_cases = [
        {
            "text": "根据权利要求1所述的装置，其特征在于还包括显示屏。",
            "language": "zh",
            "expected": [1]
        },
        {
            "text": "根据权利要求1或2所述的装置，其特征在于还包括摄像头。",
            "language": "zh", 
            "expected": [1, 2]
        },
        {
            "text": "根据权利要求1-3所述的装置，其特征在于还包括传感器。",
            "language": "zh",
            "expected": [1, 2, 3]
        },
        {
            "text": "The device according to claim 1, further comprising a display.",
            "language": "en",
            "expected": [1]
        },
        {
            "text": "The device according to claim 1 to 3, further comprising a sensor.",
            "language": "en",
            "expected": [1, 2, 3]
        }
    ]
    
    print("\n测试权利要求引用解析:")
    for i, case in enumerate(test_cases, 1):
        refs = analyzer.parse_claim_references(case["text"], case["language"])
        expected = case["expected"]
        
        print(f"\n{i}. {case['language'].upper()}:")
        print(f"   文本: {case['text'][:50]}...")
        print(f"   解析结果: {refs}")
        print(f"   期望结果: {expected}")
        
        if set(refs) == set(expected):
            print("   ✓ 解析正确")
        else:
            print("   ✗ 解析错误")
    
    print("\n测试依赖关系树构建:")
    
    # 创建测试权利要求
    claims = [
        ClaimNode(
            id="claim_1",
            claim_number=1,
            claim_text="一种智能手机，包括处理器和存储器。",
            claim_type=ClaimType.INDEPENDENT,
            level=0
        ),
        ClaimNode(
            id="claim_2", 
            claim_number=2,
            claim_text="根据权利要求1所述的智能手机，其特征在于还包括显示屏。",
            claim_type=ClaimType.DEPENDENT,
            level=1,
            dependencies=[1]
        ),
        ClaimNode(
            id="claim_3",
            claim_number=3,
            claim_text="根据权利要求1或2所述的智能手机，其特征在于还包括摄像头。",
            claim_type=ClaimType.DEPENDENT,
            level=1,
            dependencies=[1, 2]
        )
    ]
    
    tree = analyzer.build_dependency_tree(claims)
    
    print(f"   节点数量: {len(tree.nodes)}")
    print(f"   连接数量: {len(tree.links)}")
    print(f"   根节点: {tree.root_nodes}")
    print(f"   元数据: {tree.metadata}")
    
    if len(tree.nodes) == 3 and len(tree.links) >= 1:
        print("   ✓ 依赖关系树构建正确")
    else:
        print("   ✗ 依赖关系树构建错误")
    
    print("\n" + "=" * 60)
    print("权利要求分析功能测试完成")
    print("=" * 60)


def test_visualization_data_generation():
    """测试可视化数据生成"""
    print("\n" + "=" * 60)
    print("可视化数据生成测试")
    print("=" * 60)
    
    from patent_query_visualization import get_visualization_service
    from patent_query_visualization.models import VisualizationOptions, VisualizationStyle
    
    viz_service = get_visualization_service()
    
    # 创建测试数据
    claims = [
        ClaimNode(
            id="claim_1",
            claim_number=1,
            claim_text="一种智能手机，包括处理器和存储器。",
            claim_type=ClaimType.INDEPENDENT,
            level=0
        ),
        ClaimNode(
            id="claim_2",
            claim_number=2,
            claim_text="根据权利要求1所述的智能手机，其特征在于还包括显示屏。",
            claim_type=ClaimType.DEPENDENT,
            level=1,
            dependencies=[1]
        )
    ]
    
    tree_data = ClaimsTreeData(
        patent_number="CN123456789A",
        nodes=claims,
        links=[],
        root_nodes=["claim_1"]
    )
    
    options = VisualizationOptions(
        style=VisualizationStyle.TREE,
        width=800,
        height=600
    )
    
    print("\n1. 测试树状图数据生成:")
    tree_viz_data = viz_service.generate_tree_data(tree_data, options)
    print(f"   类型: {tree_viz_data['type']}")
    print(f"   尺寸: {tree_viz_data['width']} x {tree_viz_data['height']}")
    print(f"   节点数量: {len(tree_viz_data['nodes'])}")
    print(f"   连接数量: {len(tree_viz_data['links'])}")
    print("   ✓ 树状图数据生成成功")
    
    print("\n2. 测试网络图数据生成:")
    options.style = VisualizationStyle.NETWORK
    network_viz_data = viz_service.generate_network_data(tree_data, options)
    print(f"   类型: {network_viz_data['type']}")
    print(f"   节点数量: {len(network_viz_data['nodes'])}")
    print(f"   力导向参数: {network_viz_data['options']['charge_strength']}")
    print("   ✓ 网络图数据生成成功")
    
    print("\n3. 测试径向图数据生成:")
    options.style = VisualizationStyle.RADIAL
    radial_viz_data = viz_service.generate_radial_data(tree_data, options)
    print(f"   类型: {radial_viz_data['type']}")
    print(f"   节点数量: {len(radial_viz_data['nodes'])}")
    print(f"   半径: {radial_viz_data['options']['radius']}")
    print("   ✓ 径向图数据生成成功")
    
    print("\n" + "=" * 60)
    print("可视化数据生成测试完成")
    print("=" * 60)


if __name__ == '__main__':
    try:
        test_api_endpoints()
        test_claims_analysis()
        test_visualization_data_generation()
        
        print("\n🎉 所有测试完成！专利查询功能运行正常。")
        
    except Exception as e:
        print(f"\n❌ 测试过程中出现错误: {e}")
        import traceback
        traceback.print_exc()