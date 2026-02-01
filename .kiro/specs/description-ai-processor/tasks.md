# Implementation Plan: 说明书AI处理器

## Overview

本实现计划将"说明书AI处理器"功能集成到现有的功能八(专利附图标注)中。实现分为前端UI组件、后端AI处理管道、配置管理三个主要部分,采用渐进式开发方式,确保每一步都能与现有系统集成并通过测试验证。

## Tasks

- [x] 1. 设置项目结构和依赖
  - 创建后端服务目录结构 `backend/services/ai_description/`
  - 安装必需的Python依赖: `langdetect`, `hypothesis` (测试用)
  - 创建前端组件目录 `frontend/js/ai_description/`
  - 创建提示词模板目录 `backend/templates/prompts/`
  - _Requirements: 8.1, 8.3_

- [ ] 2. 实现语言检测模块
  - [x] 2.1 创建 LanguageDetector 类
    - 实现 `detect(text)` 方法,使用langdetect库
    - 实现 `is_chinese(text)` 辅助方法
    - 处理检测失败的异常情况
    - 文件位置: `backend/services/ai_description/language_detector.py`
    - _Requirements: 4.1, 4.2_
  
  - [ ]* 2.2 编写语言检测属性测试
    - **Property 6: 语言检测一致性**
    - **Validates: Requirements 4.1**
    - 使用Hypothesis生成随机文本测试检测一致性
    - 测试已知语言样本的检测准确性
  
  - [ ]* 2.3 编写语言检测单元测试
    - 测试中文、英文、日文检测
    - 测试文本过短的边缘情况
    - 测试混合语言文本
    - _Requirements: 4.2, 7.2_

- [ ] 3. 实现翻译服务模块
  - [x] 3.1 创建 TranslationService 类
    - 实现 `translate_to_chinese(text, source_lang, model_name)` 方法
    - 集成AI模型API调用(复用功能六的模型调用机制)
    - 实现翻译提示词模板
    - 处理翻译失败和超时
    - 文件位置: `backend/services/ai_description/translation_service.py`
    - _Requirements: 4.3, 7.3_
  
  - [ ]* 3.2 编写翻译逻辑属性测试
    - **Property 7: 翻译逻辑正确性**
    - **Validates: Requirements 4.3, 4.4**
    - 测试非中文文本触发翻译
    - 测试中文文本跳过翻译
  
  - [ ]* 3.3 编写翻译服务单元测试
    - 测试翻译API调用
    - 测试翻译服务不可用的错误处理
    - Mock AI模型响应
    - _Requirements: 7.3_

- [ ] 4. 实现AI部件抽取模块
  - [x] 4.1 创建提示词模板文件
    - 创建默认提示词模板 `backend/templates/prompts/component_extraction.txt`
    - 包含清晰的任务说明和JSON格式要求
    - _Requirements: 3.2, 5.1_
  
  - [x] 4.2 创建 AIComponentExtractor 类
    - 实现 `extract(description_text, model_name, model_config, custom_prompt)` 方法
    - 实现 `_load_default_template()` 加载默认模板
    - 实现 `_format_prompt(template, text)` 格式化提示词
    - 实现 `_parse_ai_response(response)` 解析AI返回的JSON
    - 处理JSON解析错误
    - 文件位置: `backend/services/ai_description/ai_component_extractor.py`
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 7.1_
  
  - [ ]* 4.3 编写组件结构属性测试
    - **Property 10: 组件数组结构完整性**
    - **Validates: Requirements 5.5, 6.4, 6.5**
    - 测试返回的components数组结构
    - 验证每个元素包含marker和name字段
  
  - [ ]* 4.4 编写AI抽取单元测试
    - 测试数字标记识别(示例: "10", "20")
    - 测试图号标记识别(示例: "图1", "Fig. 1")
    - 测试空结果处理
    - 测试JSON解析错误处理
    - _Requirements: 5.2, 5.3, 7.4_

- [ ] 5. 实现AI处理协调服务
  - [x] 5.1 创建 AIDescriptionProcessor 类
    - 实现 `process(description_text, model_name, custom_prompt)` 主方法
    - 协调语言检测、翻译、抽取三个步骤
    - 实现错误处理和日志记录
    - 返回结构化的JSON结果
    - 文件位置: `backend/services/ai_description/ai_description_processor.py`
    - _Requirements: 4.1, 4.3, 4.4, 4.5, 5.1, 6.1, 6.2, 6.3, 6.4, 7.5_
  
  - [ ]* 5.2 编写响应格式属性测试
    - **Property 8: 响应语言字段存在性**
    - **Property 9: 翻译场景响应格式**
    - **Property 11: JSON响应格式有效性**
    - **Property 12: 响应结构完整性**
    - **Validates: Requirements 4.5, 6.1, 6.2, 6.3, 6.4**
  
  - [ ]* 5.3 编写错误处理属性测试
    - **Property 13: 错误日志记录**
    - **Validates: Requirements 7.5**
    - 测试各种错误场景的日志记录

- [x] 6. Checkpoint - 后端核心功能验证
  - 确保所有后端模块测试通过
  - 验证AI处理管道的端到端流程
  - 如有问题请向用户询问

- [ ] 7. 扩展后端API路由
  - [x] 7.1 修改 drawing_marker.py 路由
    - 扩展 `/api/drawing-marker/extract` 端点
    - 添加 `ai_mode`, `model_name`, `custom_prompt` 参数支持
    - 实现模式路由逻辑(AI vs 规则分词)
    - 保持与现有接口的兼容性
    - 文件位置: `backend/routes/drawing_marker.py`
    - _Requirements: 1.4, 1.5, 8.1, 8.2_
  
  - [ ]* 7.2 编写处理模式路由属性测试
    - **Property 2: 处理模式路由正确性**
    - **Property 14: 接口兼容性**
    - **Validates: Requirements 1.4, 1.5, 8.1, 8.5**
    - 测试AI模式和规则模式的路由
    - 测试返回格式的一致性
  
  - [ ]* 7.3 编写API端点单元测试
    - 测试AI模式请求
    - 测试规则模式请求
    - 测试参数验证
    - 测试错误响应格式
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 8. 实现前端AI处理控制面板
  - [x] 8.1 创建 AIProcessingPanel 类
    - 实现构造函数和状态管理
    - 实现 `render()` 方法创建UI元素
    - 实现 `toggleMode(enabled)` 切换处理模式
    - 实现 `loadModels()` 从配置加载模型列表
    - 实现 `getConfig()` 获取当前配置
    - 文件位置: `frontend/js/ai_description/ai_processing_panel.js`
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3_
  
  - [ ]* 8.2 编写模式切换属性测试
    - **Property 1: 模式切换状态一致性**
    - **Validates: Requirements 1.2, 1.3**
    - 测试开关状态翻转和UI更新
  
  - [ ]* 8.3 编写控制面板单元测试
    - 测试开关按钮渲染
    - 测试模型列表加载
    - 测试配置获取
    - _Requirements: 1.1, 2.1, 2.2_

- [ ] 9. 实现模型选择器组件
  - [x] 9.1 在 AIProcessingPanel 中添加模型选择功能
    - 实现 `renderModelSelector()` 渲染选择器UI
    - 实现 `selectModel(modelName)` 处理模型选择
    - 实现模型选择的持久化(localStorage)
    - 在AI模式开启时显示选择器
    - _Requirements: 2.1, 2.3, 2.4, 2.5_
  
  - [ ]* 9.2 编写模型选择属性测试
    - **Property 3: 模型选择器显示完整性**
    - **Property 4: 模型选择持久化和使用**
    - **Validates: Requirements 2.3, 2.4, 2.5**

- [ ] 10. 实现提示词编辑器组件
  - [x] 10.1 创建 PromptEditor 类
    - 实现构造函数和默认模板加载
    - 实现 `loadDefaultTemplate()` 加载默认模板
    - 实现 `getPrompt()` 获取当前提示词
    - 实现 `saveCustomPrompt(prompt)` 保存自定义提示词
    - 实现 `resetToDefault()` 重置为默认模板
    - 实现编辑器UI(textarea + 按钮)
    - 文件位置: `frontend/js/ai_description/prompt_editor.js`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [ ]* 10.2 编写提示词管理属性测试
    - **Property 5: 提示词编辑和应用**
    - **Validates: Requirements 3.3, 3.4, 3.5**
  
  - [ ]* 10.3 编写提示词编辑器单元测试
    - 测试默认模板加载
    - 测试自定义提示词保存
    - 测试重置功能
    - _Requirements: 3.2, 3.3, 3.4_

- [x] 11. 集成前端组件到功能八界面
  - [x] 11.1 修改功能八的HTML和JavaScript
    - 在功能八界面添加AI处理控制面板容器
    - 初始化 AIProcessingPanel 和 PromptEditor
    - 连接开关状态到处理逻辑
    - 修改说明书提交逻辑,包含AI配置参数
    - 文件位置: 修改现有的功能八相关文件
    - _Requirements: 8.4_
  
  - [x] 11.2 实现处理结果显示
    - 显示检测到的语言
    - 显示翻译文本(如果有)
    - 显示抽取的标记列表
    - 显示处理时间和警告信息
    - _Requirements: 4.5, 5.5, 7.4_

- [ ] 12. 添加CSS样式
  - [x] 12.1 创建AI处理面板样式
    - 开关按钮样式
    - 模型选择器样式
    - 提示词编辑器样式
    - 与现有功能八UI协调一致
    - 文件位置: `frontend/css/components/ai-description-processor.css`
    - _Requirements: 8.4_

- [x] 13. 实现性能优化和进度反馈
  - [x] 13.1 添加处理进度反馈
    - 实现进度回调机制
    - 在前端显示处理进度条
    - 显示当前处理步骤(检测语言/翻译/抽取)
    - _Requirements: 9.4_
  
  - [x] 13.2 实现超时和取消功能
    - 设置处理超时限制(30秒/60秒)
    - 实现取消按钮
    - 处理超时错误
    - _Requirements: 9.1, 9.2, 9.3, 9.5_
  
  - [ ]* 13.3 编写性能相关属性测试
    - **Property 15: 进度反馈机制**
    - **Validates: Requirements 9.4**
  
  - [ ]* 13.4 编写超时处理单元测试
    - 测试超时错误返回
    - 测试取消操作
    - _Requirements: 9.3, 9.5_

- [ ] 14. Checkpoint - 前端集成验证
  - 确保前端组件正确渲染
  - 测试完整的用户交互流程
  - 验证与后端API的通信
  - 如有问题请向用户询问

- [ ] 15. 编写集成测试
  - [ ]* 15.1 编写端到端集成测试
    - 测试完整的AI处理流程(英文→翻译→抽取)
    - 测试完整的规则处理流程
    - 测试模式切换流程
    - 测试错误场景的端到端处理
    - _Requirements: 1.1-9.5 (全部需求)_

- [x] 16. 文档和部署准备
  - [x] 16.1 创建用户文档
    - 编写功能使用指南
    - 说明AI模式和规则模式的区别
    - 提供提示词自定义示例
    - 文件位置: `docs/features/ai_description_processor_guide.md`
  
  - [x] 16.2 更新配置文件
    - 确保 `config/models.json` 包含所需模型配置
    - 添加环境变量说明(API密钥等)
    - 创建配置示例文件
  
  - [x] 16.3 创建部署脚本
    - 创建依赖安装脚本
    - 创建数据库迁移脚本(如需要)
    - 更新部署文档

- [ ] 17. Final Checkpoint - 完整功能验证
  - 运行所有测试(单元测试 + 属性测试 + 集成测试)
  - 验证测试覆盖率达到80%以上
  - 在本地环境完整测试功能
  - 验证与现有功能八的兼容性
  - 准备部署到测试环境
  - 如有问题请向用户询问

## Notes

- 任务标记 `*` 的为可选测试任务,可以跳过以加快MVP开发
- 每个任务都引用了具体的需求编号以确保可追溯性
- Checkpoint任务确保渐进式验证
- 属性测试验证通用正确性属性,单元测试验证具体示例和边缘情况
- 前端和后端开发可以部分并行进行
- 建议先完成后端核心功能(任务1-6),再进行前端开发(任务7-14)
