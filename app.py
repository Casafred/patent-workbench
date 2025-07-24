# app.py (v10.0 - Final Robust Fix)
import os
import json
import traceback
from io import BytesIO
from flask import Flask, request, jsonify, make_response, send_from_directory, Response
from flask_cors import CORS
from zhipuai import ZhipuAI
import time

# --- 初始化 Flask 应用 ---
static_folder_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.')
app = Flask(__name__, static_folder=static_folder_path, static_url_path='')
CORS(app)

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

# --- 主页路由 ---
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

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
