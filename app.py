# app.py (已更新为“智能代理”模式)
import os
from flask import Flask, request, jsonify, make_response, send_from_directory
from flask_cors import CORS
from zhipuai import ZhipuAI
import json
from io import BytesIO

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


# --- [核心修改] 即时同步请求端点 (智能代理模式) ---
@app.route('/api/instant_request', methods=['POST'])
def instant_request():
    req_data = request.get_json()
    
    # 1. 从前端获取所有需要的参数，包括已经构建好的messages
    api_key = req_data.get('apiKey')
    model = req_data.get('model')
    temperature = req_data.get('temperature')
    messages = req_data.get('messages') # 直接接收前端构建好的messages

    # 2. 校验参数
    if not all([api_key, model, messages]):
        return create_response(error="apiKey, model, 和 messages 均为必填项。")
    if temperature is None: # temperature可以是0，所以要检查是否为None
        return create_response(error="temperature 是必填项。")
    if not isinstance(messages, list) or len(messages) == 0:
        return create_response(error="messages 必须是一个非空列表。")


    try:
        client = ZhipuAI(api_key=api_key)

        # 3. 直接使用前端传来的参数调用ZhipuAI SDK
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            stream=False,
            temperature=temperature,
        )
        
        content = response.choices[0].message.content
        return create_response(data={"content": content})

    except Exception as e:
        import traceback
        print(f"Error in instant_request: {traceback.format_exc()}")
        return create_response(error=f"即时请求过程中发生错误: {str(e)}")


# --- 批量处理相关端点 (保持不变) ---
# ... (您的批量处理代码无需改动，此处省略)
@app.route('/api/upload', methods=['POST'])
def upload_file():
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

