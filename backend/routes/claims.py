"""
Claims processing routes.

This module handles patent claims processing, including file upload,
column selection, processing, status tracking, and result export.
"""

import os
import json
import traceback
import threading
from datetime import datetime
from flask import Blueprint, request, Response
from werkzeug.utils import secure_filename

from backend.middleware import login_required
from backend.utils import create_response
from patent_claims_processor.services import ProcessingService, ExportService
from patent_claims_processor.processors import ExcelProcessor


claims_bp = Blueprint('claims', __name__)

# Configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'uploads')
TASKS_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'tasks')
ALLOWED_EXTENSIONS = {'xlsx', 'xls'}

# Ensure folders exist
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
if not os.path.exists(TASKS_FOLDER):
    os.makedirs(TASKS_FOLDER)

# Store processing task status (in-memory, consider using Redis for production)
processing_tasks = {}


def save_task_to_disk(task_id: str, task_data: dict) -> None:
    """Save task data to disk for persistence"""
    try:
        task_file = os.path.join(TASKS_FOLDER, f"{task_id}.json")
        
        # Convert result object to dict if present
        if task_data.get('result'):
            result = task_data['result']
            task_data_copy = task_data.copy()
            task_data_copy['result'] = {
                'total_cells_processed': result.total_cells_processed,
                'total_claims_extracted': result.total_claims_extracted,
                'language_distribution': result.language_distribution,
                'independent_claims_count': result.independent_claims_count,
                'dependent_claims_count': result.dependent_claims_count,
                'claims_data': [
                    {
                        'claim_number': c.claim_number,
                        'claim_type': c.claim_type,
                        'claim_text': c.claim_text,
                        'language': c.language,
                        'referenced_claims': c.referenced_claims,
                        'original_text': c.original_text,
                        'confidence_score': c.confidence_score
                    } for c in result.claims_data
                ],
                'processing_errors': [
                    {
                        'error_type': e.error_type,
                        'cell_index': e.cell_index,
                        'error_message': e.error_message,
                        'suggested_action': e.suggested_action,
                        'severity': e.severity
                    } for e in result.processing_errors
                ]
            }
        else:
            task_data_copy = task_data.copy()
        
        with open(task_file, 'w', encoding='utf-8') as f:
            json.dump(task_data_copy, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Warning: Failed to save task to disk: {e}")


def load_task_from_disk(task_id: str) -> dict:
    """Load task data from disk"""
    try:
        task_file = os.path.join(TASKS_FOLDER, f"{task_id}.json")
        if os.path.exists(task_file):
            with open(task_file, 'r', encoding='utf-8') as f:
                task_data = json.load(f)
            
            # Convert dict back to result object if present
            if task_data.get('result') and isinstance(task_data['result'], dict):
                from patent_claims_processor.models import ProcessedClaims, ClaimInfo, ProcessingError
                
                result_dict = task_data['result']
                claims_data = [
                    ClaimInfo(**c) for c in result_dict.get('claims_data', [])
                ]
                processing_errors = [
                    ProcessingError(**e) for e in result_dict.get('processing_errors', [])
                ]
                
                task_data['result'] = ProcessedClaims(
                    total_cells_processed=result_dict['total_cells_processed'],
                    total_claims_extracted=result_dict['total_claims_extracted'],
                    language_distribution=result_dict['language_distribution'],
                    independent_claims_count=result_dict['independent_claims_count'],
                    dependent_claims_count=result_dict['dependent_claims_count'],
                    processing_errors=processing_errors,
                    claims_data=claims_data
                )
            
            return task_data
    except Exception as e:
        print(f"Warning: Failed to load task from disk: {e}")
    
    return None


def allowed_file(filename: str) -> bool:
    """
    Check if file extension is allowed.
    
    Args:
        filename: Name of the file to check
    
    Returns:
        True if file extension is allowed, False otherwise
    """
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@claims_bp.route('/claims/upload', methods=['POST'])
@login_required
def upload_claims_file():
    """
    Upload Excel file containing patent claims.
    
    Requirement 1.1: Validate file format and successfully read file content.
    
    Returns:
        JSON response with file information and columns
    """
    try:
        # Check if file exists in request
        if 'file' not in request.files:
            return create_response(error="未找到上传的文件", status_code=400)
        
        file = request.files['file']
        
        # Check filename
        if file.filename == '':
            return create_response(error="未选择文件", status_code=400)
        
        # Validate file type
        if not allowed_file(file.filename):
            return create_response(
                error="不支持的文件格式，请上传.xlsx或.xls文件",
                status_code=400
            )
        
        # Save file with timestamp
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_filename = f"{timestamp}_{filename}"
        file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        file.save(file_path)
        
        # Validate Excel file
        excel_processor = ExcelProcessor()
        
        if not excel_processor.validate_excel_file(file_path):
            os.remove(file_path)
            return create_response(
                error="无效的Excel文件格式",
                status_code=400
            )
        
        # Get sheet names and columns
        try:
            sheet_names = excel_processor.get_sheet_names(file_path)
            df = excel_processor.read_excel_file(file_path)
            columns = list(df.columns)
            
            return create_response(data={
                'file_id': unique_filename,
                'file_path': file_path,
                'original_filename': filename,
                'sheet_names': sheet_names,
                'columns': columns,
                'message': '文件上传成功'
            })
        except Exception as e:
            os.remove(file_path)
            return create_response(
                error=f"读取Excel文件失败: {str(e)}",
                status_code=400
            )
            
    except Exception as e:
        print(f"Error in upload_claims_file: {traceback.format_exc()}")
        return create_response(
            error=f"文件上传失败: {str(e)}",
            status_code=500
        )


@claims_bp.route('/claims/columns', methods=['POST'])
@login_required
def get_claims_columns():
    """
    Get column information for specified worksheet.
    
    Requirement 1.3: Allow users to select columns.
    
    Returns:
        JSON response with column names
    """
    try:
        req_data = request.get_json()
        
        file_path = req_data.get('file_path')
        sheet_name = req_data.get('sheet_name')
        
        if not file_path:
            return create_response(
                error="缺少必需参数: file_path",
                status_code=400
            )
        
        if not os.path.exists(file_path):
            return create_response(
                error="文件不存在",
                status_code=404
            )
        
        # Read columns from specified worksheet
        excel_processor = ExcelProcessor()
        df = excel_processor.read_excel_file(file_path, sheet_name=sheet_name)
        columns = list(df.columns)
        
        return create_response(data={
            'columns': columns,
            'sheet_name': sheet_name,
            'message': '列信息获取成功'
        })
        
    except Exception as e:
        print(f"Error in get_claims_columns: {traceback.format_exc()}")
        return create_response(
            error=f"获取列信息失败: {str(e)}",
            status_code=500
        )


@claims_bp.route('/claims/process', methods=['POST'])
@login_required
def process_claims():
    """
    Process patent claims file.
    
    Requirements:
    - 1.2, 1.3: Allow users to select worksheet and columns
    - 2.1-2.4: Multi-language processing
    - 3.1-3.4: Claims parsing and extraction
    
    Returns:
        JSON response with task ID
    """
    try:
        req_data = request.get_json()
        
        file_id = req_data.get('file_id')
        column_name = req_data.get('column_name')
        sheet_name = req_data.get('sheet_name')
        
        if not file_id or not column_name:
            return create_response(
                error="缺少必需参数: file_id 和 column_name",
                status_code=400
            )
        
        # Build file path
        file_path = os.path.join(UPLOAD_FOLDER, file_id)
        
        if not os.path.exists(file_path):
            return create_response(
                error="文件不存在",
                status_code=404
            )
        
        # Validate claims content before processing
        try:
            excel_processor = ExcelProcessor()
            df = excel_processor.read_excel_file(file_path, sheet_name=sheet_name)
            
            if column_name not in df.columns:
                return create_response(
                    error=f"列'{column_name}'不存在",
                    status_code=400
                )
            
            column_data = excel_processor.get_column_data(df, column_name)
            
            # Check if content contains "权利要求" keywords in multiple languages
            claims_keywords = [
                # 中文
                '权利要求', '請求項', '請求项',
                # 英文
                'claim', 'claims', 'Claim', 'Claims', 'CLAIM', 'CLAIMS',
                # 日文
                '請求項', 'クレーム',
                # 韩文
                '청구항', '請求項',
                # 德文
                'Anspruch', 'Ansprüche', 'anspruch', 'ansprüche',
                # 法文
                'revendication', 'revendications', 'Revendication', 'Revendications',
                # 西班牙文
                'reivindicación', 'reivindicaciones', 'Reivindicación', 'Reivindicaciones',
                # 葡萄牙文
                'reivindicação', 'reivindicações', 'Reivindicação', 'Reivindicações',
                # 俄文
                'пункт формулы', 'формула изобретения',
                # 意大利文
                'rivendicazione', 'rivendicazioni', 'Rivendicazione', 'Rivendicazioni',
                # 荷兰文
                'conclusie', 'conclusies', 'Conclusie', 'Conclusies',
                # 阿拉伯文
                'مطالبة', 'مطالبات'
            ]
            cells_with_keywords = 0
            total_non_empty_cells = 0
            
            for cell_text in column_data:
                if cell_text and cell_text.strip() and cell_text != 'nan':
                    total_non_empty_cells += 1
                    if any(keyword in cell_text for keyword in claims_keywords):
                        cells_with_keywords += 1
            
            # If less than 50% of cells contain claims keywords, warn user
            if total_non_empty_cells > 0:
                keyword_ratio = cells_with_keywords / total_non_empty_cells
                if keyword_ratio < 0.5:
                    return create_response(
                        error=f"警告：所选列中仅有 {int(keyword_ratio * 100)}% 的单元格包含权利要求相关字样。请核对是否选择了正确的权利要求文本列。",
                        status_code=400
                    )
        except Exception as e:
            print(f"Error validating claims content: {traceback.format_exc()}")
            return create_response(
                error=f"验证权利要求内容失败: {str(e)}",
                status_code=400
            )
        
        # Create task ID based on file_id to allow overwriting
        task_id = f"task_{file_id}_{sheet_name or 'default'}"
        
        # Clean up old task if exists (allow overwriting)
        if task_id in processing_tasks:
            old_task = processing_tasks[task_id]
            if old_task['status'] == 'processing':
                return create_response(
                    error="该文件和工作表的处理任务正在进行中，请等待完成",
                    status_code=400
                )
            # Remove old completed/failed task
            del processing_tasks[task_id]
        
        # Initialize task status
        processing_tasks[task_id] = {
            'status': 'processing',
            'progress': 0,
            'message': '正在处理...',
            'result': None,
            'error': None,
            'file_id': file_id,
            'sheet_name': sheet_name
        }
        
        # Process file in background thread
        def process_in_background():
            try:
                # Create processing service
                processing_service = ProcessingService()
                
                # Process Excel file
                result = processing_service.process_excel_file(
                    file_path=file_path,
                    column_name=column_name,
                    sheet_name=sheet_name
                )
                
                # Update task status
                processing_tasks[task_id]['status'] = 'completed'
                processing_tasks[task_id]['progress'] = 100
                processing_tasks[task_id]['message'] = '处理完成'
                processing_tasks[task_id]['result'] = result
                
                # Save task to disk for persistence
                save_task_to_disk(task_id, processing_tasks[task_id])
                
            except Exception as e:
                print(f"Error in background processing: {traceback.format_exc()}")
                processing_tasks[task_id]['status'] = 'failed'
                processing_tasks[task_id]['error'] = str(e)
                processing_tasks[task_id]['message'] = f'处理失败: {str(e)}'
                
                # Save failed task to disk as well
                save_task_to_disk(task_id, processing_tasks[task_id])
        
        thread = threading.Thread(target=process_in_background)
        thread.daemon = True
        thread.start()
        
        return create_response(data={
            'task_id': task_id,
            'message': '处理任务已启动'
        })
        
    except Exception as e:
        print(f"Error in process_claims: {traceback.format_exc()}")
        return create_response(
            error=f"启动处理任务失败: {str(e)}",
            status_code=500
        )


@claims_bp.route('/claims/status/<task_id>', methods=['GET'])
@login_required
def get_processing_status(task_id):
    """
    Get processing task status.
    
    Requirement 7.3: Provide progress feedback.
    
    Args:
        task_id: Task identifier
    
    Returns:
        JSON response with task status and progress
    """
    try:
        # Try to get from memory first
        if task_id not in processing_tasks:
            # Try to load from disk
            task_data = load_task_from_disk(task_id)
            if task_data:
                processing_tasks[task_id] = task_data
            else:
                return create_response(
                    error="任务不存在",
                    status_code=404
                )
        
        task = processing_tasks[task_id]
        
        response_data = {
            'task_id': task_id,
            'status': task['status'],
            'progress': task['progress'],
            'message': task['message']
        }
        
        # Add result summary if completed
        if task['status'] == 'completed' and task['result']:
            result = task['result']
            response_data['summary'] = {
                'total_cells_processed': result.total_cells_processed,
                'total_claims_extracted': result.total_claims_extracted,
                'independent_claims_count': result.independent_claims_count,
                'dependent_claims_count': result.dependent_claims_count,
                'language_distribution': result.language_distribution,
                'error_count': len(result.processing_errors)
            }
        
        # Add error information if failed
        if task['status'] == 'failed':
            response_data['error'] = task['error']
        
        return create_response(data=response_data)
        
    except Exception as e:
        print(f"Error in get_processing_status: {traceback.format_exc()}")
        return create_response(
            error=f"获取任务状态失败: {str(e)}",
            status_code=500
        )


@claims_bp.route('/claims/result/<task_id>', methods=['GET'])
@login_required
def get_processing_result(task_id):
    """
    Get detailed processing results.
    
    Requirements 6.1, 6.2: Generate structured data with all claims information.
    
    Args:
        task_id: Task identifier
    
    Returns:
        JSON response with detailed results
    """
    try:
        # Try to get from memory first
        if task_id not in processing_tasks:
            # Try to load from disk
            task_data = load_task_from_disk(task_id)
            if task_data:
                processing_tasks[task_id] = task_data
            else:
                return create_response(
                    error="任务不存在",
                    status_code=404
                )
        
        task = processing_tasks[task_id]
        
        if task['status'] != 'completed':
            return create_response(
                error=f"任务尚未完成，当前状态: {task['status']}",
                status_code=400
            )
        
        result = task['result']
        
        # Build detailed results
        claims_list = []
        for claim in result.claims_data:
            claims_list.append({
                'claim_number': claim.claim_number,
                'claim_type': claim.claim_type,
                'claim_text': claim.claim_text,
                'language': claim.language,
                'referenced_claims': claim.referenced_claims,
                'original_text': claim.original_text,
                'confidence_score': claim.confidence_score
            })
        
        errors_list = []
        for error in result.processing_errors:
            errors_list.append({
                'error_type': error.error_type,
                'cell_index': error.cell_index,
                'error_message': error.error_message,
                'suggested_action': error.suggested_action,
                'severity': error.severity
            })
        
        response_data = {
            'summary': {
                'total_cells_processed': result.total_cells_processed,
                'total_claims_extracted': result.total_claims_extracted,
                'independent_claims_count': result.independent_claims_count,
                'dependent_claims_count': result.dependent_claims_count,
                'language_distribution': result.language_distribution,
                'error_count': len(result.processing_errors)
            },
            'claims': claims_list,
            'errors': errors_list
        }
        
        return create_response(data=response_data)
        
    except Exception as e:
        print(f"Error in get_processing_result: {traceback.format_exc()}")
        return create_response(
            error=f"获取处理结果失败: {str(e)}",
            status_code=500
        )


@claims_bp.route('/claims/export/<task_id>', methods=['POST'])
@login_required
def export_claims_result(task_id):
    """
    Export processing results.
    
    Requirement 6.3: Support exporting results to Excel or JSON format.
    
    Args:
        task_id: Task identifier
    
    Returns:
        File download response
    """
    try:
        # Try to get from memory first
        if task_id not in processing_tasks:
            # Try to load from disk
            task_data = load_task_from_disk(task_id)
            if task_data:
                processing_tasks[task_id] = task_data
            else:
                return create_response(
                    error="任务不存在",
                    status_code=404
                )
        
        task = processing_tasks[task_id]
        
        if task['status'] != 'completed':
            return create_response(
                error=f"任务尚未完成，当前状态: {task['status']}",
                status_code=400
            )
        
        req_data = request.get_json()
        export_format = req_data.get('format', 'excel')  # 'excel' or 'json'
        
        result = task['result']
        
        # Create export service
        export_service = ExportService()
        
        # Export based on format
        if export_format == 'json':
            output_path = export_service.export_to_json(result)
            mimetype = 'application/json'
            file_extension = 'json'
        elif export_format == 'excel':
            output_path = export_service.export_to_excel(result)
            mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            file_extension = 'xlsx'
        else:
            return create_response(
                error="不支持的导出格式，请使用 'excel' 或 'json'",
                status_code=400
            )
        
        # Read file content
        with open(output_path, 'rb') as f:
            file_content = f.read()
        
        # Get filename
        filename = os.path.basename(output_path)
        
        # Clean up temporary file
        try:
            os.remove(output_path)
        except Exception as cleanup_error:
            print(f"Warning: Failed to cleanup temp file: {cleanup_error}")
        
        # Create response with proper headers
        response = Response(
            file_content,
            mimetype=mimetype,
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"',
                'Content-Type': mimetype,
                'Content-Length': str(len(file_content))
            }
        )
        
        return response
        
    except Exception as e:
        print(f"Error in export_claims_result: {traceback.format_exc()}")
        return create_response(
            error=f"导出结果失败: {str(e)}",
            status_code=500
        )


@claims_bp.route('/claims/report/<task_id>', methods=['GET'])
@login_required
def get_processing_report(task_id):
    """
    Get processing report.
    
    Requirement 6.4: Generate detailed error report and processing statistics.
    
    Args:
        task_id: Task identifier
    
    Returns:
        JSON response with report text
    """
    try:
        # Try to get from memory first
        if task_id not in processing_tasks:
            # Try to load from disk
            task_data = load_task_from_disk(task_id)
            if task_data:
                processing_tasks[task_id] = task_data
            else:
                return create_response(
                    error="任务不存在",
                    status_code=404
                )
        
        task = processing_tasks[task_id]
        
        if task['status'] != 'completed':
            return create_response(
                error=f"任务尚未完成，当前状态: {task['status']}",
                status_code=400
            )
        
        result = task['result']
        
        # Create export service
        export_service = ExportService()
        
        # Generate report text
        report_text = export_service.generate_processing_report(result)
        
        return create_response(data={
            'report': report_text
        })
        
    except Exception as e:
        print(f"Error in get_processing_report: {traceback.format_exc()}")
        return create_response(
            error=f"生成报告失败: {str(e)}",
            status_code=500
        )
