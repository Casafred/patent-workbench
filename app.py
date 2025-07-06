# app.py (v9.0 - Now with Streaming and Async support)
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

# --- 辅助函数：创建标准化的JSON响应 ---
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
    response = make_response(jsonify(response_data), status_code)
    response.headers['Content-Type'] = 'application/json; charset=utf-8'
    return response

# --- 主页路由：提供HTML文件 ---
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')


# --- [新增] 功能四：即时对话 (流式输出) ---
@app.route('/api/stream_chat', methods=['POST'])
def stream_chat():
    req_data = request.get_json()
    api_key = req_data.get('apiKey')
    model = req_data.get('model')
    temperature = req_data.get('temperature')
    messages = req_data.get('messages')

    if not all([api_key, model, messages]):
        return "Error: apiKey, model, and messages are required.", 400

    def generate():
        try:
            client = ZhipuAI(api_key=api_key)
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True,
                temperature=temperature,
            )
            for chunk in response:
                # SSE format: data: {...}\n\n
                yield f"data: {chunk.model_dump_json()}\n\n"
            # Send a final DONE message (optional, but good practice)
            yield "data: [DONE]\n\n"
        except Exception as e:
            print(f"Error during stream generation: {traceback.format_exc()}")
            error_message = json.dumps({"error": str(e)})
            yield f"data: {error_message}\n\n"

    return Response(generate(), mimetype='text/event-stream')


# --- [新增] 功能五：小批量异步 - 提交任务 ---
@app.route('/api/async_submit', methods=['POST'])
def async_submit():
    req_data = request.get_json()
    api_key = req_data.get('apiKey')
    # Let's use a fixed, fast model for async tasks, or get it from request
    model = req_data.get('model', 'glm-4-flash') 
    temperature = req_data.get('temperature', 0.1)
    messages = req_data.get('messages')

    if not all([api_key, messages]):
        return create_response(error="apiKey and messages are required.")
    
    try:
        client = ZhipuAI(api_key=api_key)
        response = client.chat.asyncCompletions.create(
            model=model,
            messages=messages,
            temperature=temperature,
        )
        # Return the task ID so the frontend can track it
        return create_response(data={'task_id': response.id})
    except Exception as e:
        print(f"Error in async_submit: {traceback.format_exc()}")
        return create_response(error=f"提交异步任务时发生错误: {str(e)}")


# --- [新增] 功能五：小批量异步 - 查询结果 ---
@app.route('/api/async_retrieve', methods=['POST'])
def async_retrieve():
    req_data = request.get_json()
    api_key = req_data.get('apiKey')
    task_id = req_data.get('task_id')

    if not all([api_key, task_id]):
        return create_response(error="apiKey and task_id are required.")

    try:
        client = ZhipuAI(api_key=api_key)
        retrieved_task = client.chat.asyncCompletions.retrieve(id=task_id)
        # Convert the Pydantic model to a dictionary to be JSON-serializable
        task_data = json.loads(retrieved_task.model_dump_json())
        return create_response(data=task_data)
    except Exception as e:
        print(f"Error in async_retrieve: {traceback.format_exc()}")
        return create_response(error=f"查询异步任务时发生错误: {str(e)}")


# --- 批量处理相关端点 (保持不变) ---
@app.route('/api/upload', methods=['POST'])
def upload_file():
    # (此部分代码保持不变，此处省略)
    req_data = request.get_json()
    api_key = req_data.get('apiKey')
    jsonl_content = req_data.get('jsonlContent')
    file_name = req_data.get('fileName', 'temp_batch_upload.jsonl')

    if not api_key or not jsonl_content:
        return create_response(error="API Key 和 JSONL 内容不能为空")

    try:
        client = ZhipuAI(api_key=api_key)
        bytes_io = BytesIO(jsonl_content.encode('utf-8'))
        result = client.files.create(file=(file_name, bytes_io), purpose="batch")
        return create_response(data={'fileId': result.id, 'message': '文件上传成功！'})
    except Exception as e:
        return create_response(error=f"上传过程中发生错误: {str(e)}")

@app.route('/api/create_batch', methods=['POST'])
def create_batch_task():
    # (此部分代码保持不变，此处省略)
    req_data = request.get_json()
    api_key = req_data.get('apiKey')
    file_id = req_data.get('fileId')

    if not api_key or not file_id:
        return create_response(error="API Key 和 File ID 不能为空")

    try:
        client = ZhipuAI(api_key=api_key)
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
    # (此部分代码保持不变，此处省略)
    req_data = request.get_json()
    api_key = req_data.get('apiKey')
    batch_id = req_data.get('batchId')

    if not api_key or not batch_id:
        return create_response(error="API Key 和 Batch ID 不能为空")

    try:
        client = ZhipuAI(api_key=api_key)
        batch_job = client.batches.retrieve(batch_id)
        return create_response(data=json.loads(batch_job.model_dump_json()))
    except Exception as e:
        return create_response(error=f"检查Batch状态时发生错误: {str(e)}")

@app.route('/api/download_result', methods=['POST'])
def download_result_file():
    # (此部分代码保持不变，此处省略)
    req_data = request.get_json()
    api_key = req_data.get('apiKey')
    file_id = req_data.get('fileId')

    if not api_key or not file_id:
        return create_response(error="API Key 和 File ID 不能为空")

    try:
        client = ZhipuAI(api_key=api_key)
        response_content_object = client.files.content(file_id)
        raw_bytes = response_content_object.content
        file_content_str = raw_bytes.decode('utf-8')
        
        response_data = {
            'message': f"文件内容 (ID: {file_id}) 已成功获取并返回。",
            'fileContent': file_content_str
        }
        
        return create_response(data=response_data)
        
    except Exception as e:
        import traceback
        print(f"Error in download_result_file: {traceback.format_exc()}")
        return create_response(error=f"获取文件内容时发生错误: {str(e)}")

# 用于本地开发的启动命令
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5001)), debug=True)
