# Requirements Document: 文件解析API升级

## Introduction

本需求文档定义了功能一文件上传和对话功能的升级需求，从旧的文件管理API迁移到智谱AI最新的文件解析API。新的文件解析服务支持多种文件格式的智能解析，能够提取结构化文本内容，并提供三种不同级别的解析服务（Lite、Expert、Prime）以满足不同场景需求。

## Glossary

- **File_Parser_Service**: 智谱AI提供的文件解析服务，用于将各种格式的文件转换为结构化文本
- **Parser_Task**: 文件解析任务，包含任务ID、状态、解析结果等信息
- **Lite_Service**: 免费的基础解析服务，支持常见文件格式，返回纯文本
- **Expert_Service**: 专业PDF解析服务，支持复杂布局，返回Markdown和图片
- **Prime_Service**: 高级解析服务，支持最多文件格式和最复杂布局，返回完整结构化内容
- **Chat_Context**: 对话上下文，包含用户消息、文件内容和历史对话
- **Parsing_Status**: 解析任务状态，包括processing（处理中）、succeeded（成功）、failed（失败）

## Requirements

### Requirement 1: 文件解析任务创建

**User Story:** 作为用户，我想要上传文件并创建解析任务，以便系统能够提取文件中的文本内容

#### Acceptance Criteria

1. WHEN 用户上传文件 THEN THE System SHALL 调用文件解析API创建解析任务
2. WHEN 创建解析任务 THEN THE System SHALL 返回唯一的task_id
3. THE System SHALL 支持以下文件格式：PDF, DOCX, DOC, XLS, XLSX, PPT, PPTX, PNG, JPG, JPEG, CSV, TXT, MD
4. WHEN 文件大小超过限制 THEN THE System SHALL 返回明确的错误信息
5. WHEN 文件格式不支持 THEN THE System SHALL 返回明确的错误信息

### Requirement 2: 解析结果获取

**User Story:** 作为用户，我想要获取文件解析结果，以便将文件内容用于对话

#### Acceptance Criteria

1. WHEN 解析任务创建后 THEN THE System SHALL 轮询获取解析结果
2. WHEN 解析状态为processing THEN THE System SHALL 继续轮询直到完成或超时
3. WHEN 解析状态为succeeded THEN THE System SHALL 提取文本内容
4. WHEN 解析状态为failed THEN THE System SHALL 返回失败原因
5. WHEN 轮询超时（超过60秒） THEN THE System SHALL 停止轮询并提示用户

### Requirement 3: 解析进度显示

**User Story:** 作为用户，我想要看到文件解析的实时进度，以便了解处理状态

#### Acceptance Criteria

1. WHEN 文件上传开始 THEN THE System SHALL 显示"上传中"状态
2. WHEN 解析任务创建成功 THEN THE System SHALL 显示"解析中"状态和文件名
3. WHEN 解析完成 THEN THE System SHALL 显示"已附加文件"和文件名
4. WHEN 解析失败 THEN THE System SHALL 显示错误信息
5. WHILE 解析进行中 THEN THE System SHALL 显示动画加载指示器

### Requirement 4: 文件内容作为对话上下文

**User Story:** 作为用户，我想要解析后的文件内容自动作为对话上下文，以便AI能够理解文件内容并回答问题

#### Acceptance Criteria

1. WHEN 文件解析完成 THEN THE System SHALL 将文本内容存储在应用状态中
2. WHEN 用户发送消息 THEN THE System SHALL 将文件内容附加到用户消息中
3. WHEN 消息发送后 THEN THE System SHALL 清除活动文件状态
4. THE System SHALL 在用户消息中显示附加文件标记
5. THE System SHALL 在消息对象中记录附加文件的元数据（文件名、task_id）

### Requirement 5: 解析服务选择

**User Story:** 作为用户，我想要根据文件类型自动选择合适的解析服务，以便获得最佳的解析效果和成本

#### Acceptance Criteria

1. WHEN 文件格式为PDF THEN THE System SHALL 默认使用Lite服务
2. WHERE 用户需要高质量解析 THEN THE System SHALL 支持手动选择Expert或Prime服务
3. WHEN 文件格式为图片（PNG/JPG/JPEG） THEN THE System SHALL 使用Lite或Prime服务
4. WHEN 文件格式为Office文档（DOCX/XLS/PPT） THEN THE System SHALL 使用Lite或Prime服务
5. THE System SHALL 在UI中显示当前使用的解析服务类型

### Requirement 6: 错误处理和重试

**User Story:** 作为用户，我想要系统能够妥善处理解析错误，以便在出现问题时得到清晰的反馈

#### Acceptance Criteria

1. WHEN 文件上传失败 THEN THE System SHALL 显示上传错误信息并允许重试
2. WHEN 解析任务创建失败 THEN THE System SHALL 显示创建失败原因
3. WHEN 解析超时 THEN THE System SHALL 提示用户并提供重试选项
4. WHEN API调用失败 THEN THE System SHALL 记录错误日志并显示用户友好的错误信息
5. IF 网络错误 THEN THE System SHALL 提示检查网络连接

### Requirement 7: 文件解析结果管理

**User Story:** 作为用户，我想要查看和管理已解析的文件，以便复用解析结果

#### Acceptance Criteria

1. THE System SHALL 在本地存储中保存解析任务ID和结果
2. WHEN 用户查看文件列表 THEN THE System SHALL 显示已解析文件的状态
3. THE System SHALL 支持删除已解析的文件记录
4. THE System SHALL 显示文件解析时间和文件大小
5. WHERE 文件已解析 THEN THE System SHALL 支持直接复用解析结果

### Requirement 8: API端点迁移

**User Story:** 作为开发者，我想要将旧的文件API替换为新的解析API，以便使用最新的功能

#### Acceptance Criteria

1. THE System SHALL 创建新的`/files/parser/create`路由用于创建解析任务
2. THE System SHALL 创建新的`/files/parser/result/<task_id>`路由用于获取解析结果
3. THE System SHALL 保留旧的`/files/upload`路由以保持向后兼容
4. WHEN 调用新API THEN THE System SHALL 使用正确的请求格式和参数
5. THE System SHALL 正确处理API响应并提取所需数据

### Requirement 9: 前端交互优化

**User Story:** 作为用户，我想要流畅的文件上传和解析体验，以便高效地使用文件对话功能

#### Acceptance Criteria

1. WHEN 文件正在解析 THEN THE System SHALL 允许用户继续输入消息但禁止发送
2. WHEN 解析完成 THEN THE System SHALL 自动启用发送按钮
3. THE System SHALL 支持取消正在进行的解析任务
4. THE System SHALL 在文件状态区域显示清晰的视觉反馈
5. WHEN 用户移除文件 THEN THE System SHALL 清除所有相关状态和UI元素

### Requirement 10: 解析质量和性能

**User Story:** 作为用户，我想要快速准确的文件解析，以便及时获得对话所需的内容

#### Acceptance Criteria

1. WHEN 使用Lite服务 THEN THE System SHALL 在10秒内完成大多数文件解析
2. WHEN 使用Expert或Prime服务 THEN THE System SHALL 在30秒内完成大多数文件解析
3. THE System SHALL 正确提取文件中的文本内容，保持原有结构
4. WHEN 文件包含表格 THEN THE System SHALL 保留表格结构
5. WHEN 文件包含特殊字符 THEN THE System SHALL 正确处理编码
