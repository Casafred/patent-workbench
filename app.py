# app.py (v11.0 - 集成用户认证系统)
import os
import json
import sqlite3
import traceback
from io import BytesIO
from datetime import datetime
from flask import Flask, request, jsonify, make_response, send_from_directory, Response, g
from flask_cors import CORS
from zhipuai import ZhipuAI
import time
from auth import auth_manager, login_required, admin_required
from config import config

# --- 初始化 Flask 应用 ---
static_folder_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.')
app = Flask(__name__, static_folder=static_folder_path, static_url_path='')
app.config.from_object(config['render' if os.environ.get('RENDER') else 'default'])
CORS(app, origins=app.config['CORS_ORIGINS'])

# --- 辅助函数 ---
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
    # 检查用户认证
    auth_header = request.headers.get('X-User-Auth')
    if not auth_header:
        return None, create_response(error="用户未登录，请先登录", status_code=401)
    
    # 验证用户会话
    user_id = auth_manager.validate_session(auth_header)
    if not user_id:
        return None, create_response(error="会话已过期，请重新登录", status_code=401)
    
    # 检查智谱AI API密钥
    zhipu_header = request.headers.get('Authorization')
    if not zhipu_header or not zhipu_header.startswith('Bearer '):
        return None, create_response(error="Authorization header with Bearer token is required.", status_code=401)
    
    api_key = zhipu_header.split(' ')[1]
    if not api_key:
        return None, create_response(error="API Key is missing in Authorization header.", status_code=401)
    
    try:
        client = ZhipuAI(api_key=api_key)
        return client, None
    except Exception as e:
        return None, create_response(error=f"Failed to initialize ZhipuAI client: {str(e)}", status_code=400)

# --- 主页路由 ---
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/login')
def login_page():
    return send_from_directory('.', 'login.html')

@app.route('/admin')
@login_required
@admin_required
def admin_page():
    return send_from_directory('.', 'admin.html')

# --- API 端点 ---
@app.route('/api/stream_chat', methods=['POST'])
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

# ▼▼▼ 最终修复：采用最稳健的“双重转换”策略 ▼▼▼
@app.route('/api/chat', methods=['POST'])
def simple_chat():
    """
    同步对话 (非流式)。
    【最终修复版】：采用“双重转换”策略确保数据纯净，防止序列化错误导致服务器崩溃。
    """
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
        # 1. 正常调用 ZhipuAI SDK
        response_from_sdk = client.chat.completions.create(
            model=model,
            messages=messages,
            stream=False,
            temperature=temperature,
        )
        
        # 2. 【数据清洗 - 第1步】使用Pydantic自己的方法将响应对象序列化为JSON字符串
        json_string = response_from_sdk.model_dump_json()
        
        # 3. 【数据清洗 - 第2步】使用Python标准库将JSON字符串解析回纯净的Python字典
        clean_dict = json.loads(json_string)
        
        # 4. 【最终返回】使用Flask的jsonify处理这个纯净的字典，确保稳定
        return jsonify(clean_dict)
        
    except Exception as e:
        print(f"Error in simple_chat: {traceback.format_exc()}")
        error_payload = {
            "error": {
                "message": f"同步调用时发生严重错误: {str(e)}",
                "type": "backend_exception"
            }
        }
        # 确保错误响应也是一个格式正确的JSON
        return jsonify(error_payload), 500
# ▲▲▲ 修复结束 ▲▲▲


@app.route('/api/async_submit', methods=['POST'])
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
def download_result():
    client, error_response = get_client_from_header()
    if error_response: return error_response
    
    req_data = request.get_json()
    batch_id = req_data.get('batchId')
    if not batch_id: return create_response(error="Batch ID 不能为空")
    
    try:
        batch_job = client.batches.retrieve(batch_id)
        if batch_job.status == 'completed':
            file_response = client.files.content(batch_job.output_file_id)
            return create_response(data={'content': file_response.text})
        else:
            return create_response(error=f"Batch任务未完成，当前状态: {batch_job.status}")
    except Exception as e: return create_response(error=f"下载结果时发生错误: {str(e)}")

# --- 用户认证相关API ---
@app.route('/api/auth/login', methods=['POST'])
def login():
    """用户登录"""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return create_response(error="用户名和密码不能为空")
    
    user_id = auth_manager.authenticate_user(username, password)
    if not user_id:
        return create_response(error="用户名或密码错误")
    
    # 创建会话
    ip_address = request.remote_addr
    session_token = auth_manager.create_session(user_id, ip_address)
    
    # 更新最后登录时间
    conn = sqlite3.connect(auth_manager.db_path)
    cursor = conn.cursor()
    cursor.execute('UPDATE users SET last_login = datetime("now") WHERE id = ?', (user_id,))
    conn.commit()
    conn.close()
    
    return create_response(data={'token': session_token, 'expires_in': 21600})

@app.route('/api/auth/logout', methods=['POST'])
@login_required
def logout():
    """用户登出"""
    session_token = request.headers.get('X-User-Auth')
    auth_manager.logout_user(session_token)
    return create_response(data={'message': '已安全退出'})

@app.route('/api/auth/check', methods=['GET'])
def check_auth():
    """检查登录状态"""
    session_token = request.headers.get('X-User-Auth')
    if not session_token:
        return create_response(error="未登录")
    
    user_id = auth_manager.validate_session(session_token)
    if not user_id:
        return create_response(error="会话已过期")
    
    user_info = auth_manager.get_user_info(user_id)
    return create_response(data={'authenticated': True, 'is_admin': user_info['is_admin']})

@app.route('/api/auth/userinfo', methods=['GET'])
@login_required
def get_user_info():
    """获取当前用户信息"""
    user_info = auth_manager.get_user_info(g.current_user_id)
    return create_response(data=user_info)

# --- 管理员功能 ---
@app.route('/api/admin/create-users', methods=['POST'])
@admin_required
def admin_create_users():
    """管理员批量创建用户"""
    data = request.get_json()
    users = data.get('users', [])
    
    if not users:
        return create_response(error="请提供用户列表")
    
    created_count = 0
    errors = []
    
    for user_data in users:
        username = user_data.get('username')
        password = user_data.get('password')
        is_admin = user_data.get('is_admin', False)
        
        if not username or not password:
            errors.append(f"用户 {username or '未知'}: 用户名或密码不能为空")
            continue
        
        if len(password) < 6:
            errors.append(f"用户 {username}: 密码长度至少6位")
            continue
        
        success = auth_manager.create_user(username, password, is_admin)
        if success:
            created_count += 1
        else:
            errors.append(f"用户 {username}: 用户名已存在")
    
    return create_response(data={
        "created": created_count,
        "total": len(users),
        "errors": errors
    })

@app.route('/api/admin/users', methods=['GET'])
@admin_required
def list_users():
    """获取用户列表（管理员）"""
    users = auth_manager.get_all_users()
    return create_response(data={'users': users})

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    """删除用户（管理员）"""
    success = auth_manager.delete_user(user_id)
    if success:
        return create_response(data={'message': '用户删除成功'})
    else:
        return create_response(error="用户不存在或删除失败")
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
