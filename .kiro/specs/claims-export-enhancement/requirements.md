# Requirements Document

## Introduction

本文档定义了专利权利要求处理器导出功能增强的需求。该功能旨在修复现有的报告查看问题，并在Excel导出中添加新的"独立权利要求汇总"工作表，提供结构化的引用关系数据以支持未来的可视化功能。

## Glossary

- **System**: 专利权利要求处理器系统
- **Report_Viewer**: 报告查看模态框组件
- **Export_Service**: Excel导出服务模块
- **Claims_Parser**: 权利要求解析器模块
- **Independent_Claim**: 独立权利要求（不引用其他权利要求的权利要求）
- **Dependent_Claim**: 从属权利要求（引用其他权利要求的权利要求）
- **Reference_Relationship**: 从属权利要求对独立或其他从属权利要求的引用关系
- **Summary_Sheet**: 独立权利要求汇总工作表
- **Original_Row_Number**: 原始Excel文件中的数据行号

## Requirements

### Requirement 1: 修复报告查看功能

**User Story:** 作为用户，我希望点击"查看报告"按钮后能够正常显示报告内容，以便查看处理结果。

#### Acceptance Criteria

1. WHEN 用户点击"查看报告"按钮 THEN THE Report_Viewer SHALL 在模态框中显示完整的报告内容
2. WHEN 报告内容加载失败 THEN THE System SHALL 显示清晰的错误消息并保持界面稳定
3. WHEN 报告模态框打开 THEN THE Report_Viewer SHALL 正确渲染所有报告数据字段
4. WHEN 用户关闭报告模态框 THEN THE System SHALL 清理模态框状态并释放相关资源

### Requirement 2: 创建独立权利要求汇总工作表

**User Story:** 作为用户，我希望在导出的Excel文件中包含独立权利要求汇总工作表，以便快速查看所有独立权利要求及其引用关系。

#### Acceptance Criteria

1. WHEN 用户导出Excel文件 THEN THE Export_Service SHALL 创建名为"独立权利要求汇总"的工作表
2. WHEN 生成汇总工作表 THEN THE System SHALL 在第一行包含列标题："原数据行号"、"独立权利要求序号"、"独立权利要求文本"、"从属权利要求引用关系"
3. WHEN 处理每一行原始数据 THEN THE System SHALL 提取该行中所有独立权利要求并生成对应的汇总行
4. WHEN 原始数据行不包含独立权利要求 THEN THE System SHALL 跳过该行不在汇总表中生成记录
5. WHEN 汇总工作表创建完成 THEN THE System SHALL 将其作为Excel文件的第一个工作表

### Requirement 3: 提取和格式化独立权利要求数据

**User Story:** 作为用户，我希望汇总表中准确显示每个独立权利要求的序号和文本，以便快速识别和理解独立权利要求内容。

#### Acceptance Criteria

1. WHEN 识别独立权利要求 THEN THE Claims_Parser SHALL 正确提取权利要求序号
2. WHEN 提取独立权利要求文本 THEN THE System SHALL 保留完整的权利要求文本内容
3. WHEN 一行包含多个独立权利要求 THEN THE System SHALL 将所有独立权利要求序号用逗号分隔显示
4. WHEN 一行包含多个独立权利要求 THEN THE System SHALL 将所有独立权利要求文本用换行符分隔合并在同一单元格中
5. WHEN 权利要求文本包含特殊字符 THEN THE System SHALL 正确转义并保留这些字符

### Requirement 4: 生成结构化引用关系数据

**User Story:** 作为用户，我希望汇总表中包含清晰的引用关系数据，以便理解从属权利要求的依赖结构，并为未来的可视化功能提供数据基础。

#### Acceptance Criteria

1. WHEN 生成引用关系数据 THEN THE System SHALL 使用JSON格式表示引用关系
2. WHEN 从属权利要求引用独立权利要求 THEN THE System SHALL 在JSON中记录该引用关系，格式为 `{"从属序号": [被引用序号列表]}`
3. WHEN 从属权利要求引用多个权利要求 THEN THE System SHALL 在被引用序号列表中包含所有被引用的权利要求序号
4. WHEN 不存在从属权利要求 THEN THE System SHALL 在引用关系列中显示空JSON对象 `{}`
5. WHEN 生成的JSON数据 THEN THE System SHALL 确保JSON格式有效且可被标准JSON解析器解析

### Requirement 5: 保持原数据行号追溯性

**User Story:** 作为用户，我希望汇总表中显示原始Excel文件的行号，以便追溯数据来源并与原始文件对照。

#### Acceptance Criteria

1. WHEN 生成汇总行 THEN THE System SHALL 在"原数据行号"列中记录对应的原始Excel文件行号
2. WHEN 原始文件包含标题行 THEN THE System SHALL 从数据行开始计数（通常从第2行开始）
3. WHEN 多个汇总行来自同一原始行 THEN THE System SHALL 在所有相关汇总行中显示相同的原数据行号
4. WHEN 行号超过999 THEN THE System SHALL 正确显示完整的行号数值

### Requirement 6: 维护Excel导出的完整性

**User Story:** 作为用户，我希望新增的汇总工作表不影响现有的导出功能，以便继续使用所有现有的报告数据。

#### Acceptance Criteria

1. WHEN 添加汇总工作表 THEN THE System SHALL 保留现有的"权利要求详情"、"处理统计"和"错误报告"工作表
2. WHEN 导出过程中发生错误 THEN THE System SHALL 记录详细的错误信息并返回适当的错误响应
3. WHEN 生成Excel文件 THEN THE System SHALL 确保所有工作表的格式和样式保持一致
4. WHEN Excel文件生成完成 THEN THE System SHALL 正确设置文件的MIME类型和下载响应头

### Requirement 7: 处理边缘情况和错误条件

**User Story:** 作为用户，我希望系统能够优雅地处理各种异常情况，以便在遇到问题时获得清晰的反馈。

#### Acceptance Criteria

1. WHEN 原始数据为空 THEN THE System SHALL 创建包含标题行但无数据行的汇总工作表
2. WHEN 权利要求解析失败 THEN THE System SHALL 记录错误并继续处理其他行
3. WHEN 引用关系数据格式错误 THEN THE System SHALL 使用空JSON对象作为默认值
4. WHEN Excel文件写入失败 THEN THE System SHALL 返回包含错误详情的HTTP 500响应
5. WHEN 内存不足以处理大文件 THEN THE System SHALL 使用流式处理或分块处理策略
