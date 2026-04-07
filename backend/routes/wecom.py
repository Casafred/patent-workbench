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
import hashlib
import xml.etree.ElementTree as ET
from flask import Blueprint, request, jsonify, session
from backend.services.wecom_service import wecom_service
from backend.services.auth_service import AuthService
from backend.config import BASE_DIR, USERS_FILE

wecom_bp = Blueprint('wecom', __name__)

WECOM_TOKEN = os.environ.get('WECOM_TOKEN', 'patent2024wecom')
WECOM_ENCODING_AES_KEY = os.environ.get('WECOM_ENCODING_AES_KEY', '')


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
                'wecom_bound_at': metadata.get('wecom_bound_at'),
                'notify_batch': metadata.get('notify_batch', True),
                'notify_ocr': metadata.get('notify_ocr', True),
                'notify_system': metadata.get('notify_system', True)
            }
    except Exception as e:
        print(f"获取用户企业微信设置失败: {e}")
    
    return {
        'wecom_userid': None, 
        'wecom_enabled': False, 
        'wecom_bound_at': None,
        'notify_batch': True,
        'notify_ocr': True,
        'notify_system': True
    }


def save_user_wecom_settings(username: str, wecom_userid: str = None, 
                              wecom_enabled: bool = None,
                              notify_batch: bool = None,
                              notify_ocr: bool = None,
                              notify_system: bool = None) -> bool:
    """
    保存用户的企业微信设置
    
    Args:
        username: 用户名
        wecom_userid: 企业微信用户ID
        wecom_enabled: 是否启用推送
        notify_batch: 是否接收批量任务通知
        notify_ocr: 是否接收OCR通知
        notify_system: 是否接收系统公告通知
    
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
            
            if notify_batch is not None:
                data['metadata'][username]['notify_batch'] = notify_batch
            
            if notify_ocr is not None:
                data['metadata'][username]['notify_ocr'] = notify_ocr
            
            if notify_system is not None:
                data['metadata'][username]['notify_system'] = notify_system
            
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
            "enabled": true/false,
            "notify_batch": true/false,
            "notify_ocr": true/false,
            "notify_system": true/false
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
    notify_batch = data.get('notify_batch')
    notify_ocr = data.get('notify_ocr')
    notify_system = data.get('notify_system')
    
    settings = get_user_wecom_settings(username)
    
    if not settings.get('wecom_userid'):
        return jsonify({
            'success': False,
            'error': '请先绑定企业微信'
        }), 400
    
    if save_user_wecom_settings(
        username, 
        wecom_enabled=enabled,
        notify_batch=notify_batch,
        notify_ocr=notify_ocr,
        notify_system=notify_system
    ):
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


@wecom_bp.route('/api/wecom/callback', methods=['GET', 'POST'])
def wecom_callback():
    """
    企业微信回调接口
    
    GET: 验证URL有效性
    POST: 接收企业微信消息
    """
    msg_signature = request.args.get('msg_signature', '')
    timestamp = request.args.get('timestamp', '')
    nonce = request.args.get('nonce', '')
    
    if request.method == 'GET':
        echostr = request.args.get('echostr', '')
        
        if not all([msg_signature, timestamp, nonce, echostr]):
            return 'Invalid parameters', 400
        
        try:
            # 验证签名（无论是否配置EncodingAESKey都需要验证）
            sort_list = [WECOM_TOKEN, timestamp, nonce, echostr]
            sort_list.sort()
            calc_signature = hashlib.sha1(''.join(sort_list).encode()).hexdigest()
            
            if calc_signature != msg_signature:
                print(f"[WecomCallback] 签名验证失败: calc={calc_signature}, recv={msg_signature}")
                return 'Signature verification failed', 403
            
            # 如果有EncodingAESKey，需要解密echostr
            if WECOM_ENCODING_AES_KEY:
                from backend.utils.wecom_crypto import WecomCrypto
                crypto = WecomCrypto(WECOM_TOKEN, WECOM_ENCODING_AES_KEY, wecom_service.corp_id)
                decrypted = crypto.decrypt(echostr)
                return decrypted
            else:
                # 没有配置加密，直接返回echostr
                return echostr
            
        except Exception as e:
            print(f"[WecomCallback] 验证失败: {e}")
            return str(e), 500
    
    else:
        try:
            post_data = request.data.decode('utf-8')
            
            xml_tree = ET.fromstring(post_data)
            encrypt = xml_tree.find('Encrypt').text
            
            from backend.utils.wecom_crypto import WecomCrypto
            
            if not WECOM_ENCODING_AES_KEY:
                return 'success'
            
            crypto = WecomCrypto(WECOM_TOKEN, WECOM_ENCODING_AES_KEY, wecom_service.corp_id)
            
            if not crypto.verify_signature(msg_signature, timestamp, nonce, encrypt):
                return 'Signature verification failed', 403
            
            message = crypto.parse_message(post_data, msg_signature, timestamp, nonce)
            
            msg_type = message.get('MsgType', '')
            from_user = message.get('FromUserName', '')
            
            print(f"[WecomCallback] 收到消息: type={msg_type}, from={from_user}")
            
            if msg_type == 'text':
                content = message.get('Content', '').strip()
                handle_wecom_message(from_user, content)
            
            return 'success'
            
        except Exception as e:
            print(f"[WecomCallback] 处理失败: {e}")
            return 'success'


def handle_wecom_message(wecom_userid: str, content: str):
    """
    处理企业微信用户消息
    
    Args:
        wecom_userid: 企业微信用户ID
        content: 消息内容
    """
    content_lower = content.lower().strip()
    
    if content_lower in ['绑定', 'bind']:
        bind_data_file = os.path.join(BASE_DIR, 'backend', 'data', 'wecom_bind_tokens.json')
        
        try:
            if os.path.exists(bind_data_file):
                with open(bind_data_file, 'r', encoding='utf-8') as f:
                    bind_data = json.load(f)
                
                for token, info in bind_data.items():
                    if time.time() < info.get('expires_at', 0):
                        username = info.get('username')
                        if save_user_wecom_settings(username, wecom_userid=wecom_userid, wecom_enabled=True):
                            wecom_service.send_text(
                                wecom_userid,
                                f"✅ 绑定成功！\n\n您已成功绑定专利工作台账号：{username}\n\n后续任务完成将自动推送到此企业微信。"
                            )
                            return
        except Exception as e:
            print(f"[WecomCallback] 绑定处理失败: {e}")
        
        wecom_service.send_text(
            wecom_userid,
            "❌ 绑定失败\n\n请先在网站的「通知设置」中点击「显示绑定二维码」后再发送「绑定」。"
        )
    
    elif content_lower in ['解绑', 'unbind']:
        try:
            with open(USERS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            metadata = data.get('metadata', {})
            for username, meta in metadata.items():
                if meta.get('wecom_userid') == wecom_userid:
                    unbind_user_wecom(username)
                    wecom_service.send_text(
                        wecom_userid,
                        f"📢 已解绑\n\n您已解除专利工作台账号 {username} 的绑定。"
                    )
                    return
        except Exception as e:
            print(f"[WecomCallback] 解绑处理失败: {e}")
        
        wecom_service.send_text(
            wecom_userid,
            "❌ 解绑失败\n\n您还未绑定任何账号。"
        )
    
    elif content_lower in ['帮助', 'help', '?']:
        wecom_service.send_text(
            wecom_userid,
            """📖 专利工作台企业微信助手

可用命令：
• 绑定 - 绑定网站账号
• 解绑 - 解除账号绑定
• 帮助 - 显示此帮助

更多功能请访问网站：https://ipx.asia"""
        )
    
    else:
        wecom_service.send_text(
            wecom_userid,
            f"收到您的消息：{content}\n\n发送「帮助」查看可用命令。"
        )


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
