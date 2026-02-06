# AI说明书开关 Authorization 修复

## 问题描述

用户报告：打开AI说明书解析按钮后，点击"开始处理"直接报错：
```
❌ 处理失败
Authorization header with Bearer token is required.
```

## 问题原因

### 根本原因
前端在调用 `/api/drawing-marker/process` 接口时，**没有添加 `Authorization` header**，导致后端在AI模式下无法获取智谱AI的API Key。

### 技术细节

1. **后端要求**: `get_zhipu_client()` 函数需要从请求头中获取 `Authorization: Bearer <api_key>`
2. **前端缺失**: `frontend/index.html` 中使用原生 `fetch` 调用接口，没有添加 Authorization header
3. **其他功能对比**: 功能六等其他功能使用 `apiRequest` 函数，会自动添加 Authorization header

---

## 修复方案

### 方案1: 前端添加 Authorization Header（已采用）

**优点**:
- 符合现有API规范
- 与其他功能保持一致
- 安全性更好

**实现**:
```javascript
// 获取API Key
const apiKey = appState?.apiKey || localStorage.getItem('zhipuai_api_key') || '';

// 准备请求头
const headers = {
    'Content-Type': 'application/json'
};

// AI模式下添加Authorization header
if (aiConfig.aiMode) {
    if (!apiKey) {
        alert('AI模式需要配置API Key');
        return;
    }
    headers['Authorization'] = `Bearer ${apiKey}`;
}

// 调用API
fetch('/api/drawing-marker/process', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(processingData)
})
```

---

## 修复内容

### 1. 前端修改 (`frontend/index.html`)

**位置**: 第1900行附近

**修改前**:
```javascript
// 调用后端API进行处理
fetch('/api/drawing-marker/process', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(processingData)
})
```

**修改后**:
```javascript
// 获取API Key（AI模式需要）
const apiKey = appState?.apiKey || localStorage.getItem('zhipuai_api_key') || '';

// 准备请求头
const headers = {
    'Content-Type': 'application/json'
};

// 如果是AI模式，必须添加Authorization header
if (aiConfig.aiMode) {
    if (!apiKey) {
        alert('AI模式需要配置API Key。请点击右上角⚙️设置并保存您的智谱AI API Key。');
        return;
    }
    headers['Authorization'] = `Bearer ${apiKey}`;
}

// 调用后端API进行处理
fetch('/api/drawing-marker/process', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(processingData)
})
```

### 2. 后端注释优化 (`backend/routes/drawing_marker.py`)

**位置**: 第118行

**修改**:
```python
# Get API key from Authorization header (AI mode requires it)
client, error = get_zhipu_client()
```

添加注释说明AI模式需要Authorization header。

---

## 工作流程

### AI模式开启时

```
前端
  ↓
  检查 aiConfig.aiMode = true
  ↓
  检查 API Key 是否存在
  ↓
  添加 Authorization: Bearer <api_key>
  ↓
  发送请求到 /api/drawing-marker/process
  ↓
后端
  ↓
  检测到 ai_mode = true
  ↓
  调用 get_zhipu_client() 获取 API Key
  ↓
  使用 AIDescriptionProcessor 处理说明书
  ↓
  返回 AI 抽取结果
```

### AI模式关闭时

```
前端
  ↓
  检查 aiConfig.aiMode = false
  ↓
  不添加 Authorization header
  ↓
  发送请求到 /api/drawing-marker/process
  ↓
后端
  ↓
  检测到 ai_mode = false
  ↓
  直接使用 extract_reference_markers (jieba)
  ↓
  返回 jieba 抽取结果
```

---

## 测试验证

### 测试步骤

#### 1. 测试AI模式（有API Key）
1. 确保已配置API Key（右上角⚙️设置）
2. 打开功能八页面
3. 打开"AI说明书解析"开关
4. 选择AI模型（如 glm-4-flash）
5. 上传图片和输入说明书
6. 点击"开始处理"
7. **预期**: 成功处理，显示"AI智能抽取"

#### 2. 测试AI模式（无API Key）
1. 清除API Key配置
2. 打开"AI说明书解析"开关
3. 点击"开始处理"
4. **预期**: 弹出提示"AI模式需要配置API Key"

#### 3. 测试规则模式
1. 关闭"AI说明书解析"开关
2. 上传图片和输入说明书
3. 点击"开始处理"
4. **预期**: 成功处理，显示"jieba分词"（不需要API Key）

---

## API规范对比

### 功能六（批量解读）
```javascript
// 使用 apiRequest 函数，自动添加 Authorization
await apiRequest('/patent/batch-interpret', {
    method: 'POST',
    body: { ... }
});
```

### 功能八（修复前）
```javascript
// 直接使用 fetch，缺少 Authorization
fetch('/api/drawing-marker/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ... })
});
```

### 功能八（修复后）
```javascript
// 手动添加 Authorization（AI模式）
const headers = { 'Content-Type': 'application/json' };
if (aiConfig.aiMode) {
    headers['Authorization'] = `Bearer ${apiKey}`;
}
fetch('/api/drawing-marker/process', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({ ... })
});
```

---

## 错误处理

### 前端错误提示

| 场景 | 错误提示 |
|------|---------|
| AI模式但无API Key | "AI模式需要配置API Key。请点击右上角⚙️设置..." |
| 网络错误 | "网络错误或服务器问题，请重试。" |
| 后端处理失败 | 显示后端返回的具体错误信息 |

### 后端错误响应

| 场景 | HTTP状态码 | 错误信息 |
|------|-----------|---------|
| 缺少Authorization header | 401 | "Authorization header with Bearer token is required." |
| API Key无效 | 400 | "Failed to initialize ZhipuAI client: ..." |
| AI处理失败 | 500 | AI处理器返回的具体错误 |

---

## 相关文件

### 修改的文件
- `frontend/index.html` - 添加Authorization header逻辑
- `backend/routes/drawing_marker.py` - 优化注释

### 参考文件
- `backend/services/api_service.py` - get_zhipu_client实现
- `js/main.js` - apiRequest函数（其他功能的实现）
- `backend/routes/patent.py` - 功能六的实现（参考）

---

## 部署说明

### 本地测试
1. 重启后端服务
2. 刷新前端页面（Ctrl+F5 强制刷新）
3. 按照测试步骤验证

### 服务器部署
```bash
# 1. 拉取最新代码
git pull origin main

# 2. 重启服务
sudo systemctl restart patent-workbench

# 3. 清除浏览器缓存
# 用户需要强制刷新页面（Ctrl+F5）
```

---

## 总结

| 项目 | 修复前 | 修复后 |
|------|--------|--------|
| AI模式请求 | ❌ 缺少Authorization | ✅ 正确添加Authorization |
| 规则模式请求 | ✅ 正常工作 | ✅ 正常工作 |
| API Key检查 | ❌ 无检查 | ✅ 前端检查并提示 |
| 错误提示 | ❌ 不友好 | ✅ 清晰明确 |
| API规范 | ❌ 不一致 | ✅ 符合规范 |

**修复状态**: ✅ 完成  
**测试状态**: 待验证  
**部署状态**: 待部署

---

**修复时间**: 2026-02-01  
**修复人员**: Kiro AI Assistant  
**问题类型**: Authorization认证缺失
