"""
File Parser Service.

This module handles file parsing using ZhipuAI's new File Parser API.
Supports multiple file formats and parsing services (Lite, Expert, Prime).
"""

import os
import time
import logging
import requests
from typing import Optional, Dict, Any, Tuple

logger = logging.getLogger(__name__)


class FileParserService:
    """Service for parsing files using ZhipuAI File Parser API."""
    
    # Supported file formats
    SUPPORTED_FORMATS = {
        # 文档格式（所有服务支持）
        'PDF', 'DOCX', 'DOC', 'XLS', 'XLSX', 'PPT', 'PPTX', 'TXT', 'MD', 'CSV',
        # Prime 额外支持的文档格式
        'HTML', 'EPUB',
        # 图片格式（所有服务支持）
        'PNG', 'JPG', 'JPEG',
        # Prime 额外支持的图片格式
        'BMP', 'GIF', 'WEBP', 'HEIC', 'EPS', 'ICNS', 'IM', 'PCX', 'PPM', 
        'TIFF', 'XBM', 'HEIF', 'JP2'
    }
    
    # File size limits (in bytes)
    SIZE_LIMITS = {
        'PDF': 100 * 1024 * 1024,      # 100MB
        'XLS': 10 * 1024 * 1024,       # 10MB
        'XLSX': 10 * 1024 * 1024,      # 10MB
        'CSV': 10 * 1024 * 1024,       # 10MB
        'PNG': 20 * 1024 * 1024,       # 20MB
        'JPG': 20 * 1024 * 1024,       # 20MB
        'JPEG': 20 * 1024 * 1024,      # 20MB
        'DEFAULT': 50 * 1024 * 1024    # 50MB for others
    }
    
    # Parsing service types
    TOOL_TYPES = ['lite', 'expert', 'prime']
    
    def __init__(self, api_key: str):
        """
        Initialize FileParserService.
        
        Args:
            api_key: ZhipuAI API key
        """
        self.api_key = api_key
        self.base_url = "https://open.bigmodel.cn/api/paas/v4"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def create_parser_task(
        self, 
        file_path: str, 
        tool_type: str = "lite",
        file_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a file parsing task.
        
        Args:
            file_path: Local file path
            tool_type: Parsing tool type (lite, expert, prime)
            file_type: File type (PDF, DOCX, etc.). Auto-detected if None.
        
        Returns:
            {
                "task_id": "Parsing task ID",
                "status": "processing"
            }
        
        Raises:
            ValueError: If file validation fails
            requests.RequestException: If API call fails
        """
        # Validate tool type
        if tool_type not in self.TOOL_TYPES:
            raise ValueError(f"Invalid tool_type: {tool_type}. Must be one of {self.TOOL_TYPES}")
        
        # Detect file type if not provided
        if file_type is None:
            file_type = self._detect_file_type(file_path)
        
        # Validate file type
        self._validate_file_type(file_type)
        
        # Validate file size
        self._validate_file_size(file_path, file_type)
        
        # Prepare request
        url = f"{self.base_url}/files/parser/create"
        
        try:
            with open(file_path, 'rb') as f:
                files = {
                    'file': (os.path.basename(file_path), f, self._get_mime_type(file_type))
                }
                data = {
                    'tool_type': tool_type,
                    'file_type': file_type
                }
                
                # Remove Content-Type header for multipart/form-data
                headers = {"Authorization": f"Bearer {self.api_key}"}
                
                response = requests.post(url, headers=headers, files=files, data=data, timeout=30)
                response.raise_for_status()
                
                result = response.json()
                
                # 根据官方文档，响应格式为：
                # {"message": "任务创建成功", "success": true, "task_id": "task_id"}
                if not result.get('success'):
                    error_msg = result.get('message', 'Unknown error')
                    logger.error(f"API returned success=false: {error_msg}")
                    raise ValueError(f"API调用失败: {error_msg}")
                
                task_id = result.get('task_id')
                if not task_id:
                    logger.error(f"API response missing task_id: {result}")
                    raise ValueError("API返回的响应中缺少task_id")
                
                logger.info(f"Parser task created successfully: {task_id}")
                
                return {
                    "task_id": task_id,
                    "status": "processing"
                }
                
        except requests.RequestException as e:
            logger.error(f"Failed to create parser task: {e}")
            # Try to extract error details from response
            error_msg = str(e)
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_data = e.response.json()
                    error_msg = error_data.get('error', {}).get('message', str(e))
                    logger.error(f"API error details: {error_data}")
                except:
                    error_msg = e.response.text or str(e)
                    logger.error(f"API error response: {error_msg}")
            raise ValueError(f"API调用失败: {error_msg}")
        except Exception as e:
            logger.error(f"Unexpected error creating parser task: {e}")
            raise ValueError(f"创建解析任务失败: {str(e)}")
    
    def get_parser_result(
        self, 
        task_id: str, 
        format_type: str = "text",
        timeout: int = 60
    ) -> Dict[str, Any]:
        """
        Get parsing result with polling support.
        
        Args:
            task_id: Parsing task ID
            format_type: Return format (text, download_link)
            timeout: Timeout in seconds
        
        Returns:
            {
                "status": "succeeded|failed|processing",
                "content": "Parsed text content",
                "error": "Error message (if failed)"
            }
        
        Raises:
            TimeoutError: If polling exceeds timeout
            requests.RequestException: If API call fails
        """
        max_attempts = timeout // 2  # Poll every 2 seconds
        return self.poll_result(task_id, format_type=format_type, interval=2, max_attempts=max_attempts)
    
    def poll_result(
        self, 
        task_id: str,
        format_type: str = "text",
        interval: int = 2,
        max_attempts: int = 30
    ) -> Dict[str, Any]:
        """
        Poll parsing result until completion or timeout.
        
        Args:
            task_id: Parsing task ID
            format_type: Return format (text, download_link)
            interval: Polling interval in seconds
            max_attempts: Maximum number of polling attempts
        
        Returns:
            Parsing result or timeout error
        
        Raises:
            TimeoutError: If max_attempts exceeded
            requests.RequestException: If API call fails
        """
        url = f"{self.base_url}/files/parser/result/{task_id}/{format_type}"
        
        for attempt in range(max_attempts):
            try:
                response = requests.get(url, headers=self.headers, timeout=10)
                response.raise_for_status()
                
                result = response.json()
                status = result.get('status')
                
                if status == 'succeeded':
                    logger.info(f"Parser task {task_id} succeeded")
                    return {
                        "status": "succeeded",
                        "content": result.get('content', ''),
                        "task_id": task_id
                    }
                elif status == 'failed':
                    error_msg = result.get('error', 'Unknown error')
                    logger.error(f"Parser task {task_id} failed: {error_msg}")
                    return {
                        "status": "failed",
                        "error": error_msg,
                        "task_id": task_id
                    }
                elif status == 'processing':
                    logger.debug(f"Parser task {task_id} still processing (attempt {attempt + 1}/{max_attempts})")
                    time.sleep(interval)
                else:
                    logger.warning(f"Unknown status for task {task_id}: {status}")
                    time.sleep(interval)
                    
            except requests.RequestException as e:
                logger.error(f"Error polling parser result: {e}")
                if attempt == max_attempts - 1:
                    raise
                time.sleep(interval)
        
        # Timeout
        logger.error(f"Parser task {task_id} timed out after {max_attempts * interval} seconds")
        raise TimeoutError(f"Parsing timeout after {max_attempts * interval} seconds")
    
    def _detect_file_type(self, file_path: str) -> str:
        """
        Detect file type from file extension.
        
        Args:
            file_path: File path
        
        Returns:
            File type in uppercase (e.g., 'PDF', 'DOCX')
        
        Raises:
            ValueError: If file extension is not supported
        """
        _, ext = os.path.splitext(file_path)
        file_type = ext.lstrip('.').upper()
        
        if not file_type:
            raise ValueError("Cannot detect file type: no file extension")
        
        return file_type
    
    def _validate_file_type(self, file_type: str) -> None:
        """
        Validate if file type is supported.
        
        Args:
            file_type: File type to validate
        
        Raises:
            ValueError: If file type is not supported
        """
        if file_type.upper() not in self.SUPPORTED_FORMATS:
            raise ValueError(
                f"Unsupported file type: {file_type}. "
                f"Supported formats: {', '.join(sorted(self.SUPPORTED_FORMATS))}"
            )
    
    def _validate_file_size(self, file_path: str, file_type: str) -> None:
        """
        Validate file size against limits.
        
        Args:
            file_path: File path
            file_type: File type
        
        Raises:
            ValueError: If file size exceeds limit
            FileNotFoundError: If file does not exist
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        file_size = os.path.getsize(file_path)
        max_size = self.SIZE_LIMITS.get(file_type.upper(), self.SIZE_LIMITS['DEFAULT'])
        
        if file_size > max_size:
            max_size_mb = max_size / (1024 * 1024)
            file_size_mb = file_size / (1024 * 1024)
            raise ValueError(
                f"File size ({file_size_mb:.2f}MB) exceeds limit for {file_type} "
                f"({max_size_mb:.0f}MB)"
            )
    
    def _get_mime_type(self, file_type: str) -> str:
        """
        Get MIME type for file type.
        
        Args:
            file_type: File type
        
        Returns:
            MIME type string
        """
        mime_types = {
            # 文档格式
            'PDF': 'application/pdf',
            'DOCX': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'DOC': 'application/msword',
            'XLS': 'application/vnd.ms-excel',
            'XLSX': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'PPT': 'application/vnd.ms-powerpoint',
            'PPTX': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'TXT': 'text/plain',
            'MD': 'text/markdown',
            'CSV': 'text/csv',
            'HTML': 'text/html',
            'EPUB': 'application/epub+zip',
            # 图片格式
            'PNG': 'image/png',
            'JPG': 'image/jpeg',
            'JPEG': 'image/jpeg',
            'BMP': 'image/bmp',
            'GIF': 'image/gif',
            'WEBP': 'image/webp',
            'HEIC': 'image/heic',
            'EPS': 'application/postscript',
            'ICNS': 'image/icns',
            'IM': 'image/x-im',
            'PCX': 'image/x-pcx',
            'PPM': 'image/x-portable-pixmap',
            'TIFF': 'image/tiff',
            'XBM': 'image/x-xbitmap',
            'HEIF': 'image/heif',
            'JP2': 'image/jp2'
        }
        return mime_types.get(file_type.upper(), 'application/octet-stream')
