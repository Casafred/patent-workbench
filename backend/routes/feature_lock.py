"""
功能锁定管理路由

提供功能锁定状态的查询和管理API
"""
import os
import json
from datetime import datetime
from flask import Blueprint, request, jsonify, session
from functools import wraps

feature_lock_bp = Blueprint('feature_lock', __name__)

CONFIG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'config')
FEATURE_LOCKS_FILE = os.path.join(CONFIG_DIR, 'feature_locks.json')
TABS_CONFIG_FILE = os.path.join(CONFIG_DIR, 'tabs_config.json')

SUPER_ADMIN_PASSWORD = 'superadmin2025'


def load_tabs_config():
    try:
        if os.path.exists(TABS_CONFIG_FILE):
            with open(TABS_CONFIG_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data.get('tabs', [])
    except Exception as e:
        print(f'加载标签页配置失败: {e}')
    return []


def get_feature_list():
    return load_tabs_config()


def super_admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('super_admin_logged_in'):
            return jsonify({'success': False, 'message': '请先以超级管理员身份登录'}), 401
        return f(*args, **kwargs)
    return decorated_function


def load_feature_locks():
    try:
        if os.path.exists(FEATURE_LOCKS_FILE):
            with open(FEATURE_LOCKS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        print(f'加载功能锁定配置失败: {e}')
    return {
        'locked_features': [],
        'lock_message': '功能优化升级中，暂不开放使用，如有需求请在公众号联系',
        'last_updated': None
    }


def save_feature_locks(data):
    try:
        os.makedirs(os.path.dirname(FEATURE_LOCKS_FILE), exist_ok=True)
        with open(FEATURE_LOCKS_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        return True
    except Exception as e:
        print(f'保存功能锁定配置失败: {e}')
        return False


@feature_lock_bp.route('/status', methods=['GET'])
def get_lock_status():
    data = load_feature_locks()
    return jsonify({
        'success': True,
        'locked_features': data.get('locked_features', []),
        'lock_message': data.get('lock_message', '功能优化升级中，暂不开放使用，如有需求请在公众号联系')
    })


@feature_lock_bp.route('/features', methods=['GET'])
def get_all_features():
    feature_list = get_feature_list()
    data = load_feature_locks()
    locked_ids = data.get('locked_features', [])
    
    features = []
    for feature in feature_list:
        features.append({
            **feature,
            'locked': feature['id'] in locked_ids
        })
    
    return jsonify({
        'success': True,
        'features': features
    })


@feature_lock_bp.route('/admin/login', methods=['POST'])
def super_admin_login():
    data = request.get_json()
    password = data.get('password', '')
    
    if password == SUPER_ADMIN_PASSWORD:
        session['super_admin_logged_in'] = True
        return jsonify({'success': True})
    
    return jsonify({'success': False, 'message': '超级管理员密码错误'})


@feature_lock_bp.route('/admin/logout', methods=['POST'])
def super_admin_logout():
    session.pop('super_admin_logged_in', None)
    return jsonify({'success': True})


@feature_lock_bp.route('/admin/check', methods=['GET'])
def super_admin_check():
    return jsonify({'logged_in': session.get('super_admin_logged_in', False)})


@feature_lock_bp.route('/admin/list', methods=['GET'])
@super_admin_required
def get_admin_features():
    feature_list = get_feature_list()
    data = load_feature_locks()
    locked_ids = data.get('locked_features', [])
    
    features = []
    for feature in feature_list:
        features.append({
            **feature,
            'locked': feature['id'] in locked_ids
        })
    
    return jsonify({
        'success': True,
        'features': features,
        'lock_message': data.get('lock_message', ''),
        'last_updated': data.get('last_updated')
    })


@feature_lock_bp.route('/admin/toggle', methods=['POST'])
@super_admin_required
def toggle_feature_lock():
    data = request.get_json()
    feature_id = data.get('feature_id')
    locked = data.get('locked', True)
    
    if not feature_id:
        return jsonify({'success': False, 'message': '缺少功能ID'})
    
    feature_list = get_feature_list()
    valid_ids = [f['id'] for f in feature_list]
    if feature_id not in valid_ids:
        return jsonify({'success': False, 'message': '无效的功能ID'})
    
    config = load_feature_locks()
    locked_features = config.get('locked_features', [])
    
    if locked and feature_id not in locked_features:
        locked_features.append(feature_id)
    elif not locked and feature_id in locked_features:
        locked_features.remove(feature_id)
    
    config['locked_features'] = locked_features
    config['last_updated'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    if save_feature_locks(config):
        return jsonify({
            'success': True,
            'message': '功能锁定状态已更新',
            'locked_features': locked_features
        })
    
    return jsonify({'success': False, 'message': '保存配置失败'})


@feature_lock_bp.route('/admin/message', methods=['POST'])
@super_admin_required
def update_lock_message():
    data = request.get_json()
    message = data.get('message', '')
    
    config = load_feature_locks()
    config['lock_message'] = message
    config['last_updated'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    if save_feature_locks(config):
        return jsonify({
            'success': True,
            'message': '锁定提示信息已更新'
        })
    
    return jsonify({'success': False, 'message': '保存配置失败'})
