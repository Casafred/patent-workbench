"""
用户注册申请路由

提供用户申请注册的API和管理员审核的API
"""
from flask import Blueprint, request, jsonify, render_template_string, session
from backend.user_management import registration_service
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


REGISTER_PAGE_HTML = """
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>申请使用 - 专利分析智能工作台</title>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary-color: #22C55E;
            --primary-color-dark: #16A34A;
            --bg-color: #F0FDF4;
            --surface-color: #FFFFFF;
            --text-color: #14532D;
            --error-color: #EF4444;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Noto Sans SC', sans-serif;
            background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            padding: 40px;
            width: 100%;
            max-width: 480px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            color: var(--primary-color-dark);
            font-size: 1.8rem;
            margin-bottom: 8px;
        }
        .header p {
            color: #666;
            font-size: 14px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        .form-group label {
            display: block;
            margin-bottom: 6px;
            color: var(--text-color);
            font-weight: 500;
            font-size: 14px;
        }
        .form-group label .required {
            color: var(--error-color);
        }
        input, textarea {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #E5E7EB;
            border-radius: 8px;
            font-size: 15px;
            transition: all 0.3s;
            font-family: inherit;
        }
        input:focus, textarea:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1);
        }
        textarea {
            resize: vertical;
            min-height: 80px;
        }
        .submit-btn {
            width: 100%;
            padding: 14px;
            background: linear-gradient(45deg, var(--primary-color-dark), var(--primary-color));
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
        }
        .submit-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 7px 20px rgba(34, 197, 94, 0.3);
        }
        .submit-btn:disabled {
            background: #9CA3AF;
            cursor: not-allowed;
            transform: none;
        }
        .message {
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
            display: none;
        }
        .message.success {
            background: #DCFCE7;
            color: #166534;
            border: 1px solid #86EFAC;
        }
        .message.error {
            background: #FEE2E2;
            color: #991B1B;
            border: 1px solid #FCA5A5;
        }
        .message.show { display: block; }
        .back-link {
            text-align: center;
            margin-top: 20px;
        }
        .back-link a {
            color: var(--primary-color-dark);
            text-decoration: none;
        }
        .back-link a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>申请使用账号</h1>
            <p>请填写以下信息，审核通过后将获得使用账号</p>
        </div>
        
        <div id="message" class="message"></div>
        
        <form id="register-form">
            <div class="form-group">
                <label>姓名 <span class="required">*</span></label>
                <input type="text" name="name" required placeholder="请输入您的姓名">
            </div>
            <div class="form-group">
                <label>邮箱 <span class="required">*</span></label>
                <input type="email" name="email" required placeholder="用于接收审核结果">
            </div>
            <div class="form-group">
                <label>手机号 <span class="required">*</span></label>
                <input type="tel" name="phone" required placeholder="请输入手机号">
            </div>
            <div class="form-group">
                <label>单位/公司</label>
                <input type="text" name="company" placeholder="选填">
            </div>
            <div class="form-group">
                <label>申请理由</label>
                <textarea name="reason" placeholder="请简要说明您的使用需求（选填）"></textarea>
            </div>
            <button type="submit" class="submit-btn" id="submit-btn">提交申请</button>
        </form>
        
        <div class="back-link">
            <a href="/login">返回登录页</a>
        </div>
    </div>

    <script>
        const form = document.getElementById('register-form');
        const messageEl = document.getElementById('message');
        const submitBtn = document.getElementById('submit-btn');

        function showMessage(text, type) {
            messageEl.textContent = text;
            messageEl.className = 'message ' + type + ' show';
        }

        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            submitBtn.disabled = true;
            submitBtn.textContent = '提交中...';
            
            const formData = new FormData(form);
            const data = {
                name: formData.get('name'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                company: formData.get('company') || '',
                reason: formData.get('reason') || ''
            };

            try {
                const response = await fetch('/api/register/apply', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showMessage(result.message, 'success');
                    form.reset();
                } else {
                    showMessage(result.message, 'error');
                }
            } catch (error) {
                showMessage('提交失败，请稍后重试', 'error');
            }
            
            submitBtn.disabled = false;
            submitBtn.textContent = '提交申请';
        });
    </script>
</body>
</html>
"""


ADMIN_PAGE_HTML = """
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>用户申请管理 - 专利分析智能工作台</title>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary-color: #22C55E;
            --primary-color-dark: #16A34A;
            --bg-color: #F0FDF4;
            --text-color: #14532D;
            --error-color: #EF4444;
            --warning-color: #F59E0B;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Noto Sans SC', sans-serif;
            background: #F3F4F6;
            min-height: 100vh;
        }
        .header {
            background: white;
            padding: 16px 24px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header h1 {
            color: var(--primary-color-dark);
            font-size: 1.3rem;
        }
        .header-actions {
            display: flex;
            gap: 12px;
            align-items: center;
        }
        .user-info {
            color: #666;
            font-size: 14px;
        }
        .logout-btn {
            padding: 8px 16px;
            background: #EF4444;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 24px;
        }
        .tabs {
            display: flex;
            gap: 8px;
            margin-bottom: 20px;
        }
        .tab {
            padding: 10px 20px;
            background: white;
            border: 2px solid #E5E7EB;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s;
        }
        .tab.active {
            background: var(--primary-color);
            color: white;
            border-color: var(--primary-color);
        }
        .tab:hover:not(.active) {
            border-color: var(--primary-color);
        }
        .card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            margin-bottom: 16px;
            overflow: hidden;
        }
        .card-header {
            padding: 16px 20px;
            border-bottom: 1px solid #E5E7EB;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .card-title {
            font-weight: 600;
            color: var(--text-color);
        }
        .card-body { padding: 20px; }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 12px;
        }
        .info-item label {
            display: block;
            font-size: 12px;
            color: #6B7280;
            margin-bottom: 4px;
        }
        .info-item span {
            font-size: 14px;
            color: var(--text-color);
        }
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
        }
        .status-pending { background: #FEF3C7; color: #92400E; }
        .status-approved { background: #DCFCE7; color: #166534; }
        .status-rejected { background: #FEE2E2; color: #991B1B; }
        .actions {
            display: flex;
            gap: 8px;
            margin-top: 16px;
        }
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s;
        }
        .btn-approve {
            background: var(--primary-color);
            color: white;
        }
        .btn-approve:hover { background: var(--primary-color-dark); }
        .btn-reject {
            background: #EF4444;
            color: white;
        }
        .btn-reject:hover { background: #DC2626; }
        .btn-delete {
            background: #9CA3AF;
            color: white;
        }
        .btn-delete:hover { background: #6B7280; }
        .account-info {
            background: #F0FDF4;
            border: 1px solid #86EFAC;
            border-radius: 8px;
            padding: 16px;
            margin-top: 16px;
        }
        .account-info h4 {
            color: var(--primary-color-dark);
            margin-bottom: 12px;
        }
        .account-info p {
            margin: 8px 0;
            font-size: 14px;
        }
        .account-info code {
            background: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 14px;
        }
        .copy-btn {
            padding: 4px 12px;
            background: var(--primary-color);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            margin-left: 8px;
        }
        .empty-state {
            text-align: center;
            padding: 40px;
            color: #6B7280;
        }
        .login-container {
            max-width: 400px;
            margin: 100px auto;
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        .login-container h2 {
            text-align: center;
            color: var(--primary-color-dark);
            margin-bottom: 24px;
        }
        .login-container input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #E5E7EB;
            border-radius: 8px;
            font-size: 15px;
            margin-bottom: 16px;
        }
        .login-container input:focus {
            outline: none;
            border-color: var(--primary-color);
        }
        .login-btn {
            width: 100%;
            padding: 14px;
            background: var(--primary-color);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
        }
        .login-btn:hover { background: var(--primary-color-dark); }
        .login-error {
            color: var(--error-color);
            text-align: center;
            margin-bottom: 16px;
            font-size: 14px;
        }
        .hidden { display: none; }
    </style>
</head>
<body>
    <div id="login-page" class="login-container">
        <h2>管理员登录</h2>
        <div id="login-error" class="login-error hidden"></div>
        <input type="password" id="admin-password" placeholder="请输入管理密码">
        <button class="login-btn" onclick="login()">登录</button>
    </div>

    <div id="admin-page" class="hidden">
        <div class="header">
            <h1>用户申请管理</h1>
            <div class="header-actions">
                <span class="user-info">管理员</span>
                <button class="logout-btn" onclick="logout()">退出</button>
            </div>
        </div>
        
        <div class="container">
            <div class="tabs">
                <div class="tab active" data-status="pending" onclick="switchTab('pending')">
                    待审核 (<span id="pending-count">0</span>)
                </div>
                <div class="tab" data-status="approved" onclick="switchTab('approved')">
                    已通过 (<span id="approved-count">0</span>)
                </div>
                <div class="tab" data-status="rejected" onclick="switchTab('rejected')">
                    已拒绝 (<span id="rejected-count">0</span>)
                </div>
            </div>
            
            <div id="applications-list"></div>
        </div>
    </div>

    <script>
        let currentTab = 'pending';
        let isLoggedIn = false;

        function checkLogin() {
            fetch('/api/admin/check')
                .then(r => r.json())
                .then(data => {
                    if (data.logged_in) {
                        isLoggedIn = true;
                        showAdminPage();
                    }
                });
        }

        function login() {
            const password = document.getElementById('admin-password').value;
            const errorEl = document.getElementById('login-error');
            
            fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    isLoggedIn = true;
                    showAdminPage();
                } else {
                    errorEl.textContent = data.message;
                    errorEl.classList.remove('hidden');
                }
            });
        }

        function logout() {
            fetch('/api/admin/logout', { method: 'POST' })
                .then(() => {
                    isLoggedIn = false;
                    document.getElementById('login-page').classList.remove('hidden');
                    document.getElementById('admin-page').classList.add('hidden');
                });
        }

        function showAdminPage() {
            document.getElementById('login-page').classList.add('hidden');
            document.getElementById('admin-page').classList.remove('hidden');
            loadApplications();
        }

        function switchTab(status) {
            currentTab = status;
            document.querySelectorAll('.tab').forEach(t => {
                t.classList.toggle('active', t.dataset.status === status);
            });
            loadApplications();
        }

        function loadApplications() {
            fetch('/api/admin/applications')
                .then(r => r.json())
                .then(data => {
                    const apps = data.applications || [];
                    
                    const pending = apps.filter(a => a.status === 'pending');
                    const approved = apps.filter(a => a.status === 'approved');
                    const rejected = apps.filter(a => a.status === 'rejected');
                    
                    document.getElementById('pending-count').textContent = pending.length;
                    document.getElementById('approved-count').textContent = approved.length;
                    document.getElementById('rejected-count').textContent = rejected.length;
                    
                    let list = [];
                    if (currentTab === 'pending') list = pending;
                    else if (currentTab === 'approved') list = approved;
                    else list = rejected;
                    
                    renderApplications(list);
                });
        }

        function renderApplications(applications) {
            const container = document.getElementById('applications-list');
            
            if (applications.length === 0) {
                container.innerHTML = '<div class="card"><div class="empty-state">暂无数据</div></div>';
                return;
            }
            
            container.innerHTML = applications.map(app => `
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">${app.name}</span>
                        <span class="status-badge status-${app.status}">
                            ${app.status === 'pending' ? '待审核' : app.status === 'approved' ? '已通过' : '已拒绝'}
                        </span>
                    </div>
                    <div class="card-body">
                        <div class="info-grid">
                            <div class="info-item">
                                <label>邮箱</label>
                                <span>${app.email}</span>
                            </div>
                            <div class="info-item">
                                <label>手机号</label>
                                <span>${app.phone}</span>
                            </div>
                            <div class="info-item">
                                <label>单位</label>
                                <span>${app.company || '-'}</span>
                            </div>
                            <div class="info-item">
                                <label>申请时间</label>
                                <span>${app.created_at}</span>
                            </div>
                            ${app.reason ? `
                            <div class="info-item" style="grid-column: 1 / -1;">
                                <label>申请理由</label>
                                <span>${app.reason}</span>
                            </div>
                            ` : ''}
                        </div>
                        
                        ${app.status === 'approved' && app.username ? `
                        <div class="account-info">
                            <h4>账号信息 <button class="copy-btn" onclick="copyAccount('${app.username}', '${app.password}')">复制账号密码</button></h4>
                            <p>用户名: <code>${app.username}</code></p>
                            <p>密码: <code>${app.password}</code></p>
                            <p style="color: #6B7280; font-size: 12px;">审核时间: ${app.processed_at}</p>
                        </div>
                        ` : ''}
                        
                        ${app.status === 'pending' ? `
                        <div class="actions">
                            <button class="btn btn-approve" onclick="approve('${app.id}')">通过并发送账号</button>
                            <button class="btn btn-reject" onclick="reject('${app.id}')">拒绝</button>
                        </div>
                        ` : ''}
                        
                        ${app.status !== 'pending' ? `
                        <div class="actions">
                            <button class="btn btn-delete" onclick="deleteApp('${app.id}')">删除记录</button>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `).join('');
        }

        function approve(id) {
            if (!confirm('确定通过该申请？将自动生成账号。')) return;
            
            fetch(`/api/admin/approve/${id}`, { method: 'POST' })
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        alert(`审核通过！\\n用户名: ${data.username}\\n密码: ${data.password}\\n\\n请将账号信息发送给申请人: ${data.email}`);
                        loadApplications();
                    } else {
                        alert(data.message);
                    }
                });
        }

        function reject(id) {
            if (!confirm('确定拒绝该申请？')) return;
            
            fetch(`/api/admin/reject/${id}`, { method: 'POST' })
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        alert('已拒绝申请');
                        loadApplications();
                    } else {
                        alert(data.message);
                    }
                });
        }

        function deleteApp(id) {
            if (!confirm('确定删除该记录？')) return;
            
            fetch(`/api/admin/delete/${id}`, { method: 'POST' })
                .then(r => r.json())
                .then(data => {
                    loadApplications();
                });
        }

        function copyAccount(username, password) {
            const text = `用户名: ${username}\\n密码: ${password}\\n登录地址: ${window.location.origin}/login`;
            navigator.clipboard.writeText(text).then(() => {
                alert('已复制到剪贴板');
            });
        }

        document.getElementById('admin-password').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') login();
        });

        checkLogin();
    </script>
</body>
</html>
"""


@registration_bp.route('/apply', methods=['GET'])
def register_page():
    return render_template_string(REGISTER_PAGE_HTML)


@registration_bp.route('/apply', methods=['POST'])
def submit_application():
    data = request.get_json()
    
    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    phone = data.get('phone', '').strip()
    company = data.get('company', '').strip()
    reason = data.get('reason', '').strip()
    
    if not name or not email or not phone:
        return jsonify({'success': False, 'message': '请填写必填项'})
    
    result = registration_service.submit_application(name, email, phone, company, reason)
    return jsonify(result)


@registration_bp.route('/admin', methods=['GET'])
def admin_page():
    return render_template_string(ADMIN_PAGE_HTML)


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
    return jsonify(result)


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
