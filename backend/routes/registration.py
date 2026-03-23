"""
用户注册申请路由

提供用户申请注册的API和管理员审核的API
"""
from flask import Blueprint, request, jsonify, render_template, session
from backend.user_management import registration_service
from backend.user_management import invite_code_service
from functools import wraps

registration_bp = Blueprint('registration', __name__)

ADMIN_PASSWORD = 'admin2025'


def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('admin_logged_in'):
            return jsonify({'success': False, 'message': '请先登录管理后台'}), 401
        return f(*args, **kwargs)
    return decorated_function


@registration_bp.route('/apply', methods=['GET'])
def register_page():
    return render_template('register_apply.html')


@registration_bp.route('/send-code', methods=['POST'])
def send_registration_code():
    data = request.get_json()
    email = data.get('email', '').strip()
    
    if not email:
        return jsonify({'success': False, 'message': '请输入邮箱地址'})
    
    import re
    if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
        return jsonify({'success': False, 'message': '请输入有效的邮箱地址'})
    
    from backend.services.auth_service import AuthService
    code = AuthService.generate_verification_code()
    
    if not AuthService.save_reset_code(email, code):
        return jsonify({'success': False, 'message': '验证码保存失败，请稍后重试'})
    
    if not registration_service.send_registration_code_email(email, code):
        return jsonify({'success': False, 'message': '验证码发送失败，请检查邮箱配置'})
    
    return jsonify({'success': True, 'message': '验证码已发送到您的邮箱，有效期10分钟'})


@registration_bp.route('/verify-code', methods=['POST'])
def verify_registration_code():
    data = request.get_json()
    email = data.get('email', '').strip()
    code = data.get('code', '').strip()
    
    if not email or not code:
        return jsonify({'success': False, 'message': '请输入邮箱和验证码'})
    
    from backend.services.auth_service import AuthService
    success, message = AuthService.check_reset_code(email, code)
    
    return jsonify({'success': success, 'message': message})


@registration_bp.route('/apply', methods=['POST'])
def submit_application():
    data = request.get_json()
    
    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    verification_code = data.get('verification_code', '').strip()
    phone = data.get('phone', '').strip()
    company = data.get('company', '').strip()
    followed_wechat = data.get('followed_wechat', False)
    wechat_nickname = data.get('wechat_nickname', '').strip()
    reason = data.get('reason', '').strip()
    invite_code = data.get('invite_code', '').strip()
    
    if not name or not email:
        return jsonify({'success': False, 'message': '请填写必填项'})
    
    if not verification_code:
        return jsonify({'success': False, 'message': '请输入邮箱验证码'})
    
    if followed_wechat and not wechat_nickname:
        return jsonify({'success': False, 'message': '请填写微信昵称'})
    
    from backend.services.auth_service import AuthService
    success, message = AuthService.verify_reset_code(email, verification_code)
    if not success:
        return jsonify({'success': False, 'message': message})
    
    if invite_code:
        validation = invite_code_service.validate_code(invite_code)
        if not validation['valid']:
            return jsonify({'success': False, 'message': validation['message']})
        
        result = registration_service.submit_application(
            name, email, phone, company, followed_wechat, wechat_nickname, reason
        )
        
        if result.get('success'):
            approve_result = registration_service.approve_application(result['application_id'])
            if approve_result.get('success'):
                invite_code_service.use_code(invite_code, approve_result['username'], email)
                
                send_email_result = registration_service.send_account_to_user(
                    approve_result['email'],
                    approve_result['name'],
                    approve_result['username'],
                    approve_result['password']
                )
                
                return jsonify({
                    'success': True,
                    'message': '注册成功！账号信息已发送到您的邮箱',
                    'auto_approved': True,
                    'username': approve_result['username'],
                    'password': approve_result['password'],
                    'email_sent': send_email_result
                })
            else:
                return jsonify({'success': False, 'message': '自动审批失败：' + approve_result.get('message', '未知错误')})
        else:
            return jsonify(result)
    
    result = registration_service.submit_application(
        name, email, phone, company, followed_wechat, wechat_nickname, reason
    )
    return jsonify(result)


@registration_bp.route('/admin', methods=['GET'])
def admin_page():
    return render_template('admin_manage.html')


@registration_bp.route('/admin/login', methods=['POST'])
def admin_login():
    data = request.get_json()
    password = data.get('password', '')
    
    if password == ADMIN_PASSWORD:
        session['admin_logged_in'] = True
        return jsonify({'success': True})
    
    return jsonify({'success': False, 'message': '密码错误'})


@registration_bp.route('/admin/logout', methods=['POST'])
def admin_logout():
    session.pop('admin_logged_in', None)
    return jsonify({'success': True})


@registration_bp.route('/admin/check', methods=['GET'])
def admin_check():
    return jsonify({'logged_in': session.get('admin_logged_in', False)})


@registration_bp.route('/admin/applications', methods=['GET'])
def get_applications():
    if not session.get('admin_logged_in'):
        return jsonify({'success': False, 'message': '未登录'}), 401
    
    applications = registration_service.get_all_applications()
    return jsonify({'success': True, 'applications': applications})


@registration_bp.route('/admin/approve/<application_id>', methods=['POST'])
def approve(application_id):
    if not session.get('admin_logged_in'):
        return jsonify({'success': False, 'message': '未登录'}), 401
    
    result = registration_service.approve_application(application_id)
    
    data = request.get_json() or {}
    send_email = data.get('send_email', False)
    
    if result.get('success') and send_email:
        email_sent = registration_service.send_account_to_user(
            result['email'],
            result['name'],
            result['username'],
            result['password']
        )
        result['email_sent'] = email_sent
    
    return jsonify(result)


@registration_bp.route('/admin/send-email/<application_id>', methods=['POST'])
def send_email_to_user(application_id):
    if not session.get('admin_logged_in'):
        return jsonify({'success': False, 'message': '未登录'}), 401
    
    applications = registration_service.load_applications()
    
    for app in applications:
        if app['id'] == application_id and app.get('status') == 'approved':
            if not app.get('username') or not app.get('password'):
                return jsonify({'success': False, 'message': '该申请未生成账号'})
            
            email_sent = registration_service.send_account_to_user(
                app['email'],
                app['name'],
                app['username'],
                app['password']
            )
            
            if email_sent:
                return jsonify({'success': True, 'message': '邮件发送成功'})
            else:
                return jsonify({'success': False, 'message': '邮件发送失败，请检查邮箱配置'})
    
    return jsonify({'success': False, 'message': '申请不存在或未通过审核'})


@registration_bp.route('/admin/reject/<application_id>', methods=['POST'])
def reject(application_id):
    if not session.get('admin_logged_in'):
        return jsonify({'success': False, 'message': '未登录'}), 401
    
    result = registration_service.reject_application(application_id)
    return jsonify(result)


@registration_bp.route('/admin/delete/<application_id>', methods=['POST'])
def delete_application(application_id):
    if not session.get('admin_logged_in'):
        return jsonify({'success': False, 'message': '未登录'}), 401
    
    result = registration_service.delete_application(application_id)
    return jsonify(result)


@registration_bp.route('/admin/users', methods=['GET'])
def get_users():
    if not session.get('admin_logged_in'):
        return jsonify({'success': False, 'message': '未登录'}), 401
    
    from backend.services.auth_service import AuthService
    users = AuthService.get_all_users()
    return jsonify({'success': True, 'users': users})


@registration_bp.route('/admin/toggle-user/<username>', methods=['POST'])
def toggle_user(username):
    if not session.get('admin_logged_in'):
        return jsonify({'success': False, 'message': '未登录'}), 401
    
    from backend.services.auth_service import AuthService
    success, message, new_status = AuthService.toggle_user_status(username)
    return jsonify({'success': success, 'message': message, 'disabled': new_status})


@registration_bp.route('/admin/create-user', methods=['POST'])
def create_user():
    if not session.get('admin_logged_in'):
        return jsonify({'success': False, 'message': '未登录'}), 401
    
    from backend.services.auth_service import AuthService
    
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')
    email = data.get('email', '').strip() or None
    nickname = data.get('nickname', '').strip() or None
    
    success, message = AuthService.create_user(username, password, email, nickname)
    return jsonify({'success': success, 'message': message})


@registration_bp.route('/admin/delete-user/<username>', methods=['POST'])
def delete_user(username):
    if not session.get('admin_logged_in'):
        return jsonify({'success': False, 'message': '未登录'}), 401
    
    from backend.services.auth_service import AuthService
    success, message = AuthService.delete_user(username)
    return jsonify({'success': success, 'message': message})


@registration_bp.route('/validate-invite-code', methods=['POST'])
def validate_invite_code():
    data = request.get_json()
    code = data.get('code', '').strip()
    
    result = invite_code_service.validate_code(code)
    return jsonify(result)


@registration_bp.route('/admin/invite-codes', methods=['GET'])
def get_invite_codes():
    if not session.get('admin_logged_in'):
        return jsonify({'success': False, 'message': '未登录'}), 401
    
    codes = invite_code_service.get_all_codes()
    stats = invite_code_service.get_stats()
    return jsonify({'success': True, 'codes': codes, 'stats': stats})


@registration_bp.route('/admin/invite-codes/generate', methods=['POST'])
def generate_invite_codes():
    if not session.get('admin_logged_in'):
        return jsonify({'success': False, 'message': '未登录'}), 401
    
    data = request.get_json() or {}
    count = data.get('count', 1)
    expire_days = data.get('expire_days', 30)
    
    try:
        count = int(count)
        if count < 1:
            count = 1
        if count > 100:
            count = 100
    except (ValueError, TypeError):
        count = 1
    
    try:
        expire_days = int(expire_days)
        if expire_days < 0:
            expire_days = 0
    except (ValueError, TypeError):
        expire_days = 30
    
    result = invite_code_service.generate_codes(count, expire_days)
    return jsonify(result)


@registration_bp.route('/admin/invite-codes/delete/<code>', methods=['POST'])
def delete_invite_code(code):
    if not session.get('admin_logged_in'):
        return jsonify({'success': False, 'message': '未登录'}), 401
    
    result = invite_code_service.delete_code(code)
    return jsonify(result)
