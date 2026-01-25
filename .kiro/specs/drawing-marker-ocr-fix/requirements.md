# 需求文档：专利附图标记识别修复

## 简介

本需求文档定义了专利附图标记识别功能（功能八）的修复需求。当前系统存在严重的OCR识别失败问题，导致用户上传的专利附图无法正确识别数字序号，前端显示的是硬编码的模拟数据而非真实识别结果。本次修复将解决OCR识别逻辑错误、改进图像预处理、修复前端数据显示，并增强错误日志和调试能力。

## 术语表

- **OCR_Engine**: 光学字符识别引擎，使用Tesseract进行图像文字识别
- **Drawing_Marker**: 专利附图中的数字序号标记（如"1"、"2"、"3L"等）
- **Reference_Map**: 从说明书文本中提取的附图标记到部件名称的映射关系
- **Image_Preprocessor**: 图像预处理器，对上传图片进行灰度化、二值化等处理以提高OCR识别率
- **Annotation_Canvas**: 前端Canvas画布，用于在附图上标注识别到的数字序号位置
- **Match_Rate**: 匹配率，识别到的数字序号数量与说明书中定义的标记总数的比率

## 需求

### 需求 1：修复OCR识别逻辑错误

**用户故事：** 作为系统开发者，我需要修复后端OCR识别代码中的变量引用错误，以便OCR引擎能够正确返回识别结果。

#### 验收标准

1. WHEN Image_Preprocessor 完成多种预处理方法后，THE OCR_Engine SHALL 使用 `all_detected_numbers` 变量存储所有识别结果
2. WHEN 提取OCR识别结果时，THE System SHALL 从 `all_detected_numbers` 中读取数据而不是未定义的 `ocr_result` 变量
3. WHEN 存在重复识别结果时，THE System SHALL 根据置信度保留最佳结果并去除重复项
4. WHEN OCR识别过程中发生异常，THE System SHALL 记录详细错误日志并继续处理其他预处理方法
5. WHEN 所有预处理方法完成后，THE System SHALL 返回合并后的识别结果列表

### 需求 2：改进图像预处理和OCR配置

**用户故事：** 作为用户，我需要系统能够准确识别各种质量的专利附图中的数字序号，以便获得可靠的标记识别结果。

#### 验收标准

1. WHEN 处理上传图片时，THE Image_Preprocessor SHALL 应用至少4种不同的预处理方法（灰度、自适应阈值、Otsu二值化、简单阈值）
2. WHEN 配置Tesseract OCR时，THE OCR_Engine SHALL 使用优化的配置参数以提高数字和字母识别准确率
3. WHEN 识别结果置信度低于60时，THE System SHALL 过滤掉该结果
4. WHEN 检测到数字+字母组合（如"3L"）时，THE System SHALL 正确识别并保留完整标记
5. WHEN 图像分辨率过低或过高时，THE Image_Preprocessor SHALL 自动调整图像尺寸到最佳识别范围

### 需求 3：修复前端数据显示

**用户故事：** 作为用户，我需要在前端看到真实的OCR识别结果，而不是硬编码的模拟数据，以便了解实际的识别效果。

#### 验收标准

1. WHEN API返回处理结果时，THE Frontend SHALL 使用 `data.total_numbers` 显示识别到的数字序号数量
2. WHEN API返回处理结果时，THE Frontend SHALL 使用 `data.match_rate` 显示实际匹配率
3. WHEN API返回处理结果时，THE Frontend SHALL 使用 `data.message` 显示处理消息
4. WHEN 显示标注后的附图时，THE Annotation_Canvas SHALL 根据 `data.drawings[].detected_numbers` 中的坐标绘制标记点
5. WHEN 没有识别到任何数字时，THE Frontend SHALL 显示明确的提示信息而不是模拟数据

### 需求 4：实现Canvas标注功能

**用户故事：** 作为用户，我需要在附图上看到识别到的数字序号的精确位置标注，以便验证识别结果的准确性。

#### 验收标准

1. WHEN 处理完成后，THE Annotation_Canvas SHALL 在原始图片上绘制识别到的每个数字序号的位置
2. WHEN 绘制标记点时，THE Annotation_Canvas SHALL 使用红色圆圈标注数字位置
3. WHEN 绘制标记点时，THE Annotation_Canvas SHALL 在圆圈旁边显示数字序号和对应的部件名称
4. WHEN 用户悬停在标记点上时，THE Frontend SHALL 显示详细信息（数字、名称、置信度）
5. WHEN 图片尺寸与Canvas尺寸不同时，THE System SHALL 自动计算坐标缩放比例以正确定位标记

### 需求 5：增强错误处理和日志记录

**用户故事：** 作为系统管理员，我需要详细的错误日志和调试信息，以便快速诊断和解决OCR识别问题。

#### 验收标准

1. WHEN OCR识别开始时，THE System SHALL 记录处理的图片名称、尺寸和预处理方法
2. WHEN 每种预处理方法完成OCR时，THE System SHALL 记录识别到的数字数量和平均置信度
3. WHEN OCR识别失败时，THE System SHALL 记录完整的异常堆栈信息
4. WHEN 说明书解析完成时，THE System SHALL 记录提取到的Reference_Map内容
5. WHEN API返回结果时，THE System SHALL 在响应中包含调试信息（可选，通过参数控制）

### 需求 6：优化说明书文本解析

**用户故事：** 作为用户，我需要系统能够准确解析各种格式的说明书文本，以便建立完整的附图标记映射关系。

#### 验收标准

1. WHEN 解析说明书文本时，THE System SHALL 支持"数字+分隔符+名称"格式（如"1. 底座"、"1、底座"）
2. WHEN 解析说明书文本时，THE System SHALL 支持"数字+中文"格式（如"1电动工具"）
3. WHEN 解析说明书文本时，THE System SHALL 支持"数字+字母+中文"格式（如"2L左侧外壳"）
4. WHEN 解析说明书文本时，THE System SHALL 支持"数字+空格+中文"格式（如"1 电动工具"）
5. WHEN 存在多种格式混合时，THE System SHALL 正确提取所有附图标记并避免重复

### 需求 7：添加识别结果验证

**用户故事：** 作为用户，我需要系统提供识别结果的质量评估，以便判断是否需要调整图片质量或说明书内容。

#### 验收标准

1. WHEN 处理完成后，THE System SHALL 计算并返回总识别数量、匹配率和未匹配的标记列表
2. WHEN 匹配率低于50%时，THE System SHALL 在响应中包含改进建议
3. WHEN 识别到说明书中未定义的数字时，THE System SHALL 在结果中标记为"未知标记"
4. WHEN 说明书中的标记未被识别时，THE System SHALL 列出缺失的标记编号
5. WHEN 识别结果置信度普遍较低时，THE System SHALL 建议用户提供更清晰的图片
