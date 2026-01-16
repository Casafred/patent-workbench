"""
导出服务实现

提供结构化数据输出和多格式导出功能。
"""

import json
import os
from typing import Dict, Any, List, Optional
from datetime import datetime
import pandas as pd

from ..models import ProcessedClaims, ClaimInfo, ProcessingError


class ExportService:
    """导出服务 - 处理结果输出和导出功能"""
    
    def __init__(self, output_dir: str = "output"):
        """
        初始化导出服务
        
        Args:
            output_dir: 输出目录路径
        """
        self.output_dir = output_dir
        self._ensure_output_dir()
    
    def _ensure_output_dir(self) -> None:
        """确保输出目录存在"""
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)
    
    def export_to_json(self, processed_claims: ProcessedClaims, 
                      filename: str = None) -> str:
        """
        导出处理结果为JSON格式
        
        需求 6.3: 支持将结果导出为JSON格式，并标明处理的语言版本
        
        Args:
            processed_claims: 处理结果
            filename: 输出文件名，如果为None则自动生成
            
        Returns:
            输出文件的完整路径
        """
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"patent_claims_{timestamp}.json"
        
        # 确保文件名以.json结尾
        if not filename.endswith('.json'):
            filename += '.json'
        
        output_path = os.path.join(self.output_dir, filename)
        
        # 构建结构化输出数据 (需求 6.1, 6.2)
        output_data = self._build_structured_output(processed_claims)
        
        # 写入JSON文件
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
        
        return output_path
    
    def generate_json_bytesio(self, processed_claims: ProcessedClaims) -> tuple:
        """
        生成JSON文件到BytesIO对象（用于HTTP响应）
        
        Args:
            processed_claims: 处理结果
            
        Returns:
            (BytesIO对象, 文件名) 元组
        """
        from io import BytesIO
        
        try:
            # 构建结构化输出数据
            output_data = self._build_structured_output(processed_claims)
            
            # 转换为JSON字符串
            json_str = json.dumps(output_data, ensure_ascii=False, indent=2)
            
            # 创建BytesIO对象
            output = BytesIO(json_str.encode('utf-8'))
            output.seek(0)
            
            # 生成文件名
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"patent_claims_{timestamp}.json"
            
            # 验证文件大小
            file_size = len(output.getvalue())
            if file_size == 0:
                raise Exception("生成的JSON文件为空")
            
            print(f"JSON BytesIO生成成功, 大小: {file_size} bytes")
            return output, filename
            
        except Exception as e:
            print(f"JSON BytesIO生成错误: {str(e)}")
            import traceback
            print(traceback.format_exc())
            raise
    
    def export_to_excel(self, processed_claims: ProcessedClaims, 
                       filename: str = None) -> str:
        """
        导出处理结果为Excel格式（返回BytesIO对象）

        需求 6.3: 支持将结果导出为Excel格式，并标明处理的语言版本

        Args:
            processed_claims: 处理结果
            filename: 输出文件名，如果为None则自动生成

        Returns:
            输出文件的完整路径
        """
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"patent_claims_{timestamp}.xlsx"

        # 确保文件名以.xlsx结尾
        if not filename.endswith('.xlsx'):
            filename += '.xlsx'

        output_path = os.path.join(self.output_dir, filename)

        try:
            # 创建Excel写入器
            with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
                # 工作表1: 权利要求详细信息
                claims_df = self._create_claims_dataframe(processed_claims)
                claims_df.to_excel(writer, sheet_name='权利要求详情', index=False)

                # 工作表2: 处理统计信息
                stats_df = self._create_statistics_dataframe(processed_claims)
                stats_df.to_excel(writer, sheet_name='处理统计', index=False)

                # 工作表3: 错误报告（如果有错误）
                if processed_claims.processing_errors:
                    errors_df = self._create_errors_dataframe(processed_claims)
                    errors_df.to_excel(writer, sheet_name='错误报告', index=False)

            # 验证文件是否生成成功
            if not os.path.exists(output_path):
                raise Exception(f"Excel文件生成失败: {output_path}")

            # 验证文件大小
            file_size = os.path.getsize(output_path)
            if file_size == 0:
                raise Exception(f"Excel文件为空: {output_path}")

            print(f"Excel文件生成成功: {output_path}, 大小: {file_size} bytes")
            return output_path
        except Exception as e:
            print(f"Excel文件生成错误: {str(e)}")
            # 清理失败的文件
            if os.path.exists(output_path):
                try:
                    os.remove(output_path)
                except:
                    pass
            raise
    
    def generate_excel_bytesio(self, processed_claims: ProcessedClaims) -> tuple:
        """
        生成Excel文件到BytesIO对象（用于HTTP响应）
        
        Args:
            processed_claims: 处理结果
            
        Returns:
            (BytesIO对象, 文件名) 元组
        """
        from io import BytesIO
        
        try:
            # 创建BytesIO对象
            output = BytesIO()
            
            # 创建Excel写入器
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                # 工作表1: 权利要求详细信息
                claims_df = self._create_claims_dataframe(processed_claims)
                claims_df.to_excel(writer, sheet_name='权利要求详情', index=False)

                # 工作表2: 处理统计信息
                stats_df = self._create_statistics_dataframe(processed_claims)
                stats_df.to_excel(writer, sheet_name='处理统计', index=False)

                # 工作表3: 错误报告（如果有错误）
                if processed_claims.processing_errors:
                    errors_df = self._create_errors_dataframe(processed_claims)
                    errors_df.to_excel(writer, sheet_name='错误报告', index=False)
            
            # 重置指针到开始位置
            output.seek(0)
            
            # 生成文件名
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"patent_claims_{timestamp}.xlsx"
            
            # 验证文件大小
            file_size = len(output.getvalue())
            if file_size == 0:
                raise Exception("生成的Excel文件为空")
            
            print(f"Excel BytesIO生成成功, 大小: {file_size} bytes")
            return output, filename
            
        except Exception as e:
            print(f"Excel BytesIO生成错误: {str(e)}")
            import traceback
            print(traceback.format_exc())
            raise
    
    def _build_structured_output(self, processed_claims: ProcessedClaims) -> Dict[str, Any]:
        """
        构建结构化输出数据
        
        需求 6.1, 6.2: 生成包含所有权利要求信息的结构化数据
        
        Args:
            processed_claims: 处理结果
            
        Returns:
            结构化输出数据字典
        """
        # 构建权利要求数据列表
        claims_list = []
        for claim in processed_claims.claims_data:
            claim_dict = {
                'claim_number': claim.claim_number,
                'claim_type': claim.claim_type,
                'claim_text': claim.claim_text,
                'language': claim.language,
                'referenced_claims': claim.referenced_claims,
                'original_text': claim.original_text,
                'confidence_score': claim.confidence_score
            }
            claims_list.append(claim_dict)
        
        # 构建错误报告列表
        errors_list = []
        for error in processed_claims.processing_errors:
            error_dict = {
                'error_type': error.error_type,
                'cell_index': error.cell_index,
                'error_message': error.error_message,
                'suggested_action': error.suggested_action,
                'severity': error.severity
            }
            errors_list.append(error_dict)
        
        # 构建完整的输出结构 (需求 6.1, 6.2, 6.4)
        output_data = {
            'metadata': {
                'export_time': datetime.now().isoformat(),
                'version': '1.0',
                'description': '专利权利要求处理结果'
            },
            'summary': {
                'total_cells_processed': processed_claims.total_cells_processed,
                'total_claims_extracted': processed_claims.total_claims_extracted,
                'independent_claims_count': processed_claims.independent_claims_count,
                'dependent_claims_count': processed_claims.dependent_claims_count,
                'language_distribution': processed_claims.language_distribution,
                'error_count': len(processed_claims.processing_errors),
                'success_rate': self._calculate_success_rate(processed_claims)
            },
            'claims': claims_list,
            'errors': errors_list
        }
        
        return output_data
    
    def _create_claims_dataframe(self, processed_claims: ProcessedClaims) -> pd.DataFrame:
        """创建权利要求数据框"""
        claims_data = []
        for claim in processed_claims.claims_data:
            claims_data.append({
                '序号': claim.claim_number,
                '类型': '独立权利要求' if claim.claim_type == 'independent' else '从属权利要求',
                '语言': claim.language,
                '引用权利要求': ', '.join(map(str, claim.referenced_claims)) if claim.referenced_claims else '无',
                '权利要求文本': claim.claim_text,
                '置信度': f"{claim.confidence_score:.2f}",
                '原始文本': claim.original_text
            })
        
        return pd.DataFrame(claims_data)
    
    def _create_statistics_dataframe(self, processed_claims: ProcessedClaims) -> pd.DataFrame:
        """创建统计信息数据框"""
        stats_data = [
            {'统计项': '处理单元格总数', '数值': processed_claims.total_cells_processed},
            {'统计项': '提取权利要求总数', '数值': processed_claims.total_claims_extracted},
            {'统计项': '独立权利要求数量', '数值': processed_claims.independent_claims_count},
            {'统计项': '从属权利要求数量', '数值': processed_claims.dependent_claims_count},
            {'统计项': '错误数量', '数值': len(processed_claims.processing_errors)},
            {'统计项': '成功率', '数值': f"{self._calculate_success_rate(processed_claims):.2%}"}
        ]
        
        for lang, count in processed_claims.language_distribution.items():
            stats_data.append({
                '统计项': f'语言分布 - {lang}',
                '数值': count
            })
        
        return pd.DataFrame(stats_data)
    
    def _create_errors_dataframe(self, processed_claims: ProcessedClaims) -> pd.DataFrame:
        """创建错误报告数据框"""
        errors_data = []
        for error in processed_claims.processing_errors:
            errors_data.append({
                '错误类型': error.error_type,
                '单元格索引': error.cell_index,
                '错误信息': error.error_message,
                '建议操作': error.suggested_action,
                '严重程度': error.severity
            })
        
        return pd.DataFrame(errors_data)
    
    def _calculate_success_rate(self, processed_claims: ProcessedClaims) -> float:
        """计算处理成功率"""
        if processed_claims.total_cells_processed == 0:
            return 0.0
        
        critical_errors = sum(
            1 for error in processed_claims.processing_errors 
            if error.severity in ['critical', 'error']
        )
        
        success_count = processed_claims.total_cells_processed - critical_errors
        return max(0.0, success_count / processed_claims.total_cells_processed)
    
    def generate_processing_report(self, processed_claims: ProcessedClaims) -> str:
        """生成处理报告文本"""
        report_lines = []
        report_lines.append("=" * 60)
        report_lines.append("专利权利要求处理报告")
        report_lines.append("=" * 60)
        report_lines.append("")
        
        report_lines.append("【处理统计】")
        report_lines.append(f"  处理单元格总数: {processed_claims.total_cells_processed}")
        report_lines.append(f"  提取权利要求总数: {processed_claims.total_claims_extracted}")
        report_lines.append(f"  独立权利要求数量: {processed_claims.independent_claims_count}")
        report_lines.append(f"  从属权利要求数量: {processed_claims.dependent_claims_count}")
        report_lines.append(f"  处理成功率: {self._calculate_success_rate(processed_claims):.2%}")
        report_lines.append("")
        
        if processed_claims.language_distribution:
            report_lines.append("【语言分布】")
            for lang, count in sorted(processed_claims.language_distribution.items(), 
                                     key=lambda x: x[1], reverse=True):
                percentage = (count / processed_claims.total_claims_extracted * 100) if processed_claims.total_claims_extracted > 0 else 0
                report_lines.append(f"  {lang}: {count} ({percentage:.1f}%)")
            report_lines.append("")
        
        if processed_claims.processing_errors:
            report_lines.append("【错误报告】")
            errors_by_severity = {}
            for error in processed_claims.processing_errors:
                severity = error.severity
                if severity not in errors_by_severity:
                    errors_by_severity[severity] = []
                errors_by_severity[severity].append(error)
            
            for severity in ['critical', 'error', 'warning']:
                if severity in errors_by_severity:
                    errors = errors_by_severity[severity]
                    report_lines.append(f"  {severity.upper()} ({len(errors)}个):")
                    for error in errors[:5]:
                        report_lines.append(f"    - 单元格 {error.cell_index}: {error.error_message}")
                    if len(errors) > 5:
                        report_lines.append(f"    ... 还有 {len(errors) - 5} 个{severity}级别错误")
            report_lines.append("")
        else:
            report_lines.append("【错误报告】")
            report_lines.append("  无错误")
            report_lines.append("")
        
        if processed_claims.claims_data:
            report_lines.append("【权利要求概览】")
            report_lines.append(f"  权利要求序号范围: {min(c.claim_number for c in processed_claims.claims_data)} - {max(c.claim_number for c in processed_claims.claims_data)}")
            
            total_references = sum(len(c.referenced_claims) for c in processed_claims.claims_data)
            report_lines.append(f"  引用关系总数: {total_references}")
            
            avg_confidence = sum(c.confidence_score for c in processed_claims.claims_data) / len(processed_claims.claims_data)
            report_lines.append(f"  平均置信度: {avg_confidence:.2f}")
            report_lines.append("")
        
        report_lines.append("=" * 60)
        report_lines.append(f"报告生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report_lines.append("=" * 60)
        
        return "\n".join(report_lines)
    
    def export_report_to_file(self, processed_claims: ProcessedClaims, 
                            filename: str = None) -> str:
        """导出处理报告到文本文件"""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"processing_report_{timestamp}.txt"
        
        if not filename.endswith('.txt'):
            filename += '.txt'
        
        output_path = os.path.join(self.output_dir, filename)
        report_text = self.generate_processing_report(processed_claims)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(report_text)
        
        return output_path
    
    def get_output_summary(self, processed_claims: ProcessedClaims) -> Dict[str, Any]:
        """获取输出摘要信息"""
        return {
            'total_cells': processed_claims.total_cells_processed,
            'total_claims': processed_claims.total_claims_extracted,
            'independent_claims': processed_claims.independent_claims_count,
            'dependent_claims': processed_claims.dependent_claims_count,
            'languages': list(processed_claims.language_distribution.keys()),
            'error_count': len(processed_claims.processing_errors),
            'success_rate': self._calculate_success_rate(processed_claims),
            'has_errors': len(processed_claims.processing_errors) > 0
        }
