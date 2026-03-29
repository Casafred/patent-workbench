"""
模拟网站环境测试 EPO OPS 集成
"""
import os
import sys

print("=" * 70)
print("模拟网站环境测试 EPO OPS 集成")
print("=" * 70)

# 模拟 config.py 加载环境变量
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_FILE = os.path.join(BASE_DIR, '.env')

if os.path.exists(ENV_FILE):
    try:
        from dotenv import load_dotenv
        load_dotenv(ENV_FILE)
        print(f"✓ 加载 .env 文件: {ENV_FILE}")
    except ImportError:
        print("⚠ python-dotenv 未安装，手动加载")
        with open(ENV_FILE, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    parts = line.split('=', 1)
                    if len(parts) == 2:
                        key = parts[0].strip()
                        value = parts[1].strip().strip('"').strip("'")
                        if key and not os.environ.get(key):
                            os.environ[key] = value
        print(f"✓ 手动加载 .env 文件: {ENV_FILE}")
else:
    print(f"⚠ .env 文件不存在: {ENV_FILE}")

print(f"\n[1] 环境变量检查:")
print(f"    EPO_OPS_KEY: {'已设置' if os.getenv('EPO_OPS_KEY') else '未设置'}")
print(f"    EPO_OPS_SECRET: {'已设置' if os.getenv('EPO_OPS_SECRET') else '未设置'}")

print(f"\n[2] 测试服务层初始化...")
from backend.services.epo_ops_service import get_epo_ops_client, EPOOPSClient

client = get_epo_ops_client()
print(f"    consumer_key: {'已设置' if client.consumer_key else '未设置'}")
print(f"    consumer_secret: {'已设置' if client.consumer_secret else '未设置'}")
print(f"    is_configured: {client.is_configured()}")

if client.adapter:
    print(f"    adapter.is_configured: {client.adapter.is_configured()}")
    if client.adapter._client:
        print(f"    adapter._client: 已初始化")
    else:
        print(f"    adapter._client: 未初始化")

print(f"\n[3] 测试搜索...")
try:
    result = client.search('pn=US12410912B2', 1, 5, quick_mode=True)
    print(f"    搜索结果: {len(result['results'])} 条")
    print(f"    总数: {result['total_results']}")
    if result['results']:
        print(f"    第一条: {result['results'][0].patent_number}")
        print("    ✅ 搜索成功!")
    else:
        print("    ❌ 搜索返回空结果")
except Exception as e:
    print(f"    ❌ 搜索失败: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 70)
print("测试完成")
print("=" * 70)
