"""
Excel数据拼接功能API路由

提供多Excel文件选择、工作表配置、行数范围设置、数据拼接等功能的API端点。
使用fastexcel+polars实现高性能读写操作。
"""

import os
import json
import traceback
import time
import gc
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename
from typing import List, Dict, Any, Optional, Tuple
import pandas as pd

from backend.middleware import validate_api_request
from backend.utils import create_response
from backend.utils.fast_excel_reader import FastExcelReader, get_recommended_engine

excel_concat_bp = Blueprint('excel_concat', __name__)

UPLOAD_FOLDER = 'uploads'
CONCAT_OUTPUT_FOLDER = 'concat_output'
ALLOWED_EXTENSIONS = {'xlsx', 'xls'}
MAX_FILE_SIZE = 200 * 1024 * 1024

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(CONCAT_OUTPUT_FOLDER, exist_ok=True)

_concat_sessions = {}
_concat_history = []


def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def generate_session_id() -> str:
    return f"concat_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"


@excel_concat_bp.route('/api/excel_concat/session', methods=['POST'])
def create_session():
    """
    创建新的拼接会话
    
    Returns:
        会话ID和基本信息
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        session_id = generate_session_id()
        _concat_sessions[session_id] = {
            'id': session_id,
            'created_at': datetime.now().isoformat(),
            'files': [],
            'config': {
                'output_filename': '',
                'output_sheet_name': 'Sheet1'
            },
            'status': 'initialized'
        }
        
        return create_response(data={
            'session_id': session_id,
            'created_at': _concat_sessions[session_id]['created_at']
        })
        
    except Exception as e:
        return create_response(error=f"创建会话失败: {str(e)}", status_code=500)


@excel_concat_bp.route('/api/excel_concat/session/<session_id>', methods=['GET'])
def get_session(session_id: str):
    """
    获取会话信息
    
    Args:
        session_id: 会话ID
    
    Returns:
        会话详细信息
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        if session_id not in _concat_sessions:
            return create_response(error="会话不存在", status_code=404)
        
        return create_response(data=_concat_sessions[session_id])
        
    except Exception as e:
        return create_response(error=f"获取会话失败: {str(e)}", status_code=500)


@excel_concat_bp.route('/api/excel_concat/session/<session_id>', methods=['DELETE'])
def delete_session(session_id: str):
    """
    删除会话
    
    Args:
        session_id: 会话ID
    
    Returns:
        删除结果
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        if session_id not in _concat_sessions:
            return create_response(error="会话不存在", status_code=404)
        
        session = _concat_sessions[session_id]
        for file_info in session.get('files', []):
            file_path = file_info.get('file_path', '')
            if file_path and os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except:
                    pass
        
        del _concat_sessions[session_id]
        
        return create_response(data={'success': True, 'message': '会话已删除'})
        
    except Exception as e:
        return create_response(error=f"删除会话失败: {str(e)}", status_code=500)


@excel_concat_bp.route('/api/excel_concat/upload', methods=['POST'])
def upload_file():
    """
    上传Excel文件并获取工作表信息
    
    Returns:
        文件ID、工作表列表、列信息等
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        if 'file' not in request.files:
            return create_response(error="未选择文件", status_code=400)
        
        file = request.files['file']
        
        if file.filename == '':
            return create_response(error="未选择文件", status_code=400)
        
        if not allowed_file(file.filename):
            return create_response(
                error=f"不支持的文件类型。支持的格式: {', '.join(ALLOWED_EXTENSIONS)}",
                status_code=400
            )
        
        file.seek(0, 2)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > MAX_FILE_SIZE:
            return create_response(
                error=f"文件大小超过限制 ({MAX_FILE_SIZE // (1024*1024)}MB)",
                status_code=400
            )
        
        original_filename = file.filename
        file_ext = os.path.splitext(original_filename)[1].lower()
        
        safe_name = secure_filename(original_filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = uuid.uuid4().hex[:8]
        
        if not safe_name or safe_name == file_ext.lstrip('.'):
            safe_filename = f"{timestamp}_{unique_id}{file_ext}"
        else:
            if not safe_name.endswith(file_ext):
                safe_name = os.path.splitext(safe_name)[0] + file_ext
            safe_filename = f"{timestamp}_{unique_id}_{safe_name}"
        
        file_path = os.path.join(UPLOAD_FOLDER, safe_filename)
        file.save(file_path)
        
        reader = FastExcelReader(file_path)
        sheet_names = reader.get_sheet_names()
        
        sheets_info = []
        for sheet_name in sheet_names:
            try:
                result = reader.read_sheet_fast(sheet_name, max_rows=5)
                sheets_info.append({
                    'name': sheet_name,
                    'columns': result.columns if result.success else [],
                    'total_rows': result.total_rows if result.success else 0,
                    'preview_data': result.data[:5] if result.success else []
                })
            except Exception as sheet_error:
                sheets_info.append({
                    'name': sheet_name,
                    'columns': [],
                    'total_rows': 0,
                    'preview_data': [],
                    'error': str(sheet_error)
                })
        
        return create_response(data={
            'file_id': safe_filename,
            'file_path': file_path,
            'original_filename': original_filename,
            'file_size': file_size,
            'file_size_mb': round(file_size / (1024 * 1024), 2),
            'sheet_names': sheet_names,
            'sheets_info': sheets_info,
            'recommended_engine': get_recommended_engine(file_path)
        })
        
    except Exception as e:
        print(f"上传文件失败: {traceback.format_exc()}")
        return create_response(error=f"上传文件失败: {str(e)}", status_code=500)


@excel_concat_bp.route('/api/excel_concat/session/<session_id>/add_file', methods=['POST'])
def add_file_to_session(session_id: str):
    """
    将已上传的文件添加到会话中
    
    Args:
        session_id: 会话ID
    
    Request body:
        - file_id: 文件ID
        - file_path: 文件路径
        - original_filename: 原始文件名
        - file_size: 文件大小
    
    Returns:
        添加结果
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        if session_id not in _concat_sessions:
            return create_response(error="会话不存在", status_code=404)
        
        req_data = request.get_json()
        
        file_id = req_data.get('file_id')
        file_path = req_data.get('file_path')
        original_filename = req_data.get('original_filename')
        file_size = req_data.get('file_size', 0)
        
        if not file_path or not os.path.exists(file_path):
            return create_response(error="文件不存在", status_code=400)
        
        reader = FastExcelReader(file_path)
        sheet_names = reader.get_sheet_names()
        
        file_entry = {
            'id': file_id,
            'file_path': file_path,
            'original_filename': original_filename,
            'file_size': file_size,
            'sheet_names': sheet_names,
            'selected_sheet': sheet_names[0] if sheet_names else None,
            'row_range': {
                'start': 1,
                'end': None
            },
            'order': len(_concat_sessions[session_id]['files']) + 1
        }
        
        if sheet_names:
            try:
                result = reader.read_sheet_fast(sheet_names[0], max_rows=10)
                file_entry['total_rows'] = result.total_rows if result.success else 0
                file_entry['columns'] = result.columns if result.success else []
                file_entry['row_range']['end'] = file_entry['total_rows']
            except:
                file_entry['total_rows'] = 0
                file_entry['columns'] = []
        
        _concat_sessions[session_id]['files'].append(file_entry)
        
        return create_response(data={
            'success': True,
            'file_entry': file_entry,
            'total_files': len(_concat_sessions[session_id]['files'])
        })
        
    except Exception as e:
        print(f"添加文件失败: {traceback.format_exc()}")
        return create_response(error=f"添加文件失败: {str(e)}", status_code=500)


@excel_concat_bp.route('/api/excel_concat/session/<session_id>/file/<file_id>', methods=['PUT'])
def update_file_config(session_id: str, file_id: str):
    """
    更新文件配置（工作表、行范围等）
    
    Args:
        session_id: 会话ID
        file_id: 文件ID
    
    Request body:
        - selected_sheet: 选中的工作表名称
        - row_range: 行范围 {start: number, end: number}
    
    Returns:
        更新结果
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        if session_id not in _concat_sessions:
            return create_response(error="会话不存在", status_code=404)
        
        req_data = request.get_json()
        
        file_found = False
        for file_entry in _concat_sessions[session_id]['files']:
            if file_entry['id'] == file_id:
                file_found = True
                
                if 'selected_sheet' in req_data:
                    file_entry['selected_sheet'] = req_data['selected_sheet']
                    file_path = file_entry['file_path']
                    reader = FastExcelReader(file_path)
                    result = reader.read_sheet_fast(req_data['selected_sheet'], max_rows=10)
                    if result.success:
                        file_entry['total_rows'] = result.total_rows
                        file_entry['columns'] = result.columns
                        file_entry['row_range']['end'] = result.total_rows
                
                if 'row_range' in req_data:
                    if 'start' in req_data['row_range']:
                        file_entry['row_range']['start'] = req_data['row_range']['start']
                    if 'end' in req_data['row_range']:
                        file_entry['row_range']['end'] = req_data['row_range']['end']
                
                break
        
        if not file_found:
            return create_response(error="文件不存在于会话中", status_code=404)
        
        return create_response(data={
            'success': True,
            'message': '配置已更新'
        })
        
    except Exception as e:
        print(f"更新文件配置失败: {traceback.format_exc()}")
        return create_response(error=f"更新配置失败: {str(e)}", status_code=500)


@excel_concat_bp.route('/api/excel_concat/session/<session_id>/file/<file_id>', methods=['DELETE'])
def remove_file_from_session(session_id: str, file_id: str):
    """
    从会话中移除文件
    
    Args:
        session_id: 会话ID
        file_id: 文件ID
    
    Returns:
        移除结果
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        if session_id not in _concat_sessions:
            return create_response(error="会话不存在", status_code=404)
        
        original_count = len(_concat_sessions[session_id]['files'])
        _concat_sessions[session_id]['files'] = [
            f for f in _concat_sessions[session_id]['files'] if f['id'] != file_id
        ]
        
        for i, file_entry in enumerate(_concat_sessions[session_id]['files']):
            file_entry['order'] = i + 1
        
        if len(_concat_sessions[session_id]['files']) == original_count:
            return create_response(error="文件不存在于会话中", status_code=404)
        
        return create_response(data={
            'success': True,
            'message': '文件已移除',
            'total_files': len(_concat_sessions[session_id]['files'])
        })
        
    except Exception as e:
        return create_response(error=f"移除文件失败: {str(e)}", status_code=500)


@excel_concat_bp.route('/api/excel_concat/session/<session_id>/reorder', methods=['POST'])
def reorder_files(session_id: str):
    """
    重新排序文件
    
    Args:
        session_id: 会话ID
    
    Request body:
        - file_ids: 文件ID列表（按新顺序）
    
    Returns:
        重排序结果
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        if session_id not in _concat_sessions:
            return create_response(error="会话不存在", status_code=404)
        
        req_data = request.get_json()
        file_ids = req_data.get('file_ids', [])
        
        if not file_ids:
            return create_response(error="未提供文件顺序", status_code=400)
        
        file_map = {f['id']: f for f in _concat_sessions[session_id]['files']}
        
        reordered_files = []
        for i, file_id in enumerate(file_ids):
            if file_id in file_map:
                file_map[file_id]['order'] = i + 1
                reordered_files.append(file_map[file_id])
        
        _concat_sessions[session_id]['files'] = reordered_files
        
        return create_response(data={
            'success': True,
            'message': '顺序已更新'
        })
        
    except Exception as e:
        return create_response(error=f"重排序失败: {str(e)}", status_code=500)


@excel_concat_bp.route('/api/excel_concat/session/<session_id>/config', methods=['PUT'])
def update_session_config(session_id: str):
    """
    更新会话配置（输出文件名、工作表名等）
    
    Args:
        session_id: 会话ID
    
    Request body:
        - output_filename: 输出文件名
        - output_sheet_name: 输出工作表名
    
    Returns:
        更新结果
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        if session_id not in _concat_sessions:
            return create_response(error="会话不存在", status_code=404)
        
        req_data = request.get_json()
        
        if 'output_filename' in req_data:
            _concat_sessions[session_id]['config']['output_filename'] = req_data['output_filename']
        
        if 'output_sheet_name' in req_data:
            _concat_sessions[session_id]['config']['output_sheet_name'] = req_data['output_sheet_name']
        
        return create_response(data={
            'success': True,
            'message': '配置已更新'
        })
        
    except Exception as e:
        return create_response(error=f"更新配置失败: {str(e)}", status_code=500)


@excel_concat_bp.route('/api/excel_concat/session/<session_id>/preview', methods=['POST'])
def preview_concat_data(session_id: str):
    """
    预览拼接数据
    
    Args:
        session_id: 会话ID
    
    Request body:
        - preview_rows: 每个文件预览的行数（默认5）
    
    Returns:
        预览数据
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        if session_id not in _concat_sessions:
            return create_response(error="会话不存在", status_code=404)
        
        session = _concat_sessions[session_id]
        req_data = request.get_json() or {}
        preview_rows = req_data.get('preview_rows', 5)
        
        preview_results = []
        all_columns = set()
        
        for file_entry in session['files']:
            file_path = file_entry['file_path']
            sheet_name = file_entry['selected_sheet']
            row_range = file_entry['row_range']
            
            if not os.path.exists(file_path):
                preview_results.append({
                    'file_id': file_entry['id'],
                    'filename': file_entry['original_filename'],
                    'error': '文件不存在'
                })
                continue
            
            try:
                reader = FastExcelReader(file_path)
                result = reader.read_sheet_fast(
                    sheet_name_or_index=sheet_name,
                    header_row=0,
                    max_rows=min(row_range['end'] or 10000, preview_rows)
                )
                
                if not result.success:
                    preview_results.append({
                        'file_id': file_entry['id'],
                        'filename': file_entry['original_filename'],
                        'error': result.error
                    })
                    continue
                
                start_row = max(0, row_range['start'] - 1)
                end_row = row_range['end'] or result.total_rows
                preview_data = result.data[start_row:start_row + preview_rows]
                
                for col in result.columns:
                    all_columns.add(col['name'])
                
                preview_results.append({
                    'file_id': file_entry['id'],
                    'filename': file_entry['original_filename'],
                    'sheet_name': sheet_name,
                    'row_range': row_range,
                    'total_rows': result.total_rows,
                    'selected_rows': end_row - start_row,
                    'columns': result.columns,
                    'preview_data': preview_data
                })
                
            except Exception as file_error:
                preview_results.append({
                    'file_id': file_entry['id'],
                    'filename': file_entry['original_filename'],
                    'error': str(file_error)
                })
        
        return create_response(data={
            'preview_results': preview_results,
            'all_columns': list(all_columns),
            'total_files': len(session['files'])
        })
        
    except Exception as e:
        print(f"预览数据失败: {traceback.format_exc()}")
        return create_response(error=f"预览数据失败: {str(e)}", status_code=500)


@excel_concat_bp.route('/api/excel_concat/session/<session_id>/execute', methods=['POST'])
def execute_concat(session_id: str):
    """
    执行拼接操作
    
    Args:
        session_id: 会话ID
    
    Request body:
        - output_filename: 输出文件名（可选）
        - output_sheet_name: 输出工作表名（可选）
    
    Returns:
        拼接结果
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    start_time = time.time()
    
    try:
        if session_id not in _concat_sessions:
            return create_response(error="会话不存在", status_code=404)
        
        session = _concat_sessions[session_id]
        req_data = request.get_json() or {}
        
        if not session['files']:
            return create_response(error="没有可拼接的文件", status_code=400)
        
        output_filename = req_data.get('output_filename') or session['config'].get('output_filename') or f"concat_result_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        output_sheet_name = req_data.get('output_sheet_name') or session['config'].get('output_sheet_name') or 'Sheet1'
        
        if not output_filename.endswith('.xlsx'):
            output_filename += '.xlsx'
        
        output_path = os.path.join(CONCAT_OUTPUT_FOLDER, output_filename)
        
        all_data = []
        all_columns = []
        concat_log = []
        total_rows = 0
        
        for file_entry in sorted(session['files'], key=lambda x: x['order']):
            file_path = file_entry['file_path']
            sheet_name = file_entry['selected_sheet']
            row_range = file_entry['row_range']
            
            if not os.path.exists(file_path):
                concat_log.append({
                    'file': file_entry['original_filename'],
                    'status': 'error',
                    'message': '文件不存在'
                })
                continue
            
            try:
                reader = FastExcelReader(file_path)
                result = reader.read_sheet_fast(
                    sheet_name_or_index=sheet_name,
                    header_row=0
                )
                
                if not result.success:
                    concat_log.append({
                        'file': file_entry['original_filename'],
                        'status': 'error',
                        'message': result.error
                    })
                    continue
                
                if not all_columns:
                    all_columns = [col['name'] for col in result.columns]
                
                start_idx = max(0, row_range['start'] - 1)
                end_idx = row_range['end'] or result.total_rows
                selected_data = result.data[start_idx:end_idx]
                
                for row_item in selected_data:
                    row_data = row_item.get('data', {})
                    processed_row = {}
                    for col in all_columns:
                        processed_row[col] = row_data.get(col, '')
                    all_data.append(processed_row)
                
                rows_added = len(selected_data)
                total_rows += rows_added
                
                concat_log.append({
                    'file': file_entry['original_filename'],
                    'sheet': sheet_name,
                    'status': 'success',
                    'rows_added': rows_added,
                    'range': f"{row_range['start']}-{row_range['end'] or result.total_rows}"
                })
                
            except Exception as file_error:
                concat_log.append({
                    'file': file_entry['original_filename'],
                    'status': 'error',
                    'message': str(file_error)
                })
        
        if not all_data:
            return create_response(error="没有有效数据可拼接", status_code=400)
        
        df = pd.DataFrame(all_data, columns=all_columns)
        
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name=output_sheet_name, index=False)
        
        output_size = os.path.getsize(output_path)
        elapsed_time = time.time() - start_time
        
        history_entry = {
            'id': str(uuid.uuid4()),
            'session_id': session_id,
            'timestamp': datetime.now().isoformat(),
            'output_filename': output_filename,
            'output_path': output_path,
            'total_rows': total_rows,
            'total_files': len(session['files']),
            'elapsed_time': elapsed_time,
            'output_size': output_size,
            'log': concat_log
        }
        _concat_history.append(history_entry)
        
        _concat_sessions[session_id]['status'] = 'completed'
        _concat_sessions[session_id]['last_result'] = history_entry
        
        return create_response(data={
            'success': True,
            'output_filename': output_filename,
            'output_path': output_path,
            'output_size': output_size,
            'output_size_mb': round(output_size / (1024 * 1024), 2),
            'total_rows': total_rows,
            'total_files': len(session['files']),
            'elapsed_time': round(elapsed_time, 2),
            'log': concat_log
        })
        
    except Exception as e:
        print(f"执行拼接失败: {traceback.format_exc()}")
        return create_response(error=f"执行拼接失败: {str(e)}", status_code=500)


@excel_concat_bp.route('/api/excel_concat/download/<filename>', methods=['GET'])
def download_result(filename: str):
    """
    下载拼接结果文件
    
    Args:
        filename: 文件名
    
    Returns:
        文件下载
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        file_path = os.path.join(CONCAT_OUTPUT_FOLDER, filename)
        
        if not os.path.exists(file_path):
            return create_response(error="文件不存在", status_code=404)
        
        return send_file(
            file_path,
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        return create_response(error=f"下载文件失败: {str(e)}", status_code=500)


@excel_concat_bp.route('/api/excel_concat/history', methods=['GET'])
def get_history():
    """
    获取拼接历史记录
    
    Returns:
        历史记录列表
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        limit = int(request.args.get('limit', 20))
        history = _concat_history[-limit:]
        
        return create_response(data={
            'history': history,
            'total_count': len(_concat_history)
        })
        
    except Exception as e:
        return create_response(error=f"获取历史记录失败: {str(e)}", status_code=500)


@excel_concat_bp.route('/api/excel_concat/sheet_info', methods=['POST'])
def get_sheet_info():
    """
    获取指定工作表的详细信息
    
    Request body:
        - file_path: 文件路径
        - sheet_name: 工作表名称
    
    Returns:
        工作表详细信息
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        req_data = request.get_json()
        file_path = req_data.get('file_path')
        sheet_name = req_data.get('sheet_name')
        
        if not file_path or not os.path.exists(file_path):
            return create_response(error="文件不存在", status_code=400)
        
        reader = FastExcelReader(file_path)
        result = reader.read_sheet_fast(
            sheet_name_or_index=sheet_name,
            header_row=0,
            max_rows=100
        )
        
        if not result.success:
            return create_response(error=result.error, status_code=400)
        
        return create_response(data={
            'sheet_name': sheet_name,
            'columns': result.columns,
            'total_rows': result.total_rows,
            'preview_data': result.data[:10],
            'engine': result.engine
        })
        
    except Exception as e:
        return create_response(error=f"获取工作表信息失败: {str(e)}", status_code=500)
