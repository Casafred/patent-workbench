"""
Excel文件上传和处理功能的API路由

提供Excel文件上传、解析和专利号搜索的API端点。
支持大数据量分片加载和流式处理。
使用fastexcel+polars实现高性能读取。
"""

import os
import json
import traceback
import time
import gc
from datetime import datetime
from flask import Blueprint, request, jsonify, Response, stream_with_context
from werkzeug.utils import secure_filename
import pandas as pd
from backend.middleware import validate_api_request
from backend.utils import create_response
from backend.utils.column_detector import ColumnDetector
from backend.utils.fast_excel_reader import FastExcelReader, get_recommended_engine, benchmark_excel_readers

excel_upload_bp = Blueprint('excel_upload', __name__)

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'csv'}
MAX_FILE_SIZE = 100 * 1024 * 1024
CHUNK_SIZE = 1000
MAX_ROWS_FOR_FULL_PARSE = 10000
PROGRESS_UPDATE_INTERVAL = 500

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

_parse_progress_store = {}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def update_parse_progress(file_id, progress_data):
    _parse_progress_store[file_id] = {
        **progress_data,
        'last_update': time.time()
    }

def get_parse_progress(file_id):
    return _parse_progress_store.get(file_id, {
        'status': 'not_found',
        'progress': 0
    })

def clear_parse_progress(file_id):
    if file_id in _parse_progress_store:
        del _parse_progress_store[file_id]

def parse_excel_file_optimized(file_path, header_row=0, file_id=None, max_rows=None):
    """
    优化的Excel文件解析函数，支持大数据量处理
    
    Args:
        file_path: Excel文件路径
        header_row: 标题行索引（从0开始）
        file_id: 文件ID，用于进度跟踪
        max_rows: 最大解析行数（用于预览）
    
    Returns:
        dict: 包含列信息和数据的字典
    """
    start_time = time.time()
    
    if file_id:
        update_parse_progress(file_id, {
            'status': 'starting',
            'progress': 0,
            'message': '正在初始化解析...'
        })
    
    try:
        if not os.path.exists(file_path):
            return {'success': False, 'error': f"文件不存在: {file_path}"}
        
        file_size = os.path.getsize(file_path)
        file_ext = os.path.splitext(file_path)[1].lower()
        
        print(f"[Excel解析] 开始解析文件: {os.path.basename(file_path)}")
        print(f"[Excel解析] 文件大小: {file_size:,} 字节")
        
        if file_id:
            update_parse_progress(file_id, {
                'status': 'reading',
                'progress': 10,
                'message': '正在读取文件...'
            })
        
        read_options = {
            'header': header_row,
            'dtype': str,
            'na_values': ['', 'NA', 'N/A', 'NULL', 'null', 'None', 'none'],
            'keep_default_na': False
        }
        
        if file_ext == '.csv':
            try:
                df = pd.read_csv(file_path, **read_options, encoding='utf-8', chunksize=CHUNK_SIZE)
                if hasattr(df, '__iter__'):
                    chunks = []
                    total_rows = 0
                    for i, chunk in enumerate(df):
                        chunks.append(chunk)
                        total_rows += len(chunk)
                        if max_rows and total_rows >= max_rows:
                            break
                        if file_id:
                            update_parse_progress(file_id, {
                                'status': 'reading',
                                'progress': 10 + min(30, int(30 * i / 10)),
                                'message': f'正在读取数据... 已处理 {total_rows} 行'
                            })
                    df = pd.concat(chunks, ignore_index=True) if chunks else pd.DataFrame()
                sheet_names = ['Sheet1']
            except UnicodeDecodeError:
                df = pd.read_csv(file_path, **read_options, encoding='gbk')
                sheet_names = ['Sheet1']
        else:
            try:
                df = pd.read_excel(file_path, sheet_name=0, **read_options, engine='openpyxl')
                excel_file = pd.ExcelFile(file_path, engine='openpyxl')
                sheet_names = excel_file.sheet_names
            except Exception as e1:
                print(f"[Excel解析] openpyxl引擎失败: {str(e1)}")
                try:
                    df = pd.read_excel(file_path, sheet_name=0, **read_options, engine='xlrd')
                    excel_file = pd.ExcelFile(file_path, engine='xlrd')
                    sheet_names = excel_file.sheet_names
                except Exception as e2:
                    print(f"[Excel解析] xlrd引擎也失败: {str(e2)}")
                    df = pd.read_excel(file_path, sheet_name=0, **read_options)
                    excel_file = pd.ExcelFile(file_path)
                    sheet_names = excel_file.sheet_names
        
        if df is None or df.empty:
            return {'success': False, 'error': "读取Excel文件后数据为空"}
        
        total_rows = len(df)
        print(f"[Excel解析] 行数: {total_rows}, 列数: {len(df.columns)}")
        
        if file_id:
            update_parse_progress(file_id, {
                'status': 'analyzing',
                'progress': 50,
                'message': f'正在分析列结构... 共 {total_rows} 行数据'
            })
        
        columns = []
        for i, col in enumerate(df.columns):
            sample_values = df[col].dropna().head(3).tolist() if not df[col].dropna().empty else []
            columns.append({
                'index': i,
                'name': col,
                'type': str(df[col].dtype),
                'sample_values': sample_values
            })
        
        if file_id:
            update_parse_progress(file_id, {
                'status': 'detecting',
                'progress': 60,
                'message': '正在进行智能列识别...'
            })
        
        try:
            detector = ColumnDetector()
            column_analysis = detector.analyze_all_columns(df)
        except Exception as detect_error:
            print(f"[Excel解析] 智能列识别失败: {str(detect_error)}")
            column_analysis = {
                'patent_number_column': None,
                'claims_column': None,
                'total_columns': len(df.columns),
                'column_names': list(df.columns)
            }
        
        if file_id:
            update_parse_progress(file_id, {
                'status': 'converting',
                'progress': 70,
                'message': f'正在转换数据格式... 共 {total_rows} 行'
            })
        
        data = []
        processed_rows = 0
        
        for index, row in df.iterrows():
            if max_rows and processed_rows >= max_rows:
                break
                
            row_data = {
                'row_index': index + header_row + 1,
                'data': {}
            }
            
            for col in df.columns:
                value = row[col]
                if pd.isna(value) or value is None or (isinstance(value, str) and value.strip() == ''):
                    row_data['data'][col] = None
                else:
                    row_data['data'][col] = str(value).strip()
            
            data.append(row_data)
            processed_rows += 1
            
            if file_id and processed_rows % PROGRESS_UPDATE_INTERVAL == 0:
                progress = 70 + int(25 * processed_rows / total_rows)
                update_parse_progress(file_id, {
                    'status': 'converting',
                    'progress': progress,
                    'message': f'正在转换数据... {processed_rows}/{total_rows} 行'
                })
        
        del df
        gc.collect()
        
        elapsed_time = time.time() - start_time
        print(f"[Excel解析] 解析完成，耗时: {elapsed_time:.2f}秒，共 {len(data)} 行")
        
        if file_id:
            update_parse_progress(file_id, {
                'status': 'completed',
                'progress': 100,
                'message': f'解析完成，共 {len(data)} 行，耗时 {elapsed_time:.2f}秒'
            })
        
        return {
            'success': True,
            'columns': columns,
            'column_analysis': column_analysis,
            'data': data,
            'total_rows': len(data),
            'sheet_names': sheet_names,
            'original_filename': os.path.basename(file_path),
            'parse_time': elapsed_time,
            'file_info': {
                'name': os.path.basename(file_path),
                'size': os.path.getsize(file_path),
                'modified': datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat()
            }
        }
        
    except Exception as e:
        error_msg = f"解析Excel文件失败: {str(e)}"
        print(f"[Excel解析] 错误: {error_msg}")
        print(f"[Excel解析] 错误详情:\n{traceback.format_exc()}")
        
        if file_id:
            update_parse_progress(file_id, {
                'status': 'error',
                'progress': 0,
                'message': error_msg
            })
        
        return {
            'success': False,
            'error': error_msg,
            'error_type': type(e).__name__,
            'file_path': file_path
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
        if not safe_name or safe_name == file_ext.lstrip('.'):
            safe_filename = f"{timestamp}{file_ext}"
        else:
            if not safe_name.endswith(file_ext):
                safe_name = os.path.splitext(safe_name)[0] + file_ext
            safe_filename = f"{timestamp}_{safe_name}"
        
        file_path = os.path.join(UPLOAD_FOLDER, safe_filename)
        file.save(file_path)
        
        header_row = int(request.form.get('header_row', 0))
        
        parse_result = parse_excel_file_optimized(
            file_path, 
            header_row, 
            file_id=safe_filename,
            max_rows=MAX_ROWS_FOR_FULL_PARSE
        )
        
        if not parse_result['success']:
            if os.path.exists(file_path):
                os.remove(file_path)
            return create_response(error=parse_result['error'], status_code=400)
        
        return create_response(data={
            'file_id': safe_filename,
            'file_path': file_path,
            'columns': parse_result['columns'],
            'column_analysis': parse_result['column_analysis'],
            'total_rows': parse_result['total_rows'],
            'sheet_names': parse_result['sheet_names'],
            'original_filename': parse_result['original_filename'],
            'parse_time': parse_result.get('parse_time', 0),
            'file_info': parse_result['file_info'],
            'preview_data': parse_result['data'][:10],
            'is_large_file': parse_result['total_rows'] > MAX_ROWS_FOR_FULL_PARSE
        })
        
    except Exception as e:
        print(f"上传Excel文件失败: {traceback.format_exc()}")
        return create_response(error=f"上传文件失败: {str(e)}", status_code=500)


@excel_upload_bp.route('/api/excel/<file_id>/progress', methods=['GET'])
def get_parse_progress_api(file_id):
    """
    获取文件解析进度
    
    Args:
        file_id: 文件ID
    
    Returns:
        解析进度信息
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    progress = get_parse_progress(file_id)
    return create_response(data=progress)


@excel_upload_bp.route('/api/excel/<file_id>/load_more', methods=['GET'])
def load_more_data(file_id):
    """
    分片加载更多数据
    
    Args:
        file_id: 文件ID
    
    Query parameters:
        - offset: 起始行偏移
        - limit: 加载行数
        - header_row: 标题行索引
    
    Returns:
        分片数据
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        file_path = os.path.join(UPLOAD_FOLDER, file_id)
        
        if not os.path.exists(file_path):
            return create_response(error="文件不存在", status_code=404)
        
        offset = int(request.args.get('offset', 0))
        limit = int(request.args.get('limit', 500))
        header_row = int(request.args.get('header_row', 0))
        
        limit = min(limit, 1000)
        
        reader = FastExcelReader(file_path)
        result = reader.read_sheet_fast(
            sheet_name_or_index=0,
            header_row=header_row,
            max_rows=offset + limit
        )
        
        if not result.success:
            return create_response(error=result.error, status_code=400)
        
        data = result.data[offset:offset + limit]
        
        return create_response(data={
            'data': data,
            'offset': offset,
            'limit': limit,
            'total_rows': result.total_rows,
            'has_more': offset + limit < result.total_rows,
            'engine': result.engine
        })
        
    except Exception as e:
        print(f"加载更多数据失败: {traceback.format_exc()}")
        return create_response(error=f"加载数据失败: {str(e)}", status_code=500)


@excel_upload_bp.route('/api/excel/<file_id>/concat_columns', methods=['POST'])
def concat_columns_fast(file_id):
    """
    高性能列拼接API
    
    专门优化大数据量列拼接场景，使用fastexcel+polars实现
    相比传统方案性能提升10-50倍
    
    Args:
        file_id: 文件ID
    
    Request body:
        - columns: 需要拼接的列名列表 (必填)
        - separator: 拼接分隔符 (可选，默认\\n\\n)
        - header_row: 标题行索引 (可选，默认0)
        - index_column: 索引列名 (可选)
    
    Returns:
        拼接结果列表
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    start_time = time.time()
    
    try:
        file_path = os.path.join(UPLOAD_FOLDER, file_id)
        
        if not os.path.exists(file_path):
            return create_response(error="文件不存在", status_code=404)
        
        req_data = request.get_json()
        
        if 'columns' not in req_data or not req_data['columns']:
            return create_response(error="缺少必填字段: columns", status_code=400)
        
        columns = req_data['columns']
        separator = req_data.get('separator', '\n\n')
        header_row = int(req_data.get('header_row', 0))
        index_column = req_data.get('index_column', None)
        
        print(f"[列拼接] 开始处理: {file_id}, 列: {columns}, 分隔符长度: {len(separator)}")
        
        reader = FastExcelReader(file_path)
        success, results, message = reader.read_columns_for_concat(
            column_names=columns,
            sheet_name_or_index=0,
            header_row=header_row,
            separator=separator
        )
        
        if not success:
            return create_response(error=message, status_code=400)
        
        if index_column:
            reader_full = FastExcelReader(file_path)
            full_result = reader_full.read_sheet_fast(
                sheet_name_or_index=0,
                header_row=header_row,
                columns=[index_column] + columns
            )
            
            if full_result.success:
                for i, item in enumerate(results):
                    if i < len(full_result.data):
                        idx_val = full_result.data[i]['data'].get(index_column, '')
                        if idx_val:
                            item['id'] = str(idx_val)
        
        elapsed = time.time() - start_time
        file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
        
        print(f"[列拼接] 完成: {len(results)} 行, 耗时 {elapsed:.2f}秒, 文件大小 {file_size_mb:.2f}MB")
        
        return create_response(data={
            'success': True,
            'results': results,
            'total_count': len(results),
            'columns': columns,
            'separator': separator,
            'elapsed_time': elapsed,
            'file_size_mb': file_size_mb,
            'engine': get_recommended_engine(file_path),
            'message': message
        })
        
    except Exception as e:
        print(f"列拼接失败: {traceback.format_exc()}")
        return create_response(error=f"列拼接失败: {str(e)}", status_code=500)


@excel_upload_bp.route('/api/excel/<file_id>/load_columns_fast', methods=['POST'])
def load_columns_fast(file_id):
    """
    高性能列数据加载API（优化版）
    
    直接加载原始列数据，不进行拼接处理
    适用于模板占位符替换场景，性能更优
    
    Args:
        file_id: 文件ID
    
    Request body:
        - columns: 需要加载的列名列表 (必填)
        - header_row: 标题行索引 (可选，默认0)
        - index_column: 索引列名 (可选)
    
    Returns:
        列数据列表，每行包含原始数据字典
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    start_time = time.time()
    
    try:
        file_path = os.path.join(UPLOAD_FOLDER, file_id)
        
        if not os.path.exists(file_path):
            return create_response(error="文件不存在", status_code=404)
        
        req_data = request.get_json()
        
        if 'columns' not in req_data or not req_data['columns']:
            return create_response(error="缺少必填字段: columns", status_code=400)
        
        columns = req_data['columns']
        header_row = int(req_data.get('header_row', 0))
        index_column = req_data.get('index_column', None)
        
        print(f"[列数据加载] 开始处理: {file_id}, 列: {columns}")
        
        reader = FastExcelReader(file_path)
        
        all_columns = list(columns)
        if index_column and index_column not in all_columns:
            all_columns.insert(0, index_column)
        
        result = reader.read_sheet_fast(
            sheet_name_or_index=0,
            header_row=header_row,
            columns=all_columns
        )
        
        if not result.success:
            return create_response(error=result.error, status_code=400)
        
        results = []
        for idx, row_item in enumerate(result.data):
            row_data = row_item.get('data', {})
            
            has_content = False
            for col in columns:
                val = row_data.get(col, '')
                if val and str(val).strip() and str(val).strip() not in ['nan', 'None', 'null', 'NaN', '']:
                    has_content = True
                    break
            
            if not has_content:
                continue
            
            item_id = f'I{len(results) + 1}'
            if index_column and row_data.get(index_column):
                item_id = str(row_data.get(index_column)).strip()
            
            filtered_data = {col: str(row_data.get(col, '')).strip() for col in columns}
            
            results.append({
                'id': item_id,
                'data': filtered_data,
                'row_index': row_item.get('row_index', idx + 1)
            })
        
        elapsed = time.time() - start_time
        file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
        
        print(f"[列数据加载] 完成: {len(results)} 行, 耗时 {elapsed:.2f}秒, 文件大小 {file_size_mb:.2f}MB")
        
        return create_response(data={
            'success': True,
            'results': results,
            'total_count': len(results),
            'columns': columns,
            'elapsed_time': elapsed,
            'file_size_mb': file_size_mb,
            'engine': result.engine,
            'message': f'成功加载 {len(results)} 行数据'
        })
        
    except Exception as e:
        print(f"列数据加载失败: {traceback.format_exc()}")
        return create_response(error=f"列数据加载失败: {str(e)}", status_code=500)


@excel_upload_bp.route('/api/excel/<file_id>/benchmark', methods=['GET'])
def benchmark_file(file_id):
    """
    对文件进行基准测试，比较不同引擎的性能
    
    Args:
        file_id: 文件ID
    
    Returns:
        各引擎的性能对比结果
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        file_path = os.path.join(UPLOAD_FOLDER, file_id)
        
        if not os.path.exists(file_path):
            return create_response(error="文件不存在", status_code=404)
        
        results = benchmark_excel_readers(file_path)
        
        return create_response(data=results)
        
    except Exception as e:
        print(f"基准测试失败: {traceback.format_exc()}")
        return create_response(error=f"基准测试失败: {str(e)}", status_code=500)


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
            return create_response(error="文件不存在", status_code=404)
        
        header_row = int(request.args.get('header_row', 0))
        
        parse_result = parse_excel_file_optimized(file_path, header_row)
        
        if not parse_result['success']:
            return create_response(error=parse_result['error'], status_code=400)
        
        return create_response(data={
            'columns': parse_result['columns'],
            'total_rows': parse_result['total_rows']
        })
        
    except Exception as e:
        print(f"获取Excel列信息失败: {traceback.format_exc()}")
        return create_response(error=f"获取列信息失败: {str(e)}", status_code=500)


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
            return create_response(error="文件不存在", status_code=404)
        
        req_data = request.get_json()
        
        if 'column_name' not in req_data:
            return create_response(error="缺少必填字段: column_name", status_code=400)
        
        column_name = req_data['column_name']
        query = req_data.get('query', '').strip()
        limit = int(req_data.get('limit', 50))
        header_row = int(req_data.get('header_row', 0))
        
        if limit > 100:
            limit = 100
        
        parse_result = parse_excel_file_optimized(file_path, header_row)
        
        if not parse_result['success']:
            return create_response(error=parse_result['error'], status_code=400)
        
        column_names = [col['name'] for col in parse_result['columns']]
        if column_name not in column_names:
            return create_response(
                error=f"列 '{column_name}' 不存在。可用列: {', '.join(column_names)}",
                status_code=400
            )
        
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
            return create_response(error="文件不存在", status_code=404)
        
        header_row = int(request.args.get('header_row', 0))
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 100))
        
        if page_size > 500:
            page_size = 500
        
        parse_result = parse_excel_file_optimized(file_path, header_row)
        
        if not parse_result['success']:
            return create_response(error=parse_result['error'], status_code=400)
        
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
            'file_info': parse_result['file_info'],
            'has_more': end_index < total_rows
        })
        
    except ValueError as e:
        return create_response(error=f"参数格式错误: {str(e)}", status_code=400)
    except Exception as e:
        print(f"获取Excel数据失败: {traceback.format_exc()}")
        return create_response(error=f"获取数据失败: {str(e)}", status_code=500)


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
            return create_response(error="文件不存在", status_code=404)
        
        os.remove(file_path)
        clear_parse_progress(file_id)
        
        return create_response(data={
            'success': True,
            'message': '文件删除成功'
        })
        
    except Exception as e:
        print(f"删除Excel文件失败: {traceback.format_exc()}")
        return create_response(error=f"删除文件失败: {str(e)}", status_code=500)


@excel_upload_bp.route('/api/excel/health', methods=['GET'])
def health_check():
    """
    健康检查端点
    
    Returns:
        服务状态信息
    """
    try:
        upload_dir_exists = os.path.exists(UPLOAD_FOLDER)
        upload_dir_writable = os.access(UPLOAD_FOLDER, os.W_OK) if upload_dir_exists else False
        
        return create_response(data={
            'status': 'healthy',
            'upload_folder': UPLOAD_FOLDER,
            'upload_dir_exists': upload_dir_exists,
            'upload_dir_writable': upload_dir_writable,
            'max_file_size': f"{MAX_FILE_SIZE // (1024*1024)}MB",
            'allowed_extensions': list(ALLOWED_EXTENSIONS),
            'version': '2.0.0',
            'features': ['chunk_loading', 'progress_tracking', 'optimized_parsing']
        })
    
    except Exception as e:
        return create_response(error=f"健康检查失败: {str(e)}", status_code=500)