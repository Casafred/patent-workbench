"""
简单测试 EPO OPS 搜索
"""
import os
import sys

print("=" * 70)
print("简单测试 EPO OPS 搜索")
print("=" * 70)

# 检查环境变量
consumer_key = os.getenv('EPO_OPS_KEY', '')
consumer_secret = os.getenv('EPO_OPS_SECRET', '')

print(f"\n[1] 环境变量检查:")
print(f"    EPO_OPS_KEY: {'已设置' if consumer_key else '未设置'}")
print(f"    EPO_OPS_SECRET: {'已设置' if consumer_secret else '未设置'}")

if not consumer_key or not consumer_secret:
    print("\n错误: 环境变量未设置")
    print("请设置环境变量后重试:")
    print("  $env:EPO_OPS_KEY='your_key'")
    print("  $env:EPO_OPS_SECRET='your_secret'")
    sys.exit(1)

# 测试原始库
print(f"\n[2] 测试原始 python-epo-ops-client 库...")
import epo_ops

try:
    client = epo_ops.Client(key=consumer_key, secret=consumer_secret, accept_type='json')
    print("    客户端创建成功")
    
    print("\n[3] 测试搜索...")
    response = client.published_data_search(
        cql='ta=machine learning',
        range_begin=1,
        range_end=3
    )
    print(f"    状态码: {response.status_code}")
    print(f"    响应长度: {len(response.content)} bytes")
    
    if response.status_code == 200:
        data = response.json()
        world_data = data.get('ops:world-patent-data', {})
        search_data = world_data.get('ops:biblio-search', {})
        total_count = search_data.get('@total-result-count', 0)
        print(f"    总结果数: {total_count}")
        print("    ✅ 搜索成功!")
    else:
        print(f"    ❌ 搜索失败")
        print(f"    响应内容: {response.text[:500]}")
        
except Exception as e:
    print(f"    ❌ 异常: {e}")
    import traceback
    traceback.print_exc()

# 测试适配层
print(f"\n[4] 测试适配层...")
try:
    from backend.services.epo_adapter import get_epo_adapter, EPOAdapter
    
    # 重置单例
    import backend.services.epo_adapter as epo_adapter_module
    epo_adapter_module._epo_adapter = None
    
    adapter = get_epo_adapter()
    print(f"    适配器配置状态: {adapter.is_configured()}")
    
    if adapter.is_configured():
        results, total, meta = adapter.search('ta=machine learning', 1, 3)
        print(f"    搜索结果: {len(results)} 条, 总数: {total}")
        print(f"    状态码: {meta.get('status_code')}")
        
        if results:
            print("    ✅ 适配层搜索成功!")
        else:
            print("    ❌ 适配层搜索返回空结果")
    else:
        print("    ❌ 适配器未配置")
        
except Exception as e:
    print(f"    ❌ 异常: {e}")
    import traceback
    traceback.print_exc()

# 测试服务层
print(f"\n[5] 测试服务层...")
try:
    from backend.services.epo_ops_service import get_epo_ops_client, EPOOPSClient
    
    # 重置单例
    import backend.services.epo_ops_service as epo_service_module
    epo_service_module.epo_ops_client = None
    
    service = get_epo_ops_client()
    print(f"    服务配置状态: {service.is_configured()}")
    
    if service.is_configured():
        result = service.search('ta=machine learning', 1, 3, quick_mode=True)
        print(f"    搜索结果: {len(result['results'])} 条, 总数: {result['total_results']}")
        
        if result['results']:
            print("    ✅ 服务层搜索成功!")
        else:
            print("    ❌ 服务层搜索返回空结果")
    else:
        print("    ❌ 服务未配置")
        
except Exception as e:
    print(f"    ❌ 异常: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 70)
print("测试完成")
print("=" * 70)
