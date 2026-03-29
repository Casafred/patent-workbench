"""
Notification routes.

This module handles notification and announcement operations including
login notifications and global announcements.
"""

import json
import os
from datetime import datetime
from flask import Blueprint, jsonify, request, session
from backend.config import BASE_DIR

NOTIFICATIONS_FILE = os.path.join(BASE_DIR, 'data', 'notifications.json')

notification_bp = Blueprint('notification', __name__)


def load_notifications():
    """
    Load notifications from JSON file.
    
    Returns:
        dict: Notifications data
    """
    try:
        with open(NOTIFICATIONS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {
            "version": "1.0.0",
            "login_notifications": [],
            "global_announcements": [],
            "user_read_status": {}
        }


def save_notifications(data):
    """
    Save notifications to JSON file.
    
    Args:
        data: Notifications data to save
    """
    os.makedirs(os.path.dirname(NOTIFICATIONS_FILE), exist_ok=True)
    with open(NOTIFICATIONS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


@notification_bp.route('/api/notifications/login', methods=['GET'])
def get_login_notification():
    """
    Get active login notification for current user.
    
    Returns:
        JSON response with login notification if not read
    """
    username = session.get('user', 'guest')
    data = load_notifications()
    
    active_notifications = [
        n for n in data.get('login_notifications', [])
        if n.get('is_active', False)
    ]
    
    if not active_notifications:
        return jsonify({
            'success': True,
            'data': {'has_notification': False}
        })
    
    latest_notification = active_notifications[0]
    notification_version = latest_notification.get('version', '1.0.0')
    
    user_read_status = data.get('user_read_status', {}).get(username, {})
    
    if user_read_status.get(notification_version) == True:
        return jsonify({
            'success': True,
            'data': {'has_notification': False}
        })
    
    return jsonify({
        'success': True,
        'data': {
            'has_notification': True,
            'notification': latest_notification
        }
    })


@notification_bp.route('/api/notifications/login/mark-read', methods=['POST'])
def mark_login_notification_read():
    """
    Mark login notification as read for current user.
    
    Returns:
        JSON response with success status
    """
    username = session.get('user', 'guest')
    data = request.get_json() or {}
    version = data.get('version')
    
    if not version:
        return jsonify({
            'success': False,
            'error': '缺少版本信息'
        }), 400
    
    notifications_data = load_notifications()
    
    if 'user_read_status' not in notifications_data:
        notifications_data['user_read_status'] = {}
    
    if username not in notifications_data['user_read_status']:
        notifications_data['user_read_status'][username] = {}
    
    notifications_data['user_read_status'][username][version] = True
    notifications_data['user_read_status'][username]['last_read_at'] = datetime.now().isoformat()
    
    save_notifications(notifications_data)
    
    return jsonify({
        'success': True,
        'message': '已标记为已读'
    })


@notification_bp.route('/api/announcements/global', methods=['GET'])
def get_global_announcements():
    """
    Get active global announcements.
    
    Returns:
        JSON response with list of active announcements
    """
    data = load_notifications()
    
    active_announcements = [
        a for a in data.get('global_announcements', [])
        if a.get('is_active', False)
    ]
    
    active_announcements.sort(key=lambda x: {
        'high': 0,
        'medium': 1,
        'low': 2
    }.get(x.get('priority', 'medium'), 1))
    
    return jsonify({
        'success': True,
        'data': {
            'announcements': active_announcements
        }
    })


@notification_bp.route('/api/announcements/global/dismiss', methods=['POST'])
def dismiss_global_announcement():
    """
    Dismiss a global announcement for current session.
    
    Returns:
        JSON response with success status
    """
    data = request.get_json() or {}
    announcement_id = data.get('id')
    
    if not announcement_id:
        return jsonify({
            'success': False,
            'error': '缺少公告ID'
        }), 400
    
    dismissed = session.get('dismissed_announcements', [])
    if announcement_id not in dismissed:
        dismissed.append(announcement_id)
        session['dismissed_announcements'] = dismissed
    
    return jsonify({
        'success': True,
        'message': '公告已关闭'
    })


@notification_bp.route('/api/announcements/global/dismissed', methods=['GET'])
def get_dismissed_announcements():
    """
    Get list of dismissed announcement IDs for current session.
    
    Returns:
        JSON response with list of dismissed IDs
    """
    dismissed = session.get('dismissed_announcements', [])
    return jsonify({
        'success': True,
        'data': {
            'dismissed': dismissed
        }
    })


@notification_bp.route('/api/admin/notifications', methods=['GET'])
def admin_get_all_notifications():
    """
    Admin: Get all notifications and announcements.
    
    Returns:
        JSON response with all notification data
    """
    data = load_notifications()
    return jsonify({
        'success': True,
        'data': data
    })


@notification_bp.route('/api/admin/notifications/login', methods=['POST'])
def admin_create_login_notification():
    """
    Admin: Create or update login notification.
    
    Returns:
        JSON response with success status
    """
    notification_data = request.get_json()
    
    if not notification_data:
        return jsonify({
            'success': False,
            'error': '缺少通知数据'
        }), 400
    
    required_fields = ['title', 'content']
    for field in required_fields:
        if field not in notification_data:
            return jsonify({
                'success': False,
                'error': f'缺少必填字段: {field}'
            }), 400
    
    data = load_notifications()
    
    notification = {
        'id': notification_data.get('id', f"notif_{datetime.now().strftime('%Y%m%d%H%M%S')}"),
        'version': notification_data.get('version', data.get('version', '1.0.0')),
        'title': notification_data['title'],
        'type': notification_data.get('type', 'update'),
        'priority': notification_data.get('priority', 'high'),
        'created_at': datetime.now().strftime('%Y-%m-%d'),
        'content': notification_data['content'],
        'is_active': notification_data.get('is_active', True)
    }
    
    existing_index = None
    for i, n in enumerate(data.get('login_notifications', [])):
        if n.get('id') == notification['id']:
            existing_index = i
            break
    
    if existing_index is not None:
        data['login_notifications'][existing_index] = notification
    else:
        if 'login_notifications' not in data:
            data['login_notifications'] = []
        data['login_notifications'].insert(0, notification)
    
    data['last_updated'] = datetime.now().strftime('%Y-%m-%d')
    save_notifications(data)
    
    return jsonify({
        'success': True,
        'message': '登录通知保存成功',
        'data': notification
    })


@notification_bp.route('/api/admin/notifications/login/<notification_id>', methods=['DELETE'])
def admin_delete_login_notification(notification_id):
    """
    Admin: Delete a login notification.
    
    Args:
        notification_id: ID of notification to delete
    
    Returns:
        JSON response with success status
    """
    data = load_notifications()
    
    original_count = len(data.get('login_notifications', []))
    data['login_notifications'] = [
        n for n in data.get('login_notifications', [])
        if n.get('id') != notification_id
    ]
    
    if len(data['login_notifications']) == original_count:
        return jsonify({
            'success': False,
            'error': '通知不存在'
        }), 404
    
    save_notifications(data)
    
    return jsonify({
        'success': True,
        'message': '通知已删除'
    })


@notification_bp.route('/api/admin/announcements', methods=['POST'])
def admin_create_announcement():
    """
    Admin: Create a new global announcement.
    
    Returns:
        JSON response with success status
    """
    announcement_data = request.get_json()
    
    if not announcement_data:
        return jsonify({
            'success': False,
            'error': '缺少公告数据'
        }), 400
    
    required_fields = ['title', 'message']
    for field in required_fields:
        if field not in announcement_data:
            return jsonify({
                'success': False,
                'error': f'缺少必填字段: {field}'
            }), 400
    
    data = load_notifications()
    
    announcement = {
        'id': f"global_{datetime.now().strftime('%Y%m%d%H%M%S')}",
        'type': announcement_data.get('type', 'info'),
        'priority': announcement_data.get('priority', 'medium'),
        'title': announcement_data['title'],
        'message': announcement_data['message'],
        'start_time': announcement_data.get('start_time', ''),
        'end_time': announcement_data.get('end_time', ''),
        'duration': announcement_data.get('duration', ''),
        'impact': announcement_data.get('impact', ''),
        'is_active': announcement_data.get('is_active', True),
        'created_at': datetime.now().strftime('%Y-%m-%d'),
        'created_by': session.get('user', 'admin')
    }
    
    if 'global_announcements' not in data:
        data['global_announcements'] = []
    data['global_announcements'].insert(0, announcement)
    
    data['last_updated'] = datetime.now().strftime('%Y-%m-%d')
    save_notifications(data)
    
    return jsonify({
        'success': True,
        'message': '公告创建成功',
        'data': announcement
    })


@notification_bp.route('/api/admin/announcements/<announcement_id>', methods=['PUT'])
def admin_update_announcement(announcement_id):
    """
    Admin: Update an existing announcement.
    
    Args:
        announcement_id: ID of announcement to update
    
    Returns:
        JSON response with success status
    """
    announcement_data = request.get_json()
    
    if not announcement_data:
        return jsonify({
            'success': False,
            'error': '缺少公告数据'
        }), 400
    
    data = load_notifications()
    
    announcement_index = None
    for i, a in enumerate(data.get('global_announcements', [])):
        if a.get('id') == announcement_id:
            announcement_index = i
            break
    
    if announcement_index is None:
        return jsonify({
            'success': False,
            'error': '公告不存在'
        }), 404
    
    existing = data['global_announcements'][announcement_index]
    existing.update(announcement_data)
    existing['updated_at'] = datetime.now().strftime('%Y-%m-%d')
    data['global_announcements'][announcement_index] = existing
    
    save_notifications(data)
    
    return jsonify({
        'success': True,
        'message': '公告更新成功',
        'data': existing
    })


@notification_bp.route('/api/admin/announcements/<announcement_id>', methods=['DELETE'])
def admin_delete_announcement(announcement_id):
    """
    Admin: Delete an announcement.
    
    Args:
        announcement_id: ID of announcement to delete
    
    Returns:
        JSON response with success status
    """
    data = load_notifications()
    
    original_count = len(data.get('global_announcements', []))
    data['global_announcements'] = [
        a for a in data.get('global_announcements', [])
        if a.get('id') != announcement_id
    ]
    
    if len(data['global_announcements']) == original_count:
        return jsonify({
            'success': False,
            'error': '公告不存在'
        }), 404
    
    save_notifications(data)
    
    return jsonify({
        'success': True,
        'message': '公告已删除'
    })
