# app.py (v12.1 - IP Limit Feature with PostgreSQL)
import os
import json
import traceback
from io import BytesIO
from flask import Flask, request, jsonify, make_response, send_from_directory, Response, session, redirect, url_for, render_template_string
from flask_cors import CORS
from zhipuai import ZhipuAI
import time
from datetime import timedelta
from werkzeug.security import check_password_hash
from functools import wraps
import psycopg2 # <-- 新增: 导入 psycopg2 库
import psycopg2.pool # <-- 新增: 使用连接池提高效率

# --- 1. 配置 ---
USERS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'users.json')

# --- 初始化 Flask 应用 ---
static_folder_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.')
app = Flask(__name__, static_folder=static_folder_path, static_url_path='')
# ▼▼▼ 关键修复：替换简单的 CORS(app) ▼▼▼
# 这将允许所有源(在开发中)访问/api/路径，并支持凭据和 Authorization 头
# 找到你的CORS配置行
CORS(app, 
     resources={r"/api/*": {"origins": "*"}}, 
     supports_credentials=True, 
     allow_headers=["Content-Type", "Authorization"] # <-- 明确添加这一行
)
# ▲▲▲ 修复结束 ▲▲▲

# --- 2. 会话和安全配置 ---
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'dev-secret-key-for-local-testing-only')
app.permanent_session_lifetime = timedelta(hours=6)

# --- 新增: PostgreSQL 和 IP 限制配置 ---
db_pool = None
try:
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("警告: 未找到 DATABASE_URL 环境变量。IP限制功能将不会工作。")
    else:
        # 创建一个数据库连接池
        db_pool = psycopg2.pool.SimpleConnectionPool(1, 5, dsn=database_url)
        # 尝试获取一个连接以测试
        conn = db_pool.getconn()
        print("成功连接到 PostgreSQL 服务器。")
        db_pool.putconn(conn)
except Exception as e:
    print(f"错误: 无法连接到 PostgreSQL 服务器: {e}")
    db_pool = None

# 从环境变量获取IP限制数，如果未设置则默认为 5
MAX_IPS_PER_USER = int(os.environ.get('MAX_IPS_PER_USER', 5))


# --- 新增: 数据库初始化函数 ---
def init_db():
    if not db_pool:
        return
    
    conn = None
    try:
        conn = db_pool.getconn()
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS user_ips (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(255) NOT NULL,
                    ip_address VARCHAR(45) NOT NULL,
                    first_seen TIMESTAMPTZ DEFAULT NOW(),
                    UNIQUE (username, ip_address)
                );
            """)
            conn.commit()
            print("数据库表 'user_ips' 已准备就绪。")
    except Exception as e:
        print(f"数据库初始化失败: {e}")
    finally:
        if conn:
            db_pool.putconn(conn)

# --- 3. 用户数据加载函数 ---
def load_users():
    try:
        with open(USERS_FILE, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        print("警告：'users.json' 文件未找到或格式错误。将无法登录。")
        return {}

# --- 新增: 获取真实客户端 IP 的辅助函数 (保持不变) ---
def get_client_ip():
    if 'X-Forwarded-For' in request.headers:
        # 在 Render 等环境中，这个头包含了真实的客户端IP
        return request.headers['X-Forwarded-For'].split(',')[0].strip()
    return request.remote_addr

# --- 4. 访问控制装饰器 (升级版，实现踢人逻辑) ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            # 如果是API请求，返回JSON错误；如果是页面请求，重定向
            if request.path.startswith('/api/'):
                return jsonify({"success": False, "error": "Authentication required."}), 401
            return redirect(url_for('login'))

        if db_pool:
            conn = None
            try:
                conn = db_pool.getconn()
                with conn.cursor() as cur:
                    username = session['user']
                    client_ip = get_client_ip()
                    cur.execute("SELECT 1 FROM user_ips WHERE username = %s AND ip_address = %s;", (username, client_ip))
                    if cur.fetchone() is None:
                        session.clear()
                        if request.path.startswith('/api/'):
                             return jsonify({"success": False, "error": "Session expired or logged in from another location."}), 401
                        return redirect(url_for('login', error="您的账号已在其他地方登录，您已被下线。"))
            except Exception as e:
                print(f"会话IP验证时发生数据库错误: {e}")
            finally:
                if conn:
                    db_pool.putconn(conn)
        
        return f(*args, **kwargs)
    return decorated_function

def validate_api_request():
    """
    一个用于 API 路由的手动验证函数。
    它会检查 session 和 IP。
    如果验证成功，返回 (True, None)。
    如果验证失败，返回 (False, Response)，其中 Response 是一个可以直接返回的错误响应对象。
    """
    # 1. 检查 Session
    if 'user' not in session:
        error_payload = {"success": False, "error": "Authentication required. Please log in."}
        return False, make_response(jsonify(error_payload), 401)

    # 2. 检查 IP (如果启用了数据库)
    if db_pool:
        conn = None
        try:
            conn = db_pool.getconn()
            with conn.cursor() as cur:
                username = session['user']
                client_ip = get_client_ip()
                cur.execute("SELECT 1 FROM user_ips WHERE username = %s AND ip_address = %s;", (username, client_ip))
                if cur.fetchone() is None:
                    session.clear()
                    error_payload = {"success": False, "error": "Session expired or logged in from another location."}
                    return False, make_response(jsonify(error_payload), 401)
        except Exception as e:
            print(f"API请求验证时发生数据库错误: {e}")
            # 数据库出错时，为保可用性，暂时放行
        finally:
            if conn:
                db_pool.putconn(conn)
    
    # 3. 所有验证通过
    return True, None

# --- 5. 登录页面模板 (全面升级) ---
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
        }
        .login-container {
            background: var(--surface-color);
            padding: 40px 50px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            width: 360px;
            text-align: center;
            border: 1px solid rgba(34, 197, 94, 0.2);
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
            display: {% if error %}block{% else %}none{% endif %};
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
        .footer {
            position: absolute;
            bottom: 20px;
            font-size: 12px;
            color: #aaa;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="logo-container">
            <h1 class="logo-text">ALFRED X IP</h1>
            <p style="margin: 5px 0 0; color: #777;">专利分析智能工作台</p>
        </div>
        
        <div id="error-box" class="error-box">
            <strong>登录失败</strong><br>
            <span id="error-message">{{ error|default('', true) }}</span>
        </div>

        <form id="login-form" method="post">
            <div class="input-group">
                <input type="text" name="username" placeholder="用户名" required autocomplete="username">
            </div>
            <div class="input-group">
                <input type="password" id="password" name="password" placeholder="密码" required autocomplete="current-password">
                <span id="password-toggle" class="password-toggle">👁️</span>
            </div>
            <button id="login-btn" type="submit" class="login-btn">
                <span id="btn-text">登 录</span>
                <div id="spinner" class="spinner"></div>
            </button>
        </form>

        <div class="links">
            忘记密码? 
            <!-- ▼▼▼ 需求 4: 修改 mailto 链接为弹窗 ▼▼▼ -->
            <a href="javascript:void(0);" onclick="alert('请联系管理员邮箱：freecasafred@outlook.com'); return false;">联系管理员</a>
            <!-- ▲▲▲ 需求 4: 修改完成 ▲▲▲ -->
        </div>
    </div>

    <div class="footer">
        © 2025 ALFRED X IP. All Rights Reserved.
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const passwordInput = document.getElementById('password');
            const passwordToggle = document.getElementById('password-toggle');
            const loginForm = document.getElementById('login-form');
            const loginBtn = document.getElementById('login-btn');
            const btnText = document.getElementById('btn-text');
            const spinner = document.getElementById('spinner');

            // 密码可见性切换
            passwordToggle.addEventListener('click', function() {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                this.textContent = type === 'password' ? '👁️' : '🙈';
            });

            // 表单提交时显示加载状态
            loginForm.addEventListener('submit', function() {
                loginBtn.disabled = true;
                btnText.style.display = 'none';
                spinner.style.display = 'block';
            });
        });
    </script>
</body>
</html>
"""

# --- 6. 访问控制路由 (核心修改) ---

@app.route('/login', methods=['GET', 'POST'])
def login():
    # 接收GET请求时，从URL参数获取错误信息并传递给模板
    error_from_redirect = request.args.get('error')
    
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        users = load_users()

        if username in users and check_password_hash(users.get(username, ""), password):
            # 密码验证通过，进行IP处理
            if db_pool:
                client_ip = get_client_ip()
                conn = None
                try:
                    conn = db_pool.getconn()
                    with conn.cursor() as cur:
                        # 检查此IP是否已经是该用户的有效IP
                        cur.execute("SELECT 1 FROM user_ips WHERE username = %s AND ip_address = %s;", (username, client_ip))
                        is_known_ip = cur.fetchone() is not None

                        if not is_known_ip:
                            # 如果是新IP，检查当前IP总数
                            cur.execute("SELECT COUNT(*) FROM user_ips WHERE username = %s;", (username,))
                            ip_count = cur.fetchone()[0]
                            
                            # 如果IP数量达到或超过上限
                            if ip_count >= MAX_IPS_PER_USER:
                                print(f"用户 '{username}' IP达到上限。准备踢出最旧的IP。")
                                # 查找并删除最旧的一条IP记录 (基于first_seen时间戳)
                                # 使用子查询来安全地识别并删除目标行
                                cur.execute("""
                                    DELETE FROM user_ips 
                                    WHERE id = (
                                        SELECT id FROM user_ips 
                                        WHERE username = %s 
                                        ORDER BY first_seen ASC 
                                        LIMIT 1
                                    );
                                """, (username,))
                                print(f"已为用户 '{username}' 删除了最旧的IP记录。")

                            # 插入新的IP记录
                            # ON CONFLICT 仍然有用，可以防止极端的并发竞争问题
                            cur.execute("""
                                INSERT INTO user_ips (username, ip_address) VALUES (%s, %s)
                                ON CONFLICT (username, ip_address) DO NOTHING;
                            """, (username, client_ip))
                            print(f"为用户 '{username}' 添加了新的IP: {client_ip}")
                        
                        conn.commit()
                except Exception as e:
                    print(f"IP处理时数据库操作失败: {e}")
                    # 数据库出错，依旧放行，保证可用性
                finally:
                    if conn:
                        db_pool.putconn(conn)
            
            # IP处理完成，设置 session 并重定向
            session['user'] = username
            session.permanent = True
            return redirect(url_for('serve_app'))
        else:
            # 密码错误
            return render_template_string(LOGIN_PAGE_HTML, error="用户名或密码不正确，请重试。")
    
    # 对于GET请求，显示登录页面，并传递可能存在的错误信息
    return render_template_string(LOGIN_PAGE_HTML, error=error_from_redirect)

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# --- 管理员工具，用于清空某个用户的IP记录 ---
@app.route('/admin/clear_ips/<username>', methods=['POST'])
def clear_user_ips(username):
    # !! 生产环境需要加管理员认证 !!
    if not db_pool:
        return "数据库未连接，无法执行操作。", 500

    conn = None
    try:
        conn = db_pool.getconn()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM user_ips WHERE username = %s;", (username,))
            # rowcount 会返回被删除的行数
            deleted_count = cur.rowcount
            conn.commit()
        if deleted_count > 0:
            return f"成功清空用户 '{username}' 的 {deleted_count} 条IP记录。", 200
        else:
            return f"未找到用户 '{username}' 的IP记录。", 404
    except Exception as e:
        return f"清空IP记录时发生错误: {e}", 500
    finally:
        if conn:
            db_pool.putconn(conn)

# --- 主应用路由 ---

@app.route('/')
def index():
    if 'user' in session:
        return redirect(url_for('serve_app'))
    else:
        return redirect(url_for('login'))

# 在 app.py 中，找到并替换 serve_app 函数

@app.route('/app')
@login_required
def serve_app():
    """这个受保护的路由负责提供主应用 index.html，并注入用户信息。"""
    with open(os.path.join(static_folder_path, 'index.html'), 'r', encoding='utf-8') as f:
        html_content = f.read()

    # 从 session 获取当前登录的用户名
    username = session.get('user', '用户') # 如果获取失败，默认为 '用户'

    # 创建包含用户名显示和登出按钮的 HTML 块
    user_actions_html = f"""
    <div class="user-actions">
        <span class="user-display">当前用户: <strong>{username}</strong></span>
        <a href="{url_for('logout')}" class="logout-btn">登出</a>
    </div>
    """
    
    # 注入到 <body> 标签后
    if '<body>' in html_content:
        html_content = html_content.replace('<body>', f'<body>{user_actions_html}', 1)
    
    return Response(html_content, mimetype='text/html')

# --- 辅助函数 (保持不变) ---
def create_response(data=None, error=None, status_code=200):
    response_data = {}
    if data is not None:
        response_data['success'] = True
        response_data['data'] = data
    if error is not None:
        response_data['success'] = False
        response_data['error'] = error
        if status_code == 200:
            status_code = 400
    return make_response(jsonify(response_data), status_code)

def get_client_from_header():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None, create_response(error="Authorization header with Bearer token is required.", status_code=401)
    
    api_key = auth_header.split(' ')[1]
    if not api_key:
        return None, create_response(error="API Key is missing in Authorization header.", status_code=401)
    
    try:
        client = ZhipuAI(api_key=api_key)
        return client, None
    except Exception as e:
        return None, create_response(error=f"Failed to initialize ZhipuAI client: {str(e)}", status_code=400)

# --- API 端点 (全部应用访问控制，保持不变) ---
@app.route('/api/stream_chat', methods=['POST'])
def stream_chat():
    is_valid, error_response = validate_api_request()
    if not is_valid:
        # 对于流式API，我们需要将JSON错误包装成流式格式
        error_json = json.dumps(error_response.get_json())
        return Response(f"data: {error_json}\n\n", mimetype='text/event-stream', status=error_response.status_code)


    try:
        req_data = request.get_json(silent=True) # 使用 silent=True 防止因空body崩溃
        if req_data is None:
             raise ValueError("Request body is not a valid JSON or is empty.")
    except Exception as e:
        error_json = json.dumps({"error": {"message": f"Invalid request format: {e}", "type": "request_error"}})
        return Response(f"data: {error_json}\n\n", mimetype='text/event-stream', status=400)


    client, error_response = get_client_from_header()
    if error_response:
        # get_client_from_header 已经返回一个 Response 对象，但我们需要流式格式
        error_json = json.dumps({"error": error_response.get_json()['error']})
        return Response(f"data: {error_json}\n\n", mimetype='text/event-stream', status=error_response.status_code)
        
    model = req_data.get('model')
    temperature = req_data.get('temperature')
    messages = req_data.get('messages')

    if not all([model, messages]):
        error_json = json.dumps({"error": {"message": "model and messages are required.", "type": "request_error"}})
        return Response(f"data: {error_json}\n\n", mimetype='text/event-stream', status=400)

    def generate():
        try:
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True,
                temperature=temperature,
            )
            for chunk in response:
                yield f"data: {chunk.model_dump_json()}\n\n"
        except Exception as e:
            print(f"Error during stream generation: {traceback.format_exc()}")
            error_message = json.dumps({"error": {"message": str(e), "type": "generation_error"}})
            yield f"data: {error_message}\n\n"

    return Response(generate(), mimetype='text/event-stream')

# ▲▲▲ 修复结束 ▲▲▲

@app.route('/api/chat', methods=['POST'])
def simple_chat():
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    client, error_response = get_client_from_header()
    if error_response: return error_response
    req_data = request.get_json()
    model = req_data.get('model')
    messages = req_data.get('messages')
    temperature = req_data.get('temperature', 0.4) 
    if not all([model, messages]): return jsonify({"error": "model and messages are required."}), 400
    try:
        response_from_sdk = client.chat.completions.create(model=model, messages=messages, stream=False, temperature=temperature)
        json_string = response_from_sdk.model_dump_json()
        clean_dict = json.loads(json_string)
        return jsonify(clean_dict)
    except Exception as e:
        print(f"Error in simple_chat: {traceback.format_exc()}")
        error_payload = {"error": {"message": f"同步调用时发生严重错误: {str(e)}", "type": "backend_exception"}}
        return jsonify(error_payload), 500

@app.route('/api/async_submit', methods=['POST'])
def async_submit():
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
        
    client, error_response = get_client_from_header()
    if error_response: return error_response
    req_data = request.get_json()
    model = req_data.get('model', 'glm-4-flash') 
    temperature = req_data.get('temperature', 0.1)
    messages = req_data.get('messages')
    if not messages: return create_response(error="messages are required.")
    try:
        response = client.chat.asyncCompletions.create(model=model, messages=messages, temperature=temperature, request_id=req_data.get('request_id'))
        return create_response(data={'task_id': response.id, 'request_id': response.request_id})
    except Exception as e:
        print(f"Error in async_submit: {traceback.format_exc()}"); return create_response(error=f"提交异步任务时发生错误: {str(e)}")


@app.route('/api/async_retrieve', methods=['POST'])
def async_retrieve():
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
        
    client, error_response = get_client_from_header()
    if error_response: return error_response
    data = request.get_json()
    if not data: return create_response(error="Invalid JSON", status_code=400)
    try:
        task_id = data.get('task_id')
        if not task_id: return create_response(error="Missing task_id", status_code=400)
        retrieved_task = client.chat.asyncCompletions.retrieve_completion_result(id=task_id)
        return create_response(data=json.loads(retrieved_task.model_dump_json()))
    except Exception as e:
        print(f"Error in async_retrieve: {traceback.format_exc()}"); return create_response(error=f"查询异步任务时发生错误: {str(e)}", status_code=500)


@app.route('/api/upload', methods=['POST'])
def upload_file():
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response

    client, error_response = get_client_from_header()
    if error_response: return error_response
    req_data = request.get_json()
    jsonl_content = req_data.get('jsonlContent')
    file_name = req_data.get('fileName', 'temp_batch_upload.jsonl')
    if not jsonl_content: return create_response(error="JSONL 内容不能为空")
    try:
        bytes_io = BytesIO(jsonl_content.encode('utf-8'))
        result = client.files.create(file=(file_name, bytes_io), purpose="batch")
        return create_response(data={'fileId': result.id, 'message': '文件上传成功！'})
    except Exception as e: return create_response(error=f"上传过程中发生错误: {str(e)}")


@app.route('/api/create_batch', methods=['POST'])
def create_batch_task():
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response

    client, error_response = get_client_from_header()
    if error_response: return error_response
    req_data = request.get_json()
    file_id = req_data.get('fileId')
    if not file_id: return create_response(error="File ID 不能为空")
    try:
        batch_job = client.batches.create(input_file_id=file_id, endpoint="/v4/chat/completions", completion_window="24h", metadata={"description": "来自专利工作台的分析任务"})
        return create_response(data=json.loads(batch_job.model_dump_json()))
    except Exception as e: return create_response(error=f"创建Batch任务时发生错误: {str(e)}")


@app.route('/api/check_status', methods=['POST'])
def check_batch_status():
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
        
    client, error_response = get_client_from_header()
    if error_response: return error_response
    req_data = request.get_json()
    batch_id = req_data.get('batchId')
    if not batch_id: return create_response(error="Batch ID 不能为空")
    try:
        batch_job = client.batches.retrieve(batch_id)
        return create_response(data=json.loads(batch_job.model_dump_json()))
    except Exception as e: return create_response(error=f"检查Batch状态时发生错误: {str(e)}")


@app.route('/api/download_result', methods=['POST'])
def download_result_file():
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
        
    client, error_response = get_client_from_header()
    if error_response: return error_response
    req_data = request.get_json()
    file_id = req_data.get('fileId')
    if not file_id: return create_response(error="File ID 不能为空")
    try:
        response_content_object = client.files.content(file_id)
        raw_bytes = response_content_object.content
        return Response(raw_bytes, mimetype='application/x-jsonlines', headers={'Content-Type': 'application/x-jsonlines; charset=utf-8'})
    except Exception as e:
        print(f"Error in download_result_file: {traceback.format_exc()}"); return create_response(error=f"获取文件内容时发生错误: {str(e)}", status_code=500)

# ▼▼▼ 新增：文件管理 API 端点 ▼▼▼

@app.route('/api/files', methods=['GET'])
def list_files():
    """获取用户上传的文件列表"""
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response

    client, error_response = get_client_from_header()
    if error_response:
        return error_response

    try:
        # 我们主要关心用于对话的文件，所以按 purpose 过滤
        # Zhipu API 要求 purpose 字段
        purpose = request.args.get('purpose', 'agent') # 默认为 agent, 也可支持 file-extract 等
        
        file_list = client.files.list(purpose=purpose)
        
        # 将返回的对象转换为JSON兼容的格式
        return create_response(data=json.loads(file_list.model_dump_json()))

    except Exception as e:
        print(f"查询文件列表时发生错误: {traceback.format_exc()}")
        return create_response(error=f"查询文件列表失败: {str(e)}", status_code=500)


@app.route('/api/files/<string:file_id>', methods=['DELETE'])
def delete_file(file_id):
    """删除指定的文件"""
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response

    client, error_response = get_client_from_header()
    if error_response:
        return error_response

    try:
        delete_status = client.files.delete(file_id=file_id)
        return create_response(data=json.loads(delete_status.model_dump_json()))

    except Exception as e:
        print(f"删除文件 {file_id} 时发生错误: {traceback.format_exc()}")
        return create_response(error=f"删除文件失败: {str(e)}", status_code=500)


@app.route('/api/files/<string:file_id>/content', methods=['GET'])
def get_file_content_by_id(file_id):
    """
    [修正版] 获取指定文件的内容，用于复用。
    增加了轮询机制，并修复了SDK方法调用错误。
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response

    client, error_response = get_client_from_header()
    if error_response:
        return error_response

    try:
        # --- 步骤一：使用正确的方法获取文件名 ---
        # 修正: client.files.retrieve -> client.files.retrieve_file_info
        print(f"开始获取文件元数据, File ID: {file_id}")
        file_meta = client.files.retrieve_file_info(file_id=file_id)
        filename = file_meta.filename
        print(f"成功获取文件名: {filename}")

        # --- 步骤二：轮询获取文件内容 (与上传逻辑保持一致) ---
        MAX_RETRIES = 5
        RETRY_DELAY = 2
        extracted_text = None

        print(f"开始轮询获取文件内容 (最多等待 {MAX_RETRIES * RETRY_DELAY} 秒)...")
        for attempt in range(MAX_RETRIES):
            time.sleep(RETRY_DELAY)
            print(f"第 {attempt + 1} 次尝试获取内容...")
            content_response = client.files.content(file_id=file_id)
            
            try:
                decoded_content = content_response.content.decode('utf-8')
                try:
                    json.loads(decoded_content)
                    print("获取到的内容是JSON，可能仍在处理中，继续等待...")
                    if attempt == MAX_RETRIES - 1:
                         raise Exception("文件解析超时，未能获取到纯文本内容。")
                except json.JSONDecodeError:
                    extracted_text = decoded_content
                    print("成功获取到纯文本内容！")
                    break
            except Exception as e:
                print(f"尝试获取内容时出错: {e}")
                if attempt == MAX_RETRIES - 1:
                    raise

        if extracted_text is None:
            raise Exception("在所有重试后仍未能获取到文件内容。")

        # --- 步骤三：返回成功响应 ---
        return create_response(data={
            "fileId": file_id,
            "filename": filename,
            "content": extracted_text
        })

    except Exception as e:
        print(f"获取文件 {file_id} 内容时发生错误: {traceback.format_exc()}")
        return create_response(error=f"获取文件内容失败: {str(e)}", status_code=500)
# ▲▲▲ 替换结束 ▲▲▲

# ▼▼▼ 用这个再次优化的版本替换 extract_file_content 函数 ▼▼▼
@app.route('/api/extract_file_content', methods=['POST'])
def extract_file_content():
    """
    [再次优化版] 增加了轮询等待时间，并优化了超时处理逻辑。
    """
    is_valid, error_response = validate_api_request()
    if not is_valid: return error_response

    client, error_response = get_client_from_header()
    if error_response: return error_response

    if 'file' not in request.files:
        return create_response(error="请求中未找到 'file' 部分", status_code=400)

    file = request.files['file']
    if file.filename == '':
        return create_response(error="未选择任何文件", status_code=400)

    try:
        # --- 步骤一：上传文件 ---
        file_bytes = file.read()
        bytes_io = BytesIO(file_bytes)
        print(f"开始上传文件 '{file.filename}' 到 ZhipuAI...")
        upload_result = client.files.create(
            file=(file.filename, bytes_io),
            purpose="file-extract"
        )
        file_id = upload_result.id
        filename = upload_result.filename
        print(f"文件上传成功，File ID: {file_id}")

        # --- 步骤二：轮询获取文件内容 (增加等待时间) ---
        MAX_RETRIES = 10  # 增加到10次
        RETRY_DELAY = 3   # 每次间隔增加到3秒 (总等待时间约30秒)
        extracted_text = None

        print(f"开始轮询获取文件内容 (最多等待 {MAX_RETRIES * RETRY_DELAY} 秒)...")
        for attempt in range(MAX_RETRIES):
            # 第一次尝试前不等待
            if attempt > 0:
                time.sleep(RETRY_DELAY)
            
            print(f"第 {attempt + 1} 次尝试获取内容...")
            content_response = client.files.content(file_id=file_id)
            
            decoded_content = content_response.content.decode('utf-8')

            try:
                # 检查是否为JSON（即未解析完成）
                json.loads(decoded_content)
                print("获取到的内容是JSON，仍在处理中...")
                # 如果是最后一次尝试，记录这个JSON内容，但不报错
                if attempt == MAX_RETRIES - 1:
                    print("文件解析超时，将返回原始JSON响应。")
                    extracted_text = f"[文件解析超时] 智谱AI返回的原始信息: {decoded_content}"
                    break # 跳出循环，使用这个超时信息
            except json.JSONDecodeError:
                # 成功获取到纯文本
                extracted_text = decoded_content
                print("成功获取到纯文本内容！")
                break

        if extracted_text is None:
            # 理论上不会进入这里，因为上面已经处理了最后一次尝试的情况
            raise Exception("在所有重试后仍未能获取到文件内容。")

        # --- 步骤三：返回成功响应 ---
        response_data = {
            "fileId": file_id,
            "filename": filename,
            "content": extracted_text
        }
        return create_response(data=response_data)

    except Exception as e:
        print(f"文件处理过程中发生严重错误: {traceback.format_exc()}")
        return create_response(error=f"文件处理失败: {str(e)}", status_code=500)
# ▲▲▲ 替换结束 ▲▲▲

# --- 启动前初始化 ---
# 将 init_db() 移到这里。当Render的Gunicorn服务器导入这个文件时，
# 这段代码会立即执行，确保在任何请求到来之前，数据库表就已经创建好了。
init_db()

# --- 启动命令 ---
if __name__ == '__main__':
    # 这个代码块只在你本地通过 `python app.py` 运行时才会执行。
    # 在Render上，它会被忽略。
    try:
        from werkzeug.security import generate_password_hash
    except ImportError:
        print("请先运行 'pip install werkzeug' 来安装密码哈希库。")
        exit(1)
        
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5001)), debug=False)
