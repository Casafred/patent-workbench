"""
通知辅助模块

提供便捷的通知发送函数，供其他业务模块调用
"""

from flask import session
from backend.services.wecom_service import wecom_service
from backend.routes.wecom import get_user_wecom_settings


def notify_user(username: str, title: str, description: str, 
                url: str = "", notify_type: str = None) -> bool:
    """
    向用户发送通知
    
    Args:
        username: 用户名
        title: 通知标题
        description: 通知描述
        url: 跳转链接（可选）
        notify_type: 通知类型 (batch/ocr/system)
    
    Returns:
        bool: 是否发送成功
    """
    settings = get_user_wecom_settings(username)
    
    if not settings.get('wecom_userid') or not settings.get('wecom_enabled'):
        return False
    
    if notify_type:
        notify_key = f'notify_{notify_type}'
        if not settings.get(notify_key, True):
            return False
    
    result = wecom_service.send_textcard(
        user_id=settings['wecom_userid'],
        title=title,
        description=description,
        url=url,
        btn_text="查看详情" if url else "知道了"
    )
    
    return result.get('success', False)


def notify_current_user(title: str, description: str, url: str = "", 
                        notify_type: str = None) -> bool:
    """
    向当前登录用户发送通知
    
    Args:
        title: 通知标题
        description: 通知描述
        url: 跳转链接（可选）
        notify_type: 通知类型 (batch/ocr/system)
    
    Returns:
        bool: 是否发送成功
    """
    username = session.get('user')
    if not username:
        return False
    
    return notify_user(username, title, description, url, notify_type)


def notify_batch_complete(username: str, task_type: str, 
                          total_count: int, success_count: int,
                          duration: str = "", result_url: str = "") -> bool:
    """
    发送批量任务完成通知
    
    Args:
        username: 用户名
        task_type: 任务类型（如"专利分析"、"OCR解析"）
        total_count: 总数量
        success_count: 成功数量
        duration: 耗时
        result_url: 结果链接
    
    Returns:
        bool: 是否发送成功
    """
    settings = get_user_wecom_settings(username)
    
    if not settings.get('wecom_userid') or not settings.get('wecom_enabled'):
        return False
    
    if not settings.get('notify_batch', True):
        return False
    
    result = wecom_service.send_batch_complete_notification(
        user_id=settings['wecom_userid'],
        task_type=task_type,
        total_count=total_count,
        success_count=success_count,
        duration=duration,
        result_url=result_url
    )
    
    return result.get('success', False)


def notify_ocr_complete(username: str, file_name: str, page_count: int,
                        result_url: str = "") -> bool:
    """
    发送OCR解析完成通知
    
    Args:
        username: 用户名
        file_name: 文件名
        page_count: 页数
        result_url: 结果链接
    
    Returns:
        bool: 是否发送成功
    """
    settings = get_user_wecom_settings(username)
    
    if not settings.get('wecom_userid') or not settings.get('wecom_enabled'):
        return False
    
    if not settings.get('notify_ocr', True):
        return False
    
    result = wecom_service.send_textcard(
        user_id=settings['wecom_userid'],
        title="✅ OCR解析完成",
        description=f'<div class="highlight">{file_name}</div>\n解析页数：{page_count} 页',
        url=result_url,
        btn_text="查看结果" if result_url else "知道了"
    )
    
    return result.get('success', False)


def notify_patent_analysis_complete(username: str, patent_count: int,
                                    result_url: str = "") -> bool:
    """
    发送专利分析完成通知
    
    Args:
        username: 用户名
        patent_count: 专利数量
        result_url: 结果链接
    
    Returns:
        bool: 是否发送成功
    """
    settings = get_user_wecom_settings(username)
    
    if not settings.get('wecom_userid') or not settings.get('wecom_enabled'):
        return False
    
    if not settings.get('notify_batch', True):
        return False
    
    result = wecom_service.send_textcard(
        user_id=settings['wecom_userid'],
        title="✅ 专利分析完成",
        description=f'分析专利：<font color="info">{patent_count}</font> 篇',
        url=result_url,
        btn_text="查看结果" if result_url else "知道了"
    )
    
    return result.get('success', False)


def notify_error(username: str, task_name: str, error_message: str) -> bool:
    """
    发送任务错误通知
    
    Args:
        username: 用户名
        task_name: 任务名称
        error_message: 错误信息
    
    Returns:
        bool: 是否发送成功
    """
    settings = get_user_wecom_settings(username)
    
    if not settings.get('wecom_userid') or not settings.get('wecom_enabled'):
        return False
    
    result = wecom_service.send_textcard(
        user_id=settings['wecom_userid'],
        title="❌ 任务执行失败",
        description=f'<div class="highlight">{task_name}</div>\n错误：{error_message}',
        url="",
        btn_text="知道了"
    )
    
    return result.get('success', False)


def notify_system_announcement(username: str, title: str, content: str,
                               url: str = "") -> bool:
    """
    发送系统公告通知
    
    Args:
        username: 用户名
        title: 公告标题
        content: 公告内容
        url: 跳转链接（可选）
    
    Returns:
        bool: 是否发送成功
    """
    settings = get_user_wecom_settings(username)
    
    if not settings.get('wecom_userid') or not settings.get('wecom_enabled'):
        return False
    
    if not settings.get('notify_system', True):
        return False
    
    result = wecom_service.send_textcard(
        user_id=settings['wecom_userid'],
        title=f"📢 {title}",
        description=content,
        url=url,
        btn_text="查看详情" if url else "知道了"
    )
    
    return result.get('success', False)
