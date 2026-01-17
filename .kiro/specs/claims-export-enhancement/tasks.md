# Implementation Plan: Claims Export Enhancement

## Overview

本实现计划将专利权利要求处理器的导出功能增强分解为离散的编码步骤。实现分为两个主要部分：修复前端报告查看功能，以及在后端添加独立权利要求汇总工作表。每个任务都引用具体的需求，并包含相应的测试任务以确保正确性。

## Tasks

- [ ] 1. 修复前端报告查看功能
  - [x] 1.1 修复报告数据获取和模态框显示逻辑
    - 在 `frontend/js/claimsProcessor.js` 中修复 `viewReport()` 函数
    - 实现 `getReportData()` 函数从存储中获取报告数据
    - 修复 `showReportModal()` 函数确保正确显示模态框
    - 添加错误处理和用户反馈机制
    - _Requirements: 1.1, 1.2_
  
  - [x] 1.2 实现报告内容填充和DOM操作
    - 实现 `populateReportContent()` 函数填充报告字段
    - 确保所有报告数据字段正确渲染到DOM元素
    - 处理缺失字段的默认值显示
    - _Requirements: 1.3_
  
  - [x] 1.3 实现模态框关闭和清理逻辑
    - 实现 `setupModalCloseHandlers()` 函数
    - 添加关闭按钮和背景点击事件监听器
    - 确保关闭时正确清理DOM状态和事件监听器
    - _Requirements: 1.4_
  
  - [ ]* 1.4 编写前端报告查看功能的property tests
    - **Property 1: 报告模态框正确渲染所有字段**
    - **Property 2: 报告加载失败时显示错误消息**
    - **Property 3: 模态框关闭后正确清理状态**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

- [ ] 2. 实现后端权利要求数据提取辅助函数
  - [x] 2.1 在Claims Parser中添加独立权利要求提取函数
    - 在 `backend/processors/claims_parser.py` 中实现 `extract_independent_claims()` 函数
    - 从行数据中过滤出所有type为'independent'的权利要求
    - 返回包含序号和文本的字典列表
    - _Requirements: 3.1, 3.2_
  
  - [x] 2.2 实现引用关系映射构建函数
    - 在 `backend/processors/claims_parser.py` 中实现 `build_reference_map()` 函数
    - 遍历所有从属权利要求，提取referenced_claims字段
    - 构建 {从属序号: [被引用序号列表]} 格式的字典
    - 处理缺失或格式错误的引用数据
    - _Requirements: 4.2, 4.3, 7.3_
  
  - [ ]* 2.3 编写数据提取函数的property tests
    - **Property 7: 正确提取独立权利要求数据**
    - **Property 11: 引用关系完整记录**
    - **Property 18: 引用关系错误时使用默认值**
    - **Validates: Requirements 3.1, 3.2, 4.2, 4.3, 7.3**

- [ ] 3. 实现汇总工作表创建核心功能
  - [x] 3.1 在Export Service中实现create_summary_sheet函数
    - 在 `backend/services/export_service.py` 中实现 `create_summary_sheet()` 函数
    - 创建新工作表并设置为第一个工作表（索引0）
    - 添加列标题："原数据行号"、"独立权利要求序号"、"独立权利要求文本"、"从属权利要求引用关系"
    - _Requirements: 2.1, 2.2, 2.5_
  
  - [x] 3.2 实现数据行处理和汇总行生成逻辑
    - 遍历processed_data，调用extract_independent_claims提取独立权利要求
    - 跳过不包含独立权利要求的行
    - 对每个包含独立权利要求的行，生成汇总行数据
    - 记录原数据行号（从2开始计数）
    - _Requirements: 2.3, 2.4, 5.1, 5.2_
  
  - [x] 3.3 实现多权利要求的格式化逻辑
    - 将多个独立权利要求序号用", "连接
    - 将多个独立权利要求文本用"\n\n"连接
    - 确保特殊字符正确处理
    - _Requirements: 3.3, 3.4_
  
  - [x] 3.4 实现引用关系JSON生成和写入
    - 调用build_reference_map获取引用关系
    - 使用json.dumps转换为JSON字符串（ensure_ascii=False）
    - 将JSON字符串写入"从属权利要求引用关系"列
    - 处理空引用关系情况（返回"{}"）
    - _Requirements: 4.1, 4.4, 4.5_
  
  - [x] 3.5 设置工作表样式和列宽
    - 设置列宽：A列15，B列20，C列60，D列40
    - 应用标题行样式（粗体、背景色）
    - 启用文本自动换行
    - _Requirements: 6.3_
  
  - [ ]* 3.6 编写汇总工作表创建的property tests
    - **Property 4: Excel文件包含汇总工作表**
    - **Property 5: 汇总工作表包含正确的列标题**
    - **Property 6: 仅为包含独立权利要求的行生成汇总记录**
    - **Property 8: 多个独立权利要求的序号格式化**
    - **Property 9: 多个独立权利要求的文本格式化**
    - **Property 10: 引用关系JSON有效性（Round-trip）**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 3.3, 3.4, 4.1, 4.4, 4.5**

- [ ] 4. Checkpoint - 测试核心功能
  - 确保所有测试通过，如有问题请询问用户

- [ ] 5. 集成汇总工作表到现有导出流程
  - [x] 5.1 修改generate_excel函数调用create_summary_sheet
    - 在 `backend/services/export_service.py` 的 `generate_excel()` 函数中添加调用
    - 在创建其他工作表之前调用create_summary_sheet
    - 确保processed_data正确传递
    - _Requirements: 2.1, 2.5_
  
  - [x] 5.2 验证所有现有工作表仍然正常创建
    - 确保"权利要求详情"、"处理统计"、"错误报告"工作表仍然存在
    - 验证工作表顺序：汇总表在第一位，其他表保持原有顺序
    - _Requirements: 6.1_
  
  - [ ]* 5.3 编写Excel导出完整性的property tests
    - **Property 14: 保留所有现有工作表**
    - **Property 16: 正确的HTTP响应头**
    - **Validates: Requirements 6.1, 6.4**

- [ ] 6. 实现错误处理和边缘情况
  - [x] 6.1 添加数据解析错误处理
    - 在extract_independent_claims和build_reference_map中添加try-except
    - 记录错误到日志系统
    - 继续处理其他行，不中断整个导出过程
    - _Requirements: 7.2_
  
  - [x] 6.2 添加Excel写入错误处理
    - 在generate_excel和create_summary_sheet中添加异常捕获
    - 返回HTTP 500响应，包含错误详情
    - 清理临时文件
    - _Requirements: 6.2, 7.4_
  
  - [x] 6.3 处理空数据和特殊情况
    - 处理空数据集（创建只有标题行的工作表）
    - 处理大行号（超过999）
    - 处理特殊字符和Unicode
    - _Requirements: 7.1, 5.4, 3.5_
  
  - [ ]* 6.4 编写错误处理和边缘情况的tests
    - **Property 15: 导出错误时返回错误响应**
    - **Property 17: 解析错误时继续处理**
    - **Property 12: 原数据行号正确记录**
    - **Property 13: 同源记录的行号一致性**
    - 单元测试：空数据情况（Requirement 7.1）
    - 单元测试：文件写入失败（Requirement 7.4）
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 6.2, 7.1, 7.2, 7.4**

- [ ] 7. 最终集成测试和验证
  - [x] 7.1 执行端到端集成测试
    - 测试完整的上传→处理→导出→验证流程
    - 使用真实的Excel文件测试
    - 验证生成的Excel文件可以正常打开和读取
    - _Requirements: All_
  
  - [x] 7.2 验证前端报告查看功能
    - 在浏览器中测试"查看报告"按钮
    - 验证模态框正确显示和关闭
    - 测试各种报告数据格式
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 7.3 性能和兼容性测试
    - 测试大文件处理（1000+行）
    - 验证内存使用合理
    - 测试不同浏览器的兼容性
    - _Requirements: 7.5_

- [x] 8. Final Checkpoint - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户

## Notes

- 任务标记 `*` 的为可选任务，可以跳过以加快MVP开发
- 每个任务都引用了具体的需求编号以便追溯
- Property tests使用Hypothesis库，最少100次迭代
- 前端tests使用Jest或类似框架
- 后端tests使用pytest
- Checkpoint任务确保增量验证
- 建议按顺序执行任务，确保依赖关系正确
