import os
import json
import traceback
import time
from io import BytesIO
from flask import Flask, request, jsonify, make_response, send_from_directory, Response, session, redirect, url_for, render_template_string
from flask_cors import CORS
from zhipuai import ZhipuAI
from datetime import timedelta
from werkzeug.security import check_password_hash
from functools import wraps
import psycopg2
import psycopg2.pool

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
    # 我们要生成 'serve_app' 这个视图函数对应的 URL (即 /app)
    # 当浏览器被重定向到 /app 时，Flask 会自动执行 @login_required 装饰器
    return redirect(url_for('serve_app'))


@app.route('/app')
@login_required
def serve_app():
    with open(os.path.join(static_folder_path, 'index.html'), 'r', encoding='utf-8') as f:
        html_content = f.read()
    username = session.get('user', '用户')
    user_actions_html = f"""
    <div class="user-actions">
        <span class="user-display">当前用户: <strong>{username}</strong></span>
        <a href="{url_for('logout')}" class="logout-btn">登出</a>
    </div>
    """
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
