"""测试修复后的API端点"""
from backend.routes.patent import get_patent_data_reliable

# 测试专利号
test_patents = [
    "US10000000B2",
    "US9999999B2",
]

print("测试修复后的get_patent_data_reliable函数")
print("=" * 60)

for patent_number in test_patents:
    print(f"\n测试: {patent_number}")
    print("-" * 60)
    
    data = get_patent_data_reliable(patent_number)
    
    if data:
        print(f"✓ 成功提取数据")
        print(f"  标题: {data['title'][:80]}...")
        print(f"  摘要长度: {len(data['abstract'])} 字符")
        print(f"  发明人数量: {len(data['inventors'])}")
        print(f"  发明人: {', '.join(data['inventors'][:3])}")
        print(f"  申请日期: {data['application_date']}")
        print(f"  公开日期: {data['publication_date']}")
        print(f"  权利要求数量: {len(data['claims'])}")
        print(f"  说明书长度: {len(data['description'])} 字符")
    else:
        print(f"✗ 提取失败")

print("\n" + "=" * 60)
print("测试完成")
