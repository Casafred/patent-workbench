import os
from flask import Flask, request, jsonify, make_response, send_from_directory
from flask_cors import CORS
from zhipuai import ZhipuAI
import json
from io import BytesIO

# --- 初始化 Flask 应用 ---
app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)  # 允许跨域

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
    response = make_response(jsonify(response_data), status_code)
    response.headers['Content-Type'] = 'application/json; charset=utf-8'
    return response

# --- 主页路由：提供HTML文件 ---
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

# --- API 端点定义 ---

# [新功能] 即时同步请求端点
@app.route('/api/instant_request', methods=['POST'])
def instant_request():
    req_data = request.get_json()
    api_key = req_data.get('apiKey')
    user_input = req_data.get('userInput')
    task_type = req_data.get('taskType') # 'translate', 'summarize', 'expand_keywords'

    if not all([api_key, user_input, task_type]):
        return create_response(error="apiKey, userInput, 和 taskType 均为必填项。")

    try:
        client = ZhipuAI(api_key=api_key)

        # 为不同任务类型定义不同的 Prompt 模板
        prompts = {
            "translate": {
                "system": "你是一个专业的、精通多种语言的专利翻译引擎。你的任务是自动检测用户输入专利文本的语言，并将其精准翻译成中文。请直接返回翻译后的文本，不要添加任何额外的解释或说明。",
                "user": "请翻译以下内容：\n\n{}"
            },
            "summarize": {
                "system": "你是一位顶级的专利分析师和信息架构师，极其擅长从复杂、冗长的文本中快速提炼技术核心原理。你的输出应该是结构清晰、逻辑严谨的技术精华内容。",
                "user": "请深入分析以下文本，并总结其核心原理和内容摘要：\n\n{}"
            },
            "expand_keywords": {
                "system": "你是一名资深的专利检索专家和技术分析师。你的任务是根据用户提供的核心技术关键词，拓展出一系列用于专利数据库检索的同义词、近义词、上下位概念、相关技术术语以及不同表达方式。输出应该是一个清晰、逗号分隔的关键词列表。",
                "user": "请围绕以下核心关键词进行专利检索词拓展，提供一个全面的关键词列表：\n\n{}"
            }
        }

        if task_type not in prompts:
            return create_response(error="无效的任务类型。")

        selected_prompt = prompts[task_type]
        
        messages = [
            {"role": "system", "content": selected_prompt["system"]},
            {"role": "user", "content": selected_prompt["user"].format(user_input)}
        ]

        # 使用同步调用
        response = client.chat.completions.create(
            model="GLM-4-Flash-250414",  
            messages=messages,
            stream=False, # 确保是同步调用
            temperature=0.2,
        )
        
        content = response.choices[0].message.content
        return create_response(data={"content": content})

    except Exception as e:
        import traceback
        print(f"Error in instant_request: {traceback.format_exc()}")
        return create_response(error=f"即时请求过程中发生错误: {str(e)}")


# --- 批量处理相关端点 (保持不变) ---

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

