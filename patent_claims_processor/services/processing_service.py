"""
处理服务实现

协调各个组件完成完整的权利要求处理流程。
"""

import time
import json
import os
from typing import List, Dict, Optional, Any
from datetime import datetime

from ..models import (
    ProcessingServiceInterface, ClaimInfo, ProcessingResult, 
    ProcessingError, ProcessedClaims, ProcessingReport, ValidationError
)
from ..processors import ExcelProcessor, LanguageDetector, ClaimsParser, ClaimsClassifier


class ProcessingService(ProcessingServiceInterface):
    """处理服务"""
    
    def __init__(self, enable_recovery: bool = True, recovery_file: str = None):
        """
        初始化处理服务
        
        Args:
            enable_recovery: 是否启用中断恢复功能
            recovery_file: 恢复文件路径，如果为None则自动生成
        """
        self.excel_processor = ExcelProcessor()
        self.language_detector = LanguageDetector()
        self.claims_parser = ClaimsParser()
        self.claims_classifier = ClaimsClassifier()
        
        # 中断恢复相关
        self.enable_recovery = enable_recovery
        self.recovery_file = recovery_file or "processing_recovery.json"
        self.processing_state = {
            'processed_cells': [],
            'current_cell_index': 0,
            'start_time': None,
            'file_path': None,
            'column_name': None,
            'sheet_name': None
        }
    
    def process_excel_file(self, file_path: str, column_name: str, 
                          sheet_name: str = None, patent_column_name: str = None, 
                          resume: bool = False, progress_callback=None) -> ProcessedClaims:
        """
        处理Excel文件
        
        Args:
            file_path: Excel文件路径
            column_name: 包含权利要求的列名
            sheet_name: 工作表名称
            patent_column_name: 包含专利公开号的列名
            resume: 是否从中断点恢复处理
            progress_callback: 进度回调函数，接收(current, total)参数
            
        Returns:
            处理结果
        """
        start_time = time.time()
        
        # 检查是否需要恢复处理
        if resume and self.enable_recovery:
            recovery_result = self._try_resume_processing(file_path, column_name, sheet_name)
            if recovery_result:
                return recovery_result
        
        # 初始化处理状态
        self.processing_state.update({
            'processed_cells': [],
            'current_cell_index': 0,
            'start_time': start_time,
            'file_path': file_path,
            'column_name': column_name,
            'sheet_name': sheet_name,
            'patent_column_name': patent_column_name
        })
        
        try:
            # 验证和读取Excel文件
            if not self.excel_processor.validate_excel_file(file_path):
                error = ProcessingError(
                    error_type="file_validation_error",
                    cell_index=-1,
                    error_message=f"无效的Excel文件: {file_path}",
                    suggested_action="请确保文件是有效的Excel格式(.xlsx或.xls)，且文件未损坏",
                    severity="critical"
                )
                return self._create_error_result([error])
            
            # 读取Excel文件
            try:
                df = self.excel_processor.read_excel_file(file_path, sheet_name)
            except Exception as e:
                error = ProcessingError(
                    error_type="file_read_error",
                    cell_index=-1,
                    error_message=f"读取Excel文件失败: {str(e)}",
                    suggested_action="请检查文件是否被其他程序占用，或者工作表名称是否正确",
                    severity="critical"
                )
                return self._create_error_result([error])
            
            # 验证列是否存在
            if column_name not in df.columns:
                available_columns = list(df.columns)
                error = ProcessingError(
                    error_type="column_not_found_error",
                    cell_index=-1,
                    error_message=f"列'{column_name}'不存在",
                    suggested_action=f"请选择以下可用列之一: {available_columns}",
                    severity="critical"
                )
                return self._create_error_result([error])
            
            # 获取列数据
            column_data = self.excel_processor.get_column_data(df, column_name)
            
            # 获取专利公开号列数据（如果提供）
            patent_data = []
            if patent_column_name and patent_column_name in df.columns:
                patent_data = self.excel_processor.get_column_data(df, patent_column_name)
            
            # 处理每个单元格
            all_claims = []
            processing_errors = []
            language_distribution = {}
            patent_numbers = []
            total_cells = len(column_data)
            
            for i, cell_text in enumerate(column_data):
                self.processing_state['current_cell_index'] = i
                
                # 调用进度回调（更频繁地更新，每5行或每2%更新一次）
                if progress_callback:
                    update_interval = max(5, total_cells // 50)  # 至少每5行，或每2%
                    if i % update_interval == 0 or i == total_cells - 1:
                        progress_callback(i + 1, total_cells)
                
                try:
                    # 获取当前行的专利公开号（如果有）
                    patent_number = None
                    if patent_data and i < len(patent_data):
                        patent_value = patent_data[i]
                        if patent_value and patent_value.strip():
                            patent_number = patent_value.strip()
                            if patent_number not in patent_numbers:
                                patent_numbers.append(patent_number)
                    
                    # 处理单元格 - 增强容错处理
                    cell_claims = self._process_single_cell_with_recovery(cell_text, i)
                    
                    if cell_claims:
                        # 关联专利公开号到权利要求
                        for claim in cell_claims:
                            claim.patent_number = patent_number
                            claim.row_index = i
                        
                        all_claims.extend(cell_claims)
                        
                        # 统计语言分布
                        for claim in cell_claims:
                            lang = claim.language
                            language_distribution[lang] = language_distribution.get(lang, 0) + 1
                    else:
                        # 记录空单元格或无效内容
                        if not cell_text or not cell_text.strip():
                            # 空单元格 - 保留空值行信息，以保持与元数据表格的一致
                            # 创建一个空的权利要求信息，仅包含行索引和专利号
                            from ..models import ClaimInfo
                            empty_claim = ClaimInfo(
                                claim_number=0,
                                claim_type="independent",
                                claim_text="",
                                language="other",
                                referenced_claims=[],
                                original_text="",
                                confidence_score=0.0,
                                patent_number=patent_number,
                                row_index=i
                            )
                            all_claims.append(empty_claim)
                        else:
                            # 有内容但无法解析 - 记录警告
                            error = ProcessingError(
                                error_type="cell_parsing_warning",
                                cell_index=i,
                                error_message="单元格包含文本但未能识别权利要求格式",
                                suggested_action="请检查文本格式是否符合权利要求标准",
                                severity="warning"
                            )
                            processing_errors.append(error)
                        
                except Exception as e:
                    # 单元格处理失败 - 记录错误但继续处理 (需求 7.2)
                    error = ProcessingError(
                        error_type="cell_processing_error",
                        cell_index=i,
                        error_message=f"处理单元格失败: {str(e)}",
                        suggested_action="请检查单元格内容格式，或联系技术支持",
                        severity="error"
                    )
                    processing_errors.append(error)
                
                # 保存处理状态 (需求 7.4)
                # 优化：大幅减少保存频率，每500行或每20%保存一次，避免I/O阻塞
                if self.enable_recovery:
                    save_interval = max(500, total_cells // 5)  # 至少每500行，或每20%
                    if i % save_interval == 0:
                        self._save_processing_state(all_claims, processing_errors, language_distribution)
            
            # 统计结果
            independent_count = sum(1 for claim in all_claims if claim.claim_type == 'independent')
            dependent_count = sum(1 for claim in all_claims if claim.claim_type == 'dependent')
            
            processing_time = time.time() - start_time
            
            result = ProcessedClaims(
                total_cells_processed=len(column_data),
                total_claims_extracted=len(all_claims),
                language_distribution=language_distribution,
                independent_claims_count=independent_count,
                dependent_claims_count=dependent_count,
                processing_errors=processing_errors,
                claims_data=all_claims,
                patent_numbers=patent_numbers if patent_numbers else None
            )
            
            # 清理恢复文件
            if self.enable_recovery:
                self._cleanup_recovery_file()
            
            return result
            
        except Exception as e:
            # 处理文件级别的错误 (需求 7.1)
            error = ProcessingError(
                error_type="file_processing_error",
                cell_index=-1,
                error_message=f"文件处理失败: {str(e)}",
                suggested_action="请检查文件格式、权限和内容完整性",
                severity="critical"
            )
            
            return self._create_error_result([error])
    
    def process_single_cell(self, cell_text: str) -> List[ClaimInfo]:
        """
        处理单个单元格的权利要求文本
        
        Args:
            cell_text: 单元格文本内容
            
        Returns:
            权利要求信息列表
        """
        return self._process_single_cell_with_recovery(cell_text, -1)
    
    def _process_single_cell_with_recovery(self, cell_text: str, cell_index: int) -> List[ClaimInfo]:
        """
        处理单个单元格的权利要求文本（带容错处理）
        
        Args:
            cell_text: 单元格文本内容
            cell_index: 单元格索引
            
        Returns:
            权利要求信息列表
        """
        # 需求 3.4: 跳过空单元格
        if not cell_text or not cell_text.strip():
            return []
        
        try:
            # 需求 3.3: 尽可能提取有效内容，即使格式不规范
            
            # 1. 预处理文本 - 清理常见的格式问题
            cleaned_text = self._preprocess_text(cell_text)
            
            # 2. 直接解析权利要求 - 让解析器处理多语言版本
            try:
                claims_dict = self.claims_parser.split_claims_by_numbers(cleaned_text)
                
                # 如果标准解析失败，尝试更宽松的解析
                if not claims_dict:
                    claims_dict = self._fallback_claim_parsing(cleaned_text)
                    
            except Exception as e:
                # 解析失败时尝试备用方法
                claims_dict = self._fallback_claim_parsing(cleaned_text)
            
            # 3. 分类权利要求
            claims_info = []
            for claim_number, claim_text in claims_dict.items():
                try:
                    # 标准化文本
                    normalized_text = self.claims_parser.normalize_claim_text(claim_text)
                    
                    # 检测当前权利要求的语言
                    claim_language = self.language_detector.detect_language(normalized_text)
                    
                    # 分类权利要求类型
                    claim_type = self.claims_classifier.classify_claim_type(normalized_text, claim_language)
                    
                    # 提取引用关系
                    referenced_claims = []
                    if claim_type == 'dependent':
                        try:
                            referenced_claims = self.claims_classifier.extract_referenced_claims(
                                normalized_text, claim_language
                            )
                        except Exception:
                            # 引用提取失败时，仍然标记为从属权利要求但引用为空
                            pass
                    
                    # 计算置信度分数
                    confidence_score = self._calculate_confidence_score(
                        normalized_text, claim_type, referenced_claims
                    )
                    
                    claim_info = ClaimInfo(
                        claim_number=claim_number,
                        claim_type=claim_type,
                        claim_text=normalized_text,
                        language=claim_language,
                        referenced_claims=referenced_claims,
                        original_text=cleaned_text,  # 保存完整的原始文本
                        confidence_score=confidence_score,
                        patent_number=None,  # 在单元格处理阶段暂时为None，后续会在上层设置
                        row_index=cell_index  # 保存Excel行索引
                    )
                    
                    claims_info.append(claim_info)
                    
                except Exception as e:
                    # 单个权利要求处理失败时，跳过但不影响其他权利要求
                    continue
            
            return claims_info
            
        except Exception as e:
            # 完全失败时返回空列表，错误将在上层处理
            raise Exception(f"处理单元格文本失败: {str(e)}")
    
    def _preprocess_text(self, text: str) -> str:
        """
        预处理文本，清理常见的格式问题
        
        Args:
            text: 原始文本
            
        Returns:
            清理后的文本
        """
        if not text:
            return ""
        
        # 移除多余的空白字符
        cleaned = text.strip()
        
        # 统一换行符
        cleaned = cleaned.replace('\r\n', '\n').replace('\r', '\n')
        
        # 移除多余的空行
        lines = [line.strip() for line in cleaned.split('\n') if line.strip()]
        cleaned = '\n'.join(lines)
        
        # 修复常见的编码问题
        cleaned = cleaned.replace('â€™', "'").replace('â€œ', '"').replace('â€', '"')
        
        return cleaned
    
    def _fallback_claim_parsing(self, text: str) -> Dict[int, str]:
        """
        备用的权利要求解析方法，用于处理格式不规范的文本
        
        Args:
            text: 权利要求文本
            
        Returns:
            序号到文本的映射字典
        """
        claims_dict = {}
        
        # 尝试更宽松的数字匹配
        import re
        
        # 寻找任何数字后跟文本的模式
        patterns = [
            r'(\d+)[\.、\)\s]+([^0-9]+?)(?=\d+[\.、\)\s]|$)',  # 数字 + 分隔符 + 文本
            r'(\d+)\s*[:：]\s*([^0-9]+?)(?=\d+\s*[:：]|$)',    # 数字 + 冒号 + 文本
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text, re.DOTALL)
            if matches:
                for match in matches:
                    try:
                        number = int(match[0])
                        content = match[1].strip()
                        if content and 1 <= number <= 1000:
                            claims_dict[number] = content
                    except (ValueError, IndexError):
                        continue
                break  # 如果找到匹配，就不尝试其他模式
        
        # 如果仍然没有找到，尝试将整个文本作为单个权利要求
        if not claims_dict and text.strip():
            # 检查是否包含任何数字
            if re.search(r'\d', text):
                claims_dict[1] = text.strip()
        
        return claims_dict
    
    def _calculate_confidence_score(self, claim_text: str, claim_type: str, 
                                  referenced_claims: List[int]) -> float:
        """
        计算权利要求处理的置信度分数
        
        Args:
            claim_text: 权利要求文本
            claim_type: 权利要求类型
            referenced_claims: 引用的权利要求列表
            
        Returns:
            置信度分数 (0.0 - 1.0)
        """
        score = 0.5  # 基础分数
        
        # 文本长度因子
        if len(claim_text) > 10:
            score += 0.2
        
        # 类型一致性因子
        if claim_type == 'dependent' and referenced_claims:
            score += 0.2
        elif claim_type == 'independent' and not referenced_claims:
            score += 0.2
        
        # 文本结构因子
        if claim_text.endswith(('.', '。')):
            score += 0.1
        
        return min(1.0, score)
    
    def generate_processing_report(self, results: List[ProcessingResult]) -> ProcessingReport:
        """
        生成处理报告
        
        Args:
            results: 处理结果列表
            
        Returns:
            处理报告
        """
        # 这是一个占位实现，实际使用时需要根据具体需求完善
        current_time = datetime.now().isoformat()
        
        # 合并所有处理结果
        all_claims = []
        all_errors = []
        total_time = 0.0
        
        for result in results:
            all_claims.extend(result.claims)
            all_errors.extend([
                ProcessingError(
                    error_type="processing_error",
                    cell_index=result.cell_index,
                    error_message=error,
                    suggested_action="检查输入数据",
                    severity="warning"
                ) for error in result.processing_errors
            ])
            total_time += result.processing_time
        
        # 创建ProcessedClaims对象
        processed_claims = ProcessedClaims(
            total_cells_processed=len(results),
            total_claims_extracted=len(all_claims),
            language_distribution={},  # 需要计算
            independent_claims_count=sum(1 for c in all_claims if c.claim_type == 'independent'),
            dependent_claims_count=sum(1 for c in all_claims if c.claim_type == 'dependent'),
            processing_errors=all_errors,
            claims_data=all_claims
        )
        
        return ProcessingReport(
            start_time=current_time,
            end_time=current_time,
            total_processing_time=total_time,
            processed_claims=processed_claims,
            validation_errors=[],
            performance_metrics={"total_time": total_time}
        )
    
    def validate_processing_results(self, results: List[ClaimInfo]) -> List[ValidationError]:
        """
        验证处理结果
        
        Args:
            results: 权利要求信息列表
            
        Returns:
            验证错误列表
        """
        validation_errors = []
        
        # 创建权利要求字典用于验证
        claims_dict = {claim.claim_number: claim for claim in results}
        
        # 使用分类器验证依赖关系
        dependency_errors = self.claims_classifier.validate_claim_dependencies(claims_dict)
        
        for error_msg in dependency_errors:
            validation_errors.append(
                ValidationError(
                    error_code="dependency_error",
                    message=error_msg,
                    severity="error"
                )
            )
        
        return validation_errors
    
    def _create_error_result(self, errors: List[ProcessingError]) -> ProcessedClaims:
        """
        创建错误结果
        
        Args:
            errors: 错误列表
            
        Returns:
            包含错误信息的处理结果
        """
        return ProcessedClaims(
            total_cells_processed=0,
            total_claims_extracted=0,
            language_distribution={},
            independent_claims_count=0,
            dependent_claims_count=0,
            processing_errors=errors,
            claims_data=[]
        )
    
    def _save_processing_state(self, claims: List[ClaimInfo], errors: List[ProcessingError], 
                             language_dist: Dict[str, int]) -> None:
        """
        保存处理状态到恢复文件
        
        Args:
            claims: 已处理的权利要求列表
            errors: 处理错误列表
            language_dist: 语言分布统计
        """
        if not self.enable_recovery:
            return
        
        try:
            state = {
                'processing_state': self.processing_state,
                'claims': [self._claim_to_dict(claim) for claim in claims],
                'errors': [self._error_to_dict(error) for error in errors],
                'language_distribution': language_dist,
                'timestamp': datetime.now().isoformat()
            }
            
            with open(self.recovery_file, 'w', encoding='utf-8') as f:
                json.dump(state, f, ensure_ascii=False, indent=2)
                
        except Exception as e:
            # 保存状态失败不应该影响主处理流程
            pass
    
    def _try_resume_processing(self, file_path: str, column_name: str, 
                             sheet_name: str, patent_column_name: str = None) -> Optional[ProcessedClaims]:
        """
        尝试从中断点恢复处理
        
        Args:
            file_path: Excel文件路径
            column_name: 列名
            sheet_name: 工作表名称
            patent_column_name: 专利公开号列名
            
        Returns:
            恢复的处理结果，如果无法恢复则返回None
        """
        if not os.path.exists(self.recovery_file):
            return None
        
        try:
            with open(self.recovery_file, 'r', encoding='utf-8') as f:
                state = json.load(f)
            
            # 验证恢复文件是否匹配当前处理请求
            saved_state = state.get('processing_state', {})
            if (saved_state.get('file_path') != file_path or 
                saved_state.get('column_name') != column_name or
                saved_state.get('sheet_name') != sheet_name or
                saved_state.get('patent_column_name') != patent_column_name):
                return None
            
            # 恢复处理结果
            claims = [self._dict_to_claim(claim_dict) for claim_dict in state.get('claims', [])]
            errors = [self._dict_to_error(error_dict) for error_dict in state.get('errors', [])]
            language_dist = state.get('language_distribution', {})
            
            # 统计结果
            independent_count = sum(1 for claim in claims if claim.claim_type == 'independent')
            dependent_count = sum(1 for claim in claims if claim.claim_type == 'dependent')
            
            # 清理恢复文件
            self._cleanup_recovery_file()
            
            # 提取专利公开号列表
            recovered_patent_numbers = []
            for claim in claims:
                if claim.patent_number and claim.patent_number not in recovered_patent_numbers:
                    recovered_patent_numbers.append(claim.patent_number)
            
            return ProcessedClaims(
                total_cells_processed=saved_state.get('current_cell_index', 0) + 1,
                total_claims_extracted=len(claims),
                language_distribution=language_dist,
                independent_claims_count=independent_count,
                dependent_claims_count=dependent_count,
                processing_errors=errors,
                claims_data=claims,
                patent_numbers=recovered_patent_numbers if recovered_patent_numbers else None
            )
            
        except Exception as e:
            # 恢复失败时返回None，将进行正常处理
            return None
    
    def _cleanup_recovery_file(self) -> None:
        """清理恢复文件"""
        try:
            if os.path.exists(self.recovery_file):
                os.remove(self.recovery_file)
        except Exception:
            pass
    
    def _claim_to_dict(self, claim: ClaimInfo) -> Dict[str, Any]:
        """将ClaimInfo转换为字典"""
        return {
            'claim_number': claim.claim_number,
            'claim_type': claim.claim_type,
            'claim_text': claim.claim_text,
            'language': claim.language,
            'referenced_claims': claim.referenced_claims,
            'original_text': claim.original_text,
            'confidence_score': claim.confidence_score,
            'patent_number': claim.patent_number,
            'row_index': claim.row_index
        }
    
    def _dict_to_claim(self, claim_dict: Dict[str, Any]) -> ClaimInfo:
        """将字典转换为ClaimInfo"""
        return ClaimInfo(
            claim_number=claim_dict['claim_number'],
            claim_type=claim_dict['claim_type'],
            claim_text=claim_dict['claim_text'],
            language=claim_dict['language'],
            referenced_claims=claim_dict['referenced_claims'],
            original_text=claim_dict['original_text'],
            confidence_score=claim_dict['confidence_score'],
            patent_number=claim_dict.get('patent_number'),
            row_index=claim_dict.get('row_index')
        )
    
    def _error_to_dict(self, error: ProcessingError) -> Dict[str, Any]:
        """将ProcessingError转换为字典"""
        return {
            'error_type': error.error_type,
            'cell_index': error.cell_index,
            'error_message': error.error_message,
            'suggested_action': error.suggested_action,
            'severity': error.severity
        }
    
    def _dict_to_error(self, error_dict: Dict[str, Any]) -> ProcessingError:
        """将字典转换为ProcessingError"""
        return ProcessingError(
            error_type=error_dict['error_type'],
            cell_index=error_dict['cell_index'],
            error_message=error_dict['error_message'],
            suggested_action=error_dict['suggested_action'],
            severity=error_dict['severity']
        )
    
    def get_processing_statistics(self) -> Dict[str, Any]:
        """
        获取处理统计信息
        
        Returns:
            统计信息字典
        """
        return {
            'current_cell_index': self.processing_state.get('current_cell_index', 0),
            'start_time': self.processing_state.get('start_time'),
            'file_path': self.processing_state.get('file_path'),
            'column_name': self.processing_state.get('column_name'),
            'sheet_name': self.processing_state.get('sheet_name'),
            'recovery_enabled': self.enable_recovery,
            'recovery_file_exists': os.path.exists(self.recovery_file) if self.recovery_file else False
        }
    
    def validate_input_data(self, file_path: str, column_name: str, 
                          sheet_name: str = None) -> List[ProcessingError]:
        """
        验证输入数据的完整性
        
        Args:
            file_path: Excel文件路径
            column_name: 列名
            sheet_name: 工作表名称
            
        Returns:
            验证错误列表
        """
        errors = []
        
        # 验证文件存在性
        if not os.path.exists(file_path):
            errors.append(ProcessingError(
                error_type="file_not_found",
                cell_index=-1,
                error_message=f"文件不存在: {file_path}",
                suggested_action="请检查文件路径是否正确",
                severity="critical"
            ))
            return errors
        
        # 验证文件格式
        if not self.excel_processor.validate_excel_file(file_path):
            errors.append(ProcessingError(
                error_type="invalid_file_format",
                cell_index=-1,
                error_message="文件不是有效的Excel格式",
                suggested_action="请确保文件是.xlsx或.xls格式",
                severity="critical"
            ))
            return errors
        
        try:
            # 验证工作表
            sheet_names = self.excel_processor.get_sheet_names(file_path)
            if sheet_name and sheet_name not in sheet_names:
                errors.append(ProcessingError(
                    error_type="sheet_not_found",
                    cell_index=-1,
                    error_message=f"工作表'{sheet_name}'不存在",
                    suggested_action=f"请选择以下可用工作表之一: {sheet_names}",
                    severity="error"
                ))
            
            # 验证列
            df = self.excel_processor.read_excel_file(file_path, sheet_name)
            if column_name not in df.columns:
                available_columns = list(df.columns)
                errors.append(ProcessingError(
                    error_type="column_not_found",
                    cell_index=-1,
                    error_message=f"列'{column_name}'不存在",
                    suggested_action=f"请选择以下可用列之一: {available_columns}",
                    severity="error"
                ))
            
        except Exception as e:
            errors.append(ProcessingError(
                error_type="validation_error",
                cell_index=-1,
                error_message=f"验证过程中发生错误: {str(e)}",
                suggested_action="请检查文件是否损坏或被占用",
                severity="error"
            ))
        
        return errors