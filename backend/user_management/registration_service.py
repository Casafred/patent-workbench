"""
用户注册申请服务

处理用户注册申请的提交、审核、账号生成等功能
"""
import json
import os
import secrets
import string
from datetime import datetime
from pathlib import Path
from werkzeug.security import generate_password_hash
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SCRIPT_DIR = Path(__file__).parent.absolute()
APPLICATIONS_FILE = SCRIPT_DIR / 'applications.json'
USERS_FILE = SCRIPT_DIR / 'users.json'

STATUS_PENDING = 'pending'
STATUS_APPROVED = 'approved'
STATUS_REJECTED = 'rejected'

ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', '')
EMAIL_PASSWORD = os.environ.get('EMAIL_PASSWORD', '')
SMTP_SERVER = 'smtp.qq.com'
SMTP_PORT = 465


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


def send_notification_email(application):
    if not ADMIN_EMAIL or not EMAIL_PASSWORD:
        print('邮件通知未配置，跳过发送')
        return False
    
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f'【专利工作台】新用户注册申请 - {application["name"]}'
        msg['From'] = ADMIN_EMAIL
        msg['To'] = ADMIN_EMAIL
        
        text_content = f"""
新用户注册申请

申请人：{application['name']}
邮箱：{application['email']}
手机号：{application['phone'] or '未填写'}
单位：{application['company'] or '未填写'}
关注公众号：{'是 (' + application['wechat_nickname'] + ')' if application.get('followed_wechat') else '否'}
申请理由：{application['reason'] or '未填写'}
申请时间：{application['created_at']}

请登录管理后台审核：{os.environ.get('SITE_URL', 'http://localhost:5000')}/api/register/admin
"""
        
        html_content = f"""
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #16A34A; border-bottom: 2px solid #22C55E; padding-bottom: 10px;">
            新用户注册申请
        </h2>
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; width: 120px;">申请人</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{application['name']}</td>
            </tr>
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">邮箱</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{application['email']}</td>
            </tr>
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">手机号</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{application['phone'] or '未填写'}</td>
            </tr>
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">单位</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{application['company'] or '未填写'}</td>
            </tr>
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">关注公众号</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{'是 (' + application.get('wechat_nickname', '') + ')' if application.get('followed_wechat') else '否'}</td>
            </tr>
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">申请理由</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{application['reason'] or '未填写'}</td>
            </tr>
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">申请时间</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{application['created_at']}</td>
            </tr>
        </table>
        <div style="margin-top: 20px; text-align: center;">
            <a href="{os.environ.get('SITE_URL', 'http://localhost:5000')}/api/register/admin" 
               style="display: inline-block; padding: 12px 30px; background: linear-gradient(45deg, #16A34A, #22C55E); 
                      color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                前往审核
            </a>
        </div>
    </div>
</body>
</html>
"""
        
        msg.attach(MIMEText(text_content, 'plain', 'utf-8'))
        msg.attach(MIMEText(html_content, 'html', 'utf-8'))
        
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
            server.login(ADMIN_EMAIL, EMAIL_PASSWORD)
            server.sendmail(ADMIN_EMAIL, ADMIN_EMAIL, msg.as_string())
        
        print(f'邮件通知已发送至 {ADMIN_EMAIL}')
        return True
        
    except Exception as e:
        print(f'邮件发送失败: {e}')
        return False


def submit_application(name, email, phone, company, followed_wechat, wechat_nickname, reason):
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
        'followed_wechat': followed_wechat,
        'wechat_nickname': wechat_nickname,
        'reason': reason,
        'status': STATUS_PENDING,
        'created_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'processed_at': None,
        'username': None,
        'password': None
    }
    
    applications.append(application)
    save_applications(applications)
    
    send_notification_email(application)
    
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
