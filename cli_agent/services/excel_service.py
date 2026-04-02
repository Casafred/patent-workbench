"""
CLI Agent Excel文件处理服务

提供Excel文件的读取、解析、验证和处理功能。
"""

import os
import time
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime

from cli_agent.core.exceptions import FileError, ValidationError
from cli_agent.core.logger import Logger


class ExcelService:
    """Excel文件处理服务"""
    
    SUPPORTED_FORMATS = {".xlsx", ".xls", ".csv"}
    MAX_FILE_SIZE_MB = 100
    MAX_ROWS = 50000
    CHUNK_SIZE = 1000
    
    def __init__(self, config: dict = None):
        self.config = config or {}
        self.logger = Logger.get_instance().get_logger("excel_service")
        self._loaded_files: Dict[str, Dict] = {}
    
    def validate_file(self, file_path: str) -> Tuple[bool, str]:
        """
        验证文件是否有效
        
        Args:
            file_path: 文件路径
            
        Returns:
            (是否有效, 错误信息)
        """
        path = Path(file_path)
        
        if not path.exists():
            return False, f"文件不存在: {file_path}"
        
        if not path.is_file():
            return False, f"路径不是文件: {file_path}"
        
        ext = path.suffix.lower()
        if ext not in self.SUPPORTED_FORMATS:
            return False, f"不支持的文件格式: {ext}。支持的格式: {', '.join(self.SUPPORTED_FORMATS)}"
        
        file_size_mb = path.stat().st_size / (1024 * 1024)
        if file_size_mb > self.MAX_FILE_SIZE_MB:
            return False, f"文件大小超过限制: {file_size_mb:.2f}MB > {self.MAX_FILE_SIZE_MB}MB"
        
        return True, ""
    
    def load_file(
        self,
        file_path: str,
        header_row: int = 0,
        sheet_name: str = None,
        max_rows: int = None
    ) -> Dict[str, Any]:
        """
        加载Excel文件
        
        Args:
            file_path: 文件路径
            header_row: 标题行索引（从0开始）
            sheet_name: 工作表名称（可选）
            max_rows: 最大读取行数
            
        Returns:
            包含文件数据的字典
        """
        start_time = time.time()
        
        is_valid, error = self.validate_file(file_path)
        if not is_valid:
            raise FileError(error, file_path=file_path)
        
        self.logger.info(f"开始加载文件: {file_path}")
        
        try:
            import pandas as pd
        except ImportError:
            raise FileError("pandas库未安装，请运行: pip install pandas openpyxl")
        
        try:
            ext = Path(file_path).suffix.lower()
            
            read_kwargs = {
                "header": header_row,
                "dtype": str,
                "na_values": ["", "NA", "N/A", "NULL", "null", "None", "none"],
                "keep_default_na": False
            }
            
            if max_rows:
                read_kwargs["nrows"] = max_rows
            
            if ext == ".csv":
                try:
                    df = pd.read_csv(file_path, encoding="utf-8", **read_kwargs)
                except UnicodeDecodeError:
                    df = pd.read_csv(file_path, encoding="gbk", **read_kwargs)
                sheet_names = ["Sheet1"]
            else:
                engine = "openpyxl" if ext == ".xlsx" else "xlrd"
                df = pd.read_excel(
                    file_path,
                    sheet_name=sheet_name if sheet_name else 0,
                    engine=engine,
                    **read_kwargs
                )
                
                if sheet_name:
                    sheet_names = [sheet_name]
                else:
                    excel_file = pd.ExcelFile(file_path, engine=engine)
                    sheet_names = excel_file.sheet_names
            
            if df.empty:
                raise FileError("文件内容为空", file_path=file_path)
            
            total_rows = len(df)
            columns = self._extract_columns(df)
            
            data = self._convert_data(df)
            
            elapsed = time.time() - start_time
            
            file_info = {
                "path": file_path,
                "name": Path(file_path).name,
                "size_mb": Path(file_path).stat().st_size / (1024 * 1024),
                "modified": datetime.fromtimestamp(
                    Path(file_path).stat().st_mtime
                ).isoformat()
            }
            
            result = {
                "success": True,
                "file_info": file_info,
                "columns": columns,
                "data": data,
                "total_rows": total_rows,
                "sheet_names": sheet_names,
                "load_time": elapsed
            }
            
            file_id = Path(file_path).stem
            self._loaded_files[file_id] = result
            
            self.logger.info(
                f"文件加载完成: {total_rows}行, {len(columns)}列, 耗时{elapsed:.2f}秒"
            )
            
            return result
            
        except FileError:
            raise
        except Exception as e:
            self.logger.error(f"加载文件失败: {str(e)}")
            raise FileError(f"加载文件失败: {str(e)}", file_path=file_path)
    
    def _extract_columns(self, df) -> List[Dict[str, Any]]:
        """提取列信息"""
        columns = []
        for i, col in enumerate(df.columns):
            sample_values = df[col].dropna().head(3).tolist()
            columns.append({
                "index": i,
                "name": str(col),
                "type": str(df[col].dtype),
                "sample_values": [str(v) for v in sample_values]
            })
        return columns
    
    def _convert_data(self, df) -> List[Dict[str, Any]]:
        """转换数据为字典列表"""
        import pandas as pd
        data = []
        
        for idx, row in df.iterrows():
            row_data = {}
            for col in df.columns:
                value = row[col]
                if pd.isna(value) or value is None:
                    row_data[str(col)] = None
                else:
                    row_data[str(col)] = str(value).strip()
            
            data.append({
                "row_index": idx + 1,
                "data": row_data
            })
        
        return data
    
    def get_columns(self, file_path: str, header_row: int = 0) -> List[str]:
        """获取文件列名列表"""
        result = self.load_file(file_path, header_row=header_row, max_rows=1)
        return [col["name"] for col in result["columns"]]
    
    def search_data(
        self,
        file_path: str,
        column: str,
        query: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        在文件中搜索数据
        
        Args:
            file_path: 文件路径
            column: 搜索列名
            query: 搜索关键词
            limit: 返回结果数量限制
            
        Returns:
            匹配的数据列表
        """
        result = self.load_file(file_path)
        
        if column not in [col["name"] for col in result["columns"]]:
            raise ValidationError(f"列 '{column}' 不存在", field="column", value=column)
        
        query_lower = query.lower() if query else ""
        matches = []
        
        for row in result["data"]:
            value = row["data"].get(column, "")
            if value and query_lower in value.lower():
                matches.append(row)
                if len(matches) >= limit:
                    break
        
        return matches
    
    def concat_columns(
        self,
        file_path: str,
        columns: List[str],
        separator: str = "\n\n",
        header_row: int = 0
    ) -> List[Dict[str, Any]]:
        """
        拼接多列数据
        
        Args:
            file_path: 文件路径
            columns: 要拼接的列名列表
            separator: 分隔符
            header_row: 标题行索引
            
        Returns:
            拼接后的数据列表
        """
        result = self.load_file(file_path, header_row=header_row)
        
        available_columns = [col["name"] for col in result["columns"]]
        for col in columns:
            if col not in available_columns:
                raise ValidationError(f"列 '{col}' 不存在", field="columns", value=col)
        
        concatenated = []
        for idx, row in enumerate(result["data"]):
            parts = []
            for col in columns:
                value = row["data"].get(col, "")
                if value and value.strip():
                    parts.append(value.strip())
            
            if parts:
                concatenated.append({
                    "id": f"I{idx + 1}",
                    "content": separator.join(parts),
                    "row_index": row["row_index"]
                })
        
        return concatenated
    
    def export_data(
        self,
        data: List[Dict],
        output_path: str,
        format: str = "xlsx"
    ) -> str:
        """
        导出数据到文件
        
        Args:
            data: 要导出的数据
            output_path: 输出路径
            format: 输出格式 (xlsx, csv, json)
            
        Returns:
            输出文件路径
        """
        try:
            import pandas as pd
        except ImportError:
            raise FileError("pandas库未安装")
        
        if not data:
            raise ValidationError("没有数据可导出")
        
        if format == "json":
            import json
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        else:
            rows = []
            for item in data:
                if "data" in item:
                    rows.append(item["data"])
                else:
                    rows.append(item)
            
            df = pd.DataFrame(rows)
            
            if format == "csv":
                df.to_csv(output_path, index=False, encoding="utf-8-sig")
            else:
                df.to_excel(output_path, index=False, engine="openpyxl")
        
        self.logger.info(f"数据已导出到: {output_path}")
        return output_path
    
    def get_file_info(self, file_path: str) -> Dict[str, Any]:
        """获取文件基本信息"""
        path = Path(file_path)
        
        if not path.exists():
            raise FileError(f"文件不存在: {file_path}", file_path=file_path)
        
        stat = path.stat()
        
        return {
            "name": path.name,
            "path": str(path.absolute()),
            "size_bytes": stat.st_size,
            "size_mb": round(stat.st_size / (1024 * 1024), 2),
            "extension": path.suffix.lower(),
            "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            "created": datetime.fromtimestamp(stat.st_ctime).isoformat()
        }
    
    def get_loaded_files(self) -> List[str]:
        """获取已加载的文件列表"""
        return list(self._loaded_files.keys())
    
    def clear_cache(self, file_id: str = None) -> None:
        """清除缓存"""
        if file_id:
            if file_id in self._loaded_files:
                del self._loaded_files[file_id]
        else:
            self._loaded_files.clear()
