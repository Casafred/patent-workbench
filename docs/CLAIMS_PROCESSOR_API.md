# 专利权利要求处理器 API 文档

## 概述

专利权利要求处理器已成功集成到Flask应用中，提供了完整的Web API接口用于上传、处理和导出专利权利要求数据。

## API 端点

### 1. 上传Excel文件

**端点:** `POST /api/claims/upload`

**描述:** 上传包含权利要求的Excel文件

**请求:**
- Content-Type: `multipart/form-data`
- Body: 
  - `file`: Excel文件 (.xlsx 或 .xls)

**响应:**
```json
{
  "success": true,
  "data": {
    "file_id": "20250114_123456_example.xlsx",
    "file_path": "/path/to/uploads/20250114_123456_example.xlsx",
    "original_filename": "example.xlsx",
    "sheet_names": ["Sheet1", "Sheet2"],
    "columns": ["Column1", "Column2", "Column3"],
    "message": "文件上传成功"
  }
}
```

**需求映射:** 需求 1.1 - 验证文件格式并成功读取文件内容

---

### 2. 处理权利要求

**端点:** `POST /api/claims/process`

**描述:** 启动权利要求处理任务

**请求:**
```json
{
  "file_id": "20250114_123456_example.xlsx",
  "column_name": "权利要求",
  "sheet_name": "Sheet1"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "task_id": "task_20250114_123456_a1b2c3d4",
    "message": "处理任务已启动"
  }
}
```

**需求映射:** 
- 需求 1.2, 1.3 - 允许用户选择工作表和列
- 需求 2.1-2.4 - 多语言处理
- 需求 3.1-3.4 - 权利要求解析和提取

---

### 3. 查询处理状态

**端点:** `GET /api/claims/status/<task_id>`

**描述:** 获取处理任务的当前状态和进度

**响应:**
```json
{
  "success": true,
  "data": {
    "task_id": "task_20250114_123456_a1b2c3d4",
    "status": "completed",
    "progress": 100,
    "message": "处理完成",
    "summary": {
      "total_cells_processed": 10,
      "total_claims_extracted": 45,
      "independent_claims_count": 5,
      "dependent_claims_count": 40,
      "language_distribution": {
        "zh": 25,
        "en": 20
      },
      "error_count": 0
    }
  }
}
```

**需求映射:** 需求 7.3 - 提供进度反馈

---

### 4. 获取处理结果

**端点:** `GET /api/claims/result/<task_id>`

**描述:** 获取完整的处理结果详情

**响应:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_cells_processed": 10,
      "total_claims_extracted": 45,
      "independent_claims_count": 5,
      "dependent_claims_count": 40,
      "language_distribution": {
        "zh": 25,
        "en": 20
      },
      "error_count": 0
    },
    "claims": [
      {
        "claim_number": 1,
        "claim_type": "independent",
        "claim_text": "一种...",
        "language": "zh",
        "referenced_claims": [],
        "original_text": "1. 一种...",
        "confidence_score": 0.95
      }
    ],
    "errors": []
  }
}
```

**需求映射:** 需求 6.1, 6.2 - 生成包含所有权利要求信息的结构化数据

---

### 5. 导出处理结果

**端点:** `POST /api/claims/export/<task_id>`

**描述:** 导出处理结果为Excel或JSON格式

**请求:**
```json
{
  "format": "excel"
}
```

**响应:** 文件下载（二进制流）

**支持格式:**
- `excel`: 导出为 .xlsx 文件
- `json`: 导出为 .json 文件

**需求映射:** 需求 6.3 - 支持将结果导出为Excel或JSON格式

---

### 6. 获取处理报告

**端点:** `GET /api/claims/report/<task_id>`

**描述:** 获取详细的处理报告文本

**响应:**
```json
{
  "success": true,
  "data": {
    "report": "============================================================\n专利权利要求处理报告\n============================================================\n\n【处理统计】\n  处理单元格总数: 10\n  提取权利要求总数: 45\n  ..."
  }
}
```

**需求映射:** 需求 6.4 - 生成详细的错误报告和处理统计信息

---

## 前端界面

### 访问地址

- 主界面: `http://localhost:5001/claims_processor.html`

### 功能特性

1. **文件上传**
   - 支持点击上传和拖拽上传
   - 自动验证文件格式
   - 显示文件信息（工作表、列）

2. **处理配置**
   - 选择工作表
   - 选择包含权利要求的列
   - 一键启动处理

3. **进度反馈**
   - 实时显示处理进度
   - 状态消息更新
   - 进度条可视化

4. **结果展示**
   - 处理统计摘要
   - 权利要求详细表格
   - 语言分布统计

5. **导出功能**
   - 导出Excel格式
   - 导出JSON格式
   - 查看详细报告

---

## 使用流程

### 1. 上传文件

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('/api/claims/upload', {
    method: 'POST',
    body: formData
});

const result = await response.json();
const fileId = result.data.file_id;
```

### 2. 启动处理

```javascript
const response = await fetch('/api/claims/process', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        file_id: fileId,
        column_name: '权利要求',
        sheet_name: 'Sheet1'
    })
});

const result = await response.json();
const taskId = result.data.task_id;
```

### 3. 轮询状态

```javascript
const checkStatus = async () => {
    const response = await fetch(`/api/claims/status/${taskId}`);
    const result = await response.json();
    
    if (result.data.status === 'completed') {
        // 处理完成
        clearInterval(statusInterval);
        loadResults();
    }
};

const statusInterval = setInterval(checkStatus, 2000);
```

### 4. 获取结果

```javascript
const response = await fetch(`/api/claims/result/${taskId}`);
const result = await response.json();
// 显示结果
displayResults(result.data);
```

### 5. 导出文件

```javascript
const response = await fetch(`/api/claims/export/${taskId}`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ format: 'excel' })
});

const blob = await response.blob();
// 下载文件
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'patent_claims.xlsx';
a.click();
```

---

## 错误处理

所有API端点都遵循统一的错误响应格式：

```json
{
  "success": false,
  "error": "错误描述信息"
}
```

### 常见错误

1. **文件上传错误**
   - 文件格式不支持
   - 文件大小超限
   - 文件损坏

2. **处理错误**
   - 文件不存在
   - 列名不存在
   - 工作表不存在

3. **任务错误**
   - 任务不存在
   - 任务尚未完成
   - 处理失败

---

## 技术实现

### 后端架构

```
Flask Application
├── /api/claims/upload       - 文件上传处理
├── /api/claims/process      - 启动处理任务
├── /api/claims/status       - 状态查询
├── /api/claims/result       - 结果获取
├── /api/claims/export       - 结果导出
└── /api/claims/report       - 报告生成

Processing Service
├── ExcelProcessor           - Excel文件处理
├── LanguageDetector         - 语言检测
├── ClaimsParser            - 权利要求解析
├── ClaimsClassifier        - 权利要求分类
└── ExportService           - 结果导出
```

### 前端架构

```
claims_processor.html
└── js/claimsProcessor.js
    ├── 文件上传管理
    ├── 处理任务管理
    ├── 状态轮询
    ├── 结果展示
    └── 导出功能
```

---

## 性能特性

1. **异步处理**
   - 后台线程处理文件
   - 不阻塞主线程
   - 支持大文件处理

2. **进度反馈**
   - 实时状态更新
   - 2秒轮询间隔
   - 自动完成检测

3. **容错处理**
   - 单元格级别容错
   - 详细错误报告
   - 部分结果保存

---

## 安全特性

1. **登录验证**
   - 所有API需要登录
   - Session验证
   - IP限制（可选）

2. **文件验证**
   - 文件类型检查
   - 文件格式验证
   - 安全文件名处理

3. **错误处理**
   - 详细错误日志
   - 用户友好错误消息
   - 异常捕获和恢复

---

## 测试验证

### 集成测试

运行以下命令验证集成：

```bash
python test_flask_integration.py
```

预期输出：
```
✓ Flask应用导入成功
✓ 处理服务导入成功
✓ Excel处理器导入成功
✓ 路由已注册: /api/claims/upload
✓ 路由已注册: /api/claims/process
✓ 路由已注册: /api/claims/status/<task_id>
✓ 路由已注册: /api/claims/result/<task_id>
✓ 路由已注册: /api/claims/export/<task_id>
✓ 路由已注册: /api/claims/report/<task_id>
✓ 上传文件夹已创建

总计: 3/3 测试通过
✓ 所有测试通过！Flask集成成功。
```

---

## 部署说明

### 本地开发

```bash
# 启动Flask应用
python app.py
```

访问: `http://localhost:5001/claims_processor.html`

### 生产部署

1. 确保所有依赖已安装
2. 配置环境变量
3. 使用Gunicorn或uWSGI部署
4. 配置Nginx反向代理

---

## 维护和支持

### 日志位置

- 应用日志: 控制台输出
- 错误日志: 控制台输出
- 处理日志: 内存中（可配置持久化）

### 监控指标

- 处理任务数量
- 处理成功率
- 平均处理时间
- 错误率

---

## 更新日志

### v1.0.0 (2025-01-14)

- ✅ 完成Flask应用集成
- ✅ 实现6个API端点
- ✅ 创建前端界面
- ✅ 添加文件上传功能
- ✅ 实现处理进度反馈
- ✅ 支持结果展示和下载
- ✅ 通过集成测试

---

## 联系方式

如有问题或建议，请联系开发团队。
