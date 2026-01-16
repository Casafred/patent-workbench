"""
Excel处理器实现

负责读取、验证和处理Excel文件。
"""

import pandas as pd
from typing import List, Optional
import os
from ..models import ExcelProcessorInterface


class ExcelProcessor(ExcelProcessorInterface):
    """Excel文件处理器"""
    
    def __init__(self):
        """初始化Excel处理器"""
        self.supported_extensions = ['.xlsx', '.xls', '.xlsm']
    
    def read_excel_file(self, file_path: str, sheet_name: str = None) -> pd.DataFrame:
        """
        读取Excel文件
        
        Args:
            file_path: Excel文件路径
            sheet_name: 工作表名称，None表示读取第一个工作表
            
        Returns:
            pandas DataFrame对象
            
        Raises:
            FileNotFoundError: 文件不存在
            ValueError: 文件格式不支持
        """
        if not self.validate_excel_file(file_path):
            raise ValueError(f"不支持的文件格式: {file_path}")
        
        try:
            # 如果没有指定工作表名称，读取第一个工作表
            if sheet_name is None:
                df = pd.read_excel(file_path, sheet_name=0)
            else:
                df = pd.read_excel(file_path, sheet_name=sheet_name)
            return df
        except Exception as e:
            raise ValueError(f"读取Excel文件失败: {str(e)}")
    
    def get_sheet_names(self, file_path: str) -> List[str]:
        """
        获取Excel文件中所有工作表名称
        
        Args:
            file_path: Excel文件路径
            
        Returns:
            工作表名称列表
        """
        if not self.validate_excel_file(file_path):
            raise ValueError(f"不支持的文件格式: {file_path}")
        
        try:
            excel_file = pd.ExcelFile(file_path, engine='openpyxl')
            return excel_file.sheet_names
        except Exception as e:
            raise ValueError(f"读取工作表名称失败: {str(e)}")
    
    def get_column_data(self, df: pd.DataFrame, column_name: str) -> List[str]:
        """
        获取指定列的数据
        
        Args:
            df: pandas DataFrame对象
            column_name: 列名称
            
        Returns:
            列数据列表
        """
        if column_name not in df.columns:
            raise ValueError(f"列 '{column_name}' 不存在")
        
        # 转换为字符串并过滤空值
        column_data = df[column_name].astype(str).tolist()
        return [data for data in column_data if data and data.strip() and data != 'nan']
    
    def validate_excel_file(self, file_path: str) -> bool:
        """
        验证Excel文件格式
        
        Args:
            file_path: 文件路径
            
        Returns:
            是否为有效的Excel文件
        """
        if not os.path.exists(file_path):
            return False
        
        file_extension = os.path.splitext(file_path)[1].lower()
        return file_extension in self.supported_extensions
    
    def get_column_names(self, df: pd.DataFrame) -> List[str]:
        """
        获取DataFrame的所有列名
        
        Args:
            df: pandas DataFrame对象
            
        Returns:
            列名列表
        """
        return df.columns.tolist()
    
    def get_file_info(self, file_path: str) -> dict:
        """
        获取Excel文件基本信息
        
        Args:
            file_path: Excel文件路径
            
        Returns:
            文件信息字典
        """
        if not self.validate_excel_file(file_path):
            raise ValueError(f"不支持的文件格式: {file_path}")
        
        try:
            excel_file = pd.ExcelFile(file_path)
            file_size = os.path.getsize(file_path)
            
            return {
                'file_path': file_path,
                'file_size': file_size,
                'sheet_count': len(excel_file.sheet_names),
                'sheet_names': excel_file.sheet_names
            }
        except Exception as e:
            raise ValueError(f"获取文件信息失败: {str(e)}")