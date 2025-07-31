# app.py (v11.2 - Robust Routing Fix)
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

# --- 1. 配置 ---
USERS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'users.json')

# --- 初始化 Flask 应用 ---
static_folder_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.')
app = Flask(__name__, static_folder=static_folder_path, static_url_path='')
CORS(app)

# --- 2. 会话和安全配置 ---
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'dev-secret-key-for-local-testing-only')
app.permanent_session_lifetime = timedelta(hours=6)

# --- 3. 用户数据加载函数 ---
def load_users():
    try:
        with open(USERS_FILE, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        print("警告：'users.json' 文件未找到或格式错误。将无法登录。")
        return {}

# --- 4. 访问控制装饰器 ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return redirect(url_for('login'))
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
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f0f2f5; margin: 0; }
        .login-container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); width: 320px; text-align: center; }
        h1 { margin-bottom: 20px; color: #333; }
        .error { color: #e74c3c; margin-bottom: 15px; }
        input { width: 100%; padding: 12px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
        button { width: 100%; padding: 12px; background-color: #22C55E; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; font-weight: bold; }
        button:hover { background-color: #16A34A; }
    </style>
</head>
<body>
    <div class="login-container">
        <h1>请登录</h1>
        {% if error %}
            <p class="error">{{ error }}</p>
        {% endif %}
        <form method="post" action="{{ url_for('login') }}">
            <input type="text" name="username" placeholder="用户名" required>
            <input type="password" name="password" placeholder="密码" required>
            <button type="submit">登 录</button>
        </form>
    </div>
</body>
</html>
"""
# --- 6. 访问控制路由 (已修改) ---

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        users = load_users()
        
        if username in users and check_password_hash(users.get(username, ""), password):
            session['user'] = username
            session.permanent = True
            # 登录成功后，重定向到受保护的 /app 路由
            return redirect(url_for('serve_app'))
        else:
            return render_template_string(LOGIN_PAGE_HTML, error="用户名或密码错误")
    
    return render_template_string(LOGIN_PAGE_HTML)

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# --- 主应用路由 (已修改) ---

@app.route('/')
def index():
    """根路径，只负责检查会话和重定向。"""
    if 'user' in session:
        return redirect(url_for('serve_app'))
    else:
        return redirect(url_for('login'))

@app.route('/app')
@login_required
def serve_app():
    """这个受保护的路由负责提供主应用 index.html。"""
    # 读取 index.html 内容
    with open(os.path.join(static_folder_path, 'index.html'), 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # 动态插入登出按钮
    logout_button_html = f"""
    <div style="position: absolute; top: 20px; right: 80px; z-index: 101;">
        <a href="{url_for('logout')}" style="text-decoration: none; padding: 8px 15px; background-color: #ef4444; color: white; border-radius: 5px; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">登出</a>
    </div>
    """
    # 寻找 <body> 标签并插入按钮
    if '<body>' in html_content:
        html_content = html_content.replace('<body>', f'<body>{logout_button_html}', 1)
    
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
            response = client.chat.completions.create(model=model, messages=messages, stream=True, temperature=temperature)
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


# --- 启动命令 (保持不变) ---
if __name__ == '__main__':
    try:
        from werkzeug.security import generate_password_hash
    except ImportError:
        print("请先运行 'pip install werkzeug' 来安装密码哈希库。")
        exit(1)
        
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5001)), debug=False)
