import os
from flask import Flask, request, jsonify, make_response, send_from_directory
from flask_cors import CORS
from zhipuai import ZhipuAI
import json

# --- 初始化 Flask 应用 ---
app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app) 

# --- 文件目录设置 ---
# 在Render这样的临时文件系统中，这个目录会在实例重启后清空
DOWNLOADS_DIR = 'batch_downloads'
if not os.path.exists(DOWNLOADS_DIR):
    os.makedirs(DOWNLOADS_DIR)

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
    return make_response(jsonify(response_data), status_code)

# --- 主页路由：提供HTML文件 ---
@app.route('/')
def index():
    return send_from_directory('.', 'patent_workbench_v3.9.html')

# --- API 端点定义 ---

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
        from io import BytesIO
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
            auto_delete_input_file=True,
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
    """
    关键修改：下载文件后，读取其内容并返回给前端。
    """
    req_data = request.get_json()
    api_key = req_data.get('apiKey')
    file_id = req_data.get('fileId')
    if not api_key or not file_id:
        return create_response(error="API Key 和 File ID 不能为空")
    try:
        client = ZhipuAI(api_key=api_key)
        
        # 1. 从API获取文件内容对象
        content_obj = client.files.content(file_id)
        
        # 2. 将内容直接解码为字符串
        file_content_str = content_obj.response.content.decode('utf-8')

        # （可选）仍然可以保存一份在后端，但主要目的是返回内容
        file_name = f"batch_result_{file_id}.jsonl"
        file_path = os.path.join(DOWNLOADS_DIR, file_name)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(file_content_str)
        
        # 3. 在响应中将文件内容返回给前端
        return create_response(data={
            'message': f"文件 {file_name} 已在后端处理并返回内容。",
            'fileContent': file_content_str  # <-- 新增字段
        })
    except Exception as e:
        return create_response(error=f"下载并读取文件时发生错误: {str(e)}")

