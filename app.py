import os
from flask import Flask, request, jsonify, make_response, send_from_directory
from flask_cors import CORS
from zhipuai import ZhipuAI
import json

# --- 初始化 Flask 应用 ---
# 告诉Flask前端文件在哪个目录
app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app) # 允许跨域

# --- 文件目录设置 ---
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
    # 这会让访问根URL的用户直接看到我们的前端页面
    return send_from_directory('.', 'patent_workbench_v3.8.html')

# --- API 端点定义 (与v3.7完全相同) ---
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
    # 在Render这样的无服务器环境中，直接下载到服务器文件系统意义不大
    # 我们将直接返回文件内容给前端处理（如果需要的话）
    # 但由于智谱的SDK是直接写入文件，所以这个端点在云端的作用变为确认
    # 在真实生产环境中，我们会把文件存到S3这样的对象存储里
    # 为保持简单，我们仍模拟下载，并返回成功信息
    req_data = request.get_json()
    api_key = req_data.get('apiKey')
    file_id = req_data.get('fileId')
    if not api_key or not file_id:
        return create_response(error="API Key 和 File ID 不能为空")
    try:
        client = ZhipuAI(api_key=api_key)
        content = client.files.content(file_id)
        # 模拟下载，但其实文件是临时的
        file_name = f"batch_result_{file_id}.jsonl"
        file_path = os.path.join(DOWNLOADS_DIR, file_name)
        content.write_to_file(file_path)
        # 因为用户无法访问服务器文件系统，所以我们返回不同的信息
        return create_response(data={'message': f"文件 {file_name} 已在后端处理。请提示用户前往【功能三】手动上传您在本地下载的结果文件。"})
    except Exception as e:
        return create_response(error=f"下载文件时发生错误: {str(e)}")

# 当使用Gunicorn启动时，它会自己寻找'app'这个Flask实例，所以我们不需要app.run()
# if __name__ == '__main__':
#     app.run()
