"""
Excel处理器属性测试

使用基于属性的测试验证Excel处理器的正确性属性。
"""

import pytest
import pandas as pd
import tempfile
import os
from hypothesis import given, strategies as st, assume, settings
from hypothesis.strategies import composite
import io

from patent_claims_processor.processors.excel_processor import ExcelProcessor


# 测试数据生成策略

@composite
def valid_excel_data_strategy(draw):
    """生成有效的Excel数据"""
    # 生成列名
    num_columns = draw(st.integers(min_value=1, max_value=5))
    column_names = [f"Column_{i}" for i in range(num_columns)]
    
    # 生成行数
    num_rows = draw(st.integers(min_value=1, max_value=100))
    
    # 生成数据
    data = {}
    for col in column_names:
        # 生成安全的文本数据（避免非法字符）
        column_data = draw(st.lists(
            st.one_of(
                st.text(alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Zs')), min_size=0, max_size=50),
                st.integers(min_value=-1000, max_value=1000),
                st.floats(min_value=-1000.0, max_value=1000.0, allow_nan=False, allow_infinity=False),
                st.none()
            ),
            min_size=num_rows,
            max_size=num_rows
        ))
        data[col] = column_data
    
    return pd.DataFrame(data)


@composite
def excel_file_strategy(draw):
    """生成Excel文件路径和数据"""
    # 只使用 .xlsx 格式以避免兼容性问题
    extension = '.xlsx'
    
    # 生成数据
    df = draw(valid_excel_data_strategy())
    
    # 创建临时文件
    with tempfile.NamedTemporaryFile(suffix=extension, delete=False) as tmp_file:
        df.to_excel(tmp_file.name, index=False, engine='openpyxl')
        
        return tmp_file.name, df


@composite
def invalid_file_strategy(draw):
    """生成无效文件"""
    # 选择无效的扩展名
    extension = draw(st.sampled_from(['.txt', '.csv', '.pdf', '.doc', '.json']))
    
    # 生成安全的ASCII内容
    content = draw(st.text(alphabet=st.characters(min_codepoint=32, max_codepoint=126), min_size=0, max_size=100))
    
    # 创建临时文件
    with tempfile.NamedTemporaryFile(suffix=extension, delete=False, mode='w', encoding='utf-8') as tmp_file:
        tmp_file.write(content)
        return tmp_file.name


@composite
def multi_sheet_excel_strategy(draw):
    """生成多工作表Excel文件"""
    # 生成工作表数量
    num_sheets = draw(st.integers(min_value=2, max_value=5))
    
    # 生成工作表名称
    sheet_names = [f"Sheet_{i}" for i in range(num_sheets)]
    
    # 为每个工作表生成数据
    sheets_data = {}
    for sheet_name in sheet_names:
        sheets_data[sheet_name] = draw(valid_excel_data_strategy())
    
    # 创建临时文件
    with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp_file:
        with pd.ExcelWriter(tmp_file.name, engine='openpyxl') as writer:
            for sheet_name, df in sheets_data.items():
                df.to_excel(writer, sheet_name=sheet_name, index=False)
        
        return tmp_file.name, sheets_data


class TestExcelProcessorProperties:
    """Excel处理器属性测试类"""
    
    def setup_method(self):
        """设置测试方法"""
        self.processor = ExcelProcessor()
        self.temp_files = []
    
    def teardown_method(self):
        """清理测试方法"""
        # 清理临时文件
        for file_path in self.temp_files:
            if os.path.exists(file_path):
                try:
                    os.unlink(file_path)
                except:
                    pass
    
    def _register_temp_file(self, file_path):
        """注册临时文件以便清理"""
        self.temp_files.append(file_path)
    
    @given(excel_file_strategy())
    @settings(max_examples=10, deadline=None)
    def test_property_1_excel_file_validation_and_processing(self, excel_data):
        """
        **Feature: patent-claims-processor, Property 1: Excel文件验证和处理**
        
        对于任何上传的文件，如果文件是有效的Excel格式，系统应当成功读取并返回文件内容；
        如果文件格式无效，系统应当返回明确的错误信息而不是崩溃
        
        **验证需求: 1.1, 1.4**
        """
        file_path, expected_df = excel_data
        self._register_temp_file(file_path)
        
        # 测试文件验证
        is_valid = self.processor.validate_excel_file(file_path)
        assert is_valid == True, f"有效的Excel文件应该通过验证: {file_path}"
        
        # 测试文件读取
        try:
            result_df = self.processor.read_excel_file(file_path)
            
            # 验证读取结果不为空
            assert result_df is not None, "读取结果不应为空"
            assert isinstance(result_df, pd.DataFrame), "读取结果应为DataFrame"
            
            # 验证数据结构一致性（列数应该一致）
            assert len(result_df.columns) == len(expected_df.columns), "列数应该一致"
            
            # 验证列名一致性
            assert list(result_df.columns) == list(expected_df.columns), "列名应该一致"
            
            # 注意：行数可能不一致，因为读取时可能会有数据类型转换或格式化
            # 但至少应该有相同的基本结构
            
        except Exception as e:
            pytest.fail(f"读取有效Excel文件不应该抛出异常: {str(e)}")
    
    @given(invalid_file_strategy())
    @settings(max_examples=10, deadline=None)
    def test_property_1_invalid_file_handling(self, invalid_file_path):
        """
        **Feature: patent-claims-processor, Property 1: Excel文件验证和处理**
        
        测试无效文件格式的处理 - 应该返回明确错误而不是崩溃
        
        **验证需求: 1.4**
        """
        self._register_temp_file(invalid_file_path)
        
        # 测试文件验证应该返回False
        is_valid = self.processor.validate_excel_file(invalid_file_path)
        assert is_valid == False, f"无效文件应该验证失败: {invalid_file_path}"
        
        # 测试读取无效文件应该抛出明确的ValueError
        with pytest.raises(ValueError) as exc_info:
            self.processor.read_excel_file(invalid_file_path)
        
        # 验证错误信息包含有用信息
        error_message = str(exc_info.value)
        assert "不支持的文件格式" in error_message or "格式" in error_message, \
            f"错误信息应该明确指出格式问题: {error_message}"
    
    @given(multi_sheet_excel_strategy())
    @settings(max_examples=10, deadline=None)
    def test_property_1_multi_sheet_handling(self, multi_sheet_data):
        """
        **Feature: patent-claims-processor, Property 1: Excel文件验证和处理**
        
        测试多工作表Excel文件的处理
        
        **验证需求: 1.1, 1.2**
        """
        file_path, sheets_data = multi_sheet_data
        self._register_temp_file(file_path)
        
        # 测试获取工作表名称
        try:
            sheet_names = self.processor.get_sheet_names(file_path)
            
            # 验证工作表名称列表
            assert isinstance(sheet_names, list), "工作表名称应该是列表"
            assert len(sheet_names) > 0, "应该至少有一个工作表"
            assert len(sheet_names) == len(sheets_data), "工作表数量应该一致"
            
            # 验证每个工作表都可以读取
            for sheet_name in sheet_names:
                result_df = self.processor.read_excel_file(file_path, sheet_name)
                assert result_df is not None, f"工作表 {sheet_name} 应该可以读取"
                assert isinstance(result_df, pd.DataFrame), f"工作表 {sheet_name} 应该返回DataFrame"
                
        except Exception as e:
            pytest.fail(f"处理多工作表文件不应该抛出异常: {str(e)}")
    
    def test_property_1_nonexistent_file_handling(self):
        """
        **Feature: patent-claims-processor, Property 1: Excel文件验证和处理**
        
        测试不存在文件的处理
        
        **验证需求: 1.4**
        """
        nonexistent_file = "/path/to/nonexistent/file.xlsx"
        
        # 测试文件验证应该返回False
        is_valid = self.processor.validate_excel_file(nonexistent_file)
        assert is_valid == False, "不存在的文件应该验证失败"
        
        # 测试读取不存在的文件应该抛出异常
        with pytest.raises(ValueError):
            self.processor.read_excel_file(nonexistent_file)
    
    @given(excel_file_strategy())
    @settings(max_examples=10, deadline=None)
    def test_property_1_column_data_extraction(self, excel_data):
        """
        **Feature: patent-claims-processor, Property 1: Excel文件验证和处理**
        
        测试列数据提取功能
        
        **验证需求: 1.3**
        """
        file_path, expected_df = excel_data
        self._register_temp_file(file_path)
        
        # 读取文件
        df = self.processor.read_excel_file(file_path)
        
        # 测试每个列的数据提取
        for column_name in df.columns:
            try:
                column_data = self.processor.get_column_data(df, column_name)
                
                # 验证返回的是列表
                assert isinstance(column_data, list), f"列 {column_name} 的数据应该是列表"
                
                # 验证数据不包含空值和NaN（这是get_column_data的预期行为）
                for item in column_data:
                    assert item is not None, "列数据不应包含None"
                    assert str(item).strip() != "", "列数据不应包含空字符串"
                    assert str(item) != "nan", "列数据不应包含NaN字符串"
                
                # 验证所有数据都是字符串类型（因为get_column_data转换为字符串）
                for item in column_data:
                    assert isinstance(item, str), "列数据应该都是字符串类型"
                
            except Exception as e:
                pytest.fail(f"提取列 {column_name} 数据不应该抛出异常: {str(e)}")
        
        # 测试不存在的列应该抛出异常
        with pytest.raises(ValueError) as exc_info:
            self.processor.get_column_data(df, "NonexistentColumn")
        
        error_message = str(exc_info.value)
        assert "不存在" in error_message, f"错误信息应该指出列不存在: {error_message}"
    
    @given(multi_sheet_excel_strategy())
    @settings(max_examples=10, deadline=None)
    def test_property_2_worksheet_and_column_selection(self, multi_sheet_data):
        """
        **Feature: patent-claims-processor, Property 2: 工作表和列选择功能**
        
        对于任何包含多个工作表或多列的Excel文件，系统应当正确列出所有可用选项并允许用户成功选择指定的工作表和列
        
        **验证需求: 1.2, 1.3**
        """
        file_path, sheets_data = multi_sheet_data
        self._register_temp_file(file_path)
        
        # 测试工作表选择功能 (需求 1.2)
        try:
            # 获取所有工作表名称
            sheet_names = self.processor.get_sheet_names(file_path)
            
            # 验证工作表名称列表的正确性
            assert isinstance(sheet_names, list), "工作表名称应该是列表"
            assert len(sheet_names) >= 2, "测试数据应该包含多个工作表"
            assert len(sheet_names) == len(sheets_data), "工作表数量应该与预期一致"
            
            # 验证每个工作表名称都在预期列表中
            expected_sheet_names = list(sheets_data.keys())
            for sheet_name in sheet_names:
                assert sheet_name in expected_sheet_names, f"工作表名称 {sheet_name} 应该在预期列表中"
            
            # 测试用户可以选择任意工作表进行处理
            for sheet_name in sheet_names:
                # 读取指定工作表
                df = self.processor.read_excel_file(file_path, sheet_name)
                
                # 验证读取结果
                assert df is not None, f"工作表 {sheet_name} 应该可以成功读取"
                assert isinstance(df, pd.DataFrame), f"工作表 {sheet_name} 应该返回DataFrame"
                
                # 验证数据结构与预期一致
                expected_df = sheets_data[sheet_name]
                assert len(df.columns) == len(expected_df.columns), f"工作表 {sheet_name} 的列数应该一致"
                assert list(df.columns) == list(expected_df.columns), f"工作表 {sheet_name} 的列名应该一致"
                
                # 测试列选择功能 (需求 1.3)
                if len(df.columns) > 0:
                    # 获取所有列名
                    column_names = self.processor.get_column_names(df)
                    
                    # 验证列名列表的正确性
                    assert isinstance(column_names, list), f"工作表 {sheet_name} 的列名应该是列表"
                    assert len(column_names) > 0, f"工作表 {sheet_name} 应该至少有一列"
                    assert column_names == list(df.columns), f"工作表 {sheet_name} 的列名应该与DataFrame一致"
                    
                    # 测试用户可以选择任意列进行处理
                    for column_name in column_names:
                        try:
                            column_data = self.processor.get_column_data(df, column_name)
                            
                            # 验证列数据提取结果
                            assert isinstance(column_data, list), f"列 {column_name} 的数据应该是列表"
                            
                            # 验证数据类型一致性（get_column_data返回字符串列表）
                            for item in column_data:
                                assert isinstance(item, str), f"列 {column_name} 的数据项应该是字符串"
                                assert item.strip() != "", f"列 {column_name} 不应包含空字符串"
                                assert item != "nan", f"列 {column_name} 不应包含NaN值"
                        
                        except Exception as e:
                            pytest.fail(f"选择工作表 {sheet_name} 的列 {column_name} 不应该抛出异常: {str(e)}")
        
        except Exception as e:
            pytest.fail(f"工作表和列选择功能不应该抛出异常: {str(e)}")
    
    @given(excel_file_strategy())
    @settings(max_examples=10, deadline=None)
    def test_property_2_single_sheet_column_selection(self, excel_data):
        """
        **Feature: patent-claims-processor, Property 2: 工作表和列选择功能**
        
        测试单工作表文件的列选择功能
        
        **验证需求: 1.3**
        """
        file_path, expected_df = excel_data
        self._register_temp_file(file_path)
        
        # 读取文件（默认第一个工作表）
        df = self.processor.read_excel_file(file_path)
        
        # 测试列选择功能
        if len(df.columns) > 0:
            # 获取所有可用列名
            available_columns = self.processor.get_column_names(df)
            
            # 验证列名列表
            assert isinstance(available_columns, list), "可用列名应该是列表"
            assert len(available_columns) > 0, "应该至少有一列可用"
            assert available_columns == list(df.columns), "可用列名应该与DataFrame列名一致"
            
            # 测试用户可以指定任意列进行处理
            for column_name in available_columns:
                # 验证用户可以成功选择该列
                column_data = self.processor.get_column_data(df, column_name)
                
                # 验证选择结果
                assert isinstance(column_data, list), f"选择列 {column_name} 应该返回列表"
                
                # 验证数据完整性
                for item in column_data:
                    assert isinstance(item, str), f"列 {column_name} 的数据应该是字符串类型"
                    assert item.strip() != "", f"列 {column_name} 不应包含空字符串"
    
    @given(multi_sheet_excel_strategy())
    @settings(max_examples=5, deadline=None)
    def test_property_2_invalid_worksheet_selection(self, multi_sheet_data):
        """
        **Feature: patent-claims-processor, Property 2: 工作表和列选择功能**
        
        测试选择不存在的工作表时的错误处理
        
        **验证需求: 1.2**
        """
        file_path, sheets_data = multi_sheet_data
        self._register_temp_file(file_path)
        
        # 尝试选择不存在的工作表
        nonexistent_sheet = "NonexistentSheet_12345"
        
        # 确保这个工作表名称确实不存在
        sheet_names = self.processor.get_sheet_names(file_path)
        assume(nonexistent_sheet not in sheet_names)
        
        # 验证选择不存在的工作表会抛出适当的异常
        with pytest.raises(ValueError) as exc_info:
            self.processor.read_excel_file(file_path, nonexistent_sheet)
        
        # 验证错误信息有用
        error_message = str(exc_info.value)
        assert "工作表" in error_message or "sheet" in error_message.lower(), \
            f"错误信息应该指出工作表问题: {error_message}"
    
    @given(excel_file_strategy())
    @settings(max_examples=5, deadline=None)
    def test_property_2_invalid_column_selection(self, excel_data):
        """
        **Feature: patent-claims-processor, Property 2: 工作表和列选择功能**
        
        测试选择不存在的列时的错误处理
        
        **验证需求: 1.3**
        """
        file_path, expected_df = excel_data
        self._register_temp_file(file_path)
        
        # 读取文件
        df = self.processor.read_excel_file(file_path)
        
        # 尝试选择不存在的列
        nonexistent_column = "NonexistentColumn_12345"
        
        # 确保这个列名确实不存在
        assume(nonexistent_column not in df.columns)
        
        # 验证选择不存在的列会抛出适当的异常
        with pytest.raises(ValueError) as exc_info:
            self.processor.get_column_data(df, nonexistent_column)
        
        # 验证错误信息有用
        error_message = str(exc_info.value)
        assert "不存在" in error_message or "列" in error_message, \
            f"错误信息应该指出列不存在: {error_message}"