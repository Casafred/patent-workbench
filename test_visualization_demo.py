"""
专利查询可视化功能演示

创建测试数据并演示可视化功能。
"""

import json
from patent_query_visualization.models import (
    PatentDetails, ClaimNode, ClaimType, ClaimsTreeData, ClaimLink
)
from patent_query_visualization import get_patent_storage


def create_demo_patent_data():
    """创建演示用的专利数据"""
    
    # 创建权利要求节点
    claims = [
        ClaimNode(
            id="claim_1",
            claim_number=1,
            claim_text="一种智能手机，包括：处理器，用于执行应用程序；存储器，与所述处理器连接，用于存储数据；显示屏，与所述处理器连接，用于显示信息。",
            claim_type=ClaimType.INDEPENDENT,
            level=0,
            dependencies=[],
            children=["claim_2", "claim_3", "claim_4"],
            confidence_score=0.95,
            language="zh"
        ),
        ClaimNode(
            id="claim_2",
            claim_number=2,
            claim_text="根据权利要求1所述的智能手机，其特征在于，还包括摄像头，与所述处理器连接，用于拍摄照片和视频。",
            claim_type=ClaimType.DEPENDENT,
            level=1,
            dependencies=[1],
            children=["claim_5"],
            confidence_score=0.92,
            language="zh"
        ),
        ClaimNode(
            id="claim_3",
            claim_number=3,
            claim_text="根据权利要求1所述的智能手机，其特征在于，还包括传感器模块，用于检测设备的运动状态。",
            claim_type=ClaimType.DEPENDENT,
            level=1,
            dependencies=[1],
            children=["claim_6"],
            confidence_score=0.90,
            language="zh"
        ),
        ClaimNode(
            id="claim_4",
            claim_number=4,
            claim_text="根据权利要求1所述的智能手机，其特征在于，所述显示屏为触摸屏，支持多点触控操作。",
            claim_type=ClaimType.DEPENDENT,
            level=1,
            dependencies=[1],
            children=[],
            confidence_score=0.88,
            language="zh"
        ),
        ClaimNode(
            id="claim_5",
            claim_number=5,
            claim_text="根据权利要求2所述的智能手机，其特征在于，所述摄像头包括前置摄像头和后置摄像头。",
            claim_type=ClaimType.DEPENDENT,
            level=2,
            dependencies=[2],
            children=[],
            confidence_score=0.85,
            language="zh"
        ),
        ClaimNode(
            id="claim_6",
            claim_number=6,
            claim_text="根据权利要求3所述的智能手机，其特征在于，所述传感器模块包括加速度传感器和陀螺仪传感器。",
            claim_type=ClaimType.DEPENDENT,
            level=2,
            dependencies=[3],
            children=[],
            confidence_score=0.87,
            language="zh"
        ),
        ClaimNode(
            id="claim_7",
            claim_number=7,
            claim_text="一种移动通信设备，包括：无线通信模块，用于与基站进行通信；天线，与所述无线通信模块连接。",
            claim_type=ClaimType.INDEPENDENT,
            level=0,
            dependencies=[],
            children=["claim_8"],
            confidence_score=0.93,
            language="zh"
        ),
        ClaimNode(
            id="claim_8",
            claim_number=8,
            claim_text="根据权利要求7所述的移动通信设备，其特征在于，还包括电池管理系统，用于管理设备的电源。",
            claim_type=ClaimType.DEPENDENT,
            level=1,
            dependencies=[7],
            children=[],
            confidence_score=0.89,
            language="zh"
        )
    ]
    
    # 创建专利详情
    patent = PatentDetails(
        patent_number="CN202310123456A",
        title="一种智能手机及其控制方法",
        applicant="某某科技有限公司",
        filing_date="2023-03-15",
        publication_date="2023-09-20",
        abstract="本发明公开了一种智能手机及其控制方法，该智能手机包括处理器、存储器、显示屏等组件，能够实现高效的信息处理和用户交互功能。",
        inventors=["张三", "李四", "王五"],
        assignees=["某某科技有限公司"],
        claims=claims,
        raw_claims_text="权利要求书内容...",
        description="发明详细说明...",
        url="https://example.com/patent/CN202310123456A"
    )
    
    return patent


def create_demo_tree_data(patent):
    """创建演示用的树图数据"""
    
    # 创建连接关系
    links = [
        ClaimLink(source="claim_1", target="claim_2", type="dependency", strength=1.0),
        ClaimLink(source="claim_1", target="claim_3", type="dependency", strength=1.0),
        ClaimLink(source="claim_1", target="claim_4", type="dependency", strength=1.0),
        ClaimLink(source="claim_2", target="claim_5", type="dependency", strength=1.0),
        ClaimLink(source="claim_3", target="claim_6", type="dependency", strength=1.0),
        ClaimLink(source="claim_7", target="claim_8", type="dependency", strength=1.0),
    ]
    
    # 创建树图数据
    tree_data = ClaimsTreeData(
        patent_number=patent.patent_number,
        nodes=patent.claims,
        links=links,
        root_nodes=["claim_1", "claim_7"],
        metadata={
            "total_claims": len(patent.claims),
            "independent_claims": len([c for c in patent.claims if c.claim_type == ClaimType.INDEPENDENT]),
            "dependent_claims": len([c for c in patent.claims if c.claim_type == ClaimType.DEPENDENT]),
            "max_depth": 2,
            "created_at": "2024-01-17T10:30:00Z"
        }
    )
    
    return tree_data


def store_demo_data():
    """存储演示数据到数据库"""
    
    print("=" * 60)
    print("创建专利查询可视化演示数据")
    print("=" * 60)
    
    try:
        # 创建演示数据
        patent = create_demo_patent_data()
        tree_data = create_demo_tree_data(patent)
        
        print(f"\n创建演示专利: {patent.patent_number}")
        print(f"专利标题: {patent.title}")
        print(f"权利要求数量: {len(patent.claims)}")
        print(f"独立权利要求: {len([c for c in patent.claims if c.claim_type == ClaimType.INDEPENDENT])}")
        print(f"从属权利要求: {len([c for c in patent.claims if c.claim_type == ClaimType.DEPENDENT])}")
        
        # 获取存储服务
        storage = get_patent_storage()
        
        # 存储专利数据
        print("\n存储专利数据...")
        success = storage.store_patent_data(patent)
        if success:
            print("✓ 专利数据存储成功")
        else:
            print("✗ 专利数据存储失败")
            return False
        
        # 存储树图数据
        print("存储树图数据...")
        success = storage.store_claims_tree(patent.patent_number, tree_data)
        if success:
            print("✓ 树图数据存储成功")
        else:
            print("✗ 树图数据存储失败")
            return False
        
        print(f"\n演示数据创建完成！")
        print(f"可以通过以下URL访问可视化页面:")
        print(f"http://localhost:5000/patent_query_visualization.html?patent={patent.patent_number}")
        
        return True
        
    except Exception as e:
        print(f"创建演示数据失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def export_demo_data_json():
    """导出演示数据为JSON格式"""
    
    try:
        patent = create_demo_patent_data()
        tree_data = create_demo_tree_data(patent)
        
        # 转换为JSON格式
        patent_json = {
            "patent_number": patent.patent_number,
            "title": patent.title,
            "applicant": patent.applicant,
            "filing_date": patent.filing_date,
            "publication_date": patent.publication_date,
            "abstract": patent.abstract,
            "inventors": patent.inventors,
            "assignees": patent.assignees,
            "claims": [
                {
                    "id": claim.id,
                    "claim_number": claim.claim_number,
                    "claim_text": claim.claim_text,
                    "claim_type": claim.claim_type.value,
                    "level": claim.level,
                    "dependencies": claim.dependencies,
                    "children": claim.children,
                    "confidence_score": claim.confidence_score,
                    "language": claim.language
                }
                for claim in patent.claims
            ]
        }
        
        tree_json = {
            "patent_number": tree_data.patent_number,
            "nodes": [
                {
                    "id": node.id,
                    "claim_number": node.claim_number,
                    "claim_text": node.claim_text,
                    "claim_type": node.claim_type.value,
                    "level": node.level,
                    "dependencies": node.dependencies,
                    "children": node.children
                }
                for node in tree_data.nodes
            ],
            "links": [
                {
                    "source": link.source,
                    "target": link.target,
                    "type": link.type,
                    "strength": link.strength
                }
                for link in tree_data.links
            ],
            "root_nodes": tree_data.root_nodes,
            "metadata": tree_data.metadata
        }
        
        # 保存到文件
        with open('demo_patent_data.json', 'w', encoding='utf-8') as f:
            json.dump(patent_json, f, ensure_ascii=False, indent=2)
        
        with open('demo_tree_data.json', 'w', encoding='utf-8') as f:
            json.dump(tree_json, f, ensure_ascii=False, indent=2)
        
        print("演示数据已导出到:")
        print("- demo_patent_data.json")
        print("- demo_tree_data.json")
        
    except Exception as e:
        print(f"导出演示数据失败: {e}")


if __name__ == '__main__':
    # 存储演示数据
    success = store_demo_data()
    
    if success:
        print("\n" + "=" * 60)
        print("演示数据创建成功！")
        print("=" * 60)
        
        # 导出JSON数据
        export_demo_data_json()
        
        print("\n使用说明:")
        print("1. 启动Flask应用: python backend/app.py")
        print("2. 访问搜索页面: http://localhost:5000/patent_query_search.html")
        print("3. 搜索专利号: CN202310123456A")
        print("4. 点击'可视化'按钮查看权利要求关系图")
        
    else:
        print("\n演示数据创建失败，请检查错误信息。")