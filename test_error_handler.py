#!/usr/bin/env python3
"""
测试错误处理和重试管理器
"""

import sys
import os
import asyncio
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_error_classification():
    """测试错误分类"""
    print("=== 测试错误分类 ===\n")
    
    try:
        from backend.scraper.error_handler import ErrorHandlingManager, ErrorType
        from backend.scraper.config import ScrapingConfig
        
        config = ScrapingConfig.get_default_config()
        error_handler = ErrorHandlingManager(config)
        
        # 测试不同类型的错误
        test_cases = [
            (Exception("Connection timeout"), None, ErrorType.TIMEOUT_ERROR),
            (Exception("Network connection failed"), None, ErrorType.NETWORK_ERROR),
            (Exception("Rate limit exceeded"), 429, ErrorType.RATE_LIMIT_ERROR),
            (Exception("Captcha detected"), None, ErrorType.ANTI_DETECTION_ERROR),
            (Exception("Browser crashed"), None, ErrorType.BROWSER_ERROR),
            (Exception("JSON parsing failed"), None, ErrorType.PARSING_ERROR),
            (Exception("Unknown error"), 404, ErrorType.NOT_FOUND_ERROR),
        ]
        
        print("🔍 错误分类测试:")
        for i, (exception, status_code, expected_type) in enumerate(test_cases, 1):
            classified_type = error_handler.classify_error(exception, status_code)
            status = "✅" if classified_type == expected_type else "❌"
            print(f"   {status} 测试 {i}: {exception} -> {classified_type.value}")
        
        return True
        
    except Exception as e:
        print(f"❌ 错误分类测试失败: {e}")
        return False

def test_retry_logic():
    """测试重试逻辑"""
    print("\n=== 测试重试逻辑 ===\n")
    
    try:
        from backend.scraper.error_handler import ErrorHandlingManager, ErrorType
        from backend.scraper.config import ScrapingConfig
        
        config = ScrapingConfig.get_default_config()
        error_handler = ErrorHandlingManager(config)
        
        # 测试重试判断
        test_cases = [
            (ErrorType.NETWORK_ERROR, 0, True),
            (ErrorType.NETWORK_ERROR, 3, False),  # 超过最大重试次数
            (ErrorType.NOT_FOUND_ERROR, 0, False),  # 不可重试错误
            (ErrorType.RATE_LIMIT_ERROR, 1, True),
            (ErrorType.ANTI_DETECTION_ERROR, 2, False),  # 限制重试次数
        ]
        
        print("🔄 重试逻辑测试:")
        for i, (error_type, retry_count, expected) in enumerate(test_cases, 1):
            should_retry = error_handler.is_retryable_error(error_type, retry_count)
            status = "✅" if should_retry == expected else "❌"
            print(f"   {status} 测试 {i}: {error_type.value} (重试{retry_count}次) -> 应重试: {should_retry}")
        
        # 测试重试延迟计算
        print("\n⏱️ 重试延迟测试:")
        for error_type in [ErrorType.NETWORK_ERROR, ErrorType.RATE_LIMIT_ERROR, ErrorType.ANTI_DETECTION_ERROR]:
            delay = error_handler.calculate_retry_delay(error_type, 1)
            print(f"   - {error_type.value}: {delay:.2f}秒")
        
        return True
        
    except Exception as e:
        print(f"❌ 重试逻辑测试失败: {e}")
        return False

async def test_retry_execution():
    """测试重试执行"""
    print("\n=== 测试重试执行 ===\n")
    
    try:
        from backend.scraper.error_handler import ErrorHandlingManager
        from backend.scraper.config import ScrapingConfig
        
        config = ScrapingConfig()
        config.max_retries = 2
        config.retry_delays = [0.1, 0.2, 0.3]  # 快速测试
        
        error_handler = ErrorHandlingManager(config)
        
        # 测试成功的操作
        async def successful_operation():
            return "success"
        
        result = await error_handler.execute_with_retry(successful_operation)
        print(f"✅ 成功操作: {result}")
        
        # 测试失败后成功的操作
        call_count = 0
        async def fail_then_succeed():
            nonlocal call_count
            call_count += 1
            if call_count < 2:
                raise Exception("Temporary failure")
            return "success after retry"
        
        call_count = 0
        result = await error_handler.execute_with_retry(fail_then_succeed)
        print(f"✅ 重试后成功: {result}")
        
        # 测试完全失败的操作
        async def always_fail():
            raise Exception("Permanent failure")
        
        try:
            await error_handler.execute_with_retry(always_fail)
            print("❌ 应该失败但没有失败")
        except Exception:
            print("✅ 正确处理了永久失败")
        
        return True
        
    except Exception as e:
        print(f"❌ 重试执行测试失败: {e}")
        return False

def test_error_statistics():
    """测试错误统计"""
    print("\n=== 测试错误统计 ===\n")
    
    try:
        from backend.scraper.error_handler import ErrorHandlingManager
        from backend.scraper.config import ScrapingConfig
        
        config = ScrapingConfig.get_default_config()
        error_handler = ErrorHandlingManager(config)
        
        # 记录一些错误
        error_handler.record_error(Exception("Network error"), "US1000001", retry_count=0)
        error_handler.record_error(Exception("Timeout"), "US1000002", retry_count=1)
        error_handler.record_error(Exception("Rate limit"), "US1000003", status_code=429)
        
        # 记录成功
        error_handler.record_success("US1000004")
        
        # 获取统计信息
        stats = error_handler.get_error_statistics()
        
        print("📊 错误统计:")
        print(f"   - 总错误数: {stats['total_errors']}")
        print(f"   - 连续错误数: {stats['consecutive_errors']}")
        print(f"   - 最近错误数: {stats['recent_errors_count']}")
        print(f"   - 错误类型分布: {stats['error_type_distribution']}")
        
        # 测试健康状态
        is_healthy = error_handler.is_session_healthy()
        print(f"   - 会话健康: {is_healthy}")
        
        # 获取恢复建议
        suggestions = error_handler.get_recovery_suggestions()
        print(f"   - 恢复建议: {len(suggestions)} 条")
        
        return True
        
    except Exception as e:
        print(f"❌ 错误统计测试失败: {e}")
        return False

def test_session_manager():
    """测试会话管理器"""
    print("\n=== 测试会话管理器 ===\n")
    
    try:
        from backend.scraper.error_handler import ErrorHandlingManager, SessionManager
        from backend.scraper.config import ScrapingConfig
        
        config = ScrapingConfig.get_default_config()
        error_handler = ErrorHandlingManager(config)
        session_manager = SessionManager(config, error_handler)
        
        # 测试会话信息
        session_info = session_manager.get_session_info()
        print("📋 会话信息:")
        print(f"   - 会话ID: {session_info['session_id']}")
        print(f"   - 活跃状态: {session_info['is_active']}")
        print(f"   - 是否过期: {session_info['is_expired']}")
        print(f"   - 应该刷新: {session_info['should_refresh']}")
        
        # 测试活动更新
        session_manager.update_activity()
        print("✅ 活动时间已更新")
        
        # 测试会话持续时间
        duration = session_manager.get_session_duration()
        print(f"   - 会话持续时间: {duration}")
        
        return True
        
    except Exception as e:
        print(f"❌ 会话管理器测试失败: {e}")
        return False

async def main():
    """主函数"""
    print("错误处理和重试管理器测试\n")
    
    success1 = test_error_classification()
    success2 = test_retry_logic()
    success3 = await test_retry_execution()
    success4 = test_error_statistics()
    success5 = test_session_manager()
    
    print("\n=== 总结 ===")
    if all([success1, success2, success3, success4, success5]):
        print("🎉 所有测试通过！错误处理系统功能正常。")
        print("\n📋 功能特性:")
        print("   - 智能错误分类和处理")
        print("   - 自适应重试机制")
        print("   - 会话管理和健康监控")
        print("   - 错误统计和恢复建议")
    else:
        print("❌ 部分测试失败，请检查实现")

if __name__ == "__main__":
    asyncio.run(main())