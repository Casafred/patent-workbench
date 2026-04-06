"""
Email Trigger API Routes.

This module provides API endpoints for email trigger whitelist management.
"""

from flask import Blueprint, jsonify, request, session

from backend.services.email_trigger_service import (
    EmailTriggerLogger,
    EmailTriggerWhitelist,
    email_trigger_scheduler,
)

email_trigger_bp = Blueprint('email_trigger', __name__)


@email_trigger_bp.route('/api/email-trigger/whitelist', methods=['GET'])
def get_whitelist():
    if not session.get('admin_logged_in'):
        return jsonify({'success': False, 'message': '未授权'}), 401
    
    whitelist = EmailTriggerWhitelist.get_whitelist()
    settings = EmailTriggerWhitelist.get_settings()
    
    return jsonify({
        'success': True,
        'whitelist': whitelist,
        'settings': settings
    })


@email_trigger_bp.route('/api/email-trigger/whitelist/add', methods=['POST'])
def add_to_whitelist():
    if not session.get('admin_logged_in'):
        return jsonify({'success': False, 'message': '未授权'}), 401
    
    data = request.get_json()
    email_addr = data.get('email', '').strip()
    username = data.get('username', '').strip()
    allowed_commands = data.get('allowed_commands')
    max_daily_commands = data.get('max_daily_commands', 20)
    notes = data.get('notes', '')
    
    if not email_addr:
        return jsonify({'success': False, 'message': '邮箱地址不能为空'})
    
    if not username:
        return jsonify({'success': False, 'message': '用户名不能为空'})
    
    import re
    if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email_addr):
        return jsonify({'success': False, 'message': '邮箱格式不正确'})
    
    success, message = EmailTriggerWhitelist.add_to_whitelist(
        email_addr, username, allowed_commands, max_daily_commands, notes
    )
    
    return jsonify({'success': success, 'message': message})


@email_trigger_bp.route('/api/email-trigger/whitelist/remove', methods=['POST'])
def remove_from_whitelist():
    if not session.get('admin_logged_in'):
        return jsonify({'success': False, 'message': '未授权'}), 401
    
    data = request.get_json()
    email_addr = data.get('email', '').strip()
    
    if not email_addr:
        return jsonify({'success': False, 'message': '邮箱地址不能为空'})
    
    success, message = EmailTriggerWhitelist.remove_from_whitelist(email_addr)
    
    return jsonify({'success': success, 'message': message})


@email_trigger_bp.route('/api/email-trigger/whitelist/toggle', methods=['POST'])
def toggle_whitelist_entry():
    if not session.get('admin_logged_in'):
        return jsonify({'success': False, 'message': '未授权'}), 401
    
    data = request.get_json()
    email_addr = data.get('email', '').strip()
    enabled = data.get('enabled', True)
    
    if not email_addr:
        return jsonify({'success': False, 'message': '邮箱地址不能为空'})
    
    success, message = EmailTriggerWhitelist.toggle_whitelist_entry(email_addr, enabled)
    
    return jsonify({'success': success, 'message': message})


@email_trigger_bp.route('/api/email-trigger/whitelist/update', methods=['POST'])
def update_whitelist_entry():
    if not session.get('admin_logged_in'):
        return jsonify({'success': False, 'message': '未授权'}), 401
    
    data = request.get_json()
    email_addr = data.get('email', '').strip()
    
    if not email_addr:
        return jsonify({'success': False, 'message': '邮箱地址不能为空'})
    
    update_fields = {}
    if 'allowed_commands' in data:
        update_fields['allowed_commands'] = data['allowed_commands']
    if 'max_daily_commands' in data:
        update_fields['max_daily_commands'] = data['max_daily_commands']
    if 'notes' in data:
        update_fields['notes'] = data['notes']
    
    success, message = EmailTriggerWhitelist.update_whitelist_entry(email_addr, **update_fields)
    
    return jsonify({'success': success, 'message': message})


@email_trigger_bp.route('/api/email-trigger/settings', methods=['GET'])
def get_settings():
    if not session.get('admin_logged_in'):
        return jsonify({'success': False, 'message': '未授权'}), 401
    
    settings = EmailTriggerWhitelist.get_settings()
    
    return jsonify({
        'success': True,
        'settings': settings
    })


@email_trigger_bp.route('/api/email-trigger/settings', methods=['POST'])
def update_settings():
    if not session.get('admin_logged_in'):
        return jsonify({'success': False, 'message': '未授权'}), 401
    
    data = request.get_json()
    
    valid_keys = ['enabled', 'check_interval_seconds', 'max_commands_per_day',
                  'require_subject_prefix', 'allowed_commands']
    
    settings = {k: v for k, v in data.items() if k in valid_keys}
    
    success, message = EmailTriggerWhitelist.update_settings(settings)
    
    if success and 'enabled' in settings:
        if settings['enabled']:
            email_trigger_scheduler.start()
        else:
            email_trigger_scheduler.stop()
    
    return jsonify({'success': success, 'message': message})


@email_trigger_bp.route('/api/email-trigger/logs', methods=['GET'])
def get_logs():
    if not session.get('admin_logged_in'):
        return jsonify({'success': False, 'message': '未授权'}), 401
    
    limit = request.args.get('limit', 50, type=int)
    logs = EmailTriggerLogger.get_recent_logs(limit)
    
    return jsonify({
        'success': True,
        'logs': logs
    })


@email_trigger_bp.route('/api/email-trigger/stats', methods=['GET'])
def get_stats():
    if not session.get('admin_logged_in'):
        return jsonify({'success': False, 'message': '未授权'}), 401
    
    stats = EmailTriggerLogger.get_stats()
    whitelist = EmailTriggerWhitelist.get_whitelist()
    
    total_whitelist = len(whitelist)
    enabled_whitelist = len([w for w in whitelist if w.get('enabled', True)])
    
    return jsonify({
        'success': True,
        'stats': stats,
        'whitelist_count': {
            'total': total_whitelist,
            'enabled': enabled_whitelist
        }
    })


@email_trigger_bp.route('/api/email-trigger/status', methods=['GET'])
def get_status():
    if not session.get('admin_logged_in'):
        return jsonify({'success': False, 'message': '未授权'}), 401
    
    settings = EmailTriggerWhitelist.get_settings()
    
    return jsonify({
        'success': True,
        'enabled': settings.get('enabled', False),
        'running': email_trigger_scheduler.running,
        'check_interval': settings.get('check_interval_seconds', 60)
    })
