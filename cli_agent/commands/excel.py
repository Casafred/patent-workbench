"""
CLI Agent Excel命令模块

提供Excel文件处理相关的命令。
"""

from typing import Dict, List, Any, Optional
from cli_agent.services.excel_service import ExcelService
from cli_agent.core.exceptions import FileError, ValidationError
from cli_agent.core.logger import Logger


class ExcelCommands:
    """Excel命令处理器"""
    
    def __init__(self, excel_service: ExcelService):
        self.excel_service = excel_service
        self.logger = Logger.get_instance().get_logger("excel_commands")
    
    def load(self, file_path: str, header_row: int = 0, max_rows: int = None) -> Dict[str, Any]:
        """
        加载Excel文件
        
        用法: excel load <file_path> [--header-row 0] [--max-rows 1000]
        """
        self.logger.info(f"加载文件: {file_path}")
        
        result = self.excel_service.load_file(
            file_path=file_path,
            header_row=header_row,
            max_rows=max_rows
        )
        
        return {
            "success": True,
            "message": f"文件加载成功: {result['total_rows']} 行, {len(result['columns'])} 列",
            "data": {
                "file_info": result["file_info"],
                "columns": result["columns"],
                "total_rows": result["total_rows"],
                "sheet_names": result["sheet_names"],
                "load_time": result["load_time"]
            }
        }
    
    def info(self, file_path: str) -> Dict[str, Any]:
        """
        获取文件信息
        
        用法: excel info <file_path>
        """
        info = self.excel_service.get_file_info(file_path)
        
        return {
            "success": True,
            "data": info
        }
    
    def columns(self, file_path: str, header_row: int = 0) -> Dict[str, Any]:
        """
        列出文件列名
        
        用法: excel columns <file_path> [--header-row 0]
        """
        columns = self.excel_service.get_columns(file_path, header_row)
        
        return {
            "success": True,
            "data": {
                "columns": columns,
                "count": len(columns)
            }
        }
    
    def search(
        self,
        file_path: str,
        column: str,
        query: str,
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        在文件中搜索数据
        
        用法: excel search <file_path> --column <列名> --query <关键词> [--limit 50]
        """
        results = self.excel_service.search_data(file_path, column, query, limit)
        
        return {
            "success": True,
            "message": f"找到 {len(results)} 条匹配记录",
            "data": {
                "results": results,
                "total": len(results),
                "column": column,
                "query": query
            }
        }
    
    def concat(
        self,
        file_path: str,
        columns: List[str],
        separator: str = "\n\n",
        header_row: int = 0,
        output: str = None
    ) -> Dict[str, Any]:
        """
        拼接多列数据
        
        用法: excel concat <file_path> --columns 列1,列2,列3 [--separator "\\n\\n"] [--output output.xlsx]
        """
        if isinstance(columns, str):
            columns = [c.strip() for c in columns.split(",")]
        
        results = self.excel_service.concat_columns(
            file_path=file_path,
            columns=columns,
            separator=separator,
            header_row=header_row
        )
        
        response = {
            "success": True,
            "message": f"成功拼接 {len(results)} 行数据",
            "data": {
                "results": results[:10],
                "total": len(results),
                "columns": columns
            }
        }
        
        if output:
            export_data = [{"id": r["id"], "content": r["content"]} for r in results]
            self.excel_service.export_data(export_data, output)
            response["message"] += f"，已导出到: {output}"
            response["data"]["output"] = output
        
        return response
    
    def export(
        self,
        file_path: str,
        output_path: str,
        format: str = "xlsx",
        columns: List[str] = None
    ) -> Dict[str, Any]:
        """
        导出数据到文件
        
        用法: excel export <file_path> --output <输出路径> [--format xlsx] [--columns 列1,列2]
        """
        result = self.excel_service.load_file(file_path)
        
        data = result["data"]
        if columns:
            if isinstance(columns, str):
                columns = [c.strip() for c in columns.split(",")]
            
            filtered_data = []
            for row in data:
                filtered_row = {
                    "row_index": row["row_index"],
                    "data": {k: v for k, v in row["data"].items() if k in columns}
                }
                filtered_data.append(filtered_row)
            data = filtered_data
        
        self.excel_service.export_data(data, output_path, format)
        
        return {
            "success": True,
            "message": f"数据已导出到: {output_path}",
            "data": {
                "output_path": output_path,
                "format": format,
                "rows": len(data)
            }
        }
    
    def preview(self, file_path: str, rows: int = 10, header_row: int = 0) -> Dict[str, Any]:
        """
        预览文件内容
        
        用法: excel preview <file_path> [--rows 10]
        """
        result = self.excel_service.load_file(
            file_path,
            header_row=header_row,
            max_rows=rows
        )
        
        return {
            "success": True,
            "data": {
                "columns": result["columns"],
                "preview": result["data"][:rows],
                "total_rows": result["total_rows"]
            }
        }
    
    def validate(self, file_path: str) -> Dict[str, Any]:
        """
        验证文件
        
        用法: excel validate <file_path>
        """
        is_valid, error = self.excel_service.validate_file(file_path)
        
        if is_valid:
            info = self.excel_service.get_file_info(file_path)
            return {
                "success": True,
                "message": "文件验证通过",
                "data": info
            }
        else:
            return {
                "success": False,
                "error": error
            }
    
    def clear_cache(self) -> Dict[str, Any]:
        """
        清除缓存
        
        用法: excel clear-cache
        """
        self.excel_service.clear_cache()
        
        return {
            "success": True,
            "message": "缓存已清除"
        }
