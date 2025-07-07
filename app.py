# app.py (v10.0 - Refactored for global auth and clarity)
import os
import json
import traceback
from io import BytesIO
from flask import Flask, request, jsonify, make_response, send_from_directory, Response
from flask_cors import CORS
from zhipuai import ZhipuAI

# --- 初始化 Flask 应用 ---
app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)  # 允许跨域

# --- 辅助函数 ---
def create_response(data=None, error=None, status_code=200):
    """创建标准化的JSON响应"""
    response_data = {}
    if data is not None:
        response_data['success'] = True
        response_data['data'] = data
    if error is not None:
        response_data['success'] = False
        response_data['error'] = error
        if status_code == 200:
            status_code = 400
    response = make_response(jsonify(response_data), status_code)
    response.headers['Content-Type'] = 'application/json; charset=utf-8'
    return response

def get_client_from_header():
    """从请求头中获取API Key并创建ZhipuAI客户端"""
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
    """即时对话 (流式输出)"""
    client, error_response = get_client_from_header()
    if error_response:
        # For streaming errors, we need to yield a JSON error message
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
            yield "data: [DONE]\n\n"
        except Exception as e:
            print(f"Error during stream generation: {traceback.format_exc()}")
            error_message = json.dumps({"error": str(e)})
            yield f"data: {error_message}\n\n"

    return Response(generate(), mimetype='text/event-stream')


@app.route('/api/async_submit', methods=['POST'])
def async_submit():
    """小批量异步 - 提交任务"""
    client, error_response = get_client_from_header()
    if error_response:
        return error_response

    req_data = request.get_json()
    model = req_data.get('model', 'glm-4-flash') 
    temperature = req_data.get('temperature', 0.1)
    messages = req_data.get('messages')

    if not messages:
        return create_response(error="messages are required.")
    
    try:
        response = client.chat.asyncCompletions.create(
            model=model,
            messages=messages,
            temperature=temperature,
        )
        return create_response(data={'task_id': response.id})
    except Exception as e:
        print(f"Error in async_submit: {traceback.format_exc()}")
        return create_response(error=f"提交异步任务时发生错误: {str(e)}")


@app.route('/api/async_retrieve', methods=['POST'])
def async_retrieve():
    """小批量异步 - 查询结果"""
    client, error_response = get_client_from_header()
    if error_response:
        return error_response

    req_data = request.get_json()
    task_id = req_data.get('task_id')

    if not task_id:
        return create_response(error="task_id is required.")

    try:
        retrieved_task = client.chat.asyncCompletions.retrieve(id=task_id)
        task_data = json.loads(retrieved_task.model_dump_json())
        return create_response(data=task_data)
    except Exception as e:
        print(f"Error in async_retrieve: {traceback.format_exc()}")
        return create_response(error=f"查询异步任务时发生错误: {str(e)}")


@app.route('/api/upload', methods=['POST'])
def upload_file():
    """大批量处理 - 上传文件"""
    client, error_response = get_client_from_header()
    if error_response:
        return error_response
        
    req_data = request.get_json()
    jsonl_content = req_data.get('jsonlContent')
    file_name = req_data.get('fileName', 'temp_batch_upload.jsonl')

    if not jsonl_content:
        return create_response(error="JSONL 内容不能为空")

    try:
        bytes_io = BytesIO(jsonl_content.encode('utf-8'))
        result = client.files.create(file=(file_name, bytes_io), purpose="batch")
        return create_response(data={'fileId': result.id, 'message': '文件上传成功！'})
    except Exception as e:
        return create_response(error=f"上传过程中发生错误: {str(e)}")

@app.route('/api/create_batch', methods=['POST'])
def create_batch_task():
    """大批量处理 - 创建任务"""
    client, error_response = get_client_from_header()
    if error_response:
        return error_response
        
    req_data = request.get_json()
    file_id = req_data.get('fileId')

    if not file_id:
        return create_response(error="File ID 不能为空")

    try:
        batch_job = client.batches.create(
            input_file_id=file_id,
            endpoint="/v4/chat/completions",
            completion_window="24h",
            metadata={"description": "来自专利工作台的分析任务"}
        )
        return create_response(data=json.loads(batch_job.model_dump_json()))
    except Exception as e:
        return create_response(error=f"创建Batch任务时发生错误: {str(e)}")

@app.route('/api/check_status', methods=['POST'])
def check_batch_status():
    """大批量处理 - 检查状态"""
    client, error_response = get_client_from_header()
    if error_response:
        return error_response
        
    req_data = request.get_json()
    batch_id = req_data.get('batchId')

    if not batch_id:
        return create_response(error="Batch ID 不能为空")

    try:
        batch_job = client.batches.retrieve(batch_id)
        return create_response(data=json.loads(batch_job.model_dump_json()))
    except Exception as e:
        return create_response(error=f"检查Batch状态时发生错误: {str(e)}")

@app.route('/api/download_result', methods=['POST'])
def download_result_file():
    """大批量处理 - 下载结果"""
    client, error_response = get_client_from_header()
    if error_response:
        return error_response
        
    req_data = request.get_json()
    file_id = req_data.get('fileId')

    if not file_id:
        return create_response(error="File ID 不能为空")

    try:
        response_content_object = client.files.content(file_id)
        raw_bytes = response_content_object.content
        file_content_str = raw_bytes.decode('utf-8')
        
        response_data = {
            'message': f"文件内容 (ID: {file_id}) 已成功获取并返回。",
            'fileContent': file_content_str
        }
        return create_response(data=response_data)
        
    except Exception as e:
        print(f"Error in download_result_file: {traceback.format_exc()}")
        return create_response(error=f"获取文件内容时发生错误: {str(e)}")

# --- 启动命令 ---
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5001)), debug=True)
