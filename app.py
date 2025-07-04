import os
import json
from flask import Flask, request, jsonify, make_response, send_from_directory
from flask_cors import CORS
from zhipuai import ZhipuAI
from io import BytesIO

# --- 初始化 Flask 应用 ---
# 告诉Flask前端文件在哪个目录
app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)  # 允许跨域，这对于本地开发和部署至关重要

# --- 辅助函数：创建标准化的JSON响应 ---
def create_response(data=None, error=None, status_code=200):
    """创建一个标准格式的JSON响应"""
    response_data = {}
    if data is not a None:
        response_data['success'] = True
        response_data['data'] = data
    if error is not None:
        response_data['success'] = False
        response_data['error'] = error
        if status_code == 200:
            status_code = 400  # 如果有错误，默认状态码应为客户端错误
    return make_response(jsonify(response_data), status_code)

# --- 主页路由：提供HTML前端文件 ---
@app.route('/')
def index():
    """提供主应用页面"""
    # 假设您的HTML文件名已更新
    return send_from_directory('.', 'patent_workbench_v4.0.html')

# --- API 端点定义 ---

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """上传本地生成的JSONL文件到智谱AI"""
    req_data = request.get_json()
    api_key = req_data.get('apiKey')
    jsonl_content = req_data.get('jsonlContent')
    file_name = req_data.get('fileName', 'temp_batch_upload.jsonl')

    if not api_key or not jsonl_content:
        return create_response(error="API Key 和 JSONL 内容不能为空")

    try:
        client = ZhipuAI(api_key=api_key)
        # 使用BytesIO在内存中创建文件对象，避免写入磁盘
        bytes_io = BytesIO(jsonl_content.encode('utf-8'))
        
        # 调用SDK上传文件
        result = client.files.create(
            file=(file_name, bytes_io),
            purpose="batch"
        )
        
        return create_response(data={'fileId': result.id, 'message': '文件上传成功！'})
    except Exception as e:
        return create_response(error=f"上传过程中发生错误: {str(e)}", status_code=500)

@app.route('/api/create_batch', methods=['POST'])
def create_batch_task():
    """使用上传的文件ID创建批量任务"""
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
            completion_window="24h", # 任务在24小时内完成
            metadata={"description": "来自专利工作台的分析任务"}
        )
        # SDK返回的对象需要序列化为JSON
        return create_response(data=json.loads(batch_job.model_dump_json()))
    except Exception as e:
        return create_response(error=f"创建Batch任务时发生错误: {str(e)}", status_code=500)

@app.route('/api/check_status', methods=['POST'])
def check_batch_status():
    """检查指定Batch ID的任务状态"""
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
        return create_response(error=f"检查Batch状态时发生错误: {str(e)}", status_code=500)

# -----------------------------------------------------------------------------
# --- 核心修改：改造下载接口，直接返回文件内容 ---
# -----------------------------------------------------------------------------
@app.route('/api/get_result_content', methods=['POST'])
def get_result_content():
    """
    根据文件ID从智谱AI获取文件内容，并直接以文本形式返回。
    这是实现“下载后直接分析”流程的关键。
    """
    req_data = request.get_json()
    api_key = req_data.get('apiKey')
    file_id = req_data.get('fileId')

    if not api_key or not file_id:
        return create_response(error="API Key 和 File ID 不能为空")

    try:
        client = ZhipuAI(api_key=api_key)
        # 获取文件内容对象
        file_content_response = client.files.content(file_id)
        
        # .text 属性可以直接获取文件内容的字符串形式
        content_text = file_content_response.text
        
        # 将文件内容作为响应数据返回给前端
        return create_response(data={'fileId': file_id, 'content': content_text})
    except Exception as e:
        return create_response(error=f"获取文件内容时发生错误: {str(e)}", status_code=500)


# --- 主程序入口 ---
if __name__ == '__main__':
    # 使用Gunicorn等WSGI服务器部署时，不需要这部分。
    # 本地开发时，可以通过 `python app.py` 运行。
    # debug=True 会在代码更改后自动重启服务。生产环境请务必设为False。
    app.run(host='0.0.0.0', port=5001, debug=True)

