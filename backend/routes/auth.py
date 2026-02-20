"""
Authentication routes.

This module handles user authentication including login, logout, and app serving.
"""

import os
import random
from flask import Blueprint, request, session, redirect, url_for, render_template_string, Response
from backend.services.auth_service import AuthService
from backend.middleware.auth_middleware import login_required
from backend.config import BASE_DIR

# Create blueprint
auth_bp = Blueprint('auth', __name__)

# Login page HTML template
LOGIN_PAGE_HTML = """
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>登录 - 专利分析智能工作台</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@900&family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
    <!-- Vanta.js Dependencies -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.net.min.js"></script>
    <style>
        :root {
            --primary-color: #22C55E;
            --primary-color-dark: #16A34A;
            --bg-color: #F0FDF4;
            --surface-color: #FFFFFF;
            --text-color: #14532D;
        }
        body {
            font-family: 'Noto Sans SC', sans-serif;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background-color: var(--bg-color);
            margin: 0;
            color: var(--text-color);
            position: relative;
            overflow: hidden;
        }
        #vanta-bg {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 0;
        }
        .login-container {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            padding: 40px 50px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            width: 360px;
            text-align: center;
            border: 1px solid rgba(34, 197, 94, 0.2);
            position: relative;
            z-index: 1;
        }
        .logo-container {
            margin-bottom: 25px;
        }
        .logo-text {
            font-family: 'Orbitron', sans-serif;
            font-size: 2.5rem;
            margin: 0;
            background: linear-gradient(45deg, var(--primary-color-dark), var(--primary-color));
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
        }
        .error-box {
            color: #D32F2F;
            background-color: #FFEBEE;
            border: 1px solid #FFCDD2;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 20px;
            text-align: left;
            font-size: 14px;
            display: none;
        }
        .error-box.show {
            display: block;
        }
        .input-group {
            position: relative;
            margin-bottom: 20px;
        }
        input {
            width: 100%;
            padding: 14px;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-sizing: border-box;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        input:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
        }
        .password-toggle {
            position: absolute;
            top: 50%;
            right: 15px;
            transform: translateY(-50%);
            cursor: pointer;
            color: #999;
            user-select: none;
            background: none;
            border: none;
            padding: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .password-toggle:hover {
            color: var(--primary-color);
        }
        .password-toggle svg {
            width: 20px;
            height: 20px;
        }
        .login-btn {
            width: 100%;
            padding: 14px;
            background: linear-gradient(45deg, var(--primary-color-dark), var(--primary-color));
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            transition: all 0.3s ease;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 10px;
        }
        .login-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 7px 20px rgba(34, 197, 94, 0.2);
        }
        .login-btn:disabled {
            background: #a5d6a7;
            cursor: not-allowed;
        }
        .spinner {
            width: 18px;
            height: 18px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top-color: #fff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            display: none;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .links {
            margin-top: 20px;
            font-size: 14px;
            color: #666;
        }
        .links a {
            color: var(--primary-color-dark);
            text-decoration: none;
        }
        .links a:hover {
            text-decoration: underline;
        }
        .agreement-section {
            margin: 20px 0;
            text-align: left;
        }
        .agreement-checkbox {
            display: flex;
            align-items: flex-start;
            cursor: pointer;
            position: relative;
            padding-left: 30px;
            user-select: none;
            line-height: 1.6;
        }
        .agreement-checkbox input[type="checkbox"] {
            position: absolute;
            opacity: 0;
            cursor: pointer;
            height: 0;
            width: 0;
        }
        .checkmark {
            position: absolute;
            left: 0;
            top: 2px;
            height: 20px;
            width: 20px;
            background-color: #fff;
            border: 2px solid #ddd;
            border-radius: 4px;
            transition: all 0.3s;
        }
        .agreement-checkbox:hover .checkmark {
            border-color: var(--primary-color);
        }
        .agreement-checkbox input:checked ~ .checkmark {
            background-color: var(--primary-color);
            border-color: var(--primary-color);
        }
        .checkmark:after {
            content: "";
            position: absolute;
            display: none;
            left: 6px;
            top: 2px;
            width: 5px;
            height: 10px;
            border: solid white;
            border-width: 0 2px 2px 0;
            transform: rotate(45deg);
        }
        .agreement-checkbox input:checked ~ .checkmark:after {
            display: block;
        }
        .agreement-text {
            font-size: 13px;
            color: #666;
        }
        .agreement-text a {
            color: var(--primary-color-dark);
            text-decoration: none;
            font-weight: 500;
        }
        .agreement-text a:hover {
            text-decoration: underline;
        }
        .get-account-btn {
            display: inline-block;
            margin-left: 10px;
            color: var(--primary-color-dark);
            text-decoration: none;
            font-weight: 500;
            cursor: pointer;
        }
        .get-account-btn:hover {
            text-decoration: underline;
        }
        .qr-section {
            position: absolute;
            right: -140px;
            top: 50%;
            transform: translateY(-50%);
            text-align: center;
            background: rgba(255, 255, 255, 0.95);
            padding: 15px;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            border: 1px solid rgba(34, 197, 94, 0.2);
        }
        .qr-section img {
            width: 120px;
            height: 120px;
            border-radius: 8px;
        }
        .qr-section p {
            margin: 8px 0 0;
            font-size: 12px;
            color: #666;
        }
        .qr-section .qr-title {
            font-size: 13px;
            color: var(--primary-color-dark);
            font-weight: 500;
            margin-bottom: 8px;
        }
        @media (max-width: 900px) {
            .qr-section {
                display: none;
            }
        }
        .footer {
            position: absolute;
            bottom: 20px;
            font-size: 12px;
            color: #aaa;
            z-index: 1;
        }
    </style>
</head>
<body>
    <div id="vanta-bg"></div>
    <div class="login-container" style="position: relative;">
        <div class="logo-container">
            <h1 class="logo-text">ALFRED X IP</h1>
            <p style="margin: 5px 0 0; color: #777;">专利分析智能工作台</p>
        </div>
        
        <div id="error-box" class="error-box{% if error %} show{% endif %}">
            <strong>登录失败</strong><br>
            <span id="error-message">{{ error|default('', true) }}</span>
        </div>

        <form id="login-form" method="post">
            <div class="input-group">
                <input type="text" name="username" placeholder="用户名" required autocomplete="username">
            </div>
            <div class="input-group">
                <input type="password" id="password" name="password" placeholder="密码" required autocomplete="current-password">
                <button type="button" id="password-toggle" class="password-toggle" title="显示/隐藏密码">
                    <svg id="eye-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    <svg id="eye-off-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: none;">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                </button>
            </div>
            
            <!-- 防机器人验证 -->
            <div class="input-group">
                <div style="margin-bottom: 8px; text-align: left; font-size: 14px; color: var(--text-color);">
                    <label for="captcha">验证：{{ captcha_question }}</label>
                </div>
                <input type="number" id="captcha" name="captcha" placeholder="请输入计算结果" required>
            </div>
            
            <!-- 协议勾选区域 -->
            <div class="agreement-section">
                <label class="agreement-checkbox">
                    <input type="checkbox" id="agreement-check" name="agreement" required>
                    <span class="checkmark"></span>
                    <span class="agreement-text">
                        我已阅读并同意
                        <a href="/frontend/user-agreement.html" target="_blank">《用户协议》</a>、
                        <a href="/frontend/privacy.html" target="_blank">《隐私政策》</a>和
                        <a href="/frontend/disclaimer.html" target="_blank">《免责声明》</a>
                    </span>
                </label>
            </div>
            
            <button id="login-btn" type="submit" class="login-btn">
                <span id="btn-text">登 录</span>
                <div id="spinner" class="spinner"></div>
            </button>
        </form>

        <div class="links">
            忘记密码? 
            <a href="javascript:void(0);" onclick="alert('请联系管理员邮箱：freecasafred@outlook.com'); return false;">联系管理员</a>
            <br>
            <a href="/api/register/apply" id="get-account-btn" class="get-account-btn">获取账号</a>
        </div>
        
        <div class="qr-section">
            <div class="qr-title">关注公众号</div>
            <img src="/frontend/images/QRcode.jpg" alt="IP智友公众号二维码">
            <p>IP智友</p>
        </div>
    </div>

    <div class="footer">
        © 2025 ALFRED X IP. All Rights Reserved.
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // 初始化 Vanta.js NET 动画
            VANTA.NET({
                el: "#vanta-bg",
                mouseControls: true,
                touchControls: true,
                gyroControls: false,
                minHeight: 200.00,
                minWidth: 200.00,
                scale: 1.00,
                scaleMobile: 1.00,
                // 绿色系配色
                color: 0x4ade80,           // 荧光绿连线颜色
                backgroundColor: 0xf0fdf4, // 白色明亮的薄荷绿背景
                // 简洁高格调设置
                points: 8.00,              // 较低的点数量，保持留白
                maxDistance: 18.00,        // 较短的连线距离，避免拥挤
                spacing: 18.00,            // 较大的间距，避免网格细碎
                showDots: true
            });

            const passwordInput = document.getElementById('password');
            const passwordToggle = document.getElementById('password-toggle');
            const eyeIcon = document.getElementById('eye-icon');
            const eyeOffIcon = document.getElementById('eye-off-icon');
            const loginForm = document.getElementById('login-form');
            const loginBtn = document.getElementById('login-btn');
            const btnText = document.getElementById('btn-text');
            const spinner = document.getElementById('spinner');

            // 密码显示/隐藏切换
            passwordToggle.addEventListener('click', function(e) {
                e.preventDefault();
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                
                // 切换图标显示
                if (type === 'password') {
                    eyeIcon.style.display = 'block';
                    eyeOffIcon.style.display = 'none';
                } else {
                    eyeIcon.style.display = 'none';
                    eyeOffIcon.style.display = 'block';
                }
            });

            // 表单提交时显示加载状态
            loginForm.addEventListener('submit', function(e) {
                const agreementCheck = document.getElementById('agreement-check');
                
                // 验证是否勾选协议
                if (!agreementCheck.checked) {
                    e.preventDefault();
                    alert('请先阅读并同意用户协议、隐私政策和免责声明');
                    return false;
                }
                
                loginBtn.disabled = true;
                btnText.style.display = 'none';
                spinner.style.display = 'block';
            });
    </script>
</body>
</html>
"""


def generate_captcha():
    """Generate a simple math captcha question and answer."""
    num1 = random.randint(1, 20)
    num2 = random.randint(1, 20)
    operation = random.choice(['+', '-'])
    
    if operation == '+':
        answer = num1 + num2
        question = f"{num1} + {num2} = ?"
    else:
        # Ensure non-negative result for subtraction
        if num1 < num2:
            num1, num2 = num2, num1
        answer = num1 - num2
        question = f"{num1} - {num2} = ?"
    
    return question, answer


@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """
    Handle user login.
    
    GET: Display login page with captcha
    POST: Process login credentials and verify captcha
    """
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        captcha_answer = request.form.get('captcha')
        
        # Verify captcha
        if not captcha_answer:
            return render_template_string(
                LOGIN_PAGE_HTML,
                error="请输入验证码",
                captcha_question="",
                captcha_answer=""
            )
        
        try:
            captcha_answer = int(captcha_answer)
            if session.get('captcha_answer') != captcha_answer:
                # Generate new captcha for next attempt
                new_captcha_question, new_captcha_answer = generate_captcha()
                session['captcha_answer'] = new_captcha_answer
                return render_template_string(
                    LOGIN_PAGE_HTML,
                    error="验证码不正确，请重试",
                    captcha_question=new_captcha_question
                )
        except ValueError:
            # Generate new captcha for next attempt
            new_captcha_question, new_captcha_answer = generate_captcha()
            session['captcha_answer'] = new_captcha_answer
            return render_template_string(
                LOGIN_PAGE_HTML,
                error="验证码格式不正确，请输入数字",
                captcha_question=new_captcha_question
            )
        
        # Verify credentials
        if AuthService.verify_credentials(username, password):
            # Manage user IP
            client_ip = AuthService.get_client_ip()
            AuthService.manage_user_ip(username, client_ip)
            
            # Set session
            session['user'] = username
            session.permanent = True
            
            return redirect(url_for('auth.serve_app'))
        else:
            # Generate new captcha for next attempt
            new_captcha_question, new_captcha_answer = generate_captcha()
            session['captcha_answer'] = new_captcha_answer
            return render_template_string(
                LOGIN_PAGE_HTML,
                error="用户名或密码不正确，请重试。",
                captcha_question=new_captcha_question
            )
    
    # GET请求：生成新的验证码并显示登录页面
    captcha_question, captcha_answer = generate_captcha()
    session['captcha_answer'] = captcha_answer
    return render_template_string(
        LOGIN_PAGE_HTML,
        error=None,
        captcha_question=captcha_question
    )


@auth_bp.route('/logout')
def logout():
    """Handle user logout."""
    session.clear()
    return redirect(url_for('auth.login'))


@auth_bp.route('/')
def index():
    """Redirect root to app."""
    return redirect(url_for('auth.serve_app'))


@auth_bp.route('/app')
@login_required
def serve_app():
    """
    Serve the main application page.
    
    This route requires authentication and injects user information into the page.
    """
    index_path = os.path.join(BASE_DIR, 'frontend', 'index.html')
    
    with open(index_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    username = session.get('user', '用户')
    user_actions_html = f"""
    <div class="user-actions">
        <span class="user-display">当前用户: <strong>{username}</strong></span>
        <a href="{url_for('auth.logout')}" class="logout-btn">登出</a>
    </div>
    """
    
    if '<body>' in html_content:
        html_content = html_content.replace('<body>', f'<body>{user_actions_html}', 1)
    
    return Response(html_content, mimetype='text/html')
