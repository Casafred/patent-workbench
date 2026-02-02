# 文件解析API升级 - 验证指南

## 概述

本指南提供了完整的验证步骤，用于测试文件解析API升级的所有功能。按照以下步骤进行验证，确保所有核心功能正常工作。

## 前置条件

### 1. 环境配置检查

确保以下环境变量已配置：

```bash
# 检查智谱AI API密钥
echo $ZHIPUAI_API_KEY
```

如果未配置，请在 `.env` 文件中添加：

```
ZHIPUAI_API_KEY=your_api_key_here
```

### 2. 启动应用

```bash
# 启动后端服务
python app.py

# 或使用 gunicorn
gunicorn -c gunicorn_config.py wsgi:app
```

确保服务运行在 `http://localhost:5001`（或您配置的端口）

### 3. 准备测试文件

准备以下类型的测试文件：

- **PDF文件**: `test_document.pdf` (建议 < 10MB)
- **Word文档**: `test_document.docx` (建议 < 5MB)
- **Excel文件**: `test_spreadsheet.xlsx` (建议 < 5MB)
- **图片文件**: `test_image.png` 或 `test_image.jpg` (建议 < 5MB)
- **文本文件**: `test_text.txt` (建议 < 1MB)

## 验证步骤

### 阶段 1: 后端API验证

#### 1.1 使用测试脚本验证

1. **更新测试脚本配置**

编辑 `test_file_parser_api.py`：

```python
# 更新这些配置
USERNAME = "your_username"  # 您的用户名
PASSWORD = "your_password"  # 您的密码
TEST_FILE_PATH = "test_document.pdf"  # 测试文件路径
```

2. **运行测试脚本**

```bash
python test_file_parser_api.py
```

3. **预期结果**

```
============================================================
File Parser API Test Suite
============================================================

Logging in as your_username...
✓ Login successful

Testing POST /api/files/parser/create...
File: test_document.pdf
Tool type: lite
Status: 200
✓ Parser task created successfully
Task ID: parser_task_xxxxx
Status: processing
Filename: test_document.pdf

Testing GET /api/files/parser/result/parser_task_xxxxx...
Poll: True, Timeout: 60s
Status: 200
Elapsed time: 8.45s
✓ Got parser result
Status: succeeded
Content length: 1234 characters
Content preview: This is the parsed content...

Testing file validation...

1. Testing missing file...
Status: 400
✓ Correctly rejected missing file

2. Testing invalid tool_type...
Status: 400
✓ Correctly rejected invalid tool_type

============================================================
Test suite completed
============================================================
```

#### 1.2 使用 Postman/curl 验证

**测试 1: 创建解析任务**

```bash
# 登录获取 cookie
curl -c cookies.txt -X POST http://localhost:5001/login \
  -d "username=your_username&password=your_password"

# 创建解析任务
curl -b cookies.txt -X POST http://localhost:5001/api/files/parser/create \
  -F "file=@test_document.pdf" \
  -F "tool_type=lite"
```

预期响应：
```json
{
  "data": {
    "task_id": "parser_task_xxxxx",
    "status": "processing",
    "filename": "test_document.pdf"
  }
}
```

**测试 2: 获取解析结果**

```bash
# 使用返回的 task_id
curl -b cookies.txt "http://localhost:5001/api/files/parser/result/parser_task_xxxxx?format_type=text&poll=true"
```

预期响应（成功）：
```json
{
  "data": {
    "status": "succeeded",
    "content": "解析后的文本内容...",
    "task_id": "parser_task_xxxxx"
  }
}
```

预期响应（失败）：
```json
{
  "data": {
    "status": "failed",
    "error": "错误原因",
    "task_id": "parser_task_xxxxx"
  }
}
```

#### 1.3 验证错误处理

**测试 1: 缺少文件**

```bash
curl -b cookies.txt -X POST http://localhost:5001/api/files/parser/create \
  -F "tool_type=lite"
```

预期：400 错误，提示 "Missing file in request"

**测试 2: 无效的 tool_type**

```bash
curl -b cookies.txt -X POST http://localhost:5001/api/files/parser/create \
  -F "file=@test_document.pdf" \
  -F "tool_type=invalid"
```

预期：400 错误，提示 "Invalid tool_type"

**测试 3: 不支持的文件格式**

```bash
# 创建一个 .exe 文件
echo "test" > test.exe

curl -b cookies.txt -X POST http://localhost:5001/api/files/parser/create \
  -F "file=@test.exe" \
  -F "tool_type=lite"
```

预期：400 错误，提示 "Unsupported file type"

**测试 4: 文件大小超限**

```bash
# 创建一个超大文件（例如 150MB 的 PDF）
dd if=/dev/zero of=large_file.pdf bs=1M count=150

curl -b cookies.txt -X POST http://localhost:5001/api/files/parser/create \
  -F "file=@large_file.pdf" \
  -F "tool_type=lite"
```

预期：400 错误，提示文件大小超过限制

### 阶段 2: 前端功能验证

#### 2.1 访问对话页面

1. 打开浏览器，访问 `http://localhost:5001`
2. 登录系统
3. 进入功能一（对话功能）

#### 2.2 文件上传流程验证

**测试 1: 基本文件上传**

1. 点击文件上传按钮（📎图标）
2. 选择一个 PDF 文件
3. 观察：
   - ✅ 显示"已选择文件"提示
   - ✅ 显示文件名
   - ✅ 显示服务选择器
   - ✅ 默认选择 "Lite" 服务
   - ✅ 显示"开始上传"按钮

4. 点击"开始上传"按钮
5. 观察：
   - ✅ 显示"正在上传文件"提示
   - ✅ 显示加载动画
   - ✅ 显示"正在解析文件... X%"进度
   - ✅ 解析完成后显示"已附加文件"
   - ✅ 显示文件名和移除按钮

**测试 2: 服务选择功能**

1. 上传一个 PDF 文件
2. 观察服务选择器：
   - ✅ 默认选择 "Lite（免费）"
   - ✅ 显示服务描述

3. 切换到 "Expert" 服务
4. 观察：
   - ✅ 服务描述更新为 "专业PDF解析，支持复杂布局，返回Markdown+图片"
   - ✅ 显示价格 "0.03元/次"

5. 切换到 "Prime" 服务
6. 观察：
   - ✅ 服务描述更新为 "高级解析服务，支持最多格式和最复杂布局"
   - ✅ 显示价格 "0.05元/次"

7. 点击服务信息按钮（ℹ️图标）
8. 观察：
   - ✅ 显示详细的服务对比信息
   - ✅ 显示支持的格式列表
   - ✅ 显示价格对比

**测试 3: 智能服务推荐**

1. 上传 PDF 文件
   - ✅ 自动推荐 "Lite" 服务

2. 上传图片文件（PNG/JPG）
   - ✅ 自动推荐 "Prime" 服务

3. 上传 Word 文档（DOCX）
   - ✅ 自动推荐 "Prime" 服务

4. 上传 Excel 文件（XLSX）
   - ✅ 自动推荐 "Prime" 服务

**测试 4: 取消上传**

1. 选择文件后，点击"×"按钮
2. 观察：
   - ✅ 文件状态区域清空
   - ✅ 服务选择器隐藏
   - ✅ 可以重新选择文件

#### 2.3 对话集成验证

**测试 1: 文件内容附加到消息**

1. 上传并解析一个文件（例如包含"测试内容"的文本文件）
2. 在输入框中输入："请总结这个文件的内容"
3. 点击发送
4. 观察：
   - ✅ 用户消息显示文件附件标记
   - ✅ 显示文件名
   - ✅ 显示服务类型（Lite/Expert/Prime）
   - ✅ AI回复包含文件内容的总结

**测试 2: 文件状态清除**

1. 上传并解析一个文件
2. 发送消息
3. 观察：
   - ✅ 消息发送后，文件状态区域清空
   - ✅ activeFile 状态被清除
   - ✅ 可以上传新文件

**测试 3: 多次上传**

1. 上传文件 A，发送消息
2. 上传文件 B，发送消息
3. 上传文件 C，发送消息
4. 观察：
   - ✅ 每次上传都正常工作
   - ✅ 每条消息都正确显示对应的文件附件
   - ✅ 没有状态混乱或错误

#### 2.4 错误处理验证

**测试 1: 不支持的文件格式**

1. 尝试上传 .exe 或 .zip 文件
2. 观察：
   - ✅ 显示错误提示："不支持的文件类型"
   - ✅ 显示移除按钮
   - ✅ 可以关闭错误提示

**测试 2: 文件大小超限**

1. 尝试上传超大文件（例如 150MB 的 PDF）
2. 观察：
   - ✅ 显示错误提示："文件大小超过限制: 100MB"
   - ✅ 显示移除按钮
   - ✅ 可以关闭错误提示

**测试 3: 网络错误**

1. 断开网络连接
2. 尝试上传文件
3. 观察：
   - ✅ 显示网络错误提示
   - ✅ 可以关闭错误提示
   - ✅ 恢复网络后可以重试

**测试 4: 解析超时**

1. 上传一个非常大的文件（接近大小限制）
2. 如果解析超过 60 秒
3. 观察：
   - ✅ 显示超时错误："解析超时，请稍后重试"
   - ✅ 可以关闭错误提示
   - ✅ 可以重新上传

### 阶段 3: 不同文件格式验证

#### 3.1 PDF 文件

1. 上传一个包含文本的 PDF 文件
2. 使用 Lite 服务
3. 验证：
   - ✅ 解析成功
   - ✅ 提取的文本内容正确
   - ✅ 保留了基本的文本结构

#### 3.2 Word 文档

1. 上传一个 DOCX 文件
2. 使用 Lite 或 Prime 服务
3. 验证：
   - ✅ 解析成功
   - ✅ 提取的文本内容正确
   - ✅ 保留了段落结构

#### 3.3 Excel 文件

1. 上传一个包含表格数据的 XLSX 文件
2. 使用 Lite 或 Prime 服务
3. 验证：
   - ✅ 解析成功
   - ✅ 提取的表格数据正确
   - ✅ 保留了表格结构

#### 3.4 图片文件

1. 上传一个包含文字的图片（PNG/JPG）
2. 使用 Lite 或 Prime 服务
3. 验证：
   - ✅ 解析成功
   - ✅ OCR 识别的文字正确
   - ✅ 文字顺序合理

#### 3.5 文本文件

1. 上传一个 TXT 或 MD 文件
2. 使用 Lite 服务
3. 验证：
   - ✅ 解析成功
   - ✅ 文本内容完全一致
   - ✅ 保留了换行和格式

### 阶段 4: 浏览器兼容性验证

在以下浏览器中重复阶段 2 和阶段 3 的测试：

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (如果可用)

确保所有功能在不同浏览器中都正常工作。

## 验证清单

### 后端 API

- [ ] `/files/parser/create` 端点可访问
- [ ] 文件上传成功返回 task_id
- [ ] `/files/parser/result/<task_id>` 端点可访问
- [ ] 轮询机制正常工作
- [ ] 解析结果正确返回
- [ ] 错误处理正确（缺少文件、无效参数、不支持格式、大小超限）
- [ ] 旧的 `/files/upload` 路由仍然可用（向后兼容）

### 前端功能

- [ ] 文件选择器正常工作
- [ ] 服务选择器显示正确
- [ ] 智能推荐符合预期（PDF→Lite, 图片→Prime, Office→Prime）
- [ ] 服务信息弹窗显示正确
- [ ] 上传进度显示正常
- [ ] 解析进度显示正常（百分比更新）
- [ ] 完成状态显示正确
- [ ] 取消功能正常工作

### 对话集成

- [ ] 文件上传到对话成功
- [ ] 文件内容正确附加到消息
- [ ] 文件附件标记显示正确
- [ ] 服务类型显示正确（Lite/Expert/Prime）
- [ ] 消息发送成功
- [ ] AI 回复包含文件内容
- [ ] 发送后状态正确清除
- [ ] 多次上传正常工作

### 文件格式

- [ ] PDF 文件解析正确
- [ ] Word 文档解析正确
- [ ] Excel 文件解析正确
- [ ] PowerPoint 文件解析正确
- [ ] 图片文件解析正确（PNG, JPG）
- [ ] 文本文件解析正确（TXT, MD, CSV）

### 服务类型

- [ ] Lite 服务解析正常
- [ ] Expert 服务解析正常（如有余额）
- [ ] Prime 服务解析正常（如有余额）
- [ ] 服务选择正确传递到后端
- [ ] 服务类型正确显示在消息中

### 错误处理

- [ ] 不支持的文件格式错误提示正确
- [ ] 文件大小超限错误提示正确
- [ ] 网络错误提示正确
- [ ] 解析超时错误提示正确
- [ ] 所有错误都可以关闭和恢复

### 浏览器兼容性

- [ ] Chrome/Edge 正常工作
- [ ] Firefox 正常工作
- [ ] Safari 正常工作（如可用）

## 常见问题排查

### 问题 1: API 返回 500 错误

**可能原因**：
- ZHIPUAI_API_KEY 未配置或无效

**解决方法**：
```bash
# 检查环境变量
echo $ZHIPUAI_API_KEY

# 如果未设置，在 .env 文件中添加
echo "ZHIPUAI_API_KEY=your_api_key_here" >> .env

# 重启应用
```

### 问题 2: 文件上传后一直显示"解析中"

**可能原因**：
- 智谱 API 响应慢
- 网络连接问题
- 文件太大

**解决方法**：
1. 检查网络连接
2. 尝试上传较小的文件
3. 检查浏览器控制台的错误信息
4. 检查后端日志

### 问题 3: 前端显示"不支持的文件类型"但文件格式正确

**可能原因**：
- 文件 MIME 类型不匹配
- 浏览器识别的 MIME 类型与预期不同

**解决方法**：
1. 检查浏览器控制台，查看实际的 file.type
2. 在 `fileParserHandler.js` 中添加对应的 MIME 类型
3. 或者在后端使用文件扩展名而不是 MIME 类型

### 问题 4: 解析结果内容为空

**可能原因**：
- 文件内容确实为空
- 文件格式损坏
- 智谱 API 解析失败

**解决方法**：
1. 检查原始文件是否有内容
2. 尝试使用不同的文件
3. 检查后端日志中的 API 响应
4. 尝试使用不同的服务类型（Expert 或 Prime）

### 问题 5: 文件附件标记不显示

**可能原因**：
- CSS 样式问题
- JavaScript 错误
- 消息对象结构不正确

**解决方法**：
1. 检查浏览器控制台的错误
2. 检查 `chat.css` 中的样式定义
3. 检查 `addMessageToDOM` 函数中的文件附件显示逻辑

## 性能基准

### 预期解析时间

- **小文件** (< 1MB): 2-5 秒
- **中等文件** (1-10MB): 5-15 秒
- **大文件** (10-50MB): 15-30 秒
- **超大文件** (50-100MB): 30-60 秒

### 预期成功率

- **Lite 服务**: > 95%
- **Expert 服务**: > 90%
- **Prime 服务**: > 90%

如果实际性能低于这些基准，请检查：
1. 网络连接速度
2. 智谱 API 服务状态
3. 服务器资源使用情况

## 下一步

完成所有验证后：

1. **如果所有测试通过**：
   - 标记 Task 3 为完成
   - 继续 Task 7（解析结果管理）或 Task 9（错误处理优化）
   - 或者进行生产部署

2. **如果发现问题**：
   - 记录问题详情
   - 根据问题类型修复代码
   - 重新运行相关测试
   - 确保所有测试通过后再继续

3. **可选的增强功能**：
   - Task 7: 解析结果管理（本地存储、历史记录、复用）
   - Task 9: 错误处理和重试机制（取消功能、重试按钮）
   - Task 10: 优化和性能改进（指数退避、缓存、Web Worker）
   - Task 11: 集成测试和端到端测试
   - Task 12: 文档和部署准备

## 总结

本验证指南涵盖了文件解析API升级的所有核心功能。按照步骤完成验证后，您将确认：

✅ 后端 API 正常工作
✅ 前端功能完整
✅ 对话集成正确
✅ 所有文件格式支持
✅ 错误处理完善
✅ 浏览器兼容性良好

祝验证顺利！🎉
