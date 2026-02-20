"""
用户注册申请服务

处理用户注册申请的提交、审核、账号生成等功能
"""
import json
import secrets
import string
from datetime import datetime
from pathlib import Path
from werkzeug.security import generate_password_hash

SCRIPT_DIR = Path(__file__).parent.absolute()
APPLICATIONS_FILE = SCRIPT_DIR / 'applications.json'
USERS_FILE = SCRIPT_DIR / 'users.json'

STATUS_PENDING = 'pending'
STATUS_APPROVED = 'approved'
STATUS_REJECTED = 'rejected'


def generate_username():
    prefix = 'user'
    suffix = ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(4))
    return f'{prefix}_{suffix}'


def generate_password(length=12):
    alphabet = string.ascii_letters + string.digits
    password = ''.join(secrets.choice(alphabet) for _ in range(length))
    return password


def load_applications():
    if not APPLICATIONS_FILE.exists():
        return []
    try:
        with open(APPLICATIONS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, Exception):
        return []


def save_applications(applications):
    with open(APPLICATIONS_FILE, 'w', encoding='utf-8') as f:
        json.dump(applications, f, ensure_ascii=False, indent=2)


def load_users():
    if not USERS_FILE.exists():
        return {}
    try:
        with open(USERS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, Exception):
        return {}


def save_users(users):
    with open(USERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(users, f, indent=4)


def submit_application(name, email, phone, company, reason):
    applications = load_applications()
    
    for app in applications:
        if app.get('email') == email and app.get('status') == STATUS_PENDING:
            return {'success': False, 'message': '该邮箱已有待审核的申请'}
    
    application = {
        'id': secrets.token_hex(8),
        'name': name,
        'email': email,
        'phone': phone,
        'company': company,
        'reason': reason,
        'status': STATUS_PENDING,
        'created_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'processed_at': None,
        'username': None,
        'password': None
    }
    
    applications.append(application)
    save_applications(applications)
    
    return {'success': True, 'message': '申请提交成功，请等待审核', 'application_id': application['id']}


def get_pending_applications():
    applications = load_applications()
    return [app for app in applications if app['status'] == STATUS_PENDING]


def get_all_applications():
    return load_applications()


def approve_application(application_id):
    applications = load_applications()
    users = load_users()
    
    for app in applications:
        if app['id'] == application_id and app['status'] == STATUS_PENDING:
            username = generate_username()
            password = generate_password()
            
            while username in users:
                username = generate_username()
            
            users[username] = generate_password_hash(password)
            save_users(users)
            
            app['status'] = STATUS_APPROVED
            app['processed_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            app['username'] = username
            app['password'] = password
            
            save_applications(applications)
            
            return {
                'success': True,
                'message': '审核通过',
                'username': username,
                'password': password,
                'email': app['email'],
                'name': app['name']
            }
    
    return {'success': False, 'message': '申请不存在或已处理'}


def reject_application(application_id, reason=''):
    applications = load_applications()
    
    for app in applications:
        if app['id'] == application_id and app['status'] == STATUS_PENDING:
            app['status'] = STATUS_REJECTED
            app['processed_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            app['reject_reason'] = reason
            
            save_applications(applications)
            
            return {
                'success': True,
                'message': '已拒绝申请',
                'email': app['email'],
                'name': app['name']
            }
    
    return {'success': False, 'message': '申请不存在或已处理'}


def delete_application(application_id):
    applications = load_applications()
    applications = [app for app in applications if app['id'] != application_id]
    save_applications(applications)
    return {'success': True, 'message': '已删除申请记录'}
