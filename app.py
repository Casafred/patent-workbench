# app.py (v11.0 - Access Control)
import os
import json
import traceback
from io import BytesIO
from flask import Flask, request, jsonify, make_response, send_from_directory, Response, session, redirect, url_for, render_template_string
from flask_cors import CORS
from zhipuai import ZhipuAI
import time
from datetime import timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps

# --- 1. 新增：常量和配置 ---
# Render 持久化磁盘的挂载路径
DATA_DIR = '/var/data' 
USERS_FILE = os.path.join(DATA_DIR, 'users.json')

# --- 初始化 Flask 应用 ---
static_folder_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.')
app = Flask(__name__, static_folder=static_folder_path, static_url_path='')
CORS(app)

# --- 2. 新增：会话和安全配置 ---
# 从环境变量获取 SECRET_KEY，对于会话管理至关重要
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'dev-secret-key-for-local-testing-only')
# 设置会话有效期为6小时
app.permanent_session_lifetime = timedelta(hours=6)

# --- 3. 新增：用户数据管理辅助函数 ---
def load_users():
    """从 users.json 加载用户数据，如果文件不存在则返回空字典。"""
    if not os.path.exists(USERS_FILE):
        # 确保目录存在
        os.makedirs(DATA_DIR, exist_ok=True)
        return {}
    try:
        with open(USERS_FILE, 'r') as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return {}

def save_users(users_data):
    """将用户数据保存到 users.json。"""
    with open(USERS_FILE, 'w') as f:
        json.dump(users_data, f, indent=4)

# --- 4. 新增：访问控制装饰器 (Decorators) ---
def login_required(f):
    """检查用户是否登录的装饰器。"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    """检查是否为超级管理员会话的装饰器。"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('is_admin'):
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    return decorated_function

# --- 5. 新增：HTML 页面模板 ---
# 为了方便，我们将简单的HTML页面直接定义为字符串

LOGIN_PAGE_HTML = """
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>登录 - 专利分析智能工作台</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f0f2f5; margin: 0; }
        .login-container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); width: 320px; text-align: center; }
        h1 { margin-bottom: 20px; color: #333; }
        .error { color: #e74c3c; margin-bottom: 15px; }
        input { width: 100%; padding: 12px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
        button { width: 100%; padding: 12px; background-color: #22C55E; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; font-weight: bold; }
        button:hover { background-color: #16A34A; }
        .admin-link { margin-top: 20px; font-size: 14px; }
        .admin-link a { color: #555; text-decoration: none; }
        .admin-link a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="login-container">
        <h1>请登录</h1>
        {% if error %}
            <p class="error">{{ error }}</p>
        {% endif %}
        <form method="post">
            <input type="text" name="username" placeholder="用户名" required>
            <input type="password" name="password" placeholder="密码" required>
            <button type="submit">登 录</button>
        </form>
        <div class="admin-link">
            <a href="{{ url_for('admin_login') }}">管理员入口</a>
        </div>
    </div>
</body>
</html>
"""

ADMIN_LOGIN_PAGE_HTML = """
<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><title>管理员登录</title>
<style>
    body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f0f2f5; margin: 0; }
    .login-container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); width: 400px; text-align: left; }
    h1 { text-align: center; margin-bottom: 25px; color: #333; }
    .error { color: #e74c3c; margin-bottom: 15px; text-align: center; }
    label { font-weight: bold; display: block; margin-bottom: 8px; color: #555; }
    input { width: 100%; padding: 12px; margin-bottom: 20px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
    button { width: 100%; padding: 12px; background-color: #f39c12; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; font-weight: bold; }
    button:hover { background-color: #e67e22; }
    .question-box { background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin-bottom: 20px; border-left: 4px solid #f39c12; }
</style>
</head><body>
<div class="login-container">
    <h1>超级管理员验证</h1>
    {% if error %}<p class="error">{{ error }}</p>{% endif %}
    <form method="post">
        <label>安全问题:</label>
        <div class="question-box">{{ question }}</div>
        <label for="answer">你的答案:</label>
        <input type="text" id="answer" name="answer" required>
        <label for="password">超级管理员密码:</label>
        <input type="password" id="password" name="password" required>
        <button type="submit">进入管理后台</button>
    </form>
</div>
</body></html>
"""

MANAGE_USERS_PAGE_HTML = """
<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><title>用户管理</title>
<style>
    body { font-family: sans-serif; background-color: #f9f9f9; color: #333; margin: 0; padding: 30px; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
    h1, h2 { color: #16A34A; }
    .message { padding: 15px; border-radius: 4px; margin-bottom: 20px; }
    .message.success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
    .message.error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    ul { list-style: none; padding: 0; }
    li { display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid #eee; }
    li:last-child { border-bottom: none; }
    .user-form { margin-top: 20px; padding: 20px; background-color: #f2f2f2; border-radius: 8px; }
    input[type="text"], input[type="password"] { width: calc(50% - 25px); padding: 10px; margin-right: 10px; border: 1px solid #ccc; border-radius: 4px; }
    button { padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; color: white; font-weight: bold; }
    .add-btn { background-color: #28a745; }
    .add-btn:hover { background-color: #218838; }
    .delete-btn { background-color: #dc3545; }
    .delete-btn:hover { background-color: #c82333; }
    .logout-link { position: absolute; top: 20px; right: 30px; text-decoration: none; color: #555; }
</style>
</head><body>
<a href="{{ url_for('logout') }}" class="logout-link">登出管理员账户</a>
<div class="container">
    <h1>用户账户管理</h1>
    {% if message %}
        <div class="message {{ 'success' if '成功' in message else 'error' }}">{{ message }}</div>
    {% endif %}
    <h2>现有用户</h2>
    <ul>
        {% for username in users %}
        <li>
            <span>{{ username }}</span>
            <form method="post" action="{{ url_for('delete_user') }}" style="display:inline;" onsubmit="return confirm('确定要删除用户 {{ username }} 吗？');">
                <input type="hidden" name="username_to_delete" value="{{ username }}">
                <button type="submit" class="delete-btn">删除</button>
            </form>
        </li>
        {% else %}
        <li>暂无用户。</li>
        {% endfor %}
    </ul>
    <div class="user-form">
        <h2>添加新用户</h2>
        <form method="post" action="{{ url_for('add_user') }}">
            <input type="text" name="new_username" placeholder="新用户名" required>
            <input type="password" name="new_password" placeholder="新密码" required>
            <button type="submit" class="add-btn">添加</button>
        </form>
    </div>
</div>
</body></html>
"""

# --- 6. 新增：访问控制和用户管理的路由 ---

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        users = load_users()
        
        if username in users and check_password_hash(users[username], password):
            session['user'] = username
            session.permanent = True  # 使用永久会话，其生命周期由 permanent_session_lifetime 控制
            return redirect(url_for('index'))
        else:
            return render_template_string(LOGIN_PAGE_HTML, error="用户名或密码错误")
    
    return render_template_string(LOGIN_PAGE_HTML)

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/admin', methods=['GET', 'POST'])
def admin_login():
    question = os.environ.get('SUPER_ADMIN_QUESTION', '未配置安全问题。')
    
    if request.method == 'POST':
        answer = request.form.get('answer')
        password = request.form.get('password')
        
        correct_answer = os.environ.get('SUPER_ADMIN_ANSWER')
        correct_password = os.environ.get('SUPER_ADMIN_PASSWORD')
        
        if not correct_answer or not correct_password:
            return render_template_string(ADMIN_LOGIN_PAGE_HTML, question=question, error="管理员凭证未在服务器端配置！")

        if answer == correct_answer and password == correct_password:
            session['is_admin'] = True
            session.permanent = True
            return redirect(url_for('manage_users'))
        else:
            return render_template_string(ADMIN_LOGIN_PAGE_HTML, question=question, error="答案或密码错误")
            
    return render_template_string(ADMIN_LOGIN_PAGE_HTML, question=question)

@app.route('/manage-users')
@admin_required
def manage_users():
    users = load_users()
    message = request.args.get('message')
    return render_template_string(MANAGE_USERS_PAGE_HTML, users=users.keys(), message=message)

@app.route('/add_user', methods=['POST'])
@admin_required
def add_user():
    username = request.form.get('new_username')
    password = request.form.get('new_password')
    
    if not username or not password:
        return redirect(url_for('manage_users', message="错误：用户名和密码不能为空。"))

    users = load_users()
    if username in users:
        return redirect(url_for('manage_users', message=f"错误：用户 '{username}' 已存在。"))
        
    users[username] = generate_password_hash(password)
    save_users(users)
    return redirect(url_for('manage_users', message=f"成功：用户 '{username}' 已添加。"))

@app.route('/delete_user', methods=['POST'])
@admin_required
def delete_user():
    username = request.form.get('username_to_delete')
    if not username:
        return redirect(url_for('manage_users', message="错误：未指定要删除的用户。"))

    users = load_users()
    if username in users:
        del users[username]
        save_users(users)
        return redirect(url_for('manage_users', message=f"成功：用户 '{username}' 已删除。"))
    else:
        return redirect(url_for('manage_users', message=f"错误：用户 '{username}' 不存在。"))


# --- 辅助函数 (原有代码) ---
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

# --- 主页路由 (应用访问控制) ---
@app.route('/')
@login_required
def index():
    return send_from_directory('.', 'index.html')

# --- API 端点 (应用访问控制) ---
@app.route('/api/stream_chat', methods=['POST'])
@login_required
def stream_chat():
    client, error_response = get_client_from_header()
    if error_response:
        error_json = json.dumps({"error": error_response.get_json()['error']})
        return Response(f"data: {error_json}\n\n", mimetype='text/event-stream', status=error_response.status_code)
        
    req_data = request.get_json()
    model = req_data.get('model')
    temperature = req_data.get('temperature')
    messages = req_data.get('messages')

    if not all([model, messages]):
        error_json = json.dumps({"error": "model and messages are required."})
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

@app.route('/api/chat', methods=['POST'])
@login_required
def simple_chat():
    client, error_response = get_client_from_header()
    if error_response:
        return error_response
        
    req_data = request.get_json()
    model = req_data.get('model')
    messages = req_data.get('messages')
    temperature = req_data.get('temperature', 0.4) 

    if not all([model, messages]):
        return jsonify({"error": "model and messages are required."}), 400

    try:
        response_from_sdk = client.chat.completions.create(
            model=model,
            messages=messages,
            stream=False,
            temperature=temperature,
        )
        json_string = response_from_sdk.model_dump_json()
        clean_dict = json.loads(json_string)
        return jsonify(clean_dict)
        
    except Exception as e:
        print(f"Error in simple_chat: {traceback.format_exc()}")
        error_payload = { "error": { "message": f"同步调用时发生严重错误: {str(e)}", "type": "backend_exception" } }
        return jsonify(error_payload), 500

@app.route('/api/async_submit', methods=['POST'])
@login_required
def async_submit():
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
@login_required
def async_retrieve():
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
@login_required
def upload_file():
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
@login_required
def create_batch_task():
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
@login_required
def check_batch_status():
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
@login_required
def download_result_file():
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

# --- 启动命令 ---
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5001)), debug=False)
