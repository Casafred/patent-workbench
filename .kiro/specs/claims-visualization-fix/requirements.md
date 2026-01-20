# Requirements Document

## Introduction

本需求文档针对功能七（权利要求处理和可视化）中发现的四个关键问题，确保公开号正确显示、独权合并内容完整展示、所有专利数据正确显示，以及修复可视化渲染中的堆栈溢出错误。

## Glossary

- **System**: 专利权利要求处理和可视化系统
- **Patent_Number**: 专利公开号，用于唯一标识专利
- **Independent_Claim**: 独立权利要求，不依赖其他权利要求的权利要求
- **Merged_Content**: 合并的独立权利要求内容，将同一专利的所有独立权利要求合并为一个文本
- **Visualization_Renderer**: 可视化渲染器，负责生成权利要求关系图
- **Claims_Data**: 权利要求数据，包含所有解析后的权利要求信息
- **Recursion_Error**: 递归错误，当函数无限递归调用自身时发生的堆栈溢出错误

## Requirements

### Requirement 1: 公开号显示修复

**User Story:** 作为用户，我希望在公开号与独权合并视窗中看到每个专利的公开号，以便识别不同的专利。

#### Acceptance Criteria

1. WHEN THE System 处理权利要求数据 THEN THE System SHALL 从Excel数据中提取专利号列的值
2. WHEN THE System 构建权利要求对象 THEN THE System SHALL 将专利号（patent_number）附加到每个权利要求对象
3. WHEN THE System 显示公开号与独权合并视窗 THEN THE System SHALL 在表格的公开号列中显示每个专利的patent_number值
4. WHEN 专利号列未被识别或选择 THEN THE System SHALL 使用行索引作为备用标识符
5. WHEN THE System 按专利号分组权利要求 THEN THE System SHALL 确保每个分组都有有效的专利号键

### Requirement 2: 独权合并内容完整显示

**User Story:** 作为用户，我希望看到每个专利的完整独立权利要求合并内容，以便全面了解专利的核心保护范围。

#### Acceptance Criteria

1. WHEN THE System 合并独立权利要求 THEN THE System SHALL 提取同一专利的所有独立权利要求
2. WHEN THE System 合并权利要求文本 THEN THE System SHALL 使用空格连接所有独立权利要求的完整文本
3. WHEN THE System 显示合并内容 THEN THE System SHALL 在表格单元格中显示完整的合并文本，不截断
4. WHEN 合并内容超过显示区域 THEN THE System SHALL 提供滚动或展开功能以查看完整内容
5. WHEN 专利没有独立权利要求 THEN THE System SHALL 显示适当的提示信息

### Requirement 3: 所有专利数据显示

**User Story:** 作为用户，我希望看到所有专利的数据，而不是只看到一条记录，以便分析所有专利的权利要求。

#### Acceptance Criteria

1. WHEN THE System 按专利号分组权利要求 THEN THE System SHALL 为每个唯一的专利号创建一个分组
2. WHEN THE System 填充公开号与独权合并表格 THEN THE System SHALL 为每个专利分组创建一行
3. WHEN THE System 处理多个专利 THEN THE System SHALL 确保所有专利都被包含在结果中
4. WHEN THE System 检测到重复的专利号 THEN THE System SHALL 合并相同专利号的权利要求数据
5. WHEN THE System 显示表格 THEN THE System SHALL 按专利号排序显示所有专利记录

### Requirement 4: 堆栈溢出错误修复

**User Story:** 作为用户，我希望点击"查看该条引用"按钮后能正常显示可视化图表，而不是遇到"too much recursion"错误。

#### Acceptance Criteria

1. WHEN THE Visualization_Renderer 构建层次结构 THEN THE System SHALL 检测并防止循环引用
2. WHEN THE Visualization_Renderer 递归构建子节点 THEN THE System SHALL 维护已访问节点的集合以避免重复访问
3. WHEN THE Visualization_Renderer 检测到循环依赖 THEN THE System SHALL 终止递归并记录警告
4. WHEN THE Visualization_Renderer 构建树状图 THEN THE System SHALL 限制递归深度不超过合理阈值（如50层）
5. WHEN THE Visualization_Renderer 处理权利要求引用 THEN THE System SHALL 验证引用的权利要求存在且未形成循环

### Requirement 5: 专利号查找优化

**User Story:** 作为用户，我希望按专利号查找权利要求时能准确找到所有相关数据，无论是否提供了行号。

#### Acceptance Criteria

1. WHEN 用户选择专利号进行可视化 THEN THE System SHALL 优先按专利号精确匹配查找权利要求
2. WHEN 精确匹配失败 THEN THE System SHALL 尝试模糊匹配包含该专利号的权利要求
3. WHEN 按专利号查找成功 THEN THE System SHALL 返回该专利的所有权利要求，忽略行号参数
4. WHEN 按专利号查找失败且提供了行号 THEN THE System SHALL 尝试按行号查找作为备用方案
5. WHEN 所有查找方法都失败 THEN THE System SHALL 显示清晰的错误消息说明未找到数据

### Requirement 6: 数据结构一致性

**User Story:** 作为开发者，我希望前后端数据结构保持一致，以便正确传递和显示专利号信息。

#### Acceptance Criteria

1. WHEN THE System 在后端处理权利要求 THEN THE System SHALL 确保每个ClaimInfo对象包含patent_number属性
2. WHEN THE System 导出权利要求数据到JSON THEN THE System SHALL 包含patent_number字段
3. WHEN THE System 通过API返回权利要求数据 THEN THE System SHALL 在响应中包含patent_number字段
4. WHEN THE System 在前端接收权利要求数据 THEN THE System SHALL 验证patent_number字段存在
5. WHEN THE System 构建可视化数据 THEN THE System SHALL 保留patent_number信息在节点数据中
