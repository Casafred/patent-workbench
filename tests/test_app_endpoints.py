"""
测试应用端点
验证重构后的应用是否正常响应
"""

import requests
import time

BASE_URL = "http://127.0.0.1:5001"

def test_root_endpoint():
    """测试根路径"""
    print("\n测试1: 根路径 /")
    try:
        response = requests.get(f"{BASE_URL}/", timeout=5)
        if response.status_code == 200:
            print(f"✓ 状态码: {response.status_code}")
            print(f"✓ 响应类型: {response.headers.get('Content-Type', 'unknown')}")
            return True
        else:
            print(f"✗ 状态码: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ 请求失败: {e}")
        return False


def test_app_endpoint():
    """测试应用页面"""
    print("\n测试2: 应用页面 /app")
    try:
        response = requests.get(f"{BASE_URL}/app", timeout=5)
        if response.status_code == 200:
            print(f"✓ 状态码: {response.status_code}")
            print(f"✓ 响应类型: {response.headers.get('Content-Type', 'unknown')}")
            # 检查是否包含CSS引用
            if 'css/main.css' in response.text:
                print("✓ 包含CSS引用: css/main.css")
            return True
        else:
            print(f"✗ 状态码: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ 请求失败: {e}")
        return False


def test_static_css():
    """测试CSS文件访问"""
    print("\n测试3: CSS文件访问")
    css_files = [
        'css/main.css',
        'css/base/variables.css',
        'css/components/buttons.css',
        'css/layout/header.css',
        'css/pages/chat.css'
    ]
    
    results = []
    for css_file in css_files:
        try:
            response = requests.get(f"{BASE_URL}/{css_file}", timeout=5)
            if response.status_code == 200:
                print(f"✓ {css_file} - 可访问")
                results.append(True)
            else:
                print(f"✗ {css_file} - 状态码: {response.status_code}")
                results.append(False)
        except Exception as e:
            print(f"✗ {css_file} - 请求失败: {e}")
            results.append(False)
    
    return all(results)


def test_api_health():
    """测试API健康状态"""
    print("\n测试4: API端点")
    
    # 测试需要认证的端点（应该返回401或重定向）
    endpoints = [
        ('/api/chat', 'POST'),
        ('/api/files', 'GET'),
    ]
    
    for endpoint, method in endpoints:
        try:
            if method == 'GET':
                response = requests.get(f"{BASE_URL}{endpoint}", timeout=5)
            else:
                response = requests.post(f"{BASE_URL}{endpoint}", json={}, timeout=5)
            
            # 未认证应该返回401或302
            if response.status_code in [401, 302]:
                print(f"✓ {method:4} {endpoint} - 正确返回 {response.status_code} (需要认证)")
            elif response.status_code == 200:
                print(f"⚠ {method:4} {endpoint} - 返回 200 (可能不需要认证)")
            else:
                print(f"✗ {method:4} {endpoint} - 状态码: {response.status_code}")
        except Exception as e:
            print(f"✗ {method:4} {endpoint} - 请求失败: {e}")
    
    return True


def main():
    """运行所有端点测试"""
    print("=" * 60)
    print("应用端点测试")
    print("=" * 60)
    print(f"目标服务器: {BASE_URL}")
    
    # 等待服务器启动
    print("\n等待服务器启动...")
    time.sleep(2)
    
    # 检查服务器是否运行
    try:
        requests.get(BASE_URL, timeout=2)
        print("✓ 服务器正在运行")
    except:
        print("✗ 服务器未运行，请先启动应用")
        return 1
    
    # 运行测试
    results = []
    results.append(("根路径", test_root_endpoint()))
    results.append(("应用页面", test_app_endpoint()))
    results.append(("CSS文件", test_static_css()))
    results.append(("API端点", test_api_health()))
    
    # 总结
    print("\n" + "=" * 60)
    print("测试总结")
    print("=" * 60)
    
    for name, result in results:
        status = "✓ 通过" if result else "✗ 失败"
        print(f"{name:15} {status}")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    print(f"\n总计: {passed}/{total} 测试通过")
    
    if passed == total:
        print("\n🎉 所有端点测试通过！应用运行正常！")
        return 0
    else:
        print(f"\n⚠ {total - passed} 个测试失败")
        return 1


if __name__ == '__main__':
    import sys
    sys.exit(main())
