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
        .login-wrapper {
            position: relative;
            display: inline-block;
        }
        .paper-corner {
            position: absolute;
            top: -5px;
            right: -5px;
            width: 50px;
            height: 50px;
            z-index: 10;
            cursor: pointer;
        }
        .paper-corner::before {
            content: '';
            position: absolute;
            top: 0;
            right: 0;
            width: 0;
            height: 0;
            border-style: solid;
            border-width: 0 50px 50px 0;
            border-color: transparent #22C55E transparent transparent;
            transition: all 0.3s ease;
        }
        .paper-corner:hover::before {
            border-width: 0 55px 55px 0;
        }
        .paper-corner-icon {
            position: absolute;
            top: 8px;
            right: 8px;
            width: 24px;
            height: 24px;
            color: white;
            transition: all 0.3s ease;
            z-index: 2;
        }
        .paper-corner:hover .paper-corner-icon {
            transform: scale(1.1);
        }
        .qr-popup {
            position: absolute;
            top: 55px;
            right: 0;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.15);
            padding: 20px;
            text-align: center;
            opacity: 0;
            visibility: hidden;
            transform: translateY(-10px);
            transition: all 0.3s ease;
            z-index: 100;
            min-width: 180px;
        }
        .paper-corner:hover .qr-popup,
        .qr-popup:hover {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
        }
        .qr-popup img {
            width: 120px;
            height: 120px;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
        }
        .qr-popup .qr-title {
            font-size: 14px;
            color: #166534;
            font-weight: 600;
            margin: 12px 0 4px;
        }
        .qr-popup .qr-name {
            font-size: 13px;
            color: #666;
            margin: 0;
        }
        .qr-popup .qr-tip {
            font-size: 11px;
            color: #999;
            margin: 8px 0 0;
            padding-top: 8px;
            border-top: 1px solid #f0f0f0;
        }
        @media (max-width: 900px) {
            .paper-corner {
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
    <div class="login-wrapper">
        <div class="paper-corner">
            <svg class="paper-corner-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <div class="qr-popup">
                <img src="/frontend/images/QRcode.jpg" alt="公众号二维码">
                <div class="qr-title">关注公众号</div>
                <p class="qr-name">IP智友</p>
                <p class="qr-tip">获取帮助 · 反馈问题</p>
            </div>
        </div>
        <div class="login-container">
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
                
                <div class="input-group">
                    <div style="margin-bottom: 8px; text-align: left; font-size: 14px; color: var(--text-color);">
                        <label for="captcha">验证：{{ captcha_question }}</label>
                    </div>
                    <input type="number" id="captcha" name="captcha" placeholder="请输入计算结果" required>
                </div>
                
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
                <a href="/forgot-password">找回密码</a>
                <br>
                <a href="/api/register/apply" id="get-account-btn" class="get-account-btn">获取账号</a>
            </div>
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
    <style>
        .user-actions {{
            position: fixed;
            top: 10px;
            right: 20px;
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 10px;
            background: rgba(255,255,255,0.95);
            padding: 6px 12px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        .user-display {{
            color: #14532D;
            font-size: 13px;
        }}
        .user-display strong {{
            color: #16A34A;
        }}
        .change-pwd-btn, .logout-btn {{
            color: #16A34A;
            text-decoration: none;
            font-size: 13px;
            padding: 2px 8px;
            border-radius: 4px;
            transition: all 0.2s;
        }}
        .change-pwd-btn:hover, .logout-btn:hover {{
            background: #F0FDF4;
        }}
        .logout-btn {{
            color: #EF4444;
        }}
        .cp-modal {{
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 99999;
            justify-content: center;
            align-items: center;
        }}
        .cp-modal.show {{
            display: flex;
        }}
        .cp-modal-content {{
            background: white;
            padding: 30px;
            border-radius: 12px;
            width: 360px;
            max-width: 90%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            position: relative;
        }}
        .cp-modal-content h3 {{
            margin: 0 0 20px;
            color: #14532D;
            font-size: 18px;
        }}
        .cp-modal-content label {{
            display: block;
            margin-bottom: 5px;
            color: #14532D;
            font-size: 14px;
        }}
        .cp-modal-content input {{
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 6px;
            box-sizing: border-box;
            font-size: 14px;
        }}
        .cp-modal-content input:focus {{
            outline: none;
            border-color: #22C55E;
        }}
        .cp-modal-content .form-group {{
            margin-bottom: 15px;
        }}
        .cp-message {{
            margin-bottom: 15px;
            padding: 10px;
            border-radius: 6px;
            font-size: 14px;
            display: none;
        }}
        .cp-message.success {{
            background: #DCFCE7;
            color: #166534;
            display: block;
        }}
        .cp-message.error {{
            background: #FEE2E2;
            color: #991B1B;
            display: block;
        }}
        .cp-buttons {{
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }}
        .cp-btn {{
            flex: 1;
            padding: 10px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
        }}
        .cp-btn-cancel {{
            background: white;
            border: 1px solid #ddd;
            color: #666;
        }}
        .cp-btn-submit {{
            background: linear-gradient(45deg, #16A34A, #22C55E);
            border: none;
            color: white;
            font-weight: 500;
        }}
        .cp-btn-submit:disabled {{
            opacity: 0.6;
            cursor: not-allowed;
        }}
    </style>
    <div class="user-actions">
        <span class="user-display">当前用户: <strong id="current-username">{username}</strong></span>
        <a href="javascript:void(0);" onclick="showChangeUsernameModal()" class="change-pwd-btn">改用户名</a>
        <a href="javascript:void(0);" onclick="showChangePasswordModal()" class="change-pwd-btn">改密码</a>
        <a href="{url_for('auth.logout')}" class="logout-btn">登出</a>
    </div>
    <div id="change-username-modal" class="cp-modal">
        <div class="cp-modal-content">
            <h3>修改用户名</h3>
            <form id="change-username-form" autocomplete="off">
                <div class="form-group">
                    <label>新用户名</label>
                    <input type="text" id="new-username" required minlength="3" maxlength="20" placeholder="3-20位字母数字下划线">
                </div>
                <div class="form-group">
                    <label>密码确认</label>
                    <input type="password" id="username-password" required placeholder="请输入密码确认身份">
                </div>
                <div id="change-username-message" class="cp-message"></div>
                <div class="cp-buttons">
                    <button type="button" class="cp-btn cp-btn-cancel" onclick="hideChangeUsernameModal()">取消</button>
                    <button type="submit" id="change-username-btn" class="cp-btn cp-btn-submit">确认修改</button>
                </div>
            </form>
        </div>
    </div>
    <div id="change-password-modal" class="cp-modal">
        <div class="cp-modal-content">
            <h3>修改密码</h3>
            <form id="change-password-form" autocomplete="off">
                <div class="form-group">
                    <label>旧密码</label>
                    <input type="password" id="old-password" required autocomplete="current-password">
                </div>
                <div class="form-group">
                    <label>新密码</label>
                    <input type="password" id="new-password" required minlength="6" placeholder="至少6位" autocomplete="new-password">
                </div>
                <div class="form-group">
                    <label>确认新密码</label>
                    <input type="password" id="confirm-password" required minlength="6" autocomplete="new-password">
                </div>
                <div id="change-pwd-message" class="cp-message"></div>
                <div class="cp-buttons">
                    <button type="button" class="cp-btn cp-btn-cancel" onclick="hideChangePasswordModal()">取消</button>
                    <button type="submit" id="change-pwd-btn" class="cp-btn cp-btn-submit">确认修改</button>
                </div>
            </form>
        </div>
    </div>
    <script>
    function showChangeUsernameModal() {{
        document.getElementById('change-username-modal').classList.add('show');
    }}
    function hideChangeUsernameModal() {{
        var modal = document.getElementById('change-username-modal');
        modal.classList.remove('show');
        document.getElementById('change-username-form').reset();
        var msg = document.getElementById('change-username-message');
        msg.className = 'cp-message';
        msg.textContent = '';
    }}
    document.getElementById('change-username-form').addEventListener('submit', async function(e) {{
        e.preventDefault();
        var newUsername = document.getElementById('new-username').value.trim();
        var password = document.getElementById('username-password').value;
        var msgEl = document.getElementById('change-username-message');
        var btn = document.getElementById('change-username-btn');
        
        if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {{
            msgEl.textContent = '用户名只能包含字母、数字和下划线';
            msgEl.className = 'cp-message error';
            return;
        }}
        
        btn.disabled = true;
        btn.textContent = '处理中...';
        
        try {{
            var response = await fetch('/api/user/change-username', {{
                method: 'POST',
                headers: {{'Content-Type': 'application/json'}},
                body: JSON.stringify({{new_username: newUsername, password: password}})
            }});
            var result = await response.json();
            
            if (result.success) {{
                msgEl.textContent = result.message;
                msgEl.className = 'cp-message success';
                document.getElementById('current-username').textContent = newUsername;
                setTimeout(function() {{ hideChangeUsernameModal(); }}, 1500);
            }} else {{
                msgEl.textContent = result.message;
                msgEl.className = 'cp-message error';
            }}
        }} catch (err) {{
            msgEl.textContent = '操作失败，请稍后重试';
            msgEl.className = 'cp-message error';
        }}
        
        btn.disabled = false;
        btn.textContent = '确认修改';
    }});
    function showChangePasswordModal() {{
        document.getElementById('change-password-modal').classList.add('show');
    }}
    function hideChangePasswordModal() {{
        var modal = document.getElementById('change-password-modal');
        modal.classList.remove('show');
        document.getElementById('change-password-form').reset();
        var msg = document.getElementById('change-pwd-message');
        msg.className = 'cp-message';
        msg.textContent = '';
    }}
    document.getElementById('change-password-form').addEventListener('submit', async function(e) {{
        e.preventDefault();
        var oldPwd = document.getElementById('old-password').value;
        var newPwd = document.getElementById('new-password').value;
        var confirmPwd = document.getElementById('confirm-password').value;
        var msgEl = document.getElementById('change-pwd-message');
        var btn = document.getElementById('change-pwd-btn');
        
        if (newPwd !== confirmPwd) {{
            msgEl.textContent = '两次输入的新密码不一致';
            msgEl.className = 'cp-message error';
            return;
        }}
        
        btn.disabled = true;
        btn.textContent = '处理中...';
        
        try {{
            var response = await fetch('/api/user/change-password', {{
                method: 'POST',
                headers: {{'Content-Type': 'application/json'}},
                body: JSON.stringify({{old_password: oldPwd, new_password: newPwd}})
            }});
            var result = await response.json();
            
            if (result.success) {{
                msgEl.textContent = result.message;
                msgEl.className = 'cp-message success';
                setTimeout(function() {{ hideChangePasswordModal(); }}, 1500);
            }} else {{
                msgEl.textContent = result.message;
                msgEl.className = 'cp-message error';
            }}
        }} catch (err) {{
            msgEl.textContent = '操作失败，请稍后重试';
            msgEl.className = 'cp-message error';
        }}
        
        btn.disabled = false;
        btn.textContent = '确认修改';
    }});
    </script>
    """
    
    if '<body>' in html_content:
        html_content = html_content.replace('<body>', f'<body>{user_actions_html}', 1)
    
    return Response(html_content, mimetype='text/html')


FORGOT_PASSWORD_PAGE_HTML = """
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>找回密码 - 专利分析智能工作台</title>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary-color: #22C55E;
            --primary-color-dark: #16A34A;
            --bg-color: #F0FDF4;
            --text-color: #14532D;
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
            max-width: 420px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            color: var(--primary-color-dark);
            font-size: 1.6rem;
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
        input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #E5E7EB;
            border-radius: 8px;
            font-size: 15px;
            transition: all 0.3s;
        }
        input:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1);
        }
        .btn {
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
        .btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 7px 20px rgba(34, 197, 94, 0.3);
        }
        .btn:disabled {
            background: #9CA3AF;
            cursor: not-allowed;
            transform: none;
        }
        .btn-secondary {
            background: white;
            color: var(--primary-color-dark);
            border: 2px solid var(--primary-color);
        }
        .btn-secondary:hover:not(:disabled) {
            background: #F0FDF4;
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
        .step { display: none; }
        .step.active { display: block; }
        .code-input-group {
            display: flex;
            gap: 10px;
        }
        .code-input-group input {
            flex: 1;
        }
        .code-input-group button {
            width: 120px;
            padding: 12px;
            background: white;
            color: var(--primary-color-dark);
            border: 2px solid var(--primary-color);
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.3s;
        }
        .code-input-group button:hover:not(:disabled) {
            background: #F0FDF4;
        }
        .code-input-group button:disabled {
            color: #9CA3AF;
            border-color: #E5E7EB;
            cursor: not-allowed;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>找回密码</h1>
            <p>请输入您的注册邮箱，我们将发送验证码</p>
        </div>
        
        <div id="message" class="message"></div>
        
        <div id="step1" class="step active">
            <form id="email-form">
                <div class="form-group">
                    <label>注册邮箱</label>
                    <input type="email" id="email" required placeholder="请输入您注册时使用的邮箱">
                </div>
                <button type="submit" class="btn" id="send-code-btn">发送验证码</button>
            </form>
        </div>
        
        <div id="step2" class="step">
            <form id="verify-form">
                <div class="form-group">
                    <label>验证码（已发送到您的邮箱）</label>
                    <div class="code-input-group">
                        <input type="text" id="code" required maxlength="6" placeholder="请输入6位验证码">
                        <button type="button" id="resend-btn">重新发送</button>
                    </div>
                </div>
                <button type="submit" class="btn" id="verify-btn">验证</button>
            </form>
        </div>
        
        <div id="step3" class="step">
            <form id="reset-form">
                <div class="form-group">
                    <label>新密码</label>
                    <input type="password" id="new-password" required minlength="6" placeholder="请输入新密码（至少6位）">
                </div>
                <div class="form-group">
                    <label>确认新密码</label>
                    <input type="password" id="confirm-password" required minlength="6" placeholder="请再次输入新密码">
                </div>
                <button type="submit" class="btn" id="reset-btn">重置密码</button>
            </form>
        </div>
        
        <div class="back-link">
            <a href="/login">返回登录页</a>
        </div>
    </div>

    <script>
        var currentEmail = '';
        var messageEl = document.getElementById('message');
        
        function showMessage(text, type) {
            messageEl.textContent = text;
            messageEl.className = 'message ' + type + ' show';
        }
        
        function showStep(stepNum) {
            document.querySelectorAll('.step').forEach(function(s) { s.classList.remove('active'); });
            document.getElementById('step' + stepNum).classList.add('active');
        }
        
        document.getElementById('email-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            var email = document.getElementById('email').value.trim();
            var btn = document.getElementById('send-code-btn');
            
            btn.disabled = true;
            btn.textContent = '发送中...';
            
            try {
                var response = await fetch('/api/forgot-password', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({email: email})
                });
                var result = await response.json();
                
                if (result.success) {
                    currentEmail = email;
                    showMessage(result.message, 'success');
                    showStep(2);
                    startCountdown();
                } else {
                    showMessage(result.message, 'error');
                }
            } catch (err) {
                showMessage('发送失败，请稍后重试', 'error');
            }
            
            btn.disabled = false;
            btn.textContent = '发送验证码';
        });
        
        var countdownTimer = null;
        function startCountdown() {
            var btn = document.getElementById('resend-btn');
            var seconds = 60;
            btn.disabled = true;
            
            countdownTimer = setInterval(function() {
                seconds--;
                btn.textContent = seconds + '秒后重发';
                if (seconds <= 0) {
                    clearInterval(countdownTimer);
                    btn.disabled = false;
                    btn.textContent = '重新发送';
                }
            }, 1000);
        }
        
        document.getElementById('resend-btn').addEventListener('click', async function() {
            var btn = this;
            btn.disabled = true;
            btn.textContent = '发送中...';
            
            try {
                var response = await fetch('/api/forgot-password', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({email: currentEmail})
                });
                var result = await response.json();
                
                if (result.success) {
                    showMessage('验证码已重新发送', 'success');
                    startCountdown();
                } else {
                    showMessage(result.message, 'error');
                    btn.disabled = false;
                    btn.textContent = '重新发送';
                }
            } catch (err) {
                showMessage('发送失败，请稍后重试', 'error');
                btn.disabled = false;
                btn.textContent = '重新发送';
            }
        });
        
        document.getElementById('verify-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            var code = document.getElementById('code').value.trim();
            var btn = document.getElementById('verify-btn');
            
            if (code.length !== 6) {
                showMessage('请输入6位验证码', 'error');
                return;
            }
            
            btn.disabled = true;
            btn.textContent = '验证中...';
            
            try {
                var response = await fetch('/api/verify-reset-code', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({email: currentEmail, code: code})
                });
                var result = await response.json();
                
                if (result.success) {
                    showMessage(result.message, 'success');
                    showStep(3);
                } else {
                    showMessage(result.message, 'error');
                }
            } catch (err) {
                showMessage('验证失败，请稍后重试', 'error');
            }
            
            btn.disabled = false;
            btn.textContent = '验证';
        });
        
        document.getElementById('reset-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            var newPwd = document.getElementById('new-password').value;
            var confirmPwd = document.getElementById('confirm-password').value;
            var btn = document.getElementById('reset-btn');
            
            if (newPwd !== confirmPwd) {
                showMessage('两次输入的密码不一致', 'error');
                return;
            }
            
            if (newPwd.length < 6) {
                showMessage('密码长度至少6位', 'error');
                return;
            }
            
            btn.disabled = true;
            btn.textContent = '重置中...';
            
            try {
                var response = await fetch('/api/reset-password', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({email: currentEmail, new_password: newPwd})
                });
                var result = await response.json();
                
                if (result.success) {
                    showMessage(result.message + '，即将跳转到登录页...', 'success');
                    setTimeout(function() {
                        window.location.href = '/login';
                    }, 2000);
                } else {
                    showMessage(result.message, 'error');
                }
            } catch (err) {
                showMessage('重置失败，请稍后重试', 'error');
            }
            
            btn.disabled = false;
            btn.textContent = '重置密码';
        });
    </script>
</body>
</html>
"""


@auth_bp.route('/forgot-password', methods=['GET'])
def forgot_password_page():
    """Display forgot password page."""
    return render_template_string(FORGOT_PASSWORD_PAGE_HTML)


@auth_bp.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    """
    Send verification code to user email.
    
    Returns:
        JSON response with success status and message
    """
    from backend.user_management.registration_service import send_verification_code_email
    
    data = request.get_json()
    email = data.get('email', '').strip()
    
    if not email:
        return {'success': False, 'message': '请输入邮箱地址'}
    
    username = AuthService.get_username_by_email(email)
    if not username:
        return {'success': False, 'message': '该邮箱未注册或未通过审核'}
    
    code = AuthService.generate_verification_code()
    if not AuthService.save_reset_code(email, code):
        return {'success': False, 'message': '验证码保存失败，请稍后重试'}
    
    if not send_verification_code_email(email, code):
        return {'success': False, 'message': '验证码发送失败，请检查邮箱配置'}
    
    return {'success': True, 'message': '验证码已发送到您的邮箱，有效期10分钟'}


@auth_bp.route('/api/verify-reset-code', methods=['POST'])
def verify_reset_code():
    """
    Verify the reset code.
    
    Returns:
        JSON response with success status and message
    """
    data = request.get_json()
    email = data.get('email', '').strip()
    code = data.get('code', '').strip()
    
    if not email or not code:
        return {'success': False, 'message': '参数错误'}
    
    success, message = AuthService.verify_reset_code(email, code)
    return {'success': success, 'message': message}


@auth_bp.route('/api/reset-password', methods=['POST'])
def reset_password():
    """
    Reset user password.
    
    Returns:
        JSON response with success status and message
    """
    data = request.get_json()
    email = data.get('email', '').strip()
    new_password = data.get('new_password', '')
    
    if not email or not new_password:
        return {'success': False, 'message': '参数错误'}
    
    if len(new_password) < 6:
        return {'success': False, 'message': '密码长度至少6位'}
    
    success, message = AuthService.reset_password_by_email(email, new_password)
    return {'success': success, 'message': message}


@auth_bp.route('/api/user/change-password', methods=['POST'])
@login_required
def change_password():
    """
    Change user password (for logged-in users).
    
    Returns:
        JSON response with success status and message
    """
    data = request.get_json()
    old_password = data.get('old_password', '')
    new_password = data.get('new_password', '')
    
    if not old_password or not new_password:
        return {'success': False, 'message': '参数错误'}
    
    if len(new_password) < 6:
        return {'success': False, 'message': '新密码长度至少6位'}
    
    username = session.get('user')
    success, message = AuthService.change_password(username, old_password, new_password)
    return {'success': success, 'message': message}


@auth_bp.route('/api/user/change-username', methods=['POST'])
@login_required
def change_username():
    """
    Change username (for logged-in users).
    
    Returns:
        JSON response with success status and message
    """
    data = request.get_json()
    new_username = data.get('new_username', '').strip()
    password = data.get('password', '')
    
    if not new_username or not password:
        return {'success': False, 'message': '参数错误'}
    
    old_username = session.get('user')
    success, message = AuthService.change_username(old_username, new_username, password)
    
    if success:
        session['user'] = new_username
    
    return {'success': success, 'message': message}
