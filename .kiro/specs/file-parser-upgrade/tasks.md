# Implementation Plan: 文件解析API升级

## Overview

本实现计划将功能一的文件上传和对话功能从旧的智谱AI文件管理API迁移到新的文件解析API。实现将分为后端API开发、前端处理器开发、UI集成和测试四个主要阶段，采用增量式开发方式，确保每个步骤都能独立验证。

## Tasks

- [ ] 1. 创建后端文件解析服务
  - [x] 1.1 实现FileParserService核心类
    - 创建`backend/services/file_parser_service.py`
    - 实现`create_parser_task()`方法，调用智谱AI解析API
    - 实现`get_parser_result()`方法，获取解析结果
    - 实现`poll_result()`方法，轮询直到完成或超时
    - 添加文件类型检测和大小验证
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.5_
  
  - [ ]* 1.2 编写FileParserService的属性测试
    - **Property 1: 解析任务创建返回唯一ID**
    - **Property 2: 支持的文件格式验证**
    - **Property 3: 文件大小和格式错误处理**
    - **Property 4: 轮询机制持续性**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.5**
  
  - [ ]* 1.3 编写FileParserService的单元测试
    - 测试API调用格式正确性
    - 测试错误处理（网络错误、超时、API错误）
    - 测试边缘情况（空文件、最大文件大小）
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 2. 创建Flask API路由
  - [x] 2.1 实现`/files/parser/create`路由
    - 创建`backend/routes/file_parser.py`
    - 实现文件上传处理
    - 调用FileParserService创建解析任务
    - 返回task_id和初始状态
    - 添加认证中间件
    - _Requirements: 8.1, 8.4_
  
  - [x] 2.2 实现`/files/parser/result/<task_id>`路由
    - 实现解析结果获取
    - 支持轮询参数（poll=true）
    - 返回解析状态和内容
    - 处理超时和错误情况
    - _Requirements: 8.2, 8.5, 2.3, 2.4_
  
  - [x] 2.3 保留旧的`/files/upload`路由以保持向后兼容
    - 确保旧路由仍然可用
    - 添加弃用警告日志
    - _Requirements: 8.3_
  
  - [ ]* 2.4 编写API路由的单元测试
    - 测试端点存在性和基本功能
    - 测试认证和权限
    - 测试请求参数验证
    - 测试响应格式
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 3. Checkpoint - 后端API验证
  - 使用Postman或curl测试API端点
  - 验证文件上传和解析流程
  - 确保所有测试通过
  - 询问用户是否有问题
  - **状态**: 已修复状态管理问题，功能现已可用

- [ ] 4. 实现前端文件解析处理器
  - [x] 4.1 创建FileParserHandler类
    - 创建`frontend/js/fileParserHandler.js`
    - 实现`handleFileUpload()`方法
    - 实现`createParserTask()`方法
    - 实现`pollParserResult()`方法
    - 实现`validateFile()`方法
    - 添加文件大小限制检查
    - _Requirements: 1.3, 1.4, 1.5, 2.1, 2.2, 2.5_
  
  - [x] 4.2 实现UI进度显示
    - 实现`showUploadProgress()`方法
    - 实现`updateProgress()`方法
    - 实现`showParseComplete()`方法
    - 实现`showError()`方法
    - 添加加载动画
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [ ]* 4.3 编写FileParserHandler的属性测试
    - **Property 6: UI状态转换正确性**
    - **Property 7: 文件内容状态管理**
    - **Property 13: 前端交互状态管理**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 9.1, 9.2**
  
  - [ ]* 4.4 编写FileParserHandler的单元测试
    - 测试文件验证逻辑
    - 测试错误处理
    - 测试超时处理
    - _Requirements: 6.1, 6.2, 6.3_

- [ ] 5. 集成文件解析到对话功能
  - [x] 5.1 修改chat.js中的handleChatFileUpload函数
    - 替换旧的文件上传逻辑
    - 使用FileParserHandler处理文件
    - 更新appState.chat.activeFile结构
    - 存储task_id而不是file_id
    - _Requirements: 4.1, 4.2_
  
  - [x] 5.2 修改消息发送逻辑
    - 在handleStreamChatRequest中附加文件内容
    - 在消息对象中记录文件元数据
    - 发送后清除activeFile状态
    - _Requirements: 4.2, 4.3, 4.5_
  
  - [x] 5.3 更新消息显示逻辑
    - 在addMessageToDOM中显示文件附加标记
    - 使用task_id而不是file_id
    - 显示文件名和解析服务类型
    - _Requirements: 4.4, 5.5_
  
  - [ ]* 5.4 编写对话集成的属性测试
    - **Property 8: 消息元数据完整性**
    - **Property 14: 资源清理完整性**
    - **Validates: Requirements 4.4, 4.5, 9.3, 9.5**

- [ ] 6. 实现解析服务选择功能
  - [x] 6.1 添加解析服务选择UI
    - 在文件上传区域添加服务选择下拉菜单
    - 显示Lite、Expert、Prime三个选项
    - 显示每个服务的说明和价格
    - 默认选择Lite服务
    - _Requirements: 5.2_
  
  - [x] 6.2 实现服务选择逻辑
    - 根据文件类型自动推荐服务
    - PDF默认Lite，图片和Office文档可选Prime
    - 在UI中显示当前使用的服务类型
    - 将tool_type参数传递给后端
    - _Requirements: 5.1, 5.3, 5.4, 5.5_
  
  - [ ]* 6.3 编写服务选择的属性测试
    - **Property 9: 解析服务选择逻辑**
    - **Validates: Requirements 5.1, 5.3, 5.4, 5.5**

- [ ] 7. 实现解析结果管理
  - [ ] 7.1 添加本地存储管理
    - 在appState中添加fileParser.history数组
    - 保存解析任务ID和结果到localStorage
    - 实现saveParserHistory()和loadParserHistory()函数
    - _Requirements: 7.1_
  
  - [ ] 7.2 创建文件列表UI
    - 添加"已解析文件"列表显示
    - 显示文件名、状态、时间、大小
    - 添加删除和复用按钮
    - _Requirements: 7.2, 7.3, 7.4_
  
  - [ ] 7.3 实现文件复用功能
    - 点击复用按钮直接加载解析结果
    - 不需要重新上传和解析
    - 更新activeFile状态
    - _Requirements: 7.5_
  
  - [ ]* 7.4 编写解析结果管理的属性测试
    - **Property 11: 解析结果持久化**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.5**

- [ ] 8. Checkpoint - 功能完整性验证
  - 测试完整的文件上传和解析流程
  - 测试不同文件格式和大小
  - 测试错误处理和重试
  - 测试解析结果管理
  - 确保所有测试通过
  - 询问用户是否有问题

- [ ] 9. 实现错误处理和重试机制
  - [ ] 9.1 添加统一错误处理
    - 创建`backend/utils/error_handler.py`
    - 实现handle_parser_error()函数
    - 添加错误日志记录
    - 返回用户友好的错误信息
    - _Requirements: 6.4_
  
  - [ ] 9.2 实现前端错误显示
    - 在UI中显示清晰的错误信息
    - 添加重试按钮
    - 处理网络错误、超时、API错误
    - _Requirements: 6.1, 6.2, 6.3, 6.5_
  
  - [ ] 9.3 实现取消功能
    - 添加取消按钮到解析进度UI
    - 实现cancelParsing()方法
    - 停止轮询定时器
    - 清除相关状态
    - _Requirements: 9.3_
  
  - [ ]* 9.4 编写错误处理的属性测试
    - **Property 3: 文件大小和格式错误处理**
    - **Property 10: 错误恢复和重试**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

- [ ] 10. 优化和性能改进
  - [ ] 10.1 优化轮询策略
    - 实现指数退避轮询（2s, 4s, 8s...）
    - 减少不必要的API调用
    - 添加轮询状态缓存
    - _Requirements: 2.1, 2.2_
  
  - [ ] 10.2 添加文件内容缓存
    - 缓存已解析的文件内容
    - 避免重复解析相同文件
    - 实现LRU缓存策略
    - _Requirements: 7.5_
  
  - [ ] 10.3 优化UI响应性
    - 使用Web Worker处理大文件
    - 添加虚拟滚动到文件列表
    - 优化DOM更新
    - _Requirements: 9.1, 9.2_
  
  - [ ]* 10.4 编写性能测试
    - **Property 15: 文本内容结构保持**
    - **Validates: Requirements 10.3, 10.4, 10.5**

- [ ] 11. 集成测试和端到端测试
  - [ ]* 11.1 编写集成测试
    - 测试完整的文件上传到对话流程
    - 测试多文件场景
    - 测试并发上传
    - _Requirements: 所有需求_
  
  - [ ]* 11.2 编写端到端测试
    - 使用Playwright或Selenium
    - 测试真实用户场景
    - 测试不同浏览器兼容性
    - _Requirements: 所有需求_

- [ ] 12. 文档和部署准备
  - [ ] 12.1 更新API文档
    - 记录新的API端点
    - 添加请求/响应示例
    - 标记旧端点为弃用
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [ ] 12.2 创建用户指南
    - 编写文件上传使用说明
    - 说明支持的文件格式和大小限制
    - 说明解析服务的区别
    - _Requirements: 1.3, 5.1, 5.2_
  
  - [ ] 12.3 准备部署配置
    - 更新环境变量配置
    - 添加智谱AI API密钥配置
    - 更新依赖列表
    - 创建数据库迁移脚本（如需要）

- [ ] 13. Final Checkpoint - 完整验证
  - 运行所有测试套件
  - 验证所有15个属性
  - 进行代码审查
  - 确认所有需求都已实现
  - 询问用户是否准备部署

## Notes

- 任务标记`*`的为可选任务，可以跳过以加快MVP开发
- 每个任务都引用了具体的需求编号以确保可追溯性
- Checkpoint任务确保增量验证
- 属性测试验证通用正确性属性
- 单元测试验证具体示例和边缘情况
- 建议按顺序执行任务，确保每个阶段完成后再进入下一阶段
