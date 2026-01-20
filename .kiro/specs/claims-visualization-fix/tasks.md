# Implementation Plan: Claims Visualization Fix

## Overview

本实施计划针对功能七（权利要求处理和可视化）的四个关键问题提供分步修复方案。修复将按照后端 → 前端 → 测试的顺序进行，确保数据流的完整性。

## Tasks

- [x] 1. 后端数据模型和处理逻辑修复
  - [x] 1.1 扩展ClaimInfo模型添加专利号字段
    - 在`patent_claims_processor/models/claim_info.py`中添加`patent_number`和`row_index`可选字段
    - 更新`__init__`方法和`to_dict`方法以支持新字段
    - _Requirements: 1.1, 1.2, 6.1_
  
  - [x] 1.2 修改ProcessingService提取专利号
    - 在`patent_claims_processor/services/processing_service.py`的`process_excel_file`方法中添加`patent_column_name`参数
    - 读取Excel文件时同时读取专利号列数据
    - 在处理每个单元格时，提取对应行的专利号值
    - 创建ClaimInfo对象时附加`patent_number`和`row_index`
    - _Requirements: 1.1, 1.2_
  
  - [x] 1.3 更新Claims API接受专利号列参数
    - 在`backend/routes/claims.py`的`process_claims`函数中添加`patent_column_name`参数处理
    - 从请求体中提取`patent_column_name`
    - 将参数传递给`ProcessingService.process_excel_file`
    - _Requirements: 1.1_
  
  - [x] 1.4 确保API响应包含专利号数据
    - 在`get_processing_result`函数中验证返回的claims数据包含`patent_number`字段
    - 在`claims_by_row`结构中也包含专利号信息
    - _Requirements: 6.3_

- [x] 2. 前端公开号显示和分组逻辑修复
  - [x] 2.1 修复showClaimsPatentSummarySection函数
    - 修改`js/claimsProcessorIntegrated.js`中的`showClaimsPatentSummarySection`函数
    - 正确按专利号分组所有权利要求（使用对象或Map）
    - 为每个唯一专利号创建一行表格记录
    - 完整合并独立权利要求文本，不截断
    - 处理专利号缺失的情况（使用行索引作为备用）
    - _Requirements: 1.3, 1.5, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4_
  
  - [x] 2.2 添加CSS样式支持完整内容显示
    - 在相关CSS文件中添加`.merged-claims-cell`和`.merged-claims-content`样式
    - 设置`max-height`和`overflow-y: auto`以支持滚动
    - 确保长文本可以完整查看
    - _Requirements: 2.3, 2.4_
  
  - [x] 2.3 优化claimsFindPatentClaims查找逻辑
    - 修改`claimsFindPatentClaims`函数实现多策略查找
    - 策略1: 按专利号精确匹配
    - 策略2: 按专利号模糊匹配
    - 策略3: 按行号查找（备用）
    - 策略4: 返回所有权利要求（最后备用）
    - 添加详细的日志输出便于调试
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 3. 可视化渲染器递归修复
  - [x] 3.1 修复buildHierarchy方法防止无限递归
    - 修改`ClaimsD3TreeRenderer.buildHierarchy`方法
    - 在`buildChildren`递归函数中添加`visited`参数（Set类型）
    - 在`buildChildren`递归函数中添加`depth`参数
    - 在每次递归前检查节点是否已访问，如已访问则返回null
    - 检查递归深度是否超过50层，如超过则终止并记录警告
    - 创建新的visited集合传递给子递归调用，避免修改父级集合
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [x] 3.2 添加引用有效性验证
    - 在构建可视化数据前验证所有引用的权利要求存在
    - 检测并记录无效引用
    - 过滤掉无效的连接（links）
    - _Requirements: 4.5_
  
  - [x] 3.3 更新renderTree和renderRadial方法
    - 确保这两个方法也使用修复后的`buildHierarchy`
    - 测试树状图和径向图的渲染不会导致堆栈溢出
    - _Requirements: 4.1, 4.4_

- [ ] 4. Checkpoint - 基本功能验证
  - 手动测试上传包含专利号的Excel文件
  - 验证公开号与独权合并视窗显示所有专利
  - 验证点击"查看引用图"不会出现堆栈溢出错误
  - 确保所有测试通过，询问用户是否有问题

- [ ] 5. 错误处理和边缘情况
  - [ ] 5.1 添加专利号缺失处理
    - 在后端和前端都添加专利号缺失的处理逻辑
    - 使用行索引作为备用标识符
    - 在UI中显示适当的警告消息
    - _Requirements: 1.4_
  
  - [ ] 5.2 添加循环引用错误处理
    - 在检测到循环引用时记录详细的警告日志
    - 包含循环路径信息便于调试
    - 确保系统不崩溃，继续处理其他数据
    - _Requirements: 4.3_
  
  - [ ] 5.3 添加查找失败错误处理
    - 在所有查找策略失败时显示清晰的错误消息
    - 提供用户建议（检查输入、尝试其他关键词等）
    - 允许用户重新尝试
    - _Requirements: 5.5_
  
  - [ ] 5.4 添加独立权利要求缺失处理
    - 在专利没有独立权利要求时显示"无独立权利要求"
    - 仍然允许查看从属权利要求
    - _Requirements: 2.5_

- [ ] 6. 单元测试
  - [ ]* 6.1 测试专利号提取逻辑
    - 测试有专利号列的情况
    - 测试无专利号列的情况（使用行索引）
    - 测试专利号列为空的情况
    - _Requirements: 1.1, 1.2_
  
  - [ ]* 6.2 测试分组逻辑
    - 测试单个专利的情况
    - 测试多个专利的情况
    - 测试重复专利号的情况
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [ ]* 6.3 测试文本合并逻辑
    - 测试单个独立权利要求
    - 测试多个独立权利要求
    - 测试无独立权利要求的情况
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [ ]* 6.4 测试循环检测逻辑
    - 测试简单循环（A → B → A）
    - 测试复杂循环（A → B → C → A）
    - 测试自引用（A → A）
    - _Requirements: 4.1, 4.3_
  
  - [ ]* 6.5 测试查找策略
    - 测试精确匹配成功
    - 测试模糊匹配成功
    - 测试行号查找成功
    - 测试所有方法失败
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 7. 属性测试
  - [ ]* 7.1 Property 1: 专利号提取和附加
    - **Property 1: 专利号提取和附加**
    - **Validates: Requirements 1.1, 1.2, 6.1**
    - 使用Hypothesis生成随机Excel数据
    - 验证每个ClaimInfo对象包含patent_number
    - 至少100次迭代
  
  - [ ]* 7.2 Property 2: 专利分组完整性
    - **Property 2: 专利分组完整性**
    - **Validates: Requirements 1.5, 3.1, 3.2, 3.3, 3.4**
    - 使用fast-check生成随机权利要求集合
    - 验证分组数量等于唯一专利号数量
    - 验证每个专利的所有权利要求都在对应分组中
    - 至少100次迭代
  
  - [ ]* 7.3 Property 3: 独立权利要求合并完整性
    - **Property 3: 独立权利要求合并完整性**
    - **Validates: Requirements 2.1, 2.2, 2.3**
    - 使用fast-check生成随机独立权利要求集合
    - 验证合并文本包含所有原始文本
    - 验证文本用空格连接且不截断
    - 至少100次迭代
  
  - [ ]* 7.4 Property 4: 循环引用检测
    - **Property 4: 循环引用检测**
    - **Validates: Requirements 4.1, 4.3**
    - 使用fast-check生成包含循环的依赖关系图
    - 验证buildHierarchy不抛出堆栈溢出错误
    - 验证循环被检测并记录
    - 至少100次迭代
  
  - [ ]* 7.5 Property 5: 递归深度限制
    - **Property 5: 递归深度限制**
    - **Validates: Requirements 4.4**
    - 使用fast-check生成深层嵌套的依赖关系
    - 验证递归深度不超过50层
    - 至少100次迭代
  
  - [ ]* 7.6 Property 6: 引用有效性验证
    - **Property 6: 引用有效性验证**
    - **Validates: Requirements 4.5**
    - 使用fast-check生成随机引用关系
    - 验证所有引用的权利要求存在
    - 验证不存在循环引用
    - 至少100次迭代
  
  - [ ]* 7.7 Property 7: 查找策略优先级
    - **Property 7: 查找策略优先级**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
    - 使用fast-check生成随机专利号查询
    - 验证查找按正确的优先级执行
    - 验证返回所有匹配的权利要求
    - 至少100次迭代
  
  - [ ]* 7.8 Property 8: 数据传递一致性
    - **Property 8: 数据传递一致性**
    - **Validates: Requirements 6.2, 6.3, 6.4, 6.5**
    - 使用Hypothesis生成随机权利要求数据
    - 验证patent_number在所有阶段保持一致
    - 测试后端处理 → JSON序列化 → API响应 → 前端接收
    - 至少100次迭代
  
  - [ ]* 7.9 Property 9: 公开号显示完整性
    - **Property 9: 公开号显示完整性**
    - **Validates: Requirements 1.3, 3.5**
    - 使用fast-check生成随机权利要求数据
    - 验证每个唯一专利号都有一行显示
    - 验证显示包含专利号和合并内容
    - 至少100次迭代

- [ ] 8. 集成测试
  - [ ]* 8.1 端到端流程测试
    - 测试完整流程：上传Excel → 处理 → 显示公开号视窗 → 查看可视化
    - 验证专利号在整个流程中正确传递
    - 使用真实的Excel文件进行测试
    - _Requirements: 所有需求_
  
  - [ ]* 8.2 API端点测试
    - 测试/api/claims/process端点返回包含patent_number的数据
    - 测试/api/claims/result端点返回正确的分组数据
    - 测试/api/claims/export端点导出包含专利号的数据
    - _Requirements: 6.2, 6.3_
  
  - [ ]* 8.3 UI交互测试
    - 测试公开号与独权合并视窗显示所有专利
    - 测试点击"查看引用图"按钮正常工作
    - 测试可视化图表正确渲染所有节点和连接
    - 测试缩放和平移功能正常
    - _Requirements: 1.3, 3.5, 4.1_

- [ ] 9. Final Checkpoint - 完整功能验证
  - 运行所有单元测试和属性测试
  - 手动测试所有修复的功能
  - 验证四个原始问题都已解决：
    1. 公开号正确显示
    2. 独权合并内容完整显示
    3. 所有专利数据都显示
    4. 没有堆栈溢出错误
  - 确保所有测试通过，询问用户是否有问题

## Notes

- 任务标记`*`的为可选任务，可以跳过以加快MVP开发
- 每个任务都引用了具体的需求编号以确保可追溯性
- 建议按顺序执行任务，因为后续任务依赖前面任务的完成
- 属性测试使用Hypothesis（Python）和fast-check（JavaScript）
- 每个属性测试至少运行100次迭代以确保充分覆盖
- Checkpoint任务用于验证阶段性成果，确保增量进展
