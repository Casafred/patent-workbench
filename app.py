import os
import json
import traceback
import time
from io import BytesIO
from flask import Flask, request, jsonify, make_response, send_from_directory, Response, session, redirect, url_for, render_template_string, send_file
from flask_cors import CORS
from zhipuai import ZhipuAI
from datetime import timedelta, datetime
from werkzeug.security import check_password_hash
from functools import wraps
import psycopg2
import psycopg2.pool
import requests

# --- 1. 配置 ---
USERS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'users.json')

# --- 初始化 Flask 应用 ---
static_folder_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.')
app = Flask(__name__, static_folder=static_folder_path, static_url_path='')
CORS(app)

# --- 2. 会话和安全配置 ---
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'dev-secret-key-for-local-testing-only')
app.permanent_session_lifetime = timedelta(hours=6)

# --- PostgreSQL 和 IP 限制配置 ---
db_pool = None
try:
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("警告: 未找到 DATABASE_URL 环境变量。IP限制功能将不会工作。")
    else:
        db_pool = psycopg2.pool.SimpleConnectionPool(1, 5, dsn=database_url)
        conn = db_pool.getconn()
        print("成功连接到 PostgreSQL 服务器。")
        db_pool.putconn(conn)
except Exception as e:
    print(f"错误: 无法连接到 PostgreSQL 服务器: {e}")
    db_pool = None

MAX_IPS_PER_USER = int(os.environ.get('MAX_IPS_PER_USER', 5))

# --- 数据库初始化函数 ---
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

# --- 获取真实客户端 IP 的辅助函数 ---
def get_client_ip():
    if 'X-Forwarded-For' in request.headers:
        return request.headers['X-Forwarded-For'].split(',')[0].strip()
    return request.remote_addr

# --- 4. 访问控制装饰器 (升级版) ---
def validate_api_request():
    if 'user' not in session:
        return False, make_response(jsonify({"success": False, "error": "Authentication required. Please log in."}), 401)
    if db_pool:
        conn = None
        try:
            conn = db_pool.getconn()
            with conn.cursor() as cur:
                cur.execute("SELECT 1 FROM user_ips WHERE username = %s AND ip_address = %s;", (session['user'], get_client_ip()))
                if cur.fetchone() is None:
                    session.clear()
                    return False, make_response(jsonify({"success": False, "error": "Session expired or logged in from another location."}), 401)
        except Exception as e:
            print(f"API请求验证时发生数据库错误: {e}")
        finally:
            if conn:
                db_pool.putconn(conn)
    return True, None

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        is_valid, response = validate_api_request()
        if not is_valid:
            if request.path.startswith('/api/'):
                return response
            return redirect(url_for('login', error=response.get_json().get('error')))
        return f(*args, **kwargs)
    return decorated_function

# --- 5. 登录页面模板 ---
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
            <a href="javascript:void(0);" onclick="alert('请联系管理员邮箱：freecasafred@outlook.com'); return false;">联系管理员</a>
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

            passwordToggle.addEventListener('click', function() {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                this.textContent = type === 'password' ? '👁️' : '🙈';
            });

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

# --- 6. 访问控制路由 ---
@app.route('/login', methods=['GET', 'POST'])
def login():
    error_from_redirect = request.args.get('error')
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        users = load_users()
        if username in users and check_password_hash(users.get(username, ""), password):
            if db_pool:
                client_ip = get_client_ip()
                conn = None
                try:
                    conn = db_pool.getconn()
                    with conn.cursor() as cur:
                        cur.execute("SELECT 1 FROM user_ips WHERE username = %s AND ip_address = %s;", (username, client_ip))
                        is_known_ip = cur.fetchone() is not None
                        if not is_known_ip:
                            cur.execute("SELECT COUNT(*) FROM user_ips WHERE username = %s;", (username,))
                            ip_count = cur.fetchone()[0]
                            if ip_count >= MAX_IPS_PER_USER:
                                cur.execute("DELETE FROM user_ips WHERE id = (SELECT id FROM user_ips WHERE username = %s ORDER BY first_seen ASC LIMIT 1);", (username,))
                            cur.execute("INSERT INTO user_ips (username, ip_address) VALUES (%s, %s) ON CONFLICT (username, ip_address) DO NOTHING;", (username, client_ip))
                        conn.commit()
                except Exception as e:
                    print(f"IP处理时数据库操作失败: {e}")
                finally:
                    if conn:
                        db_pool.putconn(conn)
            session['user'] = username
            session.permanent = True
            return redirect(url_for('serve_app'))
        else:
            return render_template_string(LOGIN_PAGE_HTML, error="用户名或密码不正确，请重试。")
    return render_template_string(LOGIN_PAGE_HTML, error=error_from_redirect)

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/')
def index():
    landing_path = os.path.join(static_folder_path, 'frontend', 'landing.html')
    return send_file(landing_path)


@app.route('/app')
@login_required
def serve_app():
    with open(os.path.join(static_folder_path, 'index.html'), 'r', encoding='utf-8') as f:
        html_content = f.read()
    username = session.get('user', '用户')
    user_actions_css = """
    <style>
        .user-actions {
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 99999;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 16px;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 253, 244, 0.98) 100%);
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(34, 197, 94, 0.2);
            font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            transition: all 0.3s ease;
        }
        .user-actions:hover {
            box-shadow: 0 6px 25px rgba(0, 0, 0, 0.15);
        }
        .user-display {
            font-size: 14px;
            color: #475569;
        }
        .user-display strong {
            color: #16A34A;
            font-weight: 600;
        }
        .logout-btn {
            display: inline-flex;
            align-items: center;
            padding: 6px 14px;
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(248, 113, 113, 0.08) 100%);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 8px;
            color: #dc2626;
            font-size: 13px;
            font-weight: 500;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .logout-btn:hover {
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(248, 113, 113, 0.15) 100%);
            border-color: rgba(239, 68, 68, 0.5);
            color: #b91c1c;
        }
        .user-btns {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .user-btn {
            display: inline-flex;
            align-items: center;
            padding: 6px 12px;
            background: rgba(34, 197, 94, 0.1);
            border: 1px solid rgba(34, 197, 94, 0.3);
            border-radius: 8px;
            color: #16A34A;
            font-size: 13px;
            font-weight: 500;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .user-btn:hover {
            background: rgba(34, 197, 94, 0.2);
            border-color: rgba(34, 197, 94, 0.5);
        }
    </style>
    """
    user_actions_html = f"""
    <div class="user-actions">
        <span class="user-display">当前用户: <strong>{username}</strong></span>
        <div class="user-btns">
            <a href="{url_for('logout')}" class="logout-btn">登出</a>
        </div>
    </div>
    """
    if '</head>' in html_content:
        html_content = html_content.replace('</head>', f'{user_actions_css}</head>', 1)
    if '<body>' in html_content:
        html_content = html_content.replace('<body>', f'<body>{user_actions_html}', 1)
    return Response(html_content, mimetype='text/html')

# --- 辅助函数 ---
def create_response(data=None, error=None, status_code=200):
    response_data = {'success': error is None}
    if data is not None:
        response_data['data'] = data
    if error is not None:
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
        return ZhipuAI(api_key=api_key), None
    except Exception as e:
        return None, create_response(error=f"Failed to initialize ZhipuAI client: {str(e)}", status_code=400)

# --- API 端点 ---
@app.route('/api/stream_chat', methods=['POST'])
def stream_chat():
    is_valid, error_response = validate_api_request()
    if not is_valid:
        error_json = json.dumps(error_response.get_json())
        return Response(f"data: {error_json}\n\n", mimetype='text/event-stream', status=error_response.status_code)

    try:
        req_data = request.get_json(silent=True)
        if req_data is None:
             raise ValueError("Request body is not a valid JSON or is empty.")
    except Exception as e:
        error_json = json.dumps({"error": {"message": f"Invalid request format: {e}", "type": "request_error"}})
        return Response(f"data: {error_json}\n\n", mimetype='text/event-stream', status=400)

    client, error_response = get_client_from_header()
    if error_response:
        error_json = json.dumps({"error": error_response.get_json()['error']})
        return Response(f"data: {error_json}\n\n", mimetype='text/event-stream', status=error_response.status_code)
        
    def generate():
        try:
            response = client.chat.completions.create(
                model=req_data.get('model'),
                messages=req_data.get('messages'),
                stream=True,
                temperature=req_data.get('temperature'),
            )
            for chunk in response:
                yield f"data: {chunk.model_dump_json()}\n\n"
        except Exception as e:
            error_message = json.dumps({"error": {"message": str(e), "type": "generation_error"}})
            yield f"data: {error_message}\n\n"

    return Response(generate(), mimetype='text/event-stream')

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
    
    provider = request.headers.get('X-LLM-Provider', 'zhipu')
    
    if 'file' in request.files:
        file = request.files['file']
        try:
            result = client.files.create(
                file=(file.filename, file.stream, 'application/octet-stream'),
                purpose="batch"
            )
            return create_response(data={'file_id': result.id, 'fileId': result.id, 'message': '文件上传成功！'})
        except Exception as e:
            return create_response(error=f"上传过程中发生错误: {str(e)}")
    
    req_data = request.get_json()
    jsonl_content = req_data.get('jsonlContent') if req_data else None
    file_name = req_data.get('fileName', 'temp_batch_upload.jsonl') if req_data else 'temp_batch_upload.jsonl'
    if not jsonl_content: return create_response(error="JSONL 内容不能为空")
    try:
        bytes_io = BytesIO(jsonl_content.encode('utf-8'))
        result = client.files.create(file=(file_name, bytes_io), purpose="batch")
        return create_response(data={'file_id': result.id, 'fileId': result.id, 'message': '文件上传成功！'})
    except Exception as e: return create_response(error=f"上传过程中发生错误: {str(e)}")


@app.route('/api/create_batch', methods=['POST'])
def create_batch_task():
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response

    client, error_response = get_client_from_header()
    if error_response: return error_response
    req_data = request.get_json()
    file_id = req_data.get('input_file_id') or req_data.get('fileId')
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
    batch_id = req_data.get('batch_id') or req_data.get('batchId')
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
    file_id = req_data.get('file_id') or req_data.get('fileId')
    if not file_id: return create_response(error="File ID 不能为空")
    try:
        response_content_object = client.files.content(file_id)
        raw_bytes = response_content_object.content
        return Response(raw_bytes, mimetype='application/x-jsonlines', headers={'Content-Type': 'application/x-jsonlines; charset=utf-8'})
    except Exception as e:
        print(f"Error in download_result_file: {traceback.format_exc()}"); return create_response(error=f"获取文件内容时发生错误: {str(e)}", status_code=500)

# --- 新增：通用文件管理 API ---
@app.route('/api/files/upload', methods=['POST'])
@login_required
def upload_any_file():
    client, error_response = get_client_from_header()
    if error_response:
        return error_response

    if 'file' not in request.files:
        return create_response(error="Missing file part in the request", status_code=400)
    
    file_storage = request.files['file']
    purpose = request.form.get('purpose')

    if not purpose or purpose not in ['batch', 'file-extract', 'code-interpreter', 'agent']:
        return create_response(error="Invalid or missing 'purpose' field", status_code=400)

    try:
        file_content = file_storage.read()
        file_tuple = (file_storage.filename, file_content)
        
        upload_result = client.files.create(file=file_tuple, purpose=purpose)
        return create_response(data=json.loads(upload_result.model_dump_json()))
    except Exception as e:
        print(f"File upload failed: {traceback.format_exc()}")
        return create_response(error=f"An error occurred during file upload: {e}", status_code=500)

@app.route('/api/files', methods=['GET'])
@login_required
def list_files():
    client, error_response = get_client_from_header()
    if error_response:
        return error_response
    
    try:
        purpose = request.args.get('purpose')
        # 根据官方文档，可以添加 after, limit, order 等参数
        list_result = client.files.list(purpose=purpose)
        return create_response(data=json.loads(list_result.model_dump_json()))
    except Exception as e:
        print(f"File listing failed: {traceback.format_exc()}")
        return create_response(error=f"Failed to list files: {e}", status_code=500)

@app.route('/api/files/<string:file_id>', methods=['DELETE'])
@login_required
def delete_file(file_id):
    client, error_response = get_client_from_header()
    if error_response:
        return error_response

    try:
        delete_result = client.files.delete(file_id=file_id)
        
        # ▼▼▼ FIX START: 检查 'deleted' 标志 ▼▼▼
        result_data = json.loads(delete_result.model_dump_json())
        if not result_data.get('deleted'):
            # 从智谱AI的响应中提取具体的错误信息
            error_msg_from_zhipu = result_data.get('error', 'Unknown error from provider.')
            # 返回一个明确的失败响应
            return create_response(error=f"删除文件失败: {error_msg_from_zhipu}", status_code=500)
        # ▲▲▲ FIX END ▲▲▲

        return create_response(data=result_data)
        
    except Exception as e:
        print(f"File deletion failed: {traceback.format_exc()}")
        # 将异常信息包装成更具体的错误
        error_message = f"Failed to delete file: {str(e)}"
        # 查找原始的API错误信息
        if hasattr(e, 'response'):
             try:
                 error_detail = e.response.json()
                 error_message = f"Failed to delete file: {error_detail.get('error', {}).get('message', str(e))}"
             except:
                 pass # Keep original error message
        return create_response(error=error_message, status_code=500)

@app.route('/api/files/<string:file_id>/content', methods=['GET'])
@login_required
def get_file_content(file_id):
    client, error_response = get_client_from_header()
    if error_response:
        return error_response

    try:
        # 注意: 官方文档说此接口只支持 batch 和 file-extract
        # SDK 会自动处理 stream=True/False，并返回一个包含 .content 属性的对象
        file_content_obj = client.files.content(file_id=file_id)
        return Response(file_content_obj.content, mimetype='application/octet-stream')
    except Exception as e:
        print(f"Get file content failed: {traceback.format_exc()}")
        # 尝试返回JSON错误
        return create_response(error=f"Failed to get file content: {e}", status_code=500)

# --- 新增：专利查询 API ---
def get_patent_data_reliable(patent_id):
    """
    直接调用 Google Patents 的后台 JSON 接口
    """
    # 格式化 ID，确保没有空格
    patent_id = patent_id.strip()
    
    # Google Patents 内部数据接口
    # 语言设为 en 确保能拿到英文翻译
    url = f"https://patents.google.com/xhr/result?id={patent_id}/en"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
    }

    try:
        response = requests.get(url, headers=headers, timeout=15)
        if response.status_code != 200:
            return None
        
        raw_data = response.json()
        
        # 提取核心信息 (Google 的 JSON 结构比较深)
        # 注意：不同专利返回的字段可能略有不同，需要用 .get 安全获取
        recap = raw_data.get('recap', {})
        
        extracted_data = {
            "patent_number": patent_id,
            "title": recap.get('title', "无标题"),
            "abstract": recap.get('abstract', "无摘要"),
            "inventors": [i.get('name') for i in recap.get('inventors', []) if i.get('name')],
            "application_date": recap.get('application_date', "无信息"),
            "publication_date": recap.get('publication_date', "无信息"),
            # 获取全文（用于喂给 LLM）
            "claims": raw_data.get('claims', "无权利要求信息"),
            "description": raw_data.get('description', "无说明书信息")
        }
        return extracted_data
        
    except Exception as e:
        print(f"爬取专利 {patent_id} 失败: {str(e)}")
        return None

@app.route('/api/patent/search', methods=['POST'])
def search_patents():
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        req_data = request.get_json()
        patent_numbers = req_data.get('patent_numbers', [])
        
        if not isinstance(patent_numbers, list):
            # 如果是字符串，按换行符或空格分割
            if isinstance(patent_numbers, str):
                patent_numbers = patent_numbers.replace('\n', ' ').split()
            else:
                return create_response(error="patent_numbers must be a list or string", status_code=400)
        
        # 限制最多50个专利号
        if len(patent_numbers) > 50:
            return create_response(error="Maximum 50 patent numbers allowed", status_code=400)
        
        # 去重
        patent_numbers = list(set(patent_numbers))
        
        results = []
        scraper = scraper_class()
        
        for patent_number in patent_numbers:
            try:
                # 直接使用requests库发送请求，添加更完整的请求头
                import requests
                url = f'https://patents.google.com/patent/{patent_number}'
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1'
                }
                
                # 发送请求，增加超时设置
                response = requests.get(url, headers=headers, timeout=10)
                response.raise_for_status()
                
                # 使用BeautifulSoup解析HTML
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(response.text, 'lxml')
                
                # 直接解析HTML，适应Google Patents的最新页面结构
                patent_data = {}
                
                # 1. 尝试解析JSON-LD数据，这是获取结构化数据的更可靠方式
                try:
                    json_ld = soup.find('script', type='application/ld+json')
                    if json_ld:
                        import json
                        ld_data = json.loads(json_ld.string)
                        
                        # 从JSON-LD中获取基本信息
                        if '@graph' in ld_data:
                            for item in ld_data['@graph']:
                                if item.get('@type') == 'Patent':
                                    # 获取标题
                                    patent_data['title'] = item.get('name', '')
                                    # 获取摘要
                                    patent_data['abstract'] = item.get('abstract', '')
                                    # 获取发明人
                                    patent_data['inventors'] = [inv.get('name', '') for inv in item.get('inventor', [])]
                                    # 获取申请日期
                                    patent_data['application_date'] = item.get('filingDate', '')
                                    # 获取公开日期
                                    patent_data['publication_date'] = item.get('publicationDate', '')
                                    # 获取受让人
                                    patent_data['assignees'] = [ass.get('name', '') for ass in item.get('assignee', [])]
                                    break
                except Exception as e:
                    print(f"Error parsing JSON-LD for {patent_number}: {e}")
                
                # 2. 如果JSON-LD解析失败，尝试从HTML中提取
                if not patent_data.get('title'):
                    try:
                        title = soup.find('h1')
                        if title:
                            patent_data['title'] = title.get_text().strip()
                        else:
                            patent_data['title'] = ''
                    except Exception as e:
                        patent_data['title'] = ''
                
                if not patent_data.get('abstract'):
                    try:
                        # 尝试多种方式获取摘要
                        abstract = None
                        # 方式1：查找id为abstract的元素
                        abstract = soup.find('div', id='abstract')
                        if not abstract:
                            # 方式2：查找class为abstract的元素
                            abstract = soup.find('div', class_='abstract')
                        if not abstract:
                            # 方式3：查找section元素，包含abstract
                            abstract = soup.find('section', string=lambda text: text and 'Abstract' in text)
                        if abstract:
                            patent_data['abstract'] = abstract.get_text().strip()
                        else:
                            patent_data['abstract'] = ''
                    except Exception as e:
                        patent_data['abstract'] = ''
                
                if not patent_data.get('inventors'):
                    try:
                        inventors = []
                        # 尝试多种方式获取发明人
                        inventor_elements = None
                        # 方式1：查找id为inventor的元素
                        inventor_section = soup.find('div', id='inventor')
                        if inventor_section:
                            inventor_elements = inventor_section.find_all('span')
                        if not inventor_elements:
                            # 方式2：查找class为inventor的元素
                            inventor_elements = soup.find_all('div', class_='inventor')
                        if inventor_elements:
                            for inv in inventor_elements:
                                inventor_name = inv.get_text().strip()
                                if inventor_name and inventor_name != 'Inventors':
                                    inventors.append(inventor_name)
                        patent_data['inventors'] = inventors
                    except Exception as e:
                        patent_data['inventors'] = []
                
                if not patent_data.get('application_date'):
                    try:
                        # 尝试多种方式获取申请日期
                        application_date = None
                        # 方式1：查找id为applicationDate的元素
                        application_date = soup.find('div', id='applicationDate')
                        if not application_date:
                            # 方式2：查找包含"Application Date"的元素
                            application_date = soup.find('div', string=lambda text: text and 'Application Date' in text)
                            if application_date:
                                application_date = application_date.find_next_sibling()
                        if application_date:
                            patent_data['application_date'] = application_date.get_text().strip()
                        else:
                            patent_data['application_date'] = ''
                    except Exception as e:
                        patent_data['application_date'] = ''
                
                # 尝试获取权利要求
                try:
                    claims = []
                    # 查找权利要求部分
                    claims_section = soup.find('div', id='claims')
                    if claims_section:
                        # 查找所有权利要求项
                        claim_elements = claims_section.find_all('div', class_='claim')
                        if not claim_elements:
                            # 尝试查找所有段落
                            claim_elements = claims_section.find_all('p')
                        for claim in claim_elements:
                            claim_text = claim.get_text().strip()
                            if claim_text and len(claim_text) > 10:  # 过滤太短的文本
                                claims.append(claim_text)
                    patent_data['claims'] = claims
                except Exception as e:
                    patent_data['claims'] = []
                
                # 尝试获取说明书内容
                try:
                    description = ''
                    # 查找说明书部分
                    description_section = soup.find('div', id='description')
                    if description_section:
                        # 查找所有段落
                        para_elements = description_section.find_all('p')
                        if para_elements:
                            description = ' '.join([para.get_text().strip() for para in para_elements[:10]])  # 只获取前10段
                    patent_data['description'] = description
                except Exception as e:
                    patent_data['description'] = ''
                
                # 尝试获取附图（默认只获取首张）
                try:
                    drawings = []
                    
                    # 从JSON-LD中获取附图（如果有）
                    if 'drawings' not in patent_data and json_ld:
                        if '@graph' in ld_data:
                            for item in ld_data['@graph']:
                                if item.get('@type') == 'Patent' and 'image' in item:
                                    images = item.get('image', [])
                                    image_list = []
                                    
                                    if isinstance(images, list):
                                        for img in images:
                                            if isinstance(img, str) and img:
                                                image_list.append(img)
                                            elif isinstance(img, dict) and img.get('url'):
                                                image_list.append(img.get('url'))
                                    elif isinstance(images, str):
                                        image_list.append(images)
                                    elif isinstance(images, dict) and images.get('url'):
                                        image_list.append(images.get('url'))
                                    
                                    if image_list:
                                        drawings.append(image_list[0])  # 只获取首张
                    
                    # 如果JSON-LD中没有，从HTML中获取
                    if not drawings:
                        img_tags = soup.find_all('img')
                        seen_images = set()
                        
                        for img in img_tags:
                            img_src = img.get('src', '')
                            if img_src:
                                # 处理相对URL
                                if img_src.startswith('//'):
                                    img_src = f'https:{img_src}'
                                elif img_src.startswith('/'):
                                    img_src = f'https://patents.google.com{img_src}'
                                elif not img_src.startswith('http'):
                                    continue
                                
                                # 检查是否是专利附图（过滤掉图标和Logo）
                                if 'patentimages' in img_src or 'google.com/patents' in img_src or len(img_src) > 50:
                                    if img_src not in seen_images:
                                        seen_images.add(img_src)
                                        drawings.append(img_src)  # 只获取首张
                                        break  # 找到首张就停止
                    
                    patent_data['drawings'] = drawings
                except Exception as e:
                    print(f"Error extracting drawings for {patent_number}: {e}")
                    patent_data['drawings'] = []
                
                # 添加专利号和URL
                patent_data['patent_number'] = patent_number
                patent_data['url'] = url
                
                results.append({
                    'patent_number': patent_number,
                    'success': True,
                    'data': patent_data,
                    'url': url
                })
                
                # 添加延迟，避免请求过快
                time.sleep(2)
            except requests.exceptions.RequestException as e:
                results.append({
                    'patent_number': patent_number,
                    'success': False,
                    'error': f"Request error: {str(e)}"
                })
            except Exception as e:
                import traceback
                print(f"Error processing {patent_number}: {traceback.format_exc()}")
                results.append({
                    'patent_number': patent_number,
                    'success': False,
                    'error': str(e)
                })
        
        return create_response(data=results)
    except Exception as e:
        print(f"Error in search_patents: {traceback.format_exc()}")
        return create_response(error=f"Failed to search patents: {str(e)}", status_code=500)

# --- 新增：获取专利完整附图 API ---  
@app.route('/api/patent/drawings', methods=['POST'])
def get_patent_drawings():
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        req_data = request.get_json()
        patent_number = req_data.get('patent_number')
        
        if not patent_number:
            return create_response(error="patent_number is required", status_code=400)
        
        # 使用爬虫获取完整附图
        from backend.scraper.simple_scraper import SimplePatentScraper
        scraper = SimplePatentScraper()
        result = scraper.scrape_patent(patent_number, crawl_full_drawings=True)
        scraper.close()
        
        if result.success and result.data:
            return create_response(data={
                'patent_number': patent_number,
                'drawings': result.data.drawings,
                'total_drawings': len(result.data.drawings)
            })
        else:
            return create_response(error=f"Failed to get drawings: {result.error}", status_code=500)
    
    except Exception as e:
        import traceback
        print(f"Error in get_patent_drawings: {traceback.format_exc()}")
        return create_response(error=f"Failed to get drawings: {str(e)}", status_code=500)

# --- 新增：专利附图标记功能 API ---  
@app.route('/api/drawing-marker/process', methods=['POST'])
def process_drawing_marker():
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        req_data = request.get_json()
        drawings = req_data.get('drawings')
        specification = req_data.get('specification')
        
        if not drawings or not isinstance(drawings, list) or len(drawings) == 0:
            return create_response(error="drawings is required and must be a non-empty list", status_code=400)
        
        if not specification or not isinstance(specification, str) or specification.strip() == '':
            return create_response(error="specification is required and must be a non-empty string", status_code=400)
        
        # 导入OCR和图像处理模块
        import cv2
        import numpy as np
        from PIL import Image
        import pytesseract
        import re
        
        # 处理结果数据
        processed_results = []
        total_numbers = 0
        
        # 1. 解析说明书，提取附图标记和部件名称
        def extract_reference_markers(spec_text):
            # 正则表达式匹配附图标记，如"1. 底座"、"2. 旋转臂"等
            pattern = r'([0-9]+)\s*[.、]\s*([^。；，,;\n]+)'
            matches = re.findall(pattern, spec_text)
            reference_map = {}
            for match in matches:
                number = match[0]
                name = match[1].strip()
                reference_map[number] = name
            return reference_map
        
        reference_map = extract_reference_markers(specification)
        
        # 2. 处理每张图片
        for drawing in drawings:
            try:
                # 解析base64图片数据
                import base64
                image_data = base64.b64decode(drawing['data'])
                image = Image.open(BytesIO(image_data))
                
                # 转换为OpenCV格式
                img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
                
                # 图像预处理
                # 转换为灰度图
                gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
                # 高斯模糊去噪
                blurred = cv2.GaussianBlur(gray, (5, 5), 0)
                # 二值化处理
                _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
                
                # 形态学操作，去除小噪点
                kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
                processed = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel, iterations=2)
                processed = cv2.morphologyEx(processed, cv2.MORPH_CLOSE, kernel, iterations=2)
                
                # 使用Tesseract进行OCR识别
                # 配置Tesseract只识别数字
                custom_config = r'--oem 3 --psm 6 outputbase digits'
                ocr_result = pytesseract.image_to_data(processed, output_type=pytesseract.Output.DICT, config=custom_config)
                
                # 提取识别结果中的数字和坐标
                detected_numbers = []
                for i in range(len(ocr_result['text'])):
                    text = ocr_result['text'][i].strip()
                    if text and text.isdigit() and int(ocr_result['conf'][i]) > 60:  # 只保留置信度大于60的数字
                        x = ocr_result['left'][i]
                        y = ocr_result['top'][i]
                        w = ocr_result['width'][i]
                        h = ocr_result['height'][i]
                        
                        # 计算数字的中心点
                        center_x = x + w // 2
                        center_y = y + h // 2
                        
                        # 检查是否在reference_map中存在
                        if text in reference_map:
                            detected_numbers.append({
                                'number': text,
                                'name': reference_map[text],
                                'x': center_x,
                                'y': center_y,
                                'width': w,
                                'height': h,
                                'confidence': ocr_result['conf'][i]
                            })
                            total_numbers += 1
                
                # 保存处理结果
                processed_results.append({
                    'name': drawing['name'],
                    'type': drawing['type'],
                    'size': drawing['size'],
                    'detected_numbers': detected_numbers
                })
                
            except Exception as e:
                print(f"Error processing drawing {drawing['name']}: {traceback.format_exc()}")
                processed_results.append({
                    'name': drawing['name'],
                    'type': drawing['type'],
                    'size': drawing['size'],
                    'detected_numbers': [],
                    'error': str(e)
                })
        
        # 计算匹配率
        match_rate = 0
        if len(reference_map) > 0:
            match_rate = round((total_numbers / len(reference_map)) * 100, 2)
        
        # 返回处理结果
        return create_response(data={
            'success': True,
            'drawings': processed_results,
            'reference_map': reference_map,
            'total_numbers': total_numbers,
            'match_rate': match_rate,
            'message': f"成功处理 {len(drawings)} 张图片，识别出 {total_numbers} 个数字序号，匹配率 {match_rate}%"
        })
    
    except Exception as e:
        import traceback
        print(f"Error in process_drawing_marker: {traceback.format_exc()}")
        return create_response(error=f"处理失败: {str(e)}", status_code=500)

# --- 新增：专利解读 API ---  
@app.route('/api/patent/analyze', methods=['POST'])
def analyze_patent():
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    client, error_response = get_client_from_header()
    if error_response:
        return error_response
    
    try:
        req_data = request.get_json()
        patent_data = req_data.get('patent_data')
        model = req_data.get('model', 'glm-4-flash')
        temperature = req_data.get('temperature', 0.4)
        
        if not patent_data:
            return create_response(error="patent_data is required", status_code=400)
        
        # 构建用于大模型分析的prompt
        prompt = f"请详细解读以下专利信息：\n\n"
        prompt += f"专利号: {patent_data.get('patent_number', 'N/A')}\n"
        prompt += f"标题: {patent_data.get('title', 'N/A')}\n"
        prompt += f"摘要: {patent_data.get('abstract', 'N/A')}\n"
        prompt += f"发明人: {', '.join(patent_data.get('inventors', []))}\n"
        prompt += f"受让人: {', '.join(patent_data.get('assignees', []))}\n"
        prompt += f"申请日期: {patent_data.get('application_date', 'N/A')}\n"
        prompt += f"公开日期: {patent_data.get('publication_date', 'N/A')}\n"
        prompt += f"权利要求: {patent_data.get('claims', 'N/A')[:500]}...\n" if patent_data.get('claims') else "权利要求: N/A\n"
        
        messages = [
            {"role": "system", "content": "你是一位专业的专利分析师，请详细解读专利的技术内容、创新点和应用价值。"},
            {"role": "user", "content": prompt}
        ]
        
        response_from_sdk = client.chat.completions.create(
            model=model,
            messages=messages,
            stream=False,
            temperature=temperature
        )
        
        json_string = response_from_sdk.model_dump_json()
        clean_dict = json.loads(json_string)
        
        return jsonify(clean_dict)
    except Exception as e:
        print(f"Error in analyze_patent: {traceback.format_exc()}")
        error_payload = {"error": {"message": f"专利解读失败: {str(e)}", "type": "backend_exception"}}
        return jsonify(error_payload), 500

# --- 新增：专利权利要求处理 API ---
from werkzeug.utils import secure_filename
from patent_claims_processor.services import ProcessingService, ExportService

# 配置上传文件夹
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
ALLOWED_EXTENSIONS = {'xlsx', 'xls'}

# 确保上传文件夹存在
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    """检查文件扩展名是否允许"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# 存储处理任务状态
processing_tasks = {}

@app.route('/api/claims/upload', methods=['POST'])
@login_required
def upload_claims_file():
    """
    上传包含权利要求的Excel文件
    
    需求 1.1: 验证文件格式并成功读取文件内容
    """
    try:
        # 检查是否有文件
        if 'file' not in request.files:
            return create_response(error="未找到上传的文件", status_code=400)
        
        file = request.files['file']
        
        # 检查文件名
        if file.filename == '':
            return create_response(error="未选择文件", status_code=400)
        
        # 验证文件类型
        if not allowed_file(file.filename):
            return create_response(
                error="不支持的文件格式，请上传.xlsx或.xls文件",
                status_code=400
            )
        
        # 保存文件
        # 处理中文文件名：先提取扩展名，再生成安全文件名
        original_filename = file.filename
        file_ext = os.path.splitext(original_filename)[1].lower()  # 获取扩展名（如 .xlsx）
        
        # 使用secure_filename处理文件名
        safe_name = secure_filename(original_filename)
        
        # 如果secure_filename删除了所有字符（纯中文文件名），使用时间戳作为文件名
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        if not safe_name or safe_name == file_ext.lstrip('.'):
            unique_filename = f"{timestamp}{file_ext}"
        else:
            # 确保文件名有正确的扩展名
            if not safe_name.endswith(file_ext):
                safe_name = os.path.splitext(safe_name)[0] + file_ext
            unique_filename = f"{timestamp}_{safe_name}"
        
        file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        file.save(file_path)
        
        # 验证Excel文件
        from patent_claims_processor.processors import ExcelProcessor
        excel_processor = ExcelProcessor()
        
        if not excel_processor.validate_excel_file(file_path):
            os.remove(file_path)
            return create_response(
                error="无效的Excel文件格式",
                status_code=400
            )
        
        # 获取工作表和列信息
        try:
            sheet_names = excel_processor.get_sheet_names(file_path)
            df = excel_processor.read_excel_file(file_path)
            columns = list(df.columns)
            
            return create_response(data={
                'file_id': unique_filename,
                'file_path': file_path,
                'original_filename': original_filename,  # 使用原始文件名
                'sheet_names': sheet_names,
                'columns': columns,
                'message': '文件上传成功'
            })
        except Exception as e:
            os.remove(file_path)
            return create_response(
                error=f"读取Excel文件失败: {str(e)}",
                status_code=400
            )
            
    except Exception as e:
        print(f"Error in upload_claims_file: {traceback.format_exc()}")
        return create_response(
            error=f"文件上传失败: {str(e)}",
            status_code=500
        )

@app.route('/api/claims/columns', methods=['POST'])
@login_required
def get_claims_columns():
    """
    获取指定工作表的列信息
    
    需求 1.3: 允许用户选择列
    """
    try:
        req_data = request.get_json()
        
        file_path = req_data.get('file_path')
        sheet_name = req_data.get('sheet_name')
        
        if not file_path:
            return create_response(
                error="缺少必需参数: file_path",
                status_code=400
            )
        
        if not os.path.exists(file_path):
            return create_response(
                error="文件不存在",
                status_code=404
            )
        
        # 读取指定工作表的列
        from patent_claims_processor.processors import ExcelProcessor
        excel_processor = ExcelProcessor()
        
        df = excel_processor.read_excel_file(file_path, sheet_name=sheet_name)
        columns = list(df.columns)
        
        return create_response(data={
            'columns': columns,
            'sheet_name': sheet_name,
            'message': '列信息获取成功'
        })
        
    except Exception as e:
        print(f"Error in get_claims_columns: {traceback.format_exc()}")
        return create_response(
            error=f"获取列信息失败: {str(e)}",
            status_code=500
        )

@app.route('/api/claims/process', methods=['POST'])
@login_required
def process_claims():
    """
    处理权利要求文件
    
    需求 1.2, 1.3: 允许用户选择工作表和列
    需求 2.1-2.4: 多语言处理
    需求 3.1-3.4: 权利要求解析和提取
    """
    try:
        req_data = request.get_json()
        
        file_id = req_data.get('file_id')
        column_name = req_data.get('column_name')
        sheet_name = req_data.get('sheet_name')
        
        if not file_id or not column_name:
            return create_response(
                error="缺少必需参数: file_id 和 column_name",
                status_code=400
            )
        
        # 构建文件路径
        file_path = os.path.join(UPLOAD_FOLDER, file_id)
        
        if not os.path.exists(file_path):
            return create_response(
                error="文件不存在",
                status_code=404
            )
        
        # 创建任务ID
        task_id = f"task_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{os.urandom(4).hex()}"
        
        # 初始化任务状态
        processing_tasks[task_id] = {
            'status': 'processing',
            'progress': 0,
            'message': '正在处理...',
            'result': None,
            'error': None
        }
        
        # 在后台线程中处理文件
        import threading
        
        def process_in_background():
            try:
                # 创建处理服务
                processing_service = ProcessingService()
                
                # 处理Excel文件
                result = processing_service.process_excel_file(
                    file_path=file_path,
                    column_name=column_name,
                    sheet_name=sheet_name
                )
                
                # 更新任务状态
                processing_tasks[task_id]['status'] = 'completed'
                processing_tasks[task_id]['progress'] = 100
                processing_tasks[task_id]['message'] = '处理完成'
                processing_tasks[task_id]['result'] = result
                
            except Exception as e:
                print(f"Error in background processing: {traceback.format_exc()}")
                processing_tasks[task_id]['status'] = 'failed'
                processing_tasks[task_id]['error'] = str(e)
                processing_tasks[task_id]['message'] = f'处理失败: {str(e)}'
        
        thread = threading.Thread(target=process_in_background)
        thread.daemon = True
        thread.start()
        
        return create_response(data={
            'task_id': task_id,
            'message': '处理任务已启动'
        })
        
    except Exception as e:
        print(f"Error in process_claims: {traceback.format_exc()}")
        return create_response(
            error=f"启动处理任务失败: {str(e)}",
            status_code=500
        )

@app.route('/api/claims/status/<task_id>', methods=['GET'])
@login_required
def get_processing_status(task_id):
    """
    获取处理任务状态
    
    需求 7.3: 提供进度反馈
    """
    try:
        if task_id not in processing_tasks:
            return create_response(
                error="任务不存在",
                status_code=404
            )
        
        task = processing_tasks[task_id]
        
        response_data = {
            'task_id': task_id,
            'status': task['status'],
            'progress': task['progress'],
            'message': task['message']
        }
        
        # 如果处理完成，添加结果摘要
        if task['status'] == 'completed' and task['result']:
            result = task['result']
            response_data['summary'] = {
                'total_cells_processed': result.total_cells_processed,
                'total_claims_extracted': result.total_claims_extracted,
                'independent_claims_count': result.independent_claims_count,
                'dependent_claims_count': result.dependent_claims_count,
                'language_distribution': result.language_distribution,
                'error_count': len(result.processing_errors)
            }
        
        # 如果处理失败，添加错误信息
        if task['status'] == 'failed':
            response_data['error'] = task['error']
        
        return create_response(data=response_data)
        
    except Exception as e:
        print(f"Error in get_processing_status: {traceback.format_exc()}")
        return create_response(
            error=f"获取任务状态失败: {str(e)}",
            status_code=500
        )

@app.route('/api/claims/result/<task_id>', methods=['GET'])

# --- 新增：用户管理 API ---  
@app.route('/api/users', methods=['GET'])
def get_users():
    """
    Get all users.
    """
    try:
        users = load_users()
        users_list = [{'username': username, 'password_hash': password_hash[:30] + '...'} for username, password_hash in users.items()]
        return create_response(data={'users': users_list})
    except Exception as e:
        print(f"Error in get_users: {traceback.format_exc()}")
        return create_response(error=f"获取用户列表失败: {str(e)}", status_code=500)

@app.route('/api/users', methods=['POST'])
def add_user():
    """
    Add a new user.
    """
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return create_response(error="用户名和密码不能为空", status_code=400)
        
        users = load_users()
        from werkzeug.security import generate_password_hash
        users[username] = generate_password_hash(password)
        
        with open(USERS_FILE, 'w') as f:
            json.dump(users, f, indent=4)
        
        return create_response(data={'message': f'用户 {username} 添加成功'})
    except Exception as e:
        print(f"Error in add_user: {traceback.format_exc()}")
        return create_response(error=f"添加用户失败: {str(e)}", status_code=500)

@app.route('/api/users/<username>', methods=['DELETE'])
def delete_user(username):
    """
    Delete a user.
    """
    try:
        users = load_users()
        
        if username not in users:
            return create_response(error=f'用户 {username} 不存在', status_code=404)
        
        del users[username]
        
        with open(USERS_FILE, 'w') as f:
            json.dump(users, f, indent=4)
        
        return create_response(data={'message': f'用户 {username} 删除成功'})
    except Exception as e:
        print(f"Error in delete_user: {traceback.format_exc()}")
        return create_response(error=f"删除用户失败: {str(e)}", status_code=500)

@app.route('/api/claims/result/<task_id>', methods=['GET'])
@login_required
def get_processing_result(task_id):
    """
    获取处理结果详情
    
    需求 6.1, 6.2: 生成包含所有权利要求信息的结构化数据
    """
    try:
        if task_id not in processing_tasks:
            return create_response(
                error="任务不存在",
                status_code=404
            )
        
        task = processing_tasks[task_id]
        
        if task['status'] != 'completed':
            return create_response(
                error=f"任务尚未完成，当前状态: {task['status']}",
                status_code=400
            )
        
        result = task['result']
        
        # 构建详细结果
        claims_list = []
        for claim in result.claims_data:
            claims_list.append({
                'claim_number': claim.claim_number,
                'claim_type': claim.claim_type,
                'claim_text': claim.claim_text,
                'language': claim.language,
                'referenced_claims': claim.referenced_claims,
                'original_text': claim.original_text,
                'confidence_score': claim.confidence_score
            })
        
        errors_list = []
        for error in result.processing_errors:
            errors_list.append({
                'error_type': error.error_type,
                'cell_index': error.cell_index,
                'error_message': error.error_message,
                'suggested_action': error.suggested_action,
                'severity': error.severity
            })
        
        response_data = {
            'summary': {
                'total_cells_processed': result.total_cells_processed,
                'total_claims_extracted': result.total_claims_extracted,
                'independent_claims_count': result.independent_claims_count,
                'dependent_claims_count': result.dependent_claims_count,
                'language_distribution': result.language_distribution,
                'error_count': len(result.processing_errors)
            },
            'claims': claims_list,
            'errors': errors_list
        }
        
        return create_response(data=response_data)
        
    except Exception as e:
        print(f"Error in get_processing_result: {traceback.format_exc()}")
        return create_response(
            error=f"获取处理结果失败: {str(e)}",
            status_code=500
        )

@app.route('/api/claims/export/<task_id>', methods=['POST'])
@login_required
def export_claims_result(task_id):
    """
    导出处理结果
    
    需求 6.3: 支持将结果导出为Excel或JSON格式
    """
    try:
        if task_id not in processing_tasks:
            return create_response(
                error="任务不存在",
                status_code=404
            )
        
        task = processing_tasks[task_id]
        
        if task['status'] != 'completed':
            return create_response(
                error=f"任务尚未完成，当前状态: {task['status']}",
                status_code=400
            )
        
        req_data = request.get_json()
        export_format = req_data.get('format', 'excel')  # 'excel' or 'json'
        
        result = task['result']
        
        # 创建导出服务
        export_service = ExportService()
        
        # 根据格式导出
        if export_format == 'json':
            output_path = export_service.export_to_json(result)
            mimetype = 'application/json'
        elif export_format == 'excel':
            output_path = export_service.export_to_excel(result)
            mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        else:
            return create_response(
                error="不支持的导出格式，请使用 'excel' 或 'json'",
                status_code=400
            )
        
        # 读取文件内容
        with open(output_path, 'rb') as f:
            file_content = f.read()
        
        # 获取文件名
        filename = os.path.basename(output_path)
        
        # 清理临时文件
        try:
            os.remove(output_path)
        except:
            pass
        
        # 返回文件
        response = Response(file_content, mimetype=mimetype)
        response.headers['Content-Disposition'] = f'attachment; filename={filename}'
        return response
        
    except Exception as e:
        print(f"Error in export_claims_result: {traceback.format_exc()}")
        return create_response(
            error=f"导出结果失败: {str(e)}",
            status_code=500
        )

@app.route('/api/claims/report/<task_id>', methods=['GET'])
@login_required
def get_processing_report(task_id):
    """
    获取处理报告
    
    需求 6.4: 生成详细的错误报告和处理统计信息
    """
    try:
        if task_id not in processing_tasks:
            return create_response(
                error="任务不存在",
                status_code=404
            )
        
        task = processing_tasks[task_id]
        
        if task['status'] != 'completed':
            return create_response(
                error=f"任务尚未完成，当前状态: {task['status']}",
                status_code=400
            )
        
        result = task['result']
        
        # 创建导出服务
        export_service = ExportService()
        
        # 生成报告文本
        report_text = export_service.generate_processing_report(result)
        
        return create_response(data={
            'report': report_text
        })
        
    except Exception as e:
        print(f"Error in get_processing_report: {traceback.format_exc()}")
        return create_response(
            error=f"生成报告失败: {str(e)}",
            status_code=500
        )

# --- Landing页面图片管理API ---

@app.route('/api/landing/images/list', methods=['GET'])
def list_landing_images():
    """扫描并返回frontend/images目录下的所有图片文件"""
    try:
        images_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend', 'images')
        
        if not os.path.exists(images_dir):
            return create_response(data={'images': [], 'gifs': []})
        
        allowed_extensions = {'.png', '.jpg', '.jpeg', '.webp', '.gif'}
        images = []
        
        for filename in os.listdir(images_dir):
            ext = os.path.splitext(filename)[1].lower()
            if ext in allowed_extensions:
                file_path = os.path.join(images_dir, filename)
                file_stat = os.stat(file_path)
                images.append({
                    'name': filename,
                    'path': f'/frontend/images/{filename}',
                    'size': file_stat.st_size,
                    'modified': datetime.fromtimestamp(file_stat.st_mtime).isoformat(),
                    'type': 'gif' if ext == '.gif' else 'image'
                })
        
        images.sort(key=lambda x: x['modified'], reverse=True)
        
        return create_response(data={'images': images})
        
    except Exception as e:
        print(f"Error listing images: {traceback.format_exc()}")
        return create_response(error=f"获取图片列表失败: {str(e)}", status_code=500)


@app.route('/api/landing/images/upload', methods=['POST'])
def upload_landing_image():
    """上传图片到frontend/images目录"""
    try:
        if 'file' not in request.files:
            return create_response(error="没有找到上传的文件", status_code=400)
        
        file = request.files['file']
        
        if file.filename == '':
            return create_response(error="没有选择文件", status_code=400)
        
        allowed_extensions = {'.png', '.jpg', '.jpeg', '.webp', '.gif'}
        ext = os.path.splitext(file.filename)[1].lower()
        
        if ext not in allowed_extensions:
            return create_response(error=f"不支持的文件格式: {ext}", status_code=400)
        
        from werkzeug.utils import secure_filename
        filename = secure_filename(file.filename)
        
        if not filename:
            filename = f"image_{int(time.time())}{ext}"
        
        images_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend', 'images')
        
        if not os.path.exists(images_dir):
            os.makedirs(images_dir)
        
        file_path = os.path.join(images_dir, filename)
        
        counter = 1
        original_name = os.path.splitext(filename)[0]
        while os.path.exists(file_path):
            filename = f"{original_name}_{counter}{ext}"
            file_path = os.path.join(images_dir, filename)
            counter += 1
        
        file.save(file_path)
        
        return create_response(data={
            'name': filename,
            'path': f'/frontend/images/{filename}',
            'message': '上传成功'
        })
        
    except Exception as e:
        print(f"Error uploading image: {traceback.format_exc()}")
        return create_response(error=f"上传失败: {str(e)}", status_code=500)


@app.route('/api/landing/gifs/list', methods=['GET'])
def list_landing_gifs():
    """扫描并返回frontend/gifs目录下的所有GIF文件"""
    try:
        gifs_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend', 'gifs')
        
        if not os.path.exists(gifs_dir):
            return create_response(data={'gifs': []})
        
        gifs = []
        
        for filename in os.listdir(gifs_dir):
            ext = os.path.splitext(filename)[1].lower()
            if ext == '.gif':
                file_path = os.path.join(gifs_dir, filename)
                file_stat = os.stat(file_path)
                gifs.append({
                    'name': filename,
                    'path': f'/frontend/gifs/{filename}',
                    'size': file_stat.st_size,
                    'modified': datetime.fromtimestamp(file_stat.st_mtime).isoformat()
                })
        
        gifs.sort(key=lambda x: x['modified'], reverse=True)
        
        return create_response(data={'gifs': gifs})
        
    except Exception as e:
        print(f"Error listing gifs: {traceback.format_exc()}")
        return create_response(error=f"获取GIF列表失败: {str(e)}", status_code=500)


@app.route('/api/landing/gifs/upload', methods=['POST'])
def upload_landing_gif():
    """上传GIF到frontend/gifs目录"""
    try:
        if 'file' not in request.files:
            return create_response(error="没有找到上传的文件", status_code=400)
        
        file = request.files['file']
        
        if file.filename == '':
            return create_response(error="没有选择文件", status_code=400)
        
        ext = os.path.splitext(file.filename)[1].lower()
        
        if ext != '.gif':
            return create_response(error="只支持GIF格式文件", status_code=400)
        
        from werkzeug.utils import secure_filename
        filename = secure_filename(file.filename)
        
        if not filename:
            filename = f"demo_{int(time.time())}.gif"
        
        gifs_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend', 'gifs')
        
        if not os.path.exists(gifs_dir):
            os.makedirs(gifs_dir)
        
        file_path = os.path.join(gifs_dir, filename)
        
        counter = 1
        original_name = os.path.splitext(filename)[0]
        while os.path.exists(file_path):
            filename = f"{original_name}_{counter}{ext}"
            file_path = os.path.join(gifs_dir, filename)
            counter += 1
        
        file.save(file_path)
        
        return create_response(data={
            'name': filename,
            'path': f'/frontend/gifs/{filename}',
            'message': '上传成功'
        })
        
    except Exception as e:
        print(f"Error uploading gif: {traceback.format_exc()}")
        return create_response(error=f"上传失败: {str(e)}", status_code=500)


# --- PDF OCR API路由 ---
@app.route('/api/pdf-ocr/parse', methods=['POST'])
def parse_pdf_ocr():
    """使用指定OCR引擎解析文档"""
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        from backend.routes.pdf_ocr import parse_document
        return parse_document()
    except Exception as e:
        print(f"Error in parse_pdf_ocr: {traceback.format_exc()}")
        return create_response(error=f"文档解析失败: {str(e)}", status_code=500)


@app.route('/api/pdf-ocr/engines', methods=['GET'])
def get_pdf_ocr_engines():
    """获取可用的OCR引擎列表"""
    try:
        from backend.routes.pdf_ocr import get_available_engines
        return get_available_engines()
    except Exception as e:
        print(f"Error getting OCR engines: {traceback.format_exc()}")
        return create_response(error=f"获取OCR引擎列表失败: {str(e)}", status_code=500)


# --- 启动前初始化 ---
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
