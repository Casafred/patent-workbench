#!/usr/bin/env python3
"""
测试反检测管理器
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.scraper.config import ScrapingConfig
from backend.scraper.anti_detection import AntiDetectionManager


def test_anti_detection_manager():
    """测试反检测管理器功能"""
    print("=== 测试反检测管理器 ===\n")
    
    # 创建配置
    config = ScrapingConfig.get_default_config()
    
    # 创建反检测管理器
    anti_detection = AntiDetectionManager(config)
    
    print("1. 测试User-Agent生成...")
    for i in range(3):
        ua = anti_detection.get_random_user_agent()
        print(f"   UA {i+1}: {ua[:80]}...")
    
    print("\n2. 测试视口大小生成...")
    for i in range(3):
        viewport = anti_detection.get_random_viewport()
        print(f"   视口 {i+1}: {viewport['width']}x{viewport['height']}")
    
    print("\n3. 测试屏幕分辨率生成...")
    for i in range(3):
        screen = anti_detection.get_random_screen_resolution()
        print(f"   屏幕 {i+1}: {screen['width']}x{screen['height']}")
    
    print("\n4. 测试HTTP头部生成...")
    headers = anti_detection.get_stealth_headers()
    for key, value in list(headers.items())[:5]:
        print(f"   {key}: {value}")
    
    print("\n5. 测试浏览器启动参数...")
    args = anti_detection.get_browser_launch_args()
    print(f"   参数数量: {len(args)}")
    print(f"   示例参数: {args[:3]}")
    
    print("\n6. 测试上下文选项...")
    context_options = anti_detection.get_context_options()
    print(f"   用户代理: {context_options['user_agent'][:50]}...")
    print(f"   视口: {context_options['viewport']}")
    print(f"   语言环境: {context_options['locale']}")
    
    print("\n7. 测试身份轮换逻辑...")
    for request_count in [5, 10, 15, 20, 25]:
        should_rotate = anti_detection.should_rotate_identity(request_count)
        print(f"   请求 {request_count}: {'需要轮换' if should_rotate else '保持当前'}")
    
    print("\n8. 测试当前身份信息...")
    identity = anti_detection.get_current_identity()
    print(f"   当前UA: {identity['user_agent'][:50] if identity['user_agent'] else 'None'}...")
    print(f"   当前视口: {identity['viewport']}")
    
    print("\n✅ 反检测管理器测试完成！")


def test_stealth_features():
    """测试隐身功能特性"""
    print("\n=== 测试隐身功能特性 ===\n")
    
    config = ScrapingConfig.get_default_config()
    anti_detection = AntiDetectionManager(config)
    
    print("1. 测试配置选项...")
    print(f"   User-Agent轮换: {config.user_agent_rotation}")
    print(f"   视口随机化: {config.viewport_randomization}")
    print(f"   JavaScript启用: {config.javascript_enabled}")
    
    print("\n2. 测试多次生成的随机性...")
    user_agents = set()
    viewports = set()
    
    for _ in range(10):
        ua = anti_detection.get_random_user_agent()
        viewport = anti_detection.get_random_viewport()
        
        user_agents.add(ua)
        viewports.add(f"{viewport['width']}x{viewport['height']}")
    
    print(f"   生成了 {len(user_agents)} 个不同的User-Agent")
    print(f"   生成了 {len(viewports)} 个不同的视口大小")
    
    if len(user_agents) > 1:
        print("   ✅ User-Agent随机化工作正常")
    else:
        print("   ⚠️  User-Agent随机化可能有问题")
    
    if len(viewports) > 1:
        print("   ✅ 视口随机化工作正常")
    else:
        print("   ⚠️  视口随机化可能有问题")


def main():
    """主函数"""
    print("反检测管理器测试\n")
    
    try:
        test_anti_detection_manager()
        test_stealth_features()
        
        print("\n🎉 所有测试通过！反检测管理器功能正常。")
        
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()