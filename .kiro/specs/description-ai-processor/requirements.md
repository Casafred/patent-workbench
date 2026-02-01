# Requirements Document

## Introduction

本文档定义了"说明书AI处理器"功能的需求。该功能为功能八(专利附图标注功能)增加AI处理能力,允许用户选择使用AI模型而非传统规则分词来处理专利说明书文本,实现更智能的附图标记抽取。

## Glossary

- **System**: 说明书AI处理器系统
- **Description_Text**: 专利说明书文本内容
- **AI_Processing_Mode**: 使用AI模型处理说明书的模式
- **Rule_Based_Mode**: 使用jieba分词规则处理说明书的模式
- **Drawing_Marker**: 专利附图中的数字标记(如"10"、"20"、"图1"等)
- **Component_Name**: 附图标记对应的部件名称
- **AI_Model**: 用于处理说明书的AI模型(如GLM-4-Flash)
- **Prompt_Template**: 用于指导AI处理的提示词模板
- **Language_Detector**: 语言检测模块
- **Translator**: 文本翻译模块
- **Component_Extractor**: 部件标记抽取模块

## Requirements

### Requirement 1: 处理模式切换

**User Story:** 作为用户,我希望能够切换说明书处理模式,以便选择使用AI或规则分词来处理文本。

#### Acceptance Criteria

1. THE System SHALL 提供一个"说明书的AI处理"开关按钮
2. WHEN 用户点击开关按钮, THE System SHALL 切换处理模式(AI处理模式 ↔ 规则分词模式)
3. THE System SHALL 在界面上清晰显示当前处理模式状态
4. WHEN 处理模式为关闭状态, THE System SHALL 使用jieba分词规则处理说明书
5. WHEN 处理模式为开启状态, THE System SHALL 使用AI模型处理说明书

### Requirement 2: AI模型选择

**User Story:** 作为用户,我希望能够选择不同的AI模型,以便根据需求使用最合适的模型。

#### Acceptance Criteria

1. WHEN AI处理模式开启, THE System SHALL 显示模型选择器
2. THE System SHALL 从config/models.json加载可用的AI模型列表
3. THE System SHALL 在模型选择器中显示所有可用模型
4. WHEN 用户选择一个模型, THE System SHALL 保存用户的模型选择
5. THE System SHALL 使用用户选择的模型进行说明书处理

### Requirement 3: 提示词管理

**User Story:** 作为用户,我希望能够查看和编辑提示词,以便自定义AI处理行为。

#### Acceptance Criteria

1. WHEN AI处理模式开启, THE System SHALL 显示提示词编辑器
2. THE System SHALL 提供预置的默认提示词模板
3. THE System SHALL 允许用户在编辑器中修改提示词内容
4. WHEN 用户修改提示词, THE System SHALL 保存用户的自定义提示词
5. THE System SHALL 使用用户自定义的提示词(如果存在)或默认提示词进行处理

### Requirement 4: 语言检测与翻译

**User Story:** 作为用户,我希望系统能够自动检测说明书语言并翻译为中文,以便AI能够准确处理多语言专利。

#### Acceptance Criteria

1. WHEN 接收到说明书文本, THE System SHALL 检测文本的语言类型
2. THE System SHALL 支持识别中文、英文、日文等常见语言
3. WHEN 检测到非中文文本, THE System SHALL 将文本翻译为中文
4. WHEN 检测到中文文本, THE System SHALL 跳过翻译步骤直接处理
5. THE System SHALL 在返回结果中包含检测到的语言类型

### Requirement 5: 智能标记抽取

**User Story:** 作为用户,我希望AI能够智能抽取附图标记和部件名称,以便快速完成附图标注。

#### Acceptance Criteria

1. WHEN 使用AI处理模式, THE System SHALL 从说明书文本中抽取所有附图标记
2. THE System SHALL 识别数字标记(如"10"、"20"、"100")
3. THE System SHALL 识别图号标记(如"图1"、"图2"、"Fig. 1")
4. THE System SHALL 为每个标记抽取对应的部件名称
5. THE System SHALL 返回标记与部件名称的结构化对应关系

### Requirement 6: 结果格式化

**User Story:** 作为开发者,我希望系统返回结构化的JSON格式结果,以便前端能够正确解析和显示。

#### Acceptance Criteria

1. THE System SHALL 以JSON格式返回处理结果
2. THE System SHALL 在结果中包含language字段(检测到的语言)
3. WHEN 进行了翻译, THE System SHALL 在结果中包含translated_text字段
4. THE System SHALL 在结果中包含components数组
5. FOR ALL components数组中的元素, THE System SHALL 包含marker和name字段

### Requirement 7: 错误处理

**User Story:** 作为用户,我希望系统能够妥善处理错误情况,以便了解问题并采取相应措施。

#### Acceptance Criteria

1. WHEN AI模型调用失败, THE System SHALL 返回描述性错误信息
2. WHEN 语言检测失败, THE System SHALL 返回错误信息并建议用户手动指定语言
3. WHEN 翻译服务不可用, THE System SHALL 返回错误信息并建议用户使用中文说明书
4. WHEN 未能抽取到任何标记, THE System SHALL 返回空的components数组和提示信息
5. IF 发生错误, THEN THE System SHALL 记录错误日志以便调试

### Requirement 8: 与现有功能集成

**User Story:** 作为系统架构师,我希望新功能能够无缝集成到现有功能八中,以便用户能够平滑过渡。

#### Acceptance Criteria

1. THE System SHALL 保持与现有component_extractor.py的接口兼容性
2. WHEN AI处理模式关闭, THE System SHALL 使用现有的jieba分词逻辑
3. THE System SHALL 复用功能六的AI模型配置和调用机制
4. THE System SHALL 在前端界面中与现有功能八UI协调一致
5. THE System SHALL 支持处理结果的相同数据格式以便后续标注流程使用

### Requirement 9: 性能要求

**User Story:** 作为用户,我希望AI处理能够在合理时间内完成,以便高效完成工作。

#### Acceptance Criteria

1. WHEN 处理普通长度说明书(5000字以内), THE System SHALL 在30秒内返回结果
2. WHEN 处理长篇说明书(5000-20000字), THE System SHALL 在60秒内返回结果
3. WHEN 处理超时, THE System SHALL 返回超时错误并建议用户使用规则分词模式
4. THE System SHALL 在处理过程中提供进度反馈
5. THE System SHALL 支持处理过程的取消操作
