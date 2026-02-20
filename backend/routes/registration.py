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
                <label>昵称 <span class="required">*</span></label>
                <input type="text" name="name" required placeholder="仅用于方便沟通交流称呼用">
                <small style="color: #666; font-size: 12px; margin-top: 4px; display: block;">仅用于方便沟通交流称呼用</small>
            </div>
            <div class="form-group">
                <label>邮箱 <span class="required">*</span></label>
                <input type="email" name="email" required placeholder="用于接收审核结果和账号信息">
            </div>
            <div class="form-group">
                <label>手机号</label>
                <input type="tel" name="phone" placeholder="选填">
            </div>
            <div class="form-group">
                <label>单位/公司</label>
                <input type="text" name="company" placeholder="选填">
            </div>
            <div class="form-group">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" name="followed_wechat" id="followed-wechat" style="width: 18px; height: 18px;">
                    <span>我已关注公众号「IP智友」</span>
                </label>
            </div>
            <div class="form-group" id="wechat-nickname-group" style="display: none;">
                <label>微信昵称 <span class="required">*</span></label>
                <input type="text" name="wechat_nickname" placeholder="请填写您的微信昵称，方便我们在后台找到您">
                <small style="color: #666; font-size: 12px; margin-top: 4px; display: block;">仅用于在公众号后台识别用户，不作他用</small>
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
        const followedWechat = document.getElementById('followed-wechat');
        const wechatNicknameGroup = document.getElementById('wechat-nickname-group');
        const wechatNicknameInput = document.querySelector('input[name="wechat_nickname"]');

        followedWechat.addEventListener('change', function() {
            wechatNicknameGroup.style.display = this.checked ? 'block' : 'none';
            wechatNicknameInput.required = this.checked;
            if (!this.checked) {
                wechatNicknameInput.value = '';
            }
        });

        function showMessage(text, type) {
            messageEl.textContent = text;
            messageEl.className = 'message ' + type + ' show';
        }

        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (followedWechat.checked && !wechatNicknameInput.value.trim()) {
                showMessage('请填写微信昵称', 'error');
                return;
            }
            
            submitBtn.disabled = true;
            submitBtn.textContent = '提交中...';
            
            const formData = new FormData(form);
            const data = {
                name: formData.get('name'),
                email: formData.get('email'),
                phone: formData.get('phone') || '',
                company: formData.get('company') || '',
                followed_wechat: followedWechat.checked,
                wechat_nickname: formData.get('wechat_nickname') || '',
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
                    wechatNicknameGroup.style.display = 'none';
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


ADMIN_PAGE_HTML = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>用户管理中心 - 专利分析智能工作台</title>
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
            max-width: 1400px;
            margin: 0 auto;
            padding: 24px;
        }
        .tabs {
            display: flex;
            gap: 8px;
            margin-bottom: 20px;
            flex-wrap: wrap;
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
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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
        .status-active { background: #DCFCE7; color: #166534; }
        .status-disabled { background: #FEE2E2; color: #991B1B; }
        .actions {
            display: flex;
            gap: 8px;
            margin-top: 16px;
            flex-wrap: wrap;
        }
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.3s;
        }
        .btn-sm { padding: 6px 12px; font-size: 12px; }
        .btn-primary { background: var(--primary-color); color: white; }
        .btn-primary:hover { background: var(--primary-color-dark); }
        .btn-danger { background: #EF4444; color: white; }
        .btn-danger:hover { background: #DC2626; }
        .btn-secondary { background: #6B7280; color: white; }
        .btn-secondary:hover { background: #4B5563; }
        .btn-warning { background: #F59E0B; color: white; }
        .btn-warning:hover { background: #D97706; }
        .btn-email { background: #3B82F6; color: white; }
        .btn-email:hover { background: #2563EB; }
        .checkbox-group {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 12px;
            padding: 12px;
            background: #F0FDF4;
            border-radius: 8px;
        }
        .checkbox-group input[type="checkbox"] { width: 18px; height: 18px; }
        .checkbox-group label { font-size: 14px; color: var(--text-color); cursor: pointer; }
        .account-info {
            background: #F0FDF4;
            border: 1px solid #86EFAC;
            border-radius: 8px;
            padding: 16px;
            margin-top: 16px;
        }
        .account-info h4 { color: var(--primary-color-dark); margin-bottom: 12px; }
        .account-info p { margin: 8px 0; font-size: 14px; }
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
        .empty-state { text-align: center; padding: 40px; color: #6B7280; }
        .login-container {
            max-width: 400px;
            margin: 100px auto;
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        .login-container h2 { text-align: center; color: var(--primary-color-dark); margin-bottom: 24px; }
        .login-container input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #E5E7EB;
            border-radius: 8px;
            font-size: 15px;
            margin-bottom: 16px;
        }
        .login-container input:focus { outline: none; border-color: var(--primary-color); }
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
        .login-error { color: var(--error-color); text-align: center; margin-bottom: 16px; font-size: 14px; }
        .hidden { display: none; }
        .add-user-form {
            background: #F0FDF4;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .add-user-form h3 { color: var(--primary-color-dark); margin-bottom: 16px; }
        .form-row { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
        .form-row input, .form-row select {
            flex: 1;
            min-width: 150px;
            padding: 10px 14px;
            border: 1px solid #E5E7EB;
            border-radius: 6px;
            font-size: 14px;
        }
        .form-row input:focus, .form-row select:focus { outline: none; border-color: var(--primary-color); }
        .user-table { width: 100%; border-collapse: collapse; }
        .user-table th, .user-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #E5E7EB;
        }
        .user-table th { background: #F9FAFB; font-weight: 600; color: #374151; }
        .user-table tr:hover { background: #F9FAFB; }
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 9999;
            justify-content: center;
            align-items: center;
        }
        .modal.show { display: flex; }
        .modal-content {
            background: white;
            padding: 24px;
            border-radius: 12px;
            width: 400px;
            max-width: 90%;
        }
        .modal-content h3 { margin-bottom: 16px; color: var(--text-color); }
        .modal-content .form-group { margin-bottom: 16px; }
        .modal-content label { display: block; margin-bottom: 6px; font-size: 14px; color: #374151; }
        .modal-content input {
            width: 100%;
            padding: 10px 14px;
            border: 1px solid #E5E7EB;
            border-radius: 6px;
            font-size: 14px;
        }
        .modal-content input:focus { outline: none; border-color: var(--primary-color); }
        .modal-buttons { display: flex; gap: 10px; margin-top: 20px; }
        .stats-row { display: flex; gap: 16px; margin-bottom: 20px; }
        .stat-card {
            background: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            text-align: center;
        }
        .stat-card .number { font-size: 28px; font-weight: bold; color: var(--primary-color-dark); }
        .stat-card .label { font-size: 13px; color: #6B7280; margin-top: 4px; }
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
            <h1>用户管理中心</h1>
            <div class="header-actions">
                <span class="user-info">管理员</span>
                <button class="logout-btn" onclick="logout()">退出</button>
            </div>
        </div>
        
        <div class="container">
            <div class="stats-row">
                <div class="stat-card">
                    <div class="number" id="stat-users">0</div>
                    <div class="label">总用户数</div>
                </div>
                <div class="stat-card">
                    <div class="number" id="stat-active">0</div>
                    <div class="label">活跃用户</div>
                </div>
                <div class="stat-card">
                    <div class="number" id="stat-disabled">0</div>
                    <div class="label">已停用</div>
                </div>
                <div class="stat-card">
                    <div class="number" id="stat-pending">0</div>
                    <div class="label">待审核</div>
                </div>
            </div>
            
            <div class="tabs">
                <div class="tab active" data-tab="users" onclick="switchTab('users')">用户管理</div>
                <div class="tab" data-tab="pending" onclick="switchTab('pending')">待审核申请</div>
                <div class="tab" data-tab="approved" onclick="switchTab('approved')">已通过申请</div>
                <div class="tab" data-tab="rejected" onclick="switchTab('rejected')">已拒绝申请</div>
            </div>
            
            <div id="tab-content"></div>
        </div>
    </div>

    <div id="add-user-modal" class="modal">
        <div class="modal-content">
            <h3>添加新用户</h3>
            <form id="add-user-form">
                <div class="form-group">
                    <label>用户名</label>
                    <input type="text" id="new-username" required minlength="3" maxlength="20" placeholder="3-20位字母数字下划线">
                </div>
                <div class="form-group">
                    <label>密码</label>
                    <input type="text" id="new-password" required minlength="6" placeholder="至少6位">
                </div>
                <div class="form-group">
                    <label>邮箱（选填）</label>
                    <input type="email" id="new-email" placeholder="用于找回密码">
                </div>
                <div class="form-group">
                    <label>昵称（选填）</label>
                    <input type="text" id="new-nickname" placeholder="显示名称">
                </div>
                <div id="add-user-message" style="margin-bottom:12px;padding:10px;border-radius:6px;display:none;"></div>
                <div class="modal-buttons">
                    <button type="button" class="btn btn-secondary" onclick="hideAddUserModal()">取消</button>
                    <button type="submit" class="btn btn-primary">创建用户</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        let currentTab = 'users';
        let isLoggedIn = false;

        function checkLogin() {
            fetch('/api/register/admin/check')
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
            
            fetch('/api/register/admin/login', {
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
            fetch('/api/register/admin/logout', { method: 'POST' })
                .then(() => {
                    isLoggedIn = false;
                    document.getElementById('login-page').classList.remove('hidden');
                    document.getElementById('admin-page').classList.add('hidden');
                });
        }

        function showAdminPage() {
            document.getElementById('login-page').classList.add('hidden');
            document.getElementById('admin-page').classList.remove('hidden');
            loadAllData();
        }

        function switchTab(tab) {
            currentTab = tab;
            document.querySelectorAll('.tab').forEach(t => {
                t.classList.toggle('active', t.dataset.tab === tab);
            });
            loadAllData();
        }

        function loadAllData() {
            loadUsers();
            loadApplications();
        }

        function loadUsers() {
            fetch('/api/register/admin/users')
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        updateStats(data.users);
                        if (currentTab === 'users') {
                            renderUsers(data.users);
                        }
                    }
                });
        }

        function loadApplications() {
            fetch('/api/register/admin/applications')
                .then(r => r.json())
                .then(data => {
                    const apps = data.applications || [];
                    const pending = apps.filter(a => a.status === 'pending');
                    const approved = apps.filter(a => a.status === 'approved');
                    const rejected = apps.filter(a => a.status === 'rejected');
                    
                    document.getElementById('stat-pending').textContent = pending.length;
                    
                    if (currentTab === 'pending') renderApplications(pending, 'pending');
                    else if (currentTab === 'approved') renderApplications(approved, 'approved');
                    else if (currentTab === 'rejected') renderApplications(rejected, 'rejected');
                });
        }

        function updateStats(users) {
            const total = users.length;
            const active = users.filter(u => !u.disabled).length;
            const disabled = users.filter(u => u.disabled).length;
            
            document.getElementById('stat-users').textContent = total;
            document.getElementById('stat-active').textContent = active;
            document.getElementById('stat-disabled').textContent = disabled;
        }

        function renderUsers(users) {
            const container = document.getElementById('tab-content');
            
            if (users.length === 0) {
                container.innerHTML = '<div class="card"><div class="empty-state">暂无用户</div></div>';
                return;
            }
            
            let html = '<div class="card"><div class="card-header"><span class="card-title">用户列表</span>';
            html += '<button class="btn btn-primary btn-sm" onclick="showAddUserModal()">+ 添加用户</button></div>';
            html += '<table class="user-table"><thead><tr>';
            html += '<th>用户名</th><th>状态</th><th>创建时间</th><th>邮箱</th><th>操作</th>';
            html += '</tr></thead><tbody>';
            
            users.forEach(user => {
                const statusClass = user.disabled ? 'status-disabled' : 'status-active';
                const statusText = user.disabled ? '已停用' : '正常';
                html += '<tr>';
                html += '<td><strong>' + user.username + '</strong></td>';
                html += '<td><span class="status-badge ' + statusClass + '">' + statusText + '</span></td>';
                html += '<td>' + (user.created_at || '-') + '</td>';
                html += '<td>' + (user.email || '-') + '</td>';
                html += '<td>';
                html += '<button class="btn btn-sm ' + (user.disabled ? 'btn-primary' : 'btn-warning') + '" onclick="toggleUser(\'' + user.username + '\')">' + (user.disabled ? '启用' : '停用') + '</button> ';
                html += '<button class="btn btn-sm btn-danger" onclick="deleteUser(\'' + user.username + '\')">删除</button>';
                html += '</td></tr>';
            });
            
            html += '</tbody></table></div>';
            container.innerHTML = html;
        }

        function renderApplications(applications, status) {
            const container = document.getElementById('tab-content');
            
            if (applications.length === 0) {
                container.innerHTML = '<div class="card"><div class="empty-state">暂无数据</div></div>';
                return;
            }
            
            container.innerHTML = applications.map(app => `
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">${app.name || app.username}</span>
                        <span class="status-badge status-${app.status}">${
                            app.status === 'pending' ? '待审核' : 
                            app.status === 'approved' ? '已通过' : '已拒绝'
                        }</span>
                    </div>
                    <div class="card-body">
                        <div class="info-grid">
                            <div class="info-item"><label>邮箱</label><span>${app.email || '-'}</span></div>
                            <div class="info-item"><label>手机号</label><span>${app.phone || '-'}</span></div>
                            <div class="info-item"><label>单位</label><span>${app.company || '-'}</span></div>
                            <div class="info-item"><label>申请时间</label><span>${app.created_at}</span></div>
                        </div>
                        ${app.status === 'approved' && app.username ? `
                        <div class="account-info">
                            <h4>账号信息 <button class="copy-btn" onclick="copyAccount('${app.username}', '${app.password || ''}')">复制</button></h4>
                            <p>用户名: <code>${app.username}</code></p>
                            <p>密码: <code>${app.password || '[用户已修改]'}</code></p>
                            ${app.password_changed ? '<p style="color:#F59E0B;font-size:12px;">用户已自行修改密码</p>' : ''}
                        </div>
                        ` : ''}
                        ${app.status === 'pending' ? `
                        <div class="checkbox-group">
                            <input type="checkbox" id="send-email-${app.id}" checked>
                            <label for="send-email-${app.id}">审核通过后发送账号到邮箱</label>
                        </div>
                        <div class="actions">
                            <button class="btn btn-primary" onclick="approve('${app.id}')">通过</button>
                            <button class="btn btn-danger" onclick="reject('${app.id}')">拒绝</button>
                        </div>
                        ` : ''}
                        ${app.status !== 'pending' ? `
                        <div class="actions">
                            <button class="btn btn-secondary" onclick="deleteApp('${app.id}')">删除记录</button>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `).join('');
        }

        function showAddUserModal() {
            document.getElementById('add-user-modal').classList.add('show');
        }

        function hideAddUserModal() {
            document.getElementById('add-user-modal').classList.remove('show');
            document.getElementById('add-user-form').reset();
            document.getElementById('add-user-message').style.display = 'none';
        }

        document.getElementById('add-user-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            const username = document.getElementById('new-username').value.trim();
            const password = document.getElementById('new-password').value;
            const email = document.getElementById('new-email').value.trim();
            const nickname = document.getElementById('new-nickname').value.trim();
            const msgEl = document.getElementById('add-user-message');
            
            try {
                const response = await fetch('/api/register/admin/create-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password, email, nickname })
                });
                const result = await response.json();
                
                if (result.success) {
                    msgEl.textContent = result.message;
                    msgEl.style.background = '#DCFCE7';
                    msgEl.style.color = '#166534';
                    msgEl.style.display = 'block';
                    setTimeout(() => { hideAddUserModal(); loadUsers(); }, 1000);
                } else {
                    msgEl.textContent = result.message;
                    msgEl.style.background = '#FEE2E2';
                    msgEl.style.color = '#991B1B';
                    msgEl.style.display = 'block';
                }
            } catch (err) {
                msgEl.textContent = '创建失败';
                msgEl.style.background = '#FEE2E2';
                msgEl.style.color = '#991B1B';
                msgEl.style.display = 'block';
            }
        });

        function toggleUser(username) {
            const action = confirm('确定要切换该用户的状态吗？');
            if (!action) return;
            
            fetch('/api/register/admin/toggle-user/' + username, { method: 'POST' })
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        alert(data.message);
                        loadUsers();
                    } else {
                        alert(data.message);
                    }
                });
        }

        function deleteUser(username) {
            if (!confirm('确定要删除用户 ' + username + ' 吗？此操作不可恢复！')) return;
            
            fetch('/api/register/admin/delete-user/' + username, { method: 'POST' })
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        alert(data.message);
                        loadUsers();
                    } else {
                        alert(data.message);
                    }
                });
        }

        function approve(id) {
            if (!confirm('确定通过该申请？')) return;
            const sendEmail = document.getElementById('send-email-' + id).checked;
            
            fetch('/api/register/admin/approve/' + id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ send_email: sendEmail })
            })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    let msg = '审核通过！\\n用户名: ' + data.username + '\\n密码: ' + data.password;
                    if (data.email_sent) msg += '\\n\\n账号已发送到用户邮箱';
                    alert(msg);
                    loadAllData();
                } else {
                    alert(data.message);
                }
            });
        }

        function reject(id) {
            if (!confirm('确定拒绝该申请？')) return;
            fetch('/api/register/admin/reject/' + id, { method: 'POST' })
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        alert('已拒绝');
                        loadApplications();
                    } else {
                        alert(data.message);
                    }
                });
        }

        function deleteApp(id) {
            if (!confirm('确定删除该记录？')) return;
            fetch('/api/register/admin/delete/' + id, { method: 'POST' })
                .then(() => loadApplications());
        }

        function copyAccount(username, password) {
            const text = '用户名: ' + username + '\\n密码: ' + password;
            navigator.clipboard.writeText(text).then(() => alert('已复制'));
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
    followed_wechat = data.get('followed_wechat', False)
    wechat_nickname = data.get('wechat_nickname', '').strip()
    reason = data.get('reason', '').strip()
    
    if not name or not email:
        return jsonify({'success': False, 'message': '请填写必填项'})
    
    if followed_wechat and not wechat_nickname:
        return jsonify({'success': False, 'message': '请填写微信昵称'})
    
    result = registration_service.submit_application(
        name, email, phone, company, followed_wechat, wechat_nickname, reason
    )
    return jsonify(result)


@registration_bp.route('/admin', methods=['GET'])
def admin_page():
    from flask import Response
    return Response(ADMIN_PAGE_HTML, mimetype='text/html')


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
