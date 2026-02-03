# ZhipuAI 文件解析 API 合规性检查

## 检查日期
2026-02-03

## 官方文档对比

### 1. API 端点

| 功能 | 官方文档 | 我们的实现 | 状态 |
|------|---------|-----------|------|
| 创建解析任务 | `POST https://open.bigmodel.cn/api/paas/v4/files/parser/create` | ✅ 相同 | ✅ 正确 |
| 获取解析结果 | `GET https://open.bigmodel.cn/api/paas/v4/files/parser/result/{taskId}/{format_type}` | ✅ 相同 | ✅ 正确 |

### 2. 请求参数

#### 创建解析任务

| 参数 | 官方文档 | 我们的实现 | 状态 |
|------|---------|-----------|------|
| file | ✅ 本地待解析文件 | ✅ multipart/form-data | ✅ 正确 |
| tool_type | ✅ `lite, expert, prime` | ✅ 相同 | ✅ 正确 |
| file_type | ✅ `PDF, DOCX, DOC, XLS, XLSX, PPT, PPTX, PNG, JPG, JPEG, CSV, TXT, MD, HTML, EPUB, BMP, GIF, WEBP, HEIC, EPS, ICNS, IM, PCX, PPM, TIFF, XBM, HEIF, JP2` | ✅ 支持主要格式 | ✅ 正确 |

#### 获取解析结果

| 参数 | 官方文档 | 我们的实现 | 状态 |
|------|---------|-----------|------|
| taskId | ✅ 文件解析任务 ID | ✅ 路径参数 | ✅ 正确 |
| format_type | ✅ `text, download_link` | ✅ 路径参数 | ✅ 正确 |

### 3. 响应格式

#### 创建解析任务响应

**官方文档**：
```json
{
    "message": "任务创建成功",
    "success": true,
    "task_id": "task_id"
}
```

**我们的处理**：
```python
result = response.json()
if not result.get('success'):
    raise ValueError(f"API调用失败: {result.get('message')}")
task_id = result.get('task_id')
```

✅ **状态：正确** - 我们正确处理了 `success` 字段和 `task_id` 字段

#### 获取解析结果响应

**官方文档**：
```json
{
    "status": "succeeded",
    "message": "结果获取成功",
    "content": "parsed result text",
    "task_id": "your task_id",
    "parsing_result_url": "download url"
}
```

**我们的处理**：
```python
status = result.get('status')
if status == 'succeeded':
    return {
        "status": "succeeded",
        "content": result.get('content', ''),
        "task_id": task_id
    }
```

✅ **状态：正确** - 我们正确处理了 `status` 和 `content` 字段

### 4. 文件大小限制

| 服务类型 | 官方文档限制 | 我们的实现 | 状态 |
|---------|------------|-----------|------|
| **Prime** | PDF/DOC/DOCX/PPT ≤100MB<br/>XLS/XLSX/CSV ≤10MB<br/>PNG/JPG/JPEG ≤20MB | ✅ 相同 | ✅ 正确 |
| **Expert** | ≤100MB | ✅ 相同 | ✅ 正确 |
| **Lite** | ≤50MB | ✅ 相同 | ✅ 正确 |

### 5. 支持的文件格式

#### 官方文档支持的格式

**Prime**：
- 文档：pdf, docx, doc, xls, xlsx, ppt, pptx, txt, md, html, epub
- 图片：png, jpg, jpeg, bmp, gif, webp, heic, eps, icns, im, pcx, ppm, tiff, xbm, heif, jp2
- 数据：csv

**Expert**：
- 仅支持：pdf

**Lite**：
- 文档：pdf, docx, doc, xls, xlsx, ppt, pptx, txt, md
- 图片：png, jpg, jpeg
- 数据：csv

#### 我们的实现

```python
SUPPORTED_FORMATS = {
    'PDF', 'DOCX', 'DOC', 'XLS', 'XLSX', 'PPT', 'PPTX',
    'PNG', 'JPG', 'JPEG', 'CSV', 'TXT', 'MD'
}
```

⚠️ **状态：需要扩展** - 我们只支持了 Lite 服务的格式，Prime 服务支持更多格式

### 6. Authorization Header

**官方文档**：
```bash
--header 'Authorization: Bearer your_api_token'
```

**我们的实现**：
```python
headers = {"Authorization": f"Bearer {self.api_key}"}
```

✅ **状态：正确**

## 发现的问题

### ⚠️ 问题 1：支持的文件格式不完整

**问题描述**：
- 我们的 `SUPPORTED_FORMATS` 只包含了 Lite 服务支持的格式
- Prime 服务支持更多格式（HTML, EPUB, BMP, GIF, WEBP, HEIC 等）
- 这可能导致用户上传 Prime 支持的文件时被拒绝

**影响**：
- 用户无法上传 Prime 服务支持的某些文件格式
- 例如：HTML, EPUB, BMP, GIF, WEBP 等

**建议修复**：
```python
SUPPORTED_FORMATS = {
    # 文档格式
    'PDF', 'DOCX', 'DOC', 'XLS', 'XLSX', 'PPT', 'PPTX', 'TXT', 'MD',
    # Prime 额外支持的文档格式
    'HTML', 'EPUB',
    # 图片格式
    'PNG', 'JPG', 'JPEG',
    # Prime 额外支持的图片格式
    'BMP', 'GIF', 'WEBP', 'HEIC', 'EPS', 'ICNS', 'IM', 'PCX', 'PPM', 
    'TIFF', 'XBM', 'HEIF', 'JP2',
    # 数据格式
    'CSV'
}
```

### ✅ 问题 2：响应格式处理（已修复）

**修复内容**：
- 添加了对 `success` 字段的检查
- 添加了对 `task_id` 缺失的处理
- 改进了错误消息提取

## 测试建议

### 1. 测试不同的文件格式

```bash
# 测试 PDF（Lite 支持）
python test_file_parser_debug.py --file test.pdf --tool_type lite

# 测试 HTML（仅 Prime 支持）
python test_file_parser_debug.py --file test.html --tool_type prime

# 测试 EPUB（仅 Prime 支持）
python test_file_parser_debug.py --file test.epub --tool_type prime
```

### 2. 测试文件大小限制

```bash
# 测试 PDF 100MB 限制
python test_file_parser_debug.py --file large.pdf --tool_type lite

# 测试 Excel 10MB 限制
python test_file_parser_debug.py --file large.xlsx --tool_type lite
```

### 3. 测试错误处理

```bash
# 测试无效的 API Key
export ZHIPUAI_API_KEY="invalid_key"
python test_file_parser_debug.py --file test.pdf

# 测试不支持的文件类型
python test_file_parser_debug.py --file test.xyz --tool_type lite
```

## 推荐的修复优先级

### 🔴 高优先级

1. **扩展支持的文件格式**
   - 添加 Prime 服务支持的所有格式
   - 更新前端验证逻辑
   - 更新文档

### 🟡 中优先级

2. **改进错误消息**
   - 根据不同的服务类型显示支持的格式
   - 提供更详细的文件大小限制信息

### 🟢 低优先级

3. **优化用户体验**
   - 根据文件格式自动推荐最佳服务类型
   - 显示预估的解析时间

## 合规性总结

| 检查项 | 状态 | 说明 |
|-------|------|------|
| API 端点 | ✅ 合规 | 完全符合官方文档 |
| 请求参数 | ✅ 合规 | 参数名称和类型正确 |
| 响应处理 | ✅ 合规 | 正确处理 success 和 task_id |
| Authorization | ✅ 合规 | Bearer Token 格式正确 |
| 文件大小限制 | ✅ 合规 | 限制值与官方文档一致 |
| 支持的格式 | ⚠️ 部分合规 | 仅支持 Lite 格式，需扩展 |

## 下一步行动

1. ✅ **已完成**：修复响应格式处理
2. 🔄 **进行中**：扩展支持的文件格式
3. ⏳ **待办**：更新前端验证逻辑
4. ⏳ **待办**：更新用户文档

## 相关文档

- [官方文档](https://docs.bigmodel.cn)
- [错误处理改进](ERROR_HANDLING_IMPROVEMENTS.md)
- [故障排查指南](TROUBLESHOOTING.md)
- [最新修复总结](LATEST_FIXES_SUMMARY.md)
