"""
Excel文件上传和处理功能的API路由

提供Excel文件上传、解析和专利号搜索的API端点。
"""

import os
import json
import traceback
from datetime import datetime
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import pandas as pd
from backend.middleware import validate_api_request
from backend.utils import create_response

# 创建蓝图
excel_upload_bp = Blueprint('excel_upload', __name__)

# 配置
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'csv'}
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB

# 确保上传目录存在
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def allowed_file(filename):
    """检查文件扩展名是否允许"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def parse_excel_file(file_path, header_row=0):
    """
    解析Excel文件
    
    Args:
        file_path: Excel文件路径
        header_row: 标题行索引（从0开始）
    
    Returns:
        dict: 包含列信息和数据的字典
    """
    try:
        # 读取Excel文件
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path, header=header_row)
        else:
            df = pd.read_excel(file_path, header=header_row)
        
        # 获取列信息
        columns = [
            {
                'index': i,
                'name': col,
                'type': str(df[col].dtype),
                'sample_values': df[col].dropna().head(3).tolist()
            }
            for i, col in enumerate(df.columns)
        ]
        
        # 转换数据为字典列表
        data = []
        for index, row in df.iterrows():
            row_data = {
                'row_index': index + header_row + 1,  # Excel行号（从1开始）
                'data': {}
            }
            
            for col in df.columns:
                value = row[col]
                # 处理NaN值
                if pd.isna(value):
                    row_data['data'][col] = None
                else:
                    row_data['data'][col] = str(value).strip()
            
            data.append(row_data)
        
        return {
            'success': True,
            'columns': columns,
            'data': data,
            'total_rows': len(data),
            'file_info': {
                'name': os.path.basename(file_path),
                'size': os.path.getsize(file_path),
                'modified': datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat()
            }
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': f"解析Excel文件失败: {str(e)}"
        }


def search_patent_numbers(data, column_name, query, limit=50):
    """
    在Excel数据中搜索专利号
    
    Args:
        data: Excel数据列表
        column_name: 专利号列名
        query: 搜索查询字符串
        limit: 返回结果数量限制
    
    Returns:
        list: 匹配的行数据
    """
    if not query or not query.strip():
        return data[:limit]  # 如果没有查询条件，返回前N行
    
    query = query.strip().lower()
    results = []
    
    for row in data:
        if len(results) >= limit:
            break
            
        patent_value = row['data'].get(column_name)
        if patent_value and query in patent_value.lower():
            # 计算匹配度
            match_score = 1.0 if query == patent_value.lower() else 0.8
            
            results.append({
                **row,
                'match_score': match_score,
                'patent_number': patent_value
            })
    
    # 按匹配度排序
    results.sort(key=lambda x: x['match_score'], reverse=True)
    return results


# ==================== Excel文件上传API ====================

@excel_upload_bp.route('/api/excel/upload', methods=['POST'])
def upload_excel_file():
    """
    上传Excel文件
    
    Returns:
        上传结果和文件信息
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        # 检查是否有文件
        if 'file' not in request.files:
            return create_response(
                error="未选择文件",
                status_code=400
            )
        
        file = request.files['file']
        
        # 检查文件名
        if file.filename == '':
            return create_response(
                error="未选择文件",
                status_code=400
            )
        
        # 检查文件类型
        if not allowed_file(file.filename):
            return create_response(
                error=f"不支持的文件类型。支持的格式: {', '.join(ALLOWED_EXTENSIONS)}",
                status_code=400
            )
        
        # 检查文件大小
        file.seek(0, 2)  # 移动到文件末尾
        file_size = file.tell()
        file.seek(0)  # 重置到文件开头
        
        if file_size > MAX_FILE_SIZE:
            return create_response(
                error=f"文件大小超过限制 ({MAX_FILE_SIZE // (1024*1024)}MB)",
                status_code=400
            )
        
        # 生成安全的文件名
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = secure_filename(file.filename)
        name, ext = os.path.splitext(filename)
        safe_filename = f"{timestamp}_{name}{ext}"
        
        # 保存文件
        file_path = os.path.join(UPLOAD_FOLDER, safe_filename)
        file.save(file_path)
        
        # 获取标题行参数
        header_row = int(request.form.get('header_row', 0))
        
        # 解析文件
        parse_result = parse_excel_file(file_path, header_row)
        
        if not parse_result['success']:
            # 删除上传的文件
            if os.path.exists(file_path):
                os.remove(file_path)
            return create_response(
                error=parse_result['error'],
                status_code=400
            )
        
        # 返回成功结果
        return create_response(data={
            'file_id': safe_filename,
            'file_path': file_path,
            'columns': parse_result['columns'],
            'total_rows': parse_result['total_rows'],
            'file_info': parse_result['file_info'],
            'preview_data': parse_result['data'][:10]  # 返回前10行作为预览
        })
        
    except Exception as e:
        print(f"上传Excel文件失败: {traceback.format_exc()}")
        return create_response(
            error=f"上传文件失败: {str(e)}",
            status_code=500
        )


@excel_upload_bp.route('/api/excel/<file_id>/columns', methods=['GET'])
def get_excel_columns(file_id):
    """
    获取Excel文件的列信息
    
    Args:
        file_id: 文件ID
    
    Returns:
        列信息列表
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        file_path = os.path.join(UPLOAD_FOLDER, file_id)
        
        if not os.path.exists(file_path):
            return create_response(
                error="文件不存在",
                status_code=404
            )
        
        # 获取标题行参数
        header_row = int(request.args.get('header_row', 0))
        
        # 解析文件
        parse_result = parse_excel_file(file_path, header_row)
        
        if not parse_result['success']:
            return create_response(
                error=parse_result['error'],
                status_code=400
            )
        
        return create_response(data={
            'columns': parse_result['columns'],
            'total_rows': parse_result['total_rows']
        })
        
    except Exception as e:
        print(f"获取Excel列信息失败: {traceback.format_exc()}")
        return create_response(
            error=f"获取列信息失败: {str(e)}",
            status_code=500
        )


@excel_upload_bp.route('/api/excel/<file_id>/search', methods=['POST'])
def search_excel_data(file_id):
    """
    在Excel数据中搜索专利号
    
    Args:
        file_id: 文件ID
    
    Request body:
        - column_name: 专利号列名
        - query: 搜索查询字符串
        - limit: 返回结果数量限制 (可选，默认为50)
        - header_row: 标题行索引 (可选，默认为0)
    
    Returns:
        搜索结果列表
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        file_path = os.path.join(UPLOAD_FOLDER, file_id)
        
        if not os.path.exists(file_path):
            return create_response(
                error="文件不存在",
                status_code=404
            )
        
        req_data = request.get_json()
        
        # 验证必填字段
        if 'column_name' not in req_data:
            return create_response(
                error="缺少必填字段: column_name",
                status_code=400
            )
        
        column_name = req_data['column_name']
        query = req_data.get('query', '').strip()
        limit = int(req_data.get('limit', 50))
        header_row = int(req_data.get('header_row', 0))
        
        # 限制搜索结果数量
        if limit > 100:
            limit = 100
        
        # 解析文件
        parse_result = parse_excel_file(file_path, header_row)
        
        if not parse_result['success']:
            return create_response(
                error=parse_result['error'],
                status_code=400
            )
        
        # 检查列是否存在
        column_names = [col['name'] for col in parse_result['columns']]
        if column_name not in column_names:
            return create_response(
                error=f"列 '{column_name}' 不存在。可用列: {', '.join(column_names)}",
                status_code=400
            )
        
        # 搜索数据
        results = search_patent_numbers(
            parse_result['data'], 
            column_name, 
            query, 
            limit
        )
        
        return create_response(data={
            'results': results,
            'total_count': len(results),
            'query': query,
            'column_name': column_name,
            'file_info': parse_result['file_info']
        })
        
    except ValueError as e:
        return create_response(
            error=f"参数格式错误: {str(e)}",
            status_code=400
        )
    except Exception as e:
        print(f"搜索Excel数据失败: {traceback.format_exc()}")
        return create_response(
            error=f"搜索失败: {str(e)}",
            status_code=500
        )


@excel_upload_bp.route('/api/excel/<file_id>/data', methods=['GET'])
def get_excel_data(file_id):
    """
    获取Excel文件的完整数据
    
    Args:
        file_id: 文件ID
    
    Query parameters:
        - header_row: 标题行索引 (可选，默认为0)
        - page: 页码 (可选，默认为1)
        - page_size: 每页数量 (可选，默认为100)
    
    Returns:
        Excel数据
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        file_path = os.path.join(UPLOAD_FOLDER, file_id)
        
        if not os.path.exists(file_path):
            return create_response(
                error="文件不存在",
                status_code=404
            )
        
        # 获取参数
        header_row = int(request.args.get('header_row', 0))
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 100))
        
        # 限制页面大小
        if page_size > 500:
            page_size = 500
        
        # 解析文件
        parse_result = parse_excel_file(file_path, header_row)
        
        if not parse_result['success']:
            return create_response(
                error=parse_result['error'],
                status_code=400
            )
        
        # 分页处理
        total_rows = len(parse_result['data'])
        start_index = (page - 1) * page_size
        end_index = start_index + page_size
        
        paginated_data = parse_result['data'][start_index:end_index]
        
        return create_response(data={
            'data': paginated_data,
            'columns': parse_result['columns'],
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_rows': total_rows,
                'total_pages': (total_rows + page_size - 1) // page_size
            },
            'file_info': parse_result['file_info']
        })
        
    except ValueError as e:
        return create_response(
            error=f"参数格式错误: {str(e)}",
            status_code=400
        )
    except Exception as e:
        print(f"获取Excel数据失败: {traceback.format_exc()}")
        return create_response(
            error=f"获取数据失败: {str(e)}",
            status_code=500
        )


@excel_upload_bp.route('/api/excel/<file_id>', methods=['DELETE'])
def delete_excel_file(file_id):
    """
    删除上传的Excel文件
    
    Args:
        file_id: 文件ID
    
    Returns:
        删除结果
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        file_path = os.path.join(UPLOAD_FOLDER, file_id)
        
        if not os.path.exists(file_path):
            return create_response(
                error="文件不存在",
                status_code=404
            )
        
        # 删除文件
        os.remove(file_path)
        
        return create_response(data={
            'success': True,
            'message': '文件删除成功'
        })
        
    except Exception as e:
        print(f"删除Excel文件失败: {traceback.format_exc()}")
        return create_response(
            error=f"删除文件失败: {str(e)}",
            status_code=500
        )


# ==================== 健康检查API ====================

@excel_upload_bp.route('/api/excel/health', methods=['GET'])
def health_check():
    """
    健康检查端点
    
    Returns:
        服务状态信息
    """
    try:
        # 检查上传目录
        upload_dir_exists = os.path.exists(UPLOAD_FOLDER)
        upload_dir_writable = os.access(UPLOAD_FOLDER, os.W_OK) if upload_dir_exists else False
        
        return create_response(data={
            'status': 'healthy',
            'upload_folder': UPLOAD_FOLDER,
            'upload_dir_exists': upload_dir_exists,
            'upload_dir_writable': upload_dir_writable,
            'max_file_size': f"{MAX_FILE_SIZE // (1024*1024)}MB",
            'allowed_extensions': list(ALLOWED_EXTENSIONS),
            'version': '1.0.0'
        })
    
    except Exception as e:
        return create_response(
            error=f"健康检查失败: {str(e)}",
            status_code=500
        )