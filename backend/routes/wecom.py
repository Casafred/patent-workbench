"""
企业微信路由模块

功能：
1. 用户绑定企业微信
2. 用户解绑企业微信
3. 查询绑定状态
4. 企业微信回调处理
5. 管理员广播消息
"""

import json
import os
import time
from flask import Blueprint, request, jsonify, session
from backend.services.wecom_service import wecom_service
from backend.services.auth_service import AuthService
from backend.config import BASE_DIR, USERS_FILE

wecom_bp = Blueprint('wecom', __name__)


def get_user_wecom_settings(username: str) -> dict:
    """
    获取用户的企业微信设置
    
    Args:
        username: 用户名
    
    Returns:
        dict: 企业微信设置
    """
    try:
        with open(USERS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if isinstance(data, dict) and 'metadata' in data:
            metadata = data['metadata'].get(username, {})
            return {
                'wecom_userid': metadata.get('wecom_userid'),
                'wecom_enabled': metadata.get('wecom_enabled', False),
                'wecom_bound_at': metadata.get('wecom_bound_at')
            }
    except Exception as e:
        print(f"获取用户企业微信设置失败: {e}")
    
    return {'wecom_userid': None, 'wecom_enabled': False, 'wecom_bound_at': None}


def save_user_wecom_settings(username: str, wecom_userid: str = None, 
                              wecom_enabled: bool = None) -> bool:
    """
    保存用户的企业微信设置
    
    Args:
        username: 用户名
        wecom_userid: 企业微信用户ID
        wecom_enabled: 是否启用推送
    
    Returns:
        bool: 是否成功
    """
    try:
        with open(USERS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if isinstance(data, dict) and 'users' in data:
            if 'metadata' not in data:
                data['metadata'] = {}
            
            if username not in data['metadata']:
                data['metadata'][username] = {}
            
            if wecom_userid is not None:
                data['metadata'][username]['wecom_userid'] = wecom_userid
                data['metadata'][username]['wecom_bound_at'] = time.strftime('%Y-%m-%d %H:%M:%S')
            
            if wecom_enabled is not None:
                data['metadata'][username]['wecom_enabled'] = wecom_enabled
            
            with open(USERS_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            return True
    except Exception as e:
        print(f"保存用户企业微信设置失败: {e}")
    
    return False


def unbind_user_wecom(username: str) -> bool:
    """
    解绑用户的企业微信
    
    Args:
        username: 用户名
    
    Returns:
        bool: 是否成功
    """
    try:
        with open(USERS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if isinstance(data, dict) and 'metadata' in data:
            if username in data['metadata']:
                data['metadata'][username].pop('wecom_userid', None)
                data['metadata'][username].pop('wecom_bound_at', None)
                data['metadata'][username]['wecom_enabled'] = False
                
                with open(USERS_FILE, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                
                return True
    except Exception as e:
        print(f"解绑企业微信失败: {e}")
    
    return False


@wecom_bp.route('/api/wecom/status', methods=['GET'])
def get_wecom_status():
    """
    获取企业微信服务状态
    
    Returns:
        JSON: 服务状态信息
    """
    return jsonify({
        'success': True,
        'data': {
            'configured': wecom_service.is_configured(),
            'enabled': wecom_service.is_enabled()
        }
    })


@wecom_bp.route('/api/wecom/bind/status', methods=['GET'])
def get_bind_status():
    """
    获取当前用户的企业微信绑定状态
    
    Returns:
        JSON: 绑定状态
    """
    username = session.get('user')
    if not username:
        return jsonify({
            'success': False,
            'error': '未登录'
        }), 401
    
    settings = get_user_wecom_settings(username)
    
    return jsonify({
        'success': True,
        'data': {
            'bound': bool(settings.get('wecom_userid')),
            'wecom_userid': settings.get('wecom_userid'),
            'enabled': settings.get('wecom_enabled', False),
            'bound_at': settings.get('wecom_bound_at'),
            'service_available': wecom_service.is_enabled()
        }
    })


@wecom_bp.route('/api/wecom/bind/qrcode', methods=['GET'])
def generate_bind_qrcode():
    """
    生成绑定二维码
    
    Returns:
        JSON: 二维码URL和绑定token
    """
    username = session.get('user')
    if not username:
        return jsonify({
            'success': False,
            'error': '未登录'
        }), 401
    
    if not wecom_service.is_configured():
        return jsonify({
            'success': False,
            'error': '企业微信服务未配置'
        }), 400
    
    result = wecom_service.generate_bind_qrcode(username)
    
    if result.get('success'):
        return jsonify({
            'success': True,
            'data': {
                'qrcode_url': result['qrcode_url'],
                'bind_token': result['bind_token'],
                'expires_in': result['expires_in']
            }
        })
    else:
        return jsonify({
            'success': False,
            'error': result.get('error', '生成二维码失败')
        }), 500


@wecom_bp.route('/api/wecom/bind/confirm', methods=['POST'])
def confirm_bind():
    """
    确认绑定（用户扫码后调用）
    
    请求体:
        {
            "bind_token": "绑定token",
            "wecom_userid": "企业微信用户ID"
        }
    
    Returns:
        JSON: 绑定结果
    """
    data = request.get_json() or {}
    bind_token = data.get('bind_token')
    wecom_userid = data.get('wecom_userid')
    
    if not bind_token or not wecom_userid:
        return jsonify({
            'success': False,
            'error': '缺少必要参数'
        }), 400
    
    username = wecom_service.verify_bind_token(bind_token)
    
    if not username:
        return jsonify({
            'success': False,
            'error': '绑定链接已过期或无效'
        }), 400
    
    if save_user_wecom_settings(username, wecom_userid=wecom_userid, wecom_enabled=True):
        wecom_service.clear_bind_token(bind_token)
        
        wecom_service.send_text(
            wecom_userid,
            f"🎉 企业微信绑定成功！\n\n您已成功绑定专利工作台账号：{username}\n\n后续任务完成将自动推送到此企业微信。"
        )
        
        return jsonify({
            'success': True,
            'message': '绑定成功'
        })
    else:
        return jsonify({
            'success': False,
            'error': '保存绑定信息失败'
        }), 500


@wecom_bp.route('/api/wecom/bind/manual', methods=['POST'])
def manual_bind():
    """
    手动绑定企业微信账号
    
    请求体:
        {
            "wecom_userid": "企业微信用户ID（通讯录中的账号）"
        }
    
    Returns:
        JSON: 绑定结果
    """
    username = session.get('user')
    if not username:
        return jsonify({
            'success': False,
            'error': '未登录'
        }), 401
    
    data = request.get_json() or {}
    wecom_userid = data.get('wecom_userid', '').strip()
    
    if not wecom_userid:
        return jsonify({
            'success': False,
            'error': '请输入企业微信账号'
        }), 400
    
    test_result = wecom_service.send_text(
        wecom_userid,
        f"🎉 企业微信绑定验证\n\n正在验证您的企业微信账号是否正确..."
    )
    
    if not test_result.get('success'):
        error_msg = test_result.get('error', '发送失败')
        if test_result.get('errcode') in [60011, 60012]:
            error_msg = '用户ID不存在或不在应用可见范围内'
        elif test_result.get('errcode') == 60020:
            error_msg = '服务器IP未加入企业微信白名单'
        
        return jsonify({
            'success': False,
            'error': f'验证失败：{error_msg}'
        }), 400
    
    if save_user_wecom_settings(username, wecom_userid=wecom_userid, wecom_enabled=True):
        wecom_service.send_text(
            wecom_userid,
            f"✅ 绑定成功！\n\n您已成功绑定专利工作台账号：{username}\n\n后续任务完成将自动推送到此企业微信。"
        )
        
        return jsonify({
            'success': True,
            'message': '绑定成功'
        })
    else:
        return jsonify({
            'success': False,
            'error': '保存绑定信息失败'
        }), 500


@wecom_bp.route('/api/wecom/unbind', methods=['POST'])
def unbind_wecom():
    """
    解绑企业微信
    
    Returns:
        JSON: 解绑结果
    """
    username = session.get('user')
    if not username:
        return jsonify({
            'success': False,
            'error': '未登录'
        }), 401
    
    settings = get_user_wecom_settings(username)
    
    if settings.get('wecom_userid'):
        wecom_service.send_text(
            settings['wecom_userid'],
            f"📢 企业微信已解绑\n\n您已解除专利工作台账号 {username} 的绑定，将不再收到推送通知。"
        )
    
    if unbind_user_wecom(username):
        return jsonify({
            'success': True,
            'message': '解绑成功'
        })
    else:
        return jsonify({
            'success': False,
            'error': '解绑失败'
        }), 500


@wecom_bp.route('/api/wecom/settings', methods=['POST'])
def update_wecom_settings():
    """
    更新企业微信推送设置
    
    请求体:
        {
            "enabled": true/false
        }
    
    Returns:
        JSON: 更新结果
    """
    username = session.get('user')
    if not username:
        return jsonify({
            'success': False,
            'error': '未登录'
        }), 401
    
    data = request.get_json() or {}
    enabled = data.get('enabled')
    
    if enabled is None:
        return jsonify({
            'success': False,
            'error': '缺少参数'
        }), 400
    
    settings = get_user_wecom_settings(username)
    
    if not settings.get('wecom_userid'):
        return jsonify({
            'success': False,
            'error': '请先绑定企业微信'
        }), 400
    
    if save_user_wecom_settings(username, wecom_enabled=enabled):
        return jsonify({
            'success': True,
            'message': '设置已更新'
        })
    else:
        return jsonify({
            'success': False,
            'error': '保存设置失败'
        }), 500


@wecom_bp.route('/api/wecom/test', methods=['POST'])
def send_test_message():
    """
    发送测试消息
    
    Returns:
        JSON: 发送结果
    """
    username = session.get('user')
    if not username:
        return jsonify({
            'success': False,
            'error': '未登录'
        }), 401
    
    settings = get_user_wecom_settings(username)
    
    if not settings.get('wecom_userid'):
        return jsonify({
            'success': False,
            'error': '请先绑定企业微信'
        }), 400
    
    result = wecom_service.send_textcard(
        user_id=settings['wecom_userid'],
        title="📢 测试消息",
        description="这是一条测试消息，如果您收到此消息，说明企业微信推送功能正常。",
        url="",
        btn_text="收到"
    )
    
    if result.get('success'):
        return jsonify({
            'success': True,
            'message': '测试消息已发送，请查看企业微信'
        })
    else:
        return jsonify({
            'success': False,
            'error': result.get('error', '发送失败')
        }), 500


@wecom_bp.route('/api/admin/wecom/broadcast', methods=['POST'])
def admin_broadcast():
    """
    管理员广播消息（向所有已绑定用户发送）
    
    请求体:
        {
            "title": "消息标题",
            "content": "消息内容",
            "url": "跳转链接（可选）"
        }
    
    Returns:
        JSON: 发送结果
    """
    username = session.get('user')
    if not username:
        return jsonify({
            'success': False,
            'error': '未登录'
        }), 401
    
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    content = data.get('content', '').strip()
    url = data.get('url', '')
    
    if not title or not content:
        return jsonify({
            'success': False,
            'error': '标题和内容不能为空'
        }), 400
    
    try:
        with open(USERS_FILE, 'r', encoding='utf-8') as f:
            users_data = json.load(f)
        
        metadata = users_data.get('metadata', {})
        
        success_count = 0
        fail_count = 0
        
        for uname, meta in metadata.items():
            wecom_userid = meta.get('wecom_userid')
            wecom_enabled = meta.get('wecom_enabled', False)
            
            if wecom_userid and wecom_enabled:
                result = wecom_service.send_textcard(
                    user_id=wecom_userid,
                    title=title,
                    description=content,
                    url=url,
                    btn_text="查看详情" if url else "知道了"
                )
                
                if result.get('success'):
                    success_count += 1
                else:
                    fail_count += 1
        
        return jsonify({
            'success': True,
            'message': f'广播完成：成功 {success_count} 人，失败 {fail_count} 人'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'广播失败：{str(e)}'
        }), 500


def send_notification_to_user(username: str, title: str, description: str, 
                               url: str = "", task_type: str = None) -> bool:
    """
    向指定用户发送通知（供其他模块调用）
    
    Args:
        username: 用户名
        title: 标题
        description: 描述
        url: 跳转链接
        task_type: 任务类型（可选，用于特殊处理）
    
    Returns:
        bool: 是否发送成功
    """
    settings = get_user_wecom_settings(username)
    
    if not settings.get('wecom_userid') or not settings.get('wecom_enabled'):
        return False
    
    result = wecom_service.send_textcard(
        user_id=settings['wecom_userid'],
        title=title,
        description=description,
        url=url,
        btn_text="查看详情" if url else "知道了"
    )
    
    return result.get('success', False)


def send_batch_complete_to_user(username: str, task_type: str, 
                                 total_count: int, success_count: int,
                                 duration: str = "", result_url: str = "") -> bool:
    """
    向用户发送批量任务完成通知（供其他模块调用）
    
    Args:
        username: 用户名
        task_type: 任务类型
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
    
    result = wecom_service.send_batch_complete_notification(
        user_id=settings['wecom_userid'],
        task_type=task_type,
        total_count=total_count,
        success_count=success_count,
        duration=duration,
        result_url=result_url
    )
    
    return result.get('success', False)
