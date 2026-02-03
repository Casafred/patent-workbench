# 文件解析功能故障排查指南

## 快速诊断

### 1. 运行诊断脚本

```bash
python test_file_parser_debug.py
```

这个脚本会：
- ✅ 验证API Key是否有效
- ✅ 测试与ZhipuAI API的连接
- ✅ 显示详细的错误信息
- ✅ 帮助定位问题根源

### 2. 检查浏览器控制台

打开浏览器开发者工具（F12），查看Console标签页：

```javascript
// 查找这些关键日志
[File Parser] Received create request
[File Parser] Processing file: xxx.pdf
[File Parser] Task created successfully: task_xxx
```

### 3. 检查后端日志

```bash
# 查看Flask应用日志
tail -f logs/app.log

# 或者查看控制台输出
# 查找 [File Parser] 开头的日志
```

## 常见错误及解决方案

### 错误 1: "ZhipuAI API key not configured"

**症状**：
```
文件解析失败: ZhipuAI API key not configured
```

**原因**：
- API Key未配置
- API Key格式错误
- Authorization header未正确传递

**解决方案**：

1. **检查前端配置**：
   ```javascript
   // 在浏览器控制台执行
   console.log(localStorage.getItem('zhipuai_api_key'));
   ```

2. **检查后端接收**：
   - 查看后端日志中的 `[File Parser] Service initialization` 消息
   - 确认API Key是否被正确接收

3. **手动设置环境变量**（临时方案）：
   ```bash
   export ZHIPUAI_API_KEY="your-api-key-here"
   ```

4. **验证API Key格式**：
   - API Key应该是一个长字符串
   - 不应包含空格或特殊字符
   - 格式类似：`xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxx`

### 错误 2: "Failed to create parsing task"

**症状**：
```
文件解析失败: Failed to create parsing task
```

**原因**：
- 网络连接问题
- ZhipuAI API服务异常
- 文件格式不支持
- 文件大小超限
- API Key权限不足

**解决方案**：

1. **运行诊断脚本**：
   ```bash
   python test_file_parser_debug.py
   ```
   这会显示详细的API错误信息

2. **检查网络连接**：
   ```bash
   # 测试能否访问ZhipuAI API
   curl -I https://open.bigmodel.cn/api/paas/v4/files/parser/create
   ```

3. **验证文件格式**：
   - 支持的格式：PDF, DOCX, DOC, XLS, XLSX, PPT, PPTX, PNG, JPG, JPEG, CSV, TXT, MD
   - 检查文件扩展名是否正确

4. **检查文件大小**：
   - PDF: 最大 100MB
   - 图片: 最大 20MB
   - Excel/CSV: 最大 10MB
   - 其他: 最大 50MB

5. **查看详细错误**：
   - 打开浏览器控制台
   - 查找 `Create parser task error:` 消息
   - 查看完整的错误堆栈

### 错误 3: "复用文件失败: can't access property 'includes', fileType is undefined"

**症状**：
```
复用文件失败: can't access property 'includes', fileType is undefined
```

**原因**：
- 从文件管理器复用文件时，`file.type` 属性为 undefined
- 代码尝试访问 undefined 的 `includes` 方法

**解决方案**：
✅ 已修复！代码现在会安全地处理 undefined 的 file.type：

```javascript
// 安全地获取文件类型
const fileType = file.type || '';

// 如果没有type，从文件名推断
if (!fileType && file.name) {
    const ext = file.name.split('.').pop().toLowerCase();
    // ... 根据扩展名判断类型
}
```

### 错误 4: "文件解析超时"

**症状**：
```
文件解析失败: 解析超时，请稍后重试
```

**原因**：
- 文件太大，解析时间超过60秒
- 网络不稳定
- ZhipuAI服务繁忙

**解决方案**：

1. **减小文件大小**：
   - 压缩PDF
   - 降低图片分辨率
   - 拆分大文件

2. **重试上传**：
   - 等待几分钟后重试
   - 选择网络较好的时段

3. **使用更快的服务**：
   - PDF文件：使用 Lite 服务（最快）
   - 如果需要更好的效果，再尝试 Expert 或 Prime

### 错误 5: "不支持的文件类型"

**症状**：
```
文件解析失败: 不支持的文件类型: xxx
```

**原因**：
- 文件格式不在支持列表中
- 文件扩展名错误

**解决方案**：

1. **检查支持的格式**：
   - 文档：PDF, DOC, DOCX, TXT, MD
   - 表格：XLS, XLSX, CSV
   - 演示：PPT, PPTX
   - 图片：PNG, JPG, JPEG

2. **转换文件格式**：
   - 将不支持的格式转换为PDF
   - 例如：Pages → PDF, Numbers → XLSX

3. **检查文件扩展名**：
   - 确保文件扩展名正确
   - 例如：`document.pdf` 而不是 `document.pdf.txt`

## 调试技巧

### 1. 启用详细日志

在浏览器控制台执行：
```javascript
localStorage.setItem('debug_file_parser', 'true');
```

然后刷新页面，会看到更详细的日志。

### 2. 检查API调用

在浏览器开发者工具的 Network 标签页：
1. 找到 `/files/parser/create` 请求
2. 查看 Request Headers（确认 Authorization）
3. 查看 Request Payload（确认文件和参数）
4. 查看 Response（确认返回的错误信息）

### 3. 测试API Key

在浏览器控制台执行：
```javascript
// 测试API Key是否有效
fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('zhipuai_api_key'),
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        model: 'GLM-4-Flash',
        messages: [{role: 'user', content: 'test'}]
    })
})
.then(r => r.json())
.then(d => console.log('API Key 有效:', d))
.catch(e => console.error('API Key 无效:', e));
```

### 4. 手动测试文件上传

使用 curl 命令测试：
```bash
curl -X POST https://open.bigmodel.cn/api/paas/v4/files/parser/create \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@test.pdf" \
  -F "tool_type=lite" \
  -F "file_type=PDF"
```

## 性能优化建议

### 1. 文件大小优化

- **PDF文件**：
  - 使用在线工具压缩：https://www.ilovepdf.com/compress_pdf
  - 或使用 Ghostscript：`gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH -sOutputFile=output.pdf input.pdf`

- **图片文件**：
  - 降低分辨率到 1920x1080 或更低
  - 使用 JPEG 格式（比 PNG 小）
  - 压缩质量设置为 80-90%

### 2. 选择合适的服务

| 文件类型 | 推荐服务 | 原因 |
|---------|---------|------|
| 简单PDF | Lite | 免费，速度快 |
| 复杂PDF | Expert | 保留格式，提取图片 |
| 图片 | Prime | OCR识别效果好 |
| Office文档 | Prime | 保留完整结构 |

### 3. 文件复用

- 相同文件不要重复上传
- 系统会自动复用已解析的文件
- 如果需要重新解析，先移除文件再重新上传

## 联系支持

如果以上方法都无法解决问题，请提供以下信息：

1. **错误截图**：
   - 浏览器控制台的错误信息
   - Network标签页的请求详情

2. **环境信息**：
   - 浏览器版本
   - 操作系统
   - 文件类型和大小

3. **复现步骤**：
   - 详细描述操作步骤
   - 提供测试文件（如果可能）

4. **诊断脚本输出**：
   ```bash
   python test_file_parser_debug.py > debug_output.txt 2>&1
   ```

## 更新日志

### 2026-02-03
- ✅ 修复 API Key 读取逻辑
- ✅ 简化文件上传流程
- ✅ 实现文件复用功能
- ✅ 改进错误消息显示
- ✅ 添加详细的后端日志
- ✅ 创建诊断脚本

### 待优化
- [ ] 添加文件上传进度条
- [ ] 支持批量文件上传
- [ ] 添加文件缓存机制
- [ ] 优化大文件处理
